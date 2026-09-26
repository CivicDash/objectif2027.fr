// Échelle de verdict de « Ce qu'on entend » (cadre éditorial du dossier de sourçage).
// Constantes éditoriales : elles vivent ici et non dans src/data/, que deploy.sh écrase.
import type { CodeVerdict } from '@/lib/data';

export interface DefinitionVerdict {
    libelle: string;
    /** Cran sur la jauge (1 = les données vont dans ce sens, 5 = elles le contredisent).
     *  null : hors échelle — l'absence de mesure n'est pas un degré d'accord. */
    cran: number | null;
}

export const VERDICTS: Record<CodeVerdict, DefinitionVerdict> = {
    confirme: { libelle: 'Les données vont dans ce sens', cran: 1 },
    plutot_confirme: { libelle: 'Plutôt vrai, avec réserves', cran: 2 },
    nuance: { libelle: "Vrai ou faux selon ce qu'on mesure", cran: 3 },
    plutot_infirme: { libelle: 'Plutôt faux', cran: 4 },
    infirme: { libelle: "Les données contredisent l'affirmation", cran: 5 },
    inverifiable: { libelle: "Aucune mesure fiable n'existe", cran: null },
};

export const CATEGORIES_SOURCE: Record<string, string> = {
    producteur_public: 'producteur public',
    organisation_internationale: 'organisation internationale',
    recherche: 'institut de recherche',
    presse: 'presse, en recoupement',
    acteur_identifie: "estimation d'un acteur identifié",
};
