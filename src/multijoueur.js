import * as THREE from 'three';
import Peer from 'peerjs';
import { $ } from './base.js';
import { son } from './audio.js';
import { scene } from './scene.js';
import { mergeColored } from './ville.js';
import { matVeh, partsTokpa, partsVoiture, partsZem } from './vehicules.js';
import { JEU, lancerLigne, ouvrirJeu, toast } from './jeu.js';

// ---------- Two-player mode (specification, priority 4) ----------
// Two players in the same city, with no server of our own: a direct connection between the two
// browsers (WebRTC), matched through PeerJS's public service. One creates the game and
// sends the invitation link (or the 4-letter code); the other clicks it. As soon as either of
// them picks a line, the other sets off on the same one: each sees the other's vehicle (blue
// shirt, number above it), the gap between them, and who reaches the terminus first.
//
// Between two different networks (4G and wifi, for example), the direct connection is often blocked:
// a TURN relay is then needed. To plug one in, set in the environment variables
// (.env.local, or Vercel) VITE_TURN_URLS (comma-separated addresses), VITE_TURN_USER and
// VITE_TURN_PASS — a free Metered or Cloudflare account provides them. For more players, lobbies
// and a leaderboard, a proper real-time server will be needed (Colyseus, Socket.io).

const MJ = { peer: null, conn: null, code: '', autre: null, fantome: null, envoi: 0, delai: 0, autreArrive: false, moiArrive: false };
const PREFIXE = 'zemrun-cotonou-', LETTRES = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const env = import.meta.env;
const ICE = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
if (env.VITE_TURN_URLS) ICE.push({ urls: env.VITE_TURN_URLS.split(',').map(u => u.trim()), username: env.VITE_TURN_USER, credential: env.VITE_TURN_PASS });
const OPTIONS = { config: { iceServers: ICE } };
const codeAleatoire = () => Array.from({ length: 4 }, () => LETTRES[Math.floor(Math.random() * LETTRES.length)]).join('');
const statut = t => { const el = $('#mjStatut'); if (el) el.textContent = t; };
export const multijoueurActif = () => !!MJ.conn?.open;
const lienInvitation = () => `${location.origin}${location.pathname}?duo=${MJ.code}`;
const BLOQUE = 'The direct connection can’t get through between your two networks (often on 4G). Try both being on the same wifi.';

