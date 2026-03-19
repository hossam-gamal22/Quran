// components/ui/ShareableCard.tsx
// بطاقة قابلة للمشاركة كصورة أو نص — مع دعم خط المصحف QCF

import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  Image,
  ImageBackground,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { fontBold, fontRegular, fontSemiBold } from '@/lib/fonts';
import ViewShot from 'react-native-view-shot';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettings } from '@/contexts/SettingsContext';
import { shareText, shareImage, copyText } from '@/lib/share-service';
import { t } from '@/lib/i18n';
import { getAppName } from '@/constants/app';
import { CARD_COLORS as THEME_CARD_COLORS } from '@/constants/theme';
import { getVerseQcfData, getQcfFontSize } from '@/lib/qcf-page-data';
import { loadPageFont, getPageFontFamily, isPageFontLoaded } from '@/lib/qcf-font-loader';

import { useIsRTL } from '@/hooks/use-is-rtl';
import { useAppIdentity } from '@/hooks/use-app-identity';
import { useSubscription } from '@/contexts/SubscriptionContext';

const basmalaImg = require('@/assets/images/quran/basmala.png');

interface ShareableCardProps {
  arabicText: string;
  title?: string;
  subtitle?: string;
  reference?: string;
  translation?: string;
  onClose?: () => void;
  visible: boolean;
  /** QCF rendering — pass surahNumber, ayahNumber, page to render with Mushaf font */
  surahNumber?: number;
  ayahNumber?: number;
  page?: number;
}

const CARD_COLORS = THEME_CARD_COLORS;

const APP_BACKGROUNDS = [
  require('@/assets/images/backgrounds/background1.png'),
  require('@/assets/images/backgrounds/background2.png'),
  require('@/assets/images/backgrounds/background3.png'),
  require('@/assets/images/backgrounds/background4.png'),
  require('@/assets/images/backgrounds/background5.png'),
  require('@/assets/images/backgrounds/background6.png'),
  require('@/assets/images/backgrounds/background7.png'),
];

