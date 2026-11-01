// Mise en forme à la française et échappement HTML.
export const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const atNoon = (iso) => new Date(`${iso}T12:00:00Z`);
const longDay = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const shortDay = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });

export const dayLong = (iso) => longDay.format(atNoon(iso));
export const dayShort = (iso) => shortDay.format(atNoon(iso));

export function hourLabel(hhmm) {
  const h = Number(hhmm.slice(0, 2));
  const m = hhmm.slice(3, 5);
  return m === '00' ? `${h} h` : `${h} h ${m}`;
}

export const degrees = (x) => `${Math.round(x)} °C`;
export const decimal = (x, digits = 1) => Number(x).toFixed(digits).replace('.', ',');
export const signed = (n) => (n > 0 ? `+${n}` : String(n));

// Page du guide public pour un ressenti (tranches des règles, de la plus chaude à la plus froide) :
// « guide/dehors/3-a-8-degres/ ». Même découpage que tools/build-guide.js ; tools/test-guide.js vérifie que la page existe.
export function guideBandPath(bands, feels) {
  if (typeof feels !== 'number') return null;
  const i = bands.findIndex((b) => b.min_feels_c === null || feels >= b.min_feels_c);
  if (i < 0) return null;
  const lo = bands[i].min_feels_c;
  const hi = i === 0 ? null : bands[i - 1].min_feels_c - 1;
  return `guide/dehors/${lo === null ? `${hi}-degres-et-moins` : hi === null ? `${lo}-degres-et-plus` : `${lo}-a-${hi}-degres`}/`;
}

export const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];
