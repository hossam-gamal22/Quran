#!/usr/bin/env python3
"""Add appName and none to common translations for all 12 languages."""

import os

filepath = os.path.join(os.path.dirname(__file__), '..', 'constants', 'translations.ts')

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

translations = [
    # (removeFromFavorites value, appName, none)
    ("\u0625\u0632\u0627\u0644\u0629 \u0645\u0646 \u0627\u0644\u0645\u0641\u0636\u0644\u0629", "\u0631\u0648\u062d \u0627\u0644\u0645\u0633\u0644\u0645", "\u0628\u062f\u0648\u0646"),  # ar
    ("Remove from Favorites", "Rooh Muslim", "None"),  # en
    ("Retirer des favoris", "Rooh Muslim", "Aucun"),  # fr
    ("Aus Favoriten entfernen", "Rooh Muslim", "Keine"),  # de
    ("Favorilerden \u00c7\u0131kar", "Rooh Muslim", "Yok"),  # tr
    ("Quitar de favoritos", "Rooh Muslim", "Ninguno"),  # es
    ("\u067e\u0633\u0646\u062f\u06cc\u062f\u06c1 \u0633\u06d2 \u06c1\u0679\u0627\u0626\u06cc\u06ba", "\u0631\u0648\u062d \u0627\u0644\u0645\u0633\u0644\u0645", "\u06a9\u0648\u0626\u06cc \u0646\u06c1\u06cc\u06ba"),  # ur
    ("Hapus dari Favorit", "Rooh Muslim", "Tidak ada"),  # id
    ("Buang dari Kegemaran", "Rooh Muslim", "Tiada"),  # ms
    ("\u092a\u0938\u0902\u0926\u0940\u0926\u093e \u0938\u0947 \u0939\u091f\u093e\u090f\u0902", "Rooh Muslim", "\u0915\u094b\u0908 \u0928\u0939\u0940\u0902"),  # hi
    ("\u09aa\u09cd\u09b0\u09bf\u09af\u09bc \u09a5\u09c7\u0995\u09c7 \u09b8\u09b0\u09be\u09a8", "Rooh Muslim", "\u0995\u09bf\u099b\u09c1\u0987 \u09a8\u09be"),  # bn
    ("\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u0438\u0437 \u0438\u0437\u0431\u0440\u0430\u043d\u043d\u043e\u0433\u043e", "Rooh Muslim", "\u041d\u0435\u0442"),  # ru
]

count = 0
for remove_val, app_name, none_val in translations:
    old = f"removeFromFavorites: '{remove_val}',"
    new = f"removeFromFavorites: '{remove_val}',\n    appName: '{app_name}',\n    none: '{none_val}',"
    if old in content:
        content = content.replace(old, new, 1)
        count += 1
    else:
        print(f"WARNING: Could not find: {old[:50]}...")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Updated {count} languages")
