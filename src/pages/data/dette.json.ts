// Données de la page « La dette publique, d'où elle vient », telles que publiées : chacun peut
// refaire les graphiques et les calculs (séries Eurostat et chiffres tirés de rapports).
import type { APIRoute } from 'astro';
import D from '@/editorial/dette.json';

export const GET: APIRoute = () =>
    new Response(JSON.stringify(D, null, 1) + '\n', { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
