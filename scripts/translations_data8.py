#!/usr/bin/env python3
"""Translation data Part 8: shareService, storyOfDay, subscription, tabs, tafsirSearch, tasbih, widget, widgets"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from translations_data import TR, t

# ===== shareService =====
t('shareService.ayahRef', 'Référence du verset', 'Versreferenz', 'Referencia del versículo', 'Ayet Referansı', 'آیت حوالہ', 'Referensi Ayat', 'Rujukan Ayat', 'आयत संदर्भ', 'আয়াত রেফারেন্স', 'Ссылка на аят')
t('shareService.dhikr', 'Dhikr', 'Dhikr', 'Dhikr', 'Zikir', 'ذکر', 'Dzikir', 'Zikir', 'ज़िक्र', 'যিকর', 'Зикр')
t('shareService.prayerTimes', 'Horaires de prière', 'Gebetszeiten', 'Horarios de oración', 'Namaz Vakitleri', 'نماز کے اوقات', 'Waktu Shalat', 'Waktu Solat', 'नमाज़ के समय', 'নামাজের সময়', 'Время молитв')
t('shareService.repeat', 'Répéter', 'Wiederholen', 'Repetir', 'Tekrar', 'دہرائیں', 'Ulangi', 'Ulang', 'दोहराएँ', 'পুনরাবৃত্তি', 'Повторить')
t('shareService.shareFrom', 'Partagé depuis', 'Geteilt von', 'Compartido desde', 'Paylaşılan kaynak:', 'یہاں سے شیئر', 'Dibagikan dari', 'Dikongsi dari', 'से साझा', 'থেকে শেয়ার', 'Поделиться из')
t('shareService.shareTitle', 'Partager', 'Teilen', 'Compartir', 'Paylaş', 'شیئر کریں', 'Bagikan', 'Kongsi', 'शेयर', 'শেয়ার', 'Поделиться')
t('shareService.source', 'Source', 'Quelle', 'Fuente', 'Kaynak', 'ماخذ', 'Sumber', 'Sumber', 'स्रोत', 'সূত্র', 'Источник')
t('shareService.surahRef', 'Référence de sourate', 'Sure-Referenz', 'Referencia de sura', 'Sure Referansı', 'سورت حوالہ', 'Referensi Surah', 'Rujukan Surah', 'सूरह संदर्भ', 'সূরা রেফারেন্স', 'Ссылка на суру')
t('shareService.time', 'Heure', 'Zeit', 'Hora', 'Zaman', 'وقت', 'Waktu', 'Masa', 'समय', 'সময়', 'Время')
t('shareService.translation', 'Traduction', 'Übersetzung', 'Traducción', 'Çeviri', 'ترجمہ', 'Terjemahan', 'Terjemahan', 'अनुवाद', 'অনুবাদ', 'Перевод')
t('shareService.virtue', 'Vertu', 'Tugend', 'Virtud', 'Fazilet', 'فضیلت', 'Keutamaan', 'Kelebihan', 'फ़ज़ीलत', 'ফজিলত', 'Достоинство')

# ===== storyOfDay (remaining) =====
t('storyOfDay.allReciters', 'Tous les réciteurs', 'Alle Rezitatoren', 'Todos los recitadores', 'Tüm Okuyucular', 'تمام قاری', 'Semua Qari', 'Semua Qari', 'सभी क़ारी', 'সব ক্বারী', 'Все чтецы')
t('storyOfDay.chooseReciter', 'Choisir un réciteur', 'Rezitator wählen', 'Elegir recitador', 'Okuyucu Seç', 'قاری منتخب', 'Pilih Qari', 'Pilih Qari', 'क़ारी चुनें', 'ক্বারী বেছে নিন', 'Выбрать чтеца')
t('storyOfDay.creatingPreview', 'Création de l\'aperçu...', 'Vorschau wird erstellt...', 'Creando vista previa...', 'Önizleme oluşturuluyor...', 'پیش نظارہ بنایا جا رہا...', 'Membuat pratinjau...', 'Mencipta pratonton...', 'प्रिव्यू बनाया जा रहा...', 'প্রিভিউ তৈরি হচ্ছে...', 'Создаётся предпросмотр...')
t('storyOfDay.creatingVideo', 'Création de la vidéo...', 'Video wird erstellt...', 'Creando video...', 'Video oluşturuluyor...', 'ویڈیو بنائی جا رہی...', 'Membuat video...', 'Mencipta video...', 'वीडियो बनाई जा रही...', 'ভিডিও তৈরি হচ্ছে...', 'Создаётся видео...')
t('storyOfDay.exportConnectionFailed', 'Échec de connexion à l\'export', 'Export-Verbindung fehlgeschlagen', 'Error de conexión de exportación', 'Dışa aktarma bağlantı hatası', 'ایکسپورٹ کنکشن ناکام', 'Koneksi ekspor gagal', 'Sambungan eksport gagal', 'निर्यात कनेक्शन विफल', 'এক্সপোর্ট সংযোগ ব্যর্থ', 'Ошибка подключения экспорта')
t('storyOfDay.exportServerError', 'Erreur du serveur d\'export', 'Export-Serverfehler', 'Error del servidor de exportación', 'Dışa aktarma sunucu hatası', 'ایکسپورٹ سرور خرابی', 'Kesalahan server ekspor', 'Ralat pelayan eksport', 'निर्यात सर्वर त्रुटि', 'এক্সপোর্ট সার্ভার ত্রুটি', 'Ошибка сервера экспорта')
t('storyOfDay.exportServiceUnavailable', 'Service d\'export indisponible', 'Export-Dienst nicht verfügbar', 'Servicio de exportación no disponible', 'Dışa aktarma hizmeti kullanılamıyor', 'ایکسپورٹ سروس دستیاب نہیں', 'Layanan ekspor tidak tersedia', 'Perkhidmatan eksport tidak tersedia', 'निर्यात सेवा अनुपलब्ध', 'এক্সপোর্ট সেবা পাওয়া যায়নি', 'Служба экспорта недоступна')
t('storyOfDay.hideBranding', 'Masquer la marque', 'Branding ausblenden', 'Ocultar marca', 'Markayı Gizle', 'برانڈنگ چھپائیں', 'Sembunyikan Branding', 'Sembunyikan Penjenamaan', 'ब्रांडिंग छुपाएँ', 'ব্র্যান্ডিং লুকান', 'Скрыть брендинг')
t('storyOfDay.imageSaved', 'Image enregistrée', 'Bild gespeichert', 'Imagen guardada', 'Resim kaydedildi', 'تصویر محفوظ', 'Gambar disimpan', 'Imej disimpan', 'छवि सहेजी', 'ছবি সংরক্ষিত', 'Изображение сохранено')
t('storyOfDay.loadError', 'Erreur de chargement', 'Ladefehler', 'Error de carga', 'Yükleme Hatası', 'لوڈ خرابی', 'Kesalahan Memuat', 'Ralat Memuatkan', 'लोड त्रुटि', 'লোড ত্রুটি', 'Ошибка загрузки')
t('storyOfDay.longPressHint', 'Appuyez longuement pour plus', 'Lange drücken für mehr', 'Mantenga pulsado para más', 'Daha fazlası için uzun basın', 'مزید کے لیے دیر تک دبائیں', 'Tekan lama untuk lainnya', 'Tekan lama untuk lagi', 'अधिक के लिए लंबा दबाएँ', 'আরও জানতে দীর্ঘ চাপুন', 'Удерживайте для подробностей')
t('storyOfDay.noAudioAvailable', 'Aucun audio disponible', 'Kein Audio verfügbar', 'Sin audio disponible', 'Ses mevcut değil', 'آڈیو دستیاب نہیں', 'Tidak ada audio', 'Tiada audio', 'कोई ऑडियो नहीं', 'কোনো অডিও নেই', 'Аудио недоступно')
t('storyOfDay.noImageAvailable', 'Aucune image disponible', 'Kein Bild verfügbar', 'Sin imagen disponible', 'Resim mevcut değil', 'تصویر دستیاب نہیں', 'Tidak ada gambar', 'Tiada imej', 'कोई छवि नहीं', 'কোনো ছবি নেই', 'Изображение недоступно')
t('storyOfDay.photoPermissionRequired', 'Permission photo requise', 'Foto-Berechtigung erforderlich', 'Permiso de foto requerido', 'Fotoğraf izni gerekli', 'فوٹو اجازت ضروری', 'Izin foto diperlukan', 'Kebenaran foto diperlukan', 'फोटो अनुमति आवश्यक', 'ফটো অনুমতি প্রয়োজন', 'Требуется разрешение на фото')
t('storyOfDay.previewCreationError', 'Erreur de création de l\'aperçu', 'Fehler bei der Vorschauerstellung', 'Error al crear la vista previa', 'Önizleme oluşturma hatası', 'پیش نظارہ بنانے میں خرابی', 'Gagal membuat pratinjau', 'Ralat mencipta pratonton', 'प्रिव्यू बनाने में त्रुटि', 'প্রিভিউ তৈরি ত্রুটি', 'Ошибка создания предпросмотра')
t('storyOfDay.previewVideo', 'Aperçu vidéo', 'Video-Vorschau', 'Vista previa del video', 'Video Önizleme', 'ویڈیو پیش نظارہ', 'Pratinjau Video', 'Pratonton Video', 'वीडियो प्रिव्यू', 'ভিডিও প্রিভিউ', 'Предпросмотр видео')
t('storyOfDay.saveVideoWithReciter', 'Enregistrer la vidéo avec le réciteur', 'Video mit Rezitator speichern', 'Guardar video con el recitador', 'Videoyu okuyucu ile kaydet', 'قاری کے ساتھ ویڈیو محفوظ', 'Simpan video dengan qari', 'Simpan video dengan qari', 'क़ारी के साथ वीडियो सहेजें', 'ক্বারীসহ ভিডিও সংরক্ষণ', 'Сохранить видео с чтецом')
t('storyOfDay.shareError', 'Erreur de partage', 'Freigabefehler', 'Error al compartir', 'Paylaşım Hatası', 'شیئرنگ خرابی', 'Kesalahan Berbagi', 'Ralat Perkongsian', 'शेयर त्रुटि', 'শেয়ার ত্রুটি', 'Ошибка при отправке')
t('storyOfDay.shareText', 'Partager comme texte', 'Als Text teilen', 'Compartir como texto', 'Metin Olarak Paylaş', 'ٹیکسٹ کے طور پر شیئر', 'Bagikan sebagai Teks', 'Kongsi sebagai Teks', 'टेक्स्ट के रूप में शेयर', 'টেক্সট হিসেবে শেয়ার', 'Поделиться текстом')
t('storyOfDay.sharingInProgress', 'Partage en cours...', 'Wird geteilt...', 'Compartiendo...', 'Paylaşılıyor...', 'شیئر ہو رہا ہے...', 'Membagikan...', 'Berkongsi...', 'शेयर हो रहा...', 'শেয়ার হচ্ছে...', 'Отправка...')
t('storyOfDay.showBranding', 'Afficher la marque', 'Branding anzeigen', 'Mostrar marca', 'Markayı Göster', 'برانڈنگ دکھائیں', 'Tampilkan Branding', 'Papar Penjenamaan', 'ब्रांडिंग दिखाएँ', 'ব্র্যান্ডিং দেখান', 'Показать брендинг')
t('storyOfDay.videoExportFallback', 'Alternative d\'export vidéo', 'Video-Export-Fallback', 'Alternativa de exportación de video', 'Video dışa aktarma alternatifi', 'ویڈیو ایکسپورٹ متبادل', 'Alternatif ekspor video', 'Alternatif eksport video', 'वीडियो निर्यात विकल्प', 'ভিডিও এক্সপোর্ট বিকল্প', 'Альтернативный экспорт видео')
t('storyOfDay.videoPreviewRequiresDevBuild', 'L\'aperçu vidéo nécessite un build de développement', 'Video-Vorschau erfordert einen Dev-Build', 'La vista previa del video requiere un build de desarrollo', 'Video önizleme dev build gerektirir', 'ویڈیو پیش نظارہ ڈیو بلڈ ضروری', 'Pratinjau video memerlukan dev build', 'Pratonton video memerlukan dev build', 'वीडियो प्रिव्यू डेव बिल्ड चाहिए', 'ভিডিও প্রিভিউতে ডেভ বিল্ড প্রয়োজন', 'Предпросмотр видео требует dev build')
t('storyOfDay.videoSaveError', 'Erreur d\'enregistrement vidéo', 'Fehler beim Speichern des Videos', 'Error al guardar el video', 'Video kaydetme hatası', 'ویڈیو محفوظ کرنے میں خرابی', 'Gagal menyimpan video', 'Ralat menyimpan video', 'वीडियो सहेजने में त्रुटि', 'ভিডিও সংরক্ষণ ত্রুটি', 'Ошибка сохранения видео')
t('storyOfDay.videoWithAudioSaved', 'Vidéo avec audio enregistrée', 'Video mit Audio gespeichert', 'Video con audio guardado', 'Sesli video kaydedildi', 'آڈیو والی ویڈیو محفوظ', 'Video dengan audio disimpan', 'Video dengan audio disimpan', 'ऑडियो सहित वीडियो सहेजी', 'অডিওসহ ভিডিও সংরক্ষিত', 'Видео с аудио сохранено')

# ===== subscription (remaining) =====
t('subscription.alreadySubscribed', 'Déjà abonné', 'Bereits abonniert', 'Ya suscrito', 'Zaten Abone', 'پہلے سے سبسکرائب', 'Sudah Berlangganan', 'Sudah Melanggan', 'पहले से सदस्य', 'ইতিমধ্যে সাবস্ক্রাইব', 'Уже подписан')
t('subscription.legalText', 'Texte juridique', 'Rechtstext', 'Texto legal', 'Yasal Metin', 'قانونی متن', 'Teks Hukum', 'Teks Undang-undang', 'कानूनी पाठ', 'আইনি পাঠ্য', 'Юридический текст')
t('subscription.oneTimePurchase', 'Achat unique', 'Einmalkauf', 'Compra única', 'Tek Seferlik', 'ایک بار خریداری', 'Pembelian Sekali', 'Pembelian Sekali', 'एक बार खरीदारी', 'একবারের ক্রয়', 'Разовая покупка')
t('subscription.perMonth', 'Par mois', 'Pro Monat', 'Por mes', 'Aylık', 'ماہانہ', 'Per Bulan', 'Sebulan', 'प्रति माह', 'প্রতি মাসে', 'В месяц')
t('subscription.premiumSubtitle', 'Débloquez toutes les fonctionnalités premium', 'Schalten Sie alle Premium-Funktionen frei', 'Desbloquee todas las funciones premium', 'Tüm premium özellikleri açın', 'تمام پریمیم فیچرز کھولیں', 'Buka semua fitur premium', 'Buka semua ciri premium', 'सभी प्रीमियम सुविधाएँ अनलॉक', 'সব প্রিমিয়াম ফিচার আনলক', 'Разблокируйте все премиум-функции')
t('subscription.premiumTitle', 'Premium', 'Premium', 'Premium', 'Premium', 'پریمیم', 'Premium', 'Premium', 'प्रीमियम', 'প্রিমিয়াম', 'Премиум')
t('subscription.purchaseError', 'Erreur', 'Fehler', 'Error', 'Hata', 'خرابی', 'Kesalahan', 'Ralat', 'त्रुटि', 'ত্রুটি', 'Ошибка')
t('subscription.restoreError', 'Erreur', 'Fehler', 'Error', 'Hata', 'خرابی', 'Kesalahan', 'Ralat', 'त्रुटि', 'ত্রুটি', 'Ошибка')
t('subscription.subscribeNow', 'S\'abonner maintenant', 'Jetzt abonnieren', 'Suscribirse ahora', 'Şimdi Abone Ol', 'ابھی سبسکرائب', 'Berlangganan Sekarang', 'Langgan Sekarang', 'अभी सदस्य बनें', 'এখনই সাবস্ক্রাইব', 'Подписаться')
t('subscription.subscribeToAccess', 'Abonnez-vous pour accéder', 'Abonnieren für Zugang', 'Suscríbase para acceder', 'Erişim için abone olun', 'رسائی کے لیے سبسکرائب', 'Berlangganan untuk akses', 'Langgan untuk akses', 'पहुँच के लिए सदस्य बनें', 'অ্যাক্সেসের জন্য সাবস্ক্রাইব', 'Подпишитесь для доступа')
t('subscription.thankYou', 'Merci pour votre abonnement', 'Vielen Dank für Ihr Abonnement', 'Gracias por su suscripción', 'Abone olduğunuz için teşekkürler', 'سبسکرپشن کا شکریہ', 'Terima kasih telah berlangganan', 'Terima kasih kerana melanggan', 'सदस्यता के लिए धन्यवाद', 'সাবস্ক্রাইবের জন্য ধন্যবাদ', 'Спасибо за подписку')
t('subscription.upgrade', 'Mettre à niveau', 'Upgrade', 'Actualizar', 'Yükselt', 'اپ گریڈ', 'Upgrade', 'Naik Taraf', 'अपग्रेड', 'আপগ্রেড', 'Обновить')

# ===== tabs (remaining) =====
t('tabs.qibla', 'Qibla', 'Qibla', 'Qibla', 'Kıble', 'قبلہ', 'Kiblat', 'Kiblat', 'क़िबला', 'কিবলা', 'Кибла')

# ===== tafsirSearch (remaining) =====
t('tafsirSearch.arabicLang', 'Arabe', 'Arabisch', 'Árabe', 'Arapça', 'عربی', 'Arab', 'Arab', 'अरबी', 'আরবি', 'Арабский')
t('tafsirSearch.placeholder', 'Rechercher le tafsir...', 'Tafsir suchen...', 'Buscar tafsir...', 'Tefsir ara...', 'تفسیر تلاش...', 'Cari tafsir...', 'Cari tafsir...', 'तफ़सीर खोजें...', 'তাফসীর খুঁজুন...', 'Искать тафсир...')
t('tafsirSearch.searchBtn', 'Rechercher', 'Suchen', 'Buscar', 'Ara', 'تلاش', 'Cari', 'Cari', 'खोजें', 'অনুসন্ধান', 'Искать')
t('tafsirSearch.tafsirBtn', 'Tafsir', 'Tafsir', 'Tafsir', 'Tefsir', 'تفسیر', 'Tafsir', 'Tafsir', 'तफ़सीर', 'তাফসীর', 'Тафсир')
t('tafsirSearch.tryDifferentWords', 'Essayez d\'autres mots', 'Versuchen Sie andere Wörter', 'Intente otras palabras', 'Farklı kelimeler deneyin', 'مختلف الفاظ آزمائیں', 'Coba kata lain', 'Cuba perkataan lain', 'अन्य शब्द आज़माएँ', 'অন্য শব্দ চেষ্টা করুন', 'Попробуйте другие слова')

# ===== tasbih (remaining) =====
t('tasbih.addCustomDhikr', 'Ajouter un dhikr personnalisé', 'Eigenes Dhikr hinzufügen', 'Agregar dhikr personalizado', 'Özel Zikir Ekle', 'اپنا ذکر شامل کریں', 'Tambah Dzikir Kustom', 'Tambah Zikir Tersuai', 'कस्टम ज़िक्र जोड़ें', 'কাস্টম যিকর যোগ', 'Добавить свой зикр')
t('tasbih.alhamdulillah', '', '', '', '', '', '', '', '', '', '')  # Islamic term
t('tasbih.allahuAkbar', '', '', '', '', '', '', '', '', '', '')  # Islamic term
t('tasbih.allahummaSalliAla', '', '', '', '', '', '', '', '', '', '')  # Islamic term
t('tasbih.approvedDhikr', 'Dhikr approuvé', 'Genehmigtes Dhikr', 'Dhikr aprobado', 'Onaylanmış Zikir', 'تصدیق شدہ ذکر', 'Dzikir yang Disetujui', 'Zikir Diluluskan', 'स्वीकृत ज़िक्र', 'অনুমোদিত যিকর', 'Одобренный зикр')
t('tasbih.astaghfirullah', '', '', '', '', '', '', '', '', '', '')  # Islamic term
t('tasbih.autoAdvance', 'Avancement automatique', 'Automatischer Fortschritt', 'Avance automático', 'Otomatik İlerleme', 'خود بخود آگے', 'Otomatis Lanjut', 'Maju Automatik', 'स्वतः आगे बढ़ें', 'স্বয়ংক্রিয় অগ্রগতি', 'Автопереход')
t('tasbih.autoAdvanceDesc', 'Avancer automatiquement au dhikr suivant', 'Automatisch zum nächsten Dhikr wechseln', 'Avanzar automáticamente al siguiente dhikr', 'Sonraki zikre otomatik ilerle', 'اگلے ذکر پر خود بخود جائیں', 'Otomatis lanjut ke dzikir berikutnya', 'Maju automatik ke zikir seterusnya', 'अगले ज़िक्र पर स्वतः जाएँ', 'স্বয়ংক্রিয়ভাবে পরবর্তী যিকরে যান', 'Автопереход к следующему зикру')
t('tasbih.completedRounds', 'Tours terminés', 'Abgeschlossene Runden', 'Rondas completadas', 'Tamamlanan Turlar', 'مکمل راؤنڈ', 'Putaran Selesai', 'Pusingan Selesai', 'पूर्ण चक्कर', 'সম্পন্ন রাউন্ড', 'Завершённых кругов')
t('tasbih.dailyAverage', 'Moyenne quotidienne', 'Tagesdurchschnitt', 'Promedio diario', 'Günlük Ortalama', 'روزانہ اوسط', 'Rata-rata Harian', 'Purata Harian', 'दैनिक औसत', 'দৈনিক গড়', 'Средний за день')
t('tasbih.dailyResetToast', 'Compteurs d\'hier sauvegardés et réinitialisés', 'Gestrige Zählungen gespeichert und zurückgesetzt', 'Contadores de ayer guardados y reiniciados', 'Dünün sayımları kaydedildi ve sıfırlandı', 'کل کے شمار محفوظ اور ری سیٹ', 'Hitungan kemarin disimpan dan direset', 'Kiraan semalam disimpan dan ditetapkan semula', 'कल की गिनती सहेजी और रीसेट', 'গতকালের গণনা সংরক্ষিত ও রিসেট', 'Вчерашние счётчики сохранены и сброшены')
t('tasbih.deleteConfirm', 'Supprimer ce dhikr ?', 'Dieses Dhikr löschen?', '¿Eliminar este dhikr?', 'Bu zikri sil?', 'یہ ذکر حذف کریں؟', 'Hapus dzikir ini?', 'Padamkan zikir ini?', 'यह ज़िक्र हटाएँ?', 'এই যিকর মুছবেন?', 'Удалить этот зикр?')
t('tasbih.dhikrText', 'Texte du dhikr', 'Dhikr-Text', 'Texto del dhikr', 'Zikir Metni', 'ذکر کا متن', 'Teks Dzikir', 'Teks Zikir', 'ज़िक्र पाठ', 'যিকর টেক্সট', 'Текст зикра')
t('tasbih.dhikrUnit', 'dhikr', 'Dhikr', 'dhikr', 'zikir', 'ذکر', 'dzikir', 'zikir', 'ज़िक्र', 'যিকর', 'зикр')
t('tasbih.enterDhikrText', 'Entrez le texte du dhikr', 'Dhikr-Text eingeben', 'Ingrese el texto del dhikr', 'Zikir metnini girin', 'ذکر کا متن درج کریں', 'Masukkan teks dzikir', 'Masukkan teks zikir', 'ज़िक्र पाठ दर्ज करें', 'যিকর টেক্সট লিখুন', 'Введите текст зикра')
t('tasbih.enterTextError', 'Entrez d\'abord le texte du dhikr', 'Zuerst Dhikr-Text eingeben', 'Ingrese primero el texto del dhikr', 'Önce zikir metnini girin', 'پہلے ذکر کا متن لکھیں', 'Masukkan teks dzikir dulu', 'Masukkan teks zikir dulu', 'पहले ज़िक्र पाठ लिखें', 'প্রথমে যিকর টেক্সট লিখুন', 'Сначала введите текст зикра')
t('tasbih.hasbiyAllah', '', '', '', '', '', '', '', '', '', '')  # Islamic term
t('tasbih.laHawlaWalaQuwwata', '', '', '', '', '', '', '', '', '', '')  # Islamic term
t('tasbih.laIlahaIllallah', '', '', '', '', '', '', '', '', '', '')  # Islamic term
t('tasbih.mode', 'Mode', 'Modus', 'Modo', 'Mod', 'موڈ', 'Mode', 'Mod', 'मोड', 'মোড', 'Режим')
t('tasbih.myCustomDhikr', 'Mes dhikr personnalisés', 'Meine eigenen Dhikr', 'Mis dhikr personalizados', 'Özel Zikirlerim', 'میرے اپنے اذکار', 'Dzikir Kustom Saya', 'Zikir Tersuai Saya', 'मेरे कस्टम ज़िक्र', 'আমার কাস্টম যিকর', 'Мои зикры')
t('tasbih.myStats', 'Mes statistiques', 'Meine Statistiken', 'Mis estadísticas', 'İstatistiklerim', 'میرے اعداد', 'Statistik Saya', 'Statistik Saya', 'मेरे आँकड़े', 'আমার পরিসংখ্যান', 'Моя статистика')
t('tasbih.of', 'sur', 'von', 'de', '/', 'میں سے', 'dari', 'daripada', 'में से', 'এর মধ্যে', 'из')
t('tasbih.openTasbih', 'Ouvrir le tasbih', 'Tasbih öffnen', 'Abrir tasbih', 'Tesbihi Aç', 'تسبیح کھولیں', 'Buka Tasbih', 'Buka Tasbih', 'तस्बीह खोलें', 'তাসবীহ খুলুন', 'Открыть тасбих')
t('tasbih.reference10', 'Hasan - Sunan al-Tirmidhi', 'Hasan - Sunan al-Tirmidhi', 'Hasan - Sunan al-Tirmidhi', 'Hasen - Sünen-i Tirmizi', 'حسن - سنن الترمذی', 'Hasan - Sunan al-Tirmidzi', 'Hasan - Sunan al-Tirmizi', 'हसन - सुनन अत-तिरमिज़ी', 'হাসান - সুনান আত-তিরমিযী', 'Хасан — Сунан ат-Тирмизи')
t('tasbih.reference11', 'Sahih Muslim', 'Sahih Muslim', 'Sahih Muslim', 'Sahih-i Müslim', 'صحیح مسلم', 'Shahih Muslim', 'Sahih Muslim', 'सहीह मुस्लिम', 'সহীহ মুসলিম', 'Сахих Муслим')
t('tasbih.reference12', 'Sahih Muslim', 'Sahih Muslim', 'Sahih Muslim', 'Sahih-i Müslim', 'صحیح مسلم', 'Shahih Muslim', 'Sahih Muslim', 'सहीह मुस्लिम', 'সহীহ মুসলিম', 'Сахих Муслим')
t('tasbih.reference13', 'Sahih - Sunan al-Tirmidhi', 'Sahih - Sunan al-Tirmidhi', 'Sahih - Sunan al-Tirmidhi', 'Sahih - Sünen-i Tirmizi', 'صحیح - سنن الترمذی', 'Shahih - Sunan al-Tirmidzi', 'Sahih - Sunan al-Tirmizi', 'सहीह - सुनन अत-तिरमिज़ी', 'সহীহ - সুনান আত-তিরমিযী', 'Сахих — Сунан ат-Тирмизи')
t('tasbih.reference14', 'Sahih Muslim', 'Sahih Muslim', 'Sahih Muslim', 'Sahih-i Müslim', 'صحیح مسلم', 'Shahih Muslim', 'Sahih Muslim', 'सहीह मुस्लिम', 'সহীহ মুসলিম', 'Сахих Муслим')
t('tasbih.reference15', 'Hasan - Sunan al-Tirmidhi', 'Hasan - Sunan al-Tirmidhi', 'Hasan - Sunan al-Tirmidhi', 'Hasen - Sünen-i Tirmizi', 'حسن - سنن الترمذی', 'Hasan - Sunan al-Tirmidzi', 'Hasan - Sunan al-Tirmizi', 'हसन - सुनन अत-तिरमिज़ी', 'হাসান - সুনান আত-তিরমিযী', 'Хасан — Сунан ат-Тирмизи')
t('tasbih.reference2', 'Sahih Muslim', 'Sahih Muslim', 'Sahih Muslim', 'Sahih-i Müslim', 'صحیح مسلم', 'Shahih Muslim', 'Sahih Muslim', 'सहीह मुस्लिम', 'সহীহ মুসলিম', 'Сахих Муслим')
t('tasbih.reference3', 'Sahih Muslim', 'Sahih Muslim', 'Sahih Muslim', 'Sahih-i Müslim', 'صحیح مسلم', 'Shahih Muslim', 'Sahih Muslim', 'सहीह मुस्लिम', 'সহীহ মুসলিম', 'Сахих Муслим')
t('tasbih.reference4', 'Sahih Muslim', 'Sahih Muslim', 'Sahih Muslim', 'Sahih-i Müslim', 'صحیح مسلم', 'Shahih Muslim', 'Sahih Muslim', 'सहीह मुस्लिम', 'সহীহ মুসলিম', 'Сахих Муслим')
t('tasbih.reference9', 'Sahih - Sunan Abu Dawud', 'Sahih - Sunan Abu Dawud', 'Sahih - Sunan Abu Dawud', 'Sahih - Sünen-i Ebu Davud', 'صحیح - سنن ابو داؤد', 'Shahih - Sunan Abu Dawud', 'Sahih - Sunan Abu Dawud', 'सहीह - सुनन अबू दाऊद', 'সহীহ - সুনান আবু দাউদ', 'Сахих — Сунан Абу Дауд')
t('tasbih.resetAll', 'Tout réinitialiser', 'Alles zurücksetzen', 'Restablecer todo', 'Tümünü Sıfırla', 'سب ری سیٹ', 'Reset Semua', 'Tetapkan Semula Semua', 'सब रीसेट', 'সব রিসেট', 'Сбросить всё')
t('tasbih.resetAllConfirm', 'Tout réinitialiser ?', 'Alles zurücksetzen?', '¿Restablecer todo?', 'Tümünü sıfırla?', 'سب ری سیٹ کریں؟', 'Reset semua?', 'Tetapkan semula semua?', 'सब रीसेट करें?', 'সব রিসেট করবেন?', 'Сбросить всё?')
t('tasbih.resetCounter', 'Réinitialiser le compteur', 'Zähler zurücksetzen', 'Restablecer contador', 'Sayacı Sıfırla', 'کاؤنٹر ری سیٹ', 'Reset Penghitung', 'Tetapkan Semula Pembilang', 'काउंटर रीसेट', 'কাউন্টার রিসেট', 'Сбросить счётчик')
t('tasbih.showTranslation', 'Afficher la traduction', 'Übersetzung anzeigen', 'Mostrar traducción', 'Çeviriyi Göster', 'ترجمہ دکھائیں', 'Tampilkan Terjemahan', 'Papar Terjemahan', 'अनुवाद दिखाएँ', 'অনুবাদ দেখান', 'Показать перевод')
t('tasbih.showVirtue', 'Afficher la vertu', 'Tugend anzeigen', 'Mostrar virtud', 'Fazileti Göster', 'فضیلت دکھائیں', 'Tampilkan Keutamaan', 'Papar Kelebihan', 'फ़ज़ीलत दिखाएँ', 'ফজিলত দেখান', 'Показать достоинство')
t('tasbih.startTasbihHint', 'Appuyez sur le bouton pour commencer', 'Drücken Sie die Taste zum Starten', 'Toque el botón para comenzar', 'Başlamak için düğmeye basın', 'شروع کرنے کے لیے بٹن دبائیں', 'Tekan tombol untuk mulai', 'Tekan butang untuk mula', 'शुरू करने के लिए बटन दबाएँ', 'শুরু করতে বোতাম চাপুন', 'Нажмите кнопку для начала')
t('tasbih.statsList', 'Liste des statistiques', 'Statistikliste', 'Lista de estadísticas', 'İstatistik Listesi', 'اعداد کی فہرست', 'Daftar Statistik', 'Senarai Statistik', 'सांख्यिकी सूची', 'পরিসংখ্যান তালিকা', 'Список статистики')
t('tasbih.subhanAllah', '', '', '', '', '', '', '', '', '', '')  # Islamic term
t('tasbih.subhanAllahAlAzeem', '', '', '', '', '', '', '', '', '', '')  # Islamic term
t('tasbih.subhanAllahWabihamdi', '', '', '', '', '', '', '', '', '', '')  # Islamic term
t('tasbih.tapToCount', 'Appuyez pour compter', 'Zum Zählen tippen', 'Toque para contar', 'Saymak için dokun', 'گننے کے لیے ٹیپ کریں', 'Ketuk untuk menghitung', 'Ketuk untuk mengira', 'गिनने के लिए टैप करें', 'গুণতে ট্যাপ করুন', 'Нажмите для счёта')
t('tasbih.todayBreakdown', 'Détail du jour', 'Heutige Aufschlüsselung', 'Desglose de hoy', 'Bugünün Ayrıntısı', 'آج کی تفصیل', 'Rincian Hari Ini', 'Perincian Hari Ini', 'आज की तफ़सील', 'আজকের বিশ্লেষণ', 'Разбивка за сегодня')
t('tasbih.todaysCount', 'Compteur du jour', 'Heutige Zählung', 'Conteo de hoy', 'Bugünün Sayımı', 'آج کا شمار', 'Hitungan Hari Ini', 'Kiraan Hari Ini', 'आज की गिनती', 'আজকের গণনা', 'Сегодняшний счёт')
t('tasbih.vibration', 'Vibration', 'Vibration', 'Vibración', 'Titreşim', 'وائبریشن', 'Getaran', 'Getaran', 'कंपन', 'ভাইব্রেশন', 'Вибрация')

# ===== widget (remaining) =====
t('widget.gold', 'Or', 'Gold', 'Dorado', 'Altın', 'سنہری', 'Emas', 'Emas', 'सोना', 'সোনালী', 'Золотой')
t('widget.miscAzkar', 'Adhkar divers', 'Verschiedene Adhkar', 'Adhkar diversos', 'Çeşitli Zikirler', 'متفرق اذکار', 'Dzikir Lainnya', 'Zikir Pelbagai', 'विविध अज़कार', 'বিবিধ আযকার', 'Разные азкары')
t('widget.orange', 'Orange', 'Orange', 'Naranja', 'Turuncu', 'نارنجی', 'Oranye', 'Oren', 'नारंगी', 'কমলা', 'Оранжевый')

# ===== widgets (remaining) =====
t('widgets.addToHomeScreen', 'Ajouter à l\'écran d\'accueil', 'Zum Startbildschirm hinzufügen', 'Agregar a la pantalla de inicio', 'Ana Ekrana Ekle', 'ہوم اسکرین میں شامل', 'Tambah ke Layar Utama', 'Tambah ke Skrin Utama', 'होम स्क्रीन पर जोड़ें', 'হোম স্ক্রিনে যোগ', 'Добавить на главный экран')
t('widgets.addWidgetIosInstructions', 'Appuyez longuement sur l\'écran d\'accueil puis appuyez sur "+" pour ajouter un widget', 'Halten Sie den Startbildschirm gedrückt und tippen Sie auf "+", um ein Widget hinzuzufügen', 'Mantenga pulsada la pantalla de inicio y toque "+" para agregar un widget', 'Ana ekranda uzun basın ve "+" simgesine dokunarak widget ekleyin', 'ہوم اسکرین پر دیر تک دبائیں پھر "+" دبا کر ویجٹ شامل کریں', 'Tekan lama layar utama lalu ketuk "+" untuk menambah widget', 'Tekan lama skrin utama lalu ketuk "+" untuk tambah widget', 'होम स्क्रीन पर लंबा दबाएँ फिर "+" से विजेट जोड़ें', 'হোম স্ক্রিনে দীর্ঘ চাপ দিন তারপর "+" দিয়ে উইজেট যোগ করুন', 'Удерживайте главный экран, затем нажмите "+" для добавления виджета')
t('widgets.addWidgetRequested', 'Demande d\'ajout de widget', 'Widget-Hinzufügung angefordert', 'Solicitud de agregar widget', 'Widget ekleme istendi', 'ویجٹ شامل کرنے کی درخواست', 'Permintaan tambah widget', 'Permintaan tambah widget', 'विजेट जोड़ने की अनुरोध', 'উইজেট যোগ অনুরোধ', 'Запрос на добавление виджета')
t('widgets.azkarCategories', 'Catégories d\'adhkar', 'Adhkar-Kategorien', 'Categorías de adhkar', 'Zikir Kategorileri', 'اذکار کی اقسام', 'Kategori Dzikir', 'Kategori Zikir', 'अज़कार श्रेणियाँ', 'আযকার বিভাগ', 'Категории азкаров')
t('widgets.azkarDesc', 'Adhkar et duas quotidiens', 'Tägliche Adhkar und Duas', 'Adhkar y duas diarios', 'Günlük zikirler ve dualar', 'روزانہ اذکار و دعائیں', 'Dzikir dan doa harian', 'Zikir dan doa harian', 'दैनिक अज़कार और दुआएँ', 'দৈনিক আযকার ও দোয়া', 'Ежедневные азкары и дуа')
t('widgets.azkarTitle', 'Adhkar quotidiens', 'Tägliche Adhkar', 'Adhkar diarios', 'Günlük Zikirler', 'روزانہ اذکار', 'Dzikir Harian', 'Zikir Harian', 'दैनिक अज़कार', 'দৈনিক আযকার', 'Ежедневные азкары')
t('widgets.azkarWidget', 'Widget d\'adhkar', 'Adhkar-Widget', 'Widget de adhkar', 'Zikir Widget\'ı', 'اذکار ویجٹ', 'Widget Dzikir', 'Widget Zikir', 'अज़कार विजेट', 'আযকার উইজেট', 'Виджет азкаров')
t('widgets.cancel', 'Annuler', 'Abbrechen', 'Cancelar', 'İptal', 'منسوخ', 'Batal', 'Batal', 'रद्द', 'বাতিল', 'Отмена')
t('widgets.dailyAyahDesc', 'Un nouveau verset coranique chaque jour', 'Jeden Tag ein neuer Koranvers', 'Un nuevo versículo coránico cada día', 'Her gün yeni bir Kur\'an ayeti', 'ہر دن نئی قرآنی آیت', 'Ayat Al-Quran baru setiap hari', 'Ayat Al-Quran baru setiap hari', 'रोज़ नई क़ुरआनी आयत', 'প্রতিদিন নতুন কুরআনি আয়াত', 'Новый аят Корана каждый день')
t('widgets.dailyAyahTitle', 'Verset du jour', 'Vers des Tages', 'Versículo del día', 'Günün Ayeti', 'آج کی آیت', 'Ayat Hari Ini', 'Ayat Hari Ini', 'आज की आयत', 'আজকের আয়াত', 'Аят дня')
t('widgets.dailyDhikrDesc', 'Dhikr quotidien des adhkar', 'Tägliches Dhikr aus den Adhkar', 'Dhikr diario de los adhkar', 'Günlük zikir', 'روزانہ ذکر', 'Dzikir harian dari dzikir', 'Zikir harian dari zikir', 'अज़कार से दैनिक ज़िक्र', 'আযকার থেকে দৈনিক যিকর', 'Ежедневный зикр из азкаров')
t('widgets.dailyDhikrTitle', 'Dhikr du jour', 'Dhikr des Tages', 'Dhikr del día', 'Günün Zikri', 'آج کا ذکر', 'Dzikir Hari Ini', 'Zikir Hari Ini', 'आज का ज़िक्र', 'আজকের যিকর', 'Зикр дня')
t('widgets.dhikrWidget', 'Widget de dhikr', 'Dhikr-Widget', 'Widget de dhikr', 'Zikir Widget\'ı', 'ذکر ویجٹ', 'Widget Dzikir', 'Widget Zikir', 'ज़िक्र विजेट', 'যিকর উইজেট', 'Виджет зикра')
t('widgets.enable', 'Activer', 'Aktivieren', 'Activar', 'Etkinleştir', 'فعال', 'Aktifkan', 'Aktifkan', 'सक्षम', 'সক্রিয়', 'Включить')
t('widgets.enableWidgets', 'Activer les widgets', 'Widgets aktivieren', 'Activar widgets', 'Widget\'ları Etkinleştir', 'ویجٹس فعال', 'Aktifkan Widget', 'Aktifkan Widget', 'विजेट सक्षम', 'উইজেট সক্রিয়', 'Включить виджеты')
t('widgets.enableWidgetsDesc', 'Activez les widgets pour afficher des infos sur votre écran', 'Aktivieren Sie Widgets, um Infos auf Ihrem Bildschirm anzuzeigen', 'Active los widgets para mostrar información en su pantalla', 'Widget\'ları ekranınızda bilgi göstermek için etkinleştirin', 'اسکرین پر معلومات دکھانے کے لیے ویجٹس فعال', 'Aktifkan widget untuk menampilkan info di layar', 'Aktifkan widget untuk papar info di skrin', 'स्क्रीन पर जानकारी दिखाने के लिए विजेट सक्षम', 'স্ক্রিনে তথ্য দেখাতে উইজেট সক্রিয়', 'Включите виджеты для показа информации на экране')
t('widgets.generalSettings', 'Paramètres généraux', 'Allgemeine Einstellungen', 'Configuración general', 'Genel Ayarlar', 'عام ترتیبات', 'Pengaturan Umum', 'Tetapan Umum', 'सामान्य सेटिंग्स', 'সাধারণ সেটিংস', 'Общие настройки')
t('widgets.hijriDesc', 'Date du calendrier hijri quotidien', 'Tägliches Hijri-Datum', 'Fecha del calendario Hijri diario', 'Günlük Hicri tarih', 'روزانہ ہجری تاریخ', 'Tanggal Hijriah harian', 'Tarikh Hijrah harian', 'दैनिक हिजरी तारीख़', 'দৈনিক হিজরি তারিখ', 'Ежедневная дата по хиджре')
t('widgets.hijriTitle', 'Date hijri', 'Hijri-Datum', 'Fecha Hijri', 'Hicri Tarih', 'ہجری تاریخ', 'Tanggal Hijriah', 'Tarikh Hijrah', 'हिजरी तारीख़', 'হিজরি তারিখ', 'Дата хиджры')
t('widgets.hijriWidget', 'Widget hijri', 'Hijri-Widget', 'Widget Hijri', 'Hicri Widget', 'ہجری ویجٹ', 'Widget Hijriah', 'Widget Hijrah', 'हिजरी विजेट', 'হিজরি উইজেট', 'Виджет хиджры')
t('widgets.nextPrayer', 'Prochaine prière', 'Nächstes Gebet', 'Próxima oración', 'Sonraki Namaz', 'اگلی نماز', 'Shalat Berikutnya', 'Solat Seterusnya', 'अगली नमाज़', 'পরবর্তী নামাজ', 'Следующая молитва')
t('widgets.note', 'Note', 'Hinweis', 'Nota', 'Not', 'نوٹ', 'Catatan', 'Nota', 'नोट', 'নোট', 'Заметка')
t('widgets.prayerTimesDesc', 'Cinq horaires de prière quotidiens', 'Fünf tägliche Gebetszeiten', 'Cinco horarios de oración diarios', 'Beş vakit namaz', 'پانچ نمازوں کے اوقات', 'Lima waktu shalat harian', 'Lima waktu solat harian', 'पाँच दैनिक नमाज़ समय', 'পাঁচ ওয়াক্ত নামাজের সময়', 'Пять ежедневных молитв')
t('widgets.prayerTimesTitle', 'Horaires de prière', 'Gebetszeiten', 'Horarios de oración', 'Namaz Vakitleri', 'نماز کے اوقات', 'Waktu Shalat', 'Waktu Solat', 'नमाज़ समय', 'নামাজের সময়', 'Время молитв')
t('widgets.prayerTimesWidget', 'Widget des horaires de prière', 'Gebetszeiten-Widget', 'Widget de horarios de oración', 'Namaz Vakitleri Widget\'ı', 'نماز اوقات ویجٹ', 'Widget Waktu Shalat', 'Widget Waktu Solat', 'नमाज़ समय विजेट', 'নামাজের সময় উইজেট', 'Виджет времени молитв')
t('widgets.reset', 'Réinitialiser', 'Zurücksetzen', 'Restablecer', 'Sıfırla', 'ری سیٹ', 'Reset', 'Tetapkan Semula', 'रीसेट', 'রিসেট', 'Сбросить')
t('widgets.resetConfirm', 'Réinitialiser les paramètres ?', 'Einstellungen zurücksetzen?', '¿Restablecer configuración?', 'Ayarları sıfırla?', 'ترتیبات ری سیٹ؟', 'Reset pengaturan?', 'Tetapkan semula tetapan?', 'सेटिंग्स रीसेट?', 'সেটিংস রিসেট?', 'Сбросить настройки?')
t('widgets.saveChanges', 'Enregistrer les modifications', 'Änderungen speichern', 'Guardar cambios', 'Değişiklikleri Kaydet', 'تبدیلیاں محفوظ', 'Simpan Perubahan', 'Simpan Perubahan', 'बदलाव सहेजें', 'পরিবর্তন সংরক্ষণ', 'Сохранить изменения')
t('widgets.selectAtLeastOneCategory', 'Sélectionnez au moins une catégorie', 'Wählen Sie mindestens eine Kategorie', 'Seleccione al menos una categoría', 'En az bir kategori seçin', 'کم از کم ایک قسم منتخب', 'Pilih setidaknya satu kategori', 'Pilih sekurang-kurangnya satu kategori', 'कम से कम एक श्रेणी चुनें', 'অন্তত একটি বিভাগ বেছে নিন', 'Выберите хотя бы одну категорию')
t('widgets.settingsSaved', 'Paramètres enregistrés', 'Einstellungen gespeichert', 'Configuración guardada', 'Ayarlar kaydedildi', 'ترتیبات محفوظ', 'Pengaturan disimpan', 'Tetapan disimpan', 'सेटिंग्स सहेजी', 'সেটিংস সংরক্ষিত', 'Настройки сохранены')

print(f"Part 8 loaded. Total entries: {len(TR)}")
