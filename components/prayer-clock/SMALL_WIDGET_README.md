Small (systemSmall / 2x2) Prayer Widget — Implementation notes

- Files added:
  - `ios/PrayerClockWidget/PrayerClockWidget.swift` — WidgetKit scaffold (systemSmall)
  - `android/PrayerClockWidget/PrayerClockGlance.kt` — Jetpack Glance scaffold (2x2)
  - `assets/images/prayer-logo.svg` — extracted Heart/Moon logo asset

- Important integration steps:
  1. Add `prayer-logo` to each platform's image/catalog resources (iOS Asset Catalog, Android drawable). The repo contains an SVG; convert to required format (PDF/PNG/vector drawable) as desired.
  2. Wire dynamic data (next prayer time/name) via a shared container or platform-specific background worker:
     - iOS: Use App Groups/Shared container or Intents to pass next prayer time to the Widget extension.
     - Android: Use WorkManager/Glance state to update the widget content every minute or when prayer times change.
  3. Fonts: include `Amiri` and `Cairo` in each platform's resource and reference them from the widget view code.
  4. Background: Widgets must use native blur/frosted material:
     - iOS: `.ultraThinMaterial` is used in the SwiftUI view.
     - Android: apply `RenderEffect` or host-side blur; Glance/RemoteViews limitations may require a small transparent PNG blur background generated at runtime.

This scaffold maps the SVG structure to native layout elements and intentionally strips the static solid background in favor of native glassmorphism.
