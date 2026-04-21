// widgets/ios/ControlWidgets.swift
// عناصر مركز التحكم — Control Center Widgets (iOS 18+)

import SwiftUI
import WidgetKit
import AppIntents

// ========================================
// عناصر مركز التحكم
// ========================================

/// زر أذكار الصباح في مركز التحكم
@available(iOS 18.0, *)
struct MorningAzkarControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "MorningAzkarControl") {
            ControlWidgetButton(action: OpenMorningAzkarIntent()) {
                Label("أذكار الصباح", systemImage: "sun.max.fill")
            }
        }
        .displayName("أذكار الصباح")
        .description("فتح أذكار الصباح بسرعة")
    }
}

/// زر أذكار المساء في مركز التحكم
@available(iOS 18.0, *)
struct EveningAzkarControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "EveningAzkarControl") {
            ControlWidgetButton(action: OpenEveningAzkarIntent()) {
                Label("أذكار المساء", systemImage: "moon.stars.fill")
            }
        }
        .displayName("أذكار المساء")
        .description("فتح أذكار المساء بسرعة")
    }
}

/// زر مواقيت الصلاة في مركز التحكم
@available(iOS 18.0, *)
struct PrayerTimesControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "PrayerTimesControl") {
            ControlWidgetButton(action: OpenPrayerTimesIntent()) {
                Label("مواقيت الصلاة", systemImage: "clock.fill")
            }
        }
        .displayName("مواقيت الصلاة")
        .description("فتح مواقيت الصلاة بسرعة")
    }
}

/// زر اتجاه القبلة في مركز التحكم
@available(iOS 18.0, *)
struct QiblaControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "QiblaControl") {
            ControlWidgetButton(action: OpenQiblaIntent()) {
                Label("اتجاه القبلة", systemImage: "location.north.fill")
            }
        }
        .displayName("اتجاه القبلة")
        .description("فتح اتجاه القبلة بسرعة")
    }
}

/// زر التسبيح في مركز التحكم
@available(iOS 18.0, *)
struct TasbihControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "TasbihControl") {
            ControlWidgetButton(action: OpenTasbihIntent()) {
                Label("التسبيح", systemImage: "hand.raised.fill")
            }
        }
        .displayName("التسبيح")
        .description("فتح المسبحة الإلكترونية بسرعة")
    }
}

/// زر أذكار النوم في مركز التحكم
@available(iOS 18.0, *)
struct SleepAzkarControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "SleepAzkarControl") {
            ControlWidgetButton(action: OpenSleepAzkarIntent()) {
                Label("أذكار النوم", systemImage: "bed.double.fill")
            }
        }
        .displayName("أذكار النوم")
        .description("فتح أذكار النوم بسرعة")
    }
}

/// زر أذكار الاستيقاظ في مركز التحكم
@available(iOS 18.0, *)
struct WakeupAzkarControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "WakeupAzkarControl") {
            ControlWidgetButton(action: OpenWakeupAzkarIntent()) {
                Label("أذكار الاستيقاظ", systemImage: "sunrise.fill")
            }
        }
        .displayName("أذكار الاستيقاظ")
        .description("فتح أذكار الاستيقاظ من النوم بسرعة")
    }
}

/// زر أذكار بعد الصلاة في مركز التحكم
@available(iOS 18.0, *)
struct AfterPrayerAzkarControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "AfterPrayerAzkarControl") {
            ControlWidgetButton(action: OpenAfterPrayerAzkarIntent()) {
                Label("أذكار بعد الصلاة", systemImage: "sparkles")
            }
        }
        .displayName("أذكار بعد الصلاة")
        .description("فتح الأذكار بعد السلام من الصلاة بسرعة")
    }
}

/// زر القرآن الكريم في مركز التحكم
@available(iOS 18.0, *)
struct HolyQuranControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "HolyQuranControl") {
            ControlWidgetButton(action: OpenHolyQuranIntent()) {
                Label("القرآن الكريم", systemImage: "book.fill")
            }
        }
        .displayName("القرآن الكريم")
        .description("فتح المصحف الشريف بسرعة")
    }
}

/// زر إشارات المصحف في مركز التحكم
@available(iOS 18.0, *)
struct QuranBookmarksControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "QuranBookmarksControl") {
            ControlWidgetButton(action: OpenQuranBookmarksIntent()) {
                Label("الإشارات المرجعية", systemImage: "bookmark.fill")
            }
        }
        .displayName("إشارات المصحف")
        .description("فتح إشارات المصحف المحفوظة بسرعة")
    }
}

/// زر أذكار متنوعة في مركز التحكم
@available(iOS 18.0, *)
struct MoreAzkarControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "MoreAzkarControl") {
            ControlWidgetButton(action: OpenMoreAzkarIntent()) {
                Label("أذكار متنوعة", systemImage: "text.book.closed")
            }
        }
        .displayName("أذكار متنوعة")
        .description("فتح صفحة الأذكار المتنوعة بسرعة")
    }
}
