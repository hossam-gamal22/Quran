/**
 * Quran API Service
 * Internal service module - do not expose API sources
 */

const _Q = 'https://api.alquran.cloud/v1';
const _A = 'https://cdn.islamic.network/quran/audio/128';
const _AS = 'https://cdn.islamic.network/quran/audio-surah/128';

export interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

export interface Ayah {
  number: number;
  text: string;
  numberInSurah: number;
  juz: number;
  manzil: number;
  page: number;
  ruku: number;
  hizbQuarter: number;
  sajda: boolean | { id: number; recommended: boolean; obligatory: boolean };
}

export interface SurahDetail extends Surah {
  ayahs: Ayah[];
}

export interface AyahWithTranslation {
  arabic: Ayah;
  translation: Ayah;
}

export interface Reciter {
  identifier: string;
  name: string;
  nameAr: string;
}

export interface Juz {
  number: number;
  ayahs: Ayah[];
  surahs: Record<number, Surah>;
}

// ─── Reciters ────────────────────────────────────────────────────────────────
export const RECITERS: Reciter[] = [
  { identifier: 'ar.alafasy', name: 'Mishary Rashid Alafasy', nameAr: 'مشاري راشد العفاسي' },
  { identifier: 'ar.abdullahbasfar', name: 'Abdullah Basfar', nameAr: 'عبدالله بصفر' },
  { identifier: 'ar.abdurrahmaansudais', name: 'Abdurrahmaan As-Sudais', nameAr: 'عبدالرحمن السديس' },
  { identifier: 'ar.shaatree', name: 'Abu Bakr ash-Shaatree', nameAr: 'أبو بكر الشاطري' },
  { identifier: 'ar.ahmedajamy', name: 'Ahmed ibn Ali al-Ajamy', nameAr: 'أحمد الأعجمي' },
  { identifier: 'ar.mahermuaiqly', name: 'Maher Al Muaiqly', nameAr: 'ماهر المعيقلي' },
  { identifier: 'ar.hanirifai', name: 'Hani Rifai', nameAr: 'هاني الرفاعي' },
  { identifier: 'ar.husary', name: 'Mahmoud Khalil Al-Husary', nameAr: 'محمود خليل الحصري' },
  { identifier: 'ar.minshawi', name: 'Mohamed Siddiq Al-Minshawi', nameAr: 'محمد صديق المنشاوي' },
  { identifier: 'ar.muhammadayyoub', name: 'Muhammad Ayyub', nameAr: 'محمد أيوب' },
  { identifier: 'ar.ibrahimakhbar', name: 'Ibrahim Al-Akhdar', nameAr: 'إبراهيم الأخضر' },
];

// ─── Translations ─────────────────────────────────────────────────────────────
export const TRANSLATION_EDITIONS = [
  { identifier: 'ar.muyassar', name: 'تفسير الميسر' },
  { identifier: 'ar.jalalayn', name: 'تفسير الجلالين' },
  { identifier: 'en.sahih', name: 'Sahih International (EN)' },
  { identifier: 'en.pickthall', name: 'Pickthall (EN)' },
  { identifier: 'en.yusufali', name: 'Yusuf Ali (EN)' },
  { identifier: 'en.asad', name: 'Muhammad Asad (EN)' },
  { identifier: 'fr.hamidullah', name: 'Hamidullah (FR)' },
  { identifier: 'de.aburida', name: 'Abu Rida (DE)' },
  { identifier: 'es.asad', name: 'Muhammad Asad (ES)' },
  { identifier: 'id.indonesian', name: 'Indonesian' },
  { identifier: 'tr.diyanet', name: 'Diyanet (TR)' },
  { identifier: 'ur.jalandhry', name: 'Jalandhry (UR)' },
];

// ─── Arabic Surah Names ───────────────────────────────────────────────────────
export const SURAH_NAMES_AR: string[] = [
  'الفاتحة','البقرة','آل عمران','النساء','المائدة','الأنعام','الأعراف','الأنفال','التوبة','يونس',
  'هود','يوسف','الرعد','إبراهيم','الحجر','النحل','الإسراء','الكهف','مريم','طه',
  'الأنبياء','الحج','المؤمنون','النور','الفرقان','الشعراء','النمل','القصص','العنكبوت','الروم',
  'لقمان','السجدة','الأحزاب','سبأ','فاطر','يس','الصافات','ص','الزمر','غافر',
  'فصلت','الشورى','الزخرف','الدخان','الجاثية','الأحقاف','محمد','الفتح','الحجرات','ق',
  'الذاريات','الطور','النجم','القمر','الرحمن','الواقعة','الحديد','المجادلة','الحشر','الممتحنة',
  'الصف','الجمعة','المنافقون','التغابن','الطلاق','التحريم','الملك','القلم','الحاقة','المعارج',
  'نوح','الجن','المزمل','المدثر','القيامة','الإنسان','المرسلات','النبأ','النازعات','عبس',
  'التكوير','الانفطار','المطففين','الانشقاق','البروج','الطارق','الأعلى','الغاشية','الفجر','البلد',
  'الشمس','الليل','الضحى','الشرح','التين','العلق','القدر','البينة','الزلزلة','العاديات',
  'القارعة','التكاثر','العصر','الهمزة','الفيل','قريش','الماعون','الكوثر','الكافرون','النصر',
  'المسد','الإخلاص','الفلق','الناس',
];

