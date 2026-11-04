# Extérieur et Intérieur : la refonte de l'affichage et ce qu'elle ouvre

Cadrage ouvert le 4 novembre 2026, avec la version 0.23.0 (onglets alors nommés Dehors et Dedans). À mettre à jour à chaque étape : cases cochées, journal en bas.

## 1. La demande

- Deux onglets : **Extérieur** en premier, **Intérieur** en second (Achats reste le troisième).
- Extérieur :
  - Aujourd'hui / Demain ;
  - le mode de sortie (poussette, porte-bébé, voiture) ;
  - la tenue **pour un créneau donné**, pas un sac de voyage pour la journée. Exemple : à 9 h, prévoir une sortie d'une heure à 11 h, d'un geste simple, une heure par défaut, et changer le créneau facilement.
- La préconisation de sortie reste ; son explication n'apparaît que si on la demande.
- Intérieur :
  - Jour / Nuit, comme Aujourd'hui / Demain ;
  - une température par moment, gardée comme une habitude (19 °C la nuit, 22 °C le jour : on bascule, chacun retrouve la sienne) ;
  - le jour et la nuit diffèrent par les vêtements, sans gigoteuse le jour.

## 2. Ce qui est fait (0.23.0 et 0.24.0, en ligne)

**Extérieur**

- Le ciel dit le créneau idéal (« Idéal pour sortir 10–11 h · 9° ressentis · sec »). **Choisir**, à côté, y fait partir la sortie et ouvre la bande des heures dessus (0.24.0). **Pourquoi ?** déplie la raison (« Au sec avant la pluie de 12 h »). Sans créneau, la raison courte, et le détail sous « Pourquoi ? ».
- **Votre sortie**, dans le ciel : une bande d'heures, chacune avec son ciel, son ressenti et une étiquette (« idéal », « bien », « pluie », « nuit », « en cours »).
  - On touche l'heure de départ ; les heures couvertes s'allument.
  - La durée se choisit à côté : 30 min (0.24.0), 1 h par défaut, jusqu'à 4 h. Elle est partagée avec l'autre parent, comme dans les réglages.
  - Sans choix, la sortie part **maintenant** (0.24.0 ; en 0.23.0 : le créneau idéal) ; demain, au début de la plage horaire.
  - Aujourd'hui, la bande part de l'heure en cours ; demain, de 7 h.
- La carte **« De 11 h à 12 h »** :
  - le temps de ces heures ;
  - le mode de sortie en trois boutons visibles ;
  - la tenue entière, avec **+** sur ce qu'on ajoute à la tenue de la maison et, à part, ce qu'on enlève ;
  - un changement en route à partir de 4 h (« Vers 12 h · plus doux ») ;
  - **le sac de cette sortie seulement** ;
  - **En rentrant** (0.24.0) : ce qu'on lui enlève à la maison, même s'il faut le réveiller (NHS), et si le dessous change aussi ;
  - les conseils, puis le lien vers le guide.
