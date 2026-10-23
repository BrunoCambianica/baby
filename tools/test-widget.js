// Tests du widget iPhone : exécute widget/superbebe.js avec une imitation des API de Scriptable.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { encodeConfig } from '../engine/adapter.js';
import { readJSON, ROOT } from './load-rules.js';

const code = readFileSync(join(ROOT, 'widget', 'superbebe.js'), 'utf8');
const forecast = readJSON(join(ROOT, 'tools', 'fixtures', 'forecast-lyon-2026-10-21.json'));
const toB64 = (s) => Buffer.from(s, 'binary').toString('base64');
const CONFIG = encodeConfig(
  { v: 1, n: 'Lyon', la: 45.758, lo: 4.8351, b: '2026-05', t: 'poussette', f: '09:00', u: '18:00', d: 1, o: 0 },
  toB64,
);
const TEXTE = encodeConfig(
  { v: 1, n: 'Lyon', la: 45.758, lo: 4.8351, b: '2026-05', t: 'poussette', f: '09:00', u: '18:00', d: 1, o: 0, i: 0 },
  toB64,
);
const PARIS = encodeConfig({ v: 1, n: 'Paris', la: 48.8566, lo: 2.3522, b: '2026-05', t: 'porte_bebe' }, toB64);
// Deux enfants : Léo (bébé, poussette) et Zoé (2 ans et demi, à pied).
const FAMILLE = encodeConfig({
  v: 2, n: 'Lyon', c: '69123', la: 45.758, lo: 4.8351, f: '09:00', u: '18:00', d: 1, i: 1,
  k: [{ id: 'leo1', p: 'Léo', b: '2026-05', t: 'poussette', o: 0 }, { id: 'zoe2', p: 'Zoé', b: '2024-03', t: 'a_pied', o: 0 }],
}, toB64);
const APP = 'https://brunocambianica.github.io/baby/app/';

// Heure figée : 21 octobre 2026 à 7 h 30 (Paris), sauf mention contraire.
function fixedDate(iso) {
  const fixed = Date.parse(iso);
  return class extends Date {
    constructor(...a) {
      if (a.length) super(...a);
      else super(fixed);
    }
    static now() {
      return fixed;
    }
  };
}

// `navigations` : liens suivis par l'app pendant qu'elle est ouverte dans la vue web de Scriptable.
async function run({
  family = 'medium', inWidget = true, param = CONFIG, query = {}, loaderConfig, navigations = [], webView = true,
  offline = false, files = new Map(), at = '2026-10-21T07:30:00+02:00', extra = {},
} = {}) {
  const out = { widget: null, presented: null, completed: false, opened: [], view: null, alerts: [] };
  class ListWidget {
    constructor() {
      this.texts = [];
      this.rows = [];
    }
    addText(text) {
      const t = { text };
      this.texts.push(t);
      return t;
    }
    // Rangée de dessins : images et textes gardés pour les vérifications.
    addStack() {
      const row = {
        images: [],
        texts: [],
        layoutHorizontally() {},
        centerAlignContent() {},
        addImage(image) {
          const item = { image };
          this.images.push(item);
          return item;
        },
        addText(text) {
          const t = { text };
          this.texts.push(t);
          return t;
        },
      };
      this.rows.push(row);
      return row;
    }
    addSpacer() {}
    setPadding() {}
    async presentMedium() {
      out.presented = this;
    }
  }
  class Color {
    constructor(hex, alpha = 1) {
      this.hex = hex;
      this.alpha = alpha;
    }
    static dynamic(light, dark) {
      return { light, dark };
    }
    static white() {
      return new Color('#ffffff');
    }
  }
  class LinearGradient {}
  class Point {
    constructor(x, y) {
      this.x = x;
      this.y = y;
    }
  }
  const Font = { systemFont: (size) => ({ size }), boldSystemFont: (size) => ({ size, bold: true }) };
  class Request {
    constructor(url) {
      this.url = url;
    }
    async loadJSON() {
      if (offline) throw new Error('hors ligne');
      if (!this.url.startsWith('https://api.open-meteo.com/v1/forecast')) throw new Error(`URL inattendue ${this.url}`);
      return JSON.parse(JSON.stringify(forecast));
    }
  }
  const fm = {
    documentsDirectory: () => '/doc',
    joinPath: (a, b) => `${a}/${b}`,
    fileExists: (p) => p === '/doc/superbebe' || files.has(p),
    createDirectory() {},
    readString: (p) => files.get(p),
    writeString: (p, s) => files.set(p, s),
  };
  class Alert {
    addAction() {}
    async presentAlert() {
      out.alerts.push({ title: this.title, message: this.message });
      return 0;
    }
  }
  class WebView {
    constructor() {
      out.view = this;
      this.answers = [];
    }
    async loadURL(url) {
      this.url = url;
      this.answers.push([url, this.shouldAllowRequest({ url })]);
    }
    async present(fullScreen) {
      this.fullScreen = fullScreen;
      for (const url of navigations) this.answers.push([url, this.shouldAllowRequest({ url })]);
    }
  }
  const accessory = family.startsWith('accessory');
  const globals = {
    ListWidget, Color, Font, Request, LinearGradient, Point, Alert, ...drawingMocks(),
    FileManager: { local: () => fm },
    Data: { fromBase64String: (b64) => ({ toRawString: () => Buffer.from(b64, 'base64').toString('binary') }) },
    Script: { setWidget: (w) => { out.widget = w; }, complete: () => { out.completed = true; }, name: () => 'Superbébé' },
    Safari: { open: (url) => { out.opened.push(url); } },
    config: { widgetFamily: family, runsInWidget: inWidget && !accessory, runsInAccessoryWidget: inWidget && accessory },
    args: { widgetParameter: param, queryParameters: query },
    Date: fixedDate(at),
    console,
  };
  if (webView) globals.WebView = WebView;
  Object.assign(globals, extra);
  if (loaderConfig !== undefined) globals.SB_CONFIG_FROM_LOADER = loaderConfig;
  const context = vm.createContext(globals);
  const runSuperbebe = vm.runInContext(`(function () {\n${code}\nreturn runSuperbebe;\n})()`, context);
  await runSuperbebe();
  out.files = files;
  out.texts = (out.widget ?? out.presented)?.texts.map((t) => t.text) ?? [];
  return out;
}

