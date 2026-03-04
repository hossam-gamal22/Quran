// lib/app-open-ad.ts - Expo Go Testing Version
import { AppState, AppStateStatus } from 'react-native';

export const loadAppOpenAd = (): void => {
  console.log('⚠️ Ads disabled for Expo Go testing');
};

export const showAppOpenAd = async (): Promise<boolean> => {
  return false;
};

export const initializeAppOpenAds = (): (() => void) => {
  return () => {};
};

export const isAdReady = (): boolean => {
  return false;
};
