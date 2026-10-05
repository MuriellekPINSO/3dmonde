import * as T from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as clonerSquelette } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { Personnage } from './Joueur';
import { versHsl, depuisHsl, teinterCorps, libererApparence } from './Teinte';
import { transfererAnimation, poserAssis, reglerFoulee } from './Transfert';

/**
 * Habille la scène de personnages articulés : deux personnages Tripo, une
 * sportive et un homme en polo, chacun avec son squelette et sa marche. Le
 * joueur incarne l'un ou l'autre ; la foule les porte tous deux, déclinés en
 * plusieurs tenues en reteignant le haut, puis clonés pour chaque silhouette
 * construite en code, qu'ils remplacent.
 *
 * L’animation est choisie d’après le déplacement réellement observé : nul besoin
 * de savoir qui marche et qui attend, la scène le dit d’elle-même.
 */
export const AVATARS = {homme: 'avatar-homme-casual.glb', femme: 'avatar-femme-fitness.glb'} as const;
export type CorpsJoueur = typeof AVATARS[keyof typeof AVATARS];
/** Taille des figurants : la sportive un peu plus petite que l'homme. */
const TAILLES: Record<string, number> = {[AVATARS.femme]: 1.64, [AVATARS.homme]: 1.76};
/**
 * Hauts de la foule : la première tenue garde la couleur du modèle — t-shirt
 * taupe de la sportive, polo marine de l'homme —, les autres la reteignent.
 */
const HAUTS = ['', '#9c4058', '#287b72', '#c8922e', '#365f8c'];

type Habitant = {
  personnage: Personnage;
  corps: T.Object3D;
  mixeur: T.AnimationMixer;
  marche: T.AnimationAction;
  course?: T.AnimationAction;
  precedent: T.Vector3;
  /** Silhouette sans squelette : balancement au lieu d’une vraie marche. */
  fige?: boolean;
  balancement?: number;
  reposY?: number;
  /** Temps restant d'affichage d'un mot dit dans la bulle. */
  bulleTemps?: number;
  /** Renversé : durée écoulée depuis la chute, et place où il est tombé. */
  chute?: number;
  placeChute?: T.Vector3;
  reaction?: 'salut'|'peur';
  reactionTemps?: number;
  reactionCooldown?: number;
  reactionCible?: T.Vector3;
  bulle?:T.Sprite;
  /**
   * Allure de l'animation : vitesse à laquelle le pied d'appui reste fixe au
   * sol, en marche et en course, et instant du cycle où les pieds se croisent,
   * qui sert de pose d'arrêt. En dessous ou au-dessus, les pieds glissent.
   */
  pas?: Pas;
};
/** `bascule` : vitesses entre lesquelles la course prend le relais de la marche. */
type Pas = {marche: number; course: number; neutre: number; bascule?: [number, number]};
/**
 * Allure des clips Tripo une fois réglés par `reglerFoulee` — cadence doublée
 * pour la marche, ×2,4 pour la course, foulée allongée —, mesurée pour un corps
 * de 1,74 m : 0,58 et 1,13 m/s. Leur pose d'arrêt est le début du cycle, pieds
 * joints. La course ne prend le relais qu'au-delà de 2,5 m/s : la marche du
 * joueur, à 2,3 m/s, reste une marche aux pas pressés.
 */
const ALLURE_TRIPO: Pas = {marche: .58, course: 1.13, neutre: 0, bascule: [2.5, 3.1]};
/** Allure ramenée à la taille du personnage. */
const allure = (hauteur: number, base = ALLURE_TRIPO): Pas => ({...base, marche: base.marche * hauteur / 1.74, course: base.course * hauteur / 1.74});
/** Réglage des marches Tripo : cadence, puis amplitude des membres et de la hanche. */
const FOULEE_MARCHE = [2, 1.5, 2.2] as const, FOULEE_COURSE = [2.4, 1.4, 2.2] as const;

/**
 * Le modèle léger marcheur.glb, sculpté mains sur les hanches avec un pan de
 * jupe qui s'étire à chaque pas, ne sert plus que de secours si les personnages
 * Tripo manquent.
 */

