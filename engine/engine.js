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
  const runs = [];
  if (!blocking.length) {
    for (const first of slots) {
      const run = [];
      for (let k = 0; k < duration; k++) {
        const sl = byStart.get(first.start + k * 60);
        if (!sl || sl.reasons.length) break;
        run.push(sl);
      }
      if (run.length === duration) runs.push({ run, score: Math.min(...run.map((sl) => sl.score)) });
    }
  }
  // Le meilleur créneau (le premier à score égal), puis jusqu'à deux autres, séparés d'au moins une heure, par ordre chronologique.
  const picked = [];
  for (const r of [...runs].sort((a, b) => b.score - a.score)) {
    if (picked.length === 3) break;
    const start = r.run[0].start;
    const end = r.run.at(-1).end;
    if (picked.every((p) => end + 60 <= p.run[0].start || start >= p.run.at(-1).end + 60)) picked.push(r);
  }
  const best = picked[0] ?? null;

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

  const describe = (r) => ({
    start: fmtMin(r.run[0].start),
    end: fmtMin(r.run.at(-1).end),
    score: r.score,
    feels_c: round1(mean(r.run.map((sl) => sl.feels_c))),
    precip_prob_max: Math.max(...r.run.map((sl) => sl.precip_prob)),
    uv_max: Math.max(...r.run.map((sl) => sl.uv)),
    gust_max: Math.max(...r.run.map((sl) => sl.gust_kmh)),
  });
  const window = best && describe(best);
  const windows = picked.map((r) => ({ ...describe(r), best: r === best })).sort((a, b) => toMin(a.start) - toMin(b.start));
  const inPlage = slots.filter((sl) => !sl.reasons.includes('hors_plage'));
  const refSlots = best ? best.run : inPlage.slice(0, 1);
  return { window, windows, reason, blocking, heat, ozone, slots, inPlage, daySlots, refSlots, plage };
}

// Mode de sortie retenu : un mode réservé aux plus grands (à pied) redevient la poussette avant l'âge prévu.
// En poussette, avec une chancelière notée dans la garde-robe (ou signalée par la configuration d'un widget,
// stroller_muff) : la chancelière remplace la combinaison, avant 2 ans (outfit.transport.poussette_chanceliere).
export function transportFor(profile, age, R) {
  const t = R.outfit.transport[profile.transport];
  const mode = t && !(t.min_age_m && age < t.min_age_m) && !t.base ? profile.transport : 'poussette';
  const muff = R.outfit.transport.poussette_chanceliere;
  const hasMuff = profile.stroller_muff ?? (profile.inventory?.chanceliere ?? []).length > 0;
  return mode === 'poussette' && muff && hasMuff && !(muff.max_age_m && age >= muff.max_age_m) ? 'poussette_chanceliere' : mode;
}
// Le mode choisi par le parent, sans ses variantes (« poussette » pour la poussette avec chancelière).
export const baseTransport = (mode, R) => R.outfit.transport[mode]?.base ?? mode;

// Tenues propres à un âge (à partir de 2 ans : haut et pantalon plutôt que body et pyjama, manteau plutôt que combinaison).
const ageVariant = (R, age) => (R.outfit.age_variants ?? []).filter((v) => age >= v.from_months).at(-1) ?? null;

// Style de la journée choisi pour l'enfant (« sans pyjama » : l'équivalent du pyjama en vêtements de jour, un haut,
// un pantalon et des chaussettes, dehors comme à la maison). Il couvre autant que le pyjama (contrôlé par lint) ;
// la nuit n'est pas concernée.
// Sans choix fait, le style par défaut des règles (« sans pyjama ») ; « pyjama » garde la tenue d'origine.
const dayStyleId = (R, profile) => profile.day_style ?? R.outfit.default_day_style ?? null;
const dayStyle = (R, profile) => R.outfit.day_styles?.[dayStyleId(R, profile)] ?? null;
const styled = (items, style) => (style ? [...new Set(items.flatMap((item) => style.replace_items[item] ?? [item]))] : items);

// Vêtements d'une tranche, pour un âge et un mode de sortie. Certains modes remplacent des vêtements
// (porte-bébé : pas de pyjama à pieds ni de combinaison ; voiture : couverture par-dessus le harnais).
function bandItems(idx, mode, variant, R, style = null) {
  const band = R.outfit.bands[idx];
  const t = R.outfit.transport[mode];
  const items = (variant?.bands[band.id] ?? band.items).flatMap((item) => t.replace_items?.[item] ?? [item]);
  return styled([...new Set(items)].filter((item) => !t.remove_items.includes(item)), style);
}

// Tranche portée pour un ressenti : celle du ressenti, décalée par la tendance et par le mode de sortie.
function wornBand(feels, profile, R, mode) {
  const bands = R.outfit.bands;
  const base = bandIndex(bands, feels);
  const idx = clamp(base + (profile.outfit_offset ?? 0) + R.outfit.transport[mode].band_shift, 0, bands.length - 1);
  return { base, idx };
}

function chooseOutfit(feels, profile, R, age) {
  const mode = transportFor(profile, age, R);
  const { base, idx } = wornBand(feels, profile, R, mode);
  return {
    band: R.outfit.bands[idx].id,
    base_band: R.outfit.bands[base].id,
    feels_c: feels,
    transport: mode,
    items: bandItems(idx, mode, ageVariant(R, age), R, dayStyle(R, profile)),
    notes: [...R.outfit.transport[mode].notes],
  };
}

