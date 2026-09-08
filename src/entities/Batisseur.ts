import * as T from 'three';

/**
 * Outils de construction du décor : matières, textures dessinées au canvas,
 * primitives géométriques mises en cache et mobilier urbain.
 * Les motifs reprennent les surfaces observées sur les photos de référence
 * listées dans docs/REFERENCES.md.
 */
export type Motif = 'paves'|'asphalte'|'sable'|'gazon'|'beton'|'eau'|'piste'|'vitrage'|'vitrageSombre'
  |'cannelures'|'pylone'|'claustra'|'tole'|'immeuble'|'boutique'|'drapeau'|'roche';

let graine = 1;
const alea = () => { graine = (graine * 1103515245 + 12345) & 0x7fffffff; return graine / 0x7fffffff; };
const grain = (c: CanvasRenderingContext2D, t: number, n: number, couleurs: string[], taille = 2) => {
  for (let i = 0; i < n; i++) { c.fillStyle = couleurs[Math.floor(alea() * couleurs.length)]; c.fillRect(alea() * t, alea() * t, taille, taille); }
};
/** Variation déterministe liée à une position, pour éviter un décor trop régulier. */
export const varie = (x: number, z: number) => Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1;

/** Bandeau vitre : panneaux teintes, meneaux et petits carres opaques. */
const verriere = (c: CanvasRenderingContext2D, t: number, fond: string, meneau: string) => {
  c.fillStyle = fond; c.fillRect(0, 0, t, t);
  c.strokeStyle = meneau; c.lineWidth = 3;
  for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(i * t / 4, 0); c.lineTo(i * t / 4, t); c.stroke(); }
  for (let j = 0; j <= 3; j++) { c.beginPath(); c.moveTo(0, j * t / 3); c.lineTo(t, j * t / 3); c.stroke(); }
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { c.fillStyle = '#f0ece2'; c.fillRect(i * t / 4 + t / 13, j * t / 3 + t / 11, t / 9, t / 12); }
};

