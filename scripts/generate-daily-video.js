#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────
//  روح المسلم — Automated Daily Video Generator
//  Generates a 15-second "Ayah of the Day" vertical video daily.
//  Runs on GitHub Actions (ubuntu-latest with ffmpeg pre-installed).
//
//  Output:
//    public/today-video.mp4  → committed to main branch
//    data/daily-video.json   → committed to main branch
//
//  Static URL:
//    https://raw.githubusercontent.com/hossam-gamal22/Quran/main/public/today-video.mp4
// ─────────────────────────────────────────────────────────────────────

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');

// ─── Configuration ───────────────────────────────────────────────────

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
// Static raw URL for the video (main branch, public/ folder)
const VIDEO_RAW_URL = 'https://raw.githubusercontent.com/hossam-gamal22/Quran/main/public/today-video.mp4';

const FONT_PATH = path.join(__dirname, 'fonts', 'Amiri-Regular.ttf');
const REPO_ROOT = path.join(__dirname, '..');
const OUTPUT_VIDEO = path.join(REPO_ROOT, 'public', 'today-video.mp4');
const OUTPUT_JSON = path.join(REPO_ROOT, 'data', 'daily-video.json');

const VIDEO_WIDTH = 1080;
const VIDEO_HEIGHT = 1920;
const VIDEO_DURATION = 15; // seconds
const VIDEO_FPS = 25;

// Nature-only search terms — explicitly exclude humans/animals
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

const CONTENT_EXCLUSION = ' no people no animals no faces no humans';

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Deterministic daily ayah number (same formula as lib/api/quran-cloud-api.ts).
 * Cycles through all 6236 Quran verses based on day of year.
 */
function getDailyAyahNumber() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return (dayOfYear % 6236) + 1;
}

/**
 * Escape text for FFmpeg drawtext filter.
 * Handles Arabic text, colons, brackets, percent signs.
 */
function escapeDrawtext(input) {
  return input
    .replace(/\\/g, '\\\\\\\\')
    .replace(/'/g, "'\\\\\\''")
    .replace(/:/g, '\\:')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/%/g, '%%');
}

/** Today's date in YYYY-MM-DD (UTC). */
function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

/** Return the static GitHub raw URL for the video. */
function buildVideoUrl() {
  return VIDEO_RAW_URL;
}

// ─── Stage 1: Fetch Ayah ─────────────────────────────────────────────

async function fetchAyah() {
  const ayahNumber = getDailyAyahNumber();
  console.log(`📖 Fetching ayah #${ayahNumber}...`);

  const [textRes, audioRes] = await Promise.all([
    axios.get(`https://api.alquran.cloud/v1/ayah/${ayahNumber}/quran-uthmani`),
    axios.get(`https://api.alquran.cloud/v1/ayah/${ayahNumber}/ar.alafasy`),
  ]);

  const textData = textRes.data.data;
  const audioData = audioRes.data.data;

  const result = {
    number: ayahNumber,
    text: textData.text,
    audioUrl: audioData.audio,
    surahNumber: textData.surah.number,
    surahName: textData.surah.name,
    surahEnglish: textData.surah.englishName,
    ayahInSurah: textData.numberInSurah,
  };

  console.log(`   ✅ ${result.surahName} (${result.surahEnglish}), Ayah ${result.ayahInSurah}`);
  console.log(`   📝 ${result.text.slice(0, 80)}...`);
  return result;
}

// ─── Stage 2: Fetch Nature Image ─────────────────────────────────────

async function fetchNatureImage(tmpDir) {
  console.log('🖼️  Fetching nature image from Pexels...');

  if (!PEXELS_API_KEY) throw new Error('PEXELS_API_KEY is not set');

  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  const searchTerm = PHOTO_SEARCH_TERMS[dayOfYear % PHOTO_SEARCH_TERMS.length];
  const query = searchTerm + CONTENT_EXCLUSION;

  console.log(`   🔍 Search: "${searchTerm}"`);

  const response = await axios.get('https://api.pexels.com/v1/search', {
    headers: { Authorization: PEXELS_API_KEY },
    params: { query, orientation: 'portrait', per_page: 15, page: 1 },
  });

  const photos = response.data.photos;
  if (!photos || photos.length === 0) {
    throw new Error(`No Pexels photos found for: "${query}"`);
  }

  const photo = photos[dayOfYear % photos.length];
  console.log(`   ✅ Photo #${photo.id} by ${photo.photographer}`);

  const imgPath = path.join(tmpDir, 'background.jpg');
  const imgResponse = await axios.get(photo.src.portrait, { responseType: 'arraybuffer' });
  fs.writeFileSync(imgPath, Buffer.from(imgResponse.data));

  console.log(`   💾 Saved (${(imgResponse.data.byteLength / 1024).toFixed(0)} KB)`);
  return imgPath;
}

