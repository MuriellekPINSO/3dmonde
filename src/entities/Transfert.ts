import * as T from 'three';

/**
 * Report d'une animation d'un squelette sur un autre, en espace monde.
 *
 * Les passants utilisent un modèle léger (marcheur.glb, trois mille triangles)
 * dont la marche d'origine est une démarche de défilé, main sur la hanche. Les
 * avatars du joueur ont une marche naturelle, bras relâchés, mais leur squelette
 * Mixamo n'a ni les mêmes noms d'os ni les mêmes axes au repos. Copier les
 * rotations locales tord donc les membres. On reporte plutôt, os par os, la
 * rotation que l'os source a prise dans le monde depuis sa pose de liaison :
 * cible(t) = source(t) · source(repos)⁻¹ · cible(repos).
 */
const ALIAS: Record<string, string> = {Spine: 'Spine02', Spine1: 'Spine01', Spine2: 'Spine', Neck: 'neck'};
/**
 * Segments des membres, orientés vers leur os suivant. Le modèle des passants
 * est lié à son squelette mains sur les hanches : reporter une rotation garde
 * cette pose. Pour ces os, on aligne plutôt la direction du segment sur celle
 * de la source — le bras pend quand le bras de la source pend.
 */
const SEGMENTS: Record<string, string> = Object.fromEntries(['Left', 'Right'].flatMap(c => [
  [`${c}Arm`, `${c}ForeArm`], [`${c}ForeArm`, `${c}Hand`], [`${c}UpLeg`, `${c}Leg`], [`${c}Leg`, `${c}Foot`],
  // Le pied aussi : reporté en rotation, il se tordait et la chaussure s'étalait au sol.
  [`${c}Foot`, `${c}ToeBase`],
]));

/**
 * Pose assise sur la selle d'un zémidjan, obtenue en orientant les segments
 * dans le repère du corps (+z vers l'avant, +y vers le haut) : cuisses presque
 * horizontales et un peu écartées, tibias tombant vers les repose-pieds, bras
 * tendus vers la taille du conducteur. Un corps debout simplement incliné
 * traversait la moto de la selle jusqu'au sol.
 */
export function poserAssis(corps: T.Object3D) {
  const parNom = new Map<string, T.Bone>();
  corps.traverse(n => { if ((n as T.Bone).isBone) parNom.set(TRIPO[n.name] ?? nomOs(n.name), n as T.Bone); });
  const repere = corps.getWorldQuaternion(new T.Quaternion());
  const cibles: [string, string, [number, number, number]][] = ['Left', 'Right'].flatMap(c => {
    const s = c === 'Left' ? 1 : -1;
    return [
      [`${c}UpLeg`, `${c}Leg`, [s * .32, -.18, 1]],
      [`${c}Leg`, `${c}Foot`, [s * .08, -1, -.12]],
      [`${c}Foot`, `${c}ToeBase`, [0, -.25, 1]],
      [`${c}Arm`, `${c}ForeArm`, [s * .22, -.75, .62]],
      [`${c}ForeArm`, `${c}Hand`, [-s * .25, -.2, 1]],
    ] as [string, string, [number, number, number]][];
  });
  const a = new T.Vector3(), b = new T.Vector3(), q = new T.Quaternion(), parent = new T.Quaternion();
  for (const [nom, suivant, dir] of cibles) {
    const os = parNom.get(nom), fin = parNom.get(suivant);
    if (!os || !fin || !os.parent) continue;
    corps.updateMatrixWorld(true);
    const actuelle = fin.getWorldPosition(b).sub(os.getWorldPosition(a)).normalize();
    const voulue = new T.Vector3(...dir).normalize().applyQuaternion(repere);
    const monde = q.setFromUnitVectors(actuelle, voulue).multiply(os.getWorldQuaternion(new T.Quaternion()));
    os.quaternion.copy(os.parent.getWorldQuaternion(parent).invert().multiply(monde));
  }
  corps.updateMatrixWorld(true);
  return parNom.get('Hips');
}
const nomOs = (nom: string) => { const court = nom.replace(/^mixamorig:?/, ''); return ALIAS[court] ?? court; };
/**
 * Os des personnages Tripo (avatar-homme-casual, avatar-femme-fitness) tels que
 * Three les nomme — « thigh.L » perd son point et devient « thighL » —, ramenés
 * aux noms Mixamo de la pose assise. Le transfert de marche n'en a pas besoin :
 * ces deux squelettes portent les mêmes noms.
 */
