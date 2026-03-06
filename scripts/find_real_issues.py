#!/usr/bin/env python3
"""Find ONLY unescaped apostrophes (not \\' escaped ones) in translations.ts."""

import os

filepath = os.path.join(os.path.dirname(__file__), '..', 'constants', 'translations.ts')

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

issues = []
for i, line in enumerate(lines, 1):
    stripped = line.strip()
    if not stripped or stripped.startswith('//') or stripped.startswith('/*'):
        continue
    
    colon_pos = stripped.find(': ')
    if colon_pos > 0:
        after_colon = stripped[colon_pos+2:]
        if after_colon.startswith("'"):
            # Remove escaped quotes first, then count
            cleaned = after_colon.replace("\\'", "")
            quote_count = cleaned.count("'")
            if quote_count % 2 != 0:
                issues.append((i, stripped))

for line_num, content in issues:
    print(f"  Line {line_num}: {content}")

print(f"\nReal unescaped issues: {len(issues)}")
