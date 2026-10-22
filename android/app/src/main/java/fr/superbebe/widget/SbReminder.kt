package fr.superbebe.widget

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import java.time.Duration
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZonedDateTime
import java.util.concurrent.TimeUnit

/**
 * Rappel du soir : la tenue et le sac de demain de chaque enfant, et la nuit. Seulement s'il a été activé dans l'app,
 * au plus une notification par jour, calculée sur le téléphone par le même moteur que les widgets.
 */
object SbReminder {
    private const val CHANNEL = "rappel"
    private const val NOTIFICATION_ID = 20
    private const val WORK = "superbebe-rappel"
    private val PARIS: ZoneId = ZoneId.of("Europe/Paris")

    fun allowed(context: Context): Boolean =
        Build.VERSION.SDK_INT < 33 || context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED

    /** « on » (activé et autorisé), « refuse » (activé, notifications refusées), « off ». */
    fun state(context: Context): String {
        val reminder = SbStore.reminder(context)
        return when {
            !reminder.on -> "off"
            allowed(context) -> "on"
            else -> "refuse"
        }
    }

    /** Le rappel est dû : activé, autorisé, l'heure est passée et rien n'a encore été envoyé aujourd'hui. */
    fun due(context: Context, now: ZonedDateTime): Boolean {
        val reminder = SbStore.reminder(context)
        val at = runCatching { LocalTime.parse(reminder.at) }.getOrNull() ?: return false
        return reminder.on && allowed(context) && !now.toLocalTime().isBefore(at) && reminder.sentFor != now.toLocalDate().toString()
    }

    /** Calcul à l'heure du rappel (en plus du passage toutes les 30 minutes) ; rien si le rappel est coupé. */
    fun schedule(context: Context) {
        val work = WorkManager.getInstance(context)
        val reminder = SbStore.reminder(context)
        val at = runCatching { LocalTime.parse(reminder.at) }.getOrNull()
        if (!reminder.on || at == null) {
            work.cancelUniqueWork(WORK)
            return
        }
        val now = ZonedDateTime.now(PARIS)
        var next = now.with(at).withSecond(0)
        if (!next.isAfter(now)) next = next.plusDays(1)
        work.enqueueUniqueWork(
            WORK,
            ExistingWorkPolicy.REPLACE,
            OneTimeWorkRequestBuilder<SbWorker>().setInitialDelay(Duration.between(now, next).toMillis(), TimeUnit.MILLISECONDS).build(),
        )
    }

    fun post(context: Context, title: String, lines: List<String>, day: String) {
        if (lines.isEmpty()) return
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            return
        }
        val manager = context.getSystemService(NotificationManager::class.java)
        if (manager.getNotificationChannel(CHANNEL) == null) {
            manager.createNotificationChannel(
                NotificationChannel(CHANNEL, "Rappel du soir", NotificationManager.IMPORTANCE_DEFAULT).apply {
                    description = "La tenue et le sac de demain, et la nuit : une notification par jour au plus."
                },
            )
        }
        val open = PendingIntent.getActivity(
            context, 0, Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val notification = NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.drawing_gigoteuse)
            .setContentTitle(title)
            .setContentText(lines.first())
            .setStyle(NotificationCompat.BigTextStyle().bigText(lines.joinToString("\n")))
            .setContentIntent(open)
            .setAutoCancel(true)
            .build()
        runCatching { NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, notification) }
            .onSuccess { SbStore.markReminderSent(context, day) }
    }
}
