# Balade à Cotonou — cadrage du MVP

## Concept

Un jeu de découverte urbaine en 3D dans le navigateur. Le joueur explore Cotonou à pied, emprunte des transports payants, discute avec des vendeuses par écrit ou par voix et découvre les lieux avec des guides écrits et audio.

Le dossier était vide au démarrage. Le cadrage ci-dessous décrit le MVP cible ; les quatre zones et les cinq lieux sont maintenant implémentés, et leurs décors sont repris d’après des photographies des lieux réels (voir « Prototype disponible » et [docs/REFERENCES.md](docs/REFERENCES.md)).

## Parcours de la démo

Quatre zones représentent cinq lieux. Les distances et les liaisons seront simplifiées pour rendre la balade jouable ; ce ne sera pas une reproduction à l'échelle de toute la ville.

| Zone | Contenu | Objectif |
| --- | --- | --- |
| Corniche, Akpakpa, près de l'Hôtel du Lac | Départ, guide, jogging, borne de zémidjan | Apprendre à marcher, interagir et faire du sport |
| Esplanade de l'Amazone et Présidence | Deux points d'intérêt, guide, vendeuse proposant 2 à 3 objets | Découvrir les deux lieux et effectuer un achat |
| Palais des Congrès | Bâtiment et guide | Écouter ou lire la présentation |
| Étoile Rouge | Carrefour, monument et guide | Terminer le parcours et afficher le bilan de la démo |

## Mécaniques essentielles

- Déplacement à pied avec caméra à la troisième personne et collisions simples.
- Manette : joystick gauche pour se déplacer, joystick droit pour orienter la caméra et boutons PlayStation pour les actions principales.
- Interaction à proximité avec la touche E et une indication visible de l'action disponible.
- Guide : texte toujours disponible, lecture audio déclenchée par le joueur, arrêt de la narration et possibilité de relire.
- Jogging : Espace démarre l'activité dans sa zone ; courte épreuve avec progression et résultat.
- Transport : affichage du tarif en FCFA avant validation, déduction unique, passage en mode véhicule plus rapide et possibilité de descendre.
- Commerce : conversation par écrit ou par voix, catalogue de 2 à 3 objets, prix, confirmation et inventaire simple.
- Progression : lieux visités, objectif courant et message de fin après le dernier guide du parcours.

## Conversations avec les vendeuses

- À proximité d'une vendeuse, E ouvre une conversation avec un champ de texte et un bouton micro.
- Le joueur peut saisir librement un message ou parler au micro, et alterner entre les deux modes dans la même conversation.
- La vendeuse peut saluer, présenter ses produits, expliquer les prix et répondre aux questions prévues sur le lieu. Exemple : « Bonjour, qu'est-ce que vous vendez ? » ou « Combien ça coûte ? ».
- Les réponses apparaissent dans l'historique écrit et peuvent être lues à voix haute, avec une commande pour couper la voix.
- Le micro s'active uniquement sur demande du joueur, avec autorisation et indication visible de l'écoute. L'écoute s'arrête à la fermeture du dialogue.
- Le texte reconnu depuis la voix est affiché. Si le micro est refusé, indisponible ou si la reconnaissance échoue, le joueur peut continuer par écrit.
- Un achat nécessite une confirmation explicite affichant l'objet et son prix, même si la demande initiale est orale.
- Pour le MVP, les échanges portent sur les produits, les achats et le lieu ; une question non comprise entraîne une réponse invitant à reformuler.

## Périmètre proposé

Le premier MVP comprend le zémidjan. La voiture, présente dans le concept global, sera ajoutée après validation du parcours complet. Les tarifs, le budget initial et les objets vendus seront des paramètres de jeu à définir, sans les présenter comme des prix réels.

Le trajet doit rester réalisable à pied si le joueur manque d'argent. Un paiement refusé ne modifie ni le solde ni l'inventaire. Les narrations ne doivent pas se superposer.

## Direction technique proposée

- Application web avec TypeScript, Vite et Three.js.
- Première version pour ordinateur avec clavier, souris ou manette compatible ; commandes tactiles directionnelles disponibles.
- Décors 3D stylisés et légers, avec des repères architecturaux reconnaissables, dessinés d’après photographies des lieux.
- Première version audio par synthèse vocale française du navigateur, avec texte disponible si aucune voix adaptée n'est accessible. Des voix enregistrées pourront la remplacer.
- Conversations : saisie texte et transcription de la voix vers le même système de dialogue. Le choix du service de reconnaissance vocale et du moteur de réponses reste à valider lors du prototype ; la synthèse vocale seule ne permet pas de comprendre le joueur.
- État centralisé : solde, inventaire, mode de déplacement, visites et activité sportive.
- Contenus des guides séparés du code pour faciliter corrections et enrichissement.

