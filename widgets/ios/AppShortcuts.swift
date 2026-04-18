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
                "أذكار الصباح",
                "Morning Azkar in \(.applicationName)",
            ],
            shortTitle: "أذكار الصباح",
            systemImageName: "sun.max.fill"
        )
        AppShortcut(
            intent: OpenEveningAzkarIntent(),
            phrases: [
                "افتح أذكار المساء في \(.applicationName)",
                "أذكار المساء",
                "Evening Azkar in \(.applicationName)",
            ],
            shortTitle: "أذكار المساء",
            systemImageName: "moon.stars.fill"
        )
        AppShortcut(
            intent: OpenSleepAzkarIntent(),
            phrases: [
                "افتح أذكار النوم في \(.applicationName)",
                "أذكار النوم",
            ],
            shortTitle: "أذكار النوم",
            systemImageName: "bed.double.fill"
        )
        AppShortcut(
            intent: OpenWakeupAzkarIntent(),
            phrases: [
                "افتح أذكار الاستيقاظ في \(.applicationName)",
                "أذكار الاستيقاظ",
            ],
            shortTitle: "أذكار الاستيقاظ",
            systemImageName: "sunrise.fill"
        )
        AppShortcut(
            intent: OpenAfterPrayerAzkarIntent(),
            phrases: [
                "افتح أذكار بعد الصلاة في \(.applicationName)",
                "أذكار بعد الصلاة",
            ],
            shortTitle: "أذكار بعد الصلاة",
            systemImageName: "figure.kneeling"
        )
        AppShortcut(
            intent: OpenPrayerTimesIntent(),
            phrases: [
                "افتح مواقيت الصلاة في \(.applicationName)",
                "مواقيت الصلاة",
                "Prayer times in \(.applicationName)",
            ],
            shortTitle: "مواقيت الصلاة",
            systemImageName: "clock.fill"
        )
        AppShortcut(
            intent: OpenQiblaIntent(),
            phrases: [
                "افتح اتجاه القبلة في \(.applicationName)",
                "اتجاه القبلة",
                "Qibla direction in \(.applicationName)",
            ],
            shortTitle: "اتجاه القبلة",
            systemImageName: "location.north.fill"
        )
        AppShortcut(
            intent: OpenTasbihIntent(),
            phrases: [
                "افتح المسبحة في \(.applicationName)",
                "التسبيح",
                "Tasbih in \(.applicationName)",
            ],
            shortTitle: "التسبيح",
            systemImageName: "hand.raised.fill"
        )
        AppShortcut(
            intent: OpenHolyQuranIntent(),
            phrases: [
                "افتح القرآن في \(.applicationName)",
                "القرآن الكريم",
                "Quran in \(.applicationName)",
            ],
            shortTitle: "القرآن الكريم",
            systemImageName: "book.fill"
        )
        AppShortcut(
            intent: OpenQuranBookmarksIntent(),
            phrases: [
                "افتح إشارات المصحف في \(.applicationName)",
                "إشارات المصحف",
            ],
            shortTitle: "إشارات المصحف",
            systemImageName: "bookmark.fill"
        )
        AppShortcut(
            intent: OpenMoreAzkarIntent(),
            phrases: [
                "افتح أذكار متنوعة في \(.applicationName)",
                "أذكار متنوعة",
            ],
            shortTitle: "أذكار متنوعة",
            systemImageName: "text.book.closed"
        )
    }
}
