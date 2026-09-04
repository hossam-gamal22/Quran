export type TasbihPresetSource = 'quran' | 'hadith_sahih' | 'hadith_hasan' | 'athar';

export interface SharedTasbihPreset {
  id: number;
  docId: string;
  text: string;
  transliteration: string;
  target: number;
  source: TasbihPresetSource;
  virtue?: string;
  reference?: string;
  order: number;
}

export type AppTasbihPreset = Omit<SharedTasbihPreset, 'docId' | 'order' | 'transliteration'> & {
  transliteration?: string;
};

export type AdminTasbihPreset = Omit<SharedTasbihPreset, 'id' | 'docId'> & {
  id: string;
};

export type RuntimeAppTasbihPreset = AppTasbihPreset & {
  order?: number;
  grade?: string;
};

export interface TasbihOpeningProgress {
  selectedId?: number;
  count?: number;
  totalCount?: number;
  rounds?: number;
}

export const YUNUS_DUA_TASBIH_TEXT = 'لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ';
export const YUNUS_DUA_TASBIH_TRANSLITERATION = 'La ilaha illa anta subhanaka inni kuntu minaz-zalimin';
export const YUNUS_DUA_TASBIH_VIRTUE = 'دعوة ذي النون عليه السلام؛ قال النبي ﷺ: «فإنه لم يدعُ بها رجل مسلم في شيء قط إلا استجاب الله له». ولم يثبت لها عدد مخصوص';
export const YUNUS_DUA_TASBIH_REFERENCE = 'الأنبياء: 87، وسنن الترمذي 3505';
export const YUNUS_DUA_POINT_TARGET = 1;

const FIRST_ISTIGHFAR_PRESET: SharedTasbihPreset = {
  id: 16,
  docId: 'tasbih_default_16',
  text: 'استغفر الله',
  transliteration: 'Astaghfirullah',
  target: 3,
  source: 'hadith_sahih',
  virtue: 'كان النبي ﷺ إذا انصرف من صلاته استغفر ثلاثًا',
  reference: 'صحيح مسلم',
  order: 0,
};

