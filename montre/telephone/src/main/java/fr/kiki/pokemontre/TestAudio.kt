package fr.kiki.pokemontre

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.graphics.Typeface
import android.media.AudioAttributes
import android.media.AudioDeviceInfo
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.AudioTrack
import android.media.MediaRecorder
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin

/**
 * « Test audio montre » (essai du 17/11/2026) : le téléphone accepte-t-il la montre comme micro et haut-parleur pour
 * une appli, comme il le fait pour un appel ? Et le mode vocal de l'appli Claude suit-il ce branchement ?
 * ① liste les appareils que le téléphone propose pour le son « d'appel » ; ② branche la montre, y joue trois bips,
 * enregistre 4 s par son micro et les rejoue (le rapport dit par où le son est VRAIMENT passé) ; ③ garde la montre
 * branchée (service GardeAudio) et ouvre Claude : on lance le mode vocal, on écoute d'où sort la voix, et le journal
 * note chaque seconde le micro et la sortie utilisés. Rien n'est envoyé nulle part : le rapport reste sur l'écran
 * (bouton « Copier le résultat »).
 */
class TestAudio : Activity() {
    private lateinit var am: AudioManager
    private lateinit var rapport: TextView
    private val main = Handler(Looper.getMainLooper())
    private val texte = StringBuilder()
    private var occupe = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        am = getSystemService(AudioManager::class.java)
        val m = (16 * resources.displayMetrics.density).toInt()
        fun bouton(t: String, f: () -> Unit) = Button(this).apply { text = t; isAllCaps = false; textSize = 16f; setOnClickListener { f() } }
        rapport = TextView(this).apply { textSize = 13f; setTextColor(Color.WHITE); typeface = Typeface.MONOSPACE; setTextIsSelectable(true) }
        val col = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL; setPadding(m, m, m, m)
            addView(TextView(context).apply {
                text = "Test audio montre"; textSize = 22f; setTextColor(Color.WHITE); typeface = Typeface.DEFAULT_BOLD; gravity = Gravity.CENTER
            })
            addView(TextView(context).apply {
                text = "Garde la montre au poignet, reliée au téléphone. Fais les étapes dans l'ordre."
                textSize = 14f; setTextColor(Color.LTGRAY); setPadding(0, m / 2, 0, m / 2)
            })
            addView(bouton("① Quels appareils audio ?") { etape1() })
            addView(bouton("② Bips + micro sur la montre (15 s)") { etape2() })
            addView(bouton("③ Brancher la montre et ouvrir Claude") { etape3() })
            addView(bouton("④ Arrêter et voir le résultat") { etape4() })
            addView(bouton("Copier le résultat") { copier() })
            addView(rapport)
        }
        setContentView(ScrollView(this).apply { addView(col) })
        val manque = mutableListOf(Manifest.permission.RECORD_AUDIO)
        if (Build.VERSION.SDK_INT >= 31) manque += Manifest.permission.BLUETOOTH_CONNECT
        if (Build.VERSION.SDK_INT >= 33) manque += Manifest.permission.POST_NOTIFICATIONS
        manque.removeAll { checkSelfPermission(it) == PackageManager.PERMISSION_GRANTED }
        if (manque.isNotEmpty()) requestPermissions(manque.toTypedArray(), 1) else etape1()
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) { etape1() }

    override fun onResume() { super.onResume(); if (GardeAudio.actif) montrerJournal() }

    private fun dire(l: String) {
        main.post { texte.append(l).append('\n'); rapport.text = texte }
    }

    // ---------- ① Les appareils que le téléphone propose pour le son d'appel ----------
    private fun etape1() {
        dire("—— ① Appareils (${Build.MODEL}, Android ${Build.VERSION.RELEASE}) ——")
        if (Build.VERSION.SDK_INT < 31) { dire("Android 12 au moins est nécessaire pour ce test."); return }
        val l = am.availableCommunicationDevices
        for (d in l) dire("• " + decrire(d))
        val w = montre(am)
        dire(if (w != null) "✅ Appareil Bluetooth proposé pour le son d'appel : « ${w.productName} »"
             else "❌ Aucun appareil Bluetooth proposé pour le son d'appel (la montre n'apparaît pas).")
        profilAppels()
    }

    /** Les appareils reliés au téléphone avec le profil « appels » du Bluetooth (celui d'un kit mains libres). */
    @SuppressLint("MissingPermission")
    private fun profilAppels() {
        if (Build.VERSION.SDK_INT >= 31 && checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
            dire("(Bluetooth non autorisé : je ne peux pas lire les profils)"); return
        }
        try {
            val ad = getSystemService(BluetoothManager::class.java).adapter ?: return
            ad.getProfileProxy(this, object : BluetoothProfile.ServiceListener {
                override fun onServiceConnected(profile: Int, proxy: BluetoothProfile) {
                    val noms = try { proxy.connectedDevices.map { it.name ?: "?" } } catch (e: Exception) { listOf("erreur ${e.message}") }
                    dire("Profil « appels » du Bluetooth : " + if (noms.isEmpty()) "aucun appareil relié" else noms.joinToString())
                    ad.closeProfileProxy(profile, proxy)
                }
                override fun onServiceDisconnected(profile: Int) {}
            }, BluetoothProfile.HEADSET)
        } catch (e: Exception) { dire("Profils Bluetooth illisibles : ${e.message}") }
    }

    // ---------- ② Bips, enregistrement et réécoute par la montre ----------
    private fun etape2() {
        if (occupe) return
        if (Build.VERSION.SDK_INT < 31) { dire("Android 12 au moins est nécessaire."); return }
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), 1); dire("Autorise le micro puis recommence ②."); return
        }
        if (GardeAudio.actif) { dire("Arrête d'abord ③ (bouton ④)."); return }
        occupe = true
        dire("—— ② Bips + micro ——")
        Thread {
            try { essai() } catch (e: Exception) { dire("Erreur : ${e.javaClass.simpleName} ${e.message}") }
            finally { debrancher(am); occupe = false }
        }.start()
    }

    @SuppressLint("MissingPermission")
    private fun essai() {
        val w = montre(am)
        if (w == null) { dire("❌ Pas d'appareil Bluetooth à brancher : essai impossible."); return }
        val pris = brancher(am, w)
        dire("Branchement de « ${w.productName} » : " + (if (pris) "accepté" else "refusé") + " → son d'appel sur : " + decrire(am.communicationDevice))
        dire("Trois bips… (les entends-tu sur la montre ?)")
        val sortie = jouer(bips())
        dire("Sortie vraiment utilisée : $sortie")
        dire("Parle maintenant, 4 secondes…")
        val taille = max(AudioRecord.getMinBufferSize(HZ, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT), HZ / 5 * 2)
        val r = AudioRecord(MediaRecorder.AudioSource.VOICE_COMMUNICATION, HZ, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT, taille)
        val son = ShortArray(HZ * 4)
        var n = 0
        r.startRecording()
        while (n < son.size) { val k = r.read(son, n, min(1600, son.size - n)); if (k <= 0) break; n += k }
        val entree = decrire(r.routedDevice)
        r.stop(); r.release()
        val pic = son.maxOf { abs(it.toInt()) } * 100 / 32768
        dire("Micro vraiment utilisé : $entree (niveau maximum $pic %)")
        dire("Réécoute de ta voix…")
        jouer(son)
        val ok = sortie.contains("Bluetooth") && entree.contains("Bluetooth")
        dire(if (ok) "✅ Le téléphone envoie le son d'une appli à la montre et prend son micro."
             else "❌ Le son ou le micro n'est pas passé par la montre.")
        dire("(Dis-moi aussi ce que tu as entendu, et où.)")
    }

    private fun bips(): ShortArray {
        val s = ShortArray(HZ * 2)
        for (b in 0 until 3) for (i in 0 until HZ * 3 / 10) {
            val k = b * HZ * 6 / 10 + i
            s[k] = (sin(2 * PI * 880 * i / HZ) * 12000).toInt().toShort()
        }
        return s
    }

    /** Joue le son comme un son d'appel ; renvoie l'appareil par où il est vraiment sorti. */
    private fun jouer(pcm: ShortArray): String {
        val t = pisteAppel()
        t.play()
        t.write(pcm, 0, pcm.size)
        val d = decrire(t.routedDevice)
        Thread.sleep(400)
        t.stop(); t.release()
        return d
    }

    // ---------- ③ Garder la montre branchée et ouvrir Claude ----------
    private fun etape3() {
        if (occupe) return
        if (Build.VERSION.SDK_INT < 31) { dire("Android 12 au moins est nécessaire."); return }
        dire("—— ③ Montre branchée, Claude ouvert ——")
        dire("Dans Claude : lance le mode vocal, dis une phrase, écoute d'où sort la réponse (montre ou téléphone), puis reviens ici et touche ④.")
        startForegroundService(Intent(this, GardeAudio::class.java))
        val i = packageManager.getLaunchIntentForPackage(CLAUDE)
        if (i == null) dire("Appli Claude introuvable sur ce téléphone : ouvre-la à la main.")
        else main.postDelayed({ startActivity(i) }, 2500)
    }

    private fun etape4() {
        montrerJournal()
        startService(Intent(this, GardeAudio::class.java).setAction(GardeAudio.STOP))
    }

    private fun montrerJournal() {
        val l = synchronized(GardeAudio.journal) { ArrayList(GardeAudio.journal) }
        if (l.isEmpty()) { dire("(journal vide)"); return }
        dire("—— Journal de ③ ——")
        for (x in l) dire(x)
        synchronized(GardeAudio.journal) { GardeAudio.journal.clear() }
    }

    private fun copier() {
        getSystemService(ClipboardManager::class.java).setPrimaryClip(ClipData.newPlainText("Test audio montre", texte.toString()))
        dire("(copié : colle-le dans la conversation avec Claude)")
    }

    companion object {
        const val HZ = 16000
        const val CLAUDE = "com.anthropic.claude"

        fun decrire(d: AudioDeviceInfo?): String = if (d == null) "aucun" else when (d.type) {
            AudioDeviceInfo.TYPE_BUILTIN_EARPIECE -> "écouteur du téléphone"
            AudioDeviceInfo.TYPE_BUILTIN_SPEAKER, 24 -> "haut-parleur du téléphone"
            AudioDeviceInfo.TYPE_BUILTIN_MIC -> "micro du téléphone"
            AudioDeviceInfo.TYPE_BLUETOOTH_SCO -> "Bluetooth appels « ${d.productName} »"
            AudioDeviceInfo.TYPE_BLUETOOTH_A2DP -> "Bluetooth musique « ${d.productName} »"
            26, 27 -> "Bluetooth LE « ${d.productName} »"
            AudioDeviceInfo.TYPE_WIRED_HEADSET, AudioDeviceInfo.TYPE_WIRED_HEADPHONES, AudioDeviceInfo.TYPE_USB_HEADSET -> "casque filaire"
            AudioDeviceInfo.TYPE_TELEPHONY -> "ligne téléphonique"
            else -> "type ${d.type} « ${d.productName} »"
        }

        /** L'appareil Bluetooth que le téléphone propose pour le son d'appel : la montre de préférence. */
        fun montre(am: AudioManager): AudioDeviceInfo? {
            if (Build.VERSION.SDK_INT < 31) return null
            val bt = am.availableCommunicationDevices.filter { it.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO || it.type == 26 }
            return bt.firstOrNull { it.productName.toString().contains("watch", true) } ?: bt.firstOrNull()
        }

        /** Passe le téléphone en « conversation » et demande la montre comme micro et haut-parleur (attend 6 s au plus). */
        fun brancher(am: AudioManager, d: AudioDeviceInfo): Boolean {
            if (Build.VERSION.SDK_INT < 31) return false
            am.mode = AudioManager.MODE_IN_COMMUNICATION
            val ok = am.setCommunicationDevice(d)
            var i = 0
            while (i++ < 30 && am.communicationDevice?.id != d.id) Thread.sleep(200)
            Thread.sleep(600)
            return ok
        }

        fun debrancher(am: AudioManager) {
            try { if (Build.VERSION.SDK_INT >= 31) am.clearCommunicationDevice() } catch (e: Exception) { }
            am.mode = AudioManager.MODE_NORMAL
        }

        fun pisteAppel(): AudioTrack = AudioTrack.Builder()
            .setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
            .setAudioFormat(AudioFormat.Builder().setEncoding(AudioFormat.ENCODING_PCM_16BIT).setSampleRate(HZ)
                .setChannelMask(AudioFormat.CHANNEL_OUT_MONO).build())
            .setTransferMode(AudioTrack.MODE_STREAM)
            .setBufferSizeInBytes(AudioTrack.getMinBufferSize(HZ, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT) * 2)
            .build()
    }
}

