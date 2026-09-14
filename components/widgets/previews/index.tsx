// components/widgets/previews/index.tsx
// Glassify-style RN previews for all widget variants.
// Each preview mirrors the corresponding SwiftUI/Android view at real proportions
// so the in-app gallery matches what the user will see on their home screen.

import React, { useState, useEffect } from 'react';
import { View, Text, Platform, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getLanguage } from '@/lib/i18n';
import { getLocalizedHijriDate } from '@/lib/hijri-date';
import { formatPrayerDurationWithPrefix } from '@/lib/widget-format-duration';
import { getVerseQcfData } from '@/lib/qcf-page-data';
import { getPageFontFamily, isPageFontLoaded, loadPageFont } from '@/lib/qcf-font-loader';
import { getPrayerNameAr, getPrayerNameEn } from '@/lib/prayer-times';

/**
 * Re-format a prayer time from its raw epoch into the language-current
 * "h:mm AM" / "h:mm ص" string. Prefer this over `data.prayer.allPrayers[].time`
 * inside previews — the cached `time` string carries the AM/PM suffix from
 * whichever language was active at the last `updateWidgetData()` call, so
 * switching language without re-running that pipeline leaves stale suffixes
 * visible (e.g. "12:17 م" while the UI is English). Reformatting on every
 * render guarantees the visible suffix always matches the current language.
 */
function formatPrayerTimeForPreview(epochMs: number | undefined, ar: boolean): string | null {
  if (!epochMs || !Number.isFinite(epochMs)) return null;
  const d = new Date(epochMs);
  const hours24 = d.getHours();
  const minutes = d.getMinutes();
  const hour12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
  const mm = String(minutes).padStart(2, '0');
  const isPM = hours24 >= 12;
  const suffix = ar ? (isPM ? 'م' : 'ص') : (isPM ? 'PM' : 'AM');
  return `${hour12}:${mm} ${suffix}`;
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
import { useWidgetSnapshotCapture, useWidgetForcedTheme, useWidgetPreviewData } from './snapshot-capture-context';
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

function englishAzkarFontSize(text: string, size: PreviewSize): number {
  if (size === 'small') return text.length > 180 ? 10 : text.length > 120 ? 11 : text.length > 80 ? 12 : 14;
  if (text.length > 240) return 15;
  if (text.length > 200) return 16;
  if (text.length > 160) return 18;
  if (text.length > 110) return 20;
  return 22;
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
        monthLabel = ar ? (HIJRI_MONTHS_AR[h.month - 1] ?? h.monthName) : h.monthName;
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
            color: p.text,
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
            color: p.text,
            opacity: 0.94,
            includeFontPadding: false,
          }}
        >
          {applyNumerals(dayNum, numerals, ar)}
        </Text>
        <Text style={{ fontFamily: 'Rubik-Medium', fontSize: size === 'small' ? 14 : 18, color: p.muted }}>
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
  const fillStrong = p.isLight ? 'rgba(0,0,0,0.86)' : 'rgba(255,255,255,0.92)';
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
          color={p.text}
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
              color: p.text,
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
  const fillStrong = p.isLight ? 'rgba(0,0,0,0.86)' : 'rgba(255,255,255,0.92)';
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
            position: 'absolute',
            top: 0,
            bottom: dateBottom + (size === 'small' ? 18 : 22),
            left: 12,
            right: 12,
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: size === 'small' ? 10 : 14,
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
  const fillStrong = p.isLight ? 'rgba(0,0,0,0.86)' : 'rgba(255,255,255,0.92)';
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

function resolvePreviewEpoch(sharedData: ReturnType<typeof useWidgetPreviewData>, isNext: boolean): number | undefined {
  const now = Date.now();
  const epochs = (sharedData?.prayer?.allPrayers ?? [])
    .map((p) => (p as any).epochMs as number)
    .filter((e) => Number.isFinite(e) && e > 0)
    .sort((a, b) => a - b);
  if (isNext) {
    return epochs.find((e) => e > now) ?? sharedData?.prayer?.nextPrayerAtEpochMs;
  }
  return [...epochs].reverse().find((e) => e <= now) ?? sharedData?.prayer?.previousPrayerAtEpochMs;
}

