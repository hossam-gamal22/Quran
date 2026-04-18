// app/honor-board.tsx
// لوحة الشرف — عرض الفائزين الشهريين ورتبة المستخدم

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { fontBold, fontRegular, fontSemiBold } from '@/lib/fonts';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { useSettings } from '@/contexts/SettingsContext';
import { GlassCard } from '@/components/ui';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchRewardsConfig, getUserMonthlyInfo, getMonthlyLeaderboard, syncPendingScores, setMonthlyEngagement, detectRankChange, checkAndCelebrateWinner, DEFAULT_WEIGHTS } from '@/lib/rewards-manager';
import { getUserId, getDisplayName } from '@/lib/firebase-user';
import type { RewardsConfig } from '@/types/rewards';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { BackButton } from '@/components/ui';
import { useRouter } from 'expo-router';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { useCelebration } from '@/contexts/CelebrationContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { showOfflineModal } from '@/components/ui/OfflineBanner';
import NetInfo from '@react-native-community/netinfo';
import { getMonthPrayerRecords, getAllQuranRecords, getAllAzkarRecords, formatDate, getMonthlyActivityStats } from '@/lib/worship-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MEDAL_STYLES = (isDark: boolean) => [
  { icon: 'trophy' as const, color: isDark ? '#FFD700' : '#B8860B', bg: isDark ? 'rgba(255,215,0,0.15)' : 'rgba(184,134,11,0.15)' },
  { icon: 'medal' as const, color: '#C0C0C0', bg: 'rgba(192,192,192,0.15)' },
  { icon: 'medal' as const, color: '#CD7F32', bg: 'rgba(205,127,50,0.15)' },
];

