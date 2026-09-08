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
test('transport : paiement unique, descente, solde insuffisant',()=>{
 const p=new Partie();assert.equal(p.monter(new Zemidjan()),true);assert.equal(p.balance,1300);
 assert.equal(p.monter(new Voiture()),false);assert.equal(p.balance,1300);p.descendre();
 assert.equal(p.monter(new Voiture()),true);p.descendre();assert.equal(p.monter(new Voiture()),true);p.descendre();
 assert.equal(p.monter(new Voiture()),false);assert.equal(p.transport,null);assert.equal(p.balance,300);
});
test('vendeuse : inventaire partagé avec le portefeuille du transport',()=>{
 const p=new Partie(),v=new Vendeuse();p.monter(new Voiture());p.descendre();v.acheter(p,'ananas');
 assert.equal(p.balance,700);assert.deepEqual(p.inventory,['Ananas découpé']);
});
test('fin : cinq guides uniques nécessaires, aucun transport requis',()=>{
 const p=new Partie();for(const g of guides.slice(0,4))p.visiter(g.id);p.visiter(guides[0].id);
 assert.equal(p.terminee(lieux),false);p.visiter(guides[4].id);assert.equal(p.terminee(lieux),true);
 assert.equal(p.balance,1500);assert.equal(zoneActuelle(-220).id,'congres');
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
