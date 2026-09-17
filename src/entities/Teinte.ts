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
 * Os qui portent à coup sûr le tissu du vêtement. Les avatars scannés peignent
 * peau, cheveux et habits sur une seule texture : la couleur seule ne sait pas
 * distinguer le noir des cheveux d’un tissu sombre, le squelette si.
 */
const OS_TISSU = /(Spine\d*|(Left|Right)(Shoulder|Arm))$/;
/** Tête, mains et pieds : cheveux, visage et chaussures ne sont jamais du tissu.
 * Le cou en est absent : le col d’un vêtement s’y appuie. */
const OS_HORS_TISSU = /(head\w*|hand\w*|foot|toe\w*)$/i;
/** Pieds : la chaussure se teinte à part, comme une pièce à elle seule. */
const OS_CHAUSSURE = /(foot|toe\w*)$/i;
/** Crâne : cheveux et visage, découpés du masque quoi qu’il arrive. */
const OS_TETE = /head\w*$/i;

/** Régions du masque : tissu sûr, tissu à confirmer à la couleur, et chaussure. */
const TISSU_SUR = 255, TISSU_PROBABLE = 128, CHAUSSURE = 64;

/**
 * Masque du tissu dans l’atlas d’un corps articulé : chaque triangle tenu par
 * les os du buste est peint dans ses coordonnées de texture. Le reste du corps —
 * hors tête, mains et pieds, où le vêtement peut se prolonger sans qu’aucun os du
 * buste ne le tienne — est peint en demi-teinte, à départager sur la couleur. Le
 * masque ne dépend d’aucun choix du joueur : il est calculé une fois, puis gardé
 * sur la géométrie que partagent tous les exemplaires du modèle.
 */
/**
 * Cache des masques, partagé entre toutes les copies d'un même modèle. Le
 * créateur et la ville chargent chacun leur exemplaire du même fichier GLB :
 * leurs objets Three sont distincts, mais les coordonnées de texture et les
 * noms d'os sont identiques — la signature suffit à réutiliser le masque.
 */
const masquesPartages = new Map<string, Uint8Array>();

