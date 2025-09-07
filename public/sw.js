// Service Worker for Trek.IQ
const CACHE_NAME = 'trek-iq-v1';
const STATIC_CACHE = 'trek-iq-static-v1';
const DYNAMIC_CACHE = 'trek-iq-dynamic-v1';

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/index.html',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/favicon.ico'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Service Worker installed');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker install failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle different types of requests
  if (url.pathname.startsWith('/static/')) {
    // Static assets - cache first, then network
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (url.pathname.startsWith('/api/')) {
    // API requests - network first, then cache
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
  } else if (url.pathname.includes('mapbox')) {
    // Map tiles - cache first, then network
    event.respondWith(cacheFirst(request, DYNAMIC_CACHE));
  } else {
    // Other requests - network first, then cache
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
  }
});

// Cache first strategy
async function cacheFirst(request, cacheName) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Cache first strategy failed:', error);
    return new Response('Offline content not available', { status: 503 });
  }
}

// Network first strategy
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache:', error);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page for navigation requests
    if (request.destination === 'document') {
      return caches.match('/offline.html');
    }

    return new Response('Offline content not available', { status: 503 });
  }
}

// Background sync for offline data
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-barriers') {
    event.waitUntil(syncBarriers());
  } else if (event.tag === 'sync-routes') {
    event.waitUntil(syncRoutes());
  }
});

// Sync barriers to server
async function syncBarriers() {
  try {
    const db = await openDB();
    const barriers = await db.getAll('syncQueue', 'barrier');
    
    for (const barrier of barriers) {
      try {
        const response = await fetch('/api/barriers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(barrier.data.barrier)
        });

        if (response.ok) {
          await db.delete('syncQueue', barrier.id);
          console.log('Barrier synced successfully:', barrier.id);
        }
      } catch (error) {
        console.error('Failed to sync barrier:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Sync routes to server
async function syncRoutes() {
  try {
    const db = await openDB();
    const routes = await db.getAll('syncQueue', 'route');
    
    for (const route of routes) {
      try {
        const response = await fetch('/api/routes/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(route.data)
        });

        if (response.ok) {
          await db.delete('syncQueue', route.id);
          console.log('Route synced successfully:', route.id);
        }
      } catch (error) {
        console.error('Failed to sync route:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Open IndexedDB
async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('TrekIQOfflineDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// Push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  const options = {
    body: event.data ? event.data.text() : 'New notification from Trek.IQ',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Details',
        icon: '/favicon.ico'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/favicon.ico'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Trek.IQ', options)
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handling
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_ROUTE') {
    event.waitUntil(cacheRoute(event.data.route));
  }
  
  if (event.data && event.data.type === 'CACHE_BARRIER') {
    event.waitUntil(cacheBarrier(event.data.barrier));
  }
});

// Cache route data
async function cacheRoute(route) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    const response = new Response(JSON.stringify(route), {
      headers: { 'Content-Type': 'application/json' }
    });
    await cache.put(`/api/routes/${route.id}`, response);
    console.log('Route cached:', route.id);
  } catch (error) {
    console.error('Failed to cache route:', error);
  }
}

// Cache barrier data
async function cacheBarrier(barrier) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    const response = new Response(JSON.stringify(barrier), {
      headers: { 'Content-Type': 'application/json' }
    });
    await cache.put(`/api/barriers/${barrier.id}`, response);
    console.log('Barrier cached:', barrier.id);
  } catch (error) {
    console.error('Failed to cache barrier:', error);
  }
}

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  console.log('Periodic background sync:', event.tag);
  
  if (event.tag === 'update-weather') {
    event.waitUntil(updateWeatherData());
  }
});

// Update weather data
async function updateWeatherData() {
  try {
    const response = await fetch('/api/weather/halifax');
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.put('/api/weather/halifax', response.clone());
      console.log('Weather data updated');
    }
  } catch (error) {
    console.error('Failed to update weather data:', error);
  }
}

console.log('Service Worker loaded');
