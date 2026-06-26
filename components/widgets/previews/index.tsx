// components/widgets/previews/index.tsx
// Glassify-style RN previews for all widget variants.
// Each preview mirrors the corresponding SwiftUI/Android view at real proportions
// so the in-app gallery matches what the user will see on their home screen.

import React, { useState, useEffect } from 'react';
import { View, Text, Platform, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { BlurView } from 'expo-blur';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getLanguage } from '@/lib/i18n';
import { getLocalizedHijriDate } from '@/lib/hijri-date';
import { formatPrayerDurationWithPrefix, SIN_MINUTE_GAP } from '@/lib/widget-format-duration';
import { getVerseQcfData } from '@/lib/qcf-page-data';
import { getPageFontFamily, isPageFontLoaded, loadPageFont } from '@/lib/qcf-font-loader';
import { getPrayerNameAr, getPrayerNameEn } from '@/lib/prayer-times';
import { formatEpochTimeInTimeZone } from '@/lib/widget-timezone';
import { deviceUses24Hour } from '@/lib/widget-clock-format';
import { resolvePrayerTableState, type PrayerTableKey } from '@/lib/widget-prayer-table-state';
import { curatedImageSource, type CuratedWidgetId } from '@/lib/widgets/curated-images';

/**
 * Re-format a prayer time from its raw epoch into the language-current
 * "h:mm AM" / "h:mm ص" string. Prefer this over `data.prayer.allPrayers[].time`
 * inside previews — the cached `time` string carries the AM/PM suffix from
 * whichever language was active at the last `updateWidgetData()` call, so
 * switching language without re-running that pipeline leaves stale suffixes
 * visible (e.g. "12:17 م" while the UI is English). Reformatting on every
 * render guarantees the visible suffix always matches the current language.
 */
function formatPrayerTimeForPreview(epochMs: number | undefined, ar: boolean, timeZone?: string): string | null {
  return formatEpochTimeInTimeZone(epochMs, timeZone, ar ? 'ar' : 'en', deviceUses24Hour());
}
import { useSettings } from '@/contexts/SettingsContext';
import {
  PREVIEW_PALETTE,
  PreviewSize,
  getSizeDims,
  formatTimeHHMM,
  formatDateSlash,
  latinToArabicDigits,
  getDateInfo,
  useWidgetFontFamily,
  AZKAR_PREVIEW_FONT,
  PRAYER_NAME_FONT,
  paletteFor,
  applyNumerals,
  formatDateSample,
  resolveCalendar,
  watermarkFontFor,
  HIJRI_MONTHS_AR,
  type WidgetDateFormat,
  type ThemePalette,
} from './shared';
import { useWidgetSnapshotCapture, useWidgetForcedTheme, useWidgetPreviewData, useBlankPrayerState } from './snapshot-capture-context';
import { AnchorReporter } from './anchor-reporter';
import {
  detectQuranTitle,
  splitAzkarChunks,
  pickAzkarSlot,
  resolveAzkarBodyText,
  quranTitleToEnglish,
  cleanEnglishTranslation,
  pickLongEnglishAzkarPage,
} from '@/lib/widget-azkar-helpers';

// ────────────────────────────────────────────────────────
// Glass card shell — dark blur tile that mirrors .ultraThinMaterial
// ────────────────────────────────────────────────────────

interface GlassTileProps {
  size: PreviewSize;
  children: React.ReactNode;
  /** Inner padding override */
  padding?: number;
  /** Theme palette to render with — falls back to default dark when omitted. */
  palette?: ThemePalette;
}

function GlassTile({ size, children, padding, palette }: GlassTileProps) {
  const dims = getSizeDims(size);
  const capturing = useWidgetSnapshotCapture();
  // Home widgets consume the exact gallery bitmap. Captures therefore include
  // the full rounded tile on iOS and Android; native shells stay transparent.
  const transparentForegroundCapture = false;
  const radius = transparentForegroundCapture ? 0 : (size === 'small' ? 28 : 32);
  const p = palette ?? PREVIEW_PALETTE;
  const blurTint = p.isLight ? 'light' : 'dark';
  return (
    <View
      style={[
        capturing ? null : styles.tileShadow,
        { width: dims.width, height: dims.height, borderRadius: radius },
      ]}
    >
      <View style={[styles.tile, { borderRadius: radius }]}>
        {transparentForegroundCapture ? null : (
          <>
            {Platform.OS === 'ios' ? (
              <BlurView intensity={45} tint={blurTint} style={[StyleSheet.absoluteFill, { borderRadius: radius }]} />
            ) : null}
            <View style={[StyleSheet.absoluteFill, { borderRadius: radius, backgroundColor: p.background }]} />
            <View
              style={[
                StyleSheet.absoluteFill,
                { borderRadius: radius, borderWidth: StyleSheet.hairlineWidth, borderColor: p.isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.10)' },
              ]}
            />
          </>
        )}
        {/* Inner content padding — extra 4 dp safety margin so Samsung One UI's
            internal widget chrome (which clips ~4-8 dp around home-screen widgets)
            never touches text/icons; the cream tile background fills the gap. */}
        <View style={{ flex: 1, padding: padding ?? (size === 'small' ? 20 : 22) }}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tileShadow: {
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
      android: { elevation: 6 },
      default: {},
    }),
  },
  tile: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
});

// ────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────

type Lang = 'ar' | 'en';

function isArabicLang(forced?: Lang): boolean {
  if (forced) return forced === 'ar';
  const l = getLanguage();
  return l === 'ar' || l === 'ur';
}

const num = (n: number, ar?: boolean): string => {
  return (ar ?? isArabicLang()) ? latinToArabicDigits(n) : String(n);
};

// Shared bottom padding for the ×count row so it sits at the IDENTICAL position
// in all three azkar/dhikr previews (morning, evening, daily).
const AZKAR_COUNT_PAD_BOTTOM = 10;

// Compute the body font size that makes the text FILL the measured box, by
// approximating that the glyphs tile the box area:
//   area ≈ chars · (fs·charWidthFactor) · (fs·lineHeightFactor)
//   ⇒ fs ≈ sqrt( box.w · box.h · fillRatio / (chars · cwf · lhf) )
// Deterministic ⇒ identical on iOS + Android (no platform-dependent autosize).
// Arabic and English are sized INDEPENDENTLY (Arabic has fewer words → larger);
// keep per-script factors + clamps in sync with the Android FlexWidget + iOS.
// Line-height ÷ fontSize per script — used both to SIZE the body (denominator
// in the area model) and to RENDER it (`lineHeight = fs * lhf`), so the box math
// and the actual layout agree and the full dhikr always fits.
const AZKAR_LHF_AR = 1.55; // Arabic taller — diacritics
const AZKAR_LHF_EN = 1.3;
function azkarLineHeightFactor(isArabic: boolean): number {
  return isArabic ? AZKAR_LHF_AR : AZKAR_LHF_EN;
}
function azkarFillFontSize(charCount: number, boxW: number, boxH: number, isArabic: boolean): number {
  if (boxW <= 0 || boxH <= 0) return isArabic ? 20 : 16; // pre-measure fallback
  const chars = Math.max(8, charCount);
  const cwf = isArabic ? 0.5 : 0.55;   // avg glyph advance ÷ fontSize
  const lhf = azkarLineHeightFactor(isArabic);
  // Conservative fill so the WHOLE dhikr always fits (never truncated). With the
  // body rendered at `lineHeight = fs·lhf` (no autosize), the rendered block
  // height ≈ boxH·fillRatio, so fillRatio < 1 guarantees vertical headroom.
  const fillRatio = 0.38;
  const min = 8;
  const max = isArabic ? 28 : 22;
  const fs = Math.sqrt((boxW * boxH * fillRatio) / (chars * cwf * lhf));
  return Math.max(min, Math.min(max, Math.floor(fs)));
}

// Body text box from CONSTANTS (no onLayout) — mirrors the Android FlexWidget
// box (`AzkarFlexWidget.tsx`) so the computed font size is identical across the
// gallery preview, Android, iOS, and the baked PNG. Computing from the measured
// box raced the snapshot capture: the first frame used the oversized pre-measure
// fallback (20px) and baked a TRUNCATED ("…") dhikr. Constants are deterministic.
function azkarBodyBox(
  size: PreviewSize,
  hasTitle: boolean,
  hasMetadata: boolean,
): { w: number; h: number } {
  const w = (size === 'small' ? 155 : 329) - 24; // − horizontal padding (12·2)
  const h = (size === 'small' ? 155 : 155)
    - (hasTitle ? 16 : 0)   // − title row (morning/evening Arabic only)
    - 26                    // − ×count row
    - 16                    // − vertical padding (8·2)
    - (hasMetadata ? 26 : 0); // − benefit + reference (dailyDhikr Arabic non-small)
  return { w, h };
}

/**
 * Reads the user's widget-customisation choices from `SettingsContext.display.*`
 * and returns a fully resolved set of values that previews can render with.
 *
 * Language is **always** taken from the app's main language (Arabic UI → Arabic
 * widgets, otherwise English) — there is no per-widget language toggle.
 * `forced` only exists for variants that must stay in a specific script
 * regardless of locale (e.g. "Month Elegant (En)" stays English in Arabic UI).
 */
function usePreviewSettings(forced?: Lang) {
  const { settings } = useSettings();
  const display = settings.display;
  const isArabic = forced ? forced === 'ar' : isArabicLang();
  // During the per-theme snapshot pump, every widget render must use the
  // forced theme rather than the user's app-level setting — so the PNG
  // matches its `<id>_<size>_<theme>.png` filename. Outside capture this
  // context is null and the user's `display.widgetTheme` wins.
  const forcedTheme = useWidgetForcedTheme();
  const themeKey = (forcedTheme ?? (display.widgetTheme as any)) as
    | 'auto' | 'dark' | 'light' | 'olive' | 'green' | 'blue' | 'desert' | 'slate'
    | undefined;
  const palette = paletteFor(themeKey);
  const numerals = (display.widgetNumerals ?? 'auto') as 'auto' | 'arabic' | 'western';
  const calendar = resolveCalendar(display.widgetCalendar as any, isArabic);
  // Single source of truth: widgetCalendar. Old day/month keys are ignored.
  const dayCalendar = resolveCalendar((display.widgetCalendar ?? 'auto') as any, isArabic);
  const monthCalendar = dayCalendar;
  const dateFormat = (display.widgetDateFormat ?? 'gregorian-ar') as WidgetDateFormat;
  const fontVariant = (display.widgetFontVariant ?? 'widget1') as 'widget1' | 'widget2';
  return { isArabic, numerals, calendar, dayCalendar, monthCalendar, dateFormat, palette, fontVariant };
}

// ────────────────────────────────────────────────────────
// Date / time previews
// ────────────────────────────────────────────────────────

export function DaySimplePreview({ size, language }: { size: PreviewSize; language?: Lang }) {
  const { isArabic: ar, numerals, dayCalendar, palette: p } = usePreviewSettings(language);
  const info = getDateInfo();
  let dayNum: number = info.day;
  let monthLabel: string = ar ? info.monthAr : info.monthEn;
  if (dayCalendar === 'hijri') {
    try {
      const h = getLocalizedHijriDate();
      if (h) {
        dayNum = h.day;
        monthLabel = ar ? (HIJRI_MONTHS_AR[h.month - 1] ?? h.monthName) : (HIJRI_MONTHS_EN[h.month - 1] ?? h.monthName);
      }
    } catch {}
  }
  return (
    <GlassTile size={size} palette={p}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text
          numberOfLines={1}
          style={{
            fontFamily: 'Rubik-Bold',
            fontSize: size === 'small' ? 16 : 20,
            color: p.ink,
            includeFontPadding: false,
          }}
        >
          {ar ? info.weekdayAr : info.weekdayEn}
        </Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
          style={{
            fontFamily: 'Rubik-Bold',
            fontSize: size === 'small' ? 52 : 68,
            color: p.ink,
            opacity: 0.94,
            includeFontPadding: false,
          }}
        >
          {applyNumerals(dayNum, numerals, ar)}
        </Text>
        <Text style={{ fontFamily: 'Rubik-Medium', fontSize: size === 'small' ? 14 : 18, color: p.ink }}>
          {monthLabel}
        </Text>
      </View>
    </GlassTile>
  );
}