// Rappels de pluie et de vent. La protection contre la pluie suit le mode de sortie (habillage, cape, imperméable) ;
// l'habillage de la poussette retient la chaleur : par temps chaud, seulement le temps de l'averse.
function addOverlays(outfit, plan, ref, R, params, labels) {
  const ov = R.outfit.overlays;
  const gear = R.outfit.transport[outfit.transport].rain_gear;
  const setGear = () => {
    params.gear = labels.rain_gear[gear];
    params.gear_short = labels.items_short[gear];
  };
  if (ref.some((sl) => sl.precip_prob >= ov.rain_cover_prob_at_least)) {
    const warm = gear === 'habillage_pluie' && outfit.feels_c >= ov.rain_cover_warm_feels_c_at_least;
    outfit.notes.push(warm ? 'practical.rain.cover_warm' : 'practical.rain.cover');
    setGear();
  } else if (ref.length) {
    const after = ref.at(-1).end;
    const later = plan.slots.find(
      (sl) => sl.start >= after && sl.start < toMin(plan.plage.to) && sl.precip_prob >= ov.rain_later_prob_at_least,
    );
    if (later) {
      outfit.notes.push('practical.rain.later');
      params.hour = fmtMin(later.start);
      setGear();
    }
  }
  if (ref.some((sl) => sl.gust_kmh >= ov.wind_gust_kmh_at_least)) outfit.notes.push('practical.wind');
}

function dayRelays(input, R, age, plan, outfit, params) {
  const rt = R.relay_triggers;
  const mode = transportFor(input.profile, age, R);
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
  if (outfit && mode === 'porte_bebe' && (coldVigilance || outfit.feels_c <= rt.carrier_cold_feels_c_at_most)) {
    relays.push('relay.cold.stroller_rather_than_carrier');
  }
  if (outfit && mode === 'voiture' && rt.car_coat_bands.includes(outfit.base_band)) relays.push('relay.car.coat');
  const uvDay = plan.daySlots.length ? Math.max(...plan.daySlots.map((sl) => sl.uv)) : 0;
  if (uvDay >= rt.uv_at_least) {
    params.uv = round1(uvDay);
    if (age < rt.under_1y_months) relays.push('relay.sun.under_1y', 'relay.sun.hours');
    else relays.push('relay.sun.hours', 'relay.sun.protect');
  }
  if (input.alerts?.air?.episode) relays.push(plan.ozone ? 'relay.air.ozone' : 'relay.air.particles');
  return sortByPriority(relays, R.relay_priority);
}

// ——— La journée en couches ———
// Habillé une fois le matin pour la journée dehors : au plus deux changements (« − » on enlève, « + » on remet),
// seulement quand la tranche de ressenti change pour au moins deux heures, et un sac de trois objets au plus.

const slotOf = (J, item) => Object.keys(J.slots).find((slot) => J.slots[slot].includes(item)) ?? null;

// Découpe la journée en au plus trois périodes d'au moins min_hold_h heures, chacune avec sa tranche :
// une heure trop couverte pèse plus qu'une heure pas assez couverte (une couche de moins, et elle est dans le sac),
// chaque changement coûte, et à coût égal on garde le moins de changements. Au départ du matin, jamais trop peu couvert.
function segmentDay(needs, J) {
  const n = needs.length;
  const segment = (from, to) => {
    const part = needs.slice(from, to);
    let best = null;
    for (let band = from === 0 ? part[0] : Math.min(...part); band <= Math.max(...part); band++) {
      const cost = part.reduce((sum, need) => sum + (band > need ? J.over_weight * (band - need) : J.under_weight * (need - band)), 0);
      if (!best || cost < best.cost - 1e-9) best = { from, to, band, cost };
    }
    return best;
  };
  const hold = J.min_hold_h;
  const cuts = [[]];
  for (let k1 = hold; k1 <= n - hold; k1++) cuts.push([k1]);
  if (J.max_changes >= 2) {
    for (let k1 = hold; k1 <= n - hold; k1++) for (let k2 = k1 + hold; k2 <= n - hold; k2++) cuts.push([k1, k2]);
  }
  let best = null;
  for (const cut of cuts) {
    const bounds = [0, ...cut, n];
    const segs = cut.concat(n).map((to, i) => segment(bounds[i], to));
    if (segs.some((sg, i) => i > 0 && sg.band === segs[i - 1].band)) continue;
    const total = segs.reduce((sum, sg) => sum + sg.cost, 0) + J.change_cost * cut.length;
    if (!best || total < best.total - 1e-9) best = { segs, total };
  }
  return best.segs;
}

