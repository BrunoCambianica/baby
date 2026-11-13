---
version: 1
slug: "app-index-html"
primary_target: "app/index.html"
related_targets: ["app/style.css","app/js/views.js"]
---

# Surface : l'application (app/index.html)

Mode : Operate. Construction : code d'abord (pas de génération d'image disponible).

## Direction contract

THESIS: Une fiche du jour posée sur une table claire : le ciel en une carte pastel, la tenue en une grille de petites tuiles, le sac en une note crème, un seul bouton saumon. Rien d'autre à l'écran que ce qui change la décision de sortir.

OWN-WORLD: Direction fixée par Bruno avec deux captures d'une maquette Superbébé (novembre 2026). Elle remplace le monde précédent (ciel saturé plein écran, verre fumé, accent bleu, quatre onglets). Ce que le monde prête : la typographie (Poppins, graisses 400 à 700), la palette (fond blanc cassé chaud, cartes blanches, saumon pour l'action et la sélection, vert tendre pour « sortie idéale », crème pour le sac, ciel bleu pâle vers pêche, encre presque noire chaude), la densité (une carte, une idée ; marges généreuses ; coins très arrondis) et un geste signature. La structure reste celle d'une app : barre du haut, cartes, listes, barre d'onglets, feuilles du bas ; tous les contrôles sont standards.

Geste signature : dans la carte du ciel, le très grand nombre de la température mord sur une forme météo douce et modelée (dégradés, pas de trait), avec la pastille blanche « Ressenti » accrochée à droite. C'est le seul endroit où l'image et le nombre se chevauchent.

Le rôle de la couleur : saumon = l'action principale et l'onglet actif, jamais décoratif ; vert tendre = la sortie idéale, et seulement elle ; crème = ce qu'on emporte ; ambre et rouge doux = alertes (pluie probable, rafales, air) ; chaque famille de vêtements a sa teinte dans les tuiles (dessous pêche, mailles roses, bas bleus, accessoires prune, dehors gris-bleu), qui aide à reconnaître la pièce sans lire.

STORY: 1. Où et qui : la commune au centre, l'enfant en pastille à droite. 2. Le ciel de la sortie : quand sortir (pastille « sortie idéale »), combien il fait, le ressenti, le ciel en un mot ; le détail (demain, heure par heure, durée, pluie, vent, UV, air) se déplie. 3. La tenue : l'heure retenue, le mode de sortie en pastille, les pièces en tuiles. 4. Le sac. 5. Envoyer la fiche du jour. Le reste (à la maison, repères officiels, « c'était juste ? ») vient après, plus discret. Nuit et Achats suivent la même grammaire : une carte d'en-tête, puis une carte de contenu.

FIRST VIEWPORT: À 390 × 844 : barre du haut, carte du ciel entière, et le haut de la carte de la tenue avec la première rangée de tuiles ; la barre d'onglets en pilule flotte en bas (Journée, Nuit, Achats). En paysage ou sur grand écran : le ciel à gauche, la tenue à droite, la barre d'onglets sous le ciel.

FORM: la forme est celle des captures de Bruno (direction épinglée, en tête de la liste ordonnée) ; le tirage n'a pas choisi la direction, il a été relancé sur cette machine après la construction pour être consigné : seed:1f98c3516f353dd7
- Rayons : 28 px pour les cartes, 20 px pour les tuiles, pilules pour les boutons et les pastilles.
- Ombres : une seule, chaude, décalée vers le bas et très diffuse ; les tuiles n'ont qu'un filet.
- Illustrations : SVG dessinés dans le code. Météo modelée par dégradés ; vêtements en deux tons (aplat pastel et trait plus profond) à partir des dessins du moteur, sans les modifier.
- Thème sombre gardé, piloté par l'heure du coucher : même grammaire, fonds bleu nuit chauds, saumon plus clair.
- Mouvement : une seule entrée composée (la carte du ciel puis les tuiles en cascade), le reste en transitions d'état courtes ; tout s'efface avec « réduire les animations ».
- Écartés, parce que la référence les fixe : tuiles de même taille en grille (c'est la tenue elle-même), carte crème dans la carte blanche (le sac), très grand nombre (la température est la donnée). Écartés tout court : libellés en capitales au-dessus d'un titre (remplacés par des pastilles d'état), emoji en guise d'icônes, verre dépoli décoratif.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