const dessins: Record<Motif, (c: CanvasRenderingContext2D, t: number) => void> = {
  // Trottoir de la Corniche Est : pavés autobloquants clairs, rangs décalés.
  paves(c, t) {
    c.fillStyle = '#d5cec0'; c.fillRect(0, 0, t, t);
    const cote = t / 8;
    for (let ligne = 0; ligne < 8; ligne++) for (let col = -1; col < 9; col++) {
      c.fillStyle = ['#dad3c6', '#cfc7b8', '#e0dacd', '#d2cbbc'][Math.floor(alea() * 4)];
      c.fillRect(col * cote + (ligne % 2 ? cote / 2 : 0) + 1, ligne * cote + 1, cote - 2, cote - 2);
    }
    grain(c, t, 500, ['#c7bfb0', '#e4dfd3']);
  },
  // Chaussée bidirectionnelle : ligne axiale discontinue et lignes de rive.
  asphalte(c, t) {
    c.fillStyle = '#3a3d3f'; c.fillRect(0, 0, t, t);
    grain(c, t, 1200, ['#434648', '#2f3234', '#4a4d4f']);
    c.fillStyle = '#e6e0d0';
    c.fillRect(t * .49, t * .2, t * .022, t * .6);
    c.fillRect(t * .05, 0, t * .016, t); c.fillRect(t * .935, 0, t * .016, t);
  },
  sable(c, t) { c.fillStyle = '#e0cfa8'; c.fillRect(0, 0, t, t); grain(c, t, 1600, ['#d6c39a', '#e9daba', '#cbb891', '#f0e3c6']); },
  gazon(c, t) { c.fillStyle = '#6d8f4e'; c.fillRect(0, 0, t, t); grain(c, t, 1800, ['#628345', '#7b9d59', '#587a3e', '#86a663'], 3); },
  beton(c, t) {
    c.fillStyle = '#b3ac9e'; c.fillRect(0, 0, t, t);
    grain(c, t, 900, ['#aaa395', '#bdb6a8', '#a09989']);
    c.strokeStyle = '#9c9587'; c.lineWidth = 2;
    for (const p of [0, .5, 1]) { c.beginPath(); c.moveTo(p * t, 0); c.lineTo(p * t, t); c.moveTo(0, p * t); c.lineTo(t, p * t); c.stroke(); }
  },
  eau(c, t) {
    c.fillStyle = '#3f7f92'; c.fillRect(0, 0, t, t);
    for (let i = 0; i < 46; i++) { c.fillStyle = alea() > .5 ? '#4c92a4' : '#37727f'; c.fillRect(0, alea() * t, t, 1 + alea() * 3); }
    grain(c, t, 400, ['#5da2b0', '#336a77']);
  },
  // Piste cyclable et de mise en forme de la Corniche.
  piste(c, t) {
    c.fillStyle = '#ac5f3f'; c.fillRect(0, 0, t, t);
    grain(c, t, 900, ['#a2573a', '#b96b48', '#96502f']);
    c.fillStyle = '#efe7d5'; c.fillRect(t * .485, t * .25, t * .03, t * .5);
  },
  // Palais de la Marina : bandeaux vitrés bleutés à petits carrés blancs.
  vitrage(c, t) { verriere(c, t, '#2f5f88', '#27496a'); },
  vitrageSombre(c, t) { verriere(c, t, '#2c3134', '#232729'); },
  // Tambours du Palais des Congrès : parement clair nervuré verticalement.
  cannelures(c, t) {
    c.fillStyle = '#ece5d6'; c.fillRect(0, 0, t, t);
    for (let i = 0; i < 48; i++) { c.fillStyle = i % 2 ? '#e0d9c8' : '#f4efe3'; c.fillRect(i * t / 48, 0, t / 96, t); }
    grain(c, t, 200, ['#e6dfcf', '#f7f2e7']);
  },
  // Pylône de l’Étoile Rouge : béton clair cannelé et bandeaux de brique.
  pylone(c, t) {
    c.fillStyle = '#cec6b3'; c.fillRect(0, 0, t, t);
    for (let i = 0; i < 24; i++) { c.fillStyle = i % 2 ? '#c5bca8' : '#d7d0bf'; c.fillRect(i * t / 24, 0, t / 48, t); }
    for (const bande of [.1, .32, .54, .76]) {
      const y = bande * t, h = t * .075;
      c.fillStyle = '#a4614c'; c.fillRect(0, y, t, h);
      for (let l = 0; l < 3; l++) for (let brique = 0; brique < 10; brique++) {
        c.fillStyle = alea() > .5 ? '#b06d55' : '#985542';
        c.fillRect(brique * t / 10 + (l % 2 ? t / 20 : 0), y + l * h / 3, t / 10 - 2, h / 3 - 1);
      }
    }
    grain(c, t, 250, ['#c2b9a5', '#dcd5c5']);
  },
  claustra(c, t) {
    c.fillStyle = '#f1ece0'; c.fillRect(0, 0, t, t);
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { c.fillStyle = '#5d6b64'; c.fillRect(i * t / 8 + t / 34, j * t / 8 + t / 34, t / 8 - t / 17, t / 8 - t / 17); }
  },
  tole(c, t) {
    c.fillStyle = '#8c857a'; c.fillRect(0, 0, t, t);
    for (let i = 0; i < 32; i++) { c.fillStyle = i % 2 ? '#999287' : '#7b756b'; c.fillRect(i * t / 32, 0, t / 64, t); }
    grain(c, t, 400, ['#7a6f60', '#9d958a', '#6f6458']);
  },
  // Façades dessinées en tons neutres : la teinte du matériau colore les murs.
  immeuble(c, t) {
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, t, t);
    for (let etage = 0; etage < 4; etage++) {
      const y = t * .12 + etage * t * .23;
      c.fillStyle = '#efeae0'; c.fillRect(0, y - t * .035, t, t * .018);
      for (let i = 0; i < 4; i++) {
        const x = t * .09 + i * t * .23;
        c.fillStyle = '#4c5a5c'; c.fillRect(x, y, t * .145, t * .125);
        c.fillStyle = '#f8f5ec'; c.fillRect(x - t * .012, y - t * .014, t * .169, t * .014);
      }
    }
    grain(c, t, 250, ['#f3efe5', '#e7e1d5']);
  },
  boutique(c, t) {
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, t, t);
    c.fillStyle = '#ded8cb'; c.fillRect(0, 0, t, t * .2);
    c.fillStyle = '#8f8a7d'; c.fillRect(t * .07, t * .05, t * .86, t * .09);
    for (let i = 0; i < 9; i++) { c.fillStyle = i % 2 ? '#f0eadd' : '#c8c1b2'; c.fillRect(i * t / 9, t * .21, t / 9, t * .06); }
    c.fillStyle = '#4c5a5c'; c.fillRect(t * .08, t * .38, t * .32, t * .42); c.fillRect(t * .62, t * .35, t * .25, t * .5);
    grain(c, t, 240, ['#f1ede0', '#e3ddce']);
  },
  drapeau(c, t) {
    c.fillStyle = '#008751'; c.fillRect(0, 0, t * .38, t);
    c.fillStyle = '#fcd116'; c.fillRect(t * .38, 0, t * .62, t / 2);
    c.fillStyle = '#e8112d'; c.fillRect(t * .38, t / 2, t * .62, t / 2);
  },
  // Butte rocheuse au pied de l’Amazone.
  roche(c, t) {
    c.fillStyle = '#a89a83'; c.fillRect(0, 0, t, t);
    for (let i = 0; i < 100; i++) {
      c.fillStyle = ['#b6a992', '#9a8c76', '#c2b6a0', '#8d8070'][Math.floor(alea() * 4)];
      const w = t * .09 + alea() * t * .17; c.fillRect(alea() * t, alea() * t, w, w * .7);
    }
  },
};

