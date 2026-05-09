# Notifications Device QA — مصفوفة الاختبار الشاملة

> Hand-off document for validating prayer-time notifications (especially the
> full adhan) on every aggressive-OEM Android skin and on iOS. Updated alongside
> the audit findings in `assets/sounds/adhan_full/README.md`.

## 1. Verified contracts (covered by `tests/adhan-durations.test.ts`)

| Contract | Source | Verified by |
| -------- | ------ | ----------- |
| Every `adhan_full_*.mp3` is 35.0 s ±200 ms | `assets/sounds/adhan_full/source-map.json` | `adhan-durations.test.ts` (4 tests) |
| Every short adhan in `assets/sounds/*.mp3` ≤ 30 s | iOS `UNNotificationSound` cap | same |
| Every `notif_*.mp3` ≤ 30 s | same | same |
| `source-map.json` byte counts match disk | maintainability | same |

Run locally with `pnpm test tests/adhan-durations.test.ts` (requires ffmpeg in PATH).

## 2. Manual device matrix

For each row: enable Settings → Notifications → "تشغيل الأذان الكامل", set the
next prayer 90 seconds in the future, **lock the device**, wait, and record the
result.

| Device class | Build.MANUFACTURER | Detected as aggressive (`oemAutoStart`) | Banner shown | Auto-Start deep-link target | Expected full adhan |
| ------------ | ------------------ | ----------- | ------------ | --------------------------- | ------------------- |
| iPhone 12+ (iOS 17+) | n/a | n/a (iOS) | Background-Refresh banner if disabled | `Linking.openSettings()` | ~29-30 s (Apple cap) |
| Pixel / stock Android 14 | `Google` | `standard` | none | `ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS` | 35 s |
| **Tecno (HiOS 13)** | `TECNO MOBILE LIMITED` | **`aggressive`** ✅ (new) | "إعدادات Tecno الإضافية" | `com.transsion.phonemaster` → AppManager / AutoStart / PowerManager | 35 s |
| **Infinix (XOS 12)** | `INFINIX MOBILITY LIMITED` | **`aggressive`** ✅ (new) | "إعدادات Infinix الإضافية" | same as Tecno | 35 s |
| **itel** | `itel` | **`aggressive`** ✅ (new) | "إعدادات itel/Transsion الإضافية" | same as Tecno | 35 s |
| Samsung S22+ (One UI 6) | `samsung` | **`aggressive`** ✅ (new) | "إعدادات Samsung الإضافية" | `com.samsung.android.lool` BatteryActivity | 35 s |
| Xiaomi / MIUI 14 | `Xiaomi` | `aggressive` (existing) | "إعدادات Xiaomi/Redmi الإضافية" | MIUI Auto-Start manager | 35 s |
| Oppo / Realme (ColorOS 14) | `OPPO` | `aggressive` (existing) | "إعدادات Oppo/Realme الإضافية" | ColorOS startup manager | 35 s |
| Vivo (FuntouchOS 14) | `vivo` | `aggressive` (existing) | "إعدادات Vivo الإضافية" | iqoo secure | 35 s |
| Huawei (no GMS) | `HUAWEI` | `aggressive` (existing) | "إعدادات Huawei الإضافية" | systemmanager Startup | 35 s (no FCM fallback) |
| Honor | `HONOR` | `aggressive` (existing) | "إعدادات Honor الإضافية" | systemmanager Startup | 35 s |
| OnePlus (OxygenOS 14) | `OnePlus` | **`aggressive`** ✅ (new) | "إعدادات OnePlus الإضافية" | `com.oneplus.security` ChainLaunch | 35 s |
| Asus | `asus` | **`aggressive`** ✅ (new) | "إعدادات Asus الإضافية" | mobilemanager FunctionActivity | 35 s |
| Meizu (Flyme) | `Meizu` | **`aggressive`** ✅ (new) | "إعدادات Meizu الإضافية" | `com.meizu.safe` SmartBG / AppSec | 35 s |
| Lenovo / Motorola | `Lenovo` / `motorola` | **`aggressive`** ✅ (new) | "إعدادات Lenovo/Motorola الإضافية" | ZUI PureBackground (fallback to battery settings) | 35 s |
| Nokia / HMD | `HMD Global` / `Nokia` | **`aggressive`** ✅ (new) | "إعدادات Nokia الإضافية" | standard battery optimization | 35 s |
| Lava / Micromax / Karbonn | `LAVA` / `Micromax` / `Karbonn` | **`aggressive`** ✅ (new) | "إعدادات Lava/Micromax/Karbonn الإضافية" | standard battery optimization | 35 s |
| Ulefone / Doogee / Blackview / Cubot | `ulefone` / `DOOGEE` / `Blackview` / `cubot` | **`aggressive`** ✅ (new) | per-vendor banner | standard battery optimization | 35 s |
| ZTE / Nubia | `ZTE` / `nubia` | **`aggressive`** ✅ (new) | "إعدادات ZTE/Nubia الإضافية" | `cn.nubia.security2` AppManage | 35 s |
| Wiko / Gionee / Coolpad | `WIKO` / `GIONEE` / `Coolpad` | **`aggressive`** ✅ (new) | per-vendor banner | standard battery optimization | 35 s |
| LeEco / LeTV | `LeEco` | **`aggressive`** ✅ (new) | "إعدادات LeEco الإضافية" | `com.letv.android.letvsafe` Autoboot | 35 s |

