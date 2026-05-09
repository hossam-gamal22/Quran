// admin-panel/src/pages/AzkarManager.tsx
// إدارة الأذكار - روح المسلم
// آخر تحديث: 2026-03-04

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Download, RefreshCw, Play, Square, Search, FileJson, X, Upload, Edit2, Save, Plus, Trash2, Music, Volume2, VolumeX, Copy, ArrowUp, ArrowDown, FolderPlus, Image as ImageIcon } from 'lucide-react';
import AutoTranslateField from '../components/AutoTranslateField';
import TranslateButton from '../components/TranslateButton';
import { Styled } from '../components/Styled';
import { db, storage } from '../firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

// ========================================
// الأنواع
// ========================================

interface Zikr {
  id: number;
  category: string;
  subcategory?: string;
  arabic: string;
  transliteration: string;
  translations: Record<string, string | { text: string; verified?: boolean }>;
  count: number;
  sortOrder?: number;
  reference: string;
  benefit: string | Record<string, string | { text: string; verified?: boolean }>;
  audio: string;
}

interface AzkarData {
  version: string;
  lastUpdate: string;
  totalCount: number;
  azkar: Zikr[];
}

/**
 * Custom (admin-managed) category. Stored in Firestore collection
 * `azkar_categories`. Default 21 categories remain hardcoded and cannot be
 * edited or deleted from here. Custom categories appear ONLY in the mobile
 * app's "أذكار أخرى" page (not in the Home page main grid).
 */
interface CustomCategory {
  id: string;                            // e.g. 'c_1715180000000'
  name: Record<string, string>;          // 12 languages (ar required)
  icon: string;                          // emoji | mci name | 'img:<storage url>'
  color: string;                         // tailwind class (e.g. 'bg-rose-500')
  order: number;
  audioFile?: string | null;
  iconStoragePath?: string | null;       // for cleanup on delete
  createdAt?: string;
}

const COLOR_PALETTE = [
  'bg-amber-500', 'bg-purple-500', 'bg-blue-500', 'bg-pink-500', 'bg-teal-500',
  'bg-orange-500', 'bg-indigo-500', 'bg-lime-500', 'bg-cyan-500', 'bg-stone-500',
  'bg-sky-500', 'bg-green-500', 'bg-violet-500', 'bg-rose-500', 'bg-yellow-600',
  'bg-red-500', 'bg-emerald-500', 'bg-fuchsia-500',
];

const CATEGORY_ICONS_STORAGE_PATH = 'category-icons';
const CATEGORIES_COLLECTION = 'azkar_categories';
const MAX_CATEGORY_ICON_SIZE_MB = 1;

// ========================================
// الثوابت
// ========================================

const LANGUAGES = [
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'id', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'ms', name: 'Melayu', flag: '🇲🇾' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'ur', name: 'اردو', flag: '🇵🇰' },
  { code: 'bn', name: 'বাংলা', flag: '🇧🇩' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
];

const CATEGORIES = [
  { id: '1', name: 'أذكار الصباح', icon: '🌅', color: 'bg-amber-500' },
  { id: '1b', name: 'أذكار المساء', icon: '🌆', color: 'bg-purple-500' },
  { id: '2', name: 'أذكار النوم', icon: '🌙', color: 'bg-blue-500' },
  { id: '3', name: 'أذكار الاستيقاظ', icon: '☀️', color: 'bg-accent' },
  { id: '27', name: 'أذكار بعد الصلاة', icon: '🕌', color: 'bg-pink-500' },
  { id: '26', name: 'أدعية قبل السلام', icon: '📖', color: 'bg-teal-500' },
  { id: '34', name: 'دعاء الهم والحزن', icon: '⭐', color: 'bg-orange-500' },
  { id: '35', name: 'دعاء الكرب', icon: '🛡️', color: 'bg-indigo-500' },
  { id: '69', name: 'أذكار الطعام', icon: '🍽️', color: 'bg-lime-500' },
  { id: '10', name: 'دعاء الذهاب إلى المسجد', icon: '🕌', color: 'bg-cyan-500' },
  { id: '8', name: 'الذكر عند الخروج من المنزل', icon: '🏠', color: 'bg-stone-500' },
  { id: '96', name: 'أذكار السفر', icon: '✈️', color: 'bg-sky-500' },
  { id: '6', name: 'الذكر قبل الوضوء', icon: '💧', color: 'bg-blue-400' },
  { id: '80', name: 'الدعاء عند سماع الرعد', icon: '🌿', color: 'bg-green-500' },
  { id: '73', name: 'الدعاء عند الإفطار', icon: '🌙', color: 'bg-violet-500' },
  { id: '18', name: 'دعاء الاستفتاح', icon: 'hand-heart', color: 'bg-accent-dark' },
  { id: '107', name: 'الصلاة على النبي', icon: '☪️', color: 'bg-green-600' },
  { id: '129', name: 'الاستغفار والتوبة', icon: 'hand-heart', color: 'bg-teal-600' },
  { id: '130', name: 'فضائل الأذكار', icon: '📜', color: 'bg-yellow-600' },
  { id: '28', name: 'دعاء الاستخارة', icon: '🌟', color: 'bg-red-500' },
  { id: '32', name: 'دعاء القنوت', icon: 'hand-heart', color: 'bg-rose-500' },
];

const SUBCATEGORIES: Record<string, { id: string; name: string }[]> = {
  '27': [
    { id: 'general', name: 'عامة' },
    { id: 'after_fajr', name: 'بعد الفجر' },
    { id: 'after_fajr_maghrib', name: 'بعد الفجر والمغرب' },
  ],
};

const STORAGE_AUDIO_PATH = 'adhkar-audio';
const MAX_AUDIO_SIZE_MB = 15;

// ✅ استخدام raw.githubusercontent لتجنب مشكلة jsDelivr cache
const AZKAR_JSON_URL = 'https://raw.githubusercontent.com/hossam-gamal22/Quran/main/data/json/azkar.json';

const getZikrSortOrder = (zikr: Zikr): number => {
  const sortOrder = Number(zikr.sortOrder);
  return Number.isFinite(sortOrder) ? sortOrder : Number.POSITIVE_INFINITY;
};

const compareAzkar = (a: Zikr, b: Zikr): number => {
  const categoryDiff = String(a.category || '').localeCompare(String(b.category || ''), undefined, { numeric: true });
  if (categoryDiff !== 0) return categoryDiff;
  const aOrder = getZikrSortOrder(a);
  const bOrder = getZikrSortOrder(b);
  if (aOrder !== bOrder) return aOrder - bOrder;
  return (a.id || 0) - (b.id || 0);
};

const sortAzkarList = (items: Zikr[]): Zikr[] => [...items].sort(compareAzkar);

/**
 * Some Firestore translation/benefit values are stored as { text, verified }
 * objects instead of plain strings. Rendering an object in React throws
 * "Objects are not valid as a React child" (Minified error #31). This helper
 * always returns a renderable string.
 */
const resolveText = (value: unknown): string => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.text === 'string') return obj.text;
    if (typeof obj.ar === 'string') return obj.ar;
    if (typeof obj.en === 'string') return obj.en;
  }
  return '';
};

// ========================================
// المكون الرئيسي
// ========================================

