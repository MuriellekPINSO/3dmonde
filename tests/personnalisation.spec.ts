import {test,expect} from '@playwright/test';

test('les couleurs restent indépendantes et les modèles sources sont préservés',async({page})=>{
  await page.goto('/scripts/audit.html');
  const resultat=await page.evaluate(async()=>{
    // Charger les vrais modèles sans le coût de rendu de toute la ville.
    const {Foule}=await import('/src/entities/Foule.ts');
    const {Joueur}=await import('/src/entities/Joueur.ts');
    const T=await import('/node_modules/three/build/three.module.js');
    const scene=new T.Scene(),joueur=new Joueur();scene.add(joueur.objet);
    const foule=new Foule(scene);await foule.charger();foule.habiller();
    const photo=()=>{
      let image:HTMLCanvasElement,origine:any;
      joueur.objet.getObjectByName('corps-personnage').traverse((m:any)=>{
        if(m.isMesh){image=m.material.map.image;origine=m.userData.matiereTenueOrigine.map.image;}
      });
      return {pixels:image!.getContext('2d')!.getImageData(0,0,1024,1024).data,origine};
    };
    foule.personnaliserJoueur('#9c4058','personnage1.glb','#dfae88');const premiere=photo();
    foule.personnaliserJoueur('#287b72','personnage1.glb','#462c23');const seconde=photo();
    foule.personnaliserJoueur('#9c4058','personnage1.glb','#dfae88');const retour=photo();
    foule.personnaliserJoueur('#287b72','personnage1.glb','#dfae88');const habit=photo();
    foule.personnaliserJoueur('#9c4058','personnage1.glb','#462c23');const peau=photo();
    let changementsCommuns=0,changementsHabit=0,changementsPeau=0;
    for(let i=0;i<premiere.pixels.length;i+=4){
      const change=(p:Uint8ClampedArray)=>[0,1,2].some(k=>p[i+k]!==premiere.pixels[i+k]);
      const h=change(habit.pixels),s=change(peau.pixels);
      changementsHabit+=Number(h);changementsPeau+=Number(s);changementsCommuns+=Number(h&&s);
    }
    foule.personnaliserJoueur('#9c4058','go2.glb','#dfae88');
    const feminin=joueur.objet.getObjectByName('corps-personnage').userData.avatar;
    const passager=foule.creerPassagerMoto();
    return {
      origineIntacte:premiere.origine===retour.origine&&!(retour.origine instanceof HTMLCanvasElement),
      retourIdentique:premiere.pixels.every((v,i)=>v===retour.pixels[i]),
      changementVisible:premiere.pixels.some((v,i)=>v!==seconde.pixels[i]),
      changementsCommuns,changementsHabit,changementsPeau,feminin,passager:!!passager,
    };
  });
  expect(resultat.origineIntacte).toBe(true);
  expect(resultat.retourIdentique).toBe(true);
  expect(resultat.changementVisible).toBe(true);
  expect(resultat.changementsCommuns).toBe(0);
  expect(resultat.changementsHabit).toBeGreaterThan(1000);
  expect(resultat.changementsPeau).toBeGreaterThan(1000);
  expect(resultat.feminin).toBe('go2.glb');
  expect(resultat.passager).toBe(true);
});
