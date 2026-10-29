package fr.kiki.pokemontre

import android.Manifest
import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Geocoder
import android.location.LocationManager
import android.os.BatteryManager
import android.provider.AlarmClock
import org.json.JSONObject
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * v16 (29/10) : ce que la montre fait elle-même autour de Claude.
 *  - Les ordres très simples sont reconnus ici, sans Claude (« minuteur 12 minutes », « réveil à 7 h », « quelle heure
 *    est-il », « combien de pas ») : réponse instantanée, zéro quota.
 *  - La réponse de Claude peut porter un ordre (`montre` : minuteur, alarme, rappel, agenda) que la montre exécute.
 *  - Le contexte joint à chaque question : heure locale et fuseau, ville (dernière position connue, sans allumer le GPS),
 *    prochain rendez-vous, batterie.
 */
object Ordres {
    private val NOMBRES = mapOf("un" to 1, "une" to 1, "deux" to 2, "trois" to 3, "quatre" to 4, "cinq" to 5, "six" to 6,
        "sept" to 7, "huit" to 8, "neuf" to 9, "dix" to 10, "onze" to 11, "douze" to 12, "treize" to 13, "quatorze" to 14,
        "quinze" to 15, "seize" to 16, "vingt" to 20, "trente" to 30, "quarante" to 40, "cinquante" to 50, "soixante" to 60,
        "midi" to 12, "minuit" to 0)

    /** « une minute » -> « 1 minute », « dix-sept » reste tel quel (la dictée écrit presque toujours les chiffres). */
    private fun chiffres(s: String) = s.lowercase(Locale.FRENCH).replace('’', '\'')
        .split(Regex("(?<=[\\s'])|(?=[\\s'])")).joinToString("") { NOMBRES[it]?.toString() ?: it }

    /** Une réponse toute prête si la question est un ordre simple (et l'ordre déjà exécuté) ; sinon null -> Claude. */
    fun local(ctx: Context, question: String): JSONObject? {
        val q = chiffres(question).trim().trimEnd('.', '?', '!', ' ')
        val maintenant = LocalDateTime.now()
        fun reponse(court: String, fait: String? = null) = JSONObject().put("id", "montre" + System.currentTimeMillis())
            .put("q", question).put("statut", "fini").put("court", court).put("long", "").put("modele", "la montre, sans Claude")
            .put("local", true).apply { fait?.let { put("fait", it) } }

        // Minuteur : « minuteur 12 minutes », « mets un minuteur de 1 h 30 », « timer 45 secondes »
        if (Regex("\\b(minuteur|timer|compte à rebours)\\b").containsMatchIn(q) && !q.contains("rappel")) {
            val s = duree(q) ?: return null
            val f = minuteur(ctx, s, "")
            return reponse(if (f.startsWith("✓")) "Minuteur de ${joliDuree(s)} lancé." else "Je n'ai pas pu lancer le minuteur.", f)
        }
        // Alarme : « réveil à 7 h », « réveille-moi à 6 h 45 », « alarme 7:30 »
        if (Regex("\\b(réveil|réveille|reveil|alarme)").containsMatchIn(q) && !Regex("\\b(dans|demain soir)\\b").containsMatchIn(q)) {
            val m = Regex("(\\d{1,2})\\s*(?:h|heures?|:)\\s*(\\d{1,2})?").find(q) ?: return null
            val h = m.groupValues[1].toInt(); val mn = m.groupValues[2].toIntOrNull() ?: 0
            if (h > 23 || mn > 59) return null
            val f = alarme(ctx, h, mn, "")
            return reponse(if (f.startsWith("✓")) "Alarme réglée à ${"%02d:%02d".format(h, mn)}." else "Je n'ai pas pu régler l'alarme.", f)
        }
        // L'heure et la date
        if (Regex("^(quelle heure|il est quelle heure|c'est quelle heure)").containsMatchIn(q))
            return reponse("Il est ${maintenant.hour} h ${"%02d".format(maintenant.minute)}.")
        if (Regex("^(quel jour|on est quel jour|quelle (est la )?date)").containsMatchIn(q))
            return reponse("Nous sommes le " + maintenant.format(DateTimeFormatter.ofPattern("EEEE d MMMM yyyy", Locale.FRENCH)) + ".")
        // Les pas d'aujourd'hui (les autres jours, la semaine… : Claude, qui a les données)
        if (Regex("combien (de pas|j'ai fait de pas|ai-je fait de pas)").containsMatchIn(q) &&
            !Regex("hier|semaine|mois|moyenne|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|dernier|avant|depuis|record").containsMatchIn(q)) {
            val pas = pasAujourdhui(ctx) ?: return null
            val obj = Donnees.lire(ctx)?.objectifs?.objPas ?: 5000
            val reste = obj - pas
            return reponse("$pas pas aujourd'hui.", null).put("long",
                if (reste > 0) "Encore $reste pas pour l'objectif de $obj." else "Objectif de $obj pas atteint.")
        }
        return null
    }

