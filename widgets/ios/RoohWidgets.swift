// widgets/ios/RoohWidgets.swift
// Glassify-style configurable widgets for روح المسلم

import WidgetKit
import SwiftUI
import AppIntents
import Foundation

// MARK: - App Intent Enums
//
// All `LocalizedStringResource` lookups in this file default to the main
// bundle (no explicit `bundle:` parameter). Inside a widget extension target
// `Bundle.main` IS the extension's own bundle, which ships
// `Localizable.xcstrings` via the Resources build phase registered by
// `plugins/with-ios-widgets.js`. `appintentsmetadataprocessor` requires the
// main-bundle path — passing a custom `bundle:` breaks metadata extraction
// ("AppIntents requires 'LocalizedStringResource' to use the main bundle").

enum RoohLanguage: String, AppEnum {
    case auto, ar, en
    static var typeDisplayRepresentation = TypeDisplayRepresentation(
        name: LocalizedStringResource("widget.param.language", defaultValue: "Language")
    )
    static var caseDisplayRepresentations: [RoohLanguage: DisplayRepresentation] = [
        .auto: DisplayRepresentation(title: LocalizedStringResource("widget.param.auto", defaultValue: "Auto")),
        .ar: DisplayRepresentation(title: LocalizedStringResource("widget.param.language.ar", defaultValue: "العربية")),
        .en: DisplayRepresentation(title: LocalizedStringResource("widget.param.language.en", defaultValue: "English")),
    ]
}

enum RoohCalendar: String, AppEnum {
    case auto, gregorian, hijri
    static var typeDisplayRepresentation = TypeDisplayRepresentation(
        name: LocalizedStringResource("widget.param.calendar", defaultValue: "Calendar")
    )
    static var caseDisplayRepresentations: [RoohCalendar: DisplayRepresentation] = [
        .auto: DisplayRepresentation(title: LocalizedStringResource("widget.param.auto", defaultValue: "Auto")),
        .gregorian: DisplayRepresentation(title: LocalizedStringResource("widget.param.calendar.gregorian", defaultValue: "Gregorian")),
        .hijri: DisplayRepresentation(title: LocalizedStringResource("widget.param.calendar.hijri", defaultValue: "Hijri")),
    ]
}

enum RoohNumerals: String, AppEnum {
    case auto, latin, arabic
    static var typeDisplayRepresentation = TypeDisplayRepresentation(
        name: LocalizedStringResource("widget.param.numerals", defaultValue: "Numerals")
    )
    static var caseDisplayRepresentations: [RoohNumerals: DisplayRepresentation] = [
        .auto: DisplayRepresentation(title: LocalizedStringResource("widget.param.auto", defaultValue: "Auto")),
        .latin: DisplayRepresentation(title: LocalizedStringResource("widget.param.numerals.latin", defaultValue: "123")),
        .arabic: DisplayRepresentation(title: LocalizedStringResource("widget.param.numerals.arabic", defaultValue: "١٢٣")),
    ]
}

enum RoohTheme: String, AppEnum {
    case auto, light, dark, olive, green, blue, desert, slate
    static var typeDisplayRepresentation = TypeDisplayRepresentation(
        name: LocalizedStringResource("widget.param.theme", defaultValue: "Theme")
    )
    static var caseDisplayRepresentations: [RoohTheme: DisplayRepresentation] = [
        .auto: DisplayRepresentation(title: LocalizedStringResource("widget.param.auto", defaultValue: "Auto")),
        .light: DisplayRepresentation(title: LocalizedStringResource("widget.param.theme.light", defaultValue: "Light")),
        .dark: DisplayRepresentation(title: LocalizedStringResource("widget.param.theme.dark", defaultValue: "Dark")),
        .olive: DisplayRepresentation(title: LocalizedStringResource("widget.param.theme.olive", defaultValue: "Olive")),
        .green: DisplayRepresentation(title: LocalizedStringResource("widget.param.theme.green", defaultValue: "Green")),
        .blue: DisplayRepresentation(title: LocalizedStringResource("widget.param.theme.blue", defaultValue: "Blue")),
        .desert: DisplayRepresentation(title: LocalizedStringResource("widget.param.theme.desert", defaultValue: "Desert")),
        .slate: DisplayRepresentation(title: LocalizedStringResource("widget.param.theme.slate", defaultValue: "Slate")),
    ]
}

// `RoohSmallKind`, `RoohMediumKind`, `RoohLargeKind` are generated from the
// shared widget registry in `widgets/ios/GeneratedWidgetEnums.swift`. The
// generator (`scripts/generate-widget-enum.mjs`) only emits cases for widgets
// whose registry `sizes` array contains the matching size, so unsupported
// variants no longer appear in the iOS configuration picker.

struct SmallWidgetIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = LocalizedStringResource(
        "widget.appearance.title",
        defaultValue: "Customize Widget"
    )
    static var description = IntentDescription(LocalizedStringResource(
        "widget.appearance.description",
        defaultValue: "Choose theme, calendar, numerals, and language"
    ))

    @Parameter(title: LocalizedStringResource("widget.picker.title", defaultValue: "Widget")) var widget: RoohSmallKind
    @Parameter(title: LocalizedStringResource("widget.param.language", defaultValue: "Language")) var language: RoohLanguage
    @Parameter(title: LocalizedStringResource("widget.param.calendar", defaultValue: "Calendar")) var calendar: RoohCalendar
    @Parameter(title: LocalizedStringResource("widget.param.numerals", defaultValue: "Numerals")) var numerals: RoohNumerals
    @Parameter(title: LocalizedStringResource("widget.param.theme", defaultValue: "Theme")) var theme: RoohTheme

    init() {
        widget = .placeholder
        language = .auto
        calendar = .auto
        numerals = .auto
        theme = .auto
    }
}

struct MediumWidgetIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = LocalizedStringResource(
        "widget.appearance.title",
        defaultValue: "Customize Widget"
    )
    static var description = IntentDescription(LocalizedStringResource(
        "widget.appearance.description",
        defaultValue: "Choose theme, calendar, numerals, and language"
    ))

    @Parameter(title: LocalizedStringResource("widget.picker.title", defaultValue: "Widget")) var widget: RoohMediumKind
    @Parameter(title: LocalizedStringResource("widget.param.language", defaultValue: "Language")) var language: RoohLanguage
    @Parameter(title: LocalizedStringResource("widget.param.calendar", defaultValue: "Calendar")) var calendar: RoohCalendar
    @Parameter(title: LocalizedStringResource("widget.param.numerals", defaultValue: "Numerals")) var numerals: RoohNumerals
    @Parameter(title: LocalizedStringResource("widget.param.theme", defaultValue: "Theme")) var theme: RoohTheme

    init() {
        widget = .placeholder
        language = .auto
        calendar = .auto
        numerals = .auto
        theme = .auto
    }
}

struct LargeWidgetIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = LocalizedStringResource(
        "widget.appearance.title",
        defaultValue: "Customize Widget"
    )
    static var description = IntentDescription(LocalizedStringResource(
        "widget.appearance.description",
        defaultValue: "Choose theme, calendar, numerals, and language"
    ))

    @Parameter(title: LocalizedStringResource("widget.picker.title", defaultValue: "Widget")) var widget: RoohLargeKind
    @Parameter(title: LocalizedStringResource("widget.param.language", defaultValue: "Language")) var language: RoohLanguage
    @Parameter(title: LocalizedStringResource("widget.param.calendar", defaultValue: "Calendar")) var calendar: RoohCalendar
    @Parameter(title: LocalizedStringResource("widget.param.numerals", defaultValue: "Numerals")) var numerals: RoohNumerals
    @Parameter(title: LocalizedStringResource("widget.param.theme", defaultValue: "Theme")) var theme: RoohTheme

    init() {
        widget = .placeholder
        language = .auto
        calendar = .auto
        numerals = .auto
        theme = .auto
    }
}

// MARK: - Shared Data Models

struct SharedWidgetData: Codable {
    var prayer: WidgetPrayerData?
    var azkar: WidgetAzkarData?
    var verse: VerseWidgetData?
    var dhikr: DhikrWidgetData?
    var language: String?
    /// Fallback widget settings written by the app's settings tab so that newly
    /// added widgets reflect the user's app-level choices without requiring Edit Widget.
    var widgetCalendar: String?
    var widgetDayCalendar: String?
    var widgetMonthCalendar: String?
    var widgetNumerals: String?
    var widgetTheme: String?
    var widgetLanguage: String?
    var widgetDateFormat: String?
    var widgetFontVariant: String?
    /// User's moon-sighting Hijri offset in days (typically -2 … +2). Widget
    /// date views shift `context.date` by this amount before computing
    /// islamicUmmAlQura components, keeping the home-screen Hijri date in
    /// sync with the in-app Hijri calendar. Default `nil` (treated as 0) so
    /// existing memberwise callers compile unchanged.
    var hijriOffset: Int? = nil
    /// 365-ayah rolling verse pool the home-screen verse widget cycles
    /// through (one per day). Generated by `lib/verse-pool.ts` and
    /// rolled forward on app open. When this is nil the widget
    /// falls back to the 7-entry `BundledDailyAyahs`.
    var versePool: VerseWidgetPool? = nil
    var isPremium: Bool?
    var snapshotVersion: Int?
    var snapshotUpdatedAt: String?
    var snapshotManifest: [String: WidgetSnapshotManifestEntry]?
}

struct VerseWidgetPool: Codable {
    var entries: [VersePoolEntry]
    var seedDayOfYear: Int
    var seedYear: Int
    var generatedAt: String?
}

struct VersePoolEntry: Codable {
    var arabic: String
    var surahName: String
    var surahNumber: Int
    var ayahNumber: Int
    /// English translation (Saheeh International). Rendered as the body when
    /// the widget language is English. Falls back to Arabic when missing.
    var translation: String? = nil
    /// Romanized surah name (e.g. "Az-Zukhruf"). Rendered in place of the
    /// cleaned Arabic name when the widget language is English.
    var englishSurahName: String? = nil
}

struct WidgetSnapshotManifestEntry: Codable {
    var routeKey: String?
    var key: String?
    var path: String?
    var hash: String?
    var id: String?
    var size: String?
    var theme: String?
    var updatedAt: String?
    /// Captured-frame dimensions in dp; anchor rects are relative to this.
    var capturedWidth: Double?
    var capturedHeight: Double?
    /// Dynamic-text regions the native widget overlays on top of the PNG.
    /// When nil/empty, the legacy hand-typed `widgetOverlayAnchors` table
    /// in this file is used as a fallback. Once every preview emits anchors
    /// the legacy table can be deleted.
    var anchors: [WidgetManifestAnchor]?
}

/// One dynamic-text overlay region emitted by `<AnchorReporter>` in the
/// React preview and consumed by `WidgetImageView` to draw a live SwiftUI
/// Text at the exact gallery rect.
struct WidgetManifestAnchor: Codable {
    var id: String
    var x: Double
    var y: Double
    var width: Double
    var height: Double
    var fontFamily: String
    var fontSize: Double
    /// "regular" | "medium" | "semibold" | "bold"
    var fontWeight: String?
    /// hex color string (e.g. "#0f987f")
    var color: String?
    /// "leading" | "center" | "trailing"
    var alignment: String?
    /// "ltr" | "rtl"
    var direction: String?
    /// true when the live value is the compact-duration countdown.
    var isCountdown: Bool?
}

// MARK: - Bundled registry (widget-registry.json — generated from lib/widgets/registry.ts)

private struct RegistryDef: Codable {
    let id: String
    let sizes: [String]
    let isPremium: Bool
    let premiumSizes: [String]?
}

private func loadWidgetRegistryDict() -> [String: RegistryDef] {
    guard let url = Bundle.main.url(forResource: "widget-registry", withExtension: "json"),
          let data = try? Data(contentsOf: url),
          let arr = try? JSONDecoder().decode([RegistryDef].self, from: data)
    else { return compiledWidgetRegistryById }
    return Dictionary(uniqueKeysWithValues: arr.map { ($0.id, $0) })
}

/// Compile-time fallback for the Xcode extension target. If the bundled JSON is
/// ever missing from Copy Bundle Resources, the widget picker must still honor
/// the user's selected type instead of falling back to daySimple.
private let compiledWidgetRegistryById: [String: RegistryDef] = [
    "daySimple": RegistryDef(id: "daySimple", sizes: ["small", "medium"], isPremium: false, premiumSizes: nil),
    "dayThuluth": RegistryDef(id: "dayThuluth", sizes: ["small", "medium"], isPremium: false, premiumSizes: ["medium"]),
    "dayDigital": RegistryDef(id: "dayDigital", sizes: ["small"], isPremium: false, premiumSizes: nil),
    "monthSimple": RegistryDef(id: "monthSimple", sizes: ["small"], isPremium: false, premiumSizes: nil),
    "monthThuluth": RegistryDef(id: "monthThuluth", sizes: ["medium"], isPremium: true, premiumSizes: nil),
    "prayerSingle": RegistryDef(id: "prayerSingle", sizes: ["small"], isPremium: false, premiumSizes: nil),
    "prayerTable": RegistryDef(id: "prayerTable", sizes: ["small", "medium", "large"], isPremium: false, premiumSizes: nil),
    "prayerNextPrevious": RegistryDef(id: "prayerNextPrevious", sizes: ["medium"], isPremium: false, premiumSizes: nil),
    "verseOfDay": RegistryDef(id: "verseOfDay", sizes: ["small", "medium", "large"], isPremium: true, premiumSizes: nil),
    "azkarMorning": RegistryDef(id: "azkarMorning", sizes: ["small", "medium"], isPremium: true, premiumSizes: nil),
    "azkarEvening": RegistryDef(id: "azkarEvening", sizes: ["small", "medium"], isPremium: true, premiumSizes: nil),
    "dailyDhikr": RegistryDef(id: "dailyDhikr", sizes: ["small", "medium"], isPremium: true, premiumSizes: nil),
    "hijriDate": RegistryDef(id: "hijriDate", sizes: ["small", "medium"], isPremium: false, premiumSizes: ["medium"]),
]

private let widgetRegistryById: [String: RegistryDef] = loadWidgetRegistryDict()

private func familySizeLabel(_ family: WidgetFamily) -> String {
    switch family {
    case .systemSmall: return "small"
    case .systemMedium: return "medium"
    default: return "large"
    }
}

/// Premium gate for `(widgetId × WidgetFamily)` — mirrors TS `premiumRequiredForSize`.
private func registryPremiumRequired(widgetId: String, family: WidgetFamily) -> Bool {
    guard let def = widgetRegistryById[widgetId] else { return false }
    let sizeLabel = familySizeLabel(family)
    if let ps = def.premiumSizes, !ps.isEmpty {
        return ps.contains(sizeLabel)
    }
    return def.isPremium
}

/// True when the registry confirms this widget ships at the given family size.
/// Lets routers fall back to the "choose a type" placeholder for stale
/// placements whose stored configuration references a now-unsupported variant
/// (e.g. a medium slot still holding `dayDigital` from before the picker was
/// filtered) instead of rendering the `Missing: …` branded card.
private func registrySupportsSize(widgetId: String, family: WidgetFamily) -> Bool {
    guard let def = widgetRegistryById[widgetId] else { return false }
    return def.sizes.contains(familySizeLabel(family))
}

struct WidgetPrayerData: Codable {
    var nextPrayer: String?
    var nextPrayerName: String?
    var nextPrayerNameAr: String?
    var nextPrayerTime: String?
    var nextPrayerAtEpochMs: Double?
    var previousPrayerName: String?
    var previousPrayerNameAr: String?
    var previousPrayerAtEpochMs: Double?
    var calculationLocation: String?
    var timezone: String?
    var prayerDataUpdatedAt: String?
    var latitude: Double?
    var longitude: Double?
    var calculationMethod: Int?
    var madhab: Int?
    var source: String?
    var timeRemaining: String?
    var timeRemainingMinutes: Int?
    var allPrayers: [WidgetPrayerItem]?
    /// Flat sorted list of epoch timestamps for today + next 6 days.
    /// Used only for countdown / timeline calculations, not for display.
    var allPrayerEpochs: [Double]?
    var hijriDate: String?
    var hijriDay: Int?
    var hijriMonth: String?
    var hijriMonthEn: String?
    var hijriYear: Int?
    var gregorianDate: String?
    var location: String?
}

struct WidgetPrayerItem: Codable, Identifiable {
    var id: String { name ?? UUID().uuidString }
    var name: String?
    var nameAr: String?
    var time: String?
    var epochMs: Double?
    var isPassed: Bool?
    var isNext: Bool?
}

struct WidgetAzkarData: Codable {
    var randomZikr: WidgetZikr? = nil
    /// Pre-cached pool the widget cycles through to avoid feeling static.
    /// TimelineProvider picks one per entry by minute-of-day.
    var rotation: [WidgetZikr]? = nil
    var morningCompleted: Bool? = nil
    var eveningCompleted: Bool? = nil
}

struct WidgetZikr: Codable {
    var id: String? = nil
    var text: String? = nil
    var translation: String? = nil
    var count: Int? = nil
    var timesLabel: String? = nil
    var category: String? = nil
    var categoryName: String? = nil
    /// "When said" / virtue text from zikr.benefit.
    var benefit: String? = nil
    /// Source attribution (e.g. "رواه البخاري ٦٤٠٧").
    var reference: String? = nil
    /// True for Quranic recitation entries — view renders "قراءة سورة …".
    var isSurahRecitation: Bool? = nil
}

struct VerseWidgetData: Codable {
    var arabic: String? = nil
    var translation: String? = nil
    var surahName: String? = nil
    var surahNameEn: String? = nil
    var ayahNumber: Int? = nil
    var numberInSurah: Int? = nil
}

struct DhikrWidgetData: Codable {
    var arabic: String? = nil
    var translation: String? = nil
    var count: Int? = nil
    var benefit: String? = nil
    /// Source attribution from zikr.reference.
    var reference: String? = nil
    /// True for Quranic recitation entries.
    var isSurahRecitation: Bool? = nil
}

struct RoohEntry<Configuration: WidgetConfigurationIntent>: TimelineEntry {
    let date: Date
    let configuration: Configuration
    let data: SharedWidgetData
    /// `true` when `data` was decoded from real `SharedWidgetData` written by the
    /// app. `false` means the widget is rendering against `sampleSharedData()`
    /// because the user never opened the app — UI must show the "Open the app"
    /// instructions instead of the misleading sample contents (`--:--`, fake
    /// prayer times, fake hijri date, etc.).
    let hasRealData: Bool
}

/// Maximum timeline entries returned per `timeline(in:)` call. WidgetKit
/// supports ~300+ entries per request; we stay well below that and use
/// dedupe-by-minute + a hard `prefix(MAX_PRAYER_TIMELINE_ENTRIES)` cap to
/// guarantee a safe budget. The provider asks WidgetKit for another timeline
/// at the end of each minute-resolution window, so the compact countdown
/// remains current even when the app stays closed.
private let MAX_PRAYER_TIMELINE_ENTRIES = 100

/// Builds the prayer-widget timeline dates with minute-level refresh so the
/// compact countdown string ("1H 52M" / "52M" / "50S") stays current. The
/// compact formatter renders a STATIC string per entry, so every visible
/// minute needs its own entry.
///
/// Density rules:
///   • one entry every minute for the next 95 minutes or until next prayer
///   • every future prayer boundary across the 7-day cache
///   • midnight rollover for the next day
/// At the end of the 95-minute runway WidgetKit requests a fresh timeline,
/// which extends the runway without requiring the app process.
private func prayerTimelineDates(data: SharedWidgetData, now: Date = Date()) -> [Date] {
    let nowMs = now.timeIntervalSince1970 * 1000
    var dates: [Date] = [now]

    // ALWAYS prefer the app's canonical cache so the timeline boundaries
    // line up with the prayer times the user sees in the Prayer tab. The
    // offline calculator (PrayerCalculator) uses adhan-swift defaults that
    // can differ in Fajr/Isha angles from AlAdhan API even for the "same"
    // calculation method — using it as a primary source produces a visible
    // mismatch between widget and app. Calculator is only used to backfill
    // future boundaries when the app cache has none (very stale data).
    let appCache = (data.prayer?.allPrayerEpochs ?? []).filter { $0 > 0 }
    let appHasFuture = appCache.contains(where: { $0 > nowMs + 1000 })
    let epochSource: [Double]
    if appHasFuture {
        epochSource = appCache
    } else if !appCache.isEmpty, let calc = PrayerCalculator.loadFromAppGroup() {
        // Cache exists but is stale — keep its (past) entries and splice in
        // future ones from the calculator so timeline replanning has
        // something to schedule against without overriding what the app
        // already published.
        let cal = Calendar(identifier: .gregorian)
        let start = cal.startOfDay(for: now)
        let extra = calc.allPrayerEpochsMs(from: start, days: 9).map { Double($0) }
            .filter { $0 > nowMs + 1000 }
        epochSource = (appCache + extra).sorted()
    } else if let calc = PrayerCalculator.loadFromAppGroup() {
        let cal = Calendar(identifier: .gregorian)
        let start = cal.date(byAdding: .day, value: -1, to: now) ?? now
        epochSource = calc.allPrayerEpochsMs(from: start, days: 9).map { Double($0) }
    } else {
        epochSource = (data.prayer?.allPrayers ?? []).compactMap { $0.epochMs }
    }
    let futureEpochs = epochSource.filter { $0 > nowMs + 1000 }.sorted()

    // Resolve the next-prayer target for densification. Prefer the first
    // future entry from the 7-day list; otherwise the `nextPrayerAtEpochMs`
    // hint; otherwise a 6-hour-from-now fallback so the countdown still
    // updates while shared data is empty.
    let nextPrayerEpoch: Double? = futureEpochs.first
        ?? (data.prayer?.nextPrayerAtEpochMs.flatMap { $0 > nowMs + 1000 ? $0 : nil })
    let densificationEnd: Date = nextPrayerEpoch.map { Date(timeIntervalSince1970: $0 / 1000) }
        ?? now.addingTimeInterval(6 * 3600)

    let timeUntilEnd = densificationEnd.timeIntervalSince(now)
    if timeUntilEnd > 60 {
        let minutes = max(1, min(95, Int(ceil(timeUntilEnd / 60))))
        for minute in 1...minutes {
            dates.append(now.addingTimeInterval(TimeInterval(minute * 60)))
        }
    }

    // Every future prayer boundary inside the 7-day cache — gives a hard
    // refresh tick at exactly the moment the next/active prayer changes.
    dates.append(contentsOf: futureEpochs.map { Date(timeIntervalSince1970: $0 / 1000) })

    // Explicit nextPrayer hint, in case it sits between cache entries.
    if let nextPrayerAt = data.prayer?.nextPrayerAtEpochMs, nextPrayerAt > nowMs + 1000 {
        dates.append(Date(timeIntervalSince1970: nextPrayerAt / 1000))
    }

    // Midnight rollover so the date / hijri header refreshes at day-end.
    if let midnight = Calendar.current.nextDate(
        after: now,
        matching: DateComponents(hour: 0, minute: 0, second: 5),
        matchingPolicy: .nextTime
    ) {
        dates.append(midnight)
    }

    // Dedupe by minute-bucket to absorb the case where a 1-min densified
    // entry coincides with a prayer boundary. Then hard-cap so WidgetKit
    // never sees more than `MAX_PRAYER_TIMELINE_ENTRIES`.
    var seen = Set<Int>()
    return dates
        .sorted()
        .filter { date in
            let minuteBucket = Int(date.timeIntervalSince1970 / 60)
            if seen.contains(minuteBucket) { return false }
            seen.insert(minuteBucket)
            return true
        }
        .prefix(MAX_PRAYER_TIMELINE_ENTRIES)
        .map { $0 }
}

