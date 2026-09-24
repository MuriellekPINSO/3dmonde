import * as T from 'three';
import { Batisseur, varie } from './Batisseur';
import { Personnage } from './Joueur';
import { guides, etals, stations } from '../content/zones';
import { MerAnimee } from './MerAnimee';

/**
 * Reprise en 3D des cinq lieux de la balade d’après les photographies
 * référencées dans docs/REFERENCES.md. Les volumes restent stylisés mais
 * les silhouettes, les matières et les couleurs suivent les vues réelles.
 */

const BRONZE = '#75695c';
const BEIGE_MARINA = '#cdbb9a';
const CREME_CONGRES = '#ece5d6';

/**
 * Giratoire de l'Étoile Rouge, posé sur l'axe du boulevard comme sur le survol
 * Download-7.mp4 : île centrale, anneau de chaussée à deux files où voitures et
 * motos tournent dans le sens antihoraire (circulation à droite), trottoir
 * circulaire. Les rayons servent au décor, à la circulation et aux collisions.
 */
export const GIRATOIRE = {x: 16, z: -364, ile: 12.2, chausseeInt: 12.8, chausseeExt: 21, trottoir: 24, voie: 16.9};
/** Directions des voies qui rayonnent (0 = est, π/2 = sud, vers la Corniche). */
export const VOIES_GIRATOIRE = [Math.PI / 2, -Math.PI / 2, Math.PI, 0, -Math.PI / 4];
/** Vrai si le point est au-delà de `marge` mètres du centre du giratoire. */
export const horsGiratoire = (x: number, z: number, marge: number = GIRATOIRE.trottoir) =>
  Math.hypot(x - GIRATOIRE.x, z - GIRATOIRE.z) > marge;
/**
 * Île centrale en boîtes de collision, pour un joueur en véhicule : un carré
 * inscrit et quatre calottes. À pied, on peut traverser pour rejoindre l'étoile.
 */
export const obstaclesIleGiratoire = (() => {
  const {x, z, ile} = GIRATOIRE, c = ile * Math.SQRT1_2, calotte = ile - c;
  return [
    {x, z, w: 2 * c, d: 2 * c},
    {x, z: z - c - calotte / 2, w: ile * 1.2, d: calotte}, {x, z: z + c + calotte / 2, w: ile * 1.2, d: calotte},
    {x: x - c - calotte / 2, z, w: calotte, d: ile * 1.2}, {x: x + c + calotte / 2, z, w: calotte, d: ile * 1.2},
  ];
})();

/** Sol continu de la promenade, chaussée, accotements et rives. */
export function boulevard(b: Batisseur) {
  // Le décor visible dépasse largement les limites jouables (-407 à 150). La
  // circulation peut ainsi faire demi-tour hors champ sans rouler dans le vide.
  const longueur = 710, centre = -175;
  b.sol(28, longueur, b.tex('sable', 14, 310, '#cfc6ab'), -22, centre, -.05).name='sol-lointain-ouest';
  b.sol(64, longueur, b.tex('sable', 32, 310, '#c9c2a8'), 53, centre, -.05).name='sol-lointain-est';
  b.sol(16.4, longueur, b.tex('paves', 8, 308), .1, centre).name='promenade-continue';
  // Revêtements relevés sur place : pavés gris foncé sur la Corniche aménagée,
  // dalles claires en chevrons au droit de l'Esplanade.
  b.sol(16.4, 124, b.tex('pavesGris', 6, 46), .1, -32, .012).name = 'promenade-paves-gris';
  b.sol(16.4, 64, b.tex('chevrons', 5, 20), .1, -126, .012).name = 'promenade-chevrons';
  b.sol(2.2, longueur, b.tex('gazon', 1.5, 205), 9.25, centre, -.02).name='accotement-continu';
  b.sol(13, longueur, b.tex('asphalte', 1, 77), 16, centre, -.03).name='chaussee-continue';
  b.boite(.35, .24, longueur, '#e7e1d2', -8.2, .12, centre).castShadow = false;
  // La bordure côté chaussée s'interrompt au giratoire, que le boulevard traverse.
  const nord = centre - longueur / 2, sud = centre + longueur / 2;
  const coupe = Math.sqrt(GIRATOIRE.trottoir ** 2 - (8.35 - GIRATOIRE.x) ** 2);
  for (const [debut, fin] of [[GIRATOIRE.z + coupe, sud], [nord, GIRATOIRE.z - coupe]] as const)
    b.boite(.35, .24, fin - debut, '#e7e1d2', 8.35, .12, (debut + fin) / 2).castShadow = false;
  // Le tronçon de la Corniche reçoit ses lampadaires solaires spécifiques dans Rues.ts.
  for (let z = -102; z > -400; z -= 34) if (horsGiratoire(10.6, z)) b.lampadaireDouble(10.6, z);
  for (let z = -118; z > -400; z -= 34) if (horsGiratoire(11.4, z)) b.lampadaireSimple(11.4, z, 1);

  horizonUrbain(b);
}

/** Volumes lointains qui ferment la carte sans alourdir les zones de visite. */
function horizonUrbain(b: Batisseur) {
  const couleurs=['#c9bda8','#b7c2bb','#d2aa87','#aab8b5','#d5cbb7'];
  // Deux rangées restent derrière les façades détaillées. Leur silhouette est
  // visible lorsque le joueur regarde de côté, à la place d'un grand fond vide.
  for(let i=0;i<23;i++){
    const z=171-i*30+(i%2?4:-3),x=72;
    const h=5+(i*7%11),w=13+(i%3)*4,d=18+(i%4)*3;
    const immeuble=b.boite(w,h,d,couleurs[(i+2)%couleurs.length],x,h/2,z);
    immeuble.castShadow=false;
    const bande=b.boite(w+.08,.75,d*.78,'#51696a',x-(w/2+.05),Math.min(h-1.2,3.1),z);
    bande.castShadow=false;
  }
  // Les deux extrémités ferment la perspective au-delà des demi-tours du trafic.
  for(const z of [176,-474])for(let x=30;x<=70;x+=20){
    const h=5+Math.abs(Math.round(x/10))%8;
    const fond=b.boite(16,h,13,couleurs[Math.abs(Math.round(x/20))%couleurs.length],x,h/2,z);
    fond.castShadow=false;
  }
  // Nuages très légers : ils donnent de la profondeur au ciel sans masquer les monuments.
  const nuage=b.mat('#fffaf0',{transparent:.36,face2:true});
  for(const [index,[x,y,z,s]] of [[-34,39,-34,7],[48,46,-118,9],[-52,43,-222,8],[55,40,-330,7],[-28,48,-430,10]].entries()){
    const g=new T.Group();g.name=`nuage-3d-${index+1}`;g.position.set(x,y,z);b.racine.add(g);
    for(const [dx,dy,e] of [[-1.2,0,.8],[0,.35,1],[1.35,.05,.72]] as const){
      const m=b.sphere(1,nuage,dx*s*.18,dy*s*.12,0,g);m.scale.set(s*.42,s*.13,s*.2);m.castShadow=false;m.receiveShadow=false;
    }
  }
}

/** Corniche Est d’Akpakpa : promenade au bord de l’eau et piste de mise en forme. */
export function corniche(b: Batisseur) {
  const longueur = 136;
  const mer = new MerAnimee(b.racine);
  cornichePlageOuverte(b);
  // La vue drone montre une bande bleu-gris continue, des jardinières carrées
  // et une rambarde métallique entre le large trottoir et l'océan.
  b.sol(3.25, 122, b.tex('beton', 2, 44, '#78979a'), -6.35, -35, .035).name='promenade-bleue-corniche';
  b.boite(.28, .28, 122, '#d8d1bf', -4.62, .14, -35).castShadow=false;
  for(let z=23;z>-94;z-=5.5){
    b.cyl(.065,.075,1.25,7,'#596766',-8.02,.63,z);
  }
  for(const y of [.42,.86,1.18]) b.boite(.07,.055,122,'#657371',-8.02,y,-35).castShadow=false;
  for(let z=18;z>-91;z-=15.5){
    b.boite(1.55,.5,1.55,'#b8b1a2',-5.9,.27,z);
    b.boite(1.25,.14,1.25,'#765f49',-5.9,.57,z);
    const arbuste=b.sphere(.72,z%2?'#477447':'#557f4c',-5.9,1.1,z);
    arbuste.scale.set(1,.75,1);
  }
  b.obstacle(-8.02,-35,.24,122);
  // Piste cyclable et de mise en forme, support du parcours de jogging.
  b.sol(3, 66, b.tex('piste', 1, 11), 6.5, -17, .04);
  for (const z of [8, -42]) b.boite(3, .03, .32, '#fff4d5', 6.5, .08, z).castShadow = false;
  b.panneau('LA CORNICHE', -5, 4, 4, 4);
  b.panneau('ESPACE · Jogging', 6.5, 2.6, 6);
  b.panneau('Arrivée jogging', 6.5, 2.5, -42);
  // Quelques palmiers restent en retrait côté ville, comme sur les vues hautes.
  for (const z of [13,-17,-49,-82]) jeunePalmier(b, 7.9, z);
  // Mobilier observé sur les promenades récentes : bancs tournés vers l'eau,
  // corbeilles et caniveau continu rendent l'échelle piétonne plus crédible.
  for(const z of [18,-7,-34,-62,-87]){
    bancUrbain(b,-4.9,z,Math.PI/2);
    b.cyl(.2,.24,.72,10,'#343b39',-3.9,.36,z+2.1);
  }
  b.sol(.42,118,'#626963',8.55,-34,.015).name='caniveau-corniche';
  for(let z=18;z>-91;z-=6)b.boite(.3,.025,1.8,'#343b39',8.55,.035,z).castShadow=false;
  // Download-4 et Download-6 : la chaussée est portée par une digue, dont le
  // parement clair plonge dans un talus d'enrochement jusqu'à l'eau.
  b.boite(.5,1.1,118,'#c9c5b9',-8.55,-.2,-35).castShadow=false;
  const talus=b.boite(2.6,.35,118,b.mat('#57554f',{rugosite:.95}),-9.9,-.08,-35);
  talus.rotation.z=-.42;talus.castShadow=false;
  for(let z=20;z>-92;z-=3.4)b.rocher(-10.6+varie(z,5)*.5,.1,z,.55+varie(z,8)*.3,'#5d5a54');
  // Enrochement visible au bout de la perspective côtière.
  for (let i = 0; i < 8; i++) b.rocher(-9.6 - i * .55, .2, -94 + i * .35, .55 + varie(i, 9) * .35, '#686d68');
  return mer;
}

/**
 * Premier tronçon observé sur toute la vidéo IMG_6194.MOV : large promenade
 * grise, sable planté, chemin côtier pavé et plage ouverte avant la rambarde.
 */