    private fun pasAujourdhui(ctx: Context): Long? {
        val direct = Direct.lire(ctx)?.pas
        val site = Donnees.lire(ctx)?.takeIf { it.jour == LocalDate.now().toString() }?.pas?.toLong()
        return listOfNotNull(direct, site).maxOrNull()
    }

    /** « 1 h 30 » -> 5400 ; « 12 minutes » -> 720 ; « 45 s » -> 45 ; null si aucune durée. */
    private fun duree(q: String): Int? {
        var s = 0; var trouve = false
        Regex("(\\d+)\\s*(heures?|h\\b|minutes?|min\\b|mn\\b|secondes?|sec\\b|s\\b)\\s*(\\d+)?").findAll(q).forEach { m ->
            val n = m.groupValues[1].toInt(); trouve = true
            s += when {
                m.groupValues[2].startsWith("h") -> n * 3600 + (m.groupValues[3].toIntOrNull() ?: 0) * 60
                m.groupValues[2].startsWith("s") -> n
                else -> n * 60
            }
        }
        if (!trouve) Regex("\\b(\\d+)\\b").find(q)?.let { s = it.groupValues[1].toInt() * 60; trouve = true }  // « minuteur 10 »
        return s.takeIf { trouve && it in 1..86400 }
    }

    private fun joliDuree(s: Int) = listOfNotNull((s / 3600).takeIf { it > 0 }?.let { "$it h" },
        (s % 3600 / 60).takeIf { it > 0 }?.let { "$it min" }, (s % 60).takeIf { it > 0 }?.let { "$it s" }).joinToString(" ")

    // ---------- Exécuter un ordre (de la montre ou de Claude) ----------

    /** L'ordre `montre` d'une réponse de Claude ; renvoie le texte affiché sous la réponse (« ✓ Minuteur 12 min lancé »). */
    fun executer(ctx: Context, m: JSONObject): String = try {
        val texte = m.optString("texte").trim()
        when (m.optString("type")) {
            "minuteur" -> minuteur(ctx, m.optInt("secondes"), texte)
            "alarme" -> LocalTime.parse(m.optString("heure").padStart(5, '0')).let { alarme(ctx, it.hour, it.minute, texte) }
            "rappel" -> rappel(ctx, LocalDateTime.parse(m.optString("quand").take(16)), texte.ifEmpty { "Rappel" })
            "agenda" -> agenda(m)
            else -> "✗ Ordre inconnu"
        }
    } catch (e: Exception) { "✗ Pas pu le faire sur la montre" }

