// BundledDailyAyahs.swift
//
// Self-contained copy of the same 7-verse rotation `data/daily-ayahs.ts`
// ships in the React Native app. Bundling it inside the widget extension
// means the verse widget can render today's correct ayah even if:
//   • the user hasn't opened the app for a year
//   • the device is offline (no API access)
//   • the App Group shared data is empty (fresh install + widget added
//     before first launch)
//
// Selection algorithm matches `app/daily-ayah.tsx`:
//     DAILY_AYAHS[dayOfYear % DAILY_AYAHS.length]
//
// Admin overrides (from `daily_content_overrides` Firestore collection)
// still take priority — they're delivered through `SharedWidgetData.verse`
// and `BundledDailyAyahs.verseFor(date:override:)` returns the override
// when present.

import Foundation

struct BundledDailyAyah {
    let arabic: String
    let ref: String
    let translation: String
    let surah: Int
    let ayah: Int
}

enum BundledDailyAyahs {
    /// Source of truth for the widget's daily rotation. Must stay in sync
    /// with `data/daily-ayahs.ts` in the RN app — if a verse is added /
    /// removed in JS, mirror the change here so the in-app screen and the
    /// home-screen widget show the same ayah on the same day.
    static let all: [BundledDailyAyah] = [
        BundledDailyAyah(arabic: "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا", ref: "الشرح ٥",
                         translation: "For indeed, with hardship will be ease.", surah: 94, ayah: 5),
        BundledDailyAyah(arabic: "وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ", ref: "الطلاق ٣",
                         translation: "And whoever relies upon Allah - then He is sufficient for him.", surah: 65, ayah: 3),
        BundledDailyAyah(arabic: "إِنَّ اللَّهَ مَعَ الصَّابِرِينَ", ref: "البقرة ١٥٣",
                         translation: "Indeed, Allah is with the patient.", surah: 2, ayah: 153),
        BundledDailyAyah(arabic: "وَهُوَ مَعَكُمْ أَيْنَ مَا كُنتُمْ", ref: "الحديد ٤",
                         translation: "And He is with you wherever you are.", surah: 57, ayah: 4),
        BundledDailyAyah(arabic: "فَاذْكُرُونِي أَذْكُرْكُمْ", ref: "البقرة ١٥٢",
                         translation: "So remember Me; I will remember you.", surah: 2, ayah: 152),
        BundledDailyAyah(arabic: "وَاللَّهُ يُحِبُّ الْمُحْسِنِينَ", ref: "آل عمران ١٣٤",
                         translation: "And Allah loves the doers of good.", surah: 3, ayah: 134),
        BundledDailyAyah(arabic: "إِنَّ اللَّهَ لَا يُضِيعُ أَجْرَ الْمُحْسِنِينَ", ref: "التوبة ١٢٠",
                         translation: "Indeed, Allah does not allow to be lost the reward of the doers of good.", surah: 9, ayah: 120),
    ]

    /// Today's ayah by day-of-year, mirroring `app/daily-ayah.tsx` line 206.
    /// Same input date → same ayah, so the widget and the in-app screen
    /// always agree without needing the app to have been opened today.
    static func todaysAyah(for date: Date = Date()) -> BundledDailyAyah {
        let cal = Calendar.current
        let dayOfYear = cal.ordinality(of: .day, in: .year, for: date) ?? 1
        let idx = ((dayOfYear - 1) % all.count + all.count) % all.count
        return all[idx]
    }

    /// Returns the admin-overridden verse if `data.verse` carries one
    /// (detected by the absence of bundled-equivalent surah/ayah pair),
    /// otherwise the bundled rotation entry for `date`. This lets the app
    /// publish an admin override via `data.verse` while the widget still
    /// computes its own daily rotation when no override is active.
    static func resolve(date: Date, override: VerseWidgetData?) -> (arabic: String, ref: String, translation: String, surah: Int, ayah: Int) {
        // Override takes precedence — admin published a specific verse.
        if let ov = override, let arabic = ov.arabic, !arabic.isEmpty {
            return (
                arabic: arabic,
                ref: ov.surahName ?? "",
                translation: ov.translation ?? "",
                surah: 0,
                ayah: ov.numberInSurah ?? ov.ayahNumber ?? 0
            )
        }
        let ayah = todaysAyah(for: date)
        return (ayah.arabic, ayah.ref, ayah.translation, ayah.surah, ayah.ayah)
    }
}
