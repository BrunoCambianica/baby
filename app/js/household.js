// Le foyer : commune et horaires communs, puis les enfants, chacun avec ses réglages, sa garde-robe et sa chambre.
// Fonctions pures, testées par tools/test-foyer.js.
import { configChildren } from '../../engine/adapter.js';

const DEFAULT_WINDOW = { from: '09:00', to: '18:00' };

export function newId() {
  const bytes = new Uint8Array(6);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else bytes.forEach((_, i) => { bytes[i] = Math.floor(Math.random() * 256); });
  return [...bytes].map((b) => (b % 36).toString(36)).join('');
}

export const newChild = ({ name = '', birth, transport = 'poussette', outfit_offset = 0 }) => ({
  id: newId(), name, birth, transport, outfit_offset, inventory: {}, room: null,
});

// Profil des versions à un seul enfant (jusqu'à 0.5) : il devient le premier enfant du foyer.
export function migrate(raw) {
  if (!raw?.commune) return null;
  if (raw.v === 2) return raw.children?.length ? raw : null;
  const child = {
    ...newChild({ birth: raw.birth, transport: raw.transport ?? 'poussette', outfit_offset: raw.outfit_offset ?? 0 }),
    inventory: raw.inventory ?? {},
    room: raw.room ?? null,
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

// Foyer décrit par une configuration : commune, horaires et enfants. Garde-robe et relevés des chambres
// des enfants déjà connus (même identifiant) sont gardés ; `keepView` garde l'affichage choisi sur ce téléphone.
export function fromConfig(cfg, local, { keepView = false } = {}) {
  const known = new Map((local?.children ?? []).map((c) => [c.id, c]));
  const children = configChildren(cfg).map((c) => {
    const id = c.id || local?.children[0]?.id || newId();
    const before = known.get(id);
    return {
      id, name: c.name, birth: c.birth, transport: c.transport, outfit_offset: c.outfit_offset,
      inventory: before?.inventory ?? {}, room: before?.room ?? null,
    };
  });
  // Sans code Insee (anciennes configurations), la position sert de clé pour la météo en cache.
  const same = Boolean(local) && local.commune.lat === cfg.la && local.commune.lon === cfg.lo;
  return {
    v: 2,
    commune: same ? local.commune : { nom: cfg.n ?? '', code: cfg.c || `${cfg.la},${cfg.lo}`, dep: cfg.dp ?? '', cp: '', lat: cfg.la, lon: cfg.lo },
    outing_window: { from: cfg.f ?? DEFAULT_WINDOW.from, to: cfg.u ?? DEFAULT_WINDOW.to },
    outing_duration_h: cfg.d ?? 1,
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
