package fr.kiki.pokemontre

import android.app.Activity
import android.os.Bundle
import android.view.WindowManager

/** Plein écran : les Poké Balls à ouvrir, une par une (sinon la barre d'effort). Les données se rafraîchissent derrière. */
class OuvrirActivity : Activity() {
    private lateinit var vue: BallView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        vue = BallView(this) { finish() }
        setContentView(vue)
        vue.majEtat(Donnees.lire(this))
        Thread {
            if (Donnees.telecharger(this)) runOnUiThread { if (!isFinishing) vue.majEtat(Donnees.lire(this)) }
            BarreComplication.rafraichir(this)
        }.start()
    }
}