function planJournee(input, R, age, plan) {
  const J = R.journee;
  const { profile } = input;
  const bands = R.outfit.bands;
  const mode = transportFor(profile, age, R);
  const t = R.outfit.transport[mode];
  const variant = ageVariant(R, age);
  const style = dayStyle(R, profile);
  const win = profile.outing_window ?? R.outing.default_window;
  const hours = plan.slots.filter((sl) => sl.start >= toMin(win.from) && sl.end <= toMin(win.to));
  if (!hours.length) return null;
  const needs = hours.map((sl) => wornBand(sl.feels_c, profile, R, mode).idx);
  const segs = segmentDay(needs, J);
  const b0 = segs[0].band;
  const isFixed = (item) => J.fixed_slots.includes(slotOf(J, item));
  const layers = (idx) => new Map(bandItems(idx, mode, variant, R, style).filter((i) => !isFixed(i)).map((i) => [slotOf(J, i), i]));

  // Body et pyjama (ou haut et pantalon) ne changent pas dans la journée : ceux de la période la plus douce,
  // au plus base_max_drop tranche sous ceux du matin (deux sous une combinaison, qui couvre tout).
  // La chaleur du matin vient des couches qu'on enlève. Après 2 ans, le pantalon du matin reste : le manteau ne couvre pas les jambes.
  const worn = layers(b0);
  const drop = variant?.base_max_drop ?? (worn.has('dessus') ? J.base_max_drop_under_dessus : J.base_max_drop);
  const baseIdx = Math.max(Math.min(...segs.map((sg) => sg.band)), b0 - drop);
  const base = bandItems(baseIdx, mode, variant, R, style).filter(isFixed);
  const morning = [...base, ...worn.values()];

  // Changements. Tête, mains et pieds suivent la tranche : bonnet, moufles, chaussons et chancelière restent tant
  // qu'elle les demande (au soleil, le bonnet devient un chapeau). Combinaison, pull et gilet suivent la chaleur
  // des vêtements (journee.warmth), avec le même équilibre que le découpage : trop couvert pèse plus que pas assez.
  // En se réchauffant, on enlève la combinaison, puis le pull (ou il devient un gilet), sans trop découvrir ;
  // en se refroidissant, on remet des couches, d'abord celles enlevées plus tôt, qu'on a sous la main.
  const warmthOf = (items) => items.reduce((sum, item) => sum + (J.warmth[item] ?? 0), 0);
  const w = (item) => J.warmth[item] ?? 0;
  const sun = (item) => J.sun_hats.includes(item);
  const removed = new Map();
  const states = [new Map(worn)];
  const changes = segs.slice(1).map((sg, i) => {
    const warmer = sg.band < segs[i].band;
    const target = layers(sg.band);
    const goal = warmthOf(bandItems(sg.band, mode, variant, R, style));
    const cost = (heat) => (heat > goal ? J.over_weight * (heat - goal) : J.under_weight * (goal - heat));
    const allowed = (heat) => heat >= goal - J.warmth_under_tolerance;
    let heat = warmthOf([...base, ...worn.values()]);
    const remove = [];
    const add = [];
    const take = (slot) => {
      const c = worn.get(slot);
      remove.push(c);
      removed.set(slot, c);
      worn.delete(slot);
      heat -= w(c);
    };
    const put = (slot, item) => {
      add.push(item);
      worn.set(slot, item);
      heat += w(item);
    };
    if (warmer) {
      for (const slot of J.remove_order) {
        const c = worn.get(slot);
        const want = target.get(slot);
        if (slot === 'tete' && want && sun(want) && !(c && sun(c))) {
          if (c) take(slot);
          put(slot, want);
          continue;
        }
        if (!c || sun(c)) continue;
        if (J.extremities.includes(slot)) {
          if (!want) take(slot);
          continue;
        }
        // Garder, enlever, ou échanger le pull contre un gilet plus léger (qui doit alors être dans le sac : swap_cost).
        const options = [{ heat, cost: cost(heat) }, { heat: heat - w(c), cost: cost(heat - w(c)), take: true }];
        if (slot === 'haut' && want && w(want) < w(c)) {
          options.push({ heat: heat - w(c) + w(want), cost: cost(heat - w(c) + w(want)) + J.swap_cost, take: true, swap: true });
        }
        const best = options.filter((o) => !o.take || allowed(o.heat)).reduce((a, b) => (b.cost < a.cost - 1e-9 ? b : a));
        if (!best.take) continue;
        take(slot);
        if (best.swap) put(slot, want);
      }
    } else {
      for (const slot of J.add_order) {
        const want = target.get(slot);
        if (!want || worn.has(slot)) continue;
        const earlier = removed.get(slot);
        const item = earlier && sun(earlier) === sun(want) ? earlier : want;
        if (J.extremities.includes(slot) || cost(heat + w(item)) < cost(heat) - 1e-9) put(slot, item);
      }
    }
    states.push(new Map(worn));
    return { time: fmtMin(hours[sg.from].start), from: sg.from, band: bands[sg.band].id, remove, add };
  });
  const wornAt = (k) => states[segs.findLastIndex((sg) => sg.from <= k)];

  // Le sac, trois objets au plus : la couche à remettre plus tard (la plus chaude d'abord) ; à pied ou en voiture,
  // la couche qu'il porterait en poussette ; la protection contre la pluie ; un chapeau au soleil ;
  // puis les autres couches à remettre, et celles qui manqueraient aux heures plus fraîches.
  const slots = Object.keys(J.slots);
  const start = new Set(morning);
  const later = changes.flatMap((ch) => ch.add.map((item) => ({ item, reason: 'plus_tard', time: ch.time })))
    .filter((x) => !start.has(x.item))
    .sort((x, y) => slots.indexOf(slotOf(J, x.item)) - slots.indexOf(slotOf(J, y.item)));
  const bag = [];
  if (later[0]) bag.push(later[0]);
  if (J.carry_dessus_for.includes(mode)) {
    const plain = bandItems(clamp(b0 - t.band_shift, 0, bands.length - 1), 'poussette', variant, R).find((i) => slotOf(J, i) === 'dessus');
    if (plain && !start.has(plain)) bag.push({ item: plain, reason: t.carry_reason ?? (mode === 'voiture' ? 'voiture' : 'pause') });
  }
  const rainy = hours.find((sl) => sl.precip_prob >= J.bag.rain_prob_at_least);
  if (rainy) bag.push({ item: t.rain_gear, reason: 'pluie', time: fmtMin(rainy.start) });
  const sunny = hours.findIndex((sl, k) => sl.uv >= R.relay_triggers.uv_at_least && sl.feels_c >= J.bag.sun_feels_c_at_least
    && ![...wornAt(k).values()].some(sun));
  if (sunny >= 0) bag.push({ item: 'chapeau', reason: 'soleil', time: fmtMin(hours[sunny].start) });
  bag.push(...later.slice(1));
  // Ce qui manquerait à une heure plus fraîche que prévu : le bonnet, les moufles ou les chaussons que la tranche
  // demande, et une couche du dessus si la chaleur manque au-delà de la tolérance ; sauf ce qui a été enlevé plus tôt.
  needs.forEach((need, k) => {
    const now = wornAt(k);
    const target = layers(need);
    const handy = (sl) => changes.some((ch) => ch.from <= k && ch.remove.some((r) => slotOf(J, r) === sl));
    const missing = (sl) => target.has(sl) && !now.has(sl) && !sun(target.get(sl)) && !handy(sl);
    const short = warmthOf([...base, ...now.values()]) < warmthOf(bandItems(need, mode, variant, R, style)) - J.warmth_under_tolerance;
    const torso = short ? J.add_order.find((sl) => !J.extremities.includes(sl) && missing(sl)) : null;
    for (const sl of [torso, ...J.extremities.filter(missing)].filter(Boolean)) {
      bag.push({ item: target.get(sl), reason: 'si_frais', time: fmtMin(hours[k].start) });
    }
  });
  const packed = bag.filter((x, i) => bag.findIndex((y) => y.item === x.item) === i).slice(0, J.bag.max_items);

  // On ne remet que ce qu'on a sous la main : porté le matin, ou dans le sac.
  const handy = new Set([...morning, ...packed.map((x) => x.item)]);
  const kept = changes
    .map((ch) => ({ ...ch, add: ch.add.filter((item) => handy.has(item)) }))
    .filter((ch) => ch.remove.length || ch.add.length);
  const feels = hours.map((sl) => sl.feels_c);
  const first = feels[0];
  const extreme = Math.max(...feels) - first >= first - Math.min(...feels) ? Math.max(...feels) : Math.min(...feels);
  return {
    from: fmtMin(hours[0].start),
    to: fmtMin(hours.at(-1).end),
    feels: { first: Math.round(first), extreme: Math.round(extreme) },
    band: bands[b0].id,
    base_band: bands[baseIdx].id,
    transport: mode,
    morning,
    changes: kept.map(({ from, ...ch }) => ch),
    bag: packed,
    hours: hours.map((sl) => ({ time: fmtMin(sl.start), feels_c: sl.feels_c, precip_prob: sl.precip_prob, uv: sl.uv })),
    notes: [...t.notes],
    check: J.check,
  };
}

