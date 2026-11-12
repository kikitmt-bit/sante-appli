package fr.kiki.pokemontre

import android.Manifest
import android.app.Activity
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Bundle
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.SystemClock
import android.os.VibrationEffect
import android.os.Vibrator
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import java.io.BufferedWriter
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Capteurs (10/11, Kiki) : enregistre les capteurs de la montre pendant une séance de rameur ou d'elliptique, pour
 * apprendre le mouvement avant d'en faire le capteur du jeu (à la place du téléphone sous le siège). Rien n'est envoyé :
 * un fichier CSV par séance dans Android/data/fr.kiki.pokemontre/files/capteurs/, relevé par ADB depuis le PC.
 * Lignes : t (heure en ms depuis 1970, comme Date.now() du téléphone), type, valeurs :
 *  a = accéléromètre brut, pesanteur comprise (m/s², x y z) ; g = gyroscope (rad/s) ;
 *  r = rotation (game rotation vector, x y z w) ; h = cœur (bpm).
 */
class CapteursActivity : Activity() {
    private lateinit var machine: Button
    private lateinit var bouton: Button
    private lateinit var info: TextView
    private val ui = Handler(Looper.getMainLooper())
    private val tic = object : Runnable { override fun run() { maj(); ui.postDelayed(this, 500) } }
    private var choix = "rameur"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        choix = getSharedPreferences("capteurs", MODE_PRIVATE).getString("machine", "rameur")!!
        val l = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER; setBackgroundColor(Color.BLACK)
            setPadding(30, 30, 30, 30)
        }
        machine = Button(this).apply { textSize = 15f; setOnClickListener { changer() } }
        bouton = Button(this).apply { textSize = 18f; setOnClickListener { appuyer() } }
        info = TextView(this).apply { setTextColor(Color.WHITE); textSize = 14f; gravity = Gravity.CENTER }
        l.addView(machine); l.addView(bouton); l.addView(info)
        setContentView(l)
        val manque = listOf(Manifest.permission.BODY_SENSORS, Manifest.permission.ACTIVITY_RECOGNITION, Manifest.permission.POST_NOTIFICATIONS)
            .filter { checkSelfPermission(it) != PackageManager.PERMISSION_GRANTED }
        if (manque.isNotEmpty()) requestPermissions(manque.toTypedArray(), 9)
    }

    override fun onResume() { super.onResume(); ui.post(tic) }
    override fun onPause() { super.onPause(); ui.removeCallbacks(tic) }

    private fun changer() {
        if (Enregistreur.enCours) return
        choix = if (choix == "rameur") "elliptique" else "rameur"
        getSharedPreferences("capteurs", MODE_PRIVATE).edit().putString("machine", choix).apply()
        maj()
    }

    private fun appuyer() {
        if (Enregistreur.enCours) stopService(Intent(this, Enregistreur::class.java))
        else startForegroundService(Intent(this, Enregistreur::class.java).putExtra("machine", choix))
        ui.postDelayed({ maj() }, 300)
    }

    private fun maj() {
        val e = Enregistreur.enCours
        machine.text = if (choix == "rameur") "Rameur ⇄" else "Elliptique ⇄"
        machine.setBackgroundColor(0xFF22315A.toInt()); machine.setTextColor(Color.WHITE)
        machine.alpha = if (e) 0.5f else 1f
        bouton.text = if (e) "■ Arrêter" else "● Enregistrer"
        bouton.setBackgroundColor(if (e) 0xFF686850.toInt() else 0xFFD83830.toInt())
        bouton.setTextColor(Color.WHITE)
        info.text = if (e) {
            val s = (SystemClock.elapsedRealtime() - Enregistreur.debut) / 1000
            val j = Enregistreur.jeu
            "%d:%02d · %d mesures/s%s".format(s / 60, s % 60, Enregistreur.parSeconde,
                if (Enregistreur.coeur > 0) " · ♥ ${Enregistreur.coeur}" else "") +
                (if (j != null) "\n${j.coups} " + (if (choix == "rameur") "coups" else "tours") + " · " + (if (j.relie) "jeu relié" else "relais…") else "")
        } else Enregistreur.dernier ?: "Touche la machine pour changer"
    }
}

