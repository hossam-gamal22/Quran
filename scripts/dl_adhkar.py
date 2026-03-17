#!/usr/bin/env python3
import urllib.request
import subprocess
import os
import tempfile
import shutil
import sys

sys.stdout.reconfigure(line_buffering=True)

SOUNDS = os.path.join(os.getcwd(), "assets", "sounds")
BASE1 = "https://archive.org/download/azkar-al-masa-1425"
BASE2 = "https://archive.org/download/Azaka.....Sabah....Wa....Masa.......MEShARyAZKARMP3"

def dl(url, dest, t=90):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=t) as r:
        d = r.read()
    with open(dest, "wb") as f:
        f.write(d)
    return len(d)

def concat(parts, out):
    fl = out + ".list"
    with open(fl, "w") as f:
        for p in parts:
            f.write("file '" + p + "'\n")
    subprocess.run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", fl, "-c", "copy", out], capture_output=True)
    os.unlink(fl)

def do_cat(name, dest, urls):
    if os.path.exists(dest) and os.path.getsize(dest) > 1000:
        print("  SKIP " + name)
        return
    print("  Downloading " + name + " (" + str(len(urls)) + " tracks)...")
    td = tempfile.mkdtemp()
    parts = []
    for i, url in enumerate(urls):
        p = os.path.join(td, "p" + str(i).zfill(3) + ".mp3")
        try:
            sz = dl(url, p)
            if sz > 500:
                parts.append(p)
                print("    Track " + str(i+1) + "/" + str(len(urls)) + ": " + str(sz // 1024) + "KB")
        except Exception as e:
            print("    Track " + str(i+1) + "/" + str(len(urls)) + ": FAILED (" + str(e)[:60] + ")")
    if parts:
        concat(parts, dest)
        print("  => " + name + ": " + str(os.path.getsize(dest) // 1024) + "KB (" + str(len(parts)) + " tracks)")
    shutil.rmtree(td, ignore_errors=True)

print("=== Evening Adhkar ===")
masa = [BASE1 + "/9-azkar-al-masa-1425-1-ayat-al-kursy.mp3"]
for i in range(2, 22):
    masa.append(BASE1 + "/9-azkar-al-masa-1425-" + str(i) + ".mp3")
do_cat("evening_full.mp3", os.path.join(SOUNDS, "adhkar", "evening_full.mp3"), masa)

print("")
print("=== Sleep Adhkar ===")
sleep_urls = []
for i in range(39, 53):
    sleep_urls.append(BASE2 + "/Adkr" + str(i) + ".mp3")
do_cat("sleep_full.mp3", os.path.join(SOUNDS, "adhkar", "sleep_full.mp3"), sleep_urls)

print("")
print("=== Wakeup Adhkar ===")
wake_urls = []
for i in range(1, 10):
    wake_urls.append(BASE2 + "/Adkr" + str(i) + ".mp3")
do_cat("wakeup_full.mp3", os.path.join(SOUNDS, "adhkar", "wakeup_full.mp3"), wake_urls)

print("")
print("=== After Prayer Adhkar ===")
pray_urls = []
for i in range(53, 65):
    pray_urls.append(BASE2 + "/Adkr" + str(i) + ".mp3")
do_cat("after_prayer_full.mp3", os.path.join(SOUNDS, "adhkar", "after_prayer_full.mp3"), pray_urls)

print("")
print("=== DONE ===")
