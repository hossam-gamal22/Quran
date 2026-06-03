package com.rooh.almuslim.widget

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import java.util.Calendar
import java.util.concurrent.Executors

class PrayerWidgetRefreshReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    val source = intent?.getStringExtra(EXTRA_SOURCE) ?: SOURCE_PRAYER
    val pendingResult = goAsync()
    val appContext = context.applicationContext
    Log.i(
      TAG,
      "refresh alarm fired source=$source action=${intent?.action} trigger=${intent?.getLongExtra(EXTRA_TRIGGER_AT, 0L)}",
    )
    executor.execute {
      try {
        if (source == SOURCE_CONTENT) {
          updateContentWidgets(appContext)
          scheduleContentFallback(appContext)
        } else {
          updatePrayerWidgets(appContext)
          scheduleMinuteFallback(appContext)
        }
      } catch (e: Exception) {
        Log.e(TAG, "refresh handling failed source=$source", e)
      } finally {
        pendingResult.finish()
      }
    }
  }

  companion object {
    const val ACTION_REFRESH = "com.rooh.almuslim.widget.PRAYER_WIDGET_REFRESH"
    const val EXTRA_TRIGGER_AT = "triggerAt"
    const val EXTRA_SOURCE = "source"
    const val SOURCE_PRAYER = "prayer"
    const val SOURCE_CONTENT = "content"
    private const val TAG = "PrayerWidgetRefresh"
    private const val REQUEST_HOURLY = 9100
    private const val REQUEST_MINUTE = 9102
    private const val REQUEST_CONTENT = 9103
    private val executor = Executors.newSingleThreadExecutor()

    private const val CONTENT_REFRESH_INTERVAL_MS = 15 * 60 * 1000L

    private val PRAYER_PROVIDERS = listOf(
      RoohPrayerSingleSmall::class.java,
      RoohPrayerTableSmall::class.java,
      RoohPrayerTableMedium::class.java,
      RoohPrayerTableLarge::class.java,
      RoohPrayerNextPreviousMedium::class.java,
      RoohLockNextPrayer::class.java,
      RoohLockAllPrayers::class.java,
      RoohLockNextPrayerCountdown::class.java,
    )

    private val CONTENT_PROVIDERS = listOf(
      RoohAzkarMorningMedium::class.java,
      RoohAzkarEveningMedium::class.java,
      RoohDailyDhikrMedium::class.java,
      RoohVerseOfDayMedium::class.java,
    )

    fun updatePrayerWidgets(context: Context, includeNativeOverlay: Boolean = true) {
      broadcastUpdates(
        context,
        PRAYER_PROVIDERS,
        label = "prayer",
        includeNativeOverlay = includeNativeOverlay,
      )
    }

    fun restoreCachedPrayerWidgets(context: Context) {
      val appContext = context.applicationContext
      val manager = AppWidgetManager.getInstance(appContext)
      for (provider in PRAYER_PROVIDERS) {
        try {
          val ids = manager.getAppWidgetIds(ComponentName(appContext, provider))
          if (ids.isEmpty()) continue
          NativeWidgetTextOverlay.restoreCachedSnapshots(appContext, manager, ids)
        } catch (e: Exception) {
          Log.e(TAG, "Failed cached prayer snapshot restore provider=${provider.simpleName}", e)
        }
      }
    }

    fun updateContentWidgets(context: Context) {
      broadcastUpdates(context, CONTENT_PROVIDERS, label = "content")
    }

    private fun broadcastUpdates(
      context: Context,
      providers: List<Class<*>>,
      label: String,
      includeNativeOverlay: Boolean = true,
    ) {
      val appContext = context.applicationContext
      val manager = AppWidgetManager.getInstance(appContext)
      for (provider in providers) {
        try {
          val component = ComponentName(appContext, provider)
          val ids = manager.getAppWidgetIds(component)
          if (ids.isEmpty()) continue
          if (label == "prayer" && includeNativeOverlay) {
            NativeWidgetTextOverlay.refresh(appContext, manager, ids)
          }
          val updateIntent = Intent(appContext, provider).apply {
            action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
          }
          appContext.sendBroadcast(updateIntent)
          Log.i(TAG, "Requested $label update provider=${provider.simpleName} ids=${ids.joinToString(",")}")
        } catch (e: Exception) {
          Log.e(TAG, "Failed $label update provider=${provider.simpleName}", e)
        }
      }
    }

    fun scheduleTransition(context: Context, triggerAtMs: Long, requestCode: Int, source: String = SOURCE_PRAYER) {
      if (triggerAtMs <= System.currentTimeMillis() + 30_000L) return
      val appContext = context.applicationContext
      val alarmManager = appContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      val intent = Intent(appContext, PrayerWidgetRefreshReceiver::class.java).apply {
        action = ACTION_REFRESH
        putExtra(EXTRA_TRIGGER_AT, triggerAtMs)
        putExtra(EXTRA_SOURCE, source)
      }
      val pendingIntent = PendingIntent.getBroadcast(
        appContext,
        requestCode,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
      try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
          alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, pendingIntent)
        } else {
          alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, pendingIntent)
        }
        Log.i(TAG, "Scheduled $source refresh at=$triggerAtMs requestCode=$requestCode")
      } catch (e: Exception) {
        Log.e(TAG, "Failed to schedule $source refresh at=$triggerAtMs", e)
      }
    }

    fun scheduleMinuteFallback(context: Context) {
      scheduleTransition(context, System.currentTimeMillis() + 60_000L, REQUEST_MINUTE, SOURCE_PRAYER)
    }

    fun scheduleHourlyFallback(context: Context) {
      val calendar = Calendar.getInstance().apply {
        add(Calendar.HOUR_OF_DAY, 1)
        set(Calendar.MINUTE, 0)
        set(Calendar.SECOND, 5)
        set(Calendar.MILLISECOND, 0)
      }
      scheduleTransition(context, calendar.timeInMillis, REQUEST_HOURLY, SOURCE_PRAYER)
    }

    fun scheduleContentFallback(context: Context) {
      if (!anyContentWidgetPlaced(context)) {
        Log.i(TAG, "No content widget on home screen — skipping content alarm")
        return
      }
      scheduleTransition(
        context,
        System.currentTimeMillis() + CONTENT_REFRESH_INTERVAL_MS,
        REQUEST_CONTENT,
        SOURCE_CONTENT,
      )
    }

    private fun anyContentWidgetPlaced(context: Context): Boolean {
      val appContext = context.applicationContext
      val manager = AppWidgetManager.getInstance(appContext)
      for (provider in CONTENT_PROVIDERS) {
        try {
          val ids = manager.getAppWidgetIds(ComponentName(appContext, provider))
          if (ids.isNotEmpty()) return true
        } catch (_: Exception) { }
      }
      return false
    }

    fun cancelScheduled(context: Context, requestCode: Int) {
      val appContext = context.applicationContext
      val alarmManager = appContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      val intent = Intent(appContext, PrayerWidgetRefreshReceiver::class.java).apply {
        action = ACTION_REFRESH
      }
      val pendingIntent = PendingIntent.getBroadcast(
        appContext,
        requestCode,
        intent,
        PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
      )
      if (pendingIntent != null) {
        alarmManager.cancel(pendingIntent)
        pendingIntent.cancel()
      }
    }
  }
}
