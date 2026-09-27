// Calculs des graphiques des repères chiffrés, faits au build (annexe D.3).
//
// Aucune bibliothèque : une échelle linéaire, des graduations « rondes » et un placement
// d'étiquettes tiennent en quelques fonctions, et le build tourne dans un conteneur qui
// refait `npm install` à chaque déploiement. Aucun calcul de données ici non plus : les
// valeurs arrivent déjà dérivées et arrondies par le back-office. On ne fait que placer.
import type { Indicateur, PointSerie } from '@/lib/data';
import { nombreFr } from '@/lib/format';

/** France, les trois autres plus grandes économies de la zone euro, et la moyenne UE-27. */
export const PAYS = ['FR', 'DE', 'IT', 'ES', 'EU27_2020'] as const;
export const NOMS: Record<string, string> = {
    FR: 'France', DE: 'Allemagne', IT: 'Italie', ES: 'Espagne', EU27_2020: 'UE-27',
};
/** Ordre de tracé : la France en dernier, donc par-dessus les autres. */
export const ORDRE_TRACE = ['ES', 'IT', 'DE', 'EU27_2020', 'FR'];

export interface Gabarit {
    largeur: number;
    hauteur: number;
    marge: { haut: number; droite: number; bas: number; gauche: number };
    /** Taille du texte en unités SVG. Le gabarit compact est affiché à peu près à sa
     *  taille réelle sur mobile (330 de large pour ~320 px affichés), d'où deux gabarits
     *  plutôt qu'un seul mis à l'échelle :
     *  un SVG de 720 de large réduit à 340 px ramènerait le texte à 6 px. */
    police: number;
    /** Nombre maximal d'années écrites en abscisse (le pas s'en déduit). */
    maxAnnees: number;
}

export const GABARITS: Record<'large' | 'compact', Gabarit> = {
    large: { largeur: 720, hauteur: 340, marge: { haut: 16, droite: 150, bas: 30, gauche: 46 }, police: 13, maxAnnees: 8 },
    compact: { largeur: 330, hauteur: 290, marge: { haut: 14, droite: 130, bas: 28, gauche: 36 }, police: 14, maxAnnees: 4 },
};

export function echelle(d0: number, d1: number, r0: number, r1: number): (v: number) => number {
    const etendue = d1 - d0 || 1;
    return (v) => r0 + ((v - d0) * (r1 - r0)) / etendue;
}

/** Pas « rond » (1, 2, 2,5, 5 × 10^k) donnant au plus `cible` intervalles. */
export function pasRond(etendue: number, cible = 5): number {
    const brut = (etendue || 1) / cible;
    const p = 10 ** Math.floor(Math.log10(brut));
    return [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => etendue / s <= cible) ?? 10 * p;
}

/** Bornes et graduations de l'axe vertical. Zéro par défaut (annexe D.5). */
export function axeVertical(valeurs: number[], yMin = 0, cible = 5): { min: number; max: number; graduations: number[] } {
    const haut = Math.max(...valeurs, yMin + 1e-9);
    const pas = pasRond(haut - yMin, cible);
    const max = Math.ceil(haut / pas - 1e-9) * pas;
    const graduations: number[] = [];
    for (let v = Math.ceil(yMin / pas - 1e-9) * pas; v <= max + 1e-9; v += pas) {
        // « + 0 » : Math.round(-0,4) vaut -0, qu'Intl écrit « -0 ».
        graduations.push(Math.round(v / pas) * pas + 0);
    }
    return { min: yMin, max, graduations };
}

/** Décimales nécessaires pour écrire les graduations sans perte. */
export function decimalesGraduations(graduations: number[]): number {
    return graduations.some((g) => Math.abs(g - Math.round(g)) > 1e-9)
        ? (graduations.some((g) => Math.abs(g * 10 - Math.round(g * 10)) > 1e-9) ? 2 : 1)
        : 0;
}

/**
 * Anti-chevauchement des étiquettes de fin de courbe : on les écarte vers le bas, puis on
 * remonte le tout si la dernière déborde. Les positions restent aussi proches que possible
 * de leur courbe ; seule la valeur écrite dit la vérité, jamais la position.
 */