const TRIPO: Record<string, string> = Object.fromEntries([['L', 'Left'], ['R', 'Right']].flatMap(([s, c]) => [
  [`thigh${s}`, `${c}UpLeg`], [`shin${s}`, `${c}Leg`], [`foot${s}`, `${c}Foot`], [`toe${s}`, `${c}ToeBase`],
  [`upper_arm${s}`, `${c}Arm`], [`forearm${s}`, `${c}ForeArm`], [`hand${s}`, `${c}Hand`],
]).concat([['root', 'Hips']]));

/**
 * Les marches générées avec les personnages Tripo font deux petits pas en deux
 * secondes : 25 cm/s, quand un passant de Cotonou en fait plus d'un mètre. Joué à
 * la vitesse des trottoirs, le clip devenait un piétinement frénétique, ou les
 * pieds glissaient. On resserre donc le cycle (`cadence`), puis on allonge la
 * foulée en prolongeant, dans le même axe, l'écart de chaque os des membres à
 * sa pose moyenne du cycle (`amplitude`). La pose de repos ne convient pas comme
 * repère : la marche y ajoute un décalage constant, qui serait amplifié aussi.
 */
export function reglerFoulee(clip: T.AnimationClip, cadence: number, amplitude: number, hanche = amplitude) {
  const resultat = clip.clone();
  const q = new T.Quaternion(), ecart = new T.Quaternion();
  for (const piste of resultat.tracks) {
    piste.times = piste.times.map(t => t / cadence);
    const [nom, propriete] = piste.name.split('.');
    if (propriete !== 'quaternion' || !/^(thigh|shin|foot|upper_arm|forearm)[LR]$/.test(nom)) continue;
    // La cuisse fait la longueur du pas ; le genou, poussé aussi loin, finirait
    // par se plier à l'envers en passant la jambe tendue.
    const facteur = nom.startsWith('thigh') ? hanche : amplitude;
    const v = piste.values, base = new T.Quaternion(0, 0, 0, 0);
    // Moyenne des orientations du cycle, chaque clé ramenée du côté de la première.
    for (let i = 0; i < v.length; i += 4) {
      const signe = v[i] * v[0] + v[i + 1] * v[1] + v[i + 2] * v[2] + v[i + 3] * v[3] < 0 ? -1 : 1;
      base.set(base.x + signe * v[i], base.y + signe * v[i + 1], base.z + signe * v[i + 2], base.w + signe * v[i + 3]);
    }
    base.normalize();
    const inverse = base.clone().invert();
    for (let i = 0; i < v.length; i += 4) {
      ecart.copy(inverse).multiply(q.fromArray(v, i));
      if (ecart.w < 0) ecart.set(-ecart.x, -ecart.y, -ecart.z, -ecart.w);
      const demi = Math.acos(Math.min(1, ecart.w)), sinus = Math.sin(demi);
      if (sinus < 1e-6) continue;
      const k = Math.sin(demi * facteur) / sinus;
      ecart.set(ecart.x * k, ecart.y * k, ecart.z * k, Math.cos(demi * facteur));
      q.copy(base).multiply(ecart).toArray(v, i);
    }
  }
  resultat.duration = clip.duration / cadence;
  return resultat;
}

function os(racine: T.Object3D) {
  const liste: T.Bone[] = [];
  racine.traverse(n => { if ((n as T.Bone).isBone) liste.push(n as T.Bone); });
  return liste;
}
function reposer(racine: T.Object3D) {
  racine.traverse(n => { const m = n as T.SkinnedMesh; if (m.isSkinnedMesh) m.skeleton.pose(); });
  racine.updateMatrixWorld(true);
}
/**
 * Position, orientation et échelle de chaque os, pour les rendre après le
 * transfert. `skeleton.pose()` les recalcule depuis les matrices de liaison : sur
 * un modèle quantifié, celles-ci portent aussi l'échelle de déquantification, et
 * les os en ressortaient agrandis — le corps doublait de taille ensuite.
 */
