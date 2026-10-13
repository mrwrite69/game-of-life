# Prompt: Port Game of Life's data-loss safeguards to Squad Life

Paste this into a Cowork/Claude session with the **Squad Life** folder connected
(`.../Documents/Claude/Projects/Squad Life/squad-life/`). This is the second half of the
safety work — the first prompt handled notifications; this one protects the data.

Context: Squad Life shares the **same Supabase project and the same load/save
architecture** as Game of Life. Game of Life just suffered a real data wipe — a blank/
failed read dropped the app to a "new player" screen, and the next save wrote an empty
game over the user's entire history, with no confirmation and no recoverable backup (free
plan = no Supabase backups). Squad Life has the identical vulnerability. Close it with the
same four guards + an in-app Restore screen.

---

## 0. Ground rules
- **Back up first:** `cp index.html index.html.bak-$(date +%Y%m%d-%H%M)`
- Work in `index.html`; after editing, syntax-check every inline `<script>` (wrap each body
  in `new Function(body)`), then `cp index.html www/index.html` (+ the Android public copy
  if present). A real Android Studio rebuild ships it later.
- These are the reference implementations from Game of Life. **Adapt the names** to Squad
  Life's actual code — see step 1.

## 1. Audit — find Squad Life's equivalents (do this before writing anything)
Grep and identify:
- The **save function** (GoL: `saveToSupabase()`), and the **primary user-data object** it
  writes (GoL: `data` → the `days` history). In Squad Life this is whatever holds the
  user's own irreplaceable progress/history that gets upserted to a single row.
- The **load function** (GoL: `loadFromSupabase()`), and every place that, after loading,
  decides to show a **"new user / create squad / pick template"** screen.
- The **offline cache** helpers (GoL: `saveLocalCache`/`loadLocalCache`, key
  `gol-offline-cache`) and its localStorage **prefix** (likely `sl-` or `gol-`).
- The Supabase client handle (GoL: `sb`), `currentUser`, the "today" helper (GoL:
  `todayKey()`), `showToast`, and the personal-data table name (GoL: `game_data`).
Write me the list of Squad Life names that map to each GoL name before editing.

> Below, `<PREFIX>` = Squad Life's localStorage prefix, `PRIMARY` = its primary user-data
> object, `TABLE` = its personal-data table, `SAVE`/`LOAD` = its save/load functions.

## 2. Guard 1 — refuse to save a blank over a real one
At the very top of `SAVE` (before it writes to the cloud OR mirrors to the local cache):

