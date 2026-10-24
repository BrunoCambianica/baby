// Point d'entrée de l'app web Superbébé : état, actions, chargement des données et mises à jour.
import { addDays, ageMonths, clamp, displayMoment, evaluate, homeMoment, hourFr, render, toMin } from '../../engine/engine.js';
import { buildInput, decodeConfig, encodeConfig, householdToConfig, parisNow, profileToConfig } from '../../engine/adapter.js';
import { communeAt, getClimate, getForecast, loadBundle, loadText, searchCommunes } from './data.js';
import { ficheCanvas, ficheData, ficheText, encodeFiche } from './fiche.js';
import {
  api, apiBase, familyKeys, fromB64url, mergeHousehold, newSecret, seal, sharedPart, shortFicheLink, unseal,
} from './famille.js';
import { dayLong, dayShort } from './format.js';
import { ageLabel, fromConfig, fromShared, isNewer, migrate, newChild, profileOf } from './household.js';
import { store } from './storage.js';
import * as V from './views.js';

const ROOM_TTL_MS = 16 * 3600 * 1000;
const app = document.getElementById('app');

// Hôte natif éventuel : l'app Android Superbébé (pont JavaScript), ou Scriptable qui ouvre l'app depuis le widget iPhone.
const android = window.SuperbebeAndroid ?? null;
const host = android ? 'android' : new URLSearchParams(location.search).get('hote') === 'scriptable' ? 'scriptable' : null;
const standalone = Boolean(window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone);
const ask = (fn, fallback) => {
  try {
    return fn();
  } catch (e) {
    return fallback;
  }
};
// L'app Android gère plusieurs enfants à partir de la 0.6 ; avant, elle ne lit qu'une configuration v1.
function androidAtLeast(major, minor) {
  const m = ask(() => android.version(), '').match(/^(\d+)\.(\d+)/);
  return Boolean(m) && (Number(m[1]) > major || (Number(m[1]) === major && Number(m[2]) >= minor));
}
const androidMulti = host === 'android' && androidAtLeast(0, 6);
// Rappel du soir : app Android 0.8 et plus, ou widget iPhone (Scriptable) qui programme la notification ;
// sinon, avec l'API, par notification Web Push (sur iPhone, seulement pour l'app de l'écran d'accueil).
const reminderHost = host === 'scriptable' || (host === 'android' && androidAtLeast(0, 8));
const webPush = !reminderHost && !host && 'PushManager' in window && 'serviceWorker' in navigator && Boolean(apiBase())
  && (standalone || !/iPhone|iPad|iPod/i.test(navigator.userAgent));
const widgetKids = () => (androidMulti ? ask(() => JSON.parse(android.widgetChildren()), {}) : {});
// App Android 0.13 et plus : widget Maison, relevés du jour, relevés notés sur le widget repris par l'app.
const androidHome = host === 'android' && typeof android.readings === 'function' && typeof android.addHomeWidget === 'function';
const homeWidgets = () => (androidHome ? ask(() => android.homeWidgets(), 0) : 0);

// Foyer enregistré ; le profil à un seul enfant des versions précédentes devient le premier enfant.
function loadHousehold() {
  const raw = store.profile();
  const household = migrate(raw);
  if (household && raw.v !== 2) {
    store.saveProfile(household);
    store.adoptHidden(household.children[0].id);
  }
  return household;
}

const state = {
  bundle: null,
  sourcesById: new Map(),
  household: loadHousehold(),
  // Réglages de l'enfant affiché, complétés de ceux du foyer (voir refreshProfile).
  profile: null,
  // Profils reçus de l'autre parent (lien #partage=…), en attente de confirmation.
  received: null,
  forecast: null,
  climate: [],
  climateReady: false,
  loading: false,
  error: null,
  updatedAt: '',
  today: parisNow().date,
  tab: 'sortir',
  day: 'aujourdhui',
  draft: null,
  results: [],
  open: new Set(),
  installPrompt: null,
  loader: null,
  script: null,
  // Téléphone utilisé ; `platform` est l'onglet choisi dans l'assistant du widget.
  device: /Android/i.test(navigator.userAgent) ? 'android' : 'ios',
  platform: /Android/i.test(navigator.userAgent) ? 'android' : 'ios',
  host,
  // Onglet de navigateur sur téléphone : on propose d'ouvrir Superbébé comme une app, sans les barres du navigateur.
  inBrowser: !host && !standalone && /Android|iPhone|iPod/i.test(navigator.userAgent),
  // App ouverte depuis une icône d'écran d'accueil (installée depuis le navigateur) plutôt que dans un onglet.
  standalone,
  widgets: host === 'android' ? ask(() => android.widgets(), 0) : 0,
  androidHome,
  homeWidgets: homeWidgets(),
  // Version de l'app Android installée, et dernière version publiée (dist/android-version.json) : les réglages proposent
  // la mise à jour tant qu'elle n'est pas faite (l'app elle-même ne la propose qu'une fois par jour).
  androidVersion: host === 'android' ? ask(() => android.version(), '') : '',
  apkLatest: null,
  widgetKids: widgetKids(),
  reminder: store.reminder(),
  reminderHost,
  reminderState: reminderHost && host === 'android' ? ask(() => android.reminderState(), 'off') : null,
  webPush,
  // API Superbébé (VPS) : clé des notifications, famille partagée avec l'autre parent, famille à rejoindre (#famille=…).
  api: Boolean(apiBase()),
  apiInfo: null,
  family: store.family(),
  joining: null,
  steps: new Set(),
  androidLink: '',
  updateLink: '',
  promoHidden: store.promoHidden(),
  widgetReady: Boolean(store.widgetCopied()),
  confirmClear: false,
  updateReady: false,
};

function refreshProfile() {
  state.profile = state.household ? profileOf(state.household, store.currentChild()) : null;
}
refreshProfile();

const route = () => location.hash.replace('#', '');

function currentView() {
  if (state.joining) return 'recevoir';
  if (!state.household) return state.received || route() === 'recevoir' ? 'recevoir' : 'onboarding';
  const r = route();
  if (r.startsWith('enfant/')) return 'enfant';
  if (r === 'reglages/commune') return 'reglages';
  if (['reglages', 'widget', 'apropos', 'recevoir'].includes(r)) return r;
  return state.received ? 'recevoir' : 'app';
}

// Relevé encore valable (16 heures) : `nuit`, la chambre ; `jour`, la pièce où il passe la journée.
const freshRoom = (profile, kind = 'nuit') => {
  const reading = kind === 'jour' ? profile.room_day : profile.room;
  return reading && Date.now() - reading.at < ROOM_TTL_MS ? reading.value : null;
};
// Le widget Maison ouvre la pièce du moment : le jour, la carte « Dedans » de l'onglet Journée ; le soir, l'onglet Nuit.
const homeTab = () => (homeMoment(parisNow().time) === 'nuit' ? 'nuit' : 'sortir');
const clock = (ms) => new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })
  .format(new Date(ms)).replace(':', ' h ');

