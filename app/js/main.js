// Point d'entrée de l'app web Superbébé : état, actions, chargement des données et mises à jour.
import { addDays, clamp, evaluate, hourFr, momentOf, outfitAt, render, toMin } from '../../engine/engine.js';
import { buildInput, encodeConfig, parisNow, profileToConfig } from '../../engine/adapter.js';
import { communeAt, getClimate, getForecast, loadBundle, loadText, searchCommunes } from './data.js';
import { dayLong, dayShort } from './format.js';
import { store } from './storage.js';
import * as V from './views.js';

const ROOM_TTL_MS = 16 * 3600 * 1000;
const app = document.getElementById('app');

const state = {
  bundle: null,
  sourcesById: new Map(),
  profile: store.profile(),
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
  platform: /Android/i.test(navigator.userAgent) ? 'android' : 'ios',
  steps: new Set(),
  androidLink: '',
  promoHidden: store.promoHidden(),
  widgetReady: Boolean(store.widgetCopied()),
  confirmClear: false,
  updateReady: false,
};

const route = () => location.hash.replace('#', '');

function currentView() {
  if (!state.profile) return 'onboarding';
  const r = route();
  return ['reglages', 'widget', 'apropos'].includes(r) ? r : 'app';
}

const freshRoom = (profile) => (profile.room && Date.now() - profile.room.at < ROOM_TTL_MS ? profile.room.value : null);
const clock = (ms) => new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })
  .format(new Date(ms)).replace(':', ' h ');

// Les onglets Nuit et Prévoir parlent toujours d'aujourd'hui ; « Demain » ne concerne que l'onglet Sortir.
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
      room_temp_c: tomorrow ? null : freshRoom(p),
      inventory: p.inventory ?? {},
    },
    date,
    now: time,
    lat: p.commune.lat,
  });
  const result = evaluate(input, state.bundle);
  const hidden = store.hidden();
  result.purchases = result.purchases.filter((x) => !hidden.includes(x.key));
  const picked = state.pickedHour ? outfitAt(input, state.bundle, state.pickedHour) : null;
  return { input, result, date, moment: tomorrow ? 'jour' : momentOf(time), picked, tomorrow, forecast: state.forecast };
}

function newDraft(profile) {
  const now = parisNow().date;
  return {
    step: 1,
    commune: profile?.commune ?? null,
    query: profile?.commune?.nom ?? '',
    birthMonth: profile?.birth?.slice(5, 7) ?? now.slice(5, 7),
    birthYear: profile?.birth?.slice(0, 4) ?? now.slice(0, 4),
    transport: profile?.transport ?? 'poussette',
  };
}

let lastKey = '';
function paint() {
  const view = currentView();
  if ((view === 'onboarding' || view === 'reglages') && !state.draft) state.draft = newDraft(view === 'reglages' ? state.profile : null);
  const key = `${view}|${state.tab}|${state.day}|${state.draft?.step ?? ''}`;
  app.classList.toggle('anim', key !== lastKey);
  lastKey = key;
  let html;
  if (!state.bundle) html = state.error ? V.fatal(state.error) : V.loading();
  else if (view === 'onboarding') html = V.viewOnboarding(state);
  else if (view === 'reglages') html = V.viewSettings(state);
  else if (view === 'widget') {
    state.androidLink = androidLink();
    html = V.viewWidget(state, compute('aujourdhui'));
  } else if (view === 'apropos') html = V.viewAbout(state);
  else html = V.viewApp(state, compute(state.tab === 'sortir' ? state.day : 'aujourdhui'));
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
}

function updateProfile(patch) {
  state.profile = { ...state.profile, ...patch };
  store.saveProfile(state.profile);
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

const configText = () => encodeConfig(profileToConfig(state.profile), (s) => btoa(s));

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
  const lines = [`Superbébé · ${dayLong(date)} · ${state.profile.commune.nom}`];
  lines.push(w
    ? `Sortie idéale de ${hourFr(w.start)} à ${hourFr(w.end)}, ${Math.round(w.feels_c)} °C ressentis`
    : render(M, `outing.none.${result.outing.reason}`, 'text'));
  if (result.outfit) lines.push(`Tenue : ${result.outfit.items.map((i) => M.labels.items[i]).join(', ')}`);
  for (const note of result.outfit?.notes ?? []) lines.push(render(M, note, 'text', result.params));
  if (result.relays[0]) lines.push(`Repère officiel : ${render(M, result.relays[0], 'text', result.params)}`);
  return lines.join('\n');
}

