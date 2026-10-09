import * as THREE from 'three';
import { envoyerKlaxon } from './multijoueur.js';
import { remettre } from './remise.js';
import { $, LITE, hash } from './base.js';
import { camera } from './scene.js';
import { son } from './audio.js';
import { C3, matVeh } from './vehicules.js';
import { personnage3d } from './personnages.js';
import { mergeColored } from './ville.js';
import { PLACES } from './donnees-lieux.js';
import { BORD } from './bordure.js';
import { JEU, LANE, demiChaussee, fmtF, latTrottoir, pose, toast, prendreRaccourci, avecClients } from './jeu.js';
import { progres } from './missions.js';
import { parler, voixDe } from './voix.js';

// ---------- People talk: Zém Run like Danfo Run, Cotonou edition ----------
// Bubbles above heads (people chatting by the roadside, vendors calling out,
// the ones you honk at), and a real dialogue with the zém's passenger: you haggle
// over the fare, they make small talk, ask questions about the city, grumble
// when you ride badly… You answer with keys 1, 2, 3 or by tapping the answer.
// And they speak out loud (voix.js): you hear the people close to the zém.

export const DISC = { signes: [], groupes: [], ptr: 0, vivants: [], client: null, file: [], courant: null, klaxons: [], collecteur: null, appel: -1, causerie: 0, parleur: null };
const v = new THREE.Vector3(), vb = new THREE.Vector3(), vj = new THREE.Vector3();
const choisir = l => l[Math.floor(Math.random() * l.length)];

