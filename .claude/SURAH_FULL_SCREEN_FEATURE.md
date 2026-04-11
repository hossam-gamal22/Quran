# Feature: Full Surah Reading Screen with Audio & Al-Kahf Friday Reminder

## Project Context
- Framework: React Native / Expo
- Project path: /Users/hossamgamal/Desktop/MobileApps/Quran/
- RTL-first app (Arabic UI), uses i18n from lib/i18n.ts
- Notification system: expo-notifications with pre-created channels
- Existing Quran API: check current usage in the codebase (quran.com or alquran.cloud)
- Font: app uses a custom Mushaf/Uthmanic Arabic font — locate it in assets/fonts/

## Goal
Build a standalone SurahFullScreen that displays a complete Quran surah in Mushaf style,
with integrated audio playback and text sharing. For Surah Al-Kahf (number 18) specifically,
trigger a Friday reminder setup dialog when the user opens the surah.

---

## STEP 1 — AUDIT FIRST (Plan Mode)

Before writing any code, search the codebase and answer:

1. What Quran API is currently used? (quran.com v4, alquran.cloud, or local JSON?)
   - Check: services/, api/, hooks/, any existing Quran screens
2. What is the exact font family name for the Mushaf/Uthmanic font?
   - Check: assets/fonts/, app.json or app.config.ts (usesNextSbucketFont or expo-font)
3. How is navigation structured? (Expo Router file-based or React Navigation stack?)
   - Check: app/ directory structure or navigation/ folder
4. Where are the Quick Access surah cards defined?
   - Search for: "سورة الكهف" OR "surahId" OR "AlKahf" in components/screens
5. How is audio currently handled?
   - Check: expo-av, expo-audio, or react-native-track-player usage
6. What is the existing notification scheduling pattern?
   - Check: hooks/useNotifications or similar, look for how prayer notifications are scheduled
7. What is the existing Friday Al-Kahf notification setup (if any)?
   - Search: "kahf" OR "friday" OR "جمعة" in the codebase

Report findings before proceeding.

---

## STEP 2 — CREATE SurahFullScreen

### File: app/surah/[id].tsx  (or screens/SurahFullScreen.tsx based on nav structure found)
```tsx
// Complete standalone surah reading screen
// Props/params: surahNumber (number), surahName (string), surahNameAr (string)

// UI Requirements:
// - Header: surah name (Arabic) centered, back button (RTL-aware)
// - Top action bar: [🔊 استمع] [📤 مشاركة] buttons
// - Body: ScrollView with ALL verses rendered
//   - Bismillah banner at top (except Al-Fatihah and Al-Tawbah)
//   - Each verse: Arabic text in Mushaf font, verse number badge inline (﴿١﴾ style)
//   - Font size: 22-24px, line height: 2.0, textAlign: 'center' or 'right' per Mushaf style
//   - Background: match app dark theme
// - Audio player: sticky bottom bar when playing
//   - Reciter name, play/pause, progress slider, next/prev ayah buttons

// Data fetching:
// - Use existing Quran API pattern found in Step 1
// - Endpoint example (alquran.cloud): GET /surah/{surahNumber}/ar.uthmani
// - Endpoint example (quran.com v4): GET /chapters/{surahNumber}/verses?translations=131&language=ar
// - Cache response in AsyncStorage with key: surah_cache_{surahNumber}

// Audio:
// - Use EveryAyah or mp3quran.net CDN pattern:
//   https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/{surahNumber}.mp3
// - Or use existing audio URL pattern from the codebase

// Share:
// - Use React Native Share API
// - Share text = surah name + all verses joined with \n
// - Format: "سورة {name}\n\n{verse1}\n{verse2}..."
```

---

## STEP 3 — CREATE AlKahfReminderSheet

