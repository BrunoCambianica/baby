// Parcours de l'app dans Chromium (Playwright) : le site est servi en local, la météo et les communes sont simulées
// à partir des réponses enregistrées dans tools/fixtures, l'heure est figée.
// Prérequis : tools/e2e/installer.sh. Usage : npm run e2e   (captures d'écran dans tools/e2e/captures/)
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { encodeConfig, householdToConfig } from '../../engine/adapter.js';
import { readJSON, ROOT } from '../load-rules.js';

const PORT = 8000 + Math.floor(Math.random() * 900);
const BASE = `http://localhost:${PORT}/baby/`;
const APP = `${BASE}app/`;
const CAPTURES = join(ROOT, 'tools', 'e2e', 'captures');
const FIX = join(ROOT, 'tools', 'fixtures');
const forecast = readJSON(join(FIX, 'forecast-lyon-2026-10-21.json'));
const archives = [2025, 2024, 2023].map((y) => readJSON(join(FIX, `archive-lyon-${y}.json`)));
const LYON = { nom: 'Lyon', code: '69123', codeDepartement: '69', codesPostaux: ['69001'], centre: { type: 'Point', coordinates: [4.8351, 45.758] }, population: 520774 };
const toB64 = (s) => Buffer.from(s, 'binary').toString('base64');
const only = process.argv[2] ?? '';

// Bibliothèques système extraites par installer.sh quand elles manquent (WSL sans droits administrateur).
const LIBS = join(homedir(), '.local', 'share', 'superbebe', 'libs', 'usr', 'lib', 'x86_64-linux-gnu');
const env = existsSync(LIBS) ? { ...process.env, LD_LIBRARY_PATH: `${LIBS}:${process.env.LD_LIBRARY_PATH ?? ''}` } : process.env;

mkdirSync(CAPTURES, { recursive: true });
const server = spawn(process.execPath, [join(ROOT, 'tools', 'serve.js')], { env: { ...process.env, PORT: String(PORT) }, stdio: 'pipe' });
await new Promise((resolve) => server.stdout.once('data', resolve));
const browser = await chromium.launch({ env });

// Un téléphone : 390 × 844, heure de Paris figée, météo et communes simulées, erreurs de la page relevées.
async function phone({ at = '2026-10-21T07:30:00+02:00', init } = {}) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'fr-FR', timezoneId: 'Europe/Paris',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    serviceWorkers: 'block',
  });
  await context.route('https://api.open-meteo.com/**', (route) => route.fulfill({ json: forecast }));
  let year = 0;
  await context.route('https://archive-api.open-meteo.com/**', (route) => route.fulfill({ json: archives[year++ % 3] }));
  await context.route('https://geo.api.gouv.fr/**', (route) => route.fulfill({ json: [LYON] }));
  const page = await context.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !m.text().includes('favicon') && page.errors.push(m.text()));
  await page.clock.setFixedTime(new Date(at));
  if (init) await page.addInitScript(init);
  return page;
}

const household = (children, extra = {}) => ({
  v: 2,
  commune: { nom: 'Lyon', code: '69123', dep: '69', cp: '69001', lat: 45.758, lon: 4.8351 },
  outing_window: { from: '09:00', to: '18:00' }, outing_duration_h: 1, outfit_view: 'dessins',
  children, created: 1, updated: Date.parse('2026-10-20T10:00:00+02:00'), ...extra,
});
const LEO = { id: 'leo111', name: 'Léo', birth: '2026-05', transport: 'poussette', outfit_offset: 0, inventory: {}, room: null };
const ZOE = { id: 'zoe222', name: 'Zoé', birth: '2024-03', transport: 'a_pied', outfit_offset: 0, inventory: {}, room: null };
const seed = (h, extra = {}) => `localStorage.setItem('sb.profil', ${JSON.stringify(JSON.stringify(h))});`
  + Object.entries(extra).map(([k, v]) => `localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(JSON.stringify(v))});`).join('');
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('sb.profil')));

