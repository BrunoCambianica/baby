// Point d'entrée de l'app web Superbébé : état, actions, chargement des données et mises à jour.
import { addDays, ageMonths, baseTransport, clamp, displayMoment, evaluate, fmtMin, homeMoment, hourFr, render, toMin } from '../../engine/engine.js';
import { buildInput, decodeConfig, encodeConfig, householdToConfig, outingWindow, parisNow, profileToConfig, widgetView } from '../../engine/adapter.js';
import { communeAt, getAir, getClimate, getForecast, loadBundle, loadText, searchCommunes } from './data.js';
import { ficheCanvas, ficheData, ficheText, encodeFiche } from './fiche.js';
import {
  api, apiBase, familyKeys, fromB64url, mergeHousehold, newSecret, seal, sharedPart, shortFicheLink, unseal,
} from './famille.js';
import { dayLong, dayShort } from './format.js';
import { ageLabel, feedbackStats, fromConfig, fromShared, isNewer, liveSwaps, migrate, newChild, outingHours, profileOf, withFeedback } from './household.js';
import { closeSheet, openSheet } from './listes.js';
import { store } from './storage.js';
import * as V from './views.js';

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
// Rappel avant une sortie choisie, et sorties transmises aux widgets : app Android 0.25 et plus, ou widget iPhone.
const androidOutings = host === 'android' && ask(() => typeof android.syncOutings === 'function' && typeof android.outingReminder === 'function', false);
const outingReminderHost = host === 'scriptable' || androidOutings;
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
  // Onglet affiché : Dehors (quand sortir, la tenue de la sortie), Dedans (le jour ou la nuit), Achats.
  tab: 'dehors',
  // Dehors : « aujourdhui » ou « demain » choisi par le parent ; null, selon l'heure (voir dehorsDay).
  day: null,
  // Dedans : « jour » (la pièce où il passe la journée) ou « nuit » (sa chambre), selon l'heure à l'ouverture.
  inside: homeMoment(parisNow().time),
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
  outingReminderHost,
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

// La température de chaque pièce, gardée d'un jour à l'autre comme une habitude (un thermostat) : `nuit`, sa chambre ;
// `jour`, la pièce où il passe la journée. Jamais notée : null, la tenue vaut pour le repère (en le disant).
const roomHabit = (profile, kind = 'nuit') => (kind === 'jour' ? profile.room_day : profile.room)?.value ?? null;
// Le widget Maison ouvre l'onglet Dedans sur la pièce du moment : le jour de 6 h à 18 h, la nuit ensuite.
function openHome() {
  state.tab = 'dedans';
  state.inside = homeMoment(parisNow().time);
}
const clock = (ms) => new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })
  .format(new Date(ms)).replace(':', ' h ');

// Les onglets Dedans et Achats parlent toujours d'aujourd'hui ; « Demain » ne concerne que l'onglet Dehors.
// `window` : une sortie ({ from, to }) à la place de la plage horaire, pour la tenue de cette sortie seulement.
// Le profil du moteur pour l'enfant affiché.
const engineProfile = (p, window = null) => ({
  birth: p.birth,
  transport: p.transport,
  outing_window: window ?? p.outing_window,
  outing_duration_h: p.outing_duration_h,
  outing_short: p.outing_short === true,
  outfit_offset: p.outfit_offset ?? 0,
  day_style: p.day_style ?? null,
  car_climate: p.car_climate ?? null,
  swaps: p.swaps ?? {},
  night_options: p.night_options ?? {},
  room_temp_c: roomHabit(p, 'nuit'),
  day_room_temp_c: roomHabit(p, 'jour'),
  inventory: p.inventory ?? {},
  wash_days: p.wash_days ?? null,
});

function compute(day, window = null) {
  if (!state.forecast || !state.bundle) return null;
  const now = parisNow();
  const tomorrow = day === 'demain';
  const date = tomorrow ? addDays(now.date, 1) : now.date;
  const time = tomorrow ? '07:00' : now.time;
  const p = state.profile;
  const input = buildInput({
    forecast: state.forecast.data,
    climate: state.climate,
    profile: engineProfile(p, window),
    date,
    now: time,
    lat: p.commune.lat,
    air: state.air ?? null,
  });
  const result = evaluate(input, state.bundle);
  const hidden = store.hidden();
  result.purchases = result.purchases.filter((x) => !hidden.includes(`${p.id}|${x.key}`));
  return { input, result, date, moment: tomorrow ? 'jour' : displayMoment(result, time), tomorrow, forecast: state.forecast };
}

// ——— Dehors : votre sortie ———
// Le jour affiché : celui choisi par le parent ; sinon aujourd'hui, ou demain une fois la dernière sortie possible passée
// (le soir, on prépare demain).
function dehorsDay() {
  if (state.day) return state.day;
  return compute('aujourdhui')?.moment === 'soir' ? 'demain' : 'aujourdhui';
}

