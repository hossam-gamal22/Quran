# PrayerStatic Asset Catalog

This folder contains the **baked static PNGs** consumed by `PrayerStaticOverlay.swift`
in the iOS widget extension. Each PNG is the entire fixed visual layer of a
prayer widget for one specific (kind × size × theme × language × state)
combination. The native overlay draws only numeric values on top.

## Asset naming convention

```
<widgetId>_<size>_<theme>_<lang>_<state>.imageset/<widgetId>_<size>_<theme>_<lang>_<state>.png
prayerNextPrevious_<size>_<theme>_<lang>_<prev>_<next>.imageset/<same>.png
```

| Token | Values |
|-------|--------|
| `widgetId` | `prayerSingle` \| `prayerTable` \| `prayerNextPrevious` |
| `size` | `small` \| `medium` \| `large` (size availability per widget — see registry) |
| `theme` | `light` \| `dark` \| `olive` \| `green` \| `blue` \| `desert` \| `slate` |
| `lang` | `ar` \| `en` |
| `state` (prayerSingle / prayerTable) | `fajr` \| `sunrise` \| `dhuhr` \| `asr` \| `maghrib` \| `isha` |
| `prev_next` (prayerNextPrevious) | `isha_fajr` \| `fajr_sunrise` \| `sunrise_dhuhr` \| `dhuhr_asr` \| `asr_maghrib` \| `maghrib_isha` |

Examples:
- `prayerSingle_small_dark_ar_fajr.imageset/prayerSingle_small_dark_ar_fajr.png`
- `prayerTable_medium_olive_en_dhuhr.imageset/prayerTable_medium_olive_en_dhuhr.png`
- `prayerNextPrevious_medium_slate_ar_sunrise_dhuhr.imageset/prayerNextPrevious_medium_slate_ar_sunrise_dhuhr.png`

## Capture dimensions (@3x raster)

| Size | Logical (pt) | `@3x` raster (px) |
|------|--------------|---------------------|
| small  | 155 × 155 | 465 × 465 |
| medium | 329 × 155 | 987 × 465 |
| large  | 329 × 345 | 987 × 1035 |

## What goes IN the PNG

Everything fixed and state-dependent:

- Rounded card background, corners, shadow
- All prayer name labels (Arabic + matching layout for English bake)
- Header label "الصلاة القادمة" / "Next Prayer"
- Countdown labels "بعد" / "منذ" / "in" / "since"
- Per-prayer row icons
- The **active-row highlight bar** at the row position for `<state>`
- The **active / next / previous prayer name** rendered large in the hero panel
- "روح المسلم" / "Ruh Al-Muslim" watermark on the large size

## What does NOT go in the PNG

Only the truly dynamic numeric values, drawn at runtime by
`PrayerStaticOverlay`:

- Clock time digits (`H:MM` or `h:mm a`)
- Live countdown (`Text(date, style: .timer)`)

## Baking workflow

1. Run the in-app bake route (see `app/dev/widget-snapshots.tsx` for the
   existing pattern) which iterates the 420-combination matrix and writes
   PNGs to `${FileSystem.documentDirectory}prayer-static-bake/` on a
   simulator.
2. Pull the baked folder out of the simulator (the dev route prints the
   absolute path; on macOS use `xcrun simctl get_app_container booted
   <bundle-id> data` to find it).
3. Run the imageset builder:
   ```
   pnpm build-prayer-imagesets <pulled-folder>
   ```
4. Inspect a few imagesets visually in Xcode's Asset Catalog editor.
5. Commit `widgets/ios/Assets.xcassets/PrayerStatic/` to git.
6. `pnpm expo prebuild --clean --platform ios && pnpm ios`
7. Verify on the simulator's Home Screen.

## When to re-bake

- Design change to any preview component under `components/widgets/previews/`
- Adding a new theme to the theme set
- Adjusting any layout constant in the preview (font sizes, padding, etc.)
- Adding English-language bakes (currently Arabic-only is in scope)

## Fallback

If an expected asset is missing (e.g., a new state was added but not yet
baked), `PrayerStaticOverlay.swift` returns a graceful fallback — the
existing native SwiftUI prayer views (`PrayerSingleView` etc. in
`RoohWidgets.swift`) render with the user's current 7-day epoch cache. The
widget never shows a broken layout.