// ─── Stage 3: Download Audio ─────────────────────────────────────────

async function downloadAudio(audioUrl, tmpDir) {
  console.log('🔊 Downloading Mishary Al-Afasy recitation...');
  console.log(`   📡 ${audioUrl}`);

  const audioPath = path.join(tmpDir, 'recitation.mp3');
  const response = await axios.get(audioUrl, { responseType: 'arraybuffer' });
  fs.writeFileSync(audioPath, Buffer.from(response.data));

  console.log(`   💾 Saved (${(response.data.byteLength / 1024).toFixed(0)} KB)`);
  return audioPath;
}

// ─── Stage 4: Compose Video with FFmpeg ──────────────────────────────

/**
 * Check if ffmpeg has the drawtext filter (requires libfreetype).
 * Ubuntu CI always has it; macOS Homebrew may not.
 */
function hasDrawtext() {
  try {
    const out = execSync('ffmpeg -filters 2>&1', { encoding: 'utf8', timeout: 5000 });
    return /\bdrawtext\b/.test(out);
  } catch { return false; }
}

function composeVideo(imagePath, audioPath, ayah, tmpDir) {
  console.log('🎬 Composing video with FFmpeg...');

  const outputPath = path.join(tmpDir, 'output.mp4');
  const totalFrames = VIDEO_DURATION * VIDEO_FPS;
  const useText = hasDrawtext();

  if (useText && !fs.existsSync(FONT_PATH)) {
    throw new Error(`Font not found at ${FONT_PATH}`);
  }

  let filterComplex;

  if (useText) {
    // Full filter chain with text overlays (CI / Ubuntu)
    const fontEsc = FONT_PATH.replace(/:/g, '\\:').replace(/'/g, "\\'");
    const ayahText = escapeDrawtext(ayah.text);
    const refText = escapeDrawtext(`${ayah.surahName} ﴿${ayah.ayahInSurah}﴾`);

    filterComplex = [
      `[0:v]scale=${VIDEO_WIDTH * 2}:${VIDEO_HEIGHT * 2},` +
      `crop=${VIDEO_WIDTH}:${VIDEO_HEIGHT},` +
      `zoompan=z='min(zoom+0.0004\\,1.15)':` +
      `x='iw/2-(iw/zoom/2)':` +
      `y='ih/2-(ih/zoom/2)':` +
      `d=${totalFrames}:s=${VIDEO_WIDTH}x${VIDEO_HEIGHT}:fps=${VIDEO_FPS}[zoomed]`,

      `[zoomed]drawbox=x=0:y=ih*0.55:w=iw:h=ih*0.45:color=black@0.55:t=fill[grad]`,

      `[grad]drawtext=fontfile='${fontEsc}':` +
      `text='${ayahText}':` +
      `fontcolor=white:fontsize=52:` +
      `x=(w-text_w)/2:y=h*0.62:` +
      `line_spacing=16[withAyah]`,

      `[withAyah]drawtext=fontfile='${fontEsc}':` +
      `text='${refText}':` +
      `fontcolor=white@0.85:fontsize=34:` +
      `x=(w-text_w)/2:y=h*0.82[withRef]`,

      `[withRef]drawtext=fontfile='${fontEsc}':` +
      `text='${escapeDrawtext('روح المسلم')}':` +
      `fontcolor=white@0.5:fontsize=24:` +
      `x=(w-text_w)/2:y=h*0.94[vout]`,
    ].join(';');
  } else {
    // Fallback: no drawtext (macOS without freetype) — image + audio + zoom + dark overlay
    console.log('   ⚠️  drawtext not available — generating video without text overlay');
    filterComplex = [
      `[0:v]scale=${VIDEO_WIDTH * 2}:${VIDEO_HEIGHT * 2},` +
      `crop=${VIDEO_WIDTH}:${VIDEO_HEIGHT},` +
      `zoompan=z='min(zoom+0.0004\\,1.15)':` +
      `x='iw/2-(iw/zoom/2)':` +
      `y='ih/2-(ih/zoom/2)':` +
      `d=${totalFrames}:s=${VIDEO_WIDTH}x${VIDEO_HEIGHT}:fps=${VIDEO_FPS}[zoomed]`,

      `[zoomed]drawbox=x=0:y=ih*0.55:w=iw:h=ih*0.45:color=black@0.55:t=fill[vout]`,
    ].join(';');
  }

  const args = [
    'ffmpeg', '-y',
    '-loop', '1', '-i', imagePath,
    '-i', audioPath,
    '-filter_complex', filterComplex,
    '-map', '[vout]', '-map', '1:a:0',
    '-c:v', 'libx264', '-preset', 'medium',
    '-profile:v', 'high', '-pix_fmt', 'yuv420p',
    '-tune', 'stillimage',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '44100',
    '-t', String(VIDEO_DURATION),
    '-movflags', '+faststart',
    outputPath,
  ];

  const command = args.map(a => {
    if (a.includes(' ') || a.includes("'") || a.includes(';') || a.includes('\\')) {
      return `"${a}"`;
    }
    return a;
  }).join(' ');

  console.log('   ⏳ Rendering (this may take 30-60 seconds)...');

  try {
    execSync(command, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 300000,
      maxBuffer: 50 * 1024 * 1024,
    });
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString().slice(-1000) : 'no stderr';
    throw new Error(`FFmpeg failed:\n${stderr}`);
  }

  if (!fs.existsSync(outputPath)) {
    throw new Error('FFmpeg produced no output file');
  }

  const sizeMB = (fs.statSync(outputPath).size / (1024 * 1024)).toFixed(2);
  console.log(`   ✅ Video rendered: ${sizeMB} MB`);
  return outputPath;
}

