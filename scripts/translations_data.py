#!/usr/bin/env python3
"""
Apply translations to translations.ts.
Maps (namespace.key) -> [fr, de, es, tr, ur, id, ms, hi, bn, ru] translations.
Only replaces values identified as untranslated by the audit.
"""
import re, json, os, sys

FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'constants', 'translations.ts')
AUDIT = '/tmp/untranslated_keys.json'
LANGS = ['fr', 'de', 'es', 'tr', 'ur', 'id', 'ms', 'hi', 'bn', 'ru']

TR = {}
def t(k, fr='', de='', es='', tr_='', ur='', id_='', ms='', hi='', bn='', ru=''):
    d = {}
    if fr: d['fr'] = fr
    if de: d['de'] = de
    if es: d['es'] = es
    if tr_: d['tr'] = tr_
    if ur: d['ur'] = ur
    if id_: d['id'] = id_
    if ms: d['ms'] = ms
    if hi: d['hi'] = hi
    if bn: d['bn'] = bn
    if ru: d['ru'] = ru
    if d: TR[k] = d

# ===== aboutApp =====
t('aboutApp.adhkarAndDuas', 'Adhkar et Duas', 'Adhkar und Duas', 'Adhkar y Duas', 'Zikir ve Dualar', 'اذکار اور دعائیں', 'Dzikir & Doa', 'Zikir & Doa', 'अज़कार और दुआएँ', 'আযকার ও দোয়া', 'Азкары и дуа')
t('aboutApp.description', 'Une application islamique complète', 'Eine umfassende islamische App', 'Una aplicación islámica completa', 'Kapsamlı bir İslami uygulama', 'ایک جامع اسلامی ایپ', 'Aplikasi Islam yang lengkap', 'Aplikasi Islam yang komprehensif', 'एक व्यापक इस्लामी ऐप', 'একটি ব্যাপক ইসলামী অ্যাপ', 'Комплексное исламское приложение')
t('aboutApp.emailSubject', 'Contactez-nous - Ruh Al-Muslim', 'Kontakt - Ruh Al-Muslim', 'Contáctenos - Ruh Al-Muslim', 'Bize Ulaşın - Ruh Al-Muslim', 'ہم سے رابطہ - روح المسلم', 'Hubungi Kami - Ruh Al-Muslim', 'Hubungi Kami - Ruh Al-Muslim', 'संपर्क - रूह अल-मुस्लिम', 'যোগাযোগ - রুহ আল-মুসলিম', 'Связаться - Рух Аль-Муслим')
t('aboutApp.features', 'Fonctionnalités', 'Funktionen', 'Características', 'Özellikler', 'خصوصیات', 'Fitur', 'Ciri-ciri', 'विशेषताएँ', 'বৈশিষ্ট্য', 'Возможности')
t('aboutApp.stats', 'Statistiques', 'Statistiken', 'Estadísticas', 'İstatistikler', 'اعداد و شمار', 'Statistik', 'Statistik', 'आँकड़े', 'পরিসংখ্যান', 'Статистика')
t('aboutApp.subtitle', 'Votre compagnon spirituel', 'Ihr spiritueller Begleiter', 'Tu compañero espiritual', 'Manevi yoldaşınız', 'آپ کا روحانی ساتھی', 'Teman spiritual Anda', 'Teman rohani anda', 'आपका आध्यात्मिक साथी', 'আপনার আধ্যাত্মিক সঙ্গী', 'Ваш духовный спутник')
t('aboutApp.widgetFeature', 'Widgets', 'Widgets', 'Widgets', "Widget'lar", 'وجٹس', 'Widget', 'Widget', 'विज़ेट', 'উইজেট', 'Виджеты')

# ===== app =====
# app.name = 'Rooh Al-Muslim' — keep as-is (proper noun)

# ===== ayatUniverse =====
t('ayatUniverse.introSubtitle', 'Méditez sur la grandeur du Créateur à travers Ses versets', 'Reflektieren Sie über die Größe des Schöpfers durch Seine Verse', 'Reflexiona sobre la grandeza del Creador a través de Sus versículos', 'Yaratıcının büyüklüğünü ayetleri aracılığıyla tefekkür edin', 'خالق کی عظمت پر اُس کی آیات کے ذریعے غور کریں', 'Renungkan kebesaran Sang Pencipta melalui ayat-ayat-Nya', 'Renungi kebesaran Pencipta melalui ayat-ayat-Nya', 'उसकी आयतों के माध्यम से रचयिता की महानता पर विचार करें', 'তাঁর আয়াতের মাধ্যমে স্রষ্টার মহিমা নিয়ে চিন্তা করুন', 'Размышляйте о величии Творца через Его аяты')
t('ayatUniverse.introTitle', "Versets de l'Univers", 'Verse des Universums', 'Versículos del Universo', 'Evrenin Ayetleri', 'کائنات کی آیات', 'Ayat Alam Semesta', 'Ayat Alam Semesta', 'ब्रह्मांड की आयतें', 'বিশ্বজগতের আয়াত', 'Аяты Вселенной')
t('ayatUniverse.readInMushaf', 'Lire dans le Mushaf', 'Im Mushaf lesen', 'Leer en el Mushaf', "Mushaf'ta Oku", 'مصحف میں پڑھیں', 'Baca di Mushaf', 'Baca di Mushaf', 'मुसहफ़ में पढ़ें', 'মুসহাফে পড়ুন', 'Читать в Мусхафе')
t('ayatUniverse.themeCreation', 'Création et Innovation', 'Schöpfung und Innovation', 'Creación e Innovación', 'Yaratılış ve Yenilik', 'تخلیق اور اختراع', 'Penciptaan & Inovasi', 'Penciptaan & Inovasi', 'सृष्टि और नवाचार', 'সৃষ্টি ও উদ্ভাবন', 'Творение и Созидание')
t('ayatUniverse.themeHeavensEarth', 'Cieux et Terre', 'Himmel und Erde', 'Cielos y Tierra', 'Gökler ve Yer', 'آسمان اور زمین', 'Langit & Bumi', 'Langit & Bumi', 'आसमान और ज़मीन', 'আকাশ ও পৃথিবী', 'Небеса и Земля')
t('ayatUniverse.themeHumanCreation', "Création de l'Homme", 'Erschaffung des Menschen', 'Creación del Hombre', 'İnsanın Yaratılışı', 'انسان کی تخلیق', 'Penciptaan Manusia', 'Penciptaan Manusia', 'मानव की सृष्टि', 'মানবসৃষ্টি', 'Сотворение Человека')
t('ayatUniverse.themeNatureWater', 'Nature et Eau', 'Natur und Wasser', 'Naturaleza y Agua', 'Doğa ve Su', 'فطرت اور پانی', 'Alam & Air', 'Alam & Air', 'प्रकृति और पानी', 'প্রকৃতি ও পানি', 'Природа и Вода')
t('ayatUniverse.themePowerDominion', 'Puissance et Souveraineté', 'Macht und Herrschaft', 'Poder y Dominio', 'Güç ve Hâkimiyet', 'قوت اور حکمرانی', 'Kekuasaan & Kerajaan', 'Kuasa & Kekuasaan', 'शक्ति और प्रभुत्व', 'ক্ষমতা ও আধিপত্য', 'Власть и Владычество')
t('ayatUniverse.title', "Versets de l'Univers", 'Verse des Universums', 'Versículos del Universo', 'Evrenin Ayetleri', 'کائنات کی آیات', 'Ayat Alam Semesta', 'Ayat Alam Semesta', 'ब्रह्मांड की आयतें', 'বিশ্বজগতের আয়াত', 'Аяты Вселенной')

