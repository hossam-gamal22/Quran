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
    case gregorian, hijri
    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "التقويم")
    static var caseDisplayRepresentations: [RoohCalendar: DisplayRepresentation] = [
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
    case light, dark, olive, green, blue, desert, slate
    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "المظهر")
    static var caseDisplayRepresentations: [RoohTheme: DisplayRepresentation] = [
        .light: "فاتح",
        .dark: "داكن",
        .olive: "زيتي",
        .green: "أخضر",
        .blue: "أزرق",
        .desert: "صحراوي",
        .slate: "رمادي",
    ]
}

enum RoohSmallKind: String, AppEnum {
    case placeholder
    case daySimple, dayThuluth, dayDigital, monthSimple, monthThuluth
    case prayerSingle, prayerTable, verseOfDay, azkarMorning, azkarEvening

    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "الويدجت")
    static var caseDisplayRepresentations: [RoohSmallKind: DisplayRepresentation] = [
        .placeholder: "— اختر —",
        .daySimple: "اليوم",
        .dayThuluth: "اليوم ثلث",
        .dayDigital: "اليوم رقمي",
        .monthSimple: "الشهر",
        .monthThuluth: "الشهر ثلث",
        .prayerSingle: "الصلاة",
        .prayerTable: "جدول مواقيت الصلاة",
        .verseOfDay: "آية اليوم",
        .azkarMorning: "أذكار الصباح",
        .azkarEvening: "أذكار المساء",
    ]
}

enum RoohMediumKind: String, AppEnum {
    case placeholder
    case daySimple, dayThuluth, dayDigital, monthSimple, monthThuluth, monthElegantEn
    case prayerSingle, prayerTable, prayerNextPrevious
    case verseOfDay, azkarMorning, azkarEvening

    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "الويدجت")
    static var caseDisplayRepresentations: [RoohMediumKind: DisplayRepresentation] = [
        .placeholder: "— اختر —",
        .daySimple: "اليوم",
        .dayThuluth: "اليوم ثلث",
        .dayDigital: "اليوم رقمي",
        .monthSimple: "الشهر",
        .monthThuluth: "الشهر ثلث",
        .monthElegantEn: "الشهر - أنيق (En)",
        .prayerSingle: "الصلاة",
        .prayerTable: "جدول مواقيت الصلاة",
        .prayerNextPrevious: "الصلاة السابقة والقادمة",
        .verseOfDay: "آية اليوم",
        .azkarMorning: "أذكار الصباح",
        .azkarEvening: "أذكار المساء",
    ]
}

enum RoohLargeKind: String, AppEnum {
    case placeholder
    case prayerTable, verseOfDay, azkarMorning, azkarEvening

    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "الويدجت")
    static var caseDisplayRepresentations: [RoohLargeKind: DisplayRepresentation] = [
        .placeholder: "— اختر —",
        .prayerTable: "جدول مواقيت الصلاة",
        .verseOfDay: "آية اليوم",
        .azkarMorning: "أذكار الصباح",
        .azkarEvening: "أذكار المساء",
    ]
}

struct SmallWidgetIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "تخصيص الويدجت الصغيرة"
    static var description = IntentDescription("اختر نوع الويدجت واللغة والمظهر")

    @Parameter(title: "الويدجت") var widget: RoohSmallKind
    @Parameter(title: "اللغة") var language: RoohLanguage
    @Parameter(title: "التقويم") var calendar: RoohCalendar
    @Parameter(title: "الأرقام") var numerals: RoohNumerals
    @Parameter(title: "المظهر") var theme: RoohTheme

    init() {
        widget = .placeholder
        language = .auto
        calendar = .gregorian
        numerals = .auto
        theme = .light
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
        widget = .placeholder
        language = .auto
        calendar = .gregorian
        numerals = .auto
        theme = .dark
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
        widget = .placeholder
        language = .auto
        calendar = .gregorian
        numerals = .auto
        theme = .dark
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
}

struct WidgetPrayerData: Codable {
    var nextPrayer: String?
    var nextPrayerName: String?
    var nextPrayerNameAr: String?
    var nextPrayerTime: String?
    var timeRemaining: String?
    var timeRemainingMinutes: Int?
    var allPrayers: [WidgetPrayerItem]?
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
}

