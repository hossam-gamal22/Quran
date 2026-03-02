// widgets/ios/WidgetBundle.swift
// تجميع ويدجت روح المسلم
// iOS 14+ WidgetKit

import WidgetKit
import SwiftUI

/// حزمة الويدجت الرئيسية
/// تجمع جميع ويدجت التطبيق في مكان واحد
@main
struct RoohMuslimWidgetBundle: WidgetBundle {
    
    var body: some Widget {
        // ويدجت مواقيت الصلاة
        NextPrayerWidget()
        
        // ويدجت الأذكار
        AzkarWidget()
        
        // ويدجت التاريخ الهجري
        HijriDateWidget()
    }
}

// ========================================
// امتداد اللون المشترك
// ========================================

extension Color {
    /// إنشاء لون من كود Hex
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
// ثوابت مشتركة
// ========================================

struct WidgetConstants {
    /// App Group ID للمشاركة مع التطبيق
    static let appGroupId = "group.com.roohmuslim.app"
    
    /// اسم ملف البيانات المشتركة
    static let sharedDataFile = "widget_data.json"
    
    /// ألوان التطبيق
    struct Colors {
        static let primary = Color(hex: "#2f7659")
        static let secondary = Color(hex: "#5d4e8c")
        static let accent = Color(hex: "#c17f59")
        static let blue = Color(hex: "#3a7ca5")
        static let dark = Color(hex: "#1a1a2e")
        static let gold = Color(hex: "#d4a017")
    }
    
    /// ألوان الصلوات
    struct PrayerColors {
        static let fajr = Color(hex: "#1a237e")
        static let sunrise = Color(hex: "#ff6f00")
        static let dhuhr = Color(hex: "#2f7659")
        static let asr = Color(hex: "#f57c00")
        static let maghrib = Color(hex: "#d84315")
        static let isha = Color(hex: "#1a1a2e")
    }
    
    /// ألوان فئات الأذكار
    struct AzkarColors {
        static let morning = Color(hex: "#f5a623")
        static let evening = Color(hex: "#3a7ca5")
        static let sleep = Color(hex: "#5d4e8c")
        static let wakeup = Color(hex: "#2f7659")
        static let afterPrayer = Color(hex: "#c17f59")
        static let misc = Color(hex: "#2f7659")
    }
}

// ========================================
// دوال مساعدة مشتركة
// ========================================

/// قراءة البيانات المشتركة من App Group
func loadSharedData<T: Codable>(_ type: T.Type) -> T? {
    guard let containerURL = FileManager.default.containerURL(
        forSecurityApplicationGroupIdentifier: WidgetConstants.appGroupId
    ) else { return nil }
    
    let fileURL = containerURL.appendingPathComponent(WidgetConstants.sharedDataFile)
    
    guard let data = try? Data(contentsOf: fileURL),
          let decoded = try? JSONDecoder().decode(type, from: data) else {
        return nil
    }
    
    return decoded
}

/// الحصول على اسم اليوم بالعربية
func getArabicDayName() -> String {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "ar")
    formatter.dateFormat = "EEEE"
    return formatter.string(from: Date())
}

/// الحصول على التاريخ الميلادي بالعربية
func getArabicGregorianDate() -> String {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "ar")
    formatter.dateFormat = "d MMMM yyyy"
    return formatter.string(from: Date())
}

/// أيقونة الصلاة
func prayerIcon(for prayer: String) -> String {
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

/// أيقونة فئة الأذكار
func azkarCategoryIcon(for category: String) -> String {
    switch category.lowercased() {
    case "morning": return "sun.max.fill"
    case "evening": return "moon.fill"
    case "sleep": return "bed.double.fill"
    case "wakeup": return "alarm.fill"
    case "afterprayer": return "building.columns.fill"
    default: return "heart.fill"
    }
}

/// لون فئة الأذكار
func azkarCategoryColor(for category: String) -> Color {
    switch category.lowercased() {
    case "morning": return WidgetConstants.AzkarColors.morning
    case "evening": return WidgetConstants.AzkarColors.evening
    case "sleep": return WidgetConstants.AzkarColors.sleep
    case "wakeup": return WidgetConstants.AzkarColors.wakeup
    case "afterprayer": return WidgetConstants.AzkarColors.afterPrayer
    default: return WidgetConstants.AzkarColors.misc
    }
}

/// اسم فئة الأذكار بالعربية
func azkarCategoryName(for category: String) -> String {
    switch category.lowercased() {
    case "morning": return "أذكار الصباح"
    case "evening": return "أذكار المساء"
    case "sleep": return "أذكار النوم"
    case "wakeup": return "أذكار الاستيقاظ"
    case "afterprayer": return "بعد الصلاة"
    default: return "أذكار"
    }
}
