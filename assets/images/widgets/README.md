# Widget Icons — روح المسلم

This directory holds the custom icon assets used by home-screen widgets (iOS WidgetKit & Android Glance / RemoteViews) and by the in-app Widgets Gallery.

## Required Files

| Filename | Description | Suggested Size |
|---|---|---|
| `widget_prayer_times.png` | Mosque / prayer-times icon | 128×128 @2x, 192×192 @3x |
| `widget_verse.png` | Quran / open-book icon for the daily verse widget | 128×128 @2x, 192×192 @3x |
| `widget_dhikr.png` | Prayer-beads icon for the daily dhikr widget | 128×128 @2x, 192×192 @3x |
| `widget_hijri.png` | Calendar icon for the Hijri date widget | 128×128 @2x, 192×192 @3x |

## Usage

### In React Native (gallery & settings screens)

```tsx
import WidgetPrayerIcon from '@/assets/images/widgets/widget_prayer_times.png';
import WidgetVerseIcon  from '@/assets/images/widgets/widget_verse.png';
import WidgetDhikrIcon  from '@/assets/images/widgets/widget_dhikr.png';
import WidgetHijriIcon  from '@/assets/images/widgets/widget_hijri.png';
```

### In `lib/widget-data.ts`

The constant `WIDGET_ICON_PATHS` maps widget category IDs to their icon asset paths:

```ts
export const WIDGET_ICON_PATHS = {
  prayer: require('@/assets/images/widgets/widget_prayer_times.png'),
  ayah:   require('@/assets/images/widgets/widget_verse.png'),
  dhikr:  require('@/assets/images/widgets/widget_dhikr.png'),
  hijri:  require('@/assets/images/widgets/widget_hijri.png'),
};
```

## Design Guidelines

- Transparent background (PNG-24 with alpha).
- Single-color glyph style matching the app's existing icon language.
- Minimum padding: 8 px on each side inside the artboard.
- Export @2x and @3x variants for crisp rendering on high-DPI screens.
