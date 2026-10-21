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

export const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];
