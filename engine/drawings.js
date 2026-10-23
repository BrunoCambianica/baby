// Dessins des vêtements, pour voir la tenue d'un coup d'œil. Une seule définition sert à l'app (SVG),
// au widget iPhone (Scriptable, DrawContext) et au widget Android (vector drawables générés par tools/make-drawings.js).
// Grille de 24 × 24, trait de DRAWING_STROKE. Chaque dessin est une liste de tracés :
// { d } contour, { d, fill: true } forme pleine, { c: [cx, cy, r] } cercle (plein si fill).
// Tracés en commandes absolues M, L, Q, C, Z seulement : le widget iPhone les relit lui-même.

export const DRAWING_STROKE = 1.6;

const num = (v) => String(Math.round(v * 100) / 100);

function parsePath(d) {
  const tokens = d.match(/[MLQCZ]|-?\d*\.?\d+/g) ?? [];
  const segments = [];
  let i = 0;
  while (i < tokens.length) {
    const cmd = tokens[i++];
    const count = { M: 1, L: 1, Q: 2, C: 3, Z: 0 }[cmd];
    const pts = [];
    for (let k = 0; k < count; k++) {
      pts.push([Number(tokens[i]), Number(tokens[i + 1])]);
      i += 2;
    }
    segments.push({ cmd, pts });
  }
  return segments;
}

// Silhouette symétrique : demi-contour droit, du milieu haut au milieu bas, complété par son reflet.
function sym(half) {
  const segments = parsePath(half);
  const ends = segments.map((s) => s.pts.at(-1));
  const mirror = ([x, y]) => `${num(24 - x)} ${num(y)}`;
  let back = '';
  for (let k = segments.length - 1; k >= 1; k--) {
    const { cmd, pts } = segments[k];
    const to = mirror(ends[k - 1]);
    if (cmd === 'L') back += ` L${to}`;
    else if (cmd === 'Q') back += ` Q${mirror(pts[0])} ${to}`;
    else if (cmd === 'C') back += ` C${mirror(pts[1])} ${mirror(pts[0])} ${to}`;
  }
  return `${half}${back} Z`;
}

// Un détail et son reflet (piqûres de doudoune, boutons…).
const flip = (d) => d.replace(/(-?\d*\.?\d+) (-?\d*\.?\d+)/g, (all, x, y) => `${num(24 - Number(x))} ${y}`);
const pair = (d) => [{ d }, { d: flip(d) }];
const dot = (cx, cy, r = 0.6) => ({ c: [cx, cy, r], fill: true });
const dots = (cx, cy, r) => [dot(cx, cy, r), dot(24 - cx, cy, r)];

// Bas des bodies : ouvertures des jambes et entrejambe pressionné.
const BODY_BOTTOM = 'L17.2 14.6 C16.4 16.8 14.4 17.4 13.9 20.4 L12 20.4';
const SNAPS = dots(10.9, 19.2, 0.5);

const BODY_MC = [{ d: sym(`M12 5 Q13.7 5 14.6 3.6 L17.2 4.6 L20.6 7.7 L19 9.7 L17.2 8.5 ${BODY_BOTTOM}`) }, ...SNAPS];
const BODY_ML = [{ d: sym(`M12 5 Q13.7 5 14.6 3.6 L17.2 4.6 Q19.8 5.9 20.8 12.6 L19 13.1 L17.2 8.9 ${BODY_BOTTOM}`) }, ...SNAPS];
const BODY_SANS_MANCHES = [{ d: sym(`M12 6.6 Q14.3 6.6 14.6 3.6 L16.6 3.6 Q16.5 7.4 17.4 8.8 L17.4 14.6 C16.6 16.8 14.4 17.4 13.9 20.4 L12 20.4`) }, ...SNAPS];

// Couche seule (nuits très chaudes) : la ceinture et ses deux attaches.
const COUCHE = [{ d: sym('M12 6.2 L19.8 6.2 L19.8 8.6 C19.8 13 17.4 16.8 14.2 18.2 L12 18.2') }, { d: 'M4.2 8.6 L19.8 8.6' }, ...dots(17.8, 7.4, 0.5)];

