#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────
//  روح المسلم — Automated Daily Video Generator
//  Generates an "Ayah of the Day" vertical video (duration = recitation length).
//  Text overlaid with KFGQPC Uthmanic Script font.
//  Runs on GitHub Actions (ubuntu-latest with ffmpeg+drawtext).
// ─────────────────────────────────────────────────────────────────────

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const VIDEO_RAW_URL = 'https://raw.githubusercontent.com/hossam-gamal22/Quran/main/public/today-video.mp4';

const FONT_PATH = path.join(__dirname, 'fonts', 'KFGQPC-Uthmanic-Script.ttf');
const REPO_ROOT = path.join(__dirname, '..');
const OUTPUT_VIDEO = path.join(REPO_ROOT, 'public', 'today-video.mp4');
const OUTPUT_JSON = path.join(REPO_ROOT, 'data', 'daily-video.json');

const VIDEO_WIDTH = 1080;
const VIDEO_HEIGHT = 1920;
const VIDEO_FPS = 25;

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

/** Get audio duration in seconds via ffprobe */
function getAudioDuration(audioPath) {
  const raw = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`,
    { encoding: 'utf8', timeout: 10000 }
  ).trim();
  return parseFloat(raw);
}

/** Check if ffmpeg has drawtext filter */
function hasDrawtext() {
  try {
    const out = execSync('ffmpeg -filters 2>&1', { encoding: 'utf8', timeout: 5000 });
    return /\bdrawtext\b/.test(out);
  } catch { return false; }
}

// ─── Fetch Ayah ──────────────────────────────────────────────────────

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
  return result;
}

// ─── Fetch Nature Image ──────────────────────────────────────────────

async function fetchNatureImage(tmpDir) {
  console.log('🖼️  Fetching nature image from Pexels...');
  if (!PEXELS_API_KEY) throw new Error('PEXELS_API_KEY is not set');

  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const searchTerm = PHOTO_SEARCH_TERMS[dayOfYear % PHOTO_SEARCH_TERMS.length];

  const response = await axios.get('https://api.pexels.com/v1/search', {
    headers: { Authorization: PEXELS_API_KEY },
    params: { query: searchTerm + ' no people no animals', orientation: 'portrait', per_page: 15, page: 1 },
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

// ─── Download Audio ──────────────────────────────────────────────────

async function downloadAudio(audioUrl, tmpDir) {
  console.log(`🔊 Downloading recitation...`);
  const audioPath = path.join(tmpDir, 'recitation.mp3');
  const response = await axios.get(audioUrl, { responseType: 'arraybuffer' });
  fs.writeFileSync(audioPath, Buffer.from(response.data));
  console.log(`   💾 Saved (${(response.data.byteLength / 1024).toFixed(0)} KB)`);
  return audioPath;
}

// ─── Compose Video ───────────────────────────────────────────────────

function composeVideo(imagePath, audioPath, ayah, tmpDir) {
  console.log('🎬 Composing video...');

  const outputPath = path.join(tmpDir, 'output.mp4');

  // Use actual audio duration so video matches recitation exactly
  const duration = getAudioDuration(audioPath);
  const totalFrames = Math.ceil(duration * VIDEO_FPS);
  console.log(`   ⏳ Audio duration: ${duration.toFixed(2)}s (${totalFrames} frames)`);

  const useText = hasDrawtext();
  const fontEsc = FONT_PATH.replace(/:/g, '\\:').replace(/'/g, "\\'");

  let filterComplex;

  if (useText && fs.existsSync(FONT_PATH)) {
    // Full text overlay — works on GitHub Actions (Ubuntu with libfreetype)
    const ayahText = escapeDrawtext(ayah.text);
    const refText = escapeDrawtext(`${ayah.surahName} ﴿${ayah.ayahInSurah}﴾`);
    const brandText = escapeDrawtext('روح المسلم');

    filterComplex = [
      // Ken Burns zoom matched to audio duration
      `[0:v]scale=${VIDEO_WIDTH * 2}:${VIDEO_HEIGHT * 2},` +
      `crop=${VIDEO_WIDTH}:${VIDEO_HEIGHT},` +
      `zoompan=z='min(zoom+0.0015\\,1.5)':` +
      `x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':` +
      `d=${totalFrames}:s=${VIDEO_WIDTH}x${VIDEO_HEIGHT}:fps=${VIDEO_FPS}[zoomed]`,

      // Dark overlay for text readability
      `[zoomed]drawbox=x=0:y=ih*0.50:w=iw:h=ih*0.50:color=black@0.55:t=fill[grad]`,

      // Ayah text — KFGQPC Uthmanic Script
      `[grad]drawtext=fontfile='${fontEsc}':` +
      `text='${ayahText}':` +
      `fontcolor=white:fontsize=50:` +
      `x=(w-text_w)/2:y=h*0.58:` +
      `line_spacing=18[withAyah]`,

      // Surah reference
      `[withAyah]drawtext=fontfile='${fontEsc}':` +
      `text='${refText}':` +
      `fontcolor=white@0.85:fontsize=32:` +
      `x=(w-text_w)/2:y=h*0.82[withRef]`,

      // App branding
      `[withRef]drawtext=fontfile='${fontEsc}':` +
      `text='${brandText}':` +
      `fontcolor=white@0.5:fontsize=24:` +
      `x=(w-text_w)/2:y=h*0.94[vout]`,
    ].join(';');
  } else {
    // Fallback without text (macOS without freetype)
    console.log('   ⚠️  drawtext not available — video without text overlay');
    filterComplex = [
      `[0:v]scale=${VIDEO_WIDTH * 2}:${VIDEO_HEIGHT * 2},` +
      `crop=${VIDEO_WIDTH}:${VIDEO_HEIGHT},` +
      `zoompan=z='min(zoom+0.0015\\,1.5)':` +
      `x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':` +
      `d=${totalFrames}:s=${VIDEO_WIDTH}x${VIDEO_HEIGHT}:fps=${VIDEO_FPS}[zoomed]`,

      `[zoomed]drawbox=x=0:y=ih*0.50:w=iw:h=ih*0.50:color=black@0.55:t=fill[vout]`,
    ].join(';');
  }

  // Build ffmpeg command — use -shortest so video ends when audio ends
  const cmd = [
    'ffmpeg', '-y',
    '-loop', '1', '-i', `"${imagePath}"`,
    '-i', `"${audioPath}"`,
    '-filter_complex', `"${filterComplex}"`,
    '-map', '[vout]', '-map', '1:a:0',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k',
    '-shortest',
    '-movflags', '+faststart',
    `"${outputPath}"`,
  ].join(' ');

  console.log('   ⏳ Rendering...');

  try {
    execSync(cmd, { stdio: ['pipe', 'pipe', 'pipe'], timeout: 300000, maxBuffer: 50 * 1024 * 1024 });
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString().slice(-1000) : 'no stderr';
    throw new Error(`FFmpeg failed:\n${stderr}`);
  }

  if (!fs.existsSync(outputPath)) throw new Error('FFmpeg produced no output file');

  const sizeMB = (fs.statSync(outputPath).size / (1024 * 1024)).toFixed(2);
  console.log(`   ✅ Video rendered: ${sizeMB} MB (${duration.toFixed(1)}s)`);
  return { path: outputPath, duration };
}

