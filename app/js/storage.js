// Stockage local : les réglages et l'historique restent sur le téléphone.
const KEYS = {
  // Le foyer (voir household.js) ; « sb.enfant » : l'enfant affiché sur ce téléphone.
  profile: 'sb.profil',
  child: 'sb.enfant',
  forecast: 'sb.meteo',
  climate: 'sb.normales',
  days: 'sb.jours',
  hidden: 'sb.masques',
  widget: 'sb.widget',
  promo: 'sb.promo',
  // Rappel du soir, propre à ce téléphone : { on, at: 'HH:MM' }.
  reminder: 'sb.rappel',
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
  days: () => read(KEYS.days, []),
  markDay(date) {
    const days = read(KEYS.days, []);
    if (!days.includes(date)) write(KEYS.days, [...days, date].slice(-180));
  },
  currentChild: () => read(KEYS.child, null),
  setCurrentChild: (id) => write(KEYS.child, id),
  // Suggestions d'achat masquées, par enfant : « identifiant|catégorie:taille ».
  hidden: () => read(KEYS.hidden, []),
  hide: (key) => write(KEYS.hidden, [...new Set([...read(KEYS.hidden, []), key])]),
  // Les suggestions masquées avant la 0.6 (un seul enfant) reviennent au premier enfant.
  adoptHidden: (childId) => write(KEYS.hidden, read(KEYS.hidden, []).map((key) => (key.includes('|') ? key : `${childId}|${key}`))),
  widgetCopied: () => read(KEYS.widget, null),
  markWidgetCopied: () => write(KEYS.widget, { at: Date.now() }),
  reminder: () => read(KEYS.reminder, { on: false, at: '20:00' }),
  saveReminder: (value) => write(KEYS.reminder, value),
  promoHidden: () => read(KEYS.promo, false),
  hidePromo: () => write(KEYS.promo, true),
  clear() {
    for (const key of [...Object.values(KEYS), 'sb.retours']) {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        // Stockage indisponible : rien à effacer.
      }
    }
  },
};
