// Moteur des règles v0 : fonctions pures, sans dépendance extérieure.
// Le même fichier tourne dans l'app web, dans le widget iPhone (Scriptable) et dans les tests Node.
// Il sert de spécification aux futurs portages Swift et Kotlin.
import { CATEGORY_DRAWINGS, DRAWINGS, ITEM_DRAWINGS } from './drawings.js';

const VIGILANCE_COLORS = ['vert', 'jaune', 'orange', 'rouge'];
const colorRank = (color) => VIGILANCE_COLORS.indexOf(color);

export const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
export const fmtMin = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
// « 10:00 » devient « 10 h », « 10:30 » devient « 10 h 30 ».
export const hourFr = (hhmm) => (hhmm.endsWith(':00') ? `${Number(hhmm.slice(0, 2))} h` : `${Number(hhmm.slice(0, 2))} h ${hhmm.slice(3, 5)}`);
const capitalize = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const DAY_MS = 86_400_000;
const parseDay = (day) => Date.parse(`${day.length === 7 ? `${day}-15` : day.slice(0, 10)}T00:00:00Z`);
export const addDays = (day, n) => new Date(parseDay(day) + n * DAY_MS).toISOString().slice(0, 10);
const laterDay = (a, b) => (a > b ? a : b);
export const round1 = (x) => Math.round(x * 10) / 10;
export const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
export const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

export const ageMonths = (birth, day) => (parseDay(day) - parseDay(birth)) / DAY_MS / 30.4375;

const bandIndex = (bands, feels) => bands.findIndex((b) => b.min_feels_c === null || feels >= b.min_feels_c);
const sizeFor = (system, age) => system.find((s) => age < s.max_age_m) ?? system.at(-1);

function sortByPriority(ids, priority) {
  const rank = (id) => {
    const i = priority.indexOf(id);
    return i === -1 ? priority.length : i;
  };
  return [...new Set(ids)].sort((a, b) => rank(a) - rank(b));
}

function heatActive(input, R) {
  const cfg = R.outing.heat;
  const canicule = (input.alerts?.vigilance ?? []).some(
    (v) => v.phenomenon === 'canicule' && colorRank(v.color) >= colorRank(cfg.trigger_vigilance_canicule_from),
  );
  const hourlyMax = Math.max(...input.forecast.hourly.map((h) => h.temp_c ?? h.feels_c));
  const tmax = input.forecast.daily?.tmax_c ?? hourlyMax;
  return canicule || tmax >= cfg.trigger_tmax_c_at_least;
}

