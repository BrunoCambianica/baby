package fr.superbebe.widget

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.ImageProvider
import androidx.glance.LocalSize
import androidx.glance.LocalState
import androidx.glance.action.ActionParameters
import androidx.glance.action.actionParametersOf
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import java.time.ZoneId
import java.time.ZonedDateTime
import java.util.Locale

/**
 * Widget Maison : le jour (de 6 h à 18 h), la température de la pièce où vit l'enfant ; la nuit, celle de sa chambre.
 * − et + la notent sans ouvrir l'app, d'un demi-degré ; toucher la température la note telle quelle.
 * La tenue vient de la table calculée par le moteur (SbWorker) : elle suit le relevé tout de suite, sans réseau.
 * Ailleurs, le toucher ouvre l'app sur l'onglet Maison.
 */
class SbHomeWidget : GlanceAppWidget() {

    // Taille réelle du widget : sur un widget bas, le geste de la nuque en pied laisse la place au reste.
    override val sizeMode = SizeMode.Exact

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val widgetId = GlanceAppWidgetManager(context).getAppWidgetId(id)
        provideContent {
            // Lu dans la composition, après l'état Glance : chaque mise à jour relit relevé et tenues (voir refreshWidgets).
            LocalState.current
            val home = SbStore.home(context, SbStore.widgetChild(context, widgetId))
            val kind = if (clock().hour in 6..17) "jour" else "nuit"
            val reading = home?.let { SbStore.reading(context, it.id, kind) }
            val open = Intent(context, MainActivity::class.java).setData(Uri.parse("superbebe://maison/${Uri.encode(home?.id ?: "")}"))
            Content(home, kind, reading, open)
        }
    }

    @Composable
    private fun Content(home: SbStore.Home?, kind: String, reading: SbStore.Reading?, open: Intent) {
        val white = ColorProvider(Color.White)
        val soft = ColorProvider(Color(0xD1FFFFFF))
        val night = kind == "nuit"
        Column(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(ImageProvider(if (night) R.drawable.widget_bg_nuit else R.drawable.widget_bg_maison))
                .cornerRadius(22.dp)
                .padding(horizontal = 16.dp, vertical = 10.dp)
                .clickable(actionStartActivity(open)),
        ) {
            if (home == null) {
                // Avant le premier calcul de la 0.13 : il arrive quelques secondes après la pose du widget.
                Text(text = "Ouvrez Superbébé pour préparer le widget Maison.", style = TextStyle(color = white, fontSize = 14.sp), maxLines = 3)
                return@Column
            }
            // Sans relevé de moins de 16 heures : la dernière valeur en grisé, la tenue du repère, et comment noter.
            val fresh = reading?.fresh() == true
            val value = reading?.value ?: if (night) 19.0 else 21.0
            val table = home.table.optJSONObject(kind)
            val entry = if (fresh) table?.optJSONObject("by")?.optJSONObject(key(value)) else table?.optJSONObject("unknown")
            Text(
                text = "${home.name.ifEmpty { "Superbébé" }} · ${if (night) "sa chambre" else "chez vous"}".uppercase(),
                style = TextStyle(color = soft, fontSize = 10.sp, fontWeight = FontWeight.Bold),
                maxLines = 1,
            )
            Spacer(GlanceModifier.height(4.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Step(home.id, kind, "-0.5", "−")
                Text(
                    text = String.format(Locale.FRANCE, "%.1f°", value),
                    style = TextStyle(color = if (fresh) white else ColorProvider(Color(0x8CFFFFFF)), fontSize = 28.sp, fontWeight = FontWeight.Bold),
                    modifier = GlanceModifier.padding(horizontal = 10.dp).clickable(step(home.id, kind, "0")),
                    maxLines = 1,
                )
                Step(home.id, kind, "0.5", "+")
            }
            Spacer(GlanceModifier.height(4.dp))
            val outfit = SbStore.line(entry?.opt("outfit"))
            if (outfit.drawings.isNotEmpty()) {
                DrawingsRow(outfit, white)
            } else {
                Text(text = outfit.text, style = TextStyle(color = white, fontSize = 13.sp, fontWeight = FontWeight.Bold), maxLines = 2)
            }
            Spacer(GlanceModifier.height(3.dp))
            Text(
                text = if (fresh) entry?.optString("status").orEmpty() else home.table.optString("confirm"),
                style = TextStyle(color = soft, fontSize = 12.sp),
                maxLines = 2,
            )
            if (home.check.isNotEmpty() && LocalSize.current.height >= 150.dp) {
                Spacer(GlanceModifier.defaultWeight())
                Text(text = home.check, style = TextStyle(color = soft, fontSize = 10.sp), maxLines = 1)
            }
        }
    }

    @Composable
    private fun Step(child: String, kind: String, delta: String, sign: String) {
        Box(
            modifier = GlanceModifier
                .size(34.dp)
                .background(ImageProvider(R.drawable.widget_step_bg))
                .cornerRadius(17.dp)
                .clickable(step(child, kind, delta)),
            contentAlignment = Alignment.Center,
        ) {
            Text(text = sign, style = TextStyle(color = ColorProvider(Color.White), fontSize = 20.sp, fontWeight = FontWeight.Bold))
        }
    }

    private fun step(child: String, kind: String, delta: String) =
        actionRunCallback<SbRoomStep>(actionParametersOf(SbRoomStep.CHILD to child, SbRoomStep.KIND to kind, SbRoomStep.DELTA to delta))

    // Clé de la table du moteur : le relevé au demi-degré, de 10 à 35 °C (« 19.5 »).
    private fun key(value: Double): String = String.format(Locale.ROOT, "%.1f", Math.round(value.coerceIn(10.0, 35.0) * 2) / 2.0)

    companion object {
        private val PARIS: ZoneId = ZoneId.of("Europe/Paris")

        // Heure de Paris (remplacée dans les tests).
        internal var clock: () -> ZonedDateTime = { ZonedDateTime.now(PARIS) }
    }
}

/** − et + du widget Maison, et la température touchée (écart nul) : un relevé noté maintenant, pour l'app et les autres widgets. */
class SbRoomStep : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        val child = parameters[CHILD] ?: return
        val kind = parameters[KIND] ?: return
        val delta = parameters[DELTA]?.toDoubleOrNull() ?: return
        // Comme dans l'app : on part de la valeur affichée (le dernier relevé, même ancien ; sinon 21 °C le jour, 19 °C la nuit).
        val base = SbStore.reading(context, child, kind)?.value ?: if (kind == "jour") 21.0 else 19.0
        SbStore.saveReading(context, child, kind, (Math.round((base + delta) * 2) / 2.0).coerceIn(10.0, 35.0))
        refreshWidgets(context, SbHomeWidget())
        // La ligne de la nuit du widget principal suit la chambre : un calcul quelques secondes après la dernière touche.
        if (kind == "nuit") SbWorker.refreshSoon(context)
    }

    companion object {
        val CHILD = ActionParameters.Key<String>("enfant")
        val KIND = ActionParameters.Key<String>("moment")
        val DELTA = ActionParameters.Key<String>("ecart")
    }
}

class SbHomeWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = SbHomeWidget()

    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        SbWorker.schedule(context)
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        super.onUpdate(context, appWidgetManager, appWidgetIds)
        SbWorker.refreshNow(context)
    }

    override fun onDeleted(context: Context, appWidgetIds: IntArray) {
        super.onDeleted(context, appWidgetIds)
        SbStore.forgetWidgets(context, appWidgetIds)
    }
}
