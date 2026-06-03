package com.rooh.almuslim.widget

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * Recomputes widget output after any system event that can invalidate prayer
 * times or remove Android's scheduled alarm chain.
 */
class SystemEventsReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    val action = intent?.action ?: return
    Log.i(TAG, "system broadcast received: $action")
    val appContext = context.applicationContext
    try {
      PrayerWidgetRefreshReceiver.restoreCachedPrayerWidgets(appContext)
      PrayerWidgetRefreshReceiver.updatePrayerWidgets(appContext, includeNativeOverlay = false)
      PrayerWidgetRefreshReceiver.updateContentWidgets(appContext)
      PrayerWidgetRefreshReceiver.scheduleMinuteFallback(appContext)
      PrayerWidgetRefreshReceiver.scheduleContentFallback(appContext)
    } catch (e: Exception) {
      Log.e(TAG, "failed to refresh widgets after $action", e)
    }
  }

  companion object {
    private const val TAG = "RoohSystemEvents"
  }
}
