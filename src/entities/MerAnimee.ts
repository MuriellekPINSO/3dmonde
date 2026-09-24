import * as T from 'three';

/**
 * Océan animé de la Corniche, d'après les photos et vidéos du dossier espace
 * (IMG_6191, 6198, 6207–6219, 9334, IMG_6194.MOV, IMG_6195.MOV) : l'Atlantique
 * y est gris-vert, chargé de sable près du bord, et la houle déferle en
 * plusieurs lignes de rouleaux blancs qui avancent jusqu'à la plage.
 *
 * La géométrie se soulève dans le vertex shader. Quatre rubans transparents
 * figurent les déferlantes : chacun naît au large, avance vers le rivage en
 * s'élargissant, se déchire puis s'étale sur le sable.
 */

/**
 * Décalage de la ligne d'eau, en coordonnées locales du maillage (z monde - 14),
 * et débordement permis au-delà : l'écume n'avance sur le rivage que là où il y
 * a du sable — premier tronçon et plage de l'Esplanade — et jamais sur la
 * promenade du tronçon aménagé, où l'eau bat l'enrochement.
 */
const RIVAGE = `
  float plageOuverte(float z) { return smoothstep(16.0, 24.0, z); }
  float plageEsplanade(float z) { return 1.0 - smoothstep(-113.0, -107.0, z); }
  float rivage(float z) { return plageOuverte(z) * 20.5 + plageEsplanade(z) * 50.0; }
  float debord(float z) { return clamp(plageOuverte(z) + plageEsplanade(z), 0.0, 1.0); }
`;

export class MerAnimee {
  private temps = 0;
  private readonly materiaux: T.ShaderMaterial[] = [];
  private readonly eau: T.ShaderMaterial;

