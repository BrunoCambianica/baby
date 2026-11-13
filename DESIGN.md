---
name: Superbébé
description: Le bon moment pour sortir avec bébé, la tenue et le sac, lus d'un coup d'œil.
colors:
  salmon: "#f6a493"
  on-salmon: "#5e2216"
  salmon-soft: "#fde6e0"
  salmon-ink: "#8a3f30"
  salmon-deep: "#a8432e"
  ideal-green: "#1f6b44"
  ideal-green-soft: "#dcf1e2"
  ideal-chip: "#cdebd6"
  ideal-chip-ink: "#1f5c3a"
  bag-cream: "#fdf6e3"
  bag-cream-line: "#f1e2b6"
  bag-cream-ink: "#6b5a1e"
  alert-amber: "#8a5300"
  alert-amber-soft: "#fdecc8"
  soft-red: "#c9382c"
  soft-red-wash: "#fde2e0"
  violet: "#5b3fa3"
  violet-soft: "#ece6fa"
  info-blue-wash: "#e3eefb"
  info-blue-ink: "#1f4f8f"
  warm-table: "#fbf8f5"
  card-white: "#ffffff"
  tile-white: "#faf8f6"
  warm-fill: "#f6f2ee"
  hairline: "#efe9e4"
  ink: "#1c1b22"
  ink-2: "#56525c"
  ink-3: "#716c77"
  sky-dawn-blue: "#cfe4fb"
  sky-peach: "#ffe7d6"
  night-table: "#16141b"
  night-card: "#211e28"
  night-ink: "#f4f0ee"
  night-sky-top: "#232b4f"
  night-sky-end: "#45305a"
  night-salmon-deep: "#ffb4a3"
typography:
  display:
    fontFamily: "Poppins, ui-rounded, Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(4.2rem, 22vw, 5.4rem)"
    fontWeight: 700
    lineHeight: 0.84
    letterSpacing: "-0.04em"
    fontFeature: "tnum"
  headline:
    fontFamily: "Poppins, ui-rounded, Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(2.8rem, 14vw, 3.6rem)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.03em"
    fontFeature: "tnum"
  page-title:
    fontFamily: "Poppins, ui-rounded, Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "1.8rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Poppins, ui-rounded, Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "1.32rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  card-title:
    fontFamily: "Poppins, ui-rounded, Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.45
  body:
    fontFamily: "Poppins, ui-rounded, Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.45
  body-small:
    fontFamily: "Poppins, ui-rounded, Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "0.88rem"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Poppins, ui-rounded, Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "0.86rem"
    fontWeight: 500
    lineHeight: 1.3
  tile-label:
    fontFamily: "Poppins, ui-rounded, Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(0.7rem, 3.1vw, 0.78rem)"
    fontWeight: 600
    lineHeight: 1.22
    letterSpacing: "-0.01em"
  state-chip:
    fontFamily: "Poppins, ui-rounded, Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "0.68rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.06em"
rounded:
  field: "14px"
  inset: "16px"
  inset-lg: "18px"
  tile: "20px"
  bag: "22px"
  group: "24px"
  card: "28px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "14px"
  lg: "18px"
  xl: "22px"
  gutter: "16px"
