import * as T from 'three';
import { Batisseur, varie } from './Batisseur';
import { Personnage } from './Joueur';
import { vehicule, GIRATOIRE, horsGiratoire } from './Monuments';

/**
 * Circulation à droite, comme au Bénin : vers l'Étoile Rouge (z décroissant)
 * sur les voies est, vers la Corniche sur les voies ouest. Voie de base à
 * droite, voie de dépassement à gauche.
 */
const VOIE_ETOILE = 18.3, DEPASSEMENT_ETOILE = 20.15, VOIE_CORNICHE = 13.6, DEPASSEMENT_CORNICHE = 11.75;
const voieDe = (sens: number) => sens > 0 ? VOIE_CORNICHE : VOIE_ETOILE;
/** Demi-longueur de la zone où un véhicule quitte sa voie droite pour l'anneau. */
const APPROCHE_GIRATOIRE = 34;

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

type Passage={objet:T.Object3D;debut:number;fin:number;vitesse:number;sens:number;phase:number;personne?:Personnage;portee?:number;type?:'zemidjan'|'zem-nouveau'|'voiture'|'taxi'|'minibus';accident?:number;chuteDirection?:number;voieCible?:number;xBase?:number;
  /** Trajet en cours autour du giratoire, parcouru à l'abscisse curviligne `s`. */
  anneau?:{courbe:T.CatmullRomCurve3;s:number;longueur:number};attente?:number};