// Tenue portée à une heure donnée du plan de la journée : celle du matin, avec les changements déjà passés.
export function journeeAt(journee, hhmm) {
  const items = [...journee.morning];
  let next = null;
  for (const ch of journee.changes) {
    if (toMin(ch.time) > toMin(hhmm)) {
      next = ch;
      break;
    }
    for (const item of ch.remove) items.splice(items.indexOf(item), 1);
    items.push(...ch.add.filter((item) => !items.includes(item)));
  }
  return { items, next };
}

// À la maison, en journée : la tenue selon la température de la pièce où il passe la journée, relevée à part
// de la chambre (day_room_temp_c) ; sans relevé, pour le milieu de la plage de 20 à 22 °C (Mieux vivre, Québec), en le disant.
function planIndoor(input, R, age) {
  const I = R.indoor;
  const room = input.profile.day_room_temp_c ?? null;
  const ref = room ?? (I.comfort_range_c.min + I.comfort_range_c.max) / 2;
  const t = I.round_room_temp ? Math.round(ref) : ref;
  const variant = (I.age_variants ?? []).filter((v) => age >= v.from_months).at(-1);
  const bin = (variant?.bins ?? I.bins).find((b) => b.max_c === null || t <= b.max_c);
  const hot = room !== null && room >= I.heat_room_c_at_least;
  // Tenues au choix : la tenue de la tranche, puis chaque style qui la change (sans pyjama…) ; celui de l'enfant, sinon la première.
  const styles = ['pyjama', ...Object.keys(R.outfit.day_styles ?? {})]
    .map((id) => ({ id, wear: styled(bin.wear, R.outfit.day_styles?.[id] ?? null) }))
    .filter((st, k, all) => k === 0 || st.wear.join() !== all[0].wear.join());
  const current = styles.find((st) => st.id === dayStyleId(R, input.profile)) ?? styles[0];
  return {
    room_temp_c: room,
    room_assumed: room === null,
    room_status: room === null ? 'unknown' : room < I.comfort_range_c.min ? 'below' : room > I.comfort_range_c.max ? 'above' : 'in_range',
    wear: [...current.wear],
    day_style: current.id,
    styles,
    relays: sortByPriority([...(hot ? I.when_hot : []), ...I.always], R.relay_priority),
  };
}

// Gigoteuse (TOG) et tenue dessous selon la chambre ; sans relevé, pour le repère officiel (milieu de 18-20 °C), en le disant.
// Chaque tranche a sa tenue principale et, parfois, d'autres publiées par les fabricants, jamais plus chaudes (lint) :
// le choix fait pour une tranche (night_options : { tranche: tenue }) vaut pour elle seule.
// Les repères du couchage du nourrisson ne s'affichent plus à partir de 2 ans.
function planNight(input, R, heat, age) {
  const n = R.night;
  const room = input.profile.room_temp_c ?? null;
  const relays = n.always.filter((id) => age < n.baby_until_months || !n.baby_only.includes(id));
  let status = 'unknown';
  if (room !== null) {
    status = room < n.room_range_c.min ? 'below' : room > n.room_range_c.max ? 'above' : 'in_range';
    relays.push(...n.when_room_known);
  }
  const ref = room ?? (n.room_range_c.min + n.room_range_c.max) / 2;
  const t = n.tog_hint.round_room_temp ? Math.round(ref) : ref;
  const bin = n.tog_hint.bins.find((b) => b.max_c === null || t <= b.max_c);
  if (heat || (room !== null && room >= n.heat_room_c_at_least)) relays.push('relay.heat.shutters');
  const options = [{ id: 'principal', tog: bin.tog, wear: bin.wear ?? [], sources: bin.sources ?? [] }, ...(bin.alternatives ?? [])]
    .map((o) => ({ id: o.id, tog: o.tog, wear: [...o.wear], sources: [...(o.sources ?? [])] }));
  const chosen = options.find((o) => o.id === input.profile.night_options?.[bin.id]) ?? options[0];
  return {
    room_temp_c: room,
    room_status: status,
    room_assumed: room === null,
    tog: chosen.tog,
    wear: [...chosen.wear],
    bin: bin.id ?? null,
    option: chosen.id,
    options,
    relays: sortByPriority(relays, R.relay_priority),
  };
}

