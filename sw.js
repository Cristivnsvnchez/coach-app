// Cache hors ligne de l'app. Incrémenter VERSION à chaque mise à jour pour forcer le rafraîchissement.
const VERSION = 'trackme-v20';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest',
  'css/app.css', 'css/trackme.css', 'css/motion.css', 'css/onboarding.css', 'css/today.css', 'css/cycle.css', 'css/learn.css',
  'js/app.js', 'js/store.js', 'js/net.js', 'js/theme.js', 'js/science.js', 'js/metrics.js', 'js/ui.js', 'js/motion.js', 'js/i18n.js', 'js/i18n/nl-base.js', 'js/i18n/extra.js', 'js/icons.js',
  'js/habits.js', 'js/workout.js', 'js/exercises.js', 'js/technique.js', 'js/planner.js', 'js/food.js', 'js/foods-base.js', 'js/foodgroups.js', 'js/install.js', 'js/viewer3d.js', 'js/ai.js', 'js/cycle.js',
  'js/views/today.js', 'js/views/addfood.js', 'js/views/weight.js', 'js/views/training.js', 'js/views/coach.js', 'js/views/profile.js', 'js/views/habits.js',
  'js/views/session.js', 'js/views/exsheets.js', 'js/views/program.js', 'js/views/onboarding.js', 'js/views/palette.js', 'js/views/cycle.js',
  'js/views/learn.js',
  'vendor/fonts/Geist-Variable.woff2', 'vendor/fonts/FunnelDisplay-Variable.woff2', 'vendor/three/three.module.min.js', 'vendor/three/GLTFLoader.js', 'vendor/three/OrbitControls.js', 'vendor/three/BufferGeometryUtils.js', 'vendor/three/SkeletonUtils.js', 'models/trackme-human.glb', 'img/ex/squat-1.webp', 'img/ex/squat-2.webp', 'icons/icon-180.png', 'icons/icon-192.png',
];

self.addEventListener('install', (e) => {
  // cache: 'reload' : on ignore le cache HTTP du navigateur pour ne jamais figer une ancienne version.
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// App : réseau d'abord (mises à jour) avec délai max de 3 s, cache en secours. APIs externes : jamais mises en cache ici.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  const fromCache = () => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('index.html'));
  const network = fetch(e.request, { cache: 'no-cache' }).then((r) => { // revalide auprès du serveur
    if (!r.ok) throw new Error(r.status); // ne jamais remplacer une bonne copie par une erreur
    const copy = r.clone();
    caches.open(VERSION).then((c) => c.put(e.request, copy));
    return r;
  });
  const slow = new Promise((ok) => setTimeout(ok, 3000)).then(fromCache).then((r) => r || network);
  e.respondWith(Promise.race([network, slow]).catch(fromCache));
});