function planOuting(input, R, age) {
  const cfg = R.outing;
  const s = cfg.scoring;
  const x = cfg.slot_exclusions;
  const window0 = input.profile.outing_window ?? cfg.default_window;
  const duration = input.profile.outing_duration_h ?? cfg.default_duration_h;
  // On ne propose que des heures à venir : la plage commence au plus tôt à l'heure pleine suivante.
  const nextHour = input.now ? Math.ceil(toMin(input.now) / 60) * 60 : 0;
  const plage = { from: fmtMin(Math.max(toMin(window0.from), Math.min(nextHour, 24 * 60 - 60))), to: window0.to };
  const dayOver = toMin(plage.from) + duration * 60 > toMin(plage.to);
  const vigilance = input.alerts?.vigilance ?? [];
  const blocking = vigilance.filter(
    (v) =>
      colorRank(v.color) >= colorRank(cfg.vigilance.block_all_from_color) ||
      (v.color === 'orange' && cfg.vigilance.block_all_if_orange_for.includes(v.phenomenon)),
  );
  const heat = heatActive(input, R);
  const ozone = Boolean(input.alerts?.air?.episode && input.alerts.air.pollutant === 'ozone');
  const { sunrise, sunset } = input.forecast.daylight;
  const within = (start, range) => start >= toMin(range.from) && start < toMin(range.to);
  const uvWeight = age < R.relay_triggers.under_1y_months ? s.uv_weight_under_12m : s.uv_weight;

  const slots = input.forecast.hourly.map((h) => {
    const start = toMin(h.time.slice(11, 16));
    const end = start + 60;
    const reasons = [];
    if (start < toMin(plage.from) || end > toMin(plage.to)) reasons.push('hors_plage');
    if (start < toMin(sunrise) || end > toMin(sunset)) reasons.push('hors_jour');
    if (heat && within(start, cfg.heat.blocked_hours)) reasons.push('canicule_heures_chaudes');
    if (ozone && within(start, cfg.ozone_episode_blocked_hours)) reasons.push('ozone_apres_midi');
    if (h.feels_c <= x.feels_c_at_most) reasons.push('froid_extreme');
    if (h.precip_prob >= x.precip_prob_at_least || h.precip_mm >= x.precip_mm_at_least) reasons.push('pluie');
    if (h.gust_kmh >= x.gust_kmh_at_least) reasons.push('vent');
    const score =
      s.base -
      Math.max(0, h.precip_prob - s.rain_prob_free) * s.rain_prob_weight -
      Math.max(0, s.comfort_low_c - h.feels_c) * s.comfort_low_weight -
      Math.max(0, h.feels_c - s.comfort_high_c) * s.comfort_high_weight -
      Math.max(0, h.gust_kmh - s.gust_free_kmh) * s.gust_weight -
      Math.max(0, h.uv - s.uv_free) * uvWeight;
    return { ...h, start, end, reasons, score: round1(score) };
  });

  const byStart = new Map(slots.map((sl) => [sl.start, sl]));
  let best = null;
  if (!blocking.length) {
    for (const first of slots) {
      const run = [];
      for (let k = 0; k < duration; k++) {
        const sl = byStart.get(first.start + k * 60);
        if (!sl || sl.reasons.length) break;
        run.push(sl);
      }
      if (run.length < duration) continue;
      const score = Math.min(...run.map((sl) => sl.score));
      if (!best || score > best.score) best = { run, score };
    }
  }

  const daySlots = slots.filter((sl) => !sl.reasons.includes('hors_plage') && !sl.reasons.includes('hors_jour'));
  let reason = null;
  if (!best) {
    if (blocking.length) reason = 'vigilance';
    else if (dayOver) reason = 'journee_terminee';
    else if (!daySlots.length) reason = 'hors_jour';
    else {
      const counts = {};
      for (const sl of daySlots) for (const r of sl.reasons) counts[r] = (counts[r] ?? 0) + 1;
      const ranked = cfg.none_reason_priority.filter((r) => counts[r]).sort((a, b) => counts[b] - counts[a]);
      reason = ranked[0] ?? 'duree';
    }
  }

  const window = best && {
    start: fmtMin(best.run[0].start),
    end: fmtMin(best.run.at(-1).end),
    score: best.score,
    feels_c: round1(mean(best.run.map((sl) => sl.feels_c))),
    precip_prob_max: Math.max(...best.run.map((sl) => sl.precip_prob)),
    uv_max: Math.max(...best.run.map((sl) => sl.uv)),
    gust_max: Math.max(...best.run.map((sl) => sl.gust_kmh)),
  };
  const inPlage = slots.filter((sl) => !sl.reasons.includes('hors_plage'));
  const refSlots = best ? best.run : inPlage.slice(0, 1);
  return { window, reason, blocking, heat, ozone, slots, inPlage, daySlots, refSlots, plage };
}

function chooseOutfit(feels, profile, R) {
  const { bands, transport } = R.outfit;
  const t = transport[profile.transport] ?? transport.poussette;
  const base = bandIndex(bands, feels);
  const idx = clamp(base + (profile.outfit_offset ?? 0) + t.band_shift, 0, bands.length - 1);
  // Certains modes de transport remplacent des vêtements (porte-bébé : pas de pyjama à pieds ni de combinaison).
  const items = bands[idx].items.flatMap((item) => t.replace_items?.[item] ?? [item]);
  return {
    band: bands[idx].id,
    base_band: bands[base].id,
    feels_c: feels,
    items: [...new Set(items)].filter((item) => !t.remove_items.includes(item)),
    notes: [...t.notes],
  };
}

function addOverlays(outfit, plan, ref, R, params) {
  const ov = R.outfit.overlays;
  if (ref.some((sl) => sl.precip_prob >= ov.rain_cover_prob_at_least)) {
    outfit.notes.push('practical.rain.cover');
  } else if (ref.length) {
    const after = ref.at(-1).end;
    const later = plan.slots.find(
      (sl) => sl.start >= after && sl.start < toMin(plan.plage.to) && sl.precip_prob >= ov.rain_later_prob_at_least,
    );
    if (later) {
      outfit.notes.push('practical.rain.later');
      params.hour = fmtMin(later.start);
    }
  }
  if (ref.some((sl) => sl.gust_kmh >= ov.wind_gust_kmh_at_least)) outfit.notes.push('practical.wind');
}

