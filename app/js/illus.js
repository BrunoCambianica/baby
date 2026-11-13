// Illustrations de l'app, dessinées dans le code (aucune image) : le ciel en volumes doux, par dégradés, et les vêtements
// en deux tons à partir des tracés du moteur (engine/drawings.js, partagé avec les widgets : lu ici, jamais modifié).
// Les dégradés sont posés une fois dans la page (ensureDefs) et repris par identifiant.
import { DRAWINGS } from '../../engine/drawings.js';

// Une teinte par famille de vêtements : [haut de l'aplat, bas de l'aplat, trait]. Elle aide à reconnaître la pièce sans lire.
const FAMILIES = {
  dessous: ['#ffe9d6', '#ffc7a0', '#bf6428'],
  nuit: ['#efe9ff', '#cfc0f8', '#6450b4'],
  bas: ['#e2eefc', '#abcdf1', '#3a6fb0'],
  pieds: ['#ffe0da', '#ffa497', '#c9463a'],
  mailles: ['#ffeaee', '#f9c2ce', '#bd4f6d'],
  dehors: ['#e9e8f2', '#bbb8d4', '#57527f'],
  tete: ['#ece2fa', '#bda1e8', '#583796'],
  pluie: ['#dff4f1', '#9ddbd3', '#1f7d75'],
  soleil: ['#fff4cf', '#ffd978', '#a87200'],
};

const FAMILY_OF = {
  body_mc: 'dessous', body_ml: 'dessous', body_sans_manches: 'dessous', couche: 'dessous', tunique: 'dessous',
  tenue_legere: 'dessous', haut_ml: 'dessous', tshirt: 'dessous',
  pyjama: 'nuit', pyjama_chaud: 'nuit', gigoteuse: 'nuit', gigoteuse_chaude: 'nuit',
  pantalon: 'bas', pantalon_chaud: 'bas',
  chaussettes: 'pieds', chaussettes_chaudes: 'pieds', chaussons: 'pieds',
  gilet: 'mailles', gilet_chaud: 'mailles', pull: 'mailles',
  combi: 'dehors', combi_chaude: 'dehors', combi_doublee: 'dehors', manteau: 'dehors', manteau_chaud: 'dehors',
  couverture: 'dehors', chanceliere: 'dehors',
  bonnet_fin: 'tete', bonnet: 'tete', moufles: 'tete',
  impermeable: 'pluie', parapluie: 'pluie', habillage_pluie: 'pluie',
  chapeau: 'soleil', chapeau_soleil: 'soleil', ombrelle: 'soleil', lunettes: 'soleil', creme: 'soleil',
};

// Un vêtement en deux tons : les formes fermées prennent l'aplat de leur famille, tout le reste le trait.
export function garment(id, { size = 40, label = '' } = {}) {
  const parts = DRAWINGS[id];
  if (!parts) return '';
  const family = FAMILY_OF[id] ?? 'dehors';
  const ink = FAMILIES[family][2];
  const fill = `url(#sbx-g-${family})`;
  const body = parts.map((p) => {
    if (p.c) return `<circle cx="${p.c[0]}" cy="${p.c[1]}" r="${p.c[2]}" fill="${p.fill ? ink : fill}"${p.fill ? ' stroke="none"' : ''}/>`;
    const closed = /z\s*$/i.test(p.d);
    return `<path d="${p.d}" fill="${p.fill ? ink : closed ? fill : 'none'}"/>`;
  }).join('');
  const a11y = label ? ` role="img" aria-label="${label.replace(/"/g, '&quot;')}"` : ' aria-hidden="true"';
  return `<svg class="drawing garment" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${ink}" `
    + `stroke-width="${size >= 56 ? 1.15 : 1.35}" stroke-linecap="round" stroke-linejoin="round"${a11y}>${body}</svg>`;
}

