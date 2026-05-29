// components/widgets/android/SnapshotWidget.tsx
//
// Phase D — generic RNAW shell for every Android home-screen widget. Loads the
// snapshot PNG produced by lib/widgets/snapshot.tsx and (optionally) overlays a
// live countdown / time text on top so prayer widgets stay accurate.
//
// File layout (persistent, see plan C7):
//   ${FileSystem.documentDirectory}widgets/<widgetId>_<size>.png
//
// Existing widget files (RoohSmallWidget, PrayerTimesMediumWidget, ...) are
// preserved (C3); they delegate to this component so legacy users' placed
// widgets continue to work.

import React from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { Appearance } from 'react-native';
import { FlexWidget, ImageWidget, OverlapWidget, TextWidget } from 'react-native-android-widget';
import type { SharedWidgetData } from '@/lib/widget-data';
import { androidWidgetProviderTarget } from '@/lib/widgets/registry';
import { resolveWidgetTheme, type ResolvedWidgetTheme } from '@/lib/widgets/snapshot';
import { formatPrayerDurationWithPrefix } from '@/lib/widget-format-duration';
import { APP_ICON, FONT, paletteFor, applyNumerals, resolveIsArabic } from './shared';
import { getLocalizedHijriDate } from '@/lib/hijri-date';

// ─── Live date widget (no PNG — always reads new Date()) ─────────────────────

const DATE_WIDGET_IDS = new Set(['daySimple', 'dayThuluth', 'dayDigital', 'monthSimple', 'monthThuluth']);

const WEEKDAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const WEEKDAYS_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const HIJRI_MONTHS_AR = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى', 'جمادى الثانية', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذي الحجة'];

