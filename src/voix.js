import { hash } from './base.js';
import { AUDIO } from './audio.js';

// ---------- Voices: the people of Zém Run speak out loud ----------
// The browser's speech synthesis (Web Speech API): free, no key, in English.
// Each person keeps their own voice (woman or man, pitch and rate drawn from their seed).
// You only hear the people close to the zém, one sentence at a time; whatever you
// are answering (dialogue) goes ahead of the roadside chit-chat.

const synth = typeof speechSynthesis !== 'undefined' ? speechSynthesis : null;
export const VOIX = { on: true, femmes: [], hommes: [], toutes: [], courant: null, file: [], dernier: { cle: '', t: 0 }, garde: 0 };
try { VOIX.on = localStorage.getItem('cotonou3d.voix') !== '0'; } catch { }

const FEMMES = /samantha|karen|moira|tessa|victoria|fiona|serena|susan|allison|\bava\b|\bzoe\b|\bkate\b|catherine|martha|stephanie|kathy|vicki|veena|jenny|\baria\b|sonia|libby|maisie|\bemma\b|michelle|hazel|zira|ezinne|google us english|\bflo\b|sandy|shelley|grandma|female|woman/i;
const HOMMES = /daniel|\balex\b|fred|oliver|arthur|aaron|gordon|\blee\b|rishi|ryan|\bguy\b|thomas|george|\beric\b|christopher|andrew|brian|william|david|\bmark\b|james|abeo|albert|junior|ralph|eddy|reed|rocko|grandpa|\bmale\b|\bman\b/i;
// Apple's "Eloquence" voices (Eddy, Flo, Rocko…) and the old novelty voices (Fred, Zarvox, Bells…) sound very robotic: last resort only.
const ROBOT = /\b(eddy|flo|reed|rocko|sandy|shelley|grandma|grandpa|fred|albert|junior|ralph|kathy|bad news|good news|bahh|bells|boing|bubbles|cellos|jester|organ|superstar|trinoids|whisper|wobble|zarvox)\b/i;
const note = v => (/^en[-_](GB|US)/i.test(v.lang) ? 3 : /^en[-_](NG|GH|IE|AU|CA|ZA|NZ)/i.test(v.lang) ? 2 : 1) + (/natural|neural|premium|enhanced|online/i.test(v.name) ? 3 : 0) + (/google/i.test(v.name) ? 1 : 0) - (ROBOT.test(v.name) ? 3 : 0);
const meilleures = l => { const n = l.length ? note(l[0]) : 0; return l.filter(v => note(v) >= n - 1).slice(0, 4); };

function chargerVoix() {
  if (!synth) return;
  const fr = synth.getVoices().filter(v => /^en/i.test(v.lang)).sort((a, b) => note(b) - note(a));
  const f = fr.filter(v => FEMMES.test(v.name)), h = fr.filter(v => !FEMMES.test(v.name) && HOMMES.test(v.name)), autres = fr.filter(v => !FEMMES.test(v.name) && !HOMMES.test(v.name));
  Object.assign(VOIX, { femmes: meilleures([...f, ...autres]), hommes: meilleures([...h, ...autres]), toutes: fr });
}
if (synth) { chargerVoix(); synth.addEventListener?.('voiceschanged', chargerVoix); }
// Safari (iPhone) only speaks after a first sentence spoken during a user gesture: we say one, muted.
const debloquer = () => { if (!synth) return; const u = new SpeechSynthesisUtterance(' '); u.volume = 0; synth.speak(u); };
addEventListener('pointerdown', debloquer, { once: true, capture: true });
addEventListener('keydown', debloquer, { once: true, capture: true });