// Un nuage modelé : une silhouette (trois bosses et un socle) en dégradé vertical, un reflet par bosse, une ombre au pied.
function cloud(tone, x, y, scale) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <g fill="url(#sbx-c-${tone})"><circle cx="38" cy="46" r="24"/><circle cx="66" cy="34" r="30"/><circle cx="92" cy="48" r="22"/><rect x="20" y="44" width="92" height="28" rx="14"/></g>
    <ellipse cx="66" cy="63" rx="40" ry="8" fill="url(#sbx-shade)"/>
    <circle cx="33" cy="40" r="15" fill="url(#sbx-hi)"/><circle cx="59" cy="25" r="20" fill="url(#sbx-hi)"/><circle cx="88" cy="42" r="13" fill="url(#sbx-hi)"/>
  </g>`;
}
const drop = (x, y, s = 1) => `<path transform="translate(${x} ${y}) rotate(14) scale(${s})" d="M0 -10 C4.4 -3.4 6.4 0 6.4 3.6 A6.4 6.4 0 0 1 -6.4 3.6 C-6.4 0 -4.4 -3.4 0 -10 Z" fill="url(#sbx-drop)"/>`;
const flake = (x, y, r = 5.5) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#sbx-snow)"/>`;
const sun = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r * 1.75}" fill="url(#sbx-glow)"/><circle cx="${x}" cy="${y}" r="${r}" fill="url(#sbx-sun)"/>`;
const moon = (x, y, s) => `<path transform="translate(${x} ${y}) scale(${s})" d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z" fill="url(#sbx-moon)"/>`;
const star = (x, y, s = 1) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -6 C.8 -1.6 1.6 -.8 6 0 C1.6 .8 .8 1.6 0 6 C-.8 1.6 -1.6 .8 -6 0 C-1.6 -.8 -.8 -1.6 0 -6 Z" fill="#ffe7a3"/>`;

// Le ciel, sur une toile de 200 × 150. Les noms sont ceux de weatherIcon() (icons.js).
const SKIES = {
  sun: () => sun(100, 70, 40),
  moon: () => `${moon(46, 14, 5)}${star(58, 34, 1.3)}${star(150, 30, 1)}${star(160, 104, 1.5)}`,
  partlyCloudy: () => `${sun(134, 50, 31)}${cloud('light', 18, 36, 1.28)}`,
  partlyCloudyNight: () => `${moon(96, 4, 3.6)}${star(70, 22, 1.1)}${cloud('mid', 18, 40, 1.24)}`,
  cloud: () => `${cloud('mid', 74, 8, 0.86)}${cloud('light', 14, 34, 1.3)}`,
  fog: () => `${cloud('mid', 22, 6, 1.24)}<g fill="#c3ccdb"><rect x="34" y="104" width="132" height="10" rx="5" opacity=".9"/><rect x="56" y="122" width="96" height="10" rx="5" opacity=".6"/></g>`,
  rain: () => `${cloud('dark', 20, 2, 1.28)}${drop(74, 112, 1.05)}${drop(104, 128, 1.15)}${drop(132, 114, 1)}`,
  snow: () => `${cloud('mid', 20, 2, 1.28)}${flake(72, 112)}${flake(102, 126, 6.5)}${flake(132, 112)}${flake(88, 138, 4.5)}`,
  storm: () => `${cloud('dark', 20, 2, 1.28)}<path transform="translate(92 92)" d="M10 0 L-6 24 H5 L-2 46 L18 17 H7 L14 0 Z" fill="url(#sbx-bolt)"/>${drop(66, 112, 0.95)}${drop(138, 114, 0.95)}`,
};

export function skyArt(name, { size = 0 } = {}) {
  const dims = size ? ` width="${Math.round(size * 4 / 3)}" height="${size}"` : '';
  return `<svg class="art"${dims} viewBox="0 0 200 150" aria-hidden="true">${(SKIES[name] ?? SKIES.cloud)()}</svg>`;
}

const stops = (list) => list.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a == null ? '' : ` stop-opacity="${a}"`}/>`).join('');
const vertical = (id, list) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="4" x2="0" y2="72">${stops(list)}</linearGradient>`;
const ball = (id, list) => `<radialGradient id="${id}" cx=".36" cy=".3" r=".8">${stops(list)}</radialGradient>`;

function ensureDefs() {
  if (typeof document === 'undefined' || document.getElementById('sbx-defs')) return;
  const families = Object.entries(FAMILIES)
    .map(([k, [a, b]]) => `<linearGradient id="sbx-g-${k}" x1="0" y1="0" x2="0" y2="1">${stops([[0, a], [1, b]])}</linearGradient>`).join('');
  const html = `<svg id="sbx-defs" width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute"><defs>${families}
    ${vertical('sbx-c-dark', [[0, '#a3aec6'], [0.5, '#727e9b'], [1, '#4d5876']])}
    ${vertical('sbx-c-mid', [[0, '#f2f5fa'], [0.55, '#d6dde9'], [1, '#a7b2c7']])}
    ${vertical('sbx-c-light', [[0, '#ffffff'], [0.6, '#f1f5fb'], [1, '#cdd7e7']])}
    <radialGradient id="sbx-hi" cx=".4" cy=".36" r=".62">${stops([[0, '#ffffff', 0.62], [1, '#ffffff', 0]])}</radialGradient>
    <radialGradient id="sbx-shade" cx=".5" cy=".5" r=".5">${stops([[0, '#1d2540', 0.26], [1, '#1d2540', 0]])}</radialGradient>
    ${ball('sbx-sun', [[0, '#fff2ae'], [0.55, '#ffc940'], [1, '#f4971a']])}
    <radialGradient id="sbx-glow" cx=".5" cy=".5" r=".5">${stops([[0.45, '#ffc44d', 0.42], [1, '#ffc44d', 0]])}</radialGradient>
    ${ball('sbx-moon', [[0, '#fff8d9'], [0.6, '#f7da85'], [1, '#dfae49']])}
    ${ball('sbx-snow', [[0, '#ffffff'], [0.7, '#eaf2fc'], [1, '#bcd2ee']])}
    <linearGradient id="sbx-drop" x1="0" y1="0" x2="0" y2="1">${stops([[0, '#a5d9ff'], [1, '#3586e2']])}</linearGradient>
    <linearGradient id="sbx-bolt" x1="0" y1="0" x2="0" y2="1">${stops([[0, '#ffe680'], [1, '#ffab1a']])}</linearGradient>
  </defs></svg>`;
  document.body.insertAdjacentHTML('beforeend', html);
}
ensureDefs();
