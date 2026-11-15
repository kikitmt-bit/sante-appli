/* ============ Ronflex dort sur la route (15/11, étape 6 du plan) ============ */
// Dans un niveau : {"o": "ronflex", "cote": "c", "a": 60} (au milieu de la piste). Il dort ; quand tu arrives, le jeu te demande de forcer
// plus que ta croisière (jeu/effort.js) : réussi, il se réveille, bâille et s'en va sur la rive ; raté, tu rebondis sur son ventre.
// Les vrais chiffres ne changent jamais : il ne ralentit personne. Le jeu (jeu/rencontres.js) lit RENCONTRES, rempli ici à la pose du décor.
const RENCONTRES = [];
Object.assign(RAYON, {ronflex: 2.4});
Object.assign(EVENEMENTS, {ronflex: "saut"});   // tant qu'il dort, ton Pokémon (ou ton vélo) rebondit dessus ; réveillé, il libère le passage
Object.assign(OBJETS, {
  ronflex(F, o, R, K) {
    K.sprite(F, "0143/Sleep", Object.assign({}, o, {taille: o.taille || .7}));   // couché, un peu moins haut que debout (2,1 m)
    RENCONTRES.push({type: "ronflex", s: o._s, x: F.ox, y: F.oy, z: F.oz, e: o._e || 0, vo: o._vo || 0});   // vo : dans une fourche, la voie où il dort
  },
});