Ces choix sont des propositions de départ, pas des contraintes déjà validées.

## Étapes de réalisation

1. **Prototype de la Corniche** : scène, personnage, caméra, collisions, interaction et premier guide texte/audio.
2. **Boucle de jeu locale** : jogging, solde en FCFA, zémidjan, montée et descente.
3. **Parcours complet** : trois autres zones, liaisons, guides, vendeuse avec conversation écrite et vocale, achats et inventaire.
4. **Finition de la démo** : ambiance visuelle et sonore, objectif courant, bilan final et optimisation.

## Critères de validation

- Le jeu démarre dans le navigateur à la Corniche et affiche les commandes.
- Une manette reconnue par le navigateur permet de jouer, conduire et parcourir les menus. Les manettes compatibles vibrent pour les pas, la course, les moteurs, les interactions et les validations.
- À la Corniche, la mer et les rouleaux d’écume sont animés ; l’ambiance sonore ajoute un ressac modulé quand elle est activée.
- Le joueur peut parcourir les quatre zones et découvrir les cinq lieux.
- Chaque guide reste accessible à l'écrit ; l'audio démarre sur demande lorsque le navigateur le permet.
- Le jogging peut être commencé et terminé avec un résultat visible.
- Le zémidjan accélère le déplacement et débite exactement le tarif confirmé.
- Un achat valide débite le solde et ajoute l'objet ; un solde insuffisant empêche l'achat.
- Le joueur peut discuter avec une vendeuse par texte ou par voix, et changer de mode en conservant l'historique.
- Les réponses de la vendeuse sont lisibles et peuvent être écoutées ; sans accès au micro, la conversation écrite reste utilisable.
- Une demande d'achat orale ne débite jamais le solde avant confirmation explicite.
- La démo reste terminable sans transport payant.
- La fin se déclenche après la découverte des lieux précédents et du guide de l'Étoile Rouge.

## Contenus à vérifier avant publication

Le concept fourni sert de base éditoriale. Les dates, dimensions, auteurs, origines historiques, descriptions institutionnelles et positions précises des monuments doivent être vérifiés auprès de sources fiables avant d'être intégrés aux guides définitifs. Aucun de ces éléments n'a encore été vérifié dans ce cadrage.

## Prototype disponible — les quatre zones

Installation : `npm install`. Démarrage : `npm run dev`, puis ouvrir l’adresse locale affichée. Compilation : `npm run build`. Vérification des règles d’achat : `npm test`.

Le parcours complet est jouable : la Corniche Est, l’Esplanade de l’Amazone avec le Palais de la Marina, le Palais des Congrès et la place de l’Étoile Rouge. On y trouve un personnage avec caméra orientable par glissement, des guides écrits avec lecture vocale, une vendeuse fictive avec réponses préparées, trois produits et confirmation d’achat, un inventaire de session, un parcours de jogging, et des bornes de transport proposant le zémidjan ou la voiture avec tarif confirmé avant débit.

Aïcha tient un étal à la Corniche et un second à l’Esplanade. Le premier sert à essayer la boucle locale dès le départ.

Commandes clavier : ZQSD, WASD ou flèches pour marcher ; E pour interagir à proximité ; Espace au départ de la bande terracotta pour commencer le jogging ; F pour descendre d’un véhicule. Sur une DualSense : joystick gauche pour marcher ou conduire, joystick droit pour regarder, ✕ pour interagir et valider, □ pour le jogging, ○ pour revenir ou descendre, △ pour le sac, Options pour le parcours et croix directionnelle pour naviguer dans les dialogues. La manette peut être reliée en USB ou en Bluetooth ; il faut parfois appuyer sur une touche après l’ouverture de la page pour que le navigateur l’expose au jeu.

La voix est facultative. La lecture utilise la synthèse vocale du navigateur. La saisie orale utilise sa reconnaissance vocale lorsqu’elle est disponible ; le joueur relit la transcription puis l’envoie. Le support dépend du navigateur et de ses permissions ; selon le navigateur, l’audio peut être traité par un service en ligne. Voir [MDN — Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API). Les conversations libres par IA, la sauvegarde et les personnages animés restent à développer. À la demande de l’utilisateur, le jeu fonctionne pour le moment sans OpenAI et sans clé API, avec des réponses préparées.

### Décors repris d’après photographies

Les cinq lieux ont été redessinés en observant des photographies de Wikimedia Commons et les descriptions des sources officielles et encyclopédiques. Chaque photo consultée, son auteur, sa licence et ce qu’elle a permis d’observer sont consignés dans [docs/REFERENCES.md](docs/REFERENCES.md).

Ce que cela change par rapport aux décors inventés de la première version :

