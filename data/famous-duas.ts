// data/famous-duas.ts
// 20 curated famous duas and tasbihat (Quranic + Prophetic + Tasbihat).
// Static, decoupled from azkar.json. Powers the /famous-duas screen.
// Arabic text taken verbatim from verified Islamic sources (Quran + authentic Hadith).
// Per-language fields cover all 12 supported languages; the 10 non-ar/en values
// are stubbed to the English string and may be replaced with native translations later.

export type FamousDuaCategory = 'quran_duas' | 'sunnah_duas' | 'tasbihat';

export type FamousDuaLang =
  | 'ar' | 'en' | 'fr' | 'de' | 'es' | 'tr'
  | 'ur' | 'id' | 'ms' | 'hi' | 'bn' | 'ru';

export type LocalizedText = Record<FamousDuaLang, string>;

/** Concise localized-text builder. Stubs all non-ar/en languages to the English value. */
const L = (ar: string, en: string): LocalizedText => ({
  ar, en, fr: en, de: en, es: en, tr: en,
  ur: en, id: en, ms: en, hi: en, bn: en, ru: en,
});

export interface FamousDua {
  id: string;
  arabic: string;
  transliteration: string;
  source: LocalizedText;
  category: FamousDuaCategory;
  fadl: {
    text: LocalizedText;
    source: LocalizedText;
  };
  /** Recommended repetition count. null = open / no specific count. */
  repetitions: number | null;
  occasion: LocalizedText;
}

/** Read a localized field with English fallback. */
export function resolveLocalized(field: LocalizedText, lang: string): string {
  const key = lang as FamousDuaLang;
  return field[key] ?? field.en ?? field.ar;
}