function resolvePreviewPrayerItem(sharedData: ReturnType<typeof useWidgetPreviewData>, isNext: boolean) {
  const epoch = resolvePreviewEpoch(sharedData, isNext);
  if (!epoch) return undefined;
  return (sharedData?.prayer?.allPrayers ?? []).find(
    (p) => Math.abs(((p as any).epochMs as number) - epoch) < 90000
  );
}

export function PrayerSimplePreview({ size, language, forSnapshot }: { size: PreviewSize; language?: Lang; forSnapshot?: boolean }) {
  const { isArabic: ar, numerals, palette: p } = usePreviewSettings(language);
  const sharedData = useWidgetPreviewData();
  useLiveTick();
  const digitFont = 'Rubik-Bold';
  const trueNextItem = resolvePreviewPrayerItem(sharedData, true);
  // Reformat from epoch on every render so the AM/PM suffix follows the
  // current language. Falls back to cached strings only as a last resort.
  const liveTimeStr = formatPrayerTimeForPreview(trueNextItem?.epochMs ?? sharedData?.prayer?.nextPrayerAtEpochMs, ar);
  const time = noWrapPrayerTime(applyNumerals(liveTimeStr ?? trueNextItem?.time ?? sharedData?.prayer?.nextPrayerTime ?? '04:14', numerals, ar));
  const name = ar ? (trueNextItem?.nameAr ?? sharedData?.prayer?.nextPrayerNameAr ?? 'الفجر') : (trueNextItem?.name ?? sharedData?.prayer?.nextPrayerName ?? 'Fajr');
  const countdown = compactRemainingFromEpoch(resolvePreviewEpoch(sharedData, true), (s) => applyNumerals(s, numerals, ar), ar);
  const timeFs = Platform.OS === 'android' && size === 'small' ? 38 : size === 'small' ? 42 : 56;
  return (
    <GlassTile size={size} palette={p}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text numberOfLines={1} style={{ fontFamily: 'Rubik-Medium', fontSize: size === 'small' ? 11 : 13, lineHeight: size === 'small' ? 14 : 16, color: p.muted, marginBottom: 2, includeFontPadding: false }}>
          {ar ? 'الصلاة القادمة' : 'Next Prayer'}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            fontFamily: PRAYER_NAME_FONT,
            fontSize: size === 'small' ? 22 : 30,
            lineHeight: size === 'small' ? 27 : 36,
            color: p.text,
            includeFontPadding: false,
          }}
        >
          {name}
        </Text>
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
          style={{ fontFamily: digitFont, fontSize: timeFs, lineHeight: timeFs + 6, color: p.text, marginTop: 2, letterSpacing: -1, includeFontPadding: false }}
        >
          {time}
        </DynamicTimeText>
        {/* Phase B C2: snapshot omits the live countdown; the iOS / Android shell
            draws it on top of the PNG so it stays accurate. */}
        {forSnapshot ? (
          <View style={{ height: size === 'small' ? 14 : 16, marginTop: 4 }} />
        ) : (
          <Text numberOfLines={1} style={{ fontFamily: 'Rubik-Medium', fontSize: size === 'small' ? 10 : 12, lineHeight: size === 'small' ? 13 : 16, color: p.muted, marginTop: 4, includeFontPadding: false }}>
            {countdown}
          </Text>
        )}
      </View>
    </GlassTile>
  );
}

