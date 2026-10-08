import { $ } from './base.js';
import { son } from './audio.js';
import { JEU, fmtF, sauver, remplirLignes } from './jeu.js';
import { souvenirsHTML } from './artisans.js';

// ---------- Missions, savings, day streak and garage (in the style of Danfo Run) ----------
// Three missions at a time; each one pays a bonus into the savings, which are spent
// in the garage (horns, new helmet, super jump). Each ride's takings go there too.

const CATALOGUE = {
  klaxons: { txt: n => `Honk at ${n} pedestrians or goats to clear the way`, n: [5, 8, 12, 16], cumul: true, prime: 250 },
  frolements: { txt: n => `Pull off ${n} near misses in a single ride`, n: [4, 6, 9, 12], prime: 300 },
  pieces: { txt: n => `Collect ${n} coins in a single ride`, n: [20, 35, 50, 70], prime: 250 },
  negos: { txt: n => `Negotiate ${n} rides at a fair price or better`, n: [3, 5, 8, 12], cumul: true, prime: 300 },
  ravis: { txt: n => `Drop off ${n} happy customers`, n: [2, 4, 6, 9], cumul: true, prime: 350 },
  egungun: { txt: n => `Brake for ${n} Egungun procession${n > 1 ? 's' : ''}`, n: [1, 2, 3, 5], cumul: true, prime: 300 },
  quartiers: { txt: n => `Answer “Where are we now?” correctly ${n} times`, n: [2, 3, 5, 8], cumul: true, prime: 300 },
  lignes: { txt: n => `Finish ${n} line${n > 1 ? 's' : ''} without losing a life`, n: [1, 2, 3, 5], cumul: true, prime: 400 },
  cotisation: { txt: () => 'Pay your dues to the union collector', n: [1, 1, 1, 1], cumul: true, prime: 150 },
  essence: { txt: n => `Fill up ${n} time${n > 1 ? 's' : ''} (petrol station or kpayo)`, n: [1, 2, 4, 6], cumul: true, prime: 200 },
};
export const KLAXONS = {
  classique: { nom: 'Stock horn', prix: 0 },
  trompette: { nom: 'Two-tone trumpet', prix: 1500 },
  sifflet: { nom: 'Apprentice’s whistle', prix: 3000 },
  tamtam: { nom: 'Talking drum', prix: 5000 },
};
export const BONUS = {
  casque: { nom: 'New helmet', txt: 'absorbs one crash during your next ride', prix: 800 },
  saut: { nom: 'Super jump', txt: 'higher jumps during your next ride', prix: 600 },
};
export const progDefaut = () => ({ missions: [], niveaux: {}, cagnotte: 0, klaxon: 'classique', achetes: ['classique'], serie: { jour: '', n: 0 }, dette: 0, bonus: { casque: 0, saut: 0 } });

function tirer(p, exclus) {
  const ids = Object.keys(CATALOGUE).filter(id => !exclus.includes(id)), id = ids[Math.floor(Math.random() * ids.length)];
  return { id, n: CATALOGUE[id].n[Math.min(p.niveaux[id] ?? 0, 3)], fait: 0 };
}
/** Removes completed missions and tops the list back up to three. */
export function assurerMissions() {
  const p = JEU.prog; p.missions = p.missions.filter(m => m.fait < m.n);
  while (p.missions.length < 3) p.missions.push(tirer(p, p.missions.map(m => m.id)));
}
/** Advances a mission: `valeur` is added (cumulative missions) or used as the ride's best. */
export function progres(id, valeur = 1) {
  const p = JEU.prog; if (!p) return;
  for (const m of p.missions) {
    if (m.id !== id || m.fait >= m.n) continue;
    const C = CATALOGUE[id];
    m.fait = C.cumul ? m.fait + valeur : Math.max(m.fait, valeur);
    if (m.fait >= m.n) { m.fait = m.n; p.cagnotte += C.prime; p.niveaux[id] = (p.niveaux[id] ?? 0) + 1; annonce(`Mission complete · +${fmtF(C.prime)}`, C.txt(m.n)); son('arret'); }
    sauver();
  }
}
let annonceT = 0;
function annonce(titre, sous) {
  const el = $('#jhMission'); if (!el) return;
  el.querySelector('b').textContent = titre; el.querySelector('small').textContent = sous;
  el.classList.add('on'); clearTimeout(annonceT); annonceT = setTimeout(() => el.classList.remove('on'), 3200);
}
/** Streak of playing days: a bonus added to the savings on the first ride of the day. */
export function serieDuJour() {
  const p = JEU.prog, auj = new Date().toISOString().slice(0, 10), hier = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  if (p.serie.jour === auj) return;
  p.serie.n = p.serie.jour === hier ? p.serie.n + 1 : 1; p.serie.jour = auj;
  const b = 50 * Math.min(10, p.serie.n); p.cagnotte += b; sauver();
  setTimeout(() => annonce(`Streak: ${p.serie.n} day${p.serie.n > 1 ? 's' : ''} in a row`, `Daily bonus: +${fmtF(b)} into your savings`), 2600);
}