export default function HonorBoard() {
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const { isDarkMode } = colors;
  const { t, settings } = useSettings();
  const isRTL = useIsRTL();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showCelebration } = useCelebration();
  const { isPremium } = useSubscription();
  const [config, setConfig] = useState<RewardsConfig | null>(null);
  const [userScore, setUserScore] = useState<number>(0);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [monthlyActivities, setMonthlyActivities] = useState<Record<string, number>>({});
  const [leaderboard, setLeaderboard] = useState<Array<{ userId: string; displayName: string; score: number }>>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [hasDisplayName, setHasDisplayName] = useState(true);
  const isArabic = (settings.language || 'ar') === 'ar';

  useEffect(() => {
    loadData();
  }, []);

  /**
   * Compute actual activities from worship storage (source of truth)
   * This supplements the rewards tracking pipeline which can miss activities
   */
  const getActualActivitiesFromWorship = async (): Promise<Record<string, number>> => {
    const stats = await getMonthlyActivityStats();
    return {
      prayer: stats.prayers,
      quran: stats.quranPages,
      tasbih: stats.tasbih,
      azkar: stats.azkar,
    };
  };

  const loadData = async () => {
    // Wrap Firestore work with a hard timeout so the screen never hangs
    // forever on flaky / offline networks.
    const timeoutMs = 15000;
    const withTimeout = <T,>(p: Promise<T>): Promise<T> =>
      Promise.race([
        p,
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error('honor-board-timeout')), timeoutMs),
        ),
      ]);
    try {
      const [rewardsConfig, userId] = await withTimeout(Promise.all([
        fetchRewardsConfig(),
        getUserId(),
      ]));
      setConfig(rewardsConfig);

      // Sync any pending local scores to Firestore before reading
      if (userId) {
        await syncPendingScores(userId).catch(() => {});
      }

      // Fetch leaderboard (now includes just-synced scores)
      const board = await withTimeout(getMonthlyLeaderboard(20));
      setLeaderboard(board);

      if (userId) {
        setCurrentUserId(userId);
        const [info, worshipActivities, userName] = await Promise.all([
          getUserMonthlyInfo(userId),
          getActualActivitiesFromWorship(),
          getDisplayName(),
        ]);
        setHasDisplayName(!!userName && userName.trim().length > 0);

        // Worship storage is the SINGLE SOURCE OF TRUTH for all activities
        // Firestore tracking only used for activities without worship storage (app_open)
        const tracked = info?.activities || {};
        const merged: Record<string, number> = {};

        // Start with Firestore data for non-worship activities (app_open, khatma)
        for (const [key, count] of Object.entries(tracked)) {
          if (!(key in worshipActivities)) {
            merged[key] = count;
          }
        }

        // Override with worship storage data (source of truth)
        for (const [key, worshipCount] of Object.entries(worshipActivities)) {
          merged[key] = worshipCount;
        }

        // Recalculate score from merged activities
        const weights = rewardsConfig.scoreWeights || DEFAULT_WEIGHTS;
        let totalScore = 0;
        for (const [key, count] of Object.entries(merged)) {
          totalScore += count * (weights[key as keyof typeof weights] || 1);
        }

        setMonthlyActivities(merged);
        setUserScore(totalScore);

        // Overwrite Firestore with recalculated truth so leaderboard matches
        setMonthlyEngagement(userId, merged, totalScore).then(() => {
          // Patch local leaderboard state so UI is consistent immediately
          setLeaderboard(prev => prev.map(u =>
            u.userId === userId ? { ...u, score: totalScore } : u
          ));
        }).catch(() => {});

        if (info) {
          // Calculate rank from leaderboard
          const rankIndex = board.findIndex(u => u.userId === userId);
          if (rankIndex >= 0) {
            setUserRank(rankIndex + 1);
          }

          // Check for rank advancement celebration
          const rankResult = await detectRankChange(userId, board);
          if (rankResult.improved && rankResult.oldRank && rankResult.newRank) {
            showCelebration({
              type: 'rank_up',
              title: t('celebration.rankUp'),
              subtitle: t('celebration.rankUpDetail', { old: String(rankResult.oldRank), new: String(rankResult.newRank) }),
            });
          }

          // Check for monthly winner celebration
          const isNewWinner = await checkAndCelebrateWinner(userId);
          if (isNewWinner) {
            // Delay slightly if rank celebration also fired — avoid overlap
            setTimeout(() => {
              showCelebration({
                type: 'monthly_winner',
                title: t('celebration.monthlyWinner'),
                subtitle: t('celebration.monthlyWinnerDetail'),
              });
            }, rankResult.improved ? 6000 : 0);
          }
        }
      }
    } catch {
      setLoadError(true);
      const netState = await NetInfo.fetch().catch(() => ({ isConnected: null, isInternetReachable: null }));
      if (!(netState.isConnected && netState.isInternetReachable !== false)) {
        showOfflineModal();
      }
    } finally {
      setLoading(false);
    }
  };

  const getDaysRemaining = () => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return lastDay.getDate() - now.getDate();
  };

  const bgColor = settings.display.appBackground !== 'none' ? 'transparent' : colors.background;

  if (loading) {
    return (
      <BackgroundWrapper style={{ flex: 1 }}>
        <View style={[styles.container, { backgroundColor: bgColor }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </BackgroundWrapper>
    );
  }

  if (loadError) {
    return (
      <BackgroundWrapper style={{ flex: 1 }}>
        <View style={[styles.container, { backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center' }]}>
          <MaterialCommunityIcons name="wifi-off" size={64} color={colors.muted} />
          <Text style={[styles.emptyText, { color: colors.muted, marginTop: 16 }]}>
            {isArabic ? 'تعذّر تحميل لوحة الشرف' : 'Failed to load honor board'}
          </Text>
          <Text style={[styles.emptyText, { color: colors.muted, fontSize: 14, marginTop: 8 }]}>
            {isArabic ? 'تحقق من اتصالك بالإنترنت' : 'Check your internet connection'}
          </Text>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 12, marginTop: 20 }}>
            <Text
              onPress={() => { setLoadError(false); setLoading(true); loadData(); }}
              style={{ color: colors.primary, fontFamily: fontSemiBold(), fontSize: 16, paddingVertical: 8, paddingHorizontal: 16 }}
            >
              {isArabic ? 'إعادة محاولة' : 'Retry'}
            </Text>
            <Text
              onPress={() => router.back()}
              style={{ color: colors.muted, fontFamily: fontRegular(), fontSize: 16, paddingVertical: 8, paddingHorizontal: 16 }}
            >
              {isArabic ? 'الرجوع' : 'Go Back'}
            </Text>
          </View>
        </View>
      </BackgroundWrapper>
    );
  }

  if (!config?.enabled) {
    return (
      <BackgroundWrapper style={{ flex: 1 }}>
        <View style={[styles.container, { backgroundColor: bgColor }]}>
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="trophy-outline" size={64} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              {t('honor.rewardsDisabled')}
            </Text>
          </View>
        </View>
      </BackgroundWrapper>
    );
  }

  return (
    <BackgroundWrapper style={{ flex: 1 }}>
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
    <ScrollView 
      style={[styles.container, { backgroundColor: bgColor }]}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View style={styles.content}>
        {/* Back Button */}
        <View style={[styles.backRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <BackButton color={colors.text} style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', borderRadius: 20, width: 40, height: 40 }} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.trophyCircle, { backgroundColor: isDarkMode ? 'rgba(245,158,11,0.12)' : 'rgba(181,114,0,0.1)' }]}>
            <MaterialCommunityIcons name="trophy" size={44} color={isDarkMode ? '#f59e0b' : '#B57200'} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{t('honor.title')}</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            {t('honor.activeUsersGetPremium', { count: config.winnersCount })}
          </Text>
        </View>

        {/* Countdown */}
        <GlassCard style={styles.countdownCard}>
          <View style={[styles.countdownInner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <MaterialCommunityIcons name="clock-outline" size={20} color={isDarkMode ? '#f59e0b' : '#B57200'} />
            <Text style={[styles.countdownText, { color: colors.text }]}>
              {getDaysRemaining()} {t('honor.daysRemaining')}
            </Text>
          </View>
        </GlassCard>

        {/* Your Score */}
        <GlassCard style={styles.scoreCard}>
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign: 'center' }]}>{t('honor.yourMonthlyPoints')}</Text>
          <View style={[styles.scoreRing, { borderColor: isDarkMode ? 'rgba(245,158,11,0.2)' : 'rgba(181,114,0,0.15)' }]}>
            <Text style={[styles.scoreNumber, { color: isDarkMode ? '#f59e0b' : '#B57200' }]}>{userScore}</Text>
            <Text style={[styles.scoreLabel, { color: colors.muted }]}>{t('honor.points')}</Text>
          </View>
          {userRank ? (
            <View style={[styles.rankBadge, { backgroundColor: isDarkMode ? 'rgba(245,158,11,0.1)' : 'rgba(181,114,0,0.08)', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <MaterialCommunityIcons name="podium" size={16} color={isDarkMode ? '#f59e0b' : '#B57200'} />
              <Text style={[styles.rankText, { color: isDarkMode ? '#f59e0b' : '#B57200' }]}>
                {isArabic ? `ترتيبك: #${userRank}` : `Your Rank: #${userRank}`}
              </Text>
            </View>
          ) : userScore > 0 ? (
            <View style={[styles.rankBadge, { backgroundColor: isDarkMode ? 'rgba(245,158,11,0.1)' : 'rgba(181,114,0,0.08)', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <MaterialCommunityIcons name="star-four-points" size={16} color={isDarkMode ? '#f59e0b' : '#B57200'} />
              <Text style={[styles.rankText, { color: isDarkMode ? '#f59e0b' : '#B57200' }]}>
                {isArabic ? 'استمر لتتصدر القائمة!' : 'Keep going to top the list!'}
              </Text>
            </View>
          ) : null}
        </GlassCard>

        {/* Activity Breakdown — Monthly */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {isArabic ? 'نشاطاتك هذا الشهر' : 'Your Activities This Month'}
          </Text>
          <GlassCard style={styles.activitiesCard}>
            {(() => {
              const ACTIVITY_ROWS = [
                { key: 'quran', icon: 'book-open-variant' as const, labelAr: 'صفحات القرآن', labelEn: 'Quran Pages', weightKey: 'quran' as const },
                { key: 'prayer', icon: 'mosque' as const, labelAr: 'الصلوات', labelEn: 'Prayers', weightKey: 'prayer' as const },
                { key: 'azkar', icon: 'hand-heart' as const, labelAr: 'الأذكار', labelEn: 'Adhkar', weightKey: 'azkar' as const },
                { key: 'tasbih', icon: 'counter' as const, labelAr: 'التسبيح', labelEn: 'Tasbih', weightKey: 'tasbih' as const },
                { key: 'app_open', icon: 'cellphone' as const, labelAr: 'فتح التطبيق', labelEn: 'App Opens', weightKey: 'app_open' as const },
              ];
              const weights = config?.scoreWeights || DEFAULT_WEIGHTS;
              return (
                <>
                  {ACTIVITY_ROWS.map((item, i) => {
                    const weight = weights[item.weightKey] || DEFAULT_WEIGHTS[item.weightKey] || 1;
                    const count = monthlyActivities[item.key] || 0;
                    const pts = count * weight;
                    return (
                      <View key={item.key}>
                        <View style={[styles.activityRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                          <View style={[styles.activityIconBg, { backgroundColor: isDarkMode ? 'rgba(245,158,11,0.1)' : 'rgba(181,114,0,0.08)' }]}>
                            <MaterialCommunityIcons name={item.icon} size={18} color={isDarkMode ? '#f59e0b' : '#B57200'} />
                          </View>
                          <View style={[styles.activityInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                            <Text style={[styles.activityLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
                              {isArabic ? item.labelAr : item.labelEn}
                            </Text>
                            <Text style={[styles.activityCount, { color: colors.muted, textAlign: isRTL ? 'right' : 'left' }]}>
                              {count} × {weight} = {pts} {isArabic ? 'نقطة' : 'pts'}
                            </Text>
                          </View>
                          <View style={[styles.activityPointsBadge, { backgroundColor: isDarkMode ? 'rgba(245,158,11,0.12)' : 'rgba(181,114,0,0.08)' }]}>
                            <Text style={[styles.activityPointsText, { color: isDarkMode ? '#f59e0b' : '#B57200' }]}>
                              {pts}
                            </Text>
                          </View>
                        </View>
                        <View style={[styles.faqSeparator, { backgroundColor: colors.border }]} />
                      </View>
                    );
                  })}

                </>
              );
            })()}
          </GlassCard>
        </View>

        {/* Points System — Clear table */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {isArabic ? 'نظام النقاط' : 'Points System'}
          </Text>
          <GlassCard style={styles.activitiesCard}>
            {[
              { icon: 'book-open-variant' as const, labelAr: 'قراءة صفحة قرآن', labelEn: 'Read a Quran page', weightKey: 'quran' as const },
              { icon: 'mosque' as const, labelAr: 'تسجيل صلاة', labelEn: 'Log a prayer', weightKey: 'prayer' as const },
              { icon: 'hand-heart' as const, labelAr: 'قراءة ذكر', labelEn: 'Read a dhikr', weightKey: 'azkar' as const },
              { icon: 'counter' as const, labelAr: 'جولة تسبيح', labelEn: 'Tasbih round', weightKey: 'tasbih' as const },
              { icon: 'cellphone' as const, labelAr: 'فتح التطبيق يومياً', labelEn: 'Open app daily', weightKey: 'app_open' as const },
            ].map((item, i, arr) => {
              const weight = (config?.scoreWeights || DEFAULT_WEIGHTS)[item.weightKey] || DEFAULT_WEIGHTS[item.weightKey] || 1;
              return (
                <View key={item.weightKey}>
                  <View style={[styles.activityRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={[styles.activityIconBg, { backgroundColor: isDarkMode ? 'rgba(245,158,11,0.1)' : 'rgba(181,114,0,0.08)' }]}>
                      <MaterialCommunityIcons name={item.icon} size={18} color={isDarkMode ? '#f59e0b' : '#B57200'} />
                    </View>
                    <Text style={[styles.faqText, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                      {isArabic ? item.labelAr : item.labelEn}
                    </Text>
                    <View style={[styles.pointsBadge, { backgroundColor: isDarkMode ? 'rgba(245,158,11,0.12)' : 'rgba(181,114,0,0.08)' }]}>
                      <Text style={[styles.pointsBadgeText, { color: isDarkMode ? '#f59e0b' : '#B57200' }]}>+{weight}</Text>
                    </View>
                  </View>
                  {i < arr.length - 1 && <View style={[styles.faqSeparator, { backgroundColor: colors.border }]} />}
                </View>
              );
            })}
            {/* Summary note */}
            <View style={[styles.systemNote, { backgroundColor: isDarkMode ? 'rgba(245,158,11,0.05)' : 'rgba(181,114,0,0.04)' }]}>
              <MaterialCommunityIcons name="information-outline" size={16} color={isDarkMode ? '#f59e0b' : '#B57200'} />
              <Text style={[styles.systemNoteText, { color: colors.muted, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {isArabic
                  ? 'النقاط تُحسب تلقائياً عند كل نشاط. أكثر ٣ مستخدمين نشاطاً يحصلون على اشتراك مميز مجاني نهاية كل شهر.'
                  : 'Points are calculated automatically with each activity. The top 3 most active users win free premium at the end of each month.'}
              </Text>
            </View>
          </GlassCard>
        </View>

        {/* Leaderboard — All active users this month */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {isArabic ? 'ترتيب المتسابقين' : 'Leaderboard'}
          </Text>
          {/* Note: users must set their name to appear */}
          {!hasDisplayName && (
            <GlassCard style={[styles.nameWarningCard, { marginBottom: 12 }]}>
              <View style={[styles.nameWarningInner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <MaterialCommunityIcons name="alert-circle-outline" size={20} color={isDarkMode ? '#f59e0b' : '#B57200'} />
                <Text style={[styles.nameWarningText, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                  {isArabic
                    ? 'يجب إضافة اسمك في الإعدادات حتى تظهر في لوحة الشرف'
                    : 'You must set your name in Settings to appear on the honor board'}
                </Text>
              </View>
              <Text
                onPress={() => router.push('/(tabs)/settings')}
                style={[styles.nameWarningLink, { color: isDarkMode ? '#f59e0b' : '#B57200', textAlign: isRTL ? 'right' : 'left' }]}
              >
                {isArabic ? 'اذهب للإعدادات ←' : '→ Go to Settings'}
              </Text>
            </GlassCard>
          )}

          {leaderboard.length > 0 ? (
            <GlassCard style={styles.activitiesCard}>
              {leaderboard.map((user, i) => {
                const isCurrentUser = user.userId === currentUserId;
                const medals = MEDAL_STYLES(isDarkMode);
                const isTop3 = i < 3;
                return (
                  <View key={user.userId}>
                    <View style={[
                      styles.leaderboardRow,
                      { flexDirection: isRTL ? 'row-reverse' : 'row' },
                      isCurrentUser && { backgroundColor: isDarkMode ? 'rgba(245,158,11,0.08)' : 'rgba(181,114,0,0.05)', borderRadius: 12, marginHorizontal: -8, paddingHorizontal: 8 },
                    ]}>
                      {/* Rank — trophy/medal for top 3, number for rest */}
                      {isTop3 ? (
                        <View style={[styles.medalCircle, { backgroundColor: medals[i].bg }]}>
                          <MaterialCommunityIcons name={medals[i].icon} size={20} color={medals[i].color} />
                        </View>
                      ) : (
                        <View style={[styles.rankCircle, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                          <Text style={[styles.rankNumber, { color: isCurrentUser ? (isDarkMode ? '#f59e0b' : '#B57200') : colors.muted }]}>#{i + 1}</Text>
                        </View>
                      )}
                      {/* Name */}
                      <View style={[styles.winnerInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.leaderboardName, { color: isCurrentUser ? (isDarkMode ? '#f59e0b' : '#B57200') : colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                            {user.displayName}
                          </Text>
                          {isCurrentUser && isPremium && (
                            <MaterialCommunityIcons name="crown" size={16} color={isDarkMode ? '#FFD700' : '#B8860B'} />
                          )}
                          {isCurrentUser && (
                            <Text style={[styles.youBadge, { color: isDarkMode ? '#f59e0b' : '#B57200' }]}>
                              {isArabic ? '(أنت)' : '(You)'}
                            </Text>
                          )}
                        </View>
                      </View>
                      {/* Score */}
                      <View style={[styles.activityPointsBadge, { backgroundColor: isDarkMode ? 'rgba(245,158,11,0.12)' : 'rgba(181,114,0,0.08)' }]}>
                        <Text style={[styles.activityPointsText, { color: isDarkMode ? '#f59e0b' : '#B57200' }]}>
                          {user.score}
                        </Text>
                      </View>
                    </View>
                    {i < leaderboard.length - 1 && <View style={[styles.faqSeparator, { backgroundColor: colors.border }]} />}
                  </View>
                );
              })}
            </GlassCard>
          ) : (
            <GlassCard style={styles.emptyWinnersCard}>
              <View style={styles.emptyWinnersContent}>
                <MaterialCommunityIcons name="account-group-outline" size={40} color={isDarkMode ? 'rgba(245,158,11,0.4)' : 'rgba(181,114,0,0.3)'} />
                <Text style={[styles.emptyWinnersTitle, { color: colors.text }]}>
                  {isArabic ? 'لا يوجد متسابقين بعد' : 'No competitors yet'}
                </Text>
                <Text style={[styles.emptyWinnersDesc, { color: colors.muted }]}>
                  {isArabic
                    ? 'كن أول من يجمع النقاط هذا الشهر! استخدم التطبيق يومياً لتتصدر القائمة'
                    : 'Be the first to earn points this month! Use the app daily to top the list'}
                </Text>
              </View>
            </GlassCard>
          )}
        </View>

        {/* Previous Winners */}
        {config.currentWinners.filter(w => w.displayName && w.displayName.toLowerCase() !== 'fallback').length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {isArabic ? 'فائزو الشهر الماضي 🏆' : 'Last Month Winners 🏆'}
            </Text>
            {config.currentWinners.filter(w => w.displayName && w.displayName.toLowerCase() !== 'fallback').map((winner, i) => {
                const medals = MEDAL_STYLES(isDarkMode);
                const isTop3 = i < 3;
                return (
                <GlassCard key={winner.userId} style={styles.winnerCard}>
                  <View style={[styles.winnerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    {isTop3 ? (
                      <View style={[styles.medalCircle, { backgroundColor: medals[i].bg }]}>
                        <MaterialCommunityIcons name={medals[i].icon} size={20} color={medals[i].color} />
                      </View>
                    ) : (
                      <View style={[styles.rankCircle, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                        <Text style={[styles.rankNumber, { color: colors.muted }]}>#{i + 1}</Text>
                      </View>
                    )}
                    <View style={[styles.winnerInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                      <Text style={[styles.winnerName, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                        {winner.displayName}
                      </Text>
                      <Text style={[styles.winnerScore, { color: colors.muted, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                        {winner.score} {t('honor.points')}
                      </Text>
                    </View>
                    <View style={[styles.premiumBadge, { backgroundColor: isDarkMode ? '#f59e0b20' : '#B5720020' }]}>
                      <Text style={[styles.premiumBadgeText, { color: isDarkMode ? '#f59e0b' : '#B57200' }]}>{t('honor.premium')}</Text>
                    </View>
                  </View>
                </GlassCard>
              );})}

          </View>
        )}
      </View>
    </ScrollView>
    </SafeAreaView>
    </BackgroundWrapper>
  );
}

const _styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  backRow: {
    marginBottom: 4,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 16,
  },
  trophyCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontFamily: fontBold(),
    textAlign: 'center',
    lineHeight: 38,
    includeFontPadding: false,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fontRegular(),
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 24,
    includeFontPadding: false,
  },
  countdownCard: {
    marginBottom: 12,
  },
  countdownInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
  },
  countdownText: {
    fontSize: 15,
    fontFamily: fontSemiBold(),
    lineHeight: 26,
    includeFontPadding: false,
  },
  scoreCard: {
    alignItems: 'center',
    padding: 20,
    marginBottom: 20,
  },
  scoreRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 12,
  },
  scoreNumber: {
    fontSize: 42,
    fontFamily: fontBold(),
    lineHeight: 52,
    includeFontPadding: false,
  },
  scoreLabel: {
    fontSize: 14,
    fontFamily: fontRegular(),
    lineHeight: 24,
    includeFontPadding: false,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: fontBold(),
    marginBottom: 10,
    lineHeight: 28,
    includeFontPadding: false,
  },
  winnerCard: {
    marginBottom: 8,
    padding: 16,
  },
  winnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  winnerInfo: {
    flex: 1,
  },
  medalCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  winnerName: {
    fontSize: 15,
    fontFamily: fontSemiBold(),
    lineHeight: 26,
    includeFontPadding: false,
  },
  winnerScore: {
    fontSize: 13,
    fontFamily: fontRegular(),
    lineHeight: 22,
    includeFontPadding: false,
  },
  premiumBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  premiumBadgeText: {
    fontSize: 12,
    fontFamily: fontSemiBold(),
    // color set inline based on isDarkMode
    lineHeight: 20,
    includeFontPadding: false,
  },
  faqCard: {
    padding: 16,
  },
  faqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  faqIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqSeparator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 4,
  },
  faqText: {
    flex: 1,
    fontSize: 14,
    fontFamily: fontRegular(),
    lineHeight: 24,
    includeFontPadding: false,
  },
  pointsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  pointsBadgeText: {
    fontSize: 13,
    fontFamily: fontBold(),
    lineHeight: 20,
    includeFontPadding: false,
  },
  faqDetail: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
    marginTop: 2,
  },
  faqDetailText: {
    fontSize: 13,
    fontFamily: fontRegular(),
    lineHeight: 22,
    includeFontPadding: false,
  },
  faqDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  faqDetailPoints: {
    fontSize: 13,
    fontFamily: fontSemiBold(),
    lineHeight: 20,
    includeFontPadding: false,
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    marginTop: 14,
  },
  rankText: {
    fontSize: 14,
    fontFamily: fontSemiBold(),
    lineHeight: 22,
    includeFontPadding: false,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: fontRegular(),
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 28,
    includeFontPadding: false,
  },
  activitiesCard: {
    padding: 16,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  activityIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityInfo: {
    flex: 1,
  },
  activityLabel: {
    fontSize: 14,
    fontFamily: fontSemiBold(),
    lineHeight: 22,
    includeFontPadding: false,
  },
  activityCount: {
    fontSize: 12,
    fontFamily: fontRegular(),
    lineHeight: 18,
    includeFontPadding: false,
    marginTop: 2,
  },
  activityPointsBadge: {
    minWidth: 40,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignItems: 'center',
  },
  activityPointsText: {
    fontSize: 14,
    fontFamily: fontBold(),
    lineHeight: 20,
    includeFontPadding: false,
  },
  emptyWinnersCard: {
    padding: 24,
  },
  emptyWinnersContent: {
    alignItems: 'center',
    gap: 8,
  },
  emptyWinnersTitle: {
    fontSize: 16,
    fontFamily: fontSemiBold(),
    textAlign: 'center',
    lineHeight: 26,
    marginTop: 8,
    includeFontPadding: false,
  },
  emptyWinnersDesc: {
    fontSize: 13,
    fontFamily: fontRegular(),
    textAlign: 'center',
    lineHeight: 22,
    includeFontPadding: false,
  },
  leaderboardRow: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  leaderboardName: {
    fontSize: 15,
    fontFamily: fontSemiBold(),
    lineHeight: 24,
    includeFontPadding: false,
  },
  youBadge: {
    fontSize: 12,
    fontFamily: fontBold(),
    lineHeight: 18,
    includeFontPadding: false,
  },
  rankCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNumber: {
    fontSize: 13,
    fontFamily: fontBold(),
    lineHeight: 18,
    includeFontPadding: false,
  },
  systemNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 12,
  },
  systemNoteText: {
    flex: 1,
    fontSize: 12,
    fontFamily: fontRegular(),
    lineHeight: 20,
    includeFontPadding: false,
  },
  nameWarningCard: {
    padding: 14,
  },
  nameWarningInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  nameWarningText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fontSemiBold(),
    lineHeight: 22,
    includeFontPadding: false,
  },
  nameWarningLink: {
    fontSize: 13,
    fontFamily: fontBold(),
    marginTop: 8,
    textDecorationLine: 'underline',
    lineHeight: 22,
    includeFontPadding: false,
  },
});
