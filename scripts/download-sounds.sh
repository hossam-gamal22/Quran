#!/bin/bash
# scripts/download-sounds.sh
# Download Islamic audio files from public CDN APIs into assets/sounds/
# Usage: bash scripts/download-sounds.sh
# Requires: curl, ffmpeg (for generating UI effects & silent audio)
#
# Sources:
#   Adhan:         islamcan.com (21 adhan recordings, public MP3)
#   Quran verses:  cdn.islamic.network (per-ayah audio, 128kbps)
#   Adhkar:        archive.org (Mishary Al-Afasy adhkar collections)
#   Effects:       Generated with ffmpeg (sine wave tones)

set -uo pipefail

# ─── Config ───────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SOUNDS_DIR="$PROJECT_ROOT/assets/sounds"
TEMP_DIR="$PROJECT_ROOT/.sound-download-tmp"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SUCCESS=0
FAILED=0
SKIPPED=0

# ─── Helpers ──────────────────────────────────────────────────────────────────

download_file() {
  local url="$1"
  local dest="$2"
  local label="$3"

  if [[ -f "$dest" ]] && [[ $(stat -f%z "$dest" 2>/dev/null || stat -c%s "$dest" 2>/dev/null) -gt 1000 ]]; then
    echo -e "  ${YELLOW}⏭  SKIP${NC} $label (already exists)"
    SKIPPED=$((SKIPPED + 1))
    return 0
  fi

  echo -ne "  ${BLUE}⬇  Downloading${NC} $label... "
  if curl -sL --fail --max-time 120 -o "$dest" "$url" 2>/dev/null; then
    local size
    size=$(stat -f%z "$dest" 2>/dev/null || stat -c%s "$dest" 2>/dev/null)
    if [[ "$size" -gt 1000 ]]; then
      local size_kb=$((size / 1024))
      echo -e "${GREEN}✅ ${size_kb}KB${NC}"
      SUCCESS=$((SUCCESS + 1))
      return 0
    else
      echo -e "${RED}❌ File too small (${size} bytes)${NC}"
      rm -f "$dest"
      FAILED=$((FAILED + 1))
      return 1
    fi
  else
    echo -e "${RED}❌ Download failed${NC}"
    rm -f "$dest"
    FAILED=$((FAILED + 1))
    return 1
  fi
}

# Download multiple files and concatenate them into one MP3
download_and_concat() {
  local dest="$1"
  local label="$2"
  shift 2
  local urls=("$@")

  if [[ -f "$dest" ]] && [[ $(stat -f%z "$dest" 2>/dev/null || stat -c%s "$dest" 2>/dev/null) -gt 1000 ]]; then
    echo -e "  ${YELLOW}⏭  SKIP${NC} $label (already exists)"
    SKIPPED=$((SKIPPED + 1))
    return 0
  fi

  if ! command -v ffmpeg &>/dev/null; then
    echo -e "  ${RED}❌ SKIP${NC} $label (ffmpeg required for concat)"
    FAILED=$((FAILED + 1))
    return 1
  fi

  echo -ne "  ${BLUE}⬇  Downloading${NC} $label (${#urls[@]} tracks)... "
  local concat_dir="$TEMP_DIR/$(basename "$dest" .mp3)"
  mkdir -p "$concat_dir"
  local filelist="$concat_dir/filelist.txt"
  > "$filelist"

  local dl_ok=0
  for i in "${!urls[@]}"; do
    local part="$concat_dir/part_$(printf '%03d' "$i").mp3"
    if curl -sL --fail --max-time 60 -o "$part" "${urls[$i]}" 2>/dev/null; then
      local sz
      sz=$(stat -f%z "$part" 2>/dev/null || stat -c%s "$part" 2>/dev/null)
      if [[ "$sz" -gt 500 ]]; then
        echo "file '$part'" >> "$filelist"
        dl_ok=$((dl_ok + 1))
      fi
    fi
  done

  if [[ "$dl_ok" -eq 0 ]]; then
    echo -e "${RED}❌ All track downloads failed${NC}"
    rm -rf "$concat_dir"
    FAILED=$((FAILED + 1))
    return 1
  fi

  # Concatenate all parts
  if ffmpeg -y -f concat -safe 0 -i "$filelist" -c copy "$dest" 2>/dev/null; then
    local final_size
    final_size=$(stat -f%z "$dest" 2>/dev/null || stat -c%s "$dest" 2>/dev/null)
    local final_kb=$((final_size / 1024))
    echo -e "${GREEN}✅ ${final_kb}KB (${dl_ok} tracks)${NC}"
    rm -rf "$concat_dir"
    SUCCESS=$((SUCCESS + 1))
    return 0
  else
    echo -e "${RED}❌ Concat failed${NC}"
    rm -rf "$concat_dir"
    FAILED=$((FAILED + 1))
    return 1
  fi
}