export function DayThuluthPreview({ size, language }: { size: PreviewSize; language?: Lang }) {
  // Thuluth is a calligraphy widget — main weekday is locked to Arabic Thuluth.
  // The watermark digit follows the user's `widgetNumerals` choice so western
  // users see "9" instead of "٩"; Latin digits switch to Rubik so they look
  // clean (the calligraphy font has no Latin glyph shapes).
  // Native <Text> is used for the visible Arabic word (SvgText doesn't shape
  // Arabic letters correctly on Android — letters render disconnected).
  const { isArabic: ar, numerals, dayCalendar, palette: p, fontVariant } = usePreviewSettings(language);
  const info = getDateInfo();
  const widgetFont = useWidgetFontFamily(fontVariant);
  const dims = getSizeDims(size);
  const fs = size === 'small' ? 34 : 52;
  const showWatermark = size !== 'small';
  let dayNum = info.day;
  if (dayCalendar === 'hijri') {
    try {
      const h = getLocalizedHijriDate();
      if (h) dayNum = h.day;
    } catch {}
  }
  const watermark = applyNumerals(dayNum, numerals, ar);
  const watermarkFont = watermarkFontFor(numerals, ar, widgetFont);
  const fillStrong = p.ink;
  const fillFaint = p.isLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.10)';
  return (
    <GlassTile size={size} padding={0} palette={p}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: size === 'small' ? 14 : 18, paddingBottom: size === 'small' ? 6 : 8 }}>
        {showWatermark ? (
          <Svg width={dims.width} height={dims.height} style={StyleSheet.absoluteFill}>
            <SvgText
              fill={fillFaint}
              fontFamily={watermarkFont}
              fontSize={130}
              x={dims.width / 2}
              y={dims.height * 1.1}
              textAnchor="middle"
            >
              {watermark}
            </SvgText>
          </Svg>
        ) : null}
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          allowFontScaling={false}
          style={{
            fontFamily: ar ? widgetFont : 'Rubik-Bold',
            fontSize: fs,
            color: fillStrong,
            textAlign: 'center',
            writingDirection: ar ? 'rtl' : 'ltr',
            paddingHorizontal: 8,
            paddingTop: ar ? Math.round(fs * 0.55) : 0,
            includeFontPadding: false,
          }}
        >
          {ar ? info.weekdayAr : info.weekdayEn}
        </Text>
      </View>
    </GlassTile>
  );
}

export function DayDigitalPreview({ size, language }: { size: PreviewSize; language?: Lang; forSnapshot?: boolean }) {
  const { isArabic: ar, numerals, dayCalendar, dateFormat, palette: p } = usePreviewSettings(language);
  const time = formatTimeHHMM(new Date());
  const digitFont = 'Rubik-Bold';
  const timeStr = applyNumerals(time, numerals, ar);
  const now = new Date();
  let dateStr = '';
  if (dayCalendar === 'hijri' && ar) {
    try {
      const h = getLocalizedHijriDate(now);
      if (h) {
        dateStr = `${applyNumerals(h.day, numerals, true)} من ${HIJRI_MONTHS_AR[h.month - 1] ?? h.monthName} ${applyNumerals(h.year, numerals, true)}`;
      }
    } catch {}
  }
  if (!dateStr) {
    const sample = formatDateSample(now, dateFormat, numerals, ar);
    dateStr = sample || applyNumerals(formatDateSlash(now), numerals, ar);
  }
  const fontPx = size === 'small' ? 44 : 58;
  // The live time is rendered both in gallery AND in capture (so the PNG
  // has the same chrome dimensions), but during capture `<AnchorReporter>`
  // hides the glyphs and reports the rect to the native overlay layer.
  return (
    <GlassTile size={size} palette={p}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <AnchorReporter
          id="currentTime"
          fontFamily={digitFont}
          fontSize={fontPx}
          fontWeight="bold"
          color={p.ink}
          alignment="center"
          direction={ar ? 'rtl' : 'ltr'}
        >
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            allowFontScaling={false}
            style={{
              fontFamily: digitFont,
              fontSize: fontPx,
              fontWeight: '600',
              color: p.ink,
              letterSpacing: -1,
              includeFontPadding: false,
              textAlignVertical: 'center',
            }}
          >
            {timeStr}
          </Text>
        </AnchorReporter>
        <Text style={{ fontFamily: 'Rubik-Regular', fontSize: size === 'small' ? 12 : 14, color: p.muted, marginTop: 10 }}>
          {dateStr}
        </Text>
      </View>
    </GlassTile>
  );
}

const HIJRI_MONTHS_EN_CLEAN = [
  'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani",
  "Jumada al-Awwal", "Jumada al-Thani", 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', "Dhu al-Qi'dah", 'Dhu al-Hijjah',
];

export function MonthSimplePreview({ size, language }: { size: PreviewSize; language?: Lang }) {
  const { isArabic: ar, monthCalendar, numerals, dateFormat, palette: p, fontVariant } = usePreviewSettings(language);
  const widgetFont = useWidgetFontFamily(fontVariant);
  const dims = getSizeDims(size);
  const svgW = dims.width;
  const svgH = dims.height;
  const fs = size === 'small' ? 26 : 38;
  const wmFs = size === 'small' ? 90 : 140;
  let hijriMonth = '';
  let hijriMonthIndex = 11;
  let hijriDayNum = 9;
  let hijriYear = 1447;
  try {
    const h = getLocalizedHijriDate();
    if (h) {
      hijriMonth = h.monthName;
      hijriMonthIndex = h.month - 1;
      hijriDayNum = h.day;
      hijriYear = h.year;
    }
  } catch {}
  const now = new Date();
  const useHijri = monthCalendar === 'hijri';
  const monthLabel = useHijri
    ? (ar ? (hijriMonth || 'ذو القعدة') : (HIJRI_MONTHS_EN_CLEAN[hijriMonthIndex] ?? "Dhu al-Qi'dah"))
    : now.toLocaleString(ar ? 'ar' : 'en', { month: 'long' });
  const wmDay = useHijri ? hijriDayNum : now.getDate();
  const watermark = applyNumerals(wmDay, numerals, ar);
  const watermarkFont = watermarkFontFor(numerals, ar, widgetFont);
  const dateBottom = size === 'small' ? 16 : 22;
  // For an Arabic Hijri small/medium card we prefer the natural "DD من MONTH YEAR" form
  // (e.g. "٢٢ من ذو القعدة ١٤٤٧") which reads better than slash-style. For everything else
  // fall back to the user-selected `widgetDateFormat` sample.
  const subtitle = (() => {
    if (useHijri && ar) {
      const dayLbl = applyNumerals(hijriDayNum, numerals, true);
      const yearLbl = applyNumerals(hijriYear, numerals, true);
      return `${dayLbl} من ${hijriMonth || 'ذو القعدة'} ${yearLbl}`;
    }
    return formatDateSample(now, dateFormat, numerals, ar);
  })();
  const fillStrong = p.ink;
  const fillFaint = p.isLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.10)';
  return (
    <GlassTile size={size} padding={0} palette={p}>
      <View style={{ flex: 1 }}>
        <Svg width={svgW} height={svgH} style={{ position: 'absolute', top: 0, left: 0 }}>
          <SvgText
            fill={fillFaint}
            fontFamily={watermarkFont}
            fontSize={wmFs}
            x={svgW / 2}
            y={ar ? svgH * 0.85 : svgH * 0.68}
            textAnchor="middle"
          >
            {watermark}
          </SvgText>
        </Svg>
        <View
          pointerEvents="none"
          style={{
            // Center the month name across the FULL tile height (was bounded to
            // the area above the date strip, which biased it upward). The date
            // subtitle below is absolutely positioned so it doesn't affect this.
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 12,
            right: 12,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            allowFontScaling={false}
            style={{
              fontFamily: ar ? widgetFont : 'Rubik-Bold',
              fontSize: fs,
              color: fillStrong,
              textAlign: 'center',
              writingDirection: ar ? 'rtl' : 'ltr',
              paddingTop: ar ? Math.round(fs * 0.55) : 0,
              includeFontPadding: false,
            }}
          >
            {monthLabel}
          </Text>
        </View>
        {subtitle ? (
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{
              position: 'absolute',
              bottom: dateBottom,
              left: 12,
              right: 12,
              textAlign: 'center',
              fontFamily: 'Rubik-Medium',
              fontSize: size === 'small' ? 11 : 13,
              color: p.muted,
              letterSpacing: 0.3,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
    </GlassTile>
  );
}

export function MonthThuluthPreview({ size, language }: { size: PreviewSize; language?: Lang }) {
  const { isArabic: ar, numerals, monthCalendar, palette: p, fontVariant } = usePreviewSettings(language);
  const widgetFont = useWidgetFontFamily(fontVariant);
  const dims = getSizeDims(size);
  const svgW = dims.width;
  const svgH = dims.height;
  const fs = size === 'small' ? 34 : 52;
  // Phase E: small widgets get a smaller watermark + a higher baseline so the
  // digit sits visibly behind the calligraphy instead of being clipped at the
  // bottom edge. (User-reported: "٢٢" missing in small Month Thuluth.)
  const wmFs = size === 'small' ? 64 : 130;
  const now = new Date();
  const useHijri = monthCalendar === 'hijri';
  let monthLabel = now.toLocaleString(ar ? 'ar' : 'en', { month: 'long' });
  let wmDay = now.getDate();
  if (useHijri) {
    try {
      const h = getLocalizedHijriDate();
      if (h) {
        monthLabel = ar
          ? (h.monthName || 'ذو القعدة')
          : (HIJRI_MONTHS_EN_CLEAN[h.month - 1] ?? "Dhu al-Qi'dah");
        wmDay = h.day;
      }
    } catch {}
  }
  const watermark = applyNumerals(wmDay, numerals, ar);
  const watermarkFont = watermarkFontFor(numerals, ar, widgetFont);
  const fillStrong = p.ink;
  const fillFaint = p.isLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.10)';
  // Watermark vertical position: small widgets push the baseline up so the
  // digit body is visible above the bottom edge; medium keeps the previous
  // off-frame placement that gave the calligraphy "shadow" effect.
  const wmY = size === 'small' ? svgH * 0.6 : svgH * 1.1;
  return (
    <GlassTile size={size} padding={0} palette={p}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: size === 'small' ? 14 : 18, paddingBottom: size === 'small' ? 6 : 8 }}>
        <Svg width={svgW} height={svgH} style={StyleSheet.absoluteFill}>
          <SvgText
            fill={fillFaint}
            fontFamily={watermarkFont}
            fontSize={wmFs}
            x={svgW / 2}
            y={wmY}
            textAnchor="middle"
          >
            {watermark}
          </SvgText>
        </Svg>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          allowFontScaling={false}
          style={{
            fontFamily: ar ? widgetFont : 'Rubik-Bold',
            fontSize: fs,
            color: fillStrong,
            textAlign: 'center',
            writingDirection: ar ? 'rtl' : 'ltr',
            paddingHorizontal: 10,
            paddingTop: ar ? Math.round(fs * 0.55) : 0,
            maxWidth: svgW - 16,
            includeFontPadding: false,
          }}
        >
          {monthLabel}
        </Text>
      </View>
    </GlassTile>
  );
}

export function MonthElegantEnPreview({ size, language: _language }: { size: PreviewSize; language?: Lang }) {
  const { numerals, monthCalendar, palette: p } = usePreviewSettings('en');
  const now = new Date();
  let monthLabel = now.toLocaleString('en', { month: 'short' }).toUpperCase();
  let dayNum = now.getDate();
  if (monthCalendar === 'hijri') {
    try {
      const h = getLocalizedHijriDate(now);
      if (h) {
        dayNum = h.day;
        monthLabel = (HIJRI_MONTHS_EN[h.month - 1] || h.monthName || '').toUpperCase();
      }
    } catch {}
  }
  const faintFill = p.isLight ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.22)';
  return (
    <GlassTile size={size} palette={p}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text
            numberOfLines={1}
            style={{
              fontFamily: 'Rubik-Bold',
              fontSize: size === 'small' ? 34 : 48,
              color: faintFill,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              marginRight: 10,
            }}
          >
            {monthLabel}
          </Text>
          <Text style={{ fontFamily: 'Rubik-Bold', fontSize: size === 'small' ? 40 : 58, color: p.text }}>
            {applyNumerals(dayNum, numerals, false)}
          </Text>
        </View>
      </View>
    </GlassTile>
  );
}

// ────────────────────────────────────────────────────────
// Prayer previews
// ────────────────────────────────────────────────────────

function useLiveTick() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
}

function resolvePreviewEpoch(sharedData: ReturnType<typeof useWidgetPreviewData>, isNext: boolean, now: number = Date.now()): number | undefined {
  const tableState = resolvePrayerTableState(sharedData?.prayer, now);
  const tableEpoch = isNext ? tableState.nextEpochMs : tableState.previousEpochMs;
  if (tableEpoch) return tableEpoch;
  const epochs = [
    ...(sharedData?.prayer?.allPrayerEpochs ?? []),
    ...(sharedData?.prayer?.allPrayers ?? []).map((p) => (p as any).epochMs as number),
  ]
    .filter((e) => Number.isFinite(e) && e > 0)
    .sort((a, b) => a - b);
  if (isNext) {
    return epochs.find((e) => e > now) ?? sharedData?.prayer?.nextPrayerAtEpochMs;
  }
  return [...epochs].reverse().find((e) => e <= now) ?? sharedData?.prayer?.previousPrayerAtEpochMs;
}

