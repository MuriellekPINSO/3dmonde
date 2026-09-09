import * as T from 'three';
import { Rues } from './entities/Rues';
import { Joueur, type Obstacle } from './entities/Joueur';
import { Batisseur } from './entities/Batisseur';
import { boulevard, corniche, esplanadeAmazone, citeMinisterielle, palaisMarina, palaisCongres, etoileRouge, figures, vehicule } from './entities/Monuments';
import { chargerModeles, type Pose } from './entities/Modeles';
import { Foule } from './entities/Foule';
import { MerAnimee } from './entities/MerAnimee';
import { VieUrbaine } from './entities/VieUrbaine';

/**
 * Modèles détaillés posés sur la scène. Chacun remplace son ensemble construit
 * en code, ou s’y ajoute. Un fichier absent laisse la version construite visible.
 */
const POSES: Pose[] = [
  {groupe: 'statue-amazone', fichier: 'amazone.glb', x: -19, z: -123, hauteur: 24, base: 2, rotation: Math.PI / 2},
  {groupe: 'palais-congres', fichier: 'palais-congres.glb', x: -33, z: -243, largeur: 40, base: .05, rotation: Math.PI / 2},
  // etoile-rouge.glb est ecarte : c'est un diorama sur butte de terre rouge, aux arbres
  // sans feuilles, qui ecrase la place et contredit les photos. La version construite
  // en code (pylone a bandeaux de brique, etoile rouge, arbres verts) reste en place.
  // Passantes en tenue de sport, le long de la piste de mise en forme.
  {groupe: 'joggeuse-bleue', fichier: 'joggeuse-bleue.glb', x: 9.2, z: -12, hauteur: 1.72, rotation: Math.PI, ajout: true},
  {groupe: 'joggeuse-bordeaux', fichier: 'joggeuse-bordeaux.glb', x: 4.7, z: -31, hauteur: 1.68, rotation: Math.PI * .85, ajout: true},
  // Rang de zémidjans de l’autre côté du boulevard.
  {groupe: 'zemidjans', fichier: 'zemidjans.glb', x: 27, z: -380, largeur: 13, base: -.35, rotation: -Math.PI / 2, ajout: true},
];

type Frame = {paused:boolean;running:boolean;transport:'zemidjan'|'voiture'|null;speed:number};
export class Monde {
  readonly scene = new T.Scene();
  readonly camera = new T.PerspectiveCamera(48,innerWidth/innerHeight,.1,260);
  readonly joueur = new Joueur();
  readonly keys = new Set<string>();
  readonly renderer: T.WebGLRenderer;
  readonly obstacles: Obstacle[]=[];
  private readonly soleil = new T.DirectionalLight('#ffe4b5',2.2);
  private readonly vehicules: Record<'zemidjan'|'voiture',T.Group>;
  private readonly rues: Rues;
  private readonly foule = new Foule(this.scene);
  private readonly mer: MerAnimee;
  private readonly vie: VieUrbaine;
  private passagerMoto?: T.Group;
  private accident=0;
  onAccident?:(type:'vehicule'|'personnage')=>void;
  private yaw = 0;
  /** Inclinaison du regard : négative vers le sol, positive vers le ciel. */
  private pitch = -.3;
  readonly axesManette = {x: 0, z: 0};
  get player(){return this.joueur.objet;}

  /** Oriente la caméra avec le joystick droit, en radians par seconde. */
  regarderManette(x:number,y:number,dt:number){
    this.yaw-=x*2.35*dt;
    this.pitch=T.MathUtils.clamp(this.pitch-y*1.9*dt,-.95,.95);
  }

  /**
   * Quitte la borne à la montée et engage le véhicule sur la voie de droite.
   * Sans ce déplacement, un joueur placé près du poteau pouvait démarrer dans
   * son volume de collision et rester bloqué malgré le statut « en véhicule ».
   */
  engagerTransportSurVoie() {
    this.keys.clear();
    this.axesManette.x = this.axesManette.z = 0;
    this.player.position.x = 14;
    this.player.position.y = .15;
    this.player.position.z = this.rues.placeLibreSurVoie(this.player.position.z);
    this.player.rotation.y = Math.PI;
    this.yaw = 0;
  }

