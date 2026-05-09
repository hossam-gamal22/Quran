// components/ui/IslamicShareCard.tsx
// بطاقة مشاركة إسلامية فاخرة — زخارف هندسية SVG + خط أميري + التقاط صورة

import React, { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  Platform, ScrollView, Dimensions, Image,
} from 'react-native';
import Svg, {
  G, Path, Circle, Rect, Polygon,
  Defs, RadialGradient, Stop,
} from 'react-native-svg';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/use-colors';
import { useSettings } from '@/contexts/SettingsContext';
import { useAppIdentity } from '@/hooks/use-app-identity';
import { fontBold, fontSemiBold, fontRegular } from '@/lib/fonts';
import { IMAGE_SIZE_OPTIONS, type ImageSizeKey } from '@/components/ui/BrandedCapture';

// ─── Constants ───
const CAPTURE_WIDTH = 375;
const PREVIEW_MAX_H = 240;
const CARD_BG = '#091E12';
const GOLD = '#C9A844';
const FOOTER_BG = '#04100A';
const TILE = 38;
// Long-content mode: vertical chrome height inside the card (gold strips +
// categoryBand + footer + contentArea vertical padding). Used to estimate
// available vertical space for content.
const CHROME_H = 6 /* gold strips */ + 56 /* category band */ + 100 /* footer (logo) */ + 32 /* contentArea v-padding */;
const MIN_FONT_SCALE = 0.5;
// Short-content mode: when natural content height is well below the available
// canvas, upscale all text uniformly so the card looks visually balanced
// instead of leaving large empty space below the source reference.
const MAX_UPSCALE = 1.5;
const TARGET_FILL = 0.85;

// ─── Public API ───
export interface IslamicShareCardHandle {
  capture: (sizeKey?: ImageSizeKey) => Promise<string>;
  showSizePicker: () => void;
}

export interface IslamicShareCardProps {
  categoryLabel: string;
  arabicText: string;
  sourceText?: string;
  benefitText?: string;
  translationText?: string;
  qcfGlyphs?: string[];
  qcfFontFamily?: string;
  showBasmala?: boolean;
  noteText?: string;
  onCapture?: (uri: string) => void;
  /** Render custom content (e.g. multi-page QCF verses) instead of arabicText */
  renderCustomContent?: () => React.ReactNode;
}

// ─── SVG sub-components ───

/** SVG book icon replacing emoji */
const BookIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
      stroke={GOLD} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
    />
    <Path
      d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
      stroke={GOLD} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
    />
  </Svg>
);

/** Ornamental divider with Arabic five-pointed star */
const OrnamentDivider = () => (
  <View style={ornStyles.row}>
    <View style={ornStyles.line} />
    <Text style={ornStyles.star}>{'\u066D'}</Text>
    <View style={ornStyles.line} />
  </View>
);

const ornStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginVertical: 11,
    gap: 9,
  },
  line: {
    flex: 1,
    maxWidth: 52,
    height: 1,
    backgroundColor: 'rgba(201,168,68,0.42)',
  },
  star: {
    color: GOLD,
    fontSize: 16,
  },
});

/** 8-pointed star corner ornament */
const StarCorner = ({ x, y }: { x: number; y: number }) => (
  <G transform={`translate(${x},${y})`}>
    <Rect x={-6} y={-6} width={12} height={12} fill={GOLD} opacity={0.9} />
    <Rect x={-6} y={-6} width={12} height={12} fill={GOLD} opacity={0.9} transform="rotate(45)" />
    <Rect x={-3.5} y={-3.5} width={7} height={7} fill={CARD_BG} />
    <Rect x={-2} y={-2} width={4} height={4} fill={GOLD} opacity={0.6} transform="rotate(45)" />
  </G>
);

