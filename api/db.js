// Base SQLite de l'API (node:sqlite, sans dépendance). Elle ne contient rien de lisible sur les familles :
// des blocs chiffrés sur le téléphone, l'empreinte des jetons, des adresses d'envoi de notifications et des dates.
import { DatabaseSync } from 'node:sqlite';

const DAY_MS = 86_400_000;

// Durées de conservation (écrites aussi dans la page de confidentialité de l'app).
export const RETENTION = {
  familleJours: 365, // famille sans aucun accès depuis 12 mois
  abonnementJours: 183, // abonnement aux notifications sans renouvellement depuis 6 mois
  relaisHeures: 48, // fiche du jour
};

export function openDb(path = ':memory:') {
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS familles (
      id TEXT PRIMARY KEY,
      empreinte TEXT NOT NULL,
      bloc TEXT NOT NULL,
      version INTEGER NOT NULL,
      cree INTEGER NOT NULL,
      vu INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS abonnements (
      endpoint TEXT PRIMARY KEY,
      heure TEXT NOT NULL,
      cree INTEGER NOT NULL,
      vu INTEGER NOT NULL,
      envoye TEXT
    );
    CREATE TABLE IF NOT EXISTS relais (
      id TEXT PRIMARY KEY,
      bloc TEXT NOT NULL,
      empreinte TEXT NOT NULL,
      expire INTEGER NOT NULL
    );
  `);
  const q = {
    famille: db.prepare('SELECT bloc, version, empreinte FROM familles WHERE id = ?'),
    creerFamille: db.prepare('INSERT INTO familles (id, empreinte, bloc, version, cree, vu) VALUES (?, ?, ?, 1, ?, ?)'),
    majFamille: db.prepare('UPDATE familles SET bloc = ?, version = version + 1, vu = ? WHERE id = ? AND version = ?'),
    vuFamille: db.prepare('UPDATE familles SET vu = ? WHERE id = ?'),
    effacerFamille: db.prepare('DELETE FROM familles WHERE id = ?'),
    abonner: db.prepare(`INSERT INTO abonnements (endpoint, heure, cree, vu) VALUES (?, ?, ?, ?)
      ON CONFLICT(endpoint) DO UPDATE SET heure = excluded.heure, vu = excluded.vu`),
    desabonner: db.prepare('DELETE FROM abonnements WHERE endpoint = ?'),
    aEnvoyer: db.prepare('SELECT endpoint, heure FROM abonnements WHERE heure <= ? AND (envoye IS NULL OR envoye <> ?)'),
    envoye: db.prepare('UPDATE abonnements SET envoye = ? WHERE endpoint = ?'),
    relais: db.prepare('SELECT bloc, expire, empreinte FROM relais WHERE id = ?'),
    creerRelais: db.prepare('INSERT INTO relais (id, bloc, empreinte, expire) VALUES (?, ?, ?, ?)'),
    effacerRelais: db.prepare('DELETE FROM relais WHERE id = ?'),
    purgeFamilles: db.prepare('DELETE FROM familles WHERE vu < ?'),
    purgeAbonnements: db.prepare('DELETE FROM abonnements WHERE vu < ?'),
    purgeRelais: db.prepare('DELETE FROM relais WHERE expire < ?'),
    compte: db.prepare('SELECT (SELECT count(*) FROM familles) AS familles, (SELECT count(*) FROM abonnements) AS abonnements, (SELECT count(*) FROM relais) AS relais'),
  };
  return {
    db,
    famille: (id) => q.famille.get(id) ?? null,
    creerFamille: (id, empreinte, bloc, now) => q.creerFamille.run(id, empreinte, bloc, now, now),
    // Mise à jour seulement si personne n'a écrit entre-temps (version attendue) ; renvoie la nouvelle version ou null.
    majFamille(id, bloc, version, now) {
      const { changes } = q.majFamille.run(bloc, now, id, version);
      return changes ? version + 1 : null;
    },
    vuFamille: (id, now) => q.vuFamille.run(now, id),
    effacerFamille: (id) => q.effacerFamille.run(id).changes > 0,
    abonner: (endpoint, heure, now) => q.abonner.run(endpoint, heure, now, now),
    desabonner: (endpoint) => q.desabonner.run(endpoint).changes > 0,
    aEnvoyer: (heure, jour) => q.aEnvoyer.all(heure, jour).map((r) => ({ endpoint: r.endpoint, heure: r.heure })),
    envoye: (endpoint, jour) => q.envoye.run(jour, endpoint),
    relais: (id) => q.relais.get(id) ?? null,
    creerRelais: (id, bloc, empreinte, expire) => q.creerRelais.run(id, bloc, empreinte, expire),
    effacerRelais: (id) => q.effacerRelais.run(id).changes > 0,
    purger(now) {
      return {
        familles: Number(q.purgeFamilles.run(now - RETENTION.familleJours * DAY_MS).changes),
        abonnements: Number(q.purgeAbonnements.run(now - RETENTION.abonnementJours * DAY_MS).changes),
        relais: Number(q.purgeRelais.run(now).changes),
      };
    },
    compte: () => ({ ...q.compte.get() }),
    close: () => db.close(),
  };
}
