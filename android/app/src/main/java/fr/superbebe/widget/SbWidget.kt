package fr.superbebe.widget

import android.appwidget.AppWidgetManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.LocalState
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.appwidget.state.updateAppWidgetState
import androidx.glance.background
import androidx.glance.layout.Alignment
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

/**
 * Widget d'écran d'accueil : les lignes d'un enfant, calculées par SbWorker, sur un ciel assorti à la météo.
 * Chaque widget garde son enfant (choisi à la pose ou dans l'app) ; le toucher ouvre l'app sur cet enfant.
 */
class SbWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val widgetId = GlanceAppWidgetManager(context).getAppWidgetId(id)
        provideContent {
            // Lu dans la composition, après l'état Glance : chaque mise à jour relit le rendu (voir refreshWidgets).
            LocalState.current
            val render = SbStore.render(context, SbStore.widgetChild(context, widgetId))
            // Une adresse par enfant, pour que chaque widget ouvre l'app sur le sien.
            val open = Intent(context, MainActivity::class.java).setData(Uri.parse("superbebe://enfant/${Uri.encode(render.id)}"))
            Content(render, open)
        }
    }

    @Composable
    private fun Content(render: SbStore.Render, open: Intent) {
        val white = ColorProvider(Color.White)
        val soft = ColorProvider(Color(0xD1FFFFFF))
        Column(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(ImageProvider(background(render.theme)))
                .cornerRadius(22.dp)
                .padding(horizontal = 16.dp, vertical = 14.dp)
                .clickable(actionStartActivity(open)),
        ) {
            Text(
                text = "${render.name.ifEmpty { "Superbébé" }} · ${render.place}".uppercase(),
                style = TextStyle(color = soft, fontSize = 10.sp, fontWeight = FontWeight.Bold),
                maxLines = 1,
            )
            Spacer(GlanceModifier.height(8.dp))
            render.lines.forEachIndexed { index, line ->
                if (line.drawings.isNotEmpty()) {
                    DrawingsRow(line, white)
                } else {
                    Text(
                        text = line.text,
                        style = TextStyle(
                            color = if (index == 0) white else soft,
                            fontSize = if (index == 0) 17.sp else 13.sp,
                            fontWeight = if (index == 0) FontWeight.Bold else FontWeight.Normal,
                        ),
                        maxLines = 2,
                    )
                }
                Spacer(GlanceModifier.height(5.dp))
            }
            Spacer(GlanceModifier.defaultWeight())
            if (render.footer.isNotEmpty()) {
                Text(text = render.footer, style = TextStyle(color = soft, fontSize = 10.sp), maxLines = 1)
            }
        }
    }

    private fun background(theme: String): Int = when (theme) {
        "clair" -> R.drawable.widget_bg_clair
        "pluie" -> R.drawable.widget_bg_pluie
        "chaleur" -> R.drawable.widget_bg_chaleur
        "froid" -> R.drawable.widget_bg_froid
        "nuit" -> R.drawable.widget_bg_nuit
        "maison" -> R.drawable.widget_bg_maison
        else -> R.drawable.widget_bg_nuageux
    }
}

private const val MAX_DRAWINGS = 8

/**
 * Tenue en dessins (widgets principal et Maison) : jusqu'à huit vêtements, puis « +n » et le texte éventuel (TOG de la gigoteuse).
 * Les écarts sont des marges, pas des Spacer : Glance tronque une rangée au-delà de dix éléments.
 */
@Composable
internal fun DrawingsRow(line: SbStore.Line, color: ColorProvider) {
    val shown = line.drawings.mapNotNull { SbDrawings.resource(it) }
    Row(verticalAlignment = Alignment.CenterVertically) {
        shown.take(MAX_DRAWINGS).forEachIndexed { k, resource ->
            Image(
                provider = ImageProvider(resource),
                contentDescription = if (k == 0) line.label else null,
                modifier = if (k == 0) GlanceModifier.size(24.dp) else GlanceModifier.size(30.dp, 24.dp).padding(start = 6.dp),
            )
        }
        val rest = shown.size - MAX_DRAWINGS
        val text = listOfNotNull(if (rest > 0) "+$rest" else null, line.text.ifEmpty { null }).joinToString("  ")
        if (text.isNotEmpty()) {
            Text(
                text = text,
                style = TextStyle(color = color, fontSize = 15.sp, fontWeight = FontWeight.Bold),
                maxLines = 1,
                modifier = GlanceModifier.padding(start = 8.dp),
            )
        }
    }
}

/**
 * Glance ne relance provideGlance qu'à l'ouverture d'une session, qui dure au moins 45 secondes : pendant ce temps,
 * une mise à jour ne recompose que si l'état Glance du widget change. Chaque mise à jour change donc ce compteur,
 * et les widgets lisent leurs données dans la composition, après l'état (LocalState).
 */
private val SB_STAMP = longPreferencesKey("sb_maj")

internal suspend fun refreshWidgets(context: Context, widget: GlanceAppWidget) {
    for (id in GlanceAppWidgetManager(context).getGlanceIds(widget.javaClass)) {
        updateAppWidgetState(context, id) { it[SB_STAMP] = (it[SB_STAMP] ?: 0L) + 1 }
        widget.update(context, id)
    }
}

class SbWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = SbWidget()

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

/** Widget posé depuis l'app (« Ajouter le widget de Léo ») : Android renvoie son numéro, on y attache l'enfant. */
class SbPinReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val widgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
        val child = intent.getStringExtra(EXTRA_CHILD) ?: return
        if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) return
        SbStore.setWidgetChild(context, widgetId, child)
        SbWorker.refreshNow(context, replace = true)
    }

    companion object {
        const val EXTRA_CHILD = "enfant"
    }
}
