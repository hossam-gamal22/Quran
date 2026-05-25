// admin-panel/netlify/functions/_lib/event-messages.ts
// Default 12-language notification templates for each Islamic event.
// Wording is for "tomorrow is X" reminders — sent the evening before so the
// user wakes up ready (e.g., to fast, to prepare for Eid, to read Surah Al-Kahf
// for Friday equivalents, etc.).
//
// Admins can override these per-event via IslamicEventsManager → translations.

export type SupportedLanguage =
  | 'ar' | 'en' | 'fr' | 'de' | 'es' | 'tr'
  | 'ur' | 'id' | 'ms' | 'hi' | 'bn' | 'ru';

export type EventTranslations = {
  [key in SupportedLanguage]?: { title: string; body: string };
};

export interface EventDefaults {
  id: string;
  actionUrl: string;
  translations: EventTranslations;
}

export const DEFAULT_EVENT_MESSAGES: Record<string, EventDefaults> = {
  event_new_year: {
    id: 'event_new_year',
    actionUrl: '/hijri',
    translations: {
      ar: {
        title: 'غداً رأس السنة الهجرية 🌙',
        body: 'غداً يبدأ عام هجري جديد. اجعله بداية لطاعة جديدة، واستقبل العام بنية صادقة وعمل صالح.',
      },
      en: {
        title: 'Tomorrow: Islamic New Year 🌙',
        body: 'A new Hijri year begins tomorrow. Set a sincere intention and welcome it with worship and good deeds.',
      },
      fr: { title: 'Demain : Nouvel An hégirien 🌙', body: 'Une nouvelle année hégirienne commence demain. Accueillez-la avec une intention sincère et de bonnes œuvres.' },
      de: { title: 'Morgen: Islamisches Neujahr 🌙', body: 'Ein neues Hidschra-Jahr beginnt morgen. Empfange es mit aufrichtiger Absicht und guten Taten.' },
      es: { title: 'Mañana: Año Nuevo Islámico 🌙', body: 'Mañana comienza un nuevo año hijri. Recíbelo con intención sincera y buenas obras.' },
      tr: { title: 'Yarın: Hicri Yılbaşı 🌙', body: 'Yarın yeni bir hicri yıl başlıyor. Onu samimi bir niyet ve salih amellerle karşıla.' },
      ur: { title: 'کل: نیا ہجری سال 🌙', body: 'کل سے نیا ہجری سال شروع ہو رہا ہے۔ نیک نیت اور اچھے اعمال کے ساتھ اس کا استقبال کریں۔' },
      id: { title: 'Besok: Tahun Baru Hijriah 🌙', body: 'Besok dimulai tahun Hijriah baru. Sambut dengan niat tulus dan amal saleh.' },
      ms: { title: 'Esok: Tahun Baharu Hijrah 🌙', body: 'Esok bermulanya tahun Hijrah baharu. Sambutlah dengan niat ikhlas dan amal soleh.' },
      hi: { title: 'कल: इस्लामी नव वर्ष 🌙', body: 'कल से नया हिजरी वर्ष शुरू हो रहा है। सच्ची नीयत और नेक कामों के साथ इसका स्वागत करें।' },
      bn: { title: 'আগামীকাল: হিজরি নববর্ষ 🌙', body: 'আগামীকাল থেকে নতুন হিজরি বছর শুরু হচ্ছে। সৎ নিয়ত ও ভালো কাজ দিয়ে স্বাগত জানান।' },
      ru: { title: 'Завтра: Исламский Новый год 🌙', body: 'Завтра начинается новый год по Хиджре. Встретьте его искренним намерением и благими делами.' },
    },
  },
  event_ashura: {
    id: 'event_ashura',
    actionUrl: '/hijri',
    translations: {
      ar: {
        title: 'غداً يوم عاشوراء 🌙',
        body: 'غداً يوم عاشوراء، يوم نجى الله فيه موسى عليه السلام. يستحب صيامه — فإنه يكفّر السنة الماضية فقط (رواه مسلم). ويُستحب صيام التاسع معه.',
      },
      en: {
        title: 'Tomorrow: Day of Ashura 🌙',
        body: 'Tomorrow is Ashura — the day Allah saved Moses ﷺ. Fasting it expiates the sins of the past year only (Muslim). It is recommended to also fast the 9th with it.',
      },
      fr: { title: "Demain : Jour de Achoura 🌙", body: "Demain c'est Achoura, jour où Allah sauva Moïse ﷺ. Son jeûne expie les péchés de l'année passée seulement (Muslim). Il est recommandé de jeûner aussi le 9." },
      de: { title: 'Morgen: Aschura-Tag 🌙', body: 'Morgen ist Aschura, der Tag, an dem Allah Mose ﷺ rettete. Sein Fasten tilgt die Sünden des vergangenen Jahres (Muslim). Empfohlen ist auch der 9. mit zu fasten.' },
      es: { title: 'Mañana: Día de Ashura 🌙', body: 'Mañana es Ashura, el día en que Allah salvó a Moisés ﷺ. Su ayuno expía los pecados del año pasado (Muslim). Se recomienda ayunar también el día 9.' },
      tr: { title: 'Yarın: Aşure Günü 🌙', body: 'Yarın Aşure — Allah\'ın Musa\'yı (a.s.) kurtardığı gün. Orucu geçen yılın günahlarına kefarettir (Müslim). 9. günü de oruçlu geçirmek müstehaptır.' },
      ur: { title: 'کل: یومِ عاشورا 🌙', body: 'کل عاشورا کا دن ہے، جس دن اللہ نے موسیٰ علیہ السلام کو نجات دی۔ اس کا روزہ گزشتہ سال کے گناہوں کا کفارہ ہے (مسلم)۔ ساتھ نویں کا روزہ بھی مستحب ہے۔' },
      id: { title: 'Besok: Hari Asyura 🌙', body: 'Besok hari Asyura — hari Allah menyelamatkan Nabi Musa ﷺ. Puasanya menghapus dosa setahun yang lalu (HR Muslim). Disunnahkan juga berpuasa tanggal 9.' },
      ms: { title: 'Esok: Hari Asyura 🌙', body: 'Esok adalah Asyura — hari Allah menyelamatkan Nabi Musa ﷺ. Puasanya menghapus dosa setahun yang lalu (HR Muslim). Disunatkan juga berpuasa pada 9 Muharram.' },
      hi: { title: 'कल: आशूरा का दिन 🌙', body: 'कल आशूरा है — वह दिन जब अल्लाह ने मूसा अलैहिस्सलाम को बचाया। इसका रोज़ा पिछले साल के गुनाहों का कफ़्फ़ारा है (मुस्लिम)। 9 तारीख़ का रोज़ा भी मुस्तहब है।' },
      bn: { title: 'আগামীকাল: আশুরার দিন 🌙', body: 'আগামীকাল আশুরা — যেদিন আল্লাহ মূসা আ.-কে রক্ষা করেছিলেন। এর রোজা গত এক বছরের গুনাহের কাফফারা (মুসলিম)। ৯ তারিখও রোজা রাখা সুন্নত।' },
      ru: { title: 'Завтра: День Ашура 🌙', body: 'Завтра — Ашура, день, когда Аллах спас Мусу (а). Пост в этот день искупает грехи прошлого года (Муслим). Также желательно поститься 9-го числа.' },
    },
  },
  event_mawlid: {
    id: 'event_mawlid',
    actionUrl: '/seerah',
    translations: {
      ar: {
        title: 'غداً ذكرى المولد النبوي الشريف ﷺ',
        body: 'غداً ذكرى مولد سيد الخلق ﷺ. أكثر من الصلاة عليه: «اللهم صلِّ على محمد وعلى آل محمد».',
      },
      en: {
        title: 'Tomorrow: Birth of the Prophet ﷺ',
        body: 'Tomorrow we remember the birth of the Prophet Muhammad ﷺ. Send abundant blessings upon him.',
      },
      fr: { title: 'Demain : Naissance du Prophète ﷺ', body: 'Demain nous commémorons la naissance du Prophète Muhammad ﷺ. Multipliez les prières sur lui.' },
      de: { title: 'Morgen: Geburt des Propheten ﷺ', body: 'Morgen gedenken wir der Geburt des Propheten Muhammad ﷺ. Sende viele Segenswünsche auf ihn.' },
      es: { title: 'Mañana: Nacimiento del Profeta ﷺ', body: 'Mañana recordamos el nacimiento del Profeta Muhammad ﷺ. Envíale abundantes bendiciones.' },
      tr: { title: 'Yarın: Mevlid-i Nebi ﷺ', body: 'Yarın Peygamberimiz Muhammed ﷺ\'in doğum yıldönümü. O\'na bolca salavat getirelim.' },
      ur: { title: 'کل: میلاد النبی ﷺ', body: 'کل سرورِ کائنات محمد ﷺ کی ولادت کا دن ہے۔ ان پر کثرت سے درود بھیجیں۔' },
      id: { title: 'Besok: Maulid Nabi ﷺ', body: 'Besok kita memperingati kelahiran Nabi Muhammad ﷺ. Perbanyaklah shalawat kepada beliau.' },
      ms: { title: 'Esok: Maulidur Rasul ﷺ', body: 'Esok kita memperingati kelahiran Nabi Muhammad ﷺ. Perbanyakkan selawat ke atas baginda.' },
      hi: { title: 'कल: ईद-ए-मीलाद-उन-नबी ﷺ', body: 'कल पैगंबर मुहम्मद ﷺ के जन्म की याद है। उन पर अधिक से अधिक दरूद भेजें।' },
      bn: { title: 'আগামীকাল: মীলাদুন্নবী ﷺ', body: 'আগামীকাল মহানবী মুহাম্মাদ ﷺ-এর জন্মদিনের স্মরণ। তাঁর প্রতি বেশি বেশি দরূদ পাঠান।' },
      ru: { title: 'Завтра: Маулид Пророка ﷺ', body: 'Завтра — день рождения Пророка Мухаммада ﷺ. Просите за него благословения как можно чаще.' },
    },
  },
  event_isra_miraj: {
    id: 'event_isra_miraj',
    actionUrl: '/seerah',
    translations: {
      ar: {
        title: 'غداً ذكرى الإسراء والمعراج 🌌',
        body: 'غداً ذكرى الرحلة المباركة التي فُرضت فيها الصلوات الخمس. حافظ على صلواتك، فهي نور القلب.',
      },
      en: {
        title: 'Tomorrow: Isra & Miraj 🌌',
        body: 'Tomorrow marks the blessed night journey when the five daily prayers were ordained. Guard your prayers.',
      },
      fr: { title: 'Demain : Isra et Mi\'raj 🌌', body: 'Demain est l\'anniversaire du voyage nocturne où les cinq prières furent prescrites. Préservez vos prières.' },
      de: { title: 'Morgen: Isra und Miradsch 🌌', body: 'Morgen gedenken wir der gesegneten Nachtreise, in der die fünf Gebete vorgeschrieben wurden. Bewahre deine Gebete.' },
      es: { title: 'Mañana: Isra y Miraj 🌌', body: 'Mañana se conmemora el bendito viaje nocturno cuando se prescribieron las cinco oraciones. Cuida tus oraciones.' },
      tr: { title: 'Yarın: İsra ve Mi\'rac 🌌', body: 'Yarın beş vakit namazın farz kılındığı mübarek Mi\'rac gecesinin yıldönümü. Namazlarını koru.' },
      ur: { title: 'کل: اسرا و معراج 🌌', body: 'کل وہ مبارک شب کی یاد ہے جس میں پانچ نمازیں فرض کی گئیں۔ اپنی نمازوں کی حفاظت کریں۔' },
      id: { title: 'Besok: Isra & Mi\'raj 🌌', body: 'Besok peringatan perjalanan malam yang penuh berkah saat shalat lima waktu diwajibkan. Jagalah shalatmu.' },
      ms: { title: 'Esok: Isra & Mikraj 🌌', body: 'Esok peringatan malam yang penuh berkah ketika solat lima waktu difardukan. Jagalah solatmu.' },
      hi: { title: 'कल: इसरा और मेराज 🌌', body: 'कल वह मुबारक रात की याद है जब पांच नमाज़ें फ़र्ज़ की गई थीं। अपनी नमाज़ों की हिफ़ाज़त करें।' },
      bn: { title: 'আগামীকাল: ইসরা ও মিরাজ 🌌', body: 'আগামীকাল সেই বরকতময় রাতের স্মরণ, যেখানে পাঁচ ওয়াক্ত নামাজ ফরজ হয়েছিল। নামাজের হেফাজত করুন।' },
      ru: { title: 'Завтра: Исра и Мирадж 🌌', body: 'Завтра — годовщина благословенного ночного путешествия, когда были предписаны пять молитв. Берегите намазы.' },
    },
  },
  event_shaban_15: {
    id: 'event_shaban_15',
    actionUrl: '/daily-dua',
    translations: {
      ar: {
        title: 'غداً ليلة النصف من شعبان 🌙',
        body: 'غداً ليلة النصف من شعبان. أكثر من الاستغفار والدعاء، وتفقّد قلبك من الشحناء قبل دخول رمضان.',
      },
      en: {
        title: 'Tomorrow: Mid-Shaban Night 🌙',
        body: 'Tomorrow is the blessed 15th of Shaban. Increase istighfar and du\'a, and free your heart before Ramadan.',
      },
      fr: { title: 'Demain : Nuit du milieu de Cha\'bân 🌙', body: 'Demain est la nuit bénie du 15 Cha\'bân. Multipliez istighfâr et invocations, purifiez votre cœur avant Ramadan.' },
      de: { title: 'Morgen: Nacht zur Mitte des Schaʿbān 🌙', body: 'Morgen ist die gesegnete Nacht vom 15. Schaʿbān. Bitte viel um Vergebung und reinige dein Herz vor Ramadan.' },
      es: { title: 'Mañana: Noche de la mitad de Shaban 🌙', body: 'Mañana es la bendita noche del 15 de Shaban. Aumenta el istighfar y libera tu corazón antes de Ramadán.' },
      tr: { title: 'Yarın: Berat Kandili 🌙', body: 'Yarın mübarek Berat gecesi. İstiğfar ve duayı arttır, Ramazan öncesi kalbini temizle.' },
      ur: { title: 'کل: شبِ براءت 🌙', body: 'کل پندرہ شعبان کی مبارک رات ہے۔ زیادہ سے زیادہ استغفار اور دعا کریں، رمضان سے پہلے دل کو پاک کریں۔' },
      id: { title: 'Besok: Malam Nisfu Sya\'ban 🌙', body: 'Besok malam Nisfu Sya\'ban yang berkah. Perbanyak istighfar dan doa, bersihkan hati sebelum Ramadan.' },
      ms: { title: 'Esok: Malam Nisfu Syaaban 🌙', body: 'Esok malam Nisfu Syaaban yang berkat. Perbanyakkan istighfar dan doa, sucikan hati sebelum Ramadan.' },
      hi: { title: 'कल: शब-ए-बरात 🌙', body: 'कल 15 शाबान की मुबारक रात है। ज़्यादा से ज़्यादा इस्तिग़फ़ार और दुआ करें, रमज़ान से पहले दिल को साफ़ करें।' },
      bn: { title: 'আগামীকাল: শবে বরাত 🌙', body: 'আগামীকাল ১৫ শাবানের বরকতময় রাত। বেশি বেশি ইস্তিগফার ও দোয়া করুন, রমজানের আগে অন্তর পরিশুদ্ধ করুন।' },
      ru: { title: 'Завтра: Ночь середины Шаабана 🌙', body: 'Завтра — благословенная ночь 15 Шаабана. Увеличьте истигфар и дуа, очистите сердце перед Рамаданом.' },
    },
  },
  event_ramadan: {
    id: 'event_ramadan',
    actionUrl: '/seasonal/ramadan',
    translations: {
      ar: {
        title: 'غداً أول أيام رمضان المبارك 🌙',
        body: 'غداً يبدأ شهر القرآن والصيام. اعقد النية وحضّر قلبك. كل عام وأنت بخير.',
      },
      en: {
        title: 'Tomorrow: First day of Ramadan 🌙',
        body: 'The month of Quran and fasting begins tomorrow. Renew your intention and prepare your heart. Ramadan Mubarak.',
      },
      fr: { title: 'Demain : 1er jour de Ramadan 🌙', body: 'Le mois du Coran et du jeûne commence demain. Renouvelez votre intention. Ramadan Moubarak.' },
      de: { title: 'Morgen: Erster Tag im Ramadan 🌙', body: 'Morgen beginnt der Monat des Korans und des Fastens. Erneuere deine Absicht. Ramadan Mubarak.' },
      es: { title: 'Mañana: Primer día de Ramadán 🌙', body: 'Mañana comienza el mes del Corán y el ayuno. Renueva tu intención. Ramadán Mubarak.' },
      tr: { title: 'Yarın: Ramazan\'ın ilk günü 🌙', body: 'Yarın Kur\'an ve oruç ayı başlıyor. Niyetini tazele, kalbini hazırla. Ramazan Mübarek olsun.' },
      ur: { title: 'کل: رمضان کا پہلا دن 🌙', body: 'کل سے قرآن اور روزے کا مہینہ شروع ہو رہا ہے۔ نیت کریں اور دل کو تیار کریں۔ رمضان مبارک۔' },
      id: { title: 'Besok: Hari pertama Ramadan 🌙', body: 'Besok bulan Al-Qur\'an dan puasa dimulai. Perbarui niat dan siapkan hatimu. Ramadan Mubarak.' },
      ms: { title: 'Esok: Hari pertama Ramadan 🌙', body: 'Esok bermulanya bulan Al-Quran dan puasa. Perbaharui niat dan sediakan hatimu. Ramadan Mubarak.' },
      hi: { title: 'कल: रमज़ान का पहला दिन 🌙', body: 'कल से क़ुरआन और रोज़े का महीना शुरू हो रहा है। नीयत करें और दिल तैयार करें। रमज़ान मुबारक।' },
      bn: { title: 'আগামীকাল: রমজানের প্রথম দিন 🌙', body: 'আগামীকাল থেকে কুরআন ও সিয়ামের মাস শুরু। নিয়ত করুন ও অন্তর প্রস্তুত করুন। রমজান মোবারক।' },
      ru: { title: 'Завтра: Первый день Рамадана 🌙', body: 'Завтра начинается месяц Корана и поста. Обнови намерение и подготовь сердце. Рамадан Мубарак.' },
    },
  },
  event_badr: {
    id: 'event_badr',
    actionUrl: '/seerah',
    translations: {
      ar: {
        title: 'غداً ذكرى غزوة بدر ⚔️',
        body: 'غداً يوم الفرقان، أول نصر عظيم للإسلام في رمضان. تذكّر صبر الصحابة وتوكلهم، واغتنم بقية شهرك.',
      },
      en: {
        title: 'Tomorrow: Battle of Badr ⚔️',
        body: 'Tomorrow marks the Day of Furqan — the first great Islamic victory in Ramadan. Remember the patience of the companions.',
      },
      fr: { title: 'Demain : Bataille de Badr ⚔️', body: 'Demain est le jour du Furqân, première grande victoire de l\'islam pendant Ramadan. Rappelez-vous la patience des Compagnons.' },
      de: { title: 'Morgen: Schlacht von Badr ⚔️', body: 'Morgen ist der Tag der Unterscheidung – der erste große Sieg des Islam im Ramadan. Erinnere dich an die Geduld der Gefährten.' },
      es: { title: 'Mañana: Batalla de Badr ⚔️', body: 'Mañana es el Día del Furqan, la primera gran victoria del islam en Ramadán. Recuerda la paciencia de los compañeros.' },
      tr: { title: 'Yarın: Bedir Savaşı ⚔️', body: 'Yarın Furkan günü — Ramazan\'da İslam\'ın ilk büyük zaferi. Sahabenin sabrını ve tevekkülünü hatırla.' },
      ur: { title: 'کل: غزوۂ بدر ⚔️', body: 'کل یومِ فرقان ہے، رمضان میں اسلام کی پہلی عظیم فتح۔ صحابہ کے صبر اور توکل کو یاد رکھیں۔' },
      id: { title: 'Besok: Perang Badar ⚔️', body: 'Besok hari Furqan — kemenangan besar Islam pertama di bulan Ramadan. Ingatlah kesabaran para sahabat.' },
      ms: { title: 'Esok: Perang Badar ⚔️', body: 'Esok hari Furqan — kemenangan besar Islam yang pertama dalam Ramadan. Ingatlah kesabaran para sahabat.' },
      hi: { title: 'कल: ग़ज़वा-ए-बद्र ⚔️', body: 'कल यौम-ए-फ़ुर्क़ान है, रमज़ान में इस्लाम की पहली बड़ी फ़तह। सहाबा के सब्र को याद रखें।' },
      bn: { title: 'আগামীকাল: বদর যুদ্ধ ⚔️', body: 'আগামীকাল ইয়াওমুল ফুরকান — রমজানে ইসলামের প্রথম মহান বিজয়। সাহাবীদের ধৈর্যের কথা স্মরণ করুন।' },
      ru: { title: 'Завтра: Битва при Бадре ⚔️', body: 'Завтра — День Различения, первая великая победа ислама в Рамадане. Помните терпение сподвижников.' },
    },
  },
  event_last_ten: {
    id: 'event_last_ten',
    actionUrl: '/seasonal/ramadan',
    translations: {
      ar: {
        title: 'غداً تبدأ العشر الأواخر ✨',
        body: 'غداً تبدأ العشر الأواخر من رمضان، فيها ليلة القدر خير من ألف شهر. اشدد المئزر، وأحيِ ليلك.',
      },
      en: {
        title: 'Tomorrow: Last Ten Nights begin ✨',
        body: 'The last ten nights of Ramadan begin tomorrow — within them is Laylat al-Qadr, better than a thousand months.',
      },
      fr: { title: 'Demain : Les Dix Dernières Nuits commencent ✨', body: 'Les dix dernières nuits du Ramadan commencent demain — elles renferment Laylat al-Qadr, meilleure que mille mois.' },
      de: { title: 'Morgen: Die letzten zehn Nächte beginnen ✨', body: 'Morgen beginnen die letzten zehn Nächte des Ramadan – in ihnen ist Lailat al-Qadr, besser als tausend Monate.' },
      es: { title: 'Mañana: Comienzan las Últimas Diez Noches ✨', body: 'Mañana comienzan las últimas diez noches de Ramadán — entre ellas está Laylat al-Qadr, mejor que mil meses.' },
      tr: { title: 'Yarın: Son On Gece başlıyor ✨', body: 'Yarın Ramazan\'ın son on gecesi başlıyor — içinde Kadir Gecesi bin aydan hayırlıdır.' },
      ur: { title: 'کل: آخری عشرہ شروع ✨', body: 'کل سے رمضان کا آخری عشرہ شروع ہو رہا ہے، جس میں شبِ قدر ہزار مہینوں سے بہتر ہے۔' },
      id: { title: 'Besok: Sepuluh Malam Terakhir dimulai ✨', body: 'Besok dimulai sepuluh malam terakhir Ramadan — di dalamnya ada Lailatul Qadar yang lebih baik dari seribu bulan.' },
      ms: { title: 'Esok: Sepuluh Malam Terakhir bermula ✨', body: 'Esok bermulanya sepuluh malam terakhir Ramadan — padanya ada Lailatul Qadr lebih baik dari seribu bulan.' },
      hi: { title: 'कल: आख़िरी अशरा शुरू ✨', body: 'कल से रमज़ान का आख़िरी अशरा शुरू हो रहा है — इसमें शब-ए-क़द्र है जो हज़ार महीनों से बेहतर है।' },
      bn: { title: 'আগামীকাল: শেষ দশকের শুরু ✨', body: 'আগামীকাল রমজানের শেষ দশক শুরু — এতে রয়েছে লাইলাতুল কদর যা হাজার মাসের চেয়ে উত্তম।' },
      ru: { title: 'Завтра: Начало последних десяти ночей ✨', body: 'Завтра начинаются последние десять ночей Рамадана — среди них Ляйлят аль-Кадр, лучше тысячи месяцев.' },
    },
  },
  event_eid_fitr: {
    id: 'event_eid_fitr',
    actionUrl: '/seasonal/ramadan',
    translations: {
      ar: {
        title: 'غداً عيد الفطر المبارك 🌙✨',
        body: 'غداً يوم الجائزة بعد شهر من الصيام والقيام. تقبّل الله منا ومنكم. لا تنسَ زكاة الفطر وتكبيرات العيد.',
      },
      en: {
        title: 'Tomorrow: Eid al-Fitr 🌙✨',
        body: 'Tomorrow is the day of reward after a month of fasting. May Allah accept from us all. Don\'t forget Zakat al-Fitr and the takbeers.',
      },
      fr: { title: 'Demain : Aïd al-Fitr 🌙✨', body: 'Demain est le jour de la récompense après un mois de jeûne. Qu\'Allah accepte de nous. N\'oubliez pas Zakât al-Fitr et les takbîrs.' },
      de: { title: 'Morgen: Eid al-Fitr 🌙✨', body: 'Morgen ist der Tag der Belohnung nach einem Monat des Fastens. Möge Allah von uns annehmen. Vergiss Zakat al-Fitr und die Takbirat nicht.' },
      es: { title: 'Mañana: Eid al-Fitr 🌙✨', body: 'Mañana es el día de la recompensa tras un mes de ayuno. Que Allah acepte de nosotros. No olvides el Zakat al-Fitr ni los takbirs.' },
      tr: { title: 'Yarın: Ramazan Bayramı 🌙✨', body: 'Yarın bir aylık oruçtan sonra mükâfat günü. Allah kabul etsin. Fitre ve bayram tekbirlerini unutma.' },
      ur: { title: 'کل: عید الفطر 🌙✨', body: 'کل ایک ماہ کے روزوں کے بعد انعام کا دن ہے۔ اللہ ہم سب سے قبول فرمائے۔ فطرانہ اور تکبیرات نہ بھولیں۔' },
      id: { title: 'Besok: Idul Fitri 🌙✨', body: 'Besok hari kemenangan setelah sebulan berpuasa. Semoga Allah menerima amal kita. Jangan lupa zakat fitrah dan takbir.' },
      ms: { title: 'Esok: Aidilfitri 🌙✨', body: 'Esok hari kemenangan selepas sebulan berpuasa. Semoga Allah menerima amalan kita. Jangan lupa zakat fitrah dan takbir.' },
      hi: { title: 'कल: ईद-उल-फ़ित्र 🌙✨', body: 'कल एक महीने के रोज़ों के बाद इनाम का दिन है। अल्लाह हम सब से क़बूल फ़रमाए। ज़कात-उल-फ़ित्र और तकबीरें न भूलें।' },
      bn: { title: 'আগামীকাল: ঈদুল ফিতর 🌙✨', body: 'আগামীকাল এক মাস সিয়ামের পর প্রতিদানের দিন। আল্লাহ আমাদের কবুল করুন। যাকাতুল ফিতর ও তাকবীর ভুলবেন না।' },
      ru: { title: 'Завтра: Ид аль-Фитр 🌙✨', body: 'Завтра — день награды после месяца поста. Да примет Аллах от всех нас. Не забудьте закят аль-фитр и такбиры.' },
    },
  },
  event_tarwiyah: {
    id: 'event_tarwiyah',
    actionUrl: '/hajj-umrah',
    translations: {
      ar: {
        title: 'غداً يوم التروية 🕋',
        body: 'غداً الثامن من ذي الحجة، أول أيام مناسك الحج، يخرج فيه الحجاج إلى منى. أكثر من الذكر والاستغفار، وادعُ لإخوانك الحجاج بالقبول.',
      },
      en: {
        title: 'Tomorrow: Day of Tarwiyah 🕋',
        body: 'Tomorrow is the 8th of Dhul-Hijjah, the first day of Hajj rites when pilgrims set out to Mina. Increase in dhikr and pray for the pilgrims.',
      },
      fr: { title: 'Demain : Jour de Tarwiyah 🕋', body: 'Demain est le 8 Dhûl-Hijja, premier jour des rites du Hajj — les pèlerins se rendent à Mina. Multipliez le dhikr et invoquez pour eux.' },
      de: { title: 'Morgen: Tag der Tarwiyah 🕋', body: 'Morgen ist der 8. Dhul-Hidscha, der erste Tag der Hadsch-Riten — die Pilger ziehen nach Mina. Vermehre Dhikr und bete für sie.' },
      es: { title: 'Mañana: Día de Tarwiyah 🕋', body: 'Mañana es el 8 de Dhul-Hiyya, primer día de los ritos del Hayy — los peregrinos parten hacia Mina. Aumenta el dhikr y reza por ellos.' },
      tr: { title: 'Yarın: Terviye Günü 🕋', body: 'Yarın Zilhicce\'nin 8\'i — Hac menasikinin ilk günü, hacılar Mina\'ya çıkar. Zikri çoğalt ve onlar için dua et.' },
      ur: { title: 'کل: یومِ ترویہ 🕋', body: 'کل ذی الحجہ کی آٹھ تاریخ، مناسکِ حج کا پہلا دن ہے، حجاج منیٰ کی طرف روانہ ہوتے ہیں۔ ذکر اور استغفار بڑھائیں اور حاجیوں کے لیے دعا کریں۔' },
      id: { title: 'Besok: Hari Tarwiyah 🕋', body: 'Besok 8 Dzulhijjah, awal manasik haji — para jamaah berangkat ke Mina. Perbanyak dzikir dan doakan mereka.' },
      ms: { title: 'Esok: Hari Tarwiyah 🕋', body: 'Esok 8 Zulhijjah, hari pertama manasik haji — para jemaah berangkat ke Mina. Perbanyakkan zikir dan doakan mereka.' },
      hi: { title: 'कल: यौम-ए-तरविया 🕋', body: 'कल 8 ज़िल-हिज्जा, हज के मनासिक का पहला दिन है — हाजी मिना की ओर रवाना होते हैं। ज़िक्र बढ़ाएं और हाजियों के लिए दुआ करें।' },
      bn: { title: 'আগামীকাল: ইয়াওমুত তারবিয়া 🕋', body: 'আগামীকাল ৮ জিলহজ, হজের মানাসিকের প্রথম দিন — হাজীগণ মিনার দিকে রওয়ানা হন। জিকির বাড়ান ও হাজীদের জন্য দোয়া করুন।' },
      ru: { title: 'Завтра: День Тарвия 🕋', body: 'Завтра 8 Зуль-Хиджа — первый день обрядов хаджа, паломники отправляются в Мину. Увеличьте зикр и молитесь за них.' },
    },
  },
  event_arafah: {
    id: 'event_arafah',
    actionUrl: '/daily-dua',
    translations: {
      ar: {
        title: 'غداً يوم عرفة 🤲',
        body: 'غداً يوم عرفة، أعظم أيام السنة. صيامه يكفّر السنة الماضية والسنة القادمة (رواه مسلم)، وخير الدعاء دعاء يوم عرفة.',
      },
      en: {
        title: 'Tomorrow: Day of Arafah 🤲',
        body: 'Tomorrow is the greatest day of the year. Its fast expiates the sins of the past year and the year to come (Muslim). The best du\'a is the du\'a of Arafah.',
      },
      fr: { title: 'Demain : Jour de Arafah 🤲', body: 'Demain est le plus grand jour de l\'année. Son jeûne expie les péchés de l\'année passée et de l\'année à venir (Muslim). La meilleure invocation est celle d\'Arafah.' },
      de: { title: 'Morgen: Tag von Arafah 🤲', body: 'Morgen ist der größte Tag des Jahres. Sein Fasten tilgt die Sünden des vergangenen Jahres und des kommenden Jahres (Muslim). Das beste Bittgebet ist das von Arafah.' },
      es: { title: 'Mañana: Día de Arafah 🤲', body: 'Mañana es el día más grande del año. Su ayuno expía los pecados del año pasado y del año venidero (Muslim). La mejor súplica es la del día de Arafah.' },
      tr: { title: 'Yarın: Arefe Günü 🤲', body: 'Yarın yılın en büyük günü. Orucu, geçen yılın ve gelecek yılın günahlarına kefaret olur (Müslim). En hayırlı dua Arefe duasıdır.' },
      ur: { title: 'کل: یومِ عرفہ 🤲', body: 'کل سال کا سب سے عظیم دن ہے۔ اس کا روزہ گزشتہ سال اور آنے والے سال کے گناہوں کا کفارہ ہے (مسلم)۔ بہترین دعا یومِ عرفہ کی دعا ہے۔' },
      id: { title: 'Besok: Hari Arafah 🤲', body: 'Besok hari terbesar dalam setahun. Puasanya menghapus dosa setahun yang lalu dan setahun yang akan datang (HR Muslim). Doa terbaik adalah doa hari Arafah.' },
      ms: { title: 'Esok: Hari Arafah 🤲', body: 'Esok hari terbesar dalam setahun. Puasanya menghapus dosa setahun lalu dan setahun akan datang (HR Muslim). Sebaik-baik doa adalah doa hari Arafah.' },
      hi: { title: 'कल: यौम-ए-अरफ़ात 🤲', body: 'कल साल का सबसे महान दिन है। इसका रोज़ा पिछले साल और आने वाले साल के गुनाहों का कफ़्फ़ारा है (मुस्लिम)। बेहतरीन दुआ अरफ़ात की दुआ है।' },
      bn: { title: 'আগামীকাল: আরাফার দিন 🤲', body: 'আগামীকাল বছরের সবচেয়ে শ্রেষ্ঠ দিন। এর রোজা গত এক বছর ও আগামী এক বছরের গুনাহের কাফফারা (মুসলিম)। সর্বোত্তম দোয়া আরাফার দোয়া।' },
      ru: { title: 'Завтра: День Арафа 🤲', body: 'Завтра — величайший день года. Пост в этот день искупает грехи прошлого и будущего года (Муслим). Лучшее дуа — дуа дня Арафа.' },
    },
  },
  event_eid_adha: {
    id: 'event_eid_adha',
    actionUrl: '/hajj-umrah',
    translations: {
      ar: {
        title: 'غداً عيد الأضحى المبارك 🐑',
        body: 'غداً عيد الأضحى وذكرى تضحية إبراهيم عليه السلام. تقبّل الله منكم صالح الأعمال. كل عام وأنتم بخير.',
      },
      en: {
        title: 'Tomorrow: Eid al-Adha 🐑',
        body: 'Tomorrow is Eid al-Adha, the day of sacrifice. May Allah accept your good deeds. Eid Mubarak.',
      },
      fr: { title: 'Demain : Aïd al-Adha 🐑', body: 'Demain est l\'Aïd al-Adha, jour du sacrifice. Qu\'Allah accepte vos bonnes œuvres. Aïd Moubarak.' },
      de: { title: 'Morgen: Eid al-Adha 🐑', body: 'Morgen ist Eid al-Adha, der Tag des Opfers. Möge Allah eure guten Taten annehmen. Eid Mubarak.' },
      es: { title: 'Mañana: Eid al-Adha 🐑', body: 'Mañana es Eid al-Adha, día del sacrificio. Que Allah acepte vuestras buenas obras. Eid Mubarak.' },
      tr: { title: 'Yarın: Kurban Bayramı 🐑', body: 'Yarın Kurban Bayramı, fedakârlık günü. Allah salih amellerinizi kabul etsin. Bayramınız mübarek olsun.' },
      ur: { title: 'کل: عید الاضحی 🐑', body: 'کل عید الاضحی، قربانی کا دن ہے۔ اللہ آپ کے نیک اعمال قبول فرمائے۔ عید مبارک۔' },
      id: { title: 'Besok: Idul Adha 🐑', body: 'Besok Idul Adha, hari kurban. Semoga Allah menerima amal saleh Anda. Selamat Idul Adha.' },
      ms: { title: 'Esok: Aidiladha 🐑', body: 'Esok Aidiladha, hari korban. Semoga Allah menerima amalan soleh anda. Selamat Hari Raya Aidiladha.' },
      hi: { title: 'कल: ईद-उल-अज़हा 🐑', body: 'कल ईद-उल-अज़हा, क़ुरबानी का दिन है। अल्लाह आपके नेक आमाल क़बूल फ़रमाए। ईद मुबारक।' },
      bn: { title: 'আগামীকাল: ঈদুল আযহা 🐑', body: 'আগামীকাল ঈদুল আযহা, কুরবানির দিন। আল্লাহ আপনার নেক আমল কবুল করুন। ঈদ মোবারক।' },
      ru: { title: 'Завтра: Ид аль-Адха 🐑', body: 'Завтра — Ид аль-Адха, день жертвоприношения. Да примет Аллах ваши благие дела. Ид Мубарак.' },
    },
  },
  event_tashreeq: {
    id: 'event_tashreeq',
    actionUrl: '/hijri',
    translations: {
      ar: {
        title: 'غداً أول أيام التشريق ✨',
        body: 'غداً تبدأ أيام التشريق المباركة (11-13 ذي الحجة)، وهي أيام أكل وشرب وذكر لله. أكثر من التكبير: «الله أكبر، الله أكبر، الله أكبر، لا إله إلا الله، والله أكبر، الله أكبر، ولله الحمد».',
      },
      en: {
        title: 'Tomorrow: Days of Tashreeq begin ✨',
        body: 'The blessed Days of Tashreeq begin tomorrow (11–13 Dhul-Hijjah) — days of eating, drinking, and remembrance of Allah. Recite the takbeer often: "Allahu Akbar (×3), la ilaha illa Allah, wa Allahu Akbar (×2), wa lillahil-hamd."',
      },
      fr: { title: 'Demain : Jours de Tachrîq ✨', body: 'Les jours bénis de Tachrîq commencent demain (11-13 Dhûl-Hijja). Multipliez les takbîrs.' },
      de: { title: 'Morgen: Tage von Taschrīq ✨', body: 'Die gesegneten Taschrīq-Tage beginnen morgen (11.–13. Dhul-Hidscha). Vermehre die Takbirat.' },
      es: { title: 'Mañana: Días de Tashreeq ✨', body: 'Los benditos días de Tashreeq comienzan mañana (11-13 de Dhul-Hiyya). Multiplica los takbirs.' },
      tr: { title: 'Yarın: Teşrik günleri başlıyor ✨', body: 'Mübarek teşrik günleri yarın başlıyor (11-13 Zilhicce). Tekbirleri çoğalt.' },
      ur: { title: 'کل: ایامِ تشریق ✨', body: 'کل سے ایامِ تشریق (11-13 ذی الحجہ) شروع ہو رہے ہیں۔ تکبیرات کی کثرت کریں۔' },
      id: { title: 'Besok: Hari Tasyrik dimulai ✨', body: 'Besok dimulai hari-hari Tasyrik yang berkah (11-13 Dzulhijjah). Perbanyak takbir.' },
      ms: { title: 'Esok: Hari Tasyrik bermula ✨', body: 'Esok bermulanya hari Tasyrik yang berkat (11-13 Zulhijjah). Perbanyakkan takbir.' },
      hi: { title: 'कल: अय्याम-ए-तश्रीक़ शुरू ✨', body: 'कल से अय्याम-ए-तश्रीक़ (11-13 ज़िल-हिज्जा) शुरू हो रहे हैं। तकबीरें ज़्यादा पढ़ें।' },
      bn: { title: 'আগামীকাল: আইয়ামে তাশরীক শুরু ✨', body: 'আগামীকাল থেকে বরকতময় আইয়ামে তাশরীক শুরু (১১-১৩ জিলহজ)। তাকবীর বেশি বেশি পড়ুন।' },
      ru: { title: 'Завтра: Начало дней Ташрик ✨', body: 'Завтра начинаются благословенные дни Ташрик (11-13 Зуль-Хиджа). Увеличьте такбиры.' },
    },
  },
};

export function getDefaultMessageFor(eventId: string): EventDefaults | null {
  return DEFAULT_EVENT_MESSAGES[eventId] || null;
}

/**
 * Build a generic fallback message when the event has no translations and no
 * known default (e.g., a custom event added by the admin). Uses the event's
 * own nameAr/name. Returns translations for at least ar + en.
 */
export function buildGenericTranslations(nameAr: string, nameEn: string): EventTranslations {
  const ar = nameAr || nameEn || 'مناسبة إسلامية';
  const en = nameEn || nameAr || 'Islamic occasion';
  return {
    ar: { title: `غداً: ${ar} 🌙`, body: `غداً ${ar} — تذكّر فضل هذا اليوم وأكثر من الذكر والدعاء.` },
    en: { title: `Tomorrow: ${en} 🌙`, body: `Tomorrow is ${en}. Remember the virtue of this day with dhikr and du'a.` },
  };
}
