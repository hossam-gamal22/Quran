#!/usr/bin/env python3
"""
Add missing common keys to translations.ts
Adds 6 keys to all 12 languages
"""

import re

# Read the file
with open('constants/translations.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# === PART 1: Add to TranslationKeys interface ===

new_interface_keys = '''    page: string;
    open: string;
    remove: string;
    appSharingSig: string;
    networkError: string;
    shareText: string;'''

# Insert before the closing }; of common in the interface
content = content.replace(
    '''    updateNow: string;
  };

  // التطبيق''',
    '''    updateNow: string;
''' + new_interface_keys + '''
  };

  // التطبيق'''
)

# === PART 2: Add translations to each language ===

translations = {
    'ar': {
        'page': 'صفحة',
        'open': 'فتح',
        'remove': 'إزالة',
        'appSharingSig': 'روح المسلم',
        'networkError': 'خطأ في الاتصال',
        'shareText': 'مشاركة كنص',
    },
    'en': {
        'page': 'Page',
        'open': 'Open',
        'remove': 'Remove',
        'appSharingSig': 'Ruh Al Muslim',
        'networkError': 'Network Error',
        'shareText': 'Share as Text',
    },
    'fr': {
        'page': 'Page',
        'open': 'Ouvrir',
        'remove': 'Supprimer',
        'appSharingSig': 'Ruh Al Muslim',
        'networkError': 'Erreur de réseau',
        'shareText': 'Partager en texte',
    },
    'de': {
        'page': 'Seite',
        'open': 'Öffnen',
        'remove': 'Entfernen',
        'appSharingSig': 'Ruh Al Muslim',
        'networkError': 'Netzwerkfehler',
        'shareText': 'Als Text teilen',
    },
    'tr': {
        'page': 'Sayfa',
        'open': 'Aç',
        'remove': 'Kaldır',
        'appSharingSig': 'Ruh Al Muslim',
        'networkError': 'Ağ Hatası',
        'shareText': 'Metin olarak paylaş',
    },
    'es': {
        'page': 'Página',
        'open': 'Abrir',
        'remove': 'Eliminar',
        'appSharingSig': 'Ruh Al Muslim',
        'networkError': 'Error de red',
        'shareText': 'Compartir como texto',
    },
    'ur': {
        'page': 'صفحہ',
        'open': 'کھولیں',
        'remove': 'ہٹائیں',
        'appSharingSig': 'روح المسلم',
        'networkError': 'نیٹ ورک کی خرابی',
        'shareText': 'متن کے طور پر شیئر کریں',
    },
    'id': {
        'page': 'Halaman',
        'open': 'Buka',
        'remove': 'Hapus',
        'appSharingSig': 'Ruh Al Muslim',
        'networkError': 'Kesalahan Jaringan',
        'shareText': 'Bagikan sebagai teks',
    },
    'ms': {
        'page': 'Halaman',
        'open': 'Buka',
        'remove': 'Buang',
        'appSharingSig': 'Ruh Al Muslim',
        'networkError': 'Ralat Rangkaian',
        'shareText': 'Kongsi sebagai teks',
    },
    'hi': {
        'page': 'पृष्ठ',
        'open': 'खोलें',
        'remove': 'हटाएं',
        'appSharingSig': 'रूह अल मुस्लिम',
        'networkError': 'नेटवर्क त्रुटि',
        'shareText': 'टेक्स्ट के रूप में साझा करें',
    },
    'bn': {
        'page': 'পৃষ্ঠা',
        'open': 'খুলুন',
        'remove': 'সরান',
        'appSharingSig': 'রুহ আল মুসলিম',
        'networkError': 'নেটওয়ার্ক ত্রুটি',
        'shareText': 'টেক্সট হিসাবে শেয়ার করুন',
    },
    'ru': {
        'page': 'Страница',
        'open': 'Открыть',
        'remove': 'Удалить',
        'appSharingSig': 'Ruh Al Muslim',
        'networkError': 'Ошибка сети',
        'shareText': 'Поделиться текстом',
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


# Use specific closing patterns for each language
# Pattern: updateNow: '...',\n  },\n  home: {
closing_patterns = {
    'ar': "updateNow: 'تحديث الآن',\n  },\n  home: {",
    'en': "updateNow: 'Update now',\n  },\n  home: {",
    'fr': "updateNow: 'Mettre à jour maintenant',\n  },\n  home: {",
    'de': "updateNow: 'Jetzt aktualisieren',\n  },\n  home: {",
    'tr': "updateNow: 'Şimdi Güncelle',\n  },\n  home: {",
    'es': "updateNow: 'Actualizar ahora',\n  },\n  home: {",
    'ur': "updateNow: 'ابھی اپڈیٹ کریں',\n  },\n  home: {",
    'id': "updateNow: 'Perbarui Sekarang',\n  },\n  home: {",
    'ms': "updateNow: 'Kemaskini Sekarang',\n  },\n  home: {",
    'hi': "updateNow: 'अभी अपडेट करें',\n  },\n  home: {",
    'bn': "updateNow: 'এখনই আপডেট করুন',\n  },\n  home: {",
    'ru': "updateNow: 'Обновить сейчас',\n  },\n  home: {",
}

for lang, trans in translations.items():
    additions = generate_additions(trans)
    
    pattern = closing_patterns.get(lang, '')
    if not pattern:
        continue
    
    # Replace closing pattern with keys before it
    target = pattern
    replacement = f"updateNow: '{pattern.split(':')[1].split(',')[0].strip().strip(chr(39))}',\n" + additions + "\n  },\n  home: {"
    
    content = content.replace(target, replacement, 1)


# Write the updated file
with open('constants/translations.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Added 6 common keys to interface")
print("✅ Added common translations to all 12 languages")
print(f"✅ Total keys added: {len(translations['ar']) * 12} ({len(translations['ar'])} keys × 12 languages)")
