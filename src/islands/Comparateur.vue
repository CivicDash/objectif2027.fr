<script setup>
import { ref, computed, onMounted, watch } from 'vue';

const props = defineProps({
    candidats: { type: Array, required: true }, // fiches détaillées
    themes: { type: Array, required: true },
});

const MAX = 4;
const selection = ref([]);      // slugs candidats
const themeActif = ref(props.themes[0]?.slug ?? '');

const parSlug = Object.fromEntries(props.candidats.map((c) => [c.slug, c]));

function nom(c) {
    return c.nom_complet.replace(/^M\.\s*|^Mme\s*/, '');
}

const selectionnes = computed(() => selection.value.map((s) => parSlug[s]).filter(Boolean));

function toggle(slug) {
    const i = selection.value.indexOf(slug);
    if (i >= 0) selection.value.splice(i, 1);
    else if (selection.value.length < MAX) selection.value.push(slug);
}

function etat(c) {
    return c.etats_par_theme?.[themeActif.value]?.etat ?? 'non_exprime';
}
function mesures(c) {
    return c.mesures_par_theme?.[themeActif.value] ?? [];
}
function infoTheme(c) {
    return c.etats_par_theme?.[themeActif.value] ?? {};
}

// --- Synchronisation URL (partage) ---
function lireUrl() {
    const p = new URLSearchParams(location.search);
    const c = (p.get('c') ?? '').split(',').filter((s) => parSlug[s]);
    selection.value = c.length ? c.slice(0, MAX) : props.candidats.slice(0, 2).map((x) => x.slug);
    const t = p.get('t');
    if (t && props.themes.some((x) => x.slug === t)) themeActif.value = t;
}
function ecrireUrl() {
    const p = new URLSearchParams();
    if (selection.value.length) p.set('c', selection.value.join(','));
    if (themeActif.value) p.set('t', themeActif.value);
    history.replaceState(null, '', `${location.pathname}?${p.toString()}`);
}
onMounted(lireUrl);
watch([selection, themeActif], ecrireUrl, { deep: true });

const partageStatus = ref('');
async function partager() {
    const url = location.href;
    const titre = `Comparateur présidentielle 2027 — ${props.themes.find((t) => t.slug === themeActif.value)?.nom ?? ''}`;
    try {
        if (navigator.share) await navigator.share({ title: titre, url });
        else { await navigator.clipboard.writeText(url); partageStatus.value = 'Lien copié !'; setTimeout(() => (partageStatus.value = ''), 2000); }
    } catch (_) { /* annulé */ }
}
</script>

