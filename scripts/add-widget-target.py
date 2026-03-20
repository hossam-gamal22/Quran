#!/usr/bin/env python3
"""
Add RoohAlMuslimWidgets extension target to the Xcode project.
"""
import uuid
import sys
import os

def gen_id():
    """Generate a 24-char hex UUID like Xcode uses."""
    return uuid.uuid4().hex[:24].upper()

os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

pbxproj = 'ios/rwhalmslm.xcodeproj/project.pbxproj'

with open(pbxproj, 'r') as f:
    content = f.read()

# Generate all UUIDs
FR_WB = gen_id()  # WidgetBundle.swift fileRef
FR_NP = gen_id()  # NextPrayerWidget.swift fileRef
FR_QA = gen_id()  # QuranAyahWidget.swift fileRef
FR_AZ = gen_id()  # AzkarWidget.swift fileRef
FR_DH = gen_id()  # DhikrWidget.swift fileRef
FR_HD = gen_id()  # HijriDateWidget.swift fileRef
FR_IP = gen_id()  # Info.plist fileRef
FR_EN = gen_id()  # Entitlements fileRef
FR_PR = gen_id()  # Product (.appex) fileRef
FR_WK = gen_id()  # WidgetKit.framework fileRef
FR_SU = gen_id()  # SwiftUI.framework fileRef

BF_WB = gen_id()  # WidgetBundle in Sources
BF_NP = gen_id()  # NextPrayer in Sources
BF_QA = gen_id()  # QuranAyah in Sources
BF_AZ = gen_id()  # Azkar in Sources
BF_DH = gen_id()  # Dhikr in Sources
BF_HD = gen_id()  # HijriDate in Sources
BF_WK = gen_id()  # WidgetKit in Frameworks
BF_SU = gen_id()  # SwiftUI in Frameworks
BF_EM = gen_id()  # .appex in Embed

BP_SR = gen_id()  # Widget Sources build phase
BP_FR = gen_id()  # Widget Frameworks build phase
BP_RS = gen_id()  # Widget Resources build phase
BP_EM = gen_id()  # Embed App Extensions (main target)

GR_WG = gen_id()  # Widget group
TG_WG = gen_id()  # Widget target
CP_WG = gen_id()  # Container proxy
TD_WG = gen_id()  # Target dependency

CF_DB = gen_id()  # Widget Debug config
CF_RL = gen_id()  # Widget Release config
CF_LS = gen_id()  # Widget config list

def insert_before(text, marker, insertion):
    idx = text.find(marker)
    if idx == -1:
        print(f"ERROR: marker not found: {marker}", file=sys.stderr)
        sys.exit(1)
    return text[:idx] + insertion + text[idx:]

def insert_after(text, marker, insertion):
    idx = text.find(marker)
    if idx == -1:
        print(f"ERROR: marker not found: {marker}", file=sys.stderr)
        sys.exit(1)
    end = idx + len(marker)
    return text[:end] + insertion + text[end:]

def replace_one(text, old, new):
    if old not in text:
        print(f"ERROR: string not found:\n{old[:120]}", file=sys.stderr)
        sys.exit(1)
    return text.replace(old, new, 1)


# ═══════════════════════════════════════════════════════
# 1. PBXBuildFile
# ═══════════════════════════════════════════════════════
bf = (
    f"\t\t{BF_WB} /* WidgetBundle.swift in Sources */ = {{isa = PBXBuildFile; fileRef = {FR_WB} /* WidgetBundle.swift */; }};\n"
    f"\t\t{BF_NP} /* NextPrayerWidget.swift in Sources */ = {{isa = PBXBuildFile; fileRef = {FR_NP} /* NextPrayerWidget.swift */; }};\n"
    f"\t\t{BF_QA} /* QuranAyahWidget.swift in Sources */ = {{isa = PBXBuildFile; fileRef = {FR_QA} /* QuranAyahWidget.swift */; }};\n"
    f"\t\t{BF_AZ} /* AzkarWidget.swift in Sources */ = {{isa = PBXBuildFile; fileRef = {FR_AZ} /* AzkarWidget.swift */; }};\n"
    f"\t\t{BF_DH} /* DhikrWidget.swift in Sources */ = {{isa = PBXBuildFile; fileRef = {FR_DH} /* DhikrWidget.swift */; }};\n"
    f"\t\t{BF_HD} /* HijriDateWidget.swift in Sources */ = {{isa = PBXBuildFile; fileRef = {FR_HD} /* HijriDateWidget.swift */; }};\n"
    f"\t\t{BF_WK} /* WidgetKit.framework in Frameworks */ = {{isa = PBXBuildFile; fileRef = {FR_WK} /* WidgetKit.framework */; }};\n"
    f"\t\t{BF_SU} /* SwiftUI.framework in Frameworks */ = {{isa = PBXBuildFile; fileRef = {FR_SU} /* SwiftUI.framework */; }};\n"
    f"\t\t{BF_EM} /* RoohAlMuslimWidgets.appex in Embed App Extensions */ = {{isa = PBXBuildFile; fileRef = {FR_PR} /* RoohAlMuslimWidgets.appex */; settings = {{ATTRIBUTES = (RemoveHeadersOnCopy, ); }}; }};\n"
)
content = insert_before(content, '/* End PBXBuildFile section */', bf)

