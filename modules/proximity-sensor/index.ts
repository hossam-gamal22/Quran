import { requireNativeModule, EventEmitter } from 'expo-modules-core';
import { Platform } from 'react-native';

interface ProximitySensorEvents {
  onProximityChange: { isNear: boolean };
}

let ProximitySensorNative: any = null;
let emitter: any = null;

try {
  ProximitySensorNative = requireNativeModule('ProximitySensor');
  emitter = new EventEmitter(ProximitySensorNative);
} catch {
  // Module not available (e.g., Expo Go, web)
}

export const ProximitySensor = {
  startMonitoring: (): void => {
    try {
      ProximitySensorNative?.startMonitoring();
    } catch {
      // Silent fail
    }
  },

  stopMonitoring: (): void => {
    try {
      ProximitySensorNative?.stopMonitoring();
    } catch {
      // Silent fail
    }
  },

  isAvailable: (): boolean => {
    if (Platform.OS === 'web') return false;
    try {
      return ProximitySensorNative?.isAvailable() ?? false;
    } catch {
      return false;
    }
  },

  addListener: (callback: (event: { isNear: boolean }) => void) => {
    if (!emitter) return { remove: () => {} };
    return emitter.addListener('onProximityChange', callback);
  },
};
