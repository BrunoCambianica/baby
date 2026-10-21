// Point d'entrée de l'app web Superbébé : état, actions, chargement des données.
import { addDays, clamp, evaluate, momentOf, outfitAt, render, toMin } from '../../engine/engine.js';
import { buildInput, encodeConfig, parisNow, profileToConfig } from '../../engine/adapter.js';
import { communeAt, getClimate, getForecast, loadBundle, loadText, searchCommunes } from './data.js';
import { dayLong, dayShort, hourLabel, signed } from './format.js';
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
  today: parisNow().date,
  day: 'aujourdhui',
  momentOverride: null,
  pickedHour: null,
  draft: null,
  results: [],
  open: new Set(),
  installPrompt: null,
  loader: null,
  confirmClear: false,
  report: null,
};

const route = () => location.hash.replace('#', '');

function currentView() {
  if (!state.profile) return 'onboarding';
  const r = route();
  return ['reglages', 'widget', 'apropos'].includes(r) ? r : 'today';
}

const freshRoom = (profile) => (profile.room && Date.now() - profile.room.at < ROOM_TTL_MS ? profile.room.value : null);

function compute() {
  if (!state.forecast || !state.bundle) return null;
  const now = parisNow();
  const tomorrow = state.day === 'demain';
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
  const moment = tomorrow ? 'jour' : state.momentOverride ?? momentOf(time);
  return { input, result, date, moment, picked, tomorrow, forecast: state.forecast };
}

function newDraft(profile) {
  const now = parisNow().date;
  return {
    commune: profile?.commune ?? null,
    query: profile?.commune?.nom ?? '',
    birthMonth: profile?.birth?.slice(5, 7) ?? now.slice(5, 7),
    birthYear: profile?.birth?.slice(0, 4) ?? now.slice(0, 4),
    transport: profile?.transport ?? 'poussette',
    from: profile?.outing_window?.from ?? '09:00',
    to: profile?.outing_window?.to ?? '18:00',
    duration: profile?.outing_duration_h ?? 1,
  };
}

function report() {
  const feedback = store.feedback();
  const days = [...store.days()].sort();
  return {
    days: days.length,
    first: days[0],
    last: days.at(-1),
    bien: feedback.filter((f) => f.v === 0).length,
    chaud: feedback.filter((f) => f.v < 0).length,
    froid: feedback.filter((f) => f.v > 0).length,
    hidden: store.hidden().length,
    owned: Object.values(state.profile?.inventory ?? {}).reduce((a, sizes) => a + sizes.length, 0),
    widget: Boolean(store.widgetCopied()),
  };
}

function paint() {
  const view = currentView();
  if ((view === 'onboarding' || view === 'reglages') && !state.draft) state.draft = newDraft(state.profile);
  let html;
  if (!state.bundle) html = state.error ? V.fatal(state.error) : V.loading();
  else if (view === 'onboarding') html = V.viewOnboarding(state);
  else if (view === 'reglages') {
    state.report = report();
    html = V.viewSettings(state);
  } else if (view === 'widget') {
    state.platform = platform;
    state.androidLink = androidLink();
    html = V.viewWidget(state);
  }
  else if (view === 'apropos') html = V.viewAbout(state);
  else html = V.viewToday(state, compute());
  app.innerHTML = html;
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
  }, 3200);
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

const platform = /Android/i.test(navigator.userAgent) ? 'android' : /iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'ios' : 'autre';

function shareText(ctx) {
  const M = state.bundle.messages;
  const { result, date } = ctx;
  const w = result.outing.window;
  const lines = [`Superbébé · ${dayLong(date)} · ${state.profile.commune.nom}`];
  lines.push(w
    ? `Sortie conseillée : ${hourLabel(w.start)} - ${hourLabel(w.end)}, ${Math.round(w.feels_c)} °C ressentis`
    : render(M, `outing.none.${result.outing.reason}`, 'text'));
  if (result.outfit) lines.push(`Tenue : ${result.outfit.items.map((i) => M.labels.items[i]).join(', ')}`);
  for (const note of result.outfit?.notes ?? []) lines.push(render(M, note, 'text', result.params));
  if (result.relays[0]) lines.push(`Repère officiel : ${render(M, result.relays[0], 'text', result.params)}`);
  return lines.join('\n');
}

function reportText() {
  const r = report();
  const p = state.profile;
  const transport = V.TRANSPORTS.find(([v]) => v === p.transport)?.[1] ?? p.transport;
  return [
    `Superbébé ${V.VERSION} · mes retours de test`,
    `Jours d'utilisation : ${r.days}${r.first ? ` (du ${dayShort(r.first)} au ${dayShort(r.last)})` : ''}`,
    `Tenue : ${r.bien} bien, ${r.chaud} trop chaud, ${r.froid} trop froid (réglage ${signed(p.outfit_offset ?? 0)})`,
    `À prévoir : ${r.owned} article(s) déjà possédé(s), ${r.hidden} suggestion(s) pas utile(s)`,
    `Widget iPhone configuré : ${r.widget ? 'oui' : 'non'}`,
    `Sorties : ${transport}, de ${hourLabel(p.outing_window.from)} à ${hourLabel(p.outing_window.to)}`,
  ].join('\n');
}