components:
  button-primary:
    backgroundColor: "{colors.salmon}"
    textColor: "{colors.on-salmon}"
    typography: "{typography.card-title}"
    rounded: "{rounded.pill}"
    padding: "12px 22px"
    height: "54px"
  button-cta:
    backgroundColor: "{colors.salmon}"
    textColor: "{colors.on-salmon}"
    rounded: "{rounded.pill}"
    padding: "12px 22px"
    height: "58px"
  button-small:
    backgroundColor: "{colors.salmon}"
    textColor: "{colors.on-salmon}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
    height: "44px"
  button-soft:
    backgroundColor: "{colors.warm-fill}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "12px 22px"
  button-tint:
    backgroundColor: "{colors.salmon-soft}"
    textColor: "{colors.salmon-ink}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
  card:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "18px"
  sky-card:
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "14px"
  garment-tile:
    backgroundColor: "{colors.tile-white}"
    textColor: "{colors.ink}"
    typography: "{typography.tile-label}"
    rounded: "{rounded.tile}"
    padding: "10px 8px"
  bag-note:
    backgroundColor: "{colors.bag-cream}"
    textColor: "{colors.bag-cream-ink}"
    rounded: "{rounded.bag}"
    padding: "13px 14px 14px"
  ideal-chip:
    backgroundColor: "{colors.ideal-chip}"
    textColor: "{colors.ideal-chip-ink}"
    typography: "{typography.state-chip}"
    rounded: "{rounded.pill}"
    padding: "2px 9px"
  tag:
    backgroundColor: "{colors.warm-fill}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    padding: "3px 9px"
  tag-alert:
    backgroundColor: "{colors.alert-amber-soft}"
    textColor: "{colors.alert-amber}"
    rounded: "{rounded.pill}"
    padding: "3px 9px"
  pick-pill:
    backgroundColor: "{colors.tile-white}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 10px 0 13px"
    height: "44px"
  segmented:
    backgroundColor: "{colors.warm-fill}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    padding: "3px"
  segmented-selected:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "40px"
  tab-bar:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink-3}"
    rounded: "{rounded.pill}"
    padding: "6px"
  tab-active:
    backgroundColor: "{colors.salmon-soft}"
    textColor: "{colors.salmon-ink}"
    rounded: "{rounded.pill}"
    height: "48px"
  field:
    backgroundColor: "{colors.warm-fill}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "10px 12px"
    height: "46px"
  sheet-option-selected:
    backgroundColor: "{colors.salmon-soft}"
    textColor: "{colors.salmon-ink}"
    rounded: "{rounded.inset-lg}"
    padding: "12px 14px"
    height: "54px"
---

# Design System: Superbébé

## Overview

**Creative North Star: "La fiche du jour sur la table claire"**

L'app est une feuille de papier chaud posée sur une table : un fond blanc cassé tiède, des cartes blanches très arrondies qui flottent sur une seule ombre diffuse, et en tête une carte de ciel pastel qui donne la réponse avant toute lecture. La couleur n'habille pas : chaque teinte a un emploi (agir, sortie idéale, sac, alerte, famille de vêtements) et rien d'autre ne la porte. Une seule famille de caractères, Poppins, fait toute la hiérarchie par la graisse et la taille.

La densité est celle d'une fiche, pas d'un tableau de bord : une carte, une idée ; marges de 14 à 18 px dans les cartes, 14 px entre elles ; le détail se replie (heure par heure, repères, à la maison). Les illustrations sont dessinées dans le code : un ciel modelé par dégradés, sans trait, et des vêtements en deux tons (aplat pastel et trait plus profond) dont la teinte dit la famille. Le thème sombre garde la même grammaire sur des bleus nuit chauds ; il suit l'heure du coucher de l'enfant, pas seulement le système.

Le geste signature tient en une image : le très grand nombre de la température passe devant la forme météo modelée et en couvre le bas, et la pastille blanche « Ressenti » s'accroche à son flanc. C'est le seul endroit de l'app où l'image et le texte se chevauchent.

**Key Characteristics:**
- Fond blanc cassé chaud, cartes blanches à 28 px, une seule ombre chaude et diffuse.
- Saumon pour l'action et la sélection, vert tendre pour la sortie idéale, crème pour le sac, ambre pour l'alerte.
- Poppins seule, 400 à 700, chiffres tabulaires partout où un nombre change.
- Tout ce qui se touche est une pilule ou un carré très arrondi, d'au moins 44 px.
- Illustrations codées : ciel modelé en dégradés, vêtements en deux tons par famille.
- Une entrée composée (le ciel, puis les cartes, puis les tuiles en cascade), des retours d'état courts, rien sans l'accord de « réduire les animations ».

## Colors

Une palette claire et tiède où chaque teinte saturée est un mot du vocabulaire, jamais un ornement.

