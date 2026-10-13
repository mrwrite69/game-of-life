# Prompt: Bring Game of Life's easy-delete + draggable editor to Squad Life

Paste this into a Claude session that has the **Squad Life** folder connected
(`.../Documents/Claude/Projects/Squad Life/squad-life/`).

---

You're working on **Squad Life** (`squad-life/index.html`), the group/accountability
version of Game of Life. It shares the same architecture and design system. Tonight
(2026-09-28, GoL build `09-28b`) I shipped two editing-UX upgrades in Game of Life and I
want Squad Life brought up to the same level. Follow these steps in order.

## What changed in Game of Life (the target behaviour)
1. **Easy delete.** Deleting activities used to be a chore: Edit, then tap the card,
   then the editor opened *with the keyboard jumping up*, then find the small Delete
   button. Now:
   - In Edit mode, every activity card has a **red 🗑 tab beside it**. Tap once and it
     turns red and says "Sure?". Tap again within 3s and the activity is deleted. If you
     leave it alone, it resets. There's no native `confirm()`.
   - Opening the editor for an **existing** activity no longer auto-focuses the name
     field, so the keyboard stays down. The editor's Delete button also takes two taps
     ("Tap again to delete").
   - **"+ add" opens the editor immediately**, titled "➕ New activity". Save keeps it.
     Cancel, "✕ Discard" or tapping outside **throws it away**, so no stray "New Activity"
     cards are left behind.
   - Deleting an activity that was already checked today calls `autosave()` so today's
     points drop straight away.
2. **Draggable editor bubble.** The name/points editor has a grab strip at the top
   ("⠿ drag to move"). Players can drag it anywhere (mouse or touch). It's clamped to the
   visible screen, remembers its spot **per device in localStorage** (never synced), and
   a double-tap or double-click on the strip snaps it back to the top. Once it's moved,
   the backdrop lightens so you can see the cards behind it.

## 0. Safety first (do this before any edit)
- Back up: `cp index.html index.html.bak-$(date +%Y%m%d-%H%M)`
- **Do NOT touch any load/save/Supabase/sync code.** This is UI only. No new syncing of
  any kind: the editor position is localStorage-only, on purpose. (Hard rule: no auto
  pulls or passive cloud syncs, ever.)
- Never use `<input type="number">`. Points use the existing `.num-stepper` / `stepPts`
  / `stepNum` pattern.

