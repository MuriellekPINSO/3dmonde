import * as T from 'three';

/**
 * Océan animé de la Corniche. La géométrie se soulève dans le vertex shader,
 * tandis que trois rubans transparents dessinent l'écume qui gagne la plage.
 */
export class MerAnimee {
  private temps = 0;
  private readonly materiaux: T.ShaderMaterial[] = [];

  constructor(parent: T.Object3D) {
    // Maillage assez souple pour les vagues, mais léger pour les GPU intégrés.
    const surface = new T.PlaneGeometry(120, 300, 38, 76);
    surface.rotateX(-Math.PI / 2);
    // Une nappe sombre reste sous les creux : aucun morceau de l'ancien terrain
    // côtier ne réapparaît quand la surface animée descend.
    const fond = new T.Mesh(
      new T.PlaneGeometry(120, 300),
      new T.MeshStandardMaterial({color:'#245d66',roughness:.72,metalness:.04}),
    );
    fond.geometry.rotateX(-Math.PI/2);
    fond.name='fond-ocean-corniche';fond.position.set(-68.6,-.035,14);fond.receiveShadow=true;
    parent.add(fond);
    const eau = new T.ShaderMaterial({
      name: 'matiere-ocean-anime',
      fog: true,
      uniforms: T.UniformsUtils.merge([T.UniformsLib.fog, {uTemps: {value: 0}}]),
      vertexShader: `
        uniform float uTemps;
        varying vec2 vUvEau;
        varying float vVague;
        #include <fog_pars_vertex>
        void main() {
          vUvEau = uv;
          vec3 p = position;
          // Au premier tronçon (z monde > 38), la plage est plus large et la
          // ligne d'eau recule de vingt mètres. La transition reste progressive.
          p.x -= smoothstep(16.0, 24.0, p.z) * 20.5;
          float ample = .05 + (1.0 - uv.x) * .08;
          float vague = sin(p.x * .34 + p.z * .09 + uTemps * 1.35) * ample;
          vague += sin(p.x * .13 - p.z * .28 + uTemps * 1.85) * .04;
          vague += sin(p.z * .52 + uTemps * 2.2) * .015;
          p.y += vague;
          vVague = vague;
          vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }
      `,
      fragmentShader: `
        uniform float uTemps;
        varying vec2 vUvEau;
        varying float vVague;
        #include <fog_pars_fragment>
        void main() {
          vec3 profond = vec3(.105, .31, .34);
          vec3 rive = vec3(.34, .58, .57);
          vec3 couleur = mix(profond, rive, smoothstep(.12, 1.0, vUvEau.x));
          float trace = abs(fract(vUvEau.y * 67.0 + vUvEau.x * 9.0 + uTemps * .075) - .5);
          float rides = 1.0 - smoothstep(.035, .105, trace);
          float crete = smoothstep(.26, .39, vVague);
          couleur += vec3(.28, .37, .34) * rides * .18;
          couleur += vec3(.56, .67, .63) * crete;
          gl_FragColor = vec4(couleur, 1.0);
          #include <fog_fragment>
        }
      `,
    });
    const ocean = new T.Mesh(surface, eau);
    ocean.name = 'ocean-anime';
    // Dans la vidéo aérienne, l'eau longe presque directement la promenade.
    // Le bord droit du maillage arrive donc à x=-8.6, juste sous le garde-corps.
    ocean.position.set(-68.6, .12, 14);
    ocean.receiveShadow = true;
    parent.add(ocean);
    this.materiaux.push(eau);

    // Plusieurs rouleaux arrivent à des vitesses et positions différentes.
    const rouleaux = [[-9.9, .65], [-11.8, .8], [-14.4, 1.05]] as const;
    for (const [index, [x, largeur]] of rouleaux.entries()) {
      const geometrie = new T.PlaneGeometry(largeur, 276, 3, 74);
      geometrie.rotateX(-Math.PI / 2);
      const ecume = new T.ShaderMaterial({
        name: `matiere-ecume-${index + 1}`,
        fog: true,
        transparent: true,
        depthWrite: false,
        side: T.DoubleSide,
        uniforms: T.UniformsUtils.merge([
          T.UniformsLib.fog,
          {uTemps: {value: 0}, uPhase: {value: index * 2.17}},
        ]),
        vertexShader: `
          uniform float uTemps;
          uniform float uPhase;
          varying vec2 vUvEcume;
          #include <fog_pars_vertex>
          void main() {
            vUvEcume = uv;
            vec3 p = position;
            p.x -= smoothstep(16.0, 24.0, p.z) * 20.5;
            p.x += sin(p.z * .105 + uTemps * .8 + uPhase) * .36;
            p.x += sin(p.z * .31 - uTemps * 1.4 + uPhase) * .1;
            p.y += .08 + sin(p.z * .22 + uTemps * 1.7 + uPhase) * .055;
            vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            #include <fog_vertex>
          }
        `,
        fragmentShader: `
          uniform float uTemps;
          uniform float uPhase;
          varying vec2 vUvEcume;
          #include <fog_pars_fragment>
          void main() {
            float bord = sin(3.14159 * vUvEcume.x);
            bord = smoothstep(.02, .68, bord);
            float cellule = fract(vUvEcume.y * 47.0 + vUvEcume.x * 2.7 - uTemps * .42 + uPhase);
            float mousse = smoothstep(.08, .34, cellule) * (1.0 - smoothstep(.7, .96, cellule));
            float souffle = .76 + .24 * cos(uTemps * 1.2 + uPhase);
            float alpha = bord * (.13 + mousse * .27) * souffle;
            gl_FragColor = vec4(vec3(.91, .96, .91), alpha);
            #include <fog_fragment>
          }
        `,
      });
      const rouleau = new T.Mesh(geometrie, ecume);
      rouleau.name = `ecume-animee-${index + 1}`;
      rouleau.position.set(x, .03 + index * .015, 14);
      rouleau.renderOrder = 2 + index;
      parent.add(rouleau);
      this.materiaux.push(ecume);
    }
  }

  actualiser(dt: number) {
    this.temps += dt;
    for (const materiau of this.materiaux) materiau.uniforms.uTemps.value = this.temps;
  }
}
