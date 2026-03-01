// app/(tabs)/index.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  RefreshControl,
  Dimensions,
  Share,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Colors, DarkColors, Spacing, BorderRadius, Shadows, Typography } from '../../constants/theme';
import { fetchPrayerTimesByCoords, getNextPrayer, formatTime, PRAYER_NAMES } from '../../lib/prayer-api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// إعدادات التطبيق من السيرفر
// ============================================

const API_BASE_URL = 'https://your-admin-panel-api.com'; // ← ضع رابط API الخاص بك

interface AppConfig {
  name: string;
  nameEn: string;
  description: string;
  version: string;
  primaryColor: string;
  contact: {
    email: string;
    website: string;
  };
  downloadLinks: {
    android: string;
    ios: string;
  };
}

// القيم الافتراضية (تُستخدم إذا فشل الاتصال بالسيرفر)
const DEFAULT_APP_CONFIG: AppConfig = {
  name: 'رُوح المسلم',
  nameEn: 'Rooh Al-Muslim',
  description: 'تطبيق إسلامي شامل للقرآن والأذكار والصلاة',
  version: '1.0.0',
  primaryColor: '#1B4332',
  contact: {
    email: 'hossamgamal290@gmail.com',
    website: '',
  },
  downloadLinks: {
    android: '',
    ios: '',
  },
};

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
// آيات مختارة
// ============================================

