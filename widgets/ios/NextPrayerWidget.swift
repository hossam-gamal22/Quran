// widgets/ios/NextPrayerWidget.swift
// ويدجت مواقيت الصلاة - روح المسلم
// iOS 14+ WidgetKit

import WidgetKit
import SwiftUI

// ========================================
// نموذج البيانات
// ========================================

struct PrayerTime: Codable, Identifiable {
    let id = UUID()
    var name: String
    var nameAr: String
    var time: String
    var isPassed: Bool
    var isNext: Bool
    
    enum CodingKeys: String, CodingKey {
        case name, nameAr, time, isPassed, isNext
    }
}

struct PrayerWidgetData: Codable {
    var nextPrayer: String
    var nextPrayerName: String
    var nextPrayerNameAr: String
    var nextPrayerTime: String
    var timeRemaining: String
    var timeRemainingMinutes: Int
    var timeRemainingLabel: String?
    var allPrayers: [PrayerTime]
    var hijriDate: String
    var hijriDay: Int
    var hijriMonth: String
    var hijriMonthEn: String?
    var hijriYear: Int
    var gregorianDate: String
    var location: String
    var lastUpdated: String
}

struct WidgetSettings: Codable {
    var enabled: Bool
    var prayerWidget: PrayerWidgetSettings
    
    struct PrayerWidgetSettings: Codable {
        var enabled: Bool
        var showAllPrayers: Bool
        var showHijriDate: Bool
        var showLocation: Bool
        var showCompletion: Bool?
        var colorScheme: String
        var accentColor: String
        /// Visual style for the medium (4×2) prayer widget: "pair" | "table" | "banner".
        var style: String?
        /// Visual style for the small (2×2) prayer widget: "compact" | "simple".
        var smallStyle: String?
    }
}

/// بيانات إكمال الصلوات
struct PrayerCompletionData: Codable {
    var date: String
    var prayers: PrayerCompletionPrayers
    var lastUpdated: String
    
    struct PrayerCompletionPrayers: Codable {
        var fajr: Bool
        var dhuhr: Bool
        var asr: Bool
        var maghrib: Bool
        var isha: Bool
    }
}

/// قراءة بيانات إكمال الصلوات من الحاوية المشتركة
func loadPrayerCompletion() -> PrayerCompletionData? {
    guard let data = loadSharedRawData(),
          let jsonData = try? JSONDecoder().decode(PrayerCompletionContainer.self, from: data) else {
        return nil
    }
    return jsonData.prayerCompletion
}

struct PrayerCompletionContainer: Codable {
    var prayerCompletion: PrayerCompletionData?
}

// ========================================
// مزود البيانات
// ========================================

struct PrayerWidgetEntry: TimelineEntry {
    let date: Date
    let data: PrayerWidgetData?
    let settings: WidgetSettings?
    var language: String? = nil
}

struct PrayerWidgetProvider: TimelineProvider {
    typealias Entry = PrayerWidgetEntry
    
    // App Group ID للمشاركة مع التطبيق الرئيسي
    let appGroupId = WidgetConstants.appGroupId
    
    func placeholder(in context: Context) -> PrayerWidgetEntry {
        PrayerWidgetEntry(
            date: Date(),
            data: sampleData,
            settings: nil,
            language: "ar"
        )
    }
    
    func getSnapshot(in context: Context, completion: @escaping (PrayerWidgetEntry) -> Void) {
        let entry = PrayerWidgetEntry(
            date: Date(),
            data: loadData(),
            settings: loadSettings(),
            language: loadLanguage()
        )
        completion(entry)
    }
    
