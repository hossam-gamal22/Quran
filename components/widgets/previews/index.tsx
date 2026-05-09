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
  const radius = size === 'small' ? 28 : 32;
  const p = palette ?? PREVIEW_PALETTE;
  const blurTint = p.isLight ? 'light' : 'dark';
  return (
    <View style={[styles.tileShadow, { width: dims.width, height: dims.height, borderRadius: radius }]}>
      <View style={[styles.tile, { borderRadius: radius }]}>
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
        <View style={{ flex: 1, padding: padding ?? (size === 'small' ? 16 : 18) }}>{children}</View>
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
  const palette = paletteFor(display.widgetTheme as any);
  const numerals = (display.widgetNumerals ?? 'auto') as 'auto' | 'arabic' | 'western';
  const calendar = resolveCalendar(display.widgetCalendar as any, isArabic);
  const dayCalendar = resolveCalendar(
    (display.widgetDayCalendar ?? 'auto') as any,
    isArabic,
  );
  const monthCalendar = resolveCalendar(
    (display.widgetMonthCalendar ?? 'auto') as any,
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
  const { numerals, dayCalendar, palette: p, fontVariant } = usePreviewSettings(language);
  const info = getDateInfo();
  const widgetFont = useWidgetFontFamily(fontVariant);
  const dims = getSizeDims(size);
  const svgW = dims.width;
  const svgH = dims.height;
  const fs = size === 'small' ? 38 : 56;
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
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={svgW} height={svgH}>
          {showWatermark ? (
            <SvgText
              fill={fillFaint}
              fontFamily={watermarkFont}
              fontSize={130}
              x={svgW / 2}
              y={svgH * 1.1}
              textAnchor="middle"
            >
              {watermark}
            </SvgText>
          ) : null}
          <SvgText
            fill={fillStrong}
            fontFamily={widgetFont}
            fontSize={fs}
            x={svgW / 2}
            y={svgH / 2 + fs * (size === 'small' ? 0.5 : 0.65)}
            textAnchor="middle"
          >
            {info.weekdayAr}
          </SvgText>
        </Svg>
      </View>
    </GlassTile>
  );
}

