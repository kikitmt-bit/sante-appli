"""Serveur d'essai de « La Rivière » : python riviere/serveur.py [port]
La page est assemblée à chaque chargement (on retouche un fichier, on recharge). ?niveau=<nom> choisit le niveau."""
import http.server
import importlib
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
        try:
            octets = page.page(donnees={"lien": lien_local()}, niveau=(parse_qs(urlparse(self.path).query).get("niveau") or ["kanto-1km"])[0]).encode("utf-8")
        except Exception as e:  # un fichier mal écrit : on le dit dans la page
            octets = f"<pre>Erreur : {e}</pre>".encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(octets)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(octets)

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    http.server.ThreadingHTTPServer(("127.0.0.1", int(sys.argv[1]) if len(sys.argv) > 1 else 8780), H).serve_forever()
