import {test,expect} from '@playwright/test';

test('sauvegarde, météo, réglages, carte et missions',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    const w=window as any;w.__THREE_DEVTOOLS__=new EventTarget();w.__scenes=[];
    w.__THREE_DEVTOOLS__.addEventListener('observe',(e:any)=>{if(e.detail.isScene)w.__scenes.push(e.detail);});
  });
  await page.goto('/');await page.getByRole('button',{name:'Commencer la balade'}).click();
  expect([200,502,503]).toContain(await page.evaluate(async()=>{const r=await fetch('/api/dialogue',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:'Bonjour',historique:[]})});return r.status;}));
  await page.getByRole('button',{name:'Pause et réglages'}).click();
  await page.getByLabel('Météo').selectOption('pluie');await page.getByLabel('Heure').selectOption('soir');
  await page.getByRole('button',{name:'Bordeaux'}).click();await page.getByRole('button',{name:'Sauvegarder maintenant'}).click();
  await expect(page.locator('#weather')).toHaveText('Pluie tropicale');
  await expect.poll(()=>page.evaluate(()=>{const s=(window as any).__scenes.find((v:any)=>v.getObjectByName('joueur'));return s.getObjectByName('pluie-tropicale')?.visible;})).toBe(true);
  await page.waitForTimeout(500);await page.screenshot({path:'docs/audit/pluie-reglages-missions.png'});
  await page.getByRole('button',{name:/Carte/}).click();await expect(page.getByRole('heading',{name:'Carte et missions'})).toBeVisible();await expect(page.locator('.missions')).toContainText('Mémoire de Cotonou');await page.keyboard.press('Escape');
  await page.evaluate(()=>{const s=(window as any).__scenes.find((v:any)=>v.getObjectByName('joueur'));s.getObjectByName('joueur').position.set(2,.15,-121);});
  await page.waitForTimeout(2300);await page.reload();await expect(page.getByRole('button',{name:'Continuer la balade'})).toBeVisible();await page.getByRole('button',{name:'Continuer la balade'}).click();
  await expect.poll(()=>page.evaluate(()=>{const s=(window as any).__scenes.find((v:any)=>v.getObjectByName('joueur'));return s.getObjectByName('joueur').position.z;})).toBeCloseTo(-121,0);
  expect(errors).toEqual([]);
});
