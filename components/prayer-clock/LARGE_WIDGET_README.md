Large (systemLarge / 4x4) Prayer Widget — Implementation notes

Files added:
- `ios/PrayerClockWidget/PrayerClockWidgetLarge.swift` — WidgetKit scaffold (systemLarge)
- `android/PrayerClockWidget/PrayerClockGlanceLarge.kt` — Jetpack Glance scaffold (large)

Notes & requirements:
- Layout: Top header is an HStack/Row with countdown (left) and logo+title (right). Below is a vertical list of six prayer rows.
- Active row: the upcoming prayer row should be highlighted using a green border, semi-transparent green background, a solid green time pill, and white text. The scaffolds include placeholders; wire `upcomingIndex` and prayer times from shared data.
- Background: remove the static SVG backgrounds and use native blur:
  - iOS: `.ultraThinMaterial` is already applied in the SwiftUI scaffold.
  - Android: Glance may not fully support RenderEffect; for Android, prefer generating a small pre-blurred bitmap or use host-side RenderEffect where available.
- Contrast: widget text uses pure white (`#FFFFFF`) to ensure legibility against the frosted glass.

Integration hints:
- iOS: supply prayer times and upcomingIndex via App Group or Intents and update the widget timeline frequently enough (every minute) if you want a live countdown.
- Android: use WorkManager to compute prayer times and update Glance state; implement active row styling when building RemoteViews/Glance content.