# ═══════════════════════════════════════════════════════
# 2. PBXContainerItemProxy (new section)
# ═══════════════════════════════════════════════════════
cip = (
    "\n/* Begin PBXContainerItemProxy section */\n"
    f"\t\t{CP_WG} /* PBXContainerItemProxy */ = {{\n"
    f"\t\t\tisa = PBXContainerItemProxy;\n"
    f"\t\t\tcontainerPortal = 83CBB9F71A601CBA00E9B192 /* Project object */;\n"
    f"\t\t\tproxyType = 1;\n"
    f"\t\t\tremoteGlobalIDString = {TG_WG};\n"
    f"\t\t\tremoteInfo = RoohAlMuslimWidgets;\n"
    f"\t\t}};\n"
    "/* End PBXContainerItemProxy section */\n"
)
content = insert_after(content, '/* End PBXBuildFile section */\n', cip)

# ═══════════════════════════════════════════════════════
# 3. PBXCopyFilesBuildPhase (new section — Embed App Extensions on main target)
# ═══════════════════════════════════════════════════════
cfb = (
    "\n/* Begin PBXCopyFilesBuildPhase section */\n"
    f"\t\t{BP_EM} /* Embed App Extensions */ = {{\n"
    f"\t\t\tisa = PBXCopyFilesBuildPhase;\n"
    f"\t\t\tbuildActionMask = 2147483647;\n"
    f"\t\t\tdstPath = \"\";\n"
    f"\t\t\tdstSubfolderSpec = 13;\n"
    f"\t\t\tfiles = (\n"
    f"\t\t\t\t{BF_EM} /* RoohAlMuslimWidgets.appex in Embed App Extensions */,\n"
    f"\t\t\t);\n"
    f"\t\t\tname = \"Embed App Extensions\";\n"
    f"\t\t\trunOnlyForDeploymentPostprocessing = 0;\n"
    f"\t\t}};\n"
    "/* End PBXCopyFilesBuildPhase section */\n"
)
content = insert_after(content, '/* End PBXContainerItemProxy section */\n', cfb)

