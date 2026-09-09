# Modèles Meshy à fournir

**Livraisons intégrées.** Seize fichiers GLB optimisés sont disponibles et quinze sont chargés dans le
jeu : la statue de l’Amazone, le Palais des Congrès, un rang de zémidjans, deux passantes, deux zémidjans détaillés, un SUV, un groupe de voitures stationnées, deux variantes animées, trois silhouettes humaines supplémentaires et la vendeuse assise des boutiques.
Le jeu charge donc bien des GLB ; voir « Livraison reçue » ci-dessous pour l’état de chacun et la
chaîne d’optimisation appliquée. Les décors non couverts par un modèle restent construits en code.

Les photographies de référence des lieux, leurs auteurs et leurs licences sont réunies dans [REFERENCES.md](REFERENCES.md). Les observations qui y sont consignées précisent les consignes ci-dessous : elles décrivent ce qu’un modèle doit préserver.

## Livraison reçue — 8 septembre 2026

Les fichiers bruts arrivaient en 66 à 98 Mo et 1,5 à 3 millions de triangles chacun, soit 485 Mo
au total, pour un jeu qui pèse 561 Ko. Chaîne appliquée à chacun :

```
npx @gltf-transform/cli optimize source.glb public/modeles/cible.glb \
  --texture-size 1024 --texture-compress webp --simplify-error <budget>
```

Résultat : 485 Mo → 4,1 Mo pour les cinq modèles retenus. Les fichiers optimisés vivent dans
`public/modeles/`, les bruts dans `3d/glb/` (hors dépôt). Le chargement est assuré par
`src/entities/Modeles.ts` : la scène construite en code s’affiche d’abord, chaque modèle
remplace ensuite son ensemble, et un fichier absent laisse simplement la version construite.

| Modèle Meshy | Fichier du jeu | Triangles | Poids | État |
| --- | --- | --- | --- | --- |
| Bronze Warrior Statue | `amazone.glb` | 25 358 | 380 Ko | en place, remplace la statue construite |
| Seaside Grand Complex | `palais-congres.glb` | 59 880 | 1,7 Mo | en place, remplace les tambours construits |
| Motorcycle Taxi Driver | `zemidjans.glb` | 58 912 | 1,2 Mo | en place, rang de motos au bord du boulevard |
| Blue Confidence | `joggeuse-bleue.glb` | 45 830 | 554 Ko | en place, passante près de la piste |
| Burgundy Confidence | `joggeuse-bordeaux.glb` | 23 800 | 348 Ko | en place, passante près de la piste |
| Liberty Among the Trees | `etoile-rouge.glb` | 101 966 | 1,9 Mo | **écarté** |
| Kekenon (zémidjan seul) | `kekenon.glb` | 151 316 | 2,2 Mo | remplace les 20 zémidjans construits, et celui du joueur |
| Peugeot SUV | `peugeot.glb` | 264 546 | 2,8 Mo | remplace les 3 voitures de la circulation, et celle du joueur |
| Voitures (groupe de 4) | `voitures.glb` | 137 586 | 1,8 Mo | stationnement statique derrière le panneau « P » de la Corniche |

Ces trois véhicules sont arrivés dans une seconde livraison. Deux points appris :

- **Le plancher de simplification est topologique, pas réglable.** Ces maillages, issus de
  photogrammétrie, sont morcelés par leur atlas de textures : le simplificateur refuse de
  descendre sous 45 % environ, quelle que soit la tolérance d'erreur. Le kekenon plafonne à
  151 000 triangles, le Peugeot à 264 000. Tester la version brute de 138 Mo du kekenon a donné
  334 000 triangles, soit *pire* que la version pré-optimisée de 4 Mo.
- **Aucun repli en boîtes.** Un double niveau de détail avait d'abord été mis en place — modèle
  détaillé de près, véhicule construit au loin — mais les boîtes restaient visibles à l'écran et
  ce n'était pas acceptable dès lors que de vrais modèles existent. Les véhicules construits sont
  donc retirés, pas masqués : les 23 zémidjans et voitures sont des modèles détaillés à toute
  distance. Seule subsiste une occultation à 90 m, où le brouillard les a déjà effacés.
  Coût mesuré : 1 508 appels de dessin et 1 190 000 triangles par image. Si cela devait peser sur
  une machine modeste, le levier est de réduire le nombre de véhicules en circulation — ils sont
  dix-neuf, espacés de 22 m — et non de revenir aux boîtes.

