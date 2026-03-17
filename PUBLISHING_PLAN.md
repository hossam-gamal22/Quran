# روح المسلم — Ruh Al-Muslim: Full Publishing Plan

## Table of Contents

1. [Pre-Submission Checklist](#1-pre-submission-checklist)
2. [Google Play Store Submission](#2-google-play-store-submission)
3. [Apple App Store Submission](#3-apple-app-store-submission)
4. [App Store Optimization (ASO)](#4-app-store-optimization-aso)
5. [Viral Launch Strategy](#5-viral-launch-strategy)
6. [Post-Launch Monitoring](#6-post-launch-monitoring)
7. [Maintenance Schedule](#7-maintenance-schedule)
8. [v2.0 Feature Recommendations](#8-v20-feature-recommendations)

---

## 1. Pre-Submission Checklist

### 1.1 Code & Build Readiness

- [ ] All 29 issues verified via `test-guide.html` — 100% pass rate
- [ ] Zero TypeScript compiler errors (`npx tsc --noEmit`)
- [ ] Zero ESLint errors (`pnpm lint`)
- [ ] All 12 languages tested end-to-end (ar, en, fr, de, es, tr, ur, id, ms, hi, bn, ru)
- [ ] RTL layout verified for Arabic and Urdu
- [ ] Dark mode verified on all screens
- [ ] Production build compiled for both platforms:

  ```bash
  eas build --platform ios --profile production
  eas build --platform android --profile production
  ```

### 1.2 Assets Required

| Asset | iOS Spec | Android Spec |
| ----- | -------- | ------------ |
| App Icon | 1024×1024 PNG (no alpha) | 512×512 PNG (no alpha) |
| Feature Graphic | — | 1024×500 PNG |
| Screenshots | 6.7" (1290×2796), 6.5" (1242×2688), 5.5" (1242×2208), 12.9" iPad (2048×2732) | Phone (min 2, max 8) — 16:9 ratio |
| App Preview Video | 15-30s, 1080p or higher | 30s-2min, landscape or portrait |
| Arabic App Icon | Alternate icon via iOS Alternate Icons API | Activity alias icon |
| English App Icon | Default icon | Default activity alias icon |

### 1.3 Legal & Compliance

- [ ] Privacy Policy URL live and accessible (required by both stores)
- [ ] Terms of Service URL live
- [ ] Data safety form completed (Google Play)
- [ ] App Privacy details completed (Apple — nutrition labels)
- [ ] GDPR compliance verified (if targeting EU)
- [ ] COPPA compliance verified (if content could reach children <13)
- [ ] No copyrighted Quran recitation audio without license
- [ ] All font licenses verified (Cairo → OFL, QCF → verify license)
- [ ] Firebase security rules reviewed and locked down

### 1.4 Performance Benchmarks

| Metric | Target | Tool |
| ------ | ------ | ---- |
| Cold start time | < 3 seconds | Manual timing |
| JS bundle size | < 5 MB | `npx expo export --dump-sourcemap` |
| APK size | < 100 MB | EAS build output |
| IPA size | < 200 MB | EAS build output |
| Memory usage | < 300 MB peak | Xcode Instruments / Android Profiler |
| 60 FPS | All animations | React Native Perf Monitor |
| Crash-free rate | > 99.5% | Firebase Crashlytics |

---

## 2. Google Play Store Submission

### 2.1 Developer Account Setup

1. Create Google Play Developer account ($25 one-time fee)
2. Complete identity verification (can take 48h)
3. Set up Google Play Console: <https://play.google.com/console>

### 2.2 Store Listing — All 12 Languages

### Default Language: Arabic (ar)

| Field | Content |
| ----- | ------- |
| App Name | روح المسلم — Ruh Al-Muslim |
| Short Description (80 chars) | تطبيق إسلامي شامل: قرآن، أذكار، مواقيت صلاة، تسبيح، وأدعية |
| Category | Books & Reference |
| Content Rating | Everyone |
| Target Audience | 13+ |

**Full Description (ar):**
> روح المسلم هو رفيقك الإسلامي اليومي. تطبيق شامل يضم المصحف الشريف بخط عثماني محقق، أذكار الصباح والمساء مع التنبيهات، مواقيت الصلاة الدقيقة مع البوصلة القبلة، سبحة إلكترونية بإحصائيات يومية، أدعية مأثورة، تفسير القرآن، والتقويم الهجري.
>
> **المميزات الرئيسية:**
> • المصحف الشريف بخط عثماني عالي الجودة مع 17 ثيم للقراءة
> • أذكار الصباح والمساء والنوم مع تنبيهات ذكية
> • مواقيت الصلاة الدقيقة مع 3 أنماط ساعة (ودجت، تناظرية، رقمية)
> • بوصلة القبلة الدقيقة
> • سبحة إلكترونية مع تتبع يومي وإحصائيات
> • أدعية يومية متنوعة مع إمكانية المشاركة
> • تفسير القرآن الكريم
> • التقويم الهجري مع الأحداث الإسلامية
> • ودجات للشاشة الرئيسية
> • يدعم 12 لغة عالمية
> • وضع ليلي مريح للعينين
>
> حمّل روح المسلم الآن وابدأ رحلتك الروحية! 🌙

**Full Description (en):**
> Ruh Al-Muslim is your daily Islamic companion. A comprehensive app featuring the Holy Quran with authentic Uthmanic script, morning and evening adhkar with smart reminders, accurate prayer times with Qibla compass, digital tasbih with daily statistics, curated duas, Quran tafsir, and Hijri calendar.
>
> **Key Features:**
> • Holy Quran with high-quality Uthmanic font and 17 reading themes
> • Morning, evening, and sleep adhkar with smart notifications
> • Accurate prayer times with 3 clock styles (widget, analog, digital)
> • Precise Qibla compass
> • Digital tasbih with daily tracking and statistics
> • Daily curated duas with sharing capabilities
> • Quran tafsir (interpretation)
> • Hijri calendar with Islamic events
> • Home screen widgets
> • Supports 12 global languages
> • Comfortable dark mode
>
> Download Ruh Al-Muslim now and start your spiritual journey! 🌙

### 2.3 Content Rating (IARC Questionnaire)

- Violence: None
- Sexual content: None
- Language: None
- Controlled substance: None
- User-generated content: No
- Location sharing: Yes (Qibla compass — disclose)
- Personal data collection: Minimal (push notification tokens)

### 2.4 Release Strategy

| Phase | Timeline | Action |
| ----- | -------- | ------ |
| Internal Testing | Day 1-3 | Upload to Internal track, test on 5+ devices |
| Closed Alpha | Day 4-7 | Invite 20—50 beta testers from Muslim communities |
| Open Beta | Day 8-14 | Open to broader audience, collect feedback |
| Production | Day 15 | Full public launch |
| Staged Rollout | Day 15-22 | 10% → 25% → 50% → 100% over 7 days |

### 2.5 Android-Specific Checklist

- [ ] Target SDK 34 (Android 14) minimum
- [ ] 64-bit support verified
- [ ] App Bundle (.aab) format, NOT APK
- [ ] Adaptive icon with foreground + background layers
- [ ] Notification channels configured: `prayer-times`, `azkar-reminders`, `general`
- [ ] Widget metadata in AndroidManifest.xml
- [ ] Data safety form: Location (Qibla), Internet (API calls)
- [ ] In-app review prompt configured (after 7 days of use)

---

## 3. Apple App Store Submission

### 3.1 Developer Account Setup

1. Enroll in Apple Developer Program ($99/year)
2. Configure App Store Connect: <https://appstoreconnect.apple.com>
3. Create App ID and provisioning profiles via EAS

### 3.2 Store Listing

| Field | Content |
| ----- | ------- |
| App Name | روح المسلم — Ruh Al-Muslim |
| Subtitle (30 chars) | القرآن والأذكار والصلاة |
| Primary Category | Reference |
| Secondary Category | Lifestyle |
| Age Rating | 4+ |
| Price | Free |

**Promotional Text (170 chars — can be updated without review):**
> رفيقك الإسلامي اليومي — قرآن بخط عثماني، أذكار ذكية، مواقيت صلاة، تسبيح، أدعية، وأكثر. يدعم 12 لغة! 🌙

**Keywords (100 chars — comma-separated):**

```text
quran,azkar,prayer,islam,muslim,tasbih,dua,adhkar,salah,qibla,hijri,ramadan
```

### 3.3 App Review Guidelines Compliance

| Guideline | Status | Notes |
| --------- | ------ | ----- |
| 1.1 Objectionable Content | ✅ | Religious educational content |
| 1.2 User Generated Content | ✅ | No UGC features |
| 2.1 Performance | ✅ | No crashes, fast startup |
| 2.3 Accurate Metadata | ✅ | Screenshots match actual app |
| 3.1 In-App Purchase | ✅ | Free app, no IAP initially |
| 4.0 Design | ✅ | Follows HIG guidelines |
| 5.1 Privacy | ✅ | Privacy policy provided |
| 5.1.1 Data Collection | ✅ | Minimal data (location for Qibla) |

### 3.4 App Privacy Labels

| Data Type | Collection | Usage |
| --------- | ---------- | ----- |
| Location | Collected | Qibla compass, prayer times |
| Diagnostics | Collected | Crash reports (Firebase Crashlytics) |
| Identifiers | Not Collected | — |
| Usage Data | Not Collected | — |
| Contacts | Not Collected | — |
| Financial | Not Collected | — |

### 3.5 iOS-Specific Checklist

- [ ] Minimum iOS version: 15.0
- [ ] iPhone and iPad layouts tested
- [ ] WidgetKit extensions included and functional
- [ ] Background audio entitlement for Quran recitation
- [ ] Location permission usage description strings (English + Arabic)
- [ ] Notification permission usage description
- [ ] NSAppTransportSecurity exceptions minimized
- [ ] Alternate App Icons configured (Arabic + English)
- [ ] App Clips not needed (skip)

### 3.6 Review Notes for Apple

```text
This is an Islamic reference app providing Quran reading, daily prayers/supplications (adhkar),
prayer times, Qibla compass, and Islamic calendar. The app supports 12 languages.

Location permission is used solely for:
1. Calculating accurate prayer times based on user's coordinates
2. Determining Qibla direction for the compass feature

No account creation is required. No in-app purchases.

Test credentials: Not applicable (no login required).
```

---

## 4. App Store Optimization (ASO)

### 4.1 Keyword Strategy

**Primary Keywords (High Volume):**

| Keyword | Google Play | App Store | Competition |
| ------- | ---------- | --------- | ----------- |
| quran | ★★★★★ | ★★★★★ | Very High |
| azkar | ★★★★ | ★★★★ | Medium |
| prayer times | ★★★★★ | ★★★★★ | High |
| muslim | ★★★★ | ★★★★ | High |
| islam | ★★★★ | ★★★★ | High |
| أذكار | ★★★★★ | ★★★★★ | Medium |
| قرآن | ★★★★★ | ★★★★★ | High |
| مواقيت الصلاة | ★★★★ | ★★★★ | Medium |

**Long-Tail Keywords (Lower Competition):**

- "quran uthmanic font"
- "azkar morning evening"
- "digital tasbih counter"
- "islamic daily dua"
- "hijri calendar events"
- "qibla compass accurate"

### 4.2 Screenshot Strategy

Create 6-8 screenshots per device size showing:

| # | Screen | Headline (ar) | Headline (en) |
| - | ------ | ------------- | -------------- |
| 1 | Home page | رفيقك الإسلامي اليومي | Your Daily Islamic Companion |
| 2 | Mushaf reader | المصحف بخط عثماني | Quran with Uthmanic Script |
| 3 | Prayer times + clock | مواقيت الصلاة الدقيقة | Accurate Prayer Times |
| 4 | Azkar category | أذكار الصباح والمساء | Morning & Evening Adhkar |
| 5 | Tasbih counter | سبحة إلكترونية ذكية | Smart Digital Tasbih |
| 6 | Qibla compass | بوصلة القبلة | Qibla Compass |
| 7 | Widgets | ودجات شاشتك الرئيسية | Home Screen Widgets |
| 8 | Dark mode | وضع مريح للعينين | Comfortable Dark Mode |

**Design Guidelines:**

- Device frame mockup (iPhone 15 Pro / Pixel 8)
- Deep green (#0f987f) gradient background
- White headline text, Arabic right-aligned
- Gold (#d4a853) accent for feature highlights
- Status bar showing real time

### 4.3 Localized Listings

Create full listings in all 12 languages:

- **Priority 1** (launch): Arabic, English, French, Turkish, Urdu
- **Priority 2** (week 2): Indonesian, Malay, Bengali, Hindi
- **Priority 3** (week 3): Russian, Spanish, German

### 4.4 A/B Testing Plan (Google Play Experiments)

| Test | Variant A | Variant B | Duration |
| ---- | --------- | --------- | -------- |
| Icon | Arabic calligraphy | Geometric mosque | 14 days |
| Feature graphic | Green gradient + screenshots | Gold gradient + Quran verse | 14 days |
| Short description | Feature-focused | Emotion-focused | 14 days |

---

## 5. Viral Launch Strategy

### 5.1 Pre-Launch (4 weeks before)

**Social Media Buildup:**

- Create accounts: Instagram, Twitter/X, TikTok, YouTube
- Post daily Islamic content (reels, verses, duas) to build audience
- Use hashtags: #روح_المسلم #RuhAlMuslim #IslamicApp #QuranApp
- Teaser video: 30s app preview with nasheed background

**Community Outreach:**

- Contact Islamic content creators (10+ with 50K+ followers)
- Offer early access to Islamic community admins
- Post in Muslim subreddits (r/islam, r/MuslimLounge)
- Share in Islamic WhatsApp/Telegram groups
- Contact Islamic organizations and mosques

**Landing Page:**

- Create rooh-almuslim.com with email capture
- Feature: App preview, feature highlights, download countdown
- SEO-optimize for "islamic app", "quran app", "muslim app"

### 5.2 Launch Day

**Press Kit:**

- App icon (high-res PNG)
- 5 screenshot compositions
- 30s promo video
- Press release in Arabic + English
- Founder/developer story
- Feature list one-pager

**Launch Channels:**

| Channel | Action | Expected Reach |
| ------- | ------ | -------------- |
| ProductHunt | Submit with full description | 5K-20K views |
| Reddit r/islam | "I built an Islamic app" post | 10K-50K views |
| Twitter/X | Launch thread with video | 5K-15K impressions |
| Instagram | Carousel post + reels | 10K-30K reach |
| TikTok | 60s demo video | 20K-100K views |
| WhatsApp | Broadcast to Islamic groups | Direct shares |
| Telegram | Post in Islamic channels | 5K-20K members |
| Facebook | Islamic community pages | 10K-50K reach |

### 5.3 In-App Viral Mechanics

**Share Features (already built):**

- Share ayah as image with app branding watermark
- Share dua as styled image or text
- Share tasbih achievements
- App share card with custom branded image

**Growth Hooks:**

- "Share with family" prompt after 3 days of use
- Beautiful Eid/Ramadan greeting card generator (seasonal)
- "Invite friends to khatma" (group Quran reading)
- Weekly worship summary shareable card

### 5.4 Influencer Partnership Strategy

**Tier 1 — Micro-influencers (5K-50K followers):**

- 20 Islamic content creators across 5 languages
- Offer: Free featured placement, early access
- Ask: 1 story + 1 post mentioning the app

**Tier 2 — Mid-tier (50K-500K followers):**

- 5-10 Islamic scholars/educators with YouTube/Instagram
- Offer: Custom feature highlight, attribution
- Ask: App review video or dedicated post

**Tier 3 — Macro (500K+):**

- 2-3 major Islamic figures
- Approach after achieving 10K downloads
- Offer: Involvement in content curation

### 5.5 Seasonal Marketing Calendar

| Event | Hijri Date | Campaign |
| ----- | --------- | -------- |
| Ramadan | Month 9 | Push campaign: "Your Ramadan Companion". Ramadan-themed UI. |
| Eid Al-Fitr | 1 Shawwal | Eid greeting card generator. "Share Eid wishes" feature. |
| Dhul Hijjah | Month 12 | Hajj guide push. "10 Days of Dhul Hijjah" tracker. |
| Eid Al-Adha | 10 Dhul Hijjah | Eid greeting cards. Takbeer audio feature. |
| Mawlid | 12 Rabi Al-Awwal | Seerah content push. "Know your Prophet" campaign. |
| Isra & Miraj | 27 Rajab | Special night prayers guide. Push notification. |

---

## 6. Post-Launch Monitoring

### 6.1 Key Metrics Dashboard

**Real-Time (check daily for first 2 weeks):**

| Metric | Tool | Alert Threshold |
| ------ | ---- | --------------- |
| Crash-free rate | Firebase Crashlytics | < 99% |
| ANR rate (Android) | Play Console | > 0.5% |
| App not responding | Crashlytics | Any spike |
| Active users (DAU) | Firebase Analytics | — |
| New installs | Store Console | — |

**Weekly Review:**

| Metric | Target (Month 1) | Target (Month 3) |
| ------ | ----------------- | ----------------- |
| DAU | 500+ | 5,000+ |
| MAU | 2,000+ | 15,000+ |
| Retention D1 | > 40% | > 50% |
| Retention D7 | > 20% | > 30% |
| Retention D30 | > 10% | > 15% |
| Avg session length | > 3 min | > 5 min |
| Store rating | > 4.5 | > 4.7 |
| Crash-free rate | > 99% | > 99.5% |

### 6.2 Review Management

**Response SLA:**

- 1-star reviews: Respond within 24 hours
- 2-3 star reviews: Respond within 48 hours
- 4-5 star reviews: Thank within 72 hours

**Response Templates:**

```text
[1-star — Bug report]
السلام عليكم، شكراً لملاحظتك. نأسف للمشكلة التي واجهتها.
نعمل على إصلاحها في التحديث القادم. هل يمكنك مراسلتنا
على support@rooh-almuslim.com مع تفاصيل جهازك؟ جزاك الله خيراً 🤲

[5-star — Thank you]
جزاك الله خيراً على تقييمك الجميل! 🌙
سعداء أن التطبيق ينفعك. شاركه مع أحبابك ليعم النفع.
```

### 6.3 Crash Triage Process

1. **P0 — Crash on startup**: Hotfix within 4 hours, expedited review
2. **P1 — Core feature crash** (Quran reader, prayer times): Fix within 24 hours
3. **P2 — Secondary feature crash** (sharing, widgets): Fix in next release
4. **P3 — Edge case crash**: Log and batch with next release

### 6.4 Analytics Events to Track

```javascript
// Core engagement
'app_open', 'session_start', 'session_end'
'quran_page_view', 'quran_bookmark', 'quran_share'
'azkar_category_open', 'azkar_complete'
'prayer_time_view', 'qibla_open'
'tasbih_count', 'tasbih_complete'
'dua_view', 'dua_share'

// Feature adoption
'language_changed', 'theme_changed', 'clock_style_changed'
'widget_added', 'notification_enabled', 'notification_disabled'
'audio_play', 'audio_complete'

// Growth
'app_shared', 'ayah_shared', 'dua_shared'
'review_prompted', 'review_submitted'
```

---

## 7. Maintenance Schedule

### 7.1 Update Cadence

| Update Type | Frequency | Content |
| ----------- | --------- | ------- |
| Hotfix | As needed | Crash fixes, critical bugs |
| Minor release | Bi-weekly | Bug fixes, performance improvements |
| Feature release | Monthly | New features, content updates |
| Major release | Quarterly | Significant new capabilities |

### 7.2 Regular Maintenance Tasks

**Weekly:**

- [ ] Review crash reports (Crashlytics)
- [ ] Respond to store reviews
- [ ] Check prayer times API accuracy
- [ ] Monitor server costs (Firebase)

**Monthly:**

- [ ] Update dependencies (`pnpm update`)
- [ ] Review analytics for feature usage
- [ ] Update Hijri calendar data if needed
- [ ] Audit storage usage (AsyncStorage cleanup)

**Quarterly:**

- [ ] Expo SDK upgrade (stay within 1 version of latest)
- [ ] Security audit (dependencies, Firebase rules)
- [ ] Performance profiling (memory, bundle size)
- [ ] A/B test store listing assets

**Annually:**

- [ ] Renew Apple Developer account ($99)
- [ ] Review and update privacy policy
- [ ] Comprehensive content audit (translations accuracy)
- [ ] Major version planning

### 7.3 Dependency Update Strategy

```bash
# Check for outdated packages
pnpm outdated

# Update minor/patch versions (safe)
pnpm update

# Major version updates (test thoroughly)
pnpm update --latest  # Review changelog first

# Expo SDK upgrade
npx expo install --fix  # After updating expo package
```

---

## 8. v2.0 Feature Recommendations

### 8.1 High-Impact Features

| Feature | Impact | Effort | Priority |
| ------- | ------ | ------ | -------- |
| User accounts & cloud sync | ★★★★★ | Large | P0 |
| Community khatma (group reading) | ★★★★★ | Large | P0 |
| Quran memorization tracker | ★★★★★ | Medium | P1 |
| Apple Watch / Wear OS companion | ★★★★ | Large | P1 |
| Offline-first with sync | ★★★★ | Medium | P1 |
| AI-powered dua suggestions | ★★★ | Medium | P2 |
| Gamification (streaks, badges) | ★★★★ | Medium | P2 |

### 8.2 Feature Descriptions

**Community Khatma (Group Quran Reading):**

- Create/join khatma groups (30 parts divided among members)
- Real-time progress tracking
- Push notifications for assignment reminders
- Leaderboard and completion celebration
- Deep link sharing to invite members

**Quran Memorization Tracker:**

- Track memorized surahs/ayahs
- Spaced repetition review reminders
- Audio comparison (record your recitation)
- Progress visualization (mushaf heat map)
- Daily memorization goals

**User Accounts & Cloud Sync:**

- Sign in with Apple / Google
- Sync bookmarks, favorites, tasbih stats, khatma progress
- Multi-device support
- Backup/restore to cloud
- Already have Firebase Auth foundation

**Gamification:**

- Daily streak counter (consecutive days of use)
- Achievement badges (100 tasbih, 7-day streak, Quran complete)
- Weekly worship summary card (shareable)
- Leaderboard (opt-in, anonymous)

### 8.3 Technical Debt to Address

- [ ] Migrate from AsyncStorage to MMKV for faster storage
- [ ] Implement proper offline queue for Firebase operations
- [ ] Add comprehensive test suite (Jest + Detox)
- [ ] Set up CI/CD pipeline (GitHub Actions + EAS Build)
- [ ] Reduce bundle size (code splitting, lazy imports)
- [ ] Implement proper error boundary components
- [ ] Add Sentry for production error tracking alongside Crashlytics

---

## Appendix: Quick Reference Commands

```bash
# ─── Development ───
pnpm install                  # Install dependencies
pnpm dev                      # Start Expo dev server
pnpm ios                      # Run on iOS simulator
pnpm android                  # Run on Android emulator

# ─── Production Builds ───
eas build --platform ios --profile production
eas build --platform android --profile production

# ─── Submit to Stores ───
eas submit --platform ios
eas submit --platform android

# ─── OTA Updates ───
eas update --branch production --message "Bug fix: ..."

# ─── Cache Clear ───
npx expo start --clear
rm -rf node_modules && pnpm install

# ─── Type Check ───
npx tsc --noEmit
```

---

*Document generated for روح المسلم (Ruh Al-Muslim) — v1.0 Launch*
*Last updated: March 2026*