# ═══════════════════════════════════════════════════════
# 4. PBXFileReference
# ═══════════════════════════════════════════════════════
frs = (
    f"\t\t{FR_WB} /* WidgetBundle.swift */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = WidgetBundle.swift; sourceTree = \"<group>\"; }};\n"
    f"\t\t{FR_NP} /* NextPrayerWidget.swift */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = NextPrayerWidget.swift; sourceTree = \"<group>\"; }};\n"
    f"\t\t{FR_QA} /* QuranAyahWidget.swift */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = QuranAyahWidget.swift; sourceTree = \"<group>\"; }};\n"
    f"\t\t{FR_AZ} /* AzkarWidget.swift */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = AzkarWidget.swift; sourceTree = \"<group>\"; }};\n"
    f"\t\t{FR_DH} /* DhikrWidget.swift */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = DhikrWidget.swift; sourceTree = \"<group>\"; }};\n"
    f"\t\t{FR_HD} /* HijriDateWidget.swift */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = HijriDateWidget.swift; sourceTree = \"<group>\"; }};\n"
    f"\t\t{FR_IP} /* Info.plist */ = {{isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = Info.plist; sourceTree = \"<group>\"; }};\n"
    f"\t\t{FR_EN} /* RoohAlMuslimWidgets.entitlements */ = {{isa = PBXFileReference; lastKnownFileType = text.plist.entitlements; path = RoohAlMuslimWidgets.entitlements; sourceTree = \"<group>\"; }};\n"
    f"\t\t{FR_PR} /* RoohAlMuslimWidgets.appex */ = {{isa = PBXFileReference; explicitFileType = \"wrapper.app-extension\"; includeInIndex = 0; path = RoohAlMuslimWidgets.appex; sourceTree = BUILT_PRODUCTS_DIR; }};\n"
    f"\t\t{FR_WK} /* WidgetKit.framework */ = {{isa = PBXFileReference; lastKnownFileType = wrapper.framework; name = WidgetKit.framework; path = System/Library/Frameworks/WidgetKit.framework; sourceTree = SDKROOT; }};\n"
    f"\t\t{FR_SU} /* SwiftUI.framework */ = {{isa = PBXFileReference; lastKnownFileType = wrapper.framework; name = SwiftUI.framework; path = System/Library/Frameworks/SwiftUI.framework; sourceTree = SDKROOT; }};\n"
)
content = insert_before(content, '/* End PBXFileReference section */', frs)

# ═══════════════════════════════════════════════════════
# 5. PBXFrameworksBuildPhase — add widget frameworks phase
# ═══════════════════════════════════════════════════════
wfp = (
    f"\t\t{BP_FR} /* Frameworks */ = {{\n"
    f"\t\t\tisa = PBXFrameworksBuildPhase;\n"
    f"\t\t\tbuildActionMask = 2147483647;\n"
    f"\t\t\tfiles = (\n"
    f"\t\t\t\t{BF_WK} /* WidgetKit.framework in Frameworks */,\n"
    f"\t\t\t\t{BF_SU} /* SwiftUI.framework in Frameworks */,\n"
    f"\t\t\t);\n"
    f"\t\t\trunOnlyForDeploymentPostprocessing = 0;\n"
    f"\t\t}};\n"
)
content = insert_before(content, '/* End PBXFrameworksBuildPhase section */', wfp)

# ═══════════════════════════════════════════════════════
# 6. PBXGroup — add widget group + update main/products/frameworks groups
# ═══════════════════════════════════════════════════════
wg = (
    f"\t\t{GR_WG} /* RoohAlMuslimWidgets */ = {{\n"
    f"\t\t\tisa = PBXGroup;\n"
    f"\t\t\tchildren = (\n"
    f"\t\t\t\t{FR_WB} /* WidgetBundle.swift */,\n"
    f"\t\t\t\t{FR_NP} /* NextPrayerWidget.swift */,\n"
    f"\t\t\t\t{FR_QA} /* QuranAyahWidget.swift */,\n"
    f"\t\t\t\t{FR_AZ} /* AzkarWidget.swift */,\n"
    f"\t\t\t\t{FR_DH} /* DhikrWidget.swift */,\n"
    f"\t\t\t\t{FR_HD} /* HijriDateWidget.swift */,\n"
    f"\t\t\t\t{FR_IP} /* Info.plist */,\n"
    f"\t\t\t\t{FR_EN} /* RoohAlMuslimWidgets.entitlements */,\n"
    f"\t\t\t);\n"
    f"\t\t\tpath = RoohAlMuslimWidgets;\n"
    f"\t\t\tsourceTree = \"<group>\";\n"
    f"\t\t}};\n"
)
content = insert_before(content, '/* End PBXGroup section */', wg)

# Add widget group to main group
content = replace_one(content,
    '\t\t\t\t13B07FAE1A68108700A75B9A /* rwhalmslm */,\n\t\t\t\t832341AE1AAA6A7D00B99B32 /* Libraries */',
    f'\t\t\t\t13B07FAE1A68108700A75B9A /* rwhalmslm */,\n\t\t\t\t{GR_WG} /* RoohAlMuslimWidgets */,\n\t\t\t\t832341AE1AAA6A7D00B99B32 /* Libraries */')

# Add product to Products group
content = replace_one(content,
    '\t\t\t\t13B07F961A680F5B00A75B9A /* rwhalmslm.app */,\n\t\t\t);\n\t\t\tname = Products;',
    f'\t\t\t\t13B07F961A680F5B00A75B9A /* rwhalmslm.app */,\n\t\t\t\t{FR_PR} /* RoohAlMuslimWidgets.appex */,\n\t\t\t);\n\t\t\tname = Products;')

