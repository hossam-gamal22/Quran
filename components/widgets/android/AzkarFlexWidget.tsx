// components/widgets/android/AzkarFlexWidget.tsx
//
// Live azkar / daily-dhikr widget for Android. Bypasses the PNG snapshot
// pipeline entirely so the body chunk advances visibly when the content
// refresh alarm fires (every 15 min). Mirrors iOS's BundledAzkar slot
// picking: each render call reads `sharedData.azkarPools` (or `data.dhikr`)
// + the current minute-of-day and picks the active (zikr, chunkIndex)
// using the shared `pickAzkarSlot` / `resolveAzkarBodyText` helpers.
//
// Why FlexWidget instead of SnapshotWidget?
//   PNG snapshots are cached on disk and never change between snapshot-pump
//   runs (which only fire on app open). The body text of an azkar widget
//   needs to cycle independently of pump runs — by rendering with
//   FlexWidget + TextWidget we recompute everything fresh on each Android
//   task-handler invocation. No bake required.
//
// What's rendered: themed rounded card (same palette as the iOS widget)
// with title + body chunk + count badge, all using Rubik for parity with
// the SwiftUI AzkarQuoteView / DailyDhikrView output.

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import {
  pickAzkarSlot,
  resolveAzkarBodyText,
  detectQuranTitle,
  splitAzkarChunks,
  pickLongEnglishAzkarPage,
  quranTitleToEnglish,
  type WidgetZikrPoolEntry,
} from '@/lib/widget-azkar-helpers';
import { paletteFor } from './shared';
import { resolveWidgetTheme } from '@/lib/widgets/snapshot';

const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
function toArabicDigits(value: number | string): string {
  return String(value).replace(/[0-9]/g, (d) => AR_DIGITS[parseInt(d, 10)] ?? d);
}

function isArabicWidget(data: SharedWidgetData): boolean {
  const lang = (data.widgetLanguage ?? data.language ?? 'ar').toLowerCase();
  return lang === 'auto' ? true : lang.startsWith('ar');
}

function useArabicNumerals(data: SharedWidgetData, isAr: boolean): boolean {
  const n = (data.widgetNumerals ?? 'auto').toLowerCase();
  if (n === 'arabic') return true;
  if (n === 'western') return false;
  return isAr;
}

function englishAzkarFontSize(text: string, isSmall: boolean): number {
  if (isSmall) return text.length > 180 ? 10 : text.length > 120 ? 11 : text.length > 80 ? 12 : 14;
  if (text.length > 240) return 15;
  if (text.length > 200) return 16;
  if (text.length > 160) return 18;
  if (text.length > 110) return 20;
  return 22;
}

interface AzkarFlexWidgetProps {
  widgetId: 'azkarMorning' | 'azkarEvening' | 'dailyDhikr';
  size: 'small' | 'medium';
  data: SharedWidgetData;
  clickUri?: string;
}

const TILE_RADIUS = { small: 28, medium: 32 } as const;

