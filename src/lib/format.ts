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
