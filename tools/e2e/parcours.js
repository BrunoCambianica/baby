// Parcours de l'app dans Chromium (Playwright) : le site est servi en local, la météo et les communes sont simulées
// à partir des réponses enregistrées dans tools/fixtures, l'heure est figée.
// Prérequis : tools/e2e/installer.sh. Usage : npm run e2e   (captures d'écran dans tools/e2e/captures/)
// Sur le site en ligne plutôt qu'en local : SB_SITE=https://brunocambianica.github.io/baby/ npm run e2e
// Un seul parcours : npm run e2e -- « début du nom »
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { encodeConfig, householdToConfig } from '../../engine/adapter.js';
import { readJSON, ROOT } from '../load-rules.js';
import { openDb } from '../../api/db.js';
import { newVapidKeys } from '../../api/push.js';
import { createApi } from '../../api/server.js';
import { familyKeys } from '../../app/js/famille.js';

const PORT = 8000 + Math.floor(Math.random() * 900);
const BASE = process.env.SB_SITE ?? `http://localhost:${PORT}/baby/`;
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
const server = process.env.SB_SITE ? null : spawn(process.execPath, [join(ROOT, 'tools', 'serve.js')], { env: { ...process.env, PORT: String(PORT) }, stdio: 'pipe' });
if (server) await new Promise((resolve) => server.stdout.once('data', resolve));
// Chromium complet sans fenêtre (le « headless shell » refuse les notifications du service worker).
const browser = await chromium.launch({ channel: 'chromium', env });

// L'API (api/server.js) en local, avec une base en mémoire, pour les parcours de la famille et des fiches courtes.
const vapid = { ...newVapidKeys(), contact: BASE };
const apiServer = createApi({ db: openDb(':memory:'), origins: [new URL(BASE).origin], site: BASE, vapid, limits: { lecture: 1000, ecriture: 1000 } });
await new Promise((resolve) => apiServer.server.listen(0, '127.0.0.1', resolve));
const API = `http://127.0.0.1:${apiServer.server.address().port}/`;
const withApi = `localStorage.setItem('sb.api', ${JSON.stringify(API)});`;

// Un téléphone : 390 × 844, heure de Paris figée, météo et communes simulées, erreurs de la page relevées.
// `android` : navigateur Android (notifications Web Push possibles dans un onglet) ; `worker` : service worker actif.
async function phone({ at = '2026-10-21T07:30:00+02:00', init, android = false, worker = false } = {}) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'fr-FR', timezoneId: 'Europe/Paris',
    userAgent: android
      ? 'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36'
      : 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    serviceWorkers: worker ? 'allow' : 'block',
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
  // Liens superbebe-sync: (app ouverte dans Scriptable) : notés dans data-sync au lieu d'être suivis. Chromium
  // ouvrirait sinon une demande d'app externe, invisible, qui avalerait les clics suivants.
  await page.addInitScript(() => {
    const native = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'src');
    Object.defineProperty(HTMLIFrameElement.prototype, 'src', {
      configurable: true,
      get() {
        return this.dataset.sync ?? native.get.call(this);
      },
      set(value) {
        if (String(value).startsWith('superbebe-sync:')) this.dataset.sync = value;
        else native.set.call(this, value);
      },
    });
  });
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
  await page.click('.tabbar [data-value="nuit"]');
  await page.click('[data-action="maison"][data-value="nuit"]');
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
  const bag = await page.textContent('.bag');
  assert(bag.includes('Imperméable') && !bag.includes('abillage'), `pluie à pied : ${bag}`);
  await shot(page, 'l1-zoe');
  await page.click('.kids >> text=Léo');
  assert(!(await page.isVisible('.modes [data-value="a_pied"]')), 'à pied proposé pour Léo');
  const leoItems = await page.locator('.dress-name').allTextContents();
  assert(leoItems.some((t) => /Body/.test(t)), `tenue de Léo : ${leoItems.join(', ')}`);
  await shot(page, 'l1-leo');
  // Chambre de chacun.
  await page.click('.tabbar [data-value="nuit"]');
  await page.click('[data-action="maison"][data-value="nuit"]');
  await page.click('[aria-label="Monter d\'un demi-degré"]');
  await page.click('.kids >> text=Zoé');
  assert(await page.isVisible("text=C'est la température de sa chambre"), 'relevé de Léo appliqué à Zoé');
  assert(!(await page.isVisible('text=Sur le dos, à plat')), 'repères du nourrisson affichés pour Zoé');
  await shot(page, 'l1-nuit-zoe');
  const h = await stored(page);
  assert(h.children[0].room?.value === 19.5 && !h.children[1].room && !h.children[0].room_day, JSON.stringify(h.children.map((c) => [c.room, c.room_day])));
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
  await page.click('.tabbar [data-value="nuit"]');
  await page.click('[data-action="maison"][data-value="nuit"]');
  await page.click('[aria-label="Monter d\'un demi-degré"]');
  const src = await page.getAttribute('#sb-sync', 'data-sync');
  assert(/^superbebe-sync:\?config=SB1\.[\w-]+&rooms=zoe222:19\.5@\d+&rappel=0$/.test(src), src);
  // Le relevé du jour (widget Maison) part aussi.
  await page.click('[data-action="maison"][data-value="jour"]');
  await page.click('[aria-label="Monter d\'un demi-degré"]');
  const both = await page.getAttribute('#sb-sync', 'data-sync');
  assert(/&rooms=zoe222:19\.5@\d+&dayrooms=zoe222:21\.5@\d+&rappel=0$/.test(both), both);
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

