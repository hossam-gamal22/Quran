import * as fs from 'fs';
import * as path from 'path';

const FILE = path.join(__dirname, '..', 'constants', 'translations.ts');
let content = fs.readFileSync(FILE, 'utf-8');
const origLen = content.split('\n').length;
console.log(`📖 Read file: ${origLen} lines`);

// ═══════ HELPERS ═══════

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

// Find in bounded range
function findInRange(anchor: string, start: number, end: number): number {
  const idx = content.indexOf(anchor, start);
  return (idx !== -1 && idx < end) ? idx : -1;
}

// ═══════ KEY DATA ═══════

const TASBIH_IFACE = `    virtue1: string;
    virtue2: string;
    virtue3: string;
    virtue4: string;
    virtue5: string;
    virtue6: string;
    virtue7: string;
    virtue8: string;
    virtue9: string;
    virtue10: string;
    virtue11: string;
    virtue12: string;
    virtue13: string;
    virtue14: string;
    virtue15: string;
    gradeSahih: string;
    gradeMutafaq: string;
    gradeHasan: string;`;

const TASBIH_AR = `    virtue1: 'ثقيلتان في الميزان، حبيبتان إلى الرحمن',
    virtue2: 'تملأ الميزان',
    virtue3: 'أكبر من كل شيء',
    virtue4: 'أفضل ما قاله النبيون',
    virtue5: 'حرز من الشيطان، وله أجر عظيم',
    virtue6: 'غُرست له نخلة في الجنة',
    virtue7: 'كنز من كنوز الجنة',
    virtue8: 'كنز من كنوز الجنة',
    virtue9: 'حُطّت خطاياه وإن كانت مثل زبد البحر',
    virtue10: 'يفتح الله عليه أبواب الرحمة',
    virtue11: 'أحب الكلام إلى الله',
    virtue12: 'من صلى عليّ صلاة صلى الله عليه بها عشراً',
    virtue13: 'تفتح له أبواب الرحمة',
    virtue14: 'من تسبيح الملائكة',
    virtue15: 'دعوة لا تُرد',
    gradeSahih: 'صحيح',
    gradeMutafaq: 'متفق عليه',
    gradeHasan: 'حسن',`;

const TASBIH_EN = `    virtue1: 'Heavy on the Scale, beloved to the Most Merciful',
    virtue2: 'Fills the Scale',
    virtue3: 'Greater than everything',
    virtue4: 'Best words spoken by the prophets',
    virtue5: 'Protection from Satan, with great reward',
    virtue6: 'A palm tree is planted for him in Paradise',
    virtue7: 'A treasure from the treasures of Paradise',
    virtue8: 'A treasure from the treasures of Paradise',
    virtue9: 'His sins are forgiven even if like sea foam',
    virtue10: 'Allah opens the doors of mercy for him',
    virtue11: 'Most beloved words to Allah',
    virtue12: 'Whoever sends salawat once, Allah blesses him tenfold',
    virtue13: 'The doors of mercy open for him',
    virtue14: 'From the glorification of the angels',
    virtue15: 'A supplication that is not rejected',
    gradeSahih: 'Sahih',
    gradeMutafaq: 'Agreed Upon',
    gradeHasan: 'Hasan',`;

const COLORS_IFACE = `    colorNavy: string;
    colorGreen: string;
    colorBlue: string;
    colorBlack: string;
    colorTeal: string;
    colorWhite: string;
    colorPurple: string;`;

const COLORS_AR = `    colorNavy: 'كحلي',
    colorGreen: 'أخضر',
    colorBlue: 'أزرق',
    colorBlack: 'أسود',
    colorTeal: 'تيل',
    colorWhite: 'أبيض',
    colorPurple: 'بنفسجي',`;

const COLORS_EN = `    colorNavy: 'Navy',
    colorGreen: 'Green',
    colorBlue: 'Blue',
    colorBlack: 'Black',
    colorTeal: 'Teal',
    colorWhite: 'White',
    colorPurple: 'Purple',`;

const DAYS_IFACE = `    sun: string;
    mon: string;
    tue: string;
    wed: string;
    thu: string;
    fri: string;
    sat: string;`;

const DAYS_AR = `    sun: 'الأحد',
    mon: 'الاثنين',
    tue: 'الثلاثاء',
    wed: 'الأربعاء',
    thu: 'الخميس',
    fri: 'الجمعة',
    sat: 'السبت',`;

const DAYS_EN = `    sun: 'Sunday',
    mon: 'Monday',
    tue: 'Tuesday',
    wed: 'Wednesday',
    thu: 'Thursday',
    fri: 'Friday',
    sat: 'Saturday',`;

