// components/ui/BrandedCapture.tsx
// نظام مشاركة الصور الموحد — ألوان، تدرجات، صورة مخصصة، أحجام متعددة، تحكم بحجم الخط

import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
import {
  View, Text, Image, StyleSheet,
  TouchableOpacity, Modal, Platform, ScrollView, Dimensions,
} from 'react-native';
import { fontBold, fontRegular, fontSemiBold } from '@/lib/fonts';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors } from '@/hooks/use-colors';
import { useSettings } from '@/contexts/SettingsContext';
import { useAppIdentity } from '@/hooks/use-app-identity';
import { APP_BACKGROUNDS, BACKGROUND_SOURCE_MAP } from '@/lib/backgrounds';
import { useIsRTL } from '@/hooks/use-is-rtl';

// ─── Size options ───
export type ImageSizeKey = 'portrait' | 'story';

export const IMAGE_SIZE_OPTIONS = [
  { key: 'portrait' as const, label: '4:5', width: 1080, height: 1350 },
  { key: 'story' as const, label: '9:16', width: 1080, height: 1920 },
];

// ─── Background options ───
type BgType = 'solid' | 'gradient' | 'custom' | 'appBg';

const SHARE_BG_COLORS = [
  { color: '#1a1a2e', labelKey: 'common.colorNavy', textColor: '#FFFFFF' },
  { color: '#1B5E20', labelKey: 'common.colorGreen', textColor: '#FFFFFF' },
  { color: '#0D47A1', labelKey: 'common.colorBlue', textColor: '#FFFFFF' },
  { color: '#000000', labelKey: 'common.colorBlack', textColor: '#FFFFFF' },
  { color: '#004D40', labelKey: 'common.colorTeal', textColor: '#FFFFFF' },
  { color: '#FAFAFA', labelKey: 'common.colorWhite', textColor: '#1F2937' },
];

const SHARE_BG_GRADIENTS = [
  { id: 'green', labelKey: 'common.colorGreen', colors: ['#1B5E20', '#4CAF50'] as [string, string], textColor: '#FFFFFF' },
  { id: 'blue', labelKey: 'common.colorBlue', colors: ['#0D47A1', '#42A5F5'] as [string, string], textColor: '#FFFFFF' },
  { id: 'purple', labelKey: 'common.colorPurple', colors: ['#4A148C', '#AB47BC'] as [string, string], textColor: '#FFFFFF' },
];

const FONT_SCALES = [0.8, 0.9, 1.0, 1.1, 1.25];

// ─── Public API ───
export interface BrandedCaptureHandle {
  capture: (sizeKey?: ImageSizeKey) => Promise<string>;
  showSizePicker: () => void;
}

interface BrandedCaptureProps {
  children: React.ReactNode;
  excludeBranding?: boolean;
  isPremium?: boolean;
  title?: string;
  onCapture?: (uri: string) => void;
}

const CAPTURE_WIDTH = 375;
const PREVIEW_MAX_H = 240;
const SCREEN_WIDTH = Dimensions.get('window').width;