<template>
    <div>
        <!-- Sélecteur de candidats -->
        <fieldset class="mb-4">
            <legend class="text-sm font-semibold mb-2">Choisir 2 à 4 candidats</legend>
            <div class="flex flex-wrap gap-2">
                <button
                    v-for="c in candidats" :key="c.slug" type="button"
                    @click="toggle(c.slug)"
                    :aria-pressed="selection.includes(c.slug)"
                    class="tap px-3 py-2 rounded-control border text-sm inline-flex items-center gap-2"
                    :class="selection.includes(c.slug) ? 'text-white border-transparent' : ''"
                    :style="selection.includes(c.slug) ? { background: c.couleur_hex || '#2563eb' } : { borderColor: 'var(--border)' }"
                    :disabled="!selection.includes(c.slug) && selection.length >= MAX">
                    {{ nom(c) }}
                </button>
            </div>
        </fieldset>

        <!-- Thèmes (chips horizontales scrollables — unité d'écran en mobile) -->
        <div class="mb-4 -mx-4 px-4 overflow-x-auto">
            <div class="flex gap-2 w-max" role="tablist" aria-label="Thèmes">
                <button
                    v-for="t in themes" :key="t.slug" type="button" role="tab"
                    :aria-selected="themeActif === t.slug"
                    @click="themeActif = t.slug"
                    class="tap px-3 py-2 rounded-full border text-sm whitespace-nowrap"
                    :class="themeActif === t.slug ? 'bg-brand-600 text-white border-brand-600' : ''"
                    :style="themeActif === t.slug ? {} : { borderColor: 'var(--border)' }">
                    {{ t.nom }}
                </button>
            </div>
        </div>

        <!-- Colonnes candidats (empilées en mobile, côte à côte >= 900px) -->
        <div class="grid gap-4" :style="{ gridTemplateColumns: `repeat(${Math.max(selectionnes.length, 1)}, minmax(0, 1fr))` }">
            <section v-for="c in selectionnes" :key="c.slug" class="rounded-card border p-4" style="border-color: var(--border)">
                <header class="flex items-center gap-2 mb-3">
                    <span class="w-3 h-3 rounded-full" :style="{ background: c.couleur_hex || '#64748b' }" aria-hidden="true"></span>
                    <a :href="`/candidats/${c.slug}/`" class="font-semibold hover:text-brand-600">{{ nom(c) }}</a>
                </header>

                <template v-if="etat(c) === 'publie'">
                    <details v-for="(m, i) in mesures(c)" :key="i" class="mb-2 border-b pb-2" style="border-color: var(--border)">
                        <summary class="cursor-pointer text-sm font-medium">
                            {{ m.titre }}
                            <span class="ml-1 text-xs px-1.5 py-0.5 rounded" :style="m.mise_en_avant ? 'background:#eff6ff;color:#1d4ed8' : 'background:var(--bg-soft);color:var(--fg-muted)'">
                                {{ m.statut === 'annoncee' ? 'Annonce' : 'Programme' }}
                            </span>
                        </summary>
                        <div class="mt-2 text-sm space-y-2">
                            <p v-if="m.resume" style="color: var(--fg-muted)">{{ m.resume }}</p>
                            <div v-if="m.arguments?.pour?.length">
                                <p class="text-xs font-semibold text-etat-publie">Pour</p>
                                <ul class="text-xs list-disc pl-4"><li v-for="(a, j) in m.arguments.pour" :key="j">{{ a.contenu }}</li></ul>
                            </div>
                            <div v-if="m.arguments?.contre?.length">
                                <p class="text-xs font-semibold text-etat-danger">Contre</p>
                                <ul class="text-xs list-disc pl-4"><li v-for="(a, j) in m.arguments.contre" :key="j">{{ a.contenu }}</li></ul>
                            </div>
                            <a v-if="m.source_url" :href="m.source_url" rel="nofollow noopener" class="text-xs text-brand-600 hover:underline">source ↗</a>
                        </div>
                    </details>
                </template>
                <p v-else-if="etat(c) === 'en_traitement'" class="text-sm" style="color: var(--fg-muted)">
                    S'est exprimé — rapprochement en cours de validation par notre équipe.
                    <a v-if="infoTheme(c).source_url" :href="infoTheme(c).source_url" rel="nofollow noopener" class="text-brand-600 hover:underline">source ↗</a>
                </p>
                <p v-else class="text-sm" style="color: var(--fg-muted)">Ne s'est pas exprimé sur ce thème.</p>
            </section>
        </div>

        <!-- Barre de partage persistante (zone du pouce en mobile) -->
        <div class="sticky bottom-0 mt-6 -mx-4 px-4 py-3 border-t flex items-center justify-between gap-3"
             style="background: var(--bg); border-color: var(--border)">
            <div class="flex -space-x-2">
                <span v-for="c in selectionnes" :key="c.slug" class="w-8 h-8 rounded-full border-2 grid place-items-center text-white text-xs font-bold"
                      :style="{ background: c.couleur_hex || '#64748b', borderColor: 'var(--bg)' }" :title="nom(c)" aria-hidden="true">
                    {{ nom(c).split(/\s+/).map(w => w[0]).slice(0,2).join('') }}
                </span>
            </div>
            <button type="button" @click="partager" class="tap rounded-control bg-brand-600 text-white text-sm font-medium px-4 py-2">
                {{ partageStatus || 'Partager' }}
            </button>
        </div>
    </div>
</template>
