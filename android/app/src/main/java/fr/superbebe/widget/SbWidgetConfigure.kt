package fr.superbebe.widget

import android.app.Activity
import android.app.AlertDialog
import android.appwidget.AppWidgetManager
import android.content.Intent
import android.content.res.Configuration
import android.os.Bundle

/**
 * Choix de l'enfant d'un widget : à la pose (avant Android 12) ou par appui long, « Modifier le widget ».
 * Avec un seul enfant, rien à demander. Annuler garde l'enfant affiché jusque-là : le widget est posé quand même.
 */
class SbWidgetConfigure : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val widgetId = intent?.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
            ?: AppWidgetManager.INVALID_APPWIDGET_ID
        if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            setResult(RESULT_CANCELED)
            finish()
            return
        }
        val children = SbConfig.decode(SbStore.config(this))?.children.orEmpty()
        if (children.size <= 1) {
            done(widgetId, null)
            return
        }
        val names = children.mapIndexed { i, child -> child.name.ifEmpty { "Enfant ${i + 1}" } }.toTypedArray()
        val night = (resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
        val theme = if (night) android.R.style.Theme_DeviceDefault_Dialog_Alert else android.R.style.Theme_DeviceDefault_Light_Dialog_Alert
        AlertDialog.Builder(this, theme)
            .setTitle("Le widget de quel enfant ?")
            .setItems(names) { _, which -> done(widgetId, children[which].id) }
            .setOnCancelListener { done(widgetId, null) }
            .show()
    }

    private fun done(widgetId: Int, childId: String?) {
        if (childId != null) SbStore.setWidgetChild(this, widgetId, childId)
        SbWorker.refreshNow(this, replace = true)
        setResult(RESULT_OK, Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId))
        finish()
    }
}