generate_tone() {
  local dest="$1"
  local label="$2"
  local freq="$3"
  local duration="$4"
  local fade_out="${5:-$duration}"

  if [[ -f "$dest" ]] && [[ $(stat -f%z "$dest" 2>/dev/null || stat -c%s "$dest" 2>/dev/null) -gt 100 ]]; then
    echo -e "  ${YELLOW}⏭  SKIP${NC} $label (already exists)"
    SKIPPED=$((SKIPPED + 1))
    return 0
  fi

  echo -ne "  ${BLUE}🎵 Generating${NC} $label... "
  if command -v ffmpeg &>/dev/null; then
    local fade_start
    fade_start=$(awk "BEGIN{printf \"%.4f\", $duration - $fade_out}")
    ffmpeg -y -f lavfi -i "sine=frequency=${freq}:duration=${duration}" \
      -af "afade=t=in:ss=0:d=0.01,afade=t=out:st=${fade_start}:d=${fade_out},volume=0.5" \
      -ar 44100 -ac 1 -b:a 64k "$dest" 2>/dev/null
    if [[ -f "$dest" ]]; then
      echo -e "${GREEN}✅${NC}"
      SUCCESS=$((SUCCESS + 1))
      return 0
    fi
  fi
  echo -e "${RED}❌ ffmpeg not available${NC}"
  FAILED=$((FAILED + 1))
  return 1
}

generate_silence() {
  local dest="$1"
  local label="$2"
  local duration="$3"

  if [[ -f "$dest" ]] && [[ $(stat -f%z "$dest" 2>/dev/null || stat -c%s "$dest" 2>/dev/null) -gt 100 ]]; then
    echo -e "  ${YELLOW}⏭  SKIP${NC} $label (already exists)"
    SKIPPED=$((SKIPPED + 1))
    return 0
  fi

  echo -ne "  ${BLUE}🔇 Generating${NC} $label... "
  if command -v ffmpeg &>/dev/null; then
    ffmpeg -y -f lavfi -i "anullsrc=r=44100:cl=mono" -t "$duration" -b:a 32k "$dest" 2>/dev/null
    if [[ -f "$dest" ]]; then
      echo -e "${GREEN}✅${NC}"
      SUCCESS=$((SUCCESS + 1))
      return 0
    fi
  fi
  echo -e "${RED}❌ ffmpeg not available${NC}"
  FAILED=$((FAILED + 1))
  return 1
}

generate_chime() {
  local dest="$1"
  local label="$2"
  local freq1="$3"
  local freq2="$4"
  local duration="$5"

  if [[ -f "$dest" ]] && [[ $(stat -f%z "$dest" 2>/dev/null || stat -c%s "$dest" 2>/dev/null) -gt 100 ]]; then
    echo -e "  ${YELLOW}⏭  SKIP${NC} $label (already exists)"
    SKIPPED=$((SKIPPED + 1))
    return 0
  fi

  echo -ne "  ${BLUE}🔔 Generating${NC} $label... "
  if command -v ffmpeg &>/dev/null; then
    local fade_start_c fade_dur_c
    fade_start_c=$(awk "BEGIN{printf \"%.4f\", $duration * 0.6}")
    fade_dur_c=$(awk "BEGIN{printf \"%.4f\", $duration * 0.4}")
    ffmpeg -y -f lavfi \
      -i "sine=frequency=${freq1}:duration=${duration}" \
      -f lavfi \
      -i "sine=frequency=${freq2}:duration=${duration}" \
      -filter_complex "[0:a][1:a]amix=inputs=2:duration=shortest,afade=t=in:ss=0:d=0.02,afade=t=out:st=${fade_start_c}:d=${fade_dur_c},volume=0.4" \
      -ar 44100 -ac 1 -b:a 64k "$dest" 2>/dev/null
    if [[ -f "$dest" ]]; then
      echo -e "${GREEN}✅${NC}"
      SUCCESS=$((SUCCESS + 1))
      return 0
    fi
  fi
  echo -e "${RED}❌ ffmpeg not available${NC}"
  FAILED=$((FAILED + 1))
  return 1
}