export const FAMOUS_DUAS: FamousDua[] = [
  // ────────────────────────────────────────────────
  // 📖 أدعية قرآنية
  // ────────────────────────────────────────────────
  {
    id: 'dua_yunus',
    arabic: 'لَا إِلَٰهَ إِلَّا أَنتَ سُبْحَانَكَ إِنِّي كُنتُ مِنَ الظَّالِمِينَ',
    transliteration: 'La ilaha illa anta subhanaka inni kuntu mina adh-dhalimin',
    source: L('سورة الأنبياء: ٨٧', 'Surah Al-Anbiya: 87'),
    category: 'quran_duas',
    fadl: {
      text: L(
        'دعوة ذي النون إذ دعا وهو في بطن الحوت، فإنه لم يدعُ بها رجلٌ مسلمٌ في شيء قطّ إلا استجاب الله له.',
        'The supplication of Dhun-Nun (Yunus) when he called upon Allah while in the belly of the whale. No Muslim supplicates with it for anything ever, except that Allah responds to him.'
      ),
      source: L('رواه الترمذي وصححه الألباني', 'Narrated by At-Tirmidhi, authenticated by Al-Albani'),
    },
    repetitions: null,
    occasion: L('عند الكرب والشدة وفي أي وقت', 'During distress, hardship, and at any time'),
  },
  {
    id: 'dua_rabbana_atina',
    arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
    transliteration: 'Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina adhaban-nar',
    source: L('سورة البقرة: ٢٠١', 'Surah Al-Baqarah: 201'),
    category: 'quran_duas',
    fadl: {
      text: L('كان أكثر دعاء النبي ﷺ.', 'This was the most frequent supplication of the Prophet ﷺ.'),
      source: L('متفق عليه', 'Agreed upon (Bukhari & Muslim)'),
    },
    repetitions: null,
    occasion: L(
      'في أي وقت، وخاصة في السجود وبين الركن اليماني والحجر الأسود',
      'At any time, especially in sujood and between the Yemeni corner and the Black Stone'
    ),
  },
  {
    id: 'dua_rabbi_zidni',
    arabic: 'رَّبِّ زِدْنِي عِلْمًا',
    transliteration: 'Rabbi zidni ilma',
    source: L('سورة طه: ١١٤', 'Surah Taha: 114'),
    category: 'quran_duas',
    fadl: {
      text: L(
        'أمر الله نبيه ﷺ أن يسأله الزيادة من العلم.',
        'Allah commanded His Prophet ﷺ to ask Him for an increase in knowledge.'
      ),
      source: L('القرآن الكريم', 'The Holy Quran'),
    },
    repetitions: null,
    occasion: L('عند طلب العلم والدراسة', 'When seeking knowledge and studying'),
  },
  {
    id: 'dua_rabbi_habli',
    arabic: 'رَبِّ هَبْ لِي مِن لَّدُنكَ ذُرِّيَّةً طَيِّبَةً ۖ إِنَّكَ سَمِيعُ الدُّعَاءِ',
    transliteration: "Rabbi hab li min ladunka dhurriyyatan tayyibah innaka sami'ud-du'a",
    source: L('سورة آل عمران: ٣٨', 'Surah Aal-Imran: 38'),
    category: 'quran_duas',
    fadl: {
      text: L(
        'دعاء زكريا عليه السلام، استجاب الله له ورزقه يحيى.',
        "Zakariya's supplication — Allah answered him and granted him Yahya."
      ),
      source: L('القرآن الكريم', 'The Holy Quran'),
    },
    repetitions: null,
    occasion: L('لطلب الذرية الصالحة', 'When asking for righteous offspring'),
  },
  {
    id: 'dua_rabbana_la_tuzigh',
    arabic:
      'رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِن لَّدُنكَ رَحْمَةً ۚ إِنَّكَ أَنتَ الْوَهَّابُ',
    transliteration:
      "Rabbana la tuzigh qulubana ba'da idh hadaytana wa hab lana min ladunka rahmah innaka antal-wahhab",
    source: L('سورة آل عمران: ٨', 'Surah Aal-Imran: 8'),
    category: 'quran_duas',
    fadl: {
      text: L(
        'دعاء أولي الألباب لثبات القلب على الهداية.',
        'Supplication of people of understanding for steadfastness upon guidance.'
      ),
      source: L('القرآن الكريم', 'The Holy Quran'),
    },
    repetitions: null,
    occasion: L('في أي وقت، وخاصة عند الفتن', 'At any time, especially during trials'),
  },

  // ────────────────────────────────────────────────
  // 📿 أدعية نبوية من السنة
  // ────────────────────────────────────────────────
  {
    id: 'dua_sayyid_istighfar',
    arabic:
      'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي، فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ',
    transliteration:
      "Allahumma anta rabbi la ilaha illa ant, khalaqtani wa ana 'abduk, wa ana 'ala 'ahdika wa wa'dika mastata't, a'udhu bika min sharri ma sana't, abu'u laka bini'matika 'alayy, wa abu'u bidhanbi, faghfir li fa innahu la yaghfirudh-dhunuba illa ant",
    source: L('رواه البخاري', 'Narrated by Al-Bukhari'),
    category: 'sunnah_duas',
    fadl: {
      text: L(
        'من قالها موقنًا بها حين يُمسي فمات من ليلته دخل الجنة، ومن قالها حين يُصبح فمات من يومه فمثل ذلك.',
        'Whoever says it with conviction in the evening and dies that night will enter Paradise, and likewise for whoever says it in the morning.'
      ),
      source: L('رواه البخاري', 'Narrated by Al-Bukhari'),
    },
    repetitions: 1,
    occasion: L('صباحاً ومساءً', 'Morning and evening'),
  },
  {
    id: 'dua_karb',
    arabic:
      'لَا إِلَهَ إِلَّا اللهُ الْعَظِيمُ الْحَلِيمُ، لَا إِلَهَ إِلَّا اللهُ رَبُّ الْعَرْشِ الْعَظِيمِ، لَا إِلَهَ إِلَّا اللهُ رَبُّ السَّمَاوَاتِ وَرَبُّ الْأَرْضِ وَرَبُّ الْعَرْشِ الْكَرِيمِ',
    transliteration:
      "La ilaha illallahul-'Adhimul-Halim, la ilaha illallahu Rabbul-'Arshil-'Adhim, la ilaha illallahu Rabbus-samawati wa Rabbul-ardi wa Rabbul-'Arshil-Karim",
    source: L('متفق عليه', 'Agreed upon (Bukhari & Muslim)'),
    category: 'sunnah_duas',
    fadl: {
      text: L(
        'كان النبي ﷺ يدعو بهنّ عند الكرب.',
        'The Prophet ﷺ used to supplicate with these words during times of distress.'
      ),
      source: L('متفق عليه', 'Agreed upon'),
    },
    repetitions: null,
    occasion: L('عند الكرب والهم والحزن', 'During distress, worry, and grief'),
  },
  {
    id: 'dua_hamm',
    arabic:
      'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَأَعُوذُ بِكَ مِنَ الْعَجْزِ وَالْكَسَلِ، وَأَعُوذُ بِكَ مِنَ الْجُبْنِ وَالْبُخْلِ، وَأَعُوذُ بِكَ مِنْ غَلَبَةِ الدَّيْنِ وَقَهْرِ الرِّجَالِ',
    transliteration:
      "Allahumma inni a'udhu bika minal-hammi wal-hazan, wa a'udhu bika minal-'ajzi wal-kasal, wa a'udhu bika minal-jubni wal-bukhl, wa a'udhu bika min ghalabatid-dayni wa qahrir-rijal",
    source: L('رواه أبو داود', 'Narrated by Abu Dawud'),
    category: 'sunnah_duas',
    fadl: {
      text: L(
        'كان النبي ﷺ يكثر من قول هذا الدعاء.',
        'The Prophet ﷺ used to frequently say this supplication.'
      ),
      source: L('رواه أبو داود', 'Narrated by Abu Dawud'),
    },
    repetitions: null,
    occasion: L('عند الهم والضيق والدَّين', 'During worry, anxiety, and debt'),
  },
  {
    id: 'dua_dhalamtu_nafsi',
    arabic:
      'اللَّهُمَّ إِنِّي ظَلَمْتُ نَفْسِي ظُلْمًا كَثِيرًا وَلَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ، فَاغْفِرْ لِي مَغْفِرَةً مِنْ عِنْدِكَ وَارْحَمْنِي إِنَّكَ أَنْتَ الْغَفُورُ الرَّحِيمُ',
    transliteration:
      "Allahumma inni dhalamtu nafsi dhulman kathiran wa la yaghfirudh-dhunuba illa ant, faghfir li maghfiratan min 'indik, warhamni innaka antal-Ghafur-ur-Rahim",
    source: L('متفق عليه', 'Agreed upon (Bukhari & Muslim)'),
    category: 'sunnah_duas',
    fadl: {
      text: L(
        'علَّمه النبي ﷺ لأبي بكر الصديق رضي الله عنه ليقوله في صلاته.',
        'The Prophet ﷺ taught this to Abu Bakr As-Siddiq to say in his prayer.'
      ),
      source: L('متفق عليه', 'Agreed upon'),
    },
    repetitions: null,
    occasion: L('في الصلاة وفي أي وقت', 'In prayer and at any time'),
  },
  {
    id: 'dua_ya_hayy_ya_qayyum',
    arabic:
      'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ',
    transliteration:
      "Ya Hayyu ya Qayyumu birahmatika astaghith, aslih li sha'ni kullahu wa la takilni ila nafsi tarfata 'ayn",
    source: L('رواه الحاكم وصححه الألباني', 'Narrated by Al-Hakim, authenticated by Al-Albani'),
    category: 'sunnah_duas',
    fadl: {
      text: L(
        'دعاء عظيم جامع لخير الدنيا والآخرة.',
        'A comprehensive supplication encompassing the good of this world and the Hereafter.'
      ),
      source: L('رواه الحاكم', 'Narrated by Al-Hakim'),
    },
    repetitions: null,
    occasion: L(
      'عند الكرب والشدة وفي الصباح والمساء',
      'During distress and in the morning and evening'
    ),
  },
  {
    id: 'dua_a3inni',
    arabic: 'اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ',
    transliteration: "Allahumma a'inni 'ala dhikrika wa shukrika wa husni 'ibadatik",
    source: L('رواه أبو داود والنسائي', 'Narrated by Abu Dawud and An-Nasai'),
    category: 'sunnah_duas',
    fadl: {
      text: L(
        'أوصى النبي ﷺ معاذ بن جبل ألا يدع هذا الدعاء دُبُر كل صلاة.',
        "The Prophet ﷺ advised Mu'adh ibn Jabal to never leave this supplication after every prayer."
      ),
      source: L('رواه أبو داود', 'Narrated by Abu Dawud'),
    },
    repetitions: 1,
    occasion: L('بعد كل صلاة', 'After every prayer'),
  },
  {
    id: 'dua_jannah_nar',
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْجَنَّةَ وَأَعُوذُ بِكَ مِنَ النَّارِ',
    transliteration: "Allahumma inni as'alukal-jannata wa a'udhu bika minan-nar",
    source: L('رواه أبو داود', 'Narrated by Abu Dawud'),
    category: 'sunnah_duas',
    fadl: {
      text: L(
        'من سأل الله الجنة ثلاث مرات قالت الجنة: اللهم أدخله الجنة، ومن استجار من النار ثلاث مرات قالت النار: اللهم أجره من النار.',
        'Whoever asks Allah for Paradise three times, Paradise says: O Allah, admit him to Paradise. And whoever seeks refuge from the Fire three times, the Fire says: O Allah, save him from the Fire.'
      ),
      source: L('رواه الترمذي', 'Narrated by At-Tirmidhi'),
    },
    repetitions: 3,
    occasion: L('بعد كل صلاة وفي أي وقت', 'After every prayer and at any time'),
  },
  {
    id: 'dua_istighfar_complete',
    arabic:
      'أَسْتَغْفِرُ اللهَ الْعَظِيمَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ',
    transliteration:
      "Astaghfirullal-'Adhimal-ladhi la ilaha illa Huwal-Hayyul-Qayyumu wa atubu ilayh",
    source: L('رواه أبو داود والترمذي', 'Narrated by Abu Dawud and At-Tirmidhi'),
    category: 'sunnah_duas',
    fadl: {
      text: L(
        'من قالها غُفر له وإن كان فرَّ من الزحف.',
        'Whoever says it will be forgiven, even if he had fled from the battlefield.'
      ),
      source: L('رواه أبو داود والترمذي', 'Narrated by Abu Dawud and At-Tirmidhi'),
    },
    repetitions: 3,
    occasion: L('بعد الصلاة وفي أي وقت', 'After prayer and at any time'),
  },

  // ────────────────────────────────────────────────
  // 📿 التسبيحات المشهورة
  // ────────────────────────────────────────────────
  {
    id: 'tasbih_baqiyat_salihat',
    arabic: 'سُبْحَانَ اللهِ، وَالْحَمْدُ للهِ، وَلَا إِلَهَ إِلَّا اللهُ، وَاللهُ أَكْبَرُ',
    transliteration: 'Subhanallah, walhamdulillah, wa la ilaha illallah, wallahu akbar',
    source: L('رواه مسلم', 'Narrated by Muslim'),
    category: 'tasbihat',
    fadl: {
      text: L(
        'أحب الكلام إلى الله أربع: سبحان الله، والحمد لله، ولا إله إلا الله، والله أكبر.',
        'The most beloved words to Allah are four: SubhanAllah, Alhamdulillah, La ilaha illallah, Allahu Akbar.'
      ),
      source: L('رواه مسلم', 'Narrated by Muslim'),
    },
    repetitions: null,
    occasion: L('الباقيات الصالحات — في أي وقت', 'The everlasting good deeds — at any time'),
  },
  {
    id: 'tasbih_subhanallah_bihamdihi',
    arabic: 'سُبْحَانَ اللهِ وَبِحَمْدِهِ',
    transliteration: 'Subhanallahi wa bihamdih',
    source: L('متفق عليه', 'Agreed upon (Bukhari & Muslim)'),
    category: 'tasbihat',
    fadl: {
      text: L(
        'من قال سبحان الله وبحمده في يوم مئة مرة حُطَّت خطاياه وإن كانت مثل زبد البحر.',
        'Whoever says SubhanAllahi wa bihamdihi 100 times a day, his sins will be forgiven even if they were as much as the foam of the sea.'
      ),
      source: L('متفق عليه', 'Agreed upon'),
    },
    repetitions: 100,
    occasion: L('في أي وقت — ١٠٠ مرة في اليوم', 'At any time — 100 times a day'),
  },
  {
    id: 'tasbih_subhanallah_adheem',
    arabic: 'سُبْحَانَ اللهِ وَبِحَمْدِهِ، سُبْحَانَ اللهِ الْعَظِيمِ',
    transliteration: "Subhanallahi wa bihamdih, subhanallahil-'Adhim",
    source: L('متفق عليه', 'Agreed upon (Bukhari & Muslim)'),
    category: 'tasbihat',
    fadl: {
      text: L(
        'كلمتان خفيفتان على اللسان، ثقيلتان في الميزان، حبيبتان إلى الرحمن.',
        'Two words light on the tongue, heavy on the Scale, beloved to the Most Merciful.'
      ),
      source: L('متفق عليه', 'Agreed upon'),
    },
    repetitions: null,
    occasion: L('في أي وقت', 'At any time'),
  },
  {
    id: 'tasbih_subhanallah_adadkhalqih',
    arabic:
      'سُبْحَانَ اللهِ وَبِحَمْدِهِ عَدَدَ خَلْقِهِ وَرِضَا نَفْسِهِ وَزِنَةَ عَرْشِهِ وَمِدَادَ كَلِمَاتِهِ',
    transliteration:
      "Subhanallahi wa bihamdihi 'adada khalqihi wa rida nafsihi wa zinata 'arshihi wa midada kalimatih",
    source: L('رواه مسلم', 'Narrated by Muslim'),
    category: 'tasbihat',
    fadl: {
      text: L(
        'قالتها جويرية رضي الله عنها — قال النبي ﷺ: لقد قلتُ بعدك أربع كلمات لو وُزنت بما قلتِ منذ اليوم لوزنتهنّ.',
        'Juwayriyah said it — the Prophet ﷺ said: I have said four words which, if weighed against all you have said today, would outweigh them.'
      ),
      source: L('رواه مسلم', 'Narrated by Muslim'),
    },
    repetitions: 3,
    occasion: L('صباحاً — ٣ مرات', 'In the morning — 3 times'),
  },
  {
    id: 'tasbih_hawqala',
    arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ',
    transliteration: 'La hawla wa la quwwata illa billah',
    source: L('متفق عليه', 'Agreed upon (Bukhari & Muslim)'),
    category: 'tasbihat',
    fadl: {
      text: L(
        'لا حول ولا قوة إلا بالله كنزٌ من كنوز الجنة.',
        'La hawla wa la quwwata illa billah is a treasure from the treasures of Paradise.'
      ),
      source: L('متفق عليه', 'Agreed upon'),
    },
    repetitions: null,
    occasion: L(
      'عند الاستجابة للمؤذن وفي أي وقت',
      'When responding to the muezzin and at any time'
    ),
  },
  {
    id: 'tasbih_la_ilaha_illallah',
    arabic:
      'لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    transliteration:
      "La ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamdu wa huwa 'ala kulli shay'in qadir",
    source: L('متفق عليه', 'Agreed upon (Bukhari & Muslim)'),
    category: 'tasbihat',
    fadl: {
      text: L(
        'من قالها في يوم مئة مرة كانت له عدل عشر رقاب، وكُتبت له مئة حسنة، ومُحيت عنه مئة سيئة، وكانت له حرزاً من الشيطان يومه ذلك حتى يُمسي.',
        'Whoever says it 100 times a day, it will be as if he freed ten slaves, one hundred good deeds will be written for him, one hundred sins erased, and he will be protected from Satan that day until evening.'
      ),
      source: L('متفق عليه', 'Agreed upon'),
    },
    repetitions: 100,
    occasion: L('١٠٠ مرة في اليوم', '100 times a day'),
  },
  {
    id: 'tasbih_hasbunallah',
    arabic: 'حَسْبُنَا اللهُ وَنِعْمَ الْوَكِيلُ',
    transliteration: "Hasbunallahu wa ni'mal-wakil",
    source: L('سورة آل عمران: ١٧٣', 'Surah Aal-Imran: 173'),
    category: 'tasbihat',
    fadl: {
      text: L(
        'قالها إبراهيم عليه السلام حين أُلقي في النار، وقالها محمد ﷺ حين قالوا: إن الناس قد جمعوا لكم.',
        'Ibrahim said it when thrown into the fire, and Muhammad ﷺ said it when told: The people have gathered against you.'
      ),
      source: L('رواه البخاري', 'Narrated by Al-Bukhari'),
    },
    repetitions: 7,
    occasion: L(
      'عند الكرب والخوف — ٧ مرات صباحاً ومساءً',
      'During distress and fear — 7 times morning and evening'
    ),
  },
  {
    id: 'dua_salat_nabi',
    arabic: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ',
    transliteration: "Allahumma salli wa sallim 'ala nabiyyina Muhammad",
    source: L('رواه مسلم وغيره', 'Narrated by Muslim and others'),
    category: 'tasbihat',
    fadl: {
      text: L(
        'من صلَّى عليَّ واحدة صلَّى الله عليه عشرًا.',
        'Whoever sends blessings upon me once, Allah will send blessings upon him ten times.'
      ),
      source: L('رواه مسلم', 'Narrated by Muslim'),
    },
    repetitions: 10,
    occasion: L(
      'في أي وقت وخاصة يوم الجمعة',
      'At any time, especially on Friday'
    ),
  },
];

