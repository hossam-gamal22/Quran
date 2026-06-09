// widgets/ios/CuratedWidgetImages.swift
// Bundled, Arabic-only curated image widgets (verseOfDay / azkarMorning /
// azkarEvening / dailyDhikr).
//
// The owner ships single-colour transparent PNGs (assets/widget-images/*),
// which scripts/generate-curated-widget-images.mjs syncs into Assets.xcassets
// as template imagesets. We draw the themed background and tint the image to
// the theme's text colour, so all appearance settings keep working. The image
// is picked purely from the date/time, so the widget rotates with no network
// and without the app ever being opened.
//
// The selection formulas below mirror lib/widgets/curated-images.ts 1:1 so iOS
// and Android always pick the same image for the same moment.

import SwiftUI
import WidgetKit

/// Widgets with no English version (curated image widgets + calligraphic
/// day/month-thuluth). Mirrors `forcedLanguage: 'ar'` in lib/widgets/registry.ts.
func isArabicOnlyWidget(_ id: String) -> Bool {
    switch id {
    case "verseOfDay", "azkarMorning", "azkarEvening", "dailyDhikr", "dayThuluth", "monthThuluth":
        return true
    default:
        return false
    }
}

/// Widgets rendered from bundled curated images.
func isCuratedImageWidget(_ id: String) -> Bool {
    switch id {
    case "verseOfDay", "azkarMorning", "azkarEvening", "dailyDhikr":
        return true
    default:
        return false
    }
}

/// 1-based day of year (local). Matches curated-images.ts dayOfYear.
private func curatedDayOfYear(_ date: Date) -> Int {
    Calendar.current.ordinality(of: .day, in: .year, for: date) ?? 1
}

/// 5-minute slot of the day. Azkar walk the set in order, one new dhikr every 5
/// minutes. Matches curated-images.ts fiveMinuteSlot.
private func curatedFiveMinuteSlot(_ date: Date) -> Int {
    let comps = Calendar.current.dateComponents([.hour, .minute], from: date)
    return ((comps.hour ?? 0) * 60 + (comps.minute ?? 0)) / 5
}

/// Hajj-day verse override: 1st/2nd of Dhul-Hijjah (month 12) always show the
/// two Hajj verses (verse-080 / verse-081). Mirrors VERSE_HIJRI_OVERRIDES.
private func hajjVerseOverrideIndex(_ date: Date, offset: Int?) -> Int? {
    let cal = Calendar(identifier: .islamicUmmAlQura)
    let hijriDate = applyHijriOffset(date, offset: offset)
    let month = cal.component(.month, from: hijriDate)
    let day = cal.component(.day, from: hijriDate)
    guard month == 12 else { return nil }
    if day == 1 { return 79 } // verse-080
    if day == 2 { return 80 } // verse-081
    return nil
}

/// Asset name (e.g. "verse-001") for a curated widget at a given moment, or nil
/// when the type has no images.
func curatedImageName(widgetId: String, date: Date, hijriOffset: Int? = nil) -> String? {
    let doy = curatedDayOfYear(date)
    func pick(_ prefix: String, _ count: Int, _ idx: Int) -> String? {
        guard count > 0 else { return nil }
        let i = ((idx % count) + count) % count
        return String(format: "%@-%03d", prefix, i + 1)
    }
    switch widgetId {
    case "verseOfDay":
        let count = GeneratedCuratedImages.verseCount
        if let override = hajjVerseOverrideIndex(date, offset: hijriOffset), override < count {
            return String(format: "verse-%03d", override + 1)
        }
        return pick("verse", count, doy - 1)
    case "dailyDhikr":
        return pick("daily", GeneratedCuratedImages.dailyCount, doy - 1 + 137)
    case "azkarMorning":
        return pick("morning", GeneratedCuratedImages.morningCount, curatedFiveMinuteSlot(date))
    case "azkarEvening":
        return pick("evening", GeneratedCuratedImages.eveningCount, curatedFiveMinuteSlot(date))
    default:
        return nil
    }
}

/// Themed background + tinted curated image.
struct CuratedImageView: View {
    let widgetId: String
    let family: WidgetFamily
    let context: WidgetContext
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        let resolved = resolvedRoohTheme(context.theme, colorScheme: colorScheme)
        let pal = palette(resolved)
        // Unified per-theme ink — gold on olive/desert, white on
        // dark/green/blue/slate, black on light/auto. Mirrors WidgetPalette.ink.
        let tint = pal.ink

        ZStack {
            pal.background
            if let name = curatedImageName(widgetId: widgetId, date: context.date, hijriOffset: context.data.hijriOffset),
               let ui = UIImage(named: name) {
                // Authored at the widget's aspect ratio → fill edge-to-edge so
                // the design renders at 100% (content margins are disabled).
                Image(uiImage: ui)
                    .renderingMode(.template)
                    .resizable()
                    .scaledToFill()
                    .foregroundColor(tint)
            }
        }
        .clipped()
    }
}

/// Shown on prayer widgets when no location is stored yet (PrayerInputs nil),
/// so the user never sees wrong/default prayer times. Mirrors Android's
/// LocationNeededWidget.
struct LocationNeededView: View {
    let family: WidgetFamily
    let context: WidgetContext
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        let resolved = resolvedRoohTheme(context.theme, colorScheme: colorScheme)
        let pal = palette(resolved)
        let radius: CGFloat = family == .systemSmall ? 28 : 32
        let isAr = context.isArabic
        let title = isAr ? "فعّل الموقع" : "Enable location"
        let subtitle = isAr
            ? "افتح التطبيق وفعّل الموقع لعرض مواقيت الصلاة الصحيحة"
            : "Open the app and enable location to show prayer times"

        ZStack {
            RoundedRectangle(cornerRadius: radius).fill(pal.background)
            VStack(spacing: 6) {
                Image(systemName: "location.slash")
                    .font(.system(size: 26))
                    .foregroundColor(pal.muted)
                Text(title)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(pal.text)
                Text(subtitle)
                    .font(.system(size: 11, weight: .medium))
                    .multilineTextAlignment(.center)
                    .foregroundColor(pal.muted)
            }
            .padding()
            .environment(\.layoutDirection, isAr ? .rightToLeft : .leftToRight)
        }
    }
}

/// English notice shown when a non-Arabic app language places an Arabic-only
/// widget. Same role as Android's ArabicOnlyWidget.
struct ArabicOnlyView: View {
    let family: WidgetFamily
    let context: WidgetContext
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        let resolved = resolvedRoohTheme(context.theme, colorScheme: colorScheme)
        let pal = palette(resolved)
        let radius: CGFloat = family == .systemSmall ? 28 : 32

        ZStack {
            RoundedRectangle(cornerRadius: radius).fill(pal.background)
            VStack(spacing: 6) {
                Image(systemName: "globe")
                    .font(.system(size: 26))
                    .foregroundColor(pal.muted)
                Text("Arabic only")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(pal.text)
                Text("Switch the app to Arabic to use this widget")
                    .font(.system(size: 11, weight: .medium))
                    .multilineTextAlignment(.center)
                    .foregroundColor(pal.muted)
            }
            .padding()
            .environment(\.layoutDirection, .leftToRight)
        }
    }
}
