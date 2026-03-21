import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useKhatma } from '../../contexts/KhatmaContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useColors } from '../../hooks/use-colors';
import { getKhatmaStats, getPageSurah, Khatma } from '../../lib/khatma-storage';
import GlassCard from '../../components/ui/GlassCard';
import { UniversalHeader } from '@/components/ui';
import { SectionInfoButton } from '@/components/ui/SectionInfoButton';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { fontBold } from '@/lib/fonts';
import {
  Spacing,
  BorderRadius,
  FONT_SIZES,
} from '../../constants/theme';
import { localizeNumber as toArabicNumber } from '@/lib/format-number';

export default function KhatmaListScreen() {
  const router = useRouter();
  const colors = useColors();
  const { settings, t } = useSettings();
  const isRTL = useIsRTL();
  const {
    khatmas,
    activeKhatma,
    isLoading,
    setActiveKhatma,
    deleteKhatma,
  } = useKhatma();

  // Handle delete khatma
  const handleDelete = useCallback(
    (khatma: Khatma) => {
      Alert.alert(
        t('khatma.deleteKhatma'),
        t('khatma.deleteConfirm'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: async () => {
              await deleteKhatma(khatma.id);
            },
          },
        ]
      );
    },
    [deleteKhatma]
  );

  // Handle set active
  const handleSetActive = useCallback(
    async (khatma: Khatma) => {
      await setActiveKhatma(khatma.id);
    },
    [setActiveKhatma]
  );

  // Handle options menu for a khatma
  const handleOptions = useCallback(
    (khatma: Khatma) => {
      const isActive = activeKhatma?.id === khatma.id;
      const options = [
        ...(isActive ? [] : [t('khatma.setAsActive')]),
        t('khatma.editReminder'),
        t('khatma.deleteKhatma'),
        t('common.cancel'),
      ];
      const destructiveIndex = options.indexOf(t('khatma.deleteKhatma'));
      const cancelIndex = options.indexOf(t('common.cancel'));

      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options,
            destructiveButtonIndex: destructiveIndex,
            cancelButtonIndex: cancelIndex,
            title: khatma.name,
          },
          (buttonIndex) => {
            const selected = options[buttonIndex];
            if (selected === t('khatma.setAsActive')) handleSetActive(khatma);
            else if (selected === t('khatma.editReminder')) {
              router.push(`/khatma/new?editReminder=${khatma.id}`);
            }
            else if (selected === t('khatma.deleteKhatma')) handleDelete(khatma);
          }
        );
      } else {
        Alert.alert(
          khatma.name,
          t('khatma.chooseAction'),
          [
            ...(isActive ? [] : [{ text: t('khatma.setAsActive'), onPress: () => handleSetActive(khatma) }]),
            {
              text: t('khatma.editReminder'),
              onPress: () => router.push(`/khatma/new?editReminder=${khatma.id}`),
            },
            { text: t('khatma.deleteKhatma'), style: 'destructive' as const, onPress: () => handleDelete(khatma) },
            { text: t('common.cancel'), style: 'cancel' as const },
          ]
        );
      }
    },
    [activeKhatma, handleSetActive, handleDelete, router]
  );

  // Render khatma card
  const renderKhatmaCard = useCallback(
    ({ item }: { item: Khatma }) => {
      const stats = getKhatmaStats(item);
      const isActive = activeKhatma?.id === item.id;
      const currentSurah = getPageSurah(item.currentPage);

      return (
        <TouchableOpacity
          onPress={() => handleSetActive(item)}
          onLongPress={() => handleOptions(item)}
          delayLongPress={500}
          activeOpacity={0.8}
        >
          <GlassCard
            style={[
              styles.khatmaCard,
              isActive && { borderColor: colors.primary, borderWidth: 2 },
            ]}
          >
            {/* Header */}
            <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.cardTitleRow}>
                <Text style={[styles.khatmaName, { color: colors.text }]}>
                  {item.name}
                </Text>
                {isActive && (
                  <View style={[styles.activeBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.activeBadgeText}>{t('khatma.active')}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                onPress={() => handleOptions(item)}
                hitSlop={12}
                style={styles.optionsBtn}
              >
                <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
              
            {item.isCompleted && (
              <View style={[styles.completedBadge, { backgroundColor: colors.success, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                <Text style={styles.completedText}>{t('khatma.completed')}</Text>
              </View>
            )}

            {/* Progress Bar */}
            <View style={styles.progressSection}>
              <View style={[styles.progressBar, { backgroundColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: item.isCompleted ? colors.success : colors.primary,
                      width: `${stats.progressPercentage}%`,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressText, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                {toArabicNumber(stats.progressPercentage)}٪
              </Text>
            </View>

            {/* Stats */}
            <View style={[styles.statsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.statItem}>
                <Ionicons name="document-text-outline" size={18} color={colors.primary} />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {toArabicNumber(stats.pagesRead)}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  {t('khatma.pageUnit')}
                </Text>
              </View>

              <View style={styles.statItem}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {toArabicNumber(stats.daysRemaining)}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  {t('khatma.daysLeft')}
                </Text>
              </View>

              <View style={styles.statItem}>
                <Ionicons name="book-outline" size={18} color={colors.primary} />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {toArabicNumber(item.pagesPerDay)}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  {t('khatma.pagesPerDayLabel')}
                </Text>
              </View>
            </View>

            {/* Current Position */}
            <View style={[styles.currentPosition, { backgroundColor: colors.card }]}>
              <Text style={[styles.positionLabel, { color: colors.textSecondary }]}>
                {t('khatma.currentPosition')}
              </Text>
              <Text style={[styles.positionValue, { color: colors.text }]}>
                {t('khatma.pageUnit')} {toArabicNumber(item.currentPage)} - {currentSurah}
              </Text>
            </View>

            {/* Status Indicator */}
            {!item.isCompleted && (
              <View style={[styles.statusRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons
                  name={stats.isOnTrack ? 'checkmark-circle' : 'warning'}
                  size={16}
                  color={stats.isOnTrack ? colors.success : colors.warning}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: stats.isOnTrack ? colors.success : colors.warning },
                  ]}
                >
                  {stats.isOnTrack ? t('khatma.onTrack') : t('khatma.behindSchedule')}
                </Text>
              </View>
            )}
          </GlassCard>
        </TouchableOpacity>
      );
    },
    [activeKhatma, colors, handleSetActive, handleDelete]
  );

  // Loading state
  if (isLoading) {
    return (
      <BackgroundWrapper backgroundKey={settings.display.appBackground} backgroundUrl={settings.display.appBackgroundUrl} opacity={settings.display.backgroundOpacity ?? 1} style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {t('khatma.loading')}
          </Text>
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
        titleColor={colors.text}
        onBack={() => router.back()}
        showBack
        rightActions={[{
          icon: 'plus',
          onPress: () => router.push('/khatma/new'),
          color: '#FFFFFF',
          size: 24,
          style: { backgroundColor: '#22C55E', borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
        }]}
      >
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 18, fontFamily: fontBold(), color: colors.text }} numberOfLines={1}>{t('khatma.myKhatmas')}</Text>
          <SectionInfoButton sectionKey="quran_surahs" />
        </View>
      </UniversalHeader>

      {/* Khatmas List */}
      {khatmas.length > 0 ? (
        <FlatList
          data={khatmas}
          renderItem={renderKhatmaCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="book-outline" size={80} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {t('khatma.noKhatmas')}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {t('khatma.noKhatmasDesc')}
          </Text>
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: '#22C55E', flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={() => router.push('/khatma/new')}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.startButtonText}>{t('khatma.startNewKhatma')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Floating Action Button for Active Khatma */}
      {activeKhatma && !activeKhatma.isCompleted && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: '#22C55E', flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={() => router.push('/khatma/wird')}
        >
          <Ionicons name="book" size={24} color="#FFFFFF" />
          <Text style={styles.fabText}>{t('khatma.dailyWird')}</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FONT_SIZES.md,
  },

  listContent: {
    padding: Spacing.lg,
    paddingBottom: 120,
  },
  khatmaCard: {
    padding: Spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  optionsBtn: {
    padding: 4,
  },
  khatmaName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  activeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  activeBadgeText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  completedText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  progressText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    minWidth: 40,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.md,
  },
  statItem: {
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
  },
  currentPosition: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  positionLabel: {
    fontSize: FONT_SIZES.sm,
  },
  positionValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  statusText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
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
  fab: {
    position: 'absolute',
    bottom: Spacing.xl,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)',
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
});
