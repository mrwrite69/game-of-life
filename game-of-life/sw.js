/* ============================================================
   Game of Life — service worker
   Added 2026-07-28. Only ever runs on the hosted PWA build.

   Design rules, in order of importance:

   1. NEVER touch Supabase. Auth tokens and game data must always
      go to the network, unintercepted. A cached write or a cached
      stale read is exactly the failure mode that cost us history
      once already. Cross-origin requests are passed straight to
      the browser.
   2. index.html is NETWORK-FIRST. A push goes live immediately;
      the cache is only a fallback for when there is no signal.
   3. Static assets (icons, vendor JS, fonts) are CACHE-FIRST and
      refreshed in the background. They are big and change rarely.
   ============================================================ */

const VERSION    = 'BUILD_STAMP';           // replaced at build time by sync-all.sh
const SHELL      = `gol-shell-${VERSION}`;
const RUNTIME    = `gol-runtime-${VERSION}`;

// Everything needed to cold-boot the app with no network.
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './assets/vendor/chart.umd.js',
  './assets/vendor/supabase.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL)
      // addAll is all-or-nothing; add individually so one 404 can't
      // abort the whole install and leave the app with no worker.
      .then(cache => Promise.all(
        PRECACHE.map(url => cache.add(url).catch(() => null))
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== SHELL && k !== RUNTIME)
            .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;

  // Only ever handle GET. Never cache a POST/PATCH/DELETE.
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // --- Rule 1: hands off anything that isn't ours -------------
  // Supabase, and any other API, goes straight to the network.
  // Google Fonts is the one deliberate exception below.
  const isFont = url.hostname === 'fonts.googleapis.com'
              || url.hostname === 'fonts.gstatic.com';
  if (!sameOrigin && !isFont) return;

  // --- Rule 2: the app shell is network-first -----------------
  const isDocument = req.mode === 'navigate'
                  || (sameOrigin && url.pathname.endsWith('index.html'));

  if (isDocument) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(SHELL).then(c => c.put('./index.html', copy));
          return res;
        })
        .catch(() =>
          caches.match('./index.html', { ignoreSearch: true })
            .then(hit => hit || caches.match('./'))
        )
    );
    return;
  }

  // --- Rule 3: static assets are cache-first ------------------
  event.respondWith(
    caches.match(req).then(hit => {
      if (hit) {
        // Refresh in the background; the user still gets the fast hit.
        fetch(req)
          .then(res => {
            if (res && res.ok) caches.open(RUNTIME).then(c => c.put(req, res));
          })
          .catch(() => {});
        return hit;
      }
      return fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(RUNTIME).then(c => c.put(req, copy));
        }
        return res;
      });
    })
  );
});
