/**
 * Script to add all missing translation keys to translations.ts
 * Run with: node scripts/add-missing-keys.js
 */

const fs = require('fs');
const path = require('path');

const TRANSLATIONS_FILE = path.join(__dirname, '..', 'constants', 'translations.ts');

let content = fs.readFileSync(TRANSLATIONS_FILE, 'utf-8');

// ============================================================
// STEP 1: Add new keys to TranslationKeys interface
// ============================================================

// 1a. Extend settings interface (after backgroundLoadError: string;)
const settingsInterfaceAdd = `
    generalFontSize: string;
    preview: string;
    homeLayout: string;
    grid: string;
    list: string;
    colorBackgrounds: string;
    photoBackgrounds: string;`;

content = content.replace(
  /    backgroundLoadError: string;\n  };\n  \n  \/\/ العبادات/,
  `    backgroundLoadError: string;${settingsInterfaceAdd}\n  };\n  \n  // العبادات`
);

// 1b. Extend calendar interface (after daysShort: string;)
const calendarInterfaceAdd = `
    monthEvents: string;
    adjustTitle: string;
    adjustHint: string;`;

content = content.replace(
  /    daysShort: string;\n  };\n\n  \/\/ الرسائل/,
  `    daysShort: string;${calendarInterfaceAdd}\n  };\n\n  // الرسائل`
);

// 1c. Extend subscription interface (after upgrade: string;)
const subscriptionInterfaceAdd = `
    premiumTitle: string;
    premiumSubtitle: string;
    alreadySubscribed: string;
    perMonth: string;
    perYear: string;
    subscribeNow: string;
    oneTimePurchase: string;
    bestValue: string;
    legalText: string;
    restorePurchase: string;`;

content = content.replace(
  /  subscription: {\n    subscribeToAccess: string;\n    upgrade: string;\n  };/,
  `  subscription: {\n    subscribeToAccess: string;\n    upgrade: string;${subscriptionInterfaceAdd}\n  };`
);

// 1d. Extend names interface (replace entire block with expanded version)
content = content.replace(
  /  \/\/ أسماء الله\n  names\?: {\n    nameCopied: string;\n  };\n}/,
  `  // أسماء الله
  names?: {
    nameCopied: string;
    title: string;
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
    footerDua: string;
    footerText: string;
    searchPlaceholder: string;
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
      qualityGenerosity: string;
      qualityGenerosityDesc: string;
      qualityPatience: string;
      qualityPatienceDesc: string;
      salawatIbrahimiyah: string;
      salawatIbrahimiyahVirtue: string;
      salawatShort: string;
      salawatShortVirtue: string;
      salawatSalam: string;
      salawatSalamVirtue: string;
      actionSalawat: string;
      actionSeerah: string;
      actionSunnah: string;
      actionAkhlaq: string;
      counterLabel: string;
      counterButton: string;
      namesSection: string;
      qualitiesSection: string;
      salawatSection: string;
      todaySection: string;
      reminder: string;
      reminderText: string;
    };
    hajj: {
      title: string;
      headerSubtitle: string;
      headerSubtitleWithDay: string;
      day8Name: string;
      day8Desc: string;
      day9Name: string;
      day9Desc: string;
      day10Name: string;
      day10Desc: string;
      day11Name: string;
      day11Desc: string;
      day12Name: string;
      day12Desc: string;
      day13Name: string;
      day13Desc: string;
      ritualIhram: string;
      ritualIhramDesc: string;
      ritualMinaStay: string;
      ritualMinaStayDesc: string;
      ritualPrayers: string;
      ritualPrayersDesc: string;
      ritualArafah: string;
      ritualArafahDesc: string;
      ritualDua: string;
      ritualDuaDesc: string;
      ritualMuzdalifah: string;
      ritualMuzdalifahDesc: string;
      ritualRami: string;
      ritualRamiDesc: string;
      ritualHady: string;
      ritualHadyDesc: string;
      ritualHalq: string;
      ritualHalqDesc: string;
      ritualTawafIfadah: string;
      ritualTawafIfadahDesc: string;
      ritualSai: string;
      ritualSaiDesc: string;
      ritualRami3: string;
      ritualRami3Desc: string;
      ritualMinaStayTashreeq: string;
      ritualMinaStayTashreeqDesc: string;
      ritualTakbeer: string;
      ritualTakbeerDesc: string;
      ritualLeave: string;
      ritualLeaveDesc: string;
      ritualTawafWada: string;
      ritualTawafWadaDesc: string;
      arafahVirtue1: string;
      arafahVirtue2: string;
      arafahVirtue3: string;
      tenDaysTitle: string;
      tenDaysSubtitle: string;
      tenDaysVirtue1: string;
      tenDaysVirtue2: string;
      tenDaysVirtue3: string;
      tenDaysVirtue4: string;
      tenDaysVirtue5: string;
      tenDaysVirtue6: string;
      tenDaysVirtue7: string;
      tenDaysVirtue8: string;
      tenDaysVirtue9: string;
      tenDaysVirtue10: string;
      duaTalbiyah: string;
      duaTalbiyahOccasion: string;
      duaTawaf: string;
      duaTawafOccasion: string;
      duaSai: string;
      duaSaiOccasion: string;
      duaArafah: string;
      duaArafahOccasion: string;
      duaRami: string;
      duaRamiOccasion: string;
      duaTakbir: string;
      duaTakbirOccasion: string;
      dhulHijjah: string;
      ritualsAndDeeds: string;
      virtuesSection: string;
      duasSection: string;
      ritualsSection: string;
      hajjDuasSection: string;
      tipTitle: string;
      tipText: string;
    };
  };
}`
);

// ============================================================
// STEP 2: Add values to ar block
// ============================================================

// 2a. Add settings keys to ar (after backgroundLoadError line 2236)
const settingsArAdd = `
    generalFontSize: 'حجم الخط العام',
    preview: 'معاينة',
    homeLayout: 'تخطيط الصفحة الرئيسية',
    grid: 'شبكة',
    list: 'قائمة',
    colorBackgrounds: 'خلفيات ملونة',
    photoBackgrounds: 'خلفيات صور',`;

content = content.replace(
  /    backgroundLoadError: 'حدث خطأ أثناء تحميل الخلفية',\n  },\n  worship:/,
  `    backgroundLoadError: 'حدث خطأ أثناء تحميل الخلفية',${settingsArAdd}\n  },\n  worship:`
);

// 2b. Add calendar keys to ar (after daysShort line in ar)
const calendarArAdd = `
    monthEvents: 'مناسبات هذا الشهر',
    adjustTitle: 'تعديل التاريخ الهجري',
    adjustHint: 'يمكنك تعديل التاريخ الهجري بإضافة أو طرح أيام',`;

content = content.replace(
  /    daysShort: ' يوم',\n  },\n  messages:/,
  `    daysShort: ' يوم',${calendarArAdd}\n  },\n  messages:`
);

// 2c. Add subscription keys to ar
const subscriptionArAdd = `
    premiumTitle: 'روح المسلم بريميوم',
    premiumSubtitle: 'تجربة كاملة بدون إعلانات',
    alreadySubscribed: 'أنت مشترك بالفعل ✨',
    perMonth: '/شهر',
    perYear: '/سنة',
    subscribeNow: 'اشترك الآن',
    oneTimePurchase: 'دفعة واحدة',
    bestValue: 'الأكثر توفيراً',
    legalText: 'بالاشتراك، أنت توافق على شروط الاستخدام وسياسة الخصوصية',
    restorePurchase: 'استعادة المشتريات',`;

