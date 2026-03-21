// app/(tabs)/prayer.tsx
// صفحة مواقيت الصلاة الرئيسية - روح المسلم

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
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
  Image,
} from 'react-native';
import { fontBold, fontMedium, fontRegular, fontSemiBold } from '@/lib/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NativeTabs } from '../../components/ui/NativeTabs';
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
  formatPrayerTime,
} from '@/lib/prayer-times';
import { getHijriDate, getLocalizedHijriDate } from '@/lib/hijri-date';
import { useSettings, CalculationMethod } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
import { useAppConfig } from '@/lib/app-config-context';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { SectionInfoButton } from '@/components/ui/SectionInfoButton';
import { BannerAdComponent } from '@/components/ads/BannerAd';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { useSacredContext } from '@/hooks/use-sacred-context';
import { Spacing } from '@/constants/theme';
import { useAppIdentity } from '@/hooks/use-app-identity';
import { getDateLocale } from '@/lib/i18n';
import { GlassCard, GlassToggle } from '@/components/ui/GlassCard';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle, Line, G } from 'react-native-svg';
import { usePrayerTracker } from '@/contexts/WorshipContext';

import {
  startLiveActivity,
  updateLiveActivity,
  getLiveActivitySettings,
  saveLiveActivitySettings,
  endLiveActivity,
  areActivitiesEnabled,
  LiveActivityData,
  LIVE_ACTIVITY_STYLES,
} from '@/lib/live-activities';
import { getDuaOfTheDay } from '@/data/daily-duas';
import { getAyahOfTheDay } from '@/data/daily-ayahs';

import CountdownTimer from '@/components/ui/prayer/CountdownTimer';
import PrayerCard from '@/components/ui/prayer/PrayerCard';
import PrayerList from '@/components/ui/prayer/PrayerList';
import RectangleWidgetView from '@/components/ui/prayer/RectangleWidgetView';
import AnalogClockView from '@/components/ui/prayer/AnalogClockView';
import DigitalTypographyView from '@/components/ui/prayer/DigitalTypographyView';

const CLOCK_STYLE_KEY = '@prayer_clock_style';
const CLOCK_THUMB_SIZE = 72;

const getPrayerMethods = (t: (key: string) => string): { value: CalculationMethod; label: string; subtitle: string }[] => [
  { value: 4, label: t('prayer.methodUmmAlQura'), subtitle: t('prayer.methodUmmAlQuraDesc') },
  { value: 3, label: t('prayer.methodMuslimWorldLeague'), subtitle: t('prayer.methodMuslimWorldLeagueDesc') },
  { value: 2, label: t('prayer.methodIsna'), subtitle: t('prayer.methodIsnaDesc') },
  { value: 5, label: t('prayer.methodEgyptian'), subtitle: t('prayer.methodEgyptianDesc') },
  { value: 1, label: t('prayer.methodKarachi'), subtitle: t('prayer.methodKarachiDesc') },
  { value: 8, label: t('prayer.methodGulf'), subtitle: t('prayer.methodGulfDesc') },
  { value: 9, label: t('prayer.methodKuwait'), subtitle: t('prayer.methodKuwaitDesc') },
  { value: 13, label: t('prayer.methodTurkey'), subtitle: t('prayer.methodTurkeyDesc') },
  { value: 15, label: t('prayer.methodMalaysia'), subtitle: t('prayer.methodMalaysiaDesc') },
];

const getAsrMethods = (t: (key: string) => string) => [
  { value: 0, label: t('prayer.asrMethodHanafi'), subtitle: t('prayer.asrMethodHanafiDesc') },
  { value: 1, label: t('prayer.asrMethodShafii'), subtitle: t('prayer.asrMethodShafiiDesc') },
];

