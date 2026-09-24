/**
 * Effets sonores du jeu, synthétisés à la volée : aucun fichier à charger. Le
 * contexte audio naît au premier effet, toujours déclenché par une action du
 * joueur (touche ou clic), comme l'exigent les navigateurs.
 */
export class Effets {
  private contexte?: AudioContext;
  private sortie?: GainNode;
  private bruit?: AudioBuffer;
  volume = .5;

  private ctx() {
    if (!('AudioContext' in window)) return undefined;
    if (!this.contexte) {
      const ctx = new AudioContext(); this.contexte = ctx;
      this.sortie = ctx.createGain(); this.sortie.gain.value = this.volume; this.sortie.connect(ctx.destination);
      this.bruit = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = this.bruit.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.contexte.state === 'suspended') void this.contexte.resume();
    this.sortie!.gain.value = this.volume;
    return this.contexte;
  }

  private note(frequence: number, debut: number, duree: number, type: OscillatorType, niveau: number, glisse = 0) {
    const ctx = this.ctx(); if (!ctx) return;
    const t = ctx.currentTime + debut, osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(frequence, t);
    if (glisse) osc.frequency.exponentialRampToValueAtTime(Math.max(30, frequence * glisse), t + duree);
    gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(niveau, t + .012);
    gain.gain.exponentialRampToValueAtTime(.0008, t + duree);
    osc.connect(gain).connect(this.sortie!); osc.start(t); osc.stop(t + duree + .05);
  }

  /** Bip du détecteur : plus aigu à mesure que l'on approche (0 → 1). */
  bip(proximite: number) {
    this.note(520 + proximite * 700, 0, .09, 'sine', .08 + proximite * .07);
  }
  /** Découverte : arpège montant en balafon. */
  carillon() {
    [523, 659, 784, 1047].forEach((f, i) => { this.note(f, i * .09, .5, 'triangle', .14); this.note(f * 2, i * .09, .18, 'sine', .04); });
  }
  /** Remise au pied de l'Amazone : tam-tams puis accord de cuivres. */
  fanfare(complete = false) {
    this.tamtam(complete ? 8 : 4);
    const base = complete ? .9 : .5;
    for (const [f, d] of [[392, 0], [494, .02], [587, .04], [784, .06]] as const) this.note(f, base + d, complete ? 1.4 : .8, 'sawtooth', .045);
  }
  /** Coups de tambour grave, hauteur qui retombe comme une peau frappée. */
  tamtam(coups: number) {
    for (let i = 0; i < coups; i++) this.note(i % 4 === 3 ? 160 : 110, i * .115, .28, 'sine', .22, .45);
  }
  /** Mauvaise réponse : deux notes descendantes. */
  erreur() { this.note(330, 0, .18, 'square', .05); this.note(247, .16, .28, 'square', .05); }
  /** Souffle du drone qui prend de l'altitude ou change de cap. */
  souffle() {
    const ctx = this.ctx(); if (!ctx || !this.bruit) return;
    const t = ctx.currentTime, source = ctx.createBufferSource(), filtre = ctx.createBiquadFilter(), gain = ctx.createGain();
    source.buffer = this.bruit; filtre.type = 'bandpass'; filtre.Q.value = 1.2;
    filtre.frequency.setValueAtTime(300, t); filtre.frequency.exponentialRampToValueAtTime(2400, t + .9);
    gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(.12, t + .3); gain.gain.exponentialRampToValueAtTime(.001, t + 1.1);
    source.connect(filtre).connect(gain).connect(this.sortie!); source.start(t); source.stop(t + 1.2);
  }
}
