/**
 * ContentManager — Admin page for managing all CMS content.
 * Supports Hajj, Umrah, Seerah, and Companions content editing.
 * All content stored in Firestore `appContent` collection.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Save, Plus, Trash2, Edit2, ChevronDown, ChevronUp,
  BookOpen, Mountain, Footprints, Users, RefreshCw,
  GripVertical, AlertCircle, CheckCircle, Calendar, Star,
  Upload, X, Download, ArrowUp, ArrowDown,
} from 'lucide-react';
import { db, storage } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { processImage } from '../utils/imageUpload';
import {
  getDefaultHajjUmrahContent,
  getDefaultSeerahContent,
  getDefaultCompanionsContent,
} from '../data/app-defaults';
import {
  RELIGIOUS_STORY_PRESETS,
  type ReligiousStoryPreset,
} from '../data/religious-story-presets';
import { findCompleteReligiousStory, preferLongerText } from '@app-data/religious-story-complete';
import { expandCompanionsContent } from '@app-data/full-story-texts';
import { dedupByName } from '@app-lib/dedup-by-name';
import {
  getDefaultSeasonalPageContent,
  getDefaultSeasonsMetadata,
} from '../data/seasonal-defaults';
import { getArabicSeasonalBannerCopy } from '@app-lib/seasonal-banner-copy';

// ─── Types (mirror lib/content-api.ts) ──────────────────────────────────

interface CMSStep {
  text: string;
}

interface CMSDua {
  arabic: string;
  note?: string;
}

interface CMSRitualSection {
  title: string;
  titleTranslations?: Record<string, string>;
  icon: string;
  iconUrl?: string;
  iconStoragePath?: string;
  description: string;
  steps: CMSStep[];
  duas: CMSDua[];
}

interface CMSDuaEntry {
  arabic: string;
  reference?: string;
  occasion: string;
}

interface CMSDuaRitualGroup {
  title: string;
  icon: string;
  duas: CMSDuaEntry[];
}

interface HajjUmrahContent {
  umrahSections: CMSRitualSection[];
  hajjSections: CMSRitualSection[];
  duasByRitual: CMSDuaRitualGroup[];
  updatedAt?: string;
}

interface CMSSeerahSection {
  title: string;
  titleEn: string;
  titleTranslations?: Record<string, string>;
  icon: string;
  iconUrl?: string;
  iconStoragePath?: string;
  paragraphs: string[];
  videoUrl?: string;
  videoTitle?: string;
  videoStoragePath?: string;
}

interface SeerahContent {
  sections: CMSSeerahSection[];
  audioUrl?: string;
  audioTitle?: string;
  audioStoragePath?: string;
  updatedAt?: string;
}

interface CMSCompanion {
  id: string;
  nameAr: string;
  nameEn: string;
  nameTranslations?: Record<string, string>;
  category: string;
  brief: string;
  story: string[];
  virtues: string[];
  videoUrl?: string;
  videoTitle?: string;
  videoStoragePath?: string;
  audioUrl?: string;
  audioTitle?: string;
  audioStoragePath?: string;
  transcript?: string;
  transcriptEn?: string;
  icon?: string;
  iconUrl?: string;
  iconStoragePath?: string;
}

interface CompanionsContent {
  companions: CMSCompanion[];
  categories: { key: string; title: string; icon: string }[];
  updatedAt?: string;
}

interface CMSReligiousStory {
  id: string;
  title: string;
  titleEn?: string;
  brief?: string;
  briefEn?: string;
  icon?: string;
  audioUrl: string;
  audioTitle?: string;
  transcript: string;
  transcriptEn?: string;
  sourceUrl?: string;
  order?: number;
}

interface ReligiousStoriesContent {
  stories: CMSReligiousStory[];
  updatedAt?: string;
  contentVersion?: number;
  updateMode?: 'manual' | 'interval';
  refreshIntervalMinutes?: number;
}

interface ArchiveAudioFile {
  name: string;
  format?: string;
  source?: string;
}

interface ArchiveMetadata {
  files?: ArchiveAudioFile[];
  d1?: string;
  d2?: string;
  dir?: string;
  alternate_locations?: {
    servers?: Array<{ server?: string; dir?: string }>;
    workable?: Array<{ server?: string; dir?: string }>;
  };
}

const AUDIO_FILE_EXTENSIONS = ['.mp3', '.m4a', '.ogg', '.wav', '.aac'];
const AUDIO_FORMAT_PRIORITY = ['vbr mp3', 'mp3', 'm4a', 'ogg', 'wav', 'aac'];

function getArchiveIdentifier(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (!url.hostname.endsWith('archive.org')) return null;
    const parts = url.pathname.split('/').filter(Boolean);
    if ((parts[0] === 'details' || parts[0] === 'download' || parts[0] === 'metadata') && parts[1]) {
      return decodeURIComponent(parts[1]);
    }
    if (/^\d+$/.test(parts[0] || '') && parts[1] === 'items' && parts[2]) {
      return decodeURIComponent(parts[2]);
    }
  } catch {
    return null;
  }
  return null;
}

function getArchiveAudioFileName(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (!url.hostname.endsWith('archive.org')) return null;
    const parts = url.pathname.split('/').filter(Boolean);
    if ((parts[0] === 'details' || parts[0] === 'download') && parts[1] && parts.length > 2) {
      return parts.slice(2).map(part => decodeURIComponent(part)).join('/');
    }
    if (/^\d+$/.test(parts[0] || '') && parts[1] === 'items' && parts[2] && parts.length > 3) {
      return parts.slice(3).map(part => decodeURIComponent(part)).join('/');
    }
  } catch {
    return null;
  }
  return null;
}

function isDirectAudioUrl(input: string): boolean {
  const lower = input.trim().toLowerCase().split('?')[0];
  return AUDIO_FILE_EXTENSIONS.some(ext => lower.endsWith(ext));
}

function archiveDownloadUrl(identifier: string, fileName: string): string {
  const encodedPath = fileName
    .split('/')
    .map(part => encodeURIComponent(part))
    .join('/');
  return `https://archive.org/download/${encodeURIComponent(identifier)}/${encodedPath}`;
}

function stripAudioExtension(name: string): string {
  const lower = name.toLowerCase();
  const extension = AUDIO_FILE_EXTENSIONS.find(ext => lower.endsWith(ext));
  return extension ? name.slice(0, -extension.length) : name;
}

function audioFileNameToTitle(fileName: string): string {
  return stripAudioExtension(fileName)
    .replace(/\+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeArchiveAudioName(name: string): string {
  return stripAudioExtension(name)
    .normalize('NFKC')
    .replace(/\+/g, ' ')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[ًٌٍَُِّْٰ]/g, '')
    .replace(/[^0-9a-z\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function archiveDirectFileUrl(identifier: string, metadata: ArchiveMetadata, fileName: string): string {
  const encodedPath = fileName
    .split('/')
    .map(part => encodeURIComponent(part))
    .join('/');
  if (metadata.d1 && metadata.dir) {
    return `https://${metadata.d1}${metadata.dir.replace(/\/$/, '')}/${encodedPath}`;
  }
  if (metadata.d2 && metadata.dir) {
    return `https://${metadata.d2}${metadata.dir.replace(/\/$/, '')}/${encodedPath}`;
  }
  const directLocation = metadata.alternate_locations?.workable?.[0] || metadata.alternate_locations?.servers?.[0];
  if (directLocation?.server && directLocation?.dir) {
    return `https://${directLocation.server}${directLocation.dir.replace(/\/$/, '')}/${encodedPath}`;
  }
  return archiveDownloadUrl(identifier, fileName);
}

function pickArchiveAudioFile(files: ArchiveAudioFile[], requestedName?: string | null): ArchiveAudioFile | null {
  const audioFiles = files.filter(file => {
    const name = (file.name || '').toLowerCase();
    return AUDIO_FILE_EXTENSIONS.some(ext => name.endsWith(ext));
  });
  if (audioFiles.length === 0) return null;

  if (requestedName) {
    const requestedWithSpaces = requestedName.replace(/\+/g, ' ');
    const exactMatch = audioFiles.find(file => file.name === requestedName || file.name === requestedWithSpaces);
    if (exactMatch) return exactMatch;

    const requestedNormalized = normalizeArchiveAudioName(requestedName);
    const normalizedMatch = audioFiles.find(file => normalizeArchiveAudioName(file.name) === requestedNormalized);
    if (normalizedMatch) return normalizedMatch;
  }

  return [...audioFiles].sort((a, b) => {
    const aName = (a.name || '').toLowerCase();
    const bName = (b.name || '').toLowerCase();
    const aFormat = (a.format || '').toLowerCase();
    const bFormat = (b.format || '').toLowerCase();
    const aScore = AUDIO_FORMAT_PRIORITY.findIndex(token => aFormat.includes(token) || aName.endsWith(`.${token.replace('vbr ', '')}`));
    const bScore = AUDIO_FORMAT_PRIORITY.findIndex(token => bFormat.includes(token) || bName.endsWith(`.${token.replace('vbr ', '')}`));
    return (aScore === -1 ? 99 : aScore) - (bScore === -1 ? 99 : bScore);
  })[0];
}

async function resolveArchiveAudioUrl(input: string): Promise<{ audioUrl: string; sourceUrl: string; fileName: string }> {
  const trimmed = input.trim();
  if (!trimmed) throw new Error('empty');
  const identifier = getArchiveIdentifier(trimmed);
  if (isDirectAudioUrl(trimmed)) {
    const archiveFileName = getArchiveAudioFileName(trimmed);
    if (identifier && archiveFileName) {
      const res = await fetch(`https://archive.org/metadata/${encodeURIComponent(identifier)}`);
      if (!res.ok) throw new Error('metadata');
      const metadata = await res.json() as ArchiveMetadata;
      const audioFile = pickArchiveAudioFile(metadata.files || [], archiveFileName);
      if (!audioFile) throw new Error('no-audio');
      return {
        audioUrl: archiveDirectFileUrl(identifier, metadata, audioFile.name),
        sourceUrl: `https://archive.org/details/${encodeURIComponent(identifier)}`,
        fileName: audioFile.name,
      };
    }
    return {
      audioUrl: trimmed,
      sourceUrl: identifier ? `https://archive.org/details/${encodeURIComponent(identifier)}` : trimmed,
      fileName: decodeURIComponent(trimmed.split('/').pop()?.split('?')[0] || ''),
    };
  }
  if (!identifier) throw new Error('not-archive');
  const res = await fetch(`https://archive.org/metadata/${encodeURIComponent(identifier)}`);
  if (!res.ok) throw new Error('metadata');
  const metadata = await res.json() as ArchiveMetadata;
  const audioFile = pickArchiveAudioFile(metadata.files || [], getArchiveAudioFileName(trimmed));
  if (!audioFile) throw new Error('no-audio');
  return {
    audioUrl: archiveDirectFileUrl(identifier, metadata, audioFile.name),
    sourceUrl: `https://archive.org/details/${encodeURIComponent(identifier)}`,
    fileName: audioFile.name,
  };
}

function normalizeSearchText(value?: string): string {
  return (value || '')
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[ًٌٍَُِّْ]/g, '')
    .trim();
}

function presetSearchText(preset: ReligiousStoryPreset): string {
  return normalizeSearchText([
    preset.label,
    preset.title,
    preset.titleEn,
    preset.brief,
    preset.briefEn,
  ].filter(Boolean).join(' '));
}

function findReligiousStoryPreset(story: CMSReligiousStory): ReligiousStoryPreset | undefined {
  const title = normalizeSearchText(story.title);
  const titleEn = normalizeSearchText(story.titleEn);
  if (!title && !titleEn) return undefined;
  return ACTIVE_RELIGIOUS_STORY_PRESETS.find((preset) => {
    const presetTitle = normalizeSearchText(preset.title);
    const presetTitleEn = normalizeSearchText(preset.titleEn);
    const presetLabel = normalizeSearchText(preset.label);
    return Boolean(
      (title && (title === presetTitle || title.includes(presetLabel) || presetLabel.includes(title))) ||
      (titleEn && presetTitleEn && (titleEn === presetTitleEn || titleEn.includes(presetTitleEn) || presetTitleEn.includes(titleEn)))
    );
  });
}

function hydrateReligiousStoryFromPreset(story: CMSReligiousStory): CMSReligiousStory {
  const preset = findReligiousStoryPreset(story);
  const complete = findCompleteReligiousStory(story);
  if (!preset && !complete) return story;
  // Canonical text comes from the preset (which already merges in the complete
  // dataset for prophets). Stored transcripts are kept only when they look
  // like admin-extended versions of the preset; otherwise (e.g. a previous
  // hydration leak left Adam's text under the Dajjal record) we trust the
  // canonical source.
  const canonicalTranscript = preset?.transcript || complete?.transcript || '';
  const canonicalTranscriptEn = preset?.transcriptEn || complete?.transcriptEn || '';
  return {
    ...story,
    title: complete?.title || story.title || preset?.title || '',
    titleEn: complete?.titleEn || story.titleEn || preset?.titleEn,
    brief: complete?.brief || story.brief || preset?.brief,
    briefEn: complete?.briefEn || story.briefEn || preset?.briefEn,
    transcript: reconcilePresetTranscript(canonicalTranscript, story.transcript),
    transcriptEn: reconcilePresetTranscript(canonicalTranscriptEn, story.transcriptEn),
    icon: '',
  };
}

function splitFullStoryText(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map(part => part.trim())
    .filter(Boolean);
}

function getCompanionFullStory(companion: CMSCompanion): string {
  const transcript = (companion.transcript || '').trim();
  const storyText = (companion.story || []).filter(Boolean).join('\n\n').trim();
  if (!transcript) return storyText;
  if (!storyText) return transcript;
  return transcript.length >= storyText.length ? transcript : storyText;
}

function normalizeCompanionForSave(companion: CMSCompanion): CMSCompanion {
  const fullStory = getCompanionFullStory(companion);
  return {
    ...companion,
    transcript: fullStory,
    story: splitFullStoryText(fullStory),
    virtues: (companion.virtues || []).map(v => v.trim()).filter(Boolean),
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function sanitizeForFirestore<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => item === undefined ? null : sanitizeForFirestore(item)) as T;
  }
  if (!isPlainObject(value)) return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, sanitizeForFirestore(item)])
  ) as T;
}

// ─── Seasonal CMS types ────────────────────────────────────────────────

interface CMSSeasonalDua {
  id: string;
  titleKey: string;
  arabic: string;
  translation: string;
}

interface CMSSeasonalChecklist {
  id: string;
  icon: string;
  labelKey: string;
  color: string;
}

interface SeasonalPageContent {
  duas: CMSSeasonalDua[];
  checklist: CMSSeasonalChecklist[];
  updatedAt?: string;
}

type SeasonalPageKey = 'ramadan' | 'hajj' | 'mawlid' | 'ashura';

const SEASONAL_PAGES: { key: SeasonalPageKey; label: string }[] = [
  { key: 'ramadan', label: 'رمضان' },
  { key: 'hajj', label: 'الحج' },
  { key: 'mawlid', label: 'المولد النبوي' },
  { key: 'ashura', label: 'عاشوراء' },
];

// ─── Seasons Metadata types ────────────────────────────────────────────

interface AdminSpecialDay {
  day: number;
  nameAr: string;
  nameEn: string;
  description: string;
  virtues: string[];
  recommendedActions: string[];
}

interface AdminSeasonMeta {
  type: string;
  nameAr: string;
  nameEn: string;
  description: string;
  startDate: { month: number; day: number };
  endDate: { month: number; day: number };
  color: string;
  icon: string;
  specialDays?: AdminSpecialDay[];
  greetings?: string[];
}

interface SeasonsMetadata {
  seasons: Record<string, AdminSeasonMeta>;
  updatedAt?: string;
}

const SEASON_KEYS: { key: string; label: string }[] = [
  { key: 'ramadan', label: 'رمضان' },
  { key: 'hajj', label: 'موسم الحج' },
  { key: 'dhul_hijjah', label: 'العشر الأوائل' },
  { key: 'ashura', label: 'عاشوراء' },
  { key: 'mawlid', label: 'المولد النبوي' },
  { key: 'eid_fitr', label: 'عيد الفطر' },
  { key: 'eid_adha', label: 'عيد الأضحى' },
  { key: 'muharram', label: 'محرم' },
  { key: 'rajab', label: 'رجب' },
  { key: 'shaban', label: 'شعبان' },
];

// ─── Tab types ─────────────────────────────────────────────────────────

type ContentTab = 'hajj' | 'umrah' | 'duas' | 'seerah' | 'companions' | 'religiousStories' | 'seasonal' | 'seasons';

const TABS: { key: ContentTab; label: string; icon: React.ElementType }[] = [
  { key: 'hajj', label: 'مناسك الحج', icon: Mountain },
  { key: 'umrah', label: 'مناسك العمرة', icon: Footprints },
  { key: 'duas', label: 'الأدعية', icon: BookOpen },
  { key: 'seerah', label: 'السيرة النبوية', icon: BookOpen },
  { key: 'companions', label: 'الصحابة', icon: Users },
  { key: 'religiousStories', label: 'قصص دينية', icon: BookOpen },
  { key: 'seasonal', label: 'المواسم', icon: Calendar },
  { key: 'seasons', label: 'بيانات المواسم', icon: Star },
];

const getFullDefaultCompanionsContent = () =>
  expandCompanionsContent(getDefaultCompanionsContent()) as unknown as CompanionsContent;

// Adds any companion present in the bundled defaults but missing from
// Firestore (matched by id). Preserves Firestore order; new entries are
// appended in the order they appear in the defaults list. Existing edits
// in Firestore are untouched.
function syncCompanionsWithDefaults(
  current: CompanionsContent
): { content: CompanionsContent; changed: boolean; summary: string } {
  const defaults = getFullDefaultCompanionsContent();
  const existingIds = new Set((current.companions || []).map((c) => c.id).filter(Boolean));

  const newlyAdded: CMSCompanion[] = [];
  for (const def of defaults.companions || []) {
    if (def.id && !existingIds.has(def.id)) {
      newlyAdded.push(def as CMSCompanion);
    }
  }

  if (newlyAdded.length === 0) {
    return { content: current, changed: false, summary: '' };
  }

  return {
    content: { ...current, companions: [...(current.companions || []), ...newlyAdded] },
    changed: true,
    summary: `أُضيف ${newlyAdded.length} صحابي مفقود من قائمة التطبيق`,
  };
}

const withDefaultSeasonalPageContent = (
  page: SeasonalPageKey,
  data: SeasonalPageContent | null
): SeasonalPageContent => {
  const defaults = getDefaultSeasonalPageContent(page) as SeasonalPageContent;
  if (!data) return defaults;

  const mergeDuas = (items: CMSSeasonalDua[] | undefined) => (
    items?.length
      ? items.map((item) => {
        const fallback = defaults.duas.find((dua) => dua.id === item.id);
        return fallback ? { ...fallback, ...item } : item;
      })
      : defaults.duas
  );

  const mergeChecklist = (items: CMSSeasonalChecklist[] | undefined) => (
    items?.length
      ? items.map((item) => {
        const fallback = defaults.checklist.find((checklistItem) => checklistItem.id === item.id);
        return fallback ? { ...fallback, ...item } : item;
      })
      : defaults.checklist
  );

  return {
    ...defaults,
    ...data,
    duas: mergeDuas(data.duas),
    checklist: mergeChecklist(data.checklist),
  };
};

const hasUsableDate = (date?: { month: number; day: number }) => (
  Boolean(date && date.month >= 1 && date.month <= 12 && date.day >= 1 && date.day <= 30)
);

const withUnifiedSeasonMetaCopy = (key: string, meta: AdminSeasonMeta): AdminSeasonMeta => {
  const copy = getArabicSeasonalBannerCopy(key);
  if (!copy) return meta;

  return {
    ...meta,
    nameAr: copy.title || meta.nameAr,
    description: copy.subtitle,
    greetings: [copy.subtitle],
  };
};

const withUnifiedSeasonsMetadataCopy = (data: SeasonsMetadata): SeasonsMetadata => ({
  ...data,
  seasons: Object.fromEntries(
    Object.entries(data.seasons || {}).map(([key, season]) => [
      key,
      withUnifiedSeasonMetaCopy(key, season),
    ])
  ),
});

const withDefaultSeasonsMetadata = (data: SeasonsMetadata | null): SeasonsMetadata => {
  const defaults = getDefaultSeasonsMetadata() as SeasonsMetadata;
  if (!data?.seasons) return defaults;

  const mergeSpecialDays = (
    currentDays: AdminSpecialDay[] | undefined,
    fallbackDays: AdminSpecialDay[] | undefined
  ) => {
    if (!currentDays?.length) return fallbackDays;

    return currentDays.map((day) => {
      const fallback = fallbackDays?.find((fallbackDay) => fallbackDay.day === day.day);
      return fallback ? { ...fallback, ...day } : day;
    });
  };

  const seasons: Record<string, AdminSeasonMeta> = {};
  const allKeys = new Set([...Object.keys(defaults.seasons), ...Object.keys(data.seasons)]);

  allKeys.forEach((key) => {
    const fallback = defaults.seasons[key];
    const current = data.seasons[key];

    if (!fallback) {
      seasons[key] = current;
      return;
    }

    if (!current) {
      seasons[key] = fallback;
      return;
    }

    const hasPlaceholderRange =
      current.startDate?.month === 1 &&
      current.startDate?.day === 1 &&
      current.endDate?.month === 1 &&
      current.endDate?.day === 30 &&
      (
        fallback.startDate.month !== 1 ||
        fallback.startDate.day !== 1 ||
        fallback.endDate.month !== 1 ||
        fallback.endDate.day !== 30
      );
    const hasPlaceholderIcon = current.icon === 'calendar' && fallback.icon !== 'calendar';
    const hasPlaceholderColor = current.color === '#2f7659' && fallback.color !== '#2f7659';

    seasons[key] = withUnifiedSeasonMetaCopy(key, {
      ...fallback,
      ...current,
      nameAr: current.nameAr || fallback.nameAr,
      nameEn: current.nameEn || fallback.nameEn,
      description: current.description || fallback.description,
      startDate: !hasPlaceholderRange && hasUsableDate(current.startDate) ? current.startDate : fallback.startDate,
      endDate: !hasPlaceholderRange && hasUsableDate(current.endDate) ? current.endDate : fallback.endDate,
      color: !hasPlaceholderColor && current.color ? current.color : fallback.color,
      icon: !hasPlaceholderIcon && current.icon ? current.icon : fallback.icon,
      specialDays: key === 'shaban' ? fallback.specialDays : mergeSpecialDays(current.specialDays, fallback.specialDays),
      greetings: ['rajab', 'shaban'].includes(key) ? fallback.greetings : (current.greetings?.length ? current.greetings : fallback.greetings),
    });
  });

  return {
    ...data,
    seasons,
  };
};

// ─── Icon Upload Helper Component ──────────────────────────────────────

const CONTENT_ICON_STORAGE_PATH = 'content-icons';
const MAX_ICON_SIZE_MB = 5;

function IconUploadField({
  iconUrl,
  iconStoragePath,
  onUpload,
  onRemove,
  label,
}: {
  iconUrl?: string;
  iconStoragePath?: string;
  onUpload: (url: string, storagePath: string) => void;
  onRemove: () => void;
  label?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_ICON_SIZE_MB * 1024 * 1024) {
      alert(`حجم الملف أكبر من ${MAX_ICON_SIZE_MB} MB`);
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('يجب اختيار ملف صورة');
      return;
    }

    setUploading(true);
    try {
      const isSvg = file.type === 'image/svg+xml';
      let uploadBlob: Blob;
      let contentType: string;
      let ext: string;

      if (isSvg) {
        uploadBlob = file;
        contentType = 'image/svg+xml';
        ext = 'svg';
      } else {
        const processed = await processImage(file);
        uploadBlob = processed.blob;
        contentType = processed.contentType;
        ext = processed.ext;
      }

      const fileName = `icon_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.[^.]+$/, '')}.${ext}`;
      const storagePath = `${CONTENT_ICON_STORAGE_PATH}/${fileName}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, uploadBlob, { contentType });
      const url = await getDownloadURL(storageRef);
      onUpload(url, storagePath);
    } catch (err) {
      alert(`خطأ في رفع الصورة: ${(err as Error).message}`);
    }
    setUploading(false);
    if (e.target) e.target.value = '';
  };

  const handleRemove = async () => {
    if (!confirm('هل تريد إزالة الأيقونة؟')) return;
    if (iconStoragePath) {
      try {
        await deleteObject(ref(storage, iconStoragePath));
      } catch {
        // Storage file may not exist
      }
    }
    onRemove();
  };

  return (
    <div>
      <label className="text-xs text-slate-400 mb-1 block">{label || 'صورة الأيقونة'}</label>
      {iconUrl ? (
        <div className="flex items-center gap-2">
          <img src={iconUrl} alt="icon" className="w-10 h-10 rounded-lg object-cover border border-admin-border" />
          <button onClick={handleRemove} className="text-xs text-red-400 hover:text-red-300" title="إزالة الأيقونة" aria-label="إزالة الأيقونة">
            <X size={14} />
          </button>
          <button onClick={() => fileRef.current?.click()} className="text-xs text-accent-light hover:text-emerald-300">تغيير</button>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 px-3 py-1.5 bg-admin-surface border border-admin-border rounded text-xs text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-50"
        >
          {uploading ? <RefreshCw size={12} className="animate-spin" /> : <Upload size={12} />}
          {uploading ? 'جاري الرفع...' : 'رفع صورة'}
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" title="اختيار ملف صورة" />
    </div>
  );
}

// ─── Video Upload Field ────────────────────────────────────────────────

const CONTENT_VIDEO_STORAGE_PATH = 'content-videos';
const MAX_VIDEO_SIZE_MB = 200;
const VIDEO_ACCEPT = 'video/mp4,video/quicktime,video/webm,video/x-m4v';
const CONTENT_AUDIO_STORAGE_PATH = 'content-audio';
const MAX_AUDIO_SIZE_MB = 120;
const AUDIO_ACCEPT = 'audio/mpeg,audio/mp4,audio/aac,audio/wav,audio/ogg,audio/webm,audio/x-m4a,.mp3,.m4a,.aac,.wav,.ogg,.webm';

function VideoUploadField({
  videoUrl,
  videoStoragePath,
  onUpload,
  onClear,
}: {
  videoUrl?: string;
  videoStoragePath?: string;
  onUpload: (url: string, storagePath: string) => void;
  onClear: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const isHostedFile = !!videoStoragePath;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
      alert(`حجم الفيديو أكبر من ${MAX_VIDEO_SIZE_MB} MB`);
      return;
    }
    if (!file.type.startsWith('video/')) {
      alert('يجب اختيار ملف فيديو (MP4 / MOV / WebM)');
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      // Remove old file if replacing
      if (videoStoragePath) {
        try {
          await deleteObject(ref(storage, videoStoragePath));
        } catch {
          // Previous file may not exist
        }
      }

      const ext = (file.name.match(/\.[^.]+$/)?.[0] ?? '.mp4').toLowerCase();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.[^.]+$/, '');
      const fileName = `video_${Date.now()}_${safeName}${ext}`;
      const storagePath = `${CONTENT_VIDEO_STORAGE_PATH}/${fileName}`;
      const storageRef = ref(storage, storagePath);

      // Manual progress via XHR-style isn't available in modular SDK without uploadBytesResumable,
      // but for a clean UX a determinate spinner is enough; switch to resumable if needed later.
      await uploadBytes(storageRef, file, { contentType: file.type || 'video/mp4' });
      setProgress(100);
      const url = await getDownloadURL(storageRef);
      onUpload(url, storagePath);
    } catch (err) {
      alert(`خطأ في رفع الفيديو: ${(err as Error).message}`);
    } finally {
      setUploading(false);
      setProgress(0);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemove = async () => {
    if (!confirm('هل تريد إزالة الفيديو المرفوع؟')) return;
    if (videoStoragePath) {
      try {
        await deleteObject(ref(storage, videoStoragePath));
      } catch {
        // Storage file may not exist
      }
    }
    onClear();
  };

  return (
    <div className="border border-admin-border rounded-lg p-3 bg-admin-bg/30">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400">رفع فيديو مباشر (بديل لرابط يوتيوب)</span>
        {isHostedFile && (
          <button
            onClick={handleRemove}
            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
            title="حذف الفيديو المرفوع"
          >
            <X size={12} /> حذف
          </button>
        )}
      </div>

      {isHostedFile && videoUrl ? (
        <div className="space-y-2">
          <video
            src={videoUrl}
            controls
            className="w-full rounded border border-admin-border bg-black max-h-48"
            preload="metadata"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1 px-3 py-1.5 bg-admin-surface border border-admin-border rounded text-xs text-slate-300 hover:text-white disabled:opacity-50"
            >
              {uploading ? <RefreshCw size={12} className="animate-spin" /> : <Upload size={12} />}
              {uploading ? `جاري الرفع ${progress}%` : 'استبدال الفيديو'}
            </button>
            <span className="text-xs text-slate-500 truncate" dir="ltr">{videoUrl}</span>
          </div>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 px-3 py-3 bg-admin-surface border border-dashed border-admin-border rounded text-xs text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-50"
        >
          {uploading ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              جاري رفع الفيديو...
            </>
          ) : (
            <>
              <Upload size={14} />
              اختر ملف فيديو (MP4 / MOV / WebM, حد أقصى {MAX_VIDEO_SIZE_MB} MB)
            </>
          )}
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept={VIDEO_ACCEPT}
        onChange={handleUpload}
        className="hidden"
        title="اختيار ملف فيديو"
      />
    </div>
  );
}

// ─── Audio Upload Field ────────────────────────────────────────────────

function AudioUploadField({
  audioUrl,
  audioStoragePath,
  onUpload,
  onClear,
}: {
  audioUrl?: string;
  audioStoragePath?: string;
  onUpload: (url: string, storagePath: string) => void;
  onClear: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isHostedFile = !!audioStoragePath;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isAudioFile = file.type.startsWith('audio/') || /\.(mp3|m4a|aac|wav|ogg|webm)$/i.test(file.name);
    if (file.size > MAX_AUDIO_SIZE_MB * 1024 * 1024) {
      alert(`حجم الصوت أكبر من ${MAX_AUDIO_SIZE_MB} MB`);
      return;
    }
    if (!isAudioFile) {
      alert('يجب اختيار ملف صوت MP3 / M4A / AAC / WAV / OGG');
      return;
    }

    setUploading(true);
    try {
      if (audioStoragePath) {
        try {
          await deleteObject(ref(storage, audioStoragePath));
        } catch {
          // Previous file may not exist
        }
      }

      const ext = (file.name.match(/\.[^.]+$/)?.[0] ?? '.mp3').toLowerCase();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.[^.]+$/, '');
      const fileName = `audio_${Date.now()}_${safeName}${ext}`;
      const storagePath = `${CONTENT_AUDIO_STORAGE_PATH}/${fileName}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file, { contentType: file.type || 'audio/mpeg' });
      const url = await getDownloadURL(storageRef);
      onUpload(url, storagePath);
    } catch (err) {
      alert(`خطأ في رفع الصوت: ${(err as Error).message}`);
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemove = async () => {
    if (!confirm('هل تريد إزالة ملف الصوت المرفوع؟')) return;
    if (audioStoragePath) {
      try {
        await deleteObject(ref(storage, audioStoragePath));
      } catch {
        // Storage file may not exist
      }
    }
    onClear();
  };

  return (
    <div className="border border-admin-border rounded-lg p-3 bg-admin-bg/30">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400">رفع ملف صوت مباشر للقصة</span>
        {isHostedFile && (
          <button
            onClick={handleRemove}
            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
            title="حذف الصوت المرفوع"
          >
            <X size={12} /> حذف
          </button>
        )}
      </div>

      {isHostedFile && audioUrl ? (
        <div className="space-y-2">
          <audio src={audioUrl} controls className="w-full" preload="metadata" />
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1 px-3 py-1.5 bg-admin-surface border border-admin-border rounded text-xs text-slate-300 hover:text-white disabled:opacity-50"
            >
              {uploading ? <RefreshCw size={12} className="animate-spin" /> : <Upload size={12} />}
              {uploading ? 'جاري الرفع...' : 'استبدال الصوت'}
            </button>
            <span className="text-xs text-slate-500 truncate" dir="ltr">{audioUrl}</span>
          </div>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 px-3 py-3 bg-admin-surface border border-dashed border-admin-border rounded text-xs text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-50"
        >
          {uploading ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              جاري رفع الصوت...
            </>
          ) : (
            <>
              <Upload size={14} />
              اختر ملف صوت (MP3 / M4A / AAC، حد أقصى {MAX_AUDIO_SIZE_MB} MB)
            </>
          )}
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept={AUDIO_ACCEPT}
        onChange={handleUpload}
        className="hidden"
        title="اختيار ملف صوت"
      />
    </div>
  );
}

// ─── Internet Archive Audio Resolver ───────────────────────────────────

function ArchiveAudioUrlField({
  value,
  disabled,
  onChange,
  onResolve,
  label = 'رابط صفحة Internet Archive أو ملف صوت مباشر',
  placeholder = 'https://archive.org/details/... أو https://archive.org/download/.../story.mp3',
}: {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onResolve: (audioUrl: string, fileName: string, sourceUrl: string) => void;
  label?: string;
  placeholder?: string;
}) {
  const [resolving, setResolving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleResolve = async () => {
    const input = value.trim();
    if (!input || disabled) return;
    if (isDirectAudioUrl(input) && !getArchiveIdentifier(input)) {
      setMessage({ type: 'success', text: 'الرابط مباشر وجاهز للاستخدام.' });
      return;
    }
    if (!getArchiveIdentifier(input)) return;
    setResolving(true);
    setMessage(null);
    try {
      const resolved = await resolveArchiveAudioUrl(input);
      onResolve(resolved.audioUrl, resolved.fileName, resolved.sourceUrl);
      setMessage({ type: 'success', text: `تم جلب رابط الصوت: ${resolved.fileName}` });
    } catch (err) {
      const reason = (err as Error).message;
      const text =
        reason === 'no-audio'
          ? 'لم أجد ملف صوت داخل صفحة الأرشيف.'
          : reason === 'not-archive'
            ? 'ضع رابط Internet Archive صحيح أو رابط صوت مباشر.'
            : 'تعذر جلب بيانات Internet Archive الآن.';
      setMessage({ type: 'error', text });
    } finally {
      setResolving(false);
    }
  };

  return (
    <div>
      <label className="text-xs text-slate-400 mb-1 block">{label}</label>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => {
            setMessage(null);
            onChange(e.target.value);
          }}
          onBlur={handleResolve}
          disabled={disabled}
          className="flex-1 bg-admin-surface border border-admin-border rounded px-3 py-2 text-white text-left text-sm disabled:opacity-40"
          dir="ltr"
          title={label}
          aria-label={label}
          placeholder={disabled ? 'تم استخدام صوت مرفوع — احذفه لاستخدام رابط' : placeholder}
        />
        <button
          type="button"
          onClick={handleResolve}
          disabled={disabled || resolving || !value.trim()}
          className="flex items-center gap-1 px-3 py-2 bg-admin-surface border border-admin-border rounded text-xs text-slate-300 hover:text-white disabled:opacity-40"
          title="جلب رابط الصوت المباشر"
        >
          <RefreshCw size={13} className={resolving ? 'animate-spin' : ''} />
          {resolving ? 'جاري الجلب' : 'جلب الرابط'}
        </button>
      </div>
      {message && (
        <p className={`text-xs mt-1 ${message.type === 'success' ? 'text-accent-light' : 'text-red-400'}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}

// ─── Ritual Section Editor ─────────────────────────────────────────────

function RitualSectionEditor({
  section,
  index,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  section: CMSRitualSection;
  index: number;
  onUpdate: (updated: CMSRitualSection) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const updateField = (field: keyof CMSRitualSection, value: string) => {
    onUpdate({ ...section, [field]: value });
  };

  const addStep = () => {
    onUpdate({ ...section, steps: [...section.steps, { text: '' }] });
  };

  const updateStep = (i: number, text: string) => {
    const steps = [...section.steps];
    steps[i] = { text };
    onUpdate({ ...section, steps });
  };

  const removeStep = (i: number) => {
    onUpdate({ ...section, steps: section.steps.filter((_, idx) => idx !== i) });
  };

  const addDua = () => {
    onUpdate({ ...section, duas: [...section.duas, { arabic: '', note: '' }] });
  };

  const updateDua = (i: number, field: keyof CMSDua, value: string) => {
    const duas = [...section.duas];
    duas[i] = { ...duas[i], [field]: value };
    onUpdate({ ...section, duas });
  };

  const removeDua = (i: number) => {
    onUpdate({ ...section, duas: section.duas.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="border border-admin-border rounded-lg mb-3 overflow-hidden">
      <div className="flex items-center gap-2 p-3 bg-admin-surface cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
            disabled={isFirst}
            className="p-1 hover:bg-admin-surface-light rounded disabled:opacity-30"
            title="تحريك لأعلى"
            aria-label="تحريك لأعلى"
          >
            <ChevronUp size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
            disabled={isLast}
            className="p-1 hover:bg-admin-surface-light rounded disabled:opacity-30"
            title="تحريك لأسفل"
            aria-label="تحريك لأسفل"
          >
            <ChevronDown size={14} />
          </button>
        </div>
        <GripVertical size={16} className="text-slate-500" />
        <span className="text-sm font-medium text-slate-300 flex-1">
          {index + 1}. {section.title || 'قسم جديد'}
        </span>
        <span className="text-xs text-slate-500">
          {section.steps.length} خطوة • {section.duas.length} دعاء
        </span>
        <button onClick={(e) => { e.stopPropagation(); if (confirm(`هل تريد حذف القسم "${section.title || 'قسم جديد'}"؟`)) onDelete(); }} className="p-1 hover:bg-red-900/30 rounded" title="حذف القسم">
          <Trash2 size={14} className="text-red-400" />
        </button>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>

      {expanded && (
        <div className="p-4 space-y-4 bg-admin-bg/50">
          {/* Basic fields */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">العنوان</label>
              <input
                value={section.title}
                onChange={(e) => updateField('title', e.target.value)}
                className="w-full bg-admin-surface border border-admin-border rounded px-3 py-2 text-white text-right"
                dir="rtl"
                title="العنوان"
                aria-label="العنوان"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">الأيقونة (MaterialCommunityIcons)</label>
              <input
                value={section.icon}
                onChange={(e) => updateField('icon', e.target.value)}
                className="w-full bg-admin-surface border border-admin-border rounded px-3 py-2 text-white"
                placeholder="e.g. mosque, walk, tent"
                aria-label="الأيقونة"
              />
            </div>
            <IconUploadField
              iconUrl={section.iconUrl}
              iconStoragePath={section.iconStoragePath}
              onUpload={(url, path) => onUpdate({ ...section, iconUrl: url, iconStoragePath: path })}
              onRemove={() => onUpdate({ ...section, iconUrl: undefined, iconStoragePath: undefined })}
            />
          </div>
          {/* Title translations */}
          {section.titleTranslations && Object.keys(section.titleTranslations).length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(section.titleTranslations).map(([lang, val]) => (
                <div key={lang}>
                  <label className="text-xs text-slate-500 mb-0.5 block">{lang}</label>
                  <input
                    value={val}
                    onChange={(e) => onUpdate({ ...section, titleTranslations: { ...section.titleTranslations, [lang]: e.target.value } })}
                    className="w-full bg-admin-surface border border-admin-border rounded px-2 py-1 text-white text-xs"
                    title={`ترجمة ${lang}`}
                    aria-label={`ترجمة ${lang}`}
                  />
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => {
              const langs: Record<string, string> = { ...(section.titleTranslations || {}) };
              ['en','fr','tr','ur','id','de','es','bn','ms','ru'].forEach(l => { if (!langs[l]) langs[l] = ''; });
              onUpdate({ ...section, titleTranslations: langs });
            }}
            className="text-xs text-accent-light hover:text-emerald-300"
          >
            {section.titleTranslations ? '+ تعديل الترجمات' : '+ إضافة ترجمات العنوان'}
          </button>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">الوصف</label>
            <textarea
              value={section.description}
              onChange={(e) => updateField('description', e.target.value)}
              className="w-full bg-admin-surface border border-admin-border rounded px-3 py-2 text-white text-right min-h-[60px]"
              dir="rtl"
              title="الوصف"
              aria-label="الوصف"
              placeholder="وصف القسم"
            />
          </div>

          {/* Steps */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <button onClick={addStep} className="flex items-center gap-1 text-xs text-accent-light hover:text-emerald-300">
                <Plus size={14} /> إضافة خطوة
              </button>
              <span className="text-xs text-slate-400 font-medium">الخطوات ({section.steps.length})</span>
            </div>
            {section.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2 mb-2">
                <span className="text-xs text-slate-500 mt-2 w-5 text-center">{i + 1}</span>
                <textarea
                  value={step.text}
                  onChange={(e) => updateStep(i, e.target.value)}
                  className="flex-1 bg-admin-surface border border-admin-border rounded px-3 py-2 text-white text-right text-sm min-h-[40px]"
                  dir="rtl"
                  title="نص الخطوة"
                  aria-label="نص الخطوة"
                  placeholder="أدخل نص الخطوة"
                />
                <button onClick={() => removeStep(i)} className="p-1 mt-1 hover:bg-red-900/30 rounded" title="حذف الخطوة">
                  <Trash2 size={12} className="text-red-400" />
                </button>
              </div>
            ))}
          </div>

          {/* Duas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <button onClick={addDua} className="flex items-center gap-1 text-xs text-accent-light hover:text-emerald-300">
                <Plus size={14} /> إضافة دعاء
              </button>
              <span className="text-xs text-slate-400 font-medium">الأدعية ({section.duas.length})</span>
            </div>
            {section.duas.map((dua, i) => (
              <div key={i} className="border border-admin-border rounded p-3 mb-2 bg-admin-surface/50">
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <textarea
                      value={dua.arabic}
                      onChange={(e) => updateDua(i, 'arabic', e.target.value)}
                      placeholder="نص الدعاء بالعربية"
                      className="w-full bg-admin-surface border border-admin-border rounded px-3 py-2 text-white text-right text-sm min-h-[50px]"
                      dir="rtl"
                      aria-label="نص الدعاء"
                    />
                    <input
                      value={dua.note || ''}
                      onChange={(e) => updateDua(i, 'note', e.target.value)}
                      placeholder="ملاحظة (اختياري)"
                      className="w-full bg-admin-surface border border-admin-border rounded px-3 py-2 text-white text-right text-sm"
                      dir="rtl"
                      aria-label="ملاحظة"
                    />
                  </div>
                  <button onClick={() => removeDua(i)} className="p-1 hover:bg-red-900/30 rounded" title="حذف الدعاء">
                    <Trash2 size={12} className="text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Dua Group Editor (for DUAS_BY_RITUAL tab) ─────────────────────────

function DuaGroupEditor({
  group,
  index,
  onUpdate,
  onDelete,
}: {
  group: CMSDuaRitualGroup;
  index: number;
  onUpdate: (updated: CMSDuaRitualGroup) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const addDua = () => {
    onUpdate({ ...group, duas: [...group.duas, { arabic: '', reference: '', occasion: '' }] });
  };

  const updateDua = (i: number, field: keyof CMSDuaEntry, value: string) => {
    const duas = [...group.duas];
    duas[i] = { ...duas[i], [field]: value };
    onUpdate({ ...group, duas });
  };

  const removeDua = (i: number) => {
    onUpdate({ ...group, duas: group.duas.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="border border-admin-border rounded-lg mb-3 overflow-hidden">
      <div className="flex items-center gap-2 p-3 bg-admin-surface cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <span className="text-sm font-medium text-slate-300 flex-1">
          {index + 1}. {group.title || 'مجموعة جديدة'}
        </span>
        <span className="text-xs text-slate-500">{group.duas.length} دعاء</span>
        <button onClick={(e) => { e.stopPropagation(); if (confirm(`هل تريد حذف المجموعة "${group.title || 'مجموعة جديدة'}"؟`)) onDelete(); }} className="p-1 hover:bg-red-900/30 rounded" title="حذف المجموعة">
          <Trash2 size={14} className="text-red-400" />
        </button>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>

      {expanded && (
        <div className="p-4 space-y-4 bg-admin-bg/50">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">عنوان المجموعة</label>
              <input
                value={group.title}
                onChange={(e) => onUpdate({ ...group, title: e.target.value })}
                className="w-full bg-admin-surface border border-admin-border rounded px-3 py-2 text-white text-right"
                dir="rtl"
                title="عنوان المجموعة"
                aria-label="عنوان المجموعة"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">الأيقونة</label>
              <input
                value={group.icon}
                onChange={(e) => onUpdate({ ...group, icon: e.target.value })}
                className="w-full bg-admin-surface border border-admin-border rounded px-3 py-2 text-white"
                title="أيقونة المجموعة"
                aria-label="أيقونة المجموعة"
                placeholder="e.g. mosque, walk"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <button onClick={addDua} className="flex items-center gap-1 text-xs text-accent-light hover:text-emerald-300">
                <Plus size={14} /> إضافة دعاء
              </button>
              <span className="text-xs text-slate-400 font-medium">الأدعية ({group.duas.length})</span>
            </div>
            {group.duas.map((dua, i) => (
              <div key={i} className="border border-admin-border rounded p-3 mb-2 bg-admin-surface/50">
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <textarea
                      value={dua.arabic}
                      onChange={(e) => updateDua(i, 'arabic', e.target.value)}
                      placeholder="نص الدعاء"
                      className="w-full bg-admin-surface border border-admin-border rounded px-3 py-2 text-white text-right text-sm min-h-[50px]"
                      dir="rtl"
                      aria-label="نص الدعاء"
                    />
                    <input
                      value={dua.occasion}
                      onChange={(e) => updateDua(i, 'occasion', e.target.value)}
                      placeholder="المناسبة"
                      className="w-full bg-admin-surface border border-admin-border rounded px-3 py-2 text-white text-right text-sm"
                      dir="rtl"
                      aria-label="المناسبة"
                    />
                    <input
                      value={dua.reference || ''}
                      onChange={(e) => updateDua(i, 'reference', e.target.value)}
                      placeholder="المرجع (اختياري)"
                      className="w-full bg-admin-surface border border-admin-border rounded px-3 py-2 text-white text-right text-sm"
                      dir="rtl"
                      aria-label="المرجع"
                    />
                  </div>
                  <button onClick={() => removeDua(i)} className="p-1 hover:bg-red-900/30 rounded" title="حذف الدعاء">
                    <Trash2 size={12} className="text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Seerah Section Editor ─────────────────────────────────────────────

function SeerahSectionEditor({
  section,
  index,
  onUpdate,
  onDelete,
}: {
  section: CMSSeerahSection;
  index: number;
  onUpdate: (updated: CMSSeerahSection) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const addParagraph = () => {
    onUpdate({ ...section, paragraphs: [...section.paragraphs, ''] });
  };

  const updateParagraph = (i: number, text: string) => {
    const paragraphs = [...section.paragraphs];
    paragraphs[i] = text;
    onUpdate({ ...section, paragraphs });
  };

  const removeParagraph = (i: number) => {
    onUpdate({ ...section, paragraphs: section.paragraphs.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="border border-admin-border rounded-lg mb-3 overflow-hidden">
      <div className="flex items-center gap-2 p-3 bg-admin-surface cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <span className="text-sm font-medium text-slate-300 flex-1">
          {index + 1}. {section.title || 'قسم جديد'}
        </span>
        <span className="text-xs text-slate-500">{section.paragraphs.length} فقرة</span>
        <button onClick={(e) => { e.stopPropagation(); if (confirm(`هل تريد حذف القسم "${section.title || 'قسم جديد'}"؟`)) onDelete(); }} className="p-1 hover:bg-red-900/30 rounded" title="حذف القسم">
          <Trash2 size={14} className="text-red-400" />
        </button>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>

      {expanded && (
        <div className="p-4 space-y-4 bg-admin-bg/50">
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">العنوان (عربي)</label>
              <input
                value={section.title}
                onChange={(e) => onUpdate({ ...section, title: e.target.value })}
                className="w-full bg-admin-surface border border-admin-border rounded px-3 py-2 text-white text-right"
                dir="rtl"
                title="عنوان القسم"
                aria-label="عنوان القسم"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">العنوان (إنجليزي)</label>
              <input
                value={section.titleEn}
                onChange={(e) => onUpdate({ ...section, titleEn: e.target.value })}
                className="w-full bg-admin-surface border border-admin-border rounded px-3 py-2 text-white"
                title="العنوان بالإنجليزية"
                aria-label="العنوان بالإنجليزية"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">الأيقونة</label>
              <input
                value={section.icon}
                onChange={(e) => onUpdate({ ...section, icon: e.target.value })}
                className="w-full bg-admin-surface border border-admin-border rounded px-3 py-2 text-white"
                title="أيقونة القسم"
                aria-label="أيقونة القسم"
              />
            </div>
            <IconUploadField
              iconUrl={section.iconUrl}
              iconStoragePath={section.iconStoragePath}
              onUpload={(url, path) => onUpdate({ ...section, iconUrl: url, iconStoragePath: path })}
              onRemove={() => onUpdate({ ...section, iconUrl: undefined, iconStoragePath: undefined })}
            />
          </div>
          {/* Title translations */}
          {section.titleTranslations && Object.keys(section.titleTranslations).length > 0 && (
            <div className="grid grid-cols-5 gap-2">
              {Object.entries(section.titleTranslations).map(([lang, val]) => (
                <div key={lang}>
                  <label className="text-xs text-slate-500 mb-0.5 block">{lang}</label>
                  <input
                    value={val}
                    onChange={(e) => onUpdate({ ...section, titleTranslations: { ...section.titleTranslations, [lang]: e.target.value } })}
                    className="w-full bg-admin-surface border border-admin-border rounded px-2 py-1 text-white text-xs"
                    title={`ترجمة ${lang}`}
                    aria-label={`ترجمة ${lang}`}
                  />
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => {
              const langs: Record<string, string> = { ...(section.titleTranslations || {}) };
              ['fr','tr','ur','id','de','es','bn','ms','ru'].forEach(l => { if (!langs[l]) langs[l] = ''; });
              onUpdate({ ...section, titleTranslations: langs });
            }}
            className="text-xs text-accent-light hover:text-emerald-300"
          >
            {section.titleTranslations ? '+ تعديل الترجمات' : '+ إضافة ترجمات العنوان'}
          </button>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">عنوان الفيديو (اختياري)</label>
              <input
                value={section.videoTitle || ''}
                onChange={(e) => onUpdate({ ...section, videoTitle: e.target.value })}
                className="w-full bg-admin-surface border border-admin-border rounded px-3 py-2 text-white text-right"
                dir="rtl"
                title="عنوان الفيديو"
                aria-label="عنوان الفيديو"
                placeholder="مثال: شرح مختصر للفصل"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-400 mb-1 block">رابط يوتيوب أو فيمو (اختياري)</label>
              <textarea
                value={section.videoStoragePath ? '' : section.videoUrl || ''}
                onChange={(e) => onUpdate({ ...section, videoUrl: e.target.value, videoStoragePath: undefined })}
                disabled={!!section.videoStoragePath}
                className="w-full bg-admin-surface border border-admin-border rounded px-3 py-2 text-white text-left text-sm min-h-[78px] disabled:opacity-40"
                dir="ltr"
                title="رابط أو كود الفيديو"
                aria-label="رابط أو كود الفيديو"
                placeholder={section.videoStoragePath ? 'تم استخدام فيديو مرفوع — احذفه لاستخدام رابط' : 'YouTube URL أو كود iframe'}
              />
            </div>
          </div>

          <VideoUploadField
            videoUrl={section.videoStoragePath ? section.videoUrl : undefined}
            videoStoragePath={section.videoStoragePath}
            onUpload={(url, storagePath) =>
              onUpdate({ ...section, videoUrl: url, videoStoragePath: storagePath })
            }
            onClear={() => onUpdate({ ...section, videoUrl: undefined, videoStoragePath: undefined })}
          />

          <div>
            <div className="flex items-center justify-between mb-2">
              <button onClick={addParagraph} className="flex items-center gap-1 text-xs text-accent-light hover:text-emerald-300">
                <Plus size={14} /> إضافة فقرة
              </button>
              <span className="text-xs text-slate-400 font-medium">الفقرات ({section.paragraphs.length})</span>
            </div>
            {section.paragraphs.map((p, i) => (
              <div key={i} className="flex items-start gap-2 mb-2">
                <span className="text-xs text-slate-500 mt-2 w-5 text-center">{i + 1}</span>
                <textarea
                  value={p}
                  onChange={(e) => updateParagraph(i, e.target.value)}
                  className="flex-1 bg-admin-surface border border-admin-border rounded px-3 py-2 text-white text-right text-sm min-h-[80px]"
                  dir="rtl"
                  title="نص الفقرة"
                  aria-label="نص الفقرة"
                  placeholder="أدخل نص الفقرة"
                />
                <button onClick={() => removeParagraph(i)} className="p-1 mt-1 hover:bg-red-900/30 rounded" title="حذف الفقرة">
                  <Trash2 size={12} className="text-red-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Companion Editor ───────────────────────────────────────────────────

function CompanionEditor({
  companion,
  index,
  total,
  categories,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onMoveTo,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
}: {
  companion: CMSCompanion;
  index: number;
  total: number;
  categories: { key: string; title: string }[];
  onUpdate: (updated: CMSCompanion) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveTo: (newIndex: number) => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  isDragOver: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [orderInput, setOrderInput] = useState<string>(String(index + 1));
  useEffect(() => { setOrderInput(String(index + 1)); }, [index]);
  const fullStoryText = getCompanionFullStory(companion);
  const categoryTitle = categories.find(c => c.key === companion.category)?.title || companion.category;

  const commitOrder = () => {
    const parsed = Number(orderInput);
    if (!Number.isFinite(parsed)) { setOrderInput(String(index + 1)); return; }
    const target = Math.max(1, Math.min(total, Math.floor(parsed))) - 1;
    if (target !== index) onMoveTo(target);
    else setOrderInput(String(index + 1));
  };

  const updateFullStory = (text: string) => {
    onUpdate({
      ...companion,
      transcript: text,
      story: splitFullStoryText(text),
    });
  };

  const addVirtue = () => {
    onUpdate({ ...companion, virtues: [...companion.virtues, ''] });
  };

  const updateVirtue = (i: number, text: string) => {
    const virtues = [...companion.virtues];
    virtues[i] = text;
    onUpdate({ ...companion, virtues });
  };

  const removeVirtue = (i: number) => {
    onUpdate({ ...companion, virtues: companion.virtues.filter((_, idx) => idx !== i) });
  };

  return (
    <div
      className={`border rounded-lg mb-3 overflow-hidden transition-colors ${isDragOver ? 'border-accent-light bg-accent-dark/10' : 'border-admin-border'}`}
      onDragOver={(e) => { e.preventDefault(); onDragOver(e); }}
      onDrop={(e) => { e.preventDefault(); onDrop(); }}
    >
      <div className="flex items-center gap-2 p-3 bg-admin-surface cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <span
          draggable
          onDragStart={(e) => { e.stopPropagation(); onDragStart(); e.dataTransfer.effectAllowed = 'move'; }}
          onClick={(e) => e.stopPropagation()}
          className="p-1 rounded text-slate-400 hover:text-white cursor-grab active:cursor-grabbing"
          title="اسحب لإعادة الترتيب"
          aria-label="اسحب لإعادة الترتيب"
        >
          <GripVertical size={14} />
        </span>
        <input
          type="number"
          min={1}
          max={total}
          value={orderInput}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setOrderInput(e.target.value)}
          onBlur={commitOrder}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }}
          className="w-14 bg-admin-bg border border-admin-border rounded px-2 py-1 text-white text-center text-xs"
          title="اكتب الرقم الجديد للترتيب"
          aria-label="ترتيب جديد"
        />
        <span className="text-sm font-medium text-slate-300 flex-1">
          {index + 1}. {companion.nameAr || 'صحابي جديد'}
        </span>
        <span className="text-xs text-slate-500">{categoryTitle}</span>
        <span className={`text-xs ${companion.audioUrl?.trim() ? 'text-accent-light' : 'text-amber-400'}`}>
          {companion.audioUrl?.trim() ? 'صوت جاهز' : 'ينقصها رابط صوت'}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
          disabled={index === 0}
          className="p-1 rounded text-slate-300 hover:text-white hover:bg-admin-bg/40 disabled:opacity-30 disabled:cursor-not-allowed"
          title="نقل للأعلى"
          aria-label="نقل للأعلى"
        >
          <ArrowUp size={14} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
          disabled={index >= total - 1}
          className="p-1 rounded text-slate-300 hover:text-white hover:bg-admin-bg/40 disabled:opacity-30 disabled:cursor-not-allowed"
          title="نقل للأسفل"
          aria-label="نقل للأسفل"
        >
          <ArrowDown size={14} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); if (confirm(`هل تريد حذف "${companion.nameAr || 'صحابي جديد'}"؟`)) onDelete(); }} className="p-1 hover:bg-red-900/30 rounded" title="حذف">
          <Trash2 size={14} className="text-red-400" />
        </button>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>

      {expanded && (
        <div className="p-4 space-y-3 bg-admin-bg/50">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">الاسم (عربي)</label>
              <input
                value={companion.nameAr}
                onChange={(e) => onUpdate({ ...companion, nameAr: e.target.value })}
                className="w-full bg-admin-surface border border-admin-border rounded px-3 py-2 text-white text-right"
                dir="rtl"
                title="اسم الصحابي"
                aria-label="اسم الصحابي"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">الاسم (إنجليزي)</label>
              <input
                value={companion.nameEn}
                onChange={(e) => onUpdate({ ...companion, nameEn: e.target.value })}
                className="w-full bg-admin-surface border border-admin-border rounded px-3 py-2 text-white"
                dir="ltr"
                title="الاسم بالإنجليزيةجليزية"
                aria-label="الاسم بالإنجليزية"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">التصنيف</label>
              <select
                value={companion.category}
                onChange={(e) => onUpdate({ ...companion, category: e.target.value })}
                className="w-full bg-admin-surface border border-admin-border rounded px-3 py-2 text-white"
                title="اختر التصنيف"
                aria-label="التصنيف"
              >
                {categories.map((c) => (
                  <option key={c.key} value={c.key}>{c.title}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-slate-400 mb-1 block">الوصف المختصر</label>
              <input
                value={companion.brief}
                onChange={(e) => onUpdate({ ...companion, brief: e.target.value })}
                className="w-full bg-admin-surface border border-admin-border rounded px-3 py-2 text-white text-right"
                dir="rtl"
                title="وصف مختصر"
                aria-label="الوصف المختصر"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">ترتيب العرض</label>
              <input
                type="number"
                value={index}
                readOnly
                className="w-full bg-admin-surface border border-admin-border rounded px-3 py-2 text-slate-400"
                title="ترتيب العرض"
                aria-label="ترتيب العرض"
              />
            </div>
          </div>
          {/* Name translations */}
          {companion.nameTranslations && Object.keys(companion.nameTranslations).length > 0 && (
            <div className="grid grid-cols-5 gap-2">
              {Object.entries(companion.nameTranslations).map(([lang, val]) => (
                <div key={lang}>
                  <label className="text-xs text-slate-500 mb-0.5 block">{lang}</label>
                  <input
                    value={val}
                    onChange={(e) => onUpdate({ ...companion, nameTranslations: { ...companion.nameTranslations, [lang]: e.target.value } })}
                    className="w-full bg-admin-surface border border-admin-border rounded px-2 py-1 text-white text-xs"
                    title={`ترجمة الاسم ${lang}`}
                    aria-label={`ترجمة الاسم ${lang}`}
                  />
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => {
              const langs: Record<string, string> = { ...(companion.nameTranslations || {}) };
              ['fr','tr','ur','id','de','es','bn','ms','ru'].forEach(l => { if (!langs[l]) langs[l] = ''; });
              onUpdate({ ...companion, nameTranslations: langs });
            }}
            className="text-xs text-accent-light hover:text-emerald-300"
          >
            {companion.nameTranslations ? '+ تعديل ترجمات الاسم' : '+ إضافة ترجمات الاسم'}
          </button>
          <div className="border border-admin-border rounded-lg p-3 bg-admin-bg/30 space-y-3">
            <div className="text-right">
              <h4 className="text-sm font-semibold text-white">صوت القصة من Internet Archive</h4>
              <p className="text-xs text-slate-400 mt-1">
                ضع رابط صفحة الأرشيف أو رابط MP3 مباشر، وسيتم تحويل صفحة الأرشيف تلقائيًا لرابط صوت مباشر. الاستماع داخل التطبيق أونلاين فقط.
              </p>
            </div>
            <div>
              <ArchiveAudioUrlField
                value={companion.audioUrl || ''}
                onChange={(value) => onUpdate({ ...companion, audioUrl: value })}
                onResolve={(audioUrl, fileName) => onUpdate({
                  ...companion,
                  audioUrl,
                  audioTitle: companion.audioTitle || audioFileNameToTitle(fileName),
                })}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">عنوان الاستماع (اختياري)</label>
              <input
                value={audioFileNameToTitle(companion.audioTitle || '')}
                onChange={(e) => onUpdate({ ...companion, audioTitle: audioFileNameToTitle(e.target.value) })}
                className="w-full bg-admin-surface border border-admin-border rounded px-3 py-2 text-white text-right"
                dir="rtl"
                title="عنوان الاستماع"
                aria-label="عنوان الاستماع"
                placeholder="مثال: استمع إلى قصة أبي بكر"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 font-medium mb-2 block text-right">نص القصة الكامل</label>
            <textarea
              value={fullStoryText}
              onChange={(e) => updateFullStory(e.target.value)}
              className="w-full bg-admin-surface border border-admin-border rounded px-3 py-2 text-white text-right text-sm min-h-[220px]"
              dir="rtl"
              title="نص القصة الكامل"
              aria-label="نص القصة الكامل"
              placeholder="اكتب القصة كاملة هنا..."
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 font-medium mb-2 block text-left">Full story text (English)</label>
            <textarea
              value={companion.transcriptEn || ''}
              onChange={(e) => onUpdate({ ...companion, transcriptEn: e.target.value })}
              className="w-full bg-admin-surface border border-admin-border rounded px-3 py-2 text-white text-left text-sm min-h-[150px]"
              dir="ltr"
              title="Full story text in English"
              aria-label="Full story text in English"
              placeholder="Write the full English story here..."
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <button onClick={addVirtue} className="flex items-center gap-1 text-xs text-accent-light hover:text-emerald-300">
                <Plus size={14} /> إضافة منقبة
              </button>
              <span className="text-xs text-slate-400 font-medium">المناقب ({companion.virtues.length})</span>
            </div>
            {companion.virtues.map((v, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <input
                  value={v}
                  onChange={(e) => updateVirtue(i, e.target.value)}
                  className="flex-1 bg-admin-surface border border-admin-border rounded px-3 py-2 text-white text-right text-sm"
                  dir="rtl"
                  title="نص المنقبة"
                  aria-label="نص المنقبة"
                />
                <button onClick={() => removeVirtue(i)} className="p-1 hover:bg-red-900/30 rounded" title="حذف المنقبة">
                  <Trash2 size={12} className="text-red-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Religious Story Editor ─────────────────────────────────────────────

function ReligiousStoryEditor({
  story,
  index,
  total,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onMoveTo,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
}: {
  story: CMSReligiousStory;
  index: number;
  total: number;
  onUpdate: (updated: CMSReligiousStory) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveTo: (newIndex: number) => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  isDragOver: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [presetSearch, setPresetSearch] = useState('');
  const [orderInput, setOrderInput] = useState<string>(String(index + 1));
  useEffect(() => { setOrderInput(String(index + 1)); }, [index]);
  const matchedPreset = findReligiousStoryPreset(story);
  const effectiveStory = hydrateReligiousStoryFromPreset(story);
  const presetQuery = normalizeSearchText(presetSearch);
  const filteredPresets = useMemo(() => {
    if (!presetQuery) return [];
    return ACTIVE_RELIGIOUS_STORY_PRESETS.filter((preset) => presetSearchText(preset).includes(presetQuery));
  }, [presetQuery]);

  const commitOrder = () => {
    const parsed = Number(orderInput);
    if (!Number.isFinite(parsed)) { setOrderInput(String(index + 1)); return; }
    const target = Math.max(1, Math.min(total, Math.floor(parsed))) - 1;
    if (target !== index) onMoveTo(target);
    else setOrderInput(String(index + 1));
  };

  const applyStoryPreset = (presetId: string) => {
    const preset = ACTIVE_RELIGIOUS_STORY_PRESETS.find(item => item.id === presetId);
    if (!preset) return;
    const hasText = Boolean(story.title.trim() || story.brief?.trim() || (story.transcript || '').trim());
    if (hasText && !confirm('سيتم استبدال العنوان والوصف ونص القصة بالقصة الجاهزة، مع الحفاظ على رابط الصوت الحالي. هل تريد المتابعة؟')) {
      return;
    }
    onUpdate({
      ...story,
      title: preset.title,
      titleEn: preset.titleEn || '',
      brief: preset.brief,
      briefEn: preset.briefEn || '',
      icon: '',
      transcript: preset.transcript,
      transcriptEn: preset.transcriptEn || '',
      audioTitle: story.audioTitle || preset.title,
    });
    setPresetSearch('');
  };

  return (
    <div
      className={`border rounded-lg mb-3 overflow-hidden transition-colors ${isDragOver ? 'border-accent-light bg-accent-dark/10' : 'border-admin-border'}`}
      onDragOver={(e) => { e.preventDefault(); onDragOver(e); }}
      onDrop={(e) => { e.preventDefault(); onDrop(); }}
    >
      <div className="flex items-center gap-2 p-3 bg-admin-surface cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <span
          draggable
          onDragStart={(e) => { e.stopPropagation(); onDragStart(); e.dataTransfer.effectAllowed = 'move'; }}
          onClick={(e) => e.stopPropagation()}
          className="p-1 rounded text-slate-400 hover:text-white cursor-grab active:cursor-grabbing"
          title="اسحب لإعادة الترتيب"
          aria-label="اسحب لإعادة الترتيب"
        >
          <GripVertical size={14} />
        </span>
        <input
          type="number"
          min={1}
          max={total}
          value={orderInput}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setOrderInput(e.target.value)}
          onBlur={commitOrder}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }}
          className="w-14 bg-admin-bg border border-admin-border rounded px-2 py-1 text-white text-center text-xs"
          title="اكتب الرقم الجديد للترتيب"
          aria-label="ترتيب جديد"
        />
        <span className="text-sm font-medium text-slate-300 flex-1">
          {index + 1}. {story.title || 'قصة جديدة'}
        </span>
        <span className={`text-xs ${story.audioUrl?.trim() ? 'text-accent-light' : 'text-amber-400'}`}>
          {story.audioUrl?.trim() ? 'صوت جاهز' : 'ينقصها رابط صوت'}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
          disabled={index === 0}
          className="p-1 rounded text-slate-300 hover:text-white hover:bg-admin-bg/40 disabled:opacity-30 disabled:cursor-not-allowed"
          title="نقل للأعلى"
          aria-label="نقل للأعلى"
        >
          <ArrowUp size={14} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
          disabled={index >= total - 1}
          className="p-1 rounded text-slate-300 hover:text-white hover:bg-admin-bg/40 disabled:opacity-30 disabled:cursor-not-allowed"
          title="نقل للأسفل"
          aria-label="نقل للأسفل"
        >
          <ArrowDown size={14} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); if (confirm(`هل تريد حذف "${story.title || 'قصة جديدة'}"؟`)) onDelete(); }} className="p-1 hover:bg-red-900/30 rounded" title="حذف">
          <Trash2 size={14} className="text-red-400" />
        </button>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>

      {expanded && (
        <div className="p-4 space-y-3 bg-admin-bg/50">
          <div className="border border-accent-dark/30 rounded-lg p-3 bg-accent-dark/10">
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-xs text-slate-400 text-right">
                ابحث باسم النبي أو الرسول لملء العنوان والوصف ونص القصة العربي والإنجليزي. رابط الصوت الحالي لا يتغير.
              </p>
              <label className="text-sm font-semibold text-white whitespace-nowrap">بحث القصص الجاهزة</label>
            </div>
            <input
              value={presetSearch}
              onChange={(e) => setPresetSearch(e.target.value)}
              className="w-full bg-admin-surface border border-admin-border rounded px-3 py-2 text-white text-right"
              dir="rtl"
              placeholder="اكتب مثل: موسى، يوسف، إبراهيم، نوح..."
              title="البحث باسم النبي أو الرسول"
              aria-label="البحث باسم النبي أو الرسول"
            />
            {matchedPreset && (
              <button
                type="button"
                onClick={() => applyStoryPreset(matchedPreset.id)}
                className="mt-2 w-full rounded border border-accent-dark/40 bg-accent-dark/20 px-3 py-2 text-sm text-accent-light hover:bg-accent-dark/30"
              >
                تحديث هذه القصة من البيانات الجاهزة: {matchedPreset.label}
              </button>
            )}
            {!!presetQuery && (
              <div className="mt-2 max-h-48 overflow-y-auto rounded border border-admin-border bg-admin-bg/40">
                {filteredPresets.length === 0 ? (
                  <div className="px-3 py-3 text-center text-sm text-slate-400">لا توجد نتائج</div>
                ) : (
                  filteredPresets.map((preset) => (
                    <button
                      type="button"
                      key={preset.id}
                      onClick={() => applyStoryPreset(preset.id)}
                      className="flex w-full items-center justify-between gap-3 border-b border-admin-border/60 px-3 py-2 text-right hover:bg-admin-surface last:border-b-0"
                    >
                      <span className="text-xs text-slate-500">نبي</span>
                      <span className="flex-1 text-sm text-white">{preset.label}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">عنوان القصة (عربي)</label>
              <input
                value={story.title}
                onChange={(e) => onUpdate({ ...story, title: e.target.value })}
                className="w-full bg-admin-surface border border-admin-border rounded px-3 py-2 text-white text-right"
                dir="rtl"
                title="عنوان القصة"
                aria-label="عنوان القصة"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">العنوان (إنجليزي اختياري)</label>
              <input
                value={effectiveStory.titleEn || ''}
                onChange={(e) => onUpdate({ ...story, titleEn: e.target.value })}
                className="w-full bg-admin-surface border border-admin-border rounded px-3 py-2 text-white"
                dir="ltr"
                title="العنوان بالإنجليزية"
                aria-label="العنوان بالإنجليزية"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">وصف مختصر</label>
            <input
              value={story.brief || ''}
              onChange={(e) => onUpdate({ ...story, brief: e.target.value })}
              className="w-full bg-admin-surface border border-admin-border rounded px-3 py-2 text-white text-right"
              dir="rtl"
              title="وصف مختصر"
              aria-label="وصف مختصر"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">Short description (English)</label>
            <input
              value={effectiveStory.briefEn || ''}
              onChange={(e) => onUpdate({ ...story, briefEn: e.target.value })}
              className="w-full bg-admin-surface border border-admin-border rounded px-3 py-2 text-white text-left"
              dir="ltr"
              title="Short description in English"
              aria-label="Short description in English"
              placeholder="English description shown when the app language is English"
            />
          </div>

          <div className="border border-admin-border rounded-lg p-3 bg-admin-bg/30 space-y-3">
              <div className="text-right">
                <h4 className="text-sm font-semibold text-white">صوت القصة من Internet Archive</h4>
                <p className="text-xs text-slate-400 mt-1">
                ضع رابط صفحة الأرشيف أو رابط MP3 مباشر، وسيتم تحويل صفحة الأرشيف تلقائيًا لرابط صوت مباشر. الاستماع داخل التطبيق أونلاين فقط.
              </p>
            </div>
            <div>
              <ArchiveAudioUrlField
                value={story.audioUrl || ''}
                onChange={(value) => onUpdate({ ...story, audioUrl: value })}
                onResolve={(audioUrl, fileName, sourceUrl) => onUpdate({
                  ...story,
                  audioUrl,
                  sourceUrl,
                  audioTitle: story.audioTitle || audioFileNameToTitle(fileName),
                })}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">عنوان الاستماع (اختياري)</label>
              <input
                value={audioFileNameToTitle(story.audioTitle || '')}
                onChange={(e) => onUpdate({ ...story, audioTitle: audioFileNameToTitle(e.target.value) })}
                className="w-full bg-admin-surface border border-admin-border rounded px-3 py-2 text-white text-right"
                dir="rtl"
                title="عنوان الاستماع"
                aria-label="عنوان الاستماع"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block text-right">نص القصة الكامل (اختياري للقراءة والتمرير التلقائي)</label>
            <textarea
              value={effectiveStory.transcript || ''}
              onChange={(e) => onUpdate({ ...story, transcript: e.target.value })}
              className="w-full bg-admin-surface border border-admin-border rounded px-3 py-2 text-white text-right text-sm min-h-[190px]"
              dir="rtl"
              title="نص القصة الكامل"
              aria-label="نص القصة الكامل"
              placeholder="اكتب القصة كاملة هنا..."
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">Full story text (English)</label>
            <textarea
              value={effectiveStory.transcriptEn || ''}
              onChange={(e) => onUpdate({ ...story, transcriptEn: e.target.value })}
              className="w-full bg-admin-surface border border-admin-border rounded px-3 py-2 text-white text-left text-sm min-h-[190px]"
              dir="ltr"
              title="Full story text in English"
              aria-label="Full story text in English"
              placeholder="Write the full English story here..."
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Religious stories auto-sync ─────────────────────────────────────────
// Reconciles the Firestore religiousStoriesContent doc against the bundled
// preset catalog on every load so the admin sees the latest content without
// manual re-publishing.
//
//   1. removes stories whose id is in REMOVED_STORY_IDS (deleted presets)
//   2. for stories whose id matches a preset, refreshes text fields from the
//      preset (preserves audio/video URLs and admin-uploaded media)
//   3. adds any preset that isn't yet in Firestore
//   4. runs dedup-by-name as a final pass

const REMOVED_STORY_IDS = new Set<string>([
  // Standalone Ishaq merged into the combined Ishaq + Yaqub story.
  'prophet-ishaq',
  // Six religious-story entries removed for being political/historical or
  // sect-specific. See history of data/religious-stories-extra.ts for context.
  'religious-saladin',
  'religious-jilani',
  'religious-yazid-ibn-zubayr',
  'religious-hajjaj',
  'religious-harun-rashid',
  'religious-fall-babylon',
  // Sahaba biographies kept exclusively in the Companions page.
  'religious-handhalah',
  'religious-salman-farisi',
  'religious-hamza',
  'religious-khadijah-jibreel-salam',
]);

const ACTIVE_RELIGIOUS_STORY_PRESETS = RELIGIOUS_STORY_PRESETS.filter(
  (preset) => !REMOVED_STORY_IDS.has(preset.id)
);

function presetToStory(preset: ReligiousStoryPreset): CMSReligiousStory {
  return {
    id: preset.id,
    title: preset.title,
    titleEn: preset.titleEn,
    brief: preset.brief,
    briefEn: preset.briefEn,
    icon: preset.icon,
    audioUrl: '',
    audioTitle: '',
    transcript: preset.transcript,
    transcriptEn: preset.transcriptEn,
  };
}

// Picks the right transcript when the preset has canonical text and the stored
// record may have either (a) admin-added extensions that build on the preset
// or (b) corrupted content from a previous hydration leak. Rule: keep the
// stored text only if it begins with the preset's canonical text (i.e. the
// admin appended to it). Otherwise trust the preset, so a stored transcript
// that belongs to a completely different story (e.g. Adam's text saved under
// the Dajjal record) is replaced with the right content.
function reconcilePresetTranscript(presetText = '', storedText = ''): string {
  const preset = presetText.trim();
  const stored = storedText.trim();
  if (!preset) return stored;
  if (!stored) return preset;
  if (stored === preset) return stored;
  if (stored.startsWith(preset)) return stored;
  return preset;
}

function refreshStoryFromPreset(
  story: CMSReligiousStory,
  preset: ReligiousStoryPreset
): CMSReligiousStory {
  // Text fields come from the latest preset. Media URLs and admin-attached
  // assets stay on the Firestore record so audio uploads survive a sync.
  return {
    ...story,
    title: preset.title,
    titleEn: preset.titleEn || story.titleEn,
    brief: preset.brief,
    briefEn: preset.briefEn || story.briefEn,
    icon: preset.icon || story.icon,
    transcript: reconcilePresetTranscript(preset.transcript, story.transcript),
    transcriptEn: reconcilePresetTranscript(preset.transcriptEn, story.transcriptEn),
  };
}

function seedReligiousStoriesFromPresets(): ReligiousStoriesContent {
  return {
    stories: ACTIVE_RELIGIOUS_STORY_PRESETS.map(presetToStory),
    updateMode: 'manual',
    refreshIntervalMinutes: 60,
    contentVersion: 1,
  };
}

function syncReligiousStoriesWithPresets(
  current: ReligiousStoriesContent
): { content: ReligiousStoriesContent; changed: boolean; summary: string } {
  const presetById = new Map(ACTIVE_RELIGIOUS_STORY_PRESETS.map((p) => [p.id, p]));
  const incoming = current.stories || [];

  const removedIds: string[] = [];
  const refreshed: CMSReligiousStory[] = [];
  let refreshedCount = 0;

  for (const story of incoming) {
    if (story.id && REMOVED_STORY_IDS.has(story.id)) {
      removedIds.push(story.id);
      continue;
    }
    const preset = story.id ? presetById.get(story.id) : undefined;
    if (preset) {
      const next = refreshStoryFromPreset(story, preset);
      // Detect a meaningful refresh (title or brief differs).
      if (next.title !== story.title || next.brief !== story.brief) refreshedCount++;
      refreshed.push(next);
    } else {
      refreshed.push(story);
    }
  }

  // Add any preset that isn't already represented (matched on id).
  const existingIds = new Set(refreshed.map((s) => s.id).filter(Boolean));
  const newlyAdded: CMSReligiousStory[] = [];
  for (const preset of ACTIVE_RELIGIOUS_STORY_PRESETS) {
    if (!existingIds.has(preset.id)) {
      const seeded = presetToStory(preset);
      refreshed.push(seeded);
      newlyAdded.push(seeded);
    }
  }

  // Dedup by title as a final pass.
  const { deduped, removedIds: dedupRemovedIds } = dedupByName(refreshed, (s) => s.title);

  const changed =
    removedIds.length > 0 ||
    refreshedCount > 0 ||
    newlyAdded.length > 0 ||
    dedupRemovedIds.length > 0;

  const summaryParts: string[] = [];
  if (newlyAdded.length > 0) summaryParts.push(`أُضيفت ${newlyAdded.length} قصة جديدة`);
  if (refreshedCount > 0) summaryParts.push(`حُدِّثت ${refreshedCount} قصة`);
  if (removedIds.length > 0) summaryParts.push(`حُذفت ${removedIds.length} قصة منسوخة`);
  if (dedupRemovedIds.length > 0) summaryParts.push(`أُزيلت ${dedupRemovedIds.length} نسخة مكررة`);
  const summary = summaryParts.join(' · ') || 'تم مزامنة القصص الدينية';

  return {
    content: { ...current, stories: deduped },
    changed,
    summary,
  };
}

// ─── Main ContentManager ────────────────────────────────────────────────

export default function ContentManager() {
  const [activeTab, setActiveTab] = useState<ContentTab>('hajj');
  const [hajjUmrah, setHajjUmrah] = useState<HajjUmrahContent | null>(null);
  const [seerah, setSeerah] = useState<SeerahContent | null>(null);
  const [companions, setCompanions] = useState<CompanionsContent | null>(null);
  const [religiousStories, setReligiousStories] = useState<ReligiousStoriesContent | null>(null);
  const [seasonal, setSeasonal] = useState<Record<SeasonalPageKey, SeasonalPageContent | null>>({
    ramadan: null, hajj: null, mawlid: null, ashura: null,
  });
  const [activeSeasonalPage, setActiveSeasonalPage] = useState<SeasonalPageKey>('ramadan');
  const [seasonsMeta, setSeasonsMeta] = useState<SeasonsMetadata | null>(null);
  const [activeSeasonKey, setActiveSeasonKey] = useState<string>('ramadan');
  const [companionCategoryFilter, setCompanionCategoryFilter] = useState<string>('all');
  const [companionSearch, setCompanionSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  // Drag-and-drop state: which array index is currently being dragged, and
  // which index is the current drop target (for hover highlight).
  const [draggedStoryIndex, setDraggedStoryIndex] = useState<number | null>(null);
  const [storyDropTarget, setStoryDropTarget] = useState<number | null>(null);
  const [draggedCompanionIndex, setDraggedCompanionIndex] = useState<number | null>(null);
  const [companionDropTarget, setCompanionDropTarget] = useState<number | null>(null);

  const reorderArray = <T,>(arr: T[], from: number, to: number): T[] => {
    if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr;
    const next = [...arr];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
  };

  // Load all content on mount
  useEffect(() => {
    loadAllContent();
  }, []);

  const loadAllContent = async () => {
    setLoading(true);
    try {
      const [hajjDoc, seerahDoc, companionsDoc, religiousStoriesDoc, seasonsMetaDoc, ...seasonalDocs] = await Promise.all([
        getDoc(doc(db, 'appContent', 'hajjUmrahContent')),
        getDoc(doc(db, 'appContent', 'seerahContent')),
        getDoc(doc(db, 'appContent', 'companionsContent')),
        getDoc(doc(db, 'appContent', 'religiousStoriesContent')),
        getDoc(doc(db, 'appContent', 'seasonsMetadata')),
        ...SEASONAL_PAGES.map(p => getDoc(doc(db, 'appContent', `seasonalContent_${p.key}`))),
      ]);

      if (hajjDoc.exists()) setHajjUmrah(hajjDoc.data() as HajjUmrahContent);
      else setHajjUmrah(getDefaultHajjUmrahContent() as unknown as HajjUmrahContent);
      if (seerahDoc.exists()) setSeerah(seerahDoc.data() as SeerahContent);
      else setSeerah(getDefaultSeerahContent() as unknown as SeerahContent);
      if (companionsDoc.exists()) {
        const companionsData = expandCompanionsContent(companionsDoc.data() as CompanionsContent) as unknown as CompanionsContent;
        const { deduped: dedupedCompanions, removedIds: removedCompanionIds } = dedupByName(
          companionsData.companions || [],
          (c) => c.nameAr
        );
        const afterDedup = { ...companionsData, companions: dedupedCompanions };
        const synced = syncCompanionsWithDefaults(afterDedup);
        const needsSave = removedCompanionIds.length > 0 || synced.changed;
        setCompanions(synced.content);
        if (needsSave) {
          // Persist cleanup + missing-defaults sync back to Firestore so the
          // admin sees the full catalog on next load.
          const summaryParts: string[] = [];
          if (removedCompanionIds.length > 0) summaryParts.push(`حُذفت ${removedCompanionIds.length} نسخة مكررة`);
          if (synced.changed) summaryParts.push(synced.summary);
          setDoc(doc(db, 'appContent', 'companionsContent'), sanitizeForFirestore({
            ...synced.content,
            updatedAt: new Date().toISOString(),
          })).then(() => {
            setStatus({ type: 'success', message: `تم تحديث قصص الصحابة (${summaryParts.join(' · ')})` });
          }).catch((err) => {
            console.warn('Companion sync save failed', err);
          });
        }
      } else {
        // No Firestore doc yet — seed it with the full bundled list so the
        // admin sees all 47 companions on first run.
        const seeded = getFullDefaultCompanionsContent();
        setCompanions(seeded);
        setDoc(doc(db, 'appContent', 'companionsContent'), sanitizeForFirestore({
          ...seeded,
          updatedAt: new Date().toISOString(),
        })).catch((err) => {
          console.warn('Companion initial seed failed', err);
        });
      }
      if (religiousStoriesDoc.exists()) {
        const storiesData = religiousStoriesDoc.data() as ReligiousStoriesContent;
        const synced = syncReligiousStoriesWithPresets(storiesData);
        setReligiousStories(synced.content);
        if (synced.changed) {
          // Persist sync (removed IDs, refreshed text, added new presets, dedup)
          // back to Firestore so the cleanup is real, not just in-memory.
          setDoc(doc(db, 'appContent', 'religiousStoriesContent'), sanitizeForFirestore({
            ...synced.content,
            updatedAt: new Date().toISOString(),
            contentVersion: (storiesData.contentVersion || 0) + 1,
          })).then(() => {
            setStatus({ type: 'success', message: synced.summary });
          }).catch((err) => {
            console.warn('Religious stories auto-sync save failed', err);
          });
        }
      } else {
        // No Firestore doc yet — seed it with all bundled presets so the
        // admin sees the full catalog on first run.
        const seeded = seedReligiousStoriesFromPresets();
        setReligiousStories(seeded);
        setDoc(doc(db, 'appContent', 'religiousStoriesContent'), sanitizeForFirestore({
          ...seeded,
          updatedAt: new Date().toISOString(),
        })).catch((err) => {
          console.warn('Religious stories initial seed failed', err);
        });
      }
      if (seasonsMetaDoc.exists()) setSeasonsMeta(withDefaultSeasonsMetadata(seasonsMetaDoc.data() as SeasonsMetadata));
      else setSeasonsMeta(getDefaultSeasonsMetadata() as SeasonsMetadata);

      const seasonalData: Record<SeasonalPageKey, SeasonalPageContent | null> = {
        ramadan: null, hajj: null, mawlid: null, ashura: null,
      };
      SEASONAL_PAGES.forEach((p, i) => {
        if (seasonalDocs[i].exists()) {
          seasonalData[p.key] = withDefaultSeasonalPageContent(p.key, seasonalDocs[i].data() as SeasonalPageContent);
        } else {
          seasonalData[p.key] = getDefaultSeasonalPageContent(p.key) as SeasonalPageContent;
        }
      });
      setSeasonal(seasonalData);
    } catch (err) {
      // Firestore unreachable / permissions issue — fall back to bundled defaults
      // silently so the admin can still edit + push content. Avoids the noisy
      // red "فشل تحميل المحتوى" banner that blocked the whole CMS.
      console.warn('CMS content load failed; using bundled defaults instead.', err);
      setHajjUmrah(getDefaultHajjUmrahContent() as unknown as HajjUmrahContent);
      setSeerah(getDefaultSeerahContent() as unknown as SeerahContent);
      setCompanions(getFullDefaultCompanionsContent());
      setReligiousStories({ stories: [], updateMode: 'manual', refreshIntervalMinutes: 60, contentVersion: 0 });
      setSeasonsMeta(getDefaultSeasonsMetadata() as SeasonsMetadata);
      setSeasonal({
        ramadan: getDefaultSeasonalPageContent('ramadan') as SeasonalPageContent,
        hajj: getDefaultSeasonalPageContent('hajj') as SeasonalPageContent,
        mawlid: getDefaultSeasonalPageContent('mawlid') as SeasonalPageContent,
        ashura: getDefaultSeasonalPageContent('ashura') as SeasonalPageContent,
      });
    } finally {
      setLoading(false);
    }
  };

  // Save handlers
  const saveHajjUmrah = useCallback(async () => {
    if (!hajjUmrah) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'appContent', 'hajjUmrahContent'), sanitizeForFirestore({
        ...hajjUmrah,
        updatedAt: new Date().toISOString(),
      }));
      setStatus({ type: 'success', message: 'تم حفظ محتوى الحج والعمرة' });
    } catch (err) {
      console.error('Save error:', err);
      setStatus({ type: 'error', message: 'فشل حفظ المحتوى' });
    } finally {
      setSaving(false);
    }
  }, [hajjUmrah]);

  const saveSeerah = useCallback(async () => {
    if (!seerah) return;
    setSaving(true);
    try {
      let toSave: SeerahContent = seerah;
      if (seerah.audioUrl && !seerah.audioStoragePath && getArchiveIdentifier(seerah.audioUrl)) {
        try {
          const resolved = await resolveArchiveAudioUrl(seerah.audioUrl);
          toSave = {
            ...seerah,
            audioUrl: resolved.audioUrl,
            audioTitle: seerah.audioTitle || audioFileNameToTitle(resolved.fileName),
          };
        } catch {
          // keep the original URL if resolution fails
        }
      }
      await setDoc(doc(db, 'appContent', 'seerahContent'), sanitizeForFirestore({
        ...toSave,
        updatedAt: new Date().toISOString(),
      }));
      setStatus({ type: 'success', message: 'تم حفظ السيرة النبوية' });
    } catch (err) {
      console.error('Save error:', err);
      setStatus({ type: 'error', message: 'فشل حفظ المحتوى' });
    } finally {
      setSaving(false);
    }
  }, [seerah]);

  const saveCompanions = useCallback(async () => {
    if (!companions) return;
    setSaving(true);
    try {
      // Dedup by name before save — duplicates created during the edit
      // session shouldn't be persisted to Firestore.
      const { deduped, removedIds: dupRemovedIds } = dedupByName(companions.companions, (c) => c.nameAr);
      const hydratedCompanions = await Promise.all(deduped.map(async (companion) => {
        const normalized = normalizeCompanionForSave(companion);
        if (!normalized.audioUrl || normalized.audioStoragePath || !getArchiveIdentifier(normalized.audioUrl)) return normalized;
        try {
          const resolved = await resolveArchiveAudioUrl(normalized.audioUrl);
          return {
            ...normalized,
            audioUrl: resolved.audioUrl,
            videoUrl: normalized.videoUrl || resolved.sourceUrl,
            audioTitle: normalized.audioTitle || normalized.videoTitle || audioFileNameToTitle(resolved.fileName),
          };
        } catch {
          return normalized;
        }
      }));
      await setDoc(doc(db, 'appContent', 'companionsContent'), sanitizeForFirestore({
        ...companions,
        companions: hydratedCompanions,
        updatedAt: new Date().toISOString(),
      }));
      setCompanions({ ...companions, companions: hydratedCompanions });
      const dupMsg = dupRemovedIds.length > 0 ? ` (أُزيلت ${dupRemovedIds.length} نسخة مكررة)` : '';
      setStatus({ type: 'success', message: `تم حفظ قصص الصحابة${dupMsg}` });
    } catch (err) {
      console.error('Save error:', err);
      setStatus({ type: 'error', message: 'فشل حفظ المحتوى' });
    } finally {
      setSaving(false);
    }
  }, [companions]);

  const saveReligiousStories = useCallback(async () => {
    if (!religiousStories) return;
    setSaving(true);
    try {
      // Dedup by title before save so duplicates created during the edit
      // session don't get persisted back to Firestore.
      const filteredStories = religiousStories.stories.filter((story) => !REMOVED_STORY_IDS.has(story.id || ''));
      const removedByRuleCount = religiousStories.stories.length - filteredStories.length;
      const { deduped, removedIds } = dedupByName(filteredStories, (s) => s.title);
      const hydratedStories = await Promise.all(deduped.map(async (story, idx) => {
        const hydrated = hydrateReligiousStoryFromPreset({ ...story, order: idx });
        if (!hydrated.audioUrl || !getArchiveIdentifier(hydrated.audioUrl)) return hydrated;
        try {
          const resolved = await resolveArchiveAudioUrl(hydrated.audioUrl);
          return {
            ...hydrated,
            audioUrl: resolved.audioUrl,
            sourceUrl: hydrated.sourceUrl || resolved.sourceUrl,
            audioTitle: hydrated.audioTitle || audioFileNameToTitle(resolved.fileName),
          };
        } catch {
          return hydrated;
        }
      }));
      const nextVersion = (religiousStories.contentVersion || 0) + 1;
      await setDoc(doc(db, 'appContent', 'religiousStoriesContent'), sanitizeForFirestore({
        ...religiousStories,
        stories: hydratedStories,
        contentVersion: nextVersion,
        updateMode: religiousStories.updateMode || 'manual',
        refreshIntervalMinutes: Math.max(1, Number(religiousStories.refreshIntervalMinutes || 60)),
        updatedAt: new Date().toISOString(),
      }));
      setReligiousStories({
        ...religiousStories,
        stories: hydratedStories,
        contentVersion: nextVersion,
        updateMode: religiousStories.updateMode || 'manual',
        refreshIntervalMinutes: Math.max(1, Number(religiousStories.refreshIntervalMinutes || 60)),
      });
      const removedMsg = [
        removedIds.length > 0 ? `أُزيلت ${removedIds.length} نسخة مكررة` : '',
        removedByRuleCount > 0 ? `أُزيلت ${removedByRuleCount} قصة مستبعدة` : '',
      ].filter(Boolean).join('، ');
      const dupMsg = removedMsg ? ` (${removedMsg})` : '';
      setStatus({ type: 'success', message: `تم حفظ القصص الدينية${dupMsg}` });
    } catch (err) {
      console.error('Save error:', err);
      setStatus({ type: 'error', message: 'فشل حفظ المحتوى' });
    } finally {
      setSaving(false);
    }
  }, [religiousStories]);

  const saveSeasonal = useCallback(async () => {
    const entries = Object.entries(seasonal).filter((entry): entry is [SeasonalPageKey, SeasonalPageContent] => Boolean(entry[1]));
    if (entries.length === 0) return;
    setSaving(true);
    try {
      const updatedAt = new Date().toISOString();
      await Promise.all(entries.map(([page, data]) => (
        setDoc(doc(db, 'appContent', `seasonalContent_${page}`), sanitizeForFirestore({
          ...data,
          updatedAt,
        }))
      )));
      setStatus({ type: 'success', message: 'تم حفظ محتوى كل المواسم' });
    } catch (err) {
      console.error('Save error:', err);
      setStatus({ type: 'error', message: 'فشل حفظ المحتوى' });
    } finally {
      setSaving(false);
    }
  }, [seasonal]);

  const saveSeasonsMeta = useCallback(async () => {
    if (!seasonsMeta) return;
    setSaving(true);
    try {
      const normalizedSeasonsMeta = withUnifiedSeasonsMetadataCopy(seasonsMeta);
      await setDoc(doc(db, 'appContent', 'seasonsMetadata'), sanitizeForFirestore({
        ...normalizedSeasonsMeta,
        updatedAt: new Date().toISOString(),
      }));
      setSeasonsMeta(normalizedSeasonsMeta);
      setStatus({ type: 'success', message: 'تم حفظ بيانات المواسم' });
    } catch (err) {
      console.error('Save error:', err);
      setStatus({ type: 'error', message: 'فشل حفظ المحتوى' });
    } finally {
      setSaving(false);
    }
  }, [seasonsMeta]);

  const handleSave = () => {
    if (activeTab === 'hajj' || activeTab === 'umrah' || activeTab === 'duas') saveHajjUmrah();
    else if (activeTab === 'seerah') saveSeerah();
    else if (activeTab === 'companions') saveCompanions();
    else if (activeTab === 'religiousStories') saveReligiousStories();
    else if (activeTab === 'seasonal') saveSeasonal();
    else if (activeTab === 'seasons') saveSeasonsMeta();
  };

  // Section manipulation helpers for HajjUmrah
  const updateHajjSection = (idx: number, updated: CMSRitualSection) => {
    if (!hajjUmrah) return;
    const sections = [...hajjUmrah.hajjSections];
    sections[idx] = updated;
    setHajjUmrah({ ...hajjUmrah, hajjSections: sections });
  };

  const updateUmrahSection = (idx: number, updated: CMSRitualSection) => {
    if (!hajjUmrah) return;
    const sections = [...hajjUmrah.umrahSections];
    sections[idx] = updated;
    setHajjUmrah({ ...hajjUmrah, umrahSections: sections });
  };

  const updateDuaGroup = (idx: number, updated: CMSDuaRitualGroup) => {
    if (!hajjUmrah) return;
    const groups = [...hajjUmrah.duasByRitual];
    groups[idx] = updated;
    setHajjUmrah({ ...hajjUmrah, duasByRitual: groups });
  };

  const moveSection = (type: 'hajj' | 'umrah' | 'duas', idx: number, dir: -1 | 1) => {
    if (!hajjUmrah) return;
    const key = type === 'hajj' ? 'hajjSections' : type === 'umrah' ? 'umrahSections' : 'duasByRitual';
    const arr = [...(hajjUmrah[key] as unknown[])];
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= arr.length) return;
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    setHajjUmrah({ ...hajjUmrah, [key]: arr });
  };

  // Auto-clear status
  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => setStatus(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  // Helper to initialize content with defaults
  const initHajjUmrah = () => {
    setHajjUmrah(getDefaultHajjUmrahContent() as unknown as HajjUmrahContent);
    setStatus({ type: 'success', message: 'تم تحميل المحتوى الافتراضي للحج والعمرة' });
  };

  const initSeerah = () => {
    setSeerah(getDefaultSeerahContent() as unknown as SeerahContent);
    setStatus({ type: 'success', message: 'تم تحميل المحتوى الافتراضي للسيرة النبوية' });
  };

  const initCompanions = () => {
    setCompanions(getFullDefaultCompanionsContent());
    setStatus({ type: 'success', message: 'تم تحميل المحتوى الافتراضي للصحابة' });
  };

  const initReligiousStories = () => {
    setReligiousStories({ stories: [], updateMode: 'manual', refreshIntervalMinutes: 60, contentVersion: 0 });
    setStatus({ type: 'success', message: 'تم تجهيز قسم القصص الدينية' });
  };

  const initSeasonal = (page: SeasonalPageKey) => {
    setSeasonal(prev => ({
      ...prev,
      [page]: getDefaultSeasonalPageContent(page) as SeasonalPageContent,
    }));
  };

  const updateSeasonalDua = (duaIdx: number, updated: CMSSeasonalDua) => {
    const data = seasonal[activeSeasonalPage];
    if (!data) return;
    const duas = [...data.duas];
    duas[duaIdx] = updated;
    setSeasonal(prev => ({ ...prev, [activeSeasonalPage]: { ...data, duas } }));
  };

  const updateSeasonalChecklist = (idx: number, updated: CMSSeasonalChecklist) => {
    const data = seasonal[activeSeasonalPage];
    if (!data) return;
    const checklist = [...data.checklist];
    checklist[idx] = updated;
    setSeasonal(prev => ({ ...prev, [activeSeasonalPage]: { ...data, checklist } }));
  };

  const initSeasonsMeta = () => {
    setSeasonsMeta(getDefaultSeasonsMetadata() as SeasonsMetadata);
  };

  const updateSeasonMeta = (key: string, field: string, value: unknown) => {
    if (!seasonsMeta) return;
    setSeasonsMeta({
      ...seasonsMeta,
      seasons: {
        ...seasonsMeta.seasons,
        [key]: { ...seasonsMeta.seasons[key], [field]: value },
      },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="animate-spin text-accent-light" size={24} />
        <span className="text-slate-400 mr-2">جاري التحميل...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">إدارة المحتوى</h1>
          <p className="text-sm text-slate-400 mt-1">تعديل محتوى الحج والعمرة والسيرة والصحابة والقصص الدينية</p>
        </div>
        <div className="flex items-center gap-3">
          {status && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${status.type === 'success' ? 'bg-emerald-900/30 text-accent-light' : 'bg-red-900/30 text-red-400'}`}>
              {status.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              {status.message}
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-accent-dark hover:bg-emerald-700 rounded-lg text-white text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
            حفظ
          </button>
          <button
            onClick={loadAllContent}
            className="flex items-center gap-2 px-3 py-2 bg-admin-surface-light hover:bg-slate-600 rounded-lg text-white text-sm transition-colors"
            title="إعادة تحميل"
            aria-label="إعادة تحميل"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-admin-surface rounded-lg p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 justify-center ${
              activeTab === tab.key
                ? 'bg-accent-dark text-white'
                : 'text-slate-400 hover:text-white hover:bg-admin-surface-light'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Hajj sections tab */}
      {activeTab === 'hajj' && (
        <div>
          {!hajjUmrah ? (
            <EmptyState label="الحج والعمرة" onInit={initHajjUmrah} />
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">مناسك الحج ({hajjUmrah.hajjSections.length} قسم)</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { if (confirm('سيتم استبدال محتوى الحج الحالي بالمحتوى الافتراضي من التطبيق. متأكد؟')) { const defaults = getDefaultHajjUmrahContent(); setHajjUmrah({ ...hajjUmrah, hajjSections: defaults.hajjSections as unknown as HajjUmrahContent['hajjSections'] }); setStatus({ type: 'success', message: 'تم استيراد أقسام الحج الافتراضية' }); } }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-amber-600/20 text-amber-400 rounded-lg text-sm hover:bg-amber-600/30"
                  >
                    <Download size={14} /> استيراد الافتراضي
                  </button>
                  <button
                    onClick={() => setHajjUmrah({
                      ...hajjUmrah,
                      hajjSections: [...hajjUmrah.hajjSections, { title: '', icon: 'mosque', description: '', steps: [], duas: [] }],
                    })}
                    className="flex items-center gap-1 px-3 py-1.5 bg-accent-dark/20 text-accent-light rounded-lg text-sm hover:bg-accent-dark/30"
                  >
                    <Plus size={14} /> إضافة قسم
                  </button>
                </div>
              </div>
              {hajjUmrah.hajjSections.map((section, i) => (
                <RitualSectionEditor
                  key={i}
                  section={section}
                  index={i}
                  onUpdate={(updated) => updateHajjSection(i, updated)}
                  onDelete={() => setHajjUmrah({
                    ...hajjUmrah,
                    hajjSections: hajjUmrah.hajjSections.filter((_, idx) => idx !== i),
                  })}
                  onMoveUp={() => moveSection('hajj', i, -1)}
                  onMoveDown={() => moveSection('hajj', i, 1)}
                  isFirst={i === 0}
                  isLast={i === hajjUmrah.hajjSections.length - 1}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* Umrah sections tab */}
      {activeTab === 'umrah' && (
        <div>
          {!hajjUmrah ? (
            <EmptyState label="الحج والعمرة" onInit={initHajjUmrah} />
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">مناسك العمرة ({hajjUmrah.umrahSections.length} قسم)</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { if (confirm('سيتم استبدال محتوى العمرة الحالي بالمحتوى الافتراضي من التطبيق. متأكد؟')) { const defaults = getDefaultHajjUmrahContent(); setHajjUmrah({ ...hajjUmrah, umrahSections: defaults.umrahSections as unknown as HajjUmrahContent['umrahSections'] }); setStatus({ type: 'success', message: 'تم استيراد أقسام العمرة الافتراضية' }); } }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-amber-600/20 text-amber-400 rounded-lg text-sm hover:bg-amber-600/30"
                  >
                    <Download size={14} /> استيراد الافتراضي
                  </button>
                  <button
                    onClick={() => setHajjUmrah({
                      ...hajjUmrah,
                      umrahSections: [...hajjUmrah.umrahSections, { title: '', icon: 'mosque', description: '', steps: [], duas: [] }],
                    })}
                    className="flex items-center gap-1 px-3 py-1.5 bg-accent-dark/20 text-accent-light rounded-lg text-sm hover:bg-accent-dark/30"
                  >
                    <Plus size={14} /> إضافة قسم
                  </button>
                </div>
              </div>
              {hajjUmrah.umrahSections.map((section, i) => (
                <RitualSectionEditor
                  key={i}
                  section={section}
                  index={i}
                  onUpdate={(updated) => updateUmrahSection(i, updated)}
                  onDelete={() => setHajjUmrah({
                    ...hajjUmrah,
                    umrahSections: hajjUmrah.umrahSections.filter((_, idx) => idx !== i),
                  })}
                  onMoveUp={() => moveSection('umrah', i, -1)}
                  onMoveDown={() => moveSection('umrah', i, 1)}
                  isFirst={i === 0}
                  isLast={i === hajjUmrah.umrahSections.length - 1}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* Duas tab */}
      {activeTab === 'duas' && (
        <div>
          {!hajjUmrah ? (
            <EmptyState label="الحج والعمرة" onInit={initHajjUmrah} />
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">مجموعات الأدعية ({hajjUmrah.duasByRitual.length} مجموعة)</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { if (confirm('سيتم استبدال الأدعية الحالية بالأدعية الافتراضية من التطبيق. متأكد؟')) { const defaults = getDefaultHajjUmrahContent(); setHajjUmrah({ ...hajjUmrah, duasByRitual: defaults.duasByRitual as unknown as HajjUmrahContent['duasByRitual'] }); setStatus({ type: 'success', message: 'تم استيراد الأدعية الافتراضية' }); } }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-amber-600/20 text-amber-400 rounded-lg text-sm hover:bg-amber-600/30"
                  >
                    <Download size={14} /> استيراد الافتراضي
                  </button>
                  <button
                    onClick={() => setHajjUmrah({
                      ...hajjUmrah,
                      duasByRitual: [...hajjUmrah.duasByRitual, { title: '', icon: 'hands-pray', duas: [] }],
                    })}
                    className="flex items-center gap-1 px-3 py-1.5 bg-accent-dark/20 text-accent-light rounded-lg text-sm hover:bg-accent-dark/30"
                  >
                    <Plus size={14} /> إضافة مجموعة
                  </button>
                </div>
              </div>
              {hajjUmrah.duasByRitual.map((group, i) => (
                <DuaGroupEditor
                  key={i}
                  group={group}
                  index={i}
                  onUpdate={(updated) => updateDuaGroup(i, updated)}
                  onDelete={() => setHajjUmrah({
                    ...hajjUmrah,
                    duasByRitual: hajjUmrah.duasByRitual.filter((_, idx) => idx !== i),
                  })}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* Seerah tab */}
      {activeTab === 'seerah' && (
        <div>
          {!seerah ? (
            <EmptyState label="السيرة النبوية" onInit={initSeerah} />
          ) : (
            <>
              <div className="border border-admin-border rounded-lg p-4 mb-6 bg-admin-bg/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-right">
                    <h3 className="text-base font-semibold text-white">صوت السيرة النبوية كاملة</h3>
                    <p className="text-xs text-slate-400 mt-1">صوت واحد يشغّله المستخدم في صفحة السيرة كلها (ليس لكل قسم).</p>
                  </div>
                  <span className={`text-xs ${seerah.audioUrl?.trim() ? 'text-accent-light' : 'text-amber-400'}`}>
                    {seerah.audioUrl?.trim() ? 'صوت جاهز' : 'ينقصها رابط صوت'}
                  </span>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">عنوان الصوت (اختياري)</label>
                  <input
                    value={audioFileNameToTitle(seerah.audioTitle || '')}
                    onChange={(e) => setSeerah({ ...seerah, audioTitle: audioFileNameToTitle(e.target.value) })}
                    className="w-full bg-admin-surface border border-admin-border rounded px-3 py-2 text-white text-right"
                    dir="rtl"
                    title="عنوان الصوت"
                    aria-label="عنوان الصوت"
                    placeholder="مثال: استمع إلى السيرة النبوية كاملة"
                  />
                </div>
                <ArchiveAudioUrlField
                  value={seerah.audioStoragePath ? '' : seerah.audioUrl || ''}
                  disabled={!!seerah.audioStoragePath}
                  label="رابط صفحة Internet Archive أو ملف صوت مباشر (اختياري)"
                  onChange={(value) => setSeerah({ ...seerah, audioUrl: value, audioStoragePath: undefined })}
                  onResolve={(audioUrl, fileName) => setSeerah({
                    ...seerah,
                    audioUrl,
                    audioStoragePath: undefined,
                    audioTitle: seerah.audioTitle || audioFileNameToTitle(fileName),
                  })}
                />
                <AudioUploadField
                  audioUrl={seerah.audioStoragePath ? seerah.audioUrl : undefined}
                  audioStoragePath={seerah.audioStoragePath}
                  onUpload={(url, storagePath) =>
                    setSeerah({ ...seerah, audioUrl: url, audioStoragePath: storagePath })
                  }
                  onClear={() => setSeerah({ ...seerah, audioUrl: undefined, audioStoragePath: undefined })}
                />
              </div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">أقسام السيرة ({seerah.sections.length} قسم)</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { if (confirm('سيتم استبدال محتوى السيرة الحالي بالمحتوى الافتراضي من التطبيق. متأكد؟')) { setSeerah(getDefaultSeerahContent() as unknown as SeerahContent); setStatus({ type: 'success', message: 'تم استيراد أقسام السيرة الافتراضية' }); } }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-amber-600/20 text-amber-400 rounded-lg text-sm hover:bg-amber-600/30"
                  >
                    <Download size={14} /> استيراد الافتراضي
                  </button>
                  <button
                    onClick={() => setSeerah({
                      ...seerah,
                      sections: [...seerah.sections, { title: '', titleEn: '', icon: 'book-open-variant', paragraphs: [], videoUrl: '', videoTitle: '' }],
                    })}
                    className="flex items-center gap-1 px-3 py-1.5 bg-accent-dark/20 text-accent-light rounded-lg text-sm hover:bg-accent-dark/30"
                  >
                    <Plus size={14} /> إضافة قسم
                  </button>
                </div>
              </div>
              {seerah.sections.map((section, i) => (
                <SeerahSectionEditor
                  key={i}
                  section={section}
                  index={i}
                  onUpdate={(updated) => {
                    const sections = [...seerah.sections];
                    sections[i] = updated;
                    setSeerah({ ...seerah, sections });
                  }}
                  onDelete={() => setSeerah({
                    ...seerah,
                    sections: seerah.sections.filter((_, idx) => idx !== i),
                  })}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* Companions tab */}
      {activeTab === 'companions' && (
        <div>
          {!companions ? (
            <EmptyState label="الصحابة" onInit={initCompanions} />
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="text-right">
                  <h2 className="text-lg font-semibold text-white">الصحابة ({companions.companions.length} صحابي)</h2>
                  <p className="text-xs text-slate-400 mt-1">نفس أقسام التطبيق. اكتب القصة كاملة في حقل واحد، وأضف رابط Internet Archive أو ملف صوت مباشر.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { if (confirm('سيتم استبدال قائمة الصحابة الحالية بالمحتوى الافتراضي من التطبيق. متأكد؟')) { setCompanions(getFullDefaultCompanionsContent()); setStatus({ type: 'success', message: 'تم استيراد بيانات الصحابة الافتراضية المطولة' }); } }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-amber-600/20 text-amber-400 rounded-lg text-sm hover:bg-amber-600/30"
                  >
                    <Download size={14} /> استيراد الافتراضي
                  </button>
                  <button
                    onClick={() => setCompanions({
                      ...companions,
                      companions: [...companions.companions, {
                        id: `companion-${Date.now()}`, nameAr: '', nameEn: '', category: companions.categories[0]?.key || 'ashara',
                        brief: '', story: [], virtues: [], videoUrl: '', videoTitle: '', audioUrl: '', audioTitle: '', transcript: '',
                      }],
                    })}
                    className="flex items-center gap-1 px-3 py-1.5 bg-accent-dark/20 text-accent-light rounded-lg text-sm hover:bg-accent-dark/30"
                  >
                    <Plus size={14} /> إضافة صحابي
                  </button>
                  <button
                    onClick={() => {
                      const { deduped, removedIds } = dedupByName(companions.companions, (c) => c.nameAr);
                      if (removedIds.length === 0) {
                        setStatus({ type: 'success', message: 'لا توجد صحابة مكررة' });
                        return;
                      }
                      setCompanions({ ...companions, companions: deduped });
                      setStatus({ type: 'success', message: `تم حذف ${removedIds.length} نسخة مكررة. لا تنسَ "حفظ".` });
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-amber-700/30 text-amber-200 rounded-lg text-sm hover:bg-amber-700/50"
                    title="حذف المتكرر بناءً على نفس الاسم"
                  >
                    <RefreshCw size={14} /> تنظيف المكررات
                  </button>
                </div>
              </div>
              <div className="mb-4 space-y-3">
                <div className="flex flex-wrap gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setCompanionCategoryFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-sm border ${companionCategoryFilter === 'all' ? 'bg-accent-dark text-white border-accent-dark' : 'bg-admin-surface text-slate-300 border-admin-border hover:text-white'}`}
                  >
                    الكل
                  </button>
                  {companions.categories.map((category) => (
                    <button
                      type="button"
                      key={category.key}
                      onClick={() => setCompanionCategoryFilter(category.key)}
                      className={`px-3 py-1.5 rounded-lg text-sm border ${companionCategoryFilter === category.key ? 'bg-accent-dark text-white border-accent-dark' : 'bg-admin-surface text-slate-300 border-admin-border hover:text-white'}`}
                    >
                      {category.title}
                    </button>
                  ))}
                </div>
                <input
                  value={companionSearch}
                  onChange={(e) => setCompanionSearch(e.target.value)}
                  className="w-full bg-admin-surface border border-admin-border rounded px-3 py-2 text-white text-right"
                  dir="rtl"
                  placeholder="بحث باسم الصحابي أو التصنيف..."
                  title="بحث في الصحابة"
                  aria-label="بحث في الصحابة"
                />
              </div>
              {companions.companions
                .map((comp, i) => ({ comp, i }))
                .filter(({ comp }) => companionCategoryFilter === 'all' || comp.category === companionCategoryFilter)
                .filter(({ comp }) => {
                  const query = normalizeSearchText(companionSearch);
                  if (!query) return true;
                  const categoryTitle = companions.categories.find(c => c.key === comp.category)?.title || comp.category;
                  return normalizeSearchText([comp.nameAr, comp.nameEn, comp.brief, categoryTitle].filter(Boolean).join(' ')).includes(query);
                })
                .map(({ comp, i }) => (
                  <CompanionEditor
                    key={comp.id || i}
                    companion={comp}
                    index={i}
                    total={companions.companions.length}
                    categories={companions.categories}
                    onUpdate={(updated) => {
                      const comps = [...companions.companions];
                      comps[i] = updated;
                      setCompanions({ ...companions, companions: comps });
                    }}
                    onDelete={() => setCompanions({
                      ...companions,
                      companions: companions.companions.filter((_, idx) => idx !== i),
                    })}
                    onMoveUp={() => {
                      if (i === 0) return;
                      setCompanions({
                        ...companions,
                        companions: reorderArray(companions.companions, i, i - 1),
                      });
                    }}
                    onMoveDown={() => {
                      if (i >= companions.companions.length - 1) return;
                      setCompanions({
                        ...companions,
                        companions: reorderArray(companions.companions, i, i + 1),
                      });
                    }}
                    onMoveTo={(target) => {
                      setCompanions({
                        ...companions,
                        companions: reorderArray(companions.companions, i, target),
                      });
                    }}
                    onDragStart={() => setDraggedCompanionIndex(i)}
                    onDragOver={() => { if (draggedCompanionIndex !== null && draggedCompanionIndex !== i) setCompanionDropTarget(i); }}
                    onDrop={() => {
                      if (draggedCompanionIndex === null || draggedCompanionIndex === i) {
                        setDraggedCompanionIndex(null); setCompanionDropTarget(null); return;
                      }
                      setCompanions({
                        ...companions,
                        companions: reorderArray(companions.companions, draggedCompanionIndex, i),
                      });
                      setDraggedCompanionIndex(null);
                      setCompanionDropTarget(null);
                    }}
                    isDragOver={companionDropTarget === i && draggedCompanionIndex !== null && draggedCompanionIndex !== i}
                  />
                ))}
            </>
          )}
        </div>
      )}

      {/* Religious Stories tab */}
      {activeTab === 'religiousStories' && (
        <div>
          {!religiousStories ? (
            <EmptyState label="القصص الدينية" onInit={initReligiousStories} />
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="text-right">
                  <h2 className="text-lg font-semibold text-white">قصص دينية ({religiousStories.stories.length} قصة)</h2>
                  <p className="text-xs text-slate-400 mt-1">أضف عنوانًا ورابط صفحة Internet Archive أو MP3 مباشر. النص اختياري، ويُستخدم للقراءة والتمرير التلقائي.</p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Bulk-import: surface every bundled preset (prophets + extra */}
                  {/* religious stories) as Firestore entries, so the admin can */}
                  {/* attach audio without manually re-creating each one. Skips */}
                  {/* presets that already exist by id to avoid duplicates. */}
                  <button
                    onClick={() => {
                      const existingIds = new Set(religiousStories.stories.map(s => s.id));
                      const additions = ACTIVE_RELIGIOUS_STORY_PRESETS
                        .filter(p => !existingIds.has(p.id))
                        .map((preset, idx): CMSReligiousStory => ({
                          id: preset.id,
                          title: preset.title,
                          titleEn: preset.titleEn || '',
                          brief: preset.brief || '',
                          briefEn: preset.briefEn || '',
                          icon: preset.icon || '',
                          audioUrl: '',
                          audioTitle: preset.title,
                          transcript: preset.transcript,
                          transcriptEn: preset.transcriptEn || '',
                          order: religiousStories.stories.length + idx,
                        }));
                      if (additions.length === 0) {
                        setStatus({ type: 'success', message: 'كل القصص الافتراضية موجودة بالفعل' });
                        return;
                      }
                      if (!confirm(`سيتم استيراد ${additions.length} قصة افتراضية (أنبياء + قصص دينية). متابعة؟`)) return;
                      setReligiousStories({
                        ...religiousStories,
                        stories: [...religiousStories.stories, ...additions],
                      });
                      setStatus({ type: 'success', message: `تم استيراد ${additions.length} قصة. لا تنسَ الضغط على "حفظ" لرفعها.` });
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-700/40 text-emerald-200 rounded-lg text-sm hover:bg-emerald-700/60"
                    title="استيراد كل القصص الافتراضية الجديدة"
                  >
                    <Download size={14} /> استيراد الكل
                  </button>
                  <button
                  onClick={() => setReligiousStories({
                    ...religiousStories,
                    stories: [...religiousStories.stories, {
                      id: `religious-story-${Date.now()}`,
                      title: '',
                      titleEn: '',
                      brief: '',
                      briefEn: '',
                      icon: '',
                      audioUrl: '',
                      audioTitle: '',
                      transcript: '',
                      transcriptEn: '',
                      order: religiousStories.stories.length,
                    }],
                  })}
                  className="flex items-center gap-1 px-3 py-1.5 bg-accent-dark/20 text-accent-light rounded-lg text-sm hover:bg-accent-dark/30"
                >
                  <Plus size={14} /> إضافة قصة
                </button>
                <button
                  onClick={() => {
                    const { deduped, removedIds } = dedupByName(religiousStories.stories, (s) => s.title);
                    if (removedIds.length === 0) {
                      setStatus({ type: 'success', message: 'لا توجد قصص مكررة' });
                      return;
                    }
                    setReligiousStories({
                      ...religiousStories,
                      stories: deduped.map((st, idx) => ({ ...st, order: idx })),
                    });
                    setStatus({ type: 'success', message: `تم حذف ${removedIds.length} نسخة مكررة. لا تنسَ "حفظ".` });
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-amber-700/30 text-amber-200 rounded-lg text-sm hover:bg-amber-700/50"
                  title="حذف المتكرر بناءً على نفس العنوان"
                >
                  <RefreshCw size={14} /> تنظيف المكررات
                </button>
                </div>
              </div>

              <div className="mb-4 rounded-lg border border-admin-border bg-admin-surface/70 p-4">
                <div className="mb-3 text-right">
                  <h3 className="text-sm font-semibold text-white">طريقة تحديث القصص في التطبيق</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    الأفضل هو التحديث اليدوي: التطبيق يستخدم النسخة المحفوظة عند المستخدم، ولا يظهر مودال التحديث إلا عند أول فتح بدون كاش أو بعد حفظ نسخة جديدة من هنا.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-slate-400">وضع التحديث</label>
                    <select
                      value={religiousStories.updateMode || 'manual'}
                      onChange={(e) => setReligiousStories({
                        ...religiousStories,
                        updateMode: e.target.value as 'manual' | 'interval',
                      })}
                      className="w-full rounded border border-admin-border bg-admin-bg px-3 py-2 text-white"
                      title="وضع تحديث القصص"
                      aria-label="وضع تحديث القصص"
                    >
                      <option value="manual">يدوي عند حفظ الادمن</option>
                      <option value="interval">كل مدة محددة</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-400">كل كام دقيقة</label>
                    <input
                      type="number"
                      min={1}
                      value={religiousStories.refreshIntervalMinutes || 60}
                      disabled={(religiousStories.updateMode || 'manual') === 'manual'}
                      onChange={(e) => setReligiousStories({
                        ...religiousStories,
                        refreshIntervalMinutes: Math.max(1, Number(e.target.value) || 60),
                      })}
                      className="w-full rounded border border-admin-border bg-admin-bg px-3 py-2 text-white disabled:opacity-45"
                      title="مدة تحديث القصص بالدقائق"
                      aria-label="مدة تحديث القصص بالدقائق"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-400">نسخة القصص الحالية</label>
                    <div className="rounded border border-admin-border bg-admin-bg px-3 py-2 text-white">
                      {religiousStories.contentVersion || 0}
                    </div>
                  </div>
                </div>
              </div>

              {religiousStories.stories.map((story, i) => (
                <ReligiousStoryEditor
                  key={story.id || i}
                  story={story}
                  index={i}
                  total={religiousStories.stories.length}
                  onUpdate={(updated) => {
                    const stories = [...religiousStories.stories];
                    stories[i] = updated;
                    setReligiousStories({ ...religiousStories, stories });
                  }}
                  onDelete={() => setReligiousStories({
                    ...religiousStories,
                    stories: religiousStories.stories
                      .filter((_, idx) => idx !== i)
                      .map((st, idx) => ({ ...st, order: idx })),
                  })}
                  onMoveUp={() => {
                    if (i === 0) return;
                    const stories = reorderArray(religiousStories.stories, i, i - 1);
                    setReligiousStories({
                      ...religiousStories,
                      stories: stories.map((st, idx) => ({ ...st, order: idx })),
                    });
                  }}
                  onMoveDown={() => {
                    if (i >= religiousStories.stories.length - 1) return;
                    const stories = reorderArray(religiousStories.stories, i, i + 1);
                    setReligiousStories({
                      ...religiousStories,
                      stories: stories.map((st, idx) => ({ ...st, order: idx })),
                    });
                  }}
                  onMoveTo={(target) => {
                    const stories = reorderArray(religiousStories.stories, i, target);
                    setReligiousStories({
                      ...religiousStories,
                      stories: stories.map((st, idx) => ({ ...st, order: idx })),
                    });
                  }}
                  onDragStart={() => setDraggedStoryIndex(i)}
                  onDragOver={() => { if (draggedStoryIndex !== null && draggedStoryIndex !== i) setStoryDropTarget(i); }}
                  onDrop={() => {
                    if (draggedStoryIndex === null || draggedStoryIndex === i) {
                      setDraggedStoryIndex(null); setStoryDropTarget(null); return;
                    }
                    const stories = reorderArray(religiousStories.stories, draggedStoryIndex, i);
                    setReligiousStories({
                      ...religiousStories,
                      stories: stories.map((st, idx) => ({ ...st, order: idx })),
                    });
                    setDraggedStoryIndex(null);
                    setStoryDropTarget(null);
                  }}
                  isDragOver={storyDropTarget === i && draggedStoryIndex !== null && draggedStoryIndex !== i}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* Seasonal tab */}
      {activeTab === 'seasonal' && (
        <div>
          <div className="flex gap-2 mb-4">
            {SEASONAL_PAGES.map(p => (
              <button
                key={p.key}
                onClick={() => setActiveSeasonalPage(p.key)}
                className={`px-3 py-1.5 rounded-lg text-sm ${
                  activeSeasonalPage === p.key
                    ? 'bg-accent-dark text-white'
                    : 'bg-admin-surface text-slate-400 hover:bg-admin-surface-light'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {!seasonal[activeSeasonalPage] ? (
            <EmptyState label={SEASONAL_PAGES.find(p => p.key === activeSeasonalPage)?.label || 'الموسم'} onInit={() => initSeasonal(activeSeasonalPage)} />
          ) : (
            <>
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-md font-semibold text-white">الأدعية ({seasonal[activeSeasonalPage]!.duas.length})</h3>
                  <button
                    onClick={() => {
                      const data = seasonal[activeSeasonalPage]!;
                      setSeasonal(prev => ({
                        ...prev,
                        [activeSeasonalPage]: {
                          ...data,
                          duas: [...data.duas, { id: `dua-${Date.now()}`, titleKey: '', arabic: '', translation: '' }],
                        },
                      }));
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-accent-dark/20 text-accent-light rounded-lg text-sm hover:bg-accent-dark/30"
                  >
                    <Plus size={14} /> إضافة دعاء
                  </button>
                </div>
                {seasonal[activeSeasonalPage]!.duas.map((dua, i) => (
                  <div key={i} className="border border-admin-border rounded-lg mb-2 p-3 bg-admin-bg/50">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <input value={dua.id} onChange={(e) => updateSeasonalDua(i, { ...dua, id: e.target.value })} className="bg-admin-surface border border-admin-border rounded px-2 py-1 text-white text-sm" placeholder="المعرّف" title="معرف الدعاء" aria-label="معرف الدعاء" />
                      <input value={dua.titleKey} onChange={(e) => updateSeasonalDua(i, { ...dua, titleKey: e.target.value })} className="bg-admin-surface border border-admin-border rounded px-2 py-1 text-white text-sm" placeholder="مفتاح العنوان" title="مفتاح العنوان" aria-label="مفتاح العنوان" />
                    </div>
                    <textarea value={dua.arabic} onChange={(e) => updateSeasonalDua(i, { ...dua, arabic: e.target.value })} className="w-full bg-admin-surface border border-admin-border rounded px-2 py-1 text-white text-sm text-right mb-2 min-h-[60px]" dir="rtl" placeholder="النص العربي" title="النص العربي" aria-label="النص العربي" />
                    <div className="flex items-center gap-2 mb-2">
                      <input value={dua.translation} onChange={(e) => updateSeasonalDua(i, { ...dua, translation: e.target.value })} className="flex-1 bg-admin-surface border border-admin-border rounded px-2 py-1 text-white text-sm" placeholder="الترجمة" title="الترجمة" aria-label="الترجمة" />
                      <button onClick={() => { const data = seasonal[activeSeasonalPage]!; setSeasonal(prev => ({ ...prev, [activeSeasonalPage]: { ...data, duas: data.duas.filter((_, idx) => idx !== i) } })); }} className="p-1 hover:bg-red-900/30 rounded" title="حذف الدعاء">
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-md font-semibold text-white">قائمة المهام ({seasonal[activeSeasonalPage]!.checklist.length})</h3>
                  <button
                    onClick={() => {
                      const data = seasonal[activeSeasonalPage]!;
                      setSeasonal(prev => ({
                        ...prev,
                        [activeSeasonalPage]: {
                          ...data,
                          checklist: [...data.checklist, { id: `item-${Date.now()}`, icon: 'check', labelKey: '', color: '#2f7659' }],
                        },
                      }));
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-accent-dark/20 text-accent-light rounded-lg text-sm hover:bg-accent-dark/30"
                  >
                    <Plus size={14} /> إضافة عنصر
                  </button>
                </div>
                {seasonal[activeSeasonalPage]!.checklist.map((item, i) => (
                  <div key={i} className="border border-admin-border rounded-lg mb-2 p-3 bg-admin-bg/50">
                    <div className="flex items-center gap-2 mb-2">
                      <input value={item.id} onChange={(e) => updateSeasonalChecklist(i, { ...item, id: e.target.value })} className="w-24 bg-admin-surface border border-admin-border rounded px-2 py-1 text-white text-sm" placeholder="id" title="معرف العنصر" aria-label="معرف العنصر" />
                      <input value={item.icon} onChange={(e) => updateSeasonalChecklist(i, { ...item, icon: e.target.value })} className="w-28 bg-admin-surface border border-admin-border rounded px-2 py-1 text-white text-sm" placeholder="أيقونة" title="أيقونة العنصر" aria-label="أيقونة العنصر" />
                      <input value={item.labelKey} onChange={(e) => updateSeasonalChecklist(i, { ...item, labelKey: e.target.value })} className="flex-1 bg-admin-surface border border-admin-border rounded px-2 py-1 text-white text-sm text-right" dir="rtl" placeholder="النص" title="نص العنصر" aria-label="نص العنصر" />
                      <input type="color" value={item.color} onChange={(e) => updateSeasonalChecklist(i, { ...item, color: e.target.value })} className="w-8 h-8 rounded cursor-pointer" title="لون العنصر" aria-label="لون العنصر" />
                      <button onClick={() => { const data = seasonal[activeSeasonalPage]!; setSeasonal(prev => ({ ...prev, [activeSeasonalPage]: { ...data, checklist: data.checklist.filter((_, idx) => idx !== i) } })); }} className="p-1 hover:bg-red-900/30 rounded" title="حذف العنصر">
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Seasons Metadata tab */}
      {activeTab === 'seasons' && (
        <div>
          {!seasonsMeta ? (
            <EmptyState label="بيانات المواسم" onInit={initSeasonsMeta} />
          ) : (
            <>
              <div className="flex flex-wrap gap-2 mb-4">
                {SEASON_KEYS.map(s => (
                  <button
                    key={s.key}
                    onClick={() => setActiveSeasonKey(s.key)}
                    className={`px-3 py-1.5 rounded-lg text-sm ${
                      activeSeasonKey === s.key
                        ? 'bg-accent-dark text-white'
                        : 'bg-admin-surface text-slate-400 hover:bg-admin-surface-light'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {seasonsMeta.seasons[activeSeasonKey] && (() => {
                const season = seasonsMeta.seasons[activeSeasonKey];
                const unifiedSeasonCopy = getArabicSeasonalBannerCopy(activeSeasonKey);
                return (
                  <div className="space-y-4">
                    {/* Basic info */}
                    <div className="border border-admin-border rounded-lg p-4 bg-admin-bg/50">
                      <h3 className="text-sm font-semibold text-slate-300 mb-3">المعلومات الأساسية</h3>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="text-xs text-slate-500 block mb-1">الاسم بالعربية</label>
                          <input value={season.nameAr} onChange={e => updateSeasonMeta(activeSeasonKey, 'nameAr', e.target.value)} className="w-full bg-admin-surface border border-admin-border rounded px-2 py-1.5 text-white text-sm text-right" dir="rtl" title="الاسم بالعربية" aria-label="الاسم بالعربية" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 block mb-1">الاسم بالإنجليزية</label>
                          <input value={season.nameEn} onChange={e => updateSeasonMeta(activeSeasonKey, 'nameEn', e.target.value)} className="w-full bg-admin-surface border border-admin-border rounded px-2 py-1.5 text-white text-sm" title="الاسم بالإنجليزية" aria-label="الاسم بالإنجليزية" />
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="text-xs text-slate-500 block mb-1">الوصف</label>
                        <textarea value={season.description} onChange={e => updateSeasonMeta(activeSeasonKey, 'description', e.target.value)} className="w-full bg-admin-surface border border-admin-border rounded px-2 py-1.5 text-white text-sm text-right min-h-[50px]" dir="rtl" title="الوصف" aria-label="وصف الموسم" placeholder="وصف الموسم" />
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                        <div>
                          <label className="text-xs text-slate-500 block mb-1">شهر البداية</label>
                          <input type="number" min={1} max={12} value={season.startDate.month} onChange={e => updateSeasonMeta(activeSeasonKey, 'startDate', { ...season.startDate, month: +e.target.value })} className="w-full bg-admin-surface border border-admin-border rounded px-2 py-1.5 text-white text-sm" title="شهر البداية" aria-label="شهر البداية" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 block mb-1">يوم البداية</label>
                          <input type="number" min={1} max={30} value={season.startDate.day} onChange={e => updateSeasonMeta(activeSeasonKey, 'startDate', { ...season.startDate, day: +e.target.value })} className="w-full bg-admin-surface border border-admin-border rounded px-2 py-1.5 text-white text-sm" title="يوم البداية" aria-label="يوم البداية" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 block mb-1">شهر النهاية</label>
                          <input type="number" min={1} max={12} value={season.endDate.month} onChange={e => updateSeasonMeta(activeSeasonKey, 'endDate', { ...season.endDate, month: +e.target.value })} className="w-full bg-admin-surface border border-admin-border rounded px-2 py-1.5 text-white text-sm" title="شهر النهاية" aria-label="شهر النهاية" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 block mb-1">يوم النهاية</label>
                          <input type="number" min={1} max={30} value={season.endDate.day} onChange={e => updateSeasonMeta(activeSeasonKey, 'endDate', { ...season.endDate, day: +e.target.value })} className="w-full bg-admin-surface border border-admin-border rounded px-2 py-1.5 text-white text-sm" title="يوم النهاية" aria-label="يوم النهاية" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className="text-xs text-slate-500 block mb-1">الأيقونة</label>
                          <input value={season.icon} onChange={e => updateSeasonMeta(activeSeasonKey, 'icon', e.target.value)} className="w-full bg-admin-surface border border-admin-border rounded px-2 py-1.5 text-white text-sm" title="اسم الأيقونة" aria-label="اسم الأيقونة" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 block mb-1">اللون</label>
                          <div className="flex items-center gap-2">
                            <input type="color" value={season.color} onChange={e => updateSeasonMeta(activeSeasonKey, 'color', e.target.value)} className="w-8 h-8 rounded cursor-pointer" title="لون الموسم" aria-label="لون الموسم" />
                            <input value={season.color} onChange={e => updateSeasonMeta(activeSeasonKey, 'color', e.target.value)} className="flex-1 bg-admin-surface border border-admin-border rounded px-2 py-1.5 text-white text-sm" title="كود اللون" aria-label="كود اللون" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Special Days */}
                    <div className="border border-admin-border rounded-lg p-4 bg-admin-bg/50">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-slate-300">الأيام المميزة ({season.specialDays?.length || 0})</h3>
                        <button
                          onClick={() => {
                            const days = [...(season.specialDays || []), { day: 1, nameAr: '', nameEn: '', description: '', virtues: [], recommendedActions: [] }];
                            updateSeasonMeta(activeSeasonKey, 'specialDays', days);
                          }}
                          className="flex items-center gap-1 px-2 py-1 bg-accent-dark/20 text-accent-light rounded text-xs hover:bg-accent-dark/30"
                        >
                          <Plus size={12} /> إضافة
                        </button>
                      </div>
                      {(season.specialDays || []).map((sd, si) => (
                        <div key={si} className="border border-admin-border rounded-lg p-3 mb-2 bg-admin-surface/50">
                          <div className="grid grid-cols-4 gap-2 mb-2">
                            <input type="number" value={sd.day} min={1} max={30} onChange={e => { const days = [...(season.specialDays || [])]; days[si] = { ...sd, day: +e.target.value }; updateSeasonMeta(activeSeasonKey, 'specialDays', days); }} className="bg-admin-surface border border-admin-border rounded px-2 py-1 text-white text-sm" placeholder="اليوم" title="رقم اليوم" aria-label="رقم اليوم" />
                            <input value={sd.nameAr} onChange={e => { const days = [...(season.specialDays || [])]; days[si] = { ...sd, nameAr: e.target.value }; updateSeasonMeta(activeSeasonKey, 'specialDays', days); }} className="bg-admin-surface border border-admin-border rounded px-2 py-1 text-white text-sm text-right" dir="rtl" placeholder="الاسم بالعربية" title="الاسم بالعربية" aria-label="الاسم بالعربية" />
                            <input value={sd.nameEn} onChange={e => { const days = [...(season.specialDays || [])]; days[si] = { ...sd, nameEn: e.target.value }; updateSeasonMeta(activeSeasonKey, 'specialDays', days); }} className="bg-admin-surface border border-admin-border rounded px-2 py-1 text-white text-sm" placeholder="الاسم بالإنجليزية" title="الاسم بالإنجليزية" aria-label="الاسم بالإنجليزية" />
                            <button onClick={() => { const days = (season.specialDays || []).filter((_, idx) => idx !== si); updateSeasonMeta(activeSeasonKey, 'specialDays', days); }} className="p-1 hover:bg-red-900/30 rounded self-center justify-self-center" title="حذف اليوم">
                              <Trash2 size={14} className="text-red-400" />
                            </button>
                          </div>
                          <textarea value={sd.description} onChange={e => { const days = [...(season.specialDays || [])]; days[si] = { ...sd, description: e.target.value }; updateSeasonMeta(activeSeasonKey, 'specialDays', days); }} className="w-full bg-admin-surface border border-admin-border rounded px-2 py-1 text-white text-sm text-right mb-2 min-h-[40px]" dir="rtl" placeholder="الوصف" title="الوصف" aria-label="وصف اليوم" />
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-xs text-slate-500 block mb-1">الفضائل</span>
                              {sd.virtues.map((v, vi) => (
                                <div key={vi} className="flex gap-1 mb-1">
                                  <input value={v} onChange={e => { const days = [...(season.specialDays || [])]; const virtues = [...sd.virtues]; virtues[vi] = e.target.value; days[si] = { ...sd, virtues }; updateSeasonMeta(activeSeasonKey, 'specialDays', days); }} className="flex-1 bg-admin-surface border border-admin-border rounded px-2 py-0.5 text-white text-xs text-right" dir="rtl" title="نص الفضيلة" aria-label="نص الفضيلة" />
                                  <button onClick={() => { const days = [...(season.specialDays || [])]; days[si] = { ...sd, virtues: sd.virtues.filter((_, idx) => idx !== vi) }; updateSeasonMeta(activeSeasonKey, 'specialDays', days); }} className="p-0.5 hover:bg-red-900/30 rounded" title="حذف"><Trash2 size={10} className="text-red-400" /></button>
                                </div>
                              ))}
                              <button onClick={() => { const days = [...(season.specialDays || [])]; days[si] = { ...sd, virtues: [...sd.virtues, ''] }; updateSeasonMeta(activeSeasonKey, 'specialDays', days); }} className="text-accent-light text-xs hover:text-emerald-300">+ فضيلة</button>
                            </div>
                            <div>
                              <span className="text-xs text-slate-500 block mb-1">الأعمال المستحبة</span>
                              {sd.recommendedActions.map((a, ai) => (
                                <div key={ai} className="flex gap-1 mb-1">
                                  <input value={a} onChange={e => { const days = [...(season.specialDays || [])]; const actions = [...sd.recommendedActions]; actions[ai] = e.target.value; days[si] = { ...sd, recommendedActions: actions }; updateSeasonMeta(activeSeasonKey, 'specialDays', days); }} className="flex-1 bg-admin-surface border border-admin-border rounded px-2 py-0.5 text-white text-xs text-right" dir="rtl" title="نص العمل" aria-label="نص العمل" />
                                  <button onClick={() => { const days = [...(season.specialDays || [])]; days[si] = { ...sd, recommendedActions: sd.recommendedActions.filter((_, idx) => idx !== ai) }; updateSeasonMeta(activeSeasonKey, 'specialDays', days); }} className="p-0.5 hover:bg-red-900/30 rounded" title="حذف"><Trash2 size={10} className="text-red-400" /></button>
                                </div>
                              ))}
                              <button onClick={() => { const days = [...(season.specialDays || [])]; days[si] = { ...sd, recommendedActions: [...sd.recommendedActions, ''] }; updateSeasonMeta(activeSeasonKey, 'specialDays', days); }} className="text-accent-light text-xs hover:text-emerald-300">+ عمل</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Greetings */}
                    <div className="border border-admin-border rounded-lg p-4 bg-admin-bg/50">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-300">التحيات الموسمية ({season.greetings?.length || 0})</h3>
                          {unifiedSeasonCopy && (
                            <p className="text-xs text-emerald-300 mt-1">
                              هذه التحية موحدة مع بانر الصفحة الرئيسية وسيتم حفظها كنص واحد.
                            </p>
                          )}
                        </div>
                        <button
                          disabled={Boolean(unifiedSeasonCopy)}
                          onClick={() => updateSeasonMeta(activeSeasonKey, 'greetings', [...(season.greetings || []), ''])}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                            unifiedSeasonCopy
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              : 'bg-accent-dark/20 text-accent-light hover:bg-accent-dark/30'
                          }`}
                        >
                          <Plus size={12} /> إضافة
                        </button>
                      </div>
                      {(season.greetings || []).map((g, gi) => (
                        <div key={gi} className="flex items-center gap-2 mb-2">
                          <input
                            value={unifiedSeasonCopy ? unifiedSeasonCopy.subtitle : g}
                            readOnly={Boolean(unifiedSeasonCopy)}
                            onChange={e => { const greetings = [...(season.greetings || [])]; greetings[gi] = e.target.value; updateSeasonMeta(activeSeasonKey, 'greetings', greetings); }}
                            className={`flex-1 bg-admin-surface border border-admin-border rounded px-2 py-1.5 text-sm text-right ${
                              unifiedSeasonCopy ? 'text-emerald-200' : 'text-white'
                            }`}
                            dir="rtl"
                            title="نص التحية"
                            aria-label="نص التحية"
                          />
                          <button
                            disabled={Boolean(unifiedSeasonCopy)}
                            onClick={() => updateSeasonMeta(activeSeasonKey, 'greetings', (season.greetings || []).filter((_, idx) => idx !== gi))}
                            className={`p-1 rounded ${unifiedSeasonCopy ? 'cursor-not-allowed opacity-40' : 'hover:bg-red-900/30'}`}
                            title="حذف التحية"
                          >
                            <Trash2 size={14} className="text-red-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── EmptyState component ───────────────────────────────────────────────

function EmptyState({ label, onInit }: { label: string; onInit: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Edit2 size={32} className="text-slate-600 mb-3" />
      <p className="text-slate-400 mb-4">لا يوجد محتوى {label} في قاعدة البيانات بعد</p>
      <div className="flex items-center gap-3">
        <button
          onClick={onInit}
          className="flex items-center gap-2 px-4 py-2 bg-accent-dark hover:bg-emerald-700 rounded-lg text-white text-sm transition-colors"
        >
          <Download size={16} /> تحميل المحتوى الافتراضي
        </button>
      </div>
      <p className="text-xs text-slate-500 mt-3">
        سيتم تحميل المحتوى الافتراضي المُضمّن في التطبيق — يمكنك تعديله ثم حفظه
      </p>
    </div>
  );
}
