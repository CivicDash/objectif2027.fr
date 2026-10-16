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
