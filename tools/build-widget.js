// Assemble le widget iPhone : moteur + adaptateur + partie Scriptable, avec les règles embarquées.
// Produit widget/superbebe.js (chargé par widget/chargeur.js) et widget/superbebe-autonome.js (à coller tel quel).
// Usage : node tools/build-widget.js
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { loadRules, readJSON, ROOT } from './load-rules.js';

const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const strip = (source) => source.replace(/^import .*;\n/gm, '').replace(/^export /gm, '');

const { version, homepage } = readJSON(join(ROOT, 'package.json'));
const { rules, messages } = loadRules();
const code = [
  `// Superbébé ${version}, widget iPhone pour Scriptable.`,
  '// Fichier généré par tools/build-widget.js à partir de engine/ et widget/main.scriptable.js : ne pas modifier à la main.',
  `const SB_VERSION = ${JSON.stringify(version)};`,
  '// Le chargeur fournit l\'adresse réelle du site ; sinon, adresse par défaut (champ homepage de package.json).',
  `const SB_BASE_URL = (typeof SB_BASE_FROM_LOADER === 'string' && SB_BASE_FROM_LOADER) || ${JSON.stringify(homepage)};`,
  `const SB_RULES = ${JSON.stringify({ rules, messages })};`,
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
writeFileSync(join(ROOT, 'dist', 'android-version.json'), `${JSON.stringify({ versionCode, versionName, apk: 'superbebe-android.apk' }, null, 2)}\n`);
mkdirSync(assets, { recursive: true });
writeFileSync(join(assets, 'superbebe-android.js'), `${android}\n`);
console.log('android/app/src/main/assets/superbebe-android.js généré');
console.log(`widget/superbebe.js et widget/superbebe-autonome.js générés (${Math.round(code.length / 1024)} Ko)`);