const PYJAMA_OUTLINE = sym('M12 4.2 Q13.5 4.2 14.2 2.8 L16.7 3.6 Q19.4 4.9 20.4 11.1 L18.6 11.6 L16.9 7.8 L16.9 18.4 '
  + 'C18.3 18.6 19 19.4 18.8 20.3 C18.6 21.1 17.8 21.4 16.7 21.4 L13.6 21.4 C13.1 21.4 12.8 21.1 12.8 20.6 '
  + 'L12.8 15 C12.8 14.4 12.5 14.1 12 14.1');
const PYJAMA = [{ d: PYJAMA_OUTLINE }, { d: 'M12 4.2 L12 12.6' }];
const PYJAMA_CHAUD = [...PYJAMA, ...pair('M8.8 8.8 L10.7 8.8'), ...pair('M8.8 11.4 L10.7 11.4'), ...pair('M8.6 16.6 L10.4 16.6')];

const PANTALON = [
  { d: sym('M12 3.4 L16.8 3.4 L17.8 20.4 L13.6 20.6 L12 9.6') },
  { d: 'M7.1 5.8 L16.9 5.8' },
];
const PANTALON_CHAUD = [...PANTALON, ...pair('M7.9 12 L10.5 12'), ...pair('M7.7 16 L10.2 16')];

const CHAUSSETTE = [
  { d: 'M9.4 3 L14.6 3 L14.6 12.8 C14.6 14 15.2 14.9 16.2 15.7 L18.8 17.8 C20.3 19 19.9 20.8 18.8 21.4 C17.8 22 16.8 21.6 16 21 L10.6 16.6 C9.8 15.9 9.4 15 9.4 13.8 Z' },
  { d: 'M9.4 5.8 L14.6 5.8' },
];
const CHAUSSETTE_CHAUDE = [...CHAUSSETTE, { d: 'M10.9 9.2 L13.1 9.2' }, { d: 'M10.9 12 L13.1 12' }];

const GILET_OUTLINE = sym('M12 10.4 L14.4 3.6 L17 4.6 Q19.6 5.9 20.6 12.6 L18.8 13.1 L17 8.9 L17 20.4 L12 20.4');
const GILET = [{ d: GILET_OUTLINE }, { d: 'M12 10.4 L12 20.4' }, dot(13.4, 13), dot(13.4, 16.6)];
const GILET_CHAUD = [{ d: GILET_OUTLINE }, { d: 'M12 10.4 L12 20.4' }, ...pair('M8.3 13 L10.6 13'), ...pair('M8.3 16.6 L10.6 16.6')];

const PULL = [
  { d: sym('M12 5.2 Q13.7 5.2 14.6 3.6 L17 4.6 Q19.6 5.9 20.6 12.6 L18.8 13.1 L17.2 9 L17.2 18.8 Q17.2 20.4 15.6 20.4 L12 20.4') },
  { d: 'M6.8 17.6 L17.2 17.6' },
  ...pair('M18.5 11.6 L20.4 11.1'),
];

const HAUT_ML = [{ d: sym('M12 4.8 Q13.5 4.8 14.3 3.3 L16.9 4.2 Q19.6 5.6 20.6 12.6 L18.8 13.1 L17 8.8 L17 20.2 L12 20.2') }];
const TSHIRT = [{ d: sym('M12 4.8 Q13.5 4.8 14.3 3.3 L16.9 4.2 L20.4 7.7 L18.8 9.7 L17 8.5 L17 20.2 L12 20.2') }];
const TUNIQUE = [{ d: sym('M12 4.6 Q13.5 4.6 14.3 3.2 L17.2 4.2 L20.6 8.6 L18.7 10.3 L17 8.9 L19.2 20.2 L12 20.2') }];
const TENUE_LEGERE = [
  { d: sym('M12 4.3 Q13.4 4.3 14.2 3 L16.8 3.9 L19.4 6.6 L17.9 8.2 L16.6 7.2 L16.6 11 L12 11') },
  { d: sym('M12 12.8 L16.6 12.8 L17.3 20.2 L13.4 20.6 L12 16.6') },
];

const COMBI_OUTLINE = sym('M12 2.4 C14.7 2.4 16.3 4.1 16.3 7.2 L16.8 8 Q19.8 9.3 20.6 15.6 L18.8 16.1 L17.1 12.4 L17.1 20.6 '
  + 'C17.1 21.1 16.8 21.4 16.3 21.4 L13.5 21.4 C13 21.4 12.8 21.1 12.8 20.6 L12.8 17.2 C12.8 16.6 12.5 16.3 12 16.3');
