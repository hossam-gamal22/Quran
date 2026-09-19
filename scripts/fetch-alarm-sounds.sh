#!/usr/bin/env bash
# Re-downloads the 5 smart-alarm ringtones from AOSP (Android Open Source
# Project — Apache 2.0). The repo already ships ready-converted MP3s; this
# script is provided in case the assets get lost or you want to swap voices.
#
# Requires: curl, ffmpeg (brew install ffmpeg)

set -euo pipefail

cd "$(dirname "$0")/../assets/sounds"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

declare -a MAP=(
  "alarm_classic|Alarm_Classic"
  "alarm_digital|Alarm_Beep_01"
  "alarm_buzzer|Alarm_Buzzer"
  "alarm_radar|Alarm_Beep_03"
  "alarm_chime|Alarm_Beep_02"
)

echo "Fetching 5 alarm sounds into $(pwd)..."

for entry in "${MAP[@]}"; do
  key="${entry%%|*}"
  src="${entry##*|}"
  url="https://github.com/AOSP-Mirror/platform_frameworks_base/raw/master/data/sounds/${src}.ogg"
  ogg="$TMP/${src}.ogg"
  mp3="${key}.mp3"
  echo "  → $key (from AOSP ${src}.ogg)"
  curl -sSL -o "$ogg" "$url" --max-time 30 || { echo "    ✗ download failed"; continue; }
  ffmpeg -y -i "$ogg" -codec:a libmp3lame -qscale:a 2 -loglevel error "$mp3" \
    || { echo "    ✗ convert failed"; continue; }
  size=$(stat -f%z "$mp3" 2>/dev/null || stat -c%s "$mp3" 2>/dev/null)
  echo "    ✓ ${mp3} (${size} bytes)"
done

echo ""
echo "Done. Rebuild to bundle:"
echo "  npx expo prebuild --clean && pnpm dev --clear"
