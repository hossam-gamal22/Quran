// app/subscription.tsx
// صفحة الاشتراك والباقات - روح المسلم

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { fontBold, fontMedium, fontRegular } from '@/lib/fonts';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { ScreenContainer } from '@/components/screen-container';
import { getPlanLabel, type SubscriptionPlan } from '@/lib/subscription-manager';
import { useTranslation } from '@/contexts/SettingsContext';
import { fetchRewardsConfig } from '@/lib/rewards-manager';
import { getUserId } from '@/lib/firebase-user';

import { useIsRTL } from '@/hooks/use-is-rtl';
import { UniversalHeader } from '@/components/ui';
const ACCENT = '#0d8e62';
// Calmer green for the primary purchase CTA — keeps the brand without being a "loud" pop.
const SUBSCRIBE_GREEN = '#0d8e62';
// Distinct neutral tone for "Restore purchases" so it reads as a secondary link rather than
// competing with the primary CTA.
const RESTORE_COLOR = '#7da8c2';

// Hardcoded premium features that are ACTUALLY implemented and gated
const PREMIUM_FEATURES = [
  'subscription.featureAdRemoval',
  'subscription.featureExclusiveThemes',
  'subscription.featurePremiumSounds',
  'subscription.featureOfflineRecitation',
  'subscription.featureCloudBackup',
  'subscription.featureCustomBackgrounds',
  'subscription.featurePremiumWidgets',
  'subscription.featureAdvancedKhatma',
  'subscription.featureAdvancedStats',
] as const;

