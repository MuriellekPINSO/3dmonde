import * as THREE from 'three';
import { $ } from './base.js';

// ---------- Advertising: a single catalogue for the whole city and for Zém Run ----------
// Each campaign feeds the 4 × 3 billboards on the main roads (rue.js) and the large
// billboards placed along the game's routes (bordure.js). The posters are drawn
// (brand text and colours, no logo): for a real campaign, put the visual supplied
// by the advertiser in public/pubs/ and reference it in `image`
// (4:3 format, 1024 × 768 px). Real brands must only be shown in a public
// version with the advertiser's consent.

export const CONTACT_PUB = ''; // address or number to show in the offer (to be filled in)

export const CAMPAGNES = [
  { id: 'mtn-momo', marque: 'MTN', titre: 'MoMo', sous: 'Envoyez, payez, retirez partout au Bénin', fond: '#ffcc00', encre: '#111111', accent: '#111111', poids: 3 },
  { id: 'moov-money', marque: 'Moov Africa', titre: 'Moov Money', sous: 'Votre argent, partout, à tout moment', fond: '#0a5aa8', encre: '#ffffff', accent: '#f58220', poids: 3 },
  { id: 'vodun-days', marque: 'Ouidah', titre: 'VODUN DAYS', sous: '9 et 10 janvier · Ouidah', fond: '#7a1f2b', encre: '#ffffff', accent: '#f2c21b', poids: 2 },
  { id: 'benin-revele', marque: 'Tourisme', titre: 'LE BÉNIN RÉVÉLÉ', sous: 'Visitez, découvrez, vivez', fond: '#14532d', encre: '#ffffff', accent: '#facc15', poids: 2 },
  { id: 'qualiwo', marque: 'Qualiwo', titre: 'QUALIWO', sous: 'Commandez en un geste', fond: '#c75b39', encre: '#ffffff', accent: '#ffe7a8', poids: 2 },
  { id: 'votre-pub', marque: 'Advertisers', titre: 'YOUR AD HERE', sous: 'Billboards in the 3D city and in Zém Run', fond: '#1d1a16', encre: '#f2c21b', accent: '#f2c21b', poids: 2, offre: true },
  { id: 'bissap', marque: 'Example', titre: 'BISSAP JUICE', sous: '100% natural', fond: '#9d174d', encre: '#ffffff', accent: '#fde68a', poids: 1 },
  { id: 'ciment', marque: 'Example', titre: 'SOLID CEMENT', sous: 'Built to last', fond: '#4b5563', encre: '#ffffff', accent: '#facc15', poids: 1 },
];
const total = CAMPAGNES.reduce((s, c) => s + c.poids, 0);
/** A random (weighted) campaign, from a number between 0 and 1. */
export function campagne(r) { let x = r * total; for (const c of CAMPAGNES) { x -= c.poids; if (x <= 0) return c; } return CAMPAGNES[0]; }

const cache = new Map();
/** Poster texture (drawn, or the advertiser's visual if `image` is provided). */
export function affiche(c) {
  if (cache.has(c.id)) return cache.get(c.id);
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 768; const g = cv.getContext('2d'), w = 1024, h = 768;
  const fond = g.createLinearGradient(0, 0, w, h); fond.addColorStop(0, c.fond); fond.addColorStop(1, ombre(c.fond)); g.fillStyle = fond; g.fillRect(0, 0, w, h);
  g.fillStyle = c.accent; g.globalAlpha = .22; g.beginPath(); g.arc(w * .86, h * .2, 230, 0, 7); g.fill(); g.globalAlpha = 1;
  g.fillStyle = c.encre; g.font = '700 40px "Plus Jakarta Sans", system-ui, sans-serif'; g.fillText(c.marque.toUpperCase(), 64, 110);
  let t = 150; g.font = `900 ${t}px "Bricolage Grotesque", Impact, sans-serif`; while (g.measureText(c.titre).width > w - 128 && t > 70) { t -= 8; g.font = `900 ${t}px "Bricolage Grotesque", Impact, sans-serif`; }
  g.fillText(c.titre, 60, 360);
  g.font = '600 52px "Plus Jakarta Sans", system-ui, sans-serif'; ligneCoupee(g, c.sous, 64, 470, w - 128, 62);
  g.fillStyle = c.accent; g.fillRect(64, 600, 220, 14);
  // strip in the flag colours, as on many Cotonou billboards
  g.fillStyle = '#008751'; g.fillRect(0, h - 40, w * .34, 40); g.fillStyle = '#fcd116'; g.fillRect(w * .34, h - 40, w * .33, 40); g.fillStyle = '#e8112d'; g.fillRect(w * .67, h - 40, w * .33, 40);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  if (c.image) new THREE.TextureLoader().load(import.meta.env.BASE_URL + c.image, img => { tex.image = img.image; tex.needsUpdate = true; });
  cache.set(c.id, tex); return tex;
}
const mats = new Map();
export function matAffiche(c) { if (!mats.has(c.id)) mats.set(c.id, new THREE.MeshBasicMaterial({ map: affiche(c), toneMapped: false })); return mats.get(c.id); }
function ombre(hex) { const col = new THREE.Color(hex); col.multiplyScalar(.62); return '#' + col.getHexString(); }
function ligneCoupee(g, txt, x, y, l, dy) { const mots = txt.split(' '); let ligne = ''; for (const m of mots) { const t = ligne ? ligne + ' ' + m : m; if (g.measureText(t).width > l && ligne) { g.fillText(ligne, x, y); ligne = m; y += dy; } else ligne = t; } g.fillText(ligne, x, y); }

// ---------- Counted displays (on this device) ----------
const CLE = 'cotonou3d.pubs';
let vues = {}; try { vues = JSON.parse(localStorage.getItem(CLE) || '{}'); } catch { vues = {}; }
export function compterVue(id) { vues[id] = (vues[id] || 0) + 1; try { localStorage.setItem(CLE, JSON.stringify(vues)); } catch { } }

// ---------- The offer to advertisers ----------
export function ouvrirOffre() {
  const el = $('#offrePub'); if (!el) return;
  el.querySelector('.op-stats').innerHTML = CAMPAGNES.filter(c => !c.offre).map(c => `<li><i style="background:${c.fond}"></i>${c.marque} · ${c.titre}<b>${(vues[c.id] || 0).toLocaleString('en-US')}</b></li>`).join('');
  el.querySelector('.op-contact').textContent = CONTACT_PUB ? `Contact: ${CONTACT_PUB}` : 'Contact: to be filled in, in src/publicites.js (CONTACT_PUB).';
  el.hidden = false;
}
export function initOffre() {
  const el = $('#offrePub'); if (!el) return;
  el.querySelector('.op-x').addEventListener('click', () => { el.hidden = true; });
  el.addEventListener('click', e => { if (e.target === el) el.hidden = true; });
}
