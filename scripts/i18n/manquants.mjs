// French texts on the site that don't have an English translation yet (in i18n/en-*.json).
//   node scripts/i18n/manquants.mjs [sortie.json]   (list per file; to be translated in i18n/en-complement.json)
import fs from 'fs';
import { jetons } from './jetons.mjs';
import { dictionnaires } from './vite-langue.mjs';
const { textes, plus, commun, html } = dictionnaires();
// A text to translate: letters, and a French look (accents, common words, sentence punctuation).
const francais = s => /[A-Za-zÀ-ÿ]{2}/.test(s) && (/[À-ÿ’«»]/.test(s) || /\b(le|la|les|un|une|des|du|de|et|ou|tu|ton|ta|pour|avec|sur|dans|pas|est|plus|ici|zém)\b/i.test(s) || /^[A-ZÀ-Ý][a-zà-ÿ]+[ !?.:]/.test(s));
const technique = s => /^(https?:\/\/\S+|\.{0,2}\/[\w./?=&-]*|#[\w-]+|[\w-]+\.(js|glb|json|png|jpg|webp|mp3|gz)|\d+ ?(px|%) .*sans-serif|[\w-]+)$/.test(s.trim()) && !/[À-ÿ]/.test(s);
const out = {};
for (const f of fs.readdirSync('src').filter(f => f.endsWith('.js'))) {
  const rel = `src/${f}`, d = { ...(textes[rel] || {}), ...(plus[rel] || {}) };
  for (const t of jetons(fs.readFileSync(rel, 'utf8'))) {
    if (t.k === 'C' || t.k === 'R') continue;
    if (d[t.raw] !== undefined || commun[t.raw] !== undefined) continue;
    const brut = t.k === 'S' ? t.raw.slice(1, -1) : t.raw;
    if (!francais(brut) || technique(brut)) continue;
    (out[rel] ||= []).push(t.raw);
  }
}
const h = fs.readFileSync('index.html', 'utf8'), manqueH = new Set();
for (const m of h.matchAll(/\b(?:title|aria-label|placeholder|alt|content)="([^"]*)"/g)) if (francais(m[1]) && html[m[1]] === undefined) manqueH.add(m[1]);
for (const m of h.matchAll(/>([^<]+)</g)) { const x = m[1].trim(); if (x && francais(x) && html[x] === undefined) manqueH.add(x); }
if (manqueH.size) out['index.html'] = [...manqueH];
const n = Object.values(out).reduce((s, l) => s + l.length, 0);
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
console.log(`${n} textes sans traduction`); for (const [f, l] of Object.entries(out)) console.log(`  ${f} : ${l.length}`);
