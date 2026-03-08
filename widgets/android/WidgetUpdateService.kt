// widgets/android/WidgetUpdateService.kt
// خدمة تحديث الويدجت - روح المسلم
// Android Background Service

package com.roohmuslim.app.widgets

import android.app.Service
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.IBinder
import kotlinx.coroutines.*
import org.json.JSONObject

/**
 * خدمة تحديث جميع الويدجت
 * تعمل في الخلفية لتحديث البيانات
 */
class WidgetUpdateService : Service() {

    private val serviceScope = CoroutineScope(Dispatchers.IO + Job())

    companion object {
        const val ACTION_UPDATE_ALL = "com.roohmuslim.app.ACTION_UPDATE_ALL_WIDGETS"
        const val ACTION_UPDATE_PRAYER = "com.roohmuslim.app.ACTION_UPDATE_PRAYER_WIDGET"
        const val ACTION_UPDATE_AZKAR = "com.roohmuslim.app.ACTION_UPDATE_AZKAR_WIDGET"
        const val ACTION_UPDATE_HIJRI = "com.roohmuslim.app.ACTION_UPDATE_HIJRI_WIDGET"
        
        /**
         * تحديث جميع الويدجت
         */
        fun updateAllWidgets(context: Context) {
            val intent = Intent(context, WidgetUpdateService::class.java).apply {
                action = ACTION_UPDATE_ALL
            }
            context.startService(intent)
        }
        
        /**
         * تحديث ويدجت الصلاة
         */
        fun updatePrayerWidget(context: Context) {
            NextPrayerWidget.updateWidget(context)
        }
        
        /**
         * تحديث ويدجت الأذكار
         */
        fun updateAzkarWidget(context: Context) {
            AzkarWidget.updateWidget(context)
        }
        
        /**
         * تحديث ويدجت التاريخ الهجري
         */
        fun updateHijriWidget(context: Context) {
            HijriDateWidget.updateWidget(context)
        }
        
        /**
         * تحديث ويدجت آية اليوم
         */
        fun updateQuranAyahWidget(context: Context) {
            QuranAyahWidget.updateWidget(context)
        }
        
        /**
         * تحديث ويدجت ذكر اليوم
         */
        fun updateDhikrWidget(context: Context) {
            DhikrWidget.updateWidget(context)
        }
        
        /**
         * حفظ البيانات المشتركة للويدجت
         */
        fun saveWidgetData(context: Context, data: String) {
            val prefs = context.getSharedPreferences(
                NextPrayerWidget.PREFS_NAME,
                Context.MODE_PRIVATE
            )
            prefs.edit().putString(NextPrayerWidget.WIDGET_DATA_KEY, data).apply()
            
            // تحديث جميع الويدجت بعد حفظ البيانات
            updateAllWidgets(context)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_UPDATE_ALL -> {
                serviceScope.launch {
                    updateAllWidgetsInternal()
                    stopSelf()
                }
            }
            ACTION_UPDATE_PRAYER -> {
                NextPrayerWidget.updateWidget(this)
                stopSelf()
            }
            ACTION_UPDATE_AZKAR -> {
                AzkarWidget.updateWidget(this)
                stopSelf()
            }
            ACTION_UPDATE_HIJRI -> {
                HijriDateWidget.updateWidget(this)
                stopSelf()
            }
            else -> stopSelf()
        }
        
        return START_NOT_STICKY
    }

    private suspend fun updateAllWidgetsInternal() {
        withContext(Dispatchers.Main) {
            NextPrayerWidget.updateWidget(this@WidgetUpdateService)
            AzkarWidget.updateWidget(this@WidgetUpdateService)
            HijriDateWidget.updateWidget(this@WidgetUpdateService)
            QuranAyahWidget.updateWidget(this@WidgetUpdateService)
            DhikrWidget.updateWidget(this@WidgetUpdateService)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        serviceScope.cancel()
    }
}

/**
 * مدير الويدجت الموحد
 * يوفر واجهة موحدة للتعامل مع جميع الويدجت
 */
object WidgetManager {
    
    /**
     * تهيئة الويدجت عند بدء التطبيق
     */
    fun initialize(context: Context) {
        // تحديث جميع الويدجت
        WidgetUpdateService.updateAllWidgets(context)
    }
    
