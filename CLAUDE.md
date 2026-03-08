# CLAUDE.md — روح المسلم (Ruh Al-Muslim)

Project overview and conventions for AI assistants working on this codebase.

## Project

Islamic mobile app built with **React Native + Expo SDK 54 + TypeScript**. Package manager: **pnpm v9.12.0**.

```bash
pnpm install        # install dependencies
pnpm dev            # start Expo dev server
pnpm android        # run on Android
pnpm ios            # run on iOS
```

## Architecture

- **Router**: Expo Router (file-based routing in `app/`)
- **State**: React Context (SettingsContext, QuranContext, RemoteConfigContext, NotificationsContext, WorshipContext, KhatmaContext, SeasonalContext, OnboardingContext)
- **Styling**: NativeWind (Tailwind CSS for RN) + `global.css` + constants/theme.ts
- **Storage**: AsyncStorage for local persistence, Drizzle ORM for structured data
- **Backend**: Firebase (Firestore, Auth, Storage) — project: rooh-almuslim
- **Fonts**: 604 QCF page fonts for Mushaf rendering (`assets/fonts/qcf/`), Orbitron for digital clock

## Key Directories

| Path | Purpose |
|------|---------|
| `app/(tabs)/` | Main tab screens (home, quran, prayer, tasbih, azkar, settings) |
| `app/surah/` | Mushaf reader with QCF fonts |
| `app/settings/` | Settings sub-pages |
| `app/seasonal/` | Seasonal event screens (Ramadan, Hajj, Mawlid) |
| `components/ui/` | Shared UI components (GlassCard, NativeTabs, etc.) |
| `lib/` | Core utilities (APIs, i18n, storage, audio, helpers) |
| `constants/` | Theme colors, translations, app constants |
| `contexts/` | React Context providers |
| `hooks/` | Custom hooks (useColors, useAuth, useAzkarAudio, etc.) |
| `data/json/` | Local JSON data (azkar, tafsir, quran metadata) |
| `server/` | Server-side API routes |
| `admin-panel/` | Vite + React 19 + Tailwind admin dashboard |

## Theming System

### Colors & Contrast
- **`hooks/use-colors.ts`** — Central color hook. Returns theme-aware colors including seasonal overlays.
- **`lib/contrast-helper.ts`** — Automatic contrast utilities: `getContrastColor(bg)` returns black/white, `getContrastTextColor(bg)` returns appropriate text color, `ensureContrast(fg, bg, minRatio)` adjusts foreground if contrast ratio is too low.
- **`hooks/use-contrast-colors.ts`** — Hook wrapping contrast helpers: `useContrastColors(backgroundColor)` returns `{ text, subtext, icon, border }` with WCAG-compliant contrast.
- **`constants/quran-themes.ts`** — 17 Mushaf reading themes with `textColor` and `contrastTextColor` fields.
- **`lib/seasonal-theme-helper.ts`** — Resolves seasonal theme colors (Ramadan, Hajj, Mawlid, Isra) and provides `getSeasonalContrastColors()`.

### Glassmorphism
- BlurView-based glass effects throughout (GlassCard, tab bar, headers, bottom sheets).
- Light: `rgba(255,255,255,0.4)`, Dark: `rgba(30,30,32,0.55)`.

## NativeTabs Component

**`components/ui/NativeTabs.tsx`** — Material top tabs component replacing old `GlassSegmentedControl` and `SegmentedControl` patterns.

```tsx
import { NativeTabs } from '@/components/ui';

<NativeTabs
  tabs={[
    { key: 'tab1', title: 'عنوان', content: <View /> },
    { key: 'tab2', title: 'عنوان٢', content: <View /> },
  ]}
  initialTab="tab1"
  accentColor="#4CAF50"
/>
```

Uses `@react-navigation/material-top-tabs` with `react-native-pager-view` for native swipe. Supports RTL, custom accent colors, and conditional rendering for performance.

## Internationalization (i18n)

### Setup
- **`lib/i18n.ts`** — Core i18n module: `t(key)`, `setLanguage()`, `getLanguage()`, `isRTL()`, `loadSavedLanguage()`
- **`constants/translations.ts`** — All translations (~6300 lines). Interface: `TranslationKeys`.
- **12 languages**: ar, en, fr, de, es, tr, ur, id, ms, hi, bn, ru
- **RTL languages**: ar, ur, fa

