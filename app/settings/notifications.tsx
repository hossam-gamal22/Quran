// app/settings/notifications.tsx
// صفحة إعدادات الإشعارات الموحدة - روح المسلم

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  Linking,
  ActivityIndicator,
  LayoutAnimation,
  UIManager,
  TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { fontBold, fontMedium, fontRegular, fontSemiBold } from '@/lib/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Audio } from 'expo-av';
import Animated, { FadeInDown } from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useSettings, NotificationSoundType, AdhanSoundType, ReminderSoundType } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { Colors, DarkColors } from '@/constants/theme';
import { t } from '@/lib/i18n';
import { ADHAN_SOUNDS as ADHAN_SOUND_FILES, NOTIFICATION_SOUNDS as NOTIFICATION_SOUND_FILES, fetchDisabledBundledSounds } from '@/lib/sound-manager';
import { getSurahName } from '@/lib/quran-api';
import { fetchDownloadableSounds, getDownloadedSounds, downloadSound, isSoundDownloaded, type DownloadableSound, type DownloadedSound } from '@/lib/downloadable-sounds';
import { sendTestNotification } from '@/lib/notifications-manager';


// Removed: interstitial ads on sound download to reduce user frustration
import { useIsRTL } from '@/hooks/use-is-rtl';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { guardPremiumFeature } from '@/lib/premium-guard';

// ========================================
// الثوابت
// ========================================

const NOTIFICATION_SOUNDS: { id: NotificationSoundType; nameKey: string; icon: string }[] = [
  { id: 'default', nameKey: 'notificationSounds.defaultSound', icon: 'bell-ring' },
  { id: 'salawat', nameKey: 'notificationSounds.salawatProphet', icon: 'volume-high' },
  { id: 'tasbih', nameKey: 'notificationSounds.subhanallahBihamdihi', icon: 'volume-high' },
  { id: 'subhanallah', nameKey: 'notificationSounds.subhanallah', icon: 'volume-high' },
  { id: 'alhamdulillah', nameKey: 'notificationSounds.alhamdulillah', icon: 'volume-high' },
  { id: 'istighfar', nameKey: 'notificationSounds.astaghfirullah', icon: 'volume-high' },
  { id: 'general_reminder', nameKey: 'notificationSounds.reminderTone', icon: 'volume-high' },
  { id: 'silent', nameKey: 'notificationSounds.silent', icon: 'bell-off' },
];

// Reminder sounds available for per-category selection
const REMINDER_SOUNDS: { id: ReminderSoundType; nameKey: string }[] = [
  { id: 'default', nameKey: 'notificationSounds.defaultSound' },
  { id: 'salawat', nameKey: 'notificationSounds.salawatProphet' },
  { id: 'tasbih', nameKey: 'notificationSounds.subhanallahBihamdihi' },
  { id: 'subhanallah', nameKey: 'notificationSounds.subhanallah' },
  { id: 'alhamdulillah', nameKey: 'notificationSounds.alhamdulillah' },
  { id: 'istighfar', nameKey: 'notificationSounds.astaghfirullah' },
  { id: 'general_reminder', nameKey: 'notificationSounds.reminderTone' },
  { id: 'silent', nameKey: 'notificationSounds.silent' },
];

const FREE_ADHAN_IDS: AdhanSoundType[] = ['default', 'makkah', 'madinah', 'alaqsa', 'silent'];

const ADHAN_SOUNDS: { id: AdhanSoundType; name: string; description: string; icon: string }[] = [
  { id: 'default', name: t('notificationSounds.defaultSound'), description: t('notificationSounds.systemSound'), icon: 'bell-ring' },
  { id: 'makkah', name: t('notificationSounds.makkah'), description: t('notificationSounds.makkahDesc'), icon: 'volume-high' },
  { id: 'madinah', name: t('notificationSounds.madinah'), description: t('notificationSounds.madinahDesc'), icon: 'volume-high' },
  { id: 'alaqsa', name: t('notificationSounds.alaqsa'), description: t('notificationSounds.alaqsaDesc'), icon: 'volume-high' },
  { id: 'mishary', name: t('notificationSounds.mishary'), description: t('notificationSounds.misharyDesc'), icon: 'volume-high' },
  { id: 'abdulbasit', name: t('notificationSounds.abdulbasit'), description: t('notificationSounds.abdulbasitDesc'), icon: 'volume-high' },
  { id: 'sudais', name: t('notificationSounds.sudais'), description: t('notificationSounds.sudaisDesc'), icon: 'volume-high' },
  { id: 'egypt', name: t('notificationSounds.egypt'), description: t('notificationSounds.egyptDesc'), icon: 'volume-high' },
  { id: 'dosari', name: t('notificationSounds.dosari'), description: t('notificationSounds.dosariDesc'), icon: 'volume-high' },
  { id: 'ajman', name: t('notificationSounds.ajman'), description: t('notificationSounds.ajmanDesc'), icon: 'volume-high' },
  { id: 'ali_mulla', name: t('notificationSounds.ali_mulla'), description: t('notificationSounds.ali_mullaDesc'), icon: 'volume-high' },
  { id: 'naqshbandi', name: t('notificationSounds.naqshbandi'), description: t('notificationSounds.naqshbandiDesc'), icon: 'volume-high' },
  { id: 'sharif', name: t('notificationSounds.sharif'), description: t('notificationSounds.sharifDesc'), icon: 'volume-high' },
  { id: 'mansoor_zahrani', name: t('notificationSounds.mansoor_zahrani'), description: t('notificationSounds.mansoor_zahraniDesc'), icon: 'volume-high' },
  { id: 'haramain', name: t('notificationSounds.haramain'), description: t('notificationSounds.haramainDesc'), icon: 'volume-high' },
  { id: 'silent', name: t('notificationSounds.silent'), description: t('notificationSounds.silentDesc'), icon: 'bell-off' },
];

// Ayah counts per surah (114 surahs)
const AYAH_COUNTS = [
  7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,
  112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,
  54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,
  14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,45,33,27,
  57,29,19,18,12,11,82,8,11,98,5,8,8,19,5,8,8,11,11,8,
  3,9,5,4,7,3,6,3,5,4,5,6,4,4
];

// Content type options for custom reminder
const CONTENT_TYPES: { id: 'text' | 'surah'; labelKey: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { id: 'text', labelKey: 'notificationSounds.freeText', icon: 'pencil-outline' },
  { id: 'surah', labelKey: 'notificationSounds.surah', icon: 'bookshelf' },
];

const REMINDER_OPTIONS = [
  { value: 5, label: t('notificationSounds.minutesBefore', { count: '5' }) },
  { value: 10, label: t('notificationSounds.minutesBefore', { count: '10' }) },
  { value: 15, label: t('notificationSounds.minutesBefore', { count: '15' }) },
  { value: 20, label: t('notificationSounds.minutesBefore', { count: '20' }) },
  { value: 30, label: t('notificationSounds.minutesBefore', { count: '30' }) },
];

const PRAYER_NAMES = [
  { key: 'fajr', name: t('prayer.fajr'), icon: 'weather-sunset-up' },
  { key: 'sunrise', name: t('prayer.sunrise'), icon: 'white-balance-sunny' },
  { key: 'dhuhr', name: t('prayer.dhuhr'), icon: 'weather-sunny' },
  { key: 'asr', name: t('prayer.asr'), icon: 'weather-sunny-alert' },
  { key: 'maghrib', name: t('prayer.maghrib'), icon: 'weather-sunset-down' },
  { key: 'isha', name: t('prayer.isha'), icon: 'weather-night' },
];

// Notification category definitions
interface NotificationCategoryDef {
  id: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor: string;
  titleKey: string;
  subtitleKey: string;
}

const NOTIFICATION_CATEGORIES: NotificationCategoryDef[] = [
  {
    id: 'prayer',
    icon: 'mosque',
    iconColor: '#0d8e62',
    titleKey: 'notificationSounds.prayer',
    subtitleKey: 'notificationSounds.prayerTimesAlerts',
  },
  {
    id: 'salawat',
    icon: 'heart',
    iconColor: '#d4a039',
    titleKey: 'notificationSounds.salawatProphet',
    subtitleKey: 'notificationSounds.salawatReminder',
  },
  {
    id: 'tasbih',
    icon: 'counter',
    iconColor: '#2896a5',
    titleKey: 'notificationSounds.tasbeeh',
    subtitleKey: 'notificationSounds.tasbeehReminder',
  },
  {
    id: 'istighfar',
    icon: 'hand-heart',
    iconColor: '#7c5bbf',
    titleKey: 'notificationSounds.istighfar',
    subtitleKey: 'notificationSounds.istighfarReminder',
  },
  {
    id: 'azkar',
    icon: 'book-open-variant',
    iconColor: '#c07b10',
    titleKey: 'notificationSounds.adhkar',
    subtitleKey: 'notificationSounds.adhkarDesc',
  },
  {
    id: 'dailyVerse',
    icon: 'book-open-page-variant',
    iconColor: '#0d8e62',
    titleKey: 'notificationSounds.verseOfDay',
    subtitleKey: 'notificationSounds.verseOfDayDesc',
  },
  {
    id: 'quranReading',
    icon: 'bookshelf',
    iconColor: '#2E7D32',
    titleKey: 'settings.quranReadingNotifTitle',
    subtitleKey: 'settings.quranReadingNotifBody',
  },
  {
    id: 'worshipDailySummary',
    icon: 'clipboard-check',
    iconColor: '#F57C00',
    titleKey: 'settings.worshipDailySummaryTitle',
    subtitleKey: 'settings.worshipDailySummaryBody',
  },
  {
    id: 'worshipWeeklyReport',
    icon: 'chart-bar',
    iconColor: '#5C6BC0',
    titleKey: 'settings.worshipWeeklyReportTitle',
    subtitleKey: 'settings.worshipWeeklyReportBody',
  },
  {
    id: 'customReminder',
    icon: 'bell-plus',
    iconColor: '#b85c16', // Darker orange for better light mode contrast
    titleKey: 'notificationSounds.customNotification',
    subtitleKey: 'notificationSounds.customNotificationDesc',
  },
  {
    id: 'kahf',
    icon: 'book-open-variant',
    iconColor: '#1a6b4a',
    titleKey: 'settings.kahfFriday',
    subtitleKey: 'settings.kahfBody',
  },
];