- La sortie choisie est gardée pour la journée sur ce téléphone. Une sortie commencée reste « Maintenant → 10 h 40 » jusqu'à sa fin.
- Le soir, une fois la dernière sortie possible passée, l'onglet passe seul à demain. Aujourd'hui reste à un toucher.
- **Retour de la sortie** (0.24.0) : une sortie choisie, une fois finie, vient en tête pendant deux heures, avec ce qu'on lui enlève et « Pendant la sortie, il avait… ». La réponse porte sur cette sortie (heure, durée, mode, ressenti). Plus tard, la question reste à sa place. Depuis 0.24.1, la sortie par défaut compte aussi : maintenant, pour la durée réglée, notée dès qu'on la voit (sauf dans la demi-heure après une sortie : on rentre), elle garde son heure de fin, et la question porte sur elle, à sa place (une sortie par défaut n'a peut-être été qu'un coup d'œil). Sans aucune sortie notée, la question porte sur la journée.
- Les repères officiels et **la fiche de la journée** (pour la nounou) restent dessous.

**Intérieur**

- **Jour / Nuit** en haut, selon l'heure à l'ouverture (6 h à 18 h).
- Dans le ciel, la température du moment avec − et + :
  - le jour, la pièce où il passe la journée (21 °C proposé) ;
  - la nuit, sa chambre (19 °C proposé).
- Ces températures n'expirent plus (avant : 16 heures). Notée il y a plus de 7 jours, l'app demande d'un toucher si c'est toujours la bonne.
- Le jour : sa tenue (sans gigoteuse), avec ou sans pyjama, les repères dépliables.
- La nuit : la gigoteuse et la tenue dessous, la tenue selon sa gigoteuse, les repères du coucher.

**Sous le capot**

- Le moteur et les règles ne changent pas : la tenue d'une sortie est la « journée » du moteur réduite à ses heures. Donc pas d'APK, et les widgets restent identiques.
- Parcours navigateur réécrits pour les deux onglets, tous verts. `TESTER.md` est à jour.
- Captures des parcours : `tools/e2e/captures/` (`l2-sortie-*`, `l3-veille-au-soir`, `l5-*`, `l6-*`, `paysage-*`).

## 3. Choix faits par défaut, à valider

| Choix | Pourquoi | Autre option |
|---|---|---|
| Onglets nommés **Extérieur** et **Intérieur** (choix du 4 novembre, 0.24.0) | Les mots de la demande ; le guide garde « Dehors », « À la maison », « La nuit » dans ses textes | « Dehors » / « Dedans » (0.23.0) |
| Sortie par défaut : **maintenant** (choix du 4 novembre, 0.24.0), l'idéal à un toucher (« Choisir ») ; demain, le début de la plage horaire | On ouvre l'app pour sortir maintenant, le plus souvent | Le créneau idéal (0.23.0) |
| Durées **30 min, 1, 2, 3, 4 h** (30 min en 0.24.0) | Le moteur raisonne par heure : 30 min prend l'heure entamée ; à 4 h, un changement en route devient possible | « Toute la journée » |
| La bande va jusqu'à **21 h** | Les sorties du soir (aller chercher à la crèche) | Seulement la plage horaire des réglages |
| Plage horaire des réglages gardée | Elle borne la recherche du créneau idéal et la fiche de la journée | La supprimer et chercher sur toute la journée |
| Températures du dedans **sans expiration**, redemandées après **7 jours** | « Habitudes gardées » ; une valeur d'octobre peut être fausse en été | Pas de rappel, ou 3 jours |
| La fiche nounou garde **la journée entière** | La nounou ou la crèche gèrent toute la journée, pas une sortie | La fiche d'une sortie |

## 4. Les impacts

| Surface | Ce que la refonte change | À faire |
|---|---|---|
| Moteur, règles, guide | Rien. Une sortie de moins de 4 h n'a jamais de changement en route (deux heures au moins par étape, `journee.min_hold_h`). | — |
| **Widgets iPhone et Android** | Depuis 0.25.0 (A), la même sortie que l'app : en cours, choisie, sinon maintenant pour la durée réglée ; le soir, celle de demain (choisie, sinon au début de la plage horaire) ; la fiche garde la journée entière. La sortie part de l'app vers le widget : sur Android tout de suite, sur iPhone quand l'app est ouverte depuis le widget. | Fait (0.25.0, APK) |
| **Températures dans les widgets** | Gardées comme des habitudes, comme dans l'app (0.25.0 : `SbStore.kt`, widget iPhone, service worker) ; avant, oubliées après 16 h. | Fait (0.25.0, APK) |
| Rappel du soir | Il annonce la sortie de demain (choisie, sinon au début de la plage horaire), sa tenue, son sac, et la nuit. | Fait (0.25.0) |
| « C'était juste ? » | Une réponse par jour, sur la dernière sortie finie, choisie ou par défaut (C, 0.24.0 ; la sortie par défaut depuis 0.24.1, `a` dans la réponse). Une sortie par défaut peut n'avoir été qu'un coup d'œil : sa question reste à sa place, et les retours de test disent « (par défaut) ». | Comparer, dans les retours, les réponses par défaut et choisies |
| Deux parents | La durée est partagée (réglage du foyer), l'heure de la sortie non (propre au téléphone). | Voir D (avec l'API) |
| Retours de test | Chaque réponse après une sortie dit son heure et sa durée ; la durée réglée y est aussi (« 30 min »). | Fait (0.24.0) |
| **30 minutes** et widgets | Le moteur, les widgets, le lien « Envoyer les profils » et les versions plus anciennes ne connaissent que les heures : ils lisent 1 h (`outing_duration_h`), et l'app note à part `outing_short`. L'autre parent ne le reçoit que par l'API famille. | Rien à faire tant que les widgets disent la journée entière |
| Retour de sortie en tête | Pendant deux heures après la fin d'une sortie choisie, la carte de la sortie suivante passe sous le premier écran. | Garder si les testeurs répondent ; sinon, la mettre sous la sortie |
| Paysage | La bande des heures est sous le pli de la colonne du ciel ; il faut faire défiler cette colonne. | À reprendre si les testeurs l'utilisent |
| Play Store | Les captures prévues montraient l'ancien onglet Journée. | Refaire les 1080×1920 avec Dehors et Dedans |
| Sécurité | Risque de lire la tenue d'une autre heure : l'heure de la sortie est le titre de la carte. Risque d'une température d'une autre saison : redemandée après 7 jours. | — |

