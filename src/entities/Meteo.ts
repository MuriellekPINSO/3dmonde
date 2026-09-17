import * as T from 'three';

export type ModeMeteo='auto'|'soleil'|'pluie';

/** Pluie tropicale, flaques, éclairs et tonnerre de synthèse, sans texture ni fichier distant. */
export class Meteo {
  private readonly positions=new Float32Array(900*3);
  private readonly pluie:T.Points;
  private readonly flaques:T.Mesh[]=[];
  private temps=0;
  private mode:ModeMeteo='auto';
  private pleut=false;
  /** Éclairs : délai aléatoire, force du flash restant et lumière dédiée. */
  private delaiEclair=8;
  private flash=0;
  private eclair?:T.DirectionalLight;
  /** Tonnerre : ampli fermé tant qu'aucun haut-parleur ne peut parler. */
  onTonnerre?:(puissance:number)=>void;

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
      // L'orage dramatise : un éclair frappe au hasard en trois pulsations
      // rapprochées (0,9 s au total), et le tonnerre gronde un peu plus tard.
      this.flash=Math.max(0,this.flash-dt*3.2);
      if(this.delaiEclair<=0){
        this.flash=.9+Math.random()*.4;
        this.delaiEclair=4+Math.random()*11;
        const retard=.2+Math.random()*.9;
        window.setTimeout(()=>this.onTonnerre?.(1-retard),retard*1000);
      }
      this.delaiEclair-=dt;
      if(!this.eclair){this.eclair=new T.DirectionalLight('#eef7ff',0);this.scene.add(this.eclair,this.eclair.target);}
      this.eclair.intensity=this.flash*4.2;
      this.eclair.position.set(joueur.position.x+26,58,joueur.position.z-20);
      this.eclair.target.position.copy(joueur.position);
      // Le scintillement : après la première pointe, un écho bref.
      if(this.flash>0&&this.flash<.55&&this.delaiEclair>10)this.flash=this.flash<.4?.75:this.flash*.82;
    }else{
      this.flash=0;
      if(this.eclair)this.eclair.intensity=0;
    }
    const nuit=heure<6||heure>19.5,soir=heure>17||heure<7;
    this.scene.fog?.color.set(this.pleut?'#849c9d':nuit?'#162d42':soir?'#bea879':'#d1dfd5');
  }
}