function dayRelays(input, R, age, plan, outfit, params) {
  const rt = R.relay_triggers;
  const vigilance = input.alerts?.vigilance ?? [];
  const relays = [];
  const active = vigilance.filter((v) => colorRank(v.color) >= colorRank('orange'));
  if (active.length) {
    relays.push('relay.vigilance.active');
    params.color = active.map((v) => v.color).sort((a, b) => colorRank(b) - colorRank(a))[0];
    params.phenomena = active.map((v) => v.phenomenon).join(', ');
  }
  if (plan.heat) {
    relays.push(
      'relay.heat.outing_hours', 'relay.heat.protect', 'relay.heat.vehicle',
      'relay.heat.stroller_sun', 'relay.heat.shutters', 'relay.heat.info_line',
    );
  }
  const coldVigilance = active.some((v) => v.phenomenon === 'grand-froid');
  const extremeCold = plan.daySlots.some((sl) => sl.feels_c <= R.outing.slot_exclusions.feels_c_at_most);
  if (coldVigilance || extremeCold) relays.push('relay.cold.avoid_outings');
  if (outfit && (coldVigilance || rt.cold_layers_bands.includes(outfit.base_band))) relays.push('relay.cold.layers');
  if (outfit && input.profile.transport === 'porte_bebe' && (coldVigilance || outfit.feels_c <= rt.carrier_cold_feels_c_at_most)) {
    relays.push('relay.cold.stroller_rather_than_carrier');
  }
  if (outfit && input.profile.transport === 'voiture' && rt.car_coat_bands.includes(outfit.base_band)) relays.push('relay.car.coat');
  const uvDay = plan.daySlots.length ? Math.max(...plan.daySlots.map((sl) => sl.uv)) : 0;
  if (uvDay >= rt.uv_at_least) {
    params.uv = round1(uvDay);
    if (age < rt.under_1y_months) relays.push('relay.sun.under_1y', 'relay.sun.hours');
    else relays.push('relay.sun.hours', 'relay.sun.protect');
  }
  if (input.alerts?.air?.episode) relays.push(plan.ozone ? 'relay.air.ozone' : 'relay.air.particles');
  return sortByPriority(relays, R.relay_priority);
}

function planNight(input, R, heat) {
  const n = R.night;
  const room = input.profile.room_temp_c ?? null;
  const relays = [...n.always];
  let status = 'unknown';
  let tog = null;
  if (room !== null) {
    status = room < n.room_range_c.min ? 'below' : room > n.room_range_c.max ? 'above' : 'in_range';
    const t = n.tog_hint.round_room_temp ? Math.round(room) : room;
    tog = n.tog_hint.bins.find((b) => b.max_c === null || t <= b.max_c).tog;
    relays.push(...n.when_room_known);
  }
  if (heat || (room !== null && room >= n.heat_room_c_at_least)) relays.push('relay.heat.shutters');
  return { room_temp_c: room, room_status: status, tog, relays: sortByPriority(relays, R.relay_priority) };
}

function needMet(need, week, band, transport) {
  if (need.week_tmean_below != null && !(week.tmean < need.week_tmean_below)) return false;
  if (need.week_tmax_at_least != null && !(week.tmax_mean >= need.week_tmax_at_least)) return false;
  if (need.week_band_in && !need.week_band_in.includes(band)) return false;
  if (need.week_rainy_days_at_least != null && !(week.rainy_days >= need.week_rainy_days_at_least)) return false;
  if (need.week_uv_max_at_least != null && !(week.uv_max_mean >= need.week_uv_max_at_least)) return false;
  if (need.transport_in && !need.transport_in.includes(transport)) return false;
  return true;
}

function planPurchases(input, R) {
  const P = R.purchases;
  const { profile, date } = input;
  const under1y = R.relay_triggers.under_1y_months;
  const found = new Map();
  for (const week of (input.outlook ?? []).slice(0, P.horizon_weeks)) {
    const ageWeek = ageMonths(profile.birth, week.week_start);
    const band = R.outfit.bands[bandIndex(R.outfit.bands, week.tmax_mean)].id;
    for (const cat of P.categories) {
      if (found.has(cat.id)) continue;
      if (cat.min_age_m && ageWeek < cat.min_age_m) continue;
      if (!needMet(cat.need_if, week, band, profile.transport)) continue;
      const system = P.size_systems[cat.size_system];
      const owned = profile.inventory?.[cat.id] ?? [];
      if (owned.includes(sizeFor(system, ageWeek).code)) continue;
      // On achète la taille qui servira encore dans quelques semaines.
      const buy = sizeFor(system, ageMonths(profile.birth, addDays(week.week_start, P.size_lookahead_days)));
      if (owned.includes(buy.code)) continue;
      const reasons = [cat.reason];
      if (buy.code !== sizeFor(system, ageMonths(profile.birth, date)).code) reasons.push('taille');
      found.set(cat.id, {
        key: `${cat.id}:${buy.code}`,
        category: cat.id,
        size: buy.code,
        size_label: buy.label,
        needed_from: week.week_start,
        order_by: laterDay(addDays(week.week_start, -P.lead_days), date),
        priority: cat.priority,
        reasons,
        relays: [...cat.relays, ...((ageWeek < under1y ? cat.relays_under_12m : cat.relays_from_12m) ?? [])],
      });
    }
  }
  return [...found.values()]
    .sort((a, b) => a.needed_from.localeCompare(b.needed_from) || a.priority - b.priority)
    .slice(0, P.max_suggestions);
}

