export const Platform = {
  OS: 'ios',
  select: <T,>(values: Record<string, T>) => values.ios ?? values.default,
};

export const I18nManager = {
  isRTL: false,
  allowRTL: () => {},
  forceRTL: () => {},
};

export const InteractionManager = {
  runAfterInteractions: (callback: () => void) => {
    callback();
    return { cancel: () => {} };
  },
};

export const NativeModules = {};
export const Alert = { alert: () => {} };
export const Vibration = { vibrate: () => {} };
export const Dimensions = { get: () => ({ width: 390, height: 844 }) };

export default {
  Platform,
  I18nManager,
  InteractionManager,
  NativeModules,
  Alert,
  Vibration,
  Dimensions,
};