function resolvePreviewPrayerItem(sharedData: ReturnType<typeof useWidgetPreviewData>, isNext: boolean, now: number = Date.now()) {
  // Prefer the night-aware resolver: at night the next epoch is TOMORROW's Fajr,
  // which never matches an entry in today-only `allPrayers` by epoch — so the
  // old lookup returned undefined and callers fell back to the stale
  // `nextPrayerNameAr` (e.g. المغرب). The table-state row already carries the
  // correct key/name/nameAr/time for the night case.
  const row = isNext
    ? resolvePrayerTableState(sharedData?.prayer, now).nextRow
    : resolvePrayerTableState(sharedData?.prayer, now).previousRow;
  if (row) return row;
  const epoch = resolvePreviewEpoch(sharedData, isNext, now);
  if (!epoch) return undefined;
  return (sharedData?.prayer?.allPrayers ?? []).find(
    (p) => Math.abs(((p as any).epochMs as number) - epoch) < 90000
  );
}

/**
 * Widget-scoped display name: Friday Dhuhr shows the single word «الجمعة» /
 * "Jumuah" — matching `widgetPrayerName` in SnapshotWidget (the home-screen
 * overlay) and the baked iOS templates — instead of the app-wide
 * «صلاة الجمعة» carried on the shared payload, which is wider than the prayer
 * tiles allot and truncated («صلاة الجم...») on small cards.
 */
function widgetScopedPrayerName(
  key: string | undefined,
  raw: string | undefined,
  ar: boolean,
  nowMs: number = Date.now(),
): string | undefined {
  if (key === 'dhuhr' && new Date(nowMs).getDay() === 5) return ar ? 'الجمعة' : 'Jumuah';
  return raw;
}

/**
 * Intentional "enable location" placeholder for every prayer widget preview.
 * Shown in the in-app gallery when no real location is available yet
 * (`prayer.needsLocation`), instead of the misleading Makkah/sample times.
 */
function PrayerNeedsLocationTile({ size, palette, ar }: { size: PreviewSize; palette: ThemePalette; ar: boolean }) {
  const iconSize = size === 'small' ? 26 : 34;
  const titleFs = size === 'small' ? 14 : 17;
  const subFs = size === 'small' ? 11 : 13;
  return (
    <GlassTile size={size} palette={palette}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <MaterialCommunityIcons name="map-marker-off" size={iconSize} color={palette.ink} />
        <Text
          numberOfLines={1}
          style={{ fontFamily: PRAYER_NAME_FONT, fontSize: titleFs, lineHeight: titleFs + 5, color: palette.ink, textAlign: 'center', includeFontPadding: false }}
        >
          {ar ? 'فعّل الموقع' : 'Enable location'}
        </Text>
        {size !== 'small' && (
          <Text
            numberOfLines={2}
            style={{ fontFamily: 'Rubik-Medium', fontSize: subFs, lineHeight: subFs + 5, color: palette.muted, textAlign: 'center', includeFontPadding: false }}
          >
            {ar ? 'لعرض مواقيت الصلاة' : 'to show prayer times'}
          </Text>
        )}
      </View>
    </GlassTile>
  );
}

export function PrayerSimplePreview({ size, language, forSnapshot }: { size: PreviewSize; language?: Lang; forSnapshot?: boolean }) {
  const { isArabic: ar, numerals, palette: p } = usePreviewSettings(language);
  const sharedData = useWidgetPreviewData();
  useLiveTick();
  // `decouple` = this capture will overlay the NAME live (iOS always; Android
  // gallery fallback under blankPrayerState). When set, bake a widest-name
  // placeholder so the recorded rect never clips the live value.
  const blankPrayerState = useBlankPrayerState();
  const decouple = !!forSnapshot && (Platform.OS !== 'android' || blankPrayerState);
  // No real location yet → intentional "enable location" placeholder in the
  // gallery instead of the Makkah/sample fallback. Snapshot bakes keep their
  // anchor layout (native shell handles needsLocation separately).
  if (sharedData?.prayer?.needsLocation && !forSnapshot) {
    return <PrayerNeedsLocationTile size={size} palette={p} ar={ar} />;
  }
  const digitFont = 'Rubik-Bold';
  const trueNextItem = resolvePreviewPrayerItem(sharedData, true);
  // Reformat from epoch on every render so the AM/PM suffix follows the
  // current language. Falls back to cached strings only as a last resort.
  const liveTimeStr = formatPrayerTimeForPreview(trueNextItem?.epochMs ?? sharedData?.prayer?.nextPrayerAtEpochMs, ar, sharedData?.prayer?.timezone);
  const time = noWrapPrayerTime(applyNumerals(liveTimeStr ?? trueNextItem?.time ?? sharedData?.prayer?.nextPrayerTime ?? '04:14', numerals, ar));
  const rawName = ar ? (trueNextItem?.nameAr ?? sharedData?.prayer?.nextPrayerNameAr ?? 'الفجر') : (trueNextItem?.name ?? sharedData?.prayer?.nextPrayerName ?? 'Fajr');
  const name = widgetScopedPrayerName((trueNextItem as any)?.key, rawName, ar) ?? rawName;
  const countdown = compactRemainingFromEpoch(resolvePreviewEpoch(sharedData, true), (s) => applyNumerals(s, numerals, ar), ar);
  const timeFs = Platform.OS === 'android' && size === 'small' ? 38 : size === 'small' ? 42 : 56;
  return (
    <GlassTile size={size} palette={p}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text numberOfLines={1} style={{ fontFamily: 'Rubik-Medium', fontSize: size === 'small' ? 11 : 13, lineHeight: size === 'small' ? 14 : 16, color: p.muted, marginBottom: 2, includeFontPadding: false }}>
          {ar ? 'الصلاة القادمة' : 'Next Prayer'}
        </Text>
        {forSnapshot ? (
          <AnchorReporter id="prayerHeroName" fontFamily={PRAYER_NAME_FONT} fontSize={size === 'small' ? 22 : 30} fontWeight="bold" color={p.ink} alignment="center" direction={ar ? 'rtl' : 'ltr'} blankOnAndroidCapture>
            <Text numberOfLines={1} style={{ fontFamily: PRAYER_NAME_FONT, fontSize: size === 'small' ? 22 : 30, lineHeight: size === 'small' ? 27 : 36, color: p.ink, includeFontPadding: false }}>
              {decouple ? prayerNameCapturePlaceholder(ar) : name}
            </Text>
          </AnchorReporter>
        ) : (
          <Text
            numberOfLines={1}
            style={{
              fontFamily: PRAYER_NAME_FONT,
              fontSize: size === 'small' ? 22 : 30,
              lineHeight: size === 'small' ? 27 : 36,
              color: p.ink,
              includeFontPadding: false,
            }}
          >
            {name}
          </Text>
        )}
        {/* Phase 2: when capturing for the static-PNG bake, the time digits
            also become a transparent placeholder so the native shell can draw
            today's actual numeric value on top of the baked card. Layout (font
            metrics, line height, flex slot) stays IDENTICAL — only opacity
            changes — so the anchor coordinates measured against the bake are
            exact. */}
        <DynamicTimeText
          forSnapshot={forSnapshot}
          adjustsFontSizeToFit
          numberOfLines={1}
          minimumFontScale={0.7}
          style={{ fontFamily: digitFont, fontSize: timeFs, lineHeight: timeFs + 6, color: p.ink, marginTop: 2, letterSpacing: -1, includeFontPadding: false }}
          anchorId="prayerHeroTime"
          anchorFontFamily={digitFont}
          anchorFontSize={timeFs}
          anchorFontWeight="bold"
          anchorColor={p.ink}
          anchorAlignment="center"
          anchorDirection={ar ? 'rtl' : 'ltr'}
        >
          {time}
        </DynamicTimeText>
        {/* Phase B C2: snapshot omits the live countdown; the iOS / Android shell
            draws it on top of the PNG so it stays accurate. */}
        {forSnapshot ? (
          <AnchorReporter id="prayerHeroCountdown" fontFamily="Rubik-Bold" fontSize={size === 'small' ? 12 : 14} fontWeight="bold" color={p.muted} alignment="center" direction={ar ? 'rtl' : 'ltr'} isCountdown style={{ marginTop: 4 }}>
            <Text numberOfLines={1} style={{ fontFamily: 'Rubik-Bold', fontSize: size === 'small' ? 12 : 14, lineHeight: size === 'small' ? 16 : 19, color: p.muted, includeFontPadding: false }}>
              {countdownCapturePlaceholder(ar, false)}
            </Text>
          </AnchorReporter>
        ) : (
          <Text numberOfLines={1} style={{ fontFamily: 'Rubik-Bold', fontSize: size === 'small' ? 12 : 14, lineHeight: size === 'small' ? 16 : 19, color: p.muted, marginTop: 4, includeFontPadding: false }}>
            {countdown}
          </Text>
        )}
      </View>
    </GlassTile>
  );
}

const PRAYER_ROWS: {
  /** Canonical prayer key — drives the anchor id so it stays stable across the
   *  Friday "Jumuah" label change (keyEn becomes "Jumuah" but key stays "dhuhr"). */
  key: PrayerTableKey;
  keyAr: string;
  keyEn: string;
  time: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  isNext?: boolean;
}[] = [
  { key: 'fajr', keyAr: 'الفجر', keyEn: 'Fajr', time: '05:35', icon: 'weather-sunset-up' },
  { key: 'sunrise', keyAr: 'الشروق', keyEn: 'Sunrise', time: '06:49', icon: 'white-balance-sunny' },
  { key: 'dhuhr', keyAr: getPrayerNameAr('dhuhr'), keyEn: getPrayerNameEn('dhuhr'), time: '12:17', icon: 'weather-sunny', isNext: true },
  { key: 'asr', keyAr: 'العصر', keyEn: 'Asr', time: '03:32', icon: 'weather-hazy' },
  { key: 'maghrib', keyAr: 'المغرب', keyEn: 'Maghrib', time: '06:42', icon: 'weather-sunset' },
  { key: 'isha', keyAr: 'العشاء', keyEn: 'Isha', time: '08:19', icon: 'weather-night' },
];

function prayerRowsFromShared(data: ReturnType<typeof useWidgetPreviewData>, ar: boolean, now: number = Date.now()) {
  const items = data?.prayer?.allPrayers;
  // allPrayers contains today's 6 prayers only. Guard against stale multi-day
  // data that could produce duplicate keys in the list.
  if (!items?.length) return PRAYER_ROWS;
  const tableState = resolvePrayerTableState(data?.prayer, now);
  const iconFor = (name?: string): React.ComponentProps<typeof MaterialCommunityIcons>['name'] => {
    const k = (name ?? '').toLowerCase();
    if (k.includes('fajr')) return 'weather-sunset-up';
    if (k.includes('sun')) return 'white-balance-sunny';
    if (k.includes('dhuhr')) return 'weather-sunny';
    if (k.includes('asr')) return 'weather-hazy';
    if (k.includes('maghrib')) return 'weather-sunset';
    if (k.includes('isha')) return 'weather-night';
    return 'weather-sunny';
  };
  return tableState.rows.map((item) => {
    // Reformat from epochMs so the AM/PM suffix matches the CURRENT
    // language. Fall back to the cached `item.time` only if the epoch
    // is missing (very old shared-data shape).
    const liveTime = formatPrayerTimeForPreview(item.epochMs, ar, data?.prayer?.timezone) ?? item.time ?? '--:--';
    return {
      key: item.key,
      keyAr: widgetScopedPrayerName(item.key, item.nameAr ?? item.name, true, now) ?? '',
      keyEn: widgetScopedPrayerName(item.key, item.name ?? item.nameAr, false, now) ?? '',
      time: liveTime,
      icon: iconFor(item.name),
      isNext: !!item.isNext,
      isPassed: !!item.isPassed,
    };
  });
}

function compactRemainingFromEpoch(
  epochMs: number | undefined,
  _fmt: (s: string | number) => string,
  ar: boolean,
  prefix: 'next' | 'previous' = 'next',
) {
  // Routed through the shared compact formatter — NEVER HH:MM:SS. Returns
  // strings like "in 1H 52M" / "بعد 1 س 52 د" / "52M ago" / "منذ 52 د".
  // The legacy `_fmt` numeral remapping is intentionally unused here:
  // the compact format ships western digits in English and arabic digits
  // would not be readable in unit-tagged values (e.g. "١ س ٥٢ د" looks odd
  // because the units already carry the language signal).
  const direction = prefix === 'next' ? 'until' : 'since';
  const lang: 'ar' | 'en' = ar ? 'ar' : 'en';
  // Sample fallback for when no epoch is provided (gallery-default state).
  const safeEpoch = epochMs && Number.isFinite(epochMs)
    ? epochMs
    : Date.now() + (prefix === 'next' ? 9900 : -14460) * 1000;
  return formatPrayerDurationWithPrefix(safeEpoch, Date.now(), lang, direction);
}

