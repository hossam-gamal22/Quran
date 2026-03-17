#!/usr/bin/env python3
"""
Add aboutApp namespace to translations.ts
Adds 5 keys to all 12 languages
"""

import re

# Read the file
with open('constants/translations.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# === PART 1: Add to TranslationKeys interface ===
# Find a good place - after settings namespace

interface_addition = '''
  // عن التطبيق
  aboutApp: {
    emailSubject: string;
    subtitle: string;
    description: string;
    features: string;
    stats: string;
  };
'''

# Insert after the backup namespace
content = content.replace(
    '''  // النسخ الاحتياطي
  backup: {''',
    interface_addition + '''  // النسخ الاحتياطي
  backup: {'''
)

# === PART 2: Add translations to each language ===

translations = {
    'ar': {
        'emailSubject': 'استفسار عن تطبيق روح المسلم',
        'subtitle': 'روح المسلم - رفيقك الإيماني',
        'description': 'تطبيق إسلامي شامل يحتوي على القرآن الكريم والأذكار والأدعية ومواقيت الصلاة والقبلة والتسبيح وغيرها الكثير',
        'features': 'مميزات التطبيق',
        'stats': 'إحصائيات',
    },
    'en': {
        'emailSubject': 'Inquiry about Ruh Al Muslim App',
        'subtitle': 'Ruh Al Muslim - Your Faith Companion',
        'description': 'A comprehensive Islamic app with Quran, Azkar, Duas, Prayer Times, Qibla, Tasbih and much more',
        'features': 'App Features',
        'stats': 'Statistics',
    },
    'fr': {
        'emailSubject': 'Question sur l\'application Ruh Al Muslim',
        'subtitle': 'Ruh Al Muslim - Votre Compagnon de Foi',
        'description': 'Une application islamique complète avec Coran, Azkar, Duas, Horaires de prière, Qibla, Tasbih et bien plus',
        'features': 'Fonctionnalités de l\'application',
        'stats': 'Statistiques',
    },
    'de': {
        'emailSubject': 'Anfrage zur Ruh Al Muslim App',
        'subtitle': 'Ruh Al Muslim - Dein Glaubensbegleiter',
        'description': 'Eine umfassende islamische App mit Koran, Azkar, Duas, Gebetszeiten, Qibla, Tasbih und vielem mehr',
        'features': 'App-Funktionen',
        'stats': 'Statistiken',
    },
    'tr': {
        'emailSubject': 'Ruh Al Muslim Uygulaması Hakkında Soru',
        'subtitle': 'Ruh Al Muslim - İman Arkadaşınız',
        'description': 'Kur\'an, Zikirler, Dualar, Namaz Vakitleri, Kıble, Tesbih ve çok daha fazlasını içeren kapsamlı bir İslami uygulama',
        'features': 'Uygulama Özellikleri',
        'stats': 'İstatistikler',
    },
    'es': {
        'emailSubject': 'Consulta sobre la aplicación Ruh Al Muslim',
        'subtitle': 'Ruh Al Muslim - Tu Compañero de Fe',
        'description': 'Una aplicación islámica completa con Corán, Azkar, Duas, Horarios de oración, Qibla, Tasbih y mucho más',
        'features': 'Características de la App',
        'stats': 'Estadísticas',
    },
    'ur': {
        'emailSubject': 'روح المسلم ایپ کے بارے میں استفسار',
        'subtitle': 'روح المسلم - آپ کا ایمانی ساتھی',
        'description': 'قرآن، اذکار، دعائیں، نماز کے اوقات، قبلہ، تسبیح اور بہت کچھ کے ساتھ ایک مکمل اسلامی ایپ',
        'features': 'ایپ کی خصوصیات',
        'stats': 'اعداد و شمار',
    },
    'id': {
        'emailSubject': 'Pertanyaan tentang Aplikasi Ruh Al Muslim',
        'subtitle': 'Ruh Al Muslim - Pendamping Iman Anda',
        'description': 'Aplikasi Islami lengkap dengan Al-Quran, Zikir, Doa, Waktu Sholat, Kiblat, Tasbih dan banyak lagi',
        'features': 'Fitur Aplikasi',
        'stats': 'Statistik',
    },
    'ms': {
        'emailSubject': 'Pertanyaan tentang Aplikasi Ruh Al Muslim',
        'subtitle': 'Ruh Al Muslim - Teman Iman Anda',
        'description': 'Aplikasi Islam lengkap dengan Al-Quran, Zikir, Doa, Waktu Solat, Kiblat, Tasbih dan banyak lagi',
        'features': 'Ciri Aplikasi',
        'stats': 'Statistik',
    },
    'hi': {
        'emailSubject': 'रूह अल मुस्लिम ऐप के बारे में पूछताछ',
        'subtitle': 'रूह अल मुस्लिम - आपका ईमान साथी',
        'description': 'कुरान, अज़कार, दुआएं, नमाज़ का समय, क़िबला, तस्बीह और बहुत कुछ के साथ एक व्यापक इस्लामी ऐप',
        'features': 'ऐप की विशेषताएं',
        'stats': 'आंकड़े',
    },
    'bn': {
        'emailSubject': 'রুহ আল মুসলিম অ্যাপ সম্পর্কে জিজ্ঞাসা',
        'subtitle': 'রুহ আল মুসলিম - আপনার ঈমানের সঙ্গী',
        'description': 'কুরআন, আযকার, দোয়া, নামাজের সময়, কিবলা, তাসবিহ এবং আরও অনেক কিছু সহ একটি সম্পূর্ণ ইসলামিক অ্যাপ',
        'features': 'অ্যাপের বৈশিষ্ট্য',
        'stats': 'পরিসংখ্যান',
    },
    'ru': {
        'emailSubject': 'Вопрос о приложении Ruh Al Muslim',
        'subtitle': 'Ruh Al Muslim - Ваш спутник веры',
        'description': 'Комплексное исламское приложение с Кораном, Зикром, Дуа, Временем молитв, Киблой, Тасбихом и многим другим',
        'features': 'Возможности приложения',
        'stats': 'Статистика',
    },
}


def generate_namespace_block(trans):
    """Generate the aboutApp namespace block"""
    lines = ["  aboutApp: {"]
    for key, value in trans.items():
        escaped_value = value.replace("'", "\\'")
        lines.append(f"    {key}: '{escaped_value}',")
    lines.append("  },")
    return '\n'.join(lines)


# For each language, find the backup: { section and insert before it
# We need to find the language-specific patterns

# Language-specific backup translations
backup_patterns = {
    'ar': "  backup: {\n    saveBackup: 'حفظ النسخة الاحتياطية',",
    'en': "  backup: {\n    saveBackup: 'Save Backup',",
    'fr': "  backup: {\n    saveBackup: 'Enregistrer la sauvegarde',",
    'de': "  backup: {\n    saveBackup: 'Backup speichern',",
    'tr': "  backup: {\n    saveBackup: 'Yedeklemeyi Kaydet',",
    'es': "  backup: {\n    saveBackup: 'Guardar Copia',",
    'ur': "  backup: {\n    saveBackup: 'بیک اپ محفوظ کریں',",
    'id': "  backup: {\n    saveBackup: 'Simpan Cadangan',",
    'ms': "  backup: {\n    saveBackup: 'Simpan Sandaran',",
    'hi': "  backup: {\n    saveBackup: 'बैकअप सहेजें',",
    'bn': "  backup: {\n    saveBackup: 'ব্যাকআপ সংরক্ষণ করুন',",
    'ru': "  backup: {\n    saveBackup: 'Сохранить резервную копию',",
}

for lang, trans in translations.items():
    namespace_block = generate_namespace_block(trans)
    backup_pattern = backup_patterns.get(lang)
    
    if backup_pattern and backup_pattern in content:
        content = content.replace(
            backup_pattern,
            namespace_block + "\n" + backup_pattern
        )
        print(f"✅ Added aboutApp to {lang}")
    else:
        print(f"⚠️ Pattern not found for {lang}")

# Write the updated file
with open('constants/translations.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"✅ Added aboutApp namespace with 5 keys to interface and 12 languages")
print(f"✅ Total keys added: {len(translations['ar']) * 12} ({len(translations['ar'])} keys × 12 languages)")