export function checkProduct(id, age, R) {
  const banned = R.purchases.never_suggest.find((p) => p.id === id);
  if (banned) return { id, allowed: false, relay: banned.relay };
  const cat = R.purchases.categories.find((c) => c.id === id);
  if (cat?.min_age_m && age < cat.min_age_m) return { id, allowed: false, relay: cat.under_min_age_relay ?? null };
  return { id, allowed: true, relay: null };
}

export function render(M, id, variant, params = {}) {
  const msg = M.messages[id];
  if (!msg) return null;
  return (msg[variant] ?? msg.text).replace(/\{(\w+)\}/g, (all, key) => (params[key] ?? all).toString());
}

export const frNumber = (x) => String(x).replace('.', ',');

// Les trois lignes du widget pour le moment voulu : « jour » (créneau) ou « soir » (nuit et achats).
// Avec `drawings`, la tenue (le jour) et la gigoteuse (le soir) deviennent des dessins :
// { drawings: [identifiants de engine/drawings.js], text, label }, `label` gardant le texte pour les petits formats.
export function widgetLines(result, moment, M, { drawings = false } = {}) {
  const labels = M.labels;
  const lines = [];
  if (moment === 'jour') {
    const w = result.outing.window;
    lines.push(
      w
        ? render(M, 'outing.window', 'short', { start: hourFr(w.start), end: hourFr(w.end), feels: Math.round(w.feels_c) })
        : render(M, `outing.none.${result.outing.reason}`, 'short'),
    );
    if (result.outfit) {
      const label = capitalize(result.outfit.items.map((i) => labels.items_short[i] ?? i).join(' · '));
      lines.push(drawings ? { drawings: result.outfit.items.map((i) => ITEM_DRAWINGS[i]).filter(Boolean), text: '', label } : label);
    }
    const hint = result.relays[0] ?? result.outfit?.notes.find((n) => n.startsWith('practical.rain'));
    if (hint) lines.push(render(M, hint, 'short', result.params));
  } else {
    const n = result.night;
    lines.push(
      n.room_temp_c === null
        ? render(M, 'night.room_unknown', 'short')
        : render(M, 'night.room', 'short', { room: frNumber(n.room_temp_c) }),
    );
    if (n.tog) {
      const label = render(M, 'fabricant.tog', 'short', { tog: n.tog });
      lines.push(drawings ? { drawings: ['gigoteuse'], text: `≈ ${n.tog} TOG`, label } : label);
    }
    const p = result.purchases[0];
    lines.push(
      p
        ? render(M, 'purchase.suggestion', 'short', {
          label: labels.categories[p.category],
          size: p.size === 'unique' ? '' : `, ${p.size_label}`,
        })
        : render(M, 'relay.sleep.basics', 'short'),
    );
  }
  return lines.filter(Boolean).slice(0, 3);
}

export const momentOf = (now) => (toMin(now ?? '08:00') < toMin('18:00') ? 'jour' : 'soir');

// Ambiance du ciel (app et widgets) : le soir, la nuit ; en journée, le temps qu'il fera au créneau conseillé.
export function skyTheme(result, moment) {
  if (moment === 'soir') return 'nuit';
  const { window: w, reason, slots } = result.outing;
  if (reason === 'journee_terminee') return 'nuageux';
  if (reason === 'hors_jour') return 'nuit';
  if (result.relays.includes('relay.heat.outing_hours')) return 'chaleur';
  const s = (w && slots.find((x) => x.time === w.start)) ?? slots[0];
  if (!s) return 'nuageux';
  if ((s.weather_code ?? 0) >= 51 || s.precip_prob >= 50) return 'pluie';
  if ([2, 3, 45, 48].includes(s.weather_code)) return 'nuageux';
  if (s.feels_c <= 3) return 'froid';
  return 'clair';
}

