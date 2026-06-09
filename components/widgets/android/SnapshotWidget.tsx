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
import androidOverlayAnchors from '@/lib/widgets/android-overlay-anchors.json';
import { androidWidgetProviderTarget } from '@/lib/widgets/registry';
import { resolveWidgetTheme, type ResolvedWidgetTheme } from '@/lib/widgets/snapshot';
import { formatPrayerDurationWithPrefix } from '@/lib/widget-format-duration';
import { resolvePrayerTableState } from '@/lib/widget-prayer-table-state';
import { getPrayerNameAr, getPrayerNameEn } from '@/lib/prayer-times';
import { FONT, paletteFor, applyNumerals, resolveIsArabic, watermarkFontFor } from './shared';
import { WidgetFallbackNotice } from './WidgetFallbackNotice';
// Pure-math Hijri converter (NO i18n dependency) — safe inside the headless
// RNAW widget process where the app's i18n module may be uninitialised. Using
// getLocalizedHijriDate here previously threw and silently fell back to the
// Gregorian day/month, which is why placed date widgets showed "٢ يونيو"
// instead of the gallery's "١٦ ذي الحجة".
import { getHijriDate } from '@/lib/hijri-date';
import { formatDateSample, type WidgetDateFormat } from '@/components/widgets/previews/shared';
import { deviceUses24Hour, formatClockHHMM } from '@/lib/widget-clock-format';

// ─── Live date widget (no PNG — always reads new Date()) ─────────────────────

const DATE_WIDGET_IDS = new Set(['daySimple', 'dayThuluth', 'dayDigital', 'monthSimple', 'monthThuluth']);

const WEEKDAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
// Full English weekday names to match the gallery preview (WEEKDAYS_EN in
// components/widgets/previews/shared.ts uses the long form, e.g. "Tuesday").
const WEEKDAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const HIJRI_MONTHS_AR = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذي الحجة'];
// Clean Latin transliterations — mirrors HIJRI_MONTHS_EN_CLEAN in previews/index.tsx.
const HIJRI_MONTHS_EN_CLEAN = [
  'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani",
  "Jumada al-Awwal", "Jumada al-Thani", 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', "Dhu al-Qi'dah", 'Dhu al-Hijjah',
];

function isSameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * Mimic the preview's `adjustsFontSizeToFit` for the live calligraphy fallback:
 * shrink the font when the label is longer than the tile comfortably fits, down
 * to the same floor the preview uses (minimumFontScale ≈ 0.75). Without this,
 * long Hijri month names (e.g. "جمادى الآخرة") clip in the native re-render the
 * widget falls back to when its fresh gallery PNG is unavailable offline.
 */
function fitCalligraphyFs(baseFs: number, text: string, budgetChars: number): number {
  const len = (text ?? '').trim().length;
  if (len <= budgetChars) return baseFs;
  return Math.max(Math.round(baseFs * 0.75), Math.round((baseFs * budgetChars) / len));
}

