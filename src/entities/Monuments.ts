import * as T from 'three';
import { Batisseur, varie } from './Batisseur';
import { Personnage } from './Joueur';
import { guides, etals, stations } from '../content/zones';

/**
 * Reprise en 3D des cinq lieux de la balade d’après les photographies
 * référencées dans docs/REFERENCES.md. Les volumes restent stylisés mais
 * les silhouettes, les matières et les couleurs suivent les vues réelles.
 */

const BRONZE = '#75695c';
const BEIGE_MARINA = '#cdbb9a';
const CREME_CONGRES = '#ece5d6';

/** Sol continu de la promenade, chaussée, accotements et rives. */
export function boulevard(b: Batisseur) {
  const longueur = 436, centre = -193;
  b.sol(28, longueur, b.tex('sable', 14, 218, '#cfc6ab'), -22, centre, -.05);        // rive ouest
  b.sol(30, longueur, b.tex('sable', 15, 218, '#c9c2a8'), 36, centre, -.05);         // rive est
  b.sol(16.4, longueur, b.tex('paves', 8, 216), .1, centre);                          // trottoir
  b.sol(3, longueur, b.tex('gazon', 1.5, 145), 9.7, centre, -.02);                   // accotement planté
  b.sol(10, longueur, b.tex('asphalte', 1, 54), 16, centre, -.03);                   // chaussée
  for (const x of [-8.2, 8.35]) b.boite(.35, .24, longueur, '#e7e1d2', x, .12, centre).castShadow = false;
  for (let z = 14; z > -400; z -= 34) b.lampadaireDouble(10.6, z);
  for (let z = -2; z > -400; z -= 34) b.lampadaireSimple(11.4, z, 1);
}

/** Corniche Est d’Akpakpa : plage, cocotiers, muret, paillotes et piste de mise en forme. */
export function corniche(b: Batisseur) {
  const centre = -37, longueur = 136;
  b.sol(26, longueur, b.tex('sable', 13, 68), -21.5, centre, -.04);                  // plage
  b.sol(7, longueur, b.tex('sable', 4, 68, '#e6d6b0'), -30, centre, .85);            // cordon dunaire
  b.sol(64, longueur, b.tex('eau', 16, 34), -66, centre, -.25);                      // océan
  b.boite(1.4, .06, longueur, '#eef4f2', -34.2, .02, centre).castShadow = false;     // ligne d’écume
  // Muret blanc qui longe le trottoir côté mer.
  b.boite(.45, .95, longueur, '#f1eee4', -8.7, .48, centre);
  b.boite(.62, .1, longueur, '#cec7b5', -8.7, 1, centre);
  // Piste cyclable et de mise en forme, support du parcours de jogging.
  b.sol(3, 66, b.tex('piste', 1, 11), 6.5, -17, .04);
  for (const z of [8, -42]) b.boite(3, .03, .32, '#fff4d5', 6.5, .08, z).castShadow = false;
  b.panneau('LA CORNICHE', -5, 4, 4, 4);
  b.panneau('ESPACE · Jogging', 6.5, 2.6, 6);
  b.panneau('Arrivée jogging', 6.5, 2.5, -42);
  // Cocotiers en fosse le long du trottoir, comme sur la Corniche réalisée.
  for (let z = 18; z > -92; z -= 12) b.cocotier(-6.6, z);
  for (let z = 12; z > -92; z -= 16) b.cocotier(9.2, z, false);
  // Jeunes cocotiers plantés sur le sable.
  for (let z = 16; z > -90; z -= 9) {
    const x = -14 - varie(z, 3) * 12;
    b.cone(.5, 1.5, 5, '#5f8a4a', x, .7, z + varie(x, z) * 4).castShadow = false;
  }
  // Bancs tournés vers la mer.
  for (let z = 14; z > -88; z -= 26) {
    b.boite(2.6, .18, .7, '#9a6d4a', -5.2, .68, z);
    b.boite(2.6, .68, .14, '#9a6d4a', -5.2, 1.04, z - .42);
    for (const dx of [-1.1, 1.1]) b.boite(.14, .62, .52, '#3a4f43', -5.2 + dx, .31, z);
    b.obstacle(-5.2, z, 3, 1.5);
  }
  paillote(b, -15.5, 4, true);
  paillote(b, -16.5, -30, false);
  paillote(b, -15, -66, false);
}

