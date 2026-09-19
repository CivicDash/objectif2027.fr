<script setup>
import { computed, nextTick, ref } from 'vue';

/**
 * Quiz thématique.
 *
 * Il ne produit AUCUN score. L'écran de résultat rend les positions retenues et les
 * candidats qui les portent : le lecteur tire sa conclusion, nous ne la produisons pas.
 * C'est ce qui rend tenable la cohabitation de deux formats de question — sans total à
 * calculer, il n'y a pas de pondération implicite entre les thèmes.
 *
 * Rien n'est envoyé ni conservé : ni serveur, ni stockage local. Les opinions politiques
 * sont des données sensibles, et un lien de partage les inscrirait dans les journaux de
 * tous les serveurs qu'il traverse.
 */
const props = defineProps({
    // [{ slug, nom, questions: [...] }]
    themes: { type: Array, required: true },
});

const etape = ref('themes'); // themes | questions | resultat
const themesChoisis = ref([]);
const index = ref(0);
const reponses = ref({});    // ref de question -> ref d'option, ou null (sans avis)
const enonce = ref(null);

// Les civilités sont retirées partout ailleurs sur le site : « M. Bruno Retailleau »
// détonnait dans une liste de pastilles.
const nom = (n) => (n ?? '').replace(/^M\.\s*|^Mme\s*/, '');

const themesDisponibles = computed(() => props.themes.filter((t) => t.questions.length > 0));

const totalQuestions = computed(() =>
    themesDisponibles.value.reduce((n, t) => n + t.questions.length, 0));

/**
 * Mélange de Fisher-Yates, tiré une fois par session.
 *
 * Sans lui, la première option serait systématiquement la même pour tous les visiteurs —
 * or la première position d'une liste est avantagée. L'ordre de saisie en administration
 * ne doit pas devenir un ordre de préséance politique.
 */
