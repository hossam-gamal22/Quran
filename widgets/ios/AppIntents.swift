// widgets/ios/AppIntents.swift
// أغراض التطبيق — App Intents for Control Center & Shortcuts
// iOS 18.0+ (for Control Center widgets and App Shortcuts)
//
// Each intent both:
//   1. Writes the target deep link to App Group UserDefaults (fallback for
//      cold-start consumers in JS via WidgetReloadModule.readPendingDeepLink).
//   2. Relies on openAppWhenRun to launch the main app, where JS consumes the
//      pending deep link and navigates to the correct screen. OpenURLIntent
//      rejects custom app schemes in this Siri/Spotlight path.

import AppIntents
import Foundation

// ========================================
// مساعد لكتابة الرابط في App Group UserDefaults
// ========================================

private let kAppGroupId = "group.com.rooh.almuslim"
private let kPendingDeepLinkKey = "pending_deep_link"

private func writePendingDeepLink(_ url: String) {
    UserDefaults(suiteName: kAppGroupId)?.set(url, forKey: kPendingDeepLinkKey)
}

// ========================================
// أغراض فتح صفحات التطبيق
// ========================================

@available(iOS 18.0, *)
struct OpenMorningAzkarIntent: AppIntent {
    static var title: LocalizedStringResource = "أذكار الصباح"
    static var description = IntentDescription("فتح أذكار الصباح في تطبيق روح المسلم")
    static var openAppWhenRun: Bool = true
    @MainActor
    func perform() async throws -> some IntentResult {
        let url = "rooh-almuslim://azkar/1"
        writePendingDeepLink(url)
        return .result()
    }
}

@available(iOS 18.0, *)
struct OpenEveningAzkarIntent: AppIntent {
    static var title: LocalizedStringResource = "أذكار المساء"
    static var description = IntentDescription("فتح أذكار المساء في تطبيق روح المسلم")
    static var openAppWhenRun: Bool = true
    @MainActor
    func perform() async throws -> some IntentResult {
        let url = "rooh-almuslim://azkar/1b"
        writePendingDeepLink(url)
        return .result()
    }
}

@available(iOS 18.0, *)
struct OpenPrayerTimesIntent: AppIntent {
    static var title: LocalizedStringResource = "مواقيت الصلاة"
    static var description = IntentDescription("فتح مواقيت الصلاة في تطبيق روح المسلم")
    static var openAppWhenRun: Bool = true
    @MainActor
    func perform() async throws -> some IntentResult {
        let url = "rooh-almuslim://prayer"
        writePendingDeepLink(url)
        return .result()
    }
}

@available(iOS 18.0, *)
struct OpenQiblaIntent: AppIntent {
    static var title: LocalizedStringResource = "اتجاه القبلة"
    static var description = IntentDescription("فتح اتجاه القبلة في تطبيق روح المسلم")
    static var openAppWhenRun: Bool = true
    @MainActor
    func perform() async throws -> some IntentResult {
        // Qibla is a sub-tab inside Prayer, not a standalone route.
        // Use the Prayer tab with ?tab=qibla so expo-router matches in both
        // cold-start (via pending deep link) and warm-start (via Linking event).
        let url = "rooh-almuslim://prayer?tab=qibla"
        writePendingDeepLink(url)
        return .result()
    }
}

@available(iOS 18.0, *)
struct OpenTasbihIntent: AppIntent {
    static var title: LocalizedStringResource = "التسبيح"
    static var description = IntentDescription("فتح المسبحة الإلكترونية في تطبيق روح المسلم")
    static var openAppWhenRun: Bool = true
    @MainActor
    func perform() async throws -> some IntentResult {
        let url = "rooh-almuslim://tasbih"
        writePendingDeepLink(url)
        return .result()
    }
}

@available(iOS 18.0, *)
struct OpenSleepAzkarIntent: AppIntent {
    static var title: LocalizedStringResource = "أذكار النوم"
    static var description = IntentDescription("فتح أذكار النوم في تطبيق روح المسلم")
    static var openAppWhenRun: Bool = true
    @MainActor
    func perform() async throws -> some IntentResult {
        let url = "rooh-almuslim://azkar/2"
        writePendingDeepLink(url)
        return .result()
    }
}

@available(iOS 18.0, *)
struct OpenWakeupAzkarIntent: AppIntent {
    static var title: LocalizedStringResource = "أذكار الاستيقاظ"
    static var description = IntentDescription("فتح أذكار الاستيقاظ من النوم في تطبيق روح المسلم")
    static var openAppWhenRun: Bool = true
    @MainActor
    func perform() async throws -> some IntentResult {
        let url = "rooh-almuslim://azkar/3"
        writePendingDeepLink(url)
        return .result()
    }
}

@available(iOS 18.0, *)
struct OpenAfterPrayerAzkarIntent: AppIntent {
    static var title: LocalizedStringResource = "أذكار بعد الصلاة"
    static var description = IntentDescription("فتح الأذكار بعد السلام من الصلاة في تطبيق روح المسلم")
    static var openAppWhenRun: Bool = true
    @MainActor
    func perform() async throws -> some IntentResult {
        let url = "rooh-almuslim://azkar/27"
        writePendingDeepLink(url)
        return .result()
    }
}

@available(iOS 18.0, *)
struct OpenHolyQuranIntent: AppIntent {
    static var title: LocalizedStringResource = "القرآن الكريم"
    static var description = IntentDescription("فتح المصحف الشريف في تطبيق روح المسلم")
    static var openAppWhenRun: Bool = true
    @MainActor
    func perform() async throws -> some IntentResult {
        let url = "rooh-almuslim://quran"
        writePendingDeepLink(url)
        return .result()
    }
}

@available(iOS 18.0, *)
struct OpenQuranBookmarksIntent: AppIntent {
    static var title: LocalizedStringResource = "الإشارات المرجعية"
    static var description = IntentDescription("فتح إشارات المصحف المحفوظة في تطبيق روح المسلم")
    static var openAppWhenRun: Bool = true
    @MainActor
    func perform() async throws -> some IntentResult {
        let url = "rooh-almuslim://quran-bookmarks"
        writePendingDeepLink(url)
        return .result()
    }
}

@available(iOS 18.0, *)
struct OpenMoreAzkarIntent: AppIntent {
    static var title: LocalizedStringResource = "أذكار متنوعة"
    static var description = IntentDescription("فتح صفحة الأذكار المتنوعة في تطبيق روح المسلم")
    static var openAppWhenRun: Bool = true
    @MainActor
    func perform() async throws -> some IntentResult {
        let url = "rooh-almuslim://more-azkar"
        writePendingDeepLink(url)
        return .result()
    }
}