# ===== azkar =====
t('azkar.addCustomDhikr', 'Ajouter un dhikr personnalisé', 'Eigenen Dhikr hinzufügen', 'Añadir dhikr personalizado', 'Özel Zikir Ekle', 'اپنا ذکر شامل کریں', 'Tambah Dzikir Kustom', 'Tambah Zikir Khas', 'कस्टम ज़िक्र जोड़ें', 'কাস্টম যিকর যোগ করুন', 'Добавить свой зикр')
# alhamdulillah — Islamic term, keep as-is
t('azkar.alreadyCompleted', 'Déjà terminé', 'Bereits abgeschlossen', 'Ya completado', 'Zaten Tamamlandı', 'پہلے سے مکمل', 'Sudah Selesai', 'Sudah Selesai', 'पहले से पूर्ण', 'ইতিমধ্যে সম্পন্ন', 'Уже завершено')
t('azkar.anotherDhikr', 'Un autre dhikr', 'Noch ein Dhikr', 'Otro dhikr', 'Başka bir Zikir', 'ایک اور ذکر', 'Dzikir Lainnya', 'Zikir Lain', 'एक और ज़िक्र', 'আরেকটি যিকর', 'Ещё один зикр')
t('azkar.anotherDua', 'Une autre invocation', 'Noch ein Bittgebet', 'Otra súplica', 'Başka bir Dua', 'ایک اور دعا', 'Doa Lainnya', 'Doa Lain', 'एक और दुआ', 'আরেকটি দোয়া', 'Ещё одна дуа')
t('azkar.arabicTextRequired', 'Texte arabe requis', 'Arabischer Text erforderlich', 'Texto árabe requerido', 'Arapça metin gerekli', 'عربی متن ضروری ہے', 'Teks Arab diperlukan', 'Teks Arab diperlukan', 'अरबी पाठ आवश्यक', 'আরবি টেক্সট প্রয়োজন', 'Требуется арабский текст')
t('azkar.audio', 'Audio', 'Audio', 'Audio', 'Ses', 'آڈیو', 'Audio', 'Audio', 'ऑडियो', 'অডিও', 'Аудио')
t('azkar.congratulations', 'Félicitations !', 'Herzlichen Glückwunsch!', '¡Felicidades!', 'Tebrikler!', 'مبارک ہو!', 'Selamat!', 'Tahniah!', 'बधाई!', 'অভিনন্দন!', 'Поздравляем!')
t('azkar.customAdhkar', 'Adhkar personnalisés', 'Eigene Adhkar', 'Adhkar personalizados', 'Özel Zikirler', 'اپنے اذکار', 'Dzikir Kustom', 'Zikir Khas', 'कस्टम अज़कार', 'কাস্টম আযকার', 'Свои азкары')
t('azkar.dailyAzkar', 'Adhkar quotidiens', 'Tägliche Adhkar', 'Adhkar diarios', 'Günlük Zikirler', 'روزانہ اذکار', 'Dzikir Harian', 'Zikir Harian', 'दैनिक अज़कार', 'দৈনিক আযকার', 'Ежедневные азкары')
t('azkar.deleteCustomDhikr', 'Supprimer le dhikr', 'Dhikr löschen', 'Eliminar dhikr', 'Zikri Sil', 'ذکر حذف کریں', 'Hapus Dzikir', 'Padam Zikir', 'ज़िक्र हटाएँ', 'যিকর মুছুন', 'Удалить зикр')
t('azkar.deleteCustomDhikrConfirm', 'Supprimer ce dhikr ?', 'Diesen Dhikr löschen?', '¿Eliminar este dhikr?', 'Bu zikri silinsin mi?', 'یہ ذکر حذف کریں؟', 'Hapus dzikir ini?', 'Padam zikir ini?', 'यह ज़िक्र हटाएँ?', 'এই যিকর মুছবেন?', 'Удалить этот зикр?')
t('azkar.dhikrAddedSuccess', 'Dhikr ajouté', 'Dhikr hinzugefügt', 'Dhikr añadido', 'Zikir eklendi', 'ذکر شامل ہوگیا', 'Dzikir ditambahkan', 'Zikir ditambah', 'ज़िक्र जोड़ा गया', 'যিকর যোগ হয়েছে', 'Зикр добавлен')
t('azkar.dhikrChangesDaily', 'Le dhikr change chaque jour', 'Dhikr ändert sich täglich', 'El dhikr cambia cada día', 'Zikir her gün değişir', 'ذکر روزانہ بدلتا ہے', 'Dzikir berubah setiap hari', 'Zikir berubah setiap hari', 'ज़िक्र रोज़ बदलता है', 'যিকর প্রতিদিন বদলায়', 'Зикр меняется ежедневно')
t('azkar.dhikrName', 'Nom du dhikr', 'Dhikr-Name', 'Nombre del dhikr', 'Zikir Adı', 'ذکر کا نام', 'Nama Dzikir', 'Nama Zikir', 'ज़िक्र का नाम', 'যিকরের নাম', 'Название зикра')
t('azkar.dhikrNamePlaceholder', 'Entrez le nom du dhikr', 'Dhikr-Name eingeben', 'Ingrese nombre del dhikr', 'Zikir adını girin', 'ذکر کا نام درج کریں', 'Masukkan nama dzikir', 'Masukkan nama zikir', 'ज़िक्र का नाम दर्ज करें', 'যিকরের নাম লিখুন', 'Введите название зикра')
t('azkar.dhikrTextPlaceholder', 'Entrez le texte du dhikr', 'Dhikr-Text eingeben', 'Ingrese texto del dhikr', 'Zikir metnini girin', 'ذکر کا متن درج کریں', 'Masukkan teks dzikir', 'Masukkan teks zikir', 'ज़िक्र का पाठ दर्ज करें', 'যিকরের টেক্সট লিখুন', 'Введите текст зикра')
t('azkar.dhikrTextSection', 'Texte du dhikr', 'Dhikr-Text', 'Texto del dhikr', 'Zikir Metni', 'ذکر کا متن', 'Teks Dzikir', 'Teks Zikir', 'ज़िक्र का पाठ', 'যিকরের টেক্সট', 'Текст зикра')
t('azkar.dhikrVirtue', 'Vertu du dhikr', 'Dhikr-Tugend', 'Virtud del dhikr', 'Zikrin Fazileti', 'ذکر کی فضیلت', 'Keutamaan Dzikir', 'Kelebihan Zikir', 'ज़िक्र की फ़ज़ीलत', 'যিকরের ফজিলত', 'Достоинство зикра')
t('azkar.duaNumber', 'Invocation n°', 'Bittgebet Nr.', 'Súplica n.°', 'Dua No.', 'دعا نمبر', 'Doa No.', 'Doa No.', 'दुआ नं.', 'দোয়া নং', 'Дуа №')
t('azkar.duaOfDay', 'Invocation du jour', 'Bittgebet des Tages', 'Súplica del día', 'Günün Duası', 'آج کی دعا', 'Doa Hari Ini', 'Doa Hari Ini', 'आज की दुआ', 'আজকের দোয়া', 'Дуа дня')
t('azkar.enterDhikrNameAndText', 'Entrez le nom et le texte', 'Name und Text eingeben', 'Ingrese nombre y texto', 'Ad ve metin girin', 'نام اور متن درج کریں', 'Masukkan nama dan teks', 'Masukkan nama dan teks', 'नाम और पाठ दर्ज करें', 'নাম ও টেক্সট লিখুন', 'Введите название и текст')
t('azkar.enterValidNumber', 'Entrez un nombre valide', 'Gültige Zahl eingeben', 'Ingrese un número válido', 'Geçerli bir sayı girin', 'درست نمبر درج کریں', 'Masukkan angka valid', 'Masukkan nombor sah', 'मान्य संख्या दर्ज करें', 'বৈধ সংখ্যা লিখুন', 'Введите корректное число')
t('azkar.fromApp', 'Depuis Ruh Al-Muslim', 'Von Ruh Al-Muslim', 'Desde Ruh Al-Muslim', "Ruh Al-Muslim'den", 'روح المسلم سے', 'Dari Ruh Al-Muslim', 'Dari Ruh Al-Muslim', 'रूह अल-मुस्लिम से', 'রুহ আল-মুসলিম থেকে', 'Из Рух Аль-Муслим')
t('azkar.goBack', 'Retour', 'Zurück', 'Volver', 'Geri Dön', 'واپس جائیں', 'Kembali', 'Kembali', 'वापस जाएँ', 'ফিরে যান', 'Назад')
t('azkar.grid', 'Grille', 'Raster', 'Cuadrícula', 'Izgara', 'گرڈ', 'Grid', 'Grid', 'ग्रिड', 'গ্রিড', 'Сетка')
t('azkar.hideTranslation', 'Masquer la traduction', 'Übersetzung ausblenden', 'Ocultar traducción', 'Çeviriyi Gizle', 'ترجمہ چھپائیں', 'Sembunyikan Terjemahan', 'Sembunyikan Terjemahan', 'अनुवाद छिपाएँ', 'অনুবাদ লুকান', 'Скрыть перевод')
t('azkar.iconSection', 'Section icône', 'Symbol-Bereich', 'Sección de icono', 'Simge Bölümü', 'آئکن سیکشن', 'Bagian Ikon', 'Bahagian Ikon', 'आइकन अनुभाग', 'আইকন বিভাগ', 'Раздел значков')
t('azkar.list', 'Liste', 'Liste', 'Lista', 'Liste', 'فہرست', 'Daftar', 'Senarai', 'सूची', 'তালিকা', 'Список')
t('azkar.listening', 'Écoute', 'Wird gehört', 'Escuchando', 'Dinleniyor', 'سنا جا رہا ہے', 'Mendengarkan', 'Mendengar', 'सुना जा रहा', 'শোনা হচ্ছে', 'Прослушивание')
t('azkar.mayAllahAccept', "Qu'Allah accepte de nous", 'Möge Allah es von uns annehmen', 'Que Allah acepte de nosotros', 'Allah bizden kabul etsin', 'اللہ ہم سے قبول فرمائے', 'Semoga Allah menerima dari kita', 'Semoga Allah menerima', 'अल्लाह कुबूल करे', 'আল্লাহ কবুল করুন', 'Да примет Аллах от нас')
t('azkar.noDataSection', 'Aucune donnée', 'Keine Daten', 'Sin datos', 'Veri yok', 'کوئی ڈیٹا نہیں', 'Tidak ada data', 'Tiada data', 'कोई डेटा नहीं', 'কোনো ডেটা নেই', 'Нет данных')
t('azkar.noResults', 'Aucun résultat', 'Keine Ergebnisse', 'Sin resultados', 'Sonuç yok', 'کوئی نتائج نہیں', 'Tidak ada hasil', 'Tiada hasil', 'कोई परिणाम नहीं', 'কোন ফলাফল নেই', 'Нет результатов')
t('azkar.playlist', 'Liste de lecture', 'Wiedergabeliste', 'Lista de reproducción', 'Çalma Listesi', 'پلے لسٹ', 'Daftar Putar', 'Senarai Main', 'प्लेलिस्ट', 'প্লেলিস্ট', 'Плейлист')
t('azkar.protectionAdhkar', 'Adhkar de protection', 'Schutz-Adhkar', 'Adhkar de protección', 'Koruma Zikirleri', 'حفاظت کے اذکار', 'Dzikir Perlindungan', 'Zikir Perlindungan', 'सुरक्षा के अज़कार', 'সুরক্ষার আযকার', 'Защитные азкары')
t('azkar.reading', 'Lecture', 'Lesen', 'Lectura', 'Okunuyor', 'پڑھا جا رہا ہے', 'Membaca', 'Membaca', 'पढ़ा जा रहा', 'পড়া হচ্ছে', 'Чтение')
t('azkar.repeatCount', 'Répétitions', 'Wiederholungen', 'Repeticiones', 'Tekrar Sayısı', 'تکرار', 'Pengulangan', 'Ulangan', 'दोहराव', 'পুনরাবৃত্তি', 'Повторений')
t('azkar.ruqya', 'Roqya', 'Ruqya', 'Ruqya', 'Rukye', 'رقیہ', 'Ruqyah', 'Ruqyah', 'रुक़्या', 'রুকইয়াহ', 'Рукъя')
t('azkar.selectedDuas', 'Invocations sélectionnées', 'Ausgewählte Bittgebete', 'Súplicas seleccionadas', 'Seçilen Dualar', 'منتخب دعائیں', 'Doa Terpilih', 'Doa Terpilih', 'चयनित दुआएँ', 'নির্বাচিত দোয়া', 'Выбранные дуа')
t('azkar.source', 'Source', 'Quelle', 'Fuente', 'Kaynak', 'ماخذ', 'Sumber', 'Sumber', 'स्रोत', 'সূত্র', 'Источник')
t('azkar.tapForNewDua', 'Appuyez pour une nouvelle invocation', 'Für neues Bittgebet tippen', 'Toque para nueva súplica', 'Yeni dua için dokun', 'نئی دعا کے لیے دبائیں', 'Ketuk untuk doa baru', 'Ketik untuk doa baru', 'नई दुआ के लिए टैप करें', 'নতুন দোয়ার জন্য ট্যাপ করুন', 'Нажмите для новой дуа')
t('azkar.title', 'Adhkar et Invocations', 'Adhkar und Bittgebete', 'Adhkar y Súplicas', 'Zikirler ve Dualar', 'اذکار اور دعائیں', 'Dzikir & Doa', 'Zikir & Doa', 'अज़कार और दुआएँ', 'আযকার ও দোয়া', 'Азкары и Дуа')
t('azkar.translationOptional', 'Traduction (facultatif)', 'Übersetzung (optional)', 'Traducción (opcional)', 'Çeviri (isteğe bağlı)', 'ترجمہ (اختیاری)', 'Terjemahan (opsional)', 'Terjemahan (pilihan)', 'अनुवाद (वैकल्पिक)', 'অনুবাদ (ঐচ্ছিক)', 'Перевод (необязательно)')
t('azkar.transliteration', 'Translittération', 'Transliteration', 'Transliteración', 'Transliterasyon', 'لاطینی رسم الخط', 'Transliterasi', 'Transliterasi', 'लिप्यंतरण', 'প্রতিবর্ণীকরণ', 'Транслитерация')
t('azkar.willRenewOnTime', 'Se renouvellera à l\'heure', 'Wird rechtzeitig erneuert', 'Se renovará a tiempo', 'Zamanında yenilenecek', 'وقت پر تجدید ہوگا', 'Akan diperbarui tepat waktu', 'Akan diperbaharui tepat masa', 'समय पर नवीन होगा', 'সময়মত নবায়ন হবে', 'Обновится вовремя')

