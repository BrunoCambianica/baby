// Tests de la famille entre parents (app/js/famille.js) : clés tirées du secret, chiffrement, fusion des versions,
// et un aller-retour complet avec l'API (api/server.js) lancée sur un port libre.
import { createApi } from '../api/server.js';
import { openDb } from '../api/db.js';
import {
  api, familyKeys, mergeHousehold, newSecret, readShortFiche, seal, sharedPart, shortFicheLink, unseal,
} from '../app/js/famille.js';

let failed = 0;
async function test(name, fn) {
  try {
    await fn();
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
const child = (id, name, updated, extra = {}) => ({
  id, name, birth: '2026-05', transport: 'poussette', outfit_offset: 0, inventory: {}, room: null, updated, ...extra,
});
const household = (children, extra = {}) => ({
  v: 2, commune: LYON, outing_window: { from: '09:00', to: '18:00' }, outing_duration_h: 1, outfit_view: 'dessins',
  children, created: 1, updated: 1, settings_at: 1, removed: {}, ...extra,
});

await test('Même secret, mêmes clés ; un autre secret ne déchiffre pas', async () => {
  const secret = newSecret();
  const a = await familyKeys(secret);
  const b = await familyKeys(secret);
  assert(a.id === b.id && a.token === b.token && a.id.length === 22 && a.token.length === 43, `${a.id} ${a.token}`);
  const bloc = await seal(a.key, { prenom: 'Léo' });
  assert(!bloc.includes('L') || !atob(bloc.replace(/-/g, '+').replace(/_/g, '/')).includes('Léo'), 'prénom lisible');
  assert((await unseal(b.key, bloc)).prenom === 'Léo', 'déchiffrement');
  const other = await familyKeys(newSecret());
  let refused = false;
  try {
    await unseal(other.key, bloc);
  } catch (e) {
    refused = true;
  }
  assert(refused && other.id !== a.id, 'déchiffré avec une autre clé');
});

await test('Partagé : commune, horaires, enfants ; pas l\'affichage, l\'enfant affiché ni le rappel', () => {
  const shared = sharedPart({ ...household([child('leo', 'Léo', 5)]), outfit_view: 'texte', current: 'leo', reminder: { on: true } });
  assert(shared.children[0].name === 'Léo' && !('outfit_view' in shared) && !('current' in shared) && !('reminder' in shared), JSON.stringify(shared));
});

await test('Fusion : l\'enfant le plus récent, chaque relevé (chambre, pièce de jour) le plus récent, les réglages communs les plus récents', () => {
  const local = household([child('leo', 'Léo', 10, { transport: 'porte_bebe', room: { value: 19, at: 100 }, room_day: { value: 20, at: 40 } }), child('zoe', 'Zoé', 10)], { settings_at: 5 });
  const remote = household([child('leo', 'Léo', 20, { transport: 'poussette', room: { value: 18, at: 50 }, room_day: { value: 22.5, at: 60 } }), child('mia', 'Mia', 30)], {
    settings_at: 9, outing_window: { from: '08:00', to: '18:00' },
  });
  const merged = mergeHousehold(local, remote);
  assert(merged.children.map((c) => c.id).join() === 'leo,zoe,mia', merged.children.map((c) => c.id).join());
  assert(merged.children[0].transport === 'poussette' && merged.children[0].room.value === 19 && merged.children[0].room_day.value === 22.5, JSON.stringify(merged.children[0]));
  assert(sharedPart(merged).children[0].room_day.value === 22.5, 'relevé du jour non partagé');
  assert(merged.outing_window.from === '08:00' && merged.outfit_view === 'dessins', 'réglages communs');
});

await test('Fusion : un enfant retiré par l\'autre parent reste retiré, sauf modifié après', () => {
  const local = household([child('leo', 'Léo', 10), child('zoe', 'Zoé', 10)]);
  const remote = household([child('leo', 'Léo', 10)], { removed: { zoe: 15 } });
  assert(mergeHousehold(local, remote).children.length === 1, 'retrait ignoré');
  const touched = household([child('leo', 'Léo', 10), child('zoe', 'Zoé', 20)]);
  assert(mergeHousehold(touched, remote).children.length === 2, 'modification postérieure perdue');
  assert(mergeHousehold(household([child('leo', 'Léo', 1)]), household([], { removed: { leo: 5 } })).children.length === 1, 'foyer vidé');
});

await test('Aller-retour avec l\'API : création, lecture par l\'autre parent, écriture concurrente refusée puis fusionnée', async () => {
  const server = createApi({ db: openDb(':memory:'), origins: [] });
  await new Promise((resolve) => server.server.listen(0, '127.0.0.1', resolve));
  globalThis.localStorage = { getItem: () => `http://127.0.0.1:${server.server.address().port}/` };
  try {
    const secret = newSecret();
    const keys = await familyKeys(secret);
    const h = household([child('leo', 'Léo', 1)]);
    assert((await api.creerFamille(keys, await seal(keys.key, sharedPart(h)))).status === 201, 'création');
    // L'autre parent n'a que le lien : le secret.
    const other = await familyKeys(secret);
    const read = await api.lireFamille(other);
    const { bloc, version } = await read.json();
    const remote = await unseal(other.key, bloc);
    assert(remote.children[0].name === 'Léo' && version === 1, JSON.stringify(remote));
    assert((await api.lireFamille(other, 1)).status === 304, 'pas de 304 quand rien n\'a changé');
    const mine = { ...remote, children: [...remote.children, child('zoe', 'Zoé', 2)] };
    assert((await api.ecrireFamille(other, await seal(other.key, mine), 1)).status === 200, 'écriture');
    const late = await api.ecrireFamille(keys, await seal(keys.key, sharedPart(h)), 1);
    assert(late.status === 412, `écriture concurrente acceptée : ${late.status}`);
    const fresh = await (await api.lireFamille(keys)).json();
    const merged = mergeHousehold(h, await unseal(keys.key, fresh.bloc));
    assert(merged.children.length === 2 && fresh.version === 2, JSON.stringify(merged.children));
    const link = await shortFicheLink({ v: 1, p: 'Léo', d: '2026-10-22', m: ['body_ml'] });
    const [, id, k] = link.match(/\/r\/([\w-]+)#k=([\w-]+)$/);
    assert((await readShortFiche(id, k)).p === 'Léo', 'fiche courte illisible');
    assert(!JSON.stringify(server.db.relais(id)).includes('Léo'), 'prénom lisible sur le serveur');
  } finally {
    delete globalThis.localStorage;
    await new Promise((resolve) => server.server.close(resolve));
  }
});

console.log(`\n${failed ? `${failed} test(s) en échec` : 'Famille : tous les tests OK'}`);
process.exit(failed ? 1 : 0);
