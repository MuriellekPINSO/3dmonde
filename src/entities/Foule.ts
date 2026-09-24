import * as T from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as clonerSquelette } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { Personnage } from './Joueur';
import { versHsl, depuisHsl, teinterCorps, libererApparence } from './Teinte';
import { transfererAnimation, poserAssis } from './Transfert';

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
   * qui sert de pose d'arrêt. Mesurées sur les clips (1,42 et 3,8 m/s pour un
   * corps de 1,74 m) : en dessous ou au-dessus, les pieds glissent.
   */
  pas?: Pas;
};
type Pas = {marche: number; course: number; neutre: number};
/** Allure mesurée pour un corps de 1,74 m, ramenée à la taille du personnage. */
const allure = (hauteur: number, neutre: number): Pas => ({marche: 1.42 * hauteur / 1.74, course: 3.8 * hauteur / 1.74, neutre});
/** Taille des passantes : un peu plus petites que le joueur. */
const TAILLE_PASSANTE = 1.66;
/**
 * Pantalons des passantes : le scan porte un pantalon pêche clair sous un haut
 * en pagne fleuri. Seul le pantalon est reteint — jean, noir, vert, bordeaux,
 * kaki, blanc — et le premier garde sa couleur d'origine.
 */
const PANTALONS = ['', '#2c3a57', '#1f2024', '#3f6b4a', '#8c2f3a', '#b8a67c', '#e6e3da'];

/**
 * Deux défauts du scan de la passante. Sa texture est branchée aussi en
 * émission, à pleine intensité : le corps brillait par lui-même, plat, sans
 * ombre ni lumière de la scène. Et le rigging automatique a lié des sommets des
 * sandales aux orteils des deux pieds à la fois : dès que les jambes
 * s'écartaient, la semelle s'étirait d'un pied à l'autre en longue plaque plate.
 */
function corrigerPassante(scan: T.Object3D) {
  scan.traverse(n => {
    const m = n as T.SkinnedMesh;
    if (!m.isMesh) return;
    const matiere = m.material as T.MeshPhysicalMaterial;
    matiere.emissive?.set(0x000000); matiere.emissiveMap = null;
    if (matiere.isMeshPhysicalMaterial) { matiere.specularColor.set(0xffffff); matiere.specularIntensity = .4; }
    matiere.roughness = .85; matiere.metalness = 0; matiere.needsUpdate = true;
    if (m.isSkinnedMesh) separerPieds(m);
  });
}

/**
 * Chaque sommet d'un pied ne suit plus qu'un côté : celui qui pèse le plus parmi
 * ses os de tibia, de pied et d'orteils. Les poids de l'autre côté sont retirés,
 * le reste renormalisé. Les cuisses et le bassin ne sont pas touchés.
 */
