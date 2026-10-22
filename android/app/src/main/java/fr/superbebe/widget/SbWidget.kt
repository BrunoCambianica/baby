package fr.superbebe.widget

import android.appwidget.AppWidgetManager
import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.ImageProvider
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Column
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.height
import androidx.glance.layout.padding
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
                Text(
                    text = line,
                    style = TextStyle(
                        color = if (index == 0) white else soft,
                        fontSize = if (index == 0) 17.sp else 13.sp,
                        fontWeight = if (index == 0) FontWeight.Bold else FontWeight.Normal,
                    ),
                    maxLines = 2,
                )
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
        else -> R.drawable.widget_bg_nuageux
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
}
