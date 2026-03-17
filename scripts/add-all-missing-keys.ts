import * as fs from 'fs';
import * as path from 'path';

const FILE = path.join(__dirname, '..', 'constants', 'translations.ts');
let content = fs.readFileSync(FILE, 'utf-8');
const origLen = content.split('\n').length;
console.log(`📖 Read file: ${origLen} lines`);

// ════════════ HELPERS ════════════

/** Insert text after the Nth occurrence of `anchor` */
function insertAfterLine(anchor: string, occ: number, text: string, label: string): boolean {
  let idx = -1, from = 0;
  for (let i = 0; i < occ; i++) {
    idx = content.indexOf(anchor, from);
    if (idx === -1) { console.error(`  ❌ ${label}: occ ${i+1}/${occ} not found`); return false; }
    from = idx + anchor.length;
  }
  const eol = content.indexOf('\n', idx);
  if (eol === -1) { console.error(`  ❌ ${label}: no EOL`); return false; }
  content = content.slice(0, eol + 1) + text + '\n' + content.slice(eol + 1);
  console.log(`  ✅ ${label}`);
  return true;
}

/** Insert text before the Nth occurrence of `anchor` */
function insertBefore(anchor: string, occ: number, text: string, label: string): boolean {
  let idx = -1, from = 0;
  for (let i = 0; i < occ; i++) {
    idx = content.indexOf(anchor, from);
    if (idx === -1) { console.error(`  ❌ ${label}: occ ${i+1}/${occ} not found`); return false; }
    from = idx + anchor.length;
  }
  content = content.slice(0, idx) + text + '\n' + content.slice(idx);
  console.log(`  ✅ ${label}`);
  return true;
}

/**
 * Add keys to an EXISTING namespace in the interface or language block.
 * Finds the namespace opening (e.g. `  home: {`) at the specified occurrence,
 * then finds its closing `  },` (or `  },  common: {` style) and inserts before it.
 */
function addKeysToNamespace(nsName: string, occ: number, keysText: string, label: string): boolean {
  // Find the namespace opening
  const patterns = [`  ${nsName}: {`];
  let startIdx = -1;
  let from = 0;
  for (let i = 0; i < occ; i++) {
    let found = false;
    for (const p of patterns) {
      const idx = content.indexOf(p, from);
      if (idx !== -1 && (startIdx === -1 || idx < startIdx || i > 0)) {
        startIdx = idx;
        from = idx + p.length;
        found = true;
        break;
      }
    }
    if (!found) {
      console.error(`  ❌ ${label}: namespace "${nsName}" occ ${i+1}/${occ} not found`);
      return false;
    }
  }

  // Now find the closing of this namespace block
  // We need to track brace depth
  let depth = 0;
  let inBlock = false;
  let closeIdx = -1;
  for (let i = startIdx; i < content.length; i++) {
    if (content[i] === '{') {
      depth++;
      inBlock = true;
    } else if (content[i] === '}') {
      depth--;
      if (inBlock && depth === 0) {
        closeIdx = i;
        break;
      }
    }
  }

  if (closeIdx === -1) {
    console.error(`  ❌ ${label}: closing brace for "${nsName}" not found`);
    return false;
  }

  // Find the line start of the closing brace
  let lineStart = closeIdx;
  while (lineStart > 0 && content[lineStart - 1] !== '\n') lineStart--;

  // Insert before the closing line
  content = content.slice(0, lineStart) + keysText + '\n' + content.slice(lineStart);
  console.log(`  ✅ ${label}`);
  return true;
}

// ════════════ DATA ════════════

// All NEW namespaces (don't exist in interface or any language block)
// Format: { nsName: { interfaceKeys: string, ar: string, en: string } }
// Other 10 languages will get the EN value as placeholder.

interface NamespaceData {
  interfaceType: string;       // TypeScript interface declaration
  values: Record<string, { ar: string; en: string }>;
}

// ──────────── NEW NAMESPACES ────────────

