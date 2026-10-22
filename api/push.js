// Notifications Web Push (VAPID, RFC 8292) sans dépendance : un envoi vide, à l'heure choisie.
// L'envoi ne contient rien : c'est le téléphone (service worker de l'app) qui calcule et affiche le rappel.
import { createPrivateKey, generateKeyPairSync, sign } from 'node:crypto';

const b64url = (buf) => Buffer.from(buf).toString('base64url');

// Paire de clés VAPID : publique au format brut (65 octets, pour l'app), privée au format JWK « d ».
export function newVapidKeys() {
  const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const jwk = privateKey.export({ format: 'jwk' });
  const pub = publicKey.export({ format: 'jwk' });
  const raw = Buffer.concat([Buffer.from([4]), Buffer.from(pub.x, 'base64url'), Buffer.from(pub.y, 'base64url')]);
  return { publique: b64url(raw), privee: jwk.d };
}

export function vapidSigner({ publique, privee, contact }) {
  const raw = Buffer.from(publique, 'base64url');
  if (raw.length !== 65 || raw[0] !== 4) throw new Error('Clé VAPID publique invalide');
  const key = createPrivateKey({
    key: { kty: 'EC', crv: 'P-256', d: privee, x: b64url(raw.subarray(1, 33)), y: b64url(raw.subarray(33)) },
    format: 'jwk',
  });
  // En-tête Authorization pour un service de notifications (Apple, Google, Mozilla…), valable 12 heures.
  return (endpoint, now = Date.now()) => {
    const header = b64url(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
    const claims = b64url(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: contact }));
    const signature = sign('sha256', Buffer.from(`${header}.${claims}`), { key, dsaEncoding: 'ieee-p1363' });
    return `vapid t=${header}.${claims}.${b64url(signature)}, k=${publique}`;
  };
}

// Envoi vide : 201 ou 200 = parti ; 404 ou 410 = abonnement disparu, à oublier ; le reste sera retenté.
export async function sendPush(endpoint, authorization, { fetchImpl = fetch, ttl = 4 * 3600 } = {}) {
  try {
    const res = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { Authorization: authorization, TTL: String(ttl), Urgency: 'normal', 'Content-Length': '0' },
      body: '',
      signal: AbortSignal.timeout(15000),
    });
    if (res.status === 404 || res.status === 410) return 'oublier';
    return res.ok ? 'envoye' : 'retenter';
  } catch (e) {
    return 'retenter';
  }
}