# ===== azkarSearch =====
t('azkarSearch.clearAll', 'Tout effacer', 'Alles löschen', 'Borrar todo', 'Tümünü Temizle', 'سب صاف کریں', 'Hapus Semua', 'Padam Semua', 'सब मिटाएँ', 'সব মুছুন', 'Очистить всё')
t('azkarSearch.hasVirtue', 'A une vertu', 'Hat Tugend', 'Tiene virtud', 'Fazileti Var', 'فضیلت ہے', 'Memiliki Keutamaan', 'Ada Kelebihan', 'फ़ज़ीलत है', 'ফজিলত আছে', 'Есть достоинство')
t('azkarSearch.noAzkarMatch', 'Aucune correspondance', 'Keine Übereinstimmung', 'Sin coincidencias', 'Eşleşen zikir yok', 'کوئی مماثل اذکار نہیں', 'Tidak ada yang cocok', 'Tiada yang sepadan', 'कोई मेल नहीं', 'কোন মিল নেই', 'Нет совпадений')
t('azkarSearch.noAzkarWithVirtue', 'Aucune invocation avec vertu', 'Keine Adhkar mit Tugend', 'Sin invocaciones con virtud', 'Faziletli zikir yok', 'فضیلت والے اذکار نہیں', 'Tidak ada keutamaan', 'Tiada kelebihan', 'फ़ज़ीलत वाले नहीं', 'ফজিলতসহ নেই', 'Нет с достоинствами')
t('azkarSearch.recentSearches', 'Recherches récentes', 'Letzte Suchen', 'Búsquedas recientes', 'Son Aramalar', 'حالیہ تلاشیں', 'Pencarian Terakhir', 'Carian Terkini', 'हाल की खोजें', 'সাম্প্রতিক অনুসন্ধান', 'Недавние запросы')
t('azkarSearch.searchTips', 'Conseils de recherche', 'Suchtipps', 'Consejos de búsqueda', 'Arama İpuçları', 'تلاش کے مشورے', 'Tips Pencarian', 'Petua Carian', 'खोज सुझाव', 'অনুসন্ধান পরামর্শ', 'Советы по поиску')
t('azkarSearch.virtueOfAzkar', 'Vertus des invocations', 'Tugenden der Adhkar', 'Virtudes de las invocaciones', 'Zikirlerin Faziletleri', 'اذکار کی فضائل', 'Keutamaan Dzikir', 'Kelebihan Zikir', 'अज़कार की फ़ज़ीलतें', 'আযকারের ফজিলত', 'Достоинства азкаров')