/** Filter the curated list by category. Pass undefined / 'all' to get everything. */
export function getFamousDuasByCategory(
  category?: FamousDuaCategory | 'all'
): FamousDua[] {
  const list = _famousDuasOverride && _famousDuasOverride.length ? _famousDuasOverride : FAMOUS_DUAS;
  if (!category || category === 'all') return list;
  return list.filter((d) => d.category === category);
}

// ===================================================
// C3: Firestore override hydration
// Admin panel may populate `famousDuas` collection.
// Falls back to bundled FAMOUS_DUAS when collection is empty/unreachable.
// ===================================================

import AsyncStorageFD from '@react-native-async-storage/async-storage';

const FAMOUS_DUAS_CACHE_KEY = '@famous_duas_firestore_cache';
const FAMOUS_DUAS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
let _famousDuasOverride: FamousDua[] | null = null;

interface FamousCacheEnv {
  ts: number;
  data: FamousDua[];
}

export async function hydrateFamousDuasFromFirestore(): Promise<void> {
  try {
    const cached = await AsyncStorageFD.getItem(FAMOUS_DUAS_CACHE_KEY);
    if (cached) {
      try {
        const env = JSON.parse(cached) as FamousCacheEnv;
        if (env?.data?.length) {
          _famousDuasOverride = env.data;
          if (Date.now() - env.ts < FAMOUS_DUAS_CACHE_TTL_MS) return;
        }
      } catch { /* corrupted */ }
    }
  } catch { /* AsyncStorage unavailable */ }

  try {
    const { collection, getDocs } = await import('firebase/firestore');
    const firebaseModulePath = '@/config/firebase';
    const { db } = await import(/* @vite-ignore */ firebaseModulePath);
    const snap = await getDocs(collection(db, 'famousDuas'));
    if (snap.empty) return;
    const items: FamousDua[] = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as FamousDua))
      .filter(d => typeof d.arabic === 'string' && typeof d.category === 'string');
    if (!items.length) return;
    _famousDuasOverride = items;
    try {
      await AsyncStorageFD.setItem(
        FAMOUS_DUAS_CACHE_KEY,
        JSON.stringify({ ts: Date.now(), data: items } as FamousCacheEnv)
      );
    } catch { /* cache write failed */ }
  } catch (err) {
    console.warn('[famous-duas] hydrate failed, using bundled fallback:', err);
  }
}
