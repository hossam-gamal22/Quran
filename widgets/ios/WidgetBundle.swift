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
        
        // ويدجت آية اليوم
        QuranAyahWidget()
        
        // ويدجت ذكر اليوم
        DhikrWidget()
        
        // الأنشطة الحالية — Dynamic Island + Lock Screen (iOS 16.1+)
        PrayerLiveActivity()
        
        // عناصر مركز التحكم — Control Center (iOS 18+)
        if #available(iOS 18.0, *) {
            MorningAzkarControl()
            EveningAzkarControl()
            SleepAzkarControl()
            WakeupAzkarControl()
            AfterPrayerAzkarControl()
            PrayerTimesControl()
            QiblaControl()
            TasbihControl()
            HolyQuranControl()
            QuranBookmarksControl()
            MoreAzkarControl()
        }
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
    static let appGroupId = "group.com.rooh.almuslim"
    
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
    
    /// ألوان الزجاج المتجمد
    struct Glass {
        static let bg = Color(hex: "#081827").opacity(0.7)
        static let bgLight = Color(hex: "#081827").opacity(0.6)
        static let border = Color.white.opacity(0.15)
        static let highlight = Color.white.opacity(0.1)
        static let card = Color.white.opacity(0.08)
        static let pill = Color.white.opacity(0.12)
    }
}

// ========================================
// خلفية زجاجية مشتركة
// ========================================

/// خلفية الويدجت بتأثير الزجاج المتجمد
struct GlassWidgetBackground: View {
    var accentColor: Color = WidgetConstants.Colors.primary
    
    var body: some View {
        ZStack {
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(hex: "#0a1e30").opacity(0.95),
                    Color(hex: "#081827").opacity(0.95)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            
            // Glass highlight overlay
            LinearGradient(
                gradient: Gradient(colors: [
                    accentColor.opacity(0.15),
                    Color.clear
                ]),
                startPoint: .topLeading,
                endPoint: .center
            )
        }
    }
}

/// أيقونة التطبيق للويدجت
struct WidgetAppIcon: View {
    var size: CGFloat = 32
    
    var body: some View {
        Image("WidgetIcon")
            .resizable()
            .aspectRatio(contentMode: .fill)
            .frame(width: size, height: size)
            .clipShape(RoundedRectangle(cornerRadius: size * 0.25))
    }
}

/// حبة زجاجية (pill) مشتركة
struct GlassPill<Content: View>: View {
    var color: Color = WidgetConstants.Glass.pill
    @ViewBuilder var content: Content
    
    var body: some View {
        content
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(color)
            .cornerRadius(8)
    }
}

// ========================================
// دوال مساعدة مشتركة
// ========================================

/// قراءة البيانات المشتركة كـ Data خام — UserDefaults أولاً ثم ملف
func loadSharedRawData() -> Data? {
    // Primary: UserDefaults (written by react-native-shared-group-preferences)
    if let userDefaults = UserDefaults(suiteName: WidgetConstants.appGroupId),
       let jsonString = userDefaults.string(forKey: "widget_shared_data"),
       let data = jsonString.data(using: .utf8) {
        return data
    }
    
    // Fallback: JSON file in App Group container
    guard let containerURL = FileManager.default.containerURL(
        forSecurityApplicationGroupIdentifier: WidgetConstants.appGroupId
    ) else { return nil }
    
    let fileURL = containerURL.appendingPathComponent(WidgetConstants.sharedDataFile)
    return try? Data(contentsOf: fileURL)
}

