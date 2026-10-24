// Tests de l'adaptateur Open-Meteo sur des réponses réelles enregistrées (Lyon, 21 octobre 2026).
import { join } from 'node:path';
import { evaluate, lint, pieceChoices } from '../engine/engine.js';
import {
  buildInput, climateUrls, configChildren, configToProfile, daylightForDate, decodeConfig, encodeConfig, forecastUrl,
  householdToConfig, hourlyForDate, parisNow, pickChild, profileToConfig, weeklyOutlook, widgetView,
} from '../engine/adapter.js';
import { loadRules, readJSON, ROOT } from './load-rules.js';

const FIX = join(ROOT, 'tools', 'fixtures');
const forecast = readJSON(join(FIX, 'forecast-lyon-2026-10-21.json'));
const climate = [2025, 2024, 2023].map((y) => readJSON(join(FIX, `archive-lyon-${y}.json`)));
const bundle = loadRules();
const toB64 = (s) => Buffer.from(s, 'binary').toString('base64');
const fromB64 = (b) => Buffer.from(b, 'base64').toString('binary');

let failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`✗ ${name}\n    ${e.message}`);
  }
}
function assert(cond, message) {
  if (!cond) throw new Error(message);
}

test('URL de prévision : 16 jours, heure de Paris, variables attendues', () => {
  const url = forecastUrl({ lat: 45.758, lon: 4.8351 });
  for (const part of ['latitude=45.7580', 'longitude=4.8351', 'forecast_days=16', 'timezone=Europe%2FParis', 'apparent_temperature', 'uv_index_max']) {
    assert(url.includes(part), `manque ${part} dans ${url}`);
  }
});

test('URL des normales : mêmes semaines des trois années passées', () => {
  const urls = climateUrls({ lat: 45.758, lon: 4.8351 }, '2026-10-21');
  assert(urls.length === 3, `${urls.length} URL`);
  assert(urls[0].includes('start_date=2025-11-04') && urls[0].includes('end_date=2025-12-01'), urls[0]);
  assert(urls[2].includes('start_date=2023-11-04'), urls[2]);
});

test('URL des normales : un 29 février devient 28 février les années non bissextiles', () => {
  const urls = climateUrls({ lat: 45, lon: 4 }, '2028-02-15');
  assert(urls[0].includes('start_date=2027-02-28'), urls[0]);
});

test('Heure de Paris en été et en hiver', () => {
  const summer = parisNow(new Date('2026-10-21T20:30:00Z'));
  assert(summer.date === '2026-10-21' && summer.time === '22:30', JSON.stringify(summer));
  const winter = parisNow(new Date('2026-12-01T23:30:00Z'));
  assert(winter.date === '2026-12-02' && winter.time === '00:30', JSON.stringify(winter));
});

test('Heures du jour : 24 heures, champs complets', () => {
  const hours = hourlyForDate(forecast, '2026-10-21');
  assert(hours.length === 24, `${hours.length} heures`);
  for (const h of hours) {
    for (const k of ['temp_c', 'feels_c', 'precip_prob', 'precip_mm', 'gust_kmh', 'uv']) assert(Number.isFinite(h[k]), `${h.time} ${k}=${h[k]}`);
  }
});

test('Lever et coucher du soleil', () => {
  const d = daylightForDate(forecast, '2026-10-21');
  assert(d.sunrise === '08:05' && d.sunset === '18:44', JSON.stringify(d));
});

test('Six semaines : prévisions, puis mixte, puis normales', () => {
  const weeks = weeklyOutlook({ forecast, climate, date: '2026-10-21', lat: 45.758 });
  assert(weeks.length === 6, `${weeks.length} semaines`);
  assert(weeks.map((w) => w.source).join(',') === 'prevision,prevision,mixte,normales,normales,normales', weeks.map((w) => w.source).join(','));
  for (const w of weeks) {
    assert(w.tmax_mean > -15 && w.tmax_mean < 40 && w.rainy_days >= 0 && w.rainy_days <= 7, JSON.stringify(w));
  }
  assert(weeks[0].week_start === '2026-10-21' && weeks[5].week_start === '2026-11-25', `${weeks[0].week_start} ${weeks[5].week_start}`);
});