# ─── Pre-checks ───────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  📥  روح المسلم — Islamic Audio Downloader${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════════════════${NC}"
echo ""

if ! command -v curl &>/dev/null; then
  echo -e "${RED}❌ curl is required. Install with: brew install curl${NC}"
  exit 1
fi

if ! command -v ffmpeg &>/dev/null; then
  echo -e "${YELLOW}⚠️  ffmpeg not found. UI effect sounds will not be generated.${NC}"
  echo -e "${YELLOW}   Install with: brew install ffmpeg${NC}"
  echo ""
fi

# Create directories
mkdir -p "$SOUNDS_DIR"/{adhan,notifications,adhkar,effects}
mkdir -p "$TEMP_DIR"

# ─── 1. Adhan Sounds ─────────────────────────────────────────────────────────
# Source: islamcan.com — 21 public adhan recordings
# Mapping: azan1=Makkah style, azan2=Madinah, azan3=Al-Aqsa style,
#          azan4=Mishary Rashid, azan5=Abdul Basit style

echo -e "${GREEN}📣 [1/4] Adhan Sounds → assets/sounds/adhan/${NC}"
echo ""

download_file \
  "https://www.islamcan.com/audio/adhan/azan1.mp3" \
  "$SOUNDS_DIR/adhan/makkah.mp3" \
  "makkah.mp3 (أذان مكة المكرمة)"

download_file \
  "https://www.islamcan.com/audio/adhan/azan2.mp3" \
  "$SOUNDS_DIR/adhan/madinah.mp3" \
  "madinah.mp3 (أذان المدينة المنورة)"

download_file \
  "https://www.islamcan.com/audio/adhan/azan3.mp3" \
  "$SOUNDS_DIR/adhan/alaqsa.mp3" \
  "alaqsa.mp3 (أذان المسجد الأقصى)"

download_file \
  "https://www.islamcan.com/audio/adhan/azan4.mp3" \
  "$SOUNDS_DIR/adhan/mishary.mp3" \
  "mishary.mp3 (مشاري العفاسي)"

download_file \
  "https://www.islamcan.com/audio/adhan/azan5.mp3" \
  "$SOUNDS_DIR/adhan/abdulbasit.mp3" \
  "abdulbasit.mp3 (عبد الباسط عبد الصمد)"

generate_silence \
  "$SOUNDS_DIR/adhan/silent.mp3" \
  "silent.mp3 (صامت)" \
  "0.5"

echo ""

# ─── 2. Notification Sounds ──────────────────────────────────────────────────
# Source: cdn.islamic.network — per-ayah Quran audio (Mishary Al-Afasy, 128kbps)

echo -e "${GREEN}🔔 [2/4] Notification Sounds → assets/sounds/notifications/${NC}"
echo ""

# Surah Al-Ahzab (33), Ayah 56 — الصلاة على النبي
# إِنَّ اللَّهَ وَمَلَائِكَتَهُ يُصَلُّونَ عَلَى النَّبِيِّ
download_file \
  "https://cdn.islamic.network/quran/audio/128/ar.alafasy/3624.mp3" \
  "$SOUNDS_DIR/notifications/salawat.mp3" \
  "salawat.mp3 (الصلاة على النبي — الأحزاب:56)"

# Surah Aal-Imran (3), Ayah 135 — الاستغفار
# وَالَّذِينَ إِذَا فَعَلُوا فَاحِشَةً أَوْ ظَلَمُوا أَنفُسَهُمْ ذَكَرُوا اللَّهَ فَاسْتَغْفَرُوا
download_file \
  "https://cdn.islamic.network/quran/audio/128/ar.alafasy/432.mp3" \
  "$SOUNDS_DIR/notifications/istighfar.mp3" \
  "istighfar.mp3 (الاستغفار — آل عمران:135)"

# Surah Al-Ahzab (33), Ayah 42 — التسبيح
# وَسَبِّحُوهُ بُكْرَةً وَأَصِيلًا
download_file \
  "https://cdn.islamic.network/quran/audio/128/ar.alafasy/3610.mp3" \
  "$SOUNDS_DIR/notifications/tasbih.mp3" \
  "tasbih.mp3 (التسبيح — الأحزاب:42)"

# Generate notification chimes for reminder categories
generate_chime \
  "$SOUNDS_DIR/notifications/morning_adhkar.mp3" \
  "morning_adhkar.mp3 (تنبيه أذكار الصباح)" \
  523 784 0.8

