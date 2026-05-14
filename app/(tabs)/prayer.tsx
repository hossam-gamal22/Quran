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
  Image,
  AppState,
  type AppStateStatus,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { fontBold, fontMedium, fontRegular, fontSemiBold } from '@/lib/fonts';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

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
  getNextPrayer,
  getTimeRemaining,
} from '@/lib/prayer-times';
import { getHijriDate, getLocalizedHijriDate } from '@/lib/hijri-date';
import { applyCountryPrayerDefaults, MAKKAH_FALLBACK_DEFAULTS } from '@/lib/country-prayer-defaults';
import { setUserCountry, getSavedUserCountry } from '@/services/hijriCalendarService';
import { calculationMethods } from '@/lib/prayer-times';
import { useSettings, CalculationMethod } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { useAppConfig } from '@/lib/app-config-context';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { SectionInfoButton } from '@/components/ui/SectionInfoButton';
import { BannerAdComponent } from '@/components/ads/BannerAd';
import { PermissionBanner } from '@/components/notifications/PermissionBanner';
import { useAdBottomInset } from '@/lib/ads-context';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { useSacredContext } from '@/hooks/use-sacred-context';
import { Spacing } from '@/constants/theme';
import { useAppIdentity } from '@/hooks/use-app-identity';
import { getDateLocale } from '@/lib/i18n';
import { GlassCard, GlassToggle } from '@/components/ui/GlassCard';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle, Line, G } from 'react-native-svg';
import SujudIcon from '@/assets/images/sujud.svg';
import { usePrayerTracker } from '@/contexts/WorshipContext';
import { trackPrayer } from '@/lib/firebase-analytics';
import type { PrayerStatus } from '@/lib/worship-storage';
import type { PrayerWindowState } from '@/lib/prayer-availability';

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

import NetInfo from '@react-native-community/netinfo';
import { showOfflineModal } from '@/components/ui/OfflineBanner';
import CountdownTimer from '@/components/ui/prayer/CountdownTimer';
import PrayerCard from '@/components/ui/prayer/PrayerCard';
import PrayerList from '@/components/ui/prayer/PrayerList';
import RectangleWidgetView from '@/components/ui/prayer/RectangleWidgetView';
import AnalogClockView from '@/components/ui/prayer/AnalogClockView';
import DigitalTypographyView from '@/components/ui/prayer/DigitalTypographyView';
import {
  PrayerDataSource,
  getOfflinePrayerTimes,
  cacheWeekPrayerTimes,
  buildWeekEntries,
} from '@/lib/prayer-week-cache';
import {
  buildCanonicalPrayerSnapshot,
  saveCanonicalPrayerSnapshot,
} from '@/lib/canonical-prayer-snapshot';

const CLOCK_STYLE_KEY = '@prayer_clock_style';
const CLOCK_THUMB_SIZE = 72;

const getPrayerMethods = (t: (key: string) => string): { value: CalculationMethod; label: string; subtitle: string }[] => [
  { value: 4, label: t('prayer.methodUmmAlQura'), subtitle: t('prayer.methodUmmAlQuraDesc') },
  { value: 3, label: t('prayer.methodMuslimWorldLeague'), subtitle: t('prayer.methodMuslimWorldLeagueDesc') },
  { value: 2, label: t('prayer.methodIsna'), subtitle: t('prayer.methodIsnaDesc') },
  { value: 5, label: t('prayer.methodEgyptian'), subtitle: t('prayer.methodEgyptianDesc') },
  { value: 1, label: t('prayer.methodKarachi'), subtitle: t('prayer.methodKarachiDesc') },
  { value: 7, label: t('prayer.methodTehran'), subtitle: t('prayer.methodTehranDesc') },
  { value: 0, label: t('prayer.methodOmdurman'), subtitle: t('prayer.methodOmdurmanDesc') },
  { value: 8, label: t('prayer.methodGulf'), subtitle: t('prayer.methodGulfDesc') },
  { value: 9, label: t('prayer.methodKuwait'), subtitle: t('prayer.methodKuwaitDesc') },
  { value: 10, label: t('prayer.methodQatar'), subtitle: t('prayer.methodQatarDesc') },
  { value: 11, label: t('prayer.methodSingapore'), subtitle: t('prayer.methodSingaporeDesc') },
  { value: 12, label: t('prayer.methodFrance'), subtitle: t('prayer.methodFranceDesc') },
  { value: 13, label: t('prayer.methodTurkey'), subtitle: t('prayer.methodTurkeyDesc') },
  { value: 14, label: t('prayer.methodRussia'), subtitle: t('prayer.methodRussiaDesc') },
  { value: 15, label: t('prayer.methodMoonsighting'), subtitle: t('prayer.methodMoonsightingDesc') },
  { value: 16, label: t('prayer.methodDubai'), subtitle: t('prayer.methodDubaiDesc') },
  { value: 17, label: t('prayer.methodJakim'), subtitle: t('prayer.methodJakimDesc') },
  { value: 18, label: t('prayer.methodTunisia'), subtitle: t('prayer.methodTunisiaDesc') },
  { value: 19, label: t('prayer.methodAlgeria'), subtitle: t('prayer.methodAlgeriaDesc') },
  { value: 20, label: t('prayer.methodKemenag'), subtitle: t('prayer.methodKemenagDesc') },
  { value: 21, label: t('prayer.methodMorocco'), subtitle: t('prayer.methodMoroccoDesc') },
  { value: 22, label: t('prayer.methodLisboa'), subtitle: t('prayer.methodLisboaDesc') },
  { value: 23, label: t('prayer.methodJordan'), subtitle: t('prayer.methodJordanDesc') },
];

const getAsrMethods = (t: (key: string) => string) => [
  { value: 0, label: t('prayer.asrMethodHanafi'), subtitle: t('prayer.asrMethodHanafiDesc') },
  { value: 1, label: t('prayer.asrMethodShafii'), subtitle: t('prayer.asrMethodShafiiDesc') },
];

const isMakkahFallbackLocation = (loc: LocationType | null | undefined) =>
  !!loc &&
  Math.abs(loc.latitude - MAKKAH_FALLBACK_DEFAULTS.lat) < 0.0001 &&
  Math.abs(loc.longitude - MAKKAH_FALLBACK_DEFAULTS.lng) < 0.0001;