test('Sans normales : seulement les semaines couvertes par la prévision', () => {
  const weeks = weeklyOutlook({ forecast, date: '2026-10-21', lat: 45.758 });
  assert(weeks.length === 2, `${weeks.length} semaines`);
});

test('De bout en bout : une vraie journée donne un créneau, une tenue et trois lignes', () => {
  const profile = {
    commune: { nom: 'Lyon', lat: 45.758, lon: 4.8351 }, birth: '2026-05', transport: 'poussette',
    outing_window: { from: '09:00', to: '18:00' }, outing_duration_h: 1, outfit_offset: 0, room_temp_c: 19, inventory: {},
  };
  const input = buildInput({ forecast, climate, profile, date: '2026-10-21', now: '07:30', lat: 45.758 });
  const result = evaluate(input, bundle);
  assert(result.outing.window || result.outing.reason, 'ni créneau ni raison');
  assert(result.outfit && result.outfit.items.length > 2, 'tenue vide');
  assert(result.widget.lines.length === 3, JSON.stringify(result.widget.lines));
  assert(result.outing.slots.length === 9, `${result.outing.slots.length} heures dans la plage`);
  assert(result.night.tog === '2', `TOG ${result.night.tog}`);
});

test('Widget le soir : la tenue et le sac de demain, à préparer, et la nuit ; le rappel du soir', () => {
  const profile = {
    commune: { nom: 'Lyon', lat: 45.758, lon: 4.8351 }, birth: '2026-05', transport: 'poussette',
    outing_window: { from: '08:00', to: '18:00' }, outing_duration_h: 1, outfit_offset: 0, room_temp_c: 19, inventory: {},
  };
  const evening = widgetView({ forecast, profile, date: '2026-10-26', time: '20:30', lat: 45.758 }, bundle, { drawings: true });
  assert(evening.moment === 'soir' && evening.theme === 'nuit' && evening.tomorrow?.date === '2026-10-27', `${evening.moment} ${evening.tomorrow?.date}`);
  assert(evening.lines[0] === 'Demain 5° → 19°', evening.lines[0]);
  assert(evening.lines[1].drawings.includes('combi_chaude'), JSON.stringify(evening.lines[1]));
  assert(evening.lines[2] === 'Sac : gilet · nuit 19° : body ML + pyjama + 2 TOG', evening.lines[2]);
  const rainy = widgetView({ forecast, profile, date: '2026-10-24', time: '20:30', lat: 45.758 }, bundle);
  assert(rainy.lines[0] === 'Demain 8° → 14° · pluie vers 8 h' && rainy.lines[2].startsWith('Sac : habillage pluie'), JSON.stringify(rainy.lines));
  assert(evening.reminder.startsWith('Body ML, haut ML, pantalon, chaussettes, pull, combi pilote') && evening.reminder.endsWith('nuit 19° : body ML + pyjama + 2 TOG'), evening.reminder);
  const morning = widgetView({ forecast, profile, date: '2026-10-27', time: '07:30', lat: 45.758 }, bundle);
  assert(morning.moment === 'jour' && morning.tomorrow === null && morning.reminder === null && morning.lines[0] === 'Ce matin 5° → 19°', JSON.stringify(morning.lines));
  const early = widgetView({ forecast, profile, date: '2026-10-27', time: '16:00', lat: 45.758 }, bundle, { reminder: true });
  assert(early.moment === 'jour' && early.reminder?.startsWith('Body MC, t-shirt, pantalon léger') && early.reminder.includes(' · nuit 19° : '), String(early.reminder));
});

