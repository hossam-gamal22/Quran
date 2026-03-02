// app/onboarding/index.tsx
// الصفحة الرئيسية للـ Onboarding - توجيه للخطوة الحالية

import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { useOnboarding } from '@/contexts/OnboardingContext';

export default function OnboardingIndex() {
  const router = useRouter();
  const { isLoading, isOnboardingComplete, currentStep } = useOnboarding();

  useEffect(() => {
    if (!isLoading) {
      if (isOnboardingComplete) {
        // إذا اكتمل الـ Onboarding، توجيه للصفحة الرئيسية
        router.replace('/(tabs)');
      } else {
        // توجيه للخطوة الحالية
        router.replace(`/onboarding/${currentStep}`);
      }
    }
  }, [isLoading, isOnboardingComplete, currentStep]);

  // شاشة التحميل أثناء التحقق
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2f7659" />
      </View>
    );
  }

  // إعادة توجيه مباشرة إذا اكتمل
  if (isOnboardingComplete) {
    return <Redirect href="/(tabs)" />;
  }

  // إعادة توجيه للخطوة الحالية
  return <Redirect href={`/onboarding/${currentStep}`} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
