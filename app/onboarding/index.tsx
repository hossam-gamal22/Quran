// app/onboarding/index.tsx
// الصفحة الرئيسية للـ Onboarding - توجيه للخطوة الحالية

import { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useColors } from '@/hooks/use-colors';

export default function OnboardingIndex() {
  const router = useRouter();
  const { isLoading, isOnboardingComplete, currentStep } = useOnboarding();
  const colors = useColors();
  const hasNavigated = useRef(false);

  useEffect(() => {
    if (!isLoading && !hasNavigated.current) {
      hasNavigated.current = true;
      if (isOnboardingComplete) {
        router.replace('/(tabs)');
      } else {
        router.replace(`/onboarding/${currentStep}`);
      }
    }
  }, [isLoading, isOnboardingComplete, currentStep]);

  // شاشة التحميل أثناء التحقق والتوجيه
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
