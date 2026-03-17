#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────
//  روح المسلم — Automated Daily Video Generator (Multi-Reciter)
//  Generates 5 "Ayah of the Day" videos (one per reciter) daily.
//  Maintains a rolling 7-day window — old videos auto-deleted.
//  Runs on GitHub Actions (ubuntu-latest with ffmpeg+drawtext).
// ─────────────────────────────────────────────────────────────────────

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');

// ─── Config ──────────────────────────────────────────────────────────

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/hossam-gamal22/Quran/main/public';

const FONT_PATH = path.join(__dirname, 'fonts', 'KFGQPC-Uthmanic-Script.ttf');
const REPO_ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(REPO_ROOT, 'public');
const OUTPUT_JSON = path.join(REPO_ROOT, 'data', 'daily-video.json');

const VIDEO_WIDTH = 1080;
const VIDEO_HEIGHT = 1920;
const VIDEO_FPS = 30;
const ROLLING_DAYS = 7;

// High-quality encoding constants
const VIDEO_CRF = 18;           // visually lossless
const VIDEO_PRESET = 'slow';    // better compression / detail retention
const VIDEO_PROFILE = 'high';   // H.264 High profile
const AUDIO_BITRATE = '192k';   // crystal-clear recitation

const RECITERS = [
  { id: 'ar.alafasy',             label: 'مشاري العفاسي',        labelEn: 'Mishary Alafasy' },
  { id: 'ar.abdulsamad',          label: 'عبدالباسط عبدالصمد',   labelEn: 'Abdul Basit' },
  { id: 'ar.abdurrahmaansudais',  label: 'عبدالرحمن السديس',     labelEn: 'Abdurrahman As-Sudais' },
  { id: 'ar.mahermuaiqly',        label: 'ماهر المعيقلي',        labelEn: 'Maher Al Muaiqly' },
  { id: 'ar.saoodshuraym',        label: 'سعود الشريم',          labelEn: 'Saud Ash-Shuraym' },
];

const PHOTO_SEARCH_TERMS = [
  'peaceful nature landscape',
  'calm ocean horizon',
  'beautiful sunrise sky',
  'serene mountain lake',
  'golden sunset clouds',
  'starry night sky',
  'green forest morning',
  'desert sand dunes',
  'lavender field',
  'tropical beach clear water',
];

// ─── Helpers ─────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function getDailyAyahNumber() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000);
  return (dayOfYear % 6236) + 1;
}

function escapeDrawtext(input) {
  return input
    .replace(/\\/g, '\\\\\\\\')
    .replace(/'/g, "'\\\\\\''")
    .replace(/:/g, '\\:')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/%/g, '%%');
}

function getAudioDuration(audioPath) {
  const raw = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`,
    { encoding: 'utf8', timeout: 10000 }
  ).trim();
  return parseFloat(raw);
}

function hasDrawtext() {
  try {
    const out = execSync('ffmpeg -filters 2>&1', { encoding: 'utf8', timeout: 5000 });
    return /\bdrawtext\b/.test(out);
  } catch {
    return false;
  }
}

/** Build video filename: video-YYYY-MM-DD-reciterID.mp4 */
function videoFilename(date, reciterId) {
  // ar.alafasy → alafasy
  const short = reciterId.replace(/^ar\./, '');
  return `video-${date}-${short}.mp4`;
}

/** GitHub raw URL for a video file */
function videoRawUrl(filename) {
  return `${GITHUB_RAW_BASE}/${filename}`;
}

// ─── Cleanup: delete videos older than ROLLING_DAYS ──────────────────

function cleanupOldVideos() {
  console.log('🗑️  Cleaning up videos older than 7 days...');
  if (!fs.existsSync(PUBLIC_DIR)) return;

  const cutoffDate = daysAgo(ROLLING_DAYS);
  const pattern = /^video-(\d{4}-\d{2}-\d{2})-.+\.mp4$/;
  let removed = 0;

  for (const file of fs.readdirSync(PUBLIC_DIR)) {
    const match = file.match(pattern);
    if (match && match[1] < cutoffDate) {
      fs.unlinkSync(path.join(PUBLIC_DIR, file));
      console.log(`   🗑️  Deleted ${file}`);
      removed++;
    }
  }

  // Also remove legacy today-video.mp4 if it exists
  const legacy = path.join(PUBLIC_DIR, 'today-video.mp4');
  if (fs.existsSync(legacy)) {
    fs.unlinkSync(legacy);
    console.log('   🗑️  Deleted legacy today-video.mp4');
    removed++;
  }

  console.log(`   ✅ Removed ${removed} old file(s)`);
}

// ─── Fetch Ayah ──────────────────────────────────────────────────────

async function fetchAyah() {
  const ayahNumber = getDailyAyahNumber();
  console.log(`📖 Fetching ayah #${ayahNumber}...`);

  const textRes = await axios.get(
    `https://api.alquran.cloud/v1/ayah/${ayahNumber}/quran-uthmani`
  );
  const textData = textRes.data.data;

  const result = {
    number: ayahNumber,
    text: textData.text,
    surahNumber: textData.surah.number,
    surahName: textData.surah.name,
    surahEnglish: textData.surah.englishName,
    ayahInSurah: textData.numberInSurah,
  };

  console.log(`   ✅ ${result.surahName} (${result.surahEnglish}), Ayah ${result.ayahInSurah}`);
  return result;
}

