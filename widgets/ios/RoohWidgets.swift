// widgets/ios/RoohWidgets.swift
// Glassify-style configurable widgets for روح المسلم

import WidgetKit
import SwiftUI
import AppIntents
import Foundation

// MARK: - App Intent Enums

enum RoohLanguage: String, AppEnum {
    case auto, ar, en
    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "اللغة")
    static var caseDisplayRepresentations: [RoohLanguage: DisplayRepresentation] = [
        .auto: "تلقائي",
        .ar: "العربية",
        .en: "English",
    ]
}

enum RoohCalendar: String, AppEnum {
    case auto, gregorian, hijri
    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "التقويم")
    static var caseDisplayRepresentations: [RoohCalendar: DisplayRepresentation] = [
        .auto: "تلقائي",
        .gregorian: "ميلادي",
        .hijri: "هجري",
    ]
}

enum RoohNumerals: String, AppEnum {
    case auto, latin, arabic
    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "الأرقام")
    static var caseDisplayRepresentations: [RoohNumerals: DisplayRepresentation] = [
        .auto: "تلقائي",
        .latin: "123",
        .arabic: "١٢٣",
    ]
}

enum RoohTheme: String, AppEnum {
    case auto, light, dark, olive, green, blue, desert, slate
    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "المظهر")
    static var caseDisplayRepresentations: [RoohTheme: DisplayRepresentation] = [
        .auto: "تلقائي",
        .light: "فاتح",
        .dark: "داكن",
        .olive: "زيتي",
        .green: "أخضر",
        .blue: "أزرق",
        .desert: "صحراوي",
        .slate: "رمادي",
    ]
}

// `RoohSmallKind`, `RoohMediumKind`, `RoohLargeKind` are generated from the
// shared widget registry in `widgets/ios/GeneratedWidgetEnums.swift`. The
// generator (`scripts/generate-widget-enum.mjs`) only emits cases for widgets
// whose registry `sizes` array contains the matching size, so unsupported
// variants no longer appear in the iOS configuration picker.

struct SmallWidgetIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "تخصيص الويدجت الصغيرة"
    static var description = IntentDescription("اختر نوع الويدجت واللغة والمظهر")

    @Parameter(title: "الويدجت") var widget: RoohSmallKind
    @Parameter(title: "اللغة") var language: RoohLanguage
    @Parameter(title: "التقويم") var calendar: RoohCalendar
    @Parameter(title: "الأرقام") var numerals: RoohNumerals
    @Parameter(title: "المظهر") var theme: RoohTheme

    init() {
        widget = .daySimple
        language = .auto
        calendar = .auto
        numerals = .auto
        theme = .auto
    }
}

struct MediumWidgetIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "تخصيص الويدجت المتوسطة"
    static var description = IntentDescription("اختر نوع الويدجت واللغة والمظهر")

    @Parameter(title: "الويدجت") var widget: RoohMediumKind
    @Parameter(title: "اللغة") var language: RoohLanguage
    @Parameter(title: "التقويم") var calendar: RoohCalendar
    @Parameter(title: "الأرقام") var numerals: RoohNumerals
    @Parameter(title: "المظهر") var theme: RoohTheme

    init() {
        widget = .daySimple
        language = .auto
        calendar = .auto
        numerals = .auto
        theme = .auto
    }
}

struct LargeWidgetIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "تخصيص الويدجت الكبيرة"
    static var description = IntentDescription("اختر نوع الويدجت واللغة والمظهر")

    @Parameter(title: "الويدجت") var widget: RoohLargeKind
    @Parameter(title: "اللغة") var language: RoohLanguage
    @Parameter(title: "التقويم") var calendar: RoohCalendar
    @Parameter(title: "الأرقام") var numerals: RoohNumerals
    @Parameter(title: "المظهر") var theme: RoohTheme

    init() {
        widget = .prayerTable
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
    var isPremium: Bool?
    var snapshotVersion: Int?
    var snapshotUpdatedAt: String?
    var snapshotManifest: [String: WidgetSnapshotManifestEntry]?
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
    var randomZikr: WidgetZikr?
    var morningCompleted: Bool?
    var eveningCompleted: Bool?
}

struct WidgetZikr: Codable {
    var id: String?
    var text: String?
    var translation: String?
    var count: Int?
    var timesLabel: String?
    var category: String?
    var categoryName: String?
    var benefit: String?
}

struct VerseWidgetData: Codable {
    var arabic: String?
    var translation: String?
    var surahName: String?
    var surahNameEn: String?
    var ayahNumber: Int?
    var numberInSurah: Int?
}

