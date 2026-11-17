#!/data/data/com.termux/files/usr/bin/bash
# « Claude direct » sur le téléphone : installe, dans Termux, un petit Linux (Ubuntu de proot-distro), le Claude Code
# officiel d'Anthropic dedans, et le relais vocal de la montre (relais.py). À lancer dans Termux (version F-Droid) :
#     bash installer-telephone.sh
# Ensuite : `claude-connexion` (une fois, pour se connecter à son compte Claude), puis `claude-montre` (lance le
# relais ; laisser Termux ouvert en fond). Tout vient des sources officielles : paquets de Termux, Ubuntu, claude.ai.
# Relancer ce script ne casse rien (il met à jour).
set -e
DEPOT=https://raw.githubusercontent.com/kikitmt-bit/sante-appli/main/montre/relais

echo
echo "== 1/4  Termux à jour (quelques minutes) =="
pkg update -y -o Dpkg::Options::="--force-confold" </dev/null
pkg upgrade -y -o Dpkg::Options::="--force-confold" </dev/null
pkg install -y proot-distro curl </dev/null

echo
echo "== 2/4  Ubuntu =="
if proot-distro login ubuntu -- true </dev/null 2>/dev/null; then
    echo "déjà installé"
else
    proot-distro install ubuntu </dev/null
fi

echo
echo "== 3/4  Claude Code et Python dans Ubuntu (quelques minutes, sans rien afficher par moments) =="
proot-distro login ubuntu -- bash -c '
    set -e
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -y
    apt-get install -y curl ca-certificates python3
    curl -fsSL https://claude.ai/install.sh | bash
    grep -q ".local/bin" ~/.bashrc 2>/dev/null || echo "export PATH=\"\$HOME/.local/bin:\$PATH\"" >> ~/.bashrc
    export PATH="$HOME/.local/bin:$PATH"
    claude --version
' </dev/null

echo
echo "== 4/4  Le relais de la montre =="
mkdir -p "$HOME/montre"
curl -fsSL "$DEPOT/relais.py" -o "$HOME/montre/relais.py"

# Se connecter à son compte Claude (une fois)
cat > "$PREFIX/bin/claude-connexion" <<'EOF'
#!/data/data/com.termux/files/usr/bin/bash
echo "Une adresse va s'afficher : ouvre-la dans le navigateur (appui long sur l'écran, Plus, Sélectionner l'URL),"
echo "connecte-toi à ton compte Claude, puis colle ici le code que la page te donne."
echo
exec proot-distro login ubuntu -- bash -c 'export PATH="$HOME/.local/bin:$PATH"; claude auth login --claudeai'
EOF

# Lancer le relais (à laisser tourner) ; il reprend la dernière version du relais s'il y a du réseau
cat > "$PREFIX/bin/claude-montre" <<'EOF'
#!/data/data/com.termux/files/usr/bin/bash
curl -fsS --max-time 8 https://raw.githubusercontent.com/kikitmt-bit/sante-appli/main/montre/relais/relais.py -o "$HOME/montre/relais.py.neuf" \
    && mv "$HOME/montre/relais.py.neuf" "$HOME/montre/relais.py"
echo "Relais de la montre : laisse Termux ouvert en fond. Pour arrêter : Ctrl + C."
exec proot-distro login ubuntu --bind "$HOME/montre:/montre" -- bash -c 'export PATH="$HOME/.local/bin:$PATH"; exec python3 /montre/relais.py --local'
EOF

# Essai sans la montre : une question, la réponse et les temps
cat > "$PREFIX/bin/claude-essai" <<'EOF'
#!/data/data/com.termux/files/usr/bin/bash
exec proot-distro login ubuntu --bind "$HOME/montre:/montre" -- bash -c 'export PATH="$HOME/.local/bin:$PATH"; exec python3 /montre/relais.py --local --essai "Quelle est la capitale du Canada ?" "Et combien d habitants ?"'
EOF
chmod +x "$PREFIX/bin/claude-connexion" "$PREFIX/bin/claude-montre" "$PREFIX/bin/claude-essai"

echo
echo "== Installé. =="
echo "Maintenant, tape :   claude-connexion"
echo "puis :               claude-montre"
