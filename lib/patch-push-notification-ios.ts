// lib/patch-push-notification-ios.ts
// ─────────────────────────────────────────────────────────────────────────────
// Root fix for a CONFIRMED production FATAL (seen in crashLogs, iOS, v1.2.4):
//
//   Invariant Violation: `new NativeEventEmitter()` requires a non-null argument
//     at NativeEventEmitter
//     at <PushNotificationIOS module factory>
//     at metroRequire
//     at get PushNotificationIOS         ← react-native/index.js
//
// WHY IT HAPPENS
// React Native still exposes a DEPRECATED, *enumerable* lazy getter
// `PushNotificationIOS` on the `react-native` module (it was extracted to
// `@react-native-community/push-notification-ios`). When ANYTHING reads that
// property — most often an `Object.keys(require('react-native'))` / spread /
// for-in enumeration done by some dependency or tooling — the getter runs the
// legacy module's factory, which does `new NativeEventEmitter(NativeModule)`.
// In an Expo SDK 54 build that native module is NOT compiled in (we use
// `expo-notifications`, not the legacy API), so the argument is `null` and the
// invariant throws a FATAL.
//
// THE FIX
// Replace the throwing, enumerable getter with a non-enumerable, inert stub
// BEFORE any code can enumerate the module. Non-enumerable means enumerations
// no longer even visit it; the stub means any (currently non-existent) direct
// use of the legacy API degrades to a harmless no-op instead of crashing.
//
// Imported from index.js immediately after the global error handler and before
// `expo-router/entry`, so the getter is neutralized before the app bundle (or
// any of its transitive imports) can trip it.
//
// Zero behavior loss: the app does not use core `PushNotificationIOS` anywhere;
// all push/local notifications go through `expo-notifications`.
// ─────────────────────────────────────────────────────────────────────────────

function neutralizePushNotificationIOSGetter(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const RN = require('react-native');
    if (!RN) return;

    const descriptor = Object.getOwnPropertyDescriptor(RN, 'PushNotificationIOS');
    // Only act if it's still the original throwing getter. If a real
    // implementation was already installed (e.g. the community package), leave
    // it alone.
    if (!descriptor || typeof descriptor.get !== 'function') return;
    if (descriptor.configurable === false) return;

    // Inert stub: legacy event API shape, all no-ops. Nothing in the app reads
    // this, but a defensive shape avoids destructuring crashes if a future dep
    // touches it.
    const stub = {
      addEventListener: () => {},
      removeEventListener: () => {},
      requestPermissions: () => Promise.resolve({}),
      abandonPermissions: () => {},
      checkPermissions: (cb?: (p: unknown) => void) => cb?.({}),
      getInitialNotification: () => Promise.resolve(null),
      setApplicationIconBadgeNumber: () => {},
      getApplicationIconBadgeNumber: (cb?: (n: number) => void) => cb?.(0),
      removeAllDeliveredNotifications: () => {},
    };

    Object.defineProperty(RN, 'PushNotificationIOS', {
      value: stub,
      writable: false,
      // Non-enumerable: enumerations of the react-native module no longer visit
      // this property at all, so they can never trigger the legacy factory.
      enumerable: false,
      configurable: true,
    });
  } catch {
    // A startup safety patch must never itself throw. If RN's internals change
    // shape and this becomes inapplicable, we simply leave the getter as-is.
  }
}

neutralizePushNotificationIOSGetter();

export {};
