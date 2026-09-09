import {test,expect} from '@playwright/test';

test('repères photographiés : Corniche, fresque, Cité et secteur institutionnel',async({page})=>{
  test.setTimeout(90000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    const w=window as any;w.__THREE_DEVTOOLS__=new EventTarget();w.__scenes=[];
    w.__THREE_DEVTOOLS__.addEventListener('observe',(e:any)=>{if(e.detail.isScene&&!w.__scenes.includes(e.detail))w.__scenes.push(e.detail);});
  });
  await page.setViewportSize({width:1440,height:900});await page.goto('/');
  await page.getByRole('button',{name:'Commencer la balade'}).click();
  for(const nom of ['ocean-anime','ecume-animee-1','fresque-portuaire','cite-ministerielle','feu-carrefour-amazone'])
    await expect.poll(()=>page.evaluate(n=>{const s=(window as any).__scenes.find((v:any)=>v.getObjectByName('joueur'));return s?.getObjectByName(n)!=null;},nom)).toBe(true);
  const tempsMer=async()=>page.evaluate(()=>{
    const s=(window as any).__scenes.find((v:any)=>v.getObjectByName('joueur'));
    return s.getObjectByName('ocean-anime').material.uniforms.uTemps.value as number;
  });
  const tempsInitial=await tempsMer();await page.waitForTimeout(350);
  await expect.poll(tempsMer).toBeGreaterThan(tempsInitial);

  const placer=async(x:number,z:number)=>{await page.evaluate(([px,pz])=>{
    const s=(window as any).__scenes.find((v:any)=>v.getObjectByName('joueur'));s.getObjectByName('joueur').position.set(px,.15,pz);
  },[x,z]);await page.waitForTimeout(800);};
  const tourner=async(deplacement:number)=>{
    const canvas=page.locator('canvas'),box=await canvas.boundingBox();if(!box)throw new Error('canvas absent');
    const x=box.x+box.width/2,y=box.y+box.height/2;
    await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+deplacement,y,{steps:8});await page.mouse.up();await page.waitForTimeout(600);
  };

  await placer(0,12);await tourner(-280);await page.waitForTimeout(900);
  await page.screenshot({path:'docs/audit/mer-animee.png'});
  await tourner(280);
  await placer(1,-91);await tourner(-116);await page.screenshot({path:'docs/audit/espace-amazone-jardins.png'});
  await placer(3,-116);await tourner(430);await page.screenshot({path:'docs/audit/espace-fresque-cite.png'});
  await placer(0,-211);await tourner(-474);await page.screenshot({path:'docs/audit/espace-palais-congres.png'});
  expect(errors).toEqual([]);
});