const NOTIF_IFACE = `    prayer: string;
    prayerTimesAlerts: string;
    salawatReminder: string;
    tasbeeh: string;
    tasbeehReminder: string;
    istighfar: string;
    istighfarReminder: string;
    adhkar: string;
    adhkarDesc: string;
    verseOfDay: string;
    verseOfDayDesc: string;
    customNotification: string;
    customNotificationDesc: string;`;

const NOTIF_AR = `    prayer: 'الصلاة',
    prayerTimesAlerts: 'تنبيهات مواقيت الصلاة',
    salawatReminder: 'تذكير بالصلاة على النبي',
    tasbeeh: 'التسبيح',
    tasbeehReminder: 'تذكير بالتسبيح',
    istighfar: 'الاستغفار',
    istighfarReminder: 'تذكير بالاستغفار',
    adhkar: 'الأذكار',
    adhkarDesc: 'تذكير بأذكار الصباح والمساء',
    verseOfDay: 'آية اليوم',
    verseOfDayDesc: 'آية قرآنية يومية للتدبر',
    customNotification: 'إشعار مخصص',
    customNotificationDesc: 'تذكيرات مخصصة من اختيارك',`;

const NOTIF_EN = `    prayer: 'Prayer',
    prayerTimesAlerts: 'Prayer Times Alerts',
    salawatReminder: 'Salawat Reminder',
    tasbeeh: 'Tasbeeh',
    tasbeehReminder: 'Tasbeeh Reminder',
    istighfar: 'Istighfar',
    istighfarReminder: 'Istighfar Reminder',
    adhkar: 'Adhkar',
    adhkarDesc: 'Morning & Evening Adhkar Reminders',
    verseOfDay: 'Verse of the Day',
    verseOfDayDesc: 'Daily Quranic verse for reflection',
    customNotification: 'Custom Notification',
    customNotificationDesc: 'Custom reminders of your choice',`;

const WORSHIP_IFACE = `
  // العبادات
  worship: {
    onePage: string;
    twoPages: string;
    fourPages: string;
    tenPages: string;
    fullJuz: string;
    onePageTime: string;
    twoPagesTime: string;
    fourPagesTime: string;
    tenPagesTime: string;
    fullJuzTime: string;
  };`;

const WORSHIP_AR = `  worship: {
    onePage: 'صفحة واحدة',
    twoPages: 'صفحتان',
    fourPages: 'أربع صفحات',
    tenPages: 'عشر صفحات',
    fullJuz: 'جزء كامل',
    onePageTime: '~٥ دقائق',
    twoPagesTime: '~١٠ دقائق',
    fourPagesTime: '~٢٠ دقيقة',
    tenPagesTime: '~٥٠ دقيقة',
    fullJuzTime: '~٦٠ دقيقة',
  },`;

const WORSHIP_EN = `  worship: {
    onePage: 'One Page',
    twoPages: 'Two Pages',
    fourPages: 'Four Pages',
    tenPages: 'Ten Pages',
    fullJuz: 'Full Juz',
    onePageTime: '~5 minutes',
    twoPagesTime: '~10 minutes',
    fourPagesTime: '~20 minutes',
    tenPagesTime: '~50 minutes',
    fullJuzTime: '~60 minutes',
  },`;

const SECINFO_IFACE = `  sectionInfo: {
    tasbih: { title: string; body: string; };
    prayer: { title: string; body: string; };
    names: { title: string; body: string; };
    ruqya: { title: string; body: string; };
    duas_hadith: { title: string; body: string; };
    quran_surahs: { title: string; body: string; };
    azkar: { title: string; body: string; };
    stories: { title: string; body: string; };
    hajj_umrah: { title: string; body: string; };
    worship: { title: string; body: string; };
    tasbih_section: { title: string; body: string; };
    marifat_allah: { title: string; body: string; };
  };`;

const SECINFO_AR = `  sectionInfo: {
    tasbih: { title: 'التسبيح', body: 'التسبيح ذكر لله وتنزيه له عما لا يليق بجلاله' },
    prayer: { title: 'الصلاة', body: 'الصلاة عمود الدين وأول ما يُحاسب عليه العبد' },
    names: { title: 'أسماء الله الحسنى', body: 'لله تسعة وتسعون اسماً، من أحصاها دخل الجنة' },
    ruqya: { title: 'الرقية الشرعية', body: 'الرقية الشرعية علاج بالقرآن والأدعية النبوية' },
    duas_hadith: { title: 'الأدعية والأحاديث', body: 'أدعية مأثورة من القرآن والسنة النبوية' },
    quran_surahs: { title: 'سور وآيات قرآنية', body: 'سور وآيات مختارة ذات فضل عظيم' },
    azkar: { title: 'الأذكار', body: 'أذكار الصباح والمساء والنوم من السنة' },
    stories: { title: 'القصص', body: 'قصص الأنبياء والصحابة رضوان الله عليهم' },
    hajj_umrah: { title: 'الحج والعمرة', body: 'أدعية ومناسك الحج والعمرة خطوة بخطوة' },
    worship: { title: 'العبادات', body: 'تتبع صلواتك وصيامك وقراءتك للقرآن' },
    tasbih_section: { title: 'التسبيح والاستغفار', body: 'المسبحة الإلكترونية والاستغفار والصلاة على النبي' },
    marifat_allah: { title: 'معرفة الله', body: 'أسماء الله الحسنى وآيات عظمته في الكون' },
  },`;

