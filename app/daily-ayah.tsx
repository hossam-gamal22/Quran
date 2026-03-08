/**
 * Daily Ayah Video — آية اليوم كفيديو
 * يُنشئ بطاقة آية يومية جميلة مع خلفية طبيعية (بحر/سماء/زرع)
 * قابلة للمشاركة والتنزيل
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  ScrollView, Alert, Platform, Animated, Share, Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { useSettings } from '@/contexts/SettingsContext';
import { ScreenContainer } from '@/components/screen-container';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import * as Haptics from 'expo-haptics';
import { useRouter, Stack } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Daily Ayahs (7 آيات تتناوب) ────────────────────────────────────────────
const DAILY_AYAHS = [
  { arabic: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا', ref: 'الشرح ٥', trans: 'For indeed, with hardship will be ease.', surah: 94, ayah: 5 },
  { arabic: 'وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ', ref: 'الطلاق ٣', trans: 'And whoever relies upon Allah - then He is sufficient for him.', surah: 65, ayah: 3 },
  { arabic: 'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ', ref: 'البقرة ١٥٣', trans: 'Indeed, Allah is with the patient.', surah: 2, ayah: 153 },
  { arabic: 'وَهُوَ مَعَكُمْ أَيْنَ مَا كُنتُمْ', ref: 'الحديد ٤', trans: 'And He is with you wherever you are.', surah: 57, ayah: 4 },
  { arabic: 'فَاذْكُرُونِي أَذْكُرْكُمْ', ref: 'البقرة ١٥٢', trans: 'So remember Me; I will remember you.', surah: 2, ayah: 152 },
  { arabic: 'وَاللَّهُ يُحِبُّ الْمُحْسِنِينَ', ref: 'آل عمران ١٣٤', trans: 'And Allah loves the doers of good.', surah: 3, ayah: 134 },
  { arabic: 'إِنَّ اللَّهَ لَا يُضِيعُ أَجْرَ الْمُحْسِنِينَ', ref: 'التوبة ١٢٠', trans: 'Indeed, Allah does not allow to be lost the reward of the doers of good.', surah: 9, ayah: 120 },
];

// ─── Background image categories from Unsplash ───────────────────────────────
// Images are sourced from Unsplash (free, no API key required for direct access)
const BG_CATEGORIES = [
  {
    id: 'ocean',
    label: '🌊 بحر',
    images: [
      'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&q=80',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
      'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=800&q=80',
    ],
  },
  {
    id: 'sky',
    label: '🌅 سماء',
    images: [
      'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=800&q=80',
      'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=800&q=80',
      'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=800&q=80',
    ],
  },
  {
    id: 'nature',
    label: '🌿 طبيعة',
    images: [
      'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80',
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
      'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80',
    ],
  },
  {
    id: 'desert',
    label: '🏜️ صحراء',
    images: [
      'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=80',
      'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800&q=80',
      'https://images.unsplash.com/photo-1527754046865-bfaed5b2aa2f?w=800&q=80',
    ],
  },
  {
    id: 'mosque',
    label: '🕌 مسجد',
    images: [
      'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?w=800&q=80',
      'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?w=800&q=80',
      'https://images.unsplash.com/photo-1619608802079-d9c42e3d93fe?w=800&q=80',
    ],
  },
  {
    id: 'solid',
    label: '🎨 ألوان',
    images: ['#1a1a2e', '#1B5E20', '#0D47A1'],
  },
];

// ─── Card themes ──────────────────────────────────────────────────────────────
const CARD_STYLES = [
  { id: 'overlay_dark',  overlayColor: 'rgba(0,0,0,0.55)', textColor: '#FFFFFF', accentColor: '#F0C040' },
  { id: 'overlay_green', overlayColor: 'rgba(10,50,20,0.65)', textColor: '#E8F5E9', accentColor: '#A5D6A7' },
  { id: 'overlay_blue',  overlayColor: 'rgba(10,20,50,0.60)', textColor: '#E3F2FD', accentColor: '#90CAF9' },
  { id: 'overlay_warm',  overlayColor: 'rgba(60,20,5,0.60)', textColor: '#FFF8E1', accentColor: '#FFCC02' },
];

// ─── Ayah Image Card (off-screen for capture) ─────────────────────────────────
// ─── Uthmani font for Mushaf-style display ────────────────────────────────────
const UTHMANI_FONT = 'KFGQPCUthmanic';
const UTHMANI_FALLBACK = 'Amiri';

interface AyahCardProps {
  ayah: typeof DAILY_AYAHS[0];
  bgUrl: string;
  cardStyle: typeof CARD_STYLES[0];
  cardRef: React.RefObject<ViewShot>;
  showTranslation: boolean;
}

const toArabicNumeral = (n: number) => n.toString().replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);

const TEXT_SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.5)',
  textShadowOffset: { width: 0, height: 1 } as const,
  textShadowRadius: 3,
};

function AyahImageCard({ ayah, bgUrl, cardStyle, cardRef, showTranslation }: AyahCardProps) {
  const { Image: RNImage } = require('react-native');
  const isSolidBg = bgUrl.startsWith('#');
  const verseWithNumber = `${ayah.arabic} ﴿${toArabicNumeral(ayah.ayah)}﴾`;

  return (
    <ViewShot ref={cardRef} options={{ format: 'png', quality: 1.0, result: 'tmpfile' }}>
      <View style={{ width: 360, height: 640, overflow: 'hidden', position: 'relative', backgroundColor: isSolidBg ? bgUrl : '#000' }}>
        {/* Background image */}
        {!isSolidBg && (
          <RNImage
            source={{ uri: bgUrl }}
            style={{ width: '100%', height: '100%', position: 'absolute' }}
            resizeMode="cover"
          />
        )}
        {/* Color overlay */}
        <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: cardStyle.overlayColor }} />

        {/* Content */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
          {/* Surah name */}
          <Text style={{ fontSize: 15, color: cardStyle.accentColor, fontFamily: UTHMANI_FALLBACK, textAlign: 'center', marginBottom: 12, ...TEXT_SHADOW }}>
            سورة {ayah.ref.split(' ')[0]}
          </Text>

          {/* Ornamental top divider */}
          <Text style={{ fontSize: 20, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 14, letterSpacing: 6 }}>✦ ─── ✦</Text>

          {/* Arabic verse in Uthmani script with inline verse number */}
          <Text style={{ fontSize: 26, color: '#FFFFFF', textAlign: 'center', lineHeight: 50, fontFamily: UTHMANI_FONT, marginBottom: 14, writingDirection: 'rtl', ...TEXT_SHADOW }}>
            {verseWithNumber}
          </Text>

          {/* Ornamental bottom divider */}
          <Text style={{ fontSize: 20, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 14, letterSpacing: 6 }}>✦ ─── ✦</Text>

          {/* Ref badge */}
          <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>
            <Text style={{ color: '#FFFFFF', fontFamily: UTHMANI_FALLBACK, fontSize: 13, ...TEXT_SHADOW }}>﴿ {ayah.ref} ﴾</Text>
          </View>

          {/* Translation */}
          {showTranslation && (
            <Text style={{ color: '#FFFFFF', opacity: 0.85, fontSize: 12, textAlign: 'center', fontStyle: 'italic', paddingHorizontal: 10, direction: 'ltr', writingDirection: 'ltr', ...TEXT_SHADOW }}>
              {ayah.trans}
            </Text>
          )}
        </View>

        {/* Branding watermark */}
        <View style={{ position: 'absolute', bottom: 16, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <RNImage source={require('@/assets/images/App-icon.png')} style={{ width: 20, height: 20, borderRadius: 5 }} />
          <Text style={{ color: '#FFFFFF', opacity: 0.6, fontSize: 11, fontWeight: '600', ...TEXT_SHADOW }}>
            روح المسلم
          </Text>
        </View>
      </View>
    </ViewShot>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function DailyAyahVideoScreen() {
  const colors = useColors();
  const { isDarkMode } = useSettings();
  const router = useRouter();
  const cardRef = useRef<ViewShot>(null);

  const today = new Date();
  const dayIndex = today.getDay();
  const weekIndex = Math.floor(today.getDate() / 7);

  const [selectedAyahIdx, setSelectedAyahIdx] = useState(dayIndex % DAILY_AYAHS.length);
  const [selectedCat, setSelectedCat] = useState(BG_CATEGORIES[dayIndex % BG_CATEGORIES.length]);
  const [selectedBgIdx, setSelectedBgIdx] = useState(weekIndex % 3);
  const [selectedCardStyle, setSelectedCardStyle] = useState(CARD_STYLES[dayIndex % CARD_STYLES.length]);
  const [showTranslation, setShowTranslation] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [bgLoaded, setBgLoaded] = useState(false);



  const currentAyah = DAILY_AYAHS[selectedAyahIdx];
  const currentBg = selectedCat.images[selectedBgIdx];

  const pulseAnim = useRef(new Animated.Value(1)).current;



  // Navigate to ayah in Mushaf on long-press
  const handleLongPress = useCallback(() => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push(`/surah/${currentAyah.surah}?ayah=${currentAyah.ayah}` as any);
  }, [currentAyah, router]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.02, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleSaveImage = useCallback(async () => {
    if (!cardRef.current) return;
    setExporting(true);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1.0 });
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === 'granted') {
        await MediaLibrary.saveToLibraryAsync(uri);
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('✅ تم الحفظ', 'تم حفظ الصورة في معرض الصور بنجاح');
      } else {
        Alert.alert('تنبيه', 'يلزم إذن الوصول لمعرض الصور');
      }
    } catch {
      Alert.alert('خطأ', 'تعذر حفظ الصورة. تأكد من الأذونات وحاول مرة أخرى.');
    } finally {
      setExporting(false);
    }
  }, []);

  const handleShare = useCallback(async () => {
    if (!cardRef.current) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (Platform.OS === 'web') {
        await Share.share({
          message: `${currentAyah.arabic}\n\n﴿ ${currentAyah.ref} ﴾\n\n${currentAyah.trans}\n\n— القرآن الكريم`,
        });
        return;
      }
      const uri = await captureRef(cardRef, { format: 'png', quality: 1.0 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: `آية: ${currentAyah.ref}` });
      } else {
        await Share.share({ message: `${currentAyah.arabic}\n﴿ ${currentAyah.ref} ﴾` });
      }
    } catch {
      Alert.alert('خطأ', 'تعذر المشاركة');
    }
  }, [currentAyah]);

  const s = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    title: { fontSize: 20, fontWeight: '900', color: colors.text, marginBottom: 2 },
    subtitle: { fontSize: 13, color: colors.textLight },
    sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.textLight, textAlign: 'right', marginBottom: 8, marginTop: 4 },
    hScroll: { paddingHorizontal: 16 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(120,120,128,0.12)', borderWidth: 1, borderColor: colors.border, marginLeft: 8 },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 13, fontWeight: '700', color: colors.textLight },
    chipTextActive: { color: '#fff' },
    cardWrap: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16 },
    previewCard: { borderRadius: 20, overflow: 'hidden', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)' },
    actionsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginBottom: 16 },
    actionBtn: { flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
    actionBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
    styleRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12 },
    styleCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
    toggleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  });

  return (
    <>
    <Stack.Screen options={{ headerShown: false }} />
    <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={s.title}>✨ آية اليوم</Text>
          <Text style={s.subtitle}>شارك كلام الله مع أحبائك</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Background category selector */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <Text style={s.sectionLabel}>🖼️ خلفية الصورة</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.hScroll}>
          {BG_CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[s.chip, selectedCat.id === cat.id && s.chipActive]}
              onPress={() => { setSelectedCat(cat); setSelectedBgIdx(0); if (Platform.OS !== 'web') Haptics.selectionAsync(); }}
            >
              <Text style={[s.chipText, selectedCat.id === cat.id && s.chipTextActive]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* BG image variant picker */}
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 10 }}>
          {selectedCat.images.map((_, i) => (
            <TouchableOpacity
              key={i}
              style={[s.chip, { paddingHorizontal: 10 }, selectedBgIdx === i && s.chipActive]}
              onPress={() => { setSelectedBgIdx(i); if (Platform.OS !== 'web') Haptics.selectionAsync(); }}
            >
              <Text style={[s.chipText, selectedBgIdx === i && s.chipTextActive]}>#{i + 1}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Ayah selector */}
        <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
          <Text style={s.sectionLabel}>📖 اختر الآية</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.hScroll}>
          {DAILY_AYAHS.map((a, i) => (
            <TouchableOpacity
              key={i}
              style={[s.chip, selectedAyahIdx === i && s.chipActive, { maxWidth: 160 }]}
              onPress={() => { setSelectedAyahIdx(i); if (Platform.OS !== 'web') Haptics.selectionAsync(); }}
            >
              <Text style={[s.chipText, selectedAyahIdx === i && s.chipTextActive]} numberOfLines={1}>{a.ref}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Card style */}
        <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
          <Text style={s.sectionLabel}>🎨 نمط البطاقة</Text>
        </View>
        <View style={s.styleRow}>
          {CARD_STYLES.map((cs, i) => (
            <TouchableOpacity
              key={cs.id}
              style={[s.styleCircle, { backgroundColor: cs.overlayColor.replace('rgba', 'rgb').replace(/,[^,)]+\)/, ')'), borderColor: selectedCardStyle.id === cs.id ? colors.primary : colors.border }]}
              onPress={() => { setSelectedCardStyle(cs); if (Platform.OS !== 'web') Haptics.selectionAsync(); }}
            >
              {selectedCardStyle.id === cs.id && <Text style={{ fontSize: 14, color: '#fff', textAlign: 'center' }}>✓</Text>}
            </TouchableOpacity>
          ))}
          <View style={{ flex: 1 }} />
          {/* Translation toggle */}
          <TouchableOpacity
            style={[s.chip, showTranslation && s.chipActive]}
            onPress={() => setShowTranslation(v => !v)}
          >
            <Text style={[s.chipText, showTranslation && s.chipTextActive]}>🌐 ترجمة</Text>
          </TouchableOpacity>
        </View>

        {/* Preview Card */}
        <Animated.View style={[s.cardWrap, { transform: [{ scale: pulseAnim }] }]}>
          <TouchableOpacity
            style={s.previewCard}
            activeOpacity={0.9}
            onLongPress={handleLongPress}
            delayLongPress={500}
          >
            <AyahImageCard
              ayah={currentAyah}
              bgUrl={currentBg}
              cardStyle={selectedCardStyle}
              cardRef={cardRef}
              showTranslation={showTranslation}
            />
          </TouchableOpacity>
        </Animated.View>

        {/* Action buttons */}
        <View style={s.actionsRow}>
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: '#1B6B3A' }]}
            onPress={handleSaveImage}
            disabled={exporting}
          >
            {exporting
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                  <MaterialCommunityIcons name="download" size={18} color="#fff" />
                  <Text style={s.actionBtnText}>تنزيل</Text>
                </>
            }
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: '#2563EB' }]}
            onPress={handleShare}
            disabled={exporting}
          >
            <MaterialCommunityIcons name="share-variant" size={18} color="#fff" />
            <Text style={s.actionBtnText}>مشاركة</Text>
          </TouchableOpacity>
        </View>

        {/* Ayah text preview — Mushaf style */}
        <TouchableOpacity
          activeOpacity={0.85}
          onLongPress={handleLongPress}
          delayLongPress={500}
          style={{
            marginHorizontal: 16,
            padding: 20,
            backgroundColor: isDarkMode ? 'rgba(50,45,35,0.6)' : 'rgba(253,248,235,0.95)',
            borderRadius: 16,
            borderWidth: 1.5,
            borderColor: isDarkMode ? 'rgba(180,160,100,0.3)' : 'rgba(180,160,100,0.5)',
          }}
        >
          {/* Surah name */}
          <Text style={{ fontSize: 16, color: colors.primary, textAlign: 'center', fontFamily: UTHMANI_FALLBACK, marginBottom: 8 }}>
            سورة {currentAyah.ref.split(' ')[0]}
          </Text>

          {/* Ornamental divider */}
          <Text style={{ fontSize: 14, color: isDarkMode ? 'rgba(180,160,100,0.5)' : 'rgba(140,120,60,0.4)', textAlign: 'center', marginBottom: 10, letterSpacing: 4 }}>✦ ─────── ✦</Text>

          {/* Verse text with inline number */}
          <Text style={{ fontSize: 26, color: colors.text, textAlign: 'center', lineHeight: 50, fontFamily: UTHMANI_FONT, marginBottom: 10, writingDirection: 'rtl' }}>
            {currentAyah.arabic} ﴿{toArabicNumeral(currentAyah.ayah)}﴾
          </Text>

          {/* Ornamental divider */}
          <Text style={{ fontSize: 14, color: isDarkMode ? 'rgba(180,160,100,0.5)' : 'rgba(140,120,60,0.4)', textAlign: 'center', marginBottom: 8, letterSpacing: 4 }}>✦ ─────── ✦</Text>

          {/* Surah reference */}
          <Text style={{ fontSize: 14, color: colors.primary, textAlign: 'center', fontFamily: UTHMANI_FALLBACK }}>
            ﴿ {currentAyah.ref} ﴾
          </Text>

          <Text style={{ fontSize: 11, color: colors.textLight, textAlign: 'center', marginTop: 8, opacity: 0.6 }}>
            اضغط مطولاً للذهاب للآية في المصحف
          </Text>

          {/* Translation with proper direction */}
          {showTranslation && (
            <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: colors.border, direction: 'ltr' }}>
              <Text style={{ fontSize: 14, color: colors.textLight, textAlign: 'left', writingDirection: 'ltr', fontStyle: 'italic', lineHeight: 22 }}>
                {currentAyah.trans}
              </Text>
            </View>
          )}
        </TouchableOpacity>

      </ScrollView>
    </ScreenContainer>
    </>
  );
}