Rows marked **✅ (new)** were added in this audit's implementation pass; the
others were already covered.

> **Stock Android (Pixel, Android One devices outside Nokia, GMS-AOSP forks)**
> remain `oemAutoStart === 'standard'` — no banner is shown because no
> proprietary kill is needed. Battery Optimization banner still fires if the
> system reports the app is restricted.

## 3. Per-device checklist (replicate for each row above)

1. Fresh install of the latest build.
2. Open the app, grant notifications + location.
3. Settings → Notifications → enable "أوقات الصلاة" + enable "تشغيل الأذان الكامل".
4. **Verify the OEM banner** appears within 5 s of opening the home screen
   (only on aggressive OEMs).
5. Tap the banner → confirm system Settings opens at the right destination
   (Auto-Start / Battery / App Management). Allow whitelist.
6. Set system clock so the next prayer is 90 s from now (or use Settings →
   Notifications → "إرسال إشعار تجريبي" if available).
7. Lock the device, place screen face-down to avoid wake-on-glance.
8. Wait. Verify:
   - **Heads-up notification appears at exact second** (≤ 1 s drift).
   - **Audio starts immediately**.
   - **Audio plays for the full 35 s on Android / ~29-30 s on iOS** —
     no early cut, no silence gap.
   - The "Stop" action button on Android stops audio cleanly.
9. Force-stop the app from system app info, **wait 24 h**, then verify the
   next prayer notification still fires correctly. (This is the canary for
   OEM background-kill regressions.)
10. With "Do Not Disturb" enabled and no `ACCESS_NOTIFICATION_POLICY` granted,
    confirm the app shows the DND banner at home and that adhan is muted as
    expected.

## 4. Regression smoke checks (run on any device after every adhan-related PR)

- `pnpm test tests/adhan-durations.test.ts` — duration contract.
- `node -e "const m=require('./assets/sounds/adhan_full/source-map.json');console.log(Object.keys(m).length)"` →
  must print `14`.
- Trigger a test prayer notification from Settings → Notifications →
  "اختبر الإشعار" and confirm the right channel + sound plays.
- Open `app/settings/notifications.tsx` and verify the diagnostics readout
  (channel count, scheduled count, OEM, last diag log). If a Notification
  Health screen ships later, repeat there.

## 5. Known limitations / non-goals

- **Doubled audio for ~15 s on Android** when `useFullAdhan` is on — by design
  (Layer-2 safety net). See `assets/sounds/adhan_full/README.md` § "Layer-2
  safety-net audio overlap".
- **Huawei devices without Google Play Services** cannot use the FCM push
  fallback (`lib/fcm-prayer-sync.ts`). Local scheduling only.
- **iOS budget hard limit = 64 scheduled notifications.** Worst-case math in
  `lib/notifications-manager.ts:60-125` lands at 53 / 64 with 1 time/day per
  category. Power users enabling 2 times/day across every category can reach
  86 / 64 → silent drops. `auditIosNotificationBudget()` warns at ≥ 56.
- **Android < 12** falls back to `setExact` instead of
  `setExactAndAllowWhileIdle`; behavior in Doze is identical for our needs.

## 6. What to do if a device fails

1. Capture `adb logcat | grep -E "AdhanPlaybackService|FullAdhanModule|prayer-notif|NotifHealth"`
   for the 60 s before and after the missed prayer.
2. Pull `@notification_diag_log` from AsyncStorage (developer settings → diag).
3. Note `Build.MANUFACTURER`, `Build.MODEL`, OS version, and any battery saver
   / Auto-Start state.
4. File a GitHub issue with the above + a screen recording of the missing
   notification.