const SECINFO_EN = `  sectionInfo: {
    tasbih: { title: 'Tasbeeh', body: 'Tasbeeh is remembrance and glorification of Allah' },
    prayer: { title: 'Prayer', body: 'Prayer is the pillar of religion, first to be judged' },
    names: { title: 'Names of Allah', body: 'Allah has 99 names; whoever memorizes them enters Paradise' },
    ruqya: { title: 'Ruqyah', body: 'Ruqyah is healing through Quran and prophetic duas' },
    duas_hadith: { title: 'Duas & Hadith', body: 'Authentic duas from the Quran and Prophetic Sunnah' },
    quran_surahs: { title: 'Quran Surahs & Verses', body: 'Selected surahs and verses of great merit' },
    azkar: { title: 'Adhkar', body: 'Morning, evening, and sleep adhkar from the Sunnah' },
    stories: { title: 'Stories', body: 'Stories of the Prophets and Companions' },
    hajj_umrah: { title: 'Hajj & Umrah', body: 'Hajj & Umrah duas and rituals step by step' },
    worship: { title: 'Worship', body: 'Track your prayers, fasting, and Quran reading' },
    tasbih_section: { title: 'Tasbeeh & Istighfar', body: 'Digital tasbeeh, istighfar, and salawat' },
    marifat_allah: { title: 'Knowing Allah', body: 'Names of Allah and verses of His greatness' },
  },`;

// ═══════ STEP 1: INTERFACE ═══════
console.log('\n📝 STEP 1: Interface...');

// A) tasbih: after "    targetMode: string;" (1st occurrence)
insertAfterLine('    targetMode: string;', 1, TASBIH_IFACE, 'iface/tasbih');

// C) common: after "    none: string;" (1st occurrence — only in interface)
insertAfterLine('    none: string;', 1, COLORS_IFACE, 'iface/common');

// D) khatma: after "    ahead: string;" (1st occurrence)
insertAfterLine('    ahead: string;', 1, DAYS_IFACE, 'iface/khatma');

// E) notificationSounds: after "    minutes: string;" 
// "minutes: string;" appears twice in the interface (prayer and notificationSounds)
// notificationSounds.minutes is the LAST one. Use occurrence 2.
insertAfterLine('    minutes: string;', 2, NOTIF_IFACE, 'iface/notifSounds');

// B) worship: insert before "  // أصوات الإشعارات" 
insertBefore('  // أصوات الإشعارات', 1, WORSHIP_IFACE, 'iface/worship');

// F) sectionInfo: insert before the closing "}" of the interface
// Interface ends with `  };\n}\n` right before `// ==` line
// Find the closing `}` right before the first `const` declaration
{
  const constIdx = content.indexOf('\nconst ar:');
  if (constIdx !== -1) {
    // Find the `}` before it
    const closingBrace = content.lastIndexOf('\n}', constIdx);
    if (closingBrace !== -1) {
      content = content.slice(0, closingBrace) + '\n' + SECINFO_IFACE + content.slice(closingBrace);
      console.log('  ✅ iface/sectionInfo');
    } else {
      console.error('  ❌ iface/sectionInfo: closing brace not found');
    }
  }
}

// ═══════ STEP 2: LANGUAGE BLOCKS ═══════
console.log('\n📝 STEP 2: Language blocks...');

const LANG_MARKERS = [
  'const ar: TranslationKeys', 'const en: TranslationKeys', 'const fr: TranslationKeys',
  'const de: TranslationKeys', 'const tr: TranslationKeys', 'const es: TranslationKeys',
  'const ur: TranslationKeys', 'const id: TranslationKeys', 'const ms: TranslationKeys',
  'const hi: TranslationKeys', 'const bn: TranslationKeys', 'const ru: TranslationKeys',
];
const LANG_NAMES = ['ar','en','fr','de','tr','es','ur','id','ms','hi','bn','ru'];