let failed = 0;
async function test(name, fn) {
  if (only && !name.includes(only)) return;
  let page = null;
  try {
    await fn((p) => {
      page = p;
      return p;
    });
    if (page?.errors.length) throw new Error(`erreurs dans la page : ${page.errors.join(' | ')}`);
    console.log(`✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`✗ ${name}\n    ${e.message.split('\n').slice(0, 4).join('\n    ')}`);
    if (page) await page.screenshot({ path: join(CAPTURES, `echec-${name.slice(0, 40).replace(/[^\w]+/g, '-')}.png`), fullPage: true }).catch(() => {});
  } finally {
    await page?.context().close();
  }
}
function assert(cond, message) {
  if (!cond) throw new Error(message);
}
const shot = (page, name) => page.screenshot({ path: join(CAPTURES, `${name}.png`), fullPage: true });

await test('Premier lancement : commune, naissance et prénom, mode ; un enfant enregistré', async (use) => {
  const page = use(await phone());
  await page.goto(APP);
  await page.fill('#commune-q', 'Lyon');
  await page.click('#commune-results button');
  await page.click('text=Continuer');
  await page.selectOption('#birth-month', '05');
  await page.selectOption('#birth-year', '2026');
  await page.fill('#child-name', 'Léo');
  await page.click('text=Continuer');
  assert(!(await page.isVisible('.choice strong:text-is("À pied")')), 'à pied proposé pour un bébé de 5 mois');
  await page.click('text=Porte-bébé');
  await page.click("text=C'est parti");
  await page.waitForSelector('.hero-big');
  const h = await stored(page);
  assert(h.v === 2 && h.children.length === 1 && h.children[0].name === 'Léo' && h.children[0].transport === 'porte_bebe', JSON.stringify(h));
  assert(!(await page.isVisible('.kids')), 'pastilles affichées pour un seul enfant');
  await shot(page, 'l1-premier-lancement');
});

await test('Reprise du profil 0.5 : il devient le premier enfant, garde-robe, chambre et suggestions masquées gardées', async (use) => {
  const v1 = {
    commune: { nom: 'Lyon', code: '69123', dep: '69', cp: '69001', lat: 45.758, lon: 4.8351 }, birth: '2026-05', transport: 'poussette',
    outing_window: { from: '09:00', to: '18:00' }, outing_duration_h: 1, outfit_offset: 1, inventory: { gigoteuse_hiver: ['0-6m'] },
    room: { value: 20.5, at: Date.parse('2026-10-21T07:00:00+02:00') }, created: 5,
  };
  const page = use(await phone({ init: `if (!localStorage.getItem('sb.profil')) { ${seed(v1, { 'sb.masques': ['chanceliere:unique'] })} }` }));
  await page.goto(APP);
  await page.waitForSelector('.hero-big');
  const h = await stored(page);
  const c = h.children?.[0];
  assert(h.v === 2 && c && c.outfit_offset === 1 && c.inventory.gigoteuse_hiver[0] === '0-6m' && c.room.value === 20.5, JSON.stringify(h));
  const hidden = await page.evaluate(() => JSON.parse(localStorage.getItem('sb.masques')));
  assert(hidden[0] === `${c.id}|chanceliere:unique`, JSON.stringify(hidden));
  await page.click('[data-value="nuit"]');
  assert((await page.textContent('.hero-big')).includes('20,5'), 'relevé de la chambre perdu');
});

await test('Deuxième enfant : fiche, pastilles, tenue et mode propres à chacun', async (use) => {
  const page = use(await phone({ init: `if (!localStorage.getItem('sb.profil')) { ${seed(household([LEO]))} }` }));
  await page.goto(`${APP}#reglages`);
  await page.click('text=Ajouter un enfant');
  await page.fill('#child-name', 'Zoé');
  await page.selectOption('#birth-year', '2024');
  await page.selectOption('#birth-month', '03');
  await page.click('.modes >> text=À pied');
  await page.click('text=Ajouter');
  await page.waitForSelector('text=Ajouter un enfant');
  assert((await page.locator('.group-body a.row[href^="#enfant/"]').count()) === 3, 'deux enfants et « Ajouter » attendus');
  await shot(page, 'l1-reglages');
  await page.click('.back');
  await page.waitForSelector('.kids');
  const chips = await page.locator('.kids button').allTextContents();
  assert(chips.join() === 'Léo,Zoé', chips.join());
  assert((await page.getAttribute('.kids button:nth-child(2)', 'aria-selected')) === 'true', 'le nouvel enfant doit être affiché');
  assert((await page.getAttribute('.modes [data-value="a_pied"]', 'aria-checked')) === 'true', 'mode à pied non retenu');
  const zoeItems = await page.locator('.dress-name').allTextContents();
  assert(!zoeItems.some((t) => /Body|Pyjama|Chancelière/.test(t)), `tenue de Zoé : ${zoeItems.join(', ')}`);
  const tips = await page.textContent('.tips');
  assert(tips.includes('imperméable') && !tips.includes('habillage'), `pluie à pied : ${tips}`);
  await shot(page, 'l1-zoe');
  await page.click('.kids >> text=Léo');
  assert(!(await page.isVisible('.modes [data-value="a_pied"]')), 'à pied proposé pour Léo');
  const leoItems = await page.locator('.dress-name').allTextContents();
  assert(leoItems.some((t) => /Body/.test(t)), `tenue de Léo : ${leoItems.join(', ')}`);
  await shot(page, 'l1-leo');
  // Chambre de chacun.
  await page.click('[data-value="nuit"]');
  await page.click('[aria-label="Monter d\'un demi-degré"]');
  await page.click('.kids >> text=Zoé');
  assert(await page.isVisible("text=C'est la température de ce soir"), 'relevé de Léo appliqué à Zoé');
  assert(!(await page.isVisible('text=Sur le dos, à plat')), 'repères du nourrisson affichés pour Zoé');
  await shot(page, 'l1-nuit-zoe');
  const h = await stored(page);
  assert(h.children[0].room?.value === 19.5 && !h.children[1].room, JSON.stringify(h.children.map((c) => c.room)));
});

await test('Fiche d\'un enfant : prénom, naissance et retrait', async (use) => {
  const page = use(await phone({ init: `if (!localStorage.getItem('sb.profil')) { ${seed(household([LEO, ZOE]))} }` }));
  await page.goto(`${APP}#enfant/zoe222`);
  await shot(page, 'l1-fiche-enfant');
  await page.fill('#child-name', 'Zozo');
  await page.press('#child-name', 'Tab');
  await page.selectOption('#birth-year', '2025');
  let h = await stored(page);
  assert(h.children[1].name === 'Zozo' && h.children[1].birth === '2025-03', JSON.stringify(h.children[1]));
  await page.click('text=Retirer Zozo');
  await page.click('text=Toucher à nouveau pour retirer ce profil');
  await page.waitForSelector('text=Ajouter un enfant');
  h = await stored(page);
  assert(h.children.length === 1 && h.children[0].id === 'leo111', JSON.stringify(h.children));
});

await test('Autre parent : lien envoyé, profils reçus après accord, mêmes identifiants', async (use) => {
  const sender = use(await phone({ init: `if (!localStorage.getItem('sb.profil')) { ${seed(household([LEO, ZOE]))} }` }));
  await sender.goto(`${APP}#reglages`);
  await sender.evaluate(() => {
    navigator.share = undefined;
    navigator.clipboard.writeText = async (text) => { window.copied = text; };
  });
  await sender.click('text=Envoyer les profils');
  const text = await sender.evaluate(() => window.copied);
  const link = text?.match(/https?:\S+#partage=SB1\.[\w-]+/)?.[0];
  assert(link && text.includes('Léo et Zoé'), String(text));
  await sender.context().close();

  const receiver = use(await phone());
  await receiver.goto(link);
  await receiver.waitForSelector('text=Profils reçus');
  const rows = await receiver.locator('.group-body .row').allTextContents();
  assert(rows.length === 2 && rows[1].includes('Zoé') && rows[1].includes('2 ans et demi'), rows.join(' / '));
  await shot(receiver, 'l1-profils-recus');
  await receiver.click('text=Utiliser ces profils');
  await receiver.waitForSelector('.kids');
  const h = await stored(receiver);
  assert(h.children.map((c) => c.id).join() === 'leo111,zoe222' && h.commune.nom === 'Lyon', JSON.stringify(h));
});

await test('Premier lancement chez l\'autre parent : recevoir ses profils plutôt que tout ressaisir', async (use) => {
  const cfg = encodeConfig(householdToConfig(household([LEO, ZOE])), toB64);
  const page = use(await phone());
  await page.goto(APP);
  await page.click("text=L'autre parent utilise déjà Superbébé ? Recevoir ses profils");
  await page.fill('#profiles-link', `${APP}#partage=${cfg}`);
  await page.click('text=Continuer');
  await page.click('text=Utiliser ces profils');
  await page.waitForSelector('.kids');
  assert((await stored(page)).children.length === 2, 'profils non appliqués');
});

await test('Recevoir des profils en collant le lien ; un lien abîmé est refusé', async (use) => {
  const cfg = encodeConfig(householdToConfig(household([LEO, ZOE])), toB64);
  const page = use(await phone({ init: `if (!localStorage.getItem('sb.profil')) { ${seed(household([{ ...LEO, id: 'autre1', name: 'Bébé' }]))} }` }));
  await page.goto(`${APP}#recevoir`);
  await page.fill('#profiles-link', 'bonjour');
  await page.click('text=Continuer');
  assert(await page.isVisible('text=Lien non reconnu'), 'lien abîmé accepté');
  await page.fill('#profiles-link', `Voici : ${APP}#partage=${cfg}`);
  await page.click('text=Continuer');
  assert(await page.isVisible('text=Ils remplacent les réglages de ce téléphone (Lyon : Bébé)'), 'avertissement de remplacement absent');
  await page.click('text=Utiliser ces profils');
  await page.waitForSelector('.kids');
  assert((await stored(page)).children.length === 2, 'profils non appliqués');
});

await test('Widget iPhone : l\'app s\'ouvre sur l\'enfant du widget ; une configuration plus ancienne ne remplace rien', async (use) => {
  const local = household([LEO, ZOE]);
  const older = encodeConfig(householdToConfig({ ...household([{ ...LEO, transport: 'voiture' }]), updated: local.updated - 1000 }), toB64);
  const page = use(await phone({ init: `if (!localStorage.getItem('sb.profil')) { ${seed(local)} }` }));
  await page.goto(`${APP}?hote=scriptable&enfant=zoe222#import=${older}`);
  await page.waitForSelector('.kids');
  assert((await page.getAttribute('.kids button:nth-child(2)', 'aria-selected')) === 'true', 'enfant du widget non affiché');
  assert(!page.url().includes('enfant=') && page.url().includes('hote=scriptable'), page.url());
  const h = await stored(page);
  assert(h.children.length === 2 && h.children[0].transport === 'poussette', 'configuration plus ancienne appliquée');
  // Les changements partent vers le widget : configuration v2 et relevés par enfant.
  await page.click('[data-value="nuit"]');
  await page.click('[aria-label="Monter d\'un demi-degré"]');
  const src = await page.getAttribute('#sb-sync', 'src');
  assert(/^superbebe-sync:\?config=SB1\.[\w-]+&rooms=zoe222:19\.5@\d+$/.test(src), src);
  const newer = encodeConfig(householdToConfig({ ...local, outing_duration_h: 2, updated: Date.now() + 60_000 }), toB64);
  await page.goto(`${APP}?hote=scriptable#import=${newer}`);
  await page.waitForSelector('.hero-big');
  assert((await stored(page)).outing_duration_h === 2, 'configuration plus récente ignorée');
});

await test('App Android : configuration v2 pour la 0.6, v1 de l\'enfant affiché pour une app plus ancienne', async (use) => {
  const bridge = (version) => `window.calls = []; window.SuperbebeAndroid = {
    sync: (c, r) => window.calls.push([c, r]), colors() {}, widgets: () => 1, version: () => '${version}',
    widgetChildren: () => '{"leo111":1}', addWidget: () => true, addChildWidget: (id) => { window.calls.push(['pin', id]); return true; }, share: () => true };`;
  const decode = (c) => JSON.parse(Buffer.from(c.slice(4).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('binary'));
  const page = use(await phone({ init: `${bridge('0.6.0')} if (!localStorage.getItem('sb.profil')) { ${seed(household([LEO, ZOE]))} }` }));
  await page.goto(`${APP}#widget`);
  await page.waitForSelector('text=Le widget de Zoé');
  assert(await page.isVisible('text=Un autre widget de Léo'), 'widget déjà posé de Léo non signalé');
  await page.click('text=Le widget de Zoé');
  let calls = await page.evaluate(() => window.calls);
  assert(calls.some(([a, b]) => a === 'pin' && b === 'zoe222'), JSON.stringify(calls));
  assert(decode(calls[0][0]).v === 2 && decode(calls[0][0]).k.length === 2, 'configuration v2 attendue');
  await page.context().close();

  const old = use(await phone({ init: `${bridge('0.5.1')} if (!localStorage.getItem('sb.profil')) { ${seed(household([LEO, ZOE]), { 'sb.enfant': 'zoe222' })} }` }));
  await old.goto(APP);
  await old.waitForSelector('.hero-big');
  calls = await old.evaluate(() => window.calls);
  const cfg = decode(calls[0][0]);
  assert(cfg.v === 1 && cfg.b === '2024-03' && cfg.t === 'a_pied', JSON.stringify(cfg));
});

await test('Assistant du widget iPhone : un widget par enfant, choisi par son prénom', async (use) => {
  const page = use(await phone({ init: `if (!localStorage.getItem('sb.profil')) { ${seed(household([LEO, ZOE]))} }` }));
  await page.goto(`${APP}#widget`);
  await page.waitForSelector('text=Parameter');
  const hint = await page.textContent('.step:last-child .fine');
  assert(hint.includes('Léo ou Zoé'), hint);
  assert((await page.textContent('.w-head')).startsWith('Léo · Lyon'), await page.textContent('.w-head'));
});

await browser.close();
server.kill();
console.log(`\n${failed ? `${failed} parcours en échec` : 'Parcours : tous OK'} (captures : tools/e2e/captures/)`);
process.exit(failed ? 1 : 0);