/** Buvette sur pilotis en bord de plage, toiture de paille et garde-corps de bois. */
function paillote(b: Batisseur, x: number, z: number, piscine: boolean) {
  const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = .12; b.racine.add(g);
  for (const dx of [-3.4, 0, 3.4]) for (const dz of [-2.4, 2.4]) b.cyl(.17, .2, 2.7, 6, '#b9a481', dx, 1.35, dz, g);
  b.boite(8.4, .26, 6, '#c9b48c', 0, 2.75, 0, g);
  for (const dz of [-3, 3]) {
    b.boite(8.4, .12, .12, '#dccdae', 0, 3.85, dz, g);
    b.boite(8.4, .12, .12, '#dccdae', 0, 3.3, dz, g);
    for (let i = -3; i <= 3; i++) b.boite(.1, .95, .1, '#dccdae', i * 1.2, 3.4, dz, g);
  }
  b.cone(6.6, 2.3, 4, b.tex('tole', 3, 3, '#b39a63'), 0, 5.2, 0, g).rotation.y = Math.PI / 4;
  b.boite(4, 2.4, 3.4, '#8fb87f', -1.5, 1.2, 0, g);                                   // local peint en vert
  if (piscine) b.sol(5, 4, b.tex('eau', 3, 3, '#9fd7dd'), x + 6.4, z + 1.6, .12);
  b.obstacle(x, z, 8, 6);
}

/** Esplanade des Amazones : vaste plateforme ouverte, statue de 30 m et portiques du port. */
export function esplanadeAmazone(b: Batisseur) {
  b.sol(44, 78, b.tex('gazon', 22, 39), -32, -137, .04);
  b.sol(32, 36, b.tex('beton', 16, 18), -21, -124, .07);
  b.boite(.5, 1.1, 78, '#d5cab1', -53, .55, -137);
  for (let z = -104; z > -172; z -= 13) { b.lampadaireSimple(-11.5, z, -1); b.lampadaireSimple(-44, z, 1); }
  // Portiques du port de Cotonou, aperçus au fond des photos de l’esplanade.
  for (const z of [-104, -124, -144]) portique(b, -80, z);
  statueAmazone(b, -19, -123);
  b.panneau('MONUMENT DE L’AMAZONE', -19, 30, -123, 11);
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
  b.boite(12, 1.6, 10, b.tex('beton', 6, 5, '#cec2a8'), x, .8, z);
  b.boite(9, .5, 7, '#c9bda4', x, 1.75, z);
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
  // Bâtiments : cèdent la place au modèle palais-congres.glb.
  b.ensemble('palais-congres', () => {
    tambour(b, -25, -235, 8.6, 10.6, 9.2, true);
    tambour(b, -28.5, -258, 6.2, 7.8, 7.2, false);
    // Aile de liaison et sa dalle en surplomb sur poteaux.
    b.boite(13, 5, 15, b.mat(CREME_CONGRES), -27, 2.5, -247);
    b.boite(16, .55, 19, '#f4efe2', -26.5, 5.3, -247);
    for (let z = -239; z >= -255; z -= 4) b.cyl(.32, .32, 5, 8, '#e4ddcb', -18.8, 2.5, z);
    b.boite(9, 4.6, 12, b.mat(CREME_CONGRES), -33, 2.3, -246);
    b.boite(.2, 3.4, 11, b.tex('claustra', 4, 1.4, '#f0ebdf'), -28.4, 2.5, -246);        // claustra en facade
    // Emmarchement d’entrée face à la promenade.
    for (let marche = 0; marche < 5; marche++) b.boite(13, .36, 1.1 * (5 - marche), '#ded6c2', -14.4 - marche * .5, .18 + marche * .36, -235);
    b.boite(6, 4.4, .4, '#3d4a44', -16.2, 2.2, -235);
    for (let z = -226; z >= -252; z -= 3.6) b.cyl(.09, .11, 7, 8, '#f0ece0', -12.6, 3.5, z);
  });
  for (const z of [-218, -266, -274]) b.arbre(-13.5, z);
  for (const z of [-224, -230, -256, -262]) b.haie(-11.8, z, 1.6, 4, .7);
  b.cocotier(-11.5, -240, false);
  b.panneau('PALAIS DES CONGRÈS', -24, 15, -240, 9);
}

