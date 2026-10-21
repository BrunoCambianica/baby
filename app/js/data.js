// Accès aux données : règles (servies avec l'app), communes (geo.api.gouv.fr) et météo (Open-Meteo).
import { climateUrls, forecastUrl } from '../../engine/adapter.js';
import { store } from './storage.js';

const FORECAST_TTL_MS = 30 * 60 * 1000;
const GEO = 'https://geo.api.gouv.fr/communes';
const GEO_FIELDS = 'fields=nom,code,codeDepartement,centre,codesPostaux,population';

async function getJSON(url, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function loadBundle() {
  const [rules, messages, sources] = await Promise.all(
    ['rules', 'messages.fr', 'sources'].map((name) => getJSON(`../rules/v0/${name}.json`)),
  );
  return { rules, messages, sources };
}

const toCommune = (c) => ({
  nom: c.nom,
  code: c.code,
  dep: c.codeDepartement,
  cp: c.codesPostaux?.[0] ?? '',
  lat: c.centre.coordinates[1],
  lon: c.centre.coordinates[0],
});

export async function searchCommunes(query) {
  const q = query.trim();
  if (q.length < 2) return [];
  const url = /^\d{5}$/.test(q)
    ? `${GEO}?codePostal=${q}&${GEO_FIELDS}`
    : `${GEO}?nom=${encodeURIComponent(q)}&${GEO_FIELDS}&boost=population&limit=6`;
  const list = await getJSON(url);
  return list.filter((c) => c.centre).map(toCommune);
}

// La position est arrondie à environ 1 km avant d'être envoyée ; seule la commune est gardée.
export async function communeAt(lat, lon) {
  const list = await getJSON(`${GEO}?lat=${lat.toFixed(2)}&lon=${lon.toFixed(2)}&${GEO_FIELDS}`);
  return list.filter((c) => c.centre).map(toCommune)[0] ?? null;
}

export async function getForecast(commune, { force = false } = {}) {
  const cached = store.forecast();
  const same = cached && cached.code === commune.code;
  if (same && !force && Date.now() - cached.at < FORECAST_TTL_MS) return { ...cached, offline: false };
  try {
    const data = await getJSON(forecastUrl(commune));
    if (!data?.hourly?.time) throw new Error('Réponse météo incomplète');
    const entry = { code: commune.code, at: Date.now(), data };
    store.saveForecast(entry);
    return { ...entry, offline: false };
  } catch (e) {
    if (same) return { ...cached, offline: true };
    throw e;
  }
}

// Normales récentes (trois années passées) pour les achats à prévoir au-delà de 16 jours.
export async function getClimate(commune, date) {
  const cached = store.climate();
  if (cached && cached.code === commune.code && cached.date === date) return cached.years;
  const settled = await Promise.allSettled(climateUrls(commune, date).map((url) => getJSON(url)));
  const years = settled.filter((r) => r.status === 'fulfilled' && r.value?.daily).map((r) => r.value);
  if (years.length) store.saveClimate({ code: commune.code, date, at: Date.now(), years });
  return years.length ? years : cached?.code === commune.code ? cached.years : [];
}

export const loadText = (url) => fetch(url).then((res) => {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
});