function LiveDateWidget({
  widgetId,
  size,
  data,
  clickAction,
  clickUri,
}: {
  widgetId: string;
  size: AndroidSize;
  data: SharedWidgetData;
  clickAction?: 'OPEN_APP' | 'OPEN_URI';
  clickUri?: string;
}) {
  const now = new Date();
  const resolvedTheme = resolveWidgetTheme(data.widgetTheme, Appearance.getColorScheme());
  const p = paletteFor(resolvedTheme);
  const isAr = resolveIsArabic(data.widgetLanguage, data.language);
  const numerals = data.widgetNumerals as 'auto' | 'arabic' | 'western' | undefined;
  // Single source of truth: widgetCalendar. Old day/month keys are ignored.
  const calPref = data.widgetCalendar ?? 'auto';
  const monthCalPref = calPref;
  const radius = TILE_RADIUS[size];

  // Hijri date (safe — falls back to Gregorian on error)
  let hijriDay = now.getDate();
  let hijriMonthName = MONTHS_AR[now.getMonth()];
  let hijriYear = now.getFullYear();
  try {
    const h = getLocalizedHijriDate(now);
    if (h) {
      hijriDay = h.day;
      hijriMonthName = HIJRI_MONTHS_AR[h.month - 1] ?? h.monthName;
      hijriYear = h.year;
    }
  } catch {}

  const useHijri = calPref !== 'gregorian';
  const useMonthHijri = monthCalPref !== 'gregorian';

  const displayDay = applyNumerals(useHijri ? hijriDay : now.getDate(), numerals, isAr);
  const displayMonth = useHijri
    ? hijriMonthName
    : (isAr ? MONTHS_AR[now.getMonth()] : now.toLocaleDateString('en', { month: 'long' }));
  const displayWeekday = isAr ? WEEKDAYS_AR[now.getDay()] : WEEKDAYS_EN[now.getDay()];

  const widgetFont = (data.widgetFontVariant ?? 'widget1') === 'widget2' ? FONT.widget2 : FONT.widget;

  if (widgetId === 'dayDigital') {
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const timeStr = applyNumerals(`${hh}:${mm}`, numerals, isAr);
    const dateStr = useHijri
      ? `${applyNumerals(hijriDay, numerals, isAr)} من ${hijriMonthName} ${applyNumerals(hijriYear, numerals, isAr)}`
      : `${applyNumerals(now.getDate(), numerals, isAr)}/${applyNumerals(now.getMonth() + 1, numerals, isAr)}/${applyNumerals(now.getFullYear(), numerals, isAr)}`;
    return (
      <FlexWidget
        style={{ width: 'match_parent', height: 'match_parent', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: p.bg, borderRadius: radius }}
        clickAction={clickAction}
        clickActionData={clickUri ? { uri: clickUri } : undefined}
      >
        <TextWidget text={timeStr} style={{ fontFamily: FONT.rubikBold, fontSize: 44, color: p.text, textAlign: 'center' }} allowFontScaling={false} maxLines={1} />
        <TextWidget text={dateStr} style={{ fontFamily: FONT.rubik, fontSize: 12, color: p.muted, textAlign: 'center', marginTop: 8 }} allowFontScaling={false} maxLines={1} />
      </FlexWidget>
    );
  }

  if (widgetId === 'dayThuluth') {
    const wmDay = applyNumerals(useHijri ? hijriDay : now.getDate(), numerals, true);
    // Faint watermark color: low-alpha text — ARGB hex (#1A = ~10% opacity)
    const wmColor = p.isLight ? '#1A000000' : '#1AFFFFFF';
    return (
      <OverlapWidget
        style={{ width: 'match_parent', height: 'match_parent', backgroundColor: p.bg, borderRadius: radius }}
        clickAction={clickAction}
        clickActionData={clickUri ? { uri: clickUri } : undefined}
      >
        {/* Watermark digit — medium size only (mirrors DayThuluthView SwiftUI) */}
        {size !== 'small' ? (
          <TextWidget
            text={wmDay}
            style={{ fontFamily: widgetFont, fontSize: 130, color: wmColor, textAlign: 'center', width: 'match_parent', marginTop: 30 }}
            allowFontScaling={false}
            maxLines={1}
          />
        ) : null}
        <FlexWidget style={{ width: 'match_parent', height: 'match_parent', alignItems: 'center', justifyContent: 'center' }}>
          <TextWidget text={WEEKDAYS_AR[now.getDay()]} style={{ fontFamily: widgetFont, fontSize: size === 'small' ? 34 : 52, color: p.text, textAlign: 'center' }} allowFontScaling={false} maxLines={1} />
        </FlexWidget>
      </OverlapWidget>
    );
  }

  if (widgetId === 'monthSimple' || widgetId === 'monthThuluth') {
    const mDay = applyNumerals(useMonthHijri ? hijriDay : now.getDate(), numerals, isAr);
    const wmDay = applyNumerals(useMonthHijri ? hijriDay : now.getDate(), numerals, true);
    const wmColor = p.isLight ? '#1A000000' : '#1AFFFFFF';
    const mName = useMonthHijri
      ? hijriMonthName
      : (isAr ? MONTHS_AR[now.getMonth()] : now.toLocaleDateString('en', { month: 'long' }));
    const mSubtitle = useMonthHijri
      ? `${applyNumerals(hijriDay, numerals, isAr)} من ${hijriMonthName} ${applyNumerals(hijriYear, numerals, isAr)}`
      : `${applyNumerals(now.getDate(), numerals, isAr)} / ${applyNumerals(now.getMonth() + 1, numerals, isAr)} / ${applyNumerals(now.getFullYear(), numerals, isAr)}`;
    return (
      <OverlapWidget
        style={{ width: 'match_parent', height: 'match_parent', backgroundColor: p.bg, borderRadius: radius }}
        clickAction={clickAction}
        clickActionData={clickUri ? { uri: clickUri } : undefined}
      >
        {/* Watermark day digit behind the month name */}
        <TextWidget
          text={wmDay}
          style={{ fontFamily: widgetFont, fontSize: size === 'small' ? 90 : 140, color: wmColor, textAlign: 'center', width: 'match_parent', marginTop: size === 'small' ? 30 : 20 }}
          allowFontScaling={false}
          maxLines={1}
        />
        <FlexWidget style={{ width: 'match_parent', height: 'match_parent', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <TextWidget text={mName} style={{ fontFamily: widgetFont, fontSize: size === 'small' ? 26 : 38, color: p.text, textAlign: 'center' }} allowFontScaling={false} maxLines={1} />
          <TextWidget text={mSubtitle} style={{ fontFamily: FONT.rubik, fontSize: 11, color: p.muted, textAlign: 'center', marginTop: 6 }} allowFontScaling={false} maxLines={1} />
        </FlexWidget>
      </OverlapWidget>
    );
  }

  // Default: daySimple
  return (
    <FlexWidget
      style={{ width: 'match_parent', height: 'match_parent', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: p.bg, borderRadius: radius }}
      clickAction={clickAction}
      clickActionData={clickUri ? { uri: clickUri } : undefined}
    >
      <TextWidget text={displayWeekday} style={{ fontFamily: isAr ? 'Amiri-Bold' : FONT.rubik, fontSize: isAr ? 16 : 13, color: p.text, textAlign: 'center' }} allowFontScaling={false} maxLines={1} />
      <TextWidget text={displayDay} style={{ fontFamily: FONT.rubikBold, fontSize: 52, color: p.text, textAlign: 'center' }} allowFontScaling={false} maxLines={1} />
      <TextWidget text={displayMonth} style={{ fontFamily: isAr ? widgetFont : FONT.rubik, fontSize: 14, color: p.muted, textAlign: 'center' }} allowFontScaling={false} maxLines={1} />
    </FlexWidget>
  );
}

export type AndroidSize = 'small' | 'medium' | 'large';

export interface SnapshotWidgetProps {
  /** Registry id — see lib/widgets/registry.ts. */
  widgetId: string;
  size: AndroidSize;
  data: SharedWidgetData;
  /** Optional click destination (deep link). Defaults to `rooh-almuslim://` (open app). */
  clickAction?: 'OPEN_APP' | 'OPEN_URI';
  clickUri?: string;
  /**
   * Whether the per-(widgetId, size, theme) PNG exists on disk for this
   * placement. The task handler resolves this asynchronously before invoking
   * `renderWidget`. When `false`, SnapshotWidget renders a branded loading
   * card instead of `<ImageWidget>` — never both layered, since the PNG is a
   * transparent foreground and a fallback underneath would bleed through.
   */
  hasSnapshot?: boolean;
  /** Diagnostic key surfaced in dev builds when `hasSnapshot` is false. */
  missingKey?: string;
  /** Versioned/cache-busted PNG key from SharedWidgetData.snapshotManifest. */
  snapshotKey?: string;
  /** Resolved raw file path used by the task handler for logging/existence checks. */
  snapshotPath?: string;
  /** Diagnostic fallback reason when native could not load the PNG. */
  fallbackReason?: string;
  /** Launcher-reported Android widget bounds in dp. Mirrors iOS GeometryReader scaling. */
  widgetWidth?: number;
  widgetHeight?: number;
}

/**
 * Live overlay metadata — mirror of the table in widgets/ios/RoohWidgets.swift
 * (search for `widgetOverlayAnchor`). Coordinates are logical points within
 * the widget's rendered size (155×155 / 329×155 / 329×345). RNAW's coordinate
 * system uses dp; for our purposes points ≈ dp on standard mdpi.
 */
type OverlayKind = 'none' | 'prayerNextCountdown' | 'prayerPreviousCountdown' | 'currentTime';

interface OverlayAnchor {
  kind: OverlayKind;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  fontFamily: string;
  textAlign?: 'center' | 'left' | 'right';
  compact?: boolean;
}

function overlaysFor(widgetId: string, size: AndroidSize, isAr: boolean = true): OverlayAnchor[] {
  const key = `${widgetId}_${size}`;
  switch (key) {
    case 'dayDigital_small':
      return [{ kind: 'currentTime', x: 78, y: 70, width: 120, fontSize: 44, fontFamily: FONT.rubikBold, textAlign: 'center' }];
    case 'prayerSingle_small':
      return [{ kind: 'prayerNextCountdown', x: 78, y: 130, width: 110, fontSize: 10, fontFamily: FONT.rubikMedium, textAlign: 'center' }];
    case 'prayerTable_small':
      return [{ kind: 'prayerNextCountdown', x: 44, y: 24, width: 82, fontSize: 9, fontFamily: FONT.rubikMedium, textAlign: 'left', compact: true }];
    case 'prayerTable_medium':
      return [{ kind: 'prayerNextCountdown', x: 246, y: 130, width: 112, fontSize: 9, fontFamily: FONT.rubikMedium, textAlign: 'center' }];
    case 'prayerTable_large':
      return [{ kind: 'prayerNextCountdown', x: 213, y: 114, width: 176, fontSize: 12, fontFamily: FONT.rubikMedium, textAlign: 'right' }];
    case 'prayerNextPrevious_medium':
      // Mirror PrayerNextPrevPreview's language-conditional layout:
      //   Arabic: next-LEFT (x=91), previous-RIGHT (x=238)
      //   English: previous-LEFT (x=91), next-RIGHT (x=238)
      // Swapping the overlay KINDS instead of the coordinates keeps the
      // baked PNG card boundaries (which are at fixed positions) aligned
      // with the live countdown text drawn on top of them.
      return isAr
        ? [
            { kind: 'prayerNextCountdown', x: 91, y: 118, width: 118, fontSize: 9, fontFamily: FONT.rubikMedium, textAlign: 'center' },
            { kind: 'prayerPreviousCountdown', x: 238, y: 118, width: 118, fontSize: 9, fontFamily: FONT.rubikMedium, textAlign: 'center' },
          ]
        : [
            { kind: 'prayerPreviousCountdown', x: 91, y: 118, width: 118, fontSize: 9, fontFamily: FONT.rubikMedium, textAlign: 'center' },
            { kind: 'prayerNextCountdown', x: 238, y: 118, width: 118, fontSize: 9, fontFamily: FONT.rubikMedium, textAlign: 'center' },
          ];
    default:
      return [];
  }
}

function liveText(
  kind: OverlayKind,
  data: SharedWidgetData,
  isAr: boolean,
  numerals: 'auto' | 'arabic' | 'western' | undefined,
  now: Date
): string {
  switch (kind) {
    case 'none':
      return '';
    case 'currentTime': {
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      return applyNumerals(`${hh}:${mm}`, numerals, isAr);
    }
    case 'prayerNextCountdown':
      return formatCountdownFromEpoch(resolveNextPrayerEpoch(data, now), isAr, numerals, now, data.prayer?.prayerDataUpdatedAt);
    case 'prayerPreviousCountdown':
      return formatPreviousFromEpoch(resolvePreviousPrayerEpoch(data, now), isAr, numerals, now);
  }
}

function prayerEpochRows(data: SharedWidgetData): Array<{ epochMs: number }> {
  // Prefer the dedicated 7-day epoch list; fall back to today's allPrayers.
  const extended = (data.prayer as any)?.allPrayerEpochs as number[] | undefined;
  if (extended?.length) {
    return extended
      .filter((e) => Number.isFinite(e) && e > 0)
      .sort((a, b) => a - b)
      .map((epochMs) => ({ epochMs }));
  }
  return (data.prayer?.allPrayers ?? [])
    .map((item) => ({ epochMs: Number((item as any).epochMs) }))
    .filter((item) => Number.isFinite(item.epochMs) && item.epochMs > 0)
    .sort((a, b) => a.epochMs - b.epochMs);
}

function resolveNextPrayerEpoch(data: SharedWidgetData, now: Date): number | undefined {
  const rows = prayerEpochRows(data);
  const nowMs = now.getTime();
  return rows.find((row) => row.epochMs > nowMs)?.epochMs ?? data.prayer?.nextPrayerAtEpochMs;
}

function resolvePreviousPrayerEpoch(data: SharedWidgetData, now: Date): number | undefined {
  const rows = prayerEpochRows(data);
  const nowMs = now.getTime();
  return [...rows].reverse().find((row) => row.epochMs <= nowMs)?.epochMs ?? data.prayer?.previousPrayerAtEpochMs;
}

function formatCountdownFromEpoch(
  nextPrayerAtEpochMs: number | undefined,
  isArabic: boolean,
  numerals: 'auto' | 'arabic' | 'western' | undefined,
  now: Date,
  prayerDataUpdatedAt?: string,
): string {
  if (!nextPrayerAtEpochMs || !Number.isFinite(nextPrayerAtEpochMs)) return '—';
  const remainingSeconds = Math.max(0, Math.floor((nextPrayerAtEpochMs - now.getTime()) / 1000));
  if (__DEV__) {
    console.log(
      `[widget/android] countdown nowMs=${now.getTime()} nextPrayerAtEpochMs=${nextPrayerAtEpochMs} widgetRemainingSeconds=${remainingSeconds} prayerDataUpdatedAt=${prayerDataUpdatedAt ?? 'n/a'}`,
    );
    console.log('[PrayerCanonical] widget countdown:', remainingSeconds);
  }
  return formatPrayerDurationWithPrefix(nextPrayerAtEpochMs, now.getTime(), isArabic ? 'ar' : 'en', 'until');
}

function formatPreviousFromEpoch(
  previousPrayerAtEpochMs: number | undefined,
  isArabic: boolean,
  numerals: 'auto' | 'arabic' | 'western' | undefined,
  now: Date,
): string {
  if (!previousPrayerAtEpochMs || !Number.isFinite(previousPrayerAtEpochMs)) return '—';
  return formatPrayerDurationWithPrefix(previousPrayerAtEpochMs, now.getTime(), isArabic ? 'ar' : 'en', 'since');
}

const SIZE_DIMS: Record<AndroidSize, { width: number; height: number }> = {
  small: { width: 155, height: 155 },
  medium: { width: 329, height: 155 },
  large: { width: 329, height: 345 },
};

const TILE_RADIUS: Record<AndroidSize, number> = {
  small: 28,
  medium: 32,
  large: 32,
};

/** Raw on-disk path (no `file://` scheme) — used by the task handler for an
 *  existence check before rendering. */
export function snapshotRouteKeyForPlacement(widgetId: string, size: AndroidSize, theme: ResolvedWidgetTheme): string {
  return `${widgetId}_${size}_${theme}`;
}

export function snapshotFilePathForKey(key: string): string {
  return `${FileSystem.documentDirectory ?? ''}widgets/${key}.png`;
}

export function snapshotFilePath(
  widgetId: string,
  size: AndroidSize,
  theme: ResolvedWidgetTheme,
  snapshotKey?: string,
): string {
  return snapshotFilePathForKey(snapshotKey ?? snapshotRouteKeyForPlacement(widgetId, size, theme));
}

function snapshotUri(widgetId: string, size: AndroidSize, theme: ResolvedWidgetTheme, snapshotKey?: string, path?: string): string {
  const base = path ?? snapshotFilePath(widgetId, size, theme, snapshotKey);
  return base.startsWith('file://') ? base : `file://${base}`;
}

/**
 * Generic RNAW widget body. Renders an `ImageWidget` with the snapshot, plus an
 * optional `TextWidget` overlay for live data. Falls back to a plain palette
 * background + small text if the snapshot is not yet available (very first
 * launch before the pump runs, or after a corrupt write).
 */
export function SnapshotWidget({
  widgetId,
  size,
  data,
  clickAction = 'OPEN_APP',
  clickUri,
  hasSnapshot = true,
  missingKey,
  snapshotKey,
  snapshotPath,
  fallbackReason,
  widgetWidth,
  widgetHeight,
}: SnapshotWidgetProps) {
  // Date widgets bypass the PNG entirely — they always read new Date() directly
  // so the date/time stays accurate indefinitely without app opens.
  if (DATE_WIDGET_IDS.has(widgetId)) {
    return <LiveDateWidget widgetId={widgetId} size={size} data={data} clickAction={clickAction} clickUri={clickUri} />;
  }
  const { width, height } = SIZE_DIMS[size];
  const targetWidth = Number.isFinite(widgetWidth) && (widgetWidth ?? 0) > 0 ? widgetWidth! : width;
  const targetHeight = Number.isFinite(widgetHeight) && (widgetHeight ?? 0) > 0 ? widgetHeight! : height;
  const renderScale = Math.min(targetWidth / width, targetHeight / height);
  const renderedImageWidth = width * renderScale;
  const renderedImageHeight = height * renderScale;
  const imageOffsetX = (targetWidth - renderedImageWidth) / 2;
  const imageOffsetY = (targetHeight - renderedImageHeight) / 2;
  const isAr = resolveIsArabic(data.widgetLanguage, data.language);
  // Resolve once — every consumer below reads from this single value so the
  // themed FlexWidget background, PNG file path, and live overlay colour
  // can never disagree (plan §"Resolved-theme contract").
  const resolvedTheme = resolveWidgetTheme(data.widgetTheme, Appearance.getColorScheme());
  const routeKey = snapshotRouteKeyForPlacement(widgetId, size, resolvedTheme);
  const manifestEntry = data.snapshotManifest?.[routeKey];
  const imageKey = snapshotKey ?? manifestEntry?.key ?? routeKey;
  const imagePath = snapshotPath ?? manifestEntry?.path ?? snapshotFilePathForKey(imageKey);
  const p = paletteFor(resolvedTheme);
  const numerals = data.widgetNumerals as 'auto' | 'arabic' | 'western' | undefined;
  const overlays = overlaysFor(widgetId, size, isAr);

  // Branded loading state — rendered ONLY when no PNG is on disk.
  if (!hasSnapshot) {
    if (__DEV__) {
      console.warn(
        `[widget/android] fallback reason=${fallbackReason ?? 'missing_png'} key=${missingKey ?? imageKey} path=${imagePath}`,
      );
    }
    return (
      <FlexWidget
        style={{
          width: 'match_parent',
          height: 'match_parent',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: p.bg,
          borderRadius: 0,
          padding: 12,
        }}
        clickAction={clickAction}
        clickActionData={clickUri ? { uri: clickUri } : undefined}
      >
        <ImageWidget image={APP_ICON} imageWidth={28} imageHeight={28} radius={6} />
        <TextWidget
          text="روح المسلم"
          style={{
            fontSize: 13,
            color: p.text,
            fontFamily: FONT.widget,
            marginTop: 8,
            textAlign: 'center',
          }}
        />
        {__DEV__ && missingKey ? (
          <TextWidget
            text={`Missing: ${missingKey}`}
            style={{
              fontSize: 8,
              color: p.muted,
              fontFamily: FONT.rubik,
              marginTop: 6,
              textAlign: 'center',
            }}
            maxLines={2}
            truncate="END"
          />
        ) : null}
      </FlexWidget>
    );
  }

  if (__DEV__) {
    console.log(`[widget/android] loading snapshot route=${routeKey} key=${imageKey} path=${imagePath}`);
    console.log('[WidgetTheme] native Android background:', {
      selectedWidgetTheme: data.widgetTheme,
      resolvedWidgetTheme: resolvedTheme,
      nativeBackground: p.bg,
      creamEdgeSource: 'native parent is themed; if a light edge remains, inspect generated PNG edge pixels',
    });
  }

  return (
    <OverlapWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
        // Android launchers can allocate a cell ratio that differs from the
        // iOS/gallery snapshot. Keep the outer host transparent and fit the
        // captured tile inside it so the snapshot is never cropped.
        backgroundColor: '#00000000',
        borderRadius: 0,
        overflow: 'hidden',
      }}
      clickAction={clickAction}
      clickActionData={clickUri ? { uri: clickUri } : undefined}
    >
      <ImageWidget
        // RNAW's TS type for `image` only lists http/https/data/require, but the
        // underlying Java reader (ResourceUtils.getBitmap) explicitly supports
        // `file://` via BitmapFactory.decodeFile. Cast through `as any` because
        // we ship our snapshot PNGs to the app's documentDirectory.
        image={snapshotUri(widgetId, size, resolvedTheme, imageKey, imagePath) as any}
        style={{
          width: renderedImageWidth,
          height: renderedImageHeight,
          marginLeft: imageOffsetX,
          marginTop: imageOffsetY,
        }}
        // RNAW scales the source bitmap to imageWidth/imageHeight in dp before
        // drawing. Use contain scaling because Pixel Launcher may pin a 329x155
        // gallery tile into a 3x2 cell; fill scaling crops Arabic labels/times.
        imageWidth={renderedImageWidth}
        imageHeight={renderedImageHeight}
        radius={0}
      />
      {overlays.map((ov, index) => {
        const overlayStr = liveText(ov.kind, data, isAr, numerals, new Date());
        const renderedOverlayStr = ov.compact ? overlayStr.replace(/\s/g, '') : overlayStr;
        const scaledX = imageOffsetX + ov.x * renderScale;
        const scaledY = imageOffsetY + ov.y * renderScale;
        const scaledWidth = ov.width * renderScale;
        const scaledFontSize = ov.fontSize * renderScale;
        return renderedOverlayStr ? (
          <TextWidget
            key={`${ov.kind}-${index}`}
            text={renderedOverlayStr}
            style={{
              width: scaledWidth,
              fontSize: scaledFontSize,
              color: ov.kind === 'currentTime' ? p.text : p.muted,
              fontFamily: ov.fontFamily,
              textAlign: ov.textAlign ?? 'center',
              marginLeft: scaledX - scaledWidth / 2,
              marginTop: scaledY - scaledFontSize,
            }}
            allowFontScaling={false}
            maxLines={1}
          />
        ) : null;
      })}
    </OverlapWidget>
  );
}

/**
 * Convenience — convert a legacy provider name (e.g. `RoohSmall`,
 * `PrayerTimesMedium`, `DailyVerseSmall`) into the registry id + size that
 * Phase D's snapshot pipeline produces. Used by the existing Android widget
 * files to route their renderer to `SnapshotWidget` without losing legacy
 * placements (see plan §C3).
 */
export function legacyProviderToRegistry(legacy: string): { widgetId: string; size: AndroidSize } | null {
  const m = androidWidgetProviderTarget(legacy);
  if (!m) return null;
  return { widgetId: m.id, size: m.size };
}
