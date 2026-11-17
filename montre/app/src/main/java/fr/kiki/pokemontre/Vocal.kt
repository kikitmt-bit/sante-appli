package fr.kiki.pokemontre

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.Typeface
import android.media.AudioAttributes
import android.media.AudioManager
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.os.VibrationEffect
import android.os.Vibrator
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.util.Log
import android.view.Gravity
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import com.google.android.gms.tasks.Tasks
import com.google.android.gms.wearable.MessageClient
import com.google.android.gms.wearable.Wearable
import java.io.BufferedReader
import java.io.File
import java.io.InputStreamReader
import java.net.InetSocketAddress
import java.net.Socket
import java.util.Locale
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CountDownLatch
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.TimeUnit
import org.json.JSONObject

/**
 * « Claude direct » (essai) : une vraie conversation à voix haute avec Claude, sans attendre 30 s.
 * La montre écoute, envoie la phrase au téléphone en Bluetooth (appli « Pokémon (montre) », PontVocal), qui la donne
 * au relais lancé dans Termux sur le téléphone (montre/relais/relais.py : Claude Code resté lancé, sur l'abonnement
 * de Kiki, sans PC) ; elle reçoit la réponse phrase par phrase et la lit dès la première phrase ; puis elle réécoute
 * toute seule. Toucher l'écran : couper Claude et reparler (ou relancer l'écoute). Chaque ouverture = nouvelle
 * conversation ; pendant l'écran, Claude garde le fil.
 * En bas, les temps mesurés (fin de ta phrase → début de la voix), aussi dans le journal (étiquette « Vocal »).
 * Essai sans parler, par ADB : `run-as fr.kiki.pokemontre` écrit la question dans files/essai_vocal.txt, puis on
 * ouvre l'écran.
 */
class VocalActivity : Activity() {
    private enum class Etat { ECOUTE, REFLECHIT, PARLE, PAUSE }

    private val main = Handler(Looper.getMainLooper())
    private lateinit var etatVue: TextView
    private lateinit var texteVue: TextView
    private lateinit var tempsVue: TextView
    private lateinit var defile: ScrollView
    private var etat = Etat.PAUSE
    private var tour = 0                 // numéro de l'échange en cours : ce qui arrive d'un échange coupé est ignoré
    private var nouveau = true           // première phrase de l'écran : nouvelle conversation chez Claude

    private var voix: TextToSpeech? = null
    private var voixPrete = false
    private var aLire = 0                // phrases données à la voix, pas encore finies
    private var toutRecu = false
    private val enAttente = ArrayList<String>()   // phrases arrivées avant que la voix soit prête
    private var finDictee = 0L
    private var debutVoix = 0L
    private var recu1 = 0L
    private var chemin = ""
    private var msClaude = 0
    private var modele = ""              // modèle qui a répondu (Haiku, Sonnet, Opus) et compte, affichés en bas

