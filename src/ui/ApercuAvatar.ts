import * as T from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { teinterCorps } from '../entities/Teinte';
import type { CorpsJoueur } from '../entities/Foule';

/** Les deux avatars humains proposés au départ. */
export const AVATARS: Record<'homme'|'femme', CorpsJoueur> = {homme: 'personnage1.glb', femme: 'go2.glb'};

/**
 * Aperçu du créateur de personnage : les deux avatars humains du jeu, rendus en
 * 3D plutôt que dessinés en formes CSS. Ce sont les modèles que le joueur
 * incarnera vraiment, teintés par le même code que dans la ville — la peau et
 * les vêtements choisis ici sont donc exactement ceux de la balade.
 *
 * Les formes construites en CSS restent dans la page derrière cet aperçu et ne
 * réapparaissent que si le rendu ou les modèles font défaut, comme partout
 * ailleurs dans la scène.
 */
export class ApercuAvatar {
  private readonly scene = new T.Scene();
  private readonly camera = new T.PerspectiveCamera(30, .72, .05, 40);
  private readonly rendu: T.WebGLRenderer;
  /** Plateau tournant : l’avatar s’y pose, et c’est lui qui pivote sous une lumière fixe. */
  private readonly plateau = new T.Group();
  private readonly avatars = new Map<string, T.Object3D>();
  private readonly horloge = new T.Clock();
  private corps?: T.Object3D;
  private image = 0;
  private temps = 0;
  private apparence = '';

  constructor(private readonly hote: HTMLElement) {
    this.rendu = new T.WebGLRenderer({antialias: true, alpha: true});
    this.rendu.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.rendu.outputColorSpace = T.SRGBColorSpace;
    this.rendu.toneMapping = T.ACESFilmicToneMapping;
    this.rendu.toneMappingExposure = 1.05;
    this.rendu.domElement.setAttribute('aria-hidden', 'true');
    hote.append(this.rendu.domElement);
    // Lumière de studio : une clé chaude devant, un contre-jour froid derrière.
    const cle = new T.DirectionalLight('#fff3da', 2.4); cle.position.set(2.2, 3.4, 3.1);
    const contre = new T.DirectionalLight('#cfe3dd', .9); contre.position.set(-2.6, 1.7, -2.3);
    this.scene.add(this.plateau, new T.HemisphereLight('#fff6e2', '#6f9184', 2), cle, contre);
    this.plateau.add(this.ombreAuSol());
    this.camera.position.set(0, 1.12, 3.85);
    this.camera.lookAt(0, .95, 0);
    new ResizeObserver(() => this.redimensionner()).observe(hote);
    this.redimensionner();
  }

  /**
   * Charge les deux avatars. Renvoie faux si aucun n’arrive : l’appelant garde
   * alors la silhouette dessinée en CSS.
   */
  async charger(base = '/modeles/') {
    const integres = (globalThis as {__modeles?: Record<string, string>}).__modeles;
    const chargeur = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    await Promise.all(Object.values(AVATARS).map(async nom => {
      try {
        const lot = await chargeur.loadAsync(integres?.[nom] ?? base + nom);
        this.avatars.set(nom, this.poser(lot.scene));
      } catch (erreur) {
        console.warn(`aperçu ${nom} indisponible : ${erreur instanceof Error ? erreur.message : erreur}`);
      }
    }));
    return this.avatars.size > 0;
  }

  /** Montre un avatar avec la peau et les vêtements demandés. */
  montrer(fichier: string, vetements: string, peau: string) {
    const choix = this.avatars.get(fichier);
    if (!choix) return false;
    if (choix !== this.corps) {this.corps?.removeFromParent(); this.corps = choix; this.plateau.add(choix); this.apparence = '';}
    const apparence = `${fichier}|${vetements}|${peau}`;
    if (apparence !== this.apparence) {this.apparence = apparence; teinterCorps(choix, peau, vetements);}
    this.dessiner();
    return true;
  }

  /** Anime l’aperçu. À n’appeler que pendant que le créateur est ouvert. */
  demarrer() {
    if (this.image) return;
    this.horloge.getDelta();
    const boucle = () => {this.image = requestAnimationFrame(boucle); this.animer(this.horloge.getDelta());};
    this.image = requestAnimationFrame(boucle);
  }
  arreter() {
    if (this.image) cancelAnimationFrame(this.image);
    this.image = 0;
  }

  /**
   * Même balancement retenu qu’en ville — ces modèles n’ont pas de squelette —
   * plus un lent quart de tour qui montre la tenue sous tous ses angles.
   */
  private animer(dt: number) {
    this.temps += dt;
    this.plateau.rotation.y = Math.sin(this.temps * .42) * .55;
    if (this.corps) {
      this.corps.position.y = Math.abs(Math.sin(this.temps * 1.15)) * .012;
      this.corps.rotation.z = Math.sin(this.temps * 1.15) * .011;
    }
    this.dessiner();
  }
  private dessiner() {this.rendu.render(this.scene, this.camera);}

  /** Met le modèle à taille humaine, pieds au sol et centré sur le plateau. */
  private poser(objet: T.Object3D) {
    const boite = new T.Box3().setFromObject(objet), centre = boite.getCenter(new T.Vector3());
    const echelle = 1.74 / (boite.max.y - boite.min.y || 1);
    objet.scale.setScalar(echelle);
    // L’origine de ces scans est au centre du corps : sans compensation, la
    // silhouette s’enfonce dans le sol ou sort du cadre.
    objet.position.set(-centre.x * echelle, -boite.min.y * echelle, -centre.z * echelle);
    const socle = new T.Group(); socle.add(objet); return socle;
  }

  /** Halo peint sous les pieds : il pose la figure sans coûter une carte d’ombres. */
  private ombreAuSol() {
    const toile = document.createElement('canvas'); toile.width = toile.height = 128;
    const ctx = toile.getContext('2d')!;
    const halo = ctx.createRadialGradient(64, 64, 3, 64, 64, 62);
    halo.addColorStop(0, 'rgba(25,62,53,.4)'); halo.addColorStop(1, 'rgba(25,62,53,0)');
    ctx.fillStyle = halo; ctx.fillRect(0, 0, 128, 128);
    const texture = new T.CanvasTexture(toile); texture.colorSpace = T.SRGBColorSpace;
    const tapis = new T.Mesh(new T.PlaneGeometry(1.4, 1.4), new T.MeshBasicMaterial({map: texture, transparent: true, depthWrite: false}));
    tapis.rotation.x = -Math.PI / 2; tapis.position.y = .002;
    return tapis;
  }

  private redimensionner() {
    const largeur = this.hote.clientWidth, hauteur = this.hote.clientHeight;
    if (!largeur || !hauteur) return;
    // La taille est posée sur le canevas lui-même : l’aperçu tient sa place même
    // si la feuille de style n’est pas là.
    this.rendu.setSize(largeur, hauteur);
    this.camera.aspect = largeur / hauteur;
    this.camera.updateProjectionMatrix();
    this.dessiner();
  }
}
