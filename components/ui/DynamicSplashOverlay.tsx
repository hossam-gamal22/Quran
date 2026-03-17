// components/ui/DynamicSplashOverlay.tsx
// Shows admin-configured splash content on app open (ذكر/آية/حديث/إعلان)

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { fontBold, fontRegular, fontSemiBold } from '@/lib/fonts';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import Animated, { FadeIn, FadeOut, SlideInDown } from 'react-native-reanimated';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { safeIcon } from '@/lib/safe-icon';

const { width, height } = Dimensions.get('window');
const SPLASH_SHOWN_KEY = '@splash_last_shown';
const SPLASH_SHOWN_IDS_KEY = '@splash_shown_ids';

interface SplashScreenData {
  id: string;
  type: string;
  titleAr: string;
  contentAr: string;
  subtitleAr?: string;
  sourceAr?: string;
  backgroundColor: string;
  backgroundGradient?: string[];
  textColor: string;
  accentColor: string;
  iconName?: string;
  showIcon: boolean;
  actionType: string;
  actionLabel?: string;
  actionTarget?: string;
  displayFrequency: string;
  showDuration: number;
  priority: number;
}

export function DynamicSplashOverlay() {
  const [visible, setVisible] = useState(false);
  const [splash, setSplash] = useState<SplashScreenData | null>(null);
  const router = useRouter();  const isRTL = useIsRTL();
  useEffect(() => {
    loadSplash();
  }, []);

  const loadSplash = async () => {
    try {
      // Check frequency
      const lastShown = await AsyncStorage.getItem(SPLASH_SHOWN_KEY);
      const today = new Date().toDateString();
      const shownIdsRaw = await AsyncStorage.getItem(SPLASH_SHOWN_IDS_KEY);
      const shownIds: string[] = shownIdsRaw ? JSON.parse(shownIdsRaw) : [];

      // Fetch active splash screens
      const snap = await getDocs(query(collection(db, 'splashScreens'), where('isActive', '==', true)));
      if (snap.empty) return;

      const screens = snap.docs.map(d => ({ id: d.id, ...d.data() } as SplashScreenData));

      // Filter by frequency rules
      const eligible = screens.filter(s => {
        if (s.displayFrequency === 'once' && shownIds.includes(s.id)) return false;
        if (s.displayFrequency === 'daily' && lastShown === today) return false;
        return true;
      });

      if (eligible.length === 0) return;

      // Pick highest priority
      eligible.sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
      const selected = eligible[0];

      setSplash(selected);
      setVisible(true);

      // Mark as shown
      await AsyncStorage.setItem(SPLASH_SHOWN_KEY, today);
      if (!shownIds.includes(selected.id)) {
        await AsyncStorage.setItem(SPLASH_SHOWN_IDS_KEY, JSON.stringify([...shownIds, selected.id]));
      }

      // Auto dismiss
      if (selected.showDuration > 0) {
        setTimeout(() => setVisible(false), selected.showDuration * 1000);
      }
    } catch { /* silent */ }
  };

  const handleAction = useCallback(() => {
    setVisible(false);
    if (splash?.actionType === 'navigate' && splash.actionTarget) {
      router.push(splash.actionTarget as any);
    }
  }, [splash, router]);

  if (!visible || !splash) return null;

  const gradientColors: [string, string, ...string[]] = splash.backgroundGradient?.length && splash.backgroundGradient.length >= 2
    ? [splash.backgroundGradient[0], splash.backgroundGradient[1], ...splash.backgroundGradient.slice(2)]
    : [splash.backgroundColor, splash.backgroundColor];

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={() => setVisible(false)}>
      <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)} style={styles.overlay}>
        <Animated.View entering={SlideInDown.springify().damping(18).stiffness(240)}>
          <LinearGradient colors={gradientColors} style={styles.card}>
            {/* Close */}
            <TouchableOpacity style={[styles.closeBtn, isRTL ? { left: 12, right: undefined } : null]} onPress={() => setVisible(false)}>
              <MaterialCommunityIcons name="close" size={22} color={splash.textColor} />
            </TouchableOpacity>

            {/* Icon */}
            {splash.showIcon && splash.iconName && (
              <View style={[styles.iconCircle, { backgroundColor: splash.accentColor + '30' }]}>
                <MaterialCommunityIcons
                  name={safeIcon(splash.iconName) as any}
                  size={32}
                  color={splash.accentColor}
                />
              </View>
            )}

            {/* Content */}
            <Text style={[styles.title, { color: splash.textColor }]}>{splash.titleAr}</Text>
            <Text style={[styles.content, { color: splash.textColor }]}>{splash.contentAr}</Text>

            {splash.subtitleAr ? (
              <Text style={[styles.subtitle, { color: splash.textColor + 'CC' }]}>{splash.subtitleAr}</Text>
            ) : null}

            {splash.sourceAr ? (
              <Text style={[styles.source, { color: splash.accentColor }]}>{splash.sourceAr}</Text>
            ) : null}

            {/* Action Button */}
            {splash.actionType !== 'none' && splash.actionLabel && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: splash.accentColor }]}
                onPress={handleAction}
              >
                <Text style={styles.actionText}>{splash.actionLabel}</Text>
              </TouchableOpacity>
            )}
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: width - 48,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    maxHeight: height * 0.7,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: fontBold(),
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 12,
  },
  content: {
    fontFamily: fontRegular(),
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: fontRegular(),
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  source: {
    fontFamily: fontSemiBold(),
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  actionBtn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 16,
    marginTop: 8,
  },
  actionText: {
    fontFamily: fontBold(),
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
});
