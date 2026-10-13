# Game of Life — Build & Run Steps

## Folder
```bash
cd ~/"Documents/Claude/Projects/Game of Life/game-of-life"
```
(Quotes matter — the path has spaces.)

## First-time build → open Android Studio
```bash
cd ~/"Documents/Claude/Projects/Game of Life/game-of-life"
npm install            # first time only (Electron + Capacitor deps)
cp index.html www/index.html
npx cap sync android
npx cap open android
```
Then in Android Studio: let **Gradle sync** finish, plug in a phone or start an emulator,
and hit the green **▶ Run** to build + install.

## Every time you change index.html (routine)
```bash
cd ~/"Documents/Claude/Projects/Game of Life/game-of-life"
cp index.html www/index.html
npx cap sync android
npx cap open android
```

## Test on Mac only (no Android)
```bash
cd ~/"Documents/Claude/Projects/Game of Life/game-of-life"
npm start              # Electron desktop app
```

## Build a Mac .dmg
```bash
npm run build          # output lands in dist/
```

## Notes
- `capacitor.config.ts` sets `webDir: 'www'`, so Capacitor ships from `www/` — always
  `cp index.html www/index.html` before `npx cap sync android`, or Android gets stale code.
- Prereqs: Node.js, Android Studio, and (for a phone) USB debugging enabled on the device.