/**
 * Widest plausible countdown string, used ONLY as the hidden AnchorReporter
 * child during capture so the recorded dp rect is wide enough for ANY live
 * value. A far prayer (e.g. Isha→Fajr) can be many hours away, so the bake-time
 * value alone (often minutes-only) produced a narrow box that clipped the live
 * "بعد ٧ س ٤٠ د" down to "بعد ٧ س". The child is invisible (opacity 0) in the
 * PNG; only its width matters, and the live overlay right-aligns within it.
 */
function countdownCapturePlaceholder(ar: boolean, withLabel = false, direction: 'until' | 'since' = 'until'): string {
  // Includes the wider س↔minute gap so the captured anchor box is wide enough
  // for the live overlay's widened countdown.
  const body = ar ? `٢٣ س${SIN_MINUTE_GAP}٥٩ د` : '23H 59M';
  const dir = direction === 'since'
    ? (ar ? `منذ ${body}` : `${body} ago`)
    : (ar ? `بعد ${body}` : `in ${body}`);
  return withLabel ? (ar ? `الصلاة القادمة ${dir}` : `Next prayer ${dir}`) : dir;
}

function noWrapPrayerTime(value: string | number): string {
  const text = String(value).trim().replace(/\s+/g, ' ');
  return text.replace(/\s+/g, '\u00A0');
}

/**
 * Widest plausible prayer NAME, used ONLY as the hidden name-anchor child during
 * a capture where the name is overlaid live (iOS always; Android gallery
 * fallback). The recorded dp rect is then wide enough for ANY live value \u2014
 * including Friday's "\u0635\u0644\u0627\u0629 \u0627\u0644\u062C\u0645\u0639\u0629" / "Jumuah" \u2014 so the live overlay never clips
 * (the home screen showed "\u0627\u0644\u0645\u063A\u0631" because the rect was sized to a shorter
 * bake-time name). The child is invisible (opacity 0); only its width matters,
 * and the live overlay centers within it.
 */
function prayerNameCapturePlaceholder(ar: boolean): string {
  return ar ? '\u0635\u0644\u0627\u0629 \u0627\u0644\u062C\u0645\u0639\u0629' : 'Sunrise';
}

/**
 * REQUIRED wrapper for every dynamic numeric Text in prayer preview
 * components. Enforces the snapshot invariant: when `forSnapshot === true`,
 * the captured PNG contains ZERO glyphs at this position \u2014 the wrapper
 * renders a fixed-size clipped View around a hidden Text. Layout (font
 * metrics, line height, flex slot) is preserved exactly via the inner
 * Text's natural sizing, but the outer View's `overflow: hidden` AND the
 * Text's `opacity: 0` AND `color: 'transparent'` make it impossible for any
 * pixel of the time string to land in the bake.
 *
 * Rule for the bake: if a `<Text>` in a prayer preview can ever render a
 * time digit, prayer-time string, or countdown value, route it through this
 * component instead of writing `<Text style={{ ... }}>` directly. The
 * invariant cannot be regressed by accident \u2014 code review catches a bare
 * `<Text>` rendering a `time` value as "should be DynamicTimeText".
 */
function DynamicTimeText({
  forSnapshot,
  style,
  numberOfLines,
  adjustsFontSizeToFit,
  minimumFontScale,
  children,
  anchorId,
  anchorFontFamily,
  anchorFontSize,
  anchorFontWeight,
  anchorColor,
  anchorAlignment,
  anchorDirection,
  anchorIsCountdown,
}: {
  forSnapshot?: boolean;
  style?: React.ComponentProps<typeof Text>['style'];
  numberOfLines?: number;
  adjustsFontSizeToFit?: boolean;
  minimumFontScale?: number;
  children: React.ReactNode;
  /** Optional anchor id — when set during capture, the dp rect of this
   *  Text is reported to the snapshot orchestrator and surfaces in the
   *  manifest so the native widget extension draws the live value here. */
  anchorId?: string;
  anchorFontFamily?: string;
  anchorFontSize?: number;
  anchorFontWeight?: 'regular' | 'medium' | 'semibold' | 'bold';
  anchorColor?: string;
  anchorAlignment?: 'leading' | 'center' | 'trailing';
  anchorDirection?: 'ltr' | 'rtl';
  anchorIsCountdown?: boolean;
}) {
  const hideInSnapshot = !!forSnapshot;
  const textNode = (
    <Text
      numberOfLines={numberOfLines}
      adjustsFontSizeToFit={adjustsFontSizeToFit}
      minimumFontScale={minimumFontScale}
      style={[style, hideInSnapshot ? { opacity: 0, color: 'transparent' } : null]}
    >
      {children}
    </Text>
  );

  if (!anchorId) return textNode;

  return (
    <AnchorReporter
      id={anchorId}
      fontFamily={anchorFontFamily ?? 'Rubik-Medium'}
      fontSize={anchorFontSize ?? 14}
      fontWeight={anchorFontWeight ?? 'medium'}
      color={anchorColor ?? '#000000'}
      alignment={anchorAlignment ?? 'center'}
      direction={anchorDirection ?? 'ltr'}
      isCountdown={anchorIsCountdown}
    >
      {textNode}
    </AnchorReporter>
  );
}