```js
let allowEmptySave = false;      // only intentional reset/new flows set this true
// ...
async function SAVE(){
  if(!currentUser) return;
  // 🛡️ GUARD 1: never let a blank state overwrite a real one (cloud AND local cache)
  if(!allowEmptySave && Object.keys(PRIMARY).length===0){
    let cloudHasData=false;
    try{
      const{data:existing}=await sb.from('TABLE').select('days').eq('user_id',currentUser.id).maybeSingle();
      cloudHasData = !!(existing && existing.days && Object.keys(existing.days).length>0);
    }catch(e){ cloudHasData=true; } // can't verify → protect by default
    if(cloudHasData){
      setSyncState && setSyncState('error');
      showToast('🛡️ Safety hold — your data looks blank here, so I did NOT overwrite your saved game. Reopen to reload.',6000);
      return;
    }
  }
  // ...existing save body...
}
```
(Replace `.select('days')` / `existing.days` with Squad Life's actual primary column.)
Any legitimate "start fresh / new squad from template" flow should set `allowEmptySave=true`
right before its save and back to `false` right after.

## 3. Guard 2 — a failed load never shows the "new user" screen
In `LOAD`, record the outcome; only treat a genuinely empty account as new:

```js
let lastLoadStatus = 'unknown'; // 'loaded' | 'newuser' | 'failed'
// in LOAD: row found → lastLoadStatus='loaded'
//          no row     → lastLoadStatus='newuser'
//          catch + local cache loaded → 'loaded'
//          catch + no cache           → 'failed'
```
Then at each place that used to show the picker/create screen after load:
```js
if(PRIMARY_LOADED_OK){ showApp(); }
else if(lastLoadStatus==='newuser'){ /* genuine new user → show picker/create */ }
else { hideLoadingScreen&&hideLoadingScreen(); showLoadError(); } // 🛡️ never the picker
```
Add the safe retry screen:
```js
function showLoadError(msg){
  if(document.getElementById('load-error-overlay')) return;
  const d=document.createElement('div');
  d.id='load-error-overlay';
  d.style.cssText='position:fixed;inset:0;z-index:99999;background:#0f0f0f;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;text-align:center;padding:24px;color:#e8e8e8;font-family:var(--font-heading,sans-serif)';
  d.innerHTML='<div style="font-size:40px">🛡️</div>'+
    '<div style="font-size:18px;font-weight:800;color:#c8a84b">Couldn\'t load your data</div>'+
    '<div style="font-size:13px;max-width:320px;line-height:1.6;color:#aaa;font-family:var(--font-mono,monospace)">'+(msg||'The connection hiccuped, so your data didn\'t load. It\'s safe — I won\'t show a blank screen or risk overwriting it. Let\'s try again.')+'</div>'+
    '<button id="load-error-retry" style="margin-top:8px;background:#1a1a2e;border:1px solid #3d3d6e;color:#aaaaff;font-weight:700;font-size:14px;padding:12px 28px;border-radius:12px;cursor:pointer">Try again 🔄</button>';
  document.body.appendChild(d);
  document.getElementById('load-error-retry').onclick=()=>location.reload();
}
```

## 4. Guard 3 — confirm + back up before any template/reset replaces data
Any flow that replaces the user's game (choose template, reset, "start over that wipes"):
```js
const hasExisting = /* user already has categories/data */;
if(hasExisting){
  if(!confirm('Start a NEW game? Your current setup and history will be replaced. A backup is saved first.')) return;
  makeSafetyBackup('before-template'); await makeCloudBackup('before-template');
}
allowEmptySave = true;   // ...do the replace + SAVE...
allowEmptySave = false;
```

## 5. Guard 4 — rolling backups the app makes itself
```js
function makeSafetyBackup(reason){
  try{
    if(!currentUser || Object.keys(PRIMARY).length===0) return;
    const snap={reason:reason||'auto',at:new Date().toISOString(),userId:currentUser.id,
      /* include Squad Life's full personal state: days/history, categories, settings,
         squad memberships cache, etc. — mirror what the offline cache stores */ };
    localStorage.setItem('<PREFIX>-safety-backup-'+Date.now(),JSON.stringify(snap));
    const keys=Object.keys(localStorage).filter(k=>k.startsWith('<PREFIX>-safety-backup-')).sort();
    while(keys.length>5){ localStorage.removeItem(keys.shift()); } // keep newest 5
  }catch(e){}
  makeCloudBackup(reason);
}
async function makeCloudBackup(reason){
  try{
    if(!currentUser || Object.keys(PRIMARY).length===0) return;
    const last=parseInt(localStorage.getItem('<PREFIX>-last-cloud-backup')||'0');
    if((!reason||reason==='auto') && Date.now()-last < 6*60*60*1000) return; // throttle
    await sb.from('squad_backups').insert({user_id:currentUser.id,reason:reason||'auto',
      snapshot:{ /* same fields as the device snap */ }});
    localStorage.setItem('<PREFIX>-last-cloud-backup',String(Date.now()));
  }catch(e){} // table not set up yet → ignore
}
```
Call `makeSafetyBackup('post-load')` right after every successful load that has real data,
and `makeCloudBackup('auto')` after every successful save.

> ⚠️ Use a **separate `squad_backups` table**, NOT Game of Life's `game_backups` — both
> apps share one Supabase project, and a shared table would make each app's Restore screen
> show the other app's snapshots. Keep them separate.

## 6. In-app Restore screen
Add a **🛟 Restore from backup** button to a settings surface, plus this overlay + logic
(adapt field names). It lists device backups, the offline cache, and cloud `squad_backups`,
newest first, each with a summary, and restores on tap after backing up the current state.

```js
let _restoreCandidates=[];
function normalizeSnapshot(s){ /* tolerate camel/snake variants; return {days,categories,...} */ }
function snapshotSummary(s){ /* e.g. `${dayCount} days · ${totalPts} pts · ${catCount} categories` */ }
async function openRestoreScreen(){ closeSettings&&closeSettings(); document.getElementById('restore-overlay').style.display='flex'; await renderRestoreList(); }
function closeRestoreScreen(){ document.getElementById('restore-overlay').style.display='none'; }
async function renderRestoreList(){
  _restoreCandidates=[];
  Object.keys(localStorage).filter(k=>k.startsWith('<PREFIX>-safety-backup-')).forEach(k=>{ try{const s=JSON.parse(localStorage.getItem(k));_restoreCandidates.push({source:'device',reason:s.reason,at:s.at,snap:s});}catch(e){} });
  try{ const c=JSON.parse(localStorage.getItem('<PREFIX>-offline-cache')||'null'); if(c&&c.days)_restoreCandidates.push({source:'cache',reason:'last synced on this device',at:c.savedAt,snap:c}); }catch(e){}
  try{ if(currentUser){ const{data:rows}=await sb.from('squad_backups').select('id,reason,snapshot,created_at').eq('user_id',currentUser.id).order('created_at',{ascending:false}).limit(15); (rows||[]).forEach(r=>_restoreCandidates.push({source:'cloud',reason:r.reason,at:r.created_at,snap:r.snapshot})); } }catch(e){}
  _restoreCandidates=_restoreCandidates.filter(e=>e.snap&&e.snap.days&&Object.keys(e.snap.days).length>0).sort((a,b)=>new Date(b.at||0)-new Date(a.at||0));
  /* render cards with snapshotSummary + a "Restore this" button calling confirmRestore(i) */
}
async function confirmRestore(idx){
  const e=_restoreCandidates[idx]; if(!e) return;
  if(!confirm('Restore this backup?\n\n'+snapshotSummary(e.snap)+'\n\nYour current game is backed up first, then replaced and synced.')) return;
  makeSafetyBackup('before-restore');            // undo path — runs BEFORE overwrite
  const n=normalizeSnapshot(e.snap);
  /* assign PRIMARY = n.days, categories = n.categories, etc.; rehydrate achievements */
  allowEmptySave=false; await SAVE();
  closeRestoreScreen(); showToast('✅ Backup restored — reloading…'); setTimeout(()=>location.reload(),1200);
}
```

## 7. One-time cloud-backup table (run in Supabase → SQL Editor)
```sql
create table if not exists squad_backups (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  reason text,
  snapshot jsonb not null,
  created_at timestamptz default now()
);
alter table squad_backups enable row level security;
create policy "own squad backups" on squad_backups for all using (auth.uid() = user_id);
```
Device backups + Restore work without this; it just adds the cloud net.

## 8. Verify before finishing
- Every inline `<script>` block parses (`new Function(body)`).
- Guard 1 blocks an empty save when the cloud has data; a genuine new user can still save.
- A failed load shows the retry screen, never the create/picker screen.
- Restore lists device + cloud snapshots and restores one cleanly (and backs up current first).
- `cp index.html www/index.html` (+ android public copy).

Report back a short summary of what mapped to what and what you changed.

---

# PART 2 — Data-loss RECOVERY flow (the lifeline)

The guards above *prevent* loss. This gives a user whose history was already lost (before
the guards existed, or via some other circumstance beyond their control) a humane way back.
It's **disaster recovery, not cheating** — it restores effort that happened, it doesn't
invent effort that didn't. Port the same flow Game of Life now has.

## R1. How it should work
- **Squad Life has no template picker**, so put the entry link somewhere always reachable:
  the **settings/menu screen**, ideally **right next to the "🛟 Restore from backup" button
  from Part 1 (step 6)**. Label it **"🛟 Lost your data to a glitch? Recover a game."** (In
  Game of Life it lives at the bottom of the Switch Game template list — Squad Life's
  equivalent is settings, since users who already have data never hit a picker.)
- Tapping it opens a 4-digit PIN pad. The recovery PIN is **4321**. Wrong PIN → shake + retry.
- Correct PIN → a **"Recover your climb"** screen that asks **"What day did you start the
  game?"** (a `<input type="date">`), with a **live preview** of how many days / weeks that
  is and which level it reaches.
- On confirm: seed the user's PRIMARY history object with one entry per day from the start
  date up to **yesterday**, each `{pts:300, locked:true, recovered:true}`. Set up the user's
  normal game shell (categories etc.), save, and open the app. The level/streak derive from
  the seeded pass-days automatically (same as GoL). Everything else starts fresh.

## R2. Blue "recovered" tint in the calendar
Wherever Squad Life colours calendar days, add a branch **before** the rest-day/pass checks:
```js
if(dd && dd.recovered) { bg='#0a1a2e'; border=isToday?'border:1.5px solid #6db3f2':'border:1px solid #2a5a8f'; } // blue recovered
else if(/* restDay */) { ... }
else if(/* pts >= pass */) { ... }
```
So recovered days read as an honest, distinct blue (still showing their 300-pt label),
separate from real green earned days.

## R3. Reference code (adapt names to Squad Life)
Entry link — place it in settings, next to the Restore button (NOT on a picker):
```html
<div onclick="promptRecovery()" style="margin-top:4px;font-family:var(--font-mono);font-size:10px;color:var(--muted);cursor:pointer;opacity:0.75;text-align:center">🛟 Lost your data to a glitch? <span style="color:#aaaaff;text-decoration:underline">Recover a game</span></div>
```
Recovery PIN pad (a copy of an existing PIN overlay, ids `rec-dot-0..3`) + this logic:
```js
let recPinBuffer='';
const RECOVERY_PIN='4321';
function promptRecovery(){ recPinBuffer=''; document.getElementById('rec-pin-err').textContent=''; updateRecDots(); document.getElementById('recovery-pin-overlay').style.display='flex'; }
function hideRecPin(){ document.getElementById('recovery-pin-overlay').style.display='none'; recPinBuffer=''; }
function updateRecDots(){ for(let i=0;i<4;i++){ const d=document.getElementById('rec-dot-'+i); if(d)d.classList.toggle('filled',i<recPinBuffer.length); } }
function recPinTap(n){
  if(recPinBuffer.length>=4) return;
  recPinBuffer+=n; updateRecDots();
  if(recPinBuffer.length===4){
    if(recPinBuffer===RECOVERY_PIN){ hideRecPin(); startRecovery(); }
    else { document.getElementById('rec-pin-err').textContent='Wrong PIN — try again'; recPinBuffer=''; updateRecDots(); }
  }
}
function recPinClear(){ recPinBuffer=recPinBuffer.slice(0,-1); updateRecDots(); document.getElementById('rec-pin-err').textContent=''; }
```
Recovery screen + seeding (needs a `keyToDate` helper that parses 'YYYY-MM-DD' as LOCAL
midnight, and Squad Life's `getCurrentLevel`, `getPassDays`, `dateKey`, `showToast`, `SAVE`,
`showApp`):
```js
function keyToDate(s){ const p=String(s).split('-').map(Number); return new Date(p[0],p[1]-1,p[2]); }
function startRecovery(){
  const inp=document.getElementById('recovery-start-date');
  const y=new Date(); y.setDate(y.getDate()-1); inp.max=dateKey(y); inp.value='';
  document.getElementById('recovery-err').textContent=''; document.getElementById('recovery-preview').textContent='';
  inp.oninput=updateRecoveryPreview; document.getElementById('recovery-overlay').style.display='flex';
}
function hideRecovery(){ document.getElementById('recovery-overlay').style.display='none'; }
function recoveryDayCount(startStr){
  if(!startStr) return 0;
  const s=keyToDate(startStr); s.setHours(0,0,0,0);
  const y=new Date(); y.setHours(0,0,0,0); y.setDate(y.getDate()-1);
  if(s>y) return 0; return Math.round((y-s)/86400000)+1; // inclusive
}
function updateRecoveryPreview(){
  const n=recoveryDayCount(document.getElementById('recovery-start-date').value);
  const p=document.getElementById('recovery-preview');
  if(!n){ p.textContent=''; return; }
  const lv=getCurrentLevel(n), w=Math.floor(n/7), e=n%7;
  p.innerHTML=`${n} days · ~${w}w${e?' '+e+'d':''} → reaches ${lv.name} (Lv ${lv.level})`;
}
async function submitRecovery(){
  const startStr=document.getElementById('recovery-start-date').value;
  const n=recoveryDayCount(startStr); const err=document.getElementById('recovery-err');
  if(!startStr){ err.textContent='Pick your start date first.'; return; }
  if(n<=0){ err.textContent='Start date must be before today.'; return; }
  if(!confirm(`Rebuild ${n} recovered days (300 pts each) up to yesterday?`)) return;
  /* set up the normal game shell: categories = default, missions/quests/etc = empty */
  PRIMARY={};
  const s=keyToDate(startStr); s.setHours(0,0,0,0);
  const y=new Date(); y.setHours(0,0,0,0); y.setDate(y.getDate()-1);
  for(let d=new Date(s); d<=y; d.setDate(d.getDate()+1)){ PRIMARY[dateKey(d)]={pts:300,locked:true,recovered:true}; }
  allowEmptySave=false;              // PRIMARY is non-empty now, so Guard 1 passes
  hideRecovery();
  await SAVE(); showApp();
  showToast(`🛟 Recovered ${n} days — welcome back. Now let's keep climbing. 🔥`,6000);
}
```
Add the two overlays (recovery PIN pad + the `#recovery-overlay` with the date input,
`#recovery-preview`, `#recovery-err`, and "Rebuild my climb" / "Cancel" buttons) modelled on
an existing overlay in the file.

## R4. Squad Life notes
- If Squad Life's level system differs from GoL's pass-day ladder, adapt `getCurrentLevel`
  accordingly — the seeding stays the same, only the level lookup changes.
- Squad membership / shared `squad_logs` are recoverable from the server and shouldn't be
  seeded — this flow only rebuilds the user's **own** personal history/calendar/level.
- Verify: 42 days → level 7 equivalent; 37 and 122 land correctly; the preview updates live.

## R5. Verify + sync (same as Part 1)
Syntax-check every inline `<script>`, confirm the recover link → PIN → date → rebuild path
works end to end, then `cp index.html www/index.html` (+ android public copy).
