#!/usr/bin/env python3
"""Fix remaining arrow-right icons that span multiple lines."""

import os
import re

BASE_DIR = os.path.join(os.path.dirname(__file__), '..', 'app')

files_to_fix = [
    'settings/prayer-calculation.tsx',
    'settings/prayer-adjustments.tsx', 
    'settings/custom-dhikr.tsx',
    'settings/backup.tsx',
]

count = 0
for relpath in files_to_fix:
    filepath = os.path.join(BASE_DIR, relpath)
    if not os.path.exists(filepath):
        print(f"  Skip (not found): {relpath}")
        continue
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Fix name="arrow-right" that are standalone (not in ternary)
    content = content.replace(
        'name="arrow-right"',
        "name={I18nManager.isRTL ? 'arrow-right' : 'arrow-left'}"
    )
    
    if content != original:
        # Ensure I18nManager is imported
        if 'I18nManager' not in content:
            if "} from 'react-native'" in content:
                content = content.replace(
                    "} from 'react-native'",
                    "  I18nManager,\n} from 'react-native'",
                    1
                )
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        count += 1
        print(f"  Fixed: {relpath}")

print(f"\nFixed {count} files")