export function PrayerTablePreview({ size, language, forSnapshot }: { size: PreviewSize; language?: Lang; forSnapshot?: boolean }) {
  const { isArabic: ar, numerals, palette: p, fontVariant } = usePreviewSettings(language);
  const sharedData = useWidgetPreviewData();
  useLiveTick();
  // `decouple` = this bake leaves prayer STATE (hero name, active-row highlight,
  // active row colors) to the live overlay (iOS always; Android gallery fallback
  // under blankPrayerState). Per-state template bakes keep them baked.
  const blankPrayerState = useBlankPrayerState();
  const decouple = !!forSnapshot && (Platform.OS !== 'android' || blankPrayerState);
  const widgetFontL = useWidgetFontFamily(fontVariant);
  // No real location yet → intentional "enable location" placeholder.
  if (sharedData?.prayer?.needsLocation && !forSnapshot) {
    return <PrayerNeedsLocationTile size={size} palette={p} ar={ar} />;
  }
  const timeFont = 'Rubik-Bold';
  const nowMs = Date.now();
  const prayerState = resolvePrayerTableState(sharedData?.prayer, nowMs);
  const prayerRows = prayerRowsFromShared(sharedData, ar, nowMs);
  const nextPrayer = prayerRows.find((r) => r.isNext) ?? prayerRows[0] ?? PRAYER_ROWS[0];
  const trueNextEpoch = prayerState.nextEpochMs ?? resolvePreviewEpoch(sharedData, true, nowMs);
  const trueNextItem = resolvePreviewPrayerItem(sharedData, true, nowMs);
  const heroKey = prayerState.nextRow?.key ?? (trueNextItem as any)?.key;
  const heroNameAr = widgetScopedPrayerName(
    heroKey,
    prayerState.nextRow?.nameAr ?? trueNextItem?.nameAr ?? sharedData?.prayer?.nextPrayerNameAr,
    true,
    nowMs,
  ) ?? nextPrayer.keyAr;
  const heroNameEn = widgetScopedPrayerName(
    heroKey,
    prayerState.nextRow?.name ?? trueNextItem?.name ?? sharedData?.prayer?.nextPrayerName,
    false,
    nowMs,
  ) ?? nextPrayer.keyEn;
  const heroTime = formatPrayerTimeForPreview(trueNextEpoch, ar, sharedData?.prayer?.timezone)
    ?? prayerState.nextRow?.time
    ?? trueNextItem?.time
    ?? sharedData?.prayer?.nextPrayerTime
    ?? nextPrayer.time;
  const fmt = (s: string | number) => applyNumerals(s, numerals, ar);
  const remainingText = compactRemainingFromEpoch(resolvePreviewEpoch(sharedData, true), fmt, ar);
  // Strip only ASCII spaces (not the wide U+2002 س↔minute gap) for the tight iOS variant.
  const remainingTight = Platform.OS === 'android' ? remainingText : remainingText.replace(/ /g, '');
  // Highlight overlay for the active prayer row — a clearly visible but still
  // subtle dark band behind the next-prayer row (black tint on light themes,
  // white tint on dark), legible across all 8 palettes including the cream
  // light theme. Kept in sync with `highlightColor` in SnapshotWidget.tsx so the
  // baked per-state band and the live gallery-fallback band look identical.
  const activeBg = p.isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.18)';

  // Row-name node. In the gallery (non-snapshot) render it's a bare <Text> so the
  // in-app gallery is byte-for-byte unchanged. During capture it's wrapped in an
  // AnchorReporter (id `prayerRowName.<key>`) with `blankOnAndroidCapture`, which
  // blanks the name ONLY in the gallery-fallback PNG (blankPrayerState) so the
  // home overlay can redraw all six names live with the correct active/muted
  // color — matching the gallery. Per-state template bakes keep the name baked.
  const renderRowName = (
    row: { key: string; keyAr: string; keyEn: string },
    fs: number,
    lineHeight: number,
    fgColor: string,
  ) => {
    const node = (
      <Text numberOfLines={1} style={{ fontFamily: PRAYER_NAME_FONT, fontSize: fs, lineHeight, color: fgColor, includeFontPadding: false }}>
        {ar ? row.keyAr : row.keyEn}
      </Text>
    );
    if (!forSnapshot) return node;
    return (
      <AnchorReporter
        id={`prayerRowName.${row.key}`}
        fontFamily={PRAYER_NAME_FONT}
        fontSize={fs}
        fontWeight="bold"
        color={p.ink}
        alignment="center"
        direction={ar ? 'rtl' : 'ltr'}
        blankOnAndroidCapture
      >
        {node}
      </AnchorReporter>
    );
  };

  if (size === 'medium') {
    const listFs = Platform.OS === 'android' ? 9.5 : 10;
    const rowPv = Platform.OS === 'android' ? 1 : 1.5;
    const heroTimeFs = Platform.OS === 'android' ? 29 : 32;
    const outerDir: 'row' | 'row-reverse' = ar ? 'row' : 'row-reverse';
    const rowDir: 'row' | 'row-reverse' = ar ? 'row' : 'row-reverse';
    // Decouple state-dependent visuals from the PNG when capturing.
    // The PNG bakes only labels + chrome; the active-row highlight,
    // hero prayer NAME, and prayer ROW TEXT COLOR are owned by the live
    // overlay so they always reflect the current prayer state — never
    // the state at the moment the PNG was captured.
    return (
      <GlassTile size={size} padding={8} palette={p}>
        <View style={{ flex: 1, flexDirection: outerDir, gap: 8 }}>
            <View style={{ flex: 1, justifyContent: 'center' }}>
              {prayerRows.map((row) => {
                const active = !!row.isNext;
                const timeStr = noWrapPrayerTime(fmt(row.time));
                const anchorId = `prayerRowTime.${row.key}`;
                // When decoupling (iOS, or Android gallery fallback): skip the
                // active-bg fill and use the muted color for every row — the live
                // overlay re-tints the current active row + draws the highlight,
                // so the PNG never freezes state. Per-state template bakes keep
                // the highlight + active colors baked.
                const rowBg = (decouple || !active) ? 'transparent' : activeBg;
                const fgForCapture = decouple ? p.muted : (active ? p.ink : p.muted);
                return (
                  <AnchorReporter
                    key={row.keyEn}
                    id={`prayerRowBg.${row.key}`}
                    measureOnly
                    fontFamily={timeFont}
                    fontSize={listFs}
                    color={p.ink}
                    direction={ar ? 'rtl' : 'ltr'}
                    style={{
                      flexDirection: rowDir,
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: 4,
                      paddingVertical: rowPv,
                      borderRadius: 6,
                      backgroundColor: rowBg,
                    }}
                  >
                    <DynamicTimeText
                      forSnapshot={forSnapshot}
                      numberOfLines={1}
                      style={{ width: Platform.OS === 'android' ? 54 : undefined, textAlign: ar ? 'left' : 'right', writingDirection: ar ? 'rtl' : 'ltr', fontFamily: timeFont, fontSize: listFs, lineHeight: listFs + 3, color: fgForCapture, letterSpacing: -0.3, includeFontPadding: false }}
                      anchorId={anchorId}
                      anchorFontFamily={timeFont}
                      anchorFontSize={listFs}
                      anchorFontWeight="bold"
                      anchorColor={p.ink}
                      anchorAlignment="trailing"
                      anchorDirection={ar ? 'rtl' : 'ltr'}
                    >
                      {timeStr}
                    </DynamicTimeText>
                    {renderRowName(row, listFs, listFs + 3, fgForCapture)}
                  </AnchorReporter>
                );
              })}
            </View>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text numberOfLines={1} style={{ fontFamily: 'Rubik-Medium', fontSize: 10, lineHeight: 13, color: p.muted, marginBottom: 2, includeFontPadding: false }}>
                {ar ? 'الصلاة القادمة' : 'Next Prayer'}
              </Text>
              {/* Hero prayer NAME is live-driven: native overlay writes
                  the current next-prayer name here every timeline reload. */}
              {forSnapshot ? (
                <AnchorReporter
                  id="prayerHeroName"
                  fontFamily={PRAYER_NAME_FONT}
                  fontSize={20}
                  fontWeight="bold"
                  color={p.ink}
                  alignment="center"
                  direction={ar ? 'rtl' : 'ltr'}
                  blankOnAndroidCapture
                >
                  <Text numberOfLines={1} style={{ fontFamily: PRAYER_NAME_FONT, fontSize: 20, lineHeight: 24, color: p.ink, includeFontPadding: false }}>
                    {decouple ? prayerNameCapturePlaceholder(ar) : (ar ? heroNameAr : heroNameEn)}
                  </Text>
                </AnchorReporter>
              ) : (
                <Text numberOfLines={1} style={{ fontFamily: PRAYER_NAME_FONT, fontSize: 20, lineHeight: 24, color: p.ink, includeFontPadding: false }}>
                  {ar ? heroNameAr : heroNameEn}
                </Text>
              )}
              <DynamicTimeText
                forSnapshot={forSnapshot}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                style={{ fontFamily: timeFont, fontSize: heroTimeFs, lineHeight: heroTimeFs + 5, color: p.ink, marginTop: 2, letterSpacing: -1, includeFontPadding: false }}
                anchorId="prayerHeroTime"
                anchorFontFamily={timeFont}
                anchorFontSize={heroTimeFs}
                anchorFontWeight="bold"
                anchorColor={p.ink}
                anchorAlignment="center"
                anchorDirection={ar ? 'rtl' : 'ltr'}
              >
                {noWrapPrayerTime(fmt(heroTime))}
              </DynamicTimeText>
              {forSnapshot ? (
                <AnchorReporter
                  id="prayerHeroCountdown"
                  fontFamily="Rubik-Bold"
                  fontSize={11}
                  fontWeight="bold"
                  color={p.muted}
                  alignment="center"
                  direction={ar ? 'rtl' : 'ltr'}
                  isCountdown
                  style={{ marginTop: 2 }}
                >
                  <Text numberOfLines={1} style={{ fontFamily: 'Rubik-Bold', fontSize: 11, lineHeight: 14, color: p.muted, includeFontPadding: false }}>
                    {countdownCapturePlaceholder(ar, false)}
                  </Text>
                </AnchorReporter>
              ) : (
                <Text numberOfLines={1} style={{ fontFamily: 'Rubik-Bold', fontSize: 11, lineHeight: 14, color: p.muted, marginTop: 2, includeFontPadding: false }}>
                  {remainingText}
                </Text>
              )}
            </View>
          </View>
      </GlassTile>
    );
  }

  if (size === 'small') {
    // On Android, reduce row height so all 6 prayers fit within 155×155.
    // iOS uses natural font metrics; Android's default line metrics are taller.
    const listFs = Platform.OS === 'android' ? 9.5 : 11;
    const rowPv = Platform.OS === 'android' ? 0.5 : 2;
    // Header row and every schedule row use row-reverse for English so the
    // child order [time, label] in JSX renders visually as [label, time] —
    // i.e. label on LEFT, time on RIGHT, matching native LTR widgets.
    const rowDir: 'row' | 'row-reverse' = ar ? 'row' : 'row-reverse';
    return (
      <GlassTile size={size} padding={8} palette={p}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <View style={{ flexDirection: rowDir, justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
            <AnchorReporter id="prayerHeroCountdown" fontFamily="Rubik-Bold" fontSize={11} fontWeight="bold" color={p.muted} alignment="trailing" direction={ar ? 'rtl' : 'ltr'} isCountdown>
              <Text numberOfLines={1} style={{ fontFamily: 'Rubik-Bold', fontSize: 11, lineHeight: 14, color: p.muted, includeFontPadding: false }}>
                {/* Capture → max-width placeholder (hidden, just sizes the rect);
                    gallery → the real countdown. Without the forSnapshot guard the
                    AnchorReporter rendered the placeholder ("بعد ٢٣ س ٥٩ د") live. */}
                {forSnapshot ? countdownCapturePlaceholder(ar, false) : (remainingTight || (ar ? '— س — د' : '—H —M'))}
              </Text>
            </AnchorReporter>
            <Text numberOfLines={1} style={{ fontFamily: 'Rubik-Medium', fontSize: 9, lineHeight: 12, color: p.muted, includeFontPadding: false }}>
              {ar ? 'الصلاة القادمة' : 'Next Prayer'}
            </Text>
          </View>
          {prayerRows.map((row) => {
            const active = !!row.isNext;
            const timeStr = noWrapPrayerTime(fmt(row.time));
            const rowAnchorId = `prayerRowTime.${row.key}`;
            const rowBg = (decouple || !active) ? 'transparent' : activeBg;
            const fg = decouple ? p.muted : (active ? p.ink : p.muted);
            return (
              <AnchorReporter
                key={row.keyEn}
                id={`prayerRowBg.${row.key}`}
                measureOnly
                fontFamily={timeFont}
                fontSize={listFs}
                color={p.ink}
                direction={ar ? 'rtl' : 'ltr'}
                style={{
                  flexDirection: rowDir,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 4,
                  paddingVertical: rowPv,
                  borderRadius: 6,
                  backgroundColor: rowBg,
                }}
              >
                <DynamicTimeText forSnapshot={forSnapshot} numberOfLines={1} style={{ width: Platform.OS === 'android' ? 54 : undefined, textAlign: ar ? 'left' : 'right', writingDirection: ar ? 'rtl' : 'ltr', fontFamily: timeFont, fontSize: listFs, lineHeight: listFs + 3, color: fg, letterSpacing: -0.3, includeFontPadding: false }}
                  anchorId={rowAnchorId}
                  anchorFontFamily={timeFont}
                  anchorFontSize={listFs}
                  anchorFontWeight="bold"
                  anchorColor={p.ink}
                  anchorAlignment="trailing"
                  anchorDirection={ar ? 'rtl' : 'ltr'}
                >
                  {timeStr}
                </DynamicTimeText>
                {renderRowName(row, listFs, listFs + 3, fg)}
              </AnchorReporter>
            );
          })}
        </View>
      </GlassTile>
    );
  }

  const remainingLarge = compactRemainingFromEpoch(resolvePreviewEpoch(sharedData, true), fmt, ar);
  const heroBg = p.isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)';
  const watermarkFill = p.isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)';
  const isAndroid = Platform.OS === 'android';
  // Android large prayer tile now uses the SAME hero/row metrics as iOS so the
  // baked PNG + live overlay match the iOS reference 1:1 (was downsized, which
  // made the Android hero look cramped vs iOS). The 329×345 tile fits these
  // values with room to spare; verified against the re-baked PNG.
  const largePad = 14;
  const heroPadV = 14;
  const heroMb = 10;
  const heroNameFs = 22;
  const heroTimeFs = 36;
  const rowFs = 15;
  const rowPv = 6;
  const rowIcon = 16;
  // Language-specific flow. For Arabic (RTL), the hero icon is LEFT,
  // content-column right-aligned, schedule rows have time LEFT and
  // [name+icon] group RIGHT, with name LEFT of icon visually. For English
  // (LTR), everything mirrors: hero icon RIGHT, content-column left-
  // aligned, schedule rows have [icon+name] LEFT and time RIGHT.
  const heroOuterDir: 'row' | 'row-reverse' = ar ? 'row' : 'row-reverse';
  const heroContentAlign: 'flex-end' | 'flex-start' = ar ? 'flex-end' : 'flex-start';
  const rowDir: 'row' | 'row-reverse' = ar ? 'row' : 'row-reverse';
  const innerGroupDir: 'row' | 'row-reverse' = ar ? 'row' : 'row-reverse';
  return (
    <GlassTile size={size} padding={largePad} palette={p}>
      <View style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: heroOuterDir,
            alignItems: 'center',
            marginBottom: heroMb,
            paddingHorizontal: 14,
            paddingVertical: heroPadV,
            backgroundColor: heroBg,
            borderRadius: 16,
            overflow: 'hidden',
          }}
        >
          {ar ? (
            // Decorative Arabic watermark — only rendered for Arabic
            // bakes. English variant has no Arabic decoration baked in.
            <Text
              pointerEvents="none"
              numberOfLines={1}
              style={{
                position: 'absolute',
                right: 12,
                bottom: 14,
                width: 200,
                textAlign: 'center',
                fontFamily: 'WidgetFont',
                fontSize: 48,
                color: watermarkFill,
                writingDirection: 'rtl',
                paddingTop: 26,
                includeFontPadding: false,
              }}
            >
              {'الصلاة'}
            </Text>
          ) : null}
          <MaterialCommunityIcons name={nextPrayer.icon} size={32} color={p.muted} />
          <View style={{ flex: 1, alignItems: heroContentAlign }}>
            {forSnapshot ? (
              // Pin the hero NAME to the same start edge ('leading' = right in RTL)
              // as the hero time + countdown below. 'center' let the live-overlaid
              // name drift off that shared edge (Android draws it centered in its
              // rect), misaligning "الشروق" vs the time + "الصلاة القادمة" label.
              <AnchorReporter id="prayerHeroName" fontFamily={PRAYER_NAME_FONT} fontSize={heroNameFs} fontWeight="bold" color={p.ink} alignment="leading" direction={ar ? 'rtl' : 'ltr'} blankOnAndroidCapture>
                <Text numberOfLines={1} style={{ fontFamily: PRAYER_NAME_FONT, fontSize: heroNameFs, lineHeight: heroNameFs + 4, color: p.ink, includeFontPadding: false }}>
                  {decouple ? prayerNameCapturePlaceholder(ar) : (ar ? heroNameAr : heroNameEn)}
                </Text>
              </AnchorReporter>
            ) : (
              <Text numberOfLines={1} style={{ fontFamily: PRAYER_NAME_FONT, fontSize: heroNameFs, lineHeight: heroNameFs + 4, color: p.ink, includeFontPadding: false }}>
                {ar ? heroNameAr : heroNameEn}
              </Text>
            )}
            <DynamicTimeText forSnapshot={forSnapshot} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ fontFamily: timeFont, fontSize: heroTimeFs, lineHeight: heroTimeFs + 5, color: p.ink, marginTop: 2, letterSpacing: -1, includeFontPadding: false }}
              anchorId="prayerHeroTime"
              anchorFontFamily={timeFont}
              anchorFontSize={heroTimeFs}
              anchorFontWeight="bold"
              anchorColor={p.ink}
              // Right-align (leading for ar) to pin the time's right edge to the
              // hero name — 'center' let it drift left inside the captured rect
              // for prayer states whose time is narrower than the bake state's.
              anchorAlignment="leading"
              anchorDirection={ar ? 'rtl' : 'ltr'}
            >
              {noWrapPrayerTime(fmt(heroTime))}
            </DynamicTimeText>
            {forSnapshot ? (
              <AnchorReporter id="prayerHeroCountdown" fontFamily="Rubik-Bold" fontSize={14} fontWeight="bold" color={p.muted} alignment="leading" direction={ar ? 'rtl' : 'ltr'} isCountdown style={{ marginTop: 4 }}>
                <Text numberOfLines={1} style={{ fontFamily: 'Rubik-Bold', fontSize: 14, lineHeight: 19, color: p.muted, includeFontPadding: false }}>
                  {countdownCapturePlaceholder(ar, true)}
                </Text>
              </AnchorReporter>
            ) : (
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ fontFamily: 'Rubik-Bold', fontSize: 14, lineHeight: 19, color: p.muted, marginTop: 4, includeFontPadding: false }}>
                {ar ? `الصلاة القادمة ${remainingLarge}` : `Next prayer ${remainingLarge}`}
              </Text>
            )}
          </View>
        </View>
        <View style={{ flex: isAndroid ? 1 : undefined, justifyContent: isAndroid ? 'space-between' : undefined }}>
          {prayerRows.map((row) => {
            const active = !!row.isNext;
            const timeStr = noWrapPrayerTime(fmt(row.time));
            const rowAnchorId = `prayerRowTime.${row.key}`;
            const rowBg = (decouple || !active) ? 'transparent' : activeBg;
            const fg = decouple ? p.muted : (active ? p.ink : p.muted);
            return (
              <AnchorReporter
                key={row.keyEn}
                id={`prayerRowBg.${row.key}`}
                measureOnly
                fontFamily={timeFont}
                fontSize={rowFs}
                color={p.ink}
                direction={ar ? 'rtl' : 'ltr'}
                style={{
                  flexDirection: rowDir,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 8,
                  paddingVertical: rowPv,
                  borderRadius: 10,
                  backgroundColor: rowBg,
                  marginBottom: isAndroid ? 0 : 1,
                }}
              >
                <DynamicTimeText forSnapshot={forSnapshot} numberOfLines={1} style={{ width: isAndroid ? 66 : undefined, textAlign: ar ? 'left' : 'right', writingDirection: ar ? 'rtl' : 'ltr', fontFamily: timeFont, fontSize: rowFs, lineHeight: rowFs + 4, color: fg, letterSpacing: -0.3, includeFontPadding: false }}
                  anchorId={rowAnchorId}
                  anchorFontFamily={timeFont}
                  anchorFontSize={rowFs}
                  anchorFontWeight="bold"
                  anchorColor={p.ink}
                  anchorAlignment="trailing"
                  anchorDirection={ar ? 'rtl' : 'ltr'}
                >
                  {timeStr}
                </DynamicTimeText>
                <View style={{ flexDirection: innerGroupDir, alignItems: 'center', gap: 6 }}>
                  {renderRowName(row, rowFs, rowFs + 4, fg)}
                  <MaterialCommunityIcons name={row.icon} size={rowIcon} color={fg} />
                </View>
              </AnchorReporter>
            );
          })}
        </View>
      </View>
    </GlassTile>
  );
}

