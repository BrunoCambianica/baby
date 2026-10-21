// Tests de l'adaptateur Open-Meteo sur des réponses réelles enregistrées (Lyon, 21 octobre 2026).
import { join } from 'node:path';
import { evaluate } from '../engine/engine.js';
import {
  buildInput, climateUrls, configToProfile, daylightForDate, decodeConfig, encodeConfig, forecastUrl,
  hourlyForDate, parisNow, profileToConfig, weeklyOutlook,
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
  assert(result.night.tog === '2,5', `TOG ${result.night.tog}`);
});

test('Configuration du widget : aller-retour avec accents', () => {
  const profile = {
    commune: { nom: 'Saint-Étienne', lat: 45.4339, lon: 4.3906 }, birth: '2026-05', transport: 'porte_bebe',
    outing_window: { from: '10:00', to: '17:00' }, outing_duration_h: 2, outfit_offset: 1,
  };
  const text = encodeConfig(profileToConfig(profile), toB64);
  assert(/^SB1\.[A-Za-z0-9_-]+$/.test(text), text);
  const back = configToProfile(decodeConfig(text, fromB64));
  assert(back.commune.nom === 'Saint-Étienne' && back.transport === 'porte_bebe' && back.outfit_offset === 1, JSON.stringify(back));
  assert(back.outing_window.to === '17:00' && back.outing_duration_h === 2, JSON.stringify(back));
});

test('Configuration du widget : texte invalide refusé', () => {
  assert(decodeConfig('n importe quoi', fromB64) === null, 'texte libre accepté');
  assert(decodeConfig('SB1.!!!', fromB64) === null, 'base64 invalide accepté');
  assert(decodeConfig('', fromB64) === null, 'vide accepté');
});

console.log(`\n${failed ? `${failed} test(s) en échec` : 'Adaptateur : tous les tests OK'}`);
process.exit(failed ? 1 : 0);
