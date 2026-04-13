// widgets/ios/AppIntents.swift
// أغراض التطبيق — App Intents for Control Center & Shortcuts
// iOS 16.0+ AppIntents framework

import AppIntents

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
        return .result()
    }
}
