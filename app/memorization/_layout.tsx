import { Stack } from 'expo-router';
import React from 'react';

export default function MemorizationLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="new" />
      <Stack.Screen name="edit" />
      <Stack.Screen name="learn" />
      <Stack.Screen name="hide" />
      <Stack.Screen name="test" />
      <Stack.Screen name="review" />
      <Stack.Screen name="mistakes" />
      <Stack.Screen name="progress" />
      <Stack.Screen name="certificate" />
    </Stack>
  );
}
