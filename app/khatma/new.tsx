import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useKhatma } from '../../contexts/KhatmaContext';
import { useColors } from '../../hooks/use-colors';
import { useSettings } from '../../contexts/SettingsContext';
import { KhatmaDuration } from '../../lib/khatma-storage';
import GlassCard from '../../components/ui/GlassCard';
import { UniversalHeader } from '@/components/ui';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { t, getDateLocale } from '@/lib/i18n';
import {
  Spacing,
  BorderRadius,
  FONT_SIZES,
} from '../../constants/theme';
import { localizeNumber as toArabicNumber } from '@/lib/format-number';

const formatTime = (date: Date, rtl: boolean): string => {
  return date.toLocaleTimeString(getDateLocale(), {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const WEEK_DAYS = [
  { key: 0, nameKey: 'khatma.sun' as const },
  { key: 1, nameKey: 'khatma.mon' as const },
  { key: 2, nameKey: 'khatma.tue' as const },
  { key: 3, nameKey: 'khatma.wed' as const },
  { key: 4, nameKey: 'khatma.thu' as const },
  { key: 5, nameKey: 'khatma.fri' as const },
  { key: 6, nameKey: 'khatma.sat' as const },
];

export default function NewKhatmaScreen() {
  const router = useRouter();
  const colors = useColors();
  const { isDarkMode, settings } = useSettings();
  const isRTL = useIsRTL();
  const { durations, createKhatma } = useKhatma();

  // State
  const [name, setName] = useState('');
  const [selectedDuration, setSelectedDuration] = useState<KhatmaDuration | null>(null);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  // Handle duration selection
  const handleSelectDuration = useCallback((duration: KhatmaDuration) => {
    setSelectedDuration(duration);
    if (!name) {
      setName(`ختمة ${duration.nameAr}`);
    }
  }, [name]);

  // Handle time change
  const handleTimeChange = useCallback((event: any, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setReminderTime(selectedDate);
    }
  }, []);

  // Handle create khatma
  const handleCreate = useCallback(async () => {
    if (!selectedDuration) {
      Alert.alert(t('messages.alert'), t('khatma.selectDurationAlert'));
      return;
    }

    setIsCreating(true);
    try {
      const timeString = reminderEnabled
        ? `${reminderTime.getHours().toString().padStart(2, '0')}:${reminderTime.getMinutes().toString().padStart(2, '0')}`
        : null;

      const khatma = await createKhatma(
        name || `ختمة ${selectedDuration.nameAr}`,
        selectedDuration,
        timeString
      );

      if (khatma) {
        Alert.alert(
          t('messages.success'),
          t('khatma.khatmaCreatedMsg'),
          [
            {
              text: t('khatma.startWird'),
              onPress: () => router.replace('/khatma/wird'),
            },
            {
              text: t('messages.later'),
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        Alert.alert(t('common.error'), t('khatma.createError'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('khatma.createError'));
    } finally {
      setIsCreating(false);
    }
  }, [name, selectedDuration, reminderEnabled, reminderTime, createKhatma, router]);

  return (
    <BackgroundWrapper backgroundKey={settings.display.appBackground} backgroundUrl={settings.display.appBackgroundUrl} opacity={settings.display.backgroundOpacity ?? 1} style={{ flex: 1 }}>
    <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]} edges={['top']}>
      {/* Header */}
      <UniversalHeader
        title={t('khatma.newKhatma')}
        titleColor={colors.text}
        onBack={() => router.back()}
        showBack
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Khatma Name */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{t('khatma.khatmaName')}</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder={t('khatma.khatmaNamePlaceholder')}
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
            textAlign={isRTL ? 'right' : 'left'}
          />
        </View>

        {/* Duration Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{t('khatma.khatmaDuration')}</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
            {t('khatma.chooseDuration')}
          </Text>

          <View style={styles.durationsGrid}>
            {durations.map((duration) => (
              <TouchableOpacity
                key={duration.id}
                style={[
                  styles.durationCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: selectedDuration?.id === duration.id
                      ? colors.primary
                      : colors.border,
                    borderWidth: selectedDuration?.id === duration.id ? 2 : 1,
                  },
                ]}
                onPress={() => handleSelectDuration(duration)}
              >
                <Text
                  style={[
                    styles.durationName,
                    {
                      color: selectedDuration?.id === duration.id
                        ? colors.primary
                        : colors.text,
                    },
                  ]}
                >
                  {duration.nameAr}
                </Text>
                <Text style={[styles.durationPages, { color: colors.textSecondary }]}>
                  {toArabicNumber(duration.pagesPerDay)} {t('khatma.pagesPerDayUnit')}
                </Text>
                {selectedDuration?.id === duration.id && (
                  <View style={[styles.selectedCheck, { backgroundColor: colors.primary }]}>
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Selected Duration Info */}
        {selectedDuration && (
          <GlassCard style={styles.infoCard}>
            <View style={[styles.infoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.infoItem}>
                <Ionicons name="calendar-outline" size={24} color={colors.primary} />
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {toArabicNumber(selectedDuration.days)}
                </Text>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('khatma.daily')}</Text>
              </View>

              <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />

              <View style={styles.infoItem}>
                <Ionicons name="document-text-outline" size={24} color={colors.primary} />
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {toArabicNumber(selectedDuration.pagesPerDay)}
                </Text>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('khatma.pagesPerDayUnit')}</Text>
              </View>

              <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />

              <View style={styles.infoItem}>
                <Ionicons name="book-outline" size={24} color={colors.primary} />
                <Text style={[styles.infoValue, { color: colors.text }]}>{toArabicNumber(604)}</Text>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('common.page')}</Text>
              </View>
            </View>
          </GlassCard>
        )}

        {/* Reminder */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{t('khatma.dailyReminder')}</Text>
          
          <TouchableOpacity
            style={[styles.reminderToggle, { backgroundColor: colors.card, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={() => setReminderEnabled(!reminderEnabled)}
          >
            <View style={[styles.reminderToggleContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons
                name={reminderEnabled ? 'notifications' : 'notifications-outline'}
                size={24}
                color={reminderEnabled ? colors.primary : colors.textSecondary}
              />
              <Text style={[styles.reminderToggleText, { color: colors.text }]}>
                {t('khatma.enableReminder')}
              </Text>
            </View>
            <View
              style={[
                styles.toggleSwitch,
                {
                  backgroundColor: reminderEnabled ? colors.primary : colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.toggleKnob,
                  {
                    transform: [{ translateX: reminderEnabled ? 20 : 0 }],
                  },
                ]}
              />
            </View>
          </TouchableOpacity>

          {reminderEnabled && (
            <TouchableOpacity
              style={[styles.timeSelector, { backgroundColor: colors.card, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => setShowTimePicker(true)}
            >
              <View style={[styles.timeSelectorContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="time-outline" size={24} color={colors.primary} />
                <Text style={[styles.timeSelectorLabel, { color: colors.text }]}>
                  {t('khatma.reminderTime')}
                </Text>
              </View>
              <Text style={[styles.timeSelectorValue, { color: colors.primary }]}>
                {formatTime(reminderTime, isRTL)}
              </Text>
            </TouchableOpacity>
          )}

          {showTimePicker && (
            <DateTimePicker
              value={reminderTime}
              mode="time"
              is24Hour={false}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeChange}
              themeVariant={isDarkMode ? 'dark' : 'light'}
            />
          )}

          {/* Day selection */}
          {reminderEnabled && (
            <View style={{ marginTop: Spacing.md }}>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary, marginBottom: Spacing.sm }]}>
                {t('khatma.reminderDays')}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {WEEK_DAYS.map((day) => {
                  const isSelected = selectedDays.includes(day.key);
                  return (
                    <TouchableOpacity
                      key={day.key}
                      onPress={() => {
                        setSelectedDays(prev =>
                          isSelected
                            ? prev.filter(d => d !== day.key)
                            : [...prev, day.key]
                        );
                      }}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 20,
                        backgroundColor: isSelected ? colors.primary : colors.card,
                        borderWidth: 1,
                        borderColor: isSelected ? colors.primary : colors.border,
                      }}
                    >
                      <Text style={{
                        fontSize: FONT_SIZES.sm,
                        fontWeight: '600',
                        color: isSelected ? '#FFFFFF' : colors.text,
                      }}>
                        {t(day.nameKey)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* Tips */}
        <GlassCard style={styles.tipsCard}>
          <View style={[styles.tipsHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="bulb-outline" size={20} color={colors.warning} />
            <Text style={[styles.tipsTitle, { color: colors.text }]}>{t('khatma.tips')}</Text>
          </View>
          <Text style={[styles.tipsText, { color: colors.textSecondary }]}>
            • {t('khatma.tip1')}{`\n`}
            • {t('khatma.tip2')}{`\n`}
            • {t('khatma.tip3')}{`\n`}
            • {t('khatma.tip4')}
          </Text>
        </GlassCard>

        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Create Button */}
      <View style={[styles.bottomBar, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[
            styles.createButton,
            {
              backgroundColor: selectedDuration ? colors.primary : colors.border,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
          onPress={handleCreate}
          disabled={!selectedDuration || isCreating}
        >
          {isCreating ? (
            <Text style={styles.createButtonText}>{t('khatma.creating')}</Text>
          ) : (
            <>
              <Ionicons name="add-circle" size={24} color="#FFFFFF" />
              <Text style={styles.createButtonText}>{t('khatma.startKhatma')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    fontSize: FONT_SIZES.sm,
    marginBottom: Spacing.md,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FONT_SIZES.md,
  },
  durationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  durationCard: {
    width: '31%',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    position: 'relative',
  },
  durationName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  durationPages: {
    fontSize: FONT_SIZES.xs,
    textAlign: 'center',
  },
  selectedCheck: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    marginBottom: Spacing.xl,
    padding: Spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  infoItem: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  infoValue: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: '700',
  },
  infoLabel: {
    fontSize: FONT_SIZES.xs,
  },
  infoDivider: {
    width: 1,
    height: 50,
  },
  reminderToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  reminderToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  reminderToggleText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
  },
  toggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: BorderRadius.full,
    padding: 4,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: BorderRadius.full,
    backgroundColor: '#FFFFFF',
  },
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  timeSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  timeSelectorLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
  },
  timeSelectorValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  tipsCard: {
    padding: Spacing.lg,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  tipsTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  tipsText: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 24,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
});
