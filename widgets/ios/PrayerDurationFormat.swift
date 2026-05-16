// PrayerDurationFormat.swift
//
// Swift twin of `lib/widget-format-duration.ts`. Both implementations must
// produce the same string for the same (seconds, language) input so the
// gallery preview, the baked PNG path, the Android headless task, and the
// iOS WidgetKit overlay all show identical countdown text.
//
// Format rules (HH:MM:SS is intentionally NOT supported):
//   English:
//     >= 1h         → "1H 52M"   (no space)
//     1m..<1h       → "52M"
//     <1m           → "50S"
//   Arabic:
//     >= 1h         → "1 س 52 د"  (space between value and unit)
//     1m..<1h       → "52 د"
//     <1m           → "50 ث"
//
// Replaces all `Text(date, style: .timer)` countdowns in prayer widgets.
// Because the formatted string is static between timeline entries, the
// TimelineProvider must emit entries frequently enough that the displayed
// minute value stays approximately correct (every prayer boundary +
// minute-resolution near the next prayer is the target — see prayer
// timeline generation in RoohWidgets.swift).

import Foundation

enum PrayerDurationFormat {
    /// Compact human duration. Negative inputs clamp to zero.
    static func compact(seconds: Int, language: String) -> String {
        let total = max(0, seconds)
        let isArabic = (language == "ar")
        if total < 60 {
            return isArabic ? "\(total) ث" : "\(total)S"
        }
        let totalMinutes = total / 60
        if totalMinutes < 60 {
            return isArabic ? "\(totalMinutes) د" : "\(totalMinutes)M"
        }
        let hours = totalMinutes / 60
        let minutes = totalMinutes % 60
        return isArabic
            ? "\(hours) س \(minutes) د"
            : "\(hours)H \(minutes)M"
    }

    /// `target − now` formatted compactly. Negative deltas clamp to 0.
    static func until(_ target: Date, from now: Date, language: String) -> String {
        let secs = Int(target.timeIntervalSince(now))
        return compact(seconds: secs, language: language)
    }

    /// `now − past` formatted compactly. Negative deltas clamp to 0.
    static func since(_ past: Date, from now: Date, language: String) -> String {
        let secs = Int(now.timeIntervalSince(past))
        return compact(seconds: secs, language: language)
    }

    /// Prefixed forms — e.g. "in 1H 52M" / "بعد 1 س 52 د" /
    /// "52M ago" / "منذ 52 د".
    static func untilWithPrefix(_ target: Date, from now: Date, language: String) -> String {
        let body = until(target, from: now, language: language)
        return language == "ar" ? "بعد \(body)" : "in \(body)"
    }

    static func sinceWithPrefix(_ past: Date, from now: Date, language: String) -> String {
        let body = since(past, from: now, language: language)
        return language == "ar" ? "منذ \(body)" : "\(body) ago"
    }
}