struct DhikrWidgetData: Codable {
    var arabic: String?
    var translation: String?
    var count: Int?
    var benefit: String?
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
/// guarantee a safe budget. Sized so worst-case density (5-min steps for
/// >=1h + 1-min steps for the final hour + ~42 future prayer boundaries +
/// midnight markers) all fit.
private let MAX_PRAYER_TIMELINE_ENTRIES = 100

/// Builds the prayer-widget timeline dates with minute-level refresh
/// density near the next prayer so the compact countdown string ("1H 52M"
/// / "52M" / "50S") stays current. The compact formatter renders a STATIC
/// string per entry — without dense entries the countdown would drift up
/// to ~1 hour between refreshes.
///
/// Density rules (per Phase-2 follow-up requirements):
///   • now → (next prayer − 1h): one entry every 5 minutes
///   • (next prayer − 1h) → next prayer: one entry every 1 minute
///   • every future prayer boundary across the 7-day cache
///   • midnight rollover for the next day
/// When prayer data is absent the densification falls back to the same
/// rules against a 6-hour-from-now horizon so the timer still ticks.
private func prayerTimelineDates(data: SharedWidgetData, now: Date = Date()) -> [Date] {
    let nowMs = now.timeIntervalSince1970 * 1000
    var dates: [Date] = [now]

    // Prefer allPrayerEpochs (7-day flat list); fall back to per-item.
    let epochSource: [Double] = (data.prayer?.allPrayerEpochs?.isEmpty == false)
        ? (data.prayer?.allPrayerEpochs ?? [])
        : (data.prayer?.allPrayers ?? []).compactMap { $0.epochMs }
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
    let oneHour: TimeInterval = 3600

    if timeUntilEnd > 60 {
        if timeUntilEnd <= oneHour {
            // Less than 1h to next prayer — emit 1-minute entries until
            // the boundary. Caps via the global prefix limit below.
            let minutes = max(1, min(60, Int(timeUntilEnd / 60)))
            for m in 1...minutes {
                dates.append(now.addingTimeInterval(TimeInterval(m * 60)))
            }
        } else {
            // ≥1h: 5-min entries until 1h before the next prayer, then
            // 1-min entries for the final hour.
            let phaseOneEnd = densificationEnd.addingTimeInterval(-oneHour)
            let phaseOneSecs = phaseOneEnd.timeIntervalSince(now)
            // Cap 5-min phase at 40 steps (≈ 3h20m runway). Anything
            // further out is covered by subsequent prayer boundaries.
            let phaseOneSteps = max(0, min(40, Int(phaseOneSecs / (5 * 60))))
            if phaseOneSteps > 0 {
                for i in 1...phaseOneSteps {
                    dates.append(now.addingTimeInterval(TimeInterval(i * 5 * 60)))
                }
            }
            for m in 1...60 {
                dates.append(phaseOneEnd.addingTimeInterval(TimeInterval(m * 60)))
            }
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
        RoohEntry(date: Date(), configuration: SmallWidgetIntent(), data: sampleSharedData(), hasRealData: true)
    }

    func snapshot(for configuration: SmallWidgetIntent, in context: Context) async -> RoohEntry<SmallWidgetIntent> {
        // Widget gallery preview must always render real-looking content so users
        // can see what the widget does — never the "open the app" placeholder.
        if context.isPreview {
            return RoohEntry(date: Date(), configuration: configuration, data: sampleSharedData(), hasRealData: true)
        }
        let real = sharedDataIfAvailable()
        return RoohEntry(date: Date(), configuration: configuration, data: real ?? sampleSharedData(), hasRealData: real != nil)
    }

    func timeline(for configuration: SmallWidgetIntent, in context: Context) async -> Timeline<RoohEntry<SmallWidgetIntent>> {
        let real = sharedDataIfAvailable()
        let data = real ?? sampleSharedData()
        let now = Date()
        let entries = prayerTimelineDates(data: data, now: now).map {
            RoohEntry(date: $0, configuration: configuration, data: data, hasRealData: real != nil)
        }
        return Timeline(entries: entries, policy: .after(prayerTimelinePolicyDate(data: data, now: now)))
    }
}

struct MediumProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> RoohEntry<MediumWidgetIntent> {
        RoohEntry(date: Date(), configuration: MediumWidgetIntent(), data: sampleSharedData(), hasRealData: true)
    }

    func snapshot(for configuration: MediumWidgetIntent, in context: Context) async -> RoohEntry<MediumWidgetIntent> {
        if context.isPreview {
            return RoohEntry(date: Date(), configuration: configuration, data: sampleSharedData(), hasRealData: true)
        }
        let real = sharedDataIfAvailable()
        return RoohEntry(date: Date(), configuration: configuration, data: real ?? sampleSharedData(), hasRealData: real != nil)
    }

    func timeline(for configuration: MediumWidgetIntent, in context: Context) async -> Timeline<RoohEntry<MediumWidgetIntent>> {
        let real = sharedDataIfAvailable()
        let data = real ?? sampleSharedData()
        let now = Date()
        let entries = prayerTimelineDates(data: data, now: now).map {
            RoohEntry(date: $0, configuration: configuration, data: data, hasRealData: real != nil)
        }
        return Timeline(entries: entries, policy: .after(prayerTimelinePolicyDate(data: data, now: now)))
    }
}

struct LargeProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> RoohEntry<LargeWidgetIntent> {
        RoohEntry(date: Date(), configuration: LargeWidgetIntent(), data: sampleSharedData(), hasRealData: true)
    }

    func snapshot(for configuration: LargeWidgetIntent, in context: Context) async -> RoohEntry<LargeWidgetIntent> {
        if context.isPreview {
            return RoohEntry(date: Date(), configuration: configuration, data: sampleSharedData(), hasRealData: true)
        }
        let real = sharedDataIfAvailable()
        return RoohEntry(date: Date(), configuration: configuration, data: real ?? sampleSharedData(), hasRealData: real != nil)
    }

    func timeline(for configuration: LargeWidgetIntent, in context: Context) async -> Timeline<RoohEntry<LargeWidgetIntent>> {
        let real = sharedDataIfAvailable()
        let data = real ?? sampleSharedData()
        let now = Date()
        let entries = prayerTimelineDates(data: data, now: now).map {
            RoohEntry(date: $0, configuration: configuration, data: data, hasRealData: real != nil)
        }
        return Timeline(entries: entries, policy: .after(prayerTimelinePolicyDate(data: data, now: now)))
    }
}

// MARK: - Appearance-only Intent (for fixed-type specific widgets)

/// Lets the user customise theme / numerals / calendar / language for a widget
/// whose type is already fixed (e.g. "اليوم" is always daySimple).
/// Using this intent surfaces "Edit Widget" on long-press without exposing a
/// widget-type picker — appearance only.
struct RoohWidgetAppearanceIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "تخصيص الويدجت"
    static var description = IntentDescription("اختر المظهر والتقويم والأرقام واللغة")

    @Parameter(title: "المظهر") var theme: RoohTheme
    @Parameter(title: "التقويم") var calendar: RoohCalendar
    @Parameter(title: "الأرقام") var numerals: RoohNumerals
    @Parameter(title: "اللغة") var language: RoohLanguage

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
        completion(Timeline(entries: entries, policy: .after(prayerTimelinePolicyDate(data: data, now: now))))
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
        return Timeline(entries: entries, policy: .after(prayerTimelinePolicyDate(data: data, now: now)))
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
        intentHomeConfiguration(kind: "RoohSmallWidget", displayName: "روح المسلم", widgetDescription: "ويدجت صغيرة من إعدادات التطبيق", widgetId: "daySimple", family: .systemSmall)
    }
}

struct RoohMediumWidget: Widget {
    var body: some WidgetConfiguration {
        intentHomeConfiguration(kind: "RoohMediumWidget", displayName: "روح المسلم", widgetDescription: "ويدجت متوسطة من إعدادات التطبيق", widgetId: "daySimple", family: .systemMedium)
    }
}

