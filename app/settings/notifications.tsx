// app/settings/notifications.tsx
// صفحة إعدادات الإشعارات - روح المسلم

import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useSettings, NotificationSettings, NotificationSoundType, AdhanSoundType } from '@/contexts/SettingsContext';

// ========================================
// الثوابت
// ========================================

const NOTIFICATION_SOUNDS: { id: NotificationSoundType; name: string; icon: string }[] = [
  { id: 'default', name: 'الافتراضي', icon: 'bell-ring' },
  { id: 'asbahna', name: 'أصبحنا وأصبح الملك لله', icon: 'weather-sunset-up' },
  { id: 'amsayna', name: 'أمسينا وأمسى الملك لله', icon: 'weather-sunset-down' },
  { id: 'subhanallah', name: 'سبحان الله', icon: 'star-crescent' },
  { id: 'alhamdulillah', name: 'الحمد لله', icon: 'hand-heart' },
  { id: 'allahuakbar', name: 'الله أكبر', icon: 'mosque' },
  { id: 'silent', name: 'صامت', icon: 'bell-off' },
];

const ADHAN_SOUNDS: { id: AdhanSoundType; name: string; description: string; icon: string }[] = [
  { id: 'default', name: 'الافتراضي', description: 'صوت النظام', icon: 'bell-ring' },
  { id: 'makkah', name: 'الحرم المكي', description: 'أذان الحرم المكي الشريف', icon: 'kaaba' },
  { id: 'madinah', name: 'المسجد النبوي', description: 'أذان المسجد النبوي الشريف', icon: 'mosque' },
  { id: 'alaqsa', name: 'المسجد الأقصى', description: 'أذان المسجد الأقصى المبارك', icon: 'dome-light' },
  { id: 'mishary', name: 'مشاري العفاسي', description: 'أذان الشيخ مشاري راشد', icon: 'account-voice' },
  { id: 'abdulbasit', name: 'عبد الباسط', description: 'أذان الشيخ عبد الباسط', icon: 'account-voice' },
  { id: 'silent', name: 'صامت', description: 'بدون صوت', icon: 'bell-off' },
];

const REMINDER_OPTIONS = [
  { value: 5, label: '5 دقائق' },
  { value: 10, label: '10 دقائق' },
  { value: 15, label: '15 دقيقة' },
  { value: 20, label: '20 دقيقة' },
  { value: 30, label: '30 دقيقة' },
];

const PRAYER_NAMES = [
  { key: 'fajr', name: 'الفجر', icon: 'weather-sunset-up' },
  { key: 'sunrise', name: 'الشروق', icon: 'white-balance-sunny' },
  { key: 'dhuhr', name: 'الظهر', icon: 'weather-sunny' },
  { key: 'asr', name: 'العصر', icon: 'weather-sunny-alert' },
  { key: 'maghrib', name: 'المغرب', icon: 'weather-sunset-down' },
  { key: 'isha', name: 'العشاء', icon: 'weather-night' },
];

// ========================================
// مكونات فرعية
// ========================================

interface SettingSwitchProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor?: string;
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  isDarkMode: boolean;
  disabled?: boolean;
}

const SettingSwitch: React.FC<SettingSwitchProps> = ({
  icon,
  iconColor = '#2f7659',
  title,
  subtitle,
  value,
  onValueChange,
  isDarkMode,
  disabled = false,
}) => {
  return (
    <View style={[styles.settingItem, isDarkMode && styles.settingItemDark, disabled && styles.settingItemDisabled]}>
      <View style={styles.settingIconBg}>
        <MaterialCommunityIcons name={icon} size={22} color={disabled ? '#999' : iconColor} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, isDarkMode && styles.textLight, disabled && styles.textDisabled]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.settingSubtitle, isDarkMode && styles.textMuted]}>
            {subtitle}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={(val) => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onValueChange(val);
        }}
        trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#2f7659' }}
        thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
        ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
        disabled={disabled}
      />
    </View>
  );
};

interface TimePickerRowProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor?: string;
  title: string;
  time: string;
  onTimeChange: (time: string) => void;
  isDarkMode: boolean;
  disabled?: boolean;
}