### Usage
```tsx
import { t } from '@/lib/i18n';

// Simple key
<Text>{t('tabs.quran')}</Text>

// Nested namespace
<Text>{t('notificationSounds.makkahDesc')}</Text>

// From settings context (same underlying function)
const { t } = useSettings();
```

### Translation Namespaces
`app`, `tabs`, `common`, `home`, `quran`, `azkar`, `prayer`, `tafsir`, `settings`, `onboarding`, `khatma`, `worship`, `names`, `notificationSounds`, and more.

### Adding Translations
1. Add key to `TranslationKeys` interface in `constants/translations.ts`
2. Add translation string to all 12 language blocks
3. Use `t('namespace.key')` in components

## Adhkar System

- **Data**: `data/json/azkar.json` — 247 adhkar across 21+ categories, fully translated to 12 languages.
- **API**: `lib/azkar-api.ts` — `getZikrTranslation(zikr, lang)`, `getZikrBenefit(zikr, lang)` with multi-language fallback chain (requested → en → ar).
- **Benefit field**: `Record<string, string> | string` — handles both legacy plain-string and multi-language object formats.

## Audio System

- **AudioPlayerManager** (`lib/audio-player-manager.ts`) — Singleton for Quran recitation with subscription-based state.
- **expo-av Audio.Sound** — Used for standalone audio (azkar, adhan preview).
- **Adhan preview URLs**: cdn.aladhan.com (Makkah, Madinah, Al-Aqsa, Mishary, Abdul Basit).
- **Recitation CDN**: cdn.islamic.network/quran/audio/128/{reciter}/{ayahNumber}.mp3

## Prayer Times Display

- **Prayer tab** (`app/(tabs)/prayer.tsx`) — Main prayer screen with NativeTabs (prayer/qibla), 3 clock styles, PrayerList, extra times.
- **Clock styles**: `widget` | `analog` | `digital` — stored in AsyncStorage key `@prayer_clock_style`.
- **Style selector**: Thumbnail-only horizontal ScrollView in a BlurView. No text labels under thumbnails.
- **Prayer names**: Use `t('prayer.fajr')`, `t('prayer.dhuhr')`, etc. — NOT `ui.prayer.*`.

### Clock Components
| Component | Style | Description |
|-----------|-------|-------------|
| `RectangleWidgetView` | Widget | Light card with app logo + "الصلاة القادمة", countdown boxes, adhan time |
| `AnalogClockView` | Analog | SVG clock with Arabic numerals, green prayer-time marker, countdown below |
| `DigitalTypographyView` | Digital | Orbitron digital font countdown, prayer name, adhan time |
| `CountdownTimer` | (shared) | Animated circular ring countdown variant |
| `PrayerList` | (shared) | Full 5-prayer list with notification toggles |

### Prayer-specific Fonts
- **Orbitron-Bold** / **Orbitron-Regular** — Digital LCD-style font for digital clock countdown digits.
- Registered in `app/_layout.tsx` via `useFonts()`.

## Icons

- **@expo/vector-icons v15.1.1** — All 100 MaterialCommunityIcons and 58 Ionicons names validated.
- Use `MaterialCommunityIcons` for most icons, `Ionicons` for system/navigation icons.
- Admin panel uses `lucide-react`.

## Admin Panel

Located in `admin-panel/`. Separate Vite + React 19 + Tailwind CSS app.

```bash
cd admin-panel && pnpm install && pnpm dev
```

### Key Pages
- `/app-content` — **AppContentManager**: CRUD for app content (icons, titles, labels) with 12-language editing, icon upload, live preview, import/export JSON. Firestore collection: `appContent`.
- Other pages: dashboard, users, content, notifications, analytics, etc.

## Conventions

- **RTL-first**: App primarily targets Arabic users. Always consider RTL layout.
- **Glass design**: Use GlassCard/BlurView patterns for consistency.
- **Haptics**: Use expo-haptics for tactile feedback on interactions.
- **Spring animations**: Reanimated with spring config (damping: 18, stiffness: 240).
- **Platform checks**: Use `Platform.OS` for iOS/Android-specific behavior.
- **File naming**: kebab-case for files, PascalCase for components.
- **Imports**: Use `@/` path alias (maps to project root).

