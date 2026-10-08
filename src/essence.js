import { $ } from './base.js';
import { payerEtRecevoir } from './remise.js';
import { son } from './audio.js';
import { BORD } from './bordure.js';
import { bulle, dialogue, DISC } from './discussions.js';
import { JEU, fmtF, toast } from './jeu.js';
import { progres } from './missions.js';

// ---------- Petrol ----------
// The tank drains as you ride (1 litre per 3 km, at game scale). You fill up
// by stopping (brake) in front of a petrol station (680 F a litre) or at a roadside
// kpayo seller (500 F, but smuggled petrol is sometimes watered down:
// the engine coughs). Run dry and you break down: you crawl along to the next seller.

export const RESERVOIR = 3, PRIX = { station: 680, kpayo: 500 };
const vivantDe = it => BORD.vivants.find(v => v.s === it.s && v.type === it.type);

/** Starting settings for a run. */
export function essenceDepart(st) { st.essence = 1.2 + Math.random() * .6; st.panne = false; st.toux = 0; st.reserveDite = false; st.plein = -1; }
/** Top-speed factor (out of fuel, watered-down petrol). */
export const facteurEssence = st => (st.panne ? .16 : st.toux > 0 ? .72 : 1);

function payer(st, cout) { // the day's takings first, then the savings
  const P = JEU.prog, dispo = Math.max(0, st.argent) + (P?.cagnotte || 0); if (dispo < cout) return false;
  const surRecette = Math.min(Math.max(0, st.argent), cout); st.argent -= surRecette; if (cout > surRecette) P.cagnotte -= cout - surRecette;
  return true;
}
export function servir(st, it) {
  const kpayo = it.type === 'kpayo', prix = PRIX[kpayo ? 'kpayo' : 'station'], v = vivantDe(it);
  const manque = Math.max(0, RESERVOIR - st.essence), plein = Math.round(manque * 10) / 10, cout = Math.ceil(plein * prix / 25) * 25;
  const qui = kpayo ? 'The kpayo vendor' : `The pump attendant${it.nom ? ' · ' + it.nom : ''}`;
  const texte = kpayo ? `“Kpayo! ${fmtF(prix)} a litre, cheaper than at the station!”` : `“Hello zém! How much shall I put in? It’s ${fmtF(prix)} a litre.”`;
  if (v) bulle(v.g, kpayo ? 'Kpayo! One litre, two litres?' : 'Hello zém! Filling up?', { duree: 2.6 });
  const verser = (l, c) => {
    if (!payer(st, c)) { toast('Not enough money for that', 1.4, 'mal'); if (v) bulle(v.g, 'You have to pay first eh!'); return; }
    st.essence = Math.min(RESERVOIR, st.essence + l); st.panne = false; st.service = Math.max(st.service, 2.6);
    if (v && JEU.joueur) payerEtRecevoir(JEU.joueur, v.g, 'essence', JEU.joueur, { hautVers: .95, garder: 1.4, verser: true }); // you see the petrol pour into the tank
    son('piece'); toast(`+${l.toLocaleString('en-US')} L of petrol · −${fmtF(c)}`, 1.6, 'bien'); progres('essence', 1);
    if (kpayo && Math.random() < .18) { // watered-down smuggled petrol
      st.toux = 25; setTimeout(() => toast('Watered-down petrol! The engine is coughing…', 2, 'mal'), 1300);
      if (DISC.client) bulle(DISC.client.siege, 'Hmm… this kpayo is no good!', { ton: 'fort' });
    } else if (v) bulle(v.g, kpayo ? 'Thanks! Ride safe, my brother!' : 'Thanks, safe journey!');
  };
  dialogue(qui, texte, [
    [`1 litre · ${fmtF(prix)}`, () => verser(1, prix)],
    [`Fill it up (${plein.toLocaleString('en-US')} L) · ${fmtF(cout)}`, () => verser(plein, cout)],
    ['Nothing, thanks', () => { if (v) bulle(v.g, kpayo ? 'Another time!' : 'Safe journey!'); }],
  ], { defaut: st.essence < .6 ? 1 : 2, duree: 9, bloquant: true });
}

/** Every frame during the run. */
export function majEssence(st, dt) {
  if (st.essence === undefined) return;
  if (st.toux > 0) st.toux -= dt;
  if (!st.panne) {
    st.essence -= st.v * dt / 3000 * (JEU.veh === 'tokpa' ? 1.4 : 1);
    if (st.essence <= 0) {
      st.essence = 0; st.panne = true; son('bosse'); toast('Out of petrol! Find a station or a kpayo seller', 2.8, 'mal');
      if (DISC.client) { DISC.client.humeur = Math.max(0, DISC.client.humeur - .3); bulle(DISC.client.siege, 'Eh! You didn’t put petrol in?!', { ton: 'fort' }); }
    } else if (st.essence < .45 && !st.reserveDite) { st.reserveDite = true; toast('Running low! Fill up at the next seller', 2.2, 'mal'); }
  }
  // Low tank: point out the next seller; it's up to the player to stop (E to fill up).
  if (st.essence < 1 || st.panne) for (const it of BORD.items) {
    if (it.type !== 'station' && it.type !== 'kpayo') continue;
    const ds = it.s - st.s;
    if (ds > 40 && ds < 80 && !it.propose) { it.propose = true; toast(`${it.type === 'station' ? `Station${it.nom ? ' ' + it.nom : ''}` : 'Kpayo'} on the ${it.side > 0 ? 'right' : 'left'}: stop in front of it, then press E to fill up`, 2.6); break; }
  }
  // HUD gauge.
  const el = $('#jhEssence'); if (el) { el.firstElementChild.style.width = `${Math.max(0, st.essence / RESERVOIR * 100).toFixed(0)}%`; el.classList.toggle('bas', st.essence < .45); el.title = `Petrol: ${st.essence.toFixed(1)} L`; }
}
