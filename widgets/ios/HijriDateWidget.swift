// widgets/ios/HijriDateWidget.swift
// ويدجت التاريخ الهجري - روح المسلم
// iOS 14+ WidgetKit

import WidgetKit
import SwiftUI

// ========================================
// نموذج البيانات
// ========================================

/// تحويل الأرقام الإنجليزية إلى أرقام عربية
private func toArabicNumerals(_ input: String) -> String {
    let arabicDigits: [Character] = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"]
    return String(input.map { ch in
        if let digit = ch.wholeNumberValue, digit >= 0, digit <= 9 {
            return arabicDigits[digit]
        }
        return ch
    })
}

private func arabicNumber(_ number: Int) -> String {
    toArabicNumerals(String(number))
}

struct HijriDateData: Codable {
    var hijriDay: Int
    var hijriMonth: String
    var hijriMonthEn: String
    var hijriYear: Int
    var hijriDate: String
    var gregorianDate: String
    var dayName: String
    var dayNameEn: String
}

// ========================================
// مزود البيانات
// ========================================

struct HijriDateWidgetEntry: TimelineEntry {
    let date: Date
    let data: HijriDateData?
    let showGregorian: Bool
    let language: String

    var isArabic: Bool { language == "ar" || language == "ur" || language == "fa" }

    func displayDay() -> String {
        if isArabic { return data?.dayName ?? "الأحد" }
        return data?.dayNameEn ?? "Sunday"
    }

    func displayMonth() -> String {
        if isArabic { return data?.hijriMonth ?? "رمضان" }
        return data?.hijriMonthEn ?? "Ramadan"
    }

    func displayYear() -> String {
        let year = data?.hijriYear ?? 1446
        let suffix = isArabic ? "هـ" : "AH"
        let yearStr = isArabic ? arabicNumber(year) : String(year)
        return "\(yearStr) \(suffix)"
    }

    func displayHijriDay() -> String {
        let day = data?.hijriDay ?? 15
        return isArabic ? arabicNumber(day) : String(day)
    }
}

struct HijriDateWidgetProvider: TimelineProvider {
    typealias Entry = HijriDateWidgetEntry
    
    let appGroupId = WidgetConstants.appGroupId
    
    func placeholder(in context: Context) -> HijriDateWidgetEntry {
        HijriDateWidgetEntry(
            date: Date(),
            data: sampleData,
            showGregorian: true,
            language: "ar"
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (HijriDateWidgetEntry) -> Void) {
        let entry = HijriDateWidgetEntry(
            date: Date(),
            data: loadData() ?? sampleData,
            showGregorian: loadShowGregorian(),
            language: loadLanguage()
        )
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<HijriDateWidgetEntry>) -> Void) {
        let currentDate = Date()
        let data = loadData() ?? sampleData
        let showGregorian = loadShowGregorian()
        let language = loadLanguage()
        
        // تحديث عند منتصف الليل
        let calendar = Calendar.current
        let tomorrow = calendar.startOfDay(for: calendar.date(byAdding: .day, value: 1, to: currentDate)!)
        
        let entry = HijriDateWidgetEntry(
            date: currentDate,
            data: data,
            showGregorian: showGregorian,
            language: language
        )
        
        let timeline = Timeline(entries: [entry], policy: .after(tomorrow))
        completion(timeline)
    }
    
    private func loadData() -> HijriDateData? {
        guard let rawData = loadSharedRawData(),
              let jsonData = try? JSONDecoder().decode(FullHijriData.self, from: rawData) else {
            return nil
        }
        
        let prayer = jsonData.prayer
        return HijriDateData(
            hijriDay: prayer.hijriDay,
            hijriMonth: prayer.hijriMonth,
            hijriMonthEn: prayer.hijriMonthEn ?? prayer.hijriMonth,
            hijriYear: prayer.hijriYear,
            hijriDate: prayer.hijriDate,
            gregorianDate: prayer.gregorianDate,
            dayName: getDayNameAr(),
            dayNameEn: getDayNameEn()
        )
    }
    
    private func loadShowGregorian() -> Bool {
        guard let data = loadSharedRawData(),
              let jsonData = try? JSONDecoder().decode(FullSettingsData.self, from: data) else {
            return true
        }
        return jsonData.settings.hijriWidget?.showGregorian ?? true
    }

    private func loadLanguage() -> String {
        guard let data = loadSharedRawData(),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let lang = json["language"] as? String else {
            return "ar"
        }
        return lang
    }

