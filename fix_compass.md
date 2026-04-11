# Fix Compass: Qibla Arrow Accuracy Plan

## Problem
The Qibla compass arrow doesn't track phone movements accurately — it's laggy, bouncy, and doesn't match real-time device rotation.

## Root Causes
1. **Low update frequency (~1Hz)** — `Location.watchHeadingAsync()` from expo-location updates too slowly
2. **No sensor smoothing** — raw heading values feed directly into animation, causing jitter
3. **Overly springy animation** — `withSpring({ damping: 28, stiffness: 170 })` creates visible lag/bounce
4. **No tilt compensation** — heading inaccurate when phone isn't perfectly flat
5. **No calibration feedback** — user unaware of poor magnetometer quality

## Solution

### Phase 1: High-Frequency Sensor Fusion (core fix)

**New hook: `hooks/use-compass-heading.ts`**
- Subscribes to `Magnetometer` + `Accelerometer` at 60Hz via `expo-sensors`
- Computes **tilt-compensated heading** using cross-product projection:
  - Normalize accelerometer → gravity vector
  - Project magnetometer onto horizontal plane: `E = M × G`
  - Heading = `atan2(Ex, Nx)` where `N = G × E`
- Applies **exponential moving average (EMA)** low-pass filter (α = 0.25) with circular wrap-around
- Obtains **magnetic declination** from a single `Location.watchHeadingAsync()` reading for true-north correction
- **Fallback:** gracefully uses `Location.watchHeadingAsync()` if Magnetometer unavailable
- Tracks compass accuracy (low/medium/high) from heading variance

### Phase 2: Tighter Animation

- Replaced `withSpring({ damping: 28, stiffness: 170, mass: 1 })` → `withTiming({ duration: 80ms })`
- The EMA filter handles smoothness; animation just needs to track fast

### Phase 3: Calibration UI

- Shows calibration banner when accuracy is 'low': "حرّك هاتفك بشكل ∞ لمعايرة البوصلة"
- Auto-hides when accuracy improves to 'medium' or 'high'

## Files Changed
- `hooks/use-compass-heading.ts` — **NEW** — sensor fusion hook
- `app/(tabs)/qibla.tsx` — integrated hook, removed old heading subscription, added calibration banner

## Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| Sensor update rate | ~1Hz (expo-location) | 60Hz (expo-sensors Magnetometer) |
| Smoothing | None | EMA filter (α=0.25) |
| Animation | `withSpring` (bouncy, laggy) | `withTiming(80ms)` (tight tracking) |
| Tilt compensation | None | Accelerometer-based horizontal projection |
| True north | From heading API (when available) | Magnetic declination offset cached |
| Calibration feedback | None | Banner when accuracy is low |

## Verification Checklist
- [ ] Rotate phone slowly 360° — arrow tracks in real-time, no bounce/lag
- [ ] Phone on flat surface — compass stable, no jitter
- [ ] Phone tilted 30-45° — heading remains accurate
- [ ] Rotate past 0°/360° boundary — no jumps or snapping
- [ ] Compare with iOS built-in compass — same direction
- [ ] Calibration banner appears with uncalibrated sensor
- [ ] Sensors unavailable → falls back to Location.watchHeadingAsync gracefully
- [ ] Build on iOS Simulator — no crashes or Metro errors