function masqueTissu(mesh: T.SkinnedMesh, taille: number) {
  const geometrie = mesh.geometry, cle = `masque-tissu-${taille}`;
  if (cle in geometrie.userData) return geometrie.userData[cle] as Uint8Array | undefined;
  const uv = geometrie.getAttribute('uv'), os = geometrie.getAttribute('skinIndex'), poids = geometrie.getAttribute('skinWeight');
  if (!uv || !os || !poids) {geometrie.userData[cle] = undefined; return undefined;}
  const signature = [taille, uv.count, os.count, mesh.skeleton.bones.map(b => b.name).join('|')].join(':');
  const partage = masquesPartages.get(signature);
  if (partage) {geometrie.userData[cle] = partage; return partage;}
  const buste = mesh.skeleton.bones.map(o => OS_TISSU.test(o.name));
  const habillable = mesh.skeleton.bones.map(o => !OS_HORS_TISSU.test(o.name));
  const pieds = mesh.skeleton.bones.map(o => OS_CHAUSSURE.test(o.name));
  const crane = mesh.skeleton.bones.map(o => OS_TETE.test(o.name));
  // Part de tissu de chaque sommet, calculée une fois : un sommet sert plusieurs
  // triangles, et la géométrie en compte quatre-vingt mille.
  const partBuste = new Float32Array(uv.count), partLarge = new Float32Array(uv.count);
  const partPied = new Float32Array(uv.count), partTete = new Float32Array(uv.count);
  for (let v = 0; v < partBuste.length; v++) {
    let sur = 0, large = 0, pied = 0, tete = 0;
    for (let k = 0; k < 4; k++) {
      const o = os.getComponent(v, k), part = poids.getComponent(v, k);
      if (buste[o]) sur += part; else if (habillable[o]) large += part;
      if (pieds[o]) pied += part;
      if (crane[o]) tete += part;
    }
    partBuste[v] = sur; partLarge[v] = sur + large; partPied[v] = pied; partTete[v] = tete;
  }
  const indices = geometrie.getIndex(), sommets = indices ? indices.count : uv.count;
  // Rastérisation directe dans le masque : le tracé équivalent sur canvas —
  // des centaines de milliers de segments suivi d'un getImageData — coûtait
  // plusieurs secondes par avatar et bloquait le créateur au premier choix.
  const classes = new Uint8Array(taille * taille), tetes = new Uint8Array(taille * taille);
  const remplir = (a: number, b: number, c: number, valeur: Uint8Array, teinte: number) => {
    const x0 = uv.getX(a) * taille, y0 = uv.getY(a) * taille;
    const x1 = uv.getX(b) * taille, y1 = uv.getY(b) * taille;
    const x2 = uv.getX(c) * taille, y2 = uv.getY(c) * taille;
    const aire = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
    if (!aire) return;
    const positif = aire > 0;
    const minX = Math.max(0, Math.floor(Math.min(x0, x1, x2))), maxX = Math.min(taille - 1, Math.ceil(Math.max(x0, x1, x2)));
    const minY = Math.max(0, Math.floor(Math.min(y0, y1, y2))), maxY = Math.min(taille - 1, Math.ceil(Math.max(y0, y1, y2)));
    for (let y = minY; y <= maxY; y++) {
      const py = y + .5;
      for (let x = minX; x <= maxX; x++) {
        const px = x + .5;
        const w0 = (px - x0) * (y2 - y0) - (py - y0) * (x2 - x0);
        const w1 = (px - x1) * (y0 - y1) - (py - y1) * (x0 - x1);
        const w2 = (px - x2) * (y1 - y2) - (py - y2) * (x1 - y1);
        const dedans = positif ? (w0 >= 0 && w1 >= 0 && w2 >= 0) : (w0 <= 0 && w1 <= 0 && w2 <= 0);
        if (dedans) valeur[y * taille + x] = teinte;
      }
    }
  };
  const peindre = (part: Float32Array, seuil: number, cible: Uint8Array, teinte: number) => {
    for (let i = 0; i < sommets; i += 3) {
      const s0 = indices ? indices.getX(i) : i, s1 = indices ? indices.getX(i + 1) : i + 1, s2 = indices ? indices.getX(i + 2) : i + 2;
      // Un triangle n'est du tissu que si ses trois sommets le sont : le bord des
      // manches et du col reste ainsi à la peau.
      if (part[s0] < seuil || part[s1] < seuil || part[s2] < seuil) continue;
      remplir(s0, s1, s2, cible, teinte);
    }
  };
  for (const [part, teinte] of [[partPied, CHAUSSURE], [partLarge, TISSU_PROBABLE], [partBuste, TISSU_SUR]] as [Float32Array, number][]) {
    peindre(part, .5, classes, teinte);
  }
  // Le crâne est retiré en dernier : ce liseré élargi ne doit jamais déteindre
  // sur les cheveux, qui étaient tout le problème.
  peindre(partTete, .5, tetes, 1);
  const masque = new Uint8Array(taille * taille);
  // Le trait du tracé d'origine élargissait le masque d'un texel : la dilatation
  // ci-dessous garde les coutures de l'atlas sans liseré resté à la couleur.
  for (let y = 0; y < taille; y++) {
    for (let x = 0; x < taille; x++) {
      let teinte = 0, tete = false;
      for (let dy = -1; dy <= 1 && !tete; dy++) {
        const yy = y + dy; if (yy < 0 || yy >= taille) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx; if (xx < 0 || xx >= taille) continue;
          const i = yy * taille + xx;
          if (classes[i] > teinte) teinte = classes[i];
          if (tetes[i]) {tete = true; break;}
        }
      }
      masque[y * taille + x] = tete ? 0 : teinte;
    }
  }
  geometrie.userData[cle] = masque;
  masquesPartages.set(signature, masque);
  return masque;
}

/** Écart entre deux teintes, en degrés, sur le cercle des couleurs. */
function ecartTeinte(a: number, b: number) {const ecart = Math.abs(a - b) % 360; return ecart > 180 ? 360 - ecart : ecart;}

/**
 * Ton moyen du tissu désigné par le squelette. Il sert à rattraper les pans du
 * vêtement que les os du buste ne tiennent pas — bas de chemise, ceinture —
 * sans toucher au pantalon ni aux cheveux, dont la teinte est tout autre.
 */
function tonDominant(d: Uint8ClampedArray, masque: Uint8Array) {
  let x = 0, y = 0, sommeS = 0, sommeL = 0, compte = 0;
  for (let p = 0; p < masque.length; p++) {
    if (masque[p] < TISSU_SUR) continue;
    const {h, s, l} = versHsl(d[p * 4], d[p * 4 + 1], d[p * 4 + 2]);
    if (l <= .05 || l >= .95) continue;
    const angle = h * Math.PI / 180;
    // Moyenne circulaire pondérée : les pixels ternes ne tirent pas la teinte.
    x += Math.cos(angle) * s; y += Math.sin(angle) * s; sommeS += s; sommeL += l; compte++;
  }
  if (!compte) return undefined;
  return {h: (Math.atan2(y, x) * 180 / Math.PI + 360) % 360, s: sommeS / compte, l: sommeL / compte};
}

