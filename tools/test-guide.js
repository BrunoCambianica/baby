// Guide public : fichiers à jour, pages complètes (titre, description, adresse canonique, un seul h1, aucun script),
// liens internes valides, plan du site complet, tenues identiques à celles du moteur, aucune source douteuse citée.
// Usage : node tools/test-guide.js (lancé par npm test, après npm run build).
import { existsSync, readFileSync } from 'node:fs';
import { join, normalize } from 'node:path';
import { addDays, evaluate } from '../engine/engine.js';
import { buildGuide, SITE } from './build-guide.js';
import { loadRules, ROOT } from './load-rules.js';

const bundle = loadRules();
const { files, pages } = buildGuide(bundle);
const html = (page) => files.get(`${page.path}index.html`);
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

test('Les fichiers du guide sont à jour (sinon : npm run build)', () => {
  const stale = [...files].filter(([rel, content]) => !existsSync(join(ROOT, rel)) || readFileSync(join(ROOT, rel), 'utf8') !== content);
  assert(!stale.length, `à régénérer : ${stale.map(([rel]) => rel).join(', ')}`);
});

test('Chaque page : langue, titre, description, adresse canonique, un seul h1, aucun script', () => {
  for (const page of pages) {
    const h = html(page);
    assert(h.includes('<html lang="fr">'), `${page.path} : langue`);
    assert(/<title>[^<]{20,}<\/title>/.test(h), `${page.path} : titre`);
    const description = h.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
    assert(description.length >= 80 && description.length <= 320, `${page.path} : description de ${description.length} caractères`);
    assert(h.includes(`<link rel="canonical" href="${SITE}${page.path}">`), `${page.path} : adresse canonique`);
    assert((h.match(/<h1[ >]/g) ?? []).length === 1, `${page.path} : un seul h1`);
    assert(!/<script(?![^>]*application\/ld\+json)/.test(h), `${page.path} : un script dans la page`);
    JSON.parse(h.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  }
});

test('Titres et descriptions uniques', () => {
  for (const key of ['title', 'description']) {
    const seen = new Map();
    for (const page of pages) {
      assert(!seen.has(page[key]), `${key} en double : ${page.path} et ${seen.get(page[key])}`);
      seen.set(page[key], page.path);
    }
  }
});

test('Tous les liens internes mènent à une page ou à un fichier du site', () => {
  for (const page of pages) {
    for (const [, href] of html(page).matchAll(/href="([^"]+)"/g)) {
      if (/^(https?:|mailto:|#)/.test(href)) {
        assert(!href.startsWith('http:'), `${page.path} : lien non sécurisé ${href}`);
        continue;
      }
      let target = normalize(join(page.path || '.', href.split('#')[0]));
      if (target === '.' || target.endsWith('/')) target = join(target, 'index.html');
      assert(files.has(target) || existsSync(join(ROOT, target)), `${page.path} : lien cassé ${href}`);
    }
  }
});

test('Le plan du site liste chaque page, une fois', () => {
  const locs = [...files.get('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert(locs.length === pages.length && new Set(locs).size === locs.length, `${locs.length} adresses pour ${pages.length} pages`);
  for (const page of pages) assert(locs.includes(SITE + page.path), `absente du plan : ${page.path}`);
});

test('Les tenues du guide sont celles du moteur (5 °C dehors, 19 °C la nuit)', () => {
  const day = '2026-11-05';
  const hourly = Array.from({ length: 15 }, (_, k) => ({
    time: `${day}T${String(7 + k).padStart(2, '0')}:00`, temp_c: 5, feels_c: 5, precip_prob: 0, precip_mm: 0, gust_kmh: 10, uv: 1,
  }));
  const input = {
    date: day,
    now: '07:30',
    profile: { birth: addDays(day, -183), transport: 'poussette', room_temp_c: 19, inventory: {} },
    forecast: { daylight: { sunrise: '07:00', sunset: '21:00' }, hourly },
    alerts: { vigilance: [], air: null },
    outlook: [],
  };
  const result = evaluate(input, bundle);
  const label = (item) => bundle.messages.labels.items[item];
  const outdoor = html(pages.find((p) => p.path === 'guide/dehors/3-a-8-degres/'));
  for (const item of result.outfit.items) assert(outdoor.includes(label(item)), `3 à 8 °C : ${label(item)} absent`);
  const night = html(pages.find((p) => p.path === 'guide/nuit/chambre-18-a-20-degres/'));
  assert(night.includes(`${result.night.tog} TOG`), `nuit à 19 °C : ${result.night.tog} TOG absent`);
  for (const item of result.night.wear) assert(night.includes(label(item)), `nuit à 19 °C : ${label(item)} absent`);
});

test('Le guide reprend les repères des règles : chambre, maison, tranches', () => {
  const { rules: R } = bundle;
  const hub = html(pages[0]);
  assert(hub.includes(`entre ${R.night.room_range_c.min} et ${R.night.room_range_c.max}`), 'chambre : plage officielle absente');
  assert((hub.match(/href="guide\/dehors\/[^"/]+\/"/g) ?? []).length >= R.outfit.bands.length, 'dehors : une ligne par tranche');
  assert((hub.match(/href="guide\/nuit\/chambre-[^"/]+\/"/g) ?? []).length >= R.night.tog_hint.bins.length, 'nuit : une ligne par tranche');
  const maison = html(pages.find((p) => p.path === 'guide/maison/'));
  assert(maison.includes(`entre ${R.indoor.comfort_range_c.min} et ${R.indoor.comfort_range_c.max}`), 'maison : plage de jour absente');
});

test('Aucune source à vérifier n\'est citée en dehors du registre', () => {
  const doubtful = bundle.sources.sources.filter((s) => s.verification === 'a_verifier' && s.url);
  for (const page of pages.filter((p) => p.path !== 'guide/sources/')) {
    for (const s of doubtful) assert(!html(page).includes(s.url), `${page.path} cite ${s.id} (${s.verification})`);
  }
});

console.log(failed ? `\n${failed} test(s) du guide en échec` : '\nGuide : OK');
process.exit(failed ? 1 : 0);
