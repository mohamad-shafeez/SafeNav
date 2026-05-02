// ==========================================
// SAFENAV | PRO-GRADE SERVICE WORKER
// ==========================================

const CACHE_NAME = 'safenav-v4'; // Incremented version
const STATIC_ASSETS = [
    // Main pages (Adjusted paths for root-level SW)
    './tools.html',
    './dashboard.html',
    './login.html',
    './signup.html',
    './prediction.html',
    './route.html',
    './stays.html',
    './planner.html',
    './admin.html',
    
    // CSS
    './css/tools.css',
    './css/style.css',
    './css/planner.css',
    './css/navbar.css',
    
    // JS
    './js/tools.js',
    './js/dashboard.js',
    './js/auth.js',
    './js/prediction.js',
    './js/route-core.js',
    './js/stays.js',
    './js/navbar.js',
    './js/planner.js',
    './js/firebase.js',
    
    // Manifest & Icons
    './manifest.json',
    './assets/icon-192.png'
];

// ─── INSTALL: CACHE CORE ASSETS ───
self.addEventListener('install', (event) => {
    console.log('🛡️ [SafeNav SW] Installing & Caching Assets...');
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(STATIC_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

// ─── ACTIVATE: CLEAN OLD CACHES ───
self.addEventListener('activate', (event) => {
    console.log('🛡️ [SafeNav SW] Activated. Purging ghost caches...');
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== CACHE_NAME) return caches.delete(key);
                })
            );
        })
    );
    return self.clients.claim();
});

// ─── FETCH: THE BULLETPROOF ENGINE ───
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // 🛑 1. CRITICAL BYPASS: Do not touch these domains/paths
    // We let the browser handle AI, Firebase, and Google Tracking normally.
    if (
        url.pathname.includes('/api/') || 
        url.hostname.includes('googleapis.com') || 
        url.hostname.includes('firebase.com') ||
        url.hostname.includes('google.com') ||
        url.hostname.includes('localhost') // Skip caching local dev server API
    ) {
        return; 
    }

    // 🛑 2. Skip non-GET requests (Firebase Auth uses POST/PUT)
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then(networkResponse => {
                // If it's a valid local file, save a copy to the cache
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            })
            .catch(async () => {
                // 🛑 3. OFFLINE FALLBACK LOGIC
                const cachedResponse = await caches.match(event.request);
                if (cachedResponse) return cachedResponse;

                // If it's an image, return our "Shield" SVG instead of crashing
                if (event.request.destination === 'image') {
                    return new Response(
                        '<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0d1526"/><text x="50%" y="50%" font-family="Arial" font-size="10" fill="#4a6080" dominant-baseline="middle" text-anchor="middle">Offline</text></svg>',
                        { headers: { 'Content-Type': 'image/svg+xml' } }
                    );
                }

                // If it's a page (HTML), send them to the tools page
                if (event.request.headers.get('accept').includes('text/html')) {
                    return caches.match('./tools.html');
                }

                // Never return undefined; always return a valid Error Response
                return new Response('Offline Content Unavailable', { status: 503 });
            })
    );
});

// ─── SYNC & PUSH ───
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-data') {
        console.log('🛡️ [SafeNav SW] Background Sync Triggered');
    }
});

self.addEventListener('push', (event) => {
    const options = {
        body: event.data ? event.data.text() : 'SafeNav Alert Update',
        icon: './assets/icon-192.png',
        badge: './assets/icon-192.png',
        vibrate: [100, 50, 100],
        data: { dateOfArrival: Date.now() }
    };
    event.waitUntil(
        self.registration.showNotification('SafeNav Intelligence', options)
    );
});