// Les onglets Nuit et Achats parlent toujours d'aujourd'hui ; « Demain » ne concerne que l'onglet Journée.
function compute(day) {
  if (!state.forecast || !state.bundle) return null;
  const now = parisNow();
  const tomorrow = day === 'demain';
  const date = tomorrow ? addDays(now.date, 1) : now.date;
  const time = tomorrow ? '07:00' : now.time;
  const p = state.profile;
  const input = buildInput({
    forecast: state.forecast.data,
    climate: state.climate,
    profile: {
      birth: p.birth,
      transport: p.transport,
      outing_window: p.outing_window,
      outing_duration_h: p.outing_duration_h,
      outfit_offset: p.outfit_offset ?? 0,
      day_style: p.day_style ?? null,
      night_options: p.night_options ?? {},
      room_temp_c: tomorrow ? null : freshRoom(p, 'nuit'),
      day_room_temp_c: tomorrow ? null : freshRoom(p, 'jour'),
      inventory: p.inventory ?? {},
    },
    date,
    now: time,
    lat: p.commune.lat,
  });
  const result = evaluate(input, state.bundle);
  const hidden = store.hidden();
  result.purchases = result.purchases.filter((x) => !hidden.includes(`${p.id}|${x.key}`));
  return { input, result, date, moment: tomorrow ? 'jour' : displayMoment(result, time), tomorrow, forecast: state.forecast };
}

// Brouillon d'un écran de saisie : premier lancement, réglages (commune), fiche d'un enfant (#enfant/identifiant ou nouveau).
function newDraft(view) {
  const now = parisNow().date;
  if (view === 'enfant') {
    const child = state.household.children.find((c) => c.id === route().slice('enfant/'.length));
    return {
      child: child?.id ?? 'nouveau',
      name: child?.name ?? '',
      birthMonth: child?.birth.slice(5, 7) ?? now.slice(5, 7),
      birthYear: child?.birth.slice(0, 4) ?? now.slice(0, 4),
      transport: child?.transport ?? 'poussette',
      offset: child?.outfit_offset ?? 0,
      dayStyle: child?.day_style ?? null,
    };
  }
  const settings = view === 'reglages';
  return {
    step: 1,
    commune: settings ? state.profile.commune : null,
    query: settings ? state.profile.commune.nom : '',
    birthMonth: now.slice(5, 7),
    birthYear: now.slice(0, 4),
    transport: 'poussette',
    name: '',
  };
}

let lastKey = '';
function paint() {
  const view = currentView();
  if (['onboarding', 'reglages', 'enfant'].includes(view) && !state.draft) state.draft = newDraft(view);
  const key = `${view}|${route()}|${state.tab}|${state.day}|${state.draft?.step ?? ''}`;
  app.classList.toggle('anim', key !== lastKey);
  lastKey = key;
  let html;
  if (!state.bundle) html = state.error ? V.fatal(state.error) : V.loading();
  else if (view === 'onboarding') html = V.viewOnboarding(state);
  else if (view === 'recevoir') html = V.viewReceive(state);
  else if (view === 'enfant') html = V.viewChild(state);
  else if (view === 'reglages') {
    state.updateLink = scriptableLink();
    state.androidLink = androidLink();
    html = V.viewSettings(state);
  }
  else if (view === 'widget') {
    state.androidLink = androidLink();
    // Le script à coller dans Scriptable, avec les réglages du moment.
    state.script = state.loader?.replace('__SB_CONFIG__', configText()) ?? null;
    const ctx = compute('aujourdhui');
    if (ctx?.moment === 'soir') ctx.evening = compute('demain');
    html = V.viewWidget(state, ctx);
  } else if (view === 'apropos') html = V.viewAbout(state);
  else {
    // Version navigateur sur Android : le widget Maison renvoie vers l'app Android (lien qui l'ouvre ou la télécharge).
    if (state.device === 'android' && !host && state.household) state.androidLink = androidLink();
    const ctx = compute(state.tab === 'sortir' ? state.day : 'aujourdhui');
    // La veille au soir, comme les widgets : la journée de demain, à préparer ce soir, et la nuit.
    if (ctx && state.tab === 'sortir' && !ctx.tomorrow && ctx.moment === 'soir') ctx.evening = compute('demain');
    html = V.viewApp(state, ctx);
  }
  if (state.updateReady) {
    html += '<div class="update" role="status">Nouvelle version prête<button class="btn small" data-action="apply-update">Recharger</button></div>';
  }
  app.innerHTML = html;
  setThemeColor(view);
}

// Barre d'état d'Android assortie au ciel de l'écran (iOS garde sa barre standard).
const SKY = {
  clair: '#3b8cf6', nuageux: '#5b7aa0', pluie: '#3f5d7c', chaleur: '#ec7f24', froid: '#4a72c0',
  soir: '#5650c6', nuit: '#121a33', prevoir: '#6a5bdc', maison: '#2f8f83',
};
function setThemeColor(view) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  const dark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  let color = dark ? '#0b0d11' : '#f2f3f7';
  if (view === 'onboarding') color = SKY.clair;
  if (view === 'app') {
    const ctx = state.tab === 'sortir' ? compute(state.day) : null;
    color = state.tab === 'nuit' ? SKY.nuit : state.tab === 'prevoir' ? SKY.prevoir : ctx ? SKY[V.sortirTheme(ctx)] : SKY.clair;
  }
  meta.setAttribute('content', color);
  // Barres du système de l'app Android : ciel en haut, couleur de la barre d'onglets en bas.
  const bottom = view === 'app' ? (dark ? '#14171e' : '#fcfcfd') : dark ? '#0b0d11' : '#f2f3f7';
  if (host === 'android') ask(() => android.colors(color, bottom));
}

// Rappel du soir : réglé sur ce téléphone, transmis à l'app Android ou au widget iPhone, qui le programment,
// ou à l'API (notification Web Push sans contenu : le service worker calcule le rappel sur le téléphone).
function setReminder(next) {
  state.reminder = next;
  store.saveReminder(next);
  if (webPush) {
    pushSubscription(next).then((status) => {
      state.reminderState = status;
      if (status === 'refuse') toast('Notifications refusées : autorisez-les dans les réglages du téléphone.');
      paint();
    });
    writeSwData();
  }
  if (host === 'android') {
    state.reminderState = ask(() => android.reminder(next.on, next.at), 'off');
    if (state.reminderState === 'demande') toast('Autorisez les notifications de Superbébé.');
  }
  if (host === 'scriptable') {
    syncHost();
    if (next.on) toast(`Rappel vers ${hourFr(next.at)}. Scriptable demandera peut-être l'autorisation d'envoyer des notifications.`);
  }
  paint();
}

