#!/usr/bin/env python3
"""
Add remaining notification UI translation keys to constants/translations.ts
"""
import os

TRANSLATIONS_FILE = os.path.join(os.path.dirname(__file__), '..', 'constants', 'translations.ts')

NOTIFICATION_KEYS = {
    'ar': {
        'ayahNumber': 'رقم الآية',
        'listenToAyah': 'استماع للآية',
        'ayahAsSound': 'سيتم تشغيل تلاوة الآية كصوت التنبيه',
        'notificationsDisabled': 'الإشعارات معطلة',
        'tapToEnable': 'اضغط هنا لتفعيل الإشعارات',
        'enableNotifications': 'تفعيل الإشعارات',
        'notificationTypes': 'أنواع الإشعارات',
        'notificationSound': 'صوت الإشعارات',
        'vibration': 'الاهتزاز',
        'additionalSounds': 'أصوات إضافية',
        'soundsAvailable': 'صوت متاح للتحميل',
        'downloaded': 'تم التحميل',
        'download': 'تحميل',
        'notificationsInfo': 'تعمل الإشعارات حتى عند إغلاق التطبيق. تأكد من عدم تفعيل وضع توفير الطاقة لضمان وصول التنبيهات.',
        'theReciter': 'القارئ',
    },
    'en': {
        'ayahNumber': 'Ayah Number',
        'listenToAyah': 'Listen to Ayah',
        'ayahAsSound': 'Ayah recitation will be used as notification sound',
        'notificationsDisabled': 'Notifications Disabled',
        'tapToEnable': 'Tap here to enable notifications',
        'enableNotifications': 'Enable Notifications',
        'notificationTypes': 'Notification Types',
        'notificationSound': 'Notification Sound',
        'vibration': 'Vibration',
        'additionalSounds': 'Additional Sounds',
        'soundsAvailable': 'sounds available for download',
        'downloaded': 'Downloaded',
        'download': 'Download',
        'notificationsInfo': 'Notifications work even when the app is closed. Make sure power saving mode is disabled to ensure alerts are delivered.',
        'theReciter': 'Reciter',
    },
    'fr': {
        'ayahNumber': 'Numéro du verset',
        'listenToAyah': 'Écouter le verset',
        'ayahAsSound': 'La récitation du verset sera utilisée comme son de notification',
        'notificationsDisabled': 'Notifications désactivées',
        'tapToEnable': 'Appuyez ici pour activer les notifications',
        'enableNotifications': 'Activer les notifications',
        'notificationTypes': 'Types de notifications',
        'notificationSound': 'Son de notification',
        'vibration': 'Vibration',
        'additionalSounds': 'Sons supplémentaires',
        'soundsAvailable': 'sons disponibles au téléchargement',
        'downloaded': 'Téléchargé',
        'download': 'Télécharger',
        'notificationsInfo': 'Les notifications fonctionnent même lorsque l\'application est fermée. Assurez-vous que le mode économie d\'énergie est désactivé.',
        'theReciter': 'Récitateur',
    },
    'de': {
        'ayahNumber': 'Versnummer',
        'listenToAyah': 'Vers anhören',
        'ayahAsSound': 'Die Vers-Rezitation wird als Benachrichtigungston verwendet',
        'notificationsDisabled': 'Benachrichtigungen deaktiviert',
        'tapToEnable': 'Tippen Sie hier, um Benachrichtigungen zu aktivieren',
        'enableNotifications': 'Benachrichtigungen aktivieren',
        'notificationTypes': 'Benachrichtigungstypen',
        'notificationSound': 'Benachrichtigungston',
        'vibration': 'Vibration',
        'additionalSounds': 'Zusätzliche Töne',
        'soundsAvailable': 'Töne zum Herunterladen verfügbar',
        'downloaded': 'Heruntergeladen',
        'download': 'Herunterladen',
        'notificationsInfo': 'Benachrichtigungen funktionieren auch bei geschlossener App. Stellen Sie sicher, dass der Energiesparmodus deaktiviert ist.',
        'theReciter': 'Rezitator',
    },
    'tr': {
        'ayahNumber': 'Ayet Numarası',
        'listenToAyah': 'Ayeti Dinle',
        'ayahAsSound': 'Ayet tilaveti bildirim sesi olarak kullanılacak',
        'notificationsDisabled': 'Bildirimler Devre Dışı',
        'tapToEnable': 'Bildirimleri etkinleştirmek için dokunun',
        'enableNotifications': 'Bildirimleri Etkinleştir',
        'notificationTypes': 'Bildirim Türleri',
        'notificationSound': 'Bildirim Sesi',
        'vibration': 'Titreşim',
        'additionalSounds': 'Ek Sesler',
        'soundsAvailable': 'indirilebilir ses mevcut',
        'downloaded': 'İndirildi',
        'download': 'İndir',
        'notificationsInfo': 'Bildirimler uygulama kapalıyken bile çalışır. Uyarıların ulaştığından emin olmak için güç tasarrufu modunu devre dışı bırakın.',
        'theReciter': 'Karî',
    },
    'es': {
        'ayahNumber': 'Número del verso',
        'listenToAyah': 'Escuchar verso',
        'ayahAsSound': 'La recitación del verso se usará como sonido de notificación',
        'notificationsDisabled': 'Notificaciones Desactivadas',
        'tapToEnable': 'Toca aquí para activar las notificaciones',
        'enableNotifications': 'Activar Notificaciones',
        'notificationTypes': 'Tipos de Notificaciones',
        'notificationSound': 'Sonido de Notificación',
        'vibration': 'Vibración',
        'additionalSounds': 'Sonidos Adicionales',
        'soundsAvailable': 'sonidos disponibles para descargar',
        'downloaded': 'Descargado',
        'download': 'Descargar',
        'notificationsInfo': 'Las notificaciones funcionan incluso cuando la app está cerrada. Asegúrate de desactivar el modo de ahorro de energía.',
        'theReciter': 'Recitador',
    },
    'ur': {
        'ayahNumber': 'آیت نمبر',
        'listenToAyah': 'آیت سنیں',
        'ayahAsSound': 'آیت کی تلاوت نوٹیفکیشن کی آواز کے طور پر استعمال ہوگی',
        'notificationsDisabled': 'نوٹیفکیشنز غیر فعال',
        'tapToEnable': 'نوٹیفکیشنز فعال کرنے کے لیے یہاں ٹیپ کریں',
        'enableNotifications': 'نوٹیفکیشنز فعال کریں',
        'notificationTypes': 'نوٹیفکیشن کی اقسام',
        'notificationSound': 'نوٹیفکیشن آواز',
        'vibration': 'کمپن',
        'additionalSounds': 'اضافی آوازیں',
        'soundsAvailable': 'ڈاؤن لوڈ کے لیے آوازیں دستیاب',
        'downloaded': 'ڈاؤن لوڈ ہو گئی',
        'download': 'ڈاؤن لوڈ',
        'notificationsInfo': 'نوٹیفکیشنز ایپ بند ہونے پر بھی کام کرتی ہیں۔ یقینی بنائیں کہ پاور سیونگ موڈ غیر فعال ہے۔',
        'theReciter': 'قاری',
    },
    'id': {
        'ayahNumber': 'Nomor Ayat',
        'listenToAyah': 'Dengarkan Ayat',
        'ayahAsSound': 'Bacaan ayat akan digunakan sebagai suara notifikasi',
        'notificationsDisabled': 'Notifikasi Nonaktif',
        'tapToEnable': 'Ketuk di sini untuk mengaktifkan notifikasi',
        'enableNotifications': 'Aktifkan Notifikasi',
        'notificationTypes': 'Jenis Notifikasi',
        'notificationSound': 'Suara Notifikasi',
        'vibration': 'Getaran',
        'additionalSounds': 'Suara Tambahan',
        'soundsAvailable': 'suara tersedia untuk diunduh',
        'downloaded': 'Terunduh',
        'download': 'Unduh',
        'notificationsInfo': 'Notifikasi tetap berfungsi meski aplikasi ditutup. Pastikan mode hemat daya dinonaktifkan.',
        'theReciter': 'Qari',
    },
    'ms': {
        'ayahNumber': 'Nombor Ayat',
        'listenToAyah': 'Dengar Ayat',
        'ayahAsSound': 'Bacaan ayat akan digunakan sebagai bunyi pemberitahuan',
        'notificationsDisabled': 'Pemberitahuan Dinyahaktifkan',
        'tapToEnable': 'Ketik di sini untuk mengaktifkan pemberitahuan',
        'enableNotifications': 'Aktifkan Pemberitahuan',
        'notificationTypes': 'Jenis Pemberitahuan',
        'notificationSound': 'Bunyi Pemberitahuan',
        'vibration': 'Getaran',
        'additionalSounds': 'Bunyi Tambahan',
        'soundsAvailable': 'bunyi tersedia untuk dimuat turun',
        'downloaded': 'Dimuat Turun',
        'download': 'Muat Turun',
        'notificationsInfo': 'Pemberitahuan berfungsi walaupun aplikasi ditutup. Pastikan mod penjimatan kuasa dinyahaktifkan.',
        'theReciter': 'Qari',
    },
    'hi': {
        'ayahNumber': 'आयत संख्या',
        'listenToAyah': 'आयत सुनें',
        'ayahAsSound': 'आयत की तिलावत नोटिफिकेशन ध्वनि के रूप में उपयोग होगी',
        'notificationsDisabled': 'नोटिफिकेशन बंद',
        'tapToEnable': 'नोटिफिकेशन चालू करने के लिए यहाँ टैप करें',
        'enableNotifications': 'नोटिफिकेशन चालू करें',
        'notificationTypes': 'नोटिफिकेशन प्रकार',
        'notificationSound': 'नोटिफिकेशन ध्वनि',
        'vibration': 'कंपन',
        'additionalSounds': 'अतिरिक्त ध्वनियाँ',
        'soundsAvailable': 'डाउनलोड के लिए उपलब्ध',
        'downloaded': 'डाउनलोड हो गया',
        'download': 'डाउनलोड',
        'notificationsInfo': 'ऐप बंद होने पर भी नोटिफिकेशन काम करते हैं। सुनिश्चित करें कि पावर सेविंग मोड बंद है।',
        'theReciter': 'क़ारी',
    },
    'bn': {
        'ayahNumber': 'আয়াত নম্বর',
        'listenToAyah': 'আয়াত শুনুন',
        'ayahAsSound': 'আয়াতের তিলাওয়াত বিজ্ঞপ্তির শব্দ হিসেবে ব্যবহার হবে',
        'notificationsDisabled': 'বিজ্ঞপ্তি বন্ধ',
        'tapToEnable': 'বিজ্ঞপ্তি চালু করতে এখানে ট্যাপ করুন',
        'enableNotifications': 'বিজ্ঞপ্তি চালু করুন',
        'notificationTypes': 'বিজ্ঞপ্তির ধরন',
        'notificationSound': 'বিজ্ঞপ্তির শব্দ',
        'vibration': 'কম্পন',
        'additionalSounds': 'অতিরিক্ত শব্দ',
        'soundsAvailable': 'ডাউনলোডের জন্য উপলব্ধ',
        'downloaded': 'ডাউনলোড হয়েছে',
        'download': 'ডাউনলোড',
        'notificationsInfo': 'অ্যাপ বন্ধ থাকলেও বিজ্ঞপ্তি কাজ করে। নিশ্চিত করুন যে পাওয়ার সেভিং মোড বন্ধ আছে।',
        'theReciter': 'ক্বারী',
    },
    'ru': {
        'ayahNumber': 'Номер аята',
        'listenToAyah': 'Слушать аят',
        'ayahAsSound': 'Чтение аята будет использоваться как звук уведомления',
        'notificationsDisabled': 'Уведомления отключены',
        'tapToEnable': 'Нажмите здесь, чтобы включить уведомления',
        'enableNotifications': 'Включить уведомления',
        'notificationTypes': 'Типы уведомлений',
        'notificationSound': 'Звук уведомлений',
        'vibration': 'Вибрация',
        'additionalSounds': 'Дополнительные звуки',
        'soundsAvailable': 'звуков доступно для загрузки',
        'downloaded': 'Загружено',
        'download': 'Загрузить',
        'notificationsInfo': 'Уведомления работают даже при закрытом приложении. Убедитесь, что режим энергосбережения отключён.',
        'theReciter': 'Чтец',
    },
}

LANG_ORDER = ['ar', 'en', 'fr', 'de', 'tr', 'es', 'ur', 'id', 'ms', 'hi', 'bn', 'ru']


def escape_ts(s: str) -> str:
    return s.replace('\\', '\\\\').replace("'", "\\'")


def add_keys_to_interface(content: str, keys: dict) -> str:
    ar_keys = keys['ar']
    ns_start = content.find('notificationSounds: {')
    if ns_start == -1:
        print("ERROR: Could not find notificationSounds in interface")
        return content
    brace_count = 0
    i = content.index('{', ns_start)
    while i < len(content):
        if content[i] == '{':
            brace_count += 1
        elif content[i] == '}':
            brace_count -= 1
            if brace_count == 0:
                insert_pos = i
                break
        i += 1
    lines_to_add = ''
    section = content[ns_start:insert_pos]
    for key in ar_keys:
        if f"    {key}: string;" in section or f"    {key}:" in section:
            continue
        lines_to_add += f"    {key}: string;\n"
    if not lines_to_add:
        print("All interface keys already exist")
        return content
    content = content[:insert_pos] + lines_to_add + content[insert_pos:]
    count = lines_to_add.count('\n')
    print(f"Added {count} keys to interface")
    return content


def add_keys_to_lang_block(content: str, lang: str, keys: dict) -> str:
    lang_keys = keys.get(lang, keys.get('en', {}))
    lang_pattern = f"const {lang}: Translations"
    lang_pos = content.find(lang_pattern)
    if lang_pos == -1:
        for pat in [f"const {lang} ", f"const {lang}:"]:
            lang_pos = content.find(pat)
            if lang_pos != -1:
                break
    if lang_pos == -1:
        print(f"WARNING: Could not find language block for '{lang}'")
        return content
    ns_pos = content.find('notificationSounds: {', lang_pos)
    if ns_pos == -1:
        print(f"WARNING: Could not find notificationSounds in '{lang}' block")
        return content
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
    lines = ''
    added = 0
    section = content[ns_pos:insert_pos]
    for key, value in lang_keys.items():
        if f"    {key}:" in section:
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
    print("Adding keys to TranslationKeys interface...")
    content = add_keys_to_interface(content, NOTIFICATION_KEYS)
    print("\nAdding keys to language blocks...")
    for lang in LANG_ORDER:
        content = add_keys_to_lang_block(content, lang, NOTIFICATION_KEYS)
    with open(TRANSLATIONS_FILE, 'w', encoding='utf-8') as f:
        f.write(content)
    new_len = len(content)
    print(f"\nDone! File size: {original_len} -> {new_len} chars ({new_len - original_len:+d})")


if __name__ == '__main__':
    main()
