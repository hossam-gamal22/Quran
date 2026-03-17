#!/usr/bin/env python3
"""
Add new translation keys for settings pages to all 12 language blocks
in constants/translations.ts
"""
import re
import os

TRANSLATIONS_FILE = os.path.join(os.path.dirname(__file__), '..', 'constants', 'translations.ts')

# ============================
# New keys to add to `settings` section
# ============================
SETTINGS_KEYS = {
    'ar': {
        'prayerAndAzkarAlerts': 'تنبيهات الصلاة والأذكار',
        'liveActivities': 'الأنشطة الحالية',
        'subscription': 'الاشتراك',
        'premium': 'روح المسلم بريميوم',
        'suggestFeature': 'اقتراح ميزة جديدة',
        'suggestFeatureTitle': 'اقتراح ميزة جديدة 💡',
        'suggestFeatureDesc': 'شاركنا أفكارك لتحسين التطبيق',
        'suggestPlaceholder': 'اكتب اقتراحك هنا...',
        'sendSuggestion': 'إرسال',
        'suggestionAlert': 'تنبيه',
        'suggestionEmpty': 'يرجى كتابة اقتراحك أولاً',
        'suggestionThanks': 'شكراً لك ❤️',
        'suggestionSuccess': 'تم إرسال اقتراحك بنجاح، سنعمل على دراسته',
        'suggestionError': 'خطأ',
        'suggestionErrorMsg': 'حدث خطأ أثناء الإرسال',
        'generalFontSize': 'حجم الخط العام',
        'preview': 'معاينة',
        'homeLayout': 'شكل الصفحة الرئيسية',
        'grid': 'شبكة',
        'list': 'قائمة',
        'colorBackgrounds': 'خلفيات الألوان',
        'photoBackgrounds': 'خلفيات الصور',
    },
    'en': {
        'prayerAndAzkarAlerts': 'Prayer & Azkar Alerts',
        'liveActivities': 'Live Activities',
        'subscription': 'Subscription',
        'premium': 'Rooh Al-Muslim Premium',
        'suggestFeature': 'Suggest a Feature',
        'suggestFeatureTitle': 'Suggest a Feature 💡',
        'suggestFeatureDesc': 'Share your ideas to improve the app',
        'suggestPlaceholder': 'Write your suggestion here...',
        'sendSuggestion': 'Send',
        'suggestionAlert': 'Alert',
        'suggestionEmpty': 'Please write your suggestion first',
        'suggestionThanks': 'Thank you ❤️',
        'suggestionSuccess': 'Your suggestion has been sent successfully',
        'suggestionError': 'Error',
        'suggestionErrorMsg': 'An error occurred while sending',
        'generalFontSize': 'General Font Size',
        'preview': 'Preview',
        'homeLayout': 'Home Page Layout',
        'grid': 'Grid',
        'list': 'List',
        'colorBackgrounds': 'Color Backgrounds',
        'photoBackgrounds': 'Photo Backgrounds',
    },
    'fr': {
        'prayerAndAzkarAlerts': 'Alertes de prière et Azkar',
        'liveActivities': 'Activités en direct',
        'subscription': 'Abonnement',
        'premium': 'Rooh Al-Muslim Premium',
        'suggestFeature': 'Suggérer une fonctionnalité',
        'suggestFeatureTitle': 'Suggérer une fonctionnalité 💡',
        'suggestFeatureDesc': 'Partagez vos idées pour améliorer l\'application',
        'suggestPlaceholder': 'Écrivez votre suggestion ici...',
        'sendSuggestion': 'Envoyer',
        'suggestionAlert': 'Alerte',
        'suggestionEmpty': 'Veuillez écrire votre suggestion',
        'suggestionThanks': 'Merci ❤️',
        'suggestionSuccess': 'Votre suggestion a été envoyée avec succès',
        'suggestionError': 'Erreur',
        'suggestionErrorMsg': 'Une erreur est survenue',
        'generalFontSize': 'Taille de police générale',
        'preview': 'Aperçu',
        'homeLayout': 'Mise en page d\'accueil',
        'grid': 'Grille',
        'list': 'Liste',
        'colorBackgrounds': 'Arrière-plans couleur',
        'photoBackgrounds': 'Arrière-plans photo',
    },
    'de': {
        'prayerAndAzkarAlerts': 'Gebets- und Azkar-Benachrichtigungen',
        'liveActivities': 'Live-Aktivitäten',
        'subscription': 'Abonnement',
        'premium': 'Rooh Al-Muslim Premium',
        'suggestFeature': 'Feature vorschlagen',
        'suggestFeatureTitle': 'Feature vorschlagen 💡',
        'suggestFeatureDesc': 'Teilen Sie Ihre Ideen zur Verbesserung der App',
        'suggestPlaceholder': 'Schreiben Sie Ihren Vorschlag hier...',
        'sendSuggestion': 'Senden',
        'suggestionAlert': 'Hinweis',
        'suggestionEmpty': 'Bitte schreiben Sie Ihren Vorschlag',
        'suggestionThanks': 'Danke ❤️',
        'suggestionSuccess': 'Ihr Vorschlag wurde erfolgreich gesendet',
        'suggestionError': 'Fehler',
        'suggestionErrorMsg': 'Beim Senden ist ein Fehler aufgetreten',
        'generalFontSize': 'Allgemeine Schriftgröße',
        'preview': 'Vorschau',
        'homeLayout': 'Startseiten-Layout',
        'grid': 'Raster',
        'list': 'Liste',
        'colorBackgrounds': 'Farbhintergründe',
        'photoBackgrounds': 'Fotohintergründe',
    },
    'tr': {
        'prayerAndAzkarAlerts': 'Namaz ve Zikir Bildirimleri',
        'liveActivities': 'Canlı Etkinlikler',
        'subscription': 'Abonelik',
        'premium': 'Rooh Al-Muslim Premium',
        'suggestFeature': 'Özellik Öner',
        'suggestFeatureTitle': 'Özellik Öner 💡',
        'suggestFeatureDesc': 'Uygulamayı geliştirmek için fikirlerinizi paylaşın',
        'suggestPlaceholder': 'Önerinizi buraya yazın...',
        'sendSuggestion': 'Gönder',
        'suggestionAlert': 'Uyarı',
        'suggestionEmpty': 'Lütfen önce önerinizi yazın',
        'suggestionThanks': 'Teşekkürler ❤️',
        'suggestionSuccess': 'Öneriniz başarıyla gönderildi',
        'suggestionError': 'Hata',
        'suggestionErrorMsg': 'Gönderilirken bir hata oluştu',
        'generalFontSize': 'Genel Yazı Boyutu',
        'preview': 'Önizleme',
        'homeLayout': 'Ana Sayfa Düzeni',
        'grid': 'Izgara',
        'list': 'Liste',
        'colorBackgrounds': 'Renk Arka Planları',
        'photoBackgrounds': 'Fotoğraf Arka Planları',
    },
    'es': {
        'prayerAndAzkarAlerts': 'Alertas de Oración y Azkar',
        'liveActivities': 'Actividades en vivo',
        'subscription': 'Suscripción',
        'premium': 'Rooh Al-Muslim Premium',
        'suggestFeature': 'Sugerir una función',
        'suggestFeatureTitle': 'Sugerir una función 💡',
        'suggestFeatureDesc': 'Comparte tus ideas para mejorar la app',
        'suggestPlaceholder': 'Escribe tu sugerencia aquí...',
        'sendSuggestion': 'Enviar',
        'suggestionAlert': 'Alerta',
        'suggestionEmpty': 'Por favor escribe tu sugerencia primero',
        'suggestionThanks': 'Gracias ❤️',
        'suggestionSuccess': 'Tu sugerencia ha sido enviada exitosamente',
        'suggestionError': 'Error',
        'suggestionErrorMsg': 'Ocurrió un error al enviar',
        'generalFontSize': 'Tamaño de fuente general',
        'preview': 'Vista previa',
        'homeLayout': 'Diseño de página principal',
        'grid': 'Cuadrícula',
        'list': 'Lista',
        'colorBackgrounds': 'Fondos de color',
        'photoBackgrounds': 'Fondos de fotos',
    },
    'ur': {
        'prayerAndAzkarAlerts': 'نماز اور اذکار کی اطلاعات',
        'liveActivities': 'لائیو سرگرمیاں',
        'subscription': 'سبسکرپشن',
        'premium': 'روح المسلم پریمیم',
        'suggestFeature': 'فیچر تجویز کریں',
        'suggestFeatureTitle': 'فیچر تجویز کریں 💡',
        'suggestFeatureDesc': 'ایپ کو بہتر بنانے کے لیے اپنے خیالات شیئر کریں',
        'suggestPlaceholder': 'اپنی تجویز یہاں لکھیں...',
        'sendSuggestion': 'بھیجیں',
        'suggestionAlert': 'تنبیہ',
        'suggestionEmpty': 'براہ کرم پہلے اپنی تجویز لکھیں',
        'suggestionThanks': 'شکریہ ❤️',
        'suggestionSuccess': 'آپ کی تجویز کامیابی سے بھیج دی گئی',
        'suggestionError': 'خرابی',
        'suggestionErrorMsg': 'بھیجنے میں خرابی ہوئی',
        'generalFontSize': 'عام فونٹ سائز',
        'preview': 'پیش نظارہ',
        'homeLayout': 'ہوم پیج لے آؤٹ',
        'grid': 'گرڈ',
        'list': 'فہرست',
        'colorBackgrounds': 'رنگین پس منظر',
        'photoBackgrounds': 'تصویری پس منظر',
    },
    'id': {
        'prayerAndAzkarAlerts': 'Notifikasi Shalat & Dzikir',
        'liveActivities': 'Aktivitas Langsung',
        'subscription': 'Langganan',
        'premium': 'Rooh Al-Muslim Premium',
        'suggestFeature': 'Sarankan Fitur',
        'suggestFeatureTitle': 'Sarankan Fitur 💡',
        'suggestFeatureDesc': 'Bagikan ide Anda untuk meningkatkan aplikasi',
        'suggestPlaceholder': 'Tulis saran Anda di sini...',
        'sendSuggestion': 'Kirim',
        'suggestionAlert': 'Peringatan',
        'suggestionEmpty': 'Silakan tulis saran Anda terlebih dahulu',
        'suggestionThanks': 'Terima kasih ❤️',
        'suggestionSuccess': 'Saran Anda berhasil dikirim',
        'suggestionError': 'Kesalahan',
        'suggestionErrorMsg': 'Terjadi kesalahan saat mengirim',
        'generalFontSize': 'Ukuran Font Umum',
        'preview': 'Pratinjau',
        'homeLayout': 'Tata Letak Halaman Utama',
        'grid': 'Kotak',
        'list': 'Daftar',
        'colorBackgrounds': 'Latar Belakang Warna',
        'photoBackgrounds': 'Latar Belakang Foto',
    },
    'ms': {
        'prayerAndAzkarAlerts': 'Pemberitahuan Solat & Zikir',
        'liveActivities': 'Aktiviti Langsung',
        'subscription': 'Langganan',
        'premium': 'Rooh Al-Muslim Premium',
        'suggestFeature': 'Cadangkan Ciri',
        'suggestFeatureTitle': 'Cadangkan Ciri 💡',
        'suggestFeatureDesc': 'Kongsi idea anda untuk menambah baik aplikasi',
        'suggestPlaceholder': 'Tulis cadangan anda di sini...',
        'sendSuggestion': 'Hantar',
        'suggestionAlert': 'Amaran',
        'suggestionEmpty': 'Sila tulis cadangan anda dahulu',
        'suggestionThanks': 'Terima kasih ❤️',
        'suggestionSuccess': 'Cadangan anda telah berjaya dihantar',
        'suggestionError': 'Ralat',
        'suggestionErrorMsg': 'Ralat berlaku semasa menghantar',
        'generalFontSize': 'Saiz Fon Umum',
        'preview': 'Pratonton',
        'homeLayout': 'Susun Atur Halaman Utama',
        'grid': 'Grid',
        'list': 'Senarai',
        'colorBackgrounds': 'Latar Belakang Warna',
        'photoBackgrounds': 'Latar Belakang Foto',
    },
    'hi': {
        'prayerAndAzkarAlerts': 'नमाज़ और अज़कार अलर्ट',
        'liveActivities': 'लाइव गतिविधियाँ',
        'subscription': 'सदस्यता',
        'premium': 'रूह अल-मुस्लिम प्रीमियम',
        'suggestFeature': 'सुविधा सुझाएं',
        'suggestFeatureTitle': 'सुविधा सुझाएं 💡',
        'suggestFeatureDesc': 'ऐप को बेहतर बनाने के लिए अपने विचार साझा करें',
        'suggestPlaceholder': 'अपना सुझाव यहाँ लिखें...',
        'sendSuggestion': 'भेजें',
        'suggestionAlert': 'चेतावनी',
        'suggestionEmpty': 'कृपया पहले अपना सुझाव लिखें',
        'suggestionThanks': 'धन्यवाद ❤️',
        'suggestionSuccess': 'आपका सुझाव सफलतापूर्वक भेज दिया गया',
        'suggestionError': 'त्रुटि',
        'suggestionErrorMsg': 'भेजने में त्रुटि हुई',
        'generalFontSize': 'सामान्य फ़ॉन्ट आकार',
        'preview': 'पूर्वावलोकन',
        'homeLayout': 'होम पेज लेआउट',
        'grid': 'ग्रिड',
        'list': 'सूची',
        'colorBackgrounds': 'रंग पृष्ठभूमि',
        'photoBackgrounds': 'फोटो पृष्ठभूमि',
    },
    'bn': {
        'prayerAndAzkarAlerts': 'নামাজ ও আজকার সতর্কতা',
        'liveActivities': 'লাইভ কার্যকলাপ',
        'subscription': 'সাবস্ক্রিপশন',
        'premium': 'রূহ আল-মুসলিম প্রিমিয়াম',
        'suggestFeature': 'ফিচার প্রস্তাব করুন',
        'suggestFeatureTitle': 'ফিচার প্রস্তাব করুন 💡',
        'suggestFeatureDesc': 'অ্যাপ উন্নত করতে আপনার ধারণা শেয়ার করুন',
        'suggestPlaceholder': 'আপনার প্রস্তাব এখানে লিখুন...',
        'sendSuggestion': 'পাঠান',
        'suggestionAlert': 'সতর্কতা',
        'suggestionEmpty': 'অনুগ্রহ করে প্রথমে আপনার প্রস্তাব লিখুন',
        'suggestionThanks': 'ধন্যবাদ ❤️',
        'suggestionSuccess': 'আপনার প্রস্তাব সফলভাবে পাঠানো হয়েছে',
        'suggestionError': 'ত্রুটি',
        'suggestionErrorMsg': 'পাঠাতে ত্রুটি হয়েছে',
        'generalFontSize': 'সাধারণ ফন্ট সাইজ',
        'preview': 'প্রিভিউ',
        'homeLayout': 'হোম পেজ লেআউট',
        'grid': 'গ্রিড',
        'list': 'তালিকা',
        'colorBackgrounds': 'রঙ পটভূমি',
        'photoBackgrounds': 'ফটো পটভূমি',
    },
    'ru': {
        'prayerAndAzkarAlerts': 'Уведомления о молитве и азкарах',
        'liveActivities': 'Живые действия',
        'subscription': 'Подписка',
        'premium': 'Rooh Al-Muslim Премиум',
        'suggestFeature': 'Предложить функцию',
        'suggestFeatureTitle': 'Предложить функцию 💡',
        'suggestFeatureDesc': 'Поделитесь идеями для улучшения приложения',
        'suggestPlaceholder': 'Напишите ваше предложение здесь...',
        'sendSuggestion': 'Отправить',
        'suggestionAlert': 'Предупреждение',
        'suggestionEmpty': 'Пожалуйста, сначала напишите предложение',
        'suggestionThanks': 'Спасибо ❤️',
        'suggestionSuccess': 'Ваше предложение успешно отправлено',
        'suggestionError': 'Ошибка',
        'suggestionErrorMsg': 'Произошла ошибка при отправке',
        'generalFontSize': 'Общий размер шрифта',
        'preview': 'Предпросмотр',
        'homeLayout': 'Макет главной страницы',
        'grid': 'Сетка',
        'list': 'Список',
        'colorBackgrounds': 'Цветные фоны',
        'photoBackgrounds': 'Фото фоны',
    },
}

