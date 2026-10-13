# Publishing Game of Life 🐾

How to put the app online so anyone — iPhone, Android or Mac — can install it.
Written 2026-07-28.

Once this is set up, shipping an update is three commands. The first-time setup
is the only fiddly part, and you only do it once.

---

## ⚠️ Read this first — the two files you must back up

Setting up Android signing created two files in `android/`:

- `gameoflife-release.keystore`
- `keystore.properties`

They are deliberately **gitignored**, so they will never leave your Mac on their own.

**Back both up today** — password manager, encrypted drive, wherever you keep
things you can't lose. If they disappear, you can still build the app, but the
new build counts as a *different* app to Android. Everyone who installed the old
one would have to delete it and start again. There is no recovery process and no
one to appeal to. Two minutes now saves that.

(Your game data lives in Supabase, so it would survive a reinstall — but the
local dog choice, font scale and offline cache would not.)

---

## Part 1 — Put the web app online (do once)

Your repo already exists at `github.com/mrwrite69/game-of-life`. GitHub Pages
serves a folder straight out of it, free, no account upgrade needed.

### 1. Push the new files

```bash
cd ~/"Documents/Claude/Projects/Game of Life/game-of-life"
./sync-all.sh
cd ..
git add -A
git commit -m "Add PWA build, install page and Android release signing"
git push
```

### 2. Turn on GitHub Pages

1. Go to **github.com/mrwrite69/game-of-life** → **Settings** → **Pages**
   (left sidebar).
2. Under **Source**, choose **Deploy from a branch**.
3. Set branch to **main** and folder to **/docs**. Hit **Save**.
4. Wait 1–2 minutes. The page will show you the live URL.

> **The repo has to be public** for Pages on a free GitHub account. If it's
> currently private: Settings → General → scroll to the bottom → *Change
> repository visibility*. Your Supabase anon key is safe to publish — it's
> designed to be public, and row-level security is what actually protects the
> data. Just remember the app's PINs become readable in the page source.

### 3. Your links

| What | URL |
|---|---|
| **The app** | `https://mrwrite69.github.io/game-of-life/` |
| **Install page** (the one to share) | `https://mrwrite69.github.io/game-of-life/get.html` |

Send people the **install page**. It detects their device and shows them the
right instructions, with the download buttons built in.

---

## Part 2 — Build a signed Android APK (do once, then per release)

The `app-debug.apk` you have now works, but it's signed with a throwaway key.
Build a proper release once and every future update installs cleanly over it.

### In Android Studio

```bash
cd ~/"Documents/Claude/Projects/Game of Life/game-of-life"
./sync-all.sh
npx cap sync android
npx cap open android
```

Then: **Build** menu → **Generate Signed Bundle / APK** → choose **APK** →
it should pick up the signing config automatically → select **release** →
**Finish**.

### Or from the terminal

```bash
cd ~/"Documents/Claude/Projects/Game of Life/game-of-life/android"
./gradlew assembleRelease
```

Either way the APK lands at:

```
android/app/build/outputs/apk/release/app-release.apk
```

### Bump the version before each new release

In `android/app/build.gradle`, raise `versionCode` by 1 and update
`versionName` to something human:

```gradle
versionCode 2
versionName "1.1"
```

Android refuses to install an update whose `versionCode` isn't higher than the
installed one, so this step is not optional.

---

## Part 3 — Publish the downloads

The install page points at GitHub Releases, which is where the APK and the
`.dmg` should live. Releases don't count against the repo size, and the
"latest" links never change.

1. Go to **github.com/mrwrite69/game-of-life/releases** → **Create a new release**.
2. Tag: `v1.0` (then `v1.1`, and so on).
3. Drag in:
   - `android/app/build/outputs/apk/release/app-release.apk` —
     **rename it to `game-of-life.apk`** before uploading. The install page
     links to that exact filename.
   - `dist/Game of Life-1.0.0-arm64.dmg` for the Mac download.
4. **Publish release.**

The install page's buttons use
`releases/latest/download/game-of-life.apk`, so as long as each new release
has an asset with that name, the download link updates itself. You never have
to edit the page again.

---

## Shipping an update, from here on

```bash
cd ~/"Documents/Claude/Projects/Game of Life/game-of-life"
./sync-all.sh                     # syncs all four copies of index.html
cd .. && git add -A && git commit -m "What changed" && git push
```

The web app is live within about a minute. Existing PWA users get the new
version next time they open it — the service worker checks the network first
and only falls back to its cache when there's no signal.

Android and Mac users only get changes when you cut a new release, so do
Parts 2 and 3 again when a change is worth pushing to them.

---

## What iPhone users get, and don't

**They get:** the whole game. Points, streaks, levels, missions, side quests,
boss battles, the calendar, the dashboard, cloud sync, offline play, the
Wu-Tang splash, the dog picker — all of it, full-screen with its own icon.

**They don't get:** scheduled push notifications. The 11:11 AM spark and the
11:11 PM night-owl check-in can't fire, because iOS doesn't give web apps a
background scheduler. Everything that happens *inside* the app while it's open
still works — toasts, the Sisyphus prompt, the streak-protect overlay, timers
that finish while you're looking at them.

That's the one real tradeoff for not having an Apple developer account. If you
get one later, the same code can be wrapped with Capacitor for iOS and
notifications light up — nothing you've built here would need rewriting.

---

## Files this added

| File | What it does |
|---|---|
| `manifest.json` | Tells phones the app's name, icon, colours and that it opens full-screen |
| `sw.js` | Service worker — offline support. Never touches Supabase; app shell is network-first |
| `get.html` | The install page you share with people |
| `assets/icons/` | App icons generated from the beagle splash icon |
| `sync-all.sh` | Copies the master `index.html` to all four build targets |
| `docs/` | The built web app that GitHub Pages serves. Generated — don't edit by hand |
| `android/keystore.properties` | Signing credentials. **Gitignored. Back it up.** |
| `android/gameoflife-release.keystore` | Your signing key, valid to 2056. **Gitignored. Back it up.** |
