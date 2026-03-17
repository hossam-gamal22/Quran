// widgets/ios/AzkarWidget.swift
// ويدجت الأذكار - روح المسلم
// iOS 14+ WidgetKit

import WidgetKit
import SwiftUI

// ========================================
// نموذج البيانات
// ========================================

struct ZikrData: Codable {
    var id: String
    var text: String
    var translation: String?
    var count: Int
    var category: String
    var categoryName: String?
    var timesLabel: String?
    var benefit: String?
}

struct AzkarWidgetData: Codable {
    var randomZikr: ZikrData
    var morningCompleted: Bool
    var eveningCompleted: Bool
    var lastUpdated: String
}

struct AzkarWidgetSettings: Codable {
    var enabled: Bool
    var showTranslation: Bool
    var autoRefresh: Bool
    var refreshInterval: Int
    var categories: [String]
}

// ========================================
// مزود البيانات
// ========================================

struct AzkarWidgetEntry: TimelineEntry {
    let date: Date
    let data: AzkarWidgetData?
    let settings: AzkarWidgetSettings?
}

struct AzkarWidgetProvider: TimelineProvider {
    typealias Entry = AzkarWidgetEntry
    
    let appGroupId = "group.com.roohmuslim.app"
    
    func placeholder(in context: Context) -> AzkarWidgetEntry {
        AzkarWidgetEntry(
            date: Date(),
            data: sampleData,
            settings: nil
        )
    }
    
    func getSnapshot(in context: Context, completion: @escaping (AzkarWidgetEntry) -> Void) {
        let entry = AzkarWidgetEntry(
            date: Date(),
            data: loadData() ?? sampleData,
            settings: loadSettings()
        )
        completion(entry)
    }
    
    func getTimeline(in context: Context, completion: @escaping (Timeline<AzkarWidgetEntry>) -> Void) {
        let currentDate = Date()
        let data = loadData() ?? sampleData
        let settings = loadSettings()
        
        let refreshInterval = settings?.refreshInterval ?? 60
        
        let entry = AzkarWidgetEntry(
            date: currentDate,
            data: data,
            settings: settings
        )
        
        let nextUpdate = Calendar.current.date(
            byAdding: .minute,
            value: refreshInterval,
            to: currentDate
        )!
        
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
    
    private func loadData() -> AzkarWidgetData? {
        guard let containerURL = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: appGroupId
        ) else { return nil }
        
        let fileURL = containerURL.appendingPathComponent("widget_data.json")
        
        guard let data = try? Data(contentsOf: fileURL),
              let jsonData = try? JSONDecoder().decode(FullWidgetData.self, from: data) else {
            return nil
        }
        
        return jsonData.azkar
    }
    
    private func loadSettings() -> AzkarWidgetSettings? {
        guard let containerURL = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: appGroupId
        ) else { return nil }
        
        let fileURL = containerURL.appendingPathComponent("widget_data.json")
        
        guard let data = try? Data(contentsOf: fileURL),
              let jsonData = try? JSONDecoder().decode(FullWidgetData.self, from: data) else {
            return nil
        }
        
        return jsonData.settings.azkarWidget
    }
    
    private var sampleData: AzkarWidgetData {
        AzkarWidgetData(
            randomZikr: ZikrData(
                id: "morning-1",
                text: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لاَ إِلَـهَ إِلاَّ اللهُ وَحْدَهُ لاَ شَرِيكَ لَهُ",
                translation: "We have reached the morning and at this very time all sovereignty belongs to Allah",
                count: 1,
                category: "morning",
                benefit: "من قالها حين يصبح وحين يمسي كان حقاً على الله أن يرضيه يوم القيامة"
            ),
            morningCompleted: false,
            eveningCompleted: false,
            lastUpdated: ISO8601DateFormatter().string(from: Date())
        )
    }
}

struct FullWidgetData: Codable {
    var azkar: AzkarWidgetData
    var settings: FullSettings
    
