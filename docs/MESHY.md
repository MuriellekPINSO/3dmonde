# Modèles Meshy à fournir

**Première livraison intégrée.** Six modèles Meshy ont été fournis et cinq sont en place dans le
jeu : la statue de l’Amazone, le Palais des Congrès, un rang de zémidjans et deux passantes.
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
