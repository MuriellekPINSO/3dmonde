import { defineConfig } from 'vite';
import { langue } from './scripts/i18n/vite-langue.mjs';

// relative base: the dist/ folder works at any address.
export default defineConfig({
  base: './',
  // LANGUE=en: English version (scripts/i18n/construire.mjs builds it into dist/en/).
  plugins: [langue(process.env.LANGUE)],
  build: { chunkSizeWarningLimit: 1200 },
});
