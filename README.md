# Superbébé

App web installable et widgets iPhone et Android : quand sortir avec bébé, comment l'habiller, et ce qu'il lui faudra bientôt. Toute information de santé relaie une source officielle citée ; l'app ne donne pas d'avis médical.

- App : <https://brunocambianica.github.io/baby/>
- Guide pour les parents qui testent : [TESTER.md](TESTER.md)
- Règles et charte des sources : [rules/README.md](rules/README.md)

## Structure

| Dossier | Contenu |
|---|---|
| `app/` | App web installable (PWA) : page, styles, modules JS, service worker, icônes |
| `engine/` | Moteur de règles et adaptateur Open-Meteo, partagés par l'app et le widget |
| `rules/` | Règles v0 en JSON, textes, registre des sources, cas de test |
| `widget/` | Widget iPhone pour Scriptable : chargeur, source, fichiers générés |
| `android/` | Widget Android natif (Kotlin, Glance), même moteur exécuté dans le bac à sable JavaScript : voir [android/README.md](android/README.md) |
| `dist/` | APK de test du widget Android, servi par le site |
| `tools/` | Tests, génération des widgets et des icônes, serveur local |

## Commandes

Node 18 ou plus, aucune dépendance à installer.

```sh
npm test          # charte des sources, 38 cas de règles, adaptateur, widgets iPhone et Android
npm run build     # icônes, widgets iPhone et Android (moteur embarqué), version reportée dans l'app
npm run serve     # http://localhost:8080/baby/app/
npm run deploy    # pousse main, puis publie la même version sur la branche gh-pages
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
| Widget Android | L'app du widget affiche « Installer la version … » dès qu'un nouvel APK est publié (`dist/android-version.json`) ; on la télécharge et on l'installe par-dessus. Si l'APK a été compilé sur un autre ordinateur (clé de signature différente), il faut d'abord désinstaller l'ancienne version. |

## Données et vie privée

Pas de compte ni de serveur : les réglages restent dans le téléphone. L'app interroge Open-Meteo avec les coordonnées du centre de la commune, et geo.api.gouv.fr pour trouver la commune.
