// Minimal service worker — exists primarily to satisfy PWA installability criteria.
// Network-first: the app requires connectivity to work, so no aggressive caching.
const CACHE = 'comparecart-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip cross-origin requests and chrome-extension resources
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Network-first for all requests
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