## Text Direction Handling
- Arabic, Urdu, Persian, Farsi content: RTL direction
- English and other Latin-based translations: LTR direction
- Always set explicit `direction` and `writingDirection` on translation text
- Wrap translation text in a `<View style={{ direction: dir }}>` to isolate bidi context from RTL parent containers
- Use `(N)` parentheses for LTR translations, `﴿N﴾` ornamental brackets for RTL translations

## Quran Reader Header
- Mushaf page header icons: tafsir, play, heart/favorite, share
- Mushaf page header should NOT include bookmark icon
- Bookmarking is done via long-press on verses only

## Global Contrast System

Always use `useColors()` from `hooks/use-colors.ts` for text colors. The hook provides:
- `colors.text` / `colors.foreground` — Primary text color (theme-aware)
- `colors.textLight` / `colors.muted` — Secondary/muted text color
- `colors.background`, `colors.card`, `colors.primary`, `colors.accent`

For dynamic backgrounds (modals, overlays, custom cards), use contrast helpers:
```tsx
import { getContrastTextColor } from '@/lib/contrast-helper';
const textColor = getContrastTextColor(backgroundColor);
```

**Never hardcode** text colors like `#333` or `#fff` — always derive from theme or contrast helpers.

## Notification System

- **`lib/push-notifications.ts`** — Scheduling functions: `schedulePrayerNotification()`, `scheduleAzkarReminder()`, `scheduleLocalNotification()`
- **`lib/prayer-notifications.ts`** — Prayer-specific scheduling with timezone handling
- **`lib/notifications-manager.ts`** — Bridge: `scheduleNotificationsFromSettings()` maps context settings → scheduling calls
- **`contexts/NotificationsContext.tsx`** — Provides notification state and handlers
- Notification handler is set at module scope in `app/_layout.tsx` (not inside components)
- Android channels: `prayer-times`, `azkar-reminders`, `general`
- Triggers use `SchedulableTriggerInputTypes.DATE` (Expo SDK 54 requirement)

## Naming Conventions

- **Favorites**: Use "المحفوظات" (al-mahfoozat) in Arabic, NOT "المفضلة" (al-mufaddala)
- Translation keys: `common.favorites`, `home.favorites`, `azkar.favorites`

## Page Design Standards

- All content pages must use `GlassCard` or `BlurView` patterns for consistency
- Infographic-style layouts for guides (Hajj, Umrah, Seerah) — numbered steps, timeline markers
- Expandable sections use `MaterialCommunityIcons` chevron-down/up with spring animation
- Modal backgrounds: dark overlay with glass card content, ensure text is light colored

## Widget System

### Architecture
- **`lib/widget-data.ts`** — Shared data layer: `preparePrayerWidgetData()`, `prepareAzkarWidgetData()`, `updateSharedData()`
- **`app/widget-settings.tsx`** — Widget customization UI (colors, refresh interval, categories)
- **`app/widgets-gallery.tsx`** — Widget preview gallery

### Native Widgets
- **Android**: Kotlin Glance framework in `android/PrayerClockWidget/`, `android/AzkarWidget/`, `android/HijriCalendarWidget/`, `android/QuranAyahWidget/`
- **iOS**: WidgetKit in `ios/PrayerClockWidget/`, `widgets/ios/`
- Legacy Android RemoteViews in `widgets/android/`

### Data Flow
App → `updateSharedData()` → AsyncStorage + iOS Shared Container → Native widgets read on refresh

## Search Behavior

- **Tafsir Search**: Search in `quran-uthmani` edition (actual Quran verses), NOT tafsir text
- **Azkar Search**: Supports `?mode=benefits` URL param to show all adhkar with virtues/فضائل
- **Adhkar Translation**: Use `resolveTranslationValue()` from `lib/azkar-api.ts` for `{text, verified}` object format

## Navigation

- Tab routes: Use `router.navigate('/(tabs)/routeName')` — NOT `router.push()` for tab destinations
- Stack routes: Use `router.push('/routeName')` for modal/stack screens
- Special Surahs: Navigate to `/special-surah?surah=18` (الكهف), `?surah=36` (يس), `?surah=67` (الملك)
- Quick Access items are customizable via AsyncStorage key `@quick_access_items`