content = content.replace(
  /  subscription: {\n    subscribeToAccess: 'اشترك للوصول',\n    upgrade: 'ترقية',\n  },/,
  `  subscription: {\n    subscribeToAccess: 'اشترك للوصول',\n    upgrade: 'ترقية',${subscriptionArAdd}\n  },`
);

// 2d. Add names keys to ar
const namesArAdd = `
    title: 'أسماء الله الحسنى',
    gridView: 'شبكة',
    listView: 'قائمة',
    meaning: 'المعنى',
    explanation: 'الشرح',
    evidence: 'الدليل',
    hadith: 'الحديث',
    whatsapp: 'واتساب',
    shareHeader: 'مشاركة الاسم',
    count99: '٩٩ اسماً',
    shareAsImage: 'مشاركة كصورة',
    shareAsText: 'مشاركة كنص',`;

content = content.replace(
  /  names: {\n    nameCopied: 'تم نسخ الاسم إلى الحافظة ✓',\n  },\n};\n\/\/ ==================== English ====================/,
  `  names: {\n    nameCopied: 'تم نسخ الاسم إلى الحافظة ✓',${namesArAdd}\n  },

  ayatUniverse: {
    title: 'آيات عظمة الله',
    introTitle: 'آيات عظمة الخالق',
    introSubtitle: 'تأمل في آيات الله في الكون',
    readInMushaf: 'قراءة في المصحف',
    themeCreation: 'الخلق والتكوين',
    themeHeavensEarth: 'السماوات والأرض',
    themeNatureWater: 'الطبيعة والماء',
    themeHumanCreation: 'خلق الإنسان',
    themePowerDominion: 'القدرة والملك',
    allThemes: 'الكل',
  },

  hadithSifat: {
    title: 'أحاديث صفات الله',
    introTitle: 'أحاديث في صفات الله تعالى',
    introSubtitle: 'أحاديث صحيحة في صفات الله عز وجل',
    narrator: 'الراوي',
    source: 'المصدر',
    hadithNumber: 'حديث رقم',
    shareText: 'مشاركة الحديث',
    savedToFavorites: 'تم الحفظ في المحفوظات',
    removedFromFavorites: 'تم الإزالة من المحفوظات',
  },

  companions: {
    title: 'قصص الصحابة',
    heroTitle: 'صحابة رسول الله ﷺ',
    heroSubtitle: 'نماذج مضيئة من خير القرون',
    story: 'القصة',
    virtues: 'الفضائل والمناقب',
    categoryTenPromised: 'العشرة المبشرون بالجنة',
    categoryMuhajirun: 'المهاجرون',
    categoryAnsar: 'الأنصار',
    categoryMothers: 'أمهات المؤمنين',
    readMore: 'اقرأ المزيد',
    expandBio: 'عرض السيرة',
    footerDua: 'رضي الله عنهم وأرضاهم',
    footerText: 'اللهم احشرنا معهم',
    searchPlaceholder: 'ابحث عن صحابي...',
  },

  seerah: {
    title: 'السيرة النبوية',
    heroTitle: 'سيرة خاتم الأنبياء ﷺ',
    heroSubtitle: 'من المولد إلى الوفاة — نور للعالمين',
    chapters: 'أبواب',
    sectionBirth: 'المولد والنشأة',
    sectionProphethood: 'البعثة والوحي',
    sectionDawah: 'الدعوة في مكة',
    sectionMigration: 'الهجرة إلى المدينة',
    sectionMadinah: 'بناء الدولة',
    sectionConquest: 'الفتوحات',
    sectionFarewell: 'حجة الوداع والوفاة',
  },

  prayerAdjustments: {
    title: 'تعديل المواقيت',
    reset: 'إعادة',
    hint: 'اضبط دقائق لكل صلاة (+ أو -)',
    minutesSuffix: 'د',
  },

  liveActivities: {
    title: 'الأنشطة الحالية',
    enable: 'تفعيل الأنشطة الحالية',
    description: 'عرض وقت الصلاة القادمة على شاشة القفل والـ Dynamic Island بشكل دائم. يتحدث تلقائياً عند فتح التطبيق.',
    notSupported: 'الأنشطة الحية غير مدعومة على هذا الجهاز (يتطلب iOS 16.1+)',
    styleTitle: 'شكل النشاط',
    preview: 'معاينة',
    previewNextPrayer: 'الصلاة القادمة: المغرب',
    previewSunrise: 'الشروق: ٠٥:٤٥',
  },

  seasonal: {
    ashura: {
      title: 'يوم عاشوراء',
      subtitle: 'العاشر من محرم',
      description: 'يوم نجّى الله فيه موسى عليه السلام وقومه من فرعون',
      hadithSource: 'رواه مسلم',
      tasua: 'تاسوعاء',
      tasuaDesc: 'اليوم التاسع من محرم',
      tasuaVirtue: 'صيامه مستحب مع عاشوراء للمخالفة',
      ashuraDay: 'عاشوراء',
      ashuraDayDesc: 'اليوم العاشر من محرم',
      ashuraVirtue: 'صيامه يكفر سنة ماضية',
      eleventh: 'الحادي عشر',
      eleventhDesc: 'اليوم الحادي عشر من محرم',
      eleventhVirtue: 'يجوز صيامه مع عاشوراء',
      virtueExpiation: 'تكفير سنة',
      virtueExpiationDesc: 'صيامه يكفر ذنوب سنة ماضية',
      virtueHistoric: 'يوم تاريخي',
      virtueHistoricDesc: 'نجّى الله فيه موسى وبني إسرائيل',
      virtueSunnah: 'سنة نبوية',
      virtueSunnahDesc: 'كان النبي ﷺ يصومه ويأمر بصيامه',
      virtueGratitude: 'شكر لله',
      virtueGratitudeDesc: 'صامه النبي ﷺ شكراً لله على نجاة موسى',
      actionFast9: 'صيام التاسع',
      actionFast9Sub: 'للمخالفة',
      actionFast10: 'صيام العاشر',
      actionFast10Sub: 'الأساسي',
      actionDua: 'الدعاء',
      actionDuaSub: 'والاستغفار',
      actionSadaqa: 'الصدقة',
      actionSadaqaSub: 'والتوسعة على العيال',
      muharram: 'محرم',
      recommended: 'مستحب',
      fastingDays: 'أيام الصيام',
      virtues: 'فضائل عاشوراء',
      recommendedActions: 'الأعمال المستحبة',
      tip: 'نصيحة',
      tipText: 'يُستحب صيام يوم تاسوعاء (التاسع) مع يوم عاشوراء (العاشر) للمخالفة، وقد كان النبي ﷺ يحرص على صيامه.',
    },
    mawlid: {
      title: 'ذكرى المولد النبوي',
      prophetName: 'محمد ﷺ',
      prophetFullName: 'محمد بن عبدالله بن عبدالمطلب',
      birthDate: '12 ربيع الأول',
      birthPlace: 'مكة المكرمة',
      birthYear: 'عام الفيل (570م تقريباً)',
      nameMuhammad: 'محمد',
      nameMuhammadMeaning: 'المحمود الذي يُحمد أكثر من غيره',
      nameAhmad: 'أحمد',
      nameAhmadMeaning: 'الأحمد في صفاته كلها',
      nameAlMahi: 'الماحي',
      nameAlMahiMeaning: 'الذي يمحو الله به الكفر',
      nameAlHashir: 'الحاشر',
      nameAlHashirMeaning: 'يُحشر الناس على قدمه',
      nameAlAqib: 'العاقب',
      nameAlAqibMeaning: 'الذي ليس بعده نبي',
      nameAlMuqaffi: 'المقفّي',
      nameAlMuqaffiMeaning: 'آخِر من يطأ الأثر',
      qualityMercy: 'الرحمة',
      qualityMercyDesc: 'وما أرسلناك إلا رحمة للعالمين',
      qualityHonesty: 'الصدق والأمانة',
      qualityHonestyDesc: 'عُرف بالصادق الأمين قبل البعثة',
      qualityBravery: 'الشجاعة',
      qualityBraveryDesc: 'كان أشجع الناس في المعارك',
      qualityHumility: 'التواضع',
      qualityHumilityDesc: 'كان يخدم نفسه ويعين أهله',
      qualityGenerosity: 'الكرم',
      qualityGenerosityDesc: 'كان أجود الناس وأكرمهم',
      qualityPatience: 'الصبر',
      qualityPatienceDesc: 'صبر على الأذى والمحن في سبيل الدعوة',
      salawatIbrahimiyah: 'الصلاة الإبراهيمية',
      salawatIbrahimiyahVirtue: 'أفضل صيغ الصلاة على النبي ﷺ',
      salawatShort: 'الصلاة المختصرة',
      salawatShortVirtue: 'من صلى عليّ صلاة صلى الله عليه بها عشراً',
      salawatSalam: 'السلام على النبي',
      salawatSalamVirtue: 'من التشهد في الصلاة',
      actionSalawat: 'الإكثار من الصلاة على النبي ﷺ',
      actionSeerah: 'قراءة السيرة النبوية',
      actionSunnah: 'اتباع سنته ﷺ',
      actionAkhlaq: 'التخلق بأخلاقه ﷺ',
      counterLabel: 'صلِّ على النبي ﷺ',
      counterButton: 'اضغط للصلاة على النبي',
      namesSection: 'من أسماء النبي ﷺ',
      qualitiesSection: 'من صفاته ﷺ',
      salawatSection: 'صيغ الصلاة على النبي ﷺ',
      todaySection: 'في هذا اليوم',
      reminder: 'تذكير',
      reminderText: 'أفضل طريقة لإحياء ذكرى المولد النبوي هي اتباع سنته ﷺ والتخلق بأخلاقه والإكثار من الصلاة عليه.',
    },
    hajj: {
      title: 'موسم الحج',
      headerSubtitle: 'ذو الحجة',
      headerSubtitleWithDay: 'ذو الحجة - اليوم',
      day8Name: 'يوم التروية',
      day8Desc: 'الإحرام من مكة والتوجه إلى منى',
      day9Name: 'يوم عرفة',
      day9Desc: 'أعظم أيام الحج - الوقوف بعرفة',
      day10Name: 'يوم النحر',
      day10Desc: 'عيد الأضحى المبارك - أعظم الأيام عند الله',
      day11Name: 'أول أيام التشريق',
      day11Desc: 'المبيت بمنى ورمي الجمرات',
      day12Name: 'ثاني أيام التشريق',
      day12Desc: 'رمي الجمرات - يجوز التعجل',
      day13Name: 'ثالث أيام التشريق',
      day13Desc: 'آخر أيام الحج للمتأخرين',
      ritualIhram: 'الإحرام',
      ritualIhramDesc: 'الإحرام من مكة للحج',
      ritualMinaStay: 'المبيت بمنى',
      ritualMinaStayDesc: 'التوجه إلى منى والمبيت فيها',
      ritualPrayers: 'الصلوات',
      ritualPrayersDesc: 'صلاة الظهر والعصر والمغرب والعشاء قصراً',
      ritualArafah: 'الوقوف بعرفة',
      ritualArafahDesc: 'الركن الأعظم من أركان الحج',
      ritualDua: 'الدعاء',
      ritualDuaDesc: 'الإكثار من الدعاء والذكر',
      ritualMuzdalifah: 'المبيت بمزدلفة',
      ritualMuzdalifahDesc: 'التوجه إلى مزدلفة بعد الغروب',
      ritualRami: 'رمي جمرة العقبة',
      ritualRamiDesc: 'رمي سبع حصيات عند جمرة العقبة',
      ritualHady: 'ذبح الهدي',
      ritualHadyDesc: 'ذبح الهدي بعد رمي جمرة العقبة',
      ritualHalq: 'الحلق أو التقصير',
      ritualHalqDesc: 'الحلق أو التقصير بعد ذبح الهدي',
      ritualTawafIfadah: 'طواف الإفاضة',
      ritualTawafIfadahDesc: 'طواف الإفاضة حول الكعبة',
      ritualSai: 'السعي',
      ritualSaiDesc: 'السعي بين الصفا والمروة',
      ritualRami3: 'رمي الجمرات الثلاث',
      ritualRami3Desc: 'رمي الجمرة الصغرى ثم الوسطى ثم الكبرى',
      ritualMinaStayTashreeq: 'المبيت بمنى',
      ritualMinaStayTashreeqDesc: 'المبيت بمنى ليالي التشريق',
      ritualTakbeer: 'التكبير',
      ritualTakbeerDesc: 'التكبير في أيام التشريق',
      ritualLeave: 'التعجل',
      ritualLeaveDesc: 'يجوز التعجل بعد رمي اليوم الثاني عشر قبل الغروب',
      ritualTawafWada: 'طواف الوداع',
      ritualTawafWadaDesc: 'آخر ما يفعله الحاج عند مغادرة مكة',
      arafahVirtue1: 'أكثر يوم يعتق الله فيه عبيداً من النار',
      arafahVirtue2: 'صيامه يكفر سنتين (لغير الحاج)',
      arafahVirtue3: 'يباهي الله بأهل عرفة الملائكة',
      tenDaysTitle: 'العشر الأوائل من ذي الحجة',
      tenDaysSubtitle: 'ما من أيام العمل الصالح فيها أحب إلى الله من هذه الأيام',
      tenDaysVirtue1: 'الصيام',
      tenDaysVirtue2: 'الصلاة',
      tenDaysVirtue3: 'التكبير',
      tenDaysVirtue4: 'التهليل',
      tenDaysVirtue5: 'التسبيح',
      tenDaysVirtue6: 'الصدقة',
      tenDaysVirtue7: 'قراءة القرآن',
      tenDaysVirtue8: 'الأضحية',
      tenDaysVirtue9: 'الذكر',
      tenDaysVirtue10: 'التوبة',
      duaTalbiyah: 'التلبية',
      duaTalbiyahOccasion: 'طوال الحج',
      duaTawaf: 'دعاء الطواف',
      duaTawafOccasion: 'بين الركن اليماني والحجر الأسود',
      duaSai: 'دعاء السعي',
      duaSaiOccasion: 'عند الصفا والمروة',
      duaArafah: 'دعاء عرفة',
      duaArafahOccasion: 'يوم عرفة',
      duaRami: 'دعاء رمي الجمرات',
      duaRamiOccasion: 'عند رمي كل حصاة',
      duaTakbir: 'التكبير',
      duaTakbirOccasion: 'أيام التشريق',
      dhulHijjah: 'ذو الحجة',
      ritualsAndDeeds: 'المناسك والأعمال',
      virtuesSection: 'الفضائل',
      duasSection: 'الأدعية المأثورة',
      ritualsSection: 'مناسك الحج',
      hajjDuasSection: 'أدعية الحج',
      tipTitle: 'لغير الحاج',
      tipText: 'صيام يوم عرفة يكفر سنة ماضية وسنة قادمة، والإكثار من الذكر والتكبير والصدقة في هذه الأيام المباركة.',
    },
  },
};
// ==================== English ====================`
);


