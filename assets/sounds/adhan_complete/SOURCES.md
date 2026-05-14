# Complete Adhan Audio — Sources Manifest

This folder bundles 5 REAL complete adhan recordings (≈ 2–4 min each) used by the
in-app Full Adhan Player screen (`app/full-adhan.tsx`). These files are
DIFFERENT from `assets/sounds/adhan_full/` which holds the 29–35 second
notification-cap recordings used as system notification sounds.

The exact originally requested named voices (Makkah, Madinah, Al-Aqsa, Mishary,
Abdul Basit) were not bundled unless a clear file-level license could be
verified. The current files are legally documented replacement recordings kept
under the same five technical voice keys for compatibility with notification
settings.

## Hard rules

1. **Never** drop the 35-second notification-cap files in here. The verification
   script (`scripts/verify-adhan-assets.js`) blocks the build if SHA256 matches.
2. **Never** loop, repeat, or extend a short file to fake a complete recording.
3. **Never** generate the transcript timings by formula. Option A timings
   (future PR) must be authored by listening to each MP3.
4. Every file MUST be documented in the table below. The verification script
   parses this manifest to validate checksums.

## Manifest

| Voice Key | Display Name (Arabic) | File | Source URL | Author / Uploader | License / Usage Permission | Original Duration (mm:ss) | Final Duration (mm:ss) | File Size | SHA256 | Contains "الصلاة خير من النوم" | Attribution Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `makkah` | أذان الحرم المكي | `adhan_makkah_full.mp3` | maintainer-provided local replacement | unknown | pending maintainer-supplied permission; verify before distribution | 4:08 | 4:08 | 3,974,636 bytes | fb199761620ea19216a46621f1a823d21948228ef8137b0b70ece2afd2c2312d | no | User-provided replacement for the previous duplicate Makkah audio. Public source URL and license still need maintainer confirmation. |
| `madinah` | أذان الحرم النبوي | `adhan_madinah_full.mp3` | https://commons.wikimedia.org/wiki/File:33937_ejaz215_call-to-prayer-from-the-prophet-s-mo.ogg | ejaz215; uploaded to Commons by Nater | CC BY 3.0 Unported; attribution required | 3:07 | 3:07 | 2,240,096 bytes | 8fa21931149becd5c92737e45553f017ea643300455a3a4122668c970df270e3 | no | Source describes Prophet's Mosque call to prayer. Re-encoded from Wikimedia Commons MP3 transcode to 96 kbps mono; attribute ejaz215. |
| `al_aqsa` | أذان المسجد الأقصى | `adhan_al_aqsa_full.mp3` | https://commons.wikimedia.org/wiki/File:AzaanMaahur.ogg | Saeed Hatamzadeh-Varmazyar | CC BY-SA 4.0; attribution and share-alike obligations apply | 2:48 | 2:45 | 1,978,035 bytes | 05290453228978f45b14d604f631d95d269e86f80b9e7f1ddbfe285f2ca87a4e | no | Re-encoded from Wikimedia Commons MP3 transcode to 96 kbps mono, then first 3 seconds removed; attribute Saeed Hatamzadeh-Varmazyar. |
| `mishary` | الأذان بصوت مشاري العفاسي | `adhan_mishary_full.mp3` | https://commons.wikimedia.org/wiki/File:Azan.ogg | Andrewler | CC BY-SA 4.0; attribution and share-alike obligations apply | 3:03 | 3:03 | 2,202,793 bytes | 6536c6fabd45e96f51c478e42141dbdd84776fa80af1353744fab846372e6f7d | no | Re-encoded from Wikimedia Commons MP3 transcode to 96 kbps mono; attribute Andrewler. |
| `abdulbasit` | الأذان بصوت عبد الباسط عبد الصمد | `adhan_abdulbasit_full.mp3` | https://commons.wikimedia.org/wiki/File:Adhan_in_Shalqar_mosque.webm | Esetok | CC BY-SA 4.0; attribution and share-alike obligations apply | 2:35 | 2:11 | 1,572,719 bytes | 1dd8d9b2168fae1e21e32d0c92ef2db326414c33f7bcd00c918d94c5975719f3 | no | Audio extracted from Wikimedia Commons WebM transcode, converted to 96 kbps mono MP3, trimmed from 00:03 through 02:14 original timeline; attribute Esetok. |
| `fajr` | أذان الفجر المخصص | `adhan_fajr_full.mp3` | maintainer-provided local file | unknown | pending maintainer-supplied permission; verify before distribution | 3:49 | 3:49 | 3,677,361 bytes | 4dfbd9d8c848f5c9918b92dd7fb41cdd14f6bbc710a7bf65e5903a55e2503ba3 | yes | Dedicated Fajr audio. When prayer is Fajr, this file is used instead of the selected normal voice so the transcript can include "الصلاة خير من النوم". Public source URL and license still need maintainer confirmation. |

## How to source files

- **Makkah / Madinah:** official Haramain (General Presidency for the Affairs
  of the Two Holy Mosques) public broadcast recordings. Confirm distribution
  rights — many recordings are public-domain or freely redistributable when
  attribution is given.
- **Al-Aqsa:** Awqaf Department of Jerusalem broadcasts. Verify license before
  bundling.
- **Mishary Al-Afasy:** licensed releases or recordings explicitly cleared for
  redistribution. The official site / authorized distributors are the safe
  sources.
- **Abdul Basit Abdul Samad:** many recordings are in the public domain by age,
  but verify the specific recording you choose.

## Encoding requirements

- MP3, 96–128 kbps, mono
- Normalized loudness (~-16 LUFS)
- ≤ 500 ms silence at start and end (trim cleanly — proportional sync is NOT
  used in v1, but uneven silence still hurts the listening experience)
- File size: 500 KB – 6 MB per file

## How to compute SHA256

From the repo root:

```bash
shasum -a 256 assets/sounds/adhan_complete/*.mp3
```

Paste the hash into the SHA256 column above.

## Fajr phrase column

Set `Contains "الصلاة خير من النوم"` to `yes` only if the recording AUDIBLY
contains that phrase. The full-adhan transcript file (`data/adhan-transcript.ts`)
reads `VOICE_HAS_FAJR_PHRASE` to decide whether to show the Fajr extra phrase.
If the audio doesn't say it, we don't show it — the sacred text is never shown
out of sync with the muezzin.
