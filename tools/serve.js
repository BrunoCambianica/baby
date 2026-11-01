// Serveur local qui imite GitHub Pages : le dépôt est servi sous /baby/.
// Usage : npm run serve, puis http://localhost:8080/baby/ (le guide) ou http://localhost:8080/baby/app/ (l'app)
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { ROOT } from './load-rules.js';

const PREFIX = '/baby/';
const PORT = Number(process.env.PORT ?? 8080);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.md': 'text/plain; charset=utf-8',
  '.apk': 'application/vnd.android.package-archive',
};

const server = createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
  if (url === '/' || url === '/baby') {
    res.writeHead(302, { Location: '/baby/' });
    res.end();
    return;
  }
  if (!url.startsWith(PREFIX)) {
    res.writeHead(404).end('Introuvable');
    return;
  }
  let path = normalize(join(ROOT, url.slice(PREFIX.length)));
  if (!path.startsWith(ROOT)) {
    res.writeHead(403).end('Interdit');
    return;
  }
  if (existsSync(path) && statSync(path).isDirectory()) path = join(path, 'index.html');
  if (!existsSync(path)) {
    res.writeHead(404).end('Introuvable');
    return;
  }
  res.writeHead(200, { 'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
  createReadStream(path).pipe(res);
});

server.listen(PORT, () => console.log(`Superbébé : http://localhost:${PORT}/baby/app/`));