// Les heures pleines d'une sortie, pour le moteur (engine/adapter.js, outingWindow).
const slotWindow = outingWindow;

// Les sorties d'un jour, gardées sur ce téléphone, de la plus ancienne à la plus récente : [{ s, d, auto }], s l'heure de
// départ, d la durée en heures, auto pour la sortie par défaut (maintenant, pour la durée réglée), notée dès qu'on la
// voit ; sans auto, une sortie choisie. `end` : sa fin, en minutes. Les versions 0.23 et 0.24 gardaient une seule
// heure, choisie, pour la durée réglée.
const OUTINGS_KEEP = 4;
function outingsOf(date) {
  const raw = store.outings()[date];
  const list = typeof raw === 'string' ? [{ s: raw }] : Array.isArray(raw) ? raw : [];
  const hours = outingHours(state.household);
  return list.filter((o) => typeof o?.s === 'string').map((o) => ({ ...o, d: o.d ?? hours, end: toMin(o.s) + (o.d ?? hours) * 60 }));
}
function saveOutings(date, list) {
  store.saveOutings(date, list.slice(-OUTINGS_KEEP).map(({ s, d, auto }) => (auto ? { s, d, auto } : { s, d })), parisNow().date);
  // Après le rendu en cours (une sortie par défaut se note pendant le calcul de l'écran).
  clearTimeout(outingSyncTimer);
  outingSyncTimer = setTimeout(() => {
    syncHost();
    writeSwData();
  }, 300);
}
let outingSyncTimer = null;

// Les sorties d'aujourd'hui et de demain, pour les widgets et les rappels : { 'AAAA-MM-JJ': [{ s, d, auto }] }.
function widgetOutings() {
  const today = parisNow().date;
  return Object.fromEntries([today, addDays(today, 1)]
    .map((date) => [date, outingsOf(date).map(({ s, d, auto }) => (auto ? { s, d, auto: true } : { s, d }))])
    .filter(([, list]) => list.length));
}

// La sortie par défaut, maintenant pour la durée réglée, est notée dès qu'on la voit : comme une sortie choisie, elle
// garde son heure de fin, et « C'était juste ? » portera sur elle. Pas si une sortie est en cours ou à venir, ni dans
// les RETURN_MIN minutes après la fin d'une sortie : on ouvre alors l'app en rentrant, pas pour sortir.
const RETURN_MIN = 30;
function noteDefaultOuting() {
  const now = parisNow();
  const nowMin = toMin(now.time);
  const list = outingsOf(now.date);
  if (list.some((o) => o.end > nowMin - RETURN_MIN)) return false;
  saveOutings(now.date, [...list, { s: fmtMin(Math.floor(nowMin / 5) * 5), d: outingHours(state.household), auto: true }]);
  return true;
}

// La sortie de ce jour-là : celle qui est en cours ou à venir (choisie, ou par défaut déjà notée), sinon maintenant
// (demain : le début de la plage horaire) ; le créneau idéal est à un toucher, dans le ciel et dans la bande. La bande
// des heures va de l'heure en cours (demain, de 7 h au plus tard) à LAST_START, sans que la sortie dépasse minuit.
// « Maintenant » part de l'heure qu'il est, arrondie aux 5 minutes ; la tenue couvre alors les heures entamées.
// `kept` : la sortie affichée est une sortie gardée.
const LAST_START = 21;
function outingSlot(ctx) {
  const hours = outingHours(state.household);
  const now = parisNow();
  const nowMin = toMin(now.time);
  const hourOf = (t) => Number(t.slice(0, 2));
  const first = ctx.tomorrow ? Math.min(7, hourOf(state.profile.outing_window.from)) : Math.max(6, hourOf(now.time));
  const last = Math.min(LAST_START, 24 - hours);
  const cells = ctx.input.forecast.hourly
    .map((h) => ({ time: h.time.slice(11, 16), feels_c: h.feels_c, weather_code: h.weather_code, precip_prob: h.precip_prob }))
    .filter((h) => hourOf(h.time) >= first && hourOf(h.time) <= last)
    .map((h) => ({ ...h, now: !ctx.tomorrow && hourOf(h.time) === hourOf(now.time) }));
  if (!cells.length) return { cells, hours };
  const has = (t) => cells.some((c) => c.time === t);
  const cur = outingsOf(ctx.date).filter((o) => ctx.tomorrow || o.end > nowMin).at(-1);
  // Une sortie déjà commencée (partie à 9 h 40, il est 10 h 10) reste la sienne jusqu'à sa fin : « Maintenant ».
  const going = Boolean(cur) && cells[0].now && toMin(cur.s) <= nowMin;
  const fallback = ctx.tomorrow ? (cells.find((c) => c.time >= state.profile.outing_window.from) ?? cells[0]).time : cells[0].time;
  const start = going ? cells[0].time : cur && has(cur.s) ? cur.s : fallback;
  const isNow = cells[0].now && start === cells[0].time;
  const end = going ? cur.end : isNow ? Math.floor(nowMin / 5) * 5 + hours * 60 : toMin(start) + hours * 60;
  const kept = going || (Boolean(cur) && has(cur.s));
  return { cells, hours, start, now: isNow, kept, end: fmtMin(Math.min(end, 24 * 60 - 5)), window: slotWindow(start, end) };
}

