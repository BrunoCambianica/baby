# Règles v0

Ce dossier contient les règles qui produisent la phrase du widget : le créneau de sortie, la tenue, la nuit et les achats à prévoir. Elles sont écrites en JSON pour que les apps iOS et Android les lisent telles quelles.

## Charte : des repères officiels, pas d'avis médical

1. L'app ne donne aucun avis médical. Elle ne traite ni la fièvre, ni les symptômes, ni les médicaments, et ne promet aucune sécurité.
2. Toute phrase qui touche à la santé ou à la sécurité relaie une source officielle. Elle est citée entre guillemets ou fidèlement résumée, avec le nom de l'organisme et un lien. Sont admises les autorités publiques françaises (niveau `A`) et, à défaut, une autorité publique étrangère nommée comme telle (`A-etranger`).
3. Les tenues, l'heure de sortie et les achats à prévoir sont des suggestions pratiques, présentées comme telles. Elles ne contredisent jamais un relais officiel.
4. Les indications des fabricants (TOG, norme NF EN 16781) sont présentées comme telles. L'étiquette du produit fait foi.
5. Aucun produit contraire aux repères officiels n'est proposé : tour de lit, couverture, couette, oreiller, cale-bébé, réducteur de lit, crème solaire avant 1 an.
6. Un message qui cite une source marquée `a_verifier` ne peut pas être publié.
7. `npm test` contrôle les points 2 et 4 avant de lancer les tests : un message officiel sans source publique fait échouer la commande.

## Fichiers

| Fichier | Rôle |
|---|---|
| `v0/rules.json` | Seuils, tables et déclencheurs |
| `v0/messages.fr.json` | Textes, avec leur type (`officiel`, `pratique`, `fabricant`, `meteo`) et leurs sources |
| `v0/sources.json` | Registre des sources : organisme, lien, niveau, statut de vérification |
| `v0/test-vectors.json` | Cas de test : une journée en entrée, la sortie attendue |
| `../engine/engine.js` | Moteur partagé par l'app web, le widget iPhone et les tests (sans dépendance) |

## Lancer les tests

```sh
npm test
node tools/run-vectors.js --show creneau-fortes-chaleurs   # résultat complet d'un cas, en JSON
```

## Entrée du moteur

| Champ | Contenu |
|---|---|
| `date`, `now` | Jour (`AAAA-MM-JJ`) et heure locale (`HH:MM`) |
| `profile` | `birth` (`AAAA-MM-JJ` ou `AAAA-MM`), `transport` (`poussette`, `porte_bebe`, `voiture`), `outing_window`, `outing_duration_h`, `outfit_offset` (de -2 à +2 selon les retours « trop chaud / trop froid »), `room_temp_c`, `inventory` (`{ catégorie: [tailles possédées] }`) |
| `forecast` | `daylight` (`sunrise`, `sunset`), `hourly` (`time`, `temp_c`, `feels_c`, `precip_prob`, `precip_mm`, `gust_kmh`, `uv`), `daily.tmax_c` facultatif |
| `alerts` | `vigilance` (`[{ phenomenon, color }]`, couleurs Météo-France), `air` (`{ episode, pollutant }`) |
| `outlook` | Semaines à venir : `week_start`, `tmax_mean`, `tmean`, `rainy_days`, `uv_max_mean` |

Le profil ne quitte jamais le téléphone. Le serveur ne fournit que `forecast`, `alerts` et `outlook` pour une zone de 5 km.

## Avant toute diffusion publique

- Relire chaque source qui n'est pas marquée `lu` (le runner en affiche la liste).
- Faire relire les textes par un professionnel de santé et par un juriste.
- Comparer les tableaux TOG de trois marques vendues en France.