await test('App Android 0.13 : widget Maison proposé, relevés notés sur le widget repris par l\'app, relevés du jour transmis', async (use) => {
  // Le widget Maison a noté 23 °C dans la chambre de Léo à 7 h ; l'app ouverte depuis ce widget (onglet Maison) le reprend.
  const noted = Date.parse('2026-10-21T07:00:00+02:00');
  const bridge = `window.calls = []; window.SuperbebeAndroid = {
    sync: (c, r) => window.calls.push(['sync', r]), syncReadings: (json) => window.calls.push(['readings', json]), colors() {}, widgets: () => 1,
    homeWidgets: () => 0, version: () => '0.13.0', widgetChildren: () => '{"leo111":1}', addWidget: () => true, addChildWidget: () => true,
    addHomeWidget: (id) => { window.calls.push(['maison', id]); return true; }, share: () => true, reminderState: () => 'off',
    readings: () => JSON.stringify({ nuit: { leo111: { value: 23, at: ${noted} } }, jour: {} }) };`;
  const page = use(await phone({ at: '2026-10-21T20:30:00+02:00', init: `${bridge} if (!localStorage.getItem('sb.profil')) { ${seed(household([LEO, ZOE]))} }` }));
  await page.goto(`${APP}?enfant=leo111&onglet=maison`);
  await page.waitForSelector('text=Pour la nuit');
  assert((await page.textContent('.hero-big')).startsWith('23,0') && await page.isVisible('text=Un peu chaud pour dormir : au-dessus de 20 °C'), await page.textContent('.hero'));
  assert(!page.url().includes('onglet='), page.url());
  assert((await stored(page)).children[0].room.value === 23, 'relevé du widget non gardé');
  // Un relevé du jour noté dans l'app part vers les widgets.
  await page.click('[data-action="maison"][data-value="jour"]');
  await page.click('[aria-label="Monter d\'un demi-degré"]');
  const calls = await page.evaluate(() => window.calls);
  const last = JSON.parse(calls.filter(([k]) => k === 'readings').at(-1)[1]);
  assert(last.jour.leo111.value === 21.5 && last.nuit.leo111.value === 23, JSON.stringify(last));
  // Sans widget Maison posé, l'onglet Maison propose de le poser directement.
  await page.click('.promo >> text=Ajouter');
  assert((await page.evaluate(() => window.calls)).some(([k, id]) => k === 'maison' && id === 'leo111'), 'widget Maison non demandé depuis l\'onglet');
  await page.goto(`${APP}#reglages`);
  await page.click('text=Le widget Maison de Zoé');
  assert((await page.evaluate(() => window.calls)).some(([k, id]) => k === 'maison' && id === 'zoe222'), 'widget Maison non demandé');
});