// ─── Fetch reciter audio ─────────────────────────────────────────────

async function fetchReciterAudio(ayahNumber, reciterId, tmpDir) {
  console.log(`   🔊 Downloading audio for ${reciterId}...`);
  const res = await axios.get(
    `https://api.alquran.cloud/v1/ayah/${ayahNumber}/${reciterId}`
  );
  const audioUrl = res.data.data.audio;

  const audioPath = path.join(tmpDir, `recitation-${reciterId.replace(/\./g, '-')}.mp3`);
  const audioRes = await axios.get(audioUrl, { responseType: 'arraybuffer' });
  fs.writeFileSync(audioPath, Buffer.from(audioRes.data));
  console.log(`      💾 Saved (${(audioRes.data.byteLength / 1024).toFixed(0)} KB)`);
  return audioPath;
}

// ─── Fetch Nature Image ──────────────────────────────────────────────

async function fetchNatureImage(tmpDir) {
  console.log('🖼️  Fetching nature image from Pexels...');
  if (!PEXELS_API_KEY) throw new Error('PEXELS_API_KEY is not set');

  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  const searchTerm = PHOTO_SEARCH_TERMS[dayOfYear % PHOTO_SEARCH_TERMS.length];

  const response = await axios.get('https://api.pexels.com/v1/search', {
    headers: { Authorization: PEXELS_API_KEY },
    params: {
      query: searchTerm + ' no people no animals',
      orientation: 'portrait',
      per_page: 15,
      page: 1,
    },
  });

  const photos = response.data.photos;
  if (!photos?.length) throw new Error(`No Pexels photos for: "${searchTerm}"`);

  const photo = photos[dayOfYear % photos.length];
  console.log(`   ✅ Photo #${photo.id} by ${photo.photographer}`);

  const imgPath = path.join(tmpDir, 'background.jpg');
  const imgResponse = await axios.get(photo.src.portrait, { responseType: 'arraybuffer' });
  fs.writeFileSync(imgPath, Buffer.from(imgResponse.data));
  return imgPath;
}

// ─── Compose Video ───────────────────────────────────────────────────

