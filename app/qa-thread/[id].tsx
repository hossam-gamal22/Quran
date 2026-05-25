// app/qa-thread/[id].tsx
// Deep-link target for the "question_answered" push notification.
// Renders the user's submitted question + admin reply + sources, live from Firestore.

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Linking,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { db } from '@/config/firebase';
import { ScreenContainer } from '@/components/screen-container';
import { UniversalHeader } from '@/components/ui';
import { useColors } from '@/hooks/use-colors';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { useSettings } from '@/contexts/SettingsContext';
import { fontRegular, fontSemiBold } from '@/lib/fonts';
import { Spacing, BorderRadius, FONT_SIZES } from '@/constants/theme';
import { t } from '@/lib/i18n';

const ACCENT = '#0d8e62';

interface QuestionDoc {
  question: string;
  language: string;
  status: 'pending' | 'reviewed' | 'answered';
  autoAnswer?: string;
  autoAnswerDisclaimer?: string;
  autoAnswerSources?: Array<{ title: string; url: string; snippet?: string }>;
  adminCorrection?: boolean;
  adminCorrectedAt?: string;
  adminAnsweredAt?: string;
}

function getSourceHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export default function QAThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const isRTL = useIsRTL();
  const { isDarkMode } = useSettings();
  const [data, setData] = useState<QuestionDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('missing');
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(
      doc(db, 'userQuestions', id),
      (snap) => {
        if (!snap.exists()) {
          setError('not_found');
          setLoading(false);
          return;
        }
        setData(snap.data() as QuestionDoc);
        setLoading(false);
      },
      () => {
        setError('network');
        setLoading(false);
      }
    );
    return () => unsub();
  }, [id]);

  const cardBg = isDarkMode ? 'rgba(30,30,30,0.50)' : 'rgba(255,255,255,0.70)';
  const cardBorder = isDarkMode ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';
  const dirStyle = { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' } as const;

  const answerText = data?.autoAnswer?.trim() || '';
  const hasAnswer = answerText.length > 0 && data?.status === 'answered';
  const sources = useMemo(() => data?.autoAnswerSources || [], [data]);

  return (
    <ScreenContainer>
      <UniversalHeader title="إجابة سؤالك" showBack />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.textLight} />
          <Text style={[styles.muted, { color: colors.textLight, marginTop: 12 }, dirStyle]}>
            {error === 'not_found' ? 'لم يتم العثور على هذا السؤال.' : 'تعذر تحميل السؤال. تحقق من الاتصال وأعد المحاولة.'}
          </Text>
          <TouchableOpacity
            onPress={() => router.replace('/question-answer')}
            style={[styles.cta, { backgroundColor: ACCENT, marginTop: 18 }]}
          >
            <Text style={styles.ctaText}>الذهاب إلى سؤال وجواب</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: Spacing.md, paddingBottom: 64 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Question card */}
          <View style={[styles.card, { borderColor: cardBorder }]}>
            {Platform.OS === 'ios' && (
              <BlurView
                intensity={70}
                tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any}
                style={StyleSheet.absoluteFill}
              />
            )}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: cardBg, borderRadius: BorderRadius.lg }]} />
            <View style={styles.cardInner}>
              <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.iconBubble, { backgroundColor: 'rgba(13,142,98,0.12)' }]}>
                  <MaterialCommunityIcons name="help-circle" size={20} color={ACCENT} />
                </View>
                <Text style={[styles.label, { color: colors.textLight }, dirStyle]}>
                  {t('questionAnswer.question')}
                </Text>
              </View>
              <Text style={[styles.bodyText, { color: colors.text, marginTop: 8 }, dirStyle]}>
                {data?.question?.trim() || ''}
              </Text>
            </View>
          </View>

          {/* Answer card */}
          {hasAnswer ? (
            <View style={[styles.card, { borderColor: cardBorder, marginTop: Spacing.md }]}>
              {Platform.OS === 'ios' && (
                <BlurView
                  intensity={70}
                  tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any}
                  style={StyleSheet.absoluteFill}
                />
              )}
              <View style={[StyleSheet.absoluteFill, { backgroundColor: cardBg, borderRadius: BorderRadius.lg }]} />
              <View style={styles.cardInner}>
                <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.iconBubble, { backgroundColor: 'rgba(13,142,98,0.12)' }]}>
                    <MaterialCommunityIcons name="check-circle" size={20} color={ACCENT} />
                  </View>
                  <Text style={[styles.label, { color: colors.textLight }, dirStyle]}>
                    {t('questionAnswer.answer')}
                  </Text>
                  {data?.adminCorrection && (
                    <View style={styles.correctionBadge}>
                      <MaterialCommunityIcons name="check-decagram" size={14} color={ACCENT} />
                      <Text style={styles.correctionBadgeText}>
                        {t('questionAnswer.aiAssistantAdminCorrected')}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.bodyText, { color: colors.text, marginTop: 8 }, dirStyle]}>
                  {answerText}
                </Text>

                {data?.autoAnswerDisclaimer ? (
                  <View style={[styles.disclaimer, { borderColor: cardBorder }]}>
                    <Text style={[styles.disclaimerText, { color: colors.textLight }, dirStyle]}>
                      {data.autoAnswerDisclaimer}
                    </Text>
                  </View>
                ) : null}

                {sources.length > 0 ? (
                  <View style={{ marginTop: Spacing.md }}>
                    <Text style={[styles.sourcesLabel, dirStyle]}>
                      {t('questionAnswer.aiAssistantSources')}
                    </Text>
                    {sources.map((source, index) => (
                      <TouchableOpacity
                        key={`${source.url}-${index}`}
                        onPress={() => Linking.openURL(source.url).catch(() => {})}
                        style={styles.sourceLink}
                      >
                        <Text style={[styles.sourceDomain, dirStyle]} numberOfLines={1}>
                          {getSourceHost(source.url)}
                        </Text>
                        <Text style={[styles.sourceTitle, dirStyle]} numberOfLines={2}>
                          {`${index + 1}. ${source.title}`}
                        </Text>
                        {source.snippet ? (
                          <Text style={[styles.sourceSnippet, { color: colors.textLight }, dirStyle]} numberOfLines={3}>
                            {source.snippet}
                          </Text>
                        ) : null}
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
              </View>
            </View>
          ) : (
            <View style={[styles.card, { borderColor: cardBorder, marginTop: Spacing.md }]}>
              <View style={[StyleSheet.absoluteFill, { backgroundColor: cardBg, borderRadius: BorderRadius.lg }]} />
              <View style={styles.cardInner}>
                <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.iconBubble, { backgroundColor: 'rgba(13,142,98,0.12)' }]}>
                    <MaterialCommunityIcons name="clock-outline" size={20} color={ACCENT} />
                  </View>
                  <Text style={[styles.label, { color: colors.textLight }, dirStyle]}>
                    قيد المراجعة
                  </Text>
                </View>
                <Text style={[styles.bodyText, { color: colors.text, marginTop: 8 }, dirStyle]}>
                  سؤالك وصل ونحن نراجعه. سنرسل لك إشعارا فور توفر الرد إن شاء الله.
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            onPress={() => router.replace('/question-answer')}
            style={[styles.cta, { backgroundColor: ACCENT, marginTop: Spacing.lg }]}
          >
            <Text style={styles.ctaText}>الرجوع إلى سؤال وجواب</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardInner: {
    padding: Spacing.md,
  },
  row: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: fontSemiBold(),
    fontSize: FONT_SIZES.sm,
    flex: 1,
  },
  bodyText: {
    fontFamily: fontRegular(),
    fontSize: FONT_SIZES.md,
    lineHeight: 30,
  },
  muted: {
    fontFamily: fontRegular(),
    fontSize: FONT_SIZES.sm,
    lineHeight: 24,
  },
  disclaimer: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
  },
  disclaimerText: {
    fontFamily: fontRegular(),
    fontSize: FONT_SIZES.xs,
    lineHeight: 22,
  },
  sourcesLabel: {
    fontFamily: fontSemiBold(),
    fontSize: FONT_SIZES.sm,
    color: ACCENT,
    marginBottom: 8,
  },
  sourceLink: {
    borderRadius: BorderRadius.md,
    padding: 12,
    backgroundColor: 'rgba(13,142,98,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(13,142,98,0.22)',
    marginBottom: 8,
  },
  sourceDomain: {
    color: ACCENT,
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 3,
    fontFamily: fontRegular(),
  },
  sourceTitle: {
    color: ACCENT,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: fontSemiBold(),
  },
  sourceSnippet: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    fontFamily: fontRegular(),
  },
  correctionBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(13,142,98,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(13,142,98,0.35)',
  },
  correctionBadgeText: {
    color: ACCENT,
    fontSize: 11,
    fontFamily: fontSemiBold(),
  },
  cta: {
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  ctaText: {
    color: '#fff',
    fontFamily: fontSemiBold(),
    fontSize: FONT_SIZES.md,
  },
});