await test('App Android ancienne (0.8) : pas de widget Maison, la mise à jour est proposée dans les réglages', async (use) => {
  const bridge = `window.SuperbebeAndroid = { sync() {}, colors() {}, widgets: () => 1, version: () => '0.8.0', widgetChildren: () => '{}',
    addWidget: () => true, addChildWidget: () => true, share: () => true, reminder: () => 'off', reminderState: () => 'off' };`;
  const page = use(await phone({ init: `${bridge} if (!localStorage.getItem('sb.profil')) { ${seed(household([LEO]))} }` }));
  await page.goto(`${APP}#reglages`);
  await page.waitForSelector('text=Widget Maison : mettre à jour l\'app Android');
  const latest = (await (await fetch(`${BASE}dist/android-version.json`)).json());
  const link = page.locator('a.row', { hasText: 'Widget Maison' });
  assert((await link.getAttribute('href')).endsWith(`dist/superbebe-android.apk?v=${latest.versionCode}`), await link.getAttribute('href'));
  assert((await link.textContent()).includes(`0.8.0 → ${latest.versionName}`), await link.textContent());
  assert(await page.isVisible('text=App Android installée') && await page.isVisible('a.row >> text=Mettre à jour l\'app Android'), 'version installée ou mise à jour absentes');
  assert(!(await page.isVisible('text=Le widget Maison')), 'widget Maison proposé à une app qui ne l\'a pas');
  // L'onglet Maison le dit aussi, avec la version installée et le lien de mise à jour.
  await page.goto(APP);
  await page.click('.tabbar [data-value="nuit"]');
  await page.waitForSelector('.promo >> text=Le widget Maison');
  const card = await page.textContent('.promo');
  assert(card.includes(`0.8.0 → ${latest.versionName}`) && card.includes('Mettre à jour l\'app'), card);
  assert((await page.getAttribute('.promo a.link', 'href')).endsWith(`dist/superbebe-android.apk?v=${latest.versionCode}`), await page.getAttribute('.promo a.link', 'href'));
});

await test('Android, version navigateur : le widget Maison renvoie vers l\'app Android, et les réglages disent où l\'on est', async (use) => {
  const page = use(await phone({ android: true, at: '2026-10-21T10:00:00+02:00', init: `if (!localStorage.getItem('sb.profil')) { ${seed(household([LEO]))} }` }));
  await page.goto(APP);
  await page.click('.tabbar [data-value="nuit"]');
  await page.waitForSelector('.promo >> text=Le widget Maison');
  const open = await page.getAttribute('.promo a.link', 'href');
  assert(open.startsWith('intent://config/SB1.') && open.includes('package=fr.superbebe.widget') && open.includes('superbebe-android.apk'), open);
  await page.goto(`${APP}#reglages`);
  await page.waitForSelector('text=Ouvert dans');
  assert((await page.textContent('.row:has-text("Ouvert dans") .value')) === 'navigateur', await page.textContent('.row:has-text("Ouvert dans")'));
  assert(await page.isVisible("text=Ouvrir l'app Android Superbébé") && await page.isVisible('text=Ici, c\'est la version navigateur'), 'lien vers l\'app Android absent');
});

await test('Assistant du widget iPhone : un widget par enfant, choisi par son prénom', async (use) => {
  const page = use(await phone({ init: `if (!localStorage.getItem('sb.profil')) { ${seed(household([LEO, ZOE]))} }` }));
  await page.goto(`${APP}#widget`);
  await page.waitForSelector('text=Parameter');
  const hint = await page.textContent('.step:last-child .fine');
  assert(hint.includes('Léo ou Zoé'), hint);
  assert((await page.textContent('.w-head')).startsWith('Léo · Lyon'), await page.textContent('.w-head'));
});

await test('Journée : tenue du matin, changements, sac, geste de la nuque', async (use) => {
  const page = use(await phone({ at: '2026-10-27T07:30:00+01:00', init: `if (!localStorage.getItem('sb.profil')) { ${seed(household([LEO], { outing_window: { from: '08:00', to: '18:00' } }))} }` }));
  await page.goto(APP);
  await page.waitForSelector('.day');
  assert((await page.textContent('.hero-big')).replace(/\s/g, '') === '5°→19°', await page.textContent('.hero-big'));
  const times = await page.locator('.change .change-time').allTextContents();
  assert(times.length === 2 && times[0].startsWith('Vers 11 h') && times[1].startsWith('Vers 16 h'), times.join(' / '));
  const first = await page.locator('.change').first().textContent();
  assert(/Combi pilote/.test(first) && /Gilet/.test(first), first);
  assert((await page.textContent('.bag')).includes('Gilet'), await page.textContent('.bag'));
  assert(await page.isVisible('text=Touchez sa nuque, pas ses mains'), 'geste de la nuque absent');
  assert(!(await page.isVisible('text=Touchez une heure')), 'ancienne invite « touchez une heure »');
  await shot(page, 'l2-journee-matin');
});