function tambour(b: Batisseur, x: number, z: number, rBas: number, rHaut: number, h: number, claustra: boolean) {
  b.cyl(rHaut, rBas, h, 24, b.tex('cannelures', 8, 1), x, h / 2, z);
  b.cyl(rHaut + .9, rHaut + .9, .7, 24, '#f4efe2', x, h + .35, z);
  b.anneau(rHaut * .36, rHaut * .5, '#b08d52', x, h + .78, z);
  b.cyl(rHaut * .38, rHaut * .38, .22, 24, '#7d6a4a', x, h + .62, z);                  // verriere en retrait
  if (claustra) {
    b.cyl(rHaut + .4, rHaut + .4, 4.4, 20, b.tex('claustra', 10, 1, '#f0ebdf', {face2: true}), x, 2.2, z, undefined, true);
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * .3;
      b.cyl(.42, .46, 4.4, 8, '#e8e1cf', x + Math.cos(a) * (rHaut + .4), 2.2, z + Math.sin(a) * (rHaut + .4));
    }
  }
}

/**
 * Place de l’Étoile Rouge : étoile rouge à cinq branches, pylône cannelé
 * à bandeaux de brique et statue de bronze aux trois attributs.
 */
export function etoileRouge(b: Batisseur) {
  const x = -28, z = -364;
  b.sol(64, 96, b.tex('sable', 32, 48, '#c6bda4'), -42, z, .02);
  b.cyl(16.5, 16.5, .3, 40, b.tex('beton', 10, 10), x, .12, z).castShadow = false;
  b.anneau(17.2, 23, b.tex('asphalte', 6, 1), x, .06, z, Math.PI * .35, Math.PI * 1.35);
  b.anneau(16.8, 17.2, '#e6e0d0', x, .08, z, Math.PI * .35, Math.PI * 1.35);
  // Cinq voies convergentes, évoquées par des amorces de chaussée.
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * .5 + i * Math.PI * 2 / 5;
    if (Math.cos(a) > .55) continue;
    const r = 31, voie = b.boite(9, .2, 18, b.tex('asphalte', 1, 2), x + Math.cos(a) * r, .05, z + Math.sin(a) * r);
    voie.rotation.y = -a; voie.castShadow = false;
  }
  // Pylône, étoile et statue : cèdent la place au modèle etoile-rouge.glb.
  b.ensemble('etoile-rouge', () => {
    // Soubassement rouge et étoile à cinq branches.
    b.cyl(16.6, 16.6, .95, 40, '#a8382c', x, .48, z, undefined, true);
    b.etoile(13, 5.6, 1.4, '#a8382c', x, .1, z);
    b.etoile(12.2, 5, .3, b.tex('beton', 6, 6, '#cfc7b4'), x, 1.5, z);
    for (let marche = 0; marche < 4; marche++) b.boite(6, .4, .9, '#b7ae9a', x + 13.6 + marche * .8, .2 + marche * .4, z);
    // Auvent rouge porté par dix poteaux, tel qu’il coiffe le pied du monument.
    for (let i = 0; i < 10; i++) {
    const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? 4.6 : 10.6;
    b.cyl(.22, .26, 3.2, 8, '#9d3428', x + Math.cos(a) * r, 3.4, z + Math.sin(a) * r);
    }
    b.etoile(11.5, 5, .4, '#a8382c', x, 5, z);
    b.etoile(11.1, 4.7, .18, '#8e2f24', x, 4.82, z);
    // Pylône effilé : pied évasé, fût cannelé à bandeaux de brique.
    const socle = 1.8;
    const pied = b.cyl(1.75, 4.5, 13, 4, b.tex('cannelures', 3, 3, '#cbc3b0'), x, socle + 6.5, z);
    pied.rotation.y = Math.PI / 4;
    const cannele = b.tex('cannelures', 3, 3, '#cbc3b0');
    const futs: [number, number, number, number][] = [[1.4, 1.75, 12, socle + 19], [1.15, 1.4, 8, socle + 29]];
    for (const [rHaut, rBas, h, y] of futs) b.cyl(rHaut, rBas, h, 4, cannele, x, y, z).rotation.y = Math.PI / 4;
    // Bandeaux de brique, dans l’axe horizontal comme sur le monument.
    for (const [rHaut, rBas, h, y] of futs) for (let i = 1; i <= 3; i++) {
    const u = i / 4, r = rBas + (rHaut - rBas) * u + .04;
    b.cyl(r, r, .55, 4, '#a4614c', x, y - h / 2 + u * h, z).rotation.y = Math.PI / 4;
    }
    for (let i = 1; i <= 2; i++) {
    const u = i / 3, r = 4.5 + (1.75 - 4.5) * u + .05;
    b.cyl(r, r, .5, 4, '#a4614c', x, socle + u * 13, z).rotation.y = Math.PI / 4;
    }
    b.boite(2.9, .5, 2.9, '#c6bda9', x, socle + 33.2, z);
    // Haubans tendus vers le socle de l’étoile.
    for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    b.cable([x, socle + 20, z], [x + Math.cos(a) * 11, socle + 1.7, z + Math.sin(a) * 11], .05, '#b6b2a4');
    }
    statueEtoile(b, x, socle + 33.5, z);
  });
  b.panneau('PLACE DE L’ÉTOILE ROUGE', x, 8.5, z + 13, 10);
  // Abords : arbres étalés, mâts d’éclairage, garde-corps vert et boutiques.
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * .45 + i * Math.PI * .17;
    b.arbre(x + Math.cos(a) * 21, z + Math.sin(a) * 21);
  }
  b.matEclairage(-17, -342); b.matEclairage(-47, -385);
  b.boite(.1, .5, 26, '#2f6b45', -10.5, .8, -364).castShadow = false;
  for (let zp = -352; zp >= -376; zp -= 6) b.boite(.3, .9, .3, '#2f6b45', -10.5, .45, zp);
  b.cyl(.09, .11, 5.5, 8, '#e0b83c', -11.9, 2.75, -357);
  for (let i = 0; i < 4; i++) {
    const zb = -344 - i * 12;
    b.boite(9, 3.4, 8, b.tex('boutique', 2, 1, ['#e8c063', '#dcae7c', '#cfd0b4', '#e2b48f'][i]), -52, 1.7, zb);
    b.boite(10, .35, 9, b.tex('tole', 4, 4), -52, 3.6, zb);
  }
  b.panneau('Fin de la promenade', 0, 4, -403);
}

