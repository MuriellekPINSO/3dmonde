/**
 * Chasse au trésor des Amazones : cinq objets cachés dans la ville, un par
 * lieu, à retrouver grâce à une énigme puis à rapporter au pied de la statue
 * de l'Amazone, où une question sur le lieu attend le joueur.
 *
 * Les énigmes décrivent ce que l'on voit réellement sur place (photos et
 * vidéos du dossier espace) : le joueur apprend à regarder la ville.
 */
export type Forme = 'cauri' | 'pagne' | 'masque' | 'calebasse' | 'houe';

export type Tresor = {
  id: string;
  nom: string;
  forme: Forme;
  lieu: string;
  x: number;
  z: number;
  enigme: string;
  /** Indice plus direct, offert au bout d'une minute de recherche. */
  indice: string;
  question: string;
  /** La première réponse est la bonne ; l'ordre est mélangé à l'affichage. */
  reponses: [string, string, string];
  anecdote: string;
};

export const TRESORS: Tresor[] = [
  {
    id: 'cauri', nom: 'Cauri sacré', forme: 'cauri', lieu: 'Plage ouverte de la Corniche', x: -20.6, z: 72,
    enigme: "Là où l'Atlantique roule ses vagues sur le sable, entre les jeunes cocotiers et le chemin pavé du bord de mer, un petit coquillage blanc attend. Autrefois, on payait avec lui.",
    indice: 'Descends vers la plage ouverte, au début de la Corniche, sur le chemin pavé le plus proche des vagues.',
    question: 'À quoi servait le cauri au royaume du Danxomè ?',
    reponses: ['De monnaie', 'De pointe de flèche', 'De tuile de toit'],
    anecdote: "Le cauri, coquillage venu de l'océan Indien, a longtemps servi de monnaie dans le golfe du Bénin.",
  },
  {
    id: 'pagne', nom: 'Pagne des peintres', forme: 'pagne', lieu: 'Fresque du port', x: 22.4, z: -70,
    enigme: "Sur un long mur de la Corniche, des peintres ont raconté la ville en couleurs : un pêcheur au chapeau, des voiliers, des danseuses sous un grand soleil. Au pied de ce mur, un pagne est plié.",
    indice: 'Traverse le boulevard après STELLA MARIS : cherche sur le trottoir, le long du mur peint.',
    question: 'Que cache le long mur peint de la Corniche ?',
    reponses: ['Le port de Cotonou', 'Le marché Dantokpa', "L'aéroport"],
    anecdote: "Derrière la fresque s'étend le port autonome de Cotonou, dont on aperçoit les grues au-dessus du mur.",
  },
  {
    id: 'masque', nom: 'Masque guèlèdè', forme: 'masque', lieu: 'Palais des Congrès', x: -6.4, z: -249,
    enigme: "Trois tambours blancs regardent le ciel par un œil doré, et leurs murs portent une frise de triangles sombres. Devant leur chapiteau blanc, au bord de la promenade, un masque veille.",
    indice: 'Le masque attend sur la promenade, face au chapiteau du Palais des Congrès.',
    question: "De quelles maisons traditionnelles s'inspire l'architecture du Palais des Congrès ?",
    reponses: ['Des tata somba', 'Des cases obus', 'Des maisons sur pilotis de Ganvié'],
    anecdote: "Les tata somba sont les maisons-forteresses à tourelles des Batammariba, dans l'Atacora, au nord-ouest du Bénin.",
  },
  {
    id: 'calebasse', nom: 'Calebasse de Ganhi', forme: 'calebasse', lieu: 'Quartier des marchés', x: -6.2, z: -297,
    enigme: "Une halle de briques rouges à arcades, coiffée d'une toiture blanche en éventail ; plus loin, de grands hangars de tôle. C'est ici que les marchandes rangent leurs calebasses.",
    indice: 'Sur la promenade, face à la halle de briques rouges du marché, entre le Congrès et l’Étoile Rouge.',
    question: "Comment s'appelle le grand marché de Cotonou, l'un des plus grands d'Afrique de l'Ouest ?",
    reponses: ['Dantokpa', 'Ganvié', 'Ouidah'],
    anecdote: 'Dantokpa, « Tokpa » pour les Cotonois, s’étend au bord de la lagune sur une vingtaine d’hectares.',
  },
  {
    id: 'houe', nom: 'Houe de bronze', forme: 'houe', lieu: "Place de l'Étoile Rouge", x: 21.8, z: -360.5,
    enigme: "Au milieu du grand rond-point, deux étoiles rouges entourent une flèche blanche. Tout en haut, un homme de bronze brandit l'outil du cultivateur. Son double t'attend sur l'île.",
    indice: "Traverse l'anneau de l'Étoile Rouge par un passage piéton et monte sur l'île, côté boulevard.",
    question: "Que brandit l'homme de bronze au sommet de l'Étoile Rouge ?",
    reponses: ['Une houe', 'Un sabre', 'Un tambour'],
    anecdote: "La houe, le fusil et le fagot de la statue célèbrent l'agriculture, la défense et l'énergie domestique.",
  },
];

/** Offrande au pied de la statue : devant la plaque, face au boulevard. */
export const AUTEL_AMAZONE = {x: -19, z: -114.8};
