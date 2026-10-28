package fr.kiki.pokemontre

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Typeface
import android.app.Notification
import android.app.Service
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.SystemClock
import android.os.VibrationEffect
import android.os.Vibrator
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import android.view.InputDevice
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.exp
import kotlin.math.min
import kotlin.math.sin

/**
 * Poser une question à Claude depuis la montre, sans clé API : la question part au script Google, qui la dépose dans le
 * dépôt privé montre-claude ; ça déclenche la routine Claude « Claude de la montre » (abonnement de Kiki), qui répond
 * dans la branche claude/montre-reponses du dépôt sante. La montre suit la réponse toutes les 3 s (chrono, étapes,
 * barre de progression), puis affiche la réponse sur une seule page qui défile : l'image (photo de l'article de
 * Wikipédia, ou image trouvée sur le web), l'essentiel en gras, la suite, et tout en bas « Nouvelle question » et
 * « Réponses précédentes ».
 * Le modèle se choisit tout seul : Haiku lit la question, répond aux simples et confie les difficiles à Opus.
 * Ouvert par l'appui long sur le bouton (rôle Assistant) : le micro écoute tout de suite, même si l'écran était déjà
 * ouvert en arrière-plan. Les 10 dernières questions sont gardées sur la montre.
 * L'écran reste allumé 120 s après le dernier geste (une question normale prend 25-35 s), puis la montre se met en
 * veille comme d'habitude ; elle continue de suivre la réponse écran éteint (SuiviClaude) et vibre quand elle arrive,
 * avec la notification « Claude a répondu » (toucher = la réponse).
 */
class ClaudeActivity : Activity() {
    lateinit var vue: ClaudeView
    private var visible = false

    private val minuterie = Handler(Looper.getMainLooper())
    private val laisserEteindre = Runnable { window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) }

    /** L'écran reste allumé ALLUME ms à partir de maintenant (chaque geste, chaque question envoyée), puis veille normale. */
    fun garderAllume() {
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        minuterie.removeCallbacks(laisserEteindre)
        minuterie.postDelayed(laisserEteindre, ALLUME)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        garderAllume()
        vue = ClaudeView(this)
        setContentView(vue)
        vue.requestFocus()
        val enAttente = Claude.enAttente(this)
        if (intent.getBooleanExtra(VOIR_REPONSE, false) && vue.montrerDerniere()) return
        if (enAttente != null) vue.suivre(enAttente.first, enAttente.second, enAttente.third, Claude.compteAttente(this))  // une question partie avant
        val manque = listOf(Manifest.permission.RECORD_AUDIO, Manifest.permission.POST_NOTIFICATIONS)
            .filter { checkSelfPermission(it) != PackageManager.PERMISSION_GRANTED }
        if (manque.isNotEmpty()) requestPermissions(manque.toTypedArray(), 2)
        else if (enAttente == null) dicter()  // on ouvre l'écran : le micro écoute tout de suite
    }

    /** L'écran était resté ouvert en arrière-plan (singleTask) : l'appui long relance l'écoute. */
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        garderAllume()
        if (intent.getBooleanExtra(VOIR_REPONSE, false)) { vue.montrerDerniere(); return }
        if (Claude.enAttente(this) == null && checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            vue.nouvelle(); dicter()
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED && Claude.enAttente(this) == null) dicter()
    }

    override fun onResume() { super.onResume(); visible = true }
    override fun onPause() { super.onPause(); visible = false }
    override fun onDestroy() { reco?.destroy(); minuterie.removeCallbacks(laisserEteindre); super.onDestroy() }

    // ---------- La dictée, dans l'écran même (pas l'écran de dictée de Google, lent à s'initialiser) ----------
    // D'abord la reconnaissance de la montre elle-même (sur l'appareil, sans réseau : la plus rapide), sinon celle de
    // Google ; si aucune ne marche, l'ancien écran de dictée. Fin de phrase = envoi direct, sans écran de vérification.
    private var reco: SpeechRecognizer? = null
    private var surAppareil = true

    fun dicter() {
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), 2); return
        }
        reco?.destroy()
        val local = surAppareil && Build.VERSION.SDK_INT >= 31 && !Claude.sansLocal(this) &&
            SpeechRecognizer.isOnDeviceRecognitionAvailable(this)
        if (!local && !SpeechRecognizer.isRecognitionAvailable(this)) { dicteeGoogle(); return }
        val r = if (local) SpeechRecognizer.createOnDeviceSpeechRecognizer(this) else SpeechRecognizer.createSpeechRecognizer(this)
        reco = r
        r.setRecognitionListener(object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) { vue.pret(); vibre(this@ClaudeActivity, longArrayOf(0, 20)) }
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) { vue.volume(rmsdB) }
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() {}
            override fun onEvent(eventType: Int, params: Bundle?) {}
            override fun onPartialResults(partialResults: Bundle?) {
                partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()?.let { vue.partiel(it) }
            }
            override fun onResults(results: Bundle?) {
                val texte = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()?.trim()
                if (texte.isNullOrEmpty()) vue.rienEntendu() else vue.envoyerTexte(texte)
            }
            override fun onError(error: Int) {
                val silence = error == SpeechRecognizer.ERROR_NO_MATCH || error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT
                if (local && !silence) {
                    // La reconnaissance de la montre ne sait pas faire (langue, modèle absent…) : celle de Google, et on s'en souvient
                    surAppareil = false; Claude.retenirSansLocal(this@ClaudeActivity); dicter()
                } else if (silence) vue.rienEntendu()
                else if (error == SpeechRecognizer.ERROR_NETWORK || error == SpeechRecognizer.ERROR_NETWORK_TIMEOUT) vue.erreur("Pas de réseau pour la dictée")
                else dicteeGoogle()
            }
        })
        vue.ecoute()
        r.startListening(Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE, "fr-FR")
            .putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            .putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
            .putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true))
    }

    /** Fin de phrase forcée (toucher le micro pendant qu'on parle). */
    fun finDictee() { reco?.stopListening() }

    /** Dernier recours : l'écran de dictée de Google. */
    private fun dicteeGoogle() {
        val i = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE, "fr-FR")
        AutoMicro.prevoir(this)  // le micro s'allume tout seul (service d'accessibilité)
        try { startActivityForResult(i, 1) } catch (e: Exception) { vue.erreur("Dictée indisponible sur cette montre") }
    }

    @Deprecated("API Activity")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        val texte = data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)?.firstOrNull()
        if (requestCode == 1 && resultCode == RESULT_OK && !texte.isNullOrBlank()) vue.envoyerTexte(texte) else vue.rienEntendu()
    }


    /** La réponse est arrivée : vibration ; écran éteint ou autre écran, la notification (qui vibre ; toucher = la réponse). */
    fun prevenir(court: String) {
        if (visible) { vibre(this, MOTIF); return }
        val nm = getSystemService(NotificationManager::class.java)
        // Un canal qui vibre (les réglages d'un canal ne changent plus une fois créé : d'où un nouveau nom en v15)
        nm.createNotificationChannel(NotificationChannel("claude_reponse", "Réponses de Claude", NotificationManager.IMPORTANCE_HIGH)
            .apply { enableVibration(true); vibrationPattern = MOTIF })
        nm.deleteNotificationChannel("claude")
        val tap = PendingIntent.getActivity(this, 5, Intent(this, ClaudeActivity::class.java).putExtra(VOIR_REPONSE, true)
            .addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        nm.notify(7, Notification.Builder(this, "claude_reponse").setSmallIcon(R.drawable.ic_claude)
            .setContentTitle("Claude a répondu").setContentText(court).setContentIntent(tap).setAutoCancel(true)
            .setCategory(Notification.CATEGORY_MESSAGE).build())
    }

    companion object {
        const val VOIR_REPONSE = "voir_reponse"
        const val ALLUME = 120_000L  // durée choisie par Kiki (28/10), à ajuster s'il le demande
        val MOTIF = longArrayOf(0, 60, 80, 60)

        fun vibre(ctx: Context, motif: LongArray) {
            try { ctx.getSystemService(Vibrator::class.java)?.vibrate(VibrationEffect.createWaveform(motif, -1)) } catch (e: Exception) { }
        }
    }
}

