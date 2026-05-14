const { withDangerousMod, withMainApplication } = require('expo/config-plugins');
const { join, resolve } = require('path');
const { mkdirSync, writeFileSync } = require('fs');

const PACKAGE_DIR = 'com/rooh/almuslim/widget';
const PACKAGE_CLASS = 'com.rooh.almuslim.widget.RoohWidgetPinPackage';

const WIDGET_PIN_MODULE_KT = `package com.rooh.almuslim.widget

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
        "\${context.packageName}.widget.\${providerClassName}"
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
`;

const WIDGET_PIN_PACKAGE_KT = `package com.rooh.almuslim.widget

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class RoohWidgetPinPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): MutableList<NativeModule> =
    mutableListOf(RoohWidgetPinModule(reactContext))

  override fun createViewManagers(reactContext: ReactApplicationContext): MutableList<ViewManager<*, *>> =
    mutableListOf()
}
`;

function withAndroidWidgetPin(config) {
  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const srcDir = resolve(projectRoot, 'android/app/src/main/java', PACKAGE_DIR);
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(join(srcDir, 'RoohWidgetPinModule.kt'), WIDGET_PIN_MODULE_KT, 'utf-8');
      writeFileSync(join(srcDir, 'RoohWidgetPinPackage.kt'), WIDGET_PIN_PACKAGE_KT, 'utf-8');
      console.log('[with-android-widget-pin] Wrote RoohWidgetPinModule.kt + RoohWidgetPinPackage.kt');
      return cfg;
    },
  ]);

  config = withMainApplication(config, (cfg) => {
    let src = cfg.modResults.contents;
    const importLine = `import ${PACKAGE_CLASS}`;
    if (!src.includes(importLine)) {
      const importRegex = /(^import [^\n]+\n)(?![\s\S]*^import )/m;
      if (importRegex.test(src)) {
        src = src.replace(importRegex, `$1${importLine}\n`);
      } else {
        src = `${importLine}\n${src}`;
      }
    }

    const addLine = '            add(RoohWidgetPinPackage())';
    if (!src.includes('RoohWidgetPinPackage()')) {
      const kotlinApply = /((?:val\s+packages\s*=\s*)?PackageList\(this\)\.packages\s*\.apply\s*\{)/;
      if (kotlinApply.test(src)) {
        src = src.replace(kotlinApply, `$1\n${addLine}`);
      } else {
        const returnPackages = /(return packages)/;
        if (returnPackages.test(src)) {
          src = src.replace(returnPackages, `packages.add(RoohWidgetPinPackage())\n        $1`);
        } else {
          console.warn('[with-android-widget-pin] Could not auto-register RoohWidgetPinPackage in MainApplication.kt');
        }
      }
    }

    cfg.modResults.contents = src;
    console.log('[with-android-widget-pin] Registered RoohWidgetPinPackage in MainApplication.kt');
    return cfg;
  });

  return config;
}

module.exports = withAndroidWidgetPin;
