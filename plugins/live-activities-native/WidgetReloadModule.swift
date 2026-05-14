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

    /// Return currently placed WidgetKit configurations so JS can regenerate
    /// only the snapshots that are visible on the user's home screen first.
    @objc func currentWidgetConfigurations(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.getCurrentConfigurations { result in
                switch result {
                case .success(let infos):
                    let payload = infos.map { info -> [String: String] in
                        let family: String
                        switch info.family {
                        case .systemSmall: family = "small"
                        case .systemMedium: family = "medium"
                        case .systemLarge: family = "large"
                        default: family = "unknown"
                        }
                        return ["kind": info.kind, "family": family]
                    }
                    NSLog("[widget/ios] current configurations=%@", "\(payload)")
                    resolve(payload)
                case .failure(let error):
                    reject("CONFIG_ERROR", "Failed to read widget configurations: \(error.localizedDescription)", error)
                }
            }
        } else {
            resolve([])
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

    // MARK: - Snapshot images (Phase B)

    /// Subdirectory inside the App Group container that holds widget PNG snapshots.
    /// Layout: `<container>/widgets/<id>_<size>.png`
    private static let widgetsDir = "widgets"

    /// Copies a PNG produced by react-native-view-shot into the App Group container.
    /// `srcPath` is the absolute filesystem path returned by captureRef (no scheme).
    /// `name` is `<widgetId>_<size>` — the file lands at `<container>/widgets/<name>.png`.
    /// Atomic via `replaceItem` so concurrent reads from the widget extension never see
    /// a half-written file.
    @objc func writeSharedImage(
        _ name: String,
        srcPath: String,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        guard let containerURL = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: WidgetReloadModule.appGroupId
        ) else {
            reject("NO_CONTAINER", "App Group container not available", nil)
            return
        }

        let fm = FileManager.default
        let dir = containerURL.appendingPathComponent(WidgetReloadModule.widgetsDir, isDirectory: true)
        do {
            try fm.createDirectory(at: dir, withIntermediateDirectories: true)
        } catch {
            reject("MKDIR_ERROR", "Failed to create widgets dir: \(error.localizedDescription)", error)
            return
        }

        // captureRef returns either an absolute filesystem path or `file://...` URI.
        let normalizedSrc: String
        if srcPath.hasPrefix("file://") {
            normalizedSrc = String(srcPath.dropFirst("file://".count))
        } else {
            normalizedSrc = srcPath
        }
        let srcURL = URL(fileURLWithPath: normalizedSrc)
        let dstURL = dir.appendingPathComponent("\(name).png")
        let tmpURL = dir.appendingPathComponent(".\(name).\(UUID().uuidString).tmp.png")

        do {
            if fm.fileExists(atPath: tmpURL.path) {
                try fm.removeItem(at: tmpURL)
            }
            try fm.copyItem(at: srcURL, to: tmpURL)
            let attrs = try fm.attributesOfItem(atPath: tmpURL.path)
            let bytes = (attrs[.size] as? NSNumber)?.intValue ?? 0
            if bytes <= 0 {
                throw NSError(domain: "WidgetReloadModule", code: 1001, userInfo: [
                    NSLocalizedDescriptionKey: "Temporary snapshot is empty"
                ])
            }

            if fm.fileExists(atPath: dstURL.path) {
                do {
                    _ = try fm.replaceItemAt(dstURL, withItemAt: tmpURL, backupItemName: nil, options: [.usingNewMetadataOnly])
                } catch {
                    try? fm.removeItem(at: dstURL)
                    try fm.moveItem(at: tmpURL, to: dstURL)
                }
            } else {
                try fm.moveItem(at: tmpURL, to: dstURL)
            }
            NSLog("[widget/ios] generated snapshot key=%@ path=%@ bytes=%d", name, dstURL.path, bytes)
            resolve(dstURL.path)
        } catch {
            try? fm.removeItem(at: tmpURL)
            reject("COPY_ERROR", "Failed to copy snapshot \(name): \(error.localizedDescription)", error)
        }
    }

    /// Returns the App Group container path for `widgets/<name>.png`. JS uses this to
    /// verify file existence before triggering a reload (defensive when the captureRef
    /// step fails silently).
    @objc func sharedImagePath(
        _ name: String,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        guard let containerURL = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: WidgetReloadModule.appGroupId
        ) else {
            resolve(NSNull())
            return
        }
        let path = containerURL
            .appendingPathComponent(WidgetReloadModule.widgetsDir, isDirectory: true)
            .appendingPathComponent("\(name).png")
            .path
        resolve(path)
    }

    /// Deletes old snapshot PNGs after a successful write. JS passes every
    /// still-active versioned basename; the widget extension only ever reads
    /// keys from SharedWidgetData.snapshotManifest.
    @objc func cleanupSharedImages(
        _ keepNames: [String],
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        guard let containerURL = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: WidgetReloadModule.appGroupId
        ) else {
            resolve(false)
            return
        }
        let fm = FileManager.default
        let dir = containerURL.appendingPathComponent(WidgetReloadModule.widgetsDir, isDirectory: true)
        let keep = Set(keepNames)
        do {
            let files = try fm.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil)
            for url in files where url.pathExtension == "png" {
                let key = url.deletingPathExtension().lastPathComponent
                if !keep.contains(key) {
                    try? fm.removeItem(at: url)
                }
            }
            NSLog("[widget/ios] cleanup kept %d snapshot(s)", keep.count)
            resolve(true)
        } catch {
            reject("CLEANUP_ERROR", "Failed to cleanup snapshots: \(error.localizedDescription)", error)
        }
    }

    /// Convenience: reloads all timelines after a batch of writeSharedImage calls.
    /// Identical to `reloadAllTimelines`; named for clarity at the call site.
    @objc func commitSharedImages(
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
