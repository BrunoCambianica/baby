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
  offline = false, files = new Map(), at = '2026-10-21T07:30:00+02:00',
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

await test('Widget moyen : en-tête, créneau du jour, tenue en dessins, pied de page', async () => {
  const out = await run();
  assert(out.completed, 'Script.complete() non appelé');
  assert(out.texts[0] === 'SUPERBÉBÉ · LYON', out.texts[0]);
  assert(/^(Sortie idéale \d+ h – \d+ h · -?\d+°|Pas de |Plus de )/.test(out.texts[1]), out.texts[1]);
  const row = out.widget.rows[0];
  assert(row && row.images.length >= 3 && row.images.every((i) => i.imageSize?.width === 24), `rangée de dessins : ${JSON.stringify(row?.images.length)}`);
  assert(out.texts.at(-1) === 'Mis à jour à 07 h 30 · Open-Meteo', out.texts.at(-1));
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
  assert(circular.texts.length === 1 && /( h|—)$/.test(circular.texts[0]), JSON.stringify(circular.texts));
});

await test('Le soir : ligne nuit et TOG selon le relevé de la chambre', async () => {
  const files = new Map([['/doc/superbebe/etat.json', JSON.stringify({ room: { value: 21.5, at: Date.parse('2026-10-21T19:00:00+02:00') } })]]);
  const out = await run({ files, at: '2026-10-21T20:30:00+02:00' });
  assert(out.texts[1].includes('21,5'), out.texts[1]);
  const row = out.widget.rows[0];
  // Chambre à 21,5 °C : un pyjama léger sous une gigoteuse de 1 TOG.
  assert(row.images.length === 2 && row.texts[0].text === '≈ 1 TOG', `${row.images.length} dessins, ${JSON.stringify(row.texts)}`);
  const texte = await run({ files, param: TEXTE, at: '2026-10-21T20:30:00+02:00' });
  assert(texte.texts[2].includes('TOG'), texte.texts[2]);
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
  assert(out.texts.at(-1).startsWith('Hors ligne · Mis à jour à 07 h 30'), out.texts.at(-1));
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
  assert(state.config === PARIS && state.room?.value === 21.5, JSON.stringify(state));
  const after = await run({ files, at: '2026-10-21T20:40:00+02:00' });
  assert(after.texts[0] === 'SUPERBÉBÉ · PARIS' && after.texts[1].includes('21,5'), JSON.stringify(after.texts));
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

await test('Android : le moteur embarqué renvoie le lieu et trois lignes', async () => {
  const android = readFileSync(join(ROOT, 'android', 'app', 'src', 'main', 'assets', 'superbebe-android.js'), 'utf8');
  const call = `${android}\nsbAndroid(${JSON.stringify(forecast)}, ${JSON.stringify(CONFIG)}, {"offset": 0, "room": 19}, "2026-10-21", "20:30");`;
  const out = JSON.parse(vm.runInContext(call, vm.createContext({})));
  assert(out.place === 'Lyon' && out.moment === 'soir' && out.theme === 'nuit', JSON.stringify(out));
  assert(out.lines.length === 3 && out.lines[0].includes('19'), JSON.stringify(out.lines));
  assert(out.lines[1].drawings?.join() === 'body_ml,gigoteuse' && out.lines[1].text === '≈ 2,5 TOG', JSON.stringify(out.lines[1]));
  assert(out.lines[1].label === 'Body ML + gigoteuse ≈ 2,5 TOG', out.lines[1].label);
  const day = JSON.parse(vm.runInContext(`${android}\nsbAndroid(${JSON.stringify(forecast)}, ${JSON.stringify(CONFIG)}, {}, "2026-10-21", "07:30");`, vm.createContext({})));
  assert(day.lines[1].drawings.length >= 3 && day.lines[1].drawings.every((id) => /^[a-z_]+$/.test(id)), JSON.stringify(day.lines[1]));
  const texte = JSON.parse(vm.runInContext(call.replace(JSON.stringify(CONFIG), JSON.stringify(TEXTE)), vm.createContext({})));
  assert(texte.lines[1].includes('2,5 TOG'), JSON.stringify(texte.lines));
  const bad = JSON.parse(vm.runInContext(`${android}\nsbAndroid({}, "SB1.@@", {}, "2026-10-21", "08:00");`, vm.createContext({})));
  assert(bad.error === 'configuration', JSON.stringify(bad));
});

console.log(`\n${failed ? `${failed} test(s) en échec` : 'Widgets iPhone et Android : tous les tests OK'}`);
process.exit(failed ? 1 : 0);
