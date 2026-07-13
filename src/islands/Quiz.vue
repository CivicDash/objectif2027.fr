<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
    candidats: { type: Array, required: true }, // {slug, nom_complet, couleur_hex, mesures_par_theme, etats_par_theme}
    themes: { type: Array, required: true },
});

function nom(c) {
    return c.nom_complet.replace(/^M\.\s*|^Mme\s*/, '');
}

// Questions dérivées MÉCANIQUEMENT des mesures publiées (une question = une mesure phare publiée).
// Chaque question porte le thème + les candidats qui portent cette position.
const questions = computed(() => {
    const q = [];
    for (const t of props.themes) {
        for (const c of props.candidats) {
            const mesures = (c.mesures_par_theme?.[t.slug] ?? []).filter((m) => m.mise_en_avant);
            for (const m of mesures) {
                q.push({ theme: t.slug, themeNom: t.nom, enonce: m.titre, candidat: c.slug });
            }
        }
    }
    return q;
});

const disponible = computed(() => questions.value.length > 0);

// Réponses : question index -> 1 (d'accord) | -1 (pas d'accord) | 0 (sans avis)
const reponses = ref({});
const etape = ref(0);

function repondre(i, val) {
    reponses.value[i] = val;
    if (etape.value < questions.value.length - 1) etape.value++;
    else etape.value = questions.value.length; // écran résultats
}

// Affinité par thème (calcul 100% client-side) : accord sur les mesures portées par le candidat,
// candidat non exprimé sur le thème = EXCLU (jamais compté en désaccord).
const resultats = computed(() => {
    const parCandidat = {};
    for (const c of props.candidats) parCandidat[c.slug] = { nom: nom(c), couleur: c.couleur_hex, themes: {} };

    questions.value.forEach((q, i) => {
        const rep = reponses.value[i];
        if (rep === undefined || rep === 0) return;
        const c = parCandidat[q.candidat];
        c.themes[q.theme] ??= { nomTheme: q.themeNom, accords: 0, total: 0 };
        c.themes[q.theme].total++;
        if (rep === 1) c.themes[q.theme].accords++;
    });

    // Meilleur candidat par thème
    const parTheme = {};
    for (const t of props.themes) {
        const classement = props.candidats
            .map((c) => {
                const d = parCandidat[c.slug].themes[t.slug];
                return d && d.total ? { slug: c.slug, nom: nom(c), score: Math.round((d.accords / d.total) * 100) } : null;
            })
            .filter(Boolean)
            .sort((a, b) => b.score - a.score);
        if (classement.length) parTheme[t.slug] = { nom: t.nom, classement };
    }
    return parTheme;
});

function recommencer() {
    reponses.value = {};
    etape.value = 0;
}
</script>

<template>
    <div>
        <!-- État vide honnête -->
        <div v-if="!disponible" class="rounded-card border p-5 text-sm" style="border-color: var(--border); color: var(--fg-muted)">
            Le quiz d'affinité sera disponible dès que des mesures auront été <strong>publiées et validées</strong>.
            Aujourd'hui, les positions des candidats sont encore en cours de traitement par notre équipe.
        </div>

        <template v-else>
            <p class="text-sm rounded-card border p-3 mb-4" style="border-color: var(--border); color: var(--fg-muted)">
                🔒 Calcul entièrement dans votre navigateur — <strong>rien n'est envoyé ni conservé</strong>.
            </p>

            <!-- Questions -->
            <div v-if="etape < questions.length">
                <div class="text-xs mb-2" style="color: var(--fg-muted)">
                    Question {{ etape + 1 }} / {{ questions.length }} · {{ questions[etape].themeNom }}
                </div>
                <p class="text-lg font-medium mb-4">{{ questions[etape].enonce }}</p>
                <div class="flex flex-wrap gap-2">
                    <button type="button" class="tap rounded-control bg-etat-publie text-white px-4 py-2 text-sm" @click="repondre(etape, 1)">D'accord</button>
                    <button type="button" class="tap rounded-control bg-etat-danger text-white px-4 py-2 text-sm" @click="repondre(etape, -1)">Pas d'accord</button>
                    <button type="button" class="tap rounded-control border px-4 py-2 text-sm" style="border-color: var(--border)" @click="repondre(etape, 0)">Sans avis</button>
                </div>
            </div>

            <!-- Résultats par thème -->
            <div v-else>
                <h2 class="text-xl font-bold mb-1">Vos affinités par thème</h2>
                <p class="text-sm mb-4" style="color: var(--fg-muted)">
                    Pas de « gagnant » unique : vous pouvez être proche de candidats différents selon les thèmes.
                </p>
                <div class="space-y-3">
                    <div v-for="(t, slug) in resultats" :key="slug" class="rounded-card border p-4" style="border-color: var(--border)">
                        <h3 class="font-semibold mb-2">{{ t.nom }}</h3>
                        <ul class="space-y-1 text-sm">
                            <li v-for="r in t.classement" :key="r.slug" class="flex items-center justify-between gap-2">
                                <a :href="`/candidats/${r.slug}/`" class="hover:text-brand-600">{{ r.nom }}</a>
                                <span class="font-mono">{{ r.score }}%</span>
                            </li>
                        </ul>
                    </div>
                </div>
                <button type="button" class="tap mt-4 rounded-control border px-4 py-2 text-sm" style="border-color: var(--border)" @click="recommencer">Recommencer</button>
            </div>
        </template>
    </div>
</template>
