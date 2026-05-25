// PrayerInputs.swift
// Single input contract read by the iOS widget extension for offline prayer
// calculation. Written by the main app on every settings/location change via
// lib/widget-data-bridge.ts → writePrayerInputs().
//
// Same shape as the JSON written to AsyncStorage on Android and consumed by
// lib/widget-prayer-calculator.ts (the JS counterpart used by the Android
// headless task). adhan-swift and adhan-js produce bit-identical math output
// for the same inputs.

import Foundation

/// AlAdhan numeric method ID, kept identical to the value the app already saves
/// in `prayer_settings.calculationMethod`.
enum CalculationMethodId: Int, Codable {
    case shia = 0
    case karachi = 1
    case isna = 2
    case mwl = 3
    case ummAlQura = 4
    case egyptian = 5
    case tehran = 7
    case gulf = 8
    case kuwait = 9
    case qatar = 10
    case singapore = 11
    case uoif = 12
    case turkey = 13
    case russia = 14
    case moonsighting = 15
    case dubai = 16
    case jakim = 17
    case tunisia = 18
    case algeria = 19
    case kemenag = 20
    case morocco = 21
    case lisbon = 22
    case jordan = 23
    case custom = 99
}

enum MadhabId: String, Codable {
    case shafi
    case hanafi
}

enum HighLatRuleId: String, Codable {
    case middleOfTheNight
    case seventhOfTheNight
    case twilightAngle
}

struct PrayerInputsAdjustments: Codable {
    let fajr: Int?
    let sunrise: Int?
    let dhuhr: Int?
    let asr: Int?
    let maghrib: Int?
    let isha: Int?
}

struct PrayerInputs: Codable {
    /// Schema version. Bumped when the shape changes incompatibly.
    let version: Int
    let latitude: Double
    let longitude: Double
    /// IANA timezone identifier, e.g. "Asia/Dubai".
    let timezone: String
    let calculationMethod: CalculationMethodId
    let madhab: MadhabId
    let highLatitudeRule: HighLatRuleId?
    let timeFormat: String      // "12h" | "24h"
    let numerals: String        // "western" | "arabic"
    let adjustments: PrayerInputsAdjustments?
    let writtenAt: String       // ISO 8601

    static let appGroup = "group.com.rooh.almuslim"
    static let userDefaultsKey = "widget_prayer_inputs"

    /// Read the inputs record from the App Group. Returns nil if missing or
    /// malformed — callers must fall back gracefully.
    static func read(from suite: String = appGroup) -> PrayerInputs? {
        guard let defaults = UserDefaults(suiteName: suite) else { return nil }
        // The JS bridge writes via SharedGroupPreferences which stores values
        // as plain strings (JSON-encoded). It may also be stored as Data.
        let json: Data?
        if let s = defaults.string(forKey: userDefaultsKey) {
            json = s.data(using: .utf8)
        } else if let d = defaults.data(forKey: userDefaultsKey) {
            json = d
        } else {
            json = nil
        }
        guard let data = json else { return nil }
        let decoder = JSONDecoder()
        return try? decoder.decode(PrayerInputs.self, from: data)
    }

    /// Convenience: returns `Locale` for the configured timezone, or
    /// `Locale.current` if the timezone isn't a recognized identifier.
    var resolvedTimeZone: TimeZone {
        TimeZone(identifier: timezone) ?? TimeZone.current
    }

    var usesArabicNumerals: Bool { numerals == "arabic" }
    var uses24HourClock: Bool { timeFormat == "24h" }
}

enum PrayerKey: String, Codable, CaseIterable {
    case fajr, sunrise, dhuhr, asr, maghrib, isha

    var arabicName: String {
        arabicName(on: Date())
    }

    func arabicName(on date: Date) -> String {
        if self == .dhuhr && Calendar(identifier: .gregorian).component(.weekday, from: date) == 6 {
            return "صلاة الجمعة"
        }
        switch self {
        case .fajr:    return "الفجر"
        case .sunrise: return "الشروق"
        case .dhuhr:   return "الظهر"
        case .asr:     return "العصر"
        case .maghrib: return "المغرب"
        case .isha:    return "العشاء"
        }
    }

    var englishName: String {
        englishName(on: Date())
    }

    func englishName(on date: Date) -> String {
        if self == .dhuhr && Calendar(identifier: .gregorian).component(.weekday, from: date) == 6 {
            return "Jumuah"
        }
        switch self {
        case .fajr:    return "Fajr"
        case .sunrise: return "Sunrise"
        case .dhuhr:   return "Dhuhr"
        case .asr:     return "Asr"
        case .maghrib: return "Maghrib"
        case .isha:    return "Isha"
        }
    }
}
