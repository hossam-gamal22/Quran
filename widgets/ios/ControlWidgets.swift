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
