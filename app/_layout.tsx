// app/_layout.tsx
// التخطيط الرئيسي للتطبيق - روح المسلم

import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, I18nManager, Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Providers
import { SettingsProvider, useSettings } from '@/contexts/SettingsContext';
import { QuranProvider } from '@/contexts/QuranContext';
import { KhatmaProvider } from '@/contexts/KhatmaContext';
import { WorshipProvider } from '@/contexts/WorshipContext';
import { SeasonalProvider } from '@/contexts/SeasonalContext';
import { OnboardingProvider, useOnboarding } from '@/contexts/OnboardingContext';

// Components
import ErrorBoundary from '@/components/ui/ErrorBoundary';

// ========================================
// منع إخفاء Splash Screen تلقائياً
// ========================================
SplashScreen.preventAutoHideAsync();

// ========================================
// الخطوط المطلوبة
// ========================================
const FONTS = {
  'Cairo-Regular': require('@/assets/fonts/Cairo-Regular.ttf'),
  'Cairo-Medium': require('@/assets/fonts/Cairo-Medium.ttf'),
  'Cairo-SemiBold': require('@/assets/fonts/Cairo-SemiBold.ttf'),
  'Cairo-Bold': require('@/assets/fonts/Cairo-Bold.ttf'),
  'Amiri-Regular': require('@/assets/fonts/Amiri-Regular.ttf'),
  'Amiri-Bold': require('@/assets/fonts/Amiri-Bold.ttf'),
  'UthmanicHafs': require('@/assets/fonts/UthmanicHafs.otf'),
};

// ========================================
// مكون التحميل الأولي
// ========================================
function InitialLoader({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // تحميل الخطوط
        await Font.loadAsync(FONTS);
        setFontsLoaded(true);

        // تحميل إعدادات اللغة
        const savedLanguage = await AsyncStorage.getItem('app_language');
        const isRTL = savedLanguage === 'ar' || savedLanguage === 'ur' || !savedLanguage;
        
        // تطبيق RTL إذا لزم الأمر
        if (I18nManager.isRTL !== isRTL) {
          I18nManager.allowRTL(isRTL);
          I18nManager.forceRTL(isRTL);
        }

        // تأخير بسيط لضمان تحميل كل شيء
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error('Error during app initialization:', error);
      } finally {
        setIsReady(true);
      }
    }

    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (isReady && fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [isReady, fontsLoaded]);

  if (!isReady || !fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container} onLayout={onLayoutRootView}>
      {children}
    </View>
  );
}

// ========================================
// مكون التوجيه (Onboarding Guard)
// ========================================
function NavigationGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { isLoading, isOnboardingComplete } = useOnboarding();

  useEffect(() => {
    if (isLoading) return;

    const inOnboarding = segments[0] === 'onboarding';
    const inTabs = segments[0] === '(tabs)';

    if (!isOnboardingComplete && !inOnboarding) {
      // المستخدم لم يكمل الـ Onboarding، توجيه له
      router.replace('/onboarding/welcome');
    } else if (isOnboardingComplete && inOnboarding) {
      // المستخدم أكمل الـ Onboarding لكنه في صفحة Onboarding
      router.replace('/(tabs)');
    }
  }, [isLoading, isOnboardingComplete, segments]);

  return <>{children}</>;
}

// ========================================
// مكون الثيم
// ========================================
function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const { isDarkMode } = useSettings();

  return (
    <>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      {children}
    </>
  );
}

// ========================================
// التخطيط الرئيسي
// ========================================
function RootLayoutNav() {
  const { isDarkMode } = useSettings();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_left',
        animationDuration: 250,
        contentStyle: {
          backgroundColor: isDarkMode ? '#11151c' : '#f5f5f5',
        },
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}
    >
      {/* الصفحات الرئيسية (التابات) */}
      <Stack.Screen 
        name="(tabs)" 
        options={{ 
          headerShown: false,
          animation: 'fade',
        }} 
      />

      {/* شاشات الـ Onboarding */}
      <Stack.Screen 
        name="onboarding" 
        options={{ 
          headerShown: false,
          animation: 'fade',
          gestureEnabled: false,
        }} 
      />

      {/* صفحات السور */}
      <Stack.Screen 
        name="surah/[id]" 
        options={{ 
          headerShown: false,
          animation: 'slide_from_left',
        }} 
      />

      {/* صفحات الختمة */}
      <Stack.Screen 
        name="khatma" 
        options={{ 
          headerShown: false,
        }} 
      />

      {/* صفحات تتبع العبادات */}
      <Stack.Screen 
        name="worship-tracker" 
        options={{ 
          headerShown: false,
        }} 
      />

      {/* صفحات الإعدادات */}
      <Stack.Screen 
        name="settings" 
        options={{ 
          headerShown: false,
        }} 
      />

      {/* صفحات المواسم */}
      <Stack.Screen 
        name="seasonal" 
        options={{ 
          headerShown: false,
        }} 
      />

      {/* إعدادات الويدجت */}
      <Stack.Screen 
        name="widget-settings" 
        options={{ 
          headerShown: false,
          presentation: 'modal',
        }} 
      />

      {/* صفحة غير موجودة */}
      <Stack.Screen 
        name="+not-found" 
        options={{ 
          title: 'الصفحة غير موجودة',
        }} 
      />
    </Stack>
  );
}

// ========================================
// المكون الرئيسي
// ========================================
export default function RootLayout() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaProvider>
          <InitialLoader>
            <SettingsProvider>
              <OnboardingProvider>
                <QuranProvider>
                  <KhatmaProvider>
                    <WorshipProvider>
                      <SeasonalProvider>
                        <ThemeWrapper>
                          <NavigationGuard>
                            <RootLayoutNav />
                          </NavigationGuard>
                        </ThemeWrapper>
                      </SeasonalProvider>
                    </WorshipProvider>
                  </KhatmaProvider>
                </QuranProvider>
              </OnboardingProvider>
            </SettingsProvider>
          </InitialLoader>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

// ========================================
// الأنماط
// ========================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
