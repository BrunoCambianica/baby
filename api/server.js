// API Superbébé : familles chiffrées (synchronisation entre parents, sans compte), rappel du soir par Web Push
// (iPhone, app de l'écran d'accueil) et fiches du jour à lien court, gardées 48 heures.
// Aucune donnée lisible : les blocs sont chiffrés sur les téléphones. Aucune adresse IP n'est enregistrée :
// elle ne sert qu'en mémoire, pour limiter le nombre de requêtes.
// Usage : node api/server.js   (variables d'environnement : voir deploy/.env.exemple)
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { openDb, RETENTION } from './db.js';
import { sendPush, vapidSigner } from './push.js';

export const VERSION = '0.9.0';
const LIMITS = { famille: 64 * 1024, relais: 8 * 1024, abonnement: 4 * 1024 };
const ID = /^[A-Za-z0-9_-]{16,64}$/;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const sha256 = (text) => createHash('sha256').update(text).digest('base64url');
const sameHash = (a, b) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

// Heure de Paris, pour les rappels du soir.
export function parisNow(at = new Date()) {
  const parts = {};
  for (const p of new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(at)) parts[p.type] = p.value;
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}
const minutes = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

// Limite par adresse, en mémoire seulement : `max` requêtes par fenêtre de `windowMs`.
function rateLimiter(max, windowMs) {
  const hits = new Map();
  return (key, now = Date.now()) => {
    const entry = hits.get(key);
    if (!entry || now - entry.start > windowMs) {
      hits.set(key, { start: now, count: 1 });
      if (hits.size > 50_000) hits.clear();
      return true;
    }
    entry.count += 1;
    return entry.count <= max;
  };
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function readJson(req, limit) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new HttpError(413, 'Contenu trop volumineux');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch (e) {
    throw new HttpError(400, 'JSON invalide');
  }
}

const bearer = (req) => (req.headers.authorization ?? '').match(/^Bearer ([A-Za-z0-9_-]{20,100})$/)?.[1] ?? null;
const blocValide = (bloc, limit) => typeof bloc === 'string' && /^[A-Za-z0-9_-]+$/.test(bloc) && bloc.length <= limit;

