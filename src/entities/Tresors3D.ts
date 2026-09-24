import * as T from 'three';
import type { Forme } from '../content/tresors';

/**
 * Objets de la chasse au trésor : le trésor de l'étape en cours flotte au-dessus
 * d'un anneau doré, dans une colonne de lumière visible de loin ; l'autel de
 * l'Amazone s'allume quand le joueur porte un trésor. Les objets sont modelés
 * en code d'après des objets courants au Bénin : cauri, pagne tissé, masque
 * guèlèdè, calebasse gravée, houe de cultivateur.
 */
export class Tresors3D {
  private readonly tresor = new T.Group();
  private readonly objet = new T.Group();
  private readonly autel = new T.Group();
  private readonly objetPorte = new T.Group();
  private temps = 0;

  constructor(scene: T.Object3D, autel: {x: number; z: number}) {
    this.tresor.name = 'tresor-chasse'; this.tresor.visible = false;
    this.tresor.add(this.objet, Tresors3D.colonne('#ffd37a', .55), Tresors3D.anneau('#f3b94f', .75, 1.05));
    scene.add(this.tresor);
    this.autel.name = 'autel-amazone'; this.autel.position.set(autel.x, 0, autel.z); this.autel.visible = false;
    const pierre = new T.Mesh(new T.CylinderGeometry(1.1, 1.3, .55, 24), new T.MeshStandardMaterial({color: '#3b3a36', roughness: .6}));
    pierre.position.y = .27; pierre.castShadow = true; pierre.receiveShadow = true;
    this.autel.add(pierre, Tresors3D.colonne('#9fe3ff', .7), Tresors3D.anneau('#9fe3ff', 1.5, 1.9));
    scene.add(this.autel);
    this.objetPorte.name = 'tresor-porte'; this.objetPorte.visible = false; scene.add(this.objetPorte);
  }

  /** Colonne de lumière additive, haute de trente mètres. */
  private static colonne(couleur: string, rayon: number) {
    const m = new T.Mesh(new T.CylinderGeometry(rayon, rayon * 1.4, 30, 20, 1, true),
      new T.MeshBasicMaterial({color: couleur, transparent: true, opacity: .2, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false}));
    m.position.y = 15; m.name = 'colonne'; m.renderOrder = 5;
    return m;
  }
  private static anneau(couleur: string, rInt: number, rExt: number) {
    const g = new T.RingGeometry(rInt, rExt, 40); g.rotateX(-Math.PI / 2);
    const m = new T.Mesh(g, new T.MeshBasicMaterial({color: couleur, transparent: true, opacity: .85, depthWrite: false}));
    m.position.y = .06; m.name = 'anneau';
    return m;
  }

