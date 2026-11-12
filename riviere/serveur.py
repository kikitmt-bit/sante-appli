"""Serveur d'essai de « La Rivière » : python riviere/serveur.py [port]
La page est assemblée à chaque chargement (on retouche un fichier, on recharge). ?niveau=<nom> choisit le niveau (sinon : essai).
?pur=1 : le contrôle sans dessin (le même que les contrôles automatiques), son bilan s'affiche dans la page."""
import http.server
import importlib
import os
import sys
from pathlib import Path
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent))
import page  # noqa: E402


def lien_local():
    """Pour essayer avec la vraie montre sur ce PC : le même lien que l'appli, calculé avec la clé de montre/secret.properties (jamais publiée)."""
    import hashlib
    f = Path(__file__).resolve().parent.parent / "montre" / "secret.properties"
    cle = next((l.split("=", 1)[1].strip() for l in f.read_text(encoding="utf-8").splitlines() if l.startswith("JEU_CLE=")), "") if f.exists() else ""
    return hashlib.sha256(f"rameur|{cle}|kiki".encode()).hexdigest()[:20] if cle else None


class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if urlparse(self.path).path != "/":
            self.send_error(404)
            return
        importlib.reload(page)
        q = parse_qs(urlparse(self.path).query)
        niveau = (q.get("niveau") or ["essai"])[0]
        try:
            if q.get("pur"):
                js = page.controle(niveau).split("\n", 2)[2]  # sans les faux « window » et « document » : ici, il y a un vrai navigateur
                octets = ("<!doctype html><meta charset='utf-8'><pre id='b'>…</pre><script>\"use strict\";\n" + js.replace("</", "<\\/")
                          + "\ndocument.getElementById('b').textContent = JSON.stringify(globalThis.__bilan, null, 1);</script>").encode("utf-8")
            else:
                octets = page.page(donnees={"lien": lien_local(), "force": bool(q.get("niveau"))}, niveau=niveau).encode("utf-8")
                if q.get("cadre"):  # comme dans l'appli : la page dans un cadre (pour essayer le changement de circuit sans rechargement de l'appli)
                    import html as _html
                    octets = ("<!doctype html><meta charset='utf-8'><body style='margin:0'><iframe style='border:0;width:100vw;height:100vh' srcdoc=\"" + _html.escape(octets.decode("utf-8"), quote=True) + "\"></iframe>").encode("utf-8")
        except Exception as e:  # un fichier mal écrit : on le dit dans la page
            octets = f"<pre>Erreur : {e}</pre>".encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(octets)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(octets)

    def do_POST(self):
        """L'éditeur, sur ce PC seulement : « Écrire dans le jeu » range un circuit dans contenu/niveaux (un nom simple, jamais ailleurs)."""
        import json
        import re
        try:
            if urlparse(self.path).path != "/niveau":
                raise ValueError("adresse inconnue")
            n = json.loads(self.rfile.read(int(self.headers.get("Content-Length") or 0)).decode("utf-8"))
            nom = re.sub(r"[^a-z0-9-]", "", str(n.get("id", "")).lower())[:40]
            if not nom or not isinstance(n.get("pieces"), list):
                raise ValueError("ce n'est pas un circuit")
            n["id"] = nom
            f = Path(__file__).resolve().parent / "contenu" / "niveaux" / (nom + ".json")
            f.write_text(json.dumps(n, ensure_ascii=False, indent=1), encoding="utf-8")
            texte = f"Écrit : contenu/niveaux/{nom}.json (il sera dans le jeu au prochain envoi sur GitHub)."
        except Exception as e:
            texte = f"Échec : {e}"
        octets = texte.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(octets)))
        self.end_headers()
        self.wfile.write(octets)

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    port = int(os.environ.get("PORT") or (sys.argv[1] if len(sys.argv) > 1 else 8780))  # PORT : le port que donne l'appli Claude quand le 8780 est pris
    http.server.ThreadingHTTPServer(("127.0.0.1", port), H).serve_forever()
