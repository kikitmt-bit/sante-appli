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
    )

    private fun ball(b: JSONObject): Ball {
        val ts = b.optJSONArray("types") ?: JSONArray()
        return Ball(
            b.getString("id"), b.optString("ball", "poke"), b.optString("raison", ""), b.optInt("num"),
            b.optString("nom", "?"), (0 until ts.length()).map { ts.getString(it) },
            b.optBoolean("shiny"), b.optBoolean("nouvelle"), b.optBoolean("legendaire"), b.optString("image", ""),
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
            )
        } catch (e: Exception) { null }
    }

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
        return true
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
