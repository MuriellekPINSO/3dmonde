import {test,expect} from '@playwright/test';
test('rues habitées : circulation, pause, son facultatif et captures',async({page})=>{
 test.setTimeout(90000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{const w=window as any;w.__THREE_DEVTOOLS__=new EventTarget();w.__scene=null;w.__THREE_DEVTOOLS__.addEventListener('observe',(e:any)=>{if(e.detail.isScene)w.__scene=e.detail;});});
 await page.goto('/');await page.getByRole('button',{name:'Commencer la balade'}).click();
 await expect(page.locator('#ambiance')).toHaveAttribute('aria-pressed','false');
 await expect.poll(()=>page.evaluate(()=>!!(window as any).__scene?.getObjectByName('rue-commerce-0'))).toBe(true);
 const z=()=>page.evaluate(()=>(window as any).__scene.getObjectByName('circulation-1').position.z);
 const before=await z();await expect.poll(z).not.toBe(before);
 await page.getByRole('button',{name:'Parcours · 0/5'}).click();await page.waitForTimeout(300);const paused=await z();await page.waitForTimeout(400);expect(await z()).toBe(paused);await page.keyboard.press('Escape');
 await page.waitForTimeout(1500);await page.screenshot({path:'docs/audit/rues-corniche.png'});
 // Regard vers les commerces, depuis le trottoir.
 await page.mouse.move(800,450);await page.mouse.down();await page.mouse.move(1010,450);await page.mouse.up();
 await page.waitForTimeout(500);await page.screenshot({path:'docs/audit/rues-akpakpa.png'});
 await page.evaluate(()=>{const p=(window as any).__scene.getObjectByName('joueur');p.position.set(0,.15,-348);});
 await expect(page.locator('#zone-title')).toHaveText('L’Étoile Rouge');await page.waitForTimeout(700);await page.screenshot({path:'docs/audit/rues-etoile.png'});
 await page.locator('#ambiance').click();await expect(page.locator('#ambiance')).toHaveAttribute('aria-pressed','true');await page.locator('#ambiance').click();await expect(page.locator('#ambiance')).toHaveAttribute('aria-pressed','false');
 expect(errors).toEqual([]);
});