## Error Handling

- Wrap date conversions (Hijri ↔ Gregorian) in try-catch — invalid day values cause TypeError
- Wrap JSON.parse of AsyncStorage data in individual try-catch blocks (don't let one failure prevent other data loading)
- Guard notification scheduling against past times (skip if trigger date is already past)
- Azkar data: Handle both plain string and `Record<string, string>` benefit formats

## Adhkar System (Extended)

- **Subcategories**: `after_prayer` category supports `subcategory` field: `general`, `after_fajr`, `after_fajr_maghrib`
- **Post-prayer display**: NativeTabs with عامة / بعد الفجر / بعد المغرب tabs
- **Translation format**: Some entries use `{ text: string, verified: boolean }` — always resolve via `resolveTranslationValue()`

## New Pages

| Route | Purpose |
|-------|---------|
| `/special-surah` | Standalone surah reader for الكهف/يس/الملك with QCF fonts |
| `/seerah` | Prophet's Biography — 7 expandable timeline sections |
| `/daily-dua` | Daily dua display (126 curated duas, deterministic + random refresh) |
| `/daily-ayah` | Verse of the Day — deterministic daily verse with sharing |
| `/hajj-umrah` | Hajj & Umrah guide — NativeTabs, expandable rituals with duas |
| `/companions` | Sahaba stories — 21 companions, 4 categories, inline detail view |

## Clock Components

- **AnalogClockView**: Prayer marker uses mosque emoji (🕌) with green accent circles, larger (r=12) than before
- Countdown displays: HH:MM:SS format with Cairo-Bold font
- Prayer info shows pulsing icon animation below clock

## Icon Standards
- All icons must be perfectly centered in their containers
- Use flexbox with `justifyContent: 'center'` and `alignItems: 'center'`
- Test icon alignment on multiple screen sizes
- Bookmark icon (`bookmark` / `bookmark-outline`) for saved/favorites items
- Star icons positioned ABOVE cards, not beside them

## Glass Morphism Style (iOS)
- `backgroundColor: 'rgba(255, 255, 255, 0.1)'` (dark) / `'rgba(255,255,255,0.7)'` (light)
- BlurView intensity: 80-100 (iOS), 40-50 (Android)
- `borderRadius: 16`
- `borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.2)'`

## Theme System
- Store text color preference (`white` | `black`) with each background via admin panel
- Admin panel specifies text color when adding themes/backgrounds
- App reads `appBackgroundTextColor` from display settings and applies via `useColors()`
- Quran themes: 17 themes in `constants/quran-themes.ts` with `textColor` and `contrastTextColor`

## Widget Development
- **Data layer**: `lib/widget-data.ts` — `prepareVerseWidgetData()`, `prepareDhikrWidgetData()`, `preparePrayerWidgetData()`
- **iOS**: WidgetKit with glass morphism gradients (`widgets/ios/`)
- **Android**: Material You / Material Design 3 (`widgets/android/`)
- Widgets update daily for verse/dhikr content
- Prayer widget supports interactive completion checkboxes
- Settings: `app/widget-settings.tsx`, Gallery: `app/widgets-gallery.tsx`

## Carousel/Slider Components
- Always include navigation arrows (left/right chevrons)
- Prevent content clipping with `overflow: 'visible'` on containers
- Add proper `paddingHorizontal` to `contentContainerStyle`
- Support drag & drop reordering via reorder modal (vertical list with ↑/↓ arrows)
- Order persisted in AsyncStorage (`@highlights_order`, `@quick_access_items`)

## Export System
- Image export: Use `react-native-view-shot` + `expo-sharing`
- Include app branding ("روح المسلم" watermark) at bottom of exported images
- Text export: `Share.share()` with formatted text + app branding
- Share icon: Always use `share-variant` from MaterialCommunityIcons (unified across app)

## RTL Support
- Always test arrow directions in RTL mode
- Previous = `chevron-right`, Next = `chevron-left` (in RTL context)
- Use `MaterialCommunityIcons` for directional arrows (no auto-flip)
- Hijri calendar must respect RTL layout
- Quick access and highlights use `flexDirection: 'row-reverse'`

## API Integration
- Daily verse: `api.alquran.cloud` with deterministic day-of-year selection
- Daily duas: 126 curated duas in `data/daily-duas.ts` with random refresh
- Cache API responses to reduce calls (per-day caching in AsyncStorage)

## Story Thumbnails
- Generate thumbnail from deterministic daily data (color + ayah text)
- 5 solid background colors cycled by day of year
- Cache in `@story_of_day_cache` until date changes
- Do not use random Pexels API images

## Companions Stories
- Route: `/companions` — 21 companions across 4 categories
- Categories: العشرة المبشرون، المهاجرون، الأنصار، أمهات المؤمنين
- Expandable story detail with virtues list

## Tasbih Tracking
- Per-type statistics: `@tasbih_type_stats` in AsyncStorage
- Structure: `{ [date]: { [tasbihText]: count } }`
- Stats modal shows daily breakdown and 7-day history
- Dynamic counter font: 72px (1-2 digits), 52px (3), 36px (4+)

## Audio System Rules
- Only show audio controls for content that has actual audio files
- Never show audio option for items without audio
- Store all sounds in: `assets/sounds/adhkar/`, `assets/sounds/adhan/`, `assets/sounds/notifications/`

## Settings Architecture
- Never duplicate settings between main settings and page-specific settings
- Main settings: Language, Theme, Display settings, Notifications, Widget, Backup
- Page-specific settings stay in their pages (Quran settings in Quran, Prayer settings in Prayer)
- "اعدادات العرض" (Display Settings) replaces "حجم الخط" label

## Notification Sound Mapping
- الصلاة على النبي → salawat.mp3
- الاستغفار → istighfar.mp3
- التسبيح → subhanallah.mp3
- الأذان → user_selected_adhan.mp3
- Default sounds location: `assets/sounds/notifications/`
- All notification types combined in one unified page with expandable dropdowns
- Test notification button available for each notification type

## Translation Display
- Default: OFF for Arabic interface
- Only show when user explicitly enables
- Applies to: Adhkar, Tasbih, Quran verses, all Islamic content

## Screenshot Branding
- Apply to all pages EXCEPT Quran
- Component: `components/ui/BrandedCapture.tsx`
- Structure: App background color → Content → Logo on white rounded rect
- Logo position: Bottom center with "رُوح المسلم" text
- Use `excludeBranding` prop on Quran pages
- Share utility: `captureWithBranding()` in `lib/share-service.ts`

## RTL Layout Rules
- Section titles: `textAlign: 'right'`, `writingDirection: 'rtl'`
- Navigation arrows: Right arrow = back, Left arrow = forward (RTL)
- Dates: Hijri | Gregorian (side by side with `|` separator)

## Admin Panel Capabilities
- Home page management: `admin-panel/src/pages/HomePageManager.tsx`
- Controls: highlights, sections visibility/order, daily content, theme colors
- Firestore doc: `appConfig/homePageConfig`
- API: `fetchHomePageConfig()`, `subscribeToHomePageConfig()` in `lib/app-config-api.ts`
- Content: Story of day, Verse of day (auto/manual mode)
- Theming: All colors, images, icons
- Notifications: All settings

## Widget Design
- Must match SVG mockups in `design/mockups/prayer-clock/`
- 4 styles: Rectangle, Circle, Rounded, Large
- Static elements: logo image, "روح المسلم" text
- Dynamic elements only: timer, prayer name, times
- Colors: `#081827` text, `#0f987f` green accent

## Ad Placeholder Rules
- Never show empty placeholder to user
- `BannerAd` returns `null` when no real ad is active
- No "مكان الإعلان" shown to end users

## Quick Access & Highlights
- Icons must be centered: `justifyContent: 'center'`, `alignItems: 'center'`
- Reorder button: Full width, below highlights section
- Customization must be accessible and working
- Use `pendingAllQuickAccessItems` for reorder view to include newly added items

## Tasbih Page
- No tashkeel on Arabic text (use `stripTashkeel()` for display)
- No translation by default
- Button directions: RTL appropriate (right=next, left=prev)
- No bookmark icon
- Tracking integrates with worship tracking system (`worship-storage.ts`)

## PDF Export
- Available for: Hajj/Umrah guide, Seerah, Companions
- Uses `expo-print` + `expo-sharing`
- Shows interstitial ad placeholder before export
- Utility: `lib/pdf-export.ts` — `exportAsPDF()`, `showAdThenExport()`
- HTML template: RTL, Cairo font, app branding

## Dua Sharing
- Share as text or image
- Solid color background options for image sharing
- 6 colors: green, navy, blue, black, dark green, white
- Step 1: choose text/image, Step 2: pick color (for image)

## App Sharing
- Include branded image
- Image location: `assets/images/share/app_share.png` (placeholder)

## Hajj & Umrah Duas
- 3 tabs: العمرة, الحج, الأدعية
- Duas tab: 10 ritual groups with 40+ duas organized by step
- Each dua shows: Arabic text, occasion, source reference
- Collapsible ritual cards with glass morphism

## Cache Management

- **`lib/cache-manager.ts`** — Auto-clears caches on app version change via `checkAndClearCacheOnUpdate()`
- Called in `initFirebase()` in `app/_layout.tsx` as first step
- Preserves critical keys: language, onboarding, bookmarks, favorites, worship data, khatma data
- Compares `Constants.expoConfig.version` vs stored `@app_version`

## Sound System

### Folder Structure
- `assets/sounds/adhan/` — Adhan recordings
- `assets/sounds/notifications/` — Notification alerts (salawat, istighfar, subhanallah)
- `assets/sounds/adhkar/` — Adhkar narration audio
- `assets/sounds/effects/` — UI sound effects

### Centralized Manager
- **`lib/sound-manager.ts`** — Single source of truth for all sound playback
- `playSound(source)` — plays bundled `require()` sources
- `playSoundFromUrl(url, category, fallback?)` — plays remote sounds via cache
- `playNotificationSound(key)` / `playPageSound(key)` — convenience wrappers
- `fetchSoundSettings()` — loads from Firestore `appConfig/soundSettings` with 3-tier cache (memory → AsyncStorage → Firestore)
- `getCachedSound(url, category)` — downloads to `cacheDirectory/sounds/` and reuses

### Admin Sound Management
- **`admin-panel/src/pages/SoundManager.tsx`** — Upload/manage sounds, assign to notifications and page events
- Route: `/sounds` in admin panel sidebar
- Saves assignments to Firestore `appConfig/soundSettings`

## Adhkar Audio System
- Individual per-item audio buttons REMOVED
- "Listen All" (🎧 الاستماع) mode: sequential playback of all adhkar in category
- Read/Listen mode toggle at top of category page
- Sticky audio player with play/pause, track name, progress indicator
- Audio queue system with auto-advance to next item

## Image Export System
- Export size: 1080×1350px (Instagram-optimized)
- Background options: solid colors, gradients, custom upload with blur (blurRadius=8)
- Custom upload via `expo-image-picker`
- "رُوح المسلم" branding watermark at bottom
- Gradient presets: green→teal, navy→indigo, purple→pink

## Settings Architecture (Restructured)
Settings page organized into 8 sections (in order):
1. **العرض** (Display) — Language, Display settings
2. **الإشعارات** (Notifications) — Master toggle + link to notification config
3. **الودجات** (Widgets) — Widget settings, gallery
4. **إعدادات الأذكار** (Adhkar) — Sound, vibration, counter
5. **النسخ الاحتياطي** (Backup) — Backup/restore
6. **مشاركة التطبيق** (Share App) — Platform share
7. **عن التطبيق** (About) — Version, privacy, terms
8. **روابط مفيدة** (Useful Links) — Rate, contact

**No theme/appearance settings** — theme picker, background colors/images removed from settings.

## Tasbih Daily Reset
- Auto-resets counter at midnight (date change detection)
- Saves previous day's counts to `@tasbih_daily_history`: `{ [YYYY-MM-DD]: { [tasbihName]: count } }`
- Tracks last active date in `@tasbih_last_date`
- Shows toast on reset: "تم حفظ تسبيحات الأمس وإعادة تعيين العداد"

## Home Page Collapsible Sections
- Sections wrapped in `CollapsibleSection` with spring animation (damping: 18, stiffness: 240)
- Collapsible: Highlights, Quick Access, Azkar, Duas, Worship
- NOT collapsible: Welcome banner, Date display
- Collapsed state persisted in `@home_collapsed_sections`
- RTL header: chevron on left, title+icon on right

## Islamic Events Calendar
- Route: `/hijri` — Full Gregorian calendar grid with Hijri overlay
- Each day cell shows: Gregorian date (primary) + Hijri date (secondary)
- Islamic events highlighted with colored dots (11 events defined)
- Month navigation with RTL arrows
- Events list below calendar for selected month
- Static `ISLAMIC_EVENTS` array keyed by Hijri month/day

## Verse of the Day Display
- Mushaf-style with `KFGQPCUthmanic` font (28px)
- Verse number in ornamental brackets: ﴿١٢٣﴾ (Arabic numerals)
- Surah name displayed above verse
- Ornamental dividers: `✦ ─── ✦`
- Parchment-style card with cream/warm background
- Translation below with proper LTR direction

## Story of the Day Backgrounds
- Pexels API video backgrounds with daily caching
- Search terms cycled by day of year (nature, sky, ocean, sunrise, etc.)
- Video: autoplay, loop, muted via `expo-av` Video component
- `LinearGradient` overlay `['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']` for text readability
- Fallback: 5 solid dark colors if no internet (deep green, navy, purple, brown, teal)
- White text on dark backgrounds

## Widget System (Extended)
- Widget icon assets: `assets/images/widgets/` with README
- Widget design files: `assets/design/widgets/` with config.json per widget
- Icon paths mapped in `lib/widget-data.ts` via `WIDGET_ICON_PATHS`
- Gallery thumbnails: selected = green border (2px), unselected = opacity 0.7
- No glass card wrappers around individual thumbnails

## Bottom Navigation Icons
- Home: `home-variant-outline` / `home-variant`
- Quran: `book-open-variant`
- Prayer: `mosque`
- Tasbih: `counter`
- Settings: `cog-outline` / `cog`

## Critical - App Initialization
- All async operations wrapped in `initWithTimeout()` with individual timeouts (5-8s)
- `SplashScreen.hideAsync()` called in `finally` block — always runs even on error
- 12-second safety timeout forces splash screen hide if everything else hangs
- Font loading error treated as "ready with degraded fonts" — app still opens
- Each Firebase operation independently try/caught — one failure doesn't block others
- Console logs at each step for debugging: `🚀`, `📱`, `🔥`, `💾`, `✅`

## Surah Navigation
- All surah links navigate to Mushaf: `router.push('/surah/{number}')`
- Ayat Al-Kursi: `router.push('/surah/2?ayah=255')`
- No separate surah pages — unified Mushaf experience with user settings
- `app/special-surah.tsx` deprecated (can be deleted)
- `app/night-reading.tsx` redirects to `/(tabs)/quran`

## Notifications - Unified System
- All notification types in one page: `app/settings/notifications.tsx`
- Adhkar reminders merged into notifications (morning, evening, sleep, wakeup, after prayer)
- `app/azkar-reminder.tsx` redirects to `/settings/notifications`
- Each notification type expandable with settings dropdown
- Settings context tracks: `sleepAzkar`, `wakeupAzkar`, `afterPrayerAzkar` with time fields

## Adhkar Listen Mode
- Show audio player only, no text cards
- Clean centered interface: headphones icon, track counter, title, controls
- Play/Pause, Previous/Next track buttons
- Seekable progress bar with elapsed/total time
- Track dot indicators for queue position
- Read mode content unchanged

## Stories System
- Full HTML stories in `data/stories.ts` with TypeScript interfaces
- Template: `assets/stories/template.html` — RTL, dark/light mode, Quran quotes
- Renderer: `lib/story-renderer.ts` — `renderStory(story, isDarkMode)` returns HTML
- 4 complete stories: Ibrahim, Musa, Abu Bakr, Omar (1000+ words each)
- Stories are educational, in Arabic, with real Quran verses

## PDF Export
- Header: inline SVG logo + "روح المسلم" text, `#0f987f` accent
- Footer: "روح المسلم — Ruh Al-Muslim" + rooh-almuslim.com
- All accent colors unified to `#0f987f`

## Verification Rule
- Before fixing: CHECK if issue exists
- If working correctly: DO NOT modify
- After fixing: VERIFY from user perspective
