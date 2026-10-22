// Point d'entrée de l'app web Superbébé : état, actions, chargement des données et mises à jour.
import { addDays, ageMonths, clamp, displayMoment, evaluate, hourFr, momentOf, outfitAt, render, toMin } from '../../engine/engine.js';
import { buildInput, decodeConfig, encodeConfig, householdToConfig, parisNow, profileToConfig } from '../../engine/adapter.js';
import { communeAt, getClimate, getForecast, loadBundle, loadText, searchCommunes } from './data.js';
import { dayLong, dayShort } from './format.js';
import { ageLabel, fromConfig, isNewer, migrate, newChild, profileOf } from './household.js';
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
const widgetKids = () => (androidMulti ? ask(() => JSON.parse(android.widgetChildren()), {}) : {});

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
  tab: momentOf(parisNow().time) === 'soir' ? 'nuit' : 'sortir',
  day: 'aujourdhui',
  pickedHour: null,
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
  widgets: host === 'android' ? ask(() => android.widgets(), 0) : 0,
  widgetKids: widgetKids(),
  steps: new Set(),
  androidLink: '',
  updateLink: '',
  promoHidden: store.promoHidden(),
  widgetReady: Boolean(store.widgetCopied()),
  confirmClear: false,
  updateReady: false,
  // Onglet choisi par l'utilisateur : on ne bascule plus tout seul vers la nuit.
  tabChosen: false,
};

function refreshProfile() {
  state.profile = state.household ? profileOf(state.household, store.currentChild()) : null;
}
refreshProfile();

// Comme le widget : après la dernière sortie possible, l'app s'ouvre sur la nuit.
function eveningTab() {
  if (state.tabChosen || state.tab !== 'sortir' || currentView() !== 'app') return;
  if (compute('aujourdhui', { pick: false })?.moment === 'soir') state.tab = 'nuit';
}

const route = () => location.hash.replace('#', '');

function currentView() {
  if (!state.household) return state.received || route() === 'recevoir' ? 'recevoir' : 'onboarding';
  const r = route();
  if (r.startsWith('enfant/')) return 'enfant';
  if (['reglages', 'widget', 'apropos', 'recevoir'].includes(r)) return r;
  return state.received ? 'recevoir' : 'app';
}

const freshRoom = (profile) => (profile.room && Date.now() - profile.room.at < ROOM_TTL_MS ? profile.room.value : null);
const clock = (ms) => new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })
  .format(new Date(ms)).replace(':', ' h ');

