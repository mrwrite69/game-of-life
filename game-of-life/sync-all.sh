#!/usr/bin/env bash
# ============================================================
#  Game of Life — sync every build target from the master index.html
#  Added 2026-07-28.
#
#  There are now FOUR copies of index.html in this project:
#
#    index.html                                   ← the master. Only edit this one.
#    www/index.html                               ← what Capacitor syncs from
#    android/app/src/main/assets/public/index.html ← what the Android app runs
#    docs/index.html                              ← what GitHub Pages serves
#
#  Run this after every change to the master and all four stay in step.
#
#  Usage:  ./sync-all.sh
# ============================================================

set -euo pipefail
cd "$(dirname "$0")"

MASTER="index.html"
ANDROID_PUBLIC="android/app/src/main/assets/public"
BUILD_STAMP="$(date +%Y%m%d-%H%M%S)"

if [ ! -f "$MASTER" ]; then
  echo "✗ Can't find $MASTER — are you running this from game-of-life/?" >&2
  exit 1
fi

echo "🐾 Game of Life — syncing all targets"
echo "   build stamp: $BUILD_STAMP"
echo

# --- 1. Capacitor staging dir -------------------------------
mkdir -p www/assets
cp "$MASTER" www/index.html
cp -R assets/vendor www/assets/
cp -R assets/icons  www/assets/ 2>/dev/null || true
echo "  ✓ www/"

# --- 2. Android app assets ----------------------------------
# Copied by hand as well as via cap sync, because `npx cap sync android`
# is not always runnable (see SAFETY_AND_RECOVERY.md / project notes).
if [ -d "$ANDROID_PUBLIC" ]; then
  mkdir -p "$ANDROID_PUBLIC/assets"
  cp "$MASTER" "$ANDROID_PUBLIC/index.html"
  cp -R assets/vendor "$ANDROID_PUBLIC/assets/"
  cp -R assets/icons  "$ANDROID_PUBLIC/assets/" 2>/dev/null || true
  echo "  ✓ android public assets"
else
  echo "  ⚠ $ANDROID_PUBLIC not found — skipped Android"
fi

# --- 3. GitHub Pages build ----------------------------------
mkdir -p docs/assets
cp "$MASTER"       docs/index.html
cp get.html        docs/get.html
cp manifest.json   docs/manifest.json
cp -R assets/vendor docs/assets/
cp -R assets/icons  docs/assets/
cp assets/icons/favicon-32.png docs/favicon.png

# Stamp the service worker so a new deploy invalidates old caches.
sed "s/BUILD_STAMP/$BUILD_STAMP/" sw.js > docs/sw.js

# Tell GitHub Pages not to run the files through Jekyll — otherwise
# it silently ignores anything in a folder starting with an underscore.
touch docs/.nojekyll
echo "  ✓ docs/  (GitHub Pages)"

echo
echo "Done. Next:"
echo "  Web      →  git add -A && git commit -m 'Update' && git push"
echo "  Android  →  npx cap sync android, then Run in Android Studio"
echo "  Desktop  →  npm run build"
