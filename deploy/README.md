# Mettre l'API Superbébé sur un VPS

L'API garde, chiffrées, les familles partagées entre parents, envoie le rappel du soir aux iPhone (app de l'écran d'accueil) et sert les liens courts des fiches du jour. Elle ne lit aucun prénom : tout est chiffré sur les téléphones. Sans elle, l'app et les widgets fonctionnent comme avant, en local.

## Ce qu'il faut

- Un VPS avec Docker et Docker Compose, ports 80 et 443 libres et ouverts.
- Un sous-domaine (par exemple `api.exemple.fr`) avec un enregistrement DNS A vers l'adresse IPv4 du VPS (AAAA si IPv6). Caddy obtient le certificat HTTPS tout seul.
- Si un serveur web occupe déjà les ports 80 et 443, il faut plutôt lui ajouter un renvoi vers l'API : à adapter au cas par cas.

## Installer

```sh
sudo mkdir -p /opt/superbebe && sudo chown "$USER" /opt/superbebe
git clone --depth 1 https://github.com/BrunoCambianica/baby.git /opt/superbebe
cd /opt/superbebe/deploy
./preparer.sh api.exemple.fr          # crée .env : sous-domaine, clés des notifications
docker compose up -d --build
curl -s -H "Origin: https://brunocambianica.github.io" https://api.exemple.fr/v1/etat
```

Puis, dans l'app : adresse de l'API dans `app/js/famille.js` (`API_BASE = 'https://api.exemple.fr/'`), version suivante, `npm run deploy`.

## Mettre à jour

```sh
cd /opt/superbebe && git pull && cd deploy && docker compose up -d --build
```

## Données et durées de conservation

| Donnée | Lisible par le serveur | Conservation |
|---|---|---|
| Famille : bloc chiffré, empreinte du jeton, version, dates | Non (chiffré sur les téléphones) | 12 mois sans ouverture, ou effacement depuis l'app |
| Rappel du soir : adresse d'envoi du téléphone, heure | L'adresse d'envoi (fournie par Apple ou Google) et l'heure | Jusqu'à la désactivation, au plus 6 mois sans renouvellement |
| Fiche du jour à lien court : bloc chiffré | Non (la clé n'est que dans le lien) | 48 heures |
| Adresses IP | Non enregistrées : en mémoire, pour limiter les requêtes ; Caddy ne tient pas de journal d'accès | — |

Sauvegarde (illisible sans les liens de famille) : `docker compose cp api:/donnees/superbebe.sqlite ./sauvegarde.sqlite`.
