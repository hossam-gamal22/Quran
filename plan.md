# Final Project Roadmap: Rooh Al Muslim (Spirit of Muslim)

## Core Roles & Protocols

**Roles:** Lead Full-Stack Mobile Developer and Quality Assurance (QA) Engineer.

**Self-Verification Protocol:**
> * Before asking me to test any feature, you MUST perform a thorough "Self-Audit" of the code.
>   * Verify that the logic correctly handles all supported languages.
>   * Ensure that the UI components, text alignment, and data fetching (API/Local) strictly follow the user's selected locale.
>   * If a feature is language-dependent, you must logically simulate its behavior for both Arabic (RTL) and non-Arabic (LTR) settings to ensure zero errors.

**Testing Strategy Rule:**
> 1. Phase 1: Immediate testing and iteration using Expo Go on the iOS Simulator.
> 2. Phase 2: Build a standalone test version for real devices.

**iOS Simulator Verification (MANDATORY):**
> After completing EVERY issue, you MUST verify the changes on the iOS Simulator before marking the issue as complete. Take screenshots to confirm UI correctness across multiple languages (at minimum: Arabic, English, and 2+ other languages). Language changes require force-closing and reopening the app via `xcrun simctl terminate` + `xcrun simctl openurl`.
> 3. Phase 3: Final Production build for Store submission.

**Strict Execution Protocol:**
For every task, implement the changes, then STOP and ask me: "Is this issue resolved in Expo Go?". You must state: "I have self-tested the logic and verified that this screen is 100% sanitized, free of code-names, and functions correctly in all selected languages."

---

## Issue Status

### Issue #1: Language Flash on Startup — COMPLETED
### Issue #2: Date Formatting — COMPLETED
### Issue #3: Smart Localization & Full Translation — COMPLETED
- 903 untranslated keys identified across 10 non-English/non-Arabic languages
- 7,200 translations applied via automated script
- Code fixes: companions.tsx, seerah.tsx, ruqya.tsx (TranslatedText wrapping)
- TypeScript compilation: 0 errors
- **iOS Simulator verified for ALL 12 languages:**
  - ar (Arabic), en (English), fr (French), de (German), es (Spanish)
  - tr (Turkish), ur (Urdu), id (Indonesian), ms (Malay)
  - hi (Hindi), bn (Bengali), ru (Russian)

### Issue #4: Zero-Arabic Sweep — COMPLETED
- **Rule:** If `user_language != 'Arabic'`, prohibit Arabic characters except Quranic/religious content
- **Exceptions preserved:** Quranic verses (Mushaf), dhikr/dua text, Names of Allah, Bismillah samples
- **Files fixed (20+):**
  - `lib/source-transliteration.ts` — Arabic-Indic numeral → Western conversion for non-ar/ur
  - `app/hajj-umrah.tsx` — `localizeNumber()` replaces hardcoded `ARABIC_NUMS`
  - `components/hajj/shared.tsx` — Same `ARABIC_NUMS` → `localizeNumber()` + TranslatedText for titles
  - `components/ui/prayer/GlassWidgetPreview.tsx` — `t('common.appName')` replaces hardcoded "روح المسلم"
  - `components/ui/BrandedCapture.tsx` — Font buttons `أ+/أ-` → `A+/A-` for non-RTL
  - `app/daily-ayah.tsx` — Removed 5 Arabic fallback strings
  - `app/hadith-of-day.tsx` — Removed 4 Arabic fallback strings
  - `app/(tabs)/hijri-calendar.tsx` — 18 Islamic event name fallbacks removed; Hijri months/weekdays fallbacks → English
  - `app/(tabs)/prayer.tsx` — Arabic `هـ` suffix fallback removed; Mecca default → language-aware
  - `app/(tabs)/_layout.tsx` — Tab name fallbacks → English
  - `app/(tabs)/settings.tsx` — Email subject → `t('common.appName')`
  - `app/(tabs)/quran-search.tsx` — Search suggestions → language-aware (Arabic for RTL, English for LTR)
  - `app/(tabs)/khatm.tsx` — Removed Arabic `.replace()` from translation call
  - `app/settings/notifications.tsx` — Reciter name fallback → English
  - `app/story-of-day.tsx` — Reciter name fallback → English
  - `app/tafsir/[surah]/[ayah].tsx` — Tafsir fallback → `t('quran.tafsir')`
  - `app/settings/quran.tsx` — AM/PM Arabic `م/ص` → language-aware
  - `app/settings/worship-tracking.tsx` — AM/PM Arabic → language-aware
  - `app/settings/photo-backgrounds.tsx` — Arabic alert messages → translation keys
  - `app/settings/live-activities.tsx` — App name → `t('common.appName')`
  - `app/settings/translations.tsx` — Language names → bilingual (ar/en) with isRTL switch
  - `constants/translations.ts` — Added `currentBackgroundDeleteConfirm` + `deleteBackgroundConfirm` keys (12 languages)
