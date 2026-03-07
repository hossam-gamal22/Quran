// app/(tabs)/prayer.tsx
// صفحة مواقيت الصلاة الرئيسية - روح المسلم

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import QiblaScreen from './qibla';
import Animated, {
  FadeInDown,
} from 'react-native-reanimated';

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
import { useSettings, CalculationMethod } from '@/contexts/SettingsContext';
import { useAppConfig } from '@/lib/app-config-context';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { BannerAdComponent } from '@/components/ads/BannerAd';
import { GlassCard, GlassToggle } from '@/components/ui/GlassCard';

import PrayerCard from '@/components/ui/prayer/PrayerCard';
import PrayerList from '@/components/ui/prayer/PrayerList';
import CountdownTimer from '@/components/ui/prayer/CountdownTimer';

// ========================================
// ثوابت طرق الحساب
// ========================================

const PRAYER_METHODS: { value: CalculationMethod; label: string; subtitle: string }[] = [
  { value: 4, label: 'أم القرى', subtitle: 'مكة المكرمة' },
  { value: 3, label: 'رابطة العالم الإسلامي', subtitle: 'Muslim World League' },
  { value: 2, label: 'الجمعية الإسلامية لأمريكا الشمالية', subtitle: 'ISNA' },
  { value: 5, label: 'الهيئة المصرية', subtitle: 'Egyptian General Authority' },
  { value: 1, label: 'جامعة العلوم الإسلامية - كراتشي', subtitle: 'Karachi' },
  { value: 8, label: 'منطقة الخليج', subtitle: 'Gulf Region' },
  { value: 9, label: 'الكويت', subtitle: 'Kuwait' },
  { value: 13, label: 'تركيا', subtitle: 'Diyanet' },
  { value: 15, label: 'ماليزيا', subtitle: 'JAKIM' },
];

const ASR_METHODS = [
  { value: 0, label: 'حنفي', subtitle: 'ظل المثلين' },
  { value: 1, label: 'شافعي / حنبلي / مالكي', subtitle: 'ظل المثل' },
];

// ========================================
// المكون الرئيسي
// ========================================

