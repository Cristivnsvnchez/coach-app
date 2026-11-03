// Cache hors ligne de l'app. Incrémenter VERSION à chaque mise à jour pour forcer le rafraîchissement.
const VERSION = 'coach-v3';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/app.js', 'js/store.js', 'js/science.js', 'js/metrics.js', 'js/ui.js', 'js/i18n.js', 'js/icons.js', 'js/food.js', 'js/ai.js',
  'js/views/today.js', 'js/views/addfood.js', 'js/views/weight.js', 'js/views/training.js', 'js/views/coach.js', 'js/views/profile.js',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// App : réseau d'abord (mises à jour) avec délai max de 3 s, cache en secours. APIs externes : jamais mises en cache ici.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  const fromCache = () => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('index.html'));
  const network = fetch(e.request).then((r) => {
    if (!r.ok) throw new Error(r.status); // ne jamais remplacer une bonne copie par une erreur
    const copy = r.clone();
    caches.open(VERSION).then((c) => c.put(e.request, copy));
    return r;
  });
  const slow = new Promise((ok) => setTimeout(ok, 3000)).then(fromCache).then((r) => r || network);
  e.respondWith(Promise.race([network, slow]).catch(fromCache));
});