export function placerEtiquettes(ys: number[], ecart: number, haut: number, bas: number): number[] {
    const ordre = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
    for (let k = 1; k < ordre.length; k++) {
        if (ordre[k].y - ordre[k - 1].y < ecart) ordre[k].y = ordre[k - 1].y + ecart;
    }
    if (ordre.length) ordre[ordre.length - 1].y = Math.min(ordre[ordre.length - 1].y, bas);
    for (let k = ordre.length - 2; k >= 0; k--) {
        if (ordre[k + 1].y - ordre[k].y < ecart) ordre[k].y = ordre[k + 1].y - ecart;
    }
    if (ordre.length) ordre[0].y = Math.max(ordre[0].y, haut);
    const sortie = new Array<number>(ys.length);
    for (const o of ordre) sortie[o.i] = o.y;
    return sortie;
}

/** Point creux : valeur provisoire (p) ou estimée (e). */
export const estProvisoire = (statut: string) => /[pe]/.test(statut ?? '');

/** Segments continus d'une série : une année manquante interrompt la courbe. */
export function segments(points: PointSerie[]): PointSerie[][] {
    const tries = [...points].sort((a, b) => a.annee - b.annee);
    const sortie: PointSerie[][] = [];
    for (const p of tries) {
        const courant = sortie[sortie.length - 1];
        if (courant && p.annee === courant[courant.length - 1].annee + 1) courant.push(p);
        else sortie.push([p]);
    }
    return sortie;
}

/** « Allemagne 2011, 2016 ; France 2021 » — ruptures de série (statut b), pour le pied. */
export function ruptures(indicateurs: Indicateur[]): string {
    const parPays = new Map<string, Set<number>>();
    for (const ind of indicateurs) {
        for (const [pays, pts] of Object.entries(ind.series)) {
            for (const p of pts) {
                if (p.statut?.includes('b')) {
                    if (!parPays.has(pays)) parPays.set(pays, new Set());
                    parPays.get(pays)!.add(p.annee);
                }
            }
        }
    }
    return PAYS.filter((p) => parPays.has(p))
        .map((p) => `${NOMS[p]} ${[...parPays.get(p)!].sort().join(', ')}`)
        .join(' ; ');
}

export function aDesProvisoires(indicateurs: Indicateur[]): boolean {
    return indicateurs.some((i) => Object.values(i.series).some((pts) => pts.some((p) => estProvisoire(p.statut))));
}

export function dernier(ind: Indicateur, pays: string): PointSerie | undefined {
    const pts = ind.series[pays];
    return pts?.length ? [...pts].sort((a, b) => a.annee - b.annee)[pts.length - 1] : undefined;
}

export function valeurEn(ind: Indicateur, pays: string, annee: number): PointSerie | undefined {
    return ind.series[pays]?.find((p) => p.annee === annee);
}

/** Dernière année où la France a une valeur pour tous les indicateurs. */
export function anneeCommune(indicateurs: Indicateur[]): number | null {
    const annees = indicateurs.map((i) => new Set((i.series.FR ?? []).map((p) => p.annee)));
    const candidates = [...annees[0] ?? []].filter((a) => annees.every((s) => s.has(a)));
    return candidates.length ? Math.max(...candidates) : null;
}

/** Dernière année où un pays a une valeur pour toutes les catégories (barres empilées). */
export function anneeCompletePays(indicateurs: Indicateur[], pays: string): number | null {
    const annees = indicateurs.map((i) => new Set((i.series[pays] ?? []).map((p) => p.annee)));
    const candidates = [...annees[0] ?? []].filter((a) => annees.every((s) => s.has(a)));
    return candidates.length ? Math.max(...candidates) : null;
}

/** Années écrites en abscisse : la dernière toujours, puis à pas régulier vers le passé. */
export function anneesAxe(a0: number, a1: number, maxAnnees: number): number[] {
    const pas = Math.max(1, Math.ceil((a1 - a0) / Math.max(1, maxAnnees - 1)));
    const sortie: number[] = [];
    for (let a = a1; a >= a0; a -= pas) sortie.unshift(a);
    return sortie;
}

export function valeurFr(v: number, decimales = 1, suffixe = ''): string {
    return `${nombreFr(v, decimales)}${suffixe}`;
}

/**
 * Phrase de synthèse générée depuis les données (annexe D.6) : la dernière valeur de
 * chaque pays, avec son année. Elle ne commente rien.
 */
export function syntheseCourbes(ind: Indicateur, titre: string, decimales = 1, suffixe = ''): string {
    const morceaux = PAYS.map((p) => {
        const d = dernier(ind, p);
        return d ? `${NOMS[p]} ${valeurFr(d.valeur, decimales, suffixe)} (${d.annee})` : `${NOMS[p]} non disponible`;
    });
    return `${titre}, dernière valeur connue : ${morceaux.join(' ; ')}.`;
}
