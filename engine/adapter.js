// Adaptateur Open-Meteo → entrée du moteur. Fonctions pures, partagées par l'app web et le widget iPhone.
// N'utilise que du JavaScript standard (pas d'API du navigateur), pour tourner aussi dans Scriptable.
import {
  addDays, displayMoment, evaluate, frNumber, homeLines, homeMoment, homeTable, mean, reminderText, round1, skyTheme, widgetLines, widgetShort,
} from './engine.js';

export const PARIS_TZ = 'Europe/Paris';
export const FORECAST_DAYS = 16;
const OUTLOOK_WEEKS = 6;
const CLIMATE_YEARS = 3;
const HOURLY = 'temperature_2m,apparent_temperature,precipitation_probability,precipitation,wind_gusts_10m,uv_index,weather_code';
const DAILY = 'sunrise,sunset,temperature_2m_max,temperature_2m_mean,precipitation_sum,uv_index_max';
const CLIMATE_DAILY = 'temperature_2m_max,temperature_2m_mean,precipitation_sum';

// Indice UV maximal typique par mois (ciel peu nuageux), valeurs indicatives pour la métropole,
// utilisées seulement au-delà des 16 jours de prévision.
const UV_TYPICAL = {
  nord: [1, 1.5, 3, 4.5, 6, 7, 7, 6, 4, 2.5, 1.2, 0.8],
  sud: [1.5, 2.5, 4, 5.5, 7, 8, 8, 7, 5, 3, 1.5, 1],
};

const coord = (x) => Number(x).toFixed(4);

export function forecastUrl({ lat, lon }) {
  return 'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${coord(lat)}&longitude=${coord(lon)}&hourly=${HOURLY}&daily=${DAILY}` +
    `&timezone=${encodeURIComponent(PARIS_TZ)}&forecast_days=${FORECAST_DAYS}`;
}

const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
function yearsBefore(day, n) {
  const y = Number(day.slice(0, 4)) - n;
  const rest = day.slice(4);
  return rest === '-02-29' && !isLeap(y) ? `${y}-02-28` : `${y}${rest}`;
}

// Normales récentes : mêmes semaines des trois dernières années (au-delà de 16 jours de prévision).
export function climateUrls({ lat, lon }, date) {
  const start = addDays(date, 14);
  const end = addDays(date, OUTLOOK_WEEKS * 7 - 1);
  return Array.from({ length: CLIMATE_YEARS }, (_, k) =>
    'https://archive-api.open-meteo.com/v1/archive' +
    `?latitude=${coord(lat)}&longitude=${coord(lon)}` +
    `&start_date=${yearsBefore(start, k + 1)}&end_date=${yearsBefore(end, k + 1)}` +
    `&daily=${CLIMATE_DAILY}&timezone=${encodeURIComponent(PARIS_TZ)}`);
}