# ============================
# New keys to add to `notificationSounds` section
# ============================
NOTIFICATION_SOUNDS_KEYS = {
    'ar': {
        'salawatProphet': 'الصلاة على النبي ﷺ',
        'subhanallahBihamdihi': 'سبحان الله وبحمده',
        'astaghfirullah': 'أستغفر الله',
        'reminderTone': 'نغمة تذكير',
        'prayer': 'الصلاة',
        'prayerTimesAlerts': 'تنبيهات مواقيت الصلاة والأذان',
        'salawatReminder': 'تذكير بالصلاة على النبي',
        'tasbeeh': 'التسبيح',
        'tasbeehReminder': 'تذكير بالتسبيح والذكر',
        'istighfar': 'الاستغفار',
        'istighfarReminder': 'تذكير بالاستغفار',
        'adhkar': 'الأذكار',
        'adhkarDesc': 'الصباح والمساء والنوم والاستيقاظ',
        'verseOfDay': 'آية اليوم',
        'verseOfDayDesc': 'آية قرآنية يومية مع تفسيرها',
        'customNotification': 'تنبيه آخر',
        'customNotificationDesc': 'تذكير مخصص بالوقت والصوت اللي تحبه',
        'freeText': 'نص حر',
        'quranicVerse': 'آية قرآنية',
        'surah': 'سورة',
        'testSuccess': '✅ تم',
        'testSuccessMsg': 'تم إرسال إشعار فوري + إشعار مجدول بعد 10 ثواني',
        'testError': '❌ خطأ',
        'testErrorMsg': 'فشل إرسال الإشعار: ',
        'notificationsRequired': 'الإشعارات مطلوبة',
        'notificationsRequiredMsg': 'للحصول على تنبيهات الصلاة والأذكار، يرجى تفعيل الإشعارات من إعدادات الجهاز.',
        'openSettings': 'فتح الإعدادات',
        'reminderBeforeAdhan': 'التذكير قبل الأذان',
        'reminderBeforeAdhanBy': 'التذكير قبل الأذان بـ:',
        'selectPrayers': 'اختر الصلوات:',
        'adhanSound': 'صوت الأذان',
        'morningAzkar': 'أذكار الصباح',
        'morningAzkarTime': 'وقت أذكار الصباح',
        'eveningAzkar': 'أذكار المساء',
        'eveningAzkarTime': 'وقت أذكار المساء',
        'sleepAzkar': 'أذكار النوم',
        'sleepAzkarTime': 'وقت أذكار النوم',
        'wakeupAzkar': 'أذكار الاستيقاظ',
        'wakeupAzkarTime': 'وقت أذكار الاستيقاظ',
        'afterPrayerAzkar': 'أذكار بعد الصلاة',
        'afterPrayerAutoMsg': 'يُرسل التذكير بعد كل صلاة تلقائياً',
        'reminderSound': 'صوت التذكير',
        'selectedAdhanSound': 'صوت الأذان المختار',
        'soundLabel': 'الصوت:',
        'defaultTone': 'نغمة افتراضية',
        'reminderDays': 'أيام التذكير',
        'customSelection': 'تحديد مخصص',
        'allDays': 'كل الأيام',
        'testNotification': 'تجربة الإشعار',
        'reminderTime': 'وقت التذكير',
        'reminderType': 'نوع التذكير',
        'reminderTextPlaceholder': 'نص التذكير',
        'customTitlePlaceholder': 'عنوان مخصص (اختياري)',
        'chooseSurah': 'اختر سورة',
    },
    'en': {
        'salawatProphet': 'Salawat on the Prophet ﷺ',
        'subhanallahBihamdihi': 'SubhanAllah wa bihamdihi',
        'astaghfirullah': 'Astaghfirullah',
        'reminderTone': 'Reminder tone',
        'prayer': 'Prayer',
        'prayerTimesAlerts': 'Prayer times and adhan alerts',
        'salawatReminder': 'Reminder for Salawat on the Prophet',
        'tasbeeh': 'Tasbeeh',
        'tasbeehReminder': 'Reminder for tasbeeh and dhikr',
        'istighfar': 'Istighfar',
        'istighfarReminder': 'Reminder for istighfar',
        'adhkar': 'Adhkar',
        'adhkarDesc': 'Morning, evening, sleep, and wake-up',
        'verseOfDay': 'Verse of the Day',
        'verseOfDayDesc': 'Daily Quranic verse with tafsir',
        'customNotification': 'Custom Notification',
        'customNotificationDesc': 'Custom reminder with your preferred time and sound',
        'freeText': 'Free Text',
        'quranicVerse': 'Quranic Verse',
        'surah': 'Surah',
        'testSuccess': '✅ Done',
        'testSuccessMsg': 'Sent an immediate notification + a scheduled one in 10 seconds',
        'testError': '❌ Error',
        'testErrorMsg': 'Failed to send notification: ',
        'notificationsRequired': 'Notifications Required',
        'notificationsRequiredMsg': 'To receive prayer and azkar alerts, please enable notifications in device settings.',
        'openSettings': 'Open Settings',
        'reminderBeforeAdhan': 'Reminder before adhan',
        'reminderBeforeAdhanBy': 'Remind before adhan by:',
        'selectPrayers': 'Select prayers:',
        'adhanSound': 'Adhan Sound',
        'morningAzkar': 'Morning Azkar',
        'morningAzkarTime': 'Morning Azkar Time',
        'eveningAzkar': 'Evening Azkar',
        'eveningAzkarTime': 'Evening Azkar Time',
        'sleepAzkar': 'Sleep Azkar',
        'sleepAzkarTime': 'Sleep Azkar Time',
        'wakeupAzkar': 'Wake-up Azkar',
        'wakeupAzkarTime': 'Wake-up Azkar Time',
        'afterPrayerAzkar': 'After Prayer Azkar',
        'afterPrayerAutoMsg': 'Reminder sent automatically after each prayer',
        'reminderSound': 'Reminder Sound',
        'selectedAdhanSound': 'Selected adhan sound',
        'soundLabel': 'Sound:',
        'defaultTone': 'Default tone',
        'reminderDays': 'Reminder Days',
        'customSelection': 'Custom selection',
        'allDays': 'All days',
        'testNotification': 'Test Notification',
        'reminderTime': 'Reminder Time',
        'reminderType': 'Reminder Type',
        'reminderTextPlaceholder': 'Reminder text',
        'customTitlePlaceholder': 'Custom title (optional)',
        'chooseSurah': 'Choose Surah',
    },
    'fr': {
        'salawatProphet': 'Salawat sur le Prophète ﷺ',
        'subhanallahBihamdihi': 'SubhanAllah wa bihamdihi',
        'astaghfirullah': 'Astaghfirullah',
        'reminderTone': 'Tonalité de rappel',
        'prayer': 'Prière',
        'prayerTimesAlerts': 'Alertes des heures de prière et adhan',
        'salawatReminder': 'Rappel de salawat sur le Prophète',
        'tasbeeh': 'Tasbeeh',
        'tasbeehReminder': 'Rappel de tasbeeh et dhikr',
        'istighfar': 'Istighfar',
        'istighfarReminder': 'Rappel d\'istighfar',
        'adhkar': 'Adhkar',
        'adhkarDesc': 'Matin, soir, sommeil et réveil',
        'verseOfDay': 'Verset du jour',
        'verseOfDayDesc': 'Verset coranique quotidien avec tafsir',
        'customNotification': 'Notification personnalisée',
        'customNotificationDesc': 'Rappel personnalisé avec l\'heure et le son de votre choix',
        'freeText': 'Texte libre',
        'quranicVerse': 'Verset coranique',
        'surah': 'Sourate',
        'testSuccess': '✅ Fait',
        'testSuccessMsg': 'Notification envoyée + une programmée dans 10 secondes',
        'testError': '❌ Erreur',
        'testErrorMsg': 'Échec de l\'envoi: ',
        'notificationsRequired': 'Notifications requises',
        'notificationsRequiredMsg': 'Pour recevoir les alertes, veuillez activer les notifications dans les paramètres.',
        'openSettings': 'Ouvrir les paramètres',
        'reminderBeforeAdhan': 'Rappel avant l\'adhan',
        'reminderBeforeAdhanBy': 'Rappeler avant l\'adhan de:',
        'selectPrayers': 'Sélectionner les prières:',
        'adhanSound': 'Son de l\'adhan',
        'morningAzkar': 'Azkar du matin',
        'morningAzkarTime': 'Heure des azkar du matin',
        'eveningAzkar': 'Azkar du soir',
        'eveningAzkarTime': 'Heure des azkar du soir',
        'sleepAzkar': 'Azkar du sommeil',
        'sleepAzkarTime': 'Heure des azkar du sommeil',
        'wakeupAzkar': 'Azkar du réveil',
        'wakeupAzkarTime': 'Heure des azkar du réveil',
        'afterPrayerAzkar': 'Azkar après la prière',
        'afterPrayerAutoMsg': 'Rappel envoyé automatiquement après chaque prière',
        'reminderSound': 'Son du rappel',
        'selectedAdhanSound': 'Son de l\'adhan sélectionné',
        'soundLabel': 'Son:',
        'defaultTone': 'Tonalité par défaut',
        'reminderDays': 'Jours de rappel',
        'customSelection': 'Sélection personnalisée',
        'allDays': 'Tous les jours',
        'testNotification': 'Tester la notification',
        'reminderTime': 'Heure du rappel',
        'reminderType': 'Type de rappel',
        'reminderTextPlaceholder': 'Texte du rappel',
        'customTitlePlaceholder': 'Titre personnalisé (optionnel)',
        'chooseSurah': 'Choisir une sourate',
    },
}

