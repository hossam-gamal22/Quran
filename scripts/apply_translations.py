#!/usr/bin/env python3
"""
Apply translations to constants/translations.ts

Strategy:
1. Load all translation data from Parts 1-9
2. Load audit data (/tmp/untranslated_keys.json) to know which (key, lang) pairs need replacing
3. Parse translations.ts tracking current language block and namespace
4. Replace English values with proper translations
"""
import sys, os, re, json, copy

# Load translation data
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__))))
from translations_data import TR
import translations_data2, translations_data3, translations_data4
import translations_data5, translations_data6, translations_data7
import translations_data8, translations_data9

print(f"Loaded {len(TR)} translation entries")

# Load audit data
with open('/tmp/untranslated_keys.json') as f:
    audit = json.load(f)

# Build a set of (key, lang) pairs that need translation
needs_translation = set()
for key, info in audit.items():
    for lang in info['langs']:
        if lang not in ('en', 'ar'):  # Only non-English/non-Arabic
            needs_translation.add((key, lang))

print(f"Total (key, lang) pairs needing translation: {len(needs_translation)}")

# Language block detection
LANG_CODES = ['fr', 'de', 'tr', 'es', 'ur', 'id', 'ms', 'hi', 'bn', 'ru']
LANG_BLOCK_RE = re.compile(r'^const\s+(\w+)\s*:\s*TranslationKeys\s*=\s*\{')

# Read the file
ts_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'constants', 'translations.ts')
ts_path = os.path.normpath(ts_path)

with open(ts_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Read {len(lines)} lines from translations.ts")

# State machine to track position in file
current_lang = None
namespace_stack = []  # Stack of namespace names
brace_depth = 0       # Relative depth within language block
key_at_depth = {}     # depth -> namespace name
replacements_made = 0
skipped_no_translation = 0

# Output lines
output = []

# Simple key-value line pattern: "  keyName: 'value'," or "  keyName: \"value\","
KV_RE = re.compile(r'^(\s+)(\w+)\s*:\s*([\'"])(.*?)\3\s*,?\s*$')
# Namespace opening pattern: "  namespaceName: {"
NS_OPEN_RE = re.compile(r'^(\s+)(\w+)\s*:\s*\{\s*$')
# Closing brace
CLOSE_RE = re.compile(r'^\s*\}\s*,?\s*$')

for i, line in enumerate(lines):
    # Detect language block start
    m = LANG_BLOCK_RE.match(line)
    if m:
        lang_code = m.group(1)
        if lang_code in LANG_CODES:
            current_lang = lang_code
            namespace_stack = []
            brace_depth = 0
            key_at_depth = {}
        else:
            current_lang = None
        output.append(line)
        continue

    if current_lang is None:
        output.append(line)
        continue

    # Track namespace openings
    ns_m = NS_OPEN_RE.match(line)
    if ns_m:
        ns_name = ns_m.group(2)
        brace_depth += 1
        key_at_depth[brace_depth] = ns_name
        namespace_stack.append(ns_name)
        output.append(line)
        continue

    # Track closing braces
    close_m = CLOSE_RE.match(line)
    if close_m:
        if brace_depth > 0:
            if namespace_stack:
                namespace_stack.pop()
            brace_depth -= 1
        else:
            # End of language block
            current_lang = None
        output.append(line)
        continue

    # Try to match key-value pair
    kv_m = KV_RE.match(line)
    if kv_m and namespace_stack:
        indent = kv_m.group(1)
        key_name = kv_m.group(2)
        quote_char = kv_m.group(3)
        value = kv_m.group(4)

        # Build full key path
        full_key = '.'.join(namespace_stack) + '.' + key_name

        # Check if this (key, lang) pair needs translation
        if (full_key, current_lang) in needs_translation:
            # Look up translation
            if full_key in TR and current_lang in TR[full_key]:
                new_value = TR[full_key][current_lang]
                if new_value and new_value != value:
                    # Escape quotes in the new value
                    escaped_value = new_value.replace("\\", "\\\\").replace(quote_char, "\\" + quote_char)
                    # Check if line has trailing comma
                    stripped = line.rstrip()
                    has_comma = stripped.endswith(',')
                    comma = ',' if has_comma else ''
                    new_line = f"{indent}{key_name}: {quote_char}{escaped_value}{quote_char}{comma}\n"
                    output.append(new_line)
                    replacements_made += 1
                    continue
                else:
                    skipped_no_translation += 1
            else:
                skipped_no_translation += 1

    output.append(line)

# Write back
with open(ts_path, 'w', encoding='utf-8') as f:
    f.writelines(output)

print(f"\nDone!")
print(f"Replacements made: {replacements_made}")
print(f"Skipped (no translation available): {skipped_no_translation}")
print(f"Output lines: {len(output)}")
