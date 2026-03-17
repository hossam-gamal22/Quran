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
  StatusBar,
  Alert,
  Platform,
  Linking,
  ActivityIndicator,
  LayoutAnimation,
  UIManager,
  TextInput,
} from 'react-native';
import { fontBold, fontMedium, fontRegular, fontSemiBold } from '@/lib/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import Animated, { FadeInDown } from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useSettings, NotificationSoundType, AdhanSoundType, ReminderSoundType } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { t } from '@/lib/i18n';
import { ADHAN_SOUNDS as ADHAN_SOUND_FILES, NOTIFICATION_SOUNDS as NOTIFICATION_SOUND_FILES } from '@/lib/sound-manager';
import { getSurahName, RECITERS } from '@/lib/quran-api';
import { getAyahAudioUrl } from '@/lib/quran-cache';
import { fetchDownloadableSounds, getDownloadedSounds, downloadSound, isSoundDownloaded, type DownloadableSound, type DownloadedSound } from '@/lib/downloadable-sounds';
import { showInterstitial } from '@/components/ads/InterstitialAdManager';
import { useIsRTL } from '@/hooks/use-is-rtl';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
const CONTENT_TYPES: { id: 'text' | 'ayah' | 'surah'; labelKey: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { id: 'text', labelKey: 'notificationSounds.freeText', icon: 'pencil-outline' },
  { id: 'ayah', labelKey: 'notificationSounds.quranicVerse', icon: 'book-open-variant' },
  { id: 'surah', labelKey: 'notificationSounds.surah', icon: 'bookshelf' },
];

