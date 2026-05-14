// components/widgets/previews/index.tsx
// Glassify-style RN previews for all widget variants.
// Each preview mirrors the corresponding SwiftUI/Android view at real proportions
// so the in-app gallery matches what the user will see on their home screen.

import React from 'react';
import { View, Text, Platform, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fontBold, fontMedium, fontRegular } from '@/lib/fonts';
import { getLanguage } from '@/lib/i18n';
import { getLocalizedHijriDate } from '@/lib/hijri-date';
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
  const dayCalendar = resolveCalendar(
    (display.widgetDayCalendar ?? display.widgetCalendar ?? 'auto') as any,
    isArabic,
  );
  const monthCalendar = resolveCalendar(
    (display.widgetMonthCalendar ?? display.widgetCalendar ?? 'auto') as any,
    isArabic,
  );
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
            fontFamily: fontBold(),
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
        <Text style={{ fontFamily: fontMedium(), fontSize: size === 'small' ? 14 : 18, color: p.muted }}>
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
  const { numerals, dayCalendar, palette: p, fontVariant } = usePreviewSettings(language);
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
  const watermark = applyNumerals(dayNum, numerals, true);
  const watermarkFont = watermarkFontFor(numerals, true, widgetFont);
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
            fontFamily: widgetFont,
            fontSize: fs,
            color: fillStrong,
            textAlign: 'center',
            writingDirection: 'rtl',
            paddingHorizontal: 8,
            paddingTop: Math.round(fs * 0.55),
            includeFontPadding: false,
          }}
        >
          {info.weekdayAr}
        </Text>
      </View>
    </GlassTile>
  );
}

export function DayDigitalPreview({ size, language, forSnapshot }: { size: PreviewSize; language?: Lang; forSnapshot?: boolean }) {
  const { isArabic: ar, numerals, dayCalendar, dateFormat, palette: p } = usePreviewSettings(language);
  const time = formatTimeHHMM(new Date());
  const digitFont = 'Rubik-Bold';
  // Phase B C2: snapshot omits the live time digits; native shell draws them
  // on top via the `currentTime` overlay anchor.
  const timeStr = forSnapshot ? '' : applyNumerals(time, numerals, ar);
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
  // Native Text instead of SvgText — react-native-svg doesn't apply custom
  // fonts reliably on Android, causing Rubik-Bold to fall back to system font.
  return (
    <GlassTile size={size} palette={p}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        {timeStr ? (
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
        ) : (
          // forSnapshot=true: reserve exact height so the PNG layout matches
          // the live overlay position that the native shell draws on top.
          <View style={{ height: fontPx + 8 }} />
        )}
        <Text style={{ fontFamily: 'Rubik-Regular', fontSize: size === 'small' ? 12 : 14, color: p.muted, marginTop: 10 }}>
          {dateStr}
        </Text>
      </View>
    </GlassTile>
  );
}

