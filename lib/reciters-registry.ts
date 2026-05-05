// lib/reciters-registry.ts
// Master single source of truth for all Quran reciters.
// All CDN paths verified by scripts/verify-reciters.mjs (see scripts/reciter-verification-report.json).
//
// Architecture notes:
//  - Each reciter MUST have at least ONE working source (alquranCloud or everyAyah for per-ayah,
//    quranicAudio or mp3Quran for per-surah). Otherwise it must NOT be added here.
//  - quranCdnId enables per-ayah highlight sync via api.qurancdn.com/qdc/audio/.
//    When absent, the reciter is "continuous-only" and the picker shows a yellow badge.
//  - Per-ayah sources (alquranCloud, everyAyah) are tried for verse-by-verse playback.
//  - Per-surah sources (quranicAudio, mp3Quran) are tried when continuousPlay is enabled
//    AND for offline downloads.

export type ReciterStyle = 'murattal' | 'mujawwad';

export interface Mp3QuranSource {
  /** server number, e.g. 8 → server8.mp3quran.net */
  server: number;
  /** folder path on the server, e.g. 'afs' → server8.mp3quran.net/afs/001.mp3 */
  folder: string;
}

export interface ReciterEntry {
  /** Stable internal id used for storage and analytics. NEVER changes. */
  id: string;
  nameAr: string;
  nameEn: string;
  style: ReciterStyle;
  bitrate: 32 | 64 | 128 | 192;

  // ── Per-ayah sources (verse-by-verse) ──
  /** Edition identifier on api.alquran.cloud. Used at cdn.islamic.network/quran/audio/{bitrate}/{id}/{globalAyahNumber}.mp3 */
  alquranCloudId?: string;
  /** Folder on everyayah.com. Used at everyayah.com/data/{folder}/{paddedSurah}{paddedAyah}.mp3 */
  everyAyahFolder?: string;

  // ── Per-surah sources (full-surah file) ──
  /** Directory on download.quranicaudio.com/quran/{dir}/{paddedSurah}.mp3 */
  quranicAudioDir?: string;
  /** mp3quran.net source: serverN.mp3quran.net/{folder}/{paddedSurah}.mp3 */
  mp3Quran?: Mp3QuranSource;

  // ── Sync capability ──
  /** Reciter id on quran.com / api.qurancdn.com. Required for per-ayah highlight sync. */
  quranCdnId?: number;
}

/**
 * 28 verified reciters (verified May 4, 2026).
 * Full-surah pickers must filter with hasPerSurahAudio() so every visible
 * reciter supports continuous playback and offline downloads.
 * Re-run scripts/verify-reciters.mjs after editing this list.
 */
