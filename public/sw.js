const CACHE_VERSION = 'v1.0.0';
const STATIC_CACHE = `static-${CACHE_VERSION}`;

// Assets essenciais para experiência offline básica
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/og-image.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(CORE_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== STATIC_CACHE) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// Estratégias: navegação network-first com fallback, assets cache-first SWR
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Só tratar same-origin
  if (url.origin !== self.location.origin) return;

  // Navegação (HTML) - network-first, fallback para index em cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/index.html').then((cached) => cached || caches.match('/')))
    );
    return;
  }

  // Assets estáticos - cache-first com atualização em background (SWR)
  if (/\.(?:js|css|png|jpg|jpeg|gif|svg|webp|ico|woff2?)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((network) => {
            if (network && network.ok) {
              const copy = network.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            }
            return network;
          })
          .catch(() => cached || Response.error());
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Default - network-first com fallback para cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request))
  );
});