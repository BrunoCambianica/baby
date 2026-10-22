# Superbébé

App web installable et widgets iPhone et Android : quand sortir avec bébé, comment l'habiller, et ce qu'il lui faudra bientôt. Toute information de santé relaie une source officielle citée ; l'app ne donne pas d'avis médical.

- App : <https://brunocambianica.github.io/baby/>
- Guide pour les parents qui testent : [TESTER.md](TESTER.md)
- Règles et charte des sources : [rules/README.md](rules/README.md)

## Structure

| Dossier | Contenu |
|---|---|
| `app/` | App web installable (PWA) : page, styles, modules JS, service worker, icônes |
| `fiche/` | Page de la fiche du jour envoyée à la nounou, à la crèche ou aux grands-parents : les données sont dans le lien, après le `#` |
| `engine/` | Moteur de règles, adaptateur Open-Meteo et dessins des vêtements (`drawings.js`), partagés par l'app et les widgets |
| `rules/` | Règles v0 en JSON, textes, registre des sources, cas de test |
| `widget/` | Widget iPhone pour Scriptable : chargeur, source, fichiers générés |
| `android/` | App Android : l'app web en plein écran et le widget natif (Kotlin, Glance), même moteur exécuté dans le bac à sable JavaScript : voir [android/README.md](android/README.md) |
| `dist/` | APK de test de l'app Android, servi par le site |
| `api/` | API pour le VPS (Node 24, sans dépendance) : familles chiffrées entre parents, rappel du soir par Web Push, fiches à lien court ; tests : `npm test` |
| `deploy/` | Docker Compose et Caddy pour le VPS : voir [deploy/README.md](deploy/README.md) |
| `tools/` | Tests, génération des widgets et des icônes, serveur local, parcours navigateur (`tools/e2e/`), installation de la chaîne Android |

## Commandes

Node 18 ou plus, aucune dépendance à installer pour l'app et les tests.

```sh
npm test          # charte des sources, cas de règles, adaptateur, foyer, widgets iPhone et Android
npm run build     # icônes, dessins Android, widgets iPhone et Android (moteur embarqué), version reportée dans l'app
npm run serve     # http://localhost:8080/baby/app/
npm run e2e       # parcours de l'app dans Chromium (Playwright), captures dans tools/e2e/captures/
npm run deploy    # pousse main, puis publie la même version sur la branche gh-pages
```

Outils à installer une fois, hors du dépôt et sans droits administrateur :

```sh
tools/e2e/installer.sh        # Playwright, Chromium et ses bibliothèques système si elles manquent
tools/installer-android.sh    # JDK 17 et SDK Android dans ~/.local/share/superbebe/android
tools/compiler-apk.sh         # compile l'APK de test dans dist/
```

## Première mise en ligne

Le site est statique : tous les chemins sont relatifs et les widgets récupèrent l'adresse réelle du site. N'importe quel hébergeur de fichiers statiques convient. Deux options :

- **Option A, GitHub Pages** (gratuit si le dépôt est public ; option retenue) :
  1. Settings, General, Change visibility : Public.
  2. Settings, Pages, Source « Deploy from a branch », branche `gh-pages`, dossier `/ (root)`.
  3. Le site est en ligne en une à deux minutes sur <https://brunocambianica.github.io/baby/>.
- **Option B, dépôt privé sur Netlify ou Cloudflare Pages** (gratuit) :
  1. Importer le dépôt GitHub, branche `main`, sans commande de build, dossier publié : la racine du dépôt.
  2. Le site est en ligne sur l'adresse fournie (par exemple `https://superbebe.netlify.app/`).
  3. Mettre cette adresse dans `homepage` (`package.json`) et dans `DEFAULT_BASE_URL` (`android/…/SbStore.kt`) : elles ne servent que de repli.

## Mettre en ligne une nouvelle version

1. Modifier `version` dans `package.json` (et, si le widget Android change, `versionCode` et `versionName` dans `android/app/build.gradle.kts`).
2. `npm run build && npm test`, et recompiler l'APK si le widget Android ou le moteur a changé (voir `android/README.md`).
3. Commit, puis `npm run deploy`. GitHub Pages publie la branche `gh-pages` en une à deux minutes.

