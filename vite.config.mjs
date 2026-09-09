import {cpSync} from 'node:fs';
import {resolve} from 'node:path';
import {defineConfig} from 'vite';

/**
 * Les 520 Mo de photos et vidéos dans public/espace servent uniquement de
 * références de travail. En production, seuls les GLB optimisés sont copiés.
 */
export default defineConfig({
  build:{copyPublicDir:false},
  plugins:[{
    name:'copier-modeles-web',
    closeBundle(){
      cpSync(resolve('public/modeles'),resolve('dist/modeles'),{recursive:true});
    },
  }],
});