test('Configuration du widget : aller-retour avec accents', () => {
  const profile = {
    commune: { nom: 'Saint-Étienne', code: '42218', dep: '42', lat: 45.4339, lon: 4.3906 }, birth: '2026-05', transport: 'porte_bebe',
    outing_window: { from: '10:00', to: '17:00' }, outing_duration_h: 2, outfit_offset: 1,
  };
  const text = encodeConfig(profileToConfig(profile), toB64);
  assert(/^SB1\.[A-Za-z0-9_-]+$/.test(text), text);
  const back = configToProfile(decodeConfig(text, fromB64));
  assert(back.commune.nom === 'Saint-Étienne' && back.transport === 'porte_bebe' && back.outfit_offset === 1, JSON.stringify(back));
  assert(back.outing_window.to === '17:00' && back.outing_duration_h === 2, JSON.stringify(back));
  assert(back.commune.code === '42218' && back.commune.dep === '42', JSON.stringify(back.commune));
  assert(back.outfit_view === 'dessins', `affichage ${back.outfit_view}`);
  const texte = configToProfile(decodeConfig(encodeConfig(profileToConfig({ ...profile, outfit_view: 'texte' }), toB64), fromB64));
  assert(texte.outfit_view === 'texte', 'affichage en texte perdu');
  const old = configToProfile(decodeConfig(encodeConfig({ v: 1, n: 'Lyon', la: 45.758, lo: 4.8351, b: '2026-05' }, toB64), fromB64));
  assert(old.commune.code === '' && old.transport === 'poussette' && old.outfit_view === 'dessins', 'ancienne configuration refusée');
});

test('Configuration v2 : plusieurs enfants, choisis par numéro, prénom ou identifiant', () => {
  const household = {
    commune: { nom: 'Lyon', code: '69123', dep: '69', lat: 45.758, lon: 4.8351 },
    outing_window: { from: '08:00', to: '18:00' }, outing_duration_h: 1, outfit_view: 'dessins',
    children: [
      { id: 'a1b2c3', name: 'Léo', birth: '2026-05', transport: 'poussette', outfit_offset: 0 },
      { id: 'd4e5f6', name: 'Zoé', birth: '2024-03', transport: 'a_pied', outfit_offset: -1 },
    ],
  };
  const cfg = decodeConfig(encodeConfig(householdToConfig(household), toB64), fromB64);
  assert(cfg?.v === 2 && configChildren(cfg).length === 2, JSON.stringify(cfg));
  assert(pickChild(cfg, '2').name === 'Zoé' && pickChild(cfg, 'zoe').id === 'd4e5f6' && pickChild(cfg, ' ZOÉ ').id === 'd4e5f6', 'choix par numéro ou prénom');
  assert(pickChild(cfg, 'a1b2c3').name === 'Léo' && pickChild(cfg, '').name === 'Léo' && pickChild(cfg, 'Inconnu').name === 'Léo', 'choix par défaut');
  const zoe = configToProfile(cfg, 'Zoé');
  assert(zoe.birth === '2024-03' && zoe.transport === 'a_pied' && zoe.outfit_offset === -1 && zoe.outing_window.from === '08:00', JSON.stringify(zoe));
  assert(zoe.name === 'Zoé' && zoe.child_id === 'd4e5f6' && zoe.commune.code === '69123', JSON.stringify(zoe));
  const one = configChildren(decodeConfig(encodeConfig({ v: 1, n: 'Lyon', la: 45.758, lo: 4.8351, b: '2026-05', t: 'voiture' }, toB64), fromB64));
  assert(one.length === 1 && one[0].transport === 'voiture' && one[0].name === '', 'configuration v1 relue comme un enfant');
  assert(decodeConfig(encodeConfig({ v: 2, n: 'Lyon', la: 45.758, lo: 4.8351, k: [] }, toB64), fromB64) === null, 'v2 sans enfant acceptée');
  assert(decodeConfig(encodeConfig({ v: 2, n: 'Lyon', la: 45.758, lo: 4.8351, k: [{ b: 'mai' }] }, toB64), fromB64) === null, 'naissance invalide acceptée');
});

test('Chancelière de la garde-robe : signalée aux widgets, qui l\'utilisent à la place de la combinaison', () => {
  const household = {
    commune: { nom: 'Lyon', code: '69123', dep: '69', lat: 45.758, lon: 4.8351 },
    outing_window: { from: '08:00', to: '18:00' }, outing_duration_h: 1, outfit_view: 'dessins', updated: 5,
    children: [
      { id: 'leo', name: 'Léo', birth: '2026-05', transport: 'poussette', outfit_offset: 0, inventory: { chanceliere: ['unique'] } },
      { id: 'ema', name: 'Ema', birth: '2026-05', transport: 'poussette', outfit_offset: 0, inventory: {} },
    ],
  };
  const cfg = decodeConfig(encodeConfig(householdToConfig(household), toB64), fromB64);
  assert(cfg.k[0].cm === 1 && !('cm' in cfg.k[1]), JSON.stringify(cfg.k));
  const morning = (ref) => widgetView({ forecast, profile: configToProfile(cfg, ref), date: '2026-10-27', time: '07:30', lat: 45.758 }, bundle).today.journee.morning;
  assert(morning('leo').includes('chanceliere') && !morning('leo').includes('combi_pilote'), morning('leo').join());
  assert(morning('ema').includes('combi_pilote') && !morning('ema').includes('chanceliere'), morning('ema').join());
});