// Imitation de DrawContext et Path : chaque tracé est relevé, avec ses points, pour vérifier les dessins.
function drawingMocks() {
  class Size {
    constructor(width, height) {
      this.width = width;
      this.height = height;
    }
  }
  class Rect {
    constructor(x, y, width, height) {
      Object.assign(this, { x, y, width, height });
    }
  }
  class Path {
    constructor() {
      this.points = [];
      this.commands = 0;
    }
    move(p) {
      this.commands++;
      this.points.push(p);
    }
    addLine(p) {
      this.commands++;
      this.points.push(p);
    }
    addQuadCurve(p, c) {
      this.commands++;
      this.points.push(p, c);
    }
    addCurve(p, c1, c2) {
      this.commands++;
      this.points.push(p, c1, c2);
    }
    addEllipse(r) {
      this.commands++;
      this.points.push({ x: r.x, y: r.y }, { x: r.x + r.width, y: r.y + r.height });
    }
    closeSubpath() {
      this.commands++;
    }
  }
  class DrawContext {
    constructor() {
      this.strokes = 0;
      this.fills = 0;
      this.paths = [];
    }
    setStrokeColor(c) {
      this.stroke = c;
    }
    setFillColor(c) {
      this.fill = c;
    }
    setLineWidth(w) {
      this.lineWidth = w;
    }
    addPath(path) {
      this.paths.push(path);
    }
    strokePath() {
      this.strokes++;
    }
    fillPath() {
      this.fills++;
    }
    getImage() {
      return { size: this.size, strokes: this.strokes, fills: this.fills, paths: this.paths, lineWidth: this.lineWidth };
    }
  }
  return { Size, Rect, Path, DrawContext };
}

let failed = 0;
async function test(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`✗ ${name}\n    ${e.stack.split('\n').slice(0, 3).join('\n    ')}`);
  }
}
function assert(cond, message) {
  if (!cond) throw new Error(message);
}

