// app/subscription.tsx
// صفحة الاشتراك والباقات - روح المسلم

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
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

import { useIsRTL } from '@/hooks/use-is-rtl';
import { UniversalHeader } from '@/components/ui';
const ACCENT = '#0d8e62';

export default function SubscriptionScreen() {
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const { isDarkMode } = colors;
  const isRTL = useIsRTL();
  const router = useRouter();
  const { t } = useTranslation();
  const {
    isPremium,
    currentPlan,
    products,
    features,
    config,
    isLoading,
    isSubscriptionEnabled,
    purchase,
    restore,
    showLifetime,
    showYearly,
    showMonthly,
    badgeText,
    lifetimePriceOverride,
  } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('yearly');
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

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
    await purchase(selectedPlan);
    setPurchasing(false);
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

  const allPlanCards: { plan: SubscriptionPlan; badge?: string; popular?: boolean }[] = [
    ...(showMonthly ? [{ plan: 'monthly' as SubscriptionPlan }] : []),
    ...(showYearly ? [{ plan: 'yearly' as SubscriptionPlan, badge: badgeText || t('subscription.bestValue'), popular: true }] : []),
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

        {/* Trial Days Badge */}
        {config.trialDays > 0 && (
          <View style={[styles.trialBadge, { backgroundColor: isDarkMode ? '#1a2a3a' : '#e6f0ff' }]}>
            <MaterialCommunityIcons name="clock-outline" size={18} color={ACCENT} />
            <Text style={[styles.trialText, { color: colors.text }]}>
              {t('subscription.freeTrial') || 'تجربة مجانية'}: {config.trialDays} {t('subscription.days') || 'أيام'}
            </Text>
          </View>
        )}

        {/* Features */}
        <View style={[styles.featuresCard, { backgroundColor: colors.card }]}>
          {features.map((feature, i) => {
            // If feature is a translation key (starts with subscription.), translate it
            // Otherwise it's raw Arabic text from Firestore, use directly
            const displayText = feature.startsWith('subscription.') ? t(feature) : feature;
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
            <ActivityIndicator size="small" color={ACCENT} />
          ) : (
            <Text style={[styles.restoreBtnText, { color: ACCENT }]}>
              {t('subscription.restorePurchases')}
            </Text>
          )}
        </TouchableOpacity>

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
    backgroundColor: ACCENT,
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
  // Trial days badge
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 16,
    alignSelf: 'center',
  },
  trialText: {
    fontSize: 14,
    fontFamily: fontMedium(),
    lineHeight: 22,
    includeFontPadding: false,
  },
});
