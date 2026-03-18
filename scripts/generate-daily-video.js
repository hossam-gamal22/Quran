#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────
//  روح المسلم — Automated Daily Video Generator (Multi-Reciter)
//  Generates 5 "Ayah of the Day" videos (one per reciter) daily.
//  Uses QCF Mushaf fonts for beautiful calligraphy, styled like daily-ayah.
//  Produces free (branded) + premium (clean) versions.
//  Maintains a rolling 7-day window — old videos auto-deleted.
//  Runs on GitHub Actions (ubuntu-latest with ffmpeg).
// ─────────────────────────────────────────────────────────────────────

const { execSync, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');

// ─── Config ──────────────────────────────────────────────────────────

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/hossam-gamal22/Quran/main/public';

const REPO_ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(REPO_ROOT, 'public');
const OUTPUT_JSON = path.join(REPO_ROOT, 'data', 'daily-video.json');

const VIDEO_WIDTH = 1080;
const VIDEO_HEIGHT = 1920;
const VIDEO_FPS = 30;
const ROLLING_DAYS = 7;

// High-quality encoding constants
const VIDEO_CRF = 18;
const VIDEO_PRESET = 'slow';
const VIDEO_PROFILE = 'high';
const AUDIO_BITRATE = '192k';

// ─── Font paths ──────────────────────────────────────────────────────
const QCF_FONTS_DIR = path.join(REPO_ROOT, 'assets', 'fonts', 'qcf');
const AMIRI_FONT = path.join(REPO_ROOT, 'assets', 'fonts', 'Amiri-Regular.ttf');
const AMIRI_BOLD_FONT = path.join(REPO_ROOT, 'assets', 'fonts', 'Amiri-Bold.ttf');
const APP_ICON = path.join(REPO_ROOT, 'assets', 'images', 'icons', 'App-icon.png');

// ─── QCF Data ────────────────────────────────────────────────────────
const qcfWords = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'data', 'json', 'qcf-words.json'), 'utf8'));
const qcfPageLines = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'data', 'json', 'qcf-page-lines.json'), 'utf8'));
const quranV4 = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'data', 'json', 'quran-v4.json'), 'utf8'));

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

// Register Amiri font
if (fs.existsSync(AMIRI_FONT)) GlobalFonts.registerFromPath(AMIRI_FONT, 'Amiri');
if (fs.existsSync(AMIRI_BOLD_FONT)) GlobalFonts.registerFromPath(AMIRI_BOLD_FONT, 'AmiriBold');

/**
 * Get QCF glyph data for a verse (mirrors lib/qcf-page-data.ts → getVerseQcfData).
 */
function getVerseQcfData(surahNumber, ayahNumber) {
  const surah = quranV4.find(s => s.number === surahNumber);
  if (!surah) return null;
  const ayah = surah.ayahs.find(a => a.ns === ayahNumber);
  if (!ayah) return null;

  const page = ayah.p;
  const glyphs = [];
  const lines = qcfPageLines[String(page)] || [];

  for (const line of lines) {
    if (line.lt !== 'ayah' || !line.fw || !line.lw) continue;
    for (let id = line.fw; id <= line.lw; id++) {
      const w = qcfWords[String(id)];
      if (w && w.s === surahNumber && w.a === ayahNumber) {
        glyphs.push(w.t);
      }
    }
  }

  // Check adjacent pages for verse boundary
  if (glyphs.length === 0) {
    for (const p of [page - 1, page + 1]) {
      if (p < 1 || p > 604) continue;
      const pLines = qcfPageLines[String(p)] || [];
      for (const line of pLines) {
        if (line.lt !== 'ayah' || !line.fw || !line.lw) continue;
        for (let id = line.fw; id <= line.lw; id++) {
          const w = qcfWords[String(id)];
          if (w && w.s === surahNumber && w.a === ayahNumber) {
            glyphs.push(w.t);
          }
        }
      }
      if (glyphs.length > 0) return { page: p, glyphs };
    }
  }

  return glyphs.length > 0 ? { page, glyphs } : null;
}

/**
 * Register the QCF4 tajweed font for a specific page.
 */
function registerQcfFont(page) {
  const padded = String(page).padStart(3, '0');
  const fontPath = path.join(QCF_FONTS_DIR, `QCF4_tajweed_${padded}.ttf`);
  const familyName = `QCF4p${page}`;
  if (fs.existsSync(fontPath)) {
    GlobalFonts.registerFromPath(fontPath, familyName);
    return familyName;
  }
  return null;
}

function toArabicNumeral(n) {
  return String(n).replace(/\d/g, (d) => '\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669'[parseInt(d)]);
}

