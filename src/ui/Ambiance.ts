export type Ecoute3D={x:number;z:number;yaw:number;mode:'zemidjan'|'voiture'|null;intensite:number;pluie?:boolean};

/** Ambiance synthétique spatialisée, activée par le joueur et sans fichier distant. */
export class Ambiance {
  private contexte?:AudioContext;
  private sortie?:GainNode;
  private vent?:GainNode;
  private vagues?:GainNode;
  private trafic?:GainNode;
  private marche?:GainNode;
  private moteur?:OscillatorNode;
  private klaxon?:OscillatorNode;
  private gainKlaxon?:GainNode;
  private pluie?:GainNode;
  private enregistrement?:HTMLAudioElement;
  private pannerVagues?:PannerNode;
  private pannerTrafic?:PannerNode;
  private pannerMarche?:PannerNode;
  private active=false;
  private volume=.58;

  constructor(private readonly bouton:HTMLButtonElement){
    bouton.textContent='Ambiance 3D : coupée';
    bouton.onclick=()=>this.basculer();
    addEventListener('blur',()=>{if(this.contexte)this.sortie?.gain.setTargetAtTime(0,this.contexte.currentTime,.04);});
  }

  private async basculer(){
    if(!('AudioContext' in window)){this.bouton.textContent='Ambiance indisponible';this.bouton.disabled=true;return;}
    try{
      if(!this.contexte)this.creer();
      await this.contexte!.resume();this.active=!this.active;
      this.bouton.textContent=`Ambiance 3D : ${this.active?'activée':'coupée'}`;
      this.bouton.setAttribute('aria-pressed',String(this.active));
      if(this.active)this.enregistrement?.play().catch(()=>{});
      else{this.sortie!.gain.setTargetAtTime(0,this.contexte!.currentTime,.1);this.enregistrement?.pause();}
    }catch{this.bouton.textContent='Son indisponible';}
  }

  private creerPanner(ctx:AudioContext,x:number,z:number,portee:number){
    const panner=ctx.createPanner();panner.panningModel='HRTF';panner.distanceModel='inverse';
    panner.refDistance=5;panner.maxDistance=portee;panner.rolloffFactor=1.25;
    this.positionner(panner,x,1,z);return panner;
  }

  private creer(){
    const ctx=new AudioContext();this.contexte=ctx;
    const master=ctx.createGain();master.gain.value=0;master.connect(ctx.destination);this.sortie=master;
    const buffer=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate),samples=buffer.getChannelData(0);
    for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*.3;
    const bruit=ctx.createBufferSource();bruit.buffer=buffer;bruit.loop=true;

    const filtreVent=ctx.createBiquadFilter();filtreVent.type='lowpass';filtreVent.frequency.value=650;
    const vent=ctx.createGain();vent.gain.value=.2;bruit.connect(filtreVent).connect(vent).connect(master);this.vent=vent;

    const filtreVagues=ctx.createBiquadFilter();filtreVagues.type='bandpass';filtreVagues.frequency.value=430;filtreVagues.Q.value=.55;
    const vagues=ctx.createGain();vagues.gain.value=0;this.pannerVagues=this.creerPanner(ctx,-38,-35,115);
    bruit.connect(filtreVagues).connect(vagues).connect(this.pannerVagues).connect(master);this.vagues=vagues;

    // Court enregistrement d'ambiance issu des médias fournis avec le projet.
    // Le mixage synthétique reste actif lorsque le navigateur ne lit pas le MOV.
    const enregistrement=new Audio('/espace/IMG_6212.MOV');enregistrement.loop=true;enregistrement.preload='none';
    const gainReel=ctx.createGain();gainReel.gain.value=.08;
    try{ctx.createMediaElementSource(enregistrement).connect(gainReel).connect(this.pannerVagues);this.enregistrement=enregistrement;}catch{}

    const filtreMarche=ctx.createBiquadFilter();filtreMarche.type='bandpass';filtreMarche.frequency.value=980;filtreMarche.Q.value=.8;
    const marche=ctx.createGain();marche.gain.value=.06;this.pannerMarche=this.creerPanner(ctx,3,-188,85);
    bruit.connect(filtreMarche).connect(marche).connect(this.pannerMarche).connect(master);this.marche=marche;

