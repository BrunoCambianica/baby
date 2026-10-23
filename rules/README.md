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
| `profile` | Un enfant : `birth` (`AAAA-MM-JJ` ou `AAAA-MM`), `transport` (`poussette`, `porte_bebe`, `a_pied` à partir de 2 ans, `voiture`), `outing_window`, `outing_duration_h`, `outfit_offset` (de -2 à +2, réglage « Tendance »), `room_temp_c` (sa chambre, pour la nuit), `day_room_temp_c` (la pièce où il passe la journée, pour la tenue à la maison), `day_style` (`sans_pyjama` ou rien), `night_options` (tenue de nuit choisie par tranche : `{ n20: 'tog-1' }`), `inventory` (`{ catégorie: [tailles possédées] }`). Plusieurs enfants : un appel par enfant |
| `forecast` | `daylight` (`sunrise`, `sunset`), `hourly` (`time`, `temp_c`, `feels_c`, `precip_prob`, `precip_mm`, `gust_kmh`, `uv`), `daily.tmax_c` facultatif |
| `alerts` | `vigilance` (`[{ phenomenon, color }]`, couleurs Météo-France), `air` (`{ episode, pollutant }`) |
| `outlook` | Semaines à venir : `week_start`, `tmax_mean`, `tmean`, `rainy_days`, `uv_max_mean` |

Le profil ne quitte jamais le téléphone.

## Âges et modes de sortie

- `outfit.age_variants` : tenues propres aux enfants de 2 ans et plus (haut et pantalon plutôt que body et pyjama, manteau plutôt que combinaison, pas de chancelière), tranche par tranche.
- `outfit.transport` : chaque mode décale la tranche (`band_shift`), remplace ou retire des vêtements et choisit la protection contre la pluie (`rain_gear`). `a_pied` n'existe qu'à partir de `min_age_m` ; plus jeune, l'enfant est habillé comme en poussette. En voiture, combinaison et manteau deviennent une couverture par-dessus le harnais.
- `night.baby_only` : repères du couchage du nourrisson, affichés jusqu'à `baby_until_months`.

## Tenues au choix

- `outfit.day_styles` : styles de la journée choisis pour l'enfant. `sans_pyjama` remplace le pyjama par un pantalon (et des chaussettes, sauf pour le pyjama léger), dehors comme à la maison ; la nuit ne change pas.
- `night.tog_hint.bins[].alternatives` : pour une tranche de chambre, d'autres tenues publiées par un fabricant (`sources`, niveau C), au choix selon la gigoteuse qu'on a. Le choix est gardé pour la tranche (`id`) seulement ; un choix inconnu (retiré des règles) redonne la tenue principale.
- Ce qu'on met sous la gigoteuse s'additionne à son TOG : le contrôle de la charte refuse une tenue de nuit non compensée. Gigoteuse plus légère que la principale : vêtements plus chauds (indices `journee.warmth`) ; plus chaude : vêtements plus légers ; même TOG : une couche fine d'écart au plus. Le jour, un style ne rend jamais la tenue plus chaude.
- Tailles : en mois jusqu'à 24 mois, puis en années ; plus de gigoteuse proposée après 36 mois.

## La journée en couches (`journee`)

Habillé une fois le matin pour la journée dehors (la plage horaire des réglages) :

1. Chaque heure reçoit la tranche de son ressenti (décalée par la tendance et le mode de sortie).
2. La journée est découpée en au plus trois périodes d'au moins `min_hold_h` heures : une heure trop couverte coûte `over_weight`, une heure pas assez couverte `under_weight`, un changement `change_cost`. Au départ du matin, jamais moins couvert que la première heure ne le demande.
3. Body et pyjama (ou haut et pantalon) ne changent pas dans la journée (`fixed_slots`) : ceux de la période la plus douce, au plus `base_max_drop` tranche sous ceux du matin (`base_max_drop_under_dessus` sous une combinaison ; 0 après 2 ans, le manteau ne couvrant pas les jambes).
4. Bonnet, moufles, chaussons et chancelière (`extremities`) suivent la tranche ; au soleil, le bonnet devient un chapeau. Combinaison, pull et gilet suivent la chaleur des vêtements (`warmth`, indices pratiques sans portée sanitaire) : en se réchauffant on enlève, en se refroidissant on remet, d'abord ce qui a été enlevé plus tôt.
5. Le sac, `bag.max_items` objets au plus : la couche à remettre plus tard, la couche du dessus à pied ou en voiture, la protection contre la pluie (`bag.rain_prob_at_least`), un chapeau au soleil, puis ce qui manquerait aux heures plus fraîches. Un changement ne remet que ce qui est porté ou dans le sac.
6. Le geste à rappeler (`check`) et les alertes officielles qui passent avant le plan dans le widget (`widget_urgent_relays`).

## Avant toute diffusion publique

- Relire chaque source qui n'est pas marquée `lu` (le runner en affiche la liste).
- Faire relire les textes par un professionnel de santé et par un juriste.
- Comparer les tableaux TOG de trois marques vendues en France.
