"""Serveur d'essai du rameur (pseudo-3D) : python rameur/serveur.py [port]
La page est assemblée à chaque chargement (on retouche un module, on recharge). Les images viennent du dossier scenes/."""
import http.server
import importlib
import json
import os
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RACINE))
os.chdir(RACINE)
import rameur_page  # noqa: E402


class H(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.split("?")[0] in ("/", "/rameur"):
            from urllib.parse import parse_qs, urlparse
            niveau = (parse_qs(urlparse(self.path).query).get("niveau") or ["ecume"])[0]
            importlib.reload(rameur_page)  # on retouche rameur_page.py : pas besoin de relancer le serveur
            octets = rameur_page.page({"lien": None, "modele": None, "progression": None}, niveau).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(octets)))
            self.end_headers()
            self.wfile.write(octets)
            return
        return super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    http.server.ThreadingHTTPServer(("127.0.0.1", int(sys.argv[1]) if len(sys.argv) > 1 else 8770), H).serve_forever()