function saveHousehold() {
  store.saveProfile(state.household);
  refreshProfile();
  syncHost();
  writeSwData();
  if (state.family) {
    state.family = { ...state.family, dirty: true };
    store.saveFamily(state.family);
    clearTimeout(familyTimer);
    familyTimer = setTimeout(syncFamily, 1500);
  }
}

// ——— Avec l'autre parent, par l'API ———
// Le foyer est chiffré sur ce téléphone avant de partir ; on lit la version du serveur, on fusionne, et on renvoie
// si ce téléphone a du nouveau. Sans réseau, rien ne bloque : on réessaiera à la prochaine ouverture.
let familyTimer = null;
let syncing = null;
const familyLink = (secret) => `${new URL('./', location.href).href}#famille=${secret}`;

function syncFamily() {
  if (!state.family || !state.api || !state.household) return Promise.resolve();
  syncing ??= (async () => {
    const family = { ...state.family };
    const keys = await familyKeys(family.secret);
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await api.lireFamille(keys, family.version);
      if (res.status === 404 || res.status === 403) {
        state.family = null;
        store.saveFamily(null);
        toast('La famille a été effacée par l\'autre parent : vos réglages restent sur ce téléphone.');
        paint();
        return;
      }
      if (res.status === 200) {
        const { bloc, version } = await res.json();
        const remote = await unseal(keys.key, bloc);
        const merged = mergeHousehold({ ...sharedPart(state.household), ...state.household }, remote);
        if (JSON.stringify(sharedPart(merged)) !== JSON.stringify(sharedPart(state.household))) {
          state.household = { ...merged, updated: Date.now() };
          store.saveProfile(state.household);
          refreshProfile();
          syncHost();
          writeSwData();
          if (['app', 'reglages'].includes(currentView())) paint();
        }
        if (JSON.stringify(sharedPart(merged)) !== JSON.stringify({ ...remote, v: 1 })) family.dirty = true;
        family.version = version;
      } else if (res.status !== 304) throw new Error(`HTTP ${res.status}`);
      if (!family.dirty) break;
      const put = await api.ecrireFamille(keys, await seal(keys.key, sharedPart(state.household)), family.version);
      if (put.status === 412) continue;
      if (!put.ok) throw new Error(`HTTP ${put.status}`);
      family.version = (await put.json()).version;
      family.dirty = false;
      break;
    }
    family.synced_at = Date.now();
    state.family = family;
    state.familyError = false;
    store.saveFamily(family);
  })().catch(() => {
    state.familyError = true;
  }).finally(() => {
    syncing = null;
  });
  return syncing;
}

// Famille à rejoindre (lien #famille=…) : lue et déchiffrée, puis montrée avant tout remplacement.
async function loadJoining(secret) {
  state.joining = { secret, status: 'lecture' };
  paint();
  try {
    const keys = await familyKeys(secret);
    const res = await api.lireFamille(keys);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { bloc, version } = await res.json();
    state.joining = { secret, status: 'pret', version, shared: await unseal(keys.key, bloc) };
  } catch (e) {
    state.joining = { secret, status: 'erreur' };
  }
  paint();
}

// Notifications Web Push : autorisation (au toucher), abonnement du téléphone, heure envoyée à l'API.
async function pushSubscription(reminder) {
  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!reminder.on) {
      if (subscription) {
        await api.desabonner(subscription.endpoint).catch(() => {});
        await subscription.unsubscribe();
      }
      return 'off';
    }
    if ((await Notification.requestPermission()) !== 'granted') return 'refuse';
    state.apiInfo ??= await api.etat();
    if (!state.apiInfo?.push) return 'indisponible';
    subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: fromB64url(state.apiInfo.push) });
    const res = await api.abonner(subscription.endpoint, reminder.at);
    return res.ok ? 'on' : 'indisponible';
  } catch (e) {
    return 'indisponible';
  }
}

// Ce dont le service worker a besoin pour calculer le rappel sans l'app : le foyer et la dernière météo.
function writeSwData() {
  if (!webPush || !state.household || !('caches' in window)) return;
  const data = { household: state.household, reminder: state.reminder, forecast: state.forecast?.data ?? null };
  caches.open('superbebe-donnees').then((cache) => cache.put('donnees.json', new Response(JSON.stringify(data)))).catch(() => {});
}

// Réglages du foyer : commune, horaires, affichage. Les dates de changement servent à fusionner avec l'autre parent.
function updateHousehold(patch) {
  const now = Date.now();
  const shared = ['commune', 'outing_window', 'outing_duration_h'].some((k) => k in patch);
  state.household = { ...state.household, ...patch, updated: now, ...(shared ? { settings_at: now } : {}) };
  saveHousehold();
}

// Réglages d'un enfant (l'enfant affiché par défaut) : prénom, naissance, mode, tendance, garde-robe, relevés.
// Les relevés (chambre, pièce de jour) ont leur propre date : ils ne comptent pas comme un changement des réglages.
function updateChild(patch, id = state.profile.id) {
  const now = Date.now();
  const touched = Object.keys(patch).some((k) => k !== 'room' && k !== 'room_day');
  const children = state.household.children.map((c) => (c.id === id ? { ...c, ...patch, ...(touched ? { updated: now } : {}) } : c));
  state.household = { ...state.household, children, updated: now };
  saveHousehold();
}

function showChild(id) {
  store.setCurrentChild(id);
  refreshProfile();
}

