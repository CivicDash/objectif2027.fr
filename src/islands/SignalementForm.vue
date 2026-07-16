<script setup>
import { reactive, ref } from 'vue';

const props = defineProps({
    candidats: { type: Array, default: () => [] }, // [{ slug, nom_complet }]
    themes: { type: Array, default: () => [] },     // [{ slug, nom }]
    contentHash: { type: String, default: '' },
});

// Types d'incident — les clés DOIVENT correspondre au back-office (PresidentielleSignalement::TYPES_INCIDENT).
const TYPES = [
    { value: 'inexactitude_proposition', label: 'Inexactitude d’une proposition / mesure' },
    { value: 'source_erronee', label: 'Source erronée ou lien mort' },
    { value: 'affaire_judiciaire', label: 'Problème sur une affaire judiciaire' },
    { value: 'parcours_autre', label: 'Parcours, autre ou droit de réponse' },
];

// URL de l'API CivicDash, injectée au build (fallback = domaine du back-office).
const API_BASE = import.meta.env.PUBLIC_CIVICDASH_API || 'https://admin.objectif2027.fr';

const form = reactive({
    type_incident: '',
    candidat_slug: '',
    theme_slug: '',
    description: '',
    email: '',
    consent: false,
    site_web: '', // honeypot : doit rester vide (invisible aux humains)
});

const etat = ref('idle'); // idle | envoi | succes | erreur
const messageErreur = ref('');

async function envoyer() {
    messageErreur.value = '';
    if (!form.type_incident || form.description.trim().length < 10 || !form.consent) {
        messageErreur.value = 'Merci de choisir un type, de décrire l’erreur (10 caractères min.) et d’accepter la notice.';
        return;
    }
    etat.value = 'envoi';
    try {
        const res = await fetch(`${API_BASE}/api/v1/presidentielle/signalements`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
                type_incident: form.type_incident,
                description: form.description.trim(),
                email: form.email.trim() || null,
                candidat_slug: form.candidat_slug || null,
                theme_slug: form.theme_slug || null,
                contexte_url: typeof location !== 'undefined' ? location.href : null,
                content_hash: props.contentHash || null,
                site_web: form.site_web, // honeypot
            }),
        });
        if (res.status === 201) {
            etat.value = 'succes';
            return;
        }
        if (res.status === 429) {
            messageErreur.value = 'Trop de tentatives. Merci de réessayer dans quelques minutes.';
        } else if (res.status === 422) {
            const data = await res.json().catch(() => ({}));
            messageErreur.value = data?.message || 'Certains champs sont invalides.';
        } else {
            messageErreur.value = 'Envoi impossible pour le moment. Réessayez plus tard.';
        }
        etat.value = 'erreur';
    } catch (e) {
        messageErreur.value = 'Connexion impossible. Vérifiez votre réseau et réessayez.';
        etat.value = 'erreur';
    }
}
</script>

<template>
    <div class="max-w-xl">
        <div v-if="etat === 'succes'" class="rounded-card border p-5 text-sm" style="border-color: var(--border)">
            <p class="font-semibold text-etat-publie">Merci, votre signalement a bien été transmis.</p>
            <p class="mt-2" style="color: var(--fg-muted)">
                Il sera examiné par la modération de l’association. Si vous avez laissé un email, vous pourrez être recontacté·e.
            </p>
        </div>

        <form v-else @submit.prevent="envoyer" class="space-y-4">
            <!-- Honeypot anti-spam : masqué aux humains, laissé vide -->
            <div aria-hidden="true" style="position:absolute;left:-9999px;height:0;overflow:hidden">
                <label>Site web<input v-model="form.site_web" type="text" tabindex="-1" autocomplete="off" /></label>
            </div>

            <div>
                <label class="block text-sm font-medium mb-1">Type d’erreur *</label>
                <select v-model="form.type_incident" required
                    class="w-full rounded-control border px-3 py-2 bg-transparent" style="border-color: var(--border)">
                    <option value="" disabled>— choisir —</option>
                    <option v-for="t in TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
                </select>
            </div>

            <div class="grid sm:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium mb-1">Candidat concerné <span style="color: var(--fg-muted)">(optionnel)</span></label>
                    <select v-model="form.candidat_slug" class="w-full rounded-control border px-3 py-2 bg-transparent" style="border-color: var(--border)">
                        <option value="">— aucun / ne sais pas —</option>
                        <option v-for="c in candidats" :key="c.slug" :value="c.slug">{{ c.nom_complet }}</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">Thème concerné <span style="color: var(--fg-muted)">(optionnel)</span></label>
                    <select v-model="form.theme_slug" class="w-full rounded-control border px-3 py-2 bg-transparent" style="border-color: var(--border)">
                        <option value="">— aucun / ne sais pas —</option>
                        <option v-for="th in themes" :key="th.slug" :value="th.slug">{{ th.nom }}</option>
                    </select>
                </div>
            </div>

            <div>
                <label class="block text-sm font-medium mb-1">Description de l’erreur *</label>
                <textarea v-model="form.description" required minlength="10" maxlength="2000" rows="5"
                    placeholder="Décrivez l’erreur : ce qui est affiché, ce qui serait exact, et si possible un lien vers la source correcte."
                    class="w-full rounded-control border px-3 py-2 bg-transparent" style="border-color: var(--border)"></textarea>
                <p class="text-xs mt-1" style="color: var(--fg-muted)">{{ form.description.length }}/2000</p>
            </div>

            <div>
                <label class="block text-sm font-medium mb-1">Votre email <span style="color: var(--fg-muted)">(optionnel — pour vous recontacter)</span></label>
                <input v-model="form.email" type="email" autocomplete="off"
                    class="w-full rounded-control border px-3 py-2 bg-transparent" style="border-color: var(--border)" />
            </div>

            <label class="flex items-start gap-2 text-sm">
                <input v-model="form.consent" type="checkbox" class="mt-1" />
                <span style="color: var(--fg-muted)">
                    Je comprends que ma description (et mon email si je le renseigne) sont transmis à l’association
                    <strong>dans le seul but de traiter ce signalement</strong>. Aucun cookie, aucun traceur, aucune mesure d’audience.
                </span>
            </label>

            <p v-if="messageErreur" class="text-sm text-etat-danger">{{ messageErreur }}</p>

            <button type="submit" :disabled="etat === 'envoi'"
                class="tap rounded-control bg-brand-600 text-white px-5 py-2.5 font-medium disabled:opacity-60">
                {{ etat === 'envoi' ? 'Envoi…' : 'Envoyer le signalement' }}
            </button>
        </form>
    </div>
</template>