function cornichePlageOuverte(b:Batisseur){
  const centre=90,longueur=116;
  b.sol(14.5,longueur,b.tex('beton',5,42,'#dcdad3'),2,centre,.055).name='promenade-grise-6194';
  b.sol(14,longueur,b.tex('sable',7,42,'#bd8256'),-12.25,centre,.06).name='bande-sable-6194';
  b.sol(3.4,longueur,b.tex('paves',2,46,'#777b73'),-21.05,centre,.07).name='chemin-plage-6194';
  b.sol(6.4,longueur,b.tex('sable',4,42,'#d4b07a'),-25.95,centre,.045).name='plage-ouverte-6194';
  for(const x of [9.3,-5.3,-19.3,-22.8])b.boite(.28,.22,longueur,'#c9c3b5',x,.11,centre).castShadow=false;

  // Jeunes cocotiers régulièrement plantés dans la bande sableuse.
  for(let z=140;z>36;z-=12.5){
    if(z>74&&z<100)continue;                        // emprise de la placette
    const palmier=jeunePalmier(b,-11.5+varie(z,4)*2.2,z);
    palmier.scale.setScalar(.72+varie(z,7)*.2);
  }
  // Passage piéton au début du parcours, visible dans les premières secondes.
  for(let x=10.1;x<22.2;x+=1.35)b.boite(.76,.035,3,'#f2efe5',x,.035,132).castShadow=false;
  b.panneau('CORNICHE · PLAGE OUVERTE',1.5,3.3,140,7);

  // Survols Download-4 et Download-6.mp4 : jeunes badamiers à couronne étagée,
  // blocs de béton blanc servant d'assises, espaces en béton clair aux bords
  // arrondis avec un petit skatepark, et épis de roches noires dans la mer.
  for(const z of [133,121,108,71,58,46])badamier(b,-16.8+varie(z,2)*1.4,z);
  for(let z=145;z>38;z-=12.5)for(const dz of [0,1.6]){
    b.boite(.95,.55,.95,'#ecebe4',-7.2,.33,z+dz);
    b.boite(.6,.02,.6,'#55544f',-7.2,.61,z+dz).castShadow=false;
  }
  placetteSkate(b,-14.2,88);
  for(const z of [64,122])epiRocheux(b,-27.5,z,24);
}

/** Badamier (Terminalia catappa) : tronc droit, couronne en plateaux superposés. */
function badamier(b:Batisseur,x:number,z:number){
  const g=new T.Group();g.position.set(x,0,z);g.rotation.y=varie(z,x)*6.3;b.racine.add(g);
  b.cyl(.1,.16,3.4,7,'#6f5c47',0,1.7,0,g);
  const feuilles=[b.mat('#4b7c3b'),b.mat('#5f8c45')];
  for(const [y,r,dx] of [[2.3,1.9,.25],[3.05,1.55,-.2],[3.7,1.05,.1]] as const){
    const plateau=b.cyl(r,r*.92,.42,9,feuilles[y>3?1:0],dx,y,0,g);plateau.castShadow=true;
  }
  b.obstacle(x,z,.5,.5);
  return g;
}

/**
 * Espace en béton clair aux contours lobés, cerclé d'une bordure blanche, avec
 * deux rampes et un module de glisse : le skatepark de la Corniche vu au drone.
 */
function placetteSkate(b:Batisseur,x:number,z:number){
  const bordure=b.mat('#f3f1ea'),beton=b.mat('#cfcbc0',{rugosite:.9});
  const lobes=[[0,0,4.2],[-1.2,-5.4,3.4],[.9,5.2,3.1],[-.6,9.4,2.3]] as const;
  for(const [dx,dz,r] of lobes){
    b.cyl(r+.3,r+.3,.1,28,bordure,x+dx,.1,z+dz).castShadow=false;
  }
  for(const [dx,dz,r] of lobes){
    b.cyl(r,r,.1,28,beton,x+dx,.13,z+dz).castShadow=false;
  }
  // Deux plans inclinés qui se font face, et un module central.
  for(const sens of [-1,1]){
    const rampe=b.boite(2.6,.25,3,'#c4bfb2',x+sens*1.9,.5,z-5.4);
    rampe.rotation.z=sens*.32;
  }
  b.boite(1.6,.45,2.6,'#bdb8ab',x,.4,z+.4);
  b.boite(1.6,.06,2.6,'#8f8b80',x,.65,z+.4).castShadow=false;
  // Arbre en jardinière ronde au milieu du lobe principal.
  b.cyl(1,1.05,.4,16,'#e7e4da',x-1.8,.33,z+1.8);
  badamier(b,x-1.8,z+1.8);
}

/** Épi de roches sombres qui s'avance dans la mer, écume au pied. */
function epiRocheux(b:Batisseur,x:number,z:number,longueur:number){
  const roche=b.mat('#3b3a38',{rugosite:.95}),rocheClaire=b.mat('#56524c',{rugosite:.95});
  for(let i=0;i*1.5<longueur;i++){
    const px=x-i*1.5;
    for(const dz of [-1.3,0,1.3])b.rocher(px+varie(i,dz)*.6,.35+(dz?0:.35),z+dz+varie(dz,i)*.5,dz?1.05:1.3,(i+dz)%2?roche:rocheClaire);
  }
  const ecume=b.mat('#eef3ee',{transparent:.55});
  for(const dz of [-2.6,2.6]){const m=b.boite(longueur,.04,1.2,ecume,x-longueur/2,.2,z+dz);m.castShadow=false;}
}

function jeunePalmier(b: Batisseur, x: number, z: number) {
  const g=new T.Group();g.position.set(x,0,z);g.rotation.y=varie(x,z)*Math.PI;b.racine.add(g);
  b.cyl(.07,.13,1.15,6,'#806f58',0,.55,0,g);
  for(let i=0;i<7;i++){
    const a=i*Math.PI*2/7,feuille=b.boite(.17,.055,1.35,i%2?'#4b7643':'#62864d',Math.sin(a)*.52,1.18,Math.cos(a)*.52,g);
    feuille.rotation.y=a;feuille.rotation.x=(i%2?-.12:.12);feuille.castShadow=false;
  }
  b.sphere(.16,'#718a45',0,1.18,0,g).castShadow=false;
  return g;
}

/** Esplanade des Amazones : vaste plateforme ouverte, statue de 30 m et portiques du port. */
export function esplanadeAmazone(b: Batisseur) {
  // La vue aérienne fournie par l'utilisateur montre un grand parvis pavé,
  // traversé de bandes claires, puis une pelouse rectangulaire à l'arrière.
  b.sol(44, 54, b.tex('paves', 22, 27, '#c3baaa'), -31, -126, .07);
  b.sol(23, 43, b.tex('paves', 12, 22, '#9b9890'), -19, -126, .085);
  b.sol(44, 30, b.tex('gazon', 22, 15), -32, -168, .05);
  b.sol(8, 23, b.tex('paves', 4, 12, '#c8b9a1'), -19, -163, .08);
  jardinAerienAmazone(b);

  const bande = (longueur: number, x: number, z: number, rotation = 0) => {
    const m = b.boite(.85, .055, longueur, '#dfd4bd', x, .12, z);
    m.rotation.y = rotation; m.castShadow = false;
  };
  // Axes et diagonales observés depuis le drone : ils découpent le parvis en
  // grands polygones et convergent vers le monument.
  bande(44, -19, -125);
  bande(39, -30.5, -124, .58);
  bande(38, -7.5, -125, -.58);
  bande(28, -36, -136, -.78);
  bande(25, -2.8, -137, .78);

  b.boite(.5, 1.1, 78, '#d5cab1', -53, .55, -137);
  // Derrière le muret, la plage rejoint l'Atlantique, comme sur les vues drone
  // de Download-10.mp4 : parvis, pelouse, sable, puis la mer.
  b.sol(8.5, 80, b.tex('sable', 4, 36, '#d8c59c'), -57.4, -137, .04).name = 'plage-esplanade';
  for (let z = -104; z > -172; z -= 13) { b.lampadaireSimple(-11.5, z, -1); b.lampadaireSimple(-44, z, 1); }
  // Portiques du port de Cotonou, aperçus au fond des photos de l’esplanade.
  for (const z of [-104, -124, -144]) portique(b, -80, z);
  statueAmazone(b, -19, -123);

  // Massifs bas de feuillage et fleurs rouges qui ceinturent le pied, avec
  // l'avant laissé libre pour les marches et la plaque commémorative.
  for (const [x, z, w, d] of [[-25.1, -123, 1.8, 8], [-12.9, -123, 1.8, 8], [-19, -128.2, 10.5, 1.7]] as const) {
    b.haie(x, z, w, d, .55);
    const horizontal = w > d;
    const longueur = horizontal ? w : d;
    let index = 0;
    for (let i = -longueur / 2 + .65; i < longueur / 2; i += 1.25, index++) {
      const fleur = b.sphere(.16, index % 2 ? '#b9343d' : '#d4554e', horizontal ? x + i : x, .63, horizontal ? z : z + i);
      fleur.scale.set(1.25, .55, 1.25);
    }
  }

  // Corbeilles et petits bollards sombres visibles autour de la zone de visite.
  for (const [x, z] of [[-31, -111], [-7, -112], [-31, -142], [-7, -142]] as const) {
    b.cyl(.24, .29, .8, 10, '#303936', x, .4, z);
  }
  // Jardin linéaire vu depuis le trottoir : haies basses, fleurs et jeunes arbres.
  for (const z of [-105, -116, -137, -149, -160]) {
    b.haie(-7.2, z, 1.3, 7.5, .5);
    for (let dz = -2.6; dz <= 2.6; dz += 1.3) b.sphere(.13, dz ? '#d85d55' : '#f1c85a', -6.5, .58, z + dz);
  }
  for (const [x, z] of [[-4.8, -103], [-5.2, -155], [-39, -165]] as const) b.arbre(x, z, .6);
  for (const z of [-106, -123, -141, -159]) {
    b.cyl(.065, .09, 5.7, 7, '#2f3738', -9.2, 2.85, z);
    b.boite(.85, .08, .26, '#242b2d', -8.84, 5.55, z).rotation.z = -.08;
  }
  // Grand parvis réellement habité : bancs bas, bornes anti-intrusion et
  // projecteurs encastrés visibles sur les vues aériennes nocturnes.
  for(const [x,z,r] of [[-42,-106,0],[-31,-151,Math.PI/2],[-8,-104,Math.PI],[-7,-151,Math.PI]] as const)bancUrbain(b,x,z,r);
  for(let i=0;i<18;i++){
    const a=i*Math.PI*2/18,rayon=15.2;
    b.cyl(.13,.16,.72,8,'#4b504d',-19+Math.cos(a)*rayon,.36,-123+Math.sin(a)*rayon);
    const lampe=b.cyl(.11,.11,.025,10,'#fff1bc',-19+Math.cos(a)*11.8,.11,-123+Math.sin(a)*11.8);
    lampe.material=b.mat('#fff0b0',{rugosite:.25});lampe.castShadow=false;
  }
  for(let z=-104;z>=-168;z-=8)b.boite(.35,.025,2.1,'#4e5652',-52.4,.09,z).castShadow=false;
  // Abords relevés sur IMG_6237, 6239, 6249 et 6255 : guérites blanches aux
  // entrées, écrans publicitaires sur mât le long des allées, chapiteaux
  // d'événement au fond du parvis et barrières mobiles devant les guérites.
  guerite(b, -12.5, -101.5); guerite(b, -12.5, -153);
  barrieres(b, -15.5, -101.5, 0, 4); barrieres(b, -15.5, -153, 0, 4);
  ecranPub(b, -10.4, -112, Math.PI / 2, 'BÉNIN RÉVÉLÉ', 'Esplanade des Amazones', '#2a6f8f');
  ecranPub(b, -10.4, -134, Math.PI / 2, 'AMAZONES', 'Fierté et mémoire du Danxomè', '#8a2f3a');
  ecranPub(b, -10.4, -146, Math.PI / 2, 'COTONOU', 'Ville ouverte sur l’Atlantique', '#3f7b58');
  chapiteau(b, -45, -106, 7, 9); chapiteau(b, -45, -117, 7, 9);
  b.panneau('MONUMENT DE L’AMAZONE', -19, 30, -123, 11);
}

