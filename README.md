# Objectif 2027 — front

Front statique (SSG) de l'application présidentielle 2027 de l'association **Civis-Consilium** / **CivicDash**.

- **Stack** : Astro 4 + islands Vue 3 + Tailwind. Sortie 100 % statique, sans compte ni cookie de suivi.
- **Données** : `src/data/*.json`, générés par `php artisan presidentielle:export` (repo `democratie`) — ne pas éditer à la main. Un webhook régénère l'export + rebuild à chaque validation en back-office.
- **Design** : conforme à `DESIGN_SPEC_OBJECTIF2027.md` (mobile-first strict, 3 états candidat×thème `non_exprime`/`en_traitement`/`publie`, présomption d'innocence, budgets perf/a11y).

## Développement
```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # -> dist/
npm run preview
```

## Pages
`/` accueil · `/candidats` grille · `/candidats/{slug}` fiche (Programme/Parcours/Affaires) ·
`/comparateur` (island Vue, sélection 2-4 candidats + thème, URL partageable) ·
`/themes/{slug}` · `/demarche` · `/methodologie` · `/mentions-legales`.

## Reste à faire
- Island **Quiz d'affinité** (calcul 100 % client-side) et sélecteur candidats dédié.
- Génération d'**images OG** au build (par candidat / duel par thème).
- **Sitemap** (`@astrojs/sitemap` à rebrancher en version compatible) + `robots.txt`.
- CI : budgets Lighthouse (≥ 95) et a11y (axe-core) bloquants.
- Export des **affaires judiciaires** dans le JSON (composant fiche déjà prêt côté état vide).
