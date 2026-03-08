// widgets/android/NextPrayerWidget.kt
// ويدجت مواقيت الصلاة - روح المسلم
// Android App Widget

package com.roohmuslim.app.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.graphics.Color
import android.os.Build
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject
import org.json.JSONArray
import java.text.SimpleDateFormat
import java.util.*

/**
 * ويدجت مواقيت الصلاة للأندرويد
 */
class NextPrayerWidget : AppWidgetProvider() {

    companion object {
        const val PREFS_NAME = "RoohMuslimWidgetPrefs"
        const val WIDGET_DATA_KEY = "widget_shared_data"
        const val ACTION_REFRESH = "com.roohmuslim.app.ACTION_REFRESH_PRAYER_WIDGET"
        const val ACTION_OPEN_APP = "com.roohmuslim.app.ACTION_OPEN_APP"
        const val ACTION_TOGGLE_PRAYER = "com.roohmuslim.app.ACTION_TOGGLE_PRAYER"
        const val EXTRA_PRAYER_NAME = "prayer_name"
        const val PRAYER_COMPLETION_KEY = "widget_prayer_completion"
        
        // ألوان الصلوات
        val PRAYER_COLORS = mapOf(
            "fajr" to "#1a237e",
            "sunrise" to "#ff6f00",
            "dhuhr" to "#2f7659",
            "asr" to "#f57c00",
            "maghrib" to "#d84315",
            "isha" to "#1a1a2e"
        )
        
        // أسماء الصلوات بالعربية
        val PRAYER_NAMES_AR = mapOf(
            "fajr" to "الفجر",
            "sunrise" to "الشروق",
            "dhuhr" to "الظهر",
            "asr" to "العصر",
            "maghrib" to "المغرب",
            "isha" to "العشاء"
        )
        
        /**
         * تحديث الويدجت من خارج الكلاس
         */
        fun updateWidget(context: Context) {
            val intent = Intent(context, NextPrayerWidget::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            }
            val ids = AppWidgetManager.getInstance(context)
                .getAppWidgetIds(ComponentName(context, NextPrayerWidget::class.java))
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
            context.sendBroadcast(intent)
        }
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        
        when (intent.action) {
            ACTION_REFRESH -> {
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val ids = appWidgetManager.getAppWidgetIds(
                    ComponentName(context, NextPrayerWidget::class.java)
                )
                onUpdate(context, appWidgetManager, ids)
            }
            ACTION_OPEN_APP -> {
                val launchIntent = context.packageManager
                    .getLaunchIntentForPackage(context.packageName)
                launchIntent?.let {
                    it.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    context.startActivity(it)
                }
            }
            ACTION_TOGGLE_PRAYER -> {
                val prayerName = intent.getStringExtra(EXTRA_PRAYER_NAME) ?: return
                togglePrayerCompletion(context, prayerName)
                // Refresh widget after toggling
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val ids = appWidgetManager.getAppWidgetIds(
                    ComponentName(context, NextPrayerWidget::class.java)
                )
                onUpdate(context, appWidgetManager, ids)
            }
        }
    }

    override fun onEnabled(context: Context) {
        // عند إضافة أول ويدجت
    }

    override fun onDisabled(context: Context) {
        // عند إزالة آخر ويدجت
    }

    private fun updateAppWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        val views = RemoteViews(context.packageName, R.layout.widget_next_prayer)
        
        // قراءة البيانات
        val data = loadWidgetData(context)
        val settings = loadWidgetSettings(context)
        
