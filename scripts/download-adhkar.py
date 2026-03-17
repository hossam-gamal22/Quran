#!/usr/bin/env python3
"""Download adhkar audio tracks from archive.org and concatenate into full files.
Also generates UI effect sounds using ffmpeg."""

import os
import subprocess
import sys
import tempfile
import urllib.request
import shutil

SOUNDS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "sounds")
ARCHIVE_ADHKAR = "https://archive.org/download/Azaka.....Sabah....Wa....Masa.......MEShARyAZKARMP3"
ARCHIVE_MASA = "https://archive.org/download/azkar-al-masa-1425"

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
NC = "\033[0m"


def download(url: str, dest: str, timeout: int = 90) -> bool:
    """Download a file, return True on success."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = resp.read()
            if len(data) < 500:
                return False
            with open(dest, "wb") as f:
                f.write(data)
            return True
    except Exception:
        return False


def concat_mp3s(parts: list[str], output: str) -> bool:
    """Concatenate MP3 files using ffmpeg."""
    filelist = output + ".filelist.txt"
    with open(filelist, "w") as f:
        for p in parts:
            f.write(f"file '{p}'\n")
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", filelist, "-c", "copy", output],
            capture_output=True, timeout=120
        )
        os.unlink(filelist)
        return os.path.exists(output) and os.path.getsize(output) > 1000
    except Exception:
        if os.path.exists(filelist):
            os.unlink(filelist)
        return False


def download_and_concat(dest: str, label: str, urls: list[str]) -> bool:
    """Download tracks and concatenate into a single file."""
    if os.path.exists(dest) and os.path.getsize(dest) > 1000:
        print(f"  {YELLOW}⏭  SKIP{NC} {label} (already exists)")
        return True

    print(f"  {BLUE}⬇  Downloading{NC} {label} ({len(urls)} tracks)...", end=" ", flush=True)
    
    tmpdir = tempfile.mkdtemp()
    parts = []
    for i, url in enumerate(urls):
        part = os.path.join(tmpdir, f"part_{i:03d}.mp3")
        if download(url, part):
            parts.append(part)
    
    if not parts:
        print(f"{RED}❌ All downloads failed{NC}")
        shutil.rmtree(tmpdir, ignore_errors=True)
        return False
    
    if concat_mp3s(parts, dest):
        size_kb = os.path.getsize(dest) // 1024
        print(f"{GREEN}✅ {size_kb}KB ({len(parts)}/{len(urls)} tracks){NC}")
        shutil.rmtree(tmpdir, ignore_errors=True)
        return True
    else:
        print(f"{RED}❌ Concat failed{NC}")
        shutil.rmtree(tmpdir, ignore_errors=True)
        return False


def generate_ffmpeg(dest: str, label: str, args: list[str]) -> bool:
    """Generate audio using ffmpeg."""
    if os.path.exists(dest) and os.path.getsize(dest) > 100:
        print(f"  {YELLOW}⏭  SKIP{NC} {label} (already exists)")
        return True

    print(f"  {BLUE}🎵 Generating{NC} {label}...", end=" ", flush=True)
    try:
        subprocess.run(["ffmpeg", "-y"] + args + [dest], capture_output=True, timeout=30)
        if os.path.exists(dest) and os.path.getsize(dest) > 100:
            print(f"{GREEN}✅{NC}")
            return True
    except Exception:
        pass
    print(f"{RED}❌{NC}")
    return False


def main():
    os.makedirs(os.path.join(SOUNDS_DIR, "adhkar"), exist_ok=True)
    os.makedirs(os.path.join(SOUNDS_DIR, "effects"), exist_ok=True)

    print()
    print(f"{GREEN}══════════════════════════════════════════════════════════════{NC}")
    print(f"{GREEN}  📿 Adhkar & Effects Downloader{NC}")
    print(f"{GREEN}══════════════════════════════════════════════════════════════{NC}")
    print()

    success = 0
    failed = 0

    # ── Evening Adhkar ──
    print(f"{GREEN}📿 [1/5] Evening Adhkar{NC}")
    masa_urls = [f"{ARCHIVE_MASA}/9-azkar-al-masa-1425-1-ayat-al-kursy.mp3"] + \
                [f"{ARCHIVE_MASA}/9-azkar-al-masa-1425-{i}.mp3" for i in range(2, 22)]
    if download_and_concat(
        os.path.join(SOUNDS_DIR, "adhkar", "evening_full.mp3"),
        "evening_full.mp3 (أذكار المساء كاملة)",
        masa_urls
    ):
        success += 1
    else:
        failed += 1

    # ── Sleep Adhkar ──
    print(f"\n{GREEN}📿 [2/5] Sleep Adhkar{NC}")
    sleep_urls = [f"{ARCHIVE_ADHKAR}/Adkr{i}.mp3" for i in range(39, 53)]
    if download_and_concat(
        os.path.join(SOUNDS_DIR, "adhkar", "sleep_full.mp3"),
        "sleep_full.mp3 (أذكار النوم كاملة)",
        sleep_urls
    ):
        success += 1
    else:
        failed += 1

    # ── Wakeup Adhkar ──
    print(f"\n{GREEN}📿 [3/5] Wakeup Adhkar{NC}")
    wakeup_urls = [f"{ARCHIVE_ADHKAR}/Adkr{i}.mp3" for i in range(1, 10)]
    if download_and_concat(
        os.path.join(SOUNDS_DIR, "adhkar", "wakeup_full.mp3"),
        "wakeup_full.mp3 (أذكار الاستيقاظ كاملة)",
        wakeup_urls
    ):
        success += 1
    else:
        failed += 1

    # ── After Prayer Adhkar ──
    print(f"\n{GREEN}📿 [4/5] After Prayer Adhkar{NC}")
    prayer_urls = [f"{ARCHIVE_ADHKAR}/Adkr{i}.mp3" for i in range(53, 65)]
    if download_and_concat(
        os.path.join(SOUNDS_DIR, "adhkar", "after_prayer_full.mp3"),
        "after_prayer_full.mp3 (أذكار بعد الصلاة كاملة)",
        prayer_urls
    ):
        success += 1
    else:
        failed += 1

    # ── UI Effects ──
    print(f"\n{GREEN}🎵 [5/5] UI Effect Sounds{NC}")
    effects_dir = os.path.join(SOUNDS_DIR, "effects")

    effects = [
        ("button_click.mp3", "نقر زر", [
            "-f", "lavfi", "-i", "sine=frequency=1200:duration=0.05",
            "-af", "afade=t=out:st=0.02:d=0.03,volume=0.5",
            "-ar", "44100", "-ac", "1", "-b:a", "64k"
        ]),
        ("success.mp3", "نجاح", [
            "-f", "lavfi", "-i", "sine=frequency=523:duration=0.35",
            "-f", "lavfi", "-i", "sine=frequency=784:duration=0.35",
            "-filter_complex", "[0:a][1:a]amix=inputs=2:duration=shortest,afade=t=out:st=0.21:d=0.14,volume=0.4",
            "-ar", "44100", "-ac", "1", "-b:a", "64k"
        ]),
        ("page_turn.mp3", "تقليب صفحة", [
            "-f", "lavfi", "-i", "sine=frequency=400:duration=0.12",
            "-af", "afade=t=out:st=0.04:d=0.08,volume=0.5",
            "-ar", "44100", "-ac", "1", "-b:a", "64k"
        ]),
        ("tasbih_click.mp3", "نقر تسبيح", [
            "-f", "lavfi", "-i", "sine=frequency=800:duration=0.08",
            "-af", "afade=t=out:st=0.03:d=0.05,volume=0.5",
            "-ar", "44100", "-ac", "1", "-b:a", "64k"
        ]),
        ("prayer_complete.mp3", "إتمام الصلاة", [
            "-f", "lavfi", "-i", "sine=frequency=440:duration=0.45",
            "-f", "lavfi", "-i", "sine=frequency=880:duration=0.45",
            "-filter_complex", "[0:a][1:a]amix=inputs=2:duration=shortest,afade=t=out:st=0.27:d=0.18,volume=0.4",
            "-ar", "44100", "-ac", "1", "-b:a", "64k"
        ]),
        ("quran_open.mp3", "فتح القرآن", [
            "-f", "lavfi", "-i", "sine=frequency=660:duration=0.2",
            "-af", "afade=t=out:st=0.05:d=0.15,volume=0.5",
            "-ar", "44100", "-ac", "1", "-b:a", "64k"
        ]),
    ]

    for fname, label, args in effects:
        if generate_ffmpeg(os.path.join(effects_dir, fname), f"{fname} ({label})", args):
            success += 1
        else:
            failed += 1

    # ── Summary ──
    print()
    print(f"{GREEN}══════════════════════════════════════════════════════════════{NC}")
    print(f"  {GREEN}✅ Success: {success}{NC}  |  {RED}❌ Failed: {failed}{NC}")
    print(f"{GREEN}══════════════════════════════════════════════════════════════{NC}")
    print()

    # Show files
    for d in ["adhkar", "effects"]:
        print(f"  {GREEN}{d}/{NC}")
        dirpath = os.path.join(SOUNDS_DIR, d)
        try:
            for f in sorted(os.listdir(dirpath)):
                if f.endswith(".mp3"):
                    sz = os.path.getsize(os.path.join(dirpath, f)) // 1024
                    print(f"    {f} ({sz}KB)")
        except FileNotFoundError:
            print("    (empty)")
        print()

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
