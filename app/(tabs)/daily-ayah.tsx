/**
 * Daily Ayah Video — آية اليوم كفيديو
 * يُنشئ بطاقة آية يومية جميلة مع خلفية طبيعية (بحر/سماء/زرع)
 * قابلة للمشاركة والتنزيل
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  ScrollView, Alert, Platform, Animated, Share,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import * as Haptics from 'expo-haptics';

// ─── Daily Ayahs (7 آيات تتناوب) ────────────────────────────────────────────
const DAILY_AYAHS = [
  { arabic: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا', ref: 'الشرح ٥', trans: 'For indeed, with hardship will be ease.' },
  { arabic: 'وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ', ref: 'الطلاق ٣', trans: 'And whoever relies upon Allah - then He is sufficient for him.' },
  { arabic: 'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ', ref: 'البقرة ١٥٣', trans: 'Indeed, Allah is with the patient.' },
  { arabic: 'وَهُوَ مَعَكُمْ أَيْنَ مَا كُنتُمْ', ref: 'الحديد ٤', trans: 'And He is with you wherever you are.' },
  { arabic: 'فَاذْكُرُونِي أَذْكُرْكُمْ', ref: 'البقرة ١٥٢', trans: 'So remember Me; I will remember you.' },
  { arabic: 'وَاللَّهُ يُحِبُّ الْمُحْسِنِينَ', ref: 'آل عمران ١٣٤', trans: 'And Allah loves the doers of good.' },
  { arabic: 'إِنَّ اللَّهَ لَا يُضِيعُ أَجْرَ الْمُحْسِنِينَ', ref: 'التوبة ١٢٠', trans: 'Indeed, Allah does not allow to be lost the reward of the doers of good.' },
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
];

// ─── Card themes ──────────────────────────────────────────────────────────────
const CARD_STYLES = [
  { id: 'overlay_dark',  overlayColor: 'rgba(0,0,0,0.55)', textColor: '#FFFFFF', accentColor: '#F0C040' },
  { id: 'overlay_green', overlayColor: 'rgba(10,50,20,0.65)', textColor: '#E8F5E9', accentColor: '#A5D6A7' },
  { id: 'overlay_blue',  overlayColor: 'rgba(10,20,50,0.60)', textColor: '#E3F2FD', accentColor: '#90CAF9' },
  { id: 'overlay_warm',  overlayColor: 'rgba(60,20,5,0.60)', textColor: '#FFF8E1', accentColor: '#FFCC02' },
];

// ─── Ayah Image Card (off-screen for capture) ─────────────────────────────────
interface AyahCardProps {
  ayah: typeof DAILY_AYAHS[0];
  bgUrl: string;
  cardStyle: typeof CARD_STYLES[0];
  cardRef: React.RefObject<ViewShot>;
  showTranslation: boolean;
}

function AyahImageCard({ ayah, bgUrl, cardStyle, cardRef, showTranslation }: AyahCardProps) {
  const { Image: RNImage } = require('react-native');
  return (
    <ViewShot ref={cardRef} options={{ format: 'png', quality: 1.0 }}>
      <View style={{ width: 360, height: 480, borderRadius: 20, overflow: 'hidden', position: 'relative' }}>
        {/* Background image */}
        <RNImage
          source={{ uri: bgUrl }}
          style={{ width: '100%', height: '100%', position: 'absolute' }}
          resizeMode="cover"
        />
        {/* Color overlay */}
        <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: cardStyle.overlayColor }} />

        {/* Content */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
          {/* Top ornament */}
          <Text style={{ fontSize: 24, marginBottom: 12, opacity: 0.9 }}>☽</Text>

          {/* Bismillah */}
          <Text style={{ color: cardStyle.accentColor, fontSize: 14, fontWeight: '700', marginBottom: 16, opacity: 0.9 }}>
            بسم الله الرحمن الرحيم
          </Text>

          <View style={{ width: 50, height: 1.5, backgroundColor: cardStyle.accentColor, opacity: 0.6, marginBottom: 20, borderRadius: 1 }} />

          {/* Arabic */}
          <Text style={{ fontSize: 22, color: cardStyle.textColor, textAlign: 'center', lineHeight: 42, fontWeight: '600', marginBottom: 20 }}>
            {ayah.arabic}
          </Text>

          <View style={{ width: 50, height: 1.5, backgroundColor: cardStyle.accentColor, opacity: 0.6, marginBottom: 16, borderRadius: 1 }} />

          {/* Ref badge */}
          <View style={{ backgroundColor: `${cardStyle.accentColor}25`, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, borderWidth: 1, borderColor: `${cardStyle.accentColor}50`, marginBottom: 12 }}>
            <Text style={{ color: cardStyle.accentColor, fontWeight: '800', fontSize: 13 }}>﴿ {ayah.ref} ﴾</Text>
          </View>

          {/* Translation */}
          {showTranslation && (
            <Text style={{ color: cardStyle.textColor, opacity: 0.75, fontSize: 12, textAlign: 'center', fontStyle: 'italic', paddingHorizontal: 10 }}>
              {ayah.trans}
            </Text>
          )}

          {/* Bottom watermark */}
          <Text style={{ position: 'absolute', bottom: 12, color: cardStyle.accentColor, opacity: 0.5, fontSize: 11 }}>
            القرآن الكريم
          </Text>
        </View>
      </View>
    </ViewShot>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function DailyAyahVideoScreen() {
  const colors = useColors();
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
    header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: 'center' },
    title: { fontSize: 20, fontWeight: '900', color: colors.foreground, marginBottom: 2 },
    subtitle: { fontSize: 13, color: colors.muted },
    sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.muted, textAlign: 'right', marginBottom: 8, marginTop: 4 },
    hScroll: { paddingHorizontal: 16 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginLeft: 8 },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 13, fontWeight: '700', color: colors.muted },
    chipTextActive: { color: '#fff' },
    cardWrap: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16 },
    previewCard: { borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 12 },
    actionsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginBottom: 16 },
    actionBtn: { flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
    actionBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
    styleRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12 },
    styleCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 3 },
    toggleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  });

  return (
    <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>✨ آية اليوم</Text>
        <Text style={s.subtitle}>شارك كلام الله مع أحبائك</Text>
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
          <View style={s.previewCard}>
            <AyahImageCard
              ayah={currentAyah}
              bgUrl={currentBg}
              cardStyle={selectedCardStyle}
              cardRef={cardRef}
              showTranslation={showTranslation}
            />
          </View>
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
                  <IconSymbol name="arrow.down.circle.fill" size={18} color="#fff" />
                  <Text style={s.actionBtnText}>تنزيل</Text>
                </>
            }
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: '#2563EB' }]}
            onPress={handleShare}
            disabled={exporting}
          >
            <IconSymbol name="square.and.arrow.up" size={18} color="#fff" />
            <Text style={s.actionBtnText}>مشاركة</Text>
          </TouchableOpacity>
        </View>

        {/* Ayah text preview */}
        <View style={{ marginHorizontal: 16, padding: 16, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontSize: 18, color: colors.foreground, textAlign: 'right', lineHeight: 34, fontWeight: '600', marginBottom: 8 }}>
            {currentAyah.arabic}
          </Text>
          <Text style={{ fontSize: 13, color: colors.primary, textAlign: 'right', fontWeight: '700' }}>
            ﴿ {currentAyah.ref} ﴾
          </Text>
          {showTranslation && (
            <Text style={{ fontSize: 13, color: colors.muted, marginTop: 8, fontStyle: 'italic' }}>
              {currentAyah.trans}
            </Text>
          )}
        </View>

      </ScrollView>
    </ScreenContainer>
  );
}
