// Offline support: the whole game is cached on first visit.
// Bump CACHE when the list of files changes.
const CACHE = 'monkey-fist-v33';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './levels.js?v=30', './sets.js?v=30', './mechanics.js?v=30', './twist-circuits.js?v=30', './twists.js?v=30', './mechanics-render.js?v=30', './music.js?v=30', './sounds.js?v=1', './hex/', './hex/index.html', './hex/engine.js?v=2', './hex/app.js?v=4', './hex/style.css?v=3', './hex/generator-worker.js?v=1', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

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