/** Homme de bronze au sommet : houe brandie, fusil à l’épaule, fagot de bois. */
function statueEtoile(b: Batisseur, x: number, y: number, z: number) {
  const g = new T.Group(); g.position.set(x, y, z); g.rotation.y = .5; g.scale.setScalar(3); b.racine.add(g);
  const bronze = b.mat(BRONZE, {rugosite: .6, metal: .2});
  b.cyl(.1, .09, .95, 8, bronze, .16, .48, -.1, g);
  b.cyl(.1, .09, .95, 8, bronze, -.13, .48, .12, g);
  b.boite(.28, .09, .16, bronze, .2, .05, -.1, g);
  b.boite(.28, .09, .16, bronze, -.15, .05, .12, g);
  b.cyl(.19, .22, .78, 10, bronze, 0, 1.32, 0, g);                                   // tunique
  b.boite(.46, .1, .3, bronze, 0, 1.06, 0, g);                                       // ceinturon
  b.cyl(.08, .09, .12, 8, bronze, 0, 1.77, 0, g);
  b.sphere(.13, bronze, 0, 1.9, 0, g);
  b.boite(.3, .07, .28, bronze, .02, 1.99, 0, g);                                    // calot
  // Bras droit levé, houe brandie vers le ciel.
  b.cyl(.055, .06, .62, 7, bronze, .12, 1.94, -.22, g).rotation.z = -.35;
  b.cyl(.05, .055, .5, 7, bronze, .26, 2.44, -.24, g).rotation.z = -.15;
  const manche = b.cyl(.032, .032, .72, 7, bronze, .35, 2.92, -.24, g); manche.rotation.z = .3;
  const lame = b.boite(.26, .17, .05, bronze, .24, 3.24, -.24, g); lame.rotation.z = .3;
  // Bras gauche le long du corps, fusil en bandoulière dans le dos.
  b.cyl(.055, .06, .66, 7, bronze, -.04, 1.5, .26, g);
  b.cyl(.028, .028, 1.15, 7, bronze, -.16, 1.35, .06, g).rotation.set(0, 0, .32);
  // Fagot de bois dressé à côté de lui.
  for (let i = 0; i < 7; i++) {
    const a = i * 6.28 / 7;
    b.cyl(.035, .04, 1.6, 6, bronze, -.42 + Math.cos(a) * .1, .8, .5 + Math.sin(a) * .1, g).rotation.z = (varie(i, a) - .5) * .12;
  }
  for (const yl of [.55, 1.15]) b.maillage(new T.TorusGeometry(.14, .022, 5, 10), bronze, -.42, yl, .5, g).rotation.x = Math.PI / 2;
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
    b.panneau(`E · ${guide.id === 'presidence' ? 'Présidence' : 'Guide'}`, guide.x, 3.5, guide.z);
  }
  for (const z of etals) {
    b.racine.add(new Personnage('#b75c47', 3, z - 1, {pagne: true}).objet);
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
    const moto = vehicule(b, 'zemidjan'); moto.position.set(1.8, .1, z); moto.rotation.y = 1.2; b.racine.add(moto);
    b.obstacle(1.8, z, 1.8, 2.2);
  }
  // Quelques passants pour animer la promenade.
  for (const [x, z, couleur] of [[-4.5, -60, '#cf7f4a'], [5.5, -104, '#7a9bb8'], [-5, -190, '#c9a04c'],
    [5.8, -250, '#8fae7c'], [-4.8, -300, '#b8746b'], [6, -340, '#d9c46a']] as const)
    b.racine.add(new Personnage(couleur, x, z).objet);
}

