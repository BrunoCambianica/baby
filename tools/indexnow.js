// Signale les pages du guide à IndexNow (Bing, Yandex, Seznam, Naver… ; Bing alimente Copilot, DuckDuckGo et une
// partie des recherches de ChatGPT) : elles sont relues sans attendre le prochain passage des robots.
// À lancer après une mise en ligne, une fois la nouvelle version servie : npm run indexnow
// La clé est publique par nature : le fichier <clé>.txt, à la racine du site, prouve que le site nous appartient.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readJSON, ROOT } from './load-rules.js';

const SITE = readJSON(join(ROOT, 'package.json')).homepage;
const keyFile = readdirSync(ROOT).find((name) => /^[0-9a-f]{32}\.txt$/.test(name));
if (!keyFile) throw new Error('Clé IndexNow absente : un fichier <32 caractères hexadécimaux>.txt à la racine du dépôt');
const key = keyFile.slice(0, -4);
const urlList = [...readFileSync(join(ROOT, 'sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

const live = await fetch(`${SITE}${keyFile}`).then((res) => (res.ok ? res.text() : ''));
if (live.trim() !== key) throw new Error(`${SITE}${keyFile} ne renvoie pas la clé : mettre le site en ligne d'abord`);

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: new URL(SITE).host, key, keyLocation: `${SITE}${keyFile}`, urlList }),
});
console.log(`IndexNow : ${res.status} ${res.statusText} pour ${urlList.length} adresses`);
if (!res.ok && res.status !== 202) process.exit(1);
