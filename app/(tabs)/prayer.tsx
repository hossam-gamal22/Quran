// app/(tabs)/prayer.tsx
// صفحة مواقيت الصلاة الرئيسية - روح المسلم

import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import QiblaScreen from './qibla';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
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
import { BlurView } from 'expo-blur';
import { IconSymbol } from '@/components/ui/icon-symbol';

import CountdownTimer from '@/components/ui/prayer/CountdownTimer';
import PrayerCard from '@/components/ui/prayer/PrayerCard';
import PrayerList from '@/components/ui/prayer/PrayerList';

// Placeholder components for the three clock views
const RectangleWidgetView = ({ nextPrayer, countdown }) => (
  <View style={styles.widgetContainer}>
    <Text style={styles.placeholderText}>[Rectangle Widget View]</Text>
  </View>
);
const AnalogClockView = ({ nextPrayer, countdown }) => (
  <View style={styles.widgetContainer}>
    <Text style={styles.placeholderText}>[Analog Clock View]</Text>
  </View>
);
const DigitalTypographyView = ({ nextPrayer, countdown }) => (
  <View style={styles.widgetContainer}>
    <Text style={styles.placeholderText}>[Digital Typography View]</Text>
  </View>
);

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

export default function PrayerScreen() {
  const { isDarkMode, t, settings, updatePrayer } = useSettings();
  const { config } = useAppConfig();
  const language = settings?.language || 'ar';
  const router = useRouter();

  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [location, setLocation] = useState<LocationType | null>(null);
  const [prayerSettings, setPrayerSettings] = useState<PrayerSettings | null>(null);
  const [hijriDate, setHijriDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Clock style state for tab bar
  const [activeClockStyle, setActiveClockStyle] = useState<'widget' | 'analog' | 'digital'>('widget');

  // Tab bar icons
  const clockTabs = [
    { key: 'widget', icon: 'rectangle.on.rectangle', label: 'Widget' },
    { key: 'analog', icon: 'clock', label: 'Analog' },
    { key: 'digital', icon: 'digitalcrown.arrow.clockwise', label: 'Digital' },
  ];

  // Reanimated shared values and layout state
  const indicatorX = useSharedValue(0);
  const indicatorW = useSharedValue(0);
  const [tabLayouts, setTabLayouts] = useState<Array<{ x: number; width: number }>>([]);
  const [layoutsReady, setLayoutsReady] = useState(false);
  const activeIndex = clockTabs.findIndex((t) => t.key === activeClockStyle);

  useEffect(() => {
    if (!layoutsReady || activeIndex < 0) return;
    const layout = tabLayouts[activeIndex];
    if (!layout) return;
    indicatorX.value = withSpring(layout.x, { damping: 18, stiffness: 220 });
    indicatorW.value = withSpring(layout.width, { damping: 18, stiffness: 220 });
  }, [activeIndex, layoutsReady, tabLayouts]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorW.value,
  }));

  const prayerTopSegments = useMemo(() => {
    const defaults = {
      prayer: { label: 'الصلاة', icon: 'clock-time-four-outline' },
      qibla: { label: 'القبلة', icon: 'compass' },
    } as const;

    const byKey = new Map((config?.uiCustomization?.prayerTopSegments || []).map((item: any) => [item.key, item]));

    return (['prayer', 'qibla'] as const).map((key) => {
      const item = byKey.get(key);
      const label = settings?.language === 'ar'
        ? (item?.labelAr || defaults[key].label)
        : (item?.labelEn || item?.labelAr || defaults[key].label);

      const iconMode = item?.icon?.mode;
      const iconName = item?.icon?.name;
      const iconPng = item?.icon?.pngUrl;

      let icon = defaults[key].icon;
      if (iconMode === 'png' && iconPng) icon = `img:${iconPng}`;
      else if (iconMode === 'ionicons' && iconName) icon = `ion:${iconName}`;
      else if ((iconMode === 'material' || iconMode === 'sf') && iconName) icon = iconName;

      return { key, label, icon };
    });
  }, [config?.uiCustomization?.prayerTopSegments, settings?.language]);

  const prayerTopKeys = useMemo(() => prayerTopSegments.map((segment) => segment.key as 'prayer' | 'qibla'), [prayerTopSegments]);
  const prayerTopLabels = useMemo(() => prayerTopSegments.map((segment) => segment.label), [prayerTopSegments]);

  const prayerViewSegments = useMemo(() => {
    const defaults = { list: { label: 'قائمة', icon: 'format-list-text' }, clock: { label: 'ساعة', icon: 'clock-outline' } } as const;
    const byKey = new Map((config?.uiCustomization?.prayerViewSegments || []).map((item: any) => [item.key, item]));
    return (['list', 'clock'] as const).map((key) => {
      const item = byKey.get(key);
      const label = settings?.language === 'ar'
        ? (item?.labelAr || defaults[key].label)
        : (item?.labelEn || item?.labelAr || defaults[key].label);

      const iconMode = item?.icon?.mode;
      const iconName = item?.icon?.name;
      const iconPng = item?.icon?.pngUrl;

      let icon = defaults[key].icon;
      if (iconMode === 'png' && iconPng) icon = `img:${iconPng}`;
      else if (iconMode === 'ionicons' && iconName) icon = `ion:${iconName}`;
      else if ((iconMode === 'material' || iconMode === 'sf') && iconName) icon = iconName;

      return { key, label, icon };
    });
  }, [config?.uiCustomization?.prayerViewSegments, settings?.language]);

  const prayerViewKeys = useMemo(() => prayerViewSegments.map((s) => s.key as 'list' | 'clock'), [prayerViewSegments]);
  const prayerViewLabels = useMemo(() => prayerViewSegments.map((s) => s.label), [prayerViewSegments]);

  const [topSelectedKey, setTopSelectedKey] = useState<'prayer' | 'qibla'>('prayer');

  const params = useLocalSearchParams() as { view?: string } | undefined;
  const viewIsWidget = useMemo(() => {
    if (params?.view) return params.view === 'clock';
    return settings?.prayer?.layout === 'clock' || settings?.prayer?.layout === 'widget';
  }, [params, settings?.prayer?.layout]);

  const prayerViewSelectedIndex = viewIsWidget ? Math.max(0, prayerViewKeys.indexOf('clock')) : Math.max(0, prayerViewKeys.indexOf('list'));
  const prayerTopSelectedIndex = Math.max(0, prayerTopKeys.indexOf(topSelectedKey));

  const fetchLocation = async (): Promise<LocationType | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        const stored = await getStoredLocation();
        if (stored) return stored;
        throw new Error(t('messages.locationPermission'));
      }

      const currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [geocode] = await Location.reverseGeocodeAsync({ latitude: currentLocation.coords.latitude, longitude: currentLocation.coords.longitude });

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
      return { latitude: 21.4225, longitude: 39.8262, city: 'مكة المكرمة', country: 'السعودية' };
    }
  };

  const loadPrayerTimes = async (forceRefresh = false) => {
    try {
      setError(null);
      const settingsFromStore = await getPrayerSettings();
      setPrayerSettings(settingsFromStore);

      const today = getTodayDateString();
      if (!forceRefresh) {
        const cached = await getCachedPrayerTimes(today);
        if (cached) {
          setPrayerTimes(cached);
          setIsLoading(false);
          return;
        }
      }

      const stylesLocal = StyleSheet.create({
        tabBarGlass: { borderRadius: 18, padding: 4, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.18)', alignSelf: 'center', minWidth: 200, maxWidth: 340 },
        tabBarRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', position: 'relative', minHeight: 48 },
        tabBarButton: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, zIndex: 2 },
        tabBarPill: { position: 'absolute', top: 2, bottom: 2, left: 0, borderRadius: 14, overflow: 'hidden' },
        tabBarPillInner: { flex: 1, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.10, shadowRadius: 4 },
        widgetContainer: { minHeight: 180, minWidth: 320, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', marginVertical: 18, padding: 18 },
        placeholderText: { color: '#fff', fontSize: 18, opacity: 0.7, fontFamily: 'Cairo-Bold' },
      });

      const loc = location || await fetchLocation();
      if (!loc) throw new Error(t('messages.locationRequired'));

      const response = await fetchPrayerTimes(loc, new Date(), settingsFromStore);
      let times = parsePrayerTimes(response);
      times = applyAdjustments(times, settingsFromStore.adjustments);
      await cachePrayerTimes(today, times);
      setPrayerTimes(times);

      if (response.date?.hijri) {
        const { day, month, year } = response.date.hijri;
        setHijriDate(`${day} ${month.ar} ${year}`);
      }
    } catch (err) {
      console.error('Error loading prayer times:', err);
      setError((err && (err as any).message) || t('messages.error'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => {
    loadPrayerTimes();
    const hijri = getHijriDate();
    if (hijri) setHijriDate(`${hijri.day} ${hijri.monthNameAr} ${hijri.year}`);
  }, []));

  const onRefresh = useCallback(() => { setIsRefreshing(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); loadPrayerTimes(true); }, []);

  const handleToggleNotification = async (prayer: PrayerName, enabled: boolean) => {
    if (!prayerSettings) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newSettings: PrayerSettings = { ...prayerSettings, notifications: { ...prayerSettings.notifications, [prayer]: enabled } };
    setPrayerSettings(newSettings);
    await savePrayerSettings(newSettings);
  };

  const openSettings = () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowSettings(true); };

  const locationName = location ? `${location.city}${location.country ? `, ${location.country}` : ''}` : '';
  const inLastThird = prayerTimes ? isInLastThird(prayerTimes) : false;

  return (
    <BackgroundWrapper backgroundKey={settings.display.appBackground} backgroundUrl={settings.display.appBackgroundUrl} style={[styles.container, isDarkMode && styles.containerDark]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor="transparent" />

        <Animated.View entering={FadeInDown.duration(500)} style={[styles.header, isDarkMode && styles.headerDark]}>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => router.push('/worship-tracker?context=prayer' as any)} style={[styles.headerButton, isDarkMode && styles.headerButtonDark]}>
              <MaterialCommunityIcons name="chart-bar" size={22} color={isDarkMode ? '#fff' : '#333'} />
            </TouchableOpacity>
          </View>

          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center' }}>
            <Text style={[styles.headerTitle, isDarkMode && styles.textLight]}>{t('prayer.title')}</Text>
            {locationName && (
              <View style={styles.locationBadge}>
                <MaterialCommunityIcons name="map-marker" size={14} color={isDarkMode ? '#aaa' : '#666'} />
                <Text style={[styles.locationText, isDarkMode && styles.textMuted]}>{locationName}</Text>
              </View>
            )}
          </View>

          <View style={[styles.headerRight, { flex: 1, justifyContent: 'flex-end' }]}>
            <TouchableOpacity onPress={openSettings} style={[styles.headerButton, isDarkMode && styles.headerButtonDark]}>
              <MaterialCommunityIcons name="cog-outline" size={22} color={isDarkMode ? '#fff' : '#333'} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        <View style={styles.topNavTabsWrap}>
          <SegmentedControl
            values={prayerTopLabels}
            selectedIndex={prayerTopSelectedIndex}
            onChange={(event) => { const key = prayerTopKeys[event.nativeEvent.selectedSegmentIndex] || 'prayer'; Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTopSelectedKey(key); }}
            tintColor={Platform.OS === 'ios' ? '#2f7659' : undefined}
            backgroundColor={isDarkMode ? 'rgba(34,38,46,0.82)' : 'rgba(255,255,255,0.65)'}
            style={{ height: 44 }}
            fontStyle={{ fontFamily: 'Cairo-SemiBold', fontSize: 15, color: isDarkMode ? '#D1D5DB' : '#1F2937' }}
            activeFontStyle={{ fontFamily: 'Cairo-Bold', fontSize: 15, color: isDarkMode ? '#F9FAFB' : '#111827' }}
          />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#2f7659']} tintColor="#2f7659" />}>
          {error && (
            <Animated.View entering={FadeInDown.duration(300)} style={styles.errorContainer}>
              <MaterialCommunityIcons name="alert-circle" size={24} color="#ef5350" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => loadPrayerTimes(true)}>
                <Text style={styles.retryText}>{t('common.retry')}</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {topSelectedKey === 'qibla' ? (
            <Animated.View entering={FadeInDown.duration(300)}>
              <QiblaScreen />
            </Animated.View>
          ) : viewIsWidget ? (
            <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.circularContainer}>
              <CountdownTimer prayerTimes={prayerTimes} language={language} isDarkMode={isDarkMode} />
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInDown.delay(100).duration(500)}>
              <PrayerCard prayerTimes={prayerTimes} hijriDate={hijriDate} location={locationName} language={language} isDarkMode={isDarkMode} />
            </Animated.View>
          )}

          {topSelectedKey !== 'qibla' && (
            <>
              {inLastThird && (
                <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.lastThirdBanner}>
                  <MaterialCommunityIcons name="star-crescent" size={20} color="#ffd700" />
                  <Text style={styles.lastThirdText}>{t('prayer.lastThirdMessage')}</Text>
                </Animated.View>
              )}

              <Animated.View entering={FadeInDown.delay(300).duration(500)}>
                <PrayerList prayerTimes={prayerTimes} language={language} isDarkMode={isDarkMode} notificationSettings={prayerSettings?.notifications} onToggleNotification={handleToggleNotification} showNotificationToggle showSunrise={settings.prayer.showSunrise} />
              </Animated.View>

              {prayerTimes && (
                <Animated.View entering={FadeInDown.delay(400).duration(500)} style={[styles.extraInfo, isDarkMode && styles.extraInfoDark]}>
                  <Text style={[styles.extraTitle, isDarkMode && styles.textLight]}>{t('prayer.extraTimes')}</Text>
                  <View style={styles.extraRow}>
                    <View style={styles.extraItem}>
                      <MaterialCommunityIcons name="weather-night" size={20} color={isDarkMode ? '#aaa' : '#666'} />
                      <Text style={[styles.extraLabel, isDarkMode && styles.textMuted]}>{t('prayer.midnight')}</Text>
                      <Text style={[styles.extraValue, isDarkMode && styles.textLight]}>{formatTime12h(prayerTimes.midnight)}</Text>
                    </View>
                    <View style={styles.extraItem}>
                      <MaterialCommunityIcons name="star-crescent" size={20} color={isDarkMode ? '#aaa' : '#666'} />
                      <Text style={[styles.extraLabel, isDarkMode && styles.textMuted]}>{t('prayer.lastThird')}</Text>
                      <Text style={[styles.extraValue, isDarkMode && styles.textLight]}>{formatTime12h(prayerTimes.lastThird)}</Text>
                    </View>
                  </View>
                </Animated.View>
              )}

              {/* Qibla button removed as requested */}

              <View style={styles.bottomSpace} />
            </>
          )}
        </ScrollView>

        <BannerAdComponent screen="prayer" />

        <View style={styles.toggleContainer}>
          <SegmentedControl values={prayerViewLabels} selectedIndex={prayerViewSelectedIndex} onChange={(event) => { const key = prayerViewKeys[event.nativeEvent.selectedSegmentIndex] || 'list'; router.replace({ pathname: '/(tabs)/prayer', params: { view: key } }); }} tintColor={Platform.OS === 'ios' ? '#2f7659' : undefined} backgroundColor={isDarkMode ? 'rgba(34,38,46,0.82)' : 'rgba(255,255,255,0.65)'} style={{ height: 44 }} fontStyle={{ fontFamily: 'Cairo-SemiBold', fontSize: 15, color: isDarkMode ? '#D1D5DB' : '#1F2937' }} activeFontStyle={{ fontFamily: 'Cairo-Bold', fontSize: 15, color: isDarkMode ? '#F9FAFB' : '#111827' }} />
        </View>

        <Modal visible={showSettings} animationType="slide" transparent onRequestClose={() => setShowSettings(false)}>
          <View style={settingsStyles.overlay}>
            <GlassCard style={settingsStyles.content}>
              <View style={settingsStyles.header}>
                <Text style={[settingsStyles.title, { color: isDarkMode ? '#fff' : '#333' }]}>إعدادات الصلاة</Text>
                <TouchableOpacity onPress={() => setShowSettings(false)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDarkMode ? 'rgba(120,120,128,0.24)' : 'rgba(120,120,128,0.12)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialCommunityIcons name="close" size={18} color={isDarkMode ? '#fff' : '#333'} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[settingsStyles.sectionLabel, { color: isDarkMode ? '#8e8e93' : '#666' }]}>طريقة الحساب</Text>
                {PRAYER_METHODS.map((method) => (
                  <TouchableOpacity key={method.value} style={[settingsStyles.methodItem, { backgroundColor: isDarkMode ? 'rgba(120,120,128,0.18)' : 'rgba(120,120,128,0.08)' }, settings.prayer.calculationMethod === method.value && { borderColor: '#2f7659', borderWidth: 2 }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); updatePrayer({ calculationMethod: method.value }); }}>
                    <View style={{ flex: 1 }}><Text style={[settingsStyles.methodLabel, { color: isDarkMode ? '#fff' : '#333' }]}>{method.label}</Text><Text style={[settingsStyles.methodSub, { color: isDarkMode ? '#8e8e93' : '#777' }]}>{method.subtitle}</Text></View>
                    {settings.prayer.calculationMethod === method.value && <MaterialCommunityIcons name="check-circle" size={22} color="#2f7659" />}
                  </TouchableOpacity>
                ))}

                <Text style={[settingsStyles.sectionLabel, { color: isDarkMode ? '#8e8e93' : '#666', marginTop: 20 }]}>مذهب حساب العصر</Text>
                {ASR_METHODS.map((method) => (
                  <TouchableOpacity key={method.value} style={[settingsStyles.methodItem, { backgroundColor: isDarkMode ? 'rgba(120,120,128,0.18)' : 'rgba(120,120,128,0.08)' }, settings.prayer.asrJuristic === method.value && { borderColor: '#2f7659', borderWidth: 2 }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); updatePrayer({ asrJuristic: method.value as 0 | 1 }); }}>
                    <View style={{ flex: 1 }}><Text style={[settingsStyles.methodLabel, { color: isDarkMode ? '#fff' : '#333' }]}>{method.label}</Text><Text style={[settingsStyles.methodSub, { color: isDarkMode ? '#8e8e93' : '#777' }]}>{method.subtitle}</Text></View>
                    {settings.prayer.asrJuristic === method.value && <MaterialCommunityIcons name="check-circle" size={22} color="#2f7659" />}
                  </TouchableOpacity>
                ))}

                <Text style={[settingsStyles.sectionLabel, { color: isDarkMode ? '#8e8e93' : '#666', marginTop: 20 }]}>خيارات العرض</Text>
                <GlassToggle label="إظهار وقت الشروق" icon="weather-sunny" enabled={settings.prayer.showSunrise} onToggle={(val) => updatePrayer({ showSunrise: val })} />
                <GlassToggle label="تنسيق 24 ساعة" icon="clock-digital" enabled={settings.prayer.show24Hour} onToggle={(val) => updatePrayer({ show24Hour: val })} />
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
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  containerDark: { backgroundColor: '#11151c' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: 'transparent' },
  headerDark: { backgroundColor: 'transparent' },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 24, fontFamily: 'Cairo-Bold', color: '#333' },
  textLight: { color: '#fff' },
  textMuted: { color: '#999' },
  locationBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  locationText: { fontSize: 13, fontFamily: 'Cairo-Regular', color: '#666' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
  headerButtonDark: { backgroundColor: '#252540' },
  scrollView: { flex: 1 },
  topNavTabsWrap: { paddingHorizontal: 16, paddingBottom: 8 },
  scrollContent: { paddingVertical: 10 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffebee', marginHorizontal: 16, marginVertical: 10, padding: 15, borderRadius: 12, gap: 10 },
  errorText: { flex: 1, fontSize: 14, fontFamily: 'Cairo-Medium', color: '#c62828' },
  retryButton: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#ef5350', borderRadius: 8 },
  retryText: { fontSize: 12, fontFamily: 'Cairo-SemiBold', color: '#fff' },
  circularContainer: { paddingVertical: 30 },
  lastThirdBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a237e', marginHorizontal: 16, marginVertical: 10, padding: 15, borderRadius: 12, gap: 10 },
  lastThirdText: { flex: 1, fontSize: 14, fontFamily: 'Cairo-Medium', color: '#fff' },
  extraInfo: { marginHorizontal: 16, marginVertical: 10, padding: 20, backgroundColor: 'rgba(120,120,128,0.12)', borderRadius: 20 },
  extraInfoDark: { backgroundColor: 'rgba(120,120,128,0.18)' },
  extraTitle: { fontSize: 16, fontFamily: 'Cairo-Bold', color: '#333', marginBottom: 15 },
  extraRow: { flexDirection: 'row', justifyContent: 'space-around' },
  extraItem: { alignItems: 'center', gap: 5 },
  extraLabel: { fontSize: 12, fontFamily: 'Cairo-Regular', color: '#555' },
  extraValue: { fontSize: 16, fontFamily: 'Cairo-Bold', color: '#333' },
  bottomSpace: { height: 100 },
  // Qibla button styles removed
  toggleContainer: { marginHorizontal: 16, marginBottom: 16 },
  widgetContainer: { minHeight: 180, minWidth: 320, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', marginVertical: 18, padding: 18 },
  placeholderText: { color: '#fff', fontSize: 18, opacity: 0.7, fontFamily: 'Cairo-Bold' },
});

const settingsStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  content: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderRadius: 0, height: '75%', padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 20, fontFamily: 'Cairo-Bold' },
  sectionLabel: { fontSize: 14, fontFamily: 'Cairo-Bold', marginBottom: 10, textAlign: 'right' },
  methodItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 8 },
  methodLabel: { fontSize: 15, fontFamily: 'Cairo-SemiBold', textAlign: 'right' },
  methodSub: { fontSize: 12, fontFamily: 'Cairo-Regular', textAlign: 'right', marginTop: 2 },
});
