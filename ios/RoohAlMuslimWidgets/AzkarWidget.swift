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
        guard let data = loadSharedRawData(),
              let jsonData = try? JSONDecoder().decode(FullWidgetData.self, from: data) else {
            return nil
        }
        return jsonData.azkar
    }
    
    private func loadSettings() -> AzkarWidgetSettings? {
        guard let data = loadSharedRawData(),
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
            GlassWidgetBackground(accentColor: getCategoryColor(category))
            
            VStack(spacing: 6) {
                // App icon
                WidgetAppIcon(size: 32)
                
                Spacer()
                
                Text(entry.data?.randomZikr.text ?? "سبحان الله")
                    .font(.system(size: 14, weight: .medium))
                    .multilineTextAlignment(.center)
                    .lineLimit(4)
                    .foregroundColor(.white)
                
                Spacer()
                
                if (entry.data?.randomZikr.count ?? 1) > 1 {
                    GlassPill(color: WidgetConstants.Colors.gold.opacity(0.25)) {
                        HStack(spacing: 4) {
                            Image(systemName: "repeat")
                                .font(.system(size: 9))
                            Text("\(entry.data?.randomZikr.count ?? 1) \(entry.data?.randomZikr.timesLabel ?? "مرات")")
                                .font(.system(size: 10, weight: .medium))
                        }
                        .foregroundColor(WidgetConstants.Colors.gold)
                    }
                }
            }
            .padding()
        }
        .overlay(
            RoundedRectangle(cornerRadius: 24)
                .stroke(WidgetConstants.Glass.border, lineWidth: 1)
        )
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
            GlassWidgetBackground(accentColor: getCategoryColor(category))
            
            VStack(spacing: 0) {
                // Header
                HStack {
                    WidgetAppIcon(size: 20)
                    Text(getCategoryName(category, translatedName: categoryTranslatedName))
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.white.opacity(0.8))
                    Spacer()
                    
                    // Morning/Evening completion
                    HStack(spacing: 8) {
                        HStack(spacing: 3) {
                            Image(systemName: entry.data?.morningCompleted ?? false ? "checkmark.circle.fill" : "circle")
                                .font(.system(size: 10))
                                .foregroundColor(entry.data?.morningCompleted ?? false ? .green : .white.opacity(0.4))
                            Text("صباح")
                                .font(.system(size: 9))
                                .foregroundColor(.white.opacity(0.6))
                        }
                        HStack(spacing: 3) {
                            Image(systemName: entry.data?.eveningCompleted ?? false ? "checkmark.circle.fill" : "circle")
                                .font(.system(size: 10))
                                .foregroundColor(entry.data?.eveningCompleted ?? false ? .green : .white.opacity(0.4))
                            Text("مساء")
                                .font(.system(size: 9))
                                .foregroundColor(.white.opacity(0.6))
                        }
                    }
                }
                .padding(.horizontal)
                .padding(.top, 10)
                .padding(.bottom, 6)
                
                HStack(spacing: 12) {
                    // Zikr text
                    VStack(alignment: .trailing, spacing: 6) {
                        Text(entry.data?.randomZikr.text ?? "سبحان الله وبحمده")
                            .font(.system(size: 15, weight: .medium))
                            .multilineTextAlignment(.trailing)
                            .lineLimit(4)
                            .foregroundColor(.white)
                        
                        if entry.settings?.showTranslation ?? false,
                           let translation = entry.data?.randomZikr.translation {
                            Text(translation)
                                .font(.system(size: 10))
                                .multilineTextAlignment(.trailing)
                                .lineLimit(2)
                                .foregroundColor(.white.opacity(0.5))
                        }
                    }
                    
                    if (entry.data?.randomZikr.count ?? 1) > 1 {
                        GlassPill(color: WidgetConstants.Colors.gold.opacity(0.25)) {
                            HStack(spacing: 3) {
                                Image(systemName: "repeat")
                                    .font(.system(size: 9))
                                Text("\(entry.data?.randomZikr.count ?? 1)×")
                                    .font(.system(size: 11, weight: .bold))
                            }
                            .foregroundColor(WidgetConstants.Colors.gold)
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
            GlassWidgetBackground(accentColor: getCategoryColor(category))
            
            VStack(spacing: 12) {
                // Header
                HStack {
                    WidgetAppIcon(size: 20)
                    Text(getCategoryName(category, translatedName: categoryTranslatedName))
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.white)
                    
                    Spacer()
                    
                    HStack(spacing: 10) {
                        HStack(spacing: 3) {
                            Image(systemName: entry.data?.morningCompleted ?? false ? "checkmark.circle.fill" : "circle")
                                .font(.system(size: 14))
                                .foregroundColor(entry.data?.morningCompleted ?? false ? .green : .white.opacity(0.4))
                            Text("صباح")
                                .font(.system(size: 9))
                                .foregroundColor(.white.opacity(0.7))
                        }
                        
                        HStack(spacing: 3) {
                            Image(systemName: entry.data?.eveningCompleted ?? false ? "checkmark.circle.fill" : "circle")
                                .font(.system(size: 14))
                                .foregroundColor(entry.data?.eveningCompleted ?? false ? .green : .white.opacity(0.4))
                            Text("مساء")
                                .font(.system(size: 9))
                                .foregroundColor(.white.opacity(0.7))
                        }
                    }
                }
                .padding(.horizontal)
                
                Divider()
                    .background(WidgetConstants.Glass.border)
                    .padding(.horizontal)
                
                // Main dhikr text
                VStack(spacing: 10) {
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
                            .foregroundColor(.white.opacity(0.5))
                            .padding(.horizontal)
                    }
                }
                
                Spacer()
                
                // Benefit
                if let benefit = entry.data?.randomZikr.benefit {
                    VStack(spacing: 5) {
                        HStack {
                            Image(systemName: "lightbulb.fill")
                                .font(.system(size: 11))
                            Text("الفائدة")
                                .font(.system(size: 10, weight: .bold))
                        }
                        .foregroundColor(WidgetConstants.Colors.gold)
                        
                        Text(benefit)
                            .font(.system(size: 11))
                            .multilineTextAlignment(.center)
                            .lineLimit(3)
                            .foregroundColor(.white.opacity(0.7))
                    }
                    .padding(10)
                    .background(WidgetConstants.Glass.highlight)
                    .cornerRadius(12)
                    .padding(.horizontal)
                }
                
                // Count
                if (entry.data?.randomZikr.count ?? 1) > 1 {
                    GlassPill(color: WidgetConstants.Colors.gold.opacity(0.25)) {
                        HStack(spacing: 5) {
                            Image(systemName: "repeat")
                                .font(.system(size: 11))
                            Text("كرر \(entry.data?.randomZikr.count ?? 1) مرات")
                                .font(.system(size: 12, weight: .medium))
                        }
                        .foregroundColor(WidgetConstants.Colors.gold)
                    }
                }
            }
            .padding(.vertical)
        }
        .overlay(
            RoundedRectangle(cornerRadius: 24)
                .stroke(WidgetConstants.Glass.border, lineWidth: 1)
        )
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

// Color(hex:) extension is defined in WidgetBundle.swift

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
