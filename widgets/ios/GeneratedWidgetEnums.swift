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
///
/// Display labels are sourced from `widgets/ios/Localizable.xcstrings` and
/// resolve at picker-render time against the widget extension bundle's
/// preferred localization (which follows iOS Settings → preferred language).
enum RoohSmallKind: String, AppEnum {
    case placeholder
    case daySimple
    case dayThuluth
    case dayDigital
    case monthSimple
    case prayerSingle
    case prayerTable
    case hijriDate

    static var typeDisplayRepresentation = TypeDisplayRepresentation(
        name: LocalizedStringResource("widget.picker.title", defaultValue: "Widget")
    )
    static var caseDisplayRepresentations: [RoohSmallKind: DisplayRepresentation] = [
        .placeholder: DisplayRepresentation(
            title: LocalizedStringResource("widget.picker.placeholder", defaultValue: "Choose")
        ),
        .daySimple: DisplayRepresentation(
            title: LocalizedStringResource("widget.kind.daySimple", defaultValue: "Today")
        ),
        .dayThuluth: DisplayRepresentation(
            title: LocalizedStringResource("widget.kind.dayThuluth.free", defaultValue: "Today Thuluth")
        ),
        .dayDigital: DisplayRepresentation(
            title: LocalizedStringResource("widget.kind.dayDigital", defaultValue: "Digital Day")
        ),
        .monthSimple: DisplayRepresentation(
            title: LocalizedStringResource("widget.kind.monthSimple", defaultValue: "Month")
        ),
        .prayerSingle: DisplayRepresentation(
            title: LocalizedStringResource("widget.kind.prayerSingle", defaultValue: "Next Prayer")
        ),
        .prayerTable: DisplayRepresentation(
            title: LocalizedStringResource("widget.kind.prayerTable", defaultValue: "Prayer Table")
        ),
        .hijriDate: DisplayRepresentation(
            title: LocalizedStringResource("widget.kind.hijriDate.premium", defaultValue: "Hijri")
        ),
    ]
}

/// Picker variants for the medium widget. Filtered to widgets whose registry
/// `sizes` array contains this size — variants that don't ship at this size are
/// hidden from the iOS configuration picker entirely (no "Missing: …" placeholder).
///
/// Display labels are sourced from `widgets/ios/Localizable.xcstrings` and
/// resolve at picker-render time against the widget extension bundle's
/// preferred localization (which follows iOS Settings → preferred language).
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

    static var typeDisplayRepresentation = TypeDisplayRepresentation(
        name: LocalizedStringResource("widget.picker.title", defaultValue: "Widget")
    )
    static var caseDisplayRepresentations: [RoohMediumKind: DisplayRepresentation] = [
        .placeholder: DisplayRepresentation(
            title: LocalizedStringResource("widget.picker.placeholder", defaultValue: "Choose")
        ),
        .daySimple: DisplayRepresentation(
            title: LocalizedStringResource("widget.kind.daySimple", defaultValue: "Today")
        ),
        .dayThuluth: DisplayRepresentation(
            title: LocalizedStringResource("widget.kind.dayThuluth.premium", defaultValue: "🔒 Today Thuluth")
        ),
        .monthThuluth: DisplayRepresentation(
            title: LocalizedStringResource("widget.kind.monthThuluth.premium", defaultValue: "🔒 Month Thuluth")
        ),
        .prayerTable: DisplayRepresentation(
            title: LocalizedStringResource("widget.kind.prayerTable", defaultValue: "Prayer Table")
        ),
        .prayerNextPrevious: DisplayRepresentation(
            title: LocalizedStringResource("widget.kind.prayerNextPrevious", defaultValue: "Previous & Next Prayer")
        ),
        .verseOfDay: DisplayRepresentation(
            title: LocalizedStringResource("widget.kind.verseOfDay.premium", defaultValue: "🔒 Verse of the Day")
        ),
        .azkarMorning: DisplayRepresentation(
            title: LocalizedStringResource("widget.kind.azkarMorning.premium", defaultValue: "🔒 Morning Azkar")
        ),
        .azkarEvening: DisplayRepresentation(
            title: LocalizedStringResource("widget.kind.azkarEvening.premium", defaultValue: "🔒 Evening Azkar")
        ),
        .dailyDhikr: DisplayRepresentation(
            title: LocalizedStringResource("widget.kind.dailyDhikr.premium", defaultValue: "🔒 Daily Dhikr")
        ),
        .hijriDate: DisplayRepresentation(
            title: LocalizedStringResource("widget.kind.hijriDate.premium", defaultValue: "🔒 Hijri")
        ),
    ]
}

/// Picker variants for the large widget. Filtered to widgets whose registry
/// `sizes` array contains this size — variants that don't ship at this size are
/// hidden from the iOS configuration picker entirely (no "Missing: …" placeholder).
///
/// Display labels are sourced from `widgets/ios/Localizable.xcstrings` and
/// resolve at picker-render time against the widget extension bundle's
/// preferred localization (which follows iOS Settings → preferred language).
enum RoohLargeKind: String, AppEnum {
    case placeholder
    case prayerTable

    static var typeDisplayRepresentation = TypeDisplayRepresentation(
        name: LocalizedStringResource("widget.picker.title", defaultValue: "Widget")
    )
    static var caseDisplayRepresentations: [RoohLargeKind: DisplayRepresentation] = [
        .placeholder: DisplayRepresentation(
            title: LocalizedStringResource("widget.picker.placeholder", defaultValue: "Choose")
        ),
        .prayerTable: DisplayRepresentation(
            title: LocalizedStringResource("widget.kind.prayerTable", defaultValue: "Prayer Table")
        ),
    ]
}