        if (data != null) {
            // الصلاة القادمة
            val nextPrayer = data.optString("nextPrayer", "dhuhr")
            val nextPrayerNameAr = data.optString("nextPrayerNameAr", "الظهر")
            val nextPrayerTime = data.optString("nextPrayerTime", "12:15 م")
            val timeRemaining = data.optString("timeRemaining", "2:30")
            val hijriDate = data.optString("hijriDate", "")
            val location = data.optString("location", "")
            
            // تحديث العناصر
            views.setTextViewText(R.id.tv_prayer_name, nextPrayerNameAr)
            views.setTextViewText(R.id.tv_prayer_time, nextPrayerTime)
            views.setTextViewText(R.id.tv_time_remaining, "متبقي $timeRemaining")
            
            // التاريخ الهجري
            if (settings?.optBoolean("showHijriDate", true) == true && hijriDate.isNotEmpty()) {
                views.setTextViewText(R.id.tv_hijri_date, hijriDate)
                views.setViewVisibility(R.id.tv_hijri_date, View.VISIBLE)
            } else {
                views.setViewVisibility(R.id.tv_hijri_date, View.GONE)
            }
            
            // الموقع
            if (settings?.optBoolean("showLocation", true) == true && location.isNotEmpty()) {
                views.setTextViewText(R.id.tv_location, location)
                views.setViewVisibility(R.id.tv_location, View.VISIBLE)
            } else {
                views.setViewVisibility(R.id.tv_location, View.GONE)
            }
            
            // لون الخلفية
            val accentColor = settings?.optString("accentColor", "#2f7659") ?: "#2f7659"
            try {
                views.setInt(R.id.widget_container, "setBackgroundColor", Color.parseColor(accentColor))
            } catch (e: Exception) {
                views.setInt(R.id.widget_container, "setBackgroundColor", Color.parseColor("#2f7659"))
            }
            
            // قائمة الصلوات (للويدجت الكبير)
            if (settings?.optBoolean("showAllPrayers", true) == true) {
                updatePrayersList(views, data)
            }
        } else {
            // بيانات افتراضية
            views.setTextViewText(R.id.tv_prayer_name, "الظهر")
            views.setTextViewText(R.id.tv_prayer_time, "12:15 م")
            views.setTextViewText(R.id.tv_time_remaining, "متبقي 2:30")
        }
        
        // إعداد الضغطات
        setupClickListeners(context, views)
        
        // إعداد أزرار إكمال الصلاة
        if (settings?.optBoolean("showCompletion", true) != false) {
            setupPrayerCheckboxes(context, views)
        }
        
        // تحديث الويدجت
        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
    
    private fun updatePrayersList(views: RemoteViews, data: JSONObject) {
        val allPrayers = data.optJSONArray("allPrayers") ?: return
        
        val prayerViews = listOf(
            Triple(R.id.tv_fajr_name, R.id.tv_fajr_time, R.id.iv_fajr_status),
            Triple(R.id.tv_sunrise_name, R.id.tv_sunrise_time, R.id.iv_sunrise_status),
            Triple(R.id.tv_dhuhr_name, R.id.tv_dhuhr_time, R.id.iv_dhuhr_status),
            Triple(R.id.tv_asr_name, R.id.tv_asr_time, R.id.iv_asr_status),
            Triple(R.id.tv_maghrib_name, R.id.tv_maghrib_time, R.id.iv_maghrib_status),
            Triple(R.id.tv_isha_name, R.id.tv_isha_time, R.id.iv_isha_status)
        )
        
        for (i in 0 until minOf(allPrayers.length(), prayerViews.size)) {
            val prayer = allPrayers.optJSONObject(i) ?: continue
            val (nameId, timeId, statusId) = prayerViews[i]
            
            val nameAr = prayer.optString("nameAr", "")
            val time = prayer.optString("time", "")
            val isPassed = prayer.optBoolean("isPassed", false)
            val isNext = prayer.optBoolean("isNext", false)
            
            views.setTextViewText(nameId, nameAr)
            views.setTextViewText(timeId, time)
            
            // لون النص
            val textColor = when {
                isNext -> Color.parseColor("#FFD700") // أصفر للقادمة
                isPassed -> Color.parseColor("#80FFFFFF") // شفاف للماضية
                else -> Color.WHITE
            }
            views.setTextColor(nameId, textColor)
            views.setTextColor(timeId, textColor)
            
            // أيقونة الحالة
            when {
                isNext -> views.setImageViewResource(statusId, R.drawable.ic_arrow_left)
                isPassed -> views.setImageViewResource(statusId, R.drawable.ic_check)
                else -> views.setViewVisibility(statusId, View.INVISIBLE)
            }
        }
    }
    
    private fun setupClickListeners(context: Context, views: RemoteViews) {
        // فتح التطبيق عند الضغط
        val openAppIntent = Intent(context, NextPrayerWidget::class.java).apply {
            action = ACTION_OPEN_APP
        }
        val openAppPendingIntent = PendingIntent.getBroadcast(
            context,
            0,
            openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_container, openAppPendingIntent)
        
        // تحديث الويدجت
        val refreshIntent = Intent(context, NextPrayerWidget::class.java).apply {
            action = ACTION_REFRESH
        }
        val refreshPendingIntent = PendingIntent.getBroadcast(
            context,
            1,
            refreshIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.btn_refresh, refreshPendingIntent)
    }
    