const VISAGE = 'M12 4.4 C13.5 4.4 14.3 5.3 14.3 6.7 C14.3 8.1 13.5 8.9 12 8.9 C10.5 8.9 9.7 8.1 9.7 6.7 C9.7 5.3 10.5 4.4 12 4.4 Z';
const COMBI = [{ d: COMBI_OUTLINE }, { d: VISAGE }, { d: 'M12 8.9 L12 15.2' }];
const COMBI_CHAUDE = [...COMBI, ...pair('M8.5 11.4 L10.6 11.4'), ...pair('M8.5 14 L10.6 14'), ...pair('M8.6 18.8 L10.5 18.8')];
// Doublée : un flocon en plus, pour le grand froid.
const FLOCON = [{ d: 'M19.8 1.6 L19.8 5.6' }, { d: 'M18.07 2.6 L21.53 4.6' }, { d: 'M18.07 4.6 L21.53 2.6' }];
const COMBI_DOUBLEE = [...COMBI_CHAUDE, ...FLOCON];

const MANTEAU_FORME = [
  { d: sym('M12 2.6 C14.6 2.6 16 4.2 16 7 L17.4 7.8 Q20 9.1 20.8 15.6 L19 16.1 L17.5 12.4 L18 21 L12 21') },
  { d: 'M9.6 7.6 C9.6 5.4 10.6 4.4 12 4.4 C13.4 4.4 14.4 5.4 14.4 7.6' },
  { d: 'M12 7.6 L12 21' },
];
const MANTEAU = [...MANTEAU_FORME, dot(13.4, 12.2), dot(13.4, 16.2)];
// Gouttes de pluie, en haut à droite.
const GOUTTES = [{ d: 'M20.6 1.6 L20 3.2' }, { d: 'M22.6 4.6 L22 6.2' }];
const IMPERMEABLE = [...MANTEAU, ...GOUTTES];
const CAPE_PLUIE = [
  { d: sym('M12 2.6 C14.5 2.6 15.8 4.2 15.8 6.6 L20.2 18.4 Q20.6 20.4 18.6 20.4 L12 20.4') },
  { d: 'M12 4.4 C13.3 4.4 14 5.3 14 6.6 C14 7.9 13.3 8.6 12 8.6 C10.7 8.6 10 7.9 10 6.6 C10 5.3 10.7 4.4 12 4.4 Z' },
  ...GOUTTES,
];
const MANTEAU_CHAUD = [...MANTEAU_FORME, ...pair('M8.4 11.4 L10.6 11.4'), ...pair('M8.2 14.8 L10.6 14.8'), ...pair('M8 18.2 L10.6 18.2')];

const COUVERTURE = [
  { d: 'M6 4 L18 4 Q20 4 20 6 L20 18 Q20 20 18 20 L6 20 Q4 20 4 18 L4 6 Q4 4 6 4 Z' },
  { d: 'M4 9.4 L20 9.4' },
  { d: 'M4 14.6 L20 14.6' },
  { d: 'M9.4 4 L9.4 20' },
  { d: 'M14.6 4 L14.6 20' },
];

const BONNET_FORME = sym('M12 6.6 C15.6 6.6 17.8 9.5 17.8 14 L18.4 14 Q19 14 19 14.6 L19 17.8 Q19 18.4 18.4 18.4 L12 18.4');
const BONNET_FIN = [{ d: BONNET_FORME }, { d: 'M5 14 L19 14' }];
const BONNET = [...BONNET_FIN, { c: [12, 4.6, 2] }, { d: 'M9 15.4 L9 17' }, { d: 'M12 15.4 L12 17' }, { d: 'M15 15.4 L15 17' }];

const MOUFLES = [
  { d: 'M9 21 L9 15.4 C7.4 14.6 5.6 13.2 5.3 11.6 C5 10 6.5 9.4 7.6 10.5 L9 11.9 L9 8.2 C9 5 11 3.4 13.2 3.4 '
    + 'C15.4 3.4 17.4 5 17.4 8.2 L17.4 21 Z' },
  { d: 'M9 18 L17.4 18' },
];

