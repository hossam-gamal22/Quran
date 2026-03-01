/**
 * Onboarding Screen — شاشة الترحيب
 * تظهر للمستخدم الجديد مرة واحدة فقط
 */

import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, FlatList, Animated, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { IconSymbol } from '@/components/ui/icon-symbol';

const { width: W, height: H } = Dimensions.get('window');
const ONBOARDING_KEY = '@onboarding_done_v1';

export async function isOnboardingDone(): Promise<boolean> {
  const val = await AsyncStorage.getItem(ONBOARDING_KEY);
  return val === 'true';
}
export async function markOnboardingDone(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
}

// ─── Slides data ──────────────────────────────────────────────────────────────
const SLIDES = [
  {
    id: '1',
    emoji: '☪️',
    bg: ['#0F2027', '#203A43', '#1B6B3A'],
    title: 'القرآن الكريم',
    subtitle: 'تطبيقك الإسلامي الشامل',
    desc: 'اقرأ القرآن الكريم، استمع للتلاوات، وابحث في آياته الكريمة بسهولة تامة',
    features: ['📖 114 سورة كاملة', '🎧 11 قارئاً مشهوراً', '🔍 بحث متقدم'],
  },
  {
    id: '2',
    emoji: '🕌',
    bg: ['#1a1a2e', '#16213e', '#0f3460'],
    title: 'أوقات الصلاة',
    subtitle: 'لا تفوت وقتاً واحداً',
    desc: 'أوقات الصلاة الدقيقة حسب موقعك مع إشعارات الأذان التلقائية',
    features: ['🔔 إشعارات الأذان', '🧭 اتجاه القبلة', '📍 GPS تلقائي'],
  },
  {
    id: '3',
    emoji: '📿',
    bg: ['#2d1b69', '#11998e', '#1B6B3A'],
    title: 'الأذكار والورد',
    subtitle: 'احرص على ذكر الله',
    desc: 'ورد صباحي ومسائي مكتمل، تسبيح رقمي، وتتبع ختمات القرآن',
    features: ['🌅 ورد صباحي', '🌇 ورد مسائي', '✅ تتبع الختمة'],
  },
  {
    id: '4',
    emoji: '⭐',
    bg: ['#78350F', '#92400E', '#B45309'],
    title: 'حفظ وتصدير',
    subtitle: 'شارك آيات القرآن',
    desc: 'احفظ آياتك المفضلة وصدّرها كصور جميلة لمشاركتها مع أحبائك',
    features: ['⭐ حفظ المفضلة', '🖼️ تصدير كصورة', '📤 مشاركة سهلة'],
  },
  {
    id: '5',
    emoji: '🌙',
    bg: ['#0F1A14', '#1B3A2F', '#1B6B3A'],
    title: 'جاهز للبدء؟',
    subtitle: 'بسم الله الرحمن الرحيم',
    desc: 'انضم إلى ملايين المسلمين الذين يستخدمون هذا التطبيق يومياً',
    features: ['🌙 وضع ليلي', '🗓️ تقويم هجري', '🔔 إشعارات ذكية'],
  },
];

type Slide = typeof SLIDES[0];

// ─── Slide Component ──────────────────────────────────────────────────────────
function SlideCard({ item }: { item: Slide }) {
  return (
    <View style={[sStyles.slide, { width: W }]}>
      {/* Background gradient effect */}
      <View style={[sStyles.bgGradient, { backgroundColor: item.bg[2] }]} />

      <View style={sStyles.content}>
        {/* Big Emoji */}
        <View style={sStyles.emojiWrap}>
          <Text style={sStyles.emoji}>{item.emoji}</Text>
          <View style={[sStyles.emojiGlow, { backgroundColor: item.bg[1] }]} />
        </View>

        {/* Title */}
        <Text style={sStyles.title}>{item.title}</Text>
        <Text style={sStyles.subtitle}>{item.subtitle}</Text>

        {/* Divider */}
        <View style={sStyles.divider} />

        {/* Description */}
        <Text style={sStyles.desc}>{item.desc}</Text>

        {/* Features */}
        <View style={sStyles.featuresWrap}>
          {item.features.map((f, i) => (
            <View key={i} style={sStyles.featurePill}>
              <Text style={sStyles.featureText}>{f}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const sStyles = StyleSheet.create({
  slide: { height: H, alignItems: 'center', justifyContent: 'center' },
  bgGradient: { ...StyleSheet.absoluteFillObject, opacity: 0.95 },
  content: { alignItems: 'center', paddingHorizontal: 32, zIndex: 1 },
  emojiWrap: { position: 'relative', marginBottom: 28, alignItems: 'center' },
  emoji: { fontSize: 80, textAlign: 'center' },
  emojiGlow: { position: 'absolute', width: 100, height: 100, borderRadius: 50, opacity: 0.2, top: -10, zIndex: -1 },
  title: { fontSize: 32, fontWeight: '900', color: '#FFFFFF', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 17, color: 'rgba(255,255,255,0.75)', textAlign: 'center', fontWeight: '600', marginBottom: 20 },
  divider: { width: 50, height: 2, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 1, marginBottom: 20 },
  desc: { fontSize: 16, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 28, marginBottom: 28 },
  featuresWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  featurePill: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  featureText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
});

// ─── Main Onboarding Screen ───────────────────────────────────────────────────
export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleFinish = async () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await markOnboardingDone();
    router.replace('/(tabs)/');
  };

  const handleNext = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = currentIndex + 1;
    if (next >= SLIDES.length) {
      handleFinish();
      return;
    }
    flatRef.current?.scrollToIndex({ index: next, animated: true });
    setCurrentIndex(next);
  };

  const handleSkip = async () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await markOnboardingDone();
    router.replace('/(tabs)/');
  };

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <View style={{ flex: 1, backgroundColor: '#0F1A14' }}>
      {/* Slides */}
      <FlatList
        ref={flatRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <SlideCard item={item} />}
        getItemLayout={(_, index) => ({ length: W, offset: W * index, index })}
      />

      {/* Bottom controls overlay */}
      <View style={styles.controls}>
        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => {
                flatRef.current?.scrollToIndex({ index: i, animated: true });
                setCurrentIndex(i);
              }}
            >
              <Animated.View style={[
                styles.dot,
                i === currentIndex ? styles.dotActive : styles.dotInactive,
              ]} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Buttons row */}
        <View style={styles.btnsRow}>
          {/* Skip */}
          {!isLast ? (
            <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
              <Text style={styles.skipText}>تخطي</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 80 }} />
          )}

          {/* Next / Start */}
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
              {isLast ? (
                <Text style={styles.nextText}>ابدأ الآن 🚀</Text>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.nextText}>التالي</Text>
                  <IconSymbol name="chevron.left" size={16} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    paddingHorizontal: 24,
    backgroundColor: 'transparent',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: { borderRadius: 10, height: 8 },
  dotActive: { width: 28, backgroundColor: '#ffffff' },
  dotInactive: { width: 8, backgroundColor: 'rgba(255,255,255,0.35)' },
  btnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    width: 80,
    alignItems: 'center',
  },
  skipText: { color: 'rgba(255,255,255,0.75)', fontWeight: '700', fontSize: 14 },
  nextBtn: {
    backgroundColor: '#1B6B3A',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#1B6B3A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  nextText: { color: '#ffffff', fontWeight: '900', fontSize: 16 },
});