await test('Journée à 14 h : l\'étape en cours est marquée, les précédentes estompées', async (use) => {
  const page = use(await phone({ at: '2026-10-27T14:00:00+01:00', init: `if (!localStorage.getItem('sb.profil')) { ${seed(household([LEO], { outing_window: { from: '08:00', to: '18:00' } }))} }` }));
  await page.goto(APP);
  await page.waitForSelector('.day');
  assert((await page.locator('.change').first().textContent()).includes('maintenant'), 'étape de 11 h non marquée');
  assert(await page.locator('.day-step.past').count() === 1, 'matin non estompé');
  assert((await page.textContent('.hero-label')).includes('Cet après-midi'), await page.textContent('.hero-label'));
  await shot(page, 'l2-journee-14h');
});

await test('Fiche du jour : image et lien envoyés, page lisible sans l\'app, sans nom de famille ni commune', async (use) => {
  const page = use(await phone({ at: '2026-10-27T07:30:00+01:00', init: `if (!localStorage.getItem('sb.profil')) { ${seed(household([LEO], { outing_window: { from: '08:00', to: '18:00' } }))} }` }));
  await page.goto(APP);
  await page.waitForSelector('.day');
  await page.evaluate(() => {
    navigator.canShare = (data) => Boolean(data?.files?.length);
    navigator.share = async (data) => {
      window.shared = { text: data.text, file: data.files?.[0] ? { name: data.files[0].name, size: data.files[0].size, type: data.files[0].type } : null };
      window.sharedImage = data.files?.[0] ? await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(data.files[0]);
      }) : null;
    };
  });
  await page.click('.day .btn[data-action="share-fiche"]');
  await page.waitForFunction(() => window.shared);
  const shared = await page.evaluate(() => window.shared);
  assert(shared.file?.type === 'image/png' && shared.file.size > 20000, JSON.stringify(shared.file));
  assert(shared.text.startsWith('Léo · mardi 27 octobre') && shared.text.includes('Vers 11 h : enlever') && !shared.text.includes('Lyon'), shared.text);
  const image = await page.evaluate(() => window.sharedImage);
  const { writeFileSync } = await import('node:fs');
  writeFileSync(join(CAPTURES, 'l2-fiche-image.png'), Buffer.from(image.split(',')[1], 'base64'));
  const link = shared.text.match(/https?:\S+#f=F1\.[\w-]+/)?.[0];
  assert(link, 'lien de la fiche absent');
  const reader = await page.context().newPage();
  reader.errors = [];
  reader.on('pageerror', (e) => page.errors.push(e.message));
  await reader.goto(link);
  await reader.waitForSelector('.dress');
  const body = await reader.textContent('body');
  assert(body.includes('Léo') && body.includes('Vers 11 h') && body.includes('Dans le sac') && body.includes('Touchez sa nuque'), body.slice(0, 300));
  assert(!body.includes('Lyon'), 'commune dans la fiche');
  await reader.screenshot({ path: join(CAPTURES, 'l2-fiche-page.png'), fullPage: true });
});

await test('Fiche du jour dans l\'app Android 0.7 : l\'image part par le pont, avec le texte et le lien', async (use) => {
  const init = `window.calls = []; window.SuperbebeAndroid = { sync() {}, colors() {}, widgets: () => 1, version: () => '0.7.0',
    widgetChildren: () => '{}', share: () => true, shareImage: (png, text) => { window.calls.push([png.length, text]); return true; } };
    if (!localStorage.getItem('sb.profil')) { ${seed(household([LEO], { outing_window: { from: '08:00', to: '18:00' } }))} }`;
  const page = use(await phone({ at: '2026-10-27T07:30:00+01:00', init }));
  await page.goto(APP);
  await page.click('.day .btn[data-action="share-fiche"]');
  const calls = await page.evaluate(() => window.calls);
  assert(calls.length === 1 && calls[0][0] > 20000 && calls[0][1].includes('#f=F1.'), JSON.stringify(calls.map(([n, t]) => [n, t.slice(0, 40)])));
});

