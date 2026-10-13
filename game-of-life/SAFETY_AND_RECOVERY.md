# Game of Life — Data-Loss Safeguards (added 2026-07-21)

Written after the night the cloud `days` history got overwritten with a blank game.
The root cause: a blank/failed read dropped the app to the "new player" template
picker, and a template pick then saved an empty history straight over the real one —
with no confirmation and no backup.

Four guards now break every link in that chain. All live in `index.html`.

## Guard 1 — Refuse to save a blank game over a real one
In `saveToSupabase()`, before touching the cloud **or** the local cache: if the local
history is empty, the app first checks the cloud. If the cloud still has days, the save
is **blocked** and you see a "Safety hold" message instead. A blank state can no longer
overwrite your saved history. (Intentional new-game/template flows set an `allowEmptySave`
flag so they still work.)

## Guard 2 — A failed load never shows the template picker
`loadFromSupabase()` now records how the load went (`loaded` / `newuser` / `failed`).
The picker only appears for a **genuinely new account**. If a load fails or comes back
blank, you get a full-screen **"Couldn't load your game — Try again"** retry screen,
never the picker. This is the screen that used to invite the destructive template tap.

## Guard 3 — Templates back up and confirm first
`chooseGame()` detects an existing game and, before replacing it, takes a backup and
asks you to confirm. No more silent replacement.

## Guard 4 — Rolling backups the app makes itself
Because the Supabase **free plan has no database backups**, the app now keeps its own:

- **On your device:** the last 5 snapshots (`gol-safety-backup-*` in localStorage),
  taken every time real data loads and before any template change.
- **In the cloud (optional, needs one-time setup below):** a throttled history in a
  separate `game_backups` table — taken on load, after saves (~4/day max), and before
  template changes. Best-effort: if the table doesn't exist, it silently does nothing.

### One-time cloud-backup setup (optional, do when you're ready)
Run this in the Supabase dashboard → **SQL Editor**. Until you do, device backups still
work; this just adds the cloud safety net too.

```sql
create table if not exists game_backups (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  reason text,
  snapshot jsonb not null,
  created_at timestamptz default now()
);
alter table game_backups enable row level security;
create policy "own backups" on game_backups
  for all using (auth.uid() = user_id);
```

To **restore** from a cloud backup later: open the `game_backups` table, find a row with
a good `snapshot`, and copy its `snapshot->days` back into `game_data.days` (or ask
Claudelen to walk you through it).

## In-app Restore screen (added 2026-07-21)
Open the 🔔 Notifications panel → **🛟 Restore from backup**. It lists every available
snapshot — device rolling backups, this device's last synced copy, and cloud backups (if
the `game_backups` table exists) — newest first, each showing its date and a summary
(days · points · categories · activities). One tap restores it: your *current* game is
backed up first (reason `before-restore`, so you can undo), then the chosen snapshot
replaces it and syncs to the cloud. No Supabase editing required.

## 🛟 Data-loss recovery flow (added 2026-07-21)
For when someone's history is genuinely lost to a circumstance beyond their control (like
the free-plan wipe). This is **disaster recovery, not cheating** — it restores effort that
happened, it doesn't invent effort that didn't.

**How to trigger:** Open **Switch Game** (from inside the app), scroll to the bottom of the
templates, and tap the small **"🛟 Lost your data to a glitch? Recover a game"** link (it's
also on the first-login game picker). Enter the recovery PIN **4321** to launch the
**Recover your climb** screen. Every game template stays public — recovery lives on its own
link, not behind any game. (Sea Dog's Game now sits at the bottom of the template list.)

**What it does:** asks *"What day did you start the game?"*, then rebuilds every day from
that date up to **yesterday** as a **blue "recovered" day at 300 points** (`recovered:true`
flag → blue tint in the growing calendar, distinct from real green pass-days). Because the
dog level is driven by pass-day count, this restores the correct level automatically
(e.g. 42 days → Togo / Level 7), and the streak continues up to yesterday. Missions, side
quests, boss battles, achievements all start fresh. A live preview shows the day count,
weeks, and resulting dog level before you commit.

The recovery PIN (`RECOVERY_PIN`) and normal PIN (`CLAUDELEN_PIN`) are constants near the
top of the script if you ever want to change them.

## Also in this build
- Notifications trimmed to two 11:11s + timer, with a persistent once-per-day guard so
  11:11 can't repeat.
- Missions are now consecutive-day streaks (rest days pause, don't break); a broken
  streak fires the Sisyphus screen and returns the mission to the board.

## Backups of the app file itself (in this folder)
- `index.html.bak-20260721-1453` — known-good from before today's edits
- `index.html.safeguarded-*` — this safeguarded build