/**
 * Applique une couleur de peau, de vêtements et, si elle est demandée, de
 * chaussures à un corps scanné. Ces modèles utilisent un atlas : séparer ses
 * pixels de peau (bruns chauds) du tissu évite de teinter tout le personnage.
 * L’atlas d’origine reste intact — il est conservé dans `matiereTenueOrigine` —
 * pour que chaque nouveau choix reparte de la photo et non de la version déjà
 * colorée. Sans couleur de chaussures, celles du scan sont gardées.
 */
export function teinterCorps(corps: T.Object3D, peauHex: string, habitHex: string, chaussureHex = '') {
  const vise = (hex: string) => {const c = new T.Color(hex).convertLinearToSRGB(); return versHsl(c.r * 255, c.g * 255, c.b * 255);};
  const peau = vise(peauHex), habit = vise(habitHex);
  const chaussure = chaussureHex ? vise(chaussureHex) : undefined;
  corps.traverse(n => {
    const m = n as T.Mesh; if (!m.isMesh || !(m.material instanceof T.MeshStandardMaterial)) return;
    const origine = (m.userData.matiereTenueOrigine as T.MeshStandardMaterial | undefined) ?? m.material;
    m.userData.matiereTenueOrigine = origine;
    const source = origine.map?.image as CanvasImageSource | undefined; if (!source) return;
    if (m.material.userData.personnalisee) {m.material.map?.dispose(); m.material.dispose();}
    const taille = 1024;
    // Un corps articulé désigne son tissu par le squelette ; une silhouette sans
    // os s’en remet à la neutralité des pixels du vêtement.
    const masque = (m as T.SkinnedMesh).isSkinnedMesh ? masqueTissu(m as T.SkinnedMesh, taille) : undefined;
    const toile = document.createElement('canvas'); toile.width = toile.height = taille;
    const ctx = toile.getContext('2d', {willReadFrequently: true})!; ctx.drawImage(source, 0, 0, taille, taille);
    const pixels = ctx.getImageData(0, 0, taille, taille), d = pixels.data;
    const ton = masque ? tonDominant(d, masque) : undefined;
    // Région d’un texel. La peau passe avant tout : un bras nu reste un bras nu,
    // quel que soit l’os qui le tient. Hors du masque et de la teinte du buste,
    // le noir des cheveux garde sa couleur — aucun os habillé ne le tient.
    const region = (p: number, h: number, s: number, l: number) => {
      if (h >= 8 && h <= 48 && s >= .18 && l > .055 && l < .8) return peau;
      if (!masque) return s < .18 && l > .065 && l < .75 ? habit : undefined;
      if (masque[p] >= TISSU_SUR) return l > .035 ? habit : undefined;
      if (masque[p] >= TISSU_PROBABLE * .75) {
        // Ici le bas du vêtement côtoie le pantalon : seul ce qui reprend la
        // teinte du buste suit la couleur choisie. La clarté ne dit rien —
        // le dos d’un vêtement est bien plus sombre que sa face.
        // La teinte suffit à distinguer le vêtement du pantalon ; exiger en plus
        // une vive saturation laisserait le creux des plis à sa couleur d’origine.
        return ton && ecartTeinte(h, ton.h) <= 32
          && s >= Math.max(.06, ton.s * .15) && l > .05 && l < .92 ? habit : undefined;
      }
      return masque[p] && l > .035 ? chaussure : undefined;
    };
    // Luminosité moyenne de chaque région : les plis du tissu et les ombres du
    // visage sont ainsi conservés, même sous une couleur très claire.
    const sommes = new Map<object, {somme: number; compte: number}>();
    for (let i = 0; i < d.length; i += 4) {
      const {h, s, l} = versHsl(d[i], d[i + 1], d[i + 2]);
      const cible = region(i / 4, h, s, l); if (!cible) continue;
      const suivi = sommes.get(cible) ?? {somme: 0, compte: 0};
      suivi.somme += l; suivi.compte++; sommes.set(cible, suivi);
    }
    for (let i = 0; i < d.length; i += 4) {
      const {h, s, l} = versHsl(d[i], d[i + 1], d[i + 2]);
      const cible = region(i / 4, h, s, l); if (!cible) continue;
      const suivi = sommes.get(cible)!, moyenne = suivi.compte ? suivi.somme / suivi.compte : .3;
      // La pente s’adoucit vers les couleurs extrêmes, où un écart entier
      // écraserait le détail contre le blanc ou le noir.
      const pente = .72 - Math.abs(cible.l - .5) * .6;
      const lumiere = Math.max(.02, Math.min(.96, cible.l + (l - moyenne) * pente));
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
