import * as T from 'three';

export type ModeMeteo='auto'|'soleil'|'pluie';

/** Pluie tropicale légère, flaques et cycle d'heure sans texture distante. */
export class Meteo {
  private readonly positions=new Float32Array(900*3);
  private readonly pluie:T.Points;
  private readonly flaques:T.Mesh[]=[];
  private temps=0;
  private mode:ModeMeteo='auto';
  private pleut=false;

  constructor(private readonly scene:T.Scene){
    for(let i=0;i<this.positions.length;i+=3){
      this.positions[i]=(Math.random()-.5)*48;this.positions[i+1]=Math.random()*28;this.positions[i+2]=(Math.random()-.5)*70;
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(this.positions,3));
    const mat=new T.PointsMaterial({color:'#d6edf1',size:.085,transparent:true,opacity:.72,depthWrite:false,fog:true});
    this.pluie=new T.Points(geo,mat);this.pluie.name='pluie-tropicale';this.pluie.frustumCulled=false;this.pluie.visible=false;scene.add(this.pluie);
    for(const [x,z,s] of [[15,-35,1],[18,-118,.8],[13,-225,1.15],[17,-340,.9]] as const){
      const flaque=new T.Mesh(new T.CircleGeometry(2.6*s,24),new T.MeshStandardMaterial({color:'#718e8e',roughness:.18,metalness:.1,transparent:true,opacity:.34}));
      flaque.rotation.x=-Math.PI/2;flaque.position.set(x,.035,z);flaque.name='flaque-route';flaque.visible=false;scene.add(flaque);this.flaques.push(flaque);
    }
  }

  regler(mode:ModeMeteo){this.mode=mode;}
  get etat(){return this.pleut?'Pluie tropicale':'Ciel clair';}

  actualiser(dt:number,joueur:T.Object3D,heure:number){
    this.temps+=dt;
    const automatique=(this.temps%150)>105;
    this.pleut=this.mode==='pluie'||(this.mode==='auto'&&automatique);
    this.pluie.visible=this.pleut;for(const f of this.flaques)f.visible=this.pleut;
    if(this.pleut){
      this.pluie.position.set(joueur.position.x,0,joueur.position.z-12);
      for(let i=0;i<this.positions.length;i+=3){
        this.positions[i+1]-=dt*(18+(i%17));this.positions[i]+=.8*dt;
        if(this.positions[i+1]<.1){this.positions[i]=(Math.random()-.5)*48;this.positions[i+1]=22+Math.random()*8;this.positions[i+2]=(Math.random()-.5)*70;}
      }
      (this.pluie.geometry.getAttribute('position') as T.BufferAttribute).needsUpdate=true;
    }
    const nuit=heure<6||heure>19.5,soir=heure>17||heure<7;
    this.scene.fog?.color.set(this.pleut?'#849c9d':nuit?'#162d42':soir?'#bea879':'#d1dfd5');
  }
}
