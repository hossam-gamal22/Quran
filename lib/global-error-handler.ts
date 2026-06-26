// lib/global-error-handler.ts
// ─────────────────────────────────────────────────────────────────────────────
// Last-resort JS safety net for the whole app.
//
// WHY THIS EXISTS
// The React <ErrorBoundary> in app/_layout.tsx only catches errors thrown
// DURING React rendering/lifecycle of its CHILDREN. It does NOT catch:
//   • errors thrown in setTimeout / setInterval callbacks
//   • errors thrown in native-module event listeners (AppState, Notifications…)
//   • unhandled promise rejections (a `.then()` chain with no `.catch()`)
//   • a native module that rejects/throws asynchronously
//   • a synchronous throw inside RootLayout's OWN effects (the boundary is its
//     child, so it can't catch its parent)
//
// Any one of those becomes a *fatal* uncaught error, and in a production build
// RN's default global handler terminates the process — the app "closes itself".
// Because it depends on data / timing / network / native state, it shows up as
// an INTERMITTENT crash on launch.
//
// This module installs a global handler (the documented, stable RN API) that:
//   1. Logs every JS error and persists a crash breadcrumb to AsyncStorage so the
//      real root cause is finally observable on the next launch (the app has no
//      Crashlytics/Sentry).
//   2. In production, CONTAINS fatal errors instead of hard-killing the app, with
//      a loop guard so a genuinely broken VM still surfaces rather than zombies.
//   3. Captures unhandled promise rejections for the same visibility.
//
// In development it preserves the redbox so real bugs stay loud and fixable.
//
// Imported FIRST in index.js (before expo-router/entry) so the net is in place
// before any other module runs.
// ─────────────────────────────────────────────────────────────────────────────

import { Platform } from 'react-native';

/** AsyncStorage key holding the most recent uncaught crash breadcrumb. */
export const LAST_CRASH_KEY = '@rooh_last_crash';

// Total fatal errors we are willing to swallow before we stop containing them
// and let the platform surface a genuinely-broken VM. Generous enough to absorb
// a single bad startup path, small enough to never become a permanent zombie.
const MAX_CONTAINED_FATALS = 6;
let containedFatals = 0;

function persistCrash(error: unknown, isFatal: boolean, source: string): void {
  try {
    // Lazy require keeps this module free of import cycles and lets it load
    // before the JS bundle has finished wiring everything up.
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const err = error as any;
    // Capture the breadcrumb trail (route/audio/memory/appstate run-up) while
    // the JS VM is still alive. This is what turns an otherwise-context-free
    // crash report into something diagnosable — see lib/diagnostics-breadcrumbs.
    let breadcrumbs = '';
    try {
      breadcrumbs = require('./diagnostics-breadcrumbs').formatBreadcrumbs();
    } catch {
      // Breadcrumb module unavailable — proceed without the trail.
    }
    const payload = JSON.stringify({
      message: String(err?.message ?? err ?? 'unknown'),
      stack: String(err?.stack ?? '').slice(0, 4000),
      isFatal,
      source,
      breadcrumbs,
      platform: Platform.OS,
      ts: Date.now(),
      iso: new Date().toISOString(),
    });
    // Fire-and-forget — never let logging throw.
    AsyncStorage.setItem(LAST_CRASH_KEY, payload).catch(() => {});
  } catch {
    // Storage unavailable — nothing else we can safely do here.
  }
}

/**
 * Read (and clear) the last persisted crash breadcrumb. Call once on the next
 * launch to log/inspect/upload the real cause of the previous intermittent
 * crash. Returns null when there was no recorded crash.
 */
export async function consumeLastCrash(): Promise<{
  message: string;
  stack: string;
  isFatal: boolean;
  source: string;
  /** Compact breadcrumb trail of the run-up to the crash (may be ''). */
  breadcrumbs?: string;
  platform: string;
  ts: number;
  iso: string;
} | null> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const raw = await AsyncStorage.getItem(LAST_CRASH_KEY);
    if (!raw) return null;
    await AsyncStorage.removeItem(LAST_CRASH_KEY).catch(() => {});
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

function installUncaughtErrorHandler(): void {
  const g: any = global as any;
  const ErrorUtilsRef = g.ErrorUtils;
  if (!ErrorUtilsRef?.setGlobalHandler) return;

  const original =
    typeof ErrorUtilsRef.getGlobalHandler === 'function'
      ? ErrorUtilsRef.getGlobalHandler()
      : undefined;

  ErrorUtilsRef.setGlobalHandler((error: any, isFatal?: boolean) => {
    const fatal = !!isFatal;

    try {
      persistCrash(error, fatal, 'errorutils');
      // eslint-disable-next-line no-console
      console.error(
        `[GlobalError]${fatal ? ' FATAL' : ''}:`,
        error?.message ?? error,
      );
    } catch {
      // ignore — logging must never re-throw
    }

    // Dev: keep the redbox so real errors stay visible and get fixed.
    if (__DEV__) {
      original?.(error, isFatal);
      return;
    }

    // Non-fatal in production: log only, never terminate.
    if (!fatal) {
      original?.(error, false);
      return;
    }

    // Fatal in production: contain it so a single uncaught error doesn't close
    // the app. Most fatals reaching here originate OUTSIDE the React render tree
    // (timers, native callbacks, stray rejections), so the UI generally stays
    // usable. Loop guard prevents a truly-broken VM from becoming a zombie.
    containedFatals += 1;
    if (containedFatals <= MAX_CONTAINED_FATALS) {
      // Deliberately do NOT delegate to the original fatal handler (which would
      // terminate the process). Swallow + keep the app alive.
      return;
    }

    // Too many fatals in this session — likely genuinely corrupted. Let the
    // platform handle it rather than masking a broken state forever.
    original?.(error, true);
  });
}

function installUnhandledRejectionTracking(): void {
  try {
    // RN ships the `promise` polyfill; this is the same hook RN itself uses to
    // log unhandled rejections in dev. Enabling it in production gives us
    // visibility into stray `.then()` chains that never got a `.catch()`.
    // Wrapped in try/catch because the internal path can vary across versions.
    const tracking = require('promise/setimmediate/rejection-tracking');
    tracking.enable({
      allRejections: true,
      onUnhandled: (id: number, error: unknown) => {
        try {
          persistCrash(error, false, 'unhandled-rejection');
          // eslint-disable-next-line no-console
          console.warn(
            '[GlobalError] Unhandled promise rejection:',
            (error as any)?.message ?? error,
          );
        } catch {
          // ignore
        }
      },
      onHandled: () => {
        // No-op: a late-handled rejection is not actionable here.
      },
    });
  } catch {
    // Rejection tracker unavailable — non-fatal; the ErrorUtils handler above
    // still covers fatal escalations.
  }
}

export function installGlobalErrorHandler(): void {
  const g: any = global as any;
  // Idempotent: Fast Refresh / multiple imports must not stack handlers.
  if (g.__roohGlobalHandlerInstalled) return;
  g.__roohGlobalHandlerInstalled = true;

  installUncaughtErrorHandler();
  installUnhandledRejectionTracking();
}

// Install immediately on import.
installGlobalErrorHandler();
