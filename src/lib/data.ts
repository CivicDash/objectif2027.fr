// Couche d'accès aux données d'export (JSON statiques générés par democratie).
import meta from '@/data/meta.json';
import themes from '@/data/themes.json';
import candidatsIndex from '@/data/candidats.json';
import comparateur from '@/data/comparateur.json';
import controverses from '@/data/controverses.json';

// Chargement tolérant : un import statique ferait échouer le build si le back-office
// n'a pas encore livré le fichier — et deploy.sh figerait alors le site entier.
const _cal = import.meta.glob<{ default: any }>('@/data/calendrier.json', { eager: true });

export interface Controverse {
    titre: string;
    theme: string | null;
    note_methodologique: string | null;
    ordre?: number;
    /** Volume du travail en cours, jamais son contenu. Null sous 2 candidats. */
    chantier?: { candidats: number; mesures: number } | null;
}

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

// ---------------------------------------------------------------------------
// Controverses : une question qui structure un désaccord, et la note qui
// explique POURQUOI les deux camps peuvent citer des données exactes. Chaque
// argument y renvoie par son slug. Sans cette note, l'argumentaire pour/contre
// se lit comme un match à points, ce qu'il n'est pas.
// ---------------------------------------------------------------------------
export const CONTROVERSES = controverses as Record<string, Controverse>;

export function controverseParSlug(slug: string | null | undefined): Controverse | null {
    return slug ? (CONTROVERSES[slug] ?? null) : null;
}

/** Controverses rattachées à un thème, dans l'ordre alphabétique de leur titre. */
export function controversesDuTheme(themeSlug: string): (Controverse & { slug: string })[] {
    return Object.entries(CONTROVERSES)
        .filter(([, c]) => c.theme === themeSlug)
        .map(([slug, c]) => ({ ...c, slug }))
        .sort((a, b) => a.titre.localeCompare(b.titre, 'fr'));
}

// ---------------------------------------------------------------------------
// Questions clés — navigation inverse : partir de la question, remonter aux
// candidats. Ce lien n'existe QUE par la chaîne mesure → liaison → argument →
// controverse : il faut traverser les fiches candidat. L'index est construit
// une seule fois par build et partagé par les deux pages.
// ---------------------------------------------------------------------------

export interface SourceArg {
    type: string; titre: string | null; url: string | null; media: string | null;
    archive_url: string | null; fiabilite: string;
    auteur?: string | null; date?: string | null; extrait?: string | null;
}
export interface ArgumentExporte {
    ref: string; titre: string; contenu: string; type: string;
    note_contextuelle: string | null; controverse: string | null; sources: SourceArg[];
}
export interface MesurePositionnee {
    theme: string; titre: string; source_url: string | null;
    /** arguments RESTREINTS à la question courante — sinon on mêle deux débats */
    arguments: { pour: ArgumentExporte[]; contre: ArgumentExporte[] };
}
export interface PositionCandidat {
    slug: string; nom_complet: string; couleur_hex: string | null;
    mesures: MesurePositionnee[];
}
export interface UsageFait {
    candidat_slug: string; candidat_nom: string; mesure: string;
    sens: 'pour' | 'contre'; note_contextuelle: string | null;
}
export interface FaitVerse extends ArgumentExporte {
    usages: UsageFait[];
    /** invoqué dans les deux sens selon la mesure : le modèle rendu visible */
    reversible: boolean;
}
export interface EtudeLiee {
    url: string; titre: string; media: string | null; type: string;
    fiabilite: string; archive_url: string | null;
    auteur: string | null; date: string | null; extrait: string | null;
    faits: string[];
}
export interface QuestionCle {
    slug: string; titre: string; theme: string | null;
    note_methodologique: string | null;
    positions: PositionCandidat[];
    faits: FaitVerse[];
    etudes: EtudeLiee[];
    chantier: { candidats: number; mesures: number } | null;
}

const RANG_FIABILITE: Record<string, number> = { haute: 0, moyenne: 1, basse: 2 };

