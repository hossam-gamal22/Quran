/**
 * Top banner shown when the foreground adhan trigger fires. Brief, dismissible,
 * auto-hides after 8 seconds. Plays alongside (not instead of) the adhan sound.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/use-colors';
import { t } from '@/lib/i18n';
import { useForegroundAdhan, type ForegroundAdhanEvent } from '@/hooks/use-foreground-adhan';

const VISIBLE_MS = 8000;

export function AdhanBanner() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [event, setEvent] = useState<ForegroundAdhanEvent | null>(null);
  const translateY = useRef(new Animated.Value(-200)).current;
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleAdhanFired = useCallback((e: ForegroundAdhanEvent) => {
    setEvent(e);
  }, []);

  useForegroundAdhan({ onAdhanFired: handleAdhanFired });

  const dismiss = useCallback(() => {
    Animated.timing(translateY, {
      toValue: -200,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setEvent(null));
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, [translateY]);

  useEffect(() => {
    if (!event) return;
    Animated.spring(translateY, {
      toValue: 0,
      damping: 18,
      stiffness: 240,
      useNativeDriver: true,
    }).start();
    hideTimerRef.current = setTimeout(dismiss, VISIBLE_MS);
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [event, dismiss, translateY]);

  if (!event) return null;

  const prayerLabel = t(`prayer.${event.prayer}`);
  const title = `${t('home.adhanTimeFor') || 'حان الآن وقت صلاة'} ${prayerLabel}`;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { paddingTop: insets.top + 8, transform: [{ translateY }] },
      ]}
    >
      <BlurView
        intensity={Platform.OS === 'ios' ? 80 : 40}
        tint={colors.isDarkMode ? 'dark' : 'light'}
        style={styles.card}
      >
        <View style={[styles.row, { flexDirection: 'row-reverse' }]}>
          <View style={[styles.iconWrap, { backgroundColor: '#0f987f' }]}>
            <MaterialCommunityIcons name="mosque" size={22} color="#fff" />
          </View>
          <View style={styles.textWrap}>
            <Text
              numberOfLines={1}
              style={[styles.title, { color: colors.text, writingDirection: 'rtl' }]}
            >
              {title}
            </Text>
            <Text style={[styles.time, { color: colors.muted, writingDirection: 'ltr' }]}>
              {event.timeStr}
            </Text>
          </View>
          <TouchableOpacity
            onPress={dismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={t('common.close') || 'إغلاق'}
          >
            <MaterialCommunityIcons name="close" size={22} color={colors.muted} />
          </TouchableOpacity>
        </View>
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    zIndex: 9999,
    elevation: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  row: {
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Cairo-Bold' : 'Cairo-Bold',
    textAlign: 'right',
  },
  time: {
    fontSize: 13,
    marginTop: 2,
    textAlign: 'right',
  },
});
