// widgets/ios/DhikrWidget.swift
// ويدجت ذكر اليوم - روح المسلم
// iOS 14+ WidgetKit

import WidgetKit
import SwiftUI

// ========================================
// نموذج البيانات
// ========================================

struct DhikrData: Codable {
    var arabic: String
    var translation: String?
    var count: Int
    var timesLabel: String?
    var category: String
    var categoryName: String
    var benefit: String?
    var date: String
    var lastUpdated: String
}

struct DhikrWidgetSettings: Codable {
    var enabled: Bool
    var showTranslation: Bool
    var showBenefit: Bool
}

// ========================================
// مزود البيانات
// ========================================

struct DhikrWidgetEntry: TimelineEntry {
    let date: Date
    let data: DhikrData?
    let settings: DhikrWidgetSettings?
}

struct DhikrWidgetProvider: TimelineProvider {
    typealias Entry = DhikrWidgetEntry
    
    let appGroupId = WidgetConstants.appGroupId
    
    func placeholder(in context: Context) -> DhikrWidgetEntry {
        DhikrWidgetEntry(
            date: Date(),
            data: sampleData,
            settings: nil
        )
    }
    
    func getSnapshot(in context: Context, completion: @escaping (DhikrWidgetEntry) -> Void) {
        let entry = DhikrWidgetEntry(
            date: Date(),
            data: loadData() ?? sampleData,
            settings: loadSettings()
        )
        completion(entry)
    }
    
    func getTimeline(in context: Context, completion: @escaping (Timeline<DhikrWidgetEntry>) -> Void) {
        let currentDate = Date()
        let data = loadData() ?? sampleData
        let settings = loadSettings()
        
        let entry = DhikrWidgetEntry(
            date: currentDate,
            data: data,
            settings: settings
        )
        
        // Update at midnight for new dhikr
        let calendar = Calendar.current
        let tomorrow = calendar.startOfDay(for: calendar.date(byAdding: .day, value: 1, to: currentDate)!)
        
        let timeline = Timeline(entries: [entry], policy: .after(tomorrow))
        completion(timeline)
    }
    
    private func loadData() -> DhikrData? {
        guard let containerURL = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: appGroupId
        ) else { return nil }
        
        let fileURL = containerURL.appendingPathComponent(WidgetConstants.sharedDataFile)
        
        guard let data = try? Data(contentsOf: fileURL),
              let jsonData = try? JSONDecoder().decode(FullDhikrWidgetData.self, from: data) else {
            return nil
        }
        
        return jsonData.dhikr
    }
    
    private func loadSettings() -> DhikrWidgetSettings? {
        guard let containerURL = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: appGroupId
        ) else { return nil }
        
        let fileURL = containerURL.appendingPathComponent(WidgetConstants.sharedDataFile)
        
        guard let data = try? Data(contentsOf: fileURL),
              let jsonData = try? JSONDecoder().decode(FullDhikrSettingsData.self, from: data) else {
            return nil
        }
        
        return jsonData.settings.dhikrWidget
    }
    
    private var sampleData: DhikrData {
        DhikrData(
            arabic: "سُبْحَانَ اللهِ وَبِحَمْدِهِ، سُبْحَانَ اللهِ الْعَظِيمِ",
            translation: nil,
            count: 3,
            category: "misc",
            categoryName: "أذكار متنوعة",
            benefit: "كلمتان خفيفتان على اللسان، ثقيلتان في الميزان، حبيبتان إلى الرحمن",
            date: ISO8601DateFormatter().string(from: Date()),
            lastUpdated: ISO8601DateFormatter().string(from: Date())
        )
    }
}

struct FullDhikrWidgetData: Codable {
    var dhikr: DhikrData
}

struct FullDhikrSettingsData: Codable {
    var settings: DhikrSettingsContainer
    
    struct DhikrSettingsContainer: Codable {
        var dhikrWidget: DhikrWidgetSettings?
    }
}

// ========================================
// ألوان الفئات
// ========================================

func getDhikrCategoryColor(_ category: String) -> Color {
    switch category {
    case "morning": return Color(hex: "#f5a623")
    case "evening": return Color(hex: "#3a7ca5")
    case "sleep": return Color(hex: "#5d4e8c")
    case "wakeup": return Color(hex: "#2f7659")
    case "after_prayer": return Color(hex: "#c17f59")
    case "quran_duas": return Color(hex: "#1e3a5f")
    case "sunnah_duas": return Color(hex: "#2f7659")
    case "protection": return Color(hex: "#1a237e")
    default: return Color(hex: "#5d4e8c")
    }
}

func getDhikrCategoryIcon(_ category: String) -> String {
    switch category {
    case "morning": return "sun.max.fill"
    case "evening": return "moon.fill"
    case "sleep": return "bed.double.fill"
    case "wakeup": return "alarm.fill"
    case "after_prayer": return "building.columns.fill"
    case "quran_duas": return "book.fill"
    case "sunnah_duas": return "star.fill"
    case "protection": return "shield.fill"
    default: return "heart.fill"
    }
}

