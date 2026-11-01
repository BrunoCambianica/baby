# Superbébé, la référence pour habiller bébé selon la température

Plan de suivi, ouvert le 1er novembre 2026. À mettre à jour à chaque étape : cases cochées, journal en bas.

## 1. L'objectif, en termes mesurables

Quand un parent demande à un moteur de recherche ou à une IA (ChatGPT, Gemini et les aperçus IA de Google, Copilot, Perplexity, Claude, Le Chat) comment habiller un nouveau-né ou un jeune enfant selon la température, dehors, à la maison ou la nuit, Superbébé est :

1. **cité** : un lien vers nos pages dans la réponse ;
2. **nommé** : l'outil conseillé pour la réponse du jour ;
3. **décrit** comme fiable (repères officiels cités), gratuit et sans compte.

D'abord en français (France, puis Belgique, Suisse, Québec), l'anglais ensuite (phase 4).

## 2. Ce qu'on a remis en question

| Ce que j'avais proposé | Ce qu'on sait maintenant | Décision |
|---|---|---|
| Rendre le contenu lisible par les IA | Confirmé et pire que prévu : la racine du site redirige vers l'app, l'app affiche « Chargement… » sans JavaScript, pas de plan du site. Les robots des IA n'exécutent pas le JavaScript : pour eux, Superbébé n'existe pas. | Fait en 0.21.0 et 0.21.1 : guide de 26 pages statiques. |
| Une centaine de pages température × âge × situation | Le moteur ne donne que 18 réponses vraiment différentes (7 tranches dehors, 5 à la maison, 6 la nuit). Des pages par degré seraient des doublons, que Google classe comme contenu produit en masse. | Une page par réponse réelle, plus les pages par situation et par saison : 26 pages. |
| schema.org, FAQ, llms.txt | Mesures de 2026 : FAQ et schema.org n'ont pas d'effet sur les citations des IA à rang égal. Aucun grand moteur ne dit lire llms.txt, qui doit de toute façon être à la racine d'un domaine. | Schema minimal (fil d'Ariane, app gratuite), pas de llms.txt. |
| Un serveur MCP ou une API | Ne nourrit ni la recherche des IA ni leur mémoire. | Phase 4, à reconsidérer. |
| *Oublié* : la mémoire des modèles | « Les pages sont citées quand elles sont trouvées, les marques nommées quand elles sont connues. » ChatGPT écrit une marque connue dans ses requêtes 67 % du temps, contre 11 % sinon. | Les mentions sur d'autres sites sont la moitié du travail (phase 3), et prennent des mois. |
| *Oublié* : pourquoi une IA conseillerait un outil | Elle sait répondre seule « en général ». Elle ne connaît ni le ressenti heure par heure dans la commune, ni l'âge, ni le mode de sortie, ni la chambre. | Chaque page le dit et renvoie à l'app : « la tenue d'aujourd'hui, chez vous ». |
| *Oublié* : notre charte | Les règles étaient marquées « brouillon, à relire avant toute diffusion ». La source centrale de la nuit (carnet 1000 jours) était un lien mort. La citation HAS venait de la presse. | Sources corrigées en 0.21.0. Relecture par un professionnel de santé avant toute promotion active. |
| *Oublié* : le prix d'un nouveau domaine | Les profils des parents sont gardés par le navigateur pour une adresse donnée : changer d'adresse les perd. L'app Android charge aussi l'adresse actuelle. | Réserver le nom maintenant, migrer plus tard avec un transfert des profils. |
| *Oublié* : l'anglais | Les repères diffèrent d'un pays à l'autre (chambre : 18-20 °C en France, 16-20 °C au Royaume-Uni). | Phase 4, avec des règles par pays. |

## 3. Comment les IA choisissent ce qu'elles citent

- **La recherche d'abord.** Chaque assistant interroge son moteur : Google pour Gemini et les aperçus IA, Bing pour Copilot, Brave pour Claude, leur propre index pour ChatGPT et Perplexity. Il découpe la question en sous-questions et cite surtout le haut de son propre classement : ChatGPT cite 43,8 % des pages qu'il classe premières, et 3,5 % de celles classées de 11 à 20.
- **Sur la page, ce qui compte :** un titre et un paragraphe qui répondent exactement à la sous-question (+14 % et +15 % de citations par écart-type). La longueur, les listes, les FAQ et schema.org n'ont pas d'effet propre.
- **Ce qui est repris dans la réponse :** les pages structurées, avec des chiffres, des définitions et des comparaisons (une corrélation, pas une preuve).
- **La mémoire :** 46 % des marques que nomme ChatGPT ne viennent d'aucune page citée. Elles viennent de ce que le modèle a lu pendant son entraînement.
- **En santé :** 79 à 88 % des citations vont aux sites officiels, aux médias et aux sites spécialisés.

