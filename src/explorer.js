import * as THREE from 'three';
import { dureeVisite, musiqueVisite, prechargerMusique, radio } from './audio.js';
import { $ } from './base.js';
import { PLACES } from './donnees-lieux.js';
import { E } from './etat.js';
import { startFlight } from './interface.js';
import { monumentsEnVisite } from './monde-reel.js';
import { camera, controls } from './scene.js';

// ---------- Explorer: categories, radio, guided tour ----------
export const CATS = { hotel: 'Hotels', monument: 'Monuments', institution: 'Monuments', culte: 'Monuments', marche: 'Markets', eau: 'Sea and lagoon', plage: 'Sea and lagoon', transport: 'Transport', savoir: 'Learning', quartier: 'Neighbourhoods' };
export const catDe = p => p.id === 'stade' ? 'Sport' : CATS[p.k] || 'Other';
export let filtre = 'All';
export function initCategories() {
  const el = $('#chips'); if (!el) return;
  const noms = ['All', ...new Set(PLACES.map(catDe))];
  el.innerHTML = noms.map(n => `<button type="button" class="chip" data-c="${n}" aria-pressed="${n === 'All'}">${n}<span>${n === 'All' ? PLACES.length : PLACES.filter(p => catDe(p) === n).length}</span></button>`).join('');
  el.querySelectorAll('.chip').forEach(b => b.addEventListener('click', () => { filtre = b.dataset.c; el.querySelectorAll('.chip').forEach(x => x.setAttribute('aria-pressed', String(x === b))); appliquerFiltre(); }));
}
export function appliquerFiltre() { for (const p of PLACES) { const ok = filtre === 'All' || catDe(p) === filtre; p.btn.parentElement.hidden = !ok; if (p.label) p.label.style.display = ok ? '' : 'none'; } }
export const PRES = { actif: false };
export const attendre = ms => new Promise(r => setTimeout(r, ms));
export const finVol = () => new Promise(r => { const chk = () => (!E.flight || !PRES.actif) ? r() : requestAnimationFrame(chk); chk(); });
export async function presentation() {
  if (PRES.actif) return; PRES.actif = true;
  const app = document.getElementById('app'); app.classList.add('mode-pres'); $('#pres').hidden = false; monumentsEnVisite(true);
  const titre = (h, p) => { const t = $('#presTitre'), s = $('#presSous'); t.textContent = h; s.textContent = p; const box = $('#pres .pres-titre'); box.classList.remove('on'); void box.offsetWidth; box.classList.add('on'); };
  // The radio fades out: the tour is set to “Agolo” by Angélique Kidjo.
  const ancien = $('#btnRadio').getAttribute('aria-pressed') === 'true'; if (ancien) await radio(false);
  await musiqueVisite(true);
  controls.autoRotate = false;
  const centre = new THREE.Vector3(600, 0, -900);
  camera.position.setFromSpherical(new THREE.Spherical(30000, .35, .42)).add(centre); controls.target.copy(centre);
  titre('BENIN IN 3D', 'Cotonou, Abomey-Calavi, Ganvié and Ouidah');
  startFlight(centre.clone(), 11000, .95, .42, 5); await finVol(); await attendre(1200);
  // Geographic tour: the centre, the coast, the west, the north, the lake, then Ouidah.
  const seq = ['etoile', 'dantokpa', 'chenal', 'cathedrale', 'zongo', 'bceao', 'port', 'corniche', 'marina', 'amazone', 'congres', 'bioguera', 'aeroport', 'haievive', 'seme', 'fidjrosse', 'stade', 'uac', 'calavi', 'ganvie', 'porte', 'arene'];
  // The time spent on each place follows the length of the track, so the tour ends with it.
  const pause = THREE.MathUtils.clamp(((dureeVisite() - 16) / seq.length - 3.4) * 1000, 2600, 6500);
  for (const id of seq) {
    if (!PRES.actif) break;
    const p = PLACES.find(q => q.id === id); if (!p) continue;
    titre(p.name, p.kind);
    const [d, phi, th] = p.view; startFlight(new THREE.Vector3(p.x, 0, p.z), d, phi, th, id === 'porte' ? 4.5 : 3.2); await finVol();
    controls.autoRotate = true; controls.autoRotateSpeed = -.9; await attendre(pause); controls.autoRotate = false;
  }
  if (PRES.actif) { titre('BENIN IN 3D', 'Explore the cities · play in their streets'); startFlight(centre.clone(), 13000, .9, .9, 4); await finVol(); await attendre(3500); }
  finPresentation(ancien);
}
export function finPresentation(remettreRadio) {
  if (!PRES.actif) return; PRES.actif = false; controls.autoRotate = $('#togTour').getAttribute('aria-pressed') === 'true'; controls.autoRotateSpeed = -.35;
  document.getElementById('app').classList.remove('mode-pres'); $('#pres').hidden = true; monumentsEnVisite(false);
  musiqueVisite(false);
  if (remettreRadio) radio(true);
}
/** Welcome screen: the tour is offered first. Clicking “Start the tour” also unlocks sound
 *  (browsers refuse to play music before a user gesture). “Explore freely” or Esc: straight to the city. */
export function accueil() {
  const el = $('#accueil'), app = document.getElementById('app'); if (!el) return;
  app.classList.add('mode-accueil'); el.hidden = false; prechargerMusique();
  const clavier = e => { if (e.key === 'Escape') fermer(); };
  const fermer = () => {
    if (el.hidden || el.classList.contains('sort')) return;
    window.removeEventListener('keydown', clavier); app.classList.remove('mode-accueil'); el.classList.add('sort');
    setTimeout(() => { el.hidden = true; el.classList.remove('sort'); }, 500);
  };
  $('#acVisite').addEventListener('click', () => { fermer(); presentation(); }, { once: true });
  $('#acPasser').addEventListener('click', fermer, { once: true });
  window.addEventListener('keydown', clavier);
  $('#acVisite').focus({ preventScroll: true });
}
export function initExplorer() {
  initCategories();
  $('#btnRadio').addEventListener('click', async e => { const b = e.currentTarget, on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(on)); const ok = await radio(on); if (on && !ok) b.setAttribute('aria-pressed', 'false'); });
  $('#btnPres').addEventListener('click', () => presentation());
  $('#pres').addEventListener('click', () => finPresentation($('#btnRadio').getAttribute('aria-pressed') === 'true'));
  window.addEventListener('keydown', e => { if (PRES.actif && e.key === 'Escape') finPresentation($('#btnRadio').getAttribute('aria-pressed') === 'true'); });
}
