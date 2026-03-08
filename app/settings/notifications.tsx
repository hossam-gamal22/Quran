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
  I18nManager,
  ActivityIndicator,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import Animated, { FadeInDown } from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useSettings, NotificationSoundType, AdhanSoundType } from '@/contexts/SettingsContext';
import { t } from '@/lib/i18n';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ========================================
// أصوات الأذان - روابط المعاينة
// ========================================
const ADHAN_PREVIEW_URLS: Record<string, string> = {
  makkah: 'https://cdn.aladhan.com/audio/adhans/1.mp3',
  madinah: 'https://cdn.aladhan.com/audio/adhans/7.mp3',
  alaqsa: 'https://cdn.aladhan.com/audio/adhans/3.mp3',
  mishary: 'https://cdn.aladhan.com/audio/adhans/4.mp3',
  abdulbasit: 'https://cdn.aladhan.com/audio/adhans/5.mp3',
};

// ========================================
// الثوابت
// ========================================

const NOTIFICATION_SOUNDS: { id: NotificationSoundType; name: string; icon: string }[] = [
  { id: 'default', name: t('notificationSounds.defaultSound'), icon: 'bell-ring' },
  { id: 'asbahna', name: t('notificationSounds.asbahna'), icon: 'weather-sunset-up' },
  { id: 'amsayna', name: t('notificationSounds.amsayna'), icon: 'weather-sunset-down' },
  { id: 'subhanallah', name: t('notificationSounds.subhanallah'), icon: 'star-crescent' },
  { id: 'alhamdulillah', name: t('notificationSounds.alhamdulillah'), icon: 'hand-heart' },
  { id: 'allahuakbar', name: t('notificationSounds.allahuakbar'), icon: 'mosque' },
  { id: 'silent', name: t('notificationSounds.silent'), icon: 'bell-off' },
];

const ADHAN_SOUNDS: { id: AdhanSoundType; name: string; description: string; icon: string }[] = [
  { id: 'default', name: t('notificationSounds.defaultSound'), description: t('notificationSounds.systemSound'), icon: 'bell-ring' },
  { id: 'makkah', name: t('notificationSounds.makkah'), description: t('notificationSounds.makkahDesc'), icon: 'kaaba' },
  { id: 'madinah', name: t('notificationSounds.madinah'), description: t('notificationSounds.madinahDesc'), icon: 'mosque' },
  { id: 'alaqsa', name: t('notificationSounds.alaqsa'), description: t('notificationSounds.alaqsaDesc'), icon: 'dome-light' },
  { id: 'mishary', name: t('notificationSounds.mishary'), description: t('notificationSounds.misharyDesc'), icon: 'account-voice' },
  { id: 'abdulbasit', name: t('notificationSounds.abdulbasit'), description: t('notificationSounds.abdulbasitDesc'), icon: 'account-voice' },
  { id: 'silent', name: t('notificationSounds.silent'), description: t('notificationSounds.silentDesc'), icon: 'bell-off' },
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
  title: string;
  subtitle: string;
}

const NOTIFICATION_CATEGORIES: NotificationCategoryDef[] = [
  {
    id: 'prayer',
    icon: 'mosque',
    iconColor: '#2f7659',
    title: 'إشعارات الصلاة',
    subtitle: 'تنبيهات مواقيت الصلاة والأذان',
  },
  {
    id: 'salawat',
    icon: 'heart',
    iconColor: '#d4a039',
    title: 'الصلاة على النبي ﷺ',
    subtitle: 'تذكير بالصلاة على النبي',
  },
  {
    id: 'tasbih',
    icon: 'star-crescent',
    iconColor: '#2896a5',
    title: 'المسبحة / التسبيح',
    subtitle: 'تذكير بالتسبيح والذكر',
  },
  {
    id: 'istighfar',
    icon: 'hand-heart',
    iconColor: '#7c5bbf',
    title: 'الاستغفار',
    subtitle: 'تذكير بالاستغفار',
  },
  {
    id: 'azkar',
    icon: 'book-open-variant',
    iconColor: '#f5a623',
    title: 'تذكيرات الأذكار',
    subtitle: 'الصباح والمساء والنوم والاستيقاظ',
  },
  {
    id: 'dailyVerse',
    icon: 'book-open-page-variant',
    iconColor: '#2f7659',
    title: 'آية اليوم',
    subtitle: 'آية قرآنية يومية مع تفسيرها',
  },
];

