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
        var colorScheme: String
        var accentColor: String
    }
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
    let appGroupId = "group.com.roohmuslim.app"
    
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
    
    // قراءة البيانات من App Group
    private func loadData() -> PrayerWidgetData? {
        guard let containerURL = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: appGroupId
        ) else { return nil }
        
        let fileURL = containerURL.appendingPathComponent("widget_data.json")
        
        guard let data = try? Data(contentsOf: fileURL),
              let widgetData = try? JSONDecoder().decode(SharedWidgetData.self, from: data) else {
            return nil
        }
        
        return widgetData.prayer
    }
    
    private func loadSettings() -> WidgetSettings? {
        guard let containerURL = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: appGroupId
        ) else { return nil }
        
        let fileURL = containerURL.appendingPathComponent("widget_data.json")
        
        guard let data = try? Data(contentsOf: fileURL),
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
            // الخلفية
            LinearGradient(
                gradient: Gradient(colors: [accentColor, accentColor.opacity(0.7)]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            
            VStack(spacing: 8) {
                // اسم الصلاة القادمة
                HStack {
                    Image(systemName: prayerIcon)
                        .font(.system(size: 14))
                    Text(entry.data?.nextPrayerNameAr ?? "الظهر")
                        .font(.system(size: 16, weight: .bold))
                }
                .foregroundColor(.white)
                
                // الوقت
                Text(entry.data?.nextPrayerTime ?? "12:15 م")
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
                
                // الوقت المتبقي
                HStack(spacing: 4) {
                    Image(systemName: "timer")
                        .font(.system(size: 10))
                    Text(entry.data?.timeRemaining ?? "2:30")
                        .font(.system(size: 12, weight: .medium))
                }
                .foregroundColor(.white.opacity(0.9))
                .padding(.horizontal, 10)
                .padding(.vertical, 4)
                .background(Color.white.opacity(0.2))
                .cornerRadius(10)
                
                // التاريخ الهجري
                if entry.settings?.prayerWidget.showHijriDate ?? true {
                    Text(entry.data?.hijriDate ?? "15 رمضان")
                        .font(.system(size: 10))
                        .foregroundColor(.white.opacity(0.8))
                }
            }
            .padding()
        }
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
            // الخلفية
            LinearGradient(
                gradient: Gradient(colors: [accentColor, accentColor.opacity(0.7)]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            
            HStack(spacing: 20) {
                // الجانب الأيسر - الصلاة القادمة
                VStack(alignment: .leading, spacing: 8) {
                    // العنوان
                    HStack {
                        Image(systemName: prayerIcon)
                            .font(.system(size: 16))
                        Text("الصلاة القادمة")
                            .font(.system(size: 12, weight: .medium))
                    }
                    .foregroundColor(.white.opacity(0.9))
                    
                    // اسم الصلاة
                    Text(entry.data?.nextPrayerNameAr ?? "الظهر")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(.white)
                    
                    // الوقت
                    Text(entry.data?.nextPrayerTime ?? "12:15 م")
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                    
                    // الوقت المتبقي
                    HStack(spacing: 4) {
                        Image(systemName: "timer")
                            .font(.system(size: 12))
                        Text("متبقي \(entry.data?.timeRemaining ?? "2:30")")
                            .font(.system(size: 12, weight: .medium))
                    }
                    .foregroundColor(.white.opacity(0.9))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(Color.white.opacity(0.2))
                    .cornerRadius(10)
                }
                
                Spacer()
                
                // الجانب الأيمن - قائمة الصلوات
                if entry.settings?.prayerWidget.showAllPrayers ?? true {
                    VStack(alignment: .trailing, spacing: 4) {
                        ForEach(entry.data?.allPrayers ?? []) { prayer in
                            HStack(spacing: 6) {
                                Text(prayer.time)
                                    .font(.system(size: 11, weight: .medium, design: .rounded))
                                Text(prayer.nameAr)
                                    .font(.system(size: 11, weight: prayer.isNext ? .bold : .regular))
                            }
                            .foregroundColor(prayer.isPassed ? .white.opacity(0.5) : prayer.isNext ? .yellow : .white.opacity(0.9))
                        }
                    }
                }
            }
            .padding()
        }
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
            // الخلفية
            LinearGradient(
                gradient: Gradient(colors: [accentColor, accentColor.opacity(0.7)]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            
            VStack(spacing: 15) {
                // الهيدر
                HStack {
                    VStack(alignment: .leading) {
                        Text("مواقيت الصلاة")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.white)
                        
                        if entry.settings?.prayerWidget.showLocation ?? true {
                            HStack(spacing: 4) {
                                Image(systemName: "location.fill")
                                    .font(.system(size: 10))
                                Text(entry.data?.location ?? "مكة المكرمة")
                                    .font(.system(size: 12))
                            }
                            .foregroundColor(.white.opacity(0.8))
                        }
                    }
                    
                    Spacer()
                    
                    if entry.settings?.prayerWidget.showHijriDate ?? true {
                        VStack(alignment: .trailing) {
                            Text(entry.data?.hijriDate ?? "15 رمضان 1446")
                                .font(.system(size: 12, weight: .medium))
                            Text(entry.data?.gregorianDate ?? "الأحد 2 مارس")
                                .font(.system(size: 10))
                        }
                        .foregroundColor(.white.opacity(0.9))
                    }
                }
                .padding(.horizontal)
                
                // الصلاة القادمة
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("الصلاة القادمة")
                            .font(.system(size: 12))
                            .foregroundColor(.white.opacity(0.8))
                        
                        HStack {
                            Image(systemName: prayerIcon)
                                .font(.system(size: 20))
                            Text(entry.data?.nextPrayerNameAr ?? "الظهر")
                                .font(.system(size: 28, weight: .bold))
                        }
                        .foregroundColor(.white)
                    }
                    
                    Spacer()
                    
                    VStack(alignment: .trailing, spacing: 4) {
                        Text(entry.data?.nextPrayerTime ?? "12:15 م")
                            .font(.system(size: 36, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                        
                        HStack(spacing: 4) {
                            Image(systemName: "timer")
                            Text("متبقي \(entry.data?.timeRemaining ?? "2:30")")
                        }
                        .font(.system(size: 12))
                        .foregroundColor(.white.opacity(0.9))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(Color.white.opacity(0.2))
                        .cornerRadius(10)
                    }
                }
                .padding(.horizontal)
                .padding(.vertical, 10)
                .background(Color.white.opacity(0.1))
                .cornerRadius(15)
                .padding(.horizontal)
                
                // قائمة جميع الصلوات
                VStack(spacing: 8) {
                    ForEach(entry.data?.allPrayers ?? []) { prayer in
                        HStack {
                            // الأيقونة
                            Image(systemName: iconForPrayer(prayer.name))
                                .font(.system(size: 14))
                                .frame(width: 24)
                                .foregroundColor(prayer.isPassed ? .white.opacity(0.4) : prayer.isNext ? .yellow : .white.opacity(0.8))
                            
                            // الاسم
                            Text(prayer.nameAr)
                                .font(.system(size: 14, weight: prayer.isNext ? .bold : .regular))
                                .foregroundColor(prayer.isPassed ? .white.opacity(0.4) : prayer.isNext ? .yellow : .white)
                            
                            Spacer()
                            
                            // الوقت
                            Text(prayer.time)
                                .font(.system(size: 14, weight: .medium, design: .rounded))
                                .foregroundColor(prayer.isPassed ? .white.opacity(0.4) : prayer.isNext ? .yellow : .white)
                            
                            // علامة الصلاة القادمة
                            if prayer.isNext {
                                Image(systemName: "arrow.left")
                                    .font(.system(size: 10))
                                    .foregroundColor(.yellow)
                            } else if prayer.isPassed {
                                Image(systemName: "checkmark")
                                    .font(.system(size: 10))
                                    .foregroundColor(.white.opacity(0.4))
                            }
                        }
                        .padding(.horizontal)
                        .padding(.vertical, 6)
                        .background(prayer.isNext ? Color.white.opacity(0.15) : Color.clear)
                        .cornerRadius(10)
                    }
                }
                .padding(.horizontal)
                
                Spacer()
            }
            .padding(.vertical)
        }
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

// ========================================
// امتداد اللون
// ========================================

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

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
