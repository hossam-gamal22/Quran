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
import { t } from '@/lib/i18n';
import { fontSemiBold, fontBold } from '@/lib/fonts';

// ─── Imperative trigger ────────────────────────────────────────
// Other screens can call showOfflineModal() when a network request
// fails. It respects the session-dismissed flag automatically.
let _triggerModal: (() => void) | null = null;

export function showOfflineModal() {
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

  const [isOffline, setIsOffline] = useState(false);
  const [visible, setVisible] = useState(false);
  const dismissed = useRef(false);
  const connectionRestored = useRef(false);

  // NetInfo listener
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = !(state.isConnected && state.isInternetReachable !== false);
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
      setVisible(true);
    }
  }, [isOffline]);

  // Register imperative trigger
  useEffect(() => {
    _triggerModal = () => {
      if (!dismissed.current && !connectionRestored.current) {
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
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
    backgroundColor: '#22C55E',
  },
  buttonText: {
    fontSize: 15,
  },
});
