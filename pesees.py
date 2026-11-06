"""Les pesées notées à la main (balance « normale » cochée sur la carte du dresseur), dans data/pesees.json de chaque joueur.

Une pesée notée devient une vraie pesée de la journée (`fusionner`) : le poids, la masse grasse, le bilan et le bonus du matin n'ont aucune règle à part.
Une seule par jour : en noter une autre la remplace, pour pouvoir corriger une faute de frappe.
"""

FICHIER = "data/pesees.json"
KG_MIN, KG_MAX = 20, 300
GRAS_MIN, GRAS_MAX = 3, 70


def noter(fichier, quand, kg, gras=None):
    """Le nouveau contenu du fichier, avec la pesée de ce moment (quand : date et heure locales, avec son fuseau). ValueError si le chiffre n'a pas de sens."""
    if not KG_MIN <= kg <= KG_MAX:
        raise ValueError("poids")
    if gras is not None and not GRAS_MIN <= gras <= GRAS_MAX:
        raise ValueError("masse grasse")
    jour = quand.date().isoformat()
    lignes = [p for p in (fichier or {}).get("pesees") or [] if p.get("jour") != jour]
    lignes.append({"jour": jour, "quand": quand.isoformat(), "heures": quand.hour, "minutes": quand.minute, "kg": round(float(kg), 1), **({"gras": round(float(gras), 1)} if gras is not None else {})})
    return {"pesees": sorted(lignes, key=lambda p: p["jour"])}


def du_jour(fichier, jour):
    """La pesée notée ce jour-là, ou None."""
    return next((p for p in (fichier or {}).get("pesees") or [] if p.get("jour") == str(jour)), None)


def fusionner(resumes, fichier):
    """Les résumés par jour, avec les pesées notées à la main, au format de Google (le fichier reçu n'est pas modifié)."""
    lignes = (fichier or {}).get("pesees") or []
    if not lignes:
        return resumes
    sortie = dict(resumes)
    for p in lignes:
        r = dict(sortie.get(p["jour"]) or {})
        temps = {"physicalTime": p["quand"], "civilTime": {"time": {"hours": p["heures"], "minutes": p["minutes"]}}}
        r["weight"] = [*(r.get("weight") or []), {"weight": {"sampleTime": temps, "weightGrams": round(p["kg"] * 1000)}}]
        if p.get("gras") is not None:
            r["body-fat"] = [*(r.get("body-fat") or []), {"bodyFat": {"sampleTime": temps, "percentage": p["gras"]}}]
        sortie[p["jour"]] = r
    return sortie
