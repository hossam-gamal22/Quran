// widgets/ios/PrayerLiveActivity.swift
// الأنشطة الحالية لمواقيت الصلاة — iOS 16.1+ ActivityKit
// Live Activity + Dynamic Island for prayer times

import ActivityKit
import WidgetKit
import SwiftUI

// PrayerActivityAttributes is defined in SharedActivityAttributes.swift
// It is compiled into both the main app and widget extension targets

// ========================================
// عرض الأنشطة الحالية — Lock Screen + Dynamic Island
// ========================================

struct PrayerLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: PrayerActivityAttributes.self) { context in
            // Lock Screen / Notification Center banner
            LockScreenView(state: context.state)
                .activityBackgroundTint(Color(hex: "#081827"))
                .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded view regions
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(context.state.nextPrayerNameAr)
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.white)
                        Text(context.state.nextPrayerTime)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(Color(hex: "#0f987f"))
                    }
                    .padding(.leading, 4)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 2) {
                        Text(timerInterval: Date()...context.state.nextPrayerDate, countsDown: true)
                            .font(.system(size: 16, weight: .bold, design: .monospaced))
                            .foregroundColor(.white)
                            .multilineTextAlignment(.trailing)
                            .monospacedDigit()
                        Text("متبقي")
                            .font(.system(size: 11))
                            .foregroundColor(.gray)
                    }
                    .padding(.trailing, 4)
                }
                DynamicIslandExpandedRegion(.center) {
                    // Empty — leading/trailing already handle it
                }
                DynamicIslandExpandedRegion(.bottom) {
                    ExpandedBottomView(state: context.state)
                }
            } compactLeading: {
                // Compact leading — prayer (hands) icon + prayer name
                HStack(spacing: 3) {
                    Image(systemName: "moon.stars.fill")
                        .font(.system(size: 11))
                        .foregroundColor(Color(hex: "#0f987f"))
                    Text(context.state.nextPrayerNameAr)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.white)
                        .lineLimit(1)
                        .minimumScaleFactor(0.6)
                        .fixedSize(horizontal: true, vertical: false)
                }
            } compactTrailing: {
                // Compact trailing — live countdown timer
                Text(timerInterval: Date()...context.state.nextPrayerDate, countsDown: true)
                    .font(.system(size: 12, weight: .bold, design: .monospaced))
                    .foregroundColor(Color(hex: "#0f987f"))
                    .multilineTextAlignment(.trailing)
                    .monospacedDigit()
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                    .frame(maxWidth: 56, alignment: .trailing)
            } minimal: {
                // Minimal view — Islamic crescent icon
                Image(systemName: "moon.stars.fill")
                    .font(.system(size: 13))
                    .foregroundColor(Color(hex: "#0f987f"))
            }
        }
    }
}

// ========================================
// Lock Screen Banner View
// ========================================

struct LockScreenView: View {
    let state: PrayerActivityAttributes.ContentState

