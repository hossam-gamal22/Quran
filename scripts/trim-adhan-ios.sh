#!/bin/bash
# Trim adhan MP3s to 29s WAV for iOS notification sounds
ADHAN_DIR="assets/sounds/adhan"
OUTPUT_DIR="assets/sounds/adhan"
FILES=(makkah madinah abdulbasit ajman alaqsa ali_mulla
       dosari egypt haramain mansoor_zahrani mishary
       naqshbandi sharif sudais)
for name in "${FILES[@]}"; do
  input="$ADHAN_DIR/${name}.mp3"
  output="$OUTPUT_DIR/${name}_short.wav"
  if [ -f "$input" ]; then
    ffmpeg -i "$input" -t 29 -ar 22050 -ac 1 "$output" -y 2>/dev/null
    echo "✅ Created: $output"
  else
    echo "⚠️ Missing: $input"
  fi
done
echo "Done!"
