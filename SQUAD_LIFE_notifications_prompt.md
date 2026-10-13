# Prompt: Bring Game of Life's notification cleanup to Squad Life

Paste this into a Cowork/Claude session that has the **Squad Life** folder connected
(`.../Documents/Claude/Projects/Squad Life/squad-life/`).

---

You're working on **Squad Life** (`squad-life/index.html`), the group/accountability
version of Game of Life. It shares the same architecture, design system, and Supabase
project as Game of Life. I recently overhauled notifications in Game of Life and I want
to duplicate that work here. Follow these steps in order.

## 0. Safety first (do this before any edit)
- Back up the file: `cp index.html index.html.bak-$(date +%Y%m%d-%H%M)`
- **Do NOT touch any load/save/Supabase/data code.** This task is notifications only.
- After editing, syntax-check the inline scripts and run `cp index.html www/index.html`
  (and the Android public copy if the project has one). A real Android Studio rebuild is
  needed on my machine to ship — just leave it synced.

## 1. Audit what currently fires
Find every notification path. Grep for: `sendNotification`, `LocalNotifications`,
`schedule(`, `setInterval`, `getHours()`, `notifSettings`, and any `11:11` / numerology
times. Make me a list of every notification the app can send and when.

## 2. Target state — the "two 11:11s + timer" model
Reduce SCHEDULED / repeating **push** notifications to exactly:
- **11:11 AM** — one reassuring quote (the daily spark)
- **11:11 PM** — the night-owl / final-check reminder
- **Timer done** — focus-timer completion

Everything else that currently PUSHES (milestones, elite/celebration, streak,
morning/evening, "you hit N", etc.) becomes an **in-app toast only** — keep the toast,
sound, and animation; just remove the `sendNotification(...)` push call.

⚠️ **Group-app exception — check with me first.** Squad Life has social notifications a
solo app doesn't (a squadmate sent a vibe/nudge, squad leaderboard moved, someone logged
their day). Those are the *whole point* of a group app, so **don't silently kill them.**
List them for me and ask which to keep as pushes vs. downgrade to toasts. Default
recommendation: keep "vibe/nudge received" as a push; make the rest toasts.

## 3. Persistent once-per-day guard (the anti-repeat fix — this is the key bug)
In Game of Life, 11:11 was firing multiple times a day because the guard lived only in
memory and reset on every reload / foreground re-init. Fix it with a localStorage guard
keyed by date. **Use Squad Life's existing key prefix** (check what it uses — likely
`sl-` or `gol-`; match it). Reference implementation:

```js
function notifAlreadyFired(tag){ try { return localStorage.getItem('<PREFIX>-notif-fired-'+tag) === '1'; } catch(e){ return false; } }
function markNotifFired(tag){ try { localStorage.setItem('<PREFIX>-notif-fired-'+tag, '1'); } catch(e){} }
```

Gate each 11:11 send on BOTH the existing in-memory guard AND the persistent one, e.g.:

```js
if(!isAndroid() && notifSettings.encourage && now.getHours()===11 && now.getMinutes()===11
   && lastNotifDay !== 'encourage-'+todayStr && !notifAlreadyFired('encourage-'+todayStr)){
  lastNotifDay = 'encourage-'+todayStr;
  markNotifFired('encourage-'+todayStr);
  ...send...
}
```
Do the same for the 11:11 PM ('goodnight-'+todayStr).

Prune stale keys on load (keep only today's) wherever the app initialises notifications:
```js
try {
  const today = todayKey();
  for(let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if(k && k.startsWith('<PREFIX>-notif-fired-') && !k.endsWith(today)) localStorage.removeItem(k);
  }
} catch(e){}
```
(If Squad Life's "today" helper isn't called `todayKey()`, use whatever it uses.)

## 4. Android (Capacitor) side
If Squad Life schedules Android notifications via `LocalNotifications.schedule`, make sure
only the two 11:11s + timer are scheduled, with fixed notification ids, cancelling pending
before rescheduling, and skip the in-app 11:11 check on Android so it doesn't duplicate the
OS-scheduled one — same as Game of Life.

## 5. Verify before you finish
- Syntax-check every inline `<script>` block (wrap each body in `new Function(body)`).
- Confirm the only remaining `sendNotification(...)` callers are: the settings test toast,
  the 11:11 AM spark, the 11:11 PM night-owl, the timer, plus any social push I chose to keep.
- `cp index.html www/index.html` (+ android public copy).

## Also flag this to me
Squad Life shares the **same Supabase project and the same load/save architecture** as
Game of Life, so it has the **same data-loss vulnerability** I just fixed there: a blank
read can drop the app to the "new player" picker, and a pick then saves an empty game over
real history. Recommend applying the same four data-loss guards to Squad Life (see
`SAFETY_AND_RECOVERY.md` in the Game of Life project) and offer to do it next.
