#!/usr/bin/env python3
"""Verify that all replace_one patterns match the actual pbxproj content."""
import os
os.chdir('/Users/hossamgamal/Desktop/MobileApps/Quran')

with open('ios/rwhalmslm.xcodeproj/project.pbxproj') as f:
    content = f.read()

patterns = {
    "main_group": '\t\t\t\t13B07FAE1A68108700A75B9A /* rwhalmslm */,\n\t\t\t\t832341AE1AAA6A7D00B99B32',
    "products": '\t\t\t\t13B07F961A680F5B00A75B9A /* rwhalmslm.app */,\n\t\t\t);\n\t\t\tname = Products;',
    "frameworks": '\t\t\t\tED297162215061F000B7C4FE /* JavaScriptCore.framework */,\n\t\t\t);\n\t\t\tname = Frameworks;',
    "main_target": '\t\t\t\t800E24972A6A228C8D4807E9 /* [CP] Copy Pods Resources */,\n\t\t\t);\n\t\t\tbuildRules = (\n\t\t\t);\n\t\t\tdependencies = (\n\t\t\t);',
    "project_targets": '\t\t\ttargets = (\n\t\t\t\t13B07F861A680F5B00A75B9A /* rwhalmslm */,\n\t\t\t);',
    "target_attrs": '\t\t\t\t\t13B07F861A680F5B00A75B9A = {\n\t\t\t\t\t\tLastSwiftMigration = 1250;\n\t\t\t\t\t};',
}

all_ok = True
for name, pattern in patterns.items():
    if pattern in content:
        print(f"  OK: {name}")
    else:
        all_ok = False
        key = pattern.split('\n')[0][:50]
        idx = content.find(key)
        if idx >= 0:
            snippet = content[max(0,idx-10):idx+len(pattern)+30]
            print(f"  FAIL: {name} — key found but pattern mismatch")
            print(f"    Actual: {repr(snippet[:200])}")
        else:
            print(f"  FAIL: {name} — key not found at all")

# Also check section markers
markers = [
    '/* End PBXBuildFile section */',
    '/* End PBXFileReference section */',
    '/* End PBXFrameworksBuildPhase section */',
    '/* End PBXGroup section */',
    '/* End PBXNativeTarget section */',
    '/* End PBXResourcesBuildPhase section */',
    '/* End PBXSourcesBuildPhase section */',
    '/* Begin XCBuildConfiguration section */',
    '/* End XCBuildConfiguration section */',
    '/* End XCConfigurationList section */',
]
for m in markers:
    if m in content:
        print(f"  OK marker: {m}")
    else:
        print(f"  FAIL marker: {m}")
        all_ok = False

print(f"\n{'ALL OK' if all_ok else 'SOME FAILURES'}")
