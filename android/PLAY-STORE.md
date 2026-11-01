# Mettre Superbébé sur le Play Store

Prêt à copier dans la Play Console dès que le compte est validé. Voir aussi [PLAN-REFERENT.md](../PLAN-REFERENT.md), phase 3.

## Avant de commencer

- **Nom du paquet** : `fr.superbebe.widget`. Il est définitif une fois l'app publiée.
- **Testeurs actuels** : l'APK hors Play Store est signé avec une clé de débogage. Pour passer à la version du Play Store, il faudra le désinstaller (réglages notés à refaire, ou transmis par « Envoyer les profils »).
- **Test fermé obligatoire.** Un compte personnel créé après le 13 novembre 2023 doit faire tester l'app par au moins 12 testeurs inscrits, pendant 14 jours d'affilée, avant de demander l'accès à la production. Les parents qui testent déjà peuvent être ces testeurs. À vérifier sur l'[aide de Google](https://support.google.com/googleplay/android-developer/answer/14151465).
- **Version de publication** : un fichier AAB signé avec une clé d'importation, créée une fois et gardée hors du dépôt, avec la signature des applications par Google Play. Claude la prépare quand le compte est validé.

## La fiche

| Champ | Texte |
|---|---|
| Nom (30 caractères au plus) | Superbébé : habiller bébé |
| Description courte (80 au plus) | La tenue de bébé selon la météo : dehors, maison, nuit. Repères officiels cités. |
| Catégorie | Parentalité |
| Site web | https://brunocambianica.github.io/baby/ |
| Règles de confidentialité | https://brunocambianica.github.io/baby/guide/confidentialite/ |
| Adresse e-mail de contact | À renseigner : obligatoire, et visible sur la fiche |

**Description complète :**

```
Comment habiller bébé aujourd'hui ? Superbébé répond en un coup d'œil, avec la météo de votre commune.

• Dehors : la tenue du matin selon la température ressentie, ce qu'on enlève ou remet dans la journée, et ce qui va dans le sac.
• Le meilleur moment pour sortir, et pourquoi (« au sec avant la pluie de 12 h »).
• À la maison : la tenue selon la température de la pièce.
• La nuit : quelle gigoteuse (TOG) et quoi mettre dessous, selon la température de la chambre.
• En poussette, en porte-bébé, en voiture ou à pied : la tenue s'adapte, avec les repères de sécurité du portage et du siège auto.
• De la naissance à 6 ans, pour un ou plusieurs enfants, avec ce que vous avez déjà dans la garde-robe.
• Des widgets pour l'écran d'accueil, un rappel le soir pour préparer la tenue du lendemain, et la fiche du jour à envoyer à la nounou ou à la crèche.

Des repères officiels, cités
Toute information de santé relaie une source officielle, avec son lien : Assurance Maladie, Santé.fr, Santé publique France… Les tenues sont des suggestions pratiques, présentées comme telles. Superbébé ne donne pas d'avis médical.

Gratuit, sans publicité, sans compte
Le profil de votre enfant reste sur votre téléphone. Les règles et le code sont publics.

Le guide des tenues par température : https://brunocambianica.github.io/baby/
```

## Contenu de l'application (questionnaires)

- **Annonces** : aucune.
- **Accès à l'app** : sans connexion, rien à fournir.
- **Public cible** : 18 ans et plus. C'est une app pour les parents.
- **Classification du contenu** : questionnaire IARC, aucune catégorie sensible.
- **Sécurité des données.** Ce qu'il faut savoir pour remplir le formulaire (détail sur la page de confidentialité) :
  - pas de compte, pas de serveur Superbébé : le développeur ne reçoit rien ;
  - pour fonctionner, l'app envoie la position de la commune à Open-Meteo (météo), et le nom tapé ou la position arrondie à environ 1 km à geo.api.gouv.fr (trouver la commune) ;
  - tout passe en HTTPS ;
  - effacement : Réglages, « Effacer toutes mes données ».

  Déclaration proposée : « position approximative », pour le fonctionnement de l'app, non partagée. À confirmer selon les cas d'exemption du formulaire.
- **Santé** : si la console demande la déclaration des apps de santé, répondre « informations générales de bien-être ». Ni diagnostic, ni avis médical, ni données de santé.

## Les visuels

- Icône, 512 × 512 : `app/icons/icon-512.png`.
- Image de présentation, 1024 × 500 : à faire (Claude).
- Captures du téléphone, 2 à 8 : à faire (Claude), depuis le parcours de test. Le grand côté ne doit pas dépasser le double du petit, 1080 × 1920 par exemple.

## Les étapes

1. Créer l'app dans la Play Console : nom, français, application, gratuite.
2. Remplir la fiche et les questionnaires ci-dessus.
3. Claude prépare la version de publication (AAB signé) et les visuels.
4. Test fermé :
   - réunir au moins 12 adresses Gmail de testeurs ;
   - leur envoyer le lien d'inscription ;
   - attendre 14 jours.
5. Demander l'accès à la production, puis publier.