/// قراءة البيانات المشتركة من App Group UserDefaults
/// react-native-shared-group-preferences يكتب إلى UserDefaults(suiteName:)
func loadSharedData<T: Codable>(_ type: T.Type) -> T? {
    guard let data = loadSharedRawData() else { return nil }
    return try? JSONDecoder().decode(type, from: data)
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

// ========================================
// نظام الثيمات — يقرأ widgetTheme من البيانات المشتركة
// ========================================

/// ثيم ويدجت واحد — يتطابق مع WidgetTheme في shared.ts
struct IOSWidgetTheme {
    let id: String
    let gradientFrom: Color
    let gradientTo: Color
    let accentColor: Color
    let textColor: Color
    let mutedColor: Color
    let badgeBg: Color
    let badgeText: Color
}

/// الثيمات المتاحة — تتطابق مع WIDGET_THEMES في shared.ts
let widgetThemes: [String: IOSWidgetTheme] = [
    "default_dark": IOSWidgetTheme(
        id: "default_dark",
        gradientFrom: Color(hex: "#0e1f38"), gradientTo: Color(hex: "#091428"),
        accentColor: Color(hex: "#0d9668"), textColor: .white,
        mutedColor: Color(hex: "#c8d6e5"),
        badgeBg: Color(hex: "#1a2744"), badgeText: Color(hex: "#f0c654")
    ),
    "default_light": IOSWidgetTheme(
        id: "default_light",
        gradientFrom: Color(hex: "#f0ead8"), gradientTo: Color(hex: "#e8dfc8"),
        accentColor: Color(hex: "#0d9668"), textColor: Color(hex: "#1a1a2e"),
        mutedColor: Color(hex: "#4a4a6a"),
        badgeBg: Color(hex: "#dde5d8"), badgeText: Color(hex: "#b8860b")
    ),
    "masjid_green": IOSWidgetTheme(
        id: "masjid_green",
        gradientFrom: Color(hex: "#0a3d2e"), gradientTo: Color(hex: "#062218"),
        accentColor: Color(hex: "#14c78a"), textColor: Color(hex: "#e8f5e9"),
        mutedColor: Color(hex: "#a5d6a7"),
        badgeBg: Color(hex: "#1b5e20"), badgeText: Color(hex: "#c8e6c9")
    ),
    "kaaba_gold": IOSWidgetTheme(
        id: "kaaba_gold",
        gradientFrom: Color(hex: "#2c1810"), gradientTo: Color(hex: "#1a0e08"),
        accentColor: Color(hex: "#d4a017"), textColor: Color(hex: "#fef3c7"),
        mutedColor: Color(hex: "#d4a853"),
        badgeBg: Color(hex: "#78350f"), badgeText: Color(hex: "#fbbf24")
    ),
    "royal_purple": IOSWidgetTheme(
        id: "royal_purple",
        gradientFrom: Color(hex: "#1a0a2e"), gradientTo: Color(hex: "#0d0518"),
        accentColor: Color(hex: "#a78bfa"), textColor: Color(hex: "#ede9fe"),
        mutedColor: Color(hex: "#a78bfa"),
        badgeBg: Color(hex: "#4c1d95"), badgeText: Color(hex: "#c4b5fd")
    ),
    "ocean_blue": IOSWidgetTheme(
        id: "ocean_blue",
        gradientFrom: Color(hex: "#0c2461"), gradientTo: Color(hex: "#061630"),
        accentColor: Color(hex: "#3a7ca5"), textColor: Color(hex: "#dbeafe"),
        mutedColor: Color(hex: "#93bbfc"),
        badgeBg: Color(hex: "#1e3a5f"), badgeText: Color(hex: "#bfdbfe")
    ),
    "desert_sand": IOSWidgetTheme(
        id: "desert_sand",
        gradientFrom: Color(hex: "#3d2b1f"), gradientTo: Color(hex: "#261a10"),
        accentColor: Color(hex: "#c17f59"), textColor: Color(hex: "#fef3c7"),
        mutedColor: Color(hex: "#d6a87c"),
        badgeBg: Color(hex: "#78350f"), badgeText: Color(hex: "#fde68a")
    ),
    "emerald_night": IOSWidgetTheme(
        id: "emerald_night",
        gradientFrom: Color(hex: "#064e3b"), gradientTo: Color(hex: "#022c22"),
        accentColor: Color(hex: "#34d399"), textColor: Color(hex: "#d1fae5"),
        mutedColor: Color(hex: "#6ee7b7"),
        badgeBg: Color(hex: "#065f46"), badgeText: Color(hex: "#a7f3d0")
    ),
    "midnight_rose": IOSWidgetTheme(
        id: "midnight_rose",
        gradientFrom: Color(hex: "#4a1942"), gradientTo: Color(hex: "#2d0f28"),
        accentColor: Color(hex: "#f472b6"), textColor: Color(hex: "#fce7f3"),
        mutedColor: Color(hex: "#f9a8d4"),
        badgeBg: Color(hex: "#831843"), badgeText: Color(hex: "#fbcfe8")
    ),
]

/// الحصول على الثيم من البيانات المشتركة — fallback to default_dark
func loadWidgetTheme() -> IOSWidgetTheme {
    guard let data = loadSharedRawData(),
          let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          let settings = json["settings"] as? [String: Any],
          let themeId = settings["widgetTheme"] as? String,
          let theme = widgetThemes[themeId] else {
        return widgetThemes["default_dark"]!
    }
    return theme
}

/// خلفية الويدجت تستخدم الثيم
struct ThemedWidgetBackground: View {
    var theme: IOSWidgetTheme
    
    var body: some View {
        ZStack {
            LinearGradient(
                gradient: Gradient(colors: [
                    theme.gradientFrom.opacity(0.95),
                    theme.gradientTo.opacity(0.95)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            
            LinearGradient(
                gradient: Gradient(colors: [
                    theme.accentColor.opacity(0.15),
                    Color.clear
                ]),
                startPoint: .topLeading,
                endPoint: .center
            )
        }
    }
}