/**
 * Generate a 1080x1920 transparent PNG text overlay in daily-ayah style.
 * @param {object} ayah        — verse data
 * @param {boolean} showBranding — true for free version (includes logo)
 * @returns {string} path to PNG file
 */
async function generateOverlayPNG(ayah, tmpDir, showBranding) {
  const W = VIDEO_WIDTH;
  const H = VIDEO_HEIGHT;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Fully transparent base
  ctx.clearRect(0, 0, W, H);

  // Dark overlay — matches daily-ayah overlay_dark: rgba(0,0,0,0.55)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(0, 0, W, H);

  // Get QCF data
  const qcf = getVerseQcfData(ayah.surahNumber, ayah.ayahInSurah);
  let qcfFamily = null;
  let glyphText = '';

  if (qcf && qcf.glyphs.length > 0) {
    qcfFamily = registerQcfFont(qcf.page);
    glyphText = qcf.glyphs.join('');
  }

  // ── Verse text ──
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Text shadow (matches daily-ayah: rgba(0,0,0,0.5), offset (0,1), blur 3)
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;
  ctx.shadowBlur = 6;
  ctx.fillStyle = '#FFFFFF';

  const centerX = W / 2;
  const verseY = H * 0.45;  // Vertically centered
  const maxTextWidth = W - 120; // 60px padding each side
  let textBottomY = verseY; // Track where text ends for badge positioning

  if (qcfFamily && glyphText) {
    // QCF Mushaf calligraphy — larger for video
    const qcfFontSize = 72;
    ctx.font = `${qcfFontSize}px "${qcfFamily}"`;
    ctx.direction = 'rtl';

    // Word-wrap QCF glyphs
    const words = glyphText.split('');
    const lines = [];
    let currentLine = '';
    for (const glyph of words) {
      const testLine = currentLine + glyph;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxTextWidth && currentLine) {
        lines.push(currentLine);
        currentLine = glyph;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    const lineHeight = 130;
    const totalHeight = lines.length * lineHeight;
    const startY = verseY - totalHeight / 2 + lineHeight / 2;

    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], centerX, startY + i * lineHeight);
    }
    textBottomY = startY + (lines.length - 1) * lineHeight + lineHeight / 2;
  } else {
    // Fallback: Amiri font with ﴿ ﴾ brackets — larger for video
    const fontSize = 68;
    ctx.font = `${fontSize}px "Amiri"`;
    ctx.direction = 'rtl';

    const displayText = `\uFD3F ${ayah.text} \uFD3E`;
    const words = displayText.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxTextWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    const lineHeight = 120;
    const totalHeight = lines.length * lineHeight;
    const startY = verseY - totalHeight / 2 + lineHeight / 2;

    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], centerX, startY + i * lineHeight);
    }
    textBottomY = startY + (lines.length - 1) * lineHeight + lineHeight / 2;
  }

  // ── Surah badge pill ──
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;
  ctx.shadowBlur = 4;

  const surahName = (ayah.surahName || '').replace(/^سُورَةُ\s*|^سورة\s*/i, '').trim();
  const badgeText = `${surahName}: ${toArabicNumeral(ayah.ayahInSurah)}`;
  const badgeFontSize = 38;
  ctx.font = `${badgeFontSize}px "Amiri"`;
  const badgeMetrics = ctx.measureText(badgeText);
  const badgeWidth = badgeMetrics.width + 80;
  const badgeHeight = 64;
  const badgeX = centerX - badgeWidth / 2;
  const badgeY = textBottomY + 40; // Dynamically below verse text

  // Badge background
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  roundRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 30);
  ctx.fill();

  // Badge border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 2;
  roundRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 30);
  ctx.stroke();

  // Badge text
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 1;
  ctx.shadowBlur = 3;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `${badgeFontSize}px "Amiri"`;
  ctx.fillText(badgeText, centerX, badgeY + badgeHeight / 2);

  // ── Branding logo (free version) ──
  if (showBranding && fs.existsSync(APP_ICON)) {
    ctx.shadowColor = 'transparent';
    const logoSize = 180;
    const logoX = centerX - logoSize / 2;
    const logoY = H - 100 - logoSize;
    try {
      const logoImg = await loadImage(APP_ICON);
      ctx.globalAlpha = 0.9;
      ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
      ctx.globalAlpha = 1.0;
    } catch (e) {
      console.log(`      ⚠️ Could not render logo: ${e.message}`);
    }
  }

  // Save PNG
  const suffix = showBranding ? 'free' : 'premium';
  const pngPath = path.join(tmpDir, `overlay-${suffix}.png`);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(pngPath, buffer);
  return pngPath;
}