export function MonthSimplePreview({ size, language }: { size: PreviewSize; language?: Lang }) {
  const { isArabic: ar, monthCalendar, numerals, dateFormat, palette: p, fontVariant } = usePreviewSettings(language);
  const widgetFont = useWidgetFontFamily(fontVariant);
  const dims = getSizeDims(size);
  const svgW = dims.width;
  const svgH = dims.height;
  const fs = size === 'small' ? 26 : 38;
  const wmFs = size === 'small' ? 90 : 140;
  let hijriMonth = '';
  let hijriDayNum = 9;
  let hijriYear = 1447;
  try {
    const h = getLocalizedHijriDate();
    if (h) {
      hijriMonth = h.monthName;
      hijriDayNum = h.day;
      hijriYear = h.year;
    }
  } catch {}
  const now = new Date();
  const useHijri = monthCalendar === 'hijri';
  const monthLabel = useHijri
    ? (hijriMonth || 'ذو القعدة')
    : now.toLocaleString(ar ? 'ar' : 'en', { month: 'long' });
  const wmDay = useHijri ? hijriDayNum : now.getDate();
  const watermark = applyNumerals(wmDay, numerals, true);
  const watermarkFont = watermarkFontFor(numerals, true, widgetFont);
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
            y={svgH * 0.85}
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
              fontFamily: widgetFont,
              fontSize: fs,
              color: fillStrong,
              textAlign: 'center',
              writingDirection: 'rtl',
              paddingTop: Math.round(fs * 0.55),
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
              fontFamily: fontMedium(),
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
  // Thuluth calligraphy — always Arabic script. The month name + watermark day
  // respect the user's `monthCalendar` preference (Hijri vs Gregorian).
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
  let monthLabel = now.toLocaleString('ar', { month: 'long' });
  let wmDay = now.getDate();
  if (useHijri) {
    try {
      const h = getLocalizedHijriDate();
      if (h) {
        monthLabel = h.monthName || 'ذو القعدة';
        wmDay = h.day;
      }
    } catch {}
  }
  const watermark = applyNumerals(wmDay, numerals, true);
  const watermarkFont = watermarkFontFor(numerals, true, widgetFont);
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
            fontFamily: widgetFont,
            fontSize: fs,
            color: fillStrong,
            textAlign: 'center',
            writingDirection: 'rtl',
            paddingHorizontal: 10,
            paddingTop: Math.round(fs * 0.55),
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
              fontFamily: fontBold(),
              fontSize: size === 'small' ? 34 : 48,
              color: faintFill,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              marginRight: 10,
            }}
          >
            {monthLabel}
          </Text>
          <Text style={{ fontFamily: fontBold(), fontSize: size === 'small' ? 40 : 58, color: p.text }}>
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

