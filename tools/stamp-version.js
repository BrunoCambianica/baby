// Reporte la version de package.json dans l'app (cache du service worker et pied de page).
// Changer la version vide le cache des téléphones à la mise en ligne suivante.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readJSON, ROOT } from './load-rules.js';

const { version } = readJSON(join(ROOT, 'package.json'));
for (const file of ['app/sw.js', 'app/js/views.js']) {
  const path = join(ROOT, file);
  const source = readFileSync(path, 'utf8');
  writeFileSync(path, source.replace(/(const VERSION = ')[^']*(';)/, `$1${version}$2`));
}
console.log(`version ${version} reportée dans l'app`);