// ─── Copy + Write JSON ───────────────────────────────────────────────

function copyToPublic(videoPath) {
  const dir = path.dirname(OUTPUT_VIDEO);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(videoPath, OUTPUT_VIDEO);
  console.log(`📦 Saved to public/today-video.mp4`);
}

function writeOutputJson(ayah, duration) {
  const dir = path.dirname(OUTPUT_JSON);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const output = {
    url: VIDEO_RAW_URL,
    date: new Date().toISOString().slice(0, 10),
    ayahText: ayah.text,
    surahName: ayah.surahName,
    surahEnglish: ayah.surahEnglish,
    surahNumber: ayah.surahNumber,
    ayahNumber: ayah.ayahInSurah,
    globalAyahNumber: ayah.number,
    duration,
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(output, null, 2) + '\n');
  console.log(`📄 Wrote data/daily-video.json`);
  return output;
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  روح المسلم — Daily Video Generator');
  console.log('══════════════════════════════════════════════════\n');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daily-video-'));

  try {
    const ayah = await fetchAyah();
    const imagePath = await fetchNatureImage(tmpDir);
    const audioPath = await downloadAudio(ayah.audioUrl, tmpDir);
    const { path: videoPath, duration } = composeVideo(imagePath, audioPath, ayah, tmpDir);
    copyToPublic(videoPath);
    const output = writeOutputJson(ayah, duration);

    console.log('\n══════════════════════════════════════════════════');
    console.log(`  ✅ Done! ${ayah.surahName} — Ayah ${ayah.ayahInSurah} (${duration.toFixed(1)}s)`);
    console.log(`  📹 ${output.url}`);
    console.log('══════════════════════════════════════════════════\n');
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}

main().catch((err) => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
