# Game of Life 🐾

A personal habit tracker that makes self-care feel like a game. Log daily activities, earn points, and level up through 11 dog-named levels — from Dirty Dog all the way to **Hara 🌸** and **Monty 👑**.

## Stack

- **UI**: Vanilla JS + HTML + CSS (single file — `game-of-life/index.html`)
- **Desktop**: Electron (macOS)
- **Mobile**: Capacitor (Android)
- **Backend**: Supabase (cloud sync, auth)

## Running the App

```bash
cd game-of-life
npm start          # Electron dev mode
npm run build      # Build .dmg installer
```

## Android Sync

After any change to `index.html`:

```bash
cp index.html www/index.html && npx cap sync android
```

Then hit Run in Android Studio.

## Levels

Dirty Dog → Toto → Scooby → Beethoven → Lassie → Balto → Togo → Hachiko → Laika → **Hara 🌸** → **Monty 👑**

## Features

- Supabase login/signup with PIN and Remember Me
- Cloud sync with offline support
- Boss Battles, 37 Missions + custom builder
- 16 Achievements, Habit heatmap, Mood + Energy tracker
- Focus Timer (auto-logs linked activity on completion)
- Timed Challenges, per-activity 🔥 streak badges
- Side Quests (⚡ Quests tab)
- Dashboard: 14-day charts, Meta Streak dots, Top Activities
- Arcade Leaderboard (🏆 Board tab) — streak-ranked, 69 positions, dog characters as ghosts to beat
- 3 starter templates: Sea Dog's Game, Blank Slate, Claudelen's Game
