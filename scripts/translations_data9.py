#!/usr/bin/env python3
"""Translation data Part 9: Final batch - all remaining 157 missing entries"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from translations_data import TR, t

# ===== app =====
t('app.name', '', '', '', '', '', '', '', '', '', '')  # Brand name stays

# ===== azkar =====
t('azkar.alhamdulillah', '', '', '', '', '', '', '', '', '', '')  # Islamic term

# ===== calendar =====
t('calendar.ashura', 'Achoura', 'Aschura', 'Ashura', 'Aşure', 'عاشورہ', 'Asyura', 'Asyura', 'आशूरा', 'আশুরা', 'Ашура')

# ===== hajj =====
t('hajj.footerDua', '', '', '', '', '', '', '', '', '', '')  # Arabic dua stays

# ===== home =====
t('home.greeting', 'Assalam Alaikoum', 'Assalamu Alaikum', 'Assalamu Alaikum', 'Selamun Aleyküm', 'السلام علیکم', 'Assalamu Alaikum', 'Assalamualaikum', 'अस्सलामु अलैकुम', 'আসসালামু আলাইকুম', 'Ассаляму Алейкум')
t('home.istighfar', 'Istighfar', 'Istighfar', 'Istighfar', 'İstiğfar', 'استغفار', 'Istighfar', 'Istighfar', 'इस्तिग़फ़ार', 'ইস্তিগফার', 'Истигфар')
t('home.salawat', 'Salawat', 'Salawat', 'Salawat', 'Salavat', 'درود', 'Shalawat', 'Selawat', 'दुरूद', 'দুরূদ', 'Салават')

# ===== notificationSounds =====
t('notificationSounds.abdulbasit', '', '', '', '', '', '', '', '', '', '')  # Proper name
t('notificationSounds.astaghfirullah', '', '', '', '', '', '', '', '', '', '')  # Islamic term
t('notificationSounds.subhanallahBihamdihi', '', '', '', '', '', '', '', '', '', '')  # Islamic term
t('notificationSounds.testIstighfarBody', '', '', '', '', '', '', '', '', '', '')  # Arabic dua
t('notificationSounds.testTasbihBody', '', '', '', '', '', '', '', '', '', '')  # Arabic dua

# ===== pdfExport =====
t('pdfExport.downloadReady', 'Prêt à télécharger', 'Bereit zum Herunterladen', 'Listo para descargar', 'İndirmeye Hazır', 'ڈاؤنلوڈ تیار', 'Siap Diunduh', 'Sedia Dimuat Turun', 'डाउनलोड तैयार', 'ডাউনলোড প্রস্তুত', 'Готов к загрузке')
t('pdfExport.emerald', 'Émeraude', 'Smaragd', 'Esmeralda', 'Zümrüt', 'زمرد', 'Zamrud', 'Zamrud', 'पन्ना', 'পান্না', 'Изумрудный')
t('pdfExport.emeraldDesc', 'Style vert émeraude', 'Smaragdgrüner Stil', 'Estilo verde esmeralda', 'Zümrüt yeşili stili', 'زمرد سبز طرز', 'Gaya hijau zamrud', 'Gaya hijau zamrud', 'पन्ना हरा शैली', 'পান্না সবুজ স্টাইল', 'Изумрудно-зелёный стиль')
t('pdfExport.exportPdf', 'Exporter en PDF', 'Als PDF exportieren', 'Exportar como PDF', 'PDF Olarak Dışa Aktar', 'PDF ایکسپورٹ', 'Ekspor PDF', 'Eksport PDF', 'PDF निर्यात', 'PDF এক্সপোর্ট', 'Экспорт в PDF')
t('pdfExport.orDownloadReady', 'ou prêt à télécharger', 'oder bereit zum Herunterladen', 'o listo para descargar', 'veya indirmeye hazır', 'یا ڈاؤنلوڈ تیار', 'atau siap diunduh', 'atau sedia dimuat turun', 'या डाउनलोड तैयार', 'বা ডাউনলোড প্রস্তুত', 'или готов к загрузке')
t('pdfExport.readyCopyForStyle', 'Copie prête avec style', 'Stilvoll fertiger Kopientext', 'Copia lista con estilo', 'Stilli hazır kopya', 'اسٹائل کے ساتھ تیار کاپی', 'Salinan siap dengan gaya', 'Salinan sedia dengan gaya', 'स्टाइल सहित तैयार कॉपी', 'স্টাইলসহ প্রস্তুত কপি', 'Копия со стилем готова')
t('pdfExport.royal', 'Royal', 'Royal', 'Real', 'Kraliyet', 'شاہی', 'Royal', 'Diraja', 'शाही', 'রাজকীয়', 'Королевский')
t('pdfExport.royalDesc', 'Style luxueux et royal', 'Luxuriöser und königlicher Stil', 'Estilo lujoso y real', 'Lüks ve kraliyet stili', 'شاندار اور شاہی طرز', 'Gaya mewah dan royal', 'Gaya mewah dan diraja', 'शानदार और शाही शैली', 'বিলাসবহুল ও রাজকীয় স্টাইল', 'Роскошный и королевский стиль')

# ===== photoBackgrounds =====
t('photoBackgrounds.browseBgs', 'Parcourir les arrière-plans', 'Hintergründe durchsuchen', 'Explorar fondos', 'Arka Planları Gözat', 'بیک گراؤنڈ دیکھیں', 'Jelajahi Latar', 'Layari Latar', 'पृष्ठभूमियाँ ब्राउज़ करें', 'ব্যাকগ্রাউন্ড ব্রাউজ', 'Обзор фонов')
t('photoBackgrounds.browseDownload', 'Parcourir et Télécharger', 'Durchsuchen & Herunterladen', 'Explorar y Descargar', 'Gözat ve İndir', 'دیکھیں اور ڈاؤنلوڈ', 'Jelajahi & Unduh', 'Layari & Muat Turun', 'ब्राउज़ और डाउनलोड', 'ব্রাউজ ও ডাউনলোড', 'Обзор и загрузка')
t('photoBackgrounds.dimIntensity', 'Intensité de l\'assombrissement', 'Abdunkelungsintensität', 'Intensidad del oscurecimiento', 'Karartma Yoğunluğu', 'دھندلاپن شدت', 'Intensitas Redupan', 'Keamatan Keredupan', 'मंद तीव्रता', 'ম্লান তীব্রতা', 'Интенсивность затемнения')
t('photoBackgrounds.noSavedBgs', 'Aucun arrière-plan enregistré', 'Keine gespeicherten Hintergründe', 'Sin fondos guardados', 'Kayıtlı arka plan yok', 'محفوظ بیک گراؤنڈ نہیں', 'Tidak ada latar tersimpan', 'Tiada latar disimpan', 'कोई सहेजी पृष्ठभूमि नहीं', 'কোনো সংরক্ষিত ব্যাকগ্রাউন্ড নেই', 'Нет сохранённых фонов')
t('photoBackgrounds.saveAndSet', 'Enregistrer et Appliquer', 'Speichern und Anwenden', 'Guardar y Aplicar', 'Kaydet ve Uygula', 'محفوظ اور لاگو', 'Simpan & Terapkan', 'Simpan & Tetapkan', 'सहेजें और लागू करें', 'সংরক্ষণ ও প্রয়োগ', 'Сохранить и применить')
t('photoBackgrounds.saved', 'Enregistré', 'Gespeichert', 'Guardado', 'Kaydedildi', 'محفوظ', 'Tersimpan', 'Disimpan', 'सहेजा गया', 'সংরক্ষিত', 'Сохранено')
t('photoBackgrounds.setAsBg', 'Définir comme arrière-plan', 'Als Hintergrund festlegen', 'Establecer como fondo', 'Arka Plan Yap', 'بیک گراؤنڈ بنائیں', 'Jadikan Latar', 'Tetapkan Latar', 'पृष्ठभूमि बनाएँ', 'ব্যাকগ্রাউন্ড হিসেবে সেট', 'Установить как фон')

# ===== prayer (54 remaining) =====
t('prayer.asr', 'Asr', 'Asr', 'Asr', 'İkindi', 'عصر', 'Ashar', 'Asar', 'अस्र', 'আসর', 'Аср')
t('prayer.asrMethod', 'Méthode de l\'Asr', 'Asr-Methode', 'Método del Asr', 'İkindi Metodu', 'عصر طریقہ', 'Metode Ashar', 'Kaedah Asar', 'अस्र विधि', 'আসর পদ্ধতি', 'Метод Асра')
t('prayer.asrMethodHanafi', 'Hanafi', 'Hanafi', 'Hanafí', 'Hanefi', 'حنفی', 'Hanafi', 'Hanafi', 'हनफ़ी', 'হানাফি', 'Ханафи')
t('prayer.asrMethodHanafiDesc', 'Quand l\'ombre est deux fois la longueur', 'Wenn der Schatten doppelt so lang ist', 'Cuando la sombra es el doble de la longitud', 'Gölge iki kat uzunlukta', 'جب سایہ دوگنا ہو', 'Ketika bayangan dua kali panjangnya', 'Apabila bayang dua kali panjang', 'जब छाया दोगुनी हो', 'যখন ছায়া দ্বিগুণ হয়', 'Когда тень вдвое длиннее')
t('prayer.asrMethodShafii', 'Shafiʿi', 'Schafiʿi', 'Shafiʿi', 'Şafii', 'شافعی', 'Syafi\'i', 'Syafii', 'शाफ़ई', 'শাফিঈ', 'Шафии')
t('prayer.asrMethodShafiiDesc', 'Quand l\'ombre est égale à la longueur', 'Wenn der Schatten gleich lang ist', 'Cuando la sombra es igual a la longitud', 'Gölge eşit uzunlukta', 'جب سایہ برابر ہو', 'Ketika bayangan sama panjangnya', 'Apabila bayang sama panjang', 'जब छाया बराबर हो', 'যখন ছায়া সমান হয়', 'Когда тень равна длине')
t('prayer.calculationMethodHeader', 'Méthode de calcul', 'Berechnungsmethode', 'Método de cálculo', 'Hesaplama Yöntemi', 'حساب کا طریقہ', 'Metode Perhitungan', 'Kaedah Pengiraan', 'गणना विधि', 'গণনা পদ্ধতি', 'Метод расчёта')
t('prayer.calculationMethodSection', 'Section de méthode de calcul', 'Berechnungsmethoden-Abschnitt', 'Sección de método de cálculo', 'Hesaplama Yöntemi Bölümü', 'حساب طریقہ سیکشن', 'Bagian Metode Perhitungan', 'Bahagian Kaedah Pengiraan', 'गणना विधि अनुभाग', 'গণনা পদ্ধতি বিভাগ', 'Раздел метода расчёта')
t('prayer.choose', 'Choisir', 'Wählen', 'Elegir', 'Seç', 'منتخب کریں', 'Pilih', 'Pilih', 'चुनें', 'বেছে নিন', 'Выбрать')
t('prayer.clockStyleAnalog', 'Analogique', 'Analog', 'Analógico', 'Analog', 'اینالاگ', 'Analog', 'Analog', 'एनालॉग', 'অ্যানালগ', 'Аналоговые')
t('prayer.clockStyleDigital', 'Numérique', 'Digital', 'Digital', 'Dijital', 'ڈیجیٹل', 'Digital', 'Digital', 'डिजिटल', 'ডিজিটাল', 'Цифровые')
t('prayer.clockStyleWidget', 'Widget', 'Widget', 'Widget', 'Widget', 'ویجٹ', 'Widget', 'Widget', 'विजेट', 'উইজেট', 'Виджет')
t('prayer.dhuhr', 'Dhouhr', 'Dhuhr', 'Dhuhr', 'Öğle', 'ظہر', 'Dzuhur', 'Zohor', 'ज़ुहर', 'যোহর', 'Зухр')
t('prayer.displayOptions', 'Options d\'affichage', 'Anzeigeoptionen', 'Opciones de visualización', 'Görüntüleme Seçenekleri', 'ڈسپلے آپشنز', 'Opsi Tampilan', 'Pilihan Paparan', 'प्रदर्शन विकल्प', 'প্রদর্শন বিকল্প', 'Параметры отображения')
t('prayer.duha', 'Doha', 'Duha', 'Duha', 'Kuşluk', 'ضحی', 'Dhuha', 'Dhuha', 'ज़ुहा', 'দুহা', 'Духа')
t('prayer.enableLiveActivity', 'Activer l\'activité en direct', 'Live Activity aktivieren', 'Activar actividad en vivo', 'Canlı Etkinliği Aç', 'لائیو ایکٹیویٹی فعال', 'Aktifkan Aktivitas Langsung', 'Aktifkan Aktiviti Langsung', 'लाइव एक्टिविटी सक्षम', 'লাইভ অ্যাক্টিভিটি সক্রিয়', 'Включить Live Activity')
t('prayer.extraTimes', 'Heures supplémentaires', 'Zusätzliche Zeiten', 'Horarios adicionales', 'Ek Vakitler', 'اضافی اوقات', 'Waktu Tambahan', 'Waktu Tambahan', 'अतिरिक्त समय', 'অতিরিক্ত সময়', 'Дополнительное время')
t('prayer.fajr', 'Fajr', 'Fajr', 'Fajr', 'İmsak', 'فجر', 'Subuh', 'Subuh', 'फ़ज्र', 'ফজর', 'Фаджр')
t('prayer.imsak', 'Imsak', 'Imsak', 'Imsak', 'İmsak', 'امساک', 'Imsak', 'Imsak', 'इमसाक', 'ইমসাক', 'Имсак')
t('prayer.iqama', 'Iqama', 'Iqama', 'Iqama', 'İkamet', 'اقامت', 'Iqamah', 'Iqamah', 'इक़ामत', 'ইক্বামাত', 'Икамат')
t('prayer.isha', 'Isha', 'Ischa', 'Isha', 'Yatsı', 'عشاء', 'Isya', 'Isyak', 'इशा', 'ঈশা', 'Иша')
t('prayer.lastThirdMessage', 'Vous êtes dans le dernier tiers de la nuit — un temps de prière', 'Sie befinden sich im letzten Drittel der Nacht — eine Zeit für Gebete', 'Estás en el último tercio de la noche — tiempo de oración', 'Gecenin son üçte birinde bulunuyorsunuz — dua vakti', 'آپ رات کے آخری تہائی میں ہیں — دعا کا وقت', 'Anda berada di sepertiga malam terakhir — waktu berdoa', 'Anda berada di sepertiga malam terakhir — waktu berdoa', 'आप रात के आख़िरी तिहाई में हैं — दुआ का समय', 'আপনি রাতের শেষ তৃতীয়াংশে — দোয়ার সময়', 'Вы в последней трети ночи — время для молитв')
t('prayer.liveActivities', 'Activités en direct', 'Live-Aktivitäten', 'Actividades en vivo', 'Canlı Etkinlikler', 'لائیو ایکٹیویٹیز', 'Aktivitas Langsung', 'Aktiviti Langsung', 'लाइव एक्टिविटी', 'লাইভ অ্যাক্টিভিটি', 'Live Activity')
t('prayer.liveActivityNotSupported', 'Non supporté', 'Nicht unterstützt', 'No soportado', 'Desteklenmiyor', 'تعاون نہیں', 'Tidak Didukung', 'Tidak Disokong', 'समर्थित नहीं', 'সমর্থিত নয়', 'Не поддерживается')
t('prayer.maghrib', 'Maghrib', 'Maghrib', 'Maghrib', 'Akşam', 'مغرب', 'Maghrib', 'Maghrib', 'मग़रिब', 'মাগরিব', 'Магриб')
t('prayer.methodEgyptian', 'Autorité Égyptienne', 'Ägyptische Behörde', 'Autoridad Egipcia', 'Mısır Otoritesi', 'مصری اتھارٹی', 'Otoritas Mesir', 'Pihak Berkuasa Mesir', 'मिस्री प्राधिकरण', 'মিসরীয় কর্তৃপক্ষ', 'Египетский орган')
t('prayer.methodEgyptianDesc', 'Autorité Générale Égyptienne', 'Ägyptische General-Behörde', 'Autoridad General Egipcia', 'Mısır Genel Otoritesi', 'مصری جنرل اتھارٹی', 'Otoritas Umum Mesir', 'Pihak Berkuasa Am Mesir', 'मिस्र सामान्य प्राधिकरण', 'মিসরীয় সাধারণ কর্তৃপক্ষ', 'Египетское генеральное управление')
t('prayer.methodGulf', 'Région du Golfe', 'Golf-Region', 'Región del Golfo', 'Körfez Bölgesi', 'خلیجی خطہ', 'Wilayah Teluk', 'Wilayah Teluk', 'खाड़ी क्षेत्र', 'উপসাগরীয় অঞ্চল', 'Персидский залив')
t('prayer.methodGulfDesc', 'Calcul de la région du Golfe', 'Berechnung der Golf-Region', 'Cálculo de la región del Golfo', 'Körfez bölgesi hesaplaması', 'خلیجی خطے کا حساب', 'Perhitungan wilayah Teluk', 'Pengiraan wilayah Teluk', 'खाड़ी क्षेत्र गणना', 'উপসাগরীয় অঞ্চল গণনা', 'Расчёт Персидского залива')
t('prayer.methodIsna', 'ISNA', 'ISNA', 'ISNA', 'ISNA', 'ISNA', 'ISNA', 'ISNA', 'ISNA', 'ISNA', 'ISNA')
t('prayer.methodIsnaDesc', 'Société Islamique d\'Amérique du Nord', 'Islamische Gesellschaft von Nordamerika', 'Sociedad Islámica de Norteamérica', 'Kuzey Amerika İslam Cemiyeti', 'شمالی امریکا کی اسلامی سوسائٹی', 'Lembaga Islam Amerika Utara', 'Persatuan Islam Amerika Utara', 'उत्तरी अमेरिकी इस्लामी संगठन', 'উত্তর আমেরিকার ইসলামিক সোসাইটি', 'Исламское общество Северной Америки')
t('prayer.methodKarachiDesc', 'Université des Sciences Islamiques, Karachi', 'Universität für Islamwissenschaften, Karatschi', 'Universidad de Ciencias Islámicas, Karachi', 'İslami Bilimler Üniversitesi, Karaçi', 'جامعہ العلوم الاسلامیہ، کراچی', 'Universitas Ilmu Islam, Karachi', 'Universiti Sains Islam, Karachi', 'इस्लामी विज्ञान विश्वविद्यालय, कराची', 'ইসলামিক সায়েন্স বিশ্ববিদ্যালয়, করাচি', 'Университет исламских наук, Карачи')
t('prayer.methodKuwait', 'Koweït', 'Kuwait', 'Kuwait', 'Kuveyt', 'کویت', 'Kuwait', 'Kuwait', 'कुवैत', 'কুয়েত', 'Кувейт')
t('prayer.methodKuwaitDesc', 'Calcul du Koweït', 'Kuwait-Berechnung', 'Cálculo de Kuwait', 'Kuveyt hesaplaması', 'کویت حساب', 'Perhitungan Kuwait', 'Pengiraan Kuwait', 'कुवैत गणना', 'কুয়েত গণনা', 'Расчёт Кувейта')
t('prayer.methodMalaysia', 'Malaisie', 'Malaysia', 'Malasia', 'Malezya', 'ملائیشیا', 'Malaysia', 'Malaysia', 'मलेशिया', 'মালয়েশিয়া', 'Малайзия')
t('prayer.methodMalaysiaDesc', 'Affaires Islamiques de Malaisie', 'Malaysische Islamische Angelegenheiten', 'Asuntos Islámicos de Malasia', 'Malezya İslami İşler', 'ملائیشین اسلامی امور', 'Jabatan Agama Islam Malaysia', 'Jabatan Agama Islam Malaysia', 'मलेशिया इस्लामी मामले', 'মালয়েশিয়ান ইসলামিক বিষয়ক', 'Управление по делам ислама Малайзии')
t('prayer.methodMuslimWorldLeague', 'Ligue Mondiale Musulmane', 'Muslimische Weltliga', 'Liga Mundial Musulmana', 'Müslüman Dünya Birliği', 'مسلم ورلڈ لیگ', 'Liga Muslim Dunia', 'Liga Muslim Dunia', 'मुस्लिम वर्ल्ड लीग', 'মুসলিম ওয়ার্ল্ড লীগ', 'Всемирная мусульманская лига')
t('prayer.methodMuslimWorldLeagueDesc', 'Ligue Mondiale Musulmane - La Mecque', 'Muslimische Weltliga - Mekka', 'Liga Mundial Musulmana - La Meca', 'Müslüman Dünya Birliği - Mekke', 'مسلم ورلڈ لیگ - مکہ', 'Liga Muslim Dunia - Makkah', 'Liga Muslim Dunia - Makkah', 'मुस्लिम वर्ल्ड लीग - मक्का', 'মুসলিম ওয়ার্ল্ড লীগ - মক্কা', 'Всемирная мусульманская лига - Мекка')
t('prayer.methodTurkey', 'Turquie', 'Türkei', 'Turquía', 'Türkiye', 'ترکی', 'Turki', 'Turki', 'तुर्की', 'তুরস্ক', 'Турция')
t('prayer.methodTurkeyDesc', 'Affaires Religieuses Turques', 'Türkische Religionsangelegenheiten', 'Asuntos Religiosos Turcos', 'Diyanet İşleri', 'ترک مذہبی امور', 'Urusan Agama Turki', 'Urusan Agama Turki', 'तुर्की धार्मिक मामले', 'তুর্কি ধর্মীয় বিষয়ক', 'Управление религии Турции')
t('prayer.methodUmmAlQura', 'Oum Al-Qura', 'Umm Al-Qura', 'Umm Al-Qura', 'Ümmü\'l-Kura', 'ام القری', 'Umm Al-Qura', 'Umm Al-Qura', 'उम्म अल-क़ुरा', 'উম্মুল কুরা', 'Умм аль-Кура')
t('prayer.methodUmmAlQuraDesc', 'Université Oum Al-Qura, La Mecque', 'Umm Al-Qura Universität, Mekka', 'Universidad Umm Al-Qura, La Meca', 'Ümmü\'l-Kura Üniversitesi, Mekke', 'ام القری یونیورسٹی، مکہ', 'Universitas Umm Al-Qura, Makkah', 'Universiti Umm Al-Qura, Makkah', 'उम्म अल-क़ुरा विश्वविद्यालय, मक्का', 'উম্মুল কুরা বিশ্ববিদ্যালয়, মক্কা', 'Университет Умм аль-Кура, Мекка')
t('prayer.nextPrayerLabel', 'Prochaine prière', 'Nächstes Gebet', 'Próxima oración', 'Sonraki Namaz', 'اگلی نماز', 'Shalat Berikutnya', 'Solat Seterusnya', 'अगली नमाज़', 'পরবর্তী নামাজ', 'Следующая молитва')
t('prayer.prayerSettingsTitle', 'Paramètres de prière', 'Gebetseinstellungen', 'Configuración de oración', 'Namaz Ayarları', 'نماز ترتیبات', 'Pengaturan Shalat', 'Tetapan Solat', 'नमाज़ सेटिंग्स', 'নামাজ সেটিংস', 'Настройки молитв')
t('prayer.qibla', 'Qibla', 'Qibla', 'Qibla', 'Kıble', 'قبلہ', 'Kiblat', 'Kiblat', 'क़िबला', 'কিবলা', 'Кибла')
t('prayer.remainingTimeFor', 'Temps restant pour', 'Verbleibende Zeit für', 'Tiempo restante para', 'Kalan süre:', 'باقی وقت:', 'Waktu tersisa untuk', 'Masa tinggal untuk', 'शेष समय:', 'অবশিষ্ট সময়:', 'Оставшееся время для')
t('prayer.remainingTimeForNextPrayer', 'Temps restant pour la prochaine prière', 'Verbleibende Zeit bis zum nächsten Gebet', 'Tiempo restante para la próxima oración', 'Sonraki namaza kalan süre', 'اگلی نماز تک باقی وقت', 'Waktu tersisa untuk shalat berikutnya', 'Masa tinggal untuk solat seterusnya', 'अगली नमाज़ तक शेष समय', 'পরবর্তী নামাজের অবশিষ্ট সময়', 'Оставшееся время до следующей молитвы')
t('prayer.salahPrefix', 'Salah', 'Salah', 'Salah', 'Namaz', 'صلاۃ', 'Shalat', 'Solat', 'नमाज़', 'নামাজ', 'Молитва')
t('prayer.showDate', 'Afficher la date', 'Datum anzeigen', 'Mostrar fecha', 'Tarihi Göster', 'تاریخ دکھائیں', 'Tampilkan Tanggal', 'Papar Tarikh', 'तारीख़ दिखाएँ', 'তারিখ দেখান', 'Показать дату')
t('prayer.showLocation', 'Afficher le lieu', 'Standort anzeigen', 'Mostrar ubicación', 'Konumu Göster', 'مقام دکھائیں', 'Tampilkan Lokasi', 'Papar Lokasi', 'स्थान दिखाएँ', 'অবস্থান দেখান', 'Показать местоположение')
t('prayer.showSunrise', 'Afficher le lever du soleil', 'Sonnenaufgang anzeigen', 'Mostrar amanecer', 'Gün Doğumunu Göster', 'طلوع آفتاب دکھائیں', 'Tampilkan Matahari Terbit', 'Papar Matahari Terbit', 'सूर्योदय दिखाएँ', 'সূর্যোদয় দেখান', 'Показать восход')
t('prayer.viewClock', 'Vue horloge', 'Uhr-Ansicht', 'Vista de reloj', 'Saat Görünümü', 'گھڑی منظر', 'Tampilan Jam', 'Paparan Jam', 'घड़ी दृश्य', 'ঘড়ি ভিউ', 'Вид часов')
t('prayer.viewList', 'Vue liste', 'Listenansicht', 'Vista de lista', 'Liste Görünümü', 'فہرست منظر', 'Tampilan Daftar', 'Paparan Senarai', 'सूची दृश्य', 'তালিকা ভিউ', 'Вид списка')
t('prayer.witr', 'Witr', 'Witr', 'Witr', 'Vitir', 'وتر', 'Witir', 'Witir', 'विट्र', 'বিতর', 'Витр')

# ===== prayerAdjustments =====
t('prayerAdjustments.hint', 'Ajustez les horaires de prière pour votre lieu', 'Passen Sie die Gebetszeiten an Ihren Standort an', 'Ajuste los horarios de oración para su ubicación', 'Namaz vakitlerini konumunuza göre ayarlayın', 'اپنے مقام کے لیے نماز اوقات ایڈجسٹ', 'Sesuaikan waktu shalat untuk lokasi Anda', 'Laraskan waktu solat untuk lokasi anda', 'अपने स्थान के लिए नमाज़ समय समायोजित', 'আপনার অবস্থানের জন্য নামাজের সময় সমন্বয়', 'Настройте время молитв для вашего места')
t('prayerAdjustments.minutesSuffix', 'minutes', 'Minuten', 'minutos', 'dakika', 'منٹ', 'menit', 'minit', 'मिनट', 'মিনিট', 'минут')
t('prayerAdjustments.reset', 'Réinitialiser', 'Zurücksetzen', 'Restablecer', 'Sıfırla', 'ری سیٹ', 'Reset', 'Tetapkan Semula', 'रीसेट', 'রিসেট', 'Сбросить')

# ===== qibla =====
t('qibla.aligned', 'Qibla alignée', 'Qibla ausgerichtet', 'Qibla alineada', 'Kıble Hizalandı', 'قبلہ سیدھ میں', 'Kiblat Selaras', 'Kiblat Selaras', 'क़िबला सीध में', 'কিবলা সারিবদ্ধ', 'Кибла выравнена')
t('qibla.findingDirection', 'Recherche de la direction...', 'Richtung wird gesucht...', 'Buscando dirección...', 'Yön bulunuyor...', 'سمت تلاش ہو رہی...', 'Mencari arah...', 'Mencari arah...', 'दिशा खोजी जा रही...', 'দিক খোঁজা হচ্ছে...', 'Поиск направления...')
t('qibla.internetRequired', 'Internet requis', 'Internet erforderlich', 'Internet requerido', 'İnternet Gerekli', 'انٹرنیٹ ضروری', 'Internet Diperlukan', 'Internet Diperlukan', 'इंटरनेट आवश्यक', 'ইন্টারনেট প্রয়োজন', 'Требуется интернет')
t('qibla.locationFailed', 'Échec de la localisation', 'Standort fehlgeschlagen', 'Ubicación fallida', 'Konum Başarısız', 'مقام ناکام', 'Lokasi Gagal', 'Lokasi Gagal', 'स्थान विफल', 'অবস্থান ব্যর্থ', 'Ошибка местоположения')
t('qibla.permissionRequired', 'Autorisation de localisation requise', 'Standortberechtigung erforderlich', 'Permiso de ubicación requerido', 'Konum İzni Gerekli', 'مقام کی اجازت ضروری', 'Izin Lokasi Diperlukan', 'Kebenaran Lokasi Diperlukan', 'स्थान अनुमति आवश्यक', 'অবস্থান অনুমতি প্রয়োজন', 'Требуется разрешение на местоположение')
t('qibla.sensorFailed', 'Échec du capteur', 'Sensor fehlgeschlagen', 'Sensor fallido', 'Sensör Başarısız', 'سینسر ناکام', 'Sensor Gagal', 'Sensor Gagal', 'सेंसर विफल', 'সেন্সর ব্যর্থ', 'Ошибка датчика')
t('qibla.servicesDisabled', 'Services de localisation désactivés', 'Standortdienste deaktiviert', 'Servicios de ubicación desactivados', 'Konum Servisleri Kapalı', 'مقام خدمات غیر فعال', 'Layanan Lokasi Nonaktif', 'Perkhidmatan Lokasi Dinyahaktifkan', 'स्थान सेवाएँ अक्षम', 'লোকেশন সেবা নিষ্ক্রিয়', 'Службы геолокации отключены')
t('qibla.turnLeft', 'Tournez à gauche', 'Links drehen', 'Gire a la izquierda', 'Sola Dön', 'بائیں مڑیں', 'Belok Kiri', 'Pusing Kiri', 'बाएँ मुड़ें', 'বামে ঘুরুন', 'Поверните налево')
t('qibla.turnRight', 'Tournez à droite', 'Rechts drehen', 'Gire a la derecha', 'Sağa Dön', 'دائیں مڑیں', 'Belok Kanan', 'Pusing Kanan', 'दाएँ मुड़ें', 'ডানে ঘুরুন', 'Поверните направо')

# ===== quran (27 remaining) =====
t('quran.autoTafsir', 'Tafsir automatique', 'Auto-Tafsir', 'Tafsir automático', 'Otomatik Tefsir', 'خودکار تفسیر', 'Tafsir Otomatis', 'Tafsir Automatik', 'स्वचालित तफ़सीर', 'স্বয়ংক্রিয় তাফসীর', 'Автотафсир')
t('quran.autoTafsirDesc', 'Afficher automatiquement le tafsir', 'Tafsir automatisch anzeigen', 'Mostrar tafsir automáticamente', 'Tefsiri otomatik göster', 'تفسیر خودکار دکھائیں', 'Tampilkan tafsir secara otomatis', 'Papar tafsir secara automatik', 'तफ़सीर स्वतः दिखाएँ', 'স্বয়ংক্রিয়ভাবে তাফসীর দেখান', 'Показывать тафсир автоматически')
t('quran.bookmarkGuide', 'Guide des favoris', 'Lesezeichen-Anleitung', 'Guía de marcadores', 'Yer İmi Kılavuzu', 'بک مارک گائیڈ', 'Panduan Bookmark', 'Panduan Tandabuku', 'बुकमार्क गाइड', 'বুকমার্ক গাইড', 'Руководство по закладкам')
t('quran.bookmarkHint', 'Appuyez longuement sur un verset pour le marquer', 'Lange auf einen Vers drücken zum Markieren', 'Mantenga pulsado un versículo para marcarlo', 'Yer imi için ayete uzun basın', 'بک مارک کے لیے آیت پر دیر تک دبائیں', 'Tekan lama ayat untuk menandai', 'Tekan lama ayat untuk menanda', 'बुकमार्क के लिए आयत लंबा दबाएँ', 'বুকমার্কের জন্য আয়াত দীর্ঘ চাপ দিন', 'Удерживайте аят для закладки')
t('quran.cardStyle', 'Style de carte', 'Karten-Stil', 'Estilo de tarjeta', 'Kart Stili', 'کارڈ اسٹائل', 'Gaya Kartu', 'Gaya Kad', 'कार्ड शैली', 'কার্ড স্টাইল', 'Стиль карточки')
t('quran.chooseReciter', 'Choisir un réciteur', 'Rezitator wählen', 'Elegir recitador', 'Okuyucu Seç', 'قاری منتخب', 'Pilih Qari', 'Pilih Qari', 'क़ारी चुनें', 'ক্বারী বেছে নিন', 'Выбрать чтеца')
t('quran.chooseTranslationDesc', 'Choisissez la langue de traduction', 'Wählen Sie die Übersetzungssprache', 'Elija el idioma de traducción', 'Tercih ettiğiniz çeviri dilini seçin', 'ترجمہ زبان منتخب', 'Pilih bahasa terjemahan pilihan', 'Pilih bahasa terjemahan pilihan', 'पसंदीदा अनुवाद भाषा चुनें', 'পছন্দের অনুবাদ ভাষা নির্বাচন', 'Выберите язык перевода')
t('quran.chooseTranslationLanguage', 'Choisir la langue de traduction', 'Übersetzungssprache wählen', 'Elegir idioma de traducción', 'Çeviri Dilini Seç', 'ترجمہ زبان منتخب', 'Pilih Bahasa Terjemahan', 'Pilih Bahasa Terjemahan', 'अनुवाद भाषा चुनें', 'অনুবাদ ভাষা বেছে নিন', 'Выбрать язык перевода')
t('quran.chooseVerse', 'Choisir un verset', 'Vers wählen', 'Elegir versículo', 'Ayet Seç', 'آیت منتخب', 'Pilih Ayat', 'Pilih Ayat', 'आयत चुनें', 'আয়াত বেছে নিন', 'Выбрать аят')
t('quran.confirmDeleteDownload', 'Confirmer la suppression du téléchargement', 'Löschen des Downloads bestätigen', 'Confirmar eliminar descarga', 'İndirme silmeyi onayla', 'ڈاؤنلوڈ حذف کی تصدیق', 'Konfirmasi hapus unduhan', 'Sahkan padam muat turun', 'डाउनलोड हटाने की पुष्टि', 'ডাউনলোড মুছা নিশ্চিত', 'Подтвердить удаление загрузки')
t('quran.defaultSize', 'Taille par défaut', 'Standardgröße', 'Tamaño predeterminado', 'Varsayılan Boyut', 'ڈیفالٹ سائز', 'Ukuran Default', 'Saiz Lalai', 'डिफ़ॉल्ट आकार', 'ডিফল্ট সাইজ', 'Размер по умолчанию')
t('quran.deleteDownload', 'Supprimer le téléchargement', 'Download löschen', 'Eliminar descarga', 'İndirmeyi Sil', 'ڈاؤنلوڈ حذف', 'Hapus Unduhan', 'Padam Muat Turun', 'डाउनलोड हटाएँ', 'ডাউনলোড মুছুন', 'Удалить загрузку')
t('quran.dontShowAgain', 'Ne plus afficher', 'Nicht mehr anzeigen', 'No mostrar de nuevo', 'Bir daha gösterme', 'دوبارہ نہ دکھائیں', 'Jangan tampilkan lagi', 'Jangan papar lagi', 'फिर न दिखाएँ', 'আর দেখাবেন না', 'Больше не показывать')
t('quran.enabled', 'Activé', 'Aktiviert', 'Activado', 'Etkin', 'فعال', 'Diaktifkan', 'Diaktifkan', 'सक्षम', 'সক্রিয়', 'Включено')
t('quran.focusMode', 'Mode concentration', 'Fokusmodus', 'Modo enfoque', 'Odak Modu', 'فوکس موڈ', 'Mode Fokus', 'Mod Fokus', 'फ़ोकस मोड', 'ফোকাস মোড', 'Режим фокуса')
t('quran.focusModeAlertMessage', 'Tous les éléments seront masqués pour une lecture concentrée', 'Alle Elemente werden für konzentriertes Lesen ausgeblendet', 'Todos los elementos se ocultarán para lectura enfocada', 'Odaklanmış okuma için tüm öğeler gizlenecek', 'مرکوز تلاوت کے لیے سب عناصر چھپ جائیں گے', 'Semua elemen disembunyikan untuk pembacaan fokus', 'Semua elemen disembunyikan untuk bacaan fokus', 'सभी तत्व छुपे होंगे मोकूफ़ पठन के लिए', 'মনোযোগী পড়ার জন্য সব উপাদান লুকানো হবে', 'Все элементы будут скрыты для сосредоточенного чтения')
t('quran.focusModeAlertTitle', 'Mode concentration', 'Fokusmodus', 'Modo enfoque', 'Odak Modu', 'فوکس موڈ', 'Mode Fokus', 'Mod Fokus', 'फ़ोकस मोड', 'ফোকাস মোড', 'Режим фокуса')
t('quran.focusModeDesc', 'Masquer les éléments pour une lecture concentrée', 'Elemente für konzentriertes Lesen ausblenden', 'Ocultar elementos para lectura enfocada', 'Odaklanmış okuma için öğeleri gizle', 'مرکوز تلاوت کے لیے عناصر چھپائیں', 'Sembunyikan elemen untuk pembacaan fokus', 'Sembunyikan elemen untuk bacaan fokus', 'केंद्रित पठन के लिए तत्व छिपाएँ', 'মনোযোগী পড়ার জন্য উপাদান লুকান', 'Скрыть элементы для сосредоточенного чтения')
t('quran.fontSettings', 'Paramètres de police', 'Schrifteinstellungen', 'Configuración de fuente', 'Yazı Tipi Ayarları', 'فونٹ ترتیبات', 'Pengaturan Font', 'Tetapan Fon', 'फ़ॉन्ट सेटिंग्स', 'ফন্ট সেটিংস', 'Настройки шрифта')
t('quran.imageBackground', 'Arrière-plan image', 'Bild-Hintergrund', 'Fondo de imagen', 'Resim Arka Planı', 'تصویر بیک گراؤنڈ', 'Latar Gambar', 'Latar Imej', 'छवि पृष्ठभूमि', 'ছবি ব্যাকগ্রাউন্ড', 'Фон изображения')
t('quran.khatma', 'Khatma', 'Chatma', 'Khatma', 'Hatim', 'ختم', 'Khatam', 'Khatam', 'ख़त्म', 'খতম', 'Хатма')
t('quran.lastPage', 'Dernière page', 'Letzte Seite', 'Última página', 'Son Sayfa', 'آخری صفحہ', 'Halaman Terakhir', 'Halaman Terakhir', 'आख़िरी पेज', 'শেষ পৃষ্ঠা', 'Последняя страница')
t('quran.loadingQuran', 'Chargement du Coran...', 'Koran wird geladen...', 'Cargando el Corán...', 'Kur\'an yükleniyor...', 'قرآن لوڈ ہو رہا...', 'Memuat Al-Quran...', 'Memuatkan Al-Quran...', 'क़ुरआन लोड हो रहा...', 'কুরআন লোড হচ্ছে...', 'Загрузка Корана...')
t('quran.longPressToGoToVerse', 'Appuyez longuement pour aller au verset', 'Lange drücken um zum Vers zu gehen', 'Mantenga pulsado para ir al versículo', 'Ayete gitmek için uzun basın', 'آیت پر جانے کے لیے دیر تک دبائیں', 'Tekan lama untuk ke ayat', 'Tekan lama untuk ke ayat', 'आयत पर जाने के लिए लंबा दबाएँ', 'আয়াতে যেতে দীর্ঘ চাপ দিন', 'Удерживайте для перехода к аяту')
t('quran.mushaf', 'Mushaf', 'Mushaf', 'Mushaf', 'Mushaf', 'مصحف', 'Mushaf', 'Mushaf', 'मुसहफ़', 'মুসহাফ', 'Мусхаф')
t('quran.mushafBackground', 'Arrière-plan du Mushaf', 'Mushaf-Hintergrund', 'Fondo del Mushaf', 'Mushaf Arka Planı', 'مصحف بیک گراؤنڈ', 'Latar Mushaf', 'Latar Mushaf', 'मुसहफ़ पृष्ठभूमि', 'মুসহাফ ব্যাকগ্রাউন্ড', 'Фон мусхафа')
t('quran.noBookmarkFound', 'Aucun favori trouvé', 'Kein Lesezeichen gefunden', 'No se encontraron marcadores', 'Yer imi bulunamadı', 'بک مارک نہیں ملا', 'Bookmark tidak ditemukan', 'Tandabuku tidak dijumpai', 'कोई बुकमार्क नहीं', 'কোনো বুকমার্ক পাওয়া যায়নি', 'Закладки не найдены')

# ===== quranReminder (Islamic terms) =====
t('quranReminder.alhamdulillah', '', '', '', '', '', '', '', '', '', '')  # Islamic term
t('quranReminder.astaghfirullah', '', '', '', '', '', '', '', '', '', '')  # Islamic term
t('quranReminder.subhanallah', '', '', '', '', '', '', '', '', '', '')  # Islamic term
t('quranReminder.subhanallahBihamdi', '', '', '', '', '', '', '', '', '', '')  # Islamic term

# ===== tasbih (Islamic terms - already marked empty in Part 8, these override) =====
# These were added in Part 8 with empty strings already

# ===== widgets (23 remaining) =====
t('widgets.showAllPrayers', 'Afficher toutes les prières', 'Alle Gebete anzeigen', 'Mostrar todas las oraciones', 'Tüm Namazları Göster', 'تمام نمازیں دکھائیں', 'Tampilkan Semua Shalat', 'Papar Semua Solat', 'सभी नमाज़ दिखाएँ', 'সব নামাজ দেখান', 'Показать все молитвы')
t('widgets.showAllPrayersDesc', 'Afficher les cinq prières dans le widget', 'Fünf Gebete im Widget anzeigen', 'Mostrar las cinco oraciones en el widget', 'Widget\'ta beş vakit namazı göster', 'ویجٹ میں پانچوں نمازیں', 'Tampilkan kelima shalat di widget', 'Papar kelima solat dalam widget', 'विजेट में पाँचों नमाज़', 'উইজেটে পাঁচ ওয়াক্ত নামাজ', 'Показать пять молитв в виджете')
t('widgets.showDhikrTranslation', 'Afficher la traduction du dhikr', 'Dhikr-Übersetzung anzeigen', 'Mostrar traducción del dhikr', 'Zikir Çevirisini Göster', 'ذکر ترجمہ دکھائیں', 'Tampilkan Terjemahan Dzikir', 'Papar Terjemahan Zikir', 'ज़िक्र अनुवाद दिखाएँ', 'যিকর অনুবাদ দেখান', 'Показать перевод зикра')
t('widgets.showDhikrTranslationDesc', 'Afficher la traduction sous le dhikr', 'Übersetzung unter dem Dhikr anzeigen', 'Mostrar traducción debajo del dhikr', 'Zikir altında çeviriyi göster', 'ذکر کے نیچے ترجمہ', 'Tampilkan terjemahan di bawah dzikir', 'Papar terjemahan di bawah zikir', 'ज़िक्र के नीचे अनुवाद', 'যিকরের নিচে অনুবাদ', 'Показать перевод под зикром')
t('widgets.showGregorianDate', 'Afficher la date grégorienne', 'Gregorianisches Datum anzeigen', 'Mostrar fecha gregoriana', 'Miladi Tarihi Göster', 'عیسوی تاریخ دکھائیں', 'Tampilkan Tanggal Masehi', 'Papar Tarikh Masihi', 'ग्रेगोरियन तारीख़ दिखाएँ', 'গ্রেগরিয়ান তারিখ দেখান', 'Показать григорианскую дату')
t('widgets.showGregorianDateDesc', 'Afficher la date grégorienne à côté de l\'hégire', 'Gregorianisch neben Hijri anzeigen', 'Mostrar fecha gregoriana junto a la Hégira', 'Miladi tarihi Hicri ile birlikte göster', 'عیسوی تاریخ ہجری کے ساتھ', 'Tampilkan tanggal Masehi di samping Hijriah', 'Papar tarikh Masihi bersama Hijrah', 'ग्रेगोरियन हिजरी के साथ', 'গ্রেগরিয়ান হিজরির পাশে', 'Показать григорианскую дату рядом с хиджрой')
t('widgets.showHijriDate', 'Afficher la date hégirique', 'Hijri-Datum anzeigen', 'Mostrar fecha Hégira', 'Hicri Tarihi Göster', 'ہجری تاریخ دکھائیں', 'Tampilkan Tanggal Hijriah', 'Papar Tarikh Hijrah', 'हिजरी तारीख़ दिखाएँ', 'হিজরি তারিখ দেখান', 'Показать дату хиджры')
t('widgets.showLocation', 'Afficher le lieu', 'Standort anzeigen', 'Mostrar ubicación', 'Konumu Göster', 'مقام دکھائیں', 'Tampilkan Lokasi', 'Papar Lokasi', 'स्थान दिखाएँ', 'অবস্থান দেখান', 'Показать местоположение')
t('widgets.showTranslation', 'Afficher la traduction', 'Übersetzung anzeigen', 'Mostrar traducción', 'Çeviriyi Göster', 'ترجمہ دکھائیں', 'Tampilkan Terjemahan', 'Papar Terjemahan', 'अनुवाद दिखाएँ', 'অনুবাদ দেখান', 'Показать перевод')
t('widgets.showTranslationDesc', 'Afficher la traduction du texte', 'Textübersetzung anzeigen', 'Mostrar traducción del texto', 'Metin çevirisini göster', 'متن کا ترجمہ دکھائیں', 'Tampilkan terjemahan teks', 'Papar terjemahan teks', 'पाठ अनुवाद दिखाएँ', 'টেক্সট অনুবাদ দেখান', 'Показать перевод текста')
t('widgets.showVerseTranslation', 'Afficher la traduction du verset', 'Vers-Übersetzung anzeigen', 'Mostrar traducción del versículo', 'Ayet Çevirisini Göster', 'آیت ترجمہ دکھائیں', 'Tampilkan Terjemahan Ayat', 'Papar Terjemahan Ayat', 'आयत अनुवाद दिखाएँ', 'আয়াত অনুবাদ দেখান', 'Показать перевод аята')
t('widgets.showVerseTranslationDesc', 'Afficher la traduction sous le verset', 'Übersetzung unter dem Vers anzeigen', 'Mostrar traducción debajo del versículo', 'Ayet altında çeviriyi göster', 'آیت کے نیچے ترجمہ', 'Tampilkan terjemahan di bawah ayat', 'Papar terjemahan di bawah ayat', 'आयत के नीचे अनुवाद', 'আয়াতের নিচে অনুবাদ', 'Показать перевод под аятом')
t('widgets.showVirtue', 'Afficher la vertu', 'Tugend anzeigen', 'Mostrar virtud', 'Fazileti Göster', 'فضیلت دکھائیں', 'Tampilkan Keutamaan', 'Papar Kelebihan', 'फ़ज़ीलत दिखाएँ', 'ফজিলত দেখান', 'Показать достоинство')
t('widgets.showVirtueDesc', 'Afficher la vertu du dhikr', 'Dhikr-Tugend anzeigen', 'Mostrar virtud del dhikr', 'Zikrin faziletini göster', 'ذکر کی فضیلت دکھائیں', 'Tampilkan keutamaan dzikir', 'Papar kelebihan zikir', 'ज़िक्र की फ़ज़ीलत दिखाएँ', 'যিকরের ফজিলত দেখান', 'Показать достоинство зикра')
t('widgets.sizeMedium', 'Moyen', 'Mittel', 'Mediano', 'Orta', 'درمیانہ', 'Sedang', 'Sederhana', 'मध्यम', 'মাঝারি', 'Средний')
t('widgets.sizeSmall', 'Petit', 'Klein', 'Pequeño', 'Küçük', 'چھوٹا', 'Kecil', 'Kecil', 'छोटा', 'ছোট', 'Маленький')
t('widgets.trackPrayerCompletion', 'Suivi de l\'accomplissement', 'Gebetserfüllung verfolgen', 'Seguimiento de oración', 'Namaz Tamamlama Takibi', 'نماز مکمل ٹریکنگ', 'Lacak Penyelesaian Shalat', 'Jejak Penyempurnaan Solat', 'नमाज़ पूर्ति ट्रैकिंग', 'নামাজ সম্পন্ন ট্র্যাকিং', 'Отслеживание выполнения')
t('widgets.trackPrayerCompletionDesc', 'Activer le suivi de l\'accomplissement', 'Gebetserfüllung verfolgen aktivieren', 'Activar seguimiento de oración', 'Namaz tamamlama takibini aç', 'نماز مکمل ٹریکنگ فعال', 'Aktifkan pelacakan shalat', 'Aktifkan penjejakan solat', 'नमाज़ पूर्ति ट्रैकिंग सक्षम', 'নামাজ সম্পন্ন ট্র্যাকিং সক্রিয়', 'Включить отслеживание выполнения')
t('widgets.updateWidgetNow', 'Mettre à jour le widget', 'Widget jetzt aktualisieren', 'Actualizar widget ahora', 'Widget\'ı Şimdi Güncelle', 'ویجٹ ابھی اپ ڈیٹ', 'Perbarui Widget Sekarang', 'Kemas Kini Widget', 'विजेट अभी अपडेट', 'উইজেট এখন আপডেট', 'Обновить виджет')
t('widgets.verseWidget', 'Widget de verset', 'Vers-Widget', 'Widget de versículo', 'Ayet Widget\'ı', 'آیت ویجٹ', 'Widget Ayat', 'Widget Ayat', 'आयत विजेट', 'আয়াত উইজেট', 'Виджет аята')
t('widgets.widgetPreview', 'Aperçu du widget', 'Widget-Vorschau', 'Vista previa del widget', 'Widget Önizleme', 'ویجٹ پیش نظارہ', 'Pratinjau Widget', 'Pratonton Widget', 'विजेट पूर्वावलोकन', 'উইজেট প্রিভিউ', 'Предпросмотр виджета')
t('widgets.widgetSettingsTitle', 'Paramètres des widgets', 'Widget-Einstellungen', 'Configuración de widgets', 'Widget Ayarları', 'ویجٹ ترتیبات', 'Pengaturan Widget', 'Tetapan Widget', 'विजेट सेटिंग्स', 'উইজেট সেটিংস', 'Настройки виджетов')
t('widgets.widgetUpdated', 'Widget mis à jour', 'Widget aktualisiert', 'Widget actualizado', 'Widget Güncellendi', 'ویجٹ اپ ڈیٹ', 'Widget Diperbarui', 'Widget Dikemas Kini', 'विजेट अपडेट', 'উইজেট আপডেট', 'Виджет обновлён')

print(f"Part 9 loaded. Total entries: {len(TR)}")
