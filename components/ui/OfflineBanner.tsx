// components/ui/OfflineBanner.tsx
// نافذة تنبيه انقطاع الاتصال — مركزية وقابلة للإغلاق

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useIsRTL } from '@/hooks/use-is-rtl';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { t } from '@/lib/i18n';
import { fontSemiBold, fontBold } from '@/lib/fonts';

// ─── Imperative trigger ────────────────────────────────────────
// Other screens can call showOfflineModal() when a network request
// fails. It verifies the device is actually offline before showing,
// so a request that failed for another reason (server 5xx, IAP error,
// CORS) does not get mis-attributed to no-internet.
let _triggerModal: (() => void) | null = null;

export async function showOfflineModal() {
  try {
    const state = await NetInfo.fetch();
    // Only show modal when device is definitively offline.
    // Treat unknown isInternetReachable (null/undefined) as online to avoid
    // false positives from transient reachability checks.
    const definitelyOffline =
      state.isConnected === false ||
      (state.isConnected === true && state.isInternetReachable === false);
    if (!definitelyOffline) return;
  } catch {
    // If NetInfo itself fails, do not show the modal — likely a non-network error
    return;
  }
  _triggerModal?.();
}

// ─── Offline-capable screens (do NOT trigger on these) ─────────
// const OFFLINE_SCREENS = [
//   'Quran', 'Azkar', 'Tasbih', 'NamesOfAllah',
//   'Bookmarks', 'Settings', 'About',
// ];
// ─── Internet-required screens ────────────────────────────────
// const ONLINE_SCREENS = [
//   'PrayerTimes', 'QiblaLive', 'DailyHadith',
//   'IslamicEvents', 'AdminContent',
// ];

export function OfflineModal() {
  const isRTL = useIsRTL();
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);

  const [isOffline, setIsOffline] = useState(false);
  const [visible, setVisible] = useState(false);
  const dismissed = useRef(false);
  const connectionRestored = useRef(false);
  // Startup grace period — iOS NetInfo briefly reports isInternetReachable:false
  // right after app launch before reachability is confirmed. Don't show modal
  // during this window to avoid a false flash.
  const startupGraceUntil = useRef(Date.now() + 4000);
  // Require 2 consecutive offline readings before considering truly offline
  // to filter out transient flickers during foreground/background transitions.
  const offlineReadingsRef = useRef(0);

  // NetInfo listener
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // Only treat as offline if isConnected is explicitly false, OR
      // isConnected is true but isInternetReachable is explicitly false
      // (and not null/undefined which means "still determining").
      const definitelyOffline =
        state.isConnected === false ||
        (state.isConnected === true && state.isInternetReachable === false);

      if (definitelyOffline) {
        offlineReadingsRef.current += 1;
      } else {
        offlineReadingsRef.current = 0;
      }

      // Require 2 consecutive offline readings to debounce flickers
      const offline = offlineReadingsRef.current >= 2;
      setIsOffline(offline);

      if (!offline) {
        connectionRestored.current = true;
        setVisible(false);
      } else {
        // Reset suppression flags when going offline again
        connectionRestored.current = false;
        dismissed.current = false;
      }
    });
    return () => unsubscribe();
  }, []);

  // Show modal when offline (re-triggerable after connection cycle)
  useEffect(() => {
    if (isOffline && !dismissed.current && !connectionRestored.current) {
      // Honor startup grace period
      if (Date.now() < startupGraceUntil.current) return;
      setVisible(true);
    }
  }, [isOffline]);

  // Register imperative trigger
  useEffect(() => {
    _triggerModal = () => {
      if (!dismissed.current && !connectionRestored.current) {
        if (Date.now() < startupGraceUntil.current) return;
        setVisible(true);
      }
    };
    return () => { _triggerModal = null; };
  }, []);

  const dismiss = useCallback(() => {
    dismissed.current = true;
    setVisible(false);
  }, []);

  const handleTryAgain = useCallback(async () => {
    const state = await NetInfo.fetch();
    const online = state.isConnected && state.isInternetReachable !== false;
    if (online) {
      connectionRestored.current = true;
      setIsOffline(false);
      setVisible(false);
    }
  }, []);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={dismiss}>
      <Pressable style={styles.overlay} onPress={dismiss}>
        <Pressable
          style={[
            styles.card,
            { backgroundColor: colors.card === 'rgba(255,255,255,0.1)' || colors.card === 'rgba(0,0,0,0.06)'
                ? '#1a1f2b'
                : colors.card },
          ]}
          onPress={() => {/* prevent dismiss when tapping card */}}
        >
          <MaterialCommunityIcons
            name="wifi-off"
            size={48}
            color={colors.text}
            style={styles.icon}
          />
          <Text style={[styles.title, { color: colors.text, fontFamily: fontBold() }]}>
            {t('network.noConnectionTitle')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textLight, fontFamily: fontSemiBold() }]}>
            {t('network.noConnectionSubtitle')}
          </Text>
          <View style={[styles.buttonRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity
              style={[styles.button, styles.outlinedButton, { borderColor: colors.text }]}
              onPress={handleTryAgain}
              activeOpacity={0.7}
            >
              <Text style={[styles.buttonText, { color: colors.text, fontFamily: fontSemiBold() }]}>
                {t('network.tryAgain')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.filledButton]}
              onPress={dismiss}
              activeOpacity={0.7}
            >
              <Text style={[styles.buttonText, { color: '#fff', fontFamily: fontSemiBold() }]}>
                {t('network.continueOffline')}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Keep old name as alias for backward compat
export const OfflineBanner = OfflineModal;

const _styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '85%',
    maxWidth: 360,
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonRow: {
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlinedButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  filledButton: {
    backgroundColor: '#0a7a55',
  },
  buttonText: {
    fontSize: 15,
  },
});
