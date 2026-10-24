// La famille entre parents, sans compte, et l'API Superbébé (sur le VPS) qui la garde chiffrée.
// Un secret de 32 octets, transmis dans le lien de famille (après le #), donne l'identifiant, le jeton d'accès
// et la clé de chiffrement : le serveur ne voit qu'un bloc chiffré, jamais un prénom.
// Sans adresse d'API (API_BASE vide), rien de tout cela n'est proposé : l'app reste entièrement locale.

// Adresse de l'API, avec la barre finale ; « sb.api » (stockage local) la remplace pour les essais.
export const API_BASE = '';
export function apiBase() {
  try {
    return localStorage.getItem('sb.api') || API_BASE;
  } catch (e) {
    return API_BASE;
  }
}

const te = new TextEncoder();
const td = new TextDecoder();

export function toB64url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromB64url(text) {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '==='.slice((b64.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export const newSecret = () => toB64url(crypto.getRandomValues(new Uint8Array(32)));

// Identifiant, jeton et clé de chiffrement de la famille, tirés du secret (HKDF-SHA-256).
export async function familyKeys(secret) {
  const base = await crypto.subtle.importKey('raw', fromB64url(secret), 'HKDF', false, ['deriveBits', 'deriveKey']);
  const params = (info) => ({ name: 'HKDF', hash: 'SHA-256', salt: te.encode('superbebe-famille-v1'), info: te.encode(info) });
  const id = toB64url(new Uint8Array(await crypto.subtle.deriveBits(params('identifiant'), base, 128)));
  const token = toB64url(new Uint8Array(await crypto.subtle.deriveBits(params('jeton'), base, 256)));
  const key = await crypto.subtle.deriveKey(params('chiffrement'), base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  return { id, token, key };
}

// Chiffrement AES-GCM : vecteur d'initialisation (12 octets) suivi du texte chiffré, en base64url.
export async function seal(key, value) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, te.encode(JSON.stringify(value))));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv);
  out.set(ct, iv.length);
  return toB64url(out);
}

export async function unseal(key, bloc) {
  const bytes = fromB64url(bloc);
  return JSON.parse(td.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.subarray(0, 12) }, key, bytes.subarray(12))));
}

// Ce que partagent les parents : commune, horaires, rythme de lessive, enfants (avec garde-robe et relevés). L'affichage, l'enfant
// affiché, le rappel du soir et les suggestions masquées restent propres à chaque téléphone.
export function sharedPart(h) {
  return {
    v: 1,
    commune: h.commune,
    outing_window: h.outing_window,
    outing_duration_h: h.outing_duration_h,
    wash_days: h.wash_days ?? null,
    settings_at: h.settings_at ?? 0,
    children: h.children.map(({ id, name, birth, transport, outfit_offset, day_style, night_options, inventory, room, room_day, updated }) => ({
      id, name, birth, transport, outfit_offset, day_style: day_style ?? null, night_options: night_options ?? {},
      inventory: inventory ?? {}, room: room ?? null, room_day: room_day ?? null, updated: updated ?? 0,
    })),
    removed: h.removed ?? {},
  };
}

const newestRoom = (a, b) => ((b?.at ?? 0) > (a?.at ?? 0) ? b : a) ?? null;

// Fusion de deux versions : les réglages communs les plus récents, chaque enfant dans sa version la plus récente,
// les relevés (jour et chambre) les plus récents, et les enfants retirés d'un côté ou de l'autre restent retirés.
export function mergeHousehold(local, remote) {
  const settings = (remote.settings_at ?? 0) > (local.settings_at ?? 0) ? remote : local;
  const removed = { ...(local.removed ?? {}) };
  for (const [id, at] of Object.entries(remote.removed ?? {})) removed[id] = Math.max(at, removed[id] ?? 0);
  const byId = new Map();
  for (const child of [...local.children, ...remote.children]) {
    const before = byId.get(child.id);
    const newer = !before || (child.updated ?? 0) > (before.updated ?? 0) ? child : before;
    byId.set(child.id, { ...newer, room: newestRoom(before?.room, child.room), room_day: newestRoom(before?.room_day, child.room_day) });
  }
  const order = [...new Set([...local.children, ...remote.children].map((c) => c.id))];
  const children = order.map((id) => byId.get(id)).filter((c) => !(removed[c.id] >= (c.updated ?? 0)));
  return {
    ...local,
    commune: settings.commune,
    outing_window: settings.outing_window,
    outing_duration_h: settings.outing_duration_h,
    wash_days: settings.wash_days ?? null,
    settings_at: settings.settings_at ?? 0,
    children: children.length ? children : local.children,
    removed,
  };
}

async function request(path, { method = 'GET', token, body, headers = {} } = {}) {
  const res = await fetch(`${apiBase()}${path}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout?.(15000),
  });
  return res;
}

export const api = {
  etat: () => request('v1/etat').then((r) => (r.ok ? r.json() : null)).catch(() => null),
  creerFamille: (keys, bloc) => request('v1/familles', { method: 'POST', token: keys.token, body: { id: keys.id, bloc } }),
  lireFamille: (keys, version) => request(`v1/familles/${keys.id}`, { token: keys.token, headers: version ? { 'If-None-Match': `"${version}"` } : {} }),
  ecrireFamille: (keys, bloc, version) => request(`v1/familles/${keys.id}`, { method: 'PUT', token: keys.token, body: { bloc }, headers: { 'If-Match': `"${version}"` } }),
  effacerFamille: (keys) => request(`v1/familles/${keys.id}`, { method: 'DELETE', token: keys.token }),
  abonner: (endpoint, heure) => request('v1/push/abonnements', { method: 'POST', body: { endpoint, heure } }),
  desabonner: (endpoint) => request('v1/push/abonnements', { method: 'DELETE', body: { endpoint } }),
  creerRelais: (bloc) => request('v1/relais', { method: 'POST', body: { bloc } }),
  lireRelais: (id) => request(`v1/relais/${id}`),
};

// Fiche du jour à lien court : chiffrée avec une clé qui ne quitte pas le lien (après le #), gardée 48 heures.
export async function shortFicheLink(data) {
  const raw = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt']);
  const res = await api.creerRelais(await seal(key, data));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const { id } = await res.json();
  return `${apiBase()}r/${id}#k=${toB64url(raw)}`;
}

export async function readShortFiche(id, k) {
  const res = await api.lireRelais(id);
  if (!res.ok) return null;
  const key = await crypto.subtle.importKey('raw', fromB64url(k), 'AES-GCM', false, ['decrypt']);
  return unseal(key, (await res.json()).bloc);
}
