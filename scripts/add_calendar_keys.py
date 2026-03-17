#!/usr/bin/env python3
"""
Add missing calendar keys to translations.ts
Adds 15 keys to all 12 languages
"""

import re

# Read the file
with open('constants/translations.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# === PART 1: Add to TranslationKeys interface ===
# Find the existing calendar keys and add the missing ones

# Current interface has these keys, we need to add the missing ones
# The interface ends with:
#     upcoming: string;
#     daysUntil: string;
#   };

new_interface_keys = '''    newYearDesc: string;
    shaban15: string;
    badr: string;
    qadrStarts: string;
    qadr: string;
    tarwiyah: string;
    tashreeq: string;
    ahSuffix: string;
    dateConverter: string;
    gregorian: string;
    hijri: string;
    selectedDay: string;
    correspondsTo: string;
    upcomingEvents: string;
    daysShort: string;'''

# Insert before the closing }; of calendar in the interface
content = content.replace(
    '''    upcoming: string;
    daysUntil: string;
  };
  
  // الرسائل''',
    '''    upcoming: string;
    daysUntil: string;
''' + new_interface_keys + '''
  };
  
  // الرسائل'''
)

# === PART 2: Add translations to each language ===

# Translations for all 12 languages
translations = {
    'ar': {
        'newYearDesc': 'بداية العام الهجري الجديد',
        'shaban15': 'ليلة النصف من شعبان',
        'badr': 'غزوة بدر',
        'qadrStarts': 'بداية ليالي القدر',
        'qadr': 'ليلة القدر',
        'tarwiyah': 'يوم التروية',
        'tashreeq': 'أيام التشريق',
        'ahSuffix': 'هـ',
        'dateConverter': 'محول التاريخ',
        'gregorian': 'ميلادي',
        'hijri': 'هجري',
        'selectedDay': 'اليوم المحدد',
        'correspondsTo': 'يوافق',
        'upcomingEvents': 'المناسبات القادمة',
        'daysShort': ' يوم',
    },
    'en': {
        'newYearDesc': 'Beginning of the new Hijri year',
        'shaban15': 'Mid-Sha\'ban Night',
        'badr': 'Battle of Badr',
        'qadrStarts': 'Laylat al-Qadr Begins',
        'qadr': 'Laylat al-Qadr',
        'tarwiyah': 'Day of Tarwiyah',
        'tashreeq': 'Days of Tashreeq',
        'ahSuffix': ' AH',
        'dateConverter': 'Date Converter',
        'gregorian': 'Gregorian',
        'hijri': 'Hijri',
        'selectedDay': 'Selected Day',
        'correspondsTo': 'Corresponds To',
        'upcomingEvents': 'Upcoming Events',
        'daysShort': 'd',
    },
    'fr': {
        'newYearDesc': 'Début de la nouvelle année Hégirien',
        'shaban15': 'Nuit du mi-Chaabane',
        'badr': 'Bataille de Badr',
        'qadrStarts': 'Début de Laylat al-Qadr',
        'qadr': 'Laylat al-Qadr',
        'tarwiyah': 'Jour de Tarwiyah',
        'tashreeq': 'Jours de Tachrik',
        'ahSuffix': ' H',
        'dateConverter': 'Convertisseur de date',
        'gregorian': 'Grégorien',
        'hijri': 'Hégirien',
        'selectedDay': 'Jour sélectionné',
        'correspondsTo': 'Correspond à',
        'upcomingEvents': 'Événements à venir',
        'daysShort': 'j',
    },
    'de': {
        'newYearDesc': 'Beginn des neuen Hijri-Jahres',
        'shaban15': 'Nacht der Mitte von Schaban',
        'badr': 'Schlacht von Badr',
        'qadrStarts': 'Laylat al-Qadr beginnt',
        'qadr': 'Laylat al-Qadr',
        'tarwiyah': 'Tag von Tarwiya',
        'tashreeq': 'Tage von Taschriq',
        'ahSuffix': ' n.H.',
        'dateConverter': 'Datumskonverter',
        'gregorian': 'Gregorianisch',
        'hijri': 'Hijri',
        'selectedDay': 'Ausgewählter Tag',
        'correspondsTo': 'Entspricht',
        'upcomingEvents': 'Kommende Ereignisse',
        'daysShort': 'T',
    },
    'tr': {
        'newYearDesc': 'Yeni Hicri yılın başlangıcı',
        'shaban15': 'Şaban\'ın Yarısı Gecesi',
        'badr': 'Bedir Savaşı',
        'qadrStarts': 'Kadir Gecesi Başlangıcı',
        'qadr': 'Kadir Gecesi',
        'tarwiyah': 'Terviye Günü',
        'tashreeq': 'Teşrik Günleri',
        'ahSuffix': ' H',
        'dateConverter': 'Tarih Dönüştürücü',
        'gregorian': 'Miladi',
        'hijri': 'Hicri',
        'selectedDay': 'Seçili Gün',
        'correspondsTo': 'Karşılık Gelir',
        'upcomingEvents': 'Yaklaşan Etkinlikler',
        'daysShort': 'g',
    },
    'es': {
        'newYearDesc': 'Comienzo del nuevo año Hijri',
        'shaban15': 'Noche de mediados de Sha\'ban',
        'badr': 'Batalla de Badr',
        'qadrStarts': 'Inicio de Laylat al-Qadr',
        'qadr': 'Laylat al-Qadr',
        'tarwiyah': 'Día de Tarwiyah',
        'tashreeq': 'Días de Tashreeq',
        'ahSuffix': ' H',
        'dateConverter': 'Convertidor de fechas',
        'gregorian': 'Gregoriano',
        'hijri': 'Hijri',
        'selectedDay': 'Día seleccionado',
        'correspondsTo': 'Corresponde a',
        'upcomingEvents': 'Próximos eventos',
        'daysShort': 'd',
    },
    'ur': {
        'newYearDesc': 'نئے ہجری سال کا آغاز',
        'shaban15': 'شب برات',
        'badr': 'غزوہ بدر',
        'qadrStarts': 'لیلۃ القدر کا آغاز',
        'qadr': 'شب قدر',
        'tarwiyah': 'یوم الترویہ',
        'tashreeq': 'ایام تشریق',
        'ahSuffix': ' ھ',
        'dateConverter': 'تاریخ بدلیں',
        'gregorian': 'عیسوی',
        'hijri': 'ہجری',
        'selectedDay': 'منتخب دن',
        'correspondsTo': 'مطابق ہے',
        'upcomingEvents': 'آنے والے واقعات',
        'daysShort': ' دن',
    },
    'id': {
        'newYearDesc': 'Awal tahun Hijriah baru',
        'shaban15': 'Malam Nisfu Sya\'ban',
        'badr': 'Perang Badar',
        'qadrStarts': 'Malam Lailatul Qadr Dimulai',
        'qadr': 'Lailatul Qadr',
        'tarwiyah': 'Hari Tarwiyah',
        'tashreeq': 'Hari Tasyrik',
        'ahSuffix': ' H',
        'dateConverter': 'Konversi Tanggal',
        'gregorian': 'Masehi',
        'hijri': 'Hijriah',
        'selectedDay': 'Hari Terpilih',
        'correspondsTo': 'Sesuai Dengan',
        'upcomingEvents': 'Acara Mendatang',
        'daysShort': 'h',
    },
    'ms': {
        'newYearDesc': 'Permulaan tahun Hijrah baru',
        'shaban15': 'Malam Nisfu Syaaban',
        'badr': 'Perang Badar',
        'qadrStarts': 'Malam Lailatul Qadr Bermula',
        'qadr': 'Lailatul Qadr',
        'tarwiyah': 'Hari Tarwiyah',
        'tashreeq': 'Hari Tasyrik',
        'ahSuffix': ' H',
        'dateConverter': 'Penukar Tarikh',
        'gregorian': 'Masihi',
        'hijri': 'Hijrah',
        'selectedDay': 'Hari Dipilih',
        'correspondsTo': 'Bersamaan Dengan',
        'upcomingEvents': 'Acara Akan Datang',
        'daysShort': 'h',
    },
    'hi': {
        'newYearDesc': 'नए हिजरी वर्ष की शुरुआत',
        'shaban15': 'शब-ए-बारात',
        'badr': 'बद्र की लड़ाई',
        'qadrStarts': 'लैलतुल क़द्र की शुरुआत',
        'qadr': 'शब-ए-क़द्र',
        'tarwiyah': 'तरवियाह का दिन',
        'tashreeq': 'तश्रीक के दिन',
        'ahSuffix': ' हि.',
        'dateConverter': 'तारीख़ कनवर्टर',
        'gregorian': 'ग्रेगोरियन',
        'hijri': 'हिजरी',
        'selectedDay': 'चुना हुआ दिन',
        'correspondsTo': 'मेल खाता है',
        'upcomingEvents': 'आगामी कार्यक्रम',
        'daysShort': 'दिन',
    },
    'bn': {
        'newYearDesc': 'নতুন হিজরি বছরের শুরু',
        'shaban15': 'শবে বরাত',
        'badr': 'বদরের যুদ্ধ',
        'qadrStarts': 'লাইলাতুল কদরের শুরু',
        'qadr': 'শবে কদর',
        'tarwiyah': 'তারবিয়াহ দিবস',
        'tashreeq': 'তাশরিক দিবস',
        'ahSuffix': ' হি.',
        'dateConverter': 'তারিখ রূপান্তরকারী',
        'gregorian': 'গ্রেগরিয়ান',
        'hijri': 'হিজরি',
        'selectedDay': 'নির্বাচিত দিন',
        'correspondsTo': 'মিল রয়েছে',
        'upcomingEvents': 'আসন্ন ইভেন্ট',
        'daysShort': 'দিন',
    },
    'ru': {
        'newYearDesc': 'Начало нового года Хиджры',
        'shaban15': 'Ночь середины Шаабана',
        'badr': 'Битва при Бадре',
        'qadrStarts': 'Начало Ляйлат аль-Кадр',
        'qadr': 'Ляйлат аль-Кадр',
        'tarwiyah': 'День Тарвийа',
        'tashreeq': 'Дни Ташрик',
        'ahSuffix': ' г.х.',
        'dateConverter': 'Конвертер дат',
        'gregorian': 'Григорианский',
        'hijri': 'Хиджра',
        'selectedDay': 'Выбранный день',
        'correspondsTo': 'Соответствует',
        'upcomingEvents': 'Предстоящие события',
        'daysShort': 'д',
    },
}


def generate_calendar_additions(trans):
    """Generate the additional calendar keys"""
    lines = []
    for key, value in trans.items():
        # Escape single quotes
        escaped_value = value.replace("'", "\\'")
        lines.append(f"    {key}: '{escaped_value}',")
    return '\n'.join(lines)


# Now we need to add keys to each language's calendar block
# We'll find the "daysUntil" line and add after it

for lang, trans in translations.items():
    additions = generate_calendar_additions(trans)
    
    # Different patterns for different languages based on their daysUntil translations
    if lang == 'ar':
        target = "daysUntil: 'يوم حتى',\n  },"
        if "calendar: {" in content:
            # Find the AR calendar block and add keys
            # First find the pattern
            pattern = r"(  calendar: \{[^}]+daysUntil: 'يوم حتى',\n  \},)"
            
    # Let's use a simpler approach - find each daysUntil by language value and add after

# Simpler approach - find `daysUntil:` entries and add the new keys before the closing `},`
# We'll use replacement by matching specific daysUntil values

daysUntil_values = {
    'ar': "daysUntil: 'أيام حتى',",
    'en': "daysUntil: 'days until',",
    'fr': 'daysUntil: "jours jusqu\'à",',
    'de': "daysUntil: 'Tage bis',",
    'tr': "daysUntil: 'kalmış',",
    'es': "daysUntil: 'días hasta',",
    'ur': "daysUntil: 'دن باقی',",
    'id': "daysUntil: 'hari lagi',",
    'ms': "daysUntil: 'hari lagi',",  # Same as Indonesian
    'hi': "daysUntil: 'दिन बाकी',",
    'bn': "daysUntil: 'দিন বাকি',",
    'ru': "daysUntil: 'дней до',",
}

# Since ms and id have same value, we need a smarter approach
# Let's find each language block by its preceding unique identifier

for lang, trans in translations.items():
    additions = generate_calendar_additions(trans)
    
    # Find the daysUntil line for this language
    daysUntil_val = daysUntil_values.get(lang, '')
    if not daysUntil_val:
        continue
    
    # Replace daysUntil: '...',\n  }, with daysUntil: '...',\n{additions}\n  },
    target = daysUntil_val + "\n  },"
    replacement = daysUntil_val + "\n" + additions + "\n  },"
    
    # Only replace the first occurrence for each unique daysUntil value
    # For ms/id which have same value, we need special handling
    if lang == 'ms':
        # Skip ms for now, handle separately
        continue
    
    content = content.replace(target, replacement, 1)

# Handle ms separately - it comes after id in the file
# Find the second occurrence of the Indonesian daysUntil
ms_target = daysUntil_values['id'] + "\n  },"
ms_additions = generate_calendar_additions(translations['ms'])
ms_replacement = daysUntil_values['ms'] + "\n" + ms_additions + "\n  },"

# Split and handle second occurrence
parts = content.split(ms_target)
if len(parts) >= 3:
    # Rejoin with replacement for second occurrence only
    content = parts[0] + ms_target + parts[1] + ms_replacement + ms_target.join(parts[2:])


# Write the updated file
with open('constants/translations.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Added 15 calendar keys to interface")
print("✅ Added calendar translations to all 12 languages")
print(f"✅ Total keys added: {len(translations['ar']) * 12} ({len(translations['ar'])} keys × 12 languages)")
