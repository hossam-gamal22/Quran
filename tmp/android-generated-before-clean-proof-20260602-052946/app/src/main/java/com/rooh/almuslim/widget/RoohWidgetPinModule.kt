package com.rooh.almuslim.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.os.Build
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class RoohWidgetPinModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  companion object {
    private const val TAG = "RoohWidgetPinModule"
  }

  override fun getName(): String = "RoohWidgetPinModule"

  @ReactMethod
  fun requestPinWidget(providerClassName: String, promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
        val out = Arguments.createMap()
        out.putBoolean("requested", false)
        out.putString("reason", "android_version")
        promise.resolve(out)
        return
      }

      val context = reactApplicationContext
      val manager = context.getSystemService(AppWidgetManager::class.java)
      if (manager == null || !manager.isRequestPinAppWidgetSupported) {
        val out = Arguments.createMap()
        out.putBoolean("requested", false)
        out.putString("reason", "unsupported_launcher")
        promise.resolve(out)
        return
      }

      val componentName = ComponentName(
        context.packageName,
        "${context.packageName}.widget.${providerClassName}"
      )
      val requested = manager.requestPinAppWidget(componentName, null, null)
      val out = Arguments.createMap()
      out.putBoolean("requested", requested)
      out.putString("reason", if (requested) "requested" else "rejected")
      promise.resolve(out)
    } catch (e: Exception) {
      Log.w(TAG, "requestPinWidget failed for $providerClassName", e)
      promise.reject("ERR_REQUEST_PIN_WIDGET", e)
    }
  }
}
