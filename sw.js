// Offline support: the whole game is cached on first visit.
// Bump CACHE when the list of files changes.
const CACHE = 'monkey-fist-v57';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './style.css?v=3', './input.js?v=2', './app.js?v=17', './game-engine.js?v=4', './generator-worker.js?v=6', './rope-art.js?v=3', './random.js?v=1', './levels.js?v=31', './mechanics.js?v=31', './twist-circuits.js?v=34', './twists.js?v=32', './music.js?v=32', './sounds.js?v=3', './audio.js?v=2', './hex/', './hex/index.html', './hex/engine.js?v=5', './hex/mirrors.js?v=4', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

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
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || (req.mode === 'navigate' ? caches.match(new URL(req.url).pathname.startsWith(new URL('./hex/', self.location).pathname) ? './hex/index.html' : './index.html') : Response.error())))
  );
});
