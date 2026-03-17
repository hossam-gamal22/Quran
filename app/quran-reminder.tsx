// app/quran-reminder.tsx
// شاشة تذكير قراءة القرآن — صفحة كاملة

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
} from 'react-native';
import { fontBold, fontSemiBold } from '@/lib/fonts';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';

import { useSettings } from '@/contexts/SettingsContext';
import type { NotificationSoundType } from '@/contexts/SettingsContext';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { BackButton } from '@/components/ui';

import { useIsRTL } from '@/hooks/use-is-rtl';
import { t } from '@/lib/i18n';

const DAY_NAMES = [
  { nameKey: 'quranReminder.saturday' as const },
  { nameKey: 'quranReminder.sunday' as const },
  { nameKey: 'quranReminder.monday' as const },
  { nameKey: 'quranReminder.tuesday' as const },
  { nameKey: 'quranReminder.wednesday' as const },
  { nameKey: 'quranReminder.thursday' as const },
  { nameKey: 'quranReminder.friday' as const },
];

const SOUND_OPTIONS: { key: NotificationSoundType; nameKey: string }[] = [
  { key: 'default', nameKey: 'quranReminder.defaultSound' },
  { key: 'salawat', nameKey: 'quranReminder.salawatProphet' },
  { key: 'tasbih', nameKey: 'quranReminder.subhanallahBihamdi' },
  { key: 'subhanallah', nameKey: 'quranReminder.subhanallah' },
  { key: 'alhamdulillah', nameKey: 'quranReminder.alhamdulillah' },
  { key: 'istighfar', nameKey: 'quranReminder.astaghfirullah' },
  { key: 'general_reminder', nameKey: 'quranReminder.reminderTone' },
  { key: 'silent', nameKey: 'quranReminder.silent' },
];