await test('Widget moyen : en-tête, ressenti de la journée, tenue du matin en dessins, geste de la nuque en pied', async () => {
  const out = await run();
  assert(out.completed, 'Script.complete() non appelé');
  assert(out.texts[0] === 'SUPERBÉBÉ · LYON', out.texts[0]);
  assert(/^Ce matin -?\d+°( → -?\d+°)?$/.test(out.texts[1]), out.texts[1]);
  const row = out.widget.rows[0];
  assert(row && row.images.length >= 3 && row.images.every((i) => i.imageSize?.width === 24), `rangée de dessins : ${JSON.stringify(row?.images.length)}`);
  assert(out.texts.at(-1) === 'Touchez sa nuque, pas ses mains · 7 h 30', out.texts.at(-1));
  const small = await run({ family: 'small' });
  assert(small.texts.at(-1) === 'Touchez sa nuque · 7 h 30', small.texts.at(-1));
});

await test('Réglage « Texte » : la tenue reste écrite', async () => {
  const out = await run({ param: TEXTE });
  assert(/^Body /.test(out.texts[2]) && out.widget.rows.length === 0, JSON.stringify(out.texts));
});

await test('Petit widget : deux lignes, quatre dessins au plus', async () => {
  const out = await run({ family: 'small' });
  const row = out.widget.rows[0];
  assert(out.texts.length === 3 && row.images.length <= 4 && row.images[0].imageSize.width === 20, JSON.stringify(out.texts));
});

await test('Chaque dessin se trace dans sa case, avec contour et points pleins', async () => {
  const context = vm.createContext({ ...drawingMocks(), Point: class { constructor(x, y) { this.x = x; this.y = y; } }, Color: { white: () => '#fff' } });
  const { sbDrawing, DRAWINGS } = vm.runInContext(`(function () {\n${code}\nreturn { sbDrawing, DRAWINGS };\n})()`, context);
  for (const id of Object.keys(DRAWINGS)) {
    const image = sbDrawing(id, 48);
    assert(image.strokes > 0 && Math.abs(image.lineWidth - 3.2) < 1e-9, `${id} : rien de tracé`);
    for (const path of image.paths) {
      for (const p of path.points) assert(p.x >= 0 && p.x <= 48 && p.y >= 0 && p.y <= 48, `${id} : point hors cadre ${p.x},${p.y}`);
    }
  }
  const bonnet = sbDrawing('bonnet', 48);
  assert(bonnet.fills === 0, 'le pompon du bonnet ne doit pas être plein');
  const body = sbDrawing('body_mc', 48);
  assert(body.fills === 2 && body.paths[0].commands > 10, `pressions du body : ${body.fills}`);
});

await test('Écran verrouillé rectangulaire : trois lignes, sans en-tête', async () => {
  const out = await run({ family: 'accessoryRectangular' });
  assert(out.texts.length === 3 && !out.texts[0].startsWith('SUPERBÉBÉ'), JSON.stringify(out.texts));
});

await test('Écran verrouillé en ligne et rond', async () => {
  const inline = await run({ family: 'accessoryInline' });
  assert(inline.texts.length === 1, JSON.stringify(inline.texts));
  const circular = await run({ family: 'accessoryCircular' });
  assert(circular.texts.length === 1 && /( h|°)$/.test(circular.texts[0]), JSON.stringify(circular.texts));
});

await test('Le soir : demain à préparer (tenue en dessins, sac), et la nuit selon le relevé de la chambre', async () => {
  const files = new Map([['/doc/superbebe/etat.json', JSON.stringify({ room: { value: 21.5, at: Date.parse('2026-10-21T19:00:00+02:00') } })]]);
  const out = await run({ files, at: '2026-10-21T20:30:00+02:00' });
  assert(/^Demain -?\d+°/.test(out.texts[1]), out.texts[1]);
  assert(out.widget.rows[0].images.length >= 3, `tenue de demain : ${out.widget.rows[0].images.length} dessins`);
  // Chambre à 21,5 °C : un pyjama léger sous une gigoteuse de 1 TOG.
  assert(/nuit 21,5° : pyjama léger \+ 1 TOG/i.test(out.texts[2]), out.texts[2]);
  const texte = await run({ files, param: TEXTE, at: '2026-10-21T20:30:00+02:00' });
  assert(/^Body /.test(texte.texts[2]) && texte.texts[3].includes('1 TOG'), JSON.stringify(texte.texts));
});

await test('Sans réglages : message d\'aide', async () => {
  const out = await run({ param: '' });
  assert(out.texts.some((t) => t.includes('Réglages manquants')), JSON.stringify(out.texts));
});