`voitures.glb` réunit quatre voitures dans un maillage unique et indivisible, séparées par
plusieurs mètres : elles ne peuvent pas rouler comme un véhicule, elles glisseraient en bloc sur
les deux voies. D'où leur emploi en stationnement.

## Zémidjan mobile reçu — 9 septembre 2026

Le fichier `3d/kekenon.glb` représente une moto rouge conduite par un zémidjan en chemise jaune et casque noir. L'original pesait 132 Mo, comptait 3 121 968 triangles et utilisait trois textures jusqu'à 4 096 × 4 096. La copie `public/modeles/kekenon.glb` pèse 2,2 MiB après compression Meshopt, quantification, décimation et conversion des textures en WebP 1 024 × 1 024. Elle conserve 151 316 triangles et sert de gabarit détaillé aux zémidjans de circulation, aux bornes et au véhicule du joueur.

Le modèle ne contient ni squelette ni animation. Il avance réellement le long de la chaussée et revient au début de son trajet lorsqu'il atteint la fin de la carte, mais les roues ne tournent pas indépendamment puisque la moto et le conducteur forment un seul maillage.

La livraison supplémentaire `3d/zem.glb`, avec conducteur et passagère, est passée de 95 Mo et 3 091 886 triangles à `public/modeles/zem.glb`, 1,7 Mo et 154 553 triangles. Cinq copies roulent dans l’axe des deux voies. `3d/vendeuse.glb` est passée de 93 Mo et 3 107 642 triangles à `public/modeles/vendeuse.glb`, 1,4 Mo et 155 380 triangles. Sa pose assise est placée derrière les comptoirs ; le modèle n’a ni squelette ni animation. Sur la moto pilotable, le corps choisi par le joueur est cloné comme passager derrière le conducteur. Les volumes de collision empêchent les véhicules de se traverser ; lors d’un choc, les modèles complets basculent sur le côté puis se relèvent. Les personnages sont également détectés : une moto ou une voiture qui les heurte s'arrête, déclenche leur chute puis attend la fin de l'accident.

`etoile-rouge.glb` a été écarté après contrôle visuel : le modèle est un diorama posé sur une
butte de terre rouge, planté d’arbres sans feuilles, qui écrase la place et contredit les
photographies. La version construite en code — pylône cannelé à bandeaux de brique, étoile rouge
et son auvent, arbres verts, boutiques — reste en place. Le fichier est conservé si une reprise
du modèle est envisagée : il faudrait une statue et un pylône seuls, sans terrain ni végétation.

Deux enseignements pour les prochaines livraisons :

- **Un modèle par objet, sans terrain.** Les modèles de site arrivent en un seul maillage : extraire la seule statue nécessite une édition de géométrie, et ne peut pas se faire en sélectionnant simplement un objet distinct dans Three.js. Le sol, les arbres et les passants du
  modèle entrent alors en conflit avec ceux du jeu.
- **Personnages sans squelette.** Les modèles fournis sont figés. Ils conviennent aux statues et
  aux figurants immobiles, mais pas au personnage jouable, qui doit marcher : celui-ci reste
  construit en code avec ses jambes animées.

## Livraison commune

- Un modèle par fichier GLB, textures intégrées si possible.
- Style 3D stylisé, couleurs naturelles, détails lisibles à distance.
- Origine au sol, modèle vertical, échelle exprimée en mètres.
- Cible de travail : environ 10 000 à 30 000 triangles par personnage ou statue et textures de 1 024 pixels ; à ajuster après inspection.
- Pour un personnage animé : squelette humanoïde et animations de repos/marche. Un personnage sans squelette peut servir de figurant immobile.
- Les budgets ci-dessus sont des objectifs du projet, pas des garanties de génération.

## 1. Statue de l’Amazone — priorité

Références à consulter : https://amazone.bj/, https://www.gouv.bj/attraction/monument-amazone/ et les photographies listées dans [REFERENCES.md](REFERENCES.md).

