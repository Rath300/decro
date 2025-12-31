// Service Worker for Decro - Local-First Architecture
const CACHE_NAME = 'decro-v2'
const STATIC_CACHE = 'decro-static-v2'
const API_CACHE = 'decro-api-v2'

// Static assets to cache
const STATIC_ASSETS = [
  '/',
  '/feed',
  '/spotlight',
  '/subgroup',
  '/profile',
  '/create',
  '/manifest.json'
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE && cacheName !== API_CACHE) {
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

// Fetch event - implement cache-first strategy
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Never intercept Supabase requests; let them hit the network with auth headers
  if (url.origin.includes('supabase.co')) {
    return
  }

  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    // API requests - network first, cache fallback
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache successful API responses
          if (response.ok && response.status === 200) {
            const responseClone = response.clone()
            caches.open(API_CACHE).then(cache => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
        .catch(() => {
          // Return cached version if network fails
          return caches.match(request)
        })
    )
  } else if (url.pathname.startsWith('/_next/static/')) {
    // Static assets - cache first
    event.respondWith(
      caches.match(request)
        .then(response => {
          if (response) {
            return response
          }
          return fetch(request).then(response => {
            // Avoid caching partial content (206) which breaks Cache.put
            if (response.ok && response.status === 200) {
              const responseClone = response.clone()
              caches.open(STATIC_CACHE).then(cache => {
                try { cache.put(request, responseClone) } catch {}
              })
            }
            return response
          }).catch(() => fetch(request))
        })
    )
  } else {
    // Page and asset requests - cache first, network fallback
    event.respondWith(
      caches.match(request)
        .then(response => {
          if (response) {
            return response
          }
          return fetch(request).then(response => {
            if (response.ok && response.status === 200) {
              const responseClone = response.clone()
              // Only cache http/https requests, not chrome-extension or other schemes
              if (request.url.startsWith('http')) {
                caches.open(CACHE_NAME).then(cache => {
                  try { cache.put(request, responseClone) } catch {}
                })
              }
            }
            return response
          }).catch(() => fetch(request))
        })
    )
  }
})

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // This will be handled by the main app's background sync
      console.log('Background sync triggered')
    )
  }
})

// Push notifications (for future features)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: 'decro-notification'
    }
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    )
  }
})