# For languages not fully specified, use English as fallback
for lang in ['de', 'tr', 'es', 'ur', 'id', 'ms', 'hi', 'bn', 'ru']:
    if lang not in NOTIFICATION_SOUNDS_KEYS:
        NOTIFICATION_SOUNDS_KEYS[lang] = dict(NOTIFICATION_SOUNDS_KEYS['en'])


def add_keys_to_section(content, lang_marker, section_name, new_keys):
    """
    Find the section in a specific language block and add keys before the closing brace.
    
    Strategy: Find the language block start, then find the section within it,
    then find its closing `},` and insert before it.
    """
    # Find the language block
    lang_start = content.find(lang_marker)
    if lang_start == -1:
        print(f"  WARNING: Could not find language marker: {lang_marker}")
        return content
    
    # Find the section within this language block
    # We need to search after lang_start
    section_search = f"  {section_name}: {{"
    section_start = content.find(section_search, lang_start)
    if section_start == -1:
        # Try alternative format
        section_search = f"  {section_name}:{{"
        section_start = content.find(section_search, lang_start)
    if section_start == -1:
        print(f"  WARNING: Could not find section '{section_name}' in language block starting at {lang_start}")
        return content
    
    # Make sure this section is within the current language block (not the next one)
    # Find the next language block start
    next_lang_markers = [
        "const ar: TranslationKeys",
        "const en: TranslationKeys",
        "const fr: TranslationKeys",
        "const de: TranslationKeys",
        "const tr: TranslationKeys",
        "const es: TranslationKeys",
        "const ur: TranslationKeys",
        "const id: TranslationKeys",
        "const ms: TranslationKeys",
        "const hi: TranslationKeys",
        "const bn: TranslationKeys",
        "const ru: TranslationKeys",
    ]
    
    next_lang_start = len(content)
    for marker in next_lang_markers:
        pos = content.find(marker, lang_start + len(lang_marker))
        if pos != -1 and pos < next_lang_start:
            next_lang_start = pos
    
    if section_start >= next_lang_start:
        print(f"  WARNING: Section '{section_name}' found outside language block")
        return content
    
    # Now find the closing `},` for this section
    # We need to count braces
    brace_count = 0
    i = content.index('{', section_start)
    closing_pos = -1
    while i < len(content):
        if content[i] == '{':
            brace_count += 1
        elif content[i] == '}':
            brace_count -= 1
            if brace_count == 0:
                closing_pos = i
                break
        i += 1
    
    if closing_pos == -1:
        print(f"  WARNING: Could not find closing brace for section '{section_name}'")
        return content
    
    # Build the new keys string
    lines = []
    for key, value in new_keys.items():
        # Check if the key already exists in this section
        section_content = content[section_start:closing_pos]
        key_pattern = f"    {key}:"
        if key_pattern in section_content:
            continue  # Skip existing keys
        # Escape single quotes in value
        escaped_value = value.replace("'", "\\'")
        lines.append(f"    {key}: '{escaped_value}',")
    
    if not lines:
        return content  # All keys already exist
    
    new_text = '\n'.join(lines) + '\n'
    
    # Insert before the closing brace
    content = content[:closing_pos] + new_text + '  ' + content[closing_pos:]
    
    return content


def add_interface_keys(content, section_name, new_keys):
    """Add keys to the TranslationKeys interface."""
    # Find the interface section
    search = f"  {section_name}: {{"
    section_start = content.find(search)
    if section_start == -1:
        print(f"  WARNING: Could not find interface section '{section_name}'")
        return content
    
    # Find closing brace
    brace_count = 0
    i = content.index('{', section_start)
    closing_pos = -1
    while i < len(content):
        if content[i] == '{':
            brace_count += 1
        elif content[i] == '}':
            brace_count -= 1
            if brace_count == 0:
                closing_pos = i
                break
        i += 1
    
    if closing_pos == -1:
        print(f"  WARNING: Could not find closing brace for interface '{section_name}'")
        return content
    
    section_content = content[section_start:closing_pos]
    
    lines = []
    for key in new_keys:
        key_pattern = f"    {key}:"
        if key_pattern in section_content:
            continue
        lines.append(f"    {key}: string;")
    
    if not lines:
        return content
    
    new_text = '\n'.join(lines) + '\n'
    content = content[:closing_pos] + new_text + '  ' + content[closing_pos:]
    
    return content


def main():
    with open(TRANSLATIONS_FILE, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_len = len(content)
    
    # 1. Add to TranslationKeys interface
    print("Adding to TranslationKeys interface...")
    settings_interface_keys = list(SETTINGS_KEYS['en'].keys())
    content = add_interface_keys(content, 'settings', settings_interface_keys)
    
    ns_interface_keys = list(NOTIFICATION_SOUNDS_KEYS['en'].keys())
    content = add_interface_keys(content, 'notificationSounds', ns_interface_keys)
    
    # 2. Add translations to each language block
    lang_markers = {
        'ar': 'const ar: TranslationKeys',
        'en': 'const en: TranslationKeys',
        'fr': 'const fr: TranslationKeys',
        'de': 'const de: TranslationKeys',
        'tr': 'const tr: TranslationKeys',
        'es': 'const es: TranslationKeys',
        'ur': 'const ur: TranslationKeys',
        'id': 'const id: TranslationKeys',
        'ms': 'const ms: TranslationKeys',
        'hi': 'const hi: TranslationKeys',
        'bn': 'const bn: TranslationKeys',
        'ru': 'const ru: TranslationKeys',
    }
    
    for lang, marker in lang_markers.items():
        print(f"Processing language: {lang}")
        
        # Add settings keys
        if lang in SETTINGS_KEYS:
            content = add_keys_to_section(content, marker, 'settings', SETTINGS_KEYS[lang])
        
        # Add notificationSounds keys
        if lang in NOTIFICATION_SOUNDS_KEYS:
            content = add_keys_to_section(content, marker, 'notificationSounds', NOTIFICATION_SOUNDS_KEYS[lang])
    
    with open(TRANSLATIONS_FILE, 'w', encoding='utf-8') as f:
        f.write(content)
    
    new_len = len(content)
    print(f"\nDone! File grew from {original_len} to {new_len} chars ({new_len - original_len} added)")
    print(f"Settings keys added: {len(SETTINGS_KEYS['en'])}")
    print(f"NotificationSounds keys added: {len(NOTIFICATION_SOUNDS_KEYS['en'])}")


if __name__ == '__main__':
    main()
