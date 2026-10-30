// Tests du foyer (app/js/household.js) : reprise du profil à un seul enfant, configurations reçues, âges.
import { decodeConfig, encodeConfig, householdToConfig } from '../engine/adapter.js';
import { ageLabel, feedbackHint, feedbackStats, fromConfig, isNewer, migrate, profileOf, withFeedback } from '../app/js/household.js';

const toB64 = (s) => Buffer.from(s, 'binary').toString('base64');
const fromB64 = (b) => Buffer.from(b, 'base64').toString('binary');
const roundTrip = (household) => decodeConfig(encodeConfig(householdToConfig(household), toB64), fromB64);

let failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`✗ ${name}\n    ${e.message}`);
  }
}
function assert(cond, message) {
  if (!cond) throw new Error(message);
}

const LYON = { nom: 'Lyon', code: '69123', dep: '69', cp: '69001', lat: 45.758, lon: 4.8351 };
const v1 = {
  commune: LYON, birth: '2026-05', transport: 'porte_bebe', outing_window: { from: '08:00', to: '18:00' }, outing_duration_h: 2,
  outfit_offset: 1, outfit_view: 'texte', inventory: { gigoteuse_hiver: ['6-18m'] }, room: { value: 19.5, at: 1 }, created: 42,
};

test('Profil à un seul enfant : il devient le premier enfant, sans rien perdre', () => {
  const h = migrate(v1);
  assert(h.v === 2 && h.children.length === 1 && /^[a-z0-9]{6}$/.test(h.children[0].id), JSON.stringify(h));
  const c = h.children[0];
  assert(c.birth === '2026-05' && c.transport === 'porte_bebe' && c.outfit_offset === 1 && c.name === '', JSON.stringify(c));
  assert(c.inventory.gigoteuse_hiver[0] === '6-18m' && c.room.value === 19.5 && c.room_day === null, 'garde-robe ou chambre perdue');
  assert(h.outing_window.from === '08:00' && h.outing_duration_h === 2 && h.outfit_view === 'texte' && h.created === 42, JSON.stringify(h));
  assert(migrate(h) === h && migrate(null) === null && migrate({ v: 2, commune: LYON, children: [] }) === null, 'reprise répétée');
});

test('Vue de l\'enfant affiché : réglages du foyer puis de l\'enfant', () => {
  const h = migrate(v1);
  h.children.push({ id: 'zoe222', name: 'Zoé', birth: '2024-03', transport: 'a_pied', outfit_offset: 0, inventory: {}, room: null });
  const zoe = profileOf(h, 'zoe222');
  assert(zoe.name === 'Zoé' && zoe.transport === 'a_pied' && zoe.commune.nom === 'Lyon' && zoe.count === 2, JSON.stringify(zoe));
  assert(profileOf(h, 'inconnu').birth === '2026-05', 'enfant inconnu : le premier');
});

test('Configuration reçue : enfants remplacés, garde-robe et chambre gardées pour les mêmes identifiants', () => {
  const local = migrate(v1);
  const id = local.children[0].id;
  const sent = {
    ...local, updated: local.updated + 1000,
    children: [{ ...local.children[0], name: 'Léo', transport: 'poussette' }, { id: 'zoe222', name: 'Zoé', birth: '2024-03', transport: 'a_pied', outfit_offset: 0 }],
  };
  const cfg = roundTrip(sent);
  assert(isNewer(cfg, local) && !isNewer(roundTrip(local), sent), 'comparaison des dates');
  const h = fromConfig(cfg, local);
  assert(h.children.map((c) => c.name).join() === 'Léo,Zoé' && h.children[0].id === id, JSON.stringify(h.children));
  assert(h.children[0].inventory.gigoteuse_hiver && h.children[0].room.value === 19.5 && h.children[0].transport === 'poussette', 'données locales perdues');
  assert(h.children[0].room_day === null && h.children[1].room_day === null, 'relevé du jour inventé');
  const day = fromConfig(cfg, { ...local, children: [{ ...local.children[0], room_day: { value: 21.5, at: 2 } }] });
  assert(day.children[0].room_day.value === 21.5, 'relevé du jour perdu');
  assert(h.commune.cp === '69001' && h.updated === sent.updated, 'commune ou date');
  const kept = fromConfig(cfg, local, { keepView: true });
  assert(kept.outfit_view === 'texte', `affichage du téléphone remplacé : ${kept.outfit_view}`);
});

