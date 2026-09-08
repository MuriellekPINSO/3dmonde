interface Recognition {
  lang:string; continuous:boolean; interimResults:boolean;
  onresult:((e:{results:{0:{0:{transcript:string}}}})=>void)|null;
  onerror:((e:{error:string})=>void)|null;
  onend:(()=>void)|null; start():void; abort():void;
}
export class DialogueVocal {
  active = false;
  private recognition?: Recognition;
  private ecoute = false;
  private generation = 0;
  private bouton: HTMLButtonElement;
  constructor(bouton:HTMLButtonElement){
    this.bouton=bouton;
    bouton.onclick=()=>{if(!this.disponible)return;this.active=!this.active;this.actualiser();if(!this.active)window.speechSynthesis.cancel();};
    if(!this.disponible){bouton.disabled=true;bouton.textContent='Voix indisponible';}
  }
  get disponible(){return 'speechSynthesis' in window;}
  private actualiser(){this.bouton.textContent=`Voix : ${this.active?'activée':'désactivée'}`;this.bouton.setAttribute('aria-pressed',String(this.active));}
  lire(texte:string,forcer=false){
    if(!this.disponible)return;
    if(forcer){this.active=true;this.actualiser();}
    if(!this.active)return;
    this.arreterMicro();window.speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(texte);utterance.lang='fr-FR';utterance.rate=.95;window.speechSynthesis.speak(utterance);
  }
  arreterMicro(){this.generation++;this.recognition?.abort();this.recognition=undefined;this.ecoute=false;const bouton=document.getElementById('mic');if(bouton)bouton.textContent='Parler au micro';}
  arreter(){this.arreterMicro();window.speechSynthesis?.cancel();}
  brancherMicro(bouton:HTMLButtonElement,status:HTMLElement,input:HTMLInputElement){
    const speechWindow=window as unknown as {SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition};
    const Constructor=speechWindow.SpeechRecognition||speechWindow.webkitSpeechRecognition;
    if(!Constructor){bouton.disabled=true;status.textContent='Micro non pris en charge ici. Tu peux écrire ton message.';return;}
    bouton.onclick=()=>{
      if(this.ecoute){this.arreterMicro();status.textContent='Écoute arrêtée.';return;}
      window.speechSynthesis?.cancel();const token=++this.generation;
      const recognition=new Constructor();this.recognition=recognition;
      recognition.lang='fr-FR';recognition.continuous=false;recognition.interimResults=false;
      const courant=()=>token===this.generation&&input.isConnected;
      recognition.onresult=e=>{if(!courant())return;input.value=e.results[0][0].transcript;status.textContent='Vérifie la transcription puis appuie sur Envoyer.';};
      recognition.onerror=e=>{if(courant())status.textContent=e.error==='not-allowed'?'Micro refusé. Continue par écrit.':'La reconnaissance a échoué. Réessaie ou écris ton message.';};
      recognition.onend=()=>{if(courant()){this.ecoute=false;bouton.textContent='Parler au micro';}};
      try{recognition.start();this.ecoute=true;bouton.textContent='Arrêter le micro';status.textContent='Écoute en cours…';}catch{this.ecoute=false;status.textContent='Micro indisponible. Continue par écrit.';}
    };
  }
}
