// hooks/use-sujood-detector.ts
// Sujood detector using accelerometer Z-axis + touch fallback
// Z > 9.5 = face up (standing/sitting), Z < -9.5 = face down (sujood)

import { useCallback, useEffect, useRef, useState } from 'react';
import { Accelerometer, AccelerometerMeasurement } from 'expo-sensors';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const SENSOR_INTERVAL_MS = 50; // 20Hz - enough for sujood detection
const COOLDOWN_MS = 800; // Minimum time between sujood detections
const SUJOOD_THRESHOLD = -9.5; // Z-axis threshold for face-down detection
const DEBOUNCE_COUNT = 3; // Number of consecutive readings to confirm sujood

// Sound asset for feedback
const SUJOOD_SOUND = require('@/assets/sounds/effects/tasbih_click.mp3');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface SujoodDetectorState {
  /** Number of sujood detected */
  sujoodCount: number;
  /** Whether accelerometer is available */
  isAvailable: boolean;
  /** Whether detector is actively listening */
  isListening: boolean;
  /** Whether in cooldown period (just detected a sujood) */
  inCooldown: boolean;
  /** Current Z-axis value (for debugging) */
  currentZ: number;
}

export interface SujoodDetectorActions {
  /** Start listening for sujood */
  start: () => void;
  /** Stop listening */
  stop: () => void;
  /** Reset sujood count */
  reset: () => void;
  /** Manual tap to count (touch fallback) */
  manualTap: () => void;
}

export type SujoodDetector = SujoodDetectorState & SujoodDetectorActions;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useSujoodDetector(): SujoodDetector {
  // State
  const [sujoodCount, setSujoodCount] = useState(0);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [inCooldown, setInCooldown] = useState(false);
  const [currentZ, setCurrentZ] = useState(0);

  // Refs for non-reactive state
  const subscriptionRef = useRef<ReturnType<typeof Accelerometer.addListener> | null>(null);
  const consecutiveCountRef = useRef(0);
  const lastSujoodTimeRef = useRef(0);
  const wasInSujoodRef = useRef(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check sensor availability on mount
  useEffect(() => {
    Accelerometer.isAvailableAsync().then((available) => {
      setIsAvailable(available);
    }).catch(() => {
      setIsAvailable(false);
    });

    // Cleanup on unmount
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
      }
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
      }
    };
  }, []);

  // Load sound on mount
  useEffect(() => {
    const loadSound = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(SUJOOD_SOUND, { shouldPlay: false });
        soundRef.current = sound;
      } catch (e) {
        console.warn('[SujoodDetector] Failed to load sound:', e);
      }
    };
    loadSound();
  }, []);

  // Play feedback (haptic + sound)
  const playFeedback = useCallback(async () => {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Sound feedback
    try {
      if (soundRef.current) {
        await soundRef.current.setPositionAsync(0);
        await soundRef.current.playAsync();
      }
    } catch (e) {
      // Sound play failed, haptic still works
    }
  }, []);

  // Handle sujood detection
  const detectSujood = useCallback(() => {
    const now = Date.now();

    // Check cooldown
    if (now - lastSujoodTimeRef.current < COOLDOWN_MS) {
      return;
    }

    // Register sujood
    lastSujoodTimeRef.current = now;
    wasInSujoodRef.current = true;
    setSujoodCount((prev) => prev + 1);
    playFeedback();

    // Set cooldown state
    setInCooldown(true);
    if (cooldownTimerRef.current) {
      clearTimeout(cooldownTimerRef.current);
    }
    cooldownTimerRef.current = setTimeout(() => {
      setInCooldown(false);
      wasInSujoodRef.current = false;
    }, COOLDOWN_MS);
  }, [playFeedback]);

  // Process accelerometer data
  const handleAccelerometerData = useCallback(
    (data: AccelerometerMeasurement) => {
      const { z } = data;
      setCurrentZ(z);

      // Check if phone is face-down (sujood position)
      // Z < -9.5 means gravity is pulling from top (phone face down)
      const isInSujoodPosition = z < SUJOOD_THRESHOLD;

      if (isInSujoodPosition) {
        consecutiveCountRef.current++;

        // Require consecutive readings to avoid false positives
        if (consecutiveCountRef.current >= DEBOUNCE_COUNT && !wasInSujoodRef.current) {
          detectSujood();
        }
      } else {
        consecutiveCountRef.current = 0;
        // User has lifted from sujood position
        if (wasInSujoodRef.current && !inCooldown) {
          wasInSujoodRef.current = false;
        }
      }
    },
    [detectSujood, inCooldown]
  );

  // Start listening
  const start = useCallback(() => {
    if (!isAvailable) {
      // Sensor not available, touch mode will be used
      setIsListening(false);
      return;
    }

    // Set update interval
    Accelerometer.setUpdateInterval(SENSOR_INTERVAL_MS);

    // Subscribe to accelerometer
    subscriptionRef.current = Accelerometer.addListener(handleAccelerometerData);
    setIsListening(true);
  }, [isAvailable, handleAccelerometerData]);

  // Stop listening
  const stop = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
    setIsListening(false);
    consecutiveCountRef.current = 0;
    wasInSujoodRef.current = false;
  }, []);

  // Reset count
  const reset = useCallback(() => {
    setSujoodCount(0);
    consecutiveCountRef.current = 0;
    wasInSujoodRef.current = false;
    lastSujoodTimeRef.current = 0;
    setInCooldown(false);
    if (cooldownTimerRef.current) {
      clearTimeout(cooldownTimerRef.current);
    }
  }, []);

  // Manual tap (touch fallback) - works on both iOS and Android
  const manualTap = useCallback(() => {
    const now = Date.now();

    // Check cooldown
    if (now - lastSujoodTimeRef.current < COOLDOWN_MS) {
      return;
    }

    lastSujoodTimeRef.current = now;
    setSujoodCount((prev) => prev + 1);
    playFeedback();

    // Set cooldown state
    setInCooldown(true);
    if (cooldownTimerRef.current) {
      clearTimeout(cooldownTimerRef.current);
    }
    cooldownTimerRef.current = setTimeout(() => {
      setInCooldown(false);
    }, COOLDOWN_MS);
  }, [playFeedback]);

  return {
    sujoodCount,
    isAvailable,
    isListening,
    inCooldown,
    currentZ,
    start,
    stop,
    reset,
    manualTap,
  };
}
