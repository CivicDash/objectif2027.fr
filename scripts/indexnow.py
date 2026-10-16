#!/usr/bin/env python3
"""
Signale aux moteurs IndexNow (Bing, et par lui Qwant, Ecosia, DuckDuckGo ; Yandex, Seznam,
Naver…) les pages modifiées par une reconstruction du site.

Usage : indexnow.py ANCIEN_SITE NOUVEAU_SITE
  Compare les pages des deux versions publiées et envoie les adresses nouvelles, modifiées
  ou retirées. Sans version précédente (premier passage) ou avec INDEXNOW_TOUT=1, envoie
  tout le sitemap. INDEXNOW_ESSAI=1 affiche les adresses sans rien envoyer.

Seules les adresses du sitemap partent : ce sont les adresses canoniques. La clé est le
fichier `<clé>.txt` servi à la racine du site (public/), comme le prévoit le protocole.
Un échec ne bloque jamais la mise en ligne : le script écrit une ligne de journal et rend 0.
"""
import hashlib
import json
import os
import re
import sys
import urllib.request

HOTE = 'objectif2027.fr'
BASE = f'https://{HOTE}'
API = 'https://api.indexnow.org/indexnow'
# Les noms des fichiers construits changent à chaque build sans que la page change.
ACTIFS = re.compile(rb'/_astro/[^"\')\s]+|/pagefind/[^"\')\s]+')


def cle(site: str) -> str | None:
    for nom in os.listdir(site):
        m = re.fullmatch(r'([0-9a-f]{32})\.txt', nom)
        if m and open(os.path.join(site, nom), encoding='utf-8').read().strip() == m.group(1):
            return m.group(1)
    return None


def sitemap(site: str) -> set[str]:
    chemin = os.path.join(site, 'sitemap.xml')
    if not os.path.isfile(chemin):
        return set()
    return set(re.findall(r'<loc>([^<]+)</loc>', open(chemin, encoding='utf-8').read()))


def empreintes(site: str) -> dict[str, str]:
    """Adresse → empreinte du HTML, noms de fichiers construits neutralisés."""
    pages = {}
    for dossier, _, fichiers in os.walk(site):
        if 'index.html' not in fichiers:
            continue
        rel = os.path.relpath(dossier, site)
        url = BASE + '/' + ('' if rel == '.' else rel.strip('/') + '/')
        html = open(os.path.join(dossier, 'index.html'), 'rb').read()
        pages[url] = hashlib.sha1(ACTIFS.sub(b'', html)).hexdigest()
    return pages


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__)
        return 0
    ancien, nouveau = sys.argv[1], sys.argv[2]
    k = cle(nouveau)
    if not k:
        print('indexnow : aucune clé publiée à la racine du site, rien envoyé')
        return 0

    canoniques = sitemap(nouveau)
    if not os.path.isdir(ancien) or os.environ.get('INDEXNOW_TOUT'):
        urls = sorted(canoniques)
    else:
        avant, apres = empreintes(ancien), empreintes(nouveau)
        modifiees = {u for u, h in apres.items() if avant.get(u) != h} & canoniques
        retirees = sitemap(ancien) - canoniques
        urls = sorted(modifiees | retirees)

    if not urls:
        print('indexnow : aucune page modifiée')
        return 0

    if os.environ.get('INDEXNOW_ESSAI'):
        print(f'indexnow (essai, rien envoyé) : {len(urls)} adresse(s)')
        print('\n'.join(urls[:20]))
        return 0

    corps = json.dumps({'host': HOTE, 'key': k, 'keyLocation': f'{BASE}/{k}.txt', 'urlList': urls[:10000]}).encode()
    requete = urllib.request.Request(API, data=corps, method='POST',
                                     headers={'Content-Type': 'application/json; charset=utf-8'})
    try:
        with urllib.request.urlopen(requete, timeout=20) as r:
            print(f'indexnow : {len(urls)} adresse(s) envoyée(s), réponse {r.status}')
    except urllib.error.HTTPError as e:
        print(f'indexnow : {len(urls)} adresse(s), refus {e.code} {e.reason}')
    except Exception as e:  # réseau : on n'empêche pas la mise en ligne
        print(f'indexnow : envoi impossible ({e.__class__.__name__}: {e})')
    return 0


if __name__ == '__main__':
    sys.exit(main())
