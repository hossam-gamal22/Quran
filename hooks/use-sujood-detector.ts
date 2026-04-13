// hooks/use-sujood-detector.ts
// Sujood detector with dual-sensor system:
// PRIMARY: Native proximity sensor (hand/face near phone)
// FALLBACK: Accelerometer Z-axis (phone face-down detection)

import { useCallback, useEffect, useRef, useState } from 'react';
import { Accelerometer, AccelerometerMeasurement } from 'expo-sensors';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { ProximitySensor } from '@/modules/proximity-sensor';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
// Proximity sensor
const PROXIMITY_SUJOOD_MIN_MS = 500; // Must be near for 500ms to count as sujood

// Accelerometer (fallback)
const SENSOR_INTERVAL_MS = 50; // 20Hz - enough for sujood detection
const SUJOOD_THRESHOLD = -9.5; // Z-axis threshold for face-down detection
const DEBOUNCE_COUNT = 3; // Number of consecutive readings to confirm sujood

// Shared
const COOLDOWN_MS = 800; // Minimum time between sujood detections

// Sound asset for feedback
const SUJOOD_SOUND = require('@/assets/sounds/effects/tasbih_click.mp3');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type SensorMode = 'proximity' | 'accelerometer' | 'touch';

export interface SujoodDetectorState {
  /** Number of sujood detected */
  sujoodCount: number;
  /** Whether a hardware sensor is available */
  isAvailable: boolean;
  /** Whether detector is actively listening */
  isListening: boolean;
  /** Whether in cooldown period (just detected a sujood) */
  inCooldown: boolean;
  /** Current Z-axis value (for debugging, accelerometer only) */
  currentZ: number;
  /** Active sensor mode */
  sensorMode: SensorMode;
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
  const [sensorMode, setSensorMode] = useState<SensorMode>('touch');