export default function QuranReminderScreen() {
  const router = useRouter();
  const { settings, isDarkMode, updateNotifications } = useSettings();
  const isRTL = useIsRTL();

  const reminderEnabled = settings.notifications.quranReadingReminder ?? false;
  const reminderTime = settings.notifications.quranReadingReminderTime ?? '20:00';
  const reminderDays = settings.notifications.quranReminderDays ?? [0, 1, 2, 3, 4, 5, 6];
  const reminderSound: NotificationSoundType = settings.notifications.quranReminderSoundType ?? 'default';

  const [showDaySelector, setShowDaySelector] = useState(false);
  const [showSoundSelector, setShowSoundSelector] = useState(false);

  // Parse time string to Date for DateTimePicker
  const timeToDate = useCallback((timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  }, []);

  const [pickerDate, setPickerDate] = useState(() => timeToDate(reminderTime));

  const handleTimeChange = (_event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setPickerDate(selectedDate);
      const h = String(selectedDate.getHours()).padStart(2, '0');
      const m = String(selectedDate.getMinutes()).padStart(2, '0');
      updateNotifications({ quranReadingReminderTime: `${h}:${m}` });
    }
  };

  const handleToggle = (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateNotifications({ quranReadingReminder: value });
  };

  const handleDayToggle = (dayIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newDays = reminderDays.includes(dayIndex)
      ? reminderDays.filter(d => d !== dayIndex)
      : [...reminderDays, dayIndex].sort();
    updateNotifications({ quranReminderDays: newDays });
  };

  const allDaysSelected = reminderDays.length === 7;
  const daysLabel = allDaysSelected
    ? t('quranReminder.everyDay')
    : reminderDays.length === 0
      ? t('quranReminder.noDaysSelected')
      : reminderDays.map(d => t(DAY_NAMES[d].nameKey)).join(isRTL ? '، ' : ', ');

  const colors = {
    bg: isDarkMode ? '#11151c' : '#f5f5f5',
    card: isDarkMode ? '#1C2230' : '#FFFFFF',
    text: isDarkMode ? '#FFFFFF' : '#1C1C1E',
    muted: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
    accent: '#22C55E',
    border: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
  };

  return (
    <BackgroundWrapper backgroundKey={settings.display.appBackground} backgroundUrl={settings.display.appBackgroundUrl} opacity={settings.display.backgroundOpacity ?? 1} style={{ flex: 1 }}>
    <View style={[s.container, { backgroundColor: 'transparent' }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={[s.header, { flexDirection: isRTL ? 'row-reverse' : 'row', borderBottomColor: colors.border }]}>
          <BackButton />
          <Text style={[s.headerTitle, { color: colors.text }]}>{t('quranReminder.title')}</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[s.saveBtn, { backgroundColor: colors.accent }]}
          >
            <Text style={s.saveBtnText}>{t('common.save')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title Card */}
          <View style={[s.card, { backgroundColor: colors.card }]}>
            <Text style={[s.cardTitle, { color: colors.text }]}>{t('quranReminder.reminder')}</Text>
          </View>

          {/* Message Card */}
          <View style={[s.card, { backgroundColor: colors.card }]}>
            <Text style={[s.cardMessage, { color: colors.muted }]}>
              {t('quranReminder.dontForgetQuran')}
            </Text>
          </View>

          {/* Enable/Disable Toggle */}
          <View style={[s.card, s.toggleCard, { backgroundColor: colors.card }]}>
            <Switch
              value={reminderEnabled}
              onValueChange={handleToggle}
              trackColor={{ false: '#767577', true: colors.accent + '80' }}
              thumbColor={reminderEnabled ? colors.accent : '#f4f3f4'}
            />
            <Text style={[s.toggleLabel, { color: colors.text }]}>{t('quranReminder.enableReminder')}</Text>
          </View>

          {reminderEnabled && (
            <>
              {/* Time Picker Section */}
              <Text style={[s.sectionLabel, { color: colors.muted }]}>
                {t('quranReminder.setReminderTime')}
              </Text>
              <View style={[s.card, s.timePickerCard, { backgroundColor: colors.card }]}>
                <DateTimePicker
                  value={pickerDate}
                  mode="time"
                  display="spinner"
                  onChange={handleTimeChange}
                  textColor={colors.text}
                  locale={isRTL ? 'ar' : 'en'}
                  style={{ height: 150, width: '100%' }}
                  themeVariant={isDarkMode ? 'dark' : 'light'}
                />
              </View>

              {/* Day Selection */}
              <Text style={[s.sectionLabel, { color: colors.muted }]}>
                {t('quranReminder.selectDays')}
              </Text>
              <TouchableOpacity
                style={[s.card, s.dayRow, { backgroundColor: colors.card }]}
                onPress={() => setShowDaySelector(!showDaySelector)}
              >
                <Ionicons
                  name={isRTL ? 'chevron-forward' : 'chevron-back'}
                  size={20}
                  color={colors.muted}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[s.dayRowText, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
                    {daysLabel}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="calendar-check"
                  size={24}
                  color={colors.accent}
                />
              </TouchableOpacity>

              {showDaySelector && (
                <View style={[s.card, { backgroundColor: colors.card }]}>
                  {/* Select All / Deselect All */}
                  <TouchableOpacity
                    style={[s.dayChip, { backgroundColor: allDaysSelected ? colors.accent : (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'), marginBottom: 10, alignSelf: 'center' }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      updateNotifications({ quranReminderDays: allDaysSelected ? [] : [0, 1, 2, 3, 4, 5, 6] });
                    }}
                  >
                    <Text style={[s.dayChipText, { color: allDaysSelected ? '#fff' : colors.text }]}>
                      {allDaysSelected ? t('quranReminder.deselectAll') : t('quranReminder.selectAllDays')}
                    </Text>
                  </TouchableOpacity>
                  <View style={s.daysGrid}>
                    {DAY_NAMES.map((item, index) => {
                      const isSelected = reminderDays.includes(index);
                      return (
                        <TouchableOpacity
                          key={index}
                          style={[
                            s.dayChip,
                            {
                              backgroundColor: isSelected
                                ? colors.accent
                                : (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'),
                            },
                          ]}
                          onPress={() => handleDayToggle(index)}
                        >
                          <Text style={[s.dayChipText, { color: isSelected ? '#fff' : colors.text }]}>
                            {t(item.nameKey)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Notification Sound */}
              <Text style={[s.sectionLabel, { color: colors.muted }]}>
                {t('quranReminder.selectSound')}
              </Text>
              <TouchableOpacity
                style={[s.card, s.dayRow, { backgroundColor: colors.card }]}
                activeOpacity={0.7}
                onPress={() => setShowSoundSelector(!showSoundSelector)}
              >
                <Ionicons
                  name={isRTL ? 'chevron-forward' : 'chevron-back'}
                  size={20}
                  color={colors.muted}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[s.dayRowText, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
                    {t(SOUND_OPTIONS.find(o => o.key === reminderSound)?.nameKey ?? 'quranReminder.defaultSound')}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="volume-high"
                  size={24}
                  color={colors.accent}
                />
              </TouchableOpacity>

              {showSoundSelector && (
                <View style={[s.card, { backgroundColor: colors.card }]}>
                  {SOUND_OPTIONS.map((option) => {
                    const isSelected = reminderSound === option.key;
                    return (
                      <TouchableOpacity
                        key={option.key}
                        style={[
                          s.soundOption,
                          {
                            backgroundColor: isSelected
                              ? colors.accent + '18'
                              : 'transparent',
                            borderColor: isSelected
                              ? colors.accent
                              : (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                          },
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          updateNotifications({ quranReminderSoundType: option.key });
                        }}
                      >
                        <MaterialCommunityIcons
                          name={isSelected ? 'radiobox-marked' : 'radiobox-blank'}
                          size={22}
                          color={isSelected ? colors.accent : colors.muted}
                        />
                        <Text
                          style={[
                            s.soundOptionText,
                            { color: isSelected ? colors.accent : colors.text, textAlign: isRTL ? 'right' : 'left' },
                          ]}
                        >
                          {t(option.nameKey)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
    </BackgroundWrapper>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
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
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveBtnText: {
    color: '#fff',
    fontFamily: fontBold(),
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: fontBold(),
    textAlign: 'center',
  },
  cardMessage: {
    fontSize: 16,
    fontFamily: fontSemiBold(),
    textAlign: 'center',
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  toggleLabel: {
    fontSize: 16,
    fontFamily: fontSemiBold(),
  },
  sectionLabel: {
    fontSize: 15,
    fontFamily: fontSemiBold(),
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  timePickerCard: {
    alignItems: 'center',
    overflow: 'hidden',
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  dayRowText: {
    fontSize: 15,
    fontFamily: fontSemiBold(),
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  dayChipText: {
    fontSize: 14,
    fontFamily: fontSemiBold(),
  },
  soundOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
  },
  soundOptionText: {
    fontSize: 15,
    fontFamily: fontSemiBold(),
    flex: 1,
  },
});