const NEW_NAMESPACES: Record<string, NamespaceData> = {
  ramadan: {
    interfaceType: `  ramadan: {
    blessedRamadan: string;
    dailyTasks: string;
    ofThirty: string;
    yourStats: string;
    fastingDays: string;
    dayUnit: string;
    quranPages: string;
    pageUnit: string;
    khatmaProgress: string;
    prayers: string;
    prayerUnit: string;
    ramadanCalendar: string;
    ramadanDuas: string;
    dailyTip: string;
    dailyTipText: string;
    completed: string;
    copyDua: string;
    lastTenNights: string;
    oddNights: string;
  };`,
    values: {
      blessedRamadan: { ar: 'شهر رمضان المبارك', en: 'Blessed Ramadan' },
      dailyTasks: { ar: 'مهام اليوم', en: 'Daily Tasks' },
      ofThirty: { ar: 'من 30', en: 'of 30' },
      yourStats: { ar: 'إحصائياتك', en: 'Your Statistics' },
      fastingDays: { ar: 'أيام الصيام', en: 'Fasting Days' },
      dayUnit: { ar: 'يوم', en: 'day' },
      quranPages: { ar: 'صفحات القرآن', en: 'Quran Pages' },
      pageUnit: { ar: 'صفحة', en: 'page' },
      khatmaProgress: { ar: 'تقدم الختمة', en: 'Khatma Progress' },
      prayers: { ar: 'الصلوات', en: 'Prayers' },
      prayerUnit: { ar: 'صلاة', en: 'prayer' },
      ramadanCalendar: { ar: 'تقويم رمضان', en: 'Ramadan Calendar' },
      ramadanDuas: { ar: 'أدعية رمضان', en: 'Ramadan Duas' },
      dailyTip: { ar: 'نصيحة اليوم', en: 'Daily Tip' },
      dailyTipText: { ar: 'اجعل رمضان فرصة لتجديد العلاقة مع القرآن', en: 'Make Ramadan an opportunity to renew your relationship with the Quran' },
      completed: { ar: 'مكتمل', en: 'Completed' },
      copyDua: { ar: 'نسخ الدعاء', en: 'Copy Dua' },
      lastTenNights: { ar: 'العشر الأواخر', en: 'Last Ten Nights' },
      oddNights: { ar: 'الليالي الوتر', en: 'Odd Nights' },
    }
  },

  liveActivities: {
    interfaceType: `  liveActivities: {
    title: string;
    enable: string;
    description: string;
    notSupported: string;
    styleTitle: string;
    preview: string;
    previewNextPrayer: string;
    previewSunrise: string;
  };`,
    values: {
      title: { ar: 'الأنشطة المباشرة', en: 'Live Activities' },
      enable: { ar: 'تفعيل الأنشطة المباشرة', en: 'Enable Live Activities' },
      description: { ar: 'عرض مواقيت الصلاة على الشاشة المقفلة', en: 'Show prayer times on lock screen' },
      notSupported: { ar: 'غير مدعوم على هذا الجهاز', en: 'Not supported on this device' },
      styleTitle: { ar: 'نمط العرض', en: 'Display Style' },
      preview: { ar: 'معاينة', en: 'Preview' },
      previewNextPrayer: { ar: 'الصلاة القادمة: الظهر', en: 'Next Prayer: Dhuhr' },
      previewSunrise: { ar: 'الشروق: 06:30', en: 'Sunrise: 06:30' },
    }
  },

  widgets: {
    interfaceType: `  widgets: {
    accentColor: string;
    addToHomeScreen: string;
    addWidget: string;
    addWidgetIosInstructions: string;
    addWidgetRequested: string;
    azkarCategories: string;
    azkarDesc: string;
    azkarTitle: string;
    azkarWidget: string;
    cancel: string;
    dailyAyahDesc: string;
    dailyAyahTitle: string;
    dailyDhikrDesc: string;
    dailyDhikrTitle: string;
    dhikrWidget: string;
    enable: string;
    enableWidgets: string;
    enableWidgetsDesc: string;
    galleryTitle: string;
    generalSettings: string;
    hijriDesc: string;
    hijriTitle: string;
    hijriWidget: string;
    nextPrayer: string;
    note: string;
    prayerTimesDesc: string;
    prayerTimesTitle: string;
    prayerTimesWidget: string;
    reset: string;
    resetConfirm: string;
    saveChanges: string;
    selectAtLeastOneCategory: string;
    settingsSaved: string;
    showAllPrayers: string;
    showAllPrayersDesc: string;
    showDhikrTranslation: string;
    showDhikrTranslationDesc: string;
    showGregorianDate: string;
    showGregorianDateDesc: string;
    showHijriDate: string;
    showLocation: string;
    showTranslation: string;
    showTranslationDesc: string;
    showVerseTranslation: string;
    showVerseTranslationDesc: string;
    showVirtue: string;
    showVirtueDesc: string;
    sizeMedium: string;
    sizeSmall: string;
    trackPrayerCompletion: string;
    trackPrayerCompletionDesc: string;
    updateWidgetNow: string;
    verseWidget: string;
    widgetPreview: string;
    widgetSettingsTitle: string;
    widgetUpdated: string;
  };`,
    values: {
      accentColor: { ar: 'لون التمييز', en: 'Accent Color' },
      addToHomeScreen: { ar: 'أضِف إلى الشاشة الرئيسية', en: 'Add to Home Screen' },
      addWidget: { ar: 'إضافة ودجة', en: 'Add Widget' },
      addWidgetIosInstructions: { ar: 'اضغط مطولاً على الشاشة الرئيسية ثم اختر "+" لإضافة ودجة', en: 'Long press on home screen then tap "+" to add widget' },
      addWidgetRequested: { ar: 'تم طلب إضافة الودجة', en: 'Widget add requested' },
      azkarCategories: { ar: 'فئات الأذكار', en: 'Azkar Categories' },
      azkarDesc: { ar: 'أذكار وأدعية يومية', en: 'Daily azkar and duas' },
      azkarTitle: { ar: 'أذكار يومية', en: 'Daily Azkar' },
      azkarWidget: { ar: 'ودجة الأذكار', en: 'Azkar Widget' },
      cancel: { ar: 'إلغاء', en: 'Cancel' },
      dailyAyahDesc: { ar: 'آية قرآنية جديدة كل يوم', en: 'A new Quranic verse every day' },
      dailyAyahTitle: { ar: 'آية اليوم', en: 'Verse of the Day' },
      dailyDhikrDesc: { ar: 'ذكر يومي من الأذكار', en: 'Daily dhikr from azkar' },
      dailyDhikrTitle: { ar: 'ذكر اليوم', en: 'Dhikr of the Day' },
      dhikrWidget: { ar: 'ودجة الذكر', en: 'Dhikr Widget' },
      enable: { ar: 'تفعيل', en: 'Enable' },
      enableWidgets: { ar: 'تفعيل الودجات', en: 'Enable Widgets' },
      enableWidgetsDesc: { ar: 'تفعيل الودجات لعرض المعلومات على شاشتك', en: 'Enable widgets to show info on your screen' },
      galleryTitle: { ar: 'معرض الودجات', en: 'Widget Gallery' },
      generalSettings: { ar: 'الإعدادات العامة', en: 'General Settings' },
      hijriDesc: { ar: 'التاريخ الهجري اليومي', en: 'Daily Hijri date' },
      hijriTitle: { ar: 'التاريخ الهجري', en: 'Hijri Date' },
      hijriWidget: { ar: 'ودجة الهجري', en: 'Hijri Widget' },
      nextPrayer: { ar: 'الصلاة القادمة', en: 'Next Prayer' },
      note: { ar: 'ملاحظة', en: 'Note' },
      prayerTimesDesc: { ar: 'مواقيت الصلاة الخمس', en: 'Five daily prayer times' },
      prayerTimesTitle: { ar: 'مواقيت الصلاة', en: 'Prayer Times' },
      prayerTimesWidget: { ar: 'ودجة مواقيت الصلاة', en: 'Prayer Times Widget' },
      reset: { ar: 'إعادة تعيين', en: 'Reset' },
      resetConfirm: { ar: 'هل تريد إعادة تعيين الإعدادات؟', en: 'Reset settings?' },
      saveChanges: { ar: 'حفظ التغييرات', en: 'Save Changes' },
      selectAtLeastOneCategory: { ar: 'اختر فئة واحدة على الأقل', en: 'Select at least one category' },
      settingsSaved: { ar: 'تم حفظ الإعدادات', en: 'Settings saved' },
      showAllPrayers: { ar: 'عرض جميع الصلوات', en: 'Show All Prayers' },
      showAllPrayersDesc: { ar: 'عرض الخمس صلوات في الودجة', en: 'Show all five prayers in widget' },
      showDhikrTranslation: { ar: 'عرض ترجمة الذكر', en: 'Show Dhikr Translation' },
      showDhikrTranslationDesc: { ar: 'عرض الترجمة أسفل الذكر', en: 'Show translation below dhikr' },
      showGregorianDate: { ar: 'عرض التاريخ الميلادي', en: 'Show Gregorian Date' },
      showGregorianDateDesc: { ar: 'عرض التاريخ الميلادي بجانب الهجري', en: 'Show Gregorian date next to Hijri' },
      showHijriDate: { ar: 'عرض التاريخ الهجري', en: 'Show Hijri Date' },
      showLocation: { ar: 'عرض الموقع', en: 'Show Location' },
      showTranslation: { ar: 'عرض الترجمة', en: 'Show Translation' },
      showTranslationDesc: { ar: 'عرض ترجمة النص', en: 'Show text translation' },
      showVerseTranslation: { ar: 'عرض ترجمة الآية', en: 'Show Verse Translation' },
      showVerseTranslationDesc: { ar: 'عرض الترجمة أسفل الآية', en: 'Show translation below verse' },
      showVirtue: { ar: 'عرض الفضل', en: 'Show Virtue' },
      showVirtueDesc: { ar: 'عرض فضل الذكر', en: 'Show dhikr virtue' },
      sizeMedium: { ar: 'متوسط', en: 'Medium' },
      sizeSmall: { ar: 'صغير', en: 'Small' },
      trackPrayerCompletion: { ar: 'تتبع إتمام الصلاة', en: 'Track Prayer Completion' },
      trackPrayerCompletionDesc: { ar: 'تمكين تتبع إتمام الصلوات', en: 'Enable tracking prayer completion' },
      updateWidgetNow: { ar: 'تحديث الودجة الآن', en: 'Update Widget Now' },
      verseWidget: { ar: 'ودجة الآية', en: 'Verse Widget' },
      widgetPreview: { ar: 'معاينة الودجة', en: 'Widget Preview' },
      widgetSettingsTitle: { ar: 'إعدادات الودجات', en: 'Widget Settings' },
      widgetUpdated: { ar: 'تم تحديث الودجة', en: 'Widget Updated' },
    }
  },

  backup: {
    interfaceType: `  backup: {
    actions: string;
    appSettings: string;
    backupFileName: string;
    backupUpToDate: string;
    clearAll: string;
    clearAllData: string;
    clearAllDataDesc: string;
    clearDataConfirm: string;
    clearDataConfirmMsg: string;
    createBackup: string;
    createBackupDesc: string;
    createBackupPrompt: string;
    createdSuccess: string;
    dangerZone: string;
    day: string;
    errorClearing: string;
    errorCreating: string;
    errorRestoring: string;
    favoritesAndBookmarks: string;
    infoIncludes: string;
    infoSaveCloud: string;
    infoWeekly: string;
    invalidBackupFile: string;
    item: string;
    khatmaUnit: string;
    khatmasLabel: string;
    lastBackupPrefix: string;
    noBackup: string;
    noData: string;
    page: string;
    quranProgress: string;
    restore: string;
    restoreConfirm: string;
    restoreConfirmMsg: string;
    restoreFromBackup: string;
    restoreFromBackupDesc: string;
    restoredSuccess: string;
    saveBackup: string;
    savedData: string;
    shareSettings: string;
    shareSettingsDesc: string;
    worshipDays: string;
  };`,
    values: {
      actions: { ar: 'الإجراءات', en: 'Actions' },
      appSettings: { ar: 'إعدادات التطبيق', en: 'App Settings' },
      backupFileName: { ar: 'اسم ملف النسخة الاحتياطية', en: 'Backup File Name' },
      backupUpToDate: { ar: 'النسخة الاحتياطية محدثة', en: 'Backup is up to date' },
      clearAll: { ar: 'حذف الكل', en: 'Clear All' },
      clearAllData: { ar: 'حذف جميع البيانات', en: 'Clear All Data' },
      clearAllDataDesc: { ar: 'حذف جميع البيانات والإعدادات', en: 'Delete all data and settings' },
      clearDataConfirm: { ar: 'تأكيد حذف البيانات', en: 'Confirm Clear Data' },
      clearDataConfirmMsg: { ar: 'هل أنت متأكد من حذف جميع البيانات؟ لا يمكن التراجع', en: 'Are you sure? This cannot be undone' },
      createBackup: { ar: 'إنشاء نسخة احتياطية', en: 'Create Backup' },
      createBackupDesc: { ar: 'احفظ جميع بياناتك', en: 'Save all your data' },
      createBackupPrompt: { ar: 'قم بإنشاء نسخة احتياطية الآن', en: 'Create a backup now' },
      createdSuccess: { ar: 'تم إنشاء النسخة بنجاح', en: 'Backup created successfully' },
      dangerZone: { ar: 'منطقة الخطر', en: 'Danger Zone' },
      day: { ar: 'يوم', en: 'day' },
      errorClearing: { ar: 'خطأ في حذف البيانات', en: 'Error clearing data' },
      errorCreating: { ar: 'خطأ في إنشاء النسخة', en: 'Error creating backup' },
      errorRestoring: { ar: 'خطأ في استعادة البيانات', en: 'Error restoring data' },
      favoritesAndBookmarks: { ar: 'المحفوظات والإشارات', en: 'Favorites & Bookmarks' },
      infoIncludes: { ar: 'تشمل جميع بياناتك والإعدادات', en: 'Includes all your data and settings' },
      infoSaveCloud: { ar: 'احفظ النسخة في مكان آمن', en: 'Save backup in a safe place' },
      infoWeekly: { ar: 'يُنصح بنسخة احتياطية أسبوعية', en: 'Weekly backups recommended' },
      invalidBackupFile: { ar: 'ملف النسخة غير صحيح', en: 'Invalid backup file' },
      item: { ar: 'عنصر', en: 'item' },
      khatmaUnit: { ar: 'ختمة', en: 'khatma' },
      khatmasLabel: { ar: 'الختمات', en: 'Khatmas' },
      lastBackupPrefix: { ar: 'آخر نسخة احتياطية:', en: 'Last backup:' },
      noBackup: { ar: 'لا توجد نسخة احتياطية', en: 'No backup exists' },
      noData: { ar: 'لا توجد بيانات', en: 'No data' },
      page: { ar: 'صفحة', en: 'page' },
      quranProgress: { ar: 'تقدم القرآن', en: 'Quran Progress' },
      restore: { ar: 'استعادة', en: 'Restore' },
      restoreConfirm: { ar: 'تأكيد الاستعادة', en: 'Confirm Restore' },
      restoreConfirmMsg: { ar: 'سيتم استبدال جميع البيانات الحالية', en: 'All current data will be replaced' },
      restoreFromBackup: { ar: 'استعادة من نسخة احتياطية', en: 'Restore from Backup' },
      restoreFromBackupDesc: { ar: 'استرجع بياناتك السابقة', en: 'Recover your previous data' },
      restoredSuccess: { ar: 'تم استعادة البيانات بنجاح', en: 'Data restored successfully' },
      saveBackup: { ar: 'حفظ النسخة الاحتياطية', en: 'Save Backup' },
      savedData: { ar: 'البيانات المحفوظة', en: 'Saved Data' },
      shareSettings: { ar: 'مشاركة الإعدادات', en: 'Share Settings' },
      shareSettingsDesc: { ar: 'شارك إعداداتك مع آخرين', en: 'Share settings with others' },
      worshipDays: { ar: 'أيام العبادة', en: 'Worship Days' },
    }
  },

  notifications: {
    interfaceType: `  notifications: {
    afterMinutes: string;
    asrBody: string;
    azkarChannel: string;
    azkarDesc: string;
    dailyVerseChannel: string;
    dailyVerseDesc: string;
    dailyWirdBody: string;
    dailyWirdTitle: string;
    dayFri: string;
    dayMon: string;
    daySat: string;
    daySun: string;
    dayThu: string;
    dayTue: string;
    dayWed: string;
    dhuhrBody: string;
    fajrBody: string;
    generalChannel: string;
    generalDesc: string;
    ishaBody: string;
    khatmaChannel: string;
    khatmaComplete: string;
    maghribBody: string;
    prayNow: string;
    prayerChannel: string;
    prayerChannelDesc: string;
    prayerTimeArrived: string;
    prayerTimesChannel: string;
    prayerTimesDesc: string;
    prepareForPrayer: string;
    seasonalChannel: string;
    seasonalChannelDesc: string;
    sunriseBody: string;
    testBody: string;
    testPrayerTitle: string;
    testTitle: string;
    timeForAzkar: string;
    wellDone: string;
  };`,
    values: {
      afterMinutes: { ar: 'بعد دقائق', en: 'after minutes' },
      asrBody: { ar: 'حان وقت صلاة العصر', en: 'It is time for Asr prayer' },
      azkarChannel: { ar: 'قناة الأذكار', en: 'Azkar Channel' },
      azkarDesc: { ar: 'تذكيرات بأذكار الصباح والمساء', en: 'Morning and evening azkar reminders' },
      dailyVerseChannel: { ar: 'قناة آية اليوم', en: 'Daily Verse Channel' },
      dailyVerseDesc: { ar: 'آية قرآنية يومية', en: 'Daily Quranic verse' },
      dailyWirdBody: { ar: 'حان وقت الورد اليومي', en: 'Time for your daily wird' },
      dailyWirdTitle: { ar: 'الورد اليومي', en: 'Daily Wird' },
      dayFri: { ar: 'الجمعة', en: 'Friday' },
      dayMon: { ar: 'الاثنين', en: 'Monday' },
      daySat: { ar: 'السبت', en: 'Saturday' },
      daySun: { ar: 'الأحد', en: 'Sunday' },
      dayThu: { ar: 'الخميس', en: 'Thursday' },
      dayTue: { ar: 'الثلاثاء', en: 'Tuesday' },
      dayWed: { ar: 'الأربعاء', en: 'Wednesday' },
      dhuhrBody: { ar: 'حان وقت صلاة الظهر', en: 'It is time for Dhuhr prayer' },
      fajrBody: { ar: 'حان وقت صلاة الفجر', en: 'It is time for Fajr prayer' },
      generalChannel: { ar: 'القناة العامة', en: 'General Channel' },
      generalDesc: { ar: 'إشعارات عامة من التطبيق', en: 'General app notifications' },
      ishaBody: { ar: 'حان وقت صلاة العشاء', en: 'It is time for Isha prayer' },
      khatmaChannel: { ar: 'قناة الختمة', en: 'Khatma Channel' },
      khatmaComplete: { ar: 'أكملت الختمة! بارك الله فيك', en: 'Khatma completed! May Allah bless you' },
      maghribBody: { ar: 'حان وقت صلاة المغرب', en: 'It is time for Maghrib prayer' },
      prayNow: { ar: 'صلِّ الآن', en: 'Pray Now' },
      prayerChannel: { ar: 'قناة الصلاة', en: 'Prayer Channel' },
      prayerChannelDesc: { ar: 'إشعارات مواقيت الصلاة', en: 'Prayer times notifications' },
      prayerTimeArrived: { ar: 'حان وقت الصلاة', en: 'Prayer time has arrived' },
      prayerTimesChannel: { ar: 'قناة مواقيت الصلاة', en: 'Prayer Times Channel' },
      prayerTimesDesc: { ar: 'تنبيهات مواقيت الصلاة الخمس', en: 'Five prayer time alerts' },
      prepareForPrayer: { ar: 'استعد للصلاة', en: 'Prepare for prayer' },
      seasonalChannel: { ar: 'القناة الموسمية', en: 'Seasonal Channel' },
      seasonalChannelDesc: { ar: 'إشعارات المناسبات الإسلامية', en: 'Islamic events notifications' },
      sunriseBody: { ar: 'وقت الشروق', en: 'Sunrise time' },
      testBody: { ar: 'هذا إشعار تجريبي', en: 'This is a test notification' },
      testPrayerTitle: { ar: 'اختبار إشعار الصلاة', en: 'Test Prayer Notification' },
      testTitle: { ar: 'اختبار الإشعارات', en: 'Test Notification' },
      timeForAzkar: { ar: 'حان وقت الأذكار', en: 'Time for azkar' },
      wellDone: { ar: 'أحسنت! استمر', en: 'Well done! Keep going' },
    }
  },

  favorites: {
    interfaceType: `  favorites: {
    addAzkarHint: string;
    addBookmarkHint: string;
    addNote: string;
    addOtherHint: string;
    addQuranHint: string;
    azkar: string;
    bookmarks: string;
    chooseDesign: string;
    deleteBookmarkConfirm: string;
    deleteConfirm: string;
    exportFailed: string;
    exportImage: string;
    image: string;
    namesOfAllah: string;
    noAzkarFavorites: string;
    noBookmarks: string;
    noOtherFavorites: string;
    noQuranFavorites: string;
    note: string;
    notePlaceholder: string;
    other: string;
    quran: string;
    removeFromFavoritesConfirm: string;
    repeatCount: string;
    saveNote: string;
    saved: string;
    shareText: string;
    sortByDate: string;
    sortBySurah: string;
    title: string;
    verse: string;
    verseFrom: string;
  };`,
    values: {
      addAzkarHint: { ar: 'أضف أذكار من صفحة الأذكار', en: 'Add azkar from the azkar page' },
      addBookmarkHint: { ar: 'اضغط مطولاً على الآية لإضافة إشارة', en: 'Long press on a verse to bookmark' },
      addNote: { ar: 'إضافة ملاحظة', en: 'Add Note' },
      addOtherHint: { ar: 'أضف عناصر أخرى من المحفوظات', en: 'Add other items from favorites' },
      addQuranHint: { ar: 'أضف آيات من القرآن', en: 'Add verses from the Quran' },
      azkar: { ar: 'الأذكار', en: 'Azkar' },
      bookmarks: { ar: 'الإشارات المرجعية', en: 'Bookmarks' },
      chooseDesign: { ar: 'اختر التصميم', en: 'Choose Design' },
      deleteBookmarkConfirm: { ar: 'هل تريد حذف هذه الإشارة؟', en: 'Delete this bookmark?' },
      deleteConfirm: { ar: 'هل تريد حذف هذا العنصر؟', en: 'Delete this item?' },
      exportFailed: { ar: 'فشل التصدير', en: 'Export failed' },
      exportImage: { ar: 'تصدير كصورة', en: 'Export as Image' },
      image: { ar: 'صورة', en: 'Image' },
      namesOfAllah: { ar: 'أسماء الله الحسنى', en: 'Names of Allah' },
      noAzkarFavorites: { ar: 'لا توجد أذكار محفوظة', en: 'No saved azkar' },
      noBookmarks: { ar: 'لا توجد إشارات مرجعية', en: 'No bookmarks' },
      noOtherFavorites: { ar: 'لا توجد محفوظات أخرى', en: 'No other favorites' },
      noQuranFavorites: { ar: 'لا توجد آيات محفوظة', en: 'No saved verses' },
      note: { ar: 'ملاحظة', en: 'Note' },
      notePlaceholder: { ar: 'اكتب ملاحظتك هنا...', en: 'Write your note here...' },
      other: { ar: 'أخرى', en: 'Other' },
      quran: { ar: 'القرآن', en: 'Quran' },
      removeFromFavoritesConfirm: { ar: 'هل تريد إزالة من المحفوظات؟', en: 'Remove from favorites?' },
      repeatCount: { ar: 'عدد التكرار', en: 'Repeat Count' },
      saveNote: { ar: 'حفظ الملاحظة', en: 'Save Note' },
      saved: { ar: 'تم الحفظ', en: 'Saved' },
      shareText: { ar: 'مشاركة نصية', en: 'Share as Text' },
      sortByDate: { ar: 'ترتيب بالتاريخ', en: 'Sort by Date' },
      sortBySurah: { ar: 'ترتيب بالسورة', en: 'Sort by Surah' },
      title: { ar: 'المحفوظات', en: 'Favorites' },
      verse: { ar: 'آية', en: 'Verse' },
      verseFrom: { ar: 'آية من', en: 'Verse from' },
    }
  },

  quranSearch: {
    interfaceType: `  quranSearch: {
    activeFilter: string;
    allSurahs: string;
    arabicLang: string;
    chooseSurahFilter: string;
    clearHistory: string;
    emptyHint: string;
    emptyTitle: string;
    englishPlaceholder: string;
    inQuran: string;
    juzLabel: string;
    juzStatLabel: string;
    loadTafsirFailed: string;
    noResultsHint: string;
    noResultsMsg: string;
    noResultsTitle: string;
    noTafsirAvailable: string;
    placeholder: string;
    recentSearches: string;
    resultLabel: string;
    saveBtn: string;
    saved: string;
    searchBtn: string;
    searchSuggestions: string;
    searching: string;
    stats: string;
    surahLabel: string;
    tafsir: string;
    title: string;
  };`,
    values: {
      activeFilter: { ar: 'فلتر نشط', en: 'Active Filter' },
      allSurahs: { ar: 'جميع السور', en: 'All Surahs' },
      arabicLang: { ar: 'العربية', en: 'Arabic' },
      chooseSurahFilter: { ar: 'اختر سورة للبحث فيها', en: 'Choose surah to search in' },
      clearHistory: { ar: 'مسح السجل', en: 'Clear History' },
      emptyHint: { ar: 'ابحث في القرآن الكريم', en: 'Search the Holy Quran' },
      emptyTitle: { ar: 'ابدأ البحث', en: 'Start Searching' },
      englishPlaceholder: { ar: 'ابحث بالإنجليزية...', en: 'Search in English...' },
      inQuran: { ar: 'في القرآن', en: 'in Quran' },
      juzLabel: { ar: 'الجزء', en: 'Juz' },
      juzStatLabel: { ar: 'أجزاء', en: 'parts' },
      loadTafsirFailed: { ar: 'فشل تحميل التفسير', en: 'Failed to load tafsir' },
      noResultsHint: { ar: 'جرب كلمات مختلفة', en: 'Try different words' },
      noResultsMsg: { ar: 'لم يتم العثور على نتائج', en: 'No results found' },
      noResultsTitle: { ar: 'لا توجد نتائج', en: 'No Results' },
      noTafsirAvailable: { ar: 'التفسير غير متاح', en: 'Tafsir not available' },
      placeholder: { ar: 'ابحث في القرآن...', en: 'Search in Quran...' },
      recentSearches: { ar: 'عمليات بحث سابقة', en: 'Recent Searches' },
      resultLabel: { ar: 'نتيجة', en: 'result' },
      saveBtn: { ar: 'حفظ', en: 'Save' },
      saved: { ar: 'تم الحفظ', en: 'Saved' },
      searchBtn: { ar: 'بحث', en: 'Search' },
      searchSuggestions: { ar: 'اقتراحات بحث', en: 'Search Suggestions' },
      searching: { ar: 'جاري البحث...', en: 'Searching...' },
      stats: { ar: 'إحصائيات', en: 'Statistics' },
      surahLabel: { ar: 'سورة', en: 'Surah' },
      tafsir: { ar: 'التفسير', en: 'Tafsir' },
      title: { ar: 'البحث في القرآن', en: 'Search Quran' },
    }
  },

  storyOfDay: {
    interfaceType: `  storyOfDay: {
    allReciters: string;
    chooseReciter: string;
    creatingPreview: string;
    creatingVideo: string;
    exportConnectionFailed: string;
    exportServerError: string;
    exportServiceUnavailable: string;
    hideBranding: string;
    imageSaved: string;
    loadError: string;
    longPressHint: string;
    noAudioAvailable: string;
    noImageAvailable: string;
    photoPermissionRequired: string;
    previewCreationError: string;
    previewVideo: string;
    saveVideoWithReciter: string;
    shareError: string;
    shareText: string;
    sharingInProgress: string;
    showBranding: string;
    title: string;
    videoExportFallback: string;
    videoPreviewRequiresDevBuild: string;
    videoSaveError: string;
    videoWithAudioSaved: string;
  };`,
    values: {
      allReciters: { ar: 'جميع القراء', en: 'All Reciters' },
      chooseReciter: { ar: 'اختر القارئ', en: 'Choose Reciter' },
      creatingPreview: { ar: 'جاري إنشاء المعاينة...', en: 'Creating preview...' },
      creatingVideo: { ar: 'جاري إنشاء الفيديو...', en: 'Creating video...' },
      exportConnectionFailed: { ar: 'فشل الاتصال بالتصدير', en: 'Export connection failed' },
      exportServerError: { ar: 'خطأ في خادم التصدير', en: 'Export server error' },
      exportServiceUnavailable: { ar: 'خدمة التصدير غير متاحة', en: 'Export service unavailable' },
      hideBranding: { ar: 'إخفاء الشعار', en: 'Hide Branding' },
      imageSaved: { ar: 'تم حفظ الصورة', en: 'Image saved' },
      loadError: { ar: 'خطأ في التحميل', en: 'Load error' },
      longPressHint: { ar: 'اضغط مطولاً للمزيد', en: 'Long press for more' },
      noAudioAvailable: { ar: 'لا يوجد صوت متاح', en: 'No audio available' },
      noImageAvailable: { ar: 'لا توجد صورة متاحة', en: 'No image available' },
      photoPermissionRequired: { ar: 'يتطلب إذن الصور', en: 'Photo permission required' },
      previewCreationError: { ar: 'خطأ في إنشاء المعاينة', en: 'Preview creation error' },
      previewVideo: { ar: 'معاينة الفيديو', en: 'Preview Video' },
      saveVideoWithReciter: { ar: 'حفظ الفيديو مع القارئ', en: 'Save Video with Reciter' },
      shareError: { ar: 'خطأ في المشاركة', en: 'Share error' },
      shareText: { ar: 'مشاركة كنص', en: 'Share as Text' },
      sharingInProgress: { ar: 'جاري المشاركة...', en: 'Sharing...' },
      showBranding: { ar: 'إظهار الشعار', en: 'Show Branding' },
      title: { ar: 'قصة اليوم', en: 'Story of the Day' },
      videoExportFallback: { ar: 'بديل تصدير الفيديو', en: 'Video export fallback' },
      videoPreviewRequiresDevBuild: { ar: 'معاينة الفيديو تتطلب بناء تطوير', en: 'Video preview requires dev build' },
      videoSaveError: { ar: 'خطأ في حفظ الفيديو', en: 'Video save error' },
      videoWithAudioSaved: { ar: 'تم حفظ الفيديو مع الصوت', en: 'Video with audio saved' },
    }
  },

  pdfExport: {
    interfaceType: `  pdfExport: {
    bgFromApp: string;
    chooseBg: string;
    chooseBgTitle: string;
    chooseStyle: string;
    chooseStyleDesc: string;
    classic: string;
    classicDesc: string;
    custom: string;
    downloadReady: string;
    emerald: string;
    emeraldDesc: string;
    exportPdf: string;
    orDownloadReady: string;
    readyCopyForStyle: string;
    royal: string;
    royalDesc: string;
  };`,
    values: {
      bgFromApp: { ar: 'خلفية من التطبيق', en: 'Background from App' },
      chooseBg: { ar: 'اختر الخلفية', en: 'Choose Background' },
      chooseBgTitle: { ar: 'اختر خلفية التصدير', en: 'Choose Export Background' },
      chooseStyle: { ar: 'اختر النمط', en: 'Choose Style' },
      chooseStyleDesc: { ar: 'اختر نمط التصدير المفضل', en: 'Choose preferred export style' },
      classic: { ar: 'كلاسيكي', en: 'Classic' },
      classicDesc: { ar: 'نمط بسيط وأنيق', en: 'Simple and elegant style' },
      custom: { ar: 'مخصص', en: 'Custom' },
      downloadReady: { ar: 'جاهز للتحميل', en: 'Ready to download' },
      emerald: { ar: 'زمردي', en: 'Emerald' },
      emeraldDesc: { ar: 'نمط أخضر زمردي', en: 'Emerald green style' },
      exportPdf: { ar: 'تصدير PDF', en: 'Export PDF' },
      orDownloadReady: { ar: 'أو جاهز للتحميل', en: 'or ready to download' },
      readyCopyForStyle: { ar: 'نسخة جاهزة بالنمط', en: 'Ready copy with style' },
      royal: { ar: 'ملكي', en: 'Royal' },
      royalDesc: { ar: 'نمط فاخر وملكي', en: 'Luxurious and royal style' },
    }
  },

  subscription: {
    interfaceType: `  subscription: {
    alreadySubscribed: string;
    bestValue: string;
    currentPlan: string;
    legalText: string;
    oneTimePurchase: string;
    perMonth: string;
    premiumSubtitle: string;
    premiumTitle: string;
    subscribe: string;
    subscribeNow: string;
    subscribeToAccess: string;
    thankYou: string;
    upgrade: string;
  };`,
    values: {
      alreadySubscribed: { ar: 'مشترك بالفعل', en: 'Already Subscribed' },
      bestValue: { ar: 'أفضل قيمة', en: 'Best Value' },
      currentPlan: { ar: 'الخطة الحالية', en: 'Current Plan' },
      legalText: { ar: 'النص القانوني', en: 'Legal Text' },
      oneTimePurchase: { ar: 'شراء لمرة واحدة', en: 'One-time Purchase' },
      perMonth: { ar: 'شهرياً', en: 'Per Month' },
      premiumSubtitle: { ar: 'فعّل جميع المزايا المتقدمة', en: 'Unlock all premium features' },
      premiumTitle: { ar: 'النسخة المميزة', en: 'Premium' },
      subscribe: { ar: 'اشترك', en: 'Subscribe' },
      subscribeNow: { ar: 'اشترك الآن', en: 'Subscribe Now' },
      subscribeToAccess: { ar: 'اشترك للوصول', en: 'Subscribe to Access' },
      thankYou: { ar: 'شكراً لاشتراكك', en: 'Thank you for subscribing' },
      upgrade: { ar: 'ترقية', en: 'Upgrade' },
    }
  },

  honor: {
    interfaceType: `  honor: {
    anonymousUser: string;
    azkarPoints: string;
    daysRemaining: string;
    howItWorks: string;
    monthWinners: string;
    points: string;
    prayPoints: string;
    premium: string;
    readQuranPoints: string;
    rewardsDisabled: string;
    tasbihPoints: string;
    title: string;
    yourMonthlyPoints: string;
  };`,
    values: {
      anonymousUser: { ar: 'مستخدم مجهول', en: 'Anonymous User' },
      azkarPoints: { ar: 'نقاط الأذكار', en: 'Azkar Points' },
      daysRemaining: { ar: 'أيام متبقية', en: 'Days Remaining' },
      howItWorks: { ar: 'كيف يعمل', en: 'How It Works' },
      monthWinners: { ar: 'فائزو الشهر', en: 'Month Winners' },
      points: { ar: 'نقاط', en: 'Points' },
      prayPoints: { ar: 'نقاط الصلاة', en: 'Prayer Points' },
      premium: { ar: 'مميز', en: 'Premium' },
      readQuranPoints: { ar: 'نقاط قراءة القرآن', en: 'Quran Reading Points' },
      rewardsDisabled: { ar: 'المكافآت معطلة', en: 'Rewards Disabled' },
      tasbihPoints: { ar: 'نقاط التسبيح', en: 'Tasbih Points' },
      title: { ar: 'لوحة الشرف', en: 'Honor Board' },
      yourMonthlyPoints: { ar: 'نقاطك الشهرية', en: 'Your Monthly Points' },
    }
  },

  shareService: {
    interfaceType: `  shareService: {
    ayahRef: string;
    dhikr: string;
    prayerTimes: string;
    repeat: string;
    shareFrom: string;
    shareTitle: string;
    source: string;
    surahRef: string;
    time: string;
    translation: string;
    virtue: string;
  };`,
    values: {
      ayahRef: { ar: 'الآية', en: 'Verse Reference' },
      dhikr: { ar: 'ذكر', en: 'Dhikr' },
      prayerTimes: { ar: 'مواقيت الصلاة', en: 'Prayer Times' },
      repeat: { ar: 'يُكرر', en: 'Repeat' },
      shareFrom: { ar: 'مشاركة من', en: 'Shared from' },
      shareTitle: { ar: 'مشاركة', en: 'Share' },
      source: { ar: 'المصدر', en: 'Source' },
      surahRef: { ar: 'السورة', en: 'Surah Reference' },
      time: { ar: 'الوقت', en: 'Time' },
      translation: { ar: 'الترجمة', en: 'Translation' },
      virtue: { ar: 'الفضل', en: 'Virtue' },
    }
  },

  seasonal: {
    interfaceType: `  seasonal: {
    activeSeason: string;
    allSeasons: string;
    currentDay: string;
    day: string;
    daysRemaining: string;
    enterSeason: string;
    islamicSeasons: string;
    nextSeason: string;
    noActiveSeason: string;
    progress: string;
    specialDay: string;
  };`,
    values: {
      activeSeason: { ar: 'الموسم الحالي', en: 'Active Season' },
      allSeasons: { ar: 'جميع المواسم', en: 'All Seasons' },
      currentDay: { ar: 'اليوم الحالي', en: 'Current Day' },
      day: { ar: 'يوم', en: 'Day' },
      daysRemaining: { ar: 'أيام متبقية', en: 'Days Remaining' },
      enterSeason: { ar: 'دخول الموسم', en: 'Enter Season' },
      islamicSeasons: { ar: 'المواسم الإسلامية', en: 'Islamic Seasons' },
      nextSeason: { ar: 'الموسم القادم', en: 'Next Season' },
      noActiveSeason: { ar: 'لا يوجد موسم حالياً', en: 'No active season' },
      progress: { ar: 'التقدم', en: 'Progress' },
      specialDay: { ar: 'يوم مميز', en: 'Special Day' },
    }
  },

  quranReminder: {
    interfaceType: `  quranReminder: {
    deselectAll: string;
    dontForgetQuran: string;
    enableReminder: string;
    everyDay: string;
    noDaysSelected: string;
    reminder: string;
    selectAllDays: string;
    selectDays: string;
    selectSound: string;
    setReminderTime: string;
    title: string;
  };`,
    values: {
      deselectAll: { ar: 'إلغاء تحديد الكل', en: 'Deselect All' },
      dontForgetQuran: { ar: 'لا تنسَ وِرد القرآن', en: "Don't forget your Quran wird" },
      enableReminder: { ar: 'تفعيل التذكير', en: 'Enable Reminder' },
      everyDay: { ar: 'كل يوم', en: 'Every Day' },
      noDaysSelected: { ar: 'لم يتم اختيار أيام', en: 'No days selected' },
      reminder: { ar: 'تذكير', en: 'Reminder' },
      selectAllDays: { ar: 'تحديد جميع الأيام', en: 'Select All Days' },
      selectDays: { ar: 'اختر الأيام', en: 'Select Days' },
      selectSound: { ar: 'اختر الصوت', en: 'Select Sound' },
      setReminderTime: { ar: 'تحديد وقت التذكير', en: 'Set Reminder Time' },
      title: { ar: 'تذكير القرآن', en: 'Quran Reminder' },
    }
  },

  qibla: {
    interfaceType: `  qibla: {
    aligned: string;
    findingDirection: string;
    internetRequired: string;
    locationFailed: string;
    permissionRequired: string;
    sensorFailed: string;
    servicesDisabled: string;
    turnLeft: string;
    turnRight: string;
  };`,
    values: {
      aligned: { ar: 'القبلة أمامك', en: 'Qibla Aligned' },
      findingDirection: { ar: 'جاري تحديد الاتجاه...', en: 'Finding direction...' },
      internetRequired: { ar: 'يتطلب الاتصال بالإنترنت', en: 'Internet required' },
      locationFailed: { ar: 'فشل تحديد الموقع', en: 'Location failed' },
      permissionRequired: { ar: 'يتطلب إذن الموقع', en: 'Location permission required' },
      sensorFailed: { ar: 'فشل المستشعر', en: 'Sensor failed' },
      servicesDisabled: { ar: 'خدمات الموقع معطلة', en: 'Location services disabled' },
      turnLeft: { ar: 'اتجه يساراً', en: 'Turn Left' },
      turnRight: { ar: 'اتجه يميناً', en: 'Turn Right' },
    }
  },

  ayatUniverse: {
    interfaceType: `  ayatUniverse: {
    introSubtitle: string;
    introTitle: string;
    readInMushaf: string;
    themeCreation: string;
    themeHeavensEarth: string;
    themeHumanCreation: string;
    themeNatureWater: string;
    themePowerDominion: string;
    title: string;
  };`,
    values: {
      introSubtitle: { ar: 'تأمل في عظمة الخالق من خلال آياته', en: 'Reflect on the greatness of the Creator through His verses' },
      introTitle: { ar: 'آيات الكون', en: 'Verses of the Universe' },
      readInMushaf: { ar: 'اقرأ في المصحف', en: 'Read in Mushaf' },
      themeCreation: { ar: 'الخلق والإبداع', en: 'Creation & Innovation' },
      themeHeavensEarth: { ar: 'السماوات والأرض', en: 'Heavens & Earth' },
      themeHumanCreation: { ar: 'خلق الإنسان', en: 'Human Creation' },
      themeNatureWater: { ar: 'الطبيعة والماء', en: 'Nature & Water' },
      themePowerDominion: { ar: 'القوة والملكوت', en: 'Power & Dominion' },
      title: { ar: 'آيات الكون', en: 'Verses of the Universe' },
    }
  },

  photoBackgrounds: {
    interfaceType: `  photoBackgrounds: {
    browseBgs: string;
    browseDownload: string;
    dimIntensity: string;
    noSavedBgs: string;
    preview: string;
    saveAndSet: string;
    saved: string;
    setAsBg: string;
  };`,
    values: {
      browseBgs: { ar: 'تصفح الخلفيات', en: 'Browse Backgrounds' },
      browseDownload: { ar: 'تصفح وتحميل', en: 'Browse & Download' },
      dimIntensity: { ar: 'شدة التعتيم', en: 'Dim Intensity' },
      noSavedBgs: { ar: 'لا توجد خلفيات محفوظة', en: 'No saved backgrounds' },
      preview: { ar: 'معاينة', en: 'Preview' },
      saveAndSet: { ar: 'حفظ وتعيين', en: 'Save & Set' },
      saved: { ar: 'تم الحفظ', en: 'Saved' },
      setAsBg: { ar: 'تعيين كخلفية', en: 'Set as Background' },
    }
  },

  tafsirSearch: {
    interfaceType: `  tafsirSearch: {
    arabicLang: string;
    placeholder: string;
    searchBtn: string;
    searchHint: string;
    tafsirBtn: string;
    title: string;
    tryDifferentWords: string;
  };`,
    values: {
      arabicLang: { ar: 'العربية', en: 'Arabic' },
      placeholder: { ar: 'ابحث في التفسير...', en: 'Search tafsir...' },
      searchBtn: { ar: 'بحث', en: 'Search' },
      searchHint: { ar: 'ابحث في التفسير', en: 'Search in tafsir' },
      tafsirBtn: { ar: 'التفسير', en: 'Tafsir' },
      title: { ar: 'بحث التفسير', en: 'Tafsir Search' },
      tryDifferentWords: { ar: 'جرب كلمات مختلفة', en: 'Try different words' },
    }
  },

  errorBoundary: {
    interfaceType: `  errorBoundary: {
    contactSupport: string;
    description: string;
    duaEase: string;
    errorDetails: string;
    restartApp: string;
    title: string;
    tryAgain: string;
  };`,
    values: {
      contactSupport: { ar: 'تواصل مع الدعم', en: 'Contact Support' },
      description: { ar: 'حدث خطأ غير متوقع', en: 'An unexpected error occurred' },
      duaEase: { ar: 'اللهم يسّر ولا تعسّر', en: 'O Allah, make it easy and not difficult' },
      errorDetails: { ar: 'تفاصيل الخطأ', en: 'Error Details' },
      restartApp: { ar: 'إعادة تشغيل التطبيق', en: 'Restart App' },
      title: { ar: 'حدث خطأ', en: 'Error Occurred' },
      tryAgain: { ar: 'حاول مرة أخرى', en: 'Try Again' },
    }
  },

  companions: {
    interfaceType: `  companions: {
    footerDua: string;
    footerText: string;
    heroSubtitle: string;
    heroTitle: string;
    story: string;
    title: string;
    virtues: string;
  };`,
    values: {
      footerDua: { ar: 'رضي الله عنهم أجمعين', en: 'May Allah be pleased with them all' },
      footerText: { ar: 'الصحابة رضوان الله عليهم', en: 'The noble companions' },
      heroSubtitle: { ar: 'قصص وعبر من حياة الصحابة', en: 'Stories and lessons from the companions' },
      heroTitle: { ar: 'قصص الصحابة', en: "Companions' Stories" },
      story: { ar: 'القصة', en: 'Story' },
      title: { ar: 'الصحابة', en: 'Companions' },
      virtues: { ar: 'الفضائل', en: 'Virtues' },
    }
  },

  azkarSearch: {
    interfaceType: `  azkarSearch: {
    clearAll: string;
    hasVirtue: string;
    noAzkarMatch: string;
    noAzkarWithVirtue: string;
    recentSearches: string;
    searchTips: string;
    virtueOfAzkar: string;
  };`,
    values: {
      clearAll: { ar: 'مسح الكل', en: 'Clear All' },
      hasVirtue: { ar: 'له فضل', en: 'Has Virtue' },
      noAzkarMatch: { ar: 'لا توجد أذكار مطابقة', en: 'No matching azkar' },
      noAzkarWithVirtue: { ar: 'لا توجد أذكار بفضل', en: 'No azkar with virtue' },
      recentSearches: { ar: 'بحث سابق', en: 'Recent Searches' },
      searchTips: { ar: 'نصائح البحث', en: 'Search Tips' },
      virtueOfAzkar: { ar: 'فضل الأذكار', en: 'Virtue of Azkar' },
    }
  },

  recitations: {
    interfaceType: `  recitations: {
    downloaded: string;
    favoritesLabel: string;
    juzTab: string;
    searchSurah: string;
    surahsTab: string;
    title: string;
  };`,
    values: {
      downloaded: { ar: 'تم التحميل', en: 'Downloaded' },
      favoritesLabel: { ar: 'المفضلة', en: 'Favorites' },
      juzTab: { ar: 'الأجزاء', en: 'Juz' },
      searchSurah: { ar: 'ابحث عن سورة', en: 'Search Surah' },
      surahsTab: { ar: 'السور', en: 'Surahs' },
      title: { ar: 'التلاوات', en: 'Recitations' },
    }
  },

  hadithSifat: {
    interfaceType: `  hadithSifat: {
    introSubtitle: string;
    introTitle: string;
    narrator: string;
    shareText: string;
    source: string;
    title: string;
  };`,
    values: {
      introSubtitle: { ar: 'تأمل في صفات الله العلى', en: 'Reflect on the attributes of Allah' },
      introTitle: { ar: 'أحاديث الصفات', en: 'Hadith of Attributes' },
      narrator: { ar: 'الراوي', en: 'Narrator' },
      shareText: { ar: 'مشاركة', en: 'Share' },
      source: { ar: 'المصدر', en: 'Source' },
      title: { ar: 'أحاديث الصفات', en: 'Hadith of Attributes' },
    }
  },

  aboutApp: {
    interfaceType: `  aboutApp: {
    description: string;
    emailSubject: string;
    features: string;
    stats: string;
    subtitle: string;
  };`,
    values: {
      description: { ar: 'تطبيق إسلامي شامل', en: 'A comprehensive Islamic app' },
      emailSubject: { ar: 'تواصل معنا - روح المسلم', en: 'Contact Us - Ruh Al-Muslim' },
      features: { ar: 'المزايا', en: 'Features' },
      stats: { ar: 'الإحصائيات', en: 'Statistics' },
      subtitle: { ar: 'رفيقك الإيماني', en: 'Your spiritual companion' },
    }
  },

  seerah: {
    interfaceType: `  seerah: {
    chapters: string;
    heroSubtitle: string;
    heroTitle: string;
    title: string;
  };`,
    values: {
      chapters: { ar: 'الفصول', en: 'Chapters' },
      heroSubtitle: { ar: 'نور الهدى وسيرة خير البشر', en: 'Light of guidance and biography of the best of mankind' },
      heroTitle: { ar: 'السيرة النبوية', en: "Prophet's Biography" },
      title: { ar: 'السيرة النبوية', en: "Prophet's Biography" },
    }
  },

  prayerAdjustments: {
    interfaceType: `  prayerAdjustments: {
    hint: string;
    minutesSuffix: string;
    reset: string;
    title: string;
  };`,
    values: {
      hint: { ar: 'اضبط تعديلات المواقيت حسب موقعك', en: 'Adjust prayer times for your location' },
      minutesSuffix: { ar: 'دقائق', en: 'minutes' },
      reset: { ar: 'إعادة تعيين', en: 'Reset' },
      title: { ar: 'تعديل المواقيت', en: 'Prayer Adjustments' },
    }
  },

  countdown: {
    interfaceType: `  countdown: {
    hourLabel: string;
    minuteLabel: string;
    secondLabel: string;
  };`,
    values: {
      hourLabel: { ar: 'ساعة', en: 'hour' },
      minuteLabel: { ar: 'دقيقة', en: 'minute' },
      secondLabel: { ar: 'ثانية', en: 'second' },
    }
  },

  hijri: {
    interfaceType: `  hijri: {
    adjustDesc: string;
    adjustTitle: string;
    noAdjustment: string;
  };`,
    values: {
      adjustDesc: { ar: 'اضبط التاريخ الهجري إذا كان مختلفاً عن التقويم المحلي', en: 'Adjust Hijri date if different from local calendar' },
      adjustTitle: { ar: 'تعديل التاريخ الهجري', en: 'Hijri Date Adjustment' },
      noAdjustment: { ar: 'بدون تعديل', en: 'No Adjustment' },
    }
  },

  hajj: {
    interfaceType: `  hajj: {
    duaWord: string;
    duasWord: string;
  };`,
    values: {
      duaWord: { ar: 'دعاء', en: 'Dua' },
      duasWord: { ar: 'أدعية', en: 'Duas' },
    }
  },

  widget: {
    interfaceType: `  widget: {
    miscAzkar: string;
  };`,
    values: {
      miscAzkar: { ar: 'أذكار متنوعة', en: 'Miscellaneous Azkar' },
    }
  },

  names: {
    interfaceType: `  names: {
    evidence: string;
    explanation: string;
    gridView: string;
    listView: string;
    meaning: string;
    nameCopied: string;
    shareHeader: string;
    title: string;
    whatsapp: string;
  };`,
    values: {
      evidence: { ar: 'الدليل', en: 'Evidence' },
      explanation: { ar: 'الشرح', en: 'Explanation' },
      gridView: { ar: 'عرض شبكي', en: 'Grid View' },
      listView: { ar: 'عرض قائمة', en: 'List View' },
      meaning: { ar: 'المعنى', en: 'Meaning' },
      nameCopied: { ar: 'تم نسخ الاسم', en: 'Name copied' },
      shareHeader: { ar: 'من أسماء الله الحسنى', en: 'From the Beautiful Names of Allah' },
      title: { ar: 'أسماء الله الحسنى', en: 'Names of Allah' },
      whatsapp: { ar: 'واتساب', en: 'WhatsApp' },
    }
  },

  onboarding: {
    interfaceType: `  onboarding: {
    getStarted: string;
    skip: string;
    welcomeDesc: string;
    welcomeTitle: string;
  };`,
    values: {
      getStarted: { ar: 'ابدأ الآن', en: 'Get Started' },
      skip: { ar: 'تخطي', en: 'Skip' },
      welcomeDesc: { ar: 'رفيقك الإيماني في كل لحظة', en: 'Your spiritual companion at every moment' },
      welcomeTitle: { ar: 'أهلاً بك في روح المسلم', en: 'Welcome to Ruh Al-Muslim' },
    }
  },
};

