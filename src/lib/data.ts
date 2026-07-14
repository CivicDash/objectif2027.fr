// Couche d'accès aux données d'export (JSON statiques générés par democratie).
import meta from '@/data/meta.json';
import themes from '@/data/themes.json';
import candidatsIndex from '@/data/candidats.json';
import comparateur from '@/data/comparateur.json';

export type EtatTheme = 'publie' | 'relevee' | 'en_traitement' | 'non_exprime';

export interface Theme {
    slug: string;
    nom: string;
    icone: string | null;
    description: string | null;
    ordre: number;
}

export interface Photo {
    url: string | null;
    credit: string;
    licence: string;
}

export interface CandidatIndex {
    slug: string;
    nom_complet: string;
    slogan?: string | null;
    photo?: Photo | null;
    parti_soutien: string | null;
    nuance: string | null;
    couleur_hex: string | null;
    statut_candidature: string;
    couverture: { themes_publies: number; themes_exprimes: number; themes_total: number };
}

// Chargement des fiches candidat détaillées (un fichier par candidat).
const fiches = import.meta.glob<{ default: any }>('@/data/candidats/*.json', { eager: true });

export const CANDIDATS_DETAIL: Record<string, any> = Object.fromEntries(
    Object.values(fiches).map((m) => [m.default.slug, m.default]),
);

export const META = meta;
export const THEMES = themes as Theme[];
// Enrichit l'index avec le slogan issu des fiches détaillées (évite de regénérer l'export).
export const CANDIDATS: CandidatIndex[] = (candidatsIndex as CandidatIndex[]).map((c) => ({
    ...c,
    slogan: CANDIDATS_DETAIL[c.slug]?.slogan ?? null,
    photo: CANDIDATS_DETAIL[c.slug]?.photo ?? null,
}));
export const COMPARATEUR = comparateur as Record<string, Record<string, any[]>>;

const LIBELLE_PARRAINAGES: Record<string, { texte: string; ton: 'ambre' | 'vert' }> = {
    parrainages_valides: { texte: '500 parrainages validés', ton: 'vert' },
};
export function badgeParrainages(statut: string): { texte: string; ton: 'ambre' | 'vert' } {
    return LIBELLE_PARRAINAGES[statut] ?? { texte: 'Parrainages : en cours', ton: 'ambre' };
}

export function getCandidat(slug: string) {
    return CANDIDATS_DETAIL[slug] ?? null;
}

export function themeParSlug(slug: string): Theme | undefined {
    return THEMES.find((t) => t.slug === slug);
}

const LIBELLE_ETAT: Record<EtatTheme, string> = {
    publie: 'Mesures publiées',
    en_traitement: "S'est exprimé — en cours de traitement",
    non_exprime: "Ne s'est pas exprimé sur ce thème",
};

export function libelleEtat(etat: EtatTheme): string {
    return LIBELLE_ETAT[etat];
}

// Ordre d'affichage neutre : alphabétique par nom (jamais éditorial).
export function candidatsOrdreNeutre(): CandidatIndex[] {
    return [...CANDIDATS].sort((a, b) => a.nom_complet.localeCompare(b.nom_complet, 'fr'));
}
