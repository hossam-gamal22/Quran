import ExpoModulesCore
import UIKit

public class ProximitySensorModule: Module {
  private var isMonitoring = false

  public func definition() -> ModuleDefinition {
    Name("ProximitySensor")

    Events("onProximityChange")

    Function("startMonitoring") {
      DispatchQueue.main.async {
        UIDevice.current.isProximityMonitoringEnabled = true
        NotificationCenter.default.addObserver(
          self,
          selector: #selector(self.proximityChanged),
          name: UIDevice.proximityStateDidChangeNotification,
          object: nil
        )
        self.isMonitoring = true
      }
    }

    Function("stopMonitoring") {
      DispatchQueue.main.async {
        UIDevice.current.isProximityMonitoringEnabled = false
        NotificationCenter.default.removeObserver(
          self,
          name: UIDevice.proximityStateDidChangeNotification,
          object: nil
        )
        self.isMonitoring = false
      }
    }

    Function("isAvailable") { () -> Bool in
      // UIKit must be accessed on the main thread. Use sync dispatch so we can
      // return the value synchronously to JS without crashing the app.
      var available = false
      if Thread.isMainThread {
        let device = UIDevice.current
        let wasEnabled = device.isProximityMonitoringEnabled
        device.isProximityMonitoringEnabled = true
        available = device.isProximityMonitoringEnabled
        if !wasEnabled {
          device.isProximityMonitoringEnabled = false
        }
      } else {
        DispatchQueue.main.sync {
          let device = UIDevice.current
          let wasEnabled = device.isProximityMonitoringEnabled
          device.isProximityMonitoringEnabled = true
          available = device.isProximityMonitoringEnabled
          if !wasEnabled {
            device.isProximityMonitoringEnabled = false
          }
        }
      }
      return available
    }

    OnDestroy {
      DispatchQueue.main.async {
        if self.isMonitoring {
          UIDevice.current.isProximityMonitoringEnabled = false
          NotificationCenter.default.removeObserver(self)
          self.isMonitoring = false
        }
      }
    }
  }

  @objc func proximityChanged() {
    let isNear = UIDevice.current.proximityState
    sendEvent("onProximityChange", ["isNear": isNear])
  }
}
