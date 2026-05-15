// PrayerStaticOverlay.swift
//
// The render layer for the five iOS Home Screen prayer widgets in the new
// Glassify-style architecture:
//
//   • Full-bleed per-state PNG (card + labels + prayer names + icons +
//     watermark + active-row highlight + active prayer name) loaded from
//     widgets/ios/Assets.xcassets/PrayerStatic/.
//   • Numeric-only `Text` overlays positioned by GeometryReader at relative
//     anchors. NO Arabic text, NO labels, NO `VStack`/`HStack` for the visible
//     card.
//
// Data source: PrayerCalculator (offline adhan-swift inside the extension).
// State resolution: which PNG to load is derived from the active prayer key
// (and previous-prayer key for the next/previous widget) at the entry's
// `now` date.
//
// Naming: `<widgetId>_<size>_<theme>_<lang>_<state>` — e.g.
//   prayerSingle_small_dark_ar_fajr
//   prayerTable_medium_olive_en_dhuhr
//   prayerNextPrevious_medium_blue_ar_isha_fajr
//
// If the expected asset is missing, the caller falls back to the existing
// native SwiftUI prayer views (PrayerSingleView / PrayerTableView /
// PrayerNextPreviousView) — the user never sees a broken layout.

import SwiftUI
import WidgetKit

// MARK: - Anchor map

enum NumericRole {
    case clockTime         // formatted as "H:mm" or "h:mm a"
    case countdown         // SwiftUI `Text(date, style: .timer)`
}

struct PrayerNumericAnchor: Identifiable {
    let id: String
    let role: NumericRole
    let relX: CGFloat           // 0–1, center x relative to widget width
    let relY: CGFloat           // 0–1, center y relative to widget height
    let relativeWidth: CGFloat  // 0–1, max box width
    let fontScale: CGFloat      // final font = geo.width * fontScale
    let fontFamily: String
    let alignment: Alignment
    /// Which prayer key this anchor binds to (clockTime) or which boundary
    /// (countdown) is being rendered. nil for the hero/active anchor that
    /// reflects the state's primary prayer.
    let prayerKey: PrayerKey?

    init(id: String,
                role: NumericRole,
                relX: CGFloat,
                relY: CGFloat,
                relativeWidth: CGFloat,
                fontScale: CGFloat,
                fontFamily: String = "Rubik-Medium",
                alignment: Alignment = .center,
                prayerKey: PrayerKey? = nil) {
        self.id = id
        self.role = role
        self.relX = relX
        self.relY = relY
        self.relativeWidth = relativeWidth
        self.fontScale = fontScale
        self.fontFamily = fontFamily
        self.alignment = alignment
        self.prayerKey = prayerKey
    }
}

enum PrayerAnchorMap {
    static func anchors(widgetId: String, family: WidgetFamily) -> [PrayerNumericAnchor] {
        switch widgetId {
        case "prayerSingle":
            return prayerSingleSmallAnchors
        case "prayerTable":
            switch family {
            case .systemMedium: return prayerTableMediumAnchors
            case .systemLarge:  return prayerTableLargeAnchors
            default:            return prayerTableSmallAnchors
            }
        case "prayerNextPrevious":
            return prayerNextPreviousMediumAnchors
        default:
            return []
        }
    }

    // The anchor coordinates below are starting estimates derived from the
    // intended design (in-app gallery preview). They MUST be re-measured by
    // opening one baked PNG per kind in Preview/Sketch and noting the centre
    // of each transparent placeholder rectangle / dividing by image
    // dimensions. The numbers compile and produce a reasonable layout
    // immediately, but visual fidelity depends on tuning to the actual bake.

    static let prayerSingleSmallAnchors: [PrayerNumericAnchor] = [
        .init(id: "nextTime",  role: .clockTime, relX: 0.50, relY: 0.56, relativeWidth: 0.86, fontScale: 0.18,  fontFamily: "Rubik-Bold"),
        .init(id: "countdown", role: .countdown, relX: 0.50, relY: 0.84, relativeWidth: 0.72, fontScale: 0.072, fontFamily: "Rubik-Medium"),
    ]

