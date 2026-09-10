import * as T from 'three';

type ModeDeplacement = 'zemidjan'|'voiture'|null;
type Oiseaux = {groupe:T.Group;geometrie:T.BufferGeometry;repos:Float32Array;phase:number};
type ElementVent = {objet:T.Object3D;rotationX:number;rotationZ:number;phase:number};
type Grain = {vie:number;x:number;y:number;z:number;vx:number;vy:number;vz:number};
type Animal={groupe:T.Group;debut:number;fin:number;sens:number;vitesse:number;phase:number};

/**
 * Petits mouvements d'ambiance qui donnent de la continuité à la ville sans
 * charger des modèles supplémentaires : oiseaux, poussière et souffle du vent.
 */
export class VieUrbaine {
  private temps=0;
  private emission=0;
  private readonly grains:Grain[]=[];
  private readonly positions=new Float32Array(72*3);
  private readonly poussiere:T.Points;
  private readonly oiseaux:Oiseaux[]=[];
  private readonly vent:ElementVent[]=[];
  private readonly animaux:Animal[]=[];

  constructor(private readonly scene:T.Object3D){
    const groupe=new T.Group();groupe.name='vie-urbaine';scene.add(groupe);
    this.positions.fill(-1000);
    const geometrie=new T.BufferGeometry();geometrie.setAttribute('position',new T.BufferAttribute(this.positions,3));
    const toile=document.createElement('canvas');toile.width=toile.height=64;
    const c=toile.getContext('2d')!,degrade=c.createRadialGradient(32,32,2,32,32,30);
    degrade.addColorStop(0,'rgba(244,220,174,.72)');degrade.addColorStop(1,'rgba(205,174,125,0)');
    c.fillStyle=degrade;c.fillRect(0,0,64,64);
    const carte=new T.CanvasTexture(toile);carte.colorSpace=T.SRGBColorSpace;
    this.poussiere=new T.Points(geometrie,new T.PointsMaterial({map:carte,color:'#ead4a9',size:.42,transparent:true,opacity:.42,depthWrite:false,sizeAttenuation:true}));
    this.poussiere.name='poussiere-deplacement';this.poussiere.frustumCulled=false;groupe.add(this.poussiere);
    for(let i=0;i<3;i++)this.creerVolee(groupe,i);
    this.creerAnimal(groupe,'chèvre',22.8,-214,-240,-190,'#d8c39d');
    this.creerAnimal(groupe,'chèvre',-4.5,-330,-370,-302,'#71594a');
    this.creerAnimal(groupe,'chien',22.5,-72,-91,-50,'#9a6f45');
    scene.traverse(objet=>{
      if(objet.name==='palmes'||objet.name==='toile-drapeau'||objet.name.startsWith('nuage-3d-'))
        this.vent.push({objet,rotationX:objet.rotation.x,rotationZ:objet.rotation.z,phase:this.vent.length*1.37});
    });
  }

  private creerAnimal(parent:T.Object3D,nom:string,x:number,z:number,debut:number,fin:number,couleur:string){
    const g=new T.Group();g.name=`animal-${nom}-${this.animaux.length+1}`;g.position.set(x,0,z);parent.add(g);
    const mat=new T.MeshStandardMaterial({color:couleur,roughness:.9}),sombre=new T.MeshStandardMaterial({color:'#362f29',roughness:1});
    const corps=new T.Mesh(new T.CapsuleGeometry(.22,.55,3,7),mat);corps.rotation.z=Math.PI/2;corps.position.y=.48;g.add(corps);
    const tete=new T.Mesh(new T.SphereGeometry(.22,8,6),mat);tete.position.set(0,.68,-.5);g.add(tete);
    for(const dx of [-.16,.16])for(const dz of [-.28,.3]){const patte=new T.Mesh(new T.CylinderGeometry(.035,.045,.38,5),sombre);patte.position.set(dx,.22,dz);g.add(patte);}
    this.animaux.push({groupe:g,debut,fin,sens:this.animaux.length%2?1:-1,vitesse:.36+this.animaux.length*.07,phase:this.animaux.length*1.7});
  }

