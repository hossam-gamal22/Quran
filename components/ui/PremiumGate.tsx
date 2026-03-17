// components/ui/PremiumGate.tsx
// مكون بوابة البريميوم — يعرض محتوى مقفل أو يمرر المحتوى

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { usePremiumFeature } from '@/hooks/use-premium-feature';
import { useColors } from '@/hooks/use-colors';
import type { PremiumFeatureKey } from '@/types/premium';

import { useIsRTL } from '@/hooks/use-is-rtl';
import { useSettings } from '@/contexts/SettingsContext';

interface PremiumGateProps {
  feature: PremiumFeatureKey;
  children: React.ReactNode;
  /** محتوى بديل عند القفل (اختياري) */
  fallback?: React.ReactNode;
}

export function PremiumGate({ feature, children, fallback }: PremiumGateProps) {
  const { isLocked } = usePremiumFeature(feature);
  const colors = useColors();
  const isRTL = useIsRTL();
  const router = useRouter();
  const { t } = useSettings();

  if (!isLocked) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  return (
    <View style={styles.container}>
      <View style={[styles.lockOverlay, { backgroundColor: colors.card }]}>
        <MaterialCommunityIcons name="lock" size={32} color="#F59E0B" />
        <Text style={[styles.lockText, { color: colors.text }]}>{t('settings.premium') || 'Premium Feature'}</Text>
        <Text style={[styles.lockDesc, { color: colors.textLight }]}>
          {t('subscription.subscribeToAccess') || 'Subscribe to access this feature'}
        </Text>
        <TouchableOpacity
          style={[styles.upgradeButton, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={() => {
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/subscription' as any);
          }}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="crown" size={18} color="#fff" />
          <Text style={styles.upgradeText}>{t('subscription.upgrade') || 'Upgrade'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  lockOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  lockText: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  lockDesc: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    marginTop: 16,
  },
  upgradeText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