// Le widget suit l'app : réglages et relevés des chambres lui sont transmis à chaque changement.
function syncHost() {
  if (!host) return;
  const h = state.household;
  const children = h?.children ?? [];
  if (host === 'android') {
    // Avant la 0.6, l'app Android ne connaît qu'un enfant : celui affiché, avec son relevé.
    if (androidMulti) {
      const rooms = Object.fromEntries(children.filter((c) => c.room).map((c) => [c.id, c.room]));
      ask(() => android.sync(h ? configText() : '', JSON.stringify(rooms)));
      const days = Object.fromEntries(children.filter((c) => c.room_day).map((c) => [c.id, c.room_day]));
      if (androidHome && h) ask(() => android.syncReadings(JSON.stringify({ jour: days, nuit: rooms })));
    } else {
      const room = state.profile?.room ?? null;
      ask(() => android.sync(h ? encodeConfig(profileToConfig(state.profile), (x) => btoa(x)) : '', room ? JSON.stringify(room) : ''));
    }
    state.widgets = ask(() => android.widgets(), state.widgets);
    state.widgetKids = widgetKids();
    return;
  }
  const config = h ? configText() : '';
  // room= : le premier enfant, pour un widget iPhone dont le code n'est pas encore à jour ; dayrooms= : pièces de jour
  // (widget Maison) ; rappel= : rappel du soir.
  const rooms = children.filter((c) => c.room).map((c) => `${c.id}:${c.room.value}@${c.room.at}`).join(',');
  const dayrooms = children.filter((c) => c.room_day).map((c) => `${c.id}:${c.room_day.value}@${c.room_day.at}`).join(',');
  const first = children[0]?.room;
  const reminder = `&rappel=${h && state.reminder.on ? state.reminder.at : '0'}`;
  let frame = document.getElementById('sb-sync');
  if (!frame) {
    frame = document.createElement('iframe');
    frame.id = 'sb-sync';
    frame.hidden = true;
    document.body.appendChild(frame);
  }
  frame.src = `superbebe-sync:?config=${encodeURIComponent(config)}${rooms ? `&rooms=${rooms}` : ''}${dayrooms ? `&dayrooms=${dayrooms}` : ''}${first ? `&room=${first.value}@${first.at}` : ''}${reminder}`;
}

// Relevés notés sur le widget Maison d'Android : repris s'ils sont plus récents que ceux de l'app (puis partagés comme les autres).
function pullReadings() {
  if (!androidHome || !state.household) return false;
  const all = ask(() => JSON.parse(android.readings()), null);
  if (!all) return false;
  let changed = false;
  const children = state.household.children.map((c) => {
    let next = c;
    for (const [kind, key] of [['nuit', 'room'], ['jour', 'room_day']]) {
      const r = all[kind]?.[c.id];
      if (r && Number.isFinite(r.value) && r.at > (c[key]?.at ?? 0) && r.at <= Date.now() + 60_000) {
        next = { ...next, [key]: { value: r.value, at: r.at } };
        changed = true;
      }
    }
    return next;
  });
  if (changed) {
    state.household = { ...state.household, children, updated: Date.now() };
    saveHousehold();
  }
  return changed;
}

// Foyer remplacé (configuration plus récente d'un widget, profils de l'autre parent) : météo à recharger si la commune change.
function replaceHousehold(household) {
  const before = state.household;
  state.household = household;
  store.saveProfile(household);
  if (!household.children.some((c) => c.id === store.currentChild())) store.setCurrentChild(household.children[0].id);
  refreshProfile();
  if (!before || before.commune.lat !== household.commune.lat || before.commune.lon !== household.commune.lon) {
    state.forecast = null;
    state.climate = [];
    state.climateReady = false;
  }
}