export function PrayerNextPrevPreview({ size, language, forSnapshot }: { size: PreviewSize; language?: Lang; forSnapshot?: boolean }) {
  const { isArabic: ar, numerals, palette: p } = usePreviewSettings(language);
  const sharedData = useWidgetPreviewData();
  useLiveTick();
  // `decouple` = this capture overlays the next/prev NAME live (iOS always;
  // Android gallery fallback). Bake a widest-name placeholder so it never clips.
  const blankPrayerState = useBlankPrayerState();
  const decouple = !!forSnapshot && (Platform.OS !== 'android' || blankPrayerState);
  // No real location yet → intentional "enable location" placeholder.
  if (sharedData?.prayer?.needsLocation && !forSnapshot) {
    return <PrayerNeedsLocationTile size={size} palette={p} ar={ar} />;
  }
  const timeFont = 'Rubik-Bold';
  const boxBg = p.isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)';
  const boxBorder = p.isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.10)';
  const fmt = (s: string | number) => applyNumerals(s, numerals, ar);
  const isAndroid = Platform.OS === 'android';
  const trueNextPrev = resolvePreviewPrayerItem(sharedData, true);
  const truePrevPrev = resolvePreviewPrayerItem(sharedData, false);
  const rawNextName = ar ? (trueNextPrev?.nameAr ?? sharedData?.prayer?.nextPrayerNameAr ?? 'الفجر') : (trueNextPrev?.name ?? sharedData?.prayer?.nextPrayerName ?? 'Fajr');
  const rawPreviousName = ar ? (truePrevPrev?.nameAr ?? sharedData?.prayer?.previousPrayerNameAr ?? 'العشاء') : (truePrevPrev?.name ?? sharedData?.prayer?.previousPrayerName ?? 'Isha');
  const nextName = widgetScopedPrayerName((trueNextPrev as any)?.key, rawNextName, ar) ?? rawNextName;
  const previousName = widgetScopedPrayerName((truePrevPrev as any)?.key, rawPreviousName, ar) ?? rawPreviousName;
  const nextItem = {
    label: ar ? 'الصلاة القادمة' : 'Next Prayer',
    name: nextName,
    time: noWrapPrayerTime(fmt(
      formatPrayerTimeForPreview(trueNextPrev?.epochMs ?? sharedData?.prayer?.nextPrayerAtEpochMs, ar, sharedData?.prayer?.timezone)
      ?? trueNextPrev?.time
      ?? sharedData?.prayer?.nextPrayerTime
      ?? '04:14'
    )),
    sub: compactRemainingFromEpoch(resolvePreviewEpoch(sharedData, true), fmt, ar),
    icon: 'weather-sunset-up' as const,
    nameId: 'prayerNextName',
    timeId: 'prayerNextTime',
    subId: 'prayerUntilCountdown',
  };
  const previousItem = {
    label: ar ? 'الصلاة السابقة' : 'Previous Prayer',
    name: previousName,
    time: noWrapPrayerTime(fmt(
      formatPrayerTimeForPreview(truePrevPrev?.epochMs ?? sharedData?.prayer?.previousPrayerAtEpochMs, ar, sharedData?.prayer?.timezone)
      ?? truePrevPrev?.time
      ?? '08:18'
    )),
    sub: compactRemainingFromEpoch(resolvePreviewEpoch(sharedData, false), fmt, ar, 'previous'),
    icon: 'weather-night' as const,
    nameId: 'prayerPrevName',
    timeId: 'prayerPrevTime',
    subId: 'prayerSinceCountdown',
  };
  // Order follows the widget's localized name reading direction:
  //   Arabic "الصلاة السابقة والقادمة" → السابقة-RIGHT, القادمة-LEFT
  //     → render [next, previous] under forced LTR (first child = left).
  //   English "Previous & Next" → Previous-LEFT, Next-RIGHT
  //     → render [previous, next] under LTR (first child = left).
  // Without this swap the English gallery + Android bake shows Next on the
  // left even though the widget label reads "Previous & Next" left-to-right.
  const items = ar ? [nextItem, previousItem] : [previousItem, nextItem];
  return (
    <GlassTile size={size} padding={isAndroid ? 18 : undefined} palette={p}>
      {/* direction:'ltr' so the array order maps directly to visual L→R.
          The Android overlay coordinates in SnapshotWidget.tsx mirror the
          same language-conditional swap so the live countdown text lands
          on the card the snapshot bake placed underneath it. */}
      <View style={{ flex: 1, flexDirection: 'row', gap: isAndroid ? 8 : 10, direction: 'ltr' }}>
        {items.map((item, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              backgroundColor: boxBg,
              borderRadius: 18,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: boxBorder,
              padding: isAndroid ? 8 : 10,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialCommunityIcons name={item.icon as any} size={isAndroid ? 18 : 20} color={p.muted} />
            {forSnapshot ? (
              <AnchorReporter id={item.nameId} fontFamily={PRAYER_NAME_FONT} fontSize={isAndroid ? 15 : 16} fontWeight="bold" color={p.ink} alignment="center" direction={ar ? 'rtl' : 'ltr'} blankOnAndroidCapture style={{ marginTop: 4 }}>
                <Text numberOfLines={1} style={{ fontFamily: PRAYER_NAME_FONT, fontSize: isAndroid ? 15 : 16, lineHeight: isAndroid ? 19 : 21, color: p.ink, textAlign: 'center', includeFontPadding: false }}>
                  {decouple ? prayerNameCapturePlaceholder(ar) : item.name}
                </Text>
              </AnchorReporter>
            ) : (
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: PRAYER_NAME_FONT,
                  fontSize: isAndroid ? 15 : 16,
                  lineHeight: isAndroid ? 19 : 21,
                  color: p.ink,
                  marginTop: 4,
                  textAlign: 'center',
                  includeFontPadding: false,
                }}
              >
                {item.name}
              </Text>
            )}
            <DynamicTimeText
              forSnapshot={forSnapshot}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              style={{
                fontFamily: timeFont,
                fontSize: isAndroid ? 24 : 28,
                lineHeight: isAndroid ? 30 : 34,
                color: p.ink,
                marginTop: 2,
                letterSpacing: -0.5,
                includeFontPadding: false,
              }}
              anchorId={item.timeId}
              anchorFontFamily={timeFont}
              anchorFontSize={isAndroid ? 24 : 28}
              anchorFontWeight="bold"
              anchorColor={p.ink}
              anchorAlignment="center"
              anchorDirection={ar ? 'rtl' : 'ltr'}
            >
              {item.time}
            </DynamicTimeText>
            {/* Dynamic countdown/since labels are drawn by the native shell so
                both cards stay fresh and visually balanced on the home screen. */}
            {forSnapshot ? (
              <AnchorReporter id={item.subId} fontFamily="Rubik-Bold" fontSize={11} fontWeight="bold" color={p.muted} alignment="center" direction={ar ? 'rtl' : 'ltr'} isCountdown style={{ marginTop: 2 }}>
                <Text numberOfLines={1} style={{ fontFamily: 'Rubik-Bold', fontSize: 11, lineHeight: 14, color: p.muted, includeFontPadding: false }}>{countdownCapturePlaceholder(ar, false, item.subId === 'prayerSinceCountdown' ? 'since' : 'until')}</Text>
              </AnchorReporter>
            ) : (
              <Text numberOfLines={1} style={{ fontFamily: 'Rubik-Bold', fontSize: 11, lineHeight: 14, color: p.muted, marginTop: 2, includeFontPadding: false }}>{item.sub}</Text>
            )}
          </View>
        ))}
      </View>
    </GlassTile>
  );
}

// ────────────────────────────────────────────────────────
// Verse preview
// ────────────────────────────────────────────────────────

const SAMPLE_VERSE = 'وَنَٰدَيْنَٰهُ مِن جَانِبِ ٱلطُّورِ ٱلْأَيْمَنِ وَقَرَّبْنَٰهُ نَجِيًّۭا';
const SAMPLE_TRANSLATION = 'And We called him from the side of the mount at [his] right and brought him near, confiding [to him].';
const SAMPLE_SURAH_AR = 'مريم';
const SAMPLE_SURAH_EN = 'Maryam';
const SAMPLE_SURAH_NUMBER = 19;
const SAMPLE_AYAH = 52;

function verseArabicFontSize(size: PreviewSize, ar: boolean, arabicChars: number, qcfWordCount: number): number {
  const effectiveWords = qcfWordCount > 0 ? qcfWordCount : Math.ceil(arabicChars / 8);
  if (size === 'small') {
    if (arabicChars > 100 || effectiveWords > 8) return 16;
    if (arabicChars > 70 || effectiveWords > 6) return 19;
    return 24;
  }

  // Bumped up ~+6 so the verse fills more of the width and leaves only a small
  // gap to the framing brackets (was leaving a wide empty band).
  if (arabicChars > 200) return 30;
  if (arabicChars > 115 || effectiveWords > 10) return ar ? 40 : 37;
  if (arabicChars > 82 || effectiveWords > 8) return ar ? 46 : 43;
  if (arabicChars > 58 || effectiveWords > 6) return ar ? 52 : 48;
  if (arabicChars > 38 || effectiveWords > 4) return ar ? 58 : 54;
  return ar ? 64 : 58;
}

// ─────────────────────────────────────────────────────────────────────────────
// Curated bundled-image previews — the gallery shows the EXACT same bundled
// image (tinted to the theme) that the placed widget renders, so the preview
// always matches the home screen. Used for verse/azkar/dhikr.
// ─────────────────────────────────────────────────────────────────────────────

function CuratedImagePreview({ widgetId, size, language }: { widgetId: CuratedWidgetId; size: PreviewSize; language?: Lang }) {
  const { palette: p } = usePreviewSettings(language);
  const src = curatedImageSource(widgetId, new Date());
  const tint = p.ink;
  // padding 0 + cover → the design fills the tile edge-to-edge at 100% (the PNGs
  // are authored at the tile aspect ratio), matching the placed widget exactly.
  // expo-image with the `tintColor` PROP (not style): RN core Image's
  // style.tintColor on the new architecture rendered these previews blank on
  // Android (empty azkar gallery cards) while the same assets tinted fine in
  // the native home-screen path.
  return (
    <GlassTile size={size} padding={0} palette={p}>
      <ExpoImage
        source={src}
        contentFit="cover"
        tintColor={tint}
        style={{ width: '100%', height: '100%' }}
        onError={__DEV__ ? (e) => console.warn(`[widget/gallery] curated image failed id=${widgetId}:`, e?.error) : undefined}
      />
    </GlassTile>
  );
}

