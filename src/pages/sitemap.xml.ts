import type { APIRoute } from 'astro';
import { CANDIDATS, THEMES } from '@/lib/data';

// Sitemap généré à la main (sans dépendance) — pas d'analytics, pas de collecte.
export const GET: APIRoute = ({ site }) => {
    const base = (site?.href ?? 'https://objectif2027.fr/').replace(/\/$/, '');
    const statiques = ['/', '/candidats/', '/comparateur/', '/demarche/', '/methodologie/', '/mentions-legales/'];
    const urls = [
        ...statiques,
        ...CANDIDATS.map((c) => `/candidats/${c.slug}/`),
        ...THEMES.map((t) => `/themes/${t.slug}/`),
    ];

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${base}${u}</loc></url>`).join('\n')}
</urlset>
`;

    return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
};