export default function PrayerScreen() {
  const { isDarkMode, t, settings, updatePrayer } = useSettings();
  const colors = useColors();
  const isRTL = useIsRTL();
  const { appName, iconSource, logoSource } = useAppIdentity();
  const { config } = useAppConfig();
  const language = settings?.language || 'ar';
  const router = useRouter();
  const { todayPrayer, updatePrayerWithTime, saveDayTimes } = usePrayerTracker();

  // Block all ads during prayer times viewing
  useSacredContext('prayer_time');

  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [location, setLocation] = useState<LocationType | null>(null);
  const [prayerSettings, setPrayerSettings] = useState<PrayerSettings | null>(null);
  const [hijriDate, setHijriDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showMethodPicker, setShowMethodPicker] = useState(false);
  const [showAsrPicker, setShowAsrPicker] = useState(false);

  // Live Activity state (iOS only)
  const [liveActivityEnabled, setLiveActivityEnabled] = useState(false);
  const [liveActivityStyle, setLiveActivityStyle] = useState<LiveActivityData['style']>('prayer_times');
  const [liveActivitySupported, setLiveActivitySupported] = useState(false);

  // Clock style state
  const [activeClockStyle, setActiveClockStyle] = useState<'widget' | 'analog' | 'digital'>('widget');

  const clockStyles: { key: 'widget' | 'analog' | 'digital'; label: string }[] = [
    { key: 'widget', label: t('prayer.clockStyleWidget') },
    { key: 'analog', label: t('prayer.clockStyleAnalog') },
    { key: 'digital', label: t('prayer.clockStyleDigital') },
  ];

  const PRAYER_METHODS = useMemo(() => getPrayerMethods(t), [t]);
  const ASR_METHODS = useMemo(() => getAsrMethods(t), [t]);

  // Persist clock style
  useEffect(() => {
    AsyncStorage.getItem(CLOCK_STYLE_KEY).then((val) => {
      if (val && ['widget', 'analog', 'digital'].includes(val)) {
        setActiveClockStyle(val as 'widget' | 'analog' | 'digital');
      }
    });
  }, []);

  const handleClockStyleChange = useCallback((styleKey: 'widget' | 'analog' | 'digital') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveClockStyle(styleKey);
    AsyncStorage.setItem(CLOCK_STYLE_KEY, styleKey).catch(() => {});
  }, []);

  const prayerTopSegments = useMemo(() => {
    const defaults = {
      prayer: { label: t('prayer.title'), icon: 'clock-time-four-outline' },
      qibla: { label: t('prayer.qibla'), icon: 'compass' },
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
      if (iconMode === 'png' && iconPng) icon = `img:${iconPng}` as any;
      else if (iconMode === 'ionicons' && iconName) icon = `ion:${iconName}` as any;
      else if ((iconMode === 'material' || iconMode === 'sf') && iconName) icon = iconName;

      return { key, label, icon };
    });
  }, [config?.uiCustomization?.prayerTopSegments, settings?.language]);

  const prayerTopKeys = useMemo(() => prayerTopSegments.map((segment) => segment.key as 'prayer' | 'qibla'), [prayerTopSegments]);
  const prayerTopLabels = useMemo(() => prayerTopSegments.map((segment) => segment.label), [prayerTopSegments]);

  const prayerViewSegments = useMemo(() => {
    const defaults: Record<string, { label: string; icon: string }> = {
      list: { label: t('prayer.viewList'), icon: 'format-list-text' },
      clock: { label: t('prayer.viewClock'), icon: 'clock-outline' },
    };

    const configured = config?.uiCustomization?.prayerViewSegments || [];
    if (configured.length > 0) {
      return configured.map((item: any) => {
        const key = item.key as string;
        const def = defaults[key] || { label: item?.labelAr || item?.labelEn || key, icon: item?.icon?.name || '' };
        const label = settings?.language === 'ar'
          ? (item?.labelAr || def.label)
          : (item?.labelEn || item?.labelAr || def.label);

        const iconMode = item?.icon?.mode;
        const iconName = item?.icon?.name;
        const iconPng = item?.icon?.pngUrl;

        let icon = def.icon;
        if (iconMode === 'png' && iconPng) icon = `img:${iconPng}`;
        else if (iconMode === 'ionicons' && iconName) icon = `ion:${iconName}`;
        else if ((iconMode === 'material' || iconMode === 'sf') && iconName) icon = iconName;

        return { key, label, icon };
      });
    }

    // Fallback to single 'list' view when none configured
    return [{ key: 'list', label: t('prayer.viewList'), icon: 'format-list-text' }];
  }, [config?.uiCustomization?.prayerViewSegments, settings?.language]);

  const prayerViewKeys = useMemo(() => prayerViewSegments.map((s) => s.key as string), [prayerViewSegments]);
  const prayerViewLabels = useMemo(() => prayerViewSegments.map((s) => s.label), [prayerViewSegments]);

  const [topSelectedKey, setTopSelectedKey] = useState<'prayer' | 'qibla'>('prayer');

  const params = useLocalSearchParams() as { view?: string; tab?: string } | undefined;

  // Auto-select tab when navigated with params - reset to prayer when no tab param
  useFocusEffect(
    useCallback(() => {
      if (params?.tab === 'qibla') {
        setTopSelectedKey('qibla');
      } else {
        setTopSelectedKey('prayer');
      }
    }, [params?.tab])
  );

  // Load Live Activity settings on mount
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    (async () => {
      const supported = await areActivitiesEnabled();
      setLiveActivitySupported(supported);
      const las = await getLiveActivitySettings();
      setLiveActivityEnabled(las.enabled);
      setLiveActivityStyle(las.style);
    })();
  }, []);

  const handleLiveActivityToggle = async (enabled: boolean) => {
    setLiveActivityEnabled(enabled);
    const newSettings = { enabled, style: liveActivityStyle };
    await saveLiveActivitySettings(newSettings);
    if (enabled && prayerTimes) {
      updatePrayerLiveActivity(prayerTimes);
    } else if (!enabled) {
      await endLiveActivity();
    }
  };

  const handleLiveActivityStyleChange = async (style: LiveActivityData['style']) => {
    setLiveActivityStyle(style);
    const newSettings = { enabled: liveActivityEnabled, style };
    await saveLiveActivitySettings(newSettings);
    if (liveActivityEnabled && prayerTimes) {
      updatePrayerLiveActivity(prayerTimes);
    }
  };

  const viewIsWidget = useMemo(() => {
    if (params?.view === 'next') return false; // Force list view to show next prayer
    if (params?.view) return params.view === 'clock';
    return (settings?.prayer?.layout as string) === 'clock' || settings?.prayer?.layout === 'widget';
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
      const lat = currentLocation.coords.latitude;
      const lon = currentLocation.coords.longitude;

      // Try locale-aware geocoding first
      let city = '';
      let country = '';
      try {
        const lang = language || 'ar';
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&format=json&accept-language=${encodeURIComponent(lang)}`,
          { headers: { 'User-Agent': 'RuhAlMuslim/1.0' } }
        );
        if (res.ok) {
          const data = await res.json();
          city = data?.address?.city || data?.address?.town || data?.address?.village || data?.address?.state || '';
          country = data?.address?.country || '';
        }
      } catch {}

      // Fallback to expo-location geocoding
      if (!city) {
        const [geocode] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
        city = geocode?.city || geocode?.subregion || '';
        country = geocode?.country || '';
      }

      const locationData: LocationType = {
        latitude: lat,
        longitude: lon,
        city,
        country,
      };

      await saveLocation(locationData);
      return locationData;
    } catch (err) {
      console.error('Error fetching location:', err);
      const stored = await getStoredLocation();
      if (stored) return stored;
      return { latitude: 21.4225, longitude: 39.8262, city: t('prayer.defaultCity'), country: t('prayer.defaultCountry') };
    }
  };

  // Helper: build Live Activity data and start/update
  const updatePrayerLiveActivity = async (times: PrayerTimes, hijri?: any) => {
    try {
      const laSettings = await getLiveActivitySettings();
      if (!laSettings.enabled) return;

      const prayerNames: { key: keyof PrayerTimes; name: string }[] = [
        { key: 'fajr', name: t('prayer.fajr') },
        { key: 'dhuhr', name: t('prayer.dhuhr') },
        { key: 'asr', name: t('prayer.asr') },
        { key: 'maghrib', name: t('prayer.maghrib') },
        { key: 'isha', name: t('prayer.isha') },
      ];

      const now = new Date();
      const allPrayers = prayerNames.map(p => {
        const [h, m] = (times[p.key] as string).split(':').map(Number);
        const pTime = new Date();
        pTime.setHours(h, m, 0, 0);
        return {
          name: p.name,
          nameAr: p.name,
          time: formatPrayerTime(times[p.key] as string, settings.prayer.show24Hour),
          passed: pTime < now,
        };
      });

      const nextPrayer = allPrayers.find(p => !p.passed) || allPrayers[allPrayers.length - 1];
      const [nh, nm] = nextPrayer.time ? nextPrayer.time.split(':').map(Number) : [0, 0];
      const nextTime = new Date();
      // Parse 12h time back for remaining calculation
      const nextKey = prayerNames.find(p => p.name === nextPrayer.nameAr)?.key;
      if (nextKey) {
        const [ph, pm] = (times[nextKey] as string).split(':').map(Number);
        nextTime.setHours(ph, pm, 0, 0);
      }
      const remainingMinutes = Math.max(0, Math.round((nextTime.getTime() - now.getTime()) / 60000));

      const hijriStr = hijri ? `${hijri.day} ${hijri.month?.ar || ''} ${hijri.year}` : '';

      const data: LiveActivityData = {
        nextPrayerName: nextPrayer.name,
        nextPrayerNameAr: nextPrayer.nameAr,
        nextPrayerTime: nextPrayer.time,
        timeRemainingMinutes: remainingMinutes,
        allPrayers,
        hijriDate: hijriStr,
        style: laSettings.style,
      };

      // Populate sunrise time
      if (times.sunrise) {
        data.sunriseTime = formatPrayerTime(times.sunrise, settings.prayer.show24Hour);
      }

      // Populate dua/ayah based on selected style
      if (laSettings.style === 'prayer_with_dua') {
        const dua = getDuaOfTheDay();
        data.duaText = dua.arabic;
      } else if (laSettings.style === 'prayer_with_ayah') {
        const ayah = getAyahOfTheDay();
        data.ayahText = ayah.arabic;
        data.ayahRef = ayah.ref;
      }

      // Try update first, if no active activity then start new one
      const updated = await updateLiveActivity(data);
      if (!updated) {
        await startLiveActivity(data);
      }
    } catch (e) {
      console.log('📍 Live Activity update error:', e);
    }
  };

  const loadPrayerTimes = async (forceRefresh = false) => {
    try {
      setError(null);
      const settingsFromStore = await getPrayerSettings();
      setPrayerSettings(settingsFromStore);

      const today = getTodayDateString();
      // Always load location for display
      let currentLoc: LocationType | null = location;
      if (!currentLoc) {
        const stored = await getStoredLocation();
        if (stored) {
          // Re-geocode stored coordinates with current language
          currentLoc = stored;
          try {
            const lang = language || 'ar';
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(stored.latitude)}&lon=${encodeURIComponent(stored.longitude)}&format=json&accept-language=${encodeURIComponent(lang)}`,
              { headers: { 'User-Agent': 'RuhAlMuslim/1.0' } }
            );
            if (res.ok) {
              const data = await res.json();
              const city = data?.address?.city || data?.address?.town || data?.address?.village || data?.address?.state || '';
              const country = data?.address?.country || '';
              if (city) {
                currentLoc = { ...stored, city, country };
                await saveLocation(currentLoc);
              }
            }
          } catch (e) {
            console.log('Re-geocode failed, using stored names:', e);
          }
          setLocation(currentLoc);
        }
      }

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
        placeholderText: { color: '#fff', fontSize: 18, opacity: 0.7, fontFamily: fontBold() },
      });

      const loc = currentLoc || await fetchLocation();
      if (!loc) throw new Error(t('messages.locationRequired'));
      setLocation(loc);

      const response = await fetchPrayerTimes(loc, new Date(), settingsFromStore);
      let times = parsePrayerTimes(response);
      times = applyAdjustments(times, settingsFromStore.adjustments);
      await cachePrayerTimes(today, times);
      setPrayerTimes(times);

      // Save scheduled times to worship tracker for historical Fajr tracking
      saveDayTimes(today, {
        fajr: times.fajr,
        dhuhr: times.dhuhr,
        asr: times.asr,
        maghrib: times.maghrib,
        isha: times.isha,
      });

      // Update Live Activity if enabled
      if (Platform.OS === 'ios') {
        updatePrayerLiveActivity(times, response.date?.hijri);
      }

      if (response.date?.hijri) {
        const localized = getLocalizedHijriDate();
        const ahSuffix = t('calendar.ahSuffix');
        setHijriDate(`${localized.day} ${localized.monthName} ${localized.year} ${ahSuffix}`);
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
    const hijri = getLocalizedHijriDate();
    const ahSuffix = t('calendar.ahSuffix');
    if (hijri) setHijriDate(`${hijri.day} ${hijri.monthName} ${hijri.year} ${ahSuffix}`);
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

  const gregorianDate = useMemo(() => {
    try {
      return new Date().toLocaleDateString(getDateLocale(), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return new Date().toLocaleDateString(getDateLocale(), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
  }, [language]);

  return (
    <BackgroundWrapper backgroundKey={settings.display.appBackground} backgroundUrl={settings.display.appBackgroundUrl} opacity={settings.display.backgroundOpacity ?? 1} style={[styles.container, isDarkMode && styles.containerDark]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

        {/* Header — same as tasbih */}
        <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4 }}>
            <TouchableOpacity onPress={() => router.push('/worship-tracker/prayer' as any)} style={styles.headerButton}>
              <MaterialCommunityIcons name="chart-bar" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center', flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'center', gap: 8 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{t('prayer.title')}</Text>
            <SectionInfoButton sectionKey="prayer" />
          </View>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4 }}>
            <TouchableOpacity onPress={openSettings} style={styles.headerButton}>
              <MaterialCommunityIcons name="cog-outline" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Date + Location row below header */}
        {(() => {
          const showDate = settings.prayer.showDate !== false;
          const showLoc = settings.prayer.showLocation !== false;
          const parts: string[] = [];
          if (showDate && gregorianDate) parts.push(gregorianDate);
          if (showDate && hijriDate) parts.push(hijriDate);
          if (showLoc && locationName) parts.push(locationName);
          if (parts.length === 0) return null;
          return (
            <View style={[styles.dateRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {parts.map((text, i) => (
                <React.Fragment key={i}>
                  <Text style={[styles.dateRowText, { color: colors.textLight }]}>{text}</Text>
                  {i < parts.length - 1 && <Text style={[styles.dateRowSep, { color: colors.textLight }]}>|</Text>}
                </React.Fragment>
              ))}
            </View>
          );
        })()}

        <View style={styles.topNavTabsWrap}>
          <NativeTabs
            tabs={prayerTopSegments.map(s => ({ key: s.key, label: s.label }))}
            selected={topSelectedKey}
            onSelect={(key) => setTopSelectedKey(key as 'prayer' | 'qibla')}
            indicatorColor="#22C55E"
          />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#22C55E']} tintColor="#22C55E" />}>
          {error && (
            <Animated.View entering={FadeInDown.duration(300)} style={[styles.errorContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
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
          ) : (
            <>
              {/* Clock style selector with thumbnails — always visible */}
              <View style={styles.clockStyleSelectorWrap}>
                <BlurView intensity={40} tint={isDarkMode ? 'dark' : 'light'} style={styles.clockStyleSelectorBlur}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={[styles.clockStyleSelectorScroll, { flexDirection: isRTL ? 'row-reverse' : 'row', flex: 1, justifyContent: 'flex-start' }]}
                  >
                    {clockStyles.map((style) => {
                      const isActive = activeClockStyle === style.key;
                      return (
                        <TouchableOpacity
                          key={style.key}
                          onPress={() => handleClockStyleChange(style.key)}
                          activeOpacity={0.7}
                          style={[
                            styles.clockStyleThumbnail,
                            isActive && styles.clockStyleThumbnailActive,
                          ]}
                        >
                          {/* Thumbnail preview */}
                          {style.key === 'widget' && (
                            <View style={styles.thumbWidgetContainer}>
                              <View style={[styles.thumbWidgetCard, { backgroundColor: isDarkMode ? '#1A1A2E' : 'rgba(0,0,0,0.06)' }]}>
                                <View style={[styles.thumbWidgetRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                  {/* Logo on left */}
                                  <View style={styles.thumbWidgetLogoSide}>
                                    <Image
                                      source={logoSource}
                                      style={styles.thumbWidgetLogo}
                                    />
                                    <Text style={styles.thumbWidgetAppName}>{appName}</Text>
                                  </View>
                                  {/* Countdown on right */}
                                  <View style={styles.thumbWidgetCountdownSide}>
                                    <Text style={[styles.thumbWidgetCountdown, { color: isDarkMode ? '#e0e0e0' : '#333' }]}>03:13</Text>
                                    <Text style={[styles.thumbWidgetPrayerLabel, { color: isDarkMode ? '#aaa' : '#666' }]}>{t('prayer.dhuhr')}</Text>
                                  </View>
                                </View>
                              </View>
                            </View>
                          )}
                          {style.key === 'analog' && (
                            <View style={styles.thumbAnalogContainer}>
                              <Svg width={CLOCK_THUMB_SIZE - 20} height={CLOCK_THUMB_SIZE - 20} viewBox="0 0 100 100">
                                <Circle cx="50" cy="50" r="45" stroke={isDarkMode ? '#888' : '#ccc'} strokeWidth="2" fill="transparent" />
                                {/* Hour markers */}
                                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => (
                                  <Line
                                    key={angle}
                                    x1={50 + 38 * Math.sin((angle * Math.PI) / 180)}
                                    y1={50 - 38 * Math.cos((angle * Math.PI) / 180)}
                                    x2={50 + 43 * Math.sin((angle * Math.PI) / 180)}
                                    y2={50 - 43 * Math.cos((angle * Math.PI) / 180)}
                                    stroke={isDarkMode ? '#aaa' : '#666'}
                                    strokeWidth={angle % 90 === 0 ? 2.5 : 1.5}
                                  />
                                ))}
                                {/* Hour hand */}
                                <Line x1="50" y1="50" x2="50" y2="24" stroke={isDarkMode ? '#fff' : '#333'} strokeWidth="3" strokeLinecap="round" />
                                {/* Minute hand */}
                                <Line x1="50" y1="50" x2="68" y2="35" stroke={isDarkMode ? '#ddd' : '#555'} strokeWidth="2" strokeLinecap="round" />
                                {/* Second hand */}
                                <Line x1="50" y1="50" x2="45" y2="18" stroke="#22C55E" strokeWidth="1" strokeLinecap="round" />
                                {/* Center dot */}
                                <Circle cx="50" cy="50" r="3" fill="#22C55E" />
                              </Svg>
                            </View>
                          )}
                          {style.key === 'digital' && (
                            <View style={styles.thumbDigitalContainer}>
                              <Text style={[styles.thumbDigitalTime, { color: colors.text }]}>05:23</Text>
                              <Text style={[styles.thumbDigitalLabel, { color: colors.textLight }]}>{t('prayer.fajr')}</Text>
                              <View style={styles.thumbDigitalSeparator} />
                              <MaterialCommunityIcons name="mosque" size={16} color="#22C55E" />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </BlurView>
              </View>

              {/* Clock view based on active style */}
              <Animated.View entering={FadeInDown.delay(100).duration(500)}>
                {activeClockStyle === 'widget' ? (
                  <RectangleWidgetView prayerTimes={prayerTimes} language={language} isDarkMode={isDarkMode} iconSource={iconSource} />
                ) : activeClockStyle === 'analog' ? (
                  <AnalogClockView prayerTimes={prayerTimes} language={language} isDarkMode={isDarkMode} show24Hour={settings.prayer.show24Hour} />
                ) : (
                  <DigitalTypographyView prayerTimes={prayerTimes} language={language} isDarkMode={isDarkMode} show24Hour={settings.prayer.show24Hour} />
                )}
              </Animated.View>
            </>
          )}

          {topSelectedKey !== 'qibla' && (
            <>
              {inLastThird && (
                <Animated.View entering={FadeInDown.delay(200).duration(500)} style={[styles.lastThirdBanner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <MaterialCommunityIcons name="star-crescent" size={20} color="#ffd700" />
                  <Text style={styles.lastThirdText}>{t('prayer.lastThirdMessage')}</Text>
                </Animated.View>
              )}

              <Animated.View entering={FadeInDown.delay(300).duration(500)}>
                <PrayerList prayerTimes={prayerTimes} language={language} isDarkMode={isDarkMode} notificationSettings={prayerSettings?.notifications} onToggleNotification={handleToggleNotification} showNotificationToggle showSunrise={settings.prayer.showSunrise} show24Hour={settings.prayer.show24Hour} prayerStatuses={(todayPrayer || undefined) as any} onPrayerStatusToggle={(prayer) => {
                  const key = prayer as 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
                  updatePrayerWithTime(key, todayPrayer?.[key] === 'prayed' ? 'none' : 'prayed', prayerTimes?.[key] || undefined);
                }} />
              </Animated.View>

              {prayerTimes && (
                <Animated.View entering={FadeInDown.delay(400).duration(500)} style={[styles.extraInfo, isDarkMode && styles.extraInfoDark]}>
                  <Text style={[styles.extraTitle, isDarkMode && styles.textLight, { textAlign: isRTL ? 'right' : 'left' }]}>{t('prayer.extraTimes')}</Text>
                  <View style={[styles.extraRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={styles.extraItem}>
                      <MaterialCommunityIcons name="weather-night" size={20} color={isDarkMode ? '#aaa' : '#666'} />
                      <Text style={[styles.extraLabel, isDarkMode && styles.textMuted]}>{t('prayer.midnight')}</Text>
                      <Text style={[styles.extraValue, isDarkMode && styles.textLight]}>{formatPrayerTime(prayerTimes.midnight, settings.prayer.show24Hour)}</Text>
                    </View>
                    <View style={styles.extraItem}>
                      <MaterialCommunityIcons name="star-crescent" size={20} color={isDarkMode ? '#aaa' : '#666'} />
                      <Text style={[styles.extraLabel, isDarkMode && styles.textMuted]}>{t('prayer.lastThird')}</Text>
                      <Text style={[styles.extraValue, isDarkMode && styles.textLight]}>{formatPrayerTime(prayerTimes.lastThird, settings.prayer.show24Hour)}</Text>
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



        <Modal visible={showSettings} animationType="slide" transparent onRequestClose={() => setShowSettings(false)}>
          <View style={settingsStyles.overlay}>
            <GlassCard style={settingsStyles.content}>
              <View style={[settingsStyles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={[settingsStyles.title, { color: colors.text }]}>{t('prayer.prayerSettingsTitle')}</Text>
                <TouchableOpacity onPress={() => setShowSettings(false)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(34, 197, 94, 0.15)', alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialCommunityIcons name="close" size={18} color={colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* طريقة الحساب — Dropdown */}
                <Text style={[settingsStyles.sectionLabel, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>{t('prayer.calculationMethod')}</Text>
                <TouchableOpacity
                  style={[settingsStyles.dropdownBtn, { backgroundColor: 'rgba(34, 197, 94, 0.08)', flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={() => setShowMethodPicker(prev => !prev)}
                >
                  <Text style={[settingsStyles.methodLabel, { color: colors.text, flex: 1, textAlign: isRTL ? 'right' : 'left' }]}>
                    {PRAYER_METHODS.find(m => m.value === settings.prayer.calculationMethod)?.label || t('prayer.choose')}
                  </Text>
                  <MaterialCommunityIcons name={showMethodPicker ? 'chevron-up' : 'chevron-down'} size={22} color={colors.textLight} />
                </TouchableOpacity>
                {showMethodPicker && (
                  <View style={[settingsStyles.dropdownList, { backgroundColor: isDarkMode ? 'rgba(30,30,35,0.95)' : 'rgba(255,255,255,0.95)' }]}>
                    {PRAYER_METHODS.map((method) => (
                      <TouchableOpacity key={method.value} style={[settingsStyles.dropdownItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }, settings.prayer.calculationMethod === method.value && { backgroundColor: 'rgba(6,79,47,0.12)' }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); updatePrayer({ calculationMethod: method.value }); setShowMethodPicker(false); }}>
                        <View style={{ flex: 1 }}><Text style={[settingsStyles.methodLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{method.label}</Text><Text style={[settingsStyles.methodSub, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>{method.subtitle}</Text></View>
                        {settings.prayer.calculationMethod === method.value && <MaterialCommunityIcons name="check" size={18} color="#22C55E" />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* مذهب العصر — Dropdown */}
                <Text style={[settingsStyles.sectionLabel, { color: colors.textLight, marginTop: 20, textAlign: isRTL ? 'right' : 'left' }]}>{t('prayer.asrMethod')}</Text>
                <TouchableOpacity
                  style={[settingsStyles.dropdownBtn, { backgroundColor: 'rgba(34, 197, 94, 0.08)', flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={() => setShowAsrPicker(prev => !prev)}
                >
                  <Text style={[settingsStyles.methodLabel, { color: colors.text, flex: 1, textAlign: isRTL ? 'right' : 'left' }]}>
                    {ASR_METHODS.find(m => m.value === settings.prayer.asrJuristic)?.label || t('prayer.choose')}
                  </Text>
                  <MaterialCommunityIcons name={showAsrPicker ? 'chevron-up' : 'chevron-down'} size={22} color={colors.textLight} />
                </TouchableOpacity>
                {showAsrPicker && (
                  <View style={[settingsStyles.dropdownList, { backgroundColor: isDarkMode ? 'rgba(30,30,35,0.95)' : 'rgba(255,255,255,0.95)' }]}>
                    {ASR_METHODS.map((method) => (
                      <TouchableOpacity key={method.value} style={[settingsStyles.dropdownItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }, settings.prayer.asrJuristic === method.value && { backgroundColor: 'rgba(6,79,47,0.12)' }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); updatePrayer({ asrJuristic: method.value as 0 | 1 }); setShowAsrPicker(false); }}>
                        <View style={{ flex: 1 }}><Text style={[settingsStyles.methodLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{method.label}</Text><Text style={[settingsStyles.methodSub, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>{method.subtitle}</Text></View>
                        {settings.prayer.asrJuristic === method.value && <MaterialCommunityIcons name="check" size={18} color="#22C55E" />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <Text style={[settingsStyles.sectionLabel, { color: colors.textLight, marginTop: 20, textAlign: isRTL ? 'right' : 'left' }]}>{t('prayer.displayOptions')}</Text>
                <GlassToggle label={t('prayer.showSunrise')} icon="weather-sunny" enabled={settings.prayer.showSunrise} onToggle={(val) => updatePrayer({ showSunrise: val })} />
                <GlassToggle label={t('prayer.hourFormat24')} icon="clock-digital" enabled={settings.prayer.show24Hour} onToggle={(val) => updatePrayer({ show24Hour: val })} />
                <GlassToggle label={t('prayer.showDate')} icon="calendar" enabled={settings.prayer.showDate !== false} onToggle={(val) => updatePrayer({ showDate: val })} />
                <GlassToggle label={t('prayer.showLocation')} icon="map-marker" enabled={settings.prayer.showLocation !== false} onToggle={(val) => updatePrayer({ showLocation: val })} />

                {/* الأنشطة الحية — iOS 16.1+ */}
                {Platform.OS === 'ios' && (
                  <>
                    <Text style={[settingsStyles.sectionLabel, { color: colors.textLight, marginTop: 20, textAlign: isRTL ? 'right' : 'left' }]}>{t('prayer.liveActivities')}</Text>
                    <GlassToggle
                      label={t('prayer.enableLiveActivity')}
                      icon="cellphone-nfc"
                      enabled={liveActivityEnabled}
                      onToggle={handleLiveActivityToggle}
                    />
                    {liveActivityEnabled && (
                      <View style={{ marginTop: 8, gap: Spacing.sm }}>
                        {LIVE_ACTIVITY_STYLES.map((s) => (
                          <TouchableOpacity
                            key={s.id}
                            style={[
                              settingsStyles.dropdownItem,
                              {
                                flexDirection: isRTL ? 'row-reverse' : 'row',
                                backgroundColor: liveActivityStyle === s.id
                                  ? 'rgba(6,79,47,0.15)'
                                  : isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(120,120,128,0.06)',
                                borderRadius: 12,
                                paddingHorizontal: 14,
                                paddingVertical: 10,
                              },
                            ]}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              handleLiveActivityStyleChange(s.id);
                            }}
                          >
                            <View style={{ flex: 1 }}>
                              <Text style={[settingsStyles.methodLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
                                {s.nameAr}
                              </Text>
                              <Text style={[settingsStyles.methodSub, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>
                                {s.descAr}
                              </Text>
                            </View>
                            {liveActivityStyle === s.id && (
                              <MaterialCommunityIcons name="check" size={18} color="#22C55E" />
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    {!liveActivitySupported && (
                      <Text style={{ color: colors.textLight, fontSize: 12, fontFamily: fontRegular(), marginTop: 6, textAlign: isRTL ? 'right' : 'left' }}>
                        {t('prayer.liveActivityNotSupported')}
                      </Text>
                    )}
                  </>
                )}

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
  container: { flex: 1 },
  containerDark: {},
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 8 },
  headerTitle: { fontSize: 20, fontFamily: fontBold() },
  textLight: { color: '#fff' },
  textMuted: { color: '#999' },
  dateRow: { justifyContent: 'center', alignItems: 'center', paddingBottom: 6, gap: Spacing.sm, flexWrap: 'wrap', paddingHorizontal: 16 },
  dateRowText: { fontSize: 12, fontFamily: fontMedium() },
  dateRowSep: { fontSize: 12, opacity: 0.5 },
  headerButton: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  topNavTabsWrap: { paddingHorizontal: 16, paddingBottom: 8, marginTop: 10 },
  scrollContent: { paddingVertical: 10 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffebee', marginHorizontal: 16, marginVertical: 10, padding: 15, borderRadius: 12, gap: Spacing.sm },
  errorText: { flex: 1, fontSize: 14, fontFamily: fontMedium(), color: '#c62828' },
  retryButton: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#ef5350', borderRadius: 8 },
  retryText: { fontSize: 12, fontFamily: fontSemiBold(), color: '#fff' },
  circularContainer: { paddingVertical: 30 },
  lastThirdBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a237e', marginHorizontal: 16, marginVertical: 10, padding: 15, borderRadius: 12, gap: Spacing.sm },
  lastThirdText: { flex: 1, fontSize: 14, fontFamily: fontMedium(), color: '#fff' },
  extraInfo: { marginHorizontal: 16, marginVertical: 10, padding: 20, backgroundColor: 'rgba(120,120,128,0.12)', borderRadius: 20 },
  extraInfoDark: { backgroundColor: 'rgba(120,120,128,0.18)' },
  extraTitle: { fontSize: 16, fontFamily: fontBold(), color: '#333', marginBottom: 15 },
  extraRow: { flexDirection: 'row', justifyContent: 'space-around' },
  extraItem: { alignItems: 'center', gap: Spacing.xs },
  extraLabel: { fontSize: 12, fontFamily: fontRegular(), color: '#555' },
  extraValue: { fontSize: 16, fontFamily: fontBold(), color: '#333' },
  bottomSpace: { height: 100 },
  // Qibla button styles removed
  toggleContainer: { marginHorizontal: 16, marginBottom: 16 },
  widgetContainer: { minHeight: 180, minWidth: 320, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', marginVertical: 18, padding: 18 },
  placeholderText: { color: '#fff', fontSize: 18, opacity: 0.7, fontFamily: fontBold() },
  // Clock style selector (thumbnail-based, similar to Qibla)
  clockStyleSelectorWrap: { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 8 },
  clockStyleSelectorBlur: { borderRadius: 18, paddingVertical: 8, backgroundColor: 'rgba(0,0,0,0.12)', overflow: 'hidden' },
  clockStyleSelectorScroll: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: Spacing.sm },
  clockStyleThumbnail: {
    width: CLOCK_THUMB_SIZE + 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  clockStyleThumbnailActive: {
    borderColor: '#22C55E',
    backgroundColor: 'rgba(6,79,47,0.18)',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  clockStyleLabel: { fontSize: 10, fontFamily: fontSemiBold(), color: '#777', marginTop: 3 },
  clockStyleLabelActive: { color: '#2ECC71' },
  clockStyleActiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#2ECC71', marginTop: 2 },
  // Widget thumbnail — miniature of RectangleWidgetView
  thumbWidgetContainer: { width: CLOCK_THUMB_SIZE, height: CLOCK_THUMB_SIZE - 12, alignItems: 'center', justifyContent: 'center' },
  thumbWidgetCard: { width: CLOCK_THUMB_SIZE - 4, height: CLOCK_THUMB_SIZE - 16, borderRadius: 8, justifyContent: 'center', paddingHorizontal: 4 },
  thumbWidgetRow: { alignItems: 'center', justifyContent: 'space-between' },
  thumbWidgetLogoSide: { alignItems: 'center', gap: 1 },
  thumbWidgetLogo: { width: 18, height: 18, borderRadius: 5 },
  thumbWidgetAppName: { fontSize: 4, fontFamily: fontSemiBold(), color: '#22C55E' },
  thumbWidgetCountdownSide: { alignItems: 'center' },
  thumbWidgetCountdown: { fontSize: 10, fontFamily: fontBold(), letterSpacing: 0.5 },
  thumbWidgetPrayerLabel: { fontSize: 5, fontFamily: fontSemiBold() },
  // Analog thumbnail
  thumbAnalogContainer: { width: CLOCK_THUMB_SIZE, height: CLOCK_THUMB_SIZE - 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', overflow: 'visible' },
  // Digital thumbnail
  thumbDigitalContainer: { width: CLOCK_THUMB_SIZE, height: CLOCK_THUMB_SIZE - 12, alignItems: 'center', justifyContent: 'center' },
  thumbDigitalTime: { fontSize: 14, fontFamily: fontBold(), letterSpacing: 1 },
  thumbDigitalLabel: { fontSize: 7, fontFamily: fontSemiBold(), marginTop: -2 },
  thumbDigitalSeparator: { width: 20, height: 1, backgroundColor: 'rgba(6,79,47,0.4)', marginVertical: 2 },
  thumbDigitalCountdown: { fontSize: 9, fontFamily: fontBold(), color: '#555' },
});

const settingsStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  content: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderRadius: 0, height: '75%', padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 20, fontFamily: fontBold() },
  sectionLabel: { fontSize: 14, fontFamily: fontBold(), marginBottom: 10 },
  methodItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 8 },
  methodLabel: { fontSize: 15, fontFamily: fontSemiBold() },
  methodSub: { fontSize: 12, fontFamily: fontRegular(), marginTop: 2 },
  dropdownBtn: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 4 },
  dropdownList: { borderRadius: 12, marginBottom: 8, overflow: 'hidden' as const },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 0.5, borderBottomColor: 'rgba(120,120,128,0.12)' },
});