# ===== backup =====
t('backup.actions', 'Actions', 'Aktionen', 'Acciones', 'İşlemler', 'اقدامات', 'Tindakan', 'Tindakan', 'कार्रवाई', 'কর্ম', 'Действия')
t('backup.appSettings', 'Paramètres de l\'app', 'App-Einstellungen', 'Configuraciones de la app', 'Uygulama Ayarları', 'ایپ کی ترتیبات', 'Pengaturan Aplikasi', 'Tetapan Aplikasi', 'ऐप सेटिंग्स', 'অ্যাপ সেটিংস', 'Настройки приложения')
t('backup.backupFileName', 'Nom du fichier', 'Dateiname', 'Nombre del archivo', 'Yedek Dosya Adı', 'بیک اپ فائل نام', 'Nama File Cadangan', 'Nama Fail Sandaran', 'बैकअप फ़ाइल नाम', 'ব্যাকআপ ফাইলের নাম', 'Имя файла')
t('backup.backupUpToDate', 'Sauvegarde à jour', 'Backup ist aktuell', 'Copia de seguridad actualizada', 'Yedek güncel', 'بیک اپ تازہ ترین ہے', 'Cadangan terbaru', 'Sandaran terkini', 'बैकअप अद्यतन है', 'ব্যাকআপ আপডেট আছে', 'Резервная копия актуальна')
t('backup.clearAll', 'Tout effacer', 'Alles löschen', 'Borrar todo', 'Tümünü Temizle', 'سب صاف کریں', 'Hapus Semua', 'Padam Semua', 'सब मिटाएँ', 'সব মুছুন', 'Очистить всё')
t('backup.clearAllData', 'Effacer toutes les données', 'Alle Daten löschen', 'Borrar todos los datos', 'Tüm Verileri Sil', 'تمام ڈیٹا صاف کریں', 'Hapus Semua Data', 'Padam Semua Data', 'सब डेटा मिटाएँ', 'সব ডেটা মুছুন', 'Удалить все данные')
t('backup.clearAllDataDesc', 'Supprimer toutes les données et paramètres', 'Alle Daten und Einstellungen löschen', 'Eliminar todos los datos y configuraciones', 'Tüm verileri ve ayarları sil', 'تمام ڈیٹا اور ترتیبات حذف کریں', 'Hapus semua data dan pengaturan', 'Padam semua data dan tetapan', 'सारा डेटा और सेटिंग्स हटाएँ', 'সব ডেটা ও সেটিংস মুছুন', 'Удалить все данные и настройки')
t('backup.clearDataConfirm', 'Confirmer la suppression', 'Löschen bestätigen', 'Confirmar eliminación', 'Veri Silmeyi Onayla', 'ڈیٹا صاف کرنے کی تصدیق', 'Konfirmasi Hapus Data', 'Sahkan Padam Data', 'डेटा हटाने की पुष्टि', 'ডেটা মুছে ফেলার নিশ্চিতকরণ', 'Подтвердите удаление')
t('backup.clearDataConfirmMsg', 'Êtes-vous sûr ? Irréversible', 'Sind Sie sicher? Nicht rückgängig machbar', '¿Está seguro? No se puede deshacer', 'Emin misiniz? Bu geri alınamaz', 'کیا آپ کو یقین ہے؟ یہ واپس نہیں ہوسکتا', 'Anda yakin? Tidak dapat dibatalkan', 'Anda pasti? Tidak boleh dibuat asal', 'क्या आप सुनिश्चित हैं? पूर्ववत नहीं होगा', 'আপনি কি নিশ্চিত? এটি পূর্বাবস্থায় ফেরানো যাবে না', 'Вы уверены? Это необратимо')
t('backup.createBackup', 'Créer une sauvegarde', 'Backup erstellen', 'Crear copia de seguridad', 'Yedek Oluştur', 'بیک اپ بنائیں', 'Buat Cadangan', 'Buat Sandaran', 'बैकअप बनाएँ', 'ব্যাকআপ তৈরি করুন', 'Создать резервную копию')
t('backup.createBackupDesc', 'Sauvegarder toutes vos données', 'Alle Daten sichern', 'Guardar todos sus datos', 'Tüm verilerinizi kaydedin', 'اپنا تمام ڈیٹا محفوظ کریں', 'Simpan semua data Anda', 'Simpan semua data anda', 'अपना सारा डेटा सहेजें', 'আপনার সব ডেটা সংরক্ষণ করুন', 'Сохранить все ваши данные')
t('backup.createBackupPrompt', 'Créer une sauvegarde maintenant', 'Jetzt Backup erstellen', 'Crear copia de seguridad ahora', 'Şimdi yedek oluştur', 'ابھی بیک اپ بنائیں', 'Buat cadangan sekarang', 'Buat sandaran sekarang', 'अभी बैकअप बनाएँ', 'এখনই ব্যাকআপ তৈরি', 'Создать резервную копию сейчас')
t('backup.createdSuccess', 'Sauvegarde créée', 'Backup erfolgreich erstellt', 'Copia creada exitosamente', 'Yedek başarıyla oluşturuldu', 'بیک اپ کامیابی سے بن گیا', 'Cadangan berhasil dibuat', 'Sandaran berjaya dibuat', 'बैकअप सफलतापूर्वक बना', 'ব্যাকআপ সফলভাবে তৈরি', 'Резервная копия создана')
t('backup.dangerZone', 'Zone de danger', 'Gefahrenzone', 'Zona peligrosa', 'Tehlikeli Bölge', 'خطرناک زون', 'Zona Bahaya', 'Zon Bahaya', 'खतरनाक क्षेत्र', 'বিপদ অঞ্চল', 'Опасная зона')
t('backup.day', 'jour', 'Tag', 'día', 'gün', 'دن', 'hari', 'hari', 'दिन', 'দিন', 'день')
t('backup.errorClearing', 'Erreur de suppression', 'Fehler beim Löschen', 'Error al borrar datos', 'Veri silme hatası', 'ڈیٹا صاف کرنے میں خرابی', 'Gagal menghapus data', 'Ralat memadam data', 'डेटा हटाने में त्रुटि', 'ডেটা মুছতে ত্রুটি', 'Ошибка удаления данных')
t('backup.errorCreating', 'Erreur de création', 'Fehler beim Erstellen', 'Error al crear copia', 'Yedek oluşturma hatası', 'بیک اپ بنانے میں خرابی', 'Gagal membuat cadangan', 'Ralat membuat sandaran', 'बैकअप बनाने में त्रुटि', 'ব্যাকআপ তৈরিতে ত্রুটি', 'Ошибка создания копии')
t('backup.errorRestoring', 'Erreur de restauration', 'Fehler beim Wiederherstellen', 'Error al restaurar', 'Geri yükleme hatası', 'ڈیٹا بحال کرنے میں خرابی', 'Gagal memulihkan data', 'Ralat memulihkan data', 'डेटा बहाल करने में त्रुटि', 'ডেটা পুনরুদ্ধারে ত্রুটি', 'Ошибка восстановления')
t('backup.favoritesAndBookmarks', 'Favoris et signets', 'Favoriten und Lesezeichen', 'Favoritos y marcadores', 'Favoriler ve İşaretler', 'پسندیدہ اور بُکمارکس', 'Favorit & Bookmark', 'Kegemaran & Penanda', 'पसंदीदा और बुकमार्क', 'প্রিয় ও বুকমার্ক', 'Избранное и закладки')
t('backup.infoIncludes', 'Inclut toutes vos données', 'Enthält alle Ihre Daten', 'Incluye todos sus datos', 'Tüm verilerinizi içerir', 'آپ کا تمام ڈیٹا شامل ہے', 'Termasuk semua data Anda', 'Termasuk semua data anda', 'आपका सारा डेटा शामिल', 'আপনার সব ডেটা অন্তর্ভুক্ত', 'Включает все ваши данные')
t('backup.infoSaveCloud', 'Sauvegardez en lieu sûr', 'An sicherem Ort speichern', 'Guarde en un lugar seguro', 'Güvenli bir yere kaydedin', 'محفوظ جگہ پر رکھیں', 'Simpan di tempat aman', 'Simpan di tempat selamat', 'सुरक्षित जगह सहेजें', 'নিরাপদ স্থানে সংরক্ষণ', 'Сохраните в надёжном месте')
t('backup.infoWeekly', 'Sauvegardes hebdomadaires recommandées', 'Wöchentliche Sicherungen empfohlen', 'Se recomiendan copias semanales', 'Haftalık yedekleme önerilir', 'ہفتہ وار بیک اپ تجویز ہے', 'Cadangan mingguan disarankan', 'Sandaran mingguan disyorkan', 'साप्ताहिक बैकअप की सिफारिश', 'সাপ্তাহিক ব্যাকআপ সুপারিশ', 'Рекомендуются еженедельные копии')
t('backup.invalidBackupFile', 'Fichier de sauvegarde invalide', 'Ungültige Sicherungsdatei', 'Archivo de respaldo inválido', 'Geçersiz yedek dosyası', 'غلط بیک اپ فائل', 'File cadangan tidak valid', 'Fail sandaran tidak sah', 'अमान्य बैकअप फ़ाइल', 'অবৈধ ব্যাকআপ ফাইল', 'Недействительный файл')
t('backup.item', 'élément', 'Element', 'elemento', 'öğe', 'آئٹم', 'item', 'item', 'आइटम', 'আইটেম', 'элемент')
t('backup.khatmaUnit', 'khatma', 'Khatma', 'khatma', 'hatim', 'ختم', 'khatam', 'khatam', 'ख़त्म', 'খতম', 'хатм')
t('backup.khatmasLabel', 'Khatmas', 'Khatmas', 'Khatmas', 'Hatimler', 'ختمات', 'Khatam', 'Khatam', 'ख़त्मात', 'খতম', 'Хатмы')
t('backup.lastBackupPrefix', 'Dernière sauvegarde :', 'Letztes Backup:', 'Última copia:', 'Son yedek:', 'آخری بیک اپ:', 'Cadangan terakhir:', 'Sandaran terakhir:', 'अंतिम बैकअप:', 'শেষ ব্যাকআপ:', 'Последняя копия:')
t('backup.noBackup', 'Aucune sauvegarde', 'Kein Backup vorhanden', 'No hay copia de seguridad', 'Yedek bulunmuyor', 'کوئی بیک اپ نہیں', 'Tidak ada cadangan', 'Tiada sandaran', 'कोई बैकअप नहीं', 'কোনো ব্যাকআপ নেই', 'Нет резервной копии')
t('backup.noData', 'Aucune donnée', 'Keine Daten', 'Sin datos', 'Veri yok', 'کوئی ڈیٹا نہیں', 'Tidak ada data', 'Tiada data', 'कोई डेटा नहीं', 'কোনো ডেটা নেই', 'Нет данных')
t('backup.page', 'page', 'Seite', 'página', 'sayfa', 'صفحہ', 'halaman', 'halaman', 'पृष्ठ', 'পৃষ্ঠা', 'страница')
t('backup.quranProgress', 'Progression du Coran', 'Quran-Fortschritt', 'Progreso del Corán', 'Kur\'an İlerlemesi', 'قرآن کی پیشرفت', 'Kemajuan Quran', 'Kemajuan Quran', 'क़ुरआन प्रगति', 'কুরআনের অগ্রগতি', 'Прогресс Корана')
t('backup.restore', 'Restaurer', 'Wiederherstellen', 'Restaurar', 'Geri Yükle', 'بحال کریں', 'Pulihkan', 'Pulihkan', 'बहाल करें', 'পুনরুদ্ধার', 'Восстановить')
t('backup.restoreConfirm', 'Confirmer la restauration', 'Wiederherstellung bestätigen', 'Confirmar restauración', 'Geri Yüklemeyi Onayla', 'بحالی کی تصدیق', 'Konfirmasi Pemulihan', 'Sahkan Pemulihan', 'बहाली की पुष्टि', 'পুনরুদ্ধার নিশ্চিতকরণ', 'Подтвердить восстановление')
t('backup.restoreConfirmMsg', 'Toutes les données actuelles seront remplacées', 'Alle aktuellen Daten werden ersetzt', 'Todos los datos actuales serán reemplazados', 'Tüm mevcut veriler değiştirilecek', 'موجودہ تمام ڈیٹا بدل جائے گا', 'Semua data saat ini akan diganti', 'Semua data semasa akan diganti', 'सभी मौजूदा डेटा बदला जाएगा', 'সব বর্তমান ডেটা প্রতিস্থাপিত হবে', 'Все текущие данные будут заменены')
t('backup.restoreFromBackup', 'Restaurer depuis la sauvegarde', 'Aus Backup wiederherstellen', 'Restaurar desde respaldo', 'Yedekten Geri Yükle', 'بیک اپ سے بحال کریں', 'Pulihkan dari Cadangan', 'Pulihkan dari Sandaran', 'बैकअप से बहाल करें', 'ব্যাকআপ থেকে পুনরুদ্ধার', 'Восстановить из копии')
t('backup.restoreFromBackupDesc', 'Récupérer vos données précédentes', 'Vorherige Daten wiederherstellen', 'Recuperar sus datos anteriores', 'Önceki verilerinizi kurtarın', 'اپنا پچھلا ڈیٹا واپس لائیں', 'Pulihkan data sebelumnya', 'Pulihkan data sebelumnya', 'अपना पिछला डेटा बहाल करें', 'আপনার আগের ডেটা পুনরুদ্ধার', 'Восстановить предыдущие данные')
t('backup.restoredSuccess', 'Données restaurées', 'Daten wiederhergestellt', 'Datos restaurados', 'Veriler geri yüklendi', 'ڈیٹا کامیابی سے بحال', 'Data berhasil dipulihkan', 'Data berjaya dipulihkan', 'डेटा सफलतापूर्वक बहाल', 'ডেটা সফলভাবে পুনরুদ্ধার', 'Данные восстановлены')
t('backup.saveBackup', 'Enregistrer la sauvegarde', 'Backup speichern', 'Guardar copia', 'Yedeği Kaydet', 'بیک اپ محفوظ کریں', 'Simpan Cadangan', 'Simpan Sandaran', 'बैकअप सहेजें', 'ব্যাকআপ সংরক্ষণ', 'Сохранить копию')
t('backup.savedData', 'Données sauvegardées', 'Gespeicherte Daten', 'Datos guardados', 'Kaydedilmiş Veriler', 'محفوظ شدہ ڈیٹا', 'Data Tersimpan', 'Data Tersimpan', 'सहेजा गया डेटा', 'সংরক্ষিত ডেটা', 'Сохранённые данные')
t('backup.shareSettings', 'Partager les paramètres', 'Einstellungen teilen', 'Compartir configuraciones', 'Ayarları Paylaş', 'ترتیبات شیئر کریں', 'Bagikan Pengaturan', 'Kongsi Tetapan', 'सेटिंग्स साझा करें', 'সেটিংস শেয়ার', 'Поделиться настройками')
t('backup.shareSettingsDesc', 'Partager avec d\'autres', 'Mit anderen teilen', 'Compartir con otros', 'Başkalarıyla paylaş', 'دوسروں کے ساتھ شیئر کریں', 'Bagikan dengan orang lain', 'Kongsi dengan orang lain', 'दूसरों के साथ साझा करें', 'অন্যদের সাথে শেয়ার', 'Поделиться с другими')
t('backup.worshipDays', 'Jours d\'adoration', 'Anbetungstage', 'Días de adoración', 'İbadet Günleri', 'عبادت کے دن', 'Hari Ibadah', 'Hari Ibadat', 'इबादत के दिन', 'ইবাদতের দিন', 'Дни поклонения')

