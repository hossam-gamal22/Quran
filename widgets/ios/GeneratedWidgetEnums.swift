// AUTO-GENERATED. Do not edit.
// Source: scripts/generate-widget-enum.mjs (mirrors lib/widgets/registry.ts).
//
// This file lists every widget id available to iOS App Intents. The runtime
// values (titles, anchors, premium flag) are loaded from the bundled
// widget-registry.json so we never have to recompile Swift to ship a tweak.

import Foundation
import AppIntents

/// Stable string keys for every iOS-shipped widget. Used as `iosKind` raw
/// values and as PNG basenames in the App Group container.
enum GeneratedWidgetID: String, CaseIterable {
    case daySimple = "daySimple"
    case dayThuluth = "dayThuluth"
    case dayDigital = "dayDigital"
    case monthSimple = "monthSimple"
    case monthThuluth = "monthThuluth"
    case prayerSingle = "prayerSingle"
    case prayerTable = "prayerTable"
    case prayerNextPrevious = "prayerNextPrevious"
    case verseOfDay = "verseOfDay"
    case azkarMorning = "azkarMorning"
    case azkarEvening = "azkarEvening"
    case dailyDhikr = "dailyDhikr"
    case hijriDate = "hijriDate"
}

/// Picker variants for the small widget. Filtered to widgets whose registry
/// `sizes` array contains this size — variants that don't ship at this size are
/// hidden from the iOS configuration picker entirely (no "Missing: …" placeholder).
enum RoohSmallKind: String, AppEnum {
    case placeholder
    case daySimple
    case dayThuluth
    case dayDigital
    case monthSimple
    case prayerSingle
    case prayerTable
    case verseOfDay
    case azkarMorning
    case azkarEvening
    case dailyDhikr
    case hijriDate

    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "الويدجت")
    static var caseDisplayRepresentations: [RoohSmallKind: DisplayRepresentation] = [
        .placeholder: "— اختر —",
        .daySimple: "اليوم",
        .dayThuluth: "اليوم ثلث",
        .dayDigital: "اليوم رقمي",
        .monthSimple: "الشهر",
        .prayerSingle: "الصلاة القادمة",
        .prayerTable: "جدول الصلاة",
        .verseOfDay: "🔒 آية اليوم",
        .azkarMorning: "🔒 أذكار الصباح",
        .azkarEvening: "🔒 أذكار المساء",
        .dailyDhikr: "🔒 الذكر اليومي",
        .hijriDate: "🔒 الهجري",
    ]
}

/// Picker variants for the medium widget. Filtered to widgets whose registry
/// `sizes` array contains this size — variants that don't ship at this size are
/// hidden from the iOS configuration picker entirely (no "Missing: …" placeholder).
enum RoohMediumKind: String, AppEnum {
    case placeholder
    case daySimple
    case dayThuluth
    case monthThuluth
    case prayerTable
    case prayerNextPrevious
    case verseOfDay
    case azkarMorning
    case azkarEvening
    case dailyDhikr
    case hijriDate

    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "الويدجت")
    static var caseDisplayRepresentations: [RoohMediumKind: DisplayRepresentation] = [
        .placeholder: "— اختر —",
        .daySimple: "اليوم",
        .dayThuluth: "🔒 اليوم ثلث",
        .monthThuluth: "🔒 الشهر ثلث",
        .prayerTable: "جدول الصلاة",
        .prayerNextPrevious: "الصلاة السابقة والقادمة",
        .verseOfDay: "🔒 آية اليوم",
        .azkarMorning: "🔒 أذكار الصباح",
        .azkarEvening: "🔒 أذكار المساء",
        .dailyDhikr: "🔒 الذكر اليومي",
        .hijriDate: "🔒 الهجري",
    ]
}

/// Picker variants for the large widget. Filtered to widgets whose registry
/// `sizes` array contains this size — variants that don't ship at this size are
/// hidden from the iOS configuration picker entirely (no "Missing: …" placeholder).
enum RoohLargeKind: String, AppEnum {
    case placeholder
    case prayerTable
    case verseOfDay

    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "الويدجت")
    static var caseDisplayRepresentations: [RoohLargeKind: DisplayRepresentation] = [
        .placeholder: "— اختر —",
        .prayerTable: "جدول الصلاة",
        .verseOfDay: "🔒 آية اليوم",
    ]
}
