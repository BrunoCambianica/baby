package fr.superbebe.widget

import android.appwidget.AppWidgetManager
import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider

/** Widget d'écran d'accueil : trois lignes calculées par SbWorker sur un ciel assorti à la météo ; le toucher ouvre l'app. */
class SbWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val render = SbStore.render(context)
        provideContent { Content(render) }
    }

    @Composable
    private fun Content(render: SbStore.Render) {
        val white = ColorProvider(Color.White)
        val soft = ColorProvider(Color(0xD1FFFFFF))
        Column(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(ImageProvider(background(render.theme)))
                .cornerRadius(22.dp)
                .padding(horizontal = 16.dp, vertical = 14.dp)
                .clickable(actionStartActivity<MainActivity>()),
        ) {
            Text(
                text = "SUPERBÉBÉ · ${render.place.uppercase()}",
                style = TextStyle(color = soft, fontSize = 10.sp, fontWeight = FontWeight.Bold),
                maxLines = 1,
            )
            Spacer(GlanceModifier.height(8.dp))
            render.lines.forEachIndexed { index, line ->
                if (line.drawings.isNotEmpty()) {
                    Drawings(line, white)
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

    // Tenue en dessins : jusqu'à huit vêtements, puis « +n » et le texte éventuel (TOG de la gigoteuse).
    @Composable
    private fun Drawings(line: SbStore.Line, color: ColorProvider) {
        val shown = line.drawings.mapNotNull { SbDrawings.resource(it) }
        Row(verticalAlignment = Alignment.CenterVertically) {
            shown.take(MAX_DRAWINGS).forEachIndexed { k, resource ->
                if (k > 0) Spacer(GlanceModifier.width(6.dp))
                Image(
                    provider = ImageProvider(resource),
                    contentDescription = if (k == 0) line.label else null,
                    modifier = GlanceModifier.size(24.dp),
                )
            }
            val rest = shown.size - MAX_DRAWINGS
            val text = listOfNotNull(if (rest > 0) "+$rest" else null, line.text.ifEmpty { null }).joinToString("  ")
            if (text.isNotEmpty()) {
                Spacer(GlanceModifier.width(8.dp))
                Text(text = text, style = TextStyle(color = color, fontSize = 15.sp, fontWeight = FontWeight.Bold), maxLines = 1)
            }
        }
    }

    private fun background(theme: String): Int = when (theme) {
        "clair" -> R.drawable.widget_bg_clair
        "pluie" -> R.drawable.widget_bg_pluie
        "chaleur" -> R.drawable.widget_bg_chaleur
        "froid" -> R.drawable.widget_bg_froid
        "nuit" -> R.drawable.widget_bg_nuit
        else -> R.drawable.widget_bg_nuageux
    }
}

private const val MAX_DRAWINGS = 8

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
}