const PRAYER_ROWS: {
  keyAr: string;
  keyEn: string;
  time: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  isNext?: boolean;
}[] = [
  { keyAr: 'الفجر', keyEn: 'Fajr', time: '05:35', icon: 'weather-sunset-up' },
  { keyAr: 'الشروق', keyEn: 'Sunrise', time: '06:49', icon: 'white-balance-sunny' },
  { keyAr: getPrayerNameAr('dhuhr'), keyEn: getPrayerNameEn('dhuhr'), time: '12:17', icon: 'weather-sunny', isNext: true },
  { keyAr: 'العصر', keyEn: 'Asr', time: '03:32', icon: 'weather-hazy' },
  { keyAr: 'المغرب', keyEn: 'Maghrib', time: '06:42', icon: 'weather-sunset' },
  { keyAr: 'العشاء', keyEn: 'Isha', time: '08:19', icon: 'weather-night' },
];

function prayerRowsFromShared(data: ReturnType<typeof useWidgetPreviewData>, ar: boolean) {
  const items = data?.prayer?.allPrayers;
  // allPrayers contains today's 6 prayers only. Guard against stale multi-day
  // data that could produce duplicate keys in the list.
  if (!items?.length) return PRAYER_ROWS;
  const todayItems = items.slice(0, 6);
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
  return todayItems.map((item) => {
    // Reformat from epochMs so the AM/PM suffix matches the CURRENT
    // language. Fall back to the cached `item.time` only if the epoch
    // is missing (very old shared-data shape).
    const liveTime = formatPrayerTimeForPreview(item.epochMs, ar) ?? item.time ?? '--:--';
    return {
      keyAr: item.nameAr ?? item.name ?? '',
      keyEn: item.name ?? item.nameAr ?? '',
      time: liveTime,
      icon: iconFor(item.name),
      isNext: !!item.isNext,
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

function noWrapPrayerTime(value: string | number): string {
  const text = String(value).trim().replace(/\s+/g, ' ');
  return text.replace(/\s+/g, '\u00A0');
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
  const hideInSnapshot = forSnapshot && Platform.OS !== 'android';
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
  const timeFont = 'Rubik-Bold';
  const widgetFontL = useWidgetFontFamily(fontVariant);
  const prayerRows = prayerRowsFromShared(sharedData, ar);
  const nextPrayer = prayerRows.find((r) => r.isNext) ?? prayerRows[0] ?? PRAYER_ROWS[0];
  const fmt = (s: string | number) => applyNumerals(s, numerals, ar);
  const remainingText = compactRemainingFromEpoch(resolvePreviewEpoch(sharedData, true), fmt, ar);
  const remainingTight = remainingText.replace(/\s/g, '');
  // Highlight overlay for the active prayer row — light tint on light themes,
  // white tint on dark, so it stays legible across all 8 palettes.
  const activeBg = p.isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.12)';

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
                const label = ar ? row.keyAr : row.keyEn;
                const timeStr = noWrapPrayerTime(fmt(row.time));
                const anchorId = `prayerRowTime.${row.keyEn.toLowerCase()}`;
                // When capturing: skip the active-bg fill and use the
                // muted color for every row — iOS overlay re-tints the
                // current active row and writes time text in the active
                // foreground color, so the PNG never freezes state.
                const rowBg = ((forSnapshot && Platform.OS !== 'android') || !active) ? 'transparent' : activeBg;
                const fgForCapture = forSnapshot && Platform.OS !== 'android' ? p.muted : (active ? p.text : p.muted);
                return (
                  <View
                    key={row.keyEn}
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
                      anchorColor={p.text}
                      anchorAlignment={ar ? 'leading' : 'trailing'}
                      anchorDirection={ar ? 'rtl' : 'ltr'}
                    >
                      {timeStr}
                    </DynamicTimeText>
                    <Text numberOfLines={1} style={{ fontFamily: PRAYER_NAME_FONT, fontSize: listFs, lineHeight: listFs + 3, color: fgForCapture, includeFontPadding: false }}>
                      {label}
                    </Text>
                  </View>
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
                  color={p.text}
                  alignment="center"
                  direction={ar ? 'rtl' : 'ltr'}
                >
                  <Text numberOfLines={1} style={{ fontFamily: PRAYER_NAME_FONT, fontSize: 20, lineHeight: 24, color: p.text, includeFontPadding: false }}>
                    {ar ? nextPrayer.keyAr : nextPrayer.keyEn}
                  </Text>
                </AnchorReporter>
              ) : (
                <Text numberOfLines={1} style={{ fontFamily: PRAYER_NAME_FONT, fontSize: 20, lineHeight: 24, color: p.text, includeFontPadding: false }}>
                  {ar ? nextPrayer.keyAr : nextPrayer.keyEn}
                </Text>
              )}
              <DynamicTimeText
                forSnapshot={forSnapshot}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                style={{ fontFamily: timeFont, fontSize: heroTimeFs, lineHeight: heroTimeFs + 5, color: p.text, marginTop: 2, letterSpacing: -1, includeFontPadding: false }}
                anchorId="prayerHeroTime"
                anchorFontFamily={timeFont}
                anchorFontSize={heroTimeFs}
                anchorFontWeight="bold"
                anchorColor={p.text}
                anchorAlignment="center"
                anchorDirection={ar ? 'rtl' : 'ltr'}
              >
                {noWrapPrayerTime(fmt(nextPrayer.time))}
              </DynamicTimeText>
              {forSnapshot ? (
                <AnchorReporter
                  id="prayerHeroCountdown"
                  fontFamily="Rubik-Medium"
                  fontSize={9}
                  fontWeight="medium"
                  color={p.muted}
                  alignment="center"
                  direction={ar ? 'rtl' : 'ltr'}
                  isCountdown
                  style={{ marginTop: 2 }}
                >
                  <Text numberOfLines={1} style={{ fontFamily: 'Rubik-Medium', fontSize: 9, lineHeight: 12, color: p.muted, includeFontPadding: false }}>
                    {remainingText || (ar ? '— س — د' : '—H —M')}
                  </Text>
                </AnchorReporter>
              ) : (
                <Text numberOfLines={1} style={{ fontFamily: 'Rubik-Medium', fontSize: 9, lineHeight: 12, color: p.muted, marginTop: 2, includeFontPadding: false }}>
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
            {forSnapshot ? (
              <View style={{ width: 80, height: 12 }} />
            ) : (
              <Text numberOfLines={1} style={{ fontFamily: 'Rubik-Medium', fontSize: 9, lineHeight: 12, color: p.muted, includeFontPadding: false }}>
                {remainingTight}
              </Text>
            )}
            <Text numberOfLines={1} style={{ fontFamily: 'Rubik-Medium', fontSize: 9, lineHeight: 12, color: p.muted, includeFontPadding: false }}>
              {ar ? 'الصلاة القادمة' : 'Next Prayer'}
            </Text>
          </View>
          {prayerRows.map((row) => {
            const active = !!row.isNext;
            const label = ar ? row.keyAr : row.keyEn;
            const timeStr = noWrapPrayerTime(fmt(row.time));
            return (
              <View
                key={row.keyEn}
                style={{
                  flexDirection: rowDir,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 4,
                  paddingVertical: rowPv,
                  borderRadius: 6,
                  backgroundColor: active ? activeBg : 'transparent',
                }}
              >
                <DynamicTimeText forSnapshot={forSnapshot} numberOfLines={1} style={{ width: Platform.OS === 'android' ? 54 : undefined, textAlign: ar ? 'left' : 'right', writingDirection: ar ? 'rtl' : 'ltr', fontFamily: timeFont, fontSize: listFs, lineHeight: listFs + 3, color: active ? p.text : p.muted, letterSpacing: -0.3, includeFontPadding: false }}>
                  {timeStr}
                </DynamicTimeText>
                <Text numberOfLines={1} style={{ fontFamily: PRAYER_NAME_FONT, fontSize: listFs, lineHeight: listFs + 3, color: active ? p.text : p.muted, includeFontPadding: false }}>
                  {label}
                </Text>
              </View>
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
  const largePad = isAndroid ? 12 : 14;
  const heroPadV = isAndroid ? 11 : 14;
  const heroMb = isAndroid ? 9 : 10;
  const heroNameFs = isAndroid ? 21 : 22;
  const heroTimeFs = isAndroid ? 34 : 36;
  const rowFs = isAndroid ? 16 : 15;
  const rowPv = isAndroid ? 4 : 6;
  const rowIcon = isAndroid ? 15 : 16;
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
          <MaterialCommunityIcons name={nextPrayer.icon} size={isAndroid ? 28 : 32} color={p.muted} />
          <View style={{ flex: 1, alignItems: heroContentAlign }}>
            <Text numberOfLines={1} style={{ fontFamily: PRAYER_NAME_FONT, fontSize: heroNameFs, lineHeight: heroNameFs + 4, color: p.text, includeFontPadding: false }}>
              {ar ? nextPrayer.keyAr : nextPrayer.keyEn}
            </Text>
            <DynamicTimeText forSnapshot={forSnapshot} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ fontFamily: timeFont, fontSize: heroTimeFs, lineHeight: heroTimeFs + 5, color: p.text, marginTop: 2, letterSpacing: -1, includeFontPadding: false }}>
              {noWrapPrayerTime(fmt(nextPrayer.time))}
            </DynamicTimeText>
            {forSnapshot ? (
              <View style={{ height: isAndroid ? 14 : 16, marginTop: isAndroid ? 2 : 4 }} />
            ) : (
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ fontFamily: 'Rubik-Medium', fontSize: isAndroid ? 11 : 12, lineHeight: isAndroid ? 14 : 16, color: p.muted, marginTop: isAndroid ? 2 : 4, includeFontPadding: false }}>
                {ar ? `الصلاة القادمة ${remainingLarge}` : `Next prayer ${remainingLarge}`}
              </Text>
            )}
          </View>
        </View>
        <View style={{ flex: isAndroid ? 1 : undefined, justifyContent: isAndroid ? 'space-between' : undefined }}>
          {prayerRows.map((row) => {
            const active = !!row.isNext;
            const label = ar ? row.keyAr : row.keyEn;
            const timeStr = noWrapPrayerTime(fmt(row.time));
            return (
              <View
                key={row.keyEn}
                style={{
                  flexDirection: rowDir,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 8,
                  paddingVertical: rowPv,
                  borderRadius: 10,
                  backgroundColor: active ? activeBg : 'transparent',
                  marginBottom: isAndroid ? 0 : 1,
                }}
              >
                <DynamicTimeText forSnapshot={forSnapshot} numberOfLines={1} style={{ width: isAndroid ? 66 : undefined, textAlign: ar ? 'left' : 'right', writingDirection: ar ? 'rtl' : 'ltr', fontFamily: timeFont, fontSize: rowFs, lineHeight: rowFs + 4, color: active ? p.text : p.muted, letterSpacing: -0.3, includeFontPadding: false }}>
                  {timeStr}
                </DynamicTimeText>
                <View style={{ flexDirection: innerGroupDir, alignItems: 'center', gap: 6 }}>
                  <Text numberOfLines={1} style={{ fontFamily: PRAYER_NAME_FONT, fontSize: rowFs, lineHeight: rowFs + 4, color: active ? p.text : p.muted, includeFontPadding: false }}>
                    {label}
                  </Text>
                  <MaterialCommunityIcons name={row.icon} size={rowIcon} color={active ? p.text : p.muted} />
                </View>
              </View>
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
  const timeFont = 'Rubik-Bold';
  const boxBg = p.isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)';
  const boxBorder = p.isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.10)';
  const fmt = (s: string | number) => applyNumerals(s, numerals, ar);
  const isAndroid = Platform.OS === 'android';
  const trueNextPrev = resolvePreviewPrayerItem(sharedData, true);
  const truePrevPrev = resolvePreviewPrayerItem(sharedData, false);
  const nextName = ar ? (trueNextPrev?.nameAr ?? sharedData?.prayer?.nextPrayerNameAr ?? 'الفجر') : (trueNextPrev?.name ?? sharedData?.prayer?.nextPrayerName ?? 'Fajr');
  const previousName = ar ? (truePrevPrev?.nameAr ?? sharedData?.prayer?.previousPrayerNameAr ?? 'العشاء') : (truePrevPrev?.name ?? sharedData?.prayer?.previousPrayerName ?? 'Isha');
  const nextItem = {
    label: ar ? 'الصلاة القادمة' : 'Next Prayer',
    name: nextName,
    time: noWrapPrayerTime(fmt(
      formatPrayerTimeForPreview(trueNextPrev?.epochMs ?? sharedData?.prayer?.nextPrayerAtEpochMs, ar)
      ?? trueNextPrev?.time
      ?? sharedData?.prayer?.nextPrayerTime
      ?? '04:14'
    )),
    sub: compactRemainingFromEpoch(resolvePreviewEpoch(sharedData, true), fmt, ar),
    icon: 'weather-sunset-up' as const,
  };
  const previousItem = {
    label: ar ? 'الصلاة السابقة' : 'Previous Prayer',
    name: previousName,
    time: noWrapPrayerTime(fmt(
      formatPrayerTimeForPreview(truePrevPrev?.epochMs ?? sharedData?.prayer?.previousPrayerAtEpochMs, ar)
      ?? truePrevPrev?.time
      ?? '08:18'
    )),
    sub: compactRemainingFromEpoch(resolvePreviewEpoch(sharedData, false), fmt, ar, 'previous'),
    icon: 'weather-night' as const,
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
            <Text
              numberOfLines={1}
              style={{
                fontFamily: PRAYER_NAME_FONT,
                fontSize: isAndroid ? 15 : 16,
                lineHeight: isAndroid ? 19 : 21,
                color: p.text,
                marginTop: 4,
                textAlign: 'center',
                includeFontPadding: false,
              }}
            >
              {item.name}
            </Text>
            <DynamicTimeText
              forSnapshot={forSnapshot}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              style={{
                fontFamily: timeFont,
                fontSize: isAndroid ? 24 : 28,
                lineHeight: isAndroid ? 30 : 34,
                color: p.text,
                marginTop: 2,
                letterSpacing: -0.5,
                includeFontPadding: false,
              }}
            >
              {item.time}
            </DynamicTimeText>
            {/* Dynamic countdown/since labels are drawn by the native shell so
                both cards stay fresh and visually balanced on the home screen. */}
            {forSnapshot ? (
              <View style={{ height: 12, marginTop: 2 }} />
            ) : (
              <Text numberOfLines={1} style={{ fontFamily: 'Rubik-Medium', fontSize: 9, lineHeight: 12, color: p.muted, marginTop: 2, includeFontPadding: false }}>{item.sub}</Text>
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

  if (arabicChars > 200) return 26;
  if (arabicChars > 115 || effectiveWords > 10) return ar ? 34 : 31;
  if (arabicChars > 82 || effectiveWords > 8) return ar ? 40 : 37;
  if (arabicChars > 58 || effectiveWords > 6) return ar ? 46 : 42;
  if (arabicChars > 38 || effectiveWords > 4) return ar ? 52 : 47;
  return ar ? 58 : 52;
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
    if (sharedVerse?.arabic && typeof (sharedVerse as any).surahNumber === 'number') {
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
  const arabicFs = verseArabicFontSize(size, ar, arabicCharCount, qcfData?.glyphs.length ?? 0);
  const bracketFs = Math.round(arabicFs * 0.92);
  const verseSideInset = size === 'small' ? 32 : 36;
  const translationFs = size === 'small'
    ? (translation.length > 90 ? 13 : 14)
    : translation.length > 95 ? 18 : 20;
  return (
    <GlassTile size={size} padding={0} palette={p}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: size === 'small' ? 14 : 20, paddingTop: ar ? 18 : 16, paddingBottom: ar ? 8 : 8 }}>
        <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center', paddingHorizontal: verseSideInset, marginTop: ar ? 2 : 0, marginBottom: ar ? 0 : -8 }}>
          <Text
            allowFontScaling={false}
            style={{
              position: 'absolute',
              right: 0,
              fontFamily: 'KFGQPCUthmanic',
              fontSize: bracketFs,
              lineHeight: Math.round(bracketFs * 1.15),
              color: p.text,
              includeFontPadding: false,
            }}
          >
            ﴿
          </Text>
          <View style={{ alignSelf: 'stretch', overflow: 'hidden' }}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.38}
              allowFontScaling={false}
              style={{
                fontFamily: qcfFontFamily ?? 'KFGQPCUthmanic',
                fontSize: arabicFs,
                color: p.text,
                textAlign: 'center',
                writingDirection: 'rtl',
                lineHeight: Platform.select({
                  android: Math.round(arabicFs * 1.18),
                  default: Math.round(arabicFs * 1.24),
                }),
                includeFontPadding: false,
              }}
            >
              {qcfFontFamily ? qcfDisplay : arabicText}
            </Text>
          </View>
          <Text
            allowFontScaling={false}
            style={{
              position: 'absolute',
              left: 0,
              fontFamily: 'KFGQPCUthmanic',
              fontSize: bracketFs,
              lineHeight: Math.round(bracketFs * 1.15),
              color: p.text,
              includeFontPadding: false,
            }}
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
              color: p.text,
              opacity: 0.88,
              textAlign: 'center',
              writingDirection: 'ltr',
              lineHeight: Math.round(translationFs * 1.35),
              marginTop: size === 'small' ? -2 : -4,
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

  // Font sizing matches iOS AzkarQuoteView:
  //   Quran title → Rubik-Bold (largest)
  //   Arabic chunk → Rubik-Regular
  //   English translation → Rubik-Bold with length-aware sizing so it stays
  //     large without clipping.
  const bodyFont = isQuran || !ar ? 'Rubik-Bold' : 'Rubik-Regular';
  const bodyFs = isQuran
    ? (size === 'small' ? 16 : 21)
    : ar
      ? (size === 'small' ? 13 : 17)
      : englishAzkarFontSize(bodyText, size);
  const contentPadding = ar
    ? { paddingHorizontal: 12, paddingVertical: 8 }
    : { paddingHorizontal: 20, paddingVertical: 14 };

  return (
    <GlassTile size={size} padding={ar ? undefined : 0} palette={p}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', ...contentPadding }}>
        {/* Title row hidden in English — the gallery + iOS widget label
            below the tile already say "Morning/Evening Adhkar", and the
            freed space goes to the (longer) translation body. */}
        {ar ? (
          <Text
            numberOfLines={1}
            style={{ fontFamily: 'Rubik-Bold', fontSize: size === 'small' ? 11 : 13, color: p.muted }}
          >
            {title}
          </Text>
        ) : null}
        <View style={{ flex: 1, alignSelf: 'stretch', alignItems: ar ? 'center' : 'stretch', justifyContent: 'center', paddingBottom: ar ? 0 : 8 }}>
          <Text
            numberOfLines={ar ? 3 : 5}
            adjustsFontSizeToFit
            minimumFontScale={ar ? 0.85 : 0.68}
            allowFontScaling={false}
            style={{
              fontFamily: bodyFont,
              fontSize: bodyFs,
              color: fillText,
              textAlign: ar ? 'center' : 'left',
              writingDirection: ar ? 'rtl' : 'ltr',
              lineHeight: Math.round(bodyFs * (ar ? 1.3 : 1.18)),
              includeFontPadding: false,
            }}
          >
            {bodyText}
          </Text>
        </View>
        <Text style={{ fontFamily: 'Rubik-Bold', fontSize: size === 'small' ? 11 : 13, color: p.muted, position: ar ? 'relative' : 'absolute', bottom: ar ? undefined : 10, alignSelf: 'center' }}>
          {`×${applyNumerals(count, numerals, ar)}`}
        </Text>
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
  // Smaller base font on small widgets so "٢٣ ذو القعدة" fits with auto-shrink
  // headroom; medium/large keep the original calligraphic scale.
  const monthFs = size === 'small' ? 22 : 32;
  const dayLabel = applyNumerals(day, numerals, ar);
  const monthLabel = ar ? monthAr : (HIJRI_MONTHS_EN[monthIndex - 1] ?? monthAr);
  const hijriRow = `${dayLabel}  ${monthLabel}`;
  const fillStrong = p.isLight ? 'rgba(0,0,0,0.86)' : p.text;
  const watermarkLabel = ar ? 'هجري' : 'Hijri';
  const watermarkFs = size === 'small' ? 44 : 72;
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
            fontSize: size === 'small' ? 11 : 13,
            color: p.muted,
            marginTop: 4,
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
  } else if (!ar && translation) {
    // Strip parenthetical notes so the rendered font stays large.
    const cleaned = cleanEnglishTranslation(translation) || translation;
    const now = new Date();
    const minute = now.getHours() * 60 + now.getMinutes();
    bodyText = pickLongEnglishAzkarPage(cleaned, minute);
  } else {
    const chunks = splitAzkarChunks(arabicSource);
    const now = new Date();
    const minute = now.getHours() * 60 + now.getMinutes();
    const chunkIdx = ((minute % chunks.length) + chunks.length) % chunks.length;
    bodyText = chunks[chunkIdx] ?? chunks[0] ?? arabicSource;
  }

  // Rubik-Bold for Quran title AND English body; Rubik-Regular only for
  // Arabic body chunks.
  const bodyFont = isQuran || !ar ? 'Rubik-Bold' : 'Rubik-Regular';
  const bodyFs = isQuran
    ? (size === 'small' ? 14 : 19)
    : ar
      ? (size === 'small' ? 12 : 16)
      : englishAzkarFontSize(bodyText, size);
  const contentPadding = ar
    ? { paddingHorizontal: 12, paddingVertical: 8 }
    : { paddingHorizontal: 20, paddingVertical: 14 };

  return (
    <GlassTile size={size} padding={ar ? undefined : 0} palette={p}>
      <View style={{ flex: 1, alignItems: ar ? 'center' : 'stretch', justifyContent: 'center', ...contentPadding }}>
        <Text
          numberOfLines={ar ? 3 : 5}
          adjustsFontSizeToFit
          minimumFontScale={ar ? 0.85 : 0.68}
          allowFontScaling={false}
          style={{
            fontFamily: bodyFont,
            fontSize: bodyFs,
            color: p.text,
            textAlign: ar ? 'center' : 'left',
            writingDirection: ar ? 'rtl' : 'ltr',
            lineHeight: Math.round(bodyFs * (ar ? 1.3 : 1.18)),
            includeFontPadding: false,
          }}
        >
          {bodyText}
        </Text>
        <Text style={{ fontFamily: 'Rubik-Bold', fontSize: size === 'small' ? 12 : 14, color: p.muted, marginTop: 6, alignSelf: 'center' }}>
          {`×${applyNumerals(count, numerals, ar)}`}
        </Text>
        {/* Arabic-only benefit + reference: hidden in English mode (no
            English translation exists in azkar.json for these fields) so
            the tile stays language-coherent and the translation body
            gets the freed vertical space. */}
        {ar && size !== 'small' && whenSaid ? (
          <Text
            numberOfLines={1}
            style={{
              fontFamily: 'Rubik-Medium',
              fontSize: 9,
              color: p.muted,
              marginTop: 4,
              textAlign: 'center',
              opacity: 0.85,
              writingDirection: 'rtl',
            }}
          >
            {whenSaid}
          </Text>
        ) : null}
        {ar && size !== 'small' && reference ? (
          <Text
            numberOfLines={1}
            style={{
              fontFamily: 'Rubik-Medium',
              fontSize: 9,
              color: p.muted,
              marginTop: 2,
              textAlign: 'center',
              opacity: 0.7,
            }}
          >
            {reference}
          </Text>
        ) : null}
      </View>
    </GlassTile>
  );
}