const CHAUSSONS = [
  { d: 'M6 4.6 L13.4 4.6 L13.4 11.4 C13.4 12.6 14.1 13.2 15.2 13.4 L17.4 13.8 C19.6 14.2 20.6 15.7 20.6 17.5 '
    + 'C20.6 19.5 19.4 20.6 17.4 20.6 L7.4 20.6 C6.6 20.6 6 20 6 19.2 Z' },
  { d: 'M6 7.6 L13.4 7.6' },
];

const CHAPEAU = [
  { d: 'M7.4 13.2 C7.4 7.8 9.4 5.6 12 5.6 C14.6 5.6 16.6 7.8 16.6 13.2' },
  { d: 'M2.6 14.4 Q12 10.2 21.4 14.4 Q12 18.6 2.6 14.4 Z' },
  { d: 'M7.6 10.6 Q12 11.8 16.4 10.6' },
];
const CHAPEAU_SOLEIL = [
  ...CHAPEAU,
  { c: [19.4, 4.4, 1.5] },
  { d: 'M19.4 1.4 L19.4 1.9' }, { d: 'M22.4 4.4 L21.9 4.4' }, { d: 'M16.4 4.4 L16.9 4.4' }, { d: 'M19.4 7.4 L19.4 6.9' },
];

const POUSSETTE = [
  { d: 'M4 10.6 L20 10.6 C20 14.4 17.6 16.6 14 16.6 L10 16.6 C6.4 16.6 4 14.4 4 10.6 Z' },
  { d: 'M4.4 10.6 C4.4 6.2 7.6 3.6 12 3.6 L12 10.6' },
  { d: 'M20 10.6 L20.8 5.6 L22 5.6' },
  { c: [7.6, 19.4, 1.6] },
  { c: [16.4, 19.4, 1.6] },
];
const CHANCELIERE = [...POUSSETTE, { d: 'M7 13.2 L17 13.2' }];
const HABILLAGE_PLUIE = [...POUSSETTE, { d: 'M15 3.2 L14.4 4.8' }, { d: 'M18 3.2 L17.4 4.8' }, { d: 'M16.5 6 L15.9 7.6' }];

const GIGOTEUSE_OUTLINE = sym('M12 5.2 Q13.5 5.2 14.2 3.6 L15.8 3.6 Q16 6.4 17.8 7.6 Q18.7 13.4 18.4 18.2 Q18.2 21.2 15.4 21.2 L12 21.2');
const GIGOTEUSE = [{ d: GIGOTEUSE_OUTLINE }, { d: 'M12 5.2 L12 18.4' }];
const GIGOTEUSE_CHAUDE = [...GIGOTEUSE, ...pair('M8.4 10.6 L10.6 10.6'), ...pair('M8 14 L10.6 14'), ...pair('M8.2 17.4 L10.6 17.4')];

const LUNETTES = [
  ...pair('M3.4 9.4 L10.4 9.4 L10 13.4 C9.7 15.4 8.6 16 7 16 C5.4 16 4.1 15.4 3.8 13.4 Z').map((p) => ({ ...p, fill: true })),
  { d: 'M10.4 10.2 Q12 9 13.6 10.2' },
  ...pair('M3.4 9.4 L2.2 8.4'),
];

const CREME = [
  { d: 'M8 3.4 L16 3.4 L15 15.4 L13.8 15.4 L13.8 17.6 L14.6 17.6 L14.6 20.6 L9.4 20.6 L9.4 17.6 L10.2 17.6 L10.2 15.4 L9 15.4 Z' },
  { c: [12, 8.4, 1.8] },
];

