// scripts/verify-reciters.mjs
// Probes the real app reciter registry and emits a JSON report.
// Run from repo root: node scripts/verify-reciters.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(path.resolve(process.cwd(), 'package.json'));
const ts = require('typescript');

const TIMEOUT_MS = 8000;
const SAMPLE_SURAHS = [1, 18, 36, 67, 114];

function pad3(n) {
  return String(n).padStart(3, '0');
}

function resolveRegistryPath() {
  const cwdPath = path.resolve(process.cwd(), 'lib', 'reciters-registry.ts');
  if (fs.existsSync(cwdPath)) return cwdPath;

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const scriptRelativePath = path.resolve(scriptDir, '..', 'lib', 'reciters-registry.ts');
  if (fs.existsSync(scriptRelativePath)) return scriptRelativePath;

  throw new Error('Could not find lib/reciters-registry.ts. Run from the repo root.');
}

function loadRegistry() {
  const registryPath = resolveRegistryPath();
  const source = fs.readFileSync(registryPath, 'utf8');
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;

  const sandbox = { exports: {}, console };
  vm.runInNewContext(js, sandbox, { filename: registryPath });
  return sandbox.exports.RECITERS_REGISTRY;
}

function toProbeTarget(entry) {
  return {
    ...entry,
    everyAyahFolders: entry.everyAyahFolder ? [entry.everyAyahFolder] : [],
    quranicAudioDirs: entry.quranicAudioDir ? [entry.quranicAudioDir] : [],
    mp3QuranCandidates: entry.mp3Quran
      ? [{ s: entry.mp3Quran.server, f: entry.mp3Quran.folder }]
      : [],
  };
}

async function head(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { method: 'HEAD', signal: ctrl.signal, redirect: 'follow' });
    return { ok: r.ok, status: r.status };
  } catch (e) {
    return { ok: false, status: 0, error: e.message };
  } finally {
    clearTimeout(t);
  }
}

async function getJson(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) return { ok: false, status: r.status };
    const j = await r.json();
    return { ok: true, status: r.status, data: j };
  } catch (e) {
    return { ok: false, status: 0, error: e.message };
  } finally {
    clearTimeout(t);
  }
}

async function probeAlquranCloud(id, bitrate = 128) {
  const url = `https://cdn.islamic.network/quran/audio/${bitrate}/${id}/1.mp3`;
  const r = await head(url);
  return { url, ...r };
}

async function probeEveryAyah(folder) {
  const url = `https://everyayah.com/data/${folder}/001001.mp3`;
  const r = await head(url);
  return { url, ...r };
}

async function probeSampledSurahFiles(makeUrl) {
  const samples = [];
  for (const surah of SAMPLE_SURAHS) {
    const url = makeUrl(surah);
    const result = await head(url);
    samples.push({ surah, url, ...result });
  }

  const failed = samples.find((sample) => !sample.ok);
  return {
    ok: !failed,
    status: failed?.status ?? 200,
    error: failed?.error,
    samples,
  };
}

async function probeQuranicAudio(dir) {
  return probeSampledSurahFiles(
    (surah) => `https://download.quranicaudio.com/quran/${dir}/${pad3(surah)}.mp3`,
  );
}

async function probeMp3Quran(serverNum, folder) {
  return probeSampledSurahFiles(
    (surah) => `https://server${serverNum}.mp3quran.net/${folder}/${pad3(surah)}.mp3`,
  );
}

async function probeQuranCdnSync(id) {
  if (!id) return { ok: false };
  const url = `https://api.qurancdn.com/api/qdc/audio/reciters/${id}/audio_files?chapter_number=1&segments=true`;
  const r = await getJson(url);
  if (!r.ok) return { url, ok: false, status: r.status };
  const file = r.data?.audio_files?.[0];
  const hasSegments = Array.isArray(file?.verse_timings) && file.verse_timings.length > 0;
  const audioUrl = file?.audio_url || '';
  let audioReachable = false;
  if (audioUrl) {
    const hr = await head(audioUrl);
    audioReachable = !!hr.ok;
  }
  return {
    url,
    ok: hasSegments && audioReachable,
    status: r.status,
    segmentsCount: file?.verse_timings?.length || 0,
    audioUrl,
    audioReachable,
  };
}

