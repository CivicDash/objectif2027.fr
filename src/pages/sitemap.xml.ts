import type { APIRoute } from 'astro';
import { CANDIDATS, THEMES, META } from '@/lib/data';

// Sitemap généré à la main (sans dépendance) — pas d'analytics, pas de collecte.
export const GET: APIRoute = ({ site }) => {
    const base = (site?.href ?? 'https://objectif2027.fr/').replace(/\/$/, '');
    const lastmod = (META as { genere_le?: string }).genere_le;
    const statiques = [
        '/',
        '/candidats/',
        '/comparateur/',
        '/quiz/',
        '/themes/',
        '/recherche/',
        '/demarche/',
        '/methodologie/',
        '/signaler/',
        '/mentions-legales/',
    ];
    const urls = [
        ...statiques,
        ...CANDIDATS.map((c) => `/candidats/${c.slug}/`),
        ...THEMES.map((t) => `/themes/${t.slug}/`),
    ];

    const lm = lastmod ? `<lastmod>${lastmod}</lastmod>` : '';
    const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${base}${u}</loc>${lm}</url>`).join('\n')}
</urlset>
`;

    return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
};