// Popular reciters (top 8 for picker)
const POPULAR_RECITERS = RECITERS.slice(0, 8);

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
    iconColor: '#2f7659',
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
    iconColor: '#f5a623',
    titleKey: 'notificationSounds.adhkar',
    subtitleKey: 'notificationSounds.adhkarDesc',
  },
  {
    id: 'dailyVerse',
    icon: 'book-open-page-variant',
    iconColor: '#2f7659',
    titleKey: 'notificationSounds.verseOfDay',
    subtitleKey: 'notificationSounds.verseOfDayDesc',
  },
  {
    id: 'customReminder',
    icon: 'bell-plus',
    iconColor: '#e67e22',
    titleKey: 'notificationSounds.customNotification',
    subtitleKey: 'notificationSounds.customNotificationDesc',
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
// Test notification function
// ========================================

const sendTestNotification = async (title: string, body: string, soundType?: string, extraData?: Record<string, any>) => {
  try {
    // 1) Immediate notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data: { type: 'test', soundType: soundType || 'default', ...extraData },
        ...(Platform.OS === 'android' && { channelId: 'general' }),
      },
      trigger: null,
    });

    // 2) If this is an ayah test, play the audio directly
    if (extraData?.contentType === 'ayah' && extraData?.ayahAudioUrl) {
      try {
        const { Audio } = require('expo-av');
        const { sound } = await Audio.Sound.createAsync(
          { uri: extraData.ayahAudioUrl },
          { shouldPlay: true }
        );
        sound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.isLoaded && status.didJustFinish) {
            sound.unloadAsync();
          }
        });
      } catch (e) {
        console.warn('Failed to play test ayah audio:', e);
      }
    }

    // 3) Scheduled notification after 10 seconds to verify scheduling works
    const futureDate = new Date(Date.now() + 10 * 1000);
    await Notifications.scheduleNotificationAsync({
      identifier: 'test_scheduled',
      content: {
        title: '⏰ ' + title,
        body: t('notificationSounds.testScheduledBody'),
        sound: true,
        data: { type: 'test_scheduled', soundType: soundType || 'default', ...extraData },
        ...(Platform.OS === 'android' && { channelId: 'general' }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: futureDate,
      },
    });

    Alert.alert(t('notificationSounds.testSuccess'), t('notificationSounds.testSuccessMsg'));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch (err) {
    console.error('❌ Test notification failed:', err);
    Alert.alert(t('notificationSounds.testError'), t('notificationSounds.testErrorMsg') + String(err));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
};

// ========================================
// المكون الرئيسي
// ========================================

export default function NotificationsScreen() {
  const isRTL = useIsRTL();
  const router = useRouter();
  const { settings, isDarkMode, updateNotifications } = useSettings();
  const colors = useColors();
  const isArabic = (settings.language || 'ar') === 'ar';
  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');
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
  const [showReciterPicker, setShowReciterPicker] = useState(false);
  const [ayahPreviewLoading, setAyahPreviewLoading] = useState(false);

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

  const handleDownloadSound = async (sound: DownloadableSound) => {
    if (downloadingId) return;
    setDownloadingId(sound.id);
    try {
      // Show interstitial ad before download
      try { await showInterstitial(); } catch {}
      
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

  const isEnabled = settings.notifications.enabled && permissionStatus === 'granted';

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
      default: return null;
    }
  };

  // Update time for a category
  const updateCategoryTime = (categoryId: string, time: string) => {
    switch (categoryId) {
      case 'salawat':
        updateNotifications({ salawatReminderTime: time });
        break;
      case 'tasbih':
        updateNotifications({ tasbihReminderTime: time });
        break;
      case 'istighfar':
        updateNotifications({ istighfarReminderTime: time });
        break;
      case 'dailyVerse':
        updateNotifications({ dailyVerseTime: time });
        break;
      case 'customReminder':
        updateNotifications({ customReminderTime: time });
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
    }
  };

  // Get test notification content for each category
  const getTestContent = (categoryId: string): { title: string; body: string } => {
    switch (categoryId) {
      case 'prayer':
        return { title: t('notificationSounds.testPrayerTitle'), body: t('notificationSounds.testPrayerBody') };
      case 'salawat':
        return { title: t('notificationSounds.testSalawatTitle'), body: t('notificationSounds.testSalawatBody') };
      case 'tasbih':
        return { title: t('notificationSounds.testTasbihTitle'), body: t('notificationSounds.testTasbihBody') };
      case 'istighfar':
        return { title: t('notificationSounds.testIstighfarTitle'), body: t('notificationSounds.testIstighfarBody') };
      case 'azkar':
        return { title: t('notificationSounds.testAzkarTitle'), body: t('notificationSounds.testAzkarBody') };
      case 'dailyVerse':
        return { title: t('notificationSounds.testVerseTitle'), body: t('notificationSounds.testVerseBody') };
      case 'customReminder':
        return { title: t('notificationSounds.testCustomTitle'), body: settings.notifications.customReminderTitle || t('notificationSounds.testCustomBody') };
      default:
        return { title: t('notificationSounds.testDefaultTitle'), body: t('notificationSounds.testDefaultBody') };
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
      <View style={styles.dayPickerContainer}>
        <View style={[styles.dayPickerHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <MaterialCommunityIcons name="calendar-week" size={18} color={isDarkMode ? '#aaa' : '#666'} />
          <Text style={[styles.dayPickerLabel, isDarkMode && styles.textLight, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('notificationSounds.reminderDays')}
          </Text>
          <TouchableOpacity
            onPress={() => {
              updateCategoryDays(categoryId, allSelected ? [6] : ALL_DAYS); // 6 = Friday default if deselecting all
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Text style={[styles.dayPickerToggleAll, { color: '#2f7659', textAlign: isRTL ? 'right' : 'left' }]}>
              {allSelected ? t('notificationSounds.customSelection') : t('notificationSounds.allDays')}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.dayChipsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {ALL_DAYS.map((day, index) => {
            const isSelected = selectedDays.includes(day);
            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayChip,
                  isSelected && styles.dayChipSelected,
                  isDarkMode && !isSelected && styles.dayChipDark,
                ]}
                onPress={() => toggleDay(categoryId, day)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.dayChipText,
                  isSelected && styles.dayChipTextSelected,
                  isDarkMode && !isSelected && styles.dayChipTextDark,
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
      <View style={[styles.innerSettingRow, isDarkMode && styles.innerSettingRowDark, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.innerSettingInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <MaterialCommunityIcons name="bell-ring" size={18} color="#f5a623" />
          <Text style={[styles.innerSettingTitle, isDarkMode && styles.textLight, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('notificationSounds.reminderBeforeAdhan')}
          </Text>
        </View>
        <Switch
          value={settings.notifications.prayerReminder}
          onValueChange={(val) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            updateNotifications({ prayerReminder: val });
          }}
          trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#2f7659' }}
          thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
          ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
          disabled={!isEnabled}
        />
      </View>

      {/* Reminder minutes selector */}
      {settings.notifications.prayerReminder && (
        <View style={styles.reminderMinutesContainer}>
          <Text style={[styles.smallLabel, isDarkMode && styles.textMuted]}>
            {t('notificationSounds.reminderBeforeAdhanBy')}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={[styles.reminderScroll, isRTL && { transform: [{ scaleX: -1 }] }]}>
            {REMINDER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.chipOption,
                  isDarkMode && styles.chipOptionDark,
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
                    isDarkMode && styles.textMuted,
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
        <Text style={[styles.smallLabel, isDarkMode && styles.textMuted, { textAlign: isRTL ? 'right' : 'left' }]}>
          {t('notificationSounds.selectPrayers')}
        </Text>
        {PRAYER_NAMES.map((prayer) => (
          <View key={prayer.key} style={[styles.innerSettingRow, isDarkMode && styles.innerSettingRowDark, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.innerSettingInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <MaterialCommunityIcons
                name={prayer.icon as any}
                size={18}
                color={prayer.key === 'fajr' ? '#5d4e8c' : prayer.key === 'isha' ? '#3a7ca5' : '#c17f59'}
              />
              <Text style={[styles.innerSettingTitle, isDarkMode && styles.textLight, { textAlign: isRTL ? 'right' : 'left' }]}>
                {prayer.name}
              </Text>
            </View>
            <Switch
              value={prayerNotifications[prayer.key]}
              onValueChange={(val) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                handleTogglePrayerNotification(prayer.key, val);
              }}
              trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#2f7659' }}
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
          style={[styles.adhanSoundHeader, isDarkMode && { borderBottomColor: '#2a2a3e' }, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={() => {
            springLayoutAnimation();
            setAdhanListExpanded(!adhanListExpanded);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="volume-high" size={20} color="#2f7659" />
          <Text style={[styles.adhanSoundHeaderText, isDarkMode && styles.textLight, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('notificationSounds.adhanSound')}
          </Text>
          {(() => {
            const selectedAdhan = ADHAN_SOUNDS.find(s => s.id === (settings.notifications.adhanSoundType || 'default'));
            return selectedAdhan ? (
              <Text style={[styles.adhanSelectedName, isDarkMode && { color: '#aaa' }, { textAlign: isRTL ? 'right' : 'left' }]}>
                {selectedAdhan.name}
              </Text>
            ) : null;
          })()}
          <MaterialCommunityIcons
            name={adhanListExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={isDarkMode ? '#666' : '#999'}
          />
        </TouchableOpacity>

        {/* Selected sound preview row (when collapsed) */}
        {!adhanListExpanded && (() => {
          const selectedId = settings.notifications.adhanSoundType || 'default';
          const selectedSound = ADHAN_SOUNDS.find(s => s.id === selectedId);
          if (!selectedSound || selectedId === 'default') return null;
          return (
            <View style={[styles.adhanSoundOption, isDarkMode && styles.adhanSoundOptionDark, styles.adhanSoundOptionSelected, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.adhanSoundIconBg, styles.adhanSoundIconBgSelected]}>
                <MaterialCommunityIcons name="volume-high" size={18} color="#fff" />
              </View>
              <View style={[styles.adhanSoundContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={[styles.adhanSoundTitle, styles.adhanSoundTitleSelected, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {selectedSound.name}
                </Text>
                <Text style={[styles.adhanSoundSubtitle, isDarkMode && styles.textMuted, { textAlign: isRTL ? 'right' : 'left' }]}>
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
                    <ActivityIndicator size="small" color="#2f7659" />
                  ) : (
                    <MaterialCommunityIcons
                      name={previewPlaying === selectedId ? 'stop-circle' : 'play-circle'}
                      size={26}
                      color={previewPlaying === selectedId ? '#ef5350' : '#2f7659'}
                    />
                  )}
                </TouchableOpacity>
              )}
              <MaterialCommunityIcons name="check-circle" size={22} color="#2f7659" />
            </View>
          );
        })()}

        {/* Full adhan list (when expanded) */}
        {adhanListExpanded && ADHAN_SOUNDS.map((sound) => {
          const isSelected = (settings.notifications.adhanSoundType || 'default') === sound.id;
          return (
            <TouchableOpacity
              key={sound.id}
              style={[
                styles.adhanSoundOption,
                isDarkMode && styles.adhanSoundOptionDark,
                isSelected && styles.adhanSoundOptionSelected,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                updateNotifications({ adhanSoundType: sound.id });
                springLayoutAnimation();
                setAdhanListExpanded(false);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.adhanSoundIconBg, isSelected && styles.adhanSoundIconBgSelected]}>
                <MaterialCommunityIcons
                  name={sound.icon as any}
                  size={18}
                  color={isSelected ? '#fff' : (isDarkMode ? '#aaa' : '#666')}
                />
              </View>
              <View style={[styles.adhanSoundContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={[
                  styles.adhanSoundTitle,
                  isDarkMode && styles.textLight,
                  isSelected && styles.adhanSoundTitleSelected,
                  { textAlign: isRTL ? 'right' : 'left' },
                ]}>
                  {sound.name}
                </Text>
                <Text style={[styles.adhanSoundSubtitle, isDarkMode && styles.textMuted, { textAlign: isRTL ? 'right' : 'left' }]}>
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
                    <ActivityIndicator size="small" color="#2f7659" />
                  ) : (
                    <MaterialCommunityIcons
                      name={previewPlaying === sound.id ? 'stop-circle' : 'play-circle'}
                      size={26}
                      color={previewPlaying === sound.id ? '#ef5350' : '#2f7659'}
                    />
                  )}
                </TouchableOpacity>
              )}
              {isSelected && (
                <MaterialCommunityIcons name="check-circle" size={22} color="#2f7659" />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Test + Close buttons */}
      {renderTestAndCloseButtons('prayer')}
    </View>
  );

  const renderAzkarExpanded = () => (
    <View style={styles.expandedContent}>
      {/* Morning Azkar */}
      <View style={[styles.innerSettingRow, isDarkMode && styles.innerSettingRowDark, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.innerSettingInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <MaterialCommunityIcons name="weather-sunset-up" size={18} color="#f5a623" />
          <Text style={[styles.innerSettingTitle, isDarkMode && styles.textLight, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('notificationSounds.morningAzkar')}
          </Text>
        </View>
        <Switch
          value={settings.notifications.morningAzkar}
          onValueChange={(val) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            updateNotifications({ morningAzkar: val });
          }}
          trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#2f7659' }}
          thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
          ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
          disabled={!isEnabled}
        />
      </View>

      {settings.notifications.morningAzkar && (
        <TouchableOpacity
          style={[styles.timePickerRow, isDarkMode && styles.timePickerRowDark, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTimePicker(activeTimePicker === 'morning' ? null : 'morning');
          }}
        >
          <MaterialCommunityIcons name="clock-outline" size={18} color="#f5a623" />
          <Text style={[styles.timePickerLabel, isDarkMode && styles.textLight, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('notificationSounds.morningAzkarTime')}
          </Text>
          <Text style={styles.timePickerValue}>
            {formatDisplayTime(settings.notifications.morningAzkarTime)}
          </Text>
        </TouchableOpacity>
      )}

      {activeTimePicker === 'morning' && settings.notifications.morningAzkar && (
        <DateTimePicker
          value={parseTime(settings.notifications.morningAzkarTime)}
          mode="time"
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          themeVariant={isDarkMode ? 'dark' : 'light'}
          onChange={(_, selectedDate) => {
            if (Platform.OS !== 'ios') setActiveTimePicker(null);
            if (selectedDate) {
              updateNotifications({ morningAzkarTime: formatTime(selectedDate) });
            }
          }}
        />
      )}

      {/* Evening Azkar */}
      <View style={[styles.innerSettingRow, isDarkMode && styles.innerSettingRowDark, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.innerSettingInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <MaterialCommunityIcons name="weather-sunset-down" size={18} color="#5d4e8c" />
          <Text style={[styles.innerSettingTitle, isDarkMode && styles.textLight, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('notificationSounds.eveningAzkar')}
          </Text>
        </View>
        <Switch
          value={settings.notifications.eveningAzkar}
          onValueChange={(val) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            updateNotifications({ eveningAzkar: val });
          }}
          trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#2f7659' }}
          thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
          ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
          disabled={!isEnabled}
        />
      </View>

      {settings.notifications.eveningAzkar && (
        <TouchableOpacity
          style={[styles.timePickerRow, isDarkMode && styles.timePickerRowDark, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTimePicker(activeTimePicker === 'evening' ? null : 'evening');
          }}
        >
          <MaterialCommunityIcons name="clock-outline" size={18} color="#5d4e8c" />
          <Text style={[styles.timePickerLabel, isDarkMode && styles.textLight, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('notificationSounds.eveningAzkarTime')}
          </Text>
          <Text style={styles.timePickerValue}>
            {formatDisplayTime(settings.notifications.eveningAzkarTime)}
          </Text>
        </TouchableOpacity>
      )}

      {activeTimePicker === 'evening' && settings.notifications.eveningAzkar && (
        <DateTimePicker
          value={parseTime(settings.notifications.eveningAzkarTime)}
          mode="time"
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          themeVariant={isDarkMode ? 'dark' : 'light'}
          onChange={(_, selectedDate) => {
            if (Platform.OS !== 'ios') setActiveTimePicker(null);
            if (selectedDate) {
              updateNotifications({ eveningAzkarTime: formatTime(selectedDate) });
            }
          }}
        />
      )}

      {/* Sleep Azkar */}
      <View style={[styles.innerSettingRow, isDarkMode && styles.innerSettingRowDark, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.innerSettingInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <MaterialCommunityIcons name="bed" size={18} color="#3B82F6" />
          <Text style={[styles.innerSettingTitle, isDarkMode && styles.textLight, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('notificationSounds.sleepAzkar')}
          </Text>
        </View>
        <Switch
          value={settings.notifications.sleepAzkar}
          onValueChange={(val) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            updateNotifications({ sleepAzkar: val });
          }}
          trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#2f7659' }}
          thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
          ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
          disabled={!isEnabled}
        />
      </View>

      {settings.notifications.sleepAzkar && (
        <TouchableOpacity
          style={[styles.timePickerRow, isDarkMode && styles.timePickerRowDark, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTimePicker(activeTimePicker === 'sleep' ? null : 'sleep');
          }}
        >
          <MaterialCommunityIcons name="clock-outline" size={18} color="#3B82F6" />
          <Text style={[styles.timePickerLabel, isDarkMode && styles.textLight, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('notificationSounds.sleepAzkarTime')}
          </Text>
          <Text style={styles.timePickerValue}>
            {formatDisplayTime(settings.notifications.sleepAzkarTime)}
          </Text>
        </TouchableOpacity>
      )}

      {activeTimePicker === 'sleep' && settings.notifications.sleepAzkar && (
        <DateTimePicker
          value={parseTime(settings.notifications.sleepAzkarTime)}
          mode="time"
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          themeVariant={isDarkMode ? 'dark' : 'light'}
          onChange={(_, selectedDate) => {
            if (Platform.OS !== 'ios') setActiveTimePicker(null);
            if (selectedDate) {
              updateNotifications({ sleepAzkarTime: formatTime(selectedDate) });
            }
          }}
        />
      )}

      {/* Wakeup Azkar */}
      <View style={[styles.innerSettingRow, isDarkMode && styles.innerSettingRowDark, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.innerSettingInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <MaterialCommunityIcons name="weather-sunset-up" size={18} color="#10B981" />
          <Text style={[styles.innerSettingTitle, isDarkMode && styles.textLight, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('notificationSounds.wakeupAzkar')}
          </Text>
        </View>
        <Switch
          value={settings.notifications.wakeupAzkar}
          onValueChange={(val) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            updateNotifications({ wakeupAzkar: val });
          }}
          trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#2f7659' }}
          thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
          ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
          disabled={!isEnabled}
        />
      </View>

      {settings.notifications.wakeupAzkar && (
        <TouchableOpacity
          style={[styles.timePickerRow, isDarkMode && styles.timePickerRowDark, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTimePicker(activeTimePicker === 'wakeup' ? null : 'wakeup');
          }}
        >
          <MaterialCommunityIcons name="clock-outline" size={18} color="#10B981" />
          <Text style={[styles.timePickerLabel, isDarkMode && styles.textLight, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('notificationSounds.wakeupAzkarTime')}
          </Text>
          <Text style={styles.timePickerValue}>
            {formatDisplayTime(settings.notifications.wakeupAzkarTime)}
          </Text>
        </TouchableOpacity>
      )}

      {activeTimePicker === 'wakeup' && settings.notifications.wakeupAzkar && (
        <DateTimePicker
          value={parseTime(settings.notifications.wakeupAzkarTime)}
          mode="time"
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          themeVariant={isDarkMode ? 'dark' : 'light'}
          onChange={(_, selectedDate) => {
            if (Platform.OS !== 'ios') setActiveTimePicker(null);
            if (selectedDate) {
              updateNotifications({ wakeupAzkarTime: formatTime(selectedDate) });
            }
          }}
        />
      )}

      {/* After Prayer Azkar */}
      <View style={[styles.innerSettingRow, isDarkMode && styles.innerSettingRowDark, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.innerSettingInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <MaterialCommunityIcons name="hands-pray" size={18} color="#EC4899" />
          <Text style={[styles.innerSettingTitle, isDarkMode && styles.textLight, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('notificationSounds.afterPrayerAzkar')}
          </Text>
        </View>
        <Switch
          value={settings.notifications.afterPrayerAzkar}
          onValueChange={(val) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            updateNotifications({ afterPrayerAzkar: val });
          }}
          trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#2f7659' }}
          thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
          ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
          disabled={!isEnabled}
        />
      </View>

      {settings.notifications.afterPrayerAzkar && (
        <View style={styles.soundInfoRow}>
          <MaterialCommunityIcons name="information-outline" size={16} color={isDarkMode ? '#666' : '#999'} />
          <Text style={[styles.soundInfoText, isDarkMode && styles.textMuted, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('notificationSounds.afterPrayerAutoMsg')}
          </Text>
        </View>
      )}

      {/* Day-of-week picker for all azkar */}
      {renderDayPicker('azkar')}

      {/* Sound picker */}
      {renderReminderSoundPicker('azkar')}

      {renderTestAndCloseButtons('azkar')}
    </View>
  );

  // Reusable per-category sound picker
  const renderReminderSoundPicker = (categoryId: string) => {
    const selectedSound = getCategorySoundType(categoryId);
    return (
      <View style={styles.reminderSoundSection}>
        <View style={[styles.adhanSoundHeader, isDarkMode && { borderBottomColor: '#2a2a3e' }, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <MaterialCommunityIcons name="volume-high" size={20} color="#2f7659" />
          <Text style={[styles.adhanSoundHeaderText, isDarkMode && styles.textLight, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('notificationSounds.reminderSound')}
          </Text>
        </View>
        {REMINDER_SOUNDS.map((sound) => {
          const isSelected = selectedSound === sound.id;
          return (
            <TouchableOpacity
              key={sound.id}
              style={[
                styles.adhanSoundOption,
                isDarkMode && styles.adhanSoundOptionDark,
                isSelected && styles.adhanSoundOptionSelected,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                updateCategorySoundType(categoryId, sound.id);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.adhanSoundIconBg, isSelected && styles.adhanSoundIconBgSelected]}>
                <MaterialCommunityIcons
                  name={sound.id === 'silent' ? 'bell-off' : 'volume-high'}
                  size={18}
                  color={isSelected ? '#fff' : (isDarkMode ? '#aaa' : '#666')}
                />
              </View>
              <View style={[styles.adhanSoundContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={[
                  styles.adhanSoundTitle,
                  isDarkMode && styles.textLight,
                  isSelected && styles.adhanSoundTitleSelected,
                  { textAlign: isRTL ? 'right' : 'left' },
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
                    <ActivityIndicator size="small" color="#2f7659" />
                  ) : (
                    <MaterialCommunityIcons
                      name={previewPlaying === sound.id ? 'stop-circle' : 'play-circle'}
                      size={26}
                      color={previewPlaying === sound.id ? '#ef5350' : '#2f7659'}
                    />
                  )}
                </TouchableOpacity>
              )}
              {isSelected && (
                <MaterialCommunityIcons name="check-circle" size={22} color="#2f7659" />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderSimpleExpanded = (categoryId: string) => {
    const time = getCategoryTime(categoryId);
    const timePickerKey = `time_${categoryId}`;
    const category = NOTIFICATION_CATEGORIES.find(c => c.id === categoryId);

    return (
      <View style={styles.expandedContent}>
        {/* Time picker */}
        {time && (
          <>
            <TouchableOpacity
              style={[styles.timePickerRow, isDarkMode && styles.timePickerRowDark, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTimePicker(activeTimePicker === timePickerKey ? null : timePickerKey);
              }}
            >
              <MaterialCommunityIcons name="clock-outline" size={18} color={category?.iconColor || '#2f7659'} />
              <Text style={[styles.timePickerLabel, isDarkMode && styles.textLight, { textAlign: isRTL ? 'right' : 'left' }]}>
                {t('notificationSounds.reminderTime')}
              </Text>
              <Text style={styles.timePickerValue}>
                {formatDisplayTime(time)}
              </Text>
            </TouchableOpacity>

            {activeTimePicker === timePickerKey && (
              <DateTimePicker
                value={parseTime(time)}
                mode="time"
                is24Hour={false}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                themeVariant={isDarkMode ? 'dark' : 'light'}
                onChange={(_, selectedDate) => {
                  if (Platform.OS !== 'ios') setActiveTimePicker(null);
                  if (selectedDate) {
                    updateCategoryTime(categoryId, formatTime(selectedDate));
                  }
                }}
              />
            )}
          </>
        )}

        {/* Day-of-week picker */}
        {renderDayPicker(categoryId)}

        {/* Per-category sound picker */}
        {renderReminderSoundPicker(categoryId)}

        {renderTestAndCloseButtons(categoryId)}
      </View>
    );
  };

  const renderTestAndCloseButtons = (categoryId: string) => {
    const testContent = getTestContent(categoryId);
    const soundType = categoryId === 'prayer'
      ? (settings.notifications.adhanSoundType || 'default')
      : getCategorySoundType(categoryId);
    
    // Build extra data for custom reminder ayah test
    let extraData: Record<string, any> | undefined;
    if (categoryId === 'customReminder' && settings.notifications.customReminderContentType === 'ayah' 
        && settings.notifications.customReminderSurah && settings.notifications.customReminderAyah) {
      const reciter = settings.notifications.customReminderReciter || 'ar.alafasy';
      // حساب رقم الآية الكلي
      let totalAyahs = 0;
      for (let i = 0; i < settings.notifications.customReminderSurah - 1; i++) {
        totalAyahs += AYAH_COUNTS[i];
      }
      const globalAyah = totalAyahs + settings.notifications.customReminderAyah;
      extraData = {
        type: 'custom',
        contentType: 'ayah',
        surah: settings.notifications.customReminderSurah,
        ayah: settings.notifications.customReminderAyah,
        ayahAudioUrl: getAyahAudioUrl(reciter, globalAyah),
      };
    }

    return (
      <View style={[styles.actionButtonsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity
          style={[styles.testButton, isDarkMode && styles.testButtonDark, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={() => {
            sendTestNotification(testContent.title, testContent.body, soundType, extraData);
          }}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="bell-check" size={18} color="#2f7659" />
          <Text style={[styles.testButtonText, { color: '#2f7659', textAlign: isRTL ? 'right' : 'left' }]}>
            {t('notificationSounds.testNotification')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.closeButton, isDarkMode && styles.closeButtonDark, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={collapseCategory}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="check" size={18} color={colors.text} />
          <Text style={[styles.closeButtonText, isDarkMode && styles.textLight, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('common.done')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderCustomReminderExpanded = () => {
    const time = getCategoryTime('customReminder') || '08:00';
    const timePickerKey = 'time_customReminder';
    const customTitle = settings.notifications.customReminderTitle || '';
    const contentType = settings.notifications.customReminderContentType || 'text';
    const selectedSurah = settings.notifications.customReminderSurah || 0;
    const selectedAyah = settings.notifications.customReminderAyah || 1;
    const selectedReciter = settings.notifications.customReminderReciter || 'ar.alafasy';
    const maxAyah = selectedSurah > 0 ? AYAH_COUNTS[selectedSurah - 1] : 1;

    // حساب رقم الآية الكلي من رقم السورة والآية
    const getGlobalAyahNumber = (surah: number, ayah: number): number => {
      let total = 0;
      for (let i = 0; i < surah - 1; i++) {
        total += AYAH_COUNTS[i];
      }
      return total + ayah;
    };

    const previewAyahAudio = async () => {
      if (!selectedSurah || !selectedAyah) return;
      setAyahPreviewLoading(true);
      try {
        await stopPreview();
        const globalAyah = getGlobalAyahNumber(selectedSurah, selectedAyah);
        const url = getAyahAudioUrl(selectedReciter, globalAyah);
        console.log('🔊 Preview ayah URL:', url);
        const { sound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: true }
        );
        previewSoundRef.current = sound;
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            sound.unloadAsync();
            previewSoundRef.current = null;
          }
        });
      } catch (e) {
        console.warn('Error previewing ayah audio:', e);
      } finally {
        setAyahPreviewLoading(false);
      }
    };

    return (
      <View style={styles.expandedContent}>
        {/* Content type selector */}
        <Text style={[styles.contentSectionTitle, isDarkMode && styles.textLight, { textAlign: isRTL ? 'right' : 'left' }]}>
          {t('notificationSounds.reminderType')}
        </Text>
        <View style={[styles.contentTypeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {CONTENT_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.contentTypeChip,
                isDarkMode && styles.contentTypeChipDark,
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
                color={contentType === type.id ? '#fff' : (isDarkMode ? '#ccc' : '#666')} 
              />
              <Text style={[
                styles.contentTypeText,
                contentType === type.id && styles.contentTypeTextActive,
                contentType !== type.id && isDarkMode && { color: '#ccc' },
                { textAlign: isRTL ? 'right' : 'left' },
              ]}>
                {t(type.labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom title input — always visible */}
        <View style={[styles.timePickerRow, isDarkMode && styles.timePickerRowDark, { marginBottom: 6 }, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <MaterialCommunityIcons name="pencil-outline" size={18} color="#e67e22" />
          <TextInput
            style={[styles.customTitleInput, isDarkMode && styles.textLight]}
            placeholder={contentType === 'text' ? t('notificationSounds.reminderTextPlaceholder') : t('notificationSounds.customTitlePlaceholder')}
            placeholderTextColor={isDarkMode ? '#666' : '#999'}
            value={customTitle}
            onChangeText={(text) => updateNotifications({ customReminderTitle: text })}
            textAlign="right"
          />
        </View>

        {/* Surah picker — for 'ayah' and 'surah' types */}
        {(contentType === 'ayah' || contentType === 'surah') && (
          <>
            <TouchableOpacity
              style={[styles.timePickerRow, isDarkMode && styles.timePickerRowDark, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setShowSurahPicker(!showSurahPicker);
              }}
            >
              <MaterialCommunityIcons name="book-open-variant" size={18} color="#2f7659" />
              <Text style={[styles.timePickerLabel, isDarkMode && styles.textLight, { textAlign: isRTL ? 'right' : 'left' }]}>
                {t('notificationSounds.surah')}
              </Text>
              <Text style={styles.timePickerValue}>
                {selectedSurah > 0 ? getSurahName(selectedSurah) : t('notificationSounds.chooseSurah')}
              </Text>
              <MaterialCommunityIcons 
                name={showSurahPicker ? 'chevron-up' : 'chevron-down'} 
                size={20} 
                color={isDarkMode ? '#999' : '#666'} 
              />
            </TouchableOpacity>

            {showSurahPicker && (
              <ScrollView 
                style={[styles.surahPickerList, isDarkMode && styles.surahPickerListDark]} 
                nestedScrollEnabled
              >
                {Array.from({ length: 114 }, (_, i) => i + 1).map((num) => (
                  <TouchableOpacity
                    key={num}
                    style={[
                      styles.surahPickerItem,
                      selectedSurah === num && styles.surahPickerItemActive,
                      { flexDirection: isRTL ? 'row-reverse' : 'row' },
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
                      isDarkMode && { color: '#999' },
                      selectedSurah === num && { color: '#fff' },
                      { textAlign: isRTL ? 'right' : 'left' },
                    ]}>
                      {num}
                    </Text>
                    <Text style={[
                      styles.surahPickerName,
                      isDarkMode && styles.textLight,
                      selectedSurah === num && { color: '#fff' },
                      { textAlign: isRTL ? 'right' : 'left' },
                    ]}>
                      {getSurahName(num)}
                    </Text>
                    <Text style={[
                      styles.surahPickerAyahCount,
                      isDarkMode && { color: '#666' },
                      selectedSurah === num && { color: 'rgba(255,255,255,0.7)' },
                      { textAlign: isRTL ? 'right' : 'left' },
                    ]}>
                      {AYAH_COUNTS[num - 1]} آية
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </>
        )}

        {/* Ayah number picker — only for 'ayah' type */}
        {contentType === 'ayah' && selectedSurah > 0 && (
          <View style={[styles.timePickerRow, isDarkMode && styles.timePickerRowDark, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <MaterialCommunityIcons name="format-list-numbered" size={18} color="#2f7659" />
            <Text style={[styles.timePickerLabel, isDarkMode && styles.textLight, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('notificationSounds.ayahNumber')}
            </Text>
            <View style={[styles.ayahNumberPicker, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                style={styles.ayahArrowBtn}
                onPress={() => {
                  if (selectedAyah > 1) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    updateNotifications({ customReminderAyah: selectedAyah - 1 });
                  }
                }}
              >
                <MaterialCommunityIcons name="minus" size={18} color={selectedAyah <= 1 ? '#999' : '#2f7659'} />
              </TouchableOpacity>
              <TextInput
                style={[styles.ayahNumberInput, isDarkMode && styles.textLight]}
                value={String(selectedAyah)}
                onChangeText={(text) => {
                  const num = parseInt(text) || 1;
                  updateNotifications({ customReminderAyah: Math.min(Math.max(1, num), maxAyah) });
                }}
                keyboardType="number-pad"
                textAlign="center"
              />
              <TouchableOpacity
                style={styles.ayahArrowBtn}
                onPress={() => {
                  if (selectedAyah < maxAyah) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    updateNotifications({ customReminderAyah: selectedAyah + 1 });
                  }
                }}
              >
                <MaterialCommunityIcons name="plus" size={18} color={selectedAyah >= maxAyah ? '#999' : '#2f7659'} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.ayahMaxLabel, isDarkMode && { color: '#666' }]}>
              / {maxAyah}
            </Text>
          </View>
        )}

        {/* Reciter picker — only for 'ayah' type */}
        {contentType === 'ayah' && selectedSurah > 0 && (
          <>
            <TouchableOpacity
              style={[styles.timePickerRow, isDarkMode && styles.timePickerRowDark, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setShowReciterPicker(!showReciterPicker);
              }}
            >
              <MaterialCommunityIcons name="microphone" size={18} color="#2f7659" />
              <Text style={[styles.timePickerLabel, isDarkMode && styles.textLight, { textAlign: isRTL ? 'right' : 'left' }]}>
                {t('notificationSounds.theReciter')}
              </Text>
              <Text style={styles.timePickerValue}>
                {RECITERS.find(r => r.id === selectedReciter)?.[isArabic ? 'nameAr' : 'name'] || 'Mishary Al-Afasy'}
              </Text>
              <MaterialCommunityIcons 
                name={showReciterPicker ? 'chevron-up' : 'chevron-down'} 
                size={20} 
                color={isDarkMode ? '#999' : '#666'} 
              />
            </TouchableOpacity>

            {showReciterPicker && (
              <View style={[styles.reciterPickerList, isDarkMode && styles.reciterPickerListDark]}>
                {POPULAR_RECITERS.map((reciter) => (
                  <TouchableOpacity
                    key={reciter.id}
                    style={[
                      styles.reciterPickerItem,
                      selectedReciter === reciter.id && styles.reciterPickerItemActive,
                      { alignItems: isRTL ? 'flex-end' : 'flex-start' },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      updateNotifications({ customReminderReciter: reciter.id });
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setShowReciterPicker(false);
                    }}
                  >
                    <Text style={[
                      styles.reciterPickerName,
                      isDarkMode && styles.textLight,
                      selectedReciter === reciter.id && { color: '#fff' },
                      { textAlign: isRTL ? 'right' : 'left' },
                    ]}>
                      {isArabic ? reciter.nameAr : reciter.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Preview ayah audio button */}
            <TouchableOpacity
              style={[styles.previewAyahBtn, isDarkMode && styles.previewAyahBtnDark, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={previewAyahAudio}
              disabled={ayahPreviewLoading}
            >
              {ayahPreviewLoading ? (
                <ActivityIndicator size="small" color="#2f7659" />
              ) : (
                <MaterialCommunityIcons name="play-circle-outline" size={20} color="#2f7659" />
              )}
              <Text style={[styles.previewAyahText, { textAlign: isRTL ? 'right' : 'left' }]}>
                {t('notificationSounds.listenToAyah')}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* Time picker */}
        <TouchableOpacity
          style={[styles.timePickerRow, isDarkMode && styles.timePickerRowDark, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTimePicker(activeTimePicker === timePickerKey ? null : timePickerKey);
          }}
        >
          <MaterialCommunityIcons name="clock-outline" size={18} color="#e67e22" />
          <Text style={[styles.timePickerLabel, isDarkMode && styles.textLight, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('notificationSounds.reminderTime')}
          </Text>
          <Text style={styles.timePickerValue}>
            {formatDisplayTime(time)}
          </Text>
        </TouchableOpacity>

        {activeTimePicker === timePickerKey && (
          <DateTimePicker
            value={parseTime(time)}
            mode="time"
            is24Hour={false}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            themeVariant={isDarkMode ? 'dark' : 'light'}
            onChange={(_, selectedDate) => {
              if (Platform.OS !== 'ios') setActiveTimePicker(null);
              if (selectedDate) {
                updateCategoryTime('customReminder', formatTime(selectedDate));
              }
            }}
          />
        )}

        {/* Day-of-week picker */}
        {renderDayPicker('customReminder')}

        {/* Sound picker — hide when ayah audio is the sound source */}
        {contentType !== 'ayah' && renderReminderSoundPicker('customReminder')}

        {contentType === 'ayah' && (
          <View style={[styles.soundInfoRow]}>
            <MaterialCommunityIcons name="information-outline" size={16} color={isDarkMode ? '#888' : '#999'} />
            <Text style={[styles.soundInfoText, isDarkMode && { color: '#888' }, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('notificationSounds.ayahAsSound')}
            </Text>
          </View>
        )}

        {renderTestAndCloseButtons('customReminder')}
      </View>
    );
  };

  const renderExpandedContent = (categoryId: string) => {
    switch (categoryId) {
      case 'prayer': return renderPrayerExpanded();
      case 'azkar': return renderAzkarExpanded();
      case 'customReminder': return renderCustomReminderExpanded();
      default: return renderSimpleExpanded(categoryId);
    }
  };

  // ========================================
  // Render
  // ========================================

  return (
    <BackgroundWrapper backgroundKey={settings.display.appBackground} backgroundUrl={settings.display.appBackgroundUrl} opacity={settings.display.backgroundOpacity ?? 1} style={{ flex: 1 }}>
    <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]} edges={['top']}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#11151c' : '#fff'}
      />

      {/* Header */}
      <Animated.View
        entering={FadeInDown.duration(500)}
        style={[styles.header, isDarkMode && styles.headerDark, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
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
        <Text style={[styles.headerTitle, isDarkMode && styles.textLight]}>{t('settings.notifications')}</Text>
        <View style={styles.headerPlaceholder} />
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Permission Card */}
        {permissionStatus !== 'granted' && (
          <Animated.View entering={FadeInDown.delay(50).duration(500)}>
            <TouchableOpacity
              style={[styles.permissionCard, isDarkMode && styles.permissionCardDark, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={requestPermissions}
              activeOpacity={0.8}
            >
              <View style={styles.permissionIcon}>
                <MaterialCommunityIcons name="bell-off" size={32} color="#ef5350" />
              </View>
              <View style={[styles.permissionContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={[styles.permissionTitle, isDarkMode && styles.textLight, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {t('notificationSounds.notificationsDisabled')}
                </Text>
                <Text style={[styles.permissionSubtitle, isDarkMode && styles.textMuted, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {t('notificationSounds.tapToEnable')}
                </Text>
              </View>
              <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={24} color="#ef5350" />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Main Toggle */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <View style={[styles.mainToggleCard, isDarkMode && styles.mainToggleCardDark, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={styles.mainToggleIconBg}>
              <MaterialCommunityIcons name="bell" size={26} color="#fff" />
            </View>
            <View style={[styles.mainToggleContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <Text style={[styles.mainToggleTitle, isDarkMode && styles.textLight, { textAlign: isRTL ? 'right' : 'left' }]}>
                {t('notificationSounds.enableNotifications')}
              </Text>
              <Text style={[styles.mainToggleSubtitle, isDarkMode && styles.textMuted, { textAlign: isRTL ? 'right' : 'left' }]}>
                {t('settings.prayerAndAzkarAlerts')}
              </Text>
            </View>
            <Switch
              value={settings.notifications.enabled}
              onValueChange={handleToggleMain}
              trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#2f7659' }}
              thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
              ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
            />
          </View>
        </Animated.View>

        {/* Notification Categories */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>
            {t('notificationSounds.notificationTypes')}
          </Text>

          <View style={[styles.categoriesContainer, isDarkMode && styles.categoriesContainerDark]}>
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
                      !isLast && !isExpanded && isDarkMode && styles.categoryRowBorderDark,
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
                      <Text style={[styles.categoryTitle, isDarkMode && styles.textLight, { textAlign: isRTL ? 'right' : 'left' }]}>
                        {t(category.titleKey)}
                      </Text>
                      <Text style={[styles.categorySubtitle, isDarkMode && styles.textMuted, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
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
                      trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#2f7659' }}
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
                        color={isDarkMode ? '#666' : '#999'}
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>

                  {/* Expanded content */}
                  {isExpanded && categoryEnabled && isEnabled && (
                    <View style={[
                      styles.expandedWrapper,
                      isDarkMode && styles.expandedWrapperDark,
                      !isLast && styles.categoryRowBorder,
                      !isLast && isDarkMode && styles.categoryRowBorderDark,
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
          <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>{t('settings.sound')}</Text>
          <View style={[styles.categoriesContainer, isDarkMode && styles.categoriesContainerDark]}>
            <View style={[styles.innerSettingRow, styles.globalSettingRow, isDarkMode && styles.innerSettingRowDark, styles.categoryRowBorder, isDarkMode && styles.categoryRowBorderDark, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.innerSettingInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.categoryIconBg, { backgroundColor: '#c17f5918' }]}>
                  <MaterialCommunityIcons name="volume-high" size={20} color="#c17f59" />
                </View>
                <Text style={[styles.categoryTitle, isDarkMode && styles.textLight]}>
                  {t('notificationSounds.notificationSound')}
                </Text>
              </View>
              <Switch
                value={settings.notifications.sound !== false}
                onValueChange={(val) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateNotifications({ sound: val });
                }}
                trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#2f7659' }}
                thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
                ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
                disabled={!isEnabled}
              />
            </View>

            <View style={[styles.innerSettingRow, styles.globalSettingRow, isDarkMode && styles.innerSettingRowDark, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.innerSettingInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.categoryIconBg, { backgroundColor: '#ef535018' }]}>
                  <MaterialCommunityIcons name="vibrate" size={20} color="#ef5350" />
                </View>
                <Text style={[styles.categoryTitle, isDarkMode && styles.textLight]}>
                  {t('notificationSounds.vibration')}
                </Text>
              </View>
              <Switch
                value={settings.notifications.vibration !== false}
                onValueChange={(val) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateNotifications({ vibration: val });
                }}
                trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#2f7659' }}
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
                  <Text style={[styles.categoryTitle, isDarkMode && styles.textLight]}>
                    {t('notificationSounds.additionalSounds')}
                  </Text>
                  <Text style={[styles.categorySubtitle, isDarkMode && styles.textMuted, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {downloadableSounds.length} {t('notificationSounds.soundsAvailable')}
                  </Text>
                </View>
              </View>
              <MaterialCommunityIcons
                name={showDownloadSection ? 'chevron-up' : 'chevron-down'}
                size={24}
                color={isDarkMode ? '#9CA3AF' : '#6B7280'}
              />
            </TouchableOpacity>

            {showDownloadSection && (
              <View style={[styles.categoriesContainer, isDarkMode && styles.categoriesContainerDark, { marginTop: 8 }]}>
                {downloadableSounds.map((sound, index) => {
                  const isDownloaded = downloadedSounds.some(d => d.id === sound.id);
                  const isDownloading = downloadingId === sound.id;
                  const isLast = index === downloadableSounds.length - 1;

                  return (
                    <View
                      key={sound.id}
                      style={[
                        styles.downloadSoundRow,
                        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: isDarkMode ? '#333' : '#eee' },
                        { flexDirection: isRTL ? 'row-reverse' : 'row' },
                      ]}
                    >
                      <View style={[styles.downloadSoundInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <MaterialCommunityIcons
                          name={isDownloaded ? 'check-circle' : 'music-circle'}
                          size={28}
                          color={isDownloaded ? '#22C55E' : '#ab47bc'}
                        />
                        <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                          <Text style={[styles.downloadSoundName, isDarkMode && styles.textLight, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {sound.name}
                          </Text>
                          {sound.description ? (
                            <Text style={[styles.downloadSoundDesc, isDarkMode && styles.textMuted, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
                              {sound.description}
                            </Text>
                          ) : null}
                          <Text style={[styles.downloadSoundSize, isDarkMode && styles.textMuted, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {(sound.fileSize / 1024).toFixed(0)} KB
                          </Text>
                        </View>
                      </View>

                      {isDownloaded ? (
                        <View style={[styles.downloadedBadge, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                          <MaterialCommunityIcons name="check" size={14} color="#22C55E" />
                          <Text style={[styles.downloadedText, { textAlign: isRTL ? 'right' : 'left' }]}>{t('notificationSounds.downloaded')}</Text>
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
                              <Text style={[styles.downloadButtonText, { textAlign: isRTL ? 'right' : 'left' }]}>{t('notificationSounds.download')}</Text>
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
        <Animated.View entering={FadeInDown.delay(400).duration(500)} style={[styles.infoCard, isDarkMode && styles.infoCardDark, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <MaterialCommunityIcons name="information" size={20} color="#3a7ca5" />
          <Text style={[styles.infoText, isDarkMode && styles.textMuted, { textAlign: isRTL ? 'right' : 'left' }]}>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerDark: {
    backgroundColor: '#1a1a2e',
    borderBottomColor: '#2a2a3e',
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
    color: '#333',
  },
  headerPlaceholder: {
    width: 40,
  },
  textLight: {
    color: '#fff',
  },
  textMuted: {
    color: '#999',
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
    backgroundColor: '#ffebee',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  permissionCardDark: {
    backgroundColor: '#3a1a1a',
  },
  permissionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
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
    color: '#333',
  },
  permissionSubtitle: {
    fontSize: 13,
    fontFamily: fontRegular(),
    color: '#666',
    marginTop: 2,
  },

  // Main toggle card
  mainToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginTop: 5,
  },
  mainToggleCardDark: {
    backgroundColor: '#1a1a2e',
  },
  mainToggleIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#2f7659',
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
    color: '#333',
  },
  mainToggleSubtitle: {
    fontSize: 13,
    fontFamily: fontRegular(),
    color: '#999',
    marginTop: 2,
  },

  // Section title
  sectionTitle: {
    fontSize: 14,
    fontFamily: fontBold(),
    color: '#666',
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 10,
  },

  // Categories container
  categoriesContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  categoriesContainerDark: {
    backgroundColor: '#1a1a2e',
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
    borderBottomColor: '#f0f0f0',
  },
  categoryRowBorderDark: {
    borderBottomColor: '#2a2a3e',
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
    color: '#333',
  },
  categorySubtitle: {
    fontSize: 12,
    fontFamily: fontRegular(),
    color: '#999',
    marginTop: 1,
  },
  expandArrow: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Expanded content
  expandedWrapper: {
    backgroundColor: '#fafafa',
    paddingBottom: 4,
  },
  expandedWrapperDark: {
    backgroundColor: '#151528',
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
    borderBottomColor: '#eee',
  },
  innerSettingRowDark: {
    borderBottomColor: '#2a2a3e',
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
    color: '#333',
  },
  globalSettingRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },

  // Small label
  smallLabel: {
    fontSize: 13,
    fontFamily: fontMedium(),
    color: '#666',
    marginBottom: 10,
    marginTop: 8,
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
    backgroundColor: '#f0f0f0',
    gap: 8,
  },
  chipOptionDark: {
    backgroundColor: '#2a2a3e',
  },
  chipOptionSelected: {
    backgroundColor: '#2f7659',
  },
  chipOptionText: {
    fontSize: 13,
    fontFamily: fontMedium(),
    color: '#666',
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
    backgroundColor: '#f5f5f5',
    gap: 10,
  },
  timePickerRowDark: {
    backgroundColor: '#1e1e36',
  },
  timePickerLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: fontMedium(),
    color: '#333',
  },
  timePickerValue: {
    fontSize: 15,
    fontFamily: fontSemiBold(),
    color: '#2f7659',
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
    color: '#999',
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
    borderBottomColor: '#eee',
    gap: 10,
  },
  adhanSoundHeaderText: {
    flex: 1,
    fontSize: 14,
    fontFamily: fontSemiBold(),
    color: '#333',
  },
  adhanSoundOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
    gap: 10,
  },
  adhanSoundOptionDark: {
    borderBottomColor: '#2a2a3e',
  },
  adhanSoundOptionSelected: {
    backgroundColor: 'rgba(47, 118, 89, 0.06)',
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
    backgroundColor: '#2f7659',
  },
  adhanSoundContent: {
    flex: 1,
  },
  adhanSoundTitle: {
    fontSize: 14,
    fontFamily: fontSemiBold(),
    color: '#333',
  },
  adhanSoundTitleSelected: {
    color: '#2f7659',
  },
  adhanSoundSubtitle: {
    fontSize: 11,
    fontFamily: fontRegular(),
    color: '#999',
    marginTop: 1,
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
    borderTopColor: '#eee',
  },
  testButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(47, 118, 89, 0.1)',
    gap: 8,
  },
  testButtonDark: {
    backgroundColor: 'rgba(47, 118, 89, 0.15)',
  },
  testButtonText: {
    fontSize: 14,
    fontFamily: fontSemiBold(),
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
  closeButtonDark: {
    backgroundColor: '#2a2a3e',
  },
  closeButtonText: {
    fontSize: 14,
    fontFamily: fontSemiBold(),
    color: '#333',
  },

  // Sound picker
  soundPickerContainer: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
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
    color: '#666',
  },

  // Custom title input
  customTitleInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: fontMedium(),
    color: '#333',
    paddingVertical: 0,
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
  infoCardDark: {
    backgroundColor: 'rgba(58, 124, 165, 0.1)',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fontRegular(),
    color: '#333',
    lineHeight: 22,
  },

  bottomSpace: {
    height: 100,
  },

  // Custom reminder content type styles
  contentSectionTitle: {
    fontSize: 13,
    fontFamily: fontSemiBold(),
    color: '#555',
    marginBottom: 8,
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
    borderColor: '#e0e0e0',
  },
  contentTypeChipDark: {
    backgroundColor: '#2a2a3e',
    borderColor: '#3a3a4e',
  },
  contentTypeChipActive: {
    backgroundColor: '#2f7659',
    borderColor: '#2f7659',
  },
  contentTypeText: {
    fontSize: 13,
    fontFamily: fontMedium(),
    color: '#555',
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
  surahPickerListDark: {
    backgroundColor: '#1a1a2e',
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
    backgroundColor: '#2f7659',
    borderRadius: 8,
    borderBottomColor: 'transparent',
  },
  surahPickerNumber: {
    fontSize: 13,
    fontFamily: fontRegular(),
    color: '#999',
    width: 28,
    textAlign: 'center' as const,
  },
  surahPickerName: {
    flex: 1,
    fontSize: 15,
    fontFamily: fontMedium(),
    color: '#333',
  },
  surahPickerAyahCount: {
    fontSize: 11,
    fontFamily: fontRegular(),
    color: '#999',
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
    backgroundColor: 'rgba(47,118,89,0.1)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  ayahNumberInput: {
    fontSize: 16,
    fontFamily: fontSemiBold(),
    color: '#333',
    minWidth: 40,
    paddingVertical: 2,
  },
  ayahMaxLabel: {
    fontSize: 12,
    fontFamily: fontRegular(),
    color: '#999',
  },

  // Reciter picker
  reciterPickerList: {
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    marginBottom: 6,
    paddingVertical: 4,
  },
  reciterPickerListDark: {
    backgroundColor: '#1a1a2e',
  },
  reciterPickerItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  reciterPickerItemActive: {
    backgroundColor: '#2f7659',
    borderRadius: 8,
    borderBottomColor: 'transparent',
  },
  reciterPickerName: {
    fontSize: 14,
    fontFamily: fontMedium(),
    color: '#333',
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
    backgroundColor: 'rgba(47,118,89,0.08)',
    marginVertical: 4,
  },
  previewAyahBtnDark: {
    backgroundColor: 'rgba(47,118,89,0.15)',
  },
  previewAyahText: {
    fontSize: 14,
    fontFamily: fontMedium(),
    color: '#2f7659',
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
    color: '#333',
  },
  downloadSoundDesc: {
    fontSize: 12,
    fontFamily: fontRegular(),
    color: '#777',
    marginTop: 1,
  },
  downloadSoundSize: {
    fontSize: 11,
    fontFamily: fontRegular(),
    color: '#999',
    marginTop: 2,
  },
  downloadedBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    backgroundColor: 'rgba(34,197,94,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  downloadedText: {
    fontSize: 12,
    fontFamily: fontMedium(),
    color: '#22C55E',
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
  },
  // Day picker styles
  dayPickerContainer: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
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
    color: '#555',
  },
  dayPickerToggleAll: {
    fontSize: 12,
    fontFamily: fontSemiBold(),
  },
  dayChipsRow: {
    justifyContent: 'space-between' as const,
    gap: 8,
  },
  dayChip: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    minHeight: 32,
  },
  dayChipSelected: {
    backgroundColor: '#2f7659',
  },
  dayChipDark: {
    backgroundColor: '#2a2a2c',
  },
  dayChipText: {
    fontSize: 11,
    fontFamily: fontSemiBold(),
    color: '#555',
  },
  dayChipTextSelected: {
    color: '#fff',
  },
  dayChipTextDark: {
    color: '#aaa',
  },
});