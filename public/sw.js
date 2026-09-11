// Ledger Service Worker v4 - Network-First for Navigation to prevent black-screen stale cache
const CACHE_NAME = 'ledger-cache-v4';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Purging stale cache:', key);
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip caching Supabase API & foreign auth calls
  if (url.hostname.includes('supabase.co') || url.pathname.startsWith('/rest/v1')) {
    return;
  }

  // 1. Navigation / HTML Requests: NETWORK FIRST (Fallback to cache only when offline)
  const isHtml = request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html');
  if (isHtml) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const fallback = await caches.match('/index.html');
          if (fallback) return fallback;
          return new Response('Offline - please reconnect', { status: 503, headers: { 'Content-Type': 'text/plain' } });
        })
    );
    return;
  }

  // 2. Static Assets (JS, CSS, Images, Fonts): Stale-While-Revalidate with error resilience
  if (url.pathname.startsWith('/assets/') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const copy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return networkResponse;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      })
    );
    return;
  }

  // 3. Default GET Handler
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// Push & Notification Click Handlers
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