    private fun minuteur(ctx: Context, secondes: Int, texte: String): String {
        if (secondes !in 1..86400) return "✗ Durée du minuteur ?"
        ctx.startActivity(Intent(AlarmClock.ACTION_SET_TIMER).putExtra(AlarmClock.EXTRA_LENGTH, secondes)
            .putExtra(AlarmClock.EXTRA_SKIP_UI, true).apply { if (texte.isNotEmpty()) putExtra(AlarmClock.EXTRA_MESSAGE, texte) }
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        return "✓ Minuteur ${joliDuree(secondes)} lancé"
    }

    private fun alarme(ctx: Context, h: Int, mn: Int, texte: String): String {
        ctx.startActivity(Intent(AlarmClock.ACTION_SET_ALARM).putExtra(AlarmClock.EXTRA_HOUR, h).putExtra(AlarmClock.EXTRA_MINUTES, mn)
            .putExtra(AlarmClock.EXTRA_SKIP_UI, true).apply { if (texte.isNotEmpty()) putExtra(AlarmClock.EXTRA_MESSAGE, texte) }
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        return "✓ Alarme à ${"%02d:%02d".format(h, mn)}"
    }

    /** Un rappel = une notification qui vibre à l'heure dite (alarme exacte du système, même montre en veille). */
    private fun rappel(ctx: Context, quand: LocalDateTime, texte: String): String {
        val ms = quand.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()
        if (ms < System.currentTimeMillis() - 60_000) return "✗ Heure du rappel déjà passée"
        val am = ctx.getSystemService(AlarmManager::class.java)
        val pi = PendingIntent.getBroadcast(ctx, (ms / 1000).toInt(), Intent(ctx, Rappel::class.java).putExtra("texte", texte),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        if (am.canScheduleExactAlarms()) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, ms, pi)
        else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, ms, pi)
        val jour = if (quand.toLocalDate() == LocalDate.now()) "" else quand.format(DateTimeFormatter.ofPattern("EEE d ", Locale.FRENCH))
        return "✓ Rappel $jour${"%02d:%02d".format(quand.hour, quand.minute)}"
    }

    /** La montre ne peut pas écrire dans son agenda : le script Google l'ajoute à l'agenda de Kiki (à appeler hors du fil principal). */
    private fun agenda(m: JSONObject): String {
        val zone = ZoneId.systemDefault()
        val debut = LocalDateTime.parse(m.optString("debut").take(16)).atZone(zone)
        val fin = m.optString("fin").takeIf { it.length >= 16 }?.let { LocalDateTime.parse(it.take(16)).atZone(zone) }
        val ok = Donnees.agenda(m.optString("titre").ifBlank { "Rendez-vous" }, debut.toOffsetDateTime().toString(),
            fin?.toOffsetDateTime()?.toString() ?: "")
        return if (ok) "✓ Ajouté à l'agenda : " + debut.format(DateTimeFormatter.ofPattern("EEE d MMM HH:mm", Locale.FRENCH))
               else "✗ Pas pu l'ajouter à l'agenda"
    }

    // ---------- Le contexte joint à chaque question ----------

    /** Heure locale et fuseau, ville, prochain rendez-vous, batterie ; pour une question de météo, la prévision (les
     *  routines n'ont pas accès aux services météo). À appeler hors du fil principal (ville, météo : 1-2 s). */
    fun contexte(ctx: Context, question: String = ""): JSONObject {
        val c = JSONObject()
        val t = java.time.ZonedDateTime.now()
        c.put("heure", t.format(DateTimeFormatter.ofPattern("EEEE d MMMM yyyy HH:mm", Locale.FRENCH)))
        c.put("fuseau", t.zone.id + " (UTC" + t.offset.id.replace("Z", "+00:00") + ")")
        val pos = position(ctx)
        pos?.let { c.put("lieu", lieu(ctx, it)) }
        if (pos != null && METEO.containsMatchIn(question.lowercase(Locale.FRENCH)))
            meteo(pos.latitude, pos.longitude)?.let { c.put("meteo", it) }
        BasComplication.rendezVous(ctx).firstOrNull { it.debut > System.currentTimeMillis() - 5 * 60_000 }?.let {
            c.put("prochain_rdv", "${if (it.aujourdhui) "aujourd'hui" else "demain"} ${it.heure} : ${it.titre.take(60)}")
        }
        val b = ctx.getSystemService(BatteryManager::class.java)?.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
        if (b != null && b in 0..100) c.put("batterie", "$b %")
        return c
    }

    private val METEO = Regex("""\b(météo|meteo|pleu\w*|pluie|parapluie|neig\w*|orage\w*|température|froid|chaud|vent|soleil|brouillard|gel|verglas)\b|quel temps|temps fait""")

    /** La dernière position connue (aucune mesure lancée : pas de batterie en plus). */
    private fun position(ctx: Context): android.location.Location? {
        if (ctx.checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) return null
        val lm = ctx.getSystemService(LocationManager::class.java) ?: return null
        return try {
            listOf(LocationManager.FUSED_PROVIDER, LocationManager.NETWORK_PROVIDER, LocationManager.PASSIVE_PROVIDER, LocationManager.GPS_PROVIDER)
                .mapNotNull { p -> try { lm.getLastKnownLocation(p) } catch (e: Exception) { null } }.maxByOrNull { it.time }
        } catch (e: Exception) { null }
    }

    /** La prévision d'Open-Meteo (sans clé) : maintenant, 3 jours, et les heures où il risque de pleuvoir ; null si pas de réseau. */
    private fun meteo(lat: Double, lon: Double): String? = try {
        val u = "https://api.open-meteo.com/v1/forecast?latitude=%.3f&longitude=%.3f".format(Locale.US, lat, lon) +
            "&timezone=auto&forecast_days=3&current=temperature_2m,weather_code&hourly=precipitation_probability" +
            "&daily=weather_code,temperature_2m_min,temperature_2m_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max"
        val c = java.net.URL(u).openConnection() as java.net.HttpURLConnection
        c.connectTimeout = 6000; c.readTimeout = 8000
        val j = try { JSONObject(c.inputStream.bufferedReader().readText()) } finally { c.disconnect() }
        val cour = j.getJSONObject("current")
        val d = j.getJSONObject("daily")
        val jours = (0 until d.getJSONArray("time").length()).joinToString(" ; ") { i ->
            "${d.getJSONArray("time").getString(i)} : ${ciel(d.getJSONArray("weather_code").getInt(i))}, " +
            "${d.getJSONArray("temperature_2m_min").getDouble(i)} à ${d.getJSONArray("temperature_2m_max").getDouble(i)} °C, " +
            "pluie ${d.getJSONArray("precipitation_sum").getDouble(i)} mm (${d.optJSONArray("precipitation_probability_max")?.optInt(i)} %), " +
            "vent ${d.getJSONArray("wind_speed_10m_max").getDouble(i)} km/h"
        }
        val h = j.getJSONObject("hourly")
        val pluie = (0 until h.getJSONArray("time").length()).filter { h.getJSONArray("precipitation_probability").optInt(it) >= 40 }
            .take(10).joinToString(", ") { h.getJSONArray("time").getString(it).substring(5).replace("T", " ") +
                " " + h.getJSONArray("precipitation_probability").optInt(it) + " %" }
        "Open-Meteo. Maintenant ${cour.getDouble("temperature_2m")} °C, ${ciel(cour.getInt("weather_code"))}. $jours." +
            (if (pluie.isNotEmpty()) " Pluie probable (≥ 40 %) : $pluie." else " Aucune heure à plus de 40 % de risque de pluie.")
    } catch (e: Exception) { null }

    private fun ciel(code: Int) = when (code) {
        0 -> "ciel clair"; 1, 2 -> "quelques nuages"; 3 -> "couvert"; 45, 48 -> "brouillard"; in 51..57 -> "bruine"
        in 61..67 -> "pluie"; in 71..77 -> "neige"; in 80..82 -> "averses"; in 85..86 -> "averses de neige"; in 95..99 -> "orage"
        else -> "?"
    }

    /** La ville de la position, sinon les coordonnées à 1 km près (toujours jointes : la météo et « près d'ici » en ont besoin). */
    private fun lieu(ctx: Context, pos: android.location.Location): String {
        val vieux = (System.currentTimeMillis() - pos.time) / 3600_000
        val ville = try {
            @Suppress("DEPRECATION")
            if (Geocoder.isPresent()) Geocoder(ctx, Locale.FRENCH).getFromLocation(pos.latitude, pos.longitude, 1)?.firstOrNull()
                ?.let { a -> listOfNotNull(a.locality ?: a.subAdminArea, a.countryName).joinToString(", ") }?.takeIf { it.isNotBlank() }
            else null
        } catch (e: Exception) { null }
        val coord = "%.2f, %.2f".format(Locale.US, pos.latitude, pos.longitude)
        return (ville?.let { "$it ($coord)" } ?: coord) + if (vieux >= 2) " (position d'il y a $vieux h)" else ""
    }
}

/** Le rappel programmé par Claude : une notification qui vibre. */
class Rappel : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        val nm = ctx.getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel("rappels", "Rappels de Claude", NotificationManager.IMPORTANCE_HIGH)
            .apply { enableVibration(true); vibrationPattern = longArrayOf(0, 400, 200, 400) })
        nm.notify((System.currentTimeMillis() / 1000).toInt(), Notification.Builder(ctx, "rappels")
            .setSmallIcon(R.drawable.ic_claude).setContentTitle("Rappel").setContentText(intent.getStringExtra("texte") ?: "")
            .setCategory(Notification.CATEGORY_REMINDER).setAutoCancel(true).build())
    }
}
