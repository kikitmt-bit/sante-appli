"""L'écran « Calibrage » de ⚙️ : Kiki seul (app.py le garde derrière `if not AMI`). Les calculs sont dans calibrage.py."""
import datetime as dt

import pandas as pd
import streamlit as st

import amis
import calibrage
import pokemon
from chiffres import JOURS

COLONNES = {"jour": "Jour", "pas": "Pas", "km": "Km", "sport": "Min de sport", "seance_max": "Plus longue séance", "force": "Muscu / rameur", "etages": "Étages",
            "pompes": "Pompes", "tractions": "Tractions", "squats": "Squats", "pts_pas": "Pts pas", "pts_sport": "Pts sport", "pts_etages": "Pts étages",
            "pts_seance": "Pts séances", "pts_bonus": "Pts bonus", "super": "Super", "hyper": "Hyper", "mission_titre": "Mission", "mission_ok": "Réussie",
            "balls_poke": "Poké Balls", "balls_super": "Super Balls", "balls_hyper": "Hyper Balls"}


def _jour(j):
    d = dt.date.fromisoformat(j)
    return f"{JOURS[d.weekday()]} {d:%d/%m}"


def afficher(lire_depot, registre, aujourd, graphique, ecrire_depot):
    """graphique et ecrire_depot : ceux de app.py."""
    st.caption("Pour régler les objectifs. Les pourcentages ne comptent ni aujourd'hui (journée pas finie), ni les jours sans données "
               "(un jour sans récolte n'est pas un jour raté). Super et Hyper Ball : l'objectif est-il atteint, même si un champion retient la ball.")
    debut_partie = pokemon.REGLAGES["debut"]
    depuis = st.date_input("Depuis le", value=debut_partie, min_value=dt.date(2026, 11, 1), max_value=aujourd, format="DD/MM/YYYY", key="calib_depuis")
    tous = amis.joueurs(registre)
    dresseurs = lire_depot([amis.DRESSEURS.format(i) for i in tous], {amis.DRESSEURS.format(i) for i in tous})
    lignes = []
    for n, (ident, debut) in enumerate(tous.items()):
        nom = (dresseurs.get(amis.DRESSEURS.format(ident)) or {}).get("nom") or ("Kiki" if ident == amis.KIKI else f"Ami {n}")
        try:
            lignes += calibrage.journal(lire_depot, ident, debut, depuis, aujourd, nom)
        except Exception as e:  # noqa: BLE001 : un joueur en panne ne cache pas les autres
            st.warning(f"{nom} : lecture impossible ({str(e)[:120]})")
    if not lignes:
        return st.info("Rien à montrer pour l'instant.")

    st.markdown("**Qui réussit quoi**")
    st.dataframe(pd.DataFrame(calibrage.taux(lignes)), hide_index=True, width="stretch")

    jours = calibrage.par_jour(lignes)
    if jours:
        d = pd.DataFrame(jours).T.sort_index()
        d.index = [_jour(j) for j in d.index]
        for cle, nom, couleur in (("super", "la Super Ball", "#40A8F8"), ("hyper", "l'Hyper Ball", "#B05010")):
            if d[cle].sum():
                graphique(d, cle, f"Joueurs qui ont atteint {nom}", couleur=couleur, hauteur=130, reperes=7)
            else:
                st.caption(f"Personne n'a encore atteint {nom} sur cette période.")

    st.markdown("**Ratés de peu** (au moins 80 % du seuil)")
    rates = calibrage.rates_de_peu(lignes)
    if rates:
        st.dataframe(pd.DataFrame(rates), hide_index=True, width="stretch")
    else:
        st.caption("Aucun pour l'instant.")

    st.markdown("**Les missions**")
    tableau = calibrage.missions_tableau(lignes)
    if tableau:
        st.dataframe(pd.DataFrame(tableau), hide_index=True, width="stretch")
    else:
        st.caption("Aucune mission sur cette période.")

    st.markdown("**Chaque joueur, jour par jour**")
    for nom in dict.fromkeys(x["joueur"] for x in lignes):
        with st.expander(nom):
            d = pd.DataFrame([x for x in lignes if x["joueur"] == nom])
            courbes = d.set_index(d["jour"].map(_jour))
            graphique(courbes, "pas", "Pas (trait : 5 000)", objectif=pokemon.REGLAGES["objectif_pas"], hauteur=130, reperes=7)
            graphique(courbes, "sport", "Minutes de sport (trait : 10)", objectif=pokemon.REGLAGES["objectif_zone"], couleur="#B05010", hauteur=130, reperes=7)
            d["jour"] = d["jour"].map(_jour)
            st.dataframe(d[list(COLONNES)].rename(columns=COLONNES), hide_index=True, width="stretch")

    tout = pd.DataFrame(lignes)
    st.download_button("⬇️ Tout télécharger (CSV)", tout.to_csv(index=False).encode("utf-8-sig"), f"calibrage-{aujourd}.csv", "text/csv", key="calib_csv")
    st.caption("Avant un reset : les chiffres se recalculent toujours, mais pas les balls vraiment sorties. Garde une copie pour les retrouver.")
    if st.button("📦 Garder une copie de cette période", key="calib_copie"):
        chemin = calibrage.COPIE.format(pokemon.REGLAGES["partie"], aujourd)
        if ecrire_depot(chemin, {"partie": pokemon.REGLAGES["partie"], "depuis": str(depuis), "ecrit": str(aujourd), "lignes": lignes}, "copie du calibrage"):
            st.success(f"Copie gardée dans le dépôt privé : {chemin}")
        else:
            st.error("Copie impossible : réessaie dans un instant.")
