import { Platform } from 'react-native';

declare global {
  // eslint-disable-next-line no-var
  var __ROOH_ANDROID_WIDGET_TASK_REGISTERED__: boolean | undefined;
}

export function registerAndroidWidgetTaskHandler(): void {
  if (Platform.OS !== 'android') return;
  if (globalThis.__ROOH_ANDROID_WIDGET_TASK_REGISTERED__) return;

  try {
    const { registerWidgetTaskHandler } = require('react-native-android-widget');
    const { widgetTaskHandler } = require('./android-widget-task-handler');
    registerWidgetTaskHandler(widgetTaskHandler);
    globalThis.__ROOH_ANDROID_WIDGET_TASK_REGISTERED__ = true;
  } catch {
    // Native widget package is unavailable in Expo Go / web-like runtimes.
  }
}

registerAndroidWidgetTaskHandler();