// ─── Stage 5: Copy to public/ ────────────────────────────────────────

function copyToPublic(videoPath) {
  console.log('📦 Copying video to public/today-video.mp4...');

  const publicDir = path.dirname(OUTPUT_VIDEO);
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  fs.copyFileSync(videoPath, OUTPUT_VIDEO);

  const sizeMB = (fs.statSync(OUTPUT_VIDEO).size / (1024 * 1024)).toFixed(2);
  console.log(`   ✅ Saved (${sizeMB} MB)`);
  return OUTPUT_VIDEO;
}

// ─── Stage 6: Write Output JSON ──────────────────────────────────────

function writeOutputJson(ayah, dateStr) {
  console.log('📄 Writing data/daily-video.json...');

  const dataDir = path.dirname(OUTPUT_JSON);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const videoUrl = buildVideoUrl();

  const output = {
    url: videoUrl,
    date: dateStr,
    ayahText: ayah.text,
    surahName: ayah.surahName,
    surahEnglish: ayah.surahEnglish,
    surahNumber: ayah.surahNumber,
    ayahNumber: ayah.ayahInSurah,
    globalAyahNumber: ayah.number,
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(output, null, 2) + '\n');
  console.log(`   ✅ URL → ${videoUrl}`);
  return output;
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  const dateStr = todayUTC();

  console.log('');
  console.log('══════════════════════════════════════════════════');
  console.log('  روح المسلم — Daily Video Generator');
  console.log(`  Date: ${dateStr}`);
  console.log('══════════════════════════════════════════════════');
  console.log('');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daily-video-'));
  console.log(`📁 Temp: ${tmpDir}\n`);

  try {
    const ayah = await fetchAyah();
    console.log('');

    const imagePath = await fetchNatureImage(tmpDir);
    console.log('');

    const audioPath = await downloadAudio(ayah.audioUrl, tmpDir);
    console.log('');

    const videoPath = composeVideo(imagePath, audioPath, ayah, tmpDir);
    console.log('');

    copyToPublic(videoPath);
    console.log('');

    const output = writeOutputJson(ayah, dateStr);
    console.log('');

    console.log('══════════════════════════════════════════════════');
    console.log('  ✅ Daily video generated successfully!');
    console.log(`  📹 ${output.url}`);
    console.log(`  📖 ${ayah.surahName} — Ayah ${ayah.ayahInSurah}`);
    console.log('══════════════════════════════════════════════════\n');

  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      console.log('🧹 Temp files cleaned up');
    } catch { /* best effort */ }
  }
}

main().catch((err) => {
  console.error('\n❌ Fatal error:', err.message, '\n');
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
