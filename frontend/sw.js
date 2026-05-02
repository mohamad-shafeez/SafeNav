// ==========================================
// SAFENAV PROGRESSIVE WEB APP (PWA) CORE
// ⚡ Upgraded: Zero-Latency Engine
// ==========================================

const CACHE_NAME = 'safenav-core-v1.2'; 

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
  'assets/icon-192.png',

  // 🎨 Stylesheets
  'css/auth.css',
  'css/dashboard.css',
  'css/package.css',
  'css/planner.css',
  'css/route.css',
  'css/style.css',
  'css/tools.css',
  'css/vault.css',

  // 🧠 Logic Scripts
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
      console.log('[SafeNav SW] 📦 Caching App Shell...');
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
            console.log('[SafeNav SW] 🧹 Clearing Old Cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim(); // Take control of all open pages immediately
});

// 3. FETCH EVENT: Stale-While-Revalidate Strategy (ZERO LATENCY)
self.addEventListener('fetch', (event) => {
  // 🚫 DO NOT CACHE API CALLS, EXTERNAL MAPS, OR LIVE WEATHER
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('nominatim.openstreetmap.org') ||
      event.request.url.includes('rainviewer.com') ||        // 🔥 NEW: Ignore Weather Radar
      event.request.url.includes('openweathermap.org') ||    // 🔥 NEW: Ignore Weather Tiles
      event.request.url.includes('firebase') ||
      event.request.url.includes('firestore.googleapis.com') || 
      event.request.url.includes('apis.google.com') ||
      event.request.url.includes('identitytoolkit.googleapis.com') ||
      event.request.method !== 'GET') {
      return; // Let the browser handle these normally
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      
      // ⚡ 1. THE SPEED TRICK: If it's in the cache, return it IMMEDIATELY!
      if (cachedResponse) {
          // 🔄 Background Update: Fetch a fresh copy silently
          fetch(event.request).then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                  const responseToCache = networkResponse.clone();
                  caches.open(CACHE_NAME).then((cache) => {
                      cache.put(event.request, responseToCache);
                  });
              }
          }).catch(() => { /* Ignore background network errors */ });
          
          return cachedResponse; // Instant 0ms load!
      }

      // 🌐 2. If it's NOT in the cache yet, go to the network
      return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, responseToCache);
              });
          }
          return networkResponse;
      }).catch(() => {
          // 🛑 3. Offline Fallback (THE FIX)
          console.log('[SafeNav SW] 🛑 User is offline or resource missing:', event.request.url);
          
          if (event.request.mode === 'navigate') {
              return caches.match('404.html');
          }
          
          
          return Response.error(); 
      });
    })
  );
});