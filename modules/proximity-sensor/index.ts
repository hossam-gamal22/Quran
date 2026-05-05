import { requireNativeModule } from 'expo-modules-core';

interface ProximitySensorEvents {
  onProximityChange: { isNear: boolean };
}

let ProximitySensorNative: any = null;

try {
  ProximitySensorNative = requireNativeModule('ProximitySensor');
} catch {
  // Not available in Expo Go — will use accelerometer fallback
  console.log('[ProximitySensor] Native module not available');
}

export const ProximitySensor = {
  startMonitoring: (): void => {
    if (!ProximitySensorNative) return;
    try {
      ProximitySensorNative.startMonitoring();
    } catch {
      // Silent fail
    }
  },

  stopMonitoring: (): void => {
    if (!ProximitySensorNative) return;
    try {
      ProximitySensorNative.stopMonitoring();
    } catch {
      // Silent fail
    }
  },

  isAvailable: (): boolean => {
    if (!ProximitySensorNative) return false;
    try {
      return ProximitySensorNative.isAvailable();
    } catch {
      return false;
    }
  },

  addListener: (callback: (event: { isNear: boolean }) => void) => {
    if (!ProximitySensorNative?.addListener) return { remove: () => {} };
    try {
      // In Expo SDK 52+, the native module itself is the EventEmitter
      return ProximitySensorNative.addListener('onProximityChange', callback);
    } catch {
      return { remove: () => {} };
    }
  },
};
