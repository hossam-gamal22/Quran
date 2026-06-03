package com.rooh.almuslim.widget

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.WritableNativeMap

class PrayerWidgetRefreshModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "PrayerWidgetRefreshModule"

  @ReactMethod
  fun schedulePrayerWidgetUpdates(epochMsArray: ReadableArray, promise: Promise) {
    try {
      for (i in 0 until MAX_TRANSITIONS) {
        PrayerWidgetRefreshReceiver.cancelScheduled(reactContext, REQUEST_BASE + i)
      }

      val now = System.currentTimeMillis()
      var scheduled = 0
      for (i in 0 until epochMsArray.size()) {
        val triggerAt = epochMsArray.getDouble(i).toLong() + 5_000L
        if (triggerAt <= now + 30_000L) continue
        PrayerWidgetRefreshReceiver.scheduleTransition(reactContext, triggerAt, REQUEST_BASE + scheduled)
        scheduled += 1
        if (scheduled >= MAX_TRANSITIONS) break
      }

      PrayerWidgetRefreshReceiver.scheduleMinuteFallback(reactContext)
      PrayerWidgetRefreshReceiver.scheduleHourlyFallback(reactContext)

      val result = WritableNativeMap().apply {
        putInt("scheduledTransitions", scheduled)
        putBoolean("hourlyFallback", true)
      }
      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("prayer_widget_refresh_schedule_failed", e)
    }
  }

  @ReactMethod
  fun requestPrayerWidgetRefreshNow(promise: Promise) {
    try {
      PrayerWidgetRefreshReceiver.updatePrayerWidgets(reactContext)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("prayer_widget_refresh_now_failed", e)
    }
  }

  @ReactMethod
  fun scheduleContentWidgetRefresh(promise: Promise) {
    try {
      PrayerWidgetRefreshReceiver.scheduleContentFallback(reactContext)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("content_widget_refresh_schedule_failed", e)
    }
  }

  @ReactMethod
  fun requestContentWidgetRefreshNow(promise: Promise) {
    try {
      PrayerWidgetRefreshReceiver.updateContentWidgets(reactContext)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("content_widget_refresh_now_failed", e)
    }
  }

  companion object {
    private const val REQUEST_BASE = 9200
    private const val MAX_TRANSITIONS = 12
  }
}
