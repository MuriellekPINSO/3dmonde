import * as T from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/**
 * Habillage cinématique du rendu : étalonnage chaud façon golden hour, bloom
 * sur les reflets, bandes cinéma pour l'intro et fondu au noir. Un composer
 * remplace le rendu direct — la ville gagne un rendu de film sans toucher aux
 * matériaux, et l'intro dispose de ses outils de mise en scène.
 */
export class Cinema {
  readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass;
  private readonly etalonnage: ShaderPass;
  /** Bandes 2.35:1 (0→1) et fondu au noir (0→1), conduits par le monde. */
  bandes = 0;
  fondu = 1;

  private readonly v: Record<string, {value: number}>;

  constructor(renderer: T.WebGLRenderer, scene: T.Scene, camera: T.PerspectiveCamera) {
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    // Le bloom ne prend que les reflets brillants : soleil sur la lagune,
    // chrome des zémidjans, lampadaires du soir.
    this.bloom = new UnrealBloomPass(new T.Vector2(innerWidth, innerHeight), .35, .55, .88);
    this.composer.addPass(this.bloom);

    this.etalonnage = new ShaderPass({
      uniforms: {
        tDiffuse: {value: null},
        uVignette: {value: .22},
        uChaleur: {value: .9},
        uSaturer: {value: 1.09},
        uBandes: {value: 0},
        uFondu: {value: 1},
        uFiltre: {value: 0},
      },
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: /* glsl */`
        uniform sampler2D tDiffuse;
        uniform float uVignette,uChaleur,uSaturer,uBandes,uFondu,uFiltre;
        varying vec2 vUv;
        void main(){
          vec3 c=texture2D(tDiffuse,vUv).rgb;
          if(uFiltre>1.5){
            // « Nuit lagunaire » : bleus profonds, starburst sur les lumières.
            c=mix(vec3(dot(c,vec3(.299,.587,.114))),c,.72);
            c=pow(c,vec3(.92,.99,1.12));
            c+=vec3(0.,.01,.035)*smoothstep(.35,1.,dot(c,vec3(.3,.5,.2)));
          }else if(uFiltre>.5){
            // « Néon rétro » : magenta/turquoise croisés façon poste de nuit.
            float lum=dot(c,vec3(.299,.587,.114));
            c=mix(c,vec3(lum),.35);
            c.r*=1.09;c.g*=.99;c.b*=1.06;
            c=mix(c,c.brg*lum,.16);
          }
          // Ombres tièdes, hautes lumières crème : l'étalonnage golden hour.
          c=pow(c,vec3(.96,.99,1.03));
          c=mix(vec3(dot(c,vec3(.299,.587,.114))),c,uSaturer);
          c=mix(c,c*vec3(1.07,1.02,.92)+vec3(.012,.005,0.),uChaleur);
          // Vignette elliptique douce, resserrée pendant l'intro.
          vec2 d=vUv-.5;d.x*=1.35;
          c*=1.-uVignette*dot(d,d)*2.;
          // Bandes 2.35:1 pendant l'intro, puis fondu au noir.
          float masque=step(uBandes*.5,vUv.y)*step(vUv.y,1.-uBandes*.5);
          c*=mix(1.,masque,uBandes);
          c*=1.-uFondu;
          gl_FragColor=vec4(c,1.);
        }`,
    });
    this.composer.addPass(this.etalonnage);
    this.composer.addPass(new OutputPass());
    this.v = this.etalonnage.uniforms as unknown as Record<string, {value: number}>;
  }

  /** Un appel par image, à la place de renderer.render(). */
  rendre(dt: number) {
    this.v.uBandes.value = this.bandes;
    this.v.uFondu.value = this.fondu;
    this.v.uVignette.value = .2 + this.bandes * .18;
    this.composer.render(dt);
  }

  /** Filtre de mode photo : 0 = golden hour, 1 = néon rétro, 2 = nuit lagunaire. */
  reglerFiltre(quel: 0 | 1 | 2) {
    this.etalonnage.uniforms.uFiltre!.value = quel;
  }

  redimensionner() {
    this.composer.setSize(innerWidth, innerHeight);
  }

  reglerQualite(niveau: 'basse' | 'normale' | 'haute') {
    this.bloom.enabled = niveau !== 'basse';
  }
}