# Add frameworks to Frameworks group
content = replace_one(content,
    '\t\t\t\tED297162215061F000B7C4FE /* JavaScriptCore.framework */,\n\t\t\t);\n\t\t\tname = Frameworks;',
    f'\t\t\t\tED297162215061F000B7C4FE /* JavaScriptCore.framework */,\n\t\t\t\t{FR_WK} /* WidgetKit.framework */,\n\t\t\t\t{FR_SU} /* SwiftUI.framework */,\n\t\t\t);\n\t\t\tname = Frameworks;')

# ═══════════════════════════════════════════════════════
# 7. PBXNativeTarget — add widget target
# ═══════════════════════════════════════════════════════
wt = (
    f"\t\t{TG_WG} /* RoohAlMuslimWidgets */ = {{\n"
    f"\t\t\tisa = PBXNativeTarget;\n"
    f"\t\t\tbuildConfigurationList = {CF_LS} /* Build configuration list for PBXNativeTarget \"RoohAlMuslimWidgets\" */;\n"
    f"\t\t\tbuildPhases = (\n"
    f"\t\t\t\t{BP_SR} /* Sources */,\n"
    f"\t\t\t\t{BP_FR} /* Frameworks */,\n"
    f"\t\t\t\t{BP_RS} /* Resources */,\n"
    f"\t\t\t);\n"
    f"\t\t\tbuildRules = (\n"
    f"\t\t\t);\n"
    f"\t\t\tdependencies = (\n"
    f"\t\t\t);\n"
    f"\t\t\tname = RoohAlMuslimWidgets;\n"
    f"\t\t\tproductName = RoohAlMuslimWidgets;\n"
    f"\t\t\tproductReference = {FR_PR} /* RoohAlMuslimWidgets.appex */;\n"
    f"\t\t\tproductType = \"com.apple.product-type.app-extension\";\n"
    f"\t\t}};\n"
)
content = insert_before(content, '/* End PBXNativeTarget section */', wt)

# Update main target — add embed phase + dependency
content = replace_one(content,
    '\t\t\t\t800E24972A6A228C8D4807E9 /* [CP] Copy Pods Resources */,\n\t\t\t);\n\t\t\tbuildRules = (\n\t\t\t);\n\t\t\tdependencies = (\n\t\t\t);',
    f'\t\t\t\t800E24972A6A228C8D4807E9 /* [CP] Copy Pods Resources */,\n\t\t\t\t{BP_EM} /* Embed App Extensions */,\n\t\t\t);\n\t\t\tbuildRules = (\n\t\t\t);\n\t\t\tdependencies = (\n\t\t\t\t{TD_WG} /* PBXTargetDependency */,\n\t\t\t);')

# ═══════════════════════════════════════════════════════
# 8. PBXProject — add target + TargetAttributes
# ═══════════════════════════════════════════════════════
content = replace_one(content,
    '\t\t\ttargets = (\n\t\t\t\t13B07F861A680F5B00A75B9A /* rwhalmslm */,\n\t\t\t);',
    f'\t\t\ttargets = (\n\t\t\t\t13B07F861A680F5B00A75B9A /* rwhalmslm */,\n\t\t\t\t{TG_WG} /* RoohAlMuslimWidgets */,\n\t\t\t);')

content = replace_one(content,
    '\t\t\t\t\t13B07F861A680F5B00A75B9A = {\n\t\t\t\t\t\tLastSwiftMigration = 1250;\n\t\t\t\t\t};',
    f'\t\t\t\t\t13B07F861A680F5B00A75B9A = {{\n\t\t\t\t\t\tLastSwiftMigration = 1250;\n\t\t\t\t\t}};\n\t\t\t\t\t{TG_WG} = {{\n\t\t\t\t\t\tCreatedOnToolsVersion = 15.0;\n\t\t\t\t\t}};')