  // Refs for non-reactive state
  const accelSubscriptionRef = useRef<ReturnType<typeof Accelerometer.addListener> | null>(null);
  const proximitySubscriptionRef = useRef<{ remove: () => void } | null>(null);
  const consecutiveCountRef = useRef(0);
  const lastSujoodTimeRef = useRef(0);
  const wasInSujoodRef = useRef(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nearStartTimeRef = useRef(0);
  const isNearRef = useRef(false);
  const proximityAvailableRef = useRef(false);
  const accelAvailableRef = useRef(false);
  const sensorModeRef = useRef<SensorMode>('touch');

  // Check sensor availability on mount
  useEffect(() => {
    let mounted = true;

    const checkSensors = async () => {
      // Check proximity sensor first (preferred)
      let hasProximity = false;
      try {
        hasProximity = ProximitySensor.isAvailable();
      } catch {
        hasProximity = false;
      }
      proximityAvailableRef.current = hasProximity;

      // Check accelerometer as fallback
      let hasAccel = false;
      try {
        hasAccel = await Accelerometer.isAvailableAsync();
      } catch {
        hasAccel = false;
      }
      accelAvailableRef.current = hasAccel;

      if (!mounted) return;

      if (hasProximity) {
        setSensorMode('proximity');
        sensorModeRef.current = 'proximity';
        setIsAvailable(true);
      } else if (hasAccel) {
        setSensorMode('accelerometer');
        sensorModeRef.current = 'accelerometer';
        setIsAvailable(true);
      } else {
        setSensorMode('touch');
        sensorModeRef.current = 'touch';
        setIsAvailable(false);
      }
    };

    checkSensors();

    // Cleanup on unmount
    return () => {
      mounted = false;
      if (accelSubscriptionRef.current) {
        accelSubscriptionRef.current.remove();
      }
      if (proximitySubscriptionRef.current) {
        proximitySubscriptionRef.current.remove();
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (soundRef.current) {
        await soundRef.current.setPositionAsync(0);
        await soundRef.current.playAsync();
      }
    } catch {
      // Sound play failed, haptic still works
    }
  }, []);

  // Core sujood detection (shared by all sensor modes)
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

  // ---------------------------------------------------------------------------
  // Proximity sensor handler
  // ---------------------------------------------------------------------------
  const handleProximityChange = useCallback(
    (event: { isNear: boolean }) => {
      const { isNear } = event;

      if (isNear) {
        // Started being near — record start time
        nearStartTimeRef.current = Date.now();
        isNearRef.current = true;
      } else {
        // Moved away — check if was near long enough
        if (isNearRef.current && nearStartTimeRef.current > 0) {
          const duration = Date.now() - nearStartTimeRef.current;
          if (
            duration >= PROXIMITY_SUJOOD_MIN_MS &&
            Date.now() - lastSujoodTimeRef.current > COOLDOWN_MS
          ) {
            detectSujood();
          }
        }
        isNearRef.current = false;
        nearStartTimeRef.current = 0;
      }
    },
    [detectSujood]
  );

  // ---------------------------------------------------------------------------
  // Accelerometer handler (fallback)
  // ---------------------------------------------------------------------------
  const handleAccelerometerData = useCallback(
    (data: AccelerometerMeasurement) => {
      const { z } = data;
      setCurrentZ(z);

      const isInSujoodPosition = z < SUJOOD_THRESHOLD;

      if (isInSujoodPosition) {
        consecutiveCountRef.current++;

        if (consecutiveCountRef.current >= DEBOUNCE_COUNT && !wasInSujoodRef.current) {
          detectSujood();
        }
      } else {
        consecutiveCountRef.current = 0;
        if (wasInSujoodRef.current && !inCooldown) {
          wasInSujoodRef.current = false;
        }
      }
    },
    [detectSujood, inCooldown]
  );

  // Start listening
  const start = useCallback(() => {
    const mode = sensorModeRef.current;

    if (mode === 'proximity') {
      proximitySubscriptionRef.current = ProximitySensor.addListener(handleProximityChange);
      ProximitySensor.startMonitoring();
      setIsListening(true);
    } else if (mode === 'accelerometer') {
      Accelerometer.setUpdateInterval(SENSOR_INTERVAL_MS);
      accelSubscriptionRef.current = Accelerometer.addListener(handleAccelerometerData);
      setIsListening(true);
    } else {
      // Touch mode — no sensor to start
      setIsListening(false);
    }
  }, [handleProximityChange, handleAccelerometerData]);

  // Stop listening
  const stop = useCallback(() => {
    if (proximitySubscriptionRef.current) {
      proximitySubscriptionRef.current.remove();
      proximitySubscriptionRef.current = null;
      ProximitySensor.stopMonitoring();
    }
    if (accelSubscriptionRef.current) {
      accelSubscriptionRef.current.remove();
      accelSubscriptionRef.current = null;
    }
    setIsListening(false);
    consecutiveCountRef.current = 0;
    wasInSujoodRef.current = false;
    isNearRef.current = false;
    nearStartTimeRef.current = 0;
  }, []);

  // Reset count
  const reset = useCallback(() => {
    setSujoodCount(0);
    consecutiveCountRef.current = 0;
    wasInSujoodRef.current = false;
    lastSujoodTimeRef.current = 0;
    isNearRef.current = false;
    nearStartTimeRef.current = 0;
    setInCooldown(false);
    if (cooldownTimerRef.current) {
      clearTimeout(cooldownTimerRef.current);
    }
  }, []);

  // Manual tap (touch fallback) - works on all platforms
  const manualTap = useCallback(() => {
    const now = Date.now();

    if (now - lastSujoodTimeRef.current < COOLDOWN_MS) {
      return;
    }

    lastSujoodTimeRef.current = now;
    setSujoodCount((prev) => prev + 1);
    playFeedback();

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
    sensorMode,
    start,
    stop,
    reset,
    manualTap,
  };
}
