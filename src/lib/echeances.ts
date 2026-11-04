// Dates des scrutins — constante éditoriale, pas du contenu vérifié en base.
// Vit dans src/lib/ et non src/data/, que deploy.sh écrase à chaque rebuild.
// Une seule source pour le hero de l'accueil et pour les jalons de la frise :
// la duplication en dur serait une bombe à retardement le jour du décret.
export interface Echeance { date: string; label: string; note?: string }

export const ECHEANCES: Echeance[] = [
    { date: '2027-04-18', label: '1er tour' },
    { date: '2027-05-02', label: '2nd tour' },
];

export const NOTE_ECHEANCES = 'Dates annoncées, sous réserve du décret de convocation.';