# ═══════════════════════════════════════════════════════
# 9. PBXResourcesBuildPhase — add widget resources phase
# ═══════════════════════════════════════════════════════
wrp = (
    f"\t\t{BP_RS} /* Resources */ = {{\n"
    f"\t\t\tisa = PBXResourcesBuildPhase;\n"
    f"\t\t\tbuildActionMask = 2147483647;\n"
    f"\t\t\tfiles = (\n"
    f"\t\t\t);\n"
    f"\t\t\trunOnlyForDeploymentPostprocessing = 0;\n"
    f"\t\t}};\n"
)
content = insert_before(content, '/* End PBXResourcesBuildPhase section */', wrp)

# ═══════════════════════════════════════════════════════
# 10. PBXSourcesBuildPhase — add widget sources phase
# ═══════════════════════════════════════════════════════
wsp = (
    f"\t\t{BP_SR} /* Sources */ = {{\n"
    f"\t\t\tisa = PBXSourcesBuildPhase;\n"
    f"\t\t\tbuildActionMask = 2147483647;\n"
    f"\t\t\tfiles = (\n"
    f"\t\t\t\t{BF_WB} /* WidgetBundle.swift in Sources */,\n"
    f"\t\t\t\t{BF_NP} /* NextPrayerWidget.swift in Sources */,\n"
    f"\t\t\t\t{BF_QA} /* QuranAyahWidget.swift in Sources */,\n"
    f"\t\t\t\t{BF_AZ} /* AzkarWidget.swift in Sources */,\n"
    f"\t\t\t\t{BF_DH} /* DhikrWidget.swift in Sources */,\n"
    f"\t\t\t\t{BF_HD} /* HijriDateWidget.swift in Sources */,\n"
    f"\t\t\t);\n"
    f"\t\t\trunOnlyForDeploymentPostprocessing = 0;\n"
    f"\t\t}};\n"
)
content = insert_before(content, '/* End PBXSourcesBuildPhase section */', wsp)

# ═══════════════════════════════════════════════════════
# 11. PBXTargetDependency (new section)
# ═══════════════════════════════════════════════════════
td = (
    "\n/* Begin PBXTargetDependency section */\n"
    f"\t\t{TD_WG} /* PBXTargetDependency */ = {{\n"
    f"\t\t\tisa = PBXTargetDependency;\n"
    f"\t\t\ttarget = {TG_WG} /* RoohAlMuslimWidgets */;\n"
    f"\t\t\ttargetProxy = {CP_WG} /* PBXContainerItemProxy */;\n"
    f"\t\t}};\n"
    "/* End PBXTargetDependency section */\n"
)
content = insert_before(content, '/* Begin XCBuildConfiguration section */', td)