export function needMet(need, week, band, transport) {
  if (need.week_tmean_below != null && !(week.tmean < need.week_tmean_below)) return false;
  if (need.week_tmax_at_least != null && !(week.tmax_mean >= need.week_tmax_at_least)) return false;
  if (need.week_tmean_at_least != null && !(week.tmean >= need.week_tmean_at_least)) return false;
  if (need.week_tmax_below != null && !(week.tmax_mean < need.week_tmax_below)) return false;
  if (need.week_band_in && !need.week_band_in.includes(band)) return false;
  if (need.week_rainy_days_at_least != null && !(week.rainy_days >= need.week_rainy_days_at_least)) return false;
  if (need.week_uv_max_at_least != null && !(week.uv_max_mean >= need.week_uv_max_at_least)) return false;
  if (need.transport_in && !need.transport_in.includes(transport)) return false;
  return true;
}

// Quantité conseillée d'une catégorie (suggestion pratique) : pour les vêtements de tous les jours, de quoi tenir entre
// deux lessives plus une pièce de rechange (le rythme de lessive se règle : wash_days) ; sinon un nombre fixe, deux
// gigoteuses (une portée, une au lavage), une combinaison. Les pyjamas comptent double portés aussi la journée.
export function quantityFor(cat, profile, R) {
  const Q = R.purchases.quantities;
  if (!cat.per_day) return cat.quantity ?? 1;
  const perDay = cat.per_day_by_style?.[dayStyleId(R, profile)] ?? cat.per_day;
  return Math.ceil(perDay * (profile.wash_days ?? Q.wash_days_default)) + Q.spare;
}

// Combien on en a dans une taille : la garde-robe note une taille par pièce (« 6m » trois fois : trois). Les versions
// précédentes, qui ne notaient qu'une fois chaque taille, lisent toujours la même liste.
export const ownedCount = (inventory, catId, size) => (inventory?.[catId] ?? []).filter((code) => code === size).length;

