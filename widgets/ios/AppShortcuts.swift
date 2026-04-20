// widgets/ios/AppShortcuts.swift
// مزود اختصارات التطبيق — App Shortcuts Provider
// Registers all AppIntents as system-wide App Shortcuts so they appear
// properly in Spotlight Search, Siri, and the Shortcuts app.
//
// iOS 18.0+ (matches AppIntents availability)

import AppIntents

@available(iOS 18.0, *)
struct RoohMuslimShortcuts: AppShortcutsProvider {
    static var shortcutTileColor: ShortcutTileColor = .navy

    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: OpenMorningAzkarIntent(),
            phrases: [
                "افتح أذكار الصباح في \(.applicationName)",
                "أذكار الصباح في \(.applicationName)",
                "Morning Azkar in \(.applicationName)",
            ],
            shortTitle: "أذكار الصباح",
            systemImageName: "sun.max.fill"
        )
        AppShortcut(
            intent: OpenEveningAzkarIntent(),
            phrases: [
                "افتح أذكار المساء في \(.applicationName)",
                "أذكار المساء في \(.applicationName)",
                "Evening Azkar in \(.applicationName)",
            ],
            shortTitle: "أذكار المساء",
            systemImageName: "moon.stars.fill"
        )
        AppShortcut(
            intent: OpenSleepAzkarIntent(),
            phrases: [
                "افتح أذكار النوم في \(.applicationName)",
                "أذكار النوم في \(.applicationName)",
            ],
            shortTitle: "أذكار النوم",
            systemImageName: "bed.double.fill"
        )
        AppShortcut(
            intent: OpenWakeupAzkarIntent(),
            phrases: [
                "افتح أذكار الاستيقاظ في \(.applicationName)",
                "أذكار الاستيقاظ في \(.applicationName)",
            ],
            shortTitle: "أذكار الاستيقاظ",
            systemImageName: "sunrise.fill"
        )
        AppShortcut(
            intent: OpenAfterPrayerAzkarIntent(),
            phrases: [
                "افتح أذكار بعد الصلاة في \(.applicationName)",
                "أذكار بعد الصلاة في \(.applicationName)",
            ],
            shortTitle: "أذكار بعد الصلاة",
            systemImageName: "sparkles"
        )
        AppShortcut(
            intent: OpenPrayerTimesIntent(),
            phrases: [
                "افتح مواقيت الصلاة في \(.applicationName)",
                "مواقيت الصلاة في \(.applicationName)",
                "Prayer times in \(.applicationName)",
            ],
            shortTitle: "مواقيت الصلاة",
            systemImageName: "clock.fill"
        )
        AppShortcut(
            intent: OpenQiblaIntent(),
            phrases: [
                "افتح اتجاه القبلة في \(.applicationName)",
                "اتجاه القبلة في \(.applicationName)",
                "Qibla direction in \(.applicationName)",
            ],
            shortTitle: "اتجاه القبلة",
            systemImageName: "location.north.fill"
        )
        AppShortcut(
            intent: OpenTasbihIntent(),
            phrases: [
                "افتح المسبحة في \(.applicationName)",
                "التسبيح في \(.applicationName)",
                "Tasbih in \(.applicationName)",
            ],
            shortTitle: "التسبيح",
            systemImageName: "hand.raised.fill"
        )
        AppShortcut(
            intent: OpenHolyQuranIntent(),
            phrases: [
                "افتح القرآن في \(.applicationName)",
                "القرآن الكريم في \(.applicationName)",
                "Quran in \(.applicationName)",
            ],
            shortTitle: "القرآن الكريم",
            systemImageName: "book.fill"
        )
        AppShortcut(
            intent: OpenQuranBookmarksIntent(),
            phrases: [
                "افتح إشارات المصحف في \(.applicationName)",
                "إشارات المصحف في \(.applicationName)",
            ],
            shortTitle: "إشارات المصحف",
            systemImageName: "bookmark.fill"
        )
        // Note: OpenMoreAzkarIntent excluded from App Shortcuts (Apple limit: 10 max)
        // It still works via Control Center widget in ControlWidgets.swift
    }
}