export class Rues {
  private readonly mouvements:Passage[]=[];
  private readonly feux:{groupe:T.Group;rouge:T.MeshStandardMaterial;orange:T.MeshStandardMaterial;vert:T.MeshStandardMaterial}[]=[];
  private etatFeu:'rouge'|'orange'|'vert'='rouge';
  /** Objets immobiles mais denses, masqués au-delà de leur portée. */
  private readonly statiques:{objet:T.Object3D;portee:number}[]=[];
  private temps=0;
  constructor(private readonly b:Batisseur){
    this.cornichePlage6194();this.frontPlageOuverte();this.cornicheObservee();this.fresquePortuaire();this.carrefoursOfficiels();
    this.facades();this.abords();this.circulation();this.passants();
  }
  /** Mobilier du premier tronçon, relevé dans les 17 secondes de IMG_6194.MOV. */
  private cornichePlage6194(){
    for(let z=140;z>36;z-=14)this.lampadaireSolaire(-4.6,z,-1);
    this.panneauPieton(-4.7,116);
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
      // Le giratoire de l'Étoile Rouge occupe cette portion du front bâti.
      if(!horsGiratoire(28,z,38))continue;
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
        // Climatiseurs, descentes d'eau et stores donnent aux façades une
        // profondeur quotidienne absente des simples volumes texturés.
        for(const x of [-3.6,3.6]){
          this.b.boite(.72,.58,.28,'#d7d9d2',x,6.05,4.25,g);
          const grille=this.b.cyl(.2,.2,.035,12,'#77817d',x,6.05,4.42,g);grille.rotation.x=Math.PI/2;
        }
        this.b.cyl(.055,.07,h-1.1,6,'#7d8580',4.25,(h-1.1)/2,4.22,g);
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
      const z=20-i*25;if(z>-95||(z<-100&&z>-193)||!horsGiratoire(45,z,50))continue;
      const h=7+varie(z,9)*8;
      this.b.boite(12,h,18,this.b.tex('immeuble',1,h/5,['#e5d3b0','#bdc4b4','#d3ad90'][i%3]),45,h/2,z);
      this.b.boite(12.5,.3,18.5,'#b7afa0',45,h+.15,z);
      // Balcons, réservoirs et cages d'escalier cassent la répétition de la
      // rangée lointaine sans ajouter de nouvelles textures lourdes.
      for(let y=3.2;y<h-1;y+=3.1){
        this.b.boite(1.4,.16,14,'#d8d2c4',38.9,y,z).castShadow=false;
        for(let dz=-6;dz<=6;dz+=1.5)this.b.boite(.05,.72,.05,'#596965',38.25,y+.38,z+dz).castShadow=false;
      }
      this.b.cyl(.55,.55,1.1,12,'#303b3d',45,h+.85,z);
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

    // La seconde moitié du côté ville est occupée par le mur peint du port (fresquePortuaire).
    for(const [x,z] of [[32,-60],[39,-76],[34,-90]] as const)this.b.arbre(x,z,.85);
    this.enseigne('STELLA MARIS','AKPAKPA','#587b93',6.8,.9,this.b.scene,26.76,1.35,-29,-Math.PI/2);

    // Panneaux publicitaires sans marque et signal de stationnement comme dans la vidéo.
    this.panneauRoute('COTONOU', 'CORNICHE EST', 25.2, 7.2, -53, 5.5, 3.6);
    this.panneauRoute('P', 'STATIONNEMENT', 22.7, 2.5, -15, 1.2, 1.5);

    // Accotement sableux vers la fin du tronçon, planté de jeunes arbres.
    this.b.sol(9,25,this.b.tex('sable',4,10,'#c69868'),31,-91,.01);
    for(const z of [-96,-101]){
      this.b.cyl(.09,.13,3.2,6,'#87745e',27.7,1.6,z);
      const couronne=this.b.sphere(.9,'#4e7548',27.7,3.25,z);couronne.scale.set(1.2,.55,1.1);
    }

    // Quartier résidentiel très vert aperçu dans TOUR.mp4 : villas blanches,
    // toits orangés, murs bas, jardins et bassins derrière le premier front bâti.
    const villas=new T.Group();villas.name='quartier-villas-tour';this.b.scene.add(villas);
    for(const [index,z] of [15,-12,-43,-73].entries()){
      const x=57+(index%2)*3,w=12+(index%2)*2,d=16;
      const parcelle=new T.Group();parcelle.position.set(x,0,z);villas.add(parcelle);
      this.b.sol(w+7,d+7,this.b.tex('gazon',5,5,'#6d944f'),x,z,.015);
      this.b.boite(w,4.5,d,'#f0eadc',0,2.25,0,parcelle);
      const toit=this.b.cone(9.2,2.7,4,index%2?'#b76137':'#c87342',0,5.65,0,parcelle);
      toit.rotation.y=Math.PI/4;toit.scale.set(w/13,1,d/13);
      for(const dz of [-4,0,4])this.b.boite(.12,1.55,1.9,'#385b62',-w/2-.07,2.55,dz,parcelle);
      this.b.boite(.16,2.35,3.1,'#6f5843',-w/2-.09,1.3,-5.2,parcelle);
      this.b.boite(w+7,.95,.22,'#ded6c6',0,.48,d/2+3.45,parcelle);
      this.b.boite(.22,.95,d+7,'#ded6c6',-w/2-3.45,.48,0,parcelle);
      this.b.sol(4.5,7,'#54a3ad',x+w/2+1.1,z-2,.055).name=`piscine-villa-${index+1}`;
      for(const [dx,dz] of [[-w/2-1,-d/2-1],[w/2+1,d/2+1]] as const)this.b.arbre(x+dx,z+dz,.42);
    }
  }
  /**
   * Fresque du mur du port, relevée sur IMG_9338–9346 : elle suit la Corniche
   * juste après STELLA MARIS, avant l'Esplanade de l'Amazone. Elle se dressait
   * auparavant devant la Cité ministérielle et traversait le rez-de-chaussée du
   * Palais de la Marina. Six panneaux figuratifs reconstruits au canvas, sans
   * reprendre les photos : carte d'Afrique tenue à deux mains, pêcheur au
   * chapeau devant des voiliers, mains et pagnes, visages géométriques, danseuses
   * au soleil, visage aux oranges. Le mur est couronné d'une bande de claustras
   * et les grues du port dépassent derrière.
   */
  private fresquePortuaire(){
    const debut=-54,fin=-93,longueur=debut-fin,centre=(debut+fin)/2,L=4096,H=512,panneau=L/6;
    const toile=document.createElement('canvas');toile.width=L;toile.height=H;
    const c=toile.getContext('2d')!;
    const buste=(x:number,y:number,e:number,peau:string,habit:string,chapeau?:string)=>{
      c.fillStyle=habit;c.beginPath();c.moveTo(x-95*e,H);c.quadraticCurveTo(x-90*e,y+95*e,x,y+80*e);c.quadraticCurveTo(x+90*e,y+95*e,x+95*e,H);c.fill();
      c.fillStyle=peau;c.fillRect(x-18*e,y+45*e,36*e,40*e);
      c.beginPath();c.ellipse(x,y,46*e,58*e,0,0,Math.PI*2);c.fill();
      c.fillStyle='#1d1612';c.fillRect(x-22*e,y-6*e,12*e,6*e);c.fillRect(x+10*e,y-6*e,12*e,6*e);
      c.fillStyle='#5a3024';c.fillRect(x-14*e,y+26*e,28*e,6*e);
      if(chapeau){c.fillStyle=chapeau;c.beginPath();c.ellipse(x,y-40*e,92*e,18*e,0,0,Math.PI*2);c.fill();c.fillRect(x-48*e,y-92*e,96*e,52*e);}
    };
    const voilier=(x:number,y:number,e:number)=>{
      c.fillStyle='#5b3423';c.beginPath();c.moveTo(x-70*e,y);c.lineTo(x+70*e,y);c.lineTo(x+48*e,y+26*e);c.lineTo(x-50*e,y+26*e);c.closePath();c.fill();
      c.strokeStyle='#3a2418';c.lineWidth=4*e;c.beginPath();c.moveTo(x,y);c.lineTo(x,y-120*e);c.stroke();
      c.fillStyle='#efe6cf';c.beginPath();c.moveTo(x+4*e,y-112*e);c.lineTo(x+58*e,y-12*e);c.lineTo(x+4*e,y-12*e);c.fill();
      c.beginPath();c.moveTo(x-4*e,y-98*e);c.lineTo(x-46*e,y-14*e);c.lineTo(x-4*e,y-14*e);c.fill();
    };
    // 1. Globe bleu nuit, Afrique ocre tenue à deux mains.
    let x0=0;c.fillStyle='#16295a';c.fillRect(x0,0,panneau,H);
    for(let i=0;i<60;i++){c.fillStyle='#cfd9ff';c.fillRect(x0+((i*97)%panneau),(i*53)%H,3,3);}
    c.fillStyle='#2f6f9c';c.beginPath();c.arc(x0+panneau/2,H*.46,190,0,Math.PI*2);c.fill();
    const afrique=[[.30,.02],[.45,0],[.62,.05],[.70,.12],[.80,.26],[.95,.30],[.88,.42],[.78,.55],[.74,.70],[.62,.86],[.55,.98],[.47,.93],[.42,.78],[.40,.62],[.33,.50],[.20,.46],[.08,.40],[.02,.28],[.08,.15],[.18,.06]];
    c.fillStyle='#e0a93a';c.beginPath();afrique.forEach(([u,v],i)=>{const px=x0+panneau/2-150+u*300,py=H*.46-170+v*340;i?c.lineTo(px,py):c.moveTo(px,py);});c.closePath();c.fill();
    c.fillStyle='#6b3f2a';
    for(const sens of [-1,1]){c.beginPath();c.ellipse(x0+panneau/2+sens*205,H*.62,70,120,sens*-.5,0,Math.PI*2);c.fill();}
    // 2. Pêcheur au chapeau, voiliers sur fond vert-jaune.
    x0=panneau;const fond=c.createLinearGradient(x0,0,x0,H);fond.addColorStop(0,'#c9c566');fond.addColorStop(1,'#4f8a5d');
    c.fillStyle=fond;c.fillRect(x0,0,panneau,H);
    c.fillStyle='#2f6a7c';c.fillRect(x0,H*.72,panneau,H*.28);
    for(const [dx,e] of [[.2,1],[.78,.8],[.9,.6]] as const)voilier(x0+panneau*dx,H*.76,e);
    buste(x0+panneau*.48,H*.40,1.9,'#6b4330','#f1ece0','#d9c79a');
    c.strokeStyle='#5a3a26';c.lineWidth=10;for(const d of [-40,40]){c.beginPath();c.moveTo(x0+panneau*.48+d,H*.62);c.lineTo(x0+panneau*.48+d*.8,H);c.stroke();}
    // 3. Mains et pagnes sur fond clair.
    x0=panneau*2;c.fillStyle='#ece6da';c.fillRect(x0,0,panneau,H);
    for(const [i,couleur] of ['#6a3f94','#2a64a8','#e27b2c','#c8325a'].entries()){
      c.fillStyle=couleur;c.beginPath();c.moveTo(x0+i*170,H);c.quadraticCurveTo(x0+i*170+110,H*.2,x0+i*170+260,H*.55);c.lineTo(x0+i*170+230,H);c.fill();
    }
    c.fillStyle='#7a4a33';for(const [dx,dy] of [[.25,.35],[.62,.28]] as const){c.beginPath();c.ellipse(x0+panneau*dx,H*dy,85,48,.4,0,Math.PI*2);c.fill();for(let d=0;d<4;d++)c.fillRect(x0+panneau*dx-60+d*34,H*dy-80,20,60);}
    c.fillStyle='#f7f3ea';c.beginPath();c.ellipse(x0+panneau*.45,H*.62,120,42,0,0,Math.PI*2);c.fill();
    // 4. Visages géométriques aux couleurs vives.
    x0=panneau*3;const vives=['#e3337e','#1fb4c9','#f2c21b','#7b3fb3','#f06a2a','#2d9c5b'];
    for(let i=0;i<18;i++){c.fillStyle=vives[i%vives.length];c.beginPath();c.moveTo(x0+(i%6)*panneau/6,(i<6?0:i<12?H/3:H*2/3));c.lineTo(x0+((i%6)+1)*panneau/6,(i<6?0:i<12?H/3:H*2/3)+(i%2?H/3:0));c.lineTo(x0+(i%6)*panneau/6+(i%3)*40,(i<6?H/3:i<12?H*2/3:H));c.fill();}
    buste(x0+panneau*.3,H*.42,1.5,'#4a2c20','#1b1b2e');buste(x0+panneau*.72,H*.45,1.35,'#8a5a3c','#f2c21b');
    // 5. Danseuses et marchandes sous un grand soleil.
    x0=panneau*4;c.fillStyle='#c8392b';c.fillRect(x0,0,panneau,H);
    c.fillStyle='#f4c542';c.beginPath();c.arc(x0+panneau*.5,H*.38,150,0,Math.PI*2);c.fill();
    for(const [dx,couleur,bras] of [[.18,'#1c4f8c',1],[.36,'#f2e3c2',0],[.55,'#2d7f4f',1],[.74,'#6a2d7a',0],[.9,'#f08a24',1]] as const){
      const x=x0+panneau*dx,y=H*.5;c.fillStyle='#3a2217';c.beginPath();c.arc(x,y-70,22,0,Math.PI*2);c.fill();
      c.fillStyle=couleur;c.beginPath();c.moveTo(x-20,y-45);c.lineTo(x+20,y-45);c.lineTo(x+48,H*.95);c.lineTo(x-48,H*.95);c.fill();
      c.strokeStyle='#3a2217';c.lineWidth=11;c.beginPath();
      if(bras){c.moveTo(x-18,y-38);c.lineTo(x-55,y-110);c.moveTo(x+18,y-38);c.lineTo(x+55,y-110);}
      else{c.moveTo(x-18,y-38);c.lineTo(x-30,y-100);c.moveTo(x+18,y-38);c.lineTo(x+30,y-100);c.stroke();c.fillStyle='#b77a3a';c.beginPath();c.ellipse(x,y-108,48,14,0,0,Math.PI*2);c.fill();c.beginPath();}
      c.stroke();
    }
    // 6. Grand visage entouré d'oranges et de feuilles.
    x0=panneau*5;c.fillStyle='#2b76b9';c.fillRect(x0,0,panneau,H);
    c.fillStyle='#2f7d3c';for(let i=0;i<9;i++){c.beginPath();c.ellipse(x0+60+i*75,H*(.2+(i%3)*.3),55,22,i*.7,0,Math.PI*2);c.fill();}
    buste(x0+panneau*.46,H*.42,2.3,'#5c3525','#e7e1d3');
    c.fillStyle='#f28a1e';for(const [dx,dy,r] of [[.12,.3,48],[.2,.7,56],[.8,.25,52],[.86,.62,60],[.7,.85,44]] as const){c.beginPath();c.arc(x0+panneau*dx,H*dy,r,0,Math.PI*2);c.fill();}
    // Joints clairs entre les panneaux, comme entre les œuvres des différents peintres.
    c.fillStyle='#e9e2cf';for(let i=1;i<6;i++)c.fillRect(i*panneau-6,0,12,H);
    const texture=new T.CanvasTexture(toile);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
    const mur=this.b.boite(.38,4.8,longueur,'#d9d1bd',27.7,2.4,centre);mur.name='fresque-portuaire';
    const image=new T.Mesh(new T.PlaneGeometry(longueur,4.45),new T.MeshStandardMaterial({map:texture,roughness:.9,side:T.DoubleSide}));
    image.position.set(27.49,2.52,centre);image.rotation.y=-Math.PI/2;this.b.scene.add(image);
    // Bande de claustras claire au-dessus de la peinture, puis chaperon.
    this.b.boite(.34,1.3,longueur,this.b.tex('claustra',Math.round(longueur/1.2),1,'#ece6d6'),27.7,5.45,centre);
    this.b.boite(.6,.18,longueur+.2,'#e7e0d0',27.7,6.18,centre);
    // Grues du port qui dépassent derrière le mur.
    for(const [zg,h] of [[-62,26],[-86,22]] as const){
      const g=new T.Group();g.position.set(42,0,zg);this.b.scene.add(g);
      for(const dx of [-.7,.7])for(const dz of [-.7,.7])this.b.boite(.14,h,.14,'#d8d2c2',dx,h/2,dz,g);
      for(let y=2;y<h;y+=2.2)this.b.boite(1.6,.08,1.6,'#d8d2c2',0,y,0,g).castShadow=false;
      this.b.boite(30,.7,.8,'#e1dccd',-8,h+.4,0,g);this.b.boite(6,1.4,1.2,'#9d9a90',7,h+.2,0,g);
      this.b.cable([-20,h,0],[-20,h-9,0],.05,'#555',g);
    }
  }
  private carrefoursOfficiels(){
    // Le boulevard passe de deux à trois voies dans le secteur institutionnel.
    this.b.sol(15.5,106,this.b.tex('asphalte',2,20,'#ecece8'),17.5,-145,-.025);
    this.b.sol(4,106,this.b.tex('paves',2,36,'#d2cabd'),27.25,-145,.025);
    for(const x of [12.2,15.7,19.2,22.7])for(let z=-94;z>-196;z-=8)
      this.b.boite(.12,.03,4.2,'#eeeade',x,.025,z).castShadow=false;
    for(const x of [9.85,25.15])this.b.boite(.14,.03,104,'#eeeade',x,.025,-145).castShadow=false;
    const feu=(x:number,z:number,sens:number,orientation=0)=>{
      const g=new T.Group();g.position.set(x,0,z);g.rotation.y=orientation;g.name='feu-carrefour-amazone';this.b.scene.add(g);
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
    // Chaque feu se tient à droite de la voie qu'il règle, en amont du passage ;
    // le giratoire de l'Étoile Rouge, lui, n'a pas de feux.
    feu(21.5,-97,1,Math.PI);feu(10.5,-105,1);
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
  private panneauPieton(x:number,z:number){
    const toile=document.createElement('canvas');toile.width=toile.height=256;
    const c=toile.getContext('2d')!;c.fillStyle='#f4f1e8';c.fillRect(0,0,256,256);c.fillStyle='#2365a2';c.fillRect(13,13,230,230);
    c.fillStyle='#f7f4e9';c.beginPath();c.moveTo(128,34);c.lineTo(224,214);c.lineTo(32,214);c.closePath();c.fill();
    c.strokeStyle='#252d30';c.lineWidth=12;c.lineCap='round';c.beginPath();c.arc(128,87,13,0,Math.PI*2);c.stroke();
    c.beginPath();c.moveTo(128,102);c.lineTo(117,145);c.lineTo(91,181);c.moveTo(119,139);c.lineTo(151,176);c.moveTo(122,119);c.lineTo(158,137);c.stroke();
    for(let i=0;i<4;i++){c.fillStyle='#252d30';c.fillRect(61+i*36,196,25,9);}
    const texture=new T.CanvasTexture(toile);texture.colorSpace=T.SRGBColorSpace;
    const g=new T.Group();g.name=`panneau-pieton-${Math.round(z)}`;g.position.set(x,0,z);this.b.scene.add(g);
    this.b.cyl(.065,.09,3.7,7,'#737975',0,1.85,0,g);
    const panneau=new T.Mesh(new T.PlaneGeometry(1.25,1.25),new T.MeshStandardMaterial({map:texture,roughness:.85,side:T.DoubleSide}));
    panneau.position.set(0,3.45,0);g.add(panneau);
  }
  /**
   * Front de ville qui fait face à la plage ouverte, relevé sur IMG_6202–6207 :
   * clôtures blanches à claustras et pilastres bleus, portail métallique, fonds
   * de parcelle plantés de cocotiers, complexe vert menthe à toitures en pente,
   * immeuble à balcons, terrain sableux ceint d'un mur ajouré sombre, puis
   * immeubles clairs et pylône télécom au fond. Ce côté du boulevard était vide
   * sur tout le premier tronçon : le regard partait droit dans le ciel.
   */
  private frontPlageOuverte(){
    // Trottoir et caniveau continus, dans la même coupe que le tronçon suivant.
    this.b.sol(3.2,126,this.b.tex('beton',2,45,'#d8d3c8'),23.1,87,.02);
    this.b.sol(.55,126,'#64665f',21.25,87,-.07);
    for(let z=148;z>28;z-=9)this.b.boite(.85,.1,2,'#cbc5b8',21.35,.02,z).castShadow=false;
    // Les mâts solaires se succèdent aussi côté ville sur la chaussée neuve.
    for(let z=146;z>28;z-=15)this.lampadaireSolaire(21.45,z,-1);
    // Seconde traversée piétonne, à mi-parcours de la plage ouverte.
    for(let x=10.1;x<22.2;x+=1.35)this.b.boite(.76,.035,3,'#f2efe5',x,.035,58).castShadow=false;
    this.panneauPieton(23.5,63);

    // Clôtures de propriétés, coupées par un portail puis par le terrain vague.
    this.clotureClaustra(127,42,'#eceadf','#5a86a6');
    this.portailBleu(100);
    this.clotureClaustra(85,18,'#eceadf','#5a86a6');
    this.clotureClaustra(59,30,'#cfcabb','#4d5a57');
    this.clotureClaustra(35,14,'#eceadf','#5a86a6');
    // Terrain sableux derrière le mur ajouré sombre relevé sur IMG_6203.
    this.b.sol(18,26,this.b.tex('sable',7,10,'#c99a63'),36,57,.015);
    for(const [x,z] of [[25.6,118],[25.6,119.6],[25.6,76.5],[25.6,78.1],[25.6,46]] as const)this.poubelleVerte(x,z);

    // Fonds de parcelle : cocotiers serrés, paillote et petit bâtiment patiné.
    for(let z=146;z>30;z-=9.5){
      if(z<73&&z>45)continue;
      this.b.cocotier(30.2+varie(z,3)*2.6,z+varie(z,8)*2.4,false);
    }
    this.paillote(32.5,104);
    this.b.boite(9,2.9,12,'#c3bbaa',31.5,1.45,86);
    this.b.boite(9.8,.32,12.8,'#4d7fa1',31.5,3.06,86);
    for(const [x,z] of [[29.5,76],[33,42]] as const)this.b.arbre(x,z,.8);

    // Complexe vert menthe : hangars à toiture en pente et immeuble à balcons.
    for(const z of [146,137,128])this.hangarVert(42,z,13,7.4,3.6);
    this.immeubleBalcons(41,112);
    // Longs bâtiments clairs à bandeaux, coiffés d'une tourelle cylindrique.
    this.immeubleBandeaux(43,84,14,13,26);
    this.immeubleBandeaux(43,32,13,10,18);
    // Immeubles lointains et pylône télécom, repères du fond de la photo.
    for(const [x,z,h,teinte] of [[56,134,11,'#d8a58c'],[56,100,9,'#cfd3c0'],[56,56,12,'#d3b79a']] as const){
      this.b.boite(12,h,16,this.b.tex('immeuble',1,h/5,teinte),x,h/2,z);
      this.b.boite(12.6,.3,16.6,'#b6b0a2',x,h+.15,z);
    }
    this.pyloneTelecom(52,118,19);
  }
  /**
   * Clôture de propriété de la Corniche Est : soubassement, panneaux clairs,
   * pilastres et couronnements colorés, rangée de claustras ajourés au sommet.
   */
  private clotureClaustra(z:number,longueur:number,panneau:string,accent:string){
    const g=new T.Group();g.name=`cloture-corniche-${Math.round(z)}`;g.position.set(26.9,0,z);this.b.scene.add(g);
    this.b.boite(.44,.3,longueur,'#b6b0a1',0,.15,0,g);
    this.b.boite(.34,1.6,longueur,panneau,0,1.1,0,g);
    this.b.boite(.42,.2,longueur,accent,0,2,0,g);
    this.b.boite(.28,.62,longueur,this.b.tex('claustra',Math.round(longueur/1.3),1,'#e9e5d8'),0,2.41,0,g);
    this.b.boite(.42,.16,longueur,accent,0,2.8,0,g);
    // Le pas est ajusté pour qu'un pilastre tombe exactement aux deux bouts.
    const pas=longueur/Math.max(1,Math.round(longueur/4.4));
    for(let dz=-longueur/2;dz<=longueur/2+.01;dz+=pas)this.b.boite(.48,2.88,.48,accent,0,1.44,dz,g);
    this.statiques.push({objet:g,portee:170});
    return g;
  }
  /** Portail métallique bleu à deux battants, entre deux piles blanches. */
  private portailBleu(z:number){
    const g=new T.Group();g.name='portail-corniche';g.position.set(26.9,0,z);this.b.scene.add(g);
    for(const dz of [-2.05,2.05]){
      this.b.boite(.14,2.5,4,'#3f6f96',0,1.28,dz,g);
      for(let y=.5;y<2.4;y+=.44)this.b.boite(.18,.08,3.8,'#31597b',0,y,dz,g).castShadow=false;
    }
    for(const dz of [-4.3,4.3])this.b.boite(.56,3.05,.56,'#e2ddcf',0,1.52,dz,g);
    this.statiques.push({objet:g,portee:170});
  }
  /** Paillote à toit de chaume aperçue derrière la clôture sur IMG_6204. */
  private paillote(x:number,z:number){
    const g=new T.Group();g.name='paillote-corniche';g.position.set(x,0,z);this.b.scene.add(g);
    for(const [dx,dz] of [[-2.3,-2.3],[2.3,-2.3],[-2.3,2.3],[2.3,2.3]] as const)
      this.b.cyl(.11,.14,2.6,6,'#8a6f4f',dx,1.3,dz,g);
    const bord=this.b.cone(4.5,.4,4,'#8a6a3a',0,2.75,0,g);bord.rotation.y=Math.PI/4;
    const toit=this.b.cone(4.1,1.6,4,'#a6813f',0,3.4,0,g);toit.rotation.y=Math.PI/4;
    this.statiques.push({objet:g,portee:170});
  }
  /** Hangar vert menthe à toiture en pente du complexe vu sur IMG_6202. */
  private hangarVert(x:number,z:number,w:number,d:number,h:number){
    const g=new T.Group();g.name=`hangar-vert-${Math.round(z)}`;g.position.set(x,0,z);this.b.scene.add(g);
    this.b.boite(w,h,d,'#cfe0d2',0,h/2,0,g);
    for(const sens of [-1,1]){
      const pan=this.b.boite(w+.6,.2,d/2+.6,'#a8bcac',0,h+.58,sens*d/4,g);
      pan.rotation.x=sens*.3;
    }
    this.b.boite(w-1,.85,.16,'#eef4ec',0,h-.75,-d/2-.08,g);
    for(const dx of [-w/4,w/4])this.b.boite(1.3,1.5,.12,'#48696c',dx,h/2-.2,-d/2-.07,g);
    this.statiques.push({objet:g,portee:170});
  }
  /** Immeuble pâle à trois niveaux de balcons filants, centre de la photo IMG_6202. */
  private immeubleBalcons(x:number,z:number){
    const g=new T.Group();g.name=`immeuble-balcons-${Math.round(z)}`;g.position.set(x,0,z);this.b.scene.add(g);
    this.b.boite(11,9.6,12,'#cadfd0',0,4.8,0,g);
    for(let y=3.1;y<9.2;y+=3.1){
      this.b.boite(11.5,.2,12.5,'#eaf0e7',0,y,0,g).castShadow=false;
      for(const dz of [-3.6,0,3.6]){
        this.b.boite(.12,1.6,2.5,'#40636b',-5.56,y+.95,dz,g);
        const dalle=this.b.boite(1.5,.14,2.8,'#eaf0e7',-6.2,y+.22,dz,g);dalle.castShadow=false;
        for(let bz=-1.25;bz<1.3;bz+=.42)this.b.boite(.07,.8,.07,'#8a9c8d',-6.85,y+.62,dz+bz,g).castShadow=false;
        this.b.boite(.1,.1,2.75,'#8a9c8d',-6.85,y+1.02,dz,g).castShadow=false;
      }
    }
    this.b.boite(11.6,.34,12.6,'#a8bdae',0,9.77,0,g);
    this.statiques.push({objet:g,portee:170});
  }
  /** Long bâtiment clair à bandeaux et tourelle de toit, fond de la photo IMG_6205. */
  private immeubleBandeaux(x:number,z:number,w:number,h:number,d:number){
    const g=new T.Group();g.name=`immeuble-bandeaux-${Math.round(z)}`;g.position.set(x,0,z);this.b.scene.add(g);
    this.b.boite(w,h,d,'#dee4e1',0,h/2,0,g);
    for(let y=2.7;y<h-1;y+=3.2){
      this.b.boite(.12,1.45,d-1.8,'#3f6d84',-w/2-.06,y,0,g);
      this.b.boite(w-1.8,1.45,.12,'#3f6d84',0,y,-d/2-.06,g);
    }
    this.b.boite(w+.7,.34,d+.7,'#bac2be',0,h+.17,0,g);
    this.b.cyl(1.8,1.8,3,12,'#e8ece8',w*.2,h+1.8,d*.12,g);
    this.statiques.push({objet:g,portee:170});
  }
  /** Pylône télécom en treillis, silhouette récurrente au-dessus du quartier. */
  private pyloneTelecom(x:number,z:number,h:number){
    const g=new T.Group();g.name='pylone-telecom-corniche';g.position.set(x,0,z);this.b.scene.add(g);
    const acier=this.b.mat('#8f9691');
    for(const [dx,dz] of [[-1,-1],[1,-1],[-1,1],[1,1]] as const){
      const jambe=this.b.cyl(.07,.11,h,5,acier,dx*.6,h/2,dz*.6,g);
      jambe.rotation.set(-dz*.022,0,dx*.022);jambe.castShadow=false;
    }
    for(let y=1.8;y<h;y+=3.2){
      for(const dz of [-.6,.6])this.b.boite(1.25,.07,.07,acier,0,y,dz,g).castShadow=false;
      for(const dx of [-.6,.6])this.b.boite(.07,.07,1.25,acier,dx,y,0,g).castShadow=false;
    }
    for(const dy of [0,1])for(const a of [0,2.09,4.19]){
      const antenne=this.b.boite(.85,.55,.11,'#cbcfc8',Math.cos(a)*1.05,h-1.3-dy,Math.sin(a)*1.05,g);
      antenne.rotation.y=-a;antenne.castShadow=false;
    }
    this.statiques.push({objet:g,portee:170});
  }
  /** Bac à ordures vert sur roues, aligné au pied des clôtures. */
  private poubelleVerte(x:number,z:number){
    const g=new T.Group();g.position.set(x,0,z);this.b.scene.add(g);
    this.b.boite(.7,.92,.6,'#3f7248',0,.55,0,g);
    this.b.boite(.76,.1,.66,'#2f5636',0,1.06,0,g);
    for(const dz of [-.2,.2])this.b.cyl(.09,.09,.07,8,'#2b2f2d',-.26,.09,dz,g).rotation.z=Math.PI/2;
    this.statiques.push({objet:g,portee:120});
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
      if(!horsGiratoire(21.45,z,25))continue;
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
        if(!horsGiratoire(23.8,z,27)||!horsGiratoire(23.8,z-25,27))continue;
        this.b.cyl(.13,.2,8,7,'#8e8c78',23.8,4,z);this.b.boite(2,.12,.12,'#646959',23.8,7.7,z);
        for(const dx of [-.65,.65])this.b.cable([23.8+dx,7.8,z],[23.8+dx,7.15,z-12.5],.025,'#535a50');
        for(const dx of [-.65,.65])this.b.cable([23.8+dx,7.15,z-12.5],[23.8+dx,7.8,z-25],.025,'#535a50');
      }
    }
    for(const z of [-207,-282,-322,-394])this.b.arbre(24,z,.85);
    this.enseigne('AKPAKPA','COTONOU · BORD DE L’EAU','#266a64',4,1,this.b.scene,7.3,3.2,19);
    // L'Étoile Rouge est plus dense : deux petits stands et des terrasses en retrait.
    for(const z of [-326,-402])this.parasol(23.5,z,'#a9523e');
    for(const z of [-293]){
      for(const x of [22.8,24]){this.b.boite(.65,.12,.6,'#5a8a81',x,.5,z);this.b.boite(.65,.65,.1,'#5a8a81',x,.85,z-.3);}
    }
  }
  private circulation(){
    // Une place reste disponible pour le modèle détaillé kekenon.glb.
    for(let i=1;i<20;i++){
      const type=i%5===0?'voiture':'zemidjan';const palettes=type==='voiture'?['#d4ad61','#2f6682','#a84f45','#d9ded7']:['#9e3b32','#2d6380','#c8922e','#356f55'];const objet=vehicule(this.b,type,palettes[i%palettes.length]);
      const sens=i%2?1:-1;objet.position.set(voieDe(sens),0,25-i*22);objet.rotation.y=sens>0?0:Math.PI;
      objet.name=`circulation-${i}`;this.b.scene.add(objet);
      this.mouvements.push({objet,debut:-421,fin:153,vitesse:type==='voiture'?6.3:8.2,sens,phase:i,type});
    }
    // Taxis verts et blancs, puis deux minibus : silhouettes courantes qui
    // diversifient le trafic sans charger de nouveaux fichiers 3D.
    for(let i=0;i<4;i++){
      const objet=vehicule(this.b,'voiture');objet.name=`circulation-taxi-${i+1}`;
      const carrosserie=objet.children[0] as T.Mesh;if(carrosserie?.isMesh&&carrosserie.material instanceof T.MeshStandardMaterial){const matiere=carrosserie.material.clone();matiere.color.set(i%2?'#ece7d6':'#3f7b58');carrosserie.material=matiere;}
      const sens=i%2?1:-1,departs=[-58,-149,-217,-331];objet.position.set(voieDe(sens),0,departs[i]);objet.rotation.y=sens>0?0:Math.PI;this.b.scene.add(objet);
      this.mouvements.push({objet,debut:-421,fin:153,vitesse:6.7+i*.12,sens,phase:70+i,type:'taxi'});
    }
    for(let i=0;i<2;i++){
      const objet=new T.Group();objet.name=`circulation-minibus-${i+1}`;
      this.b.boite(2.05,1.85,4.5,i?'#e5d7b1':'#d9e4d9',0,1.05,0,objet);
      this.b.boite(2.08,.42,3.4,'#526b70',0,1.55,-.15,objet);
      this.b.boite(1.5,.18,1.2,'#3d7653',0,1.13,-2.27,objet);
      for(const x of [-.98,.98])for(const z of [-1.45,1.35]){const roue=this.b.cyl(.33,.33,.18,10,'#272b29',x,.4,z,objet);roue.rotation.z=Math.PI/2;}
      const sens=i?1:-1;objet.position.set(voieDe(sens),0,-138-i*145);objet.rotation.y=sens>0?0:Math.PI;this.b.scene.add(objet);
      this.mouvements.push({objet,debut:-421,fin:153,vitesse:5.5+i*.25,sens,phase:80+i,type:'minibus',portee:115});
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
      groupe.position.set(voieDe(sens),0,departs[i]??4-i*88);
      groupe.rotation.y=sens>0?0:Math.PI;
      // zem.glb regarde déjà vers l'avant dans son fichier, contrairement au
      // premier kekenon qui exige un demi-tour dans son gabarit.
      this.poserModele(groupe,gabarit,0);
      this.b.scene.add(groupe);
      this.mouvements.push({objet:groupe,debut:-421,fin:153,vitesse:7.4+i*.22,sens,phase:40+i,type:'zem-nouveau',portee:105});
    }
    return nombre;
  }
  /** Volumes des véhicules visibles, utilisés comme obstacles par le joueur. */
  obstaclesVehicules(zJoueur:number){
    return this.mouvements.filter(p=>!p.personne&&Math.abs(p.objet.position.z-zJoueur)<55)
      .map(p=>({x:p.objet.position.x,z:p.objet.position.z,w:p.type==='minibus'?2.2:1.9,d:p.type==='minibus'?4.8:3.4}));
  }
  /** Cherche autour de la borne un emplacement qui laisse quatre mètres libres. */
  placeLibreSurVoie(z:number,voie=14){
    for(const decalage of [0,-8,8,-16,16,-24,24,-32,32,-40,40,-52,52]){
      const candidat=T.MathUtils.clamp(z+decalage,-398,138);
      const libre=this.mouvements.every(p=>p.personne||Math.abs(p.objet.position.x-voie)>1.8||Math.abs(p.objet.position.z-candidat)>10);
      if(libre)return candidat;
    }
    return T.MathUtils.clamp(z,-398,138);
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
      .map(p=>({objet:p.objet,type:p.type==='voiture'||p.type==='taxi'||p.type==='minibus'?'voiture':'zemidjan'} as const));
  }
  /** Immobilise et anime le véhicule de circulation impliqué dans un accident. */
  accidenterVehicule(objet:T.Object3D){
    const cible=this.mouvements.find(p=>p.objet===objet&&!p.personne);
    if(!cible||cible.accident!==undefined)return false;
    cible.accident=2.7;cible.chuteDirection=1;return true;
  }
  /**
   * Engage un véhicule sur l'anneau quand il atteint l'approche du giratoire,
   * ou s'il y est déjà (placement de départ). Renvoie vrai s'il y est engagé.
   */
  private entrerGiratoire(p:Passage,dt:number){
    const z=p.objet.position.z,entree=GIRATOIRE.z-p.sens*APPROCHE_GIRATOIRE,prochain=z+p.vitesse*p.sens*dt;
    const franchit=p.sens<0?z>=entree&&prochain<entree:z<=entree&&prochain>entree;
    const dedans=Math.abs(z-GIRATOIRE.z)<APPROCHE_GIRATOIRE;
    if(!franchit&&!dedans)return false;
    const courbe=this.trajetGiratoire(p),longueur=courbe.getLength();
    const fraction=franchit?0:T.MathUtils.clamp((z-entree)*p.sens/(APPROCHE_GIRATOIRE*2),0,.98);
    p.anneau={courbe,s:fraction*longueur,longueur};
    return true;
  }
  /**
   * Trajet lissé d'une voie droite à l'autre en passant par l'anneau, dans le
   * sens antihoraire : on entre en serrant à droite, l'île reste à gauche. Un
   * véhicule sur quatre fait un tour complet de plus avant de sortir.
   */
  private trajetGiratoire(p:Passage){
    const {x:cx,z:cz,voie:rayon}=GIRATOIRE,voie=voieDe(p.sens),degre=Math.PI/180;
    const points=[new T.Vector3(p.objet.position.x,0,cz-p.sens*APPROCHE_GIRATOIRE),new T.Vector3(voie,0,cz-p.sens*27)];
    const depart=(p.sens<0?72:-108)*degre,arrivee=depart-(144+(p.phase%4===1?360:0))*degre;
    for(let a=depart;a>=arrivee-1e-6;a-=24*degre)points.push(new T.Vector3(cx+Math.cos(a)*rayon,0,cz+Math.sin(a)*rayon));
    points.push(new T.Vector3(cx+Math.cos(arrivee)*rayon,0,cz+Math.sin(arrivee)*rayon));
    points.push(new T.Vector3(voie,0,cz+p.sens*27),new T.Vector3(voie,0,cz+p.sens*APPROCHE_GIRATOIRE));
    return new T.CatmullRomCurve3(points,false,'centripetal');
  }
  /** Avance sur l'anneau en ralentissant, et laisse passer ce qui se trouve devant. */
  private tournerGiratoire(p:Passage,dt:number){
    const anneau=p.anneau!,position=p.objet.position;
    const tangente=anneau.courbe.getTangentAt(Math.min(1,anneau.s/anneau.longueur));
    // Seul ce qui se trouve dans le couloir de la trajectoire gêne : un passant
    // sur le trottoir voisin ne bloque pas l'anneau.
    const gene=this.mouvements.some(q=>{
      if(q===p)return false;
      const dx=q.objet.position.x-position.x,dz=q.objet.position.z-position.z;
      const devant=dx*tangente.x+dz*tangente.z,cote=Math.abs(dx*tangente.z-dz*tangente.x);
      return devant>.2&&devant<4.2&&cote<1.5;
    });
    // Au-delà de deux secondes et demie d'attente, on avance quand même :
    // deux véhicules qui se cèdent mutuellement le passage ne restent pas figés.
    if(gene&&(p.attente=(p.attente??0)+dt)<2.5)return;
    p.attente=0;
    anneau.s+=p.vitesse*.72*dt;
    if(anneau.s>=anneau.longueur){
      // Posé juste au-delà de l'approche, pour ne pas y être aussitôt réengagé.
      position.set(voieDe(p.sens),0,GIRATOIRE.z+p.sens*(APPROCHE_GIRATOIRE+.1));
      p.anneau=undefined;p.voieCible=voieDe(p.sens);p.objet.rotation.y=p.sens>0?0:Math.PI;
      return;
    }
    const point=anneau.courbe.getPointAt(anneau.s/anneau.longueur);
    position.x=point.x;position.z=point.z;
    p.objet.rotation.y=Math.atan2(tangente.x,tangente.z);
  }
  private passants(){
    const trajets=[[-21.1,58,136],[1.5,42,122],[-3.2,-84,-54],[-3.4,-207,-179],[-3.4,-320,-276],[4,-378,-348],[23,-85,18],[24,-310,-278],[23,-405,-338],[-5,-150,-110],[5,-260,-220],[22,-190,-150],[-4,-392,-350],[24,-265,-225],[-5,-45,-8],[22,-365,-325],[-20,25,92],[-2,-22,28],[5,-135,-96],[23,-176,-120],[-4,-252,-230],[24,-244,-205],[-4,-350,-326],[23,-388,-350]];
    // Un trajet qui croiserait l'anneau est raccourci à sa plus longue partie
    // hors du giratoire : les passants suivent le trottoir, pas la chaussée.
    const horsAnneau=trajets.flatMap(([x,debut,fin])=>{
      const ecart=Math.abs(x-GIRATOIRE.x);
      if(ecart>=GIRATOIRE.trottoir+.5)return [[x,debut,fin]];
      const demi=Math.sqrt((GIRATOIRE.trottoir+.5)**2-ecart**2),bas=GIRATOIRE.z-demi,haut=GIRATOIRE.z+demi;
      if(fin<=bas||debut>=haut)return [[x,debut,fin]];
      const morceaux=[[x,debut,Math.min(fin,bas)],[x,Math.max(debut,haut),fin]].filter(([,d,f])=>f-d>=6);
      return morceaux.sort((m,n)=>(n[2]-n[1])-(m[2]-m[1])).slice(0,1);
    });
    horsAnneau.forEach(([x,debut,fin],i)=>{
      const personne=new Personnage(['#c5754a','#447e88','#698756','#995764'][i%4],x,(debut+fin)/2,{pagne:i%3===0});
      personne.objet.name=`passant-${i}`;this.b.scene.add(personne.objet);
      this.mouvements.push({objet:personne.objet,debut,fin,vitesse:.8+(i%7)*.09,sens:i%2?1:-1,phase:i,personne,xBase:x,voieCible:x});
    });
  }
  actualiser(dt:number,paused:boolean,zJoueur:number){
    if(paused)return;this.temps+=dt;this.actualiserFeux();
    for(const s of this.statiques)s.objet.visible=Math.abs(s.objet.position.z-zJoueur)<s.portee;
    const vehicules=this.mouvements.filter(p=>!p.personne);
    for(const p of this.mouvements){
      if(p.personne){
        const prochain=p.objet.position.z+p.vitesse*p.sens*dt;
        // Les passants contournent un étal, une borne ou un mur plutôt que de
        // traverser son volume. Ils reviennent ensuite naturellement sur leur trottoir.
        const obstacle=this.b.obstacles.find(o=>Math.abs(prochain-o.z)<o.d/2+.9&&Math.abs(p.objet.position.x-o.x)<o.w/2+.7);
        if(obstacle){
          const gauche=obstacle.x-obstacle.w/2-1.05,droite=obstacle.x+obstacle.w/2+1.05;
          p.voieCible=Math.abs((p.xBase??p.objet.position.x)-gauche)<Math.abs((p.xBase??p.objet.position.x)-droite)?gauche:droite;
        }else p.voieCible=p.xBase??p.objet.position.x;
        p.objet.position.x=T.MathUtils.lerp(p.objet.position.x,p.voieCible,1-Math.exp(-dt*3.8));
        p.objet.position.z=prochain;
        if(p.objet.position.z<p.debut||p.objet.position.z>p.fin){p.sens*=-1;p.objet.position.z=T.MathUtils.clamp(p.objet.position.z,p.debut,p.fin);}
        p.objet.rotation.y=p.sens>0?0:Math.PI;
        p.personne.jambes.forEach((jambe,i)=>jambe.rotation.x=Math.sin(this.temps*5+p.phase+i*Math.PI)*.22);
      }else{
        if(p.accident!==undefined){
          p.accident-=dt;
          const ecoule=2.7-p.accident,releve=Math.min(1,Math.max(0,p.accident/.55));
          const angle=(p.type==='voiture'||p.type==='taxi'||p.type==='minibus') ? 0.14 : 1.28;
          p.objet.rotation.z=(p.chuteDirection??1)*angle*Math.min(1,ecoule/.24)*releve;
          if(p.accident<=0){p.accident=undefined;p.chuteDirection=undefined;p.objet.rotation.z=0;}
        }else if(p.anneau||this.entrerGiratoire(p,dt)){
          this.tournerGiratoire(p,dt);
        }else{
          let prochain=p.objet.position.z+p.vitesse*p.sens*dt;
          if(prochain<p.debut)prochain=p.fin;if(prochain>p.fin)prochain=p.debut;
          // Dans une même voie, le véhicule suiveur attend qu'un espace de
          // sécurité se libère au lieu de traverser celui qui le précède.
          const occupe=vehicules.some(autre=>autre!==p&&Math.abs(autre.objet.position.x-p.objet.position.x)<1.3
            &&Math.abs(autre.objet.position.z-prochain)<3.3);
          const voieBase=voieDe(p.sens),voieDepassement=p.sens>0?DEPASSEMENT_CORNICHE:DEPASSEMENT_ETOILE;
          if(occupe){
            const libre=vehicules.every(autre=>autre===p||Math.abs((autre.voieCible??autre.objet.position.x)-voieDepassement)>1.15||Math.abs(autre.objet.position.z-p.objet.position.z)>5.5);
            if(libre)p.voieCible=voieDepassement;
          }else if(Math.abs(p.objet.position.x-voieBase)>.35){
            const retourLibre=vehicules.every(autre=>autre===p||Math.abs((autre.voieCible??autre.objet.position.x)-voieBase)>1.15||Math.abs(autre.objet.position.z-p.objet.position.z)>5.5);
            if(retourLibre)p.voieCible=voieBase;
          }else p.voieCible=voieBase;
          p.objet.position.x=T.MathUtils.lerp(p.objet.position.x,p.voieCible??voieBase,1-Math.exp(-dt*1.8));
          const arrets=p.sens>0?[-105.2]:[-96.8];
          const franchit=arrets.some(stop=>p.sens>0?p.objet.position.z<stop&&prochain>=stop:p.objet.position.z>stop&&prochain<=stop);
          const bloqueFeu=this.etatFeu!=='vert'&&franchit;
          const bloquePieton=this.mouvements.some(autre=>!!autre.personne&&Math.abs(autre.objet.position.x-p.objet.position.x)<1.5&&
            (p.sens>0?autre.objet.position.z>=p.objet.position.z&&autre.objet.position.z-p.objet.position.z<5:p.objet.position.z>=autre.objet.position.z&&p.objet.position.z-autre.objet.position.z<5));
          const depasse=occupe&&Math.abs((p.voieCible??voieBase)-p.objet.position.x)>.25;
          if((!occupe||depasse)&&!bloqueFeu&&!bloquePieton)p.objet.position.z=prochain;
        }
      }
      // Les passages éloignés ne participent ni au rendu ni aux ombres.
      p.objet.visible=Math.abs(p.objet.position.z-zJoueur)<(p.portee??115);
    }
  }
}
