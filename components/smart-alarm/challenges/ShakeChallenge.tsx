import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Accelerometer } from 'expo-sensors';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fontBold, fontMedium, fontSemiBold } from '@/lib/fonts';
import { uiText } from '@/lib/ui-text';
import type { Difficulty } from '@/lib/smart-alarm/types';

interface ShakeChallengeProps {
  difficulty: Difficulty;
  onSolved: () => void;
}

function shakesRequired(d: Difficulty): number {
  switch (d) {
    case 'easy': return 2;
    case 'medium': return 4;
    case 'hard': return 6;
  }
}

const SHAKE_THRESHOLD = 1.8;       // g-force magnitude
const SHAKE_COOLDOWN_MS = 220;     // min interval between counted shakes

export function ShakeChallenge({ difficulty, onSolved }: ShakeChallengeProps) {
  const target = shakesRequired(difficulty);
  const [count, setCount] = useState(0);
  // Emergency fallback button — shows if the accelerometer is unavailable or
  // produced no readings within a few seconds, so the user is never trapped.
  const [showFallback, setShowFallback] = useState(false);
  const sawReadingRef = useRef(false);
  const lastShakeAt = useRef(0);
  const wiggle = useSharedValue(0);

  useEffect(() => {
    let sub: ReturnType<typeof Accelerometer.addListener> | null = null;
    let cancelled = false;

    (async () => {
      let available = true;
      try {
        available = await Accelerometer.isAvailableAsync();
      } catch {
        available = false;
      }
      if (cancelled) return;
      if (!available) {
        setShowFallback(true);
        return;
      }
      Accelerometer.setUpdateInterval(80);
      sub = Accelerometer.addListener(({ x, y, z }) => {
        sawReadingRef.current = true;
        const magnitude = Math.sqrt(x * x + y * y + z * z);
        const delta = Math.abs(magnitude - 1); // 1 g = rest
        const now = Date.now();
        if (delta > SHAKE_THRESHOLD && now - lastShakeAt.current > SHAKE_COOLDOWN_MS) {
          lastShakeAt.current = now;
          setCount((c) => c + 1);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        }
      });
    })();

    // Safety: if no sensor reading arrived within 7s, reveal the fallback button.
    const fallbackTimer = setTimeout(() => {
      if (!sawReadingRef.current) setShowFallback(true);
    }, 7000);

    return () => {
      cancelled = true;
      if (sub) sub.remove();
      clearTimeout(fallbackTimer);
    };
  }, []);

  useEffect(() => {
    if (count >= target) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onSolved();
    }
  }, [count, target, onSolved]);

  // Continuous wiggle animation cue
  useEffect(() => {
    wiggle.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 180 }),
        withTiming(8, { duration: 180 }),
        withTiming(0, { duration: 180 }),
      ),
      -1,
      false,
    );
  }, [wiggle]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: wiggle.value }, { rotate: `${wiggle.value}deg` }],
  }));

  const progress = Math.min(1, count / target);

  return (
    <View style={styles.root}>
      <Text style={styles.label}>
        {uiText({ ar: 'هز الجهاز لتستيقظ', en: 'Shake the device to wake up' })}
      </Text>

      <Animated.View style={[styles.phoneWrap, animStyle]}>
        <MaterialCommunityIcons name="cellphone-arrow-down" size={120} color="#FFFFFF" />
      </Animated.View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <Text style={styles.counter}>
        {count} / {target}
      </Text>

      {showFallback && (
        <Pressable
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            onSolved();
          }}
          style={({ pressed }) => [styles.fallbackBtn, { opacity: pressed ? 0.8 : 1 }]}
        >
          <Text style={styles.fallbackText}>
            {uiText({ ar: 'الاستشعار غير متاح — اضغط للمتابعة', en: 'Sensor unavailable — tap to continue' })}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', alignItems: 'center', paddingVertical: 8 },
  label: {
    fontSize: 16,
    fontFamily: fontSemiBold(),
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 24,
  },
  phoneWrap: {
    marginBottom: 32,
  },
  progressTrack: {
    height: 10,
    width: '100%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#7C3AED',
    borderRadius: 999,
  },
  counter: {
    fontSize: 26,
    fontFamily: fontBold(),
    color: '#FFFFFF',
    writingDirection: 'ltr',
  },
  fallbackBtn: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  fallbackText: {
    fontSize: 13,
    fontFamily: fontSemiBold(),
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
