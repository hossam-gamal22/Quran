#!/usr/bin/env python3
"""Add missing translation keys to all languages in translations.ts"""

import re

TRANSLATIONS_FILE = 'constants/translations.ts'

# Each language's unique 'days' value to find the right section
LANG_DAYS = {
    'fr': "jours",
    'de': "Tage",
    'tr': "gün",  
    'es': "días",
    'ur': "دن",
    'id': "hari",
    'ms': "hari",
    'hi': "दिन",
    'bn': "দিন",
    'ru': "дней",
}

NEW_KEYS = {
    'fr': [
        ("azkarSection", "Azkar"),
        ("duasSection", "Duas et Ruqya"),
        ("worshipSection", "Adoration"),
        ("surahKahf", "Sourate Al-Kahf"),
        ("ayatKursi", "Ayat Al-Kursi"),
        ("surahYasin", "Sourate Yasin"),
        ("surahMulk", "Sourate Al-Mulk"),
        ("namesOfAllah", "Noms d'Allah"),
        ("salawat", "Salawat"),
        ("istighfar", "Istighfar"),
        ("seerah", "Biographie du Prophète"),
        ("benefitAzkar", "Bienfaits des Azkar"),
        ("worshipTracker", "Suivi des adorations"),
        ("khatmaQuran", "Khatma du Coran"),
    ],
    'de': [
        ("azkarSection", "Azkar"),
        ("duasSection", "Duas & Ruqya"),
        ("worshipSection", "Anbetung"),
        ("surahKahf", "Sure Al-Kahf"),
        ("ayatKursi", "Ayat Al-Kursi"),
        ("surahYasin", "Sure Yasin"),
        ("surahMulk", "Sure Al-Mulk"),
        ("namesOfAllah", "Namen Allahs"),
        ("salawat", "Salawat"),
        ("istighfar", "Istighfar"),
        ("seerah", "Prophetenbiografie"),
        ("benefitAzkar", "Nutzen der Azkar"),
        ("worshipTracker", "Anbetungs-Tracker"),
        ("khatmaQuran", "Koran Khatma"),
    ],
    'tr': [
        ("azkarSection", "Zikirler"),
        ("duasSection", "Dualar ve Rukye"),
        ("worshipSection", "İbadet"),
        ("surahKahf", "Kehf Suresi"),
        ("ayatKursi", "Ayetel Kürsi"),
        ("surahYasin", "Yasin Suresi"),
        ("surahMulk", "Mülk Suresi"),
        ("namesOfAllah", "Esmaul Hüsna"),
        ("salawat", "Salavat"),
        ("istighfar", "İstiğfar"),
        ("seerah", "Siyer-i Nebi"),
        ("benefitAzkar", "Zikrin Faziletleri"),
        ("worshipTracker", "İbadet Takibi"),
        ("khatmaQuran", "Hatim"),
    ],
    'es': [
        ("azkarSection", "Azkar"),
        ("duasSection", "Duas y Ruqyah"),
        ("worshipSection", "Adoración"),
        ("surahKahf", "Sura Al-Kahf"),
        ("ayatKursi", "Ayat Al-Kursi"),
        ("surahYasin", "Sura Yasin"),
        ("surahMulk", "Sura Al-Mulk"),
        ("namesOfAllah", "Nombres de Allah"),
        ("salawat", "Salawat"),
        ("istighfar", "Istighfar"),
        ("seerah", "Biografía del Profeta"),
        ("benefitAzkar", "Beneficios del Azkar"),
        ("worshipTracker", "Seguimiento de adoración"),
        ("khatmaQuran", "Khatma del Corán"),
    ],
    'ur': [
        ("azkarSection", "اذکار"),
        ("duasSection", "دعائیں اور رقیہ"),
        ("worshipSection", "عبادات"),
        ("surahKahf", "سورۃ الکہف"),
        ("ayatKursi", "آیت الکرسی"),
        ("surahYasin", "سورۃ یٰسین"),
        ("surahMulk", "سورۃ الملک"),
        ("namesOfAllah", "اسماء الحسنیٰ"),
        ("salawat", "درود"),
        ("istighfar", "استغفار"),
        ("seerah", "سیرت النبی"),
        ("benefitAzkar", "اذکار کے فضائل"),
        ("worshipTracker", "عبادات ٹریکر"),
        ("khatmaQuran", "ختم قرآن"),
    ],
    'id': [
        ("azkarSection", "Dzikir"),
        ("duasSection", "Doa & Ruqyah"),
        ("worshipSection", "Ibadah"),
        ("surahKahf", "Surah Al-Kahfi"),
        ("ayatKursi", "Ayat Kursi"),
        ("surahYasin", "Surah Yasin"),
        ("surahMulk", "Surah Al-Mulk"),
        ("namesOfAllah", "Asmaul Husna"),
        ("salawat", "Shalawat"),
        ("istighfar", "Istighfar"),
        ("seerah", "Sirah Nabawiyah"),
        ("benefitAzkar", "Keutamaan Dzikir"),
        ("worshipTracker", "Pelacak Ibadah"),
        ("khatmaQuran", "Khatam Quran"),
    ],
    'ms': [
        ("azkarSection", "Zikir"),
        ("duasSection", "Doa & Ruqyah"),
        ("worshipSection", "Ibadah"),
        ("surahKahf", "Surah Al-Kahfi"),
        ("ayatKursi", "Ayat Kursi"),
        ("surahYasin", "Surah Yasin"),
        ("surahMulk", "Surah Al-Mulk"),
        ("namesOfAllah", "Asmaul Husna"),
        ("salawat", "Selawat"),
        ("istighfar", "Istighfar"),
        ("seerah", "Sirah Nabawiyyah"),
        ("benefitAzkar", "Kelebihan Zikir"),
        ("worshipTracker", "Penjejak Ibadah"),
        ("khatmaQuran", "Khatam Quran"),
    ],
    'hi': [
        ("azkarSection", "अज़कार"),
        ("duasSection", "दुआ और रुक़्या"),
        ("worshipSection", "इबादत"),
        ("surahKahf", "सूरह अल-कहफ़"),
        ("ayatKursi", "आयतुल कुर्सी"),
        ("surahYasin", "सूरह यासीन"),
        ("surahMulk", "सूरह अल-मुल्क"),
        ("namesOfAllah", "अल्लाह के नाम"),
        ("salawat", "सलवात"),
        ("istighfar", "इस्तिग़फ़ार"),
        ("seerah", "सीरत-ए-नबवी"),
        ("benefitAzkar", "अज़कार के फ़ायदे"),
        ("worshipTracker", "इबादत ट्रैकर"),
        ("khatmaQuran", "कुरान ख़त्म"),
    ],
    'bn': [
        ("azkarSection", "আযকার"),
        ("duasSection", "দোয়া ও রুকইয়াহ"),
        ("worshipSection", "ইবাদত"),
        ("surahKahf", "সূরা আল-কাহফ"),
        ("ayatKursi", "আয়াতুল কুরসি"),
        ("surahYasin", "সূরা ইয়াসীন"),
        ("surahMulk", "সূরা আল-মুলক"),
        ("namesOfAllah", "আল্লাহর নাম"),
        ("salawat", "দরূদ"),
        ("istighfar", "ইস্তিগফার"),
        ("seerah", "সীরাতুন নবী"),
        ("benefitAzkar", "যিকিরের ফজিলত"),
        ("worshipTracker", "ইবাদত ট্র্যাকার"),
        ("khatmaQuran", "কুরআন খতম"),
    ],
    'ru': [
        ("azkarSection", "Азкар"),
        ("duasSection", "Дуа и Рукья"),
        ("worshipSection", "Поклонение"),
        ("surahKahf", "Сура Аль-Кахф"),
        ("ayatKursi", "Аят Аль-Курси"),
        ("surahYasin", "Сура Ясин"),
        ("surahMulk", "Сура Аль-Мульк"),
        ("namesOfAllah", "Имена Аллаха"),
        ("salawat", "Салават"),
        ("istighfar", "Истигфар"),
        ("seerah", "Жизнеописание Пророка"),
        ("benefitAzkar", "Польза азкар"),
        ("worshipTracker", "Трекер поклонения"),
        ("khatmaQuran", "Хатм Корана"),
    ],
}

with open(TRANSLATIONS_FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for lang, days_val in LANG_DAYS.items():
    if lang not in NEW_KEYS:
        continue
    
    # Find the line with days: 'xxx', for this language
    found = False
    for i, line in enumerate(lines):
        if f"days: '{days_val}'," in line:
            # Check if keys already added (check next few lines)
            nearby = ''.join(lines[i:i+20])
            if 'khatmaQuran' in nearby:
                print(f"Skipping {lang} - already has keys")
                found = True
                break
            
            # Add new keys after this line
            new_lines = []
            for key, val in NEW_KEYS[lang]:
                new_lines.append(f"    {key}: '{val}',\n")
            
            # Insert after the days line
            for j, new_line in enumerate(new_lines):
                lines.insert(i + 1 + j, new_line)
            
            print(f"Added {len(new_lines)} keys for {lang}")
            found = True
            break
    
    if not found:
        print(f"WARNING: Could not find days line for {lang}")

with open(TRANSLATIONS_FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Done!")
