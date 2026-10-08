import * as THREE from 'three';
import { payerEtRecevoir, remettre } from './remise.js';
import { $ } from './base.js';
import { moteurMaj, son } from './audio.js';
import { BORD } from './bordure.js';
import { DISC, bulle, causerGroupe, dialogue, passantDemande, prendreSigne } from './discussions.js';
import { servir } from './essence.js';
import { etalPres, ouvrirBoutique } from './artisans.js';
import { JEU, fmtF, pose, toast, avecClients } from './jeu.js';

// ---------- Interact with what's nearby (E key) ----------
// The player is riding: when they stop, everything within ~11 m becomes
// available — petrol seller, vendor, MoMo kiosk, vulcanizer, zém rank,
// shops with their real names, people chatting, someone waving, craft market.
// If they wait parked with no passenger, a passer-by eventually comes to ask for a ride.

const P = { x: 0, y: 0, z: 0, dx: 1, dz: 0, a: 0 }, Q = new THREE.Vector3();
const choisir = l => l[Math.floor(Math.random() * l.length)];
const payer = (st, n) => { if (st.argent + (JEU.prog?.cagnotte || 0) < n) { toast('Not enough money', 1.2, 'mal'); return false; } const r = Math.min(Math.max(0, st.argent), n); st.argent -= r; if (n > r) JEU.prog.cagnotte -= n - r; son('piece'); return true; };
const NOMS_VIVANT = { vendeuse: 'The vendor', momo: 'The MoMo kiosk', vulca: 'The vulcanizer', zems: 'The zémidjans', station: 'The petrol station', kpayo: 'The kpayo', enseigne: 'The shop' };