async function probeOne(rec) {
  const tasks = [];

  if (rec.alquranCloudId) {
    tasks.push((async () => {
      const r = await probeAlquranCloud(rec.alquranCloudId, rec.bitrate || 128);
      return ['alquranCloud', r];
    })());
  }
  for (const folder of rec.everyAyahFolders || []) {
    tasks.push((async () => {
      const r = await probeEveryAyah(folder);
      return [`everyAyah:${folder}`, r];
    })());
  }
  for (const dir of rec.quranicAudioDirs || []) {
    tasks.push((async () => {
      const r = await probeQuranicAudio(dir);
      return [`quranicAudio:${dir}`, r];
    })());
  }
  for (const c of rec.mp3QuranCandidates || []) {
    tasks.push((async () => {
      const r = await probeMp3Quran(c.s, c.f);
      return [`mp3Quran:server${c.s}/${c.f}`, r];
    })());
  }
  tasks.push((async () => {
    const r = await probeQuranCdnSync(rec.quranCdnId);
    return ['quranCdnSync', r];
  })());

  const results = await Promise.all(tasks);
  const map = {};
  for (const [k, v] of results) map[k] = v;
  return map;
}

const RECITERS = loadRegistry().map(toProbeTarget);
const results = [];

console.log(`\nProbing ${RECITERS.length} reciters from lib/reciters-registry.ts...`);
console.log(`Full-surah samples: ${SAMPLE_SURAHS.map(pad3).join(', ')}\n`);

for (const rec of RECITERS) {
  process.stdout.write(`- ${rec.nameAr.padEnd(30)} `);
  const probes = await probeOne(rec);

  const working = {
    alquranCloud: probes.alquranCloud?.ok ? rec.alquranCloudId : null,
    everyAyah: Object.entries(probes).find(([k, v]) => k.startsWith('everyAyah:') && v.ok)?.[0]?.split(':')[1] || null,
    quranicAudio: Object.entries(probes).find(([k, v]) => k.startsWith('quranicAudio:') && v.ok)?.[0]?.split(':')[1] || null,
    mp3Quran: Object.entries(probes).find(([k, v]) => k.startsWith('mp3Quran:') && v.ok)?.[0]?.replace('mp3Quran:', '') || null,
    quranCdnSync: probes.quranCdnSync?.ok ? rec.quranCdnId : null,
  };

  const perAyahOk = !!(working.alquranCloud || working.everyAyah);
  const perSurahOk = !!(working.quranicAudio || working.mp3Quran);
  const visibleInFullSurahPicker = perSurahOk;
  const status = perSurahOk && working.quranCdnSync
    ? 'FULL'
    : perSurahOk
      ? 'FULL-SURAH'
      : perAyahOk
        ? 'AYAH-ONLY-HIDDEN'
        : 'BROKEN';

  console.log(status);
  results.push({ ...rec, probes, working, perAyahOk, perSurahOk, visibleInFullSurahPicker, status });
}

const reportPath = path.join('scripts', 'reciter-verification-report.json');
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
console.log(`\nReport written to ${reportPath}`);

const full = results.filter((r) => r.status === 'FULL').length;
const fullSurah = results.filter((r) => r.status === 'FULL-SURAH').length;
const hiddenAyahOnly = results.filter((r) => r.status === 'AYAH-ONLY-HIDDEN').length;
const broken = results.filter((r) => r.status === 'BROKEN').length;
console.log(`\nSummary: FULL ${full}  FULL-SURAH ${fullSurah}  AYAH-ONLY-HIDDEN ${hiddenAyahOnly}  BROKEN ${broken}  / Total ${results.length}`);

if (broken > 0) {
  process.exitCode = 1;
}