const ORIGINAL_TASBIH_PRESETS: Omit<SharedTasbihPreset, 'order'>[] = [
  { id: 1, docId: 'tasbih_default_1', text: 'سُبْحَانَ اللهِ', transliteration: 'Subhan Allah', target: 33, source: 'hadith_sahih', virtue: 'أحب الكلام إلى الله أربع: سبحان الله، والحمد لله، ولا إله إلا الله، والله أكبر', reference: 'صحيح البخاري ومسلم' },
  { id: 2, docId: 'tasbih_default_2', text: 'الْحَمْدُ لِلَّهِ', transliteration: 'Alhamdulillah', target: 33, source: 'hadith_sahih', virtue: 'الحمد لله تملأ الميزان، وسبحان الله والحمد لله تملآن ما بين السموات والأرض', reference: 'صحيح مسلم' },
  { id: 3, docId: 'tasbih_default_3', text: 'اللهُ أَكْبَرُ', transliteration: 'Allahu Akbar', target: 33, source: 'hadith_sahih', virtue: 'أحب الكلام إلى الله أربع: سبحان الله، والحمد لله، ولا إله إلا الله، والله أكبر', reference: 'صحيح مسلم' },
  { id: 4, docId: 'tasbih_default_4', text: 'لَا إِلَهَ إِلَّا اللهُ', transliteration: 'La ilaha illa Allah', target: 100, source: 'hadith_sahih', virtue: 'أفضل الذكر لا إله إلا الله، وأفضل الدعاء الحمد لله', reference: 'صحيح مسلم' },
  { id: 5, docId: 'tasbih_default_5', text: 'لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ', transliteration: 'La ilaha illa Allahu wahdahu la sharika lah, lahul mulku wa lahul hamdu wa huwa ala kulli shayin qadir', target: 100, source: 'hadith_sahih', virtue: 'من قال لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير — في يوم مئة مرة — كانت له عِدل عشر رقاب', reference: 'متفق عليه' },
  { id: 6, docId: 'tasbih_default_6', text: YUNUS_DUA_TASBIH_TEXT, transliteration: YUNUS_DUA_TASBIH_TRANSLITERATION, target: 1, source: 'quran', virtue: YUNUS_DUA_TASBIH_VIRTUE, reference: YUNUS_DUA_TASBIH_REFERENCE },
  { id: 7, docId: 'tasbih_default_7', text: 'سُبْحَانَ اللهِ وَبِحَمْدِهِ، سُبْحَانَ اللهِ الْعَظِيمِ', transliteration: 'Subhan Allahi wa bihamdihi, subhan Allahil Azeem', target: 100, source: 'hadith_sahih', virtue: 'كلمتان خفيفتان على اللسان، ثقيلتان في الميزان، حبيبتان إلى الرحمن: سبحان الله وبحمده، سبحان الله العظيم', reference: 'صحيح البخاري ومسلم' },
  { id: 8, docId: 'tasbih_default_8', text: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ', transliteration: 'La hawla wa la quwwata illa billah', target: 100, source: 'hadith_sahih', virtue: 'لا حول ولا قوة إلا بالله كنزٌ من كنوز الجنة', reference: 'متفق عليه' },
  { id: 10, docId: 'tasbih_default_10', text: 'أَسْتَغْفِرُ اللهَ الْعَظِيمَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ', transliteration: 'Astaghfirullaha al-Azeem alladhi la ilaha illa huwal Hayyul Qayyumu wa atubu ilayh', target: 3, source: 'hadith_hasan', virtue: 'من قال أستغفر الله العظيم الذي لا إله إلا هو الحي القيوم وأتوب إليه، غُفر له وإن كان فرَّ من الزحف', reference: 'حسن - سنن الترمذي' },
  { id: 11, docId: 'tasbih_default_11', text: 'سُبْحَانَ اللهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَهَ إِلَّا اللهُ، وَاللهُ أَكْبَرُ', transliteration: 'Subhan Allah, wal hamdulillah, wa la ilaha illa Allah, wallahu Akbar', target: 100, source: 'hadith_sahih', virtue: 'أفضل الكلام بعد القرآن أربع وهي من القرآن: سبحان الله، والحمد لله، ولا إله إلا الله، والله أكبر', reference: 'صحيح مسلم' },
  { id: 12, docId: 'tasbih_default_12', text: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ', transliteration: 'Allahumma salli wa sallim ala nabiyyina Muhammad', target: 100, source: 'hadith_sahih', virtue: 'من صلى عليَّ واحدة صلى الله عليه عشرًا', reference: 'صحيح مسلم' },
  { id: 13, docId: 'tasbih_default_13', text: 'رَبِّ اغْفِرْ لِي وَتُبْ عَلَيَّ إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ', transliteration: 'Rabbi ighfir li wa tub alayya innaka antat-Tawwabur-Rahim', target: 100, source: 'hadith_sahih', virtue: 'رب اغفر لي وتب علي إنك أنت التواب الرحيم — من أفضل أدعية الاستغفار', reference: 'صحيح - سنن الترمذي' },
  { id: 14, docId: 'tasbih_default_14', text: 'سُبُّوحٌ قُدُّوسٌ رَبُّ الْمَلَائِكَةِ وَالرُّوحِ', transliteration: 'Subbuhun Quddusun Rabbul malaikati war-ruh', target: 33, source: 'hadith_sahih', virtue: 'سبوح قدوس رب الملائكة والروح — كان النبي ﷺ يقولها في ركوعه وسجوده', reference: 'صحيح مسلم' },
  { id: 15, docId: 'tasbih_default_15', text: 'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ، وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ', transliteration: 'Ya Hayyu Ya Qayyum bi rahmatika astaghith, aslih li shani kullahu, wa la takilni ila nafsi tarfata ayn', target: 7, source: 'hadith_hasan', virtue: 'يا حي يا قيوم برحمتك أستغيث، أصلح لي شأني كله، ولا تكلني إلى نفسي طرفة عين', reference: 'حسن' },
];

export const DEFAULT_TASBIH_PRESETS: SharedTasbihPreset[] = [
  FIRST_ISTIGHFAR_PRESET,
  ...ORIGINAL_TASBIH_PRESETS.map((preset, index) => ({
    ...preset,
    order: index + 1,
  })),
];

export function getDefaultTasbihatForApp(): AppTasbihPreset[] {
  return DEFAULT_TASBIH_PRESETS.map(({ docId: _docId, order: _order, ...preset }) => ({ ...preset }));
}

export function getDefaultTasbihPresetsForAdmin(): AdminTasbihPreset[] {
  return DEFAULT_TASBIH_PRESETS.map(({ docId, id: _id, ...preset }) => ({
    ...preset,
    id: docId,
  }));
}

function stripArabicTashkeel(text: string): string {
  return text.replace(/[\u064B-\u065F\u0670]/g, '');
}

function normalizeArabicText(text: string): string {
  return stripArabicTashkeel(text)
    .replace(/[،,]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function presetIdNumber(id: string | number): number | undefined {
  if (typeof id === 'number' && Number.isFinite(id)) return id;
  if (typeof id !== 'string') return undefined;

  const trailingNumber = id.match(/(\d+)$/)?.[1];
  if (!trailingNumber) return undefined;

  const parsed = Number(trailingNumber);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function defaultPresetByNumber(id: number): SharedTasbihPreset | undefined {
  return DEFAULT_TASBIH_PRESETS.find(preset => preset.id === id);
}

function toAppPreset(preset: SharedTasbihPreset, order = preset.order): RuntimeAppTasbihPreset {
  const { docId: _docId, order: _defaultOrder, ...appPreset } = preset;
  return { ...appPreset, order };
}

function shouldReplaceLegacyText(id: number | undefined, text: string): boolean {
  const normalized = normalizeArabicText(text);

  return (id === 7 && normalized === normalizeArabicText('سُبْحَانَ اللهِ الْعَظِيمِ وَبِحَمْدِهِ'))
    || (id === 15 && normalized === normalizeArabicText('يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ'));
}

function isLegacyDuplicateIstighfar(id: number | undefined, text: string, target: number): boolean {
  return id === 9
    && target === 100
    && normalizeArabicText(text) === normalizeArabicText('أَسْتَغْفِرُ اللهَ');
}

export function reconcileAppTasbihPresets<T extends RuntimeAppTasbihPreset>(presets: T[]): RuntimeAppTasbihPreset[] {
  const ordered = [...presets].sort((a, b) => ((a.order ?? 0) - (b.order ?? 0)) || (a.id - b.id));
  const hasFirstIstighfar = ordered.some(preset => preset.id === FIRST_ISTIGHFAR_PRESET.id);
  const reconciled: RuntimeAppTasbihPreset[] = hasFirstIstighfar ? [] : [toAppPreset(FIRST_ISTIGHFAR_PRESET, 0)];

  for (const preset of ordered) {
    if (isLegacyDuplicateIstighfar(preset.id, preset.text, preset.target)) continue;

    const defaultPreset = defaultPresetByNumber(preset.id);
    const nextPreset = shouldReplaceLegacyText(preset.id, preset.text) && defaultPreset
      ? { ...preset, ...toAppPreset(defaultPreset, preset.order) }
      : { ...preset };

    reconciled.push(nextPreset);
  }

  return reconciled.map((preset, index) => ({ ...preset, order: index }));
}

export function reconcileAdminTasbihPresets<T extends AdminTasbihPreset>(presets: T[]): AdminTasbihPreset[] {
  const ordered = [...presets].sort((a, b) => ((a.order ?? 0) - (b.order ?? 0)) || a.id.localeCompare(b.id));
  const hasFirstIstighfar = ordered.some(preset => presetIdNumber(preset.id) === FIRST_ISTIGHFAR_PRESET.id);
  const reconciled: AdminTasbihPreset[] = hasFirstIstighfar ? [] : [getDefaultTasbihPresetsForAdmin()[0]];

  for (const preset of ordered) {
    const numericId = presetIdNumber(preset.id);
    if (isLegacyDuplicateIstighfar(numericId, preset.text, preset.target)) continue;

    const defaultPreset = DEFAULT_TASBIH_PRESETS.find(item => item.id === numericId);
    const nextPreset = shouldReplaceLegacyText(numericId, preset.text) && defaultPreset
      ? { ...preset, ...getDefaultTasbihPresetsForAdmin().find(item => item.id === defaultPreset.docId) }
      : { ...preset };

    reconciled.push(nextPreset);
  }

  return reconciled.map((preset, index) => ({ ...preset, order: index }));
}

export function getOpeningTasbihPreset<T extends { id: number }>(
  presets: T[],
  progress: TasbihOpeningProgress,
): T | undefined {
  const hasCountingProgress = (progress.count ?? 0) > 0
    || (progress.totalCount ?? 0) > 0
    || (progress.rounds ?? 0) > 0;

  if (!hasCountingProgress) return presets[0];

  return presets.find(preset => preset.id === progress.selectedId) ?? presets[0];
}

function cleanText(text?: string): string | undefined {
  const trimmed = text?.trim();
  return trimmed ? trimmed : undefined;
}

export function resolveTasbihPresetText({
  language,
  bundled,
  fallback,
}: {
  language: string;
  bundled?: string;
  fallback?: string;
}): string | undefined {
  const cleanBundled = cleanText(bundled);
  const cleanFallback = cleanText(fallback);

  if (language === 'ar') {
    return cleanFallback || cleanBundled;
  }

  return cleanBundled || cleanFallback;
}

export function getTasbihVirtueTitle(language: string): string {
  return language === 'ar' ? 'فضل التسبيح' : 'Tasbih Virtue';
}
