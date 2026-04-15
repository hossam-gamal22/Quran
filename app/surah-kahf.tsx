/**
 * سورة الكهف — Surah Al-Kahf dedicated reading view
 * Includes NativeTabs for reading/reminder settings
 * Uses SettingsContext for unified notification system
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Platform,
  ScrollView,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import SurahReadingScreen from '@/components/SurahReadingScreen';
import { GlassCard, NativeTabs, BackButton } from '@/components/ui';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useSettings, useNotificationSettings } from '@/contexts/SettingsContext';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { fontBold, fontRegular, fontSemiBold } from '@/lib/fonts';
import { requestNotifPermission } from '@/lib/notifications-manager';

export default function SurahKahfScreen() {
  const colors = useColors();
  const { t, settings } = useSettings();
  const { notifications, updateNotifications } = useNotificationSettings();
  const isRTL = useIsRTL();
  const insets = useSafeAreaInsets();
  const { isDarkMode } = colors;

  // Tab state
  const [activeTab, setActiveTab] = useState<'reading' | 'reminder'>('reading');
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Read from unified SettingsContext
  const kahfEnabled = notifications.kahfReminder ?? false;
  const kahfTime = notifications.kahfTime ?? '14:00';

  const handleToggle = useCallback(async (value: boolean) => {
    if (!value) {
      // Close time picker when disabling
      setShowTimePicker(false);
    }
    
    if (value) {
      const granted = await requestNotifPermission();
      if (!granted) return;
    }
    
    // Update through unified SettingsContext — this triggers scheduleNotificationsFromSettings
    await updateNotifications({ kahfReminder: value });
  }, [updateNotifications]);

  const handleTimeChange = useCallback(async (_: any, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      const newTime = `${hours}:${minutes}`;
      // Update through unified SettingsContext — this triggers scheduleNotificationsFromSettings
      await updateNotifications({ kahfTime: newTime, notifOverrides: { ...notifications.notifOverrides, kahfFriday: true } });
    }
  }, [updateNotifications]);

  const parseTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? (isRTL ? 'م' : 'PM') : (isRTL ? 'ص' : 'AM');
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const tabs = [
    { key: 'reading', label: isRTL ? 'القراءة' : 'Reading' },
    { key: 'reminder', label: isRTL ? 'التذكير' : 'Reminder' },
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: insets.top + 8,
      paddingBottom: 8,
    },
    headerTitle: {
      flex: 1,
      fontSize: 18,
      fontFamily: fontBold(),
      color: colors.text,
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
      paddingHorizontal: 6,
    },
    tabsContainer: {
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    reminderContent: {
      flex: 1,
      paddingHorizontal: 16,
    },
    card: {
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 16,
    },
    cardInner: {
      padding: 16,
    },
    cardHeader: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 12,
    },
    cardIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
    },
    cardTitle: {
      flex: 1,
      fontSize: 17,
      fontFamily: fontBold(),
      color: colors.text,
      textAlign: isRTL ? 'right' : 'left',
    },
    cardDesc: {
      fontSize: 14,
      fontFamily: fontRegular(),
      color: colors.textLight || colors.muted,
      textAlign: isRTL ? 'right' : 'left',
      lineHeight: 22,
      marginBottom: 16,
    },
    settingRow: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border || 'rgba(128,128,128,0.2)',
    },
    settingLabel: {
      fontSize: 15,
      fontFamily: fontSemiBold(),
      color: colors.text,
    },
    timeButton: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.primary + '15',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
    },
    timeText: {
      fontSize: 15,
      fontFamily: fontSemiBold(),
      color: colors.primary,
    },
  });

  // ── Reading Tab ──
  const renderReadingTab = () => (
    <SurahReadingScreen
      surahNumber={18}
      titleKey="home.surahKahf"
      hideHeader
      virtueTitle={{
        ar: 'فضل سورة الكهف',
        en: 'Virtue of Surah Al-Kahf',
      }}
      virtueText={{
        ar: 'عن أبي سعيد الخدري رضي الله عنه أن النبي ﷺ قال: «مَن قرأ سورة الكهف يوم الجمعة أضاء له من النور ما بين الجمعتين». رواه النسائي والحاكم وصححه.\n\nوعن أبي الدرداء رضي الله عنه أن النبي ﷺ قال: «مَن حفظ عشر آيات من أول سورة الكهف عُصِم من الدجال». رواه مسلم.',
        en: 'Abu Sa\'id al-Khudri reported that the Prophet ﷺ said: "Whoever reads Surah Al-Kahf on Friday, a light will shine for him between the two Fridays." (An-Nasa\'i, Al-Hakim — authenticated)\n\nAbu ad-Darda\' reported that the Prophet ﷺ said: "Whoever memorizes ten verses from the beginning of Surah Al-Kahf will be protected from the Dajjal." (Sahih Muslim)',
      }}
    />
  );

  // ── Reminder Tab ──
  const renderReminderTab = () => (
    <ScrollView style={styles.reminderContent} showsVerticalScrollIndicator={false}>
      {/* Notification Settings Card */}
      <GlassCard style={styles.card}>
        <View style={styles.cardInner}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <MaterialCommunityIcons name="bell-ring-outline" size={24} color={colors.primary} />
            </View>
            <Text style={styles.cardTitle}>
              {isRTL ? 'تذكير يوم الجمعة' : 'Friday Reminder'}
            </Text>
          </View>

          {/* Description */}
          <Text style={styles.cardDesc}>
            {isRTL
              ? 'فعّل التذكير للحصول على إشعار كل يوم جمعة لقراءة سورة الكهف والاستفادة من فضلها العظيم'
              : 'Enable the reminder to receive a notification every Friday to read Surah Al-Kahf and benefit from its great virtue'}
          </Text>

          {/* Toggle Row */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>
              {isRTL ? 'تفعيل الإشعار' : 'Enable Notification'}
            </Text>
            <Switch
              value={kahfEnabled}
              onValueChange={(val) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                handleToggle(val);
              }}
              trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#0d8e62' }}
              thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
              ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
            />
          </View>

          {/* Time Row */}
          {kahfEnabled && (
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>
                {isRTL ? 'وقت التذكير' : 'Reminder Time'}
              </Text>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowTimePicker(true);
                }}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="clock-outline" size={18} color={colors.primary} />
                <Text style={styles.timeText}>{formatTime(kahfTime)}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Time Picker */}
          {kahfEnabled && showTimePicker && (
            <DateTimePicker
              value={parseTime(kahfTime)}
              mode="time"
              is24Hour={false}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeChange}
            />
          )}
        </View>
      </GlassCard>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <BackgroundWrapper
        backgroundKey={settings.display.appBackground}
        backgroundUrl={settings.display.appBackgroundUrl}
        opacity={settings.display.backgroundOpacity ?? 1}
      >
        <ScreenContainer edges={['left', 'right']} screenKey="surah-kahf">
          {/* Header */}
          <View style={styles.header}>
            <BackButton
              color={colors.text}
              style={{
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                borderRadius: 20,
                width: 40,
                height: 40,
              }}
            />
            <Text numberOfLines={1} style={styles.headerTitle}>{t('home.surahKahf')}</Text>
          </View>

          {/* NativeTabs — matches prayer page style */}
          <View style={styles.tabsContainer}>
            <NativeTabs
              tabs={tabs}
              selected={activeTab}
              onSelect={(key) => {
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab(key as 'reading' | 'reminder');
              }}
              indicatorColor="#0d8e62"
            />
          </View>

          {/* Tab Content */}
          {activeTab === 'reading' ? renderReadingTab() : renderReminderTab()}
        </ScreenContainer>
      </BackgroundWrapper>
    </View>
  );
}
