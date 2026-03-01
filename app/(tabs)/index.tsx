import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  RefreshControl,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '../../constants/theme';
import { APP_CONFIG, APP_NAME } from '../../constants/app';
import { fetchPrayerTimesByCoords, getNextPrayer, formatTime, PRAYER_NAMES, getPrayerColor } from '../../lib/prayer-api';
import { Share } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// أيقونات الميزات
// ============================================

interface Feature {
  id: string;
  title: string;
  icon: string;
  color: string;
  route: string;
  description?: string;
}

const FEATURES: Feature[] = [
  { id: 'quran', title: 'القرآن الكريم', icon: 'book', color: '#059669', route: '/(tabs)/quran' },
  { id: 'azkar', title: 'الأذكار', icon: 'leaf', color: '#10B981', route: '/azkar/morning' },
  { id: 'prayer', title: 'مواقيت الصلاة', icon: 'time', color: '#0284C7', route: '/(tabs)/prayer' },
  { id: 'qibla', title: 'القبلة', icon: 'compass', color: '#6366F1', route: '/qibla' },
  { id: 'tasbih', title: 'التسبيح', icon: 'radio-button-on', color: '#8B5CF6', route: '/tasbih' },
  { id: 'names', title: 'أسماء الله', icon: 'sparkles', color: '#D4AF37', route: '/names' },
  { id: 'ruqyah', title: 'الرقية', icon: 'shield-checkmark', color: '#EF4444', route: '/ruqyah' },
  { id: 'hijri', title: 'التقويم', icon: 'calendar', color: '#F59E0B', route: '/hijri' },
];

// ============================================
// المكون الرئيسي
// ============================================

