// hooks/use-compass-heading.ts
// High-frequency compass heading using Magnetometer + Accelerometer (expo-sensors)
// with tilt compensation, EMA low-pass filter, and true-north declination correction.
// Falls back to Location.watchHeadingAsync if sensors unavailable.

import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { Magnetometer, Accelerometer } from 'expo-sensors';
import * as Location from 'expo-location';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type CompassAccuracy = 'low' | 'medium' | 'high';

export interface CompassHeadingResult {
  /** Cumulative heading shared value (degrees, true north) — use directly in useAnimatedStyle */
  headingCumulative: ReturnType<typeof useSharedValue<number>>;
  /** Current accuracy estimate */
  accuracy: CompassAccuracy;
  /** Whether the magnetometer sensor is available */
  isAvailable: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const SENSOR_INTERVAL_MS = 16;  // ~60 Hz
const EMA_ALPHA = 0.25;         // Low-pass filter strength (0..1, higher = more responsive)
const ANIMATION_DURATION_MS = 80; // Fast tracking — filter handles smoothness

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compute tilt-compensated heading from raw magnetometer + accelerometer data.
 *  Returns degrees 0..360 from magnetic north. */
function computeTiltCompensatedHeading(
  mx: number, my: number, mz: number,
  ax: number, ay: number, az: number,
): number {
  // Normalize accelerometer (gravity vector)
  const aNorm = Math.sqrt(ax * ax + ay * ay + az * az) || 1;
  const gx = ax / aNorm;
  const gy = ay / aNorm;
  const gz = az / aNorm;

  // Project magnetic vector onto horizontal plane using cross products
  // East = M × G (cross product of magnetometer and gravity)
  const ex = my * gz - mz * gy;
  const ey = mz * gx - mx * gz;
  // North = G × E (cross product of gravity and east)
  const nx = gy * ey - gz * (-ex); // simplified: G × E
  const ny = gz * ex - gx * ey;    // note: ez was computed but we only need 2D heading

  // Recompute properly:
  // East vector E = M × G
  const Ex = my * gz - mz * gy;
  const Ey = mz * gx - mx * gz;
  const Ez = mx * gy - my * gx;
  // North vector N = G × E
  const Nx = gy * Ez - gz * Ey;
  const Ny = gz * Ex - gx * Ez;

  // Heading = atan2(East dot device-forward, North dot device-forward)
  // For a phone held upright or flat, device-forward is +Y axis on iOS, -Y on Android
  // On expo-sensors: x=right, y=up, z=toward-face (iOS standard)
  // For flat phone: forward ≈ (0, 1, 0)
  // heading = atan2(Ex, Nx) gives heading in radians
  let heading = Math.atan2(Ex, Nx) * (180 / Math.PI);

  // Platform correction: Android reports sensor axes differently
  if (Platform.OS === 'android') {
    heading = Math.atan2(Ey, Ny) * (180 / Math.PI);
  }

  return ((heading % 360) + 360) % 360;
}

/** Apply EMA filter with circular wrap-around (handles 359° → 1° transitions) */
function circularEMA(prev: number, curr: number, alpha: number): number {
  let delta = curr - prev;
  // Wrap-around correction
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return ((prev + alpha * delta) % 360 + 360) % 360;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useCompassHeading(): CompassHeadingResult {
  const headingCumulative = useSharedValue(0);
  const targetCumulative = useRef(0);
  const lastFilteredHeading = useRef(0);
  const lastRawHeading = useRef(0);
  const isFirstReading = useRef(true);

  // Declination offset for true north
  const declination = useRef(0);
  const declinationResolved = useRef(false);

  // Sensor data refs (updated at 60Hz, combined for heading calc)
  const latestMag = useRef({ x: 0, y: 0, z: 0 });
  const latestAccel = useRef({ x: 0, y: 0, z: 0 });
  const hasMagData = useRef(false);
  const hasAccelData = useRef(false);

  // Accuracy tracking
  const accuracyRef = useRef<CompassAccuracy>('medium');
  const headingVarianceBuffer = useRef<number[]>([]);

  // Availability
  const isAvailableRef = useRef(true);
  const usingFallback = useRef(false);

  // Process a new heading value (shared between sensor fusion and fallback)
  const processHeading = useCallback((rawHeading: number) => {
    if (isFirstReading.current) {
      isFirstReading.current = false;
      lastFilteredHeading.current = rawHeading;
      lastRawHeading.current = rawHeading;
      targetCumulative.current = rawHeading;
      headingCumulative.value = rawHeading;
      return;
    }

    // Apply EMA filter
    const filtered = circularEMA(lastFilteredHeading.current, rawHeading, EMA_ALPHA);
    lastFilteredHeading.current = filtered;

    // Compute cumulative delta to avoid 360→0 wrap-around in animation
    let delta = filtered - lastRawHeading.current;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    lastRawHeading.current = filtered;

    targetCumulative.current += delta;
    headingCumulative.value = withTiming(targetCumulative.current, {
      duration: ANIMATION_DURATION_MS,
    });

    // Track accuracy from heading variance
    headingVarianceBuffer.current.push(rawHeading);
    if (headingVarianceBuffer.current.length > 30) {
      headingVarianceBuffer.current.shift();
      const buf = headingVarianceBuffer.current;
      // Compute circular variance
      let sinSum = 0, cosSum = 0;
      for (const h of buf) {
        sinSum += Math.sin(h * Math.PI / 180);
        cosSum += Math.cos(h * Math.PI / 180);
      }
      const R = Math.sqrt(sinSum * sinSum + cosSum * cosSum) / buf.length;
      // R close to 1 = stable, close to 0 = noisy
      if (R > 0.95) accuracyRef.current = 'high';
      else if (R > 0.8) accuracyRef.current = 'medium';
      else accuracyRef.current = 'low';
    }
  }, [headingCumulative]);

  // Compute heading from latest sensor data
  const computeAndProcessHeading = useCallback(() => {
    if (!hasMagData.current || !hasAccelData.current) return;

    const { x: mx, y: my, z: mz } = latestMag.current;
    const { x: ax, y: ay, z: az } = latestAccel.current;

    let heading = computeTiltCompensatedHeading(mx, my, mz, ax, ay, az);

    // Apply magnetic declination for true north
    if (declinationResolved.current) {
      heading = ((heading + declination.current) % 360 + 360) % 360;
    }

    processHeading(heading);
  }, [processHeading]);

  useEffect(() => {
    let magSub: { remove: () => void } | null = null;
    let accelSub: { remove: () => void } | null = null;
    let headingSub: Location.LocationSubscription | null = null;
    let mounted = true;

    (async () => {
      // --- Try to get magnetic declination from Location heading ---
      try {
        const tempSub = await Location.watchHeadingAsync((data) => {
          if (!mounted || declinationResolved.current) return;
          if (data.trueHeading >= 0 && data.magHeading >= 0) {
            declination.current = data.trueHeading - data.magHeading;
            declinationResolved.current = true;
          }
          // Keep the subscription briefly to get at least one reading
          setTimeout(() => {
            tempSub?.remove();
          }, 2000);
        });
        // Clean up after 3s if still running
        setTimeout(() => { try { tempSub?.remove(); } catch {} }, 3000);
      } catch {
        // No location heading available — continue with magnetic north only
      }

      // --- Try Magnetometer + Accelerometer (primary) ---
      const magAvailable = await Magnetometer.isAvailableAsync().catch(() => false);
      const accelAvailable = await Accelerometer.isAvailableAsync().catch(() => false);

      if (magAvailable && accelAvailable) {
        // Set update intervals
        Magnetometer.setUpdateInterval(SENSOR_INTERVAL_MS);
        Accelerometer.setUpdateInterval(SENSOR_INTERVAL_MS);

        // Subscribe to magnetometer
        magSub = Magnetometer.addListener((data) => {
          if (!mounted) return;
          latestMag.current = data;
          hasMagData.current = true;
          // Compute heading on each mag update (60Hz)
          computeAndProcessHeading();
        });

        // Subscribe to accelerometer
        accelSub = Accelerometer.addListener((data) => {
          if (!mounted) return;
          latestAccel.current = data;
          hasAccelData.current = true;
        });
      } else {
        // --- Fallback: Location.watchHeadingAsync (~1Hz) ---
        isAvailableRef.current = false;
        usingFallback.current = true;

        try {
          headingSub = await Location.watchHeadingAsync((headingData) => {
            if (!mounted) return;
            const newHeading = headingData.trueHeading >= 0
              ? headingData.trueHeading
              : headingData.magHeading;
            processHeading(newHeading);
          });
        } catch {
          // Sensor completely unavailable
        }
      }
    })();

    return () => {
      mounted = false;
      magSub?.remove();
      accelSub?.remove();
      headingSub?.remove();
    };
  }, [computeAndProcessHeading, processHeading]);

  return {
    headingCumulative,
    accuracy: accuracyRef.current,
    isAvailable: isAvailableRef.current,
  };
}
