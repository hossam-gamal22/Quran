// lib/diagnostics-breadcrumbs.ts
// ─────────────────────────────────────────────────────────────────────────────
// Lightweight, dependency-free breadcrumb ring buffer.
//
// WHY THIS EXISTS
// The app already persists the LAST uncaught error (lib/global-error-handler.ts)
// and uploads it to Firestore `crashLogs`. But a bare message + stack rarely
// tells you WHERE the user was or WHAT they were doing when an intermittent
// "the app closed by itself" happened — and many of those closures are NATIVE
// (TrackPlayer on New Arch, Skia, expo-av, ads, OOM) and never even produce a JS
// stack. Without context they're effectively undiagnosable from the dashboard.
//
// This module keeps an in-memory ring of the most recent lifecycle/navigation/
// audio/memory events. The global error handler reads it synchronously while
// persisting a crash (the JS VM is still alive at that point), so the recorded
// trail — e.g. "nav:/surah/18 → audio:azkar-play → memory:warning → CRASH" — is
// attached to the breadcrumb and uploaded with the next launch's crash report.
//
// Design constraints:
//   • NO imports beyond react-native primitives — this is imported from
//     global-error-handler.ts, which loads before the JS bundle is fully wired,
//     so it must never introduce an import cycle or pull in heavy modules.
//   • Pure module scope. Cheap O(1) push. Bounded memory (ring of N).
//   • Every public fn is try/catch-free-safe: it can never throw into a caller.
// ─────────────────────────────────────────────────────────────────────────────

export type BreadcrumbType =
  | 'nav'        // route change
  | 'appstate'   // foreground/background/inactive
  | 'memory'     // iOS memoryWarning / low-memory signal
  | 'audio'      // audio source started/stopped
  | 'deeplink'   // deep link / notification navigation
  | 'lifecycle'  // generic app lifecycle milestone
  | 'error';     // a contained/handled error worth trailing

export interface Breadcrumb {
  /** Epoch ms when recorded. */
  ts: number;
  type: BreadcrumbType;
  /** Short human-readable message. Kept compact — long values are truncated. */
  msg: string;
}

// Bounded ring. Small enough to upload inline with a crash doc, large enough to
// capture the run-up to a crash (a few screen transitions + the triggering op).
const MAX_BREADCRUMBS = 30;
const MSG_MAX_LEN = 120;

const ring: Breadcrumb[] = [];

/**
 * Record one breadcrumb. Never throws. Safe to call from anywhere, including
 * native event callbacks and timers.
 */
export function addBreadcrumb(type: BreadcrumbType, msg: string): void {
  try {
    const entry: Breadcrumb = {
      ts: Date.now(),
      type,
      msg: String(msg ?? '').slice(0, MSG_MAX_LEN),
    };
    ring.push(entry);
    if (ring.length > MAX_BREADCRUMBS) ring.shift();
  } catch {
    // A diagnostics primitive must never become a crash source itself.
  }
}

/** Snapshot of the current trail, oldest → newest. Never throws. */
export function getBreadcrumbs(): Breadcrumb[] {
  try {
    return ring.slice();
  } catch {
    return [];
  }
}

/**
 * Compact single-line representation, e.g.
 *   "nav:/(tabs)/quran | audio:azkar-play | memory:warning | appstate:background"
 * Suitable for a single Firestore field / logcat line.
 */
export function formatBreadcrumbs(max = MAX_BREADCRUMBS): string {
  try {
    return ring
      .slice(-max)
      .map((b) => `${b.type}:${b.msg}`)
      .join(' | ')
      .slice(0, 1800);
  } catch {
    return '';
  }
}

/** Clear the trail. Currently unused in prod; handy for tests. */
export function clearBreadcrumbs(): void {
  try {
    ring.length = 0;
  } catch {
    // ignore
  }
}