export default function PrayerScreen() {
  const { isDarkMode, t, settings, updatePrayer } = useSettings();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const adBottomInset = useAdBottomInset();
  const styles = useScaledStyles(_styles, colors.fs);
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
  const [dataSource, setDataSource] = useState<PrayerDataSource>('live');
  const [cacheAgeDays, setCacheAgeDays] = useState(0);
  const [usingMakkahFallback, setUsingMakkahFallback] = useState(false);
  const [showAsrPicker, setShowAsrPicker] = useState(false);

  // Long-press status modal for the prayer-times list (matches the worship tracker UX).
  const [statusModal, setStatusModal] = useState<{
    visible: boolean;
    prayer: PrayerName | null;
    current: PrayerStatus;
  }>({ visible: false, prayer: null, current: 'none' });

  const PRAYER_STATUS_OPTIONS: { value: PrayerStatus; color: string; icon: any; labelKey: string }[] = [
    { value: 'prayed', color: '#0d8e62', icon: 'check-circle', labelKey: 'worship.onTime' },
    { value: 'late',   color: '#c07b10', icon: 'clock-alert',  labelKey: 'worship.late' },
    { value: 'missed', color: '#ef5350', icon: 'close-circle', labelKey: 'worship.missed' },
    { value: 'none',   color: '#8E8E93', icon: 'circle-outline', labelKey: 'worship.notRecorded' },
  ];

  const openPrayerStatusModal = useCallback((prayer: PrayerName, _ws: PrayerWindowState, current: PrayerStatus) => {
    if (prayer === 'sunrise') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setStatusModal({ visible: true, prayer, current: current ?? 'none' });
  }, []);

  const handleSelectPrayerStatus = useCallback((value: PrayerStatus) => {
    const prayer = statusModal.prayer;
    setStatusModal({ visible: false, prayer: null, current: 'none' });
    if (!prayer || prayer === 'sunrise') return;
    const key = prayer as 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
    updatePrayerWithTime(key, value, prayerTimes?.[key] || undefined);
    if (value === 'prayed' || value === 'late') {
      trackPrayer(key, value === 'prayed').catch(() => {});
    }
  }, [statusModal.prayer, updatePrayerWithTime, prayerTimes]);

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
  const [thumbnailNow, setThumbnailNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setThumbnailNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const clockThumbnailData = useMemo(() => {
    const pad = (n: number) => String(Math.max(0, n)).padStart(2, '0');
    const next = prayerTimes ? getNextPrayer(prayerTimes) : null;
    const remaining = prayerTimes ? getTimeRemaining(prayerTimes) : null;
    const name = next?.name ?? 'fajr';
    const label = t(`prayer.${name}`);
    const countdown = remaining
      ? `${pad(remaining.hours)}:${pad(remaining.minutes)}:${pad(remaining.seconds)}`
      : '--:--:--';
    const countdownShort = remaining
      ? `${pad(remaining.hours)}:${pad(remaining.minutes)}`
      : '--:--';
    return {
      label,
      countdown,
      countdownShort,
      time: next ? formatPrayerTime(next.time, settings.prayer.show24Hour) : '--:--',
    };
  }, [prayerTimes, settings.prayer.show24Hour, t, thumbnailNow]);

  const analogThumbHands = useMemo(() => {
    const hours = thumbnailNow.getHours() % 12;
    const minutes = thumbnailNow.getMinutes();
    const seconds = thumbnailNow.getSeconds();
    const handEnd = (angle: number, length: number) => {
      const rad = (angle - 90) * (Math.PI / 180);
      return {
        x: 50 + Math.cos(rad) * length,
        y: 50 + Math.sin(rad) * length,
      };
    };
    return {
      hour: handEnd((hours + minutes / 60) * 30, 25),
      minute: handEnd((minutes + seconds / 60) * 6, 34),
      second: handEnd(seconds * 6, 38),
    };
  }, [thumbnailNow]);

  const PRAYER_METHODS = useMemo(() => getPrayerMethods(t), [t]);
  const ASR_METHODS = useMemo(() => getAsrMethods(t), [t]);

  // Automatic mode for calculation method
  const isAutoMode = settings.prayer.methodManuallySet !== true;
  const [autoMethodLabel, setAutoMethodLabel] = useState('');
  useEffect(() => {
    (async () => {
      try {
        const cc = await getSavedUserCountry();
        const cd = applyCountryPrayerDefaults(cc) ?? MAKKAH_FALLBACK_DEFAULTS;
        if (cd) {
          const info = calculationMethods[cd.method as CalculationMethod];
          if (info) setAutoMethodLabel(language === 'ar' || language === 'ur' ? info.nameAr : info.name);
        }
      } catch {}
    })();
  }, [language]);

  const handleToggleAutoMethod = useCallback(async (turnOn: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (turnOn) {
      const zeroAdj = { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 };
      try {
        const cc = await getSavedUserCountry();
        const cd = applyCountryPrayerDefaults(cc) ?? MAKKAH_FALLBACK_DEFAULTS;
        if (cd) {
          updatePrayer({ calculationMethod: cd.method as CalculationMethod, asrJuristic: cd.asrSchool, methodManuallySet: false, adjustments: zeroAdj });
        } else {
          updatePrayer({ methodManuallySet: false, adjustments: zeroAdj });
        }
      } catch {
        updatePrayer({ methodManuallySet: false, adjustments: zeroAdj });
      }
    } else {
      updatePrayer({ methodManuallySet: true });
    }
  }, [updatePrayer]);

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

      const currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const lat = currentLocation.coords.latitude;
      const lon = currentLocation.coords.longitude;

      // Try locale-aware geocoding first (3s timeout to avoid offline hang)
      let city = '';
      let country = '';
      let countryCode = '';
      try {
        const lang = language || 'ar';
        const geocodeCtrl = new AbortController();
        const geocodeTimeout = setTimeout(() => geocodeCtrl.abort(), 3000);
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&format=json&accept-language=${encodeURIComponent(lang)}`,
          { headers: { 'User-Agent': 'RuhAlMuslim/1.0' }, signal: geocodeCtrl.signal }
        );
        clearTimeout(geocodeTimeout);
        if (res.ok) {
          const data = await res.json();
          city = data?.address?.city || data?.address?.town || data?.address?.village || data?.address?.state || '';
          country = data?.address?.country || '';
          countryCode = (data?.address?.country_code || '').toUpperCase();
        }
      } catch {}

      // Fallback to expo-location geocoding
      if (!city) {
        const [geocode] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
        city = geocode?.city || geocode?.subregion || '';
        country = geocode?.country || '';
        if (!countryCode) countryCode = (geocode?.isoCountryCode || '').toUpperCase();
      }

      // Update user's real country in Firestore (GPS-based) and persist locally
      // so the SettingsContext reconcile effect can pick it up on next launch.
      if (countryCode) {
        import('@/lib/firebase-user').then(({ updateUserCountryFromGPS }) => {
          updateUserCountryFromGPS(countryCode, {
            city,
            countryName: country,
            latitude: lat,
            longitude: lon,
          }).catch((err) => console.warn('⚠️ Prayer GPS country update failed:', err));
        }).catch((err) => console.warn('⚠️ Failed to import firebase-user for GPS country:', err));
        setUserCountry(countryCode).catch(() => {});
      }

      // Auto-detect calculation method from GPS country (current session).
      if (countryCode && !settings.prayer.methodManuallySet) {
        const cd = applyCountryPrayerDefaults(countryCode);
        if (cd && (cd.method !== settings.prayer.calculationMethod || cd.asrSchool !== settings.prayer.asrJuristic)) {
          console.log(`🌍 GPS prayer method for ${countryCode}: method=${cd.method}, asrSchool=${cd.asrSchool}`);
          updatePrayer({
            calculationMethod: cd.method as CalculationMethod,
            asrJuristic: cd.asrSchool,
          });
        }
      }

      const locationData: LocationType = {
        latitude: lat,
        longitude: lon,
        city,
        country,
      };

      await saveLocation(locationData);
      // Location now available — reschedule prayer notifications that depend on it
      import('@/lib/notifications-manager').then(({ rescheduleAllFromStorage }) => {
        rescheduleAllFromStorage().catch(() => {});
      }).catch(() => {});
      return (await getStoredLocation()) || locationData;
    } catch (err) {
      console.error('Error fetching location:', err);
      const stored = await getStoredLocation();
      if (stored) return stored;
      setUsingMakkahFallback(true);
      return {
        latitude: MAKKAH_FALLBACK_DEFAULTS.lat,
        longitude: MAKKAH_FALLBACK_DEFAULTS.lng,
        city: t('prayer.defaultCity'),
        country: t('prayer.defaultCountry'),
      };
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

      // Try update first, if no active activity then start new one
      const updated = await updateLiveActivity(data);
      if (!updated) {
        await startLiveActivity(data);
      }
    } catch (e) {
      console.log('📍 Live Activity update error:', e);
    }
  };

  // Holds the most recent un-adjusted prayer times so the +/- stepper can re-apply
  // offsets locally without a full API refetch. Declared above loadPrayerTimes so
  // the closure binding is resolved before the function is invoked.
  const rawPrayerTimesRef = useRef<PrayerTimes | null>(null);

  const loadPrayerTimes = async (forceRefresh = false) => {
    try {
      setError(null);
      setDataSource('live');

      // One-time migration: reset per-prayer adjustments that were incorrectly set,
      // so prayer times match the raw API output (Google/competitors).
      try {
        const resetFlag = await AsyncStorage.getItem('@prayer_adjustments_reset_v1');
        if (!resetFlag) {
          console.log('🔄 One-time prayer adjustments reset (v1)');
          await AsyncStorage.setItem('@prayer_adjustments_reset_v1', '1');
          const zeroAdj = { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 };
          updatePrayer({ adjustments: zeroAdj });
          // Clear today's cache so fresh API data is used
          const todayKey = getTodayDateString();
          const cacheKeys = await AsyncStorage.getAllKeys();
          for (const k of cacheKeys) {
            if (k.startsWith('@prayer_times_cache_') || (k.includes('prayer') && k.includes(todayKey))) {
              await AsyncStorage.removeItem(k);
            }
          }
          forceRefresh = true;
        }
      } catch (e) {
        console.warn('Migration check failed:', e);
      }

      // Migration v2: clear ALL prayer caches once. The previous unscoped
      // week-cache key (`@prayer_week_cache`) could persist times calculated
      // with a stale method. Forces a clean re-fetch with the correct method.
      try {
        const v2Flag = await AsyncStorage.getItem('@prayer_cache_reset_v2');
        if (!v2Flag) {
          console.log('🧹 One-time prayer cache reset (v2) — clearing all prayer caches');
          const allKeys = await AsyncStorage.getAllKeys();
          const toRemove = allKeys.filter((k) =>
            k.startsWith('@prayer_times_cache_') ||
            k.startsWith('@prayer_week_cache')
          );
          if (toRemove.length > 0) await AsyncStorage.multiRemove(toRemove);
          await AsyncStorage.setItem('@prayer_cache_reset_v2', '1');
          forceRefresh = true;
        }
      } catch (e) {
        console.warn('Migration v2 failed:', e);
      }

      // Bug 1 fix: Use SettingsContext as source of truth for calculation params
      // Only read notifications from local @prayer_settings storage
      const localNotifSettings = await getPrayerSettings();
      const settingsFromStore: PrayerSettings = {
        ...localNotifSettings,
        calculationMethod: settings.prayer.calculationMethod,
        asrJuristic: settings.prayer.asrJuristic,
        adjustments: settings.prayer.adjustments,
      };
      setPrayerSettings(settingsFromStore);
      console.log(`🕌 [prayer-times] method=${settings.prayer.calculationMethod}, school=${settings.prayer.asrJuristic}, source=app_settings`);

      const today = getTodayDateString();
      const publishCanonicalPrayerData = async (
        times: PrayerTimes,
        loc: LocationType | null | undefined,
        source: Parameters<typeof buildCanonicalPrayerSnapshot>[0]['source'],
      ) => {
        const effectiveLoc = loc ?? await getStoredLocation();
        if (!effectiveLoc) return;
        const locationLabel = effectiveLoc.city
          ? `${effectiveLoc.city}${effectiveLoc.country ? ', ' + effectiveLoc.country : ''}`
          : '';
        const snapshot = buildCanonicalPrayerSnapshot({
          times,
          location: effectiveLoc,
          locationName: locationLabel,
          settings: settingsFromStore,
          source,
        });
        await saveCanonicalPrayerSnapshot(snapshot);
        console.log('[PrayerCanonical] app countdown:', Math.max(0, Math.floor((snapshot.nextPrayerAtEpochMs - Date.now()) / 1000)));
        try {
          const { updateSharedData } = require('@/lib/widget-data');
          await updateSharedData(times, locationLabel);
        } catch {}
      };

      // Always load location for display
      let currentLoc: LocationType | null = location;
      if (!currentLoc) {
        const stored = await getStoredLocation();
        if (stored) {
          // Re-geocode stored coordinates with current language
          currentLoc = stored;
          try {
            const lang = language || 'ar';
            const geocodeCtrl = new AbortController();
            const geocodeTimeout = setTimeout(() => geocodeCtrl.abort(), 3000);
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(stored.latitude)}&lon=${encodeURIComponent(stored.longitude)}&format=json&accept-language=${encodeURIComponent(lang)}`,
              { headers: { 'User-Agent': 'RuhAlMuslim/1.0' }, signal: geocodeCtrl.signal }
            );
            clearTimeout(geocodeTimeout);
            if (res.ok) {
              const data = await res.json();
              const city = data?.address?.city || data?.address?.town || data?.address?.village || data?.address?.state || '';
              const country = data?.address?.country || '';
              const countryCode = (data?.address?.country_code || '').toUpperCase();
              if (city) {
                currentLoc = { ...stored, city, country };
                await saveLocation(currentLoc);
                // Location updated — reschedule prayer notifications
                import('@/lib/notifications-manager').then(({ rescheduleAllFromStorage }) => {
                  rescheduleAllFromStorage().catch(() => {});
                }).catch(() => {});
              }

              // Update user's real country in Firestore + persist locally so
              // SettingsContext reconcile picks it up next launch.
              if (countryCode) {
                import('@/lib/firebase-user').then(({ updateUserCountryFromGPS }) => {
                  updateUserCountryFromGPS(countryCode, {
                    city: currentLoc?.city || city,
                    countryName: country,
                    latitude: currentLoc?.latitude,
                    longitude: currentLoc?.longitude,
                  }).catch((err) => console.warn('⚠️ Cached-location GPS country update failed:', err));
                }).catch((err) => console.warn('⚠️ Failed to import firebase-user for GPS country:', err));
                setUserCountry(countryCode).catch(() => {});
              }

              // Auto-detect calculation method from country (cached location path)
              if (countryCode && !settings.prayer.methodManuallySet) {
                const cd = applyCountryPrayerDefaults(countryCode);
                if (cd && (cd.method !== settings.prayer.calculationMethod || cd.asrSchool !== settings.prayer.asrJuristic)) {
                  console.log(`🌍 Cached-location prayer method for ${countryCode}: method=${cd.method}, asrSchool=${cd.asrSchool}`);
                  updatePrayer({
                    calculationMethod: cd.method as CalculationMethod,
                    asrJuristic: cd.asrSchool,
                  });
                }
              }
            }
          } catch (e) {
            console.log('Re-geocode failed, using stored names:', e);
          }
          setLocation(currentLoc);
        }
      }

      if (!forceRefresh) {
        const cached = await getCachedPrayerTimes(today, settings.prayer.calculationMethod, settings.prayer.asrJuristic);
        if (cached) {
          rawPrayerTimesRef.current = null;
          setPrayerTimes(cached);
          setDataSource('todayCache');
          setCacheAgeDays(0);
          publishCanonicalPrayerData(cached, currentLoc, 'todayCache').catch(() => {});
          setIsLoading(false);
          return;
        }
      }

      const stylesLocal = StyleSheet.create({
        tabBarGlass: { borderRadius: 18, padding: 4, backgroundColor: 'rgba(255,255,255,0.60)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.18)', alignSelf: 'center', minWidth: 200, maxWidth: 340 },
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
      const effectiveSettings = isMakkahFallbackLocation(loc) && settings.prayer.methodManuallySet !== true
        ? {
            ...settingsFromStore,
            calculationMethod: MAKKAH_FALLBACK_DEFAULTS.method as CalculationMethod,
            asrJuristic: MAKKAH_FALLBACK_DEFAULTS.asrSchool,
          }
        : settingsFromStore;

      // ─── Early network check: skip API when offline ───
      const netState = await NetInfo.fetch();
      const isOnline = netState.isConnected && netState.isInternetReachable !== false;
      if (!isOnline) {
        console.log('📴 Offline detected — skipping API, using offline fallback chain');
        const offlineResult = await getOfflinePrayerTimes();
        if (offlineResult.times) {
          rawPrayerTimesRef.current = offlineResult.times;
          setPrayerTimes(offlineResult.times);
          setDataSource(offlineResult.source);
          setCacheAgeDays(offlineResult.cacheAgeDays);
          if (offlineResult.source !== 'error') {
            publishCanonicalPrayerData(offlineResult.times, loc, offlineResult.source).catch(() => {});
          }
          // Update live activity with offline times
          if (Platform.OS === 'ios') {
            updatePrayerLiveActivity(offlineResult.times);
          }
          return;
        }
        // If offline fallback chain is completely empty, throw to reach catch block
        throw new Error('offline_no_data');
      }

      const response = await fetchPrayerTimes(loc, new Date(), effectiveSettings);
      const rawTimes = parsePrayerTimes(response);
      rawPrayerTimesRef.current = rawTimes;
      const times = applyAdjustments(rawTimes, effectiveSettings.adjustments);
      await cachePrayerTimes(today, times, effectiveSettings.calculationMethod, effectiveSettings.asrJuristic);
      setPrayerTimes(times);
      setDataSource('live');
      setCacheAgeDays(0);
      setUsingMakkahFallback(false);

      // Build week cache from monthly API for offline resilience
      try {
        const { fetchMonthlyPrayerTimes: fetchMonthly } = require('@/lib/prayer-times') as typeof import('@/lib/prayer-times');
        const now = new Date();
        const monthlyData = await fetchMonthly(loc, now.getMonth() + 1, now.getFullYear(), effectiveSettings);
        if (monthlyData?.length) {
          const weekEntries = buildWeekEntries(monthlyData, effectiveSettings);
          if (weekEntries.length > 0) {
            await cacheWeekPrayerTimes(weekEntries, { latitude: loc.latitude, longitude: loc.longitude });
          }
        }
      } catch (e) {
        console.log('📅 Week cache build failed (non-critical):', e);
      }

      // Sync prayer times to widget data so home screen widgets update immediately
      publishCanonicalPrayerData(times, loc, 'live').catch(() => {});

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
      // Try offline fallback chain before showing error
      try {
        const offlineResult = await getOfflinePrayerTimes();
        if (offlineResult.times) {
          rawPrayerTimesRef.current = offlineResult.times;
          setPrayerTimes(offlineResult.times);
          setDataSource(offlineResult.source);
          setCacheAgeDays(offlineResult.cacheAgeDays);
          if (offlineResult.source !== 'error') {
            const snapshotSource = offlineResult.source as Exclude<PrayerDataSource, 'error'>;
            (async () => {
              const effectiveLoc = location ?? await getStoredLocation();
              if (!effectiveLoc) return;
              const locationLabel = effectiveLoc.city
                ? `${effectiveLoc.city}${effectiveLoc.country ? ', ' + effectiveLoc.country : ''}`
                : '';
              const localNotifSettings = await getPrayerSettings();
              const snapshot = buildCanonicalPrayerSnapshot({
                times: offlineResult.times!,
                location: effectiveLoc,
                locationName: locationLabel,
                settings: {
                  ...localNotifSettings,
                  calculationMethod: settings.prayer.calculationMethod,
                  asrJuristic: settings.prayer.asrJuristic,
                  adjustments: settings.prayer.adjustments,
                },
                source: snapshotSource,
              });
              await saveCanonicalPrayerSnapshot(snapshot);
              const { updateSharedData } = require('@/lib/widget-data');
              await updateSharedData(offlineResult.times, locationLabel);
            })().catch(() => {});
          }
          console.log(`📅 Offline fallback: source=${offlineResult.source}, age=${offlineResult.cacheAgeDays} days`);
          return;
        }
      } catch (offlineErr) {
        console.warn('Offline fallback also failed:', offlineErr);
      }
      setDataSource('error');
      // Check if offline and show friendly message
      const netState = await NetInfo.fetch();
      if (!(netState.isConnected && netState.isInternetReachable !== false)) {
        setError(t('messages.noInternet'));
        showOfflineModal();
      } else {
        setError(t('messages.error'));
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      lastFetchAtRef.current = Date.now();
      lastFetchDayRef.current = new Date().toDateString();
    }
  };

  // Track last successful fetch so we can force-refresh on long backgrounding
  // or after a date change (root-cause guard for stale prayer-time displays).
  const lastFetchAtRef = useRef<number>(0);
  const lastFetchDayRef = useRef<string>('');

  useFocusEffect(useCallback(() => {
    loadPrayerTimes();
    const hijri = getLocalizedHijriDate();
    const ahSuffix = t('calendar.ahSuffix');
    if (hijri) setHijriDate(`${hijri.day} ${hijri.monthName} ${hijri.year} ${ahSuffix}`);
  }, []));

  // Bug 2 fix: Force-refresh when calculation method or Asr school changes
  const prevMethodRef = useRef(settings.prayer.calculationMethod);
  const prevAsrRef = useRef(settings.prayer.asrJuristic);
  useEffect(() => {
    if (prevMethodRef.current !== settings.prayer.calculationMethod ||
        prevAsrRef.current !== settings.prayer.asrJuristic) {
      console.log(`🔄 Prayer settings changed: method ${prevMethodRef.current}→${settings.prayer.calculationMethod}, asr ${prevAsrRef.current}→${settings.prayer.asrJuristic}`);
      prevMethodRef.current = settings.prayer.calculationMethod;
      prevAsrRef.current = settings.prayer.asrJuristic;
      loadPrayerTimes(true);
    }
  }, [settings.prayer.calculationMethod, settings.prayer.asrJuristic]);

  // Re-apply adjustments to displayed prayer times when stepper +/- changes the offsets.
  // Skips first run (initial mount). Uses cached raw times when available; otherwise
  // forces a refetch so cache-hit displays catch up.
  const prevAdjRef = useRef(settings.prayer.adjustments);
  useEffect(() => {
    const curr = settings.prayer.adjustments;
    const prev = prevAdjRef.current;
    if (prev === curr) return;
    const changed = !prev || (['fajr','sunrise','dhuhr','asr','maghrib','isha'] as const).some(
      (k) => (prev?.[k] ?? 0) !== (curr?.[k] ?? 0)
    );
    if (!changed) return;
    prevAdjRef.current = curr;
    const raw = rawPrayerTimesRef.current;
    if (!raw) {
      loadPrayerTimes(true);
      return;
    }
    const adjusted = applyAdjustments(raw, curr);
    setPrayerTimes(adjusted);
    try {
      const { updateSharedData } = require('@/lib/widget-data');
      const locationLabel = location?.city ? `${location.city}${location.country ? ', ' + location.country : ''}` : '';
      if (location) {
        const snapshot = buildCanonicalPrayerSnapshot({
          times: adjusted,
          location,
          locationName: locationLabel,
          settings: {
            calculationMethod: settings.prayer.calculationMethod,
            asrJuristic: settings.prayer.asrJuristic,
            adjustments: curr,
          },
          source: 'live',
        });
        saveCanonicalPrayerSnapshot(snapshot).catch(() => {});
      }
      updateSharedData(adjusted, locationLabel).catch(() => {});
    } catch {}
    if (Platform.OS === 'ios') updatePrayerLiveActivity(adjusted);
  }, [settings.prayer.adjustments, location]);

  // Auto-refresh prayer times at midnight for the new day
  useEffect(() => {
    const scheduleMidnight = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setDate(midnight.getDate() + 1);
      midnight.setHours(0, 0, 30, 0); // 30s past midnight
      const ms = midnight.getTime() - now.getTime();
      return setTimeout(() => {
        console.log('🕛 Midnight — refreshing prayer times');
        loadPrayerTimes(true);
        const hijri = getLocalizedHijriDate();
        const ahSuffix = t('calendar.ahSuffix');
        if (hijri) setHijriDate(`${hijri.day} ${hijri.monthName} ${hijri.year} ${ahSuffix}`);
      }, ms);
    };
    const timer = scheduleMidnight();
    return () => clearTimeout(timer);
  }, []);

  // Auto-refresh when connectivity returns while showing stale/extrapolated data
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOnlineRefresh = state.isConnected && state.isInternetReachable !== false;
      if (isOnlineRefresh && (dataSource === 'extrapolated' || dataSource === 'error' || dataSource === 'localCalc' || dataSource === 'countryFallback')) {
        console.log('🌐 Connectivity restored — auto-refreshing prayer times');
        loadPrayerTimes(true);
      }
    });
    return () => unsubscribe();
  }, [dataSource]);

  // Force-refresh on app foreground when cache is older than 6 hours or the
  // calendar day has rolled over since the last successful fetch. Without this,
  // a phone left in the pocket for half a day would display yesterday's times
  // until the user manually pulled to refresh.
  useEffect(() => {
    const STALE_AFTER_MS = 6 * 60 * 60 * 1000;
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state !== 'active') return;
      const now = Date.now();
      const ageMs = now - (lastFetchAtRef.current || 0);
      const today = new Date().toDateString();
      const dayChanged = lastFetchDayRef.current && lastFetchDayRef.current !== today;
      if (lastFetchAtRef.current === 0) return; // initial load not done yet
      if (dayChanged || ageMs > STALE_AFTER_MS) {
        console.log(`🔄 [prayer-tab] Foreground refresh — ageMs=${ageMs}, dayChanged=${dayChanged}`);
        loadPrayerTimes(true);
      }
    });
    return () => sub.remove();
  }, []);

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

  // Method badge: show current calculation method name + mismatch warning
  const [gpsCountryCode, setGpsCountryCode] = useState<string | null>(null);
  useEffect(() => {
    getSavedUserCountry().then(c => { if (c) setGpsCountryCode(c.toUpperCase()); }).catch(() => {});
  }, []);
  const currentMethodInfo = calculationMethods[settings.prayer.calculationMethod];
  const methodBadgeLabel = currentMethodInfo
    ? (language === 'ar' || language === 'ur' ? currentMethodInfo.nameAr : currentMethodInfo.name)
    : '';
  const isMethodMismatch = useMemo(() => {
    if (!gpsCountryCode) return false;
    const cd = applyCountryPrayerDefaults(gpsCountryCode);
    if (!cd) return false;
    return cd.method !== settings.prayer.calculationMethod;
  }, [gpsCountryCode, settings.prayer.calculationMethod]);
  const inLastThird = prayerTimes ? isInLastThird(prayerTimes) : false;

  const gregorianDate = useMemo(() => {
    try {
      return new Date().toLocaleDateString(getDateLocale(), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return new Date().toLocaleDateString(getDateLocale(), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
  }, [language]);

  return (
    <BackgroundWrapper backgroundKey={settings.display.appBackground} backgroundUrl={settings.display.appBackgroundUrl} opacity={settings.display.backgroundOpacity ?? 1} style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <StatusBar style={colors.statusBarStyle} />

        {/* Header — same as tasbih */}
        <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4 }}>
            <TouchableOpacity onPress={() => router.push('/worship-tracker/prayer' as any)} style={styles.headerButton}>
              <MaterialCommunityIcons name="chart-bar" size={22} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/salati' as any)} style={styles.headerButton}>
              <SujudIcon width={22} height={22} fill={colors.text} />
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
            indicatorColor="#0d8e62"
          />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, { paddingBottom: 160 + adBottomInset }]} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#0d8e62']} tintColor="#0d8e62" />}>

          {error && (
            <Animated.View entering={FadeInDown.duration(300)} style={[styles.errorContainer, { flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: isDarkMode ? 'rgba(239,83,80,0.15)' : '#ffebee' }]}>
              <MaterialCommunityIcons name="alert-circle" size={24} color="#ef5350" />
              <Text style={[styles.errorText, { color: isDarkMode ? '#ef9a9a' : '#c62828' }]}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => loadPrayerTimes(true)}>
                <Text style={styles.retryText}>{t('common.retry')}</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Stale/extrapolated/offline data warning banner */}
          {(dataSource === 'extrapolated' || dataSource === 'localCalc' || dataSource === 'countryFallback' || (dataSource === 'weekCache' && cacheAgeDays > 0)) && !error && (
            <Animated.View entering={FadeInDown.duration(300)} style={[styles.staleBanner, { flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: isDarkMode ? 'rgba(255,152,0,0.15)' : 'rgba(255,243,224,0.95)' }]}>
              <MaterialCommunityIcons name={dataSource === 'countryFallback' ? 'earth' : 'clock-alert-outline'} size={22} color={isDarkMode ? '#ffb74d' : '#e65100'} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.staleBannerText, { color: isDarkMode ? '#ffcc80' : '#e65100', textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                  {t('prayer.approximateTimes')}
                </Text>
                {cacheAgeDays > 0 && (
                  <Text style={[styles.staleBannerSubtext, { color: isDarkMode ? '#ffe0b2' : '#bf360c', textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                    {t('prayer.lastUpdatedAgo').replace('{days}', String(cacheAgeDays))}
                  </Text>
                )}
              </View>
              <TouchableOpacity style={[styles.staleBannerRefresh, { backgroundColor: isDarkMode ? 'rgba(255,152,0,0.25)' : 'rgba(230,81,0,0.12)' }]} onPress={() => loadPrayerTimes(true)}>
                <MaterialCommunityIcons name="refresh" size={18} color={isDarkMode ? '#ffb74d' : '#e65100'} />
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Location permission banner — يظهر فقط لو الموقع معطّل أو غير محدد */}
          <PermissionBanner onlyKeys={['location']} />

          {/* Makkah fallback location banner */}
          {usingMakkahFallback && !error && dataSource !== 'extrapolated' && (
            <Animated.View entering={FadeInDown.duration(300)} style={[styles.staleBanner, { flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: isDarkMode ? 'rgba(255,152,0,0.15)' : 'rgba(255,243,224,0.95)' }]}>
              <MaterialCommunityIcons name="map-marker-alert-outline" size={22} color={isDarkMode ? '#ffb74d' : '#e65100'} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.staleBannerText, { color: isDarkMode ? '#ffcc80' : '#e65100', textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                  {t('prayer.makkahFallback')}
                </Text>
              </View>
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
                <View style={[styles.clockThumbnailsContainer, Platform.OS === 'android' && styles.clockThumbnailsContainerAndroidFlat, { borderColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={[
                      styles.clockStyleSelectorScroll,
                      { flexDirection: isRTL ? 'row-reverse' : 'row' },
                      { flex: 1, justifyContent: 'flex-start' },
                    ]}
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
                              <View style={styles.thumbWidgetCard}>
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
                                    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.thumbWidgetCountdown, { color: colors.text }]}>{clockThumbnailData.countdownShort}</Text>
                                    <Text numberOfLines={1} style={[styles.thumbWidgetPrayerLabel, { color: colors.textLight }]}>{clockThumbnailData.label}</Text>
                                  </View>
                                </View>
                              </View>
                            </View>
                          )}
                          {style.key === 'analog' && (
                            <View style={styles.thumbAnalogContainer}>
                              <Svg width={CLOCK_THUMB_SIZE - 20} height={CLOCK_THUMB_SIZE - 20} viewBox="0 0 100 100">
                                <Circle cx="50" cy="50" r="45" stroke={colors.border} strokeWidth="2" fill="transparent" />
                                {/* Hour markers */}
                                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => (
                                  <Line
                                    key={angle}
                                    x1={50 + 38 * Math.sin((angle * Math.PI) / 180)}
                                    y1={50 - 38 * Math.cos((angle * Math.PI) / 180)}
                                    x2={50 + 43 * Math.sin((angle * Math.PI) / 180)}
                                    y2={50 - 43 * Math.cos((angle * Math.PI) / 180)}
                                    stroke={colors.icon}
                                    strokeWidth={angle % 90 === 0 ? 2.5 : 1.5}
                                  />
                                ))}
                                {/* Hour hand */}
                                <Line x1="50" y1="50" x2={analogThumbHands.hour.x} y2={analogThumbHands.hour.y} stroke={colors.text} strokeWidth="3" strokeLinecap="round" />
                                {/* Minute hand */}
                                <Line x1="50" y1="50" x2={analogThumbHands.minute.x} y2={analogThumbHands.minute.y} stroke={colors.textLight} strokeWidth="2" strokeLinecap="round" />
                                {/* Second hand */}
                                <Line x1="50" y1="50" x2={analogThumbHands.second.x} y2={analogThumbHands.second.y} stroke="#0d8e62" strokeWidth="1" strokeLinecap="round" />
                                {/* Center dot */}
                                <Circle cx="50" cy="50" r="3" fill="#0d8e62" />
                              </Svg>
                            </View>
                          )}
                          {style.key === 'digital' && (
                            <View style={styles.thumbDigitalContainer}>
                              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.thumbDigitalTime, { color: colors.text }]}>{clockThumbnailData.countdown}</Text>
                              <Text numberOfLines={1} style={[styles.thumbDigitalLabel, { color: colors.textLight }]}>{clockThumbnailData.label}</Text>
                              <View style={styles.thumbDigitalSeparator} />
                              <MaterialCommunityIcons name="mosque" size={16} color="#0d8e62" />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
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
                  <MaterialCommunityIcons name="star-crescent" size={20} color={isDarkMode ? '#ffd700' : '#B8860B'} />
                  <Text style={styles.lastThirdText}>{t('prayer.lastThirdMessage')}</Text>
                </Animated.View>
              )}

              <Animated.View entering={FadeInDown.delay(300).duration(500)}>
                <PrayerList prayerTimes={prayerTimes} language={language} isDarkMode={isDarkMode} notificationSettings={prayerSettings?.notifications} onToggleNotification={handleToggleNotification} showNotificationToggle showSunrise={settings.prayer.showSunrise} show24Hour={settings.prayer.show24Hour} prayerStatuses={(todayPrayer || undefined) as any} onPrayerLongPress={openPrayerStatusModal} />
              </Animated.View>

              {/* Long-press hint banner */}
              <Animated.View entering={FadeInDown.delay(350).duration(500)} style={[styles.longPressHint, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {Platform.OS === 'ios' && (
                  <BlurView intensity={60} tint={(isDarkMode ? 'systemThinMaterialDark' : 'systemThinMaterialLight') as any} style={StyleSheet.absoluteFill} />
                )}
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(192,123,16,0.14)' }]} />
                <MaterialCommunityIcons name="gesture-tap-hold" size={18} color="#c07b10" />
                <Text style={[styles.longPressHintText, { color: colors.glassText, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                  {t('prayer.longPressToTrack')}
                </Text>
              </Animated.View>

              {prayerTimes && (
                <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.extraInfo}>
                  {Platform.OS === 'ios' && (
                    <BlurView intensity={80} tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any} style={StyleSheet.absoluteFill} />
                  )}
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.40)' : 'rgba(255,255,255,0.60)' }]} />
                  <Text style={[styles.extraTitle, { color: colors.glassText, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('prayer.extraTimes')}</Text>
                  <View style={[styles.extraRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={styles.extraItem}>
                      <MaterialCommunityIcons name="weather-night" size={20} color={colors.glassIcon} />
                      <Text style={[styles.extraLabel, { color: colors.glassTextLight }]}>{t('prayer.midnight')}</Text>
                      <Text style={[styles.extraValue, { color: colors.glassText }]}>{formatPrayerTime(prayerTimes.midnight, settings.prayer.show24Hour)}</Text>
                    </View>
                    <View style={styles.extraItem}>
                      <MaterialCommunityIcons name="star-crescent" size={20} color={colors.glassIcon} />
                      <Text style={[styles.extraLabel, { color: colors.glassTextLight }]}>{t('prayer.lastThird')}</Text>
                      <Text style={[styles.extraValue, { color: colors.glassText }]}>{formatPrayerTime(prayerTimes.lastThird, settings.prayer.show24Hour)}</Text>
                    </View>
                  </View>
                </Animated.View>
              )}

              {/* Qibla button removed as requested */}

              {/* صلاتي - Smart Prayer Tracker Card */}
              <Animated.View entering={FadeInDown.delay(500).duration(500)}>
                <TouchableOpacity
                  style={styles.salatiCard}
                  onPress={() => router.push('/salati')}
                  activeOpacity={0.8}
                >
                  {Platform.OS === 'ios' && (
                    <BlurView intensity={80} tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any} style={StyleSheet.absoluteFill} />
                  )}
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.40)' : 'rgba(255,255,255,0.60)' }]} />
                  
                  <View style={[styles.salatiContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    {/* Chevron */}
                    <MaterialCommunityIcons
                      name={isRTL ? 'chevron-right' : 'chevron-left'}
                      size={24}
                      color={colors.glassTextLight}
                    />
                    
                    {/* Text */}
                    <View style={[styles.salatiTextContainer, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                      <Text style={[styles.salatiTitle, { color: colors.glassText, textAlign: isRTL ? 'right' : 'left' }]}>
                        {t('smartTracker.title')}
                      </Text>
                      <Text style={[styles.salatiSubtitle, { color: colors.glassTextLight, textAlign: isRTL ? 'right' : 'left' }]}>
                        {t('smartTracker.subtitle')}
                      </Text>
                    </View>
                    
                    {/* Icon */}
                    <View style={styles.salatiIconContainer}>
                      <SujudIcon
                        width={32}
                        height={32}
                        fill="#0d8e62"
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>

              <View style={styles.bottomSpace} />
            </>
          )}
        </ScrollView>

        {topSelectedKey !== 'qibla' && <BannerAdComponent screen="prayer" inTabScreen />}



        <Modal visible={showSettings} animationType="slide" transparent onRequestClose={() => setShowSettings(false)}>
          <View style={settingsStyles.overlay}>
            <GlassCard style={settingsStyles.content}>
              <View style={[settingsStyles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={[settingsStyles.title, { color: colors.text }]}>{t('prayer.prayerSettingsTitle')}</Text>
                <TouchableOpacity onPress={() => setShowSettings(false)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(34, 197, 94, 0.15)', alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialCommunityIcons name="close" size={18} color={colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 16 }}>
                {/* الضبط تلقائيًا — Switch toggle */}
                <GlassToggle
                  label={t('prayer.autoAdjust')}
                  subtitle={isAutoMode ? (autoMethodLabel ? t('prayer.methodAutomaticDescWithMethod').replace('{method}', autoMethodLabel) : t('prayer.methodAutomaticDesc')) : undefined}
                  icon="earth"
                  iconColor={isAutoMode ? '#0d8e62' : colors.textLight}
                  enabled={isAutoMode}
                  onToggle={(val) => handleToggleAutoMethod(val)}
                />

                {/* Manual method picker — only when auto is OFF */}
                {!isAutoMode && (
                  <>
                    <Text style={[settingsStyles.sectionLabel, { color: colors.textLight, marginTop: 16, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('prayer.calculationMethod')}</Text>
                    <TouchableOpacity
                      style={[settingsStyles.dropdownBtn, { backgroundColor: 'rgba(34, 197, 94, 0.15)', flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                      onPress={() => setShowMethodPicker(prev => !prev)}
                    >
                      <Text style={[settingsStyles.methodLabel, { color: colors.text, flex: 1, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                        {PRAYER_METHODS.find(m => m.value === settings.prayer.calculationMethod)?.label || t('prayer.choose')}
                      </Text>
                      <MaterialCommunityIcons name={showMethodPicker ? 'chevron-up' : 'chevron-down'} size={22} color={colors.textLight} />
                    </TouchableOpacity>
                    {showMethodPicker && (
                      <View style={[settingsStyles.dropdownList, { backgroundColor: isDarkMode ? 'rgba(30,30,35,0.95)' : 'rgba(255,255,255,0.95)' }]}>
                        {PRAYER_METHODS.map((method) => (
                          <TouchableOpacity key={method.value} style={[settingsStyles.dropdownItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }, settings.prayer.calculationMethod === method.value && { backgroundColor: 'rgba(6,79,47,0.12)' }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); updatePrayer({ calculationMethod: method.value, methodManuallySet: true }); setShowMethodPicker(false); }}>
                            <View style={{ flex: 1 }}><Text style={[settingsStyles.methodLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{method.label}</Text><Text style={[settingsStyles.methodSub, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{method.subtitle}</Text></View>
                            {settings.prayer.calculationMethod === method.value && <MaterialCommunityIcons name="check" size={18} color="#0d8e62" />}
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </>
                )}

                {/* مذهب العصر — only when auto is OFF */}
                {!isAutoMode && (
                  <>
                    <Text style={[settingsStyles.sectionLabel, { color: colors.textLight, marginTop: 20, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('prayer.asrMethod')}</Text>
                    <TouchableOpacity
                      style={[settingsStyles.dropdownBtn, { backgroundColor: 'rgba(34, 197, 94, 0.15)', flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                      onPress={() => setShowAsrPicker(prev => !prev)}
                    >
                      <Text style={[settingsStyles.methodLabel, { color: colors.text, flex: 1, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                        {ASR_METHODS.find(m => m.value === settings.prayer.asrJuristic)?.label || t('prayer.choose')}
                      </Text>
                      <MaterialCommunityIcons name={showAsrPicker ? 'chevron-up' : 'chevron-down'} size={22} color={colors.textLight} />
                    </TouchableOpacity>
                    {showAsrPicker && (
                      <View style={[settingsStyles.dropdownList, { backgroundColor: isDarkMode ? 'rgba(30,30,35,0.95)' : 'rgba(255,255,255,0.95)' }]}>
                        {ASR_METHODS.map((method) => (
                          <TouchableOpacity key={method.value} style={[settingsStyles.dropdownItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }, settings.prayer.asrJuristic === method.value && { backgroundColor: 'rgba(6,79,47,0.12)' }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); updatePrayer({ asrJuristic: method.value as 0 | 1 }); setShowAsrPicker(false); }}>
                            <View style={{ flex: 1 }}><Text style={[settingsStyles.methodLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{method.label}</Text><Text style={[settingsStyles.methodSub, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{method.subtitle}</Text></View>
                            {settings.prayer.asrJuristic === method.value && <MaterialCommunityIcons name="check" size={18} color="#0d8e62" />}
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </>
                )}

                {/* ضبط يدوي لأوقات الصلاة — يظهر فقط عند إيقاف الضبط التلقائي */}
                {!isAutoMode && (
                  <>
                    <Text style={[settingsStyles.sectionLabel, { color: colors.textLight, marginTop: 20, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('prayerAdjustments.title')}</Text>
                    {(['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).map((prayer) => {
                      const adj = settings.prayer.adjustments?.[prayer] || 0;
                      const prayerTime = prayerTimes ? formatPrayerTime(prayerTimes[prayer], settings.prayer.show24Hour) : '--:--';
                      const prayerLabel = t(('prayer.' + prayer) as any);
                      return (
                        <View key={prayer} style={[settingsStyles.adjustRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                          <Text style={[settingsStyles.adjustLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
                            {prayerLabel}  :  {prayerTime}
                          </Text>
                          <View style={[settingsStyles.stepperWrap, { flexDirection: 'row' }]}>
                            <TouchableOpacity
                              style={settingsStyles.stepperBtn}
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                updatePrayer({ adjustments: { ...settings.prayer.adjustments, [prayer]: Math.min((adj || 0) + 1, 30) } });
                              }}
                            >
                              <MaterialCommunityIcons name="plus" size={18} color={colors.text} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={settingsStyles.stepperBtn}
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                updatePrayer({ adjustments: { ...settings.prayer.adjustments, [prayer]: Math.max((adj || 0) - 1, -30) } });
                              }}
                            >
                              <MaterialCommunityIcons name="minus" size={18} color={colors.text} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </>
                )}

                <Text style={[settingsStyles.sectionLabel, { color: colors.textLight, marginTop: 20, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('prayer.displayOptions')}</Text>
                <GlassToggle label={t('prayer.showSunrise')} icon="weather-sunny" enabled={settings.prayer.showSunrise} onToggle={(val) => updatePrayer({ showSunrise: val })} />
                <GlassToggle label={t('prayer.hourFormat24')} icon="clock-digital" enabled={settings.prayer.show24Hour} onToggle={(val) => updatePrayer({ show24Hour: val })} />
                <GlassToggle label={t('prayer.showDate')} icon="calendar" enabled={settings.prayer.showDate !== false} onToggle={(val) => updatePrayer({ showDate: val })} />
                <GlassToggle label={t('prayer.showLocation')} icon="map-marker" enabled={settings.prayer.showLocation !== false} onToggle={(val) => updatePrayer({ showLocation: val })} />

                {/* الأنشطة الحية — iOS 16.1+ */}
                {Platform.OS === 'ios' && (
                  <>
                    <Text style={[settingsStyles.sectionLabel, { color: colors.textLight, marginTop: 20, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('prayer.liveActivities')}</Text>
                    <GlassToggle
                      label={t('prayer.enableLiveActivity')}
                      icon="cellphone-nfc"
                      enabled={liveActivityEnabled}
                      onToggle={handleLiveActivityToggle}
                    />
                    {liveActivityEnabled && (
                      <View style={{ marginTop: 8, gap: Spacing.sm }}>
                        {LIVE_ACTIVITY_STYLES.map((s) => (
                          <View key={s.id} style={{ borderRadius: 12, overflow: 'hidden' }}>
                            {liveActivityStyle !== s.id && Platform.OS === 'ios' && (
                              <BlurView intensity={80} tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any} style={StyleSheet.absoluteFill} />
                            )}
                            {liveActivityStyle !== s.id && (
                              <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.40)' : 'rgba(255,255,255,0.60)' }]} />
                            )}
                            <TouchableOpacity
                              style={[
                                settingsStyles.dropdownItem,
                                {
                                  flexDirection: isRTL ? 'row-reverse' : 'row',
                                  backgroundColor: liveActivityStyle === s.id
                                    ? 'rgba(6,79,47,0.15)'
                                    : 'transparent',
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
                              <Text style={[settingsStyles.methodLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                                {s.nameAr}
                              </Text>
                              <Text style={[settingsStyles.methodSub, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                                {s.descAr}
                              </Text>
                            </View>
                              {liveActivityStyle === s.id && (
                                <MaterialCommunityIcons name="check" size={18} color="#0d8e62" />
                              )}
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}
                    {!liveActivitySupported && (
                      <Text style={{ color: colors.textLight, fontSize: colors.fs(12), fontFamily: fontRegular(), marginTop: 6, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }}>
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

        {/* Long-press status modal (mawaqit list → record prayer status) */}
        <Modal
          visible={statusModal.visible}
          transparent
          animationType="fade"
          onRequestClose={() => setStatusModal({ visible: false, prayer: null, current: 'none' })}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.statusModalBackdrop}
            onPress={() => setStatusModal({ visible: false, prayer: null, current: 'none' })}
          >
            <TouchableOpacity activeOpacity={1} style={[styles.statusModalSheet, { backgroundColor: colors.modalSurface }]} onPress={() => {}}>
              <View style={[styles.statusModalHandle, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.18)' }]} />
              <Text style={[styles.statusModalTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {statusModal.prayer ? t(`prayer.${statusModal.prayer}`) : ''}
              </Text>
              {PRAYER_STATUS_OPTIONS.map(opt => {
                const selected = statusModal.current === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    activeOpacity={0.7}
                    onPress={() => handleSelectPrayerStatus(opt.value)}
                    style={[
                      styles.statusOptionRow,
                      { flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: selected ? `${opt.color}1f` : 'transparent', borderWidth: selected ? 1 : 0, borderColor: opt.color },
                    ]}
                  >
                    <MaterialCommunityIcons name={opt.icon} size={24} color={opt.color} />
                    <Text style={[styles.statusOptionLabel, { color: opt.color, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                      {t(opt.labelKey)}
                    </Text>
                    {selected && <MaterialCommunityIcons name="check" size={20} color={opt.color} />}
                  </TouchableOpacity>
                );
              })}
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

const _styles = StyleSheet.create({
  container: { flex: 1 },
  containerDark: {},
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 8 },
  headerTitle: { fontSize: 20, fontFamily: fontBold(), lineHeight: 34, includeFontPadding: false },
  dateRow: { justifyContent: 'center', alignItems: 'center', paddingBottom: 6, gap: Spacing.sm, flexWrap: 'wrap', paddingHorizontal: 16 },
  dateRowText: { fontSize: 12, fontFamily: fontMedium(), lineHeight: 20, includeFontPadding: false },
  dateRowSep: { fontSize: 12, opacity: 0.5, lineHeight: 20, includeFontPadding: false },
  methodBadgeRow: { justifyContent: 'center', alignItems: 'center', paddingBottom: 4, gap: 2 },
  methodBadgeText: { fontSize: 11, fontFamily: fontRegular(), opacity: 0.7, includeFontPadding: false },
  headerButton: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  topNavTabsWrap: { paddingHorizontal: 16, paddingBottom: 8, marginTop: 10 },
  scrollContent: { paddingVertical: 10, paddingBottom: 160 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffebee', marginHorizontal: 16, marginVertical: 10, padding: 15, borderRadius: 12, gap: Spacing.sm },
  errorText: { flex: 1, fontSize: 14, fontFamily: fontMedium(), color: '#c62828', lineHeight: 24, includeFontPadding: false },
  retryButton: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#ef5350', borderRadius: 8 },
  retryText: { fontSize: 12, fontFamily: fontSemiBold(), color: '#fff' },
  staleBanner: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginVertical: 8, padding: 14, borderRadius: 12, gap: Spacing.sm, borderWidth: 0.5, borderColor: 'rgba(255,152,0,0.3)' },
  staleBannerText: { fontSize: 13, fontFamily: fontMedium(), lineHeight: 22, includeFontPadding: false },
  staleBannerSubtext: { fontSize: 11, fontFamily: fontRegular(), lineHeight: 18, includeFontPadding: false, marginTop: 2 },
  staleBannerRefresh: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  circularContainer: { paddingVertical: 30 },
  lastThirdBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a237e', marginHorizontal: 16, marginVertical: 10, padding: 15, borderRadius: 12, gap: Spacing.sm },
  lastThirdText: { flex: 1, fontSize: 14, fontFamily: fontMedium(), color: '#fff', lineHeight: 24, includeFontPadding: false },
  longPressHint: { alignItems: 'center', marginHorizontal: 16, marginTop: 8, marginBottom: 4, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, overflow: 'hidden', gap: 8, borderWidth: 1, borderColor: 'rgba(192,123,16,0.32)' },
  longPressHintText: { flex: 1, fontSize: 13, fontFamily: fontMedium(), lineHeight: 20, includeFontPadding: false },
  // Status modal (long-press → choose status)
  statusModalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' },
  statusModalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  statusModalHandle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, marginBottom: 14, opacity: 0.6 },
  statusModalTitle: { fontSize: 17, fontFamily: fontBold(), marginBottom: 16 },
  statusOptionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 14, gap: 14, marginBottom: 6 },
  statusOptionLabel: { flex: 1, fontSize: 16, fontFamily: fontSemiBold() },
  extraInfo: { marginHorizontal: 16, marginVertical: 10, padding: 20, borderRadius: 20, overflow: 'hidden' },
  extraTitle: { fontSize: 16, fontFamily: fontBold(), marginBottom: 15, lineHeight: 28, includeFontPadding: false },
  extraRow: { flexDirection: 'row', justifyContent: 'space-around' },
  extraItem: { alignItems: 'center', gap: Spacing.xs },
  extraLabel: { fontSize: 12, fontFamily: fontRegular(), lineHeight: 20, includeFontPadding: false },
  extraValue: { fontSize: 16, fontFamily: fontBold(), lineHeight: 28, includeFontPadding: false },
  bottomSpace: { height: 100 },
  // صلاتي card styles
  salatiCard: { marginHorizontal: 16, marginVertical: 10, borderRadius: 20, overflow: 'hidden' },
  salatiContent: { paddingHorizontal: 16, paddingVertical: 16, alignItems: 'center', gap: 12 },
  salatiIconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(13, 142, 98, 0.15)', alignItems: 'center', justifyContent: 'center' },
  salatiTextContainer: { flex: 1 },
  salatiTitle: { fontSize: 18, fontFamily: fontBold(), lineHeight: 28, includeFontPadding: false },
  salatiSubtitle: { fontSize: 13, fontFamily: fontRegular(), lineHeight: 22, includeFontPadding: false },
  // Qibla button styles removed
  toggleContainer: { marginHorizontal: 16, marginBottom: 16 },
  widgetContainer: { minHeight: 180, minWidth: 320, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', marginVertical: 18, padding: 18 },
  placeholderText: { color: '#fff', fontSize: 18, opacity: 0.7, fontFamily: fontBold() },
  // Clock style selector (thumbnail-based, similar to Qibla)
  clockStyleSelectorWrap: { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 8 },
  clockThumbnailsContainer: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  clockThumbnailsContainerAndroidFlat: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingVertical: 0,
  },
  clockStyleSelectorScroll: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: Spacing.sm },
  clockStyleThumbnail: {
    width: CLOCK_THUMB_SIZE + 16,
    borderRadius: 16,
    backgroundColor: Platform.OS === 'android' ? 'transparent' : 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Platform.OS === 'android' ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  clockStyleThumbnailActive: {
    borderColor: '#0d8e62',
    backgroundColor: Platform.OS === 'android' ? 'transparent' : 'rgba(6,79,47,0.18)',
    shadowColor: '#0d8e62',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 0,
  },
  clockStyleLabel: { fontSize: 10, fontFamily: fontSemiBold(), marginTop: 3 },
  clockStyleLabelActive: { color: '#2ECC71' },
  clockStyleActiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#2ECC71', marginTop: 2 },
  // Widget thumbnail — miniature of RectangleWidgetView
  thumbWidgetContainer: { width: CLOCK_THUMB_SIZE, height: CLOCK_THUMB_SIZE - 12, alignItems: 'center', justifyContent: 'center' },
  thumbWidgetCard: { width: CLOCK_THUMB_SIZE - 4, height: CLOCK_THUMB_SIZE - 16, borderRadius: 8, justifyContent: 'center', paddingHorizontal: 4 },
  thumbWidgetRow: { alignItems: 'center', justifyContent: 'space-between' },
  thumbWidgetLogoSide: { alignItems: 'center', gap: 1 },
  thumbWidgetLogo: { width: 18, height: 18, borderRadius: 5 },
  thumbWidgetAppName: { fontSize: 4, fontFamily: fontSemiBold(), color: '#0d8e62' },
  thumbWidgetCountdownSide: { alignItems: 'center' },
  thumbWidgetCountdown: { fontSize: 10, fontFamily: fontBold(), letterSpacing: 0 },
  thumbWidgetPrayerLabel: { fontSize: 5, fontFamily: fontSemiBold() },
  // Analog thumbnail
  thumbAnalogContainer: { width: CLOCK_THUMB_SIZE, height: CLOCK_THUMB_SIZE - 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', overflow: 'visible' },
  // Digital thumbnail
  thumbDigitalContainer: { width: CLOCK_THUMB_SIZE, height: CLOCK_THUMB_SIZE - 12, alignItems: 'center', justifyContent: 'center' },
  thumbDigitalTime: { fontSize: 11, fontFamily: fontBold(), letterSpacing: 0 },
  thumbDigitalLabel: { fontSize: 7, fontFamily: fontSemiBold(), marginTop: -2 },
  thumbDigitalSeparator: { width: 20, height: 1, backgroundColor: 'rgba(6,79,47,0.4)', marginVertical: 2 },
  thumbDigitalCountdown: { fontSize: 9, fontFamily: fontBold() },
});

const settingsStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' },
  content: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderRadius: 0, height: '75%', padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 20, fontFamily: fontBold(), lineHeight: 34, includeFontPadding: false },
  sectionLabel: { fontSize: 14, fontFamily: fontBold(), marginBottom: 10, lineHeight: 24, includeFontPadding: false },
  methodItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 8 },
  methodLabel: { fontSize: 15, fontFamily: fontSemiBold(), lineHeight: 26, includeFontPadding: false },
  methodSub: { fontSize: 12, fontFamily: fontRegular(), marginTop: 2, lineHeight: 20, includeFontPadding: false },
  dropdownBtn: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 4 },
  dropdownList: { borderRadius: 12, marginBottom: 8, overflow: 'hidden' as const },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 0.5, borderBottomColor: 'rgba(120,120,128,0.12)' },
  adjustRow: { alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(120,120,128,0.15)' },
  adjustLabel: { flex: 1, fontSize: 15, fontFamily: fontSemiBold() },
  stepperWrap: { gap: 8 },
  stepperBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(120,120,128,0.12)', alignItems: 'center' as const, justifyContent: 'center' as const },
});
const styles = _styles;
