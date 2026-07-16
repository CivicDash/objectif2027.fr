#!/bin/bash
# ============================================================================
# Rebuild automatique d'objectif2027.fr quand le contenu publié change.
# Lancé par cron (voir /etc/cron.d/objectif2027-rebuild). Idempotent :
#  1. Regénère l'export presidentielle (refusé si violation d'intégrité).
#  2. Compare le content_hash (déterministe) avec celui déployé.
#  3. Si changé : copie les données, build Astro (conteneur transitoire),
#     swap /var/www/objectif2027.fr/site (rollback = teaser dans /public).
# ============================================================================
set -uo pipefail
LOCK=/tmp/objectif2027-rebuild.lock
exec 9>"$LOCK"; flock -n 9 || exit 0

FRONT=/opt/objectif2027
SITE=/var/www/objectif2027.fr/site

cd /opt/civicdash-prod
if ! docker compose exec -T app php artisan presidentielle:export >/tmp/o2027-export.log 2>&1; then
    echo "$(date -Is) EXPORT REFUSÉ (intégrité ?) — site inchangé :"
    tail -5 /tmp/o2027-export.log
    exit 1
fi

NEW=$(docker compose exec -T app sh -c 'cat storage/app/presidentielle/dist/meta.json' 2>/dev/null \
      | python3 -c "import json,sys;print(json.load(sys.stdin)['content_hash'])" 2>/dev/null || echo new-fail)
CUR=$(python3 -c "import json;print(json.load(open('$FRONT/src/data/meta.json'))['content_hash'])" 2>/dev/null || echo none)

if [ "$NEW" = "$CUR" ] && [ -d "$SITE" ]; then
    exit 0  # rien à faire
fi

echo "$(date -Is) contenu modifié ($CUR -> $NEW) : rebuild…"
rm -rf "$FRONT/src/data/candidats"
docker cp cd_prod_app:/app/storage/app/presidentielle/dist/. "$FRONT/src/data/"
cp "$FRONT"/src/data/*.json "$FRONT/public/data/"
rm -rf "$FRONT/public/data/candidats"
cp -r "$FRONT/src/data/candidats" "$FRONT/public/data/candidats"

cd "$FRONT"
# URL de l'API CivicDash pour le formulaire « Signaler une erreur » (inlinée au build).
PUBLIC_CIVICDASH_API="${PUBLIC_CIVICDASH_API:-https://admin.objectif2027.fr}"
if ! docker run --rm -v "$FRONT":/app -w /app -e "PUBLIC_CIVICDASH_API=$PUBLIC_CIVICDASH_API" --entrypoint "" civicdash-prod:latest \
    sh -c 'npm install --no-audit --no-fund >/dev/null 2>&1 && npm run build' >/tmp/o2027-build.log 2>&1; then
    echo "$(date -Is) BUILD FRONT ÉCHOUÉ — site inchangé :"; tail -5 /tmp/o2027-build.log
    exit 1
fi

cp -a "$SITE/favicon.ico" dist/ 2>/dev/null || true
rm -rf "$SITE.new"; cp -a dist "$SITE.new"
chown -R civicdash:www-data "$SITE.new"
mv "$SITE" "$SITE.old" && mv "$SITE.new" "$SITE" && rm -rf "$SITE.old"
rm -rf "$FRONT/node_modules" "$FRONT/dist"

echo "$(date -Is) rebuild OK — en ligne (hash $NEW)"