// ========================================
// Helper functions
// ========================================

const formatDisplayTime = (timeStr: string): string => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'م' : 'ص';
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

const sendTestNotification = async (title: string, body: string) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: null,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
};

// ========================================
// المكون الرئيسي
// ========================================

export default function NotificationsScreen() {
  const router = useRouter();
  const { settings, isDarkMode, updateNotifications } = useSettings();
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

  // Sound preview state
  const [previewPlaying, setPreviewPlaying] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const previewSoundRef = useRef<Audio.Sound | null>(null);

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

    const url = ADHAN_PREVIEW_URLS[soundId];
    if (!url) return;

    setPreviewLoading(soundId);
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
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
        'الإشعارات مطلوبة',
        'للحصول على تنبيهات الصلاة والأذكار، يرجى تفعيل الإشعارات من إعدادات الجهاز.',
        [
          { text: 'إلغاء', style: 'cancel' },
          { text: 'فتح الإعدادات', onPress: () => Linking.openSettings() },
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
    }
  };

  // Get time for a category
  const getCategoryTime = (categoryId: string): string | null => {
    switch (categoryId) {
      case 'salawat': return settings.notifications.salawatReminderTime ?? '09:00';
      case 'tasbih': return settings.notifications.tasbihReminderTime ?? '15:00';
      case 'istighfar': return settings.notifications.istighfarReminderTime ?? '12:00';
      case 'dailyVerse': return settings.notifications.dailyVerseTime;
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
    }
  };

  // Get test notification content for each category
  const getTestContent = (categoryId: string): { title: string; body: string } => {
    switch (categoryId) {
      case 'prayer':
        return { title: '🕌 تنبيه الصلاة', body: 'حان الآن موعد صلاة الظهر - اختبار الإشعارات' };
      case 'salawat':
        return { title: '💚 الصلاة على النبي ﷺ', body: 'اللهم صلِّ وسلم على نبينا محمد ﷺ' };
      case 'tasbih':
        return { title: '📿 تذكير التسبيح', body: 'سبحان الله وبحمده، سبحان الله العظيم' };
      case 'istighfar':
        return { title: '🤲 تذكير الاستغفار', body: 'أستغفر الله العظيم وأتوب إليه' };
      case 'azkar':
        return { title: '📖 تذكير الأذكار', body: 'حان وقت أذكار الصباح - اختبار الإشعارات' };
      case 'dailyVerse':
        return { title: '📖 آية اليوم', body: '﴿ إِنَّ مَعَ الْعُسْرِ يُسْرًا ﴾ - اختبار' };
      default:
        return { title: 'إشعار تجريبي', body: 'هذا إشعار تجريبي من روح المسلم' };
    }
  };

  // Sound mapping description for each category
  const getSoundDescription = (categoryId: string): string => {
    switch (categoryId) {
      case 'prayer': return 'صوت الأذان المختار';
      case 'salawat': return 'صوت الصلاة على النبي';
      case 'tasbih': return 'صوت سبحان الله وبحمده';
      case 'istighfar': return 'صوت الاستغفار';
      case 'azkar': return 'نغمة التذكير';
      case 'dailyVerse': return 'نغمة الإشعار الافتراضية';
      default: return 'نغمة افتراضية';
    }
  };

  // ========================================
  // Render category expanded content
  // ========================================

  const renderPrayerExpanded = () => (
    <View style={styles.expandedContent}>
      {/* Prayer reminder toggle */}
      <View style={[styles.innerSettingRow, isDarkMode && styles.innerSettingRowDark]}>
        <View style={styles.innerSettingInfo}>
          <MaterialCommunityIcons name="bell-ring" size={18} color="#f5a623" />
          <Text style={[styles.innerSettingTitle, isDarkMode && styles.textLight]}>
            التذكير قبل الأذان
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
            التذكير قبل الأذان بـ:
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reminderScroll}>
            {REMINDER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.chipOption,
                  isDarkMode && styles.chipOptionDark,
                  settings.notifications.reminderMinutes === option.value && styles.chipOptionSelected,
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
        <Text style={[styles.smallLabel, isDarkMode && styles.textMuted]}>
          اختر الصلوات:
        </Text>
        {PRAYER_NAMES.map((prayer) => (
          <View key={prayer.key} style={[styles.innerSettingRow, isDarkMode && styles.innerSettingRowDark]}>
            <View style={styles.innerSettingInfo}>
              <MaterialCommunityIcons
                name={prayer.icon as any}
                size={18}
                color={prayer.key === 'fajr' ? '#5d4e8c' : prayer.key === 'isha' ? '#3a7ca5' : '#c17f59'}
              />
              <Text style={[styles.innerSettingTitle, isDarkMode && styles.textLight]}>
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
        <View style={[styles.adhanSoundHeader, isDarkMode && { borderBottomColor: '#2a2a3e' }]}>
          <MaterialCommunityIcons name="volume-high" size={20} color="#2f7659" />
          <Text style={[styles.adhanSoundHeaderText, isDarkMode && styles.textLight]}>
            صوت الأذان
          </Text>
        </View>
        {ADHAN_SOUNDS.map((sound) => {
          const isSelected = (settings.notifications.adhanSoundType || 'default') === sound.id;
          return (
            <TouchableOpacity
              key={sound.id}
              style={[
                styles.adhanSoundOption,
                isDarkMode && styles.adhanSoundOptionDark,
                isSelected && styles.adhanSoundOptionSelected,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                updateNotifications({ adhanSoundType: sound.id });
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
              <View style={styles.adhanSoundContent}>
                <Text style={[
                  styles.adhanSoundTitle,
                  isDarkMode && styles.textLight,
                  isSelected && styles.adhanSoundTitleSelected,
                ]}>
                  {sound.name}
                </Text>
                <Text style={[styles.adhanSoundSubtitle, isDarkMode && styles.textMuted]}>
                  {sound.description}
                </Text>
              </View>
              {ADHAN_PREVIEW_URLS[sound.id] && (
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
      <View style={[styles.innerSettingRow, isDarkMode && styles.innerSettingRowDark]}>
        <View style={styles.innerSettingInfo}>
          <MaterialCommunityIcons name="weather-sunset-up" size={18} color="#f5a623" />
          <Text style={[styles.innerSettingTitle, isDarkMode && styles.textLight]}>
            أذكار الصباح
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
          style={[styles.timePickerRow, isDarkMode && styles.timePickerRowDark]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTimePicker(activeTimePicker === 'morning' ? null : 'morning');
          }}
        >
          <MaterialCommunityIcons name="clock-outline" size={18} color="#f5a623" />
          <Text style={[styles.timePickerLabel, isDarkMode && styles.textLight]}>
            وقت أذكار الصباح
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
          onChange={(_, selectedDate) => {
            if (Platform.OS !== 'ios') setActiveTimePicker(null);
            if (selectedDate) {
              updateNotifications({ morningAzkarTime: formatTime(selectedDate) });
            }
          }}
        />
      )}

      {/* Evening Azkar */}
      <View style={[styles.innerSettingRow, isDarkMode && styles.innerSettingRowDark]}>
        <View style={styles.innerSettingInfo}>
          <MaterialCommunityIcons name="weather-sunset-down" size={18} color="#5d4e8c" />
          <Text style={[styles.innerSettingTitle, isDarkMode && styles.textLight]}>
            أذكار المساء
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
          style={[styles.timePickerRow, isDarkMode && styles.timePickerRowDark]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTimePicker(activeTimePicker === 'evening' ? null : 'evening');
          }}
        >
          <MaterialCommunityIcons name="clock-outline" size={18} color="#5d4e8c" />
          <Text style={[styles.timePickerLabel, isDarkMode && styles.textLight]}>
            وقت أذكار المساء
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
          onChange={(_, selectedDate) => {
            if (Platform.OS !== 'ios') setActiveTimePicker(null);
            if (selectedDate) {
              updateNotifications({ eveningAzkarTime: formatTime(selectedDate) });
            }
          }}
        />
      )}

      {/* Sleep Azkar */}
      <View style={[styles.innerSettingRow, isDarkMode && styles.innerSettingRowDark]}>
        <View style={styles.innerSettingInfo}>
          <MaterialCommunityIcons name="bed" size={18} color="#3B82F6" />
          <Text style={[styles.innerSettingTitle, isDarkMode && styles.textLight]}>
            أذكار النوم
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
          style={[styles.timePickerRow, isDarkMode && styles.timePickerRowDark]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTimePicker(activeTimePicker === 'sleep' ? null : 'sleep');
          }}
        >
          <MaterialCommunityIcons name="clock-outline" size={18} color="#3B82F6" />
          <Text style={[styles.timePickerLabel, isDarkMode && styles.textLight]}>
            وقت أذكار النوم
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
          onChange={(_, selectedDate) => {
            if (Platform.OS !== 'ios') setActiveTimePicker(null);
            if (selectedDate) {
              updateNotifications({ sleepAzkarTime: formatTime(selectedDate) });
            }
          }}
        />
      )}

      {/* Wakeup Azkar */}
      <View style={[styles.innerSettingRow, isDarkMode && styles.innerSettingRowDark]}>
        <View style={styles.innerSettingInfo}>
          <MaterialCommunityIcons name="weather-sunset-up" size={18} color="#10B981" />
          <Text style={[styles.innerSettingTitle, isDarkMode && styles.textLight]}>
            أذكار الاستيقاظ
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
          style={[styles.timePickerRow, isDarkMode && styles.timePickerRowDark]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTimePicker(activeTimePicker === 'wakeup' ? null : 'wakeup');
          }}
        >
          <MaterialCommunityIcons name="clock-outline" size={18} color="#10B981" />
          <Text style={[styles.timePickerLabel, isDarkMode && styles.textLight]}>
            وقت أذكار الاستيقاظ
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
          onChange={(_, selectedDate) => {
            if (Platform.OS !== 'ios') setActiveTimePicker(null);
            if (selectedDate) {
              updateNotifications({ wakeupAzkarTime: formatTime(selectedDate) });
            }
          }}
        />
      )}

      {/* After Prayer Azkar */}
      <View style={[styles.innerSettingRow, isDarkMode && styles.innerSettingRowDark]}>
        <View style={styles.innerSettingInfo}>
          <MaterialCommunityIcons name="hands-pray" size={18} color="#EC4899" />
          <Text style={[styles.innerSettingTitle, isDarkMode && styles.textLight]}>
            أذكار بعد الصلاة
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
          <Text style={[styles.soundInfoText, isDarkMode && styles.textMuted]}>
            يُرسل التذكير بعد كل صلاة تلقائياً
          </Text>
        </View>
      )}

      {/* Sound info */}
      <View style={styles.soundInfoRow}>
        <MaterialCommunityIcons name="music-note" size={16} color={isDarkMode ? '#666' : '#999'} />
        <Text style={[styles.soundInfoText, isDarkMode && styles.textMuted]}>
          {getSoundDescription('azkar')}
        </Text>
      </View>

      {renderTestAndCloseButtons('azkar')}
    </View>
  );

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
              style={[styles.timePickerRow, isDarkMode && styles.timePickerRowDark]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTimePicker(activeTimePicker === timePickerKey ? null : timePickerKey);
              }}
            >
              <MaterialCommunityIcons name="clock-outline" size={18} color={category?.iconColor || '#2f7659'} />
              <Text style={[styles.timePickerLabel, isDarkMode && styles.textLight]}>
                وقت التذكير
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

        {/* Sound info */}
        <View style={styles.soundInfoRow}>
          <MaterialCommunityIcons name="music-note" size={16} color={isDarkMode ? '#666' : '#999'} />
          <Text style={[styles.soundInfoText, isDarkMode && styles.textMuted]}>
            {getSoundDescription(categoryId)}
          </Text>
        </View>

        {renderTestAndCloseButtons(categoryId)}
      </View>
    );
  };

  const renderTestAndCloseButtons = (categoryId: string) => {
    const testContent = getTestContent(categoryId);
    return (
      <View style={styles.actionButtonsRow}>
        <TouchableOpacity
          style={[styles.testButton, isDarkMode && styles.testButtonDark]}
          onPress={() => {
            sendTestNotification(testContent.title, testContent.body);
          }}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="bell-check" size={18} color="#2f7659" />
          <Text style={[styles.testButtonText, { color: '#2f7659' }]}>
            تجربة الإشعار
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.closeButton, isDarkMode && styles.closeButtonDark]}
          onPress={collapseCategory}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="check" size={18} color={isDarkMode ? '#fff' : '#333'} />
          <Text style={[styles.closeButtonText, isDarkMode && styles.textLight]}>
            تم
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderExpandedContent = (categoryId: string) => {
    switch (categoryId) {
      case 'prayer': return renderPrayerExpanded();
      case 'azkar': return renderAzkarExpanded();
      default: return renderSimpleExpanded(categoryId);
    }
  };

  // ========================================
  // Render
  // ========================================

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]} edges={['top']}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#11151c' : '#fff'}
      />

      {/* Header */}
      <Animated.View
        entering={FadeInDown.duration(500)}
        style={[styles.header, isDarkMode && styles.headerDark]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <MaterialCommunityIcons name={I18nManager.isRTL ? 'arrow-right' : 'arrow-left'} size={28} color={isDarkMode ? '#fff' : '#333'} />
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
              style={[styles.permissionCard, isDarkMode && styles.permissionCardDark]}
              onPress={requestPermissions}
              activeOpacity={0.8}
            >
              <View style={styles.permissionIcon}>
                <MaterialCommunityIcons name="bell-off" size={32} color="#ef5350" />
              </View>
              <View style={styles.permissionContent}>
                <Text style={[styles.permissionTitle, isDarkMode && styles.textLight]}>
                  الإشعارات معطلة
                </Text>
                <Text style={[styles.permissionSubtitle, isDarkMode && styles.textMuted]}>
                  اضغط هنا لتفعيل الإشعارات
                </Text>
              </View>
              <MaterialCommunityIcons name={I18nManager.isRTL ? 'chevron-left' : 'chevron-right'} size={24} color="#ef5350" />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Main Toggle */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <View style={[styles.mainToggleCard, isDarkMode && styles.mainToggleCardDark]}>
            <View style={styles.mainToggleIconBg}>
              <MaterialCommunityIcons name="bell" size={26} color="#fff" />
            </View>
            <View style={styles.mainToggleContent}>
              <Text style={[styles.mainToggleTitle, isDarkMode && styles.textLight]}>
                تفعيل الإشعارات
              </Text>
              <Text style={[styles.mainToggleSubtitle, isDarkMode && styles.textMuted]}>
                تنبيهات الصلاة والأذكار
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
            أنواع الإشعارات
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
                    <View style={styles.categoryContent}>
                      <Text style={[styles.categoryTitle, isDarkMode && styles.textLight]}>
                        {category.title}
                      </Text>
                      <Text style={[styles.categorySubtitle, isDarkMode && styles.textMuted]} numberOfLines={1}>
                        {category.subtitle}
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
            <View style={[styles.innerSettingRow, styles.globalSettingRow, isDarkMode && styles.innerSettingRowDark, styles.categoryRowBorder, isDarkMode && styles.categoryRowBorderDark]}>
              <View style={styles.innerSettingInfo}>
                <View style={[styles.categoryIconBg, { backgroundColor: '#c17f5918' }]}>
                  <MaterialCommunityIcons name="volume-high" size={20} color="#c17f59" />
                </View>
                <Text style={[styles.categoryTitle, isDarkMode && styles.textLight, { marginStart: 12 }]}>
                  صوت الإشعارات
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

            {/* Notification sound type picker */}
            {settings.notifications.sound !== false && isEnabled && (
              <View style={[styles.soundPickerContainer, isDarkMode && { borderTopColor: '#2a2a3e' }]}>
                <Text style={[styles.smallLabel, isDarkMode && styles.textMuted]}>
                  نغمة الإشعار:
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reminderScroll}>
                  {NOTIFICATION_SOUNDS.map((sound) => {
                    const isSelected = (settings.notifications.soundType || 'default') === sound.id;
                    return (
                      <TouchableOpacity
                        key={sound.id}
                        style={[
                          styles.chipOption,
                          isDarkMode && styles.chipOptionDark,
                          isSelected && styles.chipOptionSelected,
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          updateNotifications({ soundType: sound.id });
                        }}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons
                          name={sound.icon as any}
                          size={16}
                          color={isSelected ? '#fff' : (isDarkMode ? '#aaa' : '#666')}
                        />
                        <Text
                          style={[
                            styles.chipOptionText,
                            isDarkMode && styles.textMuted,
                            isSelected && styles.chipOptionTextSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {sound.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <View style={[styles.innerSettingRow, styles.globalSettingRow, isDarkMode && styles.innerSettingRowDark]}>
              <View style={styles.innerSettingInfo}>
                <View style={[styles.categoryIconBg, { backgroundColor: '#ef535018' }]}>
                  <MaterialCommunityIcons name="vibrate" size={20} color="#ef5350" />
                </View>
                <Text style={[styles.categoryTitle, isDarkMode && styles.textLight, { marginStart: 12 }]}>
                  الاهتزاز
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

        {/* Info Card */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)} style={[styles.infoCard, isDarkMode && styles.infoCardDark]}>
          <MaterialCommunityIcons name="information" size={20} color="#3a7ca5" />
          <Text style={[styles.infoText, isDarkMode && styles.textMuted]}>
            تعمل الإشعارات حتى عند إغلاق التطبيق. تأكد من عدم تفعيل وضع توفير الطاقة لضمان وصول التنبيهات.
          </Text>
        </Animated.View>

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
    fontFamily: 'Cairo-Bold',
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
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  permissionSubtitle: {
    fontSize: 13,
    fontFamily: 'Cairo-Regular',
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
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  mainToggleSubtitle: {
    fontSize: 13,
    fontFamily: 'Cairo-Regular',
    color: '#999',
    marginTop: 2,
  },

  // Section title
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Cairo-Bold',
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
    marginHorizontal: 12,
  },
  categoryTitle: {
    fontSize: 15,
    fontFamily: 'Cairo-SemiBold',
    color: '#333',
  },
  categorySubtitle: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    color: '#999',
    marginTop: 1,
  },
  expandArrow: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginStart: 4,
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
    fontFamily: 'Cairo-Medium',
    color: '#333',
  },
  globalSettingRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },

  // Small label
  smallLabel: {
    fontSize: 13,
    fontFamily: 'Cairo-Medium',
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
    marginEnd: 8,
    gap: 5,
  },
  chipOptionDark: {
    backgroundColor: '#2a2a3e',
  },
  chipOptionSelected: {
    backgroundColor: '#2f7659',
  },
  chipOptionText: {
    fontSize: 13,
    fontFamily: 'Cairo-Medium',
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
    fontFamily: 'Cairo-Medium',
    color: '#333',
  },
  timePickerValue: {
    fontSize: 15,
    fontFamily: 'Cairo-SemiBold',
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
    fontFamily: 'Cairo-Regular',
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
    fontFamily: 'Cairo-SemiBold',
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
    fontFamily: 'Cairo-SemiBold',
    color: '#333',
  },
  adhanSoundTitleSelected: {
    color: '#2f7659',
  },
  adhanSoundSubtitle: {
    fontSize: 11,
    fontFamily: 'Cairo-Regular',
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
    gap: 6,
  },
  testButtonDark: {
    backgroundColor: 'rgba(47, 118, 89, 0.15)',
  },
  testButtonText: {
    fontSize: 14,
    fontFamily: 'Cairo-SemiBold',
  },
  closeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    gap: 6,
  },
  closeButtonDark: {
    backgroundColor: '#2a2a3e',
  },
  closeButtonText: {
    fontSize: 14,
    fontFamily: 'Cairo-SemiBold',
    color: '#333',
  },

  // Sound picker
  soundPickerContainer: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
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
    fontFamily: 'Cairo-Regular',
    color: '#333',
    lineHeight: 22,
    textAlign: 'right',
  },

  bottomSpace: {
    height: 100,
  },
});