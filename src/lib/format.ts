// Formatage à la française : virgule décimale, espace fine insécable pour les milliers.

const formats = new Map<number, Intl.NumberFormat>();

/** 13,99 → « 14,0 » (décimales fixes), 183617 → « 183 617 ». */
export function nombreFr(valeur: number, decimales = 1): string {
    let f = formats.get(decimales);
    if (!f) {
        f = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
        formats.set(decimales, f);
    }
    return f.format(valeur);
}

/** « 2026-09-26 » → « 26 septembre 2026 ». */
export function dateFr(iso: string | null | undefined): string {
    if (!iso) return '';
    const [a, m, j] = iso.split('-').map(Number);
    return new Date(Date.UTC(a, m - 1, j)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/**
 * Date à la précision connue : « 2 juillet 2019 », « juillet 2019 » ou « 2019 ». Une période
 * déclarée au mois près ne doit pas paraître commencer un 1er ; une fonction connue à
 * l'année, un 1er janvier. Sans précision (ancien export), la date complète.
 */
export function datePrecise(iso: string | null | undefined, precision?: string | null): string {
    if (!iso) return '';
    const [a, m] = iso.split('-').map(Number);
    if (precision === 'annee') return String(a);
    if (precision === 'mois') {
        return new Date(Date.UTC(a, m - 1, 1)).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    }
    return dateFr(iso);
}

function echapper(t: string): string {
    return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Le texte des fiches garde deux marques du dossier : **gras** et *italique* (titres de
 * publications). Tout le reste est échappé : rien d'autre ne passe en HTML.
 */
export function texteRiche(t: string): string {
    return echapper(t)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

/** Version sans marques, pour les attributs et les descriptions. */
export function textePlat(t: string): string {
    return t.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1');
}

/* ── Cadrages budgétaires ─────────────────────────────────────────────────────────── */

/** Ce dont `montantBudget` a besoin d'une ligne et du dictionnaire de `budgets.json`. */
interface LigneMontant {
    montant: number | null;
    montant_max?: number | null;
    unite: string | null;
    qualificatif?: string | null;
    portee?: string | null;
    annee?: number | null;
    valeur_texte?: string | null;
}
interface Dictionnaires {
    unites?: Record<string, string>;
    qualificatifs?: Record<string, string>;
    portees?: Record<string, string>;
}

const NBSP = ' ';
function nombreBudget(v: number, unite: string): string {
    // Un ratio au PIB garde sa décimale (« 3,0 % du PIB ») ; le reste n'en affiche que s'il
    // en a. Le signe moins est typographique, quelle que soit la version d'ICU.
    const min = unite === 'pct_pib' ? 1 : 0;
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: min, maximumFractionDigits: 2 })
        .format(v).replace('-', '\u2212');
}

function libelleUnite(unite: string, pluriel: boolean, dico: Dictionnaires): string {
    const brut = dico.unites?.[unite] ?? unite;
    // « point(s) de PIB » : l'accord se fait sur la valeur, à partir de 2.
    return brut.replace('(s)', pluriel ? 's' : '');
}

/**
 * Une valeur de cadrage telle que la source la donne, sans rien convertir.
 *
 *   { montant: 100, unite: 'md_eur', qualificatif: 'environ', portee: 'cumulee' }
 *       → « environ 100 Md€ (cumulés) »
 *   { montant: 3, unite: 'pct_pib', annee: 2029 }             → « 3,0 % du PIB en 2029 »
 *   { montant: 30, montant_max: 40, unite: 'md_eur' }          → « de 30 à 40 Md€ »
 *   { unite: 'texte', valeur_texte: 'équilibre en 2030' }      → « équilibre en 2030 »
 *
 * La portée ne s'affiche que si la source la donne : une portée nulle reste muette, jamais
 * « par an » par défaut. L'année est celle de la source.
 */
export function montantBudget(l: LigneMontant, dico: Dictionnaires = {}): string {
    const unite = l.unite ?? 'texte';
    if (unite === 'texte' || l.montant === null || l.montant === undefined) {
        return (l.valeur_texte ?? '').trim();
    }

    const max = l.montant_max ?? null;
    const pluriel = max !== null || Math.abs(l.montant) >= 2;
    const u = libelleUnite(unite, pluriel, dico);
    const qualif = l.qualificatif ? (dico.qualificatifs?.[l.qualificatif] ?? l.qualificatif.replace(/_/g, ' ')) : '';

    let valeur = max !== null
        ? `${qualif ? `${qualif} ` : 'de '}${nombreBudget(l.montant, unite)} à ${nombreBudget(max, unite)}${NBSP}${u}`
        : `${qualif ? `${qualif} ` : ''}${nombreBudget(l.montant, unite)}${NBSP}${u}`;

    if (l.portee === 'cumulee') {
        const p = dico.portees?.cumulee ?? 'cumulé';
        valeur += ` (${p}${pluriel && !p.endsWith('s') ? 's' : ''}${l.annee ? `, à l'horizon ${l.annee}` : ''})`;
        return valeur;
    }
    if (l.portee) valeur += ` ${dico.portees?.[l.portee] ?? l.portee}`;
    if (l.annee) valeur += ` en ${l.annee}`;
    return valeur;
}

/** Un repère « hh:mm:ss » (ou « h:mm ») de vidéo, par opposition à un repère écrit. */
export function estTimecode(reperage: string | null | undefined): boolean {
    return !!reperage && /^\d{1,2}:\d{2}(:\d{2})?$/.test(reperage.trim());
}

/* ── Qui parle ? ─────────────────────────────────────────────────────────────────── */

const QUALITES: Record<string, string> = { equipe_campagne: 'équipe de campagne', parti: 'parti' };

/**
 * « Éric Coquerel, député (équipe de campagne) » — vide pour le candidat lui-même.
 * Se place DANS l'élément de la citation : un extrait de recherche ne doit jamais
 * détacher une phrase de qui l'a prononcée.
 */
export function attributionLocuteur(a: { locuteur?: string | null; role_locuteur?: string | null; qualite_locuteur?: string | null } | null | undefined): string {
    if (!a?.locuteur) return '';
    const qualite = a.qualite_locuteur ? (QUALITES[a.qualite_locuteur] ?? a.qualite_locuteur) : null;
    return `${a.locuteur}${a.role_locuteur ? `, ${a.role_locuteur}` : ''}${qualite ? ` (${qualite})` : ''}`;
}

/** « Portée par l'équipe de campagne : Éric Coquerel (député) » — vide si `porte_par` est nul. */
export function porteParTexte(p: { qualite?: string; locuteurs?: { nom: string; role: string | null }[] } | null | undefined): string {
    if (!p?.locuteurs?.length) return '';
    const noms = p.locuteurs.map((l) => `${l.nom}${l.role ? ` (${l.role})` : ''}`).join(', ');
    return `Portée par l'équipe de campagne : ${noms}`;
}