export function PrayerSimplePreview({ size, language, forSnapshot }: { size: PreviewSize; language?: Lang; forSnapshot?: boolean }) {
  const { isArabic: ar, numerals, palette: p } = usePreviewSettings(language);
  const sharedData = useWidgetPreviewData();
  const digitFont = 'Rubik-Bold';
  const time = noWrapPrayerTime(applyNumerals(sharedData?.prayer?.nextPrayerTime ?? '04:14', numerals, ar));
  const name = ar ? (sharedData?.prayer?.nextPrayerNameAr ?? 'الفجر') : (sharedData?.prayer?.nextPrayerName ?? 'Fajr');
  const countdown = compactRemainingFromEpoch(sharedData?.prayer?.nextPrayerAtEpochMs, (s) => applyNumerals(s, numerals, ar), ar);
  const timeFs = Platform.OS === 'android' && size === 'small' ? 38 : size === 'small' ? 42 : 56;
  return (
    <GlassTile size={size} palette={p}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text numberOfLines={1} style={{ fontFamily: fontMedium(), fontSize: size === 'small' ? 11 : 13, lineHeight: size === 'small' ? 14 : 16, color: p.muted, marginBottom: 2, includeFontPadding: false }}>
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
        <Text
          adjustsFontSizeToFit
          numberOfLines={1}
          minimumFontScale={0.7}
          style={{ fontFamily: digitFont, fontSize: timeFs, lineHeight: timeFs + 6, color: p.text, marginTop: 2, letterSpacing: -1, includeFontPadding: false }}
        >
          {time}
        </Text>
        {/* Phase B C2: snapshot omits the live countdown; the iOS / Android shell
            draws it on top of the PNG so it stays accurate. */}
        {forSnapshot ? (
          <View style={{ height: size === 'small' ? 14 : 16, marginTop: 4 }} />
        ) : (
          <Text numberOfLines={1} style={{ fontFamily: fontMedium(), fontSize: size === 'small' ? 10 : 12, lineHeight: size === 'small' ? 13 : 16, color: p.muted, marginTop: 4, includeFontPadding: false }}>
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
  { keyAr: 'الظهر', keyEn: 'Dhuhr', time: '12:17', icon: 'weather-sunny', isNext: true },
  { keyAr: 'العصر', keyEn: 'Asr', time: '03:32', icon: 'weather-hazy' },
  { keyAr: 'المغرب', keyEn: 'Maghrib', time: '06:42', icon: 'weather-sunset' },
  { keyAr: 'العشاء', keyEn: 'Isha', time: '08:19', icon: 'weather-night' },
];

function prayerRowsFromShared(data: ReturnType<typeof useWidgetPreviewData>) {
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
  return todayItems.map((item) => ({
    keyAr: item.nameAr ?? item.name ?? '',
    keyEn: item.name ?? item.nameAr ?? '',
    time: item.time ?? '--:--',
    icon: iconFor(item.name),
    isNext: !!item.isNext,
  }));
}

function compactRemainingFromEpoch(
  epochMs: number | undefined,
  fmt: (s: string | number) => string,
  ar: boolean,
  prefix: 'next' | 'previous' = 'next',
) {
  if (!epochMs || !Number.isFinite(epochMs)) {
    const h = fmt(prefix === 'next' ? 2 : 4);
    const m = fmt(prefix === 'next' ? 47 : 1);
    return ar
      ? (prefix === 'next' ? `بعد ${h} س ${m} د` : `منذ ${h} س ${m} د`)
      : (prefix === 'next' ? `in ${h}h ${m}m` : `${h}h ${m}m ago`);
  }
  const diff = prefix === 'next' ? epochMs - Date.now() : Date.now() - epochMs;
  const totalSeconds = Math.max(0, Math.floor(diff / 1000));
  const h = fmt(Math.floor(totalSeconds / 3600));
  const m = fmt(Math.floor((totalSeconds % 3600) / 60));
  return ar
    ? (prefix === 'next' ? `بعد ${h} س ${m} د` : `منذ ${h} س ${m} د`)
    : (prefix === 'next' ? `in ${h}h ${m}m` : `${h}h ${m}m ago`);
}

function noWrapPrayerTime(value: string | number): string {
  const text = String(value).trim().replace(/\s+/g, ' ');
  return text.replace(/\s+/g, '\u00A0');
}

export function PrayerTablePreview({ size, language, forSnapshot }: { size: PreviewSize; language?: Lang; forSnapshot?: boolean }) {
  const { isArabic: ar, numerals, palette: p, fontVariant } = usePreviewSettings(language);
  const sharedData = useWidgetPreviewData();
  const timeFont = 'Rubik-Bold';
  const widgetFontL = useWidgetFontFamily(fontVariant);
  const prayerRows = prayerRowsFromShared(sharedData);
  const nextPrayer = prayerRows.find((r) => r.isNext) ?? prayerRows[0] ?? PRAYER_ROWS[0];
  const fmt = (s: string | number) => applyNumerals(s, numerals, ar);
  const remainingText = compactRemainingFromEpoch(sharedData?.prayer?.nextPrayerAtEpochMs, fmt, ar);
  const remainingTight = remainingText.replace(/\s/g, '');
  // Highlight overlay for the active prayer row — light tint on light themes,
  // white tint on dark, so it stays legible across all 8 palettes.
  const activeBg = p.isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.12)';

  if (size === 'medium') {
    const listFs = Platform.OS === 'android' ? 9.5 : 10;
    const rowPv = Platform.OS === 'android' ? 1 : 1.5;
    const heroTimeFs = Platform.OS === 'android' ? 29 : 32;
    return (
      <GlassTile size={size} padding={8} palette={p}>
        <View style={{ flex: 1, flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1, justifyContent: 'center' }}>
              {prayerRows.map((row) => {
                const active = !!row.isNext;
                const label = ar ? row.keyAr : row.keyEn;
                const timeStr = noWrapPrayerTime(fmt(row.time));
                return (
                  <View
                    key={row.keyEn}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: 4,
                      paddingVertical: rowPv,
                      borderRadius: 6,
                      backgroundColor: active ? activeBg : 'transparent',
                    }}
                  >
                    <Text numberOfLines={1} style={{ width: Platform.OS === 'android' ? 54 : undefined, textAlign: 'left', writingDirection: ar ? 'rtl' : 'ltr', fontFamily: timeFont, fontSize: listFs, lineHeight: listFs + 3, color: active ? p.text : p.muted, letterSpacing: -0.3, includeFontPadding: false }}>
                      {timeStr}
                    </Text>
                    <Text numberOfLines={1} style={{ fontFamily: PRAYER_NAME_FONT, fontSize: listFs, lineHeight: listFs + 3, color: active ? p.text : p.muted, includeFontPadding: false }}>
                      {label}
                    </Text>
                  </View>
                );
              })}
            </View>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text numberOfLines={1} style={{ fontFamily: fontMedium(), fontSize: 10, lineHeight: 13, color: p.muted, marginBottom: 2, includeFontPadding: false }}>
                {ar ? 'الصلاة القادمة' : 'Next Prayer'}
              </Text>
              <Text numberOfLines={1} style={{ fontFamily: PRAYER_NAME_FONT, fontSize: 20, lineHeight: 24, color: p.text, includeFontPadding: false }}>
                {ar ? nextPrayer.keyAr : nextPrayer.keyEn}
              </Text>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ fontFamily: timeFont, fontSize: heroTimeFs, lineHeight: heroTimeFs + 5, color: p.text, marginTop: 2, letterSpacing: -1, includeFontPadding: false }}>
                {noWrapPrayerTime(fmt(nextPrayer.time))}
              </Text>
              {/* Phase B C2: countdown is drawn by the native shell; skip in snapshot. */}
              {forSnapshot ? (
                <View style={{ height: 12, marginTop: 2 }} />
              ) : (
                <Text numberOfLines={1} style={{ fontFamily: fontMedium(), fontSize: 9, lineHeight: 12, color: p.muted, marginTop: 2, includeFontPadding: false }}>
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
    return (
      <GlassTile size={size} padding={8} palette={p}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
            {forSnapshot ? (
              <View style={{ width: 80, height: 12 }} />
            ) : (
              <Text numberOfLines={1} style={{ fontFamily: fontMedium(), fontSize: 9, lineHeight: 12, color: p.muted, includeFontPadding: false }}>
                {remainingTight}
              </Text>
            )}
            <Text numberOfLines={1} style={{ fontFamily: fontMedium(), fontSize: 9, lineHeight: 12, color: p.muted, includeFontPadding: false }}>
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
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 4,
                  paddingVertical: rowPv,
                  borderRadius: 6,
                  backgroundColor: active ? activeBg : 'transparent',
                }}
              >
                <Text numberOfLines={1} style={{ width: Platform.OS === 'android' ? 54 : undefined, textAlign: 'left', writingDirection: ar ? 'rtl' : 'ltr', fontFamily: timeFont, fontSize: listFs, lineHeight: listFs + 3, color: active ? p.text : p.muted, letterSpacing: -0.3, includeFontPadding: false }}>
                  {timeStr}
                </Text>
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

  const remainingLarge = compactRemainingFromEpoch(sharedData?.prayer?.nextPrayerAtEpochMs, fmt, ar);
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
  return (
    <GlassTile size={size} padding={largePad} palette={p}>
      <View style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: heroMb,
            paddingHorizontal: 14,
            paddingVertical: heroPadV,
            backgroundColor: heroBg,
            borderRadius: 16,
            overflow: 'hidden',
          }}
        >
          <Text
            pointerEvents="none"
            numberOfLines={1}
            style={{
              position: 'absolute',
              right: 12,
              bottom: 14,
              width: 200,
              textAlign: 'center',
              fontFamily: widgetFontL,
              fontSize: 48,
              color: watermarkFill,
              writingDirection: 'rtl',
              paddingTop: 26,
              includeFontPadding: false,
            }}
          >
            {ar ? 'الصــلاة' : 'Prayer'}
          </Text>
          <MaterialCommunityIcons name={nextPrayer.icon} size={isAndroid ? 28 : 32} color={p.muted} />
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text numberOfLines={1} style={{ fontFamily: PRAYER_NAME_FONT, fontSize: heroNameFs, lineHeight: heroNameFs + 4, color: p.text, includeFontPadding: false }}>
              {ar ? nextPrayer.keyAr : nextPrayer.keyEn}
            </Text>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ fontFamily: timeFont, fontSize: heroTimeFs, lineHeight: heroTimeFs + 5, color: p.text, marginTop: 2, letterSpacing: -1, includeFontPadding: false }}>
              {noWrapPrayerTime(fmt(nextPrayer.time))}
            </Text>
            {forSnapshot ? (
              <View style={{ height: isAndroid ? 14 : 16, marginTop: isAndroid ? 2 : 4 }} />
            ) : (
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ fontFamily: fontMedium(), fontSize: isAndroid ? 11 : 12, lineHeight: isAndroid ? 14 : 16, color: p.muted, marginTop: isAndroid ? 2 : 4, includeFontPadding: false }}>
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
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 8,
                  paddingVertical: rowPv,
                  borderRadius: 10,
                  backgroundColor: active ? activeBg : 'transparent',
                  marginBottom: isAndroid ? 0 : 1,
                }}
              >
                <Text numberOfLines={1} style={{ width: isAndroid ? 66 : undefined, textAlign: 'left', writingDirection: ar ? 'rtl' : 'ltr', fontFamily: timeFont, fontSize: rowFs, lineHeight: rowFs + 4, color: active ? p.text : p.muted, letterSpacing: -0.3, includeFontPadding: false }}>
                  {timeStr}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
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
  const timeFont = 'Rubik-Bold';
  const boxBg = p.isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)';
  const boxBorder = p.isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.10)';
  const fmt = (s: string | number) => applyNumerals(s, numerals, ar);
  const isAndroid = Platform.OS === 'android';
  const previousName = ar ? (sharedData?.prayer?.previousPrayerNameAr ?? 'العشاء') : (sharedData?.prayer?.previousPrayerName ?? 'Isha');
  const nextName = ar ? (sharedData?.prayer?.nextPrayerNameAr ?? 'الفجر') : (sharedData?.prayer?.nextPrayerName ?? 'Fajr');
  const previousItem = sharedData?.prayer?.allPrayers?.find((item) =>
    item.name === sharedData?.prayer?.previousPrayerName || item.nameAr === sharedData?.prayer?.previousPrayerNameAr
  );
  const items = [
    {
      label: ar ? 'الصلاة القادمة' : 'Next Prayer',
      name: nextName,
      time: noWrapPrayerTime(fmt(sharedData?.prayer?.nextPrayerTime ?? '04:14')),
      sub: compactRemainingFromEpoch(sharedData?.prayer?.nextPrayerAtEpochMs, fmt, ar),
      icon: 'weather-sunset-up' as const,
    },
    {
      label: ar ? 'الصلاة السابقة' : 'Previous Prayer',
      name: previousName,
      time: noWrapPrayerTime(fmt(previousItem?.time ?? '08:18')),
      sub: compactRemainingFromEpoch(sharedData?.prayer?.previousPrayerAtEpochMs, fmt, ar, 'previous'),
      icon: 'weather-night' as const,
    },
  ];
  return (
    <GlassTile size={size} padding={isAndroid ? 18 : undefined} palette={p}>
      <View style={{ flex: 1, flexDirection: 'row', gap: isAndroid ? 8 : 10 }}>
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
            <Text
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
            </Text>
            {/* Dynamic countdown/since labels are drawn by the native shell so
                both cards stay fresh and visually balanced on the home screen. */}
            {forSnapshot ? (
              <View style={{ height: 12, marginTop: 2 }} />
            ) : (
              <Text numberOfLines={1} style={{ fontFamily: fontMedium(), fontSize: 9, lineHeight: 12, color: p.muted, marginTop: 2, includeFontPadding: false }}>{item.sub}</Text>
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

const SAMPLE_VERSE = 'رَبَّنَا لَا تُؤَاخِذْنَا إِن نَّسِينَا أَوْ أَخْطَأْنَا';
const SAMPLE_TRANSLATION = 'Our Lord, do not impose blame upon us if we have forgotten or erred';
const SAMPLE_SURAH_AR = 'البقرة';
const SAMPLE_SURAH_EN = 'Al-Baqarah';
const SAMPLE_AYAH = 286;

export function VersePreview({ size, language }: { size: PreviewSize; language?: Lang }) {
  const { isArabic: ar, numerals, palette: p, fontVariant } = usePreviewSettings(language);
  const widgetFont = useWidgetFontFamily(fontVariant);
  const dims = getSizeDims(size);
  const showTranslation = !ar && size !== 'small';
  const lines = showTranslation ? 2 : size === 'small' ? 3 : 4;
  const showWm = size !== 'small';
  const wmFs = size === 'medium' ? 36 : 50;
  const wmFill = p.isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';
  const ayahLabel = applyNumerals(SAMPLE_AYAH, numerals, ar);
  return (
    <GlassTile size={size} padding={0} palette={p}>
      <View style={{ flex: 1 }}>
        {showWm ? (
          <Text
            pointerEvents="none"
            numberOfLines={1}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: dims.height * 0.12,
              textAlign: 'center',
              fontFamily: widgetFont,
              fontSize: wmFs,
              color: wmFill,
              writingDirection: 'rtl',
              paddingTop: Math.round(wmFs * 0.55),
              includeFontPadding: false,
            }}
          >
            {ar ? 'آيـة اليـوم' : 'Verse of Day'}
          </Text>
        ) : null}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: size === 'small' ? 16 : 18 }}>
          <Text
            numberOfLines={lines}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
            style={{
              fontFamily: 'KFGQPCUthmanic',
              fontSize: size === 'small' ? 16 : size === 'medium' ? 20 : 24,
              color: p.text,
              textAlign: 'center',
              writingDirection: 'rtl',
              // Android line metrics are taller — tighter lineHeight prevents
              // the last word ("أَخْطَأَنَا") from wrapping to an orphaned line.
              lineHeight: Platform.select({
                android: size === 'small' ? 22 : size === 'medium' ? 28 : 34,
                default: size === 'small' ? 28 : size === 'medium' ? 34 : 40,
              }),
              includeFontPadding: false,
            }}
          >
            {SAMPLE_VERSE}
          </Text>
          {showTranslation ? (
            <Text
              numberOfLines={2}
              style={{
                fontFamily: fontRegular(),
                fontSize: size === 'medium' ? 11 : 13,
                color: p.muted,
                textAlign: 'center',
                marginTop: 6,
                lineHeight: size === 'medium' ? 16 : 18,
              }}
            >
              {SAMPLE_TRANSLATION}
            </Text>
          ) : null}
          <Text style={{ fontFamily: fontMedium(), fontSize: size === 'small' ? 11 : 12, color: p.muted, marginTop: 8 }}>
            {ar ? `${SAMPLE_SURAH_AR} · ${ayahLabel}` : `${SAMPLE_SURAH_EN} · ${ayahLabel}`}
          </Text>
        </View>
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
      title="أذكار الصباح"
      titleEn="Morning Adhkar"
      sample="أصبحنا وأصبح الملك لله والحمد لله"
      language={language}
    />
  );
}

