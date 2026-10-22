# App Android (version de test)

L'app Superbébé pour Android : l'app web en plein écran (WebView, sans barre de navigateur) et le widget d'écran d'accueil. Le widget exécute le même moteur de règles que l'app web et le widget iPhone, dans le bac à sable JavaScript d'Android (androidx.javascriptengine). Le moteur embarqué, `app/src/main/assets/superbebe-android.js`, est généré par `npm run build` à la racine du dépôt.

## Compiler

Le plus simple : ouvrir le dossier `android/` dans Android Studio, puis Build, Build APK(s).

En ligne de commande, avec le JDK 17 et le SDK Android 36 :

```sh
npm run build                          # à la racine : régénère le moteur embarqué
cd android && ./gradlew assembleDebug
cp app/build/outputs/apk/debug/app-debug.apk ../dist/superbebe-android.apk
```

## Fonctionnement

| Fichier | Rôle |
|---|---|
| `MainActivity.kt` | Affiche l'app web en plein écran et lui offre le pont `SuperbebeAndroid` : réglages et relevé de la chambre vers le widget, couleurs des barres du système, pose du widget, partage. Reprend la configuration envoyée depuis Chrome (lien `superbebe://config/SB1.…`). Propose l'APK publié s'il est plus récent (`dist/android-version.json`) |
| `SbWorker.kt` | Toutes les 30 minutes : météo Open-Meteo, appel du moteur, enregistrement des trois lignes |
| `SbEngine.kt` | Exécute le moteur JavaScript dans le bac à sable |
| `SbWidget.kt` | Widget Glance : affiche les lignes sur un ciel assorti à la météo (`res/drawable/widget_bg_*`) ; le toucher ouvre l'app |
| `SbStore.kt` | État local (préférences) et lecture de la configuration |

## Limites de la version de test

- APK signé avec une clé de débogage. Si la clé change d'un ordinateur à l'autre, il faut désinstaller avant de réinstaller.
- Nécessite Android 8 ou plus et une « Android System WebView » à jour, qui affiche l'app et fournit le bac à sable JavaScript.
- Les données de l'app (réglages, garde-robe) sont celles de l'app Android, distinctes de celles d'une app installée depuis Chrome.
- Pas encore testé sur un vrai téléphone au moment de l'écriture : premier test à faire avant de diffuser.
