#!/usr/bin/env python3
"""Translation data Part 4: remaining missing entries"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from translations_data import TR, t

# ===== app =====
t('app.name', '', '', '', '', '', '', '', '', '', '')  # Brand name stays same

# ===== azkar (remaining) =====
t('azkar.alhamdulillah', '', '', '', '', '', '', '', '', '', '')  # Islamic term

# ===== calendar =====
t('calendar.ashura', '', '', '', '', '', '', '', '', '', '')  # Islamic term

# ===== hajj =====
t('hajj.footerDua', '', '', '', '', '', '', '', '', '', '')  # Arabic dua

# ===== home (remaining) =====
t('home.greeting', '', '', '', '', '', '', '', '', '', '')  # Islamic greeting
t('home.istighfar', '', '', '', '', '', '', '', '', '', '')  # Islamic term
t('home.salawat', '', '', '', '', '', '', '', '', '', '')  # Islamic term

# ===== khatma (remaining) =====
t('khatma.active', 'Active', 'Aktiv', 'Activa', 'Aktif', 'فعال', 'Aktif', 'Aktif', 'सक्रिय', 'সক্রিয়', 'Активный')
t('khatma.barakAllah', "Qu'Allah vous bénisse", 'Möge Allah dich segnen', 'Que Allah te bendiga', 'Allah mübarek kılsın', 'اللہ آپ کو برکت دے', 'Semoga Allah memberkahi', 'Semoga Allah memberkati', 'अल्लाह आपको बरकत दे', 'আল্লাহ আপনাকে বরকত দিন', 'Да благословит вас Аллах')
t('khatma.behindSchedule', 'En retard', 'Im Rückstand', 'Atrasado', 'Geride', 'پیچھے', 'Tertinggal', 'Ketinggalan', 'पीछे', 'পিছিয়ে', 'Отстаёте')
t('khatma.chooseAction', 'Choisir une action', 'Aktion wählen', 'Elegir acción', 'İşlem Seç', 'عمل منتخب کریں', 'Pilih Tindakan', 'Pilih Tindakan', 'क्रिया चुनें', 'কাজ বেছে নিন', 'Выбрать действие')
t('khatma.chooseDuration', 'Choisir la durée', 'Dauer wählen', 'Elegir duración', 'Süre Seç', 'مدت منتخب کریں', 'Pilih Durasi', 'Pilih Tempoh', 'अवधि चुनें', 'সময়কাল বেছে নিন', 'Выбрать срок')
t('khatma.completeWird', 'Terminer le wird', 'Wird abschließen', 'Completar wird', 'Virdi Tamamla', 'ورد مکمل کریں', 'Selesaikan Wird', 'Siapkan Wird', 'विर्द पूरा करें', 'উইর্দ সম্পন্ন', 'Завершить вирд')
t('khatma.completeWirdBtn', 'Terminer', 'Abschließen', 'Completar', 'Tamamla', 'مکمل', 'Selesai', 'Siap', 'पूर्ण', 'সম্পন্ন', 'Завершить')
t('khatma.completedBadge', 'Terminé', 'Abgeschlossen', 'Completado', 'Tamamlandı', 'مکمل', 'Selesai', 'Selesai', 'पूर्ण', 'সম্পন্ন', 'Завершено')
t('khatma.confirmCompleteWird', 'Confirmer la fin du wird ?', 'Wird abschließen?', '¿Completar wird?', 'Virdi tamamla?', 'ورد مکمل کریں؟', 'Selesaikan wird?', 'Siapkan wird?', 'विर्द पूरा करें?', 'উইর্দ সম্পন্ন করবেন?', 'Завершить вирд?')
t('khatma.createError', 'Erreur de création', 'Fehler beim Erstellen', 'Error de creación', 'Oluşturma Hatası', 'بنانے میں خرابی', 'Gagal Membuat', 'Ralat Mencipta', 'बनाने में त्रुटि', 'তৈরি ত্রুটি', 'Ошибка создания')
t('khatma.creating', 'Création...', 'Wird erstellt...', 'Creando...', 'Oluşturuluyor...', 'بنایا جا رہا ہے...', 'Membuat...', 'Mencipta...', 'बनाया जा रहा...', 'তৈরি হচ্ছে...', 'Создаётся...')
t('khatma.currentPosition', 'Position actuelle', 'Aktuelle Position', 'Posición actual', 'Mevcut Konum', 'موجودہ مقام', 'Posisi Saat Ini', 'Posisi Semasa', 'वर्तमान स्थिति', 'বর্তমান অবস্থান', 'Текущая позиция')
t('khatma.dailyReminder', 'Rappel quotidien', 'Tägliche Erinnerung', 'Recordatorio diario', 'Günlük Hatırlatma', 'روزانہ یاددہانی', 'Pengingat Harian', 'Peringatan Harian', 'दैनिक अनुस्मारक', 'দৈনিক রিমাইন্ডার', 'Ежедневное напоминание')
t('khatma.dailyWird', 'Wird quotidien', 'Tägliches Wird', 'Wird diario', 'Günlük Vird', 'روزانہ ورد', 'Wird Harian', 'Wird Harian', 'दैनिक विर्द', 'দৈনিক উইর্দ', 'Ежедневный вирд')
t('khatma.daysLeft', 'Jours restants', 'Verbleibende Tage', 'Días restantes', 'Kalan Günler', 'باقی دن', 'Hari Tersisa', 'Hari Berbaki', 'शेष दिन', 'বাকি দিন', 'Осталось дней')
t('khatma.defaultName', 'Nouvelle Khatma', 'Neue Khatma', 'Nueva Khatma', 'Yeni Hatim', 'نیا ختم', 'Khatam Baru', 'Khatam Baru', 'नया ख़त्म', 'নতুন খতম', 'Новый хатм')
t('khatma.editReminder', 'Modifier le rappel', 'Erinnerung bearbeiten', 'Editar recordatorio', 'Hatırlatmayı Düzenle', 'یاددہانی تبدیل کریں', 'Ubah Pengingat', 'Ubah Peringatan', 'अनुस्मारक बदलें', 'রিমাইন্ডার সম্পাদনা', 'Изменить напоминание')
t('khatma.enableReminder', 'Activer le rappel', 'Erinnerung aktivieren', 'Activar recordatorio', 'Hatırlatmayı Etkinleştir', 'یاددہانی فعال', 'Aktifkan Pengingat', 'Aktifkan Peringatan', 'अनुस्मारक सक्षम', 'রিমাইন্ডার সক্রিয়', 'Включить напоминание')
t('khatma.fromLabel', 'De', 'Von', 'Desde', 'Başlangıç', 'سے', 'Dari', 'Dari', 'से', 'থেকে', 'От')
t('khatma.khatmaCompletedMsg', 'Khatma terminée !', 'Khatma abgeschlossen!', '¡Khatma completada!', 'Hatim tamamlandı!', 'ختم مکمل!', 'Khatam selesai!', 'Khatam selesai!', 'ख़त्म पूर्ण!', 'খতম সম্পন্ন!', 'Хатм завершён!')
t('khatma.khatmaCreatedMsg', 'Khatma créée', 'Khatma erstellt', 'Khatma creada', 'Hatim oluşturuldu', 'ختم بنایا گیا', 'Khatam dibuat', 'Khatam dicipta', 'ख़त्म बनाया गया', 'খতম তৈরি হয়েছে', 'Хатм создан')
t('khatma.khatmaDuration', 'Durée de la khatma', 'Khatma-Dauer', 'Duración de khatma', 'Hatim Süresi', 'ختم کی مدت', 'Durasi Khatam', 'Tempoh Khatam', 'ख़त्म की अवधि', 'খতমের সময়কাল', 'Длительность хатма')
t('khatma.khatmaName', 'Nom de la khatma', 'Khatma-Name', 'Nombre de khatma', 'Hatim Adı', 'ختم کا نام', 'Nama Khatam', 'Nama Khatam', 'ख़त्म का नाम', 'খতমের নাম', 'Название хатма')
t('khatma.khatmaNamePlaceholder', 'Entrez le nom de la khatma', 'Khatma-Namen eingeben', 'Ingrese nombre de khatma', 'Hatim adını girin', 'ختم کا نام درج کریں', 'Masukkan nama khatam', 'Masukkan nama khatam', 'ख़त्म का नाम दर्ज करें', 'খতমের নাম লিখুন', 'Введите название хатма')
t('khatma.loading', 'Chargement...', 'Wird geladen...', 'Cargando...', 'Yükleniyor...', 'لوڈ ہو رہا ہے...', 'Memuat...', 'Memuatkan...', 'लोड हो रहा...', 'লোড হচ্ছে...', 'Загрузка...')
t('khatma.noActiveKhatmaDesc', 'Commencez une khatma maintenant', 'Starten Sie jetzt eine Khatma', 'Comience una khatma ahora', 'Şimdi bir hatim başlatın', 'ابھی ختم شروع کریں', 'Mulai khatam sekarang', 'Mula khatam sekarang', 'अभी ख़त्म शुरू करें', 'এখনই খতম শুরু করুন', 'Начните хатм сейчас')
t('khatma.noKhatmas', 'Aucune khatma', 'Keine Khatmas', 'Sin khatmas', 'Hatim Yok', 'کوئی ختم نہیں', 'Tidak Ada Khatam', 'Tiada Khatam', 'कोई ख़त्म नहीं', 'কোনো খতম নেই', 'Нет хатмов')
t('khatma.noKhatmasDesc', 'Commencez votre première khatma', 'Starten Sie Ihre erste Khatma', 'Comience su primera khatma', 'İlk hatminizi başlatın', 'اپنا پہلا ختم شروع کریں', 'Mulai khatam pertama Anda', 'Mula khatam pertama anda', 'अपना पहला ख़त्म शुरू करें', 'আপনার প্রথম খতম শুরু করুন', 'Начните свой первый хатм')
t('khatma.pageUnit', 'page', 'Seite', 'página', 'sayfa', 'صفحہ', 'halaman', 'halaman', 'पृष्ठ', 'পৃষ্ঠা', 'страница')
t('khatma.pages', 'Pages', 'Seiten', 'Páginas', 'Sayfalar', 'صفحات', 'Halaman', 'Halaman', 'पृष्ठ', 'পৃষ্ঠা', 'Страницы')
t('khatma.pagesPerDayLabel', 'Pages par jour', 'Seiten pro Tag', 'Páginas por día', 'Günde Sayfa', 'روزانہ صفحات', 'Halaman per Hari', 'Halaman sehari', 'प्रति दिन पृष्ठ', 'প্রতিদিন পৃষ্ঠা', 'Страниц в день')
t('khatma.pagesPerDayUnit', 'pages/jour', 'Seiten/Tag', 'páginas/día', 'sayfa/gün', 'صفحات/دن', 'halaman/hari', 'halaman/hari', 'पृष्ठ/दिन', 'পৃষ্ঠা/দিন', 'страниц/день')
t('khatma.pagesTitle', 'Pages', 'Seiten', 'Páginas', 'Sayfalar', 'صفحات', 'Halaman', 'Halaman', 'पृष्ठ', 'পৃষ্ঠা', 'Страницы')
t('khatma.quranHadith', 'Les meilleurs d\'entre vous sont ceux qui apprennent le Coran et l\'enseignent', 'Die Besten unter euch sind diejenigen, die den Quran lernen und lehren', 'Los mejores de vosotros son quienes aprenden el Corán y lo enseñan', 'En hayırlınız Kur\'an\'ı öğrenen ve öğretenlerdir', 'تم میں سے بہترین وہ ہیں جو قرآن سیکھیں اور سکھائیں', 'Sebaik-baik kalian adalah yang mempelajari Al-Quran dan mengajarkannya', 'Sebaik-baik kamu ialah yang mempelajari Al-Quran dan mengajarkannya', 'तुम में से सबसे अच्छे वे हैं जो क़ुरआन सीखें और सिखाएँ', 'তোমাদের মধ্যে সেরা তারা যারা কুরআন শেখে ও শেখায়', 'Лучшие из вас те, кто изучает Коран и обучает ему')
t('khatma.quranHadithSource', 'Rapporté par Bukhari', 'Überliefert von Bukhari', 'Narrado por Bukhari', 'Buhari rivayet etmiştir', 'بخاری کی روایت', 'Diriwayatkan oleh Bukhari', 'Diriwayatkan oleh Bukhari', 'बुखारी की रिवायत', 'বুখারী বর্ণিত', 'Передал Бухари')
t('khatma.reminderDays', 'Jours de rappel', 'Erinnerungstage', 'Días de recordatorio', 'Hatırlatma Günleri', 'یاددہانی کے دن', 'Hari Pengingat', 'Hari Peringatan', 'अनुस्मारक दिन', 'রিমাইন্ডার দিন', 'Дни напоминания')
t('khatma.selectDurationAlert', 'Sélectionnez la durée de la khatma', 'Wählen Sie die Khatma-Dauer', 'Seleccione la duración de khatma', 'Hatim süresini seçin', 'ختم کی مدت منتخب کریں', 'Pilih durasi khatam', 'Pilih tempoh khatam', 'ख़त्म की अवधि चुनें', 'খতমের সময়কাল বেছে নিন', 'Выберите длительность хатма')
t('khatma.setAsActive', 'Définir comme actif', 'Als aktiv setzen', 'Establecer como activo', 'Aktif Olarak Ayarla', 'فعال بنائیں', 'Jadikan Aktif', 'Tetapkan Aktif', 'सक्रिय सेट करें', 'সক্রিয় হিসেবে সেট', 'Сделать активным')
t('khatma.startKhatma', 'Commencer la khatma', 'Khatma starten', 'Iniciar khatma', 'Hatmi Başlat', 'ختم شروع کریں', 'Mulai Khatam', 'Mulakan Khatam', 'ख़त्म शुरू करें', 'খতম শুরু', 'Начать хатм')
t('khatma.startNewKhatma', 'Commencer une nouvelle khatma', 'Neue Khatma starten', 'Iniciar nueva khatma', 'Yeni Hatim Başlat', 'نیا ختم شروع کریں', 'Mulai Khatam Baru', 'Mulakan Khatam Baru', 'नया ख़त्म शुरू करें', 'নতুন খতম শুরু', 'Начать новый хатм')
t('khatma.startWird', 'Commencer le wird', 'Wird starten', 'Iniciar wird', 'Virde Başla', 'ورد شروع کریں', 'Mulai Wird', 'Mulakan Wird', 'विर्द शुरू करें', 'উইর্দ শুরু', 'Начать вирд')
t('khatma.tips', 'Conseils', 'Tipps', 'Consejos', 'İpuçları', 'تجاویز', 'Tips', 'Petua', 'सुझाव', 'পরামর্শ', 'Советы')
t('khatma.toLabel', 'À', 'Bis', 'Hasta', 'Bitiş', 'تک', 'Sampai', 'Hingga', 'तक', 'পর্যন্ত', 'До')
t('khatma.todayWird', 'Wird d\'aujourd\'hui', 'Heutiges Wird', 'Wird de hoy', 'Bugünkü Vird', 'آج کا ورد', 'Wird Hari Ini', 'Wird Hari Ini', 'आज का विर्द', 'আজকের উইর্দ', 'Сегодняшний вирд')
t('khatma.totalWird', 'Wird total', 'Gesamtes Wird', 'Wird total', 'Toplam Vird', 'کل ورد', 'Total Wird', 'Jumlah Wird', 'कुल विर्द', 'মোট উইর্দ', 'Общий вирд')
t('khatma.wirdCompletedMsg', 'Wird terminé', 'Wird abgeschlossen', 'Wird completado', 'Vird tamamlandı', 'ورد مکمل', 'Wird selesai', 'Wird selesai', 'विर्द पूर्ण', 'উইর্দ সম্পন্ন', 'Вирд завершён')
t('khatma.yesCompleted', 'Oui, terminé', 'Ja, abgeschlossen', 'Sí, completado', 'Evet, tamamlandı', 'ہاں، مکمل', 'Ya, selesai', 'Ya, selesai', 'हाँ, पूर्ण', 'হ্যাঁ, সম্পন্ন', 'Да, завершено')

# ===== liveActivities (remaining) =====
t('liveActivities.description', 'Afficher les prières sur l\'écran de verrouillage', 'Gebetszeiten auf dem Sperrbildschirm anzeigen', 'Mostrar horarios de oración en la pantalla de bloqueo', 'Namaz vakitlerini kilit ekranında göster', 'لاک اسکرین پر نماز کے اوقات', 'Tampilkan waktu shalat di layar kunci', 'Papar waktu solat di skrin kunci', 'लॉक स्क्रीन पर नमाज़ दिखाएँ', 'লক স্ক্রিনে নামাজ দেখান', 'Показать молитвы на экране блокировки')
t('liveActivities.enable', 'Activer les activités en direct', 'Live-Aktivitäten aktivieren', 'Activar actividades en vivo', 'Canlı Etkinlikleri Etkinleştir', 'لائیو ایکٹیویٹیز فعال', 'Aktifkan Live Activity', 'Aktifkan Aktiviti Langsung', 'लाइव एक्टिविटी सक्षम', 'লাইভ অ্যাক্টিভিটি সক্রিয়', 'Включить Live Activity')
t('liveActivities.notSupported', 'Non pris en charge sur cet appareil', 'Auf diesem Gerät nicht unterstützt', 'No compatible con este dispositivo', 'Bu cihazda desteklenmiyor', 'اس ڈیوائس پر تعاون نہیں', 'Tidak didukung di perangkat ini', 'Tidak disokong pada peranti ini', 'इस डिवाइस पर समर्थित नहीं', 'এই ডিভাইসে সমর্থিত নয়', 'Не поддерживается на этом устройстве')
t('liveActivities.preview', 'Aperçu', 'Vorschau', 'Vista previa', 'Önizleme', 'پیش نظارہ', 'Pratinjau', 'Pratonton', 'पूर्वावलोकन', 'প্রিভিউ', 'Предпросмотр')
t('liveActivities.previewNextPrayer', 'Prochaine prière : Dhuhr', 'Nächstes Gebet: Dhuhr', 'Próxima oración: Dhuhr', 'Sonraki Namaz: Öğle', 'اگلی نماز: ظہر', 'Shalat Berikutnya: Dzuhur', 'Solat Seterusnya: Zuhur', 'अगली नमाज़: ज़ुहर', 'পরবর্তী নামাজ: যোহর', 'Следующая молитва: Зухр')
t('liveActivities.previewSunrise', 'Lever du soleil : 06:30', 'Sonnenaufgang: 06:30', 'Amanecer: 06:30', 'Güneş Doğuşu: 06:30', 'طلوع آفتاب: 06:30', 'Terbit: 06:30', 'Terbit: 06:30', 'सूर्योदय: 06:30', 'সূর্যোদয়: 06:30', 'Восход: 06:30')
t('liveActivities.styleTitle', 'Style d\'affichage', 'Anzeigestil', 'Estilo de visualización', 'Görüntü Stili', 'ڈسپلے انداز', 'Gaya Tampilan', 'Gaya Paparan', 'प्रदर्शन शैली', 'প্রদর্শন ধরন', 'Стиль отображения')

# ===== messages (remaining) =====
t('messages.info', 'Info', 'Info', 'Info', 'Bilgi', 'معلومات', 'Info', 'Info', 'जानकारी', 'তথ্য', 'Инфо')
t('messages.tutorial', 'Tutoriel', 'Anleitung', 'Tutorial', 'Öğretici', 'ٹیوٹوریل', 'Tutorial', 'Tutorial', 'ट्यूटोरियल', 'টিউটোরিয়াল', 'Руководство')

# ===== notificationSounds (remaining) =====
t('notificationSounds.abdulbasit', '', '', '', '', '', '', '', '', '', '')  # Name
t('notificationSounds.adhkar', 'Adhkar', 'Adhkar', 'Adhkar', 'Zikirler', 'اذکار', 'Dzikir', 'Zikir', 'अज़कार', 'আযকার', 'Азкары')
t('notificationSounds.ajman', 'Ajman', 'Ajman', 'Ajman', 'Acman', 'عجمان', 'Ajman', 'Ajman', 'अजमान', 'আজমান', 'Аджман')
t('notificationSounds.ajmanDesc', 'Adhan d\'Ajman', 'Ajman Adhan', 'Adhan de Ajman', 'Acman Ezanı', 'عجمان کا اذان', 'Adzan Ajman', 'Azan Ajman', 'अजमान अज़ान', 'আজমান আযান', 'Азан Аджмана')
t('notificationSounds.ali_mulla', 'Ali Mulla', 'Ali Mulla', 'Ali Mulla', 'Ali Mulla', 'علی ملا', 'Ali Mulla', 'Ali Mulla', 'अली मुल्ला', 'আলী মুল্লা', 'Али Мулла')
t('notificationSounds.ali_mullaDesc', 'Adhan d\'Ali Mulla', 'Ali Mulla Adhan', 'Adhan de Ali Mulla', 'Ali Mulla Ezanı', 'علی ملا کا اذان', 'Adzan Ali Mulla', 'Azan Ali Mulla', 'अली मुल्ला अज़ान', 'আলী মুল্লা আযান', 'Азан Али Муллы')
t('notificationSounds.am', 'AM', 'AM', 'AM', 'ÖÖ', 'صبح', 'AM', 'AM', 'AM', 'AM', 'AM')
t('notificationSounds.astaghfirullah', '', '', '', '', '', '', '', '', '', '')  # Islamic term
t('notificationSounds.dosari', 'Al-Dosari', 'Al-Dosari', 'Al-Dosari', 'Ed-Doseri', 'الدوسری', 'Al-Dosari', 'Al-Dosari', 'अल-दोसरी', 'আল-দোসারি', 'Ад-Дусари')
t('notificationSounds.dosariDesc', 'Adhan d\'Al-Dosari', 'Al-Dosari Adhan', 'Adhan de Al-Dosari', 'Ed-Doseri Ezanı', 'الدوسری کا اذان', 'Adzan Al-Dosari', 'Azan Al-Dosari', 'अल-दोसरी अज़ान', 'আল-দোসারি আযান', 'Азан Ад-Дусари')
t('notificationSounds.haramain', 'Haramain', 'Haramain', 'Haramain', 'Harameyn', 'حرمین', 'Haramain', 'Haramain', 'हरमैन', 'হারামাইন', 'Харамейн')
t('notificationSounds.haramainDesc', 'Adhan d\'Haramain', 'Haramain Adhan', 'Adhan de Haramain', 'Harameyn Ezanı', 'حرمین کا اذان', 'Adzan Haramain', 'Azan Haramain', 'हरमैन अज़ान', 'হারামাইন আযান', 'Азан Харамейна')
t('notificationSounds.mansoor_zahrani', 'Mansoor Al-Zahrani', 'Mansoor Al-Zahrani', 'Mansoor Al-Zahrani', 'Mansur ez-Zahrani', 'منصور الزہرانی', 'Mansoor Al-Zahrani', 'Mansoor Al-Zahrani', 'मंसूर अल-ज़हरानी', 'মানসূর আল-যাহরানি', 'Мансур аз-Захрани')
t('notificationSounds.mansoor_zahraniDesc', 'Adhan de Mansoor Al-Zahrani', 'Mansoor Al-Zahrani Adhan', 'Adhan de Mansoor Al-Zahrani', 'Mansur ez-Zahrani Ezanı', 'منصور الزہرانی کا اذان', 'Adzan Mansoor Al-Zahrani', 'Azan Mansoor Al-Zahrani', 'मंसूर अल-ज़हरानी अज़ान', 'মানসূর আল-যাহরানি আযান', 'Азан Мансура аз-Захрани')
t('notificationSounds.minutes', 'minutes', 'Minuten', 'minutos', 'dakika', 'منٹ', 'menit', 'minit', 'मिनट', 'মিনিট', 'минут')
t('notificationSounds.naqshbandi', 'Naqshbandi', 'Naqshbandi', 'Naqshbandi', 'Nakşibendi', 'نقشبندی', 'Naqsyabandi', 'Naqsyabandi', 'नक़्शबंदी', 'নকশবন্দী', 'Накшбанди')
t('notificationSounds.naqshbandiDesc', 'Adhan de Naqshbandi', 'Naqshbandi Adhan', 'Adhan de Naqshbandi', 'Nakşibendi Ezanı', 'نقشبندی کا اذان', 'Adzan Naqsyabandi', 'Azan Naqsyabandi', 'नक़्शबंदी अज़ान', 'নকশবন্দী আযান', 'Азан Накшбанди')
t('notificationSounds.pm', 'PM', 'PM', 'PM', 'ÖS', 'شام', 'PM', 'PM', 'PM', 'PM', 'PM')
t('notificationSounds.sharif', 'Al-Sharif', 'Al-Sharif', 'Al-Sharif', 'Eş-Şerif', 'الشریف', 'Al-Syarif', 'Al-Syarif', 'अल-शरीफ़', 'আল-শরীফ', 'Аш-Шариф')
t('notificationSounds.sharifDesc', 'Adhan d\'Al-Sharif', 'Al-Sharif Adhan', 'Adhan de Al-Sharif', 'Eş-Şerif Ezanı', 'الشریف کا اذان', 'Adzan Al-Syarif', 'Azan Al-Syarif', 'अल-शरीफ़ अज़ान', 'আল-শরীফ আযান', 'Азан Аш-Шарифа')
t('notificationSounds.subhanallahBihamdihi', '', '', '', '', '', '', '', '', '', '')  # Islamic term
t('notificationSounds.sudais', 'Al-Sudais', 'Al-Sudais', 'Al-Sudais', 'Es-Sudeys', 'السدیس', 'Al-Sudais', 'Al-Sudais', 'अल-सुदैस', 'আল-সুদাইস', 'Ас-Судайс')
t('notificationSounds.sudaisDesc', 'Adhan d\'Al-Sudais', 'Al-Sudais Adhan', 'Adhan de Al-Sudais', 'Es-Sudeys Ezanı', 'السدیس کا اذان', 'Adzan Al-Sudais', 'Azan Al-Sudais', 'अल-सुदैस अज़ान', 'আল-সুদাইস আযান', 'Азан Ас-Судайса')
t('notificationSounds.surah', 'Sourate', 'Sure', 'Sura', 'Sure', 'سورت', 'Surah', 'Surah', 'सूरह', 'সূরা', 'Сура')
t('notificationSounds.tasbeeh', 'Tasbih', 'Tasbih', 'Tasbih', 'Tesbih', 'تسبیح', 'Tasbih', 'Tasbih', 'तस्बीह', 'তাসবীহ', 'Тасбих')
t('notificationSounds.testIstighfarBody', '', '', '', '', '', '', '', '', '', '')  # Arabic dua
t('notificationSounds.testTasbihBody', '', '', '', '', '', '', '', '', '', '')  # Arabic dhikr
t('notificationSounds.vibration', 'Vibration', 'Vibration', 'Vibración', 'Titreşim', 'وائبریشن', 'Getaran', 'Getaran', 'कंपन', 'ভাইব্রেশন', 'Вибрация')

# ===== notifications (remaining) =====
t('notifications.afterMinutes', 'minutes après', 'Minuten nach', 'minutos después', 'dakika sonra', 'منٹ بعد', 'menit setelah', 'minit selepas', 'मिनट बाद', 'মিনিট পরে', 'минут после')
t('notifications.asrBody', 'C\'est l\'heure de la prière d\'Asr', 'Es ist Zeit für das Asr-Gebet', 'Es hora de la oración del Asr', 'İkindi namazı vakti', 'عصر کی نماز کا وقت ہوگیا', 'Waktunya shalat Ashar', 'Waktu solat Asar', 'अस्र की नमाज़ का समय', 'আসরের নামাজের সময়', 'Время молитвы Аср')
t('notifications.azkarChannel', 'Canal d\'adhkar', 'Adhkar-Kanal', 'Canal de adhkar', 'Zikir Kanalı', 'اذکار چینل', 'Kanal Dzikir', 'Saluran Zikir', 'अज़कार चैनल', 'আযকার চ্যানেল', 'Канал азкаров')
t('notifications.azkarDesc', 'Rappels des adhkar du matin et du soir', 'Morgen- und Abend-Adhkar Erinnerungen', 'Recordatorios de adhkar matutinos y vespertinos', 'Sabah ve akşam zikir hatırlatmaları', 'صبح و شام کے اذکار یاددہانیاں', 'Pengingat dzikir pagi dan petang', 'Peringatan zikir pagi dan petang', 'सुबह-शाम अज़कार अनुस्मारक', 'সকাল-সন্ধ্যা আযকার রিমাইন্ডার', 'Напоминания утренних и вечерних азкаров')
t('notifications.dailyVerseChannel', 'Canal du verset quotidien', 'Tagesvers-Kanal', 'Canal del versículo diario', 'Günlük Ayet Kanalı', 'روزانہ آیت چینل', 'Kanal Ayat Harian', 'Saluran Ayat Harian', 'दैनिक आयत चैनल', 'দৈনিক আয়াত চ্যানেল', 'Канал ежедневного аята')
t('notifications.dailyVerseDesc', 'Verset coranique quotidien', 'Täglicher Koranvers', 'Versículo coránico diario', 'Günlük Kur\'an ayeti', 'روزانہ قرآنی آیت', 'Ayat Al-Quran harian', 'Ayat Al-Quran harian', 'दैनिक क़ुरआनी आयत', 'দৈনিক কুরআনি আয়াত', 'Ежедневный аят Корана')
t('notifications.dailyWirdBody', 'C\'est l\'heure de votre wird', 'Zeit für Ihr tägliches Wird', 'Es hora de su wird', 'Günlük vird zamanı', 'روزانہ ورد کا وقت', 'Waktunya wird harian', 'Masa wird harian', 'आपके विर्द का समय', 'আপনার উইর্দের সময়', 'Время вашего ежедневного вирда')
t('notifications.dailyWirdTitle', 'Wird quotidien', 'Tägliches Wird', 'Wird diario', 'Günlük Vird', 'روزانہ ورد', 'Wird Harian', 'Wird Harian', 'दैनिक विर्द', 'দৈনিক উইর্দ', 'Ежедневный вирд')
t('notifications.dayFri', 'Vendredi', 'Freitag', 'Viernes', 'Cuma', 'جمعہ', 'Jumat', 'Jumaat', 'शुक्रवार', 'শুক্রবার', 'Пятница')
t('notifications.dayMon', 'Lundi', 'Montag', 'Lunes', 'Pazartesi', 'پیر', 'Senin', 'Isnin', 'सोमवार', 'সোমবার', 'Понедельник')
t('notifications.daySat', 'Samedi', 'Samstag', 'Sábado', 'Cumartesi', 'ہفتہ', 'Sabtu', 'Sabtu', 'शनिवार', 'শনিবার', 'Суббота')
t('notifications.daySun', 'Dimanche', 'Sonntag', 'Domingo', 'Pazar', 'اتوار', 'Minggu', 'Ahad', 'रविवार', 'রবিবার', 'Воскресенье')
t('notifications.dayThu', 'Jeudi', 'Donnerstag', 'Jueves', 'Perşembe', 'جمعرات', 'Kamis', 'Khamis', 'गुरुवार', 'বৃহস্পতিবার', 'Четверг')
t('notifications.dayTue', 'Mardi', 'Dienstag', 'Martes', 'Salı', 'منگل', 'Selasa', 'Selasa', 'मंगलवार', 'মঙ্গলবার', 'Вторник')
t('notifications.dayWed', 'Mercredi', 'Mittwoch', 'Miércoles', 'Çarşamba', 'بدھ', 'Rabu', 'Rabu', 'बुधवार', 'বুধবার', 'Среда')
t('notifications.dhuhrBody', 'C\'est l\'heure de la prière de Dhuhr', 'Es ist Zeit für das Dhuhr-Gebet', 'Es hora de la oración del Dhuhr', 'Öğle namazı vakti', 'ظہر کی نماز کا وقت', 'Waktunya shalat Dzuhur', 'Waktu solat Zuhur', 'ज़ुहर की नमाज़ का समय', 'যোহরের নামাজের সময়', 'Время молитвы Зухр')
t('notifications.fajrBody', 'C\'est l\'heure de la prière de Fajr', 'Es ist Zeit für das Fajr-Gebet', 'Es hora de la oración del Fajr', 'Fecir namazı vakti', 'فجر کی نماز کا وقت', 'Waktunya shalat Subuh', 'Waktu solat Subuh', 'फ़ज्र की नमाज़ का समय', 'ফজরের নামাজের সময়', 'Время молитвы Фаджр')
t('notifications.generalChannel', 'Canal général', 'Allgemeiner Kanal', 'Canal general', 'Genel Kanal', 'عام چینل', 'Kanal Umum', 'Saluran Umum', 'सामान्य चैनल', 'সাধারণ চ্যানেল', 'Общий канал')
t('notifications.generalDesc', 'Notifications générales', 'Allgemeine Benachrichtigungen', 'Notificaciones generales', 'Genel uygulama bildirimleri', 'عام ایپ نوٹیفکیشنز', 'Notifikasi umum aplikasi', 'Pemberitahuan umum app', 'सामान्य ऐप सूचनाएँ', 'সাধারণ অ্যাপ নোটিফিকেশন', 'Общие уведомления')
t('notifications.ishaBody', 'C\'est l\'heure de la prière d\'Isha', 'Es ist Zeit für das Isha-Gebet', 'Es hora de la oración del Isha', 'Yatsı namazı vakti', 'عشاء کی نماز کا وقت', 'Waktunya shalat Isya', 'Waktu solat Isya', 'इशा की नमाज़ का समय', 'ইশার নামাজের সময়', 'Время молитвы Иша')
t('notifications.khatmaChannel', 'Canal de khatma', 'Khatma-Kanal', 'Canal de khatma', 'Hatim Kanalı', 'ختم چینل', 'Kanal Khatam', 'Saluran Khatam', 'ख़त्म चैनल', 'খতম চ্যানেল', 'Канал хатма')
t('notifications.khatmaComplete', 'Khatma terminée ! Qu\'Allah vous bénisse', 'Khatma abgeschlossen! Möge Allah dich segnen', 'Khatma completada! Que Allah te bendiga', 'Hatim tamamlandı! Allah mübarek kılsın', 'ختم مکمل! اللہ آپ کو برکت دے', 'Khatam selesai! Semoga Allah memberkahi', 'Khatam selesai! Semoga Allah memberkati', 'ख़त्म पूर्ण! अल्लाह बरकत दे', 'খতম সম্পন্ন! আল্লাহ বরকত দিন', 'Хатм завершён! Да благословит вас Аллах')
t('notifications.maghribBody', 'C\'est l\'heure de la prière de Maghrib', 'Es ist Zeit für das Maghrib-Gebet', 'Es hora de la oración del Maghrib', 'Akşam namazı vakti', 'مغرب کی نماز کا وقت', 'Waktunya shalat Maghrib', 'Waktu solat Maghrib', 'मग़रिब की नमाज़ का समय', 'মাগরিবের নামাজের সময়', 'Время молитвы Магриб')
t('notifications.prayNow', 'Priez maintenant', 'Jetzt beten', 'Rece ahora', 'Şimdi Kıl', 'ابھی نماز پڑھیں', 'Shalat Sekarang', 'Solat Sekarang', 'अभी नमाज़ पढ़ें', 'এখনই নামাজ পড়ুন', 'Молитесь сейчас')
t('notifications.prayerChannel', 'Canal de prière', 'Gebetskanal', 'Canal de oración', 'Namaz Kanalı', 'نماز چینل', 'Kanal Shalat', 'Saluran Solat', 'नमाज़ चैनल', 'নামাজ চ্যানেল', 'Канал молитв')
t('notifications.prayerChannelDesc', 'Notifications des horaires de prière', 'Gebetszeiten-Benachrichtigungen', 'Notificaciones de horarios de oración', 'Namaz vakitleri bildirimleri', 'نماز اوقات نوٹیفکیشنز', 'Notifikasi waktu shalat', 'Pemberitahuan waktu solat', 'नमाज़ समय सूचनाएँ', 'নামাজের সময় নোটিফিকেশন', 'Уведомления о времени молитв')
t('notifications.prayerTimeArrived', 'L\'heure de la prière est arrivée', 'Die Gebetszeit ist gekommen', 'La hora de la oración ha llegado', 'Namaz vakti geldi', 'نماز کا وقت آگیا', 'Waktu shalat telah tiba', 'Waktu solat telah tiba', 'नमाज़ का समय आ गया', 'নামাজের সময় হয়েছে', 'Время молитвы наступило')
t('notifications.prayerTimesChannel', 'Canal des horaires de prière', 'Gebetszeiten-Kanal', 'Canal de horarios de oración', 'Namaz Vakitleri Kanalı', 'نماز اوقات چینل', 'Kanal Waktu Shalat', 'Saluran Waktu Solat', 'नमाज़ समय चैनल', 'নামাজের সময় চ্যানেল', 'Канал времени молитв')
t('notifications.prayerTimesDesc', 'Alertes des cinq prières', 'Fünf Gebetszeiten-Benachrichtigungen', 'Alertas de las cinco oraciones', 'Beş vakit namaz uyarıları', 'پانچ نمازوں کے الرٹ', 'Peringatan lima waktu shalat', 'Amaran lima waktu solat', 'पाँच नमाज़ अलर्ट', 'পাঁচ ওয়াক্ত নামাজ সতর্কতা', 'Оповещения пяти молитв')
t('notifications.prepareForPrayer', 'Préparez-vous pour la prière', 'Bereiten Sie sich auf das Gebet vor', 'Prepárese para la oración', 'Namaz için hazırlanın', 'نماز کی تیاری کریں', 'Persiapan untuk shalat', 'Bersedia untuk solat', 'नमाज़ की तैयारी करें', 'নামাজের প্রস্তুতি নিন', 'Приготовьтесь к молитве')
t('notifications.seasonalChannel', 'Canal saisonnier', 'Saisonaler Kanal', 'Canal estacional', 'Mevsimsel Kanal', 'موسمی چینل', 'Kanal Musiman', 'Saluran Bermusim', 'मौसमी चैनल', 'মৌসুমী চ্যানেল', 'Сезонный канал')
t('notifications.seasonalChannelDesc', 'Notifications des événements islamiques', 'Islamische Ereignis-Benachrichtigungen', 'Notificaciones de eventos islámicos', 'İslami etkinlik bildirimleri', 'اسلامی تقریبات نوٹیفکیشنز', 'Notifikasi acara islam', 'Pemberitahuan acara islam', 'इस्लामी कार्यक्रम सूचनाएँ', 'ইসলামী ইভেন্ট নোটিফিকেশন', 'Уведомления исламских событий')
t('notifications.sunriseBody', 'Heure du lever du soleil', 'Sonnenaufgangszeit', 'Hora del amanecer', 'Güneş doğuş vakti', 'طلوع آفتاب کا وقت', 'Waktu terbit matahari', 'Waktu terbit matahari', 'सूर्योदय का समय', 'সূর্যোদয়ের সময়', 'Время восхода')
t('notifications.testBody', 'Ceci est une notification de test', 'Dies ist eine Testbenachrichtigung', 'Esta es una notificación de prueba', 'Bu bir test bildirimidir', 'یہ ایک ٹیسٹ نوٹیفکیشن ہے', 'Ini notifikasi percobaan', 'Ini pemberitahuan ujian', 'यह एक टेस्ट सूचना है', 'এটি একটি টেস্ট নোটিফিকেশন', 'Это тестовое уведомление')
t('notifications.testPrayerTitle', 'Test de notification de prière', 'Gebets-Testbenachrichtigung', 'Prueba de notificación de oración', 'Namaz Test Bildirimi', 'نماز ٹیسٹ نوٹیفکیشن', 'Uji Notifikasi Shalat', 'Uji Pemberitahuan Solat', 'नमाज़ टेस्ट सूचना', 'নামাজ টেস্ট নোটিফিকেশন', 'Тест уведомления о молитве')
t('notifications.testTitle', 'Notification de test', 'Testbenachrichtigung', 'Notificación de prueba', 'Test Bildirimi', 'ٹیسٹ نوٹیفکیشن', 'Notifikasi Percobaan', 'Pemberitahuan Ujian', 'टेस्ट सूचना', 'টেস্ট নোটিফিকেশন', 'Тестовое уведомление')
t('notifications.timeForAzkar', 'C\'est l\'heure des adhkar', 'Zeit für Adhkar', 'Es hora de los adhkar', 'Zikir zamanı', 'اذکار کا وقت', 'Waktunya dzikir', 'Masa untuk zikir', 'अज़कार का समय', 'আযকারের সময়', 'Время азкаров')
t('notifications.wellDone', 'Bravo ! Continuez', 'Gut gemacht! Weiter so', '¡Bien hecho! Sigue así', 'Aferin! Devam et', 'شاباش! جاری رکھیں', 'Bagus! Lanjutkan', 'Syabas! Teruskan', 'शाबाश! जारी रखें', 'বাহ! চালিয়ে যান', 'Молодец! Продолжайте')

# ===== onboarding (remaining) =====
t('onboarding.getStarted', 'Commencer', 'Los geht\'s', 'Empezar', 'Başlayalım', 'شروع کریں', 'Mulai', 'Mula', 'शुरू करें', 'শুরু করুন', 'Начать')
t('onboarding.welcomeDesc', 'Votre compagnon spirituel à chaque instant', 'Ihr spiritueller Begleiter in jedem Moment', 'Tu compañero espiritual en cada momento', 'Her an yanınızda manevi yoldaşınız', 'ہر لمحے آپ کا روحانی ساتھی', 'Teman spiritual Anda di setiap saat', 'Teman rohani anda di setiap saat', 'हर पल आपका रूहानी साथी', 'প্রতি মুহূর্তে আপনার আধ্যাত্মিক সঙ্গী', 'Ваш духовный спутник в каждый момент')
t('onboarding.welcomeTitle', 'Bienvenue dans Ruh Al-Muslim', 'Willkommen bei Ruh Al-Muslim', 'Bienvenido a Ruh Al-Muslim', 'Ruh Al-Muslim\'a Hoşgeldiniz', 'روح المسلم میں خوش آمدید', 'Selamat Datang di Ruh Al-Muslim', 'Selamat Datang ke Ruh Al-Muslim', 'रूह अल-मुस्लिम में स्वागत', 'রুহ আল-মুসলিমে স্বাগতম', 'Добро пожаловать в Рух Аль-Муслим')

print(f"Part 4 loaded. Total entries: {len(TR)}")