    private var reco: SpeechRecognizer? = null
    private var surAppareil = true
    private var wifi: Network? = null
    private var demandeWifi: ConnectivityManager.NetworkCallback? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        construire()
        preparerVoix()
        Wearable.getMessageClient(this).addListener(recepteur)
        Thread { try { echanger(JSONObject().put("nouveau", true)) { } } catch (e: Exception) { } }.start()  // réveille le relais
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED)
            requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), 2)
        else if (!essai()) ecouter()
    }

    override fun onNewIntent(intent: Intent) { super.onNewIntent(intent); if (!essai() && etat == Etat.PAUSE) ecouter() }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) ecouter()
        else pause("Micro refusé")
    }

    override fun onDestroy() {
        tour++
        try { Wearable.getMessageClient(this).removeListener(recepteur) } catch (e: Exception) { }
        reco?.destroy()
        voix?.stop()   // la voix reste prête pour la prochaine ouverture (elle met plusieurs secondes à démarrer)
        if (courante === this) courante = null
        demandeWifi?.let { try { getSystemService(ConnectivityManager::class.java).unregisterNetworkCallback(it) } catch (e: Exception) { } }
        super.onDestroy()
    }

    private fun essai(): Boolean {
        val f = File(filesDir, "essai_vocal.txt")
        if (!f.exists()) return false
        val q = f.readText().trim(); f.delete()
        if (q.isEmpty()) return false
        envoyer(q)
        return true
    }

    // ---------- L'écran ----------
    private fun construire() {
        val d = resources.displayMetrics.density
        fun px(v: Int) = (v * d).toInt()
        etatVue = TextView(this).apply {
            textSize = 15f; typeface = Typeface.DEFAULT_BOLD; gravity = Gravity.CENTER; setTextColor(ORANGE)
        }
        texteVue = TextView(this).apply { textSize = 15f; setTextColor(Color.WHITE); gravity = Gravity.CENTER_HORIZONTAL; setLineSpacing(0f, 1.1f) }
        tempsVue = TextView(this).apply { textSize = 10f; setTextColor(Color.GRAY); gravity = Gravity.CENTER }
        defile = ScrollView(this).apply {
            isVerticalScrollBarEnabled = false
            addView(texteVue, FrameLayout.LayoutParams(-1, -2))
        }
        val col = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.BLACK)
            setPadding(px(26), px(22), px(26), px(14))
            addView(etatVue, LinearLayout.LayoutParams(-1, -2))
            addView(defile, LinearLayout.LayoutParams(-1, 0, 1f).apply { topMargin = px(4) })
            addView(tempsVue, LinearLayout.LayoutParams(-1, -2))
            setOnClickListener { touche() }
        }
        texteVue.setOnClickListener { touche() }
        setContentView(col)
    }

    private fun montrer(e: Etat, titre: String) {
        etat = e
        etatVue.text = titre
        etatVue.setTextColor(if (e == Etat.PAUSE) Color.GRAY else ORANGE)
        if (e == Etat.PAUSE) main.postDelayed(eteindre, 60_000) else {
            main.removeCallbacks(eteindre); window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }
    }
    private val eteindre = Runnable { window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) }

    private fun pause(pourquoi: String) { montrer(Etat.PAUSE, pourquoi); if (texteVue.text.isEmpty()) texteVue.text = "Touche pour parler" }

    private fun touche() {
        when (etat) {
            Etat.PARLE -> { tour++; voix?.stop(); enAttente.clear(); ecouter() }      // couper Claude et reparler
            Etat.PAUSE -> ecouter()
            Etat.ECOUTE -> reco?.stopListening()
            Etat.REFLECHIT -> { }
        }
    }

    // ---------- L'écoute (comme l'écran Claude : la reconnaissance de la montre, sinon la dictée de Gboard) ----------
    private fun ecouter() {
        reco?.destroy(); reco = null
        montrer(Etat.ECOUTE, "Je t'écoute…")
        val local = surAppareil && Build.VERSION.SDK_INT >= 31 && !Claude.sansLocal(this) &&
            SpeechRecognizer.isOnDeviceRecognitionAvailable(this)
        if (!local && !SpeechRecognizer.isRecognitionAvailable(this)) { dicteeGoogle(); return }
        val r = if (local) SpeechRecognizer.createOnDeviceSpeechRecognizer(this) else SpeechRecognizer.createSpeechRecognizer(this)
        reco = r
        r.setRecognitionListener(object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) { vibrer(20) }
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() {}
            override fun onEvent(eventType: Int, params: Bundle?) {}
            override fun onPartialResults(partialResults: Bundle?) {
                partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()?.let { if (it.isNotBlank()) texteVue.text = it }
            }
            override fun onResults(results: Bundle?) {
                val t = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()?.trim()
                if (t.isNullOrEmpty()) pause("Rien entendu") else envoyer(t)
            }
            override fun onError(error: Int) {
                val silence = error == SpeechRecognizer.ERROR_NO_MATCH || error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT
                if (silence) pause("Rien entendu")
                else if (local) { surAppareil = false; ecouter() }
                else dicteeGoogle()
            }
        })
        r.startListening(Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE, "fr-FR")
            .putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            .putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
            .putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true))
    }

    private fun dicteeGoogle() {
        val i = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE, "fr-FR")
        AutoMicro.prevoir(this)  // le micro s'allume tout seul (service d'accessibilité)
        try { startActivityForResult(i, 1) } catch (e: Exception) { pause("Dictée indisponible") }
    }

    @Deprecated("API Activity")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        val t = data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)?.firstOrNull()
        if (requestCode == 1 && resultCode == RESULT_OK && !t.isNullOrBlank()) envoyer(t.trim()) else pause("Rien entendu")
    }

    // ---------- L'échange avec le relais du PC ----------
    private fun envoyer(q: String) {
        val moi = ++tour
        finDictee = SystemClock.elapsedRealtime(); debutVoix = 0; recu1 = 0; aLire = 0; toutRecu = false; msClaude = 0; modele = ""
        enAttente.clear()
        montrer(Etat.REFLECHIT, "…")
        texteVue.text = q
        texteVue.setTextColor(Color.GRAY)
        tempsVue.text = ""
        val demande = JSONObject().put("q", q).put("nouveau", nouveau)
        nouveau = false
        Thread {
            try {
                var fini = false
                echanger(demande) { o ->
                    if (o.has("t")) main.post { if (moi == tour) phrase(o.getString("t")) }
                    if (o.has("fin")) { fini = true; val ms = o.optJSONObject("ms"); main.post { if (moi == tour) fin(ms) } }
                    if (o.has("erreur")) { fini = true; val m = o.getString("erreur"); main.post { if (moi == tour) erreur(m) } }
                }
                if (!fini) main.post { if (moi == tour) erreur("Réponse coupée") }
            } catch (e: Exception) {
                Log.w(TAG, "relais injoignable", e)
                main.post { if (moi == tour) erreur(if (PAR_TELEPHONE) "Téléphone injoignable" else "Relais injoignable") }
            }
        }.start()
    }

    private fun phrase(t: String) {
        if (recu1 == 0L) {
            recu1 = SystemClock.elapsedRealtime()
            texteVue.text = ""; texteVue.setTextColor(Color.WHITE)
            montrer(Etat.PARLE, "Claude")
        }
        texteVue.append((if (texteVue.text.isEmpty()) "" else " ") + t)
        defile.post { defile.fullScroll(ScrollView.FOCUS_DOWN) }
        if (voixPrete) dire(t) else enAttente += t
    }

    private fun fin(ms: JSONObject?) {
        toutRecu = true
        Log.i(TAG, "relais ${ms} · 1re phrase reçue ${recu1 - finDictee} ms · $chemin")
        temps(ms)
        if (voixPrete && aLire <= 0 && enAttente.isEmpty()) ecouter()
        else if (voixEchec) pause("Touche pour répondre")   // pas de voix du tout : on lit à l'écran
        // sinon : la voix lira les phrases dès qu'elle sera prête, puis on réécoutera
    }

    /** Les temps de l'échange, depuis la fin de ta phrase : début de la voix, texte reçu, et la part de Claude sur le PC. */
    private fun temps(ms: JSONObject? = null) {
        if (ms != null) { msClaude = ms.optInt("phrase", 0); modele = ms.optString("modele", "") + (if (ms.has("compte")) " · compte " + ms.optInt("compte") else "") }
        val s = { v: Long -> String.format(Locale.FRANCE, "%.1f s", v / 1000f) }
        val l = mutableListOf<String>()
        if (debutVoix > 0) l += "voix " + s(debutVoix - finDictee)
        if (recu1 > 0) l += "texte " + s(recu1 - finDictee)
        if (msClaude > 0) l += "Claude " + s(msClaude.toLong())
        if (modele.isNotEmpty()) l += modele
        if (chemin.isNotEmpty()) l += chemin
        tempsVue.text = l.joinToString(" · ")
    }

    private fun erreur(m: String) { voix?.stop(); texteVue.setTextColor(Color.WHITE); texteVue.text = "Touche pour réessayer"; montrer(Etat.PAUSE, m) }

    private fun echanger(demande: JSONObject, ligne: (JSONObject) -> Unit) {
        if (PAR_TELEPHONE) parTelephone(demande, ligne) else parReseau(demande, ligne)
    }

    // Par le téléphone, en Bluetooth : la phrase part en message /vocal/q, les lignes de la réponse reviennent en
    // /vocal/r avec l'id de la question et un numéro d'ordre (remises dans l'ordre ici, au cas où).
    private val boites = ConcurrentHashMap<Int, LinkedBlockingQueue<JSONObject>>()
    private val compteur = AtomicInteger((System.currentTimeMillis() % 100000).toInt())
    @Volatile private var telephone: String? = null
    private val recepteur = MessageClient.OnMessageReceivedListener { ev ->
        if (ev.path == "/vocal/r") try {
            val o = JSONObject(String(ev.data, Charsets.UTF_8))
            boites[o.optInt("id")]?.put(o)
        } catch (e: Exception) { }
    }

    private fun parTelephone(demande: JSONObject, ligne: (JSONObject) -> Unit) {
        val id = compteur.incrementAndGet()
        val boite = LinkedBlockingQueue<JSONObject>()
        boites[id] = boite
        try {
            val tel = telephone ?: run {
                val noeuds = Tasks.await(Wearable.getNodeClient(this).connectedNodes, 5, TimeUnit.SECONDS)
                (noeuds.firstOrNull { it.isNearby } ?: noeuds.firstOrNull())?.id ?: throw java.io.IOException("téléphone non relié")
            }
            try {
                Tasks.await(Wearable.getMessageClient(this).sendMessage(tel, "/vocal/q", demande.put("id", id).toString().toByteArray()), 8, TimeUnit.SECONDS)
            } catch (e: Exception) { telephone = null; throw e }
            telephone = tel
            chemin = "téléphone"
            val attente = HashMap<Int, JSONObject>()
            var suivant = 0
            while (true) {
                val o = boite.poll(60, TimeUnit.SECONDS) ?: throw java.io.IOException("pas de réponse du téléphone")
                attente[o.optInt("n")] = o
                while (true) {
                    val x = attente.remove(suivant) ?: break
                    suivant++
                    ligne(x)
                    if (x.has("fin") || x.has("erreur") || x.has("ok")) return
                }
            }
        } finally { boites.remove(id) }
    }

    /** Par le réseau (relais sur un PC ou un serveur, gardé pour plus tard) : d'abord par le réseau du moment ; si le
     *  relais n'est pas joignable par là, par le Wi-Fi de la montre, rallumé pour l'occasion. */
    private fun parReseau(demande: JSONObject, ligne: (JSONObject) -> Unit) {
        val adr = BuildConfig.RELAIS_ADR
        val hote = adr.substringBeforeLast(":"); val port = adr.substringAfterLast(":").toIntOrNull() ?: 8793
        demande.put("cle", BuildConfig.RELAIS_CLE)
        val s = ouvrir(hote, port)
        s.use {
            it.tcpNoDelay = true
            it.soTimeout = 100_000
            it.getOutputStream().apply { write((demande.toString() + "\n").toByteArray()); flush() }
            val r = BufferedReader(InputStreamReader(it.getInputStream(), Charsets.UTF_8))
            while (true) { val l = r.readLine() ?: break; if (l.isNotBlank()) ligne(JSONObject(l)) }
        }
    }

    private fun ouvrir(hote: String, port: Int): Socket {
        val cm = getSystemService(ConnectivityManager::class.java)
        wifi?.let { n ->
            try { return n.socketFactory.createSocket().apply { connect(InetSocketAddress(hote, port), 4000) }.also { chemin = "Wi-Fi" } }
            catch (e: Exception) { wifi = null }
        }
        try {
            val s = Socket().apply { connect(InetSocketAddress(hote, port), 2500) }
            val c = cm.getNetworkCapabilities(cm.activeNetwork)
            chemin = when {
                c == null -> ""
                c.hasTransport(NetworkCapabilities.TRANSPORT_BLUETOOTH) -> "Bluetooth"
                c.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "Wi-Fi"
                else -> "réseau"
            }
            return s
        } catch (e: Exception) {
            Log.i(TAG, "pas joignable par le réseau du moment (${e.message}) : Wi-Fi demandé")
        }
        val pret = CountDownLatch(1)
        if (demandeWifi == null) {
            val cb = object : ConnectivityManager.NetworkCallback() {
                override fun onAvailable(network: Network) { wifi = network; pret.countDown() }
                override fun onLost(network: Network) { if (wifi == network) wifi = null }
            }
            demandeWifi = cb
            cm.requestNetwork(NetworkRequest.Builder().addTransportType(NetworkCapabilities.TRANSPORT_WIFI).build(), cb)
        }
        if (wifi == null) pret.await(12, TimeUnit.SECONDS)
        val n = wifi ?: throw java.io.IOException("Wi-Fi indisponible")
        chemin = "Wi-Fi"
        return n.socketFactory.createSocket().apply { connect(InetSocketAddress(hote, port), 4000) }
    }

    // ---------- La voix ----------
    // La voix de synthèse de la montre met plusieurs secondes à démarrer (mesuré le 17/11 : plus que la réponse de
    // Claude) : elle est créée une fois et gardée prête (VOIX), et les phrases arrivées avant elle attendent.
    private var voixEchec = false

    private fun preparerVoix() {
        courante = this
        val v = VOIX
        if (v != null && VOIX_PRETE) { brancherVoix(v); return }
        prechauffer(applicationContext)   // déjà en route depuis le lancement de l'appli, en général
    }

    private fun voixImpossible() {
        voixEchec = true
        if (toutRecu && etat == Etat.PARLE) pause("Touche pour répondre")
    }

    /** La voix est prête : on écoute ses événements, et on lit ce qui attendait. */
    private fun brancherVoix(v: TextToSpeech) {
        voix = v
        v.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(id: String?) {
                if (id == "$tour" && debutVoix == 0L) {
                    debutVoix = SystemClock.elapsedRealtime()
                    Log.i(TAG, "voix ${debutVoix - finDictee} ms après la fin de la phrase")
                    main.post { temps() }
                }
            }
            override fun onDone(id: String?) { main.post { lu(id) } }
            @Deprecated("API") override fun onError(id: String?) { main.post { lu(id) } }
            override fun onStop(id: String?, interrupted: Boolean) {}
        })
        // Montre en silencieux : on met le son à un niveau audible, sinon on n'entend rien
        try {
            val am = getSystemService(AudioManager::class.java)
            val max = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
            if (am.getStreamVolume(AudioManager.STREAM_MUSIC) < max / 3) am.setStreamVolume(AudioManager.STREAM_MUSIC, max * 2 / 3, 0)
        } catch (e: Exception) { }
        voixPrete = true
        if (etat == Etat.PARLE && enAttente.isNotEmpty()) {
            val l = ArrayList(enAttente); enAttente.clear()
            l.forEach { dire(it) }
        }
    }

    private fun dire(t: String) { aLire++; voix?.speak(t, TextToSpeech.QUEUE_ADD, null, "$tour") }

    private fun lu(id: String?) {
        if (id != "$tour") return
        aLire--
        if (aLire <= 0 && toutRecu && etat == Etat.PARLE) ecouter()   // Claude a fini : on réécoute tout de suite
    }

    private fun vibrer(ms: Long) = try {
        getSystemService(Vibrator::class.java).vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE))
    } catch (e: Exception) { }

    companion object {
        const val TAG = "Vocal"
        private var VOIX: TextToSpeech? = null       // gardée d'une ouverture à l'autre
        private var VOIX_PRETE = false
        private var courante: VocalActivity? = null

        /**
         * Démarre la voix de synthèse et la réveille en silence (une phrase écrite dans un fichier, sans son) : à froid,
         * elle met ~20 s avant de dire le premier mot (mesuré le 17/11). Appelé au lancement de l'appli (App) et à
         * l'ouverture de l'écran ; la voix reste prête tant que l'appli vit.
         */
        fun prechauffer(ctx: Context) {
            if (VOIX != null) return
            val debut = SystemClock.elapsedRealtime()
            VOIX = TextToSpeech(ctx.applicationContext) { statut ->
                Handler(Looper.getMainLooper()).post {
                    val tts = VOIX
                    val ok = statut == TextToSpeech.SUCCESS && tts != null &&
                        tts.setLanguage(Locale.FRANCE).let { it != TextToSpeech.LANG_MISSING_DATA && it != TextToSpeech.LANG_NOT_SUPPORTED }
                    if (!ok) {
                        Log.w(TAG, "pas de voix française sur la montre ($statut)")
                        try { tts?.shutdown() } catch (e: Exception) { }
                        VOIX = null
                        courante?.voixImpossible()
                        return@post
                    }
                    tts!!.setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ASSISTANT)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
                    tts.setSpeechRate(1.08f)
                    try {
                        val fr = tts.voices.filter { it.locale.language == "fr" && !it.isNetworkConnectionRequired &&
                            !it.features.contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED) }
                        fr.minWithOrNull(compareBy({ it.latency }, { -it.quality }))?.let { tts.voice = it; Log.i(TAG, "voix choisie : ${it.name}") }
                    } catch (e: Exception) { }
                    // Réveil en silence : charge le modèle de la voix sans rien faire entendre
                    try {
                        val f = File(ctx.cacheDir, "chauffe.wav")
                        tts.synthesizeToFile("Bonjour, je suis prêt.", null, f, "chauffe")
                    } catch (e: Exception) { }
                    VOIX_PRETE = true
                    Log.i(TAG, "voix prête en ${SystemClock.elapsedRealtime() - debut} ms : ${tts.defaultEngine}")
                    courante?.brancherVoix(tts)
                }
            }
        }
        const val PAR_TELEPHONE = true   // Claude tourne sur le téléphone (Termux) ; false = relais joint par le réseau
        val ORANGE = Color.rgb(217, 119, 87)
    }
}
