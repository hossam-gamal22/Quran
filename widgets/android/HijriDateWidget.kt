// widgets/android/HijriDateWidget.kt
// ويدجت التاريخ الهجري - روح المسلم
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
import java.text.SimpleDateFormat
import java.util.*

/**
 * ويدجت التاريخ الهجري للأندرويد
 */
class HijriDateWidget : AppWidgetProvider() {

    companion object {
        const val PREFS_NAME = "RoohMuslimWidgetPrefs"
        const val WIDGET_DATA_KEY = "widget_shared_data"
        const val ACTION_REFRESH = "com.roohmuslim.app.ACTION_REFRESH_HIJRI_WIDGET"
        const val ACTION_OPEN_APP = "com.roohmuslim.app.ACTION_OPEN_APP_HIJRI"
        
        // أسماء الأشهر الهجرية
        val HIJRI_MONTHS = listOf(
            "محرم", "صفر", "ربيع الأول", "ربيع الثاني",
            "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان",
            "رمضان", "شوال", "ذو القعدة", "ذو الحجة"
        )
        
        // أسماء الأيام بالعربية
        val DAYS_AR = listOf(
            "الأحد", "الإثنين", "الثلاثاء", "الأربعاء",
            "الخميس", "الجمعة", "السبت"
        )
        
        /**
         * تحديث الويدجت من خارج الكلاس
         */
        fun updateWidget(context: Context) {
            val intent = Intent(context, HijriDateWidget::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            }
            val ids = AppWidgetManager.getInstance(context)
                .getAppWidgetIds(ComponentName(context, HijriDateWidget::class.java))
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
                    ComponentName(context, HijriDateWidget::class.java)
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
        val views = RemoteViews(context.packageName, R.layout.widget_hijri_date)
        
        // قراءة البيانات
        val data = loadWidgetData(context)
        val settings = loadWidgetSettings(context)
        val showGregorian = settings?.optBoolean("showGregorian", true) ?: true
        
        if (data != null) {
            val hijriDay = data.optInt("hijriDay", 1)
            val hijriMonth = data.optString("hijriMonth", "محرم")
            val hijriYear = data.optInt("hijriYear", 1446)
            val hijriDate = data.optString("hijriDate", "1 محرم 1446")
            val gregorianDate = data.optString("gregorianDate", "")
            
            // اسم اليوم
            val dayName = getDayNameAr()
            views.setTextViewText(R.id.tv_day_name, dayName)
            
            // اليوم الهجري
            views.setTextViewText(R.id.tv_hijri_day, hijriDay.toString())
            
            // الشهر الهجري
            views.setTextViewText(R.id.tv_hijri_month, hijriMonth)
            
            // السنة الهجرية
            views.setTextViewText(R.id.tv_hijri_year, "$hijriYear هـ")
            
            // التاريخ الميلادي
            if (showGregorian && gregorianDate.isNotEmpty()) {
                views.setTextViewText(R.id.tv_gregorian_date, gregorianDate)
                views.setViewVisibility(R.id.tv_gregorian_date, View.VISIBLE)
            } else {
                views.setViewVisibility(R.id.tv_gregorian_date, View.GONE)
            }
            
        } else {
            // بيانات افتراضية
            val dayName = getDayNameAr()
            views.setTextViewText(R.id.tv_day_name, dayName)
            views.setTextViewText(R.id.tv_hijri_day, "1")
            views.setTextViewText(R.id.tv_hijri_month, "محرم")
            views.setTextViewText(R.id.tv_hijri_year, "1446 هـ")
            
            if (showGregorian) {
                val gregorian = getGregorianDateAr()
                views.setTextViewText(R.id.tv_gregorian_date, gregorian)
                views.setViewVisibility(R.id.tv_gregorian_date, View.VISIBLE)
            }
        }
        
        // إعداد الضغطات
        setupClickListeners(context, views)
        
        // تحديث الويدجت
        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
    
    private fun setupClickListeners(context: Context, views: RemoteViews) {
        // فتح التطبيق
        val openIntent = Intent(context, HijriDateWidget::class.java).apply {
            action = ACTION_OPEN_APP
        }
        val openPendingIntent = PendingIntent.getBroadcast(
            context,
            0,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_container, openPendingIntent)
        
        // تحديث
        val refreshIntent = Intent(context, HijriDateWidget::class.java).apply {
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
            fullData.optJSONObject("prayer") // بيانات التاريخ موجودة في prayer
        } catch (e: Exception) {
            null
        }
    }
    
    private fun loadWidgetSettings(context: Context): JSONObject? {
        return try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val jsonString = prefs.getString(WIDGET_DATA_KEY, null) ?: return null
            val fullData = JSONObject(jsonString)
            fullData.optJSONObject("settings")?.optJSONObject("hijriWidget")
        } catch (e: Exception) {
            null
        }
    }
    
    private fun getDayNameAr(): String {
        val calendar = Calendar.getInstance()
        val dayOfWeek = calendar.get(Calendar.DAY_OF_WEEK) - 1
        return DAYS_AR.getOrElse(dayOfWeek) { "الأحد" }
    }
    
    private fun getGregorianDateAr(): String {
        val formatter = SimpleDateFormat("d MMMM yyyy", Locale("ar"))
        return formatter.format(Date())
    }
}
