// widgets/android/AzkarWidget.kt
// ويدجت الأذكار - روح المسلم
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
import java.util.*

/**
 * ويدجت الأذكار للأندرويد
 */
class AzkarWidget : AppWidgetProvider() {

    companion object {
        const val PREFS_NAME = "RoohMuslimWidgetPrefs"
        const val WIDGET_DATA_KEY = "widget_shared_data"
        const val ACTION_REFRESH = "com.roohmuslim.app.ACTION_REFRESH_AZKAR_WIDGET"
        const val ACTION_NEXT_ZIKR = "com.roohmuslim.app.ACTION_NEXT_ZIKR"
        const val ACTION_OPEN_AZKAR = "com.roohmuslim.app.ACTION_OPEN_AZKAR"
        
        // ألوان الفئات
        val CATEGORY_COLORS = mapOf(
            "morning" to "#f5a623",
            "evening" to "#3a7ca5",
            "sleep" to "#5d4e8c",
            "wakeup" to "#2f7659",
            "afterPrayer" to "#c17f59",
            "misc" to "#2f7659"
        )
        
        // أسماء الفئات بالعربية
        val CATEGORY_NAMES = mapOf(
            "morning" to "أذكار الصباح",
            "evening" to "أذكار المساء",
            "sleep" to "أذكار النوم",
            "wakeup" to "أذكار الاستيقاظ",
            "afterPrayer" to "بعد الصلاة",
            "misc" to "أذكار متنوعة"
        )
        
        /**
         * تحديث الويدجت من خارج الكلاس
         */
        fun updateWidget(context: Context) {
            val intent = Intent(context, AzkarWidget::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            }
            val ids = AppWidgetManager.getInstance(context)
                .getAppWidgetIds(ComponentName(context, AzkarWidget::class.java))
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
            ACTION_REFRESH, ACTION_NEXT_ZIKR -> {
                // تحديث الويدجت بذكر جديد
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val ids = appWidgetManager.getAppWidgetIds(
                    ComponentName(context, AzkarWidget::class.java)
                )
                onUpdate(context, appWidgetManager, ids)
            }
            ACTION_OPEN_AZKAR -> {
                // فتح صفحة الأذكار
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
        val views = RemoteViews(context.packageName, R.layout.widget_azkar)
        
        // قراءة البيانات
        val data = loadWidgetData(context)
        val settings = loadWidgetSettings(context)
        
        if (data != null) {
            val randomZikr = data.optJSONObject("randomZikr")
            val morningCompleted = data.optBoolean("morningCompleted", false)
            val eveningCompleted = data.optBoolean("eveningCompleted", false)
            
            if (randomZikr != null) {
                val text = randomZikr.optString("text", "سبحان الله وبحمده")
                val translation = randomZikr.optString("translation", "")
                val count = randomZikr.optInt("count", 1)
                val category = randomZikr.optString("category", "morning")
                val benefit = randomZikr.optString("benefit", "")
                
                // تحديث النص
                views.setTextViewText(R.id.tv_zikr_text, text)
                
                // الفئة - use translated name from shared data, fallback to map
                val categoryName = randomZikr.optString("categoryName", "") 
                    .ifEmpty { CATEGORY_NAMES[category] ?: "\u0623\u0630\u0643\u0627\u0631" }
                views.setTextViewText(R.id.tv_category, categoryName)
                
                // لون الخلفية
                val categoryColor = CATEGORY_COLORS[category] ?: "#2f7659"
                try {
                    views.setInt(R.id.widget_container, "setBackgroundColor", Color.parseColor(categoryColor))
                } catch (e: Exception) {
                    views.setInt(R.id.widget_container, "setBackgroundColor", Color.parseColor("#2f7659"))
                }
                
                // العدد
                if (count > 1) {
                    val timesLabel = randomZikr.optString("timesLabel", "\u0645\u0631\u0627\u062a")
                    views.setTextViewText(R.id.tv_count, "$count $timesLabel")
                    views.setViewVisibility(R.id.ll_count, View.VISIBLE)
                } else {
                    views.setViewVisibility(R.id.ll_count, View.GONE)
                }
                
                // الترجمة
                if (settings?.optBoolean("showTranslation", false) == true && translation.isNotEmpty()) {
                    views.setTextViewText(R.id.tv_translation, translation)
                    views.setViewVisibility(R.id.tv_translation, View.VISIBLE)
                } else {
                    views.setViewVisibility(R.id.tv_translation, View.GONE)
                }
                
                // الفائدة (للويدجت الكبير)
                if (benefit.isNotEmpty()) {
                    views.setTextViewText(R.id.tv_benefit, benefit)
                    views.setViewVisibility(R.id.ll_benefit, View.VISIBLE)
                } else {
                    views.setViewVisibility(R.id.ll_benefit, View.GONE)
                }
            }
            
            // حالة الإكمال
            updateCompletionStatus(views, morningCompleted, eveningCompleted)
            
        } else {
            // بيانات افتراضية
            views.setTextViewText(R.id.tv_zikr_text, "سُبْحَانَ اللهِ وَبِحَمْدِهِ، سُبْحَانَ اللهِ الْعَظِيمِ")
            views.setTextViewText(R.id.tv_category, "أذكار")
            views.setViewVisibility(R.id.ll_count, View.GONE)
            views.setViewVisibility(R.id.tv_translation, View.GONE)
        }
        
        // إعداد الضغطات
        setupClickListeners(context, views)
        
        // تحديث الويدجت
        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
    
    private fun updateCompletionStatus(
        views: RemoteViews,
        morningCompleted: Boolean,
        eveningCompleted: Boolean
    ) {
        // أيقونة الصباح
        if (morningCompleted) {
            views.setImageViewResource(R.id.iv_morning_status, R.drawable.ic_check_circle)
            views.setInt(R.id.iv_morning_status, "setColorFilter", Color.parseColor("#4CAF50"))
        } else {
            views.setImageViewResource(R.id.iv_morning_status, R.drawable.ic_circle_outline)
            views.setInt(R.id.iv_morning_status, "setColorFilter", Color.parseColor("#80FFFFFF"))
        }
        
        // أيقونة المساء
        if (eveningCompleted) {
            views.setImageViewResource(R.id.iv_evening_status, R.drawable.ic_check_circle)
            views.setInt(R.id.iv_evening_status, "setColorFilter", Color.parseColor("#4CAF50"))
        } else {
            views.setImageViewResource(R.id.iv_evening_status, R.drawable.ic_circle_outline)
            views.setInt(R.id.iv_evening_status, "setColorFilter", Color.parseColor("#80FFFFFF"))
        }
    }
    
    private fun setupClickListeners(context: Context, views: RemoteViews) {
        // فتح صفحة الأذكار
        val openIntent = Intent(context, AzkarWidget::class.java).apply {
            action = ACTION_OPEN_AZKAR
        }
        val openPendingIntent = PendingIntent.getBroadcast(
            context,
            0,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_container, openPendingIntent)
        
        // ذكر جديد
        val nextIntent = Intent(context, AzkarWidget::class.java).apply {
            action = ACTION_NEXT_ZIKR
        }
        val nextPendingIntent = PendingIntent.getBroadcast(
            context,
            1,
            nextIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.btn_next, nextPendingIntent)
        
        // تحديث
        val refreshIntent = Intent(context, AzkarWidget::class.java).apply {
            action = ACTION_REFRESH
        }
        val refreshPendingIntent = PendingIntent.getBroadcast(
            context,
            2,
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
            fullData.optJSONObject("azkar")
        } catch (e: Exception) {
            null
        }
    }
    
    private fun loadWidgetSettings(context: Context): JSONObject? {
        return try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val jsonString = prefs.getString(WIDGET_DATA_KEY, null) ?: return null
            val fullData = JSONObject(jsonString)
            fullData.optJSONObject("settings")?.optJSONObject("azkarWidget")
        } catch (e: Exception) {
            null
        }
    }
}
