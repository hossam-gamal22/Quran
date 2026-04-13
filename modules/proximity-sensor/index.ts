import { requireNativeModule, EventEmitter } from 'expo-modules-core';

interface ProximitySensorEvents {
  onProximityChange: { isNear: boolean };
}

let ProximitySensorNative: any = null;
let emitter: any = null;

try {
  ProximitySensorNative = requireNativeModule('ProximitySensor');
  emitter = new EventEmitter(ProximitySensorNative);
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
    if (!ProximitySensorNative || !emitter) return { remove: () => {} };
    return emitter.addListener('onProximityChange', callback);
  },
};
