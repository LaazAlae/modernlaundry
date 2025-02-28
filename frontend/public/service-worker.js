const CACHE_NAME = 'laundry-app-v3'; // Incremented version
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  '/laundry.ico',
  '/laundry.png',
  'https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.19/tailwind.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@700&display=swap'
];

// Shell assets to prioritize for instant loading
const SHELL_ASSETS = ['/', '/index.html', '/styles.css'];

const API_ENDPOINTS = [
  '/api/machines'
];

// Install Service Worker - With prioritized shell caching
self.addEventListener('install', (event) => {
  // Use waitUntil to tell the browser that installation is not complete
  // until the specified promise is resolved.
  event.waitUntil(
    // First, cache shell assets for immediate loading
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching shell assets');
      return cache.addAll(SHELL_ASSETS)
        .then(() => {
          // Then cache remaining assets
          console.log('Caching remaining assets');
          return cache.addAll(
            ASSETS_TO_CACHE.filter(asset => !SHELL_ASSETS.includes(asset))
          );
        });
    })
    .then(() => {
      // Force new service worker to take over immediately
      return self.skipWaiting();
    })
  );
});

// Activate and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

// Improved fetch strategy - Cache-first for static assets, Network-first for dynamic content
self.addEventListener('fetch', (event) => {
  // For API endpoints, use stale-while-revalidate
  if (API_ENDPOINTS.some(endpoint => event.request.url.includes(endpoint))) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return fetch(event.request)
          .then(networkResponse => {
            // Cache the fresh response
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          })
          .catch(() => {
            // Return cached version if network fails
            return caches.match(event.request);
          });
      })
    );
    return;
  }
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.includes('cdnjs.cloudflare.com') && 
      !event.request.url.includes('fonts.googleapis.com')) {
    return;
  }
  
  // Check if the request is for a static asset
  const isStaticAsset = ASSETS_TO_CACHE.some(asset => 
    event.request.url.includes(asset) || 
    event.request.url.endsWith('.css') || 
    event.request.url.endsWith('.js') ||
    event.request.url.endsWith('.png') ||
    event.request.url.endsWith('.ico') ||
    event.request.url.endsWith('.json')
  );
  
  if (isStaticAsset) {
    // Cache-first strategy for static assets
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            // Return cached response immediately
            return cachedResponse;
          }
          
          // If not in cache, fetch from network and cache
          return fetch(event.request)
            .then(response => {
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              
              // Clone response for caching
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
                
              return response;
            });
        })
    );
  } else {
    // Network-first strategy for API/dynamic content
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (!response || response.status !== 200) {
            return response;
          }
          
          // Clone response for caching
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
            
          return response;
        })
        .catch(() => {
          // If network fails, try the cache
          return caches.match(event.request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // If nothing in cache either, return offline fallback
              if (event.request.headers.get('accept').includes('text/html')) {
                return caches.match('/index.html');
              }
              // For other types of requests with no fallback
              return new Response('Network error occurred', {
                status: 408,
                headers: { 'Content-Type': 'text/plain' }
              });
            });
        })
    );
  }
});

// Handle periodic sync for background updates (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-laundry-status') {
    event.waitUntil(updateLaundryStatus());
  }
});

// Function to update laundry status in the background
async function updateLaundryStatus() {
  try {
    const response = await fetch('/api/machines');
    if (response.ok) {
      const data = await response.json();
      const cache = await caches.open(CACHE_NAME);
      await cache.put('/api/machines', new Response(JSON.stringify(data)));
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}