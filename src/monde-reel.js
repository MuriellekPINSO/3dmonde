import * as THREE from 'three';
import { TP } from './terre-pleins.js';
import { $, toLL } from './base.js';
import { COUCHES_SOL, camera, scene, sky, sun } from './scene.js';
import { chargerGoogle } from './google.js';
import { altitudeSol } from './altitude.js';
import { buildingMeshes } from './ville.js';
import { rueActive } from './rue.js';
import { LIEUX, VEGETATION, visibiliteLieux } from './lieux.js';
import { batimentsGoogleVisibles } from './batiments-google.js';

// “Real view”: Google's 3D (satellite imagery and terrain, photorealistic
// buildings where Google has them) is displayed UNDER the model. The Google camera
// follows ours every frame: same position, same heading, same tilt, same field of
// view. Our ground, water and roads are hidden; what remains is our buildings (if
// wanted), the monuments, the traffic, the labels and the whole Zém Run game, which
// thus rides on the real streets as Google sees them.

export const MR = { actif: false, m: null, alt: null, maquette: false, enJeu: false, visite: false, ombre: null };
const v = new THREE.Vector3(), deg = 180 / Math.PI;

async function creerCarte() {
  const g = await chargerGoogle();
  const { Map3DElement } = await g.importLibrary('maps3d');
  const m = new Map3DElement({ mode: 'SATELLITE', defaultUIHidden: true, center: { lat: 6.37, lng: 2.42, altitude: 0 }, range: 2000, tilt: 45, heading: 0 });
  m.style.cssText = 'width:100%;height:100%;display:block';
  m.addEventListener('gmp-error', e => console.warn('Google 3D', e));
  $('#vueGoogle').append(m);
  return m;
}
// Real view alone: Google replaces the drawn ground, buildings, trees and monuments;
// the traffic and the labels remain. With the model (button, or always during
// Zém Run, where volumes are needed at ground level): everything except the ground.
function appliquerVisibilite() {
  const on = MR.actif, maquette = !on || MR.maquette || MR.enJeu;
  for (const c of COUCHES_SOL) c.visible = !on || (MR.enJeu && !!c.userData.route); // in game: our roads, sharp at ground level
  sky.visible = !on;
  for (const b of buildingMeshes) b.visible = maquette;
  batimentsGoogleVisibles(maquette);
  for (const m of VEGETATION) m.visible = maquette;
  for (const m of TP.decor) m.visible = maquette; // hedges, street lights and flags on the medians
  rueActive(maquette);
  LIEUX.caches = !maquette && !MR.visite; visibiliteLieux(camera.position); // the tour shows our monuments
  if (MR.ombre) MR.ombre.visible = on && maquette;
}
/** Turns the real view on or off; returns an error message, or null. */
export async function basculerMondeReel(on) {
  const app = document.getElementById('app'), el = $('#vueGoogle');
  if (on) {
    try { if (!MR.m) MR.m = await creerCarte(); }
    catch (e) { return e.message; }
    if (!MR.ombre) { // the model’s shadows cast onto the Google imagery
      MR.ombre = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: .3, depthWrite: false }));
      MR.ombre.receiveShadow = true; MR.ombre.renderOrder = 2; MR.ombre.frustumCulled = false; scene.add(MR.ombre);
    }
  }
  MR.actif = on; el.hidden = !on; app.classList.toggle('vue-google', on);
  $('#togMaquette').hidden = !on; $('#togMaquette').setAttribute('aria-pressed', String(MR.maquette));
  appliquerVisibilite();
  return null;
}
/** During the tour: the drawn monuments (Porte du Non-Retour, Arène, BCEAO…) stay on top of the Google imagery. */
export function monumentsEnVisite(on) { MR.visite = on; appliquerVisibilite(); }
/** Model (drawn buildings and streets) on top of the Google imagery, or Google alone. */
export function maquetteVisible(on) { MR.maquette = on; appliquerVisibilite(); }

/** Call just before rendering: aligns the Google camera with ours. `centre` = point followed on the ground. */
export function majMondeReel(centre, enJeu = false) {
  if (!MR.actif || !MR.m) return;
  if (enJeu !== MR.enJeu) { MR.enJeu = enJeu; appliquerVisibilite(); }
  // Ground altitude under the followed point (smoothed), to go from “y” to “metres above sea level”.
  const [la, lo] = toLL(centre.x, centre.z), a = altitudeSol(la, lo);
  if (a !== null) MR.alt = MR.alt === null ? a : MR.alt + (a - MR.alt) * .04;
  const base = MR.alt ?? 5;
  camera.getWorldDirection(v);
  const [lat, lng] = toLL(camera.position.x, camera.position.z), m = MR.m;
  m.fov = camera.fov;
  m.heading = ((Math.atan2(v.x, -v.z) * deg) + 360) % 360;
  m.tilt = Math.acos(THREE.MathUtils.clamp(-v.y, -1, 1)) * deg;
  m.roll = 0;
  m.range = Math.max(1, camera.position.distanceTo(centre));
  m.cameraPosition = { lat, lng, altitude: base + camera.position.y };
  // The shadow catcher follows the area covered by the sun's shadow.
  if (MR.ombre) { const c = sun.shadow.camera, w = (c.right - c.left) * 1.2; MR.ombre.position.set(centre.x, .05, centre.z); MR.ombre.scale.set(w, 1, w); }
  // Less haze on the model: the sky and the horizon are Google's.
  scene.fog.near *= 1.8; scene.fog.far *= 1.8;
}