// ─── Sajda Verses ─────────────────────────────────────────────────────────────
const SAJDA_VERSES: Array<[number, number]> = [
  [7,206],[13,15],[16,50],[17,109],[19,58],[22,18],[22,77],[25,60],
  [27,26],[32,15],[38,24],[41,38],[53,62],[84,21],[96,19],
];
export function hasSajda(surahNumber: number, ayahNumber: number): boolean {
  return SAJDA_VERSES.some(([s, a]) => s === surahNumber && a === ayahNumber);
}

// ─── API Functions ────────────────────────────────────────────────────────────
export async function fetchSurahs(): Promise<Surah[]> {
  const response = await fetch(`${_Q}/surah`);
  const data = await response.json();
  if (data.code !== 200) throw new Error('Failed to fetch surahs');
  return data.data;
}

export async function fetchSurah(surahNumber: number): Promise<SurahDetail> {
  const response = await fetch(`${_Q}/surah/${surahNumber}/quran-uthmani`);
  const data = await response.json();
  if (data.code !== 200) throw new Error('Failed to fetch surah');
  return data.data;
}

export async function fetchSurahWithTranslation(
  surahNumber: number,
  edition: string = 'en.sahih'
): Promise<{ arabic: SurahDetail; translation: SurahDetail }> {
  const response = await fetch(
    `${_Q}/surah/${surahNumber}/editions/quran-uthmani,${edition}`
  );
  const data = await response.json();
  if (data.code !== 200) throw new Error('Failed to fetch surah with translation');
  return { arabic: data.data[0], translation: data.data[1] };
}

export async function fetchAyah(ayahNumber: number): Promise<Ayah> {
  const response = await fetch(`${_Q}/ayah/${ayahNumber}/quran-uthmani`);
  const data = await response.json();
  if (data.code !== 200) throw new Error('Failed to fetch ayah');
  return data.data;
}

export async function searchQuran(
  query: string,
  edition: string = 'en.sahih',
  surah: string = 'all'
): Promise<{ count: number; matches: Ayah[] }> {
  const response = await fetch(
    `${_Q}/search/${encodeURIComponent(query)}/${surah}/${edition}`
  );
  const data = await response.json();
  if (data.code !== 200) return { count: 0, matches: [] };
  return data.data;
}

export async function fetchAudioEditions(): Promise<any[]> {
  const response = await fetch(`${_Q}/edition?format=audio&language=ar`);
  const data = await response.json();
  return data.code === 200 ? data.data : [];
}

export function getAyahAudioUrl(ayahNumber: number, reciter: string): string {
  return `${_A}/${reciter}/${ayahNumber}.mp3`;
}

export function getSurahAudioUrl(surahNumber: number, reciter: string): string {
  return `${_AS}/${reciter}/${surahNumber}.mp3`;
}

export async function fetchJuz(juzNumber: number): Promise<Juz> {
  const response = await fetch(`${_Q}/juz/${juzNumber}/quran-uthmani`);
  const data = await response.json();
  if (data.code !== 200) throw new Error('Failed to fetch juz');
  return data.data;
}

// ─── Tafsir ───────────────────────────────────────────────────────────────────
export const TAFSIR_EDITIONS = [
  { identifier: 'ar.muyassar', name: 'الميسر', lang: 'ar' },
  { identifier: 'ar.jalalayn', name: 'الجلالين', lang: 'ar' },
  { identifier: 'ar.kathir', name: 'ابن كثير', lang: 'ar' },
  { identifier: 'ar.waseet', name: 'الوسيط', lang: 'ar' },
  { identifier: 'ar.qurtubi', name: 'القرطبي', lang: 'ar' },
  { identifier: 'en.sahih', name: 'Sahih Intl', lang: 'en' },
  { identifier: 'en.asad', name: 'M. Asad', lang: 'en' },
];

export async function fetchTafsir(
  surahNumber: number,
  ayahNumber: number,
  edition: string = 'ar.muyassar'
): Promise<{ arabicText: string; tafsirText: string }> {
  const [arabicRes, tafsirRes] = await Promise.all([
    fetch(`${_Q}/ayah/${surahNumber}:${ayahNumber}/quran-uthmani`),
    fetch(`${_Q}/ayah/${surahNumber}:${ayahNumber}/${edition}`),
  ]);
  const [arabicData, tafsirData] = await Promise.all([
    arabicRes.json(),
    tafsirRes.json(),
  ]);
  return {
    arabicText: arabicData.code === 200 ? arabicData.data.text : '',
    tafsirText: tafsirData.code === 200 ? tafsirData.data.text : 'لا يتوفر تفسير',
  };
}