- **Corniche Est** : plage ouverte, chemin côtier pavé, bande de sable plantée de jeunes palmiers, large trottoir, piste de mise en forme, chaussée marquée et lampadaires solaires. La bande de jogging reste volontairement très lisible pour le mini-jeu.
- **Repérage local 2026** : 66 photos et 24 vidéos prises sur place ont corrigé la Corniche et la route vers l’Amazone. La plage est désormais ouverte, avec chemin côtier, sable et jeunes palmiers ; la liaison reçoit la longue fresque portuaire, la Cité ministérielle, les jardins, les feux et le boulevard élargi observés dans ces médias.
- **Monument de l’Amazone** : guerrière debout, fusil dressé crosse au sol, sabre courbe pointé vers le bas, bandoulière, pagne noué, épaulière, butte de roche et socle à plaque, à l’échelle d’un monument de trente mètres. Les vidéos fournies ont permis de reprendre le grand parvis pavé à bandes géométriques, sa zone centrale grise, les massifs fleuris, l’emmarchement en pierre sombre et la pelouse arrière, avec les portiques du port à l’horizon.
- **Palais de la Marina** : long bâtiment beige sur pilotis, bandeaux vitrés bleutés, travée centrale sombre en retrait, cages d’escalier débordantes, clôture à barreaux, drapeaux et palmiers royaux.
- **Palais des Congrès** : deux tambours évasés vers le haut, parement nervuré, toiture ovale à oculus cerné d’un anneau doré, claustras au pied du grand tambour, aile de liaison à dalle en surplomb, emmarchement et mâts.
- **Étoile Rouge** : zone entièrement refaite. Pylône effilé à pied évasé, béton cannelé et bandeaux de brique, haubans, étoile rouge à cinq branches et son auvent, statue de bronze au sommet brandissant la houe, mâts en treillis et boutiques basses.
- **Zémidjan** : moto rouge sombre et conducteur en chemise jaune, comme sur les taxis-motos de Cotonou.

Les matières sont dessinées au canvas dans `src/entities/Batisseur.ts` : pavés, asphalte marqué, sable, gazon, béton, vitrages, cannelures, bandeaux de brique, claustras, tôle et façades. Aucune photographie n’est copiée dans le dépôt ni utilisée comme texture. Les monuments sont assemblés dans `src/entities/Monuments.ts`.

Les volumes restent stylisés et légers : ce sont des silhouettes reconnaissables, pas des relevés.

### Modèles Meshy intégrés

Seize fichiers GLB optimisés sont disponibles ; quinze sont utilisés. La statue de
l’Amazone et le Palais des Congrès sont désormais des modèles détaillés, à la place des volumes
construits en code ; s’y ajoutent un rang de zémidjans au bord du boulevard et deux passantes en
tenue de sport près de la piste de mise en forme. Le zémidjan et le SUV détaillés remplacent les
véhicules de circulation et ceux du joueur ; un groupe de voitures complète le stationnement. Deux
fichiers légers fournissent enfin la marche, la course et trois silhouettes supplémentaires aux personnages.
Un second zémidjan avec passagère ajoute cinq véhicules mobiles sur les deux voies, et une
vendeuse assise prend place derrière les comptoirs. Quand le joueur monte sur un zémidjan, son
personnage reste visible comme passager derrière le conducteur. Les véhicules sont solides :
la circulation conserve une distance de sécurité et une collision couche temporairement les
motos, conducteurs et passagers avant leur remise en route. Une moto ou une voiture qui percute
un personnage déclenche aussi un accident : le personnage tombe, le véhicule s'immobilise et
tous deux reprennent leur route après quelques secondes.

Le sol et la chaussée continuent au-delà des limites jouables afin que les véhicules ne flottent
jamais en bout de carte. Des volumes d'immeubles lointains, des nuages légers et un ciel en
dégradé ferment la perspective lorsque la caméra regarde hors des quatre zones détaillées.

Une passe d'ambiance anime aussi la ville : oiseaux en mouvement, poussière sous les pas et les
véhicules, palmes, drapeaux et nuages sensibles au vent. Le rendu utilise une courbe de couleur
cinéma. La caméra élargit progressivement son champ avec la vitesse, accompagne les pas et réagit
aux collisions, sans ajouter de post-traitement lourd pour les ordinateurs moins puissants.

Les feux de l'axe institutionnel suivent maintenant un cycle rouge, orange et vert, et les véhicules
s'arrêtent avant le passage piéton lorsque le feu est rouge. Les passants saluent le joueur à pied,
s'écartent avec crainte devant un véhicule proche et réagissent aux accidents. Monter ou descendre
d'un zémidjan ou d'une voiture déclenche une transition visible avant de rendre les commandes.

