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

test('sur un avatar scanné, la tenue change sans toucher aux cheveux, et le corps suit ses propres os',async({page})=>{
  await page.goto('/scripts/audit.html');
  const resultat=await page.evaluate(async()=>{
    const {Foule}=await import('/src/entities/Foule.ts');
    const {Joueur}=await import('/src/entities/Joueur.ts');
    const T=await import('/node_modules/three/build/three.module.js');
    const scene=new T.Scene(),joueur=new Joueur();scene.add(joueur.objet);
    const foule=new Foule(scene);await foule.charger();foule.habiller();
    const avatar='avatar-femme-meshy-opt.glb';
    foule.personnaliserJoueur('#287b72',avatar,'#79513b');
    const corps=joueur.objet.getObjectByName('corps-personnage')!;
    let maillage:any;corps.traverse((m:any)=>{if(m.isSkinnedMesh)maillage=m;});
    // Un clone ordinaire laisserait le maillage sur les os du modèle d'origine,
    // restés hors de la scène : le joueur ne serait qu'un amas de texture.
    const osRattaches=maillage.skeleton.bones.every((o:any)=>!!corps.getObjectById(o.id));
    // Texels tenus par la tête : cheveux et visage, que la tenue ne doit pas atteindre.
    const taille=1024,tete=new Uint8Array(taille*taille);
    {
      const g=maillage.geometry,uv=g.getAttribute('uv'),os=g.getAttribute('skinIndex'),poids=g.getAttribute('skinWeight'),ind=g.getIndex();
      const crane=maillage.skeleton.bones.map((o:any)=>/head\w*$/i.test(o.name));
      const part=new Float32Array(uv.count);
      for(let v=0;v<part.length;v++){let t=0;for(let k=0;k<4;k++)if(crane[os.getComponent(v,k)])t+=poids.getComponent(v,k);part[v]=t;}
      const toile=document.createElement('canvas');toile.width=toile.height=taille;
      const ctx=toile.getContext('2d',{willReadFrequently:true})!;ctx.fillStyle='#fff';ctx.beginPath();
      for(let i=0;i<ind.count;i+=3){
        const t=[0,1,2].map(k=>ind.getX(i+k));
        if(t.some(s=>part[s]<.8))continue;
        t.forEach((s,k)=>{const x=uv.getX(s)*taille,y=uv.getY(s)*taille;if(k)ctx.lineTo(x,y);else ctx.moveTo(x,y);});
        ctx.closePath();
      }
      ctx.fill();
      const p=ctx.getImageData(0,0,taille,taille).data;
      for(let q=0;q<tete.length;q++)tete[q]=p[q*4+3];
    }
    const photo=()=>{
      let image:HTMLCanvasElement|undefined;
      corps.traverse((m:any)=>{if(m.isMesh)image=m.material.map.image;});
      return image!.getContext('2d')!.getImageData(0,0,taille,taille).data;
    };
    const vert=photo();
    foule.personnaliserJoueur('#9c4058',avatar,'#79513b');const bordeaux=photo();
    let changes=0,changesTete=0;
    for(let q=0;q<tete.length;q++){
      const change=[0,1,2].some(k=>vert[q*4+k]!==bordeaux[q*4+k]);
      if(!change)continue;
      changes++;if(tete[q])changesTete++;
    }
    // La marche native doit remuer les os que le maillage suit vraiment.
    const os=maillage.skeleton.bones[3];
    const avant=os.quaternion.clone();
    joueur.objet.position.z-=1;foule.actualiser(.2);foule.actualiser(.2);
    return {osRattaches,changes,changesTete,anime:os.quaternion.angleTo(avant)>.005};
  });
  expect(resultat.osRattaches).toBe(true);
  expect(resultat.changes).toBeGreaterThan(20000);
  expect(resultat.changesTete).toBe(0);
  expect(resultat.anime).toBe(true);
});
