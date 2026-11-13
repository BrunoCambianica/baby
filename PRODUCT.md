# Superbébé

<!-- impeccable:product-schema 1 -->

> Fiche produit rédigée à partir du dépôt (README, TESTER.md, PLAN-AFFICHAGE.md, règles et messages) et des retours de test de Bruno. Ce qui est déduit du dépôt plutôt que confirmé de vive voix est marqué « déduit ».

## Platform

web

## Users

De jeunes parents francophones (France), avec un enfant de la naissance à 3 ans, parfois deux. Ils ouvrent l'app debout, une main prise, juste avant de sortir ou au moment du coucher, et veulent la réponse sans lire : quand sortir, quoi lui mettre, quoi emporter. Second public : la personne qui garde l'enfant (nounou, crèche, autre parent), qui reçoit la « fiche du jour » par un lien.

## Product Purpose

Dire chaque jour le bon moment pour sortir avec bébé, la tenue qui va avec, ce qu'on met dans le sac, la tenue de nuit selon la température de la chambre, et les achats de vêtements à prévoir sur six semaines. Réussi quand la réponse se lit d'un coup d'œil : un pictogramme et un nombre d'abord, le détail replié.

## Positioning

Chaque conseil est rattaché à sa source : repère officiel (Santé publique France, NHS, Santé Canada…), étiquette de fabricant, ou suggestion pratique, et l'app le dit. Les règles sont un fichier versionné, relu, testé, pas un modèle opaque. Tout reste sur le téléphone, sans compte.

## Operating Context

- Téléphone en portrait, en extérieur ou dans l'entrée ; aussi le soir dans une chambre sombre (thème sombre après l'heure du coucher).
- PWA installée depuis le navigateur, app Android (APK) avec widgets, widget iPhone via Scriptable. Hors ligne possible : les dernières prévisions restent affichées.
- Prévisions Open-Meteo pour la commune choisie ; l'heure de sortie, la durée et le mode (poussette, porte-bébé, voiture, à pied) changent la tenue.
- La fiche du jour s'envoie par le partage du téléphone.

## Capabilities and Constraints

- Site statique sans dépendance (JavaScript natif, modules ES), servi sous `/baby/`. Pas d'outil de build côté interface.
- Le moteur (`engine/`) et les dessins des vêtements (`engine/drawings.js`) sont partagés avec les widgets : l'interface de l'app ne les modifie pas.
- Vocabulaire : « sortie idéale », « ressenti », « dans le sac », « tenue de la maison », « gigoteuse », « TOG ». Jamais d'avis médical : des repères, avec leur source.
- Trois sections : Journée (la sortie, et la tenue à la maison), Nuit, Achats. Les réglages sont une page à part.
- Polices et images hébergées avec l'app (pas de requête à un tiers pour l'affichage).
- Non décidé : des illustrations fournies par Bruno (les vêtements sont aujourd'hui dessinés en SVG par l'app).

## Brand Commitments

- Nom : Superbébé. Ton : direct, rassurant, sans jargon, au vouvoiement ; phrases courtes ; pas de point d'exclamation.
- Référence rendue contraignante par Bruno (novembre 2026) : deux captures d'une maquette « Superbébé », épurée, « uniquement le nécessaire ». Elles sont la direction visuelle à suivre au plus près.

## Evidence on Hand

- Règles, messages et sources : `rules/v0/`. Parcours de bout en bout avec captures : `tools/e2e/`.
- Guide des testeurs : `TESTER.md`. Pas de témoignages, pas de chiffres d'usage publiés : ne pas en inventer.
- Pas d'illustrations 3D ni de photos : seulement les dessins au trait du moteur et les icônes Tabler (licence MIT).

## Product Principles

1. Le coup d'œil d'abord : un pictogramme, un nombre, un mot. Le détail se déplie.
2. Uniquement le nécessaire : ce qui ne change pas la décision du moment n'est pas à l'écran.
3. Chaque repère dit d'où il vient ; l'officiel et le pratique ne se confondent pas.
4. Une main, dehors : cibles larges, contraste lisible en plein jour, rien à saisir au clavier pour l'usage courant.
5. Privé par défaut : les données restent sur le téléphone.

## Accessibility & Inclusion

Contraste d'au moins 4,5:1 pour le texte (3:1 pour les très grands nombres), mesuré sur chaque fond ; cibles tactiles d'au moins 44 px ; tout se fait au clavier et avec un lecteur d'écran ; les animations respectent « réduire les animations ». (Déduit des versions 0.29 et 0.30.)