await test('Réglages copiés avec le script : plus besoin du champ Parameter', async () => {
  const out = await run({ param: '', loaderConfig: CONFIG });
  assert(out.texts[0] === 'SUPERBÉBÉ · LYON', JSON.stringify(out.texts));
});

await test('Le dernier changement de réglages l\'emporte sur ceux du script', async () => {
  const files = new Map();
  await run({ files, param: '', loaderConfig: CONFIG });
  await run({ files, param: '', loaderConfig: CONFIG, inWidget: false, query: { config: PARIS } });
  const kept = await run({ files, param: '', loaderConfig: CONFIG });
  assert(kept.texts[0] === 'SUPERBÉBÉ · PARIS', `réglages de l'app perdus : ${kept.texts[0]}`);
  const recopied = await run({ files, param: '', loaderConfig: encodeConfig({ v: 1, n: 'Nantes', la: 47.2184, lo: -1.5536, b: '2026-05' }, toB64) });
  assert(recopied.texts[0] === 'SUPERBÉBÉ · NANTES', `script recopié ignoré : ${recopied.texts[0]}`);
});

await test('Toucher le widget relance le script pour ouvrir l\'app', async () => {
  const out = await run();
  assert(out.widget.url === 'scriptable:///run/Superb%C3%A9b%C3%A9?ouvrir=app', String(out.widget.url));
});

await test('Hors ligne avec météo en cache : widget affiché, mention hors ligne', async () => {
  const files = new Map();
  await run({ files });
  const out = await run({ files, offline: true, at: '2026-10-21T09:00:00+02:00' });
  assert(out.texts.at(-1).startsWith('Hors ligne · Touchez sa nuque') && out.texts.at(-1).endsWith('7 h 30'), out.texts.at(-1));
});

await test('Hors ligne sans cache : message clair', async () => {
  const out = await run({ offline: true });
  assert(out.texts.some((t) => t.includes('Météo indisponible')), JSON.stringify(out.texts));
});

await test('Ouverture depuis le widget : app en plein écran avec les réglages, liens extérieurs dans Safari', async () => {
  const files = new Map();
  const room = Date.parse('2026-10-21T20:00:00+02:00');
  const out = await run({
    files, inWidget: false, query: { ouvrir: 'app' }, at: '2026-10-21T20:30:00+02:00',
    navigations: [
      `superbebe-sync:?config=${PARIS}&room=21.5@${room}`,
      'https://www.santepubliquefrance.fr/',
      `${APP}#reglages`,
    ],
  });
  assert(out.view?.url === `${APP}?hote=scriptable#import=${CONFIG}`, String(out.view?.url));
  assert(out.view.fullScreen === false && out.completed && !out.presented, 'présentation inattendue');
  const answers = Object.fromEntries(out.view.answers.map(([url, ok]) => [url.slice(0, 20), ok]));
  assert(answers[`${APP}?hote=scr`.slice(0, 20)] === true, JSON.stringify(out.view.answers));
  assert(answers['superbebe-sync:?conf'] === false && answers['https://www.santepub'] === false, JSON.stringify(out.view.answers));
  assert(out.opened[0] === 'https://www.santepubliquefrance.fr/', JSON.stringify(out.opened));
  const state = JSON.parse(files.get('/doc/superbebe/etat.json'));
  assert(state.config === PARIS && state.rooms?.['']?.value === 21.5, JSON.stringify(state));
  const after = await run({ files, at: '2026-10-21T20:40:00+02:00' });
  assert(after.texts[0] === 'SUPERBÉBÉ · PARIS' && after.texts[2].includes('21,5'), JSON.stringify(after.texts));
});

await test('Sans vue web : l\'app s\'ouvre dans Safari avec les réglages', async () => {
  const out = await run({ inWidget: false, query: { ouvrir: 'app' }, webView: false });
  assert(out.opened[0] === `${APP}?hote=scriptable#import=${CONFIG}`, JSON.stringify(out.opened));
});

