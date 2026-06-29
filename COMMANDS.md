# Game of Life — Command Cheat Sheet

## First: always navigate to the right folder

```bash
cd ~/Desktop/game-of-life
```

---

## Electron Desktop App (Mac)

**Run in dev mode** (live window, for testing):
```bash
npm start
```

**Build the .dmg installer** (to install/share):
```bash
npm run build
```

---

## Android Phone App

Every time you change `index.html`, run these three steps in order:

**Step 1 — copy the file to the www folder:**
```bash
cp index.html www/index.html
```

**Step 2 — sync to the Android project:**
```bash
npx cap sync android
```

**Step 3 — rebuild in Android Studio:**
Open Android Studio → click the green ▶ Run button (or Shift+F10)

> ⚠️ Never skip Step 1. Capacitor reads from `www/` not the root — if you forget the copy, your phone gets stale code.

---

## All three Android steps in one go (copy/paste this):

```bash
cp index.html www/index.html && npx cap sync android
```
Then hit Run in Android Studio.

---

## Open Android Studio directly from terminal (optional):

```bash
npx cap open android
```

---

## Troubleshooting

**Phone not showing latest changes?**
→ Make sure you ran `cp index.html www/index.html` first, then sync, then a clean rebuild in Android Studio (Build → Clean Project → Run)

**Electron window won't open?**
→ Check you're in the right folder (`cd ~/Desktop/game-of-life`) then `npm start` again

**Supabase not connecting?**
→ Check your wifi — the app works offline but won't sync until reconnected
