// Service worker : l'app et les règles restent disponibles hors ligne.
// Changer VERSION à chaque mise en ligne pour que les téléphones récupèrent la nouvelle version.
const VERSION = '0.3.0';
const CACHE = `superbebe-${VERSION}`;
const ASSETS = [
  './',
  'index.html',
  'style.css',
  'manifest.webmanifest',
  'js/main.js',
  'js/views.js',
  'js/data.js',
  'js/storage.js',
  'js/format.js',
  'js/icons.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  '../engine/engine.js',
  '../engine/adapter.js',
  '../rules/v0/rules.json',
  '../rules/v0/messages.fr.json',
  '../rules/v0/sources.json',
  '../widget/chargeur.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('superbebe-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Fichiers de l'app : réponse immédiate depuis le cache, mise à jour en arrière-plan.
// Météo et communes (autres domaines) : toujours le réseau, l'app gère elle-même son cache.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request, { ignoreSearch: true });
      const network = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached ?? network;
    }),
  );
});