generate_chime \
  "$SOUNDS_DIR/notifications/evening_adhkar.mp3" \
  "evening_adhkar.mp3 (تنبيه أذكار المساء)" \
  440 659 0.8

generate_chime \
  "$SOUNDS_DIR/notifications/general_reminder.mp3" \
  "general_reminder.mp3 (تنبيه عام)" \
  587 880 0.6

echo ""

# ─── 3. Adhkar Full Audio ────────────────────────────────────────────────────
# Source: archive.org — Mishary Al-Afasy adhkar collections
# Morning: azkar-alsabah_202505 (complete recording)
# Evening: azkar-al-masa-1425 (individual tracks, concatenated)
# Others: Mishary adhkar collection (individual tracks, concatenated)

echo -e "${GREEN}📿 [3/4] Adhkar Audio → assets/sounds/adhkar/${NC}"
echo ""

# Morning Adhkar — أذكار الصباح كاملة (concatenated from individual tracks)
# Tracks from Mishary adhkar: آية الكرسي، الإخلاص، الفلق، الناس، أدعية الصباح
ARCHIVE_ADHKAR="https://archive.org/download/Azaka.....Sabah....Wa....Masa.......MEShARyAZKARMP3"
download_and_concat \
  "$SOUNDS_DIR/adhkar/morning_full.mp3" \
  "morning_full.mp3 (أذكار الصباح كاملة — مشاري العفاسي)" \
  "${ARCHIVE_ADHKAR}/Adkr10.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr11.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr12.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr13.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr14.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr15.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr16.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr17.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr18.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr19.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr20.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr21.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr22.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr23.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr24.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr25.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr26.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr27.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr28.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr29.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr30.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr31.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr32.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr33.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr34.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr35.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr36.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr37.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr38.mp3"

# Evening Adhkar — أذكار المساء كاملة (concatenated from individual tracks)
ARCHIVE_MASA="https://archive.org/download/azkar-al-masa-1425"
download_and_concat \
  "$SOUNDS_DIR/adhkar/evening_full.mp3" \
  "evening_full.mp3 (أذكار المساء كاملة)" \
  "${ARCHIVE_MASA}/9-azkar-al-masa-1425-1-ayat-al-kursy.mp3" \
  "${ARCHIVE_MASA}/9-azkar-al-masa-1425-2.mp3" \
  "${ARCHIVE_MASA}/9-azkar-al-masa-1425-3.mp3" \
  "${ARCHIVE_MASA}/9-azkar-al-masa-1425-4.mp3" \
  "${ARCHIVE_MASA}/9-azkar-al-masa-1425-5.mp3" \
  "${ARCHIVE_MASA}/9-azkar-al-masa-1425-6.mp3" \
  "${ARCHIVE_MASA}/9-azkar-al-masa-1425-7.mp3" \
  "${ARCHIVE_MASA}/9-azkar-al-masa-1425-8.mp3" \
  "${ARCHIVE_MASA}/9-azkar-al-masa-1425-9.mp3" \
  "${ARCHIVE_MASA}/9-azkar-al-masa-1425-10.mp3" \
  "${ARCHIVE_MASA}/9-azkar-al-masa-1425-11.mp3" \
  "${ARCHIVE_MASA}/9-azkar-al-masa-1425-12.mp3" \
  "${ARCHIVE_MASA}/9-azkar-al-masa-1425-13.mp3" \
  "${ARCHIVE_MASA}/9-azkar-al-masa-1425-14.mp3" \
  "${ARCHIVE_MASA}/9-azkar-al-masa-1425-15.mp3" \
  "${ARCHIVE_MASA}/9-azkar-al-masa-1425-16.mp3" \
  "${ARCHIVE_MASA}/9-azkar-al-masa-1425-17.mp3" \
  "${ARCHIVE_MASA}/9-azkar-al-masa-1425-18.mp3" \
  "${ARCHIVE_MASA}/9-azkar-al-masa-1425-19.mp3" \
  "${ARCHIVE_MASA}/9-azkar-al-masa-1425-20.mp3" \
  "${ARCHIVE_MASA}/9-azkar-al-masa-1425-21.mp3"