await test('La veille au soir : la journée de demain à préparer, et la nuit qui vient', async (use) => {
  const page = use(await phone({ at: '2026-10-26T20:30:00+01:00', init: `if (!localStorage.getItem('sb.profil')) { ${seed(household([LEO], { outing_window: { from: '08:00', to: '18:00' } }))} }` }));
  await page.goto(APP);
  await page.waitForSelector('.day');
  assert((await page.textContent('.hero .tonight')).includes('Pas de sortie conseillée ce soir'), 'ce soir non dit');
  assert((await page.textContent('.hero-label')).includes('Demain · la tenue à préparer ce soir'), await page.textContent('.hero-label'));
  // Demain : jusqu'à trois créneaux, dans l'ordre de la journée, un seul marqué idéal.
  const windows = await page.locator('.hero .windows .w-time').allTextContents();
  const starts = windows.map((t) => parseInt(t, 10));
  assert(windows.length >= 1 && windows.length <= 3 && starts.every((h, k) => k === 0 || h > starts[k - 1]), windows.join(' | '));
  assert((await page.locator('.hero .windows li.best').count()) === 1, 'créneau idéal non marqué');
  assert((await page.textContent('.hero-big')).replace(/\s/g, '') === '5°→19°', await page.textContent('.hero-big'));
  assert(!(await page.isVisible('.days')), 'choix du jour affiché le soir');
  assert((await page.textContent('#t-jour')).includes('À préparer ce soir'), await page.textContent('#t-jour'));
  assert((await page.textContent('.day .change-time')).startsWith('Demain matin'), await page.textContent('.day .change-time'));
  assert(await page.isVisible('text=Ce soir') && await page.isVisible('text=Gigoteuse 2 TOG'), 'carte de la nuit absente');
  assert((await page.getAttribute('[data-value="sortir"]', 'aria-selected')) === 'true', 'l\'app doit rester sur Sorties');
  await shot(page, 'l3-veille-au-soir');
  await page.goto(`${APP}#widget`);
  await page.waitForSelector('.widget-demo');
  assert((await page.textContent('.widget-demo')).includes('Demain 5° → 19°'), await page.textContent('.widget-demo'));
});

await test('Rappel du soir : expliqué dans le navigateur, demandé à l\'app Android, transmis au widget iPhone', async (use) => {
  const page = use(await phone({ init: `if (!localStorage.getItem('sb.profil')) { ${seed(household([LEO]))} }` }));
  await page.goto(`${APP}#reglages`);
  await page.waitForSelector('text=Rappel du soir');
  assert(await page.isVisible('text=Avec le widget'), 'rappel non expliqué dans le navigateur');
  await page.context().close();

  const bridge = `window.calls = []; window.reminder = 'off'; window.SuperbebeAndroid = { sync() {}, colors() {}, widgets: () => 1, version: () => '0.8.0',
    widgetChildren: () => '{}', reminderState: () => window.reminder,
    reminder: (on, at) => { window.calls.push([on, at]); window.reminder = on ? 'refuse' : 'off'; return on ? 'demande' : 'off'; } };
    if (!localStorage.getItem('sb.profil')) { ${seed(household([LEO]))} }`;
  const android = use(await phone({ init: bridge }));
  await android.goto(`${APP}#reglages`);
  await android.click('[data-action="reminder"][data-value="on"]');
  await android.selectOption('#reminder-at', '21:00');
  const calls = await android.evaluate(() => window.calls);
  assert(JSON.stringify(calls) === '[[true,"20:00"],[true,"21:00"]]', JSON.stringify(calls));
  await android.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await android.waitForSelector('text=Notifications refusées');
  await shot(android, 'l3-rappel-android');
  await android.context().close();

  const iphone = use(await phone({ init: `if (!localStorage.getItem('sb.profil')) { ${seed(household([LEO]))} }` }));
  await iphone.goto(`${APP}?hote=scriptable#reglages`);
  await iphone.click('[data-action="reminder"][data-value="on"]');
  const src = await iphone.getAttribute('#sb-sync', 'data-sync');
  assert(src.endsWith('&rappel=20:00'), src);
  await iphone.click('[data-action="reminder"][data-value="off"]');
  assert((await iphone.getAttribute('#sb-sync', 'data-sync')).endsWith('&rappel=0'), 'rappel non coupé');
});

