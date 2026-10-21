// Assemble le widget iPhone : moteur + adaptateur + partie Scriptable, avec les règles embarquées.
// Produit widget/superbebe.js (chargé par widget/chargeur.js) et widget/superbebe-autonome.js (à coller tel quel).
// Usage : node tools/build-widget.js
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { loadRules, readJSON, ROOT } from './load-rules.js';

const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const strip = (source) => source.replace(/^import .*;\n/gm, '').replace(/^export /gm, '');

const { version } = readJSON(join(ROOT, 'package.json'));
const { rules, messages } = loadRules();
const code = [
  `// Superbébé ${version}, widget iPhone pour Scriptable.`,
  '// Fichier généré par tools/build-widget.js à partir de engine/ et widget/main.scriptable.js : ne pas modifier à la main.',
  `const SB_VERSION = ${JSON.stringify(version)};`,
  "const SB_BASE_URL = 'https://brunocambianica.github.io/baby/';",
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
console.log(`widget/superbebe.js et widget/superbebe-autonome.js générés (${Math.round(code.length / 1024)} Ko)`);
