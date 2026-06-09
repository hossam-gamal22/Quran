// widgets/ios/RitualPrayerViews.swift
// New "Ritual" prayer widget styles — pair, table, banner (medium 4×2)
// and compact, simple (small 2×2). Uses .ultraThinMaterial for real glass
// that adapts to the user's wallpaper automatically.

import SwiftUI
import WidgetKit

// MARK: - Helpers

private let ritualNonConnecting: Set<Character> = [
    "ا", "أ", "إ", "آ", "ٱ",
    "د", "ذ", "ر", "ز",
    "و", "ؤ", "ء", "ة", "ى"
]

/// Insert `level` tatweel chars between connectable Arabic letters. Mirrors lib/stretch-arabic.ts.
func ritualStretch(_ text: String, _ level: Int = 5) -> String {
    guard !text.isEmpty, level > 0 else { return text }
    let tatweels = String(repeating: "ـ", count: level)
    let chars = Array(text)
    var out = ""
    for i in 0..<chars.count {
        let ch = chars[i]
        out.append(ch)
        if i == chars.count - 1 { continue }
        if ritualNonConnecting.contains(ch) { continue }
        let next = chars[i + 1]
        let scalar = next.unicodeScalars.first?.value ?? 0
        let isArabicNext = (0x0600...0x06FF).contains(scalar) ||
                           (0xFB50...0xFDFF).contains(scalar) ||
                           (0xFE70...0xFEFF).contains(scalar)
        if !isArabicNext { continue }
        out.append(tatweels)
    }
    return out
}

private func ritualLabel(_ ar: String, isArabic: Bool) -> String {
    if isArabic { return ar }
    switch ar {
    case "الفجر": return "Fajr"
    case "الشروق": return "Sunrise"
    case "الظهر": return "Dhuhr"
    case "صلاة الجمعة": return "Jumuah"
    case "العصر": return "Asr"
    case "المغرب": return "Maghrib"
    case "العشاء": return "Isha"
    default: return ar
    }
}

private func ritualDefaultDhuhrArabic() -> String {
    Calendar(identifier: .gregorian).component(.weekday, from: Date()) == 6 ? "صلاة الجمعة" : "الظهر"
}

/// Force a Dhuhr row/name to «صلاة الجمعة» on Fridays, regardless of the
/// (possibly stale, app-written) name carried in the entry data. Mirrors the
/// Android headless Jumuah relabel so the prayer list reads Jumuah for ALL of
/// Friday — not only while Dhuhr is the next prayer.
private func ritualFridayName(_ ar: String, on date: Date) -> String {
    let isFriday = Calendar(identifier: .gregorian).component(.weekday, from: date) == 6
    if isFriday && (ar == "الظهر" || ar == "صلاة الجمعة") { return "صلاة الجمعة" }
    return ar
}

private func ritualGlyph(_ key: String) -> String {
    switch key.lowercased() {
    case let k where k.contains("fajr"): return "sunrise.fill"
    case let k where k.contains("sun") || k.contains("shuruq"): return "sun.max.fill"
    case let k where k.contains("dhuhr") || k.contains("zuhr"): return "sun.max.fill"
    case let k where k.contains("asr"): return "cloud.sun.fill"
    case let k where k.contains("maghrib"): return "sunset.fill"
    case let k where k.contains("isha"): return "moon.stars.fill"
    default: return "clock.fill"
    }
}

private func ritualCountdown(_ remaining: String, isArabic: Bool) -> String {
    let r = remaining.isEmpty ? "—" : remaining
    return isArabic ? "بعد \(r)" : "in \(r)"
}

// Background card matching the iOS glass look from the mockup.
private struct GlassCard<Content: View>: View {
    let radius: CGFloat
    let content: () -> Content
    init(radius: CGFloat = 28, @ViewBuilder _ content: @escaping () -> Content) {
        self.radius = radius
        self.content = content
    }
    var body: some View {
        content()
            .background(
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .fill(.ultraThinMaterial)
            )
            .overlay(
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .stroke(Color.white.opacity(0.18), lineWidth: 0.5)
            )
            .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
    }
}

// MARK: - Prayer Pair (4×2 Medium)

struct RitualPrayerPair: View {
    let entry: PrayerWidgetEntry
    private var isArabic: Bool { (entry.language ?? "ar") == "ar" }

