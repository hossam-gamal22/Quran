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
import { useSettings } from '@/contexts/SettingsContext';

import PrayerCard from '@/components/ui/prayer/PrayerCard';
import PrayerList from '@/components/ui/prayer/PrayerList';
import CountdownTimer from '@/components/ui/prayer/CountdownTimer';

export default function PrayerScreen() {
  // استخدام الـ context بدل المتغيرات الثابتة
  const { isDarkMode, t, settings } = useSettings();
  const language = settings.language;

  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [location, setLocation] = useState<LocationType | null>(null);
  const [prayerSettings, setPrayerSettings] = useState<PrayerSettings | null>(null);
  const [hijriDate, setHijriDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'circular'>('card');

  const fetchLocation = async (): Promise<LocationType | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        const stored = await getStoredLocation();
        if (stored) return stored;
        throw new Error(t('messages.locationPermission'));
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

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

      await saveLocation(locationData);
      return locationData;
    } catch (err) {
      console.error('Error fetching location:', err);
      const stored = await getStoredLocation();
      if (stored) return stored;

      return {
        latitude: 21.4225,
        longitude: 39.8262,
        city: 'مكة المكرمة',
        country: 'السعودية',
      };
    }
  };

  const loadPrayerTimes = async (forceRefresh = false) => {
    try {
      setError(null);
      
      const settings = await getPrayerSettings();
      setPrayerSettings(settings);

      const today = getTodayDateString();
      if (!forceRefresh) {
        const cached = await getCachedPrayerTimes(today);
        if (cached) {
          setPrayerTimes(cached);
          setIsLoading(false);
          return;
        }
      }

      const loc = await fetchLocation();
      setLocation(loc);

      if (!loc) {
        throw new Error(t('messages.locationRequired'));
      }

      const response = await fetchPrayerTimes(loc, new Date(), settings);
      let times = parsePrayerTimes(response);
      times = applyAdjustments(times, settings.adjustments);
      await cachePrayerTimes(today, times);

      setPrayerTimes(times);

      if (response.date?.hijri) {
        const { day, month, year } = response.date.hijri;
        setHijriDate(`${day} ${month.ar} ${year}`);
      }
    } catch (err: any) {
      console.error('Error loading prayer times:', err);
      setError(err.message || t('messages.error'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadPrayerTimes();
    const hijri = getHijriDate();
    if (hijri) {
      setHijriDate(hijri);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadPrayerTimes(true);
  }, []);

  const toggleViewMode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setViewMode(prev => prev === 'card' ? 'circular' : 'card');
  };

  const handleToggleNotification = async (prayer: PrayerName, enabled: boolean) => {
    if (!prayerSettings) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newSettings: PrayerSettings = {
      ...prayerSettings,
      notifications: {
        ...prayerSettings.notifications,
        [prayer]: enabled,
      },
    };

    setPrayerSettings(newSettings);
    await savePrayerSettings(newSettings);
  };

  const openSettings = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(t('common.settings'), t('prayer.settings'));
  };

  const locationName = location
    ? `${location.city}${location.country ? `, ${location.country}` : ''}`
    : '';

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

      <Animated.View
        entering={FadeInDown.duration(500)}
        style={[styles.header, isDarkMode && styles.headerDark]}
      >
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, isDarkMode && styles.textLight]}>
            {t('prayer.title')}
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
          <TouchableOpacity
            style={[styles.headerButton, isDarkMode && styles.headerButtonDark]}
            onPress={toggleViewMode}
          >
            <MaterialCommunityIcons
              name={viewMode === 'card' ? 'clock-outline' : 'card-text-outline'}
              size={24}
              color={isDarkMode ? '#fff' : '#333'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerButton, isDarkMode && styles.headerButtonDark]}
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
              <Text style={styles.retryText}>{t('common.retry')}</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

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

        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <PrayerList
            prayerTimes={prayerTimes}
            language={language}
            isDarkMode={isDarkMode}
            notificationSettings={prayerSettings?.notifications}
            onToggleNotification={handleToggleNotification}
            showNotificationToggle={true}
          />
        </Animated.View>

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

        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );
}

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
  headerDark: {
    backgroundColor: '#1a1a2e',
    borderBottomColor: '#333',
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
  headerButtonDark: {
    backgroundColor: '#252540',
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
