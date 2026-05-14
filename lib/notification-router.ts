// lib/notification-router.ts
// Shared routing logic for notification tap handling.
// Used by both the warm-start listener (NotificationsContext) and the cold-start
// handler (_layout.tsx) to navigate to the correct screen when user taps a notification.

import { Linking } from 'react-native';
import type { Router } from 'expo-router';

// Track handled notification IDs to prevent double-navigation
// (cold-start + warm-start listeners may both fire for the same tap)
const _handledIds = new Set<string>();
const MAX_HANDLED = 50;

export interface NotificationRouteResult {
  /** Whether a navigation action was dispatched */
  navigated: boolean;
  /** If the notification includes audio to play after navigation */
  audioUrl?: string;
  /** Label for audio playback logging */
  audioLabel?: string;
}

/**
 * Route the user to the correct screen based on notification data.
 * Returns info about what happened so the caller can handle audio playback.
 */
export function handleNotificationNavigation(
  data: Record<string, any> | undefined | null,
  router: Router,
  notificationId?: string,
): NotificationRouteResult {
  if (!data) return { navigated: false };

  // Deduplication guard
  if (notificationId) {
    if (_handledIds.has(notificationId)) {
      return { navigated: false };
    }
    _handledIds.add(notificationId);
    // Prevent unbounded growth
    if (_handledIds.size > MAX_HANDLED) {
      const first = _handledIds.values().next().value;
      if (first) _handledIds.delete(first);
    }
  }

  // ── Priority 1: Admin deep-link URL ──
  if (data.actionUrl && typeof data.actionUrl === 'string') {
    const url = data.actionUrl;
    if (url.startsWith('/')) {
      router.push(url as any);
      return { navigated: true };
    }
    if (url.startsWith('http')) {
      Linking.openURL(url).catch(() => {});
      return { navigated: true };
    }
  }

  // ── Priority 2: Type-based routing ──
  const type = data.type as string | undefined;

  switch (type) {
    // ─── Prayer ───
    case 'prayer':
      router.push('/(tabs)/prayer');
      return { navigated: true };

    // ─── Full Adhan Player ───
    // Fired when the user taps a prayer notification that was scheduled with
    // `useFullAdhan` enabled, OR taps the test notification while the toggle
    // is on. Opens the in-app full-screen player which plays the complete
    // 2–4 min recording on STREAM_MUSIC (no OS time cap).
    case 'full_adhan': {
      const prayer = typeof data.prayer === 'string' ? data.prayer : 'dhuhr';
      const voice = typeof data.voice === 'string' ? data.voice : 'makkah';
      const test = data.test === '1' || data.test === 1 ? '1' : '0';
      if (__DEV__) console.log('[notification-router] navigating to full-adhan', { prayer, voice, test });
      router.push({ pathname: '/full-adhan', params: { prayer, voice, test } } as any);
      return { navigated: true };
    }

    // ─── Adhkar Wird (morning / evening / sleep / wakeup) ───
    case 'wird': {
      const period = data.period as string | undefined;
      if (period) {
        router.push(`/azkar/${period}` as any);
      } else {
        router.push('/(tabs)/azkar' as any);
      }
      return { navigated: true };
    }

    // ─── After-prayer Azkar ───
    case 'after_prayer_azkar':
      router.push('/azkar/27' as any);
      return { navigated: true };

    // ─── Daily Ayah ───
    case 'daily_ayah': {
      const surah = Number(data.surah);
      const ayah = Number(data.ayah);
      if (Number.isFinite(surah) && Number.isFinite(ayah) && surah > 0 && ayah > 0) {
        router.push(`/surah/${surah}?ayah=${ayah}` as any);
        return { navigated: true };
      }
      router.push('/daily-ayah' as any);
      return { navigated: true };
    }

    // ─── Salawat (dedicated screen) ───
    case 'salawat':
      router.push('/azkar/salawat' as any);
      return { navigated: true };

    // ─── Tasbih (counter tab) ───
    case 'tasbih':
      router.push('/(tabs)/tasbih');
      return { navigated: true };

    // ─── Istighfar (dedicated screen) ───
    case 'istighfar':
      router.push('/azkar/istighfar' as any);
      return { navigated: true };

    // ─── Quran reading / generic quran ───
    case 'quran_reading':
    case 'quran':
      router.push('/(tabs)/quran');
      return { navigated: true };

    // ─── Surah Al-Kahf Friday reminder ───
    case 'kahf':
      router.push('/surah-kahf' as any);
      return {
        navigated: true,
        audioUrl: data.ayahAudioUrl ? String(data.ayahAudioUrl) : undefined,
        audioLabel: 'Kahf tap',
      };

    // ─── Custom reminder (ayah / surah / azkar / dua) ───
    case 'custom': {
      const contentType = data.contentType as string | undefined;
      if (contentType === 'ayah' && data.surah && data.ayah) {
        router.push(`/surah/${data.surah}?ayah=${data.ayah}` as any);
        return {
          navigated: true,
          audioUrl: data.ayahAudioUrl ? String(data.ayahAudioUrl) : undefined,
          audioLabel: 'custom ayah tap',
        };
      }
      if (contentType === 'surah' && data.surah) {
        router.push(`/surah/${data.surah}` as any);
        return { navigated: true };
      }
      if (contentType === 'azkar') {
        router.push('/(tabs)/azkar' as any);
        return { navigated: true };
      }
      if (contentType === 'dua') {
        router.push('/daily-dua' as any);
        return { navigated: true };
      }
      // Fallback for custom with no recognized content type
      return { navigated: false };
    }

    // ─── Worship reports ───
    case 'worship_summary':
      router.push((data.screen || '/daily-summary') as any);
      return { navigated: true };

    case 'worship_weekly':
      router.push((data.screen || '/weekly-summary') as any);
      return { navigated: true };

    // ─── Admin push — azkar category ───
    case 'azkar': {
      const cat = data.category as string | undefined;
      if (cat) {
        router.push(`/azkar/${cat}` as any);
      } else {
        router.push('/(tabs)/azkar' as any);
      }
      return { navigated: true };
    }

    // ─── Seasonal events ───
    case 'seasonal':
      router.push('/seasonal' as any);
      return { navigated: true };

    // ─── App update ───
    case 'app_update': {
      const storeUrl = data.storeUrl as string | undefined;
      if (storeUrl) {
        Linking.openURL(storeUrl).catch(() => {});
      }
      return { navigated: true };
    }

    // ─── Sleep Azkar → Surah Al-Mulk ───
    case 'sleep_azkar':
      router.push('/surah-mulk' as any);
      return { navigated: true };

    // ─── Khatma (Quran reading plan) ───
    case 'khatma_reminder':
    case 'khatma_daily_wird':
    case 'khatma_complete':
    case 'khatma_wird_complete':
      router.push('/khatma' as any);
      return { navigated: true };

    // ─── No-op types (just opening the app is enough) ───
    case 'refresh_reminder':
    case 'test':
      return { navigated: false };

    // ─── Premium granted (honor board / admin) ───
    case 'premium_granted':
      router.push('/honor-board' as any);
      return { navigated: true };

    // ─── Honor board prize ───
    case 'honor_board_winner':
    case 'prize':
      router.push('/honor-board' as any);
      return { navigated: true };

    default:
      return { navigated: false };
  }
}