// Réglages reçus du widget ou de l'app Android (#import=SB1.…) : ils remplacent ceux de l'app s'ils sont plus récents
// (garde-robe et relevés conservés). ?enfant=… : l'enfant du widget touché ; ?onglet=maison : touché depuis le widget Maison.
// #partage=SB1.… : profils envoyés par l'autre parent, appliqués après confirmation (écran « recevoir »).
function takeImport() {
  const params = new URLSearchParams(location.search);
  const wanted = params.get('enfant');
  const match = location.hash.match(/^#(import|partage)=(SB1\.[\w-]+)/);
  if (params.get('onglet') === 'maison') {
    state.tab = homeTab();
    state.day = 'aujourdhui';
    params.delete('onglet');
    history.replaceState(null, '', `${location.pathname}${params.toString() ? `?${params}` : ''}${location.hash}`);
  }
  if (match || wanted) {
    params.delete('enfant');
    const query = params.toString();
    history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}${match ? '' : location.hash}`);
  }
  // Lien de famille (#famille=secret) : lu auprès de l'API, puis montré avant de remplacer quoi que ce soit.
  const join = location.hash.match(/^#famille=([A-Za-z0-9_-]{43})$/);
  if (join) {
    history.replaceState(null, '', `${location.pathname}${location.search}`);
    if (state.api) loadJoining(join[1]);
  }
  const cfg = match && decodeConfig(match[2], (b64) => atob(b64));
  let changed = false;
  if (cfg && match[1] === 'partage') state.received = cfg;
  else if (cfg && isNewer(cfg, state.household)) {
    replaceHousehold(fromConfig(cfg, state.household));
    changed = true;
  }
  if (wanted && state.household?.children.some((c) => c.id === wanted)) showChild(wanted);
  return changed;
}

let toastTimer = null;
function toast(message) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.hidden = true;
  }, 3000);
}

// La copie doit partir directement du geste de l'utilisateur (exigence de Safari).
async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (e2) {
      ok = false;
    }
    area.remove();
    return ok;
  }
}

const configText = () => encodeConfig(householdToConfig(state.household), (s) => btoa(s));

// Lien pour l'autre parent : les profils (prénoms compris) passent dans le message, jamais par un serveur.
const profilesLink = () => `${new URL('./', location.href).href}#partage=${configText()}`;
const childName = (c, i) => c.name || `Enfant ${i + 1}`;

// iPhone : lien qui renvoie les réglages au widget (script Scriptable nommé « Superbébé »).
const scriptableLink = () => (state.profile ? `scriptable:///run/${encodeURIComponent('Superbébé')}?config=${configText()}` : '');

// Lien qui ouvre l'app Android du widget avec la configuration ; sans l'app, Chrome propose de la télécharger.
function androidLink() {
  const base = new URL('../', location.href).href;
  const apk = new URL(`../dist/superbebe-android.apk?v=${V.VERSION}`, location.href).href;
  return `intent://config/${configText()}?base=${encodeURIComponent(base)}`
    + `#Intent;scheme=superbebe;package=fr.superbebe.widget;S.browser_fallback_url=${encodeURIComponent(apk)};end`;
}

function shareText(ctx) {
  const M = state.bundle.messages;
  const { result, date } = ctx;
  const w = result.outing.window;
  const name = state.profile.name ? `${state.profile.name} · ` : '';
  const lines = [`Superbébé · ${name}${dayLong(date)} · ${state.profile.commune.nom}`];
  lines.push(w
    ? `Sortie idéale de ${hourFr(w.start)} à ${hourFr(w.end)}, ${Math.round(w.feels_c)} °C ressentis`
    : render(M, `outing.none.${result.outing.reason}`, 'text'));
  if (result.outfit) lines.push(`Tenue : ${result.outfit.items.map((i) => M.labels.items[i]).join(', ')}`);
  for (const note of result.outfit?.notes ?? []) lines.push(render(M, note, 'text', result.params));
  if (result.relays[0]) lines.push(`Repère officiel : ${render(M, result.relays[0], 'text', result.params)}`);
  return lines.join('\n');
}

// Sans prénom : seulement l'âge, le mode et la tendance de chaque enfant.
function reportText() {
  const h = state.household;
  const days = [...store.days()].sort();
  const owned = h.children.reduce((n, c) => n + Object.values(c.inventory ?? {}).reduce((a, sizes) => a + sizes.length, 0), 0);
  const kids = h.children.map((c) => {
    const transport = V.TRANSPORTS.find(([v]) => v === c.transport)?.[1] ?? c.transport;
    const pref = { '-1': 'a chaud', 0: 'normal', 1: 'a froid' }[Math.sign(c.outfit_offset ?? 0)];
    return `${ageLabel(ageMonthsNow(c.birth))}, ${transport.toLowerCase()}, tendance ${pref}`;
  });
  return [
    `Superbébé ${V.VERSION} · mes retours de test`,
    `Jours d'utilisation : ${days.length}${days.length ? ` (du ${dayShort(days[0])} au ${dayShort(days.at(-1))})` : ''}`,
    `Enfants : ${kids.join(' ; ')}`,
    `Sorties : de ${hourFr(h.outing_window.from)} à ${hourFr(h.outing_window.to)}, ${h.outing_duration_h} h`,
    `Garde-robe : ${owned} article(s) ; ${store.hidden().length} suggestion(s) masquée(s)`,
    `Widget : ${(host === 'android' ? state.widgets > 0 : state.widgetReady) ? 'posé' : 'pas encore'}`,
    host === 'android' ? `App Android : ${ask(() => android.version(), '?')}` : `Ouverture : ${host === 'scriptable' ? 'depuis le widget iPhone' : standalone ? 'app installée' : 'navigateur'}`,
  ].join('\n');
}

const ageMonthsNow = (birth) => ageMonths(birth, parisNow().date);

function validBirth(draft) {
  const birth = `${draft.birthYear}-${draft.birthMonth}`;
  draft.birthError = birth > parisNow().date.slice(0, 7) ? 'Ce mois est dans le futur.' : null;
  return draft.birthError ? null : birth;
}

function preloadLoader() {
  if (state.loader) return;
  loadText('../widget/chargeur.js')
    .then((text) => {
      // Le widget téléchargera son code depuis le site qui l'a servi, quel que soit l'hébergeur.
      state.loader = text.replaceAll('__SB_BASE_URL__', new URL('../', location.href).href);
      if (currentView() === 'widget') paint();
    })
    .catch(() => {});
}

async function loadData({ force = false } = {}) {
  if (!state.profile || state.loading) return;
  const commune = state.profile.commune;
  state.loading = true;
  try {
    state.forecast = await getForecast(commune, { force });
    state.updatedAt = clock(state.forecast.at);
    state.error = null;
  } catch (e) {
    state.error = 'Météo indisponible pour le moment. Vérifiez la connexion.';
  }
  state.loading = false;
  writeSwData();
  if (currentView() === 'app') paint();
  if (force && !state.error && !state.forecast?.offline) toast(`Météo à jour (${state.updatedAt})`);
  try {
    state.climate = await getClimate(commune, parisNow().date);
  } catch (e) {
    // Sans normales, les achats se limitent aux 16 jours de prévision.
  }
  state.climateReady = true;
  if (currentView() === 'app') paint();
}

function changeCommune(commune) {
  state.draft.commune = commune;
  state.draft.query = commune.nom;
  state.results = [];
  if (currentView() !== 'reglages') return;
  updateHousehold({ commune });
  state.forecast = null;
  state.climate = [];
  state.climateReady = false;
  toast(`Commune : ${commune.nom}`);
  loadData({ force: true });
}

const actions = {
  reload: () => location.reload(),
  'apply-update': () => location.reload(),
  refresh: () => loadData({ force: true }),
  tab(el) {
    state.tab = el.dataset.value;
    paint();
    window.scrollTo(0, 0);
  },
  // Réglages repliés sous une tenue (la pièce de la carte « Dedans ») : ouverts ou fermés, gardés le temps de la session.
  fold(el) {
    const name = el.dataset.value;
    if (state.open.has(name)) state.open.delete(name);
    else state.open.add(name);
    paint();
  },
  day(el) {
    state.day = el.dataset.value;
    state.tab = 'sortir';
    paint();
  },
  kid(el) {
    showChild(el.dataset.value);
    paint();
  },
  // Sur la fiche d'un enfant, le brouillon suit ; un nouvel enfant n'est enregistré qu'au bouton « Ajouter ».
  transport(el) {
    const sheet = currentView() === 'enfant' ? state.draft : null;
    if (sheet) sheet.transport = el.dataset.value;
    if (sheet?.child !== 'nouveau') updateChild({ transport: el.dataset.value }, sheet?.child);
    paint();
  },
  pref(el) {
    const sheet = currentView() === 'enfant' ? state.draft : null;
    if (sheet) sheet.offset = Number(el.dataset.value);
    if (sheet?.child !== 'nouveau') updateChild({ outfit_offset: Number(el.dataset.value) }, sheet?.child);
    paint();
  },
  // Avec ou sans pyjama la journée (dedans comme dehors), depuis la carte « Dedans » ou la fiche de l'enfant.
  'day-style'(el) {
    const sheet = currentView() === 'enfant' ? state.draft : null;
    const value = el.dataset.value || null;
    if (sheet) sheet.dayStyle = value;
    if (sheet?.child !== 'nouveau') updateChild({ day_style: value }, sheet?.child);
    if (!sheet) toast(value === 'pyjama' ? 'Avec pyjama la journée.' : 'Sans pyjama la journée, dedans comme dehors.');
    paint();
  },
  // Tenue de nuit choisie pour une tranche de température ; « principal » revient à la tenue habituelle.
  'night-option'(el) {
    const options = { ...(state.profile.night_options ?? {}) };
    if (el.dataset.value === 'principal') delete options[el.dataset.bin];
    else options[el.dataset.bin] = el.dataset.value;
    updateChild({ night_options: options });
    toast(el.dataset.value === 'principal' ? 'Tenue habituelle pour cette température.' : 'Gardée pour cette température de chambre.');
    paint();
  },
  'outfit-view'(el) {
    updateHousehold({ outfit_view: el.dataset.value });
    paint();
  },
  reminder(el) {
    setReminder({ ...state.reminder, on: el.dataset.value === 'on' });
  },
  // Fiche « Ajouter un enfant » : enregistré d'un coup, puis affiché.
  'child-add'() {
    const d = state.draft;
    const birth = validBirth(d);
    if (!birth) {
      paint();
      return;
    }
    const child = {
      ...newChild({ name: d.name.trim().slice(0, 24), birth, transport: d.transport, outfit_offset: d.offset }), day_style: d.dayStyle ?? null, updated: Date.now(),
    };
    updateHousehold({ children: [...state.household.children, child] });
    showChild(child.id);
    toast(`Profil de ${childName(child, state.household.children.length - 1)} ajouté.`);
    location.hash = 'reglages';
  },
  'child-remove'() {
    const d = state.draft;
    if (state.household.children.length < 2) return;
    if (!d.confirmRemove) {
      d.confirmRemove = true;
      paint();
      return;
    }
    const children = state.household.children.filter((c) => c.id !== d.child);
    updateHousehold({ children, removed: { ...(state.household.removed ?? {}), [d.child]: Date.now() } });
    if (store.currentChild() === d.child) showChild(children[0].id);
    location.hash = 'reglages';
  },
  async 'share-profiles'() {
    const names = state.household.children.map(childName).join(' et ');
    const text = `Les profils Superbébé (${names}) : ouvrez ce lien sur votre téléphone, ou collez-le dans Superbébé, Réglages, « Recevoir des profils ».\n${profilesLink()}`;
    if (host === 'android' && ask(() => android.share(text), false) !== false) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Superbébé', text });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
    if (await copy(text)) toast('Lien copié : envoyez-le à l\'autre parent.');
  },
  'copy-profiles'() {
    copy(`${new URL('./', location.href).href}#partage=${encodeConfig(state.received, (x) => btoa(x))}`)
      .then((ok) => ok && toast('Lien copié : collez-le dans Superbébé, Réglages, « Recevoir des profils ».'));
  },
  'read-profiles'() {
    const text = document.getElementById('profiles-link')?.value ?? '';
    const secret = text.match(/#famille=([A-Za-z0-9_-]{43})/)?.[1];
    if (secret && state.api) {
      loadJoining(secret);
      return;
    }
    const code = text.match(/SB1\.[\w-]+/)?.[0];
    const cfg = code && decodeConfig(code, (b64) => atob(b64));
    if (!cfg) {
      toast('Lien non reconnu : copiez tout le message reçu.');
      return;
    }
    state.received = cfg;
    paint();
  },
  'accept-profiles'() {
    replaceHousehold({ ...fromConfig(state.received, state.household, { keepView: true }), updated: Date.now() });
    const names = state.household.children.map(childName).join(', ');
    state.received = null;
    syncHost();
    if (location.hash) location.hash = '';
    else paint();
    toast(`Profils reçus : ${names}.`);
    store.markDay(parisNow().date);
    loadData({ force: true });
  },
  // Synchroniser avec l'autre parent : la famille est créée chiffrée, puis le lien part par la messagerie.
  async 'family-create'(el) {
    el.disabled = true;
    const secret = newSecret();
    try {
      const keys = await familyKeys(secret);
      const res = await api.creerFamille(keys, await seal(keys.key, sharedPart(state.household)));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      state.family = { secret, version: 1, dirty: false, synced_at: Date.now() };
      store.saveFamily(state.family);
      paint();
      await actions['family-share']();
    } catch (e) {
      toast('Serveur injoignable : réessayez plus tard.');
      el.disabled = false;
    }
  },
  async 'family-share'() {
    if (!state.family) return;
    const names = state.household.children.map(childName).join(' et ');
    const text = `Rejoignez la famille Superbébé (${names}) : ouvrez ce lien sur votre téléphone, ou collez-le dans Superbébé, Réglages, « Recevoir un lien ». Il donne accès aux profils : gardez-le pour vous deux.\n${familyLink(state.family.secret)}`;
    if (host === 'android' && ask(() => android.share(text), false) !== false) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Superbébé', text });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
    if (await copy(text)) toast('Lien copié : envoyez-le à l\'autre parent.');
  },
  async 'family-sync'() {
    await syncFamily();
    toast(state.familyError ? 'Serveur injoignable : réessayez plus tard.' : 'Profils à jour.');
    paint();
  },
  'family-leave'() {
    state.family = null;
    store.saveFamily(null);
    toast('Ce téléphone ne suit plus la famille ; ses réglages restent.');
    paint();
  },
  'family-join'() {
    const j = state.joining;
    if (j?.status !== 'pret') return;
    replaceHousehold(fromShared(j.shared, state.household));
    state.family = { secret: j.secret, version: j.version, dirty: false, synced_at: Date.now() };
    store.saveFamily(state.family);
    state.joining = null;
    syncHost();
    writeSwData();
    if (location.hash) location.hash = '';
    else paint();
    toast(`Famille rejointe : ${state.household.children.map(childName).join(', ')}.`);
    store.markDay(parisNow().date);
    loadData({ force: true });
  },
  'family-refuse'() {
    state.joining = null;
    if (location.hash) location.hash = '';
    else paint();
  },
  'refuse-profiles'() {
    state.received = null;
    if (location.hash) location.hash = '';
    else paint();
  },
  duration(el) {
    const d = Number(el.dataset.value);
    if (toMin(state.profile.outing_window.to) - toMin(state.profile.outing_window.from) < d * 60) {
      toast('La plage horaire est plus courte que cette durée.');
      return;
    }
    updateHousehold({ outing_duration_h: d });
    paint();
  },
  // Relevé du jour (pièce de vie) ou de la nuit (chambre). Sans relevé récent, on part de la valeur affichée :
  // le dernier relevé, sinon 21 °C le jour et 19 °C la nuit.
  room(el) {
    const p = state.profile;
    const kind = el.dataset.kind === 'jour' ? 'jour' : 'nuit';
    const last = kind === 'jour' ? p.room_day : p.room;
    const base = freshRoom(p, kind) ?? last?.value ?? Number(el.dataset.base || (kind === 'jour' ? 21 : 19));
    const value = clamp(Math.round((base + Number(el.dataset.value)) * 2) / 2, 10, 35);
    updateChild({ [kind === 'jour' ? 'room_day' : 'room']: { value, at: Date.now() } });
    paint();
  },
  own(el) {
    const inventory = { ...(state.profile.inventory ?? {}) };
    inventory[el.dataset.cat] = [...new Set([...(inventory[el.dataset.cat] ?? []), el.dataset.size])];
    updateChild({ inventory });
    toast('Ajouté à votre garde-robe.');
    paint();
  },
  hide(el) {
    store.hide(`${state.profile.id}|${el.dataset.key}`);
    toast('Suggestion masquée.');
    paint();
  },
  inv(el) {
    const inventory = { ...(state.profile.inventory ?? {}) };
    const sizes = new Set(inventory[el.dataset.cat] ?? []);
    if (sizes.has(el.dataset.size)) sizes.delete(el.dataset.size);
    else sizes.add(el.dataset.size);
    inventory[el.dataset.cat] = [...sizes];
    updateChild({ inventory });
    paint();
  },
  // Fiche du jour pour la nounou, la crèche ou les grands-parents : image et lien (les données sont après le #).
  // Le soir, celle de demain.
  async 'share-fiche'() {
    const today = compute(state.day);
    const ctx = today && !today.tomorrow && today.moment === 'soir' ? compute('demain') : today;
    if (!ctx?.result.journee) return;
    const M = state.bundle.messages;
    const data = ficheData(ctx, state.profile.name);
    // Avec l'API, un lien court (fiche chiffrée, gardée 48 heures) ; sinon, la fiche entière dans le lien.
    let link = `${new URL('../fiche/', location.href).href}#f=${encodeFiche(data, (x) => btoa(x))}`;
    // Au plus 0,6 seconde d'attente : au-delà, Safari pourrait refuser d'ouvrir la fenêtre de partage.
    if (state.api) link = await Promise.race([shortFicheLink(data), new Promise((resolve) => { setTimeout(() => resolve(link), 600); })]).catch(() => link);
    const text = `${ficheText(data, M, dayLong(ctx.date))}\n${link}`;
    // Dans Scriptable, le lien s'ouvre dans Safari, qui sait partager la fiche.
    if (host === 'scriptable') {
      location.href = link;
      return;
    }
    const canvas = ficheCanvas(data, M, dayLong(ctx.date));
    if (host === 'android') {
      const png = canvas.toDataURL('image/png').split(',')[1];
      if (androidAtLeast(0, 7) && ask(() => android.shareImage(png, text), false)) return;
      if (ask(() => android.share(text), false) !== false) return;
    }
    try {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      const file = blob && new File([blob], `superbebe-${ctx.date}.png`, { type: 'image/png' });
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text });
        return;
      }
      if (navigator.share) {
        await navigator.share({ title: 'Superbébé', text });
        return;
      }
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
    if (await copy(text)) toast('Fiche copiée : collez-la dans votre messagerie.');
  },
  async share() {
    const ctx = compute(state.day);
    if (!ctx) return;
    const text = shareText(ctx);
    if (host === 'android' && ask(() => android.share(text), false) !== false) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Superbébé', text });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
    if (await copy(text)) toast('Texte copié : collez-le dans votre messagerie.');
  },
  locate(el) {
    if (!navigator.geolocation) {
      toast('Position indisponible sur cet appareil.');
      return;
    }
    el.disabled = true;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const commune = await communeAt(pos.coords.latitude, pos.coords.longitude);
          if (commune) changeCommune(commune);
          else toast('Commune introuvable : saisissez-la.');
        } catch (e) {
          toast('Recherche impossible : saisissez la commune.');
        }
        paint();
      },
      () => {
        toast('Position non autorisée : saisissez la commune.');
        paint();
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  },
  'pick-commune'(el) {
    const commune = state.results[Number(el.dataset.index)];
    if (!commune) return;
    changeCommune(commune);
    paint();
  },
  'draft-transport'(el) {
    state.draft.transport = el.dataset.value;
    paint();
  },
  'onboard-next'() {
    const d = state.draft;
    if (d.step === 1 && !d.commune) return;
    if (d.step === 2 && !validBirth(d)) {
      paint();
      return;
    }
    d.step += 1;
    paint();
  },
  'onboard-back'() {
    state.draft.step = Math.max(1, state.draft.step - 1);
    paint();
  },
  'onboard-finish'() {
    const d = state.draft;
    const birth = validBirth(d);
    if (!d.commune || !birth) return;
    const child = newChild({ name: d.name.trim().slice(0, 24), birth, transport: d.transport });
    state.household = {
      v: 2,
      commune: d.commune,
      outing_window: { from: '09:00', to: '18:00' },
      outing_duration_h: 1,
      outfit_view: 'dessins',
      children: [child],
      created: Date.now(),
      updated: Date.now(),
    };
    store.setCurrentChild(child.id);
    saveHousehold();
    store.markDay(parisNow().date);
    state.draft = null;
    state.results = [];
    history.replaceState(null, '', location.pathname);
    paint();
    loadData();
  },
  platform(el) {
    state.platform = el.dataset.value;
    paint();
  },
  // Le script copié contient les réglages : plus rien à coller dans le widget.
  async 'copy-loader'() {
    if (state.script && (await copy(state.script))) {
      store.markWidgetCopied();
      state.widgetReady = true;
      toast('Script copié. Étape suivante : Ouvrir Scriptable.');
    }
    paint();
  },
  'add-widget'(el) {
    const id = el.dataset.child;
    const asked = id && androidMulti ? ask(() => android.addChildWidget(id), false) : ask(() => android.addWidget(), false);
    if (!asked) toast("Appui long sur l'écran d'accueil, Widgets, puis Superbébé.");
  },
  // Widget Maison (app Android 0.13 et plus) : la température à noter avec − et +, et la tenue qui va avec.
  'add-home-widget'(el) {
    const asked = ask(() => android.addHomeWidget(el.dataset.child ?? state.profile.id), false);
    if (!asked) toast("Appui long sur l'écran d'accueil, Widgets, puis Superbébé · Maison.");
  },
  'hide-promo'() {
    store.hidePromo();
    state.promoHidden = true;
    paint();
  },
  install() {
    const prompt = state.installPrompt;
    if (!prompt) return;
    prompt.prompt();
    prompt.userChoice.finally(() => {
      state.installPrompt = null;
      paint();
    });
  },
  async 'check-update'() {
    if (state.updateReady) {
      location.reload();
      return;
    }
    const registration = await navigator.serviceWorker?.getRegistration();
    if (!registration) {
      // Ouverte depuis le widget iPhone, l'app est rechargée du site à chaque fois.
      toast(host ? `Vous avez la dernière version (${V.VERSION}).` : 'Mise à jour automatique indisponible ici.');
      return;
    }
    await registration.update().catch(() => {});
    setTimeout(() => {
      if (!state.updateReady) toast(`Vous avez la dernière version (${V.VERSION}).`);
    }, 1500);
  },
  async 'copy-report'() {
    if (await copy(reportText())) toast('Retours copiés : collez-les dans la conversation du test.');
  },
  async clear() {
    if (!state.confirmClear) {
      state.confirmClear = true;
      paint();
      return;
    }
    // La famille partagée est aussi effacée du serveur (pour l'autre parent aussi, prévenu par le message).
    if (state.family && state.api) {
      await familyKeys(state.family.secret).then((keys) => api.effacerFamille(keys)).catch(() => {});
    }
    if (webPush) await pushSubscription({ on: false });
    store.clear();
    state.household = null;
    state.profile = null;
    syncHost();
    location.hash = '';
    location.reload();
  },
};