// ========================================
// Helper functions
// ========================================

const formatDisplayTime = (timeStr: string): string => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? t('notificationSounds.pm') : t('notificationSounds.am');
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

const parseTime = (timeStr: string): Date => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

const formatTime = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

const springLayoutAnimation = () => {
  LayoutAnimation.configureNext({
    duration: 350,
    create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    update: { type: LayoutAnimation.Types.spring, springDamping: 0.85 },
    delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
  });
};



// ========================================
// المكون الرئيسي
// ========================================

export default function NotificationsScreen() {
  const isRTL = useIsRTL();
  const router = useRouter();
  const { isPremium } = useSubscription();
  const { settings, isDarkMode, updateNotifications } = useSettings();
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [prayerNotifications, setPrayerNotifications] = useState<{ [key: string]: boolean }>({
    fajr: true,
    sunrise: false,
    dhuhr: true,
    asr: true,
    maghrib: true,
    isha: true,
  });

  // Time picker state
  const [activeTimePicker, setActiveTimePicker] = useState<string | null>(null);

  // Adhan sound list expanded state
  const [adhanListExpanded, setAdhanListExpanded] = useState(false);

  // Sound preview state
  const [previewPlaying, setPreviewPlaying] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const previewSoundRef = useRef<Audio.Sound | null>(null);

  // Downloadable sounds state
  const [downloadableSounds, setDownloadableSounds] = useState<DownloadableSound[]>([]);
  const [downloadedSounds, setDownloadedSounds] = useState<DownloadedSound[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [showDownloadSection, setShowDownloadSection] = useState(false);

  // Custom reminder content picker state
  const [showSurahPicker, setShowSurahPicker] = useState(false);

  // Test notification button state
  const [testingSending, setTestingSending] = useState<string | null>(null);
  const [testingSent, setTestingSent] = useState<string | null>(null);

  // Admin-disabled bundled sounds
  const [disabledSoundIds, setDisabledSoundIds] = useState<Set<string>>(new Set());

  // Load disabled sounds from admin config
  useEffect(() => {
    fetchDisabledBundledSounds()
      .then(setDisabledSoundIds)
      .catch(() => {});
  }, []);

  const stopPreview = useCallback(async () => {
    if (previewSoundRef.current) {
      try {
        await previewSoundRef.current.stopAsync();
        await previewSoundRef.current.unloadAsync();
      } catch { /* ignore */ }
      previewSoundRef.current = null;
    }
    setPreviewPlaying(null);
    setPreviewLoading(null);
  }, []);

  const playPreview = useCallback(async (soundId: string) => {
    if (previewPlaying === soundId) {
      await stopPreview();
      return;
    }
    await stopPreview();

    const bundledSound = ADHAN_SOUND_FILES[soundId] || NOTIFICATION_SOUND_FILES[soundId];
    if (!bundledSound) return;

    setPreviewLoading(soundId);
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      const { sound } = await Audio.Sound.createAsync(
        bundledSound,
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded && status.didJustFinish) {
            stopPreview();
          }
        }
      );
      previewSoundRef.current = sound;
      setPreviewPlaying(soundId);
    } catch {
      // silently fail
    } finally {
      setPreviewLoading(null);
    }
  }, [previewPlaying, stopPreview]);

  useEffect(() => {
    return () => { stopPreview(); };
  }, [stopPreview]);

  useEffect(() => {
    checkPermissions();
  }, []);



  // Load downloadable sounds from Firebase
  useEffect(() => {
    const loadDownloadable = async () => {
      try {
        const [available, downloaded] = await Promise.all([
          fetchDownloadableSounds(),
          getDownloadedSounds(),
        ]);
        setDownloadableSounds(available);
        setDownloadedSounds(downloaded);
      } catch {
        // Non-blocking
      }
    };
    loadDownloadable();
  }, []);

  // Check if ayah is already cached when selection changes


  const handleDownloadSound = async (sound: DownloadableSound) => {
    if (downloadingId) return;
    setDownloadingId(sound.id);
    try {
      // Removed: interstitial ad before sound download to reduce user frustration
      
      const downloaded = await downloadSound(sound);
      setDownloadedSounds(prev => [...prev.filter(s => s.id !== sound.id), downloaded]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setDownloadingId(null);
    }
  };

  const checkPermissions = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setPermissionStatus(status);
    setPermissionChecked(true);
  };

  const requestPermissions = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { status } = await Notifications.requestPermissionsAsync();
    setPermissionStatus(status);

    if (status !== 'granted') {
      Alert.alert(
        t('notificationSounds.notificationsRequired'),
        t('notificationSounds.notificationsRequiredMsg'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('notificationSounds.openSettings'), onPress: () => Linking.openSettings() },
        ]
      );
    } else {
      await updateNotifications({ enabled: true });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleToggleMain = async (enabled: boolean) => {
    if (enabled && permissionStatus !== 'granted') {
      await requestPermissions();
    } else {
      await updateNotifications({ enabled });
    }
  };

  const handleTogglePrayerNotification = (prayerKey: string, value: boolean) => {
    setPrayerNotifications((prev) => ({ ...prev, [prayerKey]: value }));
  };

  const toggleCategory = (categoryId: string) => {
    springLayoutAnimation();
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const collapseCategory = () => {
    springLayoutAnimation();
    setExpandedCategory(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const isEnabled = settings.notifications.enabled && (permissionStatus === 'granted' || !permissionChecked);

  // Get enabled state for each category
  const getCategoryEnabled = (categoryId: string): boolean => {
    switch (categoryId) {
      case 'prayer': return settings.notifications.prayerTimes;
      case 'salawat': return settings.notifications.salawatReminder ?? false;
      case 'tasbih': return settings.notifications.tasbihReminder ?? false;
      case 'istighfar': return settings.notifications.istighfarReminder ?? false;
      case 'azkar': return settings.notifications.morningAzkar || settings.notifications.eveningAzkar || settings.notifications.sleepAzkar || settings.notifications.wakeupAzkar || settings.notifications.afterPrayerAzkar;
      case 'dailyVerse': return settings.notifications.dailyVerse;
      case 'customReminder': return settings.notifications.customReminder ?? false;
      case 'kahf': return settings.notifications.kahfReminder ?? false;
      case 'quranReading': return settings.notifications.quranReadingReminder ?? true;
      case 'worshipDailySummary': return settings.notifications.worshipDailySummary ?? true;
      case 'worshipWeeklyReport': return settings.notifications.worshipWeeklyReport ?? false;
      default: return false;
    }
  };

  // Toggle enabled state for each category
  const toggleCategoryEnabled = (categoryId: string, value: boolean) => {
    switch (categoryId) {
      case 'prayer':
        updateNotifications({ prayerTimes: value });
        break;
      case 'salawat':
        updateNotifications({ salawatReminder: value });
        break;
      case 'tasbih':
        updateNotifications({ tasbihReminder: value });
        break;
      case 'istighfar':
        updateNotifications({ istighfarReminder: value });
        break;
      case 'azkar':
        updateNotifications({ morningAzkar: value, eveningAzkar: value, sleepAzkar: value, wakeupAzkar: value, afterPrayerAzkar: value });
        break;
      case 'dailyVerse':
        updateNotifications({ dailyVerse: value });
        break;
      case 'customReminder':
        updateNotifications({ customReminder: value });
        break;
      case 'kahf':
        updateNotifications({ kahfReminder: value });
        break;
      case 'quranReading':
        updateNotifications({ quranReadingReminder: value });
        break;
      case 'worshipDailySummary':
        updateNotifications({ worshipDailySummary: value });
        break;
      case 'worshipWeeklyReport':
        updateNotifications({ worshipWeeklyReport: value });
        break;
    }
  };

  // Get time for a category
  const getCategoryTime = (categoryId: string): string | null => {
    switch (categoryId) {
      case 'salawat': return settings.notifications.salawatReminderTime ?? '09:00';
      case 'tasbih': return settings.notifications.tasbihReminderTime ?? '15:00';
      case 'istighfar': return settings.notifications.istighfarReminderTime ?? '12:00';
      case 'dailyVerse': return settings.notifications.dailyVerseTime;
      case 'customReminder': return settings.notifications.customReminderTime ?? '08:00';
      case 'quranReading': return settings.notifications.quranReadingReminderTime ?? '21:00';
      case 'worshipDailySummary': return settings.notifications.worshipDailySummaryTime ?? '22:00';
      default: return null;
    }
  };

  // Update time for a category
  const updateCategoryTime = (categoryId: string, time: string) => {
    switch (categoryId) {
      case 'salawat':
        updateNotifications({ salawatReminderTime: time, salawatReminderTimes: [time] });
        break;
      case 'tasbih':
        updateNotifications({ tasbihReminderTime: time, tasbihReminderTimes: [time] });
        break;
      case 'istighfar':
        updateNotifications({ istighfarReminderTime: time, istighfarReminderTimes: [time] });
        break;
      case 'dailyVerse':
        updateNotifications({ dailyVerseTime: time, dailyVerseTimes: [time] });
        break;
      case 'customReminder':
        updateNotifications({ customReminderTime: time, customReminderTimes: [time] });
        break;
      case 'quranReading':
        updateNotifications({ quranReadingReminderTime: time, quranReadingReminderTimes: [time] });
        break;
      case 'worshipDailySummary':
        updateNotifications({ worshipDailySummaryTime: time });
        break;
    }
  };

  const MAX_TIMES = 3;

  // Get times array for a category (multi-time support)
  const getCategoryTimes = (categoryId: string): string[] => {
    const n = settings.notifications;
    switch (categoryId) {
      case 'salawat': return n.salawatReminderTimes ?? [n.salawatReminderTime ?? '09:00'];
      case 'tasbih': return n.tasbihReminderTimes ?? [n.tasbihReminderTime ?? '15:00'];
      case 'istighfar': return n.istighfarReminderTimes ?? [n.istighfarReminderTime ?? '12:00'];
      case 'dailyVerse': return n.dailyVerseTimes ?? [n.dailyVerseTime];
      case 'customReminder': return n.customReminderTimes ?? [n.customReminderTime ?? '08:00'];
      case 'quranReading': return n.quranReadingReminderTimes ?? [n.quranReadingReminderTime];
      case 'morningAzkar': return n.morningAzkarTimes ?? [n.morningAzkarTime];
      case 'eveningAzkar': return n.eveningAzkarTimes ?? [n.eveningAzkarTime];
      case 'sleepAzkar': return n.sleepAzkarTimes ?? [n.sleepAzkarTime];
      case 'wakeupAzkar': return n.wakeupAzkarTimes ?? [n.wakeupAzkarTime];
      default: return [];
    }
  };

  // Update times array for a category
  const updateCategoryTimes = (categoryId: string, times: string[]) => {
    const primary = times[0];
    switch (categoryId) {
      case 'salawat':
        updateNotifications({ salawatReminderTimes: times, salawatReminderTime: primary, notifOverrides: { ...settings.notifications.notifOverrides, salawat: true } });
        break;
      case 'tasbih':
        updateNotifications({ tasbihReminderTimes: times, tasbihReminderTime: primary, notifOverrides: { ...settings.notifications.notifOverrides, tasbih: true } });
        break;
      case 'istighfar':
        updateNotifications({ istighfarReminderTimes: times, istighfarReminderTime: primary, notifOverrides: { ...settings.notifications.notifOverrides, istighfar: true } });
        break;
      case 'dailyVerse':
        updateNotifications({ dailyVerseTimes: times, dailyVerseTime: primary, notifOverrides: { ...settings.notifications.notifOverrides, dailyVerse: true } });
        break;
      case 'customReminder':
        updateNotifications({ customReminderTimes: times, customReminderTime: primary, notifOverrides: { ...settings.notifications.notifOverrides, customReminder: true } });
        break;
      case 'quranReading':
        updateNotifications({ quranReadingReminderTimes: times, quranReadingReminderTime: primary, notifOverrides: { ...settings.notifications.notifOverrides, quranReading: true } });
        break;
      case 'morningAzkar':
        updateNotifications({ morningAzkarTimes: times, morningAzkarTime: primary, notifOverrides: { ...settings.notifications.notifOverrides, morningAzkar: true } });
        break;
      case 'eveningAzkar':
        updateNotifications({ eveningAzkarTimes: times, eveningAzkarTime: primary, notifOverrides: { ...settings.notifications.notifOverrides, eveningAzkar: true } });
        break;
      case 'sleepAzkar':
        updateNotifications({ sleepAzkarTimes: times, sleepAzkarTime: primary, notifOverrides: { ...settings.notifications.notifOverrides, sleepAzkar: true } });
        break;
      case 'wakeupAzkar':
        updateNotifications({ wakeupAzkarTimes: times, wakeupAzkarTime: primary, notifOverrides: { ...settings.notifications.notifOverrides, wakeupAzkar: true } });
        break;
    }
  };

  // Get per-category sound type
  const getCategorySoundType = (categoryId: string): ReminderSoundType => {
    switch (categoryId) {
      case 'salawat': return settings.notifications.salawatSoundType ?? 'salawat';
      case 'tasbih': return settings.notifications.tasbihSoundType ?? 'tasbih';
      case 'istighfar': return settings.notifications.istighfarSoundType ?? 'istighfar';
      case 'azkar': return settings.notifications.azkarSoundType ?? 'general_reminder';
      case 'dailyVerse': return settings.notifications.dailyVerseSoundType ?? 'default';
      case 'customReminder': return settings.notifications.customReminderSoundType ?? 'default';
      case 'quranReading': return settings.notifications.quranReminderSoundType ?? 'general_reminder';
      case 'worshipDailySummary': return settings.notifications.soundType ?? 'general_reminder';
      default: return 'default';
    }
  };

  // Update per-category sound type
  const updateCategorySoundType = (categoryId: string, soundType: ReminderSoundType) => {
    switch (categoryId) {
      case 'salawat':
        updateNotifications({ salawatSoundType: soundType });
        break;
      case 'tasbih':
        updateNotifications({ tasbihSoundType: soundType });
        break;
      case 'istighfar':
        updateNotifications({ istighfarSoundType: soundType });
        break;
      case 'azkar':
        updateNotifications({ azkarSoundType: soundType });
        break;
      case 'dailyVerse':
        updateNotifications({ dailyVerseSoundType: soundType });
        break;
      case 'customReminder':
        updateNotifications({ customReminderSoundType: soundType });
        break;
      case 'quranReading':
        updateNotifications({ quranReminderSoundType: soundType });
        break;
    }
  };



  // Sound mapping description for each category
  const getSoundDescription = (categoryId: string): string => {
    if (categoryId === 'prayer') return t('notificationSounds.selectedAdhanSound');
    const soundType = getCategorySoundType(categoryId);
    const soundItem = REMINDER_SOUNDS.find(s => s.id === soundType);
    return soundItem ? `${t('notificationSounds.soundLabel')} ${t(soundItem.nameKey)}` : t('notificationSounds.defaultTone');
  };

  // ========================================
  // Day-of-week helpers (1=Sun...7=Sat, expo-notifications weekday)
  // ========================================
  const DAY_LABELS = [
    t('notificationSounds.daySun'),
    t('notificationSounds.dayMon'),
    t('notificationSounds.dayTue'),
    t('notificationSounds.dayWed'),
    t('notificationSounds.dayThu'),
    t('notificationSounds.dayFri'),
    t('notificationSounds.daySat'),
  ];
  const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7]; // Sun-Sat

  const getCategoryDays = (categoryId: string): number[] => {
    switch (categoryId) {
      case 'salawat': return settings.notifications.salawatDays ?? ALL_DAYS;
      case 'tasbih': return settings.notifications.tasbihDays ?? ALL_DAYS;
      case 'istighfar': return settings.notifications.istighfarDays ?? ALL_DAYS;
      case 'azkar': return settings.notifications.azkarDays ?? ALL_DAYS;
      case 'dailyVerse': return settings.notifications.dailyVerseDays ?? ALL_DAYS;
      case 'customReminder': return settings.notifications.customReminderDays ?? ALL_DAYS;
      case 'quranReading': return settings.notifications.quranReminderDays ?? ALL_DAYS;
      default: return ALL_DAYS;
    }
  };

  const updateCategoryDays = (categoryId: string, days: number[]) => {
    switch (categoryId) {
      case 'salawat': updateNotifications({ salawatDays: days }); break;
      case 'tasbih': updateNotifications({ tasbihDays: days }); break;
      case 'istighfar': updateNotifications({ istighfarDays: days }); break;
      case 'azkar': updateNotifications({ azkarDays: days }); break;
      case 'dailyVerse': updateNotifications({ dailyVerseDays: days }); break;
      case 'customReminder': updateNotifications({ customReminderDays: days }); break;
      case 'quranReading': updateNotifications({ quranReminderDays: days }); break;
    }
  };

  const toggleDay = (categoryId: string, day: number) => {
    const current = getCategoryDays(categoryId);
    const newDays = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day].sort((a, b) => a - b);
    // Must select at least 1 day
    if (newDays.length > 0) {
      updateCategoryDays(categoryId, newDays);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const renderDayPicker = (categoryId: string) => {
    if (categoryId === 'prayer') return null; // prayer has its own schedule
    const selectedDays = getCategoryDays(categoryId);
    const allSelected = selectedDays.length === 7;

    return (
      <View style={[styles.dayPickerContainer, { borderTopColor: colors.divider }]}>
        <View style={[styles.dayPickerHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <MaterialCommunityIcons name="calendar-week" size={18} color={colors.textLight} />
          <Text style={[styles.dayPickerLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {t('notificationSounds.reminderDays')}
          </Text>
          <TouchableOpacity
            onPress={() => {
              updateCategoryDays(categoryId, allSelected ? [6] : ALL_DAYS); // 6 = Friday default if deselecting all
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Text style={[styles.dayPickerToggleAll, { color: '#0d8e62', textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {allSelected ? t('notificationSounds.customSelection') : t('notificationSounds.allDays')}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.dayChipsRow}>
          {(isRTL ? [...ALL_DAYS].reverse() : ALL_DAYS).map((day) => {
            const index = day - 1; // 1-based day to 0-based label index
            const isSelected = selectedDays.includes(day);
            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayChip,
                  isSelected && styles.dayChipSelected,
                  !isSelected && { backgroundColor: colors.surface },
                ]}
                onPress={() => toggleDay(categoryId, day)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.dayChipText,
                  isSelected && styles.dayChipTextSelected,
                  !isSelected && { color: colors.textLight },
                ]}>
                  {DAY_LABELS[index]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  // ========================================
  // Render category expanded content
  // ========================================

  const renderPrayerExpanded = () => (
    <View style={styles.expandedContent}>
      {/* Prayer reminder toggle */}
      <View style={[styles.innerSettingRow, { borderBottomColor: colors.divider, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.innerSettingInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <MaterialCommunityIcons name="bell-ring" size={18} color="#c07b10" />
          <Text style={[styles.innerSettingTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {t('notificationSounds.reminderBeforeAdhan')}
          </Text>
        </View>
        <Switch
          value={settings.notifications.prayerReminder}
          onValueChange={(val) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            updateNotifications({ prayerReminder: val });
          }}
          trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#0d8e62' }}
          thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
          ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
          disabled={!isEnabled}
        />
      </View>

      {/* Reminder minutes selector */}
      {settings.notifications.prayerReminder && (
        <View style={styles.reminderMinutesContainer}>
          <Text style={[styles.smallLabel, { color: colors.textLight }]}>
            {t('notificationSounds.reminderBeforeAdhanBy')}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }} style={[styles.reminderScroll, isRTL && { transform: [{ scaleX: -1 }] }]}>
            {REMINDER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.chipOption,
                  isDarkMode && { backgroundColor: colors.surface },
                  settings.notifications.reminderMinutes === option.value && styles.chipOptionSelected,
                  isRTL && { transform: [{ scaleX: -1 }] },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateNotifications({ reminderMinutes: option.value });
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipOptionText,
                    { color: colors.textLight },
                    settings.notifications.reminderMinutes === option.value && styles.chipOptionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Individual prayer toggles */}
      <View style={styles.prayerTogglesContainer}>
        <Text style={[styles.smallLabel, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
          {t('notificationSounds.selectPrayers')}
        </Text>
        {PRAYER_NAMES.map((prayer) => (
          <View key={prayer.key} style={[styles.innerSettingRow, { borderBottomColor: colors.divider, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.innerSettingInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <MaterialCommunityIcons
                name={prayer.icon as any}
                size={18}
                color={prayer.key === 'fajr' ? '#4a3d73' : prayer.key === 'isha' ? '#3a7ca5' : '#c17f59'}
              />
              <Text style={[styles.innerSettingTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {prayer.name}
              </Text>
            </View>
            <Switch
              value={prayerNotifications[prayer.key]}
              onValueChange={(val) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                handleTogglePrayerNotification(prayer.key, val);
              }}
              trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#0d8e62' }}
              thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
              ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
              disabled={!isEnabled}
            />
          </View>
        ))}
      </View>

      {/* Adhan sound selection */}
      <View style={styles.adhanSoundSection}>
        {/* Selected sound summary / toggle header */}
        <TouchableOpacity
          style={[styles.adhanSoundHeader, { borderBottomColor: colors.divider, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={() => {
            springLayoutAnimation();
            setAdhanListExpanded(!adhanListExpanded);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="volume-high" size={20} color="#0d8e62" />
          <Text style={[styles.adhanSoundHeaderText, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {t('notificationSounds.adhanSound')}
          </Text>
          {(() => {
            const selectedAdhan = ADHAN_SOUNDS.find(s => s.id === (settings.notifications.adhanSoundType || 'default'));
            return selectedAdhan ? (
              <Text style={[styles.adhanSelectedName, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {selectedAdhan.name}
              </Text>
            ) : null;
          })()}
          <MaterialCommunityIcons
            name={adhanListExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.textLight}
          />
        </TouchableOpacity>

        {/* Selected sound preview row (when collapsed) */}
        {!adhanListExpanded && (() => {
          const selectedId = settings.notifications.adhanSoundType || 'default';
          const selectedSound = ADHAN_SOUNDS.find(s => s.id === selectedId);
          if (!selectedSound || selectedId === 'default') return null;
          return (
            <View style={[styles.adhanSoundOption, { borderBottomColor: colors.divider }, styles.adhanSoundOptionSelected, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.adhanSoundIconBg, styles.adhanSoundIconBgSelected]}>
                <MaterialCommunityIcons name="volume-high" size={18} color="#fff" />
              </View>
              <View style={[styles.adhanSoundContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={[styles.adhanSoundTitle, styles.adhanSoundTitleSelected, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                  {selectedSound.name}
                </Text>
                <Text style={[styles.adhanSoundSubtitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                  {selectedSound.description}
                </Text>
              </View>
              {ADHAN_SOUND_FILES[selectedId] && (
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    playPreview(selectedId);
                  }}
                  style={[styles.previewButton, previewPlaying === selectedId && styles.previewButtonActive]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {previewLoading === selectedId ? (
                    <ActivityIndicator size="small" color="#0d8e62" />
                  ) : (
                    <MaterialCommunityIcons
                      name={previewPlaying === selectedId ? 'stop-circle' : 'play-circle'}
                      size={26}
                      color={previewPlaying === selectedId ? '#ef5350' : '#0d8e62'}
                    />
                  )}
                </TouchableOpacity>
              )}
              <MaterialCommunityIcons name="check-circle" size={22} color="#0d8e62" />
            </View>
          );
        })()}
        {adhanListExpanded && ADHAN_SOUNDS.map((sound) => {
          const isSelected = settings.notifications.adhanSoundType === sound.id;
          const isSoundLocked = !isPremium && !FREE_ADHAN_IDS.includes(sound.id);
          return (
            <TouchableOpacity
              key={sound.id}
              style={[
                styles.adhanSoundOption,
                { borderBottomColor: colors.divider },
                isSelected && styles.adhanSoundOptionSelected,
                { flexDirection: isRTL ? 'row-reverse' : 'row', opacity: isSoundLocked ? 0.6 : 1 },
              ]}
              onPress={() => {
                if (isSoundLocked) {
                  guardPremiumFeature('sound_downloads', router, isPremium);
                  return;
                }
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                updateNotifications({ adhanSoundType: sound.id });
                springLayoutAnimation();
                setAdhanListExpanded(false);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.adhanSoundIconBg, isSelected && styles.adhanSoundIconBgSelected, !isSelected && { backgroundColor: colors.surface }]}>
                <MaterialCommunityIcons
                  name={isSoundLocked ? 'lock' : sound.icon as any}
                  size={18}
                  color={isSelected ? '#fff' : colors.textLight}
                />
              </View>
              <View style={[styles.adhanSoundContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={[
                  styles.adhanSoundTitle,
                  { color: colors.text },
                  isSelected && styles.adhanSoundTitleSelected,
                  { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
                ]}>
                  {sound.name}
                </Text>
                <Text style={[styles.adhanSoundSubtitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                  {sound.description}
                </Text>
              </View>
              {ADHAN_SOUND_FILES[sound.id] && (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation?.();
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    playPreview(sound.id);
                  }}
                  style={[styles.previewButton, previewPlaying === sound.id && styles.previewButtonActive]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {previewLoading === sound.id ? (
                    <ActivityIndicator size="small" color="#0d8e62" />
                  ) : (
                    <MaterialCommunityIcons
                      name={previewPlaying === sound.id ? 'stop-circle' : 'play-circle'}
                      size={26}
                      color={previewPlaying === sound.id ? '#ef5350' : '#0d8e62'}
                    />
                  )}
                </TouchableOpacity>
              )}
              {isSelected && (
                <MaterialCommunityIcons name="check-circle" size={22} color="#0d8e62" />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Test + Close buttons */}
      {renderTestButton('prayer')}
      {renderCloseButton()}
    </View>
  );

  const renderAzkarExpanded = () => (
    <View style={styles.expandedContent}>
      {/* Morning Azkar */}
      <View style={[styles.innerSettingRow, { borderBottomColor: colors.divider, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.innerSettingInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <MaterialCommunityIcons name="weather-sunset-up" size={18} color="#c07b10" />
          <Text style={[styles.innerSettingTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {t('notificationSounds.morningAzkar')}
          </Text>
        </View>
        <Switch
          value={settings.notifications.morningAzkar}
          onValueChange={(val) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            updateNotifications({ morningAzkar: val });
          }}
          trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#0d8e62' }}
          thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
          ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
          disabled={!isEnabled}
        />
      </View>

      {settings.notifications.morningAzkar && renderMultiTimePicker('morningAzkar', '#c07b10')}

      {/* Evening Azkar */}
      <View style={[styles.innerSettingRow, { borderBottomColor: colors.divider, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.innerSettingInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <MaterialCommunityIcons name="weather-sunset-down" size={18} color="#4a3d73" />
          <Text style={[styles.innerSettingTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {t('notificationSounds.eveningAzkar')}
          </Text>
        </View>
        <Switch
          value={settings.notifications.eveningAzkar}
          onValueChange={(val) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            updateNotifications({ eveningAzkar: val });
          }}
          trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#0d8e62' }}
          thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
          ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
          disabled={!isEnabled}
        />
      </View>

      {settings.notifications.eveningAzkar && renderMultiTimePicker('eveningAzkar', '#4a3d73')}

      {/* Sleep Azkar */}
      <View style={[styles.innerSettingRow, { borderBottomColor: colors.divider, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.innerSettingInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <MaterialCommunityIcons name="bed" size={18} color="#3B82F6" />
          <Text style={[styles.innerSettingTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {t('notificationSounds.sleepAzkar')}
          </Text>
        </View>
        <Switch
          value={settings.notifications.sleepAzkar}
          onValueChange={(val) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            updateNotifications({ sleepAzkar: val });
          }}
          trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#0d8e62' }}
          thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
          ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
          disabled={!isEnabled}
        />
      </View>

      {settings.notifications.sleepAzkar && renderMultiTimePicker('sleepAzkar', '#3B82F6')}

      {/* Wakeup Azkar */}
      <View style={[styles.innerSettingRow, { borderBottomColor: colors.divider, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.innerSettingInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <MaterialCommunityIcons name="weather-sunset-up" size={18} color="#10B981" />
          <Text style={[styles.innerSettingTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {t('notificationSounds.wakeupAzkar')}
          </Text>
        </View>
        <Switch
          value={settings.notifications.wakeupAzkar}
          onValueChange={(val) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            updateNotifications({ wakeupAzkar: val });
          }}
          trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#0d8e62' }}
          thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
          ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
          disabled={!isEnabled}
        />
      </View>

      {settings.notifications.wakeupAzkar && renderMultiTimePicker('wakeupAzkar', '#10B981')}

      {/* After Prayer Azkar */}
      <View style={[styles.innerSettingRow, { borderBottomColor: colors.divider, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.innerSettingInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <MaterialCommunityIcons name="hands-pray" size={18} color={isDarkMode ? '#EC4899' : '#BE185D'} />
          <Text style={[styles.innerSettingTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {t('notificationSounds.afterPrayerAzkar')}
          </Text>
        </View>
        <Switch
          value={settings.notifications.afterPrayerAzkar}
          onValueChange={(val) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            updateNotifications({ afterPrayerAzkar: val });
          }}
          trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#0d8e62' }}
          thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
          ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
          disabled={!isEnabled}
        />
      </View>

      {settings.notifications.afterPrayerAzkar && (
        <View style={styles.soundInfoRow}>
          <MaterialCommunityIcons name="information-outline" size={16} color={colors.textLight} />
          <Text style={[styles.soundInfoText, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {t('notificationSounds.afterPrayerAutoMsg')}
          </Text>
        </View>
      )}

      {/* Day-of-week picker for all azkar */}
      {renderDayPicker('azkar')}

      {/* Sound picker */}
      {renderReminderSoundPicker('azkar')}

      {renderTestButton('azkar')}
      {renderCloseButton()}
    </View>
  );

  // Reusable per-category sound picker
  const renderReminderSoundPicker = (categoryId: string) => {
    const selectedSound = getCategorySoundType(categoryId);
    return (
      <View style={styles.reminderSoundSection}>
        <View style={[styles.adhanSoundHeader, { borderBottomColor: colors.divider, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <MaterialCommunityIcons name="volume-high" size={20} color="#0d8e62" />
          <Text style={[styles.adhanSoundHeaderText, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {t('notificationSounds.reminderSound')}
          </Text>
        </View>
        {REMINDER_SOUNDS.filter(s => s.id === 'default' || s.id === 'silent' || !disabledSoundIds.has(s.id)).map((sound) => {
          const isSelected = selectedSound === sound.id;
          return (
            <TouchableOpacity
              key={sound.id}
              style={[
                styles.adhanSoundOption,
                { borderBottomColor: colors.divider },
                isSelected && styles.adhanSoundOptionSelected,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                updateCategorySoundType(categoryId, sound.id);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.adhanSoundIconBg, isSelected && styles.adhanSoundIconBgSelected, !isSelected && { backgroundColor: colors.surface }]}>
                <MaterialCommunityIcons
                  name={sound.id === 'silent' ? 'bell-off' : 'volume-high'}
                  size={18}
                  color={isSelected ? '#fff' : colors.textLight}
                />
              </View>
              <View style={[styles.adhanSoundContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={[
                  styles.adhanSoundTitle,
                  { color: colors.text },
                  isSelected && styles.adhanSoundTitleSelected,
                  { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
                ]}>
                  {t(sound.nameKey)}
                </Text>
              </View>
              {NOTIFICATION_SOUND_FILES[sound.id] && (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation?.();
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    playPreview(sound.id);
                  }}
                  style={[styles.previewButton, previewPlaying === sound.id && styles.previewButtonActive]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {previewLoading === sound.id ? (
                    <ActivityIndicator size="small" color="#0d8e62" />
                  ) : (
                    <MaterialCommunityIcons
                      name={previewPlaying === sound.id ? 'stop-circle' : 'play-circle'}
                      size={26}
                      color={previewPlaying === sound.id ? '#ef5350' : '#0d8e62'}
                    />
                  )}
                </TouchableOpacity>
              )}
              {isSelected && (
                <MaterialCommunityIcons name="check-circle" size={22} color="#0d8e62" />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // Reusable multi-time picker list
  const renderMultiTimePicker = (categoryId: string, iconColor: string) => {
    const times = getCategoryTimes(categoryId);
    if (!times || times.length === 0) return null;

    return (
      <View>
        {times.map((time, index) => {
          const pickerKey = `time_${categoryId}_${index}`;
          return (
            <View key={pickerKey}>
              <View style={[styles.multiTimeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity
                  style={[styles.timePickerRow, { backgroundColor: colors.surface, flexDirection: isRTL ? 'row-reverse' : 'row', flex: 1 }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveTimePicker(activeTimePicker === pickerKey ? null : pickerKey);
                  }}
                >
                  <MaterialCommunityIcons name="clock-outline" size={18} color={iconColor} />
                  <Text style={[styles.timePickerLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                    {times.length > 1 ? `${t('notificationSounds.reminderTime')} ${index + 1}` : t('notificationSounds.reminderTime')}
                  </Text>
                  <Text style={styles.timePickerValue}>
                    {formatDisplayTime(time)}
                  </Text>
                </TouchableOpacity>
                {times.length > 1 && (
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      const newTimes = times.filter((_, i) => i !== index);
                      updateCategoryTimes(categoryId, newTimes);
                    }}
                    style={styles.removeTimeButton}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons name="close-circle" size={22} color="#ef5350" />
                  </TouchableOpacity>
                )}
              </View>
              {activeTimePicker === pickerKey && (
                <DateTimePicker
                  value={parseTime(time)}
                  mode="time"
                  is24Hour={false}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  themeVariant={isDarkMode ? 'dark' : 'light'}
                  onChange={(_, selectedDate) => {
                    if (Platform.OS !== 'ios') setActiveTimePicker(null);
                    if (selectedDate) {
                      const newTimes = [...times];
                      newTimes[index] = formatTime(selectedDate);
                      updateCategoryTimes(categoryId, newTimes);
                    }
                  }}
                />
              )}
            </View>
          );
        })}
        {times.length < MAX_TIMES && (
          <TouchableOpacity
            style={[styles.addTimeButton, { borderColor: iconColor, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              springLayoutAnimation();
              updateCategoryTimes(categoryId, [...times, times[times.length - 1]]);
            }}
          >
            <MaterialCommunityIcons name="plus-circle-outline" size={18} color={iconColor} />
            <Text style={[styles.addTimeText, { color: iconColor }]}>
              {t('notificationSounds.addTime')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderSimpleExpanded = (categoryId: string) => {
    const category = NOTIFICATION_CATEGORIES.find(c => c.id === categoryId);

    return (
      <View style={styles.expandedContent}>
        {/* Multi-time pickers */}
        {renderMultiTimePicker(categoryId, category?.iconColor || '#0d8e62')}

        {/* Day-of-week picker */}
        {renderDayPicker(categoryId)}

        {/* Per-category sound picker */}
        {renderReminderSoundPicker(categoryId)}

        {renderTestButton(categoryId)}
        {renderCloseButton()}
      </View>
    );
  };

  const handleTestNotification = useCallback(async (categoryId: string) => {
    if (testingSending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTestingSending(categoryId);
    setTestingSent(null);
    try {
      const soundType = getCategorySoundType(categoryId);
      await sendTestNotification(categoryId, {
        soundType,
        adhanSoundType: settings.notifications.adhanSoundType || 'makkah',
        sound: settings.notifications.sound,
        vibration: settings.notifications.vibration,
      });
      setTestingSent(categoryId);
      setTimeout(() => setTestingSent(null), 2500);
    } catch (e: any) {
      if (e?.message !== 'NO_PERMISSION') {
        Alert.alert(t('notificationSounds.testError'), t('notificationSounds.testErrorMsg'));
      }
    } finally {
      setTestingSending(null);
    }
  }, [testingSending, settings.notifications]);

  const renderTestButton = (categoryId: string) => {
    const isSending = testingSending === categoryId;
    const wasSent = testingSent === categoryId;
    const isEnabled = getCategoryEnabled(categoryId);
    return (
      <TouchableOpacity
        style={[
          styles.testNotifButton,
          { backgroundColor: colors.surface, flexDirection: isRTL ? 'row-reverse' : 'row', opacity: isEnabled ? 1 : 0.5 },
        ]}
        onPress={() => handleTestNotification(categoryId)}
        disabled={!isEnabled || isSending}
        activeOpacity={0.7}
      >
        {isSending ? (
          <ActivityIndicator size="small" color="#0d8e62" />
        ) : wasSent ? (
          <MaterialCommunityIcons name="check-circle" size={18} color="#0d8e62" />
        ) : (
          <MaterialCommunityIcons name="bell-ring-outline" size={18} color="#0d8e62" />
        )}
        <Text style={[styles.testNotifText, { color: wasSent ? '#0d8e62' : colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
          {wasSent ? t('notificationSounds.testSuccess') : t('notificationSounds.testNotification')}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderCloseButton = () => {
    return (
      <View style={[styles.actionButtonsRow, { flexDirection: isRTL ? 'row-reverse' : 'row', borderTopColor: colors.divider }]}>
        <TouchableOpacity
          style={[styles.closeButton, { backgroundColor: colors.surface, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={collapseCategory}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="check" size={18} color={colors.text} />
          <Text style={[styles.closeButtonText, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {t('common.done')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderCustomReminderExpanded = () => {
    const customTitle = settings.notifications.customReminderTitle || '';
    const contentType = settings.notifications.customReminderContentType || 'text';
    const selectedSurah = settings.notifications.customReminderSurah || 0;

    return (
      <View style={styles.expandedContent}>
        {/* Content type selector */}
        <Text style={[styles.contentSectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
          {t('notificationSounds.reminderType')}
        </Text>
        <View style={[styles.contentTypeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {CONTENT_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.contentTypeChip,
                { borderColor: colors.border },
                isDarkMode && { backgroundColor: colors.surface },
                contentType === type.id && styles.contentTypeChipActive,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                updateNotifications({ customReminderContentType: type.id });
              }}
            >
              <MaterialCommunityIcons 
                name={type.icon} 
                size={16} 
                color={contentType === type.id ? '#fff' : colors.textLight} 
              />
              <Text style={[
                styles.contentTypeText,
                contentType === type.id && styles.contentTypeTextActive,
                contentType !== type.id && { color: colors.textLight },
                { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
              ]}>
                {t(type.labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom title input — always visible */}
        <View style={[styles.timePickerRow, { backgroundColor: colors.surface }, { marginBottom: 6 }, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <MaterialCommunityIcons name="pencil-outline" size={18} color={isDarkMode ? "#e67e22" : "#b85c16"} />
          <TextInput
            style={[styles.customTitleInput, { color: colors.text }]}
            placeholder={contentType === 'text' ? t('notificationSounds.reminderTextPlaceholder') : t('notificationSounds.customTitlePlaceholder')}
            placeholderTextColor={colors.textLight}
            value={customTitle}
            onChangeText={(text) => updateNotifications({ customReminderTitle: text })}
            textAlign={isRTL ? 'right' : 'left'}
          />
        </View>

        {/* Surah picker — for 'surah' type */}
        {contentType === 'surah' && (
          <>
            <TouchableOpacity
              style={[styles.timePickerRow, { backgroundColor: colors.surface, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setShowSurahPicker(!showSurahPicker);
              }}
            >
              <MaterialCommunityIcons name="book-open-variant" size={18} color="#0d8e62" />
              <Text style={[styles.timePickerLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {t('notificationSounds.surah')}
              </Text>
              <Text style={styles.timePickerValue}>
                {selectedSurah > 0 ? getSurahName(selectedSurah) : t('notificationSounds.chooseSurah')}
              </Text>
              <MaterialCommunityIcons 
                name={showSurahPicker ? 'chevron-up' : 'chevron-down'} 
                size={20} 
                color={colors.textLight} 
              />
            </TouchableOpacity>

            {showSurahPicker && (
              <ScrollView 
                style={[styles.surahPickerList, { backgroundColor: colors.surface }]} 
                nestedScrollEnabled
              >
                {Array.from({ length: 114 }, (_, i) => i + 1).map((num) => (
                  <TouchableOpacity
                    key={num}
                    style={[
                      styles.surahPickerItem,
                      selectedSurah === num && styles.surahPickerItemActive,
                      { flexDirection: isRTL ? 'row-reverse' : 'row', borderBottomColor: colors.divider },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      updateNotifications({ 
                        customReminderSurah: num,
                        customReminderAyah: 1,
                      });
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setShowSurahPicker(false);
                    }}
                  >
                    <Text style={[
                      styles.surahPickerNumber,
                      { color: colors.textLight },
                      selectedSurah === num && { color: '#fff' },
                      { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
                    ]}>
                      {num}
                    </Text>
                    <Text style={[
                      styles.surahPickerName,
                      { color: colors.text },
                      selectedSurah === num && { color: '#fff' },
                      { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
                    ]}>
                      {getSurahName(num)}
                    </Text>
                    <Text style={[
                      styles.surahPickerAyahCount,
                      { color: colors.textLight },
                      selectedSurah === num && { color: 'rgba(255,255,255,0.7)' },
                      { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
                    ]}>
                      {AYAH_COUNTS[num - 1]} آية
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </>
        )}

        {/* Multi-time picker */}
        {renderMultiTimePicker('customReminder', isDarkMode ? "#e67e22" : "#b85c16")}

        {/* Day-of-week picker */}
        {renderDayPicker('customReminder')}

        {renderReminderSoundPicker('customReminder')}

        {renderTestButton('customReminder')}
        {renderCloseButton()}
      </View>
    );
  };

  const renderKahfExpanded = () => {
    const kahfTime = settings.notifications.kahfTime ?? '14:00';
    const pickerKey = 'time_kahf_0';
    
    const formatDisplayTime = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      const period = h >= 12 ? (isRTL ? 'م' : 'PM') : (isRTL ? 'ص' : 'AM');
      const hour12 = h % 12 || 12;
      return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
    };
    
    const parseTimeValue = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      const date = new Date();
      date.setHours(h, m, 0, 0);
      return date;
    };
    
    const formatTimeValue = (date: Date) => {
      const h = date.getHours().toString().padStart(2, '0');
      const m = date.getMinutes().toString().padStart(2, '0');
      return `${h}:${m}`;
    };
    
    return (
      <View style={styles.expandedContent}>
        {/* Friday note */}
        <View style={[styles.dayPickerContainer, { borderTopColor: colors.divider }]}>
          <View style={[styles.dayPickerHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <MaterialCommunityIcons name="calendar-week" size={18} color={colors.textLight} />
            <Text style={[styles.dayPickerLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {isRTL ? 'كل يوم جمعة' : 'Every Friday'}
            </Text>
          </View>
        </View>
        
        {/* Time picker */}
        <View style={[styles.reminderSoundSection, { borderTopColor: colors.divider }]}>
          <TouchableOpacity
            style={[styles.timePickerRow, { backgroundColor: colors.surface, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTimePicker(activeTimePicker === pickerKey ? null : pickerKey);
            }}
          >
            <MaterialCommunityIcons name="clock-outline" size={18} color="#1a6b4a" />
            <Text style={[styles.timePickerLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {t('notificationSounds.reminderTime')}
            </Text>
            <Text style={styles.timePickerValue}>
              {formatDisplayTime(kahfTime)}
            </Text>
          </TouchableOpacity>
          
          {activeTimePicker === pickerKey && (
            <DateTimePicker
              value={parseTimeValue(kahfTime)}
              mode="time"
              is24Hour={false}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              themeVariant={isDarkMode ? 'dark' : 'light'}
              onChange={(_, selectedDate) => {
                if (Platform.OS !== 'ios') setActiveTimePicker(null);
                if (selectedDate) {
                  updateNotifications({ kahfTime: formatTimeValue(selectedDate), notifOverrides: { ...settings.notifications.notifOverrides, kahfFriday: true } });
                }
              }}
            />
          )}
        </View>
        
        {renderTestButton('kahf')}
        {renderCloseButton()}
      </View>
    );
  };

  const renderWorshipWeeklyExpanded = () => {
    return (
      <View style={styles.expandedContent}>
        {/* Friday note */}
        <View style={[styles.dayPickerContainer, { borderTopColor: colors.divider }]}>
          <View style={[styles.dayPickerHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <MaterialCommunityIcons name="calendar-week" size={18} color={colors.textLight} />
            <Text style={[styles.dayPickerLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {isRTL ? 'كل يوم جمعة' : 'Every Friday'}
            </Text>
          </View>
        </View>

        {renderTestButton('worshipWeeklyReport')}
        {renderCloseButton()}
      </View>
    );
  };

  const renderExpandedContent = (categoryId: string) => {
    switch (categoryId) {
      case 'prayer': return renderPrayerExpanded();
      case 'azkar': return renderAzkarExpanded();
      case 'customReminder': return renderCustomReminderExpanded();
      case 'kahf': return renderKahfExpanded();
      case 'quranReading': return renderSimpleExpanded(categoryId);
      case 'worshipDailySummary': return renderSimpleExpanded(categoryId);
      case 'worshipWeeklyReport': return renderWorshipWeeklyExpanded();
      default: return renderSimpleExpanded(categoryId);
    }
  };

  // ========================================
  // Render
  // ========================================

  return (
    <BackgroundWrapper backgroundKey={settings.display.appBackground} backgroundUrl={settings.display.appBackgroundUrl} opacity={settings.display.backgroundOpacity ?? 1} style={{ flex: 1 }}>
    <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]} edges={['top']}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      {/* Header */}
      <Animated.View
        entering={FadeInDown.duration(500)}
        style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <MaterialCommunityIcons name={isRTL ? 'arrow-right' : 'arrow-left'} size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('settings.prayerAndAzkarAlerts')}</Text>
        <View style={styles.headerPlaceholder} />
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Permission Card */}
        {permissionChecked && permissionStatus !== 'granted' && (
          <Animated.View entering={FadeInDown.delay(50).duration(500)}>
            <TouchableOpacity
              style={[styles.permissionCard, { backgroundColor: isDarkMode ? 'rgba(239,68,68,0.15)' : '#FEF2F2', borderColor: isDarkMode ? 'rgba(239,68,68,0.3)' : '#FEE2E2' }, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={requestPermissions}
              activeOpacity={0.8}
            >
              <View style={[styles.permissionIcon, { backgroundColor: colors.card }]}>
                <MaterialCommunityIcons name="bell-off" size={32} color="#ef5350" />
              </View>
              <View style={[styles.permissionContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={[styles.permissionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                  {t('notificationSounds.notificationsDisabled')}
                </Text>
                <Text style={[styles.permissionSubtitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                  {t('notificationSounds.tapToEnable')}
                </Text>
              </View>
              <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={24} color="#ef5350" />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Main Toggle */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <View style={[styles.mainToggleCard, { backgroundColor: colors.card, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={styles.mainToggleIconBg}>
              <MaterialCommunityIcons name="bell" size={26} color="#fff" />
            </View>
            <View style={[styles.mainToggleContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <Text style={[styles.mainToggleTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {t('notificationSounds.enableNotifications')}
              </Text>
              <Text style={[styles.mainToggleSubtitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {t('settings.prayerAndAzkarAlerts')}
              </Text>
            </View>
            <Switch
              value={settings.notifications.enabled}
              onValueChange={handleToggleMain}
              trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#0d8e62' }}
              thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
              ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
            />
          </View>
        </Animated.View>

        {/* Notification Categories */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Text style={[styles.sectionTitle, { color: colors.textLight }]}>
            {t('notificationSounds.notificationTypes')}
          </Text>

          <View style={[styles.categoriesContainer, { backgroundColor: colors.card }]}>
            {NOTIFICATION_CATEGORIES.map((category, index) => {
              const categoryEnabled = getCategoryEnabled(category.id);
              const isExpanded = expandedCategory === category.id;
              const isLast = index === NOTIFICATION_CATEGORIES.length - 1;

              return (
                <View key={category.id}>
                  {/* Category header row */}
                  <TouchableOpacity
                    style={[
                      styles.categoryRow,
                      !isLast && !isExpanded && styles.categoryRowBorder,
                      !isLast && !isExpanded && { borderBottomColor: colors.divider },
                      !isEnabled && styles.disabledOpacity,
                      { flexDirection: isRTL ? 'row-reverse' : 'row' },
                    ]}
                    onPress={() => {
                      if (isEnabled) toggleCategory(category.id);
                    }}
                    activeOpacity={isEnabled ? 0.7 : 1}
                  >
                    <View style={[styles.categoryIconBg, { backgroundColor: category.iconColor + '18' }]}>
                      <MaterialCommunityIcons
                        name={category.icon}
                        size={22}
                        color={category.iconColor}
                      />
                    </View>
                    <View style={[styles.categoryContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                      <Text style={[styles.categoryTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                        {t(category.titleKey)}
                      </Text>
                      <Text style={[styles.categorySubtitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={1}>
                        {t(category.subtitleKey)}
                      </Text>
                    </View>
                    <Switch
                      value={categoryEnabled}
                      onValueChange={(val) => {
                        if (isEnabled) {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          toggleCategoryEnabled(category.id, val);
                          if (val && !isExpanded) {
                            springLayoutAnimation();
                            setExpandedCategory(category.id);
                          }
                        }
                      }}
                      trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#0d8e62' }}
                      thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
                      ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
                      disabled={!isEnabled}
                    />
                    <TouchableOpacity
                      onPress={() => {
                        if (isEnabled) toggleCategory(category.id);
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.expandArrow}
                    >
                      <MaterialCommunityIcons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={22}
                        color={colors.textLight}
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>

                  {/* Expanded content */}
                  {isExpanded && categoryEnabled && isEnabled && (
                    <View style={[
                      styles.expandedWrapper,
                      { backgroundColor: colors.surface },
                      !isLast && styles.categoryRowBorder,
                      !isLast && { borderBottomColor: colors.divider },
                    ]}>
                      {renderExpandedContent(category.id)}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* Sound & Vibration global settings */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <Text style={[styles.sectionTitle, { color: colors.textLight }]}>{t('settings.sound')}</Text>
          <View style={[styles.categoriesContainer, { backgroundColor: colors.card }]}>
            <View style={[styles.innerSettingRow, styles.globalSettingRow, { borderBottomColor: colors.divider }, styles.categoryRowBorder, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.innerSettingInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.categoryIconBg, { backgroundColor: '#c17f5918' }]}>
                  <MaterialCommunityIcons name="volume-high" size={20} color="#c17f59" />
                </View>
                <Text style={[styles.categoryTitle, { color: colors.text }]}>
                  {t('notificationSounds.notificationSound')}
                </Text>
              </View>
              <Switch
                value={settings.notifications.sound !== false}
                onValueChange={(val) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateNotifications({ sound: val });
                }}
                trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#0d8e62' }}
                thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
                ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
                disabled={!isEnabled}
              />
            </View>

            <View style={[styles.innerSettingRow, styles.globalSettingRow, { borderBottomColor: colors.divider }, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.innerSettingInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.categoryIconBg, { backgroundColor: '#ef535018' }]}>
                  <MaterialCommunityIcons name="vibrate" size={20} color="#ef5350" />
                </View>
                <Text style={[styles.categoryTitle, { color: colors.text }]}>
                  {t('notificationSounds.vibration')}
                </Text>
              </View>
              <Switch
                value={settings.notifications.vibration !== false}
                onValueChange={(val) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateNotifications({ vibration: val });
                }}
                trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#0d8e62' }}
                thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
                ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
                disabled={!isEnabled}
              />
            </View>
          </View>
        </Animated.View>

        {/* Downloadable Sounds Section */}
        {downloadableSounds.length > 0 && (
          <Animated.View entering={FadeInDown.delay(350).duration(500)}>
            <TouchableOpacity
              style={[styles.downloadSectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => {
                springLayoutAnimation();
                setShowDownloadSection(!showDownloadSection);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.innerSettingInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.categoryIconBg, { backgroundColor: '#ab47bc18' }]}>
                  <MaterialCommunityIcons name="download" size={22} color="#ab47bc" />
                </View>
                <View>
                  <Text style={[styles.categoryTitle, { color: colors.text }]}>
                    {t('notificationSounds.additionalSounds')}
                  </Text>
                  <Text style={[styles.categorySubtitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                    {downloadableSounds.length} {t('notificationSounds.soundsAvailable')}
                  </Text>
                </View>
              </View>
              <MaterialCommunityIcons
                name={showDownloadSection ? 'chevron-up' : 'chevron-down'}
                size={24}
                color={colors.textLight}
              />
            </TouchableOpacity>

            {showDownloadSection && (
              <View style={[styles.categoriesContainer, { backgroundColor: colors.card, marginTop: 8 }]}>
                {downloadableSounds.map((sound, index) => {
                  const isDownloaded = downloadedSounds.some(d => d.id === sound.id);
                  const isDownloading = downloadingId === sound.id;
                  const isLast = index === downloadableSounds.length - 1;

                  return (
                    <View
                      key={sound.id}
                      style={[
                        styles.downloadSoundRow,
                        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
                        { flexDirection: isRTL ? 'row-reverse' : 'row' },
                      ]}
                    >
                      <View style={[styles.downloadSoundInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <MaterialCommunityIcons
                          name={isDownloaded ? 'check-circle' : 'music-circle'}
                          size={28}
                          color={isDownloaded ? '#0d8e62' : '#ab47bc'}
                        />
                        <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                          <Text style={[styles.downloadSoundName, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                            {sound.name}
                          </Text>
                          {sound.description ? (
                            <Text style={[styles.downloadSoundDesc, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={1}>
                              {sound.description}
                            </Text>
                          ) : null}
                          <Text style={[styles.downloadSoundSize, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                            {(sound.fileSize / 1024).toFixed(0)} KB
                          </Text>
                        </View>
                      </View>

                      {isDownloaded ? (
                        <View style={[styles.downloadedBadge, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                          <MaterialCommunityIcons name="check" size={14} color="#0d8e62" />
                          <Text style={[styles.downloadedText, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('notificationSounds.downloaded')}</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[styles.downloadButton, isDownloading && styles.downloadButtonLoading, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                          onPress={() => handleDownloadSound(sound)}
                          disabled={isDownloading}
                          activeOpacity={0.7}
                        >
                          {isDownloading ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <>
                              <MaterialCommunityIcons name="download" size={16} color="#fff" />
                              <Text style={[styles.downloadButtonText, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('notificationSounds.download')}</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </Animated.View>
        )}

        {/* Info Card */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)} style={[styles.infoCard, { backgroundColor: isDarkMode ? 'rgba(59,130,246,0.1)' : '#EFF6FF', borderColor: isDarkMode ? 'rgba(59,130,246,0.3)' : '#DBEAFE' }, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <MaterialCommunityIcons name="information" size={20} color="#3a7ca5" />
          <Text style={[styles.infoText, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {t('notificationSounds.notificationsInfo')}
          </Text>
        </Animated.View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
    </BackgroundWrapper>
  );
}

// ========================================
// الأنماط
// ========================================

const _styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerDark: {
    backgroundColor: DarkColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: fontBold(),
    lineHeight: 34,
    includeFontPadding: false,
  },
  headerPlaceholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 15,
  },

  // Permission card
  permissionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  permissionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionContent: {
    flex: 1,
    marginHorizontal: 15,
  },
  permissionTitle: {
    fontSize: 16,
    fontFamily: fontBold(),
    lineHeight: 28,
    includeFontPadding: false,
  },
  permissionSubtitle: {
    fontSize: 13,
    fontFamily: fontRegular(),
    marginTop: 2,
    lineHeight: 22,
    includeFontPadding: false,
  },

  // Main toggle card
  mainToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginTop: 5,
  },
  mainToggleIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#0d8e62',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainToggleContent: {
    flex: 1,
    marginHorizontal: 14,
  },
  mainToggleTitle: {
    fontSize: 17,
    fontFamily: fontBold(),
    lineHeight: 28,
    includeFontPadding: false,
  },
  mainToggleSubtitle: {
    fontSize: 13,
    fontFamily: fontRegular(),
    marginTop: 2,
    lineHeight: 22,
    includeFontPadding: false,
  },

  // Section title
  sectionTitle: {
    fontSize: 14,
    fontFamily: fontBold(),
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 10,
    lineHeight: 24,
    includeFontPadding: false,
  },

  // Categories container
  categoriesContainer: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },

  // Category row
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  categoryRowBorder: {
    borderBottomWidth: 1,
  },
  categoryRowBorderDark: {
    borderBottomColor: '#2d3740',
  },
  disabledOpacity: {
    opacity: 0.5,
  },
  categoryIconBg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryContent: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 15,
    fontFamily: fontSemiBold(),
    lineHeight: 26,
    includeFontPadding: false,
  },
  categorySubtitle: {
    fontSize: 12,
    fontFamily: fontRegular(),
    marginTop: 1,
    lineHeight: 20,
    includeFontPadding: false,
  },
  expandArrow: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Expanded content
  expandedWrapper: {
    paddingBottom: 4,
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },

  // Inner setting row
  innerSettingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  innerSettingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  innerSettingTitle: {
    fontSize: 14,
    fontFamily: fontMedium(),
    lineHeight: 24,
    includeFontPadding: false,
  },
  globalSettingRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },

  // Small label
  smallLabel: {
    fontSize: 13,
    fontFamily: fontMedium(),
    marginBottom: 10,
    marginTop: 8,
    lineHeight: 22,
    includeFontPadding: false,
  },

  // Reminder / chip options
  reminderScroll: {
    flexDirection: 'row',
  },
  reminderMinutesContainer: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  chipOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#E0E0E0',
    gap: 8,
  },
  chipOptionSelected: {
    backgroundColor: '#0d8e62',
  },
  chipOptionText: {
    fontSize: 13,
    fontFamily: fontMedium(),
    lineHeight: 22,
    includeFontPadding: false,
  },
  chipOptionTextSelected: {
    color: '#fff',
  },

  // Prayer toggles
  prayerTogglesContainer: {
    marginTop: 8,
    paddingHorizontal: 4,
  },

  // Time picker row
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginVertical: 2,
    borderRadius: 10,
    gap: 10,
  },
  multiTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  removeTimeButton: {
    padding: 4,
  },
  addTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 6,
    marginBottom: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addTimeText: {
    fontSize: 13,
    fontFamily: fontMedium(),
  },
  timePickerLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: fontMedium(),
    lineHeight: 24,
    includeFontPadding: false,
  },
  timePickerValue: {
    fontSize: 15,
    fontFamily: fontSemiBold(),
    color: '#0d8e62',
    lineHeight: 26,
    includeFontPadding: false,
  },

  // Sound info row
  soundInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  soundInfoText: {
    fontSize: 12,
    fontFamily: fontRegular(),
    lineHeight: 20,
    includeFontPadding: false,
  },
  ayahDownloadAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  ayahDownloadAlertText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fontRegular(),
    lineHeight: 20,
  },

  // Adhan sound section
  adhanSoundSection: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  adhanSoundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  adhanSoundHeaderText: {
    flex: 1,
    fontSize: 14,
    fontFamily: fontSemiBold(),
    lineHeight: 24,
    includeFontPadding: false,
  },
  adhanSoundOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  adhanSoundOptionSelected: {
    backgroundColor: 'rgba(6, 79, 47, 0.06)',
    borderRadius: 10,
  },
  adhanSoundIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adhanSoundIconBgSelected: {
    backgroundColor: '#0d8e62',
  },
  adhanSoundContent: {
    flex: 1,
  },
  adhanSoundTitle: {
    fontSize: 14,
    fontFamily: fontSemiBold(),
    lineHeight: 24,
    includeFontPadding: false,
  },
  adhanSoundTitleSelected: {
    color: '#0d8e62',
  },
  adhanSoundSubtitle: {
    fontSize: 11,
    fontFamily: fontRegular(),
    marginTop: 1,
    lineHeight: 18,
    includeFontPadding: false,
  },
  previewButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewButtonActive: {
    backgroundColor: 'rgba(239, 83, 80, 0.1)',
  },

  // Action buttons
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },

  closeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    gap: 8,
  },
  closeButtonText: {
    fontSize: 14,
    fontFamily: fontSemiBold(),
    lineHeight: 24,
    includeFontPadding: false,
  },

  testNotifButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
    marginHorizontal: 14,
    marginTop: 10,
  },
  testNotifText: {
    fontSize: 13,
    fontFamily: fontSemiBold(),
    includeFontPadding: false,
  },

  // Sound picker
  soundPickerContainer: {
    padding: 14,
    borderTopWidth: 1,
  },

  // Reminder sound section
  reminderSoundSection: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },

  // Adhan selected name
  adhanSelectedName: {
    fontSize: 12,
    fontFamily: fontRegular(),
    lineHeight: 20,
    includeFontPadding: false,
  },

  // Custom title input
  customTitleInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: fontMedium(),
    paddingVertical: 0,
  },

  // Battery optimization card
  batteryOptCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ff980030',
  },
  batteryOptCardDark: {
    backgroundColor: DarkColors.surface,
    borderColor: '#ff980030',
  },
  batteryOptContent: {
    alignItems: 'center',
    gap: 12,
  },

  // Info card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e8f4fd',
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 12,
    padding: 15,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fontRegular(),
    lineHeight: 22,
  },

  bottomSpace: {
    height: 100,
  },

  // Custom reminder content type styles
  contentSectionTitle: {
    fontSize: 13,
    fontFamily: fontSemiBold(),
    marginBottom: 8,
    lineHeight: 22,
    includeFontPadding: false,
  },
  contentTypeRow: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 10,
    flexWrap: 'wrap' as const,
  },
  contentTypeChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
  },
  contentTypeChipActive: {
    backgroundColor: '#0d8e62',
    borderColor: '#0d8e62',
  },
  contentTypeText: {
    fontSize: 13,
    fontFamily: fontMedium(),
    lineHeight: 22,
    includeFontPadding: false,
  },
  contentTypeTextActive: {
    color: '#fff',
  },

  // Surah picker
  surahPickerList: {
    maxHeight: 200,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    marginBottom: 6,
    paddingVertical: 4,
  },
  surahPickerItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  surahPickerItemActive: {
    backgroundColor: '#0d8e62',
    borderRadius: 8,
    borderBottomColor: 'transparent',
  },
  surahPickerNumber: {
    fontSize: 13,
    fontFamily: fontRegular(),
    width: 28,
    textAlign: 'center' as const,
    lineHeight: 22,
    includeFontPadding: false,
  },
  surahPickerName: {
    flex: 1,
    fontSize: 15,
    fontFamily: fontMedium(),
    lineHeight: 26,
    includeFontPadding: false,
  },
  surahPickerAyahCount: {
    fontSize: 11,
    fontFamily: fontRegular(),
    lineHeight: 18,
    includeFontPadding: false,
  },

  // Ayah number picker
  ayahNumberPicker: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  ayahArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(6,79,47,0.1)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  ayahNumberInput: {
    fontSize: 16,
    fontFamily: fontSemiBold(),
    minWidth: 40,
    paddingVertical: 2,
  },
  ayahMaxLabel: {
    fontSize: 12,
    fontFamily: fontRegular(),
    lineHeight: 20,
    includeFontPadding: false,
  },

  // Reciter picker
  reciterPickerList: {
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    marginBottom: 6,
    paddingVertical: 4,
  },
  reciterPickerListDark: {
    backgroundColor: DarkColors.surface,
  },
  reciterPickerItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  reciterPickerItemActive: {
    backgroundColor: '#0d8e62',
    borderRadius: 8,
    borderBottomColor: 'transparent',
  },
  reciterPickerName: {
    fontSize: 14,
    fontFamily: fontMedium(),
    lineHeight: 24,
    includeFontPadding: false,
  },

  // Preview ayah button
  previewAyahBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(6,79,47,0.08)',
    marginVertical: 4,
  },
  previewAyahBtnDark: {
    backgroundColor: 'rgba(6,79,47,0.15)',
  },
  previewAyahText: {
    fontSize: 14,
    fontFamily: fontMedium(),
    color: '#0d8e62',
    lineHeight: 24,
    includeFontPadding: false,
  },
  downloadedAyahBtn: {
    backgroundColor: 'rgba(34,197,94,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.35)',
  },

  // Downloadable sounds styles
  downloadSectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 24,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 16,
    marginHorizontal: 16,
  },
  downloadSoundRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  downloadSoundInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
    gap: 12,
  },
  downloadSoundName: {
    fontSize: 15,
    fontFamily: fontSemiBold(),
    lineHeight: 26,
    includeFontPadding: false,
  },
  downloadSoundDesc: {
    fontSize: 12,
    fontFamily: fontRegular(),
    marginTop: 1,
    lineHeight: 20,
    includeFontPadding: false,
  },
  downloadSoundSize: {
    fontSize: 11,
    fontFamily: fontRegular(),
    marginTop: 2,
    lineHeight: 18,
    includeFontPadding: false,
  },
  downloadedBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    backgroundColor: 'rgba(34,197,94,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  downloadedText: {
    fontSize: 12,
    fontFamily: fontMedium(),
    color: '#0d8e62',
    lineHeight: 20,
    includeFontPadding: false,
  },
  downloadButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    backgroundColor: '#ab47bc',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  downloadButtonLoading: {
    opacity: 0.7,
  },
  downloadButtonText: {
    fontSize: 13,
    fontFamily: fontSemiBold(),
    color: '#fff',
    lineHeight: 22,
    includeFontPadding: false,
  },
  // Day picker styles
  dayPickerContainer: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
    borderTopWidth: 1,
  },
  dayPickerHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 8,
    gap: 8,
  },
  dayPickerLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: fontMedium(),
    lineHeight: 22,
    includeFontPadding: false,
  },
  dayPickerToggleAll: {
    fontSize: 12,
    fontFamily: fontSemiBold(),
    lineHeight: 20,
    includeFontPadding: false,
  },
  dayChipsRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    justifyContent: 'center' as const,
    gap: 8,
  },
  dayChip: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    minHeight: 36,
  },
  dayChipSelected: {
    backgroundColor: '#0d8e62',
  },
  dayChipText: {
    fontSize: 13,
    fontFamily: fontSemiBold(),
    lineHeight: 22,
    includeFontPadding: false,
  },
  dayChipTextSelected: {
    color: '#fff',
  },
});