#!/usr/bin/env python3
"""
Fix missing common keys - add to the 5 missing languages
"""

with open('constants/translations.ts', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# The translations for missing languages
missing_translations = {
    'en': {
        'pattern': r"(updateNow: 'Update Now',\n  },\n  home: \{)",
        'keys': """    page: 'Page',
    open: 'Open',
    remove: 'Remove',
    appSharingSig: 'Ruh Al Muslim',
    networkError: 'Network Error',
    shareText: 'Share as Text',
"""
    },
    'fr': {
        'pattern': r"(updateNow: 'Mettre à jour',\n  },\n  home: \{)",
        'keys': """    page: 'Page',
    open: 'Ouvrir',
    remove: 'Supprimer',
    appSharingSig: 'Ruh Al Muslim',
    networkError: 'Erreur de réseau',
    shareText: 'Partager en texte',
"""
    },
    'es': {
        'pattern': r"(updateNow: 'Actualizar Ahora',\n  },\n  home: \{)",
        'keys': """    page: 'Página',
    open: 'Abrir',
    remove: 'Eliminar',
    appSharingSig: 'Ruh Al Muslim',
    networkError: 'Error de red',
    shareText: 'Compartir como texto',
"""
    },
    'ur': {
        'pattern': r"(updateNow: 'ابھی اپ ڈیٹ کریں',\n  },\n  home: \{)",
        'keys': """    page: 'صفحہ',
    open: 'کھولیں',
    remove: 'ہٹائیں',
    appSharingSig: 'روح المسلم',
    networkError: 'نیٹ ورک کی خرابی',
    shareText: 'متن کے طور پر شیئر کریں',
"""
    },
    'ms': {
        'pattern': r"(updateNow: 'Kemas Kini Sekarang',\n  },\n  home: \{)",
        'keys': """    page: 'Halaman',
    open: 'Buka',
    remove: 'Buang',
    appSharingSig: 'Ruh Al Muslim',
    networkError: 'Ralat Rangkaian',
    shareText: 'Kongsi sebagai teks',
"""
    },
}

count = 0
for lang, data in missing_translations.items():
    matches = re.findall(data['pattern'], content)
    if matches:
        updateNow_line = matches[0].split('\n')[0]
        replacement = updateNow_line + "\n" + data['keys'] + "  },\n  home: {"
        content = re.sub(data['pattern'], replacement, content, count=1)
        count += 1
        print(f"✅ Added keys to {lang}")
    else:
        print(f"⚠️ Pattern not found for {lang}")

with open('constants/translations.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Done. Fixed {count} languages.")