// Après un changement de durée, la sortie en cours ou à venir (aujourd'hui, demain) la prend aussi.
function retimeOutings(hours) {
  const now = parisNow();
  const nowMin = toMin(now.time);
  for (const date of [now.date, addDays(now.date, 1)]) {
    const live = (o) => date !== now.date || o.end > nowMin;
    const list = outingsOf(date);
    if (list.some(live)) saveOutings(date, list.map((o) => (live(o) ? { ...o, d: hours } : o)));
  }
}

// La sortie sur laquelle porte « C'était juste ? » : celle de la réponse du jour s'il y en a une (une réponse par jour),
// sinon la dernière finie aujourd'hui, choisie ou par défaut ; avec sa tenue (pour « En rentrant »). Une sortie choisie
// et finie depuis moins de BACK_MIN minutes : son retour vient en tête (`recent`) ; une sortie par défaut n'a peut-être
// été qu'un coup d'œil, sa question reste à sa place. Aucune finie, mais une en cours ou à venir : `pending`, rien à
// demander encore. Aucune sortie (ou une réponse sur la journée) : null, la question porte sur la journée.
const BACK_MIN = 120;
function doneOuting() {
  const now = parisNow();
  const nowMin = toMin(now.time);
  const list = outingsOf(now.date);
  const answer = state.profile.feedback?.[now.date];
  let o;
  if (answer) {
    if (!answer.s) return null;
    o = { s: answer.s, d: answer.d ?? 1, auto: Boolean(answer.a) };
    o.end = toMin(o.s) + o.d * 60;
  } else {
    o = list.filter((x) => x.end <= nowMin).at(-1);
    if (!o) return list.length ? { pending: true } : null;
  }
  const outing = compute('aujourdhui', slotWindow(o.s, o.end));
  if (!outing?.result.journee) return null;
  return { start: o.s, end: fmtMin(Math.min(o.end, 24 * 60 - 5)), hours: o.d, auto: Boolean(o.auto), outing, recent: !o.auto && nowMin < o.end + BACK_MIN };
}