const DAILY_VERSES = [
  { text: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا', surah: 'الشرح', ayah: 6 },
  { text: 'وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ', surah: 'الطلاق', ayah: 3 },
  { text: 'فَاذْكُرُونِي أَذْكُرْكُمْ', surah: 'البقرة', ayah: 152 },
  { text: 'وَاصْبِرْ وَمَا صَبْرُكَ إِلَّا بِاللَّهِ', surah: 'النحل', ayah: 127 },
  { text: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً', surah: 'البقرة', ayah: 201 },
  { text: 'وَقُل رَّبِّ زِدْنِي عِلْمًا', surah: 'طه', ayah: 114 },
  { text: 'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ', surah: 'البقرة', ayah: 153 },
  { text: 'وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ', surah: 'هود', ayah: 88 },
  { text: 'رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي', surah: 'طه', ayah: 25 },
  { text: 'وَعَسَىٰ أَن تَكْرَهُوا شَيْئًا وَهُوَ خَيْرٌ لَّكُمْ', surah: 'البقرة', ayah: 216 },
];

// ============================================
// أذكار مختارة
// ============================================

const DAILY_AZKAR = [
  { text: 'سُبْحَانَ اللهِ وَبِحَمْدِهِ، سُبْحَانَ اللهِ الْعَظِيمِ', source: 'متفق عليه' },
  { text: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ', source: 'متفق عليه' },
  { text: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ', source: 'رواه مسلم' },
  { text: 'أَسْتَغْفِرُ اللهَ الْعَظِيمَ وَأَتُوبُ إِلَيْهِ', source: 'رواه البخاري' },
  { text: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ', source: 'القرآن الكريم' },
  { text: 'لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ', source: 'متفق عليه' },
  { text: 'سُبْحَانَ اللهِ وَالْحَمْدُ لِلَّهِ وَلَا إِلَهَ إِلَّا اللهُ وَاللهُ أَكْبَرُ', source: 'رواه مسلم' },
  { text: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ', source: 'رواه الترمذي' },
];

// ============================================
// المكون الرئيسي
// ============================================

export default function HomeScreen() {
  const router = useRouter();
  
  // ============================================
  // الحالات (States)
  // ============================================
  
  // إعدادات التطبيق من السيرفر
  const [appConfig, setAppConfig] = useState<AppConfig>(DEFAULT_APP_CONFIG);
  const [configLoading, setConfigLoading] = useState(true);
  
  // الوضع الداكن
  const [darkMode, setDarkMode] = useState(false);
  
  // حالات عامة
  const [refreshing, setRefreshing] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // مواقيت الصلاة
  const [prayerTimes, setPrayerTimes] = useState<any>(null);
  const [nextPrayer, setNextPrayer] = useState<any>(null);
  const [hijriDate, setHijriDate] = useState<any>(null);
  const [location, setLocation] = useState<string>('');
  
  // آية وذكر اليوم
  const [dailyVerse, setDailyVerse] = useState<{ text: string; surah: string; ayah: number } | null>(null);
  const [dailyZikr, setDailyZikr] = useState<{ text: string; source: string } | null>(null);
  
  // الأنيميشن
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // الألوان حسب الوضع
  const currentColors = darkMode ? DarkColors : Colors;

  // ============================================
  // جلب إعدادات التطبيق من السيرفر
  // ============================================

  const fetchAppConfig = useCallback(async () => {
    try {
      setConfigLoading(true);
      
      // أولاً: حاول جلب من السيرفر
      const response = await fetch(`${API_BASE_URL}/api/app-config`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // timeout بعد 5 ثواني
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // حفظ في AsyncStorage للاستخدام offline
        await AsyncStorage.setItem('remote_app_config', JSON.stringify(data));
        
        setAppConfig({
          ...DEFAULT_APP_CONFIG,
          ...data,
        });
        
        console.log('✅ تم جلب إعدادات التطبيق من السيرفر');
        return;
      }
    } catch (error) {
      console.log('⚠️ فشل الاتصال بالسيرفر، جاري استخدام النسخة المحفوظة...');
    }
    
    // ثانياً: حاول القراءة من AsyncStorage (النسخة المحفوظة)
    try {
      const cached = await AsyncStorage.getItem('remote_app_config');
      if (cached) {
        const data = JSON.parse(cached);
        setAppConfig({
          ...DEFAULT_APP_CONFIG,
          ...data,
        });
        console.log('✅ تم استخدام إعدادات التطبيق المحفوظة');
        return;
      }
    } catch (error) {
      console.log('⚠️ فشل قراءة الإعدادات المحفوظة');
    }
    
    // ثالثاً: استخدم القيم الافتراضية
    setAppConfig(DEFAULT_APP_CONFIG);
    console.log('ℹ️ تم استخدام الإعدادات الافتراضية');
    
    setConfigLoading(false);
  }, []);

  // ============================================
  // تحميل البيانات
  // ============================================

  useEffect(() => {
    initializeApp();
  }, []);

  // تحديث الصلاة التالية كل دقيقة
  useEffect(() => {
    const timer = setInterval(() => {
      if (prayerTimes) {
        setNextPrayer(getNextPrayer(prayerTimes.timings));
      }
    }, 60000);

    return () => clearInterval(timer);
  }, [prayerTimes]);

  const initializeApp = async () => {
    setIsLoading(true);
    
    // جلب إعدادات التطبيق من السيرفر
    await fetchAppConfig();
    
    // تحميل الإعدادات المحلية
    await loadSettings();
    
    // ضبط التحية
    setGreetingMessage();
    
    // تحميل البيانات
    await loadData();
    
    // بدء الأنيميشن
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
    
    setIsLoading(false);
  };

  const loadSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('app_settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        setDarkMode(parsed.darkMode ?? false);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

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
      await loadPrayerTimes();
      
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

  const loadPrayerTimes = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const { latitude, longitude } = loc.coords;
        
        // الحصول على اسم المدينة
        const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
        setLocation(address?.city || address?.region || address?.country || '');

        // جلب مواقيت الصلاة
        const data = await fetchPrayerTimesByCoords(latitude, longitude);
        if (data) {
          setPrayerTimes(data);
          setNextPrayer(getNextPrayer(data.timings));
          setHijriDate(data.date?.hijri);
        }
      }
    } catch (error) {
      console.error('Error loading prayer times:', error);
    }
  };

  const loadDailyVerse = () => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    setDailyVerse(DAILY_VERSES[dayOfYear % DAILY_VERSES.length]);
  };

  const loadDailyZikr = () => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    setDailyZikr(DAILY_AZKAR[dayOfYear % DAILY_AZKAR.length]);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAppConfig(); // تحديث إعدادات التطبيق
    loadData();
  }, [fetchAppConfig]);

  // ============================================
  // المشاركة
  // ============================================

  const getShareSignature = () => {
    return `\n\n📱 تطبيق ${appConfig.name}`;
  };

  const getShareWithDownload = () => {
    let signature = `\n\n📱 تطبيق ${appConfig.name}`;
    if (appConfig.downloadLinks.android) {
      signature += `\n📥 حمّل التطبيق: ${appConfig.downloadLinks.android}`;
    }
    return signature;
  };

  const shareApp = async () => {
    try {
      await Share.share({
        message: `${appConfig.description}${getShareWithDownload()}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const shareVerse = async () => {
    if (!dailyVerse) return;
    try {
      await Share.share({
        message: `﴿ ${dailyVerse.text} ﴾\n📖 ${dailyVerse.surah} - آية ${dailyVerse.ayah}${getShareSignature()}`,
      });
    } catch (error) {
      console.error('Error sharing verse:', error);
    }
  };

  const shareZikr = async () => {
    if (!dailyZikr) return;
    try {
      await Share.share({
        message: `📿 ذكر اليوم\n\n「 ${dailyZikr.text} 」\n\n📚 ${dailyZikr.source}${getShareSignature()}`,
      });
    } catch (error) {
      console.error('Error sharing zikr:', error);
    }
  };

  // ============================================
  // شاشة التحميل
  // ============================================

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: currentColors.background }]}>
        <ActivityIndicator size="large" color={currentColors.primary} />
        <Text style={[styles.loadingText, { color: currentColors.textLight }]}>
          جاري التحميل...
        </Text>
      </View>
    );
  }

  // ============================================
  // العرض الرئيسي
  // ============================================

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      {/* الهيدر */}
      <View style={[styles.header, { backgroundColor: currentColors.surface }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.greeting, { color: currentColors.textLight }]}>{greeting}</Text>
          {/* ← هنا يُعرض اسم التطبيق من السيرفر */}
          <Text style={[styles.appName, { color: currentColors.primary }]}>
            {appConfig.name}
          </Text>
        </View>
        
        <TouchableOpacity onPress={shareApp} style={styles.shareButton}>
          <Ionicons name="share-social-outline" size={24} color={currentColors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[currentColors.primary]}
            tintColor={currentColors.primary}
          />
        }
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          
          {/* بطاقة الصلاة التالية */}
          {nextPrayer && (
            <TouchableOpacity 
              style={[styles.nextPrayerCard, { backgroundColor: currentColors.primary }]}
              onPress={() => router.push('/(tabs)/prayer')}
              activeOpacity={0.8}
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
                  {nextPrayer.remaining && (
                    <Text style={styles.nextPrayerRemaining}>
                      {nextPrayer.remaining}
                    </Text>
                  )}
                </View>
              </View>
              
              {/* التاريخ الهجري والموقع */}
              {(hijriDate || location) && (
                <View style={styles.hijriContainer}>
                  {hijriDate && (
                    <Text style={styles.hijriText}>
                      {hijriDate.day} {hijriDate.month?.ar} {hijriDate.year}هـ
                    </Text>
                  )}
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

          {/* بطاقة بديلة إذا لم تتوفر مواقيت الصلاة */}
          {!nextPrayer && (
            <TouchableOpacity 
              style={[styles.nextPrayerCard, { backgroundColor: currentColors.primary }]}
              onPress={() => router.push('/(tabs)/prayer')}
              activeOpacity={0.8}
            >
              <View style={styles.noPrayerContainer}>
                <Ionicons name="time-outline" size={32} color="rgba(255,255,255,0.9)" />
                <Text style={styles.noPrayerText}>اضغط لعرض مواقيت الصلاة</Text>
                <Text style={styles.noPrayerSubtext}>يتطلب تفعيل الموقع</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* آية اليوم */}
          {dailyVerse && (
            <TouchableOpacity 
              style={[styles.verseCard, { backgroundColor: currentColors.surface }]}
              onPress={() => router.push('/(tabs)/quran')}
              onLongPress={shareVerse}
              activeOpacity={0.8}
            >
              <View style={styles.verseHeader}>
                <Ionicons name="book" size={20} color={Colors.quranGreen} />
                <Text style={[styles.verseLabel, { color: Colors.quranGreen }]}>آية اليوم</Text>
                <TouchableOpacity onPress={shareVerse} style={styles.shareIconButton}>
                  <Ionicons name="share-outline" size={18} color={currentColors.textLight} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.verseText, { color: currentColors.text }]}>
                ﴿ {dailyVerse.text} ﴾
              </Text>
              <Text style={[styles.verseRef, { color: currentColors.textLight }]}>
                {dailyVerse.surah} - آية {dailyVerse.ayah}
              </Text>
            </TouchableOpacity>
          )}

          {/* ذكر اليوم */}
          {dailyZikr && (
            <TouchableOpacity 
              style={[styles.zikrCard, { backgroundColor: currentColors.surface }]}
              onPress={() => router.push('/azkar/morning')}
              onLongPress={shareZikr}
              activeOpacity={0.8}
            >
              <View style={styles.zikrHeader}>
                <Ionicons name="leaf" size={20} color={Colors.success} />
                <Text style={[styles.zikrLabel, { color: Colors.success }]}>ذكر اليوم</Text>
                <TouchableOpacity onPress={shareZikr} style={styles.shareIconButton}>
                  <Ionicons name="share-outline" size={18} color={currentColors.textLight} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.zikrText, { color: currentColors.text }]}>
                {dailyZikr.text}
              </Text>
              <Text style={[styles.zikrSource, { color: currentColors.textLight }]}>
                {dailyZikr.source}
              </Text>
            </TouchableOpacity>
          )}

          {/* الميزات */}
          <Text style={[styles.sectionTitle, { color: currentColors.text }]}>الميزات</Text>
          <View style={styles.featuresGrid}>
            {FEATURES.map((feature) => (
              <TouchableOpacity
                key={feature.id}
                style={styles.featureItem}
                onPress={() => router.push(feature.route as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.featureIcon, { backgroundColor: feature.color + '15' }]}>
                  <Ionicons name={feature.icon as any} size={28} color={feature.color} />
                </View>
                <Text style={[styles.featureTitle, { color: currentColors.text }]}>
                  {feature.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* الأذكار السريعة */}
          <Text style={[styles.sectionTitle, { color: currentColors.text }]}>الأذكار</Text>
          <View style={styles.azkarQuick}>
            <TouchableOpacity 
              style={[styles.azkarQuickItem, { backgroundColor: '#F59E0B' + '15' }]}
              onPress={() => router.push('/azkar/morning')}
              activeOpacity={0.7}
            >
              <Ionicons name="sunny" size={24} color="#F59E0B" />
              <Text style={[styles.azkarQuickText, { color: currentColors.text }]}>
                أذكار الصباح
              </Text>
              <Ionicons name="chevron-back" size={20} color={currentColors.textLight} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.azkarQuickItem, { backgroundColor: '#6366F1' + '15' }]}
              onPress={() => router.push('/azkar/evening')}
              activeOpacity={0.7}
            >
              <Ionicons name="moon" size={24} color="#6366F1" />
              <Text style={[styles.azkarQuickText, { color: currentColors.text }]}>
                أذكار المساء
              </Text>
              <Ionicons name="chevron-back" size={20} color={currentColors.textLight} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.azkarQuickItem, { backgroundColor: '#10B981' + '15' }]}
              onPress={() => router.push('/azkar/after-prayer')}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-done" size={24} color="#10B981" />
              <Text style={[styles.azkarQuickText, { color: currentColors.text }]}>
                أذكار بعد الصلاة
              </Text>
              <Ionicons name="chevron-back" size={20} color={currentColors.textLight} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.azkarQuickItem, { backgroundColor: '#8B5CF6' + '15' }]}
              onPress={() => router.push('/azkar/sleep')}
              activeOpacity={0.7}
            >
              <Ionicons name="bed" size={24} color="#8B5CF6" />
              <Text style={[styles.azkarQuickText, { color: currentColors.text }]}>
                أذكار النوم
              </Text>
              <Ionicons name="chevron-back" size={20} color={currentColors.textLight} />
            </TouchableOpacity>
          </View>

          {/* معلومات التطبيق */}
          <View style={[styles.appInfoCard, { backgroundColor: currentColors.surface }]}>
            <Text style={[styles.appInfoName, { color: currentColors.primary }]}>
              {appConfig.name}
            </Text>
            <Text style={[styles.appInfoVersion, { color: currentColors.textLight }]}>
              الإصدار {appConfig.version}
            </Text>
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.sizes.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl + 20,
    paddingBottom: Spacing.md,
    ...Shadows.sm,
  },
  headerLeft: {},
  greeting: {
    fontSize: Typography.sizes.sm,
  },
  appName: {
    fontSize: Typography.sizes.xxl,
    fontWeight: '700',
  },
  shareButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  
  // بطاقة الصلاة التالية
  nextPrayerCard: {
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
  noPrayerContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  noPrayerText: {
    fontSize: Typography.sizes.lg,
    color: Colors.white,
    fontWeight: '600',
    marginTop: Spacing.sm,
  },
  noPrayerSubtext: {
    fontSize: Typography.sizes.sm,
    color: Colors.white,
    opacity: 0.8,
    marginTop: 4,
  },
  
  // بطاقة آية اليوم
  verseCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    borderRightWidth: 4,
    borderRightColor: Colors.quranGreen,
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
    fontWeight: '600',
    flex: 1,
  },
  shareIconButton: {
    padding: 4,
  },
  verseText: {
    fontSize: Typography.sizes.xl,
    textAlign: 'center',
    lineHeight: 36,
    marginVertical: Spacing.md,
    fontFamily: 'System',
  },
  verseRef: {
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
  },
  
  // بطاقة ذكر اليوم
  zikrCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    borderRightWidth: 4,
    borderRightColor: Colors.success,
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
    fontWeight: '600',
    flex: 1,
  },
  zikrText: {
    fontSize: Typography.sizes.lg,
    textAlign: 'center',
    lineHeight: 30,
    marginVertical: Spacing.sm,
  },
  zikrSource: {
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
  },
  
  // قسم الميزات
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
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
    textAlign: 'center',
  },
  
  // الأذكار السريعة
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
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  
  // معلومات التطبيق
  appInfoCard: {
    alignItems: 'center',
    padding: Spacing.lg,
    marginTop: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
  appInfoName: {
    fontSize: Typography.sizes.lg,
    fontWeight: '700',
  },
  appInfoVersion: {
    fontSize: Typography.sizes.xs,
    marginTop: 4,
  },
});
