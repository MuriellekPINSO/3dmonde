export type LectureManette = {
  id: string;
  index: number;
  mapping: string;
  nombreAxes: number;
  nombreBoutons: number;
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

  private estUtilisable(gamepad: Gamepad | null): gamepad is ManetteHaptique {
    return !!gamepad && gamepad.connected !== false && gamepad.axes.length >= 2 && gamepad.buttons.length >= 4;
  }

  private score(gamepad: Gamepad) {
    const id = gamepad.id.toLowerCase();
    let score = gamepad.axes.length + gamepad.buttons.length / 10;
    if (gamepad.mapping === 'standard') score += 20;
    if (/dualsense|wireless controller|playstation|sony/.test(id)) score += 40;
    if (/xbox|xinput/.test(id)) score += 30;
    if (gamepad.timestamp > 0) score += 5;
    return score;
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
    if (this.estUtilisable(connue)) return connue;
    const disponibles = Array.from(gamepads).filter(gamepad => this.estUtilisable(gamepad));
    disponibles.sort((a, b) => this.score(b) - this.score(a));
    return disponibles[0] ?? (this.estUtilisable(this.derniereManette) ? this.derniereManette : null);
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
    if (this.index !== gamepad.index) this.boutonsPrecedents = gamepad.buttons.map(() => false);
    this.index = gamepad.index;
    this.derniereManette = gamepad;

    // Safari et quelques pilotes Bluetooth remplissent `value` sans toujours
    // mettre `pressed` à true. Les deux informations doivent donc être lues.
    const boutons = gamepad.buttons.map(bouton => bouton.pressed || bouton.value > .35);
    const precedents = this.boutonsPrecedents;
    const playStationBrute = gamepad.mapping !== 'standard'
      && /dualsense|wireless controller|playstation|sony/i.test(gamepad.id);
    // Dans le rapport HID PlayStation brut : Carré=0, Croix=1, Rond=2.
    // L'API standard attend Croix=0, Rond=1, Carré=2.
    const indexBrut = (index: number) => playStationBrute
      ? ([1, 2, 0, 3] as number[])[index] ?? index
      : index;
    const appuye = (index: number) => {
      const brut = indexBrut(index);
      return !!boutons[brut] && !precedents[brut];
    };
    const axe = (index: number) => zoneMorte(gamepad!.axes[index] ?? 0);
    let deplacementX = axe(0), deplacementZ = axe(1);
    if (!deplacementX) deplacementX = Number(boutons[15]) - Number(boutons[14]);
    if (!deplacementZ) deplacementZ = Number(boutons[13]) - Number(boutons[12]);
    const lecture = {
      id: gamepad.id,
      index: gamepad.index,
      mapping: gamepad.mapping || (playStationBrute ? 'PlayStation direct' : 'direct'),
      nombreAxes: gamepad.axes.length,
      nombreBoutons: gamepad.buttons.length,
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
