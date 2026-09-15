<script setup>
import { computed, nextTick, ref } from 'vue';

/**
 * Jeu « Qui a dit quoi ? ».
 *
 * Correction IMMÉDIATE, vert ou rouge, avant de passer à la suite. Renvoyer la correction
 * à la fin la renverrait à un écran que l'on survole : le joueur qui s'est trompé doit
 * savoir tout de suite qui a réellement prononcé la phrase, pendant qu'elle est encore
 * sous ses yeux. C'est ce qui empêche le jeu d'enseigner une fausse attribution — le
 * risque documenté des questionnaires « vrai ou faux » qui renforcent ce qu'ils corrigent.
 *
 * La question porte sur l'AUTEUR d'une phrase, pas sur le partage d'une opinion : elle a
 * exactement une bonne réponse, y compris quand deux candidats pensent la même chose.
 */
const props = defineProps({
    citations: { type: Array, required: true },
    candidats: { type: Array, required: true },
});

const NB_CARTES = 20;
const NB_CHOIX = 5;
const SECONDES = 20;

const etape = ref('accueil');   // accueil | jeu | fin
const chrono = ref(false);
const cartes = ref([]);
const index = ref(0);
const choix = ref(null);        // slug choisi, null tant qu'on n'a pas répondu
const score = ref(0);
const serie = ref(0);
const meilleureSerie = ref(0);
const restant = ref(SECONDES);
const enonce = ref(null);
let minuteur = null;

const parSlug = Object.fromEntries(props.candidats.map((c) => [c.slug, c]));