    var body: some View {
        VStack(spacing: 8) {
            // Header row: app name + hijri date
            HStack {
                Text("🕌 روح المسلم")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.gray)
                Spacer()
                Text(state.hijriDate)
                    .font(.system(size: 11))
                    .foregroundColor(.gray)
            }

            // Main row: next prayer + countdown
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(state.nextPrayerNameAr)
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(.white)
                    Text(state.nextPrayerTime)
                        .font(.system(size: 15, weight: .medium))
                        .foregroundColor(Color(hex: "#0f987f"))
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text(timerInterval: Date()...state.nextPrayerDate, countsDown: true)
                        .font(.system(size: 28, weight: .bold, design: .monospaced))
                        .foregroundColor(.white)
                        .multilineTextAlignment(.trailing)
                        .monospacedDigit()
                    Text("متبقي")
                        .font(.system(size: 11))
                        .foregroundColor(.gray)
                }
            }

            // Optional: dua or ayah text
            if let duaText = state.duaText, state.style == "prayer_with_dua" {
                Text(duaText)
                    .font(.system(size: 14))
                    .foregroundColor(.white.opacity(0.9))
                    .lineLimit(4)
                    .multilineTextAlignment(.trailing)
                    .fixedSize(horizontal: false, vertical: true)
                    .frame(maxWidth: .infinity, alignment: .trailing)
                    .padding(.top, 6)
            }

            if let ayahText = state.ayahText, state.style == "prayer_with_ayah" {
                VStack(alignment: .trailing, spacing: 2) {
                    Text(ayahText)
                        .font(.system(size: 14))
                        .foregroundColor(.white.opacity(0.9))
                        .lineLimit(4)
                        .multilineTextAlignment(.trailing)
                        .fixedSize(horizontal: false, vertical: true)
                    if let ref = state.ayahRef {
                        Text(ref)
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(Color(hex: "#0f987f"))
                    }
                }
                .frame(maxWidth: .infinity, alignment: .trailing)
                .padding(.top, 6)
            }

            // Prayer times strip (compact)
            if state.style == "prayer_times" || state.style == "prayer_times_sunrise" {
                HStack(spacing: 0) {
                    ForEach(filteredPrayers, id: \.name) { prayer in
                        VStack(spacing: 2) {
                            Text(prayer.nameAr)
                                .font(.system(size: 9, weight: prayer.passed ? .regular : .semibold))
                                .foregroundColor(nextPrayerName == prayer.name ? Color(hex: "#0f987f") : (prayer.passed ? .gray : .white))
                            Text(prayer.time)
                                .font(.system(size: 10, weight: .medium, design: .monospaced))
                                .foregroundColor(nextPrayerName == prayer.name ? Color(hex: "#0f987f") : (prayer.passed ? .gray : .white.opacity(0.8)))
                        }
                        .frame(maxWidth: .infinity)
                    }
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .environment(\.layoutDirection, .rightToLeft)
    }

    private var filteredPrayers: [PrayerActivityAttributes.PrayerItem] {
        if state.style == "prayer_times_sunrise" {
            return state.allPrayers
        }
        // Filter out sunrise for non-sunrise styles
        return state.allPrayers.filter { $0.name.lowercased() != "sunrise" }
    }

    private var nextPrayerName: String {
        state.allPrayers.first(where: { !$0.passed })?.name ?? ""
    }
}

// ========================================
// Dynamic Island Expanded Bottom View
// ========================================

struct ExpandedBottomView: View {
    let state: PrayerActivityAttributes.ContentState

    var body: some View {
        HStack(spacing: 0) {
            ForEach(state.allPrayers.filter { $0.name.lowercased() != "sunrise" }, id: \.name) { prayer in
                VStack(spacing: 2) {
                    Circle()
                        .fill(prayer.passed ? .gray : (prayer.name == nextPrayerName ? Color(hex: "#0f987f") : .white.opacity(0.5)))
                        .frame(width: 6, height: 6)
                    Text(prayer.nameAr)
                        .font(.system(size: 8))
                        .foregroundColor(prayer.passed ? .gray : .white)
                    Text(prayer.time)
                        .font(.system(size: 8, design: .monospaced))
                        .foregroundColor(prayer.passed ? .gray : .white.opacity(0.8))
                }
                .frame(maxWidth: .infinity)
            }
        }
        .padding(.horizontal, 4)
        .padding(.bottom, 4)
    }

    private var nextPrayerName: String {
        state.allPrayers.first(where: { !$0.passed })?.name ?? ""
    }
}

// ========================================
// Helper: format remaining minutes
// ========================================

func formatRemaining(_ minutes: Int) -> String {
    let h = minutes / 60
    let m = minutes % 60
    if h > 0 {
        return String(format: "%d:%02d", h, m)
    }
    return String(format: "0:%02d", m)
}
