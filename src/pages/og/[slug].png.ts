import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { CANDIDATS, THEMES } from '@/lib/data';

// Lecture depuis la source (racine projet au build), pas le code bundlé.
const fontsDir = path.resolve(process.cwd(), 'src/assets/fonts');
const regular = fs.readFileSync(path.join(fontsDir, 'DejaVuSans.ttf'));
const bold = fs.readFileSync(path.join(fontsDir, 'DejaVuSans-Bold.ttf'));

interface Carte {
    slug: string;
    titre: string;
    sous_titre: string;
    accent: string;
}

export function getStaticPaths() {
    const cartes: Carte[] = [
        {
            slug: 'default',
            titre: "L'élection présidentielle 2027, décryptée",
            sous_titre: 'Candidats · programmes · comparateur — neutre et sourcé',
            accent: '#60a5fa',
        },
        ...CANDIDATS.map((c) => ({
            slug: c.slug,
            titre: c.nom_complet.replace(/^M\.\s*|^Mme\s*/, ''),
            sous_titre: `${c.parti_soutien ?? ''} · exprimé sur ${c.couverture.themes_exprimes}/${c.couverture.themes_total} thèmes`,
            accent: c.couleur_hex ?? '#60a5fa',
        })),
        ...THEMES.map((t) => ({
            slug: `theme-${t.slug}`,
            titre: t.nom,
            sous_titre: 'Positions des candidats · thème par thème, sourcé',
            accent: '#60a5fa',
        })),
    ];
    return cartes.map((carte) => ({ params: { slug: carte.slug }, props: { carte } }));
}

function el(type: string, style: Record<string, unknown>, children: unknown): any {
    return { type, props: { style, children } };
}

export const GET: APIRoute = async ({ props }) => {
    const { carte } = props as { carte: Carte };

    const element = el(
        'div',
        {
            display: 'flex', flexDirection: 'column', width: '100%', height: '100%',
            padding: '64px', color: 'white', fontFamily: 'DejaVu',
            background: 'linear-gradient(135deg, #0a1024 0%, #1e3a8a 100%)',
        },
        [
            el('div', { fontSize: 28, letterSpacing: 2, opacity: 0.85 }, 'OBJECTIF 2027'),
            el('div', { display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'center' }, [
                el('div', { width: 88, height: 8, borderRadius: 4, marginBottom: 28, background: carte.accent }, ''),
                el('div', { fontSize: 66, fontWeight: 700, lineHeight: 1.1 }, carte.titre),
                el('div', { fontSize: 32, opacity: 0.85, marginTop: 18 }, carte.sous_titre),
            ]),
            el('div', { fontSize: 24, opacity: 0.7 }, 'Données : CivicDash / Civis-Consilium — sources vérifiées'),
        ],
    );

    const svg = await satori(element, {
        width: 1200,
        height: 630,
        fonts: [
            { name: 'DejaVu', data: regular, weight: 400, style: 'normal' },
            { name: 'DejaVu', data: bold, weight: 700, style: 'normal' },
        ],
    });

    const png = new Resvg(svg).render().asPng();

    return new Response(png, {
        headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' },
    });
};
