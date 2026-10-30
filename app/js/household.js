// Le foyer : commune et horaires communs, puis les enfants, chacun avec ses réglages, sa garde-robe et deux relevés :
// `room_day`, la pièce où il passe la journée, et `room`, sa chambre la nuit ({ value, at }, valables 16 heures).
// Fonctions pures, testées par tools/test-foyer.js.
import { configChildren } from '../../engine/adapter.js';
import { addDays } from '../../engine/engine.js';

const DEFAULT_WINDOW = { from: '09:00', to: '18:00' };

export function newId() {
  const bytes = new Uint8Array(6);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else bytes.forEach((_, i) => { bytes[i] = Math.floor(Math.random() * 256); });
  return [...bytes].map((b) => (b % 36).toString(36)).join('');
}

// `day_style` : style de la journée (null : avec pyjama ; « sans_pyjama ») ; `night_options` : tenue de nuit choisie
// par tranche de température ({ n20: 'tog-1' }), sinon la tenue principale ; `swaps` : pièces au choix
// ({ pull: { to: 'gilet_chaud' } } toujours, avec `day` pour ce jour-là seulement) ; `feedback` : « C'était juste ? »,
// une réponse par jour (voir withFeedback).
export const newChild = ({ name = '', birth, transport = 'poussette', outfit_offset = 0 }) => ({
  id: newId(), name, birth, transport, outfit_offset, day_style: null, night_options: {}, swaps: {}, inventory: {}, room: null, room_day: null, feedback: {},
});

// « C'était juste ? » : la réponse du parent sur la tenue de dehors du jour, { 'AAAA-MM-JJ': { v, t, b, f, o } } :
// v « chaud », « juste » ou « froid » ; le mode de sortie, la tranche du matin, le ressenti (du matin, le plus éloigné)
// et la tendance de ce jour-là, pour relire les retours. Une réponse par jour, les FEEDBACK_KEEP derniers jours gardés.
export const FEEDBACK_KEEP = 60;
export function withFeedback(feedback, date, entry) {
  const next = { ...(feedback ?? {}) };
  if (entry) next[date] = entry;
  else delete next[date];
  return Object.fromEntries(Object.entries(next).sort(([a], [b]) => a.localeCompare(b)).slice(-FEEDBACK_KEEP));
}

// Deux « trop chaud » (ou deux « trop froid ») en 7 jours, sans l'inverse, avec la tendance d'aujourd'hui : proposer
// de la décaler d'un cran (de « normal » à « a chaud », ou de « a froid » à « normal »). Les réponses données avec une
// autre tendance ne comptent plus : elles portaient sur d'autres tenues.
export function feedbackHint(feedback, today, offset = 0) {
  const week = Object.entries(feedback ?? {})
    .filter(([day, e]) => day > addDays(today, -7) && day <= today && (e.o ?? 0) === offset)
    .map(([, e]) => e.v);
  const count = (v) => week.filter((x) => x === v).length;
  if (count('chaud') >= 2 && !count('froid') && offset > -1) return { v: 'chaud', n: count('chaud'), offset: offset - 1 };
  if (count('froid') >= 2 && !count('chaud') && offset < 1) return { v: 'froid', n: count('froid'), offset: offset + 1 };
  return null;
}

// Combien de réponses, et de chaque sorte : la mesure des tenues jugées justes.
export function feedbackStats(feedback) {
  const values = Object.values(feedback ?? {}).map((e) => e.v);
  const n = (v) => values.filter((x) => x === v).length;
  return { total: values.length, juste: n('juste'), chaud: n('chaud'), froid: n('froid') };
}

// Pièces au choix encore utiles : celles de toujours, et celles d'aujourd'hui ou d'un jour à venir.
export const liveSwaps = (swaps, today) => Object.fromEntries(Object.entries(swaps ?? {}).filter(([, s]) => s?.to && (!s.day || s.day >= today)));