private func prayerTimelinePolicyDate(data: SharedWidgetData, now: Date = Date()) -> Date {
    let next = prayerTimelineDates(data: data, now: now).dropFirst().first
    return next ?? now.addingTimeInterval(3600)
}

// MARK: - Providers

struct SmallProvider: AppIntentTimelineProvider {
    // The widget gallery / picker preview always renders sample data so users
    // see a representative card. Real placements use `snapshot` / `timeline`
    // which check `sharedDataIfAvailable()` so we can switch to the
    // "Open the app first" instructions when no data has been written yet.
    func placeholder(in context: Context) -> RoohEntry<SmallWidgetIntent> {
        RoohEntry(date: Date(), configuration: SmallWidgetIntent(), data: sampleSharedDataForSystemLocale(), hasRealData: true)
    }

    func snapshot(for configuration: SmallWidgetIntent, in context: Context) async -> RoohEntry<SmallWidgetIntent> {
        // Widget gallery preview must always render real-looking content so users
        // can see what the widget does — never the "open the app" placeholder.
        if context.isPreview {
            return RoohEntry(date: Date(), configuration: configuration, data: sampleSharedDataForSystemLocale(), hasRealData: true)
        }
        let real = sharedDataIfAvailable()
        return RoohEntry(date: Date(), configuration: configuration, data: real ?? sampleSharedDataForSystemLocale(), hasRealData: real != nil)
    }

    func timeline(for configuration: SmallWidgetIntent, in context: Context) async -> Timeline<RoohEntry<SmallWidgetIntent>> {
        let real = sharedDataIfAvailable()
        let data = real ?? sampleSharedDataForSystemLocale()
        let now = Date()
        let entries = prayerTimelineDates(data: data, now: now).map {
            RoohEntry(date: $0, configuration: configuration, data: data, hasRealData: real != nil)
        }
        return Timeline(entries: entries, policy: .atEnd)
    }
}

struct MediumProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> RoohEntry<MediumWidgetIntent> {
        RoohEntry(date: Date(), configuration: MediumWidgetIntent(), data: sampleSharedDataForSystemLocale(), hasRealData: true)
    }

    func snapshot(for configuration: MediumWidgetIntent, in context: Context) async -> RoohEntry<MediumWidgetIntent> {
        if context.isPreview {
            return RoohEntry(date: Date(), configuration: configuration, data: sampleSharedDataForSystemLocale(), hasRealData: true)
        }
        let real = sharedDataIfAvailable()
        return RoohEntry(date: Date(), configuration: configuration, data: real ?? sampleSharedDataForSystemLocale(), hasRealData: real != nil)
    }

    func timeline(for configuration: MediumWidgetIntent, in context: Context) async -> Timeline<RoohEntry<MediumWidgetIntent>> {
        let real = sharedDataIfAvailable()
        let data = real ?? sampleSharedDataForSystemLocale()
        let now = Date()
        let entries = prayerTimelineDates(data: data, now: now).map {
            RoohEntry(date: $0, configuration: configuration, data: data, hasRealData: real != nil)
        }
        return Timeline(entries: entries, policy: .atEnd)
    }
}

struct LargeProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> RoohEntry<LargeWidgetIntent> {
        RoohEntry(date: Date(), configuration: LargeWidgetIntent(), data: sampleSharedDataForSystemLocale(), hasRealData: true)
    }

    func snapshot(for configuration: LargeWidgetIntent, in context: Context) async -> RoohEntry<LargeWidgetIntent> {
        if context.isPreview {
            return RoohEntry(date: Date(), configuration: configuration, data: sampleSharedDataForSystemLocale(), hasRealData: true)
        }
        let real = sharedDataIfAvailable()
        return RoohEntry(date: Date(), configuration: configuration, data: real ?? sampleSharedDataForSystemLocale(), hasRealData: real != nil)
    }

    func timeline(for configuration: LargeWidgetIntent, in context: Context) async -> Timeline<RoohEntry<LargeWidgetIntent>> {
        let real = sharedDataIfAvailable()
        let data = real ?? sampleSharedDataForSystemLocale()
        let now = Date()
        let entries = prayerTimelineDates(data: data, now: now).map {
            RoohEntry(date: $0, configuration: configuration, data: data, hasRealData: real != nil)
        }
        return Timeline(entries: entries, policy: .atEnd)
    }
}

// MARK: - Appearance-only Intent (for fixed-type specific widgets)

/// Lets the user customise theme / numerals / calendar / language for a widget
/// whose type is already fixed (e.g. "اليوم" is always daySimple).
/// Using this intent surfaces "Edit Widget" on long-press without exposing a
/// widget-type picker — appearance only.
struct RoohWidgetAppearanceIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = LocalizedStringResource(
        "widget.appearance.title",
        defaultValue: "Customize Widget"
    )
    static var description = IntentDescription(LocalizedStringResource(
        "widget.appearance.description",
        defaultValue: "Choose theme, calendar, numerals, and language"
    ))

    @Parameter(title: LocalizedStringResource("widget.param.theme", defaultValue: "Theme")) var theme: RoohTheme
    @Parameter(title: LocalizedStringResource("widget.param.calendar", defaultValue: "Calendar")) var calendar: RoohCalendar
    @Parameter(title: LocalizedStringResource("widget.param.numerals", defaultValue: "Numerals")) var numerals: RoohNumerals
    @Parameter(title: LocalizedStringResource("widget.param.language", defaultValue: "Language")) var language: RoohLanguage

    init() { theme = .auto; calendar = .auto; numerals = .auto; language = .auto }
}

// MARK: - Static PNG Home Widgets

struct StaticRoohEntry: TimelineEntry {
    let date: Date
    let data: SharedWidgetData
    let hasRealData: Bool
    let widgetId: String
    let family: WidgetFamily
}

struct StaticHomeProvider: TimelineProvider {
    let widgetId: String
    let family: WidgetFamily

    func placeholder(in context: Context) -> StaticRoohEntry {
        StaticRoohEntry(date: Date(), data: sampleSharedData(), hasRealData: true, widgetId: widgetId, family: family)
    }

    func getSnapshot(in context: Context, completion: @escaping (StaticRoohEntry) -> Void) {
        if context.isPreview {
            completion(StaticRoohEntry(date: Date(), data: sampleSharedData(), hasRealData: true, widgetId: widgetId, family: family))
            return
        }
        let real = sharedDataIfAvailable()
        completion(StaticRoohEntry(date: Date(), data: real ?? sampleSharedData(), hasRealData: real != nil, widgetId: widgetId, family: family))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<StaticRoohEntry>) -> Void) {
        let now = Date()
        let real = sharedDataIfAvailable()
        let data = real ?? sampleSharedData()
        let entries = prayerTimelineDates(data: data, now: now).map { date in
            StaticRoohEntry(
                date: date,
                data: data,
                hasRealData: real != nil,
                widgetId: widgetId,
                family: family
            )
        }
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

/// AppIntentTimelineProvider counterpart of StaticHomeProvider.
/// Reads SharedWidgetData then overlays the user's per-widget intent choices
/// (theme / numerals / calendar / language) so each placed widget can be
/// customised independently via "Edit Widget" on long-press.
struct AppearanceIntentProvider: AppIntentTimelineProvider {
    typealias Intent = RoohWidgetAppearanceIntent
    typealias Entry = StaticRoohEntry

    let widgetId: String
    let family: WidgetFamily

    func placeholder(in context: Context) -> StaticRoohEntry {
        StaticRoohEntry(date: Date(), data: sampleSharedData(), hasRealData: true, widgetId: widgetId, family: family)
    }

    func snapshot(for configuration: RoohWidgetAppearanceIntent, in context: Context) async -> StaticRoohEntry {
        if context.isPreview {
            var sample = sampleSharedData()
            applyIntent(configuration, to: &sample)
            return StaticRoohEntry(date: Date(), data: sample, hasRealData: true, widgetId: widgetId, family: family)
        }
        let real = sharedDataIfAvailable()
        var data = real ?? sampleSharedData()
        applyIntent(configuration, to: &data)
        return StaticRoohEntry(date: Date(), data: data, hasRealData: real != nil, widgetId: widgetId, family: family)
    }

    func timeline(for configuration: RoohWidgetAppearanceIntent, in context: Context) async -> Timeline<StaticRoohEntry> {
        let real = sharedDataIfAvailable()
        var data = real ?? sampleSharedData()
        applyIntent(configuration, to: &data)
        let now = Date()
        let entries = prayerTimelineDates(data: data, now: now).map { date in
            StaticRoohEntry(date: date, data: data, hasRealData: real != nil, widgetId: widgetId, family: family)
        }
        return Timeline(entries: entries, policy: .atEnd)
    }

    private func applyIntent(_ intent: RoohWidgetAppearanceIntent, to data: inout SharedWidgetData) {
        if intent.theme != .auto    { data.widgetTheme    = intent.theme.rawValue }
        if intent.calendar != .auto { data.widgetCalendar = intent.calendar.rawValue
                                      data.widgetDayCalendar   = intent.calendar.rawValue
                                      data.widgetMonthCalendar = intent.calendar.rawValue }
        if intent.numerals != .auto { data.widgetNumerals = intent.numerals == .arabic ? "arabic" : "western" }
        if intent.language != .auto { data.widgetLanguage = intent.language.rawValue }
    }
}

struct StaticHomeSnapshotView: View {
    let entry: StaticRoohEntry
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        let appTheme = themeFromString(entry.data.widgetTheme ?? "auto")
        let resolvedTheme = resolvedRoohTheme(appTheme, colorScheme: colorScheme)
        let bg = palette(resolvedTheme).background
        let _ = NSLog("[WidgetTheme] native iOS background selected=%@ resolved=%@ background=%@", entry.data.widgetTheme ?? "auto", resolvedThemeString(resolvedTheme), "\(bg)")
        let c = WidgetContext(
            date: entry.date,
            language: .auto,
            calendar: .auto,
            numerals: .auto,
            theme: resolvedTheme,
            data: entry.data,
            hasRealData: entry.hasRealData
        )
        let paid = entry.data.isPremium == true
        Group {
            if !paid && registryPremiumRequired(widgetId: entry.widgetId, family: entry.family) {
                PremiumLockedView(context: c)
                    .widgetURL(URL(string: "rooh-almuslim://subscription"))
            } else {
                WidgetImageView(widgetId: entry.widgetId, family: entry.family, context: c)
            }
        }
        .containerBackground(for: .widget) {
            Rectangle().fill(bg)
        }
    }
}

private func staticHomeConfiguration(
    kind: String,
    displayName: String,
    widgetDescription: String,
    widgetId: String,
    family: WidgetFamily
) -> some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: StaticHomeProvider(widgetId: widgetId, family: family)) { entry in
        StaticHomeSnapshotView(entry: entry)
    }
    .configurationDisplayName(displayName)
    .description(widgetDescription)
    .supportedFamilies([family])
    .contentMarginsDisabled()
}

/// AppIntentConfiguration wrapper — identical to staticHomeConfiguration but
/// uses AppearanceIntentProvider so iOS shows "Edit Widget" on long-press.
/// The kind string is kept identical to the static version so existing user
/// placements survive the migration without resetting.
private func intentHomeConfiguration(
    kind: String,
    displayName: String,
    widgetDescription: String,
    widgetId: String,
    family: WidgetFamily
) -> some WidgetConfiguration {
    AppIntentConfiguration(
        kind: kind,
        intent: RoohWidgetAppearanceIntent.self,
        provider: AppearanceIntentProvider(widgetId: widgetId, family: family)
    ) { entry in
        StaticHomeSnapshotView(entry: entry)
    }
    .configurationDisplayName(displayName)
    .description(widgetDescription)
    .supportedFamilies([family])
    .contentMarginsDisabled()
}

// MARK: - Widgets

struct RoohSmallWidget: Widget {
    var body: some WidgetConfiguration {
        AppIntentConfiguration(
            kind: "RoohSmallWidget",
            intent: SmallWidgetIntent.self,
            provider: SmallProvider()
        ) { entry in
            SmallRouter(entry: entry)
        }
        .configurationDisplayName(LocalizedStringResource(
            "widget.size.small.name",
            defaultValue: "Small Widget"
        ))
        .description(LocalizedStringResource(
            "widget.size.small.description",
            defaultValue: "Add it, then long-press and pick a style."
        ))
        .supportedFamilies([.systemSmall])
        .contentMarginsDisabled()
    }
}

struct RoohMediumWidget: Widget {
    var body: some WidgetConfiguration {
        AppIntentConfiguration(
            kind: "RoohMediumWidget",
            intent: MediumWidgetIntent.self,
            provider: MediumProvider()
        ) { entry in
            MediumRouter(entry: entry)
        }
        .configurationDisplayName(LocalizedStringResource(
            "widget.size.medium.name",
            defaultValue: "Medium Widget"
        ))
        .description(LocalizedStringResource(
            "widget.size.medium.description",
            defaultValue: "Add it, then long-press and pick a style."
        ))
        .supportedFamilies([.systemMedium])
        .contentMarginsDisabled()
    }
}

struct RoohLargeWidget: Widget {
    var body: some WidgetConfiguration {
        AppIntentConfiguration(
            kind: "RoohLargeWidget",
            intent: LargeWidgetIntent.self,
            provider: LargeProvider()
        ) { entry in
            LargeRouter(entry: entry)
        }
        .configurationDisplayName(LocalizedStringResource(
            "widget.size.large.name",
            defaultValue: "Large Widget"
        ))
        .description(LocalizedStringResource(
            "widget.size.large.description",
            defaultValue: "Add it, then long-press and pick a style."
        ))
        .supportedFamilies([.systemLarge])
        .contentMarginsDisabled()
    }
}

// MARK: - (Legacy single-kind home widgets removed)
//
// Phase 4 collapses the iOS Add Widget gallery to 3 size-grouped entries
// (`RoohSmallWidget`, `RoohMediumWidget`, `RoohLargeWidget`) — see plan
// "Glassify-style size-grouped Add Widget UX". The previous per-kind structs
// (`RoohDaySimpleSmallWidget`, `RoohPrayerTableMediumWidget`, etc.) were
// removed from `WidgetBundle.body` and deleted here; users now pick the kind
// via Edit Widget → Widget on the size-grouped widget.

struct RoohLockDayThuluthWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "RoohLockDayThuluthWidget", provider: LockDayProvider()) { entry in
            LockDayThuluthView(date: entry.date)
        }
        .configurationDisplayName("اليوم ثلث")
        .description("اليوم بخط ثلث على شاشة القفل")
        .supportedFamilies([.accessoryRectangular])
    }
}

struct RoohLockMonthThuluthWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "RoohLockMonthThuluthWidget", provider: LockDayProvider()) { entry in
            LockMonthThuluthView(date: entry.date)
        }
        .configurationDisplayName("التاريخ الهجري")
        .description("اليوم والشهر والسنة الهجرية بخط الثلث على شاشة القفل")
        .supportedFamilies([.accessoryRectangular])
    }
}

struct LockDayEntry: TimelineEntry { let date: Date }
struct LockDayProvider: TimelineProvider {
    func placeholder(in context: Context) -> LockDayEntry { LockDayEntry(date: Date()) }
    func getSnapshot(in context: Context, completion: @escaping (LockDayEntry) -> Void) { completion(LockDayEntry(date: Date())) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<LockDayEntry>) -> Void) {
        let now = Date()
        var entries: [LockDayEntry] = [LockDayEntry(date: now)]
        // Add a midnight entry for each of the next 7 days so the widget
        // flips to the correct date at midnight without requiring an app open.
        let cal = Calendar.current
        for i in 0..<7 {
            let searchBase = now.addingTimeInterval(TimeInterval(i * 86400))
            if let midnight = cal.nextDate(
                after: searchBase,
                matching: DateComponents(hour: 0, minute: 0, second: 5),
                matchingPolicy: .nextTime
            ) {
                entries.append(LockDayEntry(date: midnight))
            }
        }
        // After 7 days, ask for a fresh timeline.
        completion(Timeline(entries: entries, policy: .after(now.addingTimeInterval(7 * 86400))))
    }
}

// Refresh every minute so the countdown ring stays accurate on the lock screen.
struct LockMinuteProvider: TimelineProvider {
    func placeholder(in context: Context) -> LockDayEntry { LockDayEntry(date: Date()) }
    func getSnapshot(in context: Context, completion: @escaping (LockDayEntry) -> Void) { completion(LockDayEntry(date: Date())) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<LockDayEntry>) -> Void) {
        // Reuse the home-screen densification so the lock-screen compact
        // countdown ("1H 52M" / "1 س 52 د") also refreshes at minute-level
        // near the next prayer. Falls back to a flat 30-minute window when
        // shared data is missing (same coverage as the previous hardcoded
        // 30-entry loop).
        let now = Date()
        let dates: [Date]
        if let shared = sharedDataIfAvailable() {
            dates = prayerTimelineDates(data: shared, now: now)
        } else {
            dates = (0..<30).map { now.addingTimeInterval(TimeInterval($0 * 60)) }
        }
        let entries = dates.map { LockDayEntry(date: $0) }
        let policyDate = dates.dropFirst().first ?? now.addingTimeInterval(30 * 60)
        completion(Timeline(entries: entries, policy: .after(policyDate)))
    }
}

struct RoohLockNextPrayerWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "RoohLockNextPrayerWidget", provider: LockMinuteProvider()) { entry in
            LockNextPrayerView(date: entry.date)
        }
        .configurationDisplayName("الصلاة القادمة")
        .description("اسم الصلاة القادمة ووقتها والعد التنازلي")
        .supportedFamilies([.accessoryRectangular, .accessoryInline])
    }
}

struct RoohLockAllPrayersWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "RoohLockAllPrayersWidget", provider: LockMinuteProvider()) { entry in
            LockAllPrayersView(date: entry.date)
        }
        .configurationDisplayName("مواقيت الصلاة")
        .description("جميع مواقيت الصلوات الخمس على شاشة القفل")
        .supportedFamilies([.accessoryRectangular])
    }
}

struct RoohLockHijriCircularWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "RoohLockHijriCircularWidget", provider: LockDayProvider()) { entry in
            LockHijriCircularView(date: entry.date)
        }
        .configurationDisplayName("التاريخ الهجري")
        .description("اليوم الهجري في دائرة على شاشة القفل")
        .supportedFamilies([.accessoryCircular])
    }
}

struct RoohLockNextPrayerCountdownWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "RoohLockNextPrayerCountdownWidget", provider: LockMinuteProvider()) { entry in
            LockNextPrayerCountdownView(date: entry.date)
        }
        .configurationDisplayName("عدّاد الصلاة القادمة")
        .description("عدّاد دائري للصلاة القادمة على شاشة القفل")
        .supportedFamilies([.accessoryCircular])
    }
}

// MARK: - Routers

// Phase C — routers delegate to `WidgetImageView`; premium uses widget-registry.json.

struct SmallRouter: View {
    let entry: RoohEntry<SmallWidgetIntent>
    @Environment(\.colorScheme) private var colorScheme
    var body: some View {
        // Resolved-theme contract (plan §"Resolved-theme contract"):
        // every consumer below reads from this single value so the native
        // background, PNG filename, foreground palette, and overlay text
        // colour can never disagree.
        let resolvedTheme = resolvedRoohTheme(entry.configuration.theme, colorScheme: colorScheme)
        let c = WidgetContext(date: entry.date, language: entry.configuration.language, calendar: entry.configuration.calendar, numerals: entry.configuration.numerals, theme: resolvedTheme, data: entry.data, hasRealData: entry.hasRealData)
        let paid = entry.data.isPremium == true
        Group {
            if entry.configuration.widget == .placeholder {
                PlaceholderInstructionsView(context: c, family: .systemSmall)
            } else {
                // Stale-placement guard: if the stored kind doesn't support this family
                // size (registry change after a user picked it), fall back to daySimple.
                let raw = entry.configuration.widget.rawValue
                let wid: String = registrySupportsSize(widgetId: raw, family: .systemSmall) ? raw : "daySimple"
                if !paid && registryPremiumRequired(widgetId: wid, family: .systemSmall) {
                    PremiumLockedView(context: c)
                        .widgetURL(URL(string: "rooh-almuslim://subscription"))
                } else {
                    WidgetImageView(widgetId: wid, family: .systemSmall, context: c)
                }
            }
        }
        .roohWidgetBackground(theme: resolvedTheme)
    }
}

struct MediumRouter: View {
    let entry: RoohEntry<MediumWidgetIntent>
    @Environment(\.colorScheme) private var colorScheme
    var body: some View {
        let resolvedTheme = resolvedRoohTheme(entry.configuration.theme, colorScheme: colorScheme)
        let c = WidgetContext(date: entry.date, language: entry.configuration.language, calendar: entry.configuration.calendar, numerals: entry.configuration.numerals, theme: resolvedTheme, data: entry.data, hasRealData: entry.hasRealData)
        let paid = entry.data.isPremium == true
        Group {
            if entry.configuration.widget == .placeholder {
                PlaceholderInstructionsView(context: c, family: .systemMedium)
            } else {
                let raw = entry.configuration.widget.rawValue
                let wid: String = registrySupportsSize(widgetId: raw, family: .systemMedium) ? raw : "daySimple"
                if !paid && registryPremiumRequired(widgetId: wid, family: .systemMedium) {
                    PremiumLockedView(context: c)
                        .widgetURL(URL(string: "rooh-almuslim://subscription"))
                } else {
                    WidgetImageView(widgetId: wid, family: .systemMedium, context: c)
                }
            }
        }
        .roohWidgetBackground(theme: resolvedTheme)
    }
}

struct LargeRouter: View {
    let entry: RoohEntry<LargeWidgetIntent>
    @Environment(\.colorScheme) private var colorScheme
    var body: some View {
        let resolvedTheme = resolvedRoohTheme(entry.configuration.theme, colorScheme: colorScheme)
        let c = WidgetContext(date: entry.date, language: entry.configuration.language, calendar: entry.configuration.calendar, numerals: entry.configuration.numerals, theme: resolvedTheme, data: entry.data, hasRealData: entry.hasRealData)
        let paid = entry.data.isPremium == true
        Group {
            if entry.configuration.widget == .placeholder {
                PlaceholderInstructionsView(context: c, family: .systemLarge)
            } else {
                let raw = entry.configuration.widget.rawValue
                let wid: String = registrySupportsSize(widgetId: raw, family: .systemLarge) ? raw : "prayerTable"
                if !paid && registryPremiumRequired(widgetId: wid, family: .systemLarge) {
                    PremiumLockedView(context: c)
                        .widgetURL(URL(string: "rooh-almuslim://subscription"))
                } else {
                    WidgetImageView(widgetId: wid, family: .systemLarge, context: c)
                }
            }
        }
        .roohWidgetBackground(theme: resolvedTheme)
    }
}

// MARK: - Placeholder Instructions View (Glassify-style)

/// Renders the "Long Press → Edit Widget → Choose Style" 3-step instruction
/// card the user sees BEFORE they pick a kind from the Edit Widget picker.
/// Localized via `context.isArabic` (widget-content language), with layout
/// direction flipped so the numbered list flows naturally in each script.
struct PlaceholderInstructionsView: View {
    let context: WidgetContext
    let family: WidgetFamily