## 1. Audit first. Tell me what you find before editing
Squad Life forked from GoL on ~2026-06-30. GoL got its **single shared activity editor**
on 2026-07-28, so Squad Life most likely still has the **older editor**, either an
inline edit bubble inside each card or a `.quick-pts-popup` anchored under the card. Check:
- Does Squad Life have `#act-editor` / `openActEditor()` / `positionActEditor()`?
- How does edit mode render cards (`renderActivities()` or its equivalent)? Is the edit
  UI a child of the card `<button>`? (That's invalid HTML: an `<input>` inside a
  `<button>` can't hold focus.)
- Is there a long-press editor (`setupLongPress`, `.quick-pts-popup`)?
- Does `#app` get a CSS `zoom` for font size (`applyFontScale`)? **This matters:** in
  Blink a zoomed ancestor becomes the containing block for `position:fixed` children,
  so the editor **must live outside `#app`**, as a direct child of `<body>`.
- Squad Life's names for: `categories`, `todayChecked`, `autosave`, `debouncedSave`,
  `renderActivities`, `showToast`, `editMode`, `toggleEditMode`, `stepPts`, and its
  localStorage prefix (`sl-` or `gol-`?). Squad Life may also have **shared squad
  tasks** as well as personal activities. List both.

Report back the mapping, then:
- **Path A: Squad Life already has the shared `#act-editor`:** apply only the deltas
  (steps 3–6).
- **Path B: it still has the old in-card/popup editor:** port the whole shared editor
  (steps 2–6) and remove the old one completely, including the long-press popup. Keep
  one editor only.

⚠️ **Squad-task exception: check with me first.** If squad members share tasks, deleting
one could affect everyone in the squad. **Don't add the quick 🗑 tab to shared squad
tasks without asking.** Tell me how shared tasks are stored and who's allowed to edit
them, and I'll decide (probably captain-only, or leave them as they are). Personal
activities get the full treatment.

## 2. (Path B only) The shared editor markup: outside `#app`, bottom of `<body>`
```html
<!-- ============================================================
     ACTIVITY EDITOR (2026-07-28)

     ⚠️ This MUST stay outside #app, as a direct child of <body>.

     #app carries a CSS `zoom` (applyFontScale sets it inline for the text-size
     setting). In Blink, a zoomed ancestor becomes the containing block for its
     position:fixed descendants — so an edit panel rendered inside a category
     card was pinned to the top of #app, not the top of the screen, and stayed
     buried under the keyboard no matter what top value it was given. That is
     why three rounds of scroll/lift fixes inside the card never worked.

     The dog picker below already lives out here for the same reason.
     ============================================================ -->
<div class="act-editor-overlay" id="act-editor" onclick="cancelActEditor()">
  <div class="act-editor-panel" onclick="event.stopPropagation()">
    <div class="act-editor-grip" id="ae-grip" title="Drag to move · double-tap to reset">
      <div class="act-editor-title" id="ae-title">✏️ Edit activity</div>
      <span class="act-editor-grip-hint"><b>⠿</b> drag to move</span>
    </div>
    <input class="act-editor-input" id="ae-name" placeholder="Activity name"
           autocomplete="off" autocorrect="off" spellcheck="false" />
    <div class="act-editor-row">
      <span class="act-editor-label">Points</span>
      <div class="num-stepper">
        <button type="button" class="num-btn" onmousedown="event.preventDefault()" onclick="stepPts('ae-pts',-1,1)">−</button>
        <span class="num-display" id="ae-pts-display">20</span>
        <button type="button" class="num-btn" onmousedown="event.preventDefault()" onclick="stepPts('ae-pts',1,1)">+</button>
        <input type="hidden" id="ae-pts" value="20" />
      </div>
    </div>
    <label class="act-editor-row" style="cursor:pointer">
      <span class="act-editor-label">Can log more than once a day</span>
      <input type="checkbox" id="ae-multi" style="accent-color:var(--gold);width:20px;height:20px" />
    </label>
    <div class="act-editor-btns">
      <button type="button" class="act-editor-save" onmousedown="event.preventDefault()" onclick="saveActEditor()">Save</button>
      <button type="button" class="act-editor-del" id="ae-del" onmousedown="event.preventDefault()" onclick="delActEditor()">🗑 Delete</button>
    </div>
    <button type="button" class="act-editor-cancel" onclick="cancelActEditor()">Cancel</button>
  </div>
</div>
```

## 3. CSS
Add or replace the editor styles (use Squad Life's own CSS variables if they differ):
```css
    /* ACTIVITY EDITOR — the panel itself is styled here, but note that its markup
       lives OUTSIDE #app at the bottom of the body. See the comment there. */
    .act-editor-overlay { position: fixed; inset: 0; z-index: 10000; display: none; background: rgba(0,0,0,0.55); }
    .act-editor-overlay.show { display: block; }
    .act-editor-panel { position: absolute; top: 0; left: 0; right: 0; margin: 0 auto; max-width: 460px;
      background: var(--surface); border: 1px solid var(--gold-dim); border-top: none;
      border-radius: 0 0 18px 18px; padding: 16px 16px 18px; box-shadow: 0 12px 44px rgba(0,0,0,0.8);
      animation: aeDrop 0.18s ease; }
    @keyframes aeDrop { from { transform: translateY(-16px); opacity: 0; } to { transform: none; opacity: 1; } }
    .act-editor-title { font-family: var(--font-heading); font-size: 15px; font-weight: 800; color: var(--gold); margin-bottom: 12px; }
    /* 🖐 Drag handle (2026-09-28): grab the top strip to move the editor anywhere.
       touch-action:none stops the page scrolling while you drag on a phone. */
    .act-editor-grip { display: flex; align-items: center; justify-content: space-between; gap: 8px;
      margin: -8px -6px 10px; padding: 8px 6px; border-radius: 10px; cursor: grab; touch-action: none;
      -webkit-user-select: none; user-select: none; }
    .act-editor-grip:hover { background: var(--surface2); }
    .act-editor-grip .act-editor-title { margin-bottom: 0; }
    .act-editor-grip-hint { font-family: var(--font-mono); font-size: 9px; color: var(--muted); white-space: nowrap; }
    .act-editor-grip-hint b { font-size: 14px; color: var(--gold-dim); vertical-align: -1px; letter-spacing: -1px; }
    .act-editor-panel.floating { border-top: 1px solid var(--gold-dim); border-radius: 18px; animation: none; }
    .act-editor-panel.dragging { animation: none; box-shadow: 0 18px 60px rgba(0,0,0,0.9); opacity: 0.96; }
    .act-editor-panel.dragging .act-editor-grip { cursor: grabbing; background: var(--surface2); }
    /* Once moved, lighten the backdrop so you can see the cards you're troubleshooting. */
    .act-editor-overlay.moved { background: rgba(0,0,0,0.25); }
```

## 4. JS: editor, two-tap delete, add-then-discard
Replace the editor functions, plus `delAct` / `addActivity`, with these (rename to Squad
Life's identifiers where they differ):
```js
let actEditCi = -1, actEditAi = -1, actEditIsNew = false;

// Two-tap delete: first tap arms the button (red, "Sure?"), second tap within 3s fires.
// No native confirm() — dialogs block the webview and feel clunky on phones.
function armDelete(el, armedText, fn){
  if(el.classList.contains('armed')){ clearTimeout(el._armT); el.classList.remove('armed'); fn(); return; }
  el._label = el.textContent; el.textContent = armedText; el.classList.add('armed');
  el._armT = setTimeout(()=>{ el.classList.remove('armed'); el.textContent = el._label; }, 3000);
}

function openActEditor(ci, ai, isNew){
  const act = categories[ci] && categories[ci].activities[ai];
  if(!act) return;
  actEditCi = ci; actEditAi = ai; actEditIsNew = !!isNew;
  document.getElementById('ae-title').textContent = actEditIsNew ? '➕ New activity' : '✏️ Edit activity';
  const delBtn = document.getElementById('ae-del');
  clearTimeout(delBtn._armT); delBtn.classList.remove('armed'); delBtn.textContent = actEditIsNew ? '✕ Discard' : '🗑 Delete';
  document.getElementById('ae-name').value = act.name;
  document.getElementById('ae-pts').value = act.pts;
  document.getElementById('ae-pts-display').textContent = act.pts;
  document.getElementById('ae-multi').checked = !!act.multi;
  document.getElementById('act-editor').classList.add('show');
  positionActEditor();
  // Only pop the keyboard for a brand-new activity (you'll want to name it).
  // For existing ones, don't — the keyboard jumping up made Delete hard to reach.
  if(actEditIsNew){ const name = document.getElementById('ae-name'); name.focus(); name.select(); }
}

// Cancel / tap-outside. A just-added activity that was never saved gets discarded.
function cancelActEditor(){
  if(actEditIsNew && actEditCi >= 0){
    const ci = actEditCi, ai = actEditAi;
    closeActEditor();
    categories[ci].activities.splice(ai, 1);
    renderActivities();
    return;
  }
  closeActEditor();
}

function closeActEditor(){
  const n = document.getElementById('ae-name'); if(n) n.blur();
  document.getElementById('act-editor').classList.remove('show');
  actEditCi = -1; actEditAi = -1; actEditIsNew = false;
}

function saveActEditor(){
  if(actEditCi < 0) return;
  const name = document.getElementById('ae-name').value.trim();
  if(!name){ showToast('Give it a name first 🐾'); return; }
  const pts = parseInt(document.getElementById('ae-pts').value) || 0;
  const multi = document.getElementById('ae-multi').checked;
  const act = categories[actEditCi].activities[actEditAi];
  const old = act.name;
  // Carry today's tally over to the new name — but only when it actually changed,
  // otherwise we'd write the count and then immediately delete it.
  if(name !== old && todayChecked[old]){ todayChecked[name] = todayChecked[old]; delete todayChecked[old]; }
  // Spread so extras like `timer` survive the edit.
  categories[actEditCi].activities[actEditAi] = Object.assign({}, act, {name, pts, multi});
  closeActEditor();
  debouncedSave(); renderActivities(); showToast('Saved!');
}

function delActEditor(){
  if(actEditCi < 0) return;
  if(actEditIsNew){ cancelActEditor(); return; }   // nothing saved yet — just discard, no confirm needed
  armDelete(document.getElementById('ae-del'), 'Tap again to delete', ()=>{
    const ci = actEditCi, ai = actEditAi;
    closeActEditor();
    delAct(ci, ai);
  });
}

function delAct(ci,ai){const name=categories[ci].activities[ai].name;if(todayChecked[name]){delete todayChecked[name];autosave();}categories[ci].activities.splice(ai,1);debouncedSave();renderActivities();showToast('🗑 Removed '+name);}
// + add now opens the editor straight away. Save keeps it; Cancel / Discard / tap-outside throws it away.
function addActivity(ci){categories[ci].activities.push({name:'New Activity',pts:20,multi:false});renderActivities();openActEditor(ci,categories[ci].activities.length-1,true);}
```

In the edit-mode toggle, update the toast to:
`'Edit mode — tap a card to edit, 🗑 to delete'`

## 5. JS: the 🗑 tab on each card (inside the render loop)
Each card must sit in an `.act-wrap` div, and the tab is a **sibling** of the card button,
never a child. In the per-activity loop, right after the card button is appended:
```js
      const wrap=document.createElement('div');wrap.className='act-wrap';   // if not already there
      // ... build btn ...
      // edit mode: btn.onclick=()=>openActEditor(ci,ai);
      setupLongPress(btn, ci, ai, act.name, act.pts, act.multi);
      wrap.appendChild(btn);
      const del=document.createElement('button');del.type='button';del.className='act-del-x';del.textContent='🗑';
      del.setAttribute('aria-label','Delete '+act.name);
      del.onclick=(e)=>{e.stopPropagation();armDelete(del,'Sure?',()=>delAct(ci,ai));};
      wrap.appendChild(del);
      grid.appendChild(wrap);
```
Make sure `.act-wrap { position: relative; display: flex; }` exists.

Long-press should open the **same** editor (Path B: replace any popup version):
```js
// ─── LONG-PRESS TO EDIT ───────────────────────────────────────────────────────
// This used to build a whole second editor (`.quick-pts-popup`) anchored just
// below the card you pressed — `top = rect.bottom + 8`, clamped to
// `innerHeight - 240`. For an activity low in the list that put it right where
// the keyboard opens, with nowhere left to go. It also focused `#qp-pts`, which
// is an <input type="hidden">, and closed itself on any stray document click.
// Long-press now opens the same top-pinned editor as edit mode. One editor.
let longPressTimer = null;
const LONG_PRESS_MS = 600;

function setupLongPress(btn, ci, ai, actName, actPts, actMulti) {
  // Touch devices — works in edit mode and out of it; same editor either way.
  btn.addEventListener('touchstart', () => {
    longPressTimer = setTimeout(() => {
      // Mark the moment so the touchend that follows doesn't ALSO log the activity.
      window._lpSuppressClick = Date.now();
      openActEditor(ci, ai);
    }, LONG_PRESS_MS);
  }, { passive: true });
  btn.addEventListener('touchend', () => clearTimeout(longPressTimer));
  btn.addEventListener('touchmove', () => clearTimeout(longPressTimer));
  // Desktop: right-click
  btn.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    openActEditor(ci, ai);
  });
}
```

## 6. JS: positioning + drag
Replace `positionActEditor()` with this whole block. Place it **anywhere** in the main
script, because it waits for `DOMContentLoaded` since the markup sits at the bottom of the
body. Change the `'gol-ae-pos'` key to Squad Life's prefix (e.g. `'sl-ae-pos'`) so the
two apps don't share a spot if they ever run on the same origin.
```js
// Keep the activity editor pinned to the top of whatever is actually on screen.
// With adjustResize offsetTop is 0; if a webview pans instead of resizing, this
// follows it. That is the entire keyboard story now — see openActEditor().
function positionActEditor(){
  const p = document.querySelector('#act-editor .act-editor-panel');
  if(!p) return;
  const ov = document.getElementById('act-editor');
  if(aePos){
    // Player dragged it somewhere — keep it there, but always fully on screen.
    // Fixed width while floating — otherwise it shrink-wraps as it nears the right edge.
    const vw = window.visualViewport ? window.visualViewport.width : window.innerWidth;
    p.style.width = Math.min(460, vw) + 'px';
    const c = aeClamp(aePos.x, aePos.y);
    p.style.left = c.x + 'px'; p.style.top = c.y + 'px'; p.style.right = 'auto'; p.style.margin = '0';
    p.classList.add('floating'); if(ov) ov.classList.add('moved');
  } else {
    p.style.left = ''; p.style.right = ''; p.style.margin = ''; p.style.width = '';
    p.style.top = Math.round(window.visualViewport ? window.visualViewport.offsetTop : 0) + 'px';
    p.classList.remove('floating'); if(ov) ov.classList.remove('moved');
  }
}

// ─── DRAGGABLE EDITOR (2026-09-28) ────────────────────────────────────────────
// Grab the top strip and move the editor wherever it's out of the way. The spot
// is remembered on this device only (localStorage — a per-device convenience,
// never synced). Double-tap / double-click the strip to snap it back to the top.
let aePos = null, aeDrag = null;
try { const v = JSON.parse(localStorage.getItem('gol-ae-pos') || 'null'); if(v && isFinite(v.x) && isFinite(v.y)) aePos = v; } catch(e){}

function aeClamp(x, y){
  const p = document.querySelector('#act-editor .act-editor-panel');
  const vv = window.visualViewport;
  const ox = vv ? vv.offsetLeft : 0, oy = vv ? vv.offsetTop : 0;
  const vw = vv ? vv.width : window.innerWidth, vh = vv ? vv.height : window.innerHeight;
  const w = p ? p.offsetWidth : 300, h = p ? p.offsetHeight : 240;
  return {
    x: Math.round(Math.min(Math.max(ox, x), ox + Math.max(0, vw - w))),
    // If it's taller than the visible area (keyboard up), pin its top so the name field stays reachable.
    y: Math.round(Math.min(Math.max(oy, y), oy + Math.max(0, vh - h)))
  };
}

function aeResetPos(){
  aePos = null;
  try { localStorage.removeItem('gol-ae-pos'); } catch(e){}
  positionActEditor();
  showToast('Editor snapped back to the top 📌');
}

function initActEditorDrag(){
  const grip = document.getElementById('ae-grip');
  const p = document.querySelector('#act-editor .act-editor-panel');
  if(!grip || !p) return;
  grip.addEventListener('pointerdown', e => {
    if(e.button !== undefined && e.button !== 0) return;
    e.preventDefault();                       // keeps the text field focused (keyboard stays put)
    const r = p.getBoundingClientRect();
    aeDrag = { id: e.pointerId, dx: e.clientX - r.left, dy: e.clientY - r.top, moved: false };
    try { grip.setPointerCapture(e.pointerId); } catch(err){}
    p.classList.add('dragging');
  });
  grip.addEventListener('pointermove', e => {
    if(!aeDrag || e.pointerId !== aeDrag.id) return;
    aeDrag.moved = true;
    // getBoundingClientRect is viewport-relative; the overlay is fixed at inset 0, so they line up.
    aePos = { x: e.clientX - aeDrag.dx, y: e.clientY - aeDrag.dy };
    positionActEditor();
  });
  const end = e => {
    if(!aeDrag || e.pointerId !== aeDrag.id) return;
    p.classList.remove('dragging');
    grip._wasDrag = aeDrag.moved;
    if(aeDrag.moved && aePos){
      aePos = aeClamp(aePos.x, aePos.y);
      try { localStorage.setItem('gol-ae-pos', JSON.stringify(aePos)); } catch(err){}
    }
    aeDrag = null;
  };
  grip.addEventListener('pointerup', end);
  grip.addEventListener('pointercancel', end);
  grip.addEventListener('dblclick', aeResetPos);
  // Phones don't always fire dblclick — catch two quick taps ourselves.
  let lastTap = 0;
  grip.addEventListener('pointerup', e => {
    if(e.pointerType !== 'touch') return;
    if(grip._wasDrag){ lastTap = 0; return; }   // a drag is never half of a double-tap
    const now = Date.now();
    if(now - lastTap < 320){ lastTap = 0; aeResetPos(); } else lastTap = now;
  });
  // Screen rotated / window resized — pull it back on screen if it's now off the edge.
  window.addEventListener('resize', () => { if(document.getElementById('act-editor').classList.contains('show')) positionActEditor(); });
}
// The editor markup lives at the very bottom of <body>, after this script — wait for it.
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initActEditorDrag);
else initActEditorDrag();
```
Notes:
- `aePos` / `aeDrag` must be declared before `positionActEditor()` first runs. They're
  top-level `let`s in the block above, and `positionActEditor` only runs on open, so
  that's fine as long as the block isn't inside a function that runs later.
- The floating panel gets an explicit width (`min(460, viewport)`). Without it the
  absolutely-positioned panel shrink-wraps near the right edge and clamps wrong.
- `.floating` sets `animation: none` so the drop-in animation doesn't replay when you
  let go after a drag.

## 7. Verify before you finish
- Syntax-check every inline `<script>` block (`node --check` on each extracted body, or
  wrap each in `new Function(body)`).
- If you can, run a headless check (Playwright with Chromium, and stub the Supabase
  vendor script) that confirms:
  - Edit mode shows the 🗑 tab and normal mode hides it. The first tap arms it and the
    second tap deletes. A checked-today activity leaves `todayChecked`.
  - "+ add" then Cancel leaves the count unchanged. "+ add", rename, Save keeps it.
  - Opening an existing activity doesn't focus `#ae-name`. The editor's Delete needs 2 taps.
  - Dragging the grip moves the panel and saves the position. Dragging to (2000,2000)
    clamps it flush to the bottom-right of the viewport. Reopening restores the spot.
    Double-click resets it and clears the key. The name field is still typeable after
    a drag.
- Bump Squad Life's build tag if it has one.
- `cp index.html www/index.html` (+ the Android public copy if present). A real Android
  Studio rebuild on my machine ships it. Just leave everything synced.

## When done, tell me
- Which path (A/B) you took and what old editor code you removed.
- What you decided (or need me to decide) about shared squad tasks.
- Anything in Squad Life's editor that behaves differently from GoL's.
