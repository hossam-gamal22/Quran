import React, { useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useKhatma } from '../../contexts/KhatmaContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useColors } from '../../hooks/use-colors';
import { getPageSurah, getKhatmaStats } from '../../lib/khatma-storage';
import GlassCard from '../../components/ui/GlassCard';
import { UniversalHeader } from '@/components/ui';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { localizeNumber as toArabicNumber } from '@/lib/format-number';
import {
  Spacing,
  BorderRadius,
  FONT_SIZES,
} from '../../constants/theme';

export default function WirdScreen() {
  const router = useRouter();
  const colors = useColors();
  const { settings, t } = useSettings();
  const isRTL = useIsRTL();
  const {
    activeKhatma,
    getTodayWirdInfo,
    getActiveKhatmaStats,
    completeTodayWird,
    recordProgress,
    resetKhatma,
  } = useKhatma();

  const [isCompleting, setIsCompleting] = useState(false);

  // Get today's wird info
  const wirdInfo = useMemo(() => {
    return getTodayWirdInfo();
  }, [getTodayWirdInfo]);

  // Get khatma stats
  const stats = useMemo(() => {
    return getActiveKhatmaStats();
  }, [getActiveKhatmaStats]);

  // Generate page list for today's wird
  const pagesList = useMemo(() => {
    if (!wirdInfo || !activeKhatma) return [];
    
    const pages = [];
    for (let i = wirdInfo.startPage; i <= wirdInfo.endPage; i++) {
      pages.push({
        number: i,
        surah: getPageSurah(i),
      });
    }
    return pages;
  }, [wirdInfo, activeKhatma]);

  // Handle complete wird
  const handleCompleteWird = useCallback(async () => {
    Alert.alert(
      t('khatma.completeWird'),
      t('khatma.confirmCompleteWird'),
      [
        { text: t('common.no'), style: 'cancel' },
        {
          text: t('khatma.yesCompleted'),
          onPress: async () => {
            setIsCompleting(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            
            const success = await completeTodayWird();
            
            if (success) {
              Alert.alert(
                t('khatma.congratulations'),
                t('khatma.wirdCompletedMsg'),
                [{ text: t('common.ok') }]
              );
            }
            setIsCompleting(false);
          },
        },
      ]
    );
  }, [completeTodayWird]);

  // Handle read more
  const handleReadMore = useCallback(async (pages: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await recordProgress(pages);
  }, [recordProgress]);

  // Handle reset khatma
  const handleResetKhatma = useCallback(() => {
    Alert.alert(
      t('khatma.resetKhatma'),
      t('khatma.confirmResetKhatma'),
      [
        { text: t('common.no'), style: 'cancel' },
        {
          text: t('common.yes'),
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await resetKhatma();
          },
        },
      ]
    );
  }, [resetKhatma, t]);

  // Handle open Quran at page
  const handleOpenPage = useCallback((pageNumber: number) => {
    // Navigate to Quran page (you'll need to implement this route)
    // For now, we'll navigate to the surah that contains this page
    router.push(`/surah/1`); // This should be updated to open specific page
  }, [router]);

  // No active khatma
  if (!activeKhatma) {
    return (
      <BackgroundWrapper backgroundKey={settings.display.appBackground} backgroundUrl={settings.display.appBackgroundUrl} opacity={settings.display.backgroundOpacity ?? 1} style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}>
        <View style={styles.emptyContainer}>
          <Ionicons name="book-outline" size={80} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {t('khatma.noActiveKhatma')}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {t('khatma.noActiveKhatmaDesc')}
          </Text>
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: '#22C55E', flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={() => router.push('/khatma/new')}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.startButtonText}>{t('khatma.startNewKhatma')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      </BackgroundWrapper>
    );
  }

  // Khatma completed
  if (activeKhatma.isCompleted) {
    return (
      <BackgroundWrapper backgroundKey={settings.display.appBackground} backgroundUrl={settings.display.appBackgroundUrl} opacity={settings.display.backgroundOpacity ?? 1} style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}>
        <View style={styles.emptyContainer}>
          <Ionicons name="trophy" size={80} color={colors.success} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {t('khatma.khatmaCompleted')} 🎉
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {t('khatma.khatmaCompletedMsg')}
          </Text>
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: '#22C55E', flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={handleResetKhatma}
          >
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
            <Text style={styles.startButtonText}>{t('khatma.resetKhatma')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: colors.card, flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 8 }]}
            onPress={() => router.push('/khatma/new')}
          >
            <Ionicons name="add" size={20} color={colors.text} />
            <Text style={[styles.startButtonText, { color: colors.text }]}>{t('khatma.startNewKhatma')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      </BackgroundWrapper>
    );
  }

  return (
    <BackgroundWrapper backgroundKey={settings.display.appBackground} backgroundUrl={settings.display.appBackgroundUrl} opacity={settings.display.backgroundOpacity ?? 1} style={{ flex: 1 }}>
    <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]} edges={['top']}>
      {/* Header */}
      <UniversalHeader
        title={t('khatma.dailyWird')}
        titleColor={colors.text}
        onBack={() => router.back()}
        showBack
        rightActions={[{
          icon: 'format-list-bulleted',
          onPress: () => router.push('/khatma'),
          color: colors.text,
          size: 24,
        }]}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Khatma Info Card */}
        <GlassCard style={styles.khatmaCard}>
          <Text style={[styles.khatmaName, { color: colors.text }]}>
            {activeKhatma.name}
          </Text>
          
          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <View style={[styles.progressBar, { backgroundColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.primary,
                    width: `${stats?.progressPercentage || 0}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
              {toArabicNumber(stats?.progressPercentage || 0)}٪
            </Text>
          </View>

          {/* Stats Row */}
          <View style={[styles.statsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {toArabicNumber(stats?.pagesRead || 0)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t('khatma.pagesRead')}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {toArabicNumber(stats?.pagesRemaining || 0)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t('khatma.pagesRemaining')}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {toArabicNumber(stats?.daysRemaining || 0)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t('khatma.daysLeft')}
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Today's Wird */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('khatma.todayWird')}
            </Text>
            {wirdInfo?.isCompleted && (
              <View style={[styles.completedBadge, { backgroundColor: colors.success, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                <Text style={styles.completedBadgeText}>{t('khatma.completedBadge')}</Text>
              </View>
            )}
          </View>

          {/* Wird Summary */}
          <GlassCard style={styles.wirdSummary}>
            <View style={[styles.wirdRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.wirdItem}>
                <Ionicons name="flag-outline" size={24} color={colors.primary} />
                <Text style={[styles.wirdLabel, { color: colors.textSecondary }]}>{t('khatma.fromLabel')}</Text>
                <Text style={[styles.wirdValue, { color: colors.text }]}>
                  {t('khatma.pageUnit')} {toArabicNumber(wirdInfo?.startPage || 1)}
                </Text>
              </View>
              
              <Ionicons name="arrow-back" size={24} color={colors.textSecondary} />
              
              <View style={styles.wirdItem}>
                <Ionicons name="flag" size={24} color={colors.success} />
                <Text style={[styles.wirdLabel, { color: colors.textSecondary }]}>{t('khatma.toLabel')}</Text>
                <Text style={[styles.wirdValue, { color: colors.text }]}>
                  {t('khatma.pageUnit')} {toArabicNumber(wirdInfo?.endPage || 1)}
                </Text>
              </View>
            </View>
            
            <View style={[styles.wirdTotal, { backgroundColor: colors.card, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.wirdTotalLabel, { color: colors.textSecondary }]}>
                {t('khatma.totalWird')}
              </Text>
              <Text style={[styles.wirdTotalValue, { color: colors.primary }]}>
                {toArabicNumber(activeKhatma.pagesPerDay)} {t('khatma.pageUnit')}
              </Text>
            </View>
          </GlassCard>

          {/* Pages List */}
          <Text style={[styles.pagesTitle, { color: colors.text }]}>
            {t('khatma.pagesTitle')}
          </Text>
          <View style={styles.pagesList}>
            {pagesList.map((page) => (
              <TouchableOpacity
                key={page.number}
                style={[styles.pageItem, { backgroundColor: colors.card, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                onPress={() => handleOpenPage(page.number)}
              >
                <View style={[styles.pageNumber, { backgroundColor: colors.primary + '15' }]}>
                  <Text style={[styles.pageNumberText, { color: colors.primary }]}>
                    {toArabicNumber(page.number)}
                  </Text>
                </View>
                <Text style={[styles.pageSurah, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
                  {page.surah}
                </Text>
                <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Motivational Quote */}
        <GlassCard style={styles.quoteCard}>
          <Ionicons name="heart" size={24} color={colors.error} />
          <Text style={[styles.quoteText, { color: colors.text }]}>
            {t('khatma.quranHadith')}
          </Text>
          <Text style={[styles.quoteSource, { color: colors.textSecondary }]}>
            {t('khatma.quranHadithSource')}
          </Text>
        </GlassCard>

        {/* Bottom Spacing */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Complete Button */}
      {!wirdInfo?.isCompleted && (
        <View style={[styles.bottomBar, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[styles.completeButton, { backgroundColor: '#22C55E', flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={handleCompleteWird}
            disabled={isCompleting}
          >
            {isCompleting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                <Text style={styles.completeButtonText}>{t('khatma.completeWirdBtn')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.lg,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  khatmaCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  khatmaName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  progressBar: {
    flex: 1,
    height: 10,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  progressText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    minWidth: 50,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  completedBadgeText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  wirdSummary: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  wirdRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  wirdItem: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  wirdLabel: {
    fontSize: FONT_SIZES.xs,
  },
  wirdValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  wirdTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  wirdTotalLabel: {
    fontSize: FONT_SIZES.sm,
  },
  wirdTotalValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  pagesTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  pagesList: {
    gap: Spacing.sm,
  },
  pageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  pageNumber: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageNumberText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  pageSurah: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
  },
  quoteCard: {
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  quoteText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    textAlign: 'center',
  },
  quoteSource: {
    fontSize: FONT_SIZES.sm,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
});
