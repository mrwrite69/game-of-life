# 🦴 Fetch — setup & notes (added 2026-10-06)

Fetch lives inside Game of Life as its own tab, plus upgrades to ⚡ Quests.
**Everything works right away with no setup**, except tossing tasks to friends,
which needs the one-time table below.

## What's where (all in `index.html`)
- **⚡ Quests tab** — a new quest can carry details: size (S/M/L), how long it takes, energy,
  urgency, where, and repeat (one & done / daily / weekly / monthly).
  Picking a size also adds the quest to your **Boss Battles** permanently (toggle ⚔️ to opt out).
  **🔪 Break it down** chops any quest into pieces, each with its own points and time.
  The quest's own points become a **completion bonus** when every piece is done.
  Cards show only the *next bite* by default.
- **🦴 Fetch tab** — set the filters (time you have, energy, where, size, urgent), throw the ball,
  and the dog brings back one task that fits. 3 throws max, and the 3rd one is locked in.
  When you accept, the timer starts. When it runs out, or the next time you open the app,
  it asks: *did you do it?*
  - ✅ Done → points go to today's log, level and heatmap (same as Side Quests)
  - ⏳ Still going → more time
  - 🔪 Too big → opens the breakdown editor; the smaller bites replace that piece
  - ❌ Didn't happen → cheeky Wu-style pop-up (no points lost) + "break it into smaller bites"
  - 🌸 Every 3 things done or 100 pts → breather dog pop-up
  - The **🔪 Too big? Break it into smaller bites** button is always pinned to the bottom of the Fetch tab
- **🐕‍🦺 The Pack** (bottom of Fetch) — friends' fetches today, and tossing tasks to each other.

Data: quests stay in `side_quests`; Fetch state is in `days._fetch`, and permanent custom
bosses are in `days._customBosses`, inside your existing `game_data` row. No schema change is needed for those.

## One-time setup for tossing tasks to friends
Supabase dashboard → **SQL Editor** → run:

```sql
create table if not exists public.fetch_gifts (
  id          uuid primary key default gen_random_uuid(),
  from_user   uuid not null references auth.users(id) on delete cascade,
  to_user     uuid not null references auth.users(id) on delete cascade,
  from_name   text,
  task        text not null,
  pts         int  not null default 15,
  minutes     int  not null default 10,
  status      text not null default 'pending'
              check (status in ('pending','accepted','declined','done')),
  created_at  timestamptz not null default now()
);

alter table public.fetch_gifts enable row level security;

-- You can only toss to accepted friends
create policy "toss to friends" on public.fetch_gifts for insert
  with check (
    auth.uid() = from_user
    and exists (select 1 from public.friends f
                where f.user_id = auth.uid() and f.friend_user_id = to_user and f.status = 'accepted')
  );

-- Sender and receiver can see it
create policy "see own tosses" on public.fetch_gifts for select
  using (auth.uid() = from_user or auth.uid() = to_user);

-- Receiver catches / passes / finishes it
create policy "receiver updates" on public.fetch_gifts for update
  using (auth.uid() = to_user);

create policy "either side deletes" on public.fetch_gifts for delete
  using (auth.uid() = from_user or auth.uid() = to_user);
```

Until you run this, the Pack shows a small note pointing here, and everything else in Fetch works normally.

## Undo
The pre-Fetch version is saved as `index.html.pre-fetch-20261006`.
