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

async function run({ family = 'medium', inWidget = true, param = CONFIG, choices = [], textField = '', offline = false, files = new Map(), at = '2026-10-21T07:30:00+02:00' } = {}) {
  const out = { widget: null, presented: null, completed: false, opened: null };
  class ListWidget {
    constructor() {
      this.texts = [];
    }
    addText(text) {
      const t = { text };
      this.texts.push(t);
      return t;
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
    addCancelAction() {}
    addTextField() {
      return { setDecimalPadKeyboard() {} };
    }
    async presentSheet() {
      return choices.length ? choices.shift() : -1;
    }
    async presentAlert() {
      return choices.length ? choices.shift() : -1;
    }
    textFieldValue() {
      return textField;
    }
  }
  const accessory = family.startsWith('accessory');
  const context = vm.createContext({
    ListWidget, Color, Font, Request, Alert, LinearGradient, Point,
    FileManager: { local: () => fm },
    Data: { fromBase64String: (b64) => ({ toRawString: () => Buffer.from(b64, 'base64').toString('binary') }) },
    Script: { setWidget: (w) => { out.widget = w; }, complete: () => { out.completed = true; } },
    Safari: { open: (url) => { out.opened = url; } },
    config: { widgetFamily: family, runsInWidget: inWidget && !accessory, runsInAccessoryWidget: inWidget && accessory },
    args: { widgetParameter: param },
    Date: fixedDate(at),
    console,
  });
  const runSuperbebe = vm.runInContext(`(function () {\n${code}\nreturn runSuperbebe;\n})()`, context);
  await runSuperbebe();
  out.files = files;
  out.texts = (out.widget ?? out.presented)?.texts.map((t) => t.text) ?? [];
  return out;
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

await test('Widget moyen : en-tête, créneau du jour, tenue, pied de page', async () => {
  const out = await run();
  assert(out.completed, 'Script.complete() non appelé');
  assert(out.texts[0] === 'SUPERBÉBÉ · LYON', out.texts[0]);
  assert(/^(Sortie idéale \d+ h – \d+ h · -?\d+°|Pas de |Plus de )/.test(out.texts[1]), out.texts[1]);
  assert(/^Body /.test(out.texts[2]), out.texts[2]);
  assert(out.texts.at(-1) === 'Mis à jour à 07 h 30 · Open-Meteo', out.texts.at(-1));
});

await test('Petit widget : deux lignes seulement', async () => {
  const out = await run({ family: 'small' });
  assert(out.texts.length === 4, JSON.stringify(out.texts));
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
  assert(out.texts[2].includes('TOG'), out.texts[2]);
});

await test('Sans configuration : message d\'aide', async () => {
  const out = await run({ param: '' });
  assert(out.texts.some((t) => t.includes('Configuration manquante')), JSON.stringify(out.texts));
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

await test('Menu : température de la chambre enregistrée', async () => {
  const files = new Map();
  await run({ inWidget: false, choices: [0, 0], textField: '20,5', files, at: '2026-10-21T20:30:00+02:00' });
  const state = JSON.parse(files.get('/doc/superbebe/etat.json'));
  assert(state.room?.value === 20.5, JSON.stringify(state));
});

await test('Menu : « Ouvrir l\'app » ouvre le site, puis affiche le widget', async () => {
  const out = await run({ inWidget: false, choices: [1] });
  assert(out.opened === 'https://brunocambianica.github.io/baby/app/', String(out.opened));
  assert(out.presented, 'aperçu non affiché');
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

await test('Chargeur : télécharge le code et transmet l\'adresse du site', async () => {
  const base = 'https://exemple.test/superbebe/';
  const loader = readFileSync(join(ROOT, 'widget', 'chargeur.js'), 'utf8').replaceAll('__SB_BASE_URL__', base);
  const files = new Map();
  let requested = null;
  let opened = null;
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
  class ListWidget {
    addText() {
      return {};
    }
    addSpacer() {}
    setPadding() {}
    async presentMedium() {}
  }
  class Alert {
    addAction() {}
    addCancelAction() {}
    async presentSheet() {
      return 1;
    }
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
    ListWidget, Alert, Request,
    LinearGradient: class {},
    Point: class {},
    Color: class { static dynamic(a) { return a; } static white() { return {}; } },
    Font: { systemFont: () => ({}), boldSystemFont: () => ({}) },
    FileManager: { local: () => fm },
    Data: { fromBase64String: (b64) => ({ toRawString: () => Buffer.from(b64, 'base64').toString('binary') }) },
    Script: { setWidget() {}, complete() {} },
    Safari: { open: (url) => { opened = url; } },
    config: { widgetFamily: 'medium', runsInWidget: false, runsInAccessoryWidget: false },
    args: { widgetParameter: CONFIG },
    Date: fixedDate('2026-10-21T07:30:00+02:00'),
  });
  await vm.runInContext(`(async () => {\n${loader}\n})()`, context);
  assert(requested === `${base}widget/superbebe.js`, `code demandé à ${requested}`);
  assert(opened === `${base}app/`, `app ouverte sur ${opened}`);
  assert(files.has('/doc/superbebe-widget.js'), 'code non gardé pour le hors-ligne');
});

await test('Android : le moteur embarqué renvoie le lieu et trois lignes', async () => {
  const android = readFileSync(join(ROOT, 'android', 'app', 'src', 'main', 'assets', 'superbebe-android.js'), 'utf8');
  const call = `${android}\nsbAndroid(${JSON.stringify(forecast)}, ${JSON.stringify(CONFIG)}, {"offset": 0, "room": 19}, "2026-10-21", "20:30");`;
  const out = JSON.parse(vm.runInContext(call, vm.createContext({})));
  assert(out.place === 'Lyon' && out.moment === 'soir' && out.theme === 'nuit', JSON.stringify(out));
  assert(out.lines.length === 3 && out.lines[0].includes('19') && out.lines[1].includes('2,5 TOG'), JSON.stringify(out.lines));
  const bad = JSON.parse(vm.runInContext(`${android}\nsbAndroid({}, "SB1.@@", {}, "2026-10-21", "08:00");`, vm.createContext({})));
  assert(bad.error === 'configuration', JSON.stringify(bad));
});

console.log(`\n${failed ? `${failed} test(s) en échec` : 'Widgets iPhone et Android : tous les tests OK'}`);
process.exit(failed ? 1 : 0);
