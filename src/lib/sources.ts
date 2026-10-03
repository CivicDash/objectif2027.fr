// Catégories de source des repères chiffrés, dans l'ordre de la hiérarchie éditoriale.
// Constantes éditoriales : elles vivent ici et non dans src/data/, que deploy.sh écrase.
export const CATEGORIES_SOURCE: Record<string, string> = {
    producteur_public: 'producteur public',
    organisation_internationale: 'organisation internationale',
    recherche: 'institut de recherche',
    presse: 'presse, en recoupement',
    acteur_identifie: "estimation d'un acteur identifié",
};
