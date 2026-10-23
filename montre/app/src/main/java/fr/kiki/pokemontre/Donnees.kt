package fr.kiki.pokemontre

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

/**
 * Les données du jeu, venues du script Google (doGet ?quoi=montre) : barre d'effort et Poké Balls pas encore ouvertes.
 * Gardées sur la montre (dernière réponse) pour s'afficher tout de suite, même sans réseau.
 * Les Poké Balls ouvertes ici sont envoyées au script (?quoi=ouvrir&ou=montre) ; sans réseau, elles attendent le
 * prochain passage (liste « attente »).
 */
object Donnees {
    private const val PREFS = "pokemontre"

    data class Ball(
        val id: String, val ball: String, val raison: String, val num: Int, val nom: String,
        val types: List<String>, val shiny: Boolean, val nouvelle: Boolean, val legendaire: Boolean, val image: String,
        val jour: String = "",
    ) {
        fun bitmap(): Bitmap? = try {
            val b64 = image.substringAfter("base64,", image)
            val octets = Base64.decode(b64, Base64.DEFAULT)
            BitmapFactory.decodeByteArray(octets, 0, octets.size)
        } catch (e: Exception) { null }
    }

    data class Etat(
        val points: Float, val taille: Int, val origine: String, val balls: List<Ball>,
        val maj: String, val pas: Int, val zone: Int, val recu: Long, val derniere: Ball?,
        val jour: String, val objectifs: Objectifs?, val nuit: Nuit?, val sante: Sante?,
        val especes: Int, val totalEspeces: Int, val dernieres: List<Ball>,
        val coeur: JSONObject? = null,
    )

    /** La santé du jour d'après le site (les pas, étages, distance et calories en direct viennent de la montre). */
    data class Sante(
        val pas: Int?, val km: Double?, val kcal: Int?, val zone: Int?, val etages: Int?, val fcRepos: Int?,
        val vfc: Int?, val spo2: Int?, val minSport: Int?, val seances: Int?, val sport: String?,
    )

    /** Où on en est aujourd'hui pour les balls spéciales (règles venues du site : elles suivent toutes seules). */
    data class Objectifs(
        val pas: Int, val zone: Int, val seance: Int, val serie: Int, val serieOk: Boolean, val joker: Boolean,
        val superOk: Boolean, val hyperOk: Boolean, val shiny: Float,
        val objPas: Int, val objZone: Int, val exploitPas: Int, val exploitZone: Int, val exploitSeance: Int,
        val serieLegendaire: Int, val nuitMin: Int,
    )

    /** La nuit qui finit ce matin. */
    data class Nuit(val duree: Int, val coucher: String?, val lever: String?, val profond: Int?, val leger: Int?,
                    val paradoxal: Int?, val eveil: Int?)

    private fun JSONObject.entier(k: String): Int? = if (isNull(k) || !has(k)) null else optInt(k)

    private fun ball(b: JSONObject): Ball {
        val ts = b.optJSONArray("types") ?: JSONArray()
        return Ball(
            b.getString("id"), b.optString("ball", "poke"), b.optString("raison", ""), b.optInt("num"),
            b.optString("nom", "?"), (0 until ts.length()).map { ts.getString(it) },
            b.optBoolean("shiny"), b.optBoolean("nouvelle"), b.optBoolean("legendaire"), b.optString("image", ""),
            b.optString("jour", ""),
        )
    }

    private fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    /** Le dernier état connu, sans les Poké Balls déjà ouvertes sur la montre. */
    fun lire(ctx: Context): Etat? {
        val p = prefs(ctx)
        val texte = p.getString("json", null) ?: return null
        val ouvertes = p.getStringSet("ouvertes", emptySet())!!
        return try {
            val j = JSONObject(texte)
            val barre = j.getJSONObject("barre")
            val auj = j.optJSONObject("aujourdhui") ?: JSONObject()
            val balls = j.optJSONArray("balls") ?: JSONArray()
            Etat(
                points = barre.optDouble("points", 0.0).toFloat(),
                taille = barre.optInt("taille", 100),
                origine = barre.optString("origine", ""),
                balls = (0 until balls.length()).map { ball(balls.getJSONObject(it)) }.filter { it.id !in ouvertes },
                maj = j.optString("maj", ""),
                pas = auj.optInt("pas"), zone = auj.optInt("zone"),
                recu = p.getLong("recu", 0),
                derniere = j.optJSONObject("derniere")?.let { ball(it) },
                jour = j.optString("jour", ""),
                objectifs = j.optJSONObject("objectifs")?.let { o ->
                    val r = o.optJSONObject("regles") ?: JSONObject()
                    Objectifs(
                        o.optInt("pas"), o.optInt("zone"), o.optInt("seance"), o.optInt("serie"), o.optBoolean("serie_ok"),
                        o.optBoolean("joker"), o.optBoolean("super"), o.optBoolean("hyper"), o.optDouble("shiny", 1.0).toFloat(),
                        r.optInt("objectif_pas", 5000), r.optInt("objectif_zone", 15), r.optInt("exploit_pas", 10000),
                        r.optInt("exploit_zone", 30), r.optInt("exploit_seance", 45), r.optInt("serie_legendaire", 30),
                        r.optInt("nuit", 420),
                    )
                },
                nuit = j.optJSONObject("nuit")?.let {
                    val ph = it.optJSONObject("phases") ?: JSONObject()
                    Nuit(it.optInt("duree"), it.optString("coucher").takeIf { s -> s.isNotEmpty() && s != "null" },
                         it.optString("lever").takeIf { s -> s.isNotEmpty() && s != "null" },
                         ph.entier("profond"), ph.entier("leger"), ph.entier("paradoxal"), ph.entier("eveil"))
                },
                sante = j.optJSONObject("sante")?.let {
                    Sante(it.entier("pas"), if (it.isNull("km")) null else it.optDouble("km"), it.entier("kcal"),
                          it.entier("zone"), it.entier("etages"), it.entier("fc_repos"), it.entier("vfc"), it.entier("spo2"),
                          it.entier("min_sport"), it.entier("seances"), it.optString("sport").takeIf { s -> s.isNotEmpty() && s != "null" })
                },
                especes = j.optJSONObject("pokedex")?.optInt("especes") ?: 0,
                totalEspeces = j.optJSONObject("pokedex")?.optInt("total", 151) ?: 151,
                coeur = j.optJSONObject("coeur"),
                dernieres = j.optJSONObject("pokedex")?.optJSONArray("dernieres")?.let { a ->
                    (0 until a.length()).map { ball(a.getJSONObject(it)) } } ?: emptyList(),
            )
        } catch (e: Exception) { null }
    }

