// app/memorization/new.tsx
// شاشة إنشاء خطة حفظ — اختيار النطاق، المستوى، الطريقة، العدد اليومي، التذكير.

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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { GlassCard, UniversalHeader } from '@/components/ui';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { useSettings } from '@/contexts/SettingsContext';
import { useMemorization } from '@/contexts/MemorizationContext';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { mt } from '@/lib/memorization-i18n';
import {
  MEMORIZATION_PRESETS,
  getPresetById,
} from '@/lib/memorization-presets';
import {
  enumeratePlanAyahsFull,
  formatAyahRangeLabel,
  getSurahName,
  getAyahCount,
  toArabicDigits,
} from '@/lib/memorization-helpers';
import type {
  MemorizationLevel,
  MemorizationMethod,
  MemorizationScope,
} from '@/types/memorization';

const SHORT_SURAH_OPTIONS = [
  1, 67, 18, 36, 55, 56, 78, 110, 112, 113, 114,
];

const DAILY_OPTIONS = [1, 3, 5, 10];
const LEVELS: MemorizationLevel[] = ['beginner', 'intermediate', 'reviewer'];
const METHODS: MemorizationMethod[] = [
  'ayah_by_ayah',
  'group_3',
  'page',
  'semantic',
];

const ARABIC_DIGIT_MAP: Record<string, string> = {
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
};

function normalizeDigits(value: string): string {
  return value.replace(/[٠-٩]/g, (d) => ARABIC_DIGIT_MAP[d] ?? d);
}

