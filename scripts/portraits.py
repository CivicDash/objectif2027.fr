#!/usr/bin/env python3
"""Rapatrie les portraits des candidats et les redimensionne, avant le build Astro.

Les fiches pointaient directement les fichiers de Wikimedia Commons : des JPEG de 300 à
500 px de large pour des pastilles de 48 px, chargés depuis un tiers à chaque visite.
Conséquences observées en production : des portraits qui arrivent avec plusieurs secondes
de retard, d'autres jamais, et une grille de cartes visuellement dépareillée. S'y ajoute
une dépendance à un service extérieur pour afficher le visage d'un candidat, et une fuite
de l'adresse IP du visiteur vers ce service — contraire à la promesse de la page
« aucun script tiers ».

Le script télécharge une fois, recadre en carré, produit un fichier de 96 px (le double de
la taille d'affichage, pour les écrans à forte densité), puis réécrit `photo.url` dans les
données exportées. Idempotent : une image déjà rapatriée depuis la même source n'est pas
retéléchargée.

Le crédit et la licence portés par `photo` ne sont PAS touchés : rapatrier une image ne
dispense pas de dire d'où elle vient.
"""
import hashlib
import io
import json
import pathlib
import sys
import urllib.request

RACINE = pathlib.Path('/opt/objectif2027')
SOURCES = RACINE / 'src/data/candidats'
SORTIE = RACINE / 'public/portraits'
MANIFESTE = SORTIE / '.sources.json'
TAILLES = (96, 256)   # pastille de carte, et carte de jeu
AGENT = 'objectif2027.fr (association Civis-Consilium ; contact@civis-consilium.eu)'

try:
    from PIL import Image
except ImportError:
    print('portraits : Pillow absent, étape ignorée (les URL distantes restent en place)')
    sys.exit(0)


def telecharger(url: str) -> bytes:
    requete = urllib.request.Request(url, headers={'User-Agent': AGENT})
    with urllib.request.urlopen(requete, timeout=20) as reponse:
        return reponse.read()


def carre(donnees: bytes, taille: int) -> bytes:
    image = Image.open(io.BytesIO(donnees))
    if image.mode not in ('RGB', 'L'):
        image = image.convert('RGB')
    # Recadrage centré sur le côté le plus court : un portrait tronqué en haut couperait
    # le visage, qui est presque toujours dans le tiers supérieur.
    largeur, hauteur = image.size
    cote = min(largeur, hauteur)
    gauche = (largeur - cote) // 2
    haut = min((hauteur - cote) // 2, largeur // 8) if hauteur > largeur else (hauteur - cote) // 2
    image = image.crop((gauche, haut, gauche + cote, haut + cote))
    image = image.resize((taille, taille), Image.LANCZOS)
    tampon = io.BytesIO()
    image.save(tampon, format='JPEG', quality=82, optimize=True, progressive=True)
    return tampon.getvalue()


def main() -> int:
    if not SOURCES.is_dir():
        print('portraits : aucune donnée candidat, étape ignorée')
        return 0

    SORTIE.mkdir(parents=True, exist_ok=True)
    deja = json.loads(MANIFESTE.read_text()) if MANIFESTE.exists() else {}
    nouveau = {}
    rapatries = echecs = inchanges = 0

    for fichier in sorted(SOURCES.glob('*.json')):
        donnees = json.loads(fichier.read_text(encoding='utf-8'))
        photo = donnees.get('photo') or {}
        url = photo.get('url')
        slug = donnees.get('slug') or fichier.stem
        if not url or url.startswith('/'):
            continue

        cible = SORTIE / f'{slug}.jpg'
        empreinte = hashlib.sha256(url.encode()).hexdigest()[:16]

        if deja.get(slug) == empreinte and cible.exists() and (SORTIE / f'{slug}@256.jpg').exists():
            inchanges += 1
        else:
            try:
                # Un seul téléchargement, deux tailles : 96 px pour les pastilles de
                # cartes candidat, 256 px pour les cartes du jeu « Qui a dit quoi ? ».
                brut = telecharger(url)
                cible.write_bytes(carre(brut, 96))
                (SORTIE / f'{slug}@256.jpg').write_bytes(carre(brut, 256))
                rapatries += 1
            except Exception as erreur:
                # Un portrait indisponible ne doit pas faire échouer la mise en ligne :
                # la carte retombe sur les initiales, qui sont toujours dessous.
                print(f'portraits : {slug} — échec ({type(erreur).__name__}), URL distante conservée')
                echecs += 1
                continue

        nouveau[slug] = empreinte
        locale = f'/portraits/{slug}.jpg'

        # Réécriture dans les deux copies : `src/data` alimente le build, `public/data`
        # est servi tel quel aux clients de l'API statique.
        for base in (RACINE / 'src/data/candidats', RACINE / 'public/data/candidats'):
            f = base / fichier.name
            if not f.exists():
                continue
            d = json.loads(f.read_text(encoding='utf-8'))
            if (d.get('photo') or {}).get('url'):
                d['photo']['url'] = locale
                f.write_text(json.dumps(d, ensure_ascii=False, indent=4), encoding='utf-8')

    MANIFESTE.write_text(json.dumps(nouveau, indent=2), encoding='utf-8')
    print(f'portraits : {rapatries} rapatrié(s), {inchanges} inchangé(s), {echecs} échec(s) '
          f'— {"/".join(str(t) for t in TAILLES)}px, servis depuis /portraits/')
    return 0


if __name__ == '__main__':
    sys.exit(main())
