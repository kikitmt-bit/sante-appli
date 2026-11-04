"""La liste des régions du jeu, dans l'ordre du voyage. Une région commence le lendemain de l'appel du professeur de la précédente (pokemon.jouer)."""
import johto
import kanto

REGIONS = [kanto.REGION, johto.REGION]
RARES = set().union(*(r.rares for r in REGIONS))  # les Pokémon rares (⭐), toutes régions confondues