    var body: some View {
        let arName = entry.data?.nextPrayerNameAr ?? ritualDefaultDhuhrArabic()
        let displayName = isArabic ? ritualStretch(arName, 5) : ritualLabel(arName, isArabic: false)
        let time = entry.data?.nextPrayerTime ?? "--:--"
        let countdown = ritualCountdown(entry.data?.timeRemaining ?? "", isArabic: isArabic)
        let glyph = ritualGlyph(entry.data?.nextPrayer ?? "")

        GlassCard {
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(time)
                        .font(.custom("DecoTypeThuluth2", size: 32))
                        .foregroundColor(.white)
                    Text(countdown)
                        .font(.custom("Rubik-Bold", size: 15))
                        .foregroundColor(.white.opacity(0.7))
                }
                Spacer()
                ZStack {
                    Circle().fill(Color.white.opacity(0.15))
                        .frame(width: 44, height: 44)
                    Image(systemName: glyph)
                        .font(.system(size: 20, weight: .regular))
                        .foregroundColor(.white)
                }
                Spacer()
                Text(displayName)
                    .font(.custom("DecoTypeThuluth2", size: 26))
                    .foregroundColor(.white)
                    .tracking(isArabic ? 0 : 4)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
            .padding(.horizontal, 22)
            .padding(.vertical, 16)
        }
    }
}

// MARK: - Prayer Table (4×2 Medium)

struct RitualPrayerTable: View {
    let entry: PrayerWidgetEntry
    private var isArabic: Bool { (entry.language ?? "ar") == "ar" }

    var body: some View {
        let order = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]
        let items = (entry.data?.allPrayers ?? [])
            .filter { order.contains($0.name) }
            .sorted { (order.firstIndex(of: $0.name) ?? 0) < (order.firstIndex(of: $1.name) ?? 0) }

        GlassCard {
            HStack(alignment: .center, spacing: 4) {
                ForEach(items) { p in
                    let arName = ritualFridayName(p.nameAr, on: entry.date)
                    VStack(spacing: 4) {
                        Text(isArabic ? arName : ritualLabel(arName, isArabic: false))
                            .font(.custom("DecoTypeThuluth2", size: 13))
                            .foregroundColor(p.isPassed ? .white.opacity(0.5) : .white)
                        Text(p.time)
                            .font(.custom("Rubik-Medium", size: 14))
                            .foregroundColor(p.isPassed ? .white.opacity(0.5) : .white.opacity(0.85))
                    }
                    .padding(.horizontal, 6)
                    .padding(.vertical, 6)
                    .frame(maxWidth: .infinity)
                    .background(
                        RoundedRectangle(cornerRadius: 14)
                            .fill(p.isNext ? Color.white.opacity(0.15) : Color.clear)
                    )
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 14)
        }
    }
}

// MARK: - Prayer Banner (4×2 Medium — two side-by-side cards)

struct RitualPrayerBanner: View {
    let entry: PrayerWidgetEntry
    private var isArabic: Bool { (entry.language ?? "ar") == "ar" }

    var body: some View {
        let upcoming = (entry.data?.allPrayers ?? []).filter { !$0.isPassed }
        let a = upcoming.first ?? entry.data?.allPrayers.first
        let b = upcoming.dropFirst().first ?? entry.data?.allPrayers.dropFirst().first

        HStack(spacing: 8) {
            bannerCard(item: a)
            bannerCard(item: b)
        }
    }

    @ViewBuilder
    private func bannerCard(item: PrayerTime?) -> some View {
        GlassCard {
            VStack(spacing: 6) {
                Text(item.map { isArabic ? $0.nameAr : ritualLabel($0.nameAr, isArabic: false) } ?? "—")
                    .font(.custom("DecoTypeThuluth2", size: 13))
                    .foregroundColor(.white.opacity(0.7))
                    .tracking(isArabic ? 0 : 2)
                Text(item?.time ?? "--:--")
                    .font(.custom("DecoTypeThuluth2", size: 30))
                    .foregroundColor(.white)
            }
            .padding(.vertical, 18)
            .padding(.horizontal, 12)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }
}

// MARK: - Prayer Compact (2×2 Small)

struct RitualPrayerCompact: View {
    let entry: PrayerWidgetEntry
    private var isArabic: Bool { (entry.language ?? "ar") == "ar" }

    var body: some View {
        let arName = entry.data?.nextPrayerNameAr ?? ritualDefaultDhuhrArabic()
        let name = isArabic ? ritualStretch(arName, 3) : ritualLabel(arName, isArabic: false)
        let time = entry.data?.nextPrayerTime ?? "--:--"
        let countdown = ritualCountdown(entry.data?.timeRemaining ?? "", isArabic: isArabic)

        GlassCard {
            VStack(spacing: 4) {
                Text(name)
                    .font(.custom("DecoTypeThuluth2", size: 16))
                    .foregroundColor(.white)
                    .tracking(isArabic ? 0 : 2)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                Text(time)
                    .font(.custom("DecoTypeThuluth2", size: 30))
                    .foregroundColor(.white)
                Text(countdown)
                    .font(.custom("Rubik-Bold", size: 14))
                    .foregroundColor(.white.opacity(0.7))
            }
            .padding(14)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }
}

// MARK: - Prayer Simple (2×2 Small)

struct RitualPrayerSimple: View {
    let entry: PrayerWidgetEntry
    private var isArabic: Bool { (entry.language ?? "ar") == "ar" }