export const DRAWINGS = {
  body_mc: BODY_MC,
  body_ml: BODY_ML,
  body_sans_manches: BODY_SANS_MANCHES,
  couche: COUCHE,
  tunique: TUNIQUE,
  tenue_legere: TENUE_LEGERE,
  haut_ml: HAUT_ML,
  tshirt: TSHIRT,
  pyjama: PYJAMA,
  pyjama_chaud: PYJAMA_CHAUD,
  pantalon: PANTALON,
  pantalon_chaud: PANTALON_CHAUD,
  chaussettes: CHAUSSETTE,
  chaussettes_chaudes: CHAUSSETTE_CHAUDE,
  gilet: GILET,
  gilet_chaud: GILET_CHAUD,
  pull: PULL,
  combi: COMBI,
  combi_chaude: COMBI_CHAUDE,
  combi_doublee: COMBI_DOUBLEE,
  manteau: MANTEAU,
  manteau_chaud: MANTEAU_CHAUD,
  impermeable: IMPERMEABLE,
  cape_pluie: CAPE_PLUIE,
  couverture: COUVERTURE,
  bonnet_fin: BONNET_FIN,
  bonnet: BONNET,
  moufles: MOUFLES,
  chaussons: CHAUSSONS,
  chapeau: CHAPEAU,
  chapeau_soleil: CHAPEAU_SOLEIL,
  chanceliere: CHANCELIERE,
  habillage_pluie: HABILLAGE_PLUIE,
  gigoteuse: GIGOTEUSE,
  gigoteuse_chaude: GIGOTEUSE_CHAUDE,
  lunettes: LUNETTES,
  creme: CREME,
};

// Vêtement de la tenue → dessin. Les variantes chaudes portent des piqûres de doudoune.
export const ITEM_DRAWINGS = {
  couche: 'couche',
  body_leger: 'body_sans_manches',
  body_mc: 'body_mc',
  body_ml: 'body_ml',
  tenue_ample_claire: 'tunique',
  tenue_legere: 'tenue_legere',
  pyjama_leger: 'pyjama',
  pyjama: 'pyjama',
  pyjama_chaud: 'pyjama_chaud',
  pantalon_leger: 'pantalon',
  pantalon: 'pantalon',
  pantalon_chaud: 'pantalon_chaud',
  chaussettes: 'chaussettes',
  chaussettes_chaudes: 'chaussettes_chaudes',
  gilet_fin: 'gilet',
  gilet: 'gilet',
  gilet_chaud: 'gilet_chaud',
  pull: 'pull',
  combi_legere: 'combi',
  combi_pilote: 'combi_chaude',
  combi_pilote_doublee: 'combi_doublee',
  couverture_portage: 'couverture',
  manteau_portage: 'manteau',
  couverture_harnais: 'couverture',
  // Enfants de 2 ans et plus.
  tshirt: 'tshirt',
  haut_ml: 'haut_ml',
  veste: 'manteau',
  manteau_chaud: 'manteau_chaud',
  combi_ski: 'combi_doublee',
  // Protection contre la pluie, selon le mode de sortie.
  habillage_pluie: 'habillage_pluie',
  cape_pluie: 'cape_pluie',
  impermeable: 'impermeable',
  capuche: 'impermeable',
  bonnet_fin: 'bonnet_fin',
  bonnet: 'bonnet',
  moufles: 'moufles',
  chaussons: 'chaussons',
  chapeau: 'chapeau',
  chapeau_si_soleil: 'chapeau_soleil',
  chanceliere: 'chanceliere',
};

// Achat à prévoir → dessin.
export const CATEGORY_DRAWINGS = {
  gigoteuse_hiver: 'gigoteuse_chaude',
  gigoteuse_ete: 'gigoteuse',
  combi_pilote: 'combi_chaude',
  manteau_hiver: 'manteau_chaud',
  accessoires_hiver: 'bonnet',
  chanceliere: 'chanceliere',
  habillage_pluie: 'habillage_pluie',
  chapeau_soleil: 'chapeau',
  vetements_longs_legers: 'haut_ml',
  lunettes_soleil: 'lunettes',
  creme_solaire_enfant: 'creme',
};

// Dessin au format SVG (app web).
export function drawingSvg(id, { size = 32, label = '' } = {}) {
  const parts = DRAWINGS[id];
  if (!parts) return '';
  const body = parts.map((p) => (p.c
    ? `<circle cx="${p.c[0]}" cy="${p.c[1]}" r="${p.c[2]}"${p.fill ? ' fill="currentColor" stroke="none"' : ''}/>`
    : `<path d="${p.d}"${p.fill ? ' fill="currentColor"' : ''}/>`)).join('');
  const a11y = label ? ` role="img" aria-label="${label.replace(/"/g, '&quot;')}"` : ' aria-hidden="true"';
  return `<svg class="drawing" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" `
    + `stroke-width="${DRAWING_STROKE}" stroke-linecap="round" stroke-linejoin="round"${a11y}>${body}</svg>`;
}