function separerPieds(maillage: T.SkinnedMesh) {
  const noms = maillage.skeleton.bones.map(b => b.name.replace(/^mixamorig:?/, ''));
  // Côté des os du bas de jambe, et lesquels sont un pied.
  const os = noms.map(n => /^(Left|Right)(Leg|Foot|ToeBase|Toe_End|ToeEnd)$/.exec(n)?.[1]);
  const pied = noms.map(n => /(Foot|Toe)/.test(n));
  const indices = maillage.geometry.getAttribute('skinIndex'), poids = maillage.geometry.getAttribute('skinWeight');
  let repares = 0;
  for (let i = 0; i < indices.count; i++) {
    let gauche = 0, droite = 0, touchePied = false;
    for (let k = 0; k < 4; k++) {
      const j = indices.getComponent(i, k), cote = os[j], w = poids.getComponent(i, k);
      if (cote === 'Left') gauche += w; else if (cote === 'Right') droite += w;
      if (w > 0 && pied[j]) touchePied = true;
    }
    if (!touchePied || !gauche || !droite) continue;
    const perdant = gauche >= droite ? 'Right' : 'Left';
    let total = 0;
    for (let k = 0; k < 4; k++) {
      if (os[indices.getComponent(i, k)] === perdant) poids.setComponent(i, k, 0);
      total += poids.getComponent(i, k);
    }
    for (let k = 0; k < 4; k++) poids.setComponent(i, k, total ? poids.getComponent(i, k) / total : 0);
    repares++;
  }
  poids.needsUpdate = true;
  // Le scan a été pris pieds joints : quelques triangles relient une sandale à
  // l'autre et s'étirent en lame dès que les jambes s'écartent. Ils disparaissent.
  const cote = new Int8Array(indices.count);
  for (let i = 0; i < indices.count; i++) {
    let gauche = 0, droite = 0;
    for (let k = 0; k < 4; k++) {
      const j = indices.getComponent(i, k), w = poids.getComponent(i, k);
      if (!pied[j] && os[j] !== undefined && w < .5) continue;
      if (os[j] === 'Left') gauche += w; else if (os[j] === 'Right') droite += w;
    }
    cote[i] = gauche > .5 ? -1 : droite > .5 ? 1 : 0;
  }
  const index = maillage.geometry.getIndex();
  if (index) {
    const garde: number[] = [];
    for (let t = 0; t < index.count; t += 3) {
      const a = cote[index.getX(t)], b = cote[index.getX(t + 1)], c = cote[index.getX(t + 2)];
      if (Math.min(a, b, c) === -1 && Math.max(a, b, c) === 1) continue;
      garde.push(index.getX(t), index.getX(t + 1), index.getX(t + 2));
    }
    maillage.geometry.setIndex(garde);
  }
  return repares;
}

/**
 * Reteint le pantalon clair de l'atlas de la passante. La peau y est brun foncé
 * et le pagne multicolore : seuls les texels pêche très clairs sont touchés.
 * L'outil générique de Teinte.ts prenait ce pêche pour de la peau, et le haut
 * orangé aussi : la passante semblait nue.
 */
function teinterPantalon(corps: T.Object3D, couleur: string) {
  const cible = new T.Color(couleur), vise = versHsl(cible.r * 255, cible.g * 255, cible.b * 255);
  corps.traverse(n => {
    const m = n as T.Mesh; if (!m.isMesh || !(m.material instanceof T.MeshStandardMaterial)) return;
    const source = m.material.map?.image as CanvasImageSource | undefined; if (!source) return;
    const taille = 1024, toile = document.createElement('canvas'); toile.width = toile.height = taille;
    const ctx = toile.getContext('2d', {willReadFrequently: true})!; ctx.drawImage(source, 0, 0, taille, taille);
    const image = ctx.getImageData(0, 0, taille, taille), d = image.data;
    for (let i = 0; i < d.length; i += 4) {
      const {h, s, l} = versHsl(d[i], d[i + 1], d[i + 2]);
      if (l < .66 || h < 8 || h > 50 || s < .25) continue;
      const [r, v, b] = depuisHsl(vise.h, vise.s, Math.min(.96, Math.max(.05, vise.l + (l - .83) * .9)));
      d[i] = r; d[i + 1] = v; d[i + 2] = b;
    }
    ctx.putImageData(image, 0, 0);
    const carte = new T.CanvasTexture(toile); carte.colorSpace = T.SRGBColorSpace; carte.flipY = false;
    const matiere = m.material.clone(); matiere.map = carte; m.material = matiere;
  });
}

export type CorpsJoueur = 'personnage1.glb'|'perso2.glb'|'go2.glb'|'avatar-homme-meshy-opt.glb'|'avatar-femme-meshy-opt.glb';

/** Les clips Meshy font avancer le bassin dans leur fichier. Le monde s'occupe
 * déjà du déplacement : enlever cette piste évite que le corps quitte le joueur. */
function animationSurPlace(clip:T.AnimationClip|undefined){
  if(!clip)return undefined;
  const resultat=clip.clone();
  resultat.tracks=resultat.tracks.filter(piste=>!/(^|[.:])Hips\.position$/i.test(piste.name));
  return resultat;
}

