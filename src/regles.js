import * as THREE from 'three';
import { remettre } from './remise.js';
import { $ } from './base.js';
import { AUDIO, son } from './audio.js';
import { JEU, LANE, fmtF, pose, toast } from './jeu.js';
import { DISC, bulle, dialogue, nouveauSigne, personne } from './discussions.js';
import { FEUX } from './feux.js';

// ---------- Highway code: traffic lights, police, crashes ----------
// Schekina's specification, priorities 1 and 2:
// - traffic lights at junctions (green, amber, red); you must stop at red;
// - a zém that runs a red light is stopped by the police: dialogue and a fine;
// - a crash is no longer just a blink: the police come to write up a report,
//   or the customer gets off to take another zém and the ride is lost.

const CYCLE = { vert: 9, orange: 2.5, rouge: 7 }, TOUR = CYCLE.vert + CYCLE.orange + CYCLE.rouge;
export const AMENDES = { feu: 2000, constat: 1500 };
const R = { feux: [], police: null };
const choisir = l => l[Math.floor(Math.random() * l.length)];
const etatFeu = (f, t) => { const u = ((t + f.dephase) % TOUR + TOUR) % TOUR; return u < CYCLE.vert ? 'vert' : u < CYCLE.vert + CYCLE.orange ? 'orange' : 'rouge'; };
const tmp = () => ({ x: 0, y: 0, z: 0, dx: 1, dz: 0, a: 0 });

/** Pays `n` F: first from the ride's takings, then from the savings. False if there isn't enough. */
export function payer(st, n) {
  const P = JEU.prog; if (st.argent + (P?.cagnotte || 0) < n) return false;
  const r = Math.min(Math.max(0, st.argent), n); st.argent -= r; if (n > r) P.cagnotte -= n - r; son('piece'); return true;
}

// Traffic light materials (shared): off / on for each colour.
const COUL = { rouge: '#ff2a1a', orange: '#ffae1a', vert: '#2bff6a' };
const matsFeu = () => Object.fromEntries(Object.entries(COUL).map(([k, c]) => [k, new THREE.MeshStandardMaterial({ color: '#202020', emissive: c, emissiveIntensity: 0, roughness: .4 })]));
const gris = new THREE.MeshStandardMaterial({ color: '#2b2f33', roughness: .6, metalness: .3 }), blanc = new THREE.MeshLambertMaterial({ color: '#f1f0ea' });
function entre(a, b, ep, mat) { // beam between two points
  const m = new THREE.Mesh(new THREE.BoxGeometry(ep, ep, a.distanceTo(b)), mat); m.position.copy(a).add(b).multiplyScalar(.5); m.lookAt(b); return m;
}

/** Real (OSM) traffic lights the route goes through: position of the junction along the path. */
function feuxReelsSur(C) {
  const out = [];
  for (const f of FEUX.noeuds) {
    let best = -1, bd = 14;
    for (let i = 0; i < C.n; i += 2) { const d = Math.hypot(C.X[i] - f.x, C.Z[i] - f.z); if (d < bd) { bd = d; best = i; } }
    if (best >= 0) out.push(best);
  }
  return out.sort((a, b) => a - b);
}
/** Places the route's traffic lights: the real Cotonou lights it goes through; if there are none, those of the major junctions. */
export function preparerFeux(C) {
  R.feux = []; R.police = null;
  let liste = feuxReelsSur(C).map(s => ({ s, reel: true }));
  if (!liste.length) liste = (JEU.carrefours || []).filter(c => [c.gauche, c.droite, c.droit].some(b => b && b.cls <= 3)).sort((a, b) => a.s - b.s);
  let dernier = -1e9;
  for (const c of liste) {
    const s0 = c.s - 9; if (s0 < 60 || s0 - dernier < (c.reel ? 60 : 220) || s0 > C.L - 40) continue;
    dernier = s0;
    const f = { s: s0, dephase: Math.random() * TOUR, passe: false, etat: '', mats: matsFeu() };
    const pied = pose(C, s0, LANE * 2.9, tmp()), haut = pose(C, s0, LANE * .4, tmp()), avant = pose(C, s0 - 25, LANE * .4, tmp());
    const g = new THREE.Group();
    const vPied = new THREE.Vector3(pied.x, pied.y, pied.z), vSommet = vPied.clone().setY(pied.y + 6), vTete = new THREE.Vector3(haut.x, haut.y + 6, haut.z);
    g.add(entre(vPied, vSommet, .18, gris), entre(vSommet, vTete, .12, gris));
    // Three-light head above the roadway, facing oncoming traffic.
    const tete = new THREE.Group(); tete.position.set(haut.x, haut.y + 5.1, haut.z); tete.lookAt(avant.x, haut.y + 5.1, avant.z);
    tete.add(new THREE.Mesh(new THREE.BoxGeometry(.5, 1.45, .32), gris));
    for (const [k, y] of [['rouge', .45], ['orange', 0], ['vert', -.45]]) { const d = new THREE.Mesh(new THREE.CircleGeometry(.16, 18), f.mats[k]); d.position.set(0, y, .17); tete.add(d); }
    g.add(tete, entre(vSommet, new THREE.Vector3(haut.x, haut.y + 5.8, haut.z), .05, gris));
    // White stop line across the roadway.
    const l0 = pose(C, s0, 0, tmp()), l1 = pose(C, s0 + 4, 0, tmp());
    const ligne = new THREE.Mesh(new THREE.BoxGeometry(LANE * 5, .03, .45), blanc); ligne.position.set(l0.x, l0.y + .04, l0.z); ligne.lookAt(l1.x, l0.y + .04, l1.z);
    g.add(ligne);
    JEU.decor.add(g); f.g = g; R.feux.push(f);
  }
}

