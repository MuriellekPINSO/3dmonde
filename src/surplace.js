// ---------- “On site”: photos and drone videos shot in Cotonou ----------
// Photos from the “espace” folder of 3D monde (September 2026) and two drone videos
// (“360”): the Corniche, and a city tour that we cut into clips, one set per place.
// Files produced by `npm run photos` in public/photos and public/videos.

const PH = (lieu, n) => Array.from({ length: n }, (_, i) => `photos/${lieu}-${i + 1}.jpg`);
const TOUR = 'videos/tour-drone.mp4';
export const SUR_PLACE = {
  amazone: { photos: PH('amazone', 7), videos: [[TOUR, 0, 6.4], [TOUR, 25.3, 27.4], [TOUR, 38, 40.1], [TOUR, 46.3, 50.5]], texte: 'Photos taken on the esplanade, and the drone circling the statue.' },
  jardin: { photos: PH('jardin', 5), texte: 'The herringbone-brick pavements, the flowering hedges and the young trees along the boulevard.' },
  cite: { photos: PH('cite', 5), videos: [[TOUR, 12.7, 14.8]], texte: 'The Cité ministérielle from the Boulevard de la Marina, and seen from the drone.' },
  congres: { photos: PH('congres', 4), texte: 'The car park of the Palais des Congrès, its barriers and its white drums.' },
  murport: { photos: PH('murport', 4), videos: [[TOUR, 29.5, 31.7]], texte: 'The murals on the port wall, and the port seen from the drone.' },
  corniche: { photos: PH('corniche', 12), videos: [['videos/corniche-drone.mp4', 0, 58]], texte: 'The seafront road and its solar street lights, and the Corniche filmed by drone.' },
  bioguera: { videos: [[TOUR, 6.4, 8.4]] },
  dome: { videos: [[TOUR, 8.4, 10.6], [TOUR, 33.8, 38]], texte: 'The Sofitel, its avenue of white clouds and its gardens, seen from the drone.' },
  aeroport: { videos: [[TOUR, 10.6, 12.7], [TOUR, 16.9, 18.9]] },
  haievive: { videos: [[TOUR, 18.9, 21], [TOUR, 23.2, 25.2]] },
  chenal: { videos: [[TOUR, 21, 23.2], [TOUR, 31.7, 33.8]] },
  fidjrosse: { videos: [[TOUR, 27.4, 29.5]] },
  port: { videos: [[TOUR, 29.5, 31.7]] },
  zongo: { videos: [[TOUR, 42.2, 44.2]] },
};
export const aSurPlace = p => !!(p && SUR_PLACE[p.id]);

let segment = null;
/** Fills `el`: the drone video looping over the place’s clip, then the photos. */
export function montrerSurPlace(el, p) {
  const d = SUR_PLACE[p.id]; if (!d) { el.innerHTML = ''; return ''; }
  const vids = d.videos || [], photos = d.photos || [];
  el.innerHTML = `
    ${vids.length ? `<div class="sp-video"><video muted playsinline autoplay preload="metadata"></video>${vids.length > 1 ? `<div class="sp-passages">${vids.map((_, i) => `<button type="button" data-v="${i}" aria-pressed="${i === 0}">Clip ${i + 1}</button>`).join('')}</div>` : ''}</div>` : ''}
    ${photos.length ? `<div class="sp-grande"><img alt=""></div><div class="sp-vignettes">${photos.map((f, i) => `<button type="button" data-i="${i}" aria-label="Photo ${i + 1}"><img src="${import.meta.env.BASE_URL + f}" loading="lazy" alt=""></button>`).join('')}</div>` : ''}`;
  const video = el.querySelector('video'), grande = el.querySelector('.sp-grande img');
  const jouer = i => {
    const [src, t0, t1] = vids[i]; segment = [t0, t1];
    const url = import.meta.env.BASE_URL + src;
    if (!video.src.endsWith(url)) video.src = url;
    const go = () => { video.currentTime = t0; video.play().catch(() => { }); };
    if (video.readyState >= 1) go(); else video.addEventListener('loadedmetadata', go, { once: true });
    el.querySelectorAll('[data-v]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.v === i)));
  };
  if (video) {
    video.addEventListener('timeupdate', () => { if (segment && video.currentTime >= segment[1]) video.currentTime = segment[0]; });
    el.querySelectorAll('[data-v]').forEach(b => b.addEventListener('click', () => jouer(+b.dataset.v)));
    jouer(0);
  }
  const voir = i => { grande.src = import.meta.env.BASE_URL + photos[i]; el.querySelectorAll('[data-i]').forEach(b => b.setAttribute('aria-current', String(+b.dataset.i === i))); };
  if (grande) { el.querySelectorAll('[data-i]').forEach(b => b.addEventListener('click', () => voir(+b.dataset.i))); voir(0); if (video) el.querySelector('.sp-grande').hidden = true; el.querySelectorAll('[data-i]').forEach(b => b.addEventListener('click', () => { el.querySelector('.sp-grande').hidden = false; })); }
  return d.texte || 'Images taken on site, filmed by drone in September 2026.';
}
/** Stops the video when leaving the tab or the window. */
export function arreterSurPlace(el) { const v = el?.querySelector('video'); if (v) v.pause(); segment = null; }