# ===== calendar =====
t('calendar.ahSuffix', 'H', 'H', 'H', 'H', 'ھ', 'H', 'H', 'हि', 'হি', 'Х')
t('calendar.ashura', '', '', '', '', '', '', '', '', '', '')  # Islamic term
t('calendar.badr', 'Bataille de Badr', 'Schlacht von Badr', 'Batalla de Badr', 'Bedir Savaşı', 'غزوہ بدر', 'Perang Badr', 'Perang Badr', 'बद्र का युद्ध', 'বদর যুদ্ধ', 'Битва при Бадре')
t('calendar.correspondsTo', 'correspond à', 'entspricht', 'corresponde a', 'karşılık gelir', 'مساوی ہے', 'sesuai dengan', 'bersamaan dengan', 'बराबर है', 'সমতুল্য', 'соответствует')
t('calendar.dateConverter', 'Convertisseur de dates', 'Datumsumrechner', 'Convertidor de fechas', 'Tarih Dönüştürücü', 'تاریخ تبدیل کریں', 'Konverter Tanggal', 'Penukar Tarikh', 'तिथि परिवर्तक', 'তারিখ রূপান্তরকারী', 'Конвертер дат')
t('calendar.daysShort', 'jours', 'Tage', 'días', 'gün', 'دن', 'hari', 'hari', 'दिन', 'দিন', 'дней')
t('calendar.eidAlAdha', "Aïd al-Adha", 'Eid al-Adha', 'Eid al-Adha', 'Kurban Bayramı', 'عید الاضحیٰ', 'Idul Adha', 'Hari Raya Haji', 'ईद अल-अज़्हा', 'ঈদুল আযহা', 'Ид аль-Адха')
t('calendar.eidAlFitr', "Aïd al-Fitr", 'Eid al-Fitr', 'Eid al-Fitr', 'Ramazan Bayramı', 'عید الفطر', 'Idul Fitri', 'Hari Raya Aidilfitri', 'ईद अल-फ़ित्र', 'ঈদুল ফিতর', 'Ид аль-Фитр')
t('calendar.gregorian', 'Grégorien', 'Gregorianisch', 'Gregoriano', 'Miladi', 'عیسوی', 'Masehi', 'Masihi', 'ग्रेगोरियन', 'গ্রেগরিয়ান', 'Григорианский')
t('calendar.hajj', 'Hajj', 'Hajj', 'Hajj', 'Hac', 'حج', 'Haji', 'Haji', 'हज', 'হজ', 'Хадж')
t('calendar.hijri', 'Hijri', 'Hijri', 'Hijri', 'Hicri', 'ہجری', 'Hijriah', 'Hijrah', 'हिजरी', 'হিজরি', 'Хиджри')
t('calendar.hijriNote', 'Les dates hijri sont approximatives', 'Hijri-Daten sind ungefähr', 'Las fechas hijri son aproximadas', 'Hicri tarihler yaklaşıktır', 'ہجری تاریخیں تخمینی ہیں', 'Tanggal Hijriah perkiraan', 'Tarikh Hijrah anggaran', 'हिजरी तिथियाँ अनुमानित', 'হিজরি তারিখ আনুমানিক', 'Даты хиджри приблизительны')
t('calendar.mawlid', 'Mawlid an-Nabi', 'Mawlid an-Nabi', 'Mawlid an-Nabi', 'Mevlid Kandili', 'میلاد النبی', 'Maulid Nabi', 'Maulidur Rasul', 'मौलिद अन-नबी', 'মাওলিদুন্নবী', 'Мавлид ан-Наби')
t('calendar.newYearDesc', 'Début de la nouvelle année islamique', 'Beginn des neuen islamischen Jahres', 'Comienzo del nuevo año islámico', 'Yeni İslami yılın başlangıcı', 'نئے اسلامی سال کا آغاز', 'Awal tahun Islam baru', 'Permulaan tahun Islam baru', 'नए इस्लामी वर्ष की शुरुआत', 'নতুন ইসলামী বছরের শুরু', 'Начало нового исламского года')
t('calendar.qadr', 'Nuit du Destin', 'Nacht der Bestimmung', 'Noche del Destino', 'Kadir Gecesi', 'شبِ قدر', 'Malam Lailatul Qadr', 'Malam Lailatul Qadr', 'शबे क़द्र', 'লাইলাতুল ক্বদর', 'Ночь Предопределения')
t('calendar.qadrPossible', 'Possible Nuit du Destin', 'Mögliche Nacht der Bestimmung', 'Posible Noche del Destino', 'Muhtemel Kadir Gecesi', 'ممکنہ شبِ قدر', 'Kemungkinan Lailatul Qadr', 'Kemungkinan Lailatul Qadr', 'संभावित शबे क़द्र', 'সম্ভাব্য লাইলাতুল ক্বদর', 'Возможная Ночь Предопределения')
t('calendar.ramadan', '', '', '', 'Ramazan', '', '', '', '', '', '')  # Keep most as-is
t('calendar.selectedDay', 'Jour sélectionné', 'Ausgewählter Tag', 'Día seleccionado', 'Seçilen Gün', 'منتخب دن', 'Hari Terpilih', 'Hari Terpilih', 'चयनित दिन', 'নির্বাচিত দিন', 'Выбранный день')
t('calendar.tarwiyah', 'Jour de Tarwiyah', 'Tag der Tarwiyah', 'Día de Tarwiyah', 'Terviye Günü', 'یوم الترویہ', 'Hari Tarwiyah', 'Hari Tarwiyah', 'तरवियह का दिन', 'তারাবিয়ার দিন', 'День Тарвия')
t('calendar.tashreeq', 'Jours de Tashreeq', 'Tage des Tashreeq', 'Días de Tashreeq', 'Teşrik Günleri', 'ایام تشریق', 'Hari Tasyriq', 'Hari Tasyrik', 'तशरीक़ के दिन', 'তাশরীকের দিন', 'Дни Ташрика')
t('calendar.upcomingEvents', 'Événements à venir', 'Bevorstehende Ereignisse', 'Eventos próximos', 'Yaklaşan Etkinlikler', 'آنے والے واقعات', 'Acara Mendatang', 'Acara Akan Datang', 'आगामी कार्यक्रम', 'আসন্ন ইভেন্ট', 'Предстоящие события')

# ===== countdown =====
t('countdown.hourLabel', 'heure', 'Stunde', 'hora', 'saat', 'گھنٹہ', 'jam', 'jam', 'घंटा', 'ঘণ্টা', 'час')
t('countdown.minuteLabel', 'minute', 'Minute', 'minuto', 'dakika', 'منٹ', 'menit', 'minit', 'मिनट', 'মিনিট', 'минута')
t('countdown.secondLabel', 'seconde', 'Sekunde', 'segundo', 'saniye', 'سیکنڈ', 'detik', 'saat', 'सेकंड', 'সেকেন্ড', 'секунда')