/** Full SVG background layers */
const SvgBackground = ({ w, h }: { w: number; h: number }) => {
  const cols = Math.ceil(w / TILE) + 1;
  const rows = Math.ceil(h / TILE) + 1;
  const cx = w / 2;
  const cy = h / 2;

  return (
    <Svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={StyleSheet.absoluteFill}
    >
      {/* Layer B — Radial warm center */}
      <Defs>
        <RadialGradient id="rg" cx="50%" cy="47%" r="52%">
          <Stop offset="0%" stopColor="#1E6040" stopOpacity={0.48} />
          <Stop offset="100%" stopColor={CARD_BG} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width={w} height={h} fill="url(#rg)" />

      {/* Layer A — Diamond lattice (tiled) */}
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => {
          const tx = c * TILE;
          const ty = r * TILE;
          return (
            <G key={`t${r}_${c}`} transform={`translate(${tx},${ty})`}>
              <Path
                d={`M19 0L${TILE} 19L19 ${TILE}L0 19Z`}
                stroke={GOLD} strokeWidth={0.38} opacity={0.16} fill="none"
              />
              <Circle cx={19} cy={19} r={1} fill={GOLD} opacity={0.12} />
              <Circle cx={0} cy={0} r={0.8} fill={GOLD} opacity={0.09} />
              <Circle cx={TILE} cy={0} r={0.8} fill={GOLD} opacity={0.09} />
              <Circle cx={0} cy={TILE} r={0.8} fill={GOLD} opacity={0.09} />
              <Circle cx={TILE} cy={TILE} r={0.8} fill={GOLD} opacity={0.09} />
            </G>
          );
        })
      )}

      {/* Layer C — Central mandala */}
      <G transform={`translate(${cx},${cy})`} opacity={0.065}>
        {['0', '30', '45', '90'].map(deg => (
          <Polygon
            key={`hex${deg}`}
            points="0,-86 74,-43 74,43 0,86 -74,43 -74,-43"
            stroke={GOLD} strokeWidth={0.7} fill="none"
            transform={`rotate(${deg})`}
          />
        ))}
        <Circle r={44} stroke={GOLD} strokeWidth={0.55} fill="none" />
        <Circle r={66} stroke={GOLD} strokeWidth={0.45} fill="none" />
        <Circle r={86} stroke={GOLD} strokeWidth={0.4} fill="none" />
      </G>

      {/* Layer D — Inner border frame */}
      <Rect
        x={9} y={9} width={w - 18} height={h - 18}
        rx={9} fill="none" stroke={GOLD} strokeWidth={0.7} opacity={0.3}
      />

      {/* Layer E — 8-pointed star corners */}
      <StarCorner x={25} y={19} />
      <StarCorner x={w - 25} y={19} />
      <StarCorner x={25} y={h - 19} />
      <StarCorner x={w - 25} y={h - 19} />
    </Svg>
  );
};

// ─── Main component ───

