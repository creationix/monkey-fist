// Offline support: the whole game is cached on first visit.
// Bump CACHE when the list of files changes.
const CACHE = 'monkey-fist-v84';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './style.css?v=9', './input.js?v=3', './app.js?v=41', './difficulty.js?v=1', './journey.js?v=1', './dependency-metrics.js?v=1', './grid-generator.js?v=5', './grid-journey.js?v=6', './game-engine.js?v=14', './generator-worker.js?v=17', './rope-art.js?v=9', './random.js?v=1', './levels.js?v=35', './mechanics.js?v=31', './twist-circuits.js?v=39', './twists.js?v=33', './music.js?v=32', './sounds.js?v=8', './audio.js?v=2', './hex/', './hex/index.html', './hex/engine.js?v=10', './hex/mirrors.js?v=9', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(url => new Request(url, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('monkey-fist-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
// Try the network so updates arrive; fall back to the cache when offline.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        // A temporary server outage should use the same cached assets as an
        // offline connection. Preserve real 4xx responses and uncached errors.
        if (res.status >= 500) return caches.match(req, { ignoreSearch: true }).then(hit => hit || res);
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || (req.mode === 'navigate' ? caches.match(new URL(req.url).pathname.startsWith(new URL('./hex/', self.location).pathname) ? './hex/index.html' : './index.html') : Response.error())))
  );
});