/**
 * Pendant qu'une question attend sa réponse : un service « au premier plan » (petite notification discrète) qui empêche
 * Android de geler l'appli quand l'écran s'éteint, et garde le processeur éveillé ; c'est l'écran Claude qui continue de
 * suivre la réponse. Arrêté dès la réponse (ou l'abandon), 30 min au plus.
 */
class SuiviClaude : Service() {
    private var verrou: PowerManager.WakeLock? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel("claude_suivi", "Claude prépare la réponse", NotificationManager.IMPORTANCE_MIN))
        val tap = PendingIntent.getActivity(this, 6, Intent(this, ClaudeActivity::class.java), PendingIntent.FLAG_IMMUTABLE)
        val n = Notification.Builder(this, "claude_suivi").setSmallIcon(R.drawable.ic_claude).setContentTitle("Claude")
            .setContentText("Claude prépare ta réponse…").setOngoing(true).setCategory(Notification.CATEGORY_PROGRESS)
            .setContentIntent(tap).build()
        if (Build.VERSION.SDK_INT >= 34) startForeground(8, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
        else startForeground(8, n)
        if (verrou == null) verrou = getSystemService(PowerManager::class.java)
            .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "pokemontre:claude").apply { acquire(30 * 60_000L) }
        return START_NOT_STICKY
    }

    override fun onDestroy() { verrou?.let { if (it.isHeld) it.release() }; super.onDestroy() }

    companion object {
        fun demarrer(ctx: Context) { try { ctx.startForegroundService(Intent(ctx, SuiviClaude::class.java)) } catch (e: Exception) { } }
        fun arreter(ctx: Context) { ctx.stopService(Intent(ctx, SuiviClaude::class.java)) }
    }
}