// Profil des versions à un seul enfant (jusqu'à 0.5) : il devient le premier enfant du foyer.
export function migrate(raw) {
  if (!raw?.commune) return null;
  if (raw.v === 2) return raw.children?.length ? raw : null;
  const child = {
    ...newChild({ birth: raw.birth, transport: raw.transport ?? 'poussette', outfit_offset: raw.outfit_offset ?? 0 }),
    inventory: raw.inventory ?? {},
    room: raw.room ?? null,
    room_day: null,
  };
  return {
    v: 2,
    commune: raw.commune,
    outing_window: raw.outing_window ?? DEFAULT_WINDOW,
    outing_duration_h: raw.outing_duration_h ?? 1,
    outfit_view: raw.outfit_view ?? 'dessins',
    children: [child],
    created: raw.created ?? Date.now(),
    updated: Date.now(),
  };
}

export const childOf = (household, id) => household.children.find((c) => c.id === id) ?? household.children[0];

// Ce que lisent les vues pour l'enfant affiché : les réglages du foyer, puis ceux de l'enfant.
export function profileOf(household, id) {
  const { children, v, ...shared } = household;
  const child = childOf(household, id);
  return { ...shared, ...child, index: children.indexOf(child), count: children.length };
}

// Une configuration reçue d'un widget ou de l'app Android ne remplace le foyer que si elle est plus récente
// (m : date du dernier changement, en millisecondes). Une configuration v1 ne sert qu'à un premier lancement.
export const isNewer = (cfg, local) => !local || (cfg.v === 2 && (cfg.m ?? 0) > (local.updated ?? 0));

// Foyer reçu de la famille (voir famille.js, sharedPart) : il remplace celui du téléphone, sauf l'affichage.
export function fromShared(shared, local) {
  return {
    v: 2,
    commune: shared.commune,
    outing_window: shared.outing_window,
    outing_duration_h: shared.outing_duration_h,
    wash_days: shared.wash_days ?? null,
    settings_at: shared.settings_at ?? 0,
    children: shared.children,
    removed: shared.removed ?? {},
    outfit_view: local?.outfit_view ?? 'dessins',
    created: local?.created ?? Date.now(),
    updated: Date.now(),
  };
}

// Foyer décrit par une configuration : commune, horaires et enfants. Garde-robe, relevés (jour et chambre) et retours
// des enfants déjà connus (même identifiant) sont gardés ; `keepView` garde l'affichage choisi sur ce téléphone.
export function fromConfig(cfg, local, { keepView = false } = {}) {
  const known = new Map((local?.children ?? []).map((c) => [c.id, c]));
  const children = configChildren(cfg).map((c) => {
    const id = c.id || local?.children[0]?.id || newId();
    const before = known.get(id);
    return {
      id, name: c.name, birth: c.birth, transport: c.transport, outfit_offset: c.outfit_offset,
      day_style: c.day_style, night_options: c.night_options, swaps: c.swaps,
      inventory: before?.inventory ?? {}, room: before?.room ?? null, room_day: before?.room_day ?? null, feedback: before?.feedback ?? {},
    };
  });
  // Sans code Insee (anciennes configurations), la position sert de clé pour la météo en cache.
  const same = Boolean(local) && local.commune.lat === cfg.la && local.commune.lon === cfg.lo;
  return {
    v: 2,
    commune: same ? local.commune : { nom: cfg.n ?? '', code: cfg.c || `${cfg.la},${cfg.lo}`, dep: cfg.dp ?? '', cp: '', lat: cfg.la, lon: cfg.lo },
    outing_window: { from: cfg.f ?? DEFAULT_WINDOW.from, to: cfg.u ?? DEFAULT_WINDOW.to },
    outing_duration_h: cfg.d ?? 1,
    // Le rythme de lessive n'est pas dans la configuration des widgets : celui du téléphone est gardé.
    wash_days: local?.wash_days ?? null,
    outfit_view: keepView && local ? local.outfit_view : cfg.i === 0 ? 'texte' : 'dessins',
    children,
    created: local?.created ?? Date.now(),
    updated: cfg.m || Date.now(),
  };
}

// « 5 mois », « 2 ans », « 2 ans et demi ».
export function ageLabel(months) {
  const m = Math.max(0, Math.floor(months));
  if (m < 24) return `${m} mois`;
  const years = Math.floor(m / 12);
  return `${years} ans${m % 12 >= 6 ? ' et demi' : ''}`;
}
