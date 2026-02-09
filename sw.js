const CACHE_NAME = 'minesweeper-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/i18n.js',
  '/js/locales/ko.json',
  '/js/locales/en.json',
  '/js/locales/ja.json',
  '/js/locales/zh.json',
  '/js/locales/es.json',
  '/js/locales/pt.json',
  '/js/locales/id.json',
  '/js/locales/tr.json',
  '/js/locales/de.json',
  '/js/locales/fr.json',
  '/js/locales/hi.json',
  '/js/locales/ru.json',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg'
];

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(URLS_TO_CACHE.map(url => new Request(url, { cache: 'reload' })))
          .catch(err => {
            console.warn('Cache addAll error:', err);
            // Continue without throwing
            return Promise.resolve();
          });
      })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip analytics and ads
  if (
    event.request.url.includes('google-analytics') ||
    event.request.url.includes('googletagmanager') ||
    event.request.url.includes('adsbygoogle') ||
    event.request.url.includes('pagead')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version
        if (response) {
          return response;
        }

        // Or fetch from network
        return fetch(event.request).then(response => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });

          return response;
        }).catch(() => {
          // Return offline page or cached resource
          return caches.match(event.request).then(response => {
            return response || new Response('Offline - cached version not available', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
        });
      })
  );
});