test('Tenues au choix : style de la journée et tenue de nuit passent par la configuration jusqu\'au widget', () => {
  const household = {
    commune: { nom: 'Lyon', code: '69123', dep: '69', lat: 45.758, lon: 4.8351 },
    outing_window: { from: '09:00', to: '18:00' }, outing_duration_h: 1, outfit_view: 'dessins', updated: 5,
    children: [
      { id: 'leo', name: 'Léo', birth: '2026-05', transport: 'poussette', outfit_offset: 0, day_style: 'sans_pyjama', night_options: { n20: 'tog-2' } },
      { id: 'zoe', name: 'Zoé', birth: '2024-03', transport: 'a_pied', outfit_offset: 0 },
    ],
  };
  const cfg = decodeConfig(encodeConfig(householdToConfig(household), toB64), fromB64);
  assert(cfg.k[0].s === 'sans_pyjama' && cfg.k[0].g.n20 === 'tog-2' && !('s' in cfg.k[1]) && !('g' in cfg.k[1]), JSON.stringify(cfg.k));
  const [leo, zoe] = configChildren(cfg);
  assert(leo.day_style === 'sans_pyjama' && leo.night_options.n20 === 'tog-2' && zoe.day_style === null && !Object.keys(zoe.night_options).length, JSON.stringify([leo, zoe]));
  const profile = { ...configToProfile(cfg, 'leo'), room_temp_c: 19 };
  const view = widgetView({ forecast, profile, date: '2026-10-21', time: '20:30', lat: 45.758 }, bundle, { drawings: false });
  assert(view.today.night.tog === '2' && view.lines[2].includes('body ML + pyjama + 2 TOG'), view.lines.join(' | '));
  assert(!view.tomorrow.journee.morning.some((i) => i.startsWith('pyjama')), view.tomorrow.journee.morning.join());
});

test('Pièces au choix : elles passent par la configuration jusqu\'au widget', () => {
  const household = {
    commune: { nom: 'Lyon', code: '69123', dep: '69', lat: 45.758, lon: 4.8351 },
    outing_window: { from: '09:00', to: '18:00' }, outing_duration_h: 1, outfit_view: 'dessins', updated: 5,
    children: [{ id: 'leo', name: 'Léo', birth: '2026-05', transport: 'poussette', outfit_offset: 0 }],
  };
  const at = { forecast, date: '2026-10-21', time: '07:30', lat: 45.758 };
  const before = widgetView({ ...at, profile: configToProfile(householdToConfig(household), 'leo') }, bundle).today.journee.morning;
  const from = before.find((i) => pieceChoices(i, bundle.rules, 'poussette').options.length);
  assert(from, `aucune pièce remplaçable : ${before.join()}`);
  const to = pieceChoices(from, bundle.rules, 'poussette').options[0].item;
  household.children[0].swaps = { [from]: { to } };
  const cfg = decodeConfig(encodeConfig(householdToConfig(household), toB64), fromB64);
  assert(cfg.k[0].w[from].to === to && configChildren(cfg)[0].swaps[from].to === to, JSON.stringify(cfg.k));
  const after = widgetView({ ...at, profile: configToProfile(cfg, 'leo') }, bundle).today.journee;
  assert(after.morning.includes(to) && !after.morning.includes(from) && after.swapped[to] === from, after.morning.join());
});

