export type WidgetInstructionPlatform = 'ios' | 'android';

function isArabicLanguage(language: string | undefined | null): boolean {
  return (language ?? 'ar').toLowerCase().startsWith('ar');
}

export function getWidgetHowToSteps(
  platform: WidgetInstructionPlatform,
  language: string | undefined | null,
): string[] {
  const ar = isArabicLanguage(language);

  if (platform === 'ios') {
    return ar
      ? [
          'اضغط مطولًا على مساحة فارغة في الشاشة الرئيسية حتى تبدأ الأيقونات بالاهتزاز.',
          'اضغط على زر "+" في أعلى الشاشة.',
          'ابحث عن "روح المسلم" وافتح نتيجة التطبيق.',
          'اسحب لاختيار حجم الودجت المناسب ثم اضغط "إضافة ودجت".',
          'لو ظهر نوع غير المطلوب، اضغط مطولًا على الودجت ثم اختر "تعديل الودجت".',
          'من خانة "الودجت" اختر النوع المطلوب، وعدّل اللغة والتقويم والأرقام والمظهر عند الحاجة.',
          'اضغط خارج نافذة التعديل ثم اضغط "تم" لإنهاء وضع التحرير.',
        ]
      : [
          'Long-press an empty area on the Home Screen until icons start jiggling.',
          'Tap the "+" button at the top of the screen.',
          'Search for "Rooh Al-Muslim" and open the app result.',
          'Swipe to the widget size you want, then tap "Add Widget".',
          'If iOS adds a different widget type, long-press it and choose "Edit Widget".',
          'Use the "Widget row" to choose the exact widget, then adjust language, calendar, numerals, and theme if needed.',
          'Tap outside the edit sheet, then tap "Done" to finish editing the Home Screen.',
        ];
  }

  return ar
    ? [
        'اضغط مطولًا على مساحة فارغة في الشاشة الرئيسية.',
        'اختر "الودجات" أو "Widgets" من القائمة.',
        'ابحث عن "روح المسلم".',
        'اختر الودجت المطلوب واسحبه إلى الشاشة الرئيسية.',
      ]
    : [
        'Long-press an empty area on the Home Screen.',
        'Choose "Widgets" from the launcher menu.',
        'Search for "Rooh Al-Muslim".',
        'Pick the widget you want and drag it to the Home Screen.',
      ];
}
