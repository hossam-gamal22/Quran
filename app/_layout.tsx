// app/_layout.tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { I18nManager, Platform } from 'react-native';

export default function RootLayout() {
  useEffect(() => {
    // Enable RTL for Arabic
    if (!I18nManager.isRTL) {
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(true);
    }
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