await test('Lancé à la main dans Scriptable : la dernière étape une fois, puis l\'aperçu', async () => {
  const files = new Map();
  const out = await run({ inWidget: false, files });
  assert(out.presented && out.texts[0] === 'SUPERBÉBÉ · LYON', JSON.stringify(out.texts));
  assert(out.alerts.length === 1 && out.alerts[0].message.includes('Modifier le widget, Script : « Superbébé »'), JSON.stringify(out.alerts));
  assert(!out.alerts[0].message.includes('renommez'), 'conseil de renommage inutile');
  const again = await run({ inWidget: false, files });
  assert(again.alerts.length === 0, 'accueil répété');
});

await test('Fond en dégradé selon le moment : nuit le soir', async () => {
  const out = await run({ at: '2026-10-21T20:30:00+02:00' });
  const colors = out.widget.backgroundGradient?.colors?.map((c) => c.hex);
  assert(colors?.[0] === '#121a33', JSON.stringify(colors));
});

await test('La configuration est mémorisée pour les lancements depuis l\'app', async () => {
  const files = new Map();
  await run({ files });
  const out = await run({ files, param: '', inWidget: false });
  assert(out.texts[0] === 'SUPERBÉBÉ · LYON', JSON.stringify(out.texts));
});

await test('Chargeur : télécharge le code, transmet l\'adresse du site et les réglages', async () => {
  const base = 'https://exemple.test/superbebe/';
  const loader = readFileSync(join(ROOT, 'widget', 'chargeur.js'), 'utf8')
    .replaceAll('__SB_BASE_URL__', base)
    .replace('__SB_CONFIG__', CONFIG);
  const files = new Map();
  let requested = null;
  let loaded = null;
  class Request {
    constructor(url) {
      this.url = url;
    }
    async loadString() {
      requested = this.url;
      return code;
    }
    async loadJSON() {
      return JSON.parse(JSON.stringify(forecast));
    }
  }
  class WebView {
    async loadURL(url) {
      loaded = url;
    }
    async present() {}
  }
  const fm = {
    documentsDirectory: () => '/doc',
    joinPath: (a, b) => `${a}/${b}`,
    fileExists: (p) => p === '/doc/superbebe' || files.has(p),
    createDirectory() {},
    readString: (p) => files.get(p),
    writeString: (p, s) => files.set(p, s),
    modificationDate: () => new Date(0),
  };
  const context = vm.createContext({
    Request, WebView, ...drawingMocks(),
    FileManager: { local: () => fm },
    Data: { fromBase64String: (b64) => ({ toRawString: () => Buffer.from(b64, 'base64').toString('binary') }) },
    Script: { setWidget() {}, complete() {}, name: () => 'Superbébé' },
    Safari: { open() {} },
    config: { widgetFamily: 'medium', runsInWidget: false, runsInAccessoryWidget: false },
    args: { widgetParameter: '', queryParameters: { ouvrir: 'app' } },
    Date: fixedDate('2026-10-21T07:30:00+02:00'),
  });
  await vm.runInContext(`(async () => {\n${loader}\n})()`, context);
  assert(requested === `${base}widget/superbebe.js`, `code demandé à ${requested}`);
  assert(loaded === `${base}app/?hote=scriptable#import=${CONFIG}`, `app ouverte sur ${loaded}`);
  assert(files.has('/doc/superbebe-widget.js'), 'code non gardé pour le hors-ligne');
});

await test('Ancien chargeur (sans réglages) : le champ Parameter suffit toujours', async () => {
  const out = await run({ param: CONFIG });
  assert(out.texts[0] === 'SUPERBÉBÉ · LYON', JSON.stringify(out.texts));
});

await test('Plusieurs enfants : le champ Parameter choisit l\'enfant du widget, par prénom ou numéro', async () => {
  const files = new Map();
  const first = await run({ files, param: '', loaderConfig: FAMILLE });
  assert(first.texts[0] === 'LÉO · LYON' && first.widget.url.endsWith('?ouvrir=app&enfant=leo1'), `${first.texts[0]} ${first.widget.url}`);
  const zoe = await run({ files, param: 'zoé', loaderConfig: FAMILLE });
  assert(zoe.texts[0] === 'ZOÉ · LYON' && zoe.widget.url.endsWith('&enfant=zoe2'), `${zoe.texts[0]} ${zoe.widget.url}`);
  const second = await run({ files, param: '2', loaderConfig: FAMILLE });
  assert(second.texts[0] === 'ZOÉ · LYON', second.texts[0]);
  // Zoé (à pied, 2 ans et demi) n'a ni body ni pyjama dans ses dessins.
  const leoRow = first.widget.rows[0].images.length;
  assert(zoe.widget.rows[0] && leoRow > 0, 'dessins manquants');
  const state = JSON.parse(files.get('/doc/superbebe/etat.json'));
  assert(state.config === FAMILLE && !state.paramSeen, `le prénom ne doit pas remplacer les réglages : ${JSON.stringify(state)}`);
});

