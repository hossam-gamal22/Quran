/**
 * FINAL script v3: Uses anchor-line approach instead of brace counting.
 * Finds specific known last keys in each section and inserts after them.
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'constants', 'translations.ts');
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

// ============================================================
// STEP 1: Remove duplicate appName/none pairs
// ============================================================
console.log('Step 1: Removing duplicate appName/none pairs...');
let removed = 0;
for (let i = lines.length - 4; i >= 0; i--) {
  const t0 = lines[i].trim(), t1 = lines[i+1].trim(), t2 = lines[i+2].trim(), t3 = lines[i+3].trim();
  if (t0.startsWith("appName:") && t1.startsWith("none:") && t2.startsWith("appName:") && t3.startsWith("none:")) {
    lines.splice(i+2, 2);
    removed++;
  }
}
console.log(`  Removed ${removed} duplicate pairs`);

// ============================================================
// STEP 2: Add missing prayer keys (find witr: and insert after)
// ============================================================
console.log('Step 2: Adding prayer keys...');
let prayerCount = 0;
for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].includes("witr:") && lines[i].includes("'")) {
    // Check if next line already has extraTimes
    if (i + 1 < lines.length && lines[i + 1].includes('extraTimes:')) continue;
    // Determine if this is the ar block (check for Arabic chars in value)
    const isArabic = /[\u0600-\u06FF]/.test(lines[i]);
    const keys = isArabic ? [
      "    extraTimes: 'أوقات إضافية',",
      "    midnight: 'منتصف الليل',",
      "    lastThird: 'الثلث الأخير',",
      "    lastThirdMessage: 'وقت الاستجابة والقيام',",
    ] : [
      "    extraTimes: 'Extra Times',",
      "    midnight: 'Midnight',",
      "    lastThird: 'Last Third',",
      "    lastThirdMessage: 'Time for prayer and supplication',",
    ];
    lines.splice(i + 1, 0, ...keys);
    prayerCount++;
  }
}
console.log(`  Added to ${prayerCount} blocks`);

// ============================================================
// STEP 3: Interface additions
// ============================================================
console.log('Step 3: Interface additions...');

// a) home: insert after `favorites: string;` in interface (must be the one INSIDE home:, not common:)
const homeInterfaceStart = lines.findIndex(l => l.includes('home: {') && l.includes('//') === false && !l.includes("'"));
let favInterfaceLine = -1;
if (homeInterfaceStart !== -1) {
  for (let i = homeInterfaceStart + 1; i < homeInterfaceStart + 40; i++) {
    if (lines[i].includes('favorites: string;')) { favInterfaceLine = i; break; }
  }
}
if (favInterfaceLine !== -1) {
  lines.splice(favInterfaceLine + 1, 0, ...[
    '    highlights: string;',
    '    dailyContent: string;',
    '    customize: string;',
    '    customizeQuickAccess: string;',
    '    appPage: string;',
    '    quranSurahLabel: string;',
    '    selectMode: string;',
    '    reorderMode: string;',
    '    searchSection: string;',
    '    searchSurah: string;',
    '    addOther: string;',
    '    storyOfDay: string;',
    '    verseOfDay: string;',
    '    hadithOfDay: string;',
    '    duaOfDay: string;',
    '    dailyAzkar: string;',
    '    dailyDua: string;',
    '    dailyStory: string;',
    '    reorderSections: string;',
    '    reorderHighlights: string;',
    '    prayerTimesLabel: string;',
  ]);
}

// b) common: insert after `none: string;` in interface
const noneInterfaceLine = lines.findIndex(l => l.includes('none: string;'));
if (noneInterfaceLine !== -1) {
  lines.splice(noneInterfaceLine + 1, 0, '    reset: string;');
}

// c) settings: insert after `aboutApp: string;` in interface  
const aboutInterfaceLine = lines.findIndex(l => l.includes('aboutApp: string;'));
if (aboutInterfaceLine !== -1) {
  lines.splice(aboutInterfaceLine + 1, 0, ...[
    '    preview: string;',
    '    homeLayout: string;',
    '    grid: string;',
    '    list: string;',
    '    colorBackgrounds: string;',
    '    photoBackgrounds: string;',
  ]);
}

// d) calendar: insert after `daysUntil: string;`
const daysUntilInterfaceLine = lines.findIndex(l => l.includes('daysUntil: string;'));
if (daysUntilInterfaceLine !== -1) {
  lines.splice(daysUntilInterfaceLine + 1, 0, '    ahSuffix: string;');
}

// e) New top-level sections: insert after `minutes: string;` in notificationSounds interface
//    Need to find the SECOND `minutes: string;` (first is in prayer)
const firstMinString = lines.findIndex(l => l.includes('minutes: string;'));
const secondMinString = lines.findIndex((l, i) => i > firstMinString && l.includes('minutes: string;'));
if (secondMinString !== -1) {
  // Find the `};` that closes notificationSounds (should be 1-2 lines after minutes)
  let notifClose = secondMinString + 1;
  while (notifClose < lines.length && !lines[notifClose].trim().startsWith('};')) notifClose++;
  // Find the `}` that closes the entire interface (should be right after)
  let interfaceClose = notifClose + 1;
  while (interfaceClose < lines.length && lines[interfaceClose].trim() !== '}') interfaceClose++;
  
  const newSections = `
  // رمضان
  ramadan: {
    blessedRamadan: string;
    dailyTasks: string;
  };

  // أسماء الله
  names: {
    title: string;
    nameCopied: string;
    gridView: string;
    listView: string;
    meaning: string;
    explanation: string;
    evidence: string;
    hadith: string;
    whatsapp: string;
    shareHeader: string;
    count99: string;
    shareAsImage: string;
    shareAsText: string;
  };

  // الاشتراك
  subscription: {
    subscribeToAccess: string;
    upgrade: string;
    premiumTitle: string;
    premiumSubtitle: string;
    alreadySubscribed: string;
    perMonth: string;
    perYear: string;
    subscribeNow: string;
    oneTimePurchase: string;
    bestValue: string;
    legalText: string;
    restorePurchase: string;
    currentPlan: string;
    thankYou: string;
  };

  // آيات عظمة الله
  ayatUniverse: {
    title: string;
    introTitle: string;
    introSubtitle: string;
    readInMushaf: string;
    themeCreation: string;
    themeHeavensEarth: string;
    themeNatureWater: string;
    themeHumanCreation: string;
    themePowerDominion: string;
    allThemes: string;
  };

  // أحاديث صفات الله
  hadithSifat: {
    title: string;
    introTitle: string;
    introSubtitle: string;
    narrator: string;
    source: string;
    hadithNumber: string;
    shareText: string;
    savedToFavorites: string;
    removedFromFavorites: string;
  };

  // قصص الصحابة
  companions: {
    title: string;
    heroTitle: string;
    heroSubtitle: string;
    story: string;
    virtues: string;
    categoryTenPromised: string;
    categoryMuhajirun: string;
    categoryAnsar: string;
    categoryMothers: string;
    readMore: string;
    expandBio: string;
    collapseBio: string;
    footerDua: string;
    footerText: string;
    searchPlaceholder: string;
    shareCompanion: string;
  };

  // السيرة النبوية
  seerah: {
    title: string;
    heroTitle: string;
    heroSubtitle: string;
    chapters: string;
    sectionBirth: string;
    sectionProphethood: string;
    sectionDawah: string;
    sectionMigration: string;
    sectionMadinah: string;
    sectionConquest: string;
    sectionFarewell: string;
  };

  // تعديل المواقيت
  prayerAdjustments: {
    title: string;
    reset: string;
    hint: string;
    minutesSuffix: string;
  };

  // الأنشطة الحية
  liveActivities: {
    title: string;
    enable: string;
    description: string;
    notSupported: string;
    styleTitle: string;
    preview: string;
    previewNextPrayer: string;
    previewSunrise: string;
  };

  // المناسبات الموسمية
  seasonal: {
    ashura: {
      title: string;
      subtitle: string;
      description: string;
      hadithSource: string;
      tasua: string;
      tasuaDesc: string;
      tasuaVirtue: string;
      ashuraDay: string;
      ashuraDayDesc: string;
      ashuraVirtue: string;
      eleventh: string;
      eleventhDesc: string;
      eleventhVirtue: string;
      virtueExpiation: string;
      virtueExpiationDesc: string;
      virtueHistoric: string;
      virtueHistoricDesc: string;
      virtueSunnah: string;
      virtueSunnahDesc: string;
      virtueGratitude: string;
      virtueGratitudeDesc: string;
      actionFast9: string;
      actionFast9Sub: string;
      actionFast10: string;
      actionFast10Sub: string;
      actionDua: string;
      actionDuaSub: string;
      actionSadaqa: string;
      actionSadaqaSub: string;
      muharram: string;
      recommended: string;
      fastingDays: string;
      virtues: string;
      recommendedActions: string;
      tip: string;
      tipText: string;
    };
    mawlid: {
      title: string;
      prophetName: string;
      prophetFullName: string;
      birthDate: string;
      birthPlace: string;
      birthYear: string;
      nameMuhammad: string;
      nameMuhammadMeaning: string;
      nameAhmad: string;
      nameAhmadMeaning: string;
      nameAlMahi: string;
      nameAlMahiMeaning: string;
      nameAlHashir: string;
      nameAlHashirMeaning: string;
      nameAlAqib: string;
      nameAlAqibMeaning: string;
      nameAlMuqaffi: string;
      nameAlMuqaffiMeaning: string;
      qualityMercy: string;
      qualityMercyDesc: string;
      qualityHonesty: string;
      qualityHonestyDesc: string;
      qualityBravery: string;
      qualityBraveryDesc: string;
      qualityHumility: string;
      qualityHumilityDesc: string;
      qualityPatience: string;
      qualityPatienceDesc: string;
      salawatCounter: string;
      sendSalawat: string;
      salawatIbrahimiyyah: string;
      salawatNariyyah: string;
      salawatTibbiyyah: string;
      sectionNames: string;
      sectionQualities: string;
      sectionSalawat: string;
      sectionActions: string;
      actionReadSeerah: string;
      actionFollowSunnah: string;
      actionSendSalawat: string;
      actionShareKnowledge: string;
      reminder: string;
    };
    hajj: {
      title: string;
      subtitle: string;
      subtitleWithDay: string;
      dhulHijjah: string;
      tenDaysTitle: string;
      tenDaysSubtitle: string;
      ritualsTitle: string;
      ritualsSubtitle: string;
      duasTitle: string;
      duasSubtitle: string;
      virtuesTitle: string;
      tipTitle: string;
      tipText: string;
    };
  };`.split('\n');
  
  lines.splice(interfaceClose, 0, ...newSections);
}

// ============================================================
// STEP 4: Add values to all language blocks
// ============================================================
console.log('Step 4: Adding values to language blocks...');

// Strategy: for each lang block, find anchors and insert after them.
// Process bottom-up to keep indexes stable for earlier blocks.

const langNames = ['ar', 'en', 'fr', 'de', 'tr', 'es', 'ur', 'id', 'ms', 'hi', 'bn', 'ru'];

function escQ(s) { return s.replace(/'/g, "\\'"); }

function objToLines(obj, indent = '    ') {
  const result = [];
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'object' && v !== null) {
      result.push(`${indent}${k}: {`);
      result.push(...objToLines(v, indent + '  '));
      result.push(`${indent}},`);
    } else {
      result.push(`${indent}${k}: '${escQ(String(v))}',`);
    }
  }
  return result;
}

// Values for ar
const AR = {
  home: { highlights: 'أبرز المحتوى', dailyContent: 'المحتوى اليومي', customize: 'تخصيص', customizeQuickAccess: 'تخصيص الوصول السريع', appPage: 'صفحة التطبيق', quranSurahLabel: 'سور القرآن', selectMode: 'اختيار', reorderMode: 'إعادة ترتيب', searchSection: 'بحث عن قسم...', searchSurah: 'بحث عن سورة...', addOther: 'إضافة أخرى', storyOfDay: 'قصة اليوم', verseOfDay: 'آية اليوم', hadithOfDay: 'حديث اليوم', duaOfDay: 'دعاء اليوم', dailyAzkar: 'أذكار اليوم', dailyDua: 'دعاء اليوم', dailyStory: 'قصة اليوم', reorderSections: 'إعادة ترتيب الأقسام', reorderHighlights: 'إعادة ترتيب أبرز المحتوى', prayerTimesLabel: 'مواقيت الصلاة' },
  commonReset: 'إعادة تعيين',
  settingsExtra: { preview: 'معاينة', homeLayout: 'شكل الصفحة الرئيسية', grid: 'شبكة', list: 'قائمة', colorBackgrounds: 'خلفيات الألوان', photoBackgrounds: 'خلفيات الصور' },
  calAhSuffix: ' هـ',
  sections: {
    ramadan: { blessedRamadan: 'رمضان مبارك', dailyTasks: 'المهام اليومية' },
    names: { title: 'أسماء الله الحسنى', nameCopied: 'تم نسخ الاسم', gridView: 'عرض شبكي', listView: 'عرض قائمة', meaning: 'المعنى', explanation: 'الشرح', evidence: 'الدليل', hadith: 'الحديث', whatsapp: 'واتساب', shareHeader: 'مشاركة الاسم', count99: '99 اسماً', shareAsImage: 'مشاركة كصورة', shareAsText: 'مشاركة كنص' },
    subscription: { subscribeToAccess: 'اشترك للوصول', upgrade: 'ترقية', premiumTitle: 'روح المسلم بريميوم', premiumSubtitle: 'تجربة بدون إعلانات مع مميزات حصرية', alreadySubscribed: 'أنت مشترك بالفعل', perMonth: '/شهر', perYear: '/سنة', subscribeNow: 'اشترك الآن', oneTimePurchase: 'شراء لمرة واحدة', bestValue: 'أفضل قيمة', legalText: 'بالاشتراك، أنت توافق على الشروط والأحكام', restorePurchase: 'استعادة المشتريات', currentPlan: 'خطتك الحالية', thankYou: 'شكراً لدعمك!' },
    ayatUniverse: { title: 'آيات عظمة الله', introTitle: 'تأمل في آيات الله', introSubtitle: 'آيات تدل على عظمة الخالق في الكون', readInMushaf: 'اقرأ في المصحف', themeCreation: 'الخلق والإبداع', themeHeavensEarth: 'السماوات والأرض', themeNatureWater: 'الطبيعة والماء', themeHumanCreation: 'خلق الإنسان', themePowerDominion: 'القدرة والملك', allThemes: 'جميع المواضيع' },
    hadithSifat: { title: 'أحاديث صفات الله', introTitle: 'صفات الله تعالى', introSubtitle: 'أحاديث نبوية في صفات الله عز وجل', narrator: 'الراوي', source: 'المصدر', hadithNumber: 'رقم الحديث', shareText: 'مشاركة الحديث', savedToFavorites: 'تم الحفظ في المحفوظات', removedFromFavorites: 'تم الإزالة من المحفوظات' },
    companions: { title: 'قصص الصحابة', heroTitle: 'صحابة رسول الله', heroSubtitle: 'قصص وعبر من حياة الصحابة رضي الله عنهم', story: 'القصة', virtues: 'الفضائل', categoryTenPromised: 'العشرة المبشرون بالجنة', categoryMuhajirun: 'المهاجرون', categoryAnsar: 'الأنصار', categoryMothers: 'أمهات المؤمنين', readMore: 'اقرأ المزيد', expandBio: 'عرض السيرة', collapseBio: 'إخفاء السيرة', footerDua: 'رضي الله عنهم أجمعين', footerText: 'اللهم احشرنا معهم', searchPlaceholder: 'بحث عن صحابي...', shareCompanion: 'مشاركة' },
    seerah: { title: 'السيرة النبوية', heroTitle: 'سيرة النبي محمد ﷺ', heroSubtitle: 'رحلة عطرة في حياة خير البشر', chapters: 'أبواب', sectionBirth: 'المولد والنشأة', sectionProphethood: 'البعثة والوحي', sectionDawah: 'الدعوة في مكة', sectionMigration: 'الهجرة إلى المدينة', sectionMadinah: 'العهد المدني', sectionConquest: 'فتح مكة', sectionFarewell: 'حجة الوداع والوفاة' },
    prayerAdjustments: { title: 'تعديل المواقيت', reset: 'إعادة تعيين', hint: 'يمكنك تعديل وقت كل صلاة بالدقائق', minutesSuffix: 'دقائق' },
    liveActivities: { title: 'الأنشطة الحالية', enable: 'تفعيل', description: 'عرض مواقيت الصلاة على شاشة القفل', notSupported: 'غير مدعوم على هذا الجهاز', styleTitle: 'نمط العرض', preview: 'معاينة', previewNextPrayer: 'الصلاة القادمة', previewSunrise: 'الشروق' },
    seasonal: {
      ashura: { title: 'يوم عاشوراء', subtitle: 'صيام وعبادة', description: 'يوم عاشوراء هو اليوم العاشر من شهر محرم', hadithSource: 'صحيح مسلم', tasua: 'تاسوعاء', tasuaDesc: 'اليوم التاسع من محرم', tasuaVirtue: 'يستحب صيامه مع عاشوراء', ashuraDay: 'عاشوراء', ashuraDayDesc: 'اليوم العاشر من محرم', ashuraVirtue: 'يكفر السنة الماضية', eleventh: 'الحادي عشر', eleventhDesc: 'اليوم الحادي عشر من محرم', eleventhVirtue: 'مستحب صيامه للمخالفة', virtueExpiation: 'تكفير الذنوب', virtueExpiationDesc: 'يكفر ذنوب السنة الماضية', virtueHistoric: 'يوم تاريخي', virtueHistoricDesc: 'نجّى الله فيه موسى وقومه', virtueSunnah: 'سنة نبوية', virtueSunnahDesc: 'صامه النبي ﷺ وأمر بصيامه', virtueGratitude: 'شكر لله', virtueGratitudeDesc: 'شكراً لله على نصرة الحق', actionFast9: 'صيام التاسع', actionFast9Sub: 'صيام يوم تاسوعاء', actionFast10: 'صيام العاشر', actionFast10Sub: 'صيام يوم عاشوراء', actionDua: 'الدعاء', actionDuaSub: 'الإكثار من الدعاء', actionSadaqa: 'الصدقة', actionSadaqaSub: 'التصدق على المحتاجين', muharram: 'محرم', recommended: 'مستحب', fastingDays: 'أيام الصيام', virtues: 'الفضائل', recommendedActions: 'الأعمال المستحبة', tip: 'نصيحة', tipText: 'يستحب صيام التاسع والعاشر معاً' },
      mawlid: { title: 'ذكرى المولد النبوي', prophetName: 'محمد ﷺ', prophetFullName: 'محمد بن عبد الله بن عبد المطلب', birthDate: '12 ربيع الأول', birthPlace: 'مكة المكرمة', birthYear: 'عام الفيل', nameMuhammad: 'محمد', nameMuhammadMeaning: 'المحمود الخصال', nameAhmad: 'أحمد', nameAhmadMeaning: 'أحمد الناس خصالاً', nameAlMahi: 'الماحي', nameAlMahiMeaning: 'يمحو الله به الكفر', nameAlHashir: 'الحاشر', nameAlHashirMeaning: 'يُحشر الناس على قدمه', nameAlAqib: 'العاقب', nameAlAqibMeaning: 'آخر الأنبياء', nameAlMuqaffi: 'المقفّي', nameAlMuqaffiMeaning: 'جاء عقب الأنبياء', qualityMercy: 'الرحمة', qualityMercyDesc: 'وما أرسلناك إلا رحمة للعالمين', qualityHonesty: 'الصدق والأمانة', qualityHonestyDesc: 'الصادق الأمين', qualityBravery: 'الشجاعة', qualityBraveryDesc: 'أشجع الناس', qualityHumility: 'التواضع', qualityHumilityDesc: 'كان يخصف نعله ويرقع ثوبه', qualityPatience: 'الصبر', qualityPatienceDesc: 'صبر على أذى قومه', salawatCounter: 'عداد الصلاة على النبي', sendSalawat: 'صلّ على النبي ﷺ', salawatIbrahimiyyah: 'الصلاة الإبراهيمية', salawatNariyyah: 'الصلاة النارية', salawatTibbiyyah: 'الصلاة الطبية', sectionNames: 'أسماء النبي ﷺ', sectionQualities: 'صفات النبي ﷺ', sectionSalawat: 'الصلاة على النبي', sectionActions: 'أعمال مستحبة', actionReadSeerah: 'قراءة السيرة النبوية', actionFollowSunnah: 'اتباع السنة النبوية', actionSendSalawat: 'الإكثار من الصلاة على النبي', actionShareKnowledge: 'نشر العلم النبوي', reminder: 'تذكير: أكثر من الصلاة على النبي ﷺ' },
      hajj: { title: 'موسم الحج', subtitle: 'موسم الحج المبارك', subtitleWithDay: 'اليوم {day} من ذي الحجة', dhulHijjah: 'ذو الحجة', tenDaysTitle: 'العشر الأوائل', tenDaysSubtitle: 'أفضل أيام الدنيا', ritualsTitle: 'مناسك الحج', ritualsSubtitle: 'خطوات أداء الحج', duasTitle: 'أدعية الحج', duasSubtitle: 'أدعية مأثورة', virtuesTitle: 'فضائل الحج', tipTitle: 'نصيحة', tipText: 'احرص على الإكثار من الذكر والدعاء' },
    },
  },
};

// EN values
const EN = {
  home: { highlights: 'Highlights', dailyContent: 'Daily Content', customize: 'Customize', customizeQuickAccess: 'Customize Quick Access', appPage: 'App Page', quranSurahLabel: 'Quran Surahs', selectMode: 'Select', reorderMode: 'Reorder', searchSection: 'Search section...', searchSurah: 'Search surah...', addOther: 'Add Other', storyOfDay: 'Story of the Day', verseOfDay: 'Verse of the Day', hadithOfDay: 'Hadith of the Day', duaOfDay: 'Dua of the Day', dailyAzkar: 'Daily Azkar', dailyDua: 'Daily Dua', dailyStory: 'Daily Story', reorderSections: 'Reorder Sections', reorderHighlights: 'Reorder Highlights', prayerTimesLabel: 'Prayer Times' },
  commonReset: 'Reset',
  settingsExtra: { preview: 'Preview', homeLayout: 'Home Layout', grid: 'Grid', list: 'List', colorBackgrounds: 'Color Backgrounds', photoBackgrounds: 'Photo Backgrounds' },
  calAhSuffix: ' AH',
  sections: {
    ramadan: { blessedRamadan: 'Blessed Ramadan', dailyTasks: 'Daily Tasks' },
    names: { title: 'Names of Allah', nameCopied: 'Name copied', gridView: 'Grid View', listView: 'List View', meaning: 'Meaning', explanation: 'Explanation', evidence: 'Evidence', hadith: 'Hadith', whatsapp: 'WhatsApp', shareHeader: 'Share Name', count99: '99 Names', shareAsImage: 'Share as Image', shareAsText: 'Share as Text' },
    subscription: { subscribeToAccess: 'Subscribe to Access', upgrade: 'Upgrade', premiumTitle: 'Ruh Al-Muslim Premium', premiumSubtitle: 'Ad-free experience with exclusive features', alreadySubscribed: 'Already subscribed', perMonth: '/month', perYear: '/year', subscribeNow: 'Subscribe Now', oneTimePurchase: 'One-time Purchase', bestValue: 'Best Value', legalText: 'By subscribing, you agree to the Terms and Conditions', restorePurchase: 'Restore Purchase', currentPlan: 'Your Current Plan', thankYou: 'Thank you for your support!' },
    ayatUniverse: { title: "Verses of Allah's Greatness", introTitle: "Reflect on Allah's Signs", introSubtitle: 'Verses showing the greatness of the Creator', readInMushaf: 'Read in Mushaf', themeCreation: 'Creation & Design', themeHeavensEarth: 'Heavens & Earth', themeNatureWater: 'Nature & Water', themeHumanCreation: 'Human Creation', themePowerDominion: 'Power & Dominion', allThemes: 'All Themes' },
    hadithSifat: { title: "Hadiths on Allah's Attributes", introTitle: 'Attributes of Allah', introSubtitle: 'Prophetic hadiths on the attributes of Allah', narrator: 'Narrator', source: 'Source', hadithNumber: 'Hadith Number', shareText: 'Share Hadith', savedToFavorites: 'Saved to favorites', removedFromFavorites: 'Removed from favorites' },
    companions: { title: 'Stories of the Companions', heroTitle: 'Companions of the Prophet', heroSubtitle: 'Stories and lessons from the lives of the Companions', story: 'Story', virtues: 'Virtues', categoryTenPromised: 'Ten Promised Paradise', categoryMuhajirun: 'The Muhajirun', categoryAnsar: 'The Ansar', categoryMothers: 'Mothers of the Believers', readMore: 'Read More', expandBio: 'Show Biography', collapseBio: 'Hide Biography', footerDua: 'May Allah be pleased with them all', footerText: 'O Allah, gather us with them', searchPlaceholder: 'Search companion...', shareCompanion: 'Share' },
    seerah: { title: "Prophet's Biography", heroTitle: 'Life of Prophet Muhammad ﷺ', heroSubtitle: 'A blessed journey through the life of the best of mankind', chapters: 'Chapters', sectionBirth: 'Birth & Early Life', sectionProphethood: 'Prophethood & Revelation', sectionDawah: 'Dawah in Makkah', sectionMigration: 'Migration to Madinah', sectionMadinah: 'Madinah Period', sectionConquest: 'Conquest of Makkah', sectionFarewell: 'Farewell Pilgrimage & Passing' },
    prayerAdjustments: { title: 'Adjust Prayer Times', reset: 'Reset', hint: 'Adjust each prayer time by minutes', minutesSuffix: 'minutes' },
    liveActivities: { title: 'Live Activities', enable: 'Enable', description: 'Show prayer times on lock screen', notSupported: 'Not supported on this device', styleTitle: 'Display Style', preview: 'Preview', previewNextPrayer: 'Next Prayer', previewSunrise: 'Sunrise' },
    seasonal: {
      ashura: { title: 'Day of Ashura', subtitle: 'Fasting & Worship', description: 'Ashura is the tenth day of Muharram', hadithSource: 'Sahih Muslim', tasua: 'Tasua', tasuaDesc: 'The ninth of Muharram', tasuaVirtue: 'Recommended to fast with Ashura', ashuraDay: 'Ashura', ashuraDayDesc: 'The tenth of Muharram', ashuraVirtue: 'Expiates sins of the previous year', eleventh: 'The Eleventh', eleventhDesc: 'The eleventh of Muharram', eleventhVirtue: 'Recommended for distinction', virtueExpiation: 'Expiation of Sins', virtueExpiationDesc: 'Expiates sins of the previous year', virtueHistoric: 'Historic Day', virtueHistoricDesc: 'Allah saved Musa and his people', virtueSunnah: 'Prophetic Sunnah', virtueSunnahDesc: 'The Prophet ﷺ fasted it and commanded fasting', virtueGratitude: 'Gratitude to Allah', virtueGratitudeDesc: 'Gratitude for the victory of truth', actionFast9: 'Fast the Ninth', actionFast9Sub: 'Fast the day of Tasua', actionFast10: 'Fast the Tenth', actionFast10Sub: 'Fast the day of Ashura', actionDua: 'Supplication', actionDuaSub: 'Increase in supplication', actionSadaqa: 'Charity', actionSadaqaSub: 'Give charity to those in need', muharram: 'Muharram', recommended: 'Recommended', fastingDays: 'Fasting Days', virtues: 'Virtues', recommendedActions: 'Recommended Actions', tip: 'Tip', tipText: 'It is recommended to fast the 9th and 10th together' },
      mawlid: { title: "Prophet's Birthday", prophetName: 'Muhammad ﷺ', prophetFullName: 'Muhammad ibn Abdullah ibn Abdul-Muttalib', birthDate: '12 Rabi al-Awwal', birthPlace: 'Makkah', birthYear: 'Year of the Elephant', nameMuhammad: 'Muhammad', nameMuhammadMeaning: 'The Praised One', nameAhmad: 'Ahmad', nameAhmadMeaning: 'Most praiseworthy', nameAlMahi: 'Al-Mahi', nameAlMahiMeaning: 'The Eraser of disbelief', nameAlHashir: 'Al-Hashir', nameAlHashirMeaning: 'The Gatherer', nameAlAqib: 'Al-Aqib', nameAlAqibMeaning: 'The Last Prophet', nameAlMuqaffi: 'Al-Muqaffi', nameAlMuqaffiMeaning: 'The Successor of Prophets', qualityMercy: 'Mercy', qualityMercyDesc: 'Sent as a mercy to all worlds', qualityHonesty: 'Honesty & Trust', qualityHonestyDesc: 'The Truthful, the Trustworthy', qualityBravery: 'Bravery', qualityBraveryDesc: 'The bravest of people', qualityHumility: 'Humility', qualityHumilityDesc: 'He mended his own shoes and patched his clothes', qualityPatience: 'Patience', qualityPatienceDesc: "Patient with his people's harm", salawatCounter: 'Salawat Counter', sendSalawat: 'Send Salawat upon the Prophet ﷺ', salawatIbrahimiyyah: 'Ibrahimiyyah Salawat', salawatNariyyah: 'Nariyyah Salawat', salawatTibbiyyah: 'Tibbiyyah Salawat', sectionNames: 'Names of the Prophet ﷺ', sectionQualities: 'Qualities of the Prophet ﷺ', sectionSalawat: 'Salawat upon the Prophet', sectionActions: 'Recommended Actions', actionReadSeerah: "Read the Prophet's Biography", actionFollowSunnah: 'Follow the Prophetic Sunnah', actionSendSalawat: 'Increase Salawat upon the Prophet', actionShareKnowledge: 'Share Prophetic Knowledge', reminder: 'Reminder: Increase Salawat upon the Prophet ﷺ' },
      hajj: { title: 'Hajj Season', subtitle: 'Blessed Hajj Season', subtitleWithDay: 'Day {day} of Dhul Hijjah', dhulHijjah: 'Dhul Hijjah', tenDaysTitle: 'First Ten Days', tenDaysSubtitle: 'Best days of the world', ritualsTitle: 'Hajj Rituals', ritualsSubtitle: 'Steps of performing Hajj', duasTitle: 'Hajj Duas', duasSubtitle: 'Authentic supplications', virtuesTitle: 'Virtues of Hajj', tipTitle: 'Tip', tipText: 'Increase in dhikr and supplication' },
    },
  },
};

// Process in reverse order to avoid index shifts
for (let langIdx = langNames.length - 1; langIdx >= 0; langIdx--) {
  const lang = langNames[langIdx];
  const isAr = lang === 'ar';
  const vals = isAr ? AR : EN;
  
  const blockDecl = `const ${lang}: TranslationKeys = {`;
  const blockStart = lines.findIndex(l => l.includes(blockDecl));
  if (blockStart === -1) { console.log(`  WARN: ${lang} not found`); continue; }
  
  // Find block end: next `};` that's at start of line after blockStart
  let blockEnd = -1;
  for (let i = blockStart + 1; i < lines.length; i++) {
    if (lines[i].trim() === '};') { blockEnd = i; break; }
  }
  if (blockEnd === -1) { console.log(`  WARN: ${lang} block end not found`); continue; }
  
  // A. Insert new sections before `};` of block (reverse to maintain order)
  const sectionLines = [];
  for (const [name, val] of Object.entries(vals.sections)) {
    sectionLines.push(`  ${name}: {`);
    sectionLines.push(...objToLines(val));
    sectionLines.push('  },');
  }
  lines.splice(blockEnd, 0, ...sectionLines);
  
  // B. Insert calendar.ahSuffix: find `daysUntil:` within this block
  for (let i = blockStart; i < blockEnd + sectionLines.length; i++) {
    if (lines[i].includes('daysUntil:') && !lines[i].includes('string')) {
      lines.splice(i + 1, 0, `    ahSuffix: '${vals.calAhSuffix}',`);
      break;
    }
  }
  
  // C. Insert settings extras: find `aboutApp:` within this block
  for (let i = blockStart; i < blockEnd + sectionLines.length + 1; i++) {
    if (lines[i].includes('aboutApp:') && !lines[i].includes('string')) {
      lines.splice(i + 1, 0, ...objToLines(vals.settingsExtra));
      break;
    }
  }
  
  // D. Insert common.reset: find the LAST `none:` before `home: {` in this block
  //    The common section ends with `none: 'xxx',` then `},` then `home: {`
  //    After dedup, it should be just one `none:` line.
  //    Strategy: find `home: {` in this block, then search backwards for `none:`
  let homeLineInBlock = -1;
  for (let i = blockStart; i < lines.length; i++) {
    if (lines[i].match(/^\s+home:\s*\{/) || lines[i].includes('},  home: {')) {
      homeLineInBlock = i;
      break;
    }
  }
  if (homeLineInBlock !== -1) {
    // Search backwards from home line for the `none:` line
    for (let i = homeLineInBlock - 1; i > blockStart; i--) {
      if (lines[i].trim().startsWith('none:')) {
        lines.splice(i + 1, 0, `    reset: '${vals.commonReset}',`);
        break;
      }
    }
  }
  
  // E. Insert home extras: find `favorites:` within home section of this block
  //    The home section has `favorites: 'xxx',` as the last existing key
  for (let i = blockStart; i < lines.length; i++) {
    if (lines[i].includes('favorites:') && !lines[i].includes('string') && 
        !lines[i].includes('addToFavorites') && !lines[i].includes('removeFromFavorites') &&
        !lines[i].includes('savedToFavorites') && !lines[i].includes('removedFromFavorites')) {
      // Make sure this is in the home section (not in azkar.favorites)
      // Check: it should be after `home: {` and before `quran: {`
      let isInHome = false;
      for (let j = i - 1; j >= blockStart; j--) {
        if (lines[j].includes('home:') && lines[j].includes('{')) { isInHome = true; break; }
        if (lines[j].includes('quran:') || lines[j].includes('azkar:')) break;
      }
      if (isInHome) {
        lines.splice(i + 1, 0, ...objToLines(vals.home));
        break;
      }
    }
  }
  
  console.log(`  ${lang}: done`);
}

// Write
fs.writeFileSync(filePath, lines.join('\n'), 'utf8');

// Verify
const c = {
  highlights: lines.filter(l => l.trim().startsWith('highlights:')).length,
  ahSuffix: lines.filter(l => l.trim().startsWith('ahSuffix:')).length,
  blessedRamadan: lines.filter(l => l.trim().startsWith('blessedRamadan:')).length,
  commonReset: 0,
  dupeAppName: 0,
};

// Check common.reset specifically: count lines with `reset:` that appear between `none:` and `home:`
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim().startsWith("reset:") && lines[i].includes("'") && 
      i > 0 && lines[i-1].trim().startsWith("none:")) {
    c.commonReset++;
  }
}

for (let i = 0; i < lines.length - 3; i++) {
  if (lines[i].trim().startsWith("appName:") && lines[i+1].trim().startsWith("none:") &&
      lines[i+2].trim().startsWith("appName:") && lines[i+3].trim().startsWith("none:")) {
    c.dupeAppName++;
  }
}

console.log(`\nDone! File: ${lines.length} lines`);
console.log(`highlights: ${c.highlights} (exp 13)`);
console.log(`ahSuffix: ${c.ahSuffix} (exp 13)`);
console.log(`blessedRamadan: ${c.blessedRamadan} (exp 13)`);
console.log(`common.reset properly placed: ${c.commonReset} (exp 12)`);
console.log(`duplicate appName/none: ${c.dupeAppName} (exp 0)`);