function construireIndexQuestions(): Map<string, QuestionCle> {
    const index = new Map<string, QuestionCle>();
    for (const [slug, c] of Object.entries(CONTROVERSES)) {
        index.set(slug, {
            slug, titre: c.titre, theme: c.theme,
            note_methodologique: c.note_methodologique,
            positions: [], faits: [], etudes: [],
            chantier: c.chantier ?? null,
        });
    }

    for (const cand of candidatsOrdreNeutre().map((c) => CANDIDATS_DETAIL[c.slug]).filter(Boolean)) {
        const parQuestion = new Map<string, MesurePositionnee[]>();

        for (const [theme, mesures] of Object.entries((cand as any).mesures_par_theme ?? {})) {
            for (const m of (mesures as any[]) ?? []) {
                // Une mesure peut porter des faits de PLUSIEURS questions : on éclate par
                // question avant de rendre le face-à-face, sinon l'argumentaire d'une
                // mesure afficherait des faits relevant d'un autre débat.
                const parQ = new Map<string, { pour: ArgumentExporte[]; contre: ArgumentExporte[] }>();
                for (const sens of ['pour', 'contre'] as const) {
                    for (const a of ((m.arguments?.[sens] ?? []) as ArgumentExporte[])) {
                        if (!a.controverse || !index.has(a.controverse)) continue;
                        const b = parQ.get(a.controverse) ?? { pour: [], contre: [] };
                        b[sens].push(a);
                        parQ.set(a.controverse, b);
                    }
                }
                for (const [qs, args] of parQ) {
                    const liste = parQuestion.get(qs) ?? [];
                    liste.push({ theme, titre: m.titre, source_url: m.source_url ?? null, arguments: args });
                    parQuestion.set(qs, liste);
                }
            }
        }

        for (const [qs, mesures] of parQuestion) {
            index.get(qs)!.positions.push({
                slug: (cand as any).slug,
                nom_complet: (cand as any).nom_complet,
                couleur_hex: (cand as any).couleur_hex ?? null,
                mesures,
            });
        }
    }

    for (const q of index.values()) {
        // Faits dédoublonnés par `ref` : un même fait sert plusieurs mesures, parfois dans
        // des sens opposés. On garde CHAQUE usage — le sens n'est jamais recollé au fait.
        const faits = new Map<string, FaitVerse>();
        for (const p of q.positions) {
            for (const m of p.mesures) {
                for (const sens of ['pour', 'contre'] as const) {
                    for (const a of m.arguments[sens]) {
                        const f = faits.get(a.ref) ?? { ...a, usages: [], reversible: false };
                        f.usages.push({
                            candidat_slug: p.slug, candidat_nom: p.nom_complet,
                            mesure: m.titre, sens, note_contextuelle: a.note_contextuelle,
                        });
                        faits.set(a.ref, f);
                    }
                }
            }
        }
        for (const f of faits.values()) {
            f.reversible = f.usages.some((u) => u.sens === 'pour')
                        && f.usages.some((u) => u.sens === 'contre');
        }
        q.faits = [...faits.values()].sort(
            (a, b) => Number(b.reversible) - Number(a.reversible)
                   || b.usages.length - a.usages.length
                   || a.titre.localeCompare(b.titre, 'fr'),
        );

        // Études dédoublonnées par URL : une même étude étaye souvent plusieurs faits
        // (RTE : coût complet ET coût de production). On liste les faits qui s'y appuient.
        const etudes = new Map<string, EtudeLiee>();
        for (const f of q.faits) {
            for (const s of f.sources ?? []) {
                if (!s.url) continue;
                const e = etudes.get(s.url) ?? {
                    url: s.url, titre: s.titre ?? s.media ?? s.url,
                    media: s.media ?? null, type: s.type, fiabilite: s.fiabilite,
                    archive_url: s.archive_url ?? null,
                    auteur: s.auteur ?? null, date: s.date ?? null, extrait: s.extrait ?? null,
                    faits: [],
                };
                if (!e.faits.includes(f.titre)) e.faits.push(f.titre);
                etudes.set(s.url, e);
            }
        }
        q.etudes = [...etudes.values()].sort(
            (a, b) => (RANG_FIABILITE[a.fiabilite] ?? 9) - (RANG_FIABILITE[b.fiabilite] ?? 9)
                   || b.faits.length - a.faits.length
                   || a.titre.localeCompare(b.titre, 'fr'),
        );
    }

    return index;
}

let _indexQuestions: Map<string, QuestionCle> | null = null;
function indexQuestions(): Map<string, QuestionCle> {
    return (_indexQuestions ??= construireIndexQuestions());
}

/** Toutes les questions clés publiées — ordre éditorial, puis titre. */
export function questionsCles(): QuestionCle[] {
    return [...indexQuestions().values()].sort(
        (a, b) => ((CONTROVERSES[a.slug]?.ordre ?? 0) - (CONTROVERSES[b.slug]?.ordre ?? 0))
               || a.titre.localeCompare(b.titre, 'fr'),
    );
}

export function questionParSlug(slug: string): QuestionCle | null {
    return indexQuestions().get(slug) ?? null;
}

/** Questions rattachées à un thème. */
export function questionsDuTheme(themeSlug: string): QuestionCle[] {
    return questionsCles().filter((q) => q.theme === themeSlug);
}

/**
 * Y a-t-il quelque chose à montrer ? Test volontairement léger : Base.astro est importé
 * par TOUTES les pages et ne doit pas déclencher la construction de l'index.
 */
export const QUESTIONS_ACTIVES = Object.keys(CONTROVERSES).length > 0;

// ---------------------------------------------------------------------------
// Calendrier des prises de parole
// ---------------------------------------------------------------------------
export interface EvenementCandidat {
    slug: string; nom: string; couleur_hex: string | null; role: string; nb_citations: number;
}
export interface Evenement {
    id: string; title: string; start: string; end: string | null; allDay: boolean;
    color: string; precision_date: string; type: string; type_label: string; icon: string;
    statut: string; lieu: string | null; ville: string | null;
    organisateur: string | null; media: string | null; description: string | null;
    candidats: EvenementCandidat[]; nb_citations: number;
    urlVideo: string | null; urlSource: string | null; archive_url: string | null;
    source: { type?: string; duree_s?: number | null; a_ete_depouille: boolean };
    note_methodologique: string | null;
}

export const CALENDRIER: { election: string; evenements: Evenement[] } =
    (Object.values(_cal)[0]?.default) ?? { election: '2027', evenements: [] };

/** Événements du plus récent au plus ancien. Tri chronologique strict, jamais éditorial. */
export function evenementsRecents(limite?: number): Evenement[] {
    const tries = [...CALENDRIER.evenements].sort((a, b) => b.start.localeCompare(a.start));
    return limite ? tries.slice(0, limite) : tries;
}

export const CALENDRIER_ACTIF = CALENDRIER.evenements.length > 0;
