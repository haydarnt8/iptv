// Service worker: an offline page and a cache for the app's own build files. Nothing else.
// Never cached: the API and streams (live data from the provider, often huge), page HTML
// (always fetched fresh so the app is never stale), and other sites' images.
// Bump VERSION when this file changes to drop old caches.
const VERSION = 'v1'
const CACHE = `iptv-${VERSION}`
const OFFLINE_URL = '/offline.html'
const PRECACHE = [OFFLINE_URL, '/icons/icon.svg']

// Production build files have a content hash in the name (e.g. /_nuxt/BXsT8m2r.js), so a
// cached copy can never be out of date. Dev-server paths don't match this pattern.
const HASHED_ASSET = /^\/_nuxt\/[\w-]{8,}\.(?:js|css|woff2?|png|svg|webp)$/

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('iptv-') && key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  if (PRECACHE.includes(url.pathname)) {
    event.respondWith(caches.match(request).then(cached => cached ?? fetch(request)))
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)))
    return
  }

  if (HASHED_ASSET.test(url.pathname)) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(request)
        if (cached) return cached
        const response = await fetch(request)
        if (response.ok) cache.put(request, response.clone())
        return response
      })
    )
  }
})