// Gigoteuses d'une taille dont le TOG est dans la liste : notées par TOG (« 6-18m|2,5 »), et celles notées avant la
// 0.16 sans TOG, comptées comme chaude (2,5 TOG) ou légère (1 TOG).
export function sleepbagCount(inventory, size, togs, R) {
  const S = R.purchases.sleepbags;
  const noted = (inventory?.[S.inventory] ?? []).filter((entry) => {
    const [code, tog] = entry.split('|');
    return code === size && togs.includes(tog);
  }).length;
  return noted + Object.entries(S.legacy).filter(([, tog]) => togs.includes(tog)).reduce((n, [id]) => n + ownedCount(inventory, id, size), 0);
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
      if (cat.max_age_m && ageWeek >= cat.max_age_m) continue;
      if (!needMet(cat.need_if, week, band, baseTransport(transportFor(profile, ageWeek, R), R))) continue;
      const system = P.size_systems[cat.size_system];
      // Les vêtements de tous les jours ne sont proposés qu'une fois notés dans la garde-robe : sans rien noté, on ne
      // sait pas ce qu'il a déjà.
      if (cat.suggest_once_noted && !(profile.inventory?.[cat.id] ?? []).length) continue;
      const need = quantityFor(cat, profile, R);
      const owned = (code) => (cat.togs ? sleepbagCount(profile.inventory, code, cat.togs, R) : ownedCount(profile.inventory, cat.id, code));
      if (owned(sizeFor(system, ageWeek).code) >= need) continue;
      // On achète la taille qui servira encore dans quelques semaines.
      const buy = sizeFor(system, ageMonths(profile.birth, addDays(week.week_start, P.size_lookahead_days)));
      if (owned(buy.code) >= need) continue;
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
        quantity: need,
        owned: owned(buy.code),
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

const shortList = (items, labels) => items.map((i) => labels.items_short[i] ?? i).join(', ');

// Un changement en quelques mots : « 12 h : − combi pilote… + gilet » (le premier vêtement de chaque sens).
export function changeLine(ch, labels, { full = false } = {}) {
  const part = (sign, items) => {
    if (!items.length) return '';
    return `${sign} ${full ? shortList(items, labels) : `${labels.items_short[items[0]] ?? items[0]}${items.length > 1 ? '…' : ''}`}`;
  };
  return `${hourFr(ch.time)} : ${[part('−', ch.remove), part('+', ch.add)].filter(Boolean).join(' ')}`;
}

// Ressenti du reste de la journée, depuis l'heure qu'il est : le premier, et le plus éloigné (« 6° → 17° »).
export function journeeRange(journee, now) {
  const rest = journee.hours.filter((h) => toMin(h.time) + 60 > toMin(now));
  const hours = rest.length ? rest : journee.hours;
  const first = Math.round(hours[0].feels_c);
  const feels = hours.map((h) => Math.round(h.feels_c));
  const up = Math.max(...feels);
  const down = Math.min(...feels);
  const extreme = up - first >= first - down ? up : down;
  return { when: toMin(now) < toMin('12:00') ? 'Ce matin' : 'Cet après-midi', first, extreme, stable: Math.abs(extreme - first) < 2 };
}

// « Ce matin 6° → 17° », « Cet après-midi 15° → 11° », « Ce matin 6° ».
export function journeeFeels(journee, now, M) {
  const range = journeeRange(journee, now);
  return render(M, range.stable ? 'journee.stable' : 'journee.range', 'short', range);
}

// Ce qui suit dans la journée : le prochain changement, le sac, puis le changement d'après.
export function journeePlanLine(journee, now, M) {
  const labels = M.labels;
  const next = journee.changes.filter((ch) => toMin(ch.time) > toMin(now));
  const bag = journee.bag.length ? render(M, 'journee.bag', 'short', { items: shortList(journee.bag.map((b) => b.item), labels) }) : '';
  const parts = [next[0] && changeLine(next[0], labels), bag, next[1] && changeLine(next[1], labels)].filter(Boolean);
  return parts.length ? capitalize(parts.join(' · ')) : null;
}

// La veille au soir : « Demain 3° → 12° · pluie vers 15 h ».
export function eveningTitle(tomorrow, M) {
  const j = tomorrow.journee;
  const range = journeeRange(j, j.from);
  const rain = j.bag.find((b) => b.reason === 'pluie');
  return render(M, 'evening.tomorrow', 'short', {
    range: range.stable ? `${range.first}°` : `${range.first}° → ${range.extreme}°`,
    rain: rain ? ` · pluie vers ${hourFr(rain.time)}` : '',
  });
}

// La nuit en quelques mots : « nuit : body ML + 2,5 TOG », « nuit 21,5° : pyjama léger + 1 TOG » avec un relevé.
export const eveningNight = (night, M) => render(M, 'evening.night', 'short', {
  wear: night.wear.map((i) => M.labels.items_short[i] ?? i).join(' + '),
  tog: night.tog,
  room: night.room_temp_c === null ? '' : ` ${frNumber(night.room_temp_c)}°`,
});

// Le rappel du soir : la tenue de demain matin, le sac, la nuit.
export function reminderText(today, tomorrow, M) {
  const j = tomorrow.journee;
  const labels = M.labels;
  return render(M, 'evening.reminder', 'text', {
    outfit: capitalize(j.morning.map((i) => labels.items_short[i] ?? i).join(', ')),
    bag: j.bag.length ? ` · ${render(M, 'journee.bag', 'short', { items: shortList(j.bag.map((b) => b.item), labels) })}` : '',
    night: eveningNight(today.night, M),
  });
}

// Les trois lignes du widget pour le moment voulu : « jour » (la journée en couches) ou « soir » : avec `tomorrow`
// (résultat du lendemain), la tenue et le sac de demain à préparer, et la nuit ; sinon la nuit et les achats.
// Avec `drawings`, la tenue (le jour) et la gigoteuse (le soir) deviennent des dessins :
// { drawings: [identifiants de engine/drawings.js], text, label }, `label` gardant le texte pour les petits formats.
export function widgetLines(result, moment, M, { drawings = false, tomorrow = null } = {}) {
  const labels = M.labels;
  const lines = [];
  const j = result.journee;
  if (moment === 'soir' && tomorrow?.journee) {
    const next = tomorrow.journee;
    lines.push(eveningTitle(tomorrow, M));
    const label = capitalize(next.morning.map((i) => labels.items_short[i] ?? i).join(' · '));
    lines.push(drawings ? { drawings: next.morning.map((i) => ITEM_DRAWINGS[i]).filter(Boolean), text: '', label } : label);
    const bag = next.bag.length ? render(M, 'journee.bag', 'short', { items: shortList(next.bag.map((b) => b.item), labels) }) : '';
    lines.push(capitalize([bag, result.night.tog ? eveningNight(result.night, M) : ''].filter(Boolean).join(' · ')));
  } else if (moment === 'jour' && j) {
    // Le jour : le ressenti, la tenue du moment, puis le prochain changement et le sac (une alerte officielle passe avant).
    const now = result.now ?? '08:00';
    const vigilance = result.outing.reason === 'vigilance';
    lines.push(vigilance ? render(M, 'outing.none.vigilance', 'short') : journeeFeels(j, now, M));
    const { items } = journeeAt(j, now);
    const label = capitalize(items.map((i) => labels.items_short[i] ?? i).join(' · '));
    lines.push(drawings ? { drawings: items.map((i) => ITEM_DRAWINGS[i]).filter(Boolean), text: '', label } : label);
    lines.push(j.alert ? render(M, j.alert, 'short', result.params) : journeePlanLine(j, now, M) ?? render(M, result.relays[0] ?? j.check, 'short', result.params));
  } else if (moment === 'jour') {
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
    // Tenue de nuit : ce qu'on met sous la gigoteuse, puis la gigoteuse et son TOG.
    if (n.tog) {
      const label = render(M, 'fabricant.night_wear', 'short', { wear: capitalize(n.wear.map((i) => labels.items_short[i] ?? i).join(' + ')), tog: n.tog });
      lines.push(drawings ? { drawings: [...n.wear.map((i) => ITEM_DRAWINGS[i]).filter(Boolean), 'gigoteuse'], text: `≈ ${n.tog} TOG`, label } : label);
    }
    const p = result.purchases[0];
    lines.push(
      p
        ? render(M, 'purchase.suggestion', 'short', {
          label: labels.categories[p.category],
          size: p.size === 'unique' ? '' : `, ${p.size_label}`,
        })
        : render(M, n.relays.includes('relay.sleep.basics') ? 'relay.sleep.basics' : 'relay.sleep.check_temp', 'short'),
    );
  }
  return lines.filter(Boolean).slice(0, 3);
}

// Onglet et widget Maison : le relevé comparé à son repère (le jour 20 à 22 °C, la nuit la chambre à 18-20 °C).
function homeRange(kind, R) {
  const range = kind === 'nuit' ? R.night.room_range_c : R.indoor.comfort_range_c;
  return { min: range.min, max: range.max };
}
export const homeStatus = (plan, kind, R, M) => render(M, `maison.${kind}.${plan.room_temp_c === null ? 'unknown' : plan.room_status}`, 'short', homeRange(kind, R));

// La tenue de la maison sur une ligne de widget : dessins (et la gigoteuse la nuit) ou texte.
function homeOutfit(plan, kind, M, drawings) {
  const names = plan.wear.map((i) => M.labels.items_short[i] ?? i);
  const label = kind === 'nuit'
    ? render(M, 'fabricant.night_wear', 'short', { wear: capitalize(names.join(' + ')), tog: plan.tog })
    : capitalize(names.join(' · '));
  if (!drawings) return label;
  const ids = plan.wear.map((i) => ITEM_DRAWINGS[i]).filter(Boolean);
  return kind === 'nuit' ? { drawings: [...ids, 'gigoteuse'], text: `≈ ${plan.tog} TOG`, label } : { drawings: ids, text: '', label };
}

// Les trois lignes du widget Maison (iPhone) : le relevé, la tenue, l'état par rapport au repère.
export function homeLines(result, kind, bundle, { drawings = false } = {}) {
  const M = bundle.messages;
  const plan = kind === 'nuit' ? result.night : result.indoor;
  const title = plan.room_temp_c === null
    ? render(M, `maison.${kind}.title_unknown`, 'short')
    : render(M, `maison.${kind}.title`, 'short', { room: frNumber(plan.room_temp_c) });
  return [title, homeOutfit(plan, kind, M, drawings), homeStatus(plan, kind, bundle.rules, M)];
}

// Widget Maison d'Android : pour chaque relevé possible (10 à 35 °C, au demi-degré), la tenue et l'état, le jour et la nuit,
// calculés d'avance pour que − et + répondent tout de suite, sans réseau ni moteur. `unknown` : sans relevé récent.
export function homeTable(input, bundle, { drawings = true } = {}) {
  const R = bundle.rules;
  const M = bundle.messages;
  const age = ageMonths(input.profile.birth, input.date);
  const entry = (kind, room) => {
    const profile = { ...input.profile, room_temp_c: kind === 'nuit' ? room : null, day_room_temp_c: kind === 'jour' ? room : null };
    const plan = kind === 'nuit' ? planNight({ ...input, profile }, R, false, age) : planIndoor({ ...input, profile }, R, age);
    return { outfit: homeOutfit(plan, kind, M, drawings), status: homeStatus(plan, kind, R, M) };
  };
  const temps = Array.from({ length: 51 }, (_, k) => 10 + k / 2);
  const table = { confirm: render(M, 'maison.widget.confirm', 'short') };
  for (const kind of ['jour', 'nuit']) {
    table[kind] = { unknown: entry(kind, null), by: Object.fromEntries(temps.map((t) => [t.toFixed(1), entry(kind, t)])) };
  }
  return table;
}

// Le plus court (widget rond de l'écran verrouillé) : l'heure du prochain changement, le ressenti, ou le TOG le soir.
export function widgetShort(result, moment) {
  if (moment === 'soir') return result.night.tog ?? '—';
  const j = result.journee;
  if (!j) return result.outing.window ? hourFr(result.outing.window.start) : '—';
  const next = j.changes.find((ch) => toMin(ch.time) > toMin(result.now ?? '08:00'));
  return next ? hourFr(next.time) : `${j.feels.first}°`;
}

export const momentOf = (now) => (toMin(now ?? '08:00') < toMin('18:00') ? 'jour' : 'soir');
// Onglet et widget Maison : la journée de 6 h à 18 h, la nuit (sa chambre) le reste du temps.
export const homeMoment = (now) => {
  const m = toMin(now ?? '08:00');
  return m >= toMin('06:00') && m < toMin('18:00') ? 'jour' : 'nuit';
};
// Ce qu'affichent l'app et les widgets : le soir dès 18 h, ou dès que la dernière sortie possible de la journée est passée.
export const displayMoment = (result, now) => (momentOf(now) === 'soir' || result.outing.reason === 'journee_terminee' ? 'soir' : 'jour');

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
    : chooseOutfit(round1(mean(ref.map((sl) => sl.feels_c))), input.profile, R, age);
  if (outfit) addOverlays(outfit, plan, ref, R, params, bundle.messages.labels);
  const result = {
    date: input.date,
    now: input.now ?? null,
    age_months: round1(age),
    transport: transportFor(input.profile, age, R),
    outing: {
      window: plan.window,
      windows: plan.windows,
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
    journee: planJournee(input, R, age, plan),
    indoor: planIndoor(input, R, age),
    night: planNight(input, R, plan.heat, age),
    purchases: planPurchases(input, R),
  };
  // Alerte officielle qui passe avant le plan de la journée dans le widget (vigilance, grand froid, chaleur…).
  if (result.journee) result.journee.alert = result.relays.find((id) => R.journee.widget_urgent_relays.includes(id)) ?? null;
  const moment = displayMoment(result, input.now);
  result.widget = {
    lines: widgetLines(result, moment, bundle.messages),
    check: render(bundle.messages, R.journee.check, 'short'),
    check_tiny: render(bundle.messages, R.journee.check, 'tiny'),
    short: widgetShort(result, moment),
  };
  if (input.check_product) result.product = checkProduct(input.check_product, age, R);
  return result;
}

// Tenue pour une heure précise (« et si on sort à 16 h ? »), avec les rappels pratiques de cette heure.
export function outfitAt(input, bundle, hhmm) {
  const R = bundle.rules;
  const age = ageMonths(input.profile.birth, input.date);
  const plan = planOuting(input, R, age);
  const slot = plan.slots.find((sl) => sl.start === toMin(hhmm));
  if (!slot) return null;
  const outfit = chooseOutfit(slot.feels_c, input.profile, R, age);
  const params = {};
  addOverlays(outfit, plan, [slot], R, params, bundle.messages.labels);
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
    R.journee.check,
    ...R.indoor.always,
    ...R.indoor.when_hot,
    ...R.journee.widget_urgent_relays,
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
  for (const variant of R.outfit.age_variants ?? []) {
    for (const [band, list] of Object.entries(variant.bands)) {
      if (!R.outfit.bands.some((b) => b.id === band)) errors.push(`tranche inconnue dans ${variant.id} : ${band}`);
      list.forEach((item) => items.add(item));
    }
  }
  for (const t of Object.values(R.outfit.transport)) {
    for (const replacement of Object.values(t.replace_items ?? {})) replacement.forEach((item) => items.add(item));
    items.add(t.rain_gear);
    if (!M.labels.rain_gear[t.rain_gear]) errors.push(`protection de pluie sans libellé : ${t.rain_gear}`);
  }
  for (const item of items) {
    const slot = slotOf(R.journee, item);
    if (!slot && !Object.values(R.outfit.transport).some((t) => t.rain_gear === item)) errors.push(`vêtement sans emplacement (journee.slots) : ${item}`);
    if (slot && R.journee.warmth[item] === undefined) errors.push(`vêtement sans chaleur (journee.warmth) : ${item}`);
    if (!M.labels.items[item]) errors.push(`libellé manquant : ${item}`);
    if (!M.labels.items_short[item]) errors.push(`libellé court manquant : ${item}`);
    if (!M.labels.layers[M.labels.item_layers[item]]) errors.push(`couche inconnue pour : ${item}`);
    if (!DRAWINGS[ITEM_DRAWINGS[item]]) errors.push(`dessin manquant : ${item}`);
  }
  const nightWear = R.night.tog_hint.bins.flatMap((b) => [b, ...(b.alternatives ?? [])]);
  for (const item of [...nightWear, ...R.indoor.bins, ...R.indoor.age_variants.flatMap((v) => v.bins)].flatMap((b) => b.wear ?? [])) {
    if (!M.labels.items_short[item]) errors.push(`libellé court manquant : ${item}`);
    if (!DRAWINGS[ITEM_DRAWINGS[item]]) errors.push(`dessin manquant : ${item}`);
  }
  // Tenues au choix. Le jour, l'équivalent du pyjama remplacé, pas une couche de moins : un haut (journee.slots.peau),
  // un bas (corps), et des chaussettes si le pyjama remplacé couvre les pieds ; le porte-bébé de même. La nuit, ce qu'on
  // met dessous s'additionne au TOG : une gigoteuse plus légère va avec des vêtements plus chauds, une plus chaude avec
  // des vêtements plus légers, et à gigoteuse égale, une couche fine d'écart au plus ; chaque tenue cite son fabricant.
  const heat = (list) => list.reduce((sum, item) => sum + (R.journee.warmth[item] ?? Number.NaN), 0);
  const togOf = (tog) => Number(String(tog).replace(',', '.'));
  const footed = ['pyjama', 'pyjama_chaud'];
  const swaps = [...Object.entries(R.outfit.day_styles ?? {}).map(([id, style]) => [`style ${id}`, style.replace_items]),
    ['porte-bébé', R.outfit.transport.porte_bebe?.replace_items ?? {}]];
  for (const [who, replace] of swaps) {
    for (const [item, replacement] of Object.entries(replace)) {
      if (!item.startsWith('pyjama')) continue;
      const has = (slot) => replacement.some((r) => R.journee.slots[slot].includes(r));
      const socks = replacement.some((r) => r.startsWith('chaussettes'));
      if (!has('peau') || !replacement.some((r) => r.startsWith('pantalon')) || (footed.includes(item) && !socks)) {
        errors.push(`${who} : ${replacement.join(' + ')} n'équivaut pas à ${item} (un haut, un pantalon${footed.includes(item) ? ' et des chaussettes' : ''})`);
      }
      for (const r of replacement) if (!M.labels.items_short[r] || !DRAWINGS[ITEM_DRAWINGS[r]]) errors.push(`${who} : ${r} sans libellé ou dessin`);
    }
  }
  const binIds = new Set();
  for (const bin of R.night.tog_hint.bins) {
    if (!bin.id || binIds.has(bin.id)) errors.push(`tranche de nuit sans identifiant unique : ${bin.max_c}`);
    binIds.add(bin.id);
    for (const option of [bin, ...(bin.alternatives ?? [])]) {
      if (!option.sources?.length || option.sources.some((sid) => sourceById.get(sid)?.level !== 'C')) errors.push(`nuit ${bin.id} : ${option.id ?? 'principale'} sans fabricant cité`);
    }
    for (const alt of bin.alternatives ?? []) {
      if (alt.id === 'principal') errors.push(`nuit ${bin.id} : identifiant réservé`);
      const dt = togOf(alt.tog) - togOf(bin.tog);
      const dw = heat(alt.wear) - heat(bin.wear);
      const compensated = dt < 0 ? dw > 0 : dt > 0 ? dw < 0 : Math.abs(dw) <= 0.5;
      if (!compensated) errors.push(`nuit ${bin.id} : ${alt.id} non compensée (gigoteuse ${alt.tog} TOG au lieu de ${bin.tog}, vêtements ${dw >= 0 ? '+' : ''}${dw})`);
    }
  }
  // Les TOG des gigoteuses par saison sont ceux du tableau de nuit des fabricants.
  const nightTogs = new Set(R.night.tog_hint.bins.flatMap((b) => [b.tog, ...(b.alternatives ?? []).map((a) => a.tog)]));
  for (const tog of R.purchases.sleepbags.togs) if (!nightTogs.has(tog)) errors.push(`gigoteuse ${tog} TOG absente du tableau de nuit`);
  for (const cat of R.purchases.categories) {
    for (const tog of cat.togs ?? []) if (!R.purchases.sleepbags.togs.includes(tog)) errors.push(`${cat.id} : ${tog} TOG inconnu`);
    if (!M.labels.categories[cat.id]) errors.push(`libellé manquant : ${cat.id}`);
    if (!DRAWINGS[CATEGORY_DRAWINGS[cat.id]]) errors.push(`dessin manquant : ${cat.id}`);
  }
  const toVerify = S.sources.filter((src) => src.verification !== 'lu').map((src) => `${src.id} (${src.verification})`);
  return { errors, toVerify };
}