/**
 * Les figurants portent le modèle de la passante, décliné en tenues. Le modèle
 * léger marcheur.glb, qui l'habillait jusqu'ici, est sculpté mains sur les
 * hanches avec un pan de jupe qui s'étire à chaque pas : il ne sert plus que de
 * secours si la passante manque.
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
  /** Silhouettes debout, avec leurs propres habits : elles varient les corps. */
  private readonly silhouettes: T.Object3D[] = [];
  private readonly debout = new Map<string, T.Object3D>();
  /** Clips natifs des avatars Meshy riggés. */
  private readonly clipsAvatar = new Map<string, {marche?:T.AnimationClip;course?:T.AnimationClip;neutre?:number}>();
  /** Passantes déjà teintes, clonées ensuite : une seule teinture par tenue. */
  private readonly tenues: T.Object3D[] = [];
  private tenueSuivante = 0;
  /**
   * Silhouette à donner au joueur. Les avatars scannés portent leur propre
   * squelette et leur marche ; une silhouette sans os reçoit, faute de mieux,
   * un léger balancement.
   */
  corpsJoueur: string | null = 'avatar-homme-meshy-opt.glb';
  private images = 0;
  private varie = false;
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

  /** Charge le modèle articulé et ses deux animations. */
  async charger(base = '/modeles/') {
    const integres = (globalThis as {__modeles?: Record<string, string>}).__modeles;
    const chargeur = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const url = (nom: string) => integres?.[nom] ?? base + nom;
    const [marcheur, coureur, ...debout] = await Promise.all([
      chargeur.loadAsync(url('marcheur.glb')),
      chargeur.loadAsync(url('coureur.glb'))
        .catch(e => { console.warn('course indisponible : ' + (e instanceof Error ? e.message : e)); return undefined; }),
      ...['personnage1.glb', 'perso2.glb', 'go2.glb', 'vendeuse.glb', 'avatar-homme-meshy-opt.glb', 'avatar-femme-meshy-opt.glb', 'passante-cotonou-walk.glb'].map(n => chargeur.loadAsync(url(n))
        .catch(e => { console.warn(`silhouette ${n} indisponible : ${e instanceof Error ? e.message : e}`); return undefined; })),
    ]);
    const nomsDebout = ['personnage1.glb', 'perso2.glb', 'go2.glb', 'vendeuse.glb', 'avatar-homme-meshy-opt.glb', 'avatar-femme-meshy-opt.glb', 'passante-cotonou-walk.glb'];
    // Marche de référence : celle de l'avatar féminin, bras relâchés, pas posé,
    // comme les passantes filmées sur la Corniche et devant l'Esplanade. Les
    // clips d'origine des passants sont une démarche de défilé main sur la
    // hanche (marcheur.glb) et une gestuelle bras levés (passante).
    const femme = debout[nomsDebout.indexOf('avatar-femme-meshy-opt.glb')];
    const marcheNaturelle = femme?.animations[0];
    const transferer = (cible: T.Object3D, secours?: T.AnimationClip) => {
      if (!femme || !marcheNaturelle) return secours;
      try { return transfererAnimation(cible, femme.scene, marcheNaturelle) ?? secours; }
      catch (e) { console.warn('marche transférée indisponible : ' + (e instanceof Error ? e.message : e)); return secours; }
    };
    debout.forEach((lot, i) => {
      if (!lot) return;
      lot.scene.traverse(n => { const m = n as T.Mesh; if (m.isMesh) { m.castShadow = nomsDebout[i] !== 'vendeuse.glb'; m.receiveShadow = true; } });
      this.debout.set(nomsDebout[i], lot.scene);
      // Les avatars scannés sont réservés au joueur : ce sont des corps de
      // quatre-vingt mille triangles, et la ville n’a pas besoin de sosies. Leur
      // marche native sert aussi de course, à cadence plus vive, plutôt que de
      // télécharger un second fichier avant d’afficher le joueur.
      if (nomsDebout[i] === 'passante-cotonou-walk.glb') this.clipsAvatar.set(nomsDebout[i], {marche: transferer(lot.scene, animationSurPlace(lot.animations[0])), neutre: .08});
      // Pose d'arrêt de chaque marche : l'instant où les deux pieds se croisent.
      else if (nomsDebout[i].startsWith('avatar-')) this.clipsAvatar.set(nomsDebout[i], {marche: animationSurPlace(lot.animations[0]), neutre: nomsDebout[i].includes('homme') ? .6 : .08});
      else this.silhouettes.push(lot.scene);
    });
    this.modele = marcheur.scene;
    // Le maillage de marcheur.glb est sculpté mains sur les hanches : ses bras ne
    // peuvent pas pendre, mais ses jambes prennent le pas naturel.
    this.clipMarche = transferer(marcheur.scene, marcheur.animations[0]);
    this.clipCourse = coureur?.animations[0];
    const passanteScan = this.debout.get('passante-cotonou-walk.glb');
    if (passanteScan) corrigerPassante(passanteScan);
    if (passanteScan) for (const pantalon of PANTALONS) {
      const tenue = clonerSquelette(passanteScan);
      if (pantalon) try { teinterPantalon(tenue, pantalon); } catch (e) { console.warn('tenue indisponible : ' + (e instanceof Error ? e.message : e)); }
      this.tenues.push(tenue);
    }
    // Les courses des avatars pèsent onze mégaoctets : elles arrivent après la
    // ville, et le joueur marche en attendant.
    void this.chargerCourses(chargeur, url, femme);
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
   * Remplace toutes les silhouettes construites en code par un corps articulé :
   * l'avatar choisi pour le joueur, la vendeuse pour Aïcha, et pour tous les
   * autres une passante dans l'une des tenues. Les conducteurs des véhicules
   * garés gardent leur silhouette assise, et celles qui ne sont plus dans la
   * scène — conducteurs des véhicules remplacés — sont ignorées.
   */
  habiller(echelle = 1.78) {
    if (!this.modele || !this.clipMarche) return 0;
    let habilles = 0;
    for (const personnage of Personnage.tous) {
      if (this.habitants.some(h => h.personnage === personnage)) continue;
      if (!this.dansLaScene(personnage.objet) || personnage.objet.userData.conducteur) continue;
      const nom = personnage.objet.name, estJoueur = nom === 'joueur', estVendeuse = nom.startsWith('vendeuse-');
      if (estJoueur && !this.corpsJoueur) continue;
      const passanteClips = this.clipsAvatar.get('passante-cotonou-walk.glb');
      const tenue = !estJoueur && !estVendeuse && this.tenues.length && passanteClips?.marche
        ? this.tenues[this.tenueSuivante++ % this.tenues.length] : undefined;
      const choix = estJoueur ? this.debout.get(this.corpsJoueur!) : estVendeuse ? this.debout.get('vendeuse.glb') : tenue;
      if (estJoueur && !choix) continue;
      let corps: T.Object3D, clips: {marche?: T.AnimationClip; course?: T.AnimationClip; neutre?: number} | undefined, pas: Pas;
      if (choix) {
        const taille = estVendeuse ? 1.3 : estJoueur ? 1.74 : TAILLE_PASSANTE;
        corps = this.poserDebout(personnage, choix, taille, estVendeuse ? .46 : 0);
        corps.name = estVendeuse ? 'modele-vendeuse' : 'corps-personnage';
        if (estJoueur) corps.userData.avatar = this.corpsJoueur;
        clips = estJoueur ? this.clipsAvatar.get(this.corpsJoueur!) : estVendeuse ? undefined : passanteClips;
        pas = allure(taille, clips?.neutre ?? 0);
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
        bouge: estJoueur || estVendeuse, fige: !marche, reposY: corps.position.y, precedent: personnage.objet.position.clone()};
      if (nom.startsWith('passant-') && this.habitants.length % 4 === 0) {habitant.bulle = this.creerBulle(); personnage.objet.add(habitant.bulle);}
      this.habitants.push(habitant);
      if (estJoueur) {this.joueur = habitant; this.appliquerCouleurJoueur();}
      habilles++;
    }
    return habilles;
  }
  /**
   * Courses des avatars, chargées après la ville : celle du joueur et, reportée
   * sur la passante, celle des joggeuses de la piste de mise en forme.
   */
  private async chargerCourses(chargeur: GLTFLoader, url: (nom: string) => string, femme?: {scene: T.Object3D}) {
    const fichiers: [string, string][] = [['avatar-femme-meshy-opt.glb', 'avatar-femme-course-meshy-opt.glb'], ['avatar-homme-meshy-opt.glb', 'avatar-homme-course-meshy-opt.glb']];
    await Promise.all(fichiers.map(async ([avatar, fichier]) => {
      try {
        const lot = await chargeur.loadAsync(url(fichier));
        const course = animationSurPlace(lot.animations[0]);
        const clips = this.clipsAvatar.get(avatar);
        if (clips && course) clips.course = course;
        const passante = this.debout.get('passante-cotonou-walk.glb'), clipsPassante = this.clipsAvatar.get('passante-cotonou-walk.glb');
        if (avatar.includes('femme') && passante && clipsPassante && lot.animations[0] && femme)
          clipsPassante.course = transfererAnimation(passante, lot.scene, lot.animations[0]);
      } catch (e) { console.warn(`course ${fichier} indisponible : ${e instanceof Error ? e.message : e}`); }
    }));
    // Ceux qui sont déjà habillés reçoivent leur course.
    for (const h of this.habitants) {
      if (h.course || h.fige) continue;
      const clips = h === this.joueur ? this.clipsAvatar.get(this.corpsJoueur ?? '') : this.clipsAvatar.get('passante-cotonou-walk.glb');
      if (!clips?.course || h.corps.name !== 'corps-personnage') continue;
      if (h !== this.joueur && !this.tenues.length) continue;
      h.course = h.mixeur.clipAction(clips.course); h.course.play(); h.course.weight = 0;
    }
    console.info('courses articulées prêtes');
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
    h.course=clips?.course?h.mixeur.clipAction(clips.course):undefined;h.course?.play();if(h.course)h.course.weight=0;h.fige=!clips?.marche;h.bouge=true;h.reposY=h.corps.position.y;
    h.pas=allure(1.74,clips?.neutre??0);
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
    this.images++;this.temps+=dt;
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
      const pas = h.pas ?? allure(1.74, 0);
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
      const course = h.course ? T.MathUtils.smoothstep(vitesse, pas.marche * 1.65, pas.marche * 2.35) : 0;
      h.marche.weight = 1 - course; h.marche.timeScale = T.MathUtils.clamp(vitesse / pas.marche, .35, 1.9);
      if (h.course) { h.course.weight = course; h.course.timeScale = T.MathUtils.clamp(vitesse / pas.course, .5, 2.1); }
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
  private varierLesCorps() {
    this.varie = true;
    let index = 0, varies = 0, mobiles = 0;
    // La silhouette du joueur lui reste réservée : pas de sosie parmi les figurants.
    const reservee = this.corpsJoueur ? this.debout.get(this.corpsJoueur) : undefined;
    const disponibles = this.silhouettes.filter(s => s !== reservee);
    const autres = disponibles.length > 1 ? disponibles.slice(0, -1) : disponibles;
    for (const h of this.habitants) {
      if (h.personnage.objet.name === 'joueur') { mobiles++; continue; }
      // Ceux qui marchent gardent leur corps articulé : une silhouette sans
      // squelette qui se déplace n'est qu'une statue qui glisse.
      if (h.bouge) { mobiles++; continue; }
      // Le modèle de vendeuse reste réservé à Aïcha : il ne doit jamais devenir
      // un passant géant ou assis au milieu du trottoir.
      const choix = autres[index++ % Math.max(1, autres.length)];
      if (!choix) continue;
      h.mixeur.stopAllAction();
      h.corps.visible = false;
      h.corps = this.poserDebout(h.personnage, choix);
      h.reposY=h.corps.position.y;h.fige=true;
      varies++;
    }
    console.info(`silhouettes debout posées : ${varies} immobiles variées, ${mobiles} en mouvement gardent la marche`);
  }
}
