// Génère les dessins des vêtements pour le widget Android (vector drawables blancs) et leur table Kotlin,
// à partir de engine/drawings.js. Vérifie au passage que chaque tracé reste lisible par le widget iPhone.
// Usage : node tools/make-drawings.js
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DRAWING_STROKE, DRAWINGS } from '../engine/drawings.js';
import { ROOT } from './load-rules.js';

const RES = join(ROOT, 'android', 'app', 'src', 'main', 'res', 'drawable');
const KOTLIN = join(ROOT, 'android', 'app', 'src', 'main', 'java', 'fr', 'superbebe', 'widget', 'SbDrawings.kt');
const NOTICE = 'Généré par tools/make-drawings.js à partir de engine/drawings.js : ne pas modifier à la main.';
const WHITE = '#FFFFFFFF';
const num = (v) => String(Math.round(v * 1000) / 1000);

// Le widget iPhone ne relit que les commandes absolues M, L, Q, C et Z, dans la grille de 24 × 24.
function check(id, d) {
  if (!/^[MLQCZ\d.\s-]+$/.test(d)) throw new Error(`${id} : commande non prise en charge dans « ${d} »`);
  for (const v of d.match(/-?\d*\.?\d+/g)) {
    if (Number(v) < 0 || Number(v) > 24) throw new Error(`${id} : ${v} hors de la grille`);
  }
}

const circle = ([cx, cy, r]) => `M${num(cx - r)},${num(cy)} A${num(r)},${num(r)} 0 1,0 ${num(cx + r)},${num(cy)} `
  + `A${num(r)},${num(r)} 0 1,0 ${num(cx - r)},${num(cy)} Z`;
const stroke = `android:strokeColor="${WHITE}" android:strokeWidth="${DRAWING_STROKE}" `
  + 'android:strokeLineCap="round" android:strokeLineJoin="round"';

function vector(id, parts) {
  const paths = parts.map((part) => {
    if (part.d) check(id, part.d);
    // Comme dans l'app : un contour plein est aussi tracé, un point plein ne l'est pas.
    const paint = part.fill
      ? `android:fillColor="${WHITE}"${part.c ? '' : ` ${stroke}`}`
      : `android:fillColor="#00000000" ${stroke}`;
    return `    <path android:pathData="${part.c ? circle(part.c) : part.d}" ${paint} />`;
  });
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    `<!-- ${NOTICE} -->`,
    '<vector xmlns:android="http://schemas.android.com/apk/res/android"',
    '    android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">',
    ...paths,
    '</vector>',
    '',
  ].join('\n');
}

mkdirSync(RES, { recursive: true });
const ids = Object.keys(DRAWINGS);
// Les dessins retirés de engine/drawings.js disparaissent aussi de l'app Android.
for (const file of readdirSync(RES)) {
  if (file.startsWith('drawing_') && !ids.includes(file.slice(8, -4))) rmSync(join(RES, file));
}
for (const id of ids) writeFileSync(join(RES, `drawing_${id}.xml`), vector(id, DRAWINGS[id]));

writeFileSync(KOTLIN, `// ${NOTICE}
package fr.superbebe.widget

/** Dessins des vêtements pour le widget : identifiant de engine/drawings.js vers son vector drawable blanc. */
object SbDrawings {
    private val resources = mapOf(
${ids.map((id) => `        "${id}" to R.drawable.drawing_${id},`).join('\n')}
    )

    fun resource(id: String): Int? = resources[id]
}
`);
console.log(`${ids.length} dessins Android générés`);
