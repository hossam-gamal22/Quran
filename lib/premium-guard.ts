// lib/premium-guard.ts
// حارس البريميوم — فحص إلزامي للميزات المدفوعة في أزرار الأحداث

import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { Router } from 'expo-router';
import type { PremiumFeatureKey } from '@/types/premium';

export function guardPremiumFeature(
  _feature: PremiumFeatureKey,
  router: Router,
  isPremium: boolean
): boolean {
  if (isPremium) return true;

  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }
  router.push('/subscription' as any);
  return false;
}

export function premiumAction(
  feature: PremiumFeatureKey,
  router: Router,
  isPremium: boolean,
  action: () => void
): () => void {
  return () => {
    if (guardPremiumFeature(feature, router, isPremium)) {
      action();
    }
  };
}
