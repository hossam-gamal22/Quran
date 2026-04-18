// WidgetReloadModule.swift
// Native module to reload WidgetKit timelines from React Native
// Also writes data to App Group container file as fallback

import Foundation
import WidgetKit

@objc(WidgetReloadModule)
class WidgetReloadModule: NSObject {

    private static let appGroupId = "group.com.rooh.almuslim"
    private static let sharedDataFile = "widget_data.json"

    @objc static func requiresMainQueueSetup() -> Bool {
        return false
    }

    /// Reload all WidgetKit timelines — call after writing new data to UserDefaults
    @objc func reloadAllTimelines(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
            resolve(true)
        } else {
            resolve(false)
        }
    }

    /// Reload a specific widget's timeline by its kind identifier
    @objc func reloadTimeline(
        _ kind: String,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadTimelines(ofKind: kind)
            resolve(true)
        } else {
            resolve(false)
        }
    }

    /// Write JSON data to the App Group container file (fallback for UserDefaults)
    @objc func writeSharedDataFile(
        _ jsonString: String,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        guard let containerURL = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: WidgetReloadModule.appGroupId
        ) else {
            reject("NO_CONTAINER", "App Group container not available", nil)
            return
        }

        let fileURL = containerURL.appendingPathComponent(WidgetReloadModule.sharedDataFile)

        do {
            try jsonString.write(to: fileURL, atomically: true, encoding: .utf8)
            resolve(true)
        } catch {
            reject("WRITE_ERROR", "Failed to write shared data file: \(error.localizedDescription)", error)
        }
    }

    // MARK: - Pending Deep Link (AppIntent → RN bridge)

    private static let pendingDeepLinkKey = "pending_deep_link"

    /// Read and atomically clear the pending deep link written by an AppIntent.
    @objc func readPendingDeepLink(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        guard let defaults = UserDefaults(suiteName: WidgetReloadModule.appGroupId) else {
            resolve(NSNull())
            return
        }
        let value = defaults.string(forKey: WidgetReloadModule.pendingDeepLinkKey)
        // Clear immediately so the same link isn't consumed twice
        if value != nil {
            defaults.removeObject(forKey: WidgetReloadModule.pendingDeepLinkKey)
        }
        resolve(value as Any)
    }
}
