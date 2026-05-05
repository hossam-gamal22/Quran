# Full-length Adhan Recordings

Place full-length (3–5 min) adhan MP3 files here. The Expo config plugin
[`plugins/with-android-full-adhan.js`](../../../plugins/with-android-full-adhan.js)
will copy them into `android/app/src/main/res/raw/` with the prefix
`adhan_full_*` during `expo prebuild` and the foreground media service
`AdhanPlaybackService` will play them at prayer time on Android when the user
enables **Settings → Notifications → "تشغيل الأذان الكامل"** (Use Full Adhan).
On iOS, the same files are bundled via `app.json` and the system will cut the
notification sound automatically after ~29 seconds.

## Required filenames

Drop one MP3 per muezzin. Files are currently stored with unique `adhan_full_`
prefixes so iOS does not conflict with the short clips in `assets/sounds/`:

| Filename | Muezzin / Source |
| -------- | ---------------- |
| `adhan_full_makkah.mp3` | الحرم المكي |
| `adhan_full_madinah.mp3` | المسجد النبوي |
| `adhan_full_alaqsa.mp3` | المسجد الأقصى |
| `adhan_full_mishary.mp3` | مشاري راشد العفاسي |
| `adhan_full_abdulbasit.mp3` | عبد الباسط عبد الصمد |
| `adhan_full_sudais.mp3` | عبد الرحمن السديس |
| `adhan_full_egypt.mp3` | الأذان المصري |
| `adhan_full_dosari.mp3` | ياسر الدوسري |
| `adhan_full_ajman.mp3` | أحمد العجمي |
| `adhan_full_ali_mulla.mp3` | علي ملا |
| `adhan_full_naqshbandi.mp3` | محمد النقشبندي |
| `adhan_full_sharif.mp3` | الشيخ الشريف |
| `adhan_full_mansoor_zahrani.mp3` | منصور الزهراني |
| `adhan_full_haramain.mp3` | الحرمين الشريفين |

## Recommended sources (open / public-domain)

- [archive.org — "Adhan" collections](https://archive.org/search?query=adhan)
  — search by muezzin name; filter by Audio.
- [islamcan.com/audio/adhan](https://www.islamcan.com/audio/adhan/) — direct
  MP3 downloads, free for personal/app use.
- [aladhan.com CDN](https://cdn.aladhan.com/) — used by app for previews.

## Encoding guidelines

All shipped files are **trimmed to a 35-second hard cap** with a 2-second
fade-out (33s → 35s) and re-encoded as **mono, 96 kbps MP3** to keep bundle
size small and match notification-playback constraints (iOS auto-cuts custom
notification sounds at ~29-30s; Android plays the full 35s via the foreground
service). Original durations and source URLs are tracked in
[`source-map.json`](./source-map.json).

- **Format:** MP3, 96 kbps, mono
- **Duration:** ≤ 35 s (hard cap)
- **Fade-out:** linear, 33–35 s (`afade=t=out:st=33:d=2`)
- **Per-file size:** ~400–650 KB
- **Total bundle impact:** ~7 MB for 14 files

```bash
# Trim + re-encode any new full adhan to match shipped files:
ffmpeg -y -i raw_adhan_makkah.mp3 -t 35 -ac 1 -b:a 96k \
  -af "afade=t=out:st=33:d=2" adhan_full_makkah.mp3
```

## Testing locally

```bash
# After dropping files in this directory:
pnpm expo prebuild --clean
pnpm android
# In app: Settings → Notifications → toggle "تشغيل الأذان الكامل"
# Android: set adhan time 1 min in future, lock device, wait for full playback.
# iOS: the notification sound will start then the OS will stop it after ~29s.
```

## Fallback behavior

If a file is missing for a given muezzin key, `AdhanPlaybackService.kt`
(`resolveAdhanResource`) falls back in this order:

1. `adhan_full_<key>` (preferred — full recording)
2. `adhan_full_makkah` (Makkah full as universal fallback)
3. `<key>` (the short ~30s clip from `assets/sounds/`)
4. `R.raw.makkah` (ultimate fallback)

## In-app preview map

The in-app **preview** button on Settings → Notifications uses short clips
from `assets/sounds/*.mp3`. There is no need to register the full-adhan
files anywhere in JS — the native service loads them by Android resource
name (`adhan_full_<key>`) at runtime.