export class Batisseur {
  private readonly geos = new Map<string, T.BufferGeometry>();
  private readonly mats = new Map<string, T.MeshStandardMaterial>();
  private readonly toiles = new Map<Motif, HTMLCanvasElement>();
  /** Ensembles construits en code qu’un modèle GLB détaillé peut venir remplacer. */
  readonly groupes = new Map<string, T.Group>();
  private cible: T.Object3D | null = null;
  /** Là où atterrit ce qui est bâti : l’ensemble en cours, sinon la scène. */
  get racine(): T.Object3D { return this.cible ?? this.scene; }

  constructor(readonly scene: T.Object3D, readonly obstacles: {x: number; z: number; w: number; d: number}[]) {}

  /**
   * Bâtit un ensemble nommé : tout ce que produit `contenu` y est rangé, et
   * l’ensemble peut ensuite être masqué d’un coup au profit d’un modèle détaillé.
   */
  ensemble(nom: string, contenu: () => void) {
    const g = new T.Group(); this.racine.add(g); this.groupes.set(nom, g);
    const precedent = this.cible; this.cible = g;
    try { contenu(); } finally { this.cible = precedent; }
    return g;
  }
  private geo<G extends T.BufferGeometry>(cle: string, fabrique: () => G): G {
    if (!this.geos.has(cle)) this.geos.set(cle, fabrique());
    return this.geos.get(cle) as G;
  }
  /** Matière unie. */
  mat(couleur: string, o: {rugosite?: number; metal?: number; transparent?: number; face2?: boolean} = {}) {
    const cle = `u${couleur}|${o.rugosite}|${o.metal}|${o.transparent}|${o.face2}`;
    if (!this.mats.has(cle)) this.mats.set(cle, new T.MeshStandardMaterial({
      color: couleur, roughness: o.rugosite ?? .85, metalness: o.metal ?? 0,
      transparent: o.transparent !== undefined, opacity: o.transparent ?? 1,
      side: o.face2 ? T.DoubleSide : T.FrontSide,
    }));
    return this.mats.get(cle)!;
  }
  /** Matière texturée : le motif est dessiné une fois puis répété rx × ry fois. */
  tex(motif: Motif, rx = 1, ry = 1, teinte = '#ffffff', o: {rugosite?: number; metal?: number; face2?: boolean} = {}) {
    const cle = `t${motif}|${rx}|${ry}|${teinte}|${o.metal}`;
    if (!this.mats.has(cle)) {
      if (!this.toiles.has(motif)) {
        const toile = document.createElement('canvas'); toile.width = toile.height = 256;
        graine = 1; dessins[motif](toile.getContext('2d')!, 256);
        this.toiles.set(motif, toile);
      }
      const carte = new T.CanvasTexture(this.toiles.get(motif)!);
      carte.colorSpace = T.SRGBColorSpace; carte.wrapS = carte.wrapT = T.RepeatWrapping;
      carte.repeat.set(rx, ry); carte.anisotropy = 4;
      this.mats.set(cle, new T.MeshStandardMaterial({
        map: carte, color: teinte, roughness: o.rugosite ?? .82, metalness: o.metal ?? 0,
        side: o.face2 ? T.DoubleSide : T.FrontSide,
      }));
    }
    return this.mats.get(cle)!;
  }
  private matiere(c: string | T.Material) { return typeof c === 'string' ? this.mat(c) : c; }
  maillage(g: T.BufferGeometry, c: string | T.Material, x: number, y: number, z: number, parent?: T.Object3D) {
    const m = new T.Mesh(g, this.matiere(c));
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
    (parent ?? this.racine).add(m); return m;
  }
  boite(w: number, h: number, d: number, c: string | T.Material, x: number, y: number, z: number, parent?: T.Object3D) {
    return this.maillage(this.geo(`b${w},${h},${d}`, () => new T.BoxGeometry(w, h, d)), c, x, y, z, parent);
  }
  cyl(rHaut: number, rBas: number, h: number, seg: number, c: string | T.Material, x: number, y: number, z: number, parent?: T.Object3D, ouvert = false) {
    return this.maillage(this.geo(`c${rHaut},${rBas},${h},${seg},${ouvert}`, () => new T.CylinderGeometry(rHaut, rBas, h, seg, 1, ouvert)), c, x, y, z, parent);
  }
  sphere(r: number, c: string | T.Material, x: number, y: number, z: number, parent?: T.Object3D) {
    return this.maillage(this.geo(`s${r}`, () => new T.SphereGeometry(r, 12, 9)), c, x, y, z, parent);
  }
  cone(r: number, h: number, seg: number, c: string | T.Material, x: number, y: number, z: number, parent?: T.Object3D) {
    return this.maillage(this.geo(`k${r},${h},${seg}`, () => new T.ConeGeometry(r, h, seg)), c, x, y, z, parent);
  }
  /** Anneau plat, utilisé pour la chaussée circulaire de l’Étoile Rouge. */
  anneau(rInt: number, rExt: number, c: string | T.Material, x: number, y: number, z: number, depart = 0, longueur = Math.PI * 2) {
    const m = this.maillage(this.geo(`a${rInt},${rExt},${depart},${longueur}`, () => {
      const g = new T.RingGeometry(rInt, rExt, 48, 1, depart, longueur); g.rotateX(-Math.PI / 2); return g;
    }), c, x, y, z);
    m.castShadow = false; return m;
  }
  /** Étoile à cinq branches extrudée vers le haut, base à la hauteur donnée. */
  etoile(rExt: number, rInt: number, epaisseur: number, c: string | T.Material, x: number, y: number, z: number) {
    return this.maillage(this.geo(`e${rExt},${rInt},${epaisseur}`, () => {
      const forme = new T.Shape();
      for (let i = 0; i < 10; i++) {
        const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? rInt : rExt;
        const px = Math.cos(a) * r, py = Math.sin(a) * r;
        i ? forme.lineTo(px, py) : forme.moveTo(px, py);
      }
      forme.closePath();
      const g = new T.ExtrudeGeometry(forme, {depth: epaisseur, bevelEnabled: false});
      g.rotateX(-Math.PI / 2); return g;
    }), c, x, y, z);
  }
  /** Plaque de sol : ne projette pas d’ombre, en reçoit une. */
  sol(w: number, d: number, c: string | T.Material, x: number, z: number, y = 0) {
    const m = this.boite(w, .3, d, c, x, y - .15, z); m.castShadow = false; return m;
  }
  /** Câble ou hauban tendu entre deux points. */
  cable(a: [number, number, number], b: [number, number, number], r: number, c: string | T.Material, parent?: T.Object3D) {
    const debut = new T.Vector3(...a), direction = new T.Vector3(...b).sub(debut);
    const m = this.cyl(r, r, direction.length(), 5, c, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, parent);
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), direction.normalize());
    m.castShadow = false; return m;
  }
  obstacle(x: number, z: number, w: number, d: number) { this.obstacles.push({x, z, w, d}); }

  /** Panneau lisible à distance, servant de repère d’interaction. */
  panneau(texte: string, x: number, y: number, z: number, largeur = 6) {
    const toile = document.createElement('canvas'); toile.width = 768; toile.height = 128;
    const c = toile.getContext('2d')!;
    c.fillStyle = '#173e37'; c.beginPath(); c.roundRect(0, 0, 768, 128, 28); c.fill();
    c.fillStyle = '#fff8e9'; c.font = '600 34px sans-serif'; c.textAlign = 'center'; c.fillText(texte, 384, 77);
    const carte = new T.CanvasTexture(toile); carte.colorSpace = T.SRGBColorSpace;
    const sprite = new T.Sprite(new T.SpriteMaterial({map: carte, toneMapped: false}));
    sprite.position.set(x, y, z); sprite.scale.set(largeur, largeur / 6, 1); this.racine.add(sprite);
    return sprite;
  }

  /** Palmes d’un seul tenant : une géométrie réutilisée par tous les palmiers. */
  private frondaison(nb: number, longueur: number, chute: number, largeur: number) {
    return this.geo(`f${nb},${longueur},${chute},${largeur}`, () => {
      const positions: number[] = [], indices: number[] = [], seg = 5;
      let base = 0;
      for (let palme = 0; palme < nb; palme++) {
        const a = palme * Math.PI * 2 / nb, dx = Math.cos(a), dz = Math.sin(a);
        for (let s = 0; s <= seg; s++) {
          const u = s / seg, r = u * longueur, y = u * 1.15 * longueur / 4 - u * u * chute;
          const l = largeur * Math.sin(u * Math.PI);
          positions.push(dx * r - dz * l, y, dz * r + dx * l, dx * r + dz * l, y, dz * r - dx * l);
        }
        for (let s = 0; s < seg; s++) { const i0 = base + s * 2; indices.push(i0, i0 + 1, i0 + 2, i0 + 1, i0 + 3, i0 + 2); }
        base += (seg + 1) * 2;
      }
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
      g.setIndex(indices); g.computeVertexNormals(); return g;
    });
  }
  /** Cocotier de la Corniche : tronc légèrement penché, palmes retombantes, noix. */
  cocotier(x: number, z: number, fosse = true) {
    const v = varie(x, z), h = 8 + v * 3.5;
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = v * 6.3; this.racine.add(g);
    const tronc = this.cyl(.19, .3, h, 8, '#9e8865', 0, h / 2, 0, g);
    tronc.rotation.z = (v - .5) * .16;
    this.maillage(this.frondaison(9, 3.7, 2.5, .42), this.mat('#4b7d4a', {face2: true}), (v - .5) * .5, h - .1, 0, g);
    this.sphere(.22, '#7d9440', .1, h - .55, .14, g).scale.set(1.4, .75, 1.4);
    if (fosse) { const f = this.boite(1.7, .1, 1.7, '#8d8677', 0, .06, 0, g); f.castShadow = false; }
    this.obstacle(x, z, 1, 1);
    return g;
  }
  /** Palmier royal des jardins de la Présidence : tronc clair et couronne dense. */
  palmierRoyal(x: number, z: number) {
    const h = 11 + varie(x, z) * 2;
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = varie(z, x) * 6.3; this.racine.add(g);
    this.cyl(.28, .42, h, 8, '#b9b1a0', 0, h / 2, 0, g);
    this.maillage(this.frondaison(11, 3.2, 2.9, .36), this.mat('#39663d', {face2: true}), 0, h - .1, 0, g);
    return g;
  }
  /** Arbre à couronne étalée des places de Cotonou. */
  arbre(x: number, z: number, echelle = 1) {
    const v = varie(x, z);
    const g = new T.Group(); g.position.set(x, 0, z); g.scale.setScalar(echelle * (.85 + v * .35)); this.racine.add(g);
    this.cyl(.4, .6, 4, 7, '#7d6a53', 0, 2, 0, g);
    const feuillage = this.mat('#3f6b3c');
    this.sphere(3.4, feuillage, 0, 5.1, 0, g).scale.set(1.25, .5, 1.25);
    this.sphere(2.5, feuillage, 1.4, 6, -.8, g).scale.set(1.15, .55, 1.15);
    this.obstacle(x, z, 1.2, 1.2);
    return g;
  }
  /** Lampadaire à double crosse de la Corniche Est. */
  lampadaireDouble(x: number, z: number) {
    const g = new T.Group(); g.position.set(x, 0, z); this.racine.add(g);
    this.cyl(.11, .17, 9, 8, '#9aa0a2', 0, 4.5, 0, g);
    this.boite(3.4, .12, .12, '#9aa0a2', 0, 8.95, 0, g);
    for (const dx of [-1.5, 1.5]) this.boite(.75, .16, .34, '#e7e3d6', dx, 8.8, 0, g);
    return g;
  }
  /** Lampadaire simple du boulevard. */
  lampadaireSimple(x: number, z: number, sens = 1) {
    const g = new T.Group(); g.position.set(x, 0, z); this.racine.add(g);
    this.cyl(.1, .15, 8, 8, '#5d6360', 0, 4, 0, g);
    this.boite(1.8, .12, .12, '#5d6360', sens * .9, 7.95, 0, g);
    this.boite(.8, .16, .3, '#f0ebda', sens * 1.7, 7.82, 0, g);
    return g;
  }
  /** Lanterne à globe des allées de la Présidence. */
  lanterneGlobe(x: number, z: number) {
    const g = new T.Group(); g.position.set(x, 0, z); this.racine.add(g);
    this.cyl(.08, .13, 4.4, 8, '#2b2f2e', 0, 2.2, 0, g);
    this.sphere(.34, '#f6f1e0', 0, 4.6, 0, g);
    this.cone(.3, .3, 8, '#2b2f2e', 0, 4.95, 0, g);
    return g;
  }
  /** Mât d’éclairage en treillis des grandes places. */
  matEclairage(x: number, z: number) {
    const g = new T.Group(); g.position.set(x, 0, z); this.racine.add(g);
    const acier = this.mat('#b0b4b0'), rayon = .58;
    for (let i = 0; i < 3; i++) {
      const a = i * 2.094;
      const jambe = this.cyl(.055, .085, 18, 6, acier, Math.cos(a) * rayon, 9, Math.sin(a) * rayon, g);
      jambe.rotation.set(Math.sin(a) * .014, 0, -Math.cos(a) * .014);
    }
    for (let y = 2; y < 18; y += 3.2)
      this.maillage(this.geo(`tr${rayon}`, () => new T.TorusGeometry(rayon, .035, 4, 3)), acier, 0, y, 0, g).rotation.x = Math.PI / 2;
    this.boite(1.7, .22, .5, acier, 0, 18.3, 0, g);
    for (const dx of [-.5, .5]) this.boite(.62, .48, .34, '#33383a', dx, 18.7, 0, g).rotation.x = .38;
    this.obstacle(x, z, 1.2, 1.2);
    return g;
  }
  /** Drapeau du Bénin sur mât. */
  drapeauBenin(x: number, z: number, h = 9) {
    const g = new T.Group(); g.position.set(x, 0, z); this.racine.add(g);
    this.cyl(.07, .1, h, 8, '#e8e4d6', 0, h / 2, 0, g);
    const toile = this.maillage(this.geo('pl2.2,1.4', () => new T.PlaneGeometry(2.2, 1.4)), this.tex('drapeau', 1, 1, '#ffffff', {face2: true}), 0, h - 1.1, 1.15, g);
    toile.rotation.y = -Math.PI / 2; toile.castShadow = false;
    return g;
  }
  /** Bloc rocheux irregulier, oriente au hasard mais de facon reproductible. */
  rocher(x: number, y: number, z: number, rayon: number, c: string | T.Material, parent?: T.Object3D) {
    const m = this.maillage(this.geo(`i${rayon}`, () => new T.IcosahedronGeometry(rayon, 0)), c, x, y, z, parent);
    m.rotation.set(varie(x, z) * 3, varie(z, x) * 3, varie(rayon, x) * 3);
    m.scale.set(1, .62 + varie(x, y) * .45, 1.12);
    return m;
  }
  haie(x: number, z: number, w: number, d: number, h = .8) {
    const m = this.boite(w, h, d, '#4f7a3c', x, h / 2, z); return m;
  }
}
