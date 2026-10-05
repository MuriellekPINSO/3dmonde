import * as T from 'three';
import { Batisseur } from './entities/Batisseur';
import {
  boulevard, corniche, esplanadeAmazone, citeMinisterielle, palaisMarina,
  palaisCongres, quartierMarches, etoileRouge, figures, patineBronze,
} from './entities/Monuments';
import { chargerModeles, type Pose } from './entities/Modeles';

/**
 * Vue aérienne autonome de la ville construite pour « Balade à Cotonou » :
 * même décor (Monuments.ts), sans joueur ni circulation — uniquement les
 * survols en orbite d'un site à l'autre, repris de world.ts (SITES_SURVOL).
 */
const SPOTS = [
  {t: 'The Corniche · open beach', d: 'Ochre sand, young coconut palms and black rock breakwaters: Atlantic waves break in white lines all the way to the paved path.', x: -12, z: 92, r: 52, h: 30, ly: 0},
  {t: 'The Corniche · promenade and mural', d: 'The seawall, the railing, the terracotta jogging strip and, on the city side, the long painted wall telling the story of the port.', x: 4, z: -40, r: 50, h: 28, ly: 1},
  {t: 'The Amazon Esplanade', d: 'Thirty meters of bronze facing the ocean, a paved square in light stripes, gardens, and the port’s gantry cranes on the horizon.', x: -22, z: -128, r: 62, h: 40, ly: 10},
  {t: 'Presidency and Ministerial City', d: 'The Marina Palace, its flags and royal palms, then the long pale wings of the Ministerial City.', x: 34, z: -140, r: 68, h: 44, ly: 5},
  {t: 'The Palais des Congrès', d: 'Three white drum-shaped halls inspired by tata somba houses, each pierced by a golden oculus, with their entrance pavilion.', x: -30, z: -243, r: 55, h: 34, ly: 4},
  {t: 'The market district', d: 'Ganhi’s brick market hall with its fan-shaped roof, Dantokpa’s corrugated-metal sheds, and zémidjan taxi-bikes waiting for fares.', x: -34, z: -298, r: 48, h: 30, ly: 2},
  {t: 'Étoile Rouge square', d: 'The great roundabout where traffic never stops turning: two red stars, the white spire, and the bronze man with a hoe.', x: 16, z: -364, r: 62, h: 48, ly: 8},
  {t: 'Overview', d: 'The whole boulevard, from the Corniche to Étoile Rouge, as in the opening flyover.', x: 4, z: -150, r: 230, h: 150, ly: 6},
];

function boot() {
  const canvas = document.getElementById('c') as HTMLCanvasElement;
  const renderer = new T.WebGLRenderer({canvas, antialias: true});
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;

  const scene = new T.Scene();
  scene.background = new T.Color('#bcd7da');
  scene.fog = new T.Fog('#d1dfd5', 90, 340);

  const camera = new T.PerspectiveCamera(48, innerWidth / innerHeight, .1, 420);

  const cielLumiere = new T.HemisphereLight('#fff5dd', '#648979', 1.9);
  scene.add(cielLumiere);
  const soleil = new T.DirectionalLight('#ffe4b5', 2.2);
  soleil.position.set(-45, 60, -110);
  soleil.castShadow = true;
  soleil.shadow.mapSize.set(2048, 2048);
  soleil.shadow.bias = -.0006;
  Object.assign(soleil.shadow.camera, {left: -110, right: 110, top: 120, bottom: -120, far: 420});
  soleil.target.position.set(4, 0, -150);
  scene.add(soleil, soleil.target);

  const obstacles: {x: number; z: number; w: number; d: number}[] = [];
  const b = new Batisseur(scene, obstacles);
  boulevard(b);
  const mer = corniche(b);
  esplanadeAmazone(b);
  citeMinisterielle(b);
  palaisMarina(b);
  palaisCongres(b);
  quartierMarches(b);
  etoileRouge(b);
  figures(b);

  const poses: Pose[] = [
    {groupe: 'statue-amazone', fichier: 'amazone.glb', x: -19, z: -123, hauteur: 24, base: 2, rotation: Math.PI / 2, apresPose: patineBronze},
    {groupe: 'zemidjans', fichier: 'zemidjans.glb', x: 26.5, z: -331, largeur: 13, base: -.35, rotation: -Math.PI / 2, ajout: true},
  ];
  chargerModeles(b, poses).then(journal => {
    for (const entree of journal) console.info(`modèle ${entree.groupe} : ${entree.etat}`);
  }).catch(() => {});

  let cur = 0;
  const survol = {angle: 0, regard: new T.Vector3(SPOTS[0].x, SPOTS[0].ly, SPOTS[0].z)};
  camera.position.set(SPOTS[0].x + SPOTS[0].r, SPOTS[0].h, SPOTS[0].z);

  const $ = (id: string) => document.getElementById(id)!;
  const spotsNav = $('spots');
  SPOTS.forEach((s, i) => {
    const btn = document.createElement('button');
    btn.id = 'spot' + i;
    btn.innerHTML = '<span class="k">' + (i + 1) + '</span>' + s.t;
    btn.addEventListener('click', () => goTo(i));
    spotsNav.appendChild(btn);
  });
  function goTo(i: number) {
    cur = i;
    SPOTS.forEach((_, j) => $('spot' + j).setAttribute('aria-current', String(j === cur)));
    const s = SPOTS[cur];
    $('cardN').textContent = String(cur + 1);
    $('cardT').textContent = s.t;
    $('cardD').textContent = s.d;
    ($('card') as HTMLElement).hidden = false;
  }
  goTo(0);

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight, false);
  });
  renderer.setSize(innerWidth, innerHeight, false);

  const desired = new T.Vector3(), lookCible = new T.Vector3();
  let last = performance.now();
  function frame(now: number) {
    const dt = Math.min(.05, (now - last) / 1000);
    last = now;
    const s = SPOTS[cur];
    survol.angle += dt * .1;
    const a = survol.angle;
    desired.set(s.x + Math.cos(a) * s.r, s.h + Math.sin(a * .7) * 4, s.z + Math.sin(a) * s.r);
    camera.position.lerp(desired, 1 - Math.exp(-dt * 1.4));
    lookCible.set(s.x, s.ly, s.z);
    survol.regard.lerp(lookCible, 1 - Math.exp(-dt * 2.2));
    camera.lookAt(survol.regard);
    camera.fov = T.MathUtils.lerp(camera.fov, 50, 1 - Math.exp(-dt * 2));
    camera.updateProjectionMatrix();
    mer.actualiser(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(t => {frame(t); setTimeout(() => $('loader').classList.add('off'), 120);});

  $('tFull').onclick = () => {
    try {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
      else document.exitFullscreen();
    } catch {}
  };
  document.addEventListener('fullscreenchange', () => $('tFull').setAttribute('aria-pressed', String(!!document.fullscreenElement)));
}
boot();
