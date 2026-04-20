// lib/widget-add-helper.ts
// Helper to show instructions for adding widgets to the home screen

import { Platform, Alert } from 'react-native';
import { t, getLanguage } from '@/lib/i18n';

/**
 * Show instructions for adding a widget to the home screen.
 * Neither Android nor iOS support programmatic widget pinning from Expo,
 * so we show clear step-by-step instructions.
 */
export async function requestAddWidget(
  _categoryId: string,
  _size: 'small' | 'medium',
): Promise<void> {
  if (Platform.OS === 'android') {
    showAndroidWidgetInstructions();
  } else {
    showIOSWidgetInstructions();
  }
}

function showAndroidWidgetInstructions(): void {
  const lang = getLanguage();
  const isAr = lang === 'ar' || lang === 'ur';

  const title = isAr ? 'إضافة ودجت' : 'Add Widget';
  const message = isAr
    ? '١. اضغط مطولاً على الشاشة الرئيسية\n٢. اختر "الودجات" أو "Widgets"\n٣. ابحث عن "روح المسلم"\n٤. اختر الودجت المطلوبة واسحبها للشاشة'
    : '1. Long-press on your home screen\n2. Tap "Widgets"\n3. Search for "روح المسلم"\n4. Select the widget and drag it to your screen';

  Alert.alert(title, message, [{ text: t('common.ok'), style: 'default' }]);
}

function showIOSWidgetInstructions(): void {
  const lang = getLanguage();
  const isAr = lang === 'ar' || lang === 'ur';

  const title = isAr ? 'إضافة ودجت' : 'Add Widget';
  const message = isAr
    ? '١. اضغط مطولاً على الشاشة الرئيسية\n٢. اضغط على "+" في أعلى الشاشة\n٣. ابحث عن "روح المسلم"\n٤. اختر الودجت واضغط "إضافة"'
    : '1. Long-press on your home screen\n2. Tap "+" at the top\n3. Search for "روح المسلم"\n4. Select the widget and tap "Add Widget"';

  Alert.alert(title, message, [{ text: t('common.ok'), style: 'default' }]);
}
