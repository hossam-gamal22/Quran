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
import { useColors } from '../../hooks/use-colors';
import { getPageSurah, getKhatmaStats } from '../../lib/khatma-storage';
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

export default function WirdScreen() {
  const router = useRouter();
  const colors = useColors();
  const {
    activeKhatma,
    getTodayWirdInfo,
    getActiveKhatmaStats,
    completeTodayWird,
    recordProgress,
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
      'إتمام الورد',
      'هل أكملت قراءة ورد اليوم؟',
      [
        { text: 'لا', style: 'cancel' },
        {
          text: 'نعم، أكملته',
          onPress: async () => {
            setIsCompleting(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            
            const success = await completeTodayWird();
            
            if (success) {
              Alert.alert(
                'بارك الله فيك! 🎉',
                'تم تسجيل إتمام ورد اليوم. استمر على هذا النهج!',
                [{ text: 'حسناً' }]
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

  // Handle open Quran at page
  const handleOpenPage = useCallback((pageNumber: number) => {
    // Navigate to Quran page (you'll need to implement this route)
    // For now, we'll navigate to the surah that contains this page
    router.push(`/surah/1`); // This should be updated to open specific page
  }, [router]);

  // No active khatma
  if (!activeKhatma) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyContainer}>
          <Ionicons name="book-outline" size={80} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            لا توجد ختمة نشطة
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            ابدأ ختمة جديدة لتحديد وردك اليومي
          </Text>
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/khatma/new')}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.startButtonText}>ابدأ ختمة جديدة</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Khatma completed
  if (activeKhatma.isCompleted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyContainer}>
          <Ionicons name="trophy" size={80} color={colors.success} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            مبارك! أتممت الختمة 🎉
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            بارك الله فيك وجعله في ميزان حسناتك
          </Text>
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/khatma/new')}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.startButtonText}>ابدأ ختمة جديدة</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-forward" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: colors.text }]}>الورد اليومي</Text>
        
        <TouchableOpacity
          onPress={() => router.push('/khatma')}
          style={styles.khatmasButton}
        >
          <Ionicons name="list" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

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
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
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
            <Text style={[styles.progressText, { color: colors.text }]}>
              {toArabicNumber(stats?.progressPercentage || 0)}٪
            </Text>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {toArabicNumber(stats?.pagesRead || 0)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                صفحة مقروءة
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {toArabicNumber(stats?.pagesRemaining || 0)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                صفحة متبقية
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {toArabicNumber(stats?.daysRemaining || 0)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                يوم متبقي
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Today's Wird */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              ورد اليوم
            </Text>
            {wirdInfo?.isCompleted && (
              <View style={[styles.completedBadge, { backgroundColor: colors.success }]}>
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                <Text style={styles.completedBadgeText}>مكتمل</Text>
              </View>
            )}
          </View>

          {/* Wird Summary */}
          <GlassCard style={styles.wirdSummary}>
            <View style={styles.wirdRow}>
              <View style={styles.wirdItem}>
                <Ionicons name="flag-outline" size={24} color={colors.primary} />
                <Text style={[styles.wirdLabel, { color: colors.textSecondary }]}>من</Text>
                <Text style={[styles.wirdValue, { color: colors.text }]}>
                  صفحة {toArabicNumber(wirdInfo?.startPage || 1)}
                </Text>
              </View>
              
              <Ionicons name="arrow-back" size={24} color={colors.textSecondary} />
              
              <View style={styles.wirdItem}>
                <Ionicons name="flag" size={24} color={colors.success} />
                <Text style={[styles.wirdLabel, { color: colors.textSecondary }]}>إلى</Text>
                <Text style={[styles.wirdValue, { color: colors.text }]}>
                  صفحة {toArabicNumber(wirdInfo?.endPage || 1)}
                </Text>
              </View>
            </View>
            
            <View style={[styles.wirdTotal, { backgroundColor: colors.card }]}>
              <Text style={[styles.wirdTotalLabel, { color: colors.textSecondary }]}>
                إجمالي الورد:
              </Text>
              <Text style={[styles.wirdTotalValue, { color: colors.primary }]}>
                {toArabicNumber(activeKhatma.pagesPerDay)} صفحة
              </Text>
            </View>
          </GlassCard>

          {/* Pages List */}
          <Text style={[styles.pagesTitle, { color: colors.text }]}>
            الصفحات
          </Text>
          <View style={styles.pagesList}>
            {pagesList.map((page) => (
              <TouchableOpacity
                key={page.number}
                style={[styles.pageItem, { backgroundColor: colors.card }]}
                onPress={() => handleOpenPage(page.number)}
              >
                <View style={[styles.pageNumber, { backgroundColor: colors.primary + '15' }]}>
                  <Text style={[styles.pageNumberText, { color: colors.primary }]}>
                    {toArabicNumber(page.number)}
                  </Text>
                </View>
                <Text style={[styles.pageSurah, { color: colors.text }]}>
                  {page.surah}
                </Text>
                <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Motivational Quote */}
        <GlassCard style={styles.quoteCard}>
          <Ionicons name="heart" size={24} color={colors.error} />
          <Text style={[styles.quoteText, { color: colors.text }]}>
            "خيركم من تعلم القرآن وعلمه"
          </Text>
          <Text style={[styles.quoteSource, { color: colors.textSecondary }]}>
            رواه البخاري
          </Text>
        </GlassCard>

        {/* Bottom Spacing */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Complete Button */}
      {!wirdInfo?.isCompleted && (
        <View style={[styles.bottomBar, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[styles.completeButton, { backgroundColor: colors.primary }]}
            onPress={handleCompleteWird}
            disabled={isCompleting}
          >
            {isCompleting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                <Text style={styles.completeButtonText}>أكملت ورد اليوم</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
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
  khatmasButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
    textAlign: 'right',
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
    gap: 4,
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
  },
  pageNumber: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.md,
  },
  pageNumberText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  pageSurah: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    textAlign: 'right',
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