// Les onglets Nuit et Prévoir parlent toujours d'aujourd'hui ; « Demain » ne concerne que l'onglet Sortir.
// `pick` : tenue à l'heure choisie dans la frise (pas pour l'aperçu de demain).
function compute(day, { pick = true } = {}) {
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
      room_temp_c: tomorrow ? null : freshRoom(p),
      inventory: p.inventory ?? {},
    },
    date,
    now: time,
    lat: p.commune.lat,
  });
  const result = evaluate(input, state.bundle);
  const hidden = store.hidden();
  result.purchases = result.purchases.filter((x) => !hidden.includes(`${p.id}|${x.key}`));
  const picked = pick && state.pickedHour ? outfitAt(input, state.bundle, state.pickedHour) : null;
  return { input, result, date, moment: tomorrow ? 'jour' : displayMoment(result, time), picked, tomorrow, forecast: state.forecast };
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
    html = V.viewSettings(state);
  }
  else if (view === 'widget') {
    state.androidLink = androidLink();
    // Le script à coller dans Scriptable, avec les réglages du moment.
    state.script = state.loader?.replace('__SB_CONFIG__', configText()) ?? null;
    html = V.viewWidget(state, compute('aujourdhui'));
  } else if (view === 'apropos') html = V.viewAbout(state);
  else {
    const ctx = compute(state.tab === 'sortir' ? state.day : 'aujourdhui');
    // Journée finie : l'onglet Sortir montre la tenue de demain.
    if (ctx && state.tab === 'sortir' && !ctx.tomorrow && !ctx.result.outfit) ctx.next = compute('demain', { pick: false });
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
  soir: '#5650c6', nuit: '#121a33', prevoir: '#6a5bdc',
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

function saveHousehold() {
  store.saveProfile(state.household);
  refreshProfile();
  syncHost();
}

// Réglages du foyer : commune, horaires, affichage.
function updateHousehold(patch) {
  state.household = { ...state.household, ...patch, updated: Date.now() };
  saveHousehold();
}

// Réglages d'un enfant (l'enfant affiché par défaut) : prénom, naissance, mode, tendance, garde-robe, chambre.
function updateChild(patch, id = state.profile.id) {
  const children = state.household.children.map((c) => (c.id === id ? { ...c, ...patch } : c));
  state.household = { ...state.household, children, updated: Date.now() };
  saveHousehold();
}

function showChild(id) {
  store.setCurrentChild(id);
  refreshProfile();
  state.pickedHour = null;
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
    } else {
      const room = state.profile?.room ?? null;
      ask(() => android.sync(h ? encodeConfig(profileToConfig(state.profile), (x) => btoa(x)) : '', room ? JSON.stringify(room) : ''));
    }
    state.widgets = ask(() => android.widgets(), state.widgets);
    state.widgetKids = widgetKids();
    return;
  }
  const config = h ? configText() : '';
  // room= : le premier enfant, pour un widget iPhone dont le code n'est pas encore à jour.
  const rooms = children.filter((c) => c.room).map((c) => `${c.id}:${c.room.value}@${c.room.at}`).join(',');
  const first = children[0]?.room;
  let frame = document.getElementById('sb-sync');
  if (!frame) {
    frame = document.createElement('iframe');
    frame.id = 'sb-sync';
    frame.hidden = true;
    document.body.appendChild(frame);
  }
  frame.src = `superbebe-sync:?config=${encodeURIComponent(config)}${rooms ? `&rooms=${rooms}` : ''}${first ? `&room=${first.value}@${first.at}` : ''}`;
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
// (garde-robe et relevés des chambres conservés). ?enfant=… : l'enfant du widget touché.
// #partage=SB1.… : profils envoyés par l'autre parent, appliqués après confirmation (écran « recevoir »).
function takeImport() {
  const params = new URLSearchParams(location.search);
  const wanted = params.get('enfant');
  const match = location.hash.match(/^#(import|partage)=(SB1\.[\w-]+)/);
  if (match || wanted) {
    params.delete('enfant');
    const query = params.toString();
    history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}${match ? '' : location.hash}`);
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
  const apk = new URL('../dist/superbebe-android.apk', location.href).href;
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
  eveningTab();
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
    state.tabChosen = true;
    state.tab = el.dataset.value;
    state.pickedHour = null;
    paint();
    window.scrollTo(0, 0);
  },
  day(el) {
    state.day = el.dataset.value;
    state.tab = 'sortir';
    state.pickedHour = null;
    paint();
  },
  'pick-hour'(el) {
    state.pickedHour = state.pickedHour === el.dataset.hour ? null : el.dataset.hour;
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
  'outfit-view'(el) {
    updateHousehold({ outfit_view: el.dataset.value });
    paint();
  },
  // Fiche « Ajouter un enfant » : enregistré d'un coup, puis affiché.
  'child-add'() {
    const d = state.draft;
    const birth = validBirth(d);
    if (!birth) {
      paint();
      return;
    }
    const child = newChild({ name: d.name.trim().slice(0, 24), birth, transport: d.transport, outfit_offset: d.offset });
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
    updateHousehold({ children });
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
  room(el) {
    const p = state.profile;
    const base = freshRoom(p) ?? p.room?.value ?? 19;
    const value = clamp(Math.round((base + Number(el.dataset.value)) * 2) / 2, 10, 35);
    updateChild({ room: { value, at: Date.now() } });
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
  clear() {
    if (!state.confirmClear) {
      state.confirmClear = true;
      paint();
      return;
    }
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
  if (!el || el.disabled) return;
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
  window.scrollTo(0, 0);
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
    if (currentView() !== 'onboarding') paint();
  }
  if (!state.household) return;
  const today = parisNow().date;
  if (today !== state.today) {
    state.today = today;
    state.day = 'aujourdhui';
    state.pickedHour = null;
  }
  store.markDay(today);
  loadData();
});

// L'heure qui passe change le créneau restant et le moment (jour ou soir).
setInterval(() => {
  if (currentView() === 'app' && document.visibilityState === 'visible') paint();
}, 5 * 60 * 1000);

// Widget Android touché alors que l'app est déjà ouverte : elle passe à son enfant.
window.sbChoisirEnfant = (id) => {
  if (!state.household?.children.some((c) => c.id === id)) return;
  showChild(id);
  if (currentView() === 'app') paint();
};

async function boot() {
  takeImport();
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
    eveningTab();
  }
  paint();
  if (route() === 'widget') preloadLoader();
  if (state.household) loadData();
}

boot();