### Primary
- **Saumon** (salmon) : le fond du bouton principal (« Envoyer la fiche du jour »), la pastille de l'enfant, les points de la frise. Son texte est le **brun saumon foncé** (on-salmon).
- **Saumon voile** (salmon-soft) avec **encre saumon** (salmon-ink) : tout ce qui est sélectionné (onglet actif, enfant choisi, option cochée dans une feuille, bouton teinté).
- **Saumon profond** (salmon-deep) : liens, anneau de focus (3 px, décalé de 2 px), petites icônes de conseil, signal « nouveau » de la cloche. Dans le thème sombre il devient **saumon clair de nuit** (night-salmon-deep).

### Secondary
- **Vert sortie idéale** (ideal-green, ideal-green-soft) et la **pastille verte** (ideal-chip / ideal-chip-ink) : la sortie idéale (pastille du haut du ciel, heure « idéale » dans la bande), et ce qui est confirmé (repères officiels, « c'était juste »). Rien de décoratif n'est vert.
- **Crème du sac** (bag-cream, bag-cream-line, bag-cream-ink) : la seule carte crème, « Dans le sac », posée dans la carte blanche de la tenue.

### Tertiary
- **Ambre d'alerte** (alert-amber, alert-amber-soft) : pastilles de condition à surveiller (averse, rafales, UV, air), « Pas de créneau », et le titre « + À ajouter pour sortir » avec son signe +.
- **Rouge doux** (soft-red, soft-red-wash) : erreurs, action destructive, « trop chaud » ; aussi le badge de compte des Achats.
- **Violet** et **bleu info** (violet-soft, info-blue-wash) : étiquettes de catégorie secondaires seulement.
- **Teintes de familles de vêtements** (dans les dessins, pas en jetons d'interface) : dessous pêche, nuit lavande, bas bleus, pieds corail, mailles roses, dehors gris-bleu, tête prune, pluie sarcelle, soleil miel ; chacune en aplat dégradé clair et trait profond.

### Neutral
- **Table chaude** (warm-table) : fond de page, et le fondu qui efface la page autour de la barre d'onglets.
- **Blanc carte** (card-white) et **blanc tuile** (tile-white) : cartes, puis tuiles de vêtements à peine plus chaudes que la carte qui les porte.
- **Remplissage chaud** (warm-fill) : boutons ronds, champs, segments, encarts de conseil.
- **Filet** (hairline) : bordure de chaque carte et tuile, séparateurs de listes.
- **Encre** (ink), **encre 2** (ink-2), **encre 3** (ink-3) : texte principal, texte secondaire, texte discret et icônes au repos ; toutes trois tiennent au moins 4,5:1 sur la table et sur la carte.
- **Ciel du jour** (sky-dawn-blue vers sky-peach) : le dégradé à 165° de la carte du ciel, bleu pâle en haut à gauche vers pêche en bas à droite. Il varie selon le temps (nuageux, pluie, chaleur, froid, soir) sans quitter le pastel.
- **Nuit** (night-table, night-card, night-ink, night-sky-top vers night-sky-end) : le thème sombre et le ciel de nuit ; tous les ciels du thème sombre prennent ce dégradé bleu nuit vers prune.

### Named Rules
**The Salmon Acts Rule.** Le saumon marque ce qu'on touche pour agir et ce qui est choisi ; il ne décore jamais une surface, un titre ou une illustration.

**The One Green Rule.** Le vert dit « sortie idéale » ou « confirmé » ; une seule chose verte en tête du ciel.

**The Measured Sky Rule.** Le petit texte posé sur un ciel est toujours sur une pastille blanche (opaque à 86 %, ou blanche pleine pour Ressenti, Choisir et le segment choisi) ; le contraste est mesuré à 4,5:1 sur chaque variante de ciel avant d'en ajouter une.

## Typography

**Display Font:** Poppins (avec ui-rounded, Segoe UI, system-ui)
**Body Font:** Poppins (même pile)

**Character:** Une géométrique ronde, auto-hébergée en quatre graisses (400, 500, 600, 700) : amicale sans être enfantine, très lisible en plein jour. Le contraste vient de l'écart d'échelle entre le grand nombre et le reste, pas d'une seconde famille.

### Hierarchy
- **Display** (700, clamp 4,2 à 5,4 rem, interligne 0,84, -0,04 em) : la température de la carte du ciel, seule. Un halo de la couleur du ciel (contour de 0,08 em peint sous le remplissage) la détache de la forme météo qu'elle chevauche.
- **Headline** (700, clamp 2,8 à 3,6 rem, interligne 1) : le grand nombre des autres en-têtes (température de la chambre, nombre d'achats) ; version en mots à 1,6 à 2 rem quand la réponse est une phrase.
- **Page title** (700, 1,8 rem) : titre des pages de réglages ; 1,55 à 1,7 rem au premier lancement.
- **Title** (700, 1,32 rem ; 1,22 rem dans l'en-tête de la tenue) : le titre principal d'une carte (« Maintenant », « 20–21 h »).
- **Card title** (600, 1 rem) : titres de cartes et de replis ; 0,9 à 0,98 rem pour les sous-replis.
- **Body** (400, 1 rem, interligne 1,45) et **body small** (0,84 à 0,92 rem, encre 2 ou 3) : phrases d'explication, sources, notes.
- **Label** (500, 0,8 à 0,9 rem) : pastilles de condition, sélecteurs, segments, onglets.
- **Tile label** (600, clamp 0,7 à 0,78 rem) : le nom d'une pièce sous son dessin, sur une ou deux lignes, jamais tronqué.
- **State chip** (600, 0,68 rem, +0,06 em, capitales) : uniquement la pastille d'état « Sortie idéale », en ligne à côté de l'heure qu'elle qualifie.

### Named Rules
**The One Family Rule.** Poppins seule, hiérarchie par graisse et taille ; aucune police système en titre, aucune seconde famille (le monospace reste réservé aux codes à copier).

**The Steady Numbers Rule.** Toute valeur qui change (températures, heures, pourcentages, compteurs, badges) est en chiffres tabulaires.

## Layout

Colonne unique de 480 px au plus, centrée, avec une gouttière de 16 px (ou la zone sûre si elle est plus large). En haut, une barre de 48 px : la commune centrée (elle cède en ellipse plutôt que de pousser), les boutons ronds de 40 px à droite. Puis la carte du ciel, puis les cartes de contenu espacées de 14 px ; la page réserve sous elle la hauteur de la barre d'onglets plus 24 px. Les pages de réglages espacent leurs groupes de 22 px.

Les tuiles de vêtements suivent une grille à six pistes, deux par tuile : trois tuiles par rangée, et une rangée incomplète se partage en tuiles plus larges pour qu'aucune pièce ne reste seule au bout. Les écarts sont de 8 px entre tuiles, 6 px entre pastilles.

En paysage à partir de 640 px : deux colonnes dans 1040 px, le ciel collant à gauche (clamp 300 à 380 px) avec la barre d'onglets sous lui, la tenue à droite ; les tuiles passent en remplissage automatique de 100 px minimum. Sous 460 px de haut, le ciel se resserre (marges de 10 à 12 px, température à 4 rem). La bande des heures défile horizontalement en gardant sa marge de 14 px à gauche.

## Elevation & Depth

Hybride, très retenu : une ombre chaude unique, longue, décalée vers le bas et très diffuse, porte les cartes blanches et la carte du ciel au-dessus de la table ; les tuiles, le sac et les encarts restent à plat avec un filet. Une petite ombre serrée soulève les éléments blancs posés sur un fond teinté (segment choisi, Ressenti, Choisir). La barre d'onglets flotte avec une ombre un peu plus forte. Le thème sombre garde les mêmes rôles avec des ombres noires.

### Shadow Vocabulary
- **Ombre de carte** (`0 14px 34px -16px rgba(96, 62, 42, 0.22), 0 2px 6px -2px rgba(96, 62, 42, 0.06)`) : cartes, carte du ciel, groupes de réglages, choix du premier lancement.
- **Ombre de pastille** (`0 2px 6px -2px rgba(96, 62, 42, 0.18)`) : élément blanc posé sur un fond teinté.
- **Ombre de la barre flottante** (`0 16px 36px -14px rgba(96, 62, 42, 0.32), 0 2px 8px -2px rgba(96, 62, 42, 0.08)`) : la barre d'onglets seule.
- **Lueur saumon** (`0 14px 26px -14px rgba(240, 138, 116, 0.55)`) : le seul bouton d'appel principal de l'écran.
- **Ombre de feuille** (`0 -12px 40px -12px rgba(28, 20, 16, 0.35)`) : feuille du bas, sur un voile brun à 42 %.

### Named Rules
**The One Warm Shadow Rule.** Une carte a l'ombre de carte, une tuile n'a qu'un filet ; on ne cumule jamais ombre et bordure épaisse, et aucune ombre n'est dure ou décalée sans flou.

**The No Frost Rule.** Aucun flou d'arrière-plan : la lisibilité sur le ciel vient de pastilles blanches opaques, pas de verre dépoli.

## Shapes

Tout est doux et rond, en deux familles. Les surfaces sont des rectangles très arrondis : 28 px pour les cartes, le ciel et le haut des feuilles ; 24 px pour les groupes de réglages ; 22 px pour le sac ; 20 px pour les tuiles ; 16 à 18 px pour les encarts intérieurs ; 14 px pour les champs. Tout ce qui se touche ou qualifie est une pilule (999 px) : boutons, onglets, segments, pastilles, étiquettes ; les boutons d'icône sont des cercles de 40 px avec une zone de toucher étendue à 48 px. Les vignettes d'icônes (sac, repère officiel, achat) sont des carrés arrondis de 40 à 46 px à 14 à 16 px.

Le ciel modelé se dessine sur une toile de 200 × 150 : nuages à trois bosses et socle, reflets radiaux, ombre portée elliptique, soleil en boule avec halo, gouttes en dégradé ; aucun trait. Les petits pictogrammes de météo (bande des heures, résumé) sont au contraire au trait, en deux tons.

## Components

### Buttons
Pleins, ronds, généreux, faits pour le pouce.
- **Shape:** pilule (999 px).
- **Primary:** fond saumon, texte brun saumon, 600 à 1 rem, 54 px de haut, pleine largeur, 12 px 22 px. La variante d'appel (58 px) porte la lueur saumon ; une seule par écran.
- **Small:** 44 px, largeur au contenu, 8 px 16 px, 0,9 rem.
- **Soft / Tint:** fond chaud et encre (action neutre) ; voile saumon et encre saumon (action secondaire liée au choix courant).
- **Hover / Focus / Active:** pression à 0,97 en 0,14 s ; anneau de focus saumon profond de 3 px décalé de 2 px (encre du ciel sur la carte du ciel) ; désactivé à 45 % d'opacité.

### Chips
- **Conditions du ciel:** pilules de 30 px, fond blanc à 52 % sur le ciel, 500 à 0,8 rem avec un pictogramme ; en alerte : fond ambre voile, texte ambre, 600.
- **Étiquettes:** pilules 0,76 rem sur remplissage chaud ; variantes ambre, vert, bleu, violet selon le sens.
- **State chip « Sortie idéale »:** voir Typography ; fond vert de pastille. Jamais au-dessus d'un titre.

### Cards / Containers
- **Corner Style:** 28 px.
- **Background:** blanc carte, filet d'1 px.
- **Shadow Strategy:** ombre de carte (voir Elevation & Depth). La carte de promotion est la seule à plat, sur remplissage chaud sans filet.
- **Internal Padding:** 18 px (16/14 px pour la carte de la tenue), écart interne de 16 px.
- **Sac:** carte crème à filet crème, 22 px, posée dans la carte de la tenue ; vignettes de 46 px blanches à 15 px.
- **Replis:** un résumé de 44 à 48 px avec chevron qui tourne de 90° en 0,2 s ; « une remarque seule dans sa carte » perd sa boîte.

### Inputs / Fields
- **Style:** fond chaud, sans bordure, 14 px, 46 px de haut, 10 px 12 px. Les listes déroulantes portent un chevron dessiné dont la couleur suit le thème.
- **Pick pill:** un sélecteur en pilule de 44 px (blanc tuile, filet) qui ouvre une feuille du bas ; le select natif est invisible dessus.
- **Focus:** anneau saumon profond de 3 px ; erreurs en rouge doux à 0,86 rem.

### Navigation
- **Barre d'onglets:** pilule blanche flottante à 12 px du bas, 448 px au plus, trois onglets égaux (Journée, Nuit, Achats) de 48 px avec icône et mot ; repos en encre 3 à 500, actif en voile saumon et encre saumon à 600. La page s'efface dans le fond sous elle. Badge de compte : pastille rouge doux de 20 px, 700, tabulaire.
- **Segments:** rail de remplissage chaud de 3 px de marge ; le segment choisi devient blanc avec l'ombre de pastille. Au-delà de trois choix, ou sous 300 px, icône au-dessus du mot.
- **Feuilles du bas:** blanches, 28 px en haut, poignée de 38 × 5 px, options de 54 px à 18 px ; l'option cochée prend le voile saumon.

### Carte du ciel (signature)
Le ciel du moment en une carte de 28 px, dégradé pastel à 165°, bord blanc à 90 %. De haut en bas : la pastille de sortie idéale (fond vert pâle, mini-ciel, heure en 600, state chip, bouton blanc « Choisir ») ; le grand nombre qui mord sur la forme modelée (largeur min(232 px, 64 % de la carte)), Ressenti en pastille blanche à droite, réunie avec l'heure dans une même étiquette quand ce n'est pas « maintenant » ; les pastilles d'alerte ; enfin le ciel en un mot dans un repli blanc de 48 px qui déplie demain, l'heure par heure et la durée. Nuit et Achats reprennent la carte avec un autre contenu.

### Tuile de vêtement (signature)
Blanc tuile, filet, 20 px ; dessin de 64 px (40 px en petit) en deux tons de sa famille, nom en tile label. Un signe rond de 18 px en coin dit le changement : + ambre pour ce qu'on ajoute, − gris pour ce qu'on enlève (la pièce passe alors à 50 % et en grisé). Les tuiles entrent en cascade de 30 ms.

## Do's and Don'ts

### Do:
- **Do** réserver le saumon à l'action principale et à la sélection, et n'avoir qu'un bouton d'appel saumon par écran.
- **Do** poser tout petit texte d'un ciel sur une pastille blanche et mesurer 4,5:1 sur chaque variante de ciel, claire et sombre.
- **Do** donner aux cartes 28 px, aux tuiles 20 px, et faire de tout contrôle une pilule d'au moins 44 px.
- **Do** dessiner les nouvelles météos sur la toile de 200 × 150 en volumes dégradés, et les nouveaux vêtements en deux tons dans la teinte de leur famille.
- **Do** mettre tout nombre qui change en chiffres tabulaires.
- **Do** décliner tout nouvel écran avec la même grammaire : une carte d'en-tête de ciel, puis des cartes de contenu.
- **Do** passer chaque entrée par la courbe cubic-bezier(0.2, 0.8, 0.2, 1) et la couper sous « réduire les animations ».

### Don't:
- **Don't** utiliser le saumon, le vert ou la crème pour décorer : chacun a un seul sens.
- **Don't** poser de libellé en capitales au-dessus d'un titre ; l'état se dit par une pastille en ligne.
- **Don't** utiliser d'emoji comme icônes ; les icônes sont au trait (jeu Tabler) ou des illustrations codées.
- **Don't** ajouter de flou d'arrière-plan ni de verre dépoli décoratif.
- **Don't** faire chevaucher texte et image ailleurs que le grand nombre sur la forme du ciel.
- **Don't** introduire une seconde famille de caractères ni une police système en titre.
- **Don't** donner une ombre aux tuiles ou au sac, ni d'ombre dure décalée sans flou.
