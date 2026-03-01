# القرآن الكريم - Project TODO

## Core Setup
- [x] Configure theme colors (Islamic green + gold)
- [x] Install required packages (expo-location, expo-sensors, etc.)
- [x] Configure tab navigation (5 tabs)
- [x] Create Quran API service layer (AlQuran.cloud)
- [x] Create Prayer Times API service layer (AlAdhan)
- [x] Create Settings context/provider
- [x] Create Storage/Bookmarks service

## Home Screen
- [x] Last read surah card (with exact ayah tracking)
- [x] Daily verse widget (14 verses)
- [x] Prayer times countdown widget + city name
- [x] Quick access buttons (Surahs, Juz, Search, Bookmarks, Prayer, Qibla)
- [x] Hijri date display

## Quran Reading
- [x] Surahs list screen (114 surahs)
- [x] Surah reader screen with Arabic text
- [x] Juz list screen (30 juz)
- [x] Ayah options menu (play, bookmark, share, tafsir)
- [x] Translation toggle (Arabic/English/multiple)
- [x] Font size control (16px–42px)
- [x] Last read position tracking (exact ayah)
- [x] Auto-scroll to last read ayah on open
- [x] Sajda markers on relevant ayahs
- [x] Surah info bar (name, ayah count, type)
- [x] Search in Quran (full-text)

## Audio Recitation
- [x] Audio player per ayah (expo-audio)
- [x] Reciter selection (8 reciters)
- [x] Play/Pause controls
- [x] Now Playing bar with stop button
- [x] Continuous play toggle (auto-advance)
- [x] Quick play button inline (no need for modal)

## Tafsir
- [x] Tafsir screen for selected ayah
- [x] Multiple tafsir sources (Muyassar, Jalalayn, Sahih International, Asad)

## Bookmarks
- [x] Save/unsave ayahs (inline bookmark button)
- [x] Bookmarks list screen
- [x] Gold bookmark icon for saved ayahs

## Prayer Times
- [x] Location permission handling
- [x] Prayer times from AlAdhan API
- [x] Countdown to next prayer
- [x] Hijri date display
- [x] Next prayer highlight
- [x] City name display

## Qibla
- [x] Compass component
- [x] Device orientation sensor (Magnetometer)
- [x] Qibla direction calculation
- [x] Distance to Mecca

## Settings
- [x] Theme toggle (Light/Dark/Auto) with emoji labels
- [x] Font size setting with live Bismillah preview
- [x] Translation language selection (10 languages)
- [x] Reciter selection (8 reciters)
- [x] Prayer calculation method
- [x] Show/hide ayah numbers toggle
- [x] Continuous play toggle

## Branding
- [x] Generate app icon/logo (Islamic green + gold)
- [x] Update app.config.ts with branding
- [x] Configure splash screen

## Quality
- [x] Fix TypeScript errors (0 errors)
- [x] Unit tests passing
- [x] Save checkpoint
- [x] Fix package.json name from "app-template" to "quran-app"

## Improvements Added (v1.1)
- [x] Added inline bookmark button on each ayah (no need to open modal)
- [x] Sajda (prostration) markers with gold indicator
- [x] Now Playing bar showing which ayah is playing
- [x] Stop button in Now Playing bar
- [x] Play All button in surah header
- [x] Auto-scroll to last read ayah when reopening a surah
- [x] Last read now tracks exact ayah (not just surah)
- [x] Tapping an ayah updates last read position
- [x] Expanded translations to 10 languages + 2 Arabic tafsirs
- [x] Expanded reciters list to 8 reciters
- [x] Expanded daily verses from 7 to 14
- [x] City name shown on Home screen
- [x] Translation includes note when sharing
- [x] Surah info card (name, count, type) in reader
- [x] Font size range extended to 42px (was 40)
- [x] Live font preview in settings (Bismillah)
- [x] showAyahNumbers setting added
- [x] continuousPlay setting added
- [x] Consistent gold color for bookmarks