const AzkarManager: React.FC = () => {
  const [azkarData, setAzkarData] = useState<AzkarData | null>(null);
  const [azkarList, setAzkarList] = useState<Zikr[]>([]);
  const [filteredList, setFilteredList] = useState<Zikr[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [selectedZikr, setSelectedZikr] = useState<Zikr | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingZikr, setEditingZikr] = useState<Zikr | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [dataSource, setDataSource] = useState<'github' | 'firestore'>('github');
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'audio'>('list');
  const [notification, setNotification] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  // ===== Custom Categories state =====
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CustomCategory | null>(null);
  const [isUploadingCategoryIcon, setIsUploadingCategoryIcon] = useState(false);
  const categoryIconInputRef = useRef<HTMLInputElement>(null);

  // Merged list (default + custom) for use in filter buttons & zikr edit dropdown.
  // Default categories keep their hardcoded order; custom categories are appended,
  // sorted by their `order` field then by createdAt.
  const allCategories = useMemo(() => {
    const customSorted = [...customCategories]
      .sort((a, b) => {
        const oa = Number(a.order); const ob = Number(b.order);
        if (Number.isFinite(oa) && Number.isFinite(ob) && oa !== ob) return oa - ob;
        return (a.createdAt || '').localeCompare(b.createdAt || '');
      })
      .map(c => ({
        id: c.id,
        name: c.name?.ar || c.name?.en || c.id,
        icon: c.icon,
        color: c.color || 'bg-slate-500',
        isCustom: true as const,
      }));
    return [
      ...CATEGORIES.map(c => ({ ...c, isCustom: false as const })),
      ...customSorted,
    ];
  }, [customCategories]);

  // ========================================
  // تحميل البيانات
  // ========================================

  useEffect(() => {
    // On mount, prefer Firestore (source of truth for the live app).
    // Falls back to GitHub JSON only if Firestore is empty (first-time bootstrap).
    loadFromFirestoreOrGithub();
    // Initial load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterAzkar();
    // Derived list depends on the three values above; filterAzkar is kept local for clarity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [azkarList, selectedCategory, searchQuery]);

  const filterAzkar = () => {
    let filtered = [...azkarList];

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(z => z.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(z =>
        z.arabic?.includes(searchQuery) ||
        z.transliteration?.toLowerCase().includes(query) ||
        z.id?.toString() === query ||
        resolveText(z.translations?.en).toLowerCase().includes(query)
      );
    }

    setFilteredList(filtered);
  };

  const loadAzkarFromGitHub = async () => {
    setLoading(true);

    try {
      // إضافة timestamp لتجنب الـ cache
      const url = `${AZKAR_JSON_URL}?t=${Date.now()}`;

      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // Support both shapes: a bare array OR { azkar: [...] }
      const list: Zikr[] = Array.isArray(data)
        ? (data as Zikr[])
        : (data?.azkar || []);
      const sortedList = sortAzkarList(list);

      setAzkarData({
        version: (data?.version as string) || '2.0',
        lastUpdate: (data?.lastUpdate as string) || new Date().toISOString().split('T')[0],
        totalCount: sortedList.length,
        azkar: sortedList,
      });
      setAzkarList(sortedList);
      setDataSource('github');
      showNotification(`✅ تم تحميل ${sortedList.length} ذكر بنجاح`, 'success');

    } catch (error) {
      console.error('Error loading azkar:', error);
      showNotification('❌ خطأ في تحميل الأذكار', 'error');
    }

    setLoading(false);
  };

  /**
   * Load from Firestore (source of truth used by the mobile app). If Firestore
   * is empty (first-time bootstrap), fall back to the bundled GitHub JSON so
   * the admin can then click "رفع إلى Firestore" to seed it.
   */
  const loadFromFirestoreOrGithub = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'azkar'));
      if (!snap.empty) {
        const items = snap.docs.map((d) => d.data() as Zikr).filter((z) => z && typeof z.id === 'number');
        const sortedItems = sortAzkarList(items);
        setAzkarList(sortedItems);
        setAzkarData({
          version: 'firestore',
          lastUpdate: new Date().toISOString().split('T')[0],
          totalCount: sortedItems.length,
          azkar: sortedItems,
        });
        setDataSource('firestore');
        showNotification(`✅ تم تحميل ${sortedItems.length} ذكر من Firestore`, 'success');
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn('Firestore load failed, falling back to GitHub:', e);
    }
    setLoading(false);
    // Firestore empty or unreachable — load bundled JSON
    await loadAzkarFromGitHub();
  };

  // ========================================
  // Custom Categories — Firestore CRUD
  // ========================================

  useEffect(() => {
    loadCustomCategories();
  }, []);

  const loadCustomCategories = async () => {
    try {
      const snap = await getDocs(collection(db, CATEGORIES_COLLECTION));
      const items: CustomCategory[] = snap.docs
        .map(d => d.data() as CustomCategory)
        .filter(c => c && typeof c.id === 'string');
      setCustomCategories(items);
    } catch (err) {
      console.warn('[AzkarManager] loadCustomCategories failed:', err);
    }
  };

  const openNewCategory = () => {
    const nextOrder = customCategories.reduce((m, c) => Math.max(m, Number(c.order) || 0), 0) + 1;
    setEditingCategory({
      id: `c_${Date.now()}`,
      name: { ar: '' },
      icon: '🌟',
      color: 'bg-rose-500',
      order: nextOrder,
      audioFile: null,
      iconStoragePath: null,
      createdAt: new Date().toISOString(),
    });
    setShowCategoryModal(true);
  };

  const openEditCategory = (cat: CustomCategory) => {
    setEditingCategory({ ...cat, name: { ...cat.name } });
    setShowCategoryModal(true);
  };

  const saveCategory = async () => {
    if (!editingCategory) return;
    const name = (editingCategory.name?.ar || '').trim();
    if (!name) {
      showNotification('❌ الاسم بالعربية مطلوب', 'error');
      return;
    }
    try {
      const payload: CustomCategory = {
        ...editingCategory,
        name: { ...editingCategory.name, ar: name },
        order: Number(editingCategory.order) || 0,
        createdAt: editingCategory.createdAt || new Date().toISOString(),
      };
      await setDoc(doc(db, CATEGORIES_COLLECTION, payload.id), payload);
      setCustomCategories(prev => {
        const exists = prev.some(c => c.id === payload.id);
        return exists ? prev.map(c => (c.id === payload.id ? payload : c)) : [...prev, payload];
      });
      showNotification('✅ تم حفظ الفئة', 'success');
      setShowCategoryModal(false);
      setEditingCategory(null);
    } catch (err) {
      showNotification(`❌ ${(err as Error).message}`, 'error');
    }
  };

  const deleteCategory = async (cat: CustomCategory) => {
    const inUse = azkarList.filter(z => z.category === cat.id).length;
    const message = inUse > 0
      ? `هذه الفئة مرتبطة بـ ${inUse} ذكر. سيتم الحذف لكن الأذكار ستحتاج لإعادة إسناد. متابعة؟`
      : 'حذف هذه الفئة المخصصة؟';
    if (!confirm(message)) return;
    try {
      await deleteDoc(doc(db, CATEGORIES_COLLECTION, cat.id));
      // best-effort delete of uploaded icon
      if (cat.iconStoragePath) {
        try { await deleteObject(ref(storage, cat.iconStoragePath)); } catch { /* ignore */ }
      }
      setCustomCategories(prev => prev.filter(c => c.id !== cat.id));
      showNotification('✅ تم حذف الفئة', 'success');
    } catch (err) {
      showNotification(`❌ ${(err as Error).message}`, 'error');
    }
  };

  const handleCategoryIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingCategory) return;
    e.target.value = '';
    if (file.size > MAX_CATEGORY_ICON_SIZE_MB * 1024 * 1024) {
      showNotification(`❌ حجم الصورة يجب أن يكون أقل من ${MAX_CATEGORY_ICON_SIZE_MB}MB`, 'error');
      return;
    }
    if (!/^image\/(png|jpe?g|svg\+xml|webp)$/i.test(file.type)) {
      showNotification('❌ صيغة الصورة غير مدعومة (PNG/JPG/SVG/WebP فقط)', 'error');
      return;
    }
    setIsUploadingCategoryIcon(true);
    try {
      const ext = (file.name.split('.').pop() || 'png').toLowerCase();
      const path = `${CATEGORY_ICONS_STORAGE_PATH}/${editingCategory.id}.${ext}`;
      // remove old uploaded icon if any
      if (editingCategory.iconStoragePath && editingCategory.iconStoragePath !== path) {
        try { await deleteObject(ref(storage, editingCategory.iconStoragePath)); } catch { /* ignore */ }
      }
      const fileRef = ref(storage, path);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      setEditingCategory({
        ...editingCategory,
        icon: `img:${url}`,
        iconStoragePath: path,
      });
      showNotification('✅ تم رفع الأيقونة', 'success');
    } catch (err) {
      showNotification(`❌ ${(err as Error).message}`, 'error');
    } finally {
      setIsUploadingCategoryIcon(false);
    }
  };

  // ========================================
  // الدوال المساعدة
  // ========================================

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 3000);
  };

  const playAudio = (audioPath: string) => {
    if (audioElement) {
      audioElement.pause();
    }

    if (!audioPath) {
      showNotification('❌ لا يوجد صوت لهذا الذكر', 'error');
      return;
    }
    const isAbsolute = /^https?:\/\//i.test(audioPath);
    const url = isAbsolute
      ? audioPath
      : `https://raw.githubusercontent.com/hossam-gamal22/Quran/main/assets/sounds/azkar_authentic/${encodeURIComponent(audioPath)}`;

    const audio = new Audio(url);
    audio.onended = () => setPlayingAudio(null);
    audio.onerror = () => {
      showNotification(`❌ خطأ في تشغيل الصوت (${audioPath})`, 'error');
      setPlayingAudio(null);
    };
    audio.play().catch((err) => {
      showNotification(`❌ فشل التشغيل: ${err?.message || 'unknown'}`, 'error');
      setPlayingAudio(null);
    });
    setAudioElement(audio);
    setPlayingAudio(audioPath);
  };

  const stopAudio = () => {
    if (audioElement) {
      audioElement.pause();
    }
    setPlayingAudio(null);
  };

  // Download the audio file currently linked to a zikr.
  // Supports both Firebase Storage URLs and bare filenames (resolved against
  // the GitHub CDN used by the mobile app's azkar-audio-cache).
  const GITHUB_AUDIO_BASE =
    'https://raw.githubusercontent.com/hossam-gamal22/Quran/main/assets/sounds/azkar_authentic/';

  const downloadAudio = async (zikr: Zikr) => {
    if (!zikr.audio) {
      showNotification('❌ لا يوجد صوت لهذا الذكر', 'error');
      return;
    }
    const isAbsolute = /^https?:\/\//i.test(zikr.audio);
    const url = isAbsolute ? zikr.audio : `${GITHUB_AUDIO_BASE}${encodeURIComponent(zikr.audio)}`;
    const ext = (zikr.audio.match(/\.([a-zA-Z0-9]{1,5})(?:\?|$)/)?.[1] || 'm4a').toLowerCase();
    const catName = (CATEGORIES.find(c => c.id === zikr.category)?.name || 'azkar').replace(/\s+/g, '_');
    const fileName = `zikr_${zikr.id}_${catName}.${ext}`;
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      a.remove();
      await navigator.clipboard?.writeText(url).catch(() => {});
      showNotification(`✅ تم فتح رابط التحميل ونسخه: ${fileName}`, 'success');
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
      showNotification(`✅ تم فتح رابط الصوت في تبويب جديد: ${fileName}`, 'success');
    }
  };

  const exportToJson = () => {
    const exportData = {
      version: azkarData?.version || '2.0',
      lastUpdate: new Date().toISOString().split('T')[0],
      totalCount: azkarList.length,
      azkar: azkarList,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `azkar_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification(`📥 تم تصدير ${azkarList.length} ذكر`, 'success');
  };

  const getNewZikrCategory = () => {
    return selectedCategory === 'all' ? CATEGORIES[0].id : selectedCategory;
  };

  const getNextSortOrder = (categoryId: string) => {
    const sameCategory = azkarList.filter(z => z.category === categoryId);
    const finiteOrders = sameCategory
      .map(z => Number(z.sortOrder))
      .filter(Number.isFinite);
    if (finiteOrders.length > 0) return Math.max(...finiteOrders) + 1;
    return sameCategory.length + 1;
  };

  const normalizeZikrForSave = (zikr: Zikr): Zikr => {
    const sortOrder = Number(zikr.sortOrder);
    return {
      ...zikr,
      category: zikr.category || CATEGORIES[0].id,
      count: Math.max(1, Number(zikr.count) || 1),
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : getNextSortOrder(zikr.category || CATEGORIES[0].id),
      audio: zikr.audio || '',
      translations: zikr.translations || {},
    };
  };

  // ========================================
  // Firestore CRUD
  // ========================================

  const loadFromFirestore = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'azkar'));
      if (snap.empty) {
        showNotification('لا توجد بيانات في Firestore — استخدم "رفع إلى Firestore" أولاً', 'error');
        setLoading(false);
        return;
      }
      const items = sortAzkarList(snap.docs.map(d => d.data() as Zikr));
      setAzkarList(items);
      setAzkarData({ version: 'firestore', lastUpdate: new Date().toISOString().split('T')[0], totalCount: items.length, azkar: items });
      setDataSource('firestore');
      showNotification(`✅ تم تحميل ${items.length} ذكر من Firestore`, 'success');
    } catch (e) {
      showNotification(`❌ ${(e as Error).message}`, 'error');
    }
    setLoading(false);
  };

  const syncToFirestore = async () => {
    if (!azkarList.length) return;
    // EXTRA SAFETY: this is a destructive bulk-overwrite. Block it when the
    // current data came from GitHub — otherwise it would wipe per-zikr edits
    // that admins have saved directly to Firestore.
    if (dataSource === 'github') {
      const confirmed = confirm(
        '⚠️ تحذير خطير:\n\n' +
        'البيانات الحالية محملة من GitHub (النسخة الأصلية).\n' +
        'الرفع الآن سيمسح كل التعديلات المحفوظة في Firestore (النصوص، الأصوات، الترجمات).\n\n' +
        'هل أنت متأكد؟ العملية لا يمكن التراجع عنها.',
      );
      if (!confirmed) return;
    } else if (!confirm(`رفع ${azkarList.length} ذكر إلى Firestore؟ سيتم استبدال البيانات الموجودة.`)) {
      return;
    }
    setIsSyncing(true);
    try {
      const batchSize = 400;
      for (let i = 0; i < azkarList.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = azkarList.slice(i, i + batchSize);
        for (const zikr of chunk) {
          batch.set(doc(db, 'azkar', String(zikr.id)), zikr);
        }
        await batch.commit();
      }
      showNotification(`✅ تم رفع ${azkarList.length} ذكر إلى Firestore`, 'success');
    } catch (e) {
      showNotification(`❌ ${(e as Error).message}`, 'error');
    }
    setIsSyncing(false);
  };

  const saveZikr = async (zikr: Zikr) => {
    try {
      const normalized = normalizeZikrForSave(zikr);
      await setDoc(doc(db, 'azkar', String(normalized.id)), normalized);
      setAzkarList(prev => {
        const idx = prev.findIndex(z => z.id === normalized.id);
        if (idx >= 0) return sortAzkarList(prev.map(z => z.id === normalized.id ? normalized : z));
        return sortAzkarList([...prev, normalized]);
      });
      setShowEditModal(false);
      setEditingZikr(null);
      showNotification('✅ تم حفظ الذكر', 'success');
    } catch (e) {
      showNotification(`❌ ${(e as Error).message}`, 'error');
    }
  };

  const deleteZikr = async (id: number) => {
    if (!confirm('هل تريد حذف هذا الذكر؟')) return;
    try {
      await deleteDoc(doc(db, 'azkar', String(id)));
      setAzkarList(prev => prev.filter(z => z.id !== id));
      showNotification('✅ تم حذف الذكر', 'success');
    } catch (e) {
      showNotification(`❌ ${(e as Error).message}`, 'error');
    }
  };

  const openEditZikr = (zikr?: Zikr) => {
    const newCategory = getNewZikrCategory();
    setEditingZikr(zikr || {
      id: Math.max(0, ...azkarList.map(z => z.id)) + 1,
      category: newCategory,
      sortOrder: getNextSortOrder(newCategory),
      arabic: '', transliteration: '', translations: {}, count: 1, reference: '', benefit: '', audio: '',
    });
    setShowEditModal(true);
  };

  // ========================================
  // إدارة الصوت
  // ========================================

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>, zikrId: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_AUDIO_SIZE_MB * 1024 * 1024) {
      showNotification(`❌ حجم الملف أكبر من ${MAX_AUDIO_SIZE_MB} MB`, 'error');
      return;
    }

    if (!file.type.startsWith('audio/')) {
      showNotification('❌ يجب اختيار ملف صوتي', 'error');
      return;
    }

    setIsUploadingAudio(true);
    try {
      const fileName = `zikr_${zikrId}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const storageRef = ref(storage, `${STORAGE_AUDIO_PATH}/${fileName}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      // Update the zikr
      const updatedZikr = azkarList.find(z => z.id === zikrId);
      if (updatedZikr) {
        const updated = { ...updatedZikr, audio: url };
        await setDoc(doc(db, 'azkar', String(zikrId)), updated);
        setAzkarList(prev => sortAzkarList(prev.map(z => z.id === zikrId ? updated : z)));
      }

      if (editingZikr && editingZikr.id === zikrId) {
        setEditingZikr({ ...editingZikr, audio: url });
      }

      showNotification('✅ تم رفع الصوت بنجاح', 'success');
    } catch (err) {
      showNotification(`❌ خطأ في رفع الصوت: ${(err as Error).message}`, 'error');
    }
    setIsUploadingAudio(false);
    if (e.target) e.target.value = '';
  };

  const removeAudio = async (zikrId: number) => {
    if (!confirm('هل تريد إزالة الصوت من هذا الذكر؟')) return;
    try {
      const zikr = azkarList.find(z => z.id === zikrId);
      if (!zikr) return;

      // Try to delete from Storage if it's a Firebase URL
      if (zikr.audio?.includes('firebasestorage')) {
        try {
          const audioRef = ref(storage, zikr.audio);
          await deleteObject(audioRef);
        } catch { /* ignore if not found */ }
      }

      const updated = { ...zikr, audio: '' };
      await setDoc(doc(db, 'azkar', String(zikrId)), updated);
      setAzkarList(prev => sortAzkarList(prev.map(z => z.id === zikrId ? updated : z)));

      if (editingZikr && editingZikr.id === zikrId) {
        setEditingZikr({ ...editingZikr, audio: '' });
      }

      showNotification('✅ تم إزالة الصوت', 'success');
    } catch (err) {
      showNotification(`❌ ${(err as Error).message}`, 'error');
    }
  };

  const moveZikr = async (zikrId: number, direction: 'up' | 'down') => {
    const target = azkarList.find(z => z.id === zikrId);
    if (!target) return;

    const categoryItems = sortAzkarList(azkarList.filter(z => z.category === target.category));
    const currentIdx = categoryItems.findIndex(z => z.id === zikrId);
    const swapIdx = direction === 'up' ? currentIdx - 1 : currentIdx + 1;
    if (currentIdx < 0 || swapIdx < 0 || swapIdx >= categoryItems.length) return;

    const reordered = [...categoryItems];
    [reordered[currentIdx], reordered[swapIdx]] = [reordered[swapIdx], reordered[currentIdx]];
    const normalized = reordered.map((z, index) => ({ ...z, sortOrder: index + 1 }));

    try {
      const batch = writeBatch(db);
      normalized.forEach(z => {
        batch.set(doc(db, 'azkar', String(z.id)), z, { merge: true });
      });
      await batch.commit();

      const updatedById = new Map(normalized.map(z => [z.id, z]));
      setAzkarList(prev => sortAzkarList(prev.map(z => updatedById.get(z.id) || z)));
      if (editingZikr && updatedById.has(editingZikr.id)) {
        setEditingZikr(updatedById.get(editingZikr.id) || editingZikr);
      }
      showNotification('✅ تم تحديث ترتيب الأذكار', 'success');
    } catch (err) {
      showNotification(`❌ ${(err as Error).message}`, 'error');
    }
  };

  const getMoveState = (zikr: Zikr) => {
    const categoryItems = sortAzkarList(azkarList.filter(z => z.category === zikr.category));
    const index = categoryItems.findIndex(z => z.id === zikr.id);
    return {
      canMoveUp: index > 0,
      canMoveDown: index >= 0 && index < categoryItems.length - 1,
    };
  };

  // ========================================
  // الإحصائيات
  // ========================================

  const stats = {
    total: azkarList.length,
    withAudio: azkarList.filter(z => z.audio).length,
    categories: CATEGORIES.length,
    languages: LANGUAGES.length,
    byCategory: CATEGORIES.reduce((acc, cat) => {
      acc[cat.id] = azkarList.filter(z => z.category === cat.id).length;
      return acc;
    }, {} as Record<string, number>),
  };

  const getTranslationCoverage = () => {
    if (azkarList.length === 0) return 0;
    let total = 0;
    azkarList.forEach(z => {
      if (z.translations) {
        total += Object.keys(z.translations).length;
      }
    });
    return Math.round((total / (azkarList.length * LANGUAGES.length)) * 100);
  };

  // ========================================
  // الواجهة
  // ========================================

  return (
    <div className="space-y-6" dir="rtl">
      {/* Notification */}
      {notification.show && (
        <div className={`fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 p-4 rounded-xl shadow-lg z-50 ${
          notification.type === 'success' ? 'bg-accent' : 'bg-red-500'
        } text-white font-medium`}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">إدارة الأذكار والأدعية</h1>
          <p className="text-slate-400 text-sm mt-1">
            {azkarData && (
              <span>الإصدار: {azkarData.version} | آخر تحديث: {azkarData.lastUpdate} | المصدر: {dataSource === 'firestore' ? 'Firestore' : 'GitHub'}</span>
            )}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => openEditZikr()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            إضافة ذكر
          </button>
          <button
            onClick={syncToFirestore}
            disabled={isSyncing || azkarList.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl disabled:opacity-50 transition-colors"
          >
            <Upload className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            رفع إلى Firestore
          </button>
          <button
            onClick={loadFromFirestore}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl disabled:opacity-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            تحميل من Firestore
          </button>
          <button
            onClick={loadFromFirestoreOrGithub}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-accent-dark hover:bg-accent-dark text-white rounded-xl disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
          <button
            onClick={exportToJson}
            disabled={azkarList.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-admin-surface-light hover:bg-admin-surface-light text-white rounded-xl disabled:opacity-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            تصدير
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl text-white">
          <p className="text-sm opacity-80">إجمالي الأذكار</p>
          <p className="text-3xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 rounded-xl text-white">
          <p className="text-sm opacity-80">مع صوت</p>
          <p className="text-3xl font-bold">{stats.withAudio}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-xl text-white">
          <p className="text-sm opacity-80">الفئات</p>
          <p className="text-3xl font-bold">{stats.categories}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-4 rounded-xl text-white">
          <p className="text-sm opacity-80">اللغات</p>
          <p className="text-3xl font-bold">{stats.languages}</p>
        </div>
        <div className="bg-gradient-to-br from-pink-500 to-pink-600 p-4 rounded-xl text-white">
          <p className="text-sm opacity-80">تغطية الترجمة</p>
          <p className="text-3xl font-bold">{getTranslationCoverage()}%</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-admin-surface/50 p-1 rounded-xl border border-admin-border/50">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
            activeTab === 'list' ? 'bg-accent-dark text-white' : 'text-slate-400 hover:text-white hover:bg-admin-surface-light'
          }`}
        >
          <Search className="w-4 h-4" />
          قائمة الأذكار
        </button>
        <button
          onClick={() => setActiveTab('audio')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
            activeTab === 'audio' ? 'bg-accent-dark text-white' : 'text-slate-400 hover:text-white hover:bg-admin-surface-light'
          }`}
        >
          <Music className="w-4 h-4" />
          إدارة الصوتيات ({stats.withAudio}/{stats.total})
        </button>
      </div>

      {/* ======= AUDIO TAB ======= */}
      {activeTab === 'audio' && (
        <div className="space-y-6">
          {/* Audio Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-accent/10 border border-accent/30 p-4 rounded-xl">
              <p className="text-accent-light text-sm">مع صوت</p>
              <p className="text-2xl font-bold text-white">{stats.withAudio}</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl">
              <p className="text-red-400 text-sm">بدون صوت</p>
              <p className="text-2xl font-bold text-white">{stats.total - stats.withAudio}</p>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-xl">
              <p className="text-blue-400 text-sm">نسبة التغطية</p>
              <p className="text-2xl font-bold text-white">{stats.total ? Math.round((stats.withAudio / stats.total) * 100) : 0}%</p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl">
              <p className="text-amber-400 text-sm">الفئات</p>
              <p className="text-2xl font-bold text-white">{CATEGORIES.length}</p>
            </div>
          </div>

          {/* Audio by Category */}
          <div className="bg-admin-surface/50 rounded-xl p-4 border border-admin-border/50">
            <h3 className="text-white font-medium mb-4">الصوتيات حسب الفئة</h3>
            <div className="space-y-3">
              {CATEGORIES.map(cat => {
                const catAzkar = azkarList.filter(z => z.category === cat.id);
                const withAudio = catAzkar.filter(z => z.audio);
                const percentage = catAzkar.length ? Math.round((withAudio.length / catAzkar.length) * 100) : 0;
                return (
                  <div key={cat.id} className="bg-admin-bg/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white">{cat.icon} {cat.name}</span>
                      <span className="text-slate-400 text-sm">{withAudio.length}/{catAzkar.length} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-admin-surface-light rounded-full h-2">
                      <Styled
                        className={`${cat.color} h-2 rounded-full transition-all`}
                        css={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Audio List - show azkar with audio for management */}
          <div className="bg-admin-surface/50 rounded-xl border border-admin-border/50 overflow-hidden">
            <div className="p-4 border-b border-admin-border/50 flex items-center justify-between">
              <h3 className="text-white font-medium">الأذكار الصوتية</h3>
              <div className="flex gap-2">
                  <select
                  className="bg-admin-surface-light text-white rounded-lg px-3 py-1.5 text-sm border border-admin-border"
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  aria-label="فلتر الفئة"
                  title="فلتر الفئة"
                >
                  <option value="all">كل الفئات</option>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="divide-y divide-slate-700/50 max-h-[600px] overflow-y-auto">
              {filteredList.map(zikr => {
                const moveState = getMoveState(zikr);
                return (
                <div key={zikr.id} className="p-3 hover:bg-admin-surface-light/20 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm leading-relaxed line-clamp-2">{zikr.arabic}</p>
                      <p className="text-slate-500 text-xs mt-1">#{zikr.id} • ترتيب {Number.isFinite(Number(zikr.sortOrder)) ? zikr.sortOrder : '—'} • {CATEGORIES.find(c => c.id === zikr.category)?.name}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => moveZikr(zikr.id, 'up')}
                        disabled={!moveState.canMoveUp}
                        className="p-2 text-slate-300 hover:bg-admin-surface-light rounded-lg transition-colors disabled:opacity-30"
                        aria-label="تحريك لأعلى"
                        title="تحريك لأعلى"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveZikr(zikr.id, 'down')}
                        disabled={!moveState.canMoveDown}
                        className="p-2 text-slate-300 hover:bg-admin-surface-light rounded-lg transition-colors disabled:opacity-30"
                        aria-label="تحريك لأسفل"
                        title="تحريك لأسفل"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      {zikr.audio ? (
                        <>
                          <button
                            onClick={() => playingAudio === zikr.audio ? stopAudio() : playAudio(zikr.audio)}
                            className={`p-2 rounded-lg transition-colors ${
                              playingAudio === zikr.audio ? 'bg-red-500 text-white' : 'bg-accent/20 text-accent-light hover:bg-accent/30'
                            }`}
                            aria-label={playingAudio === zikr.audio ? 'إيقاف' : 'تشغيل'}
                            title={playingAudio === zikr.audio ? 'إيقاف' : 'تشغيل'}
                          >
                            {playingAudio === zikr.audio ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => downloadAudio(zikr)}
                            className="p-2 text-cyan-400 hover:bg-cyan-500/20 rounded-lg transition-colors"
                            aria-label="تحميل الصوت"
                            title="تحميل الصوت"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeAudio(zikr.id)}
                            className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                            aria-label="إزالة الصوت"
                            title="إزالة الصوت"
                          >
                            <VolumeX className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <label className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors cursor-pointer" title="رفع صوت" aria-label="رفع صوت">
                          <Volume2 className="w-4 h-4" />
                          <input
                            type="file"
                            accept="audio/*"
                            className="hidden"
                            aria-label="رفع ملف صوتي"
                            title="رفع ملف صوتي"
                            onChange={e => handleAudioUpload(e, zikr.id)}
                            disabled={isUploadingAudio}
                          />
                        </label>
                      )}
                      <button
                        onClick={() => openEditZikr(zikr)}
                        className="p-2 text-amber-400 hover:bg-amber-500/20 rounded-lg transition-colors"
                        aria-label="تعديل"
                        title="تعديل"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'list' && (<>
      {/* Custom Categories Manager */}
      <div className="bg-admin-surface/50 rounded-xl p-4 border border-admin-border/50">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-white font-medium flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-accent-light" />
              الفئات المخصصة
              <span className="text-slate-400 text-sm">({customCategories.length})</span>
            </h3>
            <p className="text-slate-500 text-xs mt-1">
              فئات إضافية تظهر في صفحة "أذكار أخرى" داخل التطبيق. الفئات الافتراضية الـ {CATEGORIES.length} ثابتة ولا يمكن تعديلها.
            </p>
          </div>
          <button
            onClick={openNewCategory}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl hover:bg-accent-dark transition-colors"
          >
            <Plus className="w-4 h-4" />
            فئة جديدة
          </button>
        </div>
        {customCategories.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-6">لا توجد فئات مخصصة. اضغط "فئة جديدة" لإضافة واحدة.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {customCategories
              .slice()
              .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
              .map(cat => {
                const inUse = azkarList.filter(z => z.category === cat.id).length;
                return (
                  <div key={cat.id} className={`${cat.color || 'bg-slate-500'} rounded-xl p-3 text-white flex items-center gap-3`}>
                    <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center text-2xl overflow-hidden">
                      {cat.icon?.startsWith('img:') ? (
                        <img src={cat.icon.slice(4)} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <span>{cat.icon || '📿'}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{cat.name?.ar || cat.id}</p>
                      <p className="text-xs opacity-80">ترتيب {cat.order} • {inUse} ذكر</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => openEditCategory(cat)}
                        className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg"
                        aria-label="تعديل"
                        title="تعديل"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteCategory(cat)}
                        className="p-1.5 bg-white/20 hover:bg-red-500/60 rounded-lg"
                        aria-label="حذف"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Category Filter */}
      <div className="bg-admin-surface/50 rounded-xl p-4 border border-admin-border/50">
        <h3 className="text-white font-medium mb-3">توزيع الأذكار على الفئات</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`p-3 rounded-lg transition-all ${
              selectedCategory === 'all'
                ? 'bg-accent text-white'
                : 'bg-admin-surface-light text-slate-300 hover:bg-admin-surface-light'
            }`}
          >
            <div className="flex items-center justify-between">
              <span>📿 الكل</span>
              <span className="font-bold">{stats.total}</span>
            </div>
          </button>
          {allCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? 'all' : cat.id)}
              className={`p-3 rounded-lg transition-all ${
                selectedCategory === cat.id
                  ? `${cat.color} text-white`
                  : 'bg-admin-surface-light text-slate-300 hover:bg-admin-surface-light'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{cat.icon?.startsWith('img:') ? '🖼️' : cat.icon} {cat.name}</span>
                <span className="font-bold">{azkarList.filter(z => z.category === cat.id).length}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          aria-label="بحث في الأذكار"
          placeholder="بحث بالنص العربي أو الإنجليزي..."
          className="w-full bg-admin-surface/50 text-white px-4 py-3 pr-10 rounded-xl border border-admin-border/50 focus:ring-2 focus:ring-accent focus:border-transparent"
        />
      </div>

      {/* Results Count */}
      <div className="text-slate-400">
        عرض {filteredList.length} من {azkarList.length} ذكر
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-admin-surface/50 rounded-xl border border-admin-border/50">
          <RefreshCw className="w-12 h-12 text-accent animate-spin mb-4" />
          <p className="text-slate-400">جاري تحميل الأذكار...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-admin-surface/50 rounded-xl p-12 text-center border border-admin-border/50">
          <FileJson className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg mb-4">
            {azkarList.length === 0 ? 'لا توجد أذكار' : 'لا توجد نتائج'}
          </p>
          <button
            onClick={loadAzkarFromGitHub}
            className="px-6 py-3 bg-accent hover:bg-accent-dark text-white rounded-xl transition-colors"
          >
            إعادة التحميل
          </button>
        </div>
      ) : (
        <div className="bg-admin-surface/50 rounded-xl border border-admin-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-admin-surface-light/50">
                  <th className="text-right text-white p-3 font-medium w-16">#</th>
                  <th className="text-right text-white p-3 font-medium w-24">ترتيب</th>
                  <th className="text-right text-white p-3 font-medium w-32">الفئة</th>
                  <th className="text-right text-white p-3 font-medium">النص العربي</th>
                  <th className="text-right text-white p-3 font-medium w-20">التكرار</th>
                  <th className="text-right text-white p-3 font-medium w-24">صوت</th>
                  <th className="text-right text-white p-3 font-medium w-24">تفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map(zikr => {
                  const category = CATEGORIES.find(c => c.id === zikr.category);
                  const moveState = getMoveState(zikr);
                  return (
                    <tr key={zikr.id} className="border-t border-admin-border/50 hover:bg-admin-surface-light/30 transition-colors">
                      <td className="p-3 text-slate-300 font-mono">{zikr.id}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <span className="px-2 py-1 bg-admin-surface-light text-white rounded text-sm min-w-10 text-center">
                            {Number.isFinite(Number(zikr.sortOrder)) ? zikr.sortOrder : '—'}
                          </span>
                          <button
                            onClick={() => moveZikr(zikr.id, 'up')}
                            disabled={!moveState.canMoveUp}
                            className="p-1.5 text-slate-300 hover:bg-admin-surface-light rounded-lg transition-colors disabled:opacity-30"
                            aria-label="تحريك لأعلى"
                            title="تحريك لأعلى"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => moveZikr(zikr.id, 'down')}
                            disabled={!moveState.canMoveDown}
                            className="p-1.5 text-slate-300 hover:bg-admin-surface-light rounded-lg transition-colors disabled:opacity-30"
                            aria-label="تحريك لأسفل"
                            title="تحريك لأسفل"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 ${category?.color || 'bg-admin-surface-light'} text-white rounded text-xs`}>
                          {category?.icon} {category?.name || zikr.category}
                        </span>
                      </td>
                      <td className="p-3">
                        <p className="text-white text-base leading-relaxed max-w-xl line-clamp-2">
                          {zikr.arabic}
                        </p>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-1 bg-admin-surface-light text-white rounded text-sm">
                          {zikr.count}x
                        </span>
                      </td>
                      <td className="p-3">
                        {zikr.audio ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => playingAudio === zikr.audio ? stopAudio() : playAudio(zikr.audio)}
                              className={`p-2 rounded-lg transition-colors ${
                                playingAudio === zikr.audio
                                  ? 'bg-red-500 text-white'
                                  : 'bg-accent/20 text-accent-light hover:bg-accent/30'
                              }`}
                              aria-label={playingAudio === zikr.audio ? 'إيقاف' : 'تشغيل'}
                              title={playingAudio === zikr.audio ? 'إيقاف' : 'تشغيل'}
                            >
                              {playingAudio === zikr.audio ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => downloadAudio(zikr)}
                              className="p-2 text-cyan-400 hover:bg-cyan-500/20 rounded-lg transition-colors"
                              aria-label="تحميل الصوت"
                              title="تحميل الصوت"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setSelectedZikr(zikr);
                              setShowDetailModal(true);
                            }}
                            className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                            aria-label="عرض"
                            title="عرض"
                          >
                            <Search className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditZikr(zikr)}
                            className="p-2 text-amber-400 hover:bg-amber-500/20 rounded-lg transition-colors"
                            aria-label="تعديل"
                            title="تعديل"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditZikr({ ...zikr, id: Math.max(0, ...azkarList.map(z => z.id)) + 1, sortOrder: getNextSortOrder(zikr.category), arabic: zikr.arabic + ' (نسخة)' })}
                            className="p-2 text-accent-light hover:bg-accent/20 rounded-lg transition-colors"
                            aria-label="تكرار"
                            title="تكرار"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteZikr(zikr.id)}
                            className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                            aria-label="حذف"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </>)}

      {/* Detail Modal */}
      {showDetailModal && selectedZikr && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-admin-surface rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden border border-admin-border">
            <div className="p-4 border-b border-admin-border flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">تفاصيل الذكر #{selectedZikr.id}</h2>
              <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-white" aria-label="إغلاق" title="إغلاق">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] space-y-6">
              {/* Arabic Text */}
              <div>
                <h3 className="text-accent-light font-medium mb-2">النص العربي</h3>
                <p className="text-white text-xl leading-loose bg-admin-bg p-4 rounded-xl">
                  {resolveText(selectedZikr.arabic)}
                </p>
              </div>

              {/* Transliteration */}
              {resolveText(selectedZikr.transliteration) && (
                <div>
                  <h3 className="text-accent-light font-medium mb-2">النطق</h3>
                  <p className="text-slate-300 bg-admin-bg p-4 rounded-xl italic" dir="ltr">
                    {resolveText(selectedZikr.transliteration)}
                  </p>
                </div>
              )}

              {/* Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-admin-bg p-3 rounded-xl">
                  <p className="text-slate-400 text-sm">الفئة</p>
                  <p className="text-white">{allCategories.find(c => c.id === selectedZikr.category)?.name || selectedZikr.category}</p>
                </div>
                <div className="bg-admin-bg p-3 rounded-xl">
                  <p className="text-slate-400 text-sm">التكرار</p>
                  <p className="text-white">{selectedZikr.count} مرة</p>
                </div>
                <div className="bg-admin-bg p-3 rounded-xl">
                  <p className="text-slate-400 text-sm">المصدر</p>
                  <p className="text-white text-sm">{resolveText(selectedZikr.reference) || '—'}</p>
                </div>
                <div className="bg-admin-bg p-3 rounded-xl">
                  <p className="text-slate-400 text-sm">صوت</p>
                  <p className="text-white">{selectedZikr.audio ? '✅ متوفر' : '❌ غير متوفر'}</p>
                </div>
              </div>

              {/* Benefit */}
              {resolveText(selectedZikr.benefit) && (
                <div>
                  <h3 className="text-accent-light font-medium mb-2">الفائدة</h3>
                  <p className="text-amber-300 bg-admin-bg p-4 rounded-xl">
                    {resolveText(selectedZikr.benefit)}
                  </p>
                </div>
              )}

              {/* Audio */}
              {selectedZikr.audio && (
                <div>
                  <h3 className="text-accent-light font-medium mb-2">الصوت</h3>
                  <div className="flex items-center gap-3 bg-admin-bg p-4 rounded-xl flex-wrap">
                    <button
                      onClick={() => playingAudio === selectedZikr.audio ? stopAudio() : playAudio(selectedZikr.audio)}
                      className={`px-6 py-3 rounded-xl font-medium transition-colors ${
                        playingAudio === selectedZikr.audio
                          ? 'bg-red-500 text-white'
                          : 'bg-accent text-white hover:bg-accent-dark'
                      }`}
                    >
                      {playingAudio === selectedZikr.audio ? '⏹️ إيقاف' : '▶️ تشغيل'}
                    </button>
                    <button
                      onClick={() => downloadAudio(selectedZikr)}
                      className="px-6 py-3 rounded-xl font-medium bg-cyan-600 text-white hover:bg-cyan-700 transition-colors flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      تحميل
                    </button>
                  </div>
                </div>
              )}

              {/* Translations */}
              <div>
                <h3 className="text-accent-light font-medium mb-3">
                  الترجمات ({Object.keys(selectedZikr.translations || {}).length} لغة)
                </h3>
                <div className="space-y-3">
                  {LANGUAGES.map(lang => {
                    const translation = selectedZikr.translations?.[lang.code];
                    const text = resolveText(translation);
                    if (!text) return null;
                    return (
                      <div key={lang.code} className="bg-admin-bg p-4 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">{lang.flag}</span>
                          <span className="text-slate-400 font-medium">{lang.name}</span>
                        </div>
                        <p className="text-slate-300" dir={lang.code === 'ar' || lang.code === 'ur' ? 'rtl' : 'ltr'}>
                          {text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingZikr && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-admin-bg rounded-2xl border border-admin-border w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-bold text-lg">
                {azkarList.find(z => z.id === editingZikr.id) ? 'تعديل ذكر' : 'إضافة ذكر جديد'}
              </h2>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white" aria-label="إغلاق" title="إغلاق"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-slate-300 text-sm block mb-1">النص العربي *</label>
                <textarea className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" rows={3} dir="rtl" value={editingZikr.arabic} onChange={e => setEditingZikr({ ...editingZikr, arabic: e.target.value })} aria-label="النص العربي" placeholder="نص الذكر بالعربية" />
              </div>
              <div>
                <label className="text-slate-300 text-sm block mb-1">النطق</label>
                <input className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" value={editingZikr.transliteration} onChange={e => setEditingZikr({ ...editingZikr, transliteration: e.target.value })} aria-label="النطق" placeholder="Transliteration" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-slate-300 text-sm block mb-1">الفئة</label>
                  <select className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" aria-label="الفئة" title="الفئة" value={editingZikr.category} onChange={e => setEditingZikr({ ...editingZikr, category: e.target.value, subcategory: undefined, sortOrder: getNextSortOrder(e.target.value) })}>
                    {allCategories.map(c => <option key={c.id} value={c.id}>{c.isCustom ? `★ ${c.name}` : c.name}</option>)}
                  </select>
                </div>
                {SUBCATEGORIES[editingZikr.category] && (
                  <div>
                    <label className="text-slate-300 text-sm block mb-1">الفئة الفرعية</label>
                    <select className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" aria-label="الفئة الفرعية" title="الفئة الفرعية" value={editingZikr.subcategory || 'general'} onChange={e => setEditingZikr({ ...editingZikr, subcategory: e.target.value })}>
                      {SUBCATEGORIES[editingZikr.category].map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-slate-300 text-sm block mb-1">العدد</label>
                  <input type="number" min={1} className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" aria-label="العدد" placeholder="العدد" value={editingZikr.count} onChange={e => setEditingZikr({ ...editingZikr, count: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="text-slate-300 text-sm block mb-1">الترتيب</label>
                  <input type="number" min={1} className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" aria-label="الترتيب" placeholder="الترتيب" value={editingZikr.sortOrder ?? ''} onChange={e => setEditingZikr({ ...editingZikr, sortOrder: e.target.value === '' ? undefined : Number(e.target.value) })} />
                </div>
                <div>
                  <label className="text-slate-300 text-sm block mb-1">المرجع</label>
                  <input className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" dir="rtl" value={editingZikr.reference} onChange={e => setEditingZikr({ ...editingZikr, reference: e.target.value })} aria-label="المرجع" placeholder="صحيح البخاري" />
                </div>
              </div>
              <div>
                <label className="text-slate-300 text-sm block mb-1">الفائدة</label>
                <textarea className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" rows={2} dir="rtl" value={typeof editingZikr.benefit === 'string' ? editingZikr.benefit : resolveText(editingZikr.benefit?.ar)} onChange={e => setEditingZikr({ ...editingZikr, benefit: e.target.value })} aria-label="الفائدة" placeholder="فائدة الذكر" />
              </div>

              {/* Translate benefit to all languages */}
              <TranslateButton
                sourceText={typeof editingZikr.benefit === 'string' ? editingZikr.benefit : resolveText(editingZikr.benefit?.ar)}
                sourceLang="ar"
                contentType="adhkar"
                compact
                label="🌐 ترجمة الفائدة"
                onTranslated={(translations) => setEditingZikr({ ...editingZikr, benefit: translations })}
              />
              {/* Audio Section */}
              <div>
                <label className="text-slate-300 text-sm block mb-2">الصوت</label>
                <div className="bg-admin-surface rounded-lg border border-admin-border p-3 space-y-3">
                  {editingZikr.audio ? (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => playingAudio === editingZikr.audio ? stopAudio() : playAudio(editingZikr.audio)}
                        className={`p-2 rounded-lg transition-colors ${
                          playingAudio === editingZikr.audio ? 'bg-red-500 text-white' : 'bg-accent/20 text-accent-light'
                        }`}
                        aria-label={playingAudio === editingZikr.audio ? 'إيقاف' : 'تشغيل'}
                        title={playingAudio === editingZikr.audio ? 'إيقاف' : 'تشغيل'}
                      >
                        {playingAudio === editingZikr.audio ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                      <input
                        className="flex-1 bg-admin-bg text-white rounded-lg px-3 py-1.5 border border-admin-border font-mono text-xs"
                        value={editingZikr.audio}
                        onChange={e => setEditingZikr({ ...editingZikr, audio: e.target.value })}
                        aria-label="رابط الصوت"
                        placeholder="رابط الصوت"
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={() => setEditingZikr({ ...editingZikr, audio: '' })}
                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"
                        aria-label="إزالة الصوت"
                        title="إزالة الصوت"
                      >
                        <VolumeX className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm">لا يوجد صوت</p>
                  )}
                  <div className="flex gap-2">
                    <label className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 text-blue-400 rounded-lg cursor-pointer hover:bg-blue-600/30 transition-colors text-sm">
                      <Upload className="w-3.5 h-3.5" />
                      رفع ملف صوتي
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        title="رفع ملف صوتي"
                        onChange={e => handleAudioUpload(e, editingZikr.id)}
                        disabled={isUploadingAudio}
                      />
                    </label>
                    {isUploadingAudio && <span className="text-amber-400 text-sm animate-pulse">جاري الرفع...</span>}
                  </div>
                </div>
              </div>

              {/* Translation fields */}
              <div>
                <label className="text-slate-300 text-sm block mb-2">الترجمات</label>

                {/* Auto-translate */}
                <AutoTranslateField
                  label="ترجمة تلقائية"
                  fieldName="translations"
                  contentType="adhkar"
                  arabicText={editingZikr.arabic}
                  initialValues={Object.fromEntries(
                    Object.entries(editingZikr.translations || {}).map(([k, v]) => [k, resolveText(v)])
                  )}
                  onSave={(translations) => setEditingZikr({ ...editingZikr, translations: { ...editingZikr.translations, ...translations } })}
                />

                <div className="grid grid-cols-2 gap-3 mt-4">
                  {LANGUAGES.filter(l => l.code !== 'ar').map(lang => (
                    <div key={lang.code}>
                      <label className="text-slate-400 text-xs block mb-1">{lang.flag} {lang.name}</label>
                      <textarea className="w-full bg-admin-surface text-white rounded-lg px-3 py-1.5 border border-admin-border text-sm" rows={2} dir={lang.code === 'ur' ? 'rtl' : 'ltr'} value={resolveText(editingZikr.translations?.[lang.code])} onChange={e => setEditingZikr({ ...editingZikr, translations: { ...editingZikr.translations, [lang.code]: e.target.value } })} aria-label={`ترجمة ${lang.name}`} placeholder={lang.name} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => saveZikr(editingZikr)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-dark text-white rounded-xl hover:bg-accent-dark">
                <Save className="w-4 h-4" /> حفظ
              </button>
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2.5 bg-admin-surface-light text-slate-300 rounded-xl hover:bg-admin-surface-light">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Category Edit Modal */}
      {showCategoryModal && editingCategory && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-admin-bg rounded-2xl border border-admin-border w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-accent-light" />
                {customCategories.some(c => c.id === editingCategory.id) ? 'تعديل فئة مخصصة' : 'فئة مخصصة جديدة'}
              </h2>
              <button onClick={() => { setShowCategoryModal(false); setEditingCategory(null); }} className="text-slate-400 hover:text-white" aria-label="إغلاق" title="إغلاق">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preview */}
            <div className={`${editingCategory.color || 'bg-slate-500'} rounded-xl p-4 text-white flex items-center gap-3`}>
              <div className="w-14 h-14 rounded-lg bg-white/20 flex items-center justify-center text-3xl overflow-hidden">
                {editingCategory.icon?.startsWith('img:') ? (
                  <img src={editingCategory.icon.slice(4)} alt="" className="w-full h-full object-contain" />
                ) : (
                  <span>{editingCategory.icon || '📿'}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-lg truncate">{editingCategory.name?.ar || 'اسم الفئة'}</p>
                <p className="text-xs opacity-80">معاينة الشكل في التطبيق</p>
              </div>
            </div>

            {/* Arabic name (required) */}
            <div>
              <label className="text-slate-300 text-sm block mb-1">الاسم بالعربية *</label>
              <input
                className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border"
                dir="rtl"
                value={editingCategory.name?.ar || ''}
                onChange={e => setEditingCategory({ ...editingCategory, name: { ...editingCategory.name, ar: e.target.value } })}
                aria-label="الاسم بالعربية"
                placeholder="مثال: أذكار الجمعة"
              />
            </div>

            {/* Auto-translate */}
            <AutoTranslateField
              label="ترجمة تلقائية"
              fieldName="category-name"
              contentType="adhkar"
              arabicText={editingCategory.name?.ar || ''}
              initialValues={editingCategory.name as Record<string, string>}
              onSave={(translations) => setEditingCategory({ ...editingCategory, name: { ...editingCategory.name, ...translations } })}
            />

            {/* Manual per-language names */}
            <div className="grid grid-cols-2 gap-3">
              {LANGUAGES.filter(l => l.code !== 'ar').map(lang => (
                <div key={lang.code}>
                  <label className="text-slate-400 text-xs block mb-1">{lang.flag} {lang.name}</label>
                  <input
                    className="w-full bg-admin-surface text-white rounded-lg px-3 py-1.5 border border-admin-border text-sm"
                    dir={lang.code === 'ur' ? 'rtl' : 'ltr'}
                    value={editingCategory.name?.[lang.code] || ''}
                    onChange={e => setEditingCategory({ ...editingCategory, name: { ...editingCategory.name, [lang.code]: e.target.value } })}
                    aria-label={`اسم ${lang.name}`}
                    placeholder={lang.name}
                  />
                </div>
              ))}
            </div>

            {/* Icon section */}
            <div className="bg-admin-surface/50 rounded-xl p-4 space-y-3 border border-admin-border/50">
              <h3 className="text-white font-medium flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-accent-light" />
                الأيقونة
              </h3>

              {/* Upload image */}
              <div className="flex items-center gap-2 flex-wrap">
                <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${isUploadingCategoryIcon ? 'bg-slate-600 text-slate-300' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                  <Upload className="w-4 h-4" />
                  {isUploadingCategoryIcon ? 'جاري الرفع...' : 'رفع صورة'}
                  <input
                    ref={categoryIconInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    className="hidden"
                    onChange={handleCategoryIconUpload}
                    disabled={isUploadingCategoryIcon}
                    aria-label="رفع صورة الأيقونة"
                  />
                </label>
                {editingCategory.icon?.startsWith('img:') && (
                  <button
                    onClick={async () => {
                      if (editingCategory.iconStoragePath) {
                        try { await deleteObject(ref(storage, editingCategory.iconStoragePath)); } catch { /* ignore */ }
                      }
                      setEditingCategory({ ...editingCategory, icon: '🌟', iconStoragePath: null });
                    }}
                    className="px-3 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30"
                  >
                    إزالة الصورة
                  </button>
                )}
                <span className="text-slate-500 text-xs">PNG/JPG/SVG/WebP — حد أقصى {MAX_CATEGORY_ICON_SIZE_MB}MB</span>
              </div>

              {/* OR emoji / MCI name */}
              <div>
                <label className="text-slate-300 text-sm block mb-1">أو إيموجي / اسم أيقونة MCI</label>
                <input
                  className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border"
                  value={editingCategory.icon?.startsWith('img:') ? '' : (editingCategory.icon || '')}
                  onChange={e => setEditingCategory({ ...editingCategory, icon: e.target.value, iconStoragePath: editingCategory.icon?.startsWith('img:') ? null : editingCategory.iconStoragePath })}
                  placeholder="🌙 أو home-variant"
                  aria-label="أيقونة"
                  disabled={editingCategory.icon?.startsWith('img:')}
                />
                <p className="text-slate-500 text-xs mt-1">
                  أمثلة: <code className="bg-admin-surface px-1 rounded">🕌</code>{' '}
                  <code className="bg-admin-surface px-1 rounded">⭐</code>{' '}
                  <code className="bg-admin-surface px-1 rounded">mci:home-variant</code>
                </p>
              </div>
            </div>

            {/* Color & order */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-slate-300 text-sm block mb-2">اللون</label>
                <div className="grid grid-cols-6 gap-2">
                  {COLOR_PALETTE.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditingCategory({ ...editingCategory, color: c })}
                      className={`${c} h-9 rounded-lg border-2 transition-transform ${editingCategory.color === c ? 'border-white scale-110' : 'border-transparent'}`}
                      aria-label={`اختر اللون ${c}`}
                      title={c}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-slate-300 text-sm block mb-2">الترتيب (رقم)</label>
                <input
                  type="number"
                  className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border"
                  value={editingCategory.order}
                  onChange={e => setEditingCategory({ ...editingCategory, order: Number(e.target.value) || 0 })}
                  aria-label="الترتيب"
                  min={0}
                />
                <p className="text-slate-500 text-xs mt-1">الأرقام الأصغر تظهر أولاً في "أذكار أخرى"</p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={saveCategory}
                disabled={isUploadingCategoryIcon}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-dark text-white rounded-xl hover:bg-accent disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> حفظ
              </button>
              <button
                onClick={() => { setShowCategoryModal(false); setEditingCategory(null); }}
                className="px-4 py-2.5 bg-admin-surface-light text-slate-300 rounded-xl hover:bg-admin-surface-light"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AzkarManager;
