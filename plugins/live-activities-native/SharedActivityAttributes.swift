// SharedActivityAttributes.swift
// Shared ActivityKit attributes definition — compiled into both main app and widget extension

import Foundation

#if canImport(ActivityKit)
import ActivityKit

struct PrayerActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var nextPrayerName: String
        var nextPrayerNameAr: String
        var nextPrayerTime: String
        var timeRemainingMinutes: Int
        var nextPrayerDate: Date  // absolute timestamp for Text(timerInterval:) live countdown
        var hijriDate: String
        var allPrayers: [PrayerItem]
        var style: String
        var duaText: String?
        var ayahText: String?
        var ayahRef: String?
        var sunriseTime: String?
    }

    struct PrayerItem: Codable, Hashable {
        var name: String
        var nameAr: String
        var time: String
        var passed: Bool
    }
}
#endif