    var body: some View {
        let arName = entry.data?.nextPrayerNameAr ?? ritualDefaultDhuhrArabic()
        let name = isArabic ? ritualStretch(arName, 5) : ritualLabel(arName, isArabic: false)
        let time = entry.data?.nextPrayerTime ?? "--:--"
        let countdown = ritualCountdown(entry.data?.timeRemaining ?? "", isArabic: isArabic)

        GlassCard {
            VStack(spacing: 4) {
                Text(time)
                    .font(.custom("DecoTypeThuluth2", size: 26))
                    .foregroundColor(.white)
                Text(name)
                    .font(.custom("DecoTypeThuluth2", size: 22))
                    .foregroundColor(.white)
                    .tracking(isArabic ? 0 : 3)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                Text(countdown)
                    .font(.custom("Rubik-Bold", size: 14))
                    .foregroundColor(.white.opacity(0.7))
            }
            .padding(14)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }
}

// MARK: - Prayer Serene (4×4 Large)
// Mirrors the SERENE mockup: a header glass card showing the next prayer
// (name, big time, countdown, glyph) followed by a glass list of all six
// prayers with the current row highlighted.

struct RitualPrayerSerene: View {
    let entry: PrayerWidgetEntry
    private var isArabic: Bool { (entry.language ?? "ar") == "ar" }

    private let order = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"]

    var body: some View {
        let arName = entry.data?.nextPrayerNameAr ?? ritualDefaultDhuhrArabic()
        let nextLabel = isArabic ? arName : ritualLabel(arName, isArabic: false)
        let nextTime = entry.data?.nextPrayerTime ?? "--:--"
        let countdown = ritualCountdown(entry.data?.timeRemaining ?? "", isArabic: isArabic)
        let nextHeadline = isArabic ? "الصلاة القادمة \(countdown)" : "Next Prayer \(countdown)"
        let glyph = ritualGlyph(entry.data?.nextPrayer ?? "")

        let items = (entry.data?.allPrayers ?? [])
            .filter { order.contains($0.name) }
            .sorted { (order.firstIndex(of: $0.name) ?? 0) < (order.firstIndex(of: $1.name) ?? 0) }

        VStack(spacing: 8) {
            // Header card
            GlassCard {
                HStack(alignment: .center) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(nextLabel)
                            .font(.custom("DecoTypeThuluth2", size: 14))
                            .foregroundColor(.white)
                        Text(nextTime)
                            .font(.custom("DecoTypeThuluth2", size: 30))
                            .foregroundColor(.white)
                        Text(nextHeadline)
                            .font(.custom("Rubik-Regular", size: 11))
                            .foregroundColor(.white.opacity(0.7))
                    }
                    Spacer()
                    Image(systemName: glyph)
                        .font(.system(size: 28, weight: .regular))
                        .foregroundColor(.white)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
            }

            // List card
            GlassCard {
                VStack(spacing: 1) {
                    ForEach(items) { p in
                        let arName = ritualFridayName(p.nameAr, on: entry.date)
                        HStack {
                            HStack(spacing: 8) {
                                Image(systemName: ritualGlyph(p.name))
                                    .font(.system(size: 12))
                                    .foregroundColor(p.isPassed && !p.isNext ? .white.opacity(0.4) : .white)
                                Text(isArabic ? arName : ritualLabel(arName, isArabic: false))
                                    .font(.custom("DecoTypeThuluth2", size: 14))
                                    .foregroundColor(p.isPassed && !p.isNext ? .white.opacity(0.4) : .white)
                                if !isArabic {
                                    Text(arName)
                                        .font(.custom("DecoTypeThuluth2", size: 11))
                                        .foregroundColor(p.isPassed && !p.isNext ? .white.opacity(0.4) : .white.opacity(0.7))
                                }
                            }
                            Spacer()
                            Text(p.time)
                                .font(.custom("Rubik-Medium", size: 13))
                                .foregroundColor(p.isPassed && !p.isNext ? .white.opacity(0.4) : .white.opacity(0.85))
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(
                            RoundedRectangle(cornerRadius: 14)
                                .fill(p.isNext ? Color.white.opacity(0.15) : Color.clear)
                        )
                    }
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 8)
            }
        }
        .padding(6)
    }
}
