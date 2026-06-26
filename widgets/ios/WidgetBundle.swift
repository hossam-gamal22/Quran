// widgets/ios/WidgetBundle.swift
// روح المسلم — Glassify-style configurable widgets

import WidgetKit
import SwiftUI

@main
struct RoohMuslimWidgetBundle: WidgetBundle {
    var body: some Widget {
        // Home Screen: 3 size-grouped entries. After adding one, the user picks
        // the specific kind via Edit Widget → Widget (per Phase 4 Glassify UX).
        RoohSmallWidget()
        RoohMediumWidget()
        RoohLargeWidget()
        // Lock Screen widgets — independent of the size-grouped flow.
        RoohLockDayThuluthWidget()
        RoohLockMonthThuluthWidget()
        RoohLockNextPrayerWidget()
        RoohLockAllPrayersWidget()
        RoohLockHijriCircularWidget()
        RoohLockNextPrayerCountdownWidget()
        PrayerLiveActivity()
        if #available(iOS 18.0, *) {
            MorningAzkarControl()
            EveningAzkarControl()
            SleepAzkarControl()
            WakeupAzkarControl()
            AfterPrayerAzkarControl()
            PrayerTimesControl()
            QiblaControl()
            TasbihControl()
            HolyQuranControl()
            QuranBookmarksControl()
            MoreAzkarControl()
        }
    }
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3:
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(.sRGB, red: Double(r) / 255, green: Double(g) / 255, blue: Double(b) / 255, opacity: Double(a) / 255)
    }
}

struct WidgetConstants {
    static let appGroupId = "group.com.rooh.almuslim"
    static let sharedDataFile = "widget_data.json"
}

/// Minimal probe for comparing payload freshness across the two stores.
/// `prayer.lastUpdated` is an ISO-8601 string written on every payload build,
/// so lexicographic comparison orders payloads chronologically.
private struct SharedDataFreshnessProbe: Codable {
    struct PrayerProbe: Codable { var lastUpdated: String? }
    var prayer: PrayerProbe?
}

private func sharedPayloadTimestamp(_ data: Data) -> String {
    (try? JSONDecoder().decode(SharedDataFreshnessProbe.self, from: data))?.prayer?.lastUpdated ?? ""
}

func loadSharedRawData() -> Data? {
    var defaultsData: Data? = nil
    if let userDefaults = UserDefaults(suiteName: WidgetConstants.appGroupId),
       let jsonString = userDefaults.string(forKey: "widget_shared_data"),
       let data = jsonString.data(using: .utf8) {
        defaultsData = data
    }

    var fileData: Data? = nil
    if let containerURL = FileManager.default.containerURL(
        forSecurityApplicationGroupIdentifier: WidgetConstants.appGroupId
    ) {
        let fileURL = containerURL.appendingPathComponent(WidgetConstants.sharedDataFile)
        fileData = try? Data(contentsOf: fileURL)
    }

    // The app writes UserDefaults first, then the fallback file. If the
    // UserDefaults write failed (observed on some devices), the file holds the
    // fresher payload — prefer whichever timestamps newer instead of letting a
    // stale UserDefaults copy permanently shadow the fallback file.
    switch (defaultsData, fileData) {
    case (let d?, nil): return d
    case (nil, let f?): return f
    case (nil, nil): return nil
    case (let d?, let f?):
        return sharedPayloadTimestamp(f) > sharedPayloadTimestamp(d) ? f : d
    }
}

func loadSharedData<T: Codable>(_ type: T.Type) -> T? {
    guard let data = loadSharedRawData() else { return nil }
    return try? JSONDecoder().decode(type, from: data)
}
