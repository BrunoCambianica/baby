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
| `profile` | Un enfant : `birth` (`AAAA-MM-JJ` ou `AAAA-MM`), `transport` (`poussette`, `porte_bebe`, `a_pied` à partir de 2 ans, `voiture`), `outing_window`, `outing_duration_h`, `outfit_offset` (de -2 à +2, réglage « Tendance »), `room_temp_c` (sa chambre, pour la nuit), `day_room_temp_c` (la pièce où il passe la journée, pour la tenue à la maison), `day_style` (`sans_pyjama` ou rien), `night_options` (tenue de nuit choisie par tranche : `{ n20: 'tog-1' }`), `inventory` (`{ catégorie: [tailles] }`, une taille par pièce possédée : `['6m', '6m', '6m']`, trois en 6 mois), `wash_days` (jours entre deux lessives, commun au foyer ; sinon `purchases.quantities.wash_days_default`). Plusieurs enfants : un appel par enfant |
| `forecast` | `daylight` (`sunrise`, `sunset`), `hourly` (`time`, `temp_c`, `feels_c`, `precip_prob`, `precip_mm`, `gust_kmh`, `uv`), `daily.tmax_c` facultatif |
| `alerts` | `vigilance` (`[{ phenomenon, color }]`, couleurs Météo-France), `air` (`{ episode, pollutant }`) |
| `outlook` | Semaines à venir : `week_start`, `tmax_mean`, `tmean`, `rainy_days`, `uv_max_mean` |

Le profil ne quitte jamais le téléphone.

## Âges et modes de sortie

- `outfit.age_variants` : tenues propres aux enfants de 2 ans et plus (haut et pantalon plutôt que body et pyjama, manteau plutôt que combinaison, pas de chancelière), tranche par tranche.
- `outfit.transport` : chaque mode décale la tranche (`band_shift`), remplace ou retire des vêtements et choisit la protection contre la pluie (`rain_gear`). `a_pied` n'existe qu'à partir de `min_age_m` ; plus jeune, l'enfant est habillé comme en poussette. En voiture, combinaison et manteau deviennent une couverture par-dessus le harnais. `poussette_chanceliere` : la poussette quand une chancelière est notée dans la garde-robe (`inventory.chanceliere`, ou `stroller_muff` reçu par les widgets), avant `max_age_m` : la chancelière remplace la combinaison, sans chaussons, et la combinaison va dans le sac (`carry_reason`) ; `base` : le mode choisi par le parent, pour l'affichage et les achats.
- `night.baby_only` : repères du couchage du nourrisson, affichés jusqu'à `baby_until_months`.

## Tenues au choix

- `outfit.day_styles` : styles de la journée choisis pour l'enfant. `sans_pyjama` remplace le pyjama par son équivalent en vêtements de jour, pas par une couche de moins : un haut (t-shirt pour le pyjama léger, haut ML sinon), un pantalon, et des chaussettes sauf pour le pyjama léger ; dehors comme à la maison ; la nuit ne change pas.
- `outfit.alternatives` : pièces au choix, en touchant une pièce de la tenue (dedans ou dehors, pas la nuit). Une paire (`pairs`) est un équivalent du même rôle (`journee.slots`), de même couverture (`coverage` : haut du corps ou corps entier) et aussi chaude à `max_warmth_gap` près (`journee.warmth`) : le contrôle de la charte refuse les autres. Le choix vaut pour un jour ou toujours (`profile.swaps`, { pièce : { to, day } }) ; le moteur le revérifie chaque jour et ne l'applique pas si le mode de sortie retire ou remplace l'équivalent (en voiture, la couverture par-dessus le harnais reste). Les plans gardent leur calcul : seules les pièces changent de nom. Ne se remplacent pas, avec leur raison : le dessous (`locked_slots` : il se choisit avec `day_styles`), tête, mains et pieds (ce que le ressenti demande), la chancelière (garde-robe), et ce que le mode impose (`locked_items`).
- `night.tog_hint.bins[].alternatives` : pour une tranche de chambre, d'autres tenues publiées par un fabricant (`sources`, niveau C), au choix selon la gigoteuse qu'on a. Le choix est gardé pour la tranche (`id`) seulement ; un choix inconnu (retiré des règles) redonne la tenue principale.
- Ce qu'on met sous la gigoteuse s'additionne à son TOG : le contrôle de la charte refuse une tenue de nuit non compensée. Gigoteuse plus légère que la principale : vêtements plus chauds (indices `journee.warmth`) ; plus chaude : vêtements plus légers ; même TOG : une couche fine d'écart au plus. Le jour, un style (et le porte-bébé) couvre autant que le pyjama qu'il remplace : un haut, un pantalon, et des chaussettes pour un pyjama à pieds.
- Tailles : en mois jusqu'à 24 mois, puis en années ; plus de gigoteuse proposée après 36 mois.

## Achats à prévoir et quantités (`purchases`)

Suggestions pratiques, sans portée sanitaire, sur `horizon_weeks` semaines : la catégorie dont la saison arrive (`need_if`) ou dont la taille change, dans la taille qui servira encore `size_lookahead_days` jours plus tard, à prévoir `lead_days` jours avant.

- Quantité conseillée : pour les vêtements de tous les jours (`per_day`), de quoi tenir entre deux lessives plus une pièce de rechange, `per_day` × `wash_days` + `quantities.spare` (7 bodies pour une lessive tous les 3 jours) ; les pyjamas comptent double portés aussi la journée (`per_day_by_style`). Sinon un nombre fixe, `quantity` (deux gigoteuses : une portée, une au lavage), 1 par défaut.
- Une catégorie est proposée tant qu'il en manque dans la taille du moment ou la suivante : la suggestion dit combien (`quantity`, `owned`).
- Gigoteuses (`sleepbags`) : notées par taille et par TOG (`gigoteuse: ['6-18m|2,5']`). Chaque saison a sa catégorie et ses TOG (`togs`), pris dans le tableau de nuit des fabricants (contrôlé par lint) : hiver (`week_tmean_below`) 2 à 3,5 TOG, mi-saison 1 à 2 TOG, été (`week_tmax_at_least`) 0,2 à 1 TOG ; une gigoteuse compte pour chaque saison où son TOG sert. Celles notées avant la 0.16 sans TOG (`legacy`) comptent comme 2,5 TOG (chaude) ou 1 TOG (légère).
- `suggest_once_noted` (bodies, hauts, pantalons, pyjamas, chaussettes) : proposé seulement quand le parent en a noté dans sa garde-robe ; sans rien noté, on ne sait pas ce qu'il a.

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