# ===== errorBoundary =====
t('errorBoundary.contactSupport', 'Contacter le support', 'Support kontaktieren', 'Contactar soporte', 'Destek ile İletişim', 'سپورٹ سے رابطہ', 'Hubungi Dukungan', 'Hubungi Sokongan', 'सपोर्ट से संपर्क', 'সাপোর্টে যোগাযোগ', 'Связаться с поддержкой')
t('errorBoundary.description', 'Une erreur inattendue est survenue', 'Ein unerwarteter Fehler ist aufgetreten', 'Ha ocurrido un error inesperado', 'Beklenmeyen bir hata oluştu', 'ایک غیر متوقع خرابی پیش آئی', 'Terjadi kesalahan tak terduga', 'Ralat tidak dijangka berlaku', 'एक अप्रत्याशित त्रुटि हुई', 'একটি অপ্রত্যাশিত ত্রুটি', 'Произошла непредвиденная ошибка')
t('errorBoundary.duaEase', 'Ô Allah, facilite et ne rends pas difficile', 'O Allah, mach es einfach und nicht schwer', 'Oh Allah, hazlo fácil y no difícil', 'Allah\'ım kolaylaştır zorlaştırma', 'اے اللہ آسان فرما مشکل نہ کر', 'Ya Allah, permudahkan jangan dipersulit', 'Ya Allah, permudahkan jangan persukarkan', 'या अल्लाह, आसान कर मुश्किल न कर', 'হে আল্লাহ, সহজ করুন কঠিন করবেন না', 'О Аллах, облегчи и не усложняй')
t('errorBoundary.errorDetails', 'Détails de l\'erreur', 'Fehlerdetails', 'Detalles del error', 'Hata Detayları', 'خرابی کی تفصیلات', 'Detail Kesalahan', 'Butiran Ralat', 'त्रुटि विवरण', 'ত্রুটির বিবরণ', 'Подробности ошибки')
t('errorBoundary.restartApp', 'Redémarrer l\'app', 'App neu starten', 'Reiniciar app', 'Uygulamayı Yeniden Başlat', 'ایپ دوبارہ شروع کریں', 'Mulai Ulang Aplikasi', 'Mula Semula Aplikasi', 'ऐप पुनः आरंभ करें', 'অ্যাপ রিস্টার্ট', 'Перезапустить приложение')
t('errorBoundary.title', 'Erreur survenue', 'Fehler aufgetreten', 'Error ocurrido', 'Hata Oluştu', 'خرابی پیش آئی', 'Terjadi Kesalahan', 'Ralat Berlaku', 'त्रुटि हुई', 'ত্রুটি ঘটেছে', 'Произошла ошибка')
t('errorBoundary.tryAgain', 'Réessayer', 'Erneut versuchen', 'Intentar de nuevo', 'Tekrar Dene', 'دوبارہ کوشش کریں', 'Coba Lagi', 'Cuba Lagi', 'पुनः प्रयास करें', 'আবার চেষ্টা', 'Попробовать снова')

# ===== favorites =====
t('favorites.addAzkarHint', 'Ajoutez des adhkar depuis la page adhkar', 'Adhkar von der Adhkar-Seite hinzufügen', 'Añade adhkar desde la página de adhkar', 'Zikir sayfasından zikir ekleyin', 'اذکار کے صفحے سے اذکار شامل کریں', 'Tambahkan dzikir dari halaman dzikir', 'Tambah zikir dari halaman zikir', 'अज़कार पेज से अज़कार जोड़ें', 'আযকার পৃষ্ঠা থেকে যোগ করুন', 'Добавьте азкары со страницы азкаров')
t('favorites.addBookmarkHint', 'Appui long sur un verset pour ajouter un signet', 'Lange auf einen Vers drücken', 'Mantenga presionado un versículo', 'Yer işareti için ayete uzun basın', 'بُکمارک کے لیے آیت پر دیر تک دبائیں', 'Tekan lama ayat untuk bookmark', 'Tekan lama ayat untuk penanda', 'बुकमार्क के लिए आयत पर लंबे दबाएँ', 'বুকমার্কের জন্য আয়াত দীর্ঘ চাপুন', 'Долгое нажатие на аят для закладки')
t('favorites.addNote', 'Ajouter une note', 'Notiz hinzufügen', 'Añadir nota', 'Not Ekle', 'نوٹ شامل کریں', 'Tambah Catatan', 'Tambah Nota', 'नोट जोड़ें', 'নোট যোগ করুন', 'Добавить заметку')
t('favorites.addOtherHint', 'Ajoutez d\'autres éléments', 'Weitere Elemente hinzufügen', 'Añada otros elementos', 'Diğer öğeleri favorilerden ekleyin', 'دیگر آئٹمز شامل کریں', 'Tambahkan item lainnya', 'Tambah item lain', 'अन्य आइटम जोड़ें', 'অন্যান্য আইটেম যোগ', 'Добавьте другие элементы')
t('favorites.addQuranHint', 'Ajoutez des versets du Coran', 'Verse aus dem Quran hinzufügen', 'Añade versículos del Corán', 'Kur\'an\'dan ayet ekleyin', 'قرآن سے آیات شامل کریں', 'Tambahkan ayat dari Al-Quran', 'Tambah ayat dari Al-Quran', 'क़ुरआन से आयतें जोड़ें', 'কুরআন থেকে আয়াত যোগ', 'Добавьте аяты из Корана')
t('favorites.azkar', 'Adhkar', 'Adhkar', 'Adhkar', 'Zikirler', 'اذکار', 'Dzikir', 'Zikir', 'अज़कार', 'আযকার', 'Азкары')
t('favorites.bookmarks', 'Signets', 'Lesezeichen', 'Marcadores', 'İşaretler', 'بُکمارکس', 'Bookmark', 'Penanda', 'बुकमार्क', 'বুকমার্ক', 'Закладки')
t('favorites.categoryAzkar', 'Adhkar', 'Adhkar', 'Adhkar', 'Zikirler', 'اذکار', 'Dzikir', 'Zikir', 'अज़कार', 'আযকার', 'Азкары')
t('favorites.categoryDuas', 'Invocations', 'Bittgebete', 'Súplicas', 'Dualar', 'دعائیں', 'Doa', 'Doa', 'दुआएँ', 'দোয়া', 'Дуа')
t('favorites.categoryHadiths', 'Hadiths', 'Hadithe', 'Hadices', 'Hadisler', 'احادیث', 'Hadits', 'Hadis', 'हदीस', 'হাদীস', 'Хадисы')
t('favorites.chooseDesign', 'Choisir le design', 'Design wählen', 'Elegir diseño', 'Tasarım Seç', 'ڈیزائن منتخب کریں', 'Pilih Desain', 'Pilih Reka Bentuk', 'डिज़ाइन चुनें', 'ডিজাইন বেছে নিন', 'Выбрать дизайн')
t('favorites.deleteBookmarkConfirm', 'Supprimer ce signet ?', 'Lesezeichen löschen?', '¿Eliminar este marcador?', 'Bu yer işaretini sil?', 'یہ بُکمارک حذف کریں؟', 'Hapus bookmark ini?', 'Padam penanda ini?', 'यह बुकमार्क हटाएँ?', 'এই বুকমার্ক মুছবেন?', 'Удалить эту закладку?')
t('favorites.deleteConfirm', 'Supprimer cet élément ?', 'Dieses Element löschen?', '¿Eliminar este elemento?', 'Bu öğeyi sil?', 'یہ آئٹم حذف کریں؟', 'Hapus item ini?', 'Padam item ini?', 'यह आइटम हटाएँ?', 'এই আইটেম মুছবেন?', 'Удалить этот элемент?')
t('favorites.exportFailed', 'Échec de l\'exportation', 'Export fehlgeschlagen', 'Error al exportar', 'Dışa aktarma başarısız', 'ایکسپورٹ ناکام', 'Ekspor gagal', 'Eksport gagal', 'निर्यात विफल', 'রপ্তানি ব্যর্থ', 'Ошибка экспорта')
t('favorites.exportImage', 'Exporter en image', 'Als Bild exportieren', 'Exportar como imagen', 'Resim Olarak Dışa Aktar', 'تصویر کے طور پر ایکسپورٹ', 'Ekspor Gambar', 'Eksport Gambar', 'छवि के रूप में निर्यात', 'ছবি হিসেবে রপ্তানি', 'Экспорт как изображение')
t('favorites.image', 'Image', 'Bild', 'Imagen', 'Resim', 'تصویر', 'Gambar', 'Gambar', 'छवि', 'ছবি', 'Изображение')
t('favorites.namesOfAllah', 'Noms d\'Allah', 'Namen Allahs', 'Nombres de Allah', 'Allah\'ın İsimleri', 'اللہ کے نام', 'Nama-nama Allah', 'Nama-nama Allah', 'अल्लाह के नाम', 'আল্লাহর নাম', 'Имена Аллаха')
t('favorites.noAzkarFavorites', 'Aucun adhkar sauvegardé', 'Keine gespeicherten Adhkar', 'Sin adhkar guardados', 'Kayıtlı zikir yok', 'کوئی محفوظ اذکار نہیں', 'Belum ada dzikir tersimpan', 'Tiada zikir tersimpan', 'कोई सहेजे गए अज़कार नहीं', 'কোনো সংরক্ষিত আযকার নেই', 'Нет сохранённых азкаров')
t('favorites.noBookmarks', 'Aucun signet', 'Keine Lesezeichen', 'Sin marcadores', 'Yer işareti yok', 'کوئی بُکمارکس نہیں', 'Belum ada bookmark', 'Tiada penanda', 'कोई बुकमार्क नहीं', 'কোনো বুকমার্ক নেই', 'Нет закладок')
t('favorites.noOtherFavorites', 'Aucun autre favori', 'Keine weiteren Favoriten', 'Sin otros favoritos', 'Diğer favori yok', 'کوئی دوسرے پسندیدہ نہیں', 'Belum ada favorit lain', 'Tiada kegemaran lain', 'कोई अन्य पसंदीदा नहीं', 'অন্য কোনো প্রিয় নেই', 'Нет других избранных')
t('favorites.noQuranFavorites', 'Aucun verset sauvegardé', 'Keine gespeicherten Verse', 'Sin versículos guardados', 'Kayıtlı ayet yok', 'کوئی محفوظ آیات نہیں', 'Belum ada ayat tersimpan', 'Tiada ayat tersimpan', 'कोई सहेजे गए आयतें नहीं', 'কোনো সংরক্ষিত আয়াত নেই', 'Нет сохранённых аятов')
t('favorites.note', 'Note', 'Notiz', 'Nota', 'Not', 'نوٹ', 'Catatan', 'Nota', 'नोट', 'নোট', 'Заметка')
t('favorites.notePlaceholder', 'Écrivez votre note ici...', 'Schreiben Sie hier Ihre Notiz...', 'Escriba su nota aquí...', 'Notunuzu buraya yazın...', 'اپنا نوٹ یہاں لکھیں...', 'Tulis catatan Anda di sini...', 'Tulis nota anda di sini...', 'अपना नोट यहाँ लिखें...', 'আপনার নোট এখানে লিখুন...', 'Напишите заметку здесь...')
t('favorites.other', 'Autres', 'Andere', 'Otros', 'Diğer', 'دیگر', 'Lainnya', 'Lain-lain', 'अन्य', 'অন্যান্য', 'Другое')
t('favorites.removeFromFavoritesConfirm', 'Retirer des favoris ?', 'Aus Favoriten entfernen?', '¿Quitar de favoritos?', 'Favorilerden kaldır?', 'پسندیدہ سے ہٹائیں؟', 'Hapus dari favorit?', 'Alih keluar dari kegemaran?', 'पसंदीदा से हटाएँ?', 'প্রিয় থেকে সরাবেন?', 'Убрать из избранного?')
t('favorites.repeatCount', 'Répétitions', 'Wiederholungen', 'Repeticiones', 'Tekrar Sayısı', 'تکرار', 'Pengulangan', 'Ulangan', 'दोहराव', 'পুনরাবৃত্তি', 'Повторений')
t('favorites.saveNote', 'Enregistrer la note', 'Notiz speichern', 'Guardar nota', 'Notu Kaydet', 'نوٹ محفوظ کریں', 'Simpan Catatan', 'Simpan Nota', 'नोट सहेजें', 'নোট সংরক্ষণ', 'Сохранить заметку')
t('favorites.saved', 'Enregistré', 'Gespeichert', 'Guardado', 'Kaydedildi', 'محفوظ', 'Tersimpan', 'Tersimpan', 'सहेजा गया', 'সংরক্ষিত', 'Сохранено')
t('favorites.shareText', 'Partager en texte', 'Als Text teilen', 'Compartir como texto', 'Metin Olarak Paylaş', 'متن کے طور پر شیئر', 'Bagikan Teks', 'Kongsi Teks', 'पाठ के रूप में साझा', 'টেক্সট হিসেবে শেয়ার', 'Поделиться текстом')
t('favorites.sortByDate', 'Trier par date', 'Nach Datum sortieren', 'Ordenar por fecha', 'Tarihe Göre Sırala', 'تاریخ کے مطابق', 'Urutkan Tanggal', 'Susun Tarikh', 'तिथि के अनुसार', 'তারিখ অনুযায়ী', 'По дате')
t('favorites.sortBySurah', 'Trier par sourate', 'Nach Sure sortieren', 'Ordenar por sura', 'Sureye Göre Sırala', 'سورت کے مطابق', 'Urutkan Surah', 'Susun Surah', 'सूरह के अनुसार', 'সূরা অনুযায়ী', 'По суре')
t('favorites.themeGold', 'Or', 'Gold', 'Oro', 'Altın', 'سنہری', 'Emas', 'Emas', 'सुनहरा', 'সোনালী', 'Золотой')
t('favorites.themeTeal', 'Sarcelle', 'Blaugrün', 'Verde azulado', 'Deniz Yeşili', 'فیروزی', 'Teal', 'Teal', 'टील', 'টিল', 'Бирюзовый')
t('favorites.title', 'Favoris', 'Favoriten', 'Favoritos', 'Favoriler', 'پسندیدہ', 'Favorit', 'Kegemaran', 'पसंदीदा', 'প্রিয়', 'Избранное')
t('favorites.verse', 'Verset', 'Vers', 'Versículo', 'Ayet', 'آیت', 'Ayat', 'Ayat', 'आयत', 'আয়াত', 'Аят')
t('favorites.verseFrom', 'Verset de', 'Vers aus', 'Versículo de', 'Ayet:', 'آیت:', 'Ayat dari', 'Ayat dari', 'आयत:', 'আয়াত:', 'Аят из')

