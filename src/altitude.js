// Ground altitude, in metres above sea level, to align the camera of the Google
// view (which measures altitudes from the sea) with the model (ground at y = 0).
// Source: “Terrarium” tiles from AWS Terrain Tiles (open data, SRTM and others),
// zoom 12, i.e. ~38 m per pixel. We average 3 × 3 pixels to smooth out the
// buildings and trees contained in the satellite terrain.
const Z = 12, N = 2 ** Z, tuiles = new Map();

function charger(x, y) {
  const cle = x + '/' + y;
  if (tuiles.has(cle)) return tuiles.get(cle);
  const t = { h: null };
  tuiles.set(cle, t);
  const img = new Image(); img.crossOrigin = 'anonymous';
  img.onload = () => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 256;
    const c = cv.getContext('2d', { willReadFrequently: true }); c.drawImage(img, 0, 0);
    const d = c.getImageData(0, 0, 256, 256).data, h = new Float32Array(256 * 256);
    for (let i = 0; i < h.length; i++) h[i] = d[i * 4] * 256 + d[i * 4 + 1] + d[i * 4 + 2] / 256 - 32768;
    t.h = h;
  };
  img.onerror = () => { t.h = new Float32Array(256 * 256).fill(5); }; // fallback: 5 m, Cotonou's average altitude
  img.src = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${Z}/${x}/${y}.png`;
  return t;
}
function pixel(px, py) {
  const x = Math.floor(px / 256), y = Math.floor(py / 256), t = charger(x, y);
  if (!t.h) return null;
  return t.h[(Math.floor(py) - y * 256) * 256 + (Math.floor(px) - x * 256)];
}
/** Ground altitude (m) at (lat, lon), or null until the tile has loaded. */
export function altitudeSol(lat, lon) {
  const px = (lon + 180) / 360 * N * 256, r = lat * Math.PI / 180, py = (1 - Math.asinh(Math.tan(r)) / Math.PI) / 2 * N * 256;
  let s = 0;
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const h = pixel(px + i, py + j); if (h === null) return null; s += Math.max(0, h); }
  return s / 9;
}
