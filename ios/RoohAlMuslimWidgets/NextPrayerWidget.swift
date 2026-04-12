// widgets/ios/NextPrayerWidget.swift
// ويدجت مواقيت الصلاة - روح المسلم
// iOS 14+ WidgetKit

import WidgetKit
import SwiftUI
import Intents

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
    let configuration: ConfigurationIntent?
}

struct PrayerWidgetProvider: IntentTimelineProvider {
    typealias Intent = ConfigurationIntent
    typealias Entry = PrayerWidgetEntry
    
    // App Group ID للمشاركة مع التطبيق الرئيسي
    let appGroupId = WidgetConstants.appGroupId
    
    func placeholder(in context: Context) -> PrayerWidgetEntry {
        PrayerWidgetEntry(
            date: Date(),
            data: sampleData,
            settings: nil,
            configuration: nil
        )
    }
    
    func getSnapshot(for configuration: ConfigurationIntent, in context: Context, completion: @escaping (PrayerWidgetEntry) -> Void) {
        let entry = PrayerWidgetEntry(
            date: Date(),
            data: loadData(),
            settings: loadSettings(),
            configuration: configuration
        )
        completion(entry)
    }
    
    func getTimeline(for configuration: ConfigurationIntent, in context: Context, completion: @escaping (Timeline<PrayerWidgetEntry>) -> Void) {
        let currentDate = Date()
        let data = loadData()
        let settings = loadSettings()
        
        // إنشاء entries للتحديث كل 15 دقيقة
        var entries: [PrayerWidgetEntry] = []
        
        for minuteOffset in stride(from: 0, to: 60, by: 15) {
            let entryDate = Calendar.current.date(byAdding: .minute, value: minuteOffset, to: currentDate)!
            let entry = PrayerWidgetEntry(
                date: entryDate,
                data: data,
                settings: settings,
                configuration: configuration
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
}

// ========================================
// واجهة الويدجت الصغير
// ========================================

struct SmallPrayerWidgetView: View {
    let entry: PrayerWidgetEntry
    
    var accentColor: Color {
        Color(hex: entry.settings?.prayerWidget.accentColor ?? "#2f7659")
    }
    
    var body: some View {
        ZStack {
            GlassWidgetBackground(accentColor: accentColor)
            
            VStack(spacing: 6) {
                // App icon
                WidgetAppIcon(size: 32)
                
                // اسم الصلاة القادمة
                Text(entry.data?.nextPrayerNameAr ?? "الظهر")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.white)
                
                // الوقت
                Text(entry.data?.nextPrayerTime ?? "12:15 م")
                    .font(.system(size: 24, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
                
                // الوقت المتبقي
                GlassPill(color: WidgetConstants.Colors.gold.opacity(0.25)) {
                    HStack(spacing: 4) {
                        Image(systemName: "timer")
                            .font(.system(size: 10))
                        Text(entry.data?.timeRemaining ?? "2:30")
                            .font(.system(size: 11, weight: .medium))
                    }
                    .foregroundColor(WidgetConstants.Colors.gold)
                }
                
                // التاريخ الهجري
                if entry.settings?.prayerWidget.showHijriDate ?? true {
                    Text(entry.data?.hijriDate ?? "15 رمضان")
                        .font(.system(size: 9))
                        .foregroundColor(.white.opacity(0.6))
                }
            }
            .padding()
        }
        .overlay(
            RoundedRectangle(cornerRadius: 24)
                .stroke(WidgetConstants.Glass.border, lineWidth: 1)
        )
    }
    
    var prayerIcon: String {
        switch entry.data?.nextPrayer ?? "dhuhr" {
        case "fajr": return "sunrise"
        case "sunrise": return "sun.max"
        case "dhuhr": return "sun.max.fill"
        case "asr": return "sun.haze"
        case "maghrib": return "sunset"
        case "isha": return "moon.stars"
        default: return "clock"
        }
    }
}

// ========================================
// واجهة الويدجت المتوسط
// ========================================

struct MediumPrayerWidgetView: View {
    let entry: PrayerWidgetEntry
    
    var accentColor: Color {
        Color(hex: entry.settings?.prayerWidget.accentColor ?? "#2f7659")
    }
    
    var body: some View {
        ZStack {
            GlassWidgetBackground(accentColor: accentColor)
            
            VStack(spacing: 0) {
                // Header with app icon
                HStack {
                    WidgetAppIcon(size: 20)
                    Text("مواقيت الصلاة")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.white.opacity(0.8))
                    Spacer()
                    if entry.settings?.prayerWidget.showHijriDate ?? true {
                        Text(entry.data?.hijriDate ?? "15 رمضان")
                            .font(.system(size: 10))
                            .foregroundColor(.white.opacity(0.5))
                    }
                }
                .padding(.horizontal)
                .padding(.top, 10)
                .padding(.bottom, 6)
                
                HStack(spacing: 15) {
                    // Left: next prayer info
                    VStack(alignment: .leading, spacing: 4) {
                        Text(entry.data?.nextPrayerNameAr ?? "الظهر")
                            .font(.system(size: 22, weight: .bold))
                            .foregroundColor(.white)
                        
                        Text(entry.data?.nextPrayerTime ?? "12:15 م")
                            .font(.system(size: 28, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                        
                        GlassPill(color: WidgetConstants.Colors.gold.opacity(0.25)) {
                            HStack(spacing: 4) {
                                Image(systemName: "timer")
                                    .font(.system(size: 10))
                                Text(entry.data?.timeRemaining ?? "2:30")
                                    .font(.system(size: 11, weight: .medium))
                            }
                            .foregroundColor(WidgetConstants.Colors.gold)
                        }
                    }
                    
                    Spacer()
                    
                    // Right: all prayers list
                    if entry.settings?.prayerWidget.showAllPrayers ?? true {
                        VStack(alignment: .trailing, spacing: 3) {
                            ForEach(entry.data?.allPrayers ?? []) { prayer in
                                HStack(spacing: 6) {
                                    Text(prayer.time)
                                        .font(.system(size: 11, weight: .medium, design: .rounded))
                                    Text(prayer.nameAr)
                                        .font(.system(size: 11, weight: prayer.isNext ? .bold : .regular))
                                }
                                .foregroundColor(prayer.isPassed ? .white.opacity(0.35) : prayer.isNext ? WidgetConstants.Colors.gold : .white.opacity(0.8))
                                .padding(.horizontal, prayer.isNext ? 6 : 0)
                                .padding(.vertical, prayer.isNext ? 2 : 0)
                                .background(prayer.isNext ? WidgetConstants.Glass.pill : Color.clear)
                                .cornerRadius(6)
                            }
                        }
                    }
                }
                .padding(.horizontal)
                .padding(.bottom, 10)
            }
        }
        .overlay(
            RoundedRectangle(cornerRadius: 24)
                .stroke(WidgetConstants.Glass.border, lineWidth: 1)
        )
    }
    
    var prayerIcon: String {
        switch entry.data?.nextPrayer ?? "dhuhr" {
        case "fajr": return "sunrise"
        case "sunrise": return "sun.max"
        case "dhuhr": return "sun.max.fill"
        case "asr": return "sun.haze"
        case "maghrib": return "sunset"
        case "isha": return "moon.stars"
        default: return "clock"
        }
    }
}

// ========================================
// واجهة الويدجت الكبير
// ========================================

struct LargePrayerWidgetView: View {
    let entry: PrayerWidgetEntry
    
    var accentColor: Color {
        Color(hex: entry.settings?.prayerWidget.accentColor ?? "#2f7659")
    }
    
    var body: some View {
        ZStack {
            GlassWidgetBackground(accentColor: accentColor)
            
            VStack(spacing: 12) {
                // Header with icon
                HStack {
                    WidgetAppIcon(size: 20)
                    Text("مواقيت الصلاة")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.white)
                    
                    Spacer()
                    
                    if entry.settings?.prayerWidget.showHijriDate ?? true {
                        VStack(alignment: .trailing, spacing: 2) {
                            Text(entry.data?.hijriDate ?? "15 رمضان 1446")
                                .font(.system(size: 11, weight: .medium))
                            Text(entry.data?.gregorianDate ?? "الأحد 2 مارس")
                                .font(.system(size: 9))
                        }
                        .foregroundColor(.white.opacity(0.7))
                    }
                }
                .padding(.horizontal)
                
                // Next prayer highlight
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("الصلاة القادمة")
                            .font(.system(size: 11))
                            .foregroundColor(.white.opacity(0.6))
                        
                        HStack {
                            Image(systemName: prayerIcon)
                                .font(.system(size: 18))
                            Text(entry.data?.nextPrayerNameAr ?? "الظهر")
                                .font(.system(size: 24, weight: .bold))
                        }
                        .foregroundColor(.white)
                    }
                    
                    Spacer()
                    
                    VStack(alignment: .trailing, spacing: 4) {
                        Text(entry.data?.nextPrayerTime ?? "12:15 م")
                            .font(.system(size: 32, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                        
                        GlassPill(color: WidgetConstants.Colors.gold.opacity(0.25)) {
                            HStack(spacing: 4) {
                                Image(systemName: "timer")
                                    .font(.system(size: 10))
                                Text(entry.data?.timeRemaining ?? "2:30")
                                    .font(.system(size: 11, weight: .medium))
                            }
                            .foregroundColor(WidgetConstants.Colors.gold)
                        }
                    }
                }
                .padding(.horizontal)
                .padding(.vertical, 8)
                .background(WidgetConstants.Glass.highlight)
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
                                    .foregroundColor(isCompleted ? .green : .white.opacity(0.25))
                            }
                            
                            Image(systemName: iconForPrayer(prayer.name))
                                .font(.system(size: 13))
                                .frame(width: 22)
                                .foregroundColor(prayer.isPassed ? .white.opacity(0.3) : prayer.isNext ? WidgetConstants.Colors.gold : .white.opacity(0.7))
                            
                            Text(prayer.nameAr)
                                .font(.system(size: 13, weight: prayer.isNext ? .bold : .regular))
                                .foregroundColor(prayer.isPassed ? .white.opacity(0.3) : prayer.isNext ? WidgetConstants.Colors.gold : .white)
                            
                            Spacer()
                            
                            Text(prayer.time)
                                .font(.system(size: 13, weight: .medium, design: .rounded))
                                .foregroundColor(prayer.isPassed ? .white.opacity(0.3) : prayer.isNext ? WidgetConstants.Colors.gold : .white)
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 5)
                        .background(prayer.isNext ? WidgetConstants.Glass.pill : Color.clear)
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
        IntentConfiguration(
            kind: kind,
            intent: ConfigurationIntent.self,
            provider: PrayerWidgetProvider()
        ) { entry in
            NextPrayerWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("مواقيت الصلاة")
        .description("عرض الصلاة القادمة والوقت المتبقي")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

struct NextPrayerWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    var entry: PrayerWidgetProvider.Entry
    
    var body: some View {
        switch family {
        case .systemSmall:
            SmallPrayerWidgetView(entry: entry)
        case .systemMedium:
            MediumPrayerWidgetView(entry: entry)
        case .systemLarge:
            LargePrayerWidgetView(entry: entry)
        default:
            SmallPrayerWidgetView(entry: entry)
        }
    }
}

// Color(hex:) extension is defined in WidgetBundle.swift

// ========================================
// Configuration Intent (Placeholder)
// ========================================

class ConfigurationIntent: INIntent {
    // يمكن إضافة خيارات التخصيص هنا
}

// ========================================
// المعاينة
// ========================================

struct NextPrayerWidget_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            NextPrayerWidgetEntryView(entry: PrayerWidgetEntry(
                date: Date(),
                data: nil,
                settings: nil,
                configuration: nil
            ))
            .previewContext(WidgetPreviewContext(family: .systemSmall))
            .previewDisplayName("Small")
            
            NextPrayerWidgetEntryView(entry: PrayerWidgetEntry(
                date: Date(),
                data: nil,
                settings: nil,
                configuration: nil
            ))
            .previewContext(WidgetPreviewContext(family: .systemMedium))
            .previewDisplayName("Medium")
            
            NextPrayerWidgetEntryView(entry: PrayerWidgetEntry(
                date: Date(),
                data: nil,
                settings: nil,
                configuration: nil
            ))
            .previewContext(WidgetPreviewContext(family: .systemLarge))
            .previewDisplayName("Large")
        }
    }
}