// ──────────── MISSING KEYS IN EXISTING NAMESPACES ────────────

interface MissingKeyData {
  ar: string;
  en: string;
}

const EXISTING_NS_MISSING: Record<string, Record<string, MissingKeyData>> = {
  home: {
    highlights: { ar: 'المميزات', en: 'Highlights' },
    dailyAzkar: { ar: 'الأذكار اليومية', en: 'Daily Azkar' },
    dailyDua: { ar: 'دعاء اليوم', en: 'Daily Dua' },
    dailyStory: { ar: 'قصة اليوم', en: 'Story of the Day' },
    reorderSections: { ar: 'إعادة ترتيب الأقسام', en: 'Reorder Sections' },
    reorderHighlights: { ar: 'إعادة ترتيب المميزات', en: 'Reorder Highlights' },
    hajjUmrahSection: { ar: 'قسم الحج والعمرة', en: 'Hajj & Umrah Section' },
    hadithOfDay: { ar: 'حديث اليوم', en: 'Hadith of the Day' },
    quoteOfDay: { ar: 'حكمة اليوم', en: 'Quote of the Day' },
    anotherHadith: { ar: 'حديث آخر', en: 'Another Hadith' },
    anotherWisdom: { ar: 'حكمة أخرى', en: 'Another Wisdom' },
    customize: { ar: 'تخصيص', en: 'Customize' },
    customizeQuickAccess: { ar: 'تخصيص الوصول السريع', en: 'Customize Quick Access' },
    searchSection: { ar: 'ابحث في الأقسام', en: 'Search sections' },
    searchSurah: { ar: 'ابحث عن سورة', en: 'Search surah' },
    selectMode: { ar: 'وضع الاختيار', en: 'Select Mode' },
    reorderMode: { ar: 'وضع إعادة الترتيب', en: 'Reorder Mode' },
    addOther: { ar: 'إضافة أخرى', en: 'Add Other' },
    appPage: { ar: 'صفحة من التطبيق', en: 'App Page' },
    alertActivated: { ar: 'تنبيه مفعّل', en: 'Alert Activated' },
    alertActivatedMsg: { ar: 'سيتم تنبيهك قبل دقائق من موعد الصلاة', en: 'Alert before prayer time' },
    alertBeforePrayer: { ar: 'التنبيه قبل الصلاة', en: 'Alert Before Prayer' },
    hour: { ar: 'ساعة', en: 'hour' },
    minuteLabel: { ar: 'دقيقة', en: 'minute' },
    secondLabel: { ar: 'ثانية', en: 'second' },
    myNextPrayer: { ar: 'صلاتي القادمة', en: 'My Next Prayer' },
    noPrayerData: { ar: 'لا توجد بيانات صلاة', en: 'No prayer data' },
    viewAllTimes: { ar: 'عرض جميع المواقيت', en: 'View All Times' },
    quranSurahLabel: { ar: 'سورة قرآنية', en: 'Quranic Surah' },
    tafsirMuyassar: { ar: 'التفسير الميسر', en: 'Tafsir Muyassar' },
    dontShowAgain: { ar: 'عدم الظهور مرة أخرى', en: "Don't Show Again" },
    bgColors: { ar: 'ألوان الخلفية', en: 'Background Colors' },
    bgDesert: { ar: 'صحراء', en: 'Desert' },
    bgMosque: { ar: 'مسجد', en: 'Mosque' },
    bgNature: { ar: 'طبيعة', en: 'Nature' },
    bgOcean: { ar: 'محيط', en: 'Ocean' },
    bgSky: { ar: 'سماء', en: 'Sky' },
  },

  settings: {
    prayerAndAzkarAlerts: { ar: 'تنبيهات الصلاة والأذكار', en: 'Prayer & Azkar Alerts' },
    liveActivities: { ar: 'الأنشطة الحية', en: 'Live Activities' },
    premium: { ar: 'النسخة المميزة', en: 'Premium' },
    morningWirdTitle: { ar: 'الورد الصباحي', en: 'Morning Wird' },
    morningWirdBody: { ar: 'تذكيرات بأذكار الصباح', en: 'Morning azkar reminders' },
    morningWirdTime: { ar: 'وقت الورد الصباحي', en: 'Morning Wird Time' },
    eveningWirdTitle: { ar: 'الورد المسائي', en: 'Evening Wird' },
    eveningWirdBody: { ar: 'تذكيرات بأذكار المساء', en: 'Evening azkar reminders' },
    eveningWirdTime: { ar: 'وقت الورد المسائي', en: 'Evening Wird Time' },
    morningAzkar: { ar: 'أذكار الصباح', en: 'Morning Azkar' },
    eveningAzkar: { ar: 'أذكار المساء', en: 'Evening Azkar' },
    morningWird: { ar: 'الورد الصباحي', en: 'Morning Wird' },
    eveningWird: { ar: 'الورد المسائي', en: 'Evening Wird' },
    dailyAyahTitle: { ar: 'آية اليوم', en: 'Verse of the Day' },
    dailyAyahTime: { ar: 'وقت آية اليوم', en: 'Verse Time' },
    dailyVerseLabel: { ar: 'آية يومية', en: 'Daily Verse' },
    dailyVerseDesc: { ar: 'آية قرآنية جديدة كل يوم', en: 'A new Quranic verse daily' },
    dailyWird: { ar: 'الورد اليومي', en: 'Daily Wird' },
    dailyWirdTwice: { ar: 'الورد اليومي (مرتين)', en: 'Daily Wird (Twice)' },
    enableFromSettings: { ar: 'تفعيل من الإعدادات', en: 'Enable from Settings' },
    enableNotifPermission: { ar: 'تفعيل إذن الإشعارات', en: 'Enable Notification Permission' },
    enableReminder: { ar: 'تفعيل التذكير', en: 'Enable Reminder' },
    adhanType: { ar: 'نوع الأذان', en: 'Adhan Type' },
    fullAdhan: { ar: 'الأذان الكامل', en: 'Full Adhan' },
    fullAdhanDesc: { ar: 'الأذان الكامل من المسجد الحرام', en: 'Complete adhan from the Holy Mosque' },
    simpleAdhan: { ar: 'أذان بسيط', en: 'Simple Adhan' },
    simpleAdhanDesc: { ar: 'نسخة مختصرة من الأذان', en: 'Shortened version of adhan' },
    atAdhanTime: { ar: 'في وقت الأذان', en: 'At Adhan Time' },
    advanceReminder: { ar: 'تذكير مسبق', en: 'Advance Reminder' },
    minutesBefore: { ar: 'دقائق قبل', en: 'minutes before' },
    adhanPrayer: { ar: 'أذان الصلاة', en: 'Prayer Adhan' },
    adhanError: { ar: 'خطأ في الأذان', en: 'Adhan Error' },
    adhanErrorDesc: { ar: 'فشل تشغيل الأذان', en: 'Failed to play adhan' },
    kahfFriday: { ar: 'الكهف يوم الجمعة', en: 'Kahf on Friday' },
    kahfTitle: { ar: 'تذكير بسورة الكهف', en: 'Surah Kahf Reminder' },
    kahfBody: { ar: 'قراءة سورة الكهف يوم الجمعة مستحبة', en: 'Reading Surah Kahf on Friday is recommended' },
    kahfReminderTime: { ar: 'وقت تذكير الكهف', en: 'Kahf Reminder Time' },
    fridayReminder: { ar: 'تذكير يوم الجمعة', en: 'Friday Reminder' },
    everyFriday: { ar: 'كل يوم جمعة', en: 'Every Friday' },
    surahKahf: { ar: 'سورة الكهف', en: 'Surah Kahf' },
    prayerLayout: { ar: 'تخطيط الصلاة', en: 'Prayer Layout' },
    quranSettings: { ar: 'إعدادات القرآن', en: 'Quran Settings' },
    quranFontSettings: { ar: 'إعدادات خط القرآن', en: 'Quran Font Settings' },
    quranTranslations: { ar: 'ترجمات القرآن', en: 'Quran Translations' },
    quranReadingReminderSettings: { ar: 'إعدادات تذكير القراءة', en: 'Reading Reminder Settings' },
    quranReminderDesc: { ar: 'تذكيرات يومية لقراءة القرآن', en: 'Daily Quran reading reminders' },
    reminderTime: { ar: 'وقت التذكير', en: 'Reminder Time' },
    reminderDays: { ar: 'أيام التذكير', en: 'Reminder Days' },
    salawatTitle: { ar: 'الصلاة على النبي', en: 'Salawat' },
    salawatBody: { ar: 'تذكيرات بالصلاة على النبي ﷺ', en: 'Blessings on the Prophet reminders' },
    istighfarTitle: { ar: 'الاستغفار', en: 'Istighfar' },
    istighfarBody: { ar: 'تذكيرات بالاستغفار والتوبة', en: 'Seeking forgiveness reminders' },
    tasbihReminderTitle: { ar: 'تذكير التسبيح', en: 'Tasbih Reminder' },
    tasbihReminderBody: { ar: 'تذكيرات منتظمة للتسبيح', en: 'Regular tasbih reminders' },
    sleepAzkarTitle: { ar: 'أذكار النوم', en: 'Sleep Azkar' },
    sleepAzkarBody: { ar: 'أذكار مستحبة قبل النوم', en: 'Recommended azkar before sleep' },
    wakeupAzkarTitle: { ar: 'أذكار الاستيقاظ', en: 'Wake-up Azkar' },
    wakeupAzkarBody: { ar: 'أذكار مستحبة عند الاستيقاظ', en: 'Recommended azkar upon waking' },
    selectTranslationLanguage: { ar: 'اختر لغة الترجمة', en: 'Select Translation Language' },
    translationLanguageDesc: { ar: 'اختر اللغة المفضلة للترجمة', en: 'Choose preferred translation language' },
    noTranslationOption: { ar: 'بدون ترجمة', en: 'No Translation' },
    surahReminder: { ar: 'تذكير السورة', en: 'Surah Reminder' },
    surahReadingTime: { ar: 'وقت قراءة السورة', en: 'Surah Reading Time' },
    verseReminder: { ar: 'تذكير الآية', en: 'Verse Reminder' },
    manageReminders: { ar: 'إدارة التذكيرات', en: 'Manage Reminders' },
    notificationsCenter: { ar: 'مركز الإشعارات', en: 'Notifications Center' },
    preview: { ar: 'معاينة', en: 'Preview' },
    saved: { ar: 'تم الحفظ', en: 'Saved' },
    success: { ar: 'نجاح', en: 'Success' },
    alertTitle: { ar: 'تنبيه', en: 'Alert' },
    active: { ar: 'مفعّل', en: 'Active' },
    activeSummary: { ar: 'ملخص النشاط', en: 'Activity Summary' },
    inactive: { ar: 'معطّل', en: 'Inactive' },
    customReminderDefault: { ar: 'تذكير مخصص افتراضي', en: 'Default Custom Reminder' },
    homeLayout: { ar: 'تخطيط الصفحة الرئيسية', en: 'Home Layout' },
    layoutWidget: { ar: 'ودجة', en: 'Widget' },
    layoutWidgetDesc: { ar: 'عرض ودجات دائرية', en: 'Display circular widgets' },
    layoutList: { ar: 'قائمة', en: 'List' },
    layoutListDesc: { ar: 'عرض قائمة أفقية', en: 'Display horizontal list' },
    photoBackgrounds: { ar: 'خلفيات الصور', en: 'Photo Backgrounds' },
    colorBackgrounds: { ar: 'خلفيات الألوان', en: 'Color Backgrounds' },
    backgroundLoadError: { ar: 'فشل تحميل الخلفيات', en: 'Failed to load backgrounds' },
    changeLanguage: { ar: 'تغيير اللغة', en: 'Change Language' },
    languageChangeConfirm: { ar: 'هل تريد تغيير اللغة؟', en: 'Change language?' },
    languageChangeError: { ar: 'خطأ في تغيير اللغة', en: 'Error changing language' },
    languageChangeRTLWarning: { ar: 'قد تحتاج إعادة تشغيل التطبيق', en: 'App restart may be needed' },
    timeFormat: { ar: 'صيغة الوقت', en: 'Time Format' },
    hour: { ar: 'ساعة', en: 'hour' },
    minute: { ar: 'دقيقة', en: 'minute' },
    sendSuggestion: { ar: 'إرسال اقتراح', en: 'Send Suggestion' },
    suggestFeature: { ar: 'اقترح ميزة', en: 'Suggest a Feature' },
    suggestFeatureDesc: { ar: 'شارك أفكارك لتحسين التطبيق', en: 'Share ideas to improve the app' },
    suggestFeatureTitle: { ar: 'اقتراحك مهم لنا', en: 'Your Suggestion Matters' },
    suggestPlaceholder: { ar: 'اكتب اقتراحك هنا...', en: 'Type suggestion here...' },
    suggestionAlert: { ar: 'تنبيه الاقتراح', en: 'Suggestion Alert' },
    suggestionEmpty: { ar: 'الرجاء كتابة اقتراح', en: 'Please write a suggestion' },
    suggestionError: { ar: 'خطأ في الاقتراح', en: 'Suggestion Error' },
    suggestionErrorMsg: { ar: 'فشل إرسال الاقتراح', en: 'Failed to send suggestion' },
    suggestionSuccess: { ar: 'تم الاقتراح بنجاح', en: 'Suggestion sent' },
    suggestionThanks: { ar: 'شكراً على اقتراحك!', en: 'Thank you for your suggestion!' },
    subscription: { ar: 'الاشتراك', en: 'Subscription' },
    updateAvailable: { ar: 'تحديث متاح', en: 'Update Available' },
    notifPermissionTitle: { ar: 'إذن الإشعارات', en: 'Notification Permission' },
  },

  common: {
    appBackgrounds: { ar: 'خلفيات التطبيق', en: 'App Backgrounds' },
    appSharingSig: { ar: 'من تطبيق روح المسلم', en: 'From Ruh Al-Muslim app' },
    change: { ar: 'تغيير', en: 'Change' },
    colors: { ar: 'ألوان', en: 'Colors' },
    count: { ar: 'عدد', en: 'Count' },
    days: { ar: 'أيام', en: 'days' },
    daysCount: { ar: 'عدد الأيام', en: 'Days Count' },
    default: { ar: 'افتراضي', en: 'Default' },
    deleteBackground: { ar: 'حذف الخلفية', en: 'Delete Background' },
    errorLoadContent: { ar: 'خطأ في تحميل المحتوى', en: 'Error loading content' },
    fromApp: { ar: 'من تطبيق روح المسلم', en: 'From Ruh Al-Muslim' },
    gradients: { ar: 'تدرجات', en: 'Gradients' },
    hour: { ar: 'ساعة', en: 'hour' },
    image: { ar: 'صورة', en: 'Image' },
    imageCreationError: { ar: 'خطأ في إنشاء الصورة', en: 'Image creation error' },
    imageSaveError: { ar: 'خطأ في حفظ الصورة', en: 'Image save error' },
    imageSavedSuccess: { ar: 'تم حفظ الصورة بنجاح', en: 'Image saved successfully' },
    lifetime: { ar: 'مدى الحياة', en: 'Lifetime' },
    loadFailed: { ar: 'فشل التحميل', en: 'Load Failed' },
    maintenance: { ar: 'صيانة', en: 'Maintenance' },
    maintenanceDesc: { ar: 'التطبيق تحت الصيانة', en: 'App under maintenance' },
    minute: { ar: 'دقيقة', en: 'minute' },
    monthly: { ar: 'شهري', en: 'Monthly' },
    networkError: { ar: 'خطأ في الشبكة', en: 'Network Error' },
    noAudioFile: { ar: 'لا يوجد ملف صوتي', en: 'No audio file' },
    noConnection: { ar: 'لا يوجد اتصال', en: 'No Connection' },
    noContent: { ar: 'لا يوجد محتوى', en: 'No Content' },
    noResultsFound: { ar: 'لا توجد نتائج', en: 'No results found' },
    oneDay: { ar: 'يوم واحد', en: 'One Day' },
    open: { ar: 'فتح', en: 'Open' },
    page: { ar: 'صفحة', en: 'page' },
    pageUnavailable: { ar: 'الصفحة غير متاحة', en: 'Page unavailable' },
    photoPermissionRequired: { ar: 'يتطلب إذن الصور', en: 'Photo permission required' },
    premiumFeature: { ar: 'ميزة مميزة', en: 'Premium Feature' },
    premiumOnly: { ar: 'للمميزين فقط', en: 'Premium Only' },
    preparing: { ar: 'جاري التحضير...', en: 'Preparing...' },
    randomBackground: { ar: 'خلفية عشوائية', en: 'Random Background' },
    randomColor: { ar: 'لون عشوائي', en: 'Random Color' },
    remove: { ar: 'إزالة', en: 'Remove' },
    reset: { ar: 'إعادة تعيين', en: 'Reset' },
    result: { ar: 'نتيجة', en: 'Result' },
    saveError: { ar: 'خطأ في الحفظ', en: 'Save Error' },
    savedSuccess: { ar: 'تم الحفظ بنجاح', en: 'Saved successfully' },
    sectionLoadError: { ar: 'خطأ في تحميل القسم', en: 'Section load error' },
    sectionUnavailable: { ar: 'القسم غير متاح', en: 'Section unavailable' },
    shareError: { ar: 'خطأ في المشاركة', en: 'Share Error' },
    shareImage: { ar: 'مشاركة كصورة', en: 'Share as Image' },
    shareText: { ar: 'مشاركة كنص', en: 'Share as Text' },
    success: { ar: 'نجاح', en: 'Success' },
    text: { ar: 'نص', en: 'Text' },
    textCopiedSuccess: { ar: 'تم نسخ النص', en: 'Text copied' },
    today: { ar: 'اليوم', en: 'Today' },
    updateDesc: { ar: 'تحديث جديد متاح', en: 'New update available' },
    updateNow: { ar: 'تحديث الآن', en: 'Update Now' },
    updateRequired: { ar: 'تحديث مطلوب', en: 'Update Required' },
    warning: { ar: 'تحذير', en: 'Warning' },
    yearly: { ar: 'سنوي', en: 'Yearly' },
  },

  calendar: {
    ahSuffix: { ar: 'هـ', en: 'AH' },
    correspondsTo: { ar: 'يقابل', en: 'corresponds to' },
    dateConverter: { ar: 'محول التاريخ', en: 'Date Converter' },
    hijriNote: { ar: 'التواريخ الهجرية تقريبية', en: 'Hijri dates are approximate' },
    daysShort: { ar: 'أيام', en: 'days' },
    gregorian: { ar: 'ميلادي', en: 'Gregorian' },
    hijri: { ar: 'هجري', en: 'Hijri' },
    selectedDay: { ar: 'اليوم المختار', en: 'Selected Day' },
    upcomingEvents: { ar: 'الأحداث القادمة', en: 'Upcoming Events' },
    badr: { ar: 'غزوة بدر', en: 'Battle of Badr' },
    qadr: { ar: 'ليلة القدر', en: 'Night of Power' },
    qadrStarts: { ar: 'تبدأ ليلة القدر', en: 'Night of Power starts' },
    tarwiyah: { ar: 'يوم التروية', en: 'Day of Tarwiyah' },
    tashreeq: { ar: 'أيام التشريق', en: 'Days of Tashreeq' },
    newYearDesc: { ar: 'بداية السنة الهجرية الجديدة', en: 'Beginning of new Islamic year' },
  },

  prayer: {
    asrCalculation: { ar: 'حساب العصر', en: 'Asr Calculation' },
    asrMethod: { ar: 'طريقة حساب العصر', en: 'Asr Method' },
    asrMethodHanafi: { ar: 'حنفي', en: 'Hanafi' },
    asrMethodHanafiDesc: { ar: 'عندما يصبح ظل الشيء مثليه', en: 'When shadow is twice the length' },
    asrMethodShafii: { ar: 'شافعي', en: 'Shafii' },
    asrMethodShafiiDesc: { ar: 'عندما يصبح ظل الشيء مثله', en: 'When shadow equals the length' },
    calculationMethodHeader: { ar: 'طريقة الحساب', en: 'Calculation Method' },
    calculationMethodSection: { ar: 'قسم طريقة الحساب', en: 'Calculation Method Section' },
    choose: { ar: 'اختر', en: 'Choose' },
    clockStyleAnalog: { ar: 'تناظري', en: 'Analog' },
    clockStyleDigital: { ar: 'رقمي', en: 'Digital' },
    clockStyleWidget: { ar: 'ودجة', en: 'Widget' },
    displayOptions: { ar: 'خيارات العرض', en: 'Display Options' },
    enableLiveActivity: { ar: 'تفعيل النشاط المباشر', en: 'Enable Live Activity' },
    imsak: { ar: 'الإمساك', en: 'Imsak' },
    liveActivities: { ar: 'الأنشطة المباشرة', en: 'Live Activities' },
    liveActivityNotSupported: { ar: 'غير مدعوم', en: 'Not Supported' },
    methodEgyptian: { ar: 'الهيئة المصرية', en: 'Egyptian Authority' },
    methodEgyptianDesc: { ar: 'الهيئة العامة المصرية للمساحة', en: 'Egyptian General Authority' },
    methodGulf: { ar: 'دول الخليج', en: 'Gulf Region' },
    methodGulfDesc: { ar: 'طريقة حساب دول الخليج', en: 'Gulf region calculation' },
    methodIsna: { ar: 'ISNA', en: 'ISNA' },
    methodIsnaDesc: { ar: 'الجمعية الإسلامية لأمريكا الشمالية', en: 'Islamic Society of North America' },
    methodKarachi: { ar: 'جامعة كراتشي', en: 'Karachi' },
    methodKarachiDesc: { ar: 'جامعة العلوم الإسلامية بكراتشي', en: 'University of Islamic Sciences, Karachi' },
    methodKuwait: { ar: 'الكويت', en: 'Kuwait' },
    methodKuwaitDesc: { ar: 'طريقة حساب الكويت', en: 'Kuwait calculation' },
    methodMalaysia: { ar: 'ماليزيا', en: 'Malaysia' },
    methodMalaysiaDesc: { ar: 'إدارة الشؤون الإسلامية الماليزية', en: 'Malaysian Islamic Affairs' },
    methodMuslimWorldLeague: { ar: 'رابطة العالم الإسلامي', en: 'Muslim World League' },
    methodMuslimWorldLeagueDesc: { ar: 'رابطة العالم الإسلامي - مكة المكرمة', en: 'Muslim World League - Makkah' },
    methodTurkey: { ar: 'تركيا', en: 'Turkey' },
    methodTurkeyDesc: { ar: 'رئاسة الشؤون الدينية التركية', en: 'Turkish Religious Affairs' },
    methodUmmAlQura: { ar: 'أم القرى', en: 'Umm Al-Qura' },
    methodUmmAlQuraDesc: { ar: 'جامعة أم القرى - مكة المكرمة', en: 'Umm Al-Qura University, Makkah' },
    nextPrayerLabel: { ar: 'الصلاة القادمة', en: 'Next Prayer' },
    prayerSettingsTitle: { ar: 'إعدادات الصلاة', en: 'Prayer Settings' },
    remainingTimeFor: { ar: 'الوقت المتبقي لـ', en: 'Time remaining for' },
    remainingTimeForNextPrayer: { ar: 'الوقت المتبقي للصلاة القادمة', en: 'Time remaining for next prayer' },
    salahPrefix: { ar: 'صلاة', en: 'Salah' },
    showDate: { ar: 'عرض التاريخ', en: 'Show Date' },
    showLocation: { ar: 'عرض الموقع', en: 'Show Location' },
    showSunrise: { ar: 'عرض الشروق', en: 'Show Sunrise' },
    viewClock: { ar: 'عرض الساعة', en: 'View Clock' },
    viewList: { ar: 'عرض القائمة', en: 'View List' },
  },

  quran: {
    autoTafsir: { ar: 'التفسير التلقائي', en: 'Auto Tafsir' },
    autoTafsirDesc: { ar: 'عرض التفسير تلقائياً', en: 'Show tafsir automatically' },
    bookmark: { ar: 'إشارة مرجعية', en: 'Bookmark' },
    bookmarkGuide: { ar: 'دليل الإشارات', en: 'Bookmark Guide' },
    bookmarkHint: { ar: 'اضغط مطولاً على الآية لإضافة إشارة', en: 'Long press verse to bookmark' },
    cardStyle: { ar: 'نمط البطاقة', en: 'Card Style' },
    chooseReciter: { ar: 'اختر القارئ', en: 'Choose Reciter' },
    chooseTranslationDesc: { ar: 'اختر لغة الترجمة المفضلة', en: 'Choose preferred translation language' },
    chooseTranslationLanguage: { ar: 'اختر لغة الترجمة', en: 'Choose Translation Language' },
    chooseVerse: { ar: 'اختر آية', en: 'Choose Verse' },
    confirmDeleteDownload: { ar: 'تأكيد حذف التحميل', en: 'Confirm Delete Download' },
    defaultSize: { ar: 'الحجم الافتراضي', en: 'Default Size' },
    deleteDownload: { ar: 'حذف التحميل', en: 'Delete Download' },
    dontShowAgain: { ar: 'عدم الإظهار مرة أخرى', en: "Don't Show Again" },
    enabled: { ar: 'مفعّل', en: 'Enabled' },
    focusMode: { ar: 'وضع التركيز', en: 'Focus Mode' },
    focusModeAlertMessage: { ar: 'سيتم إخفاء جميع العناصر والتركيز على القراءة', en: 'All elements will be hidden for focused reading' },
    focusModeAlertTitle: { ar: 'وضع التركيز', en: 'Focus Mode' },
    focusModeDesc: { ar: 'إخفاء العناصر للتركيز على القراءة', en: 'Hide elements for focused reading' },
    fontSettings: { ar: 'إعدادات الخط', en: 'Font Settings' },
    imageBackground: { ar: 'خلفية الصورة', en: 'Image Background' },
    khatma: { ar: 'الختمة', en: 'Khatma' },
    lastPage: { ar: 'آخر صفحة', en: 'Last Page' },
    loadingQuran: { ar: 'جاري تحميل القرآن...', en: 'Loading Quran...' },
    longPressToGoToVerse: { ar: 'اضغط مطولاً للانتقال إلى الآية', en: 'Long press to go to verse' },
    mushafBackground: { ar: 'خلفية المصحف', en: 'Mushaf Background' },
    noBookmarkFound: { ar: 'لا توجد إشارة مرجعية', en: 'No bookmark found' },
    noTranslation: { ar: 'بدون ترجمة', en: 'No Translation' },
    notEnabled: { ar: 'غير مفعّل', en: 'Not Enabled' },
    ok: { ar: 'حسناً', en: 'OK' },
    openFavorites: { ar: 'فتح المحفوظات', en: 'Open Favorites' },
    quranReminder: { ar: 'تذكير القرآن', en: 'Quran Reminder' },
    quranSettings: { ar: 'إعدادات القرآن', en: 'Quran Settings' },
    reciterLabel: { ar: 'القارئ', en: 'Reciter' },
    reminderSettings: { ar: 'إعدادات التذكير', en: 'Reminder Settings' },
    searchByJuz: { ar: 'بحث بالجزء', en: 'Search by Juz' },
    searchBySurah: { ar: 'بحث بالسورة', en: 'Search by Surah' },
    selectReciter: { ar: 'اختر القارئ', en: 'Select Reciter' },
    selectReciterDesc: { ar: 'اختر القارئ المفضل', en: 'Choose preferred reciter' },
    selectedReciter: { ar: 'القارئ المختار', en: 'Selected Reciter' },
    shareWordsOfAllah: { ar: 'شارك كلمات الله', en: 'Share the Words of Allah' },
    showTafsir: { ar: 'عرض التفسير', en: 'Show Tafsir' },
    showTafsirBy: { ar: 'التفسير بواسطة', en: 'Tafsir by' },
    surahs: { ar: 'السور', en: 'Surahs' },
    translationToOtherLanguages: { ar: 'ترجمة لغات أخرى', en: 'Translation to Other Languages' },
    verseOfDay: { ar: 'آية اليوم', en: 'Verse of the Day' },
  },

  azkar: {
    addCustomDhikr: { ar: 'إضافة ذكر مخصص', en: 'Add Custom Dhikr' },
    alhamdulillah: { ar: 'الحمد لله', en: 'Alhamdulillah' },
    alreadyCompleted: { ar: 'مكتمل بالفعل', en: 'Already Completed' },
    anotherDhikr: { ar: 'ذكر آخر', en: 'Another Dhikr' },
    anotherDua: { ar: 'دعاء آخر', en: 'Another Dua' },
    arabicTextRequired: { ar: 'النص العربي مطلوب', en: 'Arabic text required' },
    congratulations: { ar: 'مبارك!', en: 'Congratulations!' },
    customAdhkar: { ar: 'أذكار مخصصة', en: 'Custom Adhkar' },
    dailyAzkar: { ar: 'أذكار يومية', en: 'Daily Azkar' },
    deleteCustomDhikr: { ar: 'حذف ذكر مخصص', en: 'Delete Custom Dhikr' },
    deleteCustomDhikrConfirm: { ar: 'هل تريد حذف هذا الذكر؟', en: 'Delete this dhikr?' },
    dhikrAddedSuccess: { ar: 'تم إضافة الذكر بنجاح', en: 'Dhikr added' },
    dhikrChangesDaily: { ar: 'الذكر يتغير يومياً', en: 'Dhikr changes daily' },
    dhikrName: { ar: 'اسم الذكر', en: 'Dhikr Name' },
    dhikrNamePlaceholder: { ar: 'أدخل اسم الذكر', en: 'Enter dhikr name' },
    dhikrTextPlaceholder: { ar: 'أدخل نص الذكر', en: 'Enter dhikr text' },
    dhikrTextSection: { ar: 'نص الذكر', en: 'Dhikr Text' },
    dhikrVirtue: { ar: 'فضل الذكر', en: 'Dhikr Virtue' },
    duaOfDay: { ar: 'دعاء اليوم', en: 'Dua of the Day' },
    enterDhikrNameAndText: { ar: 'أدخل اسم ونص الذكر', en: 'Enter dhikr name and text' },
    enterValidNumber: { ar: 'أدخل رقماً صحيحاً', en: 'Enter a valid number' },
    fromApp: { ar: 'من تطبيق روح المسلم', en: 'From Ruh Al-Muslim' },
    goBack: { ar: 'العودة', en: 'Go Back' },
    grid: { ar: 'شبكة', en: 'Grid' },
    hideTranslation: { ar: 'إخفاء الترجمة', en: 'Hide Translation' },
    iconSection: { ar: 'قسم الأيقونة', en: 'Icon Section' },
    list: { ar: 'قائمة', en: 'List' },
    listening: { ar: 'الاستماع', en: 'Listening' },
    mayAllahAccept: { ar: 'تقبل الله منا ومنكم', en: 'May Allah accept from us' },
    noDataSection: { ar: 'لا توجد بيانات', en: 'No data' },
    noResults: { ar: 'لا توجد نتائج', en: 'No results' },
    playlist: { ar: 'قائمة التشغيل', en: 'Playlist' },
    protectionAdhkar: { ar: 'أذكار الحماية', en: 'Protection Adhkar' },
    reading: { ar: 'القراءة', en: 'Reading' },
    repeatCount: { ar: 'عدد التكرار', en: 'Repeat Count' },
    selectedDuas: { ar: 'أدعية مختارة', en: 'Selected Duas' },
    tapForNewDua: { ar: 'اضغط لدعاء جديد', en: 'Tap for new dua' },
    translationOptional: { ar: 'الترجمة (اختياري)', en: 'Translation (optional)' },
    willRenewOnTime: { ar: 'سيتجدد في وقته', en: 'Will renew on time' },
  },

  khatma: {
    active: { ar: 'نشطة', en: 'Active' },
    barakAllah: { ar: 'بارك الله فيك', en: 'May Allah bless you' },
    behindSchedule: { ar: 'متأخر عن الجدول', en: 'Behind Schedule' },
    chooseAction: { ar: 'اختر إجراء', en: 'Choose Action' },
    chooseDuration: { ar: 'اختر المدة', en: 'Choose Duration' },
    completeWird: { ar: 'إكمال الورد', en: 'Complete Wird' },
    completeWirdBtn: { ar: 'إكمال', en: 'Complete' },
    completedBadge: { ar: 'مكتملة', en: 'Completed' },
    confirmCompleteWird: { ar: 'تأكيد إكمال الورد', en: 'Confirm Complete Wird' },
    createError: { ar: 'خطأ في الإنشاء', en: 'Create Error' },
    creating: { ar: 'جاري الإنشاء...', en: 'Creating...' },
    currentPosition: { ar: 'الموضع الحالي', en: 'Current Position' },
    dailyReminder: { ar: 'تذكير يومي', en: 'Daily Reminder' },
    dailyWird: { ar: 'الورد اليومي', en: 'Daily Wird' },
    daysLeft: { ar: 'أيام متبقية', en: 'Days Left' },
    defaultName: { ar: 'ختمة جديدة', en: 'New Khatma' },
    deleteKhatma: { ar: 'حذف الختمة', en: 'Delete Khatma' },
    editReminder: { ar: 'تعديل التذكير', en: 'Edit Reminder' },
    enableReminder: { ar: 'تفعيل التذكير', en: 'Enable Reminder' },
    fromLabel: { ar: 'من', en: 'From' },
    khatmaCompletedMsg: { ar: 'أكملت الختمة بنجاح!', en: 'Khatma completed!' },
    khatmaCreatedMsg: { ar: 'تم إنشاء الختمة بنجاح', en: 'Khatma created' },
    khatmaDuration: { ar: 'مدة الختمة', en: 'Khatma Duration' },
    khatmaName: { ar: 'اسم الختمة', en: 'Khatma Name' },
    khatmaNamePlaceholder: { ar: 'أدخل اسم الختمة', en: 'Enter khatma name' },
    loading: { ar: 'جاري التحميل...', en: 'Loading...' },
    noActiveKhatma: { ar: 'لا توجد ختمة نشطة', en: 'No Active Khatma' },
    noActiveKhatmaDesc: { ar: 'ابدأ ختمة جديدة الآن', en: 'Start a new khatma now' },
    noKhatmas: { ar: 'لا توجد ختمات', en: 'No Khatmas' },
    noKhatmasDesc: { ar: 'ابدأ ختمتك الأولى', en: 'Start your first khatma' },
    pageUnit: { ar: 'صفحة', en: 'page' },
    pagesPerDayLabel: { ar: 'صفحات في اليوم', en: 'Pages per Day' },
    pagesPerDayUnit: { ar: 'صفحة/يوم', en: 'pages/day' },
    pagesTitle: { ar: 'الصفحات', en: 'Pages' },
    quranHadith: { ar: 'خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَه', en: 'The best of you are those who learn the Quran and teach it' },
    quranHadithSource: { ar: 'رواه البخاري', en: 'Narrated by Bukhari' },
    reminderDays: { ar: 'أيام التذكير', en: 'Reminder Days' },
    selectDurationAlert: { ar: 'اختر مدة الختمة', en: 'Select khatma duration' },
    setAsActive: { ar: 'تعيين كنشطة', en: 'Set as Active' },
    startKhatma: { ar: 'ابدأ الختمة', en: 'Start Khatma' },
    startNewKhatma: { ar: 'ابدأ ختمة جديدة', en: 'Start New Khatma' },
    startWird: { ar: 'ابدأ الورد', en: 'Start Wird' },
    tips: { ar: 'نصائح', en: 'Tips' },
    toLabel: { ar: 'إلى', en: 'To' },
    todayWird: { ar: 'ورد اليوم', en: "Today's Wird" },
    totalWird: { ar: 'إجمالي الورد', en: 'Total Wird' },
    wirdCompletedMsg: { ar: 'تم إكمال الورد', en: 'Wird completed' },
    yesCompleted: { ar: 'نعم، تم إكماله', en: 'Yes, completed' },
  },

  tasbih: {
    addCustomDhikr: { ar: 'إضافة ذكر مخصص', en: 'Add Custom Dhikr' },
    approvedDhikr: { ar: 'أذكار معتمدة', en: 'Approved Dhikr' },
    autoAdvance: { ar: 'الانتقال التلقائي', en: 'Auto Advance' },
    autoAdvanceDesc: { ar: 'الانتقال للذكر التالي تلقائياً', en: 'Auto advance to next dhikr' },
    completedRounds: { ar: 'الجولات المكتملة', en: 'Completed Rounds' },
    dailyAverage: { ar: 'المتوسط اليومي', en: 'Daily Average' },
    dailyResetToast: { ar: 'تم حفظ تسبيحات الأمس وإعادة التعيين', en: 'Yesterday counts saved and reset' },
    deleteConfirm: { ar: 'هل تريد حذف هذا الذكر؟', en: 'Delete this dhikr?' },
    dhikrText: { ar: 'نص الذكر', en: 'Dhikr Text' },
    dhikrUnit: { ar: 'ذكر', en: 'dhikr' },
    enterDhikrText: { ar: 'أدخل نص الذكر', en: 'Enter dhikr text' },
    enterTextError: { ar: 'أدخل نص الذكر أولاً', en: 'Enter dhikr text first' },
    myCustomDhikr: { ar: 'أذكاري المخصصة', en: 'My Custom Dhikr' },
    myStats: { ar: 'إحصائياتي', en: 'My Statistics' },
    noDataYet: { ar: 'لا توجد بيانات بعد', en: 'No data yet' },
    of: { ar: 'من', en: 'of' },
    openTasbih: { ar: 'فتح المسبحة', en: 'Open Tasbih' },
    resetAll: { ar: 'إعادة تعيين الكل', en: 'Reset All' },
    resetAllConfirm: { ar: 'هل تريد إعادة تعيين الكل؟', en: 'Reset all?' },
    resetConfirm: { ar: 'هل تريد إعادة تعيين العداد؟', en: 'Reset counter?' },
    resetCounter: { ar: 'إعادة تعيين العداد', en: 'Reset Counter' },
    showTranslation: { ar: 'عرض الترجمة', en: 'Show Translation' },
    showVirtue: { ar: 'عرض الفضل', en: 'Show Virtue' },
    startTasbihHint: { ar: 'اضغط على الزر لبدء التسبيح', en: 'Tap the button to start tasbih' },
    statsList: { ar: 'قائمة الإحصائيات', en: 'Statistics List' },
    tapToCount: { ar: 'اضغط للعد', en: 'Tap to count' },
    todayBreakdown: { ar: 'تفصيل اليوم', en: "Today's Breakdown" },
    todaysCount: { ar: 'عدد اليوم', en: "Today's Count" },
  },
};