/** Every frame: light colours, running a red, indicator for the next light. */
export function majFeux(st) {
  for (const f of R.feux) {
    const e = etatFeu(f, st.temps);
    if (e !== f.etat) { f.etat = e; for (const k of Object.keys(f.mats)) f.mats[k].emissiveIntensity = k === e ? 2.2 : 0; }
    if (!f.passe && st.s >= f.s) {
      f.passe = true;
      if (e === 'rouge' && st.v > 1.5) police(st, 'feu');
      else if (e === 'orange' && st.v > 6) toast('Amber: made it just in time!', 1.2);
    }
  }
  const f = R.feux.find(f => !f.passe && f.s - st.s < 90 && f.s - st.s > -2), el = $('#jhFeu');
  if (el) { el.hidden = !f; if (f) { el.className = 'jh-feu ' + f.etat; el.innerHTML = `<i></i><b>${{ vert: 'Green', orange: 'Amber', rouge: 'Red' }[f.etat]} light</b><span>${Math.max(0, Math.round(f.s - st.s))} m</span>`; } }
}

// The officer's whistle (two high notes).
function sifflet() {
  const ctx = AUDIO.ctx; if (!ctx || AUDIO.muet) return; const t = ctx.currentTime;
  for (const [t0, d] of [[0, .22], [.3, .45]]) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(2900, t + t0); o.frequency.linearRampToValueAtTime(3150, t + t0 + d); g.gain.setValueAtTime(.0001, t + t0); g.gain.exponentialRampToValueAtTime(.12, t + t0 + .02); g.gain.exponentialRampToValueAtTime(.0001, t + t0 + d); o.connect(g).connect(ctx.destination); o.start(t + t0); o.stop(t + t0 + d + .05); }
}
/** The police officer at the roadside, a little ahead of the zém. */
function agent(st) {
  const C = JEU.chemin, p = pose(C, st.s + 12, LANE * 2.7, tmp()), q = pose(C, st.s + 12, 0, tmp());
  const m = personne(9000 + Math.floor(Math.random() * 999), { gilet: '#1f3a6e', femme: false });
  m.position.set(p.x, p.y, p.z); m.lookAt(q.x, p.y, q.z);
  const kepi = new THREE.Mesh(new THREE.CylinderGeometry(.14, .15, .1, 12), new THREE.MeshLambertMaterial({ color: '#16264a' })); kepi.position.y = 1.72; m.add(kepi);
  m.userData.voix = { femme: false, graine: 'police' };
  JEU.decor.add(m); return m;
}
/** Police stop: 'feu' (ran a red light) or 'constat' (accident report after a crash). */
export function police(st, motif) {
  if (R.police) return;
  st.v = Math.min(st.v, 2);
  const m = agent(st), montant = AMENDES[motif]; R.police = m; sifflet();
  bulle(m, motif === 'feu' ? 'Hey, zém! Pull over right there!' : 'Police! We need to write up a report.', { duree: 2.6, ton: 'fort' });
  const fin = () => { R.police = null; setTimeout(() => m.parent?.remove(m), 5000); };
  const regler = n => {
    if (payer(st, n)) { remettre(JEU.joueur, m, 'billet', { hautVers: 1.25 }); toast(`Fine paid: −${fmtF(n)}`, 1.8, 'mal'); bulle(m, motif === 'feu' ? 'All right, move along. And obey the lights!' : 'Noted. Ride carefully now.'); }
    else { st.service = Math.max(st.service, 6); toast('Not enough money: your bike is held for a while', 2.2, 'mal'); bulle(m, 'Then you stay right here for a while!', { ton: 'fort' }); }
    fin();
  };
  if (motif === 'feu') dialogue('Traffic police', `“You ran the red light. The fine: ${fmtF(montant)}.”`, [
    [`Pay ${fmtF(montant)}`, () => regler(montant)],
    ['Sorry chief, it’s the first time…', () => {
      if (Math.random() < .4) { bulle(m, 'Fine… just a warning this time. Be careful!'); toast('Just a warning', 1.6, 'bien'); fin(); }
      else { bulle(m, 'Everybody says that. You pay.', { ton: 'fort' }); regler(montant); }
    }],
  ], { defaut: 0, duree: 14, bloquant: true });
  else dialogue('Police · accident report', `“We have to write up the report. The fee: ${fmtF(montant)}.”`, [
    [`Pay for the report · ${fmtF(montant)}`, () => regler(montant)],
    ['He’s the one who cut me off!', () => {
      if (Math.random() < .5) { bulle(m, 'All right, we’ll split the cost.'); regler(Math.round(montant / 2 / 25) * 25); }
      else { bulle(m, 'I saw everything: it was you.', { ton: 'fort' }); regler(montant); }
    }],
  ], { defaut: 0, duree: 14, bloquant: true });
}

/** After a crash: the customer gets off (ride lost) or the police come to write up a report. */
export function accident(st) {
  st.v = 0; st.service = Math.max(st.service, 1.2);
  const c = DISC.client;
  if (c && Math.random() < .5) {
    bulle(c.siege, choisir(['I’m getting off! I’ll take another zém.', 'Are you trying to kill me? I’m getting off here!', 'Stop! I’m never riding with you again.']), { ton: 'fort', duree: 3 });
    toast(`${c.nom.split(' ').slice(-1)[0]} got off: ride lost`, 2.4, 'mal');
    const s = c.siege; DISC.client = null; st.passagers = 0; setTimeout(() => { if (!DISC.client && s) s.visible = false; }, 1500);
    nouveauSigne(st.s + 160 + Math.random() * 120);
  } else setTimeout(() => { if (JEU.etat === st && JEU.actif) police(st, 'constat'); }, 900);
}