export class Foule {
  private modele?: T.Object3D;
  private clipMarche?: T.AnimationClip;
  private clipCourse?: T.AnimationClip;
  private hauteurModele = 1.78;
  private baseModele = 0;
  private centreXModele = 0;
  private centreZModele = 0;
  private readonly habitants: Habitant[] = [];
  private joueur?: Habitant;
  private static readonly DUREE_CHUTE = 3.4;
  /** Hauteur du bassin d'un passager assis sur la selle du zémidjan détaillé. */
  private static readonly SELLE = .98;
  private readonly matieres = new Map<string, T.Material>();
  private source?: CanvasImageSource;
  private matiereOrigine?: T.MeshStandardMaterial;
  private readonly debout = new Map<string, T.Object3D>();
  /** Clips des personnages Tripo, réglés une fois pour toutes au chargement. */
  private readonly clipsAvatar = new Map<string, {marche?:T.AnimationClip;course?:T.AnimationClip}>();
  /** Figurants déjà teints, clonés ensuite : une seule teinture par tenue. */
  private readonly tenues: {corps: T.Object3D; avatar: CorpsJoueur}[] = [];
  private tenueSuivante = 0;
  /**
   * Silhouette à donner au joueur. Les avatars portent leur propre squelette et
   * leur marche ; une silhouette sans os reçoit, faute de mieux, un léger
   * balancement.
   */
  corpsJoueur: string | null = AVATARS.homme;
  private couleurJoueur='#f3b94f';
  private peauJoueur='#79513b';
  /** Vide : les chaussures du scan sont gardées telles quelles. */
  private chaussuresJoueur='';
  private temps=0;

  constructor(private readonly scene: T.Object3D) {}

