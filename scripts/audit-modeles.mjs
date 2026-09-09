import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const baseURL=process.env.TEST_BASE_URL ?? 'http://127.0.0.1:5173';
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
try {
let page=await browser.newPage({viewport:{width:1440,height:960}});
const messages=[];page.on('console',m=>messages.push(m.text()));page.on('pageerror',e=>messages.push('ERROR: '+e.message));
await page.goto(baseURL);
await page.getByRole('button',{name:'Commencer la balade'}).click();
await page.waitForFunction(()=>document.querySelector('canvas'));
await page.waitForTimeout(8000);
await page.screenshot({path:'docs/audit/corniche-integree.png'});
await page.close();
page=await browser.newPage({viewport:{width:1440,height:960}});
await page.goto(baseURL+'/scripts/audit.html');
await page.setContent('<style>body{margin:0;background:#e8e8e2;font:16px sans-serif;color:#173e37}h1{padding:0 24px;font-size:25px}main{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:8px}article{background:#fff;padding:10px}h2{font-size:16px;margin:5px}canvas{width:100%}</style><h1>Modèles optimisés — contrôle visuel</h1><main></main>');
const stats=await page.evaluate(async()=>{
 const T=await import('/node_modules/three/build/three.module.js');
 const {GLTFLoader}=await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
 const {MeshoptDecoder}=await import('/node_modules/three/examples/jsm/libs/meshopt_decoder.module.js');
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),results=[];
 for(const name of ['amazone','palais-congres','etoile-rouge','joggeuse-bleue','joggeuse-bordeaux','zemidjans','zem','vendeuse']){
  const gltf=await loader.loadAsync('/modeles/'+name+'.glb');const object=gltf.scene;
  const box=new T.Box3().setFromObject(object),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
  const scene=new T.Scene();scene.background=new T.Color('#e1e6df');scene.add(object,new T.HemisphereLight('#ffffff','#646f5c',2.8));
  const light=new T.DirectionalLight('#fff4df',2);light.position.set(4,7,6);scene.add(light);
  const camera=new T.PerspectiveCamera(40,450/350,.01,200);const radius=size.length()/2;camera.position.copy(center).add(new T.Vector3(.8,.3,1.6).normalize().multiplyScalar(radius/Math.sin(Math.PI/9)*1.1));camera.lookAt(center);
  const article=document.createElement('article'),title=document.createElement('h2');title.textContent=name;article.append(title);document.querySelector('main').append(article);
  const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(450,350);article.append(renderer.domElement);renderer.render(scene,camera);
  let triangles=0;const textures=[];
  object.traverse(n=>{if(!n.isMesh)return;triangles+=(n.geometry.index?.count??n.geometry.attributes.position.count)/3;for(const m of Array.isArray(n.material)?n.material:[n.material])for(const key of ['map','normalMap','metalnessMap','roughnessMap'])if(m[key])textures.push({slot:key,width:m[key].image.width,height:m[key].image.height});});
  results.push({name,size:size.toArray(),center:center.toArray(),triangles,animations:gltf.animations.length,textures});
 }
 return results;
});
await page.screenshot({path:'docs/audit/modeles-apercu.png',fullPage:true});
await writeFile('docs/audit/mesures.json',JSON.stringify({models:stats,console:messages},null,2));
console.log(JSON.stringify({models:stats.map(s=>({name:s.name,triangles:s.triangles,animations:s.animations})),console:messages.filter(m=>/modèle|ERROR/.test(m))},null,2));
} finally {await browser.close();}
