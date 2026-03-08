// widgets/android/DhikrWidget.kt
// ويدجت ذكر اليوم - روح المسلم
// Android App Widget

package com.roohmuslim.app.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject

/**
 * ويدجت ذكر اليوم للأندرويد
 * يعرض ذكراً يومياً ثابتاً يتجدد كل يوم
 */
class DhikrWidget : AppWidgetProvider() {

    companion object {
        const val PREFS_NAME = "RoohMuslimWidgetPrefs"
        const val WIDGET_DATA_KEY = "widget_shared_data"
        const val ACTION_REFRESH = "com.roohmuslim.app.ACTION_REFRESH_DHIKR_WIDGET"
        const val ACTION_OPEN_AZKAR = "com.roohmuslim.app.ACTION_OPEN_AZKAR_DHIKR"

        // ألوان الفئات
        val CATEGORY_COLORS = mapOf(
            "morning" to "#f5a623",
            "evening" to "#3a7ca5",
            "sleep" to "#5d4e8c",
            "wakeup" to "#2f7659",
            "after_prayer" to "#c17f59",
            "quran_duas" to "#1e3a5f",
            "sunnah_duas" to "#2f7659",
            "protection" to "#1a237e",
            "misc" to "#5d4e8c"
        )

        /**
         * تحديث الويدجت من خارج الكلاس
         */
        fun updateWidget(context: Context) {
            val intent = Intent(context, DhikrWidget::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            }
            val ids = AppWidgetManager.getInstance(context)
                .getAppWidgetIds(ComponentName(context, DhikrWidget::class.java))
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
                    ComponentName(context, DhikrWidget::class.java)
                )
                onUpdate(context, appWidgetManager, ids)
            }
            ACTION_OPEN_AZKAR -> {
                val launchIntent = context.packageManager
                    .getLaunchIntentForPackage(context.packageName)
                launchIntent?.let {
                    it.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    it.putExtra("openScreen", "azkar")
                    context.startActivity(it)
                }
            }
        }
    }

    override fun onEnabled(context: Context) {}
    override fun onDisabled(context: Context) {}

    private fun updateAppWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        val views = RemoteViews(context.packageName, R.layout.widget_dhikr)

        val data = loadDhikrData(context)
        val settings = loadWidgetSettings(context)

        if (data != null) {
            val arabic = data.optString("arabic", "سُبْحَانَ اللهِ وَبِحَمْدِهِ")
            val count = data.optInt("count", 1)
            val category = data.optString("category", "misc")
            val categoryName = data.optString("categoryName", "أذكار")
            val benefit = data.optString("benefit", "")

            views.setTextViewText(R.id.tv_dhikr_text, arabic)
            views.setTextViewText(R.id.tv_category, categoryName)

            // العدد
            if (count > 1) {
                views.setTextViewText(R.id.tv_count, "$count مرات")
                views.setViewVisibility(R.id.ll_count, View.VISIBLE)
            } else {
                views.setViewVisibility(R.id.ll_count, View.GONE)
            }

            // لون الخلفية حسب الفئة
            val categoryColor = CATEGORY_COLORS[category] ?: "#5d4e8c"
            try {
                views.setInt(R.id.widget_container, "setBackgroundColor", Color.parseColor(categoryColor))
            } catch (e: Exception) {
                views.setInt(R.id.widget_container, "setBackgroundColor", Color.parseColor("#5d4e8c"))
            }

            // الترجمة (اختياري)
            val translation = data.optString("translation", "")
            if (settings?.optBoolean("showTranslation", false) == true && translation.isNotEmpty()) {
                views.setTextViewText(R.id.tv_translation, translation)
                views.setViewVisibility(R.id.tv_translation, View.VISIBLE)
            } else {
                views.setViewVisibility(R.id.tv_translation, View.GONE)
            }

            // الفائدة
            if (settings?.optBoolean("showBenefit", true) == true && benefit.isNotEmpty()) {
                views.setTextViewText(R.id.tv_benefit, benefit)
                views.setViewVisibility(R.id.ll_benefit, View.VISIBLE)
            } else {
                views.setViewVisibility(R.id.ll_benefit, View.GONE)
            }
        } else {
            views.setTextViewText(R.id.tv_dhikr_text, "سُبْحَانَ اللهِ وَبِحَمْدِهِ، سُبْحَانَ اللهِ الْعَظِيمِ")
            views.setTextViewText(R.id.tv_category, "أذكار")
            views.setViewVisibility(R.id.ll_count, View.GONE)
            views.setViewVisibility(R.id.tv_translation, View.GONE)
            views.setViewVisibility(R.id.ll_benefit, View.GONE)
        }

        setupClickListeners(context, views)
        appWidgetManager.updateAppWidget(appWidgetId, views)
    }

    private fun setupClickListeners(context: Context, views: RemoteViews) {
        val openIntent = Intent(context, DhikrWidget::class.java).apply {
            action = ACTION_OPEN_AZKAR
        }
        val openPendingIntent = PendingIntent.getBroadcast(
            context, 0, openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_container, openPendingIntent)

        val refreshIntent = Intent(context, DhikrWidget::class.java).apply {
            action = ACTION_REFRESH
        }
        val refreshPendingIntent = PendingIntent.getBroadcast(
            context, 1, refreshIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.btn_refresh, refreshPendingIntent)
    }

    private fun loadDhikrData(context: Context): JSONObject? {
        return try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val jsonString = prefs.getString(WIDGET_DATA_KEY, null) ?: return null
            val fullData = JSONObject(jsonString)
            fullData.optJSONObject("dhikr")
        } catch (e: Exception) {
            null
        }
    }

    private fun loadWidgetSettings(context: Context): JSONObject? {
        return try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val jsonString = prefs.getString(WIDGET_DATA_KEY, null) ?: return null
            val fullData = JSONObject(jsonString)
            fullData.optJSONObject("settings")?.optJSONObject("dhikrWidget")
        } catch (e: Exception) {
            null
        }
    }
}
