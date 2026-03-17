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
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
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
        
        // الأرقام العربية
        private val ARABIC_DIGITS = charArrayOf('٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩')
        
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

        val DAYS_EN = listOf(
            "Sunday", "Monday", "Tuesday", "Wednesday",
            "Thursday", "Friday", "Saturday"
        )

        val HIJRI_MONTHS_EN = listOf(
            "Muharram", "Safar", "Rabi al-Awwal", "Rabi al-Thani",
            "Jumada al-Awwal", "Jumada al-Thani", "Rajab", "Sha'ban",
            "Ramadan", "Shawwal", "Dhu al-Qi'dah", "Dhu al-Hijjah"
        )
        
        /**
         * تحويل الأرقام الإنجليزية إلى أرقام عربية
         */
        fun toArabicNumerals(input: String): String {
            return input.map { ch ->
                if (ch in '0'..'9') ARABIC_DIGITS[ch - '0'] else ch
            }.joinToString("")
        }
        
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

    override fun onEnabled(context: Context) {}

    override fun onDisabled(context: Context) {}

    /**
     * تحميل خط Amiri مع fallback للخط الافتراضي
     */
    private fun loadAmiriFont(context: Context, bold: Boolean = false): Typeface {
        val fontPaths = if (bold) {
            listOf("fonts/Amiri-Bold.ttf", "Amiri-Bold.ttf", "custom_fonts/Amiri-Bold.ttf")
        } else {
            listOf("fonts/Amiri-Regular.ttf", "Amiri-Regular.ttf", "custom_fonts/Amiri-Regular.ttf")
        }
        for (path in fontPaths) {
            try {
                return Typeface.createFromAsset(context.assets, path)
            } catch (_: Exception) { }
        }
        return Typeface.create("serif", if (bold) Typeface.BOLD else Typeface.NORMAL)
    }

    /**
     * رسم نص على Bitmap باستخدام خط مخصص
     */
    private fun renderTextBitmap(
        context: Context,
        text: String,
        textSizeSp: Float,
        textColor: Int,
        bold: Boolean = false
    ): Bitmap {
        val density = context.resources.displayMetrics.scaledDensity
        val textSizePx = textSizeSp * density

        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            this.textSize = textSizePx
            this.color = textColor
            this.textAlign = Paint.Align.CENTER
            this.typeface = loadAmiriFont(context, bold)
        }

        val textWidth = paint.measureText(text).toInt() + 16
        val textHeight = (paint.descent() - paint.ascent()).toInt() + 8
        val width = maxOf(textWidth, 1)
        val height = maxOf(textHeight, 1)

        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawText(text, width / 2f, -paint.ascent() + 4f, paint)
        return bitmap
    }

    private fun updateAppWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        val views = RemoteViews(context.packageName, R.layout.widget_hijri_date)
        
        val data = loadWidgetData(context)
        val settings = loadWidgetSettings(context)
        val showGregorian = settings?.optBoolean("showGregorian", true) ?: true
        val language = loadLanguage(context)
        val isArabic = language == "ar" || language == "ur" || language == "fa"

        val dayName: String
        val hijriDay: String
        val hijriMonth: String
        val hijriYear: String
        val gregorianDate: String

        if (data != null) {
            dayName = if (isArabic) getDayNameAr() else getDayNameEn()
            val dayNum = data.optInt("hijriDay", 1)
            hijriDay = if (isArabic) toArabicNumerals(dayNum.toString()) else dayNum.toString()
            hijriMonth = if (isArabic) data.optString("hijriMonth", "محرم") else data.optString("hijriMonthEn", "Muharram")
            val yearNum = data.optInt("hijriYear", 1446)
            val suffix = if (isArabic) "هـ" else "AH"
            hijriYear = (if (isArabic) toArabicNumerals(yearNum.toString()) else yearNum.toString()) + " $suffix"
            gregorianDate = data.optString("gregorianDate", "")
        } else {
            dayName = if (isArabic) getDayNameAr() else getDayNameEn()
            hijriDay = if (isArabic) "١" else "1"
            hijriMonth = if (isArabic) "محرم" else "Muharram"
            hijriYear = if (isArabic) "١٤٤٦ هـ" else "1446 AH"
            gregorianDate = if (isArabic) getGregorianDateAr() else getGregorianDateEn()
        }
        
        // رسم النصوص كـ Bitmap بخط Amiri
        views.setImageViewBitmap(R.id.iv_day_name,
            renderTextBitmap(context, dayName, 13f, Color.parseColor("#EEFFFFFF")))
        
        views.setImageViewBitmap(R.id.iv_hijri_day,
            renderTextBitmap(context, hijriDay, 52f, Color.WHITE, bold = true))
        
        views.setImageViewBitmap(R.id.iv_hijri_month,
            renderTextBitmap(context, hijriMonth, 18f, Color.WHITE, bold = true))
        
        views.setImageViewBitmap(R.id.iv_hijri_year,
            renderTextBitmap(context, hijriYear, 12f, Color.parseColor("#CCFFFFFF")))
        
        if (showGregorian && gregorianDate.isNotEmpty()) {
            views.setImageViewBitmap(R.id.iv_gregorian_date,
                renderTextBitmap(context, gregorianDate, 11f, Color.parseColor("#99FFFFFF")))
            views.setViewVisibility(R.id.iv_gregorian_date, View.VISIBLE)
        } else {
            views.setViewVisibility(R.id.iv_gregorian_date, View.GONE)
        }
        
        setupClickListeners(context, views)
        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
    
    private fun setupClickListeners(context: Context, views: RemoteViews) {
        val openIntent = Intent(context, HijriDateWidget::class.java).apply {
            action = ACTION_OPEN_APP
        }
        val openPendingIntent = PendingIntent.getBroadcast(
            context, 0, openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_container, openPendingIntent)
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
    
    private fun getDayNameEn(): String {
        val calendar = Calendar.getInstance()
        val dayOfWeek = calendar.get(Calendar.DAY_OF_WEEK) - 1
        return DAYS_EN.getOrElse(dayOfWeek) { "Sunday" }
    }

    private fun getGregorianDateAr(): String {
        val formatter = SimpleDateFormat("d MMMM yyyy", Locale("ar"))
        return formatter.format(Date())
    }

    private fun getGregorianDateEn(): String {
        val formatter = SimpleDateFormat("d MMMM yyyy", Locale.ENGLISH)
        return formatter.format(Date())
    }

    private fun loadLanguage(context: Context): String {
        return try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val jsonString = prefs.getString(WIDGET_DATA_KEY, null) ?: return "ar"
            val fullData = JSONObject(jsonString)
            fullData.optString("language", "ar")
        } catch (e: Exception) {
            "ar"
        }
    }
}