# ===== hadithSifat =====
t('hadithSifat.introSubtitle', 'Réfléchissez aux attributs d\'Allah', 'Reflektieren Sie über Allahs Eigenschaften', 'Reflexione sobre los atributos de Allah', 'Allah\'ın sıfatları üzerine tefekkür edin', 'اللہ کی صفات پر غور کریں', 'Renungkan sifat-sifat Allah', 'Renungi sifat-sifat Allah', 'अल्लाह की विशेषताओं पर विचार करें', 'আল্লাহর গুণাবলী নিয়ে চিন্তা করুন', 'Размышляйте об атрибутах Аллаха')
t('hadithSifat.introTitle', 'Hadith des Attributs', 'Hadith der Eigenschaften', 'Hadiz de los Atributos', 'Sıfat Hadisleri', 'صفات کی احادیث', 'Hadits Sifat', 'Hadis Sifat', 'सिफ़ात की हदीस', 'সিফাতের হাদীস', 'Хадисы об атрибутах')
t('hadithSifat.narrator', 'Narrateur', 'Überlieferer', 'Narrador', 'Ravi', 'راوی', 'Perawi', 'Perawi', 'रावी', 'রাবী', 'Передатчик')
t('hadithSifat.shareText', 'Partager', 'Teilen', 'Compartir', 'Paylaş', 'شیئر کریں', 'Bagikan', 'Kongsi', 'साझा करें', 'শেয়ার', 'Поделиться')
t('hadithSifat.source', 'Source', 'Quelle', 'Fuente', 'Kaynak', 'ماخذ', 'Sumber', 'Sumber', 'स्रोत', 'সূত্র', 'Источник')
t('hadithSifat.title', 'Hadith des Attributs', 'Hadith der Eigenschaften', 'Hadiz de los Atributos', 'Sıfat Hadisleri', 'صفات کی احادیث', 'Hadits Sifat', 'Hadis Sifat', 'सिफ़ात की हदीस', 'সিফাতের হাদীস', 'Хадисы об атрибутах')

# ===== hajj =====
t('hajj.duaWord', 'Invocation', 'Bittgebet', 'Súplica', 'Dua', 'دعا', 'Doa', 'Doa', 'दुआ', 'দোয়া', 'Дуа')
t('hajj.duasWord', 'Invocations', 'Bittgebete', 'Súplicas', 'Dualar', 'دعائیں', 'Doa-doa', 'Doa-doa', 'दुआएँ', 'দোয়াসমূহ', 'Дуа')
t('hajj.footerDua', '', '', '', '', '', '', '', '', '', '')  # Keep transliteration as-is

# ===== hajjUmrah =====
t('hajjUmrah.arafat', 'Arafat', 'Arafat', 'Arafat', 'Arafat', 'عرفات', 'Arafah', 'Arafah', 'अरफ़ात', 'আরাফাত', 'Арафат')
t('hajjUmrah.duas', 'Invocations', 'Bittgebete', 'Súplicas', 'Dualar', 'دعائیں', 'Doa', 'Doa', 'दुआएँ', 'দোয়া', 'Дуа')
t('hajjUmrah.guide', 'Guide', 'Leitfaden', 'Guía', 'Rehber', 'رہنمائی', 'Panduan', 'Panduan', 'मार्गदर्शिका', 'গাইড', 'Руководство')
t('hajjUmrah.hady', 'Hady (Sacrifice)', 'Hady (Opfer)', 'Hady (Sacrificio)', 'Hedy (Kurban)', 'ہدی (قربانی)', 'Hadyu (Kurban)', 'Hadyu (Korban)', 'हदी (क़ुर्बानी)', 'হাদি (কুরবানী)', 'Хадй (Жертвоприношение)')
t('hajjUmrah.hajj', 'Hajj', 'Hajj', 'Hajj', 'Hac', 'حج', 'Haji', 'Haji', 'हज', 'হজ', 'Хадж')
t('hajjUmrah.hajjUmrahDuas', 'Invocations du Hajj et Omra', 'Hajj & Umra Bittgebete', 'Súplicas del Hajj y Umrah', 'Hac ve Umre Duaları', 'حج و عمرہ کی دعائیں', 'Doa Haji & Umrah', 'Doa Haji & Umrah', 'हज और उमरा की दुआएँ', 'হজ ও উমরার দোয়া', 'Дуа Хаджа и Умры')
t('hajjUmrah.ihram', 'Ihram', 'Ihram', 'Ihram', 'İhram', 'احرام', 'Ihram', 'Ihram', 'इहराम', 'ইহরাম', 'Ихрам')
t('hajjUmrah.jamarat', 'Jamarat', 'Jamarat', 'Yamarat', 'Cemarat', 'جمرات', 'Jamarat', 'Jamarat', 'जमरात', 'জামারাত', 'Джамарат')
t('hajjUmrah.mina', 'Mina', 'Mina', 'Mina', 'Mina', 'منٰی', 'Mina', 'Mina', 'मिना', 'মিনা', 'Мина')
t('hajjUmrah.muzdalifah', 'Muzdalifah', 'Muzdalifah', 'Muzdalifah', 'Müzdelife', 'مزدلفہ', 'Muzdalifah', 'Muzdalifah', 'मुज़दलिफ़ा', 'মুযদালিফা', 'Муздалифа')
t('hajjUmrah.sai', "Sa'i", "Sa'i", "Sa'i", "Sa'y", 'سعی', "Sa'i", "Sa'i", 'सई', 'সাঈ', "Са'й")
t('hajjUmrah.sunnahs', 'Sunnahs', 'Sunnahs', 'Sunnas', 'Sünnetler', 'سنتیں', 'Sunnah', 'Sunat', 'सुन्नतें', 'সুন্নত', 'Сунны')
t('hajjUmrah.tawaf', 'Tawaf', 'Tawaf', 'Tawaf', 'Tavaf', 'طواف', 'Tawaf', 'Tawaf', 'तवाफ़', 'তাওয়াফ', 'Таваф')
t('hajjUmrah.tawafIfadah', "Tawaf al-Ifadah", 'Tawaf al-Ifadah', 'Tawaf al-Ifadah', 'İfade Tavafı', 'طواف الافاضہ', 'Tawaf Ifadhah', 'Tawaf Ifadhah', 'तवाफ़ अल-इफ़ाज़ा', 'তাওয়াফুল ইফাদা', 'Таваф аль-Ифада')
t('hajjUmrah.tips', 'Conseils', 'Tipps', 'Consejos', 'İpuçları', 'نکات', 'Tips', 'Petua', 'सुझाव', 'পরামর্শ', 'Советы')
t('hajjUmrah.umrah', 'Omra', 'Umra', 'Umrah', 'Umre', 'عمرہ', 'Umrah', 'Umrah', 'उमरा', 'উমরাহ', 'Умра')

