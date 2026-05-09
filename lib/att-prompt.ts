// lib/att-prompt.ts
// App Tracking Transparency (ATT) — iOS only
// Must be called BEFORE showing the first ad for personalized targeting.

import { Platform } from 'react-native';

/**
 * Request App Tracking Transparency permission on iOS 14+.
 * Returns true if tracking is authorized (or if the platform doesn't require ATT).
 * Safe to call on Android/web — returns true immediately.
 */
export async function requestTrackingPermission(): Promise<boolean> {
  if (Platform.OS !== 'ios') return true;

  try {
    const {
      requestTrackingPermissionsAsync,
      getTrackingPermissionsAsync,
    } = require('expo-tracking-transparency');

    // Check if already determined
    const { status: existingStatus } = await getTrackingPermissionsAsync();
    if (existingStatus === 'granted') return true;
    if (existingStatus === 'denied') return false;

    // Prompt the user
    const { status } = await requestTrackingPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    // expo-tracking-transparency unavailable (Expo Go, older iOS, etc.)
    console.log('⚠️ ATT prompt unavailable:', e);
    return true;
  }
}

/**
 * Check if the ATT prompt has already been answered (granted or denied) by the user.
 * Returns false on non-iOS platforms or when status is 'undetermined'.
 * Used to decide whether to show our Pre-ATT explainer modal.
 */
export async function hasAttBeenAsked(): Promise<boolean> {
  if (Platform.OS !== 'ios') return true;

  try {
    const { getTrackingPermissionsAsync } = require('expo-tracking-transparency');
    const { status } = await getTrackingPermissionsAsync();
    return status === 'granted' || status === 'denied';
  } catch {
    return true;
  }
}