await test('Maison : le jour et la nuit, chacun avec son relevé ; la nuit par défaut le soir', async (use) => {
  const page = use(await phone({ at: '2026-10-21T10:00:00+02:00', init: `if (!localStorage.getItem('sb.profil')) { ${seed(household([LEO]))} }` }));
  await page.goto(APP);
  assert((await page.textContent('.tabbar')).includes('Sorties') && (await page.textContent('.tabbar')).includes('Maison'), 'onglets Sorties et Maison absents');
  await page.click('.tabbar [data-value="nuit"]');
  await page.waitForSelector('text=Pour la journée');
  assert((await page.getAttribute('[data-action="maison"][data-value="jour"]', 'aria-selected')) === 'true', 'le jour doit être choisi à 10 h');
  assert((await page.textContent('.hero-big')).startsWith('21,0'), await page.textContent('.hero-big'));
  await page.click("text=C'est la température chez vous");
  let names = await page.locator('.card:first-of-type .dress-name').allTextContents();
  assert(names.join() === 'Body ML,Pantalon,Chaussettes', names.join());
  assert(await page.isVisible('text=Habillez-le comme vous') && await page.isVisible('text=Santé Manitoba (Canada)'), 'repères absents');
  for (let k = 0; k < 14; k++) await page.click('[aria-label="Monter d\'un demi-degré"]');
  names = await page.locator('.card:first-of-type .dress-name').allTextContents();
  assert(names.join() === 'Body léger' && await page.isVisible('text=Protéger de la chaleur, hydrater régulièrement'), names.join());
  await shot(page, 'l5-maison-jour');
  // La nuit garde son propre relevé : rien de noté pour la chambre.
  await page.click('[data-action="maison"][data-value="nuit"]');
  await page.waitForSelector('text=Pour la nuit');
  assert((await page.textContent('.hero-big')).startsWith('19,0') && await page.isVisible("text=C'est la température de sa chambre"), await page.textContent('.hero-big'));
  assert(await page.isVisible('text=Gigoteuse 2 TOG') && !(await page.isVisible('text=Pour la journée')), 'tenue de nuit');
  const h = await stored(page);
  assert(h.children[0].room_day?.value === 28 && !h.children[0].room, JSON.stringify(h.children[0]));
  await page.context().close();
  const evening = use(await phone({ at: '2026-10-21T20:30:00+02:00', init: `if (!localStorage.getItem('sb.profil')) { ${seed(household([LEO]))} }` }));
  await evening.goto(APP);
  // « Détails », dans la carte « Ce soir » de l'onglet Sorties, ouvre Maison côté nuit.
  await evening.click('.card >> text=Détails');
  await evening.waitForSelector('text=Pour la nuit');
  assert(!(await evening.isVisible('text=Pour la journée')) && (await evening.textContent('.hero-label')).includes('La nuit, dans sa chambre'), 'la nuit attendue le soir');
  await shot(evening, 'l5-maison-soir');
  await evening.click('[data-action="maison"][data-value="jour"]');
  await evening.waitForSelector('text=Pour la journée');
});

