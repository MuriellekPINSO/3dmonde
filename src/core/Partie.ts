import { buy, reply, type State } from '../game.ts';

export class Portefeuille {
  private solde = 1500;
  get balance() { return this.solde; }
  payer(montant: number): boolean {
    if (!Number.isSafeInteger(montant) || montant <= 0 || montant > this.solde) return false;
    this.solde -= montant;
    return true;
  }
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
  get balance() { return this.portefeuille.balance; }
  get inventory() { return this.inventaire; }
  monter(transport: Transport): boolean {
    if (this.transport || !this.portefeuille.payer(transport.tarif)) return false;
    this.transport = transport;
    return true;
  }
  descendre() { this.transport = null; }
  visiter(id: string) { this.visites.add(id); }
  terminee(ids: readonly string[]) { return ids.every(id => this.visites.has(id)); }
}

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
