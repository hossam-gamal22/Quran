package com.rooh.almuslim.launchericon

import android.content.ComponentName
import android.content.pm.PackageManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class RoohLauncherIconModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("RoohLauncherIcon")

    // killApp=false → DONT_KILL_APP (smooth in-session toggle, may NOT refresh
    // on MIUI/EMUI/One UI launchers until reboot).
    // killApp=true  → omit DONT_KILL_APP so the OS terminates the process after
    // the alias toggle. Required on OEM launchers that cache the icon — they
    // re-query when the user next launches the app. Caller MUST only pass true
    // when the app is in background (otherwise the user's session dies).
    Function("setLauncherIcon") { iconName: String?, aliases: List<String>, killApp: Boolean ->
      val context = appContext.reactContext ?: return@Function false
      val packageName = context.packageName
      val packageManager = context.packageManager
      val mainActivityClass = "$packageName.MainActivity"
      val targetClass = if (iconName.isNullOrBlank()) {
        mainActivityClass
      } else {
        "$mainActivityClass$iconName"
      }
      val launcherClasses = (aliases.map { "$mainActivityClass$it" } + mainActivityClass).distinct()
      val flags = if (killApp) 0 else PackageManager.DONT_KILL_APP

      try {
        packageManager.setComponentEnabledSetting(
          ComponentName(packageName, targetClass),
          PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
          flags
        )

        launcherClasses
          .filter { it != targetClass }
          .forEach { className ->
            packageManager.setComponentEnabledSetting(
              ComponentName(packageName, className),
              PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
              flags
            )
          }

        true
      } catch (_: Exception) {
        false
      }
    }
  }
}