/** Les questions gardées sur la montre (historique, question en cours). */
object Claude {
    private const val PREFS = "claude"
    private fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    /** La reconnaissance vocale de la montre (sur l'appareil) n'a pas marché une fois : on passe par celle de Google. */
    fun sansLocal(ctx: Context) = prefs(ctx).getBoolean("sans_local", false)
    fun retenirSansLocal(ctx: Context) = prefs(ctx).edit().putBoolean("sans_local", true).apply()

    /** (id, question, envoyée à) d'une question partie il y a moins de 30 min (une action peut être longue) et sans réponse. */
    fun enAttente(ctx: Context): Triple<String, String, Long>? {
        val p = prefs(ctx)
        val id = p.getString("attente_id", null) ?: return null
        val quand = p.getLong("attente_quand", 0)
        if (System.currentTimeMillis() - quand > 30 * 60_000) return null
        return Triple(id, p.getString("attente_q", "")!!, quand)
    }
    fun attendre(ctx: Context, id: String, q: String, quand: Long, compte: String = "B") =
        prefs(ctx).edit().putString("attente_id", id).putString("attente_q", q).putLong("attente_quand", quand)
            .putString("attente_compte", compte).apply()
    fun compteAttente(ctx: Context) = prefs(ctx).getString("attente_compte", "B") ?: "B"
    fun finAttente(ctx: Context) = prefs(ctx).edit().remove("attente_id").apply()

    // ---------- Le compteur de la semaine et la limite du compte B ----------
    // Le % d'utilisation de l'abonnement n'est pas lisible depuis une routine : la routine renvoie, avec chaque réponse,
    // le nombre de questions et d'actions de la montre depuis lundi (par compte). Une question que personne ne prend
    // (routines qui échouent, souvent la limite d'utilisation) fait proposer le compte de secours A, en un toucher.

    /** Retient le compteur de la semaine reçu avec une réponse ; un compte qui répond n'est plus « à sa limite ». */
    fun retenirSemaine(ctx: Context, r: JSONObject) {
        val e = prefs(ctx).edit()
        r.optJSONObject("semaine")?.let { e.putString("semaine", it.toString()).putLong("semaine_quand", System.currentTimeMillis()) }
        if (r.optString("compte", "B") == "B") e.remove("limite_b")
        e.apply()
    }

    /** « 12 questions cette semaine » (compte B, et A s'il a servi), ou "" ; remis à zéro le lundi. */
    fun texteSemaine(ctx: Context): String {
        val p = prefs(ctx)
        val quand = p.getLong("semaine_quand", 0)
        val lundi = java.util.Calendar.getInstance().apply {
            set(java.util.Calendar.DAY_OF_WEEK, java.util.Calendar.MONDAY)
            if (timeInMillis > System.currentTimeMillis()) add(java.util.Calendar.DAY_OF_YEAR, -7)
            set(java.util.Calendar.HOUR_OF_DAY, 0); set(java.util.Calendar.MINUTE, 0); set(java.util.Calendar.SECOND, 0)
        }.timeInMillis
        if (quand < lundi) return ""
        val s = try { JSONObject(p.getString("semaine", "{}")!!) } catch (e: Exception) { return "" }
        fun n(c: String) = s.optJSONObject(c)?.let { it.optInt("questions") + it.optInt("actions") } ?: 0
        val b = n("B"); val a = n("A")
        if (a + b == 0) return ""
        return "$b question${if (b > 1) "s" else ""} cette semaine" + (if (a > 0) " · compte A : $a" else "")
    }

    fun retenirLimiteB(ctx: Context) = prefs(ctx).edit().putLong("limite_b", System.currentTimeMillis()).apply()
    /** Le compte B n'a pas répondu il y a moins de 5 h (sa limite se recharge par tranches de 5 h). */
    fun limiteB(ctx: Context) = System.currentTimeMillis() - prefs(ctx).getLong("limite_b", 0) < 5 * 3600_000L

    fun historique(ctx: Context): List<JSONObject> = try {
        val a = JSONArray(prefs(ctx).getString("historique", "[]"))
        (0 until a.length()).map { a.getJSONObject(it) }
    } catch (e: Exception) { emptyList() }

    fun garder(ctx: Context, r: JSONObject) {
        val h = (listOf(r) + historique(ctx).filter { it.optString("id") != r.optString("id") }).take(10)
        prefs(ctx).edit().putString("historique", JSONArray(h).toString()).apply()
        // Les images des questions sorties de l'historique
        val ids = h.map { it.optString("id") }.toSet()
        dossierImages(ctx).listFiles()?.forEach { if (it.nameWithoutExtension !in ids) it.delete() }
    }

    private fun dossierImages(ctx: Context) = File(ctx.filesDir, "claude_img").apply { mkdirs() }