let searchTimer = null;
document.addEventListener('input', (event) => {
  if (event.target.id === 'child-name' && state.draft) state.draft.name = event.target.value;
  if (event.target.id !== 'commune-q' || !state.draft) return;
  state.draft.query = event.target.value;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(async () => {
    const query = state.draft?.query ?? '';
    let results = [];
    try {
      results = await searchCommunes(query);
    } catch (e) {
      results = [];
    }
    if (state.draft?.query !== query) return;
    state.results = results;
    const list = document.getElementById('commune-results');
    if (!list) return;
    list.innerHTML = V.communeResults(results);
    list.hidden = results.length === 0;
  }, 250);
});

document.addEventListener('change', (event) => {
  const { id, value } = event.target;
  // Listes déroulantes des tenues au choix : la valeur choisie passe à l'action, comme pour un bouton.
  if (event.target.matches('select[data-action]')) {
    event.target.dataset.value = value;
    actions[event.target.dataset.action]?.(event.target);
    return;
  }
  const d = state.draft;
  if ((id === 'birth-month' || id === 'birth-year') && d) {
    if (id === 'birth-month') d.birthMonth = value;
    else d.birthYear = value;
    const birth = validBirth(d);
    if (birth && currentView() === 'enfant' && d.child !== 'nouveau') updateChild({ birth }, d.child);
    paint();
  }
  // Prénom d'un enfant déjà enregistré : gardé dès qu'on quitte le champ.
  if (id === 'child-name' && d && currentView() === 'enfant' && d.child !== 'nouveau') {
    updateChild({ name: value.trim().slice(0, 24) }, d.child);
    paint();
  }
  if (id === 'reminder-at' && /^\d{2}:\d{2}$/.test(value)) setReminder({ ...state.reminder, at: value });
  if ((id === 'from' || id === 'to') && currentView() === 'reglages') {
    const next = { ...state.profile.outing_window, [id]: value };
    if (toMin(next.to) - toMin(next.from) < state.profile.outing_duration_h * 60) {
      d.error = 'La plage doit être au moins aussi longue que la sortie.';
    } else {
      d.error = null;
      updateHousehold({ outing_window: next });
    }
    paint();
  }
});