/**
 * Guérite blanche des entrées de l'Esplanade (IMG_6237.MOV) : cube enduit,
 * bandeau vitré sombre, toit plat très débordant.
 */
function guerite(b: Batisseur, x: number, z: number, rotation = 0) {
  const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = rotation; b.racine.add(g);
  const blanc = b.mat('#f0eee8', {rugosite: .9});
  b.boite(2.8, 2.7, 2.8, blanc, 0, 1.35, 0, g);
  b.boite(2.84, 1, 2.84, b.mat('#3f5156', {rugosite: .25, metal: .3}), 0, 1.75, 0, g);
  b.boite(4.4, .35, 4.4, blanc, 0, 2.9, 0, g);
  b.boite(3.2, .12, 3.2, '#d9d6cd', 0, 3.12, 0, g).castShadow = false;
  b.obstacle(x, z, 3, 3);
  return g;
}

/**
 * Écran publicitaire sur mât unique, alignés le long des allées de l'Esplanade
 * (IMG_6237.MOV) : cadre sombre et image lumineuse. Les visuels sont inventés.
 */
function ecranPub(b: Batisseur, x: number, z: number, rotation: number, texte: string, detail: string, fond: string) {
  const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = rotation; b.racine.add(g);
  b.cyl(.16, .2, 4.2, 10, '#3a3f3e', 0, 2.1, 0, g);
  b.boite(3.6, 2.2, .3, '#262a2a', 0, 5.1, 0, g);
  const toile = document.createElement('canvas'); toile.width = 512; toile.height = 300;
  const c = toile.getContext('2d')!;
  const degrade = c.createLinearGradient(0, 0, 512, 300); degrade.addColorStop(0, fond); degrade.addColorStop(1, '#1b2b3a');
  c.fillStyle = degrade; c.fillRect(0, 0, 512, 300);
  c.fillStyle = '#f3c342'; c.beginPath(); c.arc(430, 70, 48, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#fff8e8'; c.font = 'bold 50px sans-serif'; c.fillText(texte, 28, 170, 460);
  c.font = '26px sans-serif'; c.fillText(detail, 30, 220, 460);
  c.fillStyle = '#e8112d'; c.fillRect(0, 280, 512, 20); c.fillStyle = '#fcd116'; c.fillRect(0, 262, 512, 18); c.fillStyle = '#008751'; c.fillRect(0, 262, 150, 38);
  const carte = new T.CanvasTexture(toile); carte.colorSpace = T.SRGBColorSpace;
  const ecran = new T.Mesh(new T.PlaneGeometry(3.3, 1.95), new T.MeshBasicMaterial({map: carte, toneMapped: false}));
  ecran.position.set(0, 5.1, .16); g.add(ecran);
  b.obstacle(x, z, .6, .6);
  return g;
}

/** Ligne de barrières mobiles blanches, à barreaux, sur pieds plats. */
function barrieres(b: Batisseur, x: number, z: number, rotation: number, nombre: number) {
  const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = rotation; b.racine.add(g);
  const metal = b.mat('#e9e9e4', {rugosite: .5, metal: .4});
  for (let i = 0; i < nombre; i++) {
    const dx = i * 2.3;
    // On ne traverse pas une barrière : chaque élément est un obstacle.
    const cx = x + Math.cos(rotation) * dx, cz = z - Math.sin(rotation) * dx, long = Math.abs(Math.cos(rotation)) > .5;
    b.obstacle(cx, cz, long ? 2.3 : .3, long ? .3 : 2.3);
    for (const y of [.12, 1.08]) b.boite(2.2, .05, .05, metal, dx, y, 0, g).castShadow = false;
    for (let k = -1; k <= 1.01; k += .2) b.boite(.025, .95, .025, metal, dx + k, .6, 0, g).castShadow = false;
    for (const k of [-1.08, 1.08]) { b.boite(.05, 1.1, .05, metal, dx + k, .55, 0, g); b.boite(.08, .04, .7, '#bdbdb7', dx + k, .02, 0, g).castShadow = false; }
  }
  return g;
}

/** Banc robuste en bois et métal, utilisé dans les grands espaces publics. */
function bancUrbain(b:Batisseur,x:number,z:number,rotation=0){
  const g=new T.Group();g.position.set(x,0,z);g.rotation.y=rotation;b.racine.add(g);
  const bois=b.mat('#866346',{rugosite:.92}),metal=b.mat('#303836',{rugosite:.62,metal:.25});
  for(const dz of [-.32,0,.32])b.boite(2.25,.09,.22,bois,0,.58,dz,g);
  for(const dx of [-.86,.86]){b.boite(.1,.55,.72,metal,dx,.3,0,g);b.boite(.1,.72,.1,metal,dx,.76,.38,g);}
  for(const dz of [.43,.68])b.boite(2.25,.1,.16,bois,0,.82,dz,g);
  return g;
}

/** Jardins géométriques et chemin courbe visibles dans le survol TOUR.mp4. */
function jardinAerienAmazone(b: Batisseur) {
  b.sol(45, 31, b.tex('gazon', 20, 13, '#6f934e'), -32.5, -193, .045).name='jardin-aerien-amazone';
  // Une promenade organique continue relie l'esplanade au grand parc planté.
  const axe=Array.from({length:34},(_,i)=>({x:-31.5+Math.sin(i*.22)*7.5,z:-176.5-i*.93}));
  const gauche:{x:number;z:number}[]=[],droite:{x:number;z:number}[]=[];
  for(let i=0;i<axe.length;i++){
    const avant=axe[Math.max(0,i-1)],apres=axe[Math.min(axe.length-1,i+1)];
    const dx=apres.x-avant.x,dz=apres.z-avant.z,longueur=Math.hypot(dx,dz)||1;
    const nx=-dz/longueur*1.65,nz=dx/longueur*1.65;
    gauche.push({x:axe[i].x+nx,z:axe[i].z+nz});droite.push({x:axe[i].x-nx,z:axe[i].z-nz});
  }
  const ruban=new T.Shape();
  [...gauche,...droite.reverse()].forEach(({x,z},index)=>index?ruban.lineTo(x,-z):ruban.moveTo(x,-z));ruban.closePath();
  const geoRuban=new T.ShapeGeometry(ruban);geoRuban.rotateX(-Math.PI/2);
  const allee=b.maillage(geoRuban,b.mat('#d9d1c1',{face2:true}),0,.09,0);allee.castShadow=false;
  // Triangles de pelouse sombre séparés par des allées claires, lisibles du sol
  // comme depuis la caméra haute.
  const triangles=[
    [[-52,-180],[-41,-181],[-48,-190]],
    [[-18,-183],[-9,-188],[-18,-194]],
    [[-51,-199],[-39,-205],[-50,-207]],
  ] as const;
  for(const points of triangles){
    const forme=new T.Shape();
    // ShapeGeometry travaille en XY ; l'axe Y devient -Z après rotation au sol.
    points.forEach(([x,z],index)=>index?forme.lineTo(x,-z):forme.moveTo(x,-z));forme.closePath();
    const geo=new T.ShapeGeometry(forme);geo.rotateX(-Math.PI/2);
    const massif=b.maillage(geo,new T.MeshBasicMaterial({color:'#537c42',side:T.DoubleSide}),0,.1,0);massif.castShadow=false;
  }
  for(const [x,z,s] of [[-50,-187,.52],[-44,-201,.45],[-13,-190,.5],[-22,-205,.46]] as const)b.arbre(x,z,s);
  for(const z of [-181,-189,-198,-205]){
    b.haie(-53.5,z,1.1,5.2,.42);
    for(let dz=-1.7;dz<=1.7;dz+=1.1)b.sphere(.12,dz>0?'#d55249':'#efc34f',-52.9,.48,z+dz);
  }
}

/**
 * Cité ministérielle observée sur IMG_6228–6233, IMG_9364–9367 et IMG_6239.MOV :
 * des ailes basses de cinq niveaux en pierre claire, très longues, à bandeaux
 * vitrés continus sous des dalles en léger débord, reliées par de grands
 * portiques plats à la toiture. Une grille blanche à barreaux fins, doublée
 * d'une haie, la sépare du trottoir. La version précédente empilait trois
 * blocs cubiques à casquettes vert sombre, coiffés d'une poutre trop épaisse.
 */
export function citeMinisterielle(b: Batisseur) {
  const g = new T.Group(); g.name = 'cite-ministerielle'; g.position.set(43, 0, -119); b.racine.add(g);
  b.sol(19, 48, b.tex('gazon', 8, 18, '#789353'), 43, -119, .025);
  const pierre = b.mat('#d4d0c6'), dalle = b.mat('#e2ded5'), verre = b.mat('#4f646a', {rugosite: .22, metal: .3});
  // Deux ailes longues perpendiculaires à la rue, et une aile de fond qui les relie.
  for (const [dx, dz, larg, prof] of [[0, -13.5, 14, 11], [0, 13.5, 14, 11], [5, 0, 5, 38]] as const) {
    b.boite(larg, 16.5, prof, pierre, dx, 8.25, dz, g);
    for (let n = 0; n < 5; n++) {
      const y = 1.6 + n * 3.1;
      b.boite(larg + .5, .32, prof + .5, dalle, dx, y + 2.35, dz, g);             // dalle filante
      b.boite(.16, 1.9, prof - .8, verre, dx - larg / 2 - .09, y + 1.2, dz, g);  // bandeau vitré continu
      for (let m = -prof / 2 + 1; m < prof / 2 - .5; m += 1.6)                   // meneaux fins
        b.boite(.2, 1.9, .1, dalle, dx - larg / 2 - .12, y + 1.2, dz + m, g).castShadow = false;
    }
    b.boite(larg + .7, .45, prof + .7, dalle, dx, 16.7, dz, g);
  }
  // Portiques plats qui prolongent la toiture en auvent au-dessus de la cour.
  b.boite(15, .5, 16, dalle, -2, 16.9, 0, g);
  for (const dz of [-6.5, 6.5]) b.boite(.5, 16.6, .5, dalle, -9, 8.3, dz, g);
  b.boite(.6, 1.2, 16, dalle, -9, 16.4, 0, g);
  // Antenne sur le toit, visible sur IMG_6239.MOV.
  b.cyl(.06, .08, 6, 5, '#b7b3aa', 5, 19.6, 0, g);
  // Grille blanche à barreaux fins, soubassement bas et haie derrière.
  b.boite(.35, .45, 46, '#e6e3db', -8.3, .23, 0, g);
  b.boite(.1, .08, 46, '#f1efea', -8.3, 1.95, 0, g).castShadow = false;
  for (let z = -22.5; z <= 22.5; z += .45) b.boite(.05, 1.5, .05, '#f1efea', -8.3, 1.2, z, g).castShadow = false;
  for (const z of [-19, -12, -5, 3, 11, 19]) {
    b.haie(35.6, -119 + z, 1.1, 5, 1.1);
    if (z % 2) b.palmierRoyal(37.3, -119 + z);
  }
  b.panneau('CITÉ MINISTÉRIELLE', 35, 4.2, -101, 7);
}

/** Portique a conteneurs du port de Cotonou, apercu au fond de l’esplanade. */
function portique(b: Batisseur, x: number, z: number) {
  const g = new T.Group(); g.position.set(x, 0, z); b.racine.add(g);
  const acier = b.mat('#c2553f');
  for (const dx of [-5, 5]) for (const dz of [-5, 5]) {
    b.boite(.85, 20, .85, acier, dx, 10, dz, g);
    b.boite(.5, 9, .5, acier, dx * .82, 15.5, dz, g).rotation.z = dx > 0 ? .1 : -.1;   // contrefiche
  }
  for (const dx of [-5, 5]) b.boite(1, .7, 11, acier, dx, 1.2, 0, g);                  // sommiers
  b.boite(11.6, 1.7, 2.6, acier, 0, 20.8, 0, g);                                       // poutre de tete
  b.boite(38, 1.5, 2.6, acier, -11, 22.4, 0, g);                                       // fleche vers le large
  b.boite(9, 1.2, 2.2, acier, 12, 22.4, 0, g);                                         // contrepoids
  b.boite(4.2, 3.2, 3.6, '#e0dbcb', 3, 19, 0, g);                                      // cabine
  b.boite(2, 1.6, 2.4, '#33383a', -6, 21.4, 0, g);                                     // chariot
  b.cable([-6, 21, 0], [-6, 12, 0], .12, '#4a4a44', g);
}

/**
 * Guerrière amazone armée d’un fusil et d’un sabre, tête relevée,
 * pagne noué, bandoulière et épaulière, sur butte rocheuse et socle à plaque.
 */
function statueAmazone(b: Batisseur, x: number, z: number) {
  // Les vues au niveau du sol montrent un emmarchement et un haut socle en
  // pierre noire, légèrement réfléchissante, avec une inscription dorée.
  // L'Esplanade se parcourt à pied : on bute sur le socle.
  b.obstacle(x, z, 14, 12);
  b.boite(14, .24, 12, '#4b4c4b', x, .12, z);
  b.boite(12.8, .32, 10.8, '#282b2c', x, .4, z);
  b.boite(11.4, 1.15, 9.4, '#303334', x, 1.14, z);
  b.boite(9, .28, 7, '#4b4e4e', x, 1.86, z);
  b.boite(4, .62, .08, '#b98a3d', x, 1.18, z + 4.74);
  // Statue, butte et plaque : cèdent la place au modèle amazone.glb.
  b.ensemble('statue-amazone', () => {
    b.boite(1.9, 1.1, .16, '#3a3630', x + 4.4, 1.35, z + 1);                             // plaque commemorative
    // Butte rocheuse dressee derriere la guerriere, degageant ses jambes.
    const roche = b.tex('roche', 1.5, 1.5);
    for (const [dx, dz, r] of [[-5, 1.8, 4.4], [-6.6, -2.6, 3.2], [-3.4, 4.6, 2.8], [-7, 2.6, 2.4]] as const)
    b.rocher(x + dx, 2.6 + r * .55, z + dz, r, roche);
    const g = new T.Group(); g.position.set(x, 2, z); g.rotation.y = .4; g.scale.setScalar(11); b.racine.add(g);
    const bronze = b.mat(BRONZE, {rugosite: .6, metal: .2});
    // Jambes nues degagees jusqu’au-dessus du genou, jambe gauche portee en avant.
    b.cyl(.085, .065, .92, 8, bronze, .19, .52, -.13, g).rotation.z = .14;
    b.cyl(.09, .07, .92, 8, bronze, -.15, .52, .14, g).rotation.z = -.11;
    b.boite(.33, .09, .19, bronze, .28, .05, -.13, g);
    b.boite(.31, .09, .19, bronze, -.23, .05, .14, g);
    // Pagne enroule au-dessus du genou, pan retombant et ceinture torsadee.
    b.cyl(.155, .26, .54, 10, bronze, 0, .99, 0, g);
    b.boite(.06, .46, .22, bronze, .15, .78, -.04, g);
    b.maillage(new T.TorusGeometry(.16, .033, 6, 14), bronze, 0, 1.24, 0, g).rotation.x = Math.PI / 2;
    // Buste elance, bandouliere en diagonale, epaules marquees.
    b.cyl(.175, .135, .54, 10, bronze, 0, 1.49, 0, g);
    b.boite(.06, .74, .1, bronze, .14, 1.48, 0, g).rotation.x = .55;
    b.sphere(.145, bronze, 0, 1.74, 0, g).scale.set(.9, .62, 1.55);                      // ligne d’epaules
    b.boite(.15, .085, .17, bronze, 0, 1.79, .2, g);                                      // epauliere
    b.cyl(.058, .066, .13, 8, bronze, 0, 1.86, 0, g);
    b.sphere(.12, bronze, .02, 1.99, 0, g);
    b.sphere(.125, bronze, 0, 2.04, 0, g).scale.set(1, .55, 1);                          // cheveux ras
    // Bras gauche replie, fusil dresse crosse au sol, bien ecarte du corps.
    b.cyl(.05, .055, .42, 7, bronze, .03, 1.56, .26, g).rotation.x = -.24;
    b.cyl(.045, .05, .36, 7, bronze, .09, 1.24, .34, g).rotation.z = -.26;
    b.cyl(.028, .032, 2.05, 7, bronze, .14, 1.03, .4, g);
    b.boite(.09, .32, .075, bronze, .14, .18, .4, g);
    b.cyl(.04, .04, .09, 7, bronze, .14, 1.52, .4, g);
    // Bras droit tendu, sabre courbe pointe vers le bas.
    b.cyl(.05, .055, .46, 7, bronze, .02, 1.54, -.26, g).rotation.x = .2;
    b.cyl(.045, .05, .38, 7, bronze, .08, 1.2, -.33, g).rotation.z = -.22;
    b.boite(.46, .055, .022, bronze, .31, .99, -.36, g).rotation.z = -.92;
    b.boite(.13, .05, .055, bronze, .11, 1.1, -.36, g);
  });
}

/**
 * Reteinte d'un modèle GLB texturé : la texture garde ses reliefs mais perd sa
 * teinte, ramenée à sa luminance puis multipliée par `teinte`.
 */
function reteindre(objet: T.Object3D, teinte: string, gain: number, o: {metal: number; rugosite: number; lisse?: boolean; aplat?: number}) {
  objet.traverse(n => {
    const mesh = n as T.Mesh;
    if (!mesh.isMesh) return;
    const source = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const copies = source.map(m => {
      const copie = (m as T.MeshStandardMaterial).clone();
      const c = new T.Color(teinte), rgb = [c.r, c.g, c.b].map(v => v.toFixed(3)).join(', ');
      copie.color.set('#ffffff'); copie.metalness = o.metal; copie.roughness = o.rugosite;
      if (o.lisse) { copie.normalMap = null; copie.roughnessMap = null; copie.metalnessMap = null; }
      copie.onBeforeCompile = shader => {
        shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>',
          `#include <map_fragment>\n  diffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, vec3(.299, .587, .114)) * ${gain.toFixed(2)}), vec3(1.0), ${(o.aplat ?? 0).toFixed(2)}) * vec3(${rgb});`);
      };
      return copie;
    });
    mesh.material = Array.isArray(mesh.material) ? copies : copies[0];
  });
}

