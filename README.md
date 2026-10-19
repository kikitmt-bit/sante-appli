# Ma santé — l'appli

Appli Streamlit qui affiche mes données Google Health (jour, semaine, mois, et toutes les données brutes).
Ce dépôt ne contient **que le code** : les données sont dans un dépôt privé, lues avec un jeton rangé dans les secrets
de Streamlit, et l'appli ne montre rien sans le mot de passe.

## Mise en ligne

https://share.streamlit.io → *Create app* → dépôt `kikitmt-bit/sante-appli`, branche `main`, fichier `app.py` →
*Advanced settings* → *Secrets* :

```toml
GITHUB_TOKEN = "…"
GITHUB_REPO = "kikitmt-bit/sante"
APP_PASSWORD = "…"
```