export const RECITERS_REGISTRY: ReciterEntry[] = [
  // ── 🟢 Full per-ayah sync ──
  {
    id: 'mishary_alafasy',
    nameAr: 'مشاري العفاسي',
    nameEn: 'Mishary Alafasy',
    style: 'murattal',
    bitrate: 128,
    alquranCloudId: 'ar.alafasy',
    everyAyahFolder: 'Alafasy_128kbps',
    quranicAudioDir: 'mishaari_raashid_al_3afaasee',
    mp3Quran: { server: 8, folder: 'afs' },
    quranCdnId: 7,
  },
  {
    id: 'abdulbasit_murattal',
    nameAr: 'عبد الباسط عبد الصمد - مرتل',
    nameEn: 'Abdul Basit Abdus Samad (Murattal)',
    style: 'murattal',
    bitrate: 64,
    alquranCloudId: 'ar.abdulsamad',
    everyAyahFolder: 'Abdul_Basit_Murattal_64kbps',
    mp3Quran: { server: 7, folder: 'basit' },
    quranCdnId: 2,
  },
  {
    id: 'husary',
    nameAr: 'محمود خليل الحصري',
    nameEn: 'Mahmoud Khalil Al-Husary',
    style: 'murattal',
    bitrate: 128,
    alquranCloudId: 'ar.husary',
    everyAyahFolder: 'Husary_128kbps',
    quranicAudioDir: 'mahmood_khaleel_al-husaree',
    quranCdnId: 6,
  },
  {
    id: 'minshawi_murattal',
    nameAr: 'محمد صديق المنشاوي - مرتل',
    nameEn: 'Mohamed Siddiq Al-Minshawi (Murattal)',
    style: 'murattal',
    bitrate: 128,
    alquranCloudId: 'ar.minshawi',
    everyAyahFolder: 'Minshawy_Murattal_128kbps',
    quranicAudioDir: 'muhammad_siddeeq_al-minshaawee',
    quranCdnId: 9,
  },
  {
    id: 'sudais',
    nameAr: 'عبد الرحمن السديس',
    nameEn: 'Abdurrahman As-Sudais',
    style: 'murattal',
    bitrate: 192,
    alquranCloudId: 'ar.abdurrahmaansudais',
    everyAyahFolder: 'Abdurrahmaan_As-Sudais_192kbps',
    mp3Quran: { server: 11, folder: 'sds' },
    quranCdnId: 3,
  },
  {
    id: 'shuraim',
    nameAr: 'سعود الشريم',
    nameEn: 'Saud Al-Shuraim',
    style: 'murattal',
    bitrate: 64,
    alquranCloudId: 'ar.saoodshuraym',
    everyAyahFolder: 'Saood_ash-Shuraym_128kbps',
    mp3Quran: { server: 7, folder: 'shur' },
    quranCdnId: 10,
  },
  {
    id: 'maher_muaiqly',
    nameAr: 'ماهر المعيقلي',
    nameEn: 'Maher Al Muaiqly',
    style: 'murattal',
    bitrate: 128,
    alquranCloudId: 'ar.mahermuaiqly',
    everyAyahFolder: 'MaherAlMuaiqly128kbps',
    mp3Quran: { server: 12, folder: 'maher' },
  },
  {
    id: 'shatri',
    nameAr: 'أبو بكر الشاطري',
    nameEn: 'Abu Bakr Al-Shatri',
    style: 'murattal',
    bitrate: 128,
    alquranCloudId: 'ar.shaatree',
    everyAyahFolder: 'Abu_Bakr_Ash-Shaatree_128kbps',
    quranicAudioDir: 'abu_bakr_ash-shaatree',
    quranCdnId: 4,
  },
  {
    id: 'ali_hudhaify',
    nameAr: 'علي بن عبد الرحمن الحذيفي',
    nameEn: 'Ali Al-Hudhaify',
    style: 'murattal',
    bitrate: 128,
    alquranCloudId: 'ar.hudhaify',
    everyAyahFolder: 'Hudhaify_128kbps',
    mp3Quran: { server: 9, folder: 'hthfi' },
  },
  {
    id: 'abdullah_basfar',
    nameAr: 'عبد الله بصفر',
    nameEn: 'Abdullah Basfar',
    style: 'murattal',
    bitrate: 192,
    alquranCloudId: 'ar.abdullahbasfar',
    everyAyahFolder: 'Abdullah_Basfar_192kbps',
    quranicAudioDir: 'abdullaah_basfar',
  },
  {
    id: 'ahmed_ajamy',
    nameAr: 'أحمد بن علي العجمي',
    nameEn: 'Ahmed Al-Ajamy',
    style: 'murattal',
    bitrate: 128,
    alquranCloudId: 'ar.ahmedajamy',
    everyAyahFolder: 'ahmed_ibn_3ali_al-3ajamy_128kbps',
    mp3Quran: { server: 10, folder: 'ajm' },
    quranCdnId: 19,
  },
  {
    id: 'hani_rifai',
    nameAr: 'هاني الرفاعي',
    nameEn: 'Hani Ar-Rifai',
    style: 'murattal',
    bitrate: 192,
    alquranCloudId: 'ar.hanirifai',
    everyAyahFolder: 'Hani_Rifai_192kbps',
    mp3Quran: { server: 8, folder: 'hani' },
    quranCdnId: 5,
  },
  {
    id: 'yasser_dosari',
    nameAr: 'ياسر الدوسري',
    nameEn: 'Yasser Al-Dosari',
    style: 'murattal',
    bitrate: 128,
    everyAyahFolder: 'Yasser_Ad-Dussary_128kbps',
    mp3Quran: { server: 11, folder: 'yasser' },
    quranCdnId: 97,
  },
  {
    id: 'saad_ghamdi',
    nameAr: 'سعد الغامدي',
    nameEn: 'Saad Al-Ghamdi',
    style: 'murattal',
    bitrate: 64,
    everyAyahFolder: 'Ghamadi_40kbps',
    mp3Quran: { server: 7, folder: 's_gmd' },
    quranCdnId: 13,
  },

  // ── 🟡 Continuous-only (no per-ayah sync) ──
  {
    id: 'abdulbasit_mujawwad',
    nameAr: 'عبد الباسط عبد الصمد - مجود',
    nameEn: 'Abdul Basit Abdus Samad (Mujawwad)',
    style: 'mujawwad',
    bitrate: 128,
    everyAyahFolder: 'Abdul_Basit_Mujawwad_128kbps',
    mp3Quran: { server: 7, folder: 'basit/Almusshaf-Al-Mojawwad' },
  },
  {
    id: 'husary_mujawwad',
    nameAr: 'محمود خليل الحصري - مجود',
    nameEn: 'Al-Husary (Mujawwad)',
    style: 'mujawwad',
    bitrate: 128,
    alquranCloudId: 'ar.husarymujawwad',
    everyAyahFolder: 'Husary_Mujawwad_64kbps',
    mp3Quran: { server: 13, folder: 'husr/Almusshaf-Al-Mojawwad' },
  },
  {
    id: 'minshawi_mujawwad',
    nameAr: 'محمد صديق المنشاوي - مجود',
    nameEn: 'Al-Minshawi (Mujawwad)',
    style: 'mujawwad',
    bitrate: 64,
    everyAyahFolder: 'Minshawy_Mujawwad_64kbps',
    mp3Quran: { server: 10, folder: 'minsh/Almusshaf-Al-Mojawwad' },
  },
  {
    id: 'jibreel',
    nameAr: 'محمد جبريل',
    nameEn: 'Muhammad Jibreel',
    style: 'murattal',
    bitrate: 128,
    alquranCloudId: 'ar.muhammadjibreel',
    everyAyahFolder: 'Muhammad_Jibreel_128kbps',
    mp3Quran: { server: 8, folder: 'jbrl' },
  },
  {
    id: 'ayyoub',
    nameAr: 'محمد أيوب',
    nameEn: 'Muhammad Ayyoub',
    style: 'murattal',
    bitrate: 128,
    alquranCloudId: 'ar.muhammadayyoub',
    everyAyahFolder: 'Muhammad_Ayyoub_128kbps',
    mp3Quran: { server: 8, folder: 'ayyub' },
  },
  {
    id: 'ibrahim_akhdar',
    nameAr: 'إبراهيم الأخضر',
    nameEn: 'Ibrahim Al-Akhdar',
    style: 'murattal',
    bitrate: 32,
    alquranCloudId: 'ar.ibrahimakhbar',
    everyAyahFolder: 'Ibrahim_Akhdar_32kbps',
    quranicAudioDir: 'ibrahim_al_akhdar',
  },
  {
    id: 'ayman_swoaid',
    nameAr: 'أيمن سويد',
    nameEn: 'Ayman Sowaid',
    style: 'murattal',
    bitrate: 64,
    alquranCloudId: 'ar.aymanswoaid',
    everyAyahFolder: 'Ayman_Sowaid_64kbps',
    // Hidden from full-surah pickers until a verified per-surah source exists.
  },
  {
    id: 'bandar_baleela',
    nameAr: 'بندر بليلة',
    nameEn: 'Bandar Baleela',
    style: 'murattal',
    bitrate: 128,
    quranicAudioDir: 'bandar_baleela',
    mp3Quran: { server: 6, folder: 'balilah' },
  },
  {
    id: 'fares_abbad',
    nameAr: 'فارس عباد',
    nameEn: 'Fares Abbad',
    style: 'murattal',
    bitrate: 64,
    everyAyahFolder: 'Fares_Abbad_64kbps',
    mp3Quran: { server: 8, folder: 'frs_a' },
  },
  {
    id: 'khalifa_tunaiji',
    nameAr: 'خليفة الطنيجي',
    nameEn: 'Khalifa Al-Tunaiji',
    style: 'murattal',
    bitrate: 64,
    everyAyahFolder: 'khalefa_al_tunaiji_64kbps',
    quranicAudioDir: 'khalifah_taniji',
    quranCdnId: 161,
  },
  {
    id: 'nasser_qatami',
    nameAr: 'ناصر القطامي',
    nameEn: 'Nasser Al-Qatami',
    style: 'murattal',
    bitrate: 128,
    everyAyahFolder: 'Nasser_Alqatami_128kbps',
    mp3Quran: { server: 6, folder: 'qtm' },
  },
  {
    id: 'khalid_jalil',
    nameAr: 'خالد الجليل',
    nameEn: 'Khalid Al-Jalil',
    style: 'murattal',
    bitrate: 128,
    mp3Quran: { server: 10, folder: 'jleel' },
  },
  {
    id: 'raad_kurdi',
    nameAr: 'رعد محمد الكردي',
    nameEn: 'Raad Al-Kurdi',
    style: 'murattal',
    bitrate: 64,
    mp3Quran: { server: 6, folder: 'kurdi' },
  },
  {
    id: 'mostafa_ismail',
    nameAr: 'مصطفى إسماعيل',
    nameEn: 'Mostafa Ismail',
    style: 'mujawwad',
    bitrate: 128,
    quranicAudioDir: 'mostafa_ismaeel',
    mp3Quran: { server: 8, folder: 'mustafa/Almusshaf-Al-Mojawwad' },
  },
];

