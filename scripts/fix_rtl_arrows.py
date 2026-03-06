#!/usr/bin/env python3
"""Fix hardcoded arrow/chevron icons to be RTL-aware across all app files."""

import os
import re

BASE_DIR = os.path.join(os.path.dirname(__file__), '..', 'app')

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    changes = 0
    
    # Skip files that already have these patterns fixed (ternary pattern present)
    # We only fix standalone hardcoded ones
    
    # Fix: name="arrow-right" → name={I18nManager.isRTL ? 'arrow-right' : 'arrow-left'}
    # But skip lines that already have the ternary pattern
    def fix_arrow_right(match):
        line = match.group(0)
        if 'isRTL' in line or '?' in line:
            return line  # Already RTL-aware
        return line.replace('name="arrow-right"', "name={I18nManager.isRTL ? 'arrow-right' : 'arrow-left'}")
    
    content = re.sub(r'.*name="arrow-right".*', fix_arrow_right, content)
    
    # Fix: name="chevron-left" → name={I18nManager.isRTL ? 'chevron-left' : 'chevron-right'}
    def fix_chevron_left(match):
        line = match.group(0)
        if 'isRTL' in line or '?' in line:
            return line  # Already RTL-aware
        return line.replace('name="chevron-left"', "name={I18nManager.isRTL ? 'chevron-left' : 'chevron-right'}")
    
    content = re.sub(r'.*name="chevron-left".*', fix_chevron_left, content)
    
    if content != original:
        # Ensure I18nManager is imported
        if 'I18nManager' not in content:
            # Add I18nManager to existing react-native import
            if "} from 'react-native'" in content:
                content = content.replace(
                    "} from 'react-native'",
                    "  I18nManager,\n} from 'react-native'",
                    1
                )
            elif '} from "react-native"' in content:
                content = content.replace(
                    '} from "react-native"',
                    '  I18nManager,\n} from "react-native"',
                    1
                )
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        
        return True
    return False

count = 0
for root, dirs, files in os.walk(BASE_DIR):
    # Skip admin-panel
    if 'admin-panel' in root:
        continue
    for fname in files:
        if fname.endswith('.tsx') or fname.endswith('.ts'):
            filepath = os.path.join(root, fname)
            if fix_file(filepath):
                count += 1
                print(f"  Fixed: {os.path.relpath(filepath, BASE_DIR)}")

print(f"\nFixed {count} files")