function figer(racine: T.Object3D) {
  const etat = os(racine).map(b => [b, b.position.clone(), b.quaternion.clone(), b.scale.clone()] as const);
  return () => { for (const [b, p, q, s] of etat) { b.position.copy(p); b.quaternion.copy(q); b.scale.copy(s); } racine.updateMatrixWorld(true); };
}

export function transfererAnimation(cible: T.Object3D, source: T.Object3D, clip: T.AnimationClip, imagesParSeconde = 30) {
  const osSource = new Map(os(source).map(b => [nomOs(b.name), b]));
  const osCible = os(cible);                                   // parents avant enfants
  if (osCible.filter(b => osSource.has(b.name)).length < 12) return undefined;

  const rendreSource = figer(source), rendreCible = figer(cible);
  reposer(source); reposer(cible);
  const reposSource = new Map([...osSource].map(([nom, b]) => [nom, b.getWorldQuaternion(new T.Quaternion()).invert()]));
  const reposCible = new Map(osCible.map(b => [b, b.getWorldQuaternion(new T.Quaternion())]));
  const localRepos = new Map(osCible.map(b => [b, b.quaternion.clone()]));
  const parentRepos = new Map(osCible.map(b => [b, b.parent!.getWorldQuaternion(new T.Quaternion())]));
  const parNom = new Map(osCible.map(b => [b.name, b])), a = new T.Vector3(), c = new T.Vector3();
  const segments = new Map<T.Bone, {direction: T.Vector3; source: T.Bone; suivant: T.Bone}>();
  for (const b of osCible) {
    const suivant = parNom.get(SEGMENTS[b.name]), source = osSource.get(b.name), sourceSuivante = osSource.get(SEGMENTS[b.name]);
    if (suivant && source && sourceSuivante)
      segments.set(b, {direction: suivant.getWorldPosition(new T.Vector3()).sub(b.getWorldPosition(a)).normalize(), source, suivant: sourceSuivante});
  }

  const mixeur = new T.AnimationMixer(source);
  mixeur.clipAction(clip).play();
  const images = Math.max(2, Math.round(clip.duration * imagesParSeconde) + 1);
  const temps = new Float32Array(images), valeurs = new Map(osCible.map(b => [b, new Float32Array(images * 4)]));
  const monde = new Map<T.Bone, T.Quaternion>(), q = new T.Quaternion();
  for (let i = 0; i < images; i++) {
    const t = clip.duration * i / (images - 1);
    temps[i] = t; mixeur.setTime(t); source.updateMatrixWorld(true);
    for (const b of osCible) {
      const s = osSource.get(b.name), parent = monde.get(b.parent as T.Bone) ?? parentRepos.get(b)!;
      const segment = segments.get(b);
      // Les orteils suivent le pied d'un bloc : tournés à part, ils étiraient la
      // sandale entre le talon et la pointe en une longue semelle plate.
      const rigide = /ToeBase$/.test(b.name);
      const m = rigide ? parent.clone().multiply(localRepos.get(b)!) : segment
        ? new T.Quaternion().setFromUnitVectors(segment.direction,
          segment.suivant.getWorldPosition(c).sub(segment.source.getWorldPosition(a)).normalize()).multiply(reposCible.get(b)!)
        : s
          ? s.getWorldQuaternion(new T.Quaternion()).multiply(reposSource.get(b.name)!).multiply(reposCible.get(b)!)
          : parent.clone().multiply(localRepos.get(b)!);
      monde.set(b, m);
      q.copy(parent).invert().multiply(m).toArray(valeurs.get(b)!, i * 4);
    }
  }
  mixeur.stopAllAction(); mixeur.uncacheRoot(source);
  rendreSource(); rendreCible();
  const pistes = osCible.filter(b => osSource.has(b.name))
    .map(b => new T.QuaternionKeyframeTrack(`${b.name}.quaternion`, temps, valeurs.get(b)!));
  return new T.AnimationClip(`${clip.name}-transfere`, clip.duration, pistes);
}