export default function HomeScreen() {
  const router = useRouter();
  
  // الحالات
  const [refreshing, setRefreshing] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [prayerTimes, setPrayerTimes] = useState<any>(null);
  const [nextPrayer, setNextPrayer] = useState<any>(null);
  const [hijriDate, setHijriDate] = useState<any>(null);
  const [location, setLocation] = useState<string>('');
  const [dailyVerse, setDailyVerse] = useState<{ text: string; surah: string; ayah: number } | null>(null);
  const [dailyZikr, setDailyZikr] = useState<{ text: string; source: string } | null>(null);
  
  // الأنيميشن
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // ============================================
  // تحميل البيانات
  // ============================================

  useEffect(() => {
    loadData();
    setGreetingMessage();
    
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

    // تحديث كل دقيقة
    const timer = setInterval(() => {
      if (prayerTimes) {
        setNextPrayer(getNextPrayer(prayerTimes.timings));
      }
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const setGreetingMessage = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting('صباح الخير');
    } else if (hour >= 12 && hour < 17) {
      setGreeting('مساء الخير');
    } else if (hour >= 17 && hour < 21) {
      setGreeting('مساء النور');
    } else {
      setGreeting('تصبح على خير');
    }
  };

  const loadData = async () => {
    try {
      // تحميل مواقيت الصلاة
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = loc.coords;
        
        const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
        setLocation(address?.city || address?.region || '');

        const data = await fetchPrayerTimesByCoords(latitude, longitude);
        setPrayerTimes(data);
        setNextPrayer(getNextPrayer(data.timings));
        setHijriDate(data.date.hijri);
      }

      // تحميل آية اليوم
      loadDailyVerse();
      
      // تحميل ذكر اليوم
      loadDailyZikr();

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const loadDailyVerse = async () => {
    // آيات مختارة
    const verses = [
      { text: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا', surah: 'الشرح', ayah: 6 },
      { text: 'وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ', surah: 'الطلاق', ayah: 3 },
      { text: 'فَاذْكُرُونِي أَذْكُرْكُمْ', surah: 'البقرة', ayah: 152 },
      { text: 'وَاصْبِرْ وَمَا صَبْرُكَ إِلَّا بِاللَّهِ', surah: 'النحل', ayah: 127 },
      { text: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً', surah: 'البقرة', ayah: 201 },
    ];
    
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    setDailyVerse(verses[dayOfYear % verses.length]);
  };

  const loadDailyZikr = async () => {
    const azkar = [
      { text: 'سُبْحَانَ اللهِ وَبِحَمْدِهِ، سُبْحَانَ اللهِ الْعَظِيمِ', source: 'متفق عليه' },
      { text: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ', source: 'متفق عليه' },
      { text: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ', source: 'رواه مسلم' },
      { text: 'أَسْتَغْفِرُ اللهَ الْعَظِيمَ وَأَتُوبُ إِلَيْهِ', source: 'رواه البخاري' },
      { text: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ', source: 'القرآن الكريم' },
    ];
    
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    setDailyZikr(azkar[dayOfYear % azkar.length]);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // ============================================
  // المشاركة
  // ============================================

  const shareApp = async () => {
    try {
      await Share.share({
        message: `${APP_CONFIG.getShareWithDownload()}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // ============================================
  // العرض
  // ============================================

  return (
    <View style={styles.container}>
      {/* الهيدر */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.appName}>{APP_NAME}</Text>
        </View>
        
        <TouchableOpacity onPress={shareApp} style={styles.shareButton}>
          <Ionicons name="share-social-outline" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* بطاقة الصلاة التالية */}
          {nextPrayer && (
            <TouchableOpacity 
              style={styles.nextPrayerCard}
              onPress={() => router.push('/(tabs)/prayer')}
            >
              <View style={styles.nextPrayerHeader}>
                <View>
                  <Text style={styles.nextPrayerLabel}>الصلاة القادمة</Text>
                  <Text style={styles.nextPrayerName}>
                    {PRAYER_NAMES[nextPrayer.name]?.ar || nextPrayer.name}
                  </Text>
                </View>
                <View style={styles.nextPrayerTimeContainer}>
                  <Text style={styles.nextPrayerTime}>
                    {formatTime(nextPrayer.time)}
                  </Text>
                  <Text style={styles.nextPrayerRemaining}>
                    {nextPrayer.remaining}
                  </Text>
                </View>
              </View>
              
              {/* التاريخ الهجري */}
              {hijriDate && (
                <View style={styles.hijriContainer}>
                  <Text style={styles.hijriText}>
                    {hijriDate.day} {hijriDate.month.ar} {hijriDate.year}هـ
                  </Text>
                  {location && (
                    <View style={styles.locationContainer}>
                      <Ionicons name="location" size={14} color="rgba(255,255,255,0.8)" />
                      <Text style={styles.locationText}>{location}</Text>
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* آية اليوم */}
          {dailyVerse && (
            <TouchableOpacity 
              style={styles.verseCard}
              onPress={() => router.push('/(tabs)/quran')}
              onLongPress={async () => {
                await Share.share({
                  message: `﴿ ${dailyVerse.text} ﴾\n📖 ${dailyVerse.surah} - آية ${dailyVerse.ayah}\n\n${APP_CONFIG.getShareSignature()}`,
                });
              }}
            >
              <View style={styles.verseHeader}>
                <Ionicons name="book" size={20} color={Colors.quranGreen} />
                <Text style={styles.verseLabel}>آية اليوم</Text>
              </View>
              <Text style={styles.verseText}>﴿ {dailyVerse.text} ﴾</Text>
              <Text style={styles.verseRef}>{dailyVerse.surah} - آية {dailyVerse.ayah}</Text>
            </TouchableOpacity>
          )}

          {/* ذكر اليوم */}
          {dailyZikr && (
            <TouchableOpacity 
              style={styles.zikrCard}
              onPress={() => router.push('/azkar/morning')}
              onLongPress={async () => {
                await Share.share({
                  message: `📿 ذكر اليوم\n\n「 ${dailyZikr.text} 」\n\n📚 ${dailyZikr.source}\n\n${APP_CONFIG.getShareSignature()}`,
                });
              }}
            >
              <View style={styles.zikrHeader}>
                <Ionicons name="leaf" size={20} color={Colors.success} />
                <Text style={styles.zikrLabel}>ذكر اليوم</Text>
              </View>
              <Text style={styles.zikrText}>{dailyZikr.text}</Text>
              <Text style={styles.zikrSource}>{dailyZikr.source}</Text>
            </TouchableOpacity>
          )}

          {/* الميزات */}
          <Text style={styles.sectionTitle}>الميزات</Text>
          <View style={styles.featuresGrid}>
            {FEATURES.map((feature) => (
              <TouchableOpacity
                key={feature.id}
                style={styles.featureItem}
                onPress={() => router.push(feature.route as any)}
              >
                <View style={[styles.featureIcon, { backgroundColor: feature.color + '15' }]}>
                  <Ionicons name={feature.icon as any} size={28} color={feature.color} />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* الأذكار السريعة */}
          <Text style={styles.sectionTitle}>الأذكار</Text>
          <View style={styles.azkarQuick}>
            <TouchableOpacity 
              style={[styles.azkarQuickItem, { backgroundColor: '#F59E0B' + '15' }]}
              onPress={() => router.push('/azkar/morning')}
            >
              <Ionicons name="sunny" size={24} color="#F59E0B" />
              <Text style={styles.azkarQuickText}>أذكار الصباح</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.azkarQuickItem, { backgroundColor: '#6366F1' + '15' }]}
              onPress={() => router.push('/azkar/evening')}
            >
              <Ionicons name="moon" size={24} color="#6366F1" />
              <Text style={styles.azkarQuickText}>أذكار المساء</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.azkarQuickItem, { backgroundColor: '#10B981' + '15' }]}
              onPress={() => router.push('/azkar/after-prayer')}
            >
              <Ionicons name="checkmark-done" size={24} color="#10B981" />
              <Text style={styles.azkarQuickText}>أذكار بعد الصلاة</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.azkarQuickItem, { backgroundColor: '#8B5CF6' + '15' }]}
              onPress={() => router.push('/azkar/sleep')}
            >
              <Ionicons name="bed" size={24} color="#8B5CF6" />
              <Text style={styles.azkarQuickText}>أذكار النوم</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 100 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ============================================
// الأنماط
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl + 20,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.surface,
    ...Shadows.sm,
  },
  headerLeft: {},
  greeting: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
  },
  appName: {
    fontSize: Typography.sizes.xxl,
    fontWeight: '700',
    color: Colors.primary,
  },
  shareButton: {
    padding: Spacing.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  nextPrayerCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    ...Shadows.lg,
  },
  nextPrayerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nextPrayerLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.white,
    opacity: 0.9,
  },
  nextPrayerName: {
    fontSize: Typography.sizes.xxl,
    fontWeight: '700',
    color: Colors.white,
    marginTop: 4,
  },
  nextPrayerTimeContainer: {
    alignItems: 'flex-end',
  },
  nextPrayerTime: {
    fontSize: Typography.sizes.xxl,
    fontWeight: '700',
    color: Colors.white,
  },
  nextPrayerRemaining: {
    fontSize: Typography.sizes.sm,
    color: Colors.white,
    opacity: 0.9,
    marginTop: 4,
  },
  hijriContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  hijriText: {
    fontSize: Typography.sizes.md,
    color: Colors.white,
    opacity: 0.9,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: Typography.sizes.sm,
    color: Colors.white,
    opacity: 0.8,
  },
  verseCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.quranGreen,
    ...Shadows.sm,
  },
  verseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  verseLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.quranGreen,
    fontWeight: '600',
  },
  verseText: {
    fontSize: Typography.sizes.xl,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 36,
    marginVertical: Spacing.md,
  },
  verseRef: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    textAlign: 'center',
  },
  zikrCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
    ...Shadows.sm,
  },
  zikrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  zikrLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.success,
    fontWeight: '600',
  },
  zikrText: {
    fontSize: Typography.sizes.lg,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 30,
    marginVertical: Spacing.sm,
  },
  zikrSource: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
    textAlign: 'right',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  featureItem: {
    width: (SCREEN_WIDTH - Spacing.md * 2 - Spacing.sm * 3) / 4,
    alignItems: 'center',
    padding: Spacing.sm,
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  featureTitle: {
    fontSize: Typography.sizes.xs,
    color: Colors.text,
    textAlign: 'center',
  },
  azkarQuick: {
    gap: Spacing.sm,
  },
  azkarQuickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  azkarQuickText: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
    fontWeight: '500',
  },
});