function composeVideo(imagePath, audioPath, ayah, reciter, outputPath) {
  const duration = getAudioDuration(audioPath);
  const totalFrames = Math.ceil(duration * VIDEO_FPS);
  console.log(`      ⏳ Audio: ${duration.toFixed(2)}s (${totalFrames} frames @ ${VIDEO_FPS}fps)`);
  console.log(`      🎬 Encoding: CRF ${VIDEO_CRF}, preset ${VIDEO_PRESET}, profile ${VIDEO_PROFILE}`);

  const useText = hasDrawtext();
  const fontEsc = FONT_PATH.replace(/:/g, '\\:').replace(/'/g, "\\'");

  // ── Color grading: subtle sharpening + contrast/saturation pop ──
  // unsharp=lx:ly:la  → luma sharpen (5x5 matrix, strength 0.5)
  // eq=contrast:brightness:saturation → slight boost
  const colorGrade = 'unsharp=5:5:0.5:5:5:0.0,eq=contrast=1.05:brightness=0.02:saturation=1.15';

  let filterComplex;

  if (useText && fs.existsSync(FONT_PATH)) {
    const ayahText = escapeDrawtext(ayah.text);
    const refText = escapeDrawtext(`${ayah.surahName} ﴿${ayah.ayahInSurah}﴾`);
    const reciterText = escapeDrawtext(reciter.label);
    const brandText = escapeDrawtext('روح المسلم');

    filterComplex = [
      // Scale up → crop → Ken Burns zoom → color grade
      `[0:v]scale=${VIDEO_WIDTH * 2}:${VIDEO_HEIGHT * 2},` +
        `crop=${VIDEO_WIDTH}:${VIDEO_HEIGHT},` +
        `zoompan=z='min(zoom+0.0015\\,1.5)':` +
        `x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':` +
        `d=${totalFrames}:s=${VIDEO_WIDTH}x${VIDEO_HEIGHT}:fps=${VIDEO_FPS},` +
        `${colorGrade}[zoomed]`,

      `[zoomed]drawbox=x=0:y=ih*0.45:w=iw:h=ih*0.55:color=black@0.55:t=fill[grad]`,

      // Ayah text
      `[grad]drawtext=fontfile='${fontEsc}':` +
        `text='${ayahText}':` +
        `fontcolor=white:fontsize=50:` +
        `x=(w-text_w)/2:y=h*0.52:` +
        `line_spacing=18[withAyah]`,

      // Surah reference
      `[withAyah]drawtext=fontfile='${fontEsc}':` +
        `text='${refText}':` +
        `fontcolor=white@0.85:fontsize=32:` +
        `x=(w-text_w)/2:y=h*0.78[withRef]`,

      // Reciter name
      `[withRef]drawtext=fontfile='${fontEsc}':` +
        `text='${reciterText}':` +
        `fontcolor=white@0.7:fontsize=28:` +
        `x=(w-text_w)/2:y=h*0.85[withReciter]`,

      // App branding
      `[withReciter]drawtext=fontfile='${fontEsc}':` +
        `text='${brandText}':` +
        `fontcolor=white@0.5:fontsize=24:` +
        `x=(w-text_w)/2:y=h*0.94[vout]`,
    ].join(';');
  } else {
    console.log('      ⚠️  drawtext not available — video without text overlay');
    filterComplex = [
      `[0:v]scale=${VIDEO_WIDTH * 2}:${VIDEO_HEIGHT * 2},` +
        `crop=${VIDEO_WIDTH}:${VIDEO_HEIGHT},` +
        `zoompan=z='min(zoom+0.0015\\,1.5)':` +
        `x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':` +
        `d=${totalFrames}:s=${VIDEO_WIDTH}x${VIDEO_HEIGHT}:fps=${VIDEO_FPS},` +
        `${colorGrade}[zoomed]`,

      `[zoomed]drawbox=x=0:y=ih*0.45:w=iw:h=ih*0.55:color=black@0.55:t=fill[vout]`,
    ].join(';');
  }

  const cmd = [
    'ffmpeg', '-y',
    '-loop', '1', '-i', `"${imagePath}"`,
    '-i', `"${audioPath}"`,
    '-filter_complex', `"${filterComplex}"`,
    '-map', '[vout]', '-map', '1:a:0',
    '-c:v', 'libx264',
    '-profile:v', VIDEO_PROFILE,
    '-crf', String(VIDEO_CRF),
    '-preset', VIDEO_PRESET,
    '-pix_fmt', 'yuv420p',
    '-r', String(VIDEO_FPS),
    '-c:a', 'aac', '-b:a', AUDIO_BITRATE,
    '-shortest',
    '-movflags', '+faststart',
    `"${outputPath}"`,
  ].join(' ');

  try {
    // 10-minute timeout per video (slow preset takes longer)
    execSync(cmd, { stdio: ['pipe', 'pipe', 'pipe'], timeout: 600000, maxBuffer: 50 * 1024 * 1024 });
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString().slice(-1000) : 'no stderr';
    throw new Error(`FFmpeg failed for ${reciter.id}:\n${stderr}`);
  }

  if (!fs.existsSync(outputPath)) throw new Error(`FFmpeg produced no output for ${reciter.id}`);

  const sizeMB = (fs.statSync(outputPath).size / (1024 * 1024)).toFixed(2);
  console.log(`      ✅ ${sizeMB} MB (${duration.toFixed(1)}s)`);
  return duration;
}

// ─── Build / update rolling JSON ─────────────────────────────────────

function updateRollingJson(ayah, date, videoResults) {
  const dir = path.dirname(OUTPUT_JSON);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Load existing JSON (rolling data by date)
  let existing = {};
  if (fs.existsSync(OUTPUT_JSON)) {
    try {
      existing = JSON.parse(fs.readFileSync(OUTPUT_JSON, 'utf8'));
    } catch {
      existing = {};
    }
  }

  // Build today's entry
  const cutoffDate = daysAgo(ROLLING_DAYS);
  const todayEntry = {
    ayahText: ayah.text,
    surahName: ayah.surahName,
    surahEnglish: ayah.surahEnglish,
    surahNumber: ayah.surahNumber,
    ayahNumber: ayah.ayahInSurah,
    globalAyahNumber: ayah.number,
    generatedAt: new Date().toISOString(),
    videos: videoResults.map((v) => ({
      reciterId: v.reciterId,
      reciterLabel: v.reciterLabel,
      reciterLabelEn: v.reciterLabelEn,
      url: v.url,
      duration: v.duration,
    })),
  };

  existing[date] = todayEntry;

  // Prune entries older than 7 days
  for (const key of Object.keys(existing)) {
    if (key < cutoffDate) {
      delete existing[key];
    }
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(existing, null, 2) + '\n');
  console.log(`📄 Wrote data/daily-video.json (${Object.keys(existing).length} day(s))`);
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  روح المسلم — Daily Video Generator (5 Reciters)');
  console.log('══════════════════════════════════════════════════\n');

  const date = todayStr();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daily-video-'));

  try {
    // 1. Cleanup old videos
    cleanupOldVideos();

    // 2. Fetch today's ayah text
    const ayah = await fetchAyah();

    // 3. Fetch background image (shared for all reciters)
    const imagePath = await fetchNatureImage(tmpDir);

    // 4. Ensure public/ exists
    if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });

    // 5. Generate one video per reciter
    const videoResults = [];

    for (const reciter of RECITERS) {
      console.log(`\n🎬 Generating video for ${reciter.label} (${reciter.id})...`);
      try {
        const audioPath = await fetchReciterAudio(ayah.number, reciter.id, tmpDir);
        const filename = videoFilename(date, reciter.id);
        const outputPath = path.join(PUBLIC_DIR, filename);

        const duration = composeVideo(imagePath, audioPath, ayah, reciter, outputPath);

        videoResults.push({
          reciterId: reciter.id,
          reciterLabel: reciter.label,
          reciterLabelEn: reciter.labelEn,
          url: videoRawUrl(filename),
          duration,
        });
      } catch (err) {
        console.error(`   ❌ Failed for ${reciter.id}: ${err.message}`);
        // Continue with other reciters
      }
    }

    // 6. Update rolling JSON
    updateRollingJson(ayah, date, videoResults);

    console.log('\n══════════════════════════════════════════════════');
    console.log(`  ✅ Done! ${ayah.surahName} — Ayah ${ayah.ayahInSurah}`);
    console.log(`  📹 ${videoResults.length}/${RECITERS.length} videos generated`);
    console.log(`  📅 Date: ${date}`);
    console.log('══════════════════════════════════════════════════\n');
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}

main().catch((err) => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
