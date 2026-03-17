// app/onboarding/_layout.tsx
// تخطيط شاشات الترحيب - بدون header وبدون tab bar

import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_left',
        gestureEnabled: false,
      }}
    />
  );
}
