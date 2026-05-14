// lib/widget-add-helper.ts
//
// Phase G (C4): App-Store-safe widget add flow.
//
// Apple does not expose a programmatic "open my widget gallery" API to
// third-party apps. The previously-mooted `App-Prefs:` URL is private and
// would risk App Store review. Android uses our small native bridge around
// `AppWidgetManager.requestPinAppWidget()` when the launcher supports it.
//
// Unsupported launchers / older Android versions fall back to a localized
// instruction sheet that includes the exact widget label.

import { Platform, Alert, NativeModules } from 'react-native';
import { t, getLanguage } from '@/lib/i18n';
import { getDefinition } from '@/lib/widgets/registry';

export interface AddWidgetOptions {
  /** Optional widget id from the registry. When provided, the instructions
   *  include the widget's localized label (e.g. "اليوم - ثلث"). */
  widgetId?: string;
  /** Fallback label when the id can't be resolved. */
  labelAr?: string;
  labelEn?: string;
  size?: 'small' | 'medium' | 'large';
  /** Exact Android receiver class, e.g. RoohVerseOfDaySmall. Normally derived from widgetId+size. */
  androidProviderClass?: string;
}

interface AndroidPinResult {
  requested?: boolean;
  reason?: string;
}

const cap = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

function androidProviderClassFor(widgetId: string | undefined, size: AddWidgetOptions['size']): string | null {
  if (!widgetId || !size) return null;
  return `Rooh${cap(widgetId)}${cap(size)}`;
}

/**
 * Show instructions for adding a widget to the home screen.
 *
 * Backwards-compatible signatures:
 *   requestAddWidget('verseOfDay', 'medium')        // legacy 2-arg
 *   requestAddWidget({ widgetId: 'verseOfDay', size: 'medium' })  // typed
 */
export async function requestAddWidget(
  arg1?: string | AddWidgetOptions,
  arg2?: 'small' | 'medium' | 'large'
): Promise<void> {
  let opts: AddWidgetOptions = {};
  if (typeof arg1 === 'string') {
    opts = { widgetId: arg1, size: arg2 };
  } else if (arg1) {
    opts = arg1;
  }
  const lang = getLanguage();
  const isAr = lang === 'ar' || lang === 'ur';
  const def = opts.widgetId ? getDefinition(opts.widgetId) : undefined;
  const label =
    (isAr ? def?.titleAr ?? opts.labelAr : def?.titleEn ?? opts.labelEn) ??
    (isAr ? 'الودجت' : 'the widget');

  if (Platform.OS === 'android') {
    const providerClass = opts.androidProviderClass ?? androidProviderClassFor(def?.id ?? opts.widgetId, opts.size);
    if (providerClass) {
      const pinned = await tryRequestAndroidPin(providerClass);
      if (pinned) return;
    }
    showAndroidInstructions(label, isAr);
  } else if (Platform.OS === 'ios') {
    showIOSInstructions(label, isAr);
  }
  // web / other platforms: no-op (no widget concept)
}

async function tryRequestAndroidPin(providerClass: string): Promise<boolean> {
  try {
    const mod = (NativeModules as any)?.RoohWidgetPinModule;
    if (!mod?.requestPinWidget) return false;
    const result: AndroidPinResult = await mod.requestPinWidget(providerClass);
    return result?.requested === true;
  } catch {
    return false;
  }
}

function showAndroidInstructions(label: string, isAr: boolean): void {
  const title = isAr ? 'إضافة ودجت' : 'Add Widget';
  const message = isAr
    ? `١. اضغط مطولاً على الشاشة الرئيسية\n٢. اختر "الودجات" أو "Widgets"\n٣. ابحث عن "روح المسلم"\n٤. اختر "${label}" واسحبها للشاشة`
    : `1. Long-press on your home screen\n2. Tap "Widgets"\n3. Search for "روح المسلم"\n4. Select "${label}" and drag it to your screen`;
  Alert.alert(title, message, [{ text: t('common.ok'), style: 'default' }]);
}

function showIOSInstructions(label: string, isAr: boolean): void {
  const title = isAr ? 'إضافة ودجت' : 'Add Widget';
  const message = isAr
    ? `١. اضغط مطولاً على الشاشة الرئيسية\n٢. اضغط على "+" في أعلى الشاشة\n٣. ابحث عن "روح المسلم"\n٤. اختر "${label}" واضغط "إضافة"`
    : `1. Long-press on your home screen\n2. Tap "+" at the top\n3. Search for "روح المسلم"\n4. Select "${label}" and tap "Add Widget"`;
  Alert.alert(title, message, [{ text: t('common.ok'), style: 'default' }]);
}
