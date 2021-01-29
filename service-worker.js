// https://serviceworke.rs/strategy-cache-and-update_service-worker_doc.html
const CACHE = 'cache-and-update'
const filesToCache = [
  '/',
  '/rc',
  '/js/rc.js',
  '/js/roland.js',
  '/js/pianoteq.js',
  '/lib/Tone.js',
  '/font/Bravura.woff2',
  'https://cdn.jsdelivr.net/npm/vue/dist/vue.js',
  'https://cdn.jsdelivr.net/npm/vue-tippy/dist/vue-tippy.min.js',
  'https://cdn.jsdelivr.net/npm/@mdi/font@5.9.55/css/materialdesignicons.min.css',
  'https://stackpath.bootstrapcdn.com/bootstrap/4.5.0/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/popper.js@1.16.0/dist/umd/popper.min.js',
  'https://stackpath.bootstrapcdn.com/bootstrap/4.5.0/js/bootstrap.min.js',
  'https://cdn.jsdelivr.net/gh/gitbrent/bootstrap4-toggle@3.6.1/css/bootstrap4-toggle.min.css',
  'https://cdn.jsdelivr.net/gh/gitbrent/bootstrap4-toggle@3.6.1/js/bootstrap4-toggle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/bootstrap-slider/11.0.2/css/bootstrap-slider.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/bootstrap-slider/11.0.2/bootstrap-slider.min.js',
]
self.addEventListener('install', e => {
  e.waitUntil(precache())
})

self.addEventListener('activate', e => {
  return self.clients.claim()
})

self.addEventListener('fetch', e => {
  e.respondWith(fromCache(e.request))
  e.waitUntil(update(e.request.clone()))
})

function precache() {
  return caches.open(CACHE).then((cache) => 
    cache.addAll(filesToCache)
  )
}

function fromCache(request) {
  return caches.open(CACHE).then(cache =>
    cache.match(request).then(matching =>
      matching || fetch(request)
    )
  )
}

function update(request) {
  return caches.open(CACHE).then(cache =>
    fetch(request).then(response =>
      cache.put(request, response)
    )
  )
}