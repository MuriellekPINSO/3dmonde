// Google Maps: Street View photos of places and the real 3D satellite view.
// The key comes from .env.local (VITE_GOOGLE_MAPS_KEY) and ends up in the
// browser code, like any Maps JavaScript key: it must be restricted to the
// site's domains in the Google Cloud console.
import { $, toLL } from './base.js';
import { aSurPlace, arreterSurPlace, montrerSurPlace } from './surplace.js';

const KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;
export const googleDispo = !!KEY;
let charge = null;

export function chargerGoogle() {
  if (!KEY) return Promise.reject(new Error('No Google Maps key (VITE_GOOGLE_MAPS_KEY).'));
  if (!charge) charge = new Promise((res, rej) => {
    window.__gmPret = () => res(window.google.maps);
    window.gm_authFailure = () => rej(new Error('Google rejected the key (restrictions or billing).'));
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(KEY)}&v=beta&loading=async&callback=__gmPret&language=en&region=BJ`;
    s.async = true; s.onerror = () => rej(new Error("Couldn't load Google Maps (network)."));
    document.head.append(s);
  });
  return charge;
}

// Heading (degrees from north) from one point to another.
const cap = (la1, lo1, la2, lo2) => {
  const r = Math.PI / 180, y = Math.sin((lo2 - lo1) * r) * Math.cos(la2 * r);
  const x = Math.cos(la1 * r) * Math.sin(la2 * r) - Math.sin(la1 * r) * Math.cos(la2 * r) * Math.cos((lo2 - lo1) * r);
  return (Math.atan2(y, x) / r + 360) % 360;
};

// ---------- Street View ----------
const cachePano = new Map();
export async function panoramaPres(lat, lng, rayon = 250) {
  const cle = `${lat.toFixed(5)},${lng.toFixed(5)},${rayon}`;
  if (cachePano.has(cle)) return cachePano.get(cle);
  const p = (async () => {
    const g = await chargerGoogle();
    const sv = new g.StreetViewService();
    try {
      const r = await sv.getPanorama({ location: { lat, lng }, radius: rayon, preference: g.StreetViewPreference.NEAREST, source: g.StreetViewSource.OUTDOOR });
      const l = r.data.location;
      return { pano: l.pano, lat: l.latLng.lat(), lng: l.latLng.lng(), desc: l.description || '', date: r.data.imageDate || '', auteur: r.data.copyright || '' };
    } catch { return null; }
  })();
  cachePano.set(cle, p);
  return p;
}
const panos = new WeakMap();
/**
 * Shows in `el` the Street View photo nearest to (lat, lng), turned towards
 * the place. Returns the panorama info, or null if there is none.
 */
export async function streetView(el, lat, lng, { rayon = 250, interactif = true, pitch = 4 } = {}) {
  const info = await panoramaPres(lat, lng, rayon);
  if (!info) return null;
  const g = await chargerGoogle();
  const pov = { heading: Math.hypot(info.lat - lat, info.lng - lng) < 2e-5 ? 0 : cap(info.lat, info.lng, lat, lng), pitch };
  let p = panos.get(el);
  if (!p) {
    p = new g.StreetViewPanorama(el, {
      pano: info.pano, pov, zoom: 0, addressControl: false, linksControl: interactif, panControl: false,
      zoomControl: interactif, fullscreenControl: interactif, motionTracking: false, motionTrackingControl: false,
      showRoadLabels: false, clickToGo: interactif, disableDefaultUI: !interactif, scrollwheel: interactif,
    });
    panos.set(el, p);
  } else { p.setPano(info.pano); p.setPov(pov); p.setZoom(0); }
  return info;
}

// ---------- 3D satellite view (Map3DElement) ----------
export async function carte3D(el, { lat, lng, range = 800, tilt = 60, heading = 0 }) {
  const g = await chargerGoogle();
  const { Map3DElement } = await g.importLibrary('maps3d');
  let m = el.querySelector('gmp-map-3d');
  const vue = { center: { lat, lng, altitude: 0 }, range, tilt, heading };
  if (!m) { m = new Map3DElement({ ...vue, mode: 'HYBRID' }); m.style.cssText = 'width:100%;height:100%;display:block'; el.append(m); }
  else Object.assign(m, vue);
  return m;
}

// ---------- A place’s “See it for real” window ----------
let lieuReel = null;
export function initVoirEnVrai(getLieu) {
  const btn = $('#cardReel'), fen = $('#reel');
  if (!googleDispo) { $('#togGoogle').hidden = true; fen.querySelectorAll('[data-onglet="sv"], [data-onglet="3d"]').forEach(b => { b.hidden = true; }); }
  const onglets = fen.querySelectorAll('[data-onglet]');
  const montrer = async (o) => {
    onglets.forEach(b => b.setAttribute('aria-selected', String(b.dataset.onglet === o)));
    $('#reelSv').hidden = o !== 'sv'; $('#reel3d').hidden = o !== '3d'; $('#reelPlace').hidden = o !== 'place';
    if (o !== 'place') arreterSurPlace($('#reelPlace'));
    const p = lieuReel; if (!p) return;
    const note = $('#reelNote');
    try {
      if (o === 'place') note.textContent = montrerSurPlace($('#reelPlace'), p);
      else if (o === 'sv') {
        note.textContent = 'Looking for the nearest photo…';
        const info = await streetView($('#reelSv'), p.lat, p.lon, { rayon: 300 });
        note.textContent = info ? `360° photo ${info.desc ? '“' + info.desc + '”' : ''}${info.date ? ' · ' + info.date : ''}${info.auteur ? ' · ' + info.auteur : ''}. Drag to look around.` : 'No Street View photo within 300 m of this place. Try the 3D satellite view.';
      } else {
        note.textContent = 'Google satellite view, in 3D. Drag to rotate, scroll to zoom.';
        const [d, phi, th] = p.view || [800, 1, 0];
        await carte3D($('#reel3d'), { lat: p.lat, lng: p.lon, range: Math.max(350, d * 1.5), tilt: Math.min(70, phi * 57.3), heading: (-th * 57.3 + 360) % 360 });
      }
    } catch (e) { note.textContent = e.message; }
  };
  onglets.forEach(b => b.addEventListener('click', () => montrer(b.dataset.onglet)));
  // The card button: “On site” (our photos and videos) when there are any, otherwise Street View.
  const majBouton = () => { const p = getLieu(); btn.hidden = !googleDispo && !aSurPlace(p); btn.textContent = aSurPlace(p) ? 'On site' : 'See it for real'; };
  document.addEventListener('lieu-choisi', majBouton);
  btn.addEventListener('click', () => {
    lieuReel = getLieu(); if (!lieuReel) return; $('#reelTitre').textContent = lieuReel.name; fen.hidden = false;
    const sp = aSurPlace(lieuReel); fen.querySelector('[data-onglet="place"]').hidden = !sp;
    montrer(sp ? 'place' : 'sv');
  });
  const fermer = () => { fen.hidden = true; arreterSurPlace($('#reelPlace')); };
  $('#reelFermer').addEventListener('click', fermer);
  fen.addEventListener('click', e => { if (e.target === fen) fermer(); });
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && !fen.hidden) fermer(); });
}

// ---------- Photo in the game cards ----------
/** Shows the Street View photo of a place (metres x, z) in the `el` frame; hides the frame if there is none. */
export async function photoJeu(el, x, z) {
  if (!googleDispo || !el) { if (el) el.hidden = true; return; }
  const n = el._seq = (el._seq || 0) + 1, [lat, lng] = toLL(x, z);
  try {
    const info = await panoramaPres(lat, lng, 220);
    if (n !== el._seq) return;
    if (!info) { el.hidden = true; return; }
    el.hidden = false;
    await streetView(el, lat, lng, { rayon: 220, interactif: false, pitch: 6 });
  } catch { el.hidden = true; }
}