    func getTimeline(in context: Context, completion: @escaping (Timeline<PrayerWidgetEntry>) -> Void) {
        let currentDate = Date()
        let data = loadData()
        let settings = loadSettings()
        let language = loadLanguage()
        
        // إنشاء entries للتحديث كل 15 دقيقة
        var entries: [PrayerWidgetEntry] = []
        
        for minuteOffset in stride(from: 0, to: 60, by: 15) {
            let entryDate = Calendar.current.date(byAdding: .minute, value: minuteOffset, to: currentDate)!
            let entry = PrayerWidgetEntry(
                date: entryDate,
                data: data,
                settings: settings,
                language: language
            )
            entries.append(entry)
        }
        
        // تحديث بعد ساعة
        let nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: currentDate)!
        let timeline = Timeline(entries: entries, policy: .after(nextUpdate))
        completion(timeline)
    }
    
    // قراءة البيانات من App Group (UserDefaults أولاً ثم ملف)
    private func loadData() -> PrayerWidgetData? {
        guard let data = loadSharedRawData(),
              let widgetData = try? JSONDecoder().decode(SharedWidgetData.self, from: data) else {
            return nil
        }
        return widgetData.prayer
    }
    
    private func loadSettings() -> WidgetSettings? {
        guard let data = loadSharedRawData(),
              let widgetData = try? JSONDecoder().decode(SharedWidgetData.self, from: data) else {
            return nil
        }
        return widgetData.settings
    }

    private func loadLanguage() -> String {
        guard let data = loadSharedRawData(),
              let widgetData = try? JSONDecoder().decode(SharedWidgetData.self, from: data) else {
            return "ar"
        }
        return widgetData.language ?? "ar"
    }
    
    // بيانات تجريبية
    private var sampleData: PrayerWidgetData {
        PrayerWidgetData(
            nextPrayer: "dhuhr",
            nextPrayerName: "Dhuhr",
            nextPrayerNameAr: "الظهر",
            nextPrayerTime: "12:15 م",
            timeRemaining: "2:30",
            timeRemainingMinutes: 150,
            timeRemainingLabel: "الوقت المتبقي",
            allPrayers: [
                PrayerTime(name: "Fajr", nameAr: "الفجر", time: "4:30 ص", isPassed: true, isNext: false),
                PrayerTime(name: "Sunrise", nameAr: "الشروق", time: "5:55 ص", isPassed: true, isNext: false),
                PrayerTime(name: "Dhuhr", nameAr: "الظهر", time: "12:15 م", isPassed: false, isNext: true),
                PrayerTime(name: "Asr", nameAr: "العصر", time: "3:45 م", isPassed: false, isNext: false),
                PrayerTime(name: "Maghrib", nameAr: "المغرب", time: "6:20 م", isPassed: false, isNext: false),
                PrayerTime(name: "Isha", nameAr: "العشاء", time: "7:50 م", isPassed: false, isNext: false),
            ],
            hijriDate: "15 رمضان 1446",
            hijriDay: 15,
            hijriMonth: "رمضان",
            hijriYear: 1446,
            gregorianDate: "الأحد 2 مارس",
            location: "مكة المكرمة",
            lastUpdated: ISO8601DateFormatter().string(from: Date())
        )
    }
}

struct SharedWidgetData: Codable {
    var prayer: PrayerWidgetData
    var settings: WidgetSettings
    var language: String?
}

// ========================================
// واجهة الويدجت الصغير
// ========================================

struct SmallPrayerWidgetView: View {
    let entry: PrayerWidgetEntry
    let theme: IOSWidgetTheme
    
    var body: some View {
        let style = entry.settings?.prayerWidget.smallStyle ?? "compact"
        switch style {
        case "simple":
            RitualPrayerSimple(entry: entry)
        default:
            RitualPrayerCompact(entry: entry)
        }
    }
}

// ========================================
// واجهة الويدجت المتوسط
// ========================================

struct MediumPrayerWidgetView: View {
    let entry: PrayerWidgetEntry
    let theme: IOSWidgetTheme
    
    var body: some View {
        let style = entry.settings?.prayerWidget.style ?? "pair"
        switch style {
        case "table":
            RitualPrayerTable(entry: entry)
        case "banner":
            RitualPrayerBanner(entry: entry)
        default:
            RitualPrayerPair(entry: entry)
        }
    }
}

// ========================================
// واجهة الويدجت الكبير
// ========================================

struct LargePrayerWidgetView: View {
    let entry: PrayerWidgetEntry
    let theme: IOSWidgetTheme
    
