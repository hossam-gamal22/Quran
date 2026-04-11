#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# scripts/optimize-audio.sh
# Safe MP3 optimization for all bundled audio in assets/sounds/
#
# Strategy:
#   - azkar_authentic/ (voice narration): 64 kbps, mono, 22050 Hz
#   - Root adhan/notification .mp3:       96 kbps, mono, 44100 Hz
#   - effects/ (UI sounds):              96 kbps, mono, 44100 Hz
#
# All files stay .mp3 — zero code changes required.
# A full backup is created before any processing.
#
# Usage:
#   chmod +x scripts/optimize-audio.sh
#   ./scripts/optimize-audio.sh            # dry-run by default
#   ./scripts/optimize-audio.sh --run      # actually process files
#   ./scripts/optimize-audio.sh --restore  # restore from backup
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SOUNDS_DIR="assets/sounds"
BACKUP_DIR="assets/sounds_backup"
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

DRY_RUN=true
RESTORE=false

for arg in "$@"; do
  case "$arg" in
    --run) DRY_RUN=false ;;
    --restore) RESTORE=true ;;
    --help|-h)
      echo "Usage: $0 [--run | --restore | --help]"
      echo "  (no flags)  Dry run — shows what would be done"
      echo "  --run       Actually process and overwrite files"
      echo "  --restore   Restore from backup"
      exit 0
      ;;
  esac
done

# ── Restore mode ──────────────────────────────────────────────────────────────
if $RESTORE; then
  if [[ ! -d "$BACKUP_DIR" ]]; then
    echo -e "${RED}✗ No backup found at $BACKUP_DIR${NC}"
    exit 1
  fi
  echo -e "${CYAN}♻ Restoring from backup...${NC}"
  rm -rf "$SOUNDS_DIR"
  cp -R "$BACKUP_DIR" "$SOUNDS_DIR"
  echo -e "${GREEN}✓ Restored successfully from $BACKUP_DIR${NC}"
  exit 0
fi

# ── Verify ffmpeg is installed ────────────────────────────────────────────────
if ! command -v ffmpeg &>/dev/null; then
  echo -e "${RED}✗ ffmpeg is required but not installed.${NC}"
  echo "  Install with: brew install ffmpeg"
  exit 1
fi

# ── Show current sizes ───────────────────────────────────────────────────────
echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Audio Optimization — Phase 1 (MP3)    ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""

TOTAL_BEFORE=$(du -sm "$SOUNDS_DIR" | awk '{print $1}')
AZKAR_BEFORE=$(du -sm "$SOUNDS_DIR/azkar_authentic" 2>/dev/null | awk '{print $1}' || echo "0")
echo -e "📦 Current sizes:"
echo -e "   Total sounds:    ${YELLOW}${TOTAL_BEFORE} MB${NC}"
echo -e "   azkar_authentic: ${YELLOW}${AZKAR_BEFORE} MB${NC}"
echo ""

# ── Create backup (only on first --run, skip if backup exists) ────────────────
if ! $DRY_RUN; then
  if [[ ! -d "$BACKUP_DIR" ]]; then
    echo -e "${CYAN}📋 Creating backup at $BACKUP_DIR ...${NC}"
    cp -R "$SOUNDS_DIR" "$BACKUP_DIR"
    echo -e "${GREEN}✓ Backup created${NC}"
  else
    echo -e "${YELLOW}⚠ Backup already exists at $BACKUP_DIR — skipping backup${NC}"
  fi
  echo ""
fi

# ── Optimization function ─────────────────────────────────────────────────────
# optimize_file <input> <bitrate> <sample_rate>
# Converts to mono MP3 at given bitrate/sample rate
processed=0
skipped=0
failed=0
saved_bytes=0

