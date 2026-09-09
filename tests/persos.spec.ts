import {expect, test} from '@playwright/test';

test('les personnages variés rejoignent la scène', async ({page}) => {
  test.setTimeout(240000);
  const journal: string[] = [];
  const erreurs: string[] = [];
  page.on('pageerror', erreur => erreurs.push(erreur.message));
  page.on('console', message => {
    const texte = message.text();
    if (/silhouettes debout|personnages articulés/.test(texte)) journal.push(texte);
  });
  await page.addInitScript(()=>{
    const w=window as any;w.__THREE_DEVTOOLS__=new EventTarget();w.__scenes=[];
    w.__THREE_DEVTOOLS__.addEventListener('observe',(e:any)=>{if(e.detail.isScene&&!w.__scenes.includes(e.detail))w.__scenes.push(e.detail);});
  });

  await page.goto('/');
  await page.getByRole('button', {name: 'Commencer la balade'}).click();
  await expect.poll(
    () => journal.some(ligne => ligne.includes('personnages articulés :')),
    {timeout: 30000},
  ).toBe(true);
  await expect.poll(()=>page.evaluate(()=>{
    const scenes=(window as any).__scenes as any[]|undefined;
    const scene=scenes?.find(s=>s.getObjectByName('joueur'));
    return scene?.getObjectByName('vendeuse-aicha')?.getObjectByName('modele-vendeuse')!=null;
  }),{timeout:30000}).toBe(true);
  await page.keyboard.down('z');
  await expect(page.locator('#interaction')).toHaveText('E · Discuter avec Aïcha', {timeout: 150000});
  await page.keyboard.up('z');
  await page.waitForTimeout(500);
  await page.screenshot({path:'docs/audit/vendeuse-boutique.png'});
  expect(erreurs).toEqual([]);
});
