#!/usr/bin/env bash
set -euo pipefail

AZKAR_DIR="assets/sounds/azkar_authentic"
MAP_FILE="lib/azkar-audio-map.ts"
JSON_FILE="data/json/azkar.json"
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

DRY_RUN=true
for arg in "$@"; do
  case "$arg" in --run) DRY_RUN=false ;; esac
done

command -v ffmpeg &>/dev/null || { echo "ffmpeg required"; exit 1; }

mp3_count=$(find "$AZKAR_DIR" -name "*.mp3" -not -name "*.bak" | wc -l | tr -d ' ')
BEFORE_SIZE=$(du -sm "$AZKAR_DIR" | awk '{print $1}')
echo "Found $mp3_count MP3 files ($BEFORE_SIZE MB)"

if $DRY_RUN; then
  echo "Target: ~$((BEFORE_SIZE * 35 / 100)) MB — use --run to execute"
  exit 0
fi

echo "Step 1: Converting MP3 → M4A (48kbps mono AAC)..."
converted=0; failed=0

for mp3 in "$AZKAR_DIR"/*.mp3; do
  [[ -f "$mp3" ]] || continue
  [[ "$mp3" == *.bak ]] && continue
  basename_mp3=$(basename "$mp3")
  basename_m4a="${basename_mp3%.mp3}.m4a"
  temp_out="$TEMP_DIR/$basename_m4a"

  if ffmpeg -y -i "$mp3" \
    -c:a aac -b:a 48k -ac 1 -ar 22050 \
    -map 0:a:0 -map_metadata -1 \
    -movflags +faststart \
    "$temp_out" 2>/dev/null; then
    mv "$temp_out" "$AZKAR_DIR/$basename_m4a"
    rm "$mp3"
    ((converted++)) || true
  else
    echo "  FAIL: $basename_mp3"
    ((failed++)) || true
  fi
  (( converted % 50 == 0 )) && (( converted > 0 )) && echo "  ...converted $converted files"
done

rm -f "$AZKAR_DIR"/*.bak 2>/dev/null || true
AFTER_SIZE=$(du -sm "$AZKAR_DIR" | awk '{print $1}')
echo "  Converted: $converted | Failed: $failed"
echo "  $BEFORE_SIZE MB → $AFTER_SIZE MB"

echo ""
echo "Step 2: Regenerating $MAP_FILE..."

{
  echo '// Auto-generated require map for bundled azkar audio files'
  echo '// Maps filename (e.g. "1.m4a") to require() source for expo-av'
  echo ''
  echo 'export const AZKAR_AUDIO_MAP: Record<string, any> = {'
  find "$AZKAR_DIR" -name "*.m4a" -exec basename {} \; | sort -V | while read -r f; do
    echo "  \"$f\": require(\"@/assets/sounds/azkar_authentic/$f\"),"
  done
  echo '};'
  echo ''
  echo 'export const getAzkarAudioSource = (filename: string | null | undefined): any | null => {'
  echo '  if (!filename) return null;'
  echo '  // Support both old .mp3 keys and new .m4a keys for backwards compatibility'
  echo '  const m4aKey = filename.replace(/\\.mp3$/, ".m4a");'
  echo '  return AZKAR_AUDIO_MAP[m4aKey] || AZKAR_AUDIO_MAP[filename] || null;'
  echo '};'
} > "$MAP_FILE"

m4a_count=$(grep -c 'require(' "$MAP_FILE")
echo "  Generated map with $m4a_count entries"

echo ""
echo "Step 3: Updating $JSON_FILE (.mp3 → .m4a)..."
sed -i '' 's/"audio": "\([^"]*\)\.mp3"/"audio": "\1.m4a"/g' "$JSON_FILE"
echo "  Updated audio references"

TOTAL_SOUNDS=$(du -sm assets/sounds | awk '{print $1}')
echo ""
echo "=== SUMMARY ==="
echo "  Azkar: $BEFORE_SIZE MB → $AFTER_SIZE MB"
echo "  Total sounds: $TOTAL_SOUNDS MB"
echo "  Map entries: $m4a_count"
echo "  Done!"