/**
 * Garde la montre branchée comme micro et haut-parleur pendant qu'on essaie le mode vocal de Claude (étape ③) : le
 * téléphone reste en « conversation » (un silence joué comme un son d'appel, sinon Android reprend la main au bout de
 * quelques secondes) et le journal note, à chaque changement, le mode, l'appareil du son d'appel, les micros en service
 * et les sons joués. S'arrête par ④, par la notification, ou seul après 6 minutes.
 */
class GardeAudio : Service() {
    private var fil: Thread? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == STOP) { stopSelf(); return START_NOT_STICKY }
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel("test", "Test audio montre", NotificationManager.IMPORTANCE_LOW))
        val stop = PendingIntent.getService(this, 1, Intent(this, GardeAudio::class.java).setAction(STOP), PendingIntent.FLAG_IMMUTABLE)
        val n = Notification.Builder(this, "test").setSmallIcon(R.drawable.ic_lanceur)
            .setContentTitle("Test audio montre en cours").setContentText("La montre est branchée comme micro et haut-parleur")
            .addAction(Notification.Action.Builder(null, "Arrêter", stop).build()).setOngoing(true).build()
        if (Build.VERSION.SDK_INT >= 29) startForeground(7, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK) else startForeground(7, n)
        if (fil == null) { actif = true; fil = Thread { garder() }.also { it.start() } }
        return START_NOT_STICKY
    }

    private fun noter(l: String) {
        synchronized(journal) { journal += SimpleDateFormat("HH:mm:ss", Locale.FRANCE).format(Date()) + "  " + l }
    }

    private fun garder() {
        val am = getSystemService(AudioManager::class.java)
        var piste: AudioTrack? = null
        try {
            val w = TestAudio.montre(am)
            if (w == null) { noter("❌ pas d'appareil Bluetooth à brancher"); return }
            val pris = TestAudio.brancher(am, w)
            noter("branchement de « ${w.productName} » : " + if (pris) "accepté" else "refusé")
            piste = TestAudio.pisteAppel().also { it.play() }
            val silence = ShortArray(TestAudio.HZ / 4)
            var avant = ""
            val fin = System.currentTimeMillis() + 6 * 60_000
            while (actif && System.currentTimeMillis() < fin && !Thread.currentThread().isInterrupted) {
                piste.write(silence, 0, silence.size)  // 250 ms
                val e = etat(am)
                if (e != avant) { noter(e); avant = e }
            }
        } catch (e: InterruptedException) {
        } catch (e: Exception) { noter("erreur : ${e.javaClass.simpleName} ${e.message}")
        } finally {
            try { piste?.stop(); piste?.release() } catch (e: Exception) { }
            TestAudio.debrancher(am)
            noter("fin : montre débranchée")
            actif = false
            stopSelf()
        }
    }

    private fun etat(am: AudioManager): String {
        val mode = when (am.mode) {
            AudioManager.MODE_NORMAL -> "normal"; AudioManager.MODE_IN_COMMUNICATION -> "conversation"
            AudioManager.MODE_IN_CALL -> "appel"; AudioManager.MODE_RINGTONE -> "sonnerie"; else -> "mode ${am.mode}"
        }
        val appel = if (Build.VERSION.SDK_INT >= 31) TestAudio.decrire(am.communicationDevice) else "?"
        val micros = am.activeRecordingConfigurations.joinToString(" + ") {
            val src = when (it.clientAudioSource) {
                MediaRecorder.AudioSource.VOICE_COMMUNICATION -> "appel"; MediaRecorder.AudioSource.MIC -> "normal"
                MediaRecorder.AudioSource.VOICE_RECOGNITION -> "dictée"; MediaRecorder.AudioSource.UNPROCESSED -> "brut"
                else -> "source ${it.clientAudioSource}"
            }
            val muet = if (Build.VERSION.SDK_INT >= 29 && it.isClientSilenced) " (coupé)" else ""
            "micro $src par " + TestAudio.decrire(it.audioDevice) + muet
        }.ifEmpty { "aucun micro en service" }
        val sons = am.activePlaybackConfigurations.groupingBy {
            when (it.audioAttributes.usage) {
                AudioAttributes.USAGE_VOICE_COMMUNICATION -> "appel"; AudioAttributes.USAGE_MEDIA -> "média"
                AudioAttributes.USAGE_ASSISTANT -> "assistant"; AudioAttributes.USAGE_UNKNOWN -> "inconnu"
                else -> "usage ${it.audioAttributes.usage}"
            }
        }.eachCount().toSortedMap().map { "${it.key}×${it.value}" }.joinToString(", ")
        return "$mode | son d'appel : $appel | $micros | sons : $sons"
    }

    override fun onDestroy() { actif = false; fil?.interrupt(); super.onDestroy() }

    companion object {
        const val STOP = "fr.kiki.pokemontre.STOP_TEST_AUDIO"
        val journal = ArrayList<String>()
        @Volatile var actif = false
    }
}