    /** L'image de la réponse (gardée sur la montre), ou null s'il n'y en a pas. À appeler hors du fil principal. */
    fun image(ctx: Context, r: JSONObject): Bitmap? {
        val f = File(dossierImages(ctx), r.optString("id") + ".jpg")
        if (f.exists()) return BitmapFactory.decodeFile(f.path)
        val adresse = r.optString("image").takeIf { it.startsWith("https://") }
            ?: r.optString("wiki").takeIf { it.isNotBlank() }?.let { photoWiki(it) } ?: return null
        val octets = lire(adresse) ?: return null
        // Réduite à 400 px au plus (l'écran en fait 384)
        val o = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeByteArray(octets, 0, octets.size, o)
        var n = 1
        while (maxOf(o.outWidth, o.outHeight) / (n * 2) >= 400) n *= 2
        val b = BitmapFactory.decodeByteArray(octets, 0, octets.size, BitmapFactory.Options().apply { inSampleSize = n }) ?: return null
        try { f.outputStream().use { b.compress(Bitmap.CompressFormat.JPEG, 85, it) } } catch (e: Exception) { }
        return b
    }

    /** La photo de l'article de Wikipédia en français (résumé de l'article). */
    private fun photoWiki(titre: String): String? = try {
        val t = URLEncoder.encode(titre.trim().replace(' ', '_'), "UTF-8").replace("+", "%20")
        lire("https://fr.wikipedia.org/api/rest_v1/page/summary/$t")?.let { JSONObject(String(it)) }
            ?.optJSONObject("thumbnail")?.optString("source")?.takeIf { it.startsWith("https://") }
    } catch (e: Exception) { null }

    private fun lire(adresse: String): ByteArray? {
        val c = URL(adresse).openConnection() as HttpURLConnection
        return try {
            c.connectTimeout = 8000; c.readTimeout = 10000; c.instanceFollowRedirects = true
            c.setRequestProperty("User-Agent", "PokemonMontre/1.0 (montre de Kiki)")  // demandé par Wikipédia
            if (c.responseCode != 200 || c.contentLength > 3_000_000) null else c.inputStream.use { it.readBytes() }
        } catch (e: Exception) { null } finally { c.disconnect() }
    }
}

@SuppressLint("ViewConstructor")
class ClaudeView(private val act: ClaudeActivity) : View(act) {
    private enum class Etat { ACCUEIL, ECOUTE, ATTENTE, REPONSE, HISTORIQUE, ERREUR }

    private var etat = Etat.ACCUEIL
    private var texteQuestion = ""
    private var id: String? = null
    private var envoi = 0L          // heure d'envoi (ms, horloge murale)
    private var etape = "Envoi…"
    private var debutReflexion = 0L
    private var difficile = false   // Haiku a confié la question à Opus
    private var action = false      // Kiki demande de modifier un projet : Opus y travaille (plusieurs minutes)
    private var compte = "B"        // le compte Claude qui reçoit la question (A = compte de secours)
    private var personne = false    // aucune routine n'a pris la question : compte B à sa limite ?
    private var reponse: JSONObject? = null
    private var message = ""
    private var defile = 0f
    private var hauteurLong = 0f
    private var y0 = 0f
    private var x0 = 0f
    private var dernierY = 0f
    private var bouge = false
    private val zones = mutableListOf<Pair<RectF, () -> Unit>>()

    private val orange = 0xFFD97757.toInt()
    private val fond = 0xFF14110F.toInt()
    private val gris = 0xFF9C948C.toInt()
    private val p = Paint(Paint.ANTI_ALIAS_FLAG)
    private val t = TextPaint(Paint.ANTI_ALIAS_FLAG)
    private val gras = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
    private var S = 450f

    init { isFocusable = true; isFocusableInTouchMode = true }

    // ---------- Les étapes ----------
    private var prete = false
    private var partielTexte = ""
    private var niveau = 0f

    /** Le micro démarre (« Préparation… » puis « Je t'écoute »). */
    fun ecoute() { prete = false; partielTexte = ""; etat = Etat.ECOUTE; invalidate() }
    fun pret() { prete = true; invalidate() }
    fun volume(db: Float) { niveau = ((db + 2) / 12f).coerceIn(0f, 1f) }
    fun partiel(t: String) { partielTexte = t; invalidate() }
    fun rienEntendu() { message = "Je n'ai rien entendu"; etat = Etat.ACCUEIL; invalidate() }

    /** Fin de la dictée : la question part tout de suite (pas d'écran de vérification). */
    fun envoyerTexte(q: String) { message = ""; texteQuestion = q; envoyer() }

    /** Repart de zéro pour une nouvelle question. */
    fun nouvelle() { message = ""; texteQuestion = ""; reponse = null; image = null; defile = 0f }

    private var image: Bitmap? = null

    /** La dernière réponse reçue (toucher la notification) ; false s'il n'y en a pas. */
    fun montrerDerniere(): Boolean {
        val r = Claude.historique(act).firstOrNull() ?: return false
        id = null; montrer(r); return true
    }