/** Lookup map id → entry for O(1) access. */
export const RECITERS_BY_ID: Record<string, ReciterEntry> = Object.fromEntries(
  RECITERS_REGISTRY.map((r) => [r.id, r]),
);

/** True if the reciter supports per-ayah highlight sync (timestamps). */
export function hasPerAyahSync(reciterId: string): boolean {
  return !!RECITERS_BY_ID[reciterId]?.quranCdnId;
}

/** True if the reciter has at least one per-ayah audio source. */
export function hasPerAyahAudio(reciterId: string): boolean {
  const r = RECITERS_BY_ID[reciterId];
  return !!(r && (r.alquranCloudId || r.everyAyahFolder));
}

/** True if the reciter has at least one per-surah audio source. */
export function hasPerSurahAudio(reciterId: string): boolean {
  const r = RECITERS_BY_ID[reciterId];
  return !!(r && (r.quranicAudioDir || r.mp3Quran));
}

/** Default reciter id used at first launch. */
export const DEFAULT_RECITER_ID = 'mishary_alafasy';

/**
 * Migration map from legacy AsyncStorage reciter identifiers (used before the
 * Master Registry refactor) to the new internal ids. Used by QuranContext on
 * mount to upgrade saved selections without losing the user's choice.
 *
 * Old ids that pointed to fake/broken alquran.cloud editions are mapped to
 * their intended reciter when the Arabic name was correct, and to the default
 * reciter when no recovery is possible.
 */