## 5. Ce que cette expérience permet d'améliorer

Une sortie a désormais une heure, une durée et un mode connus : on peut **la préparer, la rappeler, la juger et la répéter**.

| | Proposition | Ce que ça apporte | Effort |
|---|---|---|---|
| **A** ✓ 0.25.0 | **Widget « prochaine sortie »** : le créneau idéal (ou la sortie choisie), sa tenue et son sac, à la place de la journée entière ; la journée reste pour les jours de crèche | Le widget dit la même chose que l'app | APK + widget iPhone |
| **B** ✓ 0.25.0 | **Rappel avant de sortir** : une notification 15 min avant la sortie choisie (« Sortie à 11 h : combi, bonnet ; habillage pluie dans le sac ») | Le bon geste au bon moment, sans ouvrir l'app | APK ; iPhone par l'API |
| **C** ✓ 0.24.0 | **« C'était juste ? » après la sortie** : demandé à la fin de la sortie, avec son ressenti, son mode et sa durée | Une mesure de justesse bien plus fiable, et une tendance mieux calibrée | Web, petit |
| **D** | **Sortie partagée** avec l'autre parent : « Sortie prévue à 11 h, en porte-bébé » | Les deux parents préparent la même chose | Web + API famille (pas encore en ligne) |
| **E** ✓ 0.24.0 | **En rentrant** : à la fin de la sortie, ce qu'on enlève à la maison (repère NHS déjà dans la charte : bonnet et couches en trop enlevés à l'intérieur) | Ferme la boucle dehors puis dedans ; évite qu'il garde la combinaison au chaud | Web, petit |
| **F** | **Mes sorties habituelles** : « crèche 8 h 30 en voiture », « parc 16 h en poussette », proposées chaque jour d'un toucher ; le mode suit la sortie, plus l'enfant | Prolonge les « habitudes gardées » au dehors | Web, moyen |
| **G** ✓ 0.24.0 | **30 minutes** : les petites sorties (courses, école) | Le cas le plus fréquent ; le moteur compte par heure, on prend l'heure entamée | Web, petit |
| **H** | **Sieste** dans Dedans, Jour : la gigoteuse de la sieste pour la température de la pièce du jour | Répond à « et pour la sieste ? » ; à vérifier : les repères de nuit valent-ils pour la sieste (sources à relire) ? | Web + sources |

Recommandation retenue le 4 novembre. **C, E, G** sont faits (0.24.0, web seulement) ; **A + B** aussi (0.25.0, APK). Ensuite **A + B** dans un même APK, avec l'alignement des températures des widgets. **F** quand les testeurs auront dit quelles sorties reviennent. **D** quand l'API famille sera en ligne. **H** seulement si les sources le permettent, et si tu veux revenir sur « pas de gigoteuse le jour ».

## 6. Suivi

- [x] « Go » pour la 0.23.0 (commit, `npm run deploy`, sans APK)
- [x] Noms des onglets : Extérieur et Intérieur
- [x] Sortie par défaut : maintenant, l'idéal à un toucher
- [x] Propositions : la recommandation (C, E, G ; puis A + B ; F, D, H plus tard)
- [x] « Go » pour la 0.24.0 (C, E, G, onglets, maintenant ; sans APK : à recompiler)
- [ ] Captures Play Store refaites
- [x] APK 0.25.0 : A (le widget montre la sortie), B (rappel 15 minutes avant une sortie choisie), températures des widgets sans expiration, texte « onglet Intérieur »
- [x] « Go » pour la 0.25.0 (commit, `npm run deploy`, APK dans dist/)

## Journal

- 2026-11-04 : refonte Dehors / Dedans prête (0.23.0, web seulement), cadrage et propositions.
- 2026-11-04 : « Go », 0.23.0 commitée et déployée (sans APK). Restent à décider : noms des onglets, sortie par défaut, propositions.
- 2026-11-04 : choix faits : Extérieur et Intérieur, maintenant par défaut, la recommandation pour le reste. 0.24.0 prête : C, E, G, « Choisir » pour le créneau idéal.
- 2026-11-04 : « Go », 0.24.0 commitée et déployée (sans APK : à recompiler). Suite : A + B dans un même APK.
- 2026-11-04 : demande : la sortie par défaut compte comme une sortie (maintenant, pour la durée réglée), la question porte aussi sur elle. 0.24.1 prête ; « Go », commitée et déployée (sans APK).
- 2026-11-04 : « Ok go » pour A + B : 0.25.0 prête (APK 28), widgets sur la sortie, rappel avant une sortie choisie, températures sans expiration dans les widgets.
