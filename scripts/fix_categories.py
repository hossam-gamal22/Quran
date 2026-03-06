#!/usr/bin/env python3
import json, os

FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'json', 'categories.json')

with open(FILE, 'r', encoding='utf-8') as f:
    data = json.load(f)

cats = data['categories']
existing_ids = {c['id'] for c in cats}
max_order = max(c['order'] for c in cats)

new_cats = []
if 'salawat' not in existing_ids:
    new_cats.append({
        "id": "salawat",
        "name": {"ar": "\u0627\u0644\u0635\u0644\u0627\u0629 \u0639\u0644\u0649 \u0627\u0644\u0646\u0628\u064a", "en": "Salawat", "ur": "\u062f\u0631\u0648\u062f \u0634\u0631\u06cc\u0641", "id": "Shalawat", "tr": "Salavat", "fr": "Pri\u00e8res sur le Proph\u00e8te", "de": "Salawat", "hi": "\u0926\u0930\u0942\u0926 \u0936\u0930\u0940\u092b", "bn": "\u09a6\u09b0\u09c2\u09a6 \u09b6\u09b0\u09c0\u09ab", "ms": "Selawat", "ru": "\u0421\u0430\u043b\u0430\u0432\u0430\u0442", "es": "Salawat"},
        "icon": "star-crescent", "color": "#E91E63", "order": max_order + 1
    })
if 'istighfar' not in existing_ids:
    new_cats.append({
        "id": "istighfar",
        "name": {"ar": "\u0627\u0644\u0627\u0633\u062a\u063a\u0641\u0627\u0631", "en": "Istighfar", "ur": "\u0627\u0633\u062a\u063a\u0641\u0627\u0631", "id": "Istighfar", "tr": "\u0130sti\u011ffar", "fr": "Demande de pardon", "de": "Istighfar", "hi": "\u0907\u0938\u094d\u0924\u093f\u0917\u093c\u092b\u093c\u093e\u0930", "bn": "\u0987\u09b8\u09cd\u09a4\u09bf\u0997\u09ab\u09be\u09b0", "ms": "Istighfar", "ru": "\u0418\u0441\u0442\u0438\u0433\u0444\u0430\u0440", "es": "Istighfar"},
        "icon": "heart", "color": "#8B5CF6", "order": max_order + 2
    })
if 'ayat_kursi' not in existing_ids:
    new_cats.append({
        "id": "ayat_kursi",
        "name": {"ar": "\u0622\u064a\u0629 \u0627\u0644\u0643\u0631\u0633\u064a \u0648\u062e\u0648\u0627\u062a\u064a\u0645 \u0627\u0644\u0628\u0642\u0631\u0629", "en": "Ayat Al-Kursi & Last Verses of Al-Baqarah", "ur": "\u0622\u06cc\u06c3 \u0627\u0644\u06a9\u0631\u0633\u06cc \u0627\u0648\u0631 \u062e\u0648\u0627\u062a\u06cc\u0645 \u0627\u0644\u0628\u0642\u0631\u0629", "id": "Ayat Kursi & Penutup Al-Baqarah", "tr": "Ayet'el-K\u00fcrsi ve Bakara Sonu", "fr": "Ayat Al-Kursi et derniers versets d'Al-Baqarah", "de": "Ayat Al-Kursi und letzte Verse von Al-Baqarah", "hi": "\u0906\u092f\u0924\u0941\u0932 \u0915\u0941\u0930\u094d\u0938\u0940 \u0914\u0930 \u092c\u0915\u0930\u093e \u0915\u0947 \u0905\u0902\u0924\u093f\u092e \u0906\u092f\u093e\u0924", "bn": "\u0986\u09af\u09bc\u09be\u09a4\u09c1\u09b2 \u0995\u09c1\u09b0\u09b8\u09c0 \u0993 \u09ac\u09be\u0995\u09be\u09b0\u09be\u09b0 \u09b6\u09c7\u09b7 \u0986\u09af\u09bc\u09be\u09a4", "ms": "Ayat Kursi & Penutup Al-Baqarah", "ru": "\u0410\u044f\u0442 \u0430\u043b\u044c-\u041a\u0443\u0440\u0441\u0438 \u0438 \u043f\u043e\u0441\u043b\u0435\u0434\u043d\u0438\u0435 \u0430\u044f\u0442\u044b \u0430\u043b\u044c-\u0411\u0430\u043a\u0430\u0440\u0430", "es": "Ayat Al-Kursi y \u00faltimos versos de Al-Baqarah"},
        "icon": "shield-star", "color": "#DAA520", "order": max_order + 3
    })

cats.extend(new_cats)
data['categories'] = cats

with open(FILE, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Added {len(new_cats)} categories. Total: {len(cats)}")