export function AzkarFlexWidget({ widgetId, size, data, clickUri }: AzkarFlexWidgetProps): React.ReactElement {
  const theme = resolveWidgetTheme(data.widgetTheme, null);
  const p = paletteFor(theme);
  const isAr = isArabicWidget(data);
  const arabicNums = useArabicNumerals(data, isAr);
  const isSmall = size === 'small';

  // Resolve which zikr + chunk to display right now. Daily-dhikr picks
  // today's deterministic zikr (by day-of-year) and cycles chunks by
  // minute; morning/evening cycle through the whole pool by minute.
  const now = new Date();
  let slot: { zikr: WidgetZikrPoolEntry; chunkIndex: number } | null = null;
  let titleAr = '';
  let titleEn = '';

  if (widgetId === 'azkarMorning') {
    slot = pickAzkarSlot(data.azkarPools?.morning, now);
    titleAr = 'أذكار الصباح';
    titleEn = 'Morning Adhkar';
  } else if (widgetId === 'azkarEvening') {
    slot = pickAzkarSlot(data.azkarPools?.evening, now);
    titleAr = 'أذكار المساء';
    titleEn = 'Evening Adhkar';
  } else {
    // Daily dhikr — read from data.dhikr (built by prepareDhikrWidgetData);
    // wrap into a WidgetZikrPoolEntry so the shared slot picker works.
    const dh = data.dhikr;
    const arabicSource = dh?.arabic ?? 'سُبْحَانَ اللهِ وَبِحَمْدِهِ، سُبْحَانَ اللهِ الْعَظِيمِ';
    const quranTitle = detectQuranTitle(arabicSource);
    const chunks = quranTitle
      ? [quranTitle.startsWith('قراءة') ? quranTitle : `قراءة ${quranTitle}`]
      : splitAzkarChunks(arabicSource);
    const synth: WidgetZikrPoolEntry = {
      id: 0,
      arabic: arabicSource,
      count: Math.max(1, dh?.count ?? 100),
      reference: dh?.reference ?? '',
      benefit: dh?.benefit ?? '',
      displayChunks: chunks,
      quranTitle,
      // Bridge data already carries the English translation when available
      // (prepareDhikrWidgetData always includes it now). Lets the FlexWidget
      // switch to English prose at render time when the picker language is
      // English, without needing a fresh data refresh.
      translation: dh?.translation,
      quranTitleEn: quranTitle ? quranTitleToEnglish(quranTitle) : undefined,
    };
    const minute = now.getHours() * 60 + now.getMinutes();
    const idx = ((minute % chunks.length) + chunks.length) % chunks.length;
    slot = { zikr: synth, chunkIndex: idx };
    titleAr = ''; // dailyDhikr widget has no title row — matches iOS DailyDhikrView
    titleEn = '';
  }

  const fallback = isAr ? 'اللهم صل وسلم على نبينا محمد' : 'O Allah, send blessings upon Muhammad';
  let { text: bodyText, isQuran } = resolveAzkarBodyText(slot, fallback, isAr);
  if (widgetId === 'dailyDhikr' && !isAr && !isQuran) {
    const minute = now.getHours() * 60 + now.getMinutes();
    bodyText = pickLongEnglishAzkarPage(bodyText, minute);
  }
  const count = slot ? Math.max(1, slot.zikr.count) : 10;
  // ×-prefix format: "×10" not "10×" — reads naturally as "times 10".
  const countText = `×${arabicNums ? toArabicDigits(count) : String(count)}`;
  const reference = slot?.zikr.reference ?? '';
  const benefit = slot?.zikr.benefit ?? '';

  // Font + size match the iOS AzkarQuoteView / DailyDhikrView:
  //   Quran title → Rubik-Bold (largest)
  //   Arabic body chunk → Rubik-Regular
  //   English translation → Rubik-Medium at a smaller base size so the
  //                         longer prose fits in 4 lines without clipping.
  // Rubik-Bold for Quran title AND English body; Rubik-Regular only for
  // Arabic chunks.
  const bodyFont = isQuran || !isAr ? 'Rubik-Bold' : 'Rubik-Regular';
  const bodyFs = isQuran
    ? (isSmall ? 16 : widgetId === 'dailyDhikr' ? 22 : 21)
    : isAr
      ? (isSmall ? 13 : widgetId === 'dailyDhikr' ? 17 : 16)
      : englishAzkarFontSize(bodyText, isSmall);
  const titleFs = isSmall ? 11 : 13;
  const radius = TILE_RADIUS[size];

  // Arabic mode shows the title row; English mode hides it to free up the
  // body area for the longer translation prose (the widget label below the
  // tile already says "Morning Adhkar" / "Evening Adhkar").
  const showTitle = isAr && titleAr.length > 0;
  // benefit + reference are Arabic-only in azkar.json — hide them in
  // English mode to keep the tile language-coherent.
  const showMetadata = isAr && !isSmall && (benefit.length > 0 || reference.length > 0);

  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: p.bg,
        borderRadius: radius,
        paddingHorizontal: 12,
        paddingVertical: 8,
      }}
      clickAction="OPEN_URI"
      clickActionData={clickUri ? { uri: clickUri } : undefined}
    >
      {showTitle ? (
        <TextWidget
          text={isAr ? titleAr : titleEn}
          style={{
            fontFamily: 'Rubik-Bold',
            fontSize: titleFs,
            color: p.muted,
            textAlign: 'center',
          }}
          allowFontScaling={false}
          maxLines={1}
        />
      ) : null}

      <TextWidget
        text={bodyText}
        style={{
          fontFamily: bodyFont,
          fontSize: bodyFs,
          color: p.text,
          textAlign: isAr ? 'center' : 'left',
          marginTop: showTitle ? 4 : 0,
        }}
        allowFontScaling={false}
        maxLines={isAr ? 3 : 5}
      />

      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'column',
          alignItems: 'center',
          marginTop: 4,
        }}
      >
        <TextWidget
          text={countText}
          style={{
            fontFamily: 'Rubik-Bold',
            fontSize: titleFs,
            color: p.muted,
            textAlign: 'center',
          }}
          allowFontScaling={false}
          maxLines={1}
        />
        {showMetadata && benefit ? (
          <TextWidget
            text={benefit}
            style={{
              fontFamily: 'Rubik-Medium',
              fontSize: 9,
              color: p.muted,
              textAlign: 'center',
              marginTop: 2,
            }}
            allowFontScaling={false}
            maxLines={1}
            truncate="END"
          />
        ) : null}
        {showMetadata && reference ? (
          <TextWidget
            text={reference}
            style={{
              fontFamily: 'Rubik-Medium',
              fontSize: 9,
              color: p.muted,
              textAlign: 'center',
              marginTop: 1,
            }}
            allowFontScaling={false}
            maxLines={1}
            truncate="END"
          />
        ) : null}
      </FlexWidget>
    </FlexWidget>
  );
}
