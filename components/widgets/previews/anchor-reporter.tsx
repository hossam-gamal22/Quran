// components/widgets/previews/anchor-reporter.tsx
//
// One component, two jobs depending on the snapshot-capture context:
//
//   • Gallery path (`capturing === false`): renders the `live` child node
//     normally. This is what the user sees in the in-app Widget Gallery.
//
//   • Capture path (`capturing === true`): renders a transparent placeholder
//     sized identically to the live child (so the surrounding flex layout is
//     unchanged), measures its on-screen rect via `onLayout`, and reports the
//     anchor (id + rect + font + alignment + direction + color) to the
//     snapshot orchestrator via `registerAnchor`. The orchestrator then writes
//     all anchors to a single JSON file next to the captured PNG.
//
// The native widget extension reads the JSON and draws SwiftUI Text at the
// recorded rect using the recorded font / color / alignment / direction, so
// the rendered overlay sits exactly where the gallery would have rendered
// the live value. No hand-tuned anchors.
//
// Naming convention for anchor ids (kept stable so the iOS side can switch
// on them deterministically):
//
//   • currentTime                       — DayDigital current-time hero
//   • prayerHeroTime                    — large prayer time (single/table hero)
//   • prayerHeroCountdown               — compact countdown next to/under hero
//   • prayerRowTime.<key>               — fajr/sunrise/dhuhr/asr/maghrib/isha
//   • prayerPrevName / prayerPrevTime   — next/previous-prayer widget left side
//   • prayerNextName / prayerNextTime   — next/previous-prayer widget right side
//   • prayerSinceCountdown              — count-up since previous prayer
//   • prayerUntilCountdown              — count-down to next prayer
//   • dayNumber                         — gregorian day in date widgets
//   • hijriDay / hijriMonth / hijriYear — hijri date widget components
//   • monthName                         — month thuluth widget
//
// Add new ids freely; the iOS renderer ignores ids it doesn't understand
// (logs a one-line warning in debug).

import React from 'react';
import { Platform, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';

import {
  useAnchorRegistrar,
  useBlankPrayerState,
  useSnapshotRootRef,
  useWidgetSnapshotCapture,
  type CaptureAnchor,
} from './snapshot-capture-context';

export interface AnchorReporterProps {
  /** Stable id (see naming convention above). */
  id: string;
  /** Font family for the live text. Native side passes this to SwiftUI
   *  `Font.custom(...)`. Keep it identical to the gallery font so the live
   *  overlay visually matches what the gallery shows. */
  fontFamily: string;
  /** Font size in dp. */
  fontSize: number;
  /** Logical weight token. Native side maps to `Font.Weight`. */
  fontWeight?: CaptureAnchor['fontWeight'];
  /** Foreground hex color. */
  color: string;
  /** Horizontal alignment inside the rect. */
  alignment?: CaptureAnchor['alignment'];
  /** Reading direction. RTL for Arabic, LTR for English. */
  direction?: CaptureAnchor['direction'];
  /** True when the live value is the compact-duration countdown string. */
  isCountdown?: boolean;
  /** Set on the prayer NAME anchors. On Android, non-countdown anchors are
   *  normally baked into the PNG; when this is set AND the gallery-pump capture
   *  context has `blankPrayerState` on, the name is blanked on Android too so the
   *  gallery fallback PNG draws the live name instead of a baked-stale one. Does
   *  nothing for the per-state template bake (which keeps the name baked). */
  blankOnAndroidCapture?: boolean;
  /** Measure-only: report the rect during capture but NEVER hide the children
   *  (no opacity:0). Used to record a region's bounds (e.g. a table row container
   *  `prayerRowBg.<key>`) while its baked content stays in the PNG, so the live
   *  overlay can position something — e.g. the active-row highlight — exactly. */
  measureOnly?: boolean;
  /** What the gallery renders. The capture path hides this and reserves
   *  the same rect so layout is preserved. */
  children: React.ReactNode;
  /** Optional style override on the wrapper. Most callers pass nothing. */
  style?: ViewStyle;
}

/**
 * Render `children` (gallery) OR reserve space + report anchor (capture).
 *
 * The wrapper sets `opacity: 0` in capture mode so the live text glyphs do
 * not appear in the PNG, but keeps the View in the layout tree so its rect
 * remains accurate.
 */
export function AnchorReporter(props: AnchorReporterProps): React.ReactElement {
  const capturing = useWidgetSnapshotCapture();
  const blankPrayerState = useBlankPrayerState();
  // Measure-only anchors report their rect but never hide their children.
  // iOS: every anchor is overlaid live (SwiftUI), so hide all during capture.
  // Android: anchors are baked into the PNG EXCEPT countdowns (always overlaid)
  // and — only in the gallery pump (`blankPrayerState`) — the prayer NAME anchors,
  // so the gallery fallback PNG draws the live name. Per-state template bakes
  // keep the name baked (blankPrayerState is false there).
  const hideDuringCapture = capturing && props.measureOnly !== true && (
    Platform.OS !== 'android'
      ? true
      : props.isCountdown === true || (props.blankOnAndroidCapture === true && blankPrayerState)
  );
  const register = useAnchorRegistrar();
  const rootRef = useSnapshotRootRef();
  const reportedRef = React.useRef(false);
  const selfRef = React.useRef<View>(null);

  const onLayout = React.useCallback(
    (e: LayoutChangeEvent) => {
      if (!capturing || reportedRef.current) return;
      const emit = (x: number, y: number, width: number, height: number) => {
        if (reportedRef.current) return;
        reportedRef.current = true;
        register({
          id: props.id,
          x,
          y,
          width,
          height,
          fontFamily: props.fontFamily,
          fontSize: props.fontSize,
          fontWeight: props.fontWeight ?? 'regular',
          color: props.color,
          alignment: props.alignment ?? 'center',
          direction: props.direction ?? 'ltr',
          isCountdown: props.isCountdown,
        });
      };
      // `onLayout` reports PARENT-relative coords. The manifest/native overlay
      // need FRAME-relative coords, so measure against the slot's root View when
      // available; fall back to the parent-relative layout otherwise.
      const self = selfRef.current as any;
      const root = rootRef?.current as any;
      const layout = e.nativeEvent.layout;
      // Fabric's measureLayout takes the relative ref instance; Paper accepts a
      // node handle. Pass the instance and fall back to the handle/parent rect.
      if (root && self?.measureLayout) {
        try {
          self.measureLayout(
            root,
            (x: number, y: number, width: number, height: number) => emit(x, y, width, height),
            () => emit(layout.x, layout.y, layout.width, layout.height),
          );
        } catch {
          emit(layout.x, layout.y, layout.width, layout.height);
        }
      } else {
        emit(layout.x, layout.y, layout.width, layout.height);
      }
    },
    [
      capturing,
      register,
      rootRef,
      props.id,
      props.fontFamily,
      props.fontSize,
      props.fontWeight,
      props.color,
      props.alignment,
      props.direction,
      props.isCountdown,
    ],
  );

  return (
    <View
      ref={selfRef}
      onLayout={capturing ? onLayout : undefined}
      style={[
        // Important: when capturing, opacity:0 hides the visible glyphs but
        // keeps layout — the same trick used by the existing DynamicTimeText.
        hideDuringCapture ? { opacity: 0 } : null,
        props.style,
      ]}
    >
      {props.children}
    </View>
  );
}