function parseAyahInput(value: string): number | null {
  const normalized = normalizeDigits(value).trim();
  if (!/^\d+$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function isValidReminderTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(normalizeDigits(value).trim());
}

export default function NewMemorizationPlan() {
  const router = useRouter();
  const colors = useColors();
  const { settings: appSettings } = useSettings();
  const isRTL = useIsRTL();
  const { plans, createPlan, registerAyahsForPlan, setActivePlan } = useMemorization();

  const [scope, setScope] = useState<MemorizationScope>('preset');
  const [presetId, setPresetId] = useState<string>(
    MEMORIZATION_PRESETS[0]?.id ?? 'juzAmma',
  );
  const [pickedSurah, setPickedSurah] = useState<number>(67);
  const [surahInput, setSurahInput] = useState<string>('67');
  const [rangeFrom, setRangeFrom] = useState<string>('1');
  const [rangeTo, setRangeTo] = useState<string>('5');
  const [level, setLevel] = useState<MemorizationLevel>('beginner');
  const [method, setMethod] = useState<MemorizationMethod>('ayah_by_ayah');
  const [dailyTarget, setDailyTarget] = useState<number>(3);
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(true);
  const [reminderTime, setReminderTime] = useState<string>('06:00');
  const [submitting, setSubmitting] = useState(false);

  const planName = useMemo(() => {
    if (scope === 'preset') {
      return mt(getPresetById(presetId)?.nameKey ?? 'preset_juzAmma');
    }
    if (scope === 'surah') return getSurahName(pickedSurah);
    if (scope === 'range') {
      return formatAyahRangeLabel(pickedSurah, rangeFrom, rangeTo);
    }
    return mt('newPlan');
  }, [scope, presetId, pickedSurah, rangeFrom, rangeTo]);

  const onCreate = async () => {
    const normalizedReminderTime = normalizeDigits(reminderTime).trim();
    if (reminderEnabled && !isValidReminderTime(normalizedReminderTime)) {
      Alert.alert(mt('errSave'), mt('errInvalidReminderTime'));
      return;
    }

    const selectedSurah = parseAyahInput(surahInput) ?? pickedSurah;
    if ((scope === 'surah' || scope === 'range') && !getAyahCount(selectedSurah)) {
      Alert.alert(mt('errSave'), mt('errInvalidSurah'));
      return;
    }

    let ayahRange: { surahNumber: number; fromAyah: number; toAyah: number } | undefined;
    if (scope === 'range') {
      const from = parseAyahInput(rangeFrom);
      const to = parseAyahInput(rangeTo);
      const ayahCount = getAyahCount(selectedSurah);
      if (!from || !to || from > to || to > ayahCount) {
        Alert.alert(mt('errSave'), mt('errInvalidRange'));
        return;
      }
      ayahRange = {
        surahNumber: selectedSurah,
        fromAyah: from,
        toAyah: to,
      };
    }

    setSubmitting(true);
    try {
      const partial: any = {
        name: planName,
        scope,
        dailyTarget,
        level,
        method,
        reciterId: 'mishary_alafasy',
        reminderTime: reminderEnabled ? normalizedReminderTime : null,
        reminderEnabled,
      };
      if (scope === 'preset') {
        partial.presetId = presetId;
        partial.surahNumbers = getPresetById(presetId)?.surahNumbers ?? [];
      } else if (scope === 'surah') {
        partial.surahNumbers = [selectedSurah];
      } else if (scope === 'range') {
        partial.ayahRange = ayahRange;
      }
      const plan = await createPlan(partial);
      const ayahs = enumeratePlanAyahsFull(plan);
      await registerAyahsForPlan(ayahs);
      router.replace('/memorization');
    } catch (e: any) {
      Alert.alert(mt('errSave'), String(e?.message ?? e));
    } finally {
      setSubmitting(false);
    }
  };

  const styles = makeStyles(colors, isRTL);

  return (
    <BackgroundWrapper
      backgroundKey={appSettings.display.appBackground}
      backgroundUrl={appSettings.display.appBackgroundUrl}
      opacity={appSettings.display.backgroundOpacity ?? 1}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.safe} edges={['top']}>
        <UniversalHeader title={mt('newPlanTitle')} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {plans.length > 0 && (
          <Section title={mt('continuePlan')} colors={colors} isRTL={isRTL}>
            <Text style={styles.hint}>{mt('continuePlanHint')}</Text>
            <View style={styles.gap8}>
              {plans.map((plan) => (
                <TouchableOpacity
                  key={plan.id}
                  onPress={async () => {
                    await setActivePlan(plan.id);
                    router.replace('/memorization');
                  }}
                  style={[
                    styles.presetRow,
                    plan.isActive && {
                      borderColor: colors.primary,
                      backgroundColor: 'rgba(13,142,98,0.08)',
                    },
                  ]}
                >
                  <Text style={styles.presetTitle}>{plan.name}</Text>
                  <Text style={styles.presetMeta}>
                    {toArabicDigits(plan.dailyTarget)} {mt('ayahsUnit')} / {mt('daysUnit')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Section>
        )}

        {/* Step 1: Scope */}
        <Section title={mt('step1')} colors={colors} isRTL={isRTL}>
          <Text style={styles.hint}>{mt('externalReviewHint')}</Text>
          <ChipsRow
            colors={colors}
            isRTL={isRTL}
            options={[
              { value: 'preset', label: mt('scopePreset') },
              { value: 'surah', label: mt('scopeSurah') },
              { value: 'range', label: mt('scopeRange') },
            ]}
            value={scope}
            onChange={(v) => setScope(v as MemorizationScope)}
          />

          {scope === 'preset' && (
            <View style={styles.gap8}>
              {MEMORIZATION_PRESETS.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setPresetId(p.id)}
                  style={[
                    styles.presetRow,
                    presetId === p.id && {
                      borderColor: colors.primary,
                      backgroundColor: 'rgba(13,142,98,0.08)',
                    },
                  ]}
                >
                  <Text style={styles.presetTitle}>{mt(p.nameKey)}</Text>
                  <Text style={styles.presetMeta}>
                    {`${toArabicDigits(p.totalAyahs)} ${mt('ayahsUnit')} • ${toArabicDigits(p.recommendedDailyAyahs)}/يوم تقريبًا`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {(scope === 'surah' || scope === 'range') && (
            <View style={styles.gap8}>
              <Text style={styles.label}>{mt('scopeSurah')}</Text>
              <View style={styles.chipsWrap}>
                {SHORT_SURAH_OPTIONS.map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => {
                      setPickedSurah(s);
                      setSurahInput(String(s));
                    }}
                    style={[
                      styles.chip,
                      pickedSurah === s && { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        pickedSurah === s && { color: '#fff' },
                      ]}
                    >
                      {getSurahName(s)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.exactBox}>
                <Text style={styles.label}>{mt('exactSelection')}</Text>
                <Text style={styles.hint}>{mt('ayahRangeHint')}</Text>
                <View style={styles.rowGap}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>{mt('surahNumber')}</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="number-pad"
                      value={surahInput}
                      onChangeText={(v) => {
                        const normalized = normalizeDigits(v).replace(/[^0-9]/g, '').slice(0, 3);
                        setSurahInput(normalized);
                        const parsed = parseAyahInput(normalized);
                        if (parsed && getAyahCount(parsed)) setPickedSurah(parsed);
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>{mt('selectedSurah')}</Text>
                    <View style={styles.readOnlyInput}>
                      <Text style={styles.readOnlyText} numberOfLines={1}>
                        {getAyahCount(pickedSurah)
                          ? getSurahName(pickedSurah)
                          : mt('errInvalidSurah')}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {scope === 'range' && (
                <View style={styles.rowGap}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>{mt('ayahFrom')}</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="number-pad"
                      value={rangeFrom}
                      onChangeText={setRangeFrom}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>{mt('ayahTo')}</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="number-pad"
                      value={rangeTo}
                      onChangeText={setRangeTo}
                    />
                  </View>
                </View>
              )}
            </View>
          )}
        </Section>

        {/* Step 2: Level */}
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

        {/* Step 3: Method */}
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

        {/* Step 4: Daily target */}
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

        {/* Step 5: Reminder */}
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
              onChangeText={(v) => {
                setReminderTime(normalizeDigits(v));
              }}
              placeholder="HH:mm"
              placeholderTextColor={colors.textLight}
            />
          )}
        </Section>

        <TouchableOpacity
          style={[styles.cta, submitting && { opacity: 0.6 }]}
          disabled={submitting}
          onPress={onCreate}
        >
          <MaterialCommunityIcons name="check-bold" size={18} color="#fff" />
          <Text style={styles.ctaText}>{mt('createPlan')}</Text>
        </TouchableOpacity>
      </ScrollView>
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
    label: {
      color: colors.text,
      fontFamily: 'Rubik-SemiBold',
      fontSize: 13,
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    gap8: { gap: 8 },
    rowGap: { flexDirection: isRTL ? 'row-reverse' : 'row', gap: 12 },
    rowBetween: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    chipsWrap: { flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.06)',
    },
    chipText: { color: colors.text, fontFamily: 'Rubik-Regular', fontSize: 12 },
    exactBox: {
      gap: 8,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
      backgroundColor: 'rgba(255,255,255,0.04)',
    },
    hint: {
      color: colors.textLight,
      fontFamily: 'Rubik-Regular',
      fontSize: 12,
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    presetRow: {
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.08)',
      gap: 4,
    },
    presetTitle: {
      color: colors.text,
      fontFamily: 'Rubik-Bold',
      fontSize: 14,
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    presetMeta: {
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
    readOnlyInput: {
      minHeight: 47,
      backgroundColor: 'rgba(255,255,255,0.04)',
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
    },
    readOnlyText: {
      color: colors.text,
      fontFamily: 'Rubik-SemiBold',
      fontSize: 13,
      textAlign: 'center',
      writingDirection: isRTL ? 'rtl' : 'ltr',
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