    struct FullSettings: Codable {
        var azkarWidget: AzkarWidgetSettings
    }
}

// ========================================
// دوال مساعدة
// ========================================

func getCategoryColor(_ category: String) -> Color {
    switch category {
    case "morning": return Color(hex: "#f5a623")
    case "evening": return Color(hex: "#3a7ca5")
    case "sleep": return Color(hex: "#5d4e8c")
    case "wakeup": return Color(hex: "#2f7659")
    case "afterPrayer": return Color(hex: "#c17f59")
    default: return Color(hex: "#2f7659")
    }
}

func getCategoryIcon(_ category: String) -> String {
    switch category {
    case "morning": return "sun.max.fill"
    case "evening": return "moon.fill"
    case "sleep": return "bed.double.fill"
    case "wakeup": return "alarm.fill"
    case "afterPrayer": return "building.columns.fill"
    default: return "heart.fill"
    }
}

func getCategoryName(_ category: String, translatedName: String? = nil) -> String {
    if let translated = translatedName, !translated.isEmpty {
        return translated
    }
    switch category {
    case "morning": return "أذكار الصباح"
    case "evening": return "أذكار المساء"
    case "sleep": return "أذكار النوم"
    case "wakeup": return "أذكار الاستيقاظ"
    case "afterPrayer": return "بعد الصلاة"
    default: return "أذكار"
    }
}

// ========================================
// واجهة الويدجت الصغير
// ========================================

struct SmallAzkarWidgetView: View {
    let entry: AzkarWidgetEntry
    
    var category: String {
        entry.data?.randomZikr.category ?? "morning"
    }
    
    var categoryTranslatedName: String? {
        entry.data?.randomZikr.categoryName
    }
    
    var body: some View {
        ZStack {
            LinearGradient(
                gradient: Gradient(colors: [getCategoryColor(category), getCategoryColor(category).opacity(0.7)]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            
            VStack(spacing: 8) {
                HStack {
                    Image(systemName: getCategoryIcon(category))
                        .font(.system(size: 12))
                    Text(getCategoryName(category, translatedName: categoryTranslatedName))
                        .font(.system(size: 10, weight: .medium))
                }
                .foregroundColor(.white.opacity(0.9))
                
                Spacer()
                
                Text(entry.data?.randomZikr.text ?? "سبحان الله")
                    .font(.system(size: 14, weight: .medium))
                    .multilineTextAlignment(.center)
                    .lineLimit(4)
                    .foregroundColor(.white)
                
                Spacer()
                
                if (entry.data?.randomZikr.count ?? 1) > 1 {
                    HStack(spacing: 4) {
                        Image(systemName: "repeat")
                            .font(.system(size: 10))
                        Text("\(entry.data?.randomZikr.count ?? 1) \(entry.data?.randomZikr.timesLabel ?? "مرات")")
                            .font(.system(size: 10, weight: .medium))
                    }
                    .foregroundColor(.white.opacity(0.8))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.white.opacity(0.2))
                    .cornerRadius(8)
                }
            }
            .padding()
        }
    }
}

// ========================================
// واجهة الويدجت المتوسط
// ========================================

struct MediumAzkarWidgetView: View {
    let entry: AzkarWidgetEntry
    
    var category: String {
        entry.data?.randomZikr.category ?? "morning"
    }
    
    var categoryTranslatedName: String? {
        entry.data?.randomZikr.categoryName
    }
    
