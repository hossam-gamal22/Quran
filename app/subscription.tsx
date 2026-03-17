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
import { useSubscription } from '@/contexts/SubscriptionContext';
import { ScreenContainer } from '@/components/screen-container';
import { getPlanLabel, type SubscriptionPlan } from '@/lib/subscription-manager';
import { useTranslation } from '@/contexts/SettingsContext';

import { useIsRTL } from '@/hooks/use-is-rtl';
import { UniversalHeader } from '@/components/ui';
const ACCENT = '#0f987f';

export default function SubscriptionScreen() {
  const colors = useColors();
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
    purchase,
  } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('yearly');
  const [purchasing, setPurchasing] = useState(false);

  const handlePurchase = async () => {
    setPurchasing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await purchase(selectedPlan);
    setPurchasing(false);
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

  if (isPremium) {
    return (
      <ScreenContainer>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.premiumContainer}>
          {/* Header */}
          <UniversalHeader titleColor={colors.text} />

          <View style={styles.premiumContent}>
            <MaterialCommunityIcons name="crown" size={80} color="#FFD700" />
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
    { plan: 'monthly' },
    { plan: 'yearly', badge: t('subscription.bestValue'), popular: true },
    { plan: 'lifetime', badge: t('subscription.oneTimePurchase') },
  ];
  const planCards = allPlanCards.filter(p => p.plan !== 'lifetime' || config.lifetimeEnabled !== false);

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
          <MaterialCommunityIcons name="crown" size={64} color="#FFD700" />
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            {t('subscription.premiumTitle')}
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.textLight }]}>
            {t('subscription.premiumSubtitle')}
          </Text>
        </View>

        {/* Features */}
        <View style={[styles.featuresCard, { backgroundColor: colors.card }]}>
          {features.map((feature, i) => (
            <View key={i} style={[styles.featureRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <MaterialCommunityIcons name="check-circle" size={22} color={ACCENT} />
              <Text style={[styles.featureText, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t(feature)}</Text>
            </View>
          ))}
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
                  {product?.price || '---'}
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

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
  },
  planName: {
    fontSize: 18,
    fontFamily: fontBold(),
    marginTop: 4,
  },
  planPrice: {
    fontSize: 24,
    fontFamily: fontBold(),
    marginTop: 2,
  },
  planNote: {
    fontSize: 12,
    fontFamily: fontRegular(),
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
  },
  premiumSubtitle: {
    fontSize: 16,
    fontFamily: fontMedium(),
  },
  premiumDesc: {
    fontSize: 14,
    fontFamily: fontRegular(),
  },
});