Utiliser une photo réelle de la statue entière comme référence visuelle. Une description seule ne suffit pas à préserver sa pose et ses attributs.

Attributs à préserver, relevés sur les photos : jambe gauche portée en avant ; tête relevée ; fusil dressé tenu d’une main, crosse posée au sol ; sabre courbe dans l’autre main, pointé vers le bas ; bandoulière en diagonale sur le buste ; pagne enroulé au-dessus du genou avec pan retombant et ceinture torsadée ; épaulière ; bracelets aux avant-bras ; cheveux ras ; pieds nus.

Consigne : « Reproduction stylisée du monument de l’Amazone de Cotonou à partir de la référence fournie. Préserver la silhouette, la posture, les vêtements et les attributs visibles : fusil dressé crosse au sol, sabre courbe pointé vers le bas, bandoulière, pagne noué, épaulière, pieds nus, tête relevée. Aspect bronze patiné gris-brun, géométrie propre pour un jeu web, statue entière, sans environnement et sans socle. Ne pas inventer d’accessoires. »

Nom attendu : `amazone.glb`. Le socle, la butte rocheuse et la plaque sont construits dans le jeu. Hauteur de référence : trente mètres. Les détails seront comparés aux photos avant validation.

## 2. Aïcha — vendeuse fictive

Consigne : « Personnage féminin adulte béninois fictif pour un jeu de découverte de Cotonou. Style 3D stylisé chaleureux, proportions naturelles, peau brune, ensemble en pagne aux motifs géométriques terracotta et vert, foulard assorti, sandales. Corps entier, pose neutre avec bras légèrement écartés, mains vides, visage accueillant. Sans étal, sans décor, sans texte. Géométrie adaptée à une animation humanoïde. »

Nom attendu : `vendeuse-aicha.glb`. Personnage d’environ 1,65 m ; repos et geste de salutation si disponibles. L’étal et les produits sont séparés.

## 3. Personnage jouable

Consigne : « Jeune adulte béninois fictif pour un jeu de balade urbaine, style 3D stylisé, proportions naturelles, peau brune, t-shirt ocre uni, pantalon vert foncé, baskets claires. Corps entier, pose neutre pour animation, bras légèrement écartés, mains vides. Sans décor, sans texte, silhouette lisible à la troisième personne. »

Nom attendu : `joueur.glb`. Animations souhaitées : repos, marche, course. Le squelette et la qualité des animations doivent être contrôlés après export.

## 4. Statue de l’Étoile Rouge

Les vues nécessaires sont maintenant réunies dans [REFERENCES.md](REFERENCES.md).

Attributs à préserver : homme debout en marche, bras droit levé brandissant une houe ; fusil porté à l’épaule ; fagot de bois lié, dressé à côté de lui ; tunique ceinturée ; calot. Bronze patiné sombre.

Consigne : « Reproduction stylisée de la statue sommitale du monument de l’Étoile Rouge de Cotonou à partir de la référence fournie. Homme debout, bras levé tenant une houe, fusil à l’épaule, fagot de bois à ses côtés. Bronze patiné, statue entière sans pylône ni socle, géométrie propre pour un jeu web. »

Nom attendu : `etoile-rouge.glb`. Le pylône, l’étoile et l’auvent sont construits dans le jeu.

## Plus tard

Moto et conducteur séparés. Inutile de générer les zones entières dans Meshy : les bâtiments, routes et espaces publics sont assemblés dans le jeu, d’après les observations de [REFERENCES.md](REFERENCES.md).

## Références de décor

Les photographies retenues pour chaque lieu, avec auteur, licence et observations, sont dans
[REFERENCES.md](REFERENCES.md). Les décors du jeu en sont déjà tirés.

Aucune reconstruction photogrammétrique ni vérification des angles sur place n’a été effectuée.
L’environnement immédiat de l’Hôtel du Lac reste à documenter avant toute reproduction fidèle.
En cas d’utilisation directe de photos comme textures, vérifier les droits et crédits de chaque
fichier : les textures actuelles sont dessinées en code et ne posent pas cette question.

Contrôle complémentaire : voir [AUDIT-MODELES.md](AUDIT-MODELES.md) pour les mesures, les fichiers incomplets et les limites des personnages.