# ===== hijri =====
t('hijri.adjustDesc', 'Ajuster la date hijri', 'Hijri-Datum anpassen', 'Ajustar la fecha hijri', 'Hicri tarihi ayarlayın', 'ہجری تاریخ ایڈجسٹ کریں', 'Sesuaikan tanggal Hijriah', 'Laraskan tarikh Hijrah', 'हिजरी तिथि समायोजित करें', 'হিজরি তারিখ সমন্বয়', 'Настройте дату хиджри')
t('hijri.adjustTitle', 'Ajustement de la date hijri', 'Hijri-Datumsanpassung', 'Ajuste de fecha hijri', 'Hicri Tarih Ayarı', 'ہجری تاریخ کی ایڈجسٹمنٹ', 'Penyesuaian Tanggal Hijriah', 'Pelarasan Tarikh Hijrah', 'हिजरी तिथि समायोजन', 'হিজরি তারিখ সমন্বয়', 'Настройка даты хиджри')
t('hijri.noAdjustment', 'Pas d\'ajustement', 'Keine Anpassung', 'Sin ajuste', 'Ayarlama Yok', 'کوئی ایڈجسٹمنٹ نہیں', 'Tanpa Penyesuaian', 'Tanpa Pelarasan', 'कोई समायोजन नहीं', 'কোনো সমন্বয় নেই', 'Без корректировки')

# ===== home =====
t('home.ayatKursi', 'Ayat Al-Kursi', 'Ayat al-Kursi', 'Ayat Al-Kursi', 'Ayet\'el-Kürsi', 'آیت الکرسی', 'Ayat Kursi', 'Ayat Kursi', 'आयतुल कुर्सी', 'আয়াতুল কুরসি', 'Аят аль-Курси')
t('home.azkarSection', 'Adhkar', 'Adhkar', 'Adhkar', 'Zikirler', 'اذکار', 'Dzikir', 'Zikir', 'अज़कार', 'আযকার', 'Азкары')
t('home.bgNature', 'Nature', 'Natur', 'Naturaleza', 'Doğa', 'فطرت', 'Alam', 'Alam', 'प्रकृति', 'প্রকৃতি', 'Природа')
t('home.greeting', '', '', '', '', '', '', '', '', '', '')  # Islamic greeting, keep
t('home.highlights', 'Points forts', 'Highlights', 'Destacados', 'Öne Çıkanlar', 'نمایاں', 'Sorotan', 'Sorotan', 'हाइलाइट्स', 'হাইলাইটস', 'Избранное')
t('home.istighfar', '', '', '', '', '', '', '', '', '', '')  # Islamic term
t('home.minuteLabel', 'minute', 'Minute', 'minuto', 'dakika', 'منٹ', 'menit', 'minit', 'मिनट', 'মিনিট', 'минута')
t('home.qibla', '', '', '', 'Kıble', 'قبلہ', '', '', 'क़िबला', 'কিবলা', 'Кибла')
t('home.salawat', '', '', '', '', '', '', '', '', '', '')  # Islamic term
t('home.surahMulk', 'Sourate Al-Mulk', 'Surah Al-Mulk', 'Sura Al-Mulk', 'Mülk Suresi', 'سورۃ الملک', 'Surah Al-Mulk', 'Surah Al-Mulk', 'सूरह अल-मुल्क', 'সূরা আল-মুলক', 'Сура Аль-Мульк')
t('home.surahYasin', 'Sourate Yassine', 'Surah Yasin', 'Sura Yasin', 'Yasin Suresi', 'سورۃ یٰسین', 'Surah Yasin', 'Surah Yasin', 'सूरह यासीन', 'সূরা ইয়াসিন', 'Сура Ясин')
t('home.tasbihSection', 'Tasbih et Istighfar', 'Tasbih und Istighfar', 'Tasbih e Istighfar', 'Tesbih ve İstiğfar', 'تسبیح و استغفار', 'Tasbih & Istighfar', 'Tasbih & Istighfar', 'तस्बीह और इस्तिग़फ़ार', 'তাসবীহ ও ইস্তিগফার', 'Тасбих и Истигфар')

# ===== honor =====
t('honor.anonymousUser', 'Utilisateur anonyme', 'Anonymer Benutzer', 'Usuario anónimo', 'Anonim Kullanıcı', 'گمنام صارف', 'Pengguna Anonim', 'Pengguna Tanpa Nama', 'अज्ञात उपयोगकर्ता', 'বেনামী ব্যবহারকারী', 'Анонимный пользователь')
t('honor.azkarPoints', 'Points d\'adhkar', 'Adhkar-Punkte', 'Puntos de adhkar', 'Zikir Puanları', 'اذکار پوائنٹس', 'Poin Dzikir', 'Mata Zikir', 'अज़कार अंक', 'আযকার পয়েন্ট', 'Баллы за азкары')
t('honor.daysRemaining', 'Jours restants', 'Verbleibende Tage', 'Días restantes', 'Kalan Günler', 'باقی دن', 'Hari Tersisa', 'Hari Berbaki', 'शेष दिन', 'বাকি দিন', 'Осталось дней')
t('honor.howItWorks', 'Comment ça marche', 'So funktioniert es', 'Cómo funciona', 'Nasıl Çalışır', 'یہ کیسے کام کرتا ہے', 'Cara Kerja', 'Cara Ia Berfungsi', 'यह कैसे काम करता है', 'কিভাবে কাজ করে', 'Как это работает')
t('honor.monthWinners', 'Gagnants du mois', 'Monatsgewinner', 'Ganadores del mes', 'Ayın Kazananları', 'مہینے کے فاتحین', 'Pemenang Bulan Ini', 'Pemenang Bulan Ini', 'महीने के विजेता', 'মাসের বিজয়ী', 'Победители месяца')
t('honor.points', 'Points', 'Punkte', 'Puntos', 'Puan', 'پوائنٹس', 'Poin', 'Mata', 'अंक', 'পয়েন্ট', 'Баллы')
t('honor.prayPoints', 'Points de prière', 'Gebetspunkte', 'Puntos de oración', 'Namaz Puanları', 'نماز پوائنٹس', 'Poin Shalat', 'Mata Solat', 'नमाज़ अंक', 'নামাজ পয়েন্ট', 'Баллы за молитвы')
t('honor.premium', 'Premium', 'Premium', 'Premium', 'Premium', 'پریمیم', 'Premium', 'Premium', 'प्रीमियम', 'প্রিমিয়াম', 'Премиум')
t('honor.readQuranPoints', 'Points de lecture du Coran', 'Quran-Lesepunkte', 'Puntos de lectura del Corán', 'Kur\'an Okuma Puanları', 'قرآن پڑھنے کے پوائنٹس', 'Poin Baca Quran', 'Mata Baca Quran', 'क़ुरआन पढ़ने के अंक', 'কুরআন পড়ার পয়েন্ট', 'Баллы за чтение Корана')
t('honor.rewardsDisabled', 'Récompenses désactivées', 'Belohnungen deaktiviert', 'Recompensas desactivadas', 'Ödüller Devre Dışı', 'انعامات غیرفعال', 'Hadiah Dinonaktifkan', 'Ganjaran Dinyahdayakan', 'पुरस्कार अक्षम', 'পুরস্কার নিষ্ক্রিয়', 'Награды отключены')
t('honor.tasbihPoints', 'Points de tasbih', 'Tasbih-Punkte', 'Puntos de tasbih', 'Tesbih Puanları', 'تسبیح پوائنٹس', 'Poin Tasbih', 'Mata Tasbih', 'तस्बीह अंक', 'তাসবীহ পয়েন্ট', 'Баллы за тасбих')
t('honor.title', 'Tableau d\'honneur', 'Ehrentafel', 'Cuadro de honor', 'Onur Tablosu', 'اعزازی بورڈ', 'Papan Kehormatan', 'Papan Kehormatan', 'सम्मान बोर्ड', 'সম্মান বোর্ড', 'Доска почёта')
t('honor.yourMonthlyPoints', 'Vos points mensuels', 'Ihre monatlichen Punkte', 'Sus puntos mensuales', 'Aylık Puanlarınız', 'آپ کے ماہانہ پوائنٹس', 'Poin Bulanan Anda', 'Mata Bulanan Anda', 'आपके मासिक अंक', 'আপনার মাসিক পয়েন্ট', 'Ваши ежемесячные баллы')

# Script continues in part 2...
# Part 2 will be appended to this file

print(f"Loaded {len(TR)} translation entries (Part 1)")
