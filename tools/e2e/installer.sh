#!/usr/bin/env bash
# Prépare les parcours navigateur : Playwright, Chromium et, sans droits administrateur,
# les bibliothèques système qui manquent souvent sous WSL (libnss3, libnspr4, libasound2).
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIBS="${SB_LIBS:-$HOME/.local/share/superbebe/libs}"
cd "$HERE"
npm install --no-audit --no-fund --silent
npx playwright install chromium > /dev/null
missing=$(ldd "$(find ~/.cache/ms-playwright -path '*chrome-linux*/chrome' -type f | head -1)" 2>/dev/null | grep 'not found' || true)
if [ -n "$missing" ] && [ ! -d "$LIBS/usr/lib" ]; then
  echo "Bibliothèques manquantes, extraites dans $LIBS"
  tmp="$(mktemp -d)"
  (cd "$tmp" && apt-get download libnss3 libnspr4 libasound2t64 2>/dev/null || apt-get download libnss3 libnspr4 libasound2)
  mkdir -p "$LIBS"
  for deb in "$tmp"/*.deb; do dpkg -x "$deb" "$LIBS"; done
  rm -rf "$tmp"
fi
echo "Parcours prêts : npm run e2e à la racine du dépôt"
