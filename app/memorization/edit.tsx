// app/memorization/edit.tsx
// شاشة تعديل خطة حفظ موجودة — المستوى، الطريقة، العدد اليومي، التذكير.
// النطاق (سورة/جزء/نطاق) غير قابل للتعديل لأنه يحدد مجموعة الآيات المسجّلة.

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
  Platform,
  ToastAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { GlassCard, UniversalHeader } from '@/components/ui';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { useSettings } from '@/contexts/SettingsContext';
import { useMemorization } from '@/contexts/MemorizationContext';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { mt } from '@/lib/memorization-i18n';
import { toArabicDigits } from '@/lib/memorization-helpers';
import type {
  MemorizationLevel,
  MemorizationMethod,
} from '@/types/memorization';

const DAILY_OPTIONS = [1, 3, 5, 10];
const LEVELS: MemorizationLevel[] = ['beginner', 'intermediate', 'reviewer'];
const METHODS: MemorizationMethod[] = [
  'ayah_by_ayah',
  'group_3',
  'page',
  'semantic',
];

const ARABIC_DIGIT_MAP: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

function normalizeDigits(value: string): string {
  return value.replace(/[٠-٩]/g, (d) => ARABIC_DIGIT_MAP[d] ?? d);
}

function isValidReminderTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(normalizeDigits(value).trim());
}

