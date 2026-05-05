#!/bin/bash
set -e

APP_PLIST="ios/rwhalmslm/Info.plist"
WIDGET_PLIST="ios/RoohAlMuslimWidgets/Info.plist"

if [ ! -f "$WIDGET_PLIST" ]; then
  WIDGET_PLIST=$(find ios -path "*/RoohAlMuslimWidgets/Info.plist" -print -quit)
  if [ -z "$WIDGET_PLIST" ]; then
    echo "❌ Widget Info.plist not found. Run 'npx expo prebuild' first."
    exit 1
  fi
fi

APP_VERSION=$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "$APP_PLIST")
BUILD_NUMBER=$(/usr/libexec/PlistBuddy -c "Print :CFBundleVersion" "$APP_PLIST")

/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $APP_VERSION" "$WIDGET_PLIST"
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $BUILD_NUMBER" "$WIDGET_PLIST"

echo "✅ Widget version synced: $APP_VERSION ($BUILD_NUMBER)"
