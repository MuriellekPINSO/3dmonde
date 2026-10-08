import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { LITE } from './base.js';

// ---------- Recognisable buildings: Tripo models generated from photos ----------
// scripts/tripo.mjs builds public/modeles/batiments/<id>.glb from a photo
// (Wikimedia Commons, credits in scripts/tripo-photos.json) and keeps the list up to date
// in index.json. When a model exists, the hand-drawn place keeps its surroundings
// (square, car park, roundabout) and the model takes the place of the building.

export const TRIPO = { dispo: new Set(), info: {} };
/** Await this before building the places: which models exist. */
export async function chargerIndexTripo() {
  try {
    const r = await fetch(import.meta.env.BASE_URL + 'modeles/batiments/index.json');
    if (r.ok && /json/.test(r.headers.get('content-type') || '')) { TRIPO.info = await r.json(); for (const id of Object.keys(TRIPO.info)) TRIPO.dispo.add(id); }
  } catch { }
  return TRIPO.dispo.size;
}
export const tripoDispo = id => TRIPO.dispo.has(id);

// Per-building fine tuning (rotation in radians, added to the place's own; local offset in metres).
export const REGLAGES = { congres: {}, cathedrale: { rot: -Math.PI / 2 }, porte: {}, etoile: {}, bioguera: {}, dome: { dy: -6, mat: { couleur: '#b7bbbe', rugosite: .5, metal: .25 } }, dantokpa: { rot: Math.PI / 2 }, bceao: {}, sofitel: { rot: Math.PI / 2 } }; // sofitel: curved facade and canopy facing the boulevard // dantokpa: sign and stalls facing the lagoon // dome: night photo, we keep the volume and a silver tint // dome: the base (photographed forecourt) sinks into the ground
const chargeur = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
/**
 * Places model `id` in `parent` (the place's local frame): set on the ground, centred on (x, z),
 * scaled by its height or its largest width, rotated by `rot` (radians).
 */
export function poserTripo(id, parent, opts = {}) {
  const R = REGLAGES[id] || {}, { hauteur, largeur } = { ...opts, ...R }, rot = (opts.rot || 0) + (R.rot || 0), x = (opts.x || 0) + (R.dx || 0), y = (opts.y || 0) + (R.dy || 0), z = (opts.z || 0) + (R.dz || 0);
  const pivot = new THREE.Group(); pivot.name = `tripo-${id}`; pivot.position.set(x, y, z); pivot.rotation.y = rot; parent.add(pivot);
  // The file size acts as a version: a rebuilt model is not served from the browser cache.
  chargeur.loadAsync(import.meta.env.BASE_URL + `modeles/batiments/${id}.glb?v=${TRIPO.info[id]?.octets || 0}`).then(gltf => {
    const obj = gltf.scene, boite = new THREE.Box3().setFromObject(obj), t = boite.getSize(new THREE.Vector3());
    const k = hauteur ? hauteur / t.y : largeur / Math.max(t.x, t.z);
    obj.scale.setScalar(k);
    const b2 = new THREE.Box3().setFromObject(obj), c = b2.getCenter(new THREE.Vector3());
    obj.position.set(-c.x, -b2.min.y, -c.z);
    obj.traverse(n => { if (n.isMesh) { n.castShadow = !LITE; n.receiveShadow = true; n.userData.garder = true; if (R.mat) n.material = new THREE.MeshStandardMaterial({ color: R.mat.couleur, roughness: R.mat.rugosite ?? .6, metalness: R.mat.metal ?? .2 }); } });
    pivot.add(obj);
  }).catch(e => console.warn(`model ${id} not loaded`, e));
  return pivot;
}