// ---------- Bubbles ----------
const BULLES = [];
/** A bubble above `ancre` (3D object or point). `ton`: '', 'fort', 'fon' (with translation). */
export function bulle(ancre, texte, { duree = 2.8, ton = '', trad = '' } = {}) {
  const box = $('#jhBulles'); if (!box || !ancre) return null;
  for (const b of BULLES) if (b.ancre === ancre) b.t = Math.min(b.t, .12); // only one bubble at a time per person
  const el = document.createElement('div'); el.className = `bulle ${ton}`;
  el.textContent = texte; if (trad) { const s = document.createElement('small'); s.textContent = trad; el.append(s); }
  box.append(el);
  const b = { el, ancre, t: duree, d: duree }; BULLES.push(b);
  // The voice: you only hear those near the zém; the passenger and anyone shouting go ahead of the chit-chat.
  DISC.parleur = { voix: voixDe(ancre), t: performance.now() };
  const ici = JEU.joueur ? JEU.joueur.getWorldPosition(vj) : camera.position;
  if (tete(ancre, vb).distanceTo(ici) < 42) parler(texte, { ...DISC.parleur.voix, fort: ton === 'fort' }, ancre === DISC.client?.siege || ton === 'fort' ? 1 : 0);
  return b;
}
function tete(a, out) {
  if (a.isVector3) return out.copy(a);
  if (a.userData?.tete) return a.userData.tete.getWorldPosition(out);
  a.getWorldPosition(out); out.y += a.userData?.haut ?? 2.1; return out;
}
function majBulles(dt) {
  const r = $('#scene').getBoundingClientRect();
  for (let i = BULLES.length - 1; i >= 0; i--) {
    const b = BULLES[i]; b.t -= dt;
    if (b.t <= 0) { b.el.remove(); BULLES.splice(i, 1); continue; }
    tete(b.ancre, v); v.y += .35; const dist = v.distanceTo(camera.position); v.project(camera);
    const vu = v.z < 1 && Math.abs(v.x) < 1.15 && Math.abs(v.y) < 1.15 && dist < 140;
    b.el.style.opacity = vu ? Math.min(1, b.t / .3, (b.d - b.t) / .12) : 0;
    // The bubble stays fully on screen, even when the person is right at the edge.
    const ech = THREE.MathUtils.clamp(26 / Math.max(dist, 1), .72, 1.05);
    if (!b.w) { b.w = b.el.offsetWidth; b.h = b.el.offsetHeight; }
    const dx = b.w * ech / 2 + 8, x = THREE.MathUtils.clamp((v.x * .5 + .5) * r.width, dx, Math.max(dx, r.width - dx)), y = THREE.MathUtils.clamp((-v.y * .5 + .5) * r.height, b.h * ech + 8, r.height - 8);
    b.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%) scale(${ech.toFixed(3)})`;
  }
}
function viderBulles() { for (const b of BULLES) b.el.remove(); BULLES.length = 0; }

// ---------- The people ----------
const PAGNES = ['#e2672a', '#2f6fb0', '#8e3c8f', '#2f8a4a', '#d9a521', '#c8382f', '#1f6f8b', '#f2efe6', '#e04f7a', '#6b8e23'];
const PANTALONS = ['#2b2f3a', '#4a3b2a', '#1f3d5a', '#5e5e5e', '#3f4d2c'];
const PEAUX = ['#4a2f22', '#5a3a28', '#3b261c', '#6b452f'];
/** A person standing (facing +z) or seated; userData.tete for the bubbles, userData.anim(t, talking). */
export function personne(i, { assise = false, gilet = null, femme: genre = null, role = null } = {}) {
  // The realistic animated character (personnages.js) once it is loaded; otherwise the one drawn here.
  const vrai = personnage3d(i, { assise, femme: genre, role }); if (vrai) return vrai;
  const femme = genre ?? hash(i, 71) < .5, c1 = PAGNES[Math.floor(hash(i, 72) * PAGNES.length)], c2 = PAGNES[Math.floor(hash(i, 73) * PAGNES.length)];
  const peau = PEAUX[Math.floor(hash(i, 74) * PEAUX.length)], bas = PANTALONS[Math.floor(hash(i, 75) * PANTALONS.length)];
  const P = [], add = (g, c) => P.push([g, c]);
  const y0 = assise ? -.82 : 0; // seated: the pelvis is at the origin
  if (assise) {
    for (const x of [-.1, .1]) { add(C3(.075, .07, .44, 6).rotateX(Math.PI / 2).translate(x, 0, .2), femme ? c1 : bas); add(C3(.06, .055, .42, 6).translate(x, -.22, .42), femme ? peau : bas); }
  } else if (femme) add(C3(.2, .3, .95, 10).translate(0, .475, 0), c1);
  else for (const x of [-.09, .09]) { add(C3(.075, .065, .86, 7).translate(x, .43, 0), bas); add(new THREE.BoxGeometry(.11, .07, .24).translate(x, .035, .05), '#2a221c'); }
  add(C3(.17, .19, .5, 10).translate(0, y0 + 1.15, 0), gilet || (femme ? c2 : c1));
  add(new THREE.SphereGeometry(.12, 10, 8).translate(0, y0 + 1.55, 0), peau);
  if (femme) { add(C3(.14, .13, .17, 10).translate(0, y0 + 1.64, -.01), c1); add(new THREE.SphereGeometry(.07, 6, 5).translate(0, y0 + 1.66, -.13), c1); }
  else if (hash(i, 76) < .45) { add(C3(.13, .13, .07, 10).translate(0, y0 + 1.65, 0), c2); add(new THREE.BoxGeometry(.18, .02, .12).translate(0, y0 + 1.62, .13), c2); }
  const g = new THREE.Group(), corps = new THREE.Mesh(mergeColored(P), matVeh); corps.castShadow = !LITE; g.add(corps);
  const bras = [-1, 1].map(s => {
    const pivot = new THREE.Group(); pivot.position.set(s * .21, y0 + 1.36, 0);
    const m = new THREE.Mesh(mergeColored([[C3(.05, .045, .52, 6).translate(0, -.26, 0), gilet || (femme ? c2 : c1)], [new THREE.SphereGeometry(.05, 6, 5).translate(0, -.54, 0), peau]]), matVeh);
    pivot.add(m); pivot.rotation.z = s * .12; if (assise) pivot.rotation.x = -.5; g.add(pivot); return pivot;
  });
  const t0 = new THREE.Object3D(); t0.position.set(0, y0 + 1.75, 0); g.add(t0);
  const ph = hash(i, 77) * 6;
  g.userData = {
    tete: t0, bras, femme, graine: i,
    anim: (t, parle, signe) => {
      const [bg, bd] = bras;
      if (signe) { bd.rotation.x = -2.7 + Math.sin(t * 9 + ph) * .3; bd.rotation.z = .5 + Math.sin(t * 9 + ph) * .25; bg.rotation.x = 0; }
      else if (parle) { bd.rotation.x = -.9 + Math.sin(t * 7 + ph) * .45; bd.rotation.z = .35; bg.rotation.x = -.3 + Math.sin(t * 5 + ph) * .25; }
      else { bd.rotation.x += ((assise ? -.5 : Math.sin(t * .8 + ph) * .06) - bd.rotation.x) * .1; bd.rotation.z = .12; bg.rotation.x += ((assise ? -.5 : 0) - bg.rotation.x) * .1; }
      corps.rotation.y = Math.sin(t * .6 + ph) * .08;
    },
    liberer: () => g.traverse(o => { if (o.isMesh) o.geometry.dispose(); }),
  };
  return g;
}

// ---------- What you hear by the roadside ----------
const CONVERSATIONS = [
  [[0, 'What’s the news?'], [1, 'We’re here, slowly slowly.'], [0, 'And the family?'], [1, 'Everybody’s fine, thanks!']],
  [[0, 'Did you watch the Cheetahs’ match?'], [1, 'Hmm, we suffered again!'], [0, 'Next time, it will be fine.']],
  [[0, 'Gari has gone up again at Dantokpa.'], [1, 'Ah, everything is expensive now deh!'], [2, 'It’s not easy oh.']],
  [[0, 'It’s hot deh!'], [1, 'This is Cotonou, my brother.']],
  [[0, 'Are you going to the Vodun Days in Ouidah?'], [1, 'Yes, we leave on 9 January!'], [0, 'Save me a seat in the car.']],
  [[0, 'The power was cut all night.'], [1, 'Patience, it will come back.']],
  [[0, 'A fɔn ganji à ?', 'Fon: did you wake up well?'], [1, 'Ɛɛ, un fɔn ganji !', 'Yes, I woke up well!']],
  [[0, 'Did you get the MoMo transfer?'], [1, 'Not yet, the network is slow.'], [0, 'I’ll try again.']],
  [[0, 'Tanti, how much is the fish?'], [1, 'A thousand francs a pile, my daughter.'], [0, 'Eight hundred?'], [1, 'Add a little, we’ll come to an agreement.']],
  [[0, 'The zéms are riding fast today!'], [1, 'They’re chasing the day’s money.']],
  [[0, 'Shall we go to Haie Vive tonight?'], [1, 'If you buy the beer, I’m coming!'], [2, 'Me, I’m always in!']],
  [[0, 'The bridge is jammed again.'], [1, 'Go through Dantokpa, it’s better.']],
  [[0, 'Have you finished my dress?'], [1, 'Tomorrow without fail, I swear.'], [0, 'You’ve been saying that since Monday!']],
  [[0, 'It’s going to rain tonight.'], [1, 'The gutters will overflow again…']],
  [[0, 'Are you taking the tokpa to Calavi?'], [1, 'No, a zém is faster.']],
  [[0, 'That maquis does good bicycle chicken.'], [1, 'With akassa? I’m coming!']],
  [[0, 'My son passed his BAC!'], [1, 'Congratulations! We have to celebrate!'], [2, 'Thank God!']],
  [[0, 'We’re together?'], [1, 'We’re together!']],
];
const KLAXON_GENS = ['Tchrrr! That zém!', 'Eh, we saw you!', 'Easy, we’re talking here!', 'Go on, honk again!'];
const KLAXON_PIETONS = ['Ago! Ago!', 'Eh zém, easy!', 'You want to run me over or what?', 'Excuse me, coming through!', 'Wait a bit!'];
const APPELS = {
  vendeuse: ['Pure water! Pure water!', 'Hot akassa!', 'Come and buy, it’s not expensive!', 'Roasted groundnuts!', 'Sweet pineapple!'],
  kpayo: ['Kpayo! Petrol, petrol!', 'One litre, two litres?'],
  momo: ['MoMo deposit, withdrawal!', 'Credit, credit!'],
  vulca: ['Vulcanizer! Air for your tyres!'],
  zems: ['Zém! Zém!', 'Where are we going, tanti?'],
};

export function preparerDiscussions(L, C, arrets, garderClient = false) {
  nettoyerDiscussions(garderClient);
  const ponts = BORD.ponts || [], surPont = s => ponts.some(([a, b]) => s > a && s < b);
  const g = [];
  for (let s = 90 + Math.random() * 60; s < C.L - 60; s += 130 + Math.random() * 130) {
    if (surPont(s) || arrets.some(a => s > a.s - 55 && s < a.s + 25)) continue;
    const side = Math.random() < .5 ? -1 : 1;
    if (BORD.items.some(it => it.side === side && Math.abs(it.s - s) < 7)) continue;
    const script = choisir(CONVERSATIONS), nb = Math.max(2, ...script.map(l => l[0] + 1));
    g.push({ s, side, script, nb, graine: Math.floor(Math.random() * 1e5) });
  }
  DISC.groupes = g; DISC.ptr = 0;
  // Between stops, people wave at the zém to make it stop.
  DISC.signes = [];
  if (avecClients(JEU.veh)) for (let s = 380 + Math.random() * 200; s < C.L - 250; s += 420 + Math.random() * 380) {
    if (surPont(s) || arrets.some(a => s > a.s - 90 && s < a.s + 40)) continue;
    const side = Math.random() < .7 ? 1 : -1;
    DISC.signes.push({ s, side, graine: Math.floor(Math.random() * 1e5), m: null, etat: 'attend' });
  }
}
/** Someone is waving further ahead, on the right: the next passenger (the zém sets off to find another fare). */
export function nouveauSigne(s, side = 1) {
  const C = JEU.chemin; if (!C || !avecClients(JEU.veh) || s > C.L - 40) return;
  DISC.signes.push({ s, side, graine: Math.floor(Math.random() * 1e5), m: null, etat: 'attend' });
}
export function nettoyerDiscussions(garderClient = false) {
  for (const v2 of DISC.vivants) { v2.g.parent?.remove(v2.g); for (const m of v2.membres) m.userData.liberer(); }
  for (const h of DISC.signes) if (h.m) { h.m.parent?.remove(h.m); h.m.userData.liberer(); }
  DISC.signes = [];
  if (garderClient) { DISC.vivants = []; DISC.groupes = []; DISC.collecteur = null; return; } // turn: the passenger stays on board
  DISC.vivants = []; DISC.groupes = []; DISC.file = []; DISC.courant = null; DISC.client = null; DISC.klaxons = []; DISC.collecteur = null;
  fermerDialogue(); viderBulles();
}
function creerGroupe(gp, C) {
  const g = new THREE.Group(), membres = [];
  // On the roadside (never inside a wall or on the roadway); on the other side if there is no room.
  let lat = latTrottoir(C, gp.s, gp.side, 2); if (lat === null) lat = latTrottoir(C, gp.s, -gp.side, 2);
  if (lat === null) return null;
  const p = pose(C, gp.s, lat, { x: 0, y: 0, z: 0, dx: 1, dz: 0, a: 0 });
  g.position.set(p.x, p.y, p.z); g.rotation.y = p.a;
  for (let k = 0; k < gp.nb; k++) {
    const m = personne(gp.graine + k), a = k / gp.nb * Math.PI * 2 + .4, r = gp.nb > 2 ? .62 : .5;
    m.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); m.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a));
    g.add(m); membres.push(m);
  }
  JEU.decor.add(g);
  return { ...gp, g, membres, ligne: 0, prochaine: 0, parle: -1 };
}

// ---------- The zém's passenger ----------
// [name, woman?]
const NOMS = [['Tanti Rosine', 1], ['Tonton Codjo', 0], ['Maman Bénédicte', 1], ['Young Ulrich', 0], ['Sister Prudence', 1], ['Mister Hounkpatin', 0], ['Granny Adjoua', 1], ['Fifamè', 1], ['Old Dossou', 0], ['Tanti Gisèle', 1], ['Sèna', 0], ['Koffi the student', 0]];
function tarifJuste(st, k) {
  const L = JEU.ligne, d = Math.max(200, (L.arretsJ[k]?.s ?? st.s) - st.s);
  return THREE.MathUtils.clamp(Math.round((150 + d / 1000 * 110) / 50) * 50, 150, 700);
}
function siege(femme) { // the passenger seated behind the rider, or failing that the zém itself
  const j = JEU.joueur; if (!j) return null;
  if (!j.userData.passager) { const p = personne(7 + Math.floor(Math.random() * 999), { assise: true, femme }); p.position.set(-.72, .86, 0); p.rotation.y = Math.PI / 2; p.visible = false; j.add(p); j.userData.passager = p; }
  return j.userData.passager;
}
function nouveauPassager(femme) { const j = JEU.joueur; if (j?.userData.passager) { j.remove(j.userData.passager); j.userData.passager.userData.liberer(); j.userData.passager = null; } return siege(femme); }
function dit(texte, opts) { const s = DISC.client?.siege || siege(); return bulle(s, texte, opts); }
function humeur(d) { const c = DISC.client; if (!c) return; c.humeur = THREE.MathUtils.clamp(c.humeur + d, 0, 1); }

/** The player stopped next to someone who was waving: the person climbs on. */
export function prendreSigne(h) {
  const st = JEU.etat; if (!st || DISC.client) return false;
  h.etat = 'monte'; if (h.m) h.m.visible = false;
  nouveauClient(st, st.prochain, { arrete: true }); return true;
}
/** The player, stopped without a passenger, is waiting: a passer-by comes over to ask for a ride. */
export function passantDemande(C) {
  const st = JEU.etat; if (!st || DISC.client || DISC.courant) return;
  let side = st.lat < -.5 ? -1 : 1, lat = latTrottoir(C, st.s + 2, side, .5); if (lat === null) { side = -side; lat = latTrottoir(C, st.s + 2, side, .5); } if (lat === null) return;
  const p = pose(C, st.s + 2, lat, { x: 0, y: 0, z: 0, dx: 1, dz: 0, a: 0 });
  const m = personne(Math.floor(Math.random() * 1e5)); m.position.set(p.x, p.y, p.z); m.rotation.y = Math.atan2(side * p.dz, -side * p.dx); JEU.decor.add(m);
  const h = { s: st.s + 2, side, m, etat: 'propose', graine: 0 }; DISC.signes.push(h);
  const prochain = JEU.ligne.arretsJ[st.prochain], ou = prochain ? prochain.nom : 'the terminus';
  bulle(m, `Zém, are you free? Going to ${ou}!`, { duree: 3 });
  dialogue('A passer-by comes over', `“Zém, are you free? I’m going to ${ou}.”`, [
    ['Yes, hop on', () => prendreSigne(h)],
    ['No, I’m busy', () => { bulle(m, 'Okay… I’ll wait for another one.'); h.etat = 'ignore'; }],
  ], { defaut: -1, duree: 9, prioritaire: true });
}
/** Chatting with a group by the roadside; sometimes one of them wants a ride. */
export function causerGroupe(g) {
  const st = JEU.etat; if (!st) return;
  const m = g.membres[Math.floor(Math.random() * g.membres.length)];
  const prochain = JEU.ligne.arretsJ[st.prochain], ou = prochain ? prochain.nom : 'the terminus';
  if (!DISC.client && Math.random() < .5) {
    bulle(m, `Ah zém! Perfect timing. Are you going towards ${ou}?`, { duree: 3 });
    dialogue('By the roadside', `“Ah zém! Perfect timing. Are you going towards ${ou}?”`, [
      ['Yes, hop on', () => { m.visible = false; nouveauClient(st, st.prochain, { arrete: true }); }],
      ['No, just stopping to say hello', () => bulle(m, 'Safe journey then!')],
    ], { defaut: -1, duree: 9 });
    return;
  }
  const [q, r1, r2, r3] = choisir([
    ['What’s the news, zém?', 'We’re here, slowly slowly', 'All good!', 'The work is hard deh'],
    ['Did you watch the Cheetahs’ match yesterday?', 'Yes, we played well!', 'I was at work', 'Football stresses me out'],
    ['They say petrol is going up again…', 'God will help us', 'Kpayo is cheaper', 'What can we do?'],
    ['Zém, do you know Tanti Rosine’s maquis?', 'Yes, her grilled fish is good', 'No, where is it?', 'I don’t eat out'],
    ['A fɔn ganji à ? (Did you wake up well?)', 'Ɛɛ, un fɔn ganji ! (Yes, I woke up well!)', 'I’m fine, thanks', 'I’m tired'],
  ]);
  bulle(m, q, { duree: 3 });
  const ok = rep2 => () => { bulle(m, rep2, { duree: 2.6 }); };
  dialogue('By the roadside', `“${q}”`, [[r1, ok(choisir(['Hahaha, you’re funny!', 'We’re together!', 'That’s it exactly!']))], [r2, ok(choisir(['Alright, safe journey!', 'Really?', 'Hmm…']))], [r3, ok(choisir(['Courage, my brother!', 'It will be fine!', 'God is great.']))]], { defaut: -1, duree: 9 });
}
/** A passenger climbs on (zém): you haggle over the fare to stop `k`. */
export function nouveauClient(st, k, { arrete = false } = {}) {
  const L = JEU.ligne, a = L.arretsJ[k]; if (!a) return;
  const juste = tarifJuste(st, k), [nom, femme] = choisir(NOMS);
  const s = nouveauPassager(!!femme); s.visible = JEU.veh === 'zem'; // in a taxi, the passenger is inside the cab
  s.userData.voix = { femme: !!femme, graine: nom, age: /\bold\b|granny/i.test(nom) ? 'vieux' : /young|student|fifamè|sèna/i.test(nom) ? 'jeune' : '' };
  DISC.client = { nom, femme, juste, tarif: 0, humeur: .6, vers: k, siege: s, accord: false, causerie: st.s + 220 + Math.random() * 300, dits: new Set() };
  st.passagers = 1;
  const accord = (tarif, dh, rep) => { const c = DISC.client; if (!c) return; c.tarif = tarif; c.accord = true; humeur(dh); dit(rep); if (tarif >= juste) progres('negos', 1); setTimeout(() => { if (DISC.client === c && JEU.veh === 'zem') demanderCasque(st, c); }, 1400); };
  const perdu = () => { dit('I’ll take another zém!', { ton: 'fort' }); son('choc'); toast('Passenger lost', 1.4, 'mal'); setTimeout(() => { if (DISC.client?.nom === nom) { DISC.client = null; st.passagers = 0; s.visible = false; } }, 1200); };
  dit(`Zém! ${a.nom}, how much?`, { duree: 3.2 });
  dialogue(`${nom} · ${femme ? 'your passenger' : 'your passenger'}`, `“Zém! ${a.nom}, how much?”`, [
    [`${juste + 150} F`, () => {
      if (Math.random() < .35) return accord(juste + 150, -.15, 'Okay… let’s go, but ride carefully eh!');
      dit(`Eh! That’s too much! ${juste} F?`, { ton: 'fort' });
      dialogue(`${nom}`, `“Eh! That’s too much! ${juste} F?”`, [
        ['Okay, hop on', () => accord(juste, 0, 'Thank you, zém!')],
        [`No, it’s ${juste + 150} F`, () => (Math.random() < .3 ? accord(juste + 150, -.25, 'Tchrrr… okay, let’s go.') : perdu())],
      ], { defaut: 0 });
    }],
    [`${juste} F`, () => accord(juste, .05, 'Ok, let’s go!')],
    ['Hop on, we’ll work it out', () => accord(juste - 50, .2, `Ah, you’re kind! ${juste - 50} F then.`)],
  ], { defaut: 1, bloquant: arrete });
}
// Helmet compulsory for the zém rider and for the passenger (spec, priority 1).
const COUL_CASQUE = ['#1d2733', '#c8382f', '#f2f2ee', '#2f6fb0', '#e9b23a'];
function mettreCasque(p) {
  if (!p || p.userData.casque) return;
  const t = p.userData.tete, c = new THREE.Mesh(new THREE.SphereGeometry(.155, 12, 8, 0, Math.PI * 2, 0, Math.PI * .55), new THREE.MeshLambertMaterial({ color: choisir(COUL_CASQUE) }));
  if (p.userData.coiffer) p.userData.coiffer(c); // animated character: the helmet follows the head
  else { c.position.set(t.position.x, t.position.y - .22, t.position.z); p.add(c); }
  p.userData.casque = c;
}
function demanderCasque(st, c) {
  const aLeSien = Math.random() < .45;
  if (aLeSien) {
    dit('Yes, I have my helmet!');
    dialogue(`${c.nom} · the helmet`, '“Do you have your helmet?” — “Yes, I have mine!”', [['Good, put it on, let’s go', () => { mettreCasque(c.siege); humeur(.05); dit('There, it’s strapped on.'); }]], { defaut: 0, duree: 6 });
    return;
  }
  dit('Ah no… I don’t have a helmet.');
  dialogue(`${c.nom} · the helmet`, '“Do you have your helmet?” — “No, I don’t have one…”', [
    ['I’ll lend you mine', () => { mettreCasque(c.siege); humeur(.12); dit('Thank you zém, you’re kind!'); }],
    ['Buy one from the vendor over there · 2,000 F', () => {
      st.service = Math.max(st.service, 3.4); toast('The passenger buys a helmet from the roadside vendor…', 2.2);
      const p = pose(JEU.chemin, st.s + 3, latTrottoir(JEU.chemin, st.s + 3, 1, .9) ?? demiChaussee(JEU.chemin, st.s + 3) + .5, { x: 0, y: 0, z: 0, dx: 1, dz: 0, a: 0 }), q = pose(JEU.chemin, st.s + 3, 0, { x: 0, y: 0, z: 0, dx: 1, dz: 0, a: 0 });
      const vend = personne(4500 + Math.floor(Math.random() * 400), { femme: false }); vend.position.set(p.x, p.y, p.z); vend.lookAt(q.x, p.y, q.z); JEU.decor.add(vend); bulle(vend, 'Helmet! New helmet!', { duree: 2.4 });
      remettre(c.siege, vend, 'billet', { hautDe: .55, garder: .3 });
      remettre(vend, c.siege, 'casque', { delai: .8, hautVers: .6, garder: .2, apres: () => { if (DISC.client === c) { mettreCasque(c.siege); humeur(-.04); dit('Well, at least it’s new!'); } setTimeout(() => vend.parent?.remove(vend), 4000); } });
    }],
  ], { defaut: 0, duree: 10, bloquant: true });
}
/** The passenger gets off at the stop: pays the agreed fare, more or less depending on their mood. Returns the earnings. */
export function deposerClient() {
  const c = DISC.client; if (!c) return 0;
  let gain = c.accord ? c.tarif : Math.round(c.juste * .8 / 25) * 25; const base = gain, supplement = c.supplement || 0; gain += supplement;
  if (c.humeur >= .75) { const pb = c.humeur >= .9 ? 100 : 50; gain += pb; dit(`Thank you zém, may God keep you! Keep ${pb} F.`, { duree: 3 }); progres('ravis', 1); }
  else if (c.humeur < .3) { gain = Math.max(0, gain - 50); dit('You nearly killed me! I’m keeping back 50 F.', { ton: 'fort', duree: 3 }); }
  else dit(choisir(['Thanks, safe journey!', 'Thank you, zém!', 'God bless you!']));
  DISC.dernierPaiement = { nom: c.nom, femme: c.femme, base, supplement, total: gain, casque: !!c.siege?.userData.casque };
  DISC.client = null;
  return gain;
}
export function clientRate(a) { // stop missed
  const c = DISC.client; if (!c) return;
  dit(`Zém! You’ve gone past ${a.nom}!`, { ton: 'fort', duree: 3 }); son('choc');
  DISC.client = null; const s = c.siege; setTimeout(() => { if (!DISC.client && s) s.visible = false; }, 1500);
}

// Chit-chat during the ride: the passenger talks, you pick your answer.
function causerie(st) {
  const c = DISC.client; if (!c || DISC.courant) return;
  const sujets = [];
  if (st.quartier) sujets.push('ou');
  if (BORD.repere && BORD.repere.d < 260 && Math.abs(BORD.repere.s - st.s) < 160) sujets.push('lieu');
  sujets.push('foot', 'chaud', 'essence', 'monnaie', 'famille', 'musique');
  const reste = (JEU.ligne.arretsJ[c.vers]?.s ?? st.s) - st.s; if (reste > 700 && !c.dits.has('presse')) sujets.unshift('presse', 'presse'); // offered more often
  const sujet = choisir(sujets.filter(x => !c.dits.has(x))); if (!sujet) return; c.dits.add(sujet);
  const R = (txt, dh, rep, prime = 0) => [txt, () => { humeur(dh); dit(rep); if (prime) { st.argent += prime; toast(`+${prime} F`, 1, 'bien'); son('piece'); } }];
  if (sujet === 'presse') {
    const sup = Math.max(200, Math.round(c.juste * .5 / 50) * 50);
    dit(`${c.femme ? 'I’m in a hurry' : 'I’m in a hurry'}! ${sup} F extra if you take a shortcut.`, { duree: 3.2 });
    dialogue(c.nom, `“I’m late! I’ll give you ${sup} F extra if you take a shortcut.”`, [
      [`Okay, we’ll cut through the back streets (+${sup} F)`, () => { if (prendreRaccourci()) { c.supplement = sup; humeur(.1); dit('Thank you! Go on, quick!'); } else dit('Oh well, never mind, we’ll stay on the main road.'); }],
      ['No, I’m staying on the main road', () => { humeur(-.05); dit('Hmm… then at least ride fast!'); }],
    ], { defaut: -1, duree: 10 });
  } else if (sujet === 'ou') {
    const autres = JEU.quartiersNoms.filter(n => n !== st.quartier).sort(() => Math.random() - .5).slice(0, 2), bon = st.quartier;
    const choix = [bon, ...autres].sort(() => Math.random() - .5);
    dit('Where are we now?');
    dialogue(c.nom, '“Zém, where are we now?”', choix.map(n => [n, () => {
      if (n === bon) { humeur(.15); dit('Exactly! You know your city.'); st.argent += 50; toast('Right answer: +50 F', 1.2, 'bien'); son('piece'); progres('quartiers', 1); }
      else { humeur(-.05); dit(`No! We’re in ${bon}.`); }
    }]), { defaut: -1, duree: 10 });
  } else if (sujet === 'lieu') {
    const r = BORD.repere, faux = PLACES.filter(p => p.name !== r.nom).sort(() => Math.random() - .5).slice(0, 2).map(p => p.name);
    const choix = [r.nom, ...faux].sort(() => Math.random() - .5);
    dit('What’s that building over there?');
    dialogue(c.nom, '“What’s that building over there?”', choix.map(n => [n, () => {
      if (n === r.nom) { humeur(.15); dit('Ah yes! You know Cotonou well.'); st.argent += 50; toast('Right answer: +50 F', 1.2, 'bien'); son('piece'); }
      else { humeur(-.05); dit(`No, that’s ${r.nom}!`); }
    }]), { defaut: -1, duree: 10 });
  } else if (sujet === 'foot') {
    dit('Do you support the Cheetahs?');
    dialogue(c.nom, '“Do you support the Cheetahs?”', [R('All the way! Come on Benin!', .15, 'We’re together! Go Cheetahs!'), R('I’m a Real Madrid fan', -.05, 'Hmm… and what about your own country?'), R('I don’t have time for football', 0, 'Always working, eh!')], { defaut: 0 });
  } else if (sujet === 'chaud') {
    dit('It’s hot deh! Don’t you have any water?');
    dialogue(c.nom, '“It’s hot deh! Don’t you have any water?”', [R('We’ll buy a pure water at the lights', .1, 'Ah thank you, you’re kind!'), R('Sorry, I don’t have anything', 0, 'It’s okay.'), R('The zém breeze is your air-con!', .12, 'Hahaha! You’re funny.')], { defaut: 0 });
  } else if (sujet === 'essence') {
    dit('Petrol has gone up again, hasn’t it?');
    dialogue(c.nom, '“Petrol has gone up again, hasn’t it?”', [R('Kpayo is cheaper', .05, 'Careful with those bottles eh!'), R('It will come down, God is great', .08, 'Amen!'), R('That’s why I don’t give discounts', -.05, 'Hmm… I get it.')], { defaut: 1 });
  } else if (sujet === 'monnaie') {
    dit('Do you have change for 2,000?');
    dialogue(c.nom, '“Do you have change for 2,000?”', [R('Yes, no problem', .1, 'Thank you very much!'), R('I don’t have change', -.08, 'Ah, zéms and change…')], { defaut: 0 });
  } else if (sujet === 'famille') {
    dit('Are you married, zém?');
    dialogue(c.nom, '“Are you married, zém?”', [R('Yes, with two children', .08, 'May God keep them!'), R('Not yet…', .05, 'It will come, patience!'), R('That’s my secret!', .1, 'Hahaha, you’re a clever one!')], { defaut: 0 });
  } else if (sujet === 'musique') {
    dit('What kind of music do you listen to?');
    dialogue(c.nom, '“What kind of music do you listen to?”', [R('Angélique Kidjo!', .15, 'Ah, the great lady of Benin!'), R('Gospel', .08, 'Glory to God!'), R('Nothing, I’m riding', 0, 'You’re a serious one, you.')], { defaut: 0 });
  }
}

// ---------- The union collector (like the agbero in Danfo Run) ----------
export function placerCollecteur(L, C) {
  const n = L.arretsJ.length; if (JEU.veh !== 'zem' || n < 4) return;
  const k = 1 + Math.floor(Math.random() * (n - 3)), a = L.arretsJ[k];
  const p = pose(C, a.s + 2, latTrottoir(C, a.s + 2, 1, 1.2) ?? demiChaussee(C, a.s + 2) + .5, { x: 0, y: 0, z: 0, dx: 1, dz: 0, a: 0 });
  const m = personne(4242, { gilet: '#f28c1b', femme: false, role: 'zem' }); m.position.set(p.x, p.y, p.z); m.rotation.y = p.a - Math.PI / 2; JEU.decor.add(m);
  DISC.collecteur = { k, m, fait: false };
}
export function collecte(st) {
  const c = DISC.collecteur; if (!c || c.fait || st.prochain - 1 !== c.k) return;
  c.fait = true;
  const P = JEU.prog, montant = P.dette ? P.dette * 2 : 100;
  bulle(c.m, P.dette ? `Your debt has doubled: ${montant} F!` : `Zém! Your dues for today: ${montant} F.`, { duree: 3.4, ton: 'fort' });
  dialogue('The union collector', P.dette ? `“You didn’t pay last time. Now it’s ${montant} F!”` : `“Zém! Your dues for today: ${montant} F.”`, [
    [`Pay ${montant} F`, () => { st.argent -= montant; P.dette = 0; bulle(c.m, 'Thanks, ride easy my brother!'); progres('cotisation', 1); }],
    ['I’ll pay tomorrow', () => { P.dette = montant; bulle(c.m, 'Tomorrow it’s double, I’ve written you down!', { ton: 'fort' }); }],
  ], { defaut: 0 });
}

// ---------- The tokpa-tokpa apprentice ----------
function apprenti(texte) {
  const el = $('#jhApprenti'); if (!el) return;
  el.textContent = texte; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
  parler(texte, { femme: false, graine: 'apprenti', age: 'jeune', fort: true }, 1);
}
export function appelApprenti(a) { apprenti(choisir([`${a.nom}! ${a.nom}! Who’s getting down?`, `Coming up: ${a.nom}! Get your change ready!`, `${a.nom}! If you’re getting off, raise your hand!`])); }
export function departApprenti() { apprenti(choisir(['We’re full, let’s move!', 'Squeeze up at the back, there’s still room!', 'Driver, let’s go!'])); }

// ---------- Dialogue (multiple-choice answers) ----------
/** Queues an exchange: `choix` = [[text, function], …]. Default: answer taken if you don't reply (-1: none). */
export function dialogue(qui, texte, choix, { defaut = 0, duree = 8, prioritaire = false, valide = null, bloquant = false } = {}) {
  const d = { qui, texte, choix, defaut, duree, valide, prioritaire: prioritaire || bloquant || !!DISC.forcer, bloquant };
  if (d.prioritaire) {
    // An offer that can't wait jumps the queue; the current chit-chat resumes afterwards.
    if (DISC.courant && !DISC.courant.prioritaire) { DISC.file.unshift(d, DISC.courant); DISC.courant = null; suivant(); return; }
    DISC.file.unshift(d);
  } else DISC.file.push(d);
  if (!DISC.courant) suivant();
}
function suivant() {
  let d = DISC.file.shift(); while (d && d.valide && !d.valide()) d = DISC.file.shift(); // stale offers (vendor already passed…)
  const el = $('#jhDialogue'); DISC.courant = d || null;
  if (!d) { el.hidden = true; return; }
  d.t = d.duree;
  el.querySelector('.qui').textContent = d.qui; el.querySelector('.dit').textContent = d.texte;
  const box = el.querySelector('.choix'); box.innerHTML = '';
  d.choix.forEach(([t], k) => { const b = document.createElement('button'); b.type = 'button'; b.innerHTML = `<kbd>${k + 1}</kbd>${t}`; b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); repondre(k); }); box.append(b); });
  el.hidden = false; son('arret');
  if (/^[«“"]/.test(d.texte.trim())) parler(d.texte, d.voix || voixQui(d.qui), 2);
  if (d.bloquant && JEU.etat) JEU.etat.service = 99; // held stopped while you answer (refuelling, passenger climbing on)
}
// Who is speaking in the dialogue: the passenger, a known trade, otherwise whoever just spoke in their bubble.
function voixQui(qui) {
  const c = DISC.client; if (c && qui.startsWith(c.nom)) return voixDe(c.siege);
  const age = /\bold\b|granny/i.test(qui) ? 'vieux' : '';
  if (/^(la |une )|tanti|maman|granny|sister|vendor|momo|fifamè|rosine|adjoua|prudence|gisèle|bénédicte/i.test(qui)) return { femme: true, graine: qui, age };
  if (/vulcanizer|pump attendant|collector|zémidjans|tonton|mister/i.test(qui)) return { femme: false, graine: qui, age };
  if (DISC.parleur && performance.now() - DISC.parleur.t < 2500) return DISC.parleur.voix;
  return { femme: hash(qui.length * 131 + qui.charCodeAt(0), 5) < .5, graine: qui, age };
}
export function repondre(k) {
  const d = DISC.courant; if (!d || !d.choix[k]) return;
  DISC.courant = null; $('#jhDialogue').hidden = true;
  if (d.bloquant && JEU.etat) JEU.etat.service = .6;
  d.choix[k][1]();
  setTimeout(() => { if (!DISC.courant) suivant(); }, 500);
}
function fermerDialogue() { const el = $('#jhDialogue'); if (el) el.hidden = true; }

// ---------- Horn ----------
export function klaxonner() {
  const st = JEU.etat; if (!st) return;
  son('klaxon', JEU.prog?.klaxon); envoyerKlaxon(); const t = st.temps;
  DISC.klaxons = DISC.klaxons.filter(x => t - x < 6); DISC.klaxons.push(t);
  // Those crossing in front hurry up.
  for (const o of JEU.objets) {
    const ds = o.s - st.s; if (ds < 0 || ds > 45) continue;
    if (o.mesh && !o.mesh.userData.voix) o.mesh.userData.voix = { femme: o.type !== 'egungun', graine: o.mesh.id, age: o.type === 'egungun' ? 'revenant' : '' };
    if (o.type === 'egungun' && !o.klaxonne) { o.klaxonne = true; bulle(o.mesh, 'You don’t honk at the ancestors!', { ton: 'fort' }); st.argent = Math.max(0, st.argent - 50); toast('Honking at an Egungun: −50 F', 1.4, 'mal'); continue; }
    if ((o.type === 'marchande' || o.type === 'chevre') && o.dirLat && !o.klaxonne && Math.abs(o.lat) < 6) {
      o.klaxonne = true; o.dirLat *= 2.6;
      bulle(o.mesh, o.type === 'chevre' ? choisir(['Meeeh!', 'Baaah!']) : choisir(KLAXON_PIETONS), { duree: 2 });
      progres('klaxons', 1);
    }
  }
  // Those chatting by the roadside.
  for (const g of DISC.vivants) { const ds = g.s - st.s; if (ds > 0 && ds < 40 && !g.klaxonne) { g.klaxonne = true; const m = g.membres[Math.floor(Math.random() * g.membres.length)]; bulle(m, choisir(KLAXON_GENS), { duree: 2.2 }); } }
  if (DISC.client && DISC.klaxons.length >= 4 && !DISC.client.dits.has('klaxon')) { DISC.client.dits.add('klaxon'); humeur(-.08); dit('Stop honking, you’re giving me a headache!', { ton: 'fort' }); }
}

/** What happens during the ride and makes the passenger react. */
export function evenement(type) {
  const c = DISC.client; if (!c) return;
  const R = {
    frole: [-.06, ['Eh, easy!', 'You want to kill us?', 'My God, that was close!']],
    choc: [-.25, ['Ouch! Did you see that?!', 'How are you riding?!', 'Jesus! My bones!']],
    trou: [-.08, ['Ouch, my back!', 'The potholes of Cotonou…']],
    saut: [.03, ['Wow! We’re flying!', 'Hey! Easy!']],
    egungun: [.12, ['You did well. We respect the ancestors.']],
  }[type];
  if (!R) return;
  humeur(R[0]); if (Math.random() < (type === 'saut' ? .35 : .8)) dit(choisir(R[1]), { ton: R[0] < -.1 ? 'fort' : '' });
}

// ---------- Per-frame update ----------
export function majDiscussions(st, C, dt) {
  // Groups that appear ahead and disappear behind.
  while (DISC.ptr < DISC.groupes.length && DISC.groupes[DISC.ptr].s < st.s + 280) {
    const gp = DISC.groupes[DISC.ptr++]; if (gp.s < st.s - 20) continue;
    const v2 = creerGroupe(gp, C); if (v2) DISC.vivants.push(v2);
  }
  const t = st.temps;
  DISC.vivants = DISC.vivants.filter(g => {
    const ds = g.s - st.s;
    if (ds < -30) { g.g.parent?.remove(g.g); for (const m of g.membres) m.userData.liberer(); return false; }
    // The conversation plays out as you approach (close enough to hear it): one line every 1.7 s.
    if (ds < 50 && g.ligne < g.script.length && t >= g.prochaine) {
      const [qui, txt, trad] = g.script[g.ligne++], m = g.membres[qui % g.membres.length];
      bulle(m, txt, { duree: 2.4, ton: trad ? 'fon' : '', trad }); g.parle = qui; g.prochaine = t + 1.7;
    }
    if (t > g.prochaine + .2) g.parle = -1;
    g.membres.forEach((m, k) => m.userData.anim(t, k === g.parle));
    return true;
  });
  // People waving: you're offered a stop, the zém pulls over by itself.
  for (const h of DISC.signes) {
    const ds = h.s - st.s;
    if (!h.m && ds < 260 && ds > -20) {
      let lat = latTrottoir(C, h.s, h.side, .45); if (lat === null) { h.side = -h.side; lat = latTrottoir(C, h.s, h.side, .45); }
      if (lat === null) { h.etat = 'fini'; continue; } // no roadside here: nobody waves
      const p = pose(C, h.s, lat, { x: 0, y: 0, z: 0, dx: 1, dz: 0, a: 0 });
      h.m = personne(h.graine); h.m.position.set(p.x, p.y, p.z); JEU.decor.add(h.m);
      h.m.rotation.y = Math.atan2(h.side * p.dz - .6 * p.dx, -h.side * p.dx - .6 * p.dz); // facing the road, turned towards the oncoming zém
    }
    if (!h.m) continue;
    if (ds < -30) { h.m.parent?.remove(h.m); h.m.userData.liberer(); h.m = null; h.etat = 'fini'; continue; }
    h.m.userData.anim(t, false, h.etat === 'attend' || h.etat === 'propose');
    // The player decides: stop alongside them and press E (interactions.js).
    if (h.etat === 'attend' && ds < 75 && ds > 25) {
      h.etat = 'propose';
      const prochain = JEU.ligne.arretsJ[st.prochain], ou = prochain ? prochain.nom : 'the terminus';
      bulle(h.m, choisir(['Zém! Zém!', `Zém! ${ou}?`, 'Eh zém! Wait!']), { duree: 2.6 });
      if (!DISC.client && !st.aideSigne) { st.aideSigne = true; toast(`Someone is waving at you on the ${h.side > 0 ? 'right' : 'left'}: stop alongside them, then press E`, 2.6); }
    }
    if (h.etat === 'propose' && ds < -6) { h.etat = 'ignore'; bulle(h.m, choisir(['Tchrrr…', 'Hmm, these zéms!', 'Okay, I’ll wait for the next one.'])); }
  }
  // Vendors and kiosks call out to passers-by.
  if (Math.floor(t * 2) !== Math.floor((t - dt) * 2)) {
    for (const o of BORD.vivants) {
      const ds = o.s - st.s; if (ds < 8 || ds > 45 || o.appele || !APPELS[o.type] || Math.random() < .5) continue;
      o.appele = true; bulle(o.g, choisir(APPELS[o.type]), { duree: 2.2 }); break;
    }
  }
  // The passenger: chit-chat now and then, and an animated rider.
  const c = DISC.client;
  if (c) { c.siege?.userData.anim(t, false); if (c.accord && st.s > c.causerie && JEU.ligne.arretsJ[c.vers] && JEU.ligne.arretsJ[c.vers].s - st.s > 150) { c.causerie = st.s + 500 + Math.random() * 500; causerie(st); } }
  if (DISC.collecteur) DISC.collecteur.m.userData.anim(t, DISC.courant?.qui?.startsWith('The union collector'));
  // The apprentice calls out before each stop.
  const a = JEU.ligne.arretsJ[st.prochain];
  if (JEU.veh === 'tokpa' && a && DISC.appel !== st.prochain && a.s - st.s < 260) { DISC.appel = st.prochain; appelApprenti(a); }
  // Current dialogue: the default answer kicks in when time runs out.
  const d = DISC.courant;
  if (d && d.valide && !d.valide()) { DISC.courant = null; $('#jhDialogue').hidden = true; if (d.bloquant) st.service = .6; suivant(); }
  else if (d) {
    d.t -= dt; $('#jhDialogue .minuteur').style.width = `${Math.max(0, d.t / d.duree * 100)}%`;
    if (d.t <= 0) { if (d.defaut >= 0) repondre(d.defaut); else { DISC.courant = null; $('#jhDialogue').hidden = true; if (d.bloquant) st.service = .6; setTimeout(suivant, 300); } }
  }
  majBulles(dt);
}
/** Text for the HUD passenger box. */
export function etiquetteClient() {
  const c = DISC.client; if (!c) return 'Empty';
  const f = c.femme, h = c.humeur >= .75 ? (f ? 'delighted' : 'delighted') : c.humeur >= .45 ? 'relaxed' : c.humeur >= .25 ? (f ? 'not happy' : 'not happy') : (f ? 'angry' : 'angry'); // whole words: the English version translates them
  return `${c.nom.split(' ').slice(-1)[0]} · ${h}${c.accord ? ` · ${fmtF(c.tarif)}` : ''}`;
}
