const cacheName = 'rc-cache';
const filesToCache = [
  location.pathname, // self
  '/rc',
  '/js/roland.js',
  '/lib/Tone.js',
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
  e.waitUntil(
    caches.open(cacheName)
      .then(cache => cache.addAll(filesToCache))
  )
})

self.addEventListener('activate', e => self.clients.claim())

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(
      response => response || fetch(e.request)
    )
  )
})