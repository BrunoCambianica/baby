// Service worker : l'app et les règles restent disponibles hors ligne, et le rappel du soir (Web Push) est calculé ici.
// Changer VERSION à chaque mise en ligne pour que les téléphones récupèrent la nouvelle version.
// sw-moteur.js (généré par tools/build-widget.js) : le moteur et les règles, pour calculer le rappel sans l'app.
importScripts('sw-moteur.js');
const VERSION = '0.16.2';
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
  'js/household.js',
  'js/fiche.js',
  'js/famille.js',
  'js/format.js',
  'js/icons.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  '../engine/engine.js',
  '../engine/adapter.js',
  '../engine/drawings.js',
  '../rules/v0/rules.json',
  '../rules/v0/messages.fr.json',
  '../rules/v0/sources.json',
  '../widget/chargeur.js',
];

// Fichiers de la nouvelle version demandés au réseau, pas au cache HTTP du navigateur : sinon un fichier encore
// frais de la version précédente pourrait se mêler aux nouveaux.
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE)
    .then((cache) => cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
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
// dist/ (APK Android et sa version publiée) : toujours le réseau, pour ne jamais annoncer une version dépassée.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.includes('/dist/')) return;
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

// Rappel du soir : l'API n'envoie qu'une notification vide à l'heure choisie ; le téléphone calcule la tenue et le sac
// de demain de chaque enfant, et la nuit, avec le foyer et la météo que l'app a laissés (donnees.json), ou la météo
// du moment s'il y a du réseau. Une notification est toujours affichée, comme l'exige Safari.
self.addEventListener('push', (event) => {
  event.waitUntil(eveningReminder());
});

async function eveningReminder() {
  const title = render(SB_RULES.messages, 'evening.reminder', 'short');
  let body = 'Ouvrez Superbébé pour la tenue de demain et la nuit.';
  try {
    const cached = await (await caches.open('superbebe-donnees')).match('donnees.json');
    const data = cached ? await cached.json() : null;
    const h = data?.household;
    let forecast = data?.forecast ?? null;
    if (h) {
      try {
        const res = await fetch(forecastUrl(h.commune));
        if (res.ok) forecast = await res.json();
      } catch (e) {
        // Sans réseau : la dernière météo de l'app.
      }
    }
    if (h && forecast) {
      const { date, time } = parisNow();
      const lines = h.children.map((child, k) => {
        const fresh = child.room && Date.now() - child.room.at < 16 * 3600 * 1000;
        const profile = {
          birth: child.birth, transport: child.transport, outing_window: h.outing_window, outing_duration_h: h.outing_duration_h,
          outfit_offset: child.outfit_offset ?? 0, day_style: child.day_style ?? null, night_options: child.night_options ?? {},
          room_temp_c: fresh ? child.room.value : null, inventory: child.inventory ?? {},
        };
        const view = widgetView({ forecast, profile, date, time, lat: h.commune.lat }, SB_RULES, { drawings: false, reminder: true });
        return view.reminder && `${h.children.length > 1 ? `${child.name || `Enfant ${k + 1}`} : ` : ''}${view.reminder}`;
      }).filter(Boolean);
      if (lines.length) body = lines.join('\n');
    }
  } catch (e) {
    // Calcul impossible : la notification générique suffit.
  }
  await self.registration.showNotification(title, { body, tag: 'superbebe-rappel', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png' });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windows) => (windows[0] ? windows[0].focus() : self.clients.openWindow('./'))),
  );
});