function melanger(liste) {
    const a = [...liste];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

const questions = ref([]);

function commencer() {
    const retenus = new Set(themesChoisis.value);
    questions.value = melanger(
        props.themes
            .filter((t) => retenus.has(t.slug))
            .flatMap((t) => t.questions.map((q) => ({
                ...q,
                themeNom: t.nom,
                optionsMelangees: melanger(q.options),
            }))),
    );
    index.value = 0;
    reponses.value = {};
    etape.value = 'questions';
    annoncer();
}

function basculerTheme(slug) {
    const i = themesChoisis.value.indexOf(slug);
    if (i >= 0) themesChoisis.value.splice(i, 1);
    else themesChoisis.value.push(slug);
}

function toutCocher() {
    themesChoisis.value = themesDisponibles.value.map((t) => t.slug);
}

// Le focus suit la question : sans cela, la navigation au clavier reste bloquée en haut
// de page et un lecteur d'écran n'annonce pas le changement d'énoncé.
async function annoncer() {
    await nextTick();
    enonce.value?.focus();
}

function repondre(refOption) {
    const q = questions.value[index.value];
    reponses.value[q.ref] = refOption;
    if (index.value < questions.value.length - 1) {
        index.value++;
        annoncer();
    } else {
        etape.value = 'resultat';
    }
}

function precedente() {
    if (index.value > 0) {
        index.value--;
        annoncer();
    }
}

function recommencer() {
    etape.value = 'themes';
    themesChoisis.value = [];
    reponses.value = {};
    index.value = 0;
}

const questionCourante = computed(() => questions.value[index.value] ?? null);

/**
 * Résultat : par thème, les positions retenues et qui les porte.
 *
 * Un candidat n'apparaît que sous les positions qu'il défend réellement. Ne pas figurer
 * n'est pas un désaccord — c'est le plus souvent que nous n'avons pas encore dépouillé de
 * prise de parole de sa part sur le sujet.
 */
const resultat = computed(() => {
    const parTheme = new Map();

    for (const q of questions.value) {
        const refChoisie = reponses.value[q.ref];
        if (!refChoisie) continue;
        const option = q.options.find((o) => o.ref === refChoisie);
        if (!option) continue;

        const bloc = parTheme.get(q.themeNom) ?? [];
        bloc.push({ intitule: q.intitule, option });
        parTheme.set(q.themeNom, bloc);
    }

    return [...parTheme.entries()].map(([theme, choix]) => ({ theme, choix }));
});

const nbSansAvis = computed(() =>
    questions.value.filter((q) => !reponses.value[q.ref]).length);
</script>

<template>
    <div>
        <p class="text-sm rounded-card border p-3 mb-4" style="border-color: var(--border); color: var(--fg-muted)">
            🔒 Tout se passe dans votre navigateur — <strong>rien n'est envoyé, rien n'est conservé</strong>.
            Recharger la page efface vos réponses.
        </p>

        <!-- Aucune question publiée -->
        <div v-if="!themesDisponibles.length" class="rounded-card border p-5 text-sm"
             style="border-color: var(--border); color: var(--fg-muted)">
            Aucune question n'est publiée pour le moment. Elles arrivent à mesure que les
            prises de parole des candidats sont dépouillées et vérifiées.
        </div>

        <!-- 1. Choix des thèmes -->
        <div v-else-if="etape === 'themes'">
            <h2 class="font-semibold">Sur quels sujets voulez-vous vous situer ?</h2>
            <p class="text-sm mt-1 mb-4" style="color: var(--fg-muted)">
                {{ totalQuestions }} question{{ totalQuestions > 1 ? 's' : '' }} disponible{{ totalQuestions > 1 ? 's' : '' }}.
                Les thèmes absents de cette liste n'ont pas encore de question publiée.
            </p>

            <fieldset class="border-0 p-0 m-0">
                <legend class="sr-only">Thèmes du quiz</legend>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button v-for="t in themesDisponibles" :key="t.slug" type="button"
                            class="tap rounded-card border p-3 text-left"
                            :style="themesChoisis.includes(t.slug)
                                ? 'border-color: var(--brand-600, #2563eb); background: color-mix(in srgb, #2563eb 6%, var(--bg))'
                                : 'border-color: var(--border)'"
                            :aria-pressed="themesChoisis.includes(t.slug)"
                            @click="basculerTheme(t.slug)">
                        <span class="font-medium">{{ t.nom }}</span>
                        <span class="block text-xs" style="color: var(--fg-muted)">
                            {{ t.questions.length }} question{{ t.questions.length > 1 ? 's' : '' }}
                        </span>
                    </button>
                </div>
            </fieldset>

            <div class="flex items-center gap-3 mt-4 flex-wrap">
                <button type="button" class="tap rounded-control bg-brand-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
                        :disabled="!themesChoisis.length" @click="commencer">
                    Commencer
                </button>
                <button type="button" class="tap text-sm text-brand-600 hover:underline" @click="toutCocher">
                    Tout sélectionner
                </button>
            </div>
        </div>

        <!-- 2. Questions -->
        <div v-else-if="etape === 'questions' && questionCourante">
            <p class="text-xs" style="color: var(--fg-muted)">
                Question {{ index + 1 }} sur {{ questions.length }} · {{ questionCourante.themeNom }}
            </p>

            <fieldset class="border-0 p-0 m-0 mt-2">
                <legend class="sr-only">{{ questionCourante.intitule }}</legend>

                <h2 ref="enonce" tabindex="-1" aria-live="polite" class="text-lg font-semibold">
                    {{ questionCourante.intitule }}
                </h2>
                <p v-if="questionCourante.precision" class="text-sm mt-2" style="color: var(--fg-muted)">
                    {{ questionCourante.precision }}
                </p>

                <!-- Les candidats ne sont PAS montrés ici : sinon on répond à l'étiquette
                     et non au contenu. Ils apparaissent au résultat. -->
                <div class="mt-4 space-y-2">
                    <button v-for="o in questionCourante.optionsMelangees" :key="o.ref" type="button"
                            class="tap w-full rounded-card border p-3 text-left hover:border-brand-400"
                            style="border-color: var(--border)"
                            @click="repondre(o.ref)">
                        {{ o.libelle }}
                    </button>
                </div>
            </fieldset>

            <div class="flex items-center justify-between gap-3 mt-4">
                <button type="button" class="tap text-sm hover:underline disabled:opacity-40"
                        style="color: var(--fg-muted)" :disabled="index === 0" @click="precedente">
                    ← Précédente
                </button>
                <button type="button" class="tap text-sm hover:underline" style="color: var(--fg-muted)"
                        @click="repondre(null)">
                    Sans avis →
                </button>
            </div>
        </div>

        <!-- 3. Résultat -->
        <div v-else-if="etape === 'resultat'">
            <h2 class="text-lg font-semibold">Les positions que vous avez retenues</h2>
            <p class="text-sm mt-1 mb-4" style="color: var(--fg-muted)">
                Pas de score, pas de classement : voici ce que vous avez choisi, et qui le
                défend. Un candidat qui ne figure pas sous une position ne s'y oppose pas
                forcément — le plus souvent, nous n'avons pas encore dépouillé de prise de
                parole de sa part sur ce point.
            </p>

            <div v-if="!resultat.length" class="rounded-card border p-4 text-sm"
                 style="border-color: var(--border); color: var(--fg-muted)">
                Vous n'avez retenu aucune position.
            </div>

            <div v-for="bloc in resultat" :key="bloc.theme" class="mb-5">
                <h3 class="font-semibold">{{ bloc.theme }}</h3>
                <div v-for="(c, i) in bloc.choix" :key="i"
                     class="rounded-card border p-3 mt-2" style="border-color: var(--border)">
                    <p class="text-xs" style="color: var(--fg-muted)">{{ c.intitule }}</p>
                    <p class="font-medium mt-1">{{ c.option.libelle }}</p>

                    <p v-if="!c.option.candidats.length" class="text-sm mt-2" style="color: var(--fg-muted)">
                        Aucun candidat publié ne porte cette position à ce jour.
                    </p>
                    <ul v-else class="flex flex-wrap gap-2 mt-2">
                        <li v-for="cand in c.option.candidats" :key="cand.slug">
                            <a :href="`/candidats/${cand.slug}/`"
                               class="tap inline-flex items-center gap-2 rounded-control border px-2 py-1 text-sm hover:underline"
                               style="border-color: var(--border)">
                                <span class="inline-block w-2.5 h-2.5 rounded-full" aria-hidden="true"
                                      :style="{ background: cand.couleur || '#64748b' }"></span>
                                {{ nom(cand.nom) }}
                            </a>
                        </li>
                    </ul>

                    <details v-if="c.option.mesures.length" class="mt-2">
                        <summary class="text-xs cursor-pointer" style="color: var(--fg-muted)">
                            Les mesures exactes ({{ c.option.mesures.length }})
                        </summary>
                        <ul class="mt-2 space-y-1.5">
                            <li v-for="(m, j) in c.option.mesures" :key="j" class="text-sm">
                                {{ m.titre }}
                                <a v-if="m.source_url" :href="m.source_url" target="_blank" rel="nofollow noopener"
                                   class="text-brand-600 hover:underline text-xs"> source ↗</a>
                            </li>
                        </ul>
                    </details>
                </div>
            </div>

            <p v-if="nbSansAvis" class="text-sm" style="color: var(--fg-muted)">
                {{ nbSansAvis }} question{{ nbSansAvis > 1 ? 's' : '' }} sans avis.
            </p>

            <button type="button" class="tap rounded-control border px-4 py-2 text-sm mt-3"
                    style="border-color: var(--border)" @click="recommencer">
                Recommencer
            </button>

            <!-- Le meilleur moment pour proposer le jeu : on vient de lire des positions
                 et de découvrir qui les porte. -->
            <div class="rounded-card border p-4 mt-6" style="border-color: var(--border)">
                <p class="font-medium">Vous connaissez leurs positions&nbsp;?</p>
                <p class="text-sm mt-1" style="color: var(--fg-muted)">
                    Vingt phrases réellement prononcées, à attribuer. Correction immédiate.
                </p>
                <a href="/jeu/" class="tap inline-block rounded-control bg-brand-600 text-white px-4 py-2 text-sm font-medium mt-3">
                    Jouer à « Qui a dit quoi ? »
                </a>
            </div>
        </div>
    </div>
</template>