/**
 * Bronze sombre de l'Amazone, presque anthracite, tel que le montrent les
 * photos prises sur place par temps couvert (IMG_6243, 6248, 6251, 6252,
 * IMG_6239.MOV, IMG_6249.MOV). Le modèle amazone.glb est texturé en cuivre
 * clair ; les vidéos Download-9/10, en plein soleil et étalonnées, le font
 * paraître argenté, ce que les photos de terrain démentent.
 */
export function patineBronze(objet: T.Object3D) {
  reteindre(objet, '#8a7866', 1.05, {metal: .35, rugosite: .5});
}


/** Palais de la Marina : long bâtiment beige sur pilotis, bandeaux vitrés bleutés. */
export function palaisMarina(b: Batisseur) {
  b.sol(26, 58, b.tex('gazon', 13, 29), 35, -152, .04);
  b.sol(6, 58, b.tex('paves', 3, 29, '#b98a72'), 24.8, -152, .07);
  const beige = b.mat(BEIGE_MARINA), vitre = b.tex('vitrage', 2, 1, '#ffffff', {rugosite: .25, metal: .4});
  // Pilotis dégageant le rez-de-chaussée.
  for (let z = -134; z >= -170; z -= 5.2) for (const x of [25.2, 31.6]) b.boite(1.3, 4, 1.3, beige, x, 2, z);
  // Façade en redents : deux ailes en avant, travée centrale en retrait.
  for (const [x, z, larg, prof] of [[28.4, -140, 9, 13], [28.4, -164, 9, 13], [30, -152, 8, 11]] as const) {
    b.boite(larg, 6.6, prof, beige, x, 7.3, z);
    b.boite(larg + .8, .4, prof + .8, '#c0ad8b', x, 10.8, z);
    const avant = x - larg / 2;
    b.boite(.16, 4.6, prof - 1, z === -152 ? b.tex('vitrageSombre', 1.6, 1) : vitre, avant - .08, 7.4, z);
  }
  // Cages d’escalier débordant de la toiture.
  for (const z of [-146, -158]) { b.boite(3.2, 3.6, 3.2, beige, 29.2, 12.4, z); b.boite(3.4, .3, 3.4, '#b8a583', 29.2, 14.3, z); }
  // Clôture à barreaux, portail et drapeaux.
  b.boite(.5, .9, 58, '#c8b795', 22.6, .45, -152);
  for (let z = -125; z >= -179; z -= 3) b.boite(.12, 2.3, .12, '#2c3230', 22.6, 1.6, z);
  for (const z of [-146.5, -149.5]) { b.boite(1.2, 3.4, 1.2, '#4a4f4c', 22.6, 1.7, z); b.boite(1.4, .35, 1.4, '#c8b795', 22.6, 3.5, z); }
  for (const z of [-144, -152, -160]) b.drapeauBenin(23.4, z);
  // Rangée de hauts mâts de drapeaux après la Présidence (IMG_6240, IMG_9367).
  for (let z = -181; z >= -200; z -= 3.6) b.drapeauBenin(23.3, z, 12);
  for (const z of [-137, -150, -163]) b.lanterneGlobe(23.8, z);
  for (const z of [-133, -142, -161, -170]) b.palmierRoyal(24.4, z);
  for (const z of [-139, -147, -156, -165]) { b.haie(23.7, z, .9, 4.5, .5); b.haie(26.4, z + 2, 1.1, 1.4, .4); }
  b.panneau('PALAIS DE LA MARINA', 30, 16.5, -151, 9);
}