### File: components/AlKahfReminderSheet.tsx
```tsx
// Bottom sheet / Modal that appears ONCE when user opens Surah Al-Kahf (surahNumber === 18)
// Only show if: user hasn't set a preference yet OR show again option

// UI:
// - Title: "متى تحب أن نذكرك بقراءة سورة الكهف؟"
// - Subtitle: "سيتم إرسال تذكير كل يوم جمعة في الوقت الذي تختاره"
// - Time picker (iOS: DatePickerIOS wheel, Android: TimePickerAndroid)
// - Default time: 08:00 AM Friday
// - Confirm button: "تأكيد التذكير"
// - Skip button: "ليس الآن"

// On Confirm:
// 1. Save selected time to AsyncStorage: key = 'kahf_reminder_time', value = { hour, minute }
// 2. Cancel ALL existing scheduled notifications with identifier containing 'kahf_friday'
// 3. Schedule a WEEKLY repeating notification:
//    - weekday: 6 (Friday in expo-notifications, check if 1=Sunday or 1=Monday)
//    - hour: selected hour
//    - minute: selected minute
//    - title: "تذكير قراءة سورة الكهف 📖"
//    - body: "الجمعة نور من جمعة إلى جمعة — اقرأ سورة الكهف الآن"
//    - identifier: 'kahf_friday_reminder'
//    - Use existing notification channel if available, else channelId: 'kahf_reminders'
//    - Sound: use existing notification sound pattern

// Show this sheet logic:
// - AsyncStorage.getItem('kahf_reminder_shown') — if null → show sheet
// - After showing (whether confirmed or skipped), set 'kahf_reminder_shown' = 'true'
// - Add a settings option later to reset this (out of scope here)
```

---

## STEP 4 — WIRE UP NAVIGATION

### From Quick Access Cards (سور وآيات قرآنية section):
Find the component that renders these 6 cards and update navigation:
- "سورة الكهف" → navigate to SurahFullScreen with { surahNumber: 18, surahNameAr: 'سورة الكهف' }
- "سورة يس" → { surahNumber: 36, surahNameAr: 'سورة يس' }
- "سورة الملك" → { surahNumber: 67, surahNameAr: 'سورة الملك' }
- "آية الكرسي" → special case: show only Ayah 255 from Al-Baqarah (2:255) — use same screen
  with surahNumber: 2, highlightAyah: 255
- "آية اليوم" → existing feature, do not break
- "المصحف الكامل" → existing Quran browser, do not break

### From Quran Surah List (Image 2 — the bottom sheet surah picker):
Find where tapping a surah row navigates to — update it so:
- Tapping any surah → SurahFullScreen with that surahNumber
- Exception: if "المصحف الكامل" mode is active → existing paginated Mushaf behavior

---

## STEP 5 — NOTIFICATION CHANNEL

If a dedicated channel for Al-Kahf doesn't exist, add it to the channels initialization:
```ts
// In the file where setupNotificationChannels() is defined
{
  id: 'kahf_reminders',
  name: 'تذكير سورة الكهف',
  importance: AndroidImportance.HIGH,
  sound: 'general_reminder', // or whichever notification sound fits
  vibrationPattern: [0, 250, 250, 250],
}
```

---

## Execution Rules
- Do NOT modify the existing paginated Mushaf/Quran browser
- Do NOT change RTL logic — respect existing isRTL() from lib/i18n.ts
- All new strings must be added to translations.ts for all 12 languages
  (Arabic + English minimum, flag others with TODO comment)
- Run `npx tsc --noEmit` after all changes
- Run `grep -r "kahf_friday" .` to confirm notification identifier consistency
- Do NOT hardcode colors — use existing theme tokens/colors from the design system

## Translation keys to add (add to ALL 12 languages):
```
surah_full_screen_listen: "استمع"
surah_full_screen_share: "مشاركة"
surah_full_screen_share_text: "سورة {name} من تطبيق روح المسلم\n\n{verses}"
kahf_reminder_title: "متى تحب أن نذكرك؟"
kahf_reminder_subtitle: "سيتم إرسال تذكير كل يوم جمعة"
kahf_reminder_confirm: "تأكيد التذكير"
kahf_reminder_skip: "ليس الآن"
kahf_notification_title: "تذكير قراءة سورة الكهف 📖"
kahf_notification_body: "الجمعة نور من جمعة إلى جمعة — اقرأ سورة الكهف الآن"
```