function actionsObjet(st, o) {
  const it = o.it || o; const t = o.type;
  if (t === 'station' || t === 'kpayo') return { label: t === 'station' ? `Fill up${it.nom ? ' · ' + it.nom : ''}` : 'Buy kpayo', go: () => servir(st, it) };
  if (t === 'vendeuse') return { label: 'Talk to the vendor', go: () => {
    // First you greet each other, then you haggle over the price, then you buy (spec, priority 2).
    let remise = 1;
    const eau = () => { payerEtRecevoir(JEU.joueur, o.g, 'eau', DISC.client?.siege || JEU.joueur); if (DISC.client) { DISC.client.humeur = Math.min(1, DISC.client.humeur + .15); setTimeout(() => DISC.client && bulle(DISC.client.siege, 'Ah, cold water! Thank you, zém!'), 1600); } else bulle(o.g, 'Thank you! Safe journey!'); };
    const prix = n => Math.max(25, Math.round(n * remise / 25) * 25);
    const acheter = () => dialogue('The vendor', remise < 1 ? '“Okay, for you I’ll knock a bit off. What will you take?”' : '“Pure water, akassa, fritters! What will you take?”', [
      [`A pure water · ${prix(50)} F`, () => { if (payer(st, prix(50))) eau(); }],
      [`Some fritters · ${prix(200)} F`, () => { if (payer(st, prix(200))) { payerEtRecevoir(JEU.joueur, o.g, 'beignets'); bulle(o.g, 'They’re hot, careful!'); } }],
      ...(remise === 1 ? [['That’s expensive, bring it down a bit', () => {
        if (Math.random() < .6) { remise = .8; bulle(o.g, 'Hmm… okay, because it’s you!'); setTimeout(acheter, 900); }
        else { remise = .99; bulle(o.g, 'My son, that’s already a good price!'); setTimeout(acheter, 900); }
      }]] : [['Nothing, thanks', () => bulle(o.g, 'Another time!')]]),
    ], { defaut: -1, duree: 12, prioritaire: true });
    bulle(o.g, 'Welcome, zém! How are you?', { duree: 2.4 });
    dialogue('The vendor', '“Welcome, zém! Are you well this morning?”', [
      ['Good morning maman, I’m fine, and you?', () => { bulle(o.g, 'We’re here, thank God!'); setTimeout(acheter, 900); }],
      ['What’s the news, tantie?', () => { bulle(o.g, 'We’re together! What would you like?'); setTimeout(acheter, 900); }],
      ['Nothing, just stopping to say hello', () => bulle(o.g, 'Safe journey, my son!')],
    ], { defaut: -1, duree: 10 });
  } };
  if (t === 'momo') return { label: 'MoMo kiosk', go: () => {
    const P2 = JEU.prog;
    dialogue('The MoMo kiosk', `“Deposit, withdrawal, credit! Your savings: ${fmtF(P2.cagnotte)}.”`, [
      ['Withdraw 1,000 F (50 F fee)', () => { if (P2.cagnotte < 1050) return toast('Not enough savings', 1.2, 'mal'); P2.cagnotte -= 1050; st.argent += 1000; son('piece'); remettre(o.g, JEU.joueur, 'billet'); bulle(o.g, 'Here’s your 1,000 F!'); }],
      ['Deposit my takings', () => { if (st.argent <= 0) return toast('Nothing to deposit', 1.2); remettre(JEU.joueur, o.g, 'billet'); P2.cagnotte += st.argent; toast(`+${fmtF(st.argent)} into your savings`, 1.4, 'bien'); st.argent = 0; son('piece'); }],
      ['Phone credit · 200 F', () => { if (payer(st, 200)) { payerEtRecevoir(JEU.joueur, o.g, 'carte'); bulle(o.g, 'Here’s your card, scratch it and top up!'); } }],
    ], { defaut: -1, duree: 10 });
  } };
  if (t === 'vulca') return { label: 'The vulcanizer', go: () => {
    dialogue('The vulcanizer', st.vies < 3 ? '“Eh, your moto has taken some knocks! Shall I fix it?”' : '“Tyre pumping, repairs, I do everything!”', [
      ...(st.vies < 3 ? [['Repair the moto · 500 F (+1 life)', () => { if (!payer(st, 500)) return; payerEtRecevoir(JEU.joueur, o.g, 'outil', JEU.joueur, { hautVers: .6, garder: 1.6 }); st.service = Math.max(st.service, 2.4); st.vies++; toast('Moto repaired: +1 life', 1.6, 'bien'); bulle(o.g, 'Done, it’s as good as new!'); }]] : []),
      ['Pump up the tyres · 100 F', () => { if (!payer(st, 100)) return; payerEtRecevoir(JEU.joueur, o.g, 'outil', JEU.joueur, { hautVers: .45, garder: 1.4 }); st.service = Math.max(st.service, 2); st.pneus = 120; toast('Tyres pumped up: potholes hurt less', 1.8, 'bien'); }],
      ['Nothing, thanks', () => bulle(o.g, 'Safe journey!')],
    ], { defaut: -1, duree: 10 });
  } };
  if (t === 'zems') return { label: 'Chat with the zémidjans', go: () => {
    const conseil = choisir(['Wear your helmet, the police are checking near Étoile Rouge.', 'The old lady’s kpayo at the junction is watered down, be careful.', 'Dantokpa customers pay well on Saturdays.', 'Avoid the bridge at 6 pm, it’s jammed.', 'The vulcanizer next door is quick and cheap.']);
    bulle(o.g, conseil, { duree: 3.4 });
    dialogue('The zémidjans', `“${conseil}”`, [['Thanks, my brother!', () => bulle(o.g, 'We’re together!')], ['How much did you make today?', () => bulle(o.g, 'Hmm… not much. And you?')]], { defaut: -1, duree: 9 });
  } };
  if (t === 'enseigne') return { label: `Go into ${it.nom || 'the shop'}`, go: () => {
    const nom = it.nom || 'the shop', ty = it.t || '';
    const offre = /pharmac/.test(ty) ? ['Paracetamol · 500 F', 500, 'Take it with water!'] : /restau|maquis|bar|fast/.test(ty) ? ['A plate of rice · 1,000 F', 1000, 'Enjoy your meal!'] : /coiff/.test(ty) ? ['A haircut · 1,500 F', 1500, 'Looking sharp!'] : ['A cold drink · 300 F', 300, 'Thanks, see you soon!'];
    dialogue(nom, `“Welcome to ${nom}! What would you like?”`, [[offre[0], () => { if (payer(st, offre[1])) { const vend = BORD.vivants.find(v => v.type === 'enseigne' && Math.abs(v.s - it.s) < 1); if (vend) payerEtRecevoir(JEU.joueur, vend.g, 'sac'); toast(offre[2], 1.6, 'bien'); } }], ['Just saying hello', () => toast('“Have a good day!”', 1.4)]], { defaut: -1, duree: 10 });
  } };
  return null;
}