export function CuratedVersePreview({ size, language }: { size: PreviewSize; language?: Lang }) {
  return <CuratedImagePreview widgetId="verseOfDay" size={size} language={language} />;
}
export function CuratedAzkarMorningPreview({ size, language }: { size: PreviewSize; language?: Lang }) {
  return <CuratedImagePreview widgetId="azkarMorning" size={size} language={language} />;
}
export function CuratedAzkarEveningPreview({ size, language }: { size: PreviewSize; language?: Lang }) {
  return <CuratedImagePreview widgetId="azkarEvening" size={size} language={language} />;
}
export function CuratedDailyDhikrPreview({ size, language }: { size: PreviewSize; language?: Lang }) {
  return <CuratedImagePreview widgetId="dailyDhikr" size={size} language={language} />;
}

export function VersePreview({ size, language }: { size: PreviewSize; language?: Lang }) {
  const { isArabic: ar, numerals, palette: p } = usePreviewSettings(language);
  // Pull the live ayah from `sharedData.verse` first: this is the same
  // payload written by the app's daily-ayah pipeline (including admin
  // override), so tapping the widget opens the exact same ayah.
  const sharedData = useWidgetPreviewData();
  const sharedVerse = sharedData?.verse;
  const pool = sharedData?.versePool;
  const liveEntry = (() => {
    // Only trust the stored snapshot when it is TODAY'S verse. The snapshot
    // carries a `date` (YYYY-MM-DD) written by prepareVerseWidgetData; if it is
    // stale (the app hasn't refreshed yet after midnight) we fall through to the
    // deterministic pool index so the gallery shows TODAY's verse — fixed all
    // day, rolling exactly at local midnight (the pool index reads `new Date()`),
    // matching the real home-screen widget instead of yesterday's snapshot.
    // Same key shape prepareVerseWidgetData stamps onto `verse.date`
    // (`new Date().toISOString().split('T')[0]`) so a same-day snapshot matches.
    const todayKey = new Date().toISOString().slice(0, 10);
    const snapshotDate = (sharedVerse as any)?.date as string | undefined;
    const snapshotIsToday = !snapshotDate || snapshotDate === todayKey;
    if (snapshotIsToday && sharedVerse?.arabic && typeof (sharedVerse as any).surahNumber === 'number') {
      return {
        arabic: sharedVerse.arabic,
        translation: sharedVerse.translation ?? '',
        surahName: sharedVerse.surahName,
        englishSurahName: sharedVerse.surahNameEn,
        surahNumber: (sharedVerse as any).surahNumber,
        ayahNumber: sharedVerse.numberInSurah || sharedVerse.ayahNumber,
      };
    }
    if (!pool || !Array.isArray(pool.entries) || pool.entries.length === 0) return null;
    const now = new Date();
    const startOfYear = Date.UTC(now.getFullYear(), 0, 0);
    const todayDOY = Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - startOfYear) / 86400000);
    const yearDelta = now.getFullYear() - pool.seedYear;
    const daysElapsed = yearDelta * 365 + (todayDOY - pool.seedDayOfYear);
    const idx = ((daysElapsed % pool.entries.length) + pool.entries.length) % pool.entries.length;
    return pool.entries[idx] ?? null;
  })();
  const arabicText = liveEntry?.arabic ?? SAMPLE_VERSE;
  const translation = (((liveEntry as any)?.translation) ?? '').trim();
  const rawSurahName = liveEntry?.surahName ?? (ar ? SAMPLE_SURAH_AR : SAMPLE_SURAH_EN);
  // Strip tashkeel + Quranic annotation marks + leading "سورة" word — mirrors
  // `cleanSurahName()` in `lib/verse-pool.ts` and the Swift helper.
  const cleanedSurahName = rawSurahName
    .replace(/[ً-ٟۖ-ۭ]/g, '')
    .replace(/[ٱ]/g, 'ا')
    .replace(/^سورة\s+/, '')
    .trim();
  const englishSurahName = (((liveEntry as any)?.englishSurahName) ?? '').trim();
  // English mode prefers the romanized surah name (e.g. "Az-Zukhruf") when
  // available; falls back to the cleaned Arabic name.
  const surahName = (ar ? cleanedSurahName : (englishSurahName || cleanedSurahName))
    .replace(/\s+[\d٠-٩]+$/, '')
    .trim();
  const ayahNumber = liveEntry?.ayahNumber ?? SAMPLE_AYAH;
  const ayahLabel = applyNumerals(ayahNumber, numerals, ar);
  const qcfData = React.useMemo(() => {
    const entryQcfPage = (liveEntry as any)?.qcfPage;
    const entryQcfGlyphs = (liveEntry as any)?.qcfGlyphs;
    if (typeof entryQcfPage === 'number' && Array.isArray(entryQcfGlyphs) && entryQcfGlyphs.length > 0) {
      return { page: entryQcfPage, glyphs: entryQcfGlyphs as string[] };
    }
    return getVerseQcfData(liveEntry?.surahNumber ?? SAMPLE_SURAH_NUMBER, ayahNumber);
  }, [ayahNumber, liveEntry]);
  const qcfDarkMode = !p.isLight;
  const [qcfFontFamily, setQcfFontFamily] = useState<string | null>(() => (
    qcfData && isPageFontLoaded(qcfData.page, qcfDarkMode)
      ? getPageFontFamily(qcfData.page, qcfDarkMode)
      : null
  ));
  useEffect(() => {
    let cancelled = false;
    if (!qcfData) {
      setQcfFontFamily(null);
      return () => { cancelled = true; };
    }
    const family = getPageFontFamily(qcfData.page, qcfDarkMode);
    if (isPageFontLoaded(qcfData.page, qcfDarkMode)) {
      setQcfFontFamily(family);
      return () => { cancelled = true; };
    }
    setQcfFontFamily(null);
    loadPageFont(qcfData.page, qcfDarkMode)
      .then(() => {
        if (!cancelled) setQcfFontFamily(family);
      })
      .catch(() => {
        if (!cancelled) setQcfFontFamily(null);
      });
    return () => { cancelled = true; };
  }, [qcfData?.page, qcfDarkMode]);
  const qcfDisplay = qcfData?.glyphs.join('\u200A') ?? arabicText;
  const arabicCharCount = arabicText.length;
  // Brackets are decorative frames at a fixed, modest size.
  const bracketFs = size === 'small' ? 16 : 26;
  // The ornate Quranic parens (﴾ ﴿, U+FD3E/U+FD3F) are absent from the bundled
  // KFGQPCUthmanic TTF. iOS falls back to a system Arabic font that draws them
  // as ornate medallions, but Android's fallback renders plain { } braces.
  // Amiri (already registered) carries proper ornate glyphs — use it on Android
  // to match the iOS look.
  const bracketFontFamily = Platform.OS === 'android' ? 'Amiri' : 'KFGQPCUthmanic';
  // Keeps the framing brackets just off the card edge; the verse fills the
  // flex space between them (so the gap is only the small marginHorizontal).
  const verseSideInset = size === 'small' ? 14 : 18;
  // Verse size is COMPUTED (not autosized — Android's adjustsFontSizeToFit
  // mis-measures the custom QCF font and leaves the verse small with a wide
  // gap). Estimate the size that makes the glyphs span the width available
  // between the brackets, so the verse always FILLS that space on one line.
  const verseGlyphCount = qcfData?.glyphs.length ?? Math.max(1, Math.ceil(arabicCharCount / 4));
  const verseTileWidth = size === 'small' ? 155 : 329;
  const verseOuterPad = size === 'small' ? 14 : 20;
  const verseAvailWidth = verseTileWidth - 2 * verseOuterPad - 2 * verseSideInset - 2 * bracketFs - 16;
  const verseFillBase = Math.max(
    size === 'small' ? 14 : 18,
    Math.min(size === 'small' ? 40 : 60, Math.floor(verseAvailWidth / (verseGlyphCount * 0.6))),
  );
  const translationFs = size === 'small'
    ? (translation.length > 90 ? 13 : 14)
    : translation.length > 95 ? 18 : 20;
  return (
    <GlassTile size={size} padding={0} palette={p}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: size === 'small' ? 14 : 20, paddingTop: ar ? 10 : 12, paddingBottom: ar ? 10 : 10 }}>
        {/* The verse Text spans the FULL content width (centered) so it renders
            as large as possible; the two ornate brackets are absolutely
            positioned in the side-inset gutters and VERTICALLY centered to the
            verse line, so they frame the verse without stealing its width. */}
        {/* Row: [ ﴿ ][ verse (flex:1) ][ ﴾ ]. The verse starts from a high base
            font and `adjustsFontSizeToFit` shrinks it to FILL the flex space on
            one line, so it always fills the width between the brackets with only
            a small gap (instead of sitting small with a wide empty band). */}
        <View style={{ width: '100%', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', paddingHorizontal: verseSideInset, marginTop: ar ? 2 : 0, marginBottom: ar ? 0 : 4 }}>
          <Text
            allowFontScaling={false}
            style={{ fontFamily: bracketFontFamily, fontSize: bracketFs, color: p.ink, includeFontPadding: false }}
          >
            ﴿
          </Text>
          <View style={{ flex: 1, marginHorizontal: 6, alignItems: 'center', justifyContent: 'center' }}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.2}
              allowFontScaling={false}
              style={{
                width: '100%',
                fontFamily: qcfFontFamily ?? 'KFGQPCUthmanic',
                fontSize: verseFillBase,
                color: p.ink,
                textAlign: 'center',
                writingDirection: 'rtl',
                lineHeight: Math.round(verseFillBase * (Platform.OS === 'android' ? 1.18 : 1.24)),
                includeFontPadding: false,
              }}
            >
              {qcfFontFamily ? qcfDisplay : arabicText}
            </Text>
          </View>
          <Text
            allowFontScaling={false}
            style={{ fontFamily: bracketFontFamily, fontSize: bracketFs, color: p.ink, includeFontPadding: false }}
          >
            ﴾
          </Text>
        </View>
        {!ar && translation.length > 0 ? (
          <Text
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            allowFontScaling={false}
            style={{
              fontFamily: 'Rubik-Medium',
              fontSize: translationFs,
              color: p.ink,
              opacity: 0.88,
              textAlign: 'center',
              writingDirection: 'ltr',
              lineHeight: Math.round(translationFs * 1.35),
              marginTop: size === 'small' ? 4 : 6,
              includeFontPadding: false,
            }}
          >
            {translation}
          </Text>
        ) : null}
        <Text style={{ fontFamily: 'Rubik-Medium', fontSize: size === 'small' ? 11 : 12, color: p.muted, marginTop: ar ? 8 : 7 }}>
          {ar ? `سورة ${surahName}  ${ayahLabel}` : `Surah ${surahName}  ${ayahLabel}`}
        </Text>
      </View>
    </GlassTile>
  );
}

// ────────────────────────────────────────────────────────
// Azkar preview
// ────────────────────────────────────────────────────────

export function AzkarMorningPreview({ size, language }: { size: PreviewSize; language?: Lang }) {
  return (
    <AzkarPreview
      size={size}
      pool="morning"
      title="أذكار الصباح"
      titleEn="Morning Adhkar"
      fallbackSample="أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لله، وَالحَمْدُ لله، لا إله إلا الله وحده لا شريك له"
      fallbackSampleEn="We have reached the morning and at this very time unto Allah belongs all sovereignty"
      language={language}
    />
  );
}

export function AzkarEveningPreview({ size, language }: { size: PreviewSize; language?: Lang }) {
  return (
    <AzkarPreview
      size={size}
      pool="evening"
      title="أذكار المساء"
      titleEn="Evening Adhkar"
      fallbackSample="أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لله، وَالحَمْدُ لله، لا إله إلا الله وحده لا شريك له"
      fallbackSampleEn="We have reached the evening and at this very time unto Allah belongs all sovereignty"
      language={language}
    />
  );
}

/**
 * Shared azkar preview body. Reads the morning / evening pool from shared
 * widget data and picks the active (zikr, chunkIndex) for the current minute
 * using the same `pickAzkarSlot` helper that iOS's SwiftUI view calls — so
 * the gallery + Android bake render the EXACT same chunk that iOS displays
 * at the same moment. Falls back to a hardcoded "أصبحنا/أمسينا" sample when
 * the pool hasn't been built yet (fresh install, before first app open).
 */
