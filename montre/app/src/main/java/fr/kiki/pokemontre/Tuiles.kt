package fr.kiki.pokemontre

import android.content.Context
import androidx.wear.protolayout.ActionBuilders
import androidx.wear.protolayout.ColorBuilders.argb
import androidx.wear.protolayout.DeviceParametersBuilders.DeviceParameters
import androidx.wear.protolayout.DimensionBuilders.expand
import androidx.wear.protolayout.LayoutElementBuilders
import androidx.wear.protolayout.ModifiersBuilders
import androidx.wear.protolayout.ResourceBuilders
import androidx.wear.protolayout.TimelineBuilders
import androidx.wear.protolayout.material.Chip
import androidx.wear.protolayout.material.ChipColors
import androidx.wear.protolayout.material.CircularProgressIndicator
import androidx.wear.protolayout.material.ProgressIndicatorColors
import androidx.wear.protolayout.material.Text
import androidx.wear.protolayout.material.Typography
import androidx.wear.protolayout.material.layouts.EdgeContentLayout
import androidx.wear.protolayout.material.layouts.PrimaryLayout
import androidx.wear.tiles.RequestBuilders
import androidx.wear.tiles.TileBuilders
import androidx.wear.tiles.TileService
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture

/**
 * Les tuiles (les écrans qu'on fait défiler en glissant à côté du cadran) : Pokémon, Santé du jour, Claude.
 * Un essai, à changer au besoin. Rafraîchies avec les complications (Tuiles.rafraichir) et toutes les 15 min.
 */
object Tuiles {
    const val ORANGE = 0xFFD97757.toInt()
    const val JAUNE = 0xFFFFCB05.toInt()
    const val GRIS = 0xFF9AA7C2.toInt()
    const val BLANC = 0xFFFFFFFF.toInt()
    const val FOND = 0xFF1C2740.toInt()

    fun rafraichir(ctx: Context) {
        val u = TileService.getUpdater(ctx)
        for (c in listOf(TuilePokemon::class.java, TuileSante::class.java, TuileClaude::class.java)) try { u.requestUpdate(c) } catch (e: Exception) { }
    }

    fun ouvrir(ctx: Context, activite: Class<*>, id: String) = ModifiersBuilders.Clickable.Builder().setId(id)
        .setOnClick(ActionBuilders.LaunchAction.Builder().setAndroidActivity(
            ActionBuilders.AndroidActivity.Builder().setPackageName(ctx.packageName).setClassName(activite.name).build()).build())
        .build()

    fun texte(ctx: Context, s: String, typo: Int, couleur: Int, lignes: Int = 1) =
        Text.Builder(ctx, s).setTypography(typo).setColor(argb(couleur)).setMaxLines(lignes).build()

    /** Toute la tuile se touche. */
    fun cliquable(contenu: LayoutElementBuilders.LayoutElement, clic: ModifiersBuilders.Clickable) =
        LayoutElementBuilders.Box.Builder().setWidth(expand()).setHeight(expand()).addContent(contenu)
            .setModifiers(ModifiersBuilders.Modifiers.Builder().setClickable(clic).build()).build()

    fun tuile(contenu: LayoutElementBuilders.LayoutElement): ListenableFuture<TileBuilders.Tile> = Futures.immediateFuture(
        TileBuilders.Tile.Builder().setResourcesVersion("1").setFreshnessIntervalMillis(15 * 60_000L)
            .setTileTimeline(TimelineBuilders.Timeline.fromLayoutElement(contenu)).build())

    fun ressources(): ListenableFuture<ResourceBuilders.Resources> =
        Futures.immediateFuture(ResourceBuilders.Resources.Builder().setVersion("1").build())

    fun colonne(vararg e: LayoutElementBuilders.LayoutElement) =
        LayoutElementBuilders.Column.Builder().apply { e.forEach { addContent(it) } }.build()
}