# ═══════════════════════════════════════════════════════
# 12. XCBuildConfiguration — widget Debug + Release
# ═══════════════════════════════════════════════════════
wcfg = (
    f"\t\t{CF_DB} /* Debug */ = {{\n"
    f"\t\t\tisa = XCBuildConfiguration;\n"
    f"\t\t\tbuildSettings = {{\n"
    f"\t\t\t\tASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME = AccentColor;\n"
    f"\t\t\t\tASSETCATALOG_COMPILER_WIDGET_BACKGROUND_COLOR_NAME = WidgetBackground;\n"
    f"\t\t\t\tCLANG_ENABLE_MODULES = YES;\n"
    f"\t\t\t\tCODE_SIGN_ENTITLEMENTS = RoohAlMuslimWidgets/RoohAlMuslimWidgets.entitlements;\n"
    f"\t\t\t\tCODE_SIGN_STYLE = Automatic;\n"
    f"\t\t\t\tCURRENT_PROJECT_VERSION = 1;\n"
    f"\t\t\t\tGENERATE_INFOPLIST_FILE = NO;\n"
    f"\t\t\t\tINFOPLIST_FILE = RoohAlMuslimWidgets/Info.plist;\n"
    f"\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 16.0;\n"
    f"\t\t\t\tLD_RUNPATH_SEARCH_PATHS = (\n"
    f"\t\t\t\t\t\"$(inherited)\",\n"
    f"\t\t\t\t\t\"@executable_path/Frameworks\",\n"
    f"\t\t\t\t\t\"@executable_path/../../Frameworks\",\n"
    f"\t\t\t\t);\n"
    f"\t\t\t\tMARKETING_VERSION = 1.0;\n"
    f"\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = \"com.rooh.almuslim.widgets\";\n"
    f"\t\t\t\tPRODUCT_NAME = \"$(TARGET_NAME)\";\n"
    f"\t\t\t\tSKIP_INSTALL = YES;\n"
    f"\t\t\t\tSWIFT_EMIT_LOC_STRINGS = YES;\n"
    f"\t\t\t\tSWIFT_OPTIMIZATION_LEVEL = \"-Onone\";\n"
    f"\t\t\t\tSWIFT_VERSION = 5.0;\n"
    f"\t\t\t\tTARGETED_DEVICE_FAMILY = \"1,2\";\n"
    f"\t\t\t}};\n"
    f"\t\t\tname = Debug;\n"
    f"\t\t}};\n"
    f"\t\t{CF_RL} /* Release */ = {{\n"
    f"\t\t\tisa = XCBuildConfiguration;\n"
    f"\t\t\tbuildSettings = {{\n"
    f"\t\t\t\tASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME = AccentColor;\n"
    f"\t\t\t\tASSETCATALOG_COMPILER_WIDGET_BACKGROUND_COLOR_NAME = WidgetBackground;\n"
    f"\t\t\t\tCLANG_ENABLE_MODULES = YES;\n"
    f"\t\t\t\tCODE_SIGN_ENTITLEMENTS = RoohAlMuslimWidgets/RoohAlMuslimWidgets.entitlements;\n"
    f"\t\t\t\tCODE_SIGN_STYLE = Automatic;\n"
    f"\t\t\t\tCURRENT_PROJECT_VERSION = 1;\n"
    f"\t\t\t\tGENERATE_INFOPLIST_FILE = NO;\n"
    f"\t\t\t\tINFOPLIST_FILE = RoohAlMuslimWidgets/Info.plist;\n"
    f"\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 16.0;\n"
    f"\t\t\t\tLD_RUNPATH_SEARCH_PATHS = (\n"
    f"\t\t\t\t\t\"$(inherited)\",\n"
    f"\t\t\t\t\t\"@executable_path/Frameworks\",\n"
    f"\t\t\t\t\t\"@executable_path/../../Frameworks\",\n"
    f"\t\t\t\t);\n"
    f"\t\t\t\tMARKETING_VERSION = 1.0;\n"
    f"\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = \"com.rooh.almuslim.widgets\";\n"
    f"\t\t\t\tPRODUCT_NAME = \"$(TARGET_NAME)\";\n"
    f"\t\t\t\tSKIP_INSTALL = YES;\n"
    f"\t\t\t\tSWIFT_EMIT_LOC_STRINGS = YES;\n"
    f"\t\t\t\tSWIFT_VERSION = 5.0;\n"
    f"\t\t\t\tTARGETED_DEVICE_FAMILY = \"1,2\";\n"
    f"\t\t\t}};\n"
    f"\t\t\tname = Release;\n"
    f"\t\t}};\n"
)
content = insert_before(content, '/* End XCBuildConfiguration section */', wcfg)

# ═══════════════════════════════════════════════════════
# 13. XCConfigurationList — widget config list
# ═══════════════════════════════════════════════════════
wcl = (
    f"\t\t{CF_LS} /* Build configuration list for PBXNativeTarget \"RoohAlMuslimWidgets\" */ = {{\n"
    f"\t\t\tisa = XCConfigurationList;\n"
    f"\t\t\tbuildConfigurations = (\n"
    f"\t\t\t\t{CF_DB} /* Debug */,\n"
    f"\t\t\t\t{CF_RL} /* Release */,\n"
    f"\t\t\t);\n"
    f"\t\t\tdefaultConfigurationIsVisible = 0;\n"
    f"\t\t\tdefaultConfigurationName = Release;\n"
    f"\t\t}};\n"
)
content = insert_before(content, '/* End XCConfigurationList section */', wcl)

# ═══════════════════════════════════════════════════════
# Write output
# ═══════════════════════════════════════════════════════
with open(pbxproj, 'w') as f:
    f.write(content)

print("✅ Widget extension target added successfully!")
print(f"   Target UUID: {TG_WG}")
print(f"   Product: RoohAlMuslimWidgets.appex ({FR_PR})")
print(f"   Bundle ID: com.rooh.almuslim.widgets")
print(f"   6 Swift source files added")
print(f"   WidgetKit + SwiftUI frameworks linked")
print(f"   Embedded in main app target")