test('Configuration v1 : seulement au premier lancement', () => {
  const cfg = decodeConfig(encodeConfig({ v: 1, n: 'Paris', la: 48.8566, lo: 2.3522, b: '2026-05', t: 'voiture' }, toB64), fromB64);
  assert(isNewer(cfg, null) && !isNewer(cfg, migrate(v1)), 'v1 appliquée sur un foyer existant');
  const h = fromConfig(cfg, null);
  assert(h.children.length === 1 && h.children[0].transport === 'voiture' && h.commune.code === '48.8566,2.3522', JSON.stringify(h));
});

test('« C\'était juste ? » : une réponse par jour, changée ou retirée, les 60 derniers jours gardés', () => {
  let fb = withFeedback({}, '2026-10-20', { v: 'chaud', o: 0 });
  fb = withFeedback(fb, '2026-10-20', { v: 'juste', o: 0 });
  assert(Object.keys(fb).length === 1 && fb['2026-10-20'].v === 'juste', JSON.stringify(fb));
  assert(!Object.keys(withFeedback(fb, '2026-10-20', null)).length, 'réponse non retirée');
  let many = {};
  for (let k = 0; k < 70; k++) many = withFeedback(many, `2026-0${1 + Math.floor(k / 28)}-${String(1 + (k % 28)).padStart(2, '0')}`, { v: 'juste' });
  assert(Object.keys(many).length === 60 && !many['2026-01-01'], `${Object.keys(many).length} réponses gardées`);
  const stats = feedbackStats({ a: { v: 'juste' }, b: { v: 'juste' }, c: { v: 'chaud' } });
  assert(stats.total === 3 && stats.juste === 2 && stats.chaud === 1 && stats.froid === 0, JSON.stringify(stats));
});

test('« C\'était juste ? » : deux fois trop chaud en 7 jours proposent un cran plus léger, pas au-delà', () => {
  const two = { '2026-10-25': { v: 'chaud', o: 0 }, '2026-10-29': { v: 'chaud', o: 0 } };
  const hint = feedbackHint(two, '2026-10-30', 0);
  assert(hint?.v === 'chaud' && hint.n === 2 && hint.offset === -1, JSON.stringify(hint));
  assert(!feedbackHint(two, '2026-10-30', -1), 'déjà « a chaud » : rien de plus léger');
  assert(!feedbackHint({ ...two, '2026-10-26': { v: 'froid', o: 0 } }, '2026-10-30', 0), 'chaud et froid : rien à proposer');
  assert(!feedbackHint({ '2026-10-20': { v: 'chaud', o: 0 }, '2026-10-29': { v: 'chaud', o: 0 } }, '2026-10-30', 0), 'plus de 7 jours');
  // Après le changement de tendance, les réponses d'avant ne comptent plus.
  assert(!feedbackHint({ '2026-10-28': { v: 'froid', o: 1 }, '2026-10-29': { v: 'froid', o: 1 } }, '2026-10-30', 0), 'réponses d\'une autre tendance');
  const cold = feedbackHint({ '2026-10-28': { v: 'froid', o: 0 }, '2026-10-29': { v: 'froid', o: 0 } }, '2026-10-30', 0);
  assert(cold?.v === 'froid' && cold.offset === 1, JSON.stringify(cold));
});

test('Âge affiché', () => {
  const labels = [0.4, 5.9, 23.9, 24, 30.2, 49].map(ageLabel).join(' | ');
  assert(labels === '0 mois | 5 mois | 23 mois | 2 ans | 2 ans et demi | 4 ans', labels);
});

console.log(`\n${failed ? `${failed} test(s) en échec` : 'Foyer : tous les tests OK'}`);
process.exit(failed ? 1 : 0);