    /** Montre une réponse (l'image arrive quand elle est téléchargée, la réponse s'affiche sans l'attendre). */
    private fun montrer(r: JSONObject) {
        reponse = r; image = null; defile = 0f; etat = Etat.REPONSE; invalidate()
        if (r.optString("wiki").isBlank() && r.optString("image").isBlank()) return
        Thread {
            val b = Claude.image(act, r)
            act.runOnUiThread { if (reponse === r && b != null) { image = b; invalidate() } }
        }.start()
    }

    fun erreur(m: String) { message = m; etat = Etat.ERREUR; invalidate() }

    private fun envoyer(versCompte: String = "B") {
        val q = texteQuestion
        act.garderAllume()  // 120 s d'écran allumé à partir de l'envoi
        id = null; compte = versCompte; personne = false
        envoi = System.currentTimeMillis(); etape = "Envoi de la question…"; debutReflexion = 0; etat = Etat.ATTENTE; invalidate()
        Thread {
            val n = Donnees.claudePoser(q, "rapide", versCompte)  // Haiku trie
            act.runOnUiThread {
                if (n == null) erreur("La question n'est pas partie (réseau ?)")
                else { Claude.attendre(act, n, q, envoi, versCompte); suivre(n, q, envoi, versCompte) }
            }
        }.start()
    }

    /** Un toucher : la même question au compte de secours A. */
    private fun demanderA() { Claude.finAttente(act); envoyer("A") }

    /** Suit la réponse toutes les 3 s (aussi pour une question partie avant d'ouvrir l'écran). */
    fun suivre(n: String, q: String, depuis: Long, versCompte: String = "B") {
        id = n; texteQuestion = q; envoi = depuis; etat = Etat.ATTENTE; difficile = false; action = false
        compte = versCompte; personne = false
        etape = "Claude démarre…"; invalidate()
        SuiviClaude.demarrer(act)  // le suivi continue écran éteint
        Thread {
            var pris = false  // une routine a pris la question
            var longue = false  // c'est une action : jusqu'à 25 min au lieu de 6
            while (id == n && System.currentTimeMillis() - envoi < (if (longue) 25 else 6) * 60_000) {
                val r = Donnees.claudeSuivre(n)
                val statut = r?.optString("statut")
                if (statut == "fini") {
                    act.runOnUiThread {
                        if (id != n) return@runOnUiThread
                        Claude.finAttente(act); Claude.garder(act, r); Claude.retenirSemaine(act, r)
                        id = null; montrer(r)
                        act.prevenir(r.optString("court"))
                        SuiviClaude.arreter(act)
                    }
                    return@Thread
                }
                if (statut == "en_cours" || statut == "pour_opus") pris = true
                if (r?.optString("type") == "action") longue = true
                // Personne n'a pris la question au bout de 50 s (d'habitude ~20 s) : les routines du compte B échouent,
                // le plus souvent parce que sa limite d'utilisation est atteinte
                val muet = !pris && statut == "envoye" && System.currentTimeMillis() - envoi > 50_000
                act.runOnUiThread {
                    if (id != n) return@runOnUiThread
                    if (longue && !action) { action = true; ClaudeActivity.vibre(act, longArrayOf(0, 25)) }
                    if (statut == "en_cours" && debutReflexion == 0L) { debutReflexion = System.currentTimeMillis(); ClaudeActivity.vibre(act, longArrayOf(0, 25)) }
                    if (statut == "pour_opus" && !difficile) { difficile = true; debutReflexion = System.currentTimeMillis() }
                    if (muet && !personne && compte == "B") { personne = true; Claude.retenirLimiteB(act) }
                    if (pris) personne = false
                    val faire = r?.optString("etape").orEmpty()
                    etape = when {
                        action -> if (faire.isNotEmpty()) "Claude y travaille : $faire" else "Claude y travaille…"
                        personne -> "Personne ne répond…"
                        else -> when (statut) { "en_cours" -> if (difficile) "Opus réfléchit…" else "Claude réfléchit…"
                            "pour_opus" -> "Question difficile : Opus arrive…"; null -> "Réseau lent…"; else -> "Claude démarre…" }
                    }
                }
                Thread.sleep(2000)
            }
            act.runOnUiThread {
                SuiviClaude.arreter(act)
                if (id != n) return@runOnUiThread
                id = null; Claude.finAttente(act)
                if (!pris && compte == "B") { Claude.retenirLimiteB(act); personne = true }
                erreur(if (longue) "L'action n'est pas finie au bout de 25 min. Regarde plus tard dans le projet."
                       else if (!pris) "Personne n'a pris la question. Compte $compte à sa limite ?"
                       else "Pas de réponse au bout de 6 min. Réessaie.")
            }
        }.start()
    }

    // ---------- Toucher, couronne ----------
    @SuppressLint("ClickableViewAccessibility")
    override fun onTouchEvent(e: MotionEvent): Boolean {
        when (e.action) {
            MotionEvent.ACTION_DOWN -> { y0 = e.y; x0 = e.x; dernierY = e.y; bouge = false; act.garderAllume() }
            MotionEvent.ACTION_MOVE -> {
                if (abs(e.y - y0) > 12) bouge = true
                if (etat == Etat.REPONSE || etat == Etat.HISTORIQUE) { defiler(dernierY - e.y); dernierY = e.y }
            }
            MotionEvent.ACTION_UP -> if (!bouge) zones.firstOrNull { it.first.contains(e.x, e.y) }?.second?.invoke()
        }
        return true
    }

