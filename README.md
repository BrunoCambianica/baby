# Superbébé

App web installable et widget iPhone : quand sortir avec bébé, comment l'habiller, et ce qu'il lui faudra bientôt. Toute information de santé relaie une source officielle citée ; l'app ne donne pas d'avis médical.

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
npm test          # charte des sources, 36 cas de règles, adaptateur, widgets iPhone et Android
npm run build     # icônes, widgets iPhone et Android (moteur embarqué), version reportée dans l'app
npm run serve     # http://localhost:8080/baby/app/
npm run deploy    # pousse main, puis publie la même version sur la branche gh-pages
```

## Première mise en ligne

Le site est statique : tous les chemins sont relatifs et le widget iPhone récupère l'adresse réelle du site. N'importe quel hébergeur de fichiers statiques convient. Le dépôt étant privé, deux options :

- **Option A, GitHub Pages** (gratuit si le dépôt est public) :
  1. Settings, General, Change visibility : Public.
  2. Settings, Pages, Source « Deploy from a branch », branche `gh-pages`, dossier `/ (root)`.
  3. Le site est en ligne en une à deux minutes sur <https://brunocambianica.github.io/baby/>.
- **Option B, dépôt privé sur Netlify ou Cloudflare Pages** (gratuit) :
  1. Importer le dépôt GitHub, branche `main`, sans commande de build, dossier publié : la racine du dépôt.
  2. Le site est en ligne sur l'adresse fournie (par exemple `https://superbebe.netlify.app/`).
  3. Mettre cette adresse dans `homepage` (`package.json`) et dans `DEFAULT_BASE_URL` (`android/…/SbStore.kt`) : elles ne servent que de repli.

## Mettre en ligne une nouvelle version

1. Modifier `version` dans `package.json` : le cache des téléphones sera renouvelé.
2. `npm run build && npm test`
3. Commit, puis `npm run deploy`. GitHub Pages publie la branche `gh-pages` en une à deux minutes.

## Données et vie privée

Pas de compte ni de serveur : les réglages restent dans le téléphone. L'app interroge Open-Meteo avec les coordonnées du centre de la commune, et geo.api.gouv.fr pour trouver la commune.