test('Charte : une tenue de nuit non compensée (gigoteuse plus légère sans couche en plus, ou l\'inverse) est refusée', () => {
  const bad = structuredClone(bundle);
  const n20 = bad.rules.night.tog_hint.bins.find((b) => b.id === 'n20').alternatives;
  // L'erreur de la 0.12 : 1 TOG au lieu de 2,5 avec le même body, à 19 °C.
  n20.push({ id: 'trop-legere', tog: '1', wear: ['body_ml'], sources: ['ergopouch-what-to-wear'] });
  n20.push({ id: 'trop-chaude', tog: '3,5', wear: ['body_ml', 'pyjama', 'gilet'], sources: ['ergopouch-what-to-wear'] });
  n20.push({ id: 'plus-de-vetements', tog: '2,5', wear: ['body_ml', 'pyjama'], sources: ['ergopouch-what-to-wear'] });
  bad.rules.outfit.day_styles.sans_pyjama.replace_items.pyjama = ['pantalon_chaud', 'chaussettes_chaudes'];
  const { errors } = lint(bad);
  for (const id of ['trop-legere', 'trop-chaude', 'plus-de-vetements']) assert(errors.some((e) => e.includes(`n20 : ${id} non compensée`)), `${id} acceptée : ${errors.join(' | ')}`);
  assert(errors.some((e) => e.includes('style sans_pyjama')), errors.join(' | '));
  assert(!lint(bundle).errors.length, lint(bundle).errors.join(' | '));
  const unsourced = structuredClone(bundle);
  unsourced.rules.night.tog_hint.bins[0].alternatives[0].sources = ['carnet-1000-jours'];
  assert(lint(unsourced).errors.some((e) => e.includes('sans fabricant cité')), 'tenue de nuit sans fabricant acceptée');
});

test('Pièces au choix : la charte refuse un équivalent plus léger, qui couvre moins, ou une pièce verrouillée', () => {
  const bad = structuredClone(bundle);
  bad.rules.outfit.alternatives.pairs.push(['veste', 'manteau_chaud'], ['combi_pilote', 'manteau_chaud'], ['bonnet', 'bonnet_fin'], ['gilet', 'veste']);
  const { errors } = lint(bad);
  assert(errors.some((e) => e.includes('veste / manteau_chaud : écart de chaleur 1.5')), errors.join(' | '));
  assert(errors.some((e) => e.includes('combi_pilote / manteau_chaud : pas la même couverture')), errors.join(' | '));
  assert(errors.some((e) => e.includes('bonnet / bonnet_fin : pièce verrouillée')), errors.join(' | '));
  assert(errors.some((e) => e.includes('gilet / veste : pas le même rôle')), errors.join(' | '));
});

test('Pièces au choix : équivalents, presque équivalents et raisons', () => {
  const R = bundle.rules;
  const pull = pieceChoices('pull', R, 'poussette');
  assert(pull.options.length === 1 && pull.options[0].item === 'gilet_chaud' && pull.options[0].gap === -0.5 && !pull.reason, JSON.stringify(pull));
  const combi = pieceChoices('combi_pilote', R, 'poussette');
  assert(!combi.options.length && combi.reason === 'swap.none' && combi.near.some((n) => n.item === 'manteau_chaud' && n.coverage === 'haut_du_corps'), JSON.stringify(combi));
  assert(pieceChoices('couverture_harnais', R, 'voiture').reason === 'relay.car.coat', 'couverture du harnais remplaçable');
  assert(pieceChoices('bonnet', R, 'poussette').reason === 'swap.locked.extremity', 'bonnet remplaçable');
  assert(!pieceChoices('combi_pilote_doublee', R, 'voiture').options.length, 'combinaison de ski proposée en voiture');
  assert(pieceChoices('combi_pilote_doublee', R, 'poussette').options[0]?.item === 'combi_ski', 'combinaison de ski absente en poussette');
});

test('Configuration du widget : texte invalide refusé', () => {
  assert(decodeConfig('n importe quoi', fromB64) === null, 'texte libre accepté');
  assert(decodeConfig('SB1.!!!', fromB64) === null, 'base64 invalide accepté');
  assert(decodeConfig('', fromB64) === null, 'vide accepté');
});

console.log(`\n${failed ? `${failed} test(s) en échec` : 'Adaptateur : tous les tests OK'}`);
process.exit(failed ? 1 : 0);
