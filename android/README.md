# App Android (version de test)

L'app Superbébé pour Android : l'app web en plein écran (WebView, sans barre de navigateur) et le widget d'écran d'accueil. Le widget exécute le même moteur de règles que l'app web et le widget iPhone, dans le bac à sable JavaScript d'Android (androidx.javascriptengine). Le moteur embarqué, `app/src/main/assets/superbebe-android.js`, est généré par `npm run build` à la racine du dépôt.

## Compiler

Le plus simple : ouvrir le dossier `android/` dans Android Studio, puis Build, Build APK(s).

En ligne de commande, avec le JDK 17 et le SDK Android 36, installés au besoin par `tools/installer-android.sh` :

```sh
npm run build              # à la racine : régénère le moteur embarqué (et les données des tests des widgets)
tools/compiler-apk.sh      # teste les widgets (Robolectric), compile, puis copie l'APK dans dist/superbebe-android.apk
```

## Fonctionnement

| Fichier | Rôle |
|---|---|
| `MainActivity.kt` | Affiche l'app web en plein écran et lui offre le pont `SuperbebeAndroid` : réglages et relevés (chambres, pièces de jour) vers les widgets, relevés notés sur le widget Maison vers l'app (`readings`), couleurs des barres du système, pose d'un widget par enfant, partage d'un texte ou de l'image de la fiche du jour (`FileProvider`, cache de l'app). Reprend la configuration envoyée depuis Chrome (lien `superbebe://config/SB1.…`). Propose l'APK publié s'il est plus récent (`dist/android-version.json`) |
| `SbWorker.kt` | Toutes les 30 minutes : météo Open-Meteo, appel du moteur pour chaque enfant (`sbAndroidAll`), enregistrement des lignes et des tenues de la maison pour chaque relevé possible |
| `SbEngine.kt` | Exécute le moteur JavaScript dans le bac à sable |
| `SbWidget.kt` | Widget Glance : affiche les lignes de son enfant sur un ciel assorti à la météo (`res/drawable/widget_bg_*`), la tenue en dessins ; le toucher ouvre l'app sur cet enfant (`superbebe://enfant/…`). `SbPinReceiver` attache l'enfant au widget posé depuis l'app |
| `SbHomeWidget.kt` | Widget Maison : de 6 h à 18 h la pièce où vit l'enfant, ensuite sa chambre ; − et + notent la température (un demi-degré, `SbRoomStep`), la toucher la note telle quelle ; la tenue suit tout de suite, lue dans la table calculée par le moteur, sans réseau. Le toucher ailleurs ouvre l'app sur l'onglet Maison (`superbebe://maison/…`) |
| `SbReminder.kt` | Rappel du soir activé dans l'app : autorisation des notifications (Android 13 et plus), calcul à l'heure choisie, une notification par jour au plus avec la tenue et le sac de demain de chaque enfant, et la nuit |
| `SbWidgetConfigure.kt` | Choix de l'enfant d'un widget : à la pose avant Android 12, ou appui long, « Modifier le widget » ; rien à choisir avec un seul enfant |
| `SbDrawings.kt`, `res/drawable/drawing_*.xml` | Dessins des vêtements, générés par `npm run build` (tools/make-drawings.js) à partir de `engine/drawings.js` : ne pas modifier à la main |
| `SbStore.kt` | État local (préférences) et lecture de la configuration |

## Limites de la version de test

- APK signé avec une clé de débogage. Si la clé change d'un ordinateur à l'autre, il faut désinstaller avant de réinstaller.
- Nécessite Android 8 ou plus et une « Android System WebView » à jour, qui affiche l'app et fournit le bac à sable JavaScript.
- Les données de l'app (réglages, garde-robe) sont celles de l'app Android, distinctes de celles d'une app installée depuis Chrome.
- Les widgets sont testés sur l'ordinateur (`app/src/test`, Robolectric : rendu Glance réel, boutons du widget Maison), pas l'app elle-même ; les essais sur un vrai téléphone restent indispensables.
- Glance ne relance `provideGlance` qu'à l'ouverture d'une session (45 secondes au moins) : les widgets lisent leurs données dans la composition, et chaque mise à jour passe par `refreshWidgets`, qui change leur état Glance (sinon le widget reste sur son premier affichage).
