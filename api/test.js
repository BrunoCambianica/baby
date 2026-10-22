// Tests de l'API : serveur sur un port libre, base en mémoire, heure et envois de notifications simulés.
import { createPublicKey, randomBytes, verify } from 'node:crypto';
import { openDb } from './db.js';
import { newVapidKeys } from './push.js';
import { createApi } from './server.js';

const ORIGIN = 'https://brunocambianica.github.io';
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

// Une API neuve, son adresse locale, et une horloge qu'on peut avancer.
async function start(options = {}) {
  const clock = { now: Date.parse('2026-10-22T10:00:00+02:00') };
  const pushes = [];
  const api = createApi({
    db: openDb(':memory:'),
    now: () => clock.now,
    fetchImpl: async (url, init) => {
      pushes.push({ url, init });
      return new Response(null, { status: options.pushStatus ?? 201 });
    },
    ...options,
  });
  await new Promise((resolve) => api.server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${api.server.address().port}`;
  const call = (path, { method = 'GET', body, token, headers = {} } = {}) => fetch(`${base}${path}`, {
    method,
    redirect: 'manual',
    headers: {
      Origin: ORIGIN,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { api, base, call, clock, pushes, stop: () => new Promise((resolve) => api.server.close(resolve)) };
}

const id = () => randomBytes(16).toString('base64url');
const token = () => randomBytes(32).toString('base64url');
const bloc = (size = 200) => randomBytes(size).toString('base64url');

await test('État : version, clé des notifications, durées de conservation', async () => {
  const vapid = { ...newVapidKeys(), contact: 'https://brunocambianica.github.io/baby/' };
  const t = await start({ vapid });
  const res = await t.call('/v1/etat');
  const json = await res.json();
  assert(res.status === 200 && json.ok && json.push === vapid.publique && json.conservation.relaisHeures === 48, JSON.stringify(json));
  assert(res.headers.get('access-control-allow-origin') === ORIGIN && res.headers.get('cache-control') === 'no-store', 'en-têtes');
  await t.stop();
});

await test('CORS : seulement l\'origine de l\'app', async () => {
  const t = await start();
  const ok = await t.call('/v1/familles', { method: 'OPTIONS', headers: { 'Access-Control-Request-Method': 'POST' } });
  assert(ok.status === 204 && ok.headers.get('access-control-allow-headers').includes('If-Match'), `préliminaire ${ok.status}`);
  const other = await t.call('/v1/etat', { headers: { Origin: 'https://exemple.test' } });
  assert(other.status === 403 && !other.headers.get('access-control-allow-origin'), `autre origine ${other.status}`);
  await t.stop();
});

await test('Famille : création, lecture avec le bon jeton seulement, version et If-Match', async () => {
  const t = await start();
  const fid = id();
  const tok = token();
  const created = await t.call('/v1/familles', { method: 'POST', token: tok, body: { id: fid, bloc: bloc() } });
  assert(created.status === 201 && created.headers.get('etag') === '"1"', `création ${created.status}`);
  assert((await t.call('/v1/familles', { method: 'POST', token: tok, body: { id: fid, bloc: bloc() } })).status === 409, 'double création');
  const read = await t.call(`/v1/familles/${fid}`, { token: tok });
  assert(read.status === 200 && (await read.json()).version === 1, `lecture ${read.status}`);
  assert((await t.call(`/v1/familles/${fid}`, { token: token() })).status === 403, 'mauvais jeton accepté');
  assert((await t.call(`/v1/familles/${fid}`)).status === 403, 'sans jeton accepté');
  assert((await t.call(`/v1/familles/${id()}`, { token: tok })).status === 404, 'famille inconnue');
  assert((await t.call(`/v1/familles/${fid}`, { token: tok, headers: { 'If-None-Match': '"1"' } })).status === 304, 'pas de 304');
  const put = await t.call(`/v1/familles/${fid}`, { method: 'PUT', token: tok, body: { bloc: bloc() }, headers: { 'If-Match': '"1"' } });
  assert(put.status === 200 && (await put.json()).version === 2, `mise à jour ${put.status}`);
  const stale = await t.call(`/v1/familles/${fid}`, { method: 'PUT', token: tok, body: { bloc: bloc() }, headers: { 'If-Match': '"1"' } });
  assert(stale.status === 412, `version périmée acceptée : ${stale.status}`);
  assert((await t.call(`/v1/familles/${fid}`, { method: 'PUT', token: tok, body: { bloc: bloc() } })).status === 428, 'If-Match facultatif');
  assert((await t.call(`/v1/familles/${fid}`, { method: 'DELETE', token: tok })).status === 204, 'effacement');
  assert((await t.call(`/v1/familles/${fid}`, { token: tok })).status === 404, 'famille encore là');
  await t.stop();
});

await test('Famille : le serveur ne garde que l\'empreinte du jeton, et refuse les blocs trop gros ou mal formés', async () => {
  const t = await start();
  const fid = id();
  const tok = token();
  await t.call('/v1/familles', { method: 'POST', token: tok, body: { id: fid, bloc: bloc() } });
  const row = t.api.db.famille(fid);
  assert(row.empreinte !== tok && !JSON.stringify(row).includes(tok), 'jeton gardé en clair');
  const big = await t.call('/v1/familles', { method: 'POST', token: tok, body: { id: id(), bloc: bloc(60 * 1024) } });
  assert(big.status === 413, `trop gros : ${big.status}`);
  const bad = await t.call('/v1/familles', { method: 'POST', token: tok, body: { id: id(), bloc: '<script>' } });
  assert(bad.status === 400, `mal formé : ${bad.status}`);
  await t.stop();
});

await test('Fiche à lien court : création, lecture, redirection avec la clé gardée par le navigateur, 48 heures', async () => {
  const t = await start({ site: 'https://brunocambianica.github.io/baby/' });
  const created = await t.call('/v1/relais', { method: 'POST', body: { bloc: bloc(600) } });
  const { id: rid, suppression, expire } = await created.json();
  assert(created.status === 201 && rid && suppression && expire === t.clock.now + 48 * 3600 * 1000, `création ${created.status}`);
  assert((await t.call(`/v1/relais/${rid}`)).status === 200, 'lecture');
  const redirect = await t.call(`/r/${rid}`);
  assert(redirect.status === 302 && redirect.headers.get('location') === `https://brunocambianica.github.io/baby/fiche/?r=${rid}`, `${redirect.status} ${redirect.headers.get('location')}`);
  assert((await t.call(`/v1/relais/${rid}`, { method: 'DELETE', token: token() })).status === 403, 'effacée sans le bon jeton');
  t.clock.now += 49 * 3600 * 1000;
  assert((await t.call(`/v1/relais/${rid}`)).status === 404, 'fiche lisible après 48 heures');
  assert(t.api.purge().relais === 1, 'fiche expirée non purgée');
  const other = await (await t.call('/v1/relais', { method: 'POST', body: { bloc: bloc() } })).json();
  assert((await t.call(`/v1/relais/${other.id}`, { method: 'DELETE', token: other.suppression })).status === 204, 'effacement par le parent');
  await t.stop();
});