## Comment les téléphones reçoivent les mises à jour

| Partie | Mise à jour |
|---|---|
| App installée (iPhone et Android) | Automatique. À l'ouverture suivante, l'app télécharge la nouvelle version en arrière-plan et affiche « Nouvelle version prête · Recharger » ; elle s'applique d'office au retour suivant dans l'app. Réglages, « Rechercher une mise à jour » force la vérification. |
| Widget iPhone (Scriptable) | Automatique : le chargeur récupère le nouveau code au plus tard six heures après la mise en ligne. |
| App Android | L'app web qu'elle affiche se met à jour comme ci-dessus. Pour l'app elle-même, une fenêtre propose de télécharger le nouvel APK dès qu'il est publié (`dist/android-version.json`), au plus une fois par jour ; on l'installe par-dessus. Si l'APK a été compilé sur un autre ordinateur (clé de signature différente), il faut d'abord désinstaller l'ancienne version. |

## Liens entre l'app et les widgets

| Téléphone | Réglages vers le widget | Toucher le widget |
|---|---|---|
| iPhone | Le script copié contient les réglages de tous les enfants. Ensuite, Réglages, « Envoyer mes réglages au widget » (lien `scriptable:///run/Superbébé?config=…`). Un widget par enfant : champ Parameter du widget = prénom ou numéro. | Relance le script, qui ouvre l'app en plein écran dans Scriptable, sur l'enfant du widget (`app/?hote=scriptable&enfant=…#import=…`) ; l'app y renvoie réglages et relevés des chambres par des liens `superbebe-sync:`. |
| Android | L'app web appelle le pont `SuperbebeAndroid` à chaque changement. Un widget par enfant : choisi à la pose, ou « Le widget de Léo » dans l'app. | Ouvre l'app Android sur l'enfant du widget. |

La configuration (`SB1.` suivi d'un JSON en base64url) existe en deux versions : v1, un seul enfant, lue pour les anciens widgets ; v2, la commune, les horaires, les enfants (`k`) et la date du dernier changement (`m`). L'app n'applique une configuration reçue d'un widget que si elle est plus récente que la sienne. Une app Android antérieure à la 0.6 reçoit encore une configuration v1, celle de l'enfant affiché.

## L'API (facultative)

Sans adresse d'API (`API_BASE` vide dans `app/js/famille.js`), l'app reste entièrement locale. Avec l'API, sur le VPS :

- **Profils partagés entre parents, sans compte** : un secret de 32 octets, dans le lien de famille (après le `#`), donne l'identifiant, le jeton d'accès et la clé de chiffrement (HKDF). Le foyer est chiffré sur le téléphone (AES-GCM) ; le serveur ne garde qu'un bloc illisible et l'empreinte du jeton. Les deux téléphones fusionnent leurs versions (enfant le plus récent, relevé de chambre le plus récent, retraits gardés).
- **Rappel du soir sur l'app de l'écran d'accueil** (iPhone 16.4 et plus) : notification Web Push vide à l'heure choisie ; le service worker calcule le rappel sur le téléphone (`app/sw-moteur.js`).
- **Fiche du jour à lien court** : chiffrée avec une clé qui n'est que dans le lien, gardée 48 heures ; `/r/…` renvoie vers `fiche/?r=…`, le navigateur gardant la clé après le `#`.

## Données et vie privée

Pas de compte ni de serveur : les réglages et les prénoms restent dans le téléphone. Le rappel du soir, s'il est activé, est une notification locale (app Android, ou Scriptable sur iPhone), calculée sur le téléphone. L'app interroge Open-Meteo avec les coordonnées du centre de la commune, et geo.api.gouv.fr pour trouver la commune. « Envoyer les profils » à l'autre parent produit un lien qui contient les prénoms ; il passe par la messagerie choisie, jamais par un serveur de Superbébé.