    static let prayerTableSmallAnchors: [PrayerNumericAnchor] = [
        .init(id: "activeTime", role: .clockTime, relX: 0.50, relY: 0.50, relativeWidth: 0.86, fontScale: 0.15, fontFamily: "Rubik-Bold"),
        .init(id: "countdown",  role: .countdown, relX: 0.50, relY: 0.82, relativeWidth: 0.72, fontScale: 0.07, fontFamily: "Rubik-Medium"),
    ]

    /// Schedule row anchors used by prayerTable medium/large. Relative-y
    /// values are placeholders; tune from the baked PNG.
    private static let scheduleAnchorsMedium: [PrayerNumericAnchor] = {
        let ys: [(PrayerKey, CGFloat)] = [
            (.fajr,    0.20),
            (.sunrise, 0.32),
            (.dhuhr,   0.44),
            (.asr,     0.56),
            (.maghrib, 0.68),
            (.isha,    0.80),
        ]
        return ys.map { (key, y) in
            PrayerNumericAnchor(
                id: "\(key.rawValue)Time",
                role: .clockTime,
                relX: 0.18, relY: y,
                relativeWidth: 0.22, fontScale: 0.048,
                fontFamily: "Rubik-Medium",
                alignment: .leading,
                prayerKey: key
            )
        }
    }()

    static let prayerTableMediumAnchors: [PrayerNumericAnchor] = {
        var a = scheduleAnchorsMedium
        a.append(.init(id: "activeTime", role: .clockTime, relX: 0.78, relY: 0.50, relativeWidth: 0.32, fontScale: 0.115, fontFamily: "Rubik-Bold",   alignment: .trailing))
        a.append(.init(id: "countdown",  role: .countdown, relX: 0.78, relY: 0.80, relativeWidth: 0.28, fontScale: 0.045, fontFamily: "Rubik-Medium", alignment: .trailing))
        return a
    }()

    static let prayerTableLargeAnchors: [PrayerNumericAnchor] = {
        let ys: [(PrayerKey, CGFloat)] = [
            (.fajr,    0.22),
            (.sunrise, 0.32),
            (.dhuhr,   0.42),
            (.asr,     0.52),
            (.maghrib, 0.62),
            (.isha,    0.72),
        ]
        var a: [PrayerNumericAnchor] = ys.map { (key, y) in
            PrayerNumericAnchor(
                id: "\(key.rawValue)Time",
                role: .clockTime,
                relX: 0.18, relY: y,
                relativeWidth: 0.22, fontScale: 0.038,
                fontFamily: "Rubik-Medium",
                alignment: .leading,
                prayerKey: key
            )
        }
        a.append(.init(id: "activeTime", role: .clockTime, relX: 0.78, relY: 0.50, relativeWidth: 0.32, fontScale: 0.085, fontFamily: "Rubik-Bold",   alignment: .trailing))
        a.append(.init(id: "countdown",  role: .countdown, relX: 0.78, relY: 0.78, relativeWidth: 0.28, fontScale: 0.035, fontFamily: "Rubik-Medium", alignment: .trailing))
        return a
    }()

    static let prayerNextPreviousMediumAnchors: [PrayerNumericAnchor] = [
        // Previous side (left half)
        .init(id: "prevTime",   role: .clockTime, relX: 0.27, relY: 0.55, relativeWidth: 0.22, fontScale: 0.085, fontFamily: "Rubik-Bold"),
        .init(id: "sinceValue", role: .countdown, relX: 0.27, relY: 0.83, relativeWidth: 0.30, fontScale: 0.045, fontFamily: "Rubik-Medium"),
        // Next side (right half)
        .init(id: "nextTime",   role: .clockTime, relX: 0.73, relY: 0.55, relativeWidth: 0.22, fontScale: 0.085, fontFamily: "Rubik-Bold"),
        .init(id: "untilValue", role: .countdown, relX: 0.73, relY: 0.83, relativeWidth: 0.30, fontScale: 0.045, fontFamily: "Rubik-Medium"),
    ]
}