    override fun onGenericMotionEvent(e: MotionEvent): Boolean {
        if (e.action == MotionEvent.ACTION_SCROLL && e.isFromSource(InputDevice.SOURCE_ROTARY_ENCODER)) {
            act.garderAllume()
            defiler(-e.getAxisValue(MotionEvent.AXIS_SCROLL) * S * 0.12f); return true
        }
        return super.onGenericMotionEvent(e)
    }

    private fun defiler(d: Float) {
        val visible = if (etat == Etat.REPONSE) S * 0.9f else S * 0.55f
        defile = (defile + d).coerceIn(0f, maxOf(0f, hauteurLong - visible)); invalidate()
    }

    // ---------- Dessin ----------
    override fun onDraw(c: Canvas) {
        S = min(width, height).toFloat()
        c.drawColor(fond)
        zones.clear()
        when (etat) {
            Etat.ACCUEIL -> accueil(c)
            Etat.ECOUTE -> pageEcoute(c)
            Etat.ATTENTE -> attente(c)
            Etat.REPONSE -> pageReponse(c)
            Etat.HISTORIQUE -> pageHistorique(c)
            Etat.ERREUR -> {
                if (personne && compte == "B" && texteQuestion.isNotEmpty()) {
                    texteCentre(c, message, S * 0.3f, S * 0.05f, Color.WHITE, S * 0.7f)
                    bouton(c, "Demander au compte A", width / 2f, S * 0.6f, S * 0.66f, orange) { demanderA() }
                    bouton(c, "Réessayer", width / 2f, S * 0.76f, S * 0.45f, orange, false) { personne = false; act.dicter() }
                } else {
                    texteCentre(c, message, S * 0.42f, S * 0.05f, Color.WHITE, S * 0.7f)
                    bouton(c, "Réessayer", width / 2f, S * 0.66f, S * 0.45f, orange) { act.dicter() }
                }
            }
        }
        if (etat == Etat.ATTENTE || etat == Etat.ECOUTE) postInvalidateOnAnimation()
    }

    private fun alpha(couleur: Int, a: Float) = BallView.alpha(couleur, a)

    private fun etoile(c: Canvas, x: Float, y: Float, r: Float, couleur: Int, tour: Float = 0f) {
        p.color = couleur
        val path = Path()
        for (i in 0 until 16) {
            val a = (i * PI / 8 + tour).toFloat()
            val rr = if (i % 2 == 0) r else r * 0.32f
            val px = x + cos(a) * rr; val py = y + sin(a) * rr
            if (i == 0) path.moveTo(px, py) else path.lineTo(px, py)
        }
        path.close(); c.drawPath(path, p)
    }

    private fun texteCentre(c: Canvas, s: String, y: Float, taille: Float, couleur: Int, largeur: Float, enGras: Boolean = false,
                            lignesMax: Int = 6, boite: Float = 0f): Float {
        t.textSize = taille; t.color = couleur; t.typeface = if (enGras) gras else Typeface.DEFAULT
        val l = StaticLayout.Builder.obtain(s, 0, s.length, t, largeur.toInt()).setAlignment(Layout.Alignment.ALIGN_CENTER)
            .setMaxLines(lignesMax).setEllipsize(android.text.TextUtils.TruncateAt.END).build()
        // boite > 0 : centré verticalement dans une zone de cette hauteur (le texte ne bouge pas le reste de l'écran)
        val dy = if (boite > 0) maxOf(0f, (boite - l.height) / 2) else 0f
        c.save(); c.translate(width / 2f - largeur / 2, y + dy); l.draw(c); c.restore()
        return l.height.toFloat()
    }

    private fun bouton(c: Canvas, s: String, x: Float, y: Float, l: Float, couleur: Int, plein: Boolean = true, action: () -> Unit) {
        val h = S * 0.125f
        val r = RectF(x - l / 2, y - h / 2, x + l / 2, y + h / 2)
        p.color = if (plein) couleur else 0xFF2A2420.toInt()
        c.drawRoundRect(r, h / 2, h / 2, p)
        t.textSize = S * 0.045f; t.typeface = gras; t.color = if (plein) Color.WHITE else couleur; t.textAlign = Paint.Align.CENTER
        c.drawText(s, x, y + S * 0.017f, t); t.textAlign = Paint.Align.LEFT
        zones += RectF(r.left - 14, r.top - 14, r.right + 14, r.bottom + 14) to action
    }