export default function SubscriptionScreen() {
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const { isDarkMode } = colors;
  const isRTL = useIsRTL();
  const router = useRouter();
  const { t } = useTranslation();
  const {
    isPremium,
    premiumSource,
    premiumGrantedBy,
    expiresAt,
    currentPlan,
    products,
    config,
    isLoading,
    isSubscriptionEnabled,
    purchase,
    restore,
    showLifetime,
    showYearly,
    showMonthly,
    lifetimePriceOverride,
    refetchProducts,
  } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('yearly');
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [winnerRank, setWinnerRank] = useState<number | null>(null);

  // Honor-board winner grants only ('admin' = manual gift, no rank to look up).
  // Resolve the user's winning rank from the rewards config (currentWinners
  // are sorted by score, falling back to history).
  const isWinnerGrantedBy =
    premiumGrantedBy === 'auto_reward_system' || premiumGrantedBy === 'reward_system';

  useEffect(() => {
    if (premiumSource !== 'admin') return;
    if (premiumGrantedBy != null && !isWinnerGrantedBy) return;
    let mounted = true;
    (async () => {
      try {
        const [userId, rewardsConfig] = await Promise.all([
          getUserId(),
          fetchRewardsConfig(),
        ]);
        if (!mounted || !userId) return;
        const idx = rewardsConfig.currentWinners.findIndex(w => w.userId === userId);
        if (idx >= 0) {
          setWinnerRank(idx + 1);
          return;
        }
        for (const entry of rewardsConfig.history) {
          const i = entry.winners.findIndex(w => w.userId === userId);
          if (i >= 0) {
            setWinnerRank(i + 1);
            return;
          }
        }
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, [premiumSource, premiumGrantedBy, isWinnerGrantedBy]);

  // Check seasonal offer active
  const seasonalOffer = config.seasonalOffer;
  const isSeasonalActive = !!(
    seasonalOffer?.enabled &&
    seasonalOffer.startDate &&
    seasonalOffer.endDate &&
    new Date() >= new Date(seasonalOffer.startDate) &&
    new Date() <= new Date(seasonalOffer.endDate)
  );

  const handlePurchase = async () => {
    setPurchasing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const success = await purchase(selectedPlan);
    setPurchasing(false);
    if (!success && !isPremium) {
      // Error alert is shown inside purchase() — no duplicate needed
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await restore();
    setRestoring(false);
  };

  if (isLoading) {
    return (
      <ScreenContainer>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      </ScreenContainer>
    );
  }

  // Subscriptions disabled by admin — show "not available" state
  if (!isSubscriptionEnabled) {
    return (
      <ScreenContainer>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.premiumContainer}>
          <UniversalHeader titleColor={colors.text} />
          <View style={styles.premiumContent}>
            <MaterialCommunityIcons name="lock-open-outline" size={64} color={colors.textLight} />
            <Text style={[styles.premiumTitle, { color: colors.text }]}>
              {t('subscription.unavailable') || 'الاشتراكات غير متاحة حالياً'}
            </Text>
            <Text style={[styles.premiumDesc, { color: colors.textLight }]}>
              {t('subscription.unavailableDesc') || 'جميع الميزات متاحة مجاناً. استمتع بالتطبيق!'}
            </Text>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  // Admin-granted premium (honor board winner or manual gift) — explain why
  // they're premium and motivate winners to stay active to keep it.
  if (isPremium && premiumSource === 'admin') {
    // grantedBy is authoritative when present; rank lookup is the fallback
    // for the brief window before the Firestore refresh fills grantedBy.
    const isWinner = isWinnerGrantedBy || (premiumGrantedBy == null && winnerRank != null);
    const daysLeft = expiresAt
      ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
      : null;
    const rankMedal = winnerRank === 1 ? '🥇' : winnerRank === 2 ? '🥈' : winnerRank === 3 ? '🥉' : '';

    return (
      <ScreenContainer>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.premiumContainer}>
          <UniversalHeader titleColor={colors.text} />

          <View style={styles.premiumContent}>
            <MaterialCommunityIcons
              name={isWinner ? 'trophy' : 'gift'}
              size={80}
              color={isDarkMode ? '#FFD700' : '#B8860B'}
            />
            <Text style={[styles.premiumTitle, { color: colors.text }]}>
              {isWinner ? t('subscription.winnerGrantTitle') : t('subscription.adminGrantTitle')}
            </Text>
            {isWinner && winnerRank ? (
              <Text style={[styles.premiumSubtitle, { color: colors.text, textAlign: 'center' }]}>
                {rankMedal} {t('subscription.winnerGrantRank', { rank: winnerRank })}
              </Text>
            ) : null}
            <Text style={[styles.premiumDesc, { color: colors.textLight, textAlign: 'center', paddingHorizontal: 30 }]}>
              {isWinner ? t('subscription.winnerGrantDesc') : t('subscription.adminGrantDesc')}
            </Text>
            {daysLeft != null && (
              <View style={[styles.grantDaysBadge, { backgroundColor: isDarkMode ? 'rgba(255,215,0,0.12)' : 'rgba(184,134,11,0.10)' }]}>
                <Text style={[styles.grantDaysText, { color: isDarkMode ? '#FFD700' : '#B8860B' }]}>
                  {t('subscription.winnerGrantDaysLeft', { days: daysLeft })}
                </Text>
              </View>
            )}
            {isWinner && (
              <>
                <Text style={[styles.premiumDesc, { color: colors.text, textAlign: 'center', paddingHorizontal: 30 }]}>
                  {t('subscription.winnerGrantMotivation')}
                </Text>
                <TouchableOpacity
                  style={[styles.honorBoardBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push('/honor-board');
                  }}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="podium-gold" size={20} color="#fff" />
                  <Text style={styles.honorBoardBtnText}>{t('subscription.viewHonorBoard')}</Text>
                </TouchableOpacity>
              </>
            )}
            {!isWinner && (
              <Text style={[styles.premiumDesc, { color: colors.textLight }]}>
                {t('subscription.thankYou')}
              </Text>
            )}
          </View>
        </View>
      </ScreenContainer>
    );
  }

  if (isPremium) {
    return (
      <ScreenContainer>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.premiumContainer}>
          {/* Header */}
          <UniversalHeader titleColor={colors.text} />

          <View style={styles.premiumContent}>
            <MaterialCommunityIcons name="crown" size={80} color={isDarkMode ? '#FFD700' : '#B8860B'} />
            <Text style={[styles.premiumTitle, { color: colors.text }]}>
              {t('subscription.alreadySubscribed')}
            </Text>
            <Text style={[styles.premiumSubtitle, { color: colors.textLight }]}>
              {t('subscription.currentPlan')}: {currentPlan ? getPlanLabel(currentPlan) : ''}
            </Text>
            <Text style={[styles.premiumDesc, { color: colors.textLight }]}>
              {t('subscription.thankYou')}
            </Text>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  const productsMissing = products.length === 0;

  const allPlanCards: { plan: SubscriptionPlan; badge?: string; popular?: boolean }[] = [
    ...(showMonthly ? [{ plan: 'monthly' as SubscriptionPlan }] : []),
    ...(showYearly ? [{ plan: 'yearly' as SubscriptionPlan, badge: t('subscription.bestValue'), popular: true }] : []),
    ...(showLifetime ? [{ plan: 'lifetime' as SubscriptionPlan, badge: t('subscription.oneTimePurchase') }] : []),
  ];
  const planCards = allPlanCards;

  const getProductForPlan = (plan: SubscriptionPlan) =>
    products.find(p => p.plan === plan);

  return (
    <ScreenContainer>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <UniversalHeader titleColor={colors.text} />

        {/* Hero */}
        <View style={styles.hero}>
          <MaterialCommunityIcons name="crown" size={64} color={isDarkMode ? '#FFD700' : '#B8860B'} />
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            {t('subscription.premiumTitle')}
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.textLight }]}>
            {t('subscription.premiumSubtitle')}
          </Text>
        </View>

        {/* Products missing banner — IAP hasn't returned prices yet. Non-blocking. */}
        {productsMissing && (
          <TouchableOpacity
            onPress={() => refetchProducts()}
            activeOpacity={0.8}
            style={{
              borderRadius: 14,
              padding: 12,
              marginBottom: 16,
              backgroundColor: isDarkMode ? 'rgba(255,193,7,0.10)' : 'rgba(255,193,7,0.18)',
              borderWidth: 1,
              borderColor: 'rgba(255,193,7,0.35)',
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <MaterialCommunityIcons name="refresh" size={20} color={colors.text} />
            <Text style={{ flex: 1, color: colors.text, fontFamily: fontMedium(), fontSize: 13, textAlign: isRTL ? 'right' : 'left' }}>
              {t('subscription.pricesUnavailableReload')}
            </Text>
          </TouchableOpacity>
        )}

        {/* Seasonal Offer Banner */}
        {isSeasonalActive && seasonalOffer && (
          <View style={[styles.seasonalBanner, { backgroundColor: isDarkMode ? '#1a3a2a' : '#e6f9ef' }]}>
            <View style={[styles.seasonalRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <MaterialCommunityIcons name="sale" size={24} color={ACCENT} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.seasonalTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
                  {seasonalOffer.title || t('subscription.seasonalOffer') || 'عرض خاص'}
                </Text>
                {seasonalOffer.description ? (
                  <Text style={[styles.seasonalDesc, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>
                    {seasonalOffer.description}
                  </Text>
                ) : null}
              </View>
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>
                  {seasonalOffer.discountPercent}%
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Features */}
        <View style={[styles.featuresCard, { backgroundColor: colors.card }]}>
          {PREMIUM_FEATURES.map((feature, i) => {
            const displayText = t(feature) || feature;
            return (
              <View key={i} style={[styles.featureRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <MaterialCommunityIcons name="check-circle" size={22} color={ACCENT} />
                <Text style={[styles.featureText, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{displayText}</Text>
              </View>
            );
          })}
        </View>

        {/* Plan Cards */}
        <View style={styles.plansSection}>
          {planCards.map(({ plan, badge, popular }) => {
            const product = getProductForPlan(plan);
            const isSelected = selectedPlan === plan;
            return (
              <TouchableOpacity
                key={plan}
                activeOpacity={0.7}
                onPress={() => {
                  setSelectedPlan(plan);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[
                  styles.planCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: isSelected ? ACCENT : 'transparent',
                    borderWidth: 2,
                  },
                ]}
              >
                {badge && (
                  <View style={[styles.badge, popular && { backgroundColor: ACCENT }]}>
                    <Text style={styles.badgeText}>{badge}</Text>
                  </View>
                )}
                <Text style={[styles.planName, { color: colors.text }]}>
                  {getPlanLabel(plan)}
                </Text>
                <Text style={[styles.planPrice, { color: isSelected ? ACCENT : colors.text }]}>
                  {plan === 'lifetime' && lifetimePriceOverride
                    ? lifetimePriceOverride
                    : (product?.price || '—')}
                </Text>
                {plan === 'yearly' && product && (
                  <Text style={[styles.planNote, { color: colors.textLight }]}>
                    {(product.priceAmount / 12).toFixed(2)} {product.currency}{t('subscription.perMonth')}
                  </Text>
                )}
                {isSelected && (
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={24}
                    color={ACCENT}
                    style={[styles.planCheck, isRTL ? { right: 12, left: undefined } : null]}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Purchase Button */}
        <TouchableOpacity
          style={[styles.purchaseBtn, purchasing && { opacity: 0.6 }]}
          onPress={handlePurchase}
          disabled={purchasing}
          activeOpacity={0.8}
        >
          {purchasing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.purchaseBtnText}>
              {t('subscription.subscribeNow')} — {getProductForPlan(selectedPlan)?.price || getPlanLabel(selectedPlan)}
            </Text>
          )}
        </TouchableOpacity>

        {/* Legal */}
        <Text style={[styles.legal, { color: colors.textLight }]}>
          {t('subscription.legalText')}
        </Text>

        {/* Restore Purchases */}
        <TouchableOpacity
          style={styles.restoreBtn}
          onPress={handleRestore}
          disabled={restoring}
          activeOpacity={0.7}
        >
          {restoring ? (
            <ActivityIndicator size="small" color={RESTORE_COLOR} />
          ) : (
            <Text style={[styles.restoreBtnText, { color: RESTORE_COLOR }]}>
              {t('subscription.restorePurchases')}
            </Text>
          )}
        </TouchableOpacity>

        {/* Legal Links: Terms of Use & Privacy Policy (Apple Guideline 3.1.2) */}
        <View style={styles.legalLinksRow}>
          <TouchableOpacity
            onPress={() =>
              Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')
            }
            activeOpacity={0.7}
          >
            <Text style={[styles.legalLinkText, { color: colors.textLight }]}>
              {t('subscription.termsOfUse')}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.legalLinkSeparator, { color: colors.textLight }]}> | </Text>
          <TouchableOpacity
            onPress={() =>
              Linking.openURL('https://hossamgamal.web.app/p/rooh-almuslim-privacy-policy')
            }
            activeOpacity={0.7}
          >
            <Text style={[styles.legalLinkText, { color: colors.textLight }]}>
              {t('subscription.privacyPolicy')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const _styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { paddingHorizontal: 20, paddingTop: 10 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  hero: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: fontBold(),
    textAlign: 'center',
    lineHeight: 44,
    includeFontPadding: false,
  },
  heroSubtitle: {
    fontSize: 15,
    fontFamily: fontRegular(),
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 15,
    fontFamily: fontMedium(),
    flex: 1,
    lineHeight: 26,
    includeFontPadding: false,
  },
  plansSection: {
    gap: 12,
    marginBottom: 24,
  },
  planCard: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -10,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#FFD700',
  },
  badgeText: {
    fontSize: 12,
    fontFamily: fontBold(),
    color: '#fff',
    lineHeight: 20,
    includeFontPadding: false,
  },
  planName: {
    fontSize: 18,
    fontFamily: fontBold(),
    marginTop: 4,
    lineHeight: 30,
    includeFontPadding: false,
  },
  planPrice: {
    fontSize: 24,
    fontFamily: fontBold(),
    marginTop: 2,
    lineHeight: 38,
    includeFontPadding: false,
  },
  planNote: {
    fontSize: 12,
    fontFamily: fontRegular(),
    lineHeight: 20,
    includeFontPadding: false,
  },
  planCheck: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  purchaseBtn: {
    backgroundColor: SUBSCRIBE_GREEN,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  purchaseBtnText: {
    fontSize: 18,
    fontFamily: fontBold(),
    color: '#fff',
    lineHeight: 30,
    includeFontPadding: false,
  },
  legal: {
    fontSize: 11,
    fontFamily: fontRegular(),
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
    paddingHorizontal: 10,
  },
  premiumContainer: { flex: 1 },
  premiumContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 100,
  },
  premiumTitle: {
    fontSize: 24,
    fontFamily: fontBold(),
    textAlign: 'center',
    lineHeight: 38,
    includeFontPadding: false,
  },
  premiumSubtitle: {
    fontSize: 16,
    fontFamily: fontMedium(),
    lineHeight: 28,
    includeFontPadding: false,
  },
  premiumDesc: {
    fontSize: 14,
    fontFamily: fontRegular(),
    lineHeight: 24,
    includeFontPadding: false,
  },
  grantDaysBadge: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 4,
  },
  grantDaysText: {
    fontSize: 14,
    fontFamily: fontBold(),
    lineHeight: 24,
    includeFontPadding: false,
  },
  honorBoardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: SUBSCRIBE_GREEN,
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 12,
    marginTop: 12,
  },
  honorBoardBtnText: {
    fontSize: 15,
    fontFamily: fontBold(),
    color: '#fff',
    lineHeight: 24,
    includeFontPadding: false,
  },
  restoreBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  restoreBtnText: {
    fontSize: 14,
    fontFamily: fontMedium(),
    lineHeight: 22,
    includeFontPadding: false,
  },
  legalLinksRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
    flexWrap: 'wrap',
  },
  legalLinkText: {
    fontSize: 12,
    fontFamily: fontRegular(),
    textDecorationLine: 'underline',
    opacity: 0.8,
    includeFontPadding: false,
  },
  legalLinkSeparator: {
    fontSize: 12,
    fontFamily: fontRegular(),
    opacity: 0.6,
    includeFontPadding: false,
  },
  // Seasonal offer banner
  seasonalBanner: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(13, 142, 98, 0.3)',
  },
  seasonalRow: {
    alignItems: 'center',
    gap: 10,
  },
  seasonalTitle: {
    fontSize: 16,
    fontFamily: fontBold(),
    lineHeight: 26,
    includeFontPadding: false,
  },
  seasonalDesc: {
    fontSize: 13,
    fontFamily: fontRegular(),
    lineHeight: 20,
    marginTop: 2,
    includeFontPadding: false,
  },
  discountBadge: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  discountText: {
    fontSize: 16,
    fontFamily: fontBold(),
    color: '#fff',
    lineHeight: 24,
    includeFontPadding: false,
  },
});
