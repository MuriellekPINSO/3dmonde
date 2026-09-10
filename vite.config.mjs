import {cpSync} from 'node:fs';
import {resolve} from 'node:path';
import {defineConfig} from 'vite';
import {repondreDialogue} from './api-dialogue.mjs';

const apiDialogue={
  name:'api-dialogue-securisee',
  configureServer(serveur){
    serveur.middlewares.use((req,res,next)=>{
      if(!req.url?.startsWith('/api/dialogue')){next();return;}
      if(req.method!=='POST'){res.statusCode=405;res.end();return;}
      let brut='';req.on('data',morceau=>{brut+=morceau;if(brut.length>16_000)req.destroy();});
      req.on('end',async()=>{
        let corps={};try{corps=JSON.parse(brut);}catch{res.statusCode=400;res.end('{"error":"JSON invalide"}');return;}
        const resultat=await repondreDialogue(corps);res.statusCode=resultat.status;res.setHeader('content-type','application/json; charset=utf-8');res.end(JSON.stringify(resultat.json));
      });
    });
  },
};

/**
 * Les 520 Mo de photos et vidéos dans public/espace servent uniquement de
 * références de travail. En production, seuls les GLB optimisés sont copiés.
 */
export default defineConfig({
  build:{copyPublicDir:false},
  plugins:[apiDialogue,{
    name:'copier-modeles-web',
    closeBundle(){
      cpSync(resolve('public/modeles'),resolve('dist/modeles'),{recursive:true});
    },
  }],
});
