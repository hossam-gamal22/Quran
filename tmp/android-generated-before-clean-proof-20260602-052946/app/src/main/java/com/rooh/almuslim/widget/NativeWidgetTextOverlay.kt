package com.rooh.almuslim.widget

import android.appwidget.AppWidgetManager
import android.content.Context
import android.graphics.Color
import android.util.Log
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.widget.RemoteViews
import com.reactnativeandroidwidget.R
import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.roundToInt

/**
 * Updates compact prayer timers without starting React Native. The full widget
 * is still rendered from the gallery snapshot; only the transparent timer
 * hot-zones are painted here so a reclaimed app process cannot freeze them.
 */
object NativeWidgetTextOverlay {
  private const val TAG = "NativeWidgetOverlay"
  private const val PREFS_SUFFIX = ".WIDGET_NATIVE_TEXT"
  private val CONTAINER_IDS = intArrayOf(
    R.id.rn_widget_live_text_0_container,
    R.id.rn_widget_live_text_1_container,
  )
  private val TEXT_IDS = intArrayOf(
    R.id.rn_widget_live_text_0,
    R.id.rn_widget_live_text_1,
  )

  fun refresh(context: Context, manager: AppWidgetManager, widgetIds: IntArray) {
    for (widgetId in widgetIds) {
      try {
        val raw = context
          .getSharedPreferences(context.packageName + PREFS_SUFFIX, Context.MODE_PRIVATE)
          .getString(widgetId.toString(), null)
          ?: continue
        val overlays = JSONArray(raw)
        val views = RemoteViews(context.packageName, R.layout.rn_widget)
        hideAll(views)
        for (index in 0 until minOf(overlays.length(), TEXT_IDS.size)) {
          configure(context, views, index, overlays.getJSONObject(index))
        }
        manager.partiallyUpdateAppWidget(widgetId, views)
        Log.i(TAG, "Updated native timer overlays widgetId=$widgetId count=${overlays.length()}")
      } catch (error: Exception) {
        Log.e(TAG, "Failed native timer overlay widgetId=$widgetId", error)
      }
    }
  }

  private fun hideAll(views: RemoteViews) {
    for (containerId in CONTAINER_IDS) {
      views.setViewVisibility(containerId, View.GONE)
    }
  }

  private fun configure(context: Context, views: RemoteViews, index: Int, config: JSONObject) {
    val containerId = CONTAINER_IDS[index]
    val textId = TEXT_IDS[index]
    val width = widgetWidth(context, config)
    val height = widgetHeight(context, config)
    val targetEpochMs = resolveTargetEpoch(config, System.currentTimeMillis())
    val text = formatText(config, targetEpochMs, System.currentTimeMillis())

    views.setViewVisibility(containerId, View.VISIBLE)
    views.setViewPadding(
      containerId,
      (width * config.optDouble("leftFraction", 0.0)).roundToInt(),
      (height * config.optDouble("topFraction", 0.0)).roundToInt(),
      (width * config.optDouble("rightFraction", 0.0)).roundToInt(),
      (height * config.optDouble("bottomFraction", 0.0)).roundToInt(),
    )
    views.setTextViewText(textId, text)
    views.setTextViewTextSize(textId, TypedValue.COMPLEX_UNIT_DIP, config.optDouble("fontSize", 9.0).toFloat())
    views.setTextColor(textId, Color.parseColor(config.optString("color", "#5E5E5C")))
    views.setInt(textId, "setGravity", textGravity(config.optString("textAlign", "center")))
  }

  private fun widgetWidth(context: Context, config: JSONObject): Int {
    return dpToPx(context, config.optDouble("widgetWidth", 0.0))
  }

  private fun widgetHeight(context: Context, config: JSONObject): Int {
    return dpToPx(context, config.optDouble("widgetHeight", 0.0))
  }

  private fun dpToPx(context: Context, value: Double): Int {
    return TypedValue.applyDimension(
      TypedValue.COMPLEX_UNIT_DIP,
      value.toFloat(),
      context.resources.displayMetrics,
    ).roundToInt()
  }

  private fun textGravity(align: String): Int {
    val horizontal = when (align) {
      "left" -> Gravity.START
      "right" -> Gravity.END
      else -> Gravity.CENTER_HORIZONTAL
    }
    return horizontal or Gravity.CENTER_VERTICAL
  }

  private fun resolveTargetEpoch(config: JSONObject, nowMs: Long): Long {
    val candidates = config.optJSONArray("epochCandidates") ?: JSONArray()
    val direction = config.optString("direction", "until")
    var resolved = config.optLong("targetEpochMs", 0L)
    if (direction == "since" && resolved > nowMs) {
      resolved = 0L
    } else if (direction != "since" && resolved <= nowMs) {
      resolved = 0L
    }
    for (index in 0 until candidates.length()) {
      val epoch = candidates.optLong(index, 0L)
      if (epoch <= 0L) continue
      if (direction == "since") {
        if (epoch <= nowMs && epoch > resolved.coerceAtMost(nowMs)) resolved = epoch
      } else if (epoch > nowMs && (resolved <= nowMs || epoch < resolved)) {
        resolved = epoch
      }
    }
    return resolved
  }

  private fun formatText(config: JSONObject, targetEpochMs: Long, nowMs: Long): String {
    val direction = config.optString("direction", "until")
    val deltaMs = if (direction == "since") nowMs - targetEpochMs else targetEpochMs - nowMs
    val body = compactDuration(max(0L, floor(deltaMs / 1000.0).toLong()), config.optString("language", "en"))
    val language = config.optString("language", "en")
    val duration = when {
      direction == "since" && language == "ar" -> "منذ $body"
      direction == "since" -> "$body ago"
      language == "ar" -> "بعد $body"
      else -> "in $body"
    }
    val labeled = if (config.optString("labelKind") == "nextPrayer") {
      if (language == "ar") "الصلاة القادمة $duration" else "Next prayer $duration"
    } else {
      duration
    }
    val localized = if (config.optBoolean("arabicNumerals", false)) toArabicIndic(labeled) else labeled
    return if (config.optBoolean("compact", false)) localized.replace("\\s".toRegex(), "") else localized
  }

  private fun compactDuration(totalSeconds: Long, language: String): String {
    if (totalSeconds < 60L) return if (language == "ar") "$totalSeconds ث" else "${totalSeconds}S"
    val minutes = totalSeconds / 60L
    if (minutes < 60L) return if (language == "ar") "$minutes د" else "${minutes}M"
    val hours = minutes / 60L
    val restMinutes = minutes % 60L
    return if (language == "ar") "$hours س $restMinutes د" else "${hours}H ${restMinutes}M"
  }

  private fun toArabicIndic(value: String): String {
    val digits = charArrayOf('٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩')
    return value.map { char -> if (char in '0'..'9') digits[char - '0'] else char }.joinToString("")
  }
}
