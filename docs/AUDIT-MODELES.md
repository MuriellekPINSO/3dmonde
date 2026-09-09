# Contrôle des modèles 3D

## Conclusion

Les copies optimisées sont exploitables dans le prototype Three.js de Cotonou. Quinze GLB sont utilisés : neuf modèles de décor ou de véhicules et six modèles de personnages. Les silhouettes des monuments peuvent servir au jeu stylisé, mais ce contrôle ne certifie pas une reproduction architecturale ou historique exacte. Les gabarits `kekenon.glb`, `zem.glb` et `peugeot.glb` équipent les véhicules mobiles ; `vendeuse.glb` habille les vendeuses assises.

[Voir l’aperçu de la première livraison](audit/modeles-apercu.png).

## Fichiers contrôlés

| Fichier optimisé | Taille (MiB) | Triangles | Usage constaté |
| --- | ---: | ---: | --- |
| `amazone.glb` | 0,36 | 25 358 | Statue active à l’Esplanade ; utilisable pour le prototype |
| `palais-congres.glb` | 1,67 | 59 880 | Bâtiment actif ; site entier avec entourage intégré |
| `joggeuse-bleue.glb` | 0,54 | 45 830 | Figurante immobile près de la piste |
| `joggeuse-bordeaux.glb` | 0,34 | 23 800 | Figurante immobile près de la piste |
| `zemidjans.glb` | 1,16 | 58 912 | Rangée de motos, conducteurs et bâtiment ; décor à l’Étoile Rouge |
| `kekenon.glb` | 2,18 | 151 316 | Gabarit des zémidjans de circulation, des bornes et du joueur |
| `peugeot.glb` | 2,83 | 264 546 | Gabarit des SUV de circulation et de la voiture du joueur |
| `voitures.glb` | 1,81 | 137 586 | Groupe statique de quatre voitures stationnées |
| `marcheur.glb` | 0,58 | 3 126 | Personnage articulé et animation de marche |
| `coureur.glb` | 0,57 | 3 126 | Animation de course du même personnage |
| `personnage1.glb` | 0,22 | 5 168 | Silhouette supplémentaire pour varier la foule |
| `perso2.glb` | 0,15 | 3 466 | Silhouette supplémentaire pour varier la foule |
| `go2.glb` | 0,32 | 14 668 | Silhouette supplémentaire pour varier la foule |
| `zem.glb` | 1,66 | 154 553 | Second zémidjan ; cinq copies mobiles avec conducteur et passagère |
| `vendeuse.glb` | 1,34 | 155 380 | Vendeuse assise derrière les comptoirs d’Aïcha et des boutiques |
| `etoile-rouge.glb` | 1,94 | 101 966 | Fichier valide, volontairement absent des poses de la scène |

MiB = 1 048 576 octets. Total des seize copies : **17,64 MiB**. Les quinze chargées dans le jeu totalisent environ **15,70 MiB** et **1 106 715 triangles de géométrie unique** (hors reste du décor et instances). Les textures des personnages, motos et Amazone sont en 1 024 × 1 024 ; celles du Palais et du modèle Étoile sont en 2 048 × 2 048. Toutes les copies utilisent Meshopt, la quantification de géométrie et des textures WebP. Le décodeur Meshopt est déjà branché au GLTFLoader.

Le répertoire des originaux atteint désormais environ **1,5 Gio** : conserver ces fichiers comme sources, utiliser les copies optimisées pour le web. Les fichiers contenus dans les répertoires `.glb.download` sont **tronqués** : la taille réelle est inférieure à celle déclarée dans l’en-tête GLB. Ne pas les charger dans le jeu. Aucun original ni téléchargement n’a été supprimé pendant ce contrôle.

## Ce qui reste à préparer dans Meshy

- **Animations de vendeuse** : le modèle reçu convient à une pose assise derrière le comptoir, mais n’a ni squelette ni animation. Une salutation articulée demandera une version riggée.
- **Animations de véhicule** : les gabarits détaillés sont pilotables et mobiles, mais leurs roues ne tournent pas indépendamment car chaque livraison est un maillage sans animation.
- **Étoile Rouge** : pylône, étoile et statue isolés, sans terrain ni végétation. La livraison contient un diorama avec une grande emprise au sol, de la terre rouge et des arbres clairsemés. Son remplacement automatique masquerait tout le monument construit en code ; ce choix reste désactivé.
- **Fidélité** : les détails de la pose de l’Amazone, des accessoires et des façades doivent être comparés à plusieurs photos de référence. Les petites inscriptions générées ne constituent pas des textes historiques fiables.

La vendeuse détaillée remplace maintenant Aïcha et les vendeuses des boutiques. Les collisions du jeu sont simples et ne suivent pas chaque triangle des modèles détaillés.

## Corrections apportées

- Placement des GLB via un groupe parent : les transformations internes sont conservées et le centrage se calcule après rotation. Testé avec une géométrie décentrée comportant une échelle interne.
- Panneau de départ déplacé sur le côté : il masquait le joueur dans la vue initiale.
- Les deux nouvelles livraisons ont été simplifiées à 5 %, compressées avec Meshopt et converties en WebP 1 024 px avant intégration.

## Validation et limites

Compilation TypeScript/Vite et neuf tests de logique réussis. Sept tests navigateur couvrent l’interaction à pied, le commerce, l’accueil sur petit écran, le chargement des modèles, les personnages articulés, les cinq nouveaux zémidjans, la vendeuse, les guides, le paiement et la conduite des deux transports, la manette DualSense simulée et les repères issus des nouveaux médias. Les entrées de zone du test de parcours sont simulées ; la traversée complète et les performances sur téléphone restent à mesurer. Aucun test avec un vrai microphone n’a été réalisé.

Captures : [Corniche](audit/corniche-integree.png), [Amazone](audit/scene-amazone.png), [Palais](audit/scene-palais.png), [Étoile Rouge construite en code](audit/scene-etoile.png). Les captures en scène représentent un angle de caméra particulier ; les monuments hauts nécessitent de lever le regard. Mesures détaillées : [JSON](audit/mesures.json).

La petite taille des fichiers compressés ne représente pas leur consommation de mémoire GPU une fois les textures décodées. Le contrôle valide le chargement et le fonctionnement du prototype sur Chromium de test, sans promettre une fréquence d’images sur tous les appareils.

Pour reproduire l’aperçu, démarrer Vite puis exécuter `node scripts/audit-modeles.mjs`. Variables facultatives : `TEST_BASE_URL` et `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.
