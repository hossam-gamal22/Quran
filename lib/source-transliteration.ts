/**
 * SOURCE TRANSLITERATION
 * Maps Arabic hadith source names to their standard English transliterations.
 * Used to display references like "مسلم 4/2088" → "Muslim 4/2088" for non-Arabic users.
 * No API calls needed — all mappings are local.
 */

/** Map of Arabic source names → English transliterations */
const SOURCE_MAP: Record<string, string> = {
  // Major hadith collections
  'البخاري': 'Al-Bukhari',
  'مسلم': 'Muslim',
  'الترمذي': 'At-Tirmidhi',
  'أبو داود': 'Abu Dawud',
  'ابن ماجه': 'Ibn Majah',
  'النسائي': "An-Nasa'i",
  'أحمد': 'Ahmad',
  'الدارمي': 'Ad-Darimi',
  'مالك': 'Malik',
  // Other collections
  'الحاكم': 'Al-Hakim',
  'الطبراني': 'At-Tabarani',
  'البيهقي': 'Al-Bayhaqi',
  'ابن حبان': 'Ibn Hibban',
  'ابن خزيمة': 'Ibn Khuzaymah',
  'الدارقطني': 'Ad-Daraqutni',
  'عبد الرزاق': 'Abdur-Razzaq',
  'ابن أبي شيبة': 'Ibn Abi Shaybah',
  'الطحاوي': 'At-Tahawi',
  'أبو يعلى': 'Abu Ya\'la',
  'البزار': 'Al-Bazzar',
  'ابن عساكر': 'Ibn Asakir',
  'ابن السني': 'Ibn As-Sunni',
  // Scholars & authorities
  'النووي': 'An-Nawawi',
  'ابن القيم': 'Ibn Al-Qayyim',
  'ابن تيمية': 'Ibn Taymiyyah',
  'الألباني': 'Al-Albani',
  // Narrators (Companions — Sahaba)
  'أبو هريرة': 'Abu Hurayrah',
  'عائشة': 'Aisha',
  'عبد الله بن عمر': 'Abdullah ibn Umar',
  'عبد الله بن عمرو': 'Abdullah ibn Amr',
  'عمر بن الخطاب': 'Umar ibn Al-Khattab',
  'أبو ذر الغفاري': 'Abu Dharr Al-Ghifari',
  'أبو موسى الأشعري': 'Abu Musa Al-Ash\'ari',
  'واثلة بن الأسقع': 'Wathilah ibn Al-Asqa',
  'أنس بن مالك': 'Anas ibn Malik',
  'عبد الله بن عباس': 'Abdullah ibn Abbas',
  'جابر بن عبد الله': 'Jabir ibn Abdullah',
  'أبو سعيد الخدري': 'Abu Sa\'id Al-Khudri',
  'أبو بكر الصديق': 'Abu Bakr As-Siddiq',
  'علي بن أبي طالب': 'Ali ibn Abi Talib',
  'عثمان بن عفان': 'Uthman ibn Affan',
  'معاذ بن جبل': 'Mu\'adh ibn Jabal',
  'أبي بن كعب': 'Ubayy ibn Ka\'b',
  'سعد بن أبي وقاص': 'Sa\'d ibn Abi Waqqas',
  'أبو أيوب الأنصاري': 'Abu Ayyub Al-Ansari',
  'حذيفة بن اليمان': 'Hudhayfah ibn Al-Yaman',
  'البراء بن عازب': 'Al-Bara ibn Azib',
  'أبو الدرداء': 'Abu Ad-Darda',
  'سلمان الفارسي': 'Salman Al-Farsi',
  'بلال بن رباح': 'Bilal ibn Rabah',
  // Common hadith book prefixes
  'صحيح البخاري': 'Sahih Al-Bukhari',
  'صحيح مسلم': 'Sahih Muslim',
  'سنن الترمذي': 'Sunan At-Tirmidhi',
  'سنن أبي داود': 'Sunan Abu Dawud',
  'سنن ابن ماجه': 'Sunan Ibn Majah',
  'سنن النسائي': "Sunan An-Nasa'i",
  'مسند أحمد': 'Musnad Ahmad',
  'موطأ مالك': 'Muwatta Malik',
  'رياض الصالحين': 'Riyadh As-Salihin',
  'الأذكار': 'Al-Adhkar',
  'حصن المسلم': 'Hisn Al-Muslim',
  // Qualifiers
  'متفق عليه': 'Agreed Upon (Bukhari & Muslim)',
  'رواه': 'Narrated by',
  'صحيح': 'Sahih (Authentic)',
  'حسن': 'Hasan (Good)',
  'ضعيف': 'Da\'if (Weak)',
  // Quran surah names commonly found in references
  'البقرة': 'Al-Baqarah',
  'آل عمران': 'Aal Imran',
  'النساء': 'An-Nisa',
  'المائدة': 'Al-Ma\'idah',
  'الأنعام': 'Al-An\'am',
  'الأعراف': 'Al-A\'raf',
  'الأنفال': 'Al-Anfal',
  'التوبة': 'At-Tawbah',
  'يونس': 'Yunus',
  'هود': 'Hud',
  'يوسف': 'Yusuf',
  'الرعد': 'Ar-Ra\'d',
  'إبراهيم': 'Ibrahim',
  'الحجر': 'Al-Hijr',
  'النحل': 'An-Nahl',
  'الإسراء': 'Al-Isra',
  'الكهف': 'Al-Kahf',
  'مريم': 'Maryam',
  'طه': 'Ta-Ha',
  'الأنبياء': 'Al-Anbiya',
  'الحج': 'Al-Hajj',
  'المؤمنون': 'Al-Mu\'minun',
  'النور': 'An-Nur',
  'الفرقان': 'Al-Furqan',
  'الشعراء': 'Ash-Shu\'ara',
  'النمل': 'An-Naml',
  'القصص': 'Al-Qasas',
  'العنكبوت': 'Al-Ankabut',
  'الروم': 'Ar-Rum',
  'لقمان': 'Luqman',
  'السجدة': 'As-Sajdah',
  'الأحزاب': 'Al-Ahzab',
  'سبأ': 'Saba',
  'فاطر': 'Fatir',
  'يس': 'Ya-Sin',
  'الصافات': 'As-Saffat',
  'ص': 'Sad',
  'الزمر': 'Az-Zumar',
  'غافر': 'Ghafir',
  'فصلت': 'Fussilat',
  'الشورى': 'Ash-Shura',
  'الزخرف': 'Az-Zukhruf',
  'الدخان': 'Ad-Dukhan',
  'الجاثية': 'Al-Jathiyah',
  'الأحقاف': 'Al-Ahqaf',
  'محمد': 'Muhammad',
  'الفتح': 'Al-Fath',
  'الحجرات': 'Al-Hujurat',
  'ق': 'Qaf',
  'الذاريات': 'Adh-Dhariyat',
  'الطور': 'At-Tur',
  'النجم': 'An-Najm',
  'القمر': 'Al-Qamar',
  'الرحمن': 'Ar-Rahman',
  'الواقعة': 'Al-Waqi\'ah',
  'الحديد': 'Al-Hadid',
  'المجادلة': 'Al-Mujadilah',
  'الحشر': 'Al-Hashr',
  'الممتحنة': 'Al-Mumtahanah',
  'الصف': 'As-Saff',
  'الجمعة': 'Al-Jumu\'ah',
  'المنافقون': 'Al-Munafiqun',
  'التغابن': 'At-Taghabun',
  'الطلاق': 'At-Talaq',
  'التحريم': 'At-Tahrim',
  'الملك': 'Al-Mulk',
  'القلم': 'Al-Qalam',
  'الحاقة': 'Al-Haqqah',
  'المعارج': 'Al-Ma\'arij',
  'نوح': 'Nuh',
  'الجن': 'Al-Jinn',
  'المزمل': 'Al-Muzzammil',
  'المدثر': 'Al-Muddathir',
  'القيامة': 'Al-Qiyamah',
  'الإنسان': 'Al-Insan',
  'المرسلات': 'Al-Mursalat',
  'النبأ': 'An-Naba',
  'النازعات': 'An-Nazi\'at',
  'عبس': 'Abasa',
  'التكوير': 'At-Takwir',
  'الانفطار': 'Al-Infitar',
  'المطففين': 'Al-Mutaffifin',
  'الانشقاق': 'Al-Inshiqaq',
  'البروج': 'Al-Buruj',
  'الطارق': 'At-Tariq',
  'الأعلى': 'Al-A\'la',
  'الغاشية': 'Al-Ghashiyah',
  'الفجر': 'Al-Fajr',
  'البلد': 'Al-Balad',
  'الشمس': 'Ash-Shams',
  'الليل': 'Al-Layl',
  'الضحى': 'Ad-Duha',
  'الشرح': 'Ash-Sharh',
  'التين': 'At-Tin',
  'العلق': 'Al-Alaq',
  'القدر': 'Al-Qadr',
  'البينة': 'Al-Bayyinah',
  'الزلزلة': 'Az-Zalzalah',
  'العاديات': 'Al-Adiyat',
  'القارعة': 'Al-Qari\'ah',
  'التكاثر': 'At-Takathur',
  'العصر': 'Al-Asr',
  'الهمزة': 'Al-Humazah',
  'الفيل': 'Al-Fil',
  'قريش': 'Quraysh',
  'الماعون': 'Al-Ma\'un',
  'الكوثر': 'Al-Kawthar',
  'الكافرون': 'Al-Kafirun',
  'النصر': 'An-Nasr',
  'المسد': 'Al-Masad',
  'الإخلاص': 'Al-Ikhlas',
  'الفلق': 'Al-Falaq',
  'الناس': 'An-Nas',
  'الفاتحة': 'Al-Fatihah',
};