export default function PrayerScreen() {
  // استخدام الـ context بدل المتغيرات الثابتة
  const { isDarkMode, t, settings, updatePrayer } = useSettings();
  const { config } = useAppConfig();
  const language = settings.language;
  const router = useRouter();

  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [location, setLocation] = useState<LocationType | null>(null);
  const [prayerSettings, setPrayerSettings] = useState<PrayerSettings | null>(null);
  const [hijriDate, setHijriDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  // Read layout preference from global settings: 'list' | 'widget'
  const viewIsWidget = settings.prayer?.layout === 'widget';

  const prayerTopSegments = React.useMemo(() => {
    const defaults = {
      prayer: { label: 'الصلاة', icon: 'clock-time-four-outline' },
      qibla: { label: 'القبلة', icon: 'compass' },
    } as const;

    const byKey = new Map((config.uiCustomization?.prayerTopSegments || []).map((item) => [item.key, item]));

    return (['prayer', 'qibla'] as const).map((key) => {
      const item = byKey.get(key);
      const label = settings.language === 'ar'
        ? (item?.labelAr || defaults[key].label)
        : (item?.labelEn || item?.labelAr || defaults[key].label);

      const iconMode = item?.icon?.mode;
      const iconName = item?.icon?.name;
      const iconPng = item?.icon?.pngUrl;

      let icon = defaults[key].icon;
      if (iconMode === 'png' && iconPng) {
        icon = `img:${iconPng}`;
      } else if (iconMode === 'ionicons' && iconName) {
        icon = `ion:${iconName}`;
      } else if ((iconMode === 'material' || iconMode === 'sf') && iconName) {
        icon = iconName;
      }

      return { key, label, icon };
    });
  }, [config.uiCustomization?.prayerTopSegments, settings.language]);

  const prayerTopKeys = React.useMemo(() => prayerTopSegments.map((segment) => segment.key as 'prayer' | 'qibla'), [prayerTopSegments]);
  const prayerTopLabels = React.useMemo(() => prayerTopSegments.map((segment) => segment.label), [prayerTopSegments]);

  const prayerViewSegments = React.useMemo(() => {
    const defaults = {
      list: { label: 'قائمة', icon: 'format-list-text' },
      clock: { label: 'ساعة', icon: 'clock-outline' },
    } as const;

    const byKey = new Map((config.uiCustomization?.prayerViewSegments || []).map((item) => [item.key, item]));

    return (['list', 'clock'] as const).map((key) => {
      const item = byKey.get(key);
      const label = settings.language === 'ar'
        ? (item?.labelAr || defaults[key].label)
        : (item?.labelEn || item?.labelAr || defaults[key].label);

      const iconMode = item?.icon?.mode;
      const iconName = item?.icon?.name;
      const iconPng = item?.icon?.pngUrl;

      let icon = defaults[key].icon;
      if (iconMode === 'png' && iconPng) {
        icon = `img:${iconPng}`;
      } else if (iconMode === 'ionicons' && iconName) {
        icon = `ion:${iconName}`;
      } else if ((iconMode === 'material' || iconMode === 'sf') && iconName) {
        icon = iconName;
      }

      return { key, label, icon };
    });
  }, [config.uiCustomization?.prayerViewSegments, settings.language]);

  const prayerViewKeys = React.useMemo(() => prayerViewSegments.map((segment) => segment.key as 'list' | 'clock'), [prayerViewSegments]);
  const prayerViewLabels = React.useMemo(() => prayerViewSegments.map((segment) => segment.label), [prayerViewSegments]);
  const [topSelectedKey, setTopSelectedKey] = useState<'prayer' | 'qibla'>('prayer');

  const prayerViewSelectedIndex = viewIsWidget
    ? Math.max(0, prayerViewKeys.indexOf('clock'))
    : Math.max(0, prayerViewKeys.indexOf('list'));
  const prayerTopSelectedIndex = Math.max(0, prayerTopKeys.indexOf(topSelectedKey));

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

  // ======= Qibla helpers (compact preview uses these) =======
  const KAABA_LATITUDE = 21.4225;
  const KAABA_LONGITUDE = 39.8262;

  const calculateQiblaDirection = (latitude: number, longitude: number): number => {
    const lat1 = (latitude * Math.PI) / 180;
    const lat2 = (KAABA_LATITUDE * Math.PI) / 180;
    const lonDiff = ((KAABA_LONGITUDE - longitude) * Math.PI) / 180;

    const y = Math.sin(lonDiff);
    const x = Math.cos(lat1) * Math.tan(lat2) - Math.sin(lat1) * Math.cos(lonDiff);

    let qibla = (Math.atan2(y, x) * 180) / Math.PI;
    qibla = (qibla + 360) % 360;

    return qibla;
  };

  const calculateDistance = (latitude: number, longitude: number): number => {
    const R = 6371; // km
    const lat1 = (latitude * Math.PI) / 180;
    const lat2 = (KAABA_LATITUDE * Math.PI) / 180;
    const dLat = lat2 - lat1;
    const dLon = ((KAABA_LONGITUDE - longitude) * Math.PI) / 180;

    const a = Math.sin(dLat / 2) ** 2 + 
              Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  useFocusEffect(useCallback(() => {
    loadPrayerTimes();
    const hijri = getHijriDate();
    if (hijri) {
      setHijriDate(`${hijri.day} ${hijri.monthNameAr} ${hijri.year}`);
    }
  }, [])); // eslint-disable-line react-hooks/exhaustive-deps

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadPrayerTimes(true);
  }, []);

  // View mode is controlled via Settings (Prayer Screen Layout)

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
    setShowSettings(true);
  };

  const locationName = location
    ? `${location.city}${location.country ? `, ${location.country}` : ''}`
    : '';

  const inLastThird = prayerTimes ? isInLastThird(prayerTimes) : false;

  return (
    <BackgroundWrapper
      backgroundKey={settings.display.appBackground}
      backgroundUrl={settings.display.appBackgroundUrl}
      style={[styles.container, isDarkMode && styles.containerDark]}
    >
    <SafeAreaView
      style={{ flex: 1 }}
      edges={['top']}
    >
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
      />

      <Animated.View
        entering={FadeInDown.duration(500)}
        style={[styles.header, isDarkMode && styles.headerDark]}
      >
        {/* Left: worship tracker only (no bookmark per spec) */}
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => router.push('/worship-tracker?context=prayer' as any)}
            style={[styles.headerButton, isDarkMode && styles.headerButtonDark]}
          >
            <MaterialCommunityIcons name="chart-bar" size={22} color={isDarkMode ? '#fff' : '#333'} />
          </TouchableOpacity>
        </View>

        {/* Center: title + location — absolutely centered */}
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center' }}>
          <Text style={[styles.headerTitle, isDarkMode && styles.textLight]}>
            {t('prayer.title')}
          </Text>
          {locationName && (
            <View style={styles.locationBadge}>
              <MaterialCommunityIcons name="map-marker" size={14} color={isDarkMode ? '#aaa' : '#666'} />
              <Text style={[styles.locationText, isDarkMode && styles.textMuted]}>{locationName}</Text>
            </View>
          )}
        </View>

        {/* Right: settings */}
        <View style={[styles.headerRight, { flex: 1, justifyContent: 'flex-end' }]}>
          <TouchableOpacity
            onPress={openSettings}
            style={[styles.headerButton, isDarkMode && styles.headerButtonDark]}
          >
            <MaterialCommunityIcons name="cog-outline" size={22} color={isDarkMode ? '#fff' : '#333'} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <View style={styles.topNavTabsWrap}>
        <SegmentedControl
          values={prayerTopLabels}
          selectedIndex={prayerTopSelectedIndex}
          onChange={(event) => {
            const key = prayerTopKeys[event.nativeEvent.selectedSegmentIndex] || 'prayer';
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setTopSelectedKey(key);
          }}
          tintColor={Platform.OS === 'ios' ? '#2f7659' : undefined}
          backgroundColor={isDarkMode ? 'rgba(34,38,46,0.82)' : 'rgba(255,255,255,0.65)'}
          style={{ height: 44 }}
          fontStyle={{ fontFamily: 'Cairo-SemiBold', fontSize: 15, color: isDarkMode ? '#D1D5DB' : '#1F2937' }}
          activeFontStyle={{ fontFamily: 'Cairo-Bold', fontSize: 15, color: isDarkMode ? '#F9FAFB' : '#111827' }}
        />
      </View>

      {/* Qibla preview: hidden when top tab is Qibla (we show full Qibla view) */}
      {location && topSelectedKey !== 'qibla' && (
        <TouchableOpacity
          style={[styles.qiblaPreview, isDarkMode && styles.qiblaPreviewDark]}
          activeOpacity={0.85}
          onPress={() => router.push('/qibla')}
        >
          <View style={styles.qiblaPreviewLeft}>
            <MaterialCommunityIcons name="compass" size={28} color={isDarkMode ? '#fff' : '#111'} />
          </View>
          <View style={styles.qiblaPreviewBody}>
            <Text style={[styles.qiblaPreviewTitle, isDarkMode && styles.textLight]}>اتجاه القبلة</Text>
            <Text style={[styles.qiblaPreviewSubtitle, isDarkMode && styles.textMuted]}>
              {Math.round(calculateQiblaDirection(location.latitude, location.longitude))}° · {Math.round(calculateDistance(location.latitude, location.longitude))} كم
            </Text>
          </View>
        </TouchableOpacity>
      )}

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

        {/* View mode controlled by settings — toggle removed from main UI */}

        {topSelectedKey === 'qibla' ? (
          <Animated.View entering={FadeInDown.duration(300)}>
            <QiblaScreen />
          </Animated.View>
        ) : viewIsWidget ? (
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
        ) : (
          <Animated.View entering={FadeInDown.delay(100).duration(500)}>
            <PrayerCard
              prayerTimes={prayerTimes}
              hijriDate={hijriDate}
              location={locationName}
              language={language}
              isDarkMode={isDarkMode}
            />
          </Animated.View>
        )}

        {topSelectedKey !== 'qibla' && (
          <>
            {inLastThird && (
              <Animated.View
                entering={FadeInDown.delay(200).duration(500)}
                style={styles.lastThirdBanner}
              >
                <MaterialCommunityIcons name="star-crescent" size={20} color="#ffd700" />
                <Text style={styles.lastThirdText}>
                  {t('prayer.lastThirdMessage')}
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
                showSunrise={settings.prayer.showSunrise}
              />
            </Animated.View>

            {prayerTimes && (
              <Animated.View
                entering={FadeInDown.delay(400).duration(500)}
                style={[styles.extraInfo, isDarkMode && styles.extraInfoDark]}
              >
                <Text style={[styles.extraTitle, isDarkMode && styles.textLight]}>
                  {t('prayer.extraTimes')}
                </Text>

                <View style={styles.extraRow}>
                  <View style={styles.extraItem}>
                    <MaterialCommunityIcons
                      name="weather-night"
                      size={20}
                      color={isDarkMode ? '#aaa' : '#666'}
                    />
                    <Text style={[styles.extraLabel, isDarkMode && styles.textMuted]}>
                      {t('prayer.midnight')}
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
                      {t('prayer.lastThird')}
                    </Text>
                    <Text style={[styles.extraValue, isDarkMode && styles.textLight]}>
                      {formatTime12h(prayerTimes.lastThird)}
                    </Text>
                  </View>
                </View>
              </Animated.View>
            )}

            {/* Qibla Quick Access Button */}
            <Animated.View
              entering={FadeInDown.delay(500).duration(500)}
              style={styles.qiblaContainer}
            >
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/(tabs)/qibla' as any);
                }}
                activeOpacity={0.85}
                style={[styles.qiblaButton, isDarkMode && styles.qiblaButtonDark]}
              >
                <BlurView
                  intensity={Platform.OS === 'ios' ? 60 : 30}
                  tint={isDarkMode ? 'dark' : 'light'}
                  style={styles.qiblaButtonBlur}
                >
                  <View style={[styles.qiblaButtonContent, isDarkMode && styles.qiblaButtonContentDark]}>
                    <View style={styles.qiblaIconWrapper}>
                      <MaterialCommunityIcons name="compass" size={32} color="#5856D6" />
                    </View>
                    <View style={styles.qiblaTextWrapper}>
                      <Text style={[styles.qiblaTitle, isDarkMode && styles.textLight]}>
                        {t('prayer.qiblaDirection') || 'اتجاه القبلة'}
                      </Text>
                      <Text style={[styles.qiblaSubtitle, isDarkMode && styles.textMuted]}>
                        {t('prayer.qiblaSubtitle') || 'بوصلة تحديد اتجاه القبلة'}
                      </Text>
                    </View>
                    <MaterialCommunityIcons
                      name="chevron-left"
                      size={24}
                      color={isDarkMode ? '#8e8e93' : '#aaa'}
                    />
                  </View>
                </BlurView>
              </TouchableOpacity>
            </Animated.View>

            <View style={styles.bottomSpace} />
          </>
        )}
      </ScrollView>

      <BannerAdComponent screen="prayer" />

      {/* iOS Glass Segmented Toggle */}
      <View style={styles.toggleContainer}>
        <SegmentedControl
          values={prayerViewLabels}
          selectedIndex={prayerViewSelectedIndex}
          onChange={(event) => {
            const key = prayerViewKeys[event.nativeEvent.selectedSegmentIndex] || 'list';
            router.replace({
              pathname: '/(tabs)/prayer',
              params: { view: key },
            });
          }}
          tintColor={Platform.OS === 'ios' ? '#2f7659' : undefined}
          backgroundColor={isDarkMode ? 'rgba(34,38,46,0.82)' : 'rgba(255,255,255,0.65)'}
          style={{ height: 44 }}
          fontStyle={{ fontFamily: 'Cairo-SemiBold', fontSize: 15, color: isDarkMode ? '#D1D5DB' : '#1F2937' }}
          activeFontStyle={{ fontFamily: 'Cairo-Bold', fontSize: 15, color: isDarkMode ? '#F9FAFB' : '#111827' }}
        />
      </View>

      {/* نافذة إعدادات الصلاة */}
      <Modal
        visible={showSettings}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={settingsStyles.overlay}>
          <GlassCard style={settingsStyles.content}>
            <View style={settingsStyles.header}>
              <Text style={[settingsStyles.title, { color: isDarkMode ? '#fff' : '#333' }]}>إعدادات الصلاة</Text>
              <TouchableOpacity 
                onPress={() => setShowSettings(false)}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDarkMode ? 'rgba(120,120,128,0.24)' : 'rgba(120,120,128,0.12)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
              >
                <MaterialCommunityIcons name="close" size={18} color={isDarkMode ? '#fff' : '#333'} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* طريقة الحساب */}
              <Text style={[settingsStyles.sectionLabel, { color: isDarkMode ? '#8e8e93' : '#666' }]}>طريقة الحساب</Text>
              {PRAYER_METHODS.map((method) => (
                <TouchableOpacity
                  key={method.value}
                  style={[
                    settingsStyles.methodItem,
                    { backgroundColor: isDarkMode ? 'rgba(120,120,128,0.18)' : 'rgba(120,120,128,0.08)' },
                    settings.prayer.calculationMethod === method.value && { borderColor: '#2f7659', borderWidth: 2 },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    updatePrayer({ calculationMethod: method.value });
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[settingsStyles.methodLabel, { color: isDarkMode ? '#fff' : '#333' }]}>{method.label}</Text>
                    <Text style={[settingsStyles.methodSub, { color: isDarkMode ? '#8e8e93' : '#777' }]}>{method.subtitle}</Text>
                  </View>
                  {settings.prayer.calculationMethod === method.value && (
                    <MaterialCommunityIcons name="check-circle" size={22} color="#2f7659" />
                  )}
                </TouchableOpacity>
              ))}

              {/* مذهب العصر */}
              <Text style={[settingsStyles.sectionLabel, { color: isDarkMode ? '#8e8e93' : '#666', marginTop: 20 }]}>مذهب حساب العصر</Text>
              {ASR_METHODS.map((method) => (
                <TouchableOpacity
                  key={method.value}
                  style={[
                    settingsStyles.methodItem,
                    { backgroundColor: isDarkMode ? 'rgba(120,120,128,0.18)' : 'rgba(120,120,128,0.08)' },
                    settings.prayer.asrJuristic === method.value && { borderColor: '#2f7659', borderWidth: 2 },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    updatePrayer({ asrJuristic: method.value as 0 | 1 });
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[settingsStyles.methodLabel, { color: isDarkMode ? '#fff' : '#333' }]}>{method.label}</Text>
                    <Text style={[settingsStyles.methodSub, { color: isDarkMode ? '#8e8e93' : '#777' }]}>{method.subtitle}</Text>
                  </View>
                  {settings.prayer.asrJuristic === method.value && (
                    <MaterialCommunityIcons name="check-circle" size={22} color="#2f7659" />
                  )}
                </TouchableOpacity>
              ))}

              {/* خيارات العرض */}
              <Text style={[settingsStyles.sectionLabel, { color: isDarkMode ? '#8e8e93' : '#666', marginTop: 20 }]}>خيارات العرض</Text>
              <GlassToggle
                label="إظهار وقت الشروق"
                icon="weather-sunny"
                enabled={settings.prayer.showSunrise}
                onToggle={(val) => updatePrayer({ showSunrise: val })}
              />
              <GlassToggle
                label="تنسيق 24 ساعة"
                icon="clock-digital"
                enabled={settings.prayer.show24Hour}
                onToggle={(val) => updatePrayer({ show24Hour: val })}
              />

              <View style={{ height: 40 }} />
            </ScrollView>
          </GlassCard>
        </View>
      </Modal>
    </SafeAreaView>
    </BackgroundWrapper>
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
    backgroundColor: 'transparent',
  },
  headerDark: {
    backgroundColor: 'transparent',
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
  topNavTabsWrap: {
    paddingHorizontal: 16,
    paddingBottom: 8,
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
    backgroundColor: 'rgba(120,120,128,0.12)',
    borderRadius: 20,
  },
  extraInfoDark: {
    backgroundColor: 'rgba(120,120,128,0.18)',
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
    color: '#555',
  },
  extraValue: {
    fontSize: 16,
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  bottomSpace: {
    height: 100,
  },
  // Qibla Quick Access
  qiblaContainer: {
    marginHorizontal: 16,
    marginVertical: 10,
  },
  qiblaButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  qiblaButtonDark: {},
  qiblaButtonBlur: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  qiblaButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.06)',
    gap: 14,
  },
  qiblaButtonContentDark: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  qiblaIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(88,86,214,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qiblaTextWrapper: {
    flex: 1,
  },
  qiblaTitle: {
    fontSize: 17,
    fontFamily: 'Cairo-Bold',
    color: '#333',
    marginBottom: 2,
  },
  qiblaSubtitle: {
    fontSize: 13,
    fontFamily: 'Cairo-Regular',
    color: '#666',
  },
  // Glass Toggle
  toggleContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
});

const settingsStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderRadius: 0,
    height: '75%',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Cairo-Bold',
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: 'Cairo-Bold',
    marginBottom: 10,
    textAlign: 'right',
  },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  methodLabel: {
    fontSize: 15,
    fontFamily: 'Cairo-SemiBold',
    textAlign: 'right',
  },
  methodSub: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    textAlign: 'right',
    marginTop: 2,
  },
});
