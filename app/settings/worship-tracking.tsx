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
  StatusBar,
  Alert,
  Platform,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useSettings, NotificationSettings } from '@/contexts/SettingsContext';
import { useWorship } from '@/contexts/WorshipContext';

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
}) => (
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
  const router = useRouter();
  const { settings, isDarkMode, updateNotifications } = useSettings();
  const { clearAllData, stats } = useWorship();

  const isEnabled = settings.notifications.enabled;

  const handleResetData = () => {
    Alert.alert(
      'مسح جميع البيانات',
      'هل أنت متأكد من مسح جميع بيانات متتبع العبادات؟ لا يمكن التراجع عن هذا الإجراء.',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'مسح',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await clearAllData();
            Alert.alert('تم', 'تم مسح جميع بيانات المتتبع بنجاح.');
          },
        },
      ]
    );
  };

  const handleExportData = () => {
    Alert.alert(
      'تصدير البيانات',
      `إحصائياتك:\n\n` +
      `الصلاة: ${stats?.prayer?.percentage ?? 0}% التزام\n` +
      `الصيام: ${stats?.fasting?.totalDays ?? 0} يوم\n` +
      `القرآن: ${stats?.quran?.totalPages ?? 0} صفحة\n` +
      `الأذكار: ${stats?.azkar?.completionRate ?? 0}% إكمال\n\n` +
      `أفضل سلسلة صلاة: ${stats?.prayer?.bestStreak ?? 0} يوم`,
      [{ text: 'حسناً' }]
    );
  };

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]} edges={['top']}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      {/* Header */}
      <Animated.View
        entering={FadeInDown.duration(500)}
        style={styles.header}
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
        <Text style={[styles.headerTitle, isDarkMode && styles.textLight]}>إعدادات المتتبع</Text>
        <View style={styles.headerPlaceholder} />
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Prayer Logging Reminder */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>تذكيرات تسجيل الصلاة</Text>
          <View style={[styles.sectionContent, isDarkMode && styles.sectionContentDark]}>
            <SettingSwitch
              icon="bell-ring"
              iconColor="#2f7659"
              title="تذكير تسجيل الصلاة"
              subtitle="تنبيه لتسجيل صلاتك إذا لم تسجل بعد"
              value={settings.notifications.worshipPrayerLogging}
              onValueChange={(val) => updateNotifications({ worshipPrayerLogging: val })}
              isDarkMode={isDarkMode}
              disabled={!isEnabled}
            />
            <SettingSwitch
              icon="mosque"
              iconColor="#2f7659"
              title="تنبيهات وقت الصلاة"
              subtitle="إشعار عند دخول وقت كل صلاة"
              value={settings.notifications.prayerTimes}
              onValueChange={(val) => updateNotifications({ prayerTimes: val })}
              isDarkMode={isDarkMode}
              disabled={!isEnabled}
            />
          </View>
        </Animated.View>

        {/* Daily Summary */}
        <Animated.View entering={FadeInDown.delay(150).duration(500)}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>الملخص اليومي</Text>
          <View style={[styles.sectionContent, isDarkMode && styles.sectionContentDark]}>
            <SettingSwitch
              icon="clipboard-text-clock"
              iconColor="#3a7ca5"
              title="ملخص يومي"
              subtitle="إشعار بملخص إنجاز الصلاة في نهاية اليوم"
              value={settings.notifications.worshipDailySummary}
              onValueChange={(val) => updateNotifications({ worshipDailySummary: val })}
              isDarkMode={isDarkMode}
              disabled={!isEnabled}
            />
            <TimePickerRow
              icon="clock-outline"
              iconColor="#3a7ca5"
              title="وقت الملخص اليومي"
              time={settings.notifications.worshipDailySummaryTime}
              onTimeChange={(val) => updateNotifications({ worshipDailySummaryTime: val })}
              isDarkMode={isDarkMode}
              disabled={!isEnabled || !settings.notifications.worshipDailySummary}
            />
          </View>
        </Animated.View>

        {/* Streak & Weekly */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>السلسلة والتقارير</Text>
          <View style={[styles.sectionContent, isDarkMode && styles.sectionContentDark]}>
            <SettingSwitch
              icon="fire"
              iconColor="#ff6b35"
              title="تنبيهات السلسلة"
              subtitle="تشجيع عند استمرار السلسلة أو تحذير عند وشك انقطاعها"
              value={settings.notifications.worshipStreakAlerts}
              onValueChange={(val) => updateNotifications({ worshipStreakAlerts: val })}
              isDarkMode={isDarkMode}
              disabled={!isEnabled}
            />
            <SettingSwitch
              icon="chart-bar"
              iconColor="#5d4e8c"
              title="تقرير أسبوعي"
              subtitle="ملخص أسبوعي لنسبة الالتزام بالصلاة"
              value={settings.notifications.worshipWeeklyReport}
              onValueChange={(val) => updateNotifications({ worshipWeeklyReport: val })}
              isDarkMode={isDarkMode}
              disabled={!isEnabled}
            />
          </View>
        </Animated.View>

        {/* Quiet Hours */}
        <Animated.View entering={FadeInDown.delay(250).duration(500)}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>وقت الهدوء</Text>
          <View style={[styles.sectionContent, isDarkMode && styles.sectionContentDark]}>
            <SettingSwitch
              icon="moon-waning-crescent"
              iconColor="#5d4e8c"
              title="تفعيل وقت الهدوء"
              subtitle="إيقاف الإشعارات خلال فترة معينة (مثل وقت النوم)"
              value={settings.notifications.worshipQuietHoursEnabled}
              onValueChange={(val) => updateNotifications({ worshipQuietHoursEnabled: val })}
              isDarkMode={isDarkMode}
              disabled={!isEnabled}
            />
            <TimePickerRow
              icon="clock-start"
              iconColor="#5d4e8c"
              title="بداية وقت الهدوء"
              time={settings.notifications.worshipQuietHoursStart}
              onTimeChange={(val) => updateNotifications({ worshipQuietHoursStart: val })}
              isDarkMode={isDarkMode}
              disabled={!isEnabled || !settings.notifications.worshipQuietHoursEnabled}
            />
            <TimePickerRow
              icon="clock-end"
              iconColor="#5d4e8c"
              title="نهاية وقت الهدوء"
              time={settings.notifications.worshipQuietHoursEnd}
              onTimeChange={(val) => updateNotifications({ worshipQuietHoursEnd: val })}
              isDarkMode={isDarkMode}
              disabled={!isEnabled || !settings.notifications.worshipQuietHoursEnabled}
            />
          </View>
        </Animated.View>

        {/* Notification Sound */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>الصوت</Text>
          <View style={[styles.sectionContent, isDarkMode && styles.sectionContentDark]}>
            <SettingSwitch
              icon="volume-high"
              iconColor="#c17f59"
              title="صوت الإشعارات"
              subtitle="تشغيل صوت عند وصول إشعارات المتتبع"
              value={settings.notifications.sound !== false}
              onValueChange={(val) => updateNotifications({ sound: val })}
              isDarkMode={isDarkMode}
              disabled={!isEnabled}
            />
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

        {/* Data Management */}
        <Animated.View entering={FadeInDown.delay(350).duration(500)}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>إدارة البيانات</Text>
          <View style={[styles.sectionContent, isDarkMode && styles.sectionContentDark]}>
            <TouchableOpacity
              style={[styles.settingItem, isDarkMode && styles.settingItemDark]}
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
                <Text style={[styles.settingTitle, isDarkMode && styles.textLight]}>تصدير البيانات</Text>
                <Text style={[styles.settingSubtitle, isDarkMode && styles.textMuted]}>عرض ملخص بيانات المتتبع</Text>
              </View>
              <MaterialCommunityIcons name={I18nManager.isRTL ? 'chevron-left' : 'chevron-right'} size={20} color={isDarkMode ? '#666' : '#ccc'} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingItem, isDarkMode && styles.settingItemDark]}
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
                <Text style={[styles.settingTitle, { color: '#ef5350' }]}>مسح جميع البيانات</Text>
                <Text style={[styles.settingSubtitle, isDarkMode && styles.textMuted]}>حذف كل سجلات وإحصائيات المتتبع</Text>
              </View>
              <MaterialCommunityIcons name={I18nManager.isRTL ? 'chevron-left' : 'chevron-right'} size={20} color="#ef5350" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Info */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.infoCard}>
          <MaterialCommunityIcons name="information" size={20} color="#3a7ca5" />
          <Text style={[styles.infoText, isDarkMode && styles.textMuted]}>
            تعمل الإشعارات حتى عند إغلاق التطبيق. تأكد من عدم تفعيل وضع توفير الطاقة لضمان وصول التنبيهات في الوقت المحدد.
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