// MARK: - Providers

struct SmallProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> RoohEntry<SmallWidgetIntent> {
        RoohEntry(date: Date(), configuration: SmallWidgetIntent(), data: sampleSharedData())
    }

    func snapshot(for configuration: SmallWidgetIntent, in context: Context) async -> RoohEntry<SmallWidgetIntent> {
        RoohEntry(date: Date(), configuration: configuration, data: loadSharedData(SharedWidgetData.self) ?? sampleSharedData())
    }

    func timeline(for configuration: SmallWidgetIntent, in context: Context) async -> Timeline<RoohEntry<SmallWidgetIntent>> {
        let entry = RoohEntry(date: Date(), configuration: configuration, data: loadSharedData(SharedWidgetData.self) ?? sampleSharedData())
        return Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(60)))
    }
}

struct MediumProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> RoohEntry<MediumWidgetIntent> {
        RoohEntry(date: Date(), configuration: MediumWidgetIntent(), data: sampleSharedData())
    }

    func snapshot(for configuration: MediumWidgetIntent, in context: Context) async -> RoohEntry<MediumWidgetIntent> {
        RoohEntry(date: Date(), configuration: configuration, data: loadSharedData(SharedWidgetData.self) ?? sampleSharedData())
    }

    func timeline(for configuration: MediumWidgetIntent, in context: Context) async -> Timeline<RoohEntry<MediumWidgetIntent>> {
        let entry = RoohEntry(date: Date(), configuration: configuration, data: loadSharedData(SharedWidgetData.self) ?? sampleSharedData())
        return Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(60)))
    }
}

struct LargeProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> RoohEntry<LargeWidgetIntent> {
        RoohEntry(date: Date(), configuration: LargeWidgetIntent(), data: sampleSharedData())
    }

    func snapshot(for configuration: LargeWidgetIntent, in context: Context) async -> RoohEntry<LargeWidgetIntent> {
        RoohEntry(date: Date(), configuration: configuration, data: loadSharedData(SharedWidgetData.self) ?? sampleSharedData())
    }

    func timeline(for configuration: LargeWidgetIntent, in context: Context) async -> Timeline<RoohEntry<LargeWidgetIntent>> {
        let entry = RoohEntry(date: Date(), configuration: configuration, data: loadSharedData(SharedWidgetData.self) ?? sampleSharedData())
        return Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(60)))
    }
}

// MARK: - Widgets

struct RoohSmallWidget: Widget {
    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: "RoohSmallWidget", intent: SmallWidgetIntent.self, provider: SmallProvider()) { entry in
            SmallRouter(entry: entry)
                .widgetURL(URL(string: "rooh-almuslim://widget"))
        }
        .configurationDisplayName("Small Widget")
        .description("اختر النوع بعد إضافة الويدجت")
        .supportedFamilies([.systemSmall])
    }
}

struct RoohMediumWidget: Widget {
    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: "RoohMediumWidget", intent: MediumWidgetIntent.self, provider: MediumProvider()) { entry in
            MediumRouter(entry: entry)
                .widgetURL(URL(string: "rooh-almuslim://widget"))
        }
        .configurationDisplayName("Medium Widget")
        .description("اختر النوع بعد إضافة الويدجت")
        .supportedFamilies([.systemMedium])
    }
}

struct RoohLargeWidget: Widget {
    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: "RoohLargeWidget", intent: LargeWidgetIntent.self, provider: LargeProvider()) { entry in
            LargeRouter(entry: entry)
                .widgetURL(URL(string: "rooh-almuslim://widget"))
        }
        .configurationDisplayName("Large Widget")
        .description("اختر النوع بعد إضافة الويدجت")
        .supportedFamilies([.systemLarge])
    }
}

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
        .configurationDisplayName("الشهر ثلث")
        .description("الشهر الهجري بخط ثلث على شاشة القفل")
        .supportedFamilies([.accessoryRectangular])
    }
}

struct LockDayEntry: TimelineEntry { let date: Date }
struct LockDayProvider: TimelineProvider {
    func placeholder(in context: Context) -> LockDayEntry { LockDayEntry(date: Date()) }
    func getSnapshot(in context: Context, completion: @escaping (LockDayEntry) -> Void) { completion(LockDayEntry(date: Date())) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<LockDayEntry>) -> Void) {
        completion(Timeline(entries: [LockDayEntry(date: Date())], policy: .after(Date().addingTimeInterval(3600))))
    }
}

