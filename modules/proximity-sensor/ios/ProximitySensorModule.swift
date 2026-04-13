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
      // Check actual hardware: enable monitoring briefly and read the state
      let device = UIDevice.current
      let wasEnabled = device.isProximityMonitoringEnabled
      device.isProximityMonitoringEnabled = true
      let available = device.isProximityMonitoringEnabled
      if !wasEnabled {
        device.isProximityMonitoringEnabled = false
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
