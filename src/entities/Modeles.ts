import { placerModele } from './Placement';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type { Batisseur } from './Batisseur';
import type { Object3D } from 'three';

/**
 * Chargement des modèles GLB détaillés. La scène construite en code s’affiche
 * d’abord : chaque modèle vient ensuite remplacer son ensemble, et son absence
 * ou son échec laisse simplement la version construite en place.
 */
export type Pose = {
  /** Nom de la pose, et ensemble construit en code qu’elle remplace s’il existe. */
  groupe: string;
  /** Un modèle purement additionnel ne masque aucun ensemble. */
  ajout?: boolean;
  fichier: string;
  x: number;
  z: number;
  /** Hauteur visée en mètres. Pour un modèle de site, préférer `largeur`. */
  hauteur?: number;
  /** Largeur visée en mètres : mise à l’échelle sur l’emprise au sol. */
  largeur?: number;
  /** Assise du modèle, en mètres au-dessus du sol. */
  base?: number;
  /** Rotation autour de l’axe vertical, en radians. */
  rotation?: number;
  /** Branche le modèle chargé à un système d’animation ou de gameplay. */
  apresPose?: (objet: Object3D) => void;
};

/**
 * Charge les modèles disponibles et remplace les ensembles correspondants.
 * Renvoie le compte-rendu de chaque pose, pour journalisation et contrôle.
 */
export async function chargerModeles(b: Batisseur, poses: Pose[], base = '/modeles/') {
  // Publication en un seul fichier : les modèles peuvent être intégrés à la page.
  const integres = (globalThis as {__modeles?: Record<string, string>}).__modeles;
  // Les modèles sont compressés au format meshopt : le décodeur est indispensable.
  const chargeur = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const journal: {groupe: string; etat: 'posé' | 'absent' | 'échec'; detail?: string}[] = [];
  await Promise.all(poses.map(async pose => {
    const remplace = b.groupes.get(pose.groupe);
    try {
      const gltf = await chargeur.loadAsync(integres?.[pose.fichier] ?? base + pose.fichier);
      const {objet, echelle} = placerModele(gltf.scene, pose);
      objet.name = `modele:${pose.groupe}`;
      b.scene.add(objet);
      if (remplace && !pose.ajout) remplace.visible = false;
      pose.apresPose?.(objet);
      journal.push({groupe: pose.groupe, etat: 'posé', detail: `échelle ${echelle.toFixed(3)}`});
    } catch (erreur) {
      const message = erreur instanceof Error ? erreur.message : String(erreur);
      // Un modèle manquant n’est pas une panne : la version construite en code reste visible.
      journal.push({groupe: pose.groupe, etat: /404|not found/i.test(message) ? 'absent' : 'échec', detail: message.slice(0, 120)});
    }
  }));
  return journal;
}
