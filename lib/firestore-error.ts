// lib/firestore-error.ts
// Helpers for handling transient/recoverable Firestore connectivity errors.
//
// At cold start (or on any network blip) the Firestore JS SDK can fail to reach
// the backend within its ~10s timeout. Every in-flight getDoc/onSnapshot then
// rejects with a benign "client is offline" / "Could not reach Cloud Firestore
// backend" error (code: 'unavailable'). Firestore retries automatically and the
// app serves cached config from AsyncStorage, so these are NOT fatal — but
// logging them via console.error pops React Native's red LogBox overlay and
// produces a cascade of scary error screens. Use logFirestoreError() instead so
// recoverable offline errors are downgraded to a quiet warning.

/**
 * True when the error is a recoverable Firestore connectivity issue
 * (device offline, backend unreachable, request timed out) rather than a real
 * bug (bad query, permission denied, malformed data).
 */
export const isOfflineFirestoreError = (error: unknown): boolean => {
  const code = (error as { code?: string } | null)?.code;
  if (code === 'unavailable' || code === 'deadline-exceeded') return true;

  const message = String((error as { message?: string } | null)?.message || error || '');
  return (
    message.includes('client is offline') ||
    message.includes('Could not reach Cloud Firestore backend') ||
    message.includes('Failed to get document because the client is offline') ||
    message.includes('The operation could not be completed')
  );
};

/**
 * Log a Firestore error at the appropriate level: a quiet warning for benign
 * offline/timeout conditions, a real console.error for everything else.
 */
export const logFirestoreError = (context: string, error: unknown): void => {
  if (isOfflineFirestoreError(error)) {
    if (__DEV__) {
      console.warn(`📴 ${context} — Firestore offline, will retry & use cache`);
    }
    return;
  }
  console.error(`❌ ${context}:`, error);
};
