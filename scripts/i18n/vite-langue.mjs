// English version of the site, built from the same code: during `LANGUE=en vite build`, the French
// texts of the code (src/), of the page (index.html) and of the stylesheet are replaced by their
// translation (i18n/en-*.json). French remains the language of the source code.
import fs from 'fs';
import path from 'path';
import { traduire } from './jetons.mjs';

const lire = f => fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
// A "human" text (space, accent, punctuation) can be reused from one file to another; a keyword can't.
const humain = s => /[\s À-ÿ’'«»!?:,.]/.test(s.slice(1, -1)) && s.length > 4;

export function dictionnaires() {
  const textes = lire('i18n/en-textes.json'), plus = lire('i18n/en-complement.json');
  const commun = {};
  for (const d of Object.values(textes)) for (const [k, v] of Object.entries(d)) if (humain(k) && !(k in commun)) commun[k] = v;
  Object.assign(commun, plus['*'] || {});
  const html = { ...lire('i18n/en-html.json'), ...(plus['index.html'] || {}) };
  return { textes, plus, commun, html };
}
export function traduireHtml(h, html) {
  const t = s => html[s.trim()] !== undefined ? s.replace(s.trim(), html[s.trim()]) : s;
  return h
    .replace(/<html lang="fr">/, '<html lang="en">')
    .replace(/\b(title|aria-label|placeholder|alt|content)="([^"]*)"/g, (m, a, v) => html[v] !== undefined ? `${a}="${html[v]}"` : m)
    .replace(/>([^<]+)</g, (m, x) => `>${t(x)}<`)
    // the language button leads back to French
    .replace(/<a class="langue" id="btnLangue" href="en\/" hreflang="en"([^>]*)>EN<\/a>/, '<a class="langue" id="btnLangue" href="/" hreflang="fr" title="Lire en français">FR</a>');
}
export function langue(code) {
  if (code !== 'en') return { name: 'langue' };
  const { textes, plus, commun, html } = dictionnaires();
  return {
    name: 'langue', enforce: 'pre',
    transform(src, id) {
      const rel = path.relative(process.cwd(), id.split('?')[0]).replace(/\\/g, '/');
      if (rel.startsWith('src/') && /\.m?js$/.test(rel)) return { code: traduire(src, { ...(textes[rel] || {}), ...(plus[rel] || {}) }, commun), map: null };
      if (rel === 'src/style.css') { let c = src; for (const [a, b] of Object.entries(plus[rel] || {})) c = c.split(a).join(b); return { code: c, map: null }; }
    },
    transformIndexHtml: h => traduireHtml(h, html),
  };
}