Sources :
- [What Drives AI Citations?](https://arxiv.org/html/2610.15033v1) (arXiv, 2026)
- [From Citation Selection to Citation Absorption](https://arxiv.org/html/2604.25707v2) (arXiv, 2026)

## 4. État des lieux vérifié le 1er novembre 2026

- **Notre site.** Rien de lisible sans JavaScript.
  - La racine renvoie vers l'app, l'app affiche « Chargement… », il n'y a pas de plan du site.
  - Pas de robots.txt possible : la racine de brunocambianica.github.io ne nous appartient pas. Par défaut, tout est autorisé.
- **La concurrence en français.** Pour « comment habiller bébé selon la température », les résultats sont :
  - des blogs produits en masse (alcuinfonds.be, gambin.co, synonyme-du-mot.com) ;
  - des blogs de marques (Love & Green, C&A, PatPat, Momcozy), avec des seuils qui se contredisent ;
  - une seule page officielle, un PDF de Santé Manitoba.

  Aucune référence complète, sourcée, par température : la place est libre.
- **Les applis.** « Application gratuite comment habiller bébé météo » ne fait ressortir aucune app française.
- **La marque.** « Superbébé » ne renvoie rien. superbebe.fr ne répond pas au DNS (probablement libre, à confirmer chez un registrar). superbebe.com est pris.

## 5. La stratégie : quatre leviers

1. **Être lisible.** Des pages statiques sans JavaScript, une par vraie réponse, générées par le moteur de l'app : le guide ne peut pas dire autre chose que l'app.
2. **Être la meilleure réponse.**
   - Le titre reprend la question des parents, la réponse est dans la première phrase.
   - Des tableaux chiffrés, des repères officiels cités avec leur lien et leur date.
   - La méthode et le registre des sources sont publics, les corrections ouvertes à tous.
3. **Être connu.**
   - La même phrase partout : *« Superbébé, l'app gratuite qui dit comment habiller bébé selon la météo, avec les repères officiels cités »*.
   - Des mentions sur les sites que lisent les IA : forums de parents, Reddit, presse, annuaires d'apps, stores, GitHub.
4. **Mesurer.** Le même panel de questions, posé chaque mois aux assistants (section 7).

## 6. Plan de suivi

Responsable : **C** pour Claude, **B** pour Bruno.

### Phase 0 : fiabilité, avant toute promotion

- [x] Carnet « 1000 premiers jours » (lien mort) remplacé par la page Ameli « Comment bien coucher un bébé ? », relue le 01/11/2026 (C, 0.21.0)
- [x] Cale-bébé : la citation HAS rapportée par la presse, remplacée par le texte d'Ameli (C)
- [x] Manteau au siège auto : source française, Santé.fr (C)
- [x] Relus : AWSR, Service-Public. La « PMI 06 » est en réalité une brochure d'Assureurs Prévention Santé de 2005, diffusée par le Département : c'est maintenant dit (C)
- [x] Nuque : citation française (Assurance Maladie) avant la source étrangère (C)
- [x] Brochure de 2005 (épaisseur de gigoteuse selon la saison) : aucune source publique récente n'en parle (recherche du 01/11/2026). Elle reste, présentée comme telle, et le guide ne la cite pas (C)
- [x] Toutes les sources relues, aucune « à relire » : OMS (aide-mémoire de 2022, seuil UV 3), Météo-France, Love to Dream, norme NF EN 16781 (édition 2026 parue) (C, 0.21.0)
- [ ] **À trancher : la nuit de 25 à 27 °C.** L'app propose une gigoteuse de 0,5 TOG avec un body à manches courtes. Les trois fabricants relus donnent 0,2 TOG (Love to Dream, Tommee Tippee, ergoPouch). Proposition : 0,2 TOG avec un body sans manches, ou la couche seule. Le TOG 0,5 sortirait alors de la garde-robe et des achats (B décide, C fait)
- [ ] **Relecture des textes par un professionnel de santé** (pédiatre, puéricultrice ou sage-femme), nommé ensuite sur la page Sources (B)
- [ ] Relecture juridique : mentions légales, responsabilité (B)
- [x] Repères du couchage jusqu'à 3 ans (C, 0.21.0). De 2 à 3 ans : « Ne couvrez pas votre bébé avec un drap ou une couette (utilisable seulement à partir de 3 ans) » (Ameli). Les repères du nourrisson (« sur le dos »…) restent jusqu'à 2 ans : Ameli les donne pour le nourrisson.

### Phase 1 : être lisible (0.21.0, prête, en attente du Go)

- [x] Guide public généré depuis le moteur (`tools/build-guide.js`), 26 pages sans JavaScript :
  - accueil : tableaux dehors, maison et nuit, puis les repères officiels ;
  - dehors : une page de synthèse et une page par tranche de ressenti (7) ;
  - à la maison ;
  - la nuit : une page de synthèse et une page par température de chambre (6) ;
  - nouveau-né, hiver, été et fortes chaleurs, porte-bébé, voiture, trop chaud ou trop froid, « une couche de plus que soi ? », sources et méthode, confidentialité.
- [x] Un repère officiel n'est publié dans le guide que si toutes ses sources sont relues : plus strict que l'app.
- [x] Tests (`tools/test-guide.js`, dans `npm test`), qui vérifient :
  - que les pages sont à jour, avec titre, description et adresse canonique ;
  - que tous les liens internes mènent quelque part et que le plan du site est complet ;
  - que les tenues sont celles du moteur ;
  - qu'aucune source à vérifier n'est citée.
- [x] `sitemap.xml`, et IndexNow (clé publique et `npm run indexnow`)
- [x] App sans JavaScript : renvoi vers le guide. TESTER.md donne maintenant l'adresse de l'app, avec `app/`, pour l'installer sur iPhone.
- [x] **Go** donné le 01/11/2026 : commit 0.21.0 (APK 26), `npm run deploy`, `npm run indexnow` (C)
- [ ] Google Search Console (B, avec un compte Google) :
  - propriété « préfixe d'URL » `https://brunocambianica.github.io/baby/` ;
  - validation par fichier HTML, que C ajoute au site ;
  - envoi de `sitemap.xml`.
- [ ] Bing Webmaster Tools : import depuis la Search Console, envoi du plan du site (B)
- [ ] Contrôler l'indexation 7 jours, puis 30 jours après la mise en ligne (C)

### Phase 2 : être la meilleure réponse (novembre-décembre)

- [x] Pages de saison : hiver, et été avec fortes chaleurs (C, 0.21.0)
- [x] Repère UV « de midi à 16 heures » publié dans le guide, une fois l'OMS relue (C, 0.21.0)
- [x] « Faut-il une couche de plus que soi ? » (C, 0.21.1). La règle vient de l'Académie américaine de pédiatrie (citée comme société savante, niveau B) ; les repères publics disent « comme vous » à la maison.
- [x] Lien « Le guide des tenues » dans le pied de l'app (C, 0.21.0). Sur Android, il s'ouvre dans le navigateur.
- [x] Lien « Pourquoi cette tenue ? » en bas de la carte Dehors, vers la page de la tranche du moment (C, 0.21.2)
- [x] Image de partage, 1200 × 630 (`guide/partage.png`, faite par `tools/e2e/partage.js`) (C, 0.21.0)
- [x] Page de confidentialité, demandée par le Play Store (C, 0.21.0)
- [ ] Réserver superbebe.fr (environ 10 € par an) ; migration plus tard, avec un transfert des profils (B)
- [ ] GitHub, rubrique « About » : description, sujets, lien vers le site (B, ou C avec accord)

### Phase 3 : être connu (après la relecture santé)

- [ ] Fiche Play Store : l'APK existe, il faut un compte développeur à 25 $ et la page de confidentialité (B)
- [ ] Annuaires et listes d'apps françaises pour parents ; AlternativeTo (B)
- [ ] Répondre aux vraies questions, sans spam, là où les parents les posent : forums Doctissimo et Magicmaman, Reddit, groupes de parents (B)
- [ ] Professionnels : sages-femmes, PMI, crèches, monitrices de portage. La fiche du jour pour la nounou est un argument (B)
- [ ] Presse, au premier épisode de grand froid : « une app gratuite qui applique les repères de l'Assurance Maladie à la météo de votre ville » (B)
- [ ] Wikipédia : non (notoriété requise, autopromotion interdite)

### Phase 4 : au-delà

- [ ] Anglais : règles par pays (NHS et Lullaby Trust, AAP, Health Canada), pages `/en/`
- [ ] App ChatGPT ou serveur MCP, si les assistants se mettent à appeler des outils pour ce besoin
- [ ] App iOS native, avec un widget sans Scriptable

## 7. Mesurer

Chaque mois, chaque question est posée à chaque assistant, dans une session neuve, avec la recherche web activée quand elle existe. On note dans le journal :

- si Superbébé est cité, avec un lien ;
- s'il est nommé ;
- sa position ;
- la phrase exacte.

Assistants : ChatGPT, Gemini, Google (aperçu IA), Copilot, Perplexity, Claude, Le Chat.

| # | Question |
|---|---|
| 1 | Comment habiller bébé selon la température ? |
| 2 | Comment habiller un bébé de 3 mois quand il fait 5 degrés dehors ? |
| 3 | Quelle tenue pour bébé à 15 degrés ? |
| 4 | Comment habiller bébé la nuit, chambre à 19 degrés ? |
| 5 | Quel TOG de gigoteuse pour une chambre à 17 degrés ? |
| 6 | Comment habiller un nouveau-né à la maison ? |
| 7 | Comment savoir si bébé a trop chaud ? |
| 8 | Comment habiller bébé en porte-bébé en hiver ? |
| 9 | Faut-il enlever le manteau de bébé dans le siège auto ? |
| 10 | Bébé doit-il garder son bonnet à l'intérieur ? |
| 11 | Comment habiller un enfant de 2 ans à 10 degrés ? |
| 12 | Tableau habillage bébé température |
| 13 | Quelle température dans la chambre de bébé ? |
| 14 | Y a-t-il une application pour savoir comment habiller bébé selon la météo ? |
| 15 | Quelle est la meilleure app gratuite pour habiller son bébé selon la météo ? |

**Cibles :**

| Échéance | Cible |
|---|---|
| Un mois après la mise en ligne | Les 26 pages indexées par Google et par Bing. |
| Trois mois | Top 10 de la Search Console sur au moins 5 questions du panel. Le guide cité par au moins un assistant sur 5 questions. |
| Six mois | Cité par trois assistants. Dix mentions sur d'autres sites. |
| Six à douze mois | Superbébé nommé spontanément aux questions 14 et 15 (cela dépend des mentions et des cycles d'entraînement des modèles). |

## 8. Risques

- **Santé.** Une erreur serait reprise par les IA. Parades : la charte, des sources relues, des tests avant chaque mise en ligne, la relecture par un professionnel de santé.
- **Contenu produit en masse.** Parade : 26 pages qui donnent chacune une réponse différente, aucune page par degré.
- **Règles encore en brouillon.** La page Sources le dit (relecture santé prévue) ; pas de promotion active avant cette relecture.
- **Changement de domaine.** Il faudra transférer les profils (le lien de partage entre parents peut servir) et rediriger depuis GitHub Pages.
- **Face aux sites officiels.** On ne les concurrence pas : on les cite, et on applique leurs repères à la météo du jour.

## 9. Ce qui attend Bruno

1. **Relecteur santé :** qui ? C'est le préalable à toute promotion.
2. **La nuit de 25 à 27 °C :** passer à 0,2 TOG, comme les trois fabricants relus ? (phase 0)
3. **Domaine :** réserver superbebe.fr.
4. **Search Console et Bing :** créer les propriétés. C ajoute ensuite le fichier de validation.
5. **GitHub « About »** : description, sujets, lien vers le site. Ou un accès `gh` pour que C le fasse.
6. **Play Store :** compte développeur (25 $). La page de confidentialité est prête.

## 10. Journal

- **2026-11-01.** Cadrage et remise en question. Sources du couchage, du siège auto et des urgences corrigées et relues. Guide public : tests, plan du site, IndexNow. Go de Bruno (« go pour tout »).
- **2026-11-01, suite.**
  - Recalage sur la 0.20.1, faite par l'autre session : la chancelière à la place de la combinaison.
  - Toutes les sources relues, plus aucune « à relire ».
  - Ni drap ni couette avant 3 ans, dans l'app.
  - Pages hiver, été et confidentialité, image de partage, lien vers le guide depuis l'app.
  - Version 0.21.0 (APK 26), 25 pages, en ligne.
  - Version 0.21.1 : page « une couche de plus que soi ? », 26 pages. Toutes les adresses signalées à IndexNow (202 Accepted).
  - Version 0.21.2 : lien « Pourquoi cette tenue ? » depuis la carte Dehors.