    private fun accueil(c: Canvas) {
        etoile(c, width / 2f, S * 0.17f, S * 0.05f, orange)
        texteCentre(c, message.ifEmpty { "Demande à Claude" }, S * 0.24f, S * 0.05f, Color.WHITE, S * 0.7f, true)
        // Le gros bouton micro
        val cx = width / 2f; val cy = S * 0.47f; val r = S * 0.13f
        p.color = orange; c.drawCircle(cx, cy, r, p)
        p.color = Color.WHITE
        c.drawRoundRect(RectF(cx - r * 0.18f, cy - r * 0.45f, cx + r * 0.18f, cy + r * 0.15f), r * 0.18f, r * 0.18f, p)
        p.style = Paint.Style.STROKE; p.strokeWidth = r * 0.08f
        c.drawArc(RectF(cx - r * 0.33f, cy - r * 0.2f, cx + r * 0.33f, cy + r * 0.32f), 0f, 180f, false, p)
        c.drawLine(cx, cy + r * 0.32f, cx, cy + r * 0.48f, p)
        p.style = Paint.Style.FILL
        zones += RectF(cx - r * 1.3f, cy - r * 1.3f, cx + r * 1.3f, cy + r * 1.3f) to { message = ""; act.dicter() }
        if (Claude.historique(act).isNotEmpty())
            bouton(c, "Dernières questions", width / 2f, S * 0.74f, S * 0.52f, orange, false) { defile = 0f; etat = Etat.HISTORIQUE; invalidate() }
        // En bas : le compteur de la semaine, ou l'alerte « compte B à sa limite »
        if (Claude.limiteB(act)) texteCentre(c, "Compte B à sa limite ?", S * 0.84f, S * 0.034f, orange, S * 0.6f, true, 1)
        else Claude.texteSemaine(act).takeIf { it.isNotEmpty() }?.let { texteCentre(c, it, S * 0.84f, S * 0.032f, gris, S * 0.6f, false, 1) }
    }

    /** On parle : micro orange qui bat avec la voix, la phrase s'écrit en direct ; toucher le micro = fini. */
    private fun pageEcoute(c: Canvas) {
        texteCentre(c, if (prete) "Je t'écoute…" else "Préparation…", S * 0.13f, S * 0.05f, Color.WHITE, S * 0.7f, true)
        val cx = width / 2f
        val cy = S * 0.38f
        val r = S * 0.12f * (1 + (if (prete) niveau * 0.35f else 0f))
        p.color = alpha(orange, if (prete) 0.25f else 0.12f); c.drawCircle(cx, cy, r * 1.45f, p)
        p.color = if (prete) orange else 0xFF5A4A40.toInt(); c.drawCircle(cx, cy, S * 0.12f, p)
        val m = S * 0.12f
        p.color = Color.WHITE
        c.drawRoundRect(RectF(cx - m * 0.18f, cy - m * 0.45f, cx + m * 0.18f, cy + m * 0.15f), m * 0.18f, m * 0.18f, p)
        p.style = Paint.Style.STROKE; p.strokeWidth = m * 0.08f
        c.drawArc(RectF(cx - m * 0.33f, cy - m * 0.2f, cx + m * 0.33f, cy + m * 0.32f), 0f, 180f, false, p)
        c.drawLine(cx, cy + m * 0.32f, cx, cy + m * 0.48f, p)
        p.style = Paint.Style.FILL
        zones += RectF(cx - S * 0.2f, cy - S * 0.2f, cx + S * 0.2f, cy + S * 0.2f) to { act.finDictee() }
        if (partielTexte.isNotEmpty()) texteCentre(c, partielTexte, S * 0.54f, S * 0.045f, gris, S * 0.72f, false, 3)
    }

    /** L'attente : étoile qui tourne, chrono, étape, barre de progression (jamais figée, jamais tout à fait pleine). */
    private fun attente(c: Canvas) {
        val ms = System.currentTimeMillis() - envoi
        val s = ms / 1000
        val tour = (SystemClock.uptimeMillis() % 4000) / 4000f * 2 * PI.toFloat()
        // Chaque chose a sa place (écran rond) : étoile, étape (2 lignes au plus, coupée par « … »), chrono, barre, question
        etoile(c, width / 2f, S * 0.27f, S * (0.085f + 0.01f * sin(tour * 3)), orange, tour)
        val taille = if (etape.length > 26) S * 0.046f else S * 0.055f
        texteCentre(c, etape, S * 0.385f, taille, Color.WHITE, S * 0.78f, true, 2, S * 0.135f)
        texteCentre(c, "${s / 60}:${"%02d".format(s % 60)}", S * 0.525f, S * 0.08f, orange, S * 0.5f, true, 1)
        // Progression estimée (mesuré le 22/10) : GitHub + démarrage ~25 s (jusqu'à 70 %), puis Claude répond en ~6 s
        // (Haiku) ou ~12 s de plus quand la question passe à Opus (jusqu'à 97 %) ; la barre avance toujours, sans jamais
        // être pleine avant la réponse
        // Une action (Opus modifie un projet) prend plusieurs minutes : la barre avance bien plus lentement
        val lent = if (action) 150_000.0 else if (difficile) 8_000.0 else 4_000.0
        val part = if (debutReflexion == 0L) 0.7f * (1 - exp(-ms / 14_000.0).toFloat())
                   else 0.7f + 0.27f * (1 - exp(-(System.currentTimeMillis() - debutReflexion) / lent).toFloat())
        val l = S * 0.6f; val x = width / 2f - l / 2; val y = S * 0.655f; val h = S * 0.022f
        p.color = 0xFF2A2420.toInt(); c.drawRoundRect(RectF(x, y, x + l, y + h), h / 2, h / 2, p)
        p.color = orange; c.drawRoundRect(RectF(x, y, x + l * part, y + h), h / 2, h / 2, p)
        if (personne && compte == "B") {
            texteCentre(c, "Compte B à sa limite ?", S * 0.71f, S * 0.034f, gris, S * 0.62f, false, 1)
            bouton(c, "Demander au compte A", width / 2f, S * 0.81f, S * 0.62f, orange) { demanderA() }
        } else texteCentre(c, "« $texteQuestion »", S * 0.71f, S * 0.036f, gris, S * 0.62f, false, 2)
    }

