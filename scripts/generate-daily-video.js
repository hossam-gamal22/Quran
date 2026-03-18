#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────
//  روح المسلم — Automated Daily Video Generator (Multi-Reciter)
//  Generates 5 "Ayah of the Day" videos (one per reciter) daily.
//  Each reciter: free (with branding) + premium (without branding).
//  Uses QCF page fonts for authentic Mushaf calligraphy.
//  Maintains a rolling 7-day window — old videos auto-deleted.
//  Runs on GitHub Actions (ubuntu-latest with ffmpeg + @napi-rs/canvas).
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

const FONT_PATH = path.join(__dirname, 'fonts', 'KFGQPC-Uthmanic-Script.ttf');
const LOGO_PATH = path.join(__dirname, 'fonts', 'App-icon.png');
const QCF_FONTS_DIR = path.join(__dirname, 'fonts', 'qcf');
const DATA_DIR = path.join(__dirname, '..', 'data', 'json');
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

// ─── QCF Data (loaded lazily) ────────────────────────────────────────

let _quranV4 = null;
let _qcfWords = null;
let _qcfPageLines = null;

function loadQcfData() {
  if (_quranV4) return true;
  try {
    _quranV4 = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'quran-v4.json'), 'utf8'));
    _qcfWords = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'qcf-words.json'), 'utf8'));
    _qcfPageLines = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'qcf-page-lines.json'), 'utf8'));
    console.log('      📚 QCF data loaded');
    return true;
  } catch (e) {
    console.log('      ⚠️  QCF data not available:', e.message);
    _quranV4 = [];
    _qcfWords = {};
    _qcfPageLines = {};
    return false;
  }
}