    // App is Arabic-first: every placeholder string is shown in Arabic
    // regardless of the device's iOS Settings language. The widget gallery
    // and Edit Widget sheet should never display a mixed AR/EN UI.
    private let appName = "روح المسلم"
    private let steps = ["اضغط مطولًا", "تعديل الودجت", "اختر النمط"]

    private var palette: ThemePalette { Rooh.palette(context.theme) }

    var body: some View {
        let isCompact = family == .systemSmall
        VStack(alignment: .center, spacing: isCompact ? 6 : 10) {
            Text(appName)
                .font(.custom("Rubik-Bold", size: isCompact ? 16 : 20))
                .foregroundColor(palette.text)
                .lineLimit(1)
                .minimumScaleFactor(0.7)

            VStack(alignment: .leading, spacing: isCompact ? 4 : 8) {
                ForEach(Array(steps.enumerated()), id: \.offset) { idx, text in
                    stepRow(number: "\(idx + 1)", text: text, isCompact: isCompact)
                }
            }
        }
        .padding(isCompact ? 8 : 14)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .environment(\.layoutDirection, .rightToLeft)
    }

    @ViewBuilder
    private func stepRow(number: String, text: String, isCompact: Bool) -> some View {
        HStack(spacing: isCompact ? 6 : 10) {
            Text(number)
                .font(.custom("Rubik-Bold", size: isCompact ? 11 : 14))
                .foregroundColor(palette.text)
                .frame(width: isCompact ? 18 : 24, height: isCompact ? 18 : 24)
                .background(Circle().fill(palette.accent.opacity(0.18)))
            Text(text)
                .font(.custom("Rubik-Medium", size: isCompact ? 12 : 15))
                .foregroundColor(palette.text)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
        }
    }
}

private enum Rooh {
    static func palette(_ theme: RoohTheme) -> ThemePalette { RoohAlMuslimWidgets_palette(theme) }
}

// Forward-declared helper that delegates to the existing `palette(_:)` free
// function defined later in this file (after `ThemePalette`). Wrapping the
// call in a typed name keeps the placeholder view independent of the
// declaration order in the file.
private func RoohAlMuslimWidgets_palette(_ theme: RoohTheme) -> ThemePalette {
    palette(theme)
}

// MARK: - Context + Styling

struct WidgetContext {
    let date: Date
    let language: RoohLanguage
    let calendar: RoohCalendar
    let numerals: RoohNumerals
    let theme: RoohTheme
    let data: SharedWidgetData
    /// `false` when `data` is the `sampleSharedData()` fallback because the
    /// user has never opened the app (no JSON in the App Group container).
    /// Defaults to `true` so legacy callers (lock-screen views that always
    /// have *some* data, even if it's the sample) keep working.
    let hasRealData: Bool

    /// Build a context that prefers the per-widget intent values, but falls back to
    /// app-level shared settings when the intent is at its default ("auto" / .light).
    /// This way, picking a theme or language inside the app affects newly-added widgets
    /// without users having to enter Edit Widget every time.
    init(date: Date, language: RoohLanguage, calendar: RoohCalendar, numerals: RoohNumerals, theme: RoohTheme, data: SharedWidgetData, hasRealData: Bool = true) {
        self.date = date
        self.data = data
        self.hasRealData = hasRealData

        // 1. Language: auto → resolve from app settings, then fallback Arabic
        let resolvedLang: RoohLanguage
        if language == .auto {
            resolvedLang = RoohLanguage(rawValue: data.widgetLanguage ?? "auto") ?? .auto
        } else {
            resolvedLang = language
        }
        self.language = resolvedLang

        // Compute isArabic locally (can't use self.isArabic before all stored props are set)
        let isAr: Bool = {
            if resolvedLang == .ar { return true }
            if resolvedLang == .en { return false }
            return (data.language ?? "ar") == "ar"
        }()

        // 2. Calendar: auto → resolve from app settings, then fallback Arabic=hijri
        if calendar == .auto {
            if let raw = data.widgetCalendar, raw != "auto",
               let resolved = RoohCalendar(rawValue: raw), resolved != .auto {
                self.calendar = resolved
            } else {
                self.calendar = .hijri
            }
        } else {
            self.calendar = calendar
        }

        // 3. Numerals: auto → resolve from app settings
        if numerals == .auto {
            self.numerals = RoohNumerals(rawValue: data.widgetNumerals ?? "auto") ?? .auto
        } else {
            self.numerals = numerals
        }

        // 4. Theme: auto → resolve from app settings, then fallback to the same
        // light/cream visual style used by the in-app gallery.
        if theme == .auto {
            if let raw = data.widgetTheme, raw != "auto",
               let resolved = RoohTheme(rawValue: raw), resolved != .auto {
                self.theme = resolved
            } else {
                self.theme = .light
            }
        } else {
            self.theme = theme
        }
    }

    var isArabic: Bool {
        if language == .ar { return true }
        if language == .en { return false }
        return (data.language ?? "ar") == "ar"
    }

    var usesArabicNumerals: Bool {
        if numerals == .arabic { return true }
        if numerals == .latin { return false }
        return isArabic
    }

    /// Single source of truth: widgetCalendar. Both day and month widgets use the same value.
    var dayCalendar: RoohCalendar { calendar }
    var monthCalendar: RoohCalendar { calendar }

    /// Date format string from shared container (Glassify sample-style key).
    /// One of: "none" | "gregorian-ar" | "hijri-ar" | "gregorian-en" | "hijri-en".
    var dateFormatKey: String {
        return data.widgetDateFormat ?? "gregorian-ar"
    }

    /// Arabic calligraphy face for Day/Month Thuluth widgets + the prayer
    /// watermark. These are the **PostScript names** baked into the bundled
    /// TTFs (`assets/fonts/WidgetFont.ttf` = DecoType Thuluth 2 calligraphy,
    /// `WidgetFont2.ttf` = A Suls calligraphy). iOS registers fonts under
    /// their internal PostScript name regardless of filename, so calling
    /// `Font.custom("WidgetFont", ...)` from a widget extension fails
    /// silently and falls back to the system Arabic face — the names MUST
    /// be "DecoTypeThuluth2" / "ASuls" here, even though the bundled file
    /// is named WidgetFont.ttf. The RN gallery uses `fontFamily: 'WidgetFont'`
    /// because expo-font registers the file under that alias; iOS native
    /// has no equivalent alias mechanism.
    var arabicFontFamily: String {
        (data.widgetFontVariant == "widget2") ? "ASuls" : "DecoTypeThuluth2"
    }
}

/// User-selectable Arabic font for Date / Prayer / Hijri variants.
func arabicFont(_ context: WidgetContext, size: CGFloat) -> Font {
    .custom(context.arabicFontFamily, size: size)
}

/// Font for a watermark that's a single number (e.g. day-of-month). When the
/// user picked western numerals (29, 1447) the Arabic calligraphy faces
/// (DecoTypeThuluth2 / ASuls) render Latin digits awkwardly — switch to
/// Rubik-Bold so western digits look like clean modern numerals. Arabic-Indic
/// digits (٢٩, ١٤٤٧) keep the calligraphic face.
func watermarkNumberFont(_ context: WidgetContext, size: CGFloat) -> Font {
    if context.usesArabicNumerals {
        return .custom(context.arabicFontFamily, size: size)
    }
    return .custom("Rubik-Bold", size: size)
}

/// Locked ASuls (WidgetFont2) for Adhkar variants only.
func azkarFont(size: CGFloat) -> Font {
    .custom("ASuls", size: size)
}

/// Prayer names (Arabic + English) — Rubik bold (Glassify-style).
func prayerNameFont(size: CGFloat) -> Font {
    .custom("Rubik-Bold", size: size)
}

func lockRubik(size: CGFloat, weight: String = "Rubik-Bold") -> Font {
    .custom(weight, size: size)
}

struct ThemePalette {
    let background: Color
    let surface: Color
    let text: Color
    let muted: Color
    let accent: Color
    let isLight: Bool
}

/// Resolve `RoohTheme.auto` to the same light/cream style as the in-app
/// gallery. The home-screen widget must never recolor the generated PNG.
///
/// All four widget consumers — native containerBackground fill, PNG file
/// path, foreground palette inside the PNG, and live overlay text colour —
/// must call this so they never disagree (per plan §"Resolved‑theme contract").
func resolvedRoohTheme(_ theme: RoohTheme, colorScheme: ColorScheme?) -> RoohTheme {
    if theme == .auto {
        return .light
    }
    return theme
}

/// String form of a *resolved* theme (never `auto`) for PNG filenames.
/// Mirrors `lib/widgets/snapshot.ts` `RESOLVED_WIDGET_THEMES`.
func resolvedThemeString(_ theme: RoohTheme) -> String {
    switch theme {
    case .auto:    return "light"  // safety net — callers should resolve first (auto defaults to light)
    case .light:   return "light"
    case .dark:    return "dark"
    case .olive:   return "olive"
    case .green:   return "green"
    case .blue:    return "blue"
    case .desert:  return "desert"
    case .slate:   return "slate"
    }
}

/// Parse the `widgetTheme` string written into `SharedWidgetData` by the app
/// back into a `RoohTheme`. Unknown values fall through to `.auto` so the
/// resolver picks the right concrete sibling at render time.
func themeFromString(_ raw: String) -> RoohTheme {
    return RoohTheme(rawValue: raw) ?? .auto
}

func palette(_ theme: RoohTheme) -> ThemePalette {
    switch theme {
    case .auto:
        return ThemePalette(background: Color(hex: "#E3E0DB"), surface: Color.white.opacity(0.30), text: Color(hex: "#3A3A39"), muted: Color(hex: "#5E5E5C"), accent: Color(hex: "#3A3A39"), isLight: true)
    case .light:
        return ThemePalette(background: Color(hex: "#E3E0DB"), surface: Color.white.opacity(0.30), text: Color(hex: "#3A3A39"), muted: Color(hex: "#5E5E5C"), accent: Color(hex: "#3A3A39"), isLight: true)
    case .dark:
        return ThemePalette(background: Color(hex: "#373737"), surface: Color.white.opacity(0.12), text: .white, muted: .white.opacity(0.62), accent: .white, isLight: false)
    case .olive:
        return ThemePalette(background: Color(hex: "#293126"), surface: Color.white.opacity(0.12), text: Color(hex: "#F2F3E8"), muted: Color(hex: "#C7CBB8"), accent: Color(hex: "#D7E3A2"), isLight: false)
    case .green:
        return ThemePalette(background: Color(hex: "#0E3B2E"), surface: Color.white.opacity(0.10), text: Color(hex: "#E8F4EC"), muted: Color(hex: "#9EC4B0"), accent: Color(hex: "#34C68A"), isLight: false)
    case .blue:
        return ThemePalette(background: Color(hex: "#0F2B4D"), surface: Color.white.opacity(0.10), text: Color(hex: "#E2ECF8"), muted: Color(hex: "#94B2D0"), accent: Color(hex: "#5DA4F0"), isLight: false)
    case .desert:
        return ThemePalette(background: Color(hex: "#4C3523"), surface: Color.white.opacity(0.10), text: Color(hex: "#F1E2C8"), muted: Color(hex: "#C9AC85"), accent: Color(hex: "#D8B07A"), isLight: false)
    case .slate:
        return ThemePalette(background: Color(hex: "#2A2D31"), surface: Color.white.opacity(0.10), text: Color(hex: "#E5E8EC"), muted: Color(hex: "#A3ABB3"), accent: Color(hex: "#9AA8B5"), isLight: false)
    }
}

extension View {
    /// Paints the widget's themed background as a full‑bleed rectangle inside
    /// WidgetKit's container, so the resolved theme reaches the system corner
    /// mask without any inset or halo.
    ///
    /// The captured PNG that draws on top is now a transparent foreground
    /// (text, icons, inner panels only — see `GlassTile` capture branch on the
    /// React Native side), so this fill is the *only* root paint. When the
    /// user changes appearance via the iOS Edit Widget sheet, this background
    /// switches instantly because `theme` reads from `entry.configuration.theme`.
    /// The PNG that draws above also switches because `WidgetImageView` keys
    /// its file path by the same resolved theme.
    func roohWidgetBackground(theme: RoohTheme) -> some View {
        let p = palette(theme)
        return self.containerBackground(for: .widget) {
            Rectangle().fill(p.background)
        }
    }
}

// MARK: - Views

struct PremiumLockedView: View {
    let context: WidgetContext
    var body: some View {
        let p = palette(context.theme)
        let isAr = context.isArabic
        VStack(spacing: 6) {
            Image(systemName: "lock.fill")
                .font(.system(size: 28))
                .foregroundStyle(p.muted)
            Text(isAr ? "اشترك للوصول" : "Subscribe to unlock")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(p.text)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text(isAr ? "افتح التطبيق للاشتراك" : "Open app to subscribe")
                .font(.system(size: 11))
                .foregroundStyle(p.muted)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(14)
    }
}

struct EmptyPlaceholderView: View {
    let sizeName: String
    var body: some View {
        let shared = loadSharedData(SharedWidgetData.self) ?? sampleSharedData()
        let isAr: Bool = {
            if shared.widgetLanguage == "ar" { return true }
            if shared.widgetLanguage == "en" { return false }
            return (shared.language ?? "ar") == "ar"
        }()
        let p = palette(resolvedTheme(shared))
        return VStack(alignment: isAr ? .trailing : .leading, spacing: 10) {
            Text(sizeName)
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(p.text)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
            step(isAr ? "١" : "1", isAr ? "اضغط مطولاً" : "Long-press", isAr: isAr, p: p)
            step(isAr ? "٢" : "2", isAr ? "عدّل الويدجت" : "Edit widget", isAr: isAr, p: p)
            step(isAr ? "٣" : "3", isAr ? "اختر النوع" : "Choose type", isAr: isAr, p: p)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: isAr ? .trailing : .leading)
        .padding(14)
        .environment(\.layoutDirection, isAr ? .rightToLeft : .leftToRight)
    }

    func step(_ number: String, _ text: String, isAr: Bool, p: ThemePalette) -> some View {
        HStack(spacing: 8) {
            Text(number)
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(p.text)
                .frame(width: 22, height: 22)
                .background(Circle().fill(p.text.opacity(0.12)))
            Text(text)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(p.muted)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
        }
    }

    private func resolvedTheme(_ data: SharedWidgetData) -> RoohTheme {
        if let raw = data.widgetTheme, raw != "auto", let t = RoohTheme(rawValue: raw) {
            return t
        }
        return .dark
    }
}

// MARK: - "Open the app first" empty state
//
// When the user adds a widget BEFORE ever launching the app, the App Group
// container has no `widget_shared_data` and no `widget_data.json`, so every
// `loadSharedData(SharedWidgetData.self)` call returns nil. Historically the
// providers fell back to `sampleSharedData()` and rendered fake prayer times,
// fake hijri dates, and `--:--` countdowns — a confusing UX that some users
// mistook for their real data.
//
// `sharedDataIfAvailable()` is the single source of truth for "has the app
// ever written anything to the App Group?". Providers / lock-screen views
// branch on it and render `AppNotOpenedView` (home) or `LockAppNotOpenedView`
// (accessory families) when it returns nil.

/// Build a fresh `WidgetPrayerData` from the offline `PrayerCalculator`, or
/// return nil if `widget_prayer_inputs` isn't in the App Group yet. Used by
/// the lock-screen prayer views (and any other surface that wants prayer
/// times not dependent on a recent app open).
///
/// The output shape is intentionally identical to what `preparePrayerWidgetData`
/// writes from JS — `nextPrayer*`, `previousPrayer*`, `allPrayers[]`, and the
/// flat `allPrayerEpochs[]` — so existing reading code keeps working unchanged.
func buildFreshPrayerData(now: Date = Date()) -> WidgetPrayerData? {
    guard let calc = PrayerCalculator.loadFromAppGroup(),
          let state = calc.state(at: now),
          let today = calc.times(for: now) else { return nil }

    let order: [PrayerKey] = [.fajr, .sunrise, .dhuhr, .asr, .maghrib, .isha]
    let formatHHMM: (Date) -> String = { d in
        let comps = Calendar(identifier: .gregorian).dateComponents([.hour, .minute], from: d)
        return String(format: "%02d:%02d", comps.hour ?? 0, comps.minute ?? 0)
    }

    let items: [WidgetPrayerItem] = order.map { key in
        let prayerDate = today[key]
        return WidgetPrayerItem(
            name: key.englishName(on: prayerDate),
            nameAr: key.arabicName(on: prayerDate),
            time: formatHHMM(prayerDate),
            epochMs: prayerDate.timeIntervalSince1970 * 1000,
            isPassed: prayerDate <= now,
            isNext: key == state.next
        )
    }

    let epochs: [Double] = calc.allPrayerEpochsMs(from: now, days: 7).map { Double($0) }

    return WidgetPrayerData(
        nextPrayer: state.next.rawValue,
        nextPrayerName: state.next.englishName(on: state.nextAt),
        nextPrayerNameAr: state.next.arabicName(on: state.nextAt),
        nextPrayerTime: formatHHMM(state.nextAt),
        nextPrayerAtEpochMs: state.nextAt.timeIntervalSince1970 * 1000,
        previousPrayerName: state.previous.englishName(on: state.previousAt),
        previousPrayerNameAr: state.previous.arabicName(on: state.previousAt),
        previousPrayerAtEpochMs: state.previousAt.timeIntervalSince1970 * 1000,
        calculationLocation: nil,
        timezone: calc.inputs.timezone,
        prayerDataUpdatedAt: ISO8601DateFormatter().string(from: now),
        latitude: calc.inputs.latitude,
        longitude: calc.inputs.longitude,
        calculationMethod: calc.inputs.calculationMethod.rawValue,
        madhab: calc.inputs.madhab == .hanafi ? 1 : 0,
        source: "widget-local-adhan",
        timeRemaining: nil,
        timeRemainingMinutes: nil,
        allPrayers: items,
        allPrayerEpochs: epochs,
        hijriDate: nil,
        hijriDay: nil,
        hijriMonth: nil,
        hijriMonthEn: nil,
        hijriYear: nil,
        gregorianDate: nil,
        location: nil
    )
}

/// Variant of `sharedDataIfAvailable()` that prefers fresh prayer times
/// computed locally by `PrayerCalculator`. When `widget_prayer_inputs` is in
/// the App Group:
///   • If a cached SharedWidgetData exists, its `.prayer` is replaced with
///     the fresh data (everything else — verse, azkar, theme, etc. — is kept).
///   • If no cached SharedWidgetData exists yet, a minimal one is constructed
///     with just `.prayer` populated so lock-screen views can still render
///     without ever having seen a prior app launch's data write.
/// When the calculator isn't available (no inputs set), falls back to the
/// existing `sharedDataIfAvailable()` so behavior is identical to before.
func sharedDataWithFreshPrayer(now: Date = Date()) -> SharedWidgetData? {
    let fresh = buildFreshPrayerData(now: now)
    if let existing = sharedDataIfAvailable() {
        if let fresh = fresh {
            var copy = existing
            copy.prayer = fresh
            return copy
        }
        return existing
    }
    if let fresh = fresh {
        return SharedWidgetData(
            prayer: fresh,
            azkar: nil, verse: nil, dhikr: nil,
            language: nil,
            widgetCalendar: nil, widgetDayCalendar: nil, widgetMonthCalendar: nil,
            widgetNumerals: nil, widgetTheme: nil, widgetLanguage: nil,
            widgetDateFormat: nil, widgetFontVariant: nil,
            hijriOffset: nil,
            isPremium: nil,
            snapshotVersion: nil, snapshotUpdatedAt: nil, snapshotManifest: nil
        )
    }
    return nil
}

/// Returns the decoded `SharedWidgetData` only if the app has actually written
/// content to the App Group. A successfully-decoded but otherwise-empty
/// payload is treated as "missing" too — the app always writes at least one of
/// `prayer` / `azkar` / `verse` / `dhikr` / `widgetTheme` / `widgetLanguage`
/// on first launch (see `lib/widget-data-bridge.ts`), so an empty struct means
/// something is wrong upstream and we should still surface the instructions.
func sharedDataIfAvailable() -> SharedWidgetData? {
    guard let data = loadSharedRawData(),
          let decoded = try? JSONDecoder().decode(SharedWidgetData.self, from: data)
    else { return nil }
    if let prayer = decoded.prayer {
        NSLog("[PrayerCanonical] widget loaded snapshot nextPrayerAtEpochMs=%@ timezone=%@ method=%@ location=%@,%@ source=%@ prayerDataUpdatedAt=%@",
              prayer.nextPrayerAtEpochMs.map { String(format: "%.0f", $0) } ?? "n/a",
              prayer.timezone ?? "n/a",
              prayer.calculationMethod.map { String($0) } ?? "n/a",
              prayer.latitude.map { String(format: "%.5f", $0) } ?? "n/a",
              prayer.longitude.map { String(format: "%.5f", $0) } ?? "n/a",
              prayer.source ?? "n/a",
              prayer.prayerDataUpdatedAt ?? "n/a")
    }
    let hasAnyContent = decoded.prayer != nil
        || decoded.azkar != nil
        || decoded.verse != nil
        || decoded.dhikr != nil
        || decoded.widgetTheme != nil
        || decoded.widgetLanguage != nil
        || decoded.widgetCalendar != nil
        || decoded.widgetNumerals != nil
    return hasAnyContent ? decoded : nil
}

/// Best-effort detection of whether the device language is Arabic. Used as a
/// fallback when no `SharedWidgetData` has been written yet (so we can't read
/// `widgetLanguage` / `language`). Reads the user's preferred languages list
/// (which is what `Locale.current` reflects after iOS 16's locale overhaul)
/// rather than the deprecated `Locale.languageCode` so we don't ship a warning.
func widgetSystemIsArabic() -> Bool {
    if #available(iOS 16, *) {
        return Locale.current.language.languageCode?.identifier == "ar"
    }
    // iOS 14/15 fallback — `Locale.preferredLanguages` doesn't trigger the
    // iOS-16 deprecation warning that `Locale.current.languageCode` would.
    let first = Locale.preferredLanguages.first ?? "en"
    return first.hasPrefix("ar")
}

/// Picks Arabic vs English for the "Open the app" message.
/// Priority: shared `widgetLanguage` → shared `language` → system locale.
func appNotOpenedIsArabic(shared: SharedWidgetData?) -> Bool {
    if let raw = shared?.widgetLanguage {
        if raw == "ar" { return true }
        if raw == "en" { return false }
    }
    if let lang = shared?.language {
        if lang == "ar" { return true }
        if lang == "en" { return false }
    }
    return widgetSystemIsArabic()
}

/// Home-screen empty state shown when the widget is placed but the app has
/// never been opened, so `loadSharedRawData()` returns nil and there's no
/// PNG snapshot either. Replaces the misleading sample-data fallback that
/// used to render fake prayer times and `--:--`.
///
/// The container background (`.roohWidgetBackground`) is applied by the
/// router around this view, so we only paint the foreground content here.
struct AppNotOpenedView: View {
    let family: WidgetFamily
    let theme: RoohTheme