  private creerVolee(parent:T.Object3D,index:number){
    const positions:number[]=[];
    for(let i=0;i<9;i++){
      const colonne=i%5,ligne=Math.floor(i/5),x=(colonne-2)*2.2+(ligne?1.1:0),z=ligne*2.3+Math.abs(colonne-2)*.65;
      positions.push(x-.42,0,z,x,.13,z, x,.13,z,x+.42,0,z);
    }
    const repos=new Float32Array(positions),geometrie=new T.BufferGeometry();
    geometrie.setAttribute('position',new T.BufferAttribute(new Float32Array(positions),3));
    const trait=new T.LineBasicMaterial({color:'#243a38',transparent:true,opacity:.72,fog:true});
    const lignes=new T.LineSegments(geometrie,trait),groupe=new T.Group();
    groupe.name=`oiseaux-ville-${index+1}`;groupe.add(lignes);groupe.scale.setScalar(1.15+index*.12);parent.add(groupe);
    this.oiseaux.push({groupe,geometrie,repos,phase:index*2.1});
  }

  /** Anime le décor autour de la position actuelle pour qu'il reste visible sur toute la carte. */
  actualiser(dt:number,joueur:T.Object3D,enMouvement:boolean,mode:ModeDeplacement,course:boolean){
    this.temps+=dt;
    const vitesse=enMouvement?(mode==='voiture'?18:mode==='zemidjan'?12:course?7:4):0;
    this.emission+=dt*(mode?vitesse*1.15:course?9:enMouvement?4.5:0);
    while(this.emission>=1){this.emission--;this.emettre(joueur,mode);}
    this.animerPoussiere(dt);
    for(const [i,volee] of this.oiseaux.entries()){
      const cycle=(this.temps*(5.5+i*.7)+volee.phase*23)%125;
      volee.groupe.position.set(joueur.position.x-62+cycle,24+i*5+Math.sin(this.temps*.45+volee.phase)*2,joueur.position.z-42-i*18);
      volee.groupe.rotation.y=.12*Math.sin(this.temps*.24+volee.phase);
      const attr=volee.geometrie.getAttribute('position') as T.BufferAttribute,tableau=attr.array as Float32Array;
      tableau.set(volee.repos);
      const battement=Math.sin(this.temps*7.5+volee.phase)*.17;
      for(let p=1;p<tableau.length;p+=6)tableau[p]+=battement;
      for(let p=7;p<tableau.length;p+=12)tableau[p]-=battement;
      attr.needsUpdate=true;
    }
    for(const element of this.vent){
      const souffle=Math.sin(this.temps*1.8+element.phase)+.35*Math.sin(this.temps*4.1+element.phase*.7);
      element.objet.rotation.x=element.rotationX+souffle*.018;
      element.objet.rotation.z=element.rotationZ+souffle*(element.objet.name==='toile-drapeau'?.055:.025);
    }
    for(const animal of this.animaux){
      animal.groupe.position.z+=animal.vitesse*animal.sens*dt;
      if(animal.groupe.position.z<animal.debut||animal.groupe.position.z>animal.fin){animal.sens*=-1;animal.groupe.position.z=T.MathUtils.clamp(animal.groupe.position.z,animal.debut,animal.fin);}
      animal.groupe.rotation.y=animal.sens>0?0:Math.PI;animal.groupe.position.y=Math.abs(Math.sin(this.temps*4+animal.phase))*.025;
      animal.groupe.visible=Math.abs(animal.groupe.position.z-joueur.position.z)<75;
    }
  }

  private emettre(joueur:T.Object3D,mode:ModeDeplacement){
    if(this.grains.length>=72)this.grains.shift();
    const a=Math.random()*Math.PI*2,r=Math.random()*(mode?1.05:.42),direction=joueur.rotation.y;
    this.grains.push({vie:.5+Math.random()*.65,x:joueur.position.x+Math.cos(a)*r,y:.12,z:joueur.position.z+Math.sin(a)*r,
      vx:-Math.sin(direction)*(.12+Math.random()*.18)+(Math.random()-.5)*.16,vy:.18+Math.random()*.2,
      vz:-Math.cos(direction)*(.12+Math.random()*.18)+(Math.random()-.5)*.16});
  }

  private animerPoussiere(dt:number){
    for(let i=this.grains.length-1;i>=0;i--){
      const g=this.grains[i];g.vie-=dt;
      if(g.vie<=0){this.grains.splice(i,1);continue;}
      g.x+=g.vx*dt;g.y+=g.vy*dt;g.z+=g.vz*dt;
    }
    this.positions.fill(-1000);
    this.grains.forEach((g,i)=>{this.positions[i*3]=g.x;this.positions[i*3+1]=g.y;this.positions[i*3+2]=g.z;});
    (this.poussiere.geometry.getAttribute('position') as T.BufferAttribute).needsUpdate=true;
  }
}