    /** Claude depuis la montre (script Google, ?quoi=claude) : poser une question, ou suivre sa réponse. */
    fun claudePoser(question: String, modele: String): String? =
        appel("quoi=claude&modele=$modele&q=" + URLEncoder.encode(question, "UTF-8"))?.optString("id")?.takeIf { it.isNotEmpty() }

    fun claudeSuivre(id: String): JSONObject? = appel("quoi=claude&id=" + URLEncoder.encode(id, "UTF-8"))

    private fun appel(params: String): JSONObject? {
        if (BuildConfig.SCRIPT_URL.isEmpty()) return null
        val cle = URLEncoder.encode(BuildConfig.JEU_CLE, "UTF-8")
        val c = URL("${BuildConfig.SCRIPT_URL}?cle=$cle&$params").openConnection() as HttpURLConnection
        return try {
            c.connectTimeout = 15000; c.readTimeout = 30000; c.instanceFollowRedirects = true
            if (c.responseCode != 200) null
            else JSONObject(c.inputStream.bufferedReader().readText()).takeIf { it.optBoolean("ok") }
        } catch (e: Exception) { null } finally { c.disconnect() }
    }

    /** Va chercher les dernières données (et envoie d'abord les Poké Balls ouvertes ici). true si ça a marché. */
    @Synchronized
    fun telecharger(ctx: Context): Boolean {
        envoyerAttente(ctx)
        val j = appel("quoi=montre") ?: return false
        val p = prefs(ctx)
        // Ce que le script sait déjà ouvert n'a plus besoin d'être retenu ici
        val connues = j.optJSONArray("ouvertes")?.let { a -> (0 until a.length()).map { a.getString(it) }.toSet() } ?: emptySet()
        val ici = p.getStringSet("ouvertes", emptySet())!!.filter { it !in connues || it in attente(ctx) }.toSet()
        p.edit().putString("json", j.toString()).putLong("recu", System.currentTimeMillis())
            .putStringSet("ouvertes", ici).apply()
        Direct.nouvelleBase(ctx)
        return true
    }

    /** Bouton ↻ : demande au script Google une récolte tout de suite (clé APPLI_CLE du bouton 🔄 du site, si elle est
     *  dans secret.properties), attend le calcul du fichier de la montre (~1 min), puis relit. */
    fun actualiser(ctx: Context): Boolean {
        if (BuildConfig.APPLI_CLE.isNotEmpty() && BuildConfig.SCRIPT_URL.isNotEmpty()) {
            val c = URL("${BuildConfig.SCRIPT_URL}?cle=${URLEncoder.encode(BuildConfig.APPLI_CLE, "UTF-8")}").openConnection() as HttpURLConnection
            try { c.connectTimeout = 15000; c.readTimeout = 90000; c.responseCode } catch (e: Exception) { } finally { c.disconnect() }
            Thread.sleep(60_000)
        }
        return telecharger(ctx)
    }

    private fun attente(ctx: Context) = prefs(ctx).getStringSet("attente", emptySet())!!

    /** Une Poké Ball vient d'être ouverte sur la montre. */
    fun ouvrir(ctx: Context, id: String) {
        val p = prefs(ctx)
        p.edit().putStringSet("ouvertes", p.getStringSet("ouvertes", emptySet())!! + id)
            .putStringSet("attente", attente(ctx) + id).apply()
        Thread { envoyerAttente(ctx); BarreComplication.rafraichir(ctx) }.start()
    }

    @Synchronized
    private fun envoyerAttente(ctx: Context) {
        val ids = attente(ctx)
        if (ids.isEmpty()) return
        appel("quoi=ouvrir&ou=montre&ids=" + URLEncoder.encode(ids.joinToString(","), "UTF-8")) ?: return
        prefs(ctx).edit().putStringSet("attente", attente(ctx) - ids).apply()
    }
}
