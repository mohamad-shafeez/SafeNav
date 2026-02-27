/* ==========================================================================
   SAFENAV PRO - HIGH-SPEED MAP CACHE ENGINE
   ========================================================================== */

const MAP_CACHE_NAME = 'safenav-map-cache-v1';

// Install event - take over immediately
self.addEventListener('install', (event) => {
    self.skipWaiting();
    console.log('⚡ SafeNav Service Worker Installed');
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// The Interceptor: Network-First, fallback to Cache, then Cache the new data
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // ONLY cache MapLibre/TomTom Tiles, Fonts, and OSRM Routes
    if (url.hostname.includes('api.tomtom.com') || 
        url.hostname.includes('project-osrm.org') ||
        url.hostname.includes('photon.komoot.io')) {
        
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                // 1. IF we have it in the cache, load it INSTANTLY (0ms latency)
                if (cachedResponse) {
                    return cachedResponse; 
                }

                // 2. IF NOT, fetch it from the internet
                return fetch(event.request).then((networkResponse) => {
                    // Safety check: only cache valid responses
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                        if(networkResponse.type === 'cors') { // Allow API caching
                            const responseToCache = networkResponse.clone();
                            caches.open(MAP_CACHE_NAME).then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                        }
                        return networkResponse;
                    }

                    // 3. Save it to the cache for next time
                    const responseToCache = networkResponse.clone();
                    caches.open(MAP_CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });

                    return networkResponse;
                }).catch(() => {
                    console.warn("Offline: Map tile could not be loaded.");
                });
            })
        );
    }
});