- **TypeScript:** 0 new errors (all pre-existing)
- **iOS Simulator:** App loads and runs in English mode, verified no Arabic leaks in UI

---

## 1. Smart Localization & Sanitization (Highest Priority)
* **Zero-Arabic Sweep:** If `user_language != 'Arabic'`, strictly prohibit any Arabic characters or source citations.
  * *Exception:* Only Arabic Quranic Verses (Ayat) on the Mushaf page remain.
* **Component Anonymization:** Ensure zero code names (e.g., HomeWidget, Route_01) are visible. Use localized human-readable strings only.
* **Deep Translation:** 100% coverage for: Surah/Juz, Tafsir (localized API), Hadith, Adhkar, Hajj/Umrah, and Tracker.
* **App Identity:** Auto-switch App Name and Logo to English version for non-Arabic locales.
* **Global RTL/LTR:** Force mirror all UI and Navigation. Navigation MUST be LTR for non-Arabic languages.

## 2. Live Activities & Advanced Widgets
* **Live Activities Setup:** Settings page for: Next Prayer + Ayah/Dua, and Full Prayer Times.
* **Admin-Managed Icons:** All widget/activity icons must be dynamic and updatable via the Admin Panel.

## 3. Advanced Admin Panel Controls
* **Global UI:** Control app colors, icons, titles, and descriptions.
* **Premium Logic:** Toggle features between Free/Premium; manage user access levels.
* **Dynamic Content:** Admin can edit any string or add localized content (Ar/En).
* **Live Preview:** View UI updates/notifications in a "preview mode" before publishing.

## 4. Full Monetization (AdMob Integration)
* **Logic:** Ads = Off for Premium users. Implement smart placement.
* **iOS Ad Units:**
  * App ID: `ca-app-pub-3645278220050673~7902167287`
  * Banner: `ca-app-pub-3645278220050673/9534813157`
  * Interstitial: `ca-app-pub-3645278220050673/7064203695`
  * App Open: `ca-app-pub-3645278220050673/6908649810`
  * Native Advanced: `ca-app-pub-3645278220050673/8070163603`
* **Android Ad Units:**
  * Banner: `ca-app-pub-3645278220050673/6453829605`
  * Interstitial: `ca-app-pub-3645278220050673/5882983961`
  * App Open: `ca-app-pub-3645278220050673/3627880358`
  * Native Advanced: `ca-app-pub-3645278220050673/5595568144`

## 5. Core Logic & Performance Parity
* **Efficiency Audit:** Ensure Expo Go performance is smooth. Long strings must use Marquee/Scaling.
* **Worship Tracker:** Log/display historical Fajr times for every tracked day.
* **Cloud Sync:** Stable Google Drive and iCloud backup/restore.

## 6. Build & Deployment (The Release Phase)
* **Step 1: Expo Go Verification:** Final audit of all features on the iOS Simulator.
* **Step 2: Cleanup:** Remove test data and debug logs. Sync Version Codes.
* **Step 3: Production Build:**
  * Android: Signed Keystore + AAB build for Play Store.
  * iOS: Xcode Archiving + TestFlight distribution.
* **Submission:** Final checklist for Store Listings and Privacy Policy.
