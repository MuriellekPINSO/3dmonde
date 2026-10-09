// Builds the site in both languages: French in dist/, English in dist/en/ (same
// models, data and images, served from the root: the English version keeps no copy of them).
import { build } from 'vite';
import fs from 'fs';
await build({ logLevel: 'warn' });
process.env.LANGUE = 'en';
await build({ logLevel: 'warn', base: '/', publicDir: false, build: { outDir: 'dist-en', emptyOutDir: true, assetsDir: 'assets-en', chunkSizeWarningLimit: 1600 } });
fs.mkdirSync('dist/en', { recursive: true });
fs.renameSync('dist-en/index.html', 'dist/en/index.html');
fs.rmSync('dist/assets-en', { recursive: true, force: true }); fs.renameSync('dist-en/assets-en', 'dist/assets-en');
fs.rmSync('dist-en', { recursive: true, force: true });
console.log('dist/ (français) et dist/en/ (anglais) prêts');
