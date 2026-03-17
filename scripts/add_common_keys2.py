#!/usr/bin/env python3
"""Add shareText, shareImage, fromApp keys to all 12 language blocks in translations.ts"""

TRANSLATIONS_FILE = 'constants/translations.ts'

with open(TRANSLATIONS_FILE, 'r', encoding='utf-8') as f:
    content = f.read()

new_keys = {
    0: "    shareText: '\u0645\u0634\u0627\u0631\u0643\u0629 \u0646\u0635',\n    shareImage: '\u0645\u0634\u0627\u0631\u0643\u0629 \u0635\u0648\u0631\u0629',\n    fromApp: '\u0645\u0646 \u062a\u0637\u0628\u064a\u0642 \u0631\u0648\u062d \u0627\u0644\u0645\u0633\u0644\u0645',",
    1: "    shareText: 'Share as Text',\n    shareImage: 'Share as Image',\n    fromApp: 'From Ruh Al-Muslim App',",
    2: "    shareText: 'Partager en texte',\n    shareImage: 'Partager en image',\n    fromApp: \"De l'application Ruh Al-Muslim\",",
    3: "    shareText: 'Als Text teilen',\n    shareImage: 'Als Bild teilen',\n    fromApp: 'Von der App Ruh Al-Muslim',",
    4: "    shareText: 'Metin olarak payla\u015f',\n    shareImage: 'Resim olarak payla\u015f',\n    fromApp: 'Ruh Al-Muslim Uygulamas\u0131ndan',",
    5: "    shareText: 'Compartir como texto',\n    shareImage: 'Compartir como imagen',\n    fromApp: 'De la aplicaci\u00f3n Ruh Al-Muslim',",
    6: "    shareText: '\u0679\u06cc\u06a9\u0633\u0679 \u0634\u06cc\u0626\u0631 \u06a9\u0631\u06cc\u06ba',\n    shareImage: '\u062a\u0635\u0648\u06cc\u0631 \u0634\u06cc\u0626\u0631 \u06a9\u0631\u06cc\u06ba',\n    fromApp: '\u0631\u0648\u062d \u0627\u0644\u0645\u0633\u0644\u0645 \u0627\u06cc\u067e \u0633\u06d2',",
    7: "    shareText: 'Bagikan sebagai Teks',\n    shareImage: 'Bagikan sebagai Gambar',\n    fromApp: 'Dari Aplikasi Ruh Al-Muslim',",
    8: "    shareText: 'Kongsi sebagai Teks',\n    shareImage: 'Kongsi sebagai Imej',\n    fromApp: 'Dari Aplikasi Ruh Al-Muslim',",
    9: "    shareText: '\u091f\u0947\u0915\u094d\u0938\u094d\u091f \u0915\u0947 \u0930\u0942\u092a \u092e\u0947\u0902 \u0936\u0947\u092f\u0930 \u0915\u0930\u0947\u0902',\n    shareImage: '\u0907\u092e\u0947\u091c \u0915\u0947 \u0930\u0942\u092a \u092e\u0947\u0902 \u0936\u0947\u092f\u0930 \u0915\u0930\u0947\u0902',\n    fromApp: '\u0930\u0942\u0939 \u0905\u0932-\u092e\u0941\u0938\u094d\u0932\u093f\u092e \u0910\u092a \u0938\u0947',",
    10: "    shareText: '\u099f\u09c7\u0995\u09cd\u09b8\u099f \u09b9\u09bf\u09b8\u09be\u09ac\u09c7 \u09b6\u09c7\u09df\u09be\u09b0 \u0995\u09b0\u09c1\u09a8',\n    shareImage: '\u099b\u09ac\u09bf \u09b9\u09bf\u09b8\u09be\u09ac\u09c7 \u09b6\u09c7\u09df\u09be\u09b0 \u0995\u09b0\u09c1\u09a8',\n    fromApp: '\u09b0\u09c2\u09b9 \u0986\u09b2-\u09ae\u09c1\u09b8\u09b2\u09bf\u09ae \u0985\u09cd\u09af\u09be\u09aa \u09a5\u09c7\u0995\u09c7',",
    11: "    shareText: '\u041f\u043e\u0434\u0435\u043b\u0438\u0442\u044c\u0441\u044f \u0442\u0435\u043a\u0441\u0442\u043e\u043c',\n    shareImage: '\u041f\u043e\u0434\u0435\u043b\u0438\u0442\u044c\u0441\u044f \u0438\u0437\u043e\u0431\u0440\u0430\u0436\u0435\u043d\u0438\u0435\u043c',\n    fromApp: '\u0418\u0437 \u043f\u0440\u0438\u043b\u043e\u0436\u0435\u043d\u0438\u044f Ruh Al-Muslim',",
}

lines = content.split('\n')
new_lines = []
lang_idx = 0

i = 0
while i < len(lines):
    line = lines[i]
    stripped = line.strip()
    if stripped.startswith('ayah:') and "'" in stripped:
        new_lines.append(line)
        if i + 1 < len(lines) and 'shareText:' in lines[i + 1]:
            pass
        elif lang_idx in new_keys:
            new_lines.append(new_keys[lang_idx])
            lang_idx += 1
        i += 1
    else:
        new_lines.append(line)
        i += 1

with open(TRANSLATIONS_FILE, 'w', encoding='utf-8') as f:
    f.write('\n'.join(new_lines))

print(f'Added new common keys to {lang_idx} language blocks')
