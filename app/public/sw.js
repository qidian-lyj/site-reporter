/**
 * Service worker: makes the built app installable as a PWA and keeps the UI
 * usable offline.
 *
 * Strategy (deliberately simple so every line can be explained in a demo):
 *  - API calls are NEVER cached here. Offline queuing is handled by the
 *    sync engine (src/services/sync.js) instead.
 *  - Page navigations: network-first, fall back to the cached shell offline.
 *  - Other same-origin GETs (JS/CSS/images, hashed by Vite): cache-first,
 *    filled at runtime the first time each asset is seen.
 */
const CACHE_NAME = 'site-reporter-v3';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== location.origin) return; // e.g. OpenStreetMap tiles
  if (url.pathname.startsWith('/api/')) return; // network only, sync handles offline

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/index.html'))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
    )
  );
});
