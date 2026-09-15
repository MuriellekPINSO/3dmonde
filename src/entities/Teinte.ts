import * as T from 'three';

/**
 * Reteinte de la peau et des vêtements sur les avatars scannés. Le jeu et
 * l’aperçu du créateur partagent ce code : le personnage montré avant le départ
 * est donc exactement celui qui marchera dans Cotonou.
 */

/** Teinte, saturation et luminosité d’une couleur, pour reconnaître les régions d’un atlas. */
export function versHsl(r: number, v: number, b: number) {
  const max = Math.max(r, v, b), min = Math.min(r, v, b), delta = max - min;
  const l = (max + min) / 510;
  if (!delta) return {h: 0, s: 0, l};
  const s = delta / (255 - Math.abs(max + min - 255));
  let h: number;
  if (max === r) h = ((v - b) / delta + (v < b ? 6 : 0)) * 60;
  else if (max === v) h = ((b - r) / delta + 2) * 60;
  else h = ((r - v) / delta + 4) * 60;
  return {h, s, l};
}

export function depuisHsl(h: number, s: number, l: number) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const t: [number, number, number] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return t.map(v => Math.round((v + m) * 255));
}

/**
 * Applique une couleur de peau et une couleur de vêtements à un corps scanné.
 * Ces modèles utilisent un atlas : séparer ses pixels de peau (bruns chauds) des
 * tissus neutres évite de teinter tout le personnage. L’atlas d’origine reste
 * intact — il est conservé dans `matiereTenueOrigine` — pour que chaque nouveau
 * choix reparte de la photo et non de la version déjà colorée.
 */
export function teinterCorps(corps: T.Object3D, peauHex: string, habitHex: string) {
  const vise = (hex: string) => {const c = new T.Color(hex).convertLinearToSRGB(); return versHsl(c.r * 255, c.g * 255, c.b * 255);};
  const peau = vise(peauHex), habit = vise(habitHex);
  corps.traverse(n => {
    const m = n as T.Mesh; if (!m.isMesh || !(m.material instanceof T.MeshStandardMaterial)) return;
    const origine = (m.userData.matiereTenueOrigine as T.MeshStandardMaterial | undefined) ?? m.material;
    m.userData.matiereTenueOrigine = origine;
    const source = origine.map?.image as CanvasImageSource | undefined; if (!source) return;
    if (m.material.userData.personnalisee) {m.material.map?.dispose(); m.material.dispose();}
    const toile = document.createElement('canvas'); toile.width = toile.height = 1024;
    const ctx = toile.getContext('2d', {willReadFrequently: true})!; ctx.drawImage(source, 0, 0, 1024, 1024);
    const pixels = ctx.getImageData(0, 0, 1024, 1024), d = pixels.data;
    for (let i = 0; i < d.length; i += 4) {
      const {h, s, l} = versHsl(d[i], d[i + 1], d[i + 2]);
      const estPeau = h >= 8 && h <= 48 && s >= .18 && l > .055 && l < .8;
      const estHabit = s < .18 && l > .065 && l < .75;
      if (!estPeau && !estHabit) continue;
      const cible = estPeau ? peau : habit;
      // Conserver ombres et détails, même avec une peau très claire.
      const lumiere = Math.max(.015, Math.min(.97, cible.l + (l - (estPeau ? .32 : .3)) * .65));
      const [r, g, b] = depuisHsl(cible.h, cible.s, lumiere); d[i] = r; d[i + 1] = g; d[i + 2] = b;
    }
    ctx.putImageData(pixels, 0, 0);
    const carte = origine.map!.clone(); carte.source = new T.Source(toile); carte.needsUpdate = true;
    const matiere = origine.clone(); matiere.map = carte;
    matiere.userData = {...matiere.userData, personnalisee: true}; m.material = matiere;
  });
}

/** Libère uniquement les matières et textures créées par `teinterCorps`. */
export function libererApparence(corps: T.Object3D) {
  corps.traverse(n => {
    const m = n as T.Mesh; if (!m.isMesh) return;
    for (const matiere of Array.isArray(m.material) ? m.material : [m.material]) {
      if (matiere.userData.personnalisee) {(matiere as T.MeshStandardMaterial).map?.dispose(); matiere.dispose();}
    }
  });
}
