export class Guide {
  readonly id: string; readonly titre: string; readonly texte: string;
  readonly x: number; readonly z: number; readonly source?: string;
  constructor(id: string, titre: string, texte: string, x: number, z: number, source?: string) {
    Object.assign(this, {id, titre, texte, x, z, source});
    this.id=id; this.titre=titre; this.texte=texte; this.x=x; this.z=z; this.source=source;
  }
  estProche(x: number, z: number) { return Math.hypot(x-this.x, z-this.z) < 3.8; }
}
export class Zone {
  readonly id: string; readonly nom: string; readonly sousTitre: string; readonly debut: number; readonly guides: Guide[];
  constructor(id: string, nom: string, sousTitre: string, debut: number, guides: Guide[]) {
    this.id=id; this.nom=nom; this.sousTitre=sousTitre; this.debut=debut; this.guides=guides;
  }
}
export const zones = [
  new Zone('corniche', 'La Corniche', 'Au bord de l’eau, Cotonou s’éveille.', 30, [
    new Guide('corniche', 'Au fil de la Corniche', 'Bienvenue sur la Corniche Est, à Akpakpa, près de l’Hôtel du Lac. Cet aménagement du bord de mer réunit une chaussée à deux voies, des accotements pour les deux-roues, un large trottoir et une piste réservée à la mise en forme. C’est cette piste, la bande terracotta, qui sert de parcours de jogging. Observe la plage ouverte, les jeunes palmiers, le chemin au bord de l’eau et les lampadaires solaires, puis continue vers l’Esplanade de l’Amazone. Les distances du jeu sont raccourcies.', -3, 4, 'https://beninrevele.bj/article/216/la-realisation-corniche-cotonou-avance-grands-coups-pioche/'),
  ]),
  new Zone('amazone', 'L’Esplanade', 'L’Amazone & la Présidence.', -90, [
    new Guide('amazone', 'La statue de l’Amazone', 'Le monument de l’Amazone rend hommage aux guerrières du Danxomè. Haut de trente mètres, c’est une structure métallique recouverte de bronze, d’environ cent cinquante tonnes, œuvre du sculpteur Li Xiangqun, inaugurée le 30 juillet 2022. La guerrière tient un fusil dressé d’une main et un sabre de l’autre, la tête relevée. Elle se dresse sur l’esplanade des Amazones, entre le boulevard de la Marina et l’Atlantique, face à la Présidence. Sa silhouette de jeu est stylisée, sans reproduire le modelé de la sculpture.', -3, -116, 'https://fr.wikipedia.org/wiki/Monument_Amazone'),
    new Guide('presidence', 'Le Palais de la Marina', 'Le Palais de la Marina est la résidence officielle du président de la République du Bénin. Il borde le boulevard de la Marina, face à l’océan et à l’esplanade des Amazones. Notre balade réunit ces deux lieux dans une seule zone. Le parcours évoque aussi les jardins très entretenus, les grands carrefours et la Cité ministérielle aux façades horizontales qui composent ce secteur institutionnel. Retrouve ensuite Aïcha au stand, puis poursuis vers le Palais des Congrès.', 3, -145, 'https://presidence.bj/palais/'),
  ]),
  new Zone('congres', 'Palais des Congrès', 'Une escale culturelle.', -210, [
    new Guide('congres', 'Le Palais des Congrès', 'Le Palais des Congrès de Cotonou accueille conférences, colloques et spectacles. Inauguré en août 2003, fruit de la coopération sino-béninoise, il déploie environ dix mille mètres carrés et treize salles sur deux niveaux, dont une grande salle de mille deux cents places. Son architecture s’inspire des tata somba : regarde ces deux tambours évasés vers le haut, coiffés d’une toiture ovale percée d’un large oculus. La dernière étape de la balade est la place de l’Étoile Rouge.', -3, -236, 'https://fr.wikipedia.org/wiki/Palais_des_congr%C3%A8s_de_Cotonou'),
  ]),
  new Zone('etoile', 'L’Étoile Rouge', 'La ville se croise ici.', -330, [
    new Guide('etoile', 'La place de l’Étoile Rouge', 'Voici l’Étoile Rouge, grand carrefour où se rejoignent cinq voies. Au centre d’un cercle, une étoile à cinq branches peinte en rouge porte un pylône effilé à bandeaux de brique. À son sommet, la statue d’un homme brandit une houe, un fusil à l’épaule et un fagot de bois à la main : l’agriculture, le service militaire et l’énergie domestique. Le monument a été construit au milieu des années 1970 par des ingénieurs soviétiques, sous Mathieu Kérékou, pendant la période marxiste-léniniste. Tu es au bout de notre parcours : découvre les cinq lieux pour compléter ton carnet de balade.', -3, -356, 'https://fr.wikipedia.org/wiki/Place_de_l%27%C3%89toile_rouge'),
  ]),
];
export const guides = zones.flatMap(zone => zone.guides);
export const lieux = guides.map(guide => guide.id);
export const zoneActuelle = (z: number) => [...zones].reverse().find(zone => z <= zone.debut) ?? zones[0];
export const stations = [-24, -168, -266, -382];
export const etals = [-9, -130];
