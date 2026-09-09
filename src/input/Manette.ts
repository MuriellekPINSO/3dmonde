export type LectureManette = {
  id: string;
  deplacementX: number;
  deplacementZ: number;
  regardX: number;
  regardY: number;
  appuye: (bouton: number) => boolean;
};

export type ImpactHaptique = 'selection'|'interaction'|'succes'|'erreur'|'montee'|'descente'|'collision';
export type RoulementHaptique = 'marche'|'course'|'zemidjan'|'voiture';

type ActionneurHaptique = {
  playEffect?: (type: string, options: {
    startDelay: number;
    duration: number;
    weakMagnitude: number;
    strongMagnitude: number;
  }) => Promise<unknown>;
  pulse?: (intensite: number, duree: number) => Promise<unknown>;
  reset?: () => Promise<unknown>;
};

type ManetteHaptique = Gamepad & {
  vibrationActuator?: ActionneurHaptique | null;
  hapticActuators?: ActionneurHaptique[];
};

/** Lecture normalisée d'une manette via l'API Gamepad du navigateur. */
export class Manette {
  private index: number | null = null;
  private boutonsPrecedents: boolean[] = [];
  private derniereManette: ManetteHaptique | null = null;
  private dernierRoulement = 0;

  connecter(gamepad: Gamepad) {
    this.index = gamepad.index;
    this.derniereManette = gamepad as ManetteHaptique;
    this.boutonsPrecedents = gamepad.buttons.map(() => false);
  }

  deconnecter(gamepad: Gamepad) {
    if (this.index !== gamepad.index) return;
    this.index = null;
    this.arreterVibrations();
    this.derniereManette = null;
    this.boutonsPrecedents = [];
  }

  private obtenirManette() {
    const gamepads = navigator.getGamepads?.();
    if (!gamepads) return this.derniereManette;
    const connue = this.index === null ? null : gamepads[this.index];
    return (connue ?? Array.from(gamepads).find(Boolean) ?? this.derniereManette) as ManetteHaptique | null;
  }

  private actionneur() {
    const gamepad = this.obtenirManette();
    return gamepad?.vibrationActuator ?? gamepad?.hapticActuators?.[0] ?? null;
  }

  get vibrationsDisponibles() { return !!this.actionneur(); }

  /** Impulsion ponctuelle : menus, interaction ou récompense. */
  vibrer(impact: ImpactHaptique) {
    const effets: Record<ImpactHaptique, [number, number, number]> = {
      selection: [.12, .08, 55],
      interaction: [.32, .22, 120],
      succes: [.55, .38, 220],
      erreur: [.18, .58, 260],
      montee: [.7, .42, 320],
      descente: [.3, .18, 130],
      collision: [1, .9, 520],
    };
    const [faible, forte, duree] = effets[impact];
    this.jouer(faible, forte, duree);
  }

  /** Pulsations régulières qui font sentir les pas et le moteur sous la manette. */
  roulement(amplitude: number, mode: RoulementHaptique) {
    if (amplitude < .18) return;
    const maintenant = performance.now();
    const intervalles: Record<RoulementHaptique, number> = {marche: 360, course: 245, zemidjan: 150, voiture: 190};
    if (maintenant - this.dernierRoulement < intervalles[mode]) return;
    this.dernierRoulement = maintenant;
    const intensite = Math.min(1, amplitude);
    const effets: Record<RoulementHaptique, [number, number, number]> = {
      marche: [.2, .12, 85],
      course: [.32, .2, 105],
      zemidjan: [.52, .28, 135],
      voiture: [.38, .2, 165],
    };
    const [faible, forte, duree] = effets[mode];
    this.jouer(faible * intensite, forte * intensite, duree);
  }

  arreterVibrations() {
    const resultat = this.actionneur()?.reset?.();
    resultat?.catch(() => undefined);
  }

  private jouer(faible: number, forte: number, duree: number) {
    const actionneur = this.actionneur();
    if (!actionneur) return;
    if (actionneur.playEffect) {
      actionneur.playEffect('dual-rumble', {
        startDelay: 0,
        duration: duree,
        weakMagnitude: faible,
        strongMagnitude: forte,
      }).catch(() => actionneur.pulse?.(Math.max(faible, forte), duree).catch(() => undefined));
      return;
    }
    actionneur.pulse?.(Math.max(faible, forte), duree).catch(() => undefined);
  }

  lire(): LectureManette | null {
    const gamepad = this.obtenirManette();
    if (!gamepad) {
      this.index = null;
      this.derniereManette = null;
      this.boutonsPrecedents = [];
      return null;
    }
    this.index = gamepad.index;
    this.derniereManette = gamepad;

    const boutons = gamepad.buttons.map(bouton => bouton.pressed);
    const precedents = this.boutonsPrecedents;
    const appuye = (index: number) => !!boutons[index] && !precedents[index];
    const axe = (index: number) => zoneMorte(gamepad!.axes[index] ?? 0);
    let deplacementX = axe(0), deplacementZ = axe(1);
    if (!deplacementX) deplacementX = Number(boutons[15]) - Number(boutons[14]);
    if (!deplacementZ) deplacementZ = Number(boutons[13]) - Number(boutons[12]);
    const lecture = {
      id: gamepad.id,
      deplacementX,
      deplacementZ,
      regardX: axe(2),
      regardY: axe(3),
      appuye,
    };
    this.boutonsPrecedents = boutons;
    return lecture;
  }
}

/** Supprime les petits mouvements involontaires et conserve une progression analogique. */
export function zoneMorte(valeur: number, seuil = .16) {
  const amplitude = Math.abs(valeur);
  if (amplitude <= seuil) return 0;
  return Math.sign(valeur) * Math.min(1, (amplitude - seuil) / (1 - seuil));
}