export function AzkarEveningPreview({ size, language }: { size: PreviewSize; language?: Lang }) {
  return (
    <AzkarPreview
      size={size}
      title="أذكار المساء"
      titleEn="Evening Adhkar"
      sample="اللهم صل وسلم على نبينا محمد"
      language={language}
    />
  );
}

function AzkarPreview({ size, title, titleEn, sample, language }: { size: PreviewSize; title: string; titleEn: string; sample: string; language?: Lang }) {
  // Phase E (C1): Azkar uses Amiri-Regular (clean Naskh).
  // Native <Text> with multi-line + auto-shrink so the dhikr always fits the
  // tile cleanly across small/medium/large — replaces SvgText, which cropped
  // long phrases to a single line and broke Arabic letter joining on Android.
  const { isArabic: ar, numerals, palette: p } = usePreviewSettings(language);
  const azkarFs = size === 'small' ? 15 : 20;
  const fillText = p.isLight ? 'rgba(0,0,0,0.86)' : 'rgba(255,255,255,0.92)';
  const lines = size === 'small' ? 3 : 4;
  return (
    <GlassTile size={size} palette={p}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text
          numberOfLines={1}
          style={{ fontFamily: fontBold(), fontSize: size === 'small' ? 11 : 13, color: p.muted, marginBottom: 6 }}
        >
          {ar ? title : titleEn}
        </Text>
        <View style={{ flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
          <Text
            numberOfLines={lines}
            adjustsFontSizeToFit
            minimumFontScale={0.55}
            allowFontScaling={false}
            style={{
              fontFamily: 'Amiri',
              fontSize: azkarFs,
              color: fillText,
              textAlign: 'center',
              writingDirection: 'rtl',
              // Tighter lineHeight on Android prevents Amiri from consuming extra
              // vertical space and cutting the last dhikr word.
              lineHeight: Platform.select({
                android: Math.round(azkarFs * 1.25),
                default: Math.round(azkarFs * 1.5),
              }),
              includeFontPadding: false,
            }}
          >
            {sample}
          </Text>
        </View>
        <Text style={{ fontFamily: fontBold(), fontSize: size === 'small' ? 11 : 13, color: p.muted, marginTop: 6 }}>
          {`${applyNumerals(10, numerals, ar)}×`}
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
              fontFamily: widgetFont,
              fontSize: watermarkFs,
              color: watermarkFill,
              writingDirection: 'rtl',
              paddingTop: Math.round(watermarkFs * 0.55),
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
            fontFamily: ar ? widgetFont : fontBold(),
            fontSize: monthFs,
            color: fillStrong,
            textAlign: 'center',
            writingDirection: 'rtl',
            paddingHorizontal: 4,
            paddingTop: Math.round(monthFs * 0.55),
            includeFontPadding: false,
          }}
        >
          {hijriRow}
        </Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={{
            fontFamily: fontMedium(),
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
  // Android lineHeight must be tighter — adjustsFontSizeToFit behaves differently
  // across platforms causing "العظيم" to overflow to a 4th line on Android.
  const lineH = Platform.select({
    android: size === 'small' ? 22 : 28,
    default: size === 'small' ? 28 : 36,
  });
  return (
    <GlassTile size={size} palette={p}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text
          numberOfLines={size === 'small' ? 2 : 3}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
          style={{
            fontFamily: AZKAR_PREVIEW_FONT,
            fontSize: size === 'small' ? 16 : 22,
            color: p.text,
            textAlign: 'center',
            writingDirection: 'rtl',
            lineHeight: lineH,
            includeFontPadding: false,
          }}
        >
          سُبْحَانَ اللهِ وَبِحَمْدِهِ، سُبْحَانَ اللهِ الْعَظِيمِ
        </Text>
        {!ar ? (
          <Text
            numberOfLines={2}
            style={{
              fontFamily: fontMedium(),
              fontSize: size === 'small' ? 10 : 12,
              color: p.muted,
              marginTop: 4,
              textAlign: 'center',
              fontStyle: 'italic',
              lineHeight: size === 'small' ? 14 : 16,
            }}
          >
            Glory be to Allah and praise Him
          </Text>
        ) : null}
        <Text style={{ fontFamily: fontMedium(), fontSize: size === 'small' ? 11 : 12, color: p.muted, marginTop: 6 }}>
          {`${applyNumerals(100, numerals, ar)}×`}
        </Text>
      </View>
    </GlassTile>
  );
}
