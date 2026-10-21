package fr.superbebe.widget

import android.appwidget.AppWidgetManager
import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.color.ColorProvider
import androidx.glance.layout.Column
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle

/** Widget d'écran d'accueil : trois lignes calculées par SbWorker, toucher pour ouvrir l'app. */
class SbWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val render = SbStore.render(context)
        provideContent { Content(render) }
    }

    @Composable
    private fun Content(render: SbStore.Render) {
        val ink = ColorProvider(day = Color(0xFF16212B), night = Color(0xFFEEF3F6))
        val muted = ColorProvider(day = Color(0xFF556472), night = Color(0xFF9AA8B4))
        val background = ColorProvider(day = Color(0xFFE8F1F5), night = Color(0xFF16222C))
        Column(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(background)
                .cornerRadius(20.dp)
                .padding(horizontal = 14.dp, vertical = 12.dp)
                .clickable(actionStartActivity<MainActivity>()),
        ) {
            Text(
                text = "SUPERBÉBÉ · ${render.place.uppercase()}",
                style = TextStyle(color = muted, fontSize = 10.sp, fontWeight = FontWeight.Bold),
                maxLines = 1,
            )
            Spacer(GlanceModifier.height(6.dp))
            render.lines.forEachIndexed { index, line ->
                Text(
                    text = line,
                    style = TextStyle(
                        color = ink,
                        fontSize = if (index == 0) 15.sp else 13.sp,
                        fontWeight = if (index == 0) FontWeight.Bold else FontWeight.Normal,
                    ),
                    maxLines = 2,
                )
                Spacer(GlanceModifier.height(4.dp))
            }
            if (render.footer.isNotEmpty()) {
                Text(text = render.footer, style = TextStyle(color = muted, fontSize = 10.sp), maxLines = 1)
            }
        }
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
