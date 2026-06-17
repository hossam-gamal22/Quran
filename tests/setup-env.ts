process.env.EXPO_PUBLIC_FIREBASE_API_KEY ??= 'test-firebase-api-key';
process.env.EXPO_PUBLIC_FIREBASE_APP_ID ??= '1:000000000000:web:test';

// Metro/React Native defines this global at runtime; mirror it for tests so
// `if (__DEV__) …` branches in app code don't throw a ReferenceError.
(globalThis as any).__DEV__ ??= false;