Les quinze fichiers actifs optimisés tiennent en environ 15,7 MiB. Le détail de la chaîne, le tableau des modèles et la raison
pour laquelle celui de l’Étoile Rouge a été écarté sont dans [docs/MESHY.md](docs/MESHY.md).

Le chargement est progressif : la scène construite en code s’affiche immédiatement, puis chaque
modèle remplace son ensemble. Un fichier manquant ou illisible laisse la version construite
visible, sans interrompre le jeu.

### Vérifications du prototype

- Compilation TypeScript et production Vite réussies.
- Neuf tests de logique réussis : commerce, portefeuille partagé, transport, progression, jogging, manette et placement des modèles après rotation.
- Les sept tests Playwright couvrent la marche vers le guide et la vendeuse, l’achat et l’inventaire, l’accueil à 390 pixels, le chargement des modèles, les personnages articulés et leurs réactions, les cinq nouveaux zémidjans, les cinq guides, le paiement et la conduite des deux transports, les transitions d'embarquement, les feux tricolores, la manette DualSense simulée et les nouveaux repères photographiés.
- Capture de la scène contrôlée visuellement : `docs/prototype-desktop.png`.
- Les cinq lieux ont été contrôlés visuellement en comparant des vues rendues aux photographies de référence, à hauteur d’yeux du joueur et en vue rapprochée. La page d’aperçu utilisée pour ces rendus était temporaire et n’est pas conservée dans le dépôt.
- Les modèles Meshy ont été rendus avant et après optimisation, puis contrôlés en place dans la scène. C’est ce contrôle qui a conduit à écarter celui de l’Étoile Rouge et à orienter le zémidjan détaillé sur sa voie.
- Regard vertical vérifié : la caméra dégage bien le sommet des monuments, hauts de vingt-cinq à trente-cinq mètres.
- Reconnaissance vocale, restitution sonore, parcours de jogging complet et sensations avec une vraie manette restent à vérifier manuellement ; aucun test matériel d’audio ou de vibration n’a été réalisé.

Pour les tests navigateur : démarrer `npm run dev`, installer Chromium avec `npx playwright install chromium` si nécessaire, puis lancer `npx playwright test`. La variable facultative `PLAYWRIGHT_CHROMIUM_EXECUTABLE` permet d’utiliser un Chromium déjà installé.

Dernier contrôle des modèles : [audit détaillé et aperçu](docs/AUDIT-MODELES.md). Les tests navigateur acceptent `TEST_BASE_URL` si Vite utilise un autre port.

### Rues et ambiance quotidienne

Les abords comportent désormais des devantures variées, enseignes fictives, auvents, petits étals, kiosques, balcons, terrasses et deux percées latérales. Vingt véhicules décoratifs, dont le zémidjan détaillé, et sept passants suivent des trajectoires animées. Les personnages construits en code ont des volumes arrondis et des tenues variées ; cela ne remplace pas le travail d'animation des futurs personnages Meshy.

Le bouton **Ambiance 3D** active un mixage spatial HRTF sans clé API ni fichier sonore distant. La mer,
la circulation et l'activité du marché viennent de leur position dans la scène ; le moteur suit le
véhicule du joueur et change de hauteur avec l'accélération. Le son est désactivé par défaut à cause
des règles de lecture automatique des navigateurs, puis s'atténue pendant un dialogue ou lorsque la
page perd le focus. La caméra initiale est moins plongeante et le panneau latéral laisse davantage de
place au décor. Le carnet complet reste accessible avec **Parcours**.

Il s'agit d'une évocation stylisée : les rues restent linéaires et les noms des commerces sont fictifs. Voir les [références de cette passe](docs/REFERENCES.md).

Validation de cette passe : compilation et neuf tests de logique réussis ; les tests navigateur vérifient notamment l'arrêt au feu rouge, la réaction des PNJ, la transition de montée, la commande d'ambiance 3D et le déplacement du zémidjan détaillé. Le test vérifie la commande sonore, pas sa qualité d'écoute. Captures : [vue initiale](docs/audit/rues-corniche.png), [commerces](docs/audit/rues-akpakpa.png), [abords de l'Étoile Rouge](docs/audit/rues-etoile.png), [montée sur le zémidjan](docs/audit/animation-montee-zemidjan.png).

Une vidéo de 53 secondes de la Corniche Est a ensuite corrigé le premier secteur : sa rue est plus ouverte et moins commerçante, avec lampadaires solaires, murs de propriétés, bâtiments en retrait, passages piétons, panneaux et accotements sableux. Cette vidéo concerne la Corniche Est et ne constitue pas un passage par les cinq lieux. Les observations détaillées sont consignées dans [les références](docs/REFERENCES.md).
