import { buy, reply, type State } from '../game.ts';

export class Portefeuille {
  private solde = 10000;
  get balance() { return this.solde; }
  payer(montant: number): boolean {
    if (!Number.isSafeInteger(montant) || montant <= 0 || montant > this.solde) return false;
    this.solde -= montant;
    return true;
  }
  crediter(montant:number){if(Number.isSafeInteger(montant)&&montant>0)this.solde+=montant;}
  restaurer(montant:number){if(Number.isSafeInteger(montant)&&montant>=0)this.solde=montant;}
}

export abstract class Transport {
  abstract readonly id: 'zemidjan' | 'voiture';
  abstract readonly nom: string;
  abstract readonly tarif: number;
  abstract readonly vitesse: number;
}
export class Zemidjan extends Transport {
  readonly id = 'zemidjan'; readonly nom = 'Zémidjan'; readonly tarif = 200; readonly vitesse = 12;
}
export class Voiture extends Transport {
  readonly id = 'voiture'; readonly nom = 'Voiture'; readonly tarif = 500; readonly vitesse = 18;
}

export class Partie {
  readonly portefeuille = new Portefeuille();
  readonly inventaire: string[] = [];
  readonly visites = new Set<string>();
  transport: Transport | null = null;
  vendeuseRencontree = false;
  finAnnoncee = false;
  securite = 100;
  accidents = 0;
  readonly transportsUtilises = new Set<string>();
  readonly recompenses = new Set<string>();
  /** Souvenirs, cartes et anecdotes gagnés pendant les défis urbains. */
  readonly souvenirs = new Set<string>();
  readonly photos = new Set<string>();
  readonly quizReussis = new Set<string>();
  readonly defisTermines = new Set<string>();
  readonly debloques = new Set<string>();
  readonly defis = new Map<string, number>();
  get balance() { return this.portefeuille.balance; }
  get inventory() { return this.inventaire; }
  monter(transport: Transport): boolean {
    if (this.transport || !this.portefeuille.payer(transport.tarif)) return false;
    this.transport = transport; this.transportsUtilises.add(transport.id);
    return true;
  }
  descendre() { this.transport = null; }
  visiter(id: string) { this.visites.add(id); }
  terminee(ids: readonly string[]) { return ids.every(id => this.visites.has(id)); }
  utiliser(index:number){
    const objet=this.inventaire[index];if(!objet)return 'Objet indisponible.';
    if(objet==='Eau fraîche'){this.securite=Math.min(100,this.securite+15);this.inventaire.splice(index,1);return 'Tu bois l’eau fraîche et récupères 15 points d’énergie.';}
    if(objet==='Ananas découpé'){this.securite=Math.min(100,this.securite+25);this.inventaire.splice(index,1);return 'L’ananas te redonne 25 points d’énergie.';}
    if(objet==='Arachides grillées'){this.securite=Math.min(100,this.securite+10);this.inventaire.splice(index,1);return 'Les arachides te redonnent 10 points d’énergie.';}
    return 'Cet objet se conserve dans ton sac.';
  }
  signalerAccident(){this.accidents++;this.securite=Math.max(0,this.securite-25);this.portefeuille.payer(Math.min(100,this.balance));}
  recompenser(id:string,montant:number){
    if(this.recompenses.has(id))return false;
    this.recompenses.add(id);this.portefeuille.crediter(montant);return true;
  }
  demarrerDefi(id:string,duree:number){
    if(this.defisTermines.has(id)||this.defis.has(id)||!Number.isFinite(duree))return false;
    this.defis.set(id,duree);return true;
  }
  avancerDefis(dt:number){
    for(const [id,temps] of this.defis){
      const restant=Math.max(0,temps-dt);this.defis.set(id,restant);
      if(!restant)this.defis.delete(id);
    }
  }
  terminerDefi(id:string){if(!this.defis.has(id)&&!this.defisTermines.has(id))return false;this.defis.delete(id);this.defisTermines.add(id);return true;}
  debloquer(id:string){this.debloques.add(id);}
  restaurer(data:SauvegardePartie){
    this.portefeuille.restaurer(data.balance);
    this.inventaire.splice(0,this.inventaire.length,...data.inventory.slice(0,50));
    this.visites.clear();for(const id of data.visites)this.visites.add(id);
    this.vendeuseRencontree=!!data.vendeuseRencontree;this.finAnnoncee=!!data.finAnnoncee;
    this.securite=Math.max(0,Math.min(100,data.securite??100));this.accidents=Math.max(0,data.accidents??0);
    this.transportsUtilises.clear();for(const id of data.transportsUtilises??[])this.transportsUtilises.add(id);
    this.recompenses.clear();for(const id of data.recompenses??[])this.recompenses.add(id);
    this.souvenirs.clear();for(const id of data.souvenirs??[])this.souvenirs.add(id);
    this.photos.clear();for(const id of data.photos??[])this.photos.add(id);
    this.quizReussis.clear();for(const id of data.quizReussis??[])this.quizReussis.add(id);
    this.defisTermines.clear();for(const id of data.defisTermines??[])this.defisTermines.add(id);
    this.debloques.clear();for(const id of data.debloques??[])this.debloques.add(id);
    this.defis.clear();for(const [id,temps] of data.defis??[])if(Number.isFinite(temps)&&temps>0)this.defis.set(id,temps);
  }
  serialiser():SauvegardePartie{return {balance:this.balance,inventory:[...this.inventory],visites:[...this.visites],
    vendeuseRencontree:this.vendeuseRencontree,finAnnoncee:this.finAnnoncee,securite:this.securite,accidents:this.accidents,
    transportsUtilises:[...this.transportsUtilises],recompenses:[...this.recompenses],souvenirs:[...this.souvenirs],photos:[...this.photos],
    quizReussis:[...this.quizReussis],defisTermines:[...this.defisTermines],debloques:[...this.debloques],defis:[...this.defis]};}
}