  constructor(host:HTMLElement){
    const ciel=document.createElement('canvas');ciel.width=1024;ciel.height=512;
    const pinceau=ciel.getContext('2d')!,degrade=pinceau.createLinearGradient(0,0,0,ciel.height);
    degrade.addColorStop(0,'#82bac8');degrade.addColorStop(.62,'#c8e1df');degrade.addColorStop(1,'#e7dfc6');
    pinceau.fillStyle=degrade;pinceau.fillRect(0,0,ciel.width,ciel.height);
    pinceau.fillStyle='#fffdf3';pinceau.globalAlpha=.2;
    for(const [x,y,s] of [[120,125,1],[410,82,.75],[735,145,1.15],[930,65,.68]] as const){
      for(const [dx,dy,r] of [[-55,8,.72],[0,0,1],[58,10,.65]] as const){
        pinceau.beginPath();pinceau.ellipse(x+dx*s,y+dy*s,68*r*s,18*r*s,0,0,Math.PI*2);pinceau.fill();
      }
    }
    pinceau.globalAlpha=1;
    const textureCiel=new T.CanvasTexture(ciel);textureCiel.colorSpace=T.SRGBColorSpace;
    this.scene.background=textureCiel;this.scene.fog=new T.Fog('#d1dfd5',75,215);
    this.renderer=new T.WebGLRenderer({antialias:true});this.renderer.setSize(innerWidth,innerHeight);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.outputColorSpace=T.SRGBColorSpace;
    this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.08;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
    host.append(this.renderer.domElement);this.renderer.domElement.setAttribute('aria-label','Balade 3D dans quatre zones de Cotonou');
    this.scene.add(new T.HemisphereLight('#fff5dd','#648979',1.9));
    this.soleil.castShadow=true;this.soleil.shadow.mapSize.set(2048,2048);this.soleil.shadow.bias=-.0006;
    Object.assign(this.soleil.shadow.camera,{left:-55,right:55,top:60,bottom:-60,far:150});
    this.scene.add(this.soleil,this.soleil.target);

    const batisseur=new Batisseur(this.scene,this.obstacles);
    boulevard(batisseur);this.mer=corniche(batisseur);esplanadeAmazone(batisseur);citeMinisterielle(batisseur);
    palaisMarina(batisseur);palaisCongres(batisseur);etoileRouge(batisseur);
    this.rues=new Rues(batisseur);figures(batisseur);
    this.vie=new VieUrbaine(this.scene);
    // La scène construite s’affiche tout de suite ; les modèles la remplacent dès qu’ils arrivent.
    const poses:Pose[]=[...POSES,{
      groupe:'kekenon-circulation',fichier:'kekenon.glb',x:13.6,z:18,
      hauteur:2.05,base:.03,rotation:-Math.PI/2,ajout:true,
      apresPose:objet=>this.adopterZemidjanDetaille(objet),
    },{
      // SUV détaillé : circulation et voiture du joueur.
      groupe:'peugeot-circulation',fichier:'peugeot.glb',x:18.3,z:18,
      hauteur:1.68,base:.03,rotation:-Math.PI/2,ajout:true,
      apresPose:objet=>this.adopterVoitureDetaillee(objet),
    },{
      // Quatre voitures d'un seul maillage : elles ne peuvent pas rouler séparément,
      // mais font un stationnement crédible derrière le panneau « P » de la Corniche.
      groupe:'voitures-garees',fichier:'voitures.glb',x:32.5,z:6,
      largeur:10,base:.02,ajout:true,
    },{
      // Second modèle fourni : cinq copies supplémentaires roulent sur les deux voies.
      groupe:'zem-supplementaires',fichier:'zem.glb',x:14,z:4,
      hauteur:2.05,base:.03,rotation:0,ajout:true,
      apresPose:objet=>console.info(`nouveaux zémidjans : ${this.rues.ajouterZemidjans(objet,5)} ajoutés à la circulation`),
    }];
    // Personnages articulés : ils remplacent toutes les silhouettes construites.
    this.foule.charger().then(async info=>{
      const habilles=this.foule.habiller();
      const passager=this.foule.creerPassagerMoto();
      if(passager){this.passagerMoto=passager;this.scene.add(passager);}
      console.info(`personnages articulés : ${habilles} habillés, ${info.triangles} triangles le modèle`
        +`${info.course?', marche et course':', marche seule'}, ${info.silhouettes} silhouettes debout`);
    }).catch(e=>console.warn('personnages articulés indisponibles : '+(e instanceof Error?e.message:e)));
    chargerModeles(batisseur,poses).then(journal=>{
      for(const entree of journal){
        const texte=`modèle ${entree.groupe} : ${entree.etat}${entree.detail?' — '+entree.detail:''}`;
        if(entree.etat==='échec')console.warn(texte);else console.info(texte);
      }
    });
    this.scene.add(this.player);
    this.vehicules={zemidjan:vehicule(batisseur,'zemidjan'),voiture:vehicule(batisseur,'voiture')};
    this.vehicules.zemidjan.name='vehicule-joueur-zemidjan';this.vehicules.voiture.name='vehicule-joueur-voiture';
    Object.values(this.vehicules).forEach(g=>{g.visible=false;this.scene.add(g);});

    this.camera.position.set(0,9,25);
    let drag=false,lastX=0,lastY=0;
    const canvas=this.renderer.domElement;
    canvas.addEventListener('pointerdown',e=>{drag=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId);});
    canvas.addEventListener('pointermove',e=>{
      if(!drag)return;
      this.yaw-=(e.clientX-lastX)*.005;
      // Glisser vers le bas lève le regard, comme si l’on abaissait le décor.
      this.pitch=Math.min(.95,Math.max(-.95,this.pitch+(e.clientY-lastY)*.004));
      lastX=e.clientX;lastY=e.clientY;
    });
    canvas.addEventListener('pointerup',()=>drag=false);canvas.addEventListener('pointercancel',()=>drag=false);
    addEventListener('resize',()=>{this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight);});
  }
  /**
   * Fait passer tous les zémidjans au modèle détaillé : ceux de la circulation,
   * ceux garés aux bornes, et celui que conduit le joueur.
   */
  private adopterZemidjanDetaille(objet:T.Object3D){
    const {gabarit,remplaces}=this.rues.remplacerZemidjans(objet);
    // Le véhicule du joueur suit la même convention d’orientation que la circulation.
    const monture=this.vehicules.zemidjan;
    monture.clear();
    const copie=gabarit.clone();copie.rotation.y=Math.PI;monture.add(copie);
    console.info(`zémidjans détaillés : ${remplaces} sur la voie et aux bornes, plus celui du joueur`);
  }
  /** Fait passer les voitures de la circulation, et celle du joueur, au SUV détaillé. */
  private adopterVoitureDetaillee(objet:T.Object3D){
    const {gabarit,remplaces}=this.rues.remplacerVoitures(objet);
    const monture=this.vehicules.voiture;
    monture.clear();
    const copie=gabarit.clone();copie.rotation.y=Math.PI;monture.add(copie);
    console.info(`voitures détaillées : ${remplaces} sur la voie, plus celle du joueur`);
  }
  start(update:(dt:number)=>Frame){
    const target=new T.Vector3(),desired=new T.Vector3(),regard=new T.Vector3();let last=0;
    this.renderer.setAnimationLoop(time=>{
      const dt=Math.min((time-last)/1000||0,.1);last=time;const state=update(dt);
      const avant=this.player.position.clone(),enAccident=this.accident>0;
      const obstacles=[...this.obstacles,...this.rues.obstaclesVehicules(this.player.position.z)];
      const mouvement=this.joueur.deplacer(this.keys,this.yaw,dt,state.speed,state.paused||enAccident,obstacles,!!state.transport,this.axesManette);
      this.rues.actualiser(dt,state.paused,this.player.position.z);
      if(state.transport&&!enAccident&&mouvement.moving){
        const chocVehicule=this.rues.percuterProche(this.player.position,mouvement.bloque?3:1.65);
        const chocPersonnage=chocVehicule?null:this.foule.percuterProche(this.player.position,state.transport==='voiture'?1.8:1.45);
        const collision=chocVehicule??chocPersonnage?.position;
        if(collision){
          this.player.position.copy(avant);
          const recul=new T.Vector2(avant.x-collision.x,avant.z-collision.z);
          if(recul.lengthSq()>.001){recul.normalize().multiplyScalar(chocPersonnage?2.1:3.5);this.player.position.set(collision.x+recul.x,.15,collision.z+recul.y);}
          this.accident=2.7;this.keys.clear();this.axesManette.x=this.axesManette.z=0;
          this.onAccident?.(chocPersonnage?'personnage':'vehicule');
        }
      }
      // La circulation autonome obéit à la même règle : si un piéton se trouve
      // sur sa trajectoire, il tombe et le véhicule impliqué s'immobilise.
      if(!state.paused)for(const vehicule of this.rues.vehiculesPourCollisions(this.player.position.z)){
        const choc=this.foule.percuterProche(vehicule.objet.position,vehicule.type==='voiture'?1.8:1.4);
        if(choc&&this.rues.accidenterVehicule(vehicule.objet)&&choc.position.distanceTo(this.player.position)<28)this.onAccident?.('personnage');
      }
      if(this.accident>0)this.accident=Math.max(0,this.accident-dt);
      if(!state.paused){this.foule.actualiser(dt);this.mer.actualiser(dt);this.vie.actualiser(dt,this.player,mouvement.moving,state.transport,state.running);}
      // Les deux modèles détaillés embarquent leur propre conducteur : le personnage
      // en boîtes s'effacerait sinon derrière lui, ou se superposerait au pilote.
      this.player.visible=!state.transport;
      const angle=state.transport==='voiture'?.14:1.28;
      const chute=this.accident>0?angle*Math.min(1,(2.7-this.accident)/.24)*Math.min(1,this.accident/.55):0;
      for(const [id,g] of Object.entries(this.vehicules)){g.visible=id===state.transport;if(g.visible){g.position.copy(this.player.position);g.rotation.y=this.player.rotation.y;g.rotation.z=chute;}}
      if(this.passagerMoto){
        const embarque=state.transport==='zemidjan';this.passagerMoto.visible=embarque;
        if(embarque){
          const direction=new T.Vector3(Math.sin(this.player.rotation.y),0,Math.cos(this.player.rotation.y));
          this.passagerMoto.position.copy(this.player.position).addScaledVector(direction,-.62);
          this.passagerMoto.position.y+=.27;this.passagerMoto.rotation.y=this.player.rotation.y;this.passagerMoto.rotation.z=chute;
        }
      }
      this.soleil.position.set(this.player.position.x-25,45,this.player.position.z+22);this.soleil.target.position.copy(this.player.position);
      target.copy(this.player.position);target.y+=1.3;
      // La caméra s’abaisse à mesure que le joueur lève les yeux, pour dégager le ciel
      // et le sommet des monuments, hauts de vingt-cinq à trente-cinq mètres.
      const recul=12,hauteur=2.4+Math.max(0,-this.pitch)*10;
      desired.set(target.x+Math.sin(this.yaw)*recul,target.y+hauteur,target.z+Math.cos(this.yaw)*recul);
      // Champ de vision et mouvement de caméra progressifs selon l'allure.
      const fovCible=mouvement.moving?(state.transport==='voiture'?58:state.transport==='zemidjan'?55:state.running?52:49):48;
      this.camera.fov=T.MathUtils.lerp(this.camera.fov,fovCible,1-Math.exp(-dt*3.8));this.camera.updateProjectionMatrix();
      if(mouvement.moving&&!state.transport){const cadence=state.running?12:8,ampleur=state.running?.1:.045;desired.y+=Math.sin(time/1000*cadence)*ampleur;desired.x+=Math.cos(time/1000*cadence*.5)*ampleur*.32;}
      if(this.accident>0){const force=Math.min(1,this.accident/.45)*Math.min(1,(2.7-this.accident)/.12);desired.x+=Math.sin(time*.075)*.2*force;desired.y+=Math.cos(time*.09)*.12*force;}
      this.camera.position.lerp(desired,1-Math.exp(-dt*6));
      regard.set(-Math.sin(this.yaw)*Math.cos(this.pitch),Math.sin(this.pitch),-Math.cos(this.yaw)*Math.cos(this.pitch))
        .multiplyScalar(25).add(this.camera.position);
      this.camera.lookAt(regard);this.renderer.render(this.scene,this.camera);
    });
  }
}
