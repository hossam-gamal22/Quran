#!/usr/bin/env python3
"""
Add additional notification translation keys for notifications.tsx to all 12 language blocks
in constants/translations.ts
"""
import re
import os

TRANSLATIONS_FILE = os.path.join(os.path.dirname(__file__), '..', 'constants', 'translations.ts')

# ============================
# New keys to add to `notificationSounds` section
# ============================
NOTIFICATION_KEYS = {
    'ar': {
        'am': 'ص',
        'pm': 'م',
        'daySun': 'أحد',
        'dayMon': 'اثنين',
        'dayTue': 'ثلاثاء',
        'dayWed': 'أربعاء',
        'dayThu': 'خميس',
        'dayFri': 'جمعة',
        'daySat': 'سبت',
        'subhanallah': 'سبحان الله',
        'alhamdulillah': 'الحمد لله',
        'defaultSound': 'الصوت الافتراضي',
        'silent': 'صامت',
        'silentDesc': 'بدون صوت',
        'testScheduledBody': 'هذا إشعار مجدول - الجدولة تعمل بنجاح ✅',
        'testPrayerTitle': '🕌 تنبيه الصلاة',
        'testPrayerBody': 'حان الآن موعد صلاة الظهر - اختبار الإشعارات',
        'testSalawatTitle': '💚 الصلاة على النبي ﷺ',
        'testSalawatBody': 'اللهم صلِّ وسلم على نبينا محمد ﷺ',
        'testTasbihTitle': '📿 تذكير التسبيح',
        'testTasbihBody': 'سبحان الله وبحمده، سبحان الله العظيم',
        'testIstighfarTitle': '🤲 تذكير الاستغفار',
        'testIstighfarBody': 'أستغفر الله العظيم وأتوب إليه',
        'testAzkarTitle': '📖 تذكير الأذكار',
        'testAzkarBody': 'حان وقت أذكار الصباح - اختبار الإشعارات',
        'testVerseTitle': '📖 آية اليوم',
        'testVerseBody': '﴿ إِنَّ مَعَ الْعُسْرِ يُسْرًا ﴾ - اختبار',
        'testCustomTitle': '🔔 تنبيه',
        'testCustomBody': 'تذكير مخصص من روح المسلم',
        'testDefaultTitle': 'إشعار تجريبي',
        'testDefaultBody': 'هذا إشعار تجريبي من روح المسلم',
    },
    'en': {
        'am': 'AM',
        'pm': 'PM',
        'daySun': 'Sun',
        'dayMon': 'Mon',
        'dayTue': 'Tue',
        'dayWed': 'Wed',
        'dayThu': 'Thu',
        'dayFri': 'Fri',
        'daySat': 'Sat',
        'subhanallah': 'SubhanAllah',
        'alhamdulillah': 'Alhamdulillah',
        'defaultSound': 'Default Sound',
        'silent': 'Silent',
        'silentDesc': 'No sound',
        'testScheduledBody': 'This is a scheduled notification - scheduling works ✅',
        'testPrayerTitle': '🕌 Prayer Alert',
        'testPrayerBody': 'It is now time for Dhuhr prayer - notification test',
        'testSalawatTitle': '💚 Salawat upon the Prophet ﷺ',
        'testSalawatBody': 'O Allah, send blessings upon our Prophet Muhammad ﷺ',
        'testTasbihTitle': '📿 Tasbih Reminder',
        'testTasbihBody': 'SubhanAllah wa bihamdihi, SubhanAllah al-Azeem',
        'testIstighfarTitle': '🤲 Istighfar Reminder',
        'testIstighfarBody': 'Astaghfirullah al-Azeem wa atubu ilayh',
        'testAzkarTitle': '📖 Azkar Reminder',
        'testAzkarBody': 'It is time for morning azkar - notification test',
        'testVerseTitle': '📖 Verse of the Day',
        'testVerseBody': '﴿ Indeed, with hardship comes ease ﴾ - test',
        'testCustomTitle': '🔔 Reminder',
        'testCustomBody': 'Custom reminder from Ruh Al-Muslim',
        'testDefaultTitle': 'Test Notification',
        'testDefaultBody': 'This is a test notification from Ruh Al-Muslim',
    },
    'fr': {
        'am': 'AM',
        'pm': 'PM',
        'daySun': 'Dim',
        'dayMon': 'Lun',
        'dayTue': 'Mar',
        'dayWed': 'Mer',
        'dayThu': 'Jeu',
        'dayFri': 'Ven',
        'daySat': 'Sam',
        'subhanallah': 'SubhanAllah',
        'alhamdulillah': 'Alhamdulillah',
        'defaultSound': 'Son par défaut',
        'silent': 'Silencieux',
        'silentDesc': 'Pas de son',
        'testScheduledBody': 'Notification programmée - la programmation fonctionne ✅',
        'testPrayerTitle': '🕌 Alerte de prière',
        'testPrayerBody': 'C\'est l\'heure de la prière de Dhuhr - test',
        'testSalawatTitle': '💚 Salawat sur le Prophète ﷺ',
        'testSalawatBody': 'Ô Allah, envoie des bénédictions sur notre Prophète Muhammad ﷺ',
        'testTasbihTitle': '📿 Rappel de Tasbih',
        'testTasbihBody': 'SubhanAllah wa bihamdihi, SubhanAllah al-Azeem',
        'testIstighfarTitle': '🤲 Rappel d\'Istighfar',
        'testIstighfarBody': 'Astaghfirullah al-Azeem wa atubu ilayh',
        'testAzkarTitle': '📖 Rappel des Azkar',
        'testAzkarBody': 'C\'est l\'heure des azkar du matin - test',
        'testVerseTitle': '📖 Verset du jour',
        'testVerseBody': '﴿ Certes, avec la difficulté vient la facilité ﴾ - test',
        'testCustomTitle': '🔔 Rappel',
        'testCustomBody': 'Rappel personnalisé de Ruh Al-Muslim',
        'testDefaultTitle': 'Notification de test',
        'testDefaultBody': 'Ceci est une notification de test de Ruh Al-Muslim',
    },
    'de': {
        'am': 'AM',
        'pm': 'PM',
        'daySun': 'So',
        'dayMon': 'Mo',
        'dayTue': 'Di',
        'dayWed': 'Mi',
        'dayThu': 'Do',
        'dayFri': 'Fr',
        'daySat': 'Sa',
        'subhanallah': 'SubhanAllah',
        'alhamdulillah': 'Alhamdulillah',
        'defaultSound': 'Standardton',
        'silent': 'Lautlos',
        'silentDesc': 'Kein Ton',
        'testScheduledBody': 'Geplante Benachrichtigung - Planung funktioniert ✅',
        'testPrayerTitle': '🕌 Gebetsalarm',
        'testPrayerBody': 'Es ist Zeit für das Dhuhr-Gebet - Test',
        'testSalawatTitle': '💚 Salawat auf den Propheten ﷺ',
        'testSalawatBody': 'O Allah, segne unseren Propheten Muhammad ﷺ',
        'testTasbihTitle': '📿 Tasbih-Erinnerung',
        'testTasbihBody': 'SubhanAllah wa bihamdihi, SubhanAllah al-Azeem',
        'testIstighfarTitle': '🤲 Istighfar-Erinnerung',
        'testIstighfarBody': 'Astaghfirullah al-Azeem wa atubu ilayh',
        'testAzkarTitle': '📖 Azkar-Erinnerung',
        'testAzkarBody': 'Es ist Zeit für die Morgen-Azkar - Test',
        'testVerseTitle': '📖 Vers des Tages',
        'testVerseBody': '﴿ Wahrlich, mit der Schwierigkeit kommt die Erleichterung ﴾ - Test',
        'testCustomTitle': '🔔 Erinnerung',
        'testCustomBody': 'Benutzerdefinierte Erinnerung von Ruh Al-Muslim',
        'testDefaultTitle': 'Testbenachrichtigung',
        'testDefaultBody': 'Dies ist eine Testbenachrichtigung von Ruh Al-Muslim',
    },
    'tr': {
        'am': 'ÖÖ',
        'pm': 'ÖS',
        'daySun': 'Paz',
        'dayMon': 'Pzt',
        'dayTue': 'Sal',
        'dayWed': 'Çar',
        'dayThu': 'Per',
        'dayFri': 'Cum',
        'daySat': 'Cmt',
        'subhanallah': 'SubhanAllah',
        'alhamdulillah': 'Elhamdülillah',
        'defaultSound': 'Varsayılan Ses',
        'silent': 'Sessiz',
        'silentDesc': 'Ses yok',
        'testScheduledBody': 'Zamanlanmış bildirim - zamanlama çalışıyor ✅',
        'testPrayerTitle': '🕌 Namaz Hatırlatması',
        'testPrayerBody': 'Öğle namazı vakti geldi - bildirim testi',
        'testSalawatTitle': '💚 Peygambere Salavat ﷺ',
        'testSalawatBody': 'Allahümme salli ala seyyidina Muhammed ﷺ',
        'testTasbihTitle': '📿 Tesbih Hatırlatması',
        'testTasbihBody': 'Sübhanallahi ve bihamdihi, Sübhanallahil azim',
        'testIstighfarTitle': '🤲 İstiğfar Hatırlatması',
        'testIstighfarBody': 'Estağfirullahe\'l-azim ve etübü ileyh',
        'testAzkarTitle': '📖 Zikir Hatırlatması',
        'testAzkarBody': 'Sabah zikirleri vakti - bildirim testi',
        'testVerseTitle': '📖 Günün Ayeti',
        'testVerseBody': '﴿ Muhakkak ki zorlukla beraber kolaylık vardır ﴾ - test',
        'testCustomTitle': '🔔 Hatırlatma',
        'testCustomBody': 'Ruh Al-Muslim\'den özel hatırlatma',
        'testDefaultTitle': 'Test Bildirimi',
        'testDefaultBody': 'Bu Ruh Al-Muslim\'den bir test bildirimidir',
    },
    'es': {
        'am': 'AM',
        'pm': 'PM',
        'daySun': 'Dom',
        'dayMon': 'Lun',
        'dayTue': 'Mar',
        'dayWed': 'Mié',
        'dayThu': 'Jue',
        'dayFri': 'Vie',
        'daySat': 'Sáb',
        'subhanallah': 'SubhanAllah',
        'alhamdulillah': 'Alhamdulillah',
        'defaultSound': 'Sonido predeterminado',
        'silent': 'Silencioso',
        'silentDesc': 'Sin sonido',
        'testScheduledBody': 'Notificación programada - la programación funciona ✅',
        'testPrayerTitle': '🕌 Alerta de Oración',
        'testPrayerBody': 'Es hora de la oración de Dhuhr - prueba',
        'testSalawatTitle': '💚 Salawat sobre el Profeta ﷺ',
        'testSalawatBody': 'Oh Allah, envía bendiciones sobre nuestro Profeta Muhammad ﷺ',
        'testTasbihTitle': '📿 Recordatorio de Tasbih',
        'testTasbihBody': 'SubhanAllah wa bihamdihi, SubhanAllah al-Azeem',
        'testIstighfarTitle': '🤲 Recordatorio de Istighfar',
        'testIstighfarBody': 'Astaghfirullah al-Azeem wa atubu ilayh',
        'testAzkarTitle': '📖 Recordatorio de Azkar',
        'testAzkarBody': 'Es hora de los azkar de la mañana - prueba',
        'testVerseTitle': '📖 Verso del Día',
        'testVerseBody': '﴿ Con la dificultad viene la facilidad ﴾ - prueba',
        'testCustomTitle': '🔔 Recordatorio',
        'testCustomBody': 'Recordatorio personalizado de Ruh Al-Muslim',
        'testDefaultTitle': 'Notificación de prueba',
        'testDefaultBody': 'Esta es una notificación de prueba de Ruh Al-Muslim',
    },
    'ur': {
        'am': 'AM',
        'pm': 'PM',
        'daySun': 'اتوار',
        'dayMon': 'پیر',
        'dayTue': 'منگل',
        'dayWed': 'بدھ',
        'dayThu': 'جمعرات',
        'dayFri': 'جمعہ',
        'daySat': 'ہفتہ',
        'subhanallah': 'سبحان اللہ',
        'alhamdulillah': 'الحمد للہ',
        'defaultSound': 'ڈیفالٹ آواز',
        'silent': 'خاموش',
        'silentDesc': 'بغیر آواز',
        'testScheduledBody': 'یہ شیڈول شدہ نوٹیفکیشن ہے - شیڈولنگ کام کر رہی ہے ✅',
        'testPrayerTitle': '🕌 نماز کی یاد دہانی',
        'testPrayerBody': 'ظہر کی نماز کا وقت ہو گیا ہے - ٹیسٹ',
        'testSalawatTitle': '💚 نبی ﷺ پر درود',
        'testSalawatBody': 'اللهم صلِّ وسلم على نبينا محمد ﷺ',
        'testTasbihTitle': '📿 تسبیح کی یاد دہانی',
        'testTasbihBody': 'سبحان اللہ وبحمدہ، سبحان اللہ العظیم',
        'testIstighfarTitle': '🤲 استغفار کی یاد دہانی',
        'testIstighfarBody': 'أستغفر اللہ العظیم وأتوب إلیہ',
        'testAzkarTitle': '📖 اذکار کی یاد دہانی',
        'testAzkarBody': 'صبح کے اذکار کا وقت ہے - ٹیسٹ',
        'testVerseTitle': '📖 آج کی آیت',
        'testVerseBody': '﴿ بے شک مشکل کے ساتھ آسانی ہے ﴾ - ٹیسٹ',
        'testCustomTitle': '🔔 یاد دہانی',
        'testCustomBody': 'روح المسلم سے یاد دہانی',
        'testDefaultTitle': 'ٹیسٹ نوٹیفکیشن',
        'testDefaultBody': 'یہ روح المسلم سے ایک ٹیسٹ نوٹیفکیشن ہے',
    },
    'id': {
        'am': 'AM',
        'pm': 'PM',
        'daySun': 'Min',
        'dayMon': 'Sen',
        'dayTue': 'Sel',
        'dayWed': 'Rab',
        'dayThu': 'Kam',
        'dayFri': 'Jum',
        'daySat': 'Sab',
        'subhanallah': 'SubhanAllah',
        'alhamdulillah': 'Alhamdulillah',
        'defaultSound': 'Suara Default',
        'silent': 'Senyap',
        'silentDesc': 'Tanpa suara',
        'testScheduledBody': 'Ini notifikasi terjadwal - penjadwalan berfungsi ✅',
        'testPrayerTitle': '🕌 Pengingat Shalat',
        'testPrayerBody': 'Waktu shalat Dzuhur telah tiba - tes',
        'testSalawatTitle': '💚 Shalawat kepada Nabi ﷺ',
        'testSalawatBody': 'Ya Allah, curahkan shalawat kepada Nabi Muhammad ﷺ',
        'testTasbihTitle': '📿 Pengingat Tasbih',
        'testTasbihBody': 'SubhanAllah wa bihamdihi, SubhanAllah al-Azeem',
        'testIstighfarTitle': '🤲 Pengingat Istighfar',
        'testIstighfarBody': 'Astaghfirullah al-Azeem wa atubu ilayh',
        'testAzkarTitle': '📖 Pengingat Dzikir',
        'testAzkarBody': 'Waktunya dzikir pagi - tes notifikasi',
        'testVerseTitle': '📖 Ayat Hari Ini',
        'testVerseBody': '﴿ Sesungguhnya bersama kesulitan ada kemudahan ﴾ - tes',
        'testCustomTitle': '🔔 Pengingat',
        'testCustomBody': 'Pengingat khusus dari Ruh Al-Muslim',
        'testDefaultTitle': 'Notifikasi Tes',
        'testDefaultBody': 'Ini adalah notifikasi tes dari Ruh Al-Muslim',
    },
    'ms': {
        'am': 'AM',
        'pm': 'PM',
        'daySun': 'Ahd',
        'dayMon': 'Isn',
        'dayTue': 'Sel',
        'dayWed': 'Rab',
        'dayThu': 'Kha',
        'dayFri': 'Jum',
        'daySat': 'Sab',
        'subhanallah': 'SubhanAllah',
        'alhamdulillah': 'Alhamdulillah',
        'defaultSound': 'Bunyi Lalai',
        'silent': 'Senyap',
        'silentDesc': 'Tanpa bunyi',
        'testScheduledBody': 'Ini notifikasi berjadual - penjadualan berfungsi ✅',
        'testPrayerTitle': '🕌 Peringatan Solat',
        'testPrayerBody': 'Waktu solat Zohor telah tiba - ujian',
        'testSalawatTitle': '💚 Selawat ke atas Nabi ﷺ',
        'testSalawatBody': 'Ya Allah, selawat ke atas Nabi Muhammad ﷺ',
        'testTasbihTitle': '📿 Peringatan Tasbih',
        'testTasbihBody': 'SubhanAllah wa bihamdihi, SubhanAllah al-Azeem',
        'testIstighfarTitle': '🤲 Peringatan Istighfar',
        'testIstighfarBody': 'Astaghfirullah al-Azeem wa atubu ilayh',
        'testAzkarTitle': '📖 Peringatan Zikir',
        'testAzkarBody': 'Masa zikir pagi - ujian notifikasi',
        'testVerseTitle': '📖 Ayat Hari Ini',
        'testVerseBody': '﴿ Sesungguhnya bersama kesukaran ada kemudahan ﴾ - ujian',
        'testCustomTitle': '🔔 Peringatan',
        'testCustomBody': 'Peringatan khas dari Ruh Al-Muslim',
        'testDefaultTitle': 'Notifikasi Ujian',
        'testDefaultBody': 'Ini adalah notifikasi ujian dari Ruh Al-Muslim',
    },
    'hi': {
        'am': 'AM',
        'pm': 'PM',
        'daySun': 'रवि',
        'dayMon': 'सोम',
        'dayTue': 'मंगल',
        'dayWed': 'बुध',
        'dayThu': 'गुरु',
        'dayFri': 'शुक्र',
        'daySat': 'शनि',
        'subhanallah': 'सुबहानल्लाह',
        'alhamdulillah': 'अल्हम्दुलिल्लाह',
        'defaultSound': 'डिफ़ॉल्ट ध्वनि',
        'silent': 'मूक',
        'silentDesc': 'बिना आवाज़',
        'testScheduledBody': 'यह एक शेड्यूल्ड नोटिफिकेशन है - शेड्यूलिंग काम कर रही है ✅',
        'testPrayerTitle': '🕌 नमाज़ अलर्ट',
        'testPrayerBody': 'ज़ुहर की नमाज़ का समय हो गया है - टेस्ट',
        'testSalawatTitle': '💚 नबी ﷺ पर दरूद',
        'testSalawatBody': 'अल्लाहुम्मा सल्ली अला सय्यिदिना मुहम्मद ﷺ',
        'testTasbihTitle': '📿 तस्बीह रिमाइंडर',
        'testTasbihBody': 'सुबहानल्लाहि व बिहम्दिही, सुबहानल्लाहिल अज़ीम',
        'testIstighfarTitle': '🤲 इस्तिग़फ़ार रिमाइंडर',
        'testIstighfarBody': 'अस्तग़फ़िरुल्लाहिल अज़ीम व अतूबु इलैह',
        'testAzkarTitle': '📖 अज़कार रिमाइंडर',
        'testAzkarBody': 'सुबह के अज़कार का समय है - टेस्ट',
        'testVerseTitle': '📖 आज की आयत',
        'testVerseBody': '﴿ निश्चय ही कठिनाई के साथ आसानी है ﴾ - टेस्ट',
        'testCustomTitle': '🔔 रिमाइंडर',
        'testCustomBody': 'रूह अल-मुस्लिम से कस्टम रिमाइंडर',
        'testDefaultTitle': 'टेस्ट नोटिफिकेशन',
        'testDefaultBody': 'यह रूह अल-मुस्लिम से एक टेस्ट नोटिफिकेशन है',
    },
    'bn': {
        'am': 'AM',
        'pm': 'PM',
        'daySun': 'রবি',
        'dayMon': 'সোম',
        'dayTue': 'মঙ্গল',
        'dayWed': 'বুধ',
        'dayThu': 'বৃহ',
        'dayFri': 'শুক্র',
        'daySat': 'শনি',
        'subhanallah': 'সুবহানাল্লাহ',
        'alhamdulillah': 'আলহামদুলিল্লাহ',
        'defaultSound': 'ডিফল্ট সাউন্ড',
        'silent': 'নীরব',
        'silentDesc': 'শব্দ নেই',
        'testScheduledBody': 'এটি একটি নির্ধারিত বিজ্ঞপ্তি - নির্ধারণ কাজ করছে ✅',
        'testPrayerTitle': '🕌 নামাজের সতর্কতা',
        'testPrayerBody': 'যোহরের নামাজের সময় হয়েছে - পরীক্ষা',
        'testSalawatTitle': '💚 নবী ﷺ এর উপর দরূদ',
        'testSalawatBody': 'আল্লাহুম্মা সাল্লি আলা সাইয়্যিদিনা মুহাম্মাদ ﷺ',
        'testTasbihTitle': '📿 তাসবীহ স্মারক',
        'testTasbihBody': 'সুবহানাল্লাহি ওয়া বিহামদিহি, সুবহানাল্লাহিল আযীম',
        'testIstighfarTitle': '🤲 ইস্তিগফার স্মারক',
        'testIstighfarBody': 'আস্তাগফিরুল্লাহিল আযীম ওয়া আতুবু ইলাইহি',
        'testAzkarTitle': '📖 আযকার স্মারক',
        'testAzkarBody': 'সকালের আযকারের সময় - পরীক্ষা',
        'testVerseTitle': '📖 আজকের আয়াত',
        'testVerseBody': '﴿ নিশ্চয়ই কষ্টের সাথে স্বস্তি আছে ﴾ - পরীক্ষা',
        'testCustomTitle': '🔔 স্মারক',
        'testCustomBody': 'রূহ আল-মুসলিম থেকে কাস্টম স্মারক',
        'testDefaultTitle': 'পরীক্ষা বিজ্ঞপ্তি',
        'testDefaultBody': 'এটি রূহ আল-মুসলিম থেকে একটি পরীক্ষা বিজ্ঞপ্তি',
    },
    'ru': {
        'am': 'AM',
        'pm': 'PM',
        'daySun': 'Вс',
        'dayMon': 'Пн',
        'dayTue': 'Вт',
        'dayWed': 'Ср',
        'dayThu': 'Чт',
        'dayFri': 'Пт',
        'daySat': 'Сб',
        'subhanallah': 'СубханАллах',
        'alhamdulillah': 'Альхамдулиллях',
        'defaultSound': 'Звук по умолчанию',
        'silent': 'Без звука',
        'silentDesc': 'Без звука',
        'testScheduledBody': 'Это запланированное уведомление - планирование работает ✅',
        'testPrayerTitle': '🕌 Напоминание о намазе',
        'testPrayerBody': 'Наступило время намаза Зухр - тест',
        'testSalawatTitle': '💚 Салават Пророку ﷺ',
        'testSalawatBody': 'Аллахумма салли аля саййидина Мухаммад ﷺ',
        'testTasbihTitle': '📿 Напоминание о тасбихе',
        'testTasbihBody': 'СубханАллахи ва бихамдихи, СубханАллахиль Азым',
        'testIstighfarTitle': '🤲 Напоминание об истигфаре',
        'testIstighfarBody': 'АстагфируЛлахиль Азым ва атубу илейх',
        'testAzkarTitle': '📖 Напоминание об азкарах',
        'testAzkarBody': 'Время утренних азкаров - тест',
        'testVerseTitle': '📖 Аят дня',
        'testVerseBody': '﴿ Поистине, за трудностью следует облегчение ﴾ - тест',
        'testCustomTitle': '🔔 Напоминание',
        'testCustomBody': 'Пользовательское напоминание от Рух Аль-Муслим',
        'testDefaultTitle': 'Тестовое уведомление',
        'testDefaultBody': 'Это тестовое уведомление от Рух Аль-Муслим',
    },
}

LANG_ORDER = ['ar', 'en', 'fr', 'de', 'tr', 'es', 'ur', 'id', 'ms', 'hi', 'bn', 'ru']

# Map from language code to the const name used in translations.ts
LANG_CONSTS = {
    'ar': 'ar',
    'en': 'en',
    'fr': 'fr',
    'de': 'de',
    'tr': 'tr',
    'es': 'es',
    'ur': 'ur',
    'id': 'id',
    'ms': 'ms',
    'hi': 'hi',
    'bn': 'bn',
    'ru': 'ru',
}


def escape_ts(s: str) -> str:
    """Escape a string for TypeScript single-quoted string literal."""
    return s.replace('\\', '\\\\').replace("'", "\\'")


def add_keys_to_interface(content: str, keys: dict) -> str:
    """Add new keys to the TranslationKeys interface under notificationSounds."""
    ar_keys = keys['ar']
    lines_to_add = ''
    for key in ar_keys:
        # Check if key already exists
        if f"    {key}: string;" in content or f"    {key}:" in content:
            # Check specifically in notificationSounds section
            continue
        lines_to_add += f"    {key}: string;\n"
    
    if not lines_to_add:
        print("All interface keys already exist")
        return content
    
    # Find the closing of notificationSounds interface block
    # Look for the pattern: notificationSounds: { ... }
    # We need to find the closing }; of notificationSounds within the interface
    pattern = r'(notificationSounds:\s*\{[^}]*?)(  \};)'
    
    # More robust: find all content between notificationSounds: { and the next };
    ns_start = content.find('notificationSounds: {')
    if ns_start == -1:
        print("ERROR: Could not find notificationSounds in interface")
        return content
    
    # Find the closing }; after notificationSounds
    brace_count = 0
    i = content.index('{', ns_start)
    while i < len(content):
        if content[i] == '{':
            brace_count += 1
        elif content[i] == '}':
            brace_count -= 1
            if brace_count == 0:
                # Found the closing brace
                insert_pos = i
                break
        i += 1
    
    # Insert before the closing }
    content = content[:insert_pos] + lines_to_add + content[insert_pos:]
    print(f"Added {len(ar_keys)} keys to interface")
    return content


def add_keys_to_lang_block(content: str, lang: str, keys: dict) -> str:
    """Add new keys to a specific language's notificationSounds block."""
    lang_keys = keys.get(lang, keys.get('en', {}))
    
    # Find the language block's notificationSounds section
    # Pattern: const XX: Translations = { ... notificationSounds: { ... } ... }
    # We need to find notificationSounds within the specific language block
    
    # Find all occurrences of 'notificationSounds: {' and match to language
    search_start = 0
    lang_pattern = f"const {lang}: Translations"
    lang_pos = content.find(lang_pattern)
    if lang_pos == -1:
        # Try alternative patterns
        for pat in [f"const {lang} ", f"const {lang}:"]:
            lang_pos = content.find(pat)
            if lang_pos != -1:
                break
    
    if lang_pos == -1:
        print(f"WARNING: Could not find language block for '{lang}'")
        return content
    
    # Find notificationSounds within this language block
    ns_pos = content.find('notificationSounds: {', lang_pos)
    if ns_pos == -1:
        print(f"WARNING: Could not find notificationSounds in '{lang}' block")
        return content
    
    # Find the closing } of this notificationSounds block
    brace_count = 0
    i = content.index('{', ns_pos + len('notificationSounds:'))
    while i < len(content):
        if content[i] == '{':
            brace_count += 1
        elif content[i] == '}':
            brace_count -= 1
            if brace_count == 0:
                insert_pos = i
                break
        i += 1
    
    # Build the lines to insert
    lines = ''
    added = 0
    for key, value in lang_keys.items():
        # Check if key already exists in this section
        section = content[ns_pos:insert_pos]
        if f"    {key}:" in section or f"    {key} :" in section:
            continue
        escaped = escape_ts(value)
        lines += f"    {key}: '{escaped}',\n"
        added += 1
    
    if not lines:
        print(f"  {lang}: all keys already exist")
        return content
    
    content = content[:insert_pos] + lines + content[insert_pos:]
    print(f"  {lang}: added {added} keys")
    return content


def main():
    with open(TRANSLATIONS_FILE, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_len = len(content)
    
    # 1. Add to interface
    print("Adding keys to TranslationKeys interface...")
    content = add_keys_to_interface(content, NOTIFICATION_KEYS)
    
    # 2. Add to each language block
    print("\nAdding keys to language blocks...")
    for lang in LANG_ORDER:
        content = add_keys_to_lang_block(content, lang, NOTIFICATION_KEYS)
    
    with open(TRANSLATIONS_FILE, 'w', encoding='utf-8') as f:
        f.write(content)
    
    new_len = len(content)
    print(f"\nDone! File size: {original_len} -> {new_len} chars ({new_len - original_len:+d})")


if __name__ == '__main__':
    main()
