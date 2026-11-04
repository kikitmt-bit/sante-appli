"""Les 4 musiques de la danse au doigt (onglet Muscu, danse.js). Musiques et pas sont dans le dépôt PRIVÉ (branche « danse »), jamais dans ce dépôt public : ils sont
protégés. L'appli les lit avec son jeton et ne les sert qu'aux personnes connectées, par le lecteur audio de Streamlit (caché) : le téléphone prend l'adresse dans ce lecteur."""
import requests
import streamlit as st

CHANSONS = ("skull", "colress", "zinnia", "red")  # du plus facile au plus dur
BRANCHE = "danse"


def _fichier(nom):
    s = st.secrets
    r = requests.get(f"https://api.github.com/repos/{s['GITHUB_REPO']}/contents/danse/{nom}", params={"ref": BRANCHE}, timeout=30,
                     headers={"Authorization": f"Bearer {s['GITHUB_TOKEN']}", "Accept": "application/vnd.github.raw+json"})
    r.raise_for_status()
    return r.content


@st.cache_resource(show_spinner=False)
def _lire():
    return {c: {"sm": _fichier(f"{c}.sm").decode("utf-8", "replace"), "mp3": _fichier(f"{c}.mp3")} for c in CHANSONS}


def charger():
    """[{cle, sm, mp3}], ou [] si GitHub ne répond pas : la carte de la danse n'apparaît simplement pas (jamais gardé en cache : on réessaiera)."""
    try:
        lu = _lire()
    except (requests.RequestException, KeyError):
        return []
    return [{"cle": c, **lu[c]} for c in CHANSONS]


def lecteurs(chansons):
    """Les lecteurs audio cachés : c'est eux qui donnent au téléphone l'adresse de chaque musique."""
    with st.container(key="danse"):
        for c in chansons:
            st.audio(c["mp3"], format="audio/mpeg")
