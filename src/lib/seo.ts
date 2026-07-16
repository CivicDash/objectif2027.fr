// Données structurées (JSON-LD) et helpers SEO — sans collecte, purement descriptif.
// Toutes les fonctions renvoient des objets sérialisés tels quels par Base.astro.

const SITE = 'https://objectif2027.fr';
const ORG_ID = 'https://civis-consilium.eu/#organization';

function base(site?: string): string {
    return (site ?? SITE).replace(/\/$/, '');
}

function nomAffiche(nomComplet: string): string {
    return nomComplet.replace(/^M\.\s*|^Mme\s*/, '');
}

// Éditeur : l'association Civis-Consilium (réutilisé par référence @id ailleurs).
export function organizationJsonLd() {
    return {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': ORG_ID,
        name: 'Civis-Consilium',
        alternateName: 'Objectif 2027',
        url: 'https://civis-consilium.eu',
        logo: 'https://civis-consilium.eu/assets/logo.png',
        description:
            "Association française loi 1901 (RNA W391007406) — porte le projet citoyen Objectif 2027, appuyé sur la plateforme open-source CivicDash.",
        sameAs: [
            'https://civicdash.fr',
            'https://github.com/civis-consilium',
            'https://bsky.app/profile/civis-consilium.bsky.social',
            'https://mastodon.social/@civisconsilium',
        ],
    };
}

// Site + boîte de recherche (sitelinks searchbox) pointant sur /recherche/?q=…
export function websiteJsonLd(site?: string) {
    const b = base(site);
    return {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': `${b}/#website`,
        url: `${b}/`,
        name: 'Objectif 2027',
        inLanguage: 'fr-FR',
        description:
            "Comprendre l'élection présidentielle française de 2027 : candidats, programmes, arguments sourcés. Neutre, sans compte, sans traceur.",
        publisher: { '@id': ORG_ID },
        potentialAction: {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: `${b}/recherche/?q={search_term_string}`,
            },
            'query-input': 'required name=search_term_string',
        },
    };
}

// Fil d'Ariane structuré (aligné sur le composant Breadcrumb visuel : Accueil implicite en tête).
export function breadcrumbJsonLd(items: { label: string; href?: string }[], site?: string) {
    const b = base(site);
    const complet = [{ label: 'Accueil', href: '/' }, ...items];
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: complet.map((it, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: it.label,
            ...(it.href ? { item: `${b}${it.href}` } : {}),
        })),
    };
}

// Personne (candidat) — factuel, neutre. Pas d'endossement, juste identité + affiliation déclarée.
export function personJsonLd(c: any, site?: string) {
    const b = base(site);
    const nom = nomAffiche(c.nom_complet);
    return {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: nom,
        url: `${b}/candidats/${c.slug}/`,
        ...(c.photo?.url ? { image: c.photo.url } : {}),
        ...(c.parti_soutien
            ? { affiliation: { '@type': 'Organization', name: c.parti_soutien } }
            : {}),
        description: `Candidat à l'élection présidentielle française de 2027${
            c.parti_soutien ? ` — ${c.parti_soutien}` : ''
        }. Programme, parcours et affaires, sourcés et neutres.`,
    };
}

// Liste ordonnée des candidats (ordre neutre alphabétique) pour /candidats/.
export function candidatsItemListJsonLd(candidats: any[], site?: string) {
    const b = base(site);
    return {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Candidats à l’élection présidentielle 2027',
        itemListOrder: 'https://schema.org/ItemListOrderAscending',
        numberOfItems: candidats.length,
        itemListElement: candidats.map((c, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `${b}/candidats/${c.slug}/`,
            name: nomAffiche(c.nom_complet),
        })),
    };
}
