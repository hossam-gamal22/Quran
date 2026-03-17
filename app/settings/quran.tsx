// app/settings/quran.tsx
// إعدادات القرآن الموحدة - جميع خيارات المصحف في مكان واحد

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  Switch,
  Platform,
} from 'react-native';
import { fontBold, fontRegular, fontSemiBold } from '@/lib/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useSettings } from '@/contexts/SettingsContext';
import { t } from '@/lib/i18n';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { GlassCard } from '@/components/ui/GlassCard';
import { useColors } from '@/hooks/use-colors';
import { useIsRTL } from '@/hooks/use-is-rtl';

// Background images
const QURAN_BG_IMAGES: Record<string, any> = {
  quranbg1: require('@/assets/images/quran/quranbg1.png'),
  quranbg2: require('@/assets/images/quran/quranbg2.png'),
  quranbg3: require('@/assets/images/quran/quranbg3.png'),
  quranbg4: require('@/assets/images/quran/quranbg4.png'),
};

export default function QuranSettingsScreen() {
  const isRTL = useIsRTL();
  const router = useRouter();
  const { settings, isDarkMode, updateDisplay, updateNotifications } = useSettings();
  const hookColors = useColors();

  const colors = {
    primary: '#2f7659',
    foreground: hookColors.text,
    muted: hookColors.textLight,
    card: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.7)',
    cardBorder: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
    accent: isDarkMode ? '#4ADE80' : '#2f7659',
  };

  const currentFontAdjust = settings.display.quranFontSizeAdjust ?? 0;
  const currentBackground = settings.display.quranBackground ?? 'quranbg1';

  const handleFontAdjust = (delta: number) => {
    const newVal = Math.max(-4, Math.min(8, currentFontAdjust + delta));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateDisplay({ quranFontSizeAdjust: newVal });
  };

  const handleBackgroundSelect = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateDisplay({ quranBackground: key as any });
  };

  // Quran reading reminder
  const reminderEnabled = settings.notifications.quranReadingReminder ?? false;
  const reminderTime = settings.notifications.quranReadingReminderTime ?? '20:00';
  const reminderDays = settings.notifications.quranReminderDays ?? [0, 1, 2, 3, 4, 5, 6];
  const reminder24Hour = settings.notifications.quranReminder24Hour ?? true;

  // Custom time picker state
  const [selectedHour, setSelectedHour] = useState(() => parseInt(reminderTime.split(':')[0]));
  const [selectedMinute, setSelectedMinute] = useState(() => parseInt(reminderTime.split(':')[1]));

  const handleReminderToggle = (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateNotifications({ quranReadingReminder: value });
  };

  const handleTimeFormatToggle = (use24: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateNotifications({ quranReminder24Hour: use24 });
  };

  const handleDayToggle = (dayIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newDays = reminderDays.includes(dayIndex)
      ? reminderDays.filter(d => d !== dayIndex)
      : [...reminderDays, dayIndex].sort();
    updateNotifications({ quranReminderDays: newDays });
  };

  const handleTimeChange = (hour: number, minute: number) => {
    setSelectedHour(hour);
    setSelectedMinute(minute);
    const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    updateNotifications({ quranReadingReminderTime: time });
  };

  const DAY_NAMES = [
    t('notifications.daySat'),
    t('notifications.daySun'),
    t('notifications.dayMon'),
    t('notifications.dayTue'),
    t('notifications.dayWed'),
    t('notifications.dayThu'),
    t('notifications.dayFri'),
  ];

  const formatTime = (h: number, m: number) => {
    if (reminder24Hour) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    const period = h >= 12 ? (isRTL ? 'م' : 'PM') : (isRTL ? 'ص' : 'AM');
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
  };

  return (
    <BackgroundWrapper
      backgroundKey={settings.display.appBackground}
      opacity={settings.display.backgroundOpacity ?? 1}
      style={[styles.container, isDarkMode && styles.containerDark]}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

        {/* Header */}
        <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons
              name={isRTL ? 'chevron-right' : 'chevron-left'}
              size={28}
              color={colors.foreground}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {t('settings.quranSettings')}
          </Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ─── 1. إعدادات الخط (Font Settings) ─── */}
          <Animated.View entering={FadeInDown.delay(50).duration(400)}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 16 }}>
              <MaterialCommunityIcons name="format-size" size={18} color={colors.foreground} />
              <Text style={[styles.sectionTitle, { color: colors.foreground, textAlign: isRTL ? 'right' : 'left', marginBottom: 0, marginTop: 0 }]}>
                {t('settings.quranFontSettings')}
              </Text>
            </View>
            <GlassCard style={styles.card}>
              {/* Font Size */}
              <Text style={[styles.subLabel, { color: colors.muted, textAlign: isRTL ? 'right' : 'left' }]}>{t('settings.fontSize')}</Text>
              <View style={styles.fontSizeRow}>
                <TouchableOpacity
                  style={[styles.fontBtn, { backgroundColor: colors.accent + '20' }]}
                  onPress={() => handleFontAdjust(-1)}
                >
                  <MaterialCommunityIcons name="minus" size={24} color={colors.accent} />
                </TouchableOpacity>
                <View style={styles.fontValueWrap}>
                  <Text style={[styles.fontValue, { color: colors.foreground }]}>
                    {currentFontAdjust === 0
                      ? t('common.default')
                      : currentFontAdjust > 0
                      ? `+${currentFontAdjust}`
                      : currentFontAdjust}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.fontBtn, { backgroundColor: colors.accent + '20' }]}
                  onPress={() => handleFontAdjust(1)}
                >
                  <MaterialCommunityIcons name="plus" size={24} color={colors.accent} />
                </TouchableOpacity>
              </View>
              {currentFontAdjust !== 0 && (
                <TouchableOpacity
                  style={styles.resetBtn}
                  onPress={() => updateDisplay({ quranFontSizeAdjust: 0 })}
                >
                  <Text style={[styles.resetText, { color: colors.muted }]}>
                    {t('common.reset')}
                  </Text>
                </TouchableOpacity>
              )}
            </GlassCard>
          </Animated.View>

          {/* ─── 2. إعدادات التذكير بقراءة القرآن ─── */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 16 }}>
              <MaterialCommunityIcons name="bell-ring-outline" size={18} color={colors.foreground} />
              <Text style={[styles.sectionTitle, { color: colors.foreground, textAlign: isRTL ? 'right' : 'left', marginBottom: 0, marginTop: 0 }]}>
                {t('settings.quranReadingReminderSettings')}
              </Text>
            </View>
            <GlassCard style={styles.card}>
              {/* Enable/Disable */}
              <View style={[styles.toggleRow, { flexDirection: isRTL ? 'row-reverse' : 'row', gap: 12 }]}>
                <Switch
                  value={reminderEnabled}
                  onValueChange={handleReminderToggle}
                  trackColor={{ false: '#767577', true: colors.accent + '80' }}
                  thumbColor={reminderEnabled ? colors.accent : '#f4f3f4'}
                />
                <View style={[styles.toggleTextWrap, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <Text style={[styles.toggleLabel, { color: colors.foreground, textAlign: isRTL ? 'right' : 'left' }]}>
                    {t('settings.enableReminder')}
                  </Text>
                  <Text style={[styles.toggleDesc, { color: colors.muted, textAlign: isRTL ? 'right' : 'left' }]}>
                    {t('settings.quranReminderDesc')}
                  </Text>
                </View>
              </View>

              {reminderEnabled && (
                <>
                  <View style={styles.divider} />

                  {/* Time format toggle */}
                  <Text style={[styles.subLabel, { color: colors.muted, marginTop: 8, textAlign: isRTL ? 'right' : 'left' }]}>
                    {t('settings.timeFormat')}
                  </Text>
                  <View style={[styles.timeFormatRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <TouchableOpacity
                      style={[
                        styles.timeFormatBtn,
                        { backgroundColor: reminder24Hour ? colors.accent : (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)') },
                      ]}
                      onPress={() => handleTimeFormatToggle(true)}
                    >
                      <Text style={{ color: reminder24Hour ? '#fff' : colors.foreground, fontFamily: fontSemiBold(), fontSize: 13 }}>
                        {t('settings.format24hour')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.timeFormatBtn,
                        { backgroundColor: !reminder24Hour ? colors.accent : (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)') },
                      ]}
                      onPress={() => handleTimeFormatToggle(false)}
                    >
                      <Text style={{ color: !reminder24Hour ? '#fff' : colors.foreground, fontFamily: fontSemiBold(), fontSize: 13 }}>
                        {t('settings.format12hour')}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.divider} />

                  {/* Custom time picker */}
                  <Text style={[styles.subLabel, { color: colors.muted, marginTop: 8, textAlign: isRTL ? 'right' : 'left' }]}>
                    {t('settings.reminderTime')}
                  </Text>
                  <View style={styles.customTimeRow}>
                    <View style={styles.timePickerGroup}>
                      <Text style={[styles.timePickerLabel, { color: colors.muted, textAlign: isRTL ? 'right' : 'left' }]}>{t('settings.hour')}</Text>
                      <View style={styles.timePickerControls}>
                        <TouchableOpacity
                          style={[styles.timePickerBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                          onPress={() => handleTimeChange((selectedHour + 1) % 24, selectedMinute)}
                        >
                          <MaterialCommunityIcons name="chevron-up" size={22} color={colors.foreground} />
                        </TouchableOpacity>
                        <Text style={[styles.timePickerValue, { color: colors.foreground }]}>
                          {reminder24Hour
                            ? String(selectedHour).padStart(2, '0')
                            : String(selectedHour === 0 ? 12 : selectedHour > 12 ? selectedHour - 12 : selectedHour)}
                        </Text>
                        <TouchableOpacity
                          style={[styles.timePickerBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                          onPress={() => handleTimeChange((selectedHour - 1 + 24) % 24, selectedMinute)}
                        >
                          <MaterialCommunityIcons name="chevron-down" size={22} color={colors.foreground} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <Text style={[styles.timeSeparator, { color: colors.foreground }]}>:</Text>

                    <View style={styles.timePickerGroup}>
                      <Text style={[styles.timePickerLabel, { color: colors.muted, textAlign: isRTL ? 'right' : 'left' }]}>{t('settings.minute')}</Text>
                      <View style={styles.timePickerControls}>
                        <TouchableOpacity
                          style={[styles.timePickerBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                          onPress={() => handleTimeChange(selectedHour, (selectedMinute + 5) % 60)}
                        >
                          <MaterialCommunityIcons name="chevron-up" size={22} color={colors.foreground} />
                        </TouchableOpacity>
                        <Text style={[styles.timePickerValue, { color: colors.foreground }]}>
                          {String(selectedMinute).padStart(2, '0')}
                        </Text>
                        <TouchableOpacity
                          style={[styles.timePickerBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                          onPress={() => handleTimeChange(selectedHour, (selectedMinute - 5 + 60) % 60)}
                        >
                          <MaterialCommunityIcons name="chevron-down" size={22} color={colors.foreground} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {!reminder24Hour && (
                      <View style={styles.timePickerGroup}>
                        <Text style={[styles.timePickerLabel, { color: colors.muted }]}> </Text>
                        <View style={styles.timePickerControls}>
                          <Text style={[styles.amPmLabel, { color: colors.accent }]}>
                            {selectedHour >= 12 ? (isRTL ? 'م' : 'PM') : (isRTL ? 'ص' : 'AM')}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.selectedTimeDisplay, { color: colors.accent }]}>
                    {formatTime(selectedHour, selectedMinute)}
                  </Text>

                  <View style={styles.divider} />

                  {/* Day selection */}
                  <Text style={[styles.subLabel, { color: colors.muted, marginTop: 8, textAlign: isRTL ? 'right' : 'left' }]}>
                    {t('settings.reminderDays')}
                  </Text>
                  <View style={styles.daysGrid}>
                    {DAY_NAMES.map((dayName, index) => {
                      const isSelected = reminderDays.includes(index);
                      return (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.dayChip,
                            { backgroundColor: isSelected ? colors.accent : (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)') },
                          ]}
                          onPress={() => handleDayToggle(index)}
                        >
                          <Text style={[
                            styles.dayChipText,
                            { color: isSelected ? '#fff' : colors.foreground },
                          ]}>
                            {dayName}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}
            </GlassCard>
          </Animated.View>

          {/* ─── 3. خلفية المصحف ─── */}
          <Animated.View entering={FadeInDown.delay(150).duration(400)}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 16 }}>
              <MaterialCommunityIcons name="image-outline" size={18} color={colors.foreground} />
              <Text style={[styles.sectionTitle, { color: colors.foreground, textAlign: isRTL ? 'right' : 'left', marginBottom: 0, marginTop: 0 }]}>
                {t('quran.mushafBackground')}
              </Text>
            </View>
            <GlassCard style={styles.card}>
              <View style={styles.bgGrid}>
                {(['quranbg1', 'quranbg2', 'quranbg3', 'quranbg4'] as const).map(
                  (key) => {
                    const isSelected = currentBackground === key;
                    return (
                      <TouchableOpacity
                        key={key}
                        style={[
                          styles.bgItem,
                          isSelected && styles.bgItemSelected,
                        ]}
                        onPress={() => handleBackgroundSelect(key)}
                      >
                        <Image
                          source={QURAN_BG_IMAGES[key]}
                          style={styles.bgImage}
                          resizeMode="cover"
                        />
                        {isSelected && (
                          <View style={styles.bgCheck}>
                            <MaterialCommunityIcons
                              name="check"
                              size={14}
                              color="#fff"
                            />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  }
                )}
              </View>
            </GlassCard>
          </Animated.View>

          {/* ─── 4. الترجمة للغات أخرى ─── */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 16 }}>
              <MaterialCommunityIcons name="translate" size={18} color={colors.foreground} />
              <Text style={[styles.sectionTitle, { color: colors.foreground, textAlign: isRTL ? 'right' : 'left', marginBottom: 0, marginTop: 0 }]}>
                {t('quran.translationToOtherLanguages')}
              </Text>
            </View>
            <GlassCard style={styles.card}>
              <TouchableOpacity
                style={[styles.navRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                onPress={() => router.push('/settings/translations')}
              >
                <MaterialCommunityIcons
                  name={isRTL ? 'chevron-left' : 'chevron-right'}
                  size={22}
                  color={colors.muted}
                />
                <View style={[styles.navRowContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <Text style={[styles.navRowTitle, { color: colors.foreground, textAlign: isRTL ? 'right' : 'left' }]}>
                    {t('settings.selectTranslationLanguage')}
                  </Text>
                  <Text style={[styles.navRowDesc, { color: colors.muted, textAlign: isRTL ? 'right' : 'left' }]}>
                    {t('settings.translationLanguageDesc')}
                  </Text>
                </View>
                <MaterialCommunityIcons name="translate" size={22} color={colors.accent} />
              </TouchableOpacity>
            </GlassCard>
          </Animated.View>

          {/* Bottom spacer */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

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
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: fontBold(),
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fontSemiBold(),
    marginBottom: 10,
    marginTop: 16,
  },
  card: {
    padding: 16,
  },
  subLabel: {
    fontSize: 13,
    fontFamily: fontSemiBold(),
    marginBottom: 10,
  },
  // Font size
  fontSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  fontBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontValueWrap: {
    minWidth: 80,
    alignItems: 'center',
  },
  fontValue: {
    fontSize: 18,
    fontFamily: fontSemiBold(),
  },
  resetBtn: {
    alignSelf: 'center',
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  resetText: {
    fontSize: 13,
    fontFamily: fontRegular(),
  },
  fontTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    paddingVertical: 4,
  },
  fontTypeName: {
    fontSize: 14,
    fontFamily: fontRegular(),
  },
  // Background grid
  bgGrid: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  bgItem: {
    width: 70,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  bgItemSelected: {
    borderColor: '#2f7659',
  },
  bgImage: {
    width: '100%',
    height: '100%',
  },
  bgCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#2f7659',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Toggle rows
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  toggleTextWrap: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 15,
    fontFamily: fontSemiBold(),
  },
  toggleDesc: {
    fontSize: 12,
    fontFamily: fontRegular(),
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(128,128,128,0.15)',
    marginVertical: 4,
  },
  // Time grid
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginTop: 8,
  },
  timeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  timeChipText: {
    fontSize: 14,
    fontFamily: fontSemiBold(),
  },
  // Time format toggle
  timeFormatRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 4,
  },
  timeFormatBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  // Custom time picker
  customTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 8,
  },
  timePickerGroup: {
    alignItems: 'center',
  },
  timePickerLabel: {
    fontSize: 11,
    fontFamily: fontRegular(),
    marginBottom: 4,
  },
  timePickerControls: {
    alignItems: 'center',
    gap: 8,
  },
  timePickerBtn: {
    width: 40,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timePickerValue: {
    fontSize: 22,
    fontFamily: fontBold(),
    minWidth: 40,
    textAlign: 'center',
  },
  timeSeparator: {
    fontSize: 22,
    fontFamily: fontBold(),
    marginTop: 16,
  },
  amPmLabel: {
    fontSize: 18,
    fontFamily: fontBold(),
    marginTop: 8,
  },
  selectedTimeDisplay: {
    fontSize: 14,
    fontFamily: fontSemiBold(),
    textAlign: 'center',
    marginTop: 4,
  },
  // Day selection grid
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginTop: 8,
  },
  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  dayChipText: {
    fontSize: 13,
    fontFamily: fontSemiBold(),
  },
  // Navigation row
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  navRowContent: {
    flex: 1,
  },
  navRowTitle: {
    fontSize: 15,
    fontFamily: fontSemiBold(),
  },
  navRowDesc: {
    fontSize: 12,
    fontFamily: fontRegular(),
    marginTop: 2,
  },
});
