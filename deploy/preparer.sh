#!/bin/sh
# Prépare deploy/.env sur le serveur : sous-domaine de l'API et clés des notifications (créées une seule fois :
# en changer obligerait chaque téléphone à réactiver le rappel du soir).
# Usage : ./preparer.sh api.exemple.fr
set -eu
cd "$(dirname "$0")"
DOMAINE="${1:?Usage : ./preparer.sh api.exemple.fr}"
[ -f .env ] || cp .env.exemple .env
sed -i "s|^DOMAINE=.*|DOMAINE=$DOMAINE|" .env
if ! grep -q '^VAPID_PUBLIQUE=.' .env; then
  CLES=$(docker compose run --rm --no-deps api node cles-vapid.js)
  sed -i '/^VAPID_PUBLIQUE=/d; /^VAPID_PRIVEE=/d' .env
  printf '%s\n' "$CLES" >> .env
fi
chmod 600 .env
echo "deploy/.env prêt pour $DOMAINE (clés des notifications comprises)."