    var body: some View {
        ZStack {
            LinearGradient(
                gradient: Gradient(colors: [getCategoryColor(category), getCategoryColor(category).opacity(0.7)]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            
            HStack(spacing: 15) {
                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        Image(systemName: getCategoryIcon(category))
                            .font(.system(size: 14))
                        Text(getCategoryName(category, translatedName: categoryTranslatedName))
                            .font(.system(size: 12, weight: .bold))
                    }
                    .foregroundColor(.white)
                    
                    Spacer()
                    
                    VStack(alignment: .leading, spacing: 6) {
                        HStack(spacing: 6) {
                            Image(systemName: entry.data?.morningCompleted ?? false ? "checkmark.circle.fill" : "circle")
                                .font(.system(size: 12))
                                .foregroundColor(entry.data?.morningCompleted ?? false ? .green : .white.opacity(0.6))
                            Text("الصباح")
                                .font(.system(size: 11))
                                .foregroundColor(.white.opacity(0.9))
                        }
                        
                        HStack(spacing: 6) {
                            Image(systemName: entry.data?.eveningCompleted ?? false ? "checkmark.circle.fill" : "circle")
                                .font(.system(size: 12))
                                .foregroundColor(entry.data?.eveningCompleted ?? false ? .green : .white.opacity(0.6))
                            Text("المساء")
                                .font(.system(size: 11))
                                .foregroundColor(.white.opacity(0.9))
                        }
                    }
                    
                    if (entry.data?.randomZikr.count ?? 1) > 1 {
                        HStack(spacing: 4) {
                            Image(systemName: "repeat")
                                .font(.system(size: 10))
                            Text("\(entry.data?.randomZikr.count ?? 1)×")
                                .font(.system(size: 11, weight: .bold))
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(Color.white.opacity(0.2))
                        .cornerRadius(10)
                    }
                }
                .frame(width: 90)
                
                Rectangle()
                    .fill(Color.white.opacity(0.3))
                    .frame(width: 1)
                
                VStack(alignment: .trailing, spacing: 8) {
                    Text(entry.data?.randomZikr.text ?? "سبحان الله وبحمده")
                        .font(.system(size: 15, weight: .medium))
                        .multilineTextAlignment(.trailing)
                        .lineLimit(5)
                        .foregroundColor(.white)
                    
                    Spacer()
                    
                    if entry.settings?.showTranslation ?? false,
                       let translation = entry.data?.randomZikr.translation {
                        Text(translation)
                            .font(.system(size: 10))
                            .multilineTextAlignment(.trailing)
                            .lineLimit(2)
                            .foregroundColor(.white.opacity(0.7))
                    }
                }
            }
            .padding()
        }
    }
}

// ========================================
// واجهة الويدجت الكبير
// ========================================

struct LargeAzkarWidgetView: View {
    let entry: AzkarWidgetEntry
    
    var category: String {
        entry.data?.randomZikr.category ?? "morning"
    }
    
    var categoryTranslatedName: String? {
        entry.data?.randomZikr.categoryName
    }
    
