// widgets/ios/QuranAyahWidget.swift
// ويدجت آية اليوم - روح المسلم
// iOS 14+ WidgetKit

import WidgetKit
import SwiftUI

// ========================================
// نموذج البيانات
// ========================================

struct VerseData: Codable {
    var arabic: String
    var translation: String?
    var surahName: String
    var surahNameEn: String
    var ayahNumber: Int
    var numberInSurah: Int
    var date: String
    var lastUpdated: String
}

struct VerseWidgetSettings: Codable {
    var enabled: Bool
    var showTranslation: Bool
    var colorScheme: String
}

// ========================================
// مزود البيانات
// ========================================

struct QuranAyahWidgetEntry: TimelineEntry {
    let date: Date
    let data: VerseData?
    let settings: VerseWidgetSettings?
}

struct QuranAyahWidgetProvider: TimelineProvider {
    typealias Entry = QuranAyahWidgetEntry
    
    let appGroupId = WidgetConstants.appGroupId
    
    func placeholder(in context: Context) -> QuranAyahWidgetEntry {
        QuranAyahWidgetEntry(
            date: Date(),
            data: sampleData,
            settings: nil
        )
    }
    
    func getSnapshot(in context: Context, completion: @escaping (QuranAyahWidgetEntry) -> Void) {
        let entry = QuranAyahWidgetEntry(
            date: Date(),
            data: loadData() ?? sampleData,
            settings: loadSettings()
        )
        completion(entry)
    }
    
    func getTimeline(in context: Context, completion: @escaping (Timeline<QuranAyahWidgetEntry>) -> Void) {
        let currentDate = Date()
        let data = loadData() ?? sampleData
        let settings = loadSettings()
        
        let entry = QuranAyahWidgetEntry(
            date: currentDate,
            data: data,
            settings: settings
        )
        
        // Update at midnight for new verse
        let calendar = Calendar.current
        let tomorrow = calendar.startOfDay(for: calendar.date(byAdding: .day, value: 1, to: currentDate)!)
        
        let timeline = Timeline(entries: [entry], policy: .after(tomorrow))
        completion(timeline)
    }
    
    private func loadData() -> VerseData? {
        guard let containerURL = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: appGroupId
        ) else { return nil }
        
        let fileURL = containerURL.appendingPathComponent(WidgetConstants.sharedDataFile)
        
        guard let data = try? Data(contentsOf: fileURL),
              let jsonData = try? JSONDecoder().decode(FullVerseWidgetData.self, from: data) else {
            return nil
        }
        
        return jsonData.verse
    }
    
    private func loadSettings() -> VerseWidgetSettings? {
        guard let containerURL = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: appGroupId
        ) else { return nil }
        
        let fileURL = containerURL.appendingPathComponent(WidgetConstants.sharedDataFile)
        
        guard let data = try? Data(contentsOf: fileURL),
              let jsonData = try? JSONDecoder().decode(FullVerseSettingsData.self, from: data) else {
            return nil
        }
        
        return jsonData.settings.verseWidget
    }
    
    private var sampleData: VerseData {
        VerseData(
            arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
            translation: nil,
            surahName: "سورة الفاتحة",
            surahNameEn: "Al-Fatiha",
            ayahNumber: 1,
            numberInSurah: 1,
            date: ISO8601DateFormatter().string(from: Date()),
            lastUpdated: ISO8601DateFormatter().string(from: Date())
        )
    }
}

struct FullVerseWidgetData: Codable {
    var verse: VerseData
}

struct FullVerseSettingsData: Codable {
    var settings: VerseSettingsContainer
    
    struct VerseSettingsContainer: Codable {
        var verseWidget: VerseWidgetSettings?
    }
}

// ========================================
// واجهة الويدجت الصغير
// ========================================

struct SmallQuranAyahWidgetView: View {
    let entry: QuranAyahWidgetEntry
    
