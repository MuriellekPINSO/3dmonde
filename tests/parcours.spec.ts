import {test,expect} from '@playwright/test';
test('modèles, cinq guides, transport et fin de démo',async({page})=>{
 test.setTimeout(120000);
 const errors:string[]=[],loads:string[]=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.text().startsWith('modèle'))loads.push(m.text());});
 await page.addInitScript(()=>{
  const w=window as any;w.__THREE_DEVTOOLS__=new EventTarget();w.__scenes=[];
  w.__THREE_DEVTOOLS__.addEventListener('observe',(e:any)=>{if(e.detail.isScene)w.__scenes.push(e.detail);});
 });
 await page.goto('/');await page.getByRole('button',{name:'Commencer la balade'}).click();
  await expect.poll(()=>loads.filter(s=>s.includes('posé')).length,{timeout:60000}).toBe(9);
 const position=async(x:number,z:number)=>{
  await page.evaluate(({x,z})=>{const scene=(window as any).__scenes.find((s:any)=>s.getObjectByName('joueur'));scene.getObjectByName('joueur').position.set(x,.15,z);},{x,z});
  await page.waitForTimeout(350);
 };
 // Entrées de zones simulées ; la marche réelle reste couverte par prototype.spec.ts.
 await position(0,4);await page.keyboard.press('e');await expect(page.locator('#panel-title')).toHaveText('Au fil de la Corniche');await page.keyboard.press('Escape');
 // Le départ se fait volontairement au cœur de la borne : la montée doit dégager
 // le véhicule sur la voie et permettre d'avancer immédiatement.
 await position(3,-24);await page.keyboard.press('e');await page.getByRole('button',{name:'Zémidjan 200 FCFA'}).click();
 await expect.poll(()=>page.evaluate(()=>{const s=(window as any).__scenes.find((v:any)=>v.getObjectByName('joueur'));return !!s.getObjectByName('joueur').getObjectByName('corps-personnage');}),{timeout:30000}).toBe(true);
 await expect(page.locator('#wallet')).toHaveText('1 500 FCFA');await page.getByRole('button',{name:'Confirmer et monter'}).click();await expect(page.locator('#wallet')).toHaveText('1 300 FCFA');
 await expect.poll(()=>page.evaluate(()=>{const s=(window as any).__scenes.find((v:any)=>v.getObjectByName('joueur'));return s.getObjectByName('joueur').userData.transitionTransport?.sens;}),{timeout:800}).toBe('montee');
 await page.screenshot({path:'docs/audit/animation-montee-zemidjan.png'});
 await expect(page.locator('#vehicle-status')).toBeVisible();
 const positionVehicule=async()=>page.evaluate(()=>{const s=(window as any).__scenes.find((v:any)=>v.getObjectByName('joueur'));const p=s.getObjectByName('joueur').position;return{x:p.x,z:p.z};});
 await expect.poll(async()=>(await positionVehicule()).x).toBeCloseTo(14,1);
 await expect.poll(()=>page.evaluate(()=>{const s=(window as any).__scenes.find((v:any)=>v.getObjectByName('joueur'));return s?.getObjectByName('passager-joueur-moto')?.visible;}),{timeout:10000}).toBe(true);
 const departVehicule=(await positionVehicule()).z;await page.keyboard.down('z');
 await expect.poll(async()=>(await positionVehicule()).z,{timeout:10000}).toBeLessThan(departVehicule-1);
 await page.keyboard.up('z');await page.waitForTimeout(500);await page.screenshot({path:'docs/audit/joueur-sur-zemidjan.png'});
 // Un choc avec un autre zémidjan bloque les volumes et couche les deux motos.
 await page.evaluate(()=>{const s=(window as any).__scenes.find((v:any)=>v.getObjectByName('joueur'));const joueur=s.getObjectByName('joueur'),cible=s.getObjectByName('circulation-2');joueur.position.set(cible.position.x,.15,cible.position.z+2.7);});
 await page.keyboard.down('z');
 await expect.poll(()=>page.evaluate(()=>{const s=(window as any).__scenes.find((v:any)=>v.getObjectByName('joueur'));return Math.abs(s.getObjectByName('circulation-2').rotation.z);}),{timeout:10000}).toBeGreaterThan(.5);
 await expect.poll(()=>page.evaluate(()=>{const s=(window as any).__scenes.find((v:any)=>v.getObjectByName('joueur'));return Math.abs(s.getObjectByName('vehicule-joueur-zemidjan').rotation.z);})).toBeGreaterThan(.5);
 await page.keyboard.up('z');await page.screenshot({path:'docs/audit/collision-zemidjans.png'});await page.waitForTimeout(2800);
 // Une voiture autonome s'arrête également lorsqu'elle percute un passant.
 await expect.poll(()=>page.evaluate(()=>{const s=(window as any).__scenes.find((v:any)=>v.getObjectByName('joueur'));return !!s.getObjectByName('passant-6')?.getObjectByName('corps-personnage');}),{timeout:30000}).toBe(true);
 await page.evaluate(()=>{const s=(window as any).__scenes.find((v:any)=>v.getObjectByName('joueur'));const j=s.getObjectByName('joueur'),v=s.getObjectByName('circulation-5'),p=s.getObjectByName('passant-6');j.position.set(0,.15,-370);v.position.set(23,0,-370);p.position.set(23,.15,-370);});
 await expect.poll(()=>page.evaluate(()=>{const s=(window as any).__scenes.find((v:any)=>v.getObjectByName('joueur'));return Math.abs(s.getObjectByName('passant-6').getObjectByName('corps-personnage').rotation.x);})).toBeGreaterThan(.5);
 await expect.poll(()=>page.evaluate(()=>{const s=(window as any).__scenes.find((v:any)=>v.getObjectByName('joueur'));return Math.abs(s.getObjectByName('circulation-5').rotation.z);})).toBeGreaterThan(.05);
 // La moto renverse aussi un piéton, s'arrête et déclenche le message d'accident.
 await expect.poll(()=>page.evaluate(()=>{const s=(window as any).__scenes.find((v:any)=>v.getObjectByName('joueur'));return !!s.getObjectByName('passant-0')?.getObjectByName('corps-personnage');}),{timeout:30000}).toBe(true);
 await page.evaluate(()=>{const s=(window as any).__scenes.find((v:any)=>v.getObjectByName('joueur'));const j=s.getObjectByName('joueur'),p=s.getObjectByName('passant-0');s.children.filter((o:any)=>/^circulation-|^zem-supplementaire-/.test(o.name)).forEach((o:any)=>o.position.x=50);j.position.set(0,.15,-60);p.position.set(0,.15,-61.2);});
 await page.keyboard.down('z');
 await expect(page.locator('#toast')).toContainText('Un personnage a été percuté');
 await expect.poll(()=>page.evaluate(()=>{const s=(window as any).__scenes.find((v:any)=>v.getObjectByName('joueur'));return Math.abs(s.getObjectByName('passant-0').getObjectByName('corps-personnage').rotation.x);})).toBeGreaterThan(.5);
 await expect.poll(()=>page.evaluate(()=>{const s=(window as any).__scenes.find((v:any)=>v.getObjectByName('joueur'));return Math.abs(s.getObjectByName('vehicule-joueur-zemidjan').rotation.z);})).toBeGreaterThan(.5);
 await page.keyboard.up('z');await page.screenshot({path:'docs/audit/accident-moto-pieton.png'});await page.waitForTimeout(2800);
 await page.keyboard.press('f');await expect(page.locator('#vehicle-status')).toBeHidden();
 // La voiture emprunte exactement la même sortie de borne et doit aussi avancer.
 await position(3,-24);await page.keyboard.press('e');await page.getByRole('button',{name:'Voiture 500 FCFA'}).click();
 await page.getByRole('button',{name:'Confirmer et monter'}).click();await expect(page.locator('#wallet')).toHaveText('800 FCFA');
 await expect.poll(async()=>(await positionVehicule()).x).toBeCloseTo(14,1);
 const departVoiture=(await positionVehicule()).z;await page.keyboard.down('z');
 await expect.poll(async()=>(await positionVehicule()).z,{timeout:10000}).toBeLessThan(departVoiture-1);
 await page.keyboard.up('z');
 // En voiture, le même choc couche le piéton et provoque un arrêt avec une secousse.
 await page.evaluate(()=>{const s=(window as any).__scenes.find((v:any)=>v.getObjectByName('joueur'));const j=s.getObjectByName('joueur'),p=s.getObjectByName('passant-1');j.position.set(0,.15,-185);p.position.set(0,.15,-186.4);});
 await page.keyboard.down('z');
 await expect(page.locator('#toast')).toContainText('Un personnage a été percuté');
 await expect.poll(()=>page.evaluate(()=>{const s=(window as any).__scenes.find((v:any)=>v.getObjectByName('joueur'));return Math.abs(s.getObjectByName('passant-1').getObjectByName('corps-personnage').rotation.x);})).toBeGreaterThan(.5);
 await expect.poll(()=>page.evaluate(()=>{const s=(window as any).__scenes.find((v:any)=>v.getObjectByName('joueur'));return Math.abs(s.getObjectByName('vehicule-joueur-voiture').rotation.z);})).toBeGreaterThan(.05);
 await page.keyboard.up('z');await page.screenshot({path:'docs/audit/accident-voiture-pieton.png'});await page.waitForTimeout(2800);
 await page.keyboard.press('f');await expect(page.locator('#vehicle-status')).toBeHidden();
 for(const [z,title] of [[-116,'La statue de l’Amazone'],[-145,'Le Palais de la Marina'],[-236,'Le Palais des Congrès'],[-356,'La place de l’Étoile Rouge']] as const){
  await position(0,z);await page.keyboard.press('e');await expect(page.locator('#panel-title')).toHaveText(title);
  if(z===-356){await page.getByRole('button',{name:'Terminer la balade'}).click();await expect(page.locator('#panel-kicker')).toHaveText('FIN DE LA DÉMO');}
  await page.keyboard.press('Escape');
 }
 await expect(page.locator('#map')).toHaveText('Parcours · 5/5');
 // Regard orienté vers les monuments, pour contrôle visuel de leur intégration.
 await page.mouse.move(1000,600);await page.mouse.down();await page.mouse.move(820,720);await page.mouse.up();
 for(const [name,z] of [['amazone',-116],['palais',-236],['etoile',-356]] as const){await position(0,z);await page.waitForTimeout(1000);await page.screenshot({path:`docs/audit/scene-${name}.png`});}
 expect(errors).toEqual([]);
});
