const CACHE = 'rc-cache';
const filesToCache = [
  location.pathname, // self
  '/rc',
  '/js/rc.js',
  '/js/roland.js',
  '/js/pianoteq.js',
  '/lib/Tone.js',
  'https://cdn.jsdelivr.net/npm/vue/dist/vue.js',
  'https://cdnjs.cloudflare.com/ajax/libs/MaterialDesign-Webfont/5.2.45/css/materialdesignicons.min.css',
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
  e.waitUntil(update(e.request))
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