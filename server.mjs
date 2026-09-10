import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {extname,resolve,sep} from 'node:path';
import {repondreDialogue} from './api-dialogue.mjs';

const racine=resolve('dist'),port=Number(process.env.PORT)||4173;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.glb':'model/gltf-binary','.mov':'video/quicktime','.svg':'image/svg+xml'};
createServer(async(req,res)=>{
  const url=new URL(req.url??'/',`http://${req.headers.host??'localhost'}`);
  if(url.pathname==='/api/dialogue'){
    if(req.method!=='POST'){res.writeHead(405).end();return;}
    let brut='';for await(const morceau of req){brut+=morceau;if(brut.length>16_000){res.writeHead(413).end();return;}}
    let corps={};try{corps=JSON.parse(brut);}catch{res.writeHead(400).end();return;}
    const resultat=await repondreDialogue(corps);res.writeHead(resultat.status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(resultat.json));return;
  }
  let fichier=resolve(racine,'.'+decodeURIComponent(url.pathname));
  if(!fichier.startsWith(racine+sep)&&fichier!==racine){res.writeHead(403).end();return;}
  try{if((await stat(fichier)).isDirectory())fichier=resolve(fichier,'index.html');}
  catch{fichier=resolve(racine,'index.html');}
  try{const contenu=await readFile(fichier);res.writeHead(200,{'content-type':types[extname(fichier)]??'application/octet-stream'});res.end(contenu);}
  catch{res.writeHead(404).end('Introuvable');}
}).listen(port,'127.0.0.1',()=>console.log(`Balade Cotonou : http://127.0.0.1:${port}`));