// Sort keys by length (longest first) to match multi-word names before single words
const SORTED_KEYS = Object.keys(SOURCE_MAP).sort((a, b) => b.length - a.length);

/**
 * Transliterate an Arabic hadith/Quran reference to English.
 * Example: "مسلم 4/2088" → "Muslim 4/2088"
 * Example: "البخاري 7/150، مسلم 4/2071" → "Al-Bukhari 7/150, Muslim 4/2071"
 * Example: "البقرة: 255" → "Al-Baqarah: 255"
 *
 * Only does transliteration for non-Arabic languages. Returns original for Arabic.
 */
export function transliterateReference(reference: string, language: string): string {
  if (!reference) return reference;
  if (language === 'ar') return reference;

  let result = reference;

  for (const arName of SORTED_KEYS) {
    if (result.includes(arName)) {
      result = result.split(arName).join(SOURCE_MAP[arName]);
    }
  }

  // Replace Arabic comma separator with English
  result = result.replace(/،/g, ',');

  // Replace Arabic connector "و" (and) with " & "
  result = result.replace(/\s*و(?=\s|[A-Z])/g, ' & ');

  // Convert Arabic-Indic numerals to Western for non-Arabic/Urdu languages
  if (language !== 'ur') {
    result = result.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  }

  return result;
}