// Dehors : la journée (créneau idéal, repères, fiche), la sortie choisie, et la tenue de cette sortie (`outing`), calculée
// par le moteur comme une journée réduite à ses heures : sa tenue, ses changements s'il y a lieu, son sac.
function dehorsCtx(day = dehorsDay()) {
  const ctx = compute(day);
  if (!ctx) return null;
  if (ctx.tomorrow) ctx.today = compute('aujourdhui');
  ctx.slot = outingSlot(ctx);
  if (ctx.slot.now && !ctx.slot.kept && noteDefaultOuting()) ctx.slot = outingSlot(ctx);
  ctx.outing = ctx.slot.window ? compute(day, ctx.slot.window) : null;
  ctx.done = doneOuting();
  return ctx;
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

// Animations : moins de mouvement si le téléphone le demande ; jamais de fondu d'écran sous un navigateur piloté (tests).
const calm = () => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
// Changer d'onglet, de jour ou de moment : un fondu enchaîné de tout l'écran, là où le navigateur sait le faire.
function transition(update) {
  if (!document.startViewTransition || calm() || navigator.webdriver) return update();
  return document.startViewTransition(update);
}

// Ce qu'on vient de toucher, redessiné, rebondit ; un nombre changé glisse vers le haut ou le bas ; une tenue qui change
// réapparaît pièce par pièce. Noté au toucher, appliqué au dessin qui suit.
const RESTYLE = new Set(['transport', 'slot', 'duration', 'swap', 'unswap', 'day-style', 'night-option', 'car-climate', 'pref', 'outfit-view']);
function applyPulse() {
  const p = state.pulse;
  state.pulse = null;
  if (!p || Date.now() - p.at > 1500) return;
  const find = (attrs) => app.querySelector(Object.entries(attrs).filter(([, v]) => v != null)
    .map(([k, v]) => `[data-${k}="${CSS.escape(String(v))}"]`).join(''));
  const tick = (n) => (Number(n) < 0 ? 'tick-down' : Number(n) > 0 ? 'tick-up' : 'pop');
  if (p.action === 'room') return app.querySelector('.stepper .hero-big')?.classList.add(tick(p.value));
  if (p.action === 'count') return find({ action: 'count', cat: p.cat, size: p.size, value: p.value })?.closest('.counter')?.querySelector('.counter-n')?.classList.add(tick(p.value));
  if (p.action === 'fold') app.querySelector('.hero-why')?.classList.add('reveal');
  if (RESTYLE.has(p.action)) app.querySelectorAll('.card .dress').forEach((ul) => ul.classList.add('restyle'));
  find({ action: p.action, value: p.value })?.classList.add('pop');
}

let lastKey = '';
let lastTab = '';
let lastHtml = '';
let enteredAt = -Infinity;
let tabbedAt = -Infinity;
// Redessiné juste après une entrée (la météo, puis les normales, arrivent l'une derrière l'autre) : l'entrée se rejoue,
// plutôt que de figer les cartes à mi-course.
const REPLAY_MS = 150;
function paint() {
  const view = currentView();
  if (['onboarding', 'reglages', 'enfant'].includes(view) && !state.draft) state.draft = newDraft(view);
  const key = `${view}|${route()}|${state.tab}|${state.day}|${state.inside}|${state.draft?.step ?? ''}`;
  const tab = view === 'app' ? state.tab : view;
  let html;
  if (!state.bundle) html = state.error ? V.fatal(state.error) : V.loading();
  else if (view === 'onboarding') html = V.viewOnboarding(state);
  else if (view === 'recevoir') html = V.viewReceive(state);
  else if (view === 'enfant') html = V.viewChild(state);
  else if (view === 'reglages') {
    state.updateLink = scriptableLink();
    state.androidLink = androidLink();
    state.bedtime = store.bedtime();
    state.buyCount = compute('aujourdhui')?.result.purchases.length ?? 0;
    html = V.viewSettings(state);
  }
  else if (view === 'widget') {
    state.androidLink = androidLink();
    // Le script à coller dans Scriptable, avec les réglages du moment.
    state.script = state.loader?.replace('__SB_CONFIG__', configText()) ?? null;
    const ctx = compute('aujourdhui');
    // Ce que montre le widget, calculé comme lui : la sortie (en cours, choisie, sinon maintenant), ou demain le soir.
    if (ctx) {
      const { date, time } = parisNow();
      ctx.widget = widgetView({ forecast: state.forecast.data, profile: engineProfile(state.profile), date, time, lat: state.profile.commune.lat, outings: widgetOutings() },
        state.bundle, { drawings: state.household.outfit_view !== 'texte' });
    }
    html = V.viewWidget(state, ctx);
  } else if (view === 'apropos') html = V.viewAbout(state);
  else {
    // Version navigateur sur Android : le widget Maison renvoie vers l'app Android (lien qui l'ouvre ou la télécharge).
    if (state.device === 'android' && !host && state.household) state.androidLink = androidLink();
    html = V.viewApp(state, state.tab === 'dehors' ? dehorsCtx() : compute('aujourdhui'));
  }
  if (state.updateReady) {
    html += '<div class="update" role="status">Nouvelle version prête<button class="btn small" data-action="apply-update">Recharger</button></div>';
  }
  // Rien de changé (une réponse du réseau qui ne change pas l'écran) : il reste tel quel, ses animations continuent.
  if (html === lastHtml && key === lastKey) {
    state.pulse = null;
    setThemeColor(view);
    return;
  }
  // Un nouvel écran entre en cascade ; l'onglet qui change étire sa pastille. Un écran d'attente (« Chargement… »)
  // laisse l'entrée au contenu qui le remplace.
  const now = performance.now();
  if (key !== lastKey) enteredAt = now;
  if (lastTab && tab !== lastTab) tabbedAt = now;
  app.classList.toggle('anim', now - enteredAt < REPLAY_MS);
  app.classList.toggle('tabbed', now - tabbedAt < REPLAY_MS);
  lastKey = html.includes('class="boot"') ? '' : key;
  lastTab = tab;
  lastHtml = html;
  // Les animations d'ambiance (ciel, étoiles) reprennent où elles en étaient, l'écran a beau être redessiné : leur
  // retard négatif suit l'horloge, sur un cycle de 36 s, multiple de toutes leurs durées.
  app.style.setProperty('--t', `-${((now / 1000) % 36).toFixed(2)}s`);
  // La bande des heures garde sa position quand on y touche ; un autre jour, ou le créneau idéal choisi depuis le ciel,
  // elle s'ouvre sur la sortie choisie.
  const before = app.querySelector('.strip');
  const kept = before ? { key: before.dataset.key, left: before.scrollLeft } : null;
  app.innerHTML = html;
  const strip = app.querySelector('.strip');
  if (strip) {
    const chosen = strip.querySelector('[aria-checked="true"]');
    if (kept && kept.key === strip.dataset.key && !state.centerStrip) strip.scrollLeft = kept.left;
    else if (chosen) strip.scrollLeft = chosen.offsetLeft - (strip.clientWidth - chosen.offsetWidth) / 2;
  }
  state.centerStrip = false;
  applyPulse();
  setThemeColor(view);
}

// Barre d'état d'Android assortie au ciel de l'écran (iOS garde sa barre standard).
const SKY = {
  clair: '#3b8cf6', nuageux: '#5b7aa0', pluie: '#3f5d7c', chaleur: '#ec7f24', froid: '#4a72c0',
  soir: '#5650c6', nuit: '#1e2a4a', prevoir: '#7c4ddb', maison: '#2f9a78', reglages: '#3b4a6b',
};

// Clair le jour, sombre la nuit : Intérieur de nuit, ou une sortie qui part après l'heure du coucher de bébé, passent
// en sombre ; les autres écrans suivent l'heure qu'il est (sombre après le coucher, et avant 6 h).
const isNight = (time, bed) => time >= bed || time < '06:00';
function darkTheme(view) {
  const bed = store.bedtime();
  const now = parisNow().time;
  if (view === 'app' && state.tab === 'dedans') return state.inside === 'nuit';
  if (view === 'app' && state.tab === 'dehors') {
    const ctx = compute(dehorsDay());
    const start = ctx?.slot?.start ?? (dehorsDay() === 'demain' ? '09:00' : now);
    return isNight(start, bed);
  }
  return isNight(now, bed);
}

function setThemeColor(view) {
  const meta = document.querySelector('meta[name="theme-color"]');
  const dark = darkTheme(view);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  if (!meta) return;
  let color = dark ? '#0b1324' : '#f8fafc';
  if (view === 'onboarding') color = SKY.clair;
  if (view === 'app') {
    const ctx = state.tab === 'dehors' ? compute(dehorsDay()) : null;
    if (state.tab === 'dedans') color = state.inside === 'nuit' ? SKY.nuit : SKY.maison;
    else if (state.tab === 'prevoir') color = SKY.prevoir;
    else color = ctx ? SKY[V.sortirTheme(ctx)] : SKY.clair;
  }
  if (view === 'reglages') color = SKY.reglages;
  meta.setAttribute('content', color);
  // Barres du système de l'app Android : ciel en haut, couleur de la barre d'onglets en bas.
  const bottom = view === 'app' || view === 'reglages' ? (dark ? '#162238' : '#ffffff') : dark ? '#0b1324' : '#f8fafc';
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
    // Le rappel avant une sortie : sa propre autorisation demandée s'il est seul activé.
    if (androidOutings) {
      const before = ask(() => android.outingReminder(Boolean(next.before)), 'off');
      if (!next.on || state.reminderState === 'off') state.reminderState = before;
    }
    if (state.reminderState === 'demande') toast('Autorisez les notifications de Superbébé.');
  }
  if (host === 'scriptable') {
    syncHost();
    if (next.on || next.before) toast(`${next.on ? `Rappel vers ${hourFr(next.at)}` : 'Rappel avant vos sorties'}. Scriptable demandera peut-être l'autorisation d'envoyer des notifications.`);
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
  const data = { household: state.household, reminder: state.reminder, forecast: state.forecast?.data ?? null, air: state.air ?? null, outings: widgetOutings() };
  caches.open('superbebe-donnees').then((cache) => cache.put('donnees.json', new Response(JSON.stringify(data)))).catch(() => {});
}

// Réglages du foyer : commune, horaires, affichage. Les dates de changement servent à fusionner avec l'autre parent.
function updateHousehold(patch) {
  const now = Date.now();
  const shared = ['commune', 'outing_window', 'outing_duration_h', 'outing_short', 'wash_days'].some((k) => k in patch);
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
      // Les sorties d'aujourd'hui et de demain : le widget montre la même que l'app, et le rappel avant de sortir s'y cale.
      if (androidOutings) ask(() => android.syncOutings(h ? JSON.stringify(widgetOutings()) : '{}'));
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
  // sorties= : les sorties d'aujourd'hui et de demain (JSON) ; avant= : le rappel avant une sortie choisie.
  const reminder = `&rappel=${h && state.reminder.on ? state.reminder.at : '0'}&avant=${h && state.reminder.before ? 1 : 0}${h ? `&sorties=${encodeURIComponent(JSON.stringify(widgetOutings()))}` : ''}`;
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
    state.air = null;
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
    openHome();
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
const capitalize = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');

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

// « C'était juste ? » : le compte des réponses, puis les 14 dernières de chaque enfant (jour, mode, ressenti, tranche).
function feedbackReport(children) {
  const all = children.flatMap((c) => Object.values(c.feedback ?? {}));
  const stats = feedbackStats(Object.fromEntries(all.map((e, k) => [k, e])));
  if (!stats.total) return ['Tenues jugées : pas encore de réponse à « C\'était juste ? »'];
  const word = { juste: 'juste', chaud: 'trop chaud', froid: 'trop froid' };
  const mode = (t) => (V.TRANSPORTS.find(([v]) => v === t)?.[1] ?? t ?? '').toLowerCase();
  return [
    `Tenues jugées : ${stats.total} réponse(s), ${stats.juste} juste(s) (${Math.round((100 * stats.juste) / stats.total)} %), ${stats.chaud} trop chaud, ${stats.froid} trop froid`,
    ...children.filter((c) => Object.keys(c.feedback ?? {}).length).map((c) => `  Enfant ${children.indexOf(c) + 1} : ${Object.entries(c.feedback).slice(-14)
      .map(([day, e]) => `${dayShort(day)}${e.s ? ` sortie ${hourFr(e.s)} ${V.durationLabel(e.d)}${e.a ? ' (par défaut)' : ''}` : ''} ${mode(e.t)} ${e.f?.[0]}°→${e.f?.[1]}° (${e.b}) ${word[e.v]}`).join(' ; ')}`),
  ];
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
    `Sorties : de ${hourFr(h.outing_window.from)} à ${hourFr(h.outing_window.to)}, ${V.durationLabel(outingHours(h))}`,
    `Garde-robe : ${owned} article(s) ; ${store.hidden().length} suggestion(s) masquée(s)`,
    ...feedbackReport(h.children),
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
    // L'air en même temps que la météo ; sans réponse, l'app répond sans lui (getAir ne lève pas d'erreur).
    const [forecast, air] = await Promise.all([getForecast(commune, { force }), getAir(commune, { force })]);
    state.forecast = forecast;
    state.air = air;
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
  state.air = null;
  state.climate = [];
  state.climateReady = false;
  toast(`Commune : ${commune.nom}`);
  loadData({ force: true });
}

const actions = {
  reload: () => location.reload(),
  'apply-update': () => location.reload(),
  refresh: () => loadData({ force: true }),
  // Réglages est un onglet comme les autres : on y va, ou on en revient, dans le même fondu.
  tab(el) {
    const value = el.dataset.value;
    transition(() => {
      if (value !== 'reglages') state.tab = value;
      if (value === 'reglages') {
        if (currentView() !== 'reglages') navigate('reglages');
      } else if (currentView() !== 'app') navigate('');
      else paint();
      window.scrollTo(0, 0);
    });
  },
  // Réglages repliés sous une tenue (la pièce de la carte « Dedans ») : ouverts ou fermés, gardés le temps de la session.
  fold(el) {
    const name = el.dataset.value;
    if (state.open.has(name)) state.open.delete(name);
    else state.open.add(name);
    paint();
  },
  day(el) {
    transition(() => {
      state.day = el.dataset.value;
      state.tab = 'dehors';
      paint();
    });
  },
  // Dedans : le jour (la pièce où il passe la journée) ou la nuit (sa chambre), chacun avec sa température gardée.
  inside(el) {
    transition(() => {
      state.inside = el.dataset.value === 'nuit' ? 'nuit' : 'jour';
      state.tab = 'dedans';
      paint();
    });
  },
  // Votre sortie : l'heure de départ touchée dans la bande des heures, gardée pour ce jour-là sur ce téléphone.
  // L'heure en cours : on part maintenant (à 5 minutes près), et la sortie le reste jusqu'à sa fin.
  slot(el) {
    const now = parisNow();
    const nowMin = toMin(now.time);
    const tomorrow = dehorsDay() === 'demain';
    const date = tomorrow ? addDays(now.date, 1) : now.date;
    const start = 'now' in el.dataset ? fmtMin(Math.floor(nowMin / 5) * 5) : el.dataset.value;
    // La sortie choisie remplace celle qui était en cours ou à venir ; les sorties finies restent.
    const ended = tomorrow ? [] : outingsOf(date).filter((o) => o.end <= nowMin);
    saveOutings(date, [...ended, { s: start, d: outingHours(state.household) }]);
    if ('center' in el.dataset) state.centerStrip = true;
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
  // Voiture chauffée ou climatisée (par défaut), ou ni l'un ni l'autre : depuis la carte « Dehors » en voiture.
  'car-climate'(el) {
    const on = el.dataset.value === 'oui';
    updateChild({ car_climate: on ? null : false });
    toast(on ? 'Voiture chauffée ou climatisée : comme à la maison dans le siège.' : 'Sans chauffage ni clim : habillé comme dehors dans la voiture.');
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
  // Une pièce de la tenue touchée : pourquoi elle est là, et ses équivalents (pour ce jour-là, ou toujours).
  piece(el) {
    const { value, where, date } = el.dataset;
    const day = date === parisNow().date ? 'aujourdhui' : 'demain';
    const outing = where === 'dehors' ? dehorsCtx(day) : null;
    const ctx = outing ? outing.outing ?? outing : compute(day);
    if (!ctx) return;
    const { title, html } = V.pieceSheet(state, ctx, value, where);
    openSheet(title, html);
  },
  // Un équivalent choisi : pour ce jour-là, ou toujours pour cet enfant. Le moteur le revérifie chaque jour.
  swap(el) {
    const { from, to, scope, date } = el.dataset;
    const labels = state.bundle.messages.labels;
    const swaps = liveSwaps(state.profile.swaps, parisNow().date);
    // Pas d'aller-retour : choisir le gilet à la place du pull efface le pull à la place du gilet.
    delete swaps[to];
    swaps[from] = scope === 'always' ? { to } : { to, day: date };
    closeSheet();
    updateChild({ swaps });
    toast(`${capitalize(labels.items_short[to])} plutôt que ${labels.items_short[from]}, ${scope === 'always' ? 'toujours' : date === parisNow().date ? "aujourd'hui" : 'demain'}.`);
    paint();
  },
  unswap(el) {
    const swaps = liveSwaps(state.profile.swaps, parisNow().date);
    delete swaps[el.dataset.value];
    closeSheet();
    updateChild({ swaps });
    toast(`Retour au conseil : ${state.bundle.messages.labels.items_short[el.dataset.value]}.`);
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
  // 15 minutes avant une sortie dont on a choisi l'heure : sa tenue et son sac.
  'reminder-before'(el) {
    setReminder({ ...state.reminder, before: el.dataset.value === 'on' });
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
    updateHousehold({ outing_duration_h: Math.max(1, Math.ceil(d)), outing_short: d < 1 });
    retimeOutings(d);
    paint();
  },
  // Température du jour (pièce de vie) ou de la nuit (chambre), gardée comme une habitude. On part de la valeur
  // affichée : celle déjà notée, sinon 21 °C le jour et 19 °C la nuit ; « 0 » la confirme telle quelle.
  room(el) {
    const p = state.profile;
    const kind = el.dataset.kind === 'jour' ? 'jour' : 'nuit';
    const base = roomHabit(p, kind) ?? Number(el.dataset.base || (kind === 'jour' ? 21 : 19));
    const value = clamp(Math.round((base + Number(el.dataset.value)) * 2) / 2, 10, 35);
    updateChild({ [kind === 'jour' ? 'room_day' : 'room']: { value, at: Date.now() } });
    paint();
  },
  // Garde-robe : une pièce de plus ou de moins dans une taille. La liste garde une taille par pièce (« 6m » trois fois :
  // trois), que les versions précédentes lisent toujours comme « j'en ai ».
  count(el) {
    const { cat, size } = el.dataset;
    const inventory = { ...(state.profile.inventory ?? {}) };
    const list = [...(inventory[cat] ?? [])];
    // Une gigoteuse notée avant la 0.16, sans TOG, compte comme chaude (2,5 TOG) ou légère (1 TOG) : c'est elle qu'on
    // retire quand il n'y en a pas de notée avec ce TOG.
    const S = state.bundle.rules.purchases.sleepbags;
    const [code, tog] = size.split('|');
    const legacy = cat === S.inventory && Object.entries(S.legacy).find(([id, t]) => t === tog && (inventory[id] ?? []).includes(code))?.[0];
    if (Number(el.dataset.value) > 0) list.push(size);
    else if (list.includes(size)) list.splice(list.lastIndexOf(size), 1);
    else if (legacy) {
      const old = [...inventory[legacy]];
      old.splice(old.lastIndexOf(code), 1);
      if (old.length) inventory[legacy] = old;
      else delete inventory[legacy];
    }
    if (list.length) inventory[cat] = list;
    else delete inventory[cat];
    updateChild({ inventory });
    if (Number(el.dataset.value) > 0 && el.classList.contains('btn')) toast('Ajouté à votre garde-robe.');
    paint();
  },
  // « C'était juste ? » : la réponse du jour, avec ce qu'il faut pour la relire (mode, tranche, ressenti, tendance) ;
  // après une sortie, choisie ou par défaut, sur cette sortie (son heure, sa durée, sa tenue ; a : la sortie par défaut).
  // Toucher la réponse déjà donnée la retire.
  feedback(el) {
    const done = doneOuting();
    const ctx = done?.outing ?? compute('aujourdhui');
    const j = ctx?.result.journee;
    if (!j) return;
    const v = el.dataset.value;
    const p = state.profile;
    const entry = p.feedback?.[state.today]?.v === v ? null : {
      v, t: baseTransport(ctx.result.transport, state.bundle.rules), b: j.band, f: [j.feels.first, j.feels.extreme], o: p.outfit_offset ?? 0,
      ...(done?.outing ? { s: done.start, d: done.hours, ...(done.auto ? { a: 1 } : {}) } : {}),
    };
    updateChild({ feedback: withFeedback(p.feedback, state.today, entry) });
    paint();
  },
  // « Pas sorti ? Masquer », sur le retour d'une sortie choisie : l'heure avait été touchée pour regarder. La sortie est
  // oubliée, avec la réponse donnée sur elle ; la question revient sur la sortie d'avant, ou sur la journée.
  'not-out'() {
    const done = doneOuting();
    if (!done?.start || done.auto) return;
    const date = parisNow().date;
    saveOutings(date, outingsOf(date).filter((o) => o.auto || o.s !== done.start));
    const p = state.profile;
    if (p.feedback?.[state.today]?.s === done.start) updateChild({ feedback: withFeedback(p.feedback, state.today, null) });
    toast('Sortie oubliée.');
    paint();
  },
  // La tendance proposée après deux réponses dans le même sens : un cran plus léger ou plus chaud, comme dans les réglages.
  'feedback-tendance'(el) {
    const value = Number(el.dataset.value);
    const lighter = value < (state.profile.outfit_offset ?? 0);
    updateChild({ outfit_offset: value });
    toast(`Tendance « ${{ '-1': 'a chaud', 0: 'normal', 1: 'a froid' }[value]} » : ses tenues sont un cran plus ${lighter ? 'légères' : 'chaudes'}. Réglages, Tendance, pour revenir.`);
    paint();
  },
  // Depuis une tenue : la garde-robe, ouverte sur l'onglet Achats.
  'open-wardrobe'() {
    closeSheet();
    state.tab = 'prevoir';
    state.open.add('garde-robe');
    paint();
    document.querySelector('.wardrobe')?.scrollIntoView({ block: 'start' });
  },
  // Rythme de lessive, commun au foyer : il fixe les quantités conseillées des vêtements de tous les jours.
  // Heure du coucher de bébé : après elle, l'app passe en sombre (Réglages, Affichage).
  bedtime(el) {
    store.saveBedtime(el.dataset.value);
    paint();
  },
  wash(el) {
    updateHousehold({ wash_days: Number(el.dataset.value) });
    paint();
  },
  hide(el) {
    store.hide(`${state.profile.id}|${el.dataset.key}`);
    toast('Suggestion masquée.');
    paint();
  },
  // Fiche de la journée pour la nounou, la crèche ou les grands-parents : image et lien (les données sont après le #).
  // Celle du jour affiché dans Dehors (le soir, demain).
  async 'share-fiche'() {
    const ctx = compute(dehorsDay());
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
  // L'app elle-même (le site) et, dans l'app Android, l'APK (l'app installée et ses widgets) : vérifiés ensemble.
  // Un APK plus récent : la ligne « Mettre à jour l'app Android » apparaît, qui le télécharge.
  async 'check-update'() {
    if (state.updateReady) {
      location.reload();
      return;
    }
    const registration = await navigator.serviceWorker?.getRegistration();
    await Promise.all([registration?.update().catch(() => {}), loadApkLatest()]);
    if (V.apkUpdate(state)) {
      paint();
      toast(`L'app Android ${state.apkLatest.versionName} est prête : touchez « Mettre à jour l'app Android ».`);
      return;
    }
    // Ouverte depuis le widget iPhone, l'app est rechargée du site à chaque fois.
    if (!registration && !host) {
      toast('Mise à jour automatique indisponible ici.');
      return;
    }
    const versions = `app ${V.VERSION}${state.androidVersion ? `, app Android ${state.androidVersion}` : ''}`;
    setTimeout(() => {
      if (!state.updateReady) toast(`Vous avez la dernière version (${versions}).`);
      if (currentView() === 'reglages') paint();
    }, registration ? 1500 : 0);
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
  const { action, value, cat, size } = el.dataset;
  state.pulse = { action, value, cat, size, at: Date.now() };
  handler(el);
});

document.addEventListener('toggle', (event) => {
  const name = event.target.dataset?.details;
  if (!name) return;
  // Une carte dépliée d'office (« Bien porter » avant 4 mois) reste repliée une fois que le parent l'a repliée.
  state.closed ??= new Set();
  if (event.target.open) {
    // Déplié au toucher (pas redessiné ouvert) : son contenu apparaît en douceur.
    event.target.classList.add('opened');
    state.open.add(name);
    state.closed.delete(name);
  } else {
    state.open.delete(name);
    state.closed.add(name);
  }
}, true);

// Aller à une page (« reglages ») ou revenir à l'app (« ») tout de suite, sans attendre l'événement hashchange :
// le fondu d'écran doit voir le nouvel écran dans son propre appel. Le retour du téléphone reste possible.
function navigate(hash) {
  history.pushState(null, '', hash ? `#${hash}` : location.pathname + location.search);
  state.draft = null;
  state.results = [];
  state.confirmClear = false;
  paint();
}

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

// Revenu dans l'app après plus d'une demi-heure : le jour de Dehors et le moment de Dedans suivent de nouveau l'heure.
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') {
    hiddenAt = Date.now();
    return;
  }
  if (hiddenAt && Date.now() - hiddenAt > 30 * 60 * 1000) {
    state.day = null;
    state.inside = homeMoment(parisNow().time);
  }
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
    state.day = null;
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
  openHome();
  if (route()) location.hash = '';
  paint();
};

// App Android : la dernière version publiée de l'APK, pour proposer la mise à jour dans les réglages.
function loadApkLatest() {
  if (host !== 'android') return Promise.resolve();
  return fetch(new URL(`../dist/android-version.json?t=${Date.now()}`, location.href), { cache: 'no-store' })
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
