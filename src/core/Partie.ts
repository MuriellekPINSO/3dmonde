import { buy, reply, type State } from '../game.ts';

export class Portefeuille {
  private solde = 1500;
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
  restaurer(data:SauvegardePartie){
    this.portefeuille.restaurer(data.balance);
    this.inventaire.splice(0,this.inventaire.length,...data.inventory.slice(0,50));
    this.visites.clear();for(const id of data.visites)this.visites.add(id);
    this.vendeuseRencontree=!!data.vendeuseRencontree;this.finAnnoncee=!!data.finAnnoncee;
    this.securite=Math.max(0,Math.min(100,data.securite??100));this.accidents=Math.max(0,data.accidents??0);
    this.transportsUtilises.clear();for(const id of data.transportsUtilises??[])this.transportsUtilises.add(id);
    this.recompenses.clear();for(const id of data.recompenses??[])this.recompenses.add(id);
  }
  serialiser():SauvegardePartie{return {balance:this.balance,inventory:[...this.inventory],visites:[...this.visites],
    vendeuseRencontree:this.vendeuseRencontree,finAnnoncee:this.finAnnoncee,securite:this.securite,accidents:this.accidents,
    transportsUtilises:[...this.transportsUtilises],recompenses:[...this.recompenses]};}
}

export type SauvegardePartie={balance:number;inventory:string[];visites:string[];vendeuseRencontree:boolean;
  finAnnoncee:boolean;securite?:number;accidents?:number;transportsUtilises?:string[];recompenses?:string[]};

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