await test('Rappel du soir : abonnement, envoi vide signé (VAPID) à l\'heure, une fois par jour, oubli si le téléphone a disparu', async () => {
  const vapid = { ...newVapidKeys(), contact: 'https://brunocambianica.github.io/baby/' };
  const t = await start({ vapid });
  const endpoint = 'https://web.push.apple.com/QGx3abc';
  assert((await t.call('/v1/push/abonnements', { method: 'POST', body: { endpoint, heure: '25:00' } })).status === 400, 'heure invalide');
  assert((await t.call('/v1/push/abonnements', { method: 'POST', body: { endpoint: 'http://exemple.test/x', heure: '20:00' } })).status === 400, 'http accepté');
  assert((await t.call('/v1/push/abonnements', { method: 'POST', body: { endpoint, heure: '20:00' } })).status === 201, 'abonnement');
  assert((await t.api.tick(new Date('2026-10-22T19:59:00+02:00'))).envoyes === 0, 'envoyé trop tôt');
  assert((await t.api.tick(new Date('2026-10-22T20:01:00+02:00'))).envoyes === 1, 'pas envoyé à l\'heure');
  assert((await t.api.tick(new Date('2026-10-22T20:30:00+02:00'))).envoyes === 0, 'envoyé deux fois');
  const { url, init } = t.pushes[0];
  assert(url === endpoint && init.body === '' && init.headers.TTL && init.headers.Urgency === 'normal', JSON.stringify(init.headers));
  const [, jwt, key] = init.headers.Authorization.match(/^vapid t=([^,]+), k=(.+)$/);
  const [header, claims, signature] = jwt.split('.');
  const payload = JSON.parse(Buffer.from(claims, 'base64url').toString());
  assert(payload.aud === 'https://web.push.apple.com' && payload.exp > Date.parse('2026-10-22T20:01:00+02:00') / 1000 && key === vapid.publique, JSON.stringify(payload));
  const raw = Buffer.from(vapid.publique, 'base64url');
  const pub = createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: raw.subarray(1, 33).toString('base64url'), y: raw.subarray(33).toString('base64url') }, format: 'jwk' });
  assert(verify('sha256', Buffer.from(`${header}.${claims}`), { key: pub, dsaEncoding: 'ieee-p1363' }, Buffer.from(signature, 'base64url')), 'signature VAPID invalide');
  assert((await t.api.tick(new Date('2026-10-23T23:30:00+02:00'))).envoyes === 0, 'envoyé plus de deux heures après');
  await t.stop();
  const gone = await start({ vapid, pushStatus: 410 });
  await gone.call('/v1/push/abonnements', { method: 'POST', body: { endpoint, heure: '20:00' } });
  await gone.api.tick(new Date('2026-10-22T20:05:00+02:00'));
  assert(gone.api.db.compte().abonnements === 0, 'abonnement disparu gardé');
  await gone.stop();
});