export function ShareableCard({
  arabicText,
  title,
  subtitle,
  reference,
  translation,
  onClose,
  visible,
  surahNumber,
  ayahNumber,
  page,
}: ShareableCardProps) {
  const { isDarkMode } = useSettings();
  const isRTL = useIsRTL();
  const { logoSource } = useAppIdentity();
  const { isPremium } = useSubscription();
  const viewShotRef = useRef<ViewShot>(null);
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedBackground, setSelectedBackground] = useState(0);
  const [backgroundMode, setBackgroundMode] = useState<'color' | 'image'>('color');

  // QCF font state
  const hasQcfData = !!(surahNumber && ayahNumber && page);
  const [qcfFontLoaded, setQcfFontLoaded] = useState(false);
  const [qcfGlyphs, setQcfGlyphs] = useState<string[] | null>(null);
  const [qcfPage, setQcfPage] = useState<number>(page ?? 0);

  // Load QCF font when modal opens and QCF data is available
  useEffect(() => {
    if (!visible || !hasQcfData) return;
    const verseData = getVerseQcfData(surahNumber!, ayahNumber!);
    if (!verseData) return;
    setQcfGlyphs(verseData.glyphs);
    setQcfPage(verseData.page);
    if (isPageFontLoaded(verseData.page, false)) {
      setQcfFontLoaded(true);
      return;
    }
    loadPageFont(verseData.page, false)
      .then(() => setQcfFontLoaded(true))
      .catch(() => setQcfFontLoaded(false));
  }, [visible, hasQcfData, surahNumber, ayahNumber]);

  const qcfFontFamily = qcfPage ? getPageFontFamily(qcfPage, false) : '';
  const CARD_WIDTH = Dimensions.get('window').width - 40; // viewShot marginHorizontal: 20
  const qcfFontSize = qcfPage ? getQcfFontSize(qcfPage, CARD_WIDTH - 56, 0) : 22;

  // Load saved preferences
  useEffect(() => {
    AsyncStorage.getItem('@shareable_card_preferences').then(raw => {
      if (!raw) return;
      try {
        const prefs = JSON.parse(raw);
        if (typeof prefs.colorIndex === 'number' && prefs.colorIndex < CARD_COLORS.length) setSelectedColor(prefs.colorIndex);
        if (typeof prefs.bgIndex === 'number' && prefs.bgIndex < APP_BACKGROUNDS.length) setSelectedBackground(prefs.bgIndex);
        if (prefs.mode === 'color' || prefs.mode === 'image') setBackgroundMode(prefs.mode);
      } catch {}
    });
  }, []);

  // Auto-save preferences
  useEffect(() => {
    const prefs = { colorIndex: selectedColor, bgIndex: selectedBackground, mode: backgroundMode };
    AsyncStorage.setItem('@shareable_card_preferences', JSON.stringify(prefs)).catch(() => {});
  }, [selectedColor, selectedBackground, backgroundMode]);

  const handleShareAsText = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    let text = '';
    if (title) text += `${title}\n\n`;
    text += arabicText;
    if (translation) text += `\n\n${translation}`;
    if (reference) text += `\n\n📚 ${reference}`;
    text += `\n\n— ${getAppName()}`;
    await shareText(text, title);
  };

  const handleShareAsImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      if (viewShotRef.current?.capture) {
        const uri = await viewShotRef.current.capture();
        await shareImage(uri, title);
      }
    } catch (error) {
      console.error('Error capturing image:', error);
      Alert.alert(t('common.error'), t('common.imageCreationError'));
    }
  };

  const handleCopy = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    let text = arabicText;
    if (reference) text += `\n\n📚 ${reference}`;
    await copyText(text);
    Alert.alert(t('common.copied'), t('common.textCopiedSuccess'));
  };

  const selectedCardColor = CARD_COLORS[selectedColor] || '#2f7659';
  const selectedImage = APP_BACKGROUNDS[selectedBackground];

  const randomizeColor = () => {
    const index = Math.floor(Math.random() * CARD_COLORS.length);
    setSelectedColor(index);
    setBackgroundMode('color');
  };

  const randomizeBackground = () => {
    const index = Math.floor(Math.random() * APP_BACKGROUNDS.length);
    setSelectedBackground(index);
    setBackgroundMode('image');
  };

  // Shared card content — uses QCF when available, falls back to plain Arabic
  const useQcf = hasQcfData && qcfFontLoaded && qcfGlyphs && qcfGlyphs.length > 0;

  const renderCardContent = () => (
    <>
      {/* Basmala image when QCF mode */}
      {useQcf && (
        <Image
          source={basmalaImg}
          style={styles.basmalaImage}
          resizeMode="contain"
          tintColor="rgba(255,255,255,0.7)"
        />
      )}
      {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
      {useQcf ? (
        qcfFontLoaded ? (
          <Text
            style={[styles.cardArabicQcf, {
              fontFamily: qcfFontFamily,
              fontSize: qcfFontSize,
              lineHeight: qcfFontSize * 1.85,
            }]}
            allowFontScaling={false}
          >
            {qcfGlyphs!.join('')}
          </Text>
        ) : (
          <ActivityIndicator size="small" color="#fff" style={{ marginVertical: 20 }} />
        )
      ) : (
        <Text style={styles.cardArabic}>{arabicText}</Text>
      )}
      {translation ? <Text style={styles.cardTranslation}>{translation}</Text> : null}
      {reference ? <Text style={styles.cardReference}>{reference}</Text> : null}
      {!isPremium && (
        <View style={styles.logoWatermarkRow}>
          <Image
            source={logoSource}
            style={styles.logoWatermark}
            resizeMode="contain"
          />
        </View>
      )}
    </>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          style={[
            styles.container,
            {
              backgroundColor: isDarkMode
                ? 'rgba(30, 30, 32, 0.95)'
                : 'rgba(255, 255, 255, 0.95)',
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.headerTitle, { color: isDarkMode ? '#fff' : '#000' }]}>
              {t('common.share')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <View style={[styles.closeBtn, {
                backgroundColor: isDarkMode ? 'rgba(120,120,128,0.24)' : 'rgba(120,120,128,0.12)',
              }]}>
                <MaterialCommunityIcons name="close" size={16} color={isDarkMode ? '#8e8e93' : '#6c6c70'} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Image Preview */}
          <ViewShot
            ref={viewShotRef}
            options={{ format: 'png', quality: 1 }}
            style={styles.viewShot}
          >
            {backgroundMode === 'image' ? (
              <ImageBackground source={selectedImage} style={styles.card} imageStyle={{ borderRadius: 20 }}>
                <View style={styles.imageOverlay} />
                {renderCardContent()}
              </ImageBackground>
            ) : (
              <View style={[styles.card, { backgroundColor: selectedCardColor }]}> 
                <View style={[StyleSheet.absoluteFill, styles.colorOverlay]} />
                {renderCardContent()}
              </View>
            )}
          </ViewShot>

          {/* Background Mode */}
          <View style={[styles.modeActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity style={[styles.modeButton, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} onPress={randomizeBackground}>
              <MaterialCommunityIcons name="image-multiple" size={18} color="#2f7659" />
              <Text style={styles.modeButtonText}>{t('common.randomBackground')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modeButton, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} onPress={randomizeColor}>
              <MaterialCommunityIcons name="palette" size={18} color="#2f7659" />
              <Text style={styles.modeButtonText}>{t('common.randomColor')}</Text>
            </TouchableOpacity>
          </View>

          {/* Color Picker (10 colors) */}
          <View style={[styles.colorPicker, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {CARD_COLORS.map((color, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedColor(index);
                  setBackgroundMode('color');
                }}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  selectedColor === index && styles.colorOptionSelected,
                ]}
              />
            ))}
          </View>

          {/* Share Actions */}
          <View style={[styles.actions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleCopy}>
              <View style={[styles.actionIcon, {
                backgroundColor: isDarkMode ? 'rgba(120,120,128,0.24)' : 'rgba(120,120,128,0.12)',
              }]}>
                <MaterialCommunityIcons name="content-copy" size={22} color={isDarkMode ? '#fff' : '#000'} />
              </View>
              <Text style={[styles.actionLabel, { color: isDarkMode ? '#fff' : '#000' }]}>{t('common.copy')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={handleShareAsText}>
              <View style={[styles.actionIcon, {
                backgroundColor: isDarkMode ? 'rgba(120,120,128,0.24)' : 'rgba(120,120,128,0.12)',
              }]}>
                <MaterialCommunityIcons name="text" size={22} color={isDarkMode ? '#fff' : '#000'} />
              </View>
              <Text style={[styles.actionLabel, { color: isDarkMode ? '#fff' : '#000' }]}>{t('common.text')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={handleShareAsImage}>
              <View style={[styles.actionIcon, { backgroundColor: '#2f7659' }]}>
                <MaterialCommunityIcons name="image" size={22} color="#fff" />
              </View>
              <Text style={[styles.actionLabel, { color: isDarkMode ? '#fff' : '#000' }]}>{t('common.image')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fontBold(),
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewShot: {
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  card: {
    padding: 28,
    borderRadius: 20,
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  colorOverlay: {
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: fontBold(),
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 16,
    textAlign: 'center',
  },
  cardArabic: {
    fontSize: 22,
    fontFamily: fontBold(),
    color: '#fff',
    textAlign: 'center',
    lineHeight: 38,
  },
  cardArabicQcf: {
    color: '#fff',
    textAlign: 'center',
    writingDirection: 'rtl',
    paddingHorizontal: 4,
  },
  basmalaImage: {
    width: '60%',
    height: 24,
    marginBottom: 12,
    opacity: 0.8,
  },
  cardTranslation: {
    fontSize: 14,
    fontFamily: fontRegular(),
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
  },
  cardReference: {
    fontSize: 12,
    fontFamily: fontRegular(),
    color: 'rgba(255,255,255,0.5)',
    marginTop: 16,
    textAlign: 'center',
  },
  logoWatermarkRow: {
    alignItems: 'center',
    marginTop: 20,
  },
  logoWatermark: {
    width: 56,
    height: 56,
    borderRadius: 14,
    opacity: 0.9,
  },
  modeActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingTop: 12,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(47,118,89,0.12)',
  },
  modeButtonText: {
    fontSize: 12,
    fontFamily: fontSemiBold(),
    color: '#2f7659',
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#fff',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  actionBtn: {
    alignItems: 'center',
    gap: 8,
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 12,
    fontFamily: fontSemiBold(),
  },
});

export default ShareableCard;