export function DayDigitalPreview({ size, language }: { size: PreviewSize; language?: Lang }) {
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
  const dims = getSizeDims(size);
  const svgW = Math.max(dims.width - 28, 120);
  const fontPx = size === 'small' ? 44 : 58;
  const svgH = fontPx + 16;
  const gradId = `digitalTimeGrad_${size}`;
  const stopColor = p.isLight ? '#3A3A39' : '#FFFFFF';
  const stopColorEnd = p.isLight ? 'rgba(58,58,57,0.55)' : 'rgba(200,200,200,0.55)';
  return (
    <GlassTile size={size} palette={p}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={svgW} height={svgH}>
          <Defs>
            <SvgLinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={stopColor} />
              <Stop offset="1" stopColor={stopColorEnd} />
            </SvgLinearGradient>
          </Defs>
          <SvgText
            fill={`url(#${gradId})`}
            fontFamily={digitFont}
            fontSize={fontPx}
            fontWeight="600"
            x={svgW / 2}
            y={svgH / 2 + fontPx * 0.32}
            textAnchor="middle"
          >
            {timeStr}
          </SvgText>
        </Svg>
        <Text style={{ fontFamily: fontMedium(), fontSize: size === 'small' ? 12 : 14, color: p.muted, marginTop: 10 }}>
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
  const fs = size === 'small' ? 26 : 40;
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
          <SvgText
            fill={fillStrong}
            fontFamily={widgetFont}
            fontSize={fs}
            x={svgW / 2}
            y={svgH * 0.55}
            textAnchor="middle"
          >
            {monthLabel}
          </SvgText>
        </Svg>
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
  const fs = size === 'small' ? 38 : 56;
  const wmFs = size === 'small' ? 90 : 130;
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
  return (
    <GlassTile size={size} padding={0} palette={p}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={svgW} height={svgH}>
          <SvgText
            fill={fillFaint}
            fontFamily={watermarkFont}
            fontSize={wmFs}
            x={svgW / 2}
            y={svgH * 1.1}
            textAnchor="middle"
          >
            {watermark}
          </SvgText>
          <SvgText
            fill={fillStrong}
            fontFamily={widgetFont}
            fontSize={fs}
            x={svgW / 2}
            y={svgH / 2 + fs * 0.65}
            textAnchor="middle"
          >
            {monthLabel}
          </SvgText>
        </Svg>
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

export function PrayerSimplePreview({ size, language }: { size: PreviewSize; language?: Lang }) {
  const { isArabic: ar, numerals, palette: p } = usePreviewSettings(language);
  const digitFont = 'Rubik-Bold';
  const time = applyNumerals('04:14', numerals, ar);
  const hours = applyNumerals(2, numerals, ar);
  const mins = applyNumerals(47, numerals, ar);
  return (
    <GlassTile size={size} palette={p}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: fontMedium(), fontSize: size === 'small' ? 11 : 13, color: p.muted, marginBottom: 2 }}>
          {ar ? 'الصلاة القادمة' : 'Next Prayer'}
        </Text>
        <Text
          style={{
            fontFamily: PRAYER_NAME_FONT,
            fontSize: size === 'small' ? 22 : 30,
            color: p.text,
            includeFontPadding: false,
          }}
        >
          {ar ? 'الفجر' : 'Fajr'}
        </Text>
        <Text
          adjustsFontSizeToFit
          numberOfLines={1}
          style={{ fontFamily: digitFont, fontSize: size === 'small' ? 42 : 56, color: p.text, marginTop: 2, letterSpacing: -1 }}
        >
          {time}
        </Text>
        <Text style={{ fontFamily: fontMedium(), fontSize: size === 'small' ? 10 : 12, color: p.muted, marginTop: 4 }}>
          {ar ? `بعد ${hours} س ${mins} د` : `in ${hours}h ${mins}m`}
        </Text>
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

export function PrayerTablePreview({ size, language }: { size: PreviewSize; language?: Lang }) {
  const { isArabic: ar, numerals, palette: p, fontVariant } = usePreviewSettings(language);
  const timeFont = 'Rubik-Bold';
  const widgetFontL = useWidgetFontFamily(fontVariant);
  const nextPrayer = PRAYER_ROWS.find((r) => r.isNext) ?? PRAYER_ROWS[0];
  const fmt = (s: string | number) => applyNumerals(s, numerals, ar);
  const remHours = fmt(2);
  const remMins = fmt(47);
  // Highlight overlay for the active prayer row — light tint on light themes,
  // white tint on dark, so it stays legible across all 8 palettes.
  const activeBg = p.isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.12)';

  if (size === 'medium') {
    const listFs = 11;
    return (
      <GlassTile size={size} padding={10} palette={p}>
        <View style={{ flex: 1, flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1, justifyContent: 'center' }}>
              {PRAYER_ROWS.map((row) => {
                const active = !!row.isNext;
                const label = ar ? row.keyAr : row.keyEn;
                const timeStr = fmt(row.time);
                return (
                  <View
                    key={row.keyEn}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: 4,
                      paddingVertical: 2.5,
                      borderRadius: 6,
                      backgroundColor: active ? activeBg : 'transparent',
                    }}
                  >
                    <Text style={{ fontFamily: timeFont, fontSize: listFs, color: active ? p.text : p.muted, letterSpacing: -0.3 }}>
                      {timeStr}
                    </Text>
                    <Text style={{ fontFamily: PRAYER_NAME_FONT, fontSize: listFs, color: active ? p.text : p.muted, includeFontPadding: false }}>
                      {label}
                    </Text>
                  </View>
                );
              })}
            </View>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: fontMedium(), fontSize: 10, color: p.muted, marginBottom: 2 }}>
                {ar ? 'الصلاة القادمة' : 'Next Prayer'}
              </Text>
              <Text style={{ fontFamily: PRAYER_NAME_FONT, fontSize: 20, color: p.text }}>
                {ar ? nextPrayer.keyAr : nextPrayer.keyEn}
              </Text>
              <Text style={{ fontFamily: timeFont, fontSize: 32, color: p.text, marginTop: 2, letterSpacing: -1 }}>
                {fmt(nextPrayer.time)}
              </Text>
              <Text style={{ fontFamily: fontMedium(), fontSize: 9, color: p.muted, marginTop: 2 }}>
                {ar ? `بعد ${remHours} س ${remMins} د` : `in ${remHours}h ${remMins}m`}
              </Text>
            </View>
          </View>
      </GlassTile>
    );
  }

  if (size === 'small') {
    const listFs = 11;
    return (
      <GlassTile size={size} padding={8} palette={p}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
            <Text style={{ fontFamily: fontMedium(), fontSize: 9, color: p.muted }}>
              {ar ? `بعد ${remHours}س ${remMins}د` : `in ${remHours}h ${remMins}m`}
            </Text>
            <Text style={{ fontFamily: fontMedium(), fontSize: 9, color: p.muted }}>
              {ar ? 'الصلاة القادمة' : 'Next Prayer'}
            </Text>
          </View>
          {PRAYER_ROWS.map((row) => {
            const active = !!row.isNext;
            const label = ar ? row.keyAr : row.keyEn;
            const timeStr = fmt(row.time);
            return (
              <View
                key={row.keyEn}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 4,
                  paddingVertical: 2,
                  borderRadius: 6,
                  backgroundColor: active ? activeBg : 'transparent',
                }}
              >
                <Text style={{ fontFamily: timeFont, fontSize: listFs, color: active ? p.text : p.muted, letterSpacing: -0.3 }}>
                  {timeStr}
                </Text>
                <Text style={{ fontFamily: PRAYER_NAME_FONT, fontSize: listFs, color: active ? p.text : p.muted, includeFontPadding: false }}>
                  {label}
                </Text>
              </View>
            );
          })}
        </View>
      </GlassTile>
    );
  }

  const remHoursLarge = fmt(3);
  const remMinsLarge = fmt(43);
  const heroBg = p.isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)';
  const watermarkFill = p.isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)';
  return (
    <GlassTile size={size} padding={14} palette={p}>
      <View style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 10,
            padding: 14,
            backgroundColor: heroBg,
            borderRadius: 16,
            overflow: 'hidden',
          }}
        >
          <Svg
            width={200}
            height={100}
            style={{ position: 'absolute', right: 0, bottom: -10 }}
          >
            <SvgText
              fill={watermarkFill}
              fontFamily={widgetFontL}
              fontSize={48}
              x={100}
              y={80}
              textAnchor="middle"
            >
              {ar ? 'الصــلاة' : 'Prayer'}
            </SvgText>
          </Svg>
          <MaterialCommunityIcons name={nextPrayer.icon} size={32} color={p.muted} />
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={{ fontFamily: PRAYER_NAME_FONT, fontSize: 22, color: p.text }}>
              {ar ? nextPrayer.keyAr : nextPrayer.keyEn}
            </Text>
            <Text style={{ fontFamily: timeFont, fontSize: 36, color: p.text, marginTop: 2, letterSpacing: -1 }}>
              {fmt(nextPrayer.time)}
            </Text>
            <Text style={{ fontFamily: fontMedium(), fontSize: 12, color: p.muted, marginTop: 4 }}>
              {ar
                ? `الصلاة القادمة بعد ${remHoursLarge} س ${remMinsLarge} د`
                : `Next prayer in ${remHoursLarge}h ${remMinsLarge}m`}
            </Text>
          </View>
        </View>
        {PRAYER_ROWS.map((row) => {
          const active = !!row.isNext;
          const label = ar ? row.keyAr : row.keyEn;
          const timeStr = fmt(row.time);
          return (
            <View
              key={row.keyEn}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 8,
                paddingVertical: 6,
                borderRadius: 10,
                backgroundColor: active ? activeBg : 'transparent',
                marginBottom: 1,
              }}
            >
              <Text style={{ fontFamily: timeFont, fontSize: 15, color: active ? p.text : p.muted, letterSpacing: -0.3 }}>
                {timeStr}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontFamily: PRAYER_NAME_FONT, fontSize: 15, color: active ? p.text : p.muted, includeFontPadding: false }}>
                  {label}
                </Text>
                <MaterialCommunityIcons name={row.icon} size={16} color={active ? p.text : p.muted} />
              </View>
            </View>
          );
        })}
      </View>
    </GlassTile>
  );
}