    var body: some View {
        let isAr = appNotOpenedIsArabic(shared: sharedDataIfAvailable())
        let p = palette(theme)
        let isSmall = family == .systemSmall
        VStack(spacing: isSmall ? 6 : 10) {
            Image(systemName: "iphone.gen3.badge.play")
                .font(.system(size: isSmall ? 26 : 32, weight: .regular))
                .foregroundStyle(p.text)
            Text(isAr ? "افتح تطبيق روح المسلم" : "Open Rooh Al Muslim")
                .font(.system(size: isSmall ? 12 : 14, weight: .semibold))
                .foregroundStyle(p.text)
                .multilineTextAlignment(.center)
                .lineLimit(2)
                .minimumScaleFactor(0.7)
            Text(isAr ? "حتى تظهر بيانات الويدجت" : "to load widget data")
                .font(.system(size: isSmall ? 10 : 11))
                .foregroundStyle(p.muted)
                .multilineTextAlignment(.center)
                .lineLimit(2)
                .minimumScaleFactor(0.7)
        }
        .padding(isSmall ? 12 : 16)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .environment(\.layoutDirection, isAr ? .rightToLeft : .leftToRight)
    }
}

/// Lock-screen accessory empty state. iOS tints accessory widgets, so we
/// stick to plain symbols + system fonts and let the system handle colour.
struct LockAppNotOpenedView: View {
    @Environment(\.widgetFamily) private var family

    var body: some View {
        let isAr = appNotOpenedIsArabic(shared: sharedDataIfAvailable())
        Group {
            switch family {
            case .accessoryCircular:
                ZStack {
                    AccessoryWidgetBackground()
                    Image(systemName: "iphone.gen3.badge.play")
                        .font(.system(size: 18, weight: .semibold))
                        .widgetAccentable()
                }
            case .accessoryInline:
                Text(isAr ? "افتح روح المسلم لتحميل البيانات" : "Open Rooh Al Muslim to load data")
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
            default:
                // accessoryRectangular and any future families
                HStack(spacing: 6) {
                    Image(systemName: "iphone.gen3.badge.play")
                        .font(.system(size: 16, weight: .semibold))
                        .widgetAccentable()
                    VStack(alignment: isAr ? .trailing : .leading, spacing: 2) {
                        Text(isAr ? "افتح تطبيق روح المسلم" : "Open Rooh Al Muslim")
                            .font(.system(size: 12, weight: .bold))
                            .lineLimit(1)
                            .minimumScaleFactor(0.6)
                        Text(isAr ? "لتحميل بيانات الويدجت" : "to load widget data")
                            .font(.system(size: 10))
                            .lineLimit(1)
                            .minimumScaleFactor(0.6)
                            .opacity(0.85)
                    }
                    Spacer(minLength: 0)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: isAr ? .trailing : .leading)
                .environment(\.layoutDirection, isAr ? .rightToLeft : .leftToRight)
            }
        }
        .containerBackground(for: .widget) { Color.clear }
    }
}