export function createApi({
  db = openDb(),
  origins = ['https://brunocambianica.github.io'],
  site = 'https://brunocambianica.github.io/baby/',
  vapid = null,
  now = () => Date.now(),
  trustProxy = false,
  limits = { lecture: 120, ecriture: 30 },
  fetchImpl = fetch,
} = {}) {
  const readLimit = rateLimiter(limits.lecture, 60_000);
  const writeLimit = rateLimiter(limits.ecriture, 60_000);
  const sign = vapid ? vapidSigner(vapid) : null;

  function cors(req, res) {
    const origin = req.headers.origin;
    if (origin && origins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, If-Match');
      res.setHeader('Access-Control-Expose-Headers', 'ETag');
      res.setHeader('Access-Control-Max-Age', '86400');
    }
    return !origin || origins.includes(origin);
  }

  function send(res, status, body, headers = {}) {
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      ...headers,
    });
    res.end(body === null ? '' : JSON.stringify(body));
  }

  async function route(req, res) {
    const url = new URL(req.url, 'http://api');
    const path = url.pathname;
    const method = req.method;
    // Adresse du client : seulement pour la limite de requêtes, jamais enregistrée.
    const ip = (trustProxy ? String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() : '') || req.socket.remoteAddress || '?';
    const allowed = cors(req, res);
    if (method === 'OPTIONS') return send(res, allowed ? 204 : 403, null);
    if (!allowed) throw new HttpError(403, 'Origine non autorisée');
    const limit = method === 'GET' ? readLimit : writeLimit;
    if (!limit(ip)) throw new HttpError(429, 'Trop de requêtes, réessayez dans une minute');

    if (path === '/v1/etat' && method === 'GET') {
      return send(res, 200, { ok: true, version: VERSION, push: sign ? vapid.publique : null, conservation: RETENTION });
    }

    // Lien court d'une fiche du jour : renvoie vers la page de la fiche ; la clé reste après le # du lien.
    let m = path.match(/^\/r\/([A-Za-z0-9_-]{8,32})$/);
    if (m && method === 'GET') {
      res.writeHead(302, { Location: `${site}fiche/?r=${m[1]}`, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
      return res.end();
    }

    // Familles : un bloc chiffré par famille. Le jeton (dérivé du secret du lien de famille) n'est gardé
    // que sous forme d'empreinte ; If-Match empêche d'écraser la version d'un autre parent.
    if (path === '/v1/familles' && method === 'POST') {
      const token = bearer(req);
      const body = await readJson(req, LIMITS.famille);
      if (!token || !ID.test(body.id ?? '') || !blocValide(body.bloc, LIMITS.famille)) throw new HttpError(400, 'Famille invalide');
      if (db.famille(body.id)) throw new HttpError(409, 'Famille déjà créée');
      db.creerFamille(body.id, sha256(token), body.bloc, now());
      return send(res, 201, { version: 1 }, { ETag: '"1"' });
    }
    m = path.match(/^\/v1\/familles\/([A-Za-z0-9_-]{16,64})$/);
    if (m) {
      const famille = db.famille(m[1]);
      const token = bearer(req);
      if (!famille) throw new HttpError(404, 'Famille inconnue ou effacée');
      if (!token || !sameHash(sha256(token), famille.empreinte)) throw new HttpError(403, 'Lien de famille invalide');
      if (method === 'GET') {
        db.vuFamille(m[1], now());
        const etag = `"${famille.version}"`;
        if (req.headers['if-none-match'] === etag) return send(res, 304, null, { ETag: etag });
        return send(res, 200, { bloc: famille.bloc, version: famille.version }, { ETag: etag });
      }
      if (method === 'PUT') {
        const body = await readJson(req, LIMITS.famille);
        const expected = Number(String(req.headers['if-match'] ?? '').replace(/"/g, ''));
        if (!Number.isInteger(expected) || expected < 1) throw new HttpError(428, 'If-Match requis');
        if (!blocValide(body.bloc, LIMITS.famille)) throw new HttpError(400, 'Bloc invalide');
        const version = db.majFamille(m[1], body.bloc, expected, now());
        if (version === null) throw new HttpError(412, 'Un autre téléphone a modifié la famille : relisez-la');
        return send(res, 200, { version }, { ETag: `"${version}"` });
      }
      if (method === 'DELETE') {
        db.effacerFamille(m[1]);
        return send(res, 204, null);
      }
    }

    // Rappel du soir (iPhone, app de l'écran d'accueil) : l'adresse d'envoi du téléphone et l'heure choisie.
    if (path === '/v1/push/abonnements' && (method === 'POST' || method === 'DELETE')) {
      const body = await readJson(req, LIMITS.abonnement);
      let endpoint;
      try {
        endpoint = new URL(body.endpoint);
      } catch (e) {
        throw new HttpError(400, 'Abonnement invalide');
      }
      if (endpoint.protocol !== 'https:') throw new HttpError(400, 'Abonnement invalide');
      if (method === 'DELETE') {
        db.desabonner(endpoint.href);
        return send(res, 204, null);
      }
      if (!sign) throw new HttpError(503, 'Notifications indisponibles');
      if (!HHMM.test(body.heure ?? '')) throw new HttpError(400, 'Heure invalide');
      db.abonner(endpoint.href, body.heure, now());
      return send(res, 201, { heure: body.heure });
    }

    // Fiche du jour à lien court : un bloc chiffré (la clé n'est que dans le lien), effacé au bout de 48 heures.
    if (path === '/v1/relais' && method === 'POST') {
      const body = await readJson(req, LIMITS.relais);
      if (!blocValide(body.bloc, LIMITS.relais)) throw new HttpError(400, 'Fiche invalide');
      const id = randomBytes(9).toString('base64url');
      const suppression = randomBytes(18).toString('base64url');
      const expire = now() + RETENTION.relaisHeures * 3600 * 1000;
      db.creerRelais(id, body.bloc, sha256(suppression), expire);
      return send(res, 201, { id, suppression, expire });
    }
    m = path.match(/^\/v1\/relais\/([A-Za-z0-9_-]{8,32})$/);
    if (m) {
      const relais = db.relais(m[1]);
      if (!relais || relais.expire < now()) throw new HttpError(404, 'Fiche expirée ou inconnue');
      if (method === 'GET') return send(res, 200, { bloc: relais.bloc, expire: relais.expire });
      if (method === 'DELETE') {
        const token = bearer(req);
        if (!token || !sameHash(sha256(token), relais.empreinte)) throw new HttpError(403, 'Suppression non autorisée');
        db.effacerRelais(m[1]);
        return send(res, 204, null);
      }
    }
    throw new HttpError(404, 'Introuvable');
  }

  const server = createServer((req, res) => {
    route(req, res).catch((e) => {
      if (res.headersSent) return res.end();
      send(res, e.status ?? 500, { erreur: e.status ? e.message : 'Erreur du serveur' });
      if (!e.status) console.error(e.message);
    });
  });

  // Rappels : chaque minute, un envoi vide aux abonnés dont l'heure est arrivée (au plus deux heures après,
  // au plus une fois par jour) ; purge des données expirées toutes les heures.
  async function tick(at = new Date(now())) {
    if (!sign) return { envoyes: 0 };
    const { date, time } = parisNow(at);
    let envoyes = 0;
    for (const { endpoint, heure } of db.aEnvoyer(time, date)) {
      if (minutes(time) - minutes(heure) > 120) continue;
      const result = await sendPush(endpoint, sign(endpoint, at.getTime()), { fetchImpl });
      if (result === 'oublier') db.desabonner(endpoint);
      if (result === 'envoye') {
        db.envoye(endpoint, date);
        envoyes += 1;
      }
    }
    return { envoyes };
  }

  return { server, db, tick, purge: () => db.purger(now()) };
}

// Lancement : variables d'environnement (deploy/.env.exemple).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const env = process.env;
  const api = createApi({
    db: openDb(env.BASE ?? '/donnees/superbebe.sqlite'),
    origins: (env.ORIGINES ?? 'https://brunocambianica.github.io').split(',').map((o) => o.trim()),
    site: env.SITE ?? 'https://brunocambianica.github.io/baby/',
    vapid: env.VAPID_PUBLIQUE && env.VAPID_PRIVEE
      ? { publique: env.VAPID_PUBLIQUE, privee: env.VAPID_PRIVEE, contact: env.VAPID_CONTACT ?? 'https://brunocambianica.github.io/baby/' }
      : null,
    trustProxy: env.DERRIERE_PROXY === '1',
  });
  const port = Number(env.PORT ?? 8080);
  api.server.listen(port, () => console.log(`API Superbébé ${VERSION} sur le port ${port}`));
  setInterval(() => api.tick().catch((e) => console.error(e.message)), 60_000);
  setInterval(() => api.purge(), 3600_000);
  api.purge();
  const stop = () => {
    api.server.close();
    api.db.close();
    process.exit(0);
  };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}