    private func getDayNameAr() -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "ar")
        formatter.dateFormat = "EEEE"
        return formatter.string(from: Date())
    }
    
    private func getDayNameEn() -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en")
        formatter.dateFormat = "EEEE"
        return formatter.string(from: Date())
    }
    
    private var sampleData: HijriDateData {
        HijriDateData(
            hijriDay: 15,
            hijriMonth: "رمضان",
            hijriMonthEn: "Ramadan",
            hijriYear: 1446,
            hijriDate: "15 رمضان 1446",
            gregorianDate: "2 مارس 2026",
            dayName: "الأحد",
            dayNameEn: "Sunday"
        )
    }
}

struct FullHijriData: Codable {
    var prayer: PrayerWidgetData
}

struct FullSettingsData: Codable {
    var settings: HijriSettings
    
    struct HijriSettings: Codable {
        var hijriWidget: HijriWidgetSettings?
        
        struct HijriWidgetSettings: Codable {
            var enabled: Bool?
            var showGregorian: Bool?
        }
    }
}

// ========================================
// واجهة الويدجت الصغير
// ========================================

struct SmallHijriDateWidgetView: View {
    let entry: HijriDateWidgetEntry
    let theme: IOSWidgetTheme
    
    var body: some View {
        ZStack {
            ThemedWidgetBackground(theme: theme)
            
            VStack(spacing: 4) {
                WidgetAppIcon(size: 32)

                Text(entry.displayDay())
                    .font(.custom("Amiri", size: 11))
                    .foregroundColor(theme.mutedColor)

                Text(entry.displayHijriDay())
                    .font(.custom("Amiri-Bold", size: 40))
                    .foregroundColor(theme.badgeText)

                GlassPill(color: theme.badgeBg.opacity(0.5)) {
                    Text(entry.displayMonth())
                        .font(.custom("Amiri-Bold", size: 13))
                        .foregroundColor(theme.textColor.opacity(0.9))
                }

                Text(entry.displayYear())
                    .font(.custom("Amiri", size: 10))
                    .foregroundColor(theme.mutedColor.opacity(0.6))

                if entry.showGregorian {
                    Text(entry.data?.gregorianDate ?? "2 مارس")
                        .font(.system(size: 9))
                        .foregroundColor(theme.mutedColor.opacity(0.4))
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

struct MediumHijriDateWidgetView: View {
    let entry: HijriDateWidgetEntry
    let theme: IOSWidgetTheme
    
    var body: some View {
        ZStack {
            ThemedWidgetBackground(theme: theme)
            
            VStack(spacing: 0) {
                HStack {
                    WidgetAppIcon(size: 20)
                    Text("التقويم الهجري")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(theme.mutedColor)
                    Spacer()
                    if entry.showGregorian {
                        Text(entry.data?.gregorianDate ?? "2 مارس 2026")
                            .font(.system(size: 10))
                            .foregroundColor(theme.mutedColor.opacity(0.5))
                    }
                }
                .padding(.horizontal)
                .padding(.top, 10)
                .padding(.bottom, 6)
                
                HStack(spacing: 16) {
                    VStack(spacing: 2) {
                        Text(entry.displayDay())
                            .font(.custom("Amiri", size: 12))
                            .foregroundColor(theme.mutedColor)

                        Text(entry.displayHijriDay())
                            .font(.custom("Amiri-Bold", size: 50))
                            .foregroundColor(theme.badgeText)
                    }
                    .frame(width: 90)

                    Rectangle()
                        .fill(WidgetConstants.Glass.border)
                        .frame(width: 1)
                        .padding(.vertical, 8)

                    VStack(alignment: .trailing, spacing: 6) {
                        Text(entry.displayMonth())
                            .font(.custom("Amiri-Bold", size: 20))
                            .foregroundColor(theme.textColor)

                        Text(entry.displayYear())
                            .font(.custom("Amiri", size: 14))
                            .foregroundColor(theme.mutedColor)
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

struct LargeHijriDateWidgetView: View {
    let entry: HijriDateWidgetEntry
    let theme: IOSWidgetTheme
    
    let hijriMonths = [
        "محرم", "صفر", "ربيع الأول", "ربيع الثاني",
        "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان",
        "رمضان", "شوال", "ذو القعدة", "ذو الحجة"
    ]
    
    var currentMonthIndex: Int {
        hijriMonths.firstIndex(of: entry.data?.hijriMonth ?? "رمضان") ?? 8
    }
    
    var body: some View {
        ZStack {
            ThemedWidgetBackground(theme: theme)
            
            VStack(spacing: 12) {
                HStack {
                    WidgetAppIcon(size: 20)
                    Text("التقويم الهجري")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(theme.textColor)
                    Spacer()
                    GlassPill(color: theme.badgeBg.opacity(0.5)) {
                        Text("\(entry.data?.hijriYear ?? 1446) هـ")
                            .font(.custom("Amiri-Bold", size: 12))
                            .foregroundColor(theme.badgeText)
                    }
                }
                .padding(.horizontal)
                
                VStack(spacing: 6) {
                    Text(entry.data?.dayName ?? "الأحد")
                        .font(.custom("Amiri", size: 14))
                        .foregroundColor(theme.mutedColor)
                    
                    Text(arabicNumber(entry.data?.hijriDay ?? 15))
                        .font(.custom("Amiri-Bold", size: 64))
                        .foregroundColor(theme.badgeText)
                    
                    Text(entry.data?.hijriMonth ?? "رمضان")
                        .font(.custom("Amiri-Bold", size: 22))
                        .foregroundColor(theme.textColor)
                }
                .padding(.vertical, 8)
                .frame(maxWidth: .infinity)
                .background(theme.badgeBg.opacity(0.3))
                .cornerRadius(16)
                .padding(.horizontal)
                
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(0..<hijriMonths.count, id: \.self) { index in
                            Text(hijriMonths[index])
                                .font(.system(size: 10, weight: index == currentMonthIndex ? .bold : .regular))
                                .foregroundColor(index == currentMonthIndex ? theme.badgeText : theme.mutedColor.opacity(0.4))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(index == currentMonthIndex ? theme.badgeBg.opacity(0.5) : Color.clear)
                                .cornerRadius(8)
                        }
                    }
                    .padding(.horizontal)
                }
                
                Spacer()
                
                if entry.showGregorian {
                    GlassPill(color: theme.badgeBg.opacity(0.3)) {
                        HStack(spacing: 4) {
                            Image(systemName: "calendar")
                                .font(.system(size: 11))
                            Text(entry.data?.gregorianDate ?? "2 مارس 2026")
                                .font(.system(size: 12, weight: .medium))
                        }
                        .foregroundColor(theme.mutedColor.opacity(0.6))
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

struct HijriDateWidget: Widget {
    let kind: String = "HijriDateWidget"
    
    var body: some WidgetConfiguration {
        StaticConfiguration(
            kind: kind,
            provider: HijriDateWidgetProvider()
        ) { entry in
            HijriDateWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("التاريخ الهجري")
        .description("عرض التاريخ الهجري اليومي")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

struct HijriDateWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    var entry: HijriDateWidgetProvider.Entry
    let theme = loadWidgetTheme()
    
    var body: some View {
        switch family {
        case .systemSmall:
            SmallHijriDateWidgetView(entry: entry, theme: theme)
                .widgetURL(URL(string: "rooh-almuslim://hijri"))
        case .systemMedium:
            MediumHijriDateWidgetView(entry: entry, theme: theme)
                .widgetURL(URL(string: "rooh-almuslim://hijri"))
        case .systemLarge:
            LargeHijriDateWidgetView(entry: entry, theme: theme)
                .widgetURL(URL(string: "rooh-almuslim://hijri"))
        default:
            SmallHijriDateWidgetView(entry: entry, theme: theme)
                .widgetURL(URL(string: "rooh-almuslim://hijri"))
        }
    }
}

// ========================================
// المعاينة
// ========================================

struct HijriDateWidget_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            HijriDateWidgetEntryView(entry: HijriDateWidgetEntry(
                date: Date(),
                data: nil,
                showGregorian: true,
                language: "ar"
            ))
            .previewContext(WidgetPreviewContext(family: .systemSmall))
            .previewDisplayName("Small")
            
            HijriDateWidgetEntryView(entry: HijriDateWidgetEntry(
                date: Date(),
                data: nil,
                showGregorian: true,
                language: "ar"
            ))
            .previewContext(WidgetPreviewContext(family: .systemMedium))
            .previewDisplayName("Medium")
            
            HijriDateWidgetEntryView(entry: HijriDateWidgetEntry(
                date: Date(),
                data: nil,
                showGregorian: true,
                language: "ar"
            ))
            .previewContext(WidgetPreviewContext(family: .systemLarge))
            .previewDisplayName("Large")
        }
    }
}