await test('Plusieurs enfants : chambre de chacun, ouverture de l\'app sur l\'enfant du widget', async () => {
  const files = new Map();
  const at = Date.parse('2026-10-21T20:00:00+02:00');
  const open = await run({
    files, param: 'Zoé', loaderConfig: FAMILLE, inWidget: false, query: { ouvrir: 'app', enfant: 'zoe2' }, at: '2026-10-21T20:30:00+02:00',
    navigations: [`superbebe-sync:?config=${FAMILLE}&rooms=leo1:21.5@${at},zoe2:18@${at}`],
  });
  assert(open.view?.url === `${APP}?hote=scriptable&enfant=zoe2#import=${FAMILLE}`, String(open.view?.url));
  const leo = await run({ files, param: 'Léo', loaderConfig: FAMILLE, at: '2026-10-21T20:40:00+02:00' });
  const zoe = await run({ files, param: 'Zoé', loaderConfig: FAMILLE, at: '2026-10-21T20:40:00+02:00' });
  assert(/nuit 21,5°/i.test(leo.texts[2]) && /nuit 18°/i.test(zoe.texts[2]), `${leo.texts[2]} / ${zoe.texts[2]}`);
});

await test('Widget Maison (iPhone) : « maison » dans Parameter, le jour la pièce de vie, la nuit sa chambre ; il ouvre l\'onglet Maison', async () => {
  const files = new Map();
  const at = Date.parse('2026-10-21T09:00:00+02:00');
  // L'app, ouverte depuis le widget, envoie les relevés : chambre (rooms) et pièce de jour (dayrooms).
  const open = await run({
    files, param: 'Léo maison', loaderConfig: FAMILLE, inWidget: false, query: { ouvrir: 'app', enfant: 'leo1', onglet: 'maison' },
    navigations: [`superbebe-sync:?config=${FAMILLE}&rooms=leo1:23@${at}&dayrooms=leo1:17@${at}`],
  });
  assert(open.view?.url === `${APP}?hote=scriptable&enfant=leo1&onglet=maison#import=${FAMILLE}`, String(open.view?.url));
  const day = await run({ files, param: 'Léo maison', loaderConfig: FAMILLE, at: '2026-10-21T10:00:00+02:00' });
  assert(day.texts[0] === 'LÉO · CHEZ VOUS' && day.texts[1] === 'Chez vous 17°' && day.widget.url.endsWith('&enfant=leo1&onglet=maison'), `${day.texts.join(' | ')} ${day.widget.url}`);
  assert(day.widget.rows[0].images.length === 3 && day.texts.includes('Sous 20 °C : une couche de plus'), JSON.stringify(day.texts));
  const night = await run({ files, param: 'maison', loaderConfig: FAMILLE, at: '2026-10-21T20:30:00+02:00' });
  assert(night.texts[0] === 'LÉO · SA CHAMBRE' && night.texts[1] === 'Chambre 23°', night.texts.join(' | '));
  assert(night.widget.rows[0].texts[0].text.includes('1 TOG') && night.texts.includes('Un peu chaud pour dormir : au-dessus de 20 °C'), JSON.stringify(night.texts));
  // Le widget principal du même enfant garde sa journée en couches.
  const main = await run({ files, param: 'Léo', loaderConfig: FAMILLE, at: '2026-10-21T10:00:00+02:00' });
  assert(main.texts[0] === 'LÉO · LYON' && !main.widget.url.includes('onglet'), main.texts[0]);
});

