// Données brutes d'un indicateur Eurostat, telles que publiées sur le site : un CSV par
// série, pour que chacun puisse refaire le graphique (annexe D.6 : vérification citoyenne).
import type { APIRoute } from 'astro';
import { REPERES } from '@/lib/data';
import { NOMS, PAYS } from '@/lib/graphique';

export function getStaticPaths() {
    return Object.keys(REPERES.indicateurs).map((code) => ({ params: { code } }));
}

export const GET: APIRoute = ({ params }) => {
    const ind = REPERES.indicateurs[params.code as string];
    const lignes = ['indicateur,pays,code_pays,annee,valeur,statut'];
    for (const p of PAYS) {
        for (const pt of [...(ind.series[p] ?? [])].sort((a, b) => a.annee - b.annee)) {
            lignes.push([params.code, NOMS[p], p, pt.annee, pt.valeur, pt.statut].join(','));
        }
    }
    return new Response(lignes.join('\n') + '\n', { headers: { 'Content-Type': 'text/csv; charset=utf-8' } });
};
