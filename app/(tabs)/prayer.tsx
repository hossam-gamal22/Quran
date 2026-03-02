// app/(tabs)/prayer.tsx
// صفحة مواقيت الصلاة الرئيسية - روح المسلم

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  PrayerTimes,
  PrayerName,
  PrayerSettings,
  Location as LocationType,
  fetchPrayerTimes,
  parsePrayerTimes,
  applyAdjustments,
  getPrayerSettings,
  savePrayerSettings,
  saveLocation,
  getStoredLocation,
  cachePrayerTimes,
  getCachedPrayerTimes,
  getTodayDateString,
  isInLastThird,
  formatTime12h,
} from '@/lib/prayer-times';
import { getHijriDate } from '@/lib/hijri-date';
import { t } from '@/data/translations';

import PrayerCard from '@/components/ui/prayer/PrayerCard';
import PrayerList from '@/components/ui/prayer/PrayerList';
import CountdownTimer from '@/components/ui/prayer/CountdownTimer';

// ========================================
// المكون الرئيسي
// ========================================

export default function PrayerScreen() {
  // الحالات
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [location, setLocation] = useState<LocationType | null>(null);
  const [settings, setSettings] = useState<PrayerSettings | null>(null);
  const [hijriDate, setHijriDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'circular'>('card');

  // إعدادات العرض
  const language = 'ar';
  const isDarkMode = false;

  // ========================================
  // تحميل البيانات
  // ========================================

  // جلب الموقع
  const fetchLocation = async (): Promise<LocationType | null> => {
    try {
      // التحقق من الإذن
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        // محاولة جلب الموقع المحفوظ
        const stored = await getStoredLocation();
        if (stored) return stored;
        
        throw new Error('لم يتم منح إذن الموقع');
      }

      // جلب الموقع الحالي
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // جلب اسم المدينة
      const [geocode] = await Location.reverseGeocodeAsync({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      const locationData: LocationType = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        city: geocode?.city || geocode?.subregion || '',
        country: geocode?.country || '',
      };

      // حفظ الموقع
      await saveLocation(locationData);

      return locationData;
    } catch (err) {
      console.error('Error fetching location:', err);
      
      // محاولة جلب الموقع المحفوظ
      const stored = await getStoredLocation();
      if (stored) return stored;

      // استخدام موقع افتراضي (مكة)
      return {
        latitude: 21.4225,
        longitude: 39.8262,
        city: 'مكة المكرمة',
        country: 'السعودية',
      };
    }
  };

  // جلب مواقيت الصلاة
  const loadPrayerTimes = async (forceRefresh = false) => {
    try {
      setError(null);
      
      // جلب الإعدادات
      const prayerSettings = await getPrayerSettings();
      setSettings(prayerSettings);

      // التحقق من الكاش أولاً
      const today = getTodayDateString();
      if (!forceRefresh) {
        const cached = await getCachedPrayerTimes(today);
        if (cached) {
          setPrayerTimes(cached);
          setIsLoading(false);
          return;
        }
      }

      // جلب الموقع
      const loc = await fetchLocation();
      setLocation(loc);

      if (!loc) {
        throw new Error('تعذر تحديد الموقع');
      }

      // جلب المواقيت من API
      const response = await fetchPrayerTimes(loc, new Date(), prayerSettings);
      let times = parsePrayerTimes(response);

      // تطبيق التعديلات
      times = applyAdjustments(times, prayerSettings.adjustments);

      // حفظ في الكاش
      await cachePrayerTimes(today, times);

      setPrayerTimes(times);

      // تحديث التاريخ الهجري
      if (response.date?.hijri) {
        const { day, month, year } = response.date.hijri;
        setHijriDate(`${day} ${month.ar} ${year}`);
      }
    } catch (err: any) {
      console.error('Error loading prayer times:', err);
      setError(err.message || 'حدث خطأ في جلب مواقيت الصلاة');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // التحميل الأولي
  useEffect(() => {
    loadPrayerTimes();

    // تحديث التاريخ الهجري
    const hijri = getHijriDate();
    if (hijri) {
      setHijriDate(hijri);
    }
  }, []);

  // السحب للتحديث
  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadPrayerTimes(true);
  }, []);

  // ========================================
  // معالجات الأحداث
  // ========================================

  // تبديل وضع العرض
  const toggleViewMode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setViewMode(prev => prev === 'card' ? 'circular' : 'card');
  };

  // تبديل إشعار صلاة
  const handleToggleNotification = async (prayer: PrayerName, enabled: boolean) => {
    if (!settings) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newSettings: PrayerSettings = {
      ...settings,
      notifications: {
        ...settings.notifications,
        [prayer]: enabled,
      },
    };

    setSettings(newSettings);
    await savePrayerSettings(newSettings);
  };

  // فتح الإعدادات
  const openSettings = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: فتح صفحة إعدادات الصلاة
    Alert.alert('قريباً', 'إعدادات مواقيت الصلاة قريباً');
  };

  // ========================================
  // العرض
  // ========================================

  // اسم المدينة للعرض
  const locationName = location
    ? `${location.city}${location.country ? `, ${location.country}` : ''}`
    : '';

  // هل نحن في الثلث الأخير؟
  const inLastThird = prayerTimes ? isInLastThird(prayerTimes) : false;

  return (
    <SafeAreaView
      style={[styles.container, isDarkMode && styles.containerDark]}
      edges={['top']}
    >
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#11151c' : '#fff'}
      />

      {/* الهيدر */}
      <Animated.View
        entering={FadeInDown.duration(500)}
        style={styles.header}
      >
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, isDarkMode && styles.textLight]}>
            {t('ui.nav.prayer', language)}
          </Text>
          {locationName && (
            <View style={styles.locationBadge}>
              <MaterialCommunityIcons
                name="map-marker"
                size={14}
                color={isDarkMode ? '#aaa' : '#666'}
              />
              <Text style={[styles.locationText, isDarkMode && styles.textMuted]}>
                {locationName}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.headerRight}>
          {/* زر تبديل العرض */}
          <TouchableOpacity
            style={styles.headerButton}
            onPress={toggleViewMode}
          >
            <MaterialCommunityIcons
              name={viewMode === 'card' ? 'clock-outline' : 'card-text-outline'}
              size={24}
              color={isDarkMode ? '#fff' : '#333'}
            />
          </TouchableOpacity>

          {/* زر الإعدادات */}
          <TouchableOpacity
            style={styles.headerButton}
            onPress={openSettings}
          >
            <MaterialCommunityIcons
              name="cog-outline"
              size={24}
              color={isDarkMode ? '#fff' : '#333'}
            />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#2f7659']}
            tintColor="#2f7659"
          />
        }
      >
        {/* رسالة الخطأ */}
        {error && (
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={styles.errorContainer}
          >
            <MaterialCommunityIcons name="alert-circle" size={24} color="#ef5350" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => loadPrayerTimes(true)}
            >
              <Text style={styles.retryText}>{t('ui.button.retry', language)}</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* كارت الصلاة القادمة أو المؤقت الدائري */}
        {viewMode === 'card' ? (
          <Animated.View entering={FadeInDown.delay(100).duration(500)}>
            <PrayerCard
              prayerTimes={prayerTimes}
              hijriDate={hijriDate}
              location={locationName}
              language={language}
              isDarkMode={isDarkMode}
            />
          </Animated.View>
        ) : (
          <Animated.View
            entering={FadeInDown.delay(100).duration(500)}
            style={styles.circularContainer}
          >
            <CountdownTimer
              prayerTimes={prayerTimes}
              language={language}
              isDarkMode={isDarkMode}
            />
          </Animated.View>
        )}

        {/* تنبيه الثلث الأخير */}
        {inLastThird && (
          <Animated.View
            entering={FadeInDown.delay(200).duration(500)}
            style={styles.lastThirdBanner}
          >
            <MaterialCommunityIcons name="star-crescent" size={20} color="#ffd700" />
            <Text style={styles.lastThirdText}>
              أنت الآن في الثلث الأخير من الليل - وقت استجابة الدعاء
            </Text>
          </Animated.View>
        )}

        {/* قائمة الصلوات */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <PrayerList
            prayerTimes={prayerTimes}
            language={language}
            isDarkMode={isDarkMode}
            notificationSettings={settings?.notifications}
            onToggleNotification={handleToggleNotification}
            showNotificationToggle={true}
          />
        </Animated.View>

        {/* معلومات إضافية */}
        {prayerTimes && (
          <Animated.View
            entering={FadeInDown.delay(400).duration(500)}
            style={[styles.extraInfo, isDarkMode && styles.extraInfoDark]}
          >
            <Text style={[styles.extraTitle, isDarkMode && styles.textLight]}>
              أوقات إضافية
            </Text>

            <View style={styles.extraRow}>
              <View style={styles.extraItem}>
                <MaterialCommunityIcons
                  name="weather-night"
                  size={20}
                  color={isDarkMode ? '#aaa' : '#666'}
                />
                <Text style={[styles.extraLabel, isDarkMode && styles.textMuted]}>
                  منتصف الليل
                </Text>
                <Text style={[styles.extraValue, isDarkMode && styles.textLight]}>
                  {formatTime12h(prayerTimes.midnight)}
                </Text>
              </View>

              <View style={styles.extraItem}>
                <MaterialCommunityIcons
                  name="star-crescent"
                  size={20}
                  color={isDarkMode ? '#aaa' : '#666'}
                />
                <Text style={[styles.extraLabel, isDarkMode && styles.textMuted]}>
                  الثلث الأخير
                </Text>
                <Text style={[styles.extraValue, isDarkMode && styles.textLight]}>
                  {formatTime12h(prayerTimes.lastThird)}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* مسافة في الأسفل */}
        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ========================================
// الأنماط
// ========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  containerDark: {
    backgroundColor: '#11151c',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  textLight: {
    color: '#fff',
  },
  textMuted: {
    color: '#999',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    fontSize: 13,
    fontFamily: 'Cairo-Regular',
    color: '#666',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 10,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    marginHorizontal: 16,
    marginVertical: 10,
    padding: 15,
    borderRadius: 12,
    gap: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Cairo-Medium',
    color: '#c62828',
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ef5350',
    borderRadius: 8,
  },
  retryText: {
    fontSize: 12,
    fontFamily: 'Cairo-SemiBold',
    color: '#fff',
  },
  circularContainer: {
    paddingVertical: 30,
  },
  lastThirdBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a237e',
    marginHorizontal: 16,
    marginVertical: 10,
    padding: 15,
    borderRadius: 12,
    gap: 10,
  },
  lastThirdText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Cairo-Medium',
    color: '#fff',
  },
  extraInfo: {
    marginHorizontal: 16,
    marginVertical: 10,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  extraInfoDark: {
    backgroundColor: '#1a1a2e',
  },
  extraTitle: {
    fontSize: 16,
    fontFamily: 'Cairo-Bold',
    color: '#333',
    marginBottom: 15,
  },
  extraRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  extraItem: {
    alignItems: 'center',
    gap: 5,
  },
  extraLabel: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    color: '#666',
  },
  extraValue: {
    fontSize: 16,
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  bottomSpace: {
    height: 100,
  },
});