struct RoohLargeWidget: Widget {
    var body: some WidgetConfiguration {
        intentHomeConfiguration(kind: "RoohLargeWidget", displayName: "روح المسلم", widgetDescription: "ويدجت كبيرة من إعدادات التطبيق", widgetId: "prayerTable", family: .systemLarge)
    }
}

struct RoohDaySimpleSmallWidget: Widget { var body: some WidgetConfiguration { intentHomeConfiguration(kind: "RoohDaySimpleSmallWidget", displayName: "اليوم", widgetDescription: "اليوم", widgetId: "daySimple", family: .systemSmall) } }
struct RoohDaySimpleMediumWidget: Widget { var body: some WidgetConfiguration { intentHomeConfiguration(kind: "RoohDaySimpleMediumWidget", displayName: "اليوم", widgetDescription: "اليوم", widgetId: "daySimple", family: .systemMedium) } }
struct RoohDayThuluthSmallWidget: Widget { var body: some WidgetConfiguration { intentHomeConfiguration(kind: "RoohDayThuluthSmallWidget", displayName: "اليوم - ثلث", widgetDescription: "اليوم بخط الثلث", widgetId: "dayThuluth", family: .systemSmall) } }
struct RoohDayThuluthMediumWidget: Widget { var body: some WidgetConfiguration { intentHomeConfiguration(kind: "RoohDayThuluthMediumWidget", displayName: "اليوم - ثلث", widgetDescription: "اليوم بخط الثلث", widgetId: "dayThuluth", family: .systemMedium) } }
struct RoohDayDigitalSmallWidget: Widget { var body: some WidgetConfiguration { intentHomeConfiguration(kind: "RoohDayDigitalSmallWidget", displayName: "اليوم - رقمي", widgetDescription: "اليوم والوقت", widgetId: "dayDigital", family: .systemSmall) } }
struct RoohMonthSimpleSmallWidget: Widget { var body: some WidgetConfiguration { intentHomeConfiguration(kind: "RoohMonthSimpleSmallWidget", displayName: "الشهر", widgetDescription: "التاريخ الهجري", widgetId: "monthSimple", family: .systemSmall) } }
struct RoohMonthThuluthMediumWidget: Widget { var body: some WidgetConfiguration { intentHomeConfiguration(kind: "RoohMonthThuluthMediumWidget", displayName: "الشهر - ثلث", widgetDescription: "التاريخ الهجري بخط الثلث", widgetId: "monthThuluth", family: .systemMedium) } }
struct RoohPrayerSingleSmallWidget: Widget { var body: some WidgetConfiguration { intentHomeConfiguration(kind: "RoohPrayerSingleSmallWidget", displayName: "الصلاة القادمة", widgetDescription: "الصلاة القادمة", widgetId: "prayerSingle", family: .systemSmall) } }
struct RoohPrayerTableSmallWidget: Widget { var body: some WidgetConfiguration { intentHomeConfiguration(kind: "RoohPrayerTableSmallWidget", displayName: "جدول الصلاة", widgetDescription: "جدول الصلاة", widgetId: "prayerTable", family: .systemSmall) } }
struct RoohPrayerTableMediumWidget: Widget { var body: some WidgetConfiguration { intentHomeConfiguration(kind: "RoohPrayerTableMediumWidget", displayName: "جدول الصلاة", widgetDescription: "جدول الصلاة", widgetId: "prayerTable", family: .systemMedium) } }
struct RoohPrayerTableLargeWidget: Widget { var body: some WidgetConfiguration { intentHomeConfiguration(kind: "RoohPrayerTableLargeWidget", displayName: "جدول الصلاة", widgetDescription: "جدول الصلاة", widgetId: "prayerTable", family: .systemLarge) } }
struct RoohPrayerNextPreviousMediumWidget: Widget { var body: some WidgetConfiguration { intentHomeConfiguration(kind: "RoohPrayerNextPreviousMediumWidget", displayName: "الصلاة السابقة والقادمة", widgetDescription: "الصلاة السابقة والقادمة", widgetId: "prayerNextPrevious", family: .systemMedium) } }
struct RoohVerseOfDaySmallWidget: Widget { var body: some WidgetConfiguration { intentHomeConfiguration(kind: "RoohVerseOfDaySmallWidget", displayName: "آية اليوم", widgetDescription: "آية اليوم", widgetId: "verseOfDay", family: .systemSmall) } }
struct RoohVerseOfDayMediumWidget: Widget { var body: some WidgetConfiguration { intentHomeConfiguration(kind: "RoohVerseOfDayMediumWidget", displayName: "آية اليوم", widgetDescription: "آية اليوم", widgetId: "verseOfDay", family: .systemMedium) } }
struct RoohVerseOfDayLargeWidget: Widget { var body: some WidgetConfiguration { intentHomeConfiguration(kind: "RoohVerseOfDayLargeWidget", displayName: "آية اليوم", widgetDescription: "آية اليوم", widgetId: "verseOfDay", family: .systemLarge) } }
struct RoohAzkarMorningSmallWidget: Widget { var body: some WidgetConfiguration { intentHomeConfiguration(kind: "RoohAzkarMorningSmallWidget", displayName: "أذكار الصباح", widgetDescription: "أذكار الصباح", widgetId: "azkarMorning", family: .systemSmall) } }
struct RoohAzkarMorningMediumWidget: Widget { var body: some WidgetConfiguration { intentHomeConfiguration(kind: "RoohAzkarMorningMediumWidget", displayName: "أذكار الصباح", widgetDescription: "أذكار الصباح", widgetId: "azkarMorning", family: .systemMedium) } }
struct RoohAzkarEveningSmallWidget: Widget { var body: some WidgetConfiguration { intentHomeConfiguration(kind: "RoohAzkarEveningSmallWidget", displayName: "أذكار المساء", widgetDescription: "أذكار المساء", widgetId: "azkarEvening", family: .systemSmall) } }
struct RoohAzkarEveningMediumWidget: Widget { var body: some WidgetConfiguration { intentHomeConfiguration(kind: "RoohAzkarEveningMediumWidget", displayName: "أذكار المساء", widgetDescription: "أذكار المساء", widgetId: "azkarEvening", family: .systemMedium) } }
struct RoohDailyDhikrSmallWidget: Widget { var body: some WidgetConfiguration { intentHomeConfiguration(kind: "RoohDailyDhikrSmallWidget", displayName: "الذكر اليومي", widgetDescription: "الذكر اليومي", widgetId: "dailyDhikr", family: .systemSmall) } }
struct RoohDailyDhikrMediumWidget: Widget { var body: some WidgetConfiguration { intentHomeConfiguration(kind: "RoohDailyDhikrMediumWidget", displayName: "الذكر اليومي", widgetDescription: "الذكر اليومي", widgetId: "dailyDhikr", family: .systemMedium) } }
struct RoohHijriDateSmallWidget: Widget { var body: some WidgetConfiguration { intentHomeConfiguration(kind: "RoohHijriDateSmallWidget", displayName: "التاريخ الهجري", widgetDescription: "التاريخ الهجري", widgetId: "hijriDate", family: .systemSmall) } }
struct RoohHijriDateMediumWidget: Widget { var body: some WidgetConfiguration { intentHomeConfiguration(kind: "RoohHijriDateMediumWidget", displayName: "التاريخ الهجري", widgetDescription: "التاريخ الهجري", widgetId: "hijriDate", family: .systemMedium) } }

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
        .supportedFamilies([.accessoryRectangular])
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
        // Fall back to daySimple if user hasn't picked a type yet OR if they picked
        // a type that doesn't support this family size (stale stored placement).
        let raw = entry.configuration.widget.rawValue
        let wid: String = (entry.configuration.widget == .placeholder || !registrySupportsSize(widgetId: raw, family: .systemSmall)) ? "daySimple" : raw
        Group {
            if !paid && registryPremiumRequired(widgetId: wid, family: .systemSmall) {
                PremiumLockedView(context: c)
                    .widgetURL(URL(string: "rooh-almuslim://subscription"))
            } else {
                WidgetImageView(widgetId: wid, family: .systemSmall, context: c)
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
        let raw = entry.configuration.widget.rawValue
        let wid: String = (entry.configuration.widget == .placeholder || !registrySupportsSize(widgetId: raw, family: .systemMedium)) ? "daySimple" : raw
        Group {
            if !paid && registryPremiumRequired(widgetId: wid, family: .systemMedium) {
                PremiumLockedView(context: c)
                    .widgetURL(URL(string: "rooh-almuslim://subscription"))
            } else {
                WidgetImageView(widgetId: wid, family: .systemMedium, context: c)
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
        let raw = entry.configuration.widget.rawValue
        let wid: String = (entry.configuration.widget == .placeholder || !registrySupportsSize(widgetId: raw, family: .systemLarge)) ? "prayerTable" : raw
        Group {
            if !paid && registryPremiumRequired(widgetId: wid, family: .systemLarge) {
                PremiumLockedView(context: c)
                    .widgetURL(URL(string: "rooh-almuslim://subscription"))
            } else {
                WidgetImageView(widgetId: wid, family: .systemLarge, context: c)
            }
        }
        .roohWidgetBackground(theme: resolvedTheme)
    }
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

    var arabicFontFamily: String {
        (data.widgetFontVariant == "widget2") ? "ASuls" : "DecoTypeThuluth2"
    }
}

/// User-selectable Arabic font for Date / Prayer / Hijri variants.
func arabicFont(_ context: WidgetContext, size: CGFloat) -> Font {
    .custom(context.arabicFontFamily, size: size)
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
        WidgetPrayerItem(
            name: key.englishName,
            nameAr: key.arabicName,
            time: formatHHMM(today[key]),
            epochMs: today[key].timeIntervalSince1970 * 1000,
            isPassed: today[key] <= now,
            isNext: key == state.next
        )
    }

    let epochs: [Double] = calc.allPrayerEpochsMs(from: now, days: 7).map { Double($0) }

    return WidgetPrayerData(
        nextPrayer: state.next.rawValue,
        nextPrayerName: state.next.englishName,
        nextPrayerNameAr: state.next.arabicName,
        nextPrayerTime: formatHHMM(state.nextAt),
        nextPrayerAtEpochMs: state.nextAt.timeIntervalSince1970 * 1000,
        previousPrayerName: state.previous.englishName,
        previousPrayerNameAr: state.previous.arabicName,
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
    var body: some View {
        let p = palette(context.theme)
        let isAr = context.isArabic
        let cal = context.dayCalendar
        VStack(spacing: 4) {
            Text(weekdayName(context))
                .font(isAr ? .custom("Amiri-Bold", size: 22) : .system(size: 22, weight: .heavy, design: .rounded))
                .foregroundStyle(p.text)
                .padding(.vertical, isAr ? 4 : 2)
            Text(formatNumber(dayNumberFor(context, cal: cal), context))
                .font(.custom("Rubik-Bold", size: 68))
                .minimumScaleFactor(0.45)
                .lineLimit(1)
                .foregroundStyle(p.text.opacity(0.78))
            Text(isAr ? monthNameFor(context, cal: cal) : monthNameFor(context, cal: cal).uppercased())
                .font(.custom("Rubik-Medium", size: 18))
                .foregroundStyle(p.muted)
        }
        .padding(12)
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
        VStack(spacing: 22) {
            Text(formatTime(context.date, context))
                .font(.custom("Rubik-Bold", size: 55))
                .minimumScaleFactor(0.55)
                .foregroundStyle(
                    LinearGradient(
                        colors: p.isLight
                            ? [Color(hex: "#3A3A39"), Color(hex: "#3A3A39").opacity(0.55)]
                            : [Color.white, Color.white.opacity(0.55)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
            Text(subtitle)
                .font(.system(size: 18, weight: .semibold, design: .rounded))
                .lineLimit(1)
                .minimumScaleFactor(0.55)
                .foregroundStyle(p.muted)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.horizontal, 12)
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
    let gd = String(format: "%02d", g.component(.day, from: date))
    let gm = String(format: "%02d", g.component(.month, from: date))
    let gy = String(g.component(.year, from: date))
    let hd = String(format: "%02d", h.component(.day, from: date))
    let hm = String(format: "%02d", h.component(.month, from: date))
    let hy = String(h.component(.year, from: date))
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
        let mainFs: CGFloat = isSmall ? 38 : 56
        let wmFs: CGFloat = isSmall ? 0 : 130
        ZStack {
            if !isSmall {
                Text(wmStr)
                    .font(.custom(context.arabicFontFamily, size: wmFs))
                    .foregroundStyle(p.text.opacity(0.10))
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
            }
            Text(thuluthWeekdayName(context.date))
                .font(.custom(context.arabicFontFamily, size: mainFs))
                .minimumScaleFactor(0.4)
                .lineLimit(1)
                .foregroundStyle(p.text.opacity(0.92))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
    }
}

struct MonthSimpleView: View {
    let context: WidgetContext
    var body: some View {
        let p = palette(context.theme)
        let cal = context.monthCalendar
        let isHijriArabic = context.isArabic && cal == .hijri
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
        let mainFs: CGFloat = isSmall ? 38 : 56
        let wmFs: CGFloat = isSmall ? 90 : 130
        ZStack {
            Text(wmStr)
                .font(.custom(context.arabicFontFamily, size: wmFs))
                .foregroundStyle(p.text.opacity(0.10))
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
            Text(label)
                .font(.custom(context.arabicFontFamily, size: mainFs))
                .minimumScaleFactor(0.35)
                .lineLimit(1)
                .foregroundStyle(p.text.opacity(0.92))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
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

struct PrayerSingleView: View {
    let context: WidgetContext

    private var displayData: (palette: ThemePalette, name: String, timeDigits: String, ampm: String) {
        let pal = palette(context.theme)
        let prayer = context.data.prayer
        // Phase D: use 7-day epoch-derived next prayer so the widget stays
        // accurate for 7+ days without the app being opened.
        let next = todaysNextPrayer(context)
        let name = context.isArabic
            ? (next.nameAr ?? prayer?.nextPrayerNameAr ?? "الفجر")
            : (next.name ?? prayer?.nextPrayerName ?? "Fajr")
        let timeDigits = prayerTimeDigitsFromEpoch(next.epochMs, context)
        let ampm = prayerAMPMFromEpoch(next.epochMs, context)
        return (pal, name, timeDigits, ampm)
    }

    var body: some View {
        let d = displayData
        let timerDate = Date(timeIntervalSince1970: resolvedNextPrayerEpochMs(context) / 1000)
        VStack(spacing: 8) {
            Text(context.isArabic ? "الصلاة القادمة" : "Next Prayer")
                .font(.custom("Rubik-Medium", size: 13))
                .foregroundStyle(d.palette.muted)
            Text(d.name)
                .font(prayerNameFont(size: 26))
                .foregroundStyle(d.palette.text)
            // AM/PM above the large digits to avoid truncation at 50pt
            Text(d.ampm)
                .font(.custom("Rubik-Medium", size: 16))
                .foregroundStyle(d.palette.muted)
            Text(d.timeDigits)
                .font(.custom("Rubik-Bold", size: 50))
                .foregroundStyle(d.palette.text)
                .minimumScaleFactor(0.6)
                .lineLimit(1)
            HStack(spacing: 3) {
                Text(context.isArabic ? "بعد" : "in")
                Text(PrayerDurationFormat.until(timerDate, from: context.date, language: context.isArabic ? "ar" : "en"))
                    .multilineTextAlignment(.center)
                    .environment(\.locale, context.usesArabicNumerals ? Locale(identifier: "ar_EG") : Locale(identifier: "en_US_POSIX"))
            }
            .font(.custom("Rubik-Medium", size: 12))
            .foregroundStyle(d.palette.muted)
            .environment(\.layoutDirection, .leftToRight)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(12)
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
        let activeBg = p.isLight ? Color.black.opacity(0.06) : Color.white.opacity(0.12)

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
                HStack(spacing: 1) {
                    Text(context.isArabic ? "بعد" : "in")
                    Text(PrayerDurationFormat.until(timerDate, from: context.date, language: context.isArabic ? "ar" : "en"))
                        .multilineTextAlignment(.center)
                        .environment(\.locale, context.usesArabicNumerals ? Locale(identifier: "ar_EG") : Locale(identifier: "en_US_POSIX"))
                }
                .font(.custom("Rubik-Medium", size: 9))
                .foregroundStyle(p.muted)
                .environment(\.layoutDirection, .leftToRight)
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
            // List (left)
            VStack(spacing: 1) {
                ForEach(prayers) { item in
                    prayerRow(item: item, palette: p, activeBg: activeBg, fontSize: 11, padH: 4, padV: 2.5)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            // Hero (right)
            VStack(spacing: 2) {
                Text(context.isArabic ? "الصلاة القادمة" : "Next Prayer")
                    .font(.custom("Rubik-Medium", size: 10))
                    .foregroundStyle(p.muted)
                Text(context.isArabic ? nextNameAr : nextName)
                    .font(.custom("Rubik-Bold", size: 20))
                    .foregroundStyle(p.text)
                Text(nextTime)
                    .font(.custom("Rubik-Bold", size: 32))
                    .foregroundStyle(p.text)
                    .kerning(-1)
                let timerDateMed = Date(timeIntervalSince1970: resolvedNextPrayerEpochMs(context) / 1000)
                HStack(spacing: 3) {
                    Text(context.isArabic ? "بعد" : "in")
                    Text(PrayerDurationFormat.until(timerDateMed, from: context.date, language: context.isArabic ? "ar" : "en"))
                        .multilineTextAlignment(.center)
                        .environment(\.locale, context.usesArabicNumerals ? Locale(identifier: "ar_EG") : Locale(identifier: "en_US_POSIX"))
                }
                .font(.custom("Rubik-Medium", size: 9))
                .foregroundStyle(p.muted)
                .environment(\.layoutDirection, .leftToRight)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .padding(10)
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
                // Watermark first → renders behind hero content (matches gallery preview position: bottom-right of hero card)
                Text("الصلاة")
                    .font(.custom("DecoTypeThuluth2", size: 46))
                    .foregroundStyle(p.isLight ? Color.black.opacity(0.06) : Color.white.opacity(0.05))
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
                        HStack(spacing: 4) {
                            Text(context.isArabic ? "الصلاة القادمة بعد" : "Next prayer in")
                            Text(PrayerDurationFormat.until(timerDateLg, from: context.date, language: context.isArabic ? "ar" : "en"))
                                .multilineTextAlignment(.trailing)
                                .environment(\.locale, context.usesArabicNumerals ? Locale(identifier: "ar_EG") : Locale(identifier: "en_US_POSIX"))
                        }
                        .font(.custom("Rubik-Medium", size: 12))
                        .foregroundStyle(p.muted)
                        .environment(\.layoutDirection, .leftToRight)
                    }
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 14)
            }
            .background(RoundedRectangle(cornerRadius: 16).fill(heroBg))
            .clipShape(RoundedRectangle(cornerRadius: 16))

            VStack(spacing: 3) {
                ForEach(prayers) { item in
                    prayerRow(item: item, palette: p, activeBg: activeBg, fontSize: 17, padH: 12, padV: 5)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(12)
    }

    // MARK: Shared row
    @ViewBuilder
    private func prayerRow(item: WidgetPrayerItem, palette p: ThemePalette, activeBg: Color, fontSize: CGFloat, padH: CGFloat, padV: CGFloat) -> some View {
        let active = item.isNext ?? false
        let timeText = prayerTimeFromEpoch(item.epochMs, context)
        HStack(spacing: 8) {
            Text(timeText)
                .font(.custom("Rubik-Bold", size: fontSize))
                .kerning(-0.3)
                .foregroundStyle(active ? p.text : p.muted)
            Spacer()
            Text(context.isArabic ? (item.nameAr ?? "الفجر") : (item.name ?? "Fajr"))
                .font(.custom("Rubik-Bold", size: fontSize))
                .foregroundStyle(active ? p.text : p.muted)
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
            prayerBox(item: previous, epochMs: prevEpochMs, isNext: false, palette: p)
            prayerBox(item: next, epochMs: nextEpochMs, isNext: true, palette: p)
        }
        .padding(10)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        // Pin LTR so previous is on the LEFT and next on the RIGHT — matches
        // the gallery preview which uses `direction: 'ltr'` for the same reason.
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
                HStack(spacing: 3) {
                    Text(prefix)
                    Text(PrayerDurationFormat.until(timerDate, from: context.date, language: context.isArabic ? "ar" : "en"))
                        .multilineTextAlignment(.center)
                        .environment(\.locale, context.usesArabicNumerals ? Locale(identifier: "ar_EG") : Locale(identifier: "en_US_POSIX"))
                }
                .font(.custom("Rubik-Medium", size: 9))
                .environment(\.layoutDirection, .leftToRight)
                .foregroundStyle(p.muted)
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
    var body: some View {
        let p = palette(context.theme)
        let verse = context.data.verse
        let showTranslation = !context.isArabic && (verse?.translation ?? "").isEmpty == false
        let ayahText = verse?.arabic ?? "وَلَكُمْ فِي الْقِصَاصِ حَيَاةٌ يَا أُولِي الْأَلْبَابِ"
        let isSmall = family == .systemSmall
        let showWm = !isSmall
        let wmFs: CGFloat = family == .systemMedium ? 36 : 50
        let wmFill = p.isLight ? Color.black.opacity(0.06) : Color.white.opacity(0.06)
        let ayahFs: CGFloat = isSmall ? 16 : (family == .systemMedium ? 20 : 24)

        ZStack {
            if showWm {
                VStack {
                    Spacer()
                    Text(context.isArabic ? "آيـة اليـوم" : "Verse of Day")
                        .font(.custom(context.arabicFontFamily, size: wmFs))
                        .foregroundStyle(wmFill)
                        .padding(.bottom, 4)
                }
            }
            VStack(spacing: 8) {
                Text(ayahText)
                    .font(.custom("KFGQPCUthmanicScriptHAFS", size: ayahFs))
                    .minimumScaleFactor(0.45)
                    .multilineTextAlignment(.center)
                    .lineLimit(showTranslation ? 2 : (isSmall ? 3 : 4))
                    .foregroundStyle(p.text)
                    .environment(\.layoutDirection, .rightToLeft)
                if showTranslation {
                    Text(verse?.translation ?? "")
                        .font(.custom("Rubik-Regular", size: 12))
                        .multilineTextAlignment(.center)
                        .lineLimit(2)
                        .foregroundStyle(p.muted)
                }
                Text("\(context.isArabic ? (verse?.surahName ?? "البقرة") : (verse?.surahNameEn ?? "Al-Baqarah")) · \(formatNumber(verse?.numberInSurah ?? 179, context))")
                    .font(.custom("Rubik-Medium", size: isSmall ? 11 : 12))
                    .foregroundStyle(p.muted)
            }
            .padding(.horizontal, isSmall ? 16 : 18)
            .padding(.vertical, isSmall ? 16 : 18)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct AzkarQuoteView: View {
    let context: WidgetContext
    let title: String
    var titleEn: String = ""
    @Environment(\.widgetFamily) var family
    var body: some View {
        let p = palette(context.theme)
        let zikr = context.data.azkar?.randomZikr
        let displayTitle = (!context.isArabic && !titleEn.isEmpty) ? titleEn : title
        let isSmall = family == .systemSmall
        let titleFs: CGFloat = isSmall ? 11 : 13
        let bodyFs: CGFloat = isSmall ? 20 : 25
        VStack(spacing: 6) {
            Text(displayTitle)
                .font(.custom("Rubik-Bold", size: titleFs))
                .foregroundStyle(p.muted)
            Spacer(minLength: 0)
            Text(zikr?.text ?? "اللهم صل وسلم على نبينا محمد")
                .font(.custom("ASuls", size: bodyFs))
                .minimumScaleFactor(0.45)
                .multilineTextAlignment(.center)
                .lineLimit(isSmall ? 2 : 3)
                .foregroundStyle(p.text)
            Spacer(minLength: 0)
            Text("\(formatNumber(max(zikr?.count ?? 10, 1), context))×")
                .font(.custom("Rubik-Bold", size: titleFs))
                .foregroundStyle(p.muted)
        }
        .padding(14)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
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
            let day = cal.component(.day, from: date)
            let year = cal.component(.year, from: date)
            let monthName = thuluthHijriMonthName(date)
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
            let day = shared.prayer?.hijriDay ?? cal.component(.day, from: date)
            let useArabicDigits = (shared.widgetNumerals ?? "arabic") != "western"
            let dayStr = useArabicDigits ? latinToArabicDigits(String(day)) : String(day)
            let monthShort: String = {
                if context.isArabic {
                    let m = shared.prayer?.hijriMonth ?? thuluthHijriMonthName(date)
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
                WidgetPrayerItem(name: "Dhuhr", nameAr: "الظهر", time: "12:19", isPassed: false, isNext: false),
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

func normalizedPrayers(_ prayer: WidgetPrayerData?, now: Date = Date()) -> [WidgetPrayerItem] {
    // allPrayers contains today's 6 prayers only — safe for display.
    // (allPrayerEpochs holds the 7-day range and is never used for display.)
    let rawSource = (prayer?.allPrayers ?? []).isEmpty
        ? (sampleSharedData().prayer?.allPrayers ?? [])
        : (prayer?.allPrayers ?? [])
    // Guard: should always be ≤6, but truncate in case data is unexpected.
    let source = Array(rawSource.prefix(6))
    let nowMs = now.timeIntervalSince1970 * 1000
    let sortedEpochs = source
        .compactMap { $0.epochMs }
        .filter { $0 > 0 }
        .sorted()
    let nextEpoch = sortedEpochs.first(where: { $0 > nowMs }) ?? sortedEpochs.first

    return source.map { item in
        var copy = item
        if let epoch = item.epochMs, epoch > 0, let next = nextEpoch {
            copy.isPassed = epoch <= nowMs
            copy.isNext = abs(epoch - next) < 1000
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

func dayNumberFor(_ context: WidgetContext, cal: RoohCalendar) -> Int {
    calendarFor(cal).component(.day, from: context.date)
}

func monthNameFor(_ context: WidgetContext, cal: RoohCalendar) -> String {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: context.isArabic ? "ar" : "en")
    formatter.calendar = calendarFor(cal)
    formatter.dateFormat = "MMMM"
    return formatter.string(from: context.date)
}

func yearNumberFor(_ context: WidgetContext, cal: RoohCalendar) -> Int {
    calendarFor(cal).component(.year, from: context.date)
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
    f.locale = Locale(identifier: context.isArabic ? "ar_AE" : "en_US")
    f.dateFormat = "h:mm a"
    let result = f.string(from: date)
    return context.usesArabicNumerals ? latinToArabicDigits(result) : result
}

/// Returns only the digits+colon part (e.g. "٤:١١") without AM/PM — for large displays.
func prayerTimeDigitsFromEpoch(_ epochMs: Double?, _ context: WidgetContext) -> String {
    guard let ms = epochMs, ms > 1000 else { return "--:--" }
    let date = Date(timeIntervalSince1970: ms / 1000)
    let f = DateFormatter()
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
    f.locale = Locale(identifier: context.isArabic ? "ar_AE" : "en_US")
    f.dateFormat = "a"
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
    let formatted = applyNumeralsTo(remaining.replacingOccurrences(of: " ", with: ""), context)
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

private func prayerEpochs(_ context: WidgetContext) -> [Double] {
    // Prefer the 7-day flat epoch list; fall back to per-item epochMs in allPrayers.
    if let extended = context.data.prayer?.allPrayerEpochs, !extended.isEmpty {
        return extended.filter { $0 > 0 }.sorted()
    }
    return (context.data.prayer?.allPrayers ?? [])
        .compactMap { item in
            guard let epoch = item.epochMs, epoch > 0 else { return nil }
            return epoch
        }
        .sorted()
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
        ("Dhuhr", "الظهر"),
        ("Asr", "العصر"),
        ("Maghrib", "المغرب"),
        ("Isha", "العشاء")
    ]

    let epochs = prayerEpochs(context) // sorted ascending
    let cal = Calendar.current
    let today = cal.startOfDay(for: Date())
    let tomorrow = cal.date(byAdding: .day, value: 1, to: today) ?? today

    let todaysEpochs = epochs.filter { ms in
        let d = Date(timeIntervalSince1970: ms / 1000)
        return d >= today && d < tomorrow
    }

    let nowMs = Date().timeIntervalSince1970 * 1000
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
    let nowMs = Date().timeIntervalSince1970 * 1000
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
    let nowMs = Date().timeIntervalSince1970 * 1000
    if let prev = items.last(where: { ($0.epochMs ?? 0) <= nowMs }) {
        return prev
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
    let nowMs = Date().timeIntervalSince1970 * 1000
    if let next = prayerEpochs(context).first(where: { $0 > nowMs }) {
        return next
    }
    return context.data.prayer?.nextPrayerAtEpochMs ?? 0
}

private func resolvedPreviousPrayerEpochMs(_ context: WidgetContext) -> Double {
    let nowMs = Date().timeIntervalSince1970 * 1000
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
        let nowMs = Date().timeIntervalSince1970 * 1000
        let targetMs = resolvedNextPrayerEpochMs(context)
        let remainingSeconds = max(0, Int((targetMs - nowMs) / 1000))
        let h = remainingSeconds / 3600
        let m = (remainingSeconds % 3600) / 60
        let s = remainingSeconds % 60
        let timeStr = String(format: "%d:%02d:%02d", h, m, s)
        let formatted = context.usesArabicNumerals ? latinToArabicDigits(timeStr) : timeStr
        NSLog("[widget/ios] countdown nowMs=%.0f nextPrayerAtEpochMs=%.0f widgetRemainingSeconds=%d prayerDataUpdatedAt=%@", nowMs, targetMs, remainingSeconds, context.data.prayer?.prayerDataUpdatedAt ?? "n/a")
        return context.isArabic ? "بعد \(formatted)" : "in \(formatted)"
    case .prayerPreviousCountdown:
        let nowMs = Date().timeIntervalSince1970 * 1000
        let targetMs = resolvedPreviousPrayerEpochMs(context)
        let elapsedSeconds = max(0, Int((nowMs - targetMs) / 1000))
        let h = elapsedSeconds / 3600
        let m = (elapsedSeconds % 3600) / 60
        let s = elapsedSeconds % 60
        let timeStr = String(format: "%d:%02d:%02d", h, m, s)
        let formatted = context.usesArabicNumerals ? latinToArabicDigits(timeStr) : timeStr
        return context.isArabic ? "منذ \(formatted)" : "\(formatted) ago"
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
            DaySimpleView(context: context)
        }
    }
}

/// Check whether the baked Asset Catalog ships an asset for the given
/// (kind, size, theme, language, state) combination. When true, the widget
/// renders via `PrayerStaticOverlay`. Otherwise it falls back to the existing
/// pure-SwiftUI prayer views below — the user never sees a broken layout
/// while the bake matrix is being filled in.
private func prayerStaticAssetExists(widgetId: String,
                                     family: WidgetFamily,
                                     theme: RoohTheme,
                                     language: String,
                                     active: PrayerKey,
                                     previous: PrayerKey?) -> Bool {
    let name = PrayerAssetResolver.assetName(
        widgetId: widgetId,
        family: family,
        theme: theme,
        language: language,
        active: active,
        previous: previous
    )
    return UIImage(named: name) != nil
}

/// Returns a configured `PrayerStaticOverlay` for the given prayer widget IF
/// AND ONLY IF the static-PNG path is fully ready:
///   • `widgetId` is one of the prayer kinds
///   • `widget_prayer_inputs` exists in the App Group (calculator can load)
///   • the bake matrix includes an asset for (kind, size, theme, lang, state)
/// Otherwise returns nil so the caller falls back to its existing render path.
private func makePrayerStaticOverlay(widgetId: String,
                                     family: WidgetFamily,
                                     resolvedTheme: RoohTheme,
                                     context: WidgetContext) -> PrayerStaticOverlay? {
    guard isPrayerHomeWidget(widgetId),
          let calculator = PrayerCalculator.loadFromAppGroup() else { return nil }
    let now = context.date
    let state = calculator.state(at: now)
    // The state token in the PNG asset name = the NEXT (upcoming) prayer —
    // i.e. the prayer whose row is highlighted in the schedule and whose
    // name is baked large in the hero panel. This matches the gallery
    // preview's `isNext` row highlight convention.
    let active = state?.next ?? .fajr
    let previous = state?.previous
    let langKey = context.isArabic ? "ar" : "en"
    guard prayerStaticAssetExists(widgetId: widgetId,
                                  family: family,
                                  theme: resolvedTheme,
                                  language: langKey,
                                  active: active,
                                  previous: previous) else { return nil }
    return PrayerStaticOverlay(
        widgetId: widgetId,
        family: family,
        theme: resolvedTheme,
        language: langKey,
        usesArabicNumerals: context.usesArabicNumerals,
        uses24HourClock: false,
        calculator: calculator,
        now: now
    )
}

private func dynamicPrayerHomeView(widgetId: String, family: WidgetFamily, context: WidgetContext, palette p: ThemePalette) -> AnyView {
    // Attempt the new static-PNG + numeric-overlay path first. Requires both:
    //   (a) PrayerInputs in the App Group (written by lib/widget-data-bridge.ts
    //       → writePrayerInputs() once the user has set location)
    //   (b) the baked Asset Catalog asset for this state/theme/language
    // If either is missing, fall through to the existing SwiftUI views which
    // already read the 7-day epoch cache via todaysNextPrayer / todaysPrayersFromContext.
    if let calculator = PrayerCalculator.loadFromAppGroup() {
        let now = context.date
        let state = calculator.state(at: now)
        let active = state?.previous ?? .fajr
        let previous = state?.previous
        let langKey = context.isArabic ? "ar" : "en"
        if prayerStaticAssetExists(widgetId: widgetId,
                                   family: family,
                                   theme: context.theme,
                                   language: langKey,
                                   active: active,
                                   previous: previous) {
            return AnyView(PrayerStaticOverlay(
                widgetId: widgetId,
                family: family,
                theme: context.theme,
                language: langKey,
                usesArabicNumerals: context.usesArabicNumerals,
                uses24HourClock: false,
                calculator: calculator,
                now: now
            ))
        }
    }

    return AnyView(ZStack {
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
    })
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
/// Prayer countdowns use `Text(PrayerDurationFormat.until(date, from: context.date, language: context.isArabic ? "ar" : "en"))` so they tick live without
/// waiting on timeline reloads. Pinned LTR + Arabic locale → "بعد ٢:١٩:١٧".
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
                    Text(PrayerDurationFormat.until(timerDate, from: context.date, language: context.isArabic ? "ar" : "en")).environment(\.locale, arabicLocale)
                } else {
                    Text(PrayerDurationFormat.until(timerDate, from: context.date, language: context.isArabic ? "ar" : "en")).environment(\.locale, arabicLocale)
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
        let str = anchor.compact ? raw.replacingOccurrences(of: " ", with: "") : raw
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

        if !context.hasRealData {
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
            let overlays = widgetOverlayAnchors(id: widgetId, family: family)
            let pal = palette(resolvedTheme)

            if let prayerOverlay = makePrayerStaticOverlay(
                widgetId: widgetId,
                family: family,
                resolvedTheme: resolvedTheme,
                context: context
            ) {
                // Glassify-style path: offline adhan-swift calculator + baked
                // per-state PNG from the Asset Catalog + numeric-only overlay.
                // `makePrayerStaticOverlay` returns nil unless BOTH
                // `widget_prayer_inputs` exists in the App Group AND the bake
                // matrix includes an asset for this (state, theme, lang).
                // When nil, we fall through to the existing PNG-snapshot path.
                prayerOverlay
                    .widgetURL(URL(string: widgetDeepLink(widgetId)))
            } else if isDateHomeWidget(widgetId) {
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

                        if img != nil {
                            ForEach(Array(overlays.enumerated()), id: \.offset) { _, overlay in
                                liveOverlayView(
                                    kind: overlay.0,
                                    anchor: overlay.1,
                                    context: context,
                                    palette: pal,
                                    geoSize: geo.size,
                                    dims: dims
                                )
                            }
                        }
                    }
                    .frame(width: geo.size.width, height: geo.size.height)
                }
                .widgetURL(URL(string: widgetDeepLink(widgetId)))
            }
        }
    }
}