await test('Tenues au choix : sans pyjama par défaut la journée (maison et sorties), pyjama la nuit, listes déroulantes', async (use) => {
  const page = use(await phone({ at: '2026-10-21T10:00:00+02:00', init: `if (!localStorage.getItem('sb.profil')) { ${seed(household([LEO, ZOE]))} }` }));
  await page.goto(APP);
  await page.click('.tabbar [data-value="nuit"]');
  let names = await page.locator('.card:first-of-type .dress-name').allTextContents();
  assert(names.join() === 'Body ML,Pantalon,Chaussettes', `par défaut : ${names.join()}`);
  const day = await page.locator('select[data-action="day-style"] option').allTextContents();
  assert(day.join(' | ') === 'Avec pyjama : body ML, pyjama | Sans pyjama : body ML, pantalon, chaussettes (par défaut)', day.join(' | '));
  await shot(page, 'l6-maison-sans-pyjama');
  await page.selectOption('select[data-action="day-style"]', 'pyjama');
  names = await page.locator('.card:first-of-type .dress-name').allTextContents();
  assert(names.join() === 'Body ML,Pyjama', `avec pyjama : ${names.join()}`);
  assert((await stored(page)).children[0].day_style === 'pyjama', 'avec pyjama non enregistré');
  await page.selectOption('select[data-action="day-style"]', 'sans_pyjama');
  await page.click('.tabbar [data-value="sortir"]');
  const morning = await page.locator('.day-step .dress-name').allTextContents();
  assert(!morning.some((t) => /Pyjama/.test(t)) && morning.some((t) => /Pantalon/.test(t)), `sorties : ${morning.join(', ')}`);
  // Créneaux de sortie : jusqu'à trois, dans l'ordre de la journée, le meilleur marqué.
  assert((await page.locator('.hero .windows li.best').count()) === 1, 'créneau idéal non marqué');
  await shot(page, 'l6-creneaux');
  // La nuit : 19 °C par défaut (18-20 °C), pyjama sous une 2 TOG ; l'autre gigoteuse dans la liste.
  await page.click('.tabbar [data-value="nuit"]');
  await page.click('[data-action="maison"][data-value="nuit"]');
  let tiles = await page.locator('.card:first-of-type .dress-name').allTextContents();
  assert(tiles.join() === 'Body ML,Pyjama,Gigoteuse 2 TOG', `nuit par défaut : ${tiles.join()}`);
  const night = await page.locator('select[data-action="night-option"] option').allTextContents();
  assert(night.join(' | ') === '2 TOG : body ML + pyjama (par défaut) | 2,5 TOG : body ML' && await page.isVisible('text=Gigoteuse plus légère : une couche de plus dessous'), night.join(' | '));
  await page.selectOption('select[data-action="night-option"]', 'tog-2-5');
  tiles = await page.locator('.card:first-of-type .dress-name').allTextContents();
  assert(tiles.join() === 'Body ML,Gigoteuse 2,5 TOG', tiles.join());
  await shot(page, 'l6-nuit-choix');
  const h = await stored(page);
  assert(h.children[0].day_style === 'sans_pyjama' && h.children[0].night_options.n20 === 'tog-2-5' && !h.children[1].day_style, JSON.stringify(h.children));
  // Fiche de l'enfant : le réglage « La journée » n'existe qu'avant 2 ans.
  await page.goto(`${APP}#enfant/leo111`);
  assert((await page.getAttribute('[data-action="day-style"][data-value="sans_pyjama"]', 'aria-checked')) === 'true', 'réglage absent de la fiche');
  await page.click('[data-action="day-style"][data-value="pyjama"]');
  assert((await stored(page)).children[0].day_style === 'pyjama', 'retour au pyjama non enregistré');
  await page.goto(`${APP}#enfant/zoe222`);
  await page.waitForSelector('text=Tendance');
  assert(!(await page.isVisible('text=Sans pyjama')), 'choix du pyjama proposé à 2 ans et demi');
});

// Parcours avec l'API locale (pas sur le site en ligne : l'API du VPS n'y est pas encore branchée).
const local = !process.env.SB_SITE;

