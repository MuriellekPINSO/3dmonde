import * as T from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as clonerSquelette } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { Personnage } from './Joueur';

/**
 * Habille la scène de personnages articulés. Un seul modèle — 3 126 triangles,
 * squelette de 28 os, animations de marche et de course — est décliné en
 * plusieurs tenues en recolorant la seule région vestimentaire de son atlas,
 * puis cloné pour chaque silhouette construite en code, qu’il remplace.
 *
 * L’animation est choisie d’après le déplacement réellement observé : nul besoin
 * de savoir qui marche et qui attend, la scène le dit d’elle-même.
 */

type Habitant = {
  personnage: Personnage;
  corps: T.Object3D;
  mixeur: T.AnimationMixer;
  marche: T.AnimationAction;
  course?: T.AnimationAction;
  precedent: T.Vector3;
  /** Vrai dès que le personnage s’est déplacé : il gardera le modèle articulé. */
  bouge: boolean;
  /** Silhouette sans squelette : balancement au lieu d’une vraie marche. */
  fige?: boolean;
  balancement?: number;
  reposY?: number;
  /** Renversé : durée écoulée depuis la chute, et place où il est tombé. */
  chute?: number;
  placeChute?: T.Vector3;
  reaction?: 'salut'|'peur';
  reactionTemps?: number;
  reactionCooldown?: number;
  reactionCible?: T.Vector3;
  bulle?:T.Sprite;
};

export type StyleTenue = 'ville'|'sport'|'wax';
export type CorpsJoueur = 'personnage1.glb'|'perso2.glb'|'go2.glb';

/** Teinte et saturation d’une couleur, pour reconnaître les habits dans l’atlas. */
function versHsl(r: number, v: number, b: number) {
  const max = Math.max(r, v, b), min = Math.min(r, v, b), delta = max - min;
  const l = (max + min) / 510;
  if (!delta) return {h: 0, s: 0, l};
  const s = delta / (255 - Math.abs(max + min - 255));
  let h: number;
  if (max === r) h = ((v - b) / delta + (v < b ? 6 : 0)) * 60;
  else if (max === v) h = ((b - r) / delta + 2) * 60;
  else h = ((r - v) / delta + 4) * 60;
  return {h, s, l};
}
function depuisHsl(h: number, s: number, l: number) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const t: [number, number, number] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return t.map(v => Math.round((v + m) * 255));
}

export class Foule {
  private modele?: T.Object3D;
  private clipMarche?: T.AnimationClip;
  private clipCourse?: T.AnimationClip;
  private hauteurModele = 1.78;
  private baseModele = 0;
  private readonly habitants: Habitant[] = [];
  private joueur?: Habitant;
  private static readonly DUREE_CHUTE = 3.4;
  private readonly matieres = new Map<string, T.Material>();
  private source?: CanvasImageSource;
  private matiereOrigine?: T.MeshStandardMaterial;
  /** Silhouettes debout, avec leurs propres habits : elles varient les corps. */
  private readonly silhouettes: T.Object3D[] = [];
  private readonly debout = new Map<string, T.Object3D>();
  /**
   * Silhouette à donner au joueur. Ces modèles n'ont pas de squelette : le
   * personnage ne marche donc pas, il est animé d'un léger balancement.
   */
  corpsJoueur: string | null = 'personnage1.glb';
  private images = 0;
  private varie = false;
  private couleurJoueur='#f3b94f';
  private temps=0;
  private accessoiresJoueur?:T.Group;
  private styleJoueur:StyleTenue='ville';

  constructor(private readonly scene: T.Object3D) {}