  private creerBulle(){
    const toile=document.createElement('canvas');toile.width=160;toile.height=80;const c=toile.getContext('2d')!;
    c.fillStyle='rgba(255,250,235,.92)';c.beginPath();c.roundRect(8,8,144,52,22);c.fill();c.fillStyle='#21473d';c.font='bold 30px sans-serif';c.textAlign='center';c.fillText('…',80,46);
    const texture=new T.CanvasTexture(toile);texture.colorSpace=T.SRGBColorSpace;
    const bulle=new T.Sprite(new T.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));bulle.name='discussion-pnj';bulle.scale.set(1.15,.58,1);bulle.position.set(0,2.35,0);bulle.visible=false;return bulle;
  }

  /** Salutations du quotidien béninois, tirées au fil des rencontres. */
  private static readonly SALUTATIONS=['Bonjour !','Ça va ?','Yovo !','Bienvenue !','Bon maténé !','La forme ?'];
  /** Écrit le mot demandé dans la bulle du personnage et l'affiche un moment. */
  private dire(h:Habitant,texte:string){
    if(!h.bulle)return;
    const carte=(h.bulle.material as T.SpriteMaterial).map;if(!carte)return;
    const toile=carte.image as HTMLCanvasElement,c=toile.getContext('2d')!;
    c.clearRect(0,0,toile.width,toile.height);
    c.fillStyle='rgba(255,250,235,.92)';c.beginPath();c.roundRect(4,4,152,72,22);c.fill();
    c.fillStyle='#21473d';c.font='bold 26px sans-serif';c.textAlign='center';
    const mots=texte.split(' ');let ligne='',y=32;
    for(const mot of mots){if((ligne+' '+mots).trim().length>14){c.fillText(ligne,80,y);y+=22;ligne='';}else ligne+=' '+mots;}
    if(ligne.trim())c.fillText(ligne.trim(),80,y);
    carte.needsUpdate=true;
    h.bulle.visible=true;h.bulleTemps=2.2;
  }

  /** Charge les personnages articulés, leurs clips, et le modèle de secours. */
  async charger(base = '/modeles/') {
    const integres = (globalThis as {__modeles?: Record<string, string>}).__modeles;
    const chargeur = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const url = (nom: string) => integres?.[nom] ?? base + nom;
    const nomsDebout = ['vendeuse.glb', AVATARS.femme, AVATARS.homme];
    const [marcheur, coureur, ...debout] = await Promise.all([
      chargeur.loadAsync(url('marcheur.glb')),
      chargeur.loadAsync(url('coureur.glb'))
        .catch(e => { console.warn('course indisponible : ' + (e instanceof Error ? e.message : e)); return undefined; }),
      ...nomsDebout.map(n => chargeur.loadAsync(url(n))
        .catch(e => { console.warn(`silhouette ${n} indisponible : ${e instanceof Error ? e.message : e}`); return undefined; })),
    ]);
    debout.forEach((lot, i) => {
      if (!lot) return;
      lot.scene.traverse(n => { const m = n as T.Mesh; if (m.isMesh) { m.castShadow = nomsDebout[i] !== 'vendeuse.glb'; m.receiveShadow = true; } });
      this.debout.set(nomsDebout[i], lot.scene);
    });
    // La sportive a sa marche et sa course. L'homme n'a qu'une marche : il reçoit
    // la course de la sportive, leurs squelettes portant les mêmes noms d'os.
    // Le geste « Wave » n'est pas employé : son maillage se déchire dès le fichier
    // d'origine, la jambe suivant le bras levé.
    const femme = debout[nomsDebout.indexOf(AVATARS.femme)], homme = debout[nomsDebout.indexOf(AVATARS.homme)];
    const clip = (lot: typeof femme, nom: string) => lot?.animations.find(a => a.name === nom);
    const regler = (c: T.AnimationClip | undefined, [cadence, amplitude, hanche]: readonly number[]) => c && reglerFoulee(c, cadence, amplitude, hanche);
    const courseFemme = regler(clip(femme, 'Run'), FOULEE_COURSE);
    if (femme) this.clipsAvatar.set(AVATARS.femme, {marche: regler(clip(femme, 'Walk'), FOULEE_MARCHE), course: courseFemme});
    if (homme) {
      let course: T.AnimationClip | undefined;
      if (femme && courseFemme) try { course = transfererAnimation(homme.scene, femme.scene, courseFemme); }
      catch (e) { console.warn('course de l’homme indisponible : ' + (e instanceof Error ? e.message : e)); }
      this.clipsAvatar.set(AVATARS.homme, {marche: regler(clip(homme, 'Walk'), FOULEE_MARCHE), course});
    }
    // Tenues de la foule, alternant la sportive et l'homme. La peau n'est pas
    // touchée : seul le haut change de couleur. Chaque teinture rend la main au
    // navigateur : d'un seul tenant, les dix figeaient le créateur deux tiers de seconde.
    for (const haut of HAUTS) for (const avatar of [AVATARS.femme, AVATARS.homme]) {
      const modele = this.debout.get(avatar);
      if (!modele || !this.clipsAvatar.get(avatar)?.marche) continue;
      const corps = clonerSquelette(modele);
      if (haut) try { teinterCorps(corps, '', haut); } catch (e) { console.warn('tenue indisponible : ' + (e instanceof Error ? e.message : e)); }
      this.tenues.push({corps, avatar});
      await new Promise(r => setTimeout(r));
    }
    this.modele = marcheur.scene;
    this.clipMarche = marcheur.animations[0];
    this.clipCourse = coureur?.animations[0];
    // Mettre le personnage à taille humaine, pieds à l’origine.
    const boite = new T.Box3().setFromObject(this.modele);
    const centre = boite.getCenter(new T.Vector3());
    this.hauteurModele = boite.max.y - boite.min.y || 1;
    this.baseModele = boite.min.y;
    this.centreXModele = centre.x;
    this.centreZModele = centre.z;
    this.modele.traverse(n => {
      const m = n as T.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true; m.receiveShadow = true;
      const matiere = m.material as T.MeshStandardMaterial;
      this.matiereOrigine ??= matiere;
      this.source ??= matiere.map?.image as CanvasImageSource | undefined;
    });
    const triangles = Object.values(AVATARS).map(a => this.compterTriangles(this.debout.get(a))).join(' + ');
    return {triangles, course: !!this.clipsAvatar.get(AVATARS.homme)?.course, tenues: this.tenues.length};
  }
  private compterTriangles(objet?: T.Object3D) {
    let total = 0;
    objet?.traverse(n => {
      const m = n as T.Mesh;
      if (m.isMesh) total += (m.geometry.getIndex()?.count ?? m.geometry.getAttribute('position').count) / 3;
    });
    return Math.round(total);
  }
  /**
   * Décline la tenue : seuls les pixels bordeaux de l’atlas — les habits — sont
   * reteintés. La peau, les cheveux et les chaussures gardent leurs couleurs.
   */
  private matiere(couleur: string) {
    if (this.matieres.has(couleur)) return this.matieres.get(couleur)!;
    const base = this.matiereOrigine!;
    let matiere: T.Material = base;
    if (this.source) {
      const taille = 1024;
      const toile = document.createElement('canvas'); toile.width = toile.height = taille;
      const ctx = toile.getContext('2d', {willReadFrequently: true})!;
      ctx.drawImage(this.source, 0, 0, taille, taille);
      const image = ctx.getImageData(0, 0, taille, taille), d = image.data;
      const teinte = new T.Color(couleur);
      const {h: hCible, s: sCible, l: lCible} = versHsl(teinte.r * 255, teinte.g * 255, teinte.b * 255);
      // Fenêtre bordeaux de l’atlas : les habits, et rien d’autre.
      const habit = (h: number, s: number, l: number) => s >= .22 && l >= .06 && l <= .78 && h >= 302 && h <= 356;
      // Premier passage : luminosité moyenne des habits, pour recentrer sans écraser les plis.
      let somme = 0, compte = 0;
      for (let i = 0; i < d.length; i += 4) {
        const {h, s, l} = versHsl(d[i], d[i + 1], d[i + 2]);
        if (habit(h, s, l)) { somme += l; compte++; }
      }
      const lMoyenne = compte ? somme / compte : .3;
      for (let i = 0; i < d.length; i += 4) {
        const {h, s, l} = versHsl(d[i], d[i + 1], d[i + 2]);
        if (!habit(h, s, l)) continue;
        // La couleur demandée donne le ton ; l’écart à la moyenne garde le modelé du tissu.
        const lNouveau = Math.min(.97, Math.max(.03, lCible + (l - lMoyenne) * .85));
        const [r, v, b] = depuisHsl(hCible, Math.max(.12, sCible), lNouveau);
        d[i] = r; d[i + 1] = v; d[i + 2] = b;
      }
      ctx.putImageData(image, 0, 0);
      const carte = new T.CanvasTexture(toile);
      carte.colorSpace = T.SRGBColorSpace;
      carte.flipY = false;                      // les UV glTF ne sont pas retournés
      matiere = base.clone(); (matiere as T.MeshStandardMaterial).map = carte;
    }
    this.matieres.set(couleur, matiere);
    return matiere;
  }
  /**
   * Remplace toutes les silhouettes construites en code par un corps articulé :
   * l'avatar choisi pour le joueur, la vendeuse pour Aïcha, la sportive pour les
   * joggeuses, et pour tous les autres l'une des tenues de la foule. Les
   * conducteurs des véhicules garés gardent leur silhouette assise, et celles qui
   * ne sont plus dans la scène — conducteurs des véhicules remplacés — sont ignorées.
   */
  habiller(echelle = 1.78) {
    if (!this.modele || !this.clipMarche) return 0;
    let habilles = 0;
    for (const personnage of Personnage.tous) {
      if (this.habitants.some(h => h.personnage === personnage)) continue;
      if (!this.dansLaScene(personnage.objet) || personnage.objet.userData.conducteur) continue;
      const nom = personnage.objet.name, estJoueur = nom === 'joueur', estVendeuse = nom.startsWith('vendeuse-');
      if (estJoueur && !this.corpsJoueur) continue;
      const tenue = !estJoueur && !estVendeuse ? this.prochaineTenue(nom.startsWith('joggeur-')) : undefined;
      const choix = estJoueur ? this.debout.get(this.corpsJoueur!) : estVendeuse ? this.debout.get('vendeuse.glb') : tenue?.corps;
      if (estJoueur && !choix) continue;
      let corps: T.Object3D, clips: {marche?: T.AnimationClip; course?: T.AnimationClip} | undefined, pas: Pas;
      if (choix) {
        const taille = estVendeuse ? 1.3 : estJoueur ? 1.74 : TAILLES[tenue!.avatar];
        corps = this.poserDebout(personnage, choix, taille, estVendeuse ? .46 : 0);
        corps.name = estVendeuse ? 'modele-vendeuse' : 'corps-personnage';
        if (estJoueur) corps.userData.avatar = this.corpsJoueur;
        clips = estJoueur ? this.clipsAvatar.get(this.corpsJoueur!) : estVendeuse ? undefined : this.clipsAvatar.get(tenue!.avatar);
        pas = allure(taille);
      } else {
        // Secours : le modèle léger, décliné en couleurs.
        corps = clonerSquelette(this.modele);
        corps.name = 'corps-personnage';
        const facteur = echelle / this.hauteurModele;
        corps.scale.setScalar(facteur);
        // Les silhouettes construites reposent à .15 : le modèle rejoint le sol,
        // et son centre visuel rejoint exactement le point logique du personnage.
        corps.position.set(-this.centreXModele*facteur,-.15-this.baseModele*facteur,-this.centreZModele*facteur);
        const matiere = this.matiere(personnage.couleur);
        corps.traverse(n => { const m = n as T.Mesh; if (m.isMesh) m.material = matiere; });
        personnage.objet.add(corps);
        clips = {marche: this.clipMarche, course: this.clipCourse};
        pas = {marche: 1.47 * echelle / 1.74, course: 3.8 * echelle / 1.74, neutre: .1};
      }
      for (const piece of personnage.pieces) piece.visible = false;
      const mixeur = new T.AnimationMixer(corps);
      const marche = clips?.marche ? mixeur.clipAction(clips.marche) : undefined;
      marche?.play();
      const course = clips?.course ? mixeur.clipAction(clips.course) : undefined;
      course?.play(); if (course) course.weight = 0;
      const habitant: Habitant = {personnage, corps, mixeur, marche: marche ?? mixeur.clipAction(this.clipMarche), course, pas,
        fige: !marche, reposY: corps.position.y, precedent: personnage.objet.position.clone()};
      if (nom.startsWith('passant-') && this.habitants.length % 4 === 0) {habitant.bulle = this.creerBulle(); personnage.objet.add(habitant.bulle);}
      this.habitants.push(habitant);
      if (estJoueur) {this.joueur = habitant; this.appliquerCouleurJoueur();}
      habilles++;
    }
    return habilles;
  }
  /** Tenue suivante de la foule ; les joggeuses portent toujours la sportive. */
  private prochaineTenue(joggeuse: boolean) {
    const sportives = joggeuse ? this.tenues.filter(t => t.avatar === AVATARS.femme) : [];
    const choix = sportives.length ? sportives : this.tenues;
    return choix.length ? choix[this.tenueSuivante++ % choix.length] : undefined;
  }
  personnaliserJoueur(couleur:string,corps:CorpsJoueur=this.corpsJoueur as CorpsJoueur,peau='#79513b',chaussures=''){
    const corpsChange=corps!==this.corpsJoueur;
    this.couleurJoueur=couleur;this.corpsJoueur=corps;this.peauJoueur=peau;this.chaussuresJoueur=chaussures;
    if(corpsChange)this.changerCorpsJoueur();
    this.appliquerCouleurJoueur();
  }
  private changerCorpsJoueur(){
    const h=this.joueur,choix=this.corpsJoueur?this.debout.get(this.corpsJoueur):undefined;
    if(!h||!choix||!this.clipMarche)return;
    h.mixeur.stopAllAction();this.libererApparence(h.corps);h.corps.removeFromParent();
    h.corps=this.poserDebout(h.personnage,choix);h.corps.name='corps-personnage';h.corps.userData.avatar=this.corpsJoueur;
    h.mixeur=new T.AnimationMixer(h.corps);const clips=this.clipsAvatar.get(this.corpsJoueur!);h.marche=h.mixeur.clipAction(clips?.marche??this.clipMarche);h.marche.play();
    h.course=clips?.course?h.mixeur.clipAction(clips.course):undefined;h.course?.play();if(h.course)h.course.weight=0;h.fige=!clips?.marche;h.reposY=h.corps.position.y;
    h.pas=allure(1.74);
  }
  private appliquerCouleurJoueur(){
    const h=this.joueur;if(!h)return;
    // Les avatars Meshy regroupent cheveux, peau et vêtements dans une seule
    // texture : leur squelette dit où se trouve le tissu, et lui seul.
    if(this.corpsJoueur?.startsWith('avatar-')){this.teinterCorps(h.corps);return;}
    if(!this.matiereOrigine)return;
    if(!h.fige){const tenue=this.matiere(this.couleurJoueur);h.corps.traverse(n=>{const m=n as T.Mesh;if(m.isMesh)m.material=tenue;});return;}
    this.teinterCorps(h.corps);
  }
  /** Libère uniquement les matières et textures créées pour le joueur. */
  libererApparence(corps:T.Object3D){libererApparence(corps);}
  private teinterCorps(corps:T.Object3D){teinterCorps(corps,this.peauJoueur,this.couleurJoueur,this.chaussuresJoueur);}
  /** Pose une silhouette debout dans un personnage : pieds au sol, face au sud. */
  private poserDebout(personnage: Personnage, choix: T.Object3D,hauteurCible=1.74,base=.0) {
    // Un clone hors scène n'a pas encore calculé la place de ses os : la boîte
    // d'un maillage articulé serait alors fausse, et le corps géant.
    choix.updateMatrixWorld(true);
    const boite = new T.Box3().setFromObject(choix);
    const centre = boite.getCenter(new T.Vector3());
    const hauteur = boite.max.y - boite.min.y || 1;
    const echelle = hauteurCible / hauteur;
    // Un clone ordinaire garde le squelette de l’original : le maillage se
    // déformait alors sur des os restés à l’écart de la scène, et le joueur
    // n’était plus qu’un amas de texture. `clonerSquelette` rattache les os.
    const corps = clonerSquelette(choix);
    corps.scale.setScalar(echelle);
    // L'origine de ces modèles est au centre du corps : sans compensation, la
    // silhouette peut s'enfoncer ou apparaître plusieurs mètres à côté.
    corps.position.set(-centre.x*echelle,base-.15-boite.min.y*echelle,-centre.z*echelle);
    personnage.objet.add(corps);
    return corps;
  }
  private dansLaScene(objet: T.Object3D) {
    for (let n: T.Object3D | null = objet; n; n = n.parent) if (n === this.scene) return true;
    return false;
  }
  /** Ignore les conducteurs déjà intégrés aux modèles de véhicules. */
  private dansUnVehicule(objet: T.Object3D) {
    for (let n: T.Object3D | null = objet.parent; n; n = n.parent) {
      if (/^(circulation-|zem-supplementaire-|vehicule-joueur-|moto-borne)/.test(n.name)) return true;
    }
    return false;
  }
  /**
   * Copie légère du corps choisi par le joueur, utilisée comme passager du
   * zémidjan. Aucune animation ne le tient : une légère inclinaison donne une
   * pose embarquée sans prétendre plier ses articulations.
   */
  creerPassagerMoto() {
    if (!this.corpsJoueur) return null;
    const choix=this.debout.get(this.corpsJoueur);if(!choix)return null;
    choix.updateMatrixWorld(true);
    const boite=new T.Box3().setFromObject(choix),centre=boite.getCenter(new T.Vector3());
    const hauteur=boite.max.y-boite.min.y||1,echelle=1.66/hauteur;
    const corps=clonerSquelette(choix);corps.scale.setScalar(echelle);
    corps.position.set(-centre.x*echelle,-boite.min.y*echelle,-centre.z*echelle);
    this.teinterCorps(corps);
    // Maillage déformé hors de sa pose de liaison : sa sphère englobante ne dit
    // plus où il se trouve, il ne doit pas être écarté du rendu.
    corps.traverse(n=>{const m=n as T.Mesh;if(m.isMesh){m.castShadow=false;m.receiveShadow=true;m.frustumCulled=false;}});
    const passager=new T.Group();passager.name='passager-joueur-moto';passager.add(corps);passager.visible=false;
    // Assis à califourchon : le bassin repose sur la selle, les pieds sur les
    // repose-pieds. Le monde relève le passager de 0,27 m au-dessus du sol.
    passager.updateMatrixWorld(true);
    const hanches=poserAssis(corps);
    if(hanches){
      const h=hanches.getWorldPosition(new T.Vector3());
      corps.position.y+=Foule.SELLE-.27-h.y;corps.position.z-=h.z;corps.position.x-=h.x;
    }
    return passager;
  }
  /** Fait entrer ou sortir visuellement le corps du joueur par le côté du véhicule. */
  animerTransitionTransport(type:'zemidjan'|'voiture',sens:'montee'|'descente',progression:number){
    const h=this.joueur;if(!h)return false;
    const q=sens==='montee'?progression:1-progression,ease=q*q*(3-2*q),decalage=type==='voiture'?1.45:1.05;
    h.corps.visible=true;h.corps.position.x=-decalage*(1-ease);h.corps.position.z=(1-ease)*.18;
    h.corps.position.y=(h.reposY??0)+Math.sin(ease*Math.PI)*(type==='voiture'?.28:.4);
    h.corps.rotation.x=-ease*(type==='zemidjan'?.22:.08);h.corps.rotation.z=-Math.sin(ease*Math.PI)*.1;
    h.personnage.objet.userData.transitionTransport={type,sens,progression};
    return true;
  }
  finaliserTransitionTransport(enTransport:boolean){
    const h=this.joueur;if(!h)return;
    h.corps.position.set(0,h.reposY??0,0);h.corps.rotation.set(0,0,0);h.corps.visible=!enTransport;
    delete h.personnage.objet.userData.transitionTransport;
  }
  /**
   * Anime chaque personnage d’après sa vitesse observée : marche, course au-delà
   * de six mètres par seconde, et pose retenue à l’arrêt.
   */
  actualiser(dt: number) {
    if (!dt) return;
    this.temps+=dt;
    for (const [index,h] of this.habitants.entries()) {
      h.reactionCooldown=Math.max(0,(h.reactionCooldown??0)-dt);
      const position = h.personnage.objet.position;
      const vitesse = position.distanceTo(h.precedent) / dt;
      // La bulle dit un mot un instant, puis redevient « … » selon son cycle.
      if(h.bulle){
        if(h.bulleTemps!==undefined){h.bulleTemps-=dt;if(h.bulleTemps<=0){h.bulleTemps=undefined;h.bulle.visible=false;}}
        else h.bulle.visible=h.chute===undefined&&!h.reaction&&vitesse<1.5&&Math.sin(this.temps*.42+index*1.7)>.72;
      }
      h.precedent.copy(position);
      if (h.chute !== undefined) { this.tenirChute(h, dt); continue; }
      if(h.reaction&&h.reactionTemps!==undefined){
        h.reactionTemps-=dt;
        const cible=h.reactionCible,monde=h.personnage.objet.getWorldPosition(new T.Vector3());
        if(cible){
          const angle=Math.atan2(cible.x-monde.x,cible.z-monde.z)-h.personnage.objet.rotation.y;
          h.corps.rotation.y=T.MathUtils.lerp(h.corps.rotation.y,angle,1-Math.exp(-dt*7));
        }
        const geste=Math.sin((2.4-h.reactionTemps)*9);
        h.corps.rotation.z=(h.reaction==='peur'?.11:.055)*geste;
        h.corps.rotation.x=h.reaction==='salut'?-.08*Math.max(0,geste):0;
        h.mixeur.update(dt*.2);
        if(h.reactionTemps<=0){h.reaction=undefined;h.reactionTemps=undefined;h.reactionCible=undefined;h.reactionCooldown=2.5;h.personnage.objet.userData.reactionPNJ=undefined;h.corps.rotation.set(0,0,0);}
        continue;
      }
      if (h.fige) {
        // Faute de squelette, un léger balancement et une inclinaison évitent
        // l'effet de statue qui glisse.
        h.balancement = (h.balancement ?? 0) + dt * Math.min(9, vitesse * 2.4);
        const amplitude = Math.min(1, vitesse / 4);
        h.corps.position.y = (h.reposY??h.corps.position.y) + Math.abs(Math.sin(h.balancement)) * .045 * amplitude;
        h.corps.rotation.z = Math.sin(h.balancement) * .035 * amplitude;
        h.corps.rotation.x = -.06 * amplitude;
        continue;
      }
      const pas = h.pas ?? allure(1.74);
      h.mixeur.timeScale = 1;
      if (vitesse < .05) {
        // À l'arrêt : les pieds se rejoignent sur l'instant neutre du cycle,
        // au lieu de rester figés au milieu d'une enjambée.
        h.marche.weight = 1; h.marche.timeScale = 0; h.marche.time = pas.neutre;
        if (h.course) { h.course.weight = 0; h.course.timeScale = 0; }
        h.mixeur.update(0);
        continue;
      }
      // La cadence suit la vitesse réelle : le pied d'appui reste posé au sol.
      // Au-delà d'un pas vif, la course prend le relais par fondu.
      const [debut, fin] = pas.bascule ?? [pas.marche * 1.65, pas.marche * 2.35];
      const course = h.course ? T.MathUtils.smoothstep(vitesse, debut, fin) : 0;
      h.marche.weight = 1 - course; h.marche.timeScale = T.MathUtils.clamp(vitesse / pas.marche, .35, 1.9);
      if (h.course) { h.course.weight = course; h.course.timeScale = T.MathUtils.clamp(vitesse / pas.course, .5, 2.1); }
      h.mixeur.update(dt);
    }
  }
  /** Les personnes proches regardent, saluent ou s'écartent visuellement. */
  reagirAuJoueur(position:T.Vector3,enVehicule:boolean,enMouvement:boolean){
    if(!enMouvement)return;
    const monde=new T.Vector3(),rayon=enVehicule?5:2.8;
    for(const h of this.habitants){
      if(h===this.joueur||h.chute!==undefined||h.reaction||(h.reactionCooldown??0)>0||this.dansUnVehicule(h.personnage.objet))continue;
      h.personnage.objet.getWorldPosition(monde);
      if(Math.hypot(monde.x-position.x,monde.z-position.z)>rayon)continue;
      h.reaction=enVehicule?'peur':'salut';h.reactionTemps=enVehicule?2.4:1.8;h.reactionCible=position.clone();
      h.personnage.objet.userData.reactionPNJ=h.reaction;
      // À pied, un passant dit bonjour : un vrai mot, jamais le même.
      if(!enVehicule&&h.bulle){
        const mots=Foule.SALUTATIONS;
        this.dire(h,mots[Math.floor(Math.random()*mots.length)]);
      }
    }
  }
  /** Les témoins proches se tournent vers le lieu d'un accident. */
  signalerAccident(position:T.Vector3){
    const monde=new T.Vector3();
    for(const h of this.habitants){
      if(h===this.joueur||h.chute!==undefined||this.dansUnVehicule(h.personnage.objet))continue;
      h.personnage.objet.getWorldPosition(monde);
      if(Math.hypot(monde.x-position.x,monde.z-position.z)>10)continue;
      h.reaction='peur';h.reactionTemps=2.8;h.reactionCible=position.clone();h.personnage.objet.userData.reactionPNJ='peur';
    }
  }
  /**
   * Renverse le personnage le plus proche d'un véhicule. Les positions sont
   * calculées dans le monde, car plusieurs vendeuses vivent dans un groupe de
   * commerce dont leur position locale ne correspond pas à la rue.
   */
  percuterProche(position: T.Vector3, portee = 1.45) {
    let cible: Habitant | undefined, distance = Infinity;
    const monde = new T.Vector3();
    for (const h of this.habitants) {
      if (h === this.joueur || h.chute !== undefined || !this.dansLaScene(h.personnage.objet) || this.dansUnVehicule(h.personnage.objet)) continue;
      h.personnage.objet.getWorldPosition(monde);
      const d = Math.hypot(monde.x - position.x, monde.z - position.z);
      if (d <= portee && d < distance) { cible = h; distance = d; }
    }
    if (!cible) return null;
    cible.chute = 0;
    cible.placeChute = cible.personnage.objet.position.clone();
    cible.mixeur.stopAllAction();
    cible.personnage.objet.getWorldPosition(monde);
    this.signalerAccident(monde);
    return {position: monde.clone(), nom: cible.personnage.objet.name || 'personnage'};
  }
  /** Bascule le corps au sol, le laisse à terre, puis le remet debout. */
  private tenirChute(h: Habitant, dt: number) {
    h.chute = (h.chute ?? 0) + dt;
    // Un passant renversé ne continue pas sa route : il reste où il est tombé.
    if (h.placeChute) h.personnage.objet.position.copy(h.placeChute);
    const t = h.chute;
    const bascule = Math.PI / 2 * .92;
    if (t < .3) h.corps.rotation.x = -bascule * (t / .3);
    else if (t < Foule.DUREE_CHUTE - .6) h.corps.rotation.x = -bascule;
    else if (t < Foule.DUREE_CHUTE) h.corps.rotation.x = -bascule * (1 - (t - (Foule.DUREE_CHUTE - .6)) / .6);
    else {
      // Relevé : il repart, et l'animation de marche reprend.
      h.corps.rotation.x = 0; h.chute = undefined; h.placeChute = undefined;
      if (!h.fige) { h.marche.reset().play(); h.course?.reset().play(); if (h.course) h.course.weight = 0; }
    }
  }
}
