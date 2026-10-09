import * as THREE from 'three';
import { scene } from './scene.js';

// ---------- What you pay for, you receive ----------
// When the zém buys something, you see the exchange: the banknote goes from his hand to the
// vendor, then the item bought (water sachet, fritters, bottle of petrol, helmet, phone credit
// card…) passes from the vendor's hand to the zém's or the customer's, in an arc, and stays there a moment.
// For petrol, the bottle goes all the way to the tank and tilts while it pours.

const ANIMS = [];
const mat = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o });
function objet(type) {
  const g = new THREE.Group();
  const add = (geo, m, x = 0, y = 0, z = 0) => { const s = new THREE.Mesh(geo, m); s.position.set(x, y, z); g.add(s); return s; };
  if (type === 'billet') { add(new THREE.BoxGeometry(.16, .005, .08), mat('#4f8a4a')); add(new THREE.BoxGeometry(.15, .006, .07), mat('#6fae66'), 0, .004, .006); }
  else if (type === 'eau') add(new THREE.BoxGeometry(.16, .06, .22), mat('#cfe8f7', { transparent: true, opacity: .85 }));
  else if (type === 'beignets') { add(new THREE.ConeGeometry(.1, .2, 10).rotateX(Math.PI), mat('#e9dcc0'), 0, .02, 0); for (const [x, z] of [[-.04, 0], [.04, .01], [0, -.04]]) add(new THREE.SphereGeometry(.045, 8, 6), mat('#b9792f'), x, .11, z); }
  else if (type === 'essence') { add(new THREE.CylinderGeometry(.09, .11, .42, 10), mat('#f2c21b', { transparent: true, opacity: .9 }), 0, .21, 0); add(new THREE.CylinderGeometry(.04, .04, .06, 8), mat('#c8382f'), 0, .45, 0); }
  else if (type === 'casque') add(new THREE.SphereGeometry(.16, 12, 8, 0, Math.PI * 2, 0, Math.PI * .55), mat('#1d2733'));
  else if (type === 'carte') add(new THREE.BoxGeometry(.09, .005, .055), mat('#2f6fb0'));
  else if (type === 'outil') { add(new THREE.BoxGeometry(.04, .03, .3), mat('#8f979b', { })); add(new THREE.TorusGeometry(.04, .012, 6, 12, Math.PI * 1.4).rotateX(Math.PI / 2), mat('#8f979b'), 0, 0, .16); }
  else if (type === 'souvenir') { add(new THREE.CylinderGeometry(.05, .07, .28, 8), mat('#7a4a2c'), 0, .14, 0); add(new THREE.SphereGeometry(.06, 8, 6), mat('#6b3f22'), 0, .32, 0); }
  else add(new THREE.BoxGeometry(.2, .16, .14), mat('#1f2326')); // bag
  g.traverse(o => { if (o.isMesh) o.castShadow = false; });
  g.scale.setScalar(2.2); // larger than life: it must be visible from the zém's camera
  return g;
}
// Hand position of a character (Object3D), or a fixed point (Vector3).
const v = new THREE.Vector3();
function main(cible, haut, out) {
  if (cible.isVector3) return out.copy(cible);
  if (cible.userData?.main) return cible.userData.main.getWorldPosition(out); // animated character: its real hand
  cible.getWorldPosition(out); out.y += haut ?? (cible.userData?.haut ?? 1.15); return out;
}

/**
 * Passes an object from `de` to `vers` (characters, zém, or points). `apres` is called on arrival.
 * Options: hautDe, hautVers (hand height), garder (seconds held in hand), verser (tilts the bottle).
 */
export function remettre(de, vers, type, { apres, hautDe = 1.2, hautVers = 1.25, garder = 1.2, verser = false, delai = 0 } = {}) {
  const o = objet(type); o.visible = false; scene.add(o);
  ANIMS.push({ o, de, vers, hautDe, hautVers, t: -delai, duree: .85, garder, verser, apres, a: new THREE.Vector3(), b: new THREE.Vector3() });
  if (ANIMS.length === 1) requestAnimationFrame(boucle);
}
/** The zém pays (banknote to the vendor), then receives the item. */
export function payerEtRecevoir(joueur, vendeur, type, receveur = joueur, opts = {}) {
  remettre(joueur, vendeur, 'billet', { hautDe: 1.25, hautVers: 1.2, garder: .3 });
  remettre(vendeur, receveur, type, { delai: .75, hautVers: receveur === joueur ? 1.25 : .55, ...opts });
}
let prec = 0;
function boucle(now) {
  const dt = Math.min(.05, prec ? (now - prec) / 1000 : .016); prec = now;
  for (let i = ANIMS.length - 1; i >= 0; i--) {
    const A = ANIMS[i]; A.t += dt;
    if (A.t < 0) continue;
    A.o.visible = true;
    main(A.de, A.hautDe, A.a); main(A.vers, A.hautVers, A.b);
    if (A.t < A.duree) { // in an arc, from hand to hand
      const k = A.t / A.duree, e = k * k * (3 - 2 * k);
      A.o.position.lerpVectors(A.a, A.b, e); A.o.position.y += Math.sin(Math.PI * k) * .55; A.o.rotation.y += dt * 4;
    } else if (A.t < A.duree + A.garder) { // held in hand (or above the tank, tilted to pour)
      A.o.position.copy(A.b);
      if (A.verser) { A.o.rotation.z = Math.min(2, (A.t - A.duree) * 4); A.o.position.y -= .1; }
    } else if (A.t < A.duree + A.garder + .35) { const k = 1 - (A.t - A.duree - A.garder) / .35; A.o.scale.setScalar(Math.max(.01, k)); A.o.position.copy(A.b); }
    else { scene.remove(A.o); ANIMS.splice(i, 1); A.apres?.(); }
  }
  if (ANIMS.length) requestAnimationFrame(boucle); else prec = 0;
}