for (let i = 0; i < LANG_NAMES.length; i++) {
  const lang = LANG_NAMES[i];
  const isAr = lang === 'ar';
  console.log(`\n  [${lang}]...`);

  // Find block boundaries (re-find each time since content shifts)
  const blockStart = content.indexOf(LANG_MARKERS[i]);
  if (blockStart === -1) { console.error(`  ❌ ${lang}: block marker not found`); continue; }
  
  const nextMarker = i < LANG_NAMES.length - 1 
    ? LANG_MARKERS[i + 1] 
    : 'export const translations';
  const blockEnd = content.indexOf(nextMarker, blockStart + 1);
  if (blockEnd === -1) { console.error(`  ❌ ${lang}: block end not found`); continue; }

  // Helper: insert after an anchor within this block
  function doInsert(anchor: string, text: string, label: string): boolean {
    // re-derive boundaries since content may have changed
    const bs = content.indexOf(LANG_MARKERS[i]);
    const be = content.indexOf(
      i < LANG_NAMES.length - 1 ? LANG_MARKERS[i + 1] : 'export const translations',
      bs + 1
    );
    const idx = findInRange(anchor, bs, be);
    if (idx === -1) { console.error(`    ❌ ${label}`); return false; }
    const eol = content.indexOf('\n', idx);
    content = content.slice(0, eol + 1) + text + '\n' + content.slice(eol + 1);
    console.log(`    ✅ ${label}`);
    return true;
  }

  // A) tasbih virtues: after "targetMode: '"
  doInsert("targetMode: '", isAr ? TASBIH_AR : TASBIH_EN, `${lang}/tasbih`);
  
  // C) common colors: after first "none: '" in block (common.none, not other.none)
  doInsert("none: '", isAr ? COLORS_AR : COLORS_EN, `${lang}/common`);

  // D) khatma days: after "ahead: '"
  doInsert("ahead: '", isAr ? DAYS_AR : DAYS_EN, `${lang}/khatma`);
  
  // E) notificationSounds: after "minutes: '" (2nd occurrence in block — notifSounds one)
  // In each language block, "minutes:" appears twice: once in prayer, once in notificationSounds.
  // We need the SECOND one.
  {
    const bs = content.indexOf(LANG_MARKERS[i]);
    const be = content.indexOf(
      i < LANG_NAMES.length - 1 ? LANG_MARKERS[i + 1] : 'export const translations',
      bs + 1
    );
    const first = findInRange("minutes: '", bs, be);
    if (first !== -1) {
      const second = findInRange("minutes: '", first + 10, be);
      if (second !== -1) {
        const eol = content.indexOf('\n', second);
        content = content.slice(0, eol + 1) + (isAr ? NOTIF_AR : NOTIF_EN) + '\n' + content.slice(eol + 1);
        console.log(`    ✅ ${lang}/notifSounds`);
      } else {
        console.error(`    ❌ ${lang}/notifSounds: 2nd minutes not found`);
      }
    } else {
      console.error(`    ❌ ${lang}/notifSounds: 1st minutes not found`);
    }
  }

  // B) worship: insert before "notificationSounds: {" in this block
  {
    const bs = content.indexOf(LANG_MARKERS[i]);
    const be = content.indexOf(
      i < LANG_NAMES.length - 1 ? LANG_MARKERS[i + 1] : 'export const translations',
      bs + 1
    );
    const nsIdx = findInRange('  notificationSounds: {', bs, be);
    if (nsIdx !== -1) {
      content = content.slice(0, nsIdx) + (isAr ? WORSHIP_AR : WORSHIP_EN) + '\n' + content.slice(nsIdx);
      console.log(`    ✅ ${lang}/worship`);
    } else {
      console.error(`    ❌ ${lang}/worship: notificationSounds anchor not found`);
    }
  }

  // F) sectionInfo: insert before the closing "};" of this block
  {
    const bs = content.indexOf(LANG_MARKERS[i]);
    const be = content.indexOf(
      i < LANG_NAMES.length - 1 ? LANG_MARKERS[i + 1] : 'export const translations',
      bs + 1
    );
    // Find the last `\n};` before blockEnd
    const searchArea = content.slice(bs, be);
    const lastClosing = searchArea.lastIndexOf('\n};');
    if (lastClosing !== -1) {
      const absoluteIdx = bs + lastClosing;
      content = content.slice(0, absoluteIdx) + '\n' + (isAr ? SECINFO_AR : SECINFO_EN) + content.slice(absoluteIdx);
      console.log(`    ✅ ${lang}/sectionInfo`);
    } else {
      console.error(`    ❌ ${lang}/sectionInfo: closing brace not found`);
    }
  }
}

// ═══════ WRITE ═══════
fs.writeFileSync(FILE, content, 'utf-8');
const newLen = content.split('\n').length;
console.log(`\n✅ Done! ${origLen} → ${newLen} lines (+${newLen - origLen})`);