// MARK: - Routers

struct SmallRouter: View {
    let entry: RoohEntry<SmallWidgetIntent>
    var body: some View {
        let c = WidgetContext(date: entry.date, language: entry.configuration.language, calendar: entry.configuration.calendar, numerals: entry.configuration.numerals, theme: entry.configuration.theme, data: entry.data)
        Group {
            switch entry.configuration.widget {
            case .placeholder: EmptyPlaceholderView(sizeName: "Small Widget")
            case .daySimple: DaySimpleView(context: c)
            case .dayThuluth: DayThuluthView(context: c)
            case .dayDigital: DayDigitalView(context: c)
            case .monthSimple: MonthSimpleView(context: c)
            case .monthThuluth: MonthThuluthView(context: c)
            case .prayerSingle: PrayerSingleView(context: c)
            case .prayerTable: PrayerTableView(context: c, compact: true)
            case .verseOfDay: VerseView(context: c)
            case .azkarMorning: AzkarQuoteView(context: c, title: "أذكار الصباح", titleEn: "Morning Adhkar")
            case .azkarEvening: AzkarQuoteView(context: c, title: "أذكار المساء", titleEn: "Evening Adhkar")
            }
        }
        .roohWidgetBackground(theme: c.theme)
    }
}

struct MediumRouter: View {
    let entry: RoohEntry<MediumWidgetIntent>
    var body: some View {
        let c = WidgetContext(date: entry.date, language: entry.configuration.language, calendar: entry.configuration.calendar, numerals: entry.configuration.numerals, theme: entry.configuration.theme, data: entry.data)
        Group {
            switch entry.configuration.widget {
            case .placeholder: EmptyPlaceholderView(sizeName: "Medium Widget")
            case .daySimple: DaySimpleView(context: c)
            case .dayThuluth: DayThuluthView(context: c)
            case .dayDigital: DayDigitalView(context: c)
            case .monthSimple: MonthSimpleView(context: c)
            case .monthThuluth: MonthThuluthView(context: c)
            case .monthElegantEn: MonthElegantEnView(context: c)
            case .prayerSingle: PrayerSingleView(context: c)
            case .prayerTable: PrayerTableView(context: c, compact: false)
            case .prayerNextPrevious: PrayerNextPreviousView(context: c)
            case .verseOfDay: VerseView(context: c)
            case .azkarMorning: AzkarQuoteView(context: c, title: "أذكار الصباح", titleEn: "Morning Adhkar")
            case .azkarEvening: AzkarQuoteView(context: c, title: "أذكار المساء", titleEn: "Evening Adhkar")
            }
        }
        .roohWidgetBackground(theme: c.theme)
    }
}

struct LargeRouter: View {
    let entry: RoohEntry<LargeWidgetIntent>
    var body: some View {
        let c = WidgetContext(date: entry.date, language: entry.configuration.language, calendar: entry.configuration.calendar, numerals: entry.configuration.numerals, theme: entry.configuration.theme, data: entry.data)
        Group {
            switch entry.configuration.widget {
            case .placeholder: EmptyPlaceholderView(sizeName: "Large Widget")
            case .prayerTable: PrayerTableView(context: c, compact: false)
            case .verseOfDay: VerseView(context: c)
            case .azkarMorning: AzkarQuoteView(context: c, title: "أذكار الصباح", titleEn: "Morning Adhkar")
            case .azkarEvening: AzkarQuoteView(context: c, title: "أذكار المساء", titleEn: "Evening Adhkar")
            }
        }
        .roohWidgetBackground(theme: c.theme)
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

    /// Build a context that prefers the per-widget intent values, but falls back to
    /// app-level shared settings when the intent is at its default ("auto" / .light).
    /// This way, picking a theme or language inside the app affects newly-added widgets
    /// without users having to enter Edit Widget every time.
    init(date: Date, language: RoohLanguage, calendar: RoohCalendar, numerals: RoohNumerals, theme: RoohTheme, data: SharedWidgetData) {
        self.date = date
        self.data = data
        self.language = (language == .auto)
            ? RoohLanguage(rawValue: data.widgetLanguage ?? "auto") ?? .auto
            : language
        self.calendar = (calendar == .gregorian && data.widgetCalendar == "hijri")
            ? .hijri
            : calendar
        self.numerals = (numerals == .auto)
            ? RoohNumerals(rawValue: data.widgetNumerals ?? "auto") ?? .auto
            : numerals
        // Theme: only fall back if intent is .light AND user explicitly picked something else.
        // (Light is the small-widget intent default; user explicit picks override the fallback.)
        if theme == .light, let raw = data.widgetTheme, raw != "auto", raw != "light",
           let resolved = RoohTheme(rawValue: raw) {
            self.theme = resolved
        } else if theme == .light, data.widgetTheme == "auto" {
            // Auto: dark in dark mode, light otherwise. WidgetKit handles environment via .colorScheme,
            // but for the entry build we cannot read it directly here, so default to dark.
            self.theme = .dark
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

    /// Per-widget-type calendar: for Day widgets (DaySimple, DayThuluth, DayDigital).
    var dayCalendar: RoohCalendar {
        if let raw = data.widgetDayCalendar, raw != "auto" {
            return RoohCalendar(rawValue: raw) ?? calendar
        }
        return calendar
    }

    /// Per-widget-type calendar: for Month widgets (MonthSimple, MonthThuluth).
    var monthCalendar: RoohCalendar {
        if let raw = data.widgetMonthCalendar, raw != "auto" {
            return RoohCalendar(rawValue: raw) ?? calendar
        }
        return calendar
    }

    /// Date format string from shared container (Glassify sample-style key).
    /// One of: "none" | "gregorian-ar" | "hijri-ar" | "gregorian-en" | "hijri-en".
    var dateFormatKey: String {
        return data.widgetDateFormat ?? "gregorian-ar"
    }

    var arabicFontFamily: String {
        (data.widgetFontVariant == "widget2") ? "WidgetFont2" : "WidgetFont"
    }
}

/// User-selectable Arabic font for Date / Prayer / Hijri variants.
func arabicFont(_ context: WidgetContext, size: CGFloat) -> Font {
    .custom(context.arabicFontFamily, size: size)
}

/// Locked WidgetFont2 for Adhkar variants only.
func azkarFont(size: CGFloat) -> Font {
    .custom("WidgetFont2", size: size)
}

/// Prayer names (Arabic + English) — Rubik bold (Glassify-style).
func prayerNameFont(size: CGFloat) -> Font {
    .custom("Rubik-Bold", size: size)
}

struct ThemePalette {
    let background: Color
    let surface: Color
    let text: Color
    let muted: Color
    let accent: Color
    let isLight: Bool
}

func palette(_ theme: RoohTheme) -> ThemePalette {
    switch theme {
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
    func roohWidgetBackground(theme: RoohTheme) -> some View {
        let p = palette(theme)
        return self
            .containerBackground(for: .widget) {
                ZStack {
                    Rectangle().fill(.ultraThinMaterial)
                    p.background.opacity(p.isLight ? 0.92 : 0.88)
                }
            }
    }
}

// MARK: - Views

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
        if let raw = data.widgetTheme, let t = RoohTheme(rawValue: raw), t != .auto {
            return t
        }
        return .dark
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
                .font(isAr ? arabicFont(context, size: 24) : .system(size: 24, weight: .heavy, design: .rounded))
                .foregroundStyle(p.text)
                .padding(.vertical, isAr ? 6 : 2)
            Text(formatNumber(dayNumberFor(context, cal: cal), context))
                .font(context.usesArabicNumerals
                    ? arabicFont(context, size: 78)
                    : .system(size: 82, weight: .heavy, design: .rounded))
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
    var body: some View {
        let p = palette(context.theme)
        // Thuluth is a pure calligraphy widget — locked to Arabic content regardless
        // of the user's `widgetLanguage` choice. Only the theme palette reacts.
        Text(thuluthWeekdayName(context.date))
            .font(.custom(context.arabicFontFamily, size: 56))
            .minimumScaleFactor(0.35)
            .lineLimit(1)
            .foregroundStyle(p.text.opacity(0.92))
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding(14)
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
    var body: some View {
        let p = palette(context.theme)
        let label: String = {
            if context.monthCalendar == .hijri {
                return thuluthHijriMonthName(context.date)
            }
            let f = DateFormatter()
            f.locale = Locale(identifier: "ar")
            f.calendar = Calendar(identifier: .gregorian)
            f.dateFormat = "MMMM"
            return f.string(from: context.date)
        }()
        Text(label)
            .font(.custom(context.arabicFontFamily, size: 56))
            .minimumScaleFactor(0.35)
            .lineLimit(1)
            .foregroundStyle(p.text.opacity(0.92))
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding(14)
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
    var body: some View {
        let p = palette(context.theme)
        let prayer = context.data.prayer
        VStack(spacing: 8) {
            Text(context.isArabic ? "الصلاة القادمة" : "Next Prayer")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(p.muted)
            Text(context.isArabic ? (prayer?.nextPrayerNameAr ?? "الفجر") : (prayer?.nextPrayerName ?? "Fajr"))
                .font(prayerNameFont(size: 26))
                .foregroundStyle(p.text)
            Text(prayer?.nextPrayerTime ?? "04:15")
                .font(.custom("Rubik-Bold", size: 50))
                .foregroundStyle(p.text)
            Text(formatCountdown(prayer?.timeRemaining ?? "6:02", context))
                .font(.system(size: 13, weight: .medium, design: .rounded))
                .foregroundStyle(p.muted)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(12)
    }
}

struct PrayerTableView: View {
    let context: WidgetContext
    let compact: Bool
    var body: some View {
        let p = palette(context.theme)
        let prayer = context.data.prayer
        let prayers = normalizedPrayers(prayer)
        VStack(spacing: compact ? 4 : 8) {
            if compact {
                HStack {
                    Text(formatCountdown(prayer?.timeRemaining ?? "--:--", context))
                        .font(.system(size: 11, weight: .semibold, design: .rounded))
                        .foregroundStyle(p.muted)
                    Spacer()
                    Text(context.isArabic ? "الصلاة القادمة" : "Next Prayer")
                        .font(.system(size: 11, weight: .semibold, design: .rounded))
                        .foregroundStyle(p.muted)
                }
                .padding(.horizontal, 2)
            }

            if !compact {
                HStack(alignment: .center, spacing: 14) {
                    Image(systemName: prayerSymbol(prayer?.nextPrayer ?? "fajr"))
                        .font(.system(size: 30, weight: .semibold))
                        .foregroundStyle(p.muted)
                        .frame(width: 36)
                    Spacer(minLength: 0)
                    VStack(alignment: .trailing, spacing: 5) {
                        Text(context.isArabic ? (prayer?.nextPrayerNameAr ?? "الفجر") : (prayer?.nextPrayerName ?? "Fajr"))
                            .font(prayerNameFont(size: 22))
                            .foregroundStyle(p.text)
                        Text(prayer?.nextPrayerTime ?? "04:15")
                            .font(.custom("Rubik-Bold", size: 36))
                            .foregroundStyle(p.text)
                        Text(
                            context.isArabic
                                ? "الصلاة القادمة " + formatCountdown(prayer?.timeRemaining ?? "--:--", context)
                                : "Next prayer " + formatCountdown(prayer?.timeRemaining ?? "--:--", context)
                        )
                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                        .foregroundStyle(p.muted)
                    }
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 14)
                .background(RoundedRectangle(cornerRadius: 16).fill(p.surface))
            }

            VStack(spacing: compact ? 1 : 3) {
                ForEach(prayers) { item in
                    HStack(spacing: 8) {
                        Text(item.time ?? "--:--")
                            .font(.custom("Rubik-Bold", size: compact ? 14 : 17))
                            .foregroundStyle((item.isNext ?? false) ? p.text : p.muted)
                        Spacer()
                        HStack(spacing: 6) {
                            Text(context.isArabic ? (item.nameAr ?? "الفجر") : (item.name ?? "Fajr"))
                                .font(prayerNameFont(size: compact ? 14 : 17))
                                .foregroundStyle((item.isNext ?? false) ? p.text : p.muted)
                            if !compact {
                                Image(systemName: prayerSymbol(item.name ?? "fajr"))
                                    .font(.system(size: 14, weight: .bold))
                                    .frame(width: 18)
                                    .foregroundStyle((item.isNext ?? false) ? p.text : p.muted)
                            }
                        }
                    }
                    .padding(.horizontal, compact ? 8 : 12)
                    .padding(.vertical, compact ? 3 : 5)
                    .background(
                        RoundedRectangle(cornerRadius: 11)
                            .fill((item.isNext ?? false)
                                ? (p.isLight ? Color.black.opacity(0.06) : Color.white.opacity(0.12))
                                : Color.clear)
                    )
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(compact ? 10 : 12)
    }
}

struct PrayerNextPreviousView: View {
    let context: WidgetContext
    var body: some View {
        let p = palette(context.theme)
        let prayer = context.data.prayer
        let prayers = normalizedPrayers(prayer)
        let nextIndex = prayers.firstIndex { $0.isNext ?? false } ?? 0
        let prevIndex = (nextIndex - 1 + prayers.count) % max(prayers.count, 1)
        let next = prayers.isEmpty ? nil : prayers[nextIndex]
        let previous = prayers.isEmpty ? nil : prayers[prevIndex]

        let prevElapsed = elapsedSince(previous?.time, now: context.date)

        HStack(spacing: 14) {
            prayerBox(item: next, subtitle: context.isArabic ? "بعد \(prayer?.timeRemaining ?? "--")" : "in \(prayer?.timeRemaining ?? "--")", palette: p)
            prayerBox(item: previous, subtitle: context.isArabic ? "منذ \(prevElapsed)" : "\(prevElapsed) ago", palette: p)
        }
        .padding(10)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    /// Computes "Xh Ym" duration between a prayer time string ("HH:mm") and now.
    /// Falls back to "—" when the time can't be parsed.
    func elapsedSince(_ timeString: String?, now: Date) -> String {
        guard let raw = timeString, !raw.isEmpty else { return "—" }
        let parts = raw.split(separator: ":")
        guard parts.count >= 2,
              let h = Int(parts[0]),
              let m = Int(parts[1]) else { return raw }
        let cal = Calendar(identifier: .gregorian)
        var comp = cal.dateComponents([.year, .month, .day], from: now)
        comp.hour = h
        comp.minute = m
        guard let prayerDate = cal.date(from: comp) else { return raw }
        // If the prayer time is later in the day than "now", it's actually yesterday's prayer.
        let target = prayerDate > now ? cal.date(byAdding: .day, value: -1, to: prayerDate) ?? prayerDate : prayerDate
        let mins = max(0, Int(now.timeIntervalSince(target) / 60))
        let hours = mins / 60
        let minutes = mins % 60
        if context.isArabic {
            let h = formatNumber(hours, context)
            let m = formatNumber(minutes, context)
            return "\(h) س \(m) د"
        }
        return "\(hours)h \(minutes)m"
    }

    func prayerBox(item: WidgetPrayerItem?, subtitle: String, palette p: ThemePalette) -> some View {
        VStack(spacing: 6) {
            Image(systemName: prayerSymbol(item?.name ?? "fajr"))
                .font(.system(size: 25, weight: .bold))
                .foregroundStyle(p.muted)
            Text(context.isArabic ? (item?.nameAr ?? "الفجر") : (item?.name ?? "Fajr"))
                .font(prayerNameFont(size: 18))
                .foregroundStyle(p.text)
            Text(item?.time ?? "--:--")
                .font(.custom("Rubik-Bold", size: 33))
                .foregroundStyle(p.text)
            Text(subtitle)
                .font(.system(size: 12, weight: .bold, design: .rounded))
                .foregroundStyle(p.muted)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(RoundedRectangle(cornerRadius: 18).fill(p.surface))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(p.isLight ? Color.black.opacity(0.08) : Color.white.opacity(0.12), lineWidth: 1))
    }
}

struct VerseView: View {
    let context: WidgetContext
    var body: some View {
        let p = palette(context.theme)
        let verse = context.data.verse
        let showTranslation = !context.isArabic && (verse?.translation ?? "").isEmpty == false
        VStack(spacing: 10) {
            Text("﴿\(verse?.arabic ?? "وَلَكُمْ فِي الْقِصَاصِ حَيَاةٌ يَا أُولِي الْأَلْبَابِ")﴾")
                .font(.custom("KFGQPC-Uthmanic-Script", size: 24))
                .minimumScaleFactor(0.45)
                .multilineTextAlignment(.center)
                .lineLimit(showTranslation ? 2 : 4)
                .foregroundStyle(p.text)
            if showTranslation {
                Text(verse?.translation ?? "")
                    .font(.custom("Rubik-Regular", size: 12))
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .foregroundStyle(p.muted)
            }
            Text("\(context.isArabic ? (verse?.surahName ?? "البقرة") : (verse?.surahNameEn ?? "Al-Baqarah")) · \(formatNumber(verse?.numberInSurah ?? 179, context))")
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(p.muted)
        }
        .padding(14)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct AzkarQuoteView: View {
    let context: WidgetContext
    let title: String
    var titleEn: String = ""
    var body: some View {
        let p = palette(context.theme)
        let zikr = context.data.azkar?.randomZikr
        let displayTitle = (!context.isArabic && !titleEn.isEmpty) ? titleEn : title
        VStack(spacing: 10) {
            Text(displayTitle)
                .font(.system(size: 14, weight: .heavy))
                .foregroundStyle(p.muted)
            Text(zikr?.text ?? "اللهم صل وسلم على نبينا محمد")
                .font(azkarFont(size: 25))
                .minimumScaleFactor(0.45)
                .multilineTextAlignment(.center)
                .lineLimit(4)
                .foregroundStyle(p.text)
            if let count = zikr?.count, count > 1 {
                Text("\(formatNumber(count, context))×")
                    .font(.system(size: 14, weight: .heavy, design: .rounded))
                    .foregroundStyle(p.muted)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct LockDayThuluthView: View {
    let date: Date
    var body: some View {
        let shared = loadSharedData(SharedWidgetData.self) ?? sampleSharedData()
        let lang: RoohLanguage = RoohLanguage(rawValue: shared.widgetLanguage ?? "ar") ?? .ar
        let cal: RoohCalendar = RoohCalendar(rawValue: shared.widgetDayCalendar ?? shared.widgetCalendar ?? "gregorian") ?? .gregorian
        let nums: RoohNumerals = RoohNumerals(rawValue: shared.widgetNumerals ?? "arabic") ?? .arabic
        let context = WidgetContext(date: date, language: lang, calendar: cal, numerals: nums, theme: .dark, data: shared)
        Text(weekdayName(context))
            .font(arabicFont(context, size: 24))
            .lineLimit(1)
            .minimumScaleFactor(0.5)
            .foregroundStyle(.white)
            .containerBackground(for: .widget) { Color.clear }
    }
}

struct LockMonthThuluthView: View {
    let date: Date
    var body: some View {
        let shared = loadSharedData(SharedWidgetData.self) ?? sampleSharedData()
        let fontFamily = (shared.widgetFontVariant == "widget2") ? "WidgetFont2" : "WidgetFont"
        let monthCal = shared.widgetMonthCalendar ?? shared.widgetCalendar ?? "hijri"
        let label: String = {
            if monthCal == "hijri" {
                return thuluthHijriMonthName(date)
            }
            let f = DateFormatter()
            f.locale = Locale(identifier: "ar")
            f.calendar = Calendar(identifier: .gregorian)
            f.dateFormat = "MMMM"
            return f.string(from: date)
        }()
        Text(label)
            .font(.custom(fontFamily, size: 22))
            .lineLimit(1)
            .minimumScaleFactor(0.4)
            .foregroundStyle(.white)
            .containerBackground(for: .widget) { Color.clear }
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

func normalizedPrayers(_ prayer: WidgetPrayerData?) -> [WidgetPrayerItem] {
    if let items = prayer?.allPrayers, !items.isEmpty { return items }
    return sampleSharedData().prayer?.allPrayers ?? []
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
    cal == .hijri ? Calendar(identifier: .islamicUmmAlQura) : Calendar(identifier: .gregorian)
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

func formatCountdown(_ remaining: String, _ context: WidgetContext) -> String {
    if remaining == "--:--" || remaining.isEmpty { return context.isArabic ? "بعد —" : "in —" }
    return context.isArabic ? "بعد \(remaining.replacingOccurrences(of: ":", with: " س ")) د" : "in \(remaining)"
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
