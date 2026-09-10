import {test,expect} from '@playwright/test';

test('sauvegarde, météo, réglages, carte et missions',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    const w=window as any;w.__THREE_DEVTOOLS__=new EventTarget();w.__scenes=[];
    w.__THREE_DEVTOOLS__.addEventListener('observe',(e:any)=>{if(e.detail.isScene)w.__scenes.push(e.detail);});
  });
  await page.goto('/');
  await page.getByLabel('Prénom du personnage').fill('Ama');
  await page.getByRole('button',{name:/Awa/}).click();
  await page.getByRole('button',{name:'Bordeaux'}).click();
  await expect(page.locator('#avatar-summary')).toHaveText('Ama · Awa');
  await page.screenshot({path:'docs/audit/createur-personnage.png'});
  await page.getByRole('button',{name:'Commencer la balade'}).click();
  await expect.poll(()=>page.evaluate(()=>{const s=(window as any).__scenes.find((v:any)=>v.getObjectByName('joueur'));return s.getObjectByName('joueur').userData.apparenceJoueur;})).toEqual({couleur:'#9c4058',corps:'perso2.glb'});
  await expect.poll(()=>page.evaluate(()=>{const s=(window as any).__scenes.find((v:any)=>v.getObjectByName('joueur'));const j=s.getObjectByName('joueur');return {avatar:j.getObjectByName('corps-personnage')?.userData.avatar,surcouche:j.children.some((v:any)=>v.name.startsWith('tenue-joueur-'))};}),{timeout:20000}).toEqual({avatar:'perso2.glb',surcouche:false});
  expect([200,502,503]).toContain(await page.evaluate(async()=>{const r=await fetch('/api/dialogue',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:'Bonjour',historique:[]})});return r.status;}));
  await page.getByRole('button',{name:'Pause et réglages'}).click();
  await page.getByLabel('Météo').selectOption('pluie');await page.getByLabel('Heure').selectOption('soir');
  await page.getByRole('button',{name:'Sauvegarder maintenant'}).click();
  await expect(page.locator('#weather')).toHaveText('Pluie tropicale');
  await expect.poll(()=>page.evaluate(()=>{const s=(window as any).__scenes.find((v:any)=>v.getObjectByName('joueur'));return s.getObjectByName('pluie-tropicale')?.visible;})).toBe(true);
  await page.waitForTimeout(500);await page.screenshot({path:'docs/audit/pluie-reglages-missions.png'});
  await page.getByRole('button',{name:/Carte/}).click();await expect(page.getByRole('heading',{name:'Carte et missions'})).toBeVisible();await expect(page.locator('.missions')).toContainText('Mémoire de Cotonou');await page.keyboard.press('Escape');
  await page.evaluate(()=>{const s=(window as any).__scenes.find((v:any)=>v.getObjectByName('joueur'));s.getObjectByName('joueur').position.set(2,.15,-121);});
  await page.waitForTimeout(2300);await page.reload();await expect(page.getByRole('button',{name:'Continuer la balade'})).toBeVisible();
  await expect(page.getByLabel('Prénom du personnage')).toHaveValue('Ama');await expect(page.getByRole('button',{name:/Awa/})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Continuer la balade'}).click();
  await expect.poll(()=>page.evaluate(()=>{const s=(window as any).__scenes.find((v:any)=>v.getObjectByName('joueur'));return s.getObjectByName('joueur').position.z;})).toBeCloseTo(-121,0);
  expect(errors).toEqual([]);
});

test('une ancienne sauvegarde reçoit le nouveau solde de 10 000 FCFA',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('cotonou-sauvegarde-v2',JSON.stringify({
    partie:{balance:1500,inventory:[],visites:[],vendeuseRencontree:false,finAnnoncee:false,securite:100,accidents:0,transportsUtilises:[],recompenses:[]},
    sport:{termine:false},position:{x:0,z:12},tenue:'#f3b94f',corpsJoueur:'personnage1.glb',nomJoueur:'Mika'
  })));
  await page.goto('/');
  await expect(page.locator('#wallet')).toHaveText('10 000 FCFA');
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('cotonou-sauvegarde-v2')!).soldeVersion)).toBe(2);
});
