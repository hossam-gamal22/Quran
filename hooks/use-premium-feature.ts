// hooks/use-premium-feature.ts
// هوك للتحقق إذا ميزة محجوزة للبريميوم

import { useSubscription } from '@/contexts/SubscriptionContext';
import { isFeaturePremium, DEFAULT_FEATURE_GATING } from '@/lib/feature-gating';
import type { PremiumFeatureKey, FeatureGatingConfig } from '@/types/premium';

/**
 * يرجع إذا الميزة مقفلة (premium-only والمستخدم مش premium)
 */
export function usePremiumFeature(
  key: PremiumFeatureKey,
  config?: FeatureGatingConfig
) {
  const { isPremium } = useSubscription();
  const locked = isFeaturePremium(key, config ?? DEFAULT_FEATURE_GATING) && !isPremium;

  return { isLocked: locked, isPremium };
}