export function PrayerNextPrevPreview({ size, language }: { size: PreviewSize; language?: Lang }) {
  const { isArabic: ar, numerals, palette: p } = usePreviewSettings(language);
  const timeFont = 'Rubik-Bold';
  const boxBg = p.isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)';
  const boxBorder = p.isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.10)';
  const fmt = (s: string | number) => applyNumerals(s, numerals, ar);
  const items = [
    {
      label: ar ? 'الصلاة القادمة' : 'Next Prayer',
      name: ar ? 'الفجر' : 'Fajr',
      time: fmt('04:14'),
      sub: ar ? `بعد ${fmt(3)} س ${fmt(54)} د` : `in ${fmt(3)}h ${fmt(54)}m`,
      icon: 'weather-sunset-up' as const,
    },
    {
      label: ar ? 'الصلاة السابقة' : 'Previous Prayer',
      name: ar ? 'العشاء' : 'Isha',
      time: fmt('08:18'),
      sub: ar ? `منذ ${fmt(4)} س ${fmt(1)} د` : `${fmt(4)}h ${fmt(1)}m ago`,
      icon: 'weather-night' as const,
    },
  ];
  return (
    <GlassTile size={size} palette={p}>
      <View style={{ flex: 1, flexDirection: 'row', gap: 10 }}>
        {items.map((item, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              backgroundColor: boxBg,
              borderRadius: 18,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: boxBorder,
              padding: 10,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialCommunityIcons name={item.icon as any} size={20} color={p.muted} />
            <Text
              style={{
                fontFamily: PRAYER_NAME_FONT,
                fontSize: 16,
                color: p.text,
                marginTop: 4,
                textAlign: 'center',
                includeFontPadding: false,
              }}
            >
              {item.name}
            </Text>
            <Text style={{ fontFamily: timeFont, fontSize: 28, color: p.text, marginTop: 2, letterSpacing: -0.5 }}>
              {item.time}
            </Text>
            <Text style={{ fontFamily: fontMedium(), fontSize: 9, color: p.muted, marginTop: 2 }}>{item.sub}</Text>
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
          <Svg
            width={dims.width}
            height={dims.height}
            style={{ position: 'absolute', top: 0, left: 0 }}
          >
            <SvgText
              fill={wmFill}
              fontFamily={widgetFont}
              fontSize={wmFs}
              x={dims.width / 2}
              y={dims.height * 0.88}
              textAnchor="middle"
            >
              {ar ? 'آيـة اليـوم' : 'Verse of Day'}
            </SvgText>
          </Svg>
        ) : null}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: size === 'small' ? 16 : 18 }}>
          <Text
            numberOfLines={lines}
            adjustsFontSizeToFit
            style={{
              fontFamily: 'KFGQPCUthmanic',
              fontSize: size === 'small' ? 16 : size === 'medium' ? 20 : 24,
              color: p.text,
              textAlign: 'center',
              writingDirection: 'rtl',
              lineHeight: size === 'small' ? 28 : size === 'medium' ? 34 : 40,
            }}
          >
            {`﴿${SAMPLE_VERSE}﴾`}
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
  const { isArabic: ar, numerals, palette: p } = usePreviewSettings(language);
  return (
    <GlassTile size={size} palette={p}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: fontBold(), fontSize: size === 'small' ? 11 : 13, color: p.muted, marginBottom: 6 }}>
          {ar ? title : titleEn}
        </Text>
        <Text
          numberOfLines={size === 'small' ? 2 : 3}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
          style={{
            fontFamily: AZKAR_PREVIEW_FONT,
            fontSize: size === 'small' ? 18 : 24,
            color: p.text,
            textAlign: 'center',
            writingDirection: 'rtl',
            lineHeight: size === 'small' ? 30 : 40,
            includeFontPadding: false,
          }}
        >
          {sample}
        </Text>
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
  const dims = getSizeDims(size);
  const svgW = dims.width - 16;
  const monthFs = size === 'small' ? 24 : 30;
  const svgH = monthFs + 20;
  const dayLabel = applyNumerals(day, numerals, ar);
  const monthLabel = ar ? monthAr : (HIJRI_MONTHS_EN[monthIndex - 1] ?? monthAr);
  const hijriRow = `${dayLabel}  ${monthLabel}`;
  const fillStrong = p.isLight ? 'rgba(0,0,0,0.86)' : p.text;
  return (
    <GlassTile size={size} palette={p}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={svgW} height={svgH}>
          <SvgText
            fill={fillStrong}
            fontFamily={ar ? widgetFont : fontBold()}
            fontSize={monthFs}
            x={svgW / 2}
            y={svgH / 2 + monthFs * 0.35}
            textAnchor="middle"
          >
            {hijriRow}
          </SvgText>
        </Svg>
        <Text style={{ fontFamily: fontMedium(), fontSize: size === 'small' ? 12 : 13, color: p.muted, marginTop: 4 }}>
          {`${applyNumerals(year, numerals, ar)} ${ar ? 'هـ' : 'AH'}`}
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
            lineHeight: size === 'small' ? 28 : 36,
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