function brancher(conn) {
  MJ.conn = conn; clearTimeout(MJ.delai);
  // No answer after 15 s: the two networks won't let each other connect directly.
  MJ.delai = setTimeout(() => { if (!conn.open) statut(BLOQUE + (ICE.length > 1 ? '' : ' (no TURN relay configured)')); }, 15000);
  conn.on('open', () => {
    clearTimeout(MJ.delai);
    statut('Connected! Pick a line: you’ll set off together.');
    envoyer({ type: 'bonjour', numero: JEU.numero });
    $('#mjInviter').hidden = true;
  });
  conn.on('iceStateChanged', etat => { if (etat === 'failed' || etat === 'disconnected') statut(etat === 'failed' ? BLOQUE : 'Unstable connection…'); });
  conn.on('data', recevoir);
  conn.on('close', () => { statut('The other player has left.'); MJ.conn = null; MJ.autre = null; if (MJ.fantome) MJ.fantome.visible = false; majEcart(null); });
  conn.on('error', e => statut(`Connection lost (${e.type || e})`));
}
/** Creates a game: a 4-letter code and an invitation link to send to the other player. */
export function creerPartie() {
  fermer(); MJ.code = codeAleatoire(); statut('Creating the game…');
  MJ.peer = new Peer(PREFIXE + MJ.code, OPTIONS);
  MJ.peer.on('open', () => { statut(`Game created, code ${MJ.code}. Send the link to your friend with “Invite”, then wait for them here.`); $('#mjInviter').hidden = false; });
  MJ.peer.on('connection', c => { if (MJ.conn?.open) return c.close(); statut('Your friend is joining…'); brancher(c); });
  MJ.peer.on('error', e => { if (e.type === 'unavailable-id') creerPartie(); else statut(`Couldn’t create the game (${e.type})`); });
}
/** Sends the invitation link (through the phone's share sheet: WhatsApp, SMS…), or copies it. */
async function inviter() {
  const url = lienInvitation(), texte = `Shall we play Zém Run together? Click the link (code ${MJ.code}) :`;
  try { if (navigator.share) { await navigator.share({ title: 'Zém Run for two', text: texte, url }); return; } } catch (e) { if (e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(`${texte} ${url}`); statut(`Link copied! Paste it in WhatsApp for your friend. (Code ${MJ.code})`); }
  catch { statut(`Send this link to your friend: ${url}`); }
}
/** Joins another player's game with their code. */
export function rejoindre(code) {
  code = (code || '').trim().toUpperCase(); if (!/^[A-Z]{4}$/.test(code)) return statut('The code is 4 letters long.');
  fermer(); statut('Joining the game…'); MJ.peer = new Peer(OPTIONS);
  MJ.peer.on('open', () => brancher(MJ.peer.connect(PREFIXE + code, { reliable: true })));
  MJ.peer.on('error', e => statut(e.type === 'peer-unavailable' ? 'Game not found: check the code, or ask your friend to create the game again.' : `Couldn’t connect (${e.type})`));
}
export function fermer() { clearTimeout(MJ.delai); try { MJ.conn?.close(); MJ.peer?.destroy(); } catch { } MJ.conn = null; MJ.peer = null; MJ.autre = null; if (MJ.fantome) MJ.fantome.visible = false; }
function envoyer(o) { if (MJ.conn?.open) MJ.conn.send(o); }
/** Called by the player's horn: the other player hears it if close by. */
export function envoyerKlaxon() { envoyer({ type: 'klaxon' }); }
/** The player picks a line: in two-player mode, the other sets off on the same one. */
export function annoncerDepart(ligne, veh) { MJ.autreArrive = MJ.moiArrive = false; envoyer({ type: 'depart', ligne, veh }); }
/** The player reaches the terminus: we tell the other one; returns the two-player race ranking. */
export function arriveeDuo(arrive) {
  if (!multijoueurActif()) return '';
  if (arrive) { MJ.moiArrive = true; envoyer({ type: 'arrive' }); }
  return arrive ? (MJ.autreArrive ? '2e' : '1er') : 'Gave up';
}
function recevoir(d) {
  if (!d || typeof d !== 'object') return;
  if (d.type === 'etat') MJ.autre = d;
  else if (d.type === 'bonjour') statut(`Connected with zém no. ${String(d.numero || '').slice(0, 5)}. Pick a line: you’ll set off together.`);
  else if (d.type === 'klaxon' && MJ.fantome?.visible && JEU.joueur && MJ.fantome.position.distanceTo(JEU.joueur.position) < 120) son('klaxon');
  else if (d.type === 'depart') {
    const L = (JEU.lignes || []).find(l => l.id === d.ligne); if (!L) return;
    MJ.autreArrive = MJ.moiArrive = false;
    if (JEU.actif && JEU.ligne === L && !JEU.fini) return; // already on it
    JEU.fini = false; lancerLigne(L, d.veh === 'tokpa' || L.veh === 'tokpa' ? L.veh : d.veh);
    if (JEU.etat) JEU.etat.file = 1; // next to the other player, in the right-hand lane
    toast('Your friend picked the line: off you go, together!', 2.2, 'bien');
  } else if (d.type === 'arrive') { MJ.autreArrive = true; if (JEU.actif && !JEU.fini && !MJ.moiArrive) toast('Your friend has already reached the terminus!', 2.2, 'mal'); }
}
// The other player's vehicle: blue shirt, and their number above it.
function etiquette(texte) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const c = cv.getContext('2d');
  c.fillStyle = 'rgba(31,61,107,.92)'; c.beginPath(); c.roundRect(4, 6, 248, 52, 26); c.fill();
  c.fillStyle = '#fff'; c.font = '700 26px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(texte, 128, 33);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false })); s.scale.set(3.2, .8, 1); s.renderOrder = 30; return s;
}
function fantome(veh, numero) {
  if (MJ.fantome) scene.remove(MJ.fantome);
  const g = new THREE.Group(), parts = veh === 'tokpa' ? partsTokpa() : veh === 'voiture' ? partsVoiture('#2f6fb0') : partsZem({ chemise: '#2f6fb0', passager: false });
  const m = new THREE.Mesh(mergeColored(parts), matVeh); m.castShadow = true; g.add(m);
  const e = etiquette(`Your friend · no. ${String(numero || '').slice(0, 5)}`); e.position.y = veh === 'tokpa' ? 4.2 : 3; g.add(e);
  g.userData = { veh, numero }; scene.add(g); MJ.fantome = g; return g;
}
// The gap to the other player, at the top of the screen during the ride.
function majEcart(A) {
  const el = $('#jhDuo'); if (!el) return;
  const st = JEU.etat, ok = A && A.enJeu && JEU.actif && st;
  el.hidden = !ok; if (!ok) return;
  if (A.ligne !== JEU.ligne?.id) { el.textContent = 'Your friend is riding another line'; return; }
  const d = Math.round(A.s - st.s);
  el.textContent = Math.abs(d) < 8 ? 'Your friend is right beside you' : `Your friend · ${Math.abs(d)} m ${d > 0 ? 'ahead' : 'behind'}`;
}
/** Every frame: send our position (10 times a second) and place the other player's vehicle. */
export function majMultijoueur(dt) {
  if (!MJ.conn?.open) return;
  MJ.envoi -= dt;
  if (MJ.envoi <= 0) {
    MJ.envoi = .1; const j = JEU.actif && JEU.joueur, st = JEU.etat;
    envoyer(j && st ? { type: 'etat', enJeu: true, x: j.position.x, y: j.position.y, z: j.position.z, a: j.rotation.y, veh: JEU.veh, numero: JEU.numero, ligne: JEU.ligne?.id, s: st.s } : { type: 'etat', enJeu: false });
    majEcart(MJ.autre);
  }
  const A = MJ.autre;
  if (!A || !A.enJeu) { if (MJ.fantome) MJ.fantome.visible = false; return; }
  const f = !MJ.fantome || MJ.fantome.userData.veh !== A.veh || MJ.fantome.userData.numero !== A.numero ? fantome(A.veh, A.numero) : MJ.fantome;
  if (!f.visible || f.position.distanceTo(new THREE.Vector3(A.x, A.y, A.z)) > 60) f.position.set(A.x, A.y, A.z); // teleported or first frame
  const k = 1 - Math.exp(-dt * 10);
  f.visible = true; f.position.x += (A.x - f.position.x) * k; f.position.y += (A.y - f.position.y) * k; f.position.z += (A.z - f.position.z) * k;
  let da = A.a - f.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da)); f.rotation.y += da * k;
}
/** Game menu buttons, and the invitation link (?duo=CODE): we open the game and join the match. */
export function initMultijoueur() {
  $('#mjCreer')?.addEventListener('click', creerPartie);
  $('#mjInviter')?.addEventListener('click', inviter);
  $('#mjRejoindre')?.addEventListener('click', () => rejoindre($('#mjCode').value));
  $('#mjCode')?.addEventListener('keydown', e => { if (e.key === 'Enter') rejoindre(e.target.value); e.stopPropagation(); });
  const code = new URLSearchParams(location.search).get('duo');
  if (code) {
    history.replaceState(null, '', location.pathname); // the link won't be reused on reload
    const go = () => { ouvrirJeu(); $('#mjCode').value = code.toUpperCase(); rejoindre(code); $('#mjStatut')?.scrollIntoView({ block: 'center' }); };
    // Wait for the city and the welcome screen (it appears once loading has finished), which we close straight away.
    let attente = 0;
    const t = setInterval(() => {
      if (!JEU.lignes?.length || !document.querySelector('#loader.done')) return;
      if (document.getElementById('app')?.classList.contains('mode-accueil')) document.querySelector('#acPasser')?.click();
      else if (++attente < 8) return;
      clearInterval(t); go();
    }, 300);
  }
}