    var body: some View {
        ZStack {
            LinearGradient(
                gradient: Gradient(colors: [getCategoryColor(category), getCategoryColor(category).opacity(0.7)]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            
            VStack(spacing: 15) {
                // الهيدر
                HStack {
                    HStack(spacing: 8) {
                        Image(systemName: getCategoryIcon(category))
                            .font(.system(size: 18))
                        Text(getCategoryName(category, translatedName: categoryTranslatedName))
                            .font(.system(size: 16, weight: .bold))
                    }
                    .foregroundColor(.white)
                    
                    Spacer()
                    
                    HStack(spacing: 12) {
                        VStack(spacing: 2) {
                            Image(systemName: entry.data?.morningCompleted ?? false ? "checkmark.circle.fill" : "circle")
                                .font(.system(size: 16))
                                .foregroundColor(entry.data?.morningCompleted ?? false ? .green : .white.opacity(0.5))
                            Text("صباح")
                                .font(.system(size: 9))
                                .foregroundColor(.white.opacity(0.8))
                        }
                        
                        VStack(spacing: 2) {
                            Image(systemName: entry.data?.eveningCompleted ?? false ? "checkmark.circle.fill" : "circle")
                                .font(.system(size: 16))
                                .foregroundColor(entry.data?.eveningCompleted ?? false ? .green : .white.opacity(0.5))
                            Text("مساء")
                                .font(.system(size: 9))
                                .foregroundColor(.white.opacity(0.8))
                        }
                    }
                }
                .padding(.horizontal)
                
                Divider()
                    .background(Color.white.opacity(0.3))
                    .padding(.horizontal)
                
                // النص الرئيسي
                VStack(spacing: 12) {
                    Text(entry.data?.randomZikr.text ?? "سبحان الله وبحمده، سبحان الله العظيم")
                        .font(.system(size: 20, weight: .medium))
                        .multilineTextAlignment(.center)
                        .lineLimit(6)
                        .foregroundColor(.white)
                        .padding(.horizontal)
                    
                    if entry.settings?.showTranslation ?? false,
                       let translation = entry.data?.randomZikr.translation {
                        Text(translation)
                            .font(.system(size: 12))
                            .multilineTextAlignment(.center)
                            .lineLimit(3)
                            .foregroundColor(.white.opacity(0.75))
                            .padding(.horizontal)
                    }
                }
                
                Spacer()
                
                // الفائدة
                if let benefit = entry.data?.randomZikr.benefit {
                    VStack(spacing: 6) {
                        HStack {
                            Image(systemName: "lightbulb.fill")
                                .font(.system(size: 12))
                            Text("الفائدة")
                                .font(.system(size: 11, weight: .bold))
                        }
                        .foregroundColor(.yellow)
                        
                        Text(benefit)
                            .font(.system(size: 11))
                            .multilineTextAlignment(.center)
                            .lineLimit(3)
                            .foregroundColor(.white.opacity(0.9))
                    }
                    .padding()
                    .background(Color.white.opacity(0.15))
                    .cornerRadius(12)
                    .padding(.horizontal)
                }
                
                // العدد
                if (entry.data?.randomZikr.count ?? 1) > 1 {
                    HStack(spacing: 6) {
                        Image(systemName: "repeat")
                            .font(.system(size: 12))
                        Text("كرر \(entry.data?.randomZikr.count ?? 1) مرات")
                            .font(.system(size: 12, weight: .medium))
                    }
                    .foregroundColor(.white)
                    .padding(.horizontal, 15)
                    .padding(.vertical, 8)
                    .background(Color.white.opacity(0.2))
                    .cornerRadius(12)
                }
            }
            .padding(.vertical)
        }
    }
}

// ========================================
// الويدجت الرئيسي
// ========================================

struct AzkarWidget: Widget {
    let kind: String = "AzkarWidget"
    
    var body: some WidgetConfiguration {
        StaticConfiguration(
            kind: kind,
            provider: AzkarWidgetProvider()
        ) { entry in
            AzkarWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("أذكار المسلم")
        .description("عرض ذكر عشوائي يتغير تلقائياً")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

struct AzkarWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    var entry: AzkarWidgetProvider.Entry
    
    var body: some View {
        switch family {
        case .systemSmall:
            SmallAzkarWidgetView(entry: entry)
        case .systemMedium:
            MediumAzkarWidgetView(entry: entry)
        case .systemLarge:
            LargeAzkarWidgetView(entry: entry)
        default:
            SmallAzkarWidgetView(entry: entry)
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
        case 3:
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
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
// المعاينة
// ========================================

struct AzkarWidget_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            AzkarWidgetEntryView(entry: AzkarWidgetEntry(
                date: Date(),
                data: nil,
                settings: nil
            ))
            .previewContext(WidgetPreviewContext(family: .systemSmall))
            .previewDisplayName("Small")
            
            AzkarWidgetEntryView(entry: AzkarWidgetEntry(
                date: Date(),
                data: nil,
                settings: nil
            ))
            .previewContext(WidgetPreviewContext(family: .systemMedium))
            .previewDisplayName("Medium")
            
            AzkarWidgetEntryView(entry: AzkarWidgetEntry(
                date: Date(),
                data: nil,
                settings: nil
            ))
            .previewContext(WidgetPreviewContext(family: .systemLarge))
            .previewDisplayName("Large")
        }
    }
}