export function parisNow(at = new Date()) {
  const parts = {};
  for (const p of new Intl.DateTimeFormat('en-GB', {
    timeZone: PARIS_TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(at)) parts[p.type] = p.value;
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

export function hourlyForDate(forecast, date) {
  const h = forecast.hourly;
  const hours = [];
  h.time.forEach((time, i) => {
    if (!time.startsWith(date)) return;
    const temp = h.temperature_2m[i];
    const feels = h.apparent_temperature[i] ?? temp;
    if (feels == null) return;
    const mm = h.precipitation[i] ?? 0;
    hours.push({
      time,
      temp_c: temp ?? feels,
      feels_c: feels,
      precip_prob: h.precipitation_probability[i] ?? (mm > 0 ? 100 : 0),
      precip_mm: mm,
      gust_kmh: h.wind_gusts_10m[i] ?? 0,
      uv: h.uv_index[i] ?? 0,
      weather_code: h.weather_code?.[i] ?? null,
    });
  });
  return hours;
}

export function daylightForDate(forecast, date) {
  const i = forecast.daily.time.indexOf(date);
  if (i < 0 || !forecast.daily.sunrise[i]) return { sunrise: '07:00', sunset: '19:00' };
  return { sunrise: forecast.daily.sunrise[i].slice(11, 16), sunset: forecast.daily.sunset[i].slice(11, 16) };
}

export function forecastDays(forecast) {
  return forecast.daily.time.filter((day, i) => forecast.daily.temperature_2m_max[i] != null);
}

// Six semaines à venir : prévisions sur 16 jours, puis moyenne des mêmes jours des années passées.
export function weeklyOutlook({ forecast, climate = [], date, lat }) {
  const fd = forecast.daily;
  const past = new Map();
  for (const c of climate) {
    if (!c?.daily?.time) continue;
    c.daily.time.forEach((day, i) => {
      const key = day.slice(5);
      if (!past.has(key)) past.set(key, []);
      past.get(key).push({
        tmax: c.daily.temperature_2m_max[i],
        tmean: c.daily.temperature_2m_mean[i],
        rain: c.daily.precipitation_sum[i],
      });
    });
  }
  const uvTable = lat < 46 ? UV_TYPICAL.sud : UV_TYPICAL.nord;
  const uvOf = (day) => uvTable[Number(day.slice(5, 7)) - 1];
  const weeks = [];
  for (let w = 0; w < OUTLOOK_WEEKS; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const day = addDays(date, w * 7 + d);
      const i = fd.time.indexOf(day);
      if (i >= 0 && fd.temperature_2m_max[i] != null) {
        days.push({
          tmax: fd.temperature_2m_max[i],
          tmean: fd.temperature_2m_mean[i] ?? fd.temperature_2m_max[i] - 4,
          rainy: (fd.precipitation_sum[i] ?? 0) >= 1 ? 1 : 0,
          uv: fd.uv_index_max[i] ?? uvOf(day),
          from: 'prevision',
        });
        continue;
      }
      const years = (past.get(day.slice(5)) ?? []).filter((p) => p.tmax != null);
      if (!years.length) continue;
      days.push({
        tmax: mean(years.map((p) => p.tmax)),
        tmean: mean(years.map((p) => p.tmean ?? p.tmax - 4)),
        rainy: years.filter((p) => (p.rain ?? 0) >= 1).length / years.length,
        uv: uvOf(day),
        from: 'normales',
      });
    }
    if (days.length < 4) break;
    weeks.push({
      week_start: addDays(date, w * 7),
      tmax_mean: round1(mean(days.map((d) => d.tmax))),
      tmean: round1(mean(days.map((d) => d.tmean))),
      rainy_days: round1((days.reduce((a, d) => a + d.rainy, 0) * 7) / days.length),
      uv_max_mean: round1(mean(days.map((d) => d.uv))),
      source: days.every((d) => d.from === 'prevision') ? 'prevision' : days.every((d) => d.from === 'normales') ? 'normales' : 'mixte',
    });
  }
  return weeks;
}

export function buildInput({ forecast, climate = [], profile, date, now, lat }) {
  const i = forecast.daily.time.indexOf(date);
  return {
    date,
    now,
    profile,
    forecast: {
      daylight: daylightForDate(forecast, date),
      hourly: hourlyForDate(forecast, date),
      daily: { tmax_c: i >= 0 ? forecast.daily.temperature_2m_max[i] : null },
    },
    // La vigilance Météo-France et les épisodes de pollution ne sont pas encore branchés (v0.1).
    alerts: { vigilance: [], air: null },
    outlook: weeklyOutlook({ forecast, climate, date, lat: lat ?? forecast.latitude }),
  };
}

// Ce qu'affiche un widget pour un enfant, à une heure donnée. Le jour : la journée en couches. Le soir : la tenue
// et le sac de demain, à préparer, avec la nuit. `reminder` : calcule aussi le rappel du soir (tenue de demain).
export function widgetView({ forecast, profile, date, time, lat }, bundle, { drawings = true, reminder = false } = {}) {
  const today = evaluate(buildInput({ forecast, profile, date, now: time, lat }), bundle);
  const moment = displayMoment(today, time);
  const tomorrow = moment === 'soir' || reminder
    ? evaluate(buildInput({ forecast, profile: { ...profile, room_temp_c: null }, date: addDays(date, 1), now: '07:00', lat }), bundle)
    : null;
  return {
    today,
    tomorrow,
    moment,
    lines: widgetLines(today, moment, bundle.messages, { drawings, tomorrow: moment === 'soir' ? tomorrow : null }),
    theme: skyTheme(today, moment),
    short: widgetShort(today, moment),
    check: today.widget.check,
    check_tiny: today.widget.check_tiny,
    reminder: tomorrow?.journee ? reminderText(today, tomorrow, bundle.messages) : null,
  };
}

// Ce qu'affiche le widget Maison pour un enfant : de 6 h à 18 h la journée chez vous, ensuite la nuit dans sa chambre.
// Le relevé du moment, la tenue, l'état par rapport au repère ; `short` pour le widget rond de l'écran verrouillé.
export function homeWidgetView({ forecast, profile, date, time, lat }, bundle, { drawings = true } = {}) {
  const today = evaluate(buildInput({ forecast, profile, date, now: time, lat }), bundle);
  const kind = homeMoment(time);
  const plan = kind === 'nuit' ? today.night : today.indoor;
  return {
    today,
    kind,
    lines: homeLines(today, kind, bundle, { drawings }),
    theme: kind === 'nuit' ? 'nuit' : 'maison',
    short: plan.room_temp_c === null ? (kind === 'nuit' ? `${today.night.tog}` : '—') : `${frNumber(plan.room_temp_c)}°`,
    check: today.widget.check,
    check_tiny: today.widget.check_tiny,
  };
}

// Les tenues de la maison pour chaque relevé possible (widget Maison d'Android, voir homeTable).
export const homeWidgetTable = ({ profile, date }, bundle, options) => homeTable({ date, profile }, bundle, options);

// Configuration partagée entre l'app web et les widgets : JSON en ASCII, puis base64url.
// v1 : un seul enfant (b, t, o à la racine) ; v2 : la commune, les horaires et les enfants (k).
export const CONFIG_PREFIX = 'SB1.';
const validChild = (c) => Boolean(c) && /^\d{4}-\d{2}/.test(c.b ?? '');

export function encodeConfig(cfg, toBase64) {
  const ascii = JSON.stringify(cfg).replace(/[\u007f-￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
  return CONFIG_PREFIX + toBase64(ascii).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeConfig(text, fromBase64) {
  const raw = String(text ?? '').trim();
  if (!raw.startsWith(CONFIG_PREFIX)) return null;
  try {
    let b64 = raw.slice(CONFIG_PREFIX.length).replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const cfg = JSON.parse(fromBase64(b64));
    const place = Boolean(cfg) && Number.isFinite(cfg.la) && Number.isFinite(cfg.lo);
    const children = cfg?.v === 2 ? Array.isArray(cfg.k) && cfg.k.length > 0 && cfg.k.every(validChild) : cfg?.v === 1 && validChild(cfg);
    return place && children ? cfg : null;
  } catch (e) {
    return null;
  }
}

// Les clés c (code Insee), dp (département) et i (tenue en dessins : 1, en texte : 0) sont facultatives :
// les anciennes configurations restent valables et affichent les dessins.
export function profileToConfig(profile) {
  return {
    v: 1,
    n: profile.commune.nom,
    c: profile.commune.code,
    dp: profile.commune.dep,
    la: profile.commune.lat,
    lo: profile.commune.lon,
    b: profile.birth,
    t: profile.transport,
    f: profile.outing_window.from,
    u: profile.outing_window.to,
    d: profile.outing_duration_h,
    o: profile.outfit_offset ?? 0,
    i: profile.outfit_view === 'texte' ? 0 : 1,
  };
}

// Configuration v2 : commune et horaires communs, un enfant par entrée de k (identifiant, prénom, naissance, mode, tendance,
// et s'il y a lieu s, style de la journée, g, tenues de nuit choisies par tranche, et cm, une chancelière dans sa
// garde-robe, que les widgets n'ont pas) et m, date du dernier changement :
// la plus récente l'emporte entre l'app et les widgets.
export function householdToConfig(household) {
  return {
    v: 2,
    n: household.commune.nom,
    c: household.commune.code,
    dp: household.commune.dep,
    la: household.commune.lat,
    lo: household.commune.lon,
    f: household.outing_window.from,
    u: household.outing_window.to,
    d: household.outing_duration_h,
    i: household.outfit_view === 'texte' ? 0 : 1,
    k: household.children.map((c) => ({
      id: c.id, p: c.name ?? '', b: c.birth, t: c.transport, o: c.outfit_offset ?? 0,
      ...(c.day_style ? { s: c.day_style } : {}),
      ...(Object.keys(c.night_options ?? {}).length ? { g: c.night_options } : {}),
      ...((c.inventory?.chanceliere ?? []).length ? { cm: 1 } : {}),
    })),
    m: household.updated ?? 0,
  };
}

// Enfants d'une configuration, dans l'ordre de l'app ; une configuration v1 n'en a qu'un, sans prénom.
export function configChildren(cfg) {
  const list = cfg.v === 2 ? cfg.k : [{ id: '', p: '', b: cfg.b, t: cfg.t, o: cfg.o }];
  return list.map((c) => ({
    id: String(c.id ?? ''), name: String(c.p ?? ''), birth: c.b, transport: c.t ?? 'poussette', outfit_offset: c.o ?? 0,
    day_style: typeof c.s === 'string' ? c.s : null,
    night_options: c.g && typeof c.g === 'object' && !Array.isArray(c.g) ? { ...c.g } : {},
    stroller_muff: c.cm === 1,
  }));
}

// Prénom comparé sans majuscules ni accents (sans Intl : le bac à sable d'Android n'en a pas).
const ACCENTS = {
  à: 'a', â: 'a', ä: 'a', á: 'a', ç: 'c', é: 'e', è: 'e', ê: 'e', ë: 'e', î: 'i', ï: 'i', í: 'i',
  ñ: 'n', ô: 'o', ö: 'o', ó: 'o', ù: 'u', û: 'u', ü: 'u', ú: 'u', ÿ: 'y', œ: 'oe', æ: 'ae',
};
export const plainName = (s) => String(s ?? '').trim().toLowerCase().replace(/[^\x00-\x7f]/g, (c) => ACCENTS[c] ?? c);

// Enfant demandé par un widget : numéro (1, 2…), identifiant ou prénom ; le premier sinon.
export function pickChild(cfg, ref = '') {
  const children = configChildren(cfg);
  const key = String(ref ?? '').trim();
  if (/^\d+$/.test(key) && children[Number(key) - 1]) return children[Number(key) - 1];
  return children.find((c) => c.id && c.id === key)
    ?? children.find((c) => key && c.name && plainName(c.name) === plainName(key))
    ?? children[0];
}

// Profil du moteur pour un enfant de la configuration (le premier par défaut).
export function configToProfile(cfg, ref = '') {
  const child = pickChild(cfg, ref);
  return {
    commune: { nom: cfg.n ?? '', code: cfg.c ?? '', dep: cfg.dp ?? '', lat: cfg.la, lon: cfg.lo },
    child_id: child.id,
    name: child.name,
    birth: child.birth,
    transport: child.transport,
    outing_window: { from: cfg.f ?? '09:00', to: cfg.u ?? '18:00' },
    outing_duration_h: cfg.d ?? 1,
    outfit_offset: child.outfit_offset,
    day_style: child.day_style,
    night_options: child.night_options,
    stroller_muff: child.stroller_muff,
    outfit_view: cfg.i === 0 ? 'texte' : 'dessins',
    room_temp_c: null,
    day_room_temp_c: null,
    inventory: {},
  };
}
