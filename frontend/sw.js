// ==========================================
// ⚡ SAFENAV SERVICE WORKER (OFFLINE ENGINE)
// ==========================================

const CACHE_NAME = 'safenav-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/route-core.js',
  '/js/route-premium.js',
  '/js/ai-copilot.js',
  '/js/translations.js',
  '/js/navbar.js',
  '/manifest.json'
];

// 1. INSTALL: Cache Core Files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. FETCH: Serve from Cache if Offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached file OR fetch from internet
      return response || fetch(event.request);
    })
  );
});

// 3. ACTIVATE: Cleanup Old Caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }));
    })
  );
});