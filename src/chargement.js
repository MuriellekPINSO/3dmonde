import { $ } from './base.js';
// ---------- Loading ----------
export const loadTxt = $('#loadTxt'), loadBar = $('#loadBar');
export const status = (t, p) => { loadTxt.textContent = t; if (p != null) loadBar.style.width = p + '%'; };
export const frame = () => new Promise(r => requestAnimationFrame(() => r()));
// City data: gzipped JSON produced by `npm run donnees`. Some hosts already
// decompress it on the way; we only decompress if the gzip header is there.
export async function decode() {
  const res = await fetch(import.meta.env.BASE_URL + 'donnees/cotonou.en.json.gz');
  if (!res.ok) throw new Error(`Data not found (${res.status}). Run “npm run donnees”.`);
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf[0] === 0x1f && buf[1] === 0x8b) {
    if (!('DecompressionStream' in window)) throw new Error("This browser can't decompress the data (DecompressionStream).");
    const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
    return JSON.parse(await new Response(stream).text());
  }
  return JSON.parse(new TextDecoder().decode(buf));
}
/** Gzipped JSON (or already decompressed by the server, depending on the Content-Encoding header). */
export async function lireJsonGz(url) {
  const res = await fetch(url); if (!res.ok) throw new Error(`${url} : ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf[0] === 0x1f && buf[1] === 0x8b) return JSON.parse(await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
  return JSON.parse(new TextDecoder().decode(buf));
}