    /**
     * تحديث بيانات الويدجت
     */
    fun updateWidgetData(context: Context, prayerData: JSONObject?, azkarData: JSONObject?, settings: JSONObject?) {
        val fullData = JSONObject().apply {
            prayerData?.let { put("prayer", it) }
            azkarData?.let { put("azkar", it) }
            settings?.let { put("settings", it) }
        }
        
        WidgetUpdateService.saveWidgetData(context, fullData.toString())
    }
    
    /**
     * تحديث بيانات الصلاة فقط
     */
    fun updatePrayerData(context: Context, data: JSONObject) {
        val prefs = context.getSharedPreferences(
            NextPrayerWidget.PREFS_NAME,
            Context.MODE_PRIVATE
        )
        
        val existingData = try {
            JSONObject(prefs.getString(NextPrayerWidget.WIDGET_DATA_KEY, "{}") ?: "{}")
        } catch (e: Exception) {
            JSONObject()
        }
        
        existingData.put("prayer", data)
        prefs.edit().putString(NextPrayerWidget.WIDGET_DATA_KEY, existingData.toString()).apply()
        
        NextPrayerWidget.updateWidget(context)
    }
    
    /**
     * تحديث بيانات الأذكار فقط
     */
    fun updateAzkarData(context: Context, data: JSONObject) {
        val prefs = context.getSharedPreferences(
            NextPrayerWidget.PREFS_NAME,
            Context.MODE_PRIVATE
        )
        
        val existingData = try {
            JSONObject(prefs.getString(NextPrayerWidget.WIDGET_DATA_KEY, "{}") ?: "{}")
        } catch (e: Exception) {
            JSONObject()
        }
        
        existingData.put("azkar", data)
        prefs.edit().putString(NextPrayerWidget.WIDGET_DATA_KEY, existingData.toString()).apply()
        
        AzkarWidget.updateWidget(context)
    }
    
    /**
     * تحديث الإعدادات
     */
    fun updateSettings(context: Context, settings: JSONObject) {
        val prefs = context.getSharedPreferences(
            NextPrayerWidget.PREFS_NAME,
            Context.MODE_PRIVATE
        )
        
        val existingData = try {
            JSONObject(prefs.getString(NextPrayerWidget.WIDGET_DATA_KEY, "{}") ?: "{}")
        } catch (e: Exception) {
            JSONObject()
        }
        
        existingData.put("settings", settings)
        prefs.edit().putString(NextPrayerWidget.WIDGET_DATA_KEY, existingData.toString()).apply()
        
        // تحديث جميع الويدجت بعد تغيير الإعدادات
        WidgetUpdateService.updateAllWidgets(context)
    }
    
    /**
     * التحقق من وجود ويدجت نشطة
     */
    fun hasActiveWidgets(context: Context): Boolean {
        val appWidgetManager = AppWidgetManager.getInstance(context)
        
        val prayerWidgets = appWidgetManager.getAppWidgetIds(
            ComponentName(context, NextPrayerWidget::class.java)
        )
        val azkarWidgets = appWidgetManager.getAppWidgetIds(
            ComponentName(context, AzkarWidget::class.java)
        )
        val hijriWidgets = appWidgetManager.getAppWidgetIds(
            ComponentName(context, HijriDateWidget::class.java)
        )
        
        return prayerWidgets.isNotEmpty() || azkarWidgets.isNotEmpty() || hijriWidgets.isNotEmpty()
    }
    
    /**
     * الحصول على عدد الويدجت النشطة
     */
    fun getActiveWidgetsCount(context: Context): Map<String, Int> {
        val appWidgetManager = AppWidgetManager.getInstance(context)
        
        return mapOf(
            "prayer" to appWidgetManager.getAppWidgetIds(
                ComponentName(context, NextPrayerWidget::class.java)
            ).size,
            "azkar" to appWidgetManager.getAppWidgetIds(
                ComponentName(context, AzkarWidget::class.java)
            ).size,
            "hijri" to appWidgetManager.getAppWidgetIds(
                ComponentName(context, HijriDateWidget::class.java)
            ).size
        )
    }
}