  private creerBulle(){
    const toile=document.createElement('canvas');toile.width=160;toile.height=80;const c=toile.getContext('2d')!;
    c.fillStyle='rgba(255,250,235,.92)';c.beginPath();c.roundRect(8,8,144,52,22);c.fill();c.fillStyle='#21473d';c.font='bold 32px sans-serif';c.textAlign='center';c.fillText('…',80,45);
    const texture=new T.CanvasTexture(toile);texture.colorSpace=T.SRGBColorSpace;
    const bulle=new T.Sprite(new T.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));bulle.name='discussion-pnj';bulle.scale.set(1.15,.58,1);bulle.position.set(0,2.35,0);bulle.visible=false;return bulle;
  }

  /** Charge le modèle articulé et ses deux animations. */
  async charger(base = '/modeles/') {
    const integres = (globalThis as {__modeles?: Record<string, string>}).__modeles;
    const chargeur = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const url = (nom: string) => integres?.[nom] ?? base + nom;
    const [marcheur, coureur, ...debout] = await Promise.all([
      chargeur.loadAsync(url('marcheur.glb')),
      chargeur.loadAsync(url('coureur.glb'))
        .catch(e => { console.warn('course indisponible : ' + (e instanceof Error ? e.message : e)); return undefined; }),
      ...['personnage1.glb', 'perso2.glb', 'go2.glb', 'vendeuse.glb'].map(n => chargeur.loadAsync(url(n))
        .catch(e => { console.warn(`silhouette ${n} indisponible : ${e instanceof Error ? e.message : e}`); return undefined; })),
    ]);
    const nomsDebout = ['personnage1.glb', 'perso2.glb', 'go2.glb', 'vendeuse.glb'];
    debout.forEach((lot, i) => {
      if (!lot) return;
      lot.scene.traverse(n => { const m = n as T.Mesh; if (m.isMesh) { m.castShadow = nomsDebout[i] !== 'vendeuse.glb'; m.receiveShadow = true; } });
      this.silhouettes.push(lot.scene);
      this.debout.set(nomsDebout[i], lot.scene);
    });
    this.modele = marcheur.scene;
    this.clipMarche = marcheur.animations[0];
    this.clipCourse = coureur?.animations[0];
    // Mettre le personnage à taille humaine, pieds à l’origine.
    const boite = new T.Box3().setFromObject(this.modele);
    this.hauteurModele = boite.max.y - boite.min.y || 1;
    this.baseModele = boite.min.y;
    this.modele.traverse(n => {
      const m = n as T.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true; m.receiveShadow = true;
      const matiere = m.material as T.MeshStandardMaterial;
      this.matiereOrigine ??= matiere;
      this.source ??= matiere.map?.image as CanvasImageSource | undefined;
    });
    return {triangles: this.compterTriangles(), course: !!this.clipCourse, silhouettes: this.silhouettes.length};
  }
  private compterTriangles() {
    let total = 0;
    this.modele?.traverse(n => {
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
   * Remplace toutes les silhouettes construites en code par le modèle articulé.
   * Celles qui ne sont plus dans la scène — conducteurs des véhicules remplacés —
   * sont ignorées.
   */
  habiller(echelle = 1.78) {
    if (!this.modele || !this.clipMarche) return 0;
    let habilles = 0;
    for (const personnage of Personnage.tous) {
      if (this.habitants.some(h => h.personnage === personnage)) continue;
      if (!this.dansLaScene(personnage.objet)) continue;
      const silhouetteDebout = personnage.objet.name === 'joueur' && this.corpsJoueur
        ? this.debout.get(this.corpsJoueur)
        : personnage.objet.name.startsWith('vendeuse-') ? this.debout.get('vendeuse.glb') : undefined;
      if (silhouetteDebout) {
        const estVendeuse=personnage.objet.name.startsWith('vendeuse-');
        const corps = this.poserDebout(personnage, silhouetteDebout,estVendeuse?1.3:1.74,estVendeuse ? .46 : 0);
        if (estVendeuse) corps.name = 'modele-vendeuse';
        else {corps.name = 'corps-personnage';corps.userData.avatar=this.corpsJoueur;}
        for (const piece of personnage.pieces) piece.visible = false;
        const mixeur = new T.AnimationMixer(corps);
        const habitant:Habitant={personnage, corps, mixeur, marche: mixeur.clipAction(this.clipMarche),
          bouge: true, fige: true, reposY:corps.position.y, precedent: personnage.objet.position.clone()};
        if(personnage.objet.name.startsWith('passant-')&&this.habitants.length%4===0){habitant.bulle=this.creerBulle();personnage.objet.add(habitant.bulle);}
        this.habitants.push(habitant);
        if (personnage.objet.name === 'joueur') {this.joueur = habitant;this.appliquerCouleurJoueur();}
        habilles++;
        continue;
      }
      const corps = clonerSquelette(this.modele);
      corps.name = 'corps-personnage';
      const facteur = echelle / this.hauteurModele;
      corps.scale.setScalar(facteur);
      // Les silhouettes construites reposent à .15 : le modèle rejoint le sol,
      // en tenant compte de la position de son origine.
      corps.position.y = -.15 - this.baseModele * facteur;
      const matiere = this.matiere(personnage.couleur);
      corps.traverse(n => { const m = n as T.Mesh; if (m.isMesh) m.material = matiere; });
      personnage.objet.add(corps);
      for (const piece of personnage.pieces) piece.visible = false;
      const mixeur = new T.AnimationMixer(corps);
      const marche = mixeur.clipAction(this.clipMarche);
      marche.play();
      const course = this.clipCourse ? mixeur.clipAction(this.clipCourse) : undefined;
      course?.play(); if (course) course.weight = 0;
      const habitant:Habitant={personnage, corps, mixeur, marche, course, bouge: false,
        reposY:corps.position.y,precedent: personnage.objet.position.clone()};
      if(personnage.objet.name.startsWith('passant-')&&this.habitants.length%4===0){habitant.bulle=this.creerBulle();personnage.objet.add(habitant.bulle);}
      this.habitants.push(habitant);
      if (personnage.objet.name === 'joueur') {this.joueur = habitant;this.appliquerCouleurJoueur();}
      habilles++;
    }
    return habilles;
  }
  personnaliserJoueur(couleur:string,corps:CorpsJoueur=this.corpsJoueur as CorpsJoueur,style:StyleTenue=this.styleJoueur){
    const corpsChange=corps!==this.corpsJoueur;
    this.couleurJoueur=couleur;this.corpsJoueur=corps;this.styleJoueur=style;
    if(corpsChange)this.changerCorpsJoueur();
    this.appliquerCouleurJoueur();
  }
  private changerCorpsJoueur(){
    const h=this.joueur,choix=this.corpsJoueur?this.debout.get(this.corpsJoueur):undefined;
    if(!h||!choix||!this.clipMarche)return;
    h.mixeur.stopAllAction();h.corps.removeFromParent();
    h.corps=this.poserDebout(h.personnage,choix);h.corps.name='corps-personnage';h.corps.userData.avatar=this.corpsJoueur;
    h.mixeur=new T.AnimationMixer(h.corps);h.marche=h.mixeur.clipAction(this.clipMarche);
    h.course=undefined;h.fige=true;h.bouge=true;h.reposY=h.corps.position.y;
  }
  private appliquerCouleurJoueur(){
    const h=this.joueur;if(!h||!this.matiereOrigine)return;
    this.accessoiresJoueur?.removeFromParent();
    const groupe=new T.Group();groupe.name=`tenue-joueur-${this.styleJoueur}`;
    const tissu=new T.MeshStandardMaterial({color:this.couleurJoueur,roughness:.78,side:T.DoubleSide});
    const clair=new T.MeshStandardMaterial({color:new T.Color(this.couleurJoueur).lerp(new T.Color('#f8df9c'),.38),roughness:.82,side:T.DoubleSide});
    const piece=(geometrie:T.BufferGeometry,matiere:T.Material,x:number,y:number,z:number)=>{const m=new T.Mesh(geometrie,matiere);m.position.set(x,y,z);m.castShadow=true;groupe.add(m);return m;};
    if(this.styleJoueur==='ville'){
      const veste=piece(new T.CylinderGeometry(.255,.22,.53,12),tissu,0,1.22,.005);veste.scale.z=.72;
      piece(new T.BoxGeometry(.3,.055,.025),clair,0,1.2,.18);
    }else if(this.styleJoueur==='sport'){
      const maillot=piece(new T.CylinderGeometry(.225,.205,.48,12),tissu,0,1.23,.006);maillot.scale.z=.7;
      piece(new T.BoxGeometry(.08,.49,.025),clair,0,1.23,.17);
      const bandeau=piece(new T.TorusGeometry(.145,.025,6,16),tissu,0,1.82,0);bandeau.rotation.x=Math.PI/2;
    }else{
      const pagne=piece(new T.CylinderGeometry(.22,.31,.64,12),tissu,0,.78,0);pagne.scale.z=.78;
      for(const y of [.56,.76,.96])piece(new T.TorusGeometry(.275,.024,5,18),clair,0,y,0).rotation.x=Math.PI/2;
      const echarpe=piece(new T.PlaneGeometry(.2,.82),tissu,.04,1.22,.19);echarpe.rotation.z=-.28;
    }
    h.personnage.objet.add(groupe);this.accessoiresJoueur=groupe;
    if(!h.fige){const tenue=this.matiere(this.couleurJoueur);h.corps.traverse(n=>{const m=n as T.Mesh;if(m.isMesh)m.material=tenue;});return;}
    // Les silhouettes debout possèdent un autre atlas UV. On conserve leur
    // propre texture et applique seulement une teinte claire.
    const teinte=new T.Color(this.couleurJoueur).lerp(new T.Color('#ffffff'),.58);
    h.corps.traverse(n=>{const m=n as T.Mesh;if(!m.isMesh||!(m.material instanceof T.MeshStandardMaterial))return;
      const origine=(m.userData.matiereTenueOrigine as T.MeshStandardMaterial|undefined)??m.material;
      m.userData.matiereTenueOrigine=origine;const matiere=origine.clone();matiere.color.copy(origine.color).multiply(teinte);m.material=matiere;});
  }
  /** Pose une silhouette debout dans un personnage : pieds au sol, face au sud. */
  private poserDebout(personnage: Personnage, choix: T.Object3D,hauteurCible=1.74,base=.0) {
    const boite = new T.Box3().setFromObject(choix);
    const hauteur = boite.max.y - boite.min.y || 1;
    const echelle = hauteurCible / hauteur;
    const corps = choix.clone();
    corps.scale.setScalar(echelle);
    // L'origine de ces modèles est au centre du corps : sans compensation, la
    // silhouette s'enfonce d'un mètre sous le trottoir.
    corps.position.y = base-.15 - boite.min.y * echelle;
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
   * zémidjan. Le GLB n'est pas riggé : une légère inclinaison donne une pose
   * embarquée sans prétendre plier ses articulations.
   */
  creerPassagerMoto() {
    if (!this.corpsJoueur) return null;
    const choix=this.debout.get(this.corpsJoueur);if(!choix)return null;
    const boite=new T.Box3().setFromObject(choix),centre=boite.getCenter(new T.Vector3());
    const hauteur=boite.max.y-boite.min.y||1,echelle=1.48/hauteur;
    const corps=choix.clone();corps.scale.setScalar(echelle);
    corps.position.set(-centre.x*echelle,-boite.min.y*echelle,-centre.z*echelle);
    corps.rotation.x=-.1;
    corps.traverse(n=>{const m=n as T.Mesh;if(m.isMesh){m.castShadow=false;m.receiveShadow=true;}});
    const passager=new T.Group();passager.name='passager-joueur-moto';passager.add(corps);passager.visible=false;
    if(this.accessoiresJoueur){const tenue=this.accessoiresJoueur.clone();tenue.scale.setScalar(.85);passager.add(tenue);}
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
    this.images++;this.temps+=dt;
    for (const [index,h] of this.habitants.entries()) {
      h.reactionCooldown=Math.max(0,(h.reactionCooldown??0)-dt);
      const position = h.personnage.objet.position;
      const vitesse = position.distanceTo(h.precedent) / dt;
      if(h.bulle)h.bulle.visible=h.chute===undefined&&!h.reaction&&vitesse<1.5&&Math.sin(this.temps*.42+index*1.7)>.72;
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
      if (vitesse > .05) h.bouge = true;
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
      const court = !!h.course && vitesse > 6;
      if (h.course) { h.course.weight = court ? 1 : 0; h.marche.weight = court ? 0 : 1; }
      // À l’arrêt, l’animation est retenue plutôt que figée sur une pose bancale.
      const cadence = vitesse < .05 ? 0 : Math.min(1.6, Math.max(.55, vitesse / (court ? 6 : 1.4)));
      h.mixeur.timeScale = cadence;
      h.mixeur.update(dt);
    }
    // Au bout de quelques secondes, on sait qui reste en place : ces figures
    // adoptent une silhouette debout, chacune avec ses propres habits.
    // Ceux qui marchent sont mus à chaque image : vingt suffisent à les repérer,
    // et le joueur est de toute façon exclu de l'échange.
    if (!this.varie && this.images > 20 && this.silhouettes.length) this.varierLesCorps();
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
  private varierLesCorps() {
    this.varie = true;
    let index = 0, varies = 0, mobiles = 0;
    // La silhouette du joueur lui reste réservée : pas de sosie parmi les figurants.
    const reservee = this.corpsJoueur ? this.debout.get(this.corpsJoueur) : undefined;
    const disponibles = this.silhouettes.filter(s => s !== reservee);
    const feminine = disponibles[disponibles.length - 1] ?? this.silhouettes[this.silhouettes.length - 1];
    const autres = disponibles.length > 1 ? disponibles.slice(0, -1) : disponibles;
    for (const h of this.habitants) {
      if (h.bouge || h.personnage.objet.name === 'joueur') { mobiles++; continue; }
      // Une vendeuse en pagne garde une silhouette féminine.
      const choix = h.personnage.pagne ? feminine : autres[index++ % Math.max(1, autres.length)];
      if (!choix) continue;
      h.mixeur.stopAllAction();
      h.corps.visible = false;
      h.corps = this.poserDebout(h.personnage, choix);
      h.reposY=h.corps.position.y;
      varies++;
    }
    console.info(`silhouettes debout posées : ${varies} immobiles variées, ${mobiles} en mouvement gardent la marche`);
  }
}
