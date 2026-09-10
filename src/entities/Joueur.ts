import * as T from 'three';
export type Obstacle = {x:number;z:number;w:number;d:number};
export type ResultatDeplacement = {moving:boolean;bloque:boolean;vitesse:number};
/** Palette d’un personnage : le torse porte la couleur principale. */
export type Tenue = {peau?:string;jambes?:string;casque?:string;pagne?:boolean};
const matieres = new Map<string,T.MeshStandardMaterial>();
function mat(c:string){if(!matieres.has(c))matieres.set(c,new T.MeshStandardMaterial({color:c,roughness:.85}));return matieres.get(c)!;}
const sphere=new T.SphereGeometry(1,10,8);
const membre=new T.CapsuleGeometry(.085,.44,3,6);
export class Personnage {
  readonly objet = new T.Group();
  readonly jambes: T.Mesh[] = [];
  /** Silhouette construite en code, masquée dès qu’un modèle articulé la remplace. */
  readonly pieces: T.Mesh[] = [];
  readonly couleur: string;
  readonly pagne: boolean;
  /**
   * Tous les personnages créés, pour qu’un modèle articulé puisse les remplacer
   * sans que chaque appelant ait à s’en occuper.
   */
  static readonly tous: Personnage[] = [];
  constructor(couleur:string,x:number,z:number,tenue:Tenue={}){
    this.couleur=couleur;this.pagne=!!tenue.pagne;Personnage.tous.push(this);
    const peau=tenue.peau??'#79513b',bas=tenue.jambes??'#344b50';
    this.objet.position.set(x,.15,z);
    const piece=(geo:T.BufferGeometry,c:string,x:number,y:number,z:number)=>{
      const m=new T.Mesh(geo,mat(c));m.position.set(x,y,z);m.castShadow=true;
      this.objet.add(m);this.pieces.push(m);return m;
    };
    const torse=piece(new T.CylinderGeometry(.23,.18,.65,8),couleur,0,1.12,0);torse.scale.z=.65;
    piece(new T.CylinderGeometry(.07,.08,.15,8),peau,0,1.53,0);
    const tete=piece(sphere,peau,0,1.77,0);tete.scale.set(.18,.23,.17);
    const cheveux=piece(sphere,tenue.casque??'#292720',0,1.88,-.025);cheveux.scale.set(.185,.14,.17);
    if(tenue.pagne){
      piece(new T.CylinderGeometry(.18,.32,.68,9),couleur,0,.76,0);
      for(const y of [.5,.7,.9])piece(new T.CylinderGeometry(.28-(y-.5)*.2,.28-(y-.5)*.2,.045,9),'#e8bb62',0,y,0);
    }
    for(const sens of [-1,1]){
      const jambe=piece(membre,bas,sens*.13,.43,0);this.jambes.push(jambe);
      const chaussure=piece(sphere,'#424b43',sens*.13,.105,.06);chaussure.scale.set(.105,.08,.19);
      const bras=piece(membre,peau,sens*.29,1.04,0);bras.rotation.z=sens*.07;
      const manche=piece(new T.CylinderGeometry(.105,.095,.24,7),couleur,sens*.29,1.3,0);manche.rotation.z=sens*.07;
    }
  }
}
export class Joueur extends Personnage {
  private phase = 0;
  private vitesseVehicule = 0;
  constructor() { super('#f3b94f',1.5,132); this.objet.name = 'joueur'; }
  deplacer(keys: Set<string>, yaw:number, dt:number, vitesse:number, paused:boolean, obstacles:Obstacle[], vehicule:boolean, analog={x:0,z:0}) {
    const clavierX=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('q')||keys.has('a')||keys.has('arrowleft'));
    const clavierZ=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('z')||keys.has('w')||keys.has('arrowup'));
    const dx=paused?0:Math.max(-1,Math.min(1,clavierX+analog.x));
    const dz=paused?0:Math.max(-1,Math.min(1,clavierZ+analog.z));
    let moving=!!(dx||dz);
    let bloque=false;
    const p=this.objet.position;
    const rayon=vehicule?.85:.3;
    const can=(x:number,z:number)=>{
      // Le premier tronçon possède un chemin côtier accessible. Plus loin, la
      // mer rejoint le garde-corps de la promenade aménagée.
      const ouest=z>30?-24:-8, est=24;
      return x>ouest+rayon&&x<est-rayon&&z>-407&&z<150
        &&!obstacles.some(o=>Math.abs(x-o.x)<o.w/2+rayon&&Math.abs(z-o.z)<o.d/2+rayon);
    };
    if(vehicule){
      const acceleration=vitesse>=18?11:8.5,frein=18;
      const commande=Math.max(-1,Math.min(1,-(clavierZ+analog.z)));
      const cible=commande>=0?commande*vitesse:commande*vitesse*.38;
      const reponse=(Math.sign(cible)!==Math.sign(this.vitesseVehicule)&&Math.abs(this.vitesseVehicule)>.3)?frein:acceleration;
      this.vitesseVehicule=T.MathUtils.lerp(this.vitesseVehicule,cible,1-Math.exp(-dt*reponse/Math.max(4,vitesse)));
      if(!commande)this.vitesseVehicule*=Math.exp(-dt*2.5);
      if(paused)this.vitesseVehicule*=Math.exp(-dt*12);
      if(Math.abs(this.vitesseVehicule)<.035)this.vitesseVehicule=0;
      const directionVitesse=Math.sign(this.vitesseVehicule)||1;
      const braquage=Math.max(-1,Math.min(1,clavierX+analog.x));
      if(!paused&&Math.abs(this.vitesseVehicule)>.15)this.objet.rotation.y-=braquage*directionVitesse*dt*(vitesse>=18?1.25:1.65)*(.32+.68*Math.min(1,Math.abs(this.vitesseVehicule)/vitesse));
      const vx=Math.sin(this.objet.rotation.y)*this.vitesseVehicule*dt,vz=Math.cos(this.objet.rotation.y)*this.vitesseVehicule*dt;
      if(!paused&&Math.abs(this.vitesseVehicule)>.02){
        if(can(p.x+vx,p.z))p.x+=vx;else if(Math.abs(vx)>.0001)bloque=true;
        if(can(p.x,p.z+vz))p.z+=vz;else if(Math.abs(vz)>.0001)bloque=true;
        if(bloque)this.vitesseVehicule*=-.12;
      }
      moving=Math.abs(this.vitesseVehicule)>.12;
      return {moving,bloque,vitesse:Math.abs(this.vitesseVehicule)} satisfies ResultatDeplacement;
    }
    this.vitesseVehicule=0;
    if(moving){
      const amplitude=Math.min(1,Math.hypot(dx,dz)),len=Math.hypot(dx,dz);
      const vx=(dx*Math.cos(yaw)+dz*Math.sin(yaw))/len*vitesse*dt*amplitude;
      const vz=(-dx*Math.sin(yaw)+dz*Math.cos(yaw))/len*vitesse*dt*amplitude;
      if(can(p.x+vx,p.z))p.x+=vx;else if(Math.abs(vx)>.0001)bloque=true;
      if(can(p.x,p.z+vz))p.z+=vz;else if(Math.abs(vz)>.0001)bloque=true;
      this.objet.rotation.y=Math.atan2(vx,vz);
      this.phase+=dt*(vitesse>4?15:9);
    }
    this.jambes.forEach((l,i)=>l.rotation.x=moving&&!vehicule?Math.sin(this.phase+i*Math.PI)*.5:0);
    return {moving,bloque,vitesse:moving?vitesse*Math.min(1,Math.hypot(dx,dz)):0} satisfies ResultatDeplacement;
  }
}