document.addEventListener('click', (event) => {
  const step = event.target.closest('[data-step]');
  if (step) {
    state.steps.add(`${state.platform}-${step.dataset.step}`);
    if ('ready' in step.dataset) {
      store.markWidgetCopied();
      state.widgetReady = true;
    }
    if (!step.dataset.action) setTimeout(paint, 400);
  }
  const el = event.target.closest('[data-action]');
  // Une liste déroulante agit au choix (événement change), pas au toucher : sinon elle ne s'ouvre pas sur téléphone.
  if (!el || el.disabled || el.tagName === 'SELECT') return;
  const handler = actions[el.dataset.action];
  if (!handler) return;
  event.preventDefault();
  handler(el);
});

document.addEventListener('toggle', (event) => {
  const name = event.target.dataset?.details;
  if (!name) return;
  if (event.target.open) state.open.add(name);
  else state.open.delete(name);
}, true);

window.addEventListener('hashchange', () => {
  if (takeImport()) {
    syncHost();
    loadData({ force: true });
  }
  state.draft = null;
  state.results = [];
  state.confirmClear = false;
  paint();
  // La commune en haut de l'écran mène droit à son réglage (rubrique Sorties).
  const target = route() === 'reglages/commune' && document.getElementById('reglage-commune');
  if (target) target.scrollIntoView({ block: 'center' });
  else window.scrollTo(0, 0);
  if (route() === 'widget') preloadLoader();
});

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  state.installPrompt = event;
});