class Enregistreur : Service(), SensorEventListener {
    private var fil: HandlerThread? = null
    private var sortie: BufferedWriter? = null
    private var verrou: PowerManager.WakeLock? = null
    private var fichier: File? = null
    private var decalage = 0L   // heure murale (ms) - horloge des capteurs (ms)
    private var lignes = 0L
    private var compteSeconde = 0; private var seconde = 0L

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (enCours) return START_NOT_STICKY
        val machine = intent?.getStringExtra("machine") ?: "rameur"
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel("capteurs", "Enregistrement des capteurs", NotificationManager.IMPORTANCE_LOW))
        val tap = PendingIntent.getActivity(this, 11, Intent(this, CapteursActivity::class.java), PendingIntent.FLAG_IMMUTABLE)
        val n = Notification.Builder(this, "capteurs").setSmallIcon(R.drawable.ic_ball).setContentTitle("Capteurs")
            .setContentText((if (machine == "rameur") "Rameur" else "Elliptique") + " : relié au jeu").setOngoing(true).setContentIntent(tap).build()
        if (android.os.Build.VERSION.SDK_INT >= 34) startForeground(12, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH)
        else startForeground(12, n)
        verrou = getSystemService(PowerManager::class.java)
            .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "pokemontre:capteurs").apply { acquire(90 * 60_000L) }

        val dossier = File(getExternalFilesDir(null), "capteurs").apply { mkdirs() }
        val nom = "$machine-" + SimpleDateFormat("yyyyMMdd-HHmmss", Locale.US).format(Date()) + ".csv"
        fichier = File(dossier, nom)
        decalage = System.currentTimeMillis() - SystemClock.elapsedRealtimeNanos() / 1_000_000
        sortie = fichier!!.bufferedWriter().apply {
            write("# machine=$machine debut=${System.currentTimeMillis()} appareil=${android.os.Build.MODEL}\n")
            write("t,type,v1,v2,v3,v4\n")
        }
        jeu = LienJeu(machine)   // le jeu reçoit chaque coup de rame ou chaque tour d'elliptique, en direct
        lignes = 0; enCours = true; debut = SystemClock.elapsedRealtime(); coeur = 0; parSeconde = 0

        val sm = getSystemService(SensorManager::class.java)
        fil = HandlerThread("capteurs").apply { start() }
        val h = Handler(fil!!.looper)
        val us = 20_000   // 50 mesures par seconde
        listOf(Sensor.TYPE_ACCELEROMETER, Sensor.TYPE_GYROSCOPE, Sensor.TYPE_GAME_ROTATION_VECTOR).forEach { t ->
            sm.getDefaultSensor(t)?.let { sm.registerListener(this, it, us, h) }
        }
        if (checkSelfPermission(Manifest.permission.BODY_SENSORS) == PackageManager.PERMISSION_GRANTED)
            sm.getDefaultSensor(Sensor.TYPE_HEART_RATE)?.let { sm.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL, h) }
        vibrer(200)
        // Garde-fou : une heure au plus
        h.postDelayed({ stopSelf() }, 60 * 60_000L)
        return START_NOT_STICKY
    }

    override fun onSensorChanged(e: SensorEvent) {
        val o = sortie ?: return
        val t = decalage + e.timestamp / 1_000_000
        val v = e.values
        val l = when (e.sensor.type) {
            Sensor.TYPE_ACCELEROMETER -> "$t,a,${f(v[0])},${f(v[1])},${f(v[2])}"
            Sensor.TYPE_GYROSCOPE -> "$t,g,${f(v[0])},${f(v[1])},${f(v[2])}"
            Sensor.TYPE_GAME_ROTATION_VECTOR -> "$t,r,${f(v[0])},${f(v[1])},${f(v[2])},${f(if (v.size > 3) v[3] else 0f)}"
            Sensor.TYPE_HEART_RATE -> { if (v[0] > 25) { coeur = v[0].toInt(); jeu?.coeur = coeur }; "$t,h,${v[0].toInt()}" }
            else -> return
        }
        try { o.write(l); o.write("\n") } catch (x: Exception) { }
        lignes++
        if (e.sensor.type == Sensor.TYPE_ACCELEROMETER) {
            jeu?.mesure(t, v[0], v[1], v[2])
            val s = SystemClock.elapsedRealtime() / 1000
            if (s != seconde) { parSeconde = compteSeconde; compteSeconde = 0; seconde = s }
            compteSeconde++
        }
        if (lignes % 1000 == 0L) try { o.flush() } catch (x: Exception) { }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    override fun onDestroy() {
        getSystemService(SensorManager::class.java).unregisterListener(this)
        val f = fil
        f?.looper?.let { Handler(it).post { fermer(); f.quitSafely() } } ?: fermer()
        verrou?.let { if (it.isHeld) it.release() }
        jeu?.fin(); jeu = null
        enCours = false
        val s = (SystemClock.elapsedRealtime() - debut) / 1000
        dernier = "Gardé : %d:%02d\n%s".format(s / 60, s % 60, fichier?.name ?: "")
        vibrer(500)
        super.onDestroy()
    }

    private fun fermer() { try { sortie?.flush(); sortie?.close() } catch (x: Exception) { }; sortie = null }

    private fun vibrer(ms: Long) = try {
        getSystemService(Vibrator::class.java).vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE))
    } catch (x: Exception) { }

    private fun f(x: Float) = "%.4f".format(Locale.US, x)

    companion object {
        @Volatile var enCours = false
        @Volatile var debut = 0L
        @Volatile var coeur = 0
        @Volatile var parSeconde = 0
        @Volatile var dernier: String? = null
        @Volatile var jeu: LienJeu? = null
    }
}