optimize_file() {
  local input="$1"
  local bitrate="$2"
  local sample_rate="$3"
  local category="$4"

  # Skip non-mp3 files, .bak files, etc.
  if [[ ! "$input" =~ \.mp3$ ]]; then
    return
  fi

  local basename
  basename=$(basename "$input")
  local size_before
  size_before=$(stat -f%z "$input" 2>/dev/null || stat -c%s "$input" 2>/dev/null)

  if $DRY_RUN; then
    echo -e "  ${CYAN}→${NC} $basename  (${bitrate}k mono, ${sample_rate}Hz)"
    ((processed++)) || true
    return
  fi

  local temp_out="$TEMP_DIR/${basename}"

  # ffmpeg flags:
  #   -ac 1          → mono
  #   -ab <bitrate>  → target bitrate
  #   -ar <rate>     → sample rate
  #   -map_metadata -1 → strip metadata (album art, tags) to save space
  #   -map 0:a:0     → only first audio stream (skip embedded images)
  if ffmpeg -y -i "$input" \
    -ac 1 \
    -ab "${bitrate}k" \
    -ar "$sample_rate" \
    -map 0:a:0 \
    -map_metadata -1 \
    -id3v2_version 0 \
    "$temp_out" 2>/dev/null; then

    local size_after
    size_after=$(stat -f%z "$temp_out" 2>/dev/null || stat -c%s "$temp_out" 2>/dev/null)

    # Only replace if the new file is smaller
    if [[ "$size_after" -lt "$size_before" ]]; then
      mv "$temp_out" "$input"
      local diff=$((size_before - size_after))
      saved_bytes=$((saved_bytes + diff))
      ((processed++)) || true
    else
      rm -f "$temp_out"
      ((skipped++)) || true
    fi
  else
    echo -e "  ${RED}✗ Failed: $basename${NC}"
    rm -f "$temp_out"
    ((failed++)) || true
  fi
}

# ── Process azkar_authentic/ — 64kbps mono 22050Hz ────────────────────────────
echo -e "${GREEN}━━━ azkar_authentic/ (voice narration) ━━━${NC}"
echo -e "    Settings: ${YELLOW}64 kbps${NC}, mono, 22050 Hz"
if $DRY_RUN; then
  echo -e "    Mode: ${YELLOW}DRY RUN${NC} (use --run to process)"
fi
echo ""

azkar_count=0
for f in "$SOUNDS_DIR"/azkar_authentic/*.mp3; do
  [[ -f "$f" ]] || continue
  optimize_file "$f" 64 22050 "azkar"
  ((azkar_count++)) || true
  # Progress indicator (every 50 files)
  if ! $DRY_RUN && (( azkar_count % 50 == 0 )); then
    echo -e "  ${CYAN}...processed $azkar_count azkar files${NC}"
  fi
done
echo -e "  📊 azkar files found: $azkar_count"
echo ""

# ── Process root notification/adhan MP3s — 96kbps mono 44100Hz ────────────────
echo -e "${GREEN}━━━ Root notification & adhan sounds ━━━${NC}"
echo -e "    Settings: ${YELLOW}96 kbps${NC}, mono, 44100 Hz"
echo ""

root_count=0
for f in "$SOUNDS_DIR"/*.mp3; do
  [[ -f "$f" ]] || continue
  optimize_file "$f" 96 44100 "notification"
  ((root_count++)) || true
done
echo -e "  📊 root MP3 files found: $root_count"
echo ""

# ── Process effects/ — 96kbps mono 44100Hz ────────────────────────────────────
echo -e "${GREEN}━━━ effects/ (UI sounds) ━━━${NC}"
echo -e "    Settings: ${YELLOW}96 kbps${NC}, mono, 44100 Hz"
echo ""

fx_count=0
for f in "$SOUNDS_DIR"/effects/*.mp3; do
  [[ -f "$f" ]] || continue
  optimize_file "$f" 96 44100 "effects"
  ((fx_count++)) || true
done
echo -e "  📊 effect files found: $fx_count"
echo ""

# ── Summary ───────────────────────────────────────────────────────────────────
echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║              Summary                     ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"

if $DRY_RUN; then
  echo -e "  Mode:      ${YELLOW}DRY RUN${NC}"
  echo -e "  Files:     $((azkar_count + root_count + fx_count)) total"
  echo ""
  echo -e "  ${CYAN}Run with --run to actually process files${NC}"
  echo -e "  ${CYAN}Run with --restore to restore from backup${NC}"
else
  TOTAL_AFTER=$(du -sm "$SOUNDS_DIR" | awk '{print $1}')
  saved_mb=$(echo "scale=1; $saved_bytes / 1048576" | bc)

  echo -e "  Processed: ${GREEN}$processed${NC} files"
  echo -e "  Skipped:   $skipped (already optimal)"
  echo -e "  Failed:    ${RED}$failed${NC}"
  echo ""
  echo -e "  Before:    ${YELLOW}${TOTAL_BEFORE} MB${NC}"
  echo -e "  After:     ${GREEN}${TOTAL_AFTER} MB${NC}"
  echo -e "  Saved:     ${GREEN}~${saved_mb} MB${NC}"
  echo ""

  if [[ -d "$BACKUP_DIR" ]]; then
    echo -e "  ${CYAN}Backup at: $BACKUP_DIR${NC}"
    echo -e "  ${CYAN}To restore: $0 --restore${NC}"
    echo -e "  ${CYAN}To delete backup: rm -rf $BACKUP_DIR${NC}"
  fi
fi

echo ""
echo -e "${GREEN}✓ Done${NC}"