await test('Widget Maison (Android) : la tenue et l\'état pour chaque relevé, calculés d\'avance, le jour et la nuit', async () => {
  const android = readFileSync(join(ROOT, 'android', 'app', 'src', 'main', 'assets', 'superbebe-android.js'), 'utf8');
  const out = JSON.parse(vm.runInContext(`${android}\nsbAndroidAll(${JSON.stringify(forecast)}, ${JSON.stringify(FAMILLE)}, {}, "2026-10-21", "10:00");`, vm.createContext({})));
  const leo = out.children[0].maison;
  assert(Object.keys(leo.jour.by).length === 51 && leo.jour.by['10.0'] && leo.nuit.by['35.0'] && leo.confirm === 'Touchez la température pour la noter', Object.keys(leo.jour.by).join());
  assert(leo.nuit.by['19.5'].outfit.text === '≈ 2,5 TOG' && leo.nuit.by['19.5'].outfit.drawings.at(-1) === 'gigoteuse', JSON.stringify(leo.nuit.by['19.5']));
  assert(leo.nuit.by['22.5'].status === 'Un peu chaud pour dormir : au-dessus de 20 °C' && leo.jour.by['28.0'].outfit.drawings.join() === 'body_sans_manches', JSON.stringify(leo.jour.by['28.0']));
  assert(leo.jour.unknown.status === 'Tenue pour 20 à 22 °C, le repère de jour', leo.jour.unknown.status);
  const zoe = out.children[1].maison;
  assert(zoe.jour.by['21.0'].outfit.drawings.join() === 'haut_ml,pantalon', JSON.stringify(zoe.jour.by['21.0']));
});

await test('Rappel du soir : programmé à l\'heure choisie avec la tenue de demain de chaque enfant, retiré quand on le coupe', async () => {
  const files = new Map();
  const scheduled = [];
  const removed = [];
  const Notification = class {
    setTriggerDate(date) {
      this.date = date;
    }
    async schedule() {
      scheduled.push({ id: this.identifier, title: this.title, body: this.body, date: this.date });
    }
    static removePending(ids) {
      removed.push(...ids);
    }
  };
  // Activé depuis l'app (lien superbebe-sync:?…&rappel=20:00), puis le widget se met à jour à 7 h 30.
  await run({ files, loaderConfig: FAMILLE, param: '', inWidget: false, query: { config: FAMILLE, rappel: '20:00' }, extra: { Notification } });
  const morning = await run({ files, loaderConfig: FAMILLE, param: '', extra: { Notification } });
  const last = scheduled.at(-1);
  assert(morning.completed && last?.id === 'superbebe-rappel' && last.title === 'Demain, à préparer ce soir', JSON.stringify(last));
  assert(last.body.split('\n').length === 2 && last.body.startsWith('Léo : ') && last.body.includes('\nZoé : ') && last.body.includes('nuit'), last.body);
  assert(last.date.getHours() === 20 && last.date.getDate() === 21, String(last.date));
  // Après 20 h, le prochain rappel est pour le lendemain soir.
  await run({ files, loaderConfig: FAMILLE, param: '', at: '2026-10-21T20:30:00+02:00', extra: { Notification } });
  assert(scheduled.at(-1).date.getDate() === 22, String(scheduled.at(-1).date));
  await run({ files, loaderConfig: FAMILLE, param: '', inWidget: false, query: { rappel: '0' }, extra: { Notification } });
  assert(removed.includes('superbebe-rappel'), 'rappel non retiré');
  const count = scheduled.length;
  await run({ files, loaderConfig: FAMILLE, param: '', extra: { Notification } });
  assert(scheduled.length === count, 'rappel programmé alors qu\'il est coupé');
});

await test('Android : le moteur embarqué renvoie le lieu et trois lignes, le jour comme le soir', async () => {
  const android = readFileSync(join(ROOT, 'android', 'app', 'src', 'main', 'assets', 'superbebe-android.js'), 'utf8');
  const call = `${android}\nsbAndroid(${JSON.stringify(forecast)}, ${JSON.stringify(CONFIG)}, {"offset": 0, "room": 19}, "2026-10-21", "20:30");`;
  const out = JSON.parse(vm.runInContext(call, vm.createContext({})));
  assert(out.place === 'Lyon' && out.moment === 'soir' && out.theme === 'nuit' && out.check === 'Touchez sa nuque, pas ses mains', JSON.stringify(out));
  assert(out.lines.length === 3 && /^Demain /.test(out.lines[0]) && /nuit 19° : body ML \+ 2,5 TOG/i.test(out.lines[2]), JSON.stringify(out.lines));
  assert(out.lines[1].drawings?.length >= 3 && out.lines[1].label.startsWith('Body ML'), JSON.stringify(out.lines[1]));
  const day = JSON.parse(vm.runInContext(`${android}\nsbAndroid(${JSON.stringify(forecast)}, ${JSON.stringify(CONFIG)}, {}, "2026-10-21", "07:30");`, vm.createContext({})));
  assert(/^Ce matin /.test(day.lines[0]) && day.lines[1].drawings.length >= 3 && day.lines[1].drawings.every((id) => /^[a-z_]+$/.test(id)), JSON.stringify(day.lines));
  const texte = JSON.parse(vm.runInContext(call.replace(JSON.stringify(CONFIG), JSON.stringify(TEXTE)), vm.createContext({})));
  assert(/^Body ML · /.test(texte.lines[1]) && texte.lines[2].includes('2,5 TOG'), JSON.stringify(texte.lines));
  const bad = JSON.parse(vm.runInContext(`${android}\nsbAndroid({}, "SB1.@@", {}, "2026-10-21", "08:00");`, vm.createContext({})));
  assert(bad.error === 'configuration', JSON.stringify(bad));
});