function parseHex6(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

const to2 = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');

/**
 * Alpha-blend `fg` over `bg` at `opacity` and return a SOLID #RRGGBB. Live RNAW
 * TextViews render blank when given an 8-digit ARGB colour, so translucent
 * preview tones (faint watermark / strong calligraphy) must be pre-flattened.
 */
function blendOver(fg: string, opacity: number, bg: string): `#${string}` {
  const f = parseHex6(fg);
  const b = parseHex6(bg);
  if (!f || !b) return (fg.startsWith('#') ? fg : `#${fg}`) as `#${string}`;
  const a = Math.max(0, Math.min(1, opacity));
  return `#${to2(b.r + (f.r - b.r) * a)}${to2(b.g + (f.g - b.g) * a)}${to2(b.b + (f.b - b.b) * a)}`;
}

function LiveDateWidget({
  widgetId,
  size,
  data,
  clickAction,
  clickUri,
  widgetWidth,
  widgetHeight,
}: {
  widgetId: string;
  size: AndroidSize;
  data: SharedWidgetData;
  clickAction?: 'OPEN_APP' | 'OPEN_URI';
  clickUri?: string;
  widgetWidth?: number;
  widgetHeight?: number;
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

  // Hijri date via pure-math converter — never throws, never silently falls
  // back to Gregorian (mirrors getLocalizedHijriDate's numbers without the i18n
  // dependency). HIJRI_MONTHS_* are resolved locally per language/script.
  let hijriDay = now.getDate();
  let hijriMonthIdx = now.getMonth();
  let hijriYear = now.getFullYear();
  try {
    const h = getHijriDate(now);
    if (h) {
      hijriDay = h.day;
      hijriMonthIdx = h.month - 1;
      hijriYear = h.year;
    }
  } catch {}
  const hijriMonthName = isAr
    ? (HIJRI_MONTHS_AR[hijriMonthIdx] ?? '')
    : (HIJRI_MONTHS_EN_CLEAN[hijriMonthIdx] ?? '');

  // `resolveCalendar` semantics: gregorian → Gregorian; auto/hijri → Hijri.
  const useHijri = calPref !== 'gregorian';
  const useMonthHijri = monthCalPref !== 'gregorian';

  const displayDay = applyNumerals(useHijri ? hijriDay : now.getDate(), numerals, isAr);
  const displayMonth = useHijri
    ? hijriMonthName
    : (isAr ? MONTHS_AR[now.getMonth()] : now.toLocaleDateString('en', { month: 'long' }));
  const displayWeekday = isAr ? WEEKDAYS_AR[now.getDay()] : WEEKDAYS_EN[now.getDay()];
  // RemoteViews TextViews must use SOLID (6-digit) colours — an 8-digit ARGB
  // text colour renders blank on the live widget. The previews use a translucent
  // fillStrong/fillFaint; reproduce that here by blending over the tile bg so the
  // text/watermark land on the exact same RGB without an alpha channel.
  // Date/Hijri hero text uses the unified per-theme widget ink (gold on
  // olive/desert, white on dark/green/blue/slate, black on light/auto) so every
  // widget — curated images included — shows the SAME text colour per theme.
  const strongText = p.ink;
  const faintWatermark = blendOver(p.isLight ? '#000000' : '#FFFFFF', 0.1, p.bg);

  const widgetFont = (data.widgetFontVariant ?? 'widget1') === 'widget2' ? FONT.widget2 : FONT.widget;
  const configuredDateFormat = (data.widgetDateFormat ?? 'gregorian-ar') as WidgetDateFormat;
  const { width: logicalWidth, height: logicalHeight } = SIZE_DIMS[size];
  const targetWidth = Number.isFinite(widgetWidth) && (widgetWidth ?? 0) > 0 ? widgetWidth! : logicalWidth;
  const targetHeight = Number.isFinite(widgetHeight) && (widgetHeight ?? 0) > 0 ? widgetHeight! : logicalHeight;
  const renderScale = Math.min(targetWidth / logicalWidth, targetHeight / logicalHeight);
  const tileWidth = logicalWidth * renderScale;
  const tileHeight = logicalHeight * renderScale;
  const s = (value: number) => value * renderScale;
  const tileRadius = s(radius);
  const frame = (child: React.ReactElement) => (
    <FlexWidget
      style={{ width: 'match_parent', height: 'match_parent', alignItems: 'center', justifyContent: 'center', backgroundColor: '#00000000' }}
      clickAction={clickAction}
      clickActionData={clickUri ? { uri: clickUri } : undefined}
    >
      {child}
    </FlexWidget>
  );

  // Faint watermark digit. The preview draws it with SvgText, but the calligraphy
  // font's metrics don't map cleanly to a baseline formula on RNAW, so we position
  // it by vertical anchor (matching where the preview visually lands it) plus a
  // small offset: monthSimple sits centred behind the calligraphy; the Thuluth
  // widgets push the digit low so only its top edge shows ("shadow" effect).
  const watermarkLayer = (
    text: string,
    font: string,
    fsLogical: number,
    justify: 'center' | 'flex-end' | 'flex-start',
    offsetLogical: number = 0,
  ) => (
    <FlexWidget style={{ width: 'match_parent', height: 'match_parent', alignItems: 'center', justifyContent: justify }}>
      <TextWidget
        text={text}
        style={{ fontFamily: font, fontSize: s(fsLogical), color: faintWatermark, textAlign: 'center', width: 'match_parent', marginTop: s(offsetLogical) }}
        allowFontScaling={false}
        maxLines={1}
      />
    </FlexWidget>
  );

  if (widgetId === 'dayDigital') {
    // Mirrors DayDigitalPreview: HH:MM in Rubik-Bold, plus a date subtitle that
    // prefers the natural Hijri "DD من MONTH YEAR" form for Arabic/Hijri, else
    // the configured slash-style sample.
    // Follows the device 12/24-hour clock (carried on the payload, with a live
    // fallback for the headless process).
    const use24 = data.use24Hour ?? deviceUses24Hour();
    const timeStr = applyNumerals(formatClockHHMM(now, use24), numerals, isAr);
    let dateStr = '';
    if (useHijri && isAr) {
      dateStr = `${applyNumerals(hijriDay, numerals, true)} من ${hijriMonthName} ${applyNumerals(hijriYear, numerals, true)}`;
    }
    if (!dateStr) {
      const slash = `${String(now.getDate()).padStart(2, '0')} / ${String(now.getMonth() + 1).padStart(2, '0')} / ${now.getFullYear()}`;
      dateStr = formatDateSample(now, configuredDateFormat, numerals, isAr) || applyNumerals(slash, numerals, isAr);
    }
    return frame(
      <FlexWidget
        style={{ width: tileWidth, height: tileHeight, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: p.bg, borderRadius: tileRadius }}
      >
        <TextWidget text={timeStr} style={{ fontFamily: FONT.rubikBold, fontSize: s(size === 'small' ? 44 : 58), color: p.ink, textAlign: 'center', letterSpacing: -1 }} allowFontScaling={false} maxLines={1} />
        {dateStr ? <TextWidget text={dateStr} style={{ fontFamily: FONT.rubik, fontSize: s(size === 'small' ? 12 : 14), color: p.muted, textAlign: 'center', marginTop: s(10) }} allowFontScaling={false} maxLines={1} /> : null}
      </FlexWidget>
    );
  }

  if (widgetId === 'dayThuluth') {
    // Mirrors DayThuluthPreview: calligraphy weekday over a faint watermark digit
    // (medium only). Weekday uses fillStrong + an Arabic top-padding nudge.
    const wmDay = applyNumerals(useHijri ? hijriDay : now.getDate(), numerals, isAr);
    const watermarkFont = watermarkFontFor(numerals, isAr, widgetFont);
    const weekdayText = isAr ? WEEKDAYS_AR[now.getDay()] : WEEKDAYS_EN[now.getDay()];
    const weekdayFs = fitCalligraphyFs(size === 'small' ? 34 : 52, weekdayText, size === 'small' ? 6 : 8);
    const weekday = (
      <TextWidget
        text={isAr ? WEEKDAYS_AR[now.getDay()] : WEEKDAYS_EN[now.getDay()]}
        style={{ fontFamily: isAr ? widgetFont : FONT.rubikBold, fontSize: s(weekdayFs), color: strongText, textAlign: 'center', paddingTop: isAr ? s(Math.round(weekdayFs * 0.55)) : 0 }}
        allowFontScaling={false}
        maxLines={1}
      />
    );
    // Small has no watermark — render a plain FlexWidget. An OverlapWidget with a
    // `null` child renders blank on RNAW, so never feed it a conditional null.
    if (size === 'small') {
      return frame(
        <FlexWidget style={{ width: tileWidth, height: tileHeight, alignItems: 'center', justifyContent: 'center', backgroundColor: p.bg, borderRadius: tileRadius, paddingTop: s(14), paddingBottom: s(6) }}>
          {weekday}
        </FlexWidget>
      );
    }
    return frame(
      <OverlapWidget
        style={{ width: tileWidth, height: tileHeight, backgroundColor: p.bg, borderRadius: tileRadius }}
      >
        {/* Watermark digit — baseline near the bottom edge (mirrors the SvgText y=H*1.1). */}
        {watermarkLayer(wmDay, watermarkFont, 130, 'flex-end')}
        <FlexWidget style={{ width: 'match_parent', height: 'match_parent', alignItems: 'center', justifyContent: 'center', paddingTop: s(18), paddingBottom: s(8) }}>
          {weekday}
        </FlexWidget>
      </OverlapWidget>
    );
  }

  if (widgetId === 'monthSimple') {
    // Mirrors MonthSimplePreview: faint watermark digit, centered calligraphy
    // month label, and a Hijri-natural subtitle pinned near the bottom edge.
    const wmDay = applyNumerals(useMonthHijri ? hijriDay : now.getDate(), numerals, isAr);
    const watermarkFont = watermarkFontFor(numerals, isAr, widgetFont);
    const mName = useMonthHijri
      ? hijriMonthName
      : (isAr ? MONTHS_AR[now.getMonth()] : now.toLocaleDateString('en', { month: 'long' }));
    const mSubtitle = useMonthHijri && isAr
      ? `${applyNumerals(hijriDay, numerals, true)} من ${hijriMonthName} ${applyNumerals(hijriYear, numerals, true)}`
      : formatDateSample(now, configuredDateFormat, numerals, isAr);
    const monthLabelFont = isAr ? widgetFont : FONT.rubikBold;
    const monthFs = fitCalligraphyFs(size === 'small' ? 26 : 38, mName, size === 'small' ? 6 : 9);
    const wmFs = size === 'small' ? 90 : 140;
    const subtitleFs = size === 'small' ? 11 : 13;
    const dateBottom = size === 'small' ? 16 : 22;
    return frame(
      <OverlapWidget
        style={{ width: tileWidth, height: tileHeight, backgroundColor: p.bg, borderRadius: tileRadius }}
      >
        {watermarkLayer(wmDay, watermarkFont, wmFs, 'center')}
        {/* Month label centered in the region above the pinned subtitle. */}
        <FlexWidget style={{ width: 'match_parent', height: 'match_parent', alignItems: 'center', justifyContent: 'center', paddingLeft: s(12), paddingRight: s(12), paddingBottom: s(dateBottom + (size === 'small' ? 18 : 22)) }}>
          <TextWidget
            text={mName}
            style={{ fontFamily: monthLabelFont, fontSize: s(monthFs), color: strongText, textAlign: 'center', paddingTop: isAr ? s(Math.round(monthFs * 0.55)) : 0 }}
            allowFontScaling={false}
            maxLines={1}
          />
        </FlexWidget>
        {mSubtitle ? (
          <FlexWidget style={{ width: 'match_parent', height: 'match_parent', alignItems: 'center', justifyContent: 'flex-end', paddingLeft: s(12), paddingRight: s(12), paddingBottom: s(dateBottom) }}>
            <TextWidget text={mSubtitle} style={{ fontFamily: FONT.rubikMedium, fontSize: s(subtitleFs), color: p.muted, textAlign: 'center' }} allowFontScaling={false} maxLines={1} />
          </FlexWidget>
        ) : null}
      </OverlapWidget>
    );
  }

  if (widgetId === 'monthThuluth') {
    // Mirrors MonthThuluthPreview: calligraphy month name over a faint watermark
    // digit whose baseline sits near (medium) the bottom edge.
    const wmDay = applyNumerals(useMonthHijri ? hijriDay : now.getDate(), numerals, isAr);
    const watermarkFont = watermarkFontFor(numerals, isAr, widgetFont);
    const mName = useMonthHijri
      ? hijriMonthName
      : (isAr ? MONTHS_AR[now.getMonth()] : now.toLocaleDateString('en', { month: 'long' }));
    const mainFs = fitCalligraphyFs(size === 'small' ? 34 : 52, mName, size === 'small' ? 6 : 8);
    const wmFs = size === 'small' ? 64 : 130;
    return frame(
      <OverlapWidget
        style={{ width: tileWidth, height: tileHeight, backgroundColor: p.bg, borderRadius: tileRadius }}
      >
        {watermarkLayer(wmDay, watermarkFont, wmFs, size === 'small' ? 'center' : 'flex-end')}
        <FlexWidget style={{ width: 'match_parent', height: 'match_parent', alignItems: 'center', justifyContent: 'center', paddingLeft: s(10), paddingRight: s(10), paddingTop: s(size === 'small' ? 14 : 18), paddingBottom: s(size === 'small' ? 6 : 8) }}>
          <TextWidget text={mName} style={{ fontFamily: isAr ? widgetFont : FONT.rubikBold, fontSize: s(mainFs), color: strongText, textAlign: 'center', paddingTop: isAr ? s(Math.round(mainFs * 0.55)) : 0 }} allowFontScaling={false} maxLines={1} />
        </FlexWidget>
      </OverlapWidget>
    );
  }

  // Default: daySimple — mirrors DaySimplePreview (weekday / big day / month).
  // The preview shrinks the big day via adjustsFontSizeToFit (RNAW can't), so the
  // day font is sized to the value the preview EFFECTIVELY renders once weekday +
  // month claim their lines. RNAW line metrics add ~30% on top of fontSize, so
  // weekday + day + month must stay well under the 155 logical tile height or the
  // bottom month row clips ("مقطوع"). 16+50+14 ≈ 104 rendered → safe margin.
  const daySimpleWeekdayFs = size === 'small' ? 15 : 17;
  const daySimpleDayFs = size === 'small' ? 46 : 50;
  const daySimpleMonthFs = size === 'small' ? 13 : 15;
  return frame(
    <FlexWidget
      style={{ width: tileWidth, height: tileHeight, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: p.bg, borderRadius: tileRadius }}
    >
      <TextWidget text={displayWeekday} style={{ fontFamily: FONT.rubikBold, fontSize: s(daySimpleWeekdayFs), color: p.ink, textAlign: 'center' }} allowFontScaling={false} maxLines={1} />
      <TextWidget text={displayDay} style={{ fontFamily: FONT.rubikBold, fontSize: s(daySimpleDayFs), color: p.ink, textAlign: 'center' }} allowFontScaling={false} maxLines={1} />
      <TextWidget text={displayMonth} style={{ fontFamily: FONT.rubikMedium, fontSize: s(daySimpleMonthFs), color: p.ink, textAlign: 'center' }} allowFontScaling={false} maxLines={1} />
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
  /** True when the PNG is a gallery-captured prayer-state template whose
   *  changing numeric fields are intentionally blank and drawn live below. */
  isPrayerStaticTemplate?: boolean;
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
type OverlayKind = 'none' | 'prayerNextCountdown' | 'prayerNextCountdownWithLabel' | 'prayerPreviousCountdown' | 'currentTime';

interface OverlayAnchor {
  kind: OverlayKind;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  fontFamily: string;
  fontKey?: keyof typeof FONT;
  lineHeight?: number;
  textAlign?: 'center' | 'left' | 'right';
  compact?: boolean;
}

type OverlayAnchorSpec = Omit<OverlayAnchor, 'fontFamily'> & { fontKey?: keyof typeof FONT };

const ANDROID_OVERLAY_ANCHORS = androidOverlayAnchors as Record<string, OverlayAnchorSpec[]>;
const NATIVE_TEXT_VERTICAL_SAFETY = 12;

interface NativePrayerTextOverlay {
  text: string;
  targetEpochMs?: number;
  epochCandidates: number[];
  direction: 'until' | 'since';
  labelKind: 'duration' | 'nextPrayer';
  language: 'ar' | 'en';
  arabicNumerals: boolean;
  compact: boolean;
  leftFraction: number;
  topFraction: number;
  rightFraction: number;
  bottomFraction: number;
  widgetWidth: number;
  widgetHeight: number;
  fontSize: number;
  color: string;
  textAlign: 'center' | 'left' | 'right';
}

function isNativePrayerTextOverlay(kind: OverlayKind): boolean {
  return kind === 'prayerNextCountdown'
    || kind === 'prayerNextCountdownWithLabel'
    || kind === 'prayerPreviousCountdown';
}

function overlayAnchorKey(widgetId: string, size: AndroidSize, isAr: boolean): string {
  const key = `${widgetId}_${size}`;
  return key === 'prayerNextPrevious_medium' ? `${key}_${isAr ? 'ar' : 'en'}` : key;
}

function overlaysFor(widgetId: string, size: AndroidSize, isAr: boolean = true): OverlayAnchor[] {
  const specs = ANDROID_OVERLAY_ANCHORS[overlayAnchorKey(widgetId, size, isAr)] ?? [];
  return specs.map((spec) => ({
    ...spec,
    fontFamily: FONT[spec.fontKey ?? 'rubikMedium'] ?? FONT.rubikMedium,
  }));
}

interface TemplateTextOverlay {
  key: string;
  text: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  textAlign?: 'center' | 'left' | 'right';
}

/**
 * Numeric prayer values are deliberately absent from the captured template.
 * Draw them from the locally recomputed adhan snapshot so a placed widget can
 * move through future days without reopening the app while its chrome remains
 * the exact gallery PNG.
 */
function prayerTemplateTextOverlays(
  widgetId: string,
  size: AndroidSize,
  data: SharedWidgetData,
  isAr: boolean,
  numerals: 'auto' | 'arabic' | 'western' | undefined,
  textColor: string,
  mutedColor: string,
): TemplateTextOverlay[] {
  const tableState = resolvePrayerTableState(data.prayer);
  const rows = tableState.rows;
  const next = tableState.nextRow ?? rows[0];
  const previous = tableState.previousRow ?? rows[rows.length - 1];
  const fmt = (value?: string) => applyNumerals(value ?? '--:--', numerals, isAr);
  const item = (
    key: string,
    text: string,
    x: number,
    y: number,
    width: number,
    fontSize: number,
    color: string,
    textAlign: 'center' | 'left' | 'right' = 'center',
  ): TemplateTextOverlay => ({ key, text, x, y, width, fontSize, fontFamily: FONT.rubikBold, color, textAlign });

  if (widgetId === 'prayerSingle') {
    return [item('hero', fmt(next?.time ?? data.prayer?.nextPrayerTime), 78, 96, 124, 38, textColor)];
  }

  if (widgetId === 'prayerNextPrevious') {
    const nextX = isAr ? 91 : 238;
    const previousX = isAr ? 238 : 91;
    return [
      item('next', fmt(next?.time ?? data.prayer?.nextPrayerTime), nextX, 88, 118, 24, textColor),
      item('previous', fmt(previous?.time), previousX, 88, 118, 24, textColor),
    ];
  }

  if (size === 'small') {
    const rowY = [48, 62, 76, 90, 104, 118];
    return rows.map((row, index) => item(
      `row-${row.name}`,
      fmt(row.time),
      39,
      rowY[index] ?? 48,
      54,
      9.5,
      row.isNext ? textColor : mutedColor,
      isAr ? 'left' : 'right',
    ));
  }

  if (size === 'large') {
    // PrayerTablePreview uses a flex list with `justifyContent: 'space-between'`
    // in the large Android tile. Keep the native numeric layer centered on
    // those expanded rows; the old compact coordinates shifted every time
    // into the prayer name below it.
    const rowY = [139, 175, 211, 247, 283, 319];
    return [
      item('hero', fmt(next?.time ?? data.prayer?.nextPrayerTime), isAr ? 243 : 86, 78, 152, 34, textColor),
      ...rows.map((row, index) => item(
        `row-${row.name}`,
        fmt(row.time),
        isAr ? 53 : 276,
        rowY[index] ?? 184,
        66,
        16,
        row.isNext ? textColor : mutedColor,
        isAr ? 'left' : 'right',
      )),
    ];
  }

  const rowY = [43, 57, 71, 85, 99, 113];
  return [
    item('hero', fmt(next?.time ?? data.prayer?.nextPrayerTime), 246, 98, 126, 29, textColor),
    ...rows.map((row, index) => item(
      `row-${row.name}`,
      fmt(row.time),
      39,
      rowY[index] ?? 43,
      54,
      9.5,
      row.isNext ? textColor : mutedColor,
      isAr ? 'left' : 'right',
    )),
  ];
}

// ─── Captured-anchor prayer overlays ─────────────────────────────────────────
// The gallery records the exact dp rect of every dynamic prayer value (times,
// names, countdown) when it bakes the PNG. Driving the home overlay from those
// rects guarantees the live text lands precisely where the gallery drew it — no
// hand-tuned per-size coordinates, so every size matches the gallery 1:1.

const PRAYER_ANCHOR_WIDGET_IDS = new Set(['prayerSingle', 'prayerTable', 'prayerNextPrevious']);
const PRAYER_ROW_KEY_ORDER = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

// Widget-scoped prayer name: Friday Dhuhr → the single word «الجمعة» / "Jumuah"
// (the prayer tab keeps the app-wide getPrayerNameAr «صلاة الجمعة» unchanged).
function widgetPrayerName(key: string, isAr: boolean, date: Date): string {
  if (key === 'dhuhr' && date.getDay() === 5) return isAr ? 'الجمعة' : 'Jumuah';
  return isAr ? getPrayerNameAr(key as any, date) : getPrayerNameEn(key as any, date);
}

interface ManifestAnchor {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontWeight?: 'regular' | 'medium' | 'semibold' | 'bold';
  color?: string;
  alignment?: 'leading' | 'center' | 'trailing';
  direction?: 'ltr' | 'rtl';
  isCountdown?: boolean;
}

interface AnchorStaticItem {
  key: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  textAlign: 'left' | 'right' | 'center';
  /** Mirror of the gallery `<Text>` letterSpacing for this value so the live
   *  RNAW overlay has the same glyph advance/width as the baked render. */
  letterSpacing: number;
}

/**
 * letterSpacing the gallery render uses for each prayer value (see
 * PrayerTablePreview / PrayerSimplePreview in components/widgets/previews):
 * the big times use −1, the per-prayer row times use −0.3. Matching it keeps the
 * live overlay's width/centering identical to the baked chrome.
 */
function anchorLetterSpacing(anchorId: string): number {
  if (anchorId.startsWith('prayerRowTime.')) return -0.3;
  if (
    anchorId === 'prayerHeroTime'
    || anchorId === 'prayerNextTime'
    || anchorId === 'prayerPrevTime'
  ) return -1;
  return 0;
}

interface AnchorCountdownSpec {
  anchor: ManifestAnchor;
  direction: 'until' | 'since';
  withLabel: boolean;
}

interface AnchorHighlightSpec {
  x: number;
  y: number;
  width: number;
  height: number;
}

function anchorTextAlign(alignment: ManifestAnchor['alignment'], rtl: boolean): 'left' | 'right' | 'center' {
  if (alignment === 'leading') return rtl ? 'right' : 'left';
  if (alignment === 'trailing') return rtl ? 'left' : 'right';
  return 'center';
}

function anchorFontFamily(weight: ManifestAnchor['fontWeight']): string {
  if (weight === 'bold' || weight === 'semibold') return FONT.rubikBold;
  if (weight === 'medium') return FONT.rubikMedium;
  return FONT.rubik;
}

/**
 * Build static (times/names) + countdown overlay specs from the captured
 * anchors. Returns null when no usable anchors exist so the caller can fall
 * back to the legacy hand-tuned overlays.
 */
function buildPrayerAnchorOverlays(
  widgetId: string,
  size: AndroidSize,
  anchors: ManifestAnchor[] | undefined,
  data: SharedWidgetData,
  isAr: boolean,
  numerals: 'auto' | 'arabic' | 'western' | undefined,
  textColor: string,
  mutedColor: string,
  now: Date,
  // True only when serving the gallery-snapshot fallback PNG (no per-state
  // template on disk). That PNG was baked with name + highlight + active colors
  // BLANKED (gallery pump sets `blankPrayerState`), so the live next/prev/hero
  // NAME and the active-row HIGHLIGHT are drawn here from the same
  // `resolvePrayerTableState` that drives the time — they can never disagree.
  // When a per-state template IS used, this is false: name + highlight stay
  // baked (no overlay, no double-draw, pixel-identical to the gallery).
  overlayNames: boolean,
): { statics: AnchorStaticItem[]; countdowns: AnchorCountdownSpec[]; highlight?: AnchorHighlightSpec } | null {
  if (!PRAYER_ANCHOR_WIDGET_IDS.has(widgetId) || !anchors || anchors.length === 0) return null;
  const tableState = resolvePrayerTableState(data.prayer, now.getTime());
  const rows = tableState.rows;
  const next = tableState.nextRow ?? rows[0];
  const previous = tableState.previousRow ?? rows[rows.length - 1];
  const fmt = (v?: string) => applyNumerals(v ?? '--:--', numerals, isAr);

  const statics: AnchorStaticItem[] = [];
  const countdowns: AnchorCountdownSpec[] = [];

  for (const a of anchors) {
    // The since-countdown also carries `isCountdown: true`, so it MUST be tested
    // before the generic countdown branch below — otherwise the previous-prayer
    // timer is mis-typed as 'until' and both cards render "بعد …" instead of
    // one "منذ …" + one "بعد …".
    if (a.id === 'prayerSinceCountdown') {
      countdowns.push({ anchor: a, direction: 'since', withLabel: false });
      continue;
    }
    if (a.isCountdown || a.id === 'prayerHeroCountdown' || a.id === 'prayerUntilCountdown') {
      countdowns.push({ anchor: a, direction: 'until', withLabel: widgetId === 'prayerTable' && size === 'large' });
      continue;
    }
    let text = '';
    let color = mutedColor;
    if (a.id.startsWith('prayerRowTime.')) {
      const key = a.id.slice('prayerRowTime.'.length);
      const idx = PRAYER_ROW_KEY_ORDER.indexOf(key);
      const row = idx >= 0 ? rows[idx] : undefined;
      text = fmt(row?.time);
      color = row?.isNext ? textColor : mutedColor;
    } else if (overlayNames && a.id.startsWith('prayerRowName.')) {
      // Gallery-fallback only: every row name was blanked in this PNG, so redraw
      // all six live from the SAME resolvePrayerTableState rows the gallery's
      // prayerRowsFromShared uses — so the name text + active/muted color match
      // the gallery exactly (including the Friday «صلاة الجمعة» row label).
      const key = a.id.slice('prayerRowName.'.length);
      const idx = PRAYER_ROW_KEY_ORDER.indexOf(key);
      const row = idx >= 0 ? rows[idx] : undefined;
      text = (isAr ? row?.nameAr : row?.name) ?? '';
      color = row?.isNext ? textColor : mutedColor;
    } else if (a.id === 'prayerHeroTime' || a.id === 'prayerNextTime') {
      text = fmt(next?.time ?? data.prayer?.nextPrayerTime);
      color = textColor;
    } else if (a.id === 'prayerPrevTime') {
      text = fmt(previous?.time);
      color = textColor;
    } else if (overlayNames && (a.id === 'prayerHeroName' || a.id === 'prayerNextName')) {
      // Gallery-fallback only: the name was blanked in this PNG, so draw the live
      // next-prayer name. Recompute from the CURRENT date — Friday Dhuhr shows the
      // widget label «الجمعة» (single word), matching the baked templates.
      text = (next?.key
        ? widgetPrayerName(next.key, isAr, now)
        : (isAr ? next?.nameAr : next?.name))
        ?? (isAr ? data.prayer?.nextPrayerNameAr : data.prayer?.nextPrayerName)
        ?? '';
      color = textColor;
    } else if (overlayNames && a.id === 'prayerPrevName') {
      text = (previous?.key
        ? widgetPrayerName(previous.key, isAr, now)
        : (isAr ? previous?.nameAr : previous?.name))
        ?? (isAr ? data.prayer?.previousPrayerNameAr : data.prayer?.previousPrayerName)
        ?? '';
      color = textColor;
    } else {
      // Per-state template path: the hero/next/prev NAME and the prayer-row
      // LABELS are baked into the PNG (the task handler selects the PNG for the
      // current prayer state), so they must NOT be overlaid again or they'd
      // double-draw. Only the blanked TIMES + the live countdown are drawn here.
      continue;
    }
    if (!text) continue;
    statics.push({
      key: a.id,
      text,
      x: a.x,
      y: a.y,
      width: a.width,
      height: a.height,
      fontSize: a.fontSize,
      fontFamily: anchorFontFamily(a.fontWeight),
      color,
      textAlign: anchorTextAlign(a.alignment, isAr),
      letterSpacing: anchorLetterSpacing(a.id),
    });
  }
  // Gallery-fallback only: the active-row highlight was NOT baked into this PNG,
  // so draw it live at the captured row-container rect (`prayerRowBg.<key>`) for
  // the resolved next prayer. Per-state templates keep the highlight baked.
  let highlight: AnchorHighlightSpec | undefined;
  if (overlayNames && widgetId === 'prayerTable' && next?.key) {
    const bg = anchors.find((a) => a.id === `prayerRowBg.${next.key}`);
    if (bg) highlight = { x: bg.x, y: bg.y, width: bg.width, height: bg.height };
  }
  if (statics.length === 0 && countdowns.length === 0 && !highlight) return null;
  return { statics, countdowns, highlight };
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
      // Device 12/24-hour clock (payload value, live fallback for headless).
      const use24 = data.use24Hour ?? deviceUses24Hour();
      return applyNumerals(formatClockHHMM(now, use24), numerals, isAr);
    }
    case 'prayerNextCountdown':
      return formatCountdownFromEpoch(resolveNextPrayerEpoch(data, now), isAr, numerals, now, data.prayer?.prayerDataUpdatedAt);
    case 'prayerNextCountdownWithLabel': {
      const countdown = formatCountdownFromEpoch(resolveNextPrayerEpoch(data, now), isAr, numerals, now, data.prayer?.prayerDataUpdatedAt);
      return isAr ? `الصلاة القادمة ${countdown}` : `Next prayer ${countdown}`;
    }
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
  const tableState = resolvePrayerTableState(data.prayer, now.getTime());
  if (tableState.nextEpochMs) return tableState.nextEpochMs;
  const rows = prayerEpochRows(data);
  const nowMs = now.getTime();
  return rows.find((row) => row.epochMs > nowMs)?.epochMs ?? data.prayer?.nextPrayerAtEpochMs;
}

function resolvePreviousPrayerEpoch(data: SharedWidgetData, now: Date): number | undefined {
  const tableState = resolvePrayerTableState(data.prayer, now.getTime());
  if (tableState.previousEpochMs) return tableState.previousEpochMs;
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
  isPrayerStaticTemplate = false,
  widgetWidth,
  widgetHeight,
}: SnapshotWidgetProps) {
  // Date widgets: prefer the baked gallery PNG when it was generated TODAY so the
  // home tile is pixel-identical to the gallery/picker (same render). When the PNG
  // is missing or stale (app not opened today), fall back to the live native
  // re-render so the date stays correct indefinitely offline. dayDigital is always
  // live because its baked time goes stale within a minute.
  if (DATE_WIDGET_IDS.has(widgetId)) {
    const liveDate = (
      <LiveDateWidget widgetId={widgetId} size={size} data={data} clickAction={clickAction} clickUri={clickUri} widgetWidth={widgetWidth} widgetHeight={widgetHeight} />
    );
    if (widgetId === 'dayDigital') return liveDate;
    const dateTheme = resolveWidgetTheme(data.widgetTheme, Appearance.getColorScheme());
    const dateEntry = data.snapshotManifest?.[snapshotRouteKeyForPlacement(widgetId, size, dateTheme)];
    const bakedToday = !!dateEntry?.updatedAt && isSameLocalDay(new Date(dateEntry.updatedAt), new Date());
    if (!hasSnapshot || !bakedToday) return liveDate;
    // else: fall through to the shared PNG rendering path (ImageWidget) below.
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

  // No real location yet → intentional "enable location" card for prayer
  // widgets, instead of the Makkah/sample fallback baked into the PNG. Single
  // early return through the one render path (no second resolver/provider).
  if (PRAYER_ANCHOR_WIDGET_IDS.has(widgetId) && data.prayer?.needsLocation) {
    const titleFs = size === 'small' ? 15 : 18;
    const subFs = size === 'small' ? 11 : 13;
    return (
      <FlexWidget
        style={{
          width: 'match_parent',
          height: 'match_parent',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: p.bg,
          borderRadius: TILE_RADIUS[size],
          paddingLeft: 14,
          paddingRight: 14,
        }}
        clickAction={clickAction}
        clickActionData={clickUri ? { uri: clickUri } : undefined}
      >
        <TextWidget
          text={isAr ? '📍 فعّل الموقع' : '📍 Enable location'}
          style={{ fontFamily: FONT.rubikBold, fontSize: titleFs, color: p.ink, textAlign: 'center' }}
          allowFontScaling={false}
          maxLines={1}
        />
        {size !== 'small' ? (
          <TextWidget
            text={isAr ? 'لعرض مواقيت الصلاة' : 'to show prayer times'}
            style={{ fontFamily: FONT.rubikMedium, fontSize: subFs, color: p.muted, textAlign: 'center', marginTop: 8 }}
            allowFontScaling={false}
            maxLines={2}
          />
        ) : null}
      </FlexWidget>
    );
  }

  const overlays = overlaysFor(widgetId, size, isAr);
  const overlayNow = new Date();
  const prayerEpochCandidates = prayerEpochRows(data).map((row) => row.epochMs);

  // ── Language guard (Problem 2 fix) ────────────────────────────────────────
  // The prayer PNG is a direction-specific blank chrome and its captured anchors
  // are recorded in the language it was baked in. On the first AR↔EN switch the
  // live payload (names/times + isAr coordinate picks) flips one tick before the
  // new-language re-bake commits, so without this guard new-language text lands on
  // old-direction anchor rects → the reported overlapping/mixed AR/EN glitch.
  // When the baked language disagrees with the current one, suppress the localized
  // overlays for that frame and show the blank chrome only — invisible and correct
  // until the matching bake lands (the next widget tick re-renders cleanly).
  const curLang: 'ar' | 'en' = isAr ? 'ar' : 'en';
  const isPrayerOverlayWidget = PRAYER_ANCHOR_WIDGET_IDS.has(widgetId) || isPrayerStaticTemplate;
  const bakedLang = manifestEntry?.language;
  const langMatches = !isPrayerOverlayWidget || !bakedLang || bakedLang === curLang;

  // Captured-anchor path (preferred): positions come straight from the gallery
  // bake, so the live times/names/countdown land exactly where the gallery drew
  // them. Falls back to the legacy hand-tuned coords when no anchors exist.
  const prayerAnchorOverlays = langMatches
    ? buildPrayerAnchorOverlays(
        widgetId,
        size,
        manifestEntry?.anchors as ManifestAnchor[] | undefined,
        data,
        isAr,
        numerals,
        p.ink,
        p.muted,
        overlayNow,
        // Draw the live prayer NAME only when serving the gallery-fallback PNG
        // (name blanked there). Per-state templates keep the name baked.
        !isPrayerStaticTemplate,
      )
    : null;

  const templateTextOverlays = !langMatches
    ? []
    : prayerAnchorOverlays
      ? []
      : isPrayerStaticTemplate
        ? prayerTemplateTextOverlays(widgetId, size, data, isAr, numerals, p.ink, p.muted)
        : [];

  const buildNativeFromAnchorCountdown = (spec: AnchorCountdownSpec): NativePrayerTextOverlay => {
    const a = spec.anchor;
    const scaledX = imageOffsetX + a.x * renderScale;
    const scaledY = imageOffsetY + a.y * renderScale;
    const scaledW = a.width * renderScale;
    const scaledH = a.height * renderScale;
    const top = scaledY - NATIVE_TEXT_VERTICAL_SAFETY;
    const safeHeight = scaledH + NATIVE_TEXT_VERTICAL_SAFETY * 2;
    const isPrev = spec.direction === 'since';
    const kind: OverlayKind = isPrev
      ? 'prayerPreviousCountdown'
      : spec.withLabel
        ? 'prayerNextCountdownWithLabel'
        : 'prayerNextCountdown';
    return {
      text: liveText(kind, data, isAr, numerals, overlayNow),
      targetEpochMs: isPrev
        ? resolvePreviousPrayerEpoch(data, overlayNow)
        : resolveNextPrayerEpoch(data, overlayNow),
      epochCandidates: prayerEpochCandidates,
      direction: spec.direction,
      labelKind: spec.withLabel ? 'nextPrayer' : 'duration',
      language: isAr ? 'ar' : 'en',
      // Pin the live countdown to WESTERN digits. The JS seed text
      // (formatPrayerDurationWithPrefix) is already western, so matching it here
      // stops the native minute-tick from re-rendering arabic-indic and flicking
      // the digits back and forth ("بعد 2 س 27 د" stays stable).
      arabicNumerals: false,
      compact: false,
      leftFraction: Math.max(0, scaledX) / targetWidth,
      topFraction: Math.max(0, top) / targetHeight,
      rightFraction: Math.max(0, targetWidth - (scaledX + scaledW)) / targetWidth,
      bottomFraction: Math.max(0, targetHeight - (top + safeHeight)) / targetHeight,
      widgetWidth: targetWidth,
      widgetHeight: targetHeight,
      fontSize: a.fontSize * renderScale,
      color: p.muted,
      textAlign: anchorTextAlign(a.alignment, isAr),
    };
  };

  const nativeTextOverlays: NativePrayerTextOverlay[] = !langMatches
    ? []
    : prayerAnchorOverlays
    ? prayerAnchorOverlays.countdowns.map(buildNativeFromAnchorCountdown)
    : overlays
        .filter((ov) => isNativePrayerTextOverlay(ov.kind))
        .map((ov) => {
          const overlayText = liveText(ov.kind, data, isAr, numerals, overlayNow);
          const scaledX = imageOffsetX + ov.x * renderScale;
          const scaledY = imageOffsetY + ov.y * renderScale;
          const scaledWidth = ov.width * renderScale;
          const scaledFontSize = ov.fontSize * renderScale;
          const height = (ov.lineHeight ?? ov.fontSize * 2) * renderScale;
          const top = scaledY - height / 2 - NATIVE_TEXT_VERTICAL_SAFETY;
          const safeHeight = height + NATIVE_TEXT_VERTICAL_SAFETY * 2;
          const isPrevious = ov.kind === 'prayerPreviousCountdown';
          return {
            text: overlayText,
            targetEpochMs: isPrevious
              ? resolvePreviousPrayerEpoch(data, overlayNow)
              : resolveNextPrayerEpoch(data, overlayNow),
            epochCandidates: prayerEpochCandidates,
            direction: isPrevious ? 'since' : 'until',
            labelKind: ov.kind === 'prayerNextCountdownWithLabel' ? 'nextPrayer' : 'duration',
            language: isAr ? 'ar' : 'en',
            // Pin the live countdown to WESTERN digits. The JS seed text
      // (formatPrayerDurationWithPrefix) is already western, so matching it here
      // stops the native minute-tick from re-rendering arabic-indic and flicking
      // the digits back and forth ("بعد 2 س 27 د" stays stable).
      arabicNumerals: false,
            compact: ov.compact === true,
            leftFraction: Math.max(0, scaledX - scaledWidth / 2) / targetWidth,
            topFraction: Math.max(0, top) / targetHeight,
            rightFraction: Math.max(0, targetWidth - (scaledX + scaledWidth / 2)) / targetWidth,
            bottomFraction: Math.max(0, targetHeight - (top + safeHeight)) / targetHeight,
            widgetWidth: targetWidth,
            widgetHeight: targetHeight,
            fontSize: scaledFontSize,
            color: ov.kind === 'currentTime' ? p.ink : p.muted,
            textAlign: ov.textAlign ?? 'center',
          };
        });
  const rootClickActionData = {
    ...(clickUri ? { uri: clickUri } : {}),
    ...(nativeTextOverlays.length ? { nativeTextOverlays } : {}),
  };

  // No baked PNG on disk yet (fresh add before the first foreground bake,
  // cleared cache, or a generation failure). Show the bundled preview (so it
  // looks like the real widget) plus an "open the app to refresh" banner so the
  // user knows the action that makes it go live. WidgetFallbackNotice falls back
  // to a branded card + the same hint when no preview asset exists for this id.
  if (!hasSnapshot) {
    if (__DEV__) {
      console.warn(
        `[widget/android] fallback reason=${fallbackReason ?? 'missing_png'} key=${missingKey ?? imageKey} path=${imagePath}`,
      );
    }
    return (
      <WidgetFallbackNotice
        widgetId={widgetId}
        size={size}
        theme={resolvedTheme}
        isArabic={isAr}
        widgetWidth={widgetWidth}
        widgetHeight={widgetHeight}
        clickAction={clickAction === 'OPEN_URI' ? 'OPEN_URI' : 'OPEN_APP'}
        clickUri={clickUri}
      />
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
      clickActionData={rootClickActionData}
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
      {prayerAnchorOverlays?.highlight ? (() => {
        const h = prayerAnchorOverlays.highlight!;
        // Drawn over the (highlight-blanked) gallery PNG, under the text overlays.
        // Translucent tone matches the gallery's activeBg so the baked row label
        // shows through; the live row time sits crisply on top. Alpha kept in
        // sync with `activeBg` in previews/index.tsx (~12% light / ~18% dark) so
        // the band reads clearly on the cream light theme.
        const highlightColor = p.isLight ? '#1F000000' : '#2EFFFFFF';
        return (
          <FlexWidget
            key="anchor-row-highlight"
            style={{
              width: h.width * renderScale,
              height: h.height * renderScale,
              marginLeft: imageOffsetX + h.x * renderScale,
              marginTop: imageOffsetY + h.y * renderScale,
              backgroundColor: highlightColor,
              borderRadius: (size === 'large' ? 10 : 6) * renderScale,
            }}
          />
        );
      })() : null}
      {templateTextOverlays.map((ov) => {
        const scaledWidth = ov.width * renderScale;
        const scaledFontSize = ov.fontSize * renderScale;
        const lineHeight = scaledFontSize * 1.4;
        const textTopOffset = widgetId === 'prayerSingle' && ov.key === 'hero'
          ? lineHeight / 2
          : scaledFontSize;
        return (
          <TextWidget
            key={`template-${ov.key}`}
            text={ov.text}
            style={{
              width: scaledWidth,
              height: lineHeight,
              fontSize: scaledFontSize,
              color: ov.color as any,
              fontFamily: ov.fontFamily,
              textAlign: ov.textAlign ?? 'center',
              marginLeft: imageOffsetX + ov.x * renderScale - scaledWidth / 2,
              marginTop: imageOffsetY + ov.y * renderScale - textTopOffset,
            }}
            allowFontScaling={false}
            maxLines={1}
          />
        );
      })}
      {prayerAnchorOverlays
        ? prayerAnchorOverlays.statics.map((it) => {
            const scaledWidth = it.width * renderScale;
            const scaledFontSize = it.fontSize * renderScale;
            return (
              <TextWidget
                key={`anchor-${it.key}`}
                text={it.text}
                style={{
                  width: scaledWidth,
                  fontSize: scaledFontSize,
                  color: it.color as any,
                  fontFamily: it.fontFamily,
                  textAlign: it.textAlign,
                  // RNAW converts letterSpacing → em by dividing by the (scaled)
                  // fontSize, so scale the gallery value by renderScale to keep
                  // the exact same em ratio the baked render used.
                  letterSpacing: it.letterSpacing * renderScale,
                  // Anchor x/y are the captured top-left of the gallery rect, so
                  // place the TextWidget's top-left there directly (no centering).
                  marginLeft: imageOffsetX + it.x * renderScale,
                  marginTop: imageOffsetY + it.y * renderScale,
                }}
                allowFontScaling={false}
                maxLines={1}
              />
            );
          })
        : null}
      {overlays.filter((ov) => !isNativePrayerTextOverlay(ov.kind)).map((ov, index) => {
        // Prayer timers are painted by the native RemoteViews shell. Keeping
        // them outside the bitmap lets AlarmManager update the compact text
        // while React Native is cold or the app process has been reclaimed.
        const overlayStr = liveText(ov.kind, data, isAr, numerals, new Date());
        const renderedOverlayStr = overlayStr;
        const scaledX = imageOffsetX + ov.x * renderScale;
        const scaledY = imageOffsetY + ov.y * renderScale;
        const scaledWidth = ov.width * renderScale;
        const scaledFontSize = ov.fontSize * renderScale;
        const lineHeight = (ov.lineHeight ?? ov.fontSize * 2) * renderScale;
        return renderedOverlayStr ? (
          <TextWidget
            key={`${ov.kind}-${index}`}
            text={renderedOverlayStr}
            style={{
              width: scaledWidth,
              fontSize: scaledFontSize,
              color: ov.kind === 'currentTime' ? p.ink : p.muted,
              fontFamily: ov.fontFamily,
              textAlign: ov.textAlign ?? 'center',
              marginLeft: scaledX - scaledWidth / 2,
              marginTop: scaledY - lineHeight / 2,
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
