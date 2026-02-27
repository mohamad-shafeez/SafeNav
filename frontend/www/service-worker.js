// ==========================================
// SAFENAV PROGRESSIVE WEB APP (PWA) CORE
// ==========================================

const CACHE_NAME = 'safenav-core-v1';

// 📦 The App Shell: Every file needed to run the UI offline
// 📦 The App Shell: Every file needed to run the UI offline
const ASSETS_TO_CACHE = [
  'index.html',
  '404.html',
  'dashboard.html',
  'documents.html',
  'login.html',
  'navbar.html',
  'package.html',
  'planner.html',
  'prediction.html',
  'route.html',
  'signup.html',
  'stays.html',
  'tools.html',
  'manifest.json',
  'assets/icon-192.png', // Added this so it stops erroring!

  // 🎨 Stylesheets (Removed leading slashes)
  'css/auth.css',
  'css/dashboard.css',
  'css/package.css',
  'css/planner.css',
  'css/route.css',
  'css/style.css',
  'css/tools.css',
  'css/vault.css',

  // 🧠 Logic Scripts (Removed leading slashes)
  'js/auth.js',
  'js/dashboard.js',
  'js/firebase.js',
  'js/navbar.js',
  'js/package.js',
  'js/planner.js',
  'js/prediction.js',
  'js/route-core.js',
  'js/route-premium.js',
  'js/stays.js',
  'js/tools.js',
  'js/translation.js',
  'js/vault.js',
  'js/voice-alerts.js'
];

// 1. INSTALL EVENT: Pre-cache all essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SafeNav SW] Caching App Shell...');
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch(err => console.error('[SafeNav SW] Cache failed:', err))
  );
  self.skipWaiting(); // Force the waiting service worker to become the active service worker
});

// 2. ACTIVATE EVENT: Clean up old caches when we update the app
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SafeNav SW] Clearing Old Cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim(); // Take control of all open pages immediately
});

// 3. FETCH EVENT: Network-first, fallback to cache strategy
self.addEventListener('fetch', (event) => {
  // 🚫 DO NOT CACHE API CALLS OR EXTERNAL MAPS
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('nominatim.openstreetmap.org') ||
      event.request.url.includes('firebase')) {
      return; 
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // If network is successful, clone the response and update the cache dynamically
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
            });
        }
        return networkResponse;
      })
      .catch(() => {
        // If network fails (offline), serve from cache
        console.log('[SafeNav SW] User is offline. Serving from cache:', event.request.url);
        return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            // If they are offline AND the page isn't cached, send them to the 404 page
            if (event.request.mode === 'navigate') {
                return caches.match('/404.html');
            }
        });
      })
  );
});