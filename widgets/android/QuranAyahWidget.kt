// widgets/android/QuranAyahWidget.kt
// ويدجت آية اليوم - روح المسلم
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
 * ويدجت آية اليوم للأندرويد
 * يعرض آية يومية متجددة بأسلوب Material You
 */
class QuranAyahWidget : AppWidgetProvider() {

    companion object {
        const val PREFS_NAME = "RoohMuslimWidgetPrefs"
        const val WIDGET_DATA_KEY = "widget_shared_data"
        const val ACTION_REFRESH = "com.roohmuslim.app.ACTION_REFRESH_AYAH_WIDGET"
        const val ACTION_OPEN_QURAN = "com.roohmuslim.app.ACTION_OPEN_QURAN"

        /**
         * تحديث الويدجت من خارج الكلاس
         */
        fun updateWidget(context: Context) {
            val intent = Intent(context, QuranAyahWidget::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            }
            val ids = AppWidgetManager.getInstance(context)
                .getAppWidgetIds(ComponentName(context, QuranAyahWidget::class.java))
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
                    ComponentName(context, QuranAyahWidget::class.java)
                )
                onUpdate(context, appWidgetManager, ids)
            }
            ACTION_OPEN_QURAN -> {
                val launchIntent = context.packageManager
                    .getLaunchIntentForPackage(context.packageName)
                launchIntent?.let {
                    it.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    it.putExtra("openScreen", "quran")
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
        val views = RemoteViews(context.packageName, R.layout.widget_quran_ayah)

        val data = loadVerseData(context)
        val settings = loadWidgetSettings(context)

        if (data != null) {
            val arabic = data.optString("arabic", "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ")
            val surahName = data.optString("surahName", "سورة الفاتحة")
            val numberInSurah = data.optInt("numberInSurah", 1)

            views.setTextViewText(R.id.tv_verse_text, arabic)
            views.setTextViewText(R.id.tv_surah_name, surahName)
            views.setTextViewText(R.id.tv_verse_number, "آية $numberInSurah")

            // الترجمة (اختياري)
            val translation = data.optString("translation", "")
            if (settings?.optBoolean("showTranslation", false) == true && translation.isNotEmpty()) {
                views.setTextViewText(R.id.tv_translation, translation)
                views.setViewVisibility(R.id.tv_translation, View.VISIBLE)
            } else {
                views.setViewVisibility(R.id.tv_translation, View.GONE)
            }
        } else {
            views.setTextViewText(R.id.tv_verse_text, "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ")
            views.setTextViewText(R.id.tv_surah_name, "سورة الفاتحة")
            views.setTextViewText(R.id.tv_verse_number, "آية ١")
            views.setViewVisibility(R.id.tv_translation, View.GONE)
        }

        setupClickListeners(context, views)
        appWidgetManager.updateAppWidget(appWidgetId, views)
    }

    private fun setupClickListeners(context: Context, views: RemoteViews) {
        // فتح القرآن عند الضغط
        val openIntent = Intent(context, QuranAyahWidget::class.java).apply {
            action = ACTION_OPEN_QURAN
        }
        val openPendingIntent = PendingIntent.getBroadcast(
            context, 0, openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_container, openPendingIntent)

        // تحديث
        val refreshIntent = Intent(context, QuranAyahWidget::class.java).apply {
            action = ACTION_REFRESH
        }
        val refreshPendingIntent = PendingIntent.getBroadcast(
            context, 1, refreshIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.btn_refresh, refreshPendingIntent)
    }

    private fun loadVerseData(context: Context): JSONObject? {
        return try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val jsonString = prefs.getString(WIDGET_DATA_KEY, null) ?: return null
            val fullData = JSONObject(jsonString)
            fullData.optJSONObject("verse")
        } catch (e: Exception) {
            null
        }
    }

    private fun loadWidgetSettings(context: Context): JSONObject? {
        return try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val jsonString = prefs.getString(WIDGET_DATA_KEY, null) ?: return null
            val fullData = JSONObject(jsonString)
            fullData.optJSONObject("settings")?.optJSONObject("verseWidget")
        } catch (e: Exception) {
            null
        }
    }
}
