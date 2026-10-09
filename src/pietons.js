import * as THREE from 'three';
import { LITE } from './base.js';
import { JEU, demiChaussee, kFiles, latTrottoir, pose, toast } from './jeu.js';
import { pietonOk } from './rue.js';
import { accessoire, personnage3d, personnagesPrets } from './personnages.js';
import { accident } from './regles.js';
import { C3, matVeh } from './vehicules.js';
import { mergeColored } from './ville.js';

// ---------- Zém Run passers-by ----------
// People walking on the roadside of the real street (between the roadway and the walls, never
// inside them), in both directions, and others crossing at the pedestrian crossing when the light is
// red for motorbikes. On the roadway, you only see the ones crossing or waving.
// Whoever runs the light and hits a pedestrian has an accident (police report or the passenger gets off).
// They are the realistic characters from personnages.js: without them, no passers-by.

const PT = { C: null, marcheurs: [], traversees: [] };
const NB = LITE ? 8 : 22, tmp = { x: 0, y: 0, z: 0, dx: 1, dz: 0, a: 0 };

/** A basin of fruit or vegetables, to put on the head (a character's userData.tete):
 *  the Tripo model (oranges, tomatoes and chillies) if it is loaded, otherwise a basin drawn here. */
export function bassine(k = 0) {
  const vraie = accessoire('bassine', k); if (vraie) return vraie;
  const fruit = ['#f08a1c', '#d8432f', '#e9b23a'][k % 3], P = [[C3(.28, .19, .12, 24).translate(0, .06, 0), '#c9ccd0']];
  for (let i = 0; i < 9; i++) { const a = i * 2.4, r = i ? .15 : 0; P.push([new THREE.SphereGeometry(.055, 10, 8).translate(Math.cos(a) * r, .13 + (i ? 0 : .04), Math.sin(a) * r), fruit]); }
  return new THREE.Mesh(mergeColored(P), matVeh);
}
/** A realistic market woman, basin on her head (null if the characters aren't loaded). */
export function marchandeReelle(graine, marche = false) {
  const m = personnage3d(graine, { femme: true }); if (!m) return null;
  const b = bassine(graine); b.position.y = -.045; b.rotation.y = graine; m.userData.tete.add(b);
  m.userData.jouer(marche ? 'marche' : 'idle', 0);
  return m;
}
/** Turns a character (facing +z) towards the direction (mx, mz). */
export const regarder = (m, mx, mz) => { m.rotation.y = Math.atan2(mx, mz); };

function marcheur(st, loin) {
  const C = PT.C;
  // A free spot on the roadside (not in a crossing street, not inside a building).
  for (let essai = 0; essai < 8; essai++) {
    const cote = Math.random() < .5 ? -1 : 1, s = st.s + (loin ? 130 + Math.random() * 90 : -10 + Math.random() * 220), recul = .9 + Math.random() * 1.6;
    const lat = latTrottoir(C, s, cote, recul); if (lat === null) continue;
    const m = personnage3d(Math.floor(Math.random() * 1e6), { enfant: Math.random() < .16 }) || personnage3d(Math.floor(Math.random() * 1e6)); if (!m) return null; // a few schoolchildren in uniform
    m.userData.jouer('marche', 0); JEU.decor.add(m);
    return { m, s, cote, recul, lat, sens: Math.random() < .5 ? -1 : 1, v: 1.05 + Math.random() * .45, case: Math.round(s) };
  }
  return null;
}
// Where to step next: `recul` from the edge, or closer if there is an obstacle; streets that
// cross the way are walked across. Null: no way through (wall, building, median) — turn back.
function pas(C, p, q) {
  const hw = demiChaussee(C, p.s), front = C.front ? C.front[Math.max(0, Math.min(C.n - 1, Math.round(p.s)))] : 9.8;
  for (const r of [Math.min(p.recul, front - hw - .5), .6]) {
    if (r < .3) continue;
    const lat = p.cote * (hw + r);
    if (pietonOk(q.x - q.dz * lat, q.z + q.dx * lat, q.dx, q.dz)) return lat;
  }
  return null;
}
const retirer = p => { p.m.parent?.remove(p.m); p.m.userData.liberer(); };

/** At the start of a ride (or after a turn): new passers-by along the new route. */
export function preparerPietons(C) { viderPietons(); PT.C = C; }
export function viderPietons() { for (const p of [...PT.marcheurs, ...PT.traversees]) retirer(p); PT.marcheurs = []; PT.traversees = []; PT.C = null; }