function birthFromDraft(draft) {
  const birth = `${draft.birthYear}-${draft.birthMonth}`;
  if (birth > parisNow().date.slice(0, 7)) {
    draft.birthError = 'Ce mois est dans le futur.';
    return null;
  }
  draft.birthError = null;
  return birth;
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
  if (currentView() === 'today') paint();
  try {
    state.forecast = await getForecast(commune, { force });
    state.error = null;
  } catch (e) {
    state.error = 'Météo indisponible pour le moment. Vérifiez la connexion.';
  }
  state.loading = false;
  if (currentView() === 'today') paint();
  try {
    state.climate = await getClimate(commune, parisNow().date);
  } catch (e) {
    // Sans normales, les achats se limitent aux 16 jours de prévision.
  }
  state.climateReady = true;
  if (currentView() === 'today') paint();
}

const actions = {
  reload: () => location.reload(),
  refresh: () => loadData({ force: true }),
  day(el) {
    state.day = el.dataset.value;
    state.pickedHour = null;
    state.momentOverride = null;
    paint();
  },
  'toggle-moment'() {
    const current = state.momentOverride ?? momentOf(parisNow().time);
    state.momentOverride = current === 'jour' ? 'soir' : 'jour';
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
  'draft-transport'(el) {
    state.draft.transport = el.dataset.value;
    paint();
  },
  feedback(el) {
    const v = Number(el.dataset.value);
    const ctx = compute();
    store.addFeedback({ at: Date.now(), date: ctx?.date ?? null, band: ctx?.result.outfit?.band ?? null, v });
    updateProfile({ outfit_offset: clamp((state.profile.outfit_offset ?? 0) + v, -2, 2) });
    toast(v === 0
      ? 'Merci, c\'est noté.'
      : v < 0 ? 'Noté : les prochaines tenues seront un peu plus légères.' : 'Noté : les prochaines tenues seront un peu plus chaudes.');
    paint();
  },
  'reset-offset'() {
    updateProfile({ outfit_offset: 0 });
    toast('Tenues revenues au réglage standard.');
    paint();
  },
  async share() {
    const ctx = compute();
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
    toast('Ajouté à ce que vous avez déjà.');
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
  locate(el) {
    if (!navigator.geolocation) {
      toast('Position indisponible sur cet appareil.');
      return;
    }
    el.disabled = true;
    el.textContent = 'Recherche…';
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const commune = await communeAt(pos.coords.latitude, pos.coords.longitude);
          if (commune) {
            state.draft.commune = commune;
            state.draft.query = commune.nom;
            state.results = [];
          } else toast('Commune introuvable : saisissez-la.');
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
    state.draft.commune = commune;
    state.draft.query = commune.nom;
    state.results = [];
    paint();
  },
  async 'copy-loader'() {
    if (state.loader && (await copy(state.loader))) toast('Script copié : collez-le dans Scriptable.');
  },
  async 'copy-config'() {
    if (await copy(configText())) {
      store.markWidgetCopied();
      toast('Configuration copiée : collez-la dans le champ Paramètre du widget.');
    }
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
  async 'copy-report'() {
    if (await copy(reportText())) toast('Retours copiés.');
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

const forms = {
  onboarding() {
    const d = state.draft;
    const birth = birthFromDraft(d);
    if (!d.commune) {
      toast('Choisissez votre commune dans la liste.');
      return;
    }
    if (!birth) {
      paint();
      return;
    }
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
  settings() {
    const d = state.draft;
    const birth = birthFromDraft(d);
    if (!d.commune) {
      toast('Choisissez votre commune dans la liste.');
      return;
    }
    if (!birth) {
      paint();
      return;
    }
    if (toMin(d.to) - toMin(d.from) < Number(d.duration) * 60) {
      d.error = 'La plage horaire doit être au moins aussi longue que la sortie.';
      paint();
      return;
    }
    const communeChanged = d.commune.code !== state.profile.commune.code;
    updateProfile({
      commune: d.commune,
      birth,
      transport: d.transport,
      outing_window: { from: d.from, to: d.to },
      outing_duration_h: Number(d.duration),
    });
    if (communeChanged) {
      state.forecast = null;
      state.climate = [];
      state.climateReady = false;
    }
    toast('Réglages enregistrés.');
    location.hash = '';
    if (communeChanged) loadData({ force: true });
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
  const fields = { 'birth-month': 'birthMonth', 'birth-year': 'birthYear', from: 'from', to: 'to', duration: 'duration' };
  const key = fields[event.target.id];
  if (key && state.draft) state.draft[key] = event.target.value;
});

document.addEventListener('click', (event) => {
  const el = event.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const handler = actions[el.dataset.action];
  if (!handler) return;
  event.preventDefault();
  handler(el);
});

document.addEventListener('submit', (event) => {
  const form = event.target.closest('[data-form]');
  if (!form) return;
  event.preventDefault();
  forms[form.dataset.form]?.();
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
  if (currentView() !== 'onboarding') paint();
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !state.profile) return;
  const today = parisNow().date;
  if (today !== state.today) {
    state.today = today;
    state.day = 'aujourdhui';
    state.pickedHour = null;
  }
  store.markDay(today);
  loadData();
});

// Le moment (jour ou soir) et l'heure de fraîcheur changent avec le temps : on redessine régulièrement.
setInterval(() => {
  if (currentView() === 'today' && document.visibilityState === 'visible') paint();
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
    if (cached?.code === state.profile.commune.code) state.forecast = { ...cached, offline: false };
    const climate = store.climate();
    if (climate?.code === state.profile.commune.code) state.climate = climate.years;
    store.markDay(state.today);
  }
  paint();
  if (route() === 'widget') preloadLoader();
  if (state.profile) loadData();
}

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
boot();
