// Adaptateur Open-Meteo → entrée du moteur. Fonctions pures, partagées par l'app web et le widget iPhone.
// N'utilise que du JavaScript standard (pas d'API du navigateur), pour tourner aussi dans Scriptable.
import {
  addDays, displayMoment, evaluate, fmtMin, frNumber, homeLines, homeMoment, homeTable, mean, outingReminderText, reminderText, round1, skyTheme,
  toMin, widgetLines, widgetShort,
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

// Qualité de l'air : prévision horaire du modèle européen CAMS (Copernicus), servie par Open-Meteo, sur 4 jours.
// Indice européen (european_aqi) et les trois polluants des seuils d'information (rules : air), en µg/m³.
export const AIR_DAYS = 4;
const AIR_HOURLY = 'european_aqi,ozone,nitrogen_dioxide,pm10';

export function airQualityUrl({ lat, lon }) {
  return 'https://air-quality-api.open-meteo.com/v1/air-quality' +
    `?latitude=${coord(lat)}&longitude=${coord(lon)}&hourly=${AIR_HOURLY}&domains=cams_europe` +
    `&timezone=${encodeURIComponent(PARIS_TZ)}&forecast_days=${AIR_DAYS}`;
}

// Les valeurs d'air d'une heure (« AAAA-MM-JJTHH:MM »), ou des null : sans réponse, l'air ne change rien.
function airIndex(air) {
  const h = air?.hourly;
  const map = new Map();
  if (!Array.isArray(h?.time)) return map;
  const num = (list, i) => (Number.isFinite(list?.[i]) ? list[i] : null);
  h.time.forEach((time, i) => map.set(time, {
    aqi: num(h.european_aqi, i), o3: num(h.ozone, i), no2: num(h.nitrogen_dioxide, i), pm10: num(h.pm10, i),
  }));
  return map;
}
const NO_AIR = { aqi: null, o3: null, no2: null, pm10: null };

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

export function hourlyForDate(forecast, date, air = null) {
  const h = forecast.hourly;
  const airAt = airIndex(air);
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
      ...(airAt.get(time) ?? NO_AIR),
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

// `air` : la réponse qualité de l'air d'Open-Meteo (airQualityUrl), facultative.
export function buildInput({ forecast, climate = [], profile, date, now, lat, air = null }) {
  const i = forecast.daily.time.indexOf(date);
  return {
    date,
    now,
    profile,
    forecast: {
      daylight: daylightForDate(forecast, date),
      hourly: hourlyForDate(forecast, date, air),
      daily: { tmax_c: i >= 0 ? forecast.daily.temperature_2m_max[i] : null },
    },
    // La vigilance Météo-France et les épisodes déclarés par les préfectures ne sont pas encore branchés : la pollution
    // vient de la prévision horaire (forecast.hourly), voir airEpisode dans le moteur.
    alerts: { vigilance: [], air: null },
    outlook: weeklyOutlook({ forecast, climate, date, lat: lat ?? forecast.latitude }),
  };
}

// Durée d'une sortie, en heures : 30 minutes (`outing_short`, ds dans la configuration) ou outing_duration_h, la seule
// que lit le moteur (il compte par heure).
export const outingHours = (p) => (p?.outing_short ? 0.5 : p?.outing_duration_h ?? 1);

// Les heures pleines d'une sortie, pour le moteur : de l'heure de son départ (`start`, HH:MM) à l'heure la plus proche de
// sa fin (`end`, en minutes), une heure au moins (une sortie de 30 minutes prend l'heure entamée).
export function outingWindow(start, end) {
  const from = Math.floor(toMin(start) / 60) * 60;
  return { from: fmtMin(from), to: fmtMin(Math.min(24 * 60, Math.max(from + 60, Math.round(end / 60) * 60))) };
}

// La sortie que montre un widget, comme l'app : `outings`, les sorties transmises par l'app ({ 'AAAA-MM-JJ': [{ s, d,
// auto }] }, la plus récente en dernier). Aujourd'hui, celle qui est en cours (`going`) ou à venir (`next`), sinon
// maintenant pour la durée réglée (`now`) ; demain, celle qui est choisie, sinon le début de la plage horaire.
// `chosen` : choisie dans l'app (pas la sortie par défaut) ; `end` en minutes ; `window` : ses heures, pour le moteur.
export function widgetOuting({ date, time, outings = null, hours = 1, window }, tomorrow = false) {
  const list = (Array.isArray(outings?.[date]) ? outings[date] : []).filter((o) => /^\d{2}:\d{2}$/.test(o?.s ?? ''));
  const nowMin = tomorrow ? -1 : toMin(time);
  const live = list.map((o) => ({ s: o.s, d: Number(o.d) > 0 ? Number(o.d) : hours, auto: Boolean(o.auto) }))
    .map((o) => ({ ...o, end: toMin(o.s) + o.d * 60 }))
    .filter((o) => o.end > nowMin)
    .at(-1);
  let o;
  if (live) o = { start: live.s, end: live.end, d: live.d, kind: !tomorrow && toMin(live.s) <= nowMin ? 'going' : 'next', chosen: !live.auto };
  else if (tomorrow) o = { start: window.from, end: toMin(window.from) + hours * 60, d: hours, kind: 'next', chosen: false };
  else {
    const start = fmtMin(Math.floor(nowMin / 5) * 5);
    o = { start, end: toMin(start) + hours * 60, d: hours, kind: 'now', chosen: false };
  }
  o.end = Math.min(o.end, 24 * 60 - 5);
  return { ...o, window: outingWindow(o.kind === 'going' ? time : o.start, o.end) };
}

// Ce qu'affiche un widget pour un enfant, à une heure donnée. Le jour : la sortie (voir widgetOuting), sa tenue, son
// sac et ses changements. Le soir : la sortie de demain, sa tenue et son sac, à préparer, avec la nuit. `outings` :
// les sorties transmises par l'app. `reminder` : calcule aussi le rappel du soir (la sortie de demain).
export function widgetView({ forecast, profile, date, time, lat, outings = null, air = null }, bundle, { drawings = true, reminder = false } = {}) {
  const today = evaluate(buildInput({ forecast, profile, date, now: time, lat, air }), bundle);
  const moment = displayMoment(today, time);
  const hours = outingHours(profile);
  const run = (day, now, o, extra = {}) => evaluate(buildInput({ forecast, profile: { ...profile, ...extra, outing_window: o.window }, date: day, now, lat, air }), bundle);
  const outing = moment === 'jour' ? widgetOuting({ date, time, outings, hours, window: profile.outing_window }) : null;
  const outingResult = outing ? run(date, time, outing) : null;
  const shown = outingResult?.journee ? outingResult : today;
  const next = addDays(date, 1);
  const tomorrowOuting = moment === 'soir' || reminder ? widgetOuting({ date: next, time: '07:00', outings, hours, window: profile.outing_window }, true) : null;
  const tomorrow = tomorrowOuting ? run(next, '07:00', tomorrowOuting, { room_temp_c: null }) : null;
  return {
    today,
    tomorrow,
    moment,
    outing: shown === outingResult ? outing : null,
    lines: widgetLines(shown, moment, bundle.messages, {
      drawings,
      tomorrow: moment === 'soir' ? tomorrow : null,
      outing: shown === outingResult ? outing : null,
      tomorrowOuting: tomorrow?.journee ? tomorrowOuting : null,
      ideal: today.outing.window,
    }),
    theme: skyTheme(today, moment),
    short: widgetShort(shown, moment),
    check: today.widget.check,
    check_tiny: today.widget.check_tiny,
    reminder: tomorrow?.journee ? reminderText(today, tomorrow, bundle.messages) : null,
  };
}

// La prochaine sortie à rappeler : choisie dans l'app (pas la sortie par défaut), dont le rappel, `lead` minutes avant
// son départ, est encore à venir. { day, s, d, lead } (lead : l'heure du rappel, en minutes ce jour-là), ou null.
// Même règle que SbOutingReminder.next (app Android).
export const OUTING_REMINDER_LEAD_MIN = 15;
export function nextOutingReminder(outings, date, time, lead = OUTING_REMINDER_LEAD_MIN) {
  const found = [];
  for (const [day, list] of Object.entries(outings ?? {})) {
    if (day < date || !Array.isArray(list)) continue;
    for (const o of list) {
      if (o?.auto || !/^\d{2}:\d{2}$/.test(o?.s ?? '')) continue;
      const at = toMin(o.s) - lead;
      if (at >= 0 && (day > date || at > toMin(time))) found.push({ day, s: o.s, d: Number(o.d) > 0 ? Number(o.d) : null, lead: at });
    }
  }
  return found.sort((a, b) => a.day.localeCompare(b.day) || a.lead - b.lead)[0] ?? null;
}

// Rappel avant une sortie choisie (`outing` : { s, d } de l'app), pour un enfant : { title, text }, ou null.
export function outingReminder({ forecast, profile, date, time, lat, outing, air = null }, bundle) {
  const hours = Number(outing.d) > 0 ? Number(outing.d) : outingHours(profile);
  const end = toMin(outing.s) + hours * 60;
  const result = evaluate(buildInput({ forecast, profile: { ...profile, outing_window: outingWindow(outing.s, end) }, date, now: time, lat, air }), bundle);
  return result.journee ? outingReminderText(result, { start: outing.s }, bundle.messages) : null;
}

// Ce qu'affiche le widget Maison pour un enfant : de 6 h à 18 h la journée chez vous, ensuite la nuit dans sa chambre.
// Le relevé du moment, la tenue, l'état par rapport au repère ; `short` pour le widget rond de l'écran verrouillé.
export function homeWidgetView({ forecast, profile, date, time, lat, air = null }, bundle, { drawings = true } = {}) {
  const today = evaluate(buildInput({ forecast, profile, date, now: time, lat, air }), bundle);
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
// et s'il y a lieu s, style de la journée, g, tenues de nuit choisies par tranche, w, pièces au choix, cm, une
// chancelière dans sa garde-robe, que les widgets n'ont pas, et cc : 0, une voiture sans chauffage ni clim) et m, date du dernier changement :
// la plus récente l'emporte entre l'app et les widgets.
// Catégories de la garde-robe qui changent la tenue (règles : outfit.alternatives.wardrobe) : passées aux widgets
// pour qu'ils proposent, comme l'app, le pull qu'il a plutôt que le gilet chaud qu'il n'a pas.
export const WARDROBE_CATEGORIES = ['gilets_fins', 'gilets', 'gilets_chauds', 'pulls'];
const wardrobeOf = (inventory) => Object.fromEntries(WARDROBE_CATEGORIES
  .map((cat) => [cat, Array.isArray(inventory?.[cat]) ? inventory[cat].filter((size) => typeof size === 'string') : []])
  .filter(([, sizes]) => sizes.length));

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
    ...(household.outing_short ? { ds: 1 } : {}),
    i: household.outfit_view === 'texte' ? 0 : 1,
    k: household.children.map((c) => ({
      id: c.id, p: c.name ?? '', b: c.birth, t: c.transport, o: c.outfit_offset ?? 0,
      ...(c.day_style ? { s: c.day_style } : {}),
      ...(Object.keys(c.night_options ?? {}).length ? { g: c.night_options } : {}),
      ...(Object.keys(c.swaps ?? {}).length ? { w: c.swaps } : {}),
      ...((c.inventory?.chanceliere ?? []).length ? { cm: 1 } : {}),
      ...(c.car_climate === false ? { cc: 0 } : {}),
      ...(Object.keys(wardrobeOf(c.inventory)).length ? { gr: wardrobeOf(c.inventory) } : {}),
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
    swaps: c.w && typeof c.w === 'object' && !Array.isArray(c.w) ? { ...c.w } : {},
    stroller_muff: c.cm === 1,
    car_climate: c.cc === 0 ? false : null,
    wardrobe: c.gr && typeof c.gr === 'object' && !Array.isArray(c.gr) ? wardrobeOf(c.gr) : {},
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
    outing_short: cfg.ds === 1,
    outfit_offset: child.outfit_offset,
    day_style: child.day_style,
    night_options: child.night_options,
    swaps: child.swaps,
    stroller_muff: child.stroller_muff,
    car_climate: child.car_climate,
    outfit_view: cfg.i === 0 ? 'texte' : 'dessins',
    room_temp_c: null,
    day_room_temp_c: null,
    inventory: { ...child.wardrobe },
  };
}
