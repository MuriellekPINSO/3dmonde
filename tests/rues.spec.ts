import {test,expect} from '@playwright/test';
test('rues habitées : circulation, pause, son facultatif et captures',async({page})=>{
 test.setTimeout(120000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{const w=window as any;w.__THREE_DEVTOOLS__=new EventTarget();w.__scenes=[];w.__THREE_DEVTOOLS__.addEventListener('observe',(e:any)=>{if(e.detail.isScene&&!w.__scenes.includes(e.detail))w.__scenes.push(e.detail);});});
 await page.goto('/');await page.getByRole('button',{name:'Commencer la balade'}).click();
 await expect(page.locator('#ambiance')).toHaveAttribute('aria-pressed','false');
 await expect.poll(()=>page.evaluate(()=>!!(window as any).__scenes.find((s:any)=>s.getObjectByName('joueur'))?.getObjectByName('rue-commerce-0'))).toBe(true);
 await expect.poll(()=>page.evaluate(()=>!!(window as any).__scenes.find((s:any)=>s.getObjectByName('joueur'))?.getObjectByName('vie-urbaine'))).toBe(true);
 const oiseauX=()=>page.evaluate(()=>{const s=(window as any).__scenes.find((v:any)=>v.getObjectByName('joueur'));return s.getObjectByName('oiseaux-ville-1').position.x;});
 const oiseauAvant=await oiseauX();await expect.poll(oiseauX).not.toBe(oiseauAvant);
 await page.keyboard.down('z');await page.waitForTimeout(700);await page.keyboard.up('z');
 await expect.poll(()=>page.evaluate(()=>{const s=(window as any).__scenes.find((v:any)=>v.getObjectByName('joueur'));const a=s.getObjectByName('poussiere-deplacement').geometry.attributes.position.array;return Array.from(a).some((v:any)=>v>-500);})).toBe(true);
 const z=()=>page.evaluate(()=>{const s=(window as any).__scenes.find((v:any)=>v.getObjectByName('joueur'));return s.getObjectByName('circulation-1').position.z;});
 const before=await z();await expect.poll(z).not.toBe(before);
 await expect.poll(()=>page.evaluate(()=>{const s=(window as any).__scenes.find((v:any)=>v.getObjectByName('joueur'));return !!s?.getObjectByName('circulation-1')?.getObjectByName('vehicule-modele');}),{timeout:60000}).toBe(true);
 await expect.poll(()=>page.evaluate(()=>{const s=(window as any).__scenes.find((v:any)=>v.getObjectByName('joueur'));return s?.children.filter((o:any)=>o.name.startsWith('zem-supplementaire-')).length;}),{timeout:60000}).toBe(5);
 const limitesSol=await page.evaluate(async()=>{const T=await import('/node_modules/three/build/three.module.js');const s=(window as any).__scenes.find((v:any)=>v.getObjectByName('joueur'));const sol=s.getObjectByName('chaussee-continue');const boite=new T.Box3().setFromObject(sol);return{min:boite.min.z,max:boite.max.z};});
 expect(limitesSol.min).toBeLessThan(-421);expect(limitesSol.max).toBeGreaterThan(43);
 await expect.poll(()=>page.evaluate(async()=>{const T=await import('/node_modules/three/build/three.module.js');const s=(window as any).__scenes.find((v:any)=>v.getObjectByName('joueur'));const objet=s?.getObjectByName('zem-supplementaire-1');if(!objet)return false;const taille=new T.Box3().setFromObject(objet).getSize(new T.Vector3());return taille.z>taille.x;}),{timeout:60000}).toBe(true);
 const ecartMinimum=()=>page.evaluate(()=>{const s=(window as any).__scenes.find((v:any)=>v.getObjectByName('joueur'));const vehicules=s.children.filter((o:any)=>/^circulation-|^zem-supplementaire-/.test(o.name));let minimum=Infinity;for(let i=0;i<vehicules.length;i++)for(let j=i+1;j<vehicules.length;j++)if(Math.abs(vehicules[i].position.x-vehicules[j].position.x)<1.3)minimum=Math.min(minimum,Math.abs(vehicules[i].position.z-vehicules[j].position.z));return minimum;});
 await expect.poll(ecartMinimum).toBeGreaterThan(3.2);
 await page.getByRole('button',{name:'Parcours · 0/5'}).click();await page.waitForTimeout(300);const paused=await z();await page.waitForTimeout(400);expect(await z()).toBe(paused);await page.keyboard.press('Escape');
 await page.waitForTimeout(1500);await page.screenshot({path:'docs/audit/rues-corniche.png'});
 // Regard vers les commerces, depuis le trottoir.
 await page.mouse.move(800,450);await page.mouse.down();await page.mouse.move(1010,450);await page.mouse.up();
 await page.waitForTimeout(500);await page.screenshot({path:'docs/audit/rues-akpakpa.png'});
 await page.evaluate(()=>{const s=(window as any).__scenes.find((v:any)=>v.getObjectByName('joueur'));s.getObjectByName('joueur').position.set(0,.15,-348);});
 await expect(page.locator('#zone-title')).toHaveText('L’Étoile Rouge');await page.waitForTimeout(700);await page.screenshot({path:'docs/audit/rues-etoile.png'});
 // Au nord de la zone jouable, le sol, les immeubles et le ciel prolongent la perspective.
 await page.evaluate(()=>{const s=(window as any).__scenes.find((v:any)=>v.getObjectByName('joueur'));s.getObjectByName('joueur').position.set(16,.15,20);});
 await page.mouse.move(900,450);await page.mouse.down();await page.mouse.move(272,450);await page.mouse.up();
 await page.waitForTimeout(500);await page.screenshot({path:'docs/audit/horizon-ville.png'});
 await page.locator('#ambiance').click();await expect(page.locator('#ambiance')).toHaveAttribute('aria-pressed','true');await page.locator('#ambiance').click();await expect(page.locator('#ambiance')).toHaveAttribute('aria-pressed','false');
 expect(errors).toEqual([]);
});