export function evaluate(input, bundle) {
  const R = bundle.rules;
  const age = ageMonths(input.profile.birth, input.date);
  const plan = planOuting(input, R, age);
  const params = {};
  const ref = plan.refSlots;
  const outfit = plan.reason === 'vigilance' || !ref.length
    ? null
    : chooseOutfit(round1(mean(ref.map((sl) => sl.feels_c))), input.profile, R);
  if (outfit) addOverlays(outfit, plan, ref, R, params);
  const result = {
    age_months: round1(age),
    outing: {
      window: plan.window,
      reason: plan.reason,
      slots: plan.inPlage.map((sl) => ({
        time: fmtMin(sl.start),
        feels_c: sl.feels_c,
        precip_prob: sl.precip_prob,
        uv: sl.uv,
        gust_kmh: sl.gust_kmh,
        weather_code: sl.weather_code ?? null,
        reasons: sl.reasons.filter((r) => r !== 'hors_plage'),
        score: sl.score,
      })),
    },
    outfit,
    relays: dayRelays(input, R, age, plan, outfit, params),
    params,
    night: planNight(input, R, plan.heat),
    purchases: planPurchases(input, R),
  };
  result.widget = { lines: widgetLines(result, momentOf(input.now), bundle.messages) };
  if (input.check_product) result.product = checkProduct(input.check_product, age, R);
  return result;
}

// Tenue pour une heure précise (« et si on sort à 16 h ? »), avec les rappels pratiques de cette heure.
export function outfitAt(input, bundle, hhmm) {
  const R = bundle.rules;
  const plan = planOuting(input, R, ageMonths(input.profile.birth, input.date));
  const slot = plan.slots.find((sl) => sl.start === toMin(hhmm));
  if (!slot) return null;
  const outfit = chooseOutfit(slot.feels_c, input.profile, R);
  const params = {};
  addOverlays(outfit, plan, [slot], R, params);
  return { ...outfit, params, reasons: slot.reasons.filter((r) => r !== 'hors_plage') };
}

// Contrôles de la charte : tout message officiel cite une source publique, toute référence existe.
export function lint(bundle) {
  const { rules: R, messages: M, sources: S } = bundle;
  const errors = [];
  const sourceById = new Map(S.sources.map((src) => [src.id, src]));
  for (const [id, msg] of Object.entries(M.messages)) {
    for (const sid of msg.sources ?? []) if (!sourceById.has(sid)) errors.push(`${id} : source inconnue ${sid}`);
    const levels = (msg.sources ?? []).map((sid) => sourceById.get(sid)?.level);
    if (msg.kind === 'officiel' && !levels.some((l) => R.policy.official_message_levels.includes(l))) {
      errors.push(`${id} : message officiel sans source publique`);
    }
    if (msg.kind === 'fabricant' && !levels.includes('C')) errors.push(`${id} : indication fabricant sans source produit`);
  }
  const referenced = [
    ...R.relay_priority,
    ...R.night.always,
    ...R.night.when_room_known,
    ...Object.values(R.outfit.transport).flatMap((t) => t.notes),
    ...R.purchases.never_suggest.map((p) => p.relay),
    ...R.purchases.categories.flatMap((c) => [
      ...c.relays, ...(c.relays_under_12m ?? []), ...(c.relays_from_12m ?? []), ...(c.under_min_age_relay ? [c.under_min_age_relay] : []),
    ]),
  ];
  for (const id of new Set(referenced)) if (!M.messages[id]) errors.push(`message manquant : ${id}`);
  const items = new Set(R.outfit.bands.flatMap((band) => band.items));
  for (const t of Object.values(R.outfit.transport)) {
    for (const replacement of Object.values(t.replace_items ?? {})) replacement.forEach((item) => items.add(item));
  }
  for (const item of items) {
    if (!M.labels.items[item]) errors.push(`libellé manquant : ${item}`);
    if (!M.labels.items_short[item]) errors.push(`libellé court manquant : ${item}`);
    if (!M.labels.layers[M.labels.item_layers[item]]) errors.push(`couche inconnue pour : ${item}`);
    if (!DRAWINGS[ITEM_DRAWINGS[item]]) errors.push(`dessin manquant : ${item}`);
  }
  for (const cat of R.purchases.categories) {
    if (!M.labels.categories[cat.id]) errors.push(`libellé manquant : ${cat.id}`);
    if (!DRAWINGS[CATEGORY_DRAWINGS[cat.id]]) errors.push(`dessin manquant : ${cat.id}`);
  }
  const toVerify = S.sources.filter((src) => src.verification !== 'lu').map((src) => `${src.id} (${src.verification})`);
  return { errors, toVerify };
}