    /** La réponse, sur une seule page qui défile (doigt ou couronne) ; les boutons sont tout en bas. */
    private fun pageReponse(c: Canvas) {
        val r = reponse ?: return
        val cx = width / 2f
        var y = S * 0.08f - defile
        etoile(c, cx, y + S * 0.025f, S * 0.028f, orange); y += S * 0.07f
        y += texteCentre(c, r.optString("q"), y, S * 0.036f, gris, S * 0.62f, false, 3) + S * 0.035f
        image?.let { b ->
            // Photo aux coins arrondis, 60 % de la largeur au plus, 45 % de la hauteur au plus
            val k = minOf(S * 0.6f / b.width, S * 0.45f / b.height)
            val w = b.width * k; val h = b.height * k
            val rect = RectF(cx - w / 2, y, cx + w / 2, y + h)
            c.save(); c.clipPath(Path().apply { addRoundRect(rect, S * 0.035f, S * 0.035f, Path.Direction.CW) })
            c.drawBitmap(b, null, rect, p); c.restore()
            y += h + S * 0.04f
        }
        y += texteCentre(c, r.optString("court"), y, S * 0.05f, Color.WHITE, S * 0.76f, true, 8) + S * 0.035f
        val sources = (0 until (r.optJSONArray("sources")?.length() ?: 0)).joinToString(", ") { r.getJSONArray("sources").getString(it) }
        val suite = r.optString("long").trim()
        if (suite.isNotEmpty()) {
            t.textSize = S * 0.046f; t.color = 0xFFE6E0DA.toInt(); t.typeface = Typeface.DEFAULT
            val largeur = (S * 0.76f).toInt()
            val l = StaticLayout.Builder.obtain(suite, 0, suite.length, t, largeur).setAlignment(Layout.Alignment.ALIGN_NORMAL).build()
            c.save(); c.translate(cx - largeur / 2f, y); l.draw(c); c.restore()
            y += l.height + S * 0.035f
        }
        val pied = (if (sources.isNotEmpty()) "Sources : $sources · " else "") + r.optString("modele") +
            (if (r.optString("compte") == "A") " · compte A" else "")
        y += texteCentre(c, pied, y, S * 0.032f, gris, S * 0.7f, false, 3) + S * 0.08f
        bouton(c, "Nouvelle question", cx, y, S * 0.66f, orange) { nouvelle(); act.dicter() }
        y += S * 0.16f
        bouton(c, "Réponses précédentes", cx, y, S * 0.66f, orange, false) { defile = 0f; etat = Etat.HISTORIQUE; invalidate() }
        y += S * 0.22f
        hauteurLong = y + defile
        // Un petit repère : il reste à lire plus bas
        if (hauteurLong - defile > S * 1.02f) { p.color = alpha(gris, 0.6f); c.drawCircle(cx, S * 0.955f, S * 0.012f, p) }
    }

    private fun pageHistorique(c: Canvas) {
        texteCentre(c, "Dernières questions", S * 0.1f, S * 0.045f, Color.WHITE, S * 0.7f, true)
        var y = S * 0.2f - defile
        val h = Claude.historique(act)
        c.save(); c.clipRect(0f, S * 0.17f, width.toFloat(), S * 0.73f)
        for (r in h) {
            val haut = y
            val hq = texteCentre(c, r.optString("q"), y, S * 0.04f, orange, S * 0.7f, false, 2)
            val hc = texteCentre(c, r.optString("court"), y + hq + S * 0.01f, S * 0.036f, gris, S * 0.7f, false, 2)
            if (y + hq + hc > S * 0.17f && haut < S * 0.73f)
                zones += RectF(0f, maxOf(haut, S * 0.17f), width.toFloat(), minOf(y + hq + hc, S * 0.73f)) to { montrer(r) }
            y += hq + hc + S * 0.05f
        }
        c.restore()
        hauteurLong = y + defile
        bouton(c, "Retour", width / 2f, S * 0.82f, S * 0.34f, orange) { etat = Etat.ACCUEIL; invalidate() }
    }
}
