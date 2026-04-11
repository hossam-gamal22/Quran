// app/settings/worship-tracking.tsx
// إعدادات متتبع العبادات - روح المسلم

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { fontBold, fontMedium, fontRegular, fontSemiBold } from '@/lib/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSettings, NotificationSettings } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { useWorship } from '@/contexts/WorshipContext';
import { t } from '@/lib/i18n';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { Colors, DarkColors } from '@/constants/theme';

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
  isRTL: boolean;
}

const SettingSwitch: React.FC<SettingSwitchProps> = ({
  icon,
  iconColor = '#0d8e62',
  title,
  subtitle,
  value,
  onValueChange,
  isDarkMode,
  disabled = false,
  isRTL,
}) => {
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  return (
  <View style={[styles.settingItem, { flexDirection: isRTL ? 'row-reverse' : 'row', borderBottomColor: colors.border }, disabled && styles.settingItemDisabled]}>
    <View style={styles.settingIconBg}>
      <MaterialCommunityIcons name={icon} size={22} color={disabled ? '#8E8E93' : iconColor} />
    </View>
    <View style={styles.settingContent}>
      <Text style={[styles.settingTitle, { color: colors.text }, disabled && styles.textDisabled]}>
        {title}
      </Text>
      {subtitle && (
        <Text style={[styles.settingSubtitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
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
      trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#0d8e62' }}
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
  isRTL: boolean;
}

const TimePickerRow: React.FC<TimePickerRowProps> = ({
  icon,
  iconColor = '#0d8e62',
  title,
  time,
  onTimeChange,
  isDarkMode,
  disabled = false,
  isRTL,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const parseTime = (timeStr: string): Date => {
    const parts = timeStr.split(':').map(Number);
    const hours = Number.isFinite(parts[0]) && parts[0] >= 0 && parts[0] <= 23 ? parts[0] : 0;
    const minutes = Number.isFinite(parts[1]) && parts[1] >= 0 && parts[1] <= 59 ? parts[1] : 0;
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
    const parts = timeStr.split(':').map(Number);
    const hours = Number.isFinite(parts[0]) ? parts[0] : 0;
    const minutes = Number.isFinite(parts[1]) ? parts[1] : 0;
    const period = hours >= 12 ? (isRTL ? 'م' : 'PM') : (isRTL ? 'ص' : 'AM');
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.settingItem, { flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: colors.surface }, disabled && styles.settingItemDisabled]}
        onPress={() => {
          if (!disabled) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowPicker(true);
          }
        }}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <View style={styles.settingIconBg}>
          <MaterialCommunityIcons name={icon} size={22} color={disabled ? '#8E8E93' : iconColor} />
        </View>
        <View style={styles.settingContent}>
          <Text style={[styles.settingTitle, { color: colors.text }, disabled && styles.textDisabled]}>
            {title}
          </Text>
        </View>
        <View style={[styles.timeDisplay, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.timeText, { color: colors.text }, disabled && styles.textDisabled]}>
            {formatDisplayTime(time)}
          </Text>
          <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={20} color={colors.textLight} />
        </View>
      </TouchableOpacity>

      {showPicker && DateTimePicker && (
        <DateTimePicker
          value={parseTime(time)}
          mode="time"
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_event, selectedDate) => {
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

// ========================================
// المكون الرئيسي
// ========================================

export default function WorshipTrackingSettingsScreen() {
  const isRTL = useIsRTL();
  const router = useRouter();
  const { settings, isDarkMode, updateNotifications } = useSettings();
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const { clearAllData, stats } = useWorship();

  const isEnabled = settings.notifications.enabled;

  const handleResetData = () => {
    Alert.alert(
      t('worship.clearAllData'),
      t('worship.clearAllDataConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await clearAllData();
            Alert.alert(t('common.success'), t('worship.dataCleared'));
          },
        },
      ]
    );
  };

  const handleExportData = () => {
    Alert.alert(
      t('settings.exportData'),
      `${t('worship.yourStats')}:\n\n` +
      `${t('worship.prayerTracker')}: ${stats?.prayer?.percentage ?? 0}%\n` +
      `${t('worship.fastingTracker')}: ${stats?.fasting?.totalDays ?? 0}\n` +
      `${t('worship.quranTracker')}: ${stats?.quran?.totalPages ?? 0}\n` +
      `${t('worship.azkarTracker')}: ${stats?.azkar?.completionRate ?? 0}%\n\n` +
      `${t('worship.bestStreak')}: ${stats?.prayer?.bestStreak ?? 0}`,
      [{ text: t('common.ok') }]
    );
  };

  return (
    <BackgroundWrapper
      backgroundKey={settings.display.appBackground}
      backgroundUrl={settings.display.appBackgroundUrl}
      opacity={settings.display.backgroundOpacity}
    >
    <SafeAreaView style={[styles.container, settings.display.appBackground !== 'none' && { backgroundColor: 'transparent' }]} edges={['top']}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      {/* Header */}
      <Animated.View
        entering={FadeInDown.duration(500)}
        style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('worship.title')}</Text>
        <View style={styles.headerPlaceholder} />
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Prayer Logging Reminder */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <Text style={[styles.sectionTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('worship.prayerLoggingReminders')}</Text>
          <View style={[styles.sectionContent, { backgroundColor: colors.card }]}>
            <SettingSwitch
              icon="bell-ring"
              iconColor="#0d8e62"
              title={t('worship.prayerLoggingReminder')}
              subtitle={t('worship.prayerLoggingReminderDesc')}
              value={settings.notifications.worshipPrayerLogging}
              onValueChange={(val) => updateNotifications({ worshipPrayerLogging: val })}
              isDarkMode={isDarkMode}
              disabled={!isEnabled}
              isRTL={isRTL}
            />
            <SettingSwitch
              icon="mosque"
              iconColor="#0d8e62"
              title={t('worship.prayerTimeAlerts')}
              subtitle={t('worship.prayerTimeAlertsDesc')}
              value={settings.notifications.prayerTimes}
              onValueChange={(val) => updateNotifications({ prayerTimes: val })}
              isDarkMode={isDarkMode}
              disabled={!isEnabled}
              isRTL={isRTL}
            />
          </View>
        </Animated.View>

        {/* Daily Summary */}
        <Animated.View entering={FadeInDown.delay(150).duration(500)}>
          <Text style={[styles.sectionTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('worship.dailySummary')}</Text>
          <View style={[styles.sectionContent, { backgroundColor: colors.card }]}>
            <SettingSwitch
              icon="clipboard-text-clock"
              iconColor="#3a7ca5"
              title={t('worship.dailySummary')}
              subtitle={t('worship.dailySummaryDesc')}
              value={settings.notifications.worshipDailySummary}
              onValueChange={(val) => updateNotifications({ worshipDailySummary: val })}
              isDarkMode={isDarkMode}
              disabled={!isEnabled}
              isRTL={isRTL}
            />
            <TimePickerRow
              icon="clock-outline"
              iconColor="#3a7ca5"
              title={t('worship.dailySummaryTime')}
              time={settings.notifications.worshipDailySummaryTime}
              onTimeChange={(val) => updateNotifications({ worshipDailySummaryTime: val })}
              isDarkMode={isDarkMode}
              disabled={!isEnabled || !settings.notifications.worshipDailySummary}
              isRTL={isRTL}
            />
          </View>
        </Animated.View>

        {/* Streak & Weekly */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Text style={[styles.sectionTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('worship.streakAndReports')}</Text>
          <View style={[styles.sectionContent, { backgroundColor: colors.card }]}>
            <SettingSwitch
              icon="fire"
              iconColor="#ff6b35"
              title={t('worship.streakAlerts')}
              subtitle={t('worship.streakAlertsDesc')}
              value={settings.notifications.worshipStreakAlerts}
              onValueChange={(val) => updateNotifications({ worshipStreakAlerts: val })}
              isDarkMode={isDarkMode}
              disabled={!isEnabled}
              isRTL={isRTL}
            />
            <SettingSwitch
              icon="chart-bar"
              iconColor="#4a3d73"
              title={t('worship.weeklyReport')}
              subtitle={t('worship.weeklyReportDesc')}
              value={settings.notifications.worshipWeeklyReport}
              onValueChange={(val) => updateNotifications({ worshipWeeklyReport: val })}
              isDarkMode={isDarkMode}
              disabled={!isEnabled}
              isRTL={isRTL}
            />
          </View>
        </Animated.View>

        {/* Quiet Hours */}
        <Animated.View entering={FadeInDown.delay(250).duration(500)}>
          <Text style={[styles.sectionTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('worship.quietHours')}</Text>
          <View style={[styles.sectionContent, { backgroundColor: colors.card }]}>
            <SettingSwitch
              icon="moon-waning-crescent"
              iconColor="#4a3d73"
              title={t('worship.enableQuietHours')}
              subtitle={t('worship.enableQuietHoursDesc')}
              value={settings.notifications.worshipQuietHoursEnabled}
              onValueChange={(val) => updateNotifications({ worshipQuietHoursEnabled: val })}
              isDarkMode={isDarkMode}
              disabled={!isEnabled}
              isRTL={isRTL}
            />
            <TimePickerRow
              icon="clock-start"
              iconColor="#4a3d73"
              title={t('worship.quietHoursStart')}
              time={settings.notifications.worshipQuietHoursStart}
              onTimeChange={(val) => updateNotifications({ worshipQuietHoursStart: val })}
              isDarkMode={isDarkMode}
              disabled={!isEnabled || !settings.notifications.worshipQuietHoursEnabled}
              isRTL={isRTL}
            />
            <TimePickerRow
              icon="clock-end"
              iconColor="#4a3d73"
              title={t('worship.quietHoursEnd')}
              time={settings.notifications.worshipQuietHoursEnd}
              onTimeChange={(val) => updateNotifications({ worshipQuietHoursEnd: val })}
              isDarkMode={isDarkMode}
              disabled={!isEnabled || !settings.notifications.worshipQuietHoursEnabled}
              isRTL={isRTL}
            />
          </View>
        </Animated.View>

        {/* Notification Sound */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <Text style={[styles.sectionTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('settings.sound')}</Text>
          <View style={[styles.sectionContent, { backgroundColor: colors.card }]}>
            <SettingSwitch
              icon="volume-high"
              iconColor="#c17f59"
              title={t('worship.notificationSound')}
              subtitle={t('worship.notificationSoundDesc')}
              value={settings.notifications.sound !== false}
              onValueChange={(val) => updateNotifications({ sound: val })}
              isDarkMode={isDarkMode}
              disabled={!isEnabled}
              isRTL={isRTL}
            />
            <SettingSwitch
              icon="vibrate"
              iconColor="#ef5350"
              title={t('settings.vibration')}
              value={settings.notifications.vibration !== false}
              onValueChange={(val) => updateNotifications({ vibration: val })}
              isDarkMode={isDarkMode}
              disabled={!isEnabled}
              isRTL={isRTL}
            />
          </View>
        </Animated.View>

        {/* Data Management */}
        <Animated.View entering={FadeInDown.delay(350).duration(500)}>
          <Text style={[styles.sectionTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('worship.dataManagement')}</Text>
          <View style={[styles.sectionContent, { backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={[styles.settingItem, { flexDirection: isRTL ? 'row-reverse' : 'row', borderBottomColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                handleExportData();
              }}
              activeOpacity={0.7}
            >
              <View style={styles.settingIconBg}>
                <MaterialCommunityIcons name="export-variant" size={22} color="#3a7ca5" />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>{t('settings.exportData')}</Text>
                <Text style={[styles.settingSubtitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('worship.yourStats')}</Text>
              </View>
              <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={20} color={colors.textLight} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingItem, { flexDirection: isRTL ? 'row-reverse' : 'row', borderBottomColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                handleResetData();
              }}
              activeOpacity={0.7}
            >
              <View style={styles.settingIconBg}>
                <MaterialCommunityIcons name="delete-outline" size={22} color="#ef5350" />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: '#ef5350' }]}>{t('worship.clearAllData')}</Text>
                <Text style={[styles.settingSubtitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('worship.clearConfirm')}</Text>
              </View>
              <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={20} color="#ef5350" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Info */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)} style={[styles.infoCard, { backgroundColor: colors.surface, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <MaterialCommunityIcons name="information" size={20} color="#3a7ca5" />
          <Text style={[styles.infoText, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {t('worship.notificationInfo')}
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
    backgroundColor: 'transparent',
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
  },
  headerPlaceholder: {
    width: 40,
  },

  textDisabled: {
    color: '#8E8E93',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: fontBold(),
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionContent: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  sectionContentDark: {
    backgroundColor: DarkColors.surface,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
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
    fontFamily: fontSemiBold(),
  },
  settingSubtitle: {
    fontSize: 12,
    fontFamily: fontRegular(),
    marginTop: 2,
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    fontSize: 15,
    fontFamily: fontMedium(),
    color: '#0d8e62',
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
    borderWidth: 1,
    borderColor: 'rgba(58, 124, 165, 0.20)',
  },
  infoCardDark: {
    backgroundColor: 'rgba(58, 124, 165, 0.1)',
    borderColor: 'rgba(58, 124, 165, 0.15)',
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
});
