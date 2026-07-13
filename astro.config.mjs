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
});
