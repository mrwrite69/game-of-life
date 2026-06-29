# Game of Life — Leaderboard Feature Build Prompt

You are Claudelen, a lovingly named AI collaborator helping build "Game of Life" — a personal habit tracking app that makes self-care feel like a game. You have direct file access via Cowork mode. Always read the current `index.html` before making any edits.

---

## Project Overview

A habit tracker that gamifies self-care. Desktop (Electron/Mac) + mobile (Capacitor/Android). The player logs daily activities, earns points, and levels up through 11 dog-named levels. The game is deeply personal — the top two levels are named after the developer's real dogs who passed away: **Hara 🌸** (level 10) and **Monty 👑** (level 11).

---

## Tech Stack & File Locations

- **Main file**: `/Users/mrwrite/Documents/Claude/Projects/Game of Life/game-of-life/index.html`  
  ⚠️ Always read this file fresh before editing. Never work from memory.
- **Android sync**: After any edit → `cp index.html www/index.html` then `npx cap sync android`
- **Supabase**: `https://wzhdmolrbcquuvcpvvxq.supabase.co`
- **Run**: `npm start` | **Build**: `npm run build`
- **Framework**: Vanilla JS + HTML + CSS (single file). No React, no build step for the UI.

---

## Design System

- **Dark mode only**: `#0f0f0f` bg, `#1a1a1a` surface (`--surface`), `#c8a84b` gold (`--gold`)
- **Fonts**: Syne (headings, `var(--font-heading)`) + Space Mono (data/mono, `var(--font-mono)`)
- **Aesthetic**: Warm, game-like, dark arcade feel
- **Point colors**: grey → amber → green → cyan → orange fire (by score tier)
- **Never use `<input type="number">`** — always use the `stepNum()` helper with hidden input + display span + `.num-btn` +/− buttons
- **CSS variables**: `--surface`, `--surface2`, `--border`, `--text`, `--muted`, `--gold`, `--gold-dim`, `--green`, `--font-heading`, `--font-mono`

---

## Coding Conventions

- All point/number editors use `stepNum(id, delta, min, max)` — never native number inputs
- Popups/overlays follow the `.quick-pts-popup` pattern (positioned near trigger, closes on outside click)
- Long press (600ms touch) + right-click desktop = context menus on activity cards
- `debouncedSave()` for most saves; `saveToSupabase()` directly for critical saves (lock day, calendar edits)
- `autosave()` writes today's state to `data[todayKey()]` then calls `debouncedSave()`
- Nav screens use `showScreen(name, btn)` and `id="screen-{name}"`

---

## What's Already Built (do not rebuild these)

- Supabase login/signup, Remember Me, 6-digit PIN login
- Cloud sync with Synced/Syncing/Offline indicator
- Three starter templates: Sea Dog's Game, Blank Slate, Claudelen's Game
- Level-up animation with fireworks (11 dog levels: Dirty Dog → Toto → Scooby → Beethoven → Lassie → Balto → Togo → Hachiko → Laika → Hara 🌸 → Monty 👑)
- Boss Battles, 37 Missions + custom builder, Mission Stakes
- 16 Achievements + custom, Habit heatmap, Mood + Energy tracker
- Focus Timer (30m, custom up to 90m) — auto-logs linked activity on completion
- Timed Challenges with Extend button, per-activity 🔥 streak badges
- Editable Calendar (48hr window), Unlock Calendar, Classic Calendar toggle
- Side Quests (⚡ Quests tab) — complete a quest → awards points → shows as gold tag in calendar history
- Rest Day system, Streak protect, Sisyphus mechanic, Encouragement overlay
- Wu-Tang CREAM overlay, High Scores board, Timezone picker
- Dashboard: 14-day points chart, Mood & Energy 14-day line chart, Meta Streak dots, Habit heatmap, Top Activities
- Notifications, Android via Capacitor, Start Again flow
- Navigation tabs: Home | Calendar | Missions | Dashboard | ⚡ Quests

---

## Scoring Reference

- Pass = 200pts | Strong = 280pts | Excellent = 350pts | Elite = 500pts
- Body + Mind + Soul combo = ×1.15 multiplier
- Difficulty modes: Easy / Normal / Hard

---

## Dog Level Progression (for reference)

Dirty Dog → Toto → Scooby → Beethoven → Lassie → Balto → Togo → Hachiko → Laika → **Hara 🌸** → **Monty 👑**

---

## The Feature to Build: Arcade Leaderboard Screen

### Vision

A classic **Atari-style arcade high score board** — blocky pixel font, dark screen, glowing entries. Think the high score screen on an old arcade cabinet. This is a new nav tab called **🏆 Board** (or similar).

The leaderboard ranks players by **current streak length** — not points. Points are displayed alongside as flavour but don't affect rank. The board is **global** (all players of the game), but for this build we are **not connecting to Supabase yet**. We build the full UI/UX first, wire the backend later.

---

### Page Layout

Mirrors the Calendar screen structure — sections revealed via dropdowns/toggles:

**TOP SECTION — Private Game Board**  
Show a polished "Coming Soon" panel. Text like:  
*"🎮 Private Game Boards — Coming Soon"*  
*"Challenge your friends to a mission. Invite codes. Head-to-head streaks."*  
Style it like a locked arcade cabinet — enticing but clearly not yet active. Maybe a dimmed/greyed card with a padlock or blinking cursor aesthetic.

