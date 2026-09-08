import * as T from 'three';
import { Batisseur, varie } from './Batisseur';
import { Personnage } from './Joueur';
import { vehicule } from './Monuments';

/** Enseignes fictives : scènes inspirées de références de Cotonou, sans copier un commerce. */
const commerces = [
  ['LA PAUSE D’AKPAKPA','CAFÉ · PAIN · PETIT DÉJEUNER','#375f60'],
  ['ATELIER ÉLÉGANCE','COUTURE · PAGNES · RETOUCHES','#a14652'],
  ['LE COIN MOBILE','TÉLÉPHONES · ACCESSOIRES','#387980'],
  ['CHEZ MAMAN','CUISINE DU JOUR · SUR PLACE','#b57032'],
  ['COIFFURE MIXTE','TRESSES · COUPE · SOINS','#725280'],
  ['SERVICES EXPRESS','TRANSFERT · RETRAIT · RECHARGE','#bc7733'],
  ['QUINCAILLERIE','OUTILLAGE · PEINTURE','#425e71'],
  ['FRUITS DE SAISON','ANANAS · ORANGES · BANANES','#477d4d'],
];

type Passage={objet:T.Group;debut:number;fin:number;vitesse:number;sens:number;phase:number;personne?:Personnage};
export class Rues {
  private readonly mouvements:Passage[]=[];
  private temps=0;
  constructor(private readonly b:Batisseur){
    this.facades();this.abords();this.circulation();this.passants();
  }
  private enseigne(titre:string,detail:string,couleur:string,w:number,h:number,parent:T.Object3D,x:number,y:number,z:number,rotation=0){
    const toile=document.createElement('canvas');toile.width=1024;toile.height=256;
    const c=toile.getContext('2d')!;c.fillStyle=couleur;c.fillRect(0,0,1024,256);
    c.strokeStyle='#fff4d6';c.lineWidth=7;c.strokeRect(13,13,998,230);
    c.textAlign='center';c.fillStyle='#fff7df';c.font='bold 57px sans-serif';c.fillText(titre,512,112,940);
    c.font='28px sans-serif';c.fillText(detail,512,182,940);
    const map=new T.CanvasTexture(toile);map.colorSpace=T.SRGBColorSpace;
    const mesh=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map,roughness:.9,side:T.DoubleSide}));
    mesh.position.set(x,y,z);mesh.rotation.y=rotation;parent.add(mesh);return mesh;
  }
  private facades(){
    // Les bâtiments bordent le boulevard, avec deux percées latérales ; la Marina reste dégagée.
    let index=0;
    for(const z of [19,7,-5,-17,-29,-41,-58,-70,-82,-204,-218,-231,-244,-258,-278,-291,-304,-318,-337,-350,-364,-398]){
      const [titre,detail,accent]=commerces[index%commerces.length];
      const g=new T.Group();g.name=`rue-commerce-${index}`;g.position.set(28+varie(z,2)*2,0,z);g.rotation.y=-Math.PI/2;this.b.scene.add(g);
      const w=9.5,h=index%3===0?8:4.3,depth=8;
      this.b.boite(w,h,depth,['#e4c59d','#d8d6bd','#e0a385','#b1c4b7','#d2b6a8'][index%5],0,h/2,0,g);
      this.b.boite(w+.6,.22,depth+.7,this.b.tex('tole',4,3),0,h+.15,0,g);
      // Vraies ouvertures sombres, piliers et rideau métallique plutôt qu'une façade répétée.
      for(const x of [-2.35,2.35]){
        this.b.boite(3.45,2.6,.12,'#354b48',x,1.45,4.06,g);
        this.b.boite(.2,2.9,.3,'#f0dfbf',x-1.82,1.45,4.12,g);
      }
      this.b.boite(w,.23,.65,'#b6a68b',0,.14,4.35,g);
      this.enseigne(titre,detail,accent,9,1.1,g,0,3.5,4.12);
      const awning=this.b.boite(10,.12,2.9,accent,0,2.85,5.35,g);awning.rotation.x=.12;
      for(const x of [-4.5,4.5])this.b.cyl(.045,.045,2.7,5,'#7a7966',x,1.35,6.7,g);
      if(h>5){
        for(const x of [-2.4,2.4]){this.b.boite(2.8,1.7,.08,'#47696c',x,6.2,4.06,g);this.b.boite(3.5,.16,1.1,'#ede0c6',x,5.1,4.5,g);}
        this.b.boite(9,.1,.1,'#48675d',0,5.85,5,g);
        for(let x=-4.4;x<4.5;x+=.65)this.b.boite(.06,.7,.06,'#48675d',x,5.5,5,g);
        this.b.boite(1.25,.55,.6,'#dedfd0',3.6,7.4,4.4,g);
      }
      // Étal et accessoires sous les auvents, motifs de pagnes et bassines.
      if(index%4===1){
        for(let i=0;i<4;i++){
          const tissu=this.b.boite(1.1,1.8,.06,['#247a8b','#c1852c','#9a4865','#2f7654'][i],-3.2+i*1.9,1.6,5,g);
          for(let j=0;j<3;j++)this.b.boite(.35,.25,.02,'#f2cf78',-.3+j*.3,0,.05,tissu);
        }
      }else{
        const activite=index%8;
        if(activite===4){
          // Salon : miroirs et fauteuils, pas d'étal alimentaire.
          for(const x of [-2.7,2.7]){
            this.b.boite(1.3,1.5,.08,'#bbc9c4',x,1.8,4.2,g);
            this.b.boite(.7,.16,.7,'#73566a',x,.65,5,g);
            this.b.boite(.7,.6,.12,'#73566a',x,.95,4.7,g);
            this.b.cyl(.1,.18,.55,6,'#808986',x,.3,5,g);
          }
        }else for(const x of [-3,2.3]){
          this.b.boite(2, .75,1,'#9a7149',x,.45,5.2,g);
          for(let i=0;i<3;i++){
            const px=x-.6+i*.55;
            if(activite===7)this.b.sphere(.22,i%2?'#dc9d30':'#5e914d',px,1,5.2,g);
            else if(activite===2)this.b.boite(.23,.035,.4,'#243d48',px,.86,5.2,g);
            else if(activite===6){this.b.cyl(.19,.19,.36,8,['#af654c','#558281','#d8bc64'][i],px,1,5.2,g);}
            else if(activite===3){this.b.cyl(.2,.15,.17,8,'#bcc4b6',px,.92,5.2,g);}
            else if(activite===0){const pain=this.b.sphere(.17,'#d8aa61',px,1,5.2,g);pain.scale.set(.6,.6,1.8);}
          }
          if(activite===5)this.b.boite(.55,.3,.3,'#364f49',x,1,5.2,g);
        }
      }
      const personne=new Personnage(accent,0,0,{pagne:index%3===0});personne.objet.position.set(-1,.12,5.4);g.add(personne.objet);
      index++;
    }
    // Une deuxième profondeur bâtie donne une silhouette de quartier derrière les devantures.
    for(let i=0;i<17;i++){
      const z=20-i*25;if(z<-100&&z>-193)continue;
      const h=7+varie(z,9)*8;
      this.b.boite(12,h,18,this.b.tex('immeuble',1,h/5,['#e5d3b0','#bdc4b4','#d3ad90'][i%3]),45,h/2,z);
      this.b.boite(12.5,.3,18.5,'#b7afa0',45,h+.15,z);
    }
  }
  private parasol(x:number,z:number,couleur:string){
    const g=new T.Group();g.position.set(x,0,z);this.b.racine.add(g);
    this.b.cyl(.055,.055,2.7,6,'#bcb39b',0,1.35,0,g);
    this.b.cone(1.9,.65,8,couleur,0,2.75,0,g);
    this.b.boite(2.3,.12,1.2,'#936344',0,1,0,g);
    for(const dx of [-.9,.9])this.b.boite(.12,1,.12,'#936344',dx,.5,0,g);
    for(let i=0;i<6;i++)this.b.sphere(.16,i%2?'#e9b036':'#688a40',-.85+i*.33,1.18,0,g);
    this.b.obstacle(x,z,2.5,1.4);
    const vendeuse=new Personnage(couleur,x,z-.8,{pagne:true});this.b.racine.add(vendeuse.objet);
  }
  private abords(){
    // Trottoir côté commerces, caniveaux couverts et petites passerelles d'entrée.
    this.b.sol(3.6,436,this.b.tex('paves',2,110,'#cbb79a'),23,-193,.02);
    this.b.sol(.6,436,'#5e6259',21.4,-193,-.04);
    for(let z=20;z>-408;z-=12){
      this.b.boite(.9,.11,2.5,'#bcb49e',21.45,.03,z).castShadow=false;
    }
    for(const z of [-50,-272]){
      this.b.sol(34,8,this.b.tex('paves',12,3,'#b7b19c'),39,z,.05);
      this.enseigne('COTONOU','RUE DE QUARTIER','#34746b',3,.8,this.b.scene,22,2.7,z,-Math.PI/2);
      for(let i=0;i<7;i++)this.b.boite(.8,.02,3,'#e3ddd0',12+i*1.2,.02,z).castShadow=false;
    }
    // Kiosques et pauses proches du joueur, sans bloquer le chemin central ni le jogging.
    this.parasol(-3.8,-46,'#c27737');this.parasol(3.6,-68,'#4c8383');
    this.parasol(-3.8,-192,'#a65f66');this.parasol(4.4,-301,'#688b4b');this.parasol(4.4,-392,'#b98239');
    for(const [x,z] of [[-4,-80],[-4,-285],[5.7,-326]] as const){
      this.b.boite(2.5,2.6,1.8,'#e0b845',x,1.3,z);
      this.b.boite(2.8,.14,2.1,'#d7a441',x,2.7,z);
      this.enseigne('MOBILE MONEY','RETRAIT · TRANSFERT','#366849',2.3,.6,this.b.scene,x,2.1,z+1);
      this.b.boite(1.6,.85,.07,'#3b5546',x,1.3,z+.95);this.b.obstacle(x,z,2.6,2);
    }
    // Réseaux et ombre en secteur commerçant ; jardins officiels dégagés.
    for(const debut of [16,-202,-292]){
      for(let z=debut;z>debut-80;z-=25){
        this.b.cyl(.13,.2,8,7,'#8e8c78',23.8,4,z);this.b.boite(2,.12,.12,'#646959',23.8,7.7,z);
        for(const dx of [-.65,.65])this.b.cable([23.8+dx,7.8,z],[23.8+dx,7.15,z-12.5],.025,'#535a50');
        for(const dx of [-.65,.65])this.b.cable([23.8+dx,7.15,z-12.5],[23.8+dx,7.8,z-25],.025,'#535a50');
      }
    }
    for(const z of [-17,-63,-207,-282,-322,-394])this.b.arbre(24,z,.85);
    this.enseigne('AKPAKPA','COTONOU · BORD DE L’EAU','#266a64',4,1,this.b.scene,7.3,3.2,19);
    // L'Étoile Rouge est plus dense : deux petits stands et des terrasses en retrait.
    for(const z of [-342,-369])this.parasol(23.5,z,'#a9523e');
    for(const z of [-40,-72,-293]){
      for(const x of [22.8,24]){this.b.boite(.65,.12,.6,'#5a8a81',x,.5,z);this.b.boite(.65,.65,.1,'#5a8a81',x,.85,z-.3);}
    }
  }
  private circulation(){
    for(let i=0;i<20;i++){
      const type=i%5===0?'voiture':'zemidjan';const objet=vehicule(this.b,type);
      const sens=i%2?1:-1;objet.position.set(sens>0?18.3:13.6,0,25-i*22);objet.rotation.y=sens>0?0:Math.PI;
      objet.name=`circulation-${i}`;this.b.scene.add(objet);
      this.mouvements.push({objet,debut:-421,fin:43,vitesse:type==='voiture'?6.3:8.2,sens,phase:i});
    }
  }
  private passants(){
    const trajets=[[-3.2,-84,-54],[-3.4,-207,-179],[-3.4,-320,-276],[4,-378,-348],[23,-85,18],[24,-310,-278],[23,-405,-338]];
    trajets.forEach(([x,debut,fin],i)=>{
      const personne=new Personnage(['#c5754a','#447e88','#698756','#995764'][i%4],x,(debut+fin)/2,{pagne:i%3===0});
      personne.objet.name=`passant-${i}`;this.b.scene.add(personne.objet);
      this.mouvements.push({objet:personne.objet,debut,fin,vitesse:.8+i*.06,sens:i%2?1:-1,phase:i,personne});
    });
  }
  actualiser(dt:number,paused:boolean,zJoueur:number){
    if(paused)return;this.temps+=dt;
    for(const p of this.mouvements){
      p.objet.position.z+=p.vitesse*p.sens*dt;
      if(p.personne){
        if(p.objet.position.z<p.debut||p.objet.position.z>p.fin){p.sens*=-1;p.objet.position.z=T.MathUtils.clamp(p.objet.position.z,p.debut,p.fin);}
        p.objet.rotation.y=p.sens>0?0:Math.PI;
        p.personne.jambes.forEach((jambe,i)=>jambe.rotation.x=Math.sin(this.temps*5+p.phase+i*Math.PI)*.22);
      }else{
        if(p.objet.position.z<p.debut)p.objet.position.z=p.fin;
        if(p.objet.position.z>p.fin)p.objet.position.z=p.debut;
      }
      // Les passages éloignés ne participent ni au rendu ni aux ombres.
      p.objet.visible=Math.abs(p.objet.position.z-zJoueur)<115;
    }
  }
}