/** List of what is within reach (zém stopped), nearest first. */
function aPortee(st, C) {
  const j = JEU.joueur?.position; if (!j) return [];
  const out = [], d = (x, z) => Math.hypot(x - j.x, z - j.z);
  for (const o of BORD.vivants) {
    if (!NOMS_VIVANT[o.type]) continue;
    const it = BORD.items.find(i => i.s === o.s && i.type === o.type);
    o.g.getWorldPosition(Q); const dd = d(Q.x, Q.z); if (dd > 12) continue;
    const a = actionsObjet(st, { ...o, it }); if (a) out.push({ ...a, d: dd });
  }
  for (const h of DISC.signes) if (h.m && h.m.visible && h.etat !== 'monte' && !DISC.client) { const dd = d(h.m.position.x, h.m.position.z); if (dd < 11) out.push({ label: 'Take this passenger', go: () => prendreSigne(h), d: dd - 3 }); }
  for (const g of DISC.vivants) { g.g.getWorldPosition(Q); const dd = d(Q.x, Q.z); if (dd < 12) out.push({ label: 'Chat with them', go: () => causerGroupe(g), d: dd }); }
  pose(C, st.s, 0, P); const et = etalPres(P.x, P.z, 60);
  if (et) out.push({ label: 'Craft market', go: () => { JEU.pause = true; moteurMaj(0, false); ouvrirBoutique(et, () => { JEU.pause = false; }); }, d: 8 });
  return out.sort((a, b) => a.d - b.d).slice(0, 3);
}

const I = { liste: [], t: 0, attente: 0, prochaineDemande: 7 };
/** Every frame: updates the “E · …” prompt and handles waiting while parked. */
export function majInteractions(st, C, dt) {
  I.t -= dt;
  if (I.t <= 0) {
    I.t = .25;
    I.liste = st.v < 1.2 && !(DISC.courant && DISC.courant.prioritaire) ? aPortee(st, C) : [];
    const el = $('#jhAction');
    if (el) { el.hidden = !I.liste.length; if (I.liste.length) el.querySelector('span').textContent = I.liste.length > 1 ? `${I.liste[0].label} · ${I.liste.length - 1} other${I.liste.length > 2 ? 's' : ''}` : I.liste[0].label; }
  }
  // Waiting parked: no passenger, stopped at the side, a passer-by eventually comes over.
  if (avecClients(JEU.veh) && st.v < .3 && !DISC.client && !DISC.courant && st.service <= 0 && Math.abs(st.lat) > 1) {
    I.attente += dt;
    if (I.attente > I.prochaineDemande) { I.attente = 0; I.prochaineDemande = 6 + Math.random() * 8; passantDemande(C); }
  } else I.attente = 0;
}
/** E key (or the “Interact” button): one thing nearby → do it; several → choose. */
export function interagir() {
  const st = JEU.etat; if (!st || !I.liste.length) return;
  if (st.v > 1.2) return toast('Stop first', 1);
  // What the player asks for goes ahead of the passenger's chit-chat (which resumes afterwards).
  const faire = f => () => { DISC.forcer = true; try { f(); } finally { DISC.forcer = false; } };
  if (I.liste.length === 1) return faire(I.liste[0].go)();
  dialogue('What do you want to do?', 'There are several things near you.', I.liste.map(a => [a.label, faire(a.go)]), { defaut: -1, duree: 10, prioritaire: true });
}
