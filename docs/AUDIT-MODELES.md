# Contrôle des modèles 3D

## Conclusion

Les copies optimisées sont exploitables dans le prototype Three.js de Cotonou. Les cinq modèles activés se chargent correctement, avec leurs textures. Les silhouettes des monuments peuvent servir au jeu stylisé, mais ce contrôle ne certifie pas une reproduction architecturale ou historique exacte. Les personnages et le groupe de motos restent des éléments statiques.

[Voir les six modèles](audit/modeles-apercu.png).

## Fichiers contrôlés

| Fichier optimisé | Taille (MiB) | Triangles | Usage constaté |
| --- | ---: | ---: | --- |
| `amazone.glb` | 0,36 | 25 358 | Statue active à l’Esplanade ; utilisable pour le prototype |
| `palais-congres.glb` | 1,67 | 59 880 | Bâtiment actif ; site entier avec entourage intégré |
| `joggeuse-bleue.glb` | 0,54 | 45 830 | Figurante immobile près de la piste |
| `joggeuse-bordeaux.glb` | 0,34 | 23 800 | Figurante immobile près de la piste |
| `zemidjans.glb` | 1,16 | 58 912 | Rangée de motos, conducteurs et bâtiment ; décor à l’Étoile Rouge |
| `etoile-rouge.glb` | 1,94 | 101 966 | Fichier valide, volontairement absent des poses de la scène |

MiB = 1 048 576 octets. Total des six copies : **6,01 MiB**. Les cinq chargées dans le jeu totalisent **4,07 MiB** et **213 780 triangles** (hors reste du décor). Les textures des personnages, motos et Amazone sont en 1 024 × 1 024 ; celles du Palais et du modèle Étoile sont en 2 048 × 2 048. Toutes les copies utilisent Meshopt, la quantification de géométrie et des textures WebP. Le décodeur Meshopt est déjà branché au GLTFLoader.

Les six originaux complets dans `3d/glb` totalisent **462,78 MiB**, avec environ 1,5 à 3 millions de triangles chacun : conserver ces fichiers comme sources, utiliser les copies optimisées pour le web. Les six fichiers contenus dans les répertoires `.glb.download` sont **tronqués** : la taille réelle est inférieure à celle déclarée dans l’en-tête GLB. Ne pas les charger dans le jeu. Aucun original ni téléchargement n’a été supprimé pendant ce contrôle.

## Ce qui reste à préparer dans Meshy

- **Personnage jouable et vendeuse** : corps entier, mains dégagées, pose neutre, squelette humanoïde ; animations de repos, marche, course et salutation. Les personnages actuels ont zéro squelette et zéro animation. Déplacer leur maillage entier ne produit pas une marche articulée.
- **Zémidjan pilotable** : une moto isolée, conducteur séparé, sans bâtiment ni autres motos. Le fichier actuel ne propose qu’un seul maillage ; il reste utilisé comme décor. Le véhicule pilotable du jeu est encore celui construit en code.
- **Étoile Rouge** : pylône, étoile et statue isolés, sans terrain ni végétation. La livraison contient un diorama avec une grande emprise au sol, de la terre rouge et des arbres clairsemés. Son remplacement automatique masquerait tout le monument construit en code ; ce choix reste désactivé.
- **Fidélité** : les détails de la pose de l’Amazone, des accessoires et des façades doivent être comparés à plusieurs photos de référence. Les petites inscriptions générées ne constituent pas des textes historiques fiables.

Les deux personnages en tenue de sport ne remplacent pas encore Aïcha : la vendeuse interactive reste le personnage simplifié du stand. Les collisions du jeu sont simples et ne suivent pas chaque triangle des modèles détaillés.

## Corrections apportées

- Placement des GLB via un groupe parent : les transformations internes sont conservées et le centrage se calcule après rotation. Testé avec une géométrie décentrée comportant une échelle interne.
- Panneau de départ déplacé sur le côté : il masquait le joueur dans la vue initiale.
- Compte rendu et captures conservés pour réinspection ; aucune nouvelle optimisation des fichiers GLB n’a été exécutée pendant cet audit.

## Validation et limites

Compilation TypeScript/Vite et huit tests de logique réussis. Trois tests navigateur réussis : interaction à pied, commerce, accueil sur petit écran ; chargement des cinq GLB actifs, guides des cinq lieux, confirmation du paiement du zémidjan, descente et fin de démo. Les entrées de zone du dernier test sont simulées ; la traversée complète et les performances sur téléphone restent à mesurer. Aucun test avec un vrai microphone n’a été réalisé.

Captures : [Corniche](audit/corniche-integree.png), [Amazone](audit/scene-amazone.png), [Palais](audit/scene-palais.png), [Étoile Rouge construite en code](audit/scene-etoile.png). Les captures en scène représentent un angle de caméra particulier ; les monuments hauts nécessitent de lever le regard. Mesures détaillées : [JSON](audit/mesures.json).

La petite taille des fichiers compressés ne représente pas leur consommation de mémoire GPU une fois les textures décodées. Le contrôle valide le chargement et le fonctionnement du prototype sur Chromium de test, sans promettre une fréquence d’images sur tous les appareils.

Pour reproduire l’aperçu, démarrer Vite puis exécuter `node scripts/audit-modeles.mjs`. Variables facultatives : `TEST_BASE_URL` et `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.