const TimePickerRow: React.FC<TimePickerRowProps> = ({
  icon,
  iconColor = '#2f7659',
  title,
  time,
  onTimeChange,
  isDarkMode,
  disabled = false,
}) => {
  const [showPicker, setShowPicker] = useState(false);

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

  const formatDisplayTime = (timeStr: string): string => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'م' : 'ص';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.settingItem, isDarkMode && styles.settingItemDark, disabled && styles.settingItemDisabled]}
        onPress={() => {
          if (!disabled) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowPicker(true);
          }
        }}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <View style={styles.settingIconBg}>
          <MaterialCommunityIcons name={icon} size={22} color={disabled ? '#999' : iconColor} />
        </View>
        <View style={styles.settingContent}>
          <Text style={[styles.settingTitle, isDarkMode && styles.textLight, disabled && styles.textDisabled]}>
            {title}
          </Text>
        </View>
        <View style={styles.timeDisplay}>
          <Text style={[styles.timeText, isDarkMode && styles.textLight, disabled && styles.textDisabled]}>
            {formatDisplayTime(time)}
          </Text>
          <MaterialCommunityIcons name={I18nManager.isRTL ? 'chevron-left' : 'chevron-right'} size={20} color={isDarkMode ? '#666' : '#ccc'} />
        </View>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={parseTime(time)}
          mode="time"
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowPicker(Platform.OS === 'ios');
            if (selectedDate) {
              onTimeChange(formatTime(selectedDate));
            }
          }}
        />
      )}
    </>
  );
};

interface ReminderSelectorProps {
  value: number;
  onChange: (value: number) => void;
  isDarkMode: boolean;
  disabled?: boolean;
}

