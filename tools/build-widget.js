// Assemble le widget iPhone : moteur + adaptateur + partie Scriptable, avec les règles embarquées.
// Produit widget/superbebe.js (chargé par widget/chargeur.js) et widget/superbebe-autonome.js (à coller tel quel).
// Usage : node tools/build-widget.js
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { encodeConfig } from '../engine/adapter.js';
import { loadRules, readJSON, ROOT } from './load-rules.js';

const read = (path) => readFileSync(join(ROOT, path), 'utf8');
// Imports retirés, même sur plusieurs lignes (« import {\n  a, b,\n} from '…'; »), et mot-clé export enlevé.
const strip = (source) => source.replace(/^import [^;]*;\n/gm, '').replace(/^export /gm, '');

const { version, homepage } = readJSON(join(ROOT, 'package.json'));
const { rules, messages } = loadRules();
const code = [
  `// Superbébé ${version}, widget iPhone pour Scriptable.`,
  '// Fichier généré par tools/build-widget.js à partir de engine/ et widget/main.scriptable.js : ne pas modifier à la main.',
  `const SB_VERSION = ${JSON.stringify(version)};`,
  '// Le chargeur fournit l\'adresse réelle du site ; sinon, adresse par défaut (champ homepage de package.json).',
  `const SB_BASE_URL = (typeof SB_BASE_FROM_LOADER === 'string' && SB_BASE_FROM_LOADER) || ${JSON.stringify(homepage)};`,
  '// Réglages ajoutés au chargeur par l\'app au moment de la copie (les anciens chargeurs n\'en ont pas).',
  "const SB_CONFIG_LOADER = typeof SB_CONFIG_FROM_LOADER === 'string' ? SB_CONFIG_FROM_LOADER : '';",
  `const SB_RULES = ${JSON.stringify({ rules, messages })};`,
  strip(read('engine/drawings.js')),
  strip(read('engine/engine.js')),
  strip(read('engine/adapter.js')),
  read('widget/main.scriptable.js'),
].join('\n\n');

// Contrôle de syntaxe, y compris les noms déclarés deux fois entre fichiers concaténés.
new vm.Script(`(async () => {\n${code}\n})`, { filename: 'superbebe.js' });
new vm.Script(`(async () => {\n${read('widget/chargeur.js')}\n})`, { filename: 'chargeur.js' });

const scriptableHeader = [
  '// Variables used by Scriptable.',
  '// These must be at the very top of the file. Do not edit.',
  '// icon-color: deep-blue; icon-glyph: baby;',
].join('\n');

writeFileSync(join(ROOT, 'widget', 'superbebe.js'), `${code}\n`);
writeFileSync(join(ROOT, 'widget', 'superbebe-autonome.js'), `${scriptableHeader}\n${code}\n\nawait runSuperbebe();\n`);

// Variante Android : même moteur, appelé par l'app native via JavaScriptSandbox (sans réseau ni Intl).
const android = [
  `// Superbébé ${version}, moteur pour le widget Android. Fichier généré par tools/build-widget.js.`,
  `const SB_RULES = ${JSON.stringify({ rules, messages })};`,
  strip(read('engine/drawings.js')),
  strip(read('engine/engine.js')),
  strip(read('engine/adapter.js')),
  read('android/entry.js'),
].join('\n\n');
new vm.Script(android, { filename: 'superbebe-android.js' });
const assets = join(ROOT, 'android', 'app', 'src', 'main', 'assets');
const gradle = read('android/app/build.gradle.kts');
const versionCode = Number(gradle.match(/versionCode = (\d+)/)[1]);
const versionName = gradle.match(/versionName = "([^"]+)"/)[1];
mkdirSync(join(ROOT, 'dist'), { recursive: true });
// Le numéro de version dans l'adresse de l'APK évite qu'un navigateur ou le CDN serve l'ancien fichier sous le même nom.
writeFileSync(join(ROOT, 'dist', 'android-version.json'), `${JSON.stringify({ versionCode, versionName, apk: `superbebe-android.apk?v=${versionCode}` }, null, 2)}\n`);
mkdirSync(assets, { recursive: true });
writeFileSync(join(assets, 'superbebe-android.js'), `${android}\n`);

// Données des tests des widgets Android (Robolectric, android/app/src/test) : la sortie de ce moteur pour Léo (5 mois)
// et Zoé (2 ans et demi), à Lyon le 21 octobre 2026 à 10 h, avec la météo enregistrée.
const familyConfig = encodeConfig({
  v: 2, n: 'Lyon', c: '69123', la: 45.758, lo: 4.8351, f: '09:00', u: '18:00', d: 1, i: 1,
  k: [{ id: 'leo1', p: 'Léo', b: '2026-05', t: 'poussette', o: 0 }, { id: 'zoe2', p: 'Zoé', b: '2024-03', t: 'a_pied', o: 0 }],
}, (s) => Buffer.from(s, 'binary').toString('base64'));
const recorded = read('tools/fixtures/forecast-lyon-2026-10-21.json');
const engineOut = JSON.parse(vm.runInContext(`${android}\nsbAndroidAll(${recorded}, ${JSON.stringify(familyConfig)}, {}, "2026-10-21", "10:00");`, vm.createContext({})));
const testResources = join(ROOT, 'android', 'app', 'src', 'test', 'resources');
mkdirSync(testResources, { recursive: true });
writeFileSync(join(testResources, 'moteur.json'), `${JSON.stringify({ config: familyConfig, children: engineOut.children })}\n`);

// Variante service worker de l'app : le rappel du soir (Web Push, sans contenu) est calculé sur le téléphone.
const sw = [
  `// Superbébé ${version}, moteur pour le service worker de l'app. Fichier généré par tools/build-widget.js.`,
  `const SB_RULES = ${JSON.stringify({ rules, messages })};`,
  strip(read('engine/drawings.js')),
  strip(read('engine/engine.js')),
  strip(read('engine/adapter.js')),
].join('\n\n');
new vm.Script(sw, { filename: 'sw-moteur.js' });
writeFileSync(join(ROOT, 'app', 'sw-moteur.js'), `${sw}\n`);
console.log('android/app/src/main/assets/superbebe-android.js généré');
console.log(`widget/superbebe.js et widget/superbebe-autonome.js générés (${Math.round(code.length / 1024)} Ko)`);