// Mises à jour : le service worker installe la nouvelle version en arrière-plan ;
// on la propose tout de suite, et on l'applique d'office au prochain retour dans l'app.
const hadController = Boolean(navigator.serviceWorker?.controller);
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return;
    state.updateReady = true;
    paint();
  });
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (state.updateReady) {
    location.reload();
    return;
  }
  navigator.serviceWorker?.getRegistration().then((r) => r?.update()).catch(() => {});
  if (host === 'android') {
    // Retour de la fenêtre « Ajouter le widget » ou de l'écran d'accueil.
    state.widgets = ask(() => android.widgets(), state.widgets);
    state.widgetKids = widgetKids();
    state.homeWidgets = homeWidgets();
    pullReadings();
    if (reminderHost) state.reminderState = ask(() => android.reminderState(), state.reminderState);
    if (currentView() !== 'onboarding') paint();
  }
  if (!state.household) return;
  syncFamily();
  const today = parisNow().date;
  if (today !== state.today) {
    state.today = today;
    state.day = 'aujourdhui';
  }
  store.markDay(today);
  loadData();
});

// L'heure qui passe change le créneau restant et le moment (jour ou soir).
setInterval(() => {
  if (currentView() === 'app' && document.visibilityState === 'visible') paint();
}, 5 * 60 * 1000);

// Widget Android touché alors que l'app est déjà ouverte : elle passe à son enfant (et à la pièce du moment pour le widget Maison).
window.sbChoisirEnfant = (id) => {
  if (!state.household?.children.some((c) => c.id === id)) return;
  showChild(id);
  if (currentView() === 'app') paint();
};
window.sbOnglet = (tab) => {
  if (tab !== 'maison') return;
  state.tab = homeTab();
  state.day = 'aujourdhui';
  if (route()) location.hash = '';
  paint();
};

// App Android : la dernière version publiée de l'APK, pour proposer la mise à jour dans les réglages.
function loadApkLatest() {
  if (host !== 'android') return;
  fetch(new URL(`../dist/android-version.json?t=${Date.now()}`, location.href), { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then((latest) => {
      if (!latest?.versionName) return;
      state.apkLatest = { ...latest, url: new URL(`../dist/${latest.apk ?? 'superbebe-android.apk'}`, location.href).href };
      if (currentView() === 'reglages') paint();
    })
    .catch(() => {});
}

async function boot() {
  takeImport();
  pullReadings();
  loadApkLatest();
  paint();
  try {
    state.bundle = await loadBundle();
    state.sourcesById = new Map(state.bundle.sources.sources.map((s) => [s.id, s]));
  } catch (e) {
    state.error = 'Impossible de charger l\'application. Vérifiez la connexion, puis rechargez.';
    paint();
    return;
  }
  if (state.household) {
    const cached = store.forecast();
    if (cached?.code === state.profile.commune.code) {
      state.forecast = { ...cached, offline: false };
      state.updatedAt = clock(cached.at);
    }
    const climate = store.climate();
    if (climate?.code === state.profile.commune.code) state.climate = climate.years;
    store.markDay(state.today);
    syncHost();
  }
  paint();
  if (route() === 'widget') preloadLoader();
  if (state.household) loadData();
  if (state.api) {
    api.etat().then((info) => {
      state.apiInfo = info;
    });
    syncFamily();
  }
}

boot();