    const moteur=ctx.createOscillator();moteur.type='triangle';moteur.frequency.value=66;
    const trafic=ctx.createGain();trafic.gain.value=.012;this.pannerTrafic=this.creerPanner(ctx,16,-18,95);
    moteur.connect(trafic).connect(this.pannerTrafic).connect(master);moteur.start();this.moteur=moteur;this.trafic=trafic;

    const filtrePluie=ctx.createBiquadFilter();filtrePluie.type='highpass';filtrePluie.frequency.value=1900;
    const pluie=ctx.createGain();pluie.gain.value=0;bruit.connect(filtrePluie).connect(pluie).connect(master);this.pluie=pluie;

    const klaxon=ctx.createOscillator();klaxon.type='square';klaxon.frequency.value=315;
    const gainKlaxon=ctx.createGain();gainKlaxon.gain.value=0;klaxon.connect(gainKlaxon).connect(master);klaxon.start();
    this.klaxon=klaxon;this.gainKlaxon=gainKlaxon;
    bruit.start();
  }

  reglerVolume(volume:number){this.volume=Math.max(0,Math.min(1,volume));}
  klaxonner(){
    if(!this.contexte||!this.active||!this.gainKlaxon||!this.klaxon)return;
    const t=this.contexte.currentTime;this.klaxon.frequency.setValueAtTime(315,t);
    this.gainKlaxon.gain.cancelScheduledValues(t);this.gainKlaxon.gain.setValueAtTime(0,t);
    this.gainKlaxon.gain.linearRampToValueAtTime(.055,t+.025);this.gainKlaxon.gain.setValueAtTime(.055,t+.14);
    this.gainKlaxon.gain.exponentialRampToValueAtTime(.001,t+.24);
  }

  private positionner(panner:PannerNode,x:number,y:number,z:number){
    if(panner.positionX){panner.positionX.value=x;panner.positionY.value=y;panner.positionZ.value=z;}
    else panner.setPosition(x,y,z);
  }

  actualiser(ecoute:Ecoute3D,paused:boolean){
    if(!this.contexte||!this.active)return;
    const ctx=this.contexte,t=ctx.currentTime,corniche=ecoute.z>-90;
    const muet=paused||document.hidden||!document.hasFocus();
    this.sortie!.gain.setTargetAtTime(muet?0:this.volume,t,.15);
    this.vent!.gain.setTargetAtTime(corniche?.22+.06*Math.sin(t*.5):.09,t,.5);
    const ressac=.24+.11*Math.sin(t*.72)+.05*Math.sin(t*1.41);
    this.vagues!.gain.setTargetAtTime(corniche?ressac:.012,t,.28);
    const procheMarche=Math.abs(ecoute.z+188)<75;
    this.marche!.gain.setTargetAtTime(procheMarche?.055+.018*Math.sin(t*1.7):.006,t,.4);
    const regime=ecoute.mode==='voiture'?112:ecoute.mode==='zemidjan'?138:66;
    this.moteur!.frequency.setTargetAtTime(regime+ecoute.intensite*35+Math.sin(t*.6)*9,t,.08);
    this.trafic!.gain.setTargetAtTime(ecoute.mode?.027:.014,t,.25);
    this.pluie!.gain.setTargetAtTime(ecoute.pluie?.12:0,t,.25);
    this.positionner(this.pannerTrafic!,ecoute.mode?ecoute.x:16,1,ecoute.mode?ecoute.z:ecoute.z-18);

    const listener=ctx.listener,fx=-Math.sin(ecoute.yaw),fz=-Math.cos(ecoute.yaw);
    if(listener.positionX){listener.positionX.value=ecoute.x;listener.positionY.value=1.6;listener.positionZ.value=ecoute.z;
      listener.forwardX.value=fx;listener.forwardY.value=0;listener.forwardZ.value=fz;listener.upX.value=0;listener.upY.value=1;listener.upZ.value=0;}
    else{listener.setPosition(ecoute.x,1.6,ecoute.z);listener.setOrientation(fx,0,fz,0,1,0);}
  }
}
