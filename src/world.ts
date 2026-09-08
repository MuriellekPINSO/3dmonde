import * as T from 'three';
import { Rues } from './entities/Rues';
import { Joueur, type Obstacle } from './entities/Joueur';
import { Batisseur } from './entities/Batisseur';
import { boulevard, corniche, esplanadeAmazone, palaisMarina, palaisCongres, etoileRouge, figures, vehicule } from './entities/Monuments';
import { chargerModeles, type Pose } from './entities/Modeles';

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
  private yaw = 0;
  /** Inclinaison du regard : négative vers le sol, positive vers le ciel. */
  private pitch = -.3;
  get player(){return this.joueur.objet;}

  constructor(host:HTMLElement){
    this.scene.background=new T.Color('#c9e4df');this.scene.fog=new T.Fog('#c9e4df',60,190);
    this.renderer=new T.WebGLRenderer({antialias:true});this.renderer.setSize(innerWidth,innerHeight);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
    host.append(this.renderer.domElement);this.renderer.domElement.setAttribute('aria-label','Balade 3D dans quatre zones de Cotonou');
    this.scene.add(new T.HemisphereLight('#fff5dd','#648979',1.9));
    this.soleil.castShadow=true;this.soleil.shadow.mapSize.set(2048,2048);this.soleil.shadow.bias=-.0006;
    Object.assign(this.soleil.shadow.camera,{left:-55,right:55,top:60,bottom:-60,far:150});
    this.scene.add(this.soleil,this.soleil.target);

    const batisseur=new Batisseur(this.scene,this.obstacles);
    boulevard(batisseur);corniche(batisseur);esplanadeAmazone(batisseur);
    palaisMarina(batisseur);palaisCongres(batisseur);etoileRouge(batisseur);
    this.rues=new Rues(batisseur);figures(batisseur);
    // La scène construite s’affiche tout de suite ; les modèles la remplacent dès qu’ils arrivent.
    chargerModeles(batisseur,POSES).then(journal=>{
      for(const entree of journal){
        const texte=`modèle ${entree.groupe} : ${entree.etat}${entree.detail?' — '+entree.detail:''}`;
        if(entree.etat==='échec')console.warn(texte);else console.info(texte);
      }
    });
    this.scene.add(this.player);
    this.vehicules={zemidjan:vehicule(batisseur,'zemidjan'),voiture:vehicule(batisseur,'voiture')};
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
  start(update:(dt:number)=>Frame){
    const target=new T.Vector3(),desired=new T.Vector3(),regard=new T.Vector3();let last=0;
    this.renderer.setAnimationLoop(time=>{
      const dt=Math.min((time-last)/1000||0,.05);last=time;const state=update(dt);
      this.joueur.deplacer(this.keys,this.yaw,dt,state.speed,state.paused,this.obstacles,!!state.transport);
      this.rues.actualiser(dt,state.paused,this.player.position.z);
      this.player.visible=state.transport!=='voiture';
      for(const [id,g] of Object.entries(this.vehicules)){g.visible=id===state.transport;if(g.visible){g.position.copy(this.player.position);g.rotation.y=this.player.rotation.y;}}
      this.soleil.position.set(this.player.position.x-25,45,this.player.position.z+22);this.soleil.target.position.copy(this.player.position);
      target.copy(this.player.position);target.y+=1.3;
      // La caméra s’abaisse à mesure que le joueur lève les yeux, pour dégager le ciel
      // et le sommet des monuments, hauts de vingt-cinq à trente-cinq mètres.
      const recul=12,hauteur=2.4+Math.max(0,-this.pitch)*10;
      desired.set(target.x+Math.sin(this.yaw)*recul,target.y+hauteur,target.z+Math.cos(this.yaw)*recul);
      this.camera.position.lerp(desired,1-Math.exp(-dt*6));
      regard.set(-Math.sin(this.yaw)*Math.cos(this.pitch),Math.sin(this.pitch),-Math.cos(this.yaw)*Math.cos(this.pitch))
        .multiplyScalar(25).add(this.camera.position);
      this.camera.lookAt(regard);this.renderer.render(this.scene,this.camera);
    });
  }
}
