/**
 * Service worker: makes the built app installable as a PWA and keeps the
 * UI working offline.
 *
 * Caching strategy (deliberately simple so every line can be explained):
 *  - API calls are NEVER cached here. Offline queuing is handled by the
 *    sync engine (src/services/sync.js) instead.
 *  - Page navigations: network-first, fall back to the cached shell offline.
 *  - Same-origin assets (hashed JS/CSS/images): cache-first, filled at
 *    runtime the first time each asset is seen.
 *  - OpenStreetMap tiles: cache-first in a separate, size-capped cache so
 *    previously visited map areas stay available offline ("offline map").
 */
const CACHE_NAME = 'site-reporter-v3';
const TILE_PREFIX = 'site-reporter-tiles-';
const TILE_CACHE = TILE_PREFIX + 'v1';
const TILE_CACHE_MAX = 600; // ~600 tiles ≈ 10-20 MB, keeps storage reasonable

/** Keep a cache bounded by dropping its oldest entries first. */
async function trimCache(cache, maxEntries) {
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    for (const key of keys.slice(0, keys.length - maxEntries)) {
      await cache.delete(key);
    }
  }
}

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME && !k.startsWith(TILE_PREFIX))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // OpenStreetMap tiles: cache-first so visited areas keep working offline.
  if (url.hostname === 'tile.openstreetmap.org') {
    event.respondWith(
      caches.open(TILE_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          // Leaflet loads tiles as no-cors images -> responses are opaque
          // (status 0), so accept those as well as normal 200s.
          if (response.ok || response.type === 'opaque') {
            await cache.put(request, response.clone());
            await trimCache(cache, TILE_CACHE_MAX);
          }
          return response;
        } catch {
          // offline and not cached -> let the tile slot stay empty
          return new Response('', { status: 408 });
        }
      })
    );
    return;
  }

  // API calls always hit the network; offline queuing lives in the app.
  if (url.pathname.startsWith('/api/')) return;

  // Same-origin pages: network-first, fall back to the cached shell offline.
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

  // Other same-origin GETs (hashed JS/CSS/images): cache-first.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      });
    })
  );
});
