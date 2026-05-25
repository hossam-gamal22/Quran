// hooks/use-premium-feature.ts
// هوك للتحقق إذا ميزة محجوزة للبريميوم

import { useSubscription } from '@/contexts/SubscriptionContext';
import { isFeaturePremium } from '@/lib/feature-gating';
import type { PremiumFeatureKey, FeatureGatingConfig } from '@/types/premium';

/**
 * يرجع إذا الميزة مقفلة (premium-only والمستخدم مش premium)
 */
export function usePremiumFeature(
  key: PremiumFeatureKey,
  config?: FeatureGatingConfig
) {
  const { isPremium, isFeatureLocked } = useSubscription();
  const locked = config ? isFeaturePremium(key, config) && !isPremium : isFeatureLocked(key);

  return { isLocked: locked, isPremium };
}
