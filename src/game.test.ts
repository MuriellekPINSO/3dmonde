import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buy,reply} from './game.ts';
test('achat valide : débit et inventaire cohérents',()=>{const state={balance:500,inventory:[] as string[]};buy(state,'eau');assert.equal(state.balance,300);assert.deepEqual(state.inventory,['Eau fraîche']);});
test('solde insuffisant et produit inconnu ne modifient pas l’état',()=>{const state={balance:50,inventory:[] as string[]};buy(state,'ananas');buy(state,'inconnu');assert.deepEqual(state,{balance:50,inventory:[]});});
test('la conversation ne réalise aucun paiement',()=>{assert.match(reply('Je veux acheter de l’eau'),/confirmer/);assert.match(reply('azerty'),/reformuler/);assert.match(reply('Quels sont les PRIX ?'),/200 FCFA/);});

import {Partie,Zemidjan,Voiture,Vendeuse,SportJogging} from './core/Partie.ts';
import {guides,lieux,zoneActuelle} from './content/zones.ts';
import * as T from 'three';
import {placerModele} from './entities/Placement.ts';
import {zoneMorte} from './input/Manette.ts';
import {Joueur} from './entities/Joueur.ts';
test('transport : paiement unique, descente, solde insuffisant',()=>{
 const p=new Partie();assert.equal(p.monter(new Zemidjan()),true);assert.equal(p.balance,9800);
 assert.equal(p.monter(new Voiture()),false);assert.equal(p.balance,9800);p.descendre();
 assert.equal(p.monter(new Voiture()),true);p.descendre();p.portefeuille.restaurer(300);
 assert.equal(p.monter(new Voiture()),false);assert.equal(p.transport,null);assert.equal(p.balance,300);
});
test('vendeuse : inventaire partagé avec le portefeuille du transport',()=>{
 const p=new Partie(),v=new Vendeuse();p.monter(new Voiture());p.descendre();v.acheter(p,'ananas');
 assert.equal(p.balance,9200);assert.deepEqual(p.inventory,['Ananas découpé']);
});
test('fin : tous les guides uniques sont nécessaires, aucun transport requis',()=>{
 const p=new Partie();for(const g of guides.slice(0,-1))p.visiter(g.id);p.visiter(guides[0].id);
 assert.equal(p.terminee(lieux),false);p.visiter(guides.at(-1)!.id);assert.equal(p.terminee(lieux),true);
 assert.equal(p.balance,10000);assert.equal(zoneActuelle(-220).id,'congres');
});
test('sport : départ à pied, sortie de piste et arrivée',()=>{
 const s=new SportJogging();assert.equal(s.demarrer(6,8,true),false);assert.equal(s.demarrer(0,8,false),false);
 assert.equal(s.demarrer(6,8,false),true);assert.equal(s.avancer(4,-10,1),'sortie');assert.equal(s.termine,false);
 s.demarrer(6,8,false);assert.equal(s.avancer(6,-42,8),'arrivee');assert.equal(s.termine,true);assert.equal(s.distance,50);
});
test('placement GLB : origine décentrée, échelle interne et rotation conservées',()=>{
 const root=new T.Group();root.scale.setScalar(2);root.position.set(3,-4,5);
 const mesh=new T.Mesh(new T.BoxGeometry(2,6,4));mesh.position.set(4,2,-3);root.add(mesh);
 const {objet}=placerModele(root,{x:-19,z:-123,hauteur:24,base:2,rotation:Math.PI/2});
 const box=new T.Box3().setFromObject(objet),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
 assert.ok(Math.abs(center.x+19)<1e-8);assert.ok(Math.abs(center.z+123)<1e-8);assert.ok(Math.abs(box.min.y-2)<1e-8);assert.ok(Math.abs(size.y-24)<1e-8);
 assert.equal(root.scale.x,2);assert.throws(()=>placerModele(new T.Group(),{x:0,z:0}));
});
test('manette : zone morte et amplitude analogique',()=>{
 assert.equal(zoneMorte(.1),0);assert.equal(zoneMorte(-.16),0);
 assert.equal(zoneMorte(1),1);assert.equal(zoneMorte(-1),-1);
 assert.ok(zoneMorte(.5)>.35&&zoneMorte(.5)<.45);
});
test('la promenade bloque le joueur avant le bord de mer',()=>{
 const joueur=new Joueur(),touches=new Set(['q']);
 for(let i=0;i<80;i++)joueur.deplacer(touches,0,1/30,4,false,[],false);
 assert.ok(joueur.objet.position.x>-7.7);assert.equal(joueur.objet.position.z,12);
});
test('sauvegarde, énergie et récompenses de missions',()=>{
 const p=new Partie(),v=new Vendeuse();p.signalerAccident();p.signalerAccident();
 assert.equal(p.securite,50);assert.equal(p.balance,9800);v.acheter(p,'eau');assert.equal(p.utiliser(0),'Tu bois l’eau fraîche et récupères 15 points d’énergie.');assert.equal(p.securite,65);
 assert.equal(p.recompenser('sport',300),true);assert.equal(p.recompenser('sport',300),false);
 const copie=new Partie();copie.restaurer(p.serialiser());assert.deepEqual(copie.serialiser(),p.serialiser());
});

test('défis urbains : chrono, collection et sauvegarde',()=>{
 const p=new Partie();
 assert.equal(p.demarrerDefi('arrivee-amazone',120),true);
 p.avancerDefis(20);assert.equal(p.defis.get('arrivee-amazone'),100);
 assert.equal(p.terminerDefi('arrivee-amazone'),true);
 p.souvenirs.add('coquillage');p.photos.add('corniche');p.quizReussis.add('amazone');p.debloquer('Carte postale · Corniche');
 const copie=new Partie();copie.restaurer(p.serialiser());
 assert.equal(copie.defisTermines.has('arrivee-amazone'),true);
 assert.equal(copie.souvenirs.has('coquillage'),true);assert.equal(copie.photos.has('corniche'),true);
 assert.equal(copie.quizReussis.has('amazone'),true);assert.equal(copie.debloques.has('Carte postale · Corniche'),true);
});

import {CourseTransport} from './core/Partie.ts';
test('course du zémidjan : chrono, record, gain dégressif',()=>{
 const c=new CourseTransport();
 assert.equal(c.avancer(.016,0),null), 'inactif : rien';
 assert.equal(c.commencer(true,'etoile'),true);
 assert.equal(c.avancer(5,-100),'course');
 c.temps=72;
 assert.equal(c.avancer(2,-500),'arrivee');
 assert.equal(c.arreter(true),true);
 assert.equal(c.record,74,'record écrit à l arrêt gagnant');
 const g=c.gain();
 assert.ok(g>=120&&g<=420,'gain dégressif borné : '+g);
 assert.equal(c.commencer(true,'etoile'),true,'redémarre pour un nouvel embarquement');
 assert.equal(c.temps,0);
 assert.equal(c.commencer(false,'etoile'),false,'pas de course hors véhicule');
});
test('abandon de course : aucun record',()=>{
 const c=new CourseTransport();
 c.commencer(true,'etoile');c.avancer(10,-50);
 assert.equal(c.arreter(false),true);
 assert.equal(c.record,null,'abandon sans record');
});