function reportText() {
  const p = state.profile;
  const days = [...store.days()].sort();
  const transport = V.TRANSPORTS.find(([v]) => v === p.transport)?.[1] ?? p.transport;
  const pref = { '-1': 'a chaud', 0: 'normal', 1: 'a froid' }[Math.sign(p.outfit_offset ?? 0)];
  const owned = Object.values(p.inventory ?? {}).reduce((a, sizes) => a + sizes.length, 0);
  return [
    `Superbébé ${V.VERSION} · mes retours de test`,
    `Jours d'utilisation : ${days.length}${days.length ? ` (du ${dayShort(days[0])} au ${dayShort(days.at(-1))})` : ''}`,
    `Sorties : ${transport}, de ${hourFr(p.outing_window.from)} à ${hourFr(p.outing_window.to)}, ${p.outing_duration_h} h`,
    `Tendance de bébé : ${pref}`,
    `Garde-robe : ${owned} article(s) ; ${store.hidden().length} suggestion(s) masquée(s)`,
    `Widget : ${state.widgetReady ? 'configuré' : 'pas encore'}`,
  ].join('\n');
}

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
  updateProfile({ commune });
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
  transport(el) {
    updateProfile({ transport: el.dataset.value });
    paint();
  },
  pref(el) {
    updateProfile({ outfit_offset: Number(el.dataset.value) });
    paint();
  },
  duration(el) {
    const d = Number(el.dataset.value);
    if (toMin(state.profile.outing_window.to) - toMin(state.profile.outing_window.from) < d * 60) {
      toast('La plage horaire est plus courte que cette durée.');
      return;
    }
    updateProfile({ outing_duration_h: d });
    paint();
  },
  room(el) {
    const p = state.profile;
    const base = freshRoom(p) ?? p.room?.value ?? 19;
    const value = clamp(Math.round((base + Number(el.dataset.value)) * 2) / 2, 10, 35);
    updateProfile({ room: { value, at: Date.now() } });
    paint();
  },
  own(el) {
    const inventory = { ...(state.profile.inventory ?? {}) };
    inventory[el.dataset.cat] = [...new Set([...(inventory[el.dataset.cat] ?? []), el.dataset.size])];
    updateProfile({ inventory });
    toast('Ajouté à votre garde-robe.');
    paint();
  },
  hide(el) {
    store.hide(el.dataset.key);
    toast('Suggestion masquée.');
    paint();
  },
  inv(el) {
    const inventory = { ...(state.profile.inventory ?? {}) };
    const sizes = new Set(inventory[el.dataset.cat] ?? []);
    if (sizes.has(el.dataset.size)) sizes.delete(el.dataset.size);
    else sizes.add(el.dataset.size);
    inventory[el.dataset.cat] = [...sizes];
    updateProfile({ inventory });
    paint();
  },
  async share() {
    const ctx = compute(state.day);
    if (!ctx) return;
    const text = shareText(ctx);
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
    state.profile = {
      commune: d.commune,
      birth,
      transport: d.transport,
      outing_window: { from: '09:00', to: '18:00' },
      outing_duration_h: 1,
      outfit_offset: 0,
      inventory: {},
      room: null,
      created: Date.now(),
    };
    store.saveProfile(state.profile);
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
  async 'copy-loader'() {
    if (state.loader && (await copy(state.loader))) toast('Script copié : collez-le dans Scriptable.');
    paint();
  },
  async 'copy-config'() {
    if (await copy(configText())) {
      store.markWidgetCopied();
      state.widgetReady = true;
      toast('Configuration copiée : collez-la dans le champ Parameter du widget.');
    }
    paint();
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
      toast('Mise à jour automatique indisponible ici.');
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
    location.hash = '';
    location.reload();
  },
};

let searchTimer = null;
document.addEventListener('input', (event) => {
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
    if (birth && currentView() === 'reglages') updateProfile({ birth });
    paint();
  }
  if ((id === 'from' || id === 'to') && currentView() === 'reglages') {
    const next = { ...state.profile.outing_window, [id]: value };
    if (toMin(next.to) - toMin(next.from) < state.profile.outing_duration_h * 60) {
      d.error = 'La plage doit être au moins aussi longue que la sortie.';
    } else {
      d.error = null;
      updateProfile({ outing_window: next });
    }
    paint();
  }
});

document.addEventListener('click', (event) => {
  const step = event.target.closest('[data-step]');
  if (step) {
    state.steps.add(`${state.platform}-${step.dataset.step}`);
    if (step.dataset.step === '3') {
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
  if (!state.profile) return;
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

async function boot() {
  paint();
  try {
    state.bundle = await loadBundle();
    state.sourcesById = new Map(state.bundle.sources.sources.map((s) => [s.id, s]));
  } catch (e) {
    state.error = 'Impossible de charger l\'application. Vérifiez la connexion, puis rechargez.';
    paint();
    return;
  }
  if (state.profile) {
    const cached = store.forecast();
    if (cached?.code === state.profile.commune.code) {
      state.forecast = { ...cached, offline: false };
      state.updatedAt = clock(cached.at);
    }
    const climate = store.climate();
    if (climate?.code === state.profile.commune.code) state.climate = climate.years;
    store.markDay(state.today);
  }
  paint();
  if (route() === 'widget') preloadLoader();
  if (state.profile) loadData();
}

boot();
