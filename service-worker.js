// https://serviceworke.rs/strategy-cache-and-update_service-worker_doc.html
const CACHE = 'cache-and-update'

const solidFiles = [ // these will not ever change
  '/audio/salamander/A0.mp3',
  '/audio/salamander/A1.mp3',
  '/audio/salamander/A2.mp3',
  '/audio/salamander/A3.mp3',
  '/audio/salamander/A4.mp3',
  '/audio/salamander/A5.mp3',
  '/audio/salamander/A6.mp3',
  '/audio/salamander/A7.mp3',
  '/audio/salamander/C1.mp3',
  '/audio/salamander/C2.mp3',
  '/audio/salamander/C3.mp3',
  '/audio/salamander/C4.mp3',
  '/audio/salamander/C5.mp3',
  '/audio/salamander/C6.mp3',
  '/audio/salamander/C7.mp3',
  '/audio/salamander/C8.mp3',
  '/audio/salamander/Ds1.mp3',
  '/audio/salamander/Ds2.mp3',
  '/audio/salamander/Ds3.mp3',
  '/audio/salamander/Ds4.mp3',
  '/audio/salamander/Ds5.mp3',
  '/audio/salamander/Ds6.mp3',
  '/audio/salamander/Ds7.mp3',
  '/audio/salamander/Fs1.mp3',
  '/audio/salamander/Fs2.mp3',
  '/audio/salamander/Fs3.mp3',
  '/audio/salamander/Fs4.mp3',
  '/audio/salamander/Fs5.mp3',
  '/audio/salamander/Fs6.mp3',
  '/audio/salamander/Fs7.mp3',
  '/font/Bravura.woff2',
  'https://cdn.jsdelivr.net/npm/vue/dist/vue.js',
  'https://cdn.jsdelivr.net/npm/vue-tippy/dist/vue-tippy.min.js',
  'https://cdn.jsdelivr.net/npm/@mdi/font@5.9.55/css/materialdesignicons.min.css',
  'https://cdn.jsdelivr.net/npm/@mdi/font@5.9.55/fonts/materialdesignicons-webfont.woff?v=5.9.55',
  'https://cdn.jsdelivr.net/npm/@mdi/font@5.9.55/fonts/materialdesignicons-webfont.ttf?v=5.9.55',
  'https://stackpath.bootstrapcdn.com/bootstrap/4.5.0/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/popper.js@1.16.0/dist/umd/popper.min.js',
  'https://stackpath.bootstrapcdn.com/bootstrap/4.5.0/js/bootstrap.min.js',
  'https://cdn.jsdelivr.net/gh/gitbrent/bootstrap4-toggle@3.6.1/css/bootstrap4-toggle.min.css',
  'https://cdn.jsdelivr.net/gh/gitbrent/bootstrap4-toggle@3.6.1/js/bootstrap4-toggle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/tone/14.7.77/Tone.js',
  'https://cdnjs.cloudflare.com/ajax/libs/bootstrap-slider/11.0.2/css/bootstrap-slider.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/bootstrap-slider/11.0.2/bootstrap-slider.min.js',
  'https://code.iconify.design/1/1.0.6/iconify.min.js',
  'https://code.jquery.com/jquery-3.5.1.slim.min.js',
]
const filesToPrecache = [
  '/',
  '/css/main.css',
  '/js/main.js',
  '/js/vue/init.js',
  '/js/vue/networking.js',
  '/js/vue/instrument.js',
  '/js/vue/recorder.js',
  '/js/instrument.js',
  '/js/io.js',
  '/js/midi.js',
  '/js/ui.js',

  '/rc',
  '/js/rc.js',
  '/js/roland.js',
  '/js/pianoteq.js',
]
const filesToCache = [
  ...solidFiles,
  ...filesToPrecache,
]

self.addEventListener('install', e => {
  e.waitUntil(precache())
})

self.addEventListener('activate', e => {
  return self.clients.claim()
})

self.addEventListener('fetch', e => {
  e.respondWith(fromCache(e.request.clone()))
  if (!solidFiles.some(path => e.request.url.endsWith(path))) { // update non-solid files in cache
    e.waitUntil(update(e.request))
  }
})

function precache() {
  return caches.open(CACHE).then((cache) => 
    cache.addAll(filesToPrecache)
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
  if (!filesToCache.some(path => request.url.endsWith(path))) {
    // do not update files which are not in the cache already
    return
  }
  if (!request.referrer) {
    // filter out request caused by manifets.json start_url (check of offline capability)
    return
  }
  return caches.open(CACHE).then(cache =>
    fetch(request)
      .then(response =>
        cache.put(request, response)
      )
      .catch(e => {
        console.warn(e, request)
      })
  )
}