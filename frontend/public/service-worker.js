const CACHE_NAME = 'laundry-app-v3'; // Incrementing version
const STATIC_CACHE = 'laundry-static-v3';
const DYNAMIC_CACHE = 'laundry-dynamic-v1';

// Critical resources to pre-cache immediately
const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  '/laundry.ico',
  '/laundry.png'
];

// Additional assets to cache but not necessarily critical for first paint
const ADDITIONAL_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.19/tailwind.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@700&display=swap'
];

// Install - cache critical assets immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching critical app assets');
        return cache.addAll(CRITICAL_ASSETS);
      })
      .then(() => self.skipWaiting()) // Immediately activate the new service worker
  );
});

// Activate - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete any cache that doesn't match our current versions
          if (
            cacheName !== STATIC_CACHE &&
            cacheName !== DYNAMIC_CACHE
          ) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activated');
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

// Fetch - improved caching strategy using Cache First for static assets, Network First for API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip cross-origin requests and non-GET requests
  if (event.request.method !== 'GET') return;
  
  // API requests (use Network First)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(event.request));
    return;
  }
  
  // For HTML documents, use Network First to ensure latest content
  if (event.request.headers.get('accept').includes('text/html')) {
    event.respondWith(networkFirstStrategy(event.request));
    return;
  }
  
  // For everything else, use Cache First for better performance
  event.respondWith(cacheFirstStrategy(event.request));
});

// Cache First Strategy (fast initial loads)
async function cacheFirstStrategy(request) {
  try {
    // Check the cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // If found in cache, return it
      return cachedResponse;
    }
    
    // If not in cache, fetch from network
    const networkResponse = await fetch(request);
    
    // Cache the response for future
    if (networkResponse.ok) {
      const clonedResponse = networkResponse.clone();
      caches.open(DYNAMIC_CACHE).then(cache => {
        cache.put(request, clonedResponse);
      });
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Cache first strategy failed:', error);
    // If both cache and network fail, return a fallback
    return caches.match('/index.html');
  }
}

// Network First Strategy (for API and HTML)
async function networkFirstStrategy(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Clone the response to cache it
    if (networkResponse.ok) {
      const clonedResponse = networkResponse.clone();
      caches.open(DYNAMIC_CACHE).then(cache => {
        cache.put(request, clonedResponse);
      });
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Network request failed, using cache:', error);
    
    // If network fails, try the cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If no cached response, return the fallback
    return caches.match('/index.html');
  }
}

// Cache the additional non-critical assets in the background
self.addEventListener('message', (event) => {
  if (event.data === 'CACHE_ADDITIONAL_ASSETS') {
    console.log('Caching additional assets in background');
    caches.open(STATIC_CACHE).then(cache => {
      cache.addAll(ADDITIONAL_ASSETS);
    });
  }
});