// ============================================================
// STEP 3: Add values to en block
// ============================================================

// 3a. Add settings keys to en (after backgroundLoadError in en block)
const settingsEnAdd = `
    generalFontSize: 'General Font Size',
    preview: 'Preview',
    homeLayout: 'Home Page Layout',
    grid: 'Grid',
    list: 'List',
    colorBackgrounds: 'Color Backgrounds',
    photoBackgrounds: 'Photo Backgrounds',`;

content = content.replace(
  /    backgroundLoadError: 'An error occurred while loading background',\n  },\n  worship: {\n    title: 'Worship'/,
  `    backgroundLoadError: 'An error occurred while loading background',${settingsEnAdd}\n  },\n  worship: {\n    title: 'Worship'`
);

// 3b. Now find calendar section in en - need to read the actual structure
// Find the end of en calendar with daysShort
const enCalendarMatch = content.match(/const en: TranslationKeys[\s\S]*?calendar:[\s\S]*?daysShort: '([^']*)',\n  },\n  messages:/);
if (!enCalendarMatch) {
  // Try alternate approach - search from en block start
  console.log('Warning: Could not find en calendar daysShort. Will try alternate approach.');
}

// Use a more targeted approach - find nth occurrence
function replaceNth(str, search, replace, n) {
  let count = 0;
  return str.replace(new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), (match) => {
    count++;
    return count === n ? replace : match;
  });
}

// For calendar keys in en block (2nd occurrence of daysShort pattern)
const calendarEnAdd = `
    monthEvents: 'Events This Month',
    adjustTitle: 'Adjust Hijri Date',
    adjustHint: 'You can adjust the Hijri date by adding or subtracting days',`;

// Find lines around en calendar daysShort
const enCalLines = content.split('\n');
let enCalDaysShortLine = -1;
let occurrenceCount = 0;
for (let i = 0; i < enCalLines.length; i++) {
  if (enCalLines[i].includes("daysShort:") && enCalLines[i].includes("'")) {
    occurrenceCount++;
    if (occurrenceCount === 2) { // 2nd occurrence = en block
      enCalDaysShortLine = i;
      break;
    }
  }
}
if (enCalDaysShortLine > 0) {
  enCalLines.splice(enCalDaysShortLine + 1, 0, ...calendarEnAdd.split('\n').filter(l => l));
  content = enCalLines.join('\n');
}

// 3c. Add subscription keys to en (2nd occurrence)
const subscriptionEnAdd = `
    premiumTitle: 'Ruh Al-Muslim Premium',
    premiumSubtitle: 'Full ad-free experience',
    alreadySubscribed: 'You are already subscribed ✨',
    perMonth: '/month',
    perYear: '/year',
    subscribeNow: 'Subscribe Now',
    oneTimePurchase: 'One-time purchase',
    bestValue: 'Best Value',
    legalText: 'By subscribing, you agree to Terms of Use and Privacy Policy',
    restorePurchase: 'Restore Purchase',`;

// Find 2nd subscription block
let subCount = 0;
const subLines = content.split('\n');
let enSubLine = -1;
for (let i = 0; i < subLines.length; i++) {
  if (subLines[i].includes("subscribeToAccess:") && subLines[i].includes("'")) {
    subCount++;
    if (subCount === 2) { // en block
      // Find the upgrade line after this
      for (let j = i + 1; j < i + 5; j++) {
        if (subLines[j].includes("upgrade:")) {
          enSubLine = j;
          break;
        }
      }
      break;
    }
  }
}
if (enSubLine > 0) {
  subLines.splice(enSubLine + 1, 0, ...subscriptionEnAdd.split('\n').filter(l => l));
  content = subLines.join('\n');
}

// 3d. Add names keys to en (2nd names block)
const namesEnAdd = `
    title: 'Names of Allah',
    gridView: 'Grid',
    listView: 'List',
    meaning: 'Meaning',
    explanation: 'Explanation',
    evidence: 'Evidence',
    hadith: 'Hadith',
    whatsapp: 'WhatsApp',
    shareHeader: 'Share Name',
    count99: '99 Names',
    shareAsImage: 'Share as Image',
    shareAsText: 'Share as Text',`;

let namesCount = 0;
const namesLines = content.split('\n');
let enNamesLine = -1;
for (let i = 0; i < namesLines.length; i++) {
  if (namesLines[i].includes("nameCopied:") && namesLines[i].includes("'")) {
    namesCount++;
    if (namesCount === 2) { // en block
      enNamesLine = i;
      break;
    }
  }
}
if (enNamesLine > 0) {
  namesLines.splice(enNamesLine + 1, 0, ...namesEnAdd.split('\n').filter(l => l));
  content = namesLines.join('\n');
}

// 3e. Add all new namespace blocks to en  
// Find the closing of en names block and add after it
let enNamesEndCount = 0;
const enNewLines = content.split('\n');
let enInsertPoint = -1;
// Find 2nd occurrence of "names: {" followed by closing "  }," 
let inEnBlock = false;
for (let i = 0; i < enNewLines.length; i++) {
  if (enNewLines[i].includes("const en: TranslationKeys")) {
    inEnBlock = true;
    continue;
  }
  if (inEnBlock && enNewLines[i].match(/^const \w+: TranslationKeys/)) {
    // Found start of next block, insert before it
    enInsertPoint = i - 1; // before the }; and comment
    break;
  }
}

// Actually, let's find the end of the en block more precisely
// Find "};" followed by "// ==================== " for the fr block
const enEndMatch = content.indexOf("// ==================== Français ====================");
if (enEndMatch > 0) {
  // Go back to find }; before this
  const beforeEnEnd = content.substring(0, enEndMatch);
  const enEndBrace = beforeEnEnd.lastIndexOf("};");
  
  const enNewNamespacesBlock = `
  ayatUniverse: {
    title: 'Verses of Allah\\'s Greatness',
    introTitle: 'Verses of the Creator\\'s Greatness',
    introSubtitle: 'Reflect on Allah\\'s signs in the universe',
    readInMushaf: 'Read in Mushaf',
    themeCreation: 'Creation & Formation',
    themeHeavensEarth: 'Heavens & Earth',
    themeNatureWater: 'Nature & Water',
    themeHumanCreation: 'Human Creation',
    themePowerDominion: 'Power & Dominion',
    allThemes: 'All',
  },

  hadithSifat: {
    title: 'Hadiths on Allah\\'s Attributes',
    introTitle: 'Hadiths on the Attributes of Allah',
    introSubtitle: 'Authentic hadiths about the attributes of Allah',
    narrator: 'Narrator',
    source: 'Source',
    hadithNumber: 'Hadith No.',
    shareText: 'Share Hadith',
    savedToFavorites: 'Saved to favorites',
    removedFromFavorites: 'Removed from favorites',
  },

  companions: {
    title: 'Stories of the Companions',
    heroTitle: 'Companions of the Prophet ﷺ',
    heroSubtitle: 'Shining examples from the best generation',
    story: 'Story',
    virtues: 'Virtues & Merits',
    categoryTenPromised: 'Ten Promised Paradise',
    categoryMuhajirun: 'The Muhajirun',
    categoryAnsar: 'The Ansar',
    categoryMothers: 'Mothers of the Believers',
    readMore: 'Read More',
    expandBio: 'Show Biography',
    footerDua: 'May Allah be pleased with them all',
    footerText: 'O Allah, gather us with them',
    searchPlaceholder: 'Search for a companion...',
  },

  seerah: {
    title: 'Prophet\\'s Biography',
    heroTitle: 'Biography of the Final Prophet ﷺ',
    heroSubtitle: 'From birth to passing — a light for all worlds',
    chapters: 'Chapters',
    sectionBirth: 'Birth & Upbringing',
    sectionProphethood: 'Prophethood & Revelation',
    sectionDawah: 'Dawah in Makkah',
    sectionMigration: 'Migration to Madinah',
    sectionMadinah: 'Building the State',
    sectionConquest: 'Conquests',
    sectionFarewell: 'Farewell Pilgrimage & Passing',
  },

  prayerAdjustments: {
    title: 'Adjust Prayer Times',
    reset: 'Reset',
    hint: 'Adjust minutes for each prayer (+ or -)',
    minutesSuffix: 'm',
  },

  liveActivities: {
    title: 'Live Activities',
    enable: 'Enable Live Activities',
    description: 'Show next prayer time on Lock Screen and Dynamic Island permanently. Updates automatically when app is opened.',
    notSupported: 'Live Activities are not supported on this device (requires iOS 16.1+)',
    styleTitle: 'Activity Style',
    preview: 'Preview',
    previewNextPrayer: 'Next Prayer: Maghrib',
    previewSunrise: 'Sunrise: 05:45',
  },

  seasonal: {
    ashura: {
      title: 'Day of Ashura',
      subtitle: 'The Tenth of Muharram',
      description: 'The day Allah saved Musa (Moses) and his people from Pharaoh',
      hadithSource: 'Narrated by Muslim',
      tasua: 'Tasua',
      tasuaDesc: 'The ninth day of Muharram',
      tasuaVirtue: 'Fasting is recommended along with Ashura',
      ashuraDay: 'Ashura',
      ashuraDayDesc: 'The tenth day of Muharram',
      ashuraVirtue: 'Fasting expiates the sins of the previous year',
      eleventh: 'The Eleventh',
      eleventhDesc: 'The eleventh day of Muharram',
      eleventhVirtue: 'May be fasted along with Ashura',
      virtueExpiation: 'Yearly Expiation',
      virtueExpiationDesc: 'Fasting expiates the sins of the previous year',
      virtueHistoric: 'Historic Day',
      virtueHistoricDesc: 'Allah saved Musa and the Children of Israel',
      virtueSunnah: 'Prophetic Tradition',
      virtueSunnahDesc: 'The Prophet ﷺ used to fast it and encourage fasting',
      virtueGratitude: 'Gratitude to Allah',
      virtueGratitudeDesc: 'The Prophet ﷺ fasted it in gratitude for saving Musa',
      actionFast9: 'Fast the 9th',
      actionFast9Sub: 'To be different',
      actionFast10: 'Fast the 10th',
      actionFast10Sub: 'The main day',
      actionDua: 'Supplication',
      actionDuaSub: 'And seeking forgiveness',
      actionSadaqa: 'Charity',
      actionSadaqaSub: 'And generosity to family',
      muharram: 'Muharram',
      recommended: 'Recommended',
      fastingDays: 'Fasting Days',
      virtues: 'Virtues of Ashura',
      recommendedActions: 'Recommended Actions',
      tip: 'Tip',
      tipText: 'It is recommended to fast Tasua (9th) along with Ashura (10th), and the Prophet ﷺ was keen on fasting it.',
    },
    mawlid: {
      title: 'Prophet\\'s Birthday Commemoration',
      prophetName: 'Muhammad ﷺ',
      prophetFullName: 'Muhammad ibn Abdullah ibn Abdul-Muttalib',
      birthDate: '12 Rabi al-Awwal',
      birthPlace: 'Makkah',
      birthYear: 'Year of the Elephant (approx. 570 CE)',
      nameMuhammad: 'Muhammad',
      nameMuhammadMeaning: 'The most praised among all',
      nameAhmad: 'Ahmad',
      nameAhmadMeaning: 'The most praised in all his attributes',
      nameAlMahi: 'Al-Mahi',
      nameAlMahiMeaning: 'The one through whom Allah erases disbelief',
      nameAlHashir: 'Al-Hashir',
      nameAlHashirMeaning: 'People will be gathered before him',
      nameAlAqib: 'Al-Aqib',
      nameAlAqibMeaning: 'The last prophet, none after him',
      nameAlMuqaffi: 'Al-Muqaffi',
      nameAlMuqaffiMeaning: 'The last to follow',
      qualityMercy: 'Mercy',
      qualityMercyDesc: 'We have not sent you except as a mercy to the worlds',
      qualityHonesty: 'Honesty & Trustworthiness',
      qualityHonestyDesc: 'Known as the Truthful and Trustworthy before prophethood',
      qualityBravery: 'Bravery',
      qualityBraveryDesc: 'He was the bravest of people in battle',
      qualityHumility: 'Humility',
      qualityHumilityDesc: 'He served himself and helped his family',
      qualityGenerosity: 'Generosity',
      qualityGenerosityDesc: 'He was the most generous of all people',
      qualityPatience: 'Patience',
      qualityPatienceDesc: 'He endured harm and hardship for the sake of dawah',
      salawatIbrahimiyah: 'Ibrahimiyyah Salawat',
      salawatIbrahimiyahVirtue: 'The best form of sending blessings upon the Prophet ﷺ',
      salawatShort: 'Short Salawat',
      salawatShortVirtue: 'Whoever sends blessings upon me, Allah sends ten upon him',
      salawatSalam: 'Sending Peace upon the Prophet',
      salawatSalamVirtue: 'From the Tashahhud in prayer',
      actionSalawat: 'Increase blessings upon the Prophet ﷺ',
      actionSeerah: 'Read the Prophet\\'s biography',
      actionSunnah: 'Follow his Sunnah ﷺ',
      actionAkhlaq: 'Adopt his noble character ﷺ',
      counterLabel: 'Send blessings upon the Prophet ﷺ',
      counterButton: 'Tap to send blessings',
      namesSection: 'Names of the Prophet ﷺ',
      qualitiesSection: 'His Qualities ﷺ',
      salawatSection: 'Forms of Sending Blessings ﷺ',
      todaySection: 'On This Day',
      reminder: 'Reminder',
      reminderText: 'The best way to commemorate the Prophet\\'s birthday is to follow his Sunnah ﷺ, adopt his character, and send abundant blessings upon him.',
    },
    hajj: {
      title: 'Hajj Season',
      headerSubtitle: 'Dhul Hijjah',
      headerSubtitleWithDay: 'Dhul Hijjah - Day',
      day8Name: 'Day of Tarwiyah',
      day8Desc: 'Entering Ihram from Makkah and heading to Mina',
      day9Name: 'Day of Arafah',
      day9Desc: 'The greatest day of Hajj - Standing at Arafah',
      day10Name: 'Day of Sacrifice',
      day10Desc: 'Blessed Eid al-Adha - The greatest day in the sight of Allah',
      day11Name: 'First day of Tashreeq',
      day11Desc: 'Staying in Mina and stoning the Jamarat',
      day12Name: 'Second day of Tashreeq',
      day12Desc: 'Stoning the Jamarat - early departure permitted',
      day13Name: 'Third day of Tashreeq',
      day13Desc: 'Last day of Hajj for those who stayed',
      ritualIhram: 'Ihram',
      ritualIhramDesc: 'Entering Ihram from Makkah for Hajj',
      ritualMinaStay: 'Staying in Mina',
      ritualMinaStayDesc: 'Heading to Mina and staying overnight',
      ritualPrayers: 'Prayers',
      ritualPrayersDesc: 'Shortening Dhuhr, Asr, Maghrib, and Isha prayers',
      ritualArafah: 'Standing at Arafah',
      ritualArafahDesc: 'The greatest pillar of Hajj',
      ritualDua: 'Supplication',
      ritualDuaDesc: 'Abundantly making dua and dhikr',
      ritualMuzdalifah: 'Staying in Muzdalifah',
      ritualMuzdalifahDesc: 'Heading to Muzdalifah after sunset',
      ritualRami: 'Stoning Jamrat al-Aqaba',
      ritualRamiDesc: 'Throwing seven pebbles at Jamrat al-Aqaba',
      ritualHady: 'Sacrificing the Hady',
      ritualHadyDesc: 'Sacrificing the animal after stoning',
      ritualHalq: 'Shaving or Trimming',
      ritualHalqDesc: 'Shaving or trimming hair after sacrifice',
      ritualTawafIfadah: 'Tawaf al-Ifadah',
      ritualTawafIfadahDesc: 'Circumambulating the Kaaba',
      ritualSai: 'Sa\\'i',
      ritualSaiDesc: 'Walking between Safa and Marwa',
      ritualRami3: 'Stoning the Three Jamarat',
      ritualRami3Desc: 'Stoning the small, middle, then large Jamrah',
      ritualMinaStayTashreeq: 'Staying in Mina',
      ritualMinaStayTashreeqDesc: 'Staying overnight in Mina during Tashreeq nights',
      ritualTakbeer: 'Takbeer',
      ritualTakbeerDesc: 'Saying Takbeer during the days of Tashreeq',
      ritualLeave: 'Early Departure',
      ritualLeaveDesc: 'Permitted to leave after stoning on the 12th before sunset',
      ritualTawafWada: 'Farewell Tawaf',
      ritualTawafWadaDesc: 'The last act before leaving Makkah',
      arafahVirtue1: 'The day Allah frees the most people from Hell',
      arafahVirtue2: 'Fasting it expiates two years (for non-pilgrims)',
      arafahVirtue3: 'Allah boasts of the people of Arafah to the angels',
      tenDaysTitle: 'The First Ten Days of Dhul Hijjah',
      tenDaysSubtitle: 'No good deeds are more beloved to Allah than those done in these days',
      tenDaysVirtue1: 'Fasting',
      tenDaysVirtue2: 'Prayer',
      tenDaysVirtue3: 'Takbeer',
      tenDaysVirtue4: 'Tahleel',
      tenDaysVirtue5: 'Tasbeeh',
      tenDaysVirtue6: 'Charity',
      tenDaysVirtue7: 'Quran Recitation',
      tenDaysVirtue8: 'Sacrifice',
      tenDaysVirtue9: 'Dhikr',
      tenDaysVirtue10: 'Repentance',
      duaTalbiyah: 'Talbiyah',
      duaTalbiyahOccasion: 'Throughout Hajj',
      duaTawaf: 'Dua of Tawaf',
      duaTawafOccasion: 'Between the Yemeni Corner and the Black Stone',
      duaSai: 'Dua of Sa\\'i',
      duaSaiOccasion: 'At Safa and Marwa',
      duaArafah: 'Dua of Arafah',
      duaArafahOccasion: 'Day of Arafah',
      duaRami: 'Dua of Stoning',
      duaRamiOccasion: 'When throwing each pebble',
      duaTakbir: 'Takbeer',
      duaTakbirOccasion: 'Days of Tashreeq',
      dhulHijjah: 'Dhul Hijjah',
      ritualsAndDeeds: 'Rituals & Deeds',
      virtuesSection: 'Virtues',
      duasSection: 'Recommended Supplications',
      ritualsSection: 'Hajj Rituals',
      hajjDuasSection: 'Hajj Supplications',
      tipTitle: 'For Non-Pilgrims',
      tipText: 'Fasting the Day of Arafah expiates the sins of the previous and coming year. Increase dhikr, takbeer, and charity during these blessed days.',
    },
  },`;

  // Insert before the end of en block
  content = content.substring(0, enEndBrace) + enNewNamespacesBlock + '\n' + content.substring(enEndBrace);
}

// ============================================================
// STEP 4: Add values to all other 10 language blocks (using English values as placeholders)
// ============================================================

const otherLangs = ['fr', 'de', 'tr', 'es', 'ur', 'id', 'ms', 'hi', 'bn', 'ru'];
const langComments = {
  fr: 'Français', de: 'Deutsch', tr: 'Türkçe', es: 'Español',
  ur: 'اردو', id: 'Bahasa Indonesia', ms: 'Bahasa Melayu',
  hi: 'हिन्दी', bn: 'বাংলা', ru: 'Русский'
};

for (const lang of otherLangs) {
  const langComment = langComments[lang];
  
  // Find the settings backgroundLoadError in this lang block
  // Strategy: find the nth occurrence of backgroundLoadError
  const langIndex = ['ar', 'en', ...otherLangs].indexOf(lang);
  
  // Add settings keys - find nth backgroundLoadError
  let bgCount = 0;
  const bgLines = content.split('\n');
  let bgLine = -1;
  for (let i = 0; i < bgLines.length; i++) {
    if (bgLines[i].includes("backgroundLoadError:") && bgLines[i].includes("'")) {
      bgCount++;
      if (bgCount === langIndex + 1) {
        bgLine = i;
        break;
      }
    }
  }
  if (bgLine > 0) {
    bgLines.splice(bgLine + 1, 0,
      `    generalFontSize: 'General Font Size',`,
      `    preview: 'Preview',`,
      `    homeLayout: 'Home Page Layout',`,
      `    grid: 'Grid',`,
      `    list: 'List',`,
      `    colorBackgrounds: 'Color Backgrounds',`,
      `    photoBackgrounds: 'Photo Backgrounds',`
    );
    content = bgLines.join('\n');
  }
  
  // Add calendar keys
  let calCount = 0;
  const calLines = content.split('\n');
  let calLine = -1;
  for (let i = 0; i < calLines.length; i++) {
    if (calLines[i].includes("daysShort:") && calLines[i].includes("'")) {
      calCount++;
      if (calCount === langIndex + 1) {
        calLine = i;
        break;
      }
    }
  }
  if (calLine > 0) {
    calLines.splice(calLine + 1, 0,
      `    monthEvents: 'Events This Month',`,
      `    adjustTitle: 'Adjust Hijri Date',`,
      `    adjustHint: 'You can adjust the Hijri date by adding or subtracting days',`
    );
    content = calLines.join('\n');
  }
  
  // Add subscription keys
  let subC = 0;
  const subL = content.split('\n');
  let subLine2 = -1;
  for (let i = 0; i < subL.length; i++) {
    if (subL[i].includes("upgrade:") && subL[i].includes("'") && i > 0 && content.split('\n')[i-1]?.includes("subscribeToAccess")) {
      // This is tricky - upgrade appears in other places too
    }
  }
  // Better approach: find "subscription: {" blocks
  let subBlockCount = 0;
  const subBLines = content.split('\n');
  for (let i = 0; i < subBLines.length; i++) {
    if (subBLines[i].match(/^\s+subscription:\s*\{/)) {
      subBlockCount++;
      if (subBlockCount === langIndex + 1) {
        // Find the upgrade line within next 5 lines
        for (let j = i + 1; j < i + 5; j++) {
          if (subBLines[j]?.includes("upgrade:")) {
            subBLines.splice(j + 1, 0,
              `    premiumTitle: 'Ruh Al-Muslim Premium',`,
              `    premiumSubtitle: 'Full ad-free experience',`,
              `    alreadySubscribed: 'You are already subscribed ✨',`,
              `    perMonth: '/month',`,
              `    perYear: '/year',`,
              `    subscribeNow: 'Subscribe Now',`,
              `    oneTimePurchase: 'One-time purchase',`,
              `    bestValue: 'Best Value',`,
              `    legalText: 'By subscribing, you agree to Terms of Use and Privacy Policy',`,
              `    restorePurchase: 'Restore Purchase',`
            );
            content = subBLines.join('\n');
            break;
          }
        }
        break;
      }
    }
  }
  
  // Add names keys
  let namesC = 0;
  const namesL = content.split('\n');
  for (let i = 0; i < namesL.length; i++) {
    if (namesL[i].includes("nameCopied:") && namesL[i].includes("'")) {
      namesC++;
      if (namesC === langIndex + 1) {
        namesL.splice(i + 1, 0,
          `    title: 'Names of Allah',`,
          `    gridView: 'Grid',`,
          `    listView: 'List',`,
          `    meaning: 'Meaning',`,
          `    explanation: 'Explanation',`,
          `    evidence: 'Evidence',`,
          `    hadith: 'Hadith',`,
          `    whatsapp: 'WhatsApp',`,
          `    shareHeader: 'Share Name',`,
          `    count99: '99 Names',`,
          `    shareAsImage: 'Share as Image',`,
          `    shareAsText: 'Share as Text',`
        );
        content = namesL.join('\n');
        break;
      }
    }
  }
  
  // Add new namespace blocks before the end of this language block
  const langEndComment = `// ==================== ${langComment} ====================`;
  // Find end of this lang block (};) followed by next lang comment
  // Get next lang or end of file
  const nextLangIdx = otherLangs.indexOf(lang) + 1;
  let endMarker;
  if (nextLangIdx < otherLangs.length) {
    const nextLang = otherLangs[nextLangIdx];
    const nextComment = langComments[nextLang];
    endMarker = `// ==================== ${nextComment} ====================`;
  } else {
    endMarker = `export const translations`;
  }
  
  const langEndPos = content.indexOf(endMarker);
  if (langEndPos > 0) {
    const beforeLangEnd = content.substring(0, langEndPos);
    const langEndBrace = beforeLangEnd.lastIndexOf("};");
    
    const newNamespaceBlock = `
  ayatUniverse: {
    title: 'Verses of Allah\\'s Greatness',
    introTitle: 'Verses of the Creator\\'s Greatness',
    introSubtitle: 'Reflect on Allah\\'s signs in the universe',
    readInMushaf: 'Read in Mushaf',
    themeCreation: 'Creation & Formation',
    themeHeavensEarth: 'Heavens & Earth',
    themeNatureWater: 'Nature & Water',
    themeHumanCreation: 'Human Creation',
    themePowerDominion: 'Power & Dominion',
    allThemes: 'All',
  },

  hadithSifat: {
    title: 'Hadiths on Allah\\'s Attributes',
    introTitle: 'Hadiths on the Attributes of Allah',
    introSubtitle: 'Authentic hadiths about the attributes of Allah',
    narrator: 'Narrator',
    source: 'Source',
    hadithNumber: 'Hadith No.',
    shareText: 'Share Hadith',
    savedToFavorites: 'Saved to favorites',
    removedFromFavorites: 'Removed from favorites',
  },

  companions: {
    title: 'Stories of the Companions',
    heroTitle: 'Companions of the Prophet ﷺ',
    heroSubtitle: 'Shining examples from the best generation',
    story: 'Story',
    virtues: 'Virtues & Merits',
    categoryTenPromised: 'Ten Promised Paradise',
    categoryMuhajirun: 'The Muhajirun',
    categoryAnsar: 'The Ansar',
    categoryMothers: 'Mothers of the Believers',
    readMore: 'Read More',
    expandBio: 'Show Biography',
    footerDua: 'May Allah be pleased with them all',
    footerText: 'O Allah, gather us with them',
    searchPlaceholder: 'Search for a companion...',
  },

  seerah: {
    title: 'Prophet\\'s Biography',
    heroTitle: 'Biography of the Final Prophet ﷺ',
    heroSubtitle: 'From birth to passing — a light for all worlds',
    chapters: 'Chapters',
    sectionBirth: 'Birth & Upbringing',
    sectionProphethood: 'Prophethood & Revelation',
    sectionDawah: 'Dawah in Makkah',
    sectionMigration: 'Migration to Madinah',
    sectionMadinah: 'Building the State',
    sectionConquest: 'Conquests',
    sectionFarewell: 'Farewell Pilgrimage & Passing',
  },

  prayerAdjustments: {
    title: 'Adjust Prayer Times',
    reset: 'Reset',
    hint: 'Adjust minutes for each prayer (+ or -)',
    minutesSuffix: 'm',
  },

  liveActivities: {
    title: 'Live Activities',
    enable: 'Enable Live Activities',
    description: 'Show next prayer time on Lock Screen and Dynamic Island permanently. Updates automatically when app is opened.',
    notSupported: 'Live Activities are not supported on this device (requires iOS 16.1+)',
    styleTitle: 'Activity Style',
    preview: 'Preview',
    previewNextPrayer: 'Next Prayer: Maghrib',
    previewSunrise: 'Sunrise: 05:45',
  },

  seasonal: {
    ashura: {
      title: 'Day of Ashura',
      subtitle: 'The Tenth of Muharram',
      description: 'The day Allah saved Musa (Moses) and his people from Pharaoh',
      hadithSource: 'Narrated by Muslim',
      tasua: 'Tasua',
      tasuaDesc: 'The ninth day of Muharram',
      tasuaVirtue: 'Fasting is recommended along with Ashura',
      ashuraDay: 'Ashura',
      ashuraDayDesc: 'The tenth day of Muharram',
      ashuraVirtue: 'Fasting expiates the sins of the previous year',
      eleventh: 'The Eleventh',
      eleventhDesc: 'The eleventh day of Muharram',
      eleventhVirtue: 'May be fasted along with Ashura',
      virtueExpiation: 'Yearly Expiation',
      virtueExpiationDesc: 'Fasting expiates the sins of the previous year',
      virtueHistoric: 'Historic Day',
      virtueHistoricDesc: 'Allah saved Musa and the Children of Israel',
      virtueSunnah: 'Prophetic Tradition',
      virtueSunnahDesc: 'The Prophet ﷺ used to fast it and encourage fasting',
      virtueGratitude: 'Gratitude to Allah',
      virtueGratitudeDesc: 'The Prophet ﷺ fasted it in gratitude for saving Musa',
      actionFast9: 'Fast the 9th',
      actionFast9Sub: 'To be different',
      actionFast10: 'Fast the 10th',
      actionFast10Sub: 'The main day',
      actionDua: 'Supplication',
      actionDuaSub: 'And seeking forgiveness',
      actionSadaqa: 'Charity',
      actionSadaqaSub: 'And generosity to family',
      muharram: 'Muharram',
      recommended: 'Recommended',
      fastingDays: 'Fasting Days',
      virtues: 'Virtues of Ashura',
      recommendedActions: 'Recommended Actions',
      tip: 'Tip',
      tipText: 'It is recommended to fast Tasua (9th) along with Ashura (10th), and the Prophet ﷺ was keen on fasting it.',
    },
    mawlid: {
      title: 'Prophet\\'s Birthday Commemoration',
      prophetName: 'Muhammad ﷺ',
      prophetFullName: 'Muhammad ibn Abdullah ibn Abdul-Muttalib',
      birthDate: '12 Rabi al-Awwal',
      birthPlace: 'Makkah',
      birthYear: 'Year of the Elephant (approx. 570 CE)',
      nameMuhammad: 'Muhammad',
      nameMuhammadMeaning: 'The most praised among all',
      nameAhmad: 'Ahmad',
      nameAhmadMeaning: 'The most praised in all his attributes',
      nameAlMahi: 'Al-Mahi',
      nameAlMahiMeaning: 'The one through whom Allah erases disbelief',
      nameAlHashir: 'Al-Hashir',
      nameAlHashirMeaning: 'People will be gathered before him',
      nameAlAqib: 'Al-Aqib',
      nameAlAqibMeaning: 'The last prophet, none after him',
      nameAlMuqaffi: 'Al-Muqaffi',
      nameAlMuqaffiMeaning: 'The last to follow',
      qualityMercy: 'Mercy',
      qualityMercyDesc: 'We have not sent you except as a mercy to the worlds',
      qualityHonesty: 'Honesty & Trustworthiness',
      qualityHonestyDesc: 'Known as the Truthful and Trustworthy before prophethood',
      qualityBravery: 'Bravery',
      qualityBraveryDesc: 'He was the bravest of people in battle',
      qualityHumility: 'Humility',
      qualityHumilityDesc: 'He served himself and helped his family',
      qualityGenerosity: 'Generosity',
      qualityGenerosityDesc: 'He was the most generous of all people',
      qualityPatience: 'Patience',
      qualityPatienceDesc: 'He endured harm and hardship for the sake of dawah',
      salawatIbrahimiyah: 'Ibrahimiyyah Salawat',
      salawatIbrahimiyahVirtue: 'The best form of sending blessings upon the Prophet ﷺ',
      salawatShort: 'Short Salawat',
      salawatShortVirtue: 'Whoever sends blessings upon me, Allah sends ten upon him',
      salawatSalam: 'Sending Peace upon the Prophet',
      salawatSalamVirtue: 'From the Tashahhud in prayer',
      actionSalawat: 'Increase blessings upon the Prophet ﷺ',
      actionSeerah: 'Read the Prophet\\'s biography',
      actionSunnah: 'Follow his Sunnah ﷺ',
      actionAkhlaq: 'Adopt his noble character ﷺ',
      counterLabel: 'Send blessings upon the Prophet ﷺ',
      counterButton: 'Tap to send blessings',
      namesSection: 'Names of the Prophet ﷺ',
      qualitiesSection: 'His Qualities ﷺ',
      salawatSection: 'Forms of Sending Blessings ﷺ',
      todaySection: 'On This Day',
      reminder: 'Reminder',
      reminderText: 'The best way to commemorate the Prophet\\'s birthday is to follow his Sunnah ﷺ, adopt his character, and send abundant blessings upon him.',
    },
    hajj: {
      title: 'Hajj Season',
      headerSubtitle: 'Dhul Hijjah',
      headerSubtitleWithDay: 'Dhul Hijjah - Day',
      day8Name: 'Day of Tarwiyah',
      day8Desc: 'Entering Ihram from Makkah and heading to Mina',
      day9Name: 'Day of Arafah',
      day9Desc: 'The greatest day of Hajj - Standing at Arafah',
      day10Name: 'Day of Sacrifice',
      day10Desc: 'Blessed Eid al-Adha - The greatest day in the sight of Allah',
      day11Name: 'First day of Tashreeq',
      day11Desc: 'Staying in Mina and stoning the Jamarat',
      day12Name: 'Second day of Tashreeq',
      day12Desc: 'Stoning the Jamarat - early departure permitted',
      day13Name: 'Third day of Tashreeq',
      day13Desc: 'Last day of Hajj for those who stayed',
      ritualIhram: 'Ihram',
      ritualIhramDesc: 'Entering Ihram from Makkah for Hajj',
      ritualMinaStay: 'Staying in Mina',
      ritualMinaStayDesc: 'Heading to Mina and staying overnight',
      ritualPrayers: 'Prayers',
      ritualPrayersDesc: 'Shortening Dhuhr, Asr, Maghrib, and Isha prayers',
      ritualArafah: 'Standing at Arafah',
      ritualArafahDesc: 'The greatest pillar of Hajj',
      ritualDua: 'Supplication',
      ritualDuaDesc: 'Abundantly making dua and dhikr',
      ritualMuzdalifah: 'Staying in Muzdalifah',
      ritualMuzdalifahDesc: 'Heading to Muzdalifah after sunset',
      ritualRami: 'Stoning Jamrat al-Aqaba',
      ritualRamiDesc: 'Throwing seven pebbles at Jamrat al-Aqaba',
      ritualHady: 'Sacrificing the Hady',
      ritualHadyDesc: 'Sacrificing the animal after stoning',
      ritualHalq: 'Shaving or Trimming',
      ritualHalqDesc: 'Shaving or trimming hair after sacrifice',
      ritualTawafIfadah: 'Tawaf al-Ifadah',
      ritualTawafIfadahDesc: 'Circumambulating the Kaaba',
      ritualSai: 'Sa\\'i',
      ritualSaiDesc: 'Walking between Safa and Marwa',
      ritualRami3: 'Stoning the Three Jamarat',
      ritualRami3Desc: 'Stoning the small, middle, then large Jamrah',
      ritualMinaStayTashreeq: 'Staying in Mina',
      ritualMinaStayTashreeqDesc: 'Staying overnight in Mina during Tashreeq nights',
      ritualTakbeer: 'Takbeer',
      ritualTakbeerDesc: 'Saying Takbeer during the days of Tashreeq',
      ritualLeave: 'Early Departure',
      ritualLeaveDesc: 'Permitted to leave after stoning on the 12th before sunset',
      ritualTawafWada: 'Farewell Tawaf',
      ritualTawafWadaDesc: 'The last act before leaving Makkah',
      arafahVirtue1: 'The day Allah frees the most people from Hell',
      arafahVirtue2: 'Fasting it expiates two years (for non-pilgrims)',
      arafahVirtue3: 'Allah boasts of the people of Arafah to the angels',
      tenDaysTitle: 'The First Ten Days of Dhul Hijjah',
      tenDaysSubtitle: 'No good deeds are more beloved to Allah than those done in these days',
      tenDaysVirtue1: 'Fasting',
      tenDaysVirtue2: 'Prayer',
      tenDaysVirtue3: 'Takbeer',
      tenDaysVirtue4: 'Tahleel',
      tenDaysVirtue5: 'Tasbeeh',
      tenDaysVirtue6: 'Charity',
      tenDaysVirtue7: 'Quran Recitation',
      tenDaysVirtue8: 'Sacrifice',
      tenDaysVirtue9: 'Dhikr',
      tenDaysVirtue10: 'Repentance',
      duaTalbiyah: 'Talbiyah',
      duaTalbiyahOccasion: 'Throughout Hajj',
      duaTawaf: 'Dua of Tawaf',
      duaTawafOccasion: 'Between the Yemeni Corner and the Black Stone',
      duaSai: 'Dua of Sa\\'i',
      duaSaiOccasion: 'At Safa and Marwa',
      duaArafah: 'Dua of Arafah',
      duaArafahOccasion: 'Day of Arafah',
      duaRami: 'Dua of Stoning',
      duaRamiOccasion: 'When throwing each pebble',
      duaTakbir: 'Takbeer',
      duaTakbirOccasion: 'Days of Tashreeq',
      dhulHijjah: 'Dhul Hijjah',
      ritualsAndDeeds: 'Rituals & Deeds',
      virtuesSection: 'Virtues',
      duasSection: 'Recommended Supplications',
      ritualsSection: 'Hajj Rituals',
      hajjDuasSection: 'Hajj Supplications',
      tipTitle: 'For Non-Pilgrims',
      tipText: 'Fasting the Day of Arafah expiates the sins of the previous and coming year. Increase dhikr, takbeer, and charity during these blessed days.',
    },
  },`;
    
    content = content.substring(0, langEndBrace) + newNamespaceBlock + '\n' + content.substring(langEndBrace);
  }
}

// ============================================================
// STEP 5: Write the file
// ============================================================

fs.writeFileSync(TRANSLATIONS_FILE, content, 'utf-8');
console.log('✅ All translation keys added successfully!');
console.log('Now run "npm run translate" to fill real translations for non-ar/en languages.');