// Taxi to unlock: example price given in the specification (5 F), final amount to be decided.
export const PRIX_VOITURE = 5;
// ---------- Menu: savings, missions, garage ----------
export function rendreProgression() {
  const el = $('#jmProg'); if (!el) return;
  assurerMissions();
  const p = JEU.prog;
  el.innerHTML = `
    <div class="jp-tete"><div><small>Savings</small><b>${fmtF(p.cagnotte)}</b></div><div><small>Streak</small><b>${p.serie.n || 0} d</b></div><div><small>Union debt</small><b>${p.dette ? fmtF(p.dette) : '—'}</b></div></div>
    <div class="jp-missions">${p.missions.map(m => `<div class="jp-m"><span>${CATALOGUE[m.id].txt(m.n)}</span><i style="--p:${(m.fait / m.n * 100).toFixed(0)}%"></i><small>${m.fait}/${m.n} · +${fmtF(CATALOGUE[m.id].prime)}</small></div>`).join('')}</div>
    ${souvenirsHTML()}
    <details class="jp-garage"><summary>Garage</summary>
      <div class="jp-g">${Object.entries(KLAXONS).map(([k, K]) => {
        const a = p.achetes.includes(k), actif = p.klaxon === k;
        return `<button type="button" data-k="${k}" class="${actif ? 'actif' : ''}" ${!a && p.cagnotte < K.prix ? 'disabled' : ''}><b>${K.nom}</b><small>${actif ? 'Fitted on your zém' : a ? 'Select' : fmtF(K.prix)}</small></button>`;
      }).join('')}
      ${Object.entries(BONUS).map(([k, B]) => `<button type="button" data-b="${k}" ${p.cagnotte < B.prix ? 'disabled' : ''}><b>${B.nom}${p.bonus[k] ? ` · ${p.bonus[k]} in stock` : ''}</b><small>${B.txt} · ${fmtF(B.prix)}</small></button>`).join('')}</div>
      <button type="button" data-v="voiture" class="${p.voiture ? 'actif' : ''}" ${!p.voiture && p.cagnotte < PRIX_VOITURE ? 'disabled' : ''}><b>Taxi (car)</b><small>${p.voiture ? (p.vehicule === 'voiture' ? 'Selected for zém lines · switch back to the zém' : 'Unlocked · select it') : `Unlock · ${fmtF(PRIX_VOITURE)}`}</small></button>
    </details>`;
  el.querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.k, K = KLAXONS[k];
    if (!p.achetes.includes(k)) { if (p.cagnotte < K.prix) return; p.cagnotte -= K.prix; p.achetes.push(k); }
    p.klaxon = k; sauver(); son('klaxon', k); rendreProgression(); el.querySelector('details').open = true;
  }));
  el.querySelector('[data-v]')?.addEventListener('click', () => {
    if (!p.voiture) { if (p.cagnotte < PRIX_VOITURE) return; p.cagnotte -= PRIX_VOITURE; p.voiture = true; p.vehicule = 'voiture'; son('piece'); }
    else p.vehicule = p.vehicule === 'voiture' ? 'zem' : 'voiture';
    sauver(); rendreProgression(); remplirLignes(); el.querySelector('details').open = true;
  });
  el.querySelectorAll('[data-b]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.b; if (p.cagnotte < BONUS[k].prix) return;
    p.cagnotte -= BONUS[k].prix; p.bonus[k]++; sauver(); son('piece'); rendreProgression(); el.querySelector('details').open = true;
  }));
}
