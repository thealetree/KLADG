const CACHE_NAME = 'kladg-v1'

// Install: cache the app shell
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

// Activate: clean old caches and notify clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  )
})

// Fetch: network-first for HTML/JS/CSS, cache-first for art/music
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Cache-first for static assets (art, music)
  if (url.pathname.startsWith('/art/') || url.pathname.startsWith('/music/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // Network-first for everything else (HTML, JS, CSS)
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => caches.match(event.request))
  )
})

// Listen for skip-waiting message from the app
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting()
  }
})
