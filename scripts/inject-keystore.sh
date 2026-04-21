#!/usr/bin/env bash
# Re-injects production signing config into android/app/build.gradle
# after `expo prebuild --clean` wipes it. Reads passwords from credentials.json.
set -e

cd "$(dirname "$0")/.."

GRADLE_FILE="android/app/build.gradle"
CREDS="credentials.json"

if [ ! -f "$GRADLE_FILE" ]; then
  echo "❌ $GRADLE_FILE not found. Run 'npx expo prebuild --platform android' first."
  exit 1
fi

if [ ! -f "$CREDS" ]; then
  echo "❌ credentials.json not found."
  exit 1
fi

# Already injected?
if grep -q "signingConfigs.release" "$GRADLE_FILE"; then
  echo "✅ Production keystore already injected."
  exit 0
fi

KEYSTORE_PATH=$(node -p "require('./$CREDS').android.keystore.keystorePath")
STORE_PASS=$(node -p "require('./$CREDS').android.keystore.keystorePassword")
KEY_ALIAS=$(node -p "require('./$CREDS').android.keystore.keyAlias")
KEY_PASS=$(node -p "require('./$CREDS').android.keystore.keyPassword")

# Inject release signing config + switch release buildType to use it
python3 <<PYEOF
import re
with open("$GRADLE_FILE", "r") as f:
    content = f.read()

# 1. Add release signingConfig inside signingConfigs { ... }
release_config = """        release {
            storeFile file('../../$KEYSTORE_PATH')
            storePassword '$STORE_PASS'
            keyAlias '$KEY_ALIAS'
            keyPassword '$KEY_PASS'
        }
"""
content = re.sub(
    r"(signingConfigs \{\s*\n\s*debug \{[^}]*\}\s*\n)(\s*\})",
    r"\1" + release_config + r"\2",
    content,
    count=1
)

# 2. Switch release buildType to use signingConfigs.release (replace 1st 'signingConfig signingConfigs.debug' inside release {})
content = re.sub(
    r"(release \{\s*\n(?:\s*//[^\n]*\n)*\s*)signingConfig signingConfigs\.debug",
    r"\1signingConfig signingConfigs.release",
    content,
    count=1
)

with open("$GRADLE_FILE", "w") as f:
    f.write(content)
PYEOF

echo "✅ Production keystore injected into $GRADLE_FILE"
