import * as T from 'three';

export type Placement = {
  x: number; z: number; hauteur?: number; largeur?: number; base?: number; rotation?: number;
};

/** Préserve les transformations internes du GLB, puis le centre après rotation. */
export function placerModele(objet: T.Object3D, pose: Placement) {
  const pivot = new T.Group();
  pivot.add(objet);
  pivot.rotation.y = pose.rotation ?? 0;
  pivot.updateMatrixWorld(true);
  const boite = new T.Box3().setFromObject(pivot);
  const taille = boite.getSize(new T.Vector3());
  const dimension = pose.largeur !== undefined ? Math.max(taille.x, taille.z) : taille.y;
  const cible = pose.largeur ?? pose.hauteur ?? 1;
  if (boite.isEmpty() || !Number.isFinite(dimension) || dimension <= 0 || !Number.isFinite(cible) || cible <= 0) {
    throw new Error('Dimensions du modèle invalides.');
  }
  const echelle = cible / dimension;
  pivot.scale.setScalar(echelle);
  pivot.updateMatrixWorld(true);
  boite.setFromObject(pivot);
  const centre = boite.getCenter(new T.Vector3());
  pivot.position.set(pose.x - centre.x, (pose.base ?? 0) - boite.min.y, pose.z - centre.z);
  pivot.updateMatrixWorld(true);
  pivot.traverse(n => { if ((n as T.Mesh).isMesh) { n.castShadow = true; n.receiveShadow = true; } });
  return {objet: pivot, echelle};
}
