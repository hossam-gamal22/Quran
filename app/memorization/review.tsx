// app/memorization/review.tsx
// شاشة المراجعة الذكية — تستخدم SRS لاستحضار الآيات المستحقة اليوم.
// نمط بطاقات: عرض رقم السورة + الآية، اضغط "كشف" لعرض النص، ثم نعم/جزئيًا/لا.

import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ToastAndroid,
  Platform,
  Alert,
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
  formatAyahProgress,
  formatSurahAyahLabel,
  getAyahText,
  stripQuranicMarks,
  stripTashkeel,
} from '@/lib/memorization-helpers';

export default function ReviewScreen() {
  const router = useRouter();
  const colors = useColors();
  const { settings: appSettings } = useSettings();
  const isRTL = useIsRTL();
  const {
    activePlan,
    todayPlan,
    settings,
    markPassed,
    markFailed,
    markPartial,
    recordDailyActivity,
  } = useMemorization();

  const queue = useMemo(() => [...todayPlan.reviewAyahs], [todayPlan.reviewAyahs]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [doneCount, setDoneCount] = useState(0);

  const current = queue[index];

  const text = useMemo(() => {
    if (!current) return '';
    const raw = getAyahText(current.surahNumber, current.ayahNumber);
    return settings.showTashkeel ? stripQuranicMarks(raw) : stripTashkeel(raw);
  }, [current, settings.showTashkeel]);

  const next = useCallback(async () => {
    setRevealed(false);
    if (index + 1 >= queue.length) {
      await recordDailyActivity();
      const msg = mt('reviewDoneToast', { n: doneCount + 1 });
      if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
      else Alert.alert(mt('done'), msg);
      router.back();
    } else {
      setIndex((i) => i + 1);
    }
  }, [doneCount, index, queue.length, recordDailyActivity, router]);

  const onYes = useCallback(async () => {
    if (!current) return;
    await markPassed(current.surahNumber, current.ayahNumber);
    setDoneCount((c) => c + 1);
    next();
  }, [current, markPassed, next]);

  const onPartial = useCallback(async () => {
    if (!current) return;
    await markPartial(current.surahNumber, current.ayahNumber);
    setDoneCount((c) => c + 1);
    next();
  }, [current, markPartial, next]);

  const onNo = useCallback(async () => {
    if (!current) return;
    await markFailed(current.surahNumber, current.ayahNumber);
    setDoneCount((c) => c + 1);
    next();
  }, [current, markFailed, next]);

  const styles = makeStyles(colors, isRTL);

  return (
    <BackgroundWrapper
      backgroundKey={appSettings.display.appBackground}
      backgroundUrl={appSettings.display.appBackgroundUrl}
      opacity={appSettings.display.backgroundOpacity ?? 1}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.safe} edges={['top']}>
        <UniversalHeader title={mt('reviewTitle')} onBack={() => router.back()} />

        {!activePlan ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{mt('noActivePlan')}</Text>
          </View>
        ) : queue.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="check-decagram" size={56} color={colors.primary} />
            <Text style={styles.emptyText}>{mt('noReviewToday')}</Text>
          </View>
        ) : !current ? null : (
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.position}>
              {formatAyahProgress(index + 1, queue.length)}
            </Text>

            <GlassCard style={styles.card}>
              <Text style={styles.surahLabel}>
                {formatSurahAyahLabel(current.surahNumber, current.ayahNumber)}
              </Text>

              {revealed ? (
                <Text style={styles.quranText}>{text}</Text>
              ) : (
                <View style={styles.hiddenBox}>
                  <MaterialCommunityIcons name="eye-off-outline" size={36} color={colors.primary} />
                  <Text style={styles.rememberPrompt}>{mt('rememberPrompt')}</Text>
                </View>
              )}

              {!revealed ? (
                <TouchableOpacity
                  style={[styles.revealBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setRevealed(true)}
                >
                  <Text style={styles.revealBtnText}>{mt('reveal')}</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.choicesRow}>
                  <TouchableOpacity style={[styles.choice, styles.choiceNo]} onPress={onNo}>
                    <MaterialCommunityIcons name="close-thick" size={20} color="#fff" />
                    <Text style={styles.choiceText}>{mt('no')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.choice, styles.choicePartial]} onPress={onPartial}>
                    <MaterialCommunityIcons name="circle-slice-4" size={20} color="#fff" />
                    <Text style={styles.choiceText}>{mt('partial')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.choice, styles.choiceYes]} onPress={onYes}>
                    <MaterialCommunityIcons name="check-bold" size={20} color="#fff" />
                    <Text style={styles.choiceText}>{mt('yes')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </GlassCard>
          </ScrollView>
        )}
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

const makeStyles = (colors: ReturnType<typeof useColors>, isRTL: boolean) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: 'transparent' },
    scroll: { padding: 16, gap: 14, paddingBottom: 60 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
    emptyText: {
      color: colors.textLight,
      fontFamily: 'Cairo-SemiBold',
      fontSize: 14,
      textAlign: 'center',
    },
    position: {
      color: colors.textLight,
      fontFamily: 'Cairo-Regular',
      fontSize: 13,
      textAlign: 'center',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    card: { padding: 24, gap: 18, alignItems: 'center', minHeight: 320 },
    surahLabel: {
      color: colors.text,
      fontFamily: 'Cairo-Bold',
      fontSize: 16,
      textAlign: 'center',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    quranText: {
      color: colors.text,
      fontFamily: 'KFGQPCUthmanic',
      fontSize: 28,
      lineHeight: 56,
      textAlign: 'center',
      writingDirection: 'rtl',
    },
    hiddenBox: { alignItems: 'center', gap: 12, paddingVertical: 32 },
    rememberPrompt: {
      color: colors.text,
      fontFamily: 'Cairo-SemiBold',
      fontSize: 14,
      textAlign: 'center',
    },
    revealBtn: {
      paddingHorizontal: 32,
      paddingVertical: 12,
      borderRadius: 14,
    },
    revealBtnText: { color: '#fff', fontFamily: 'Cairo-Bold', fontSize: 14 },
    choicesRow: { flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8, alignSelf: 'stretch' },
    choice: {
      flex: 1,
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: 12,
    },
    choiceNo: { backgroundColor: '#b00020' },
    choicePartial: { backgroundColor: '#c98900' },
    choiceYes: { backgroundColor: '#0d8e62' },
    choiceText: { color: '#fff', fontFamily: 'Cairo-Bold', fontSize: 13 },
  });
