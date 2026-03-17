#!/usr/bin/env python3
"""
Add missing notificationSounds keys to translations.ts
Adds ~23 keys to all 12 languages
"""

import re

# Read the file
with open('constants/translations.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# === PART 1: Add to TranslationKeys interface ===

new_interface_keys = '''    sudais: string;
    sudaisDesc: string;
    egypt: string;
    egyptDesc: string;
    dosari: string;
    dosariDesc: string;
    ajman: string;
    ajmanDesc: string;
    ali_mulla: string;
    ali_mullaDesc: string;
    naqshbandi: string;
    naqshbandiDesc: string;
    sharif: string;
    sharifDesc: string;
    mansoor_zahrani: string;
    mansoor_zahraniDesc: string;
    haramain: string;
    haramainDesc: string;
    pm: string;
    am: string;
    testScheduledBody: string;
    testSuccess: string;
    testSuccessMsg: string;
    testError: string;
    testErrorMsg: string;
    notificationsRequired: string;
    notificationsRequiredMsg: string;
    openSettings: string;
    testPrayerTitle: string;
    testPrayerBody: string;
    testSalawatTitle: string;
    testSalawatBody: string;'''

# Insert before the closing }; of notificationSounds in the interface
content = content.replace(
    '''    minutesBefore: string;
    minutes: string;
  };
  
  // النسخ الاحتياطي''',
    '''    minutesBefore: string;
    minutes: string;
''' + new_interface_keys + '''
  };
  
  // النسخ الاحتياطي'''
)

# === PART 2: Add translations to each language ===

translations = {
    'ar': {
        'sudais': 'السديس',
        'sudaisDesc': 'أذان الشيخ عبدالرحمن السديس',
        'egypt': 'مصر',
        'egyptDesc': 'أذان مصري تقليدي',
        'dosari': 'الدوسري',
        'dosariDesc': 'أذان الشيخ ياسر الدوسري',
        'ajman': 'عجمان',
        'ajmanDesc': 'أذان من عجمان الإمارات',
        'ali_mulla': 'علي ملا',
        'ali_mullaDesc': 'أذان الشيخ علي ملا',
        'naqshbandi': 'النقشبندي',
        'naqshbandiDesc': 'أذان الشيخ سيد النقشبندي',
        'sharif': 'الشريف',
        'sharifDesc': 'أذان صوت الشريف',
        'mansoor_zahrani': 'منصور الزهراني',
        'mansoor_zahraniDesc': 'أذان الشيخ منصور الزهراني',
        'haramain': 'الحرمين',
        'haramainDesc': 'أذان الحرمين الشريفين',
        'pm': 'م',
        'am': 'ص',
        'testScheduledBody': 'هذا إشعار تجريبي للتأكد من عمل الإشعارات',
        'testSuccess': 'نجح الاختبار',
        'testSuccessMsg': 'تم إرسال إشعار تجريبي بنجاح',
        'testError': 'خطأ في الاختبار',
        'testErrorMsg': 'فشل إرسال الإشعار: ',
        'notificationsRequired': 'صلاحية الإشعارات مطلوبة',
        'notificationsRequiredMsg': 'يرجى تفعيل الإشعارات من إعدادات الجهاز',
        'openSettings': 'فتح الإعدادات',
        'testPrayerTitle': 'تذكير الصلاة',
        'testPrayerBody': 'حان وقت الصلاة',
        'testSalawatTitle': 'الصلاة على النبي',
        'testSalawatBody': 'اللهم صل وسلم على نبينا محمد',
    },
    'en': {
        'sudais': 'Al-Sudais',
        'sudaisDesc': 'Adhan by Sheikh Abdulrahman Al-Sudais',
        'egypt': 'Egypt',
        'egyptDesc': 'Traditional Egyptian Adhan',
        'dosari': 'Al-Dosari',
        'dosariDesc': 'Adhan by Sheikh Yasser Al-Dosari',
        'ajman': 'Ajman',
        'ajmanDesc': 'Adhan from Ajman, UAE',
        'ali_mulla': 'Ali Mulla',
        'ali_mullaDesc': 'Adhan by Sheikh Ali Mulla',
        'naqshbandi': 'Al-Naqshbandi',
        'naqshbandiDesc': 'Adhan by Sheikh Sayed Al-Naqshbandi',
        'sharif': 'Al-Sharif',
        'sharifDesc': 'Adhan by Al-Sharif',
        'mansoor_zahrani': 'Mansoor Al-Zahrani',
        'mansoor_zahraniDesc': 'Adhan by Sheikh Mansoor Al-Zahrani',
        'haramain': 'Haramain',
        'haramainDesc': 'Adhan from the Two Holy Mosques',
        'pm': 'PM',
        'am': 'AM',
        'testScheduledBody': 'This is a test notification to verify notifications are working',
        'testSuccess': 'Test Successful',
        'testSuccessMsg': 'Test notification sent successfully',
        'testError': 'Test Error',
        'testErrorMsg': 'Failed to send notification: ',
        'notificationsRequired': 'Notification Permission Required',
        'notificationsRequiredMsg': 'Please enable notifications from device settings',
        'openSettings': 'Open Settings',
        'testPrayerTitle': 'Prayer Reminder',
        'testPrayerBody': 'It\'s time for prayer',
        'testSalawatTitle': 'Salawat Reminder',
        'testSalawatBody': 'Send blessings upon Prophet Muhammad ﷺ',
    },
    'fr': {
        'sudais': 'Al-Sudais',
        'sudaisDesc': 'Adhan par Cheikh Abdulrahman Al-Sudais',
        'egypt': 'Égypte',
        'egyptDesc': 'Adhan égyptien traditionnel',
        'dosari': 'Al-Dosari',
        'dosariDesc': 'Adhan par Cheikh Yasser Al-Dosari',
        'ajman': 'Ajman',
        'ajmanDesc': 'Adhan d\'Ajman, Émirats',
        'ali_mulla': 'Ali Mulla',
        'ali_mullaDesc': 'Adhan par Cheikh Ali Mulla',
        'naqshbandi': 'Al-Naqshbandi',
        'naqshbandiDesc': 'Adhan par Cheikh Sayed Al-Naqshbandi',
        'sharif': 'Al-Sharif',
        'sharifDesc': 'Adhan par Al-Sharif',
        'mansoor_zahrani': 'Mansoor Al-Zahrani',
        'mansoor_zahraniDesc': 'Adhan par Cheikh Mansoor Al-Zahrani',
        'haramain': 'Haramain',
        'haramainDesc': 'Adhan des Deux Saintes Mosquées',
        'pm': 'PM',
        'am': 'AM',
        'testScheduledBody': 'Ceci est une notification test pour vérifier que les notifications fonctionnent',
        'testSuccess': 'Test réussi',
        'testSuccessMsg': 'Notification test envoyée avec succès',
        'testError': 'Erreur de test',
        'testErrorMsg': 'Échec de l\'envoi de la notification: ',
        'notificationsRequired': 'Autorisation de notification requise',
        'notificationsRequiredMsg': 'Veuillez activer les notifications dans les paramètres de l\'appareil',
        'openSettings': 'Ouvrir les paramètres',
        'testPrayerTitle': 'Rappel de prière',
        'testPrayerBody': 'C\'est l\'heure de la prière',
        'testSalawatTitle': 'Rappel Salawat',
        'testSalawatBody': 'Envoyez des bénédictions au Prophète Muhammad ﷺ',
    },
    'de': {
        'sudais': 'Al-Sudais',
        'sudaisDesc': 'Adhan von Scheich Abdulrahman Al-Sudais',
        'egypt': 'Ägypten',
        'egyptDesc': 'Traditioneller ägyptischer Adhan',
        'dosari': 'Al-Dosari',
        'dosariDesc': 'Adhan von Scheich Yasser Al-Dosari',
        'ajman': 'Ajman',
        'ajmanDesc': 'Adhan aus Ajman, VAE',
        'ali_mulla': 'Ali Mulla',
        'ali_mullaDesc': 'Adhan von Scheich Ali Mulla',
        'naqshbandi': 'Al-Naqshbandi',
        'naqshbandiDesc': 'Adhan von Scheich Sayed Al-Naqshbandi',
        'sharif': 'Al-Sharif',
        'sharifDesc': 'Adhan von Al-Sharif',
        'mansoor_zahrani': 'Mansoor Al-Zahrani',
        'mansoor_zahraniDesc': 'Adhan von Scheich Mansoor Al-Zahrani',
        'haramain': 'Haramain',
        'haramainDesc': 'Adhan aus den Zwei Heiligen Moscheen',
        'pm': 'PM',
        'am': 'AM',
        'testScheduledBody': 'Dies ist eine Testbenachrichtigung zur Überprüfung der Funktionalität',
        'testSuccess': 'Test erfolgreich',
        'testSuccessMsg': 'Testbenachrichtigung erfolgreich gesendet',
        'testError': 'Testfehler',
        'testErrorMsg': 'Benachrichtigung konnte nicht gesendet werden: ',
        'notificationsRequired': 'Benachrichtigungsberechtigung erforderlich',
        'notificationsRequiredMsg': 'Bitte aktivieren Sie Benachrichtigungen in den Geräteeinstellungen',
        'openSettings': 'Einstellungen öffnen',
        'testPrayerTitle': 'Gebetserinnerung',
        'testPrayerBody': 'Es ist Zeit für das Gebet',
        'testSalawatTitle': 'Salawat-Erinnerung',
        'testSalawatBody': 'Sende Segen an den Propheten Muhammad ﷺ',
    },
    'tr': {
        'sudais': 'El-Sudeysi',
        'sudaisDesc': 'Şeyh Abdurrahman es-Sudeysi Ezanı',
        'egypt': 'Mısır',
        'egyptDesc': 'Geleneksel Mısır Ezanı',
        'dosari': 'Ed-Doseri',
        'dosariDesc': 'Şeyh Yaser ed-Doseri Ezanı',
        'ajman': 'Acman',
        'ajmanDesc': 'BAE Acman\'dan Ezan',
        'ali_mulla': 'Ali Mulla',
        'ali_mullaDesc': 'Şeyh Ali Mulla Ezanı',
        'naqshbandi': 'En-Nakşibendi',
        'naqshbandiDesc': 'Şeyh Seyyid en-Nakşibendi Ezanı',
        'sharif': 'Eş-Şerif',
        'sharifDesc': 'Eş-Şerif Ezanı',
        'mansoor_zahrani': 'Mansur ez-Zahrani',
        'mansoor_zahraniDesc': 'Şeyh Mansur ez-Zahrani Ezanı',
        'haramain': 'Haremeyn',
        'haramainDesc': 'İki Kutsal Mescid Ezanı',
        'pm': 'ÖS',
        'am': 'ÖÖ',
        'testScheduledBody': 'Bu bildirimlerin çalıştığını doğrulamak için bir test bildirimidir',
        'testSuccess': 'Test Başarılı',
        'testSuccessMsg': 'Test bildirimi başarıyla gönderildi',
        'testError': 'Test Hatası',
        'testErrorMsg': 'Bildirim gönderilemedi: ',
        'notificationsRequired': 'Bildirim İzni Gerekli',
        'notificationsRequiredMsg': 'Lütfen cihaz ayarlarından bildirimleri etkinleştirin',
        'openSettings': 'Ayarları Aç',
        'testPrayerTitle': 'Namaz Hatırlatması',
        'testPrayerBody': 'Namaz vakti geldi',
        'testSalawatTitle': 'Salavat Hatırlatması',
        'testSalawatBody': 'Hz. Muhammed\'e ﷺ salavat getirin',
    },
    'es': {
        'sudais': 'Al-Sudais',
        'sudaisDesc': 'Adhan del Sheij Abdulrahman Al-Sudais',
        'egypt': 'Egipto',
        'egyptDesc': 'Adhan egipcio tradicional',
        'dosari': 'Al-Dosari',
        'dosariDesc': 'Adhan del Sheij Yasser Al-Dosari',
        'ajman': 'Ajman',
        'ajmanDesc': 'Adhan de Ajman, EAU',
        'ali_mulla': 'Ali Mulla',
        'ali_mullaDesc': 'Adhan del Sheij Ali Mulla',
        'naqshbandi': 'Al-Naqshbandi',
        'naqshbandiDesc': 'Adhan del Sheij Sayed Al-Naqshbandi',
        'sharif': 'Al-Sharif',
        'sharifDesc': 'Adhan de Al-Sharif',
        'mansoor_zahrani': 'Mansoor Al-Zahrani',
        'mansoor_zahraniDesc': 'Adhan del Sheij Mansoor Al-Zahrani',
        'haramain': 'Haramain',
        'haramainDesc': 'Adhan de las Dos Mezquitas Sagradas',
        'pm': 'PM',
        'am': 'AM',
        'testScheduledBody': 'Esta es una notificación de prueba para verificar que las notificaciones funcionan',
        'testSuccess': 'Prueba exitosa',
        'testSuccessMsg': 'Notificación de prueba enviada con éxito',
        'testError': 'Error de prueba',
        'testErrorMsg': 'Error al enviar la notificación: ',
        'notificationsRequired': 'Permiso de notificación requerido',
        'notificationsRequiredMsg': 'Por favor habilite las notificaciones en la configuración del dispositivo',
        'openSettings': 'Abrir configuración',
        'testPrayerTitle': 'Recordatorio de oración',
        'testPrayerBody': 'Es hora de orar',
        'testSalawatTitle': 'Recordatorio de Salawat',
        'testSalawatBody': 'Envía bendiciones al Profeta Muhammad ﷺ',
    },
    'ur': {
        'sudais': 'السدیس',
        'sudaisDesc': 'شیخ عبدالرحمن السدیس کی اذان',
        'egypt': 'مصر',
        'egyptDesc': 'روایتی مصری اذان',
        'dosari': 'الدوسری',
        'dosariDesc': 'شیخ یاسر الدوسری کی اذان',
        'ajman': 'عجمان',
        'ajmanDesc': 'عجمان، متحدہ عرب امارات سے اذان',
        'ali_mulla': 'علی ملا',
        'ali_mullaDesc': 'شیخ علی ملا کی اذان',
        'naqshbandi': 'نقشبندی',
        'naqshbandiDesc': 'شیخ سید نقشبندی کی اذان',
        'sharif': 'الشریف',
        'sharifDesc': 'الشریف کی اذان',
        'mansoor_zahrani': 'منصور الزہرانی',
        'mansoor_zahraniDesc': 'شیخ منصور الزہرانی کی اذان',
        'haramain': 'حرمین',
        'haramainDesc': 'حرمین شریفین کی اذان',
        'pm': 'شام',
        'am': 'صبح',
        'testScheduledBody': 'یہ ایک ٹیسٹ نوٹیفکیشن ہے',
        'testSuccess': 'ٹیسٹ کامیاب',
        'testSuccessMsg': 'ٹیسٹ نوٹیفکیشن کامیابی سے بھیجی گئی',
        'testError': 'ٹیسٹ ناکام',
        'testErrorMsg': 'نوٹیفکیشن بھیجنے میں ناکام: ',
        'notificationsRequired': 'نوٹیفکیشن کی اجازت درکار ہے',
        'notificationsRequiredMsg': 'براہ کرم ڈیوائس سیٹنگز سے نوٹیفکیشنز فعال کریں',
        'openSettings': 'سیٹنگز کھولیں',
        'testPrayerTitle': 'نماز کی یاد دہانی',
        'testPrayerBody': 'نماز کا وقت ہو گیا',
        'testSalawatTitle': 'درود کی یاد دہانی',
        'testSalawatBody': 'نبی محمد ﷺ پر درود بھیجیں',
    },
    'id': {
        'sudais': 'Al-Sudais',
        'sudaisDesc': 'Adzan oleh Syekh Abdurrahman Al-Sudais',
        'egypt': 'Mesir',
        'egyptDesc': 'Adzan Mesir Tradisional',
        'dosari': 'Al-Dosari',
        'dosariDesc': 'Adzan oleh Syekh Yasser Al-Dosari',
        'ajman': 'Ajman',
        'ajmanDesc': 'Adzan dari Ajman, UEA',
        'ali_mulla': 'Ali Mulla',
        'ali_mullaDesc': 'Adzan oleh Syekh Ali Mulla',
        'naqshbandi': 'Al-Naqshbandi',
        'naqshbandiDesc': 'Adzan oleh Syekh Sayed Al-Naqshbandi',
        'sharif': 'Al-Sharif',
        'sharifDesc': 'Adzan oleh Al-Sharif',
        'mansoor_zahrani': 'Mansoor Al-Zahrani',
        'mansoor_zahraniDesc': 'Adzan oleh Syekh Mansoor Al-Zahrani',
        'haramain': 'Haramain',
        'haramainDesc': 'Adzan dari Dua Masjid Suci',
        'pm': 'PM',
        'am': 'AM',
        'testScheduledBody': 'Ini adalah notifikasi percobaan untuk memverifikasi notifikasi berfungsi',
        'testSuccess': 'Tes Berhasil',
        'testSuccessMsg': 'Notifikasi percobaan berhasil dikirim',
        'testError': 'Kesalahan Tes',
        'testErrorMsg': 'Gagal mengirim notifikasi: ',
        'notificationsRequired': 'Izin Notifikasi Diperlukan',
        'notificationsRequiredMsg': 'Silakan aktifkan notifikasi dari pengaturan perangkat',
        'openSettings': 'Buka Pengaturan',
        'testPrayerTitle': 'Pengingat Shalat',
        'testPrayerBody': 'Waktu shalat telah tiba',
        'testSalawatTitle': 'Pengingat Shalawat',
        'testSalawatBody': 'Kirim shalawat kepada Nabi Muhammad ﷺ',
    },
    'ms': {
        'sudais': 'Al-Sudais',
        'sudaisDesc': 'Azan oleh Sheikh Abdulrahman Al-Sudais',
        'egypt': 'Mesir',
        'egyptDesc': 'Azan Mesir Tradisional',
        'dosari': 'Al-Dosari',
        'dosariDesc': 'Azan oleh Sheikh Yasser Al-Dosari',
        'ajman': 'Ajman',
        'ajmanDesc': 'Azan dari Ajman, UAE',
        'ali_mulla': 'Ali Mulla',
        'ali_mullaDesc': 'Azan oleh Sheikh Ali Mulla',
        'naqshbandi': 'Al-Naqshbandi',
        'naqshbandiDesc': 'Azan oleh Sheikh Sayed Al-Naqshbandi',
        'sharif': 'Al-Sharif',
        'sharifDesc': 'Azan oleh Al-Sharif',
        'mansoor_zahrani': 'Mansoor Al-Zahrani',
        'mansoor_zahraniDesc': 'Azan oleh Sheikh Mansoor Al-Zahrani',
        'haramain': 'Haramain',
        'haramainDesc': 'Azan dari Dua Masjid Suci',
        'pm': 'PM',
        'am': 'AM',
        'testScheduledBody': 'Ini adalah pemberitahuan ujian untuk mengesahkan pemberitahuan berfungsi',
        'testSuccess': 'Ujian Berjaya',
        'testSuccessMsg': 'Pemberitahuan ujian berjaya dihantar',
        'testError': 'Ralat Ujian',
        'testErrorMsg': 'Gagal menghantar pemberitahuan: ',
        'notificationsRequired': 'Kebenaran Pemberitahuan Diperlukan',
        'notificationsRequiredMsg': 'Sila aktifkan pemberitahuan dari tetapan peranti',
        'openSettings': 'Buka Tetapan',
        'testPrayerTitle': 'Peringatan Solat',
        'testPrayerBody': 'Waktu solat telah tiba',
        'testSalawatTitle': 'Peringatan Selawat',
        'testSalawatBody': 'Hantar selawat kepada Nabi Muhammad ﷺ',
    },
    'hi': {
        'sudais': 'अल-सुदैस',
        'sudaisDesc': 'शेख अब्दुर्रहमान अल-सुदैस की अज़ान',
        'egypt': 'मिस्र',
        'egyptDesc': 'पारंपरिक मिस्री अज़ान',
        'dosari': 'अल-दोसारी',
        'dosariDesc': 'शेख यासर अल-दोसारी की अज़ान',
        'ajman': 'अजमान',
        'ajmanDesc': 'अजमान, संयुक्त अरब अमीरात की अज़ान',
        'ali_mulla': 'अली मुल्ला',
        'ali_mullaDesc': 'शेख अली मुल्ला की अज़ान',
        'naqshbandi': 'अल-नक़्शबंदी',
        'naqshbandiDesc': 'शेख सय्यद अल-नक़्शबंदी की अज़ान',
        'sharif': 'अल-शरीफ',
        'sharifDesc': 'अल-शरीफ की अज़ान',
        'mansoor_zahrani': 'मंसूर अल-ज़हरानी',
        'mansoor_zahraniDesc': 'शेख मंसूर अल-ज़हरानी की अज़ान',
        'haramain': 'हरमैन',
        'haramainDesc': 'दो पवित्र मस्जिदों की अज़ान',
        'pm': 'अपराह्न',
        'am': 'पूर्वाह्न',
        'testScheduledBody': 'यह सूचनाओं की जांच के लिए एक परीक्षण सूचना है',
        'testSuccess': 'परीक्षण सफल',
        'testSuccessMsg': 'परीक्षण सूचना सफलतापूर्वक भेजी गई',
        'testError': 'परीक्षण त्रुटि',
        'testErrorMsg': 'सूचना भेजने में विफल: ',
        'notificationsRequired': 'सूचना अनुमति आवश्यक',
        'notificationsRequiredMsg': 'कृपया डिवाइस सेटिंग्स से सूचनाएं सक्षम करें',
        'openSettings': 'सेटिंग्स खोलें',
        'testPrayerTitle': 'नमाज़ रिमाइंडर',
        'testPrayerBody': 'नमाज़ का समय हो गया',
        'testSalawatTitle': 'सलवात रिमाइंडर',
        'testSalawatBody': 'नबी मुहम्मद ﷺ पर दरूद भेजें',
    },
    'bn': {
        'sudais': 'আল-সুদাইস',
        'sudaisDesc': 'শায়খ আব্দুর রহমান আল-সুদাইসের আজান',
        'egypt': 'মিশর',
        'egyptDesc': 'ঐতিহ্যবাহী মিশরীয় আজান',
        'dosari': 'আল-দোসারি',
        'dosariDesc': 'শায়খ ইয়াসির আল-দোসারির আজান',
        'ajman': 'আজমান',
        'ajmanDesc': 'সংযুক্ত আরব আমিরাতের আজমান থেকে আজান',
        'ali_mulla': 'আলী মুল্লা',
        'ali_mullaDesc': 'শায়খ আলী মুল্লার আজান',
        'naqshbandi': 'আল-নকশবন্দি',
        'naqshbandiDesc': 'শায়খ সৈয়দ আল-নকশবন্দির আজান',
        'sharif': 'আল-শরিফ',
        'sharifDesc': 'আল-শরিফের আজান',
        'mansoor_zahrani': 'মানসুর আল-যাহরানি',
        'mansoor_zahraniDesc': 'শায়খ মানসুর আল-যাহরানির আজান',
        'haramain': 'হারামাইন',
        'haramainDesc': 'দুই পবিত্র মসজিদের আজান',
        'pm': 'অপরাহ্ন',
        'am': 'পূর্বাহ্ন',
        'testScheduledBody': 'নোটিফিকেশন কাজ করছে কিনা যাচাই করার জন্য এটি একটি পরীক্ষামূলক নোটিফিকেশন',
        'testSuccess': 'পরীক্ষা সফল',
        'testSuccessMsg': 'পরীক্ষামূলক নোটিফিকেশন সফলভাবে পাঠানো হয়েছে',
        'testError': 'পরীক্ষায় ত্রুটি',
        'testErrorMsg': 'নোটিফিকেশন পাঠাতে ব্যর্থ: ',
        'notificationsRequired': 'নোটিফিকেশন অনুমতি প্রয়োজন',
        'notificationsRequiredMsg': 'অনুগ্রহ করে ডিভাইস সেটিংস থেকে নোটিফিকেশন সক্রিয় করুন',
        'openSettings': 'সেটিংস খুলুন',
        'testPrayerTitle': 'নামাজের রিমাইন্ডার',
        'testPrayerBody': 'নামাজের সময় হয়েছে',
        'testSalawatTitle': 'সালাওয়াত রিমাইন্ডার',
        'testSalawatBody': 'নবী মুহাম্মদ ﷺ এর উপর দরূদ পাঠান',
    },
    'ru': {
        'sudais': 'Ас-Судайс',
        'sudaisDesc': 'Азан шейха Абдуррахмана Ас-Судайса',
        'egypt': 'Египет',
        'egyptDesc': 'Традиционный египетский азан',
        'dosari': 'Ад-Досари',
        'dosariDesc': 'Азан шейха Ясира Ад-Досари',
        'ajman': 'Аджман',
        'ajmanDesc': 'Азан из Аджмана, ОАЭ',
        'ali_mulla': 'Али Мулла',
        'ali_mullaDesc': 'Азан шейха Али Муллы',
        'naqshbandi': 'Ан-Накшбанди',
        'naqshbandiDesc': 'Азан шейха Саида Ан-Накшбанди',
        'sharif': 'Аш-Шариф',
        'sharifDesc': 'Азан Аш-Шарифа',
        'mansoor_zahrani': 'Мансур Аз-Захрани',
        'mansoor_zahraniDesc': 'Азан шейха Мансура Аз-Захрани',
        'haramain': 'Харамейн',
        'haramainDesc': 'Азан из Двух Священных Мечетей',
        'pm': 'вечер',
        'am': 'утро',
        'testScheduledBody': 'Это тестовое уведомление для проверки работы уведомлений',
        'testSuccess': 'Тест успешен',
        'testSuccessMsg': 'Тестовое уведомление успешно отправлено',
        'testError': 'Ошибка теста',
        'testErrorMsg': 'Не удалось отправить уведомление: ',
        'notificationsRequired': 'Требуется разрешение на уведомления',
        'notificationsRequiredMsg': 'Пожалуйста, включите уведомления в настройках устройства',
        'openSettings': 'Открыть настройки',
        'testPrayerTitle': 'Напоминание о молитве',
        'testPrayerBody': 'Время молитвы наступило',
        'testSalawatTitle': 'Напоминание о салавате',
        'testSalawatBody': 'Отправьте благословения Пророку Мухаммаду ﷺ',
    },
}

def generate_additions(trans):
    """Generate the additional keys"""
    lines = []
    for key, value in trans.items():
        # Escape single quotes
        escaped_value = value.replace("'", "\\'")
        lines.append(f"    {key}: '{escaped_value}',")
    return '\n'.join(lines)


# Find the minutes: line in each language and add after it
minutes_values = {
    'ar': "minutes: 'دقائق',",
    'en': "minutes: 'minutes',",
    'fr': "minutes: 'minutes',",
    'de': "minutes: 'Minuten',",
    'tr': "minutes: 'dakika',",
    'es': "minutes: 'minutos',",
    'ur': "minutes: 'منٹ',",
    'id': "minutes: 'menit',",
    'ms': "minutes: 'minit',",
    'hi': "minutes: 'मिनट',",
    'bn': "minutes: 'মিনিট',",
    'ru': "minutes: 'минут',",
}

for lang, trans in translations.items():
    additions = generate_additions(trans)
    
    minutes_val = minutes_values.get(lang, '')
    if not minutes_val:
        continue
    
    target = minutes_val + "\n  },"
    replacement = minutes_val + "\n" + additions + "\n  },"
    
    # Handle ms separately since it might conflict with similar values
    if lang == 'ms':
        continue
    
    content = content.replace(target, replacement, 1)

# Handle ms separately
ms_additions = generate_additions(translations['ms'])
ms_target = "minutes: 'minit',\n  },"
ms_replacement = "minutes: 'minit',\n" + ms_additions + "\n  },"

# Find second occurrence
parts = content.split(ms_target)
if len(parts) >= 3:
    content = parts[0] + ms_target + parts[1] + ms_replacement + ms_target.join(parts[2:])


# Write the updated file
with open('constants/translations.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Added 32 notificationSounds keys to interface")
print("✅ Added notificationSounds translations to all 12 languages")
print(f"✅ Total keys added: {len(translations['ar']) * 12} ({len(translations['ar'])} keys × 12 languages)")