// MARK: - Asset resolution

enum PrayerAssetResolver {
    /// Construct the Asset Catalog name for a given (kind, size, theme, lang,
    /// state). The bake script writes one .imageset per combination — if the
    /// asset isn't found, the caller falls back to the existing native views.
    static func assetName(widgetId: String,
                                 family: WidgetFamily,
                                 theme: RoohTheme,
                                 language: String,
                                 active: PrayerKey,
                                 previous: PrayerKey? = nil) -> String {
        let size = sizeToken(family)
        let themeKey = resolvedThemeString(theme)
        let langKey = (language == "ar" || language == "ar-EG") ? "ar" : "en"
        switch widgetId {
        case "prayerSingle", "prayerTable":
            return "\(widgetId)_\(size)_\(themeKey)_\(langKey)_\(active.rawValue)"
        case "prayerNextPrevious":
            let prev = previous ?? defaultPrevious(for: active)
            return "\(widgetId)_\(size)_\(themeKey)_\(langKey)_\(prev.rawValue)_\(active.rawValue)"
        default:
            return ""
        }
    }

    static func setupNeededAssetName(theme: RoohTheme, language: String) -> String {
        let themeKey = resolvedThemeString(theme)
        let langKey = (language == "ar" || language == "ar-EG") ? "ar" : "en"
        return "prayer_setup_\(themeKey)_\(langKey)"
    }

    private static func sizeToken(_ family: WidgetFamily) -> String {
        switch family {
        case .systemSmall:  return "small"
        case .systemMedium: return "medium"
        case .systemLarge:  return "large"
        default:            return "small"
        }
    }

    /// Sequential previous prayer for the next-prev widget.
    static func defaultPrevious(for active: PrayerKey) -> PrayerKey {
        switch active {
        case .fajr:    return .isha
        case .sunrise: return .fajr
        case .dhuhr:   return .sunrise
        case .asr:     return .dhuhr
        case .maghrib: return .asr
        case .isha:    return .maghrib
        }
    }
}

// MARK: - The view

struct PrayerStaticOverlay: View {
    let widgetId: String       // "prayerSingle" | "prayerTable" | "prayerNextPrevious"
    let family: WidgetFamily
    let theme: RoohTheme
    let language: String       // "ar" | "en"
    let usesArabicNumerals: Bool
    let uses24HourClock: Bool
    /// Calculator providing today's prayer times.
    let calculator: PrayerCalculator
    let now: Date

    init(widgetId: String,
                family: WidgetFamily,
                theme: RoohTheme,
                language: String,
                usesArabicNumerals: Bool,
                uses24HourClock: Bool,
                calculator: PrayerCalculator,
                now: Date) {
        self.widgetId = widgetId
        self.family = family
        self.theme = theme
        self.language = language
        self.usesArabicNumerals = usesArabicNumerals
        self.uses24HourClock = uses24HourClock
        self.calculator = calculator
        self.now = now
    }