export default function EditMemorizationPlan() {
  const router = useRouter();
  const colors = useColors();
  const { settings: appSettings } = useSettings();
  const isRTL = useIsRTL();
  const { plans, updatePlan } = useMemorization();
  const { planId } = useLocalSearchParams<{ planId?: string }>();

  const plan = useMemo(
    () => plans.find((p) => p.id === planId) ?? null,
    [plans, planId],
  );

  const [level, setLevel] = useState<MemorizationLevel>(
    plan?.level ?? 'beginner',
  );
  const [method, setMethod] = useState<MemorizationMethod>(
    plan?.method ?? 'ayah_by_ayah',
  );
  const [dailyTarget, setDailyTarget] = useState<number>(plan?.dailyTarget ?? 3);
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(
    plan?.reminderEnabled ?? true,
  );
  const [reminderTime, setReminderTime] = useState<string>(
    plan?.reminderTime ?? '06:00',
  );
  const [submitting, setSubmitting] = useState(false);

  const styles = makeStyles(colors, isRTL);

  const onSave = async () => {
    if (!plan) return;
    const normalizedReminderTime = normalizeDigits(reminderTime).trim();
    if (reminderEnabled && !isValidReminderTime(normalizedReminderTime)) {
      Alert.alert(mt('errSave'), mt('errInvalidReminderTime'));
      return;
    }
    setSubmitting(true);
    try {
      await updatePlan(plan.id, {
        level,
        method,
        dailyTarget,
        reminderEnabled,
        reminderTime: reminderEnabled ? normalizedReminderTime : null,
      });
      const msg = mt('planUpdated');
      if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
      router.back();
    } catch (e: any) {
      Alert.alert(mt('errSave'), String(e?.message ?? e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BackgroundWrapper
      backgroundKey={appSettings.display.appBackground}
      backgroundUrl={appSettings.display.appBackgroundUrl}
      opacity={appSettings.display.backgroundOpacity ?? 1}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.safe} edges={['top']}>
        <UniversalHeader title={mt('editPlanTitle')} onBack={() => router.back()} />
        {!plan ? (
          <View style={styles.empty}>
            <Text style={styles.hint}>{mt('noActivePlan')}</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll}>
            <GlassCard style={styles.headerCard}>
              <Text style={styles.planName}>{plan.name}</Text>
              <Text style={styles.hint}>{mt('editScopeLocked')}</Text>
            </GlassCard>

            <Section title={mt('step2')} colors={colors} isRTL={isRTL}>
              <ChipsRow
                colors={colors}
                isRTL={isRTL}
                options={LEVELS.map((l) => ({
                  value: l,
                  label: mt(`level${l[0].toUpperCase() + l.slice(1)}`),
                }))}
                value={level}
                onChange={(v) => setLevel(v as MemorizationLevel)}
              />
            </Section>

            <Section title={mt('step3')} colors={colors} isRTL={isRTL}>
              <ChipsRow
                colors={colors}
                isRTL={isRTL}
                options={METHODS.map((m) => ({
                  value: m,
                  label: mt(
                    m === 'ayah_by_ayah'
                      ? 'methodAyahByAyah'
                      : m === 'group_3'
                        ? 'methodGroup3'
                        : m === 'page'
                          ? 'methodPage'
                          : 'methodSemantic',
                  ),
                }))}
                value={method}
                onChange={(v) => setMethod(v as MemorizationMethod)}
              />
            </Section>

            <Section title={mt('step4')} colors={colors} isRTL={isRTL}>
              <ChipsRow
                colors={colors}
                isRTL={isRTL}
                options={DAILY_OPTIONS.map((n) => ({
                  value: String(n),
                  label: `${toArabicDigits(n)} ${mt('ayahsUnit')}`,
                }))}
                value={String(dailyTarget)}
                onChange={(v) => setDailyTarget(Number(v))}
              />
            </Section>

            <Section title={mt('step5')} colors={colors} isRTL={isRTL}>
              <View style={styles.rowBetween}>
                <Text style={styles.label}>{mt('enableReminder')}</Text>
                <Switch
                  value={reminderEnabled}
                  onValueChange={setReminderEnabled}
                  trackColor={{ true: colors.primary, false: '#888' }}
                />
              </View>
              {reminderEnabled && (
                <TextInput
                  style={styles.input}
                  value={toArabicDigits(reminderTime)}
                  onChangeText={(v) => setReminderTime(normalizeDigits(v))}
                  placeholder="HH:mm"
                  placeholderTextColor={colors.textLight}
                />
              )}
            </Section>

            <TouchableOpacity
              style={[styles.cta, submitting && { opacity: 0.6 }]}
              disabled={submitting}
              onPress={onSave}
            >
              <MaterialCommunityIcons name="check-bold" size={18} color="#fff" />
              <Text style={styles.ctaText}>{mt('saveChanges')}</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

function Section({
  title,
  colors,
  isRTL,
  children,
}: {
  title: string;
  colors: ReturnType<typeof useColors>;
  isRTL: boolean;
  children: React.ReactNode;
}) {
  return (
    <GlassCard style={{ padding: 16, gap: 12 }}>
      <Text
        style={{
          color: colors.text,
          fontFamily: 'Rubik-Bold',
          fontSize: 15,
          textAlign: isRTL ? 'right' : 'left',
          writingDirection: isRTL ? 'rtl' : 'ltr',
        }}
      >
        {title}
      </Text>
      {children}
    </GlassCard>
  );
}

function ChipsRow({
  options,
  value,
  onChange,
  colors,
  isRTL,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  colors: ReturnType<typeof useColors>;
  isRTL: boolean;
}) {
  return (
    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <TouchableOpacity
            key={o.value}
            onPress={() => onChange(o.value)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: active ? colors.primary : 'rgba(255,255,255,0.06)',
              borderWidth: 1,
              borderColor: active ? colors.primary : 'rgba(255,255,255,0.12)',
            }}
          >
            <Text
              style={{
                color: active ? '#fff' : colors.text,
                fontFamily: 'Rubik-SemiBold',
                fontSize: 13,
              }}
            >
              {o.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useColors>, isRTL: boolean) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: 'transparent' },
    scroll: { padding: 16, gap: 14, paddingBottom: 60 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    headerCard: { padding: 16, gap: 6 },
    planName: {
      color: colors.text,
      fontFamily: 'Rubik-Bold',
      fontSize: 16,
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    label: {
      color: colors.text,
      fontFamily: 'Rubik-SemiBold',
      fontSize: 13,
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    rowBetween: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    hint: {
      color: colors.textLight,
      fontFamily: 'Rubik-Regular',
      fontSize: 12,
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    input: {
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      fontFamily: 'Rubik-Regular',
      fontSize: 14,
      textAlign: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
    },
    cta: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 14,
      marginTop: 8,
    },
    ctaText: { color: '#fff', fontFamily: 'Rubik-Bold', fontSize: 16 },
  });
