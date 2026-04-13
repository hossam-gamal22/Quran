package com.rooh.almuslim.proximitysensor

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.content.Context

class ProximitySensorModule : Module(), SensorEventListener {
  private var sensorManager: SensorManager? = null
  private var proximitySensor: Sensor? = null
  private var isMonitoring = false

  override fun definition() = ModuleDefinition {
    Name("ProximitySensor")

    Events("onProximityChange")

    OnCreate {
      val context = appContext.reactContext ?: return@OnCreate
      sensorManager = context.getSystemService(
        Context.SENSOR_SERVICE
      ) as? SensorManager
      proximitySensor = sensorManager?.getDefaultSensor(
        Sensor.TYPE_PROXIMITY
      )
    }

    Function("startMonitoring") {
      proximitySensor?.let { sensor ->
        sensorManager?.registerListener(
          this@ProximitySensorModule,
          sensor,
          SensorManager.SENSOR_DELAY_NORMAL
        )
        isMonitoring = true
      }
    }

    Function("stopMonitoring") {
      if (isMonitoring) {
        sensorManager?.unregisterListener(this@ProximitySensorModule)
        isMonitoring = false
      }
    }

    Function("isAvailable") {
      proximitySensor != null
    }

    OnDestroy {
      if (isMonitoring) {
        sensorManager?.unregisterListener(this@ProximitySensorModule)
        isMonitoring = false
      }
    }
  }

  override fun onSensorChanged(event: SensorEvent) {
    if (event.sensor.type == Sensor.TYPE_PROXIMITY) {
      val maxRange = event.sensor.maximumRange
      val isNear = event.values[0] < maxRange
      sendEvent("onProximityChange", mapOf("isNear" to isNear))
    }
  }

  override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
    // No-op
  }
}
