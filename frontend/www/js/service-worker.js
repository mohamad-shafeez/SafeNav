const CACHE_NAME = 'travelmate-v3';
const STATIC_ASSETS = [
  // Main pages
  '../tools.html',
  '../dashboard.html',
  '../login.html',
  '../signup.html',
  '../prediction.html',
  '../route.html',
  '../stays.html',
  
  // CSS
  '../css/tools.css',
  '../css/style.css',
  
  // JS
  './tools.js',
  './dashboard.js',
  './auth.js',
  './prediction.js',
  './route.js',
  './stays.js',
  './navbar.js',
  './voice.alerts.js',
  './firebase.js',
  
  // Manifest
  '../manifest.json',
  
  // External resources
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Inter:wght@400;500;600&display=swap'
];

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching core assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  
  return self.clients.claim();
});

// Fetch event - Simple Cache First strategy
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Return cached version if available
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Otherwise fetch from network
        return fetch(event.request)
          .then(response => {
            // Cache successful responses
            if (response.ok) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, responseToCache));
            }
            return response;
          })
          .catch(() => {
            // For HTML requests, fallback to main app page
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('../tools.html');
            }
            
            // For other file types, return empty response or error
            if (event.request.url.includes('.css')) {
              return new Response('/* Offline - styles not available */', {
                headers: { 'Content-Type': 'text/css' }
              });
            }
            
            if (event.request.url.includes('.js')) {
              return new Response('console.log("Offline - script not available");', {
                headers: { 'Content-Type': 'application/javascript' }
              });
            }
            
            // Generic offline response
            return new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// Background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncOfflineData());
  }
});

async function syncOfflineData() {
  // Your sync logic here
  console.log('Syncing offline data...');
}

// Push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: 'Travel Assistant is ready!',
    icon: '../img/icon-192.png',
    badge: '../img/icon-96.png',
    vibrate: [200, 100, 200]
  };
  
  event.waitUntil(
    self.registration.showNotification('TravelMate', options)
  );
});