#!/usr/bin/env python3
"""
Add missing quranReminder namespace to translations.ts
Adds 11 keys to all 12 languages
"""

import re

# Read the file
with open('constants/translations.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# === PART 1: Add to TranslationKeys interface ===
# Find the favorites block in the interface (which we just added) and add quranReminder namespace after it

interface_quranReminder = '''
  // تذكير القرآن
  quranReminder: {
    title: string;
    reminder: string;
    everyDay: string;
    noDaysSelected: string;
    dontForgetQuran: string;
    enableReminder: string;
    setReminderTime: string;
    selectDays: string;
    deselectAll: string;
    selectAllDays: string;
    selectSound: string;
  };
'''

# Insert after favorites namespace in the interface
content = content.replace(
    '''  // المفضلة
  favorites: {
    title: string;
    verse: string;
    verseFrom: string;
    deleteConfirm: string;
    exportImage: string;
    saved: string;
    repeatCount: string;
    image: string;
    note: string;
    quran: string;
    bookmarks: string;
    azkar: string;
    other: string;
    sortByDate: string;
    sortBySurah: string;
    noQuranFavorites: string;
    addQuranHint: string;
    deleteBookmarkConfirm: string;
    noBookmarks: string;
    addBookmarkHint: string;
    noAzkarFavorites: string;
    addAzkarHint: string;
    namesOfAllah: string;
    noOtherFavorites: string;
    addOtherHint: string;
    removeFromFavoritesConfirm: string;
    chooseDesign: string;
    shareText: string;
    addNote: string;
    notePlaceholder: string;
    saveNote: string;
  };
}''',
    '''  // المفضلة
  favorites: {
    title: string;
    verse: string;
    verseFrom: string;
    deleteConfirm: string;
    exportImage: string;
    saved: string;
    repeatCount: string;
    image: string;
    note: string;
    quran: string;
    bookmarks: string;
    azkar: string;
    other: string;
    sortByDate: string;
    sortBySurah: string;
    noQuranFavorites: string;
    addQuranHint: string;
    deleteBookmarkConfirm: string;
    noBookmarks: string;
    addBookmarkHint: string;
    noAzkarFavorites: string;
    addAzkarHint: string;
    namesOfAllah: string;
    noOtherFavorites: string;
    addOtherHint: string;
    removeFromFavoritesConfirm: string;
    chooseDesign: string;
    shareText: string;
    addNote: string;
    notePlaceholder: string;
    saveNote: string;
  };
''' + interface_quranReminder + '''}'''
)

# === PART 2: Add translations to each language ===

# Translations for all 12 languages
translations = {
    'ar': {
        'title': 'تذكير قراءة القرآن',
        'reminder': 'التذكير',
        'everyDay': 'كل يوم',
        'noDaysSelected': 'لم يتم اختيار أيام',
        'dontForgetQuran': 'لا تنسَ وردك اليومي من القرآن الكريم',
        'enableReminder': 'تفعيل التذكير',
        'setReminderTime': 'تحديد وقت التذكير',
        'selectDays': 'اختيار الأيام',
        'deselectAll': 'إلغاء تحديد الكل',
        'selectAllDays': 'تحديد كل الأيام',
        'selectSound': 'اختيار صوت التنبيه',
    },
    'en': {
        'title': 'Quran Reading Reminder',
        'reminder': 'Reminder',
        'everyDay': 'Every day',
        'noDaysSelected': 'No days selected',
        'dontForgetQuran': 'Don\'t forget your daily portion of the Holy Quran',
        'enableReminder': 'Enable Reminder',
        'setReminderTime': 'Set Reminder Time',
        'selectDays': 'Select Days',
        'deselectAll': 'Deselect All',
        'selectAllDays': 'Select All Days',
        'selectSound': 'Select Notification Sound',
    },
    'fr': {
        'title': 'Rappel de lecture du Coran',
        'reminder': 'Rappel',
        'everyDay': 'Tous les jours',
        'noDaysSelected': 'Aucun jour sélectionné',
        'dontForgetQuran': 'N\'oubliez pas votre portion quotidienne du Saint Coran',
        'enableReminder': 'Activer le rappel',
        'setReminderTime': 'Définir l\'heure du rappel',
        'selectDays': 'Sélectionner les jours',
        'deselectAll': 'Tout désélectionner',
        'selectAllDays': 'Sélectionner tous les jours',
        'selectSound': 'Sélectionner le son de notification',
    },
    'de': {
        'title': 'Quran-Leseerinnerung',
        'reminder': 'Erinnerung',
        'everyDay': 'Jeden Tag',
        'noDaysSelected': 'Keine Tage ausgewählt',
        'dontForgetQuran': 'Vergessen Sie nicht Ihren täglichen Anteil am Heiligen Quran',
        'enableReminder': 'Erinnerung aktivieren',
        'setReminderTime': 'Erinnerungszeit festlegen',
        'selectDays': 'Tage auswählen',
        'deselectAll': 'Alle abwählen',
        'selectAllDays': 'Alle Tage auswählen',
        'selectSound': 'Benachrichtigungston auswählen',
    },
    'es': {
        'title': 'Recordatorio de lectura del Corán',
        'reminder': 'Recordatorio',
        'everyDay': 'Todos los días',
        'noDaysSelected': 'No hay días seleccionados',
        'dontForgetQuran': 'No olvides tu porción diaria del Sagrado Corán',
        'enableReminder': 'Activar recordatorio',
        'setReminderTime': 'Establecer hora del recordatorio',
        'selectDays': 'Seleccionar días',
        'deselectAll': 'Deseleccionar todo',
        'selectAllDays': 'Seleccionar todos los días',
        'selectSound': 'Seleccionar sonido de notificación',
    },
    'tr': {
        'title': 'Kur\'an Okuma Hatırlatıcısı',
        'reminder': 'Hatırlatıcı',
        'everyDay': 'Her gün',
        'noDaysSelected': 'Seçili gün yok',
        'dontForgetQuran': 'Kutsal Kur\'an\'daki günlük payınızı unutmayın',
        'enableReminder': 'Hatırlatıcıyı etkinleştir',
        'setReminderTime': 'Hatırlatma zamanını ayarla',
        'selectDays': 'Günleri seç',
        'deselectAll': 'Tümünü kaldır',
        'selectAllDays': 'Tüm günleri seç',
        'selectSound': 'Bildirim sesini seç',
    },
    'ur': {
        'title': 'قرآن پڑھنے کی یاد دہانی',
        'reminder': 'یاد دہانی',
        'everyDay': 'ہر روز',
        'noDaysSelected': 'کوئی دن منتخب نہیں',
        'dontForgetQuran': 'قرآن پاک کا اپنا روزانہ کا حصہ نہ بھولیں',
        'enableReminder': 'یاد دہانی فعال کریں',
        'setReminderTime': 'یاد دہانی کا وقت مقرر کریں',
        'selectDays': 'دن منتخب کریں',
        'deselectAll': 'سب کو غیر منتخب کریں',
        'selectAllDays': 'تمام دن منتخب کریں',
        'selectSound': 'نوٹیفکیشن آواز منتخب کریں',
    },
    'id': {
        'title': 'Pengingat Membaca Al-Quran',
        'reminder': 'Pengingat',
        'everyDay': 'Setiap hari',
        'noDaysSelected': 'Tidak ada hari yang dipilih',
        'dontForgetQuran': 'Jangan lupa porsi harian Anda dari Al-Quran',
        'enableReminder': 'Aktifkan Pengingat',
        'setReminderTime': 'Atur Waktu Pengingat',
        'selectDays': 'Pilih Hari',
        'deselectAll': 'Batalkan Semua',
        'selectAllDays': 'Pilih Semua Hari',
        'selectSound': 'Pilih Suara Notifikasi',
    },
    'ms': {
        'title': 'Peringatan Membaca Al-Quran',
        'reminder': 'Peringatan',
        'everyDay': 'Setiap hari',
        'noDaysSelected': 'Tiada hari dipilih',
        'dontForgetQuran': 'Jangan lupa bahagian harian anda dari Al-Quran',
        'enableReminder': 'Aktifkan Peringatan',
        'setReminderTime': 'Tetapkan Masa Peringatan',
        'selectDays': 'Pilih Hari',
        'deselectAll': 'Nyahpilih Semua',
        'selectAllDays': 'Pilih Semua Hari',
        'selectSound': 'Pilih Bunyi Pemberitahuan',
    },
    'hi': {
        'title': 'कुरान पढ़ने का रिमाइंडर',
        'reminder': 'रिमाइंडर',
        'everyDay': 'हर दिन',
        'noDaysSelected': 'कोई दिन चयनित नहीं',
        'dontForgetQuran': 'पवित्र कुरान का अपना दैनिक हिस्सा न भूलें',
        'enableReminder': 'रिमाइंडर सक्षम करें',
        'setReminderTime': 'रिमाइंडर समय सेट करें',
        'selectDays': 'दिन चुनें',
        'deselectAll': 'सभी को अचयनित करें',
        'selectAllDays': 'सभी दिन चुनें',
        'selectSound': 'नोटिफिकेशन ध्वनि चुनें',
    },
    'bn': {
        'title': 'কুরআন পড়ার রিমাইন্ডার',
        'reminder': 'রিমাইন্ডার',
        'everyDay': 'প্রতিদিন',
        'noDaysSelected': 'কোনো দিন নির্বাচিত নয়',
        'dontForgetQuran': 'পবিত্র কুরআনের আপনার দৈনিক অংশ ভুলে যাবেন না',
        'enableReminder': 'রিমাইন্ডার সক্রিয় করুন',
        'setReminderTime': 'রিমাইন্ডার সময় সেট করুন',
        'selectDays': 'দিন নির্বাচন করুন',
        'deselectAll': 'সব অনির্বাচিত করুন',
        'selectAllDays': 'সব দিন নির্বাচন করুন',
        'selectSound': 'নোটিফিকেশন সাউন্ড নির্বাচন করুন',
    },
    'ru': {
        'title': 'Напоминание о чтении Корана',
        'reminder': 'Напоминание',
        'everyDay': 'Каждый день',
        'noDaysSelected': 'Дни не выбраны',
        'dontForgetQuran': 'Не забывайте о вашей ежедневной порции Священного Корана',
        'enableReminder': 'Включить напоминание',
        'setReminderTime': 'Установить время напоминания',
        'selectDays': 'Выбрать дни',
        'deselectAll': 'Снять все выделения',
        'selectAllDays': 'Выбрать все дни',
        'selectSound': 'Выбрать звук уведомления',
    },
}


def generate_quranReminder_block(lang, trans):
    """Generate the quranReminder object for a language"""
    lines = ['  quranReminder: {']
    for key, value in trans.items():
        # Escape single quotes
        escaped_value = value.replace("'", "\\'")
        lines.append(f"    {key}: '{escaped_value}',")
    lines.append('  },')
    return '\n'.join(lines)


# Now we need to add quranReminder to each language translation block
# We'll add it after the favorites block in each language

for lang, trans in translations.items():
    quranReminder_block = generate_quranReminder_block(lang, trans)
    
    # Find the favorites block for this language and add quranReminder after it
    # The pattern is: favorites: { ... }, as a block ending with },
    # We need a regex that matches the favorites block and adds quranReminder after it
    
    # First let's find if lang is 'ar', 'en', 'fr', etc. and look for it
    # Actually, we can look for each language's subscription block + favorites block
    # and add quranReminder after favorites
    
    # Simpler approach: search for "  favorites: {" followed by "saveNote:" and then "},", 
    # and after that add the quranReminder block

# Alternative approach: Find each `const LANG:` block and add quranReminder after its favorites block
# Let's use a different approach - find favorites: { ... saveNote: '...' then }, and add after

for lang, trans in translations.items():
    quranReminder_block = generate_quranReminder_block(lang, trans)
    
    # Get the Arabic translation for saveNote to match in the Arabic block
    # Actually, let's be more specific - find each language separately
    
    # For AR
    if lang == 'ar':
        target = "saveNote: 'حفظ الملاحظة',\n  },"
        replacement = "saveNote: 'حفظ الملاحظة',\n  },\n" + quranReminder_block
    elif lang == 'en':
        target = "saveNote: 'Save Note',\n  },"
        replacement = "saveNote: 'Save Note',\n  },\n" + quranReminder_block
    elif lang == 'fr':
        target = "saveNote: 'Enregistrer la note',\n  },"
        replacement = "saveNote: 'Enregistrer la note',\n  },\n" + quranReminder_block
    elif lang == 'de':
        target = "saveNote: 'Notiz speichern',\n  },"
        replacement = "saveNote: 'Notiz speichern',\n  },\n" + quranReminder_block
    elif lang == 'tr':
        target = "saveNote: 'Notu kaydet',\n  },"
        replacement = "saveNote: 'Notu kaydet',\n  },\n" + quranReminder_block
    elif lang == 'es':
        target = "saveNote: 'Guardar nota',\n  },"
        replacement = "saveNote: 'Guardar nota',\n  },\n" + quranReminder_block
    elif lang == 'ur':
        target = "saveNote: 'نوٹ محفوظ کریں',\n  },"
        replacement = "saveNote: 'نوٹ محفوظ کریں',\n  },\n" + quranReminder_block
    elif lang == 'id':
        target = "saveNote: 'Simpan Catatan',\n  },"
        replacement = "saveNote: 'Simpan Catatan',\n  },\n" + quranReminder_block
    elif lang == 'ms':
        target = "saveNote: 'Simpan Nota',\n  },"
        replacement = "saveNote: 'Simpan Nota',\n  },\n" + quranReminder_block
    elif lang == 'hi':
        target = "saveNote: 'नोट सहेजें',\n  },"
        replacement = "saveNote: 'नोट सहेजें',\n  },\n" + quranReminder_block
    elif lang == 'bn':
        target = "saveNote: 'নোট সংরক্ষণ করুন',\n  },"
        replacement = "saveNote: 'নোট সংরক্ষণ করুন',\n  },\n" + quranReminder_block
    elif lang == 'ru':
        target = "saveNote: 'Сохранить заметку',\n  },"
        replacement = "saveNote: 'Сохранить заметку',\n  },\n" + quranReminder_block
    else:
        continue
    
    content = content.replace(target, replacement, 1)


# Write the updated file
with open('constants/translations.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Added quranReminder namespace to interface")
print("✅ Added quranReminder translations to all 12 languages")
print(f"✅ Total keys added: {len(translations['ar']) * 12} ({len(translations['ar'])} keys × 12 languages)")