const ReminderSelector: React.FC<ReminderSelectorProps> = ({
  value,
  onChange,
  isDarkMode,
  disabled = false,
}) => {
  return (
    <View style={[styles.reminderContainer, disabled && styles.settingItemDisabled]}>
      <Text style={[styles.reminderLabel, isDarkMode && styles.textMuted]}>
        التذكير قبل الأذان بـ:
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reminderScroll}>
        {REMINDER_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.reminderOption,
              isDarkMode && styles.reminderOptionDark,
              value === option.value && styles.reminderOptionSelected,
              disabled && styles.reminderOptionDisabled,
            ]}
            onPress={() => {
              if (!disabled) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onChange(option.value);
              }
            }}
            activeOpacity={disabled ? 1 : 0.7}
          >
            <Text
              style={[
                styles.reminderOptionText,
                isDarkMode && styles.textLight,
                value === option.value && styles.reminderOptionTextSelected,
                disabled && styles.textDisabled,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

// ========================================
// المكون الرئيسي
// ========================================

export default function NotificationsScreen() {
  const router = useRouter();
  const { settings, isDarkMode, t, updateNotifications } = useSettings();
  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');
  const [prayerNotifications, setPrayerNotifications] = useState<{ [key: string]: boolean }>({
    fajr: true,
    sunrise: false,
    dhuhr: true,
    asr: true,
    maghrib: true,
    isha: true,
  });

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
    // يمكن حفظ هذه القيم في السياق لاحقاً
  };

  const isEnabled = settings.notifications.enabled && permissionStatus === 'granted';

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

        {/* Main Toggle Section */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>{t('settings.general')}</Text>
          <View style={[styles.sectionContent, isDarkMode && styles.sectionContentDark]}>
            <SettingSwitch
              icon="bell"
              iconColor="#2f7659"
              title="تفعيل الإشعارات"
              subtitle="تنبيهات الصلاة والأذكار"
              value={settings.notifications.enabled}
              onValueChange={handleToggleMain}
              isDarkMode={isDarkMode}
            />
          </View>
        </Animated.View>

        {/* Prayer Notifications */}
        <Animated.View entering={FadeInDown.delay(150).duration(500)}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>{t('settings.prayerNotifications')}</Text>
          <View style={[styles.sectionContent, isDarkMode && styles.sectionContentDark]}>
            <SettingSwitch
              icon="mosque"
              iconColor="#2f7659"
              title="تنبيهات مواقيت الصلاة"
              subtitle="إشعار عند دخول وقت كل صلاة"
              value={settings.notifications.prayerTimes}
              onValueChange={(val) => updateNotifications({ prayerTimes: val })}
              isDarkMode={isDarkMode}
              disabled={!isEnabled}
            />
            <SettingSwitch
              icon="bell-ring"
              iconColor="#f5a623"
              title="التذكير قبل الأذان"
              subtitle="تنبيه قبل دخول وقت الصلاة"
              value={settings.notifications.prayerReminder}
              onValueChange={(val) => updateNotifications({ prayerReminder: val })}
              isDarkMode={isDarkMode}
              disabled={!isEnabled}
            />
            <ReminderSelector
              value={settings.notifications.reminderMinutes}
              onChange={(val) => updateNotifications({ reminderMinutes: val })}
              isDarkMode={isDarkMode}
              disabled={!isEnabled || !settings.notifications.prayerReminder}
            />
          </View>
        </Animated.View>

        {/* Individual Prayer Notifications */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>{t('prayer.title')}</Text>
          <View style={[styles.sectionContent, isDarkMode && styles.sectionContentDark]}>
            {PRAYER_NAMES.map((prayer, index) => (
              <Animated.View key={prayer.key} entering={FadeInRight.delay(index * 50).duration(400)}>
                <SettingSwitch
                  icon={prayer.icon as any}
                  iconColor={prayer.key === 'fajr' ? '#5d4e8c' : prayer.key === 'isha' ? '#3a7ca5' : '#c17f59'}
                  title={prayer.name}
                  value={prayerNotifications[prayer.key]}
                  onValueChange={(val) => handleTogglePrayerNotification(prayer.key, val)}
                  isDarkMode={isDarkMode}
                  disabled={!isEnabled || !settings.notifications.prayerTimes}
                />
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* Adhan Sound Selection */}
        <Animated.View entering={FadeInDown.delay(225).duration(500)}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>صوت الأذان</Text>
          <View style={[styles.sectionContent, isDarkMode && styles.sectionContentDark]}>
            <View style={[styles.adhanSoundHeader, isDarkMode && { borderBottomColor: '#2a2a3e' }]}>
              <MaterialCommunityIcons name="volume-high" size={22} color="#2f7659" />
              <Text style={[styles.adhanSoundHeaderText, isDarkMode && styles.textLight]}>
                اختر صوت الأذان المفضل
              </Text>
            </View>
            {ADHAN_SOUNDS.map((sound, index) => {
              const isSelected = (settings.notifications.adhanSoundType || 'default') === sound.id;
              return (
                <Animated.View key={sound.id} entering={FadeInRight.delay(index * 40).duration(400)}>
                  <TouchableOpacity
                    style={[
                      styles.adhanSoundOption,
                      isDarkMode && styles.adhanSoundOptionDark,
                      isSelected && styles.adhanSoundOptionSelected,
                      (!isEnabled || !settings.notifications.prayerTimes || !settings.notifications.sound) && styles.settingItemDisabled,
                    ]}
                    onPress={() => {
                      if (isEnabled && settings.notifications.prayerTimes && settings.notifications.sound) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        updateNotifications({ adhanSoundType: sound.id });
                      }
                    }}
                    activeOpacity={(!isEnabled || !settings.notifications.prayerTimes || !settings.notifications.sound) ? 1 : 0.7}
                  >
                    <View style={[styles.adhanSoundIconBg, isSelected && styles.adhanSoundIconBgSelected]}>
                      <MaterialCommunityIcons
                        name={sound.icon as any}
                        size={20}
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
                    {isSelected && (
                      <MaterialCommunityIcons name="check-circle" size={24} color="#2f7659" />
                    )}
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
            {(!isEnabled || !settings.notifications.prayerTimes || !settings.notifications.sound) && (
              <Text style={[styles.adhanDisabledNote, isDarkMode && styles.textMuted]}>
                فعّل إشعارات الصلاة والصوت لتخصيص صوت الأذان
              </Text>
            )}
          </View>
        </Animated.View>

        {/* Azkar Notifications */}
        <Animated.View entering={FadeInDown.delay(250).duration(500)}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>{t('settings.azkarNotifications')}</Text>
          <View style={[styles.sectionContent, isDarkMode && styles.sectionContentDark]}>
            <SettingSwitch
              icon="weather-sunset-up"
              iconColor="#f5a623"
              title="أذكار الصباح"
              subtitle="تذكير يومي بأذكار الصباح"
              value={settings.notifications.morningAzkar}
              onValueChange={(val) => updateNotifications({ morningAzkar: val })}
              isDarkMode={isDarkMode}
              disabled={!isEnabled}
            />
            <TimePickerRow
              icon="clock-outline"
              iconColor="#f5a623"
              title="وقت أذكار الصباح"
              time={settings.notifications.morningAzkarTime}
              onTimeChange={(val) => updateNotifications({ morningAzkarTime: val })}
              isDarkMode={isDarkMode}
              disabled={!isEnabled || !settings.notifications.morningAzkar}
            />
            <SettingSwitch
              icon="weather-sunset-down"
              iconColor="#5d4e8c"
              title="أذكار المساء"
              subtitle="تذكير يومي بأذكار المساء"
              value={settings.notifications.eveningAzkar}
              onValueChange={(val) => updateNotifications({ eveningAzkar: val })}
              isDarkMode={isDarkMode}
              disabled={!isEnabled}
            />
            <TimePickerRow
              icon="clock-outline"
              iconColor="#5d4e8c"
              title="وقت أذكار المساء"
              time={settings.notifications.eveningAzkarTime}
              onTimeChange={(val) => updateNotifications({ eveningAzkarTime: val })}
              isDarkMode={isDarkMode}
              disabled={!isEnabled || !settings.notifications.eveningAzkar}
            />
          </View>
        </Animated.View>

        {/* Daily Content */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>المحتوى اليومي</Text>
          <View style={[styles.sectionContent, isDarkMode && styles.sectionContentDark]}>
            <SettingSwitch
              icon="book-open-variant"
              iconColor="#2f7659"
              title="آية اليوم"
              subtitle="آية قرآنية يومية مع تفسيرها"
              value={settings.notifications.dailyVerse}
              onValueChange={(val) => updateNotifications({ dailyVerse: val })}
              isDarkMode={isDarkMode}
              disabled={!isEnabled}
            />
            <TimePickerRow
              icon="clock-outline"
              iconColor="#2f7659"
              title="وقت آية اليوم"
              time={settings.notifications.dailyVerseTime}
              onTimeChange={(val) => updateNotifications({ dailyVerseTime: val })}
              isDarkMode={isDarkMode}
              disabled={!isEnabled || !settings.notifications.dailyVerse}
            />
            <SettingSwitch
              icon="lightbulb-on"
              iconColor="#3a7ca5"
              title="حديث اليوم"
              subtitle="حديث نبوي يومي"
              value={settings.notifications.dailyHadith || false}
              onValueChange={(val) => updateNotifications({ dailyHadith: val })}
              isDarkMode={isDarkMode}
              disabled={!isEnabled}
            />
          </View>
        </Animated.View>

        {/* Sound Settings */}
        <Animated.View entering={FadeInDown.delay(350).duration(500)}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>{t('settings.sound')}</Text>
          <View style={[styles.sectionContent, isDarkMode && styles.sectionContentDark]}>
            <SettingSwitch
              icon="volume-high"
              iconColor="#c17f59"
              title="صوت الإشعارات"
              value={settings.notifications.sound !== false}
              onValueChange={(val) => updateNotifications({ sound: val })}
              isDarkMode={isDarkMode}
              disabled={!isEnabled}
            />

            {/* Sound Type Picker */}
            {settings.notifications.sound !== false && isEnabled && (
              <View style={[styles.soundPickerContainer, isDarkMode && { borderTopColor: '#2a2a3e' }]}>
                <Text style={[styles.soundPickerLabel, isDarkMode && styles.textMuted]}>
                  نغمة الإشعار:
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.soundPickerScroll}>
                  {NOTIFICATION_SOUNDS.map((sound) => {
                    const isSelected = (settings.notifications.soundType || 'default') === sound.id;
                    return (
                      <TouchableOpacity
                        key={sound.id}
                        style={[
                          styles.soundOption,
                          isDarkMode && styles.soundOptionDark,
                          isSelected && styles.soundOptionSelected,
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          updateNotifications({ soundType: sound.id });
                        }}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons
                          name={sound.icon as any}
                          size={18}
                          color={isSelected ? '#fff' : (isDarkMode ? '#aaa' : '#666')}
                        />
                        <Text
                          style={[
                            styles.soundOptionText,
                            isDarkMode && styles.textMuted,
                            isSelected && styles.soundOptionTextSelected,
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

            <SettingSwitch
              icon="vibrate"
              iconColor="#ef5350"
              title="الاهتزاز"
              value={settings.notifications.vibration !== false}
              onValueChange={(val) => updateNotifications({ vibration: val })}
              isDarkMode={isDarkMode}
              disabled={!isEnabled}
            />
          </View>
        </Animated.View>

        {/* Info Card */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.infoCard}>
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
  textDisabled: {
    color: '#bbb',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 15,
  },
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
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Cairo-Bold',
    color: '#666',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionContent: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  sectionContentDark: {
    backgroundColor: '#1a1a2e',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingItemDark: {
    borderBottomColor: '#2a2a3e',
  },
  settingItemDisabled: {
    opacity: 0.5,
  },
  settingIconBg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingContent: {
    flex: 1,
    marginHorizontal: 15,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'Cairo-SemiBold',
    color: '#333',
  },
  settingSubtitle: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    color: '#999',
    marginTop: 2,
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  timeText: {
    fontSize: 15,
    fontFamily: 'Cairo-Medium',
    color: '#2f7659',
  },
  reminderContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  reminderLabel: {
    fontSize: 14,
    fontFamily: 'Cairo-Medium',
    color: '#666',
    marginBottom: 12,
  },
  reminderScroll: {
    flexDirection: 'row',
  },
  reminderOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginLeft: 10,
  },
  reminderOptionDark: {
    backgroundColor: '#2a2a3e',
  },
  reminderOptionSelected: {
    backgroundColor: '#2f7659',
  },
  reminderOptionDisabled: {
    opacity: 0.5,
  },
  reminderOptionText: {
    fontSize: 14,
    fontFamily: 'Cairo-Medium',
    color: '#666',
  },
  reminderOptionTextSelected: {
    color: '#fff',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e8f4fd',
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 12,
    padding: 15,
    gap: 10,
  },
  soundPickerContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  soundPickerLabel: {
    fontSize: 14,
    fontFamily: 'Cairo-Medium',
    color: '#666',
    marginBottom: 12,
  },
  soundPickerScroll: {
    flexDirection: 'row',
  },
  soundOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginLeft: 8,
    gap: 6,
  },
  soundOptionDark: {
    backgroundColor: '#2a2a3e',
  },
  soundOptionSelected: {
    backgroundColor: '#2f7659',
  },
  soundOptionText: {
    fontSize: 13,
    fontFamily: 'Cairo-Medium',
    color: '#666',
  },
  soundOptionTextSelected: {
    color: '#fff',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Cairo-Regular',
    color: '#333',
    lineHeight: 22,
    textAlign: 'right',
  },
  // Adhan Sound Selection Styles
  adhanSoundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  adhanSoundHeaderText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Cairo-SemiBold',
    color: '#333',
  },
  adhanSoundOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  adhanSoundOptionDark: {
    borderBottomColor: '#2a2a3e',
  },
  adhanSoundOptionSelected: {
    backgroundColor: 'rgba(47, 118, 89, 0.08)',
  },
  adhanSoundIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
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
    fontSize: 15,
    fontFamily: 'Cairo-SemiBold',
    color: '#333',
  },
  adhanSoundTitleSelected: {
    color: '#2f7659',
  },
  adhanSoundSubtitle: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    color: '#999',
    marginTop: 2,
  },
  adhanDisabledNote: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    color: '#999',
    textAlign: 'center',
    padding: 16,
    fontStyle: 'italic',
  },
  bottomSpace: {
    height: 100,
  },
});