    var body: some View {
        ZStack {
            ThemedWidgetBackground(theme: theme)
            
            VStack(spacing: 12) {
                // Header with icon
                HStack {
                    WidgetAppIcon(size: 20)
                    Text("مواقيت الصلاة")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(theme.textColor)
                    
                    Spacer()
                    
                    if entry.settings?.prayerWidget.showHijriDate ?? true {
                        VStack(alignment: .trailing, spacing: 2) {
                            Text(entry.data?.hijriDate ?? "15 رمضان 1446")
                                .font(.system(size: 11, weight: .medium))
                            Text(entry.data?.gregorianDate ?? "الأحد 2 مارس")
                                .font(.system(size: 9))
                        }
                        .foregroundColor(theme.mutedColor)
                    }
                }
                .padding(.horizontal)
                
                // Next prayer highlight
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("الصلاة القادمة")
                            .font(.system(size: 11))
                            .foregroundColor(theme.mutedColor.opacity(0.6))
                        
                        HStack {
                            Image(systemName: prayerIcon)
                                .font(.system(size: 18))
                            Text(entry.data?.nextPrayerNameAr ?? "الظهر")
                                .font(.system(size: 24, weight: .bold))
                        }
                        .foregroundColor(theme.textColor)
                    }
                    
                    Spacer()
                    
                    VStack(alignment: .trailing, spacing: 4) {
                        Text(entry.data?.nextPrayerTime ?? "12:15 م")
                            .font(.system(size: 32, weight: .bold, design: .rounded))
                            .foregroundColor(theme.textColor)
                        
                        GlassPill(color: theme.badgeBg.opacity(0.6)) {
                            HStack(spacing: 4) {
                                Image(systemName: "timer")
                                    .font(.system(size: 10))
                                Text(entry.data?.timeRemaining ?? "2:30")
                                    .font(.system(size: 11, weight: .medium))
                            }
                            .foregroundColor(theme.badgeText)
                        }
                    }
                }
                .padding(.horizontal)
                .padding(.vertical, 8)
                .background(theme.badgeBg.opacity(0.3))
                .cornerRadius(14)
                .padding(.horizontal)
                
                // Prayer list
                VStack(spacing: 6) {
                    ForEach(entry.data?.allPrayers ?? []) { prayer in
                        HStack {
                            if entry.settings?.prayerWidget.showCompletion ?? true {
                                let isCompleted = isPrayerCompleted(prayer.name)
                                Image(systemName: isCompleted ? "checkmark.circle.fill" : "circle")
                                    .font(.system(size: 13))
                                    .frame(width: 18)
                                    .foregroundColor(isCompleted ? .green : theme.mutedColor.opacity(0.25))
                            }
                            
                            Image(systemName: iconForPrayer(prayer.name))
                                .font(.system(size: 13))
                                .frame(width: 22)
                                .foregroundColor(prayer.isPassed ? theme.mutedColor.opacity(0.3) : prayer.isNext ? theme.badgeText : theme.mutedColor)
                            
                            Text(prayer.nameAr)
                                .font(.system(size: 13, weight: prayer.isNext ? .bold : .regular))
                                .foregroundColor(prayer.isPassed ? theme.mutedColor.opacity(0.3) : prayer.isNext ? theme.badgeText : theme.textColor)
                            
                            Spacer()
                            
                            Text(prayer.time)
                                .font(.system(size: 13, weight: .medium, design: .rounded))
                                .foregroundColor(prayer.isPassed ? theme.mutedColor.opacity(0.3) : prayer.isNext ? theme.badgeText : theme.textColor)
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 5)
                        .background(prayer.isNext ? theme.badgeBg.opacity(0.4) : Color.clear)
                        .cornerRadius(8)
                    }
                }
                .padding(.horizontal)
                
                Spacer()
            }
            .padding(.vertical)
        }
        .overlay(
            RoundedRectangle(cornerRadius: 24)
                .stroke(WidgetConstants.Glass.border, lineWidth: 1)
        )
    }
    
    var prayerIcon: String {
        iconForPrayer(entry.data?.nextPrayer ?? "dhuhr")
    }
    
    func iconForPrayer(_ prayer: String) -> String {
        switch prayer.lowercased() {
        case "fajr": return "sunrise"
        case "sunrise": return "sun.max"
        case "dhuhr": return "sun.max.fill"
        case "asr": return "sun.haze"
        case "maghrib": return "sunset"
        case "isha": return "moon.stars"
        default: return "clock"
        }
    }
    
    /// التحقق من إكمال صلاة معينة
    func isPrayerCompleted(_ prayerName: String) -> Bool {
        guard let completion = loadPrayerCompletion() else { return false }
        let todayDate = {
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"
            return formatter.string(from: Date())
        }()
        guard completion.date == todayDate else { return false }
        switch prayerName.lowercased() {
        case "fajr": return completion.prayers.fajr
        case "dhuhr": return completion.prayers.dhuhr
        case "asr": return completion.prayers.asr
        case "maghrib": return completion.prayers.maghrib
        case "isha": return completion.prayers.isha
        default: return false
        }
    }
}

// ========================================
// الويدجت الرئيسي
// ========================================

struct NextPrayerWidget: Widget {
    let kind: String = "NextPrayerWidget"
    
    var body: some WidgetConfiguration {
        StaticConfiguration(
            kind: kind,
            provider: PrayerWidgetProvider()
        ) { entry in
            NextPrayerWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("مواقيت الصلاة")
        .description("عرض الصلاة القادمة والوقت المتبقي")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryCircular, .accessoryRectangular, .accessoryInline])
    }
}

struct NextPrayerWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    var entry: PrayerWidgetProvider.Entry
    let theme = loadWidgetTheme()
    
    var body: some View {
        switch family {
        case .systemSmall:
            SmallPrayerWidgetView(entry: entry, theme: theme)
                .widgetURL(URL(string: "rooh-almuslim://prayer"))
        case .systemMedium:
            MediumPrayerWidgetView(entry: entry, theme: theme)
                .widgetURL(URL(string: "rooh-almuslim://prayer"))
        case .systemLarge:
            LargePrayerWidgetView(entry: entry, theme: theme)
                .widgetURL(URL(string: "rooh-almuslim://prayer"))
        case .accessoryCircular:
            AccessoryCircularPrayerView(entry: entry)
                .widgetURL(URL(string: "rooh-almuslim://prayer"))
        case .accessoryRectangular:
            AccessoryRectangularPrayerView(entry: entry)
                .widgetURL(URL(string: "rooh-almuslim://prayer"))
        case .accessoryInline:
            AccessoryInlinePrayerView(entry: entry)
        default:
            SmallPrayerWidgetView(entry: entry, theme: theme)
                .widgetURL(URL(string: "rooh-almuslim://prayer"))
        }
    }
}

// ========================================
// المعاينة
// ========================================

// ========================================
// واجهات شاشة القفل — Lock Screen Accessories (iOS 16+)
// ========================================

/// accessoryRectangular — شبكة ٢×٣ لجميع مواقيت الصلاة
struct AccessoryRectangularPrayerView: View {
    let entry: PrayerWidgetEntry
    
    var prayers: [PrayerTime] {
        entry.data?.allPrayers ?? []
    }
    
    var body: some View {
        let rightColumn = Array(prayers.prefix(3))
        let leftColumn = Array(prayers.dropFirst(3).prefix(3))
        
        HStack(spacing: 8) {
            // العمود الأيمن — الفجر، الشروق، الظهر
            VStack(alignment: .trailing, spacing: 2) {
                ForEach(rightColumn) { prayer in
                    prayerRow(prayer)
                }
            }
            
            // العمود الأيسر — العصر، المغرب، العشاء
            VStack(alignment: .trailing, spacing: 2) {
                ForEach(leftColumn) { prayer in
                    prayerRow(prayer)
                }
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }
    
    @ViewBuilder
    func prayerRow(_ prayer: PrayerTime) -> some View {
        HStack(spacing: 4) {
            Image(systemName: prayer.isNext ? "circle.fill" : "circle")
                .font(.system(size: 5))
                .widgetAccentable()
                .opacity(prayer.isPassed ? 0.4 : 1.0)
            
            Text(prayer.nameAr)
                .font(.system(size: 10, weight: prayer.isNext ? .bold : .regular))
                .lineLimit(1)
                .opacity(prayer.isPassed ? 0.4 : 1.0)
            
            Text(prayer.time)
                .font(.system(size: 10, weight: .medium, design: .rounded))
                .lineLimit(1)
                .opacity(prayer.isPassed ? 0.4 : 1.0)
        }
        .widgetAccentable(prayer.isNext)
    }
}

/// accessoryInline — سطر واحد: اسم الصلاة القادمة + الوقت
struct AccessoryInlinePrayerView: View {
    let entry: PrayerWidgetEntry
    
    var body: some View {
        ViewThatFits {
            Text("\(entry.data?.nextPrayerNameAr ?? "الظهر") • \(entry.data?.nextPrayerTime ?? "12:15")")
            Text("\(entry.data?.nextPrayerNameAr ?? "الظهر") \(entry.data?.nextPrayerTime ?? "12:15")")
            Text(entry.data?.nextPrayerNameAr ?? "الظهر")
        }
    }
}

/// accessoryCircular — حلقة العد التنازلي للصلاة القادمة
struct AccessoryCircularPrayerView: View {
    let entry: PrayerWidgetEntry
    
    /// نسبة الوقت المتبقي (0..1) — تقدير لفترة بين الصلوات ~4 ساعات
    var progress: Double {
        let remaining = Double(entry.data?.timeRemainingMinutes ?? 0)
        let total: Double = 240 // متوسط الفترة بين الصلوات
        guard total > 0 else { return 0 }
        return min(max(remaining / total, 0), 1)
    }
    
    var body: some View {
        Gauge(value: progress) {
            // تسمية غير مرئية
            Text("")
        } currentValueLabel: {
            VStack(spacing: 0) {
                Text(entry.data?.nextPrayerNameAr ?? "الظهر")
                    .font(.system(size: 10, weight: .bold))
                    .minimumScaleFactor(0.6)
                    .lineLimit(1)
            }
        }
        .gaugeStyle(.accessoryCircularCapacity)
        .widgetAccentable()
    }
}

// Color(hex:) extension is defined in WidgetBundle.swift

// ========================================
// المعاينة
// ========================================

struct NextPrayerWidget_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            NextPrayerWidgetEntryView(entry: PrayerWidgetEntry(
                date: Date(),
                data: nil,
                settings: nil
            ))
            .previewContext(WidgetPreviewContext(family: .systemSmall))
            .previewDisplayName("Small")
            
            NextPrayerWidgetEntryView(entry: PrayerWidgetEntry(
                date: Date(),
                data: nil,
                settings: nil
            ))
            .previewContext(WidgetPreviewContext(family: .systemMedium))
            .previewDisplayName("Medium")
            
            NextPrayerWidgetEntryView(entry: PrayerWidgetEntry(
                date: Date(),
                data: nil,
                settings: nil
            ))
            .previewContext(WidgetPreviewContext(family: .systemLarge))
            .previewDisplayName("Large")
            
            NextPrayerWidgetEntryView(entry: PrayerWidgetEntry(
                date: Date(),
                data: nil,
                settings: nil
            ))
            .previewContext(WidgetPreviewContext(family: .accessoryRectangular))
            .previewDisplayName("Lock Screen Rectangular")
            
            NextPrayerWidgetEntryView(entry: PrayerWidgetEntry(
                date: Date(),
                data: nil,
                settings: nil
            ))
            .previewContext(WidgetPreviewContext(family: .accessoryCircular))
            .previewDisplayName("Lock Screen Circular")
            
            NextPrayerWidgetEntryView(entry: PrayerWidgetEntry(
                date: Date(),
                data: nil,
                settings: nil
            ))
            .previewContext(WidgetPreviewContext(family: .accessoryInline))
            .previewDisplayName("Lock Screen Inline")
        }
    }
}