await test('Désabonnement, et notifications indisponibles sans clés', async () => {
  const t = await start();
  const endpoint = 'https://fcm.googleapis.com/fcm/send/abc';
  assert((await t.call('/v1/push/abonnements', { method: 'POST', body: { endpoint, heure: '20:00' } })).status === 503, 'sans clés');
  assert((await t.call('/v1/push/abonnements', { method: 'DELETE', body: { endpoint } })).status === 204, 'désabonnement');
  await t.stop();
});

await test('Limite de requêtes par adresse, en mémoire', async () => {
  const t = await start({ limits: { lecture: 100, ecriture: 3 } });
  const codes = [];
  for (let k = 0; k < 4; k++) codes.push((await t.call('/v1/relais', { method: 'POST', body: { bloc: bloc() } })).status);
  assert(codes.join() === '201,201,201,429', codes.join());
  await t.stop();
});

await test('Purge : familles sans accès depuis 12 mois, abonnements non renouvelés depuis 6 mois', async () => {
  const t = await start();
  const fid = id();
  await t.call('/v1/familles', { method: 'POST', token: token(), body: { id: fid, bloc: bloc() } });
  t.api.db.abonner('https://web.push.apple.com/x', '20:00', t.clock.now);
  t.clock.now += 200 * 86_400_000;
  assert(JSON.stringify(t.api.purge()) === '{"familles":0,"abonnements":1,"relais":0}', 'purge à 200 jours');
  t.clock.now += 200 * 86_400_000;
  assert(t.api.purge().familles === 1, 'famille gardée après 400 jours');
  await t.stop();
});

console.log(`\n${failed ? `${failed} test(s) en échec` : 'API : tous les tests OK'}`);
process.exit(failed ? 1 : 0);
