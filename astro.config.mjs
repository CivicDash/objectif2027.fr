import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import tailwind from '@astrojs/tailwind';

// https://astro.build
// NOTE: @astrojs/sitemap à rebrancher (version compatible) — retiré pour l'instant
// (crash connu au build:done avec la combinaison de versions courante).
export default defineConfig({
    site: 'https://objectif2027.fr',
    output: 'static',
    integrations: [vue(), tailwind()],
    build: { inlineStylesheets: 'auto' },
    compressHTML: true,
    // « Ce qu'on entend » (fiches à verdict) a été retiré le 27/09/2026 ; ses chiffres
    // reviennent, sans verdict, dans les pages thèmes. Les deux fiches qui ont été en
    // ligne renvoient vers leur thème.
    redirects: {
        '/ce-qu-on-entend': '/themes/',
        '/ce-qu-on-entend/trop-d-immigration': '/themes/immigration/',
        '/ce-qu-on-entend/fraude-fiscale-cout': '/themes/fiscalite-budget/',
    },
});