/**
 * Palais des Congrès : deux tambours évasés à toiture ovale et oculus,
 * reliés par une aile basse à dalle débordante, inspirés des tata somba.
 */
export function palaisCongres(b: Batisseur) {
  b.sol(38, 64, b.tex('beton', 19, 32), -28, -245, .04);
  b.sol(38, 22, b.tex('gazon', 19, 11), -28, -221, .06);
  // Parking, grille et motos relevés sur IMG_6253–6258.
  // Le parking passe au-dessus de la pelouse d'entrée, qui le recouvrait.
  b.sol(7.2, 54, b.tex('beton', 2, 14, '#cfcdc6'), -11.8, -246, .075);
  for (let z=-267;z<=-225;z+=6) {
    b.boite(3.1,.025,.1,'#ece8da',-11.8,.095,z).castShadow=false;
    b.boite(.1,.025,4.4,'#ece8da',-9.2,.095,z+2.2).castShadow=false;
  }
  // Parking plein comme sur les photos : berlines et 4×4 blancs, gris, noirs.
  for (const [z, couleur] of [[-243,'#e8e8e4'],[-249,'#9da3a6'],[-255,'#1f2326'],[-267,'#e2e2dc'],[-223,'#7b2a2a']] as const) {
    const garee = vehicule(b, 'voiture', couleur); garee.position.set(-11.7, .09, z + 2.2); garee.rotation.y = Math.PI / 2; b.racine.add(garee);
    garee.traverse(o => { const m = o as T.Mesh; if (m.isMesh) m.castShadow = false; });
  }
  b.boite(.16,1.35,43,'#68706e',-15.3,.72,-247).castShadow=false;
  for(let z=-268;z<=-226;z+=1.45)b.boite(.075,1.55,.075,'#68706e',-15.35,.78,z);
  for(const [z,type] of [[-229,'zemidjan'],[-235,'zemidjan'],[-261,'voiture']] as const){
    const stationne=vehicule(b,type);stationne.position.set(-11.7,.09,z);stationne.rotation.y=Math.PI/2;b.racine.add(stationne);
    stationne.traverse(o=>{const m=o as T.Mesh;if(m.isMesh)m.castShadow=false;});
  }
  for(const z of [-222,-270])b.lampadaireSimple(-10.2,z,-1);
  // Bâtiment reconstruit d'après les photos du dossier espace (IMG_6238.MOV,
  // IMG_6254, 6256–6258) et de Wikimedia Commons : trois tambours blancs évasés,
  // corniche épaisse et toit percé d'un oculus ovale, frise de triangles des
  // tata somba, aile basse à claustras entre eux, chapiteau blanc devant
  // l'entrée. Le modèle palais-congres.glb, issu d'un scan, sortait froissé.
  b.ensemble('palais-congres', () => {
    tambour(b, -30, -223, 5.8, 7.2, 8.6);
    tambour(b, -33, -243, 8.2, 10.2, 11);
    tambour(b, -31, -263, 6.4, 7.8, 9.4);
    const blanc = b.mat('#f1efe8', {rugosite: .9}), verre = b.mat('#34454a', {rugosite: .25, metal: .3});
    // Aile basse derrière les tambours, façade à claustras vers la promenade.
    b.boite(15, 6.4, 50, blanc, -38, 3.2, -243);
    b.boite(.2, 4.2, 44, b.tex('claustra', 22, 2, '#f0ebdf'), -30.4, 3.3, -243);
    b.boite(18, .55, 53, '#f5f3ee', -37.5, 6.7, -243);
    // Colonnade fine qui porte le débord de la dalle entre les tambours.
    for (const z of [-230.5, -233.5, -252.5, -255.5]) b.cyl(.22, .22, 6.4, 10, blanc, -29.8, 3.2, z);
    // Entrée vitrée au pied du grand tambour, emmarchement vers le parvis.
    b.boite(.3, 3.2, 9, b.mat('#5b6f74', {rugosite: .25, metal: .3}), -22.7, 1.7, -243);
    for (let marche = 0; marche < 4; marche++) b.boite(1.1, .3 * (marche + 1), 14 - marche * 1.4, '#e3ddd0', -19.6 - marche * 1.1, .15 * (marche + 1), -243);
    chapiteau(b, -16.2, -243, 8, 10);
  });
  for (const z of [-218, -266, -274]) b.arbre(-17.5, z, .45);
  for (const z of [-224, -230, -256, -262]) b.haie(-17, z, 1.2, 4, .55);
  // Parvis d'arrivée : îlots paysagers, bornes et éclairage bas donnent au
  // bâtiment la profondeur horizontale visible sur les photographies récentes.
  for(const z of [-226,-236,-246,-256,-266]){
    b.cyl(.14,.17,.68,8,'#555d59',-8.8,.34,z);
    b.cyl(.1,.13,.46,8,'#3f4946',-19.2,.23,z);
    b.sphere(.13,'#fff0b5',-19.2,.52,z).castShadow=false;
  }
  for(const [x,z] of [[-36,-219],[-45,-225],[-43,-266],[-34,-272]] as const){b.haie(x,z,4.8,1.4,.55);b.arbre(x,z,.42);}
  bancUrbain(b,-18.2,-219,0);bancUrbain(b,-18.2,-271,Math.PI);
  b.cocotier(-11.5, -240, false);
  // Barrières mobiles devant l'entrée du parking (IMG_6253, 6256, 6257).
  barrieres(b, -14.8, -216.5, Math.PI / 2, 3); barrieres(b, -14.8, -275.5, -Math.PI / 2, 3);
  ecranPub(b, -9.6, -229, Math.PI / 2, 'PALAIS DES CONGRÈS', 'Conférences · Spectacles', '#5a4a8a');
  b.panneau('PALAIS DES CONGRÈS', -24, 17, -240, 9);
}

/**
 * Tambour du Palais des Congrès : socle vitré, mur blanc évasé à frise de
 * triangles, corniche en débord, toit plat percé d'un oculus doré. Légèrement
 * ovale, le grand axe le long de la façade.
 */
function tambour(b: Batisseur, x: number, z: number, rBas: number, rHaut: number, h: number) {
  const g = new T.Group(); g.position.set(x, 0, z); g.scale.set(1, 1, 1.12); b.racine.add(g);
  const blanc = b.mat('#f1efe8', {rugosite: .9}), verre = b.mat('#5b6f74', {rugosite: .25, metal: .3});
  const bord = b.mat('#f1efe8', {rugosite: .9, face2: true});
  const socle = 2.4, mur = h - socle;
  b.cyl(rBas * .96, rBas * .96, socle, 40, verre, 0, socle / 2, 0, g);
  for (let i = 0; i < 24; i++) {
    const a = i * Math.PI / 12;
    b.boite(.18, socle, .18, blanc, Math.cos(a) * rBas * .97, socle / 2, Math.sin(a) * rBas * .97, g).castShadow = false;
  }
  b.cyl(rBas * 1.01, rBas * 1.01, .35, 40, blanc, 0, socle + .1, 0, g);
  b.cyl(rHaut, rBas, mur, 48, b.tex('tata', 7, 1), 0, socle + mur / 2, 0, g);
  // Corniche épaisse, plus large en haut qu'en bas : un bandeau ouvert, qui
  // laisse voir d'en haut le toit et son oculus.
  b.cyl(rHaut + .85, rHaut + .15, 1.3, 48, bord, 0, h + .65, 0, g, true);
  const lisse = new T.RingGeometry(rHaut, rHaut + .85, 48); lisse.rotateX(-Math.PI / 2);
  b.maillage(lisse, blanc, 0, h + 1.3, 0, g);
  b.cyl(rHaut + .1, rHaut + .1, .2, 48, '#e8e5dd', 0, h + 1.1, 0, g);
  // Oculus : anneau doré, verrière sombre en retrait.
  const anneau = new T.RingGeometry(rHaut * .3, rHaut * .44, 40); anneau.rotateX(-Math.PI / 2);
  b.maillage(anneau, b.mat('#c8a468', {rugosite: .5}), 0, h + 1.22, 0, g).castShadow = false;
  b.cyl(rHaut * .3, rHaut * .3, .12, 40, '#4a4f4c', 0, h + 1.12, 0, g);
  return g;
}

/** Chapiteau d'événement blanc à quatre pans, sur poteaux, devant l'entrée. */
function chapiteau(b: Batisseur, x: number, z: number, largeur: number, longueur: number) {
  const g = new T.Group(); g.position.set(x, 0, z); b.racine.add(g);
  const toile = b.mat('#f7f6f1', {rugosite: .8, face2: true});
  const toit = b.cone(Math.SQRT1_2, 1, 4, toile, 0, 4.1, 0, g);
  toit.rotation.y = Math.PI / 4; toit.scale.set(largeur, 2.2, longueur);
  for (const dx of [-1, 1]) for (const dz of [-1, 0, 1]) b.cyl(.06, .06, 3, 6, '#c9c9c4', dx * largeur / 2, 1.5, dz * longueur / 2, g);
  b.boite(largeur, .5, longueur, b.mat('#f7f6f1', {transparent: .15, face2: true}), 0, 2.75, 0, g).castShadow = false;
  return g;
}

/**
 * Place de l’Étoile Rouge : un giratoire sur l'axe du boulevard. Au centre de
 * l'île, deux étoiles rouges imbriquées sur un dallage, la flèche blanche et la
 * statue de bronze ; autour, l'anneau où tournent voitures et zémidjans.
 */