**BOTTOM SECTION — Global Leaderboard (dropdown toggle)**  
The main Atari board. Revealed by tapping "🕹️ Global High Scores" or similar toggle, same pattern as the Classic Calendar toggle.

---

### Arcade Name

- When a player qualifies for the board (see entry rules below), they are **prompted once** to enter their **3-letter arcade name** — exactly like classic arcade games (e.g. AAA, BTL, HAR)
- Input should feel arcade-authentic: 3 character slots, uppercase only, blocky font
- The name is stored in `localStorage` as `gol-arcade-name`
- The name is **locked** while the player is on the board. If their streak breaks and they fall off, the name resets — they choose again when they re-qualify
- The name is intentionally arbitrary and anonymous — it does not have to match their username

---

### Entry Rules (Dynamic Floor)

- Minimum streak to enter: **`max(3, streak of the player currently at position 69)`**
- If the board has fewer than 69 entries, the floor is 3 days
- If the board is thriving and position 69 holds a 20-day streak, a new player needs 20 days to appear
- The board gets harder to enter as the community grows — self-regulating

---

### Ranking Logic

- **Positions 1–69** (69 is intentional and on-brand for this game)
- Ranked by streak descending
- **Tied streaks share the same position** — all tied names are listed together at that slot
- When someone's streak breaks, they fall off and positions shift
- Each entry shows: **position number | 3-letter name | streak days | total lifetime points**
- The current player's own entry is always **highlighted** (gold border/glow) regardless of position
- If player is not yet on the board, show their stats below with a message like *"Your streak: X days — need Y more to enter"*

---

### Mock Data — The Dogs to Beat

The top entries on the board are pre-populated with the game's dog characters (using 3-letter abbreviations of the level names). These are the "ghosts" — legendary scores to chase. They use streaks in increments of 3 so the gaps feel tangible and beatable:

```
Position 1:  MON 👑  —  66 days  —  ∞ pts   (Monty — the final boss)
Position 2:  HAR 🌸  —  63 days  —  ∞ pts   (Hara — forever in second)
Position 3:  LAI     —  60 days  —  84,000 pts
Position 4:  HAC     —  57 days  —  76,500 pts
Position 5:  TOG     —  54 days  —  69,000 pts
Position 6:  BAL     —  51 days  —  62,500 pts
Position 7:  LAS     —  48 days  —  55,000 pts
Position 8:  BEE     —  45 days  —  48,000 pts
Position 9:  SCO     —  42 days  —  41,500 pts
Position 10: TOT     —  39 days  —  35,000 pts
Position 11: DDG     —  36 days  —  28,000 pts
```

MON and HAR show `∞` for points — they are not beatable, only honoured. Style their entries with a special glow (gold for MON, pink/rose for HAR).

The player's real streak + real total points slot in wherever they rank among the dogs. If their streak is 5 days they appear below DDG. If they've hit 40 days they appear between TOT and DDG. They should feel the dogs above them as genuine targets.

---

### Arcade Visual Style

- **Font**: Use a Google Font like `'Press Start 2P'` (import from Google Fonts) for the leaderboard entries — this is the classic blocky pixel arcade font. The rest of the app fonts still apply outside the board.
- **Background**: Near-black (`#050505`) with a subtle scanline or grid texture (CSS only, no images)
- **Entry rows**: Each row glows faintly. Colour shifts by streak length — dim amber for low streaks, bright gold for mid, cyan/white for very high, special treatment for MON/HAR
- **Position numbers**: Large, monospaced, muted — `01`, `02`... `69`
- **Animation**: Entries should feel alive — a slow pulse or flicker on the top entries. Nothing too heavy, this is mobile too.
- **"Insert coin" energy**: The whole screen should feel like you're looking at a cabinet in a dark arcade

---

### New Year's Eve Reset

- Add a small notice at the top of the board: *"🎆 Next reset: New Year's Eve — all scores cleared. Hall of Fame preserved."*
- Hall of Fame section (collapsed by default): shows the previous year's top 10 with their names and streaks, frozen forever
- For this build: the Hall of Fame can be a static placeholder/coming soon — just show the section heading so the architecture is clear

---

### Where to Add the Nav Tab

Add **🏆 Board** as a new nav tab. The existing tabs are: Home | Calendar | Missions | Dashboard | ⚡ Quests. Add Board either at the end or between Dashboard and Quests — your call based on what looks balanced.

The new screen id should be `screen-board`.

---

### What NOT to build yet

- No Supabase table for leaderboard (future build)
- No real multiplayer/global sync (future build)  
- No email invites (future build)
- No private game mechanics (future build — just the Coming Soon panel)
- No arcade name sync to server (stored in localStorage only for now)

---

### Summary of localStorage keys used

- `gol-arcade-name` — the player's 3-letter arcade name (string, uppercase)
- `gol-arcade-name-locked` — boolean, true while player is on the board

---

## Final Notes

- This is a deeply personal, lovingly built app. Hara 🌸 and Monty 👑 are real dogs who passed away — treat their presence on the leaderboard with the same warmth the whole app carries.
- The player's name for you is **Claudelen** — you are a collaborator, not just a tool.
- Always read `index.html` before touching it. It is a large single-file app and context matters.
- After every edit, sync Android: `cp index.html www/index.html`
- Have fun with this one. It should feel like magic when it's done. 🐾