  constructor(parent: T.Object3D) {
    // Maillage assez souple pour les vagues, mais léger pour les GPU intégrés.
    const surface = new T.PlaneGeometry(120, 300, 48, 76);
    surface.rotateX(-Math.PI / 2);
    // Une nappe sombre reste sous les creux : aucun morceau de l'ancien terrain
    // côtier ne réapparaît quand la surface animée descend.
    const fond = new T.Mesh(
      new T.PlaneGeometry(120, 300),
      new T.MeshStandardMaterial({color: '#3f4f4d', roughness: .72, metalness: .04}),
    );
    fond.geometry.rotateX(-Math.PI / 2);
    // Assez bas pour rester sous les creux de la houle près du bord (jusqu'à -0,09).
    fond.name = 'fond-ocean-corniche'; fond.position.set(-68.6, -.3, 14); fond.receiveShadow = true;
    parent.add(fond);
    this.eau = new T.ShaderMaterial({
      name: 'matiere-ocean-anime',
      fog: true,
      uniforms: T.UniformsUtils.merge([T.UniformsLib.fog, {uTemps: {value: 0}, uCouvert: {value: 1}}]),
      vertexShader: `
        uniform float uTemps;
        varying vec2 vUvEau;
        varying float vVague;
        varying float vDistance;
        ${RIVAGE}
        #include <fog_pars_vertex>
        void main() {
          vUvEau = uv;
          vec3 p = position;
          // Distance au rivage : le bord droit du maillage longe la côte.
          float d = 60.0 - p.x;
          p.x -= rivage(p.z);
          // La houle grossit en approchant du bord, puis s'amortit dans les
          // trois derniers mètres, contre l'enrochement ou sur le sable.
          float pres = 1.0 - smoothstep(0.0, 26.0, d);
          float amorti = smoothstep(0.0, 3.5, d);
          float houle = sin(d * .42 + uTemps * 1.7 + sin(p.z * .05) * 1.5);
          float vague = houle * (.05 + pres * .16) * amorti;
          vague += sin(p.x * .13 - p.z * .28 + uTemps * 1.85) * .035;
          vague += sin(p.z * .52 + uTemps * 2.2) * .012;
          p.y += vague;
          vVague = houle * pres * amorti;
          vDistance = d;
          vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }
      `,
      fragmentShader: `
        uniform float uTemps;
        uniform float uCouvert;
        varying vec2 vUvEau;
        varying float vVague;
        varying float vDistance;
        #include <fog_pars_fragment>
        void main() {
          // Gris-vert sous un ciel couvert, plus bleu au soleil ; eau chargée de
          // sable, kaki, sur les dix derniers mètres.
          vec3 profond = mix(vec3(.13, .29, .35), vec3(.17, .25, .27), uCouvert);
          vec3 large = mix(vec3(.22, .40, .43), vec3(.28, .35, .34), uCouvert);
          vec3 rive = vec3(.45, .44, .37);
          vec3 couleur = mix(profond, large, 1.0 - smoothstep(18.0, 60.0, vDistance));
          couleur = mix(couleur, rive, (1.0 - smoothstep(1.5, 10.0, vDistance)) * .65);
          float trace = abs(fract(vUvEau.y * 67.0 + vUvEau.x * 9.0 + uTemps * .075) - .5);
          float rides = 1.0 - smoothstep(.035, .105, trace);
          couleur += vec3(.22, .26, .25) * rides * .05;
          // Crêtes blanches des vagues qui se creusent avant de déferler.
          float crete = smoothstep(.55, .95, vVague) * (1.0 - smoothstep(5.0, 16.0, vDistance));
          couleur = mix(couleur, vec3(.9, .93, .9), crete * .7);
          gl_FragColor = vec4(couleur, 1.0);
          #include <fog_fragment>
        }
      `,
    });
    const ocean = new T.Mesh(surface, this.eau);
    ocean.name = 'ocean-anime';
    // Dans la vidéo aérienne, l'eau longe presque directement la promenade.
    // Le bord droit du maillage arrive donc à x=-8.6, juste sous le garde-corps.
    ocean.position.set(-68.6, .12, 14);
    ocean.receiveShadow = true;
    parent.add(ocean);
    this.materiaux.push(this.eau);

    // Quatre déferlantes décalées d'un quart de période : deux ou trois lignes
    // blanches sont visibles à tout instant, comme sur IMG_6198 et IMG_9334.
    const periode = 8;
    for (let index = 0; index < 4; index++) {
      const geometrie = new T.PlaneGeometry(3.4, 276, 4, 110);
      geometrie.rotateX(-Math.PI / 2);
      const ecume = new T.ShaderMaterial({
        name: `matiere-deferlante-${index + 1}`,
        fog: true,
        transparent: true,
        depthWrite: false,
        side: T.DoubleSide,
        uniforms: T.UniformsUtils.merge([
          T.UniformsLib.fog,
          {uTemps: {value: 0}, uPhase: {value: index / 4}, uVitesse: {value: 1 / periode}},
        ]),
        vertexShader: `
          uniform float uTemps;
          uniform float uPhase;
          uniform float uVitesse;
          varying vec2 vUvEcume;
          varying float vCycle;
          varying float vDistance;
          varying float vDebord;
          ${RIVAGE}
          #include <fog_pars_vertex>
          void main() {
            vUvEcume = uv;
            vec3 p = position;
            // La ligne n'est pas parfaitement droite : elle arrive un peu plus
            // tôt ou plus tard selon l'endroit de la côte.
            float cycle = fract(uTemps * uVitesse + uPhase + sin(p.z * .031 + uPhase * 6.3) * .06);
            // Rapide au large, elle ralentit en s'étalant sur le bord.
            float avance = 1.0 - (1.0 - cycle) * (1.0 - cycle);
            vDebord = debord(p.z) * 2.2;
            float distanceRivage = mix(16.0, -vDebord, avance);
            float largeur = mix(.8, 1.9, cycle);
            vDistance = distanceRivage - p.x * largeur;
            p.x = 60.0 - distanceRivage + p.x * largeur - rivage(p.z);
            p.x += sin(p.z * .21 + uPhase * 9.0) * .35;
            // Au-dessus des crêtes au large, au ras du sable sur le rivage.
            p.y = .075 + .29 * smoothstep(0.0, 6.0, distanceRivage);
            vCycle = cycle;
            vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            #include <fog_vertex>
          }
        `,
        fragmentShader: `
          uniform float uTemps;
          uniform float uPhase;
          varying vec2 vUvEcume;
          varying float vCycle;
          varying float vDistance;
          varying float vDebord;
          #include <fog_pars_fragment>
          void main() {
            // Front net côté plage, traîne diffuse côté large.
            float bord = smoothstep(0.0, .6, vUvEcume.x) * (1.0 - smoothstep(.86, 1.0, vUvEcume.x));
            // Une bande continue au déferlement, qui s'ouvre en larges trouées
            // en s'étalant. Bruit de basse fréquence : des trous de plusieurs
            // mètres, pas des tirets.
            float y = vUvEcume.y * 276.0;
            float bruit = sin(y * .23 + uPhase * 7.0) * .5 + sin(y * .61 + uPhase * 3.0 + uTemps * .15) * .3
              + sin(y * 1.7 + vUvEcume.x * 2.0) * .2;
            float dechire = smoothstep(-.9, -.2, bruit + 1.1 - vCycle * 1.3);
            // Mousse bouillonnante : taches claires et plus denses dans le corps de la vague.
            float mousse = .5 + .25 * sin(y * 3.1 + vUvEcume.x * 11.0 - uTemps * 1.3) + .25 * sin(y * 7.3 - vUvEcume.x * 5.0 + uPhase * 4.0);
            float vie = smoothstep(0.0, .14, vCycle) * (1.0 - smoothstep(.8, 1.0, vCycle) * .9);
            // Rien au-delà du rivage, sauf sur le sable où l'eau s'étale.
            float rivage = smoothstep(-vDebord - .25, -vDebord + .35, vDistance);
            float alpha = bord * dechire * vie * rivage * (.72 + mousse * .26);
            if (alpha < .02) discard;
            gl_FragColor = vec4(vec3(.93, .95, .92), alpha);
            #include <fog_fragment>
          }
        `,
      });
      const rouleau = new T.Mesh(geometrie, ecume);
      rouleau.name = `deferlante-${index + 1}`;
      rouleau.position.set(-68.6, 0, 14);
      rouleau.renderOrder = 2 + index;
      rouleau.frustumCulled = false;
      parent.add(rouleau);
      this.materiaux.push(ecume);
    }
  }

  /** Teinte de l'eau selon la nébulosité, de 0 (soleil) à 1 (couvert). */
  reglerCouverture(couverture: number) {
    this.eau.uniforms.uCouvert.value = couverture;
  }

  actualiser(dt: number) {
    this.temps += dt;
    for (const materiau of this.materiaux) materiau.uniforms.uTemps.value = this.temps;
  }
}
