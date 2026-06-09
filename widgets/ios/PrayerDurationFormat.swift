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
    ///
    /// `roundUpMinutes` rounds a partial minute UP — used for "until next prayer"
    /// so the value matches the wall-clock minute difference (8:06 → 8:30 reads
    /// 24 د, not 23). Elapsed ("since") timers keep flooring.
    static func compact(seconds: Int, language: String, roundUpMinutes: Bool = false) -> String {
        let total = max(0, seconds)
        let isArabic = (language == "ar")
        if total < 60 {
            return isArabic ? "\(total) ث" : "\(total)S"
        }
        let totalMinutes = roundUpMinutes ? (total + 59) / 60 : total / 60
        if totalMinutes < 60 {
            return isArabic ? "\(totalMinutes) د" : "\(totalMinutes)M"
        }
        let hours = totalMinutes / 60
        let minutes = totalMinutes % 60
        // \u{2002} (EN SPACE) = wider gap after «س», matching the JS twin's SIN_MINUTE_GAP.
        return isArabic
            ? "\(hours) س\u{2002}\(minutes) د"
            : "\(hours)H \(minutes)M"
    }

    /// `target − now` formatted compactly. Negative deltas clamp to 0.
    /// The prayer epoch is truncated to the minute first (rows show HH:MM, not
    /// seconds) so the shown value matches the wall-clock HH:MM difference.
    static func until(_ target: Date, from now: Date, language: String) -> String {
        let targetMin = Date(timeIntervalSince1970: (target.timeIntervalSince1970 / 60).rounded(.down) * 60)
        let secs = Int(targetMin.timeIntervalSince(now))
        return compact(seconds: secs, language: language, roundUpMinutes: true)
    }

    /// `now − past` formatted compactly. Negative deltas clamp to 0.
    /// The prayer epoch is truncated to the minute so «منذ» matches the
    /// displayed HH:MM difference (4:33 vs Fajr 4:11 → «منذ ٢٢ د», not 21).
    static func since(_ past: Date, from now: Date, language: String) -> String {
        let pastMin = Date(timeIntervalSince1970: (past.timeIntervalSince1970 / 60).rounded(.down) * 60)
        let secs = Int(now.timeIntervalSince(pastMin))
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