export type SauvegardePartie={balance:number;inventory:string[];visites:string[];vendeuseRencontree:boolean;
  finAnnoncee:boolean;securite?:number;accidents?:number;transportsUtilises?:string[];recompenses?:string[];
  souvenirs?:string[];photos?:string[];quizReussis?:string[];defisTermines?:string[];debloques?:string[];defis?:[string,number][]};

export class Vendeuse {
  readonly nom = 'Aïcha';
  readonly historique: {who: string; text: string}[] = [];
  discuter(message: string) { return reply(message); }
  acheter(partie: Partie, id: string) {
    const achat: State = {balance: partie.balance, inventory: []};
    const resultat = buy(achat, id);
    if (achat.inventory.length && partie.portefeuille.payer(partie.balance - achat.balance)) {
      partie.inventaire.push(...achat.inventory);
    }
    return resultat;
  }
}

export class SportJogging {
  actif = false;
  termine = false;
  distance = 0;
  temps = 0;
  demarrer(x: number, z: number, enVehicule: boolean) {
    if (enVehicule || x <= 5 || Math.abs(z - 8) >= 5) return false;
    this.actif = true; this.distance = 0; this.temps = 0;
    return true;
  }
  arreter() { this.actif = false; }
  avancer(x: number, z: number, dt: number): 'course' | 'sortie' | 'arrivee' | null {
    if (!this.actif) return null;
    this.temps += dt;
    this.distance = Math.min(50, Math.max(0, 8 - z));
    if (x < 4.8) { this.actif = false; return 'sortie'; }
    if (z <= -42) { this.actif = false; this.termine = true; return 'arrivee'; }
    return 'course';
  }
}

/**
 * Pari du zémidjan : rejoindre l'Étoile Rouge en course contre la montre, une
 * fois par montée. Le chrono court dès la confirmation du tarif ; l'arrivée
 * dans la zone de l'Étoile Rouge paie le gain selon la vitesse tenue. Descendre
 * ou un accident met fin au pari sans récompense — le risque fait la saveur.
 */