/** Zémidjan rouge à conducteur en chemise jaune, ou voiture de course urbaine. */
export function vehicule(b: Batisseur, type: 'zemidjan' | 'voiture') {
  const g = new T.Group();
  if (type === 'zemidjan') {
    b.boite(.58, .42, 1.5, '#9e3b32', 0, .88, 0, g);
    b.boite(.5, .22, .55, '#8d8a86', 0, .62, -.1, g);                                // bloc moteur
    b.boite(.54, .14, .92, '#2f6f7a', 0, 1.16, .1, g);                               // selle longue
    for (const z of [-.95, .95]) {
      const roue = b.cyl(.4, .4, .16, 12, '#29352f', 0, .45, z, g); roue.rotation.z = Math.PI / 2;
      b.cyl(.22, .22, .18, 10, '#c3c6c2', 0, .45, z, g).rotation.z = Math.PI / 2;
    }
    b.boite(.88, .07, .09, '#c9cdca', 0, 1.48, .82, g);                              // guidon
    b.cyl(.13, .13, .1, 10, '#f2ecd8', 0, 1.24, 1, g).rotation.x = Math.PI / 2;      // phare
    const conducteur = new Personnage('#f2c928', 0, .35, {jambes: '#3f5a86', casque: '#1d2124'}).objet;
    conducteur.position.set(0, .52, -.35); conducteur.scale.setScalar(.82); g.add(conducteur);
  } else {
    b.boite(1.6, .75, 2.8, '#d4ad61', 0, .8, 0, g);
    b.boite(1.35, .7, 1.4, '#497675', 0, 1.5, -.2, g);
    for (const x of [-.85, .85]) for (const z of [-.9, .9]) {
      const roue = b.cyl(.35, .35, .18, 12, '#29352f', x, .4, z, g); roue.rotation.z = Math.PI / 2;
    }
    b.boite(1.4, .17, .08, '#fff1ba', 0, .9, 1.43, g);
  }
  return g;
}
