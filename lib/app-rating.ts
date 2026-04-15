import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

const KEYS = {
  hasRated: '@app_has_rated',
  sessionStart: '@app_session_start',
  totalTime: '@app_total_time_ms',
  promptShown: '@app_rating_prompt_shown',
};

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export async function recordSessionStart(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.sessionStart, String(Date.now()));
  } catch {}
}

export async function saveSessionTime(): Promise<void> {
  try {
    const startRaw = await AsyncStorage.getItem(KEYS.sessionStart);
    if (!startRaw) return;
    const sessionTime = Date.now() - Number(startRaw);
    const totalRaw = await AsyncStorage.getItem(KEYS.totalTime);
    const totalTime = totalRaw ? Number(totalRaw) : 0;
    await AsyncStorage.setItem(KEYS.totalTime, String(totalTime + sessionTime));
  } catch {}
}

export async function shouldShowRating(): Promise<boolean> {
  try {
    const hasRated = await AsyncStorage.getItem(KEYS.hasRated);
    if (hasRated === 'true') return false;

    const promptShown = await AsyncStorage.getItem(KEYS.promptShown);
    if (promptShown === 'true') return false;

    const totalRaw = await AsyncStorage.getItem(KEYS.totalTime);
    const totalTime = totalRaw ? Number(totalRaw) : 0;

    const startRaw = await AsyncStorage.getItem(KEYS.sessionStart);
    const sessionStart = startRaw ? Number(startRaw) : Date.now();
    const sessionTime = Date.now() - sessionStart;

    return (totalTime + sessionTime) >= FIVE_MINUTES_MS;
  } catch {
    return false;
  }
}

export async function markRatingShown(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.promptShown, 'true');
  } catch {}
}

export async function markRated(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.hasRated, 'true');
  } catch {}
}

export async function showRatingPrompt(): Promise<void> {
  try {
    await markRatingShown();
    const isAvailable = await StoreReview.isAvailableAsync();
    if (isAvailable) {
      await StoreReview.requestReview();
      await markRated();
    }
  } catch (e) {
    console.warn('[Rating] Failed to show prompt:', e);
  }
}
