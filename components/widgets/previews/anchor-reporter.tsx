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
import { View, type LayoutChangeEvent, type ViewStyle } from 'react-native';

import {
  useAnchorRegistrar,
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
  const register = useAnchorRegistrar();
  const reportedRef = React.useRef(false);

  const onLayout = React.useCallback(
    (e: LayoutChangeEvent) => {
      if (!capturing || reportedRef.current) return;
      const { x, y, width, height } = e.nativeEvent.layout;
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
    },
    [
      capturing,
      register,
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
      onLayout={capturing ? onLayout : undefined}
      style={[
        // Important: when capturing, opacity:0 hides the visible glyphs but
        // keeps layout — the same trick used by the existing DynamicTimeText.
        capturing ? { opacity: 0 } : null,
        props.style,
      ]}
    >
      {props.children}
    </View>
  );
}
