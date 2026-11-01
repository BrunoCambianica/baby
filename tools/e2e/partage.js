// Image de partage du guide (guide/partage.png, 1200 × 630) : les réseaux et les messageries l'affichent avec le lien.
// Faite une fois, à refaire si le titre change : node tools/e2e/partage.js (Chromium de Playwright, voir installer.sh).
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { ROOT } from '../load-rules.js';

const LIBS = join(homedir(), '.local', 'share', 'superbebe', 'libs', 'usr', 'lib', 'x86_64-linux-gnu');
const env = existsSync(LIBS) ? { ...process.env, LD_LIBRARY_PATH: `${LIBS}:${process.env.LD_LIBRARY_PATH ?? ''}` } : process.env;
// L'icône en ligne : une page ouverte par setContent ne peut pas lire les fichiers du disque.
const icon = `data:image/png;base64,${readFileSync(join(ROOT, 'app', 'icons', 'icon-512.png')).toString('base64')}`;

const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
  body { margin: 0; width: 1200px; height: 630px; display: flex; flex-direction: column; justify-content: center; gap: 28px;
    padding: 0 88px; box-sizing: border-box; background: linear-gradient(135deg, #2f7cf6, #1d4fb8); color: #fff;
    font-family: ui-rounded, "SF Pro Rounded", system-ui, "Segoe UI", Roboto, sans-serif; }
  .brand { display: flex; align-items: center; gap: 20px; font-size: 44px; font-weight: 800; }
  .brand img { width: 84px; height: 84px; border-radius: 20px; }
  h1 { margin: 0; font-size: 72px; line-height: 1.08; letter-spacing: -0.02em; }
  p { margin: 0; font-size: 30px; opacity: 0.92; white-space: nowrap; }
</style></head><body>
  <div class="brand"><img src="${icon}" alt="">Superbébé</div>
  <h1>Comment habiller bébé selon la température</h1>
  <p>Dehors, maison, nuit · repères officiels · gratuit, sans compte</p>
</body></html>`;

const browser = await chromium.launch({ channel: 'chromium', env });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: join(ROOT, 'guide', 'partage.png') });
  console.log('guide/partage.png écrite');
} finally {
  await browser.close();
}
