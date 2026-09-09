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

type Passage={objet:T.Object3D;debut:number;fin:number;vitesse:number;sens:number;phase:number;personne?:Personnage;portee?:number;type?:'zemidjan'|'zem-nouveau'|'voiture';accident?:number;chuteDirection?:number};
export class Rues {
  private readonly mouvements:Passage[]=[];
  private readonly feux:{groupe:T.Group;rouge:T.MeshStandardMaterial;orange:T.MeshStandardMaterial;vert:T.MeshStandardMaterial}[]=[];
  private etatFeu:'rouge'|'orange'|'vert'='rouge';
  /** Objets immobiles mais denses, masqués au-delà de leur portée. */
  private readonly statiques:{objet:T.Object3D;portee:number}[]=[];
  private temps=0;
  constructor(private readonly b:Batisseur){
    this.cornicheObservee();this.fresquePortuaire();this.carrefoursOfficiels();
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
    for(const z of [-204,-218,-231,-244,-258,-278,-291,-304,-318,-337,-350,-364,-398]){
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
      const z=20-i*25;if(z>-95||(z<-100&&z>-193))continue;
      const h=7+varie(z,9)*8;
      this.b.boite(12,h,18,this.b.tex('immeuble',1,h/5,['#e5d3b0','#bdc4b4','#d3ad90'][i%3]),45,h/2,z);
      this.b.boite(12.5,.3,18.5,'#b7afa0',45,h+.15,z);
    }
  }
  /**
   * Corniche Est d'après la vidéo de 53 secondes fournie par l'utilisateur :
   * voie récente et dégagée, éclairage solaire, murs de propriétés, bâtiment
   * religieux, immeubles en retrait, panneaux et quelques traversées piétonnes.
   */
  private cornicheObservee(){
    // Trottoir routier étroit avec caniveau continu, distinct de la promenade côté mer.
    this.b.sol(3.2,116,this.b.tex('beton',2,42,'#d8d3c8'),23.1,-34,.02);
    this.b.sol(.55,116,'#64665f',21.25,-34,-.07);
    for(let z=20;z>-92;z-=9)this.b.boite(.85,.1,2,'#cbc5b8',21.35,.02,z).castShadow=false;

    // Éclairage solaire visible des deux côtés de la chaussée.
    for(let z=18;z>-92;z-=15){
      this.lampadaireSolaire(10.55,z,1);
      this.lampadaireSolaire(21.45,z-7.5,-1);
    }

    // Deux passages piétons apparaissent aux raccords et près de l'intersection.
    for(const z of [-24,-78])for(let x=11.6;x<21;x+=1.35)
      this.b.boite(.75,.035,3,'#f2efe5',x,.03,z).castShadow=false;

    // Long édifice clair à baies verticales, vu derrière un mur sur une partie du trajet.
    const religieux=new T.Group();religieux.position.set(34,0,-31);this.b.scene.add(religieux);
    this.b.boite(13,6.2,42,'#c9c3b7',0,3.1,0,religieux);
    this.b.boite(13.7,.35,42.7,'#aaa79f',0,6.35,0,religieux);
    for(let z=-18;z<=18;z+=4.5){
      this.b.boite(.12,2.15,1.25,'#806f5c',-6.57,4.1,z,religieux);
      this.b.boite(.14,.35,1.5,'#e5ded0',-6.65,5.4,z,religieux);
    }
    this.b.boite(3.2,4.4,4.2,'#c9c3b7',0,8.1,-3,religieux);
    this.b.cyl(.12,.12,2.1,6,'#5f5b54',0,11.15,-3,religieux);
    this.b.boite(1.35,.12,.12,'#5f5b54',0,11.55,-3,religieux);

    // Immeubles contemporains en retrait, qui dépassent au-dessus du bâtiment bas.
    for(const [x,z,w,h,d] of [[43,-20,16,18,16],[47,10,13,15,15],[44,-61,12,11,18]] as const){
      this.b.boite(w,h,d,'#aeb6b4',x,h/2,z);
      for(let y=3;y<h-1;y+=2.7)this.b.boite(.12,1.35,d-1,'#4d6468',x-w/2-.07,y,z);
      this.b.boite(w+.6,.3,d+.6,'#949b98',x,h+.15,z);
    }

    // Murs d'enceinte, portails et maisons basses sur la seconde moitié.
    for(const [z,longueur,couleur] of [[-65,20,'#d8d3c6'],[-84,16,'#aac0bd']] as const){
      this.b.boite(.38,1.8,longueur,couleur,27, .9,z);
      this.b.boite(.45,2.2,.7,'#8d9690',27,1.1,z-longueur/2);
      this.b.boite(.45,2.2,.7,'#8d9690',27,1.1,z+longueur/2);
    }
    this.b.boite(12,4.5,14,'#a7bbb5',35,2.25,-80);
    this.b.boite(13,.35,15,this.b.tex('tole',4,4),35,4.68,-80);
    this.b.boite(.18,2.6,4.5,'#304c4d',26.75,1.3,-77);
    for(const [x,z] of [[32,-60],[39,-76],[34,-90]] as const)this.b.arbre(x,z,.85);
    this.enseigne('STELLA MARIS','AKPAKPA','#587b93',6.8,.9,this.b.scene,26.76,1.35,-29,-Math.PI/2);

    // Panneaux publicitaires sans marque et signal de stationnement comme dans la vidéo.
    this.panneauRoute('COTONOU', 'CORNICHE EST', 25.2, 7.2, -53, 5.5, 3.6);
    this.panneauRoute('P', 'STATIONNEMENT', 22.7, 2.5, -15, 1.2, 1.5);

    // Accotement sableux vers la fin du tronçon, planté de jeunes arbres.
    this.b.sol(9,25,this.b.tex('sable',4,10,'#c69868'),31,-91,.01);
    for(const z of [-85,-93,-101]){
      this.b.cyl(.09,.13,3.2,6,'#87745e',27.7,1.6,z);
      const couronne=this.b.sphere(.9,'#4e7548',27.7,3.25,z);couronne.scale.set(1.2,.55,1.1);
    }
  }
  /** Fresque portuaire relevée sur IMG_9338–9346, reconstruite au canvas sans incorporer la photo. */
  private fresquePortuaire(){
    const toile=document.createElement('canvas');toile.width=2048;toile.height=512;
    const c=toile.getContext('2d')!;
    c.fillStyle='#5a958d';c.fillRect(0,0,2048,512);
    const fonds=['#d5a63b','#234f63','#b9533f','#d8c082','#487d73','#9e3e42'];
    for(let i=0;i<12;i++){
      c.fillStyle=fonds[i%fonds.length];c.beginPath();c.moveTo(i*180-80,512);c.lineTo(i*180+65,0);c.lineTo(i*180+230,0);c.lineTo(i*180+90,512);c.fill();
    }
    // Mer, coques et grues rappellent l'histoire du port visible sur les clichés.
    c.fillStyle='#173f55';c.fillRect(0,385,2048,127);
    c.fillStyle='#d9d0ad';
    for(const x of [180,720,1320,1760]){c.beginPath();c.moveTo(x-120,390);c.lineTo(x+145,390);c.lineTo(x+80,445);c.lineTo(x-70,445);c.closePath();c.fill();}
    c.strokeStyle='#5b3028';c.lineWidth=15;
    for(const x of [380,1020,1570]){c.beginPath();c.moveTo(x,385);c.lineTo(x,145);c.lineTo(x+170,235);c.stroke();c.beginPath();c.moveTo(x+15,180);c.lineTo(x+140,385);c.stroke();}
    // Grandes figures peintes, volontairement stylisées.
    for(const [x,couleur] of [[95,'#e8c5a0'],[565,'#563c32'],[1140,'#e4bb91'],[1880,'#49372f']] as const){
      c.fillStyle=couleur;c.beginPath();c.arc(x,165,55,0,Math.PI*2);c.fill();
      c.beginPath();c.moveTo(x-78,380);c.quadraticCurveTo(x,205,x+78,380);c.closePath();c.fill();
      c.fillStyle='#262b2b';c.fillRect(x-35,150,18,8);c.fillRect(x+18,150,18,8);
    }
    c.strokeStyle='#f2dfaf';c.lineWidth=12;c.strokeRect(8,8,2032,496);
    const texture=new T.CanvasTexture(toile);texture.colorSpace=T.SRGBColorSpace;
    const mur=this.b.boite(.38,4.8,54,'#d9d1bd',27.7,2.4,-121);mur.name='fresque-portuaire';
    const image=new T.Mesh(new T.PlaneGeometry(54,4.45),new T.MeshStandardMaterial({map:texture,roughness:.9,side:T.DoubleSide}));
    image.position.set(27.49,2.52,-121);image.rotation.y=-Math.PI/2;this.b.scene.add(image);
    this.b.boite(.65,.2,54,'#e7e0d0',27.7,4.9,-121);
  }
  /** Grandes intersections, feux et marquages vus autour de l'Amazone et de la Cité ministérielle. */
  private carrefoursOfficiels(){
    // Le boulevard passe de deux à trois voies dans le secteur institutionnel.
    this.b.sol(15.5,106,this.b.tex('asphalte',2,20,'#777876'),17.5,-145,-.025);
    this.b.sol(4,106,this.b.tex('paves',2,36,'#d2cabd'),27.25,-145,.025);
    for(const x of [12.2,15.7,19.2,22.7])for(let z=-94;z>-196;z-=8)
      this.b.boite(.12,.03,4.2,'#eeeade',x,.025,z).castShadow=false;
    for(const x of [9.85,25.15])this.b.boite(.14,.03,104,'#eeeade',x,.025,-145).castShadow=false;
    const feu=(x:number,z:number,sens:number)=>{
      const g=new T.Group();g.position.set(x,0,z);g.name='feu-carrefour-amazone';this.b.scene.add(g);
      this.b.cyl(.09,.14,6.8,7,'#454b49',0,3.4,0,g);
      const bras=this.b.boite(3.2,.11,.11,'#454b49',sens*1.55,6.6,0,g);bras.rotation.z=sens*-.04;
      const boitier=this.b.boite(.42,1.25,.38,'#252a29',sens*3.05,6.05,0,g);
      const lampes=[] as T.MeshStandardMaterial[];
      const definitions=[[6.43,'#c93d34','rouge'],[6.05,'#d5a931','orange'],[5.67,'#3c8952','vert']] as const;
      for(const [index,[y,couleur,nom]] of definitions.entries()){
        const lampe=this.b.sphere(.105,couleur,sens*3.05,y,-.21,g);lampe.scale.z=.35;lampe.name=`feu-${nom}`;
        const materiau=(lampe.material as T.MeshStandardMaterial).clone();materiau.color.set(couleur);materiau.emissive.set(couleur);
        lampe.material=materiau;lampes[index]=materiau;
      }
      this.feux.push({groupe:g,rouge:lampes[0],orange:lampes[1],vert:lampes[2]});
      return boitier;
    };
    feu(10.5,-99,1);feu(21.5,-103,-1);
    for(const z of [-99,-103])for(let x=11.5;x<21;x+=1.25)
      this.b.boite(.72,.035,2.6,'#eeeade',x,.035,z).castShadow=false;
    for(const x of [12.1,19.9])this.b.boite(.16,.035,5.5,'#eeeade',x,.035,-94).castShadow=false;
  }
  private actualiserFeux(){
    const cycle=this.temps%16;
    this.etatFeu=cycle<5?'rouge':cycle<7?'orange':'vert';
    for(const feu of this.feux){
      feu.groupe.userData.etat=this.etatFeu;
      feu.rouge.emissiveIntensity=this.etatFeu==='rouge'?4:.08;
      feu.orange.emissiveIntensity=this.etatFeu==='orange'?4:.08;
      feu.vert.emissiveIntensity=this.etatFeu==='vert'?4:.08;
    }
  }
  private lampadaireSolaire(x:number,z:number,sens:number){
    const g=new T.Group();g.position.set(x,0,z);this.b.scene.add(g);
    this.b.cyl(.085,.14,7.4,7,'#777d79',0,3.7,0,g);
    const bras=this.b.boite(1.5,.09,.09,'#777d79',sens*.72,7.05,0,g);bras.rotation.z=sens*-.08;
    this.b.boite(.75,.12,.28,'#e7e1d4',sens*1.42,6.87,0,g);
    const panneau=this.b.boite(1.35,.09,.75,'#283d42',sens*.05,7.72,0,g);panneau.rotation.x=-.22;panneau.rotation.y=.08;
  }
  private panneauRoute(titre:string,detail:string,x:number,y:number,z:number,w:number,h:number){
    const g=new T.Group();g.position.set(x,0,z);this.b.scene.add(g);
    for(const dz of [-w*.28,w*.28])this.b.cyl(.08,.12,y-h/2,7,'#727973',0,(y-h/2)/2,dz,g);
    this.enseigne(titre,detail,'#66756f',w,h,g,0,y,0,-Math.PI/2);
  }
  private parasol(x:number,z:number,couleur:string){
    const g=new T.Group();g.position.set(x,0,z);this.b.racine.add(g);
    this.b.cyl(.055,.055,2.7,6,'#bcb39b',0,1.35,0,g);
    this.b.cone(1.9,.65,8,couleur,0,2.75,0,g);
    this.b.boite(2.3,.12,1.2,'#936344',0,1,0,g);
    for(const dx of [-.9,.9])this.b.boite(.12,1,.12,'#936344',dx,.5,0,g);
    for(let i=0;i<6;i++)this.b.sphere(.16,i%2?'#e9b036':'#688a40',-.85+i*.33,1.18,0,g);
    this.b.obstacle(x,z,2.5,1.4);
    const vendeuse=new Personnage(couleur,x,z-.8,{pagne:true});vendeuse.objet.name='vendeuse-boutique';this.b.racine.add(vendeuse.objet);
  }
  private abords(){
    // Trottoir côté commerces, caniveaux couverts et petites passerelles d'entrée.
    this.b.sol(3.6,218,this.b.tex('paves',2,62,'#cbb79a'),23,-299,.02);
    this.b.sol(.6,218,'#5e6259',21.4,-299,-.04);
    for(let z=-194;z>-408;z-=12){
      this.b.boite(.9,.11,2.5,'#bcb49e',21.45,.03,z).castShadow=false;
    }
    for(const z of [-272]){
      this.b.sol(34,8,this.b.tex('paves',12,3,'#b7b19c'),39,z,.05);
      this.enseigne('COTONOU','RUE DE QUARTIER','#34746b',3,.8,this.b.scene,22,2.7,z,-Math.PI/2);
      for(let i=0;i<7;i++)this.b.boite(.8,.02,3,'#e3ddd0',12+i*1.2,.02,z).castShadow=false;
    }
    // Kiosques et pauses proches du joueur, sans bloquer le chemin central ni le jogging.
    this.parasol(-3.8,-192,'#a65f66');this.parasol(4.4,-301,'#688b4b');this.parasol(4.4,-392,'#b98239');
    for(const [x,z] of [[-4,-285],[5.7,-326]] as const){
      this.b.boite(2.5,2.6,1.8,'#e0b845',x,1.3,z);
      this.b.boite(2.8,.14,2.1,'#d7a441',x,2.7,z);
      this.enseigne('MOBILE MONEY','RETRAIT · TRANSFERT','#366849',2.3,.6,this.b.scene,x,2.1,z+1);
      this.b.boite(1.6,.85,.07,'#3b5546',x,1.3,z+.95);this.b.obstacle(x,z,2.6,2);
    }
    // Réseaux et ombre en secteur commerçant ; jardins officiels dégagés.
    for(const debut of [-202,-292]){
      for(let z=debut;z>debut-80;z-=25){
        this.b.cyl(.13,.2,8,7,'#8e8c78',23.8,4,z);this.b.boite(2,.12,.12,'#646959',23.8,7.7,z);
        for(const dx of [-.65,.65])this.b.cable([23.8+dx,7.8,z],[23.8+dx,7.15,z-12.5],.025,'#535a50');
        for(const dx of [-.65,.65])this.b.cable([23.8+dx,7.15,z-12.5],[23.8+dx,7.8,z-25],.025,'#535a50');
      }
    }
    for(const z of [-207,-282,-322,-394])this.b.arbre(24,z,.85);
    this.enseigne('AKPAKPA','COTONOU · BORD DE L’EAU','#266a64',4,1,this.b.scene,7.3,3.2,19);
    // L'Étoile Rouge est plus dense : deux petits stands et des terrasses en retrait.
    for(const z of [-342,-369])this.parasol(23.5,z,'#a9523e');
    for(const z of [-293]){
      for(const x of [22.8,24]){this.b.boite(.65,.12,.6,'#5a8a81',x,.5,z);this.b.boite(.65,.65,.1,'#5a8a81',x,.85,z-.3);}
    }
  }
  private circulation(){
    // Une place reste disponible pour le modèle détaillé kekenon.glb.
    for(let i=1;i<20;i++){
      const type=i%5===0?'voiture':'zemidjan';const objet=vehicule(this.b,type);
      const sens=i%2?1:-1;objet.position.set(sens>0?18.3:13.6,0,25-i*22);objet.rotation.y=sens>0?0:Math.PI;
      objet.name=`circulation-${i}`;this.b.scene.add(objet);
      this.mouvements.push({objet,debut:-421,fin:43,vitesse:type==='voiture'?6.3:8.2,sens,phase:i,type});
    }
  }
  /**
   * Gabarit normalisé du zémidjan détaillé : origine au centre de la moto, au
   * niveau du sol, tourné vers le nord à rotation nulle. Les copies s'insèrent
   * alors dans un véhicule construit en code sans autre réglage.
   */
  private gabaritVehicule(objet:T.Object3D){
    const boite=new T.Box3().setFromObject(objet);
    const centre=boite.getCenter(new T.Vector3());
    const interne=objet.clone();
    interne.position.set(objet.position.x-centre.x,objet.position.y-boite.min.y,objet.position.z-centre.z);
    interne.rotation.y=objet.rotation.y;
    const gabarit=new T.Group();gabarit.add(interne);
    // Modèle dense : pas d'ombre portée, elle coûte un second rendu complet.
    gabarit.traverse(n=>{n.castShadow=false;n.receiveShadow=false;});
    return gabarit;
  }
  /**
   * Substitue le modèle détaillé au véhicule construit en boîtes : celui-ci est
   * retiré, pas seulement masqué. Aucune boîte ne subsiste donc à l'écran, à
   * quelque distance que ce soit.
   * Le gabarit pointe le nord ; les véhicules de la voie pointent le sud à rotation nulle.
   */
  private poserModele(vehicule:T.Object3D,gabarit:T.Object3D,rotationModele=Math.PI){
    vehicule.clear();
    const modele=gabarit.clone();modele.rotation.y=rotationModele;modele.name='vehicule-modele';
    vehicule.add(modele);
  }
  /**
   * Remplace les voitures construites en boîtes par le SUV détaillé.
   * Renvoie le gabarit, pour la voiture que conduit le joueur.
   */
  remplacerVoitures(objet:T.Object3D){
    const gabarit=this.gabaritVehicule(objet);
    objet.removeFromParent();
    let remplaces=0;
    for(const p of this.mouvements){
      if(p.type!=='voiture')continue;
      this.poserModele(p.objet,gabarit);
      // Le brouillard efface les véhicules bien avant 90 m : les masquer là ne se voit pas.
      p.portee=90;remplaces++;
    }
    return {gabarit,remplaces};
  }
  /**
   * Remplace les zémidjans construits en boîtes par le modèle détaillé, dans la
   * circulation comme aux bornes de transport. Un seul maillage par véhicule au
   * lieu d'une quinzaine : le rendu gagne en finesse et la scène perd des appels
   * de dessin. Renvoie le gabarit, pour le véhicule que conduit le joueur.
   */
  remplacerZemidjans(objet:T.Object3D){
    const gabarit=this.gabaritVehicule(objet);
    objet.removeFromParent();                                  // il ne sert que de gabarit
    let remplaces=0;
    for(const p of this.mouvements){
      if(p.type!=='zemidjan')continue;
      this.poserModele(p.objet,gabarit);
      p.portee=90;remplaces++;
    }
    // Motos garées aux bornes, nommées à la construction.
    for(const gare of this.b.scene.children.filter(o=>o.name.startsWith('moto-borne'))){
      this.poserModele(gare,gabarit);
      this.statiques.push({objet:gare,portee:90});remplaces++;
    }
    return {gabarit,remplaces};
  }
  /** Ajoute cinq exemplaires du second modèle de zémidjan sur les deux voies. */
  ajouterZemidjans(objet:T.Object3D,nombre=5){
    const gabarit=this.gabaritVehicule(objet);
    objet.removeFromParent();
    // Milieux des intervalles laissés par la circulation existante : aucun
    // nouveau modèle ne naît superposé à un autre véhicule.
    const departs=[4,-107,-172,-283,-348];
    for(let i=0;i<nombre;i++){
      const sens=i%2?1:-1,groupe=new T.Group();
      groupe.name=`zem-supplementaire-${i+1}`;
      groupe.position.set(sens>0?18.3:13.6,0,departs[i]??4-i*88);
      groupe.rotation.y=sens>0?0:Math.PI;
      // zem.glb regarde déjà vers l'avant dans son fichier, contrairement au
      // premier kekenon qui exige un demi-tour dans son gabarit.
      this.poserModele(groupe,gabarit,0);
      this.b.scene.add(groupe);
      this.mouvements.push({objet:groupe,debut:-421,fin:43,vitesse:7.4+i*.22,sens,phase:40+i,type:'zem-nouveau',portee:105});
    }
    return nombre;
  }
  /** Volumes des véhicules visibles, utilisés comme obstacles par le joueur. */
  obstaclesVehicules(zJoueur:number){
    return this.mouvements.filter(p=>!p.personne&&Math.abs(p.objet.position.z-zJoueur)<55)
      .map(p=>({x:p.objet.position.x,z:p.objet.position.z,w:1.9,d:3.4}));
  }
  /** Cherche autour de la borne un emplacement qui laisse quatre mètres libres. */
  placeLibreSurVoie(z:number){
    for(const decalage of [0,-5,5,-10,10,-15,15,-20,20]){
      const candidat=T.MathUtils.clamp(z+decalage,-398,18);
      const libre=this.mouvements.every(p=>p.personne||Math.abs(p.objet.position.x-14)>1.8||Math.abs(p.objet.position.z-candidat)>4.2);
      if(libre)return candidat;
    }
    return T.MathUtils.clamp(z,-398,18);
  }
  /** Renverse le véhicule de circulation le plus proche lors d'un choc. */
  percuterProche(position:T.Vector3,portee=2.8){
    let cible:Passage|undefined,distance=Infinity;
    for(const p of this.mouvements){
      if(p.personne||p.accident!==undefined)continue;
      const dx=Math.abs(p.objet.position.x-position.x),dz=Math.abs(p.objet.position.z-position.z);
      if(dx>1.8||dz>portee)continue;
      const d=dx+dz;if(d<distance){cible=p;distance=d;}
    }
    if(!cible)return null;
    cible.accident=2.7;cible.chuteDirection=cible.objet.position.x<=position.x?-1:1;
    return cible.objet.position.clone();
  }
  /** Véhicules susceptibles de heurter un piéton près du joueur. */
  vehiculesPourCollisions(zJoueur:number){
    return this.mouvements.filter(p=>!p.personne&&p.accident===undefined&&Math.abs(p.objet.position.z-zJoueur)<60)
      .map(p=>({objet:p.objet,type:p.type??'zemidjan'}));
  }
  /** Immobilise et anime le véhicule de circulation impliqué dans un accident. */
  accidenterVehicule(objet:T.Object3D){
    const cible=this.mouvements.find(p=>p.objet===objet&&!p.personne);
    if(!cible||cible.accident!==undefined)return false;
    cible.accident=2.7;cible.chuteDirection=1;return true;
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
    if(paused)return;this.temps+=dt;this.actualiserFeux();
    for(const s of this.statiques)s.objet.visible=Math.abs(s.objet.position.z-zJoueur)<s.portee;
    const vehicules=this.mouvements.filter(p=>!p.personne);
    for(const p of this.mouvements){
      if(p.personne){
        p.objet.position.z+=p.vitesse*p.sens*dt;
        if(p.objet.position.z<p.debut||p.objet.position.z>p.fin){p.sens*=-1;p.objet.position.z=T.MathUtils.clamp(p.objet.position.z,p.debut,p.fin);}
        p.objet.rotation.y=p.sens>0?0:Math.PI;
        p.personne.jambes.forEach((jambe,i)=>jambe.rotation.x=Math.sin(this.temps*5+p.phase+i*Math.PI)*.22);
      }else{
        if(p.accident!==undefined){
          p.accident-=dt;
          const ecoule=2.7-p.accident,releve=Math.min(1,Math.max(0,p.accident/.55));
          const angle=p.type==='voiture'?.14:1.28;
          p.objet.rotation.z=(p.chuteDirection??1)*angle*Math.min(1,ecoule/.24)*releve;
          if(p.accident<=0){p.accident=undefined;p.chuteDirection=undefined;p.objet.rotation.z=0;}
        }else{
          let prochain=p.objet.position.z+p.vitesse*p.sens*dt;
          if(prochain<p.debut)prochain=p.fin;if(prochain>p.fin)prochain=p.debut;
          // Dans une même voie, le véhicule suiveur attend qu'un espace de
          // sécurité se libère au lieu de traverser celui qui le précède.
          const occupe=vehicules.some(autre=>autre!==p&&Math.abs(autre.objet.position.x-p.objet.position.x)<1.3
            &&Math.abs(autre.objet.position.z-prochain)<3.3);
          const stop=p.sens>0?-105.2:-96.8;
          const franchit=p.sens>0?p.objet.position.z<stop&&prochain>=stop:p.objet.position.z>stop&&prochain<=stop;
          const bloqueFeu=this.etatFeu!=='vert'&&franchit;
          if(!occupe&&!bloqueFeu)p.objet.position.z=prochain;
        }
      }
      // Les passages éloignés ne participent ni au rendu ni aux ombres.
      p.objet.visible=Math.abs(p.objet.position.z-zJoueur)<(p.portee??115);
    }
  }
}