/** Port of lib/qcf-page-data.ts getVerseQcfData */
function getVerseQcfData(surahNumber, ayahNumber) {
  loadQcfData();
  const surah = _quranV4.find(s => s.number === surahNumber);
  if (!surah) return null;
  const ayah = surah.ayahs.find(a => a.ns === ayahNumber);
  if (!ayah) return null;

  const page = ayah.p;
  const glyphs = [];

  const lines = _qcfPageLines[String(page)] || [];
  for (const line of lines) {
    if (line.lt !== 'ayah' || !line.fw || !line.lw) continue;
    for (let id = line.fw; id <= line.lw; id++) {
      const w = _qcfWords[String(id)];
      if (w && w.s === surahNumber && w.a === ayahNumber) {
        glyphs.push(w.t);
      }
    }
  }

  // Check adjacent pages if verse spans boundary
  if (glyphs.length === 0) {
    for (const p of [page - 1, page + 1]) {
      if (p < 1 || p > 604) continue;
      const pLines = _qcfPageLines[String(p)] || [];
      for (const line of pLines) {
        if (line.lt !== 'ayah' || !line.fw || !line.lw) continue;
        for (let id = line.fw; id <= line.lw; id++) {
          const w = _qcfWords[String(id)];
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

/** Get QCF font path for a page (1-604) */
function getQcfFontPath(page) {
  const padded = String(page).padStart(3, '0');
  return path.join(QCF_FONTS_DIR, `QCF4_tajweed_${padded}.ttf`);
}

// ─── Helpers ─────────────────────────────────────────────────────────

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
function videoFilename(date, reciterId, premium = false) {
  const short = reciterId.replace(/^ar\./, '');
  return premium
    ? `video-${date}-${short}-premium.mp4`
    : `video-${date}-${short}.mp4`;
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

// ─── Canvas Overlay ──────────────────────────────────────────────────

let fontsRegistered = false;

function registerFonts() {
  if (fontsRegistered) return;
  const amiriPath = path.join(__dirname, 'fonts', 'Amiri-Regular.ttf');
  const amiriBoldPath = path.join(__dirname, 'fonts', 'Amiri-Bold.ttf');
  if (fs.existsSync(FONT_PATH)) GlobalFonts.registerFromPath(FONT_PATH, 'QuranFont');
  if (fs.existsSync(amiriPath)) GlobalFonts.registerFromPath(amiriPath, 'Amiri');
  if (fs.existsSync(amiriBoldPath)) GlobalFonts.registerFromPath(amiriBoldPath, 'AmiriBold');
  fontsRegistered = true;
}

/** Register a QCF page font, returns font family name or null */
function registerQcfFont(page) {
  const familyName = `QCF4p${page}`;
  if (GlobalFonts.has(familyName)) return familyName;
  const fontPath = getQcfFontPath(page);
  if (fs.existsSync(fontPath)) {
    GlobalFonts.registerFromPath(fontPath, familyName);
    console.log(`      📝 Registered QCF font page ${page}`);
    return familyName;
  }
  return null;
}

/** Word-wrap text for canvas, respecting RTL */
function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? current + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Draw a rounded rectangle path */
function roundedRect(ctx, x, y, w, h, r) {
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

/**
 * Generate a transparent 1080×1920 PNG matching the app's in-app display.
 * @param {object}  ayah         — ayah data
 * @param {string}  outputPath   — where to write PNG
 * @param {boolean} showBranding — true for free, false for premium
 */
async function generateOverlayPNG(ayah, outputPath, showBranding) {
  registerFonts();

  const W = VIDEO_WIDTH;
  const H = VIDEO_HEIGHT;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // ── Gradient: matches app's LinearGradient ──
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.45, 'rgba(0,0,0,0.15)');
  grad.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.direction = 'rtl';

  // ── Try QCF page font (authentic Mushaf calligraphy) ──
  const qcfData = getVerseQcfData(ayah.surahNumber, ayah.ayahInSurah);
  let useQcf = false;
  let qcfFamily = null;
  let displayText = ayah.text;

  if (qcfData && qcfData.glyphs.length > 0) {
    qcfFamily = registerQcfFont(qcfData.page);
    if (qcfFamily) {
      useQcf = true;
      displayText = qcfData.glyphs.join(' ');
      console.log(`      ✅ QCF page ${qcfData.page} — ${qcfData.glyphs.length} glyphs`);
    }
  }
  if (!useQcf) {
    console.log('      ⚠️  QCF unavailable — falling back to KFGQPC Uthmanic');
  }

  const labelFont = GlobalFonts.has('AmiriBold') ? 'AmiriBold'
    : GlobalFonts.has('Amiri') ? 'Amiri' : 'sans-serif';
  const fallbackFont = GlobalFonts.has('QuranFont') ? 'QuranFont'
    : GlobalFonts.has('Amiri') ? 'Amiri' : 'sans-serif';

  // ── Ayah text ──
  const ayahFont = useQcf ? qcfFamily : fallbackFont;
  const fontSize = useQcf ? 64 : 52;
  const lineHeight = useQcf ? 105 : 84;

  ctx.font = `${fontSize}px "${ayahFont}"`;
  ctx.fillStyle = 'white';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;

  const maxWidth = W - 100;
  const lines = wrapText(ctx, displayText, maxWidth);
  const textBlockHeight = lines.length * lineHeight;
  const textCenterY = H * 0.40;
  const textStartY = textCenterY - (textBlockHeight / 2) + (lineHeight / 2);

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], W / 2, textStartY + i * lineHeight);
  }

  // ── Verse ornament (decorative circle with number) ──
  const ornamentY = textStartY + textBlockHeight + 30;
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 1;

  const circleR = 32;
  ctx.beginPath();
  ctx.arc(W / 2, ornamentY, circleR, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(W / 2, ornamentY, circleR - 4, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = `bold 30px "${labelFont}"`;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.shadowBlur = 2;
  ctx.fillText(`${ayah.ayahInSurah}`, W / 2, ornamentY + 2);

  // ── Surah pill badge ──
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  const surahClean = ayah.surahName.replace(/^سُورَةُ\s*|^سورة\s*/i, '').trim();
  const surahText = `${surahClean}: ${ayah.ayahInSurah}`;
  ctx.font = `bold 28px "${labelFont}"`;

  const pillY = ornamentY + circleR + 30;
  const tm = ctx.measureText(surahText);
  const pillW = tm.width + 50;
  const pillH = 48;
  const pillX = (W - pillW) / 2;

  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  roundedRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  roundedRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 2;
  ctx.shadowOffsetY = 1;
  ctx.fillText(surahText, W / 2, pillY + pillH / 2 + 1);

  // ── Branding (free version only) ──
  if (showBranding) {
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    if (fs.existsSync(LOGO_PATH)) {
      try {
        const logo = await loadImage(LOGO_PATH);
        const logoSize = 42;
        const logoX = (W - logoSize) / 2;
        const logoY = H - 130;
        ctx.save();
        ctx.beginPath();
        ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
        ctx.restore();
      } catch {}
    }

    ctx.font = `bold 24px "${labelFont}"`;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 1;
    ctx.fillText('روح المسلم', W / 2, H - 75);
  }

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
}

// ─── Compose Video ───────────────────────────────────────────────────

/**
 * Encode a single video from image + audio + overlay PNG.
 */
function encodeVideo(imagePath, audioPath, overlayPath, outputPath, totalFrames) {
  const colorGrade = 'unsharp=5:5:0.5:5:5:0.0,eq=contrast=1.05:brightness=0.02:saturation=1.15';

  const filterComplex =
    `[0:v]scale=${VIDEO_WIDTH}:${VIDEO_HEIGHT}:force_original_aspect_ratio=increase,` +
    `crop=${VIDEO_WIDTH}:${VIDEO_HEIGHT},` +
    `zoompan=z='min(zoom+0.0015\\,1.5)':` +
    `x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':` +
    `d=${totalFrames}:s=${VIDEO_WIDTH}x${VIDEO_HEIGHT}:fps=${VIDEO_FPS},` +
    `${colorGrade}[bg];` +
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
 * Generate free + premium videos for one reciter.
 * Returns the duration in seconds.
 */
async function composeVideos(imagePath, audioPath, ayah, reciter, freeOutputPath, premiumOutputPath) {
  const duration = getAudioDuration(audioPath);
  const totalFrames = Math.ceil(duration * VIDEO_FPS);
  console.log(`      ⏳ Audio: ${duration.toFixed(2)}s (${totalFrames} frames @ ${VIDEO_FPS}fps)`);
  console.log(`      🎬 Encoding: CRF ${VIDEO_CRF}, preset ${VIDEO_PRESET}, profile ${VIDEO_PROFILE}`);

  // Generate two overlay PNGs (branded + clean)
  const overlayFree = freeOutputPath + '.overlay.png';
  const overlayPremium = premiumOutputPath + '.overlay.png';

  console.log('      🎨 Generating overlays...');
  await generateOverlayPNG(ayah, overlayFree, true);
  await generateOverlayPNG(ayah, overlayPremium, false);
  console.log('      🎨 Both overlays ready');

  // Encode free version (with branding)
  console.log('      📹 Encoding free version...');
  encodeVideo(imagePath, audioPath, overlayFree, freeOutputPath, totalFrames);

  // Encode premium version (no branding)
  console.log('      📹 Encoding premium version...');
  encodeVideo(imagePath, audioPath, overlayPremium, premiumOutputPath, totalFrames);

  // Cleanup overlays
  try { fs.unlinkSync(overlayFree); } catch {}
  try { fs.unlinkSync(overlayPremium); } catch {}

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

  // Debug: confirm environment
  console.log(`🔑 PEXELS_API_KEY: ${PEXELS_API_KEY ? 'SET (' + PEXELS_API_KEY.length + ' chars)' : '❌ NOT SET'}`);
  console.log(`📂 Uthmanic font: ${fs.existsSync(FONT_PATH) ? '✅' : '❌ MISSING'}`);
  console.log(`📂 QCF fonts dir: ${fs.existsSync(QCF_FONTS_DIR) ? '✅ (' + fs.readdirSync(QCF_FONTS_DIR).length + ' files)' : '❌ MISSING'}`);
  console.log(`📂 Logo: ${fs.existsSync(LOGO_PATH) ? '✅' : '❌ MISSING'}`);
  console.log(`📂 QCF data: ${fs.existsSync(path.join(DATA_DIR, 'qcf-words.json')) ? '✅' : '❌ MISSING'}`);
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

    // 4. Ensure public/ exists
    if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });

    // 5. Generate one video per reciter
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
          const freeFile = videoFilename(date, reciter.id, false);
          const premiumFile = videoFilename(date, reciter.id, true);
          const freePath = path.join(PUBLIC_DIR, freeFile);
          const premiumPath = path.join(PUBLIC_DIR, premiumFile);

          const duration = await composeVideos(imagePath, audioPath, ayah, reciter, freePath, premiumPath);

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

    // 6. Update rolling JSON
    updateRollingJson(ayah, date, videoResults);

    console.log('\n══════════════════════════════════════════════════');
    console.log(`  ✅ Done! ${ayah.surahName} — Ayah ${ayah.ayahInSurah}`);
    console.log(`  📹 ${videoResults.length}/${RECITERS.length} reciters (×2 versions each)`);
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
