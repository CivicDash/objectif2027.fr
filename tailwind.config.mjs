/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,vue}'],
    darkMode: 'media',
    theme: {
        extend: {
            colors: {
                // Tokens repris de CivicDash (bleu civique), neutres pour la hiérarchie.
                brand: {
                    50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd',
                    400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8',
                    800: '#1e40af', 900: '#1e3a8a',
                },
                // États sémantiques (statuts, présomption d'innocence…)
                etat: {
                    publie: '#059669',
                    traitement: '#d97706',
                    absent: '#94a3b8',
                    danger: '#b91c1c',
                },
            },
            borderRadius: { card: '12px', control: '8px' },
            fontFamily: {
                sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
            },
            maxWidth: { content: '72rem' },
        },
    },
    plugins: [],
};
