#!/bin/bash
# Finish downloading remaining sound files
# - 4 adhkar compilations (evening, sleep, wakeup, after_prayer)
# - 6 UI effects
cd "$(dirname "$0")/.."
SOUNDS="assets/sounds"
TMP="/tmp/ruh_sounds_$$"
BASE="https://archive.org/download/Azaka.....Sabah....Wa....Masa.......MEShARyAZKARMP3"
mkdir -p "$TMP" "$SOUNDS/adhkar" "$SOUNDS/effects"

download_and_concat() {
  local out="$1"; shift
  local label="$1"; shift
  local urls=("$@")

  if [[ -f "$out" ]] && [[ $(stat -f%z "$out" 2>/dev/null) -gt 10000 ]]; then
    echo "  SKIP $label (exists: $(( $(stat -f%z "$out") / 1024 ))KB)"
    return 0
  fi

  local dir="$TMP/$(basename "$out" .mp3)"
  mkdir -p "$dir"
  local filelist="$dir/list.txt"
  > "$filelist"
  local ok=0
  local total=${#urls[@]}

  for url in "${urls[@]}"; do
    local fname="$(basename "$url")"
    local dest="$dir/$fname"
    echo -n "  [$((ok+1))/$total] $fname ... "
    if curl -sL --fail --max-time 120 -o "$dest" "$url" 2>/dev/null; then
      local sz=$(stat -f%z "$dest" 2>/dev/null)
      if [[ "$sz" -gt 500 ]]; then
        echo "file '$dest'" >> "$filelist"
        ok=$((ok + 1))
        echo "${sz}B OK"
      else
        echo "too small (${sz}B), skip"
      fi
    else
      echo "FAIL"
    fi
  done

  if [[ $ok -eq 0 ]]; then
    echo "  ERROR: No tracks downloaded for $label"
    return 1
  fi

  echo "  Concatenating $ok tracks..."
  ffmpeg -y -f concat -safe 0 -i "$filelist" -c copy "$out" 2>/dev/null
  if [[ -f "$out" ]] && [[ $(stat -f%z "$out" 2>/dev/null) -gt 5000 ]]; then
    echo "  DONE $label: $(( $(stat -f%z "$out") / 1024 ))KB"
  else
    echo "  ERROR: concat failed for $label"
    return 1
  fi
}

echo "=== Wakeup Adhkar (Adkr1-5) ==="
download_and_concat "$SOUNDS/adhkar/wakeup_full.mp3" "wakeup" \
  "$BASE/Adkr1.mp3" "$BASE/Adkr2.mp3" "$BASE/Adkr3.mp3" "$BASE/Adkr4.mp3" "$BASE/Adkr5.mp3"

echo ""
echo "=== After Prayer Adhkar (Adkr53-62) ==="
download_and_concat "$SOUNDS/adhkar/after_prayer_full.mp3" "after_prayer" \
  "$BASE/Adkr53.mp3" "$BASE/Adkr54.mp3" "$BASE/Adkr55.mp3" "$BASE/Adkr56.mp3" \
  "$BASE/Adkr57.mp3" "$BASE/Adkr58.mp3" "$BASE/Adkr59.mp3" "$BASE/Adkr60.mp3" \
  "$BASE/Adkr61.mp3" "$BASE/Adkr62.mp3"

echo ""
echo "=== Sleep Adhkar (Adkr39-50) ==="
download_and_concat "$SOUNDS/adhkar/sleep_full.mp3" "sleep" \
  "$BASE/Adkr39.mp3" "$BASE/Adkr40.mp3" "$BASE/Adkr41.mp3" "$BASE/Adkr42.mp3" \
  "$BASE/Adkr43.mp3" "$BASE/Adkr44.mp3" "$BASE/Adkr45.mp3" "$BASE/Adkr46.mp3" \
  "$BASE/Adkr47.mp3" "$BASE/Adkr48.mp3" "$BASE/Adkr49.mp3" "$BASE/Adkr50.mp3"

echo ""
echo "=== Evening Adhkar (Adkr65-88 from Mishary collection) ==="
download_and_concat "$SOUNDS/adhkar/evening_full.mp3" "evening" \
  "$BASE/Adkr65.mp3" "$BASE/Adkr66.mp3" "$BASE/Adkr67.mp3" "$BASE/Adkr68.mp3" \
  "$BASE/Adkr69.mp3" "$BASE/Adkr70.mp3" "$BASE/Adkr71.mp3" "$BASE/Adkr72.mp3" \
  "$BASE/Adkr73.mp3" "$BASE/Adkr74.mp3" "$BASE/Adkr75.mp3" "$BASE/Adkr76.mp3" \
  "$BASE/Adkr77.mp3" "$BASE/Adkr78.mp3" "$BASE/Adkr79.mp3" "$BASE/Adkr80.mp3" \
  "$BASE/Adkr81.mp3" "$BASE/Adkr82.mp3" "$BASE/Adkr83.mp3" "$BASE/Adkr84.mp3" \
  "$BASE/Adkr85.mp3" "$BASE/Adkr86.mp3" "$BASE/Adkr87.mp3" "$BASE/Adkr88.mp3"

echo ""
echo "=== Generating UI Effects ==="

gen_effect() {
  local out="$1" label="$2" cmd="$3"
  if [[ -f "$out" ]] && [[ $(stat -f%z "$out" 2>/dev/null) -gt 500 ]]; then
    echo "  SKIP $label (exists)"
    return 0
  fi
  echo -n "  Generating $label ... "
  eval "$cmd" 2>/dev/null
  if [[ -f "$out" ]] && [[ $(stat -f%z "$out" 2>/dev/null) -gt 100 ]]; then
    echo "$(( $(stat -f%z "$out") / 1024 ))KB OK"
  else
    echo "FAIL"
  fi
}

# Button click: short 1200Hz blip
gen_effect "$SOUNDS/effects/button_click.mp3" "button_click" \
  "ffmpeg -y -f lavfi -i 'sine=frequency=1200:duration=0.05' -af 'afade=t=out:st=0.03:d=0.02' -b:a 128k '$SOUNDS/effects/button_click.mp3'"

# Success chime: C5+E5 chord
gen_effect "$SOUNDS/effects/success.mp3" "success" \
  "ffmpeg -y -f lavfi -i 'sine=frequency=523:duration=0.6' -f lavfi -i 'sine=frequency=659:duration=0.6' -filter_complex '[0][1]amix=inputs=2:duration=longest,afade=t=in:d=0.05,afade=t=out:st=0.4:d=0.2' -b:a 128k '$SOUNDS/effects/success.mp3'"

# Page turn: filtered white noise
gen_effect "$SOUNDS/effects/page_turn.mp3" "page_turn" \
  "ffmpeg -y -f lavfi -i 'anoisesrc=d=0.15:c=white:a=0.3' -af 'highpass=f=2000,lowpass=f=6000,afade=t=in:d=0.02,afade=t=out:st=0.08:d=0.07' -b:a 128k '$SOUNDS/effects/page_turn.mp3'"

# Tasbih click: 800Hz short tick
gen_effect "$SOUNDS/effects/tasbih_click.mp3" "tasbih_click" \
  "ffmpeg -y -f lavfi -i 'sine=frequency=800:duration=0.04' -af 'afade=t=out:st=0.02:d=0.02' -b:a 128k '$SOUNDS/effects/tasbih_click.mp3'"

# Prayer complete: ascending G5+B5+D6 arpeggio
gen_effect "$SOUNDS/effects/prayer_complete.mp3" "prayer_complete" \
  "ffmpeg -y -f lavfi -i 'sine=frequency=784:duration=0.8' -f lavfi -i 'sine=frequency=988:duration=0.6' -f lavfi -i 'sine=frequency=1175:duration=0.5' -filter_complex '[1]adelay=200|200[b];[2]adelay=400|400[c];[0][b][c]amix=inputs=3:duration=longest,afade=t=in:d=0.05,afade=t=out:st=0.5:d=0.3' -b:a 128k '$SOUNDS/effects/prayer_complete.mp3'"

# Quran open: warm low C4 tone
gen_effect "$SOUNDS/effects/quran_open.mp3" "quran_open" \
  "ffmpeg -y -f lavfi -i 'sine=frequency=262:duration=0.5' -af 'afade=t=in:d=0.1,afade=t=out:st=0.3:d=0.2,volume=0.6' -b:a 128k '$SOUNDS/effects/quran_open.mp3'"

echo ""
echo "=== Summary ==="
for f in "$SOUNDS/adhkar"/*.mp3 "$SOUNDS/effects"/*.mp3; do
  if [[ -f "$f" ]]; then
    echo "  $(basename "$f"): $(( $(stat -f%z "$f") / 1024 ))KB"
  fi
done

# Cleanup
rm -rf "$TMP"
echo ""
echo "Done!"