    private fun loadWidgetData(context: Context): JSONObject? {
        return try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val jsonString = prefs.getString(WIDGET_DATA_KEY, null) ?: return null
            val fullData = JSONObject(jsonString)
            fullData.optJSONObject("prayer")
        } catch (e: Exception) {
            null
        }
    }
    
    private fun loadWidgetSettings(context: Context): JSONObject? {
        return try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val jsonString = prefs.getString(WIDGET_DATA_KEY, null) ?: return null
            val fullData = JSONObject(jsonString)
            fullData.optJSONObject("settings")?.optJSONObject("prayerWidget")
        } catch (e: Exception) {
            null
        }
    }

    /**
     * تبديل حالة إكمال صلاة
     */
    private fun togglePrayerCompletion(context: Context, prayerName: String) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val todayDate = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

        try {
            val completionJson = prefs.getString(PRAYER_COMPLETION_KEY, null)
            val completion = if (completionJson != null) JSONObject(completionJson) else JSONObject()

            val date = completion.optString("date", "")
            val prayers: JSONObject
            if (date == todayDate) {
                prayers = completion.optJSONObject("prayers") ?: JSONObject()
            } else {
                prayers = JSONObject()
            }

            // Toggle the prayer
            val current = prayers.optBoolean(prayerName, false)
            prayers.put(prayerName, !current)

            completion.put("date", todayDate)
            completion.put("prayers", prayers)
            completion.put("lastUpdated", SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(Date()))

            prefs.edit().putString(PRAYER_COMPLETION_KEY, completion.toString()).apply()

            // Also update in the shared widget data for the app to read
            val widgetDataStr = prefs.getString(WIDGET_DATA_KEY, null)
            if (widgetDataStr != null) {
                val widgetData = JSONObject(widgetDataStr)
                widgetData.put("prayerCompletion", completion)
                prefs.edit().putString(WIDGET_DATA_KEY, widgetData.toString()).apply()
            }
        } catch (e: Exception) {
            // Ignore
        }
    }

    /**
     * جلب حالة إكمال الصلوات
     */
    private fun getPrayerCompletion(context: Context): JSONObject {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val todayDate = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

        try {
            // Check shared widget data first
            val widgetDataStr = prefs.getString(WIDGET_DATA_KEY, null)
            if (widgetDataStr != null) {
                val widgetData = JSONObject(widgetDataStr)
                val completion = widgetData.optJSONObject("prayerCompletion")
                if (completion != null && completion.optString("date") == todayDate) {
                    return completion.optJSONObject("prayers") ?: JSONObject()
                }
            }

            // Fallback to dedicated completion key
            val completionJson = prefs.getString(PRAYER_COMPLETION_KEY, null)
            if (completionJson != null) {
                val completion = JSONObject(completionJson)
                if (completion.optString("date") == todayDate) {
                    return completion.optJSONObject("prayers") ?: JSONObject()
                }
            }
        } catch (e: Exception) {
            // Ignore
        }

        return JSONObject()
    }

    /**
     * إعداد أزرار إكمال الصلاة
     */
    private fun setupPrayerCheckboxes(context: Context, views: RemoteViews) {
        val prayers = listOf("fajr", "dhuhr", "asr", "maghrib", "isha")
        val checkboxIds = mapOf(
            "fajr" to R.id.cb_fajr,
            "dhuhr" to R.id.cb_dhuhr,
            "asr" to R.id.cb_asr,
            "maghrib" to R.id.cb_maghrib,
            "isha" to R.id.cb_isha
        )

        val completion = getPrayerCompletion(context)

        for (prayer in prayers) {
            val checkboxId = checkboxIds[prayer] ?: continue
            val isCompleted = completion.optBoolean(prayer, false)

            // Set the checkbox icon
            if (isCompleted) {
                views.setImageViewResource(checkboxId, R.drawable.ic_check_circle)
                views.setInt(checkboxId, "setColorFilter", Color.parseColor("#4CAF50"))
            } else {
                views.setImageViewResource(checkboxId, R.drawable.ic_circle_outline)
                views.setInt(checkboxId, "setColorFilter", Color.parseColor("#80FFFFFF"))
            }

            // Set click listener for toggling
            val toggleIntent = Intent(context, NextPrayerWidget::class.java).apply {
                action = ACTION_TOGGLE_PRAYER
                putExtra(EXTRA_PRAYER_NAME, prayer)
            }
            val togglePendingIntent = PendingIntent.getBroadcast(
                context,
                prayer.hashCode(),
                toggleIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(checkboxId, togglePendingIntent)
        }
    }
}
