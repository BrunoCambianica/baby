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
import org.json.JSONObject
import java.time.Duration
import java.time.LocalDate
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
        val sent = notify(
            context, CHANNEL, "Rappel du soir", "La tenue et le sac de demain, et la nuit : une notification par jour au plus.",
            NOTIFICATION_ID, R.drawable.drawing_gigoteuse, title, lines,
        )
        if (sent) SbStore.markReminderSent(context, day)
    }

    /** Une notification qui ouvre l'app ; false sans lignes ou sans autorisation. */
    fun notify(
        context: Context,
        channel: String,
        name: String,
        about: String,
        id: Int,
        icon: Int,
        title: String,
        lines: List<String>,
    ): Boolean {
        if (lines.isEmpty() || !allowed(context)) return false
        val manager = context.getSystemService(NotificationManager::class.java)
        if (manager.getNotificationChannel(channel) == null) {
            manager.createNotificationChannel(
                NotificationChannel(channel, name, NotificationManager.IMPORTANCE_DEFAULT).apply { description = about },
            )
        }
        val open = PendingIntent.getActivity(
            context, 0, Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val notification = NotificationCompat.Builder(context, channel)
            .setSmallIcon(icon)
            .setContentTitle(title)
            .setContentText(lines.first())
            .setStyle(NotificationCompat.BigTextStyle().bigText(lines.joinToString("\n")))
            .setContentIntent(open)
            .setAutoCancel(true)
            .build()
        return runCatching { NotificationManagerCompat.from(context).notify(id, notification) }.isSuccess
    }
}

/**
 * Rappel avant une sortie choisie dans l'app (pas la sortie par défaut) : LEAD_MIN minutes avant son départ, sa tenue et
 * son sac pour chaque enfant. Seulement s'il a été activé dans l'app ; une fois par sortie ; calculé sur le téléphone.
 * Même règle que nextOutingReminder (engine/adapter.js), qui sert au widget iPhone.
 */
object SbOutingReminder {
    const val LEAD_MIN = 15L
    private const val CHANNEL = "sortie"
    private const val NOTIFICATION_ID = 21
    private const val WORK = "superbebe-sortie"
    private val PARIS: ZoneId = ZoneId.of("Europe/Paris")

    /** Une sortie à rappeler : son jour, son départ, sa durée (heures), l'heure du rappel. */
    data class Next(val date: String, val start: String, val hours: Double, val at: ZonedDateTime) {
        val key: String get() = "$date $start"
        val begin: ZonedDateTime get() = at.plusMinutes(LEAD_MIN)
    }

    /** « on » (activé et autorisé), « refuse » (activé, notifications refusées), « off ». */
    fun state(context: Context): String = when {
        !SbStore.outingRemind(context) -> "off"
        SbReminder.allowed(context) -> "on"
        else -> "refuse"
    }

    /** La prochaine sortie choisie dont le rappel n'est pas encore parti et qui n'a pas commencé. */
    fun next(context: Context, now: ZonedDateTime): Next? {
        if (!SbStore.outingRemind(context)) return null
        val all = runCatching { JSONObject(SbStore.outings(context)) }.getOrNull() ?: return null
        val sent = SbStore.outingSent(context)
        val found = mutableListOf<Next>()
        for (date in all.keys()) {
            val day = runCatching { LocalDate.parse(date) }.getOrNull() ?: continue
            val list = all.optJSONArray(date) ?: continue
            for (k in 0 until list.length()) {
                val o = list.optJSONObject(k) ?: continue
                if (o.optBoolean("auto")) continue
                val start = o.optString("s")
                val time = runCatching { LocalTime.parse(start) }.getOrNull() ?: continue
                val next = Next(date, start, o.optDouble("d", 1.0), ZonedDateTime.of(day, time, PARIS).minusMinutes(LEAD_MIN))
                if (next.begin.isAfter(now) && next.key != sent && next.at.toLocalDate() == day) found.add(next)
            }
        }
        return found.minByOrNull { it.at }
    }

    /** Le rappel est dû : son heure est passée, la sortie n'a pas commencé. */
    fun due(context: Context, now: ZonedDateTime): Next? = next(context, now)?.takeIf { !now.isBefore(it.at) }

    /** Calcul à l'heure du prochain rappel (en plus du passage toutes les 30 minutes) ; rien sans sortie à rappeler. */
    fun schedule(context: Context) {
        val work = WorkManager.getInstance(context)
        val now = ZonedDateTime.now(PARIS)
        val next = next(context, now)
        if (next == null || !SbReminder.allowed(context)) {
            work.cancelUniqueWork(WORK)
            return
        }
        work.enqueueUniqueWork(
            WORK,
            ExistingWorkPolicy.REPLACE,
            OneTimeWorkRequestBuilder<SbWorker>()
                .setInitialDelay(Duration.between(now, next.at).toMillis().coerceAtLeast(0), TimeUnit.MILLISECONDS).build(),
        )
    }

    fun post(context: Context, title: String, lines: List<String>, key: String) {
        val sent = SbReminder.notify(
            context, CHANNEL, "Avant de sortir", "La tenue et le sac d'une sortie choisie, ${LEAD_MIN} minutes avant son départ.",
            NOTIFICATION_ID, R.drawable.drawing_bonnet, title, lines,
        )
        if (sent) SbStore.markOutingSent(context, key)
    }
}