if (local) await test('API · famille : un parent partage, l\'autre rejoint, les changements passent dans les deux sens', async (use) => {
  const a = use(await phone({ init: `${withApi} if (!localStorage.getItem('sb.profil')) { ${seed(household([LEO, ZOE]))} }` }));
  await a.goto(`${APP}#reglages`);
  await a.evaluate(() => {
    navigator.share = undefined;
    navigator.clipboard.writeText = async (text) => { window.copied = text; };
  });
  await a.click('text=Partager les profils avec l\'autre parent');
  await a.waitForFunction(() => window.copied);
  const link = (await a.evaluate(() => window.copied)).match(/https?:\S+#famille=[\w-]{43}/)?.[0];
  assert(link, 'lien de famille absent');
  const secret = link.split('#famille=')[1];
  const keys = await familyKeys(secret);
  const onServer = apiServer.db.famille(keys.id);
  assert(onServer, 'famille absente du serveur');
  assert(!Buffer.from(onServer.bloc, 'base64url').includes(Buffer.from('Zoé')) && !onServer.bloc.includes('Zo\\u00e9'), 'prénom lisible sur le serveur');
  await shot(a, 'l4-famille-partagee');

  const b = await phone({ init: withApi });
  b.errors = a.errors;
  await b.goto(link);
  await b.waitForSelector('text=Rejoindre la famille');
  const rows = await b.locator('.group-body .row').allTextContents();
  assert(rows.length === 2 && rows[1].includes('Zoé'), rows.join(' / '));
  await shot(b, 'l4-rejoindre');
  await b.click('[data-action="family-join"]');
  await b.waitForSelector('.kids');
  assert((await stored(b)).children.map((c) => c.id).join() === 'leo111,zoe222', 'enfants différents');
  // Zoé passe en poussette sur le téléphone B…
  await b.goto(`${APP}#enfant/zoe222`);
  await b.click('.modes [data-value="poussette"]');
  await b.waitForFunction(() => JSON.parse(localStorage.getItem('sb.famille'))?.version === 2 && !JSON.parse(localStorage.getItem('sb.famille')).dirty, null, { timeout: 8000 });
  // … et le téléphone A le voit à la réouverture.
  await a.reload();
  await a.waitForFunction(() => JSON.parse(localStorage.getItem('sb.profil')).children[1].transport === 'poussette', null, { timeout: 8000 });
  await b.context().close();
});

if (local) await test('API · fiche du jour à lien court, ouverte par la nounou', async (use) => {
  const page = use(await phone({ at: '2026-10-27T07:30:00+01:00', init: `${withApi} if (!localStorage.getItem('sb.profil')) { ${seed(household([LEO], { outing_window: { from: '08:00', to: '18:00' } }))} }` }));
  await page.goto(APP);
  await page.waitForSelector('.day');
  await page.evaluate(() => {
    navigator.canShare = () => true;
    navigator.share = async (data) => { window.shared = data.text; };
  });
  await page.click('.day .btn[data-action="share-fiche"]');
  await page.waitForFunction(() => window.shared);
  const text = await page.evaluate(() => window.shared);
  const link = text.match(/http:\S+\/r\/[\w-]+#k=[\w-]+/)?.[0];
  assert(link && link.startsWith(API) && link.length < 90, text.split('\n').at(-1));
  const reader = await page.context().newPage();
  await reader.goto(link);
  await reader.waitForSelector('.dress');
  const body = await reader.textContent('body');
  assert(body.includes('Léo') && body.includes('Vers 11 h') && reader.url().includes('/fiche/?r='), `${reader.url()} ${body.slice(0, 120)}`);
});

if (local) await test('API · rappel du soir par notification Web Push : abonnement, puis rappel calculé par le service worker', async (use) => {
  const fake = `PushManager.prototype.getSubscription = async () => window.fakeSub ?? null;
    PushManager.prototype.subscribe = async () => (window.fakeSub = { endpoint: 'https://fcm.googleapis.com/fcm/send/essai', unsubscribe: async () => true });`;
  const page = use(await phone({ android: true, worker: true, at: '2026-10-26T20:00:00+01:00', init: `${withApi} ${fake} if (!localStorage.getItem('sb.profil')) { ${seed(household([LEO, ZOE], { outing_window: { from: '08:00', to: '18:00' } }))} }` }));
  await page.context().grantPermissions(['notifications'], { origin: new URL(BASE).origin });
  await page.goto(`${APP}#reglages`);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.click('[data-action="reminder"][data-value="on"]');
  await page.waitForFunction(() => document.querySelector('#reminder-at'));
  for (let k = 0; k < 20 && apiServer.db.compte().abonnements === 0; k++) await new Promise((r) => { setTimeout(r, 200); });
  assert(apiServer.db.compte().abonnements === 1, 'abonnement non enregistré');
  // Le serveur envoie une notification vide : le service worker calcule le rappel avec le foyer laissé par l'app.
  for (let k = 0; k < 50 && !(await page.evaluate(async () => Boolean(await (await caches.open('superbebe-donnees')).match('donnees.json')))); k++) {
    await new Promise((r) => { setTimeout(r, 200); });
  }
  const cdp = await page.context().newCDPSession(page);
  const registration = new Promise((resolve) => cdp.on('ServiceWorker.workerRegistrationUpdated', ({ registrations }) => {
    if (registrations[0]) resolve(registrations[0].registrationId);
  }));
  await cdp.send('ServiceWorker.enable');
  await cdp.send('ServiceWorker.deliverPushMessage', { origin: new URL(BASE).origin, registrationId: await registration, data: '' });
  let shown = [];
  for (let k = 0; k < 50 && !shown.length; k++) {
    await new Promise((r) => { setTimeout(r, 200); });
    shown = await page.evaluate(async () => (await (await navigator.serviceWorker.ready).getNotifications()).map((n) => ({ title: n.title, body: n.body })));
  }
  assert(shown[0].title === 'Demain, à préparer ce soir' && shown[0].body.startsWith('Léo : ') && shown[0].body.includes('\nZoé : ') && shown[0].body.includes('nuit'), JSON.stringify(shown));
  await page.click('[data-action="reminder"][data-value="off"]');
  for (let k = 0; k < 20 && apiServer.db.compte().abonnements === 1; k++) await new Promise((r) => { setTimeout(r, 200); });
  assert(apiServer.db.compte().abonnements === 0, 'désabonnement non transmis');
});

await new Promise((resolve) => apiServer.server.close(resolve));
await browser.close();
server?.kill();
console.log(`\n${failed ? `${failed} parcours en échec` : 'Parcours : tous OK'} (captures : tools/e2e/captures/)`);
process.exit(failed ? 1 : 0);
