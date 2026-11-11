/* ============ la montre : chaque geste reconnu au poignet (un coup de rame, un tour d'elliptique) arrive ici, en direct ============ */
// La montre (appli « Capteurs », Rameur, ● Enregistrer) envoie ses coups sur deux relais publics (MQTT) ; la page écoute les deux par WebSocket
// et ne garde chaque coup qu'une fois (numéro du coup). Le sujet = D.lien (le même nom que l'ancien lien téléphone → tablette). Sans lien : rien.
const MONTRE = {n: 0, vu: 0, h: 0, coups: 0, rattrapes: 0, suivi: false, sujet: (PARAMS.get("lien") || D.lien) ? "pokefit/" + MACHINE_NOM + "/" + (PARAMS.get("lien") || D.lien) : null};
const RELAIS = ["wss://broker.hivemq.com:8884/mqtt", "wss://broker.emqx.io:8084/mqtt"];

/* un client MQTT 3.1.1 minimal : se connecter, s'abonner, recevoir ; il se reconnecte tout seul */
function ecouterRelais(url) {
  const enc = new TextEncoder(), dec = new TextDecoder();
  const lg = n => { const o = []; do { let d = n % 128; n = Math.floor(n / 128); if (n) d |= 128; o.push(d); } while (n); return o; };
  const ch = s => { const b = enc.encode(s); return [b.length >> 8, b.length & 255, ...b]; };
  const paquet = (type, corps) => new Uint8Array([type, ...lg(corps.length), ...corps]);
  let ws, ping, tampon = new Uint8Array(0);
  const ouvrir = () => {
    try { ws = new WebSocket(url, "mqtt"); } catch (e) { setTimeout(ouvrir, 5000); return; }
    ws.binaryType = "arraybuffer";
    ws.onopen = () => {
      ws.send(paquet(0x10, [...ch("MQTT"), 4, 2, 0, 60, ...ch("pokefit-jeu-" + Math.random().toString(36).slice(2, 10))]));
      ws.send(paquet(0x82, [0, 1, ...ch(MONTRE.sujet), 0]));
      ping = setInterval(() => { try { ws.send(new Uint8Array([0xC0, 0])); } catch (e) {} }, 30000);
    };
    ws.onmessage = e => {   // les paquets peuvent arriver coupés ou collés : on les recolle, puis on les lit un par un
      const b = new Uint8Array(e.data), t = new Uint8Array(tampon.length + b.length); t.set(tampon); t.set(b, tampon.length); tampon = t;
      for (;;) {
        let i = 1, n = 0, m = 1, d; do { if (i >= tampon.length) return; d = tampon[i++]; n += (d & 127) * m; m *= 128; } while (d & 128);
        if (tampon.length < i + n) return;
        const tete = tampon[0], p = tampon.slice(i, i + n), type = tete >> 4; tampon = tampon.slice(i + n);
        if (type === 3) { const l = (p[0] << 8) | p[1], q = (tete >> 1) & 3; try { recu(JSON.parse(dec.decode(p.subarray(2 + l + (q ? 2 : 0))))); } catch (x) {} }
      }
    };
    ws.onclose = () => { clearInterval(ping); tampon = new Uint8Array(0); setTimeout(ouvrir, 4000); };
    ws.onerror = () => { try { ws.close(); } catch (e) {} };
  };
  ouvrir();
}

/* un message de la montre : son état (toutes les 5 s) ou un geste. Chaque geste porte son numéro : si des messages se sont perdus
   en route (les deux relais à la fois), le trou se voit et les gestes manquants sont rattrapés, sans éclaboussure : la distance reste juste. */
function rattraper(n) {
  const manque = n - MONTRE.n; MONTRE.n = n;
  if (!MONTRE.suivi || manque < 1 || manque > 12) return 0;   // au premier contact, ou après un trop grand trou : on repart de ce numéro, sans rien inventer
  MONTRE.coups += manque; MONTRE.rattrapes += manque; for (let k = 0; k < manque; k++) coup(.5, true);
  return manque;
}
function recu(m) {
  if (!m) return;   // jamais de tri à l'heure : les relais ne gardent rien, et l'horloge du PC de Kiki avait 14 s d'avance le 11/11
  MONTRE.vu = performance.now(); if (m.h) MONTRE.h = m.h;
  const n = +m.n || 0;
  if (m.k === "etat" || m.k === "fin") {
    if (n < MONTRE.n - 3) MONTRE.n = n;          // une nouvelle séance sur la montre : ses gestes repartent de 1
    else if (n > MONTRE.n) rattraper(n);
    MONTRE.suivi = true; return;
  }
  if (m.k !== "coup" && m.k !== "tour") return;
  if (n <= MONTRE.n && MONTRE.n - n < 50) return;   // déjà reçu par l'autre relais (ou déjà rattrapé)
  if (n > MONTRE.n + 1) rattraper(n - 1);
  MONTRE.n = n; MONTRE.suivi = true; MONTRE.coups++;
  S.auto = false; majAuto();
  coup(clamp(.6 + ((+m.f || 1.9) - 1.9) * .8, .3, 1));   // la force relative du geste (vers 1,9 d'habitude), lue au poignet : elle compte peu
}

/* l'état à l'écran : la montre est-elle là ? */
function majMontre() {
  const el = $("hMontre"); if (!el) return;
  const la = MONTRE.vu && performance.now() - MONTRE.vu < 12000;
  el.classList.toggle("la", !!la);
  el.textContent = la ? "MONTRE RELIÉE" : "Montre : ouvre « Capteurs », " + MACHINE.nom + ", ● Enregistrer";
}
if (MONTRE.sujet) { $("hMontre").hidden = false; RELAIS.forEach(ecouterRelais); majMontre(); setInterval(majMontre, 1000); }
window.__montre = () => Object.assign({}, MONTRE);
