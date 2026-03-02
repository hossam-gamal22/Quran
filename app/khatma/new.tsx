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
import { useColors } from '../../lib/theme-provider';
import { KhatmaDuration } from '../../lib/khatma-storage';
import GlassCard from '../../components/ui/GlassCard';
import {
  Spacing,
  BorderRadius,
  FONT_SIZES,
} from '../../constants/theme';

// ===== HELPER =====
const toArabicNumber = (num: number): string => {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return num.toString().split('').map((d) => arabicNumerals[parseInt(d)]).join('');
};

const formatTime = (date: Date): string => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'م' : 'ص';
  const displayHours = hours % 12 || 12;
  return `${toArabicNumber(displayHours)}:${toArabicNumber(minutes).padStart(2, '٠')} ${period}`;
};

export default function NewKhatmaScreen() {
  const router = useRouter();
  const colors = useColors();
  const { durations, createKhatma } = useKhatma();

  // State
  const [name, setName] = useState('');
  const [selectedDuration, setSelectedDuration] = useState<KhatmaDuration | null>(null);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

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
      Alert.alert('تنبيه', 'يرجى اختيار مدة الختمة');
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
          'تم بنجاح',
          'تم إنشاء الختمة بنجاح. ابدأ القراءة الآن!',
          [
            {
              text: 'ابدأ الورد',
              onPress: () => router.replace('/khatma/wird'),
            },
            {
              text: 'لاحقاً',
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        Alert.alert('خطأ', 'حدث خطأ أثناء إنشاء الختمة');
      }
    } catch (error) {
      Alert.alert('خطأ', 'حدث خطأ أثناء إنشاء الختمة');
    } finally {
      setIsCreating(false);
    }
  }, [name, selectedDuration, reminderEnabled, reminderTime, createKhatma, router]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-forward" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: colors.text }]}>ختمة جديدة</Text>
        
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Khatma Name */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>اسم الختمة</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder="مثال: ختمة رمضان"
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
            textAlign="right"
          />
        </View>

        {/* Duration Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>مدة الختمة</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            اختر المدة المناسبة لك
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
                  {toArabicNumber(duration.pagesPerDay)} صفحة/يوم
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
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Ionicons name="calendar-outline" size={24} color={colors.primary} />
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {toArabicNumber(selectedDuration.days)}
                </Text>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>يوم</Text>
              </View>

              <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />

              <View style={styles.infoItem}>
                <Ionicons name="document-text-outline" size={24} color={colors.primary} />
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {toArabicNumber(selectedDuration.pagesPerDay)}
                </Text>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>صفحة/يوم</Text>
              </View>

              <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />

              <View style={styles.infoItem}>
                <Ionicons name="book-outline" size={24} color={colors.primary} />
                <Text style={[styles.infoValue, { color: colors.text }]}>٦٠٤</Text>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>صفحة</Text>
              </View>
            </View>
          </GlassCard>
        )}

        {/* Reminder */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>التذكير اليومي</Text>
          
          <TouchableOpacity
            style={[styles.reminderToggle, { backgroundColor: colors.card }]}
            onPress={() => setReminderEnabled(!reminderEnabled)}
          >
            <View style={styles.reminderToggleContent}>
              <Ionicons
                name={reminderEnabled ? 'notifications' : 'notifications-outline'}
                size={24}
                color={reminderEnabled ? colors.primary : colors.textSecondary}
              />
              <Text style={[styles.reminderToggleText, { color: colors.text }]}>
                تفعيل التذكير
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
              style={[styles.timeSelector, { backgroundColor: colors.card }]}
              onPress={() => setShowTimePicker(true)}
            >
              <View style={styles.timeSelectorContent}>
                <Ionicons name="time-outline" size={24} color={colors.primary} />
                <Text style={[styles.timeSelectorLabel, { color: colors.text }]}>
                  وقت التذكير
                </Text>
              </View>
              <Text style={[styles.timeSelectorValue, { color: colors.primary }]}>
                {formatTime(reminderTime)}
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
            />
          )}
        </View>

        {/* Tips */}
        <GlassCard style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb-outline" size={20} color={colors.warning} />
            <Text style={[styles.tipsTitle, { color: colors.text }]}>نصائح</Text>
          </View>
          <Text style={[styles.tipsText, { color: colors.textSecondary }]}>
            • اختر مدة مناسبة لجدولك اليومي{'\n'}
            • فعّل التذكير لتحافظ على استمراريتك{'\n'}
            • يمكنك قراءة أكثر من الورد اليومي{'\n'}
            • الاستمرارية أهم من الكمية
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
            },
          ]}
          onPress={handleCreate}
          disabled={!selectedDuration || isCreating}
        >
          {isCreating ? (
            <Text style={styles.createButtonText}>جاري الإنشاء...</Text>
          ) : (
            <>
              <Ionicons name="add-circle" size={24} color="#FFFFFF" />
              <Text style={styles.createButtonText}>ابدأ الختمة</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
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