struct DaySimpleView: View {
    let context: WidgetContext
    let family: WidgetFamily
    var body: some View {
        let p = palette(context.theme)
        let cal = context.dayCalendar
        let isSmall = family == .systemSmall
        VStack(spacing: 0) {
            Text(weekdayName(context))
                .font(.custom("Rubik-Bold", size: isSmall ? 16 : 20))
                .foregroundStyle(p.text)
                .lineLimit(1)
            Text(formatNumber(dayNumberFor(context, cal: cal), context))
                .font(.custom("Rubik-Bold", size: isSmall ? 52 : 68))
                .minimumScaleFactor(0.5)
                .lineLimit(1)
                .foregroundStyle(p.text.opacity(0.94))
            Text(context.isArabic ? monthNameFor(context, cal: cal) : monthNameFor(context, cal: cal).uppercased())
                .font(.custom("Rubik-Medium", size: isSmall ? 14 : 18))
                .foregroundStyle(p.muted)
                .lineLimit(1)
        }
        .padding(isSmall ? 20 : 22)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct DayDigitalView: View {
    let context: WidgetContext
    var body: some View {
        let p = palette(context.theme)
        let cal = context.dayCalendar
        let subtitle: String = {
            if cal == .hijri && context.isArabic {
                return "\(formatNumber(dayNumberFor(context, cal: cal), context)) من \(monthNameFor(context, cal: cal)) \(formatNumber(yearNumberFor(context, cal: cal), context))"
            }
            return dayDigitalDateString(context)
        }()
        VStack(spacing: 10) {
            Text(formatTime(context.date, context))
                .font(.custom("Rubik-Bold", size: 44))
                .tracking(-1)
                .minimumScaleFactor(0.7)
                .foregroundStyle(p.text)
            Text(subtitle)
                .font(.custom("Rubik-Regular", size: 12))
                .lineLimit(1)
                .minimumScaleFactor(0.55)
                .foregroundStyle(p.muted)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(20)
    }
}

/// Returns the date subtitle for the Day Digital widget driven by the user's
/// `widgetDateFormat` choice (matches the Glassify dropdown samples).
func dayDigitalDateString(_ context: WidgetContext) -> String {
    let key = context.dateFormatKey
    let date = context.date
    let useArabicDigits = context.usesArabicNumerals
    func sample(_ d: String, _ m: String, _ y: String) -> String {
        let dd = useArabicDigits ? latinToArabicDigits(d) : d
        let mm = useArabicDigits ? latinToArabicDigits(m) : m
        let yy = useArabicDigits ? latinToArabicDigits(y) : y
        return "\(yy) / \(mm) / \(dd)"
    }
    let g = Calendar(identifier: .gregorian)
    let h = Calendar(identifier: .islamicUmmAlQura)
    // Apply the in-app Hijri offset to the Hijri components only — Gregorian
    // stays anchored to the live timestamp.
    let hijriDate = dateForCalendar(context, cal: .hijri)
    let gd = String(format: "%02d", g.component(.day, from: date))
    let gm = String(format: "%02d", g.component(.month, from: date))
    let gy = String(g.component(.year, from: date))
    let hd = String(format: "%02d", h.component(.day, from: hijriDate))
    let hm = String(format: "%02d", h.component(.month, from: hijriDate))
    let hy = String(h.component(.year, from: hijriDate))
    switch key {
    case "none": return ""
    case "gregorian-en": return "\(gd) / \(gm) / \(gy)"
    case "hijri-ar":     return sample(hd, hm, hy)
    case "hijri-en":     return "\(hd) / \(hm) / \(hy)"
    default:             return sample(gd, gm, gy)
    }
}

struct DayThuluthView: View {
    let context: WidgetContext
    let family: WidgetFamily
    var body: some View {
        let p = palette(context.theme)
        let cal = context.dayCalendar
        let dayNum = dayNumberFor(context, cal: cal)
        let wmStr = formatNumber(dayNum, context)
        let isSmall = family == .systemSmall
        // Compositional balance: the in-app gallery renders widgets as
        // thumbnails (smaller display size) so its 34/52 fs looks compact.
        // At native 155×155 home-screen size the same 34/52 fills almost
        // the entire tile and crowds the watermark. Shrink ~20% so the
        // home widget visually matches the gallery's whitespace ratio.
        let mainFs: CGFloat = isSmall ? 26 : 40
        let wmFs: CGFloat = isSmall ? 0 : 110
        // RN preview applies `paddingTop: Math.round(fs * 0.55)` to push
        // the Thuluth glyph down so it sits optically centered (the font's
        // baseline is high relative to its visual mass). Match that exactly.
        let optical: CGFloat = mainFs * 0.55
        ZStack {
            if !isSmall {
                Text(wmStr)
                    .font(watermarkNumberFont(context, size: wmFs))
                    .foregroundStyle(p.text.opacity(0.10))
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
            }
            Text(thuluthWeekdayName(context.date))
                .font(.custom(context.arabicFontFamily, size: mainFs))
                .minimumScaleFactor(0.75)
                .lineLimit(1)
                .foregroundStyle(p.text.opacity(0.92))
                .padding(.top, optical)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.horizontal, 8)
        .padding(.top, isSmall ? 14 : 18)
        .padding(.bottom, isSmall ? 6 : 8)
    }
}

struct MonthSimpleView: View {
    let context: WidgetContext
    var body: some View {
        let p = palette(context.theme)
        let cal = context.monthCalendar
        let isHijriArabic = context.isArabic && cal == .hijri
        let dayNum = dayNumberFor(context, cal: cal)
        let watermark = formatNumber(dayNum, context)
        let watermarkFill = p.isLight ? Color.black.opacity(0.10) : Color.white.opacity(0.10)
        ZStack {
            // Day-number watermark in the calligraphy face behind the main
            // content — matches `MonthSimplePreview` in
            // components/widgets/previews/index.tsx where an SvgText of the
            // same digit sits behind the month name.
            Text(watermark)
                .font(watermarkNumberFont(context, size: 90))
                .foregroundStyle(watermarkFill)
                .lineLimit(1)
                .minimumScaleFactor(0.5)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
                .allowsTightening(true)

            VStack(spacing: 2) {
                Text(monthNameFor(context, cal: cal))
                    .font(arabicFont(context, size: 44))
                    .minimumScaleFactor(0.45)
                    .lineLimit(1)
                    .padding(.vertical, 8)
                    .foregroundStyle(p.text.opacity(0.92))
                Text(
                    isHijriArabic
                        ? "\(formatNumber(dayNumberFor(context, cal: cal), context)) من \(monthNameFor(context, cal: cal)) \(formatNumber(yearNumberFor(context, cal: cal), context))"
                        : formatNumber(yearNumberFor(context, cal: cal), context)
                )
                    .font(.custom("Rubik-Medium", size: 14))
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                    .foregroundStyle(p.muted)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct MonthThuluthView: View {
    let context: WidgetContext
    let family: WidgetFamily
    var body: some View {
        let p = palette(context.theme)
        let cal = context.monthCalendar
        let label: String = {
            if cal == .hijri {
                return thuluthHijriMonthName(context.date)
            }
            let f = DateFormatter()
            f.locale = Locale(identifier: "ar")
            f.calendar = Calendar(identifier: .gregorian)
            f.dateFormat = "MMMM"
            return f.string(from: context.date)
        }()
        let dayNum = dayNumberFor(context, cal: cal)
        let wmStr = formatNumber(dayNum, context)
        let isSmall = family == .systemSmall
        // Same compositional shrink as DayThuluthView — gallery thumbnails
        // are displayed smaller than the native 155×155 home tile, so the
        // 34/52 px from the RN preview overpowers the watermark when
        // rendered at actual size. ~20% smaller restores the gallery's
        // visual breathing room.
        let mainFs: CGFloat = isSmall ? 26 : 40
        let wmFs: CGFloat = isSmall ? 54 : 110
        let optical: CGFloat = mainFs * 0.55
        ZStack {
            Text(wmStr)
                .font(watermarkNumberFont(context, size: wmFs))
                .foregroundStyle(p.text.opacity(0.10))
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
            Text(label)
                .font(.custom(context.arabicFontFamily, size: mainFs))
                .minimumScaleFactor(0.75)
                .lineLimit(1)
                .foregroundStyle(p.text.opacity(0.92))
                // Match RN's `paddingTop: Math.round(fs * 0.55)` so the
                // Thuluth glyph sits optically centered (font baseline
                // sits high relative to the visual glyph mass).
                .padding(.top, optical)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.horizontal, 10)
        .padding(.top, isSmall ? 14 : 18)
        .padding(.bottom, isSmall ? 6 : 8)
    }
}

/// Glassify-style "MAY 9" centered card. Always uses Latin English month + day, regardless of locale.
struct MonthElegantEnView: View {
    let context: WidgetContext
    var body: some View {
        let p = palette(context.theme)
        let cal = context.monthCalendar
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US")
        f.calendar = calendarFor(cal)
        f.dateFormat = "MMM d"
        let label = f.string(from: context.date).uppercased()
        return VStack {
            Text(label)
                .font(.system(size: 56, weight: .light, design: .serif))
                .tracking(2)
                .foregroundStyle(p.text)
                .lineLimit(1)
                .minimumScaleFactor(0.5)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(20)
    }
}

/// Mirrors `PrayerSimplePreview` in components/widgets/previews/index.tsx.
/// Layout: "Next Prayer" label (top), prayer name, combined "h:mm AM"-style
/// time string, countdown (bottom). Padding + font sizes match the RN preview
/// at 155×155 dp so the in-app gallery and the home-screen widget render
/// identically.
struct PrayerSingleView: View {
    let context: WidgetContext

    var body: some View {
        let p = palette(context.theme)
        let prayer = context.data.prayer
        let next = todaysNextPrayer(context)
        let name = context.isArabic
            ? (next.nameAr ?? prayer?.nextPrayerNameAr ?? "الفجر")
            : (next.name ?? prayer?.nextPrayerName ?? "Fajr")
        let timeStr = prayerTimeFromEpoch(next.epochMs, context)
        let timerDate = Date(timeIntervalSince1970: resolvedNextPrayerEpochMs(context) / 1000)

        VStack(spacing: 2) {
            Text(context.isArabic ? "الصلاة القادمة" : "Next Prayer")
                .font(.custom("Rubik-Medium", size: 11))
                .foregroundStyle(p.muted)
                .padding(.bottom, 2)
            Text(name)
                .font(prayerNameFont(size: 22))
                .foregroundStyle(p.text)
                .lineLimit(1)
            Text(timeStr)
                .font(.custom("Rubik-Bold", size: 42))
                .foregroundStyle(p.text)
                .kerning(-1)
                .minimumScaleFactor(0.7)
                .lineLimit(1)
                .padding(.top, 2)
            let durationSingle = PrayerDurationFormat.until(timerDate, from: context.date, language: context.isArabic ? "ar" : "en")
            // Just "بعد X" — the "الصلاة القادمة" header above already
            // sets context, so prefixing the duration with it would
            // produce "الصلاة القادمة … الصلاة القادمة بعد …" (visible
            // duplicate, doesn't match gallery preview).
            HStack(spacing: 3) {
                if context.isArabic {
                    Text("بعد")
                    Text(durationSingle)
                } else {
                    Text("in")
                    Text(durationSingle)
                }
            }
            .font(.custom("Rubik-Medium", size: 10))
            .foregroundStyle(p.muted)
            .lineLimit(1)
            .environment(\.locale, context.usesArabicNumerals ? Locale(identifier: "ar_EG") : Locale(identifier: "en_US_POSIX"))
            .environment(\.layoutDirection, context.isArabic ? .rightToLeft : .leftToRight)
            .padding(.top, 4)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(20)
    }
}

/// Mirrors `PrayerTablePreview` in components/widgets/previews/index.tsx so the
/// in-app gallery preview and the home-screen widget render identically.
struct PrayerTableView: View {
    let context: WidgetContext
    let family: WidgetFamily

    var body: some View {
        let p = palette(context.theme)
        let prayer = context.data.prayer
        // Phase D: derive today's six prayers from the 7-day flat epoch list so
        // the widget keeps showing correct times for 7+ days without an app open.
        let prayers = todaysPrayersFromContext(context)
        let next = prayers.first { $0.isNext ?? false } ?? todaysNextPrayer(context)
        // Slightly stronger contrast than the RN preview so the active-row
        // highlight survives iOS WidgetKit's auto-tinting and reads as a
        // clear "current next prayer" indicator at home-screen scale.
        let activeBg = p.isLight ? Color.black.opacity(0.10) : Color.white.opacity(0.16)

        Group {
            switch family {
            case .systemSmall:
                smallLayout(prayers: prayers, prayer: prayer, palette: p, activeBg: activeBg)
            case .systemLarge:
                largeLayout(prayers: prayers, prayer: prayer, next: next, palette: p, activeBg: activeBg)
            default:
                mediumLayout(prayers: prayers, prayer: prayer, next: next, palette: p, activeBg: activeBg)
            }
        }
        // Pin layout to LTR so list-on-left / hero-on-right matches the in-app gallery preview
        // regardless of device locale. Arabic glyphs still shape correctly within Text views.
        .environment(\.layoutDirection, .leftToRight)
    }

    // MARK: Small (compact list)
    @ViewBuilder
    private func smallLayout(prayers: [WidgetPrayerItem], prayer: WidgetPrayerData?, palette p: ThemePalette, activeBg: Color) -> some View {
        VStack(spacing: 0) {
            HStack {
                let timerDate = Date(timeIntervalSince1970: resolvedNextPrayerEpochMs(context) / 1000)
                let durationSm = PrayerDurationFormat.until(timerDate, from: context.date, language: context.isArabic ? "ar" : "en")
                Text(context.isArabic ? "بعد \(durationSm)" : "in \(durationSm)")
                    .font(.custom("Rubik-Medium", size: 9))
                    .foregroundStyle(p.muted)
                    .lineLimit(1)
                    .environment(\.locale, context.usesArabicNumerals ? Locale(identifier: "ar_EG") : Locale(identifier: "en_US_POSIX"))
                Spacer()
                Text(context.isArabic ? "الصلاة القادمة" : "Next Prayer")
                    .font(.custom("Rubik-Medium", size: 9))
                    .foregroundStyle(p.muted)
            }
            .padding(.bottom, 3)
            ForEach(prayers) { item in
                prayerRow(item: item, palette: p, activeBg: activeBg, fontSize: 11, padH: 4, padV: 2)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(8)
    }

    // MARK: Medium (2-column: list + hero)
    @ViewBuilder
    private func mediumLayout(prayers: [WidgetPrayerItem], prayer: WidgetPrayerData?, next: WidgetPrayerItem?, palette p: ThemePalette, activeBg: Color) -> some View {
        let nextNameAr = next?.nameAr ?? prayer?.nextPrayerNameAr ?? "الفجر"
        let nextName   = next?.name ?? prayer?.nextPrayerName ?? "Fajr"
        let nextTime   = prayerTimeFromEpoch(next?.epochMs, context)
        HStack(spacing: 8) {
            // List (left for Arabic, right for English — matches RN outerDir).
            VStack(spacing: 1) {
                ForEach(prayers) { item in
                    prayerRow(item: item, palette: p, activeBg: activeBg, fontSize: 10, padH: 4, padV: 1.5)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            // Hero
            VStack(spacing: 2) {
                Text(context.isArabic ? "الصلاة القادمة" : "Next Prayer")
                    .font(.custom("Rubik-Medium", size: 10))
                    .foregroundStyle(p.muted)
                Text(context.isArabic ? nextNameAr : nextName)
                    .font(.custom("Rubik-Bold", size: 20))
                    .foregroundStyle(p.text)
                    .lineLimit(1)
                Text(nextTime)
                    .font(.custom("Rubik-Bold", size: 32))
                    .foregroundStyle(p.text)
                    .kerning(-1)
                    .minimumScaleFactor(0.7)
                    .lineLimit(1)
                let timerDateMed = Date(timeIntervalSince1970: resolvedNextPrayerEpochMs(context) / 1000)
                let durationMed = PrayerDurationFormat.until(timerDateMed, from: context.date, language: context.isArabic ? "ar" : "en")
                // Header text above ("الصلاة القادمة") already sets context.
                // Render just the bare "بعد X" countdown below to avoid the
                // visible duplicate phrase. Uses the same HStack + RTL
                // pattern as the NextPrev widget so Arabic word order is
                // correct ("بعد" right, duration left).
                HStack(spacing: 3) {
                    if context.isArabic {
                        Text("بعد")
                        Text(durationMed)
                    } else {
                        Text("in")
                        Text(durationMed)
                    }
                }
                    .font(.custom("Rubik-Medium", size: 9))
                    .foregroundStyle(p.muted)
                    .lineLimit(1)
                    .environment(\.locale, context.usesArabicNumerals ? Locale(identifier: "ar_EG") : Locale(identifier: "en_US_POSIX"))
                    .environment(\.layoutDirection, context.isArabic ? .rightToLeft : .leftToRight)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .padding(8)
    }

    // MARK: Large (hero card + watermark + full list)
    @ViewBuilder
    private func largeLayout(prayers: [WidgetPrayerItem], prayer: WidgetPrayerData?, next: WidgetPrayerItem?, palette p: ThemePalette, activeBg: Color) -> some View {
        let nextNameAr = next?.nameAr ?? prayer?.nextPrayerNameAr ?? "الفجر"
        let nextName   = next?.name ?? prayer?.nextPrayerName ?? "Fajr"
        let nextTime   = prayerTimeFromEpoch(next?.epochMs, context)
        let heroBg = p.isLight ? Color.black.opacity(0.06) : Color.white.opacity(0.08)

        VStack(spacing: 10) {
            ZStack(alignment: .bottomTrailing) {
                // Watermark behind hero content — uses the DecoType Thuluth 2
                // calligraphy bundled as WidgetFont.ttf. iOS registers fonts
                // by their internal PostScript name regardless of filename,
                // so the SwiftUI name MUST be "DecoTypeThuluth2" even though
                // the bundled file is WidgetFont.ttf. Same opacity range as
                // the RN gallery (`rgba(0,0,0,0.06)` light / `rgba(255,255,255,0.05)` dark).
                Text("الصلاة")
                    .font(.custom("DecoTypeThuluth2", size: 52))
                    .foregroundStyle(p.isLight ? Color.black.opacity(0.10) : Color.white.opacity(0.08))
                    .padding(.trailing, 12)
                    .padding(.bottom, 14)
                    .allowsTightening(true)
                    .lineLimit(1)
                HStack(alignment: .center, spacing: 14) {
                    Image(systemName: prayerSymbol(next?.name ?? prayer?.nextPrayer ?? "fajr"))
                        .font(.system(size: 30, weight: .semibold))
                        .foregroundStyle(p.muted)
                        .frame(width: 36)
                    Spacer(minLength: 0)
                    VStack(alignment: .trailing, spacing: 5) {
                        Text(context.isArabic ? nextNameAr : nextName)
                            .font(.custom("Rubik-Bold", size: 22))
                            .foregroundStyle(p.text)
                        Text(nextTime)
                            .font(.custom("Rubik-Bold", size: 36))
                            .foregroundStyle(p.text)
                        let timerDateLg = Date(timeIntervalSince1970: resolvedNextPrayerEpochMs(context) / 1000)
                        let durationLg = PrayerDurationFormat.until(timerDateLg, from: context.date, language: context.isArabic ? "ar" : "en")
                        Text(context.isArabic ? "الصلاة القادمة بعد \(durationLg)" : "Next prayer in \(durationLg)")
                            .font(.custom("Rubik-Medium", size: 12))
                            .foregroundStyle(p.muted)
                            .lineLimit(1)
                            .minimumScaleFactor(0.75)
                            .environment(\.locale, context.usesArabicNumerals ? Locale(identifier: "ar_EG") : Locale(identifier: "en_US_POSIX"))
                    }
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 14)
            }
            .background(RoundedRectangle(cornerRadius: 16).fill(heroBg))
            .clipShape(RoundedRectangle(cornerRadius: 16))

            VStack(spacing: 3) {
                ForEach(prayers) { item in
                    prayerRow(item: item, palette: p, activeBg: activeBg, fontSize: 15, padH: 12, padV: 6, showIcon: true, iconSize: 16)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(12)
    }

    // MARK: Shared row
    /// `showIcon`: true for the large layout (matches RN PrayerTablePreview
    /// which renders a MaterialCommunityIcons glyph next to each prayer name
    /// in large size only). Medium / small omit it for density.
    @ViewBuilder
    private func prayerRow(item: WidgetPrayerItem, palette p: ThemePalette, activeBg: Color, fontSize: CGFloat, padH: CGFloat, padV: CGFloat, showIcon: Bool = false, iconSize: CGFloat = 16) -> some View {
        let active = item.isNext ?? false
        let timeText = prayerTimeFromEpoch(item.epochMs, context)
        let color: Color = active ? p.text : p.muted
        HStack(spacing: 8) {
            Text(timeText)
                .font(.custom("Rubik-Bold", size: fontSize))
                .kerning(-0.3)
                .foregroundStyle(color)
            Spacer()
            HStack(spacing: 6) {
                Text(context.isArabic ? (item.nameAr ?? "الفجر") : (item.name ?? "Fajr"))
                    .font(.custom("Rubik-Bold", size: fontSize))
                    .foregroundStyle(color)
                if showIcon {
                    Image(systemName: prayerSymbol(item.name ?? "fajr"))
                        .font(.system(size: iconSize, weight: .medium))
                        .foregroundStyle(color)
                }
            }
        }
        .padding(.horizontal, padH)
        .padding(.vertical, padV)
        .background(RoundedRectangle(cornerRadius: 6).fill(active ? activeBg : Color.clear))
    }
}

struct PrayerNextPreviousView: View {
    let context: WidgetContext
    var body: some View {
        let p = palette(context.theme)
        // Phase D: 7-day-aware next/previous prayer derivation.
        let next = todaysNextPrayer(context)
        let previous = todaysPreviousPrayer(context)
        let nextEpochMs = next.epochMs ?? resolvedNextPrayerEpochMs(context)
        let prevEpochMs = previous.epochMs ?? resolvedPreviousPrayerEpochMs(context)

        HStack(spacing: 10) {
            // Reading-order layout follows the widget's localized name:
            //   Arabic ("الصلاة السابقة والقادمة" read right-to-left)
            //     → السابقة on RIGHT, القادمة on LEFT  → render [next, previous]
            //       under forced LTR (first child = left).
            //   English ("Previous & Next" read left-to-right)
            //     → Previous on LEFT, Next on RIGHT     → render [previous, next].
            // Without this swap the English widget shows next-on-left even
            // though the name reads "Previous & Next" — confusing for LTR users.
            if context.isArabic {
                prayerBox(item: next, epochMs: nextEpochMs, isNext: true, palette: p)
                prayerBox(item: previous, epochMs: prevEpochMs, isNext: false, palette: p)
            } else {
                prayerBox(item: previous, epochMs: prevEpochMs, isNext: false, palette: p)
                prayerBox(item: next, epochMs: nextEpochMs, isNext: true, palette: p)
            }
        }
        .padding(10)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .environment(\.layoutDirection, .leftToRight)
    }

    func prayerBox(item: WidgetPrayerItem?, epochMs: Double, isNext: Bool, palette p: ThemePalette) -> some View {
        let timerDate = Date(timeIntervalSince1970: epochMs / 1000)
        let prefix = context.isArabic ? (isNext ? "بعد" : "منذ") : (isNext ? "in" : "ago")
        let valid = epochMs > 1000
        let boxBg = p.isLight ? Color.black.opacity(0.05) : Color.white.opacity(0.06)
        let boxBorder = p.isLight ? Color.black.opacity(0.08) : Color.white.opacity(0.10)

        return VStack(spacing: 2) {
            Image(systemName: prayerSymbol(item?.name ?? "fajr"))
                .font(.system(size: 20, weight: .semibold))
                .foregroundStyle(p.muted)
            Text(context.isArabic ? (item?.nameAr ?? "الفجر") : (item?.name ?? "Fajr"))
                .font(prayerNameFont(size: 16))
                .foregroundStyle(p.text)
                .padding(.top, 2)
            Text(prayerTimeFromEpoch(item?.epochMs, context))
                .font(.custom("Rubik-Bold", size: 28))
                .kerning(-0.5)
                .foregroundStyle(p.text)
                .padding(.top, 2)
                .minimumScaleFactor(0.7)
                .lineLimit(1)
            if valid {
                // PrayerDurationFormat.until() clamps NEGATIVE deltas to 0,
                // so calling it for a past prayer renders "0 ث". Previous
                // prayer MUST use .since() (now - past).
                let durNP = isNext
                    ? PrayerDurationFormat.until(timerDate, from: context.date, language: context.isArabic ? "ar" : "en")
                    : PrayerDurationFormat.since(timerDate, from: context.date, language: context.isArabic ? "ar" : "en")
                // Render prefix + duration as TWO separate Text views inside
                // a direction-forced HStack. The single-Text approach
                // (`"\(prefix) \(durNP)"`) was getting reordered by SwiftUI's
                // BiDi algorithm because the surrounding VStack is pinned
                // LTR — the short "بعد"/"منذ" prefix wasn't dominant enough
                // to override the base direction. With HStack + RTL layout,
                // child 1 (prefix) is placed at the rightmost visual
                // position and child 2 (duration) at the leftmost. Arabic
                // readers scan right-to-left and see "بعد 2 س 30 د" /
                // "منذ 4 س 17 د" — matching the gallery convention exactly.
                let durFont = Font.custom("Rubik-Medium", size: 9)
                HStack(spacing: 3) {
                    if context.isArabic {
                        Text(prefix)
                        Text(durNP)
                    } else if isNext {
                        // English next: "in 2H 30M"
                        Text(prefix)
                        Text(durNP)
                    } else {
                        // English previous: "5H ago" — suffix style
                        Text(durNP)
                        Text(prefix)
                    }
                }
                .font(durFont)
                .foregroundStyle(p.muted)
                .lineLimit(1)
                .environment(\.locale, context.usesArabicNumerals ? Locale(identifier: "ar_EG") : Locale(identifier: "en_US_POSIX"))
                .environment(\.layoutDirection, context.isArabic ? .rightToLeft : .leftToRight)
                .padding(.top, 2)
            }
        }
        .padding(10)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(RoundedRectangle(cornerRadius: 18).fill(boxBg))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(boxBorder, lineWidth: 0.5))
    }
}

struct VerseView: View {
    let context: WidgetContext
    @Environment(\.widgetFamily) var family

    /// Strip tashkeel + Quranic annotation marks + leading "سورة" word from a
    /// raw surah name. The bundled JSON stores names like "سُورَةُ الزُّخۡرُفِ"
    /// — written next to a middle-dot separator that visually collapses into
    /// the next digit ("· ١٥" reads as "٠١٥"). Mirrors `cleanSurahName()` in
    /// `lib/verse-pool.ts` so cached pools written before the cleanup landed
    /// also render correctly without waiting for a refresh.
    private func cleanSurahName(_ raw: String) -> String {
        var s = raw
        s = s.replacingOccurrences(of: "[\\u064B-\\u065F\\u0670\\u06D6-\\u06ED]", with: "", options: .regularExpression)
        s = s.replacingOccurrences(of: "ٱ", with: "ا")
        s = s.replacingOccurrences(of: "^سورة\\s+", with: "", options: .regularExpression)
        return s.trimmingCharacters(in: .whitespaces)
    }

    /// Resolve today's ayah by cycling through the 365-entry rolling pool
    /// (`data.versePool`) by day-of-year. When the pool is missing
    /// (e.g. fresh install, widget placed before first app launch), fall
    /// back to the 7-entry `BundledDailyAyahs` so the widget is NEVER
    /// blank. Returns:
    ///   - arabic: Arabic ayah, always rendered in Quran font.
    ///   - translation: English body shown under Arabic only in English mode.
    ///   - ref: localized "سورة <name>  <ayah>" / "Surah <Name>  <ayah>".
    private func todaysVerse() -> (arabic: String, translation: String, ref: String) {
        if let pool = context.data.versePool, !pool.entries.isEmpty {
            let cal = Calendar.current
            let dayOfYear = cal.ordinality(of: .day, in: .year, for: context.date) ?? 1
            let year = cal.component(.year, from: context.date)
            let daysElapsed = (year - pool.seedYear) * 365 + (dayOfYear - pool.seedDayOfYear)
            let count = pool.entries.count
            let idx = ((daysElapsed % count) + count) % count
            let entry = pool.entries[idx]
            let ayahNum = formatNumber(entry.ayahNumber, context)
            if context.isArabic {
                let name = cleanSurahName(entry.surahName)
                return (entry.arabic, "", "سورة \(name)  \(ayahNum)")
            }
            let en = entry.translation?.trimmingCharacters(in: .whitespaces) ?? ""
            let enName = (entry.englishSurahName?.trimmingCharacters(in: .whitespaces).isEmpty == false)
                ? entry.englishSurahName!
                : cleanSurahName(entry.surahName)
            return (entry.arabic, en, "Surah \(enName)  \(ayahNum)")
        }
        let bundled = BundledDailyAyahs.todaysAyah(for: context.date)
        return context.isArabic
            ? (bundled.arabic, "", bundled.ref)
            : (bundled.arabic, bundled.translation, "Surah \(bundled.ref)")
    }

    var body: some View {
        let p = palette(context.theme)
        let (arabic, translation, ref) = todaysVerse()
        let arabicDisplay = "﴿ \(arabic) ﴾"
        let arabicCount = arabic.count
        let arFs: CGFloat = arabicCount > 200
            ? 18
            : arabicCount > 100
                ? (context.isArabic ? 23 : 21)
                : (context.isArabic ? 28 : 25)
        let trFs: CGFloat = translation.count > 180 ? 12 : translation.count > 110 ? 13 : 15

        ZStack {
            VStack(spacing: context.isArabic ? 8 : 7) {
                Text(arabicDisplay)
                    .font(.custom("KFGQPCUthmanicScriptHAFS", size: arFs))
                    .minimumScaleFactor(0.35)
                    .multilineTextAlignment(.center)
                    .lineSpacing(4)
                    .lineLimit(context.isArabic ? 6 : 3)
                    .allowsTightening(true)
                    .foregroundStyle(p.text)
                    .environment(\.layoutDirection, .rightToLeft)
                if !context.isArabic, !translation.isEmpty {
                    Text(translation)
                        .font(.custom("Rubik-Medium", size: trFs))
                        .minimumScaleFactor(0.6)
                        .multilineTextAlignment(.center)
                        .lineSpacing(1)
                        .lineLimit(2)
                        .allowsTightening(true)
                        .foregroundStyle(p.text.opacity(0.88))
                        .environment(\.layoutDirection, .leftToRight)
                }
                Text(ref.isEmpty ? (context.isArabic ? "البقرة" : "Al-Baqarah") : ref)
                    .font(.custom("Rubik-Medium", size: 11))
                    .foregroundStyle(p.muted)
            }
            .padding(.horizontal, 18)
            .padding(.top, context.isArabic ? 24 : 18)
            .padding(.bottom, context.isArabic ? 14 : 12)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

/// Surah-recitation detector matching the JS-side `detectSurahRecitation`.
/// Entries that start with verbs like "اقرأ / قراءة" are rendered in a
/// denser Rubik-Bold style instead of the calligraphy used for dhikr.
private func zikrIsSurahRecitation(_ arabic: String) -> Bool {
    let t = arabic.trimmingCharacters(in: .whitespaces)
    if t.isEmpty { return false }
    let prefixes = ["اقرأ", "قراءة", "قرأ", "تلاوة"]
    for prefix in prefixes {
        if t.hasPrefix(prefix) { return true }
    }
    if t.range(of: "(?:قراءة|تلاوة)\\s+سورة", options: .regularExpression) != nil { return true }
    if t.range(of: "\\[\\s*سورة\\s", options: .regularExpression) != nil { return true }
    return false
}

private func collapseAzkarWidgetWhitespace(_ raw: String) -> String {
    raw.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
        .trimmingCharacters(in: .whitespacesAndNewlines)
}

private func stripAzkarTranslationNoise(_ raw: String) -> String {
    var t = raw.trimmingCharacters(in: .whitespacesAndNewlines)

    while t.last == ")" {
        var depth = 0
        var start: String.Index? = nil
        var i = t.index(before: t.endIndex)
        while true {
            let ch = t[i]
            if ch == ")" {
                depth += 1
            } else if ch == "(" {
                depth -= 1
                if depth == 0 {
                    start = i
                    break
                }
            }
            if i == t.startIndex { break }
            i = t.index(before: i)
        }
        guard let start else { break }
        let before = String(t[..<start]).trimmingCharacters(in: .whitespacesAndNewlines)
        if before.isEmpty { break }
        t = before
    }

    if t.first == "(", t.last == ")" {
        var depth = 0
        var balancedOuterPair = true
        let lastIndex = t.index(before: t.endIndex)
        for i in t.indices {
            let ch = t[i]
            if ch == "(" {
                depth += 1
            } else if ch == ")" {
                depth -= 1
                if depth == 0, i != lastIndex {
                    balancedOuterPair = false
                    break
                }
            }
        }
        if balancedOuterPair {
            t = String(t[t.index(after: t.startIndex)..<lastIndex])
        }
    }

    t = collapseAzkarWidgetWhitespace(t)
    let countMentionPattern = "\\s*[\\(\\[][^\\(\\)\\[\\]]*?(?:\\btimes?\\b|×\\s*\\d+|\\d+\\s*[xX]\\s*\\d*|\\bonce\\b)[^\\(\\)\\[\\]]*?[\\)\\]]\\s*"
    t = t.replacingOccurrences(of: countMentionPattern, with: " ", options: [.regularExpression, .caseInsensitive])
    t = collapseAzkarWidgetWhitespace(t)
    t = t.replacingOccurrences(of: "\\bO\\s+Allah\\b", with: "Allah", options: .regularExpression)
    return t
}

private func cleanEnglishAzkarWidgetText(_ raw: String) -> String {
    stripAzkarTranslationNoise(raw)
}

private func englishAzkarFontSize(_ text: String, isSmall: Bool) -> CGFloat {
    if isSmall { return text.count > 180 ? 10 : (text.count > 120 ? 11 : (text.count > 80 ? 12 : 14)) }
    if text.count > 240 { return 15 }
    if text.count > 200 { return 16 }
    if text.count > 160 { return 18 }
    if text.count > 110 { return 20 }
    return 22
}

private func splitLongEnglishAzkar(_ raw: String, maxChars: Int = 260) -> [String] {
    let clean = raw
        .replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
        .trimmingCharacters(in: .whitespacesAndNewlines)
    if clean.isEmpty { return [] }
    if clean.count <= maxChars { return [clean] }
    var chunks: [String] = []
    var current = ""
    for word in clean.split(separator: " ") {
        let candidate = current.isEmpty ? String(word) : "\(current) \(word)"
        if candidate.count <= maxChars {
            current = candidate
        } else {
            if !current.isEmpty { chunks.append(current) }
            current = String(word)
        }
    }
    if !current.isEmpty { chunks.append(current) }
    return chunks.isEmpty ? [clean] : chunks
}

private func pickLongEnglishAzkarPage(_ text: String, pageIndex: Int) -> String {
    let chunks = splitLongEnglishAzkar(text)
    if chunks.count <= 1 { return chunks.first ?? text }
    let idx = ((pageIndex % chunks.count) + chunks.count) % chunks.count
    return chunks[idx]
}

/// Morning / Evening azkar widget. Reads from `BundledAzkar.morning` /
/// `BundledAzkar.evening` and cycles by minute-of-day. Long azkar are
/// pre-split into ≤3-line chunks at bundle-generation time and the widget
/// rotates through chunks 1-minute apart so user sees the full text in
/// readable pages instead of clipped calligraphy. Quran-recitation entries
/// (Ayat al-Kursi, the three Quls, etc.) render as a bold "قراءة <name>"
/// label instead of the full Quran body — that text is for the in-app
/// reader, not a 329×155 widget tile.
struct AzkarQuoteView: View {
    let context: WidgetContext
    let pool: [BundledZikr]   // BundledAzkar.morning or .evening
    let title: String         // e.g. "أذكار الصباح"
    var titleEn: String = ""
    @Environment(\.widgetFamily) var family

    var body: some View {
        let p = palette(context.theme)
        let slot = BundledAzkar.currentSlot(for: context.date, in: pool)
        let isAr = context.isArabic
        let displayTitle = (!isAr && !titleEn.isEmpty) ? titleEn : title
        let isSmall = family == .systemSmall
        let titleFs: CGFloat = isSmall ? 11 : 13

        // Body text + font — language-aware:
        //   Arabic mode → Arabic chunk (or "قراءة <name>" for Quran).
        //   English mode → English translation (or "Recite <name>" for Quran),
        //                  falling back to Arabic when no translation exists.
        let zikr = slot?.zikr
        let isQuran = zikr?.quranTitle != nil
        let bodyText: String = {
            guard let z = zikr else { return isAr ? "اللهم صل وسلم على نبينا محمد" : "O Allah, send blessings upon Muhammad" }
            if isQuran {
                if isAr {
                    let q = z.quranTitle ?? ""
                    return q.hasPrefix("قراءة") ? q : "قراءة \(q)"
                }
                return z.quranTitleEn.isEmpty ? (z.quranTitle ?? "") : z.quranTitleEn
            }
            if !isAr && !z.translation.isEmpty {
                let cleaned = cleanEnglishAzkarWidgetText(z.translation)
                return pickLongEnglishAzkarPage(cleaned.isEmpty ? z.translation : cleaned, pageIndex: slot?.chunkIndex ?? 0)
            }
            let chunks = z.displayChunks
            let idx = slot?.chunkIndex ?? 0
            if !chunks.isEmpty, idx < chunks.count { return chunks[idx] }
            return z.arabic
        }()
        let bodyFont: Font = {
            if isQuran {
                let fs: CGFloat = isSmall ? 17 : 22
                return .custom("Rubik-Bold", size: fs)
            }
            if isAr {
                let fs: CGFloat = isSmall ? 14 : 18
                return .custom("Rubik-Regular", size: fs)
            }
            // English prose: large but balanced. Pick the size by text length
            // so the widget reads clearly without clipping.
            let fs = englishAzkarFontSize(bodyText, isSmall: isSmall)
            return .custom("Rubik-Bold", size: fs)
        }()

        let count = max(zikr?.count ?? 1, 1)
        // ×-prefix format ("×10" not "10×") — reads naturally as "times 10".
        let countText = "×\(formatNumber(count, context))"

        VStack(spacing: 4) {
            // Title row: Arabic mode shows "أذكار الصباح" etc. English mode
            // hides it — the widget's own label below the tile already says
            // "Morning Adhkar", and the freed space goes to the (longer)
            // English translation prose.
            if isAr {
                Text(displayTitle)
                    .font(.custom("Rubik-Bold", size: titleFs))
                    .foregroundStyle(p.muted)
            }
            Spacer(minLength: 0)
            Text(bodyText)
                .font(bodyFont)
                // English uses length-aware sizing so home-screen widgets
                // stay readable without clipping.
                .minimumScaleFactor(isAr ? 0.85 : 0.68)
                .multilineTextAlignment(isAr ? .center : .leading)
                .lineLimit(isAr ? 3 : 5)
                .lineSpacing(isAr ? 2 : 0)
                .foregroundStyle(p.text)
                .allowsTightening(true)
                .environment(\.layoutDirection, isAr ? .rightToLeft : .leftToRight)
            Spacer(minLength: 0)
            Text(countText)
                .font(.custom("Rubik-Bold", size: titleFs))
                .foregroundStyle(p.muted)
        }
        .padding(.horizontal, isAr ? 12 : 20)
        .padding(.vertical, isAr ? 8 : 14)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

/// Daily Dhikr widget. Picks today's zikr from `BundledAzkar.daily`
/// (the ~243 azkar that are NEITHER morning NOR evening). Deterministic by
/// day-of-year so every user sees the same dhikr on the same day; cycles
/// through that zikr's chunks one minute at a time so multi-page dhikr
/// (>3 lines) progress visibly across the widget. Fully autonomous —
/// no shared-data dependency.
struct DailyDhikrView: View {
    let context: WidgetContext
    @Environment(\.widgetFamily) var family

    var body: some View {
        let p = palette(context.theme)
        let slot = BundledAzkar.todaysDhikrSlot(for: context.date)
        let isAr = context.isArabic
        let isSmall = family == .systemSmall
        let zikr = slot?.zikr
        let isQuran = zikr?.quranTitle != nil
        let bodyText: String = {
            guard let z = zikr else { return isAr ? "سُبْحَانَ اللهِ وَبِحَمْدِهِ، سُبْحَانَ اللهِ الْعَظِيمِ" : "Glory be to Allah and praise Him; glory be to Allah the Great" }
            if isQuran {
                if isAr {
                    let q = z.quranTitle ?? ""
                    return q.hasPrefix("قراءة") ? q : "قراءة \(q)"
                }
                return z.quranTitleEn.isEmpty ? (z.quranTitle ?? "") : z.quranTitleEn
            }
            if !isAr && !z.translation.isEmpty {
                let cleaned = cleanEnglishAzkarWidgetText(z.translation)
                let minute = Calendar.current.component(.hour, from: context.date) * 60 + Calendar.current.component(.minute, from: context.date)
                return pickLongEnglishAzkarPage(cleaned.isEmpty ? z.translation : cleaned, pageIndex: minute)
            }
            let chunks = z.displayChunks
            let idx = slot?.chunkIndex ?? 0
            if !chunks.isEmpty, idx < chunks.count { return chunks[idx] }
            return z.arabic
        }()
        let bodyFont: Font = {
            if isQuran {
                let fs: CGFloat = isSmall ? 18 : 24
                return .custom("Rubik-Bold", size: fs)
            }
            if isAr {
                let fs: CGFloat = isSmall ? 15 : 19
                return .custom("Rubik-Regular", size: fs)
            }
            let fs = englishAzkarFontSize(bodyText, isSmall: isSmall)
            return .custom("Rubik-Bold", size: fs)
        }()
        let count = max(1, zikr?.count ?? 100)
        let countStr = formatNumber(count, context)
        let benefit = zikr?.benefit ?? ""
        let reference = zikr?.reference ?? ""

        VStack(spacing: 4) {
            Spacer(minLength: 0)
            Text(bodyText)
                .font(bodyFont)
                // English uses length-aware sizing so home-screen widgets
                // stay readable without clipping.
                .minimumScaleFactor(isAr ? 0.85 : 0.68)
                .multilineTextAlignment(isAr ? .center : .leading)
                .lineLimit(isAr ? 3 : 5)
                .lineSpacing(isAr ? 2 : 0)
                .foregroundStyle(p.text)
                .allowsTightening(true)
            Text("×\(countStr)")
                .font(.custom("Rubik-Bold", size: isSmall ? 12 : 14))
                .foregroundStyle(p.muted)
                .padding(.top, 2)
            // Benefit + reference are Arabic-only strings in azkar.json (no
            // English equivalents). Hide them in English mode rather than
            // mixing Arabic attribution into an English widget — keeps the
            // tile language-coherent and frees up vertical space for the
            // longer English translation body.
            if isAr, !isSmall, !benefit.isEmpty {
                Text(benefit)
                    .font(.custom("Rubik-Medium", size: 9))
                    .foregroundStyle(p.muted.opacity(0.85))
                    .lineLimit(1)
                    .multilineTextAlignment(.center)
            }
            if isAr, !isSmall, !reference.isEmpty {
                Text(reference)
                    .font(.custom("Rubik-Medium", size: 9))
                    .foregroundStyle(p.muted.opacity(0.7))
                    .lineLimit(1)
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, isAr ? 12 : 20)
        .padding(.vertical, isAr ? 8 : 14)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .environment(\.layoutDirection, isAr ? .rightToLeft : .leftToRight)
    }
}

struct LockDayThuluthView: View {
    let date: Date
    var body: some View {
        if let shared = sharedDataIfAvailable() {
            let lang: RoohLanguage = RoohLanguage(rawValue: shared.widgetLanguage ?? "ar") ?? .ar
            let cal: RoohCalendar = RoohCalendar(rawValue: shared.widgetDayCalendar ?? shared.widgetCalendar ?? "auto") ?? .auto
            let nums: RoohNumerals = RoohNumerals(rawValue: shared.widgetNumerals ?? "arabic") ?? .arabic
            let context = WidgetContext(date: date, language: lang, calendar: cal, numerals: nums, theme: .auto, data: shared)
            // Subtle position tweak — shift the calligraphy down so it has
            // breathing room from the top edge of the lock-screen frame.
            Text(weekdayName(context))
                .font(.custom(context.arabicFontFamily, size: 32))
                .lineLimit(1)
                .minimumScaleFactor(0.5)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
                .offset(y: 4)
                .containerBackground(for: .widget) { Color.clear }
        } else {
            LockAppNotOpenedView()
        }
    }
}

struct LockMonthThuluthView: View {
    let date: Date
    var body: some View {
        if let shared = sharedDataIfAvailable() {
            // Always render the full Hijri date (day + month + year) — Arabic numerals
            // for `arabic`/`auto`, Latin for `western`. The lockscreen accessory tints
            // the text via the system, so we render plain white.
            let cal = Calendar(identifier: .islamicUmmAlQura)
            let hijriDate = applyHijriOffset(date, offset: shared.hijriOffset)
            let day = cal.component(.day, from: hijriDate)
            let year = cal.component(.year, from: hijriDate)
            let monthName = thuluthHijriMonthName(hijriDate)
            let useArabicDigits: Bool = {
                let n = shared.widgetNumerals ?? "arabic"
                return n != "western"
            }()
            let dayStr = useArabicDigits ? latinToArabicDigits(String(day)) : String(day)
            let yearStr = useArabicDigits ? latinToArabicDigits(String(year)) : String(year)
            let label = "\(dayStr) \(monthName) \(yearStr)"
            let context = WidgetContext(date: date, language: .ar, calendar: .hijri, numerals: useArabicDigits ? .arabic : .latin, theme: .auto, data: shared)
            // Subtle position tweak — match LockDayThuluthView so paired
            // thuluth widgets line up perfectly on the lock screen.
            Text(label)
                .font(.custom(context.arabicFontFamily, size: 26))
                .lineLimit(1)
                .minimumScaleFactor(0.5)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
                .offset(y: 4)
                .containerBackground(for: .widget) { Color.clear }
        } else {
            LockAppNotOpenedView()
        }
    }
}

// MARK: - Lock screen prayer & hijri widgets

private func lockWidgetContext(date: Date, shared: SharedWidgetData) -> WidgetContext {
    let lang: RoohLanguage = RoohLanguage(rawValue: shared.widgetLanguage ?? shared.language ?? "ar") ?? .ar
    let cal: RoohCalendar = RoohCalendar(rawValue: shared.widgetCalendar ?? "auto") ?? .auto
    let nums: RoohNumerals = RoohNumerals(rawValue: shared.widgetNumerals ?? "arabic") ?? .arabic
    return WidgetContext(date: date, language: lang, calendar: cal, numerals: nums, theme: .auto, data: shared)
}

/// accessoryRectangular — اسم الصلاة القادمة + وقت الأذان + عدّاد تنازلي
struct LockNextPrayerView: View {
    @Environment(\.widgetFamily) private var family
    let date: Date
    var body: some View {
        // Phase 2: prefer fresh prayer times from PrayerCalculator (offline
        // adhan-swift); falls back to cached SharedWidgetData when inputs
        // aren't set yet, and to LockAppNotOpenedView when nothing is
        // available. Layout unchanged.
        if let shared = sharedDataWithFreshPrayer(now: date) {
            let context = lockWidgetContext(date: date, shared: shared)
            let prayer = shared.prayer
            let trueNext = nextPrayerItem(prayer, now: Date())
            let nextName = context.isArabic
                ? (trueNext?.nameAr ?? prayer?.nextPrayerNameAr ?? "الفجر")
                : (trueNext?.name ?? prayer?.nextPrayerName ?? "Fajr")
            let nextTime = prayerTimeFromEpoch(trueNext?.epochMs ?? prayer?.nextPrayerAtEpochMs, context)
            if family == .accessoryInline {
                Text("\(nextName) • \(nextTime)")
                    .font(lockRubik(size: 16, weight: "Rubik-Bold"))
                    .lineLimit(1)
                    .minimumScaleFactor(0.65)
                    .containerBackground(for: .widget) { Color.clear }
            } else {
            let nextEpochMs = resolvedNextPrayerEpochMs(context)
            let nextPrayerDate = Date(timeIntervalSince1970: nextEpochMs / 1000)
            let prefix = context.isArabic ? "بعد" : "in"
            let alignment: HorizontalAlignment = context.isArabic ? .trailing : .leading
            let frameAlignment: Alignment = context.isArabic ? .trailing : .leading
            VStack(alignment: alignment, spacing: 3) {
                HStack(spacing: 5) {
                    Image(systemName: "moon.stars.fill")
                        .font(.system(size: 14, weight: .semibold))
                    Text(nextName)
                        .font(lockRubik(size: 18))
                        .lineLimit(1)
                        .minimumScaleFactor(0.6)
                }
                Text(nextTime)
                    .font(lockRubik(size: 26))
                    .lineLimit(1)
                    .minimumScaleFactor(0.5)
                HStack(spacing: 3) {
                    Text(prefix)
                        .font(lockRubik(size: 14, weight: "Rubik-Medium"))
                    Text(PrayerDurationFormat.until(nextPrayerDate, from: context.date, language: context.isArabic ? "ar" : "en"))
                        .font(lockRubik(size: 14, weight: "Rubik-Medium"))
                        .multilineTextAlignment(.leading)
                }
                .environment(\.layoutDirection, .leftToRight)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
                .opacity(0.85)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: frameAlignment)
            .environment(\.layoutDirection, context.isArabic ? .rightToLeft : .leftToRight)
            .containerBackground(for: .widget) { Color.clear }
            }
        } else {
            LockAppNotOpenedView()
        }
    }
}

/// accessoryRectangular — جدول مضغوط لكل المواقيت الخمس مع تظليل القادمة
struct LockAllPrayersView: View {
    let date: Date
    var body: some View {
        // Phase 2: prefer fresh prayer times from PrayerCalculator. Layout
        // unchanged — the existing 5-column display continues to omit Sunrise
        // because accessoryRectangular has no horizontal room for a 6th column.
        // The calculator itself treats Sunrise as a first-class state for
        // `LockNextPrayerView` / `LockNextPrayerCountdownView`; only this
        // narrow lock-screen variant filters it out for display fit.
        if let shared = sharedDataWithFreshPrayer(now: date) {
            let context = lockWidgetContext(date: date, shared: shared)
            let liveprayers = normalizedPrayers(shared.prayer, now: Date())
            let mainFive = liveprayers.filter { ($0.name ?? "").lowercased() != "sunrise" }
            let prayers = Array(mainFive.prefix(5))
            HStack(spacing: 4) {
                ForEach(Array(prayers.enumerated()), id: \.offset) { _, p in
                    let isActiveRow = p.isNext ?? false
                    VStack(spacing: 2) {
                        Text(context.isArabic ? (p.nameAr ?? "") : (p.name ?? ""))
                            .font(lockRubik(size: 13))
                            .lineLimit(1)
                            .minimumScaleFactor(0.5)
                            .opacity(isActiveRow ? 1.0 : 0.85)
                        Text(prayerTimeFromEpoch(p.epochMs, context))
                            .font(lockRubik(size: 14, weight: isActiveRow ? "Rubik-Bold" : "Rubik-Medium"))
                            .lineLimit(1)
                            .minimumScaleFactor(0.5)
                    }
                    .frame(maxWidth: .infinity)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .containerBackground(for: .widget) { Color.clear }
        } else {
            LockAppNotOpenedView()
        }
    }
}

/// accessoryCircular — رقم اليوم الهجري + اسم الشهر مختصر
struct LockHijriCircularView: View {
    let date: Date
    var body: some View {
        if let shared = sharedDataIfAvailable() {
            let context = lockWidgetContext(date: date, shared: shared)
            let cal = Calendar(identifier: .islamicUmmAlQura)
            let hijriDate = applyHijriOffset(date, offset: shared.hijriOffset)
            let day = shared.prayer?.hijriDay ?? cal.component(.day, from: hijriDate)
            let useArabicDigits = (shared.widgetNumerals ?? "arabic") != "western"
            let dayStr = useArabicDigits ? latinToArabicDigits(String(day)) : String(day)
            let monthShort: String = {
                if context.isArabic {
                    let m = shared.prayer?.hijriMonth ?? thuluthHijriMonthName(hijriDate)
                    return String(m.prefix(6))
                }
                let m = shared.prayer?.hijriMonthEn ?? "Hijri"
                return String(m.prefix(4))
            }()
            ZStack {
                AccessoryWidgetBackground()
                VStack(spacing: 0) {
                    // Rubik throughout — keeps the lock-screen circle visually
                    // consistent regardless of Arabic / Western numerals or
                    // Arabic / English month label.
                    Text(dayStr)
                        .font(lockRubik(size: 22))
                        .lineLimit(1)
                        .minimumScaleFactor(0.5)
                    Text(monthShort)
                        .font(lockRubik(size: 10, weight: "Rubik-Medium"))
                        .lineLimit(1)
                        .minimumScaleFactor(0.5)
                        .opacity(0.85)
                }
                .offset(y: 1)
            }
            .containerBackground(for: .widget) { Color.clear }
        } else {
            LockAppNotOpenedView()
        }
    }
}

/// accessoryCircular — Gauge ring بالنسبة المتبقية للصلاة القادمة
struct LockNextPrayerCountdownView: View {
    let date: Date
    var body: some View {
        // Phase 2: prefer fresh prayer times from PrayerCalculator. Layout
        // and Gauge ring unchanged.
        if let shared = sharedDataWithFreshPrayer(now: date) {
            let context = lockWidgetContext(date: date, shared: shared)
            let prayer = shared.prayer
            let totalWindowMinutes: Double = 6 * 60
            let nextEpochMs = resolvedNextPrayerEpochMs(context)
            let nextPrayerDate = Date(timeIntervalSince1970: nextEpochMs / 1000)
            let nowMs = Date().timeIntervalSince1970 * 1000
            let remainingMins = max(0, (nextEpochMs - nowMs) / 60000)
            let liveProgress = max(0.0, min(1.0, 1.0 - (remainingMins / totalWindowMinutes)))
            let trueNextCircular = nextPrayerItem(prayer, now: Date())
            let nextFull = context.isArabic
                ? (trueNextCircular?.nameAr ?? prayer?.nextPrayerNameAr ?? "الفجر")
                : (trueNextCircular?.name ?? prayer?.nextPrayerName ?? "Fajr")
            Gauge(value: liveProgress) {
                Text(nextFull)
                    .font(lockRubik(size: 9, weight: "Rubik-Medium"))
                    .lineLimit(1)
                    .minimumScaleFactor(0.5)
            } currentValueLabel: {
                Text(PrayerDurationFormat.until(nextPrayerDate, from: context.date, language: context.isArabic ? "ar" : "en"))
                    .font(lockRubik(size: 12))
                    .lineLimit(1)
                    .minimumScaleFactor(0.5)
            }
            .gaugeStyle(.accessoryCircular)
            .containerBackground(for: .widget) { Color.clear }
        } else {
            LockAppNotOpenedView()
        }
    }
}

// MARK: - Helpers

func sampleSharedData() -> SharedWidgetData {
    SharedWidgetData(
        prayer: WidgetPrayerData(
            nextPrayer: "fajr",
            nextPrayerName: "Fajr",
            nextPrayerNameAr: "الفجر",
            nextPrayerTime: "04:15",
            nextPrayerAtEpochMs: Date().addingTimeInterval(2 * 3600 + 47 * 60).timeIntervalSince1970 * 1000,
            previousPrayerName: "Isha",
            previousPrayerNameAr: "العشاء",
            previousPrayerAtEpochMs: Date().addingTimeInterval(-(4 * 3600 + 1 * 60)).timeIntervalSince1970 * 1000,
            calculationLocation: "مكة",
            timezone: TimeZone.current.identifier,
            prayerDataUpdatedAt: ISO8601DateFormatter().string(from: Date()),
            timeRemaining: "6:02",
            timeRemainingMinutes: 362,
            allPrayers: [
                WidgetPrayerItem(name: "Fajr", nameAr: "الفجر", time: "04:15", isPassed: false, isNext: true),
                WidgetPrayerItem(name: "Sunrise", nameAr: "الشروق", time: "05:39", isPassed: false, isNext: false),
                WidgetPrayerItem(name: PrayerKey.dhuhr.englishName, nameAr: PrayerKey.dhuhr.arabicName, time: "12:19", isPassed: false, isNext: false),
                WidgetPrayerItem(name: "Asr", nameAr: "العصر", time: "03:42", isPassed: false, isNext: false),
                WidgetPrayerItem(name: "Maghrib", nameAr: "المغرب", time: "06:56", isPassed: false, isNext: false),
                WidgetPrayerItem(name: "Isha", nameAr: "العشاء", time: "08:17", isPassed: false, isNext: false),
            ],
            hijriDate: "21 ذو القعدة 1447",
            hijriDay: 21,
            hijriMonth: "ذو القعدة",
            hijriMonthEn: "Dhu al-Qadah",
            hijriYear: 1447,
            gregorianDate: "الجمعة 8 مايو",
            location: "مكة"
        ),
        azkar: WidgetAzkarData(randomZikr: WidgetZikr(id: "1", text: "اللهم صل وسلم على نبينا محمد", translation: "Send blessings upon Prophet Muhammad", count: 10, timesLabel: "مرات", category: "1", categoryName: "أذكار الصباح", benefit: nil), morningCompleted: false, eveningCompleted: false),
        verse: VerseWidgetData(arabic: "وَلَكُمْ فِي الْقِصَاصِ حَيَاةٌ يَا أُولِي الْأَلْبَابِ", translation: nil, surahName: "البقرة", surahNameEn: "Al-Baqarah", ayahNumber: 179, numberInSurah: 179),
        dhikr: nil,
        language: "ar"
    )
}

func sampleSharedDataForSystemLocale() -> SharedWidgetData {
    var data = sampleSharedData()
    let lang = widgetSystemIsArabic() ? "ar" : "en"
    data.language = lang
    data.widgetLanguage = lang
    return data
}

private func normalizedPrayerKey(_ value: String?) -> String? {
    let text = (value ?? "").lowercased()
    if text.contains("fajr") || text.contains("subh") || text.contains("الفجر") || text.contains("الصبح") { return "fajr" }
    if text.contains("sunrise") || text.contains("shurooq") || text.contains("shuruk") || text.contains("الشروق") { return "sunrise" }
    if text.contains("dhuhr") || text.contains("zuhr") || text.contains("jumu") || text.contains("الظهر") || text.contains("الجمعة") { return "dhuhr" }
    if text.contains("asr") || text.contains("العصر") { return "asr" }
    if text.contains("maghrib") || text.contains("المغرب") { return "maghrib" }
    if text.contains("isha") || text.contains("العشاء") { return "isha" }
    return nil
}

func normalizedPrayers(_ prayer: WidgetPrayerData?, now: Date = Date()) -> [WidgetPrayerItem] {
    // allPrayers contains today's 6 prayers only — safe for display.
    // (allPrayerEpochs holds the 7-day range and is never used for display.)
    let rawSource = (prayer?.allPrayers ?? []).isEmpty
        ? (sampleSharedData().prayer?.allPrayers ?? [])
        : (prayer?.allPrayers ?? [])
    // Guard: should always be ≤6, but truncate in case data is unexpected.
    let source = Array(rawSource.prefix(6))
    let nowMs = now.timeIntervalSince1970 * 1000
    let sourceEpochs = source
        .compactMap { $0.epochMs }
        .filter { $0 > 0 }
        .sorted()
    let extendedNextEpoch = (prayer?.allPrayerEpochs ?? [])
        .filter { $0 > nowMs }
        .sorted()
        .first
    let declaredNextEpoch = prayer?.nextPrayerAtEpochMs.flatMap { $0 > nowMs ? $0 : nil }
    let nextEpoch = extendedNextEpoch
        ?? declaredNextEpoch
        ?? sourceEpochs.first(where: { $0 > nowMs })
        ?? sourceEpochs.first
    let sourceContainsNextEpoch = sourceEpochs.contains { epoch in
        guard let next = nextEpoch else { return false }
        return abs(epoch - next) < 1000
    }
    let declaredNextKey = normalizedPrayerKey(prayer?.nextPrayer)
        ?? normalizedPrayerKey(prayer?.nextPrayerName)
        ?? normalizedPrayerKey(prayer?.nextPrayerNameAr)

    return source.map { item in
        var copy = item
        if let epoch = item.epochMs, epoch > 0 {
            copy.isPassed = epoch <= nowMs
        }
        let matchesEpoch = item.epochMs.flatMap { epoch in
            nextEpoch.map { abs(epoch - $0) < 1000 }
        } ?? false
        let matchesNextDayRow = !sourceContainsNextEpoch
            && normalizedPrayerKey(item.name ?? item.nameAr) == declaredNextKey
        copy.isNext = matchesEpoch || matchesNextDayRow
        if matchesNextDayRow, let next = nextEpoch {
            copy.epochMs = next
            copy.time = prayer?.nextPrayerTime ?? copy.time
            copy.isPassed = false
        }
        return copy
    }
}

func nextPrayerItem(_ prayer: WidgetPrayerData?, now: Date = Date()) -> WidgetPrayerItem? {
    return normalizedPrayers(prayer, now: now).first { $0.isNext ?? false }
}

func previousPrayerItem(_ prayer: WidgetPrayerData?, now: Date = Date()) -> WidgetPrayerItem? {
    let prayers = normalizedPrayers(prayer, now: now)
    guard let nextIndex = prayers.firstIndex(where: { $0.isNext ?? false }), !prayers.isEmpty else {
        return prayers.last
    }
    return prayers[(nextIndex - 1 + prayers.count) % prayers.count]
}

func weekdayName(_ context: WidgetContext) -> String {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: context.isArabic ? "ar" : "en")
    formatter.dateFormat = "EEEE"
    return formatter.string(from: context.date)
}

/// Locked-Arabic weekday name for the Thuluth calligraphy widget. Always Arabic
/// regardless of the user's `widgetLanguage` choice.
func thuluthWeekdayName(_ date: Date) -> String {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "ar")
    formatter.dateFormat = "EEEE"
    return formatter.string(from: date)
}

/// Locked-Arabic Hijri month name for the Thuluth calligraphy widget. Always Hijri
/// + Arabic regardless of the user's `widgetCalendar` / `widgetLanguage` choice.
func thuluthHijriMonthName(_ date: Date) -> String {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "ar")
    formatter.calendar = Calendar(identifier: .islamicUmmAlQura)
    formatter.dateFormat = "MMMM"
    return formatter.string(from: date)
}

func monthName(_ context: WidgetContext) -> String {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: context.isArabic ? "ar" : "en")
    formatter.calendar = selectedCalendar(context)
    formatter.dateFormat = "MMMM"
    return formatter.string(from: context.date)
}

func dayNumber(_ context: WidgetContext) -> Int {
    selectedCalendar(context).component(.day, from: context.date)
}

func monthNumber(_ context: WidgetContext) -> Int {
    selectedCalendar(context).component(.month, from: context.date)
}

func yearNumber(_ context: WidgetContext) -> Int {
    selectedCalendar(context).component(.year, from: context.date)
}

func selectedCalendar(_ context: WidgetContext) -> Calendar {
    context.calendar == .hijri ? Calendar(identifier: .islamicUmmAlQura) : Calendar(identifier: .gregorian)
}

func calendarFor(_ cal: RoohCalendar) -> Calendar {
    switch cal {
    case .hijri: return Calendar(identifier: .islamicUmmAlQura)
    case .gregorian, .auto: return Calendar(identifier: .gregorian)
    }
}

/// Shift a date by `offset` days. Used by Hijri component lookups so the
/// widget mirrors the user's in-app moon-sighting offset (setHijriOffset).
/// `nil` and `0` are pass-through. Lives at file scope so both
/// `WidgetContext`-based date views and the lock-screen Hijri views (which
/// only have the raw `date: Date`) can share it.
func applyHijriOffset(_ date: Date, offset: Int?) -> Date {
    guard let offset = offset, offset != 0 else { return date }
    return Calendar(identifier: .gregorian).date(byAdding: .day, value: offset, to: date) ?? date
}

/// The reference date used for calendar-component lookups. Returns
/// `context.date` shifted by `data.hijriOffset` days WHEN the requested
/// calendar is Hijri — matches the in-app Hijri tab where the user can apply
/// a ±N-day moon-sighting offset via setHijriOffset(). Gregorian lookups
/// always pass through unchanged (offset is a Hijri-only concept).
func dateForCalendar(_ context: WidgetContext, cal: RoohCalendar) -> Date {
    guard cal == .hijri else { return context.date }
    return applyHijriOffset(context.date, offset: context.data.hijriOffset)
}

func dayNumberFor(_ context: WidgetContext, cal: RoohCalendar) -> Int {
    calendarFor(cal).component(.day, from: dateForCalendar(context, cal: cal))
}

func monthNameFor(_ context: WidgetContext, cal: RoohCalendar) -> String {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: context.isArabic ? "ar" : "en")
    formatter.calendar = calendarFor(cal)
    formatter.dateFormat = "MMMM"
    return formatter.string(from: dateForCalendar(context, cal: cal))
}

func yearNumberFor(_ context: WidgetContext, cal: RoohCalendar) -> Int {
    calendarFor(cal).component(.year, from: dateForCalendar(context, cal: cal))
}

func formatNumber(_ value: Int, _ context: WidgetContext) -> String {
    let raw = String(format: value < 10 && value == monthNumber(context) ? "%02d" : "%d", value)
    return context.usesArabicNumerals ? latinToArabicDigits(raw) : raw
}

func formatTime(_ date: Date, _ context: WidgetContext) -> String {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.dateFormat = "HH:mm"
    let raw = formatter.string(from: date)
    return context.usesArabicNumerals ? latinToArabicDigits(raw) : raw
}

func formatDateSlash(_ context: WidgetContext) -> String {
    let cal = selectedCalendar(context)
    let day = cal.component(.day, from: context.date)
    let month = cal.component(.month, from: context.date)
    let year = cal.component(.year, from: context.date)
    let raw = String(format: "%02d / %02d / %04d", day, month, year)
    return context.usesArabicNumerals ? latinToArabicDigits(raw) : raw
}

/// Applies the user's numeral preference to any string (digits 0-9 → ٠-٩ when Arabic).
func applyNumeralsTo(_ value: String, _ context: WidgetContext) -> String {
    return context.usesArabicNumerals ? latinToArabicDigits(value) : value
}

func prayerTimeFromEpoch(_ epochMs: Double?, _ context: WidgetContext) -> String {
    guard let ms = epochMs, ms > 1000 else { return "--:--" }
    let date = Date(timeIntervalSince1970: ms / 1000)
    let f = DateFormatter()
    f.timeZone = widgetDisplayTimeZone(context)
    // Pin the format string to a stable POSIX locale so the colon and digit
    // sequence is bidi-stable, then override AM/PM symbols explicitly per
    // language. `Locale("ar_AE")` does NOT reliably produce "ص"/"م" on every
    // iOS version — some configurations keep Latin AM/PM. Forcing the symbols
    // here removes that variability and guarantees Arabic widgets show ص/م.
    f.locale = Locale(identifier: "en_US_POSIX")
    f.dateFormat = "h:mm a"
    if context.isArabic {
        f.amSymbol = "ص"
        f.pmSymbol = "م"
    } else {
        f.amSymbol = "AM"
        f.pmSymbol = "PM"
    }
    let result = f.string(from: date)
    return context.usesArabicNumerals ? latinToArabicDigits(result) : result
}

/// Returns only the digits+colon part (e.g. "٤:١١") without AM/PM — for large displays.
func prayerTimeDigitsFromEpoch(_ epochMs: Double?, _ context: WidgetContext) -> String {
    guard let ms = epochMs, ms > 1000 else { return "--:--" }
    let date = Date(timeIntervalSince1970: ms / 1000)
    let f = DateFormatter()
    f.timeZone = widgetDisplayTimeZone(context)
    f.locale = Locale(identifier: "en_US_POSIX")
    f.dateFormat = "h:mm"
    let result = f.string(from: date)
    return context.usesArabicNumerals ? latinToArabicDigits(result) : result
}

/// Returns only the AM/PM indicator (e.g. "ص" or "م") — displayed separately at small size.
func prayerAMPMFromEpoch(_ epochMs: Double?, _ context: WidgetContext) -> String {
    guard let ms = epochMs, ms > 1000 else { return "" }
    let date = Date(timeIntervalSince1970: ms / 1000)
    let f = DateFormatter()
    f.timeZone = widgetDisplayTimeZone(context)
    f.locale = Locale(identifier: "en_US_POSIX")
    f.dateFormat = "a"
    f.amSymbol = context.isArabic ? "ص" : "AM"
    f.pmSymbol = context.isArabic ? "م" : "PM"
    return f.string(from: date)
}

func formatCountdown(_ remaining: String, _ context: WidgetContext) -> String {
    if remaining == "--:--" || remaining.isEmpty { return context.isArabic ? "بعد —" : "in —" }
    let formatted = applyNumeralsTo(remaining, context)
    return context.isArabic ? "بعد \(formatted)" : "in \(formatted)"
}

/// Tighter countdown variant for the small Prayer Table header.
func compactCountdown(_ remaining: String, _ context: WidgetContext) -> String {
    if remaining == "--:--" || remaining.isEmpty { return context.isArabic ? "بعد —" : "in —" }
    let formatted = applyNumeralsTo(remaining, context)
    return context.isArabic ? "بعد \(formatted)" : "in \(formatted)"
}

/// Bare countdown without prefix — used in tight lock-screen views.
func bareCountdown(_ remaining: String, _ context: WidgetContext) -> String {
    if remaining == "--:--" || remaining.isEmpty { return "—" }
    return applyNumeralsTo(remaining, context)
}

func latinToArabicDigits(_ value: String) -> String {
    let map: [Character: Character] = ["0":"٠", "1":"١", "2":"٢", "3":"٣", "4":"٤", "5":"٥", "6":"٦", "7":"٧", "8":"٨", "9":"٩"]
    return String(value.map { map[$0] ?? $0 })
}

func prayerSymbol(_ key: String) -> String {
    let k = key.lowercased()
    if k.contains("fajr") { return "sunrise" }
    if k.contains("sun") { return "sunrise.fill" }
    if k.contains("dhuhr") { return "sun.max.fill" }
    if k.contains("asr") { return "sun.haze.fill" }
    if k.contains("maghrib") { return "sunset.fill" }
    if k.contains("isha") { return "moon.fill" }
    return "sun.max.fill"
}

// MARK: - Phase C: WidgetImageView (snapshot-based renderer)
//
// Loads `widgets/<widgetId>_<size>.png` from the App Group container (written
// by lib/widgets/snapshot.tsx) and overlays a live countdown / current-time
// text on top where applicable. This is the canonical body for every Rooh
// home widget after Phase C.

private let widgetImageAppGroupId = "group.com.rooh.almuslim"

private func widgetImageURL(id: String, size: String, theme: String) -> URL? {
    return widgetImageURLForKey("\(id)_\(size)_\(theme)")
}

private func widgetImageURLForKey(_ key: String) -> URL? {
    guard let container = FileManager.default.containerURL(
        forSecurityApplicationGroupIdentifier: widgetImageAppGroupId
    ) else { return nil }
    return container
        .appendingPathComponent("widgets", isDirectory: true)
        .appendingPathComponent("\(key).png")
}

/// Load the per-theme PNG with a graceful fallback chain (plan §G):
///
///   1. exact match: `<id>_<size>_<resolvedTheme>.png`
///   2. user's app-level theme: `<id>_<size>_<appLevelTheme>.png`
///   3. final default: `<id>_<size>_dark.png`
///
/// If all three miss, returns nil and the caller renders a themed placeholder
/// (rather than alpha-transparent emptiness). Each fallback that fires logs
/// one line so we can spot regressions.
private func loadWidgetImage(id: String, size: String, theme: String, appLevelTheme: String?, data: SharedWidgetData?) -> UIImage? {
    let routeKey = "\(id)_\(size)_\(theme)"
    if let entry = data?.snapshotManifest?[routeKey],
       let key = entry.key,
       let url = widgetImageURLForKey(key),
       let img = UIImage(contentsOfFile: url.path) {
        NSLog("[widget/ios] loaded snapshot route=%@ key=%@ path=%@ hash=%@", routeKey, key, url.path, entry.hash ?? "n/a")
        return img
    }
    if let entry = data?.snapshotManifest?[routeKey] {
        let attemptedKey = entry.key ?? routeKey
        let attemptedPath = widgetImageURLForKey(attemptedKey)?.path ?? "n/a"
        NSLog("[widget/ios] fallback reason=manifest_png_missing route=%@ key=%@ path=%@", routeKey, attemptedKey, attemptedPath)
    } else {
        NSLog("[widget/ios] fallback reason=manifest_entry_missing route=%@", routeKey)
    }

    if let url = widgetImageURL(id: id, size: size, theme: theme),
       let img = UIImage(contentsOfFile: url.path) {
        NSLog("[widget/ios] loaded legacy snapshot key=%@ path=%@", routeKey, url.path)
        return img
    }
    NSLog("[widget/ios] fallback reason=legacy_png_missing key=%@", routeKey)
    if let appLevel = appLevelTheme, appLevel != theme,
       let url = widgetImageURL(id: id, size: size, theme: appLevel),
       let img = UIImage(contentsOfFile: url.path) {
        NSLog("[widget/ios] loaded fallback app-level key=%@_%@_%@ path=%@", id, size, appLevel, url.path)
        return img
    }
    if theme != "light",
       let url = widgetImageURL(id: id, size: size, theme: "light"),
       let img = UIImage(contentsOfFile: url.path) {
        NSLog("[widget/ios] loaded fallback light key=%@_%@_light path=%@", id, size, url.path)
        return img
    }
    return nil
}

private func widgetSnapshotSizeString(_ family: WidgetFamily) -> String {
    switch family {
    case .systemSmall: return "small"
    case .systemMedium: return "medium"
    case .systemLarge: return "large"
    default: return "small"
    }
}

private struct LiveOverlayAnchor {
    let x: CGFloat
    let y: CGFloat
    let width: CGFloat
    let fontSize: CGFloat
    let fontFamily: String
    let alignment: Alignment
    let textAlignment: TextAlignment
    let compact: Bool
}

private enum LiveOverlayKind: Hashable {
    case none
    case prayerNextCountdown
    case prayerPreviousCountdown
    case currentTime
    // Hybrid overlay kinds — render the dynamic numbers/names on top of the
    // PNG snapshot so prayer widgets stay correct for 7+ days without the app
    // being opened. Times are derived live from SharedWidgetData.prayer.allPrayerEpochs.
    case prayerHeroName       // big prayer name in single/table hero (next prayer)
    case prayerHeroTime       // big prayer time in single/table hero (next prayer)
    case prayerPreviousName   // previous-prayer name in next/previous widget
    case prayerPreviousTime   // previous-prayer time in next/previous widget
    case prayerRowTime(Int)   // row index 0..5 (Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha)
    case prayerRowHighlight(Int) // active-row background tint at row 0..5
}

/// Map a manifest anchor id (emitted by `<AnchorReporter>` in the React
/// preview) to the matching `LiveOverlayKind` consumed by `liveOverlayView`.
/// Returns `nil` for unknown ids so the iOS overlay layer silently skips
/// any future anchors the native side doesn't know how to draw yet — keeps
/// the manifest forward-compatible.
private func overlayKindForAnchorId(_ id: String) -> LiveOverlayKind? {
    if id == "currentTime"            { return .currentTime }
    if id == "prayerHeroTime"         { return .prayerHeroTime }
    if id == "prayerHeroName"         { return .prayerHeroName }
    if id == "prayerHeroCountdown"    { return .prayerNextCountdown }
    if id == "prayerPrevTime"         { return .prayerPreviousTime }
    if id == "prayerPrevName"         { return .prayerPreviousName }
    if id == "prayerUntilCountdown"   { return .prayerNextCountdown }
    if id == "prayerSinceCountdown"   { return .prayerPreviousCountdown }
    if id.hasPrefix("prayerRowTime.") {
        let key = String(id.dropFirst("prayerRowTime.".count))
        switch key {
        case "fajr":    return .prayerRowTime(0)
        case "sunrise": return .prayerRowTime(1)
        case "dhuhr":   return .prayerRowTime(2)
        case "asr":     return .prayerRowTime(3)
        case "maghrib": return .prayerRowTime(4)
        case "isha":    return .prayerRowTime(5)
        default:        return nil
        }
    }
    return nil
}

/// Translate a manifest anchor into the legacy `LiveOverlayAnchor` shape
/// consumed by `liveOverlayView`. Coordinates stay in dp; `liveOverlayView`
/// already scales by `geoSize.width / dims.width`, where `dims` is the
/// captured-frame size — we pass that via the manifest entry below.
private func liveAnchorFromManifest(_ a: WidgetManifestAnchor) -> LiveOverlayAnchor {
    let alignment: Alignment = {
        switch a.alignment {
        case "leading":  return .leading
        case "trailing": return .trailing
        default:         return .center
        }
    }()
    let textAlignment: TextAlignment = {
        switch a.alignment {
        case "leading":  return .leading
        case "trailing": return .trailing
        default:         return .center
        }
    }()
    return LiveOverlayAnchor(
        x: CGFloat(a.x + a.width * 0.5),
        y: CGFloat(a.y + a.height * 0.5),
        width: CGFloat(a.width),
        fontSize: CGFloat(a.fontSize),
        fontFamily: a.fontFamily,
        alignment: alignment,
        textAlignment: textAlignment,
        compact: a.isCountdown == true
    )
}

/// Resolve the manifest entry for `(widgetId, family, resolvedTheme)`. Prefers
/// the exact theme match so the PNG and the anchors come from the same render
/// run; falls back to any theme variant when the exact one is missing (anchor
/// positions are layout-only and theme-independent, so this fallback is safe).
private func resolveManifestEntry(
    widgetId: String,
    family: WidgetFamily,
    theme: RoohTheme,
    data: SharedWidgetData?
) -> WidgetSnapshotManifestEntry? {
    let size = widgetSnapshotSizeString(family)
    let themeKey = resolvedThemeString(theme)
    let exactKey = "\(widgetId)_\(size)_\(themeKey)"
    guard let manifest = data?.snapshotManifest else { return nil }
    if let exact = manifest[exactKey] { return exact }
    let prefix = "\(widgetId)_\(size)_"
    return manifest.first { $0.key.hasPrefix(prefix) }?.value
}

/// If the snapshot manifest carries anchors for this entry (preferred path —
/// gallery is the source of truth), translate them into `(kind, anchor)` pairs.
/// Returns an empty array when the entry has no anchors so the caller can fall
/// back to the legacy hand-typed `widgetOverlayAnchors` table.
private func manifestOverlayAnchors(
    widgetId: String,
    family: WidgetFamily,
    theme: RoohTheme,
    data: SharedWidgetData?
) -> [(LiveOverlayKind, LiveOverlayAnchor)] {
    guard let entry = resolveManifestEntry(widgetId: widgetId, family: family, theme: theme, data: data),
          let anchors = entry.anchors, !anchors.isEmpty else { return [] }
    return anchors.compactMap { a -> (LiveOverlayKind, LiveOverlayAnchor)? in
        guard let kind = overlayKindForAnchorId(a.id) else { return nil }
        return (kind, liveAnchorFromManifest(a))
    }
}

/// Captured frame dimensions for the entry, in dp.
private func manifestCapturedDims(
    widgetId: String,
    family: WidgetFamily,
    theme: RoohTheme,
    data: SharedWidgetData?
) -> CGSize? {
    guard let entry = resolveManifestEntry(widgetId: widgetId, family: family, theme: theme, data: data),
          let w = entry.capturedWidth, let h = entry.capturedHeight, w > 0, h > 0 else { return nil }
    return CGSize(width: w, height: h)
}

/// Anchor table — countdown / current-time overlays drawn on top of the PNG
/// snapshot. Anchor coordinates match the transparent rectangles the RN
/// preview leaves when `forSnapshot=true`.
private func widgetOverlayAnchors(id: String, family: WidgetFamily) -> [(LiveOverlayKind, LiveOverlayAnchor)] {
    let size = widgetSnapshotSizeString(family)
    switch (id, size) {
    case ("dayDigital", "small"):
        return [(.currentTime, LiveOverlayAnchor(x: 78, y: 70, width: 120, fontSize: 44, fontFamily: "Rubik-Bold", alignment: .center, textAlignment: .center, compact: false))]
    case ("prayerSingle", "small"):
        return [(.prayerNextCountdown, LiveOverlayAnchor(x: 78, y: 130, width: 110, fontSize: 10, fontFamily: "Rubik-Medium", alignment: .center, textAlignment: .center, compact: false))]
    case ("prayerTable", "small"):
        return [(.prayerNextCountdown, LiveOverlayAnchor(x: 44, y: 24, width: 82, fontSize: 9, fontFamily: "Rubik-Medium", alignment: .leading, textAlignment: .leading, compact: true))]
    case ("prayerTable", "medium"):
        return [(.prayerNextCountdown, LiveOverlayAnchor(x: 246, y: 130, width: 112, fontSize: 9, fontFamily: "Rubik-Medium", alignment: .center, textAlignment: .center, compact: false))]
    case ("prayerTable", "large"):
        return [(.prayerNextCountdown, LiveOverlayAnchor(x: 213, y: 114, width: 176, fontSize: 12, fontFamily: "Rubik-Medium", alignment: .trailing, textAlignment: .trailing, compact: false))]
    case ("prayerNextPrevious", "medium"):
        return [
            (.prayerNextCountdown, LiveOverlayAnchor(x: 91, y: 118, width: 118, fontSize: 9, fontFamily: "Rubik-Medium", alignment: .center, textAlignment: .center, compact: false)),
            (.prayerPreviousCountdown, LiveOverlayAnchor(x: 238, y: 118, width: 118, fontSize: 9, fontFamily: "Rubik-Medium", alignment: .center, textAlignment: .center, compact: false))
        ]
    default:
        return []
    }
}

private func overlaySwiftUIColor(kind: LiveOverlayKind, _ p: ThemePalette) -> Color {
    switch kind {
    case .prayerNextCountdown, .prayerPreviousCountdown:
        return p.muted
    case .prayerRowTime(let idx):
        // Active row is the "next" prayer — slightly emphasized. Without
        // pre-computing which idx is active here we'd need a closure; use a
        // single color and let the eye pick out the highlight from layout.
        // We cannot easily branch on isNext at color-resolution time (kind only
        // knows the index), so render all rows as text color and accept that
        // muted/active distinction comes from the underlying PNG (which keeps
        // the active highlight tint from the gallery snapshot).
        _ = idx
        return p.text
    default:
        return p.text
    }
}

/// Resolve the 7-day flat epoch list the widget renders from. Source order:
///   1. **App's canonical epochs** when they're FRESH — i.e. at least one
///      entry is in the future. Matches the app's Prayer tab exactly (same
///      calculation method, timezone, location) so the widget never disagrees
///      with the app while both are in sync.
///   2. **Offline PrayerCalculator** (vendored adhan-swift) when app data is
///      stale (no future entries) OR missing entirely. Computes prayer times
///      locally from `PrayerInputs` (written by the app on first launch +
///      whenever location/method changes). Keeps the widget functional
///      indefinitely without the app ever being opened again — this is the
///      "Glassify-style standalone widget" behavior the user expects: open
///      the app once to grant permissions and pick a location, then the
///      widget runs forever on its own.
///   3. **`data.prayer.allPrayers` per-item epochs** as a last-ditch fallback
///      when both above sources are unavailable.
private func prayerEpochs(_ context: WidgetContext) -> [Double] {
    let nowMs = context.date.timeIntervalSince1970 * 1000
    // App cache is always the source of truth when it has any entries — the
    // user must see the same Fajr/Isha angles in the widget as in the
    // Prayer tab. PrayerCalculator (adhan-swift, defaults to 18°/18°)
    // produces slightly different Fajr/Isha than AlAdhan API at the same
    // calculation method ID, so falling back to it on a fresh-but-no-future
    // cache produces visibly different times in the widget vs the app.
    //
    // We only fall to the calculator when the cache is COMPLETELY empty —
    // i.e. the user installed the app, hasn't opened it yet, and the widget
    // still needs SOMETHING to render. With the JS bridge now publishing
    // yesterday + today + 6 future days, the cache covers ±1 week from any
    // moment the app has run within the last week.
    let appCache = context.hasRealData ? (context.data.prayer?.allPrayerEpochs ?? []).filter { $0 > 0 }.sorted() : []
    if !appCache.isEmpty {
        // Bonus: if the cache somehow has no future entry (very stale, app
        // not opened in a week+) AND a calculator is available, splice in
        // future epochs from the calculator on top of the cached past. The
        // displayed historical times stay app-correct; only the upcoming
        // prayer falls back to local calc — vastly preferable to freezing
        // on a week-old timeline.
        if !appCache.contains(where: { $0 > nowMs }), let calc = PrayerCalculator.loadFromAppGroup() {
            let cal = Calendar(identifier: .gregorian)
            let start = cal.startOfDay(for: context.date)
            let extra = calc.allPrayerEpochsMs(from: start, days: 9).map { Double($0) }
                .filter { $0 > nowMs }
            return (appCache + extra).sorted()
        }
        return appCache
    }
    if let calc = PrayerCalculator.loadFromAppGroup() {
        let cal = Calendar(identifier: .gregorian)
        let start = cal.date(byAdding: .day, value: -1, to: context.date) ?? context.date
        let epochs = calc.allPrayerEpochsMs(from: start, days: 9).map { Double($0) }
        if !epochs.isEmpty { return epochs }
    }
    return (context.data.prayer?.allPrayers ?? [])
        .compactMap { item in
            guard let epoch = item.epochMs, epoch > 0 else { return nil }
            return epoch
        }
        .sorted()
}

/// The IANA timezone the widget should DISPLAY times in. Source of truth:
///   1. `context.data.prayer.timezone` — written by the app from the AlAdhan
///      response's `meta.timezone` (matches what the Prayer tab shows).
///   2. `PrayerInputs.read()?.resolvedTimeZone` — the App Group inputs JSON
///      written via `writePrayerInputs()`. Has the location's tz when the
///      bridge resolves it from the canonical snapshot.
///   3. `TimeZone.current` — last-resort fallback (device tz). Almost never
///      what we want, but better than crashing.
private func widgetDisplayTimeZone(_ context: WidgetContext) -> TimeZone {
    if let tzId = context.data.prayer?.timezone, let tz = TimeZone(identifier: tzId) {
        return tz
    }
    if let inputs = PrayerInputs.read() {
        return inputs.resolvedTimeZone
    }
    return TimeZone.current
}

/// Returns today's six prayers (Fajr → Isha) computed live from the 7-day
/// flat epoch list in shared widget data. This is the source of truth for the
/// hybrid overlay so the home-screen widget shows correct times for any day
/// covered by `allPrayerEpochs` even if the app hasn't been opened in days.
///
/// The flat epoch list is sorted; for any given calendar day in the device's
/// local timezone we take the first 6 epochs falling on that day and map them
/// to the canonical prayer order: [Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha].
/// If the count for "today" is less than 6 (edge case after install), we fall
/// back to `allPrayers` for the missing slots so the widget never goes empty.
private func todaysPrayersFromContext(_ context: WidgetContext) -> [WidgetPrayerItem] {
    let fallback = context.data.prayer?.allPrayers ?? []
    let prayerOrder: [(en: String, ar: String)] = [
        ("Fajr", "الفجر"),
        ("Sunrise", "الشروق"),
        (PrayerKey.dhuhr.englishName, PrayerKey.dhuhr.arabicName),
        ("Asr", "العصر"),
        ("Maghrib", "المغرب"),
        ("Isha", "العشاء")
    ]

    let epochs = prayerEpochs(context) // sorted ascending
    // CRITICAL: "today" boundary must be in the LOCATION's timezone, not the
    // device's. Otherwise SF prayers (Asr/Maghrib/Isha) that fall after
    // midnight UTC get classified as "tomorrow" when the device is in Cairo
    // (or any tz east of the location), and the widget shows the WRONG
    // prayers + wrong hero. Source of truth is `widgetDisplayTimeZone`.
    var cal = Calendar(identifier: .gregorian)
    cal.timeZone = widgetDisplayTimeZone(context)
    let today = cal.startOfDay(for: context.date)
    let tomorrow = cal.date(byAdding: .day, value: 1, to: today) ?? today

    let todaysEpochs = epochs.filter { ms in
        let d = Date(timeIntervalSince1970: ms / 1000)
        return d >= today && d < tomorrow
    }

    let nowMs = context.date.timeIntervalSince1970 * 1000
    let nextEpoch = epochs.first { $0 > nowMs }

    var items: [WidgetPrayerItem] = []
    for (idx, info) in prayerOrder.enumerated() {
        if idx < todaysEpochs.count {
            let ms = todaysEpochs[idx]
            items.append(WidgetPrayerItem(
                name: info.en,
                nameAr: info.ar,
                time: prayerTimeFromEpoch(ms, context),
                epochMs: ms,
                isPassed: ms <= nowMs,
                isNext: ms == nextEpoch
            ))
        } else if idx < fallback.count {
            // Fall back to per-day items if today's epoch list is short
            var it = fallback[idx]
            it.name = it.name ?? info.en
            it.nameAr = it.nameAr ?? info.ar
            items.append(it)
        } else {
            items.append(WidgetPrayerItem(
                name: info.en,
                nameAr: info.ar,
                time: "--:--",
                epochMs: nil,
                isPassed: false,
                isNext: false
            ))
        }
    }
    return items
}

/// Returns the prayer currently considered "next" — the first today's prayer
/// whose epoch is strictly after now, or the first prayer of tomorrow if Isha
/// has already passed.
private func todaysNextPrayer(_ context: WidgetContext) -> WidgetPrayerItem {
    let items = todaysPrayersFromContext(context)
    let nowMs = context.date.timeIntervalSince1970 * 1000
    if let next = items.first(where: { ($0.epochMs ?? 0) > nowMs }) {
        return next
    }
    // After Isha: surface tomorrow's Fajr if we have its epoch.
    let nextEpoch = prayerEpochs(context).first { $0 > nowMs }
    if let nextEpoch = nextEpoch {
        return WidgetPrayerItem(
            name: "Fajr",
            nameAr: "الفجر",
            time: prayerTimeFromEpoch(nextEpoch, context),
            epochMs: nextEpoch,
            isPassed: false,
            isNext: true
        )
    }
    return items.last ?? WidgetPrayerItem(name: "Fajr", nameAr: "الفجر", time: "--:--", epochMs: nil, isPassed: false, isNext: true)
}

/// Returns the prayer immediately before `todaysNextPrayer` — used by the
/// next/previous widget.
private func todaysPreviousPrayer(_ context: WidgetContext) -> WidgetPrayerItem {
    let items = todaysPrayersFromContext(context)
    let nowMs = context.date.timeIntervalSince1970 * 1000
    if let prev = items.last(where: { ($0.epochMs ?? 0) <= nowMs }) {
        return prev
    }
    // Before today's Fajr: look at yesterday's Isha via the 7-day list.
    if let yesterdayIsha = prayerEpochs(context).last(where: { $0 <= nowMs }) {
        return WidgetPrayerItem(
            name: "Isha",
            nameAr: "العشاء",
            time: prayerTimeFromEpoch(yesterdayIsha, context),
            epochMs: yesterdayIsha,
            isPassed: true,
            isNext: false
        )
    }
    // Before today's Fajr: surface yesterday's Isha at minimum (epoch unknown,
    // fall back to context.data.prayer.previousPrayer*).
    let p = context.data.prayer
    return WidgetPrayerItem(
        name: p?.previousPrayerName,
        nameAr: p?.previousPrayerNameAr,
        time: prayerTimeFromEpoch(p?.previousPrayerAtEpochMs, context),
        epochMs: p?.previousPrayerAtEpochMs,
        isPassed: true,
        isNext: false
    )
}

private func resolvedNextPrayerEpochMs(_ context: WidgetContext) -> Double {
    let nowMs = context.date.timeIntervalSince1970 * 1000
    if let next = prayerEpochs(context).first(where: { $0 > nowMs }) {
        return next
    }
    return context.data.prayer?.nextPrayerAtEpochMs ?? 0
}

private func resolvedPreviousPrayerEpochMs(_ context: WidgetContext) -> Double {
    let nowMs = context.date.timeIntervalSince1970 * 1000
    if let previous = prayerEpochs(context).last(where: { $0 <= nowMs }) {
        return previous
    }
    return context.data.prayer?.previousPrayerAtEpochMs ?? 0
}

private func widgetLiveText(kind: LiveOverlayKind, context: WidgetContext) -> String {
    switch kind {
    case .none:
        return ""
    case .currentTime:
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "HH:mm"
        let raw = f.string(from: context.date)
        return context.usesArabicNumerals ? latinToArabicDigits(raw) : raw
    case .prayerNextCountdown:
        let targetMs = resolvedNextPrayerEpochMs(context)
        guard targetMs > 1000 else { return "" }
        let targetDate = Date(timeIntervalSince1970: targetMs / 1000)
        return PrayerDurationFormat.untilWithPrefix(targetDate, from: context.date, language: context.isArabic ? "ar" : "en")
    case .prayerPreviousCountdown:
        let targetMs = resolvedPreviousPrayerEpochMs(context)
        guard targetMs > 1000 else { return "" }
        let targetDate = Date(timeIntervalSince1970: targetMs / 1000)
        return PrayerDurationFormat.sinceWithPrefix(targetDate, from: context.date, language: context.isArabic ? "ar" : "en")
    case .prayerHeroName, .prayerHeroTime, .prayerPreviousName, .prayerPreviousTime,
         .prayerRowTime, .prayerRowHighlight:
        // These kinds are rendered directly by liveOverlayView using helper
        // functions (todaysPrayersFromContext / todaysNextPrayer / etc).
        // widgetLiveText is only used for the default static-text path.
        return ""
    }
}

private func widgetSizeDims(_ family: WidgetFamily) -> CGSize {
    switch family {
    case .systemSmall: return CGSize(width: 155, height: 155)
    case .systemMedium: return CGSize(width: 329, height: 155)
    case .systemLarge: return CGSize(width: 329, height: 345)
    default: return CGSize(width: 155, height: 155)
    }
}

private func widgetDeepLink(_ widgetId: String) -> String {
    switch widgetId {
    case "verseOfDay": return "rooh-almuslim://daily-ayah"
    case "azkarMorning": return "rooh-almuslim://azkar/morning"
    case "azkarEvening": return "rooh-almuslim://azkar/evening"
    case "dailyDhikr": return "rooh-almuslim://azkar"
    case "prayerSingle", "prayerTable", "prayerNextPrevious": return "rooh-almuslim://prayer"
    default: return "rooh-almuslim://hijri"
    }
}

private func isPrayerHomeWidget(_ widgetId: String) -> Bool {
    return widgetId == "prayerSingle" || widgetId == "prayerTable" || widgetId == "prayerNextPrevious"
}

/// Date/time widgets rendered natively (using context.date) — never stale PNG.
private func isDateHomeWidget(_ widgetId: String) -> Bool {
    return ["daySimple", "dayThuluth", "dayDigital", "monthSimple", "monthThuluth"].contains(widgetId)
}

@ViewBuilder
private func dynamicDateHomeView(widgetId: String, family: WidgetFamily, context: WidgetContext, palette p: ThemePalette) -> some View {
    ZStack {
        RoundedRectangle(cornerRadius: family == .systemSmall ? 28 : 32)
            .fill(p.background)
            .overlay(
                RoundedRectangle(cornerRadius: family == .systemSmall ? 28 : 32)
                    .stroke(p.isLight ? Color.black.opacity(0.08) : Color.white.opacity(0.10), lineWidth: 0.5)
            )
        switch widgetId {
        case "dayDigital":
            DayDigitalView(context: context)
        case "dayThuluth":
            DayThuluthView(context: context, family: family)
        case "monthSimple":
            MonthSimpleView(context: context)
        case "monthThuluth":
            MonthThuluthView(context: context, family: family)
        default:
            DaySimpleView(context: context, family: family)
        }
    }
}

@ViewBuilder
private func dynamicPrayerHomeView(widgetId: String, family: WidgetFamily, context: WidgetContext, palette p: ThemePalette) -> some View {
    // Glassify-style: pure SwiftUI for every prayer widget. No PNG, no overlay.
    // Data flows from PrayerCalculator (offline adhan-swift) via the prayer
    // helpers below, so the widget recomputes daily without the app running.
    ZStack {
        RoundedRectangle(cornerRadius: family == .systemSmall ? 28 : 32)
            .fill(p.background)
        switch widgetId {
        case "prayerSingle":
            PrayerSingleView(context: context)
        case "prayerNextPrevious":
            PrayerNextPreviousView(context: context)
        default:
            PrayerTableView(context: context, family: family)
        }
    }
}

/// Branded loading card shown when no PNG snapshot exists yet for the placed
/// widget. Renders the app icon + wordmark + dotted spinner over the themed
/// background. In debug builds, also surfaces the missing key so a regression
/// is obvious without going to the dev tools screen.
struct BrandedFallbackView: View {
    let widgetId: String
    let sizeName: String
    let themeKey: String
    let palette: ThemePalette
    let dims: CGSize

    var body: some View {
        ZStack {
            Rectangle()
                .fill(palette.background)
                .frame(width: dims.width, height: dims.height)
            VStack(spacing: 6) {
                Image("WidgetIcon")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 28, height: 28)
                    .opacity(0.9)
                Text("روح المسلم")
                    .font(.custom("WidgetFont", size: 13))
                    .foregroundStyle(palette.text)
                    .lineLimit(1)
                Image(systemName: "circle.dotted")
                    .font(.system(size: 10, weight: .light))
                    .foregroundStyle(palette.muted)
                #if DEBUG
                Text("Missing: \(widgetId)_\(sizeName)_\(themeKey)")
                    .font(.system(size: 7))
                    .foregroundStyle(palette.muted)
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 4)
                #endif
            }
        }
        .frame(width: dims.width, height: dims.height)
    }
}

/// Builds a single overlay view (live countdown / current time / static label)
/// positioned and scaled to match the PNG snapshot's anchor coordinates.
/// Prayer countdowns use `PrayerDurationFormat` so WidgetKit and the gallery
/// render the same compact text.
@ViewBuilder
private func liveOverlayView(
    kind: LiveOverlayKind,
    anchor: LiveOverlayAnchor,
    context: WidgetContext,
    palette pal: ThemePalette,
    geoSize: CGSize,
    dims: CGSize
) -> some View {
    let scaleX = geoSize.width / dims.width
    let scaleY = geoSize.height / dims.height
    let scaledFont = anchor.fontSize * min(scaleX, scaleY)
    let arabicLocale = context.usesArabicNumerals ? Locale(identifier: "ar_EG") : Locale(identifier: "en_US_POSIX")
    let baseFont = Font.custom(anchor.fontFamily, size: scaledFont)
    let fg = overlaySwiftUIColor(kind: kind, pal)

    switch kind {
    case .prayerNextCountdown:
        let epochMs = resolvedNextPrayerEpochMs(context)
        if epochMs > 1000 {
            let timerDate = Date(timeIntervalSince1970: epochMs / 1000)
            HStack(spacing: anchor.compact ? 1 : 3) {
                Text(context.isArabic ? "بعد" : "in")
                Text(PrayerDurationFormat.until(timerDate, from: context.date, language: context.isArabic ? "ar" : "en"))
                    .environment(\.locale, arabicLocale)
            }
            .font(baseFont)
            .foregroundStyle(fg)
            .lineLimit(1)
            .minimumScaleFactor(0.85)
            .multilineTextAlignment(anchor.textAlignment)
            .frame(width: anchor.width * scaleX, alignment: anchor.alignment)
            .position(x: anchor.x * scaleX, y: anchor.y * scaleY)
            .environment(\.layoutDirection, .leftToRight)
        }
    case .prayerPreviousCountdown:
        let epochMs = resolvedPreviousPrayerEpochMs(context)
        if epochMs > 1000 {
            let timerDate = Date(timeIntervalSince1970: epochMs / 1000)
            HStack(spacing: anchor.compact ? 1 : 3) {
                if context.isArabic {
                    Text("منذ")
                    Text(PrayerDurationFormat.since(timerDate, from: context.date, language: context.isArabic ? "ar" : "en")).environment(\.locale, arabicLocale)
                } else {
                    Text(PrayerDurationFormat.since(timerDate, from: context.date, language: context.isArabic ? "ar" : "en")).environment(\.locale, arabicLocale)
                    Text("ago")
                }
            }
            .font(baseFont)
            .foregroundStyle(fg)
            .lineLimit(1)
            .minimumScaleFactor(0.85)
            .multilineTextAlignment(anchor.textAlignment)
            .frame(width: anchor.width * scaleX, alignment: anchor.alignment)
            .position(x: anchor.x * scaleX, y: anchor.y * scaleY)
            .environment(\.layoutDirection, .leftToRight)
        }
    case .prayerHeroName:
        let item = todaysNextPrayer(context)
        let name = context.isArabic ? (item.nameAr ?? "الفجر") : (item.name ?? "Fajr")
        Text(name)
            .font(baseFont)
            .foregroundStyle(fg)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
            .multilineTextAlignment(anchor.textAlignment)
            .frame(width: anchor.width * scaleX, alignment: anchor.alignment)
            .position(x: anchor.x * scaleX, y: anchor.y * scaleY)
    case .prayerHeroTime:
        let item = todaysNextPrayer(context)
        let timeStr = prayerTimeFromEpoch(item.epochMs, context)
        Text(timeStr)
            .font(baseFont)
            .foregroundStyle(fg)
            .lineLimit(1)
            .minimumScaleFactor(0.6)
            .kerning(-0.5)
            .multilineTextAlignment(anchor.textAlignment)
            .frame(width: anchor.width * scaleX, alignment: anchor.alignment)
            .position(x: anchor.x * scaleX, y: anchor.y * scaleY)
    case .prayerPreviousName:
        let item = todaysPreviousPrayer(context)
        let name = context.isArabic ? (item.nameAr ?? "العشاء") : (item.name ?? "Isha")
        Text(name)
            .font(baseFont)
            .foregroundStyle(fg)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
            .multilineTextAlignment(anchor.textAlignment)
            .frame(width: anchor.width * scaleX, alignment: anchor.alignment)
            .position(x: anchor.x * scaleX, y: anchor.y * scaleY)
    case .prayerPreviousTime:
        let item = todaysPreviousPrayer(context)
        let timeStr = prayerTimeFromEpoch(item.epochMs, context)
        Text(timeStr)
            .font(baseFont)
            .foregroundStyle(fg)
            .lineLimit(1)
            .minimumScaleFactor(0.6)
            .kerning(-0.5)
            .multilineTextAlignment(anchor.textAlignment)
            .frame(width: anchor.width * scaleX, alignment: anchor.alignment)
            .position(x: anchor.x * scaleX, y: anchor.y * scaleY)
    case .prayerRowTime(let idx):
        let items = todaysPrayersFromContext(context)
        if idx >= 0 && idx < items.count {
            let timeStr = prayerTimeFromEpoch(items[idx].epochMs, context)
            Text(timeStr)
                .font(baseFont)
                .foregroundStyle(fg)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
                .kerning(-0.3)
                .multilineTextAlignment(anchor.textAlignment)
                .frame(width: anchor.width * scaleX, alignment: anchor.alignment)
                .position(x: anchor.x * scaleX, y: anchor.y * scaleY)
        }
    case .prayerRowHighlight:
        // Highlight not yet wired up — left as placeholder for follow-up.
        EmptyView()
    default:
        let raw = widgetLiveText(kind: kind, context: context)
        let str = raw
        if !str.isEmpty {
            Text(str)
                .font(baseFont)
                .foregroundStyle(fg)
                .lineLimit(1)
                .minimumScaleFactor(0.85)
                .multilineTextAlignment(anchor.textAlignment)
                .frame(width: anchor.width * scaleX, alignment: anchor.alignment)
                .position(x: anchor.x * scaleX, y: anchor.y * scaleY)
                .environment(\.layoutDirection, .leftToRight)
        }
    }
}

struct WidgetImageView: View {
    let widgetId: String
    let family: WidgetFamily
    let context: WidgetContext
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        // `context.theme` is already resolved by the router; re-running the
        // resolver is a no-op on concrete values and a safety net if a future
        // caller forgets.
        let resolvedTheme = resolvedRoohTheme(context.theme, colorScheme: colorScheme)

        // Prayer widgets: pure SwiftUI, no PNG bake, no overlay anchors.
        // Data comes from PrayerCalculator (offline adhan-swift) so the widget
        // updates daily forever without the app being opened. Matches the
        // Glassify architecture. Renders natively whenever EITHER the offline
        // calculator inputs (lat/lng/method) are available in the App Group OR
        // the JS bridge has written prayer epochs — both yield real data.
        if isPrayerHomeWidget(widgetId) && (PrayerInputs.read() != nil || context.hasRealData) {
            let pal = palette(resolvedTheme)
            dynamicPrayerHomeView(widgetId: widgetId, family: family, context: context, palette: pal)
                .widgetURL(URL(string: widgetDeepLink(widgetId)))
        } else if widgetId == "azkarMorning" || widgetId == "azkarEvening" {
            // Azkar widgets pick from BundledAzkar.morning / .evening (the
            // full 45 morning + 13 evening set bundled in the extension),
            // cycling by minute-of-day. Works offline forever — no
            // dependency on the app being opened.
            let titleAr = widgetId == "azkarMorning" ? "أذكار الصباح" : "أذكار المساء"
            let titleEn = widgetId == "azkarMorning" ? "Morning Azkar" : "Evening Azkar"
            let pool = widgetId == "azkarMorning" ? BundledAzkar.morning : BundledAzkar.evening
            ZStack {
                RoundedRectangle(cornerRadius: family == .systemSmall ? 28 : 32)
                    .fill(palette(resolvedTheme).background)
                AzkarQuoteView(context: context, pool: pool, title: titleAr, titleEn: titleEn)
            }
            .widgetURL(URL(string: widgetDeepLink(widgetId)))
        } else if widgetId == "dailyDhikr" {
            // Daily Dhikr widget renders pure SwiftUI via DailyDhikrView —
            // reads `data.dhikr` from the App Group. Cached dhikr persists
            // across launches so the widget keeps showing content even if
            // the user hasn't opened the app for a long time.
            ZStack {
                RoundedRectangle(cornerRadius: family == .systemSmall ? 28 : 32)
                    .fill(palette(resolvedTheme).background)
                DailyDhikrView(context: context)
            }
            .widgetURL(URL(string: widgetDeepLink(widgetId)))
        } else if !context.hasRealData {
            // App has never been opened: bail out before rendering any
            // sample-data card. Tap-to-open routes the user to the app.
            AppNotOpenedView(family: family, theme: resolvedTheme)
                .widgetURL(URL(string: "rooh-almuslim://"))
        } else {
            let size = widgetSnapshotSizeString(family)
            let themeKey = resolvedThemeString(resolvedTheme)
            // App-level theme (from SharedWidgetData) is the second link in the
            // fallback chain — use it when the per-config theme variant is missing.
            let appLevelKey = context.data.widgetTheme
                .map { themeFromString($0) }
                .map { resolvedRoohTheme($0, colorScheme: colorScheme) }
                .map { resolvedThemeString($0) }
            let img = loadWidgetImage(id: widgetId, size: size, theme: themeKey, appLevelTheme: appLevelKey, data: context.data)
            let dims = widgetSizeDims(family)
            // Prefer manifest-emitted anchors (gallery is the source of truth);
            // fall back to the hand-typed table only when the manifest is
            // empty so widgets whose preview hasn't been wrapped with
            // `<AnchorReporter>` yet keep working.
            let manifestOverlays = manifestOverlayAnchors(widgetId: widgetId, family: family, theme: resolvedTheme, data: context.data)
            let manifestDims = manifestCapturedDims(widgetId: widgetId, family: family, theme: resolvedTheme, data: context.data)
            let usingManifest = !manifestOverlays.isEmpty
            // Set of widgets whose preview has been wrapped with
            // `<AnchorReporter>` and is therefore EXPECTED to ship anchors.
            // In DEBUG, if any of these falls back to legacy anchors, we
            // render a visible "MANIFEST MISSING" placeholder so silent
            // fallback can never hide a regression.
            let wrappedWidgets: Set<String> = ["prayerTable"]
            let widgetSize = widgetSnapshotSizeString(family)
            let expectedToHaveManifest = wrappedWidgets.contains(widgetId) && widgetSize == "medium"
            let overlays = usingManifest
                ? manifestOverlays
                : widgetOverlayAnchors(id: widgetId, family: family)
            let _ = NSLog("[widget/ios] overlay-source widgetId=%@ size=%@ source=%@ count=%d capturedDims=%@ isArabic=%@ tz=%@ themeKey=%@",
                          widgetId, size,
                          usingManifest ? "manifest" : "legacy",
                          overlays.count,
                          manifestDims.map { "\($0.width)x\($0.height)" } ?? "n/a",
                          context.isArabic ? "ar" : "en",
                          context.data.prayer?.timezone ?? "n/a",
                          themeKey)
            let pal = palette(resolvedTheme)

            if isDateHomeWidget(widgetId) {
                // Native SwiftUI — reads context.date directly so the date is
                // always correct even after weeks without app open. No PNG needed.
                dynamicDateHomeView(widgetId: widgetId, family: family, context: context, palette: pal)
                    .widgetURL(URL(string: widgetDeepLink(widgetId)))
            } else {
                // All other widgets (including prayer): PNG snapshot for full
                // visual fidelity with the in-app gallery preview, with the live
                // countdown drawn on top as a SwiftUI overlay. Trade-off: prayer
                // TIMES baked into the PNG go stale by minutes if the user doesn't
                // open the app for several days, but the countdown to the next
                // prayer stays accurate (uses the 7-day allPrayerEpochs).

                // Use GeometryReader so the image fills the entire widget frame
                // (eliminates the empty padding visible in earlier screenshots) AND
                // the live overlay (countdown/time) gets its absolute position
                // scaled proportionally to the real frame size — otherwise an x=78
                // anchor designed for a 155 dp PNG would land at 46% of a ~168 dp
                // iOS frame instead of the intended 50%.
                GeometryReader { geo in
                    ZStack(alignment: .topLeading) {
                        if let img = img {
                            Image(uiImage: img)
                                .resizable()
                                .scaledToFill()
                                .frame(width: geo.size.width, height: geo.size.height)
                                .clipped()
                        } else {
                            // Branded loading state — never the fallback under a transparent
                            // foreground PNG. The themed background paints behind via the
                            // widget container (containerBackground). On dev builds we also
                            // surface the missing key so regressions are obvious.
                            BrandedFallbackView(
                                widgetId: widgetId,
                                sizeName: size,
                                themeKey: themeKey,
                                palette: pal,
                                dims: dims
                            )
                        }

                        #if DEBUG
                        // Loud failure when a widget that SHOULD have manifest
                        // anchors is silently falling back to the legacy
                        // hand-typed table. Without this, silent fallback can
                        // mask "captured but anchors empty" bugs forever.
                        if img != nil && expectedToHaveManifest && !usingManifest {
                            ZStack {
                                Rectangle().fill(Color.red.opacity(0.55))
                                VStack(spacing: 2) {
                                    Text("MANIFEST MISSING")
                                        .font(.system(size: 11, weight: .bold))
                                        .foregroundColor(.white)
                                    Text("\(widgetId)_\(size)_\(themeKey)")
                                        .font(.system(size: 8))
                                        .foregroundColor(.white)
                                    Text("pump did not emit anchors")
                                        .font(.system(size: 8))
                                        .foregroundColor(.white)
                                }
                            }
                            .frame(width: geo.size.width, height: geo.size.height)
                        }
                        #endif

                        if img != nil {
                            // When anchors came from the manifest, `dims` is
                            // the React capture's frame size (e.g. 329×155 dp
                            // for medium). When anchors came from the
                            // hand-typed legacy table, `dims` is the iOS
                            // widget family size. Either way `liveOverlayView`
                            // scales by `geoSize / dims`.
                            let overlayDims = manifestDims ?? dims
                            ForEach(Array(overlays.enumerated()), id: \.offset) { _, overlay in
                                liveOverlayView(
                                    kind: overlay.0,
                                    anchor: overlay.1,
                                    context: context,
                                    palette: pal,
                                    geoSize: geo.size,
                                    dims: overlayDims
                                )
                            }
                        }

                        // Diagnostic chip removed — was rendering a small
                        // "L:0 155x155 ar Asia/Dubai" label at the top-left
                        // of every PNG-path widget in Debug builds. The
                        // user runs internal builds in Debug mode where
                        // this leaks to end users. The same info is still
                        // available via the NSLog above for development.
                    }
                    .frame(width: geo.size.width, height: geo.size.height)
                }
                .widgetURL(URL(string: widgetDeepLink(widgetId)))
            }
        }
    }
}
