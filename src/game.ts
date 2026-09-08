export const products = [
  { id: 'eau', name: 'Eau fraîche', price: 200 },
  { id: 'ananas', name: 'Ananas découpé', price: 300 },
  { id: 'arachides', name: 'Arachides grillées', price: 100 },
] as const;
export type State = { balance: number; inventory: string[] };
export function buy(state: State, id: string): string {
  const product = products.find(p => p.id === id);
  if (!product) return 'Produit inconnu.';
  if (state.balance < product.price) return 'Tu n’as pas assez de FCFA pour cet achat.';
  state.balance -= product.price;
  state.inventory.push(product.name);
  return `Merci ! ${product.name} a été ajouté à ton sac.`;
}
export function reply(input: string): string {
  const text = input.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/prix|combien|cout|vend|produit|acheter|eau|ananas|arachide/.test(text)) return 'Je propose de l’eau fraîche à 200 FCFA, de l’ananas découpé à 300 FCFA et des arachides à 100 FCFA. Choisis un produit ci-dessous pour confirmer ton achat.';
  if (/corniche|lieu|endroit|visiter|cotonou/.test(text)) return 'Bienvenue sur notre Corniche ! Promène-toi au bord de l’eau et retrouve le guide près du panneau vert. Cette scène est une interprétation simplifiée du lieu.';
  if (/bonjour|salut|bonsoir|coucou/.test(text)) return 'Bonjour ! Moi, c’est Aïcha. Une petite pause pendant ta balade ? Tu peux me demander mes produits ou parler de la Corniche.';
  if (/merci|revoir/.test(text)) return 'Avec plaisir ! Bonne balade et à bientôt.';
  if (/nom|appelle|qui es/.test(text)) return 'Je m’appelle Aïcha, la vendeuse de ce prototype. Qu’est-ce qui te ferait plaisir ?';
  return 'Je n’ai pas compris. Pour cette première version, je peux parler de mes produits, de leurs prix et de la Corniche. Tu peux reformuler ?';
}
