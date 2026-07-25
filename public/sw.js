// Kill-switch service worker.
//
// An earlier Decro SW used cache-first for HTML and /_next/static hashed
// chunks. After the identity/RPC hardening deploy that served stale bundles
// that still called revoked Supabase RPCs with the anon key.
//
// Any client that still has the old SW registered will fetch this file (same
// URL), activate it, wipe every Cache Storage entry, and unregister. Layout
// no longer re-registers a worker.

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.map((key) => caches.delete(key)))
      await self.registration.unregister()
      const clients = await self.clients.matchAll({ type: 'window' })
      for (const client of clients) {
        // Force a reload so the page picks up current HTML/JS from the network.
        client.navigate(client.url)
      }
    })()
  )
})

// Do not intercept fetches while we tear ourselves down.
self.addEventListener('fetch', () => {})
