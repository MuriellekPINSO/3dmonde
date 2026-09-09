/** Ambiance synthétique discrète, sans enregistrement externe et activée sur demande. */
export class Ambiance {
  private contexte?:AudioContext;
  private sortie?:GainNode;
  private vent?:GainNode;
  private vagues?:GainNode;
  private moteur?:OscillatorNode;
  private moteurVolume?:GainNode;
  private active=false;
  constructor(private readonly bouton:HTMLButtonElement){
    bouton.onclick=async()=>{
      if(!('AudioContext' in window)){bouton.textContent='Ambiance indisponible';bouton.disabled=true;return;}
      try{
        if(!this.contexte)this.creer();
        await this.contexte!.resume();this.active=!this.active;
        bouton.textContent=`Ambiance : ${this.active?'activée':'coupée'}`;
        bouton.setAttribute('aria-pressed',String(this.active));
        if(!this.active)this.sortie!.gain.setTargetAtTime(0,this.contexte!.currentTime,.1);
      }catch{bouton.textContent='Son indisponible';}
    };
    addEventListener('blur',()=>{if(this.contexte)this.sortie?.gain.setTargetAtTime(0,this.contexte.currentTime,.04);});
  }
  private creer(){
    const ctx=new AudioContext();this.contexte=ctx;
    const master=ctx.createGain();master.gain.value=0;master.connect(ctx.destination);this.sortie=master;
    const buffer=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate),samples=buffer.getChannelData(0);
    for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*.3;
    const bruit=ctx.createBufferSource();bruit.buffer=buffer;bruit.loop=true;
    const filtre=ctx.createBiquadFilter();filtre.type='lowpass';filtre.frequency.value=650;
    const vent=ctx.createGain();vent.gain.value=.3;bruit.connect(filtre).connect(vent).connect(master);bruit.start();this.vent=vent;
    // Une seconde branche du bruit forme le ressac, avec une enveloppe lente qui
    // gonfle et retombe comme les rouleaux visibles près de la Corniche.
    const filtreVagues=ctx.createBiquadFilter();filtreVagues.type='bandpass';filtreVagues.frequency.value=430;filtreVagues.Q.value=.55;
    const vagues=ctx.createGain();vagues.gain.value=0;bruit.connect(filtreVagues).connect(vagues).connect(master);this.vagues=vagues;
    const moteur=ctx.createOscillator();moteur.type='triangle';moteur.frequency.value=66;
    const volume=ctx.createGain();volume.gain.value=.012;moteur.connect(volume).connect(master);moteur.start();this.moteur=moteur;this.moteurVolume=volume;
  }
  actualiser(z:number,paused:boolean,enVehicule:boolean){
    if(!this.contexte||!this.active)return;
    const ctx=this.contexte,t=ctx.currentTime,corniche=z>-90;
    const muet=paused||document.hidden||!document.hasFocus();
    this.sortie!.gain.setTargetAtTime(muet?0:.55,t,.15);
    this.vent!.gain.setTargetAtTime(corniche?.27+.07*Math.sin(t*.5):.11,t,.5);
    const ressac=.22+.12*Math.sin(t*.72)+.05*Math.sin(t*1.41);
    this.vagues!.gain.setTargetAtTime(corniche?ressac:.008,t,.28);
    this.moteur!.frequency.setTargetAtTime((enVehicule?85:58)+Math.sin(t*.6)*12,t,.1);
    this.moteurVolume!.gain.setTargetAtTime(enVehicule?.025:corniche?.006:.016,t,.3);
  }
}