// ════════════ MAIN LOGIC ════════════

let ok = 0, fail = 0;

// ──── STEP 1: Add missing keys to EXISTING namespaces in the interface ────
console.log('\n📝 Step 1: Adding keys to interface for existing namespaces...');

for (const [nsName, keys] of Object.entries(EXISTING_NS_MISSING)) {
  const keyLines = Object.keys(keys).map(k => `    ${k}: string;`).join('\n');
  // Interface has these namespaces at occurrence 1
  if (addKeysToNamespace(nsName, 1, keyLines, `interface.${nsName}`)) ok++; else fail++;
}

// ──── STEP 2: Add NEW namespace interfaces before the closing `}` of TranslationKeys ────
console.log('\n📝 Step 2: Adding new namespace interfaces...');

// Find the closing `}` of TranslationKeys interface - it's after sectionInfo
const interfaceClose = '}\n// ==================== العربية ====================';
for (const [nsName, nsData] of Object.entries(NEW_NAMESPACES)) {
  // Check if namespace already exists in interface
  if (content.includes(`  ${nsName}: {`)) {
    console.log(`  ⏭️  interface.${nsName} already exists, skipping interface addition`);
    // But still need to check if keys are there - add as existing ns missing
    // For now, skip - we'll handle in the existing namespace logic above
    continue;
  }
  if (insertBefore(interfaceClose, 1, nsData.interfaceType, `interface.${nsName}`)) ok++; else fail++;
}