# Sleep Adhkar — أذكار النوم (from Mishary adhkar collection)
# Tracks: آية الكرسي، الإخلاص، الفلق، الناس، أذكار النوم
ARCHIVE_ADHKAR="https://archive.org/download/Azaka.....Sabah....Wa....Masa.......MEShARyAZKARMP3"
download_and_concat \
  "$SOUNDS_DIR/adhkar/sleep_full.mp3" \
  "sleep_full.mp3 (أذكار النوم كاملة)" \
  "${ARCHIVE_ADHKAR}/Adkr39.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr40.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr41.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr42.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr43.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr44.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr45.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr46.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr47.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr48.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr49.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr50.mp3"

# Wakeup Adhkar — أذكار الاستيقاظ
download_and_concat \
  "$SOUNDS_DIR/adhkar/wakeup_full.mp3" \
  "wakeup_full.mp3 (أذكار الاستيقاظ كاملة)" \
  "${ARCHIVE_ADHKAR}/Adkr1.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr2.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr3.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr4.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr5.mp3"

# After Prayer Adhkar — أذكار بعد الصلاة
download_and_concat \
  "$SOUNDS_DIR/adhkar/after_prayer_full.mp3" \
  "after_prayer_full.mp3 (أذكار بعد الصلاة كاملة)" \
  "${ARCHIVE_ADHKAR}/Adkr53.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr54.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr55.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr56.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr57.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr58.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr59.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr60.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr61.mp3" \
  "${ARCHIVE_ADHKAR}/Adkr62.mp3"

echo ""

# ─── 4. UI Effect Sounds ─────────────────────────────────────────────────────

echo -e "${GREEN}🎵 [4/4] UI Effect Sounds → assets/sounds/effects/${NC}"
echo ""

# Short tactile click (50ms, 1200Hz — subtle)
generate_tone \
  "$SOUNDS_DIR/effects/button_click.mp3" \
  "button_click.mp3 (نقر زر)" \
  1200 0.05 0.03

# Success chime (300ms, dual-tone)
generate_chime \
  "$SOUNDS_DIR/effects/success.mp3" \
  "success.mp3 (نجاح)" \
  523 784 0.35

# Page turn (100ms, low swoosh)
generate_tone \
  "$SOUNDS_DIR/effects/page_turn.mp3" \
  "page_turn.mp3 (تقليب صفحة)" \
  400 0.12 0.08

# Tasbih click (80ms, tactile)
generate_tone \
  "$SOUNDS_DIR/effects/tasbih_click.mp3" \
  "tasbih_click.mp3 (نقر تسبيح)" \
  800 0.08 0.05

# Prayer complete (400ms, gentle ascending)
generate_chime \
  "$SOUNDS_DIR/effects/prayer_complete.mp3" \
  "prayer_complete.mp3 (إتمام الصلاة)" \
  440 880 0.45

# Quran reader open (200ms, soft)
generate_tone \
  "$SOUNDS_DIR/effects/quran_open.mp3" \
  "quran_open.mp3 (فتح القرآن)" \
  660 0.2 0.15

echo ""

# ─── Cleanup ──────────────────────────────────────────────────────────────────

rm -rf "$TEMP_DIR"

# ─── Summary ──────────────────────────────────────────────────────────────────

echo -e "${GREEN}══════════════════════════════════════════════════════════════${NC}"
echo -e "  ${GREEN}✅ Success: $SUCCESS${NC}  |  ${YELLOW}⏭  Skipped: $SKIPPED${NC}  |  ${RED}❌ Failed: $FAILED${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════════════════${NC}"
echo ""

# Show directory listing
echo -e "${BLUE}📂 Directory contents:${NC}"
echo ""
for dir in adhan notifications adhkar effects; do
  echo -e "  ${GREEN}$dir/${NC}"
  if ls -1 "$SOUNDS_DIR/$dir/"*.mp3 2>/dev/null | head -20 > /dev/null 2>&1; then
    ls -lh "$SOUNDS_DIR/$dir/"*.mp3 2>/dev/null | awk '{print "    " $NF " (" $5 ")"}'
  else
    echo "    (empty)"
  fi
  echo ""
done

if [[ $FAILED -gt 0 ]]; then
  echo -e "${YELLOW}⚠️  Some downloads failed. You can:${NC}"
  echo -e "  1. Re-run this script (skips already downloaded files)"
  echo -e "  2. Upload missing files via admin panel → Sound Manager"
  echo -e "  3. Check your internet connection and try again"
  exit 1
fi

echo -e "${GREEN}🎉 All done! Run 'pnpm dev' to verify Metro bundler resolves the audio files.${NC}"
