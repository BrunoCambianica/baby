// Stockage local : les réglages et l'historique restent sur le téléphone.
const KEYS = {
  profile: 'sb.profil',
  forecast: 'sb.meteo',
  climate: 'sb.normales',
  feedback: 'sb.retours',
  days: 'sb.jours',
  hidden: 'sb.masques',
  widget: 'sb.widget',
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    return false;
  }
}

export const store = {
  profile: () => read(KEYS.profile, null),
  saveProfile: (profile) => write(KEYS.profile, profile),
  forecast: () => read(KEYS.forecast, null),
  saveForecast: (entry) => write(KEYS.forecast, entry),
  climate: () => read(KEYS.climate, null),
  saveClimate: (entry) => write(KEYS.climate, entry),
  feedback: () => read(KEYS.feedback, []),
  addFeedback: (entry) => write(KEYS.feedback, [...read(KEYS.feedback, []), entry].slice(-200)),
  days: () => read(KEYS.days, []),
  markDay(date) {
    const days = read(KEYS.days, []);
    if (!days.includes(date)) write(KEYS.days, [...days, date].slice(-180));
  },
  hidden: () => read(KEYS.hidden, []),
  hide: (key) => write(KEYS.hidden, [...new Set([...read(KEYS.hidden, []), key])]),
  widgetCopied: () => read(KEYS.widget, null),
  markWidgetCopied: () => write(KEYS.widget, { at: Date.now() }),
  clear() {
    for (const key of Object.values(KEYS)) {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        // Stockage indisponible : rien à effacer.
      }
    }
  },
};