    var body: some View {
        let pal = palette(theme)
        let state = calculator.state(at: now)
        let today = calculator.times(for: now)
        let primary = state?.previous ?? .fajr  // active = recently-passed prayer
        let previous = state?.previous ?? .isha
        let assetName = PrayerAssetResolver.assetName(
            widgetId: widgetId,
            family: family,
            theme: theme,
            language: language,
            active: primary,
            previous: previous
        )

        GeometryReader { geo in
            ZStack {
                if let ui = UIImage(named: assetName) {
                    Image(uiImage: ui)
                        .resizable()
                        .interpolation(.high)
                        .frame(width: geo.size.width, height: geo.size.height)
                        .clipped()
                } else {
                    // Asset missing for this state — graceful fallback signal.
                    // RoohWidgets.swift routing checks `UIImage(named:) == nil`
                    // and renders the existing native SwiftUI prayer view
                    // instead of this overlay. So in practice we never reach
                    // this branch when the bake has produced this asset name,
                    // but we ensure the screen is never blank: paint the
                    // theme background so iOS 17+ container shows nothing
                    // weird if WidgetKit somehow renders this view.
                    pal.background
                        .frame(width: geo.size.width, height: geo.size.height)
                }

                if UIImage(named: assetName) != nil, let state = state, let today = today {
                    ForEach(PrayerAnchorMap.anchors(widgetId: widgetId, family: family)) { a in
                        anchorView(a, state: state, today: today, pal: pal, geo: geo)
                    }
                }
            }
            .frame(width: geo.size.width, height: geo.size.height)
        }
        .containerBackground(for: .widget) { pal.background }
    }

    @ViewBuilder
    private func anchorView(_ a: PrayerNumericAnchor,
                            state: PrayerCalculatorState,
                            today: DayPrayerTimes,
                            pal: ThemePalette,
                            geo: GeometryProxy) -> some View {
        let font = Font.custom(a.fontFamily, fixedSize: geo.size.width * a.fontScale)
        Group {
            switch a.role {
            case .clockTime:
                Text(clockText(for: a, state: state, today: today))
            case .countdown:
                Text(countdownDate(for: a, state: state), style: .timer)
            }
        }
        .font(font)
        .monospacedDigit()
        .lineLimit(1)
        .minimumScaleFactor(0.85)
        .foregroundStyle(pal.text)
        .frame(width: geo.size.width * a.relativeWidth, alignment: a.alignment)
        .position(x: geo.size.width * a.relX, y: geo.size.height * a.relY)
        .environment(\.layoutDirection, .leftToRight)
        .environment(\.locale, usesArabicNumerals ? Locale(identifier: "ar_EG") : Locale(identifier: "en_US_POSIX"))
    }

    // MARK: - Anchor → value resolution

    private func clockText(for anchor: PrayerNumericAnchor,
                           state: PrayerCalculatorState,
                           today: DayPrayerTimes) -> String {
        let date: Date
        switch anchor.id {
        case "activeTime", "nextTime":
            // The "active hero" for prayerSingle/prayerTable shows the NEXT
            // prayer's time. For prayerNextPrevious, "nextTime" shows the
            // upcoming prayer's time.
            date = state.nextAt
        case "prevTime":
            date = state.previousAt
        default:
            if let key = anchor.prayerKey {
                date = today[key]
            } else {
                date = state.nextAt
            }
        }
        return formatClock(date)
    }

    private func countdownDate(for anchor: PrayerNumericAnchor,
                               state: PrayerCalculatorState) -> Date {
        switch anchor.id {
        case "sinceValue":
            // "since previous prayer" — count up from previousAt. SwiftUI's
            // .timer style can render absolute time deltas naturally.
            return state.previousAt
        case "countdown", "untilValue":
            return state.nextAt
        default:
            return state.nextAt
        }
    }

    private func formatClock(_ date: Date) -> String {
        let fmt = DateFormatter()
        fmt.timeZone = calculator.inputs.resolvedTimeZone
        // Always western digits in the formatted output — the
        // environment(\.locale, ar_EG) modifier above re-maps to Arabic-Indic
        // numerals at draw time if the user prefers them, but the raw
        // formatted string stays in en_US_POSIX so the colon and digit
        // sequence is bidi-stable.
        fmt.locale = Locale(identifier: "en_US_POSIX")
        fmt.dateFormat = uses24HourClock ? "H:mm" : "h:mm a"
        return fmt.string(from: date)
    }
}
