import { Ambiance } from './ui/Ambiance';
import { Monde } from './world';
import { products } from './game';
import { Partie, SportJogging, Vendeuse, Zemidjan, Voiture, type Transport } from './core/Partie';
import { guides, lieux, zones, zoneActuelle, stations, etals, type Guide } from './content/zones';
import { DialogueVocal } from './ui/DialogueVocal';
const $ = <T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
type Interaction = {type:'guide';guide:Guide}|{type:'vendeuse'|'sport'|'transport'}|null;

export class Jeu {
  readonly partie=new Partie();
  readonly sport=new SportJogging();
  readonly vendeuse=new Vendeuse();
  readonly transports:Transport[]=[new Zemidjan(),new Voiture()];
  private monde!:Monde;
  private voix!:DialogueVocal;
  private ambiance!:Ambiance;
  private proche:Interaction=null;
  private toastTimer=0;
  private dernierFocus:HTMLElement|null=null;
  private zoneId='';
  private get panel(){return $<HTMLDialogElement>('panel');}
  private get accueil(){return $<HTMLDialogElement>('welcome');}

  constructor(){
    this.interface();this.accueil.showModal();
    try{this.monde=new Monde($('world'));}catch{
      this.accueil.innerHTML='<h2>La 3D ne peut pas démarrer.</h2><p>Essaie un navigateur avec WebGL 2 et l’accélération graphique activée, puis recharge la page.</p>';return;
    }
    this.voix=new DialogueVocal($<HTMLButtonElement>('sound'));
    this.ambiance=new Ambiance($<HTMLButtonElement>('ambiance'));
    this.commandes();this.monde.start(dt=>this.actualiser(dt));
  }
  private interface(){
    $('app').innerHTML=`<div id="world"></div>
    <header><a class="brand" href="./"><span class="brand-mark">C.</span><span>COTONOU<small>UNE VILLE À RENCONTRER</small></span></a><div class="top-right"><span class="tag">BALADE · 4 ZONES</span><button id="sound" aria-pressed="false">Voix : désactivée</button><button id="map">Parcours · 0/5</button><button id="bag">Sac · 0</button><span id="wallet">1 500 FCFA</span></div></header>
    <aside class="location"><p class="eyebrow" id="zone-kicker">BÉNIN / AKPAKPA</p><h1 id="zone-title">La Corniche</h1><p id="zone-description">Au bord de l’eau, Cotonou s’éveille.</p><div class="rule"></div><p class="eyebrow">VOTRE CARNET DE BALADE</p><ol>${zones.map(z=>`<li id="task-${z.id}">${z.nom}${z.id==='amazone'?' & Présidence':''}</li>`).join('')}</ol><p class="note" id="next-objective">Rencontrer le guide de la Corniche.</p><p class="note" id="side-quests">Jogging : à essayer · Aïcha : à rencontrer</p></aside>
    <button id="ambiance" aria-pressed="false">Ambiance : coupée</button>
    <div class="compass" aria-hidden="true">N<span>↑</span></div>
    <div id="toast" role="status"></div><button id="interaction" hidden></button>
    <div id="vehicle-status" hidden><span id="vehicle-label"></span><button id="dismount">Descendre · F</button></div>
    <div id="sport" hidden><span id="sport-label">Jogging</span><progress id="progress" max="50" value="0"></progress></div>
    <footer><div><kbd>ZQSD</kbd> / <kbd>↑↓←→</kbd> Se déplacer <span>·</span> Glisser pour regarder autour et vers le haut</div><div><kbd>E</kbd> Interagir <span>·</span> <kbd>Espace</kbd> Jogging <span>·</span> <kbd>F</kbd> Descendre</div></footer>
    <div id="touch"><button data-key="arrowup" aria-label="Avancer">↑</button><div><button data-key="arrowleft" aria-label="Aller à gauche">←</button><button data-key="arrowdown" aria-label="Reculer">↓</button><button data-key="arrowright" aria-label="Aller à droite">→</button></div></div>
    <dialog id="welcome"><p class="eyebrow">BIENVENUE AU BÉNIN</p><h2>Une ville.<br>Mille rencontres.</h2><p>De la Corniche à l’Étoile Rouge, découvre cinq lieux à pied, en zémidjan ou en voiture. Discute avec Aïcha et fais une pause sportive.</p><p class="note">Quatre zones stylisées · distances raccourcies<br>Modèles provisoires · progression pendant cette session.</p><button id="begin" class="primary">Commencer la balade <span>→</span></button></dialog>
    <dialog id="panel"><button id="close" class="close" aria-label="Fermer">×</button><p id="panel-kicker" class="eyebrow"></p><h2 id="panel-title"></h2><div id="panel-body"></div></dialog>`;
  }
  private notifier(text:string){
    $('toast').textContent=text;$('toast').classList.add('show');clearTimeout(this.toastTimer);
    this.toastTimer=window.setTimeout(()=>$('toast').classList.remove('show'),5500);
  }
  private ouvrir(titre:string,kicker:string,html:string){
    this.dernierFocus=document.activeElement as HTMLElement;this.monde.keys.clear();this.voix.arreter();
    $('panel-title').textContent=titre;$('panel-kicker').textContent=kicker;$('panel-body').innerHTML=html;this.panel.showModal();
  }
  private synchroniser(){
    $('wallet').textContent=`${this.partie.balance.toLocaleString('fr-FR')} FCFA`;$('bag').textContent=`Sac · ${this.partie.inventory.length}`;
    $('map').textContent=`Parcours · ${this.partie.visites.size}/5`;
    for(const zone of zones)$(`task-${zone.id}`).classList.toggle('done',zone.guides.every(g=>this.partie.visites.has(g.id)));
    const suivant=guides.find(g=>!this.partie.visites.has(g.id));
    $('next-objective').textContent=suivant?`Prochaine découverte : ${suivant.titre}.`:'Les cinq lieux sont découverts !';
    $('side-quests').textContent=`Jogging : ${this.sport.termine?'terminé':'à essayer'} · Aïcha : ${this.partie.vendeuseRencontree?'rencontrée':'à rencontrer'}`;
  }
  private commandes(){
    $('close').onclick=()=>this.panel.close();
    this.panel.addEventListener('close',()=>{this.voix.arreter();this.monde.keys.clear();if(this.dernierFocus?.isConnected)this.dernierFocus.focus();});
    $('begin').onclick=()=>this.accueil.close();this.accueil.addEventListener('cancel',e=>e.preventDefault());
    $('bag').onclick=()=>this.ouvrirSac();$('map').onclick=()=>this.ouvrirParcours();
    $('interaction').onclick=()=>this.interagir();$('dismount').onclick=()=>this.descendre();
    addEventListener('keydown',e=>{
      if(this.panel.open||this.accueil.open)return;
      const key=e.key.toLowerCase();if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(key))e.preventDefault();
      this.monde.keys.add(key);if(e.repeat)return;
      if(key==='e')this.interagir();if(key===' ')this.basculerSport();if(key==='f')this.descendre();
    });
    addEventListener('keyup',e=>this.monde.keys.delete(e.key.toLowerCase()));
    const pause=()=>{this.monde.keys.clear();this.voix.arreter();};addEventListener('blur',pause);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
    document.querySelectorAll<HTMLButtonElement>('[data-key]').forEach(b=>{
      b.onpointerdown=e=>{this.monde.keys.add(b.dataset.key!);b.setPointerCapture(e.pointerId);};
      b.onpointerup=b.onpointercancel=()=>this.monde.keys.delete(b.dataset.key!);
    });
  }
  private ouvrirSac(){
    this.ouvrir('Ton sac','OBJETS ACHETÉS','');const list=document.createElement('ul');
    for(const item of this.partie.inventory){const li=document.createElement('li');li.textContent=item;list.append(li);}
    $('panel-body').append(this.partie.inventory.length?list:Object.assign(document.createElement('p'),{textContent:'Ton sac est vide. Retrouve Aïcha au stand pour découvrir ses produits.'}));
  }
  private ouvrirParcours(){
    const z=this.monde.player.position.z;
    this.ouvrir('Ton parcours','CINQ LIEUX · QUATRE ZONES',`<p>Les lieux sont reliés par la promenade. Avance vers le nord pour continuer ; repars vers le sud pour revenir.</p><div class="route-list">${guides.map(g=>`<div><strong>${this.partie.visites.has(g.id)?'✓ ':''}${g.titre}</strong><small>${Math.round(Math.abs(g.z-z))} m de jeu · ${g.z<z?'vers le nord':'vers le sud'}</small></div>`).join('')}</div><p class="note">Distances fictives. Chaque borne Transport propose un zémidjan ou une voiture. Le trajet reste entièrement accessible à pied.</p>${this.partie.terminee(lieux)?'<button id="summary" class="primary">Voir le bilan</button>':''}`);
    if($('summary'))$('summary').onclick=()=>{this.panel.close();this.bilan();};
  }
  private afficherGuide(guide:Guide){
    this.partie.visiter(guide.id);this.synchroniser();
    this.ouvrir(guide.titre,'VOTRE GUIDE',`<p>${guide.texte}</p><button id="read" class="primary">Écouter le guide</button>${guide.source?`<p class="note"><a href="${guide.source}" target="_blank" rel="noopener noreferrer">Référence du lieu</a></p>`:''}${this.partie.terminee(lieux)?'<p>Les cinq lieux sont découverts.</p><button id="finish">Terminer la balade</button>':''}`);
    $('read').onclick=()=>{if(!this.voix.disponible)this.notifier('Lecture vocale indisponible. Le texte reste accessible.');else this.voix.lire(guide.texte,true);};
    if($('finish'))$('finish').onclick=()=>{this.panel.close();this.bilan();};this.voix.lire(guide.texte);
  }
  private bilan(){
    this.partie.finAnnoncee=true;
    this.ouvrir('Cotonou, dans ton carnet.','FIN DE LA DÉMO',`<p>Bravo ! Tu as découvert les cinq lieux de cette balade.</p><ul><li>5 lieux visités dans 4 zones</li><li>${this.partie.inventory.length} objet(s) acheté(s)</li><li>${this.partie.balance.toLocaleString('fr-FR')} FCFA restants</li><li>Jogging : ${this.sport.termine?'terminé':'à découvrir'}</li></ul><p>Tu peux fermer ce bilan et continuer à explorer librement.</p>`);
  }
  private renderHistory(){
    const log=$('messages');if(!log)return;log.replaceChildren();
    for(const entry of this.vendeuse.historique){const p=document.createElement('p');p.className=entry.who==='Vous'?'outgoing':'';const label=document.createElement('strong');label.textContent=entry.who;p.append(label,document.createTextNode(entry.text));log.append(p);}log.scrollTop=log.scrollHeight;
  }
  private bulle(who:string,text:string){this.vendeuse.historique.push({who,text});this.renderHistory();if(who===this.vendeuse.nom)this.voix.lire(text);}
  private parlerVendeuse(){
    this.partie.vendeuseRencontree=true;this.synchroniser();
    this.ouvrir('Une pause chez Aïcha','VENDEUSE · CONVERSATION',`<p class="note">Échanges préparés : produits, prix et lieux.</p><div id="messages" role="log" aria-label="Conversation avec Aïcha" aria-live="polite"></div><form id="chat"><label for="message">Ton message</label><div class="input-row"><input id="message" maxlength="400" placeholder="Bonjour, qu’est-ce que tu vends ?" autocomplete="off" required><button class="primary" type="submit">Envoyer</button></div></form><button id="mic">Parler au micro</button><p id="mic-status" class="note" role="status">Le micro s’active sur demande. Selon le navigateur, la transcription peut utiliser un service en ligne.</p><div class="products">${products.map(p=>`<button data-product="${p.id}"><span>${p.name}</span><strong>${p.price} FCFA</strong></button>`).join('')}</div><div id="confirmation"></div><p class="note">Tarifs fictifs du prototype.</p>`);
    if(!this.vendeuse.historique.length)this.bulle(this.vendeuse.nom,this.vendeuse.discuter('bonjour'));else this.renderHistory();
    $<HTMLFormElement>('chat').onsubmit=e=>{
      e.preventDefault();const input=$<HTMLInputElement>('message'),text=input.value.trim();if(!text)return;
      this.bulle('Vous',text);input.value='';this.bulle(this.vendeuse.nom,this.vendeuse.discuter(text));
    };
    $('panel-body').querySelectorAll<HTMLButtonElement>('[data-product]').forEach(button=>button.onclick=()=>{
      const p=products.find(p=>p.id===button.dataset.product)!;
      $('confirmation').innerHTML=`<p>Confirmer : ${p.name} · ${p.price} FCFA ?</p><button id="confirm-buy" class="primary">Confirmer l’achat</button> <button id="cancel-buy">Annuler</button>`;
      $('confirm-buy').onclick=()=>{const result=this.vendeuse.acheter(this.partie,p.id);$('confirmation').replaceChildren();this.synchroniser();this.bulle(this.vendeuse.nom,result);};
      $('cancel-buy').onclick=()=>$('confirmation').replaceChildren();
    });
    this.voix.brancherMicro($<HTMLButtonElement>('mic'),$('mic-status'),$<HTMLInputElement>('message'));
  }
  private ouvrirTransport(){
    this.ouvrir('On t’emmène ?','BORNE DE TRANSPORT',`<p>Choisis ton véhicule. Tu le diriges avec les mêmes commandes et tu peux descendre avec F. Le tarif est payé une seule fois à la montée.</p><div class="transport-options">${this.transports.map(t=>`<button data-transport="${t.id}"><strong>${t.nom}</strong><span>${t.tarif} FCFA · vitesse ×${t.vitesse/4}</span></button>`).join('')}</div><div id="ride-confirmation" role="status"></div><p class="note">Tarifs fictifs. Sans solde suffisant, tu peux continuer à pied gratuitement.</p>`);
    $('panel-body').querySelectorAll<HTMLButtonElement>('[data-transport]').forEach(b=>b.onclick=()=>{
      const transport=this.transports.find(t=>t.id===b.dataset.transport)!;
      $('ride-confirmation').innerHTML=`<p>Confirmer ${transport.nom} pour ${transport.tarif} FCFA ?</p><button id="confirm-ride" class="primary">Confirmer et monter</button> <button id="cancel-ride">Annuler</button>`;
      $('cancel-ride').onclick=()=>$('ride-confirmation').replaceChildren();
      $('confirm-ride').onclick=()=>{
        if(!this.partie.monter(transport)){$('ride-confirmation').textContent='Solde insuffisant ou véhicule déjà actif. Tu peux continuer à pied.';return;}
        this.sport.arreter();this.synchroniser();this.panel.close();this.notifier(`${transport.nom} : utilise les flèches pour rouler et F pour descendre.`);
      };
    });
  }
  private descendre(){
    if(!this.partie.transport||this.panel.open||this.accueil.open)return;
    this.partie.descendre();this.monde.keys.clear();this.notifier('Tu continues à pied. Une nouvelle montée nécessitera un nouveau paiement.');
  }
  private interagir(){
    if(this.panel.open||this.accueil.open||!this.proche)return;
    if(this.partie.transport){this.notifier('Descends avec F pour rencontrer les personnages ou faire du sport.');return;}
    if(this.proche.type==='guide')this.afficherGuide(this.proche.guide);
    else if(this.proche.type==='vendeuse')this.parlerVendeuse();
    else if(this.proche.type==='transport')this.ouvrirTransport();
    else this.basculerSport();
  }
  private basculerSport(){
    if(this.sport.actif){this.sport.arreter();this.notifier('Jogging arrêté. Reviens au départ pour réessayer.');return;}
    const p=this.monde.player.position;
    if(this.sport.demarrer(p.x,p.z,!!this.partie.transport))this.notifier('Suis la bande terracotta jusqu’à la ligne d’arrivée.');
    else this.notifier('À pied, rejoins le départ du jogging sur la bande terracotta de la Corniche.');
  }
  private actualiser(dt:number){
    const p=this.monde.player.position,paused=this.panel.open||this.accueil.open||document.hidden;
    this.ambiance.actualiser(p.z,paused,!!this.partie.transport);
    const zone=zoneActuelle(p.z);
    if(zone.id!==this.zoneId){this.zoneId=zone.id;$('zone-title').textContent=zone.nom;$('zone-description').textContent=zone.sousTitre;$('zone-kicker').textContent=`BÉNIN / ${zone.id==='corniche'?'AKPAKPA':'COTONOU'}`;this.synchroniser();}
    const guide=guides.find(g=>g.estProche(p.x,p.z));
    this.proche=guide?{type:'guide',guide}:etals.some(z=>Math.hypot(p.x-3,p.z-z)<4.5)?{type:'vendeuse'}:stations.some(z=>Math.hypot(p.x-3,p.z-z)<4.2)?{type:'transport'}:p.x>5&&Math.abs(p.z-8)<5?{type:'sport'}:null;
    $('interaction').hidden=!this.proche||paused;
    $('interaction').textContent=this.partie.transport?'F · Descendre pour interagir':this.proche?.type==='guide'?'E · Rencontrer le guide':this.proche?.type==='vendeuse'?'E · Discuter avec Aïcha':this.proche?.type==='transport'?'E · Héler un transport':'Espace · Commencer le jogging';
    // The interaction button remains usable on touch screens while mounted.
    $('interaction').onclick=this.partie.transport?()=>this.descendre():()=>this.interagir();
    if(!paused){
      const result=this.sport.avancer(p.x,p.z,dt);
      if(result==='sortie')this.notifier('Reste sur la bande terracotta. Reviens au départ pour réessayer.');
      if(result==='arrivee'){this.synchroniser();this.notifier(`Bravo ! Jogging terminé en ${Math.round(this.sport.temps)} secondes.`);}
    }
    $('sport').hidden=!this.sport.actif;$<HTMLProgressElement>('progress').value=this.sport.distance;
    $('sport-label').textContent=`Jogging · ${Math.floor(this.sport.distance)} / 50 m`;
    $('vehicle-status').hidden=!this.partie.transport||paused;
    $('vehicle-label').textContent=this.partie.transport?`${this.partie.transport.nom} · vitesse ×${this.partie.transport.vitesse/4}`:'';
    return {paused,running:this.sport.actif,transport:this.partie.transport?.id??null,speed:this.partie.transport?.vitesse??(this.sport.actif?7:4)};
  }
}
