# Widget Design Files

Design configuration files for each widget type in **روح المسلم**.

## Folder Structure

```
assets/design/widgets/
├── README.md                  ← This file
├── prayer_times/
│   ├── config.json            ← Widget settings & style tokens
│   ├── icon.svg               ← Widget icon (mosque)
│   └── background.svg         ← Background artwork
├── verse_of_day/
│   ├── config.json
│   ├── icon.svg               ← Widget icon (book)
│   └── background.svg
├── dhikr/
│   ├── config.json
│   ├── icon.svg               ← Widget icon (prayer beads)
│   └── background.svg
├── tasbih/
│   ├── config.json
│   ├── icon.svg               ← Widget icon (counter)
│   └── background.svg
├── hijri_date/
│   ├── config.json
│   ├── icon.svg               ← Widget icon (calendar)
│   └── background.svg
└── countdown/
    ├── config.json
    ├── icon.svg               ← Widget icon (timer)
    └── background.svg
```

## How to Use

Each widget folder contains:

| File              | Purpose                                                    |
|-------------------|------------------------------------------------------------|
| `config.json`     | Authoritative design tokens: sizes, colors, fonts, elements |
| `icon.svg`        | Widget preview icon (place manually)                       |
| `background.svg`  | Optional background artwork (place manually)               |

### config.json Schema

| Key          | Description                                                |
|--------------|------------------------------------------------------------|
| `name`       | English display name                                       |
| `nameAr`     | Arabic display name                                        |
| `version`    | Config version (semver-ish)                                |
| `sizes`      | Supported widget sizes: `small`, `medium`, `large`         |
| `colors`     | `text`, `accent`, `background` hex values                  |
| `fonts`      | Font family tokens for `title`, `body`, `numbers`          |
| `elements`   | Boolean flags for optional UI pieces (logo, dividers, etc) |
| `icon`       | MaterialCommunityIcons name used in the app                |
| `refreshInterval` | Auto-refresh interval (widget-specific)               |

### Referencing in Code

```ts
import prayerConfig from '@/assets/design/widgets/prayer_times/config.json';
```

Colors in these configs should stay in sync with the app's widget rendering code in `lib/widget-data.ts` and the native widget implementations under `android/` and `ios/`.

## Adding SVG Assets

SVG files (`icon.svg`, `background.svg`) are **not auto-generated** — place them alongside `config.json` in the appropriate folder. Recommended export size:

- **icon.svg**: 64 × 64 px viewBox
- **background.svg**: 400 × 200 px viewBox (scales to widget size)