// ========================================
// واجهة الويدجت الصغير
// ========================================

struct SmallDhikrWidgetView: View {
    let entry: DhikrWidgetEntry
    
    var category: String {
        entry.data?.category ?? "misc"
    }
    
    var body: some View {
        ZStack {
            LinearGradient(
                gradient: Gradient(colors: [getDhikrCategoryColor(category), getDhikrCategoryColor(category).opacity(0.7)]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            
            VStack(spacing: 6) {
                HStack {
                    Image(systemName: getDhikrCategoryIcon(category))
                        .font(.system(size: 12))
                    Text("ذكر اليوم")
                        .font(.system(size: 10, weight: .medium))
                }
                .foregroundColor(.white.opacity(0.8))
                
                Spacer()
                
                Text(entry.data?.arabic ?? "سبحان الله")
                    .font(.system(size: 14, weight: .medium))
                    .multilineTextAlignment(.center)
                    .lineLimit(4)
                    .foregroundColor(.white)
                    .environment(\.layoutDirection, .rightToLeft)
                
                Spacer()
                
                if (entry.data?.count ?? 1) > 1 {
                    HStack(spacing: 4) {
                        Image(systemName: "repeat")
                            .font(.system(size: 10))
                        Text("\(entry.data?.count ?? 1) \(entry.data?.timesLabel ?? "مرات")")
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

struct MediumDhikrWidgetView: View {
    let entry: DhikrWidgetEntry
    
    var category: String {
        entry.data?.category ?? "misc"
    }
    
    var body: some View {
        ZStack {
            LinearGradient(
                gradient: Gradient(colors: [getDhikrCategoryColor(category), getDhikrCategoryColor(category).opacity(0.7)]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            
            HStack(spacing: 15) {
                // Left side: category & count
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Image(systemName: getDhikrCategoryIcon(category))
                            .font(.system(size: 14))
                        Text(entry.data?.categoryName ?? "أذكار")
                            .font(.system(size: 12, weight: .bold))
                    }
                    .foregroundColor(.white)
                    
                    Spacer()
                    
                    if (entry.data?.count ?? 1) > 1 {
                        HStack(spacing: 4) {
                            Image(systemName: "repeat")
                                .font(.system(size: 10))
                            Text("\(entry.data?.count ?? 1)×")
                                .font(.system(size: 11, weight: .bold))
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(Color.white.opacity(0.2))
                        .cornerRadius(10)
                    }
                }
                .frame(maxWidth: 90)
                
                // Right side: dhikr text & benefit
                VStack(alignment: .trailing, spacing: 8) {
                    Text(entry.data?.arabic ?? "سبحان الله")
                        .font(.system(size: 15, weight: .medium))
                        .multilineTextAlignment(.trailing)
                        .lineLimit(3)
                        .foregroundColor(.white)
                        .environment(\.layoutDirection, .rightToLeft)
                    
                    if entry.settings?.showBenefit ?? true,
                       let benefit = entry.data?.benefit, !benefit.isEmpty {
                        Text(benefit)
                            .font(.system(size: 10))
                            .multilineTextAlignment(.trailing)
                            .lineLimit(2)
                            .foregroundColor(.white.opacity(0.7))
                            .environment(\.layoutDirection, .rightToLeft)
                    }
                }
            }
            .padding()
        }
    }
}

// ========================================
// الويدجت الرئيسي
// ========================================

struct DhikrWidget: Widget {
    let kind: String = "DhikrWidget"
    
    var body: some WidgetConfiguration {
        StaticConfiguration(
            kind: kind,
            provider: DhikrWidgetProvider()
        ) { entry in
            DhikrWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("ذكر اليوم")
        .description("ذكر يومي متجدد مع فضله")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct DhikrWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    var entry: DhikrWidgetProvider.Entry
    
    var body: some View {
        switch family {
        case .systemSmall:
            SmallDhikrWidgetView(entry: entry)
        case .systemMedium:
            MediumDhikrWidgetView(entry: entry)
        default:
            SmallDhikrWidgetView(entry: entry)
        }
    }
}

// ========================================
// المعاينة
// ========================================

struct DhikrWidget_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            DhikrWidgetEntryView(entry: DhikrWidgetEntry(
                date: Date(),
                data: nil,
                settings: nil
            ))
            .previewContext(WidgetPreviewContext(family: .systemSmall))
            .previewDisplayName("Small")
            
            DhikrWidgetEntryView(entry: DhikrWidgetEntry(
                date: Date(),
                data: nil,
                settings: nil
            ))
            .previewContext(WidgetPreviewContext(family: .systemMedium))
            .previewDisplayName("Medium")
        }
    }
}