/** Pedestrians cross at crossing `s` while the light `feu` is red for motorbikes. */
export function traverser(s, feu = null) {
  if (!personnagesPrets() || !PT.C || PT.traversees.length > 6) return;
  const n = 2 + Math.floor(Math.random() * 3);
  for (let k = 0; k < n; k++) {
    const depuis = Math.random() < .5 ? -1 : 1, m = Math.random() < .25 ? marchandeReelle(Math.floor(Math.random() * 1e6), true) : personnage3d(Math.floor(Math.random() * 1e6), { enfant: Math.random() < .2 }) || personnage3d(Math.floor(Math.random() * 1e6));
    if (!m) return;
    m.userData.jouer('marche', 0); JEU.decor.add(m);
    const sp = s + 1.5 + Math.random() * 3, hw = demiChaussee(PT.C, sp);
    PT.traversees.push({ m, feu, s: sp, hw, lat: depuis * (hw + .7 + k * .5 + Math.random() * .4), dir: -depuis, v: 1.3 + Math.random() * .35, attente: k * .4 + Math.random() * .5 });
  }
}

/** Every game frame. */
export function majPietons(st, dt) {
  const C = PT.C; if (!C || !personnagesPrets()) return;
  // Pavements: keep NB walkers around the zém; those who leave the zone set off again ahead.
  while (PT.marcheurs.length < NB) { const p = marcheur(st, PT.marcheurs.length >= NB / 2); if (!p) break; PT.marcheurs.push(p); }
  PT.marcheurs = PT.marcheurs.filter(p => {
    const s0 = p.s; p.s += p.sens * p.v * dt;
    if (p.s < st.s - 30 || p.s > st.s + 240) { retirer(p); return false; }
    const q = pose(C, p.s, 0, tmp);
    if (Math.round(p.s) !== p.case) { // one more step: is there still room?
      p.case = Math.round(p.s); const lat = pas(C, p, q);
      if (lat === null) { p.s = s0; p.sens = -p.sens; p.case = Math.round(s0); } else p.cible = lat; // turn back at the wall
    }
    if (p.cible !== undefined) p.lat += (p.cible - p.lat) * Math.min(1, dt * 2.5);
    const r = pose(C, p.s, p.lat, tmp); p.m.position.set(r.x, r.y, r.z); regarder(p.m, p.sens * r.dx, p.sens * r.dz);
    return true;
  });
  // Pedestrian crossings: they cross from one pavement to the other, then walk away.
  PT.traversees = PT.traversees.filter(p => {
    // The light turns green again: those still on the roadway hurry towards the nearest pavement.
    if (p.feu && p.feu.etat !== 'rouge' && !p.presse) {
      p.presse = true;
      if (p.attente > 0) { p.attente = 0; p.dir = Math.sign(p.lat) || 1; }
      else if (Math.abs(p.lat) < p.hw) { p.dir = Math.sign(p.lat) || p.dir; p.v = 2.6; }
    }
    if (p.attente > 0) { p.attente -= dt; p.m.userData.jouer(p.attente > 0 ? 'idle' : 'marche'); }
    else p.lat += p.dir * p.v * dt;
    if ((Math.sign(p.lat) === p.dir && Math.abs(p.lat) > p.hw + 1.6) || p.s < st.s - 40) { retirer(p); return false; } // reached the roadside on the other side
    const q = pose(C, p.s, p.lat, tmp); p.m.position.set(q.x, q.y, q.z); regarder(p.m, p.dir * -q.dz, p.dir * q.dx);
    // A zém speeding over the crossing on red: accident. On green, the pedestrian jumps out of the way.
    const latJ = st.lat * kFiles(C, st.s); // the zém, in real metres
    if (!p.touche && Math.abs(p.s - st.s) < 1.3 && Math.abs(p.lat - latJ) < .9 && st.v > 2) {
      p.touche = true; p.dir = Math.sign(p.lat - latJ) || 1; p.v = 3; p.attente = 0; p.m.userData.jouer('marche');
      if (p.feu?.etat === 'rouge') { toast('You nearly ran over a pedestrian!', 1.8, 'mal'); accident(st); }
      else toast('The pedestrian jumps aside just in time', 1.4);
    }
    return true;
  });
}