// ──── STEP 3: Add values to all 12 language blocks ────
console.log('\n📝 Step 3: Adding values to language blocks...');

const LANG_KEYS: Array<{ code: string; constName: string }> = [
  { code: 'ar', constName: 'const ar: TranslationKeys' },
  { code: 'en', constName: 'const en: TranslationKeys' },
  { code: 'fr', constName: 'const fr: TranslationKeys' },
  { code: 'de', constName: 'const de: TranslationKeys' },
  { code: 'tr', constName: 'const tr: TranslationKeys' },
  { code: 'es', constName: 'const es: TranslationKeys' },
  { code: 'ur', constName: 'const ur: TranslationKeys' },
  { code: 'id', constName: 'const id: TranslationKeys' },
  { code: 'ms', constName: 'const ms: TranslationKeys' },
  { code: 'hi', constName: 'const hi: TranslationKeys' },
  { code: 'bn', constName: 'const bn: TranslationKeys' },
  { code: 'ru', constName: 'const ru: TranslationKeys' },
];

// For each language block, add missing keys to existing namespaces
for (const lang of LANG_KEYS) {
  console.log(`\n  🌍 Language: ${lang.code}`);

  // Count which occurrence of each namespace this is
  // Each namespace appears once per language block — find the right one
  // Strategy: Find the language block start, then find the namespace within it
  const langStart = content.indexOf(lang.constName);
  if (langStart === -1) {
    console.error(`  ❌ Language block "${lang.constName}" not found!`);
    fail++;
    continue;
  }

  // For existing namespaces - add keys
  for (const [nsName, keys] of Object.entries(EXISTING_NS_MISSING)) {
    // Find the namespace opening AFTER the language block start
    const nsSearch = `  ${nsName}: {`;
    let nsIdx = content.indexOf(nsSearch, langStart);
    if (nsIdx === -1) {
      // Try the combined pattern like `},  common: {`
      const altSearch = `},  ${nsName}: {`;
      nsIdx = content.indexOf(altSearch, langStart);
      if (nsIdx !== -1) {
        nsIdx = nsIdx + 4; // Skip past `},  ` to get to the namespace name
      }
    }

    if (nsIdx === -1 || nsIdx > langStart + 80000) {
      // Probably in the wrong language block, skip
      console.error(`    ❌ ${lang.code}.${nsName}: not found`);
      fail++;
      continue;
    }

    // Find the closing brace of this namespace
    let depth = 0, inBlock = false, closeIdx = -1;
    for (let i = nsIdx; i < content.length; i++) {
      if (content[i] === '{') { depth++; inBlock = true; }
      else if (content[i] === '}') {
        depth--;
        if (inBlock && depth === 0) { closeIdx = i; break; }
      }
    }

    if (closeIdx === -1) {
      console.error(`    ❌ ${lang.code}.${nsName}: closing brace not found`);
      fail++;
      continue;
    }

    // Build key-value lines
    const val = (k: string) => {
      const v = lang.code === 'ar' ? keys[k].ar : keys[k].en;
      return v.replace(/'/g, "\\'");
    };
    const lines = Object.keys(keys).map(k => `    ${k}: '${val(k)}',`).join('\n');

    // Insert before closing brace line
    let lineStart = closeIdx;
    while (lineStart > 0 && content[lineStart - 1] !== '\n') lineStart--;

    content = content.slice(0, lineStart) + lines + '\n' + content.slice(lineStart);
    console.log(`    ✅ ${lang.code}.${nsName} (${Object.keys(keys).length} keys)`);
    ok++;
  }

  // For NEW namespaces - add whole block
  for (const [nsName, nsData] of Object.entries(NEW_NAMESPACES)) {
    // Check if this namespace already exists in this language block
    const nsSearch = `  ${nsName}: {`;
    const nextLangIdx = lang.code === 'ru'
      ? content.indexOf('// ==================== التصدير النهائي ====================', langStart + 10)
      : content.indexOf('const ', langStart + 10);

    const existingNsIdx = content.indexOf(nsSearch, langStart);
    if (existingNsIdx !== -1 && (nextLangIdx === -1 || existingNsIdx < nextLangIdx)) {
      console.log(`    ⏭️  ${lang.code}.${nsName} already exists`);
      continue;
    }

    // Build the namespace block
    const val = (k: string) => {
      const v = lang.code === 'ar' ? nsData.values[k].ar : nsData.values[k].en;
      return v.replace(/'/g, "\\'");
    };
    const keyLines = Object.keys(nsData.values).map(k => `    ${k}: '${val(k)}',`).join('\n');
    const block = `  ${nsName}: {\n${keyLines}\n  },`;

    // Find the last `},` before the language block ends (which is `};`)
    // We need to find the closing `};` of this language block
    let blockEnd: number;
    if (nextLangIdx !== -1) {
      // Search backwards from next lang block for `};`
      blockEnd = content.lastIndexOf('};', nextLangIdx);
    } else {
      // Shouldn't happen now, but fallback
      const exportIdx = content.indexOf('export const translations', langStart);
      blockEnd = exportIdx !== -1 ? content.lastIndexOf('};', exportIdx) : -1;
    }

    if (blockEnd === -1 || blockEnd <= langStart) {
      console.error(`    ❌ ${lang.code}.${nsName}: block end not found`);
      fail++;
      continue;
    }

    // Insert before `};`
    content = content.slice(0, blockEnd) + block + '\n' + content.slice(blockEnd);
    console.log(`    ✅ ${lang.code}.${nsName} (${Object.keys(nsData.values).length} keys)`);
    ok++;
  }
}

// ──── WRITE OUTPUT ────
const newLen = content.split('\n').length;
console.log(`\n════════════════════════════════════`);
console.log(`📊 Results: ${ok} succeeded, ${fail} failed`);
console.log(`📏 Lines: ${origLen} → ${newLen} (+${newLen - origLen})`);

fs.writeFileSync(FILE, content, 'utf-8');
console.log('💾 File written successfully!');
