// Icônes Tabler (https://tabler.io/icons), licence MIT, © 2020-2024 Paweł Kuna.
// Tracés repris de @tabler/icons 3.19.0 ; dessinées en trait par icon().
const PATHS = {
  // Météo : chaque partie porte une classe (w-sun, w-cloud, w-rain…) ; dessinée par icon(…, { wx: true }), elle prend sa couleur
  // (soleil doré, nuage plein, gouttes bleues : voir « Pictogrammes météo » dans style.css), ailleurs elle reste au trait, d'une couleur.
  // Soleil, lune et nuage seul viennent de Tabler ; les nuages à pluie, neige, brouillard, orage et les éclaircies sont redessinés
  // dans le même trait, le nuage fermé et remonté pour que ce qui tombe se lise dessous.
  sun: '<path class="w-sun w-body" d="M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0"/><path class="w-sun" d="M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7"/>',
  moon: '<path class="w-moon w-body" d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z"/>',
  moonStars: '<path class="w-moon w-body" d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z"/><path class="w-moon w-body" d="M17 4a2 2 0 0 0 2 2a2 2 0 0 0 -2 2a2 2 0 0 0 -2 -2a2 2 0 0 0 2 -2"/><path class="w-moon" d="M19 11h2m-1 -1v2"/>',
  cloud: '<path class="w-cloud w-body" d="M6.657 18c-2.572 0 -4.657 -2.007 -4.657 -4.483c0 -2.475 2.085 -4.482 4.657 -4.482c.393 -1.762 1.794 -3.2 3.675 -3.773c1.88 -.572 3.956 -.193 5.444 1c1.488 1.19 2.162 3.007 1.77 4.769h.99c1.913 0 3.464 1.56 3.464 3.486c0 1.927 -1.551 3.487 -3.465 3.487h-11.878"/>',
  partlyCloudy: '<path class="w-sun w-body" d="M16 9.5m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/><path class="w-sun" d="M16 3.3v1m6.2 5.2h-1m-.82 -4.38l-.7 .7m-8.06 -.7l.7 .7"/><path class="w-cloud w-body" d="M6 21a4.15 3.97 0 0 1 0 -8.1a4.5 4.05 0 0 1 9.9 1.8h.9a3.15 3.15 0 0 1 0 6.3z"/>',
  partlyCloudyNight: '<path class="w-moon w-body" d="M16.5 3.6h.17a3.15 3.15 0 0 0 3.33 5.23a3.78 3.78 0 1 1 -3.5 -5.23z"/><path class="w-cloud w-body" d="M6 21a4.15 3.97 0 0 1 0 -8.1a4.5 4.05 0 0 1 9.9 1.8h.9a3.15 3.15 0 0 1 0 6.3z"/>',
  rain: '<path class="w-cloud w-body" d="M7.3 14.5a3.9 3.74 0 0 1 0 -7.65a4.25 3.83 0 0 1 9.35 1.7h.85a2.975 2.975 0 0 1 0 5.95z"/><path class="w-rain" d="M8.5 17.5l-1 3m5.5 -3l-1 3m5.5 -3l-1 3"/>',
  snow: '<path class="w-cloud w-body" d="M7.3 14.5a3.9 3.74 0 0 1 0 -7.65a4.25 3.83 0 0 1 9.35 1.7h.85a2.975 2.975 0 0 1 0 5.95z"/><path class="w-snow" d="M8 18v.01m4 -.01v.01m4 -.01v.01m-6 3.19v.01m4 -.01v.01"/>',
  fog: '<path class="w-cloud w-body" d="M7.3 14.5a3.9 3.74 0 0 1 0 -7.65a4.25 3.83 0 0 1 9.35 1.7h.85a2.975 2.975 0 0 1 0 5.95z"/><path class="w-fog" d="M5 18h14m-11 3h8"/>',
  storm: '<path class="w-cloud w-body" d="M7.3 14.5a3.9 3.74 0 0 1 0 -7.65a4.25 3.83 0 0 1 9.35 1.7h.85a2.975 2.975 0 0 1 0 5.95z"/><path class="w-bolt" d="M13 13l-2.5 4h3.5l-2.5 4.5"/>',
  wind: '<path d="M5 8h8.5a2.5 2.5 0 1 0 -2.34 -3.24"/><path d="M3 12h15.5a2.5 2.5 0 1 1 -2.34 3.24"/><path d="M4 16h5.5a2.5 2.5 0 1 1 -2.34 3.24"/>',
  droplet: '<path d="M7.502 19.423c2.602 2.105 6.395 2.105 8.996 0c2.602 -2.105 3.262 -5.708 1.566 -8.546l-4.89 -7.26c-.42 -.625 -1.287 -.803 -1.936 -.397a1.376 1.376 0 0 0 -.41 .397l-4.893 7.26c-1.695 2.838 -1.035 6.441 1.567 8.546z"/>',
  umbrella: '<path d="M4 12a8 8 0 0 1 16 0z"/><path d="M12 12v6a2 2 0 0 0 4 0"/>',
  temperature: '<path d="M10 13.5a4 4 0 1 0 4 0v-8.5a2 2 0 0 0 -4 0v8.5"/><path d="M10 9l4 0"/>',
  stroller: '<path d="M8 19m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M18 19m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M2 5h2.5l1.632 4.897a6 6 0 0 0 5.693 4.103h2.675a5.5 5.5 0 0 0 0 -11h-.5v6"/><path d="M6 9h14"/><path d="M9 17l1 -3"/><path d="M16 14l1 3"/>',
  carrier: '<path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0"/><path d="M6 21v-2a4 4 0 0 1 4 -4h.5"/><path d="M18 22l3.35 -3.284a2.143 2.143 0 0 0 .005 -3.071a2.242 2.242 0 0 0 -3.129 -.006l-.224 .22l-.223 -.22a2.242 2.242 0 0 0 -3.128 -.006a2.143 2.143 0 0 0 -.006 3.071l3.355 3.296z"/>',
  car: '<path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M5 17h-2v-6l2 -5h9l4 5h1a2 2 0 0 1 2 2v4h-2m-4 0h-6m-6 -6h15m-6 0v-5"/>',
  home: '<path d="M5 12l-2 0l9 -9l9 9l-2 0"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7"/><path d="M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6"/>',
  walk: '<path d="M13 4m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/><path d="M7 21l3 -4"/><path d="M16 21l-2 -4l-3 -3l1 -6"/><path d="M6 12l2 -3l4 -1l3 3l3 1"/>',
  userPlus: '<path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0"/><path d="M16 19h6"/><path d="M19 16v6"/><path d="M6 21v-2a4 4 0 0 1 4 -4h4"/>',
  bag: '<path d="M6.331 8h11.339a2 2 0 0 1 1.977 2.304l-1.255 8.152a3 3 0 0 1 -2.966 2.544h-6.852a3 3 0 0 1 -2.965 -2.544l-1.255 -8.152a2 2 0 0 1 1.977 -2.304z"/><path d="M9 11v-5a3 3 0 0 1 6 0v5"/>',
  settings: '<path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z"/><path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"/>',
  chevronRight: '<path d="M9 6l6 6l-6 6"/>',
  chevronLeft: '<path d="M15 6l-6 6l6 6"/>',
  check: '<path d="M5 12l5 5l10 -10"/>',
  x: '<path d="M18 6l-12 12"/><path d="M6 6l12 12"/>',
  plus: '<path d="M12 5l0 14"/><path d="M5 12l14 0"/>',
  minus: '<path d="M5 12l14 0"/>',
  shield: '<path d="M11.46 20.846a12 12 0 0 1 -7.96 -14.846a12 12 0 0 0 8.5 -3a12 12 0 0 0 8.5 3a12 12 0 0 1 -.09 7.06"/><path d="M15 19l2 2l4 -4"/>',
  share: '<path d="M6 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/><path d="M18 6m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/><path d="M18 18m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/><path d="M8.7 10.7l6.6 -3.4"/><path d="M8.7 13.3l6.6 3.4"/>',
  pin: '<path d="M9 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"/><path d="M17.657 16.657l-4.243 4.243a2 2 0 0 1 -2.827 0l-4.244 -4.243a8 8 0 1 1 11.314 0z"/>',
  info: '<path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"/><path d="M12 9h.01"/><path d="M11 12h1v4h1"/>',
  download: '<path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2"/><path d="M7 11l5 5l5 -5"/><path d="M12 4l0 12"/>',
  phone: '<path d="M6 5a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2v-14z"/><path d="M11 4h2"/><path d="M12 17v.01"/>',
  refresh: '<path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4"/><path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4"/>',
  shirt: '<path d="M15 4l6 2v5h-3v8a1 1 0 0 1 -1 1h-10a1 1 0 0 1 -1 -1v-8h-3v-5l6 -2a3 3 0 0 0 6 0"/>',
  hanger: '<path d="M14 6a2 2 0 1 0 -4 0c0 1.667 .67 3 2 4h-.008l7.971 4.428a2 2 0 0 1 1.029 1.749v.823a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-.823a2 2 0 0 1 1.029 -1.749l7.971 -4.428"/>',
  bed: '<path d="M7 9m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M22 17v-3h-20"/><path d="M2 8v9"/><path d="M12 14h10v-2a3 3 0 0 0 -3 -3h-7v5z"/>',
  sunglasses: '<path d="M8 4h-2l-3 10"/><path d="M16 4h2l3 10"/><path d="M10 16h4"/><path d="M21 16.5a3.5 3.5 0 0 1 -7 0v-2.5h7v2.5"/><path d="M10 16.5a3.5 3.5 0 0 1 -7 0v-2.5h7v2.5"/><path d="M4 14l4.5 4.5"/><path d="M15 14l4.5 4.5"/>',
  sparkles: '<path d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6z"/>',
  clock: '<path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"/><path d="M12 7v5l3 3"/>',
  leaf: '<path d="M5 21c.5 -4.5 2.5 -8 7 -10"/><path d="M9 18c6.218 0 10.5 -3.288 11 -12v-2h-4.014c-9 0 -11.986 4 -12 9c0 1 0 3 2 5h3z"/>',
  users: '<path d="M9 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0"/><path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0 -3 -3.85"/>',
  send: '<path d="M10 14l11 -11"/><path d="M21 3l-6.5 18a.55 .55 0 0 1 -1 0l-3.5 -7l-7 -3.5a.55 .55 0 0 1 0 -1l18 -6.5"/>',
};