const graineDe = g => typeof g === 'number' ? Math.abs(Math.round(g)) : [...String(g ?? '')].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7) >>> 0;
/** A person's voice: { femme (woman?), graine (seed), age: '' | 'jeune' (young) | 'vieux' (old) | 'revenant' (ghost) }. */
function profil({ femme = false, graine = 0, age = '' } = {}) {
  const g = graineDe(graine), propre = femme ? VOIX.femmes : VOIX.hommes, l = propre.length ? propre : VOIX.toutes;
  if (!l.length) return null;
  let pitch = femme ? 1.08 + hash(g, 82) * .28 : .8 + hash(g, 82) * .26, rate = .97 + hash(g, 83) * .15;
  if (!propre.length) pitch += femme ? .3 : -.25; // no voice of the right gender: shift the pitch
  if (age === 'jeune') { pitch += .08; rate += .07; } else if (age === 'vieux') { pitch -= .14; rate -= .1; } else if (age === 'revenant') { pitch = .3; rate = .78; }
  return { voix: l[Math.floor(hash(g, 81) * l.length)], pitch: Math.max(.1, Math.min(2, pitch)), rate };
}
/** Written for the eye, said for the ear: no quotes or translations, francs spelled out, thousands separators dropped. */
function pourLaVoix(t) {
  return String(t).replace(/[«»"“”]/g, '').replace(/\([^)]*\)/g, '')
    .replace(/(\d)[\s  ,](?=\d{3}\b)/g, '$1').replace(/(\d+)\s*F\b/g, '$1 francs')
    .replace(/ɔ/g, 'o').replace(/Ɔ/g, 'O').replace(/ɛ/g, 'e').replace(/Ɛ/g, 'E')
    .replace(/\bTchrr+\b/gi, 'Tchew').replace(/\b([Zz])ém/g, '$1em').replace(/\bMoMo\b/g, 'Momo')
    .replace(/\s+/g, ' ').trim();
}

function lancer(e, delai = 0) {
  VOIX.courant = e;
  const fini = () => {
    if (VOIX.courant !== e) return; VOIX.courant = null; clearTimeout(VOIX.garde);
    let n; while ((n = VOIX.file.shift()) && performance.now() - n.t > 6000); // too late: no longer worth saying
    if (n) lancer(n, 80);
  };
  e.u.onend = e.u.onerror = fini;
  setTimeout(() => { if (VOIX.courant === e) synth.speak(e.u); }, delai);
  clearTimeout(VOIX.garde); VOIX.garde = setTimeout(fini, delai + 2500 + e.u.text.length * 110); // safety net in case "end" never fires
}
/** Says `texte` in the voice of `qui`. Priority: 0 chit-chat (only said if nobody is talking), 1 addressed to the zém, 2 dialogue. */
export function parler(texte, qui = {}, priorite = 0) {
  if (!synth || !VOIX.on || AUDIO.muet) return;
  const t = pourLaVoix(texte); if (!t) return;
  const cle = t.toLowerCase().replace(/[^a-zà-ÿ0-9]/g, ''), now = performance.now();
  if (cle === VOIX.dernier.cle && now - VOIX.dernier.t < 4000) return; // the bubble and the dialogue often say the same thing
  if (VOIX.courant && priorite === 0) return;
  const P = profil(qui); if (!P) return;
  VOIX.dernier = { cle, t: now };
  const u = new SpeechSynthesisUtterance(t); u.voice = P.voix; u.lang = P.voix.lang; u.pitch = P.pitch; u.rate = P.rate; u.volume = qui.fort ? 1 : .92;
  const e = { u, priorite, t: now };
  if (!VOIX.courant) return lancer(e);
  if (priorite > VOIX.courant.priorite) { // cut the chit-chat for what matters
    VOIX.file = VOIX.file.filter(x => x.priorite >= priorite); VOIX.courant = null; synth.cancel(); lancer(e, 80); return;
  }
  VOIX.file.push(e); if (VOIX.file.length > 3) VOIX.file.shift();
}
/** The voice stored on a 3D object (userData.voix), or worked out from the person (personne() in discussions.js). */
export function voixDe(o) {
  const u = o?.userData || {};
  if (u.voix) return u.voix;
  if (u.femme !== undefined) return { femme: u.femme, graine: u.graine ?? o.id };
  return { femme: hash(o?.id ?? 0, 3) < .5, graine: o?.id ?? 0 };
}
/** Silence (pause, game over, sound off). */
export function taire() { VOIX.file = []; VOIX.courant = null; clearTimeout(VOIX.garde); synth?.cancel(); }
export function voixActives(on) { VOIX.on = on; if (!on) taire(); try { localStorage.setItem('cotonou3d.voix', on ? '1' : '0'); } catch { } }
export const voixDispo = () => !!synth;