export const BrandedCapture = forwardRef<BrandedCaptureHandle, BrandedCaptureProps>(
  ({ children, excludeBranding = false, isPremium = false, title, onCapture }, ref) => {
    const viewShotRef = useRef<ViewShot>(null);
    const colors = useColors();
    const { isDarkMode, t } = useSettings();
    const { logoSource } = useAppIdentity();
    const isRTL = useIsRTL();

    const [selectedSize, setSelectedSize] = useState<ImageSizeKey>('portrait');
    const [showPicker, setShowPicker] = useState(false);
    const [capturing, setCapturing] = useState(false);

    // Background
    const [bgType, setBgType] = useState<BgType>('solid');
    const [solidColor, setSolidColor] = useState('#1a1a2e');
    const [gradientId, setGradientId] = useState('green');
    const [customBgUri, setCustomBgUri] = useState<string | null>(null);
    const [appBgId, setAppBgId] = useState<string>('background1');

    // Font scale
    const [fontScaleIdx, setFontScaleIdx] = useState(2); // default 1.0
    const contentScale = FONT_SCALES[fontScaleIdx];

    // Load saved preferences
    useEffect(() => {
      AsyncStorage.getItem('@share_preferences').then(raw => {
        if (!raw) return;
        try {
          const prefs = JSON.parse(raw);
          if (prefs.size && IMAGE_SIZE_OPTIONS.some(o => o.key === prefs.size)) setSelectedSize(prefs.size);
          if (prefs.bgType) setBgType(prefs.bgType);
          if (prefs.solidColor) setSolidColor(prefs.solidColor);
          if (prefs.gradientId) setGradientId(prefs.gradientId);
          if (prefs.appBgId) setAppBgId(prefs.appBgId);
          if (typeof prefs.fontScaleIdx === 'number') setFontScaleIdx(prefs.fontScaleIdx);
        } catch {}
      });
    }, []);

    // Auto-save preferences when any setting changes
    useEffect(() => {
      const prefs = { size: selectedSize, bgType, solidColor, gradientId, appBgId, fontScaleIdx };
      AsyncStorage.setItem('@share_preferences', JSON.stringify(prefs)).catch(() => {});
    }, [selectedSize, bgType, solidColor, gradientId, appBgId, fontScaleIdx]);

    const getSizeConfig = (key: ImageSizeKey) =>
      IMAGE_SIZE_OPTIONS.find(o => o.key === key) || IMAGE_SIZE_OPTIONS[0];

    const getTextColor = () => {
      if (bgType === 'custom') return '#FFFFFF';
      if (bgType === 'appBg') return APP_BACKGROUNDS.find(b => b.id === appBgId)?.textColor === 'black' ? '#1F2937' : '#FFFFFF';
      if (bgType === 'gradient') return SHARE_BG_GRADIENTS.find(g => g.id === gradientId)?.textColor || '#FFFFFF';
      return SHARE_BG_COLORS.find(c => c.color === solidColor)?.textColor || '#FFFFFF';
    };

    const sizeConfig = getSizeConfig(selectedSize);
    const captureH = CAPTURE_WIDTH * (sizeConfig.height / sizeConfig.width);
    const txtColor = getTextColor();

    // Preview dimensions
    const previewH = PREVIEW_MAX_H;
    const previewW = previewH * (sizeConfig.width / sizeConfig.height);
    const previewScale = previewW / CAPTURE_WIDTH;

    const doCapture = async (sizeKey: ImageSizeKey = selectedSize) => {
      if (!viewShotRef.current) throw new Error('ViewShot ref not ready');
      const config = getSizeConfig(sizeKey);
      // Small delay to ensure layout is settled
      await new Promise(r => setTimeout(r, 150));
      const uri = await Promise.race([
        captureRef(viewShotRef, {
          format: 'png',
          quality: 1,
          width: config.width,
          height: config.height,
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

    if (excludeBranding || isPremium) {
      return (
        <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
          {children}
        </ViewShot>
      );
    }

    const pickCustomBackground = async () => {
      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [sizeConfig.width, sizeConfig.height],
          quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) {
          setCustomBgUri(result.assets[0].uri);
          setBgType('custom');
        }
      } catch (e) {
        console.warn('Image pick error:', e);
      }
    };

    const handleShare = async () => {
      if (capturing) return;
      setCapturing(true);
      try {
        const uri = await doCapture(selectedSize);
        // Close modal first
        setShowPicker(false);
        // Wait for modal to fully dismiss before opening share sheet
        await new Promise(r => setTimeout(r, Platform.OS === 'ios' ? 600 : 400));
        if (onCapture) {
          onCapture(uri);
        } else {
          const canShare = await Sharing.isAvailableAsync();
          if (canShare) {
            await Sharing.shareAsync(uri, { mimeType: 'image/png' });
          }
        }
      } catch (e) {
        console.warn('Share failed:', e);
      } finally {
        setCapturing(false);
      }
    };

    // ─── Logo sizes per aspect ratio (adjustable here) ───
    const LOGO_SIZES: Record<ImageSizeKey, number> = {
      portrait: 100,  // 4:5
      story: 200,     // 9:16
    };
    const logoSize = LOGO_SIZES[selectedSize];

    // ─── Shared content renderer (used by capture & preview) ───
    // Content and logo flow naturally in a column. Scale is applied to the
    // entire contentCard so that visual size == layout size (no overflow).
    const renderInner = () => (
      <View style={{
        flex: 1,
        width: '100%',
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 32,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        {title ? <Text style={[styles.titleText, { color: txtColor }]}>{title}</Text> : null}
        {/* Scaled content card — the entire card scales so layout matches visual */}
        <View style={{
          maxWidth: '100%',
          borderRadius: 20,
          padding: 14,
          backgroundColor: txtColor === '#FFFFFF' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.04)',
          transform: [{ scale: contentScale }],
        }}>
          <View style={{ alignItems: 'center' }}>
            {children}
          </View>
        </View>
        {/* Logo — size changes per aspect ratio */}
        <View style={{ marginTop: 10, alignItems: 'center' }}>
          <Image
            source={logoSource}
            style={{ width: logoSize, height: logoSize, borderRadius: Math.round(logoSize / 5) }}
            resizeMode="contain"
          />
        </View>
      </View>
    );

    // ─── Background wrapper ───
    const renderWithBg = (inner: React.ReactNode, style?: object) => {
      const baseStyle = [styles.captureWrapper, { height: captureH }, style];
      if (bgType === 'gradient') {
        const grad = SHARE_BG_GRADIENTS.find(g => g.id === gradientId);
        return (
          <LinearGradient
            colors={grad?.colors || ['#1B5E20', '#4CAF50']}
            style={baseStyle}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {inner}
          </LinearGradient>
        );
      }
      if (bgType === 'appBg') {
        const bgSource = BACKGROUND_SOURCE_MAP[appBgId];
        if (bgSource) {
          return (
            <View style={[...baseStyle, { backgroundColor: '#000' } as any]}>
              <Image
                source={bgSource}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
              {inner}
            </View>
          );
        }
      }
      if (bgType === 'custom' && customBgUri) {
        return (
          <View style={[...baseStyle, { backgroundColor: '#000' } as any]}>
            <Image
              source={{ uri: customBgUri }}
              style={StyleSheet.absoluteFill}
              blurRadius={8}
              resizeMode="cover"
            />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />
            {inner}
          </View>
        );
      }
      return (
        <View style={[...baseStyle, { backgroundColor: solidColor } as any]}>
          {inner}
        </View>
      );
    };

    const isDark = isDarkMode;

    return (
      <>
        {/* Hidden capture view – positioned off-screen but in view tree */}
        <View style={styles.hiddenCapture} pointerEvents="none">
          <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
            {renderWithBg(renderInner())}
          </ViewShot>
        </View>

        {/* Share Sheet Modal */}
        <Modal
          visible={showPicker}
          transparent
          animationType="slide"
          onRequestClose={() => !capturing && setShowPicker(false)}
        >
          <View style={styles.overlay}>
            <TouchableOpacity
              style={styles.overlayDismiss}
              activeOpacity={1}
              onPress={() => !capturing && setShowPicker(false)}
            />
            <View style={[styles.sheet, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
              <View style={styles.dragHandle} />
              <Text style={[styles.sheetTitle, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>
                {t('common.shareImage')}
              </Text>

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: 520, width: '100%' }}
                contentContainerStyle={{ paddingBottom: 8 }}
              >
                {/* ── Size tabs ── */}
                <View style={[styles.segmented, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                  {IMAGE_SIZE_OPTIONS.map(opt => {
                    const active = selectedSize === opt.key;
                    return (
                      <TouchableOpacity
                        key={opt.key}
                        onPress={() => setSelectedSize(opt.key)}
                        style={[
                          styles.segTab,
                          active && {
                            backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF',
                            ...(Platform.OS === 'ios'
                              ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 3 }
                              : { elevation: 3 }),
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.segLabel,
                          { color: active ? '#22C55E' : (isDark ? '#9CA3AF' : '#6B7280') },
                          active && { fontFamily: fontBold() },
                        ]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* ── Live preview — shows real content ── */}
                <View style={styles.previewArea}>
                  <View style={{
                    width: previewW,
                    height: previewH,
                    overflow: 'hidden',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                  }}>
                    <View style={{
                      width: CAPTURE_WIDTH,
                      height: captureH,
                      transform: [{ scale: previewScale }],
                      transformOrigin: '0% 0%',
                    }}>
                      {renderWithBg(renderInner())}
                    </View>
                  </View>
                  <Text style={[styles.dimText, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>
                    {sizeConfig.width} × {sizeConfig.height}
                  </Text>
                </View>

                {/* ── Font size controls ── */}
                <View style={[styles.fontRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <TouchableOpacity
                    onPress={() => setFontScaleIdx(i => Math.min(FONT_SCALES.length - 1, i + 1))}
                    style={[styles.fontBtn, fontScaleIdx >= FONT_SCALES.length - 1 && { opacity: 0.3 }]}
                    disabled={fontScaleIdx >= FONT_SCALES.length - 1}
                  >
                    <Text style={[styles.fontBtnLg, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>{isRTL ? 'أ+' : 'A+'}</Text>
                  </TouchableOpacity>
                  <Text style={[styles.fontLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                    {t('settings.fontSize')}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setFontScaleIdx(i => Math.max(0, i - 1))}
                    style={[styles.fontBtn, fontScaleIdx <= 0 && { opacity: 0.3 }]}
                    disabled={fontScaleIdx <= 0}
                  >
                    <Text style={[styles.fontBtnSm, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>{isRTL ? 'أ-' : 'A-'}</Text>
                  </TouchableOpacity>
                </View>

                {/* ── Colors ── */}
                <Text style={[styles.sectionLabel, { color: isDark ? '#9CA3AF' : '#6B7280', textAlign: isRTL ? 'right' : 'left', paddingLeft: isRTL ? 4 : 0, paddingRight: isRTL ? 0 : 4 }]}>
                  {t('common.colors')}
                </Text>
                <View style={[styles.colorRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  {SHARE_BG_COLORS.map(item => {
                    const active = bgType === 'solid' && solidColor === item.color;
                    return (
                      <TouchableOpacity
                        key={item.color}
                        onPress={() => { setBgType('solid'); setSolidColor(item.color); }}
                        style={styles.colorItem}
                      >
                        <View style={[
                          styles.swatch,
                          { backgroundColor: item.color },
                          item.color === '#FAFAFA' && { borderWidth: 1, borderColor: '#D1D5DB' },
                          active && { borderWidth: 3, borderColor: '#22C55E' },
                        ]} />
                        <Text style={[styles.swatchText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                          {t(item.labelKey)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* ── Gradients ── */}
                <Text style={[styles.sectionLabel, { color: isDark ? '#9CA3AF' : '#6B7280', marginTop: 12, textAlign: isRTL ? 'right' : 'left', paddingLeft: isRTL ? 4 : 0, paddingRight: isRTL ? 0 : 4 }]}>
                  {t('common.gradients')}
                </Text>
                <View style={[styles.colorRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  {SHARE_BG_GRADIENTS.map(item => {
                    const active = bgType === 'gradient' && gradientId === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => { setBgType('gradient'); setGradientId(item.id); }}
                        style={styles.colorItem}
                      >
                        <LinearGradient
                          colors={item.colors}
                          style={[styles.swatch, active && { borderWidth: 3, borderColor: '#22C55E' }]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        />
                        <Text style={[styles.swatchText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                          {t(item.labelKey)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}

                  {/* Custom image */}
                  <TouchableOpacity onPress={pickCustomBackground} style={styles.colorItem}>
                    {customBgUri ? (
                      <Image
                        source={{ uri: customBgUri }}
                        style={[styles.swatch, bgType === 'custom' && { borderWidth: 3, borderColor: '#22C55E' }]}
                      />
                    ) : (
                      <View style={[styles.swatch, {
                        backgroundColor: isDark ? '#374151' : '#E5E7EB',
                        alignItems: 'center', justifyContent: 'center',
                      }]}>
                        <MaterialCommunityIcons name="image-plus" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                      </View>
                    )}
                    <Text style={[styles.swatchText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                      {t('common.image')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* ── App backgrounds ── */}
                <Text style={[styles.sectionLabel, { color: isDark ? '#9CA3AF' : '#6B7280', marginTop: 12, textAlign: isRTL ? 'right' : 'left', paddingLeft: isRTL ? 4 : 0, paddingRight: isRTL ? 0 : 4 }]}>
                  {t('common.appBackgrounds')}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[{ marginBottom: 8 }, isRTL && { transform: [{ scaleX: -1 }] }]} contentContainerStyle={{ gap: 12, paddingHorizontal: 12 }}>
                  {APP_BACKGROUNDS.map(bg => {
                    const active = bgType === 'appBg' && appBgId === bg.id;
                    return (
                      <TouchableOpacity
                        key={bg.id}
                        onPress={() => { setBgType('appBg'); setAppBgId(bg.id); }}
                        style={[styles.colorItem, isRTL && { transform: [{ scaleX: -1 }] }]}
                      >
                        <Image
                          source={bg.source}
                          style={[
                            styles.appBgThumb,
                            active && { borderWidth: 3, borderColor: '#22C55E' },
                          ]}
                          resizeMode="cover"
                        />
                        <Text style={[styles.swatchText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                          {bg.name_ar}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </ScrollView>

              {/* ── Share button ── */}
              <TouchableOpacity
                style={[styles.shareBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }, capturing && { opacity: 0.6 }]}
                onPress={handleShare}
                activeOpacity={0.8}
                disabled={capturing}
              >
                <MaterialCommunityIcons name="share-variant" size={20} color="#fff" />
                <Text style={styles.shareBtnLabel}>
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

BrandedCapture.displayName = 'BrandedCapture';

const styles = StyleSheet.create({
  // ── Hidden capture ──
  hiddenCapture: {
    position: 'absolute',
    left: -9999,
    top: 0,
    opacity: 1, // Must be 1 for captureRef to work
  },
  captureWrapper: {
    width: CAPTURE_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 18,
    fontFamily: fontBold(),
    textAlign: 'center',
    marginBottom: 12,
  },
  contentCard: {
    width: '100%',
    borderRadius: 20,
    padding: 14,
  },
  footer: {
    marginTop: 14,
    alignItems: 'center',
  },
  logoIcon: { width: 48, height: 48, borderRadius: 12 },
  // ── Modal ──
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayDismiss: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
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
  // ── Segmented ──
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
  // ── Preview ──
  previewArea: {
    alignItems: 'center',
    marginBottom: 14,
  },
  dimText: {
    fontSize: 12,
    fontFamily: fontRegular(),
    marginTop: 6,
  },
  // ── Font controls ──
  fontRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 14,
    gap: 20,
  },
  fontBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontBtnLg: {
    fontSize: 20,
    fontFamily: fontBold(),
  },
  fontBtnSm: {
    fontSize: 14,
    fontFamily: fontBold(),
  },
  fontLabel: {
    fontSize: 14,
    fontFamily: fontSemiBold(),
  },
  // ── Colors ──
  sectionLabel: {
    fontSize: 14,
    fontFamily: fontSemiBold(),
    marginBottom: 10,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  colorItem: {
    alignItems: 'center',
    gap: 8,
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  appBgThumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
  },
  swatchText: {
    fontSize: 10,
    fontFamily: fontRegular(),
  },
  // ── Share button ──
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
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
    color: '#FFFFFF',
  },
});

export default BrandedCapture;