// `wx` : pictogramme météo en couleurs (les classes w-* des tracés prennent les teintes du conteneur).
export function icon(name, { size = 24, stroke = 1.8, label = '', wx = false } = {}) {
  const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"';
  return `<svg class="ico${wx ? ' wx' : ''}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" ${a11y}>${PATHS[name] ?? ''}</svg>`;
}

// Pictogramme météo à partir du code WMO d'Open-Meteo (repli sur la pluie si le code manque).
export function weatherIcon(code, { night = false, precipProb = 0 } = {}) {
  if (code == null) return precipProb >= 50 ? 'rain' : night ? 'moon' : 'sun';
  if (code <= 1) return night ? 'moon' : 'sun';
  if (code === 2) return night ? 'partlyCloudyNight' : 'partlyCloudy';
  if (code === 3) return 'cloud';
  if (code === 45 || code === 48) return 'fog';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'storm';
  return 'rain';
}

// Le ciel en un ou deux mots, pour le lire sans déchiffrer le pictogramme (codes WMO d'Open-Meteo).
export function weatherWord(code, { night = false, precipProb = 0 } = {}) {
  if (code == null) return precipProb >= 50 ? 'Pluie' : '';
  if (code === 0) return night ? 'Ciel dégagé' : 'Ensoleillé';
  if (code === 1) return 'Peu nuageux';
  if (code === 2) return night ? 'Nuages épars' : 'Éclaircies';
  if (code === 3) return 'Couvert';
  if (code === 45 || code === 48) return 'Brouillard';
  if (code >= 51 && code <= 57) return 'Bruine';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'Neige';
  if (code >= 80 && code <= 82) return 'Averses';
  if (code >= 95) return 'Orage';
  return 'Pluie';
}
