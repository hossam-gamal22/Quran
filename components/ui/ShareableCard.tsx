// components/ui/ShareableCard.tsx
// بطاقة قابلة للمشاركة كصورة أو نص

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  Image,
  ImageBackground,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSettings } from '@/contexts/SettingsContext';
import { shareText, shareImage, copyText } from '@/lib/share-service';
import { APP_NAME } from '@/constants/app';
import { CARD_COLORS as THEME_CARD_COLORS } from '@/constants/theme';

interface ShareableCardProps {
  arabicText: string;
  title?: string;
  subtitle?: string;
  reference?: string;
  translation?: string;
  onClose?: () => void;
  visible: boolean;
}

const CARD_COLORS = THEME_CARD_COLORS;

const APP_BACKGROUNDS = [
  require('@/assets/images/background1.png'),
  require('@/assets/images/background2.png'),
  require('@/assets/images/background3.png'),
  require('@/assets/images/background4.png'),
  require('@/assets/images/background5.png'),
  require('@/assets/images/background6.png'),
  require('@/assets/images/background7.png'),
];

export function ShareableCard({
  arabicText,
  title,
  subtitle,
  reference,
  translation,
  onClose,
  visible,
}: ShareableCardProps) {
  const { isDarkMode } = useSettings();
  const viewShotRef = useRef<ViewShot>(null);
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedBackground, setSelectedBackground] = useState(0);
  const [backgroundMode, setBackgroundMode] = useState<'color' | 'image'>('color');

  const handleShareAsText = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    let text = '';
    if (title) text += `${title}\n\n`;
    text += arabicText;
    if (translation) text += `\n\n${translation}`;
    if (reference) text += `\n\n📚 ${reference}`;
    text += `\n\n— ${APP_NAME}`;
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
      Alert.alert('خطأ', 'حدث خطأ أثناء إنشاء الصورة');
    }
  };

  const handleCopy = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    let text = arabicText;
    if (reference) text += `\n\n📚 ${reference}`;
    await copyText(text);
    Alert.alert('تم النسخ', 'تم نسخ النص بنجاح');
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
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: isDarkMode ? '#fff' : '#000' }]}>
              مشاركة
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
                {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
                <Text style={styles.cardArabic}>{arabicText}</Text>
                {translation ? <Text style={styles.cardTranslation}>{translation}</Text> : null}
                {reference ? <Text style={styles.cardReference}>📚 {reference}</Text> : null}
                <View style={styles.logoWatermarkRow}>
                  <Image
                    source={require('@/assets/images/App-icon.png')}
                    style={styles.logoWatermark}
                    resizeMode="contain"
                  />
                  <Text style={styles.cardWatermark}>{APP_NAME}</Text>
                </View>
              </ImageBackground>
            ) : (
              <View style={[styles.card, { backgroundColor: selectedCardColor }]}> 
                <View style={[StyleSheet.absoluteFill, styles.colorOverlay]} />
                {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
                <Text style={styles.cardArabic}>{arabicText}</Text>
                {translation ? <Text style={styles.cardTranslation}>{translation}</Text> : null}
                {reference ? <Text style={styles.cardReference}>📚 {reference}</Text> : null}
                <View style={styles.logoWatermarkRow}>
                  <Image
                    source={require('@/assets/images/App-icon.png')}
                    style={styles.logoWatermark}
                    resizeMode="contain"
                  />
                  <Text style={styles.cardWatermark}>{APP_NAME}</Text>
                </View>
              </View>
            )}
          </ViewShot>

          {/* Background Mode */}
          <View style={styles.modeActions}>
            <TouchableOpacity style={styles.modeButton} onPress={randomizeBackground}>
              <MaterialCommunityIcons name="image-multiple" size={18} color="#2f7659" />
              <Text style={styles.modeButtonText}>خلفية عشوائية</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modeButton} onPress={randomizeColor}>
              <MaterialCommunityIcons name="palette" size={18} color="#2f7659" />
              <Text style={styles.modeButtonText}>لون عشوائي</Text>
            </TouchableOpacity>
          </View>

          {/* Color Picker (10 colors) */}
          <View style={styles.colorPicker}>
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
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleCopy}>
              <View style={[styles.actionIcon, {
                backgroundColor: isDarkMode ? 'rgba(120,120,128,0.24)' : 'rgba(120,120,128,0.12)',
              }]}>
                <MaterialCommunityIcons name="content-copy" size={22} color={isDarkMode ? '#fff' : '#000'} />
              </View>
              <Text style={[styles.actionLabel, { color: isDarkMode ? '#fff' : '#000' }]}>نسخ</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={handleShareAsText}>
              <View style={[styles.actionIcon, {
                backgroundColor: isDarkMode ? 'rgba(120,120,128,0.24)' : 'rgba(120,120,128,0.12)',
              }]}>
                <MaterialCommunityIcons name="text" size={22} color={isDarkMode ? '#fff' : '#000'} />
              </View>
              <Text style={[styles.actionLabel, { color: isDarkMode ? '#fff' : '#000' }]}>نص</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={handleShareAsImage}>
              <View style={[styles.actionIcon, { backgroundColor: '#2f7659' }]}>
                <MaterialCommunityIcons name="image" size={22} color="#fff" />
              </View>
              <Text style={[styles.actionLabel, { color: isDarkMode ? '#fff' : '#000' }]}>صورة</Text>
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
    fontFamily: 'Cairo-Bold',
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
    fontFamily: 'Cairo-Bold',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 16,
    textAlign: 'center',
  },
  cardArabic: {
    fontSize: 22,
    fontFamily: 'Cairo-Bold',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 38,
  },
  cardTranslation: {
    fontSize: 14,
    fontFamily: 'Cairo-Regular',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
  },
  cardReference: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 16,
    textAlign: 'center',
  },
  cardWatermark: {
    fontSize: 11,
    fontFamily: 'Cairo-Regular',
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
  },
  logoWatermarkRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
  },
  logoWatermark: {
    width: 20,
    height: 20,
    opacity: 0.85,
  },
  modeActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingTop: 12,
  },
  modeButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(47,118,89,0.12)',
  },
  modeButtonText: {
    fontSize: 12,
    fontFamily: 'Cairo-SemiBold',
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
    gap: 6,
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
    fontFamily: 'Cairo-SemiBold',
  },
});

export default ShareableCard;
