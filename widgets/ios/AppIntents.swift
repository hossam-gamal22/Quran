// widgets/ios/AppIntents.swift
// أغراض التطبيق — App Intents for Control Center & Shortcuts
// iOS 16.0+ AppIntents framework

import AppIntents

// ========================================
// مساعد لكتابة الرابط في App Group UserDefaults
// ========================================

private let kAppGroupId = "group.com.rooh.almuslim"
private let kPendingDeepLinkKey = "pending_deep_link"

/// Write the target deep link to shared storage so the RN app can read it on launch.
private func writePendingDeepLink(_ url: String) {
    UserDefaults(suiteName: kAppGroupId)?.set(url, forKey: kPendingDeepLinkKey)
}

// ========================================
// أغراض فتح صفحات التطبيق
// ========================================

/// فتح أذكار الصباح
@available(iOS 16.0, *)
struct OpenMorningAzkarIntent: AppIntent {
    static var title: LocalizedStringResource = "أذكار الصباح"
    static var description = IntentDescription("فتح أذكار الصباح في تطبيق روح المسلم")
    static var openAppWhenRun: Bool = true
    
    func perform() async throws -> some IntentResult {
        writePendingDeepLink("rooh-almuslim://azkar/1")
        return .result()
    }
}

/// فتح أذكار المساء
@available(iOS 16.0, *)
struct OpenEveningAzkarIntent: AppIntent {
    static var title: LocalizedStringResource = "أذكار المساء"
    static var description = IntentDescription("فتح أذكار المساء في تطبيق روح المسلم")
    static var openAppWhenRun: Bool = true
    
    func perform() async throws -> some IntentResult {
        writePendingDeepLink("rooh-almuslim://azkar/1b")
        return .result()
    }
}

/// فتح مواقيت الصلاة
@available(iOS 16.0, *)
struct OpenPrayerTimesIntent: AppIntent {
    static var title: LocalizedStringResource = "مواقيت الصلاة"
    static var description = IntentDescription("فتح مواقيت الصلاة في تطبيق روح المسلم")
    static var openAppWhenRun: Bool = true
    
    func perform() async throws -> some IntentResult {
        writePendingDeepLink("rooh-almuslim://prayer")
        return .result()
    }
}

/// فتح اتجاه القبلة
@available(iOS 16.0, *)
struct OpenQiblaIntent: AppIntent {
    static var title: LocalizedStringResource = "اتجاه القبلة"
    static var description = IntentDescription("فتح اتجاه القبلة في تطبيق روح المسلم")
    static var openAppWhenRun: Bool = true
    
    func perform() async throws -> some IntentResult {
        writePendingDeepLink("rooh-almuslim://qibla")
        return .result()
    }
}

/// فتح التسبيح
@available(iOS 16.0, *)
struct OpenTasbihIntent: AppIntent {
    static var title: LocalizedStringResource = "التسبيح"
    static var description = IntentDescription("فتح المسبحة الإلكترونية في تطبيق روح المسلم")
    static var openAppWhenRun: Bool = true
    
    func perform() async throws -> some IntentResult {
        writePendingDeepLink("rooh-almuslim://tasbih")
        return .result()
    }
}

/// فتح أذكار النوم
@available(iOS 16.0, *)
struct OpenSleepAzkarIntent: AppIntent {
    static var title: LocalizedStringResource = "أذكار النوم"
    static var description = IntentDescription("فتح أذكار النوم في تطبيق روح المسلم")
    static var openAppWhenRun: Bool = true
    
    func perform() async throws -> some IntentResult {
        writePendingDeepLink("rooh-almuslim://azkar/2")
        return .result()
    }
}

/// فتح أذكار الاستيقاظ
@available(iOS 16.0, *)
struct OpenWakeupAzkarIntent: AppIntent {
    static var title: LocalizedStringResource = "أذكار الاستيقاظ"
    static var description = IntentDescription("فتح أذكار الاستيقاظ من النوم في تطبيق روح المسلم")
    static var openAppWhenRun: Bool = true
    
    func perform() async throws -> some IntentResult {
        writePendingDeepLink("rooh-almuslim://azkar/3")
        return .result()
    }
}

/// فتح أذكار بعد الصلاة
@available(iOS 16.0, *)
struct OpenAfterPrayerAzkarIntent: AppIntent {
    static var title: LocalizedStringResource = "أذكار بعد الصلاة"
    static var description = IntentDescription("فتح الأذكار بعد السلام من الصلاة في تطبيق روح المسلم")
    static var openAppWhenRun: Bool = true
    
    func perform() async throws -> some IntentResult {
        writePendingDeepLink("rooh-almuslim://azkar/27")
        return .result()
    }
}

/// فتح القرآن الكريم
@available(iOS 16.0, *)
struct OpenHolyQuranIntent: AppIntent {
    static var title: LocalizedStringResource = "القرآن الكريم"
    static var description = IntentDescription("فتح المصحف الشريف في تطبيق روح المسلم")
    static var openAppWhenRun: Bool = true
    
    func perform() async throws -> some IntentResult {
        writePendingDeepLink("rooh-almuslim://quran")
        return .result()
    }
}

/// فتح الإشارات المرجعية للمصحف
@available(iOS 16.0, *)
struct OpenQuranBookmarksIntent: AppIntent {
    static var title: LocalizedStringResource = "الإشارات المرجعية"
    static var description = IntentDescription("فتح إشارات المصحف المحفوظة في تطبيق روح المسلم")
    static var openAppWhenRun: Bool = true
    
    func perform() async throws -> some IntentResult {
        writePendingDeepLink("rooh-almuslim://quran-bookmarks")
        return .result()
    }
}

/// فتح أذكار متنوعة
@available(iOS 16.0, *)
struct OpenMoreAzkarIntent: AppIntent {
    static var title: LocalizedStringResource = "أذكار متنوعة"
    static var description = IntentDescription("فتح صفحة الأذكار المتنوعة في تطبيق روح المسلم")
    static var openAppWhenRun: Bool = true
    
    func perform() async throws -> some IntentResult {
        writePendingDeepLink("rooh-almuslim://more-azkar")
        return .result()
    }
}