export function etoileRouge(b: Batisseur) {
  const {x, z, ile, chausseeInt, chausseeExt, trottoir, voie} = GIRATOIRE;
  b.sol(76, 96, b.tex('sable', 38, 48, '#c6bda4'), -48, z, .02);
  // Anneau de chaussée complet, deux files séparées par un tireté, et bordures.
  b.anneau(chausseeInt, chausseeExt, b.tex('bitume', 6, 6), x, .06, z);
  b.anneau(chausseeExt - .35, chausseeExt - .2, '#e8e3d2', x, .075, z);
  b.anneau(chausseeInt + .2, chausseeInt + .35, '#e8e3d2', x, .075, z);
  for (let i = 0; i < 40; i++) {
    const a = i * Math.PI / 20;
    const trait = b.boite(.22, .03, 1.7, '#e8e3d2', x + Math.cos(a) * voie, .08, z + Math.sin(a) * voie);
    trait.rotation.y = -a; trait.castShadow = false;
  }
  // Trottoir circulaire, interrompu là où les voies rejoignent l'anneau.
  const tour = Math.PI * 2, norme = (a: number) => ((a % tour) + tour) % tour;
  const ouvertures = VOIES_GIRATOIRE.map(a => ({a: norme(a), demi: Math.abs(Math.sin(a)) > .9 ? .32 : .22}))
    .sort((p, q) => p.a - q.a);
  ouvertures.forEach((o, i) => {
    const suivante = ouvertures[(i + 1) % ouvertures.length];
    const debut = o.a + o.demi, fin = suivante.a - suivante.demi + (i === ouvertures.length - 1 ? tour : 0);
    // RingGeometry mesure l'angle dans le plan XY : après bascule au sol, a monde = -thêta.
    b.anneau(chausseeExt, trottoir, b.tex('paves', 10, 2, '#cdc4b3'), x, .12, z, -fin, fin - debut);
    b.anneau(chausseeExt, chausseeExt + .3, '#e1dccd', x, .15, z, -fin, fin - debut);
  });
  // Voies rayonnantes hors du boulevard : ouest, est et nord-est.
  for (const a of VOIES_GIRATOIRE.slice(2)) {
    const longueur = 34, r = chausseeExt - .5 + longueur / 2;
    const route = b.sol(9, longueur, b.tex('bitume', 1, 4), x + Math.cos(a) * r, z + Math.sin(a) * r, .055);
    route.rotation.y = Math.PI / 2 - a;
    for (let d = 3; d < longueur; d += 4.5) {
      const rr = chausseeExt + d;
      const tiret = b.boite(.2, .03, 2, '#e8e3d2', x + Math.cos(a) * rr, .07, z + Math.sin(a) * rr);
      tiret.rotation.y = Math.PI / 2 - a; tiret.castShadow = false;
    }
  }
  // Passages piétons : deux traversées de l'anneau côté promenade, et une sur
  // chaque approche du boulevard, à l'entrée du carrefour.
  const zebre = (a: number, r0: number, r1: number) => {
    for (let r = r0; r < r1; r += 1.15) {
      const bande = b.boite(.6, .035, 2.8, '#f2eee2', x + Math.cos(a) * r, .085, z + Math.sin(a) * r);
      bande.rotation.y = -a; bande.castShadow = false;
    }
  };
  // Elles aboutissent aux pointes ouest de l'étoile, entre deux massifs d'arbres.
  zebre(Math.PI * .9, chausseeInt + .6, chausseeExt - .4);
  zebre(Math.PI * 1.3, chausseeInt + .6, chausseeExt - .4);
  for (const zt of [z + trottoir + 2.5, z - trottoir - 2.5])
    for (let px = 10.2; px < 22; px += 1.25) b.boite(.72, .035, 2.8, '#f2eee2', px, .03, zt).castShadow = false;
  // Grands mâts d'éclairage sur le trottoir, entre les voies.
  for (const a of [Math.PI / 4, Math.PI * .75, Math.PI * 1.25])
    b.matEclairage(x + Math.cos(a) * (trottoir - 1.4), z + Math.sin(a) * (trottoir - 1.4));

  // Île centrale : bordure claire et sol dallé, sous l'étoile.
  b.cyl(ile, ile, .3, 48, b.tex('beton', 8, 8, '#cfc8b8'), x, .15, z).castShadow = false;
  b.cyl(ile + .12, ile + .12, .36, 48, '#e2ddce', x, .18, z, undefined, true);
  // Pylône, étoile et statue : cèdent la place au modèle etoile-rouge.glb.
  // Relevé sur le survol drone Download-7.mp4 (vue zénithale à 31 s) : deux
  // étoiles rouges imbriquées, en murets bas, posées à plat sur un dallage gris
  // où l'on circule ; au centre un socle pentagonal clair et une flèche blanche
  // lisse. Ni auvent sur poteaux, ni haubans, ni bandeaux de brique.
  const rExt = ile - 2, rInt = rExt * .427, sol = .3;
  b.ensemble('etoile-rouge', () => {
    const rouge = b.mat('#b8392d', {rugosite: .75}), rougeSombre = b.mat('#8f2d24', {rugosite: .8});
    const dallage = b.tex('beton', 6, 6, '#c3bdb0');
    // Grande étoile dallée, puis ses deux contours rouges surélevés.
    b.etoile(rExt, rInt, .25, dallage, x, sol, z);
    contourEtoile(b, rExt, rInt, .75, .9, rouge, x, sol, z);
    b.etoile(rExt * .62, rInt * .62, .25, dallage, x, sol + .25, z);
    contourEtoile(b, rExt * .62, rInt * .62, .8, .62, rouge, x, sol + .25, z);
    // Arête sombre au sommet des murets, lisible depuis le drone.
    contourEtoile(b, rExt * 1.01, rInt * 1.015, .985, .06, rougeSombre, x, sol + .9, z);
    // Cinq volées de marches descendent de l'étoile intérieure vers les creux.
    for (let i = 0; i < 5; i++) {
      const a = Math.PI / 2 + Math.PI / 5 + i * Math.PI * 2 / 5, r = rInt * .85;
      for (let m = 0; m < 3; m++) {
        const marche = b.boite(1.3, .12, .4, '#8d8a82', x + Math.cos(a) * (r + m * .4), sol + .47 - m * .12, z + Math.sin(a) * (r + m * .4));
        marche.rotation.y = -a + Math.PI / 2; marche.castShadow = false;
      }
    }
    // Socle pentagonal clair au pied de la flèche.
    b.cyl(2.2, 2.5, 1.2, 5, '#e6e1d4', x, sol + .6, z).rotation.y = Math.PI / 10;
    b.cyl(1.8, 2.2, .5, 5, '#d8d2c2', x, sol + 1.45, z).rotation.y = Math.PI / 10;
    // Flèche blanche effilée, à pied évasé par quatre ailerons.
    const blanc = b.mat('#eeebe2', {rugosite: .55}), socle = sol + 1.7;
    b.cyl(.95, 1.6, 27, 4, blanc, x, socle + 13.5, z).rotation.y = Math.PI / 4;
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      b.boite(2, 6, .3, blanc, x + Math.cos(a) * 1.7, socle + 3, z + Math.sin(a) * 1.7).rotation.y = -a;
      b.boite(1, 2.4, .3, blanc, x + Math.cos(a) * 1.4, socle + 6.9, z + Math.sin(a) * 1.4).rotation.y = -a;
    }
    // Chapiteau à bord festonné qui porte la statue.
    b.cyl(1.3, 1.05, 1.6, 10, blanc, x, socle + 27.8, z);
    b.maillage(new T.TorusGeometry(1.33, .12, 5, 20), '#d6d1c4', x, socle + 28.5, z).rotation.x = Math.PI / 2;
    statueEtoile(b, x, socle + 28.6, z);
  });
  b.panneau('PLACE DE L’ÉTOILE ROUGE', x, 9.5, z + ile, 10);
  // Vue du drone, l'île n'a pas de collier régulier : cinq massifs de grands
  // arbres remplissent chacun un creux entre deux branches, et les pointes de
  // l'étoile restent dégagées jusqu'à la bordure.
  for (let i = 0; i < 5; i++) {
    const a = Math.PI / 2 + Math.PI / 5 + i * Math.PI * 2 / 5;
    for (const [r, da, s] of [[8.2, 0, .7], [10.8, -.25, .62], [10.8, .25, .64], [11.3, 0, .58]] as const) {
      b.arbre(x + Math.cos(a + da) * r, z + Math.sin(a + da) * r, s + varie(i, r) * .1);
    }
  }
  // Grands mâts d'éclairage plantés sur l'étoile, et bancs à la pointe de
  // chaque branche, tournés vers la flèche. La pointe tournée vers la promenade
  // accueille le guide à la place du banc.
  for (let i = 0; i < 5; i++) {
    const a = Math.PI / 2 + i * Math.PI * 2 / 5;
    b.cyl(.07, .1, 7.5, 7, '#9ea3a0', x + Math.cos(a) * rExt * .7, sol + 3.75, z + Math.sin(a) * rExt * .7);
    b.boite(.7, .16, .3, '#e7e3d6', x + Math.cos(a) * rExt * .7, sol + 7.5, z + Math.sin(a) * rExt * .7).castShadow = false;
    if (i !== 1) bancUrbain(b, x + Math.cos(a) * (rExt + 1.1), z + Math.sin(a) * (rExt + 1.1), -a + Math.PI / 2);
  }
  villeEtoileRouge(b);
  b.panneau('Fin de la promenade', -4, 4, -403);
}

/**
 * Homme de bronze au sommet, vu de près à 44–46 s de Download-7.mp4 : houe
 * brandie à bout de bras, gerbe serrée contre le flanc gauche d'où sort une
 * flamme rouge. Patine vert-de-gris, bien plus sombre que la flèche.
 */
function statueEtoile(b: Batisseur, x: number, y: number, z: number) {
  const g = new T.Group(); g.position.set(x, y, z); g.rotation.y = .5; g.scale.setScalar(3); b.racine.add(g);
  const bronze = b.mat('#5a6356', {rugosite: .62, metal: .25});
  const flamme = b.mat('#d8342a', {rugosite: .4});
  b.cone(.07, .2, 7, flamme, -.06, 2.2, .42, g);
  b.cyl(.03, .03, .2, 6, bronze, -.06, 2.02, .42, g);
  b.cyl(.1, .09, .95, 8, bronze, .16, .48, -.1, g);
  b.cyl(.1, .09, .95, 8, bronze, -.13, .48, .12, g);
  b.boite(.28, .09, .16, bronze, .2, .05, -.1, g);
  b.boite(.28, .09, .16, bronze, -.15, .05, .12, g);
  b.cyl(.19, .22, .78, 10, bronze, 0, 1.32, 0, g);                                   // tunique
  b.boite(.46, .1, .3, bronze, 0, 1.06, 0, g);                                       // ceinturon
  b.cyl(.08, .09, .12, 8, bronze, 0, 1.77, 0, g);
  b.sphere(.13, bronze, 0, 1.9, 0, g);
  // Bras droit levé, houe brandie vers le ciel.
  b.cyl(.055, .06, .62, 7, bronze, .12, 1.94, -.22, g).rotation.z = -.35;
  b.cyl(.05, .055, .5, 7, bronze, .26, 2.44, -.24, g).rotation.z = -.15;
  const manche = b.cyl(.032, .032, .72, 7, bronze, .35, 2.92, -.24, g); manche.rotation.z = .3;
  const lame = b.boite(.26, .17, .05, bronze, .24, 3.24, -.24, g); lame.rotation.z = .3;
  // Bras gauche replié, qui serre la gerbe contre le flanc.
  b.cyl(.055, .06, .5, 7, bronze, .02, 1.52, .3, g).rotation.x = -.35;
  b.cyl(.05, .055, .34, 7, bronze, .06, 1.34, .4, g).rotation.x = .9;
  // Gerbe dressée du pied jusqu'à l'épaule, liée en deux points.
  for (let i = 0; i < 7; i++) {
    const a = i * 6.28 / 7;
    b.cyl(.03, .045, 1.95, 6, bronze, -.06 + Math.cos(a) * .08, .98, .42 + Math.sin(a) * .08, g).rotation.z = (varie(i, a) - .5) * .1;
  }
  for (const yl of [.5, 1.35]) b.maillage(new T.TorusGeometry(.12, .024, 5, 10), bronze, -.06, yl, .42, g).rotation.x = Math.PI / 2;
}