/** Pokémon : la barre en anneau (avec les pas en direct), ou les Poké Balls à ouvrir. */
class TuilePokemon : TileService() {
    override fun onTileRequest(requestParams: RequestBuilders.TileRequest): ListenableFuture<TileBuilders.Tile> {
        val dp: DeviceParameters = requestParams.deviceConfiguration
        val e = Donnees.lire(this)
        val pts = e?.let { Direct.points(this, it) } ?: 0f
        val taille = e?.taille ?: 100
        val n = e?.balls?.size ?: 0
        val (pas, zone, _) = e?.let { Jeu.resteBarre(it.copy(points = pts)) } ?: Triple(0, 0, 0)
        val contenu = EdgeContentLayout.Builder(dp)
            .setEdgeContent(CircularProgressIndicator.Builder().setProgress((pts / taille).coerceIn(0f, 1f))
                .setCircularProgressIndicatorColors(ProgressIndicatorColors(Tuiles.JAUNE, Tuiles.FOND)).build())
            .setPrimaryLabelTextContent(Tuiles.texte(this, "Pokémon", Typography.TYPOGRAPHY_CAPTION1, Tuiles.GRIS))
            .setContent(Tuiles.texte(this, if (n > 0) "×$n" else "${minOf(pts, taille.toFloat()).toInt()}%",
                Typography.TYPOGRAPHY_DISPLAY1, if (n > 0) Tuiles.JAUNE else Tuiles.BLANC))
            .setSecondaryLabelTextContent(Tuiles.texte(this,
                if (n > 0) "Poké Ball${if (n > 1) "s" else ""} à ouvrir" else "encore ${Jeu.nombre(pas)} pas · $zone min",
                Typography.TYPOGRAPHY_CAPTION2, Tuiles.GRIS, 2))
            .build()
        val clic = if (n > 0) Tuiles.ouvrir(this, OuvrirActivity::class.java, "ouvrir") else Tuiles.ouvrir(this, PokemonActivity::class.java, "pokemon")
        return Tuiles.tuile(Tuiles.cliquable(contenu, clic))
    }

    override fun onTileResourcesRequest(requestParams: RequestBuilders.ResourcesRequest) = Tuiles.ressources()
}

/** Santé du jour : pas et distance en direct, minutes en zone, FC au repos, nuit. */
class TuileSante : TileService() {
    override fun onTileRequest(requestParams: RequestBuilders.TileRequest): ListenableFuture<TileBuilders.Tile> {
        val dp = requestParams.deviceConfiguration
        val e = Donnees.lire(this)
        val d = Direct.lire(this)
        val s = e?.sante
        val pas = maxOf(d?.pas?.toInt() ?: 0, s?.pas ?: 0)
        val km = d?.metres?.takeIf { it > 0 }?.div(1000) ?: s?.km
        val nuit = e?.nuit?.let { Jeu.duree(it.duree) } ?: "—"
        val contenu = PrimaryLayout.Builder(dp)
            .setPrimaryLabelTextContent(Tuiles.texte(this, "Aujourd'hui", Typography.TYPOGRAPHY_CAPTION1, Tuiles.GRIS))
            .setContent(Tuiles.colonne(
                Tuiles.texte(this, "${Jeu.nombre(pas)} pas", Typography.TYPOGRAPHY_TITLE2, 0xFF7FD4FF.toInt()),
                Tuiles.texte(this, (km?.let { "%.1f km".format(it).replace('.', ',') + " · " } ?: "") + "${s?.zone ?: 0} min en zone",
                    Typography.TYPOGRAPHY_BODY2, Tuiles.BLANC),
                Tuiles.texte(this, "♥ repos ${s?.fcRepos ?: "—"} · ☾ $nuit", Typography.TYPOGRAPHY_BODY2, 0xFFFF8A8F.toInt()),
            ))
            .build()
        return Tuiles.tuile(Tuiles.cliquable(contenu, Tuiles.ouvrir(this, SanteActivity::class.java, "sante")))
    }

    override fun onTileResourcesRequest(requestParams: RequestBuilders.ResourcesRequest) = Tuiles.ressources()
}

/** Claude : un bouton pour poser une question (le micro écoute tout de suite), et la dernière réponse. */
class TuileClaude : TileService() {
    override fun onTileRequest(requestParams: RequestBuilders.TileRequest): ListenableFuture<TileBuilders.Tile> {
        val dp = requestParams.deviceConfiguration
        val derniere = Claude.historique(this).firstOrNull()
        val clic = Tuiles.ouvrir(this, ClaudeActivity::class.java, "claude")
        val contenu = PrimaryLayout.Builder(dp)
            .setPrimaryLabelTextContent(Tuiles.texte(this, "✳ Claude", Typography.TYPOGRAPHY_CAPTION1, Tuiles.ORANGE))
            .setContent(Tuiles.texte(this, derniere?.optString("court") ?: "Pose une question, je réponds en 30 s.",
                Typography.TYPOGRAPHY_BODY2, if (derniere != null) Tuiles.GRIS else Tuiles.BLANC, 3))
            .setPrimaryChipContent(Chip.Builder(this, clic, dp).setPrimaryLabelContent("🎤  Demander")
                .setChipColors(ChipColors(Tuiles.ORANGE, Tuiles.BLANC)).build())
            .build()
        return Tuiles.tuile(contenu)
    }

    override fun onTileResourcesRequest(requestParams: RequestBuilders.ResourcesRequest) = Tuiles.ressources()
}