/** Draw a rounded rectangle path */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
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

function getAudioDuration(audioPath) {
  // ffmpeg -i always exits non-zero (no output file) — duration is in stderr
  let output = '';
  try {
    execSync(`ffmpeg -i "${audioPath}"`, { encoding: 'utf8', timeout: 10000 });
  } catch (err) {
    output = (err.stderr || '') + '\n' + (err.stdout || '');
  }
  const match = output.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
  if (match) {
    return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseFloat(match[3]);
  }
  throw new Error(`Could not parse audio duration from: ${audioPath}\nffmpeg output: ${output.slice(0, 500)}`);
}

/** Build video filename */
function videoFilename(date, reciterId, variant = 'free') {
  const short = reciterId.replace(/^ar\./, '');
  if (variant === 'premium') return `video-${date}-${short}-premium.mp4`;
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

/** Generate a solid dark gradient fallback image using FFmpeg */
function generateFallbackImage(tmpDir) {
  console.log('   ⚠️  Using FFmpeg-generated gradient fallback image');
  const imgPath = path.join(tmpDir, 'background.png');
  // Dark teal-to-navy gradient, 1080x1920
  const cmd = [
    'ffmpeg', '-y',
    '-f', 'lavfi',
    `-i`, `color=c=#0a2e2e:s=${VIDEO_WIDTH}x${VIDEO_HEIGHT}:d=1,format=rgb24`,
    '-frames:v', '1',
    `"${imgPath}"`,
  ].join(' ');
  execSync(cmd, { stdio: 'pipe', timeout: 15000 });
  return imgPath;
}

async function fetchNatureImage(tmpDir) {
  console.log('🖼️  Fetching nature image from Pexels...');

  if (!PEXELS_API_KEY) {
    console.log('   ⚠️  PEXELS_API_KEY is not set — using fallback');
    return generateFallbackImage(tmpDir);
  }

  try {
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
      timeout: 15000,
    });

    const photos = response.data.photos;
    if (!photos?.length) {
      console.log(`   ⚠️  No photos found for "${searchTerm}" — using fallback`);
      return generateFallbackImage(tmpDir);
    }

    const photo = photos[dayOfYear % photos.length];
    console.log(`   ✅ Photo #${photo.id} by ${photo.photographer}`);

    const imgPath = path.join(tmpDir, 'background.jpg');
    const imgResponse = await axios.get(photo.src.portrait, { responseType: 'arraybuffer', timeout: 30000 });
    fs.writeFileSync(imgPath, Buffer.from(imgResponse.data));
    return imgPath;
  } catch (err) {
    console.error(`   ⚠️  Pexels failed: ${err.message} — using fallback`);
    return generateFallbackImage(tmpDir);
  }
}



// ─── Compose Video ───────────────────────────────────────────────────

/**
 * Encode video from image + audio + overlay PNG.
 * Composites overlay on top of the background with zoompan.
 */
function encodeVideo(imagePath, audioPath, overlayPath, outputPath, totalFrames) {
  const filterComplex =
    `[0:v]scale=${VIDEO_WIDTH}:${VIDEO_HEIGHT}:force_original_aspect_ratio=increase,` +
    `crop=${VIDEO_WIDTH}:${VIDEO_HEIGHT},` +
    `zoompan=z='min(zoom+0.0015\\,1.5)':` +
    `x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':` +
    `d=${totalFrames}:s=${VIDEO_WIDTH}x${VIDEO_HEIGHT}:fps=${VIDEO_FPS},` +
    `unsharp=5:5:0.5:5:5:0.0,eq=contrast=1.05:brightness=0.02:saturation=1.15[bg];` +
    `[bg][2:v]overlay=0:0:format=auto[vout]`;

  const filterFile = outputPath + '.filter.txt';
  fs.writeFileSync(filterFile, filterComplex, 'utf8');

  const args = [
    '-y',
    '-loop', '1', '-i', imagePath,
    '-i', audioPath,
    '-i', overlayPath,
    '-filter_complex_script', filterFile,
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
    outputPath,
  ];

  try {
    execFileSync('ffmpeg', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 600000,
      maxBuffer: 50 * 1024 * 1024,
    });
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString().slice(-1000) : 'no stderr';
    try { fs.unlinkSync(filterFile); } catch {}
    throw new Error(`FFmpeg encode failed:\n${stderr}`);
  }

  try { fs.unlinkSync(filterFile); } catch {}
  if (!fs.existsSync(outputPath)) throw new Error('FFmpeg produced no output');

  const sizeMB = (fs.statSync(outputPath).size / (1024 * 1024)).toFixed(2);
  console.log(`         ✅ ${sizeMB} MB`);
}

