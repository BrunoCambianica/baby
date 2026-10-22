// Génère les icônes PNG de l'app (soleil et nuage sur un ciel bleu), sans dépendance.
// Usage : node tools/make-icons.js
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { ROOT } from './load-rules.js';

const OUT = join(ROOT, 'app', 'icons');
const SKY_TOP = [59, 140, 246];
const SKY_BOTTOM = [124, 188, 251];
const SUN = [242, 184, 75];
const CLOUD = [244, 248, 250];

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(size, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // 8 bits par canal
  header[9] = 6; // RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Formes en coordonnées relatives (0 à 1) ; `scale` resserre le dessin pour la zone sûre des icônes masquables.
function shapes(scale) {
  const s = (v) => 0.5 + (v - 0.5) * scale;
  const r = (v) => v * scale;
  const circle = (cx, cy, radius) => (x, y) => (x - s(cx)) ** 2 + (y - s(cy)) ** 2 <= r(radius) ** 2;
  const cloudParts = [circle(0.4, 0.6, 0.13), circle(0.55, 0.53, 0.17), circle(0.69, 0.62, 0.11)];
  const cloudBase = (x, y) => x >= s(0.27) && x <= s(0.8) && y >= s(0.6) && y <= s(0.73);
  const roundedEnds = [circle(0.29, 0.66, 0.07), circle(0.78, 0.66, 0.07)];
  return {
    sun: circle(0.62, 0.38, 0.17),
    cloud: (x, y) => cloudBase(x, y) || cloudParts.some((f) => f(x, y)) || roundedEnds.some((f) => f(x, y)),
  };
}

// `transparent` : fond vide, pour le premier plan des icônes adaptatives d'Android.
function draw(size, scale, { transparent = false } = {}) {
  const { sun, cloud } = shapes(scale);
  const pixels = Buffer.alloc(size * size * 4);
  const SS = 4; // suréchantillonnage pour adoucir les bords
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const acc = [0, 0, 0, 0];
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = (px + (sx + 0.5) / SS) / size;
          const y = (py + (sy + 0.5) / SS) / size;
          const sky = SKY_TOP.map((c, k) => c + (SKY_BOTTOM[k] - c) * y);
          const shape = cloud(x, y) ? CLOUD : sun(x, y) ? SUN : null;
          const color = shape ?? sky;
          const alpha = shape || !transparent ? 255 : 0;
          for (let k = 0; k < 3; k++) acc[k] += color[k] * alpha;
          acc[3] += alpha;
        }
      }
      const i = (py * size + px) * 4;
      for (let k = 0; k < 3; k++) pixels[i + k] = acc[3] ? Math.round(acc[k] / acc[3]) : 0;
      pixels[i + 3] = Math.round(acc[3] / (SS * SS));
    }
  }
  return png(size, pixels);
}

mkdirSync(OUT, { recursive: true });
const files = [
  ['icon-192.png', 192, 1],
  ['icon-512.png', 512, 1],
  ['apple-touch-icon.png', 180, 1],
  ['icon-maskable-512.png', 512, 0.78],
];
for (const [name, size, scale] of files) {
  writeFileSync(join(OUT, name), draw(size, scale));
  console.log(`icône ${name} (${size} px)`);
}

// Icônes de l'app Android : carrée pour les anciens Android, adaptative (ciel + premier plan) depuis Android 8.
const ANDROID_RES = join(ROOT, 'android', 'app', 'src', 'main', 'res');
for (const [density, size] of [['mdpi', 48], ['hdpi', 72], ['xhdpi', 96], ['xxhdpi', 144], ['xxxhdpi', 192]]) {
  const dir = join(ANDROID_RES, `mipmap-${density}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'ic_launcher.png'), draw(size, 0.86));
  writeFileSync(join(dir, 'ic_launcher_foreground.png'), draw(Math.round(size * 2.25), 0.6, { transparent: true }));
}
console.log('icônes Android (mipmap) générées');