    var body: some View {
        ZStack {
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(hex: "#1e3a5f"),
                    Color(hex: "#2f7659")
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            
            VStack(spacing: 6) {
                HStack {
                    Image(systemName: "book.fill")
                        .font(.system(size: 12))
                    Text("آية اليوم")
                        .font(.system(size: 10, weight: .medium))
                }
                .foregroundColor(.white.opacity(0.8))
                
                Spacer()
                
                Text(entry.data?.arabic ?? "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ")
                    .font(.system(size: 14, weight: .medium))
                    .multilineTextAlignment(.center)
                    .lineLimit(4)
                    .foregroundColor(.white)
                    .environment(\.layoutDirection, .rightToLeft)
                
                Spacer()
                
                Text("\(entry.data?.surahName ?? "سورة الفاتحة") - آية \(entry.data?.numberInSurah ?? 1)")
                    .font(.system(size: 9))
                    .foregroundColor(.white.opacity(0.7))
            }
            .padding()
        }
    }
}

// ========================================
// واجهة الويدجت المتوسط
// ========================================

struct MediumQuranAyahWidgetView: View {
    let entry: QuranAyahWidgetEntry
    
    var body: some View {
        ZStack {
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(hex: "#1e3a5f"),
                    Color(hex: "#2f7659")
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            
            VStack(spacing: 10) {
                HStack {
                    Image(systemName: "book.fill")
                        .font(.system(size: 14))
                    Text("آية اليوم")
                        .font(.system(size: 12, weight: .bold))
                    
                    Spacer()
                    
                    Text(entry.data?.surahName ?? "سورة الفاتحة")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.white.opacity(0.8))
                }
                .foregroundColor(.white)
                
                Spacer()
                
                Text(entry.data?.arabic ?? "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ")
                    .font(.system(size: 16, weight: .medium))
                    .multilineTextAlignment(.center)
                    .lineLimit(3)
                    .foregroundColor(.white)
                    .environment(\.layoutDirection, .rightToLeft)
                
                if entry.settings?.showTranslation ?? false,
                   let translation = entry.data?.translation, !translation.isEmpty {
                    Text(translation)
                        .font(.system(size: 11))
                        .multilineTextAlignment(.center)
                        .lineLimit(2)
                        .foregroundColor(.white.opacity(0.7))
                }
                
                Spacer()
                
                HStack {
                    Image(systemName: "number")
                        .font(.system(size: 10))
                    Text("آية \(entry.data?.numberInSurah ?? 1)")
                        .font(.system(size: 10, weight: .medium))
                }
                .foregroundColor(.white.opacity(0.7))
                .padding(.horizontal, 10)
                .padding(.vertical, 4)
                .background(Color.white.opacity(0.15))
                .cornerRadius(8)
            }
            .padding()
        }
    }
}

// ========================================
// الويدجت الرئيسي
// ========================================

struct QuranAyahWidget: Widget {
    let kind: String = "QuranAyahWidget"
    
    var body: some WidgetConfiguration {
        StaticConfiguration(
            kind: kind,
            provider: QuranAyahWidgetProvider()
        ) { entry in
            QuranAyahWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("آية اليوم")
        .description("آية يومية متجددة من القرآن الكريم")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct QuranAyahWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    var entry: QuranAyahWidgetProvider.Entry
    
    var body: some View {
        switch family {
        case .systemSmall:
            SmallQuranAyahWidgetView(entry: entry)
        case .systemMedium:
            MediumQuranAyahWidgetView(entry: entry)
        default:
            SmallQuranAyahWidgetView(entry: entry)
        }
    }
}

// ========================================
// المعاينة
// ========================================

struct QuranAyahWidget_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            QuranAyahWidgetEntryView(entry: QuranAyahWidgetEntry(
                date: Date(),
                data: nil,
                settings: nil
            ))
            .previewContext(WidgetPreviewContext(family: .systemSmall))
            .previewDisplayName("Small")
            
            QuranAyahWidgetEntryView(entry: QuranAyahWidgetEntry(
                date: Date(),
                data: nil,
                settings: nil
            ))
            .previewContext(WidgetPreviewContext(family: .systemMedium))
            .previewDisplayName("Medium")
        }
    }
}