/**
 * Generate free + premium videos for a reciter.
 * Returns { duration, freeFile, premiumFile }.
 */
function composeVideo(imagePath, audioPath, freeOverlay, premiumOverlay, freeOutputPath, premiumOutputPath) {
  const duration = getAudioDuration(audioPath);
  const totalFrames = Math.ceil(duration * VIDEO_FPS);
  console.log(`      ⏳ Audio: ${duration.toFixed(2)}s (${totalFrames} frames @ ${VIDEO_FPS}fps)`);
  console.log(`      🎬 Encoding: CRF ${VIDEO_CRF}, preset ${VIDEO_PRESET}, profile ${VIDEO_PROFILE}`);

  console.log('      📹 Encoding free version (with branding)...');
  encodeVideo(imagePath, audioPath, freeOverlay, freeOutputPath, totalFrames);

  console.log('      📹 Encoding premium version (no branding)...');
  encodeVideo(imagePath, audioPath, premiumOverlay, premiumOutputPath, totalFrames);

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
      const raw = JSON.parse(fs.readFileSync(OUTPUT_JSON, 'utf8'));
      // Migrate: keep only date-keyed entries (YYYY-MM-DD), drop legacy flat keys
      for (const key of Object.keys(raw)) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
          existing[key] = raw[key];
        }
      }
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
      premiumUrl: v.premiumUrl,
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

  console.log(`🔑 PEXELS_API_KEY: ${PEXELS_API_KEY ? 'SET (' + PEXELS_API_KEY.length + ' chars)' : '❌ NOT SET'}`);
  console.log('');

  const date = todayStr();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daily-video-'));

  try {
    // 1. Cleanup old videos
    cleanupOldVideos();

    // 2. Fetch today's ayah text
    const ayah = await fetchAyah();

    // 3. Fetch background image (shared for all reciters)
    const imagePath = await fetchNatureImage(tmpDir);

    // 4. Generate text overlay PNGs (free = branded, premium = no logo)
    console.log('\n🎨 Generating text overlay PNGs...');
    const freeOverlay = await generateOverlayPNG(ayah, tmpDir, true);
    const premiumOverlay = await generateOverlayPNG(ayah, tmpDir, false);
    console.log('   ✅ Overlay PNGs ready');

    // 5. Ensure public/ exists
    if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });

    // 6. Generate free + premium videos per reciter
    const videoResults = [];

    for (let ri = 0; ri < RECITERS.length; ri++) {
      const reciter = RECITERS[ri];
      console.log(`\n🎬 [${ri + 1}/${RECITERS.length}] ${reciter.label} (${reciter.id})`);

      if (ri > 0) await new Promise((r) => setTimeout(r, 2000));

      let success = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          if (attempt > 1) {
            console.log(`   🔄 Retry attempt ${attempt}/3...`);
            await new Promise((r) => setTimeout(r, 3000));
          }
          const audioPath = await fetchReciterAudio(ayah.number, reciter.id, tmpDir);

          const freeFile = videoFilename(date, reciter.id, 'free');
          const premiumFile = videoFilename(date, reciter.id, 'premium');
          const freePath = path.join(PUBLIC_DIR, freeFile);
          const premiumPath = path.join(PUBLIC_DIR, premiumFile);

          const duration = composeVideo(imagePath, audioPath, freeOverlay, premiumOverlay, freePath, premiumPath);

          videoResults.push({
            reciterId: reciter.id,
            reciterLabel: reciter.label,
            reciterLabelEn: reciter.labelEn,
            url: videoRawUrl(freeFile),
            premiumUrl: videoRawUrl(premiumFile),
            duration,
          });
          success = true;
          break;
        } catch (err) {
          console.error(`   ❌ Attempt ${attempt} failed: ${err.message}`);
          if (err.stack) console.error(err.stack);
        }
      }
      if (!success) console.error(`   ⛔ All 3 attempts failed for ${reciter.id}`);
    }

    // 7. Update rolling JSON
    updateRollingJson(ayah, date, videoResults);

    console.log('\n══════════════════════════════════════════════════');
    console.log(`  ✅ Done! ${ayah.surahName} — Ayah ${ayah.ayahInSurah}`);
    console.log(`  📹 ${videoResults.length}/${RECITERS.length} reciters`);
    console.log(`  📅 Date: ${date}`);
    console.log('══════════════════════════════════════════════════\n');

    if (videoResults.length === 0) {
      throw new Error('All reciters failed — no videos were generated!');
    }
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}

main().catch((err) => {
  console.error('\n❌ Fatal error:', err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