function melanger(liste) {
    const a = [...liste];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/**
 * Tirage d'une manche.
 *
 * Les cartes sont réparties entre candidats plutôt que tirées à plat : le vivier est déjà
 * plafonné à l'export, mais un tirage uniforme sur 120 citations donnerait quand même des
 * manches déséquilibrées. Les leurres viennent de préférence du MÊME thème — plus
 * difficile, et plus juste que d'opposer une phrase sur l'école à quatre candidats qui
 * n'en parlent jamais.
 */
function tirer() {
    const parCandidat = new Map();
    for (const c of props.citations) {
        if (!parCandidat.has(c.candidat)) parCandidat.set(c.candidat, []);
        parCandidat.get(c.candidat).push(c);
    }

    const piles = melanger([...parCandidat.values()].map((l) => melanger(l)));
    const retenues = [];
    let tour = 0;
    while (retenues.length < NB_CARTES && tour < 50) {
        for (const pile of piles) {
            if (retenues.length >= NB_CARTES) break;
            if (pile[tour]) retenues.push(pile[tour]);
        }
        tour++;
    }

    cartes.value = melanger(retenues).map((c) => {
        const memeTheme = props.candidats.filter((x) => x.slug !== c.candidat
            && props.citations.some((y) => y.candidat === x.slug && y.theme === c.theme));
        const autres = props.candidats.filter((x) => x.slug !== c.candidat
            && !memeTheme.some((m) => m.slug === x.slug));

        const leurres = [...melanger(memeTheme), ...melanger(autres)].slice(0, NB_CHOIX - 1);

        return { ...c, propositions: melanger([parSlug[c.candidat], ...leurres].filter(Boolean)) };
    });
}

function demarrer() {
    tirer();
    index.value = 0;
    score.value = 0;
    serie.value = 0;
    meilleureSerie.value = 0;
    choix.value = null;
    etape.value = 'jeu';
    lancerChrono();
    annoncer();
}

function lancerChrono() {
    clearInterval(minuteur);
    if (!chrono.value) return;
    restant.value = SECONDES;
    minuteur = setInterval(() => {
        restant.value--;
        if (restant.value <= 0) {
            clearInterval(minuteur);
            if (choix.value === null) repondre(null);   // temps écoulé = sans réponse
        }
    }, 1000);
}

const carte = computed(() => cartes.value[index.value] ?? null);
const repondu = computed(() => choix.value !== null);
const juste = computed(() => repondu.value && choix.value === carte.value?.candidat);
const auteur = computed(() => (carte.value ? parSlug[carte.value.candidat] : null));

function repondre(slug) {
    if (repondu.value) return;
    clearInterval(minuteur);
    choix.value = slug ?? '—';

    if (slug === carte.value.candidat) {
        serie.value++;
        meilleureSerie.value = Math.max(meilleureSerie.value, serie.value);
        // Le bonus récompense la série, pas la vitesse : une prime à la rapidité
        // récompenserait de ne pas lire la citation, ce que le jeu cherche à éviter.
        score.value += 1 + (serie.value >= 3 ? 1 : 0);
    } else {
        serie.value = 0;
    }
}

function suivante() {
    if (index.value < cartes.value.length - 1) {
        index.value++;
        choix.value = null;
        lancerChrono();
        annoncer();
    } else {
        clearInterval(minuteur);
        etape.value = 'fin';
    }
}

async function annoncer() {
    await nextTick();
    enonce.value?.focus();
}

function rejouer() {
    etape.value = 'accueil';
    clearInterval(minuteur);
}

const scoreMax = computed(() => cartes.value.length);
const hasard = computed(() => Math.round(cartes.value.length / NB_CHOIX));

function portrait(slug) {
    return `/portraits/${slug}@256.jpg`;
}

function initiales(nom) {
    return (nom ?? '').split(/\s+/).map((m) => m[0]).slice(0, 2).join('').toUpperCase();
}
</script>

<template>
    <div>
        <!-- Accueil -->
        <div v-if="etape === 'accueil'">
            <p class="text-sm rounded-card border p-3 mb-4" style="border-color: var(--border); color: var(--fg-muted)">
                {{ NB_CARTES }} phrases réellement prononcées, tirées de discours dépouillés et vérifiés.
                À vous de retrouver qui les a dites. Correction immédiate à chaque carte.
            </p>

            <label class="tap flex items-center gap-2 text-sm mb-4">
                <input v-model="chrono" type="checkbox" class="rounded" />
                Mode chrono — {{ SECONDES }} secondes par carte
            </label>

            <button type="button" class="tap rounded-control bg-brand-600 text-white px-5 py-2.5 font-medium"
                    @click="demarrer">
                Commencer
            </button>

            <p class="text-xs mt-4" style="color: var(--fg-muted)">
                Rien n'est envoyé ni conservé. Les citations sont vérifiées mot pour mot contre
                leur source, et chaque correction vous donne le lien pour l'écouter.
            </p>
        </div>

        <!-- Partie -->
        <div v-else-if="etape === 'jeu' && carte">
            <div class="flex items-center justify-between gap-3 text-xs" style="color: var(--fg-muted)">
                <span>Carte {{ index + 1 }} / {{ cartes.length }}</span>
                <span class="flex items-center gap-3">
                    <span v-if="serie >= 3" class="font-medium" style="color:#047857">série {{ serie }} 🔥</span>
                    <span>{{ score }} point{{ score > 1 ? 's' : '' }}</span>
                    <span v-if="chrono && !repondu" :style="restant <= 5 ? 'color:#b91c1c' : ''">{{ restant }} s</span>
                </span>
            </div>

            <blockquote ref="enonce" tabindex="-1" aria-live="polite"
                        class="rounded-card border p-4 mt-2 text-lg leading-relaxed"
                        style="border-color: var(--border); background: var(--bg-soft)">
                « {{ carte.texte }} »
            </blockquote>

            <fieldset class="border-0 p-0 m-0 mt-4">
                <legend class="sr-only">Qui a prononcé cette phrase ?</legend>
                <p class="text-sm font-medium mb-2">Qui a prononcé cette phrase ?</p>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button v-for="c in carte.propositions" :key="c.slug" type="button"
                            class="tap flex items-center gap-3 rounded-card border p-2.5 text-left transition"
                            :disabled="repondu"
                            :aria-pressed="choix === c.slug"
                            :style="!repondu ? 'border-color: var(--border)'
                                : c.slug === carte.candidat
                                    ? 'border-color:#047857; background: color-mix(in srgb, #047857 12%, var(--bg))'
                                    : choix === c.slug
                                        ? 'border-color:#b91c1c; background: color-mix(in srgb, #b91c1c 12%, var(--bg))'
                                        : 'border-color: var(--border); opacity:.5'"
                            @click="repondre(c.slug)">
                        <span class="relative grid place-items-center rounded-full overflow-hidden shrink-0 text-white font-semibold"
                              :style="{ background: c.couleur || '#64748b', width: '40px', height: '40px' }"
                              aria-hidden="true">
                            {{ initiales(c.nom) }}
                            <img :src="portrait(c.slug)" alt="" width="40" height="40" loading="lazy"
                                 class="absolute inset-0 w-full h-full object-cover" />
                        </span>
                        <span class="font-medium">{{ c.nom }}</span>
                        <span v-if="repondu && c.slug === carte.candidat" class="ml-auto" aria-hidden="true">✓</span>
                        <span v-else-if="repondu && choix === c.slug" class="ml-auto" aria-hidden="true">✗</span>
                    </button>
                </div>
            </fieldset>

            <!-- Correction immédiate -->
            <div v-if="repondu" class="rounded-card border p-4 mt-4"
                 :style="juste ? 'border-color:#047857' : 'border-color:#b91c1c'">
                <p class="font-semibold" :style="juste ? 'color:#047857' : 'color:#b91c1c'" role="status">
                    {{ juste ? 'Exact.' : (choix === '—' ? 'Temps écoulé.' : 'Raté.') }}
                    <span style="color: var(--fg)">C'est {{ auteur?.nom }}.</span>
                </p>
                <p class="text-sm mt-1" style="color: var(--fg-muted)">
                    {{ carte.source.titre }}
                    <span v-if="carte.source.date"> · {{ carte.source.date }}</span>
                    <span v-if="carte.source.reperage"> · {{ carte.source.reperage }}</span>
                    <a v-if="carte.source.url" :href="carte.source.url" target="_blank" rel="nofollow noopener"
                       class="text-brand-600 hover:underline"> — écouter ↗</a>
                </p>

                <button type="button" class="tap rounded-control bg-brand-600 text-white px-4 py-2 text-sm font-medium mt-3"
                        @click="suivante">
                    {{ index < cartes.length - 1 ? 'Carte suivante →' : 'Voir le résultat →' }}
                </button>
            </div>
        </div>

        <!-- Fin -->
        <div v-else-if="etape === 'fin'">
            <h2 class="text-2xl font-bold">{{ score }} / {{ scoreMax }}</h2>
            <p class="text-sm mt-1" style="color: var(--fg-muted)">
                Au hasard, on obtient environ {{ hasard }} — il y a {{ NB_CHOIX }} propositions par carte.
                <span v-if="meilleureSerie >= 3"> Meilleure série : {{ meilleureSerie }} d'affilée.</span>
            </p>
            <p class="text-sm mt-3" style="color: var(--fg-muted)">
                Les points de série s'ajoutent à partir de trois bonnes réponses consécutives :
                le score peut donc dépasser le nombre de cartes.
            </p>

            <div class="flex items-center gap-3 mt-4 flex-wrap">
                <button type="button" class="tap rounded-control bg-brand-600 text-white px-4 py-2 text-sm font-medium"
                        @click="rejouer">
                    Rejouer
                </button>
                <a href="/quiz/" class="tap text-sm text-brand-600 hover:underline">
                    Et vous, où vous situez-vous ? →
                </a>
            </div>
        </div>
    </div>
</template>
