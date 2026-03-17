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
import { fontBold, fontRegular, fontSemiBold } from '@/lib/fonts';
import { useColors } from '@/hooks/use-colors';
import { useSettings } from '@/contexts/SettingsContext';
import { GlassCard } from '@/components/ui';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchRewardsConfig, getUserMonthlyInfo } from '@/lib/rewards-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RewardsConfig } from '@/types/rewards';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';

import { useIsRTL } from '@/hooks/use-is-rtl';

const MEDAL_COLORS = [
  { icon: 'trophy' as const, color: '#FFD700', bg: 'rgba(255,215,0,0.15)' },
  { icon: 'medal' as const, color: '#C0C0C0', bg: 'rgba(192,192,192,0.15)' },
  { icon: 'medal' as const, color: '#CD7F32', bg: 'rgba(205,127,50,0.15)' },
];

export default function HonorBoard() {
  const colors = useColors();
  const { t, settings } = useSettings();
  const isRTL = useIsRTL();
  const [config, setConfig] = useState<RewardsConfig | null>(null);
  const [userScore, setUserScore] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [rewardsConfig, userId] = await Promise.all([
        fetchRewardsConfig(),
        AsyncStorage.getItem('@user_id'),
      ]);
      setConfig(rewardsConfig);

      if (userId) {
        const info = await getUserMonthlyInfo(userId);
        if (info) setUserScore(info.score);
      }
    } catch {
      // Non-critical
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
    <ScrollView style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <MaterialCommunityIcons name="trophy" size={40} color="#f59e0b" />
          <Text style={[styles.title, { color: colors.text }]}>{t('honor.title')}</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            {t('honor.activeUsersGetPremium', { count: config.winnersCount })}
          </Text>
        </View>

        {/* Countdown */}
        <GlassCard style={styles.countdownCard}>
          <View style={[styles.countdownInner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <MaterialCommunityIcons name="clock-outline" size={20} color="#f59e0b" />
            <Text style={[styles.countdownText, { color: colors.text }]}>
              {getDaysRemaining()} {t('honor.daysRemaining')}
            </Text>
          </View>
        </GlassCard>

        {/* Your Score */}
        <GlassCard style={styles.scoreCard}>
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{t('honor.yourMonthlyPoints')}</Text>
          <Text style={styles.scoreNumber}>{userScore}</Text>
          <Text style={[styles.scoreLabel, { color: colors.muted }]}>{t('honor.points')}</Text>
        </GlassCard>

        {/* Current Winners */}
        {config.currentWinners.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>              {t('honor.monthWinners')} {config.currentMonth}
            </Text>
            {config.currentWinners.map((winner, i) => (
              <GlassCard key={winner.userId} style={styles.winnerCard}>
                <View style={[styles.winnerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  {MEDAL_COLORS[i] ? (
                    <View style={[styles.medalCircle, { backgroundColor: MEDAL_COLORS[i].bg }]}>
                      <MaterialCommunityIcons name={MEDAL_COLORS[i].icon} size={22} color={MEDAL_COLORS[i].color} />
                    </View>
                  ) : (
                    <View style={[styles.medalCircle, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                      <Text style={[styles.medalRank, { color: colors.text }]}>#{i + 1}</Text>
                    </View>
                  )}
                  <View style={styles.winnerInfo}>
                    <Text style={[styles.winnerName, { color: colors.text }]}>
                      {winner.displayName || `${t('honor.anonymousUser')} ${winner.userId.slice(0, 6)}`}
                    </Text>
                    <Text style={[styles.winnerScore, { color: colors.muted }]}>
                      {winner.score} {t('honor.points')}
                    </Text>
                  </View>
                  <View style={[styles.premiumBadge, { backgroundColor: '#f59e0b20' }]}>
                    <Text style={styles.premiumBadgeText}>{t('honor.premium')}</Text>
                  </View>
                </View>
              </GlassCard>
            ))}
          </View>
        )}

        {/* How it works */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{t('honor.howItWorks')}</Text>
          <GlassCard style={styles.faqCard}>
            {[
              { icon: 'book-open-variant', text: t('honor.readQuranPoints') },
              { icon: 'mosque', text: t('honor.prayPoints') },
              { icon: 'hand-heart', text: t('honor.azkarPoints') },
              { icon: 'counter', text: t('honor.tasbihPoints') },
            ].map((item, i) => (
              <View key={i} style={[styles.faqItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <MaterialCommunityIcons
                  name={item.icon as any}
                  size={20}
                  color="#f59e0b"
                />
                <Text style={[styles.faqText, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{item.text}</Text>
              </View>
            ))}
          </GlassCard>
        </View>
      </View>
    </ScrollView>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 12,
  },
  trophyIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: fontBold(),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fontRegular(),
    textAlign: 'center',
    marginTop: 4,
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
  },
  scoreCard: {
    alignItems: 'center',
    padding: 20,
    marginBottom: 20,
  },
  scoreNumber: {
    fontSize: 48,
    fontFamily: fontBold(),
    color: '#f59e0b',
  },
  scoreLabel: {
    fontSize: 14,
    fontFamily: fontRegular(),
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: fontBold(),
    marginBottom: 10,
  },
  winnerCard: {
    marginBottom: 8,
    padding: 14,
  },
  winnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  medalCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  medalRank: {
    fontSize: 14,
    fontFamily: fontBold(),
  },
  winnerInfo: {
    flex: 1,
  },
  winnerName: {
    fontSize: 15,
    fontFamily: fontSemiBold(),
  },
  winnerScore: {
    fontSize: 13,
    fontFamily: fontRegular(),
  },
  premiumBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  premiumBadgeText: {
    fontSize: 12,
    fontFamily: fontSemiBold(),
    color: '#f59e0b',
  },
  faqCard: {
    padding: 16,
  },
  faqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  faqText: {
    flex: 1,
    fontSize: 14,
    fontFamily: fontRegular(),
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
  },
});
