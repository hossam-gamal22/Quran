// Install the global JS error/rejection safety net BEFORE anything else runs,
// so an uncaught error during early startup can't hard-close the app.
import './lib/global-error-handler';
// Neutralize React Native's deprecated, enumerable `PushNotificationIOS` getter
// BEFORE any dependency can enumerate the `react-native` module and trip it.
// Confirmed production FATAL on iOS (NativeEventEmitter(null)); see the module.
import './lib/patch-push-notification-ios';
import './lib/register-android-widget-task';
import 'expo-router/entry';