export class CourseTransport {
  actif = false;
  temps = 0;
  /** Record personnel : le meilleur temps jamais signé, sauvegardé avec la partie. */
  record: number | null = null;
  /** Limite douce : la gagner reste possible, la battre est la fierté. */
  readonly cible = 75;
  static readonly ARRIVEE = -338;
  commencer(enVehicule: boolean, direction:'etoile'|'corniche') {
    this.actif = enVehicule && direction === 'etoile';
    this.temps = 0;
    return this.actif;
  }
  arreter(gagne: boolean) {
    const finit = this.actif; this.actif = false;
    if (finit && gagne && (this.record === null || this.temps < this.record)) this.record = this.temps;
    return finit;
  }
  avancer(dt:number, z:number):'course'|'arrivee'|null{
    if(!this.actif)return null;
    this.temps+=dt;
    // L'arrivée est signalée sans couper l'état : seul `arreter` finalise,
    // sinon le record ne s'écrirait jamais.
    // Ligne d'arrivée à l'entrée sud du giratoire de l'Étoile Rouge. Elle était
    // à z=-430, au-delà de la limite du monde (-407) : impossible à franchir.
    if(z<=CourseTransport.ARRIVEE)return'arrivee';
    return'course';
  }
  /** Récompense dégressive avec le temps : vite parti, bien payé. */
  gain(){return Math.max(120,Math.round(420-this.temps*3));}
}

/**
 * Chasse au trésor des Amazones : les trésors se cherchent dans l'ordre. Chacun
 * se ramasse sur place puis se rapporte au pied de l'Amazone, où une question
 * le valide. Les points récompensent la réponse et la rapidité.
 */
export class ChasseTresor {
  actif = false;
  /** Index du trésor en cours, dans l'ordre de la liste. */
  etape = 0;
  /** Trésor ramassé et pas encore déposé. */
  porte = false;
  points = 0;
  /** Temps passé sur l'étape en cours : il décide du bonus de vitesse. */
  temps = 0;
  record: number | null = null;
  readonly livres = new Set<string>();
  readonly total: number;
  // Pas de propriété de paramètre : les tests lisent le TypeScript sans compilation.
  constructor(total: number) { this.total = total; }
  get termine() { return this.livres.size >= this.total; }
  demarrer() {
    if (this.actif) return false;
    this.actif = true; this.etape = 0; this.porte = false; this.points = 0; this.temps = 0; this.livres.clear();
    return true;
  }
  arreter() { this.actif = false; this.porte = false; }
  avancer(dt: number) { if (this.actif && Number.isFinite(dt) && dt > 0) this.temps += dt; }
  /** Ramasse le trésor de l'étape en cours. */
  ramasser() {
    if (!this.actif || this.porte || this.termine) return false;
    this.porte = true; return true;
  }
  /**
   * Dépose le trésor porté au pied de l'Amazone. Bonne réponse : 100 points et
   * un bonus de vitesse jusqu'à 100, dégressif sur quatre minutes. Mauvaise
   * réponse : 40 points, le trésor compte tout de même.
   */
  deposer(id: string, bonneReponse: boolean) {
    if (!this.actif || !this.porte || this.livres.has(id)) return 0;
    const gain = bonneReponse ? 100 + Math.max(0, Math.round(100 - this.temps / 2.4)) : 40;
    this.points += gain; this.livres.add(id); this.porte = false; this.etape++; this.temps = 0;
    if (this.termine) { this.actif = false; if (this.record === null || this.points > this.record) this.record = this.points; }
    return gain;
  }
  serialiser() { return {actif: this.actif, etape: this.etape, porte: this.porte, points: this.points, record: this.record, livres: [...this.livres]}; }
  restaurer(d: {actif?: boolean; etape?: number; porte?: boolean; points?: number; record?: number | null; livres?: string[]} | undefined) {
    if (!d) return;
    this.livres.clear(); for (const id of d.livres ?? []) this.livres.add(id);
    this.etape = Math.max(0, Math.min(this.total, Number(d.etape) || 0));
    this.points = Math.max(0, Number(d.points) || 0);
    this.record = typeof d.record === 'number' ? d.record : null;
    this.actif = !!d.actif && !this.termine; this.porte = this.actif && !!d.porte; this.temps = 0;
  }
}