/**
 * Contour d'étoile à cinq branches, en muret : l'étoile pleine privée d'une
 * étoile homothétique de rapport `rapport`. La bande est plus large dans les
 * branches qu'aux creux, comme les bordures rouges de la place.
 */
function contourEtoile(b: Batisseur, rExt: number, rInt: number, rapport: number, hauteur: number,
  c: string | T.Material, x: number, y: number, z: number) {
  const trace = (forme: T.Shape | T.Path, k: number) => {
    for (let i = 0; i < 10; i++) {
      const a = i * Math.PI / 5 - Math.PI / 2, r = (i % 2 ? rInt : rExt) * k;
      i ? forme.lineTo(Math.cos(a) * r, Math.sin(a) * r) : forme.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    forme.closePath();
  };
  const forme = new T.Shape(); trace(forme, 1);
  const trou = new T.Path(); trace(trou, rapport); forme.holes.push(trou);
  const geo = new T.ExtrudeGeometry(forme, {depth: hauteur, bevelEnabled: false});
  geo.rotateX(-Math.PI / 2);
  return b.maillage(geo, c, x, y, z);
}

/**
 * Tissu bâti qui ceinture la place de l'Étoile Rouge, relevé sur TOUR.mp4 à
 * 38 s et sur Download-7.mp4 : un bâti bas de deux à quatre niveaux serre le
 * carrefour de toutes parts — façades bleues, ocre, rouges et roses, boutiques
 * et auvents au rez-de-chaussée, toits de tôle — avec une gare routière de cars.
 *
 * Les immeubles se tiennent hors du couloir du boulevard, qui traverse la place
 * du sud au nord, et laissent libres les voies rayonnantes. Le premier rang est
 * à quarante-deux mètres du centre : un joueur qui fait le tour de l'anneau peut
 * s'écarter de vingt-trois mètres, et la caméra recule de quatorze derrière lui.
 */
function villeEtoileRouge(b: Batisseur) {
  const {x: cx, z: cz} = GIRATOIRE;
  const teintes = ['#3f6f96', '#c4553f', '#d9ac48', '#c2879a', '#b5613c', '#e2ddcd', '#5f8087'];
  const accents = ['#2b5878', '#a63f2c', '#bf9034', '#a76a7c', '#95492c', '#c6bfa9', '#48656b'];
  const gare = {x: cx - 50, z: cz - 26};
  let index = 0;
  for (const [rang, pas] of [[42, 18], [56, 15]] as const) {
    for (let deg = 0; deg < 360; deg += pas, index++) {
      const a = deg * Math.PI / 180;
      const bx = cx + Math.cos(a) * rang, bz = cz + Math.sin(a) * rang;
      if (bx > -21 && bx < 39) continue;                         // couloir du boulevard et de ses façades
      if (bx > 62) continue;                                     // rangée d'horizon, à x=72
      if (bz > -318 && bx < -18) continue;                       // parvis du quartier de marchés
      if (Math.hypot(bx - gare.x, bz - gare.z) < 17) continue;   // emprise de la gare routière
      // Une voie rayonnante passe entre les immeubles, pas au travers.
      if (VOIES_GIRATOIRE.some(v => Math.abs(Math.atan2(Math.sin(a - v), Math.cos(a - v))) < Math.asin(11 / rang))) continue;
      immeubleEtoile(b, bx, bz, Math.PI - a, 2 + (index * 7) % 3,
        teintes[index % teintes.length], accents[index % accents.length], rang === 42);
    }
  }
  // Gare routière : deux rangées de cars à l'arrêt, au nord-ouest de la place.
  for (let rangee = 0; rangee < 2; rangee++) for (let c = 0; c < 4; c++) {
    const bx = gare.x - 6.6 + c * 4.4, bz = gare.z - 5.5 + rangee * 11;
    b.boite(2.5, 2.7, 9.4, ['#e6e2d4', '#cfd6d2', '#dcc9a8', '#d8dbd4'][c % 4], bx, 1.55, bz);
    b.boite(2.6, .95, 8.6, '#4a5f66', bx, 2.5, bz).castShadow = false;
    b.boite(2.6, .28, 9.6, '#b8bdb6', bx, 2.95, bz).castShadow = false;
  }
  b.panneau('GARE ROUTIÈRE', gare.x, 7.5, gare.z + 8, 7);
}

/** Petit immeuble du tissu de l'Étoile Rouge, boutique et auvent au rez-de-chaussée. */
function immeubleEtoile(b: Batisseur, x: number, z: number, orientation: number, niveaux: number,
  teinte: string, accent: string, devanture: boolean) {
  const g = new T.Group(); g.name = `immeuble-etoile-${Math.round(x)}-${Math.round(z)}`;
  g.position.set(x, 0, z); g.rotation.y = orientation; b.racine.add(g);
  const h = 3.2 * niveaux, profondeur = 9, largeur = 11 + (niveaux % 2) * 3;
  b.boite(profondeur, h, largeur, teinte, 0, h / 2, 0, g);
  b.boite(profondeur + .7, .3, largeur + .7, b.tex('tole', 4, 4), 0, h + .15, 0, g);
  for (let n = 1; n < niveaux; n++) {
    b.boite(profondeur + .2, .22, largeur + .2, accent, 0, n * 3.2, 0, g).castShadow = false;
    for (let dz = -largeur / 2 + 1.6; dz < largeur / 2 - 1; dz += 2.6)
      b.boite(.14, 1.5, 1.5, '#39484a', profondeur / 2 + .06, n * 3.2 + 1.5, dz, g).castShadow = false;
  }
  if (devanture) {
    b.boite(.16, 2.5, largeur - 1.4, '#2f3c3c', profondeur / 2 + .08, 1.4, 0, g).castShadow = false;
    const auvent = b.boite(2.3, .12, largeur, accent, profondeur / 2 + 1.15, 2.95, 0, g);
    auvent.rotation.z = .09; auvent.castShadow = false;
    for (const dz of [-largeur / 2 + .4, largeur / 2 - .4])
      b.cyl(.05, .05, 2.9, 5, '#8b8778', profondeur / 2 + 2.2, 1.45, dz, g);
  }
  return g;
}

/**
 * Quartier de marchés entre le Palais des Congrès et l'Étoile Rouge, relevé sur
 * TOUR.mp4 (≈ 42 s et 46 s) : la halle de Ganhi coiffée d'une toiture blanche
 * en éventail plissé percée d'un oculus, sa base en brique à arcades et ses
 * sheds vitrés, puis les grands hangars de tôle de Dantokpa en rangées
 * parallèles et un bâtiment ocre à l'extrémité du parvis.
 *
 * Ce côté du boulevard était nu sur quarante mètres, de z=-277 à z=-316 : rien
 * à traverser entre les deux monuments, ce qui faisait paraître l'Étoile Rouge
 * bien plus loin qu'elle n'est — elle n'est qu'à cent vingt mètres du Congrès.
 *
 * Deux contraintes fixent l'implantation. La façade de la halle ne descend pas
 * à l'est de x=-24 : la caméra recule jusqu'à quatorze mètres derrière le
 * joueur, qui peut longer le bord ouest de la promenade à x=-7,7, et elle
 * entrait dans le volume de brique dès qu'on tournait le regard. Et la halle
 * reste basse et en retrait pour que le pylône de l'Étoile continue de dépasser
 * au-dessus des toitures depuis tout le secteur du Congrès.
 */
export function quartierMarches(b: Batisseur) {
  const centre = -296;
  // Voie de desserte saturée de motos, puis le parvis de marché en béton usé.
  b.sol(15, 38, b.tex('asphalte', 1, 5, '#b4b4ae'), -15.6, centre, .015).name = 'desserte-marches';
  b.sol(57, 38, b.tex('beton', 26, 17, '#b5ae9e'), -51.5, centre, .008).name = 'parvis-marches';
  for (let z = -280; z >= -312; z -= 2.6) b.boite(.14, .03, 1.9, '#e8e3d4', -8.6, .03, z).castShadow = false;

  halleGanhi(b, -36, centre);
  for (const x of [-60, -72]) hangarTole(b, x, centre, 10, 24);

  // Bâtiment ocre à deux niveaux qui ferme le parvis au sud.
  b.boite(14, 6.4, 6, '#d9ac48', -38, 3.2, -312);
  b.boite(15, .35, 7, b.tex('tole', 5, 3), -38, 6.6, -312).castShadow = false;
  for (let dx = -5; dx <= 5; dx += 2.5) b.boite(1.5, 1.5, .14, '#4e5a4e', -38 + dx, 4.2, -309.05);
  // Mur d'enceinte bas et arbres dans la bande nord, entre parvis et Congrès.
  b.boite(40, 1.9, .38, '#cdc5b3', -50, .95, -280);
  for (const x of [-33, -47, -61]) b.boite(.5, 2.3, .5, '#a9a08d', x, 1.15, -280);
  for (const [x, z] of [[-30, -279], [-44, -276], [-68, -279]] as const) b.arbre(x, z, .7);

  // Rang de zémidjans en attente le long de la desserte : le nom les fait passer
  // au modèle détaillé et les range dans le masquage à distance de Rues.
  for (let i = 0; i < 7; i++) {
    const moto = vehicule(b, 'zemidjan');
    moto.position.set(-11.4, .1, -285 - i * 3.4);
    moto.rotation.y = Math.PI / 2 + varie(i, 4) * .3;
    moto.name = `moto-borne-ganhi-${i}`; b.racine.add(moto);
  }
  for (const [x, z] of [[-19, -278], [-19, -313]] as const) {
    const gare = vehicule(b, 'voiture'); gare.position.set(x, .08, z); gare.rotation.y = Math.PI / 2; b.racine.add(gare);
  }
  for (const z of [-282, -300, -314]) b.lampadaireSimple(-10.8, z, -1);
  b.panneau('MARCHÉ GANHI', -27, 16, -296, 8);
  b.panneau('Grand marché · Dantokpa', -66, 11.5, -296, 7);
}

/**
 * Halle de Ganhi : socle de brique à galerie d'arcades, sheds à lanterneaux au
 * nord et au sud, toiture en éventail plissé percée d'un oculus.
 */
function halleGanhi(b: Batisseur, x: number, z: number) {
  // Socle de brique, avec une travée centrale en retrait qui creuse la façade.
  b.boite(24, 6.4, 28, '#a05340', x, 3.2, z);
  b.boite(24.6, 6.6, 8, '#964c3a', x - .3, 3.3, z);
  b.boite(.3, 3.6, 25, '#31383a', x + 11.9, 2.2, z).castShadow = false;
  for (let dz = -12; dz <= 12; dz += 2.5) b.boite(1.1, 6.4, 1.1, '#b76a52', x + 12.3, 3.2, z + dz);
  b.boite(25, .85, 29, '#8b4633', x, 6.8, z);
  // Enseigne plaquée sur la façade : mince selon x, développée selon z.
  b.boite(.22, 1.2, 9.5, '#e6dcc4', x + 12.95, 5.1, z).castShadow = false;

  // Sheds à lanterneaux qui flanquent l'éventail, au nord et au sud de la halle.
  for (const dz of [-13.1, -10.7, 10.7, 13.1]) {
    const pan = b.boite(21, .24, 2.3, b.tex('tole', 6, 1, '#dcdfd9'), x, 7.5, z + dz);
    pan.rotation.x = -.4; pan.castShadow = false;
    b.boite(21, .72, .16, '#7d9aa0', x, 7.78, z + dz + 1.05).castShadow = false;
  }

  // Tambour vitré qui porte l'éventail au-dessus de l'acrotère : sans lui, la
  // toiture restait cachée derrière la rive de brique depuis la promenade, là
  // où le joueur marche, alors que c'est la signature du bâtiment.
  b.cyl(9.4, 9.6, 2.6, 16, '#e7e4d9', x, 8.5, z, undefined, true);
  for (let i = 0; i < 16; i++) {
    const a = i * Math.PI / 8;
    b.boite(.4, 2.6, .4, '#cbc5b4', x + Math.cos(a) * 9.5, 8.5, z + Math.sin(a) * 9.5).castShadow = false;
  }
  b.cyl(10.1, 10.1, .3, 16, '#d7d2c2', x, 9.9, z).castShadow = false;

  // Toiture en éventail : seize plis qui se chevauchent comme une étoffe pliée,
  // retombant vers la rive, et un tambour ajouré au centre.
  for (let i = 0; i < 16; i++) {
    const a = i * Math.PI / 8, pair = i % 2 === 0;
    const pli = b.boite(8.4, .3, 3.4, pair ? '#f7f5ee' : '#d8d4c5', x + Math.cos(a) * 6.1, pair ? 10.5 : 10.62, z + Math.sin(a) * 6.1);
    pli.rotation.y = -a; pli.rotation.z = -.21; pli.castShadow = false;
  }
  b.cyl(3.05, 3.05, 2.1, 16, '#eeebe1', x, 12.2, z, undefined, true);
  b.cyl(2.85, 2.85, .18, 16, '#2c3130', x, 11.3, z).castShadow = false;
  b.cyl(3.35, 3.35, .24, 16, '#f6f4ed', x, 13.35, z).castShadow = false;
}

/** Hangar de tôle de Dantokpa : grande toiture à quatre pans sur poteaux, côtés ouverts. */
function hangarTole(b: Batisseur, x: number, z: number, largeur: number, longueur: number) {
  const g = new T.Group(); g.name = `hangar-dantokpa-${Math.round(x)}`; g.position.set(x, 0, z); b.racine.add(g);
  for (const dx of [-largeur / 2 + .7, largeur / 2 - .7])
    for (let dz = -longueur / 2 + 2; dz <= longueur / 2 - 2; dz += 4.6)
      b.cyl(.17, .21, 4.8, 6, '#b3b6b0', dx, 2.4, dz, g);
  b.boite(largeur, .3, longueur, '#c4c7c1', 0, 4.9, 0, g).castShadow = false;
  const toit = b.cone(largeur * .74, 2.5, 4, b.tex('tole', 6, 6, '#dfe2dd'), 0, 6.3, 0, g);
  toit.rotation.y = Math.PI / 4; toit.scale.set(1, 1, longueur / largeur); toit.castShadow = false;
  // Étals bâchés alignés sous la charpente.
  for (let dz = -longueur / 2 + 3; dz <= longueur / 2 - 3; dz += 3.8) {
    b.boite(largeur - 3, .12, 1.5, '#9a7a52', 0, .95, dz, g).castShadow = false;
    b.boite(largeur - 4, .7, 1.1, ['#2f7b6e', '#b0652f', '#8d4557'][Math.abs(Math.round(dz)) % 3], 0, .5, dz, g).castShadow = false;
  }
  return g;
}

/** Front bâti du boulevard : boutiques basses et petits immeubles. */
export function ville(b: Batisseur) {
  for (let i = 0; i < 28; i++) {
    const z = 20 - i * 16;
    if (z < -95 && z > -195) continue;                                               // dégagement de la Présidence
    if (z < -330) continue;                                                          // dégagement de l’Étoile Rouge
    const v = varie(z, i);
    if (v < .45) {
      const h = 3.4 + v * 2;
      b.boite(9, h, 11, b.tex('boutique', 2, 1, ['#e8c063', '#d9b48d', '#cfd3b6', '#e0a97e'][i % 4]), 30, h / 2, z);
      b.boite(10, .4, 12, b.tex('tole', 4, 4), 30, h + .2, z);
    } else {
      const h = 7 + (i * 7 % 9);
      b.boite(9, h, 11, b.tex('immeuble', 2, h / 8, ['#e4b68b', '#e4dbbe', '#bdc9b5'][i % 3]), 30, h / 2, z);
      b.boite(9.6, .5, 11.6, '#cdc4ad', 30, h + .25, z);
    }
  }
  for (const [name, z] of [['Esplanade · tout droit', -75], ['Palais des Congrès · tout droit', -198], ['Étoile Rouge · tout droit', -315]] as const)
    b.panneau(name, 0, 4, z);
}

/** Guides, étals et bornes de transport, aux positions attendues par le jeu. */
export function figures(b: Batisseur) {
  for (const [nom,z] of [['Esplanade · tout droit',-75],['Palais des Congrès · tout droit',-198],['Étoile Rouge · tout droit',-315]] as const)
    b.panneau(nom, 0, 4, z, 4);

  for (const guide of guides) {
    b.racine.add(new Personnage('#e8e2ca', guide.x, guide.z).objet);
    // On contourne le guide au lieu de le traverser.
    b.obstacle(guide.x, guide.z, .7, .7);
    b.panneau(`E · ${guide.id === 'presidence' ? 'Présidence' : 'Guide'}`, guide.x, 3.5, guide.z);
  }
  for (const z of etals) {
    const vendeuse = new Personnage('#b75c47', 3, z - 1, {pagne: true});
    vendeuse.objet.name = 'vendeuse-aicha'; b.racine.add(vendeuse.objet);
    b.boite(3, 1, 1.5, '#a77750', 3, .6, z + .5);
    b.boite(4, .18, 3, '#d58b4a', 3, 3, z);
    for (const x of [1.4, 4.6]) b.boite(.1, 3, .1, '#74543c', x, 1.5, z);
    for (let i = 0; i < 6; i++) b.cyl(.19, .19, .3, 10, i % 2 ? '#d4aa40' : '#73a154', 2 + i * .4, 1.25, z + .5);
    b.obstacle(3, z, 4, 3);
    b.panneau('E · Aïcha', 3, 4, z);
  }
  for (const z of stations) {
    b.boite(.2, 2.8, .2, '#35534b', 3, 1.4, z);
    b.panneau('E · Transport', 3, 3.2, z);
    // Zémidjan en attente, garé hors de la piste de mise en forme.
    const moto = vehicule(b, 'zemidjan'); moto.position.set(1.8, .1, z); moto.rotation.y = 1.2;
    moto.name = `moto-borne-${z}`; b.racine.add(moto);
    b.obstacle(1.8, z, 1.8, 2.2);
  }
  // Quelques passants pour animer la promenade.
  for (const [x, z, couleur] of [[-21, 103, '#6d8e9b'], [-1.5, 74, '#b76554'], [-4.5, -60, '#cf7f4a'], [5.5, -104, '#7a9bb8'], [-5, -190, '#c9a04c'],
    [5.8, -250, '#8fae7c'], [-4.8, -300, '#b8746b'], [6, -340, '#d9c46a']] as const)
    b.racine.add(new Personnage(couleur, x, z).objet);
}

/** Zémidjan rouge à conducteur en chemise jaune, ou voiture de course urbaine. */
export function vehicule(b: Batisseur, type: 'zemidjan' | 'voiture', couleur?:string) {
  const g = new T.Group();
  if (type === 'zemidjan') {
    b.boite(.58, .42, 1.5, couleur??'#9e3b32', 0, .88, 0, g);
    b.boite(.5, .22, .55, '#8d8a86', 0, .62, -.1, g);                                // bloc moteur
    b.boite(.54, .14, .92, '#2f6f7a', 0, 1.16, .1, g);                               // selle longue
    for (const z of [-.95, .95]) {
      const roue = b.cyl(.4, .4, .16, 12, '#29352f', 0, .45, z, g); roue.rotation.z = Math.PI / 2;
      b.cyl(.22, .22, .18, 10, '#c3c6c2', 0, .45, z, g).rotation.z = Math.PI / 2;
    }
    b.boite(.88, .07, .09, '#c9cdca', 0, 1.48, .82, g);                              // guidon
    b.cyl(.13, .13, .1, 10, '#f2ecd8', 0, 1.24, 1, g).rotation.x = Math.PI / 2;      // phare
    const conducteur = new Personnage('#f2c928', 0, .35, {jambes: '#3f5a86', casque: '#1d2124'}).objet;
    // Silhouette assise : la foule ne la remplace pas par un corps qui marche debout sur la selle.
    conducteur.userData.conducteur = true;
    conducteur.position.set(0, .52, -.35); conducteur.scale.setScalar(.82); g.add(conducteur);
  } else {
    b.boite(1.6, .75, 2.8, couleur??'#d4ad61', 0, .8, 0, g);
    b.boite(1.35, .7, 1.4, '#497675', 0, 1.5, -.2, g);
    for (const x of [-.85, .85]) for (const z of [-.9, .9]) {
      const roue = b.cyl(.35, .35, .18, 12, '#29352f', x, .4, z, g); roue.rotation.z = Math.PI / 2;
    }
    b.boite(1.4, .17, .08, '#fff1ba', 0, .9, 1.43, g);
  }
  return g;
}