function AzkarPreview({
  size,
  pool: poolKey,
  title,
  titleEn,
  fallbackSample,
  fallbackSampleEn,
  language,
}: {
  size: PreviewSize;
  pool: 'morning' | 'evening';
  title: string;
  titleEn: string;
  fallbackSample: string;
  fallbackSampleEn?: string;
  language?: Lang;
}) {
  const { isArabic: ar, numerals, palette: p } = usePreviewSettings(language);
  const sharedData = useWidgetPreviewData();
  const fillText = p.isLight ? 'rgba(0,0,0,0.86)' : 'rgba(255,255,255,0.92)';

  // Live cycling — match iOS BundledAzkar.currentSlot:
  //   • pick (zikr, chunkIndex) by minute-of-day
  //   • Quran content → "قراءة <name>" in Rubik-Bold
  //   • everything else → current ≤140-char chunk in Rubik-Regular
  const pool = sharedData?.azkarPools?.[poolKey];
  const slot = pickAzkarSlot(pool, new Date());
  const fallback = ar ? fallbackSample : (fallbackSampleEn ?? fallbackSample);
  // Language-aware body resolution: Arabic chunk in Arabic mode, English
  // translation (or "Recite …") in English mode.
  const { text: bodyText, isQuran } = resolveAzkarBodyText(slot, fallback, ar);
  const count = Math.max(1, slot?.zikr.count ?? 10);

  // Body is Rubik-Bold; size is COMPUTED to fill the measured body box (no
  // autosize — deterministic + identical on iOS/Android). Quran titles use a
  // fixed size (short label, not a paragraph).
  const bodyFont = 'Rubik-Bold';
  // Computed fill from CONSTANT box (no onLayout race) — short azkar render
  // large, long azkar smaller but COMPLETE (no "…"). Rendered at proportional
  // lineHeight so the box math and layout agree; no autosize (its fixed
  // lineHeight fought the shrink and truncated).
  const bodyBox = azkarBodyBox(size, ar, false);
  const bodyFs = azkarFillFontSize(bodyText.length, bodyBox.w, bodyBox.h, ar);
  const contentPadding = ar
    ? { paddingHorizontal: 12, paddingVertical: 8 }
    : { paddingHorizontal: 20, paddingVertical: 14 };

  return (
    <GlassTile size={size} padding={ar ? undefined : 0} palette={p}>
      <View style={{ flex: 1, ...contentPadding }}>
        {/* Title row hidden in English — the gallery + iOS widget label
            below the tile already say "Morning/Evening Adhkar", and the
            freed space goes to the (longer) translation body. */}
        {ar ? (
          <Text
            numberOfLines={1}
            style={{ fontFamily: 'Rubik-Bold', fontSize: size === 'small' ? 11 : 13, color: p.muted, textAlign: 'center', alignSelf: 'center' }}
          >
            {title}
          </Text>
        ) : null}
        {/* Body in a flex:1 centered wrapper so the count row below always sits
            at the SAME bottom position across all three azkar widgets. */}
        <View
          style={{ flex: 1, alignSelf: 'stretch', alignItems: 'stretch', justifyContent: 'center' }}
        >
          <Text
            numberOfLines={20}
            allowFontScaling={false}
            style={{
              fontFamily: bodyFont,
              fontSize: bodyFs,
              color: fillText,
              textAlign: ar ? 'center' : 'left',
              writingDirection: ar ? 'rtl' : 'ltr',
              lineHeight: Math.round(bodyFs * azkarLineHeightFactor(ar)),
              includeFontPadding: false,
            }}
          >
            {/* English azkar/dhikr body rendered UPPERCASE to match the approved
                mockups; Arabic is never uppercased. */}
            {ar ? bodyText : bodyText.toUpperCase()}
          </Text>
        </View>
        <View style={{ alignItems: 'center', paddingBottom: AZKAR_COUNT_PAD_BOTTOM }}>
          <Text style={{ fontFamily: 'Rubik-Bold', fontSize: size === 'small' ? 11 : 13, color: p.muted }}>
            {`×${applyNumerals(count, numerals, ar)}`}
          </Text>
        </View>
      </View>
    </GlassTile>
  );
}

// ────────────────────────────────────────────────────────
// Hijri preview (Android-only, mirrors HijriDate widgets)
// ────────────────────────────────────────────────────────

// Romanised Hijri month names (matches the EN block in many Islamic calendars).
const HIJRI_MONTHS_EN = [
  'Muharram', 'Safar', 'Rabiʿ I', 'Rabiʿ II', 'Jumada I', 'Jumada II',
  'Rajab', 'Shaʿban', 'Ramadan', 'Shawwal', 'Dhu al-Qaʿdah', 'Dhu al-Hijjah',
];

export function HijriPreview({ size, language }: { size: PreviewSize; language?: Lang }) {
  // Native <Text> with `adjustsFontSizeToFit` so the day + month label always
  // fits inside the small widget — and so Arabic letters shape correctly on
  // Android (SvgText breaks letter joining for Arabic with custom fonts).
  const { isArabic: ar, numerals, palette: p, fontVariant } = usePreviewSettings(language);
  const widgetFont = useWidgetFontFamily(fontVariant);
  let day = 21;
  let monthAr = 'ذو القعدة';
  let monthIndex = 11;
  let year = 1447;
  try {
    const h = getLocalizedHijriDate();
    if (h) {
      day = h.day;
      monthAr = h.monthName;
      monthIndex = h.month;
      year = h.year;
    }
  } catch {}
  const dayLabel = applyNumerals(day, numerals, ar);
  const monthLabel = ar ? monthAr : (HIJRI_MONTHS_EN[monthIndex - 1] ?? monthAr);
  const hijriRow = `${dayLabel} ${monthLabel}`;
  // Length-aware pre-shrink (same spirit as SnapshotWidget's fitCalligraphyFs):
  // RN's adjustsFontSizeToFit floor (minimumFontScale 0.75) is NOT enough for
  // the longest Hijri names — at 22px the small tile clipped «٢٦ ذي الحجة» to
  // «٢٦ ذي» (reported bug). Pre-scale by character budget so the full
  // "{day} {month}" always fits one centered line; the RN auto-shrink stays on
  // as a final safety net for font-metric variance.
  const hijriFit = (base: number, floor: number, budget: number) => {
    const len = hijriRow.trim().length;
    return len <= budget ? base : Math.max(floor, Math.round((base * budget) / len));
  };
  // Enlarged composition (owner request): ~20% bigger date line + year + faint
  // watermark so the small tile reads comfortably. The length-aware pre-shrink
  // keeps the longest month («٢٦ ذي الحجة») on one full line, and RN's
  // adjustsFontSizeToFit (minimumFontScale 0.75) remains the final safety net.
  // KEEP IN SYNC with the live offline fallback in SnapshotWidget.tsx
  // (LiveDateWidget hijriDate branch) so home matches the gallery when the
  // baked PNG is stale.
  const monthFs = size === 'small' ? hijriFit(26, 15, 9) : hijriFit(38, 22, 13);
  const fillStrong = p.ink;
  const watermarkLabel = ar ? 'هجري' : 'Hijri';
  const watermarkFs = size === 'small' ? 50 : 84;
  const watermarkFill = p.isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
  return (
    <GlassTile size={size} padding={0} palette={p}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: size === 'small' ? 10 : 14, paddingBottom: size === 'small' ? 6 : 8 }}>
        {ar ? (
          <Text
            pointerEvents="none"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.5}
            allowFontScaling={false}
            style={{
              position: 'absolute',
              left: 8,
              right: 8,
              top: '50%',
              marginTop: -watermarkFs * 0.55,
              textAlign: 'center',
              fontFamily: ar ? widgetFont : 'Rubik-Bold',
              fontSize: watermarkFs,
              color: watermarkFill,
              writingDirection: ar ? 'rtl' : 'ltr',
              paddingTop: ar ? Math.round(watermarkFs * 0.55) : 0,
              includeFontPadding: false,
            }}
          >
            {watermarkLabel}
          </Text>
        ) : null}
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          allowFontScaling={false}
          style={{
            fontFamily: ar ? widgetFont : 'Rubik-Bold',
            fontSize: monthFs,
            color: fillStrong,
            textAlign: 'center',
            writingDirection: ar ? 'rtl' : 'ltr',
            paddingHorizontal: 4,
            paddingTop: ar ? Math.round(monthFs * 0.55) : 0,
            includeFontPadding: false,
          }}
        >
          {hijriRow}
        </Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={{
            fontFamily: 'Rubik-Medium',
            fontSize: size === 'small' ? 13 : 15,
            color: p.muted,
            marginTop: 6,
          }}
        >
          {`${applyNumerals(year, numerals, ar)} ${ar ? 'هجري' : 'AH'}`}
        </Text>
      </View>
    </GlassTile>
  );
}

// ────────────────────────────────────────────────────────
// Daily Dhikr preview (Android — mirrors DailyDhikr widget)
// ────────────────────────────────────────────────────────

export function DailyDhikrPreview({ size, language }: { size: PreviewSize; language?: Lang }) {
  const { isArabic: ar, numerals, palette: p } = usePreviewSettings(language);
  const sharedData = useWidgetPreviewData();
  const dhikr = sharedData?.dhikr;
  const arabicSource = (dhikr?.arabic && dhikr.arabic.length > 0)
    ? dhikr.arabic
    : 'سُبْحَانَ اللهِ وَبِحَمْدِهِ، سُبْحَانَ اللهِ الْعَظِيمِ';
  const translation = dhikr?.translation || '';
  const count = Math.max(1, dhikr?.count ?? 100);
  const reference = dhikr?.reference;
  const whenSaid = dhikr?.benefit;

  // Mirror iOS DailyDhikrView: Quran content → localized "قراءة <name>" or
  // "Recite <name>" in bold; non-Quran → Arabic chunk (Arabic mode) or full
  // English translation (English mode).
  const quranTitle = detectQuranTitle(arabicSource);
  const isQuran = quranTitle !== null;
  let bodyText: string;
  if (isQuran) {
    bodyText = ar
      ? (quranTitle!.startsWith('قراءة') ? quranTitle! : `قراءة ${quranTitle}`)
      : quranTitleToEnglish(quranTitle!);
  } else if (!ar && translation && cleanEnglishTranslation(translation)) {
    // Strip parenthetical/editorial notes; if it strips to nothing (the whole
    // translation was a note) fall through to the Arabic dhikr below instead of
    // showing the raw note.
    const cleaned = cleanEnglishTranslation(translation);
    const now = new Date();
    const minute = now.getHours() * 60 + now.getMinutes();
    bodyText = pickLongEnglishAzkarPage(cleaned, minute);
  } else {
    // Show the FULL Arabic dhikr (complete) — computed-fill sizing shrinks it to
    // fit, so it never ends mid-sentence on a comma like a ≤140-char chunk would.
    bodyText = arabicSource;
  }

  // Body is Rubik-Bold; size COMPUTED from a CONSTANT box (no onLayout race) so
  // the FULL dhikr fits without truncation and matches Android/iOS exactly.
  const bodyFont = 'Rubik-Bold';
  const hasMetadata = ar && size !== 'small' && Boolean(whenSaid || reference);
  const bodyBox = azkarBodyBox(size, false, hasMetadata);
  const bodyFs = azkarFillFontSize(bodyText.length, bodyBox.w, bodyBox.h, ar);
  const contentPadding = ar
    ? { paddingHorizontal: 12, paddingVertical: 8 }
    : { paddingHorizontal: 20, paddingVertical: 14 };

  return (
    <GlassTile size={size} padding={ar ? undefined : 0} palette={p}>
      <View style={{ flex: 1, ...contentPadding }}>
        {/* Body in a flex:1 centered wrapper; size computed from constants. */}
        <View
          style={{ flex: 1, alignSelf: 'stretch', alignItems: 'stretch', justifyContent: 'center' }}
        >
          <Text
            numberOfLines={20}
            allowFontScaling={false}
            style={{
              fontFamily: bodyFont,
              fontSize: bodyFs,
              color: p.ink,
              textAlign: ar ? 'center' : 'left',
              writingDirection: ar ? 'rtl' : 'ltr',
              lineHeight: Math.round(bodyFs * azkarLineHeightFactor(ar)),
              includeFontPadding: false,
            }}
          >
            {/* English body UPPERCASE to match the approved mockups. */}
            {ar ? bodyText : bodyText.toUpperCase()}
          </Text>
        </View>
        <View style={{ alignItems: 'center', paddingBottom: AZKAR_COUNT_PAD_BOTTOM }}>
          <Text style={{ fontFamily: 'Rubik-Bold', fontSize: size === 'small' ? 12 : 14, color: p.muted }}>
            {`×${applyNumerals(count, numerals, ar)}`}
          </Text>
          {/* Arabic-only benefit + reference: hidden in English mode. */}
          {ar && size !== 'small' && whenSaid ? (
            <Text numberOfLines={1} style={{ fontFamily: 'Rubik-Medium', fontSize: 9, color: p.muted, marginTop: 4, textAlign: 'center', opacity: 0.85, writingDirection: 'rtl' }}>
              {whenSaid}
            </Text>
          ) : null}
          {ar && size !== 'small' && reference ? (
            <Text numberOfLines={1} style={{ fontFamily: 'Rubik-Medium', fontSize: 9, color: p.muted, marginTop: 2, textAlign: 'center', opacity: 0.7 }}>
              {reference}
            </Text>
          ) : null}
        </View>
      </View>
    </GlassTile>
  );
}