  private static modele(forme: Forme) {
    const g = new T.Group(), mat = (c: string, o: T.MeshStandardMaterialParameters = {}) => new T.MeshStandardMaterial({color: c, roughness: .6, emissive: c, emissiveIntensity: .12, ...o});
    const ajouter = (geo: T.BufferGeometry, m: T.Material, x = 0, y = 0, z = 0) => { const mesh = new T.Mesh(geo, m); mesh.position.set(x, y, z); mesh.castShadow = true; g.add(mesh); return mesh; };
    if (forme === 'cauri') {
      ajouter(new T.SphereGeometry(.34, 20, 14), mat('#f4ecd8', {roughness: .25})).scale.set(1, .6, .72);
      ajouter(new T.BoxGeometry(.5, .04, .06), mat('#6d5a3f'), 0, .19, 0);
      for (let i = -2; i <= 2; i++) ajouter(new T.BoxGeometry(.02, .04, .12), mat('#8a7658'), i * .08, .19, 0);
    } else if (forme === 'pagne') {
      const toile = document.createElement('canvas'); toile.width = toile.height = 128; const c = toile.getContext('2d')!;
      // Motif de tissage à bandes, façon kente : or, vert, rouge et noir.
      const couleurs = ['#e0a32e', '#1f6b3a', '#b3272d', '#1d1b18', '#e0a32e', '#2c4f9e'];
      for (let i = 0; i < 16; i++) { c.fillStyle = couleurs[i % couleurs.length]; c.fillRect(i * 8, 0, 8, 128); }
      for (let j = 0; j < 8; j++) { c.fillStyle = j % 2 ? '#f0d58a' : '#1d1b18'; c.fillRect(0, j * 16 + 6, 128, 3); }
      const carte = new T.CanvasTexture(toile); carte.colorSpace = T.SRGBColorSpace;
      const tissu = new T.MeshStandardMaterial({map: carte, roughness: .9, emissive: '#553311', emissiveIntensity: .15});
      for (let i = 0; i < 3; i++) ajouter(new T.BoxGeometry(.72 - i * .04, .08, .5), tissu, 0, i * .085, 0);
    } else if (forme === 'masque') {
      const bois = mat('#6e4526', {roughness: .75});
      ajouter(new T.SphereGeometry(.3, 18, 14), bois).scale.set(.85, 1.1, .7);
      ajouter(new T.BoxGeometry(.72, .1, .5), mat('#c8443a'), 0, .36, 0);             // plateau peint du guèlèdè
      ajouter(new T.CylinderGeometry(.05, .05, .22, 8), mat('#e3c25a'), 0, .5, 0);
      for (const dx of [-.1, .1]) ajouter(new T.BoxGeometry(.1, .04, .04), mat('#f3efe4'), dx, .06, .2);
      ajouter(new T.BoxGeometry(.05, .12, .05), bois, 0, -.04, .23);
    } else if (forme === 'calebasse') {
      const coque = new T.SphereGeometry(.36, 22, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
      ajouter(coque, mat('#c9853c', {side: T.DoubleSide}), 0, .36, 0).rotation.x = 0;
      ajouter(new T.TorusGeometry(.34, .02, 6, 30), mat('#6b3b1c'), 0, .36, 0).rotation.x = Math.PI / 2;
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ajouter(new T.BoxGeometry(.03, .16, .02), mat('#6b3b1c'), Math.cos(a) * .3, .22, Math.sin(a) * .3).rotation.y = -a; }
    } else {
      ajouter(new T.CylinderGeometry(.035, .04, 1.1, 8), mat('#7a5634'), 0, 0, 0).rotation.z = .5;
      const lame = ajouter(new T.BoxGeometry(.34, .24, .04), mat('#8d6a3f', {metalness: .7, roughness: .35}), -.3, .5, 0);
      lame.rotation.z = .5;
    }
    return g;
  }

  /** Montre le trésor de l'étape à sa place, ou le cache. */
  montrer(forme: Forme | null, x = 0, z = 0) {
    this.objet.clear();
    this.tresor.visible = !!forme;
    if (!forme) return;
    this.objet.add(Tresors3D.modele(forme)); this.objet.scale.setScalar(1.35);
    this.tresor.position.set(x, 0, z);
    this.objetPorte.clear(); this.objetPorte.add(Tresors3D.modele(forme)); this.objetPorte.scale.setScalar(.7);
  }
  /** Le joueur porte le trésor : il flotte au-dessus de son épaule, l'autel s'allume. */
  porter(porte: boolean) { this.objetPorte.visible = porte; this.autel.visible = porte; if (porte) this.tresor.visible = false; }
  actualiser(dt: number, joueur: T.Object3D) {
    this.temps += dt;
    this.objet.position.y = 1.2 + Math.sin(this.temps * 2.2) * .12;
    this.objet.rotation.y += dt * 1.4;
    for (const g of [this.tresor, this.autel]) {
      const colonne = g.getObjectByName('colonne') as T.Mesh | undefined;
      if (colonne) (colonne.material as T.MeshBasicMaterial).opacity = .16 + .08 * Math.sin(this.temps * 2.6);
      const anneau = g.getObjectByName('anneau');
      if (anneau) anneau.scale.setScalar(1 + .06 * Math.sin(this.temps * 3));
    }
    if (this.objetPorte.visible) {
      this.objetPorte.position.set(joueur.position.x + .45, 2.35 + Math.sin(this.temps * 3) * .06, joueur.position.z);
      this.objetPorte.rotation.y += dt * 2;
    }
  }
}
