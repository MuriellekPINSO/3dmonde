import * as T from 'three';

/**
 * Poussière soulevée par le véhicule du joueur : un petit nuage de particules
 * recyclées qui naissent derrière la roue arrière quand le véhicule roule,
 * dérive et s'évanouit. Aucune ressource à charger — un disque peint sur
 * canvas — et un seul draw call via `Points` : le budget GPU reste minuscule.
 */
export class Poussiere {
  private readonly points: T.Points;
  private readonly positions: Float32Array;
  private readonly vies: Float32Array;
  private readonly velocites: Float32Array;
  private charges: boolean[] = [];
  private suivant = 0;
  private static readonly N = 90;

  constructor(scene: T.Object3D, private readonly teinte = '#d8c49a') {
    const n = Poussiere.N;
    this.positions = new Float32Array(n * 3);
    this.vies = new Float32Array(n);
    this.velocites = new Float32Array(n * 3);
    this.charges = new Array(n).fill(false);
    for (let i = 0; i < n; i++) this.positions[i * 3 + 1] = -10;
    const toile = document.createElement('canvas'); toile.width = toile.height = 32;
    const c = toile.getContext('2d')!;
    const halo = c.createRadialGradient(16, 16, 1, 16, 16, 15);
    halo.addColorStop(0, 'rgba(214,190,150,.55)'); halo.addColorStop(1, 'rgba(214,190,150,0)');
    c.fillStyle = halo; c.fillRect(0, 0, 32, 32);
    const carte = new T.CanvasTexture(toile); carte.colorSpace = T.SRGBColorSpace;
    const matiere = new T.PointsMaterial({size: .55, map: carte, transparent: true, depthWrite: false, opacity: .68});
    const geometrie = new T.BufferGeometry();
    geometrie.setAttribute('position', new T.BufferAttribute(this.positions, 3));
    this.points = new T.Points(geometrie, matiere);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  /**
   * Émet au point donné (arrière du véhicule) si la vitesse le justifie.
   * `intensite` module la quantité : plus le véhicule va vite, plus la poussière
   * est dense — jusqu'à un plancher pour ne pas fumer à l'arrêt.
   */
  emis(x: number, y: number, z: number, vitesse: number) {
    if (vitesse <= .4) return;
    const i = this.suivant; this.suivant = (this.suivant + 1) % Poussiere.N;
    this.positions[i * 3] = x + (Math.random() - .5) * .3;
    this.positions[i * 3 + 1] = y + Math.random() * .1;
    this.positions[i * 3 + 2] = z + (Math.random() - .5) * .3;
    this.velocites[i * 3] = (Math.random() - .5) * .3;
    this.velocites[i * 3 + 1] = .5 + Math.random() * .5;
    this.velocites[i * 3 + 2] = (Math.random() - .5) * .3;
    this.vies[i] = 1; this.charges[i] = true;
  }

  /** Un appel par image : consommation des vies, dérive ascendante, évaporation. */
  actualiser(dt: number) {
    const geo = this.points.geometry;
    for (let i = 0; i < Poussiere.N; i++) {
      if (!this.charges[i]) continue;
      this.vies[i] -= dt / 1.4;
      if (this.vies[i] <= 0) {this.charges[i] = false; this.positions[i * 3 + 1] = -10; continue;}
      this.positions[i * 3] += this.velocites[i * 3] * dt;
      this.positions[i * 3 + 1] += this.velocites[i * 3 + 1] * dt;
      this.positions[i * 3 + 2] += this.velocites[i * 3 + 2] * dt;
    }
    geo.attributes.position.needsUpdate = true;
  }
}