export const IslamicShareCard = forwardRef<IslamicShareCardHandle, IslamicShareCardProps>(
  (props, ref) => {
    const {
      categoryLabel,
      arabicText,
      sourceText,
      benefitText,
      translationText,
      qcfGlyphs,
      qcfFontFamily,
      showBasmala,
      noteText,
      onCapture,
      renderCustomContent,
    } = props;

    const viewShotRef = useRef<ViewShot>(null);
    const colors = useColors();
    const { isDarkMode, t } = useSettings();
    const { logoSource } = useAppIdentity();
    const insets = useSafeAreaInsets();

    const [selectedSize, setSelectedSize] = useState<ImageSizeKey>('portrait');
    const [showPicker, setShowPicker] = useState(false);
    const [capturing, setCapturing] = useState(false);
    // Natural (unscaled) height of contentArea children, measured offscreen.
    const [measuredContentH, setMeasuredContentH] = useState<number | null>(null);

    const getSizeConfig = (key: ImageSizeKey) =>
      IMAGE_SIZE_OPTIONS.find(o => o.key === key) || IMAGE_SIZE_OPTIONS[0];

    // Available vertical space for content area at a given size key.
    const availableContentH = (key: ImageSizeKey) =>
      CAPTURE_WIDTH * (getSizeConfig(key).height / getSizeConfig(key).width) - CHROME_H;

    // Long-content detection: content overflows the 4:5 portrait canvas at
    // base font scale. When true, we force 9:16 and shrink fonts.
    const isLong = measuredContentH !== null && measuredContentH > availableContentH('portrait');

    // Effective size key: long content is forced to story (9:16).
    const effectiveSize: ImageSizeKey = isLong ? 'story' : selectedSize;
    const effectiveSizeConfig = getSizeConfig(effectiveSize);

    // Font scale applied to text styles. In long mode we shrink so content
    // fits the 9:16 canvas; in short mode we grow so content fills ~85% of
    // the selected canvas (avoiding a big empty area below the source line).
    const fontScale = useMemo(() => {
      if (measuredContentH === null || measuredContentH <= 0) return 1;
      if (isLong) {
        const target = availableContentH('story');
        const raw = target / measuredContentH;
        return Math.max(MIN_FONT_SCALE, Math.min(1, raw));
      }
      const avail = availableContentH(selectedSize);
      if (avail <= 0) return 1;
      const raw = (avail * TARGET_FILL) / measuredContentH;
      return Math.max(1, Math.min(MAX_UPSCALE, raw));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLong, measuredContentH, selectedSize]);

    // Card height: normally derived from selected ratio. If even at min scale
    // the content still overflows, grow the card vertically as a final safety
    // net so nothing is ever clipped.
    const baseCaptureH = CAPTURE_WIDTH * (effectiveSizeConfig.height / effectiveSizeConfig.width);
    const scaledContentH = measuredContentH !== null ? measuredContentH * fontScale : 0;
    const captureH = isLong && scaledContentH + CHROME_H > baseCaptureH
      ? Math.ceil(scaledContentH + CHROME_H)
      : baseCaptureH;

    const previewH = PREVIEW_MAX_H;
    const previewW = previewH * (CAPTURE_WIDTH / captureH);
    const previewScale = previewW / CAPTURE_WIDTH;

    const doCapture = async (sizeKey: ImageSizeKey = selectedSize) => {
      if (!viewShotRef.current) throw new Error('ViewShot ref not ready');
      // Honor long-content override: ignore caller's sizeKey if content is long.
      const effKey: ImageSizeKey = isLong ? 'story' : sizeKey;
      const config = getSizeConfig(effKey);
      // Output dimensions: width fixed at config.width, height scales with the
      // actual rendered card height (which may exceed config.height in the
      // safety-net case where content overflows even at min font scale).
      const scale = config.width / CAPTURE_WIDTH;
      const outWidth = config.width;
      const outHeight = Math.round(captureH * scale);
      await new Promise(r => setTimeout(r, Platform.OS === 'android' ? 400 : 150));
      const uri = await Promise.race([
        captureRef(viewShotRef, {
          format: 'png',
          quality: 1,
          width: outWidth,
          height: outHeight,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Capture timeout')), 10000)
        ),
      ]);
      return uri;
    };

    useImperativeHandle(ref, () => ({
      capture: (sizeKey?) => doCapture(sizeKey),
      showSizePicker: () => setShowPicker(true),
    }));

    const handleShare = async () => {
      if (capturing) return;
      setCapturing(true);
      try {
        const uri = await doCapture(selectedSize);
        if (onCapture) {
          setShowPicker(false);
          onCapture(uri);
        } else {
          const canShare = await Sharing.isAvailableAsync();
          if (canShare) {
            await Sharing.shareAsync(uri, { mimeType: 'image/png' });
          }
          setShowPicker(false);
        }
      } catch (e) {
        console.warn('IslamicShareCard share failed:', e);
      } finally {
        setCapturing(false);
      }
    };

    // ─── Content children (used by card + offscreen measurer) ───
    // `scale` shrinks all text uniformly in long-content mode.
    const renderContentChildren = (scale: number) => {
      const scaleText = (size: number, lineHeight?: number) => ({
        fontSize: size * scale,
        ...(lineHeight !== undefined ? { lineHeight: lineHeight * scale } : {}),
      });
      return (
        <>
          <OrnamentDivider />

          {showBasmala && (
            <Text style={[s.basmalaText, scaleText(32)]}>{'\uFDFD'}</Text>
          )}

          {renderCustomContent ? (
            renderCustomContent()
          ) : qcfGlyphs && qcfFontFamily ? (
            <Text
              style={[s.mainText, { fontFamily: qcfFontFamily, fontSize: 30 * scale, lineHeight: 30 * 2.0 * scale }]}
              allowFontScaling={false}
            >
              {qcfGlyphs.join('')}
            </Text>
          ) : (
            <Text style={[s.mainText, scaleText(32, 32 * 2.1)]}>{arabicText}</Text>
          )}

          {translationText ? (
            <Text style={[s.translationText, scaleText(15, 15 * 1.8)]}>{translationText}</Text>
          ) : null}

          {benefitText ? (
            <Text style={[s.benefitText, scaleText(14, 14 * 1.8)]}>{benefitText}</Text>
          ) : null}

          {noteText ? (
            <Text style={[s.noteText, scaleText(13)]}>{`"${noteText}"`}</Text>
          ) : null}

          <OrnamentDivider />

          {sourceText ? (
            <View style={s.sourceRow}>
              <BookIcon />
              <Text style={[s.sourceText, scaleText(15)]}>{sourceText}</Text>
            </View>
          ) : null}
        </>
      );
    };

    // ─── Card content renderer (used by capture + preview) ───
    const renderCard = () => (
      <View style={[s.card, { height: captureH }]}>
        {/* SVG background */}
        <SvgBackground w={CAPTURE_WIDTH} h={captureH} />

        {/* Top gold strip */}
        <View style={s.goldStrip} />

        {/* Category band */}
        <View style={s.categoryBand}>
          <View style={s.categoryInner}>
            <View style={s.categoryLine} />
            <Text style={s.categoryStar}>{'\u2726'}</Text>
            <Text style={s.categoryText}>{categoryLabel}</Text>
            <Text style={s.categoryStar}>{'\u2726'}</Text>
            <View style={s.categoryLine} />
          </View>
        </View>

        {/* Content area — top-aligned in long mode so first line is always visible */}
        <View style={[s.contentArea, isLong && { justifyContent: 'flex-start' }]}>
          {renderContentChildren(fontScale)}
        </View>

        {/* Footer — app logo only */}
        <View style={s.footer}>
          <Image source={logoSource} style={s.footerLogo} resizeMode="contain" />
        </View>

        {/* Bottom gold strip */}
        <View style={s.goldStrip} />
      </View>
    );

    const isDark = isDarkMode;

    return (
      <>
        {/* Hidden capture view */}
        <View style={s.hiddenCapture} pointerEvents="none">
          <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
            {renderCard()}
          </ViewShot>
        </View>

        {/* Hidden offscreen measurer — renders content children at base scale
            with no height constraint to get the natural height. */}
        <View style={s.hiddenMeasurer} pointerEvents="none">
          <View
            style={s.measurerInner}
            onLayout={e => {
              const h = Math.ceil(e.nativeEvent.layout.height);
              if (h > 0 && h !== measuredContentH) setMeasuredContentH(h);
            }}
          >
            {renderContentChildren(1)}
          </View>
        </View>

        {/* Share modal */}
        <Modal
          visible={showPicker}
          transparent
          animationType="slide"
          onRequestClose={() => !capturing && setShowPicker(false)}
        >
          <View style={s.overlay}>
            <TouchableOpacity
              style={s.overlayDismiss}
              activeOpacity={1}
              onPress={() => !capturing && setShowPicker(false)}
            />
            <View style={[s.sheet, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
              <View style={s.dragHandle} />
              <Text style={[s.sheetTitle, { color: colors.text }]}>
                {t('common.shareImage')}
              </Text>

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: 420, width: '100%' }}
                contentContainerStyle={{ paddingBottom: 8 }}
              >
                {/* Size tabs — 4:5 disabled when content is long */}
                <View style={[s.segmented, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)' }]}>
                  {IMAGE_SIZE_OPTIONS.map(opt => {
                    const disabled = isLong && opt.key === 'portrait';
                    const active = effectiveSize === opt.key;
                    return (
                      <TouchableOpacity
                        key={opt.key}
                        onPress={() => { if (!disabled) setSelectedSize(opt.key); }}
                        style={[
                          s.segTab,
                          active && {
                            backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF',
                            ...(Platform.OS === 'ios'
                              ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 3 }
                              : { elevation: 3 }),
                          },
                          disabled && { opacity: 0.4 },
                        ]}
                        activeOpacity={disabled ? 1 : 0.7}
                        disabled={disabled}
                      >
                        <Text style={[
                          s.segLabel,
                          { color: active ? '#0d8e62' : colors.textLight },
                          active && { fontFamily: fontBold() },
                        ]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {isLong && (
                  <Text style={[s.longHint, { color: colors.textLight }]}>
                    {'\u062A\u0645 \u0627\u062E\u062A\u064A\u0627\u0631 9:16 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u0644\u064A\u0638\u0647\u0631 \u0627\u0644\u0646\u0635 \u0643\u0627\u0645\u0644\u0627\u064B'}
                  </Text>
                )}

                {/* Live preview */}
                <View style={s.previewArea}>
                  <View style={{
                    width: previewW,
                    height: previewH,
                    overflow: 'hidden',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)',
                  }}>
                    <View style={{
                      width: CAPTURE_WIDTH,
                      height: captureH,
                      transform: [{ scale: previewScale }],
                      transformOrigin: '0% 0%',
                    }}>
                      {renderCard()}
                    </View>
                  </View>
                  <Text style={[s.dimText, { color: colors.textLight }]}>
                    {effectiveSizeConfig.width} × {Math.round(captureH * (effectiveSizeConfig.width / CAPTURE_WIDTH))}
                  </Text>
                </View>
              </ScrollView>

              {/* Share button */}
              <TouchableOpacity
                style={[s.shareBtn, capturing && { opacity: 0.6 }]}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  handleShare();
                }}
                activeOpacity={0.8}
                disabled={capturing}
              >
                <MaterialCommunityIcons name="share-variant" size={20} color="#fff" />
                <Text style={s.shareBtnLabel}>
                  {capturing ? t('common.preparing') : t('common.share')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </>
    );
  }
);

IslamicShareCard.displayName = 'IslamicShareCard';

// ─── Styles ───
const s = StyleSheet.create({
  card: {
    width: CAPTURE_WIDTH,
    backgroundColor: CARD_BG,
    borderRadius: 0,
    overflow: 'hidden',
  },
  goldStrip: {
    height: 3,
    backgroundColor: GOLD,
    opacity: 0.85,
  },
  // ── Category band ──
  categoryBand: {
    backgroundColor: 'rgba(15, 55, 32, 0.65)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(201, 168, 68, 0.22)',
    paddingTop: 17,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  categoryInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  categoryLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(201,168,68,0.38)',
  },
  categoryStar: {
    color: GOLD,
    fontSize: 10,
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Amiri-Bold',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  // ── Content ──
  contentArea: {
    flex: 1,
    paddingHorizontal: 28,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  basmalaText: {
    color: GOLD,
    fontSize: 32,
    fontFamily: 'Amiri',
    textAlign: 'center',
    marginBottom: 12,
    opacity: 0.7,
  },
  mainText: {
    color: '#FFFFFF',
    fontSize: 32,
    lineHeight: 32 * 2.1,
    fontWeight: '700',
    fontFamily: 'Amiri-Bold',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  translationText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    lineHeight: 15 * 1.8,
    fontFamily: 'Amiri',
    textAlign: 'center',
    marginTop: 14,
    paddingHorizontal: 8,
    direction: 'ltr',
    writingDirection: 'ltr',
  },
  benefitText: {
    color: 'rgba(201,168,68,0.75)',
    fontSize: 14,
    lineHeight: 14 * 1.8,
    fontFamily: 'Amiri',
    textAlign: 'center',
    marginTop: 10,
    writingDirection: 'rtl',
    flexShrink: 1,
    paddingHorizontal: 8,
  },
  noteText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    fontFamily: 'Amiri-Italic',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  // ── Source ──
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  sourceText: {
    color: '#D9B84E',
    fontSize: 15,
    fontFamily: 'Amiri-Italic',
    fontStyle: 'italic',
    writingDirection: 'rtl',
  },
  // ── Footer ──
  footer: {
    backgroundColor: 'transparent',
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLogo: {
    width: 72,
    height: 72,
    borderRadius: 14,
  },
  // ── Hidden capture ──
  hiddenCapture: {
    position: 'absolute',
    left: -9999,
    top: 0,
    opacity: 1, // Must be 1 for captureRef
  },
  // ── Hidden offscreen measurer (no height constraint) ──
  hiddenMeasurer: {
    position: 'absolute',
    left: -9999,
    top: 0,
    opacity: 0,
  },
  measurerInner: {
    width: CAPTURE_WIDTH - 56, // matches contentArea horizontal padding (28*2)
    paddingHorizontal: 0,
    alignItems: 'center',
  },
  longHint: {
    fontSize: 12,
    fontFamily: fontRegular(),
    textAlign: 'center',
    marginTop: -6,
    marginBottom: 10,
    paddingHorizontal: 8,
    writingDirection: 'rtl',
  },
  // ── Modal ──
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayDismiss: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.4)',
    marginTop: 10,
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: fontBold(),
    marginBottom: 14,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
  },
  segTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segLabel: {
    fontSize: 15,
    fontFamily: fontSemiBold(),
  },
  previewArea: {
    alignItems: 'center',
    marginBottom: 14,
  },
  dimText: {
    fontSize: 12,
    fontFamily: fontRegular(),
    marginTop: 6,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d8e62',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    gap: 8,
    marginTop: 14,
  },
  shareBtnLabel: {
    fontSize: 16,
    fontFamily: fontBold(),
    color: '#fff',
  },
});