export const LEGACY_RECITER_ID_MAP: Record<string, string> = {
  'ar.alafasy': 'mishary_alafasy',
  'ar.abdulbasitmurattal': 'abdulbasit_murattal',
  'ar.abdulsamad': 'abdulbasit_mujawwad',
  'ar.husary': 'husary',
  'ar.husarymujawwad': 'husary_mujawwad',
  'ar.minshawi': 'minshawi_murattal',
  'ar.minshawimujawwad': 'minshawi_mujawwad',
  'ar.ahmedajamy': 'ahmed_ajamy',
  'ar.muhammadayyoub': 'ayyoub',
  'ar.muhammadjibreel': 'jibreel',
  'ar.maaborimatar': 'maher_muaiqly',
  'ar.mahermuaiqly': 'maher_muaiqly',
  'ar.saaborimatar': 'shuraim',
  'ar.saoodshuraym': 'shuraim',
  'ar.abduraborimatar': 'sudais',
  'ar.abdurrahmaansudais': 'sudais',
  'ar.haborimatar': 'hani_rifai',
  'ar.hanirifai': 'hani_rifai',
  'ar.abdullahbasfar': 'abdullah_basfar',
  'ar.ibrahimakhbar': 'ibrahim_akhdar',
  'ar.shaaborimatar': 'shatri',
  'ar.shaatree': 'shatri',
  'ar.parhizgar': 'nasser_qatami',
  'ar.akaborimatar': 'ali_hudhaify',
  'ar.hudhaify': 'ali_hudhaify',
  'ar.abdulrahmanalsudais': 'ali_hudhaify',
  'ar.abdulbarimatar': 'saad_ghamdi',
  'ar.bandarbalila': 'bandar_baleela',
  'ar.faborimatar': 'fares_abbad',
  'ar.khalifatulttaniji': 'khalifa_tunaiji',
  'extra.yasseraldosari': 'yasser_dosari',
};