await test('Android : un rendu par enfant, avec la chambre de chacun', async () => {
  const android = readFileSync(join(ROOT, 'android', 'app', 'src', 'main', 'assets', 'superbebe-android.js'), 'utf8');
  const call = `${android}\nsbAndroidAll(${JSON.stringify(forecast)}, ${JSON.stringify(FAMILLE)}, {"rooms": {"leo1": 21.5, "zoe2": 18}}, "2026-10-21", "20:30");`;
  const out = JSON.parse(vm.runInContext(call, vm.createContext({})));
  assert(out.children.map((c) => `${c.id}:${c.name}`).join() === 'leo1:Léo,zoe2:Zoé', JSON.stringify(out.children.map((c) => c.id)));
  assert(/nuit 21,5°/i.test(out.children[0].lines[2]) && /nuit 18°/i.test(out.children[1].lines[2]), JSON.stringify(out.children.map((c) => c.lines[2])));
  const one = JSON.parse(vm.runInContext(`${android}\nsbAndroid(${JSON.stringify(forecast)}, ${JSON.stringify(FAMILLE)}, {}, "2026-10-21", "07:30", "zoe2");`, vm.createContext({})));
  assert(one.name === 'Zoé' && !one.lines[1].drawings.includes('body_ml'), JSON.stringify(one));
  const due = JSON.parse(vm.runInContext(`${android}\nsbAndroidAll(${JSON.stringify(forecast)}, ${JSON.stringify(FAMILLE)}, {"reminder": true}, "2026-10-21", "20:00");`, vm.createContext({})));
  assert(due.reminder.title === 'Demain, à préparer ce soir' && due.reminder.lines.length === 2 && due.reminder.lines[1].startsWith('Zoé : '), JSON.stringify(due.reminder));
  assert(JSON.parse(vm.runInContext(call, vm.createContext({}))).reminder.lines.length === 0, 'rappel calculé sans être dû');
});

await test('Android : la tenue de nuit choisie et le style sans pyjama arrivent jusqu\'au widget', async () => {
  const choix = encodeConfig({
    v: 2, n: 'Lyon', c: '69123', la: 45.758, lo: 4.8351, f: '09:00', u: '18:00', d: 1, i: 0,
    k: [{ id: 'leo1', p: 'Léo', b: '2026-05', t: 'poussette', o: 0, s: 'sans_pyjama', g: { n20: 'tog-2' } }],
  }, toB64);
  const android = readFileSync(join(ROOT, 'android', 'app', 'src', 'main', 'assets', 'superbebe-android.js'), 'utf8');
  const out = JSON.parse(vm.runInContext(`${android}\nsbAndroid(${JSON.stringify(forecast)}, ${JSON.stringify(choix)}, {"rooms": {"leo1": 19}}, "2026-10-21", "20:30");`, vm.createContext({})));
  assert(/nuit 19° : body ML \+ pyjama \+ 2 TOG/i.test(out.lines[2]) && !/pyjama/i.test(out.lines[1]) && /pantalon/i.test(out.lines[1]), JSON.stringify(out.lines));
});

console.log(`\n${failed ? `${failed} test(s) en échec` : 'Widgets iPhone et Android : tous les tests OK'}`);
process.exit(failed ? 1 : 0);
