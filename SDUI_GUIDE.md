# Server-Driven UI (SDUI) — نظام الواجهة الديناميكية

## Overview

The SDUI system allows the admin panel to control UI sections dynamically without requiring app updates. This includes:

- **Dynamic Section Management**: Enable/disable, reorder, add/remove sections from Firebase
- **HTML Injection**: Inject custom HTML content with native glassmorphism styling
- **Conditional Display**: Show sections based on season, time, feature flags, etc.
- **Real-time Updates**: Changes sync immediately via Firebase listeners

## Architecture

```
lib/sdui/
├── types.ts           # TypeScript interfaces for all SDUI types
├── section-registry.tsx   # Maps section types to React components
├── use-sdui.ts        # React hooks for fetching SDUI configs
└── index.ts           # Module exports

components/ui/
├── DynamicScreen.tsx  # Container that renders SDUI sections
└── GlassHTML.tsx      # HTML renderer with glassmorphism

lib/
└── app-config-api.ts  # Firebase API for SDUI configs
```

## Usage

### Basic Integration

```tsx
import { useSDUIScreen } from '@/lib/sdui';
import { DynamicScreen } from '@/components/ui/DynamicScreen';

export function HomeScreen() {
  const { config, loading, error, refresh } = useSDUIScreen('home');
  
  // If no SDUI config exists, render default content
  if (!config && !loading) {
    return <DefaultHomeScreen />;
  }
  
  return (
    <DynamicScreen
      config={config}
      loading={loading}
      error={error}
      onRefresh={refresh}
    />
  );
}
```

### Hybrid Approach (Recommended)

Mix SDUI sections with static components:

```tsx
import { useSDUIScreen, getSectionsByType } from '@/lib/sdui';
import { DynamicScreen } from '@/components/ui/DynamicScreen';
import { StaticHeader } from './StaticHeader';
import { StaticFooter } from './StaticFooter';

export function HomeScreen() {
  const { config, loading, refresh } = useSDUIScreen('home');
  
  return (
    <DynamicScreen
      config={config}
      loading={loading}
      onRefresh={refresh}
      prependSections={<StaticHeader />}
      appendSections={<StaticFooter />}
    />
  );
}
```

### Using GlassHTML Directly

```tsx
import { GlassHTML } from '@/components/ui/GlassHTML';

<GlassHTML
  html="<h1>مرحباً بكم</h1><p>هذا نص ديناميكي من الخادم</p>"
  useGlassContainer={true}
  useAppTypography={true}
  blurIntensity={60}
/>

// Or fetch from URL
<GlassHTML
  htmlUrl="https://your-api.com/content.html"
  useGlassContainer={true}
/>
```

## Firebase Structure

### Collection: `sdui_screens`

Each document represents a screen configuration:

```json
{
  "screenId": "home",
  "title": "الصفحة الرئيسية",
  "updatedAt": "2024-01-15T10:00:00Z",
  "version": 1,
  "settings": {
    "refreshable": true,
    "animateScroll": true
  },
  "sections": [
    {
      "id": "welcome_banner_1",
      "type": "welcome_banner",
      "enabled": true,
      "order": 1,
      "data": {
        "greeting": "رمضان مبارك 🌙",
        "icon": "moon-waning-crescent",
        "color": "#2f7659"
      }
    },
    {
      "id": "html_announcement",
      "type": "html_block",
      "enabled": true,
      "order": 2,
      "data": {
        "html": "<div class='ayah'>﴿وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا﴾</div>",
        "useGlassContainer": true,
        "useAppTypography": true,
        "blurIntensity": 60
      }
    },
    {
      "id": "quick_actions_1",
      "type": "quick_actions",
      "enabled": true,
      "order": 3,
      "conditions": {
        "onboardingComplete": true
      },
      "data": {
        "columns": 4,
        "items": [
          {
            "id": "morning",
            "title": "أذكار الصباح",
            "icon": "weather-sunny",
            "color": "#f5a623",
            "route": "/azkar/morning"
          }
        ]
      }
    }
  ]
}
```

## Section Types

| Type | Description | Key Data Fields |
|------|-------------|-----------------|
| `welcome_banner` | Hero banner with greeting | `greeting`, `icon`, `color`, `route` |
| `quick_actions` | Grid of action buttons | `columns`, `items[]` |
| `highlights_grid` | Feature highlights | `layout`, `items[]` |
| `html_block` | Custom HTML content | `html`, `htmlUrl`, `useGlassContainer` |
| `featured_content` | Daily hadith/story | `contentType`, `content` |
| `prayer_times` | Prayer time display | `showNextPrayer`, `compact` |
| `daily_ayah` | Verse of the day | `showTranslation`, `showTafsir` |
| `azkar_categories` | Azkar category list | `layout`, `categories[]` |
| `khatma_progress` | Quran progress tracker | `showActiveKhatma` |
| `worship_stats` | Worship statistics | `period`, `showPrayer` |
| `seasonal_banner` | Seasonal promotion | `season`, `title`, `backgroundColor` |
| `custom_cards` | Custom card list | `layout`, `cards[]` |
| `image_carousel` | Image slider | `autoPlay`, `images[]` |
| `announcement` | Alert/banner | `message`, `type`, `dismissible` |
| `spacer` | Empty space | `height` |

## Conditions

Sections can have conditional visibility:

```json
{
  "conditions": {
    "seasons": ["ramadan", "hajj"],
    "daysOfWeek": [5],
    "timeRange": { "start": "04:00", "end": "06:00" },
    "onboardingComplete": true,
    "featureFlag": "experimental_feature"
  }
}
```

## Adding New Section Types

1. Add type to `SDUISectionType` in `types.ts`
2. Create interface extending `BaseSectionConfig`
3. Create component in `components/sdui/`
4. Register in `section-registry.tsx`

```tsx
// 1. types.ts
export interface MyNewSection extends BaseSectionConfig {
  type: 'my_new_section';
  data: { ... };
}

// 2. components/sdui/MyNewSection.tsx
export function MyNewSectionComponent({ config }: SectionProps<MyNewSection>) {
  return <View>...</View>;
}

// 3. section-registry.tsx
import { MyNewSectionComponent } from '@/components/sdui/MyNewSection';

const sectionRegistry = {
  ...
  my_new_section: { component: MyNewSectionComponent },
};
```

## HTML Styling Classes

GlassHTML supports these CSS classes for Islamic content:

| Class | Purpose |
|-------|---------|
| `.arabic` | Arabic text (Amiri font, centered) |
| `.ayah` | Quranic verse (larger, centered, spaced) |
| `.dua` | Supplication (RTL, Amiri font) |

Example:
```html
<div class="ayah">
  بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
</div>
<p>Translation text here</p>
```

## Real-time Updates

Changes in Firebase sync automatically:

```tsx
const { config } = useSDUIScreen('home', { realtime: true });
// Config updates automatically when admin changes it
```

Disable for performance:
```tsx
const { config } = useSDUIScreen('home', { realtime: false });
```

## Cache Strategy

- Configs are cached in AsyncStorage
- Cache is used when offline or on error
- Each screen has its own cache key
- Clear cache: `await clearSDUICache()`
