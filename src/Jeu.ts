import { Ambiance } from './ui/Ambiance';
import { Monde } from './world';
import { products } from './game';
import { Partie, SportJogging, Vendeuse, Zemidjan, Voiture, type Transport } from './core/Partie';
import { guides, lieux, zones, zoneActuelle, stations, etals, type Guide } from './content/zones';
import { DialogueVocal } from './ui/DialogueVocal';
import { Manette, type LectureManette } from './input/Manette';
import { demanderIA } from './ui/DialogueIA';
import type { CorpsJoueur } from './entities/Foule';
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
  private readonly manette=new Manette();
  private manetteId='';
  private dernierFocus:HTMLElement|null=null;
  private zoneId='';
  private sauvegardeTemps=0;
  private tenue='#f3b94f';
  private corpsJoueur:CorpsJoueur='personnage1.glb';
  private nomJoueur='Mika';
  private get panel(){return $<HTMLDialogElement>('panel');}
  private get accueil(){return $<HTMLDialogElement>('welcome');}

  constructor(){
    this.interface();this.accueil.showModal();
    try{this.monde=new Monde($('world'));}catch{
      this.accueil.innerHTML='<h2>La 3D ne peut pas démarrer.</h2><p>Essaie un navigateur avec WebGL 2 et l’accélération graphique activée, puis recharge la page.</p>';return;
    }
    this.voix=new DialogueVocal($<HTMLButtonElement>('sound'));
    this.ambiance=new Ambiance($<HTMLButtonElement>('ambiance'));
    this.chargerSauvegarde();
    this.monde.onAccident=(type,responsable=true)=>{
      this.manette.vibrer('collision');
      if(responsable){this.partie.signalerAccident();this.synchroniser();}
      this.notifier(type==='personnage'
        ?'Accident ! Un personnage a été percuté. Le véhicule s’arrête pendant qu’il se relève.'
        :'Collision ! Les motos et leurs passagers sont tombés. Reprends la route après le choc.');
    };
    this.commandes();this.monde.start(dt=>this.actualiser(dt));
  }
  private interface(){
    $('app').innerHTML=`<div id="world"></div>
    <header><a class="brand" href="./"><span class="brand-mark">C.</span><span>COTONOU<small>UNE VILLE À RENCONTRER</small></span></a><div class="top-right"><span class="tag">BALADE · 4 ZONES</span><span id="controller-status" class="tag" hidden>🎮 MANETTE</span><button id="sound" aria-pressed="false">Voix : désactivée</button><button id="map">Carte · 0/5</button><button id="bag">Sac · 0</button><button id="menu" aria-label="Pause et réglages">☰</button><span id="wallet">10 000 FCFA</span></div></header>
    <aside class="location"><p class="eyebrow" id="zone-kicker">BÉNIN / AKPAKPA</p><h1 id="zone-title">La Corniche</h1><p id="zone-description">Au bord de l’eau, Cotonou s’éveille.</p><div class="rule"></div><p class="eyebrow">VOTRE CARNET DE BALADE</p><ol>${zones.map(z=>`<li id="task-${z.id}">${z.nom}${z.id==='amazone'?' & Présidence':''}</li>`).join('')}</ol><p class="note" id="next-objective">Rencontrer le guide de la Corniche.</p><p class="note" id="side-quests">Jogging : à essayer · Aïcha : à rencontrer</p></aside>
    <button id="ambiance" aria-pressed="false">Ambiance : coupée</button>
    <div class="compass" aria-hidden="true">N<span>↑</span></div>
    <div id="world-state"><span id="clock">07:30</span><span id="weather">Ciel clair</span><span id="health">Énergie 100</span></div>
    <div id="mission-hud"><strong>Mission</strong><span id="mission-text">Rencontrer le guide de la Corniche</span></div>
    <div id="tutorial" hidden><button id="tutorial-close" aria-label="Fermer le tutoriel">×</button><strong>Premiers pas</strong><span>ZQSD : marcher · E : interagir · M : carte · P : pause</span><small>Manette : joystick gauche pour conduire, ✕ interagir, ○ descendre, R1 klaxonner et Options mettre en pause.</small></div>
    <div id="toast" role="status"></div><button id="interaction" hidden></button>
    <div id="vehicle-status" hidden><span id="vehicle-label"></span><button id="dismount">Descendre · F / ○</button></div>
    <div id="sport" hidden><span id="sport-label">Jogging</span><progress id="progress" max="50" value="0"></progress></div>
    <footer><div><kbd>ZQSD</kbd> / <kbd>↑↓←→</kbd> Se déplacer <span>·</span> Glisser pour regarder</div><div>🎮 Joystick gauche : avancer <span>·</span> droit : regarder <span>·</span> <kbd>✕</kbd> Interagir <span>·</span> <kbd>□</kbd> Jogging <span>·</span> <kbd>○</kbd> Retour</div></footer>
    <div id="touch"><button data-key="arrowup" aria-label="Avancer">↑</button><div><button data-key="arrowleft" aria-label="Aller à gauche">←</button><button data-key="arrowdown" aria-label="Reculer">↓</button><button data-key="arrowright" aria-label="Aller à droite">→</button></div></div>
    <dialog id="welcome"><div class="welcome-copy"><p class="eyebrow">BIENVENUE AU BÉNIN</p><h2>Crée ton personnage.</h2><p>Choisis ton personnage et sa couleur avant de partir à la découverte de Cotonou.</p><div id="avatar-preview" class="avatar-preview"><div class="preview-head"></div><div class="preview-hair"></div><div class="preview-body"></div><div class="preview-accent"></div><div class="preview-legs"></div></div><p id="avatar-summary" class="avatar-summary">Mika · Koffi</p></div><div class="character-creator"><label>Prénom du personnage<input id="player-name" maxlength="16" value="Mika" autocomplete="off"></label><fieldset><legend>Personnage</legend><div class="avatar-options"><button type="button" data-avatar="personnage1.glb" aria-pressed="true"><span>01</span>Koffi</button><button type="button" data-avatar="perso2.glb" aria-pressed="false"><span>02</span>Awa</button><button type="button" data-avatar="go2.glb" aria-pressed="false"><span>03</span>Sessi</button></div></fieldset><fieldset><legend>Couleur du personnage</legend><div class="color-options"><button type="button" data-color="#f3b94f" aria-label="Jaune soleil" aria-pressed="true"></button><button type="button" data-color="#287b72" aria-label="Vert lagune" aria-pressed="false"></button><button type="button" data-color="#9c4058" aria-label="Bordeaux" aria-pressed="false"></button><button type="button" data-color="#365f8c" aria-label="Bleu" aria-pressed="false"></button><button type="button" data-color="#dc6e35" aria-label="Orange" aria-pressed="false"></button></div></fieldset><div class="loading-city"><span></span></div><p class="note">Ton personnage et ta progression seront sauvegardés sur cet appareil.</p><button id="begin" class="primary">Commencer la balade <span>→</span></button></div></dialog>
    <dialog id="panel"><button id="close" class="close" aria-label="Fermer">×</button><p id="panel-kicker" class="eyebrow"></p><h2 id="panel-title"></h2><div id="panel-body"></div></dialog>`;
  }
  private notifier(text:string){
    $('toast').textContent=text;$('toast').classList.add('show');clearTimeout(this.toastTimer);
    this.toastTimer=window.setTimeout(()=>$('toast').classList.remove('show'),5500);
  }
  private missionCourante(){
    const guide=guides.find(g=>!this.partie.visites.has(g.id));
    if(guide)return `Rencontrer le guide : ${guide.titre}`;
    if(!this.partie.vendeuseRencontree)return'Rencontrer Aïcha sur l’esplanade';
    if(!this.sport.termine)return'Terminer le parcours de jogging de la Corniche';
    return'Explorer librement Cotonou';
  }
  private missions(){return[
    {id:'exploration',titre:'Mémoire de Cotonou',detail:'Écouter les cinq guides',gain:600,faite:this.partie.terminee(lieux)},
    {id:'sport',titre:'Matin sportif',detail:'Terminer les 50 m de jogging',gain:300,faite:this.sport.termine},
    {id:'commerce',titre:'Rencontre locale',detail:'Acheter un produit chez Aïcha',gain:150,faite:this.partie.inventory.length>0},
    {id:'mobilite',titre:'Mobilité urbaine',detail:'Essayer le zémidjan et la voiture',gain:250,faite:this.partie.transportsUtilises.has('zemidjan')&&this.partie.transportsUtilises.has('voiture')},
  ];}
  private sauvegarder(){
    try{localStorage.setItem('cotonou-sauvegarde-v2',JSON.stringify({soldeVersion:2,partie:this.partie.serialiser(),sport:{termine:this.sport.termine},position:{x:this.monde.player.position.x,z:this.monde.player.position.z},tenue:this.tenue,corpsJoueur:this.corpsJoueur,nomJoueur:this.nomJoueur}));}catch{}
  }
  private chargerSauvegarde(){
    try{
      const brut=localStorage.getItem('cotonou-sauvegarde-v2');if(!brut)return;
      const data=JSON.parse(brut);if(data?.partie)this.partie.restaurer(data.partie);
      if(data?.soldeVersion!==2)this.partie.portefeuille.restaurer(10000);
      this.sport.termine=!!data?.sport?.termine;
      if(data?.position)this.monde.restaurerPosition(Number(data.position.x),Number(data.position.z));
      if(typeof data?.tenue==='string')this.tenue=data.tenue;
      if(['personnage1.glb','perso2.glb','go2.glb'].includes(data?.corpsJoueur))this.corpsJoueur=data.corpsJoueur;
      if(typeof data?.nomJoueur==='string'&&data.nomJoueur.trim())this.nomJoueur=data.nomJoueur.slice(0,16);
      this.appliquerApparence();
      $<HTMLButtonElement>('begin').innerHTML='Continuer la balade <span>→</span>';this.synchroniser();
    }catch{localStorage.removeItem('cotonou-sauvegarde-v2');}
  }
  private ouvrir(titre:string,kicker:string,html:string){
    this.dernierFocus=document.activeElement as HTMLElement;this.monde.keys.clear();this.voix.arreter();
    $('panel-title').textContent=titre;$('panel-kicker').textContent=kicker;$('panel-body').innerHTML=html;this.panel.showModal();
  }
  private synchroniser(){
    $('wallet').textContent=`${this.partie.balance.toLocaleString('fr-FR')} FCFA`;$('bag').textContent=`Sac · ${this.partie.inventory.length}`;
    $('map').textContent=`Carte · ${this.partie.visites.size}/5`;
    for(const zone of zones)$(`task-${zone.id}`).classList.toggle('done',zone.guides.every(g=>this.partie.visites.has(g.id)));
    const suivant=guides.find(g=>!this.partie.visites.has(g.id));
    $('next-objective').textContent=suivant?`Prochaine découverte : ${suivant.titre}.`:'Les cinq lieux sont découverts !';
    $('side-quests').textContent=`Jogging : ${this.sport.termine?'terminé':'à essayer'} · Aïcha : ${this.partie.vendeuseRencontree?'rencontrée':'à rencontrer'}`;
    $('health').textContent=`Énergie ${this.partie.securite}`;$('mission-text').textContent=this.missionCourante();this.sauvegarder();
  }
  private commandes(){
    $('close').onclick=()=>this.panel.close();
    // `close` est émis de façon différée par le navigateur. Effacer les touches ici
    // pouvait supprimer un mouvement pressé juste après la fermeture du guide.
    this.panel.addEventListener('close',()=>{this.voix.arreter();if(this.dernierFocus?.isConnected)this.dernierFocus.focus();});
    this.initialiserCreateur();
    $('begin').onclick=()=>{this.nomJoueur=$<HTMLInputElement>('player-name').value.trim().slice(0,16)||'Mika';this.appliquerApparence();this.sauvegarder();this.accueil.close();if(!localStorage.getItem('cotonou-tutoriel-vu'))$('tutorial').hidden=false;};this.accueil.addEventListener('cancel',e=>e.preventDefault());
    $('tutorial-close').onclick=()=>{$('tutorial').hidden=true;localStorage.setItem('cotonou-tutoriel-vu','1');};
    $('bag').onclick=()=>this.ouvrirSac();$('map').onclick=()=>this.ouvrirParcours();$('menu').onclick=()=>this.ouvrirMenu();
    $('interaction').onclick=()=>this.interagir();$('dismount').onclick=()=>this.descendre();
    addEventListener('keydown',e=>{
      if(this.panel.open||this.accueil.open)return;
      const key=e.key.toLowerCase();if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(key))e.preventDefault();
      this.monde.keys.add(key);if(e.repeat)return;
      if(key==='e')this.interagir();if(key===' ')this.basculerSport();if(key==='f')this.descendre();if(key==='h'&&this.partie.transport)this.ambiance.klaxonner();
      if(key==='escape'||key==='p')this.ouvrirMenu();if(key==='m')this.ouvrirParcours();if(key==='i')this.ouvrirSac();
    });
    addEventListener('keyup',e=>this.monde.keys.delete(e.key.toLowerCase()));
    addEventListener('gamepadconnected',e=>this.manette.connecter(e.gamepad));
    addEventListener('gamepaddisconnected',e=>{
      this.manette.deconnecter(e.gamepad);this.manetteId='';
      this.monde.axesManette.x=this.monde.axesManette.z=0;
      $('controller-status').hidden=true;
    });
    const pause=()=>{this.monde.keys.clear();this.voix.arreter();this.manette.arreterVibrations();};addEventListener('blur',pause);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
    document.querySelectorAll<HTMLButtonElement>('[data-key]').forEach(b=>{
      b.onpointerdown=e=>{this.monde.keys.add(b.dataset.key!);b.setPointerCapture(e.pointerId);};
      b.onpointerup=b.onpointercancel=()=>this.monde.keys.delete(b.dataset.key!);
    });
  }
  private initialiserCreateur(){
    $<HTMLInputElement>('player-name').value=this.nomJoueur;
    $('player-name').addEventListener('input',()=>{this.nomJoueur=$<HTMLInputElement>('player-name').value.trim().slice(0,16)||'Mika';this.mettreAJourCreateur();});
    document.querySelectorAll<HTMLButtonElement>('[data-avatar]').forEach(b=>b.onclick=()=>{this.corpsJoueur=b.dataset.avatar as CorpsJoueur;this.appliquerApparence();});
    document.querySelectorAll<HTMLButtonElement>('[data-color]').forEach(b=>b.onclick=()=>{this.tenue=b.dataset.color!;this.appliquerApparence();});
    this.appliquerApparence();
  }
  private appliquerApparence(){this.monde.personnaliserJoueur(this.tenue,this.corpsJoueur);this.mettreAJourCreateur();}
  private mettreAJourCreateur(){
    if(!$('avatar-preview'))return;
    const noms:Record<CorpsJoueur,string>={'personnage1.glb':'Koffi','perso2.glb':'Awa','go2.glb':'Sessi'};
    $('avatar-preview').dataset.avatar=this.corpsJoueur;
    $('avatar-preview').style.setProperty('--outfit',this.tenue);
    $('avatar-summary').textContent=`${this.nomJoueur} · ${noms[this.corpsJoueur]}`;
    document.querySelectorAll<HTMLButtonElement>('[data-avatar]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.avatar===this.corpsJoueur)));
    document.querySelectorAll<HTMLButtonElement>('[data-color]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.color===this.tenue)));
  }
  private elementsManette(dialogue:HTMLDialogElement){
    return Array.from(dialogue.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled)'))
      .filter(element=>element.getClientRects().length>0);
  }
  private naviguerManette(direction:number){
    const dialogue=this.accueil.open?this.accueil:this.panel.open?this.panel:null;if(!dialogue)return;
    const elements=this.elementsManette(dialogue);if(!elements.length)return;
    const index=elements.indexOf(document.activeElement as HTMLElement);
    elements[(index+direction+elements.length)%elements.length].focus();
  }
  private activerManette(){
    if(this.accueil.open){$<HTMLButtonElement>('begin').click();return;}
    if(!this.panel.open){this.interagir();return;}
    const actif=document.activeElement as HTMLElement;
    if(actif&&this.panel.contains(actif)&&(actif instanceof HTMLButtonElement||actif instanceof HTMLAnchorElement))actif.click();
    else this.naviguerManette(1);
  }
  private commandesManette(dt:number){
    const lecture:LectureManette|null=this.manette.lire();
    if(!lecture){this.monde.axesManette.x=this.monde.axesManette.z=0;return;}
    const signature=`${lecture.index}:${lecture.id}:${lecture.mapping}`;
    if(signature!==this.manetteId){
      this.manetteId=signature;
      $('controller-status').hidden=false;
      $('controller-status').textContent=this.manette.vibrationsDisponibles?'🎮 MANETTE · VIBRATION':'🎮 MANETTE · SANS HAPTIQUE';
      $('controller-status').title=this.manette.vibrationsDisponibles
        ?`${lecture.id} · ${lecture.mapping} · ${lecture.nombreAxes} axes · ${lecture.nombreBoutons} boutons · vibrations disponibles.`
        :`${lecture.id} · ${lecture.mapping} · ${lecture.nombreAxes} axes · ${lecture.nombreBoutons} boutons · vibrations non exposées par le navigateur.`;
      this.manette.vibrer('succes');
      if(!this.accueil.open)this.notifier(this.manette.vibrationsDisponibles
        ?'Manette connectée · vibrations actives · ✕ interagir · □ jogging · ○ retour.'
        :'Manette connectée · vibrations indisponibles dans ce navigateur.');
    }
    if(this.accueil.open||this.panel.open){
      this.monde.axesManette.x=this.monde.axesManette.z=0;
      if(lecture.appuye(12)||lecture.appuye(14)){this.manette.vibrer('selection');this.naviguerManette(-1);}
      if(lecture.appuye(13)||lecture.appuye(15)){this.manette.vibrer('selection');this.naviguerManette(1);}
      if(lecture.appuye(0)){this.manette.vibrer('interaction');this.activerManette();}
      if(lecture.appuye(1)&&this.panel.open){this.manette.vibrer('selection');this.panel.close();}
      return;
    }
    this.monde.axesManette.x=lecture.deplacementX;this.monde.axesManette.z=lecture.deplacementZ;
    this.monde.regarderManette(lecture.regardX,lecture.regardY,dt);
    const amplitude=Math.min(1,Math.hypot(lecture.deplacementX,lecture.deplacementZ));
    const roulement=this.partie.transport?.id??(this.sport.actif?'course':'marche');
    this.manette.roulement(amplitude,roulement);
    if(lecture.appuye(0))this.interagir();
    if(lecture.appuye(1))this.descendre();
    if(lecture.appuye(2))this.basculerSport();
    if(lecture.appuye(3))this.ouvrirSac();
    if(lecture.appuye(5)&&this.partie.transport)this.ambiance.klaxonner();
    if(lecture.appuye(8))this.ouvrirParcours();
    if(lecture.appuye(9))this.ouvrirMenu();
  }
  private ouvrirSac(){
    this.ouvrir('Ton sac','OBJETS ET ÉNERGIE','');const list=document.createElement('div');list.className='inventory-list';
    this.partie.inventory.forEach((item,index)=>{const ligne=document.createElement('div');ligne.innerHTML=`<span>${item}</span><button data-use="${index}">Utiliser</button>`;list.append(ligne);});
    $('panel-body').append(this.partie.inventory.length?list:Object.assign(document.createElement('p'),{textContent:'Ton sac est vide. Retrouve Aïcha au stand pour découvrir ses produits.'}));
    list.querySelectorAll<HTMLButtonElement>('[data-use]').forEach(b=>b.onclick=()=>{const message=this.partie.utiliser(Number(b.dataset.use));this.synchroniser();this.notifier(message);this.panel.close();});
  }
  private ouvrirParcours(){
    const z=this.monde.player.position.z;
    const position=Math.max(0,Math.min(100,(12-z)/368*100));
    this.ouvrir('Carte et missions','CINQ LIEUX · QUATRE ZONES',`<div class="mini-map"><span class="map-player" style="top:${position}%">●</span>${guides.map(g=>`<span class="map-stop ${this.partie.visites.has(g.id)?'done':''}" style="top:${Math.max(0,Math.min(100,(12-g.z)/368*100))}%">${g.titre}</span>`).join('')}</div><div class="route-list">${guides.map(g=>`<div><strong>${this.partie.visites.has(g.id)?'✓ ':''}${g.titre}</strong><small>${Math.round(Math.abs(g.z-z))} m de jeu · ${g.z<z?'vers le nord':'vers le sud'}</small></div>`).join('')}</div><h3>Missions et récompenses</h3><div class="missions">${this.missions().map(m=>`<div><span><strong>${m.titre}</strong><small>${m.detail} · ${m.gain} FCFA</small></span>${this.partie.recompenses.has(m.id)?'<b>Réclamée</b>':m.faite?`<button data-claim="${m.id}">Réclamer</button>`:'<em>En cours</em>'}</div>`).join('')}</div><p class="note">Les distances sont adaptées au jeu. La position ● suit le joueur.</p>${this.partie.terminee(lieux)?'<button id="summary" class="primary">Voir le bilan</button>':''}`);
    $('panel-body').querySelectorAll<HTMLButtonElement>('[data-claim]').forEach(b=>b.onclick=()=>{const mission=this.missions().find(m=>m.id===b.dataset.claim);if(mission?.faite&&this.partie.recompenser(mission.id,mission.gain)){this.manette.vibrer('succes');this.synchroniser();this.notifier(`Mission accomplie : +${mission.gain} FCFA`);this.panel.close();}});
    if($('summary'))$('summary').onclick=()=>{this.panel.close();this.bilan();};
  }
  private ouvrirMenu(){
    this.ouvrir('Pause','RÉGLAGES ET SAUVEGARDE',`<div class="settings"><label>Qualité graphique<select id="quality"><option value="normale">Normale</option><option value="basse">Basse</option><option value="haute">Haute</option></select></label><label>Météo<select id="weather-setting"><option value="auto">Dynamique</option><option value="soleil">Ciel clair</option><option value="pluie">Pluie tropicale</option></select></label><label>Heure<select id="time-setting"><option value="auto">Cycle automatique</option><option value="matin">Matin</option><option value="jour">Journée</option><option value="soir">Soirée</option></select></label><label>Volume ambiance<input id="volume-setting" type="range" min="0" max="100" value="58"></label></div><h3>${this.nomJoueur}</h3><p class="note">Tu peux changer de personnage ou de couleur pendant la partie.</p><button id="edit-character">Modifier mon personnage</button><p class="note">La progression et la position sont enregistrées automatiquement sur cet appareil.</p><button id="save-now" class="primary">Sauvegarder maintenant</button> <button id="reset-save">Nouvelle partie</button>`);
    $<HTMLSelectElement>('quality').onchange=e=>this.monde.reglerQualite((e.target as HTMLSelectElement).value as 'basse'|'normale'|'haute');
    $<HTMLSelectElement>('weather-setting').onchange=e=>this.monde.reglerMeteo((e.target as HTMLSelectElement).value as 'auto'|'soleil'|'pluie');
    $<HTMLSelectElement>('time-setting').onchange=e=>this.monde.reglerHeure((e.target as HTMLSelectElement).value as 'auto'|'matin'|'jour'|'soir');
    $<HTMLInputElement>('volume-setting').oninput=e=>this.ambiance.reglerVolume(Number((e.target as HTMLInputElement).value)/100);
    $('edit-character').onclick=()=>{this.panel.close();this.mettreAJourCreateur();this.accueil.showModal();};
    $('save-now').onclick=()=>{this.sauvegarder();this.notifier('Progression sauvegardée.');this.panel.close();};
    $('reset-save').onclick=()=>{if(confirm('Effacer la progression et recommencer ?')){localStorage.removeItem('cotonou-sauvegarde-v2');location.reload();}};
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
    this.ouvrir('Une pause chez Aïcha','VENDEUSE · CONVERSATION',`<p class="note">Conversation libre si le serveur OpenAI est configuré, réponses locales hors connexion.</p><div id="messages" role="log" aria-label="Conversation avec Aïcha" aria-live="polite"></div><form id="chat"><label for="message">Ton message</label><div class="input-row"><input id="message" maxlength="400" placeholder="Bonjour, qu’est-ce que tu vends ?" autocomplete="off" required><button class="primary" type="submit">Envoyer</button></div></form><button id="mic">Parler au micro</button><p id="mic-status" class="note" role="status">Le micro s’active seulement sur demande.</p><div class="products">${products.map(p=>`<button data-product="${p.id}"><span>${p.name}</span><strong>${p.price} FCFA</strong></button>`).join('')}</div><div id="confirmation"></div><p class="note">Tarifs fictifs du prototype.</p>`);
    if(!this.vendeuse.historique.length)this.bulle(this.vendeuse.nom,this.vendeuse.discuter('bonjour'));else this.renderHistory();
    $<HTMLFormElement>('chat').onsubmit=async e=>{
      e.preventDefault();const input=$<HTMLInputElement>('message'),text=input.value.trim();if(!text)return;
      this.bulle('Vous',text);input.value='';const bouton=$<HTMLButtonElement>('chat').querySelector('button')!;bouton.disabled=true;bouton.textContent='Aïcha réfléchit…';
      const reponse=await demanderIA(text,this.vendeuse.historique);this.bulle(this.vendeuse.nom,reponse??this.vendeuse.discuter(text));
      if(bouton.isConnected){bouton.disabled=false;bouton.textContent='Envoyer';}
    };
    $('panel-body').querySelectorAll<HTMLButtonElement>('[data-product]').forEach(button=>button.onclick=()=>{
      const p=products.find(p=>p.id===button.dataset.product)!;
      $('confirmation').innerHTML=`<p>Confirmer : ${p.name} · ${p.price} FCFA ?</p><button id="confirm-buy" class="primary">Confirmer l’achat</button> <button id="cancel-buy">Annuler</button>`;
      $('confirm-buy').onclick=()=>{const solde=this.partie.balance;const result=this.vendeuse.acheter(this.partie,p.id);this.manette.vibrer(this.partie.balance<solde?'succes':'erreur');$('confirmation').replaceChildren();this.synchroniser();this.bulle(this.vendeuse.nom,result);};
      $('cancel-buy').onclick=()=>$('confirmation').replaceChildren();
    });
    this.voix.brancherMicro($<HTMLButtonElement>('mic'),$('mic-status'),$<HTMLInputElement>('message'));
  }
  private ouvrirTransport(){
    this.ouvrir('On t’emmène ?','BORNE DE TRANSPORT',`<p>Choisis ton véhicule. Tu le diriges avec les mêmes commandes et tu peux descendre avec F. Le tarif est payé une seule fois à la montée.</p><div class="transport-options">${this.transports.map(t=>`<button data-transport="${t.id}"><strong>${t.nom}</strong><span>${t.tarif} FCFA · vitesse ×${t.vitesse/4}</span></button>`).join('')}</div><div id="ride-confirmation" role="status"></div><p class="note">Tarifs fictifs. Sans solde suffisant, tu peux continuer à pied gratuitement.</p>`);
    $('panel-body').querySelectorAll<HTMLButtonElement>('[data-transport]').forEach(b=>b.onclick=()=>{
      const transport=this.transports.find(t=>t.id===b.dataset.transport)!;
      $('ride-confirmation').innerHTML=`<p><strong>Dans quel sens pars-tu ?</strong></p><div class="direction-options"><button data-direction="etoile"><strong>Vers l’Étoile Rouge</strong><span>Amazone · Présidence · Congrès</span></button><button data-direction="corniche"><strong>Vers la Corniche</strong><span>Akpakpa · Hôtel du Lac</span></button></div><button id="cancel-ride">Annuler</button>`;
      $('cancel-ride').onclick=()=>$('ride-confirmation').replaceChildren();
      $('ride-confirmation').querySelectorAll<HTMLButtonElement>('[data-direction]').forEach(direction=>direction.onclick=()=>{
        const sens=direction.dataset.direction as 'etoile'|'corniche',destination=sens==='etoile'?'l’Étoile Rouge':'la Corniche';
        $('ride-confirmation').innerHTML=`<p>Confirmer ${transport.nom} vers ${destination} pour ${transport.tarif} FCFA ?</p><button id="confirm-ride" class="primary">Confirmer et monter</button> <button id="cancel-ride">Changer de direction</button>`;
        $('cancel-ride').onclick=()=>b.click();
        $('confirm-ride').onclick=()=>{
          if(!this.partie.monter(transport)){this.manette.vibrer('erreur');$('ride-confirmation').textContent='Solde insuffisant ou véhicule déjà actif. Tu peux continuer à pied.';return;}
          this.manette.vibrer('montee');this.sport.arreter();this.monde.engagerTransportSurVoie(transport.id,sens);this.synchroniser();this.panel.close();
          this.notifier(`${transport.nom} orienté vers ${destination} sur la bonne voie. Avance avec Z, ↑ ou le joystick gauche.`);
        };
      });
    });
  }
  private descendre(){
    if(!this.partie.transport||this.panel.open||this.accueil.open)return;
    this.manette.vibrer('descente');
    this.monde.commencerDescente(this.partie.transport.id);this.partie.descendre();this.monde.keys.clear();this.notifier('Tu continues à pied. Une nouvelle montée nécessitera un nouveau paiement.');
  }
  private interagir(){
    if(this.panel.open||this.accueil.open||!this.proche)return;
    this.manette.vibrer('interaction');
    if(this.partie.transport){this.notifier('Descends avec F pour rencontrer les personnages ou faire du sport.');return;}
    if(this.proche.type==='guide')this.afficherGuide(this.proche.guide);
    else if(this.proche.type==='vendeuse')this.parlerVendeuse();
    else if(this.proche.type==='transport')this.ouvrirTransport();
    else this.basculerSport();
  }
  private basculerSport(){
    if(this.sport.actif){this.manette.vibrer('selection');this.sport.arreter();this.notifier('Jogging arrêté. Reviens au départ pour réessayer.');return;}
    const p=this.monde.player.position;
    if(this.sport.demarrer(p.x,p.z,!!this.partie.transport)){this.manette.vibrer('succes');this.notifier('Suis la bande terracotta jusqu’à la ligne d’arrivée.');}
    else{this.manette.vibrer('erreur');this.notifier('À pied, rejoins le départ du jogging sur la bande terracotta de la Corniche.');}
  }
  private actualiser(dt:number){
    this.commandesManette(dt);
    const p=this.monde.player.position,paused=this.panel.open||this.accueil.open||document.hidden;
    const maximum=this.partie.transport?.vitesse??7;
    this.ambiance.actualiser({x:p.x,z:p.z,yaw:this.monde.angleCamera,mode:this.partie.transport?.id??null,intensite:Math.min(1,this.monde.allure/maximum),pluie:this.monde.meteoTexte==='Pluie tropicale'},paused);
    $('clock').textContent=this.monde.heureTexte;$('weather').textContent=this.monde.meteoTexte;
    this.sauvegardeTemps+=dt;if(this.sauvegardeTemps>2){this.sauvegardeTemps=0;this.sauvegarder();}
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
      if(result==='sortie'){this.manette.vibrer('erreur');this.notifier('Reste sur la bande terracotta. Reviens au départ pour réessayer.');}
      if(result==='arrivee'){this.manette.vibrer('succes');this.synchroniser();this.notifier(`Bravo ! Jogging terminé en ${Math.round(this.sport.temps)} secondes.`);}
    }
    $('sport').hidden=!this.sport.actif;$<HTMLProgressElement>('progress').value=this.sport.distance;
    $('sport-label').textContent=`Jogging · ${Math.floor(this.sport.distance)} / 50 m`;
    $('vehicle-status').hidden=!this.partie.transport||paused;
    $('vehicle-label').textContent=this.partie.transport?`${this.partie.transport.nom} · ${Math.round(this.monde.allure*7.2)} km/h · H : klaxon`:'';
    return {paused,running:this.sport.actif,transport:this.partie.transport?.id??null,speed:this.partie.transport?.vitesse??(this.sport.actif?7:4)};
  }
}
