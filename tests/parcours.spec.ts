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
 await expect.poll(()=>loads.filter(s=>s.includes('posé')).length,{timeout:30000}).toBe(5);
 const position=async(x:number,z:number)=>{
  await page.evaluate(({x,z})=>{const scene=(window as any).__scenes.find((s:any)=>s.getObjectByName('joueur'));scene.getObjectByName('joueur').position.set(x,.15,z);},{x,z});
  await page.waitForTimeout(350);
 };
 // Entrées de zones simulées ; la marche réelle reste couverte par prototype.spec.ts.
 await position(0,4);await page.keyboard.press('e');await expect(page.locator('#panel-title')).toHaveText('Au fil de la Corniche');await page.keyboard.press('Escape');
 await position(0,-24);await page.keyboard.press('e');await page.getByRole('button',{name:'Zémidjan 200 FCFA'}).click();
 await expect(page.locator('#wallet')).toHaveText('1 500 FCFA');await page.getByRole('button',{name:'Confirmer et monter'}).click();await expect(page.locator('#wallet')).toHaveText('1 300 FCFA');
 await expect(page.locator('#vehicle-status')).toBeVisible();await page.keyboard.press('f');await expect(page.locator('#vehicle-status')).toBeHidden();
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
