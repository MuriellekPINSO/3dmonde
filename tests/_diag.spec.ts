import {test} from '@playwright/test';
test('memoire et images par seconde',async({page})=>{
  test.setTimeout(200000);
  page.on('pageerror',e=>console.log('PAGEERROR>',e.message));
  page.on('console',m=>{const t=m.text();if(/context|WebGL|memory|indispo/i.test(t))console.log('C>',t);});
  await page.addInitScript(()=>{
    const w=window as any;w.__THREE_DEVTOOLS__=new EventTarget();w.__scenes=[];w.__rendus=[];w.__perdus=0;
    w.__THREE_DEVTOOLS__.addEventListener('observe',(e:any)=>{
      const d=e.detail;
      if(d?.isScene&&!w.__scenes.includes(d))w.__scenes.push(d);
      if(d?.isWebGLRenderer&&!w.__rendus.includes(d)){w.__rendus.push(d);
        d.domElement.addEventListener('webglcontextlost',()=>{w.__perdus++;console.log('WebGL context perdu');});}
    });
  });
  const mesure=async(tag:string)=>{
    const r=await page.evaluate(async()=>{
      const w=window as any;
      const images=await new Promise<number>(res=>{let n=0;const t0=performance.now();
        const b=()=>{n++;if(performance.now()-t0<2000)requestAnimationFrame(b);else res(n/((performance.now()-t0)/1000));};requestAnimationFrame(b);});
      return {
        rendus:w.__rendus.length,perdus:w.__perdus,
        info:w.__rendus.map((d:any)=>({tex:d.info.memory.textures,geo:d.info.memory.geometries,prog:d.info.programs?.length,tri:d.info.render.triangles,appels:d.info.render.calls})),
        tas:Math.round(((performance as any).memory?.usedJSHeapSize??0)/1e6),
        fps:Math.round(images),
      };
    });
    console.log(tag,JSON.stringify(r));
  };
  await page.goto('/');
  await page.waitForTimeout(14000);
  await mesure('createur');
  for(const c of ['#287b72','#9c4058','#365f8c','#dc6e35','#f3b94f']){await page.click(`[data-color="${c}"]`);await page.waitForTimeout(900);}
  for(const c of ['#2a2b30','#b4453c','#2f5f9e','']){await page.click(`[data-shoe="${c}"]`);await page.waitForTimeout(900);}
  await page.click('[data-sex="femme"]');await page.waitForTimeout(1500);
  await page.click('[data-sex="homme"]');await page.waitForTimeout(1500);
  await mesure('apres-reglages');
  await page.getByRole('button',{name:/Commencer la balade|Continuer la balade/}).click();
  await page.waitForTimeout(35000);
  await mesure('en-jeu');
  await page.keyboard.down('z');await page.waitForTimeout(4000);await page.keyboard.up('z');
  await mesure('apres-marche');
  await page.screenshot({path:`${process.env.S}/mem-jeu.png`});
});
