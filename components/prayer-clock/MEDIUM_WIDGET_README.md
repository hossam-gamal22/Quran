Medium (systemMedium / 4x2) Prayer Widget — Implementation notes

Files added:
- `ios/PrayerClockWidget/PrayerClockWidgetMedium.swift` — WidgetKit scaffold (systemMedium)
- `android/PrayerClockWidget/PrayerClockGlanceMedium.kt` — Jetpack Glance scaffold (4x2)

Notes:
- Layout: maps the SVG to an HStack/Row with left column for countdown and right column for logo + title.
- Dynamic fields: do not hardcode the countdown or next prayer name — read them from a shared container / worker and update the widget timeline/state.
- Background: static background stripped; use `.ultraThinMaterial` on iOS and RenderEffect/host blur strategies on Android to preserve the app glassmorphism.
- Asset: reuse `assets/images/prayer-logo.svg` — convert and add to platform resources (`Assets.xcassets` on iOS, drawable on Android).

Integration:
- iOS: wire App Group or Intents to provide `remainingSeconds` and `nextPrayerName` to the widget extension.
- Android: use WorkManager or Glance state APIs to update widget content; consider RenderEffect limitations and generate a small blurred bitmap as fallback.
