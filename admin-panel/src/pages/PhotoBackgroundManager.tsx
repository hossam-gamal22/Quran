// admin-panel/src/pages/PhotoBackgroundManager.tsx
// إدارة خلفيات الصور (Pexels) — روح المسلم

import React, { useState, useEffect } from 'react';
import {
  Image,
  Search,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Lock,
  Unlock,
  RefreshCw,
  ExternalLink,
  FolderOpen,
} from 'lucide-react';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';

// ========================================
// الأنواع
// ========================================

interface PhotoBackground {
  id: string;
  pexels_id: number;
  category: string;
  thumbnail_url: string;
  full_url: string;
  large2x_url: string;
  photographer: string;
  is_free: boolean;
  is_active: boolean;
  order_index: number;
  created_at: string;
}

interface CategoryConfig {
  id: string;
  name_ar: string;
  is_active: boolean;
  order_index: number;
}

interface PexelsSearchResult {
  id: number;
  url: string;
  photographer: string;
  alt: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    tiny: string;
  };
}

// ========================================
// الأقسام الافتراضية
// ========================================

const DEFAULT_CATEGORIES: CategoryConfig[] = [
  { id: 'sky', name_ar: 'سماء', is_active: true, order_index: 0 },
  { id: 'clouds', name_ar: 'سحاب', is_active: true, order_index: 1 },
  { id: 'ocean', name_ar: 'بحر', is_active: true, order_index: 2 },
  { id: 'nature', name_ar: 'طبيعة', is_active: true, order_index: 3 },
  { id: 'mountains', name_ar: 'جبال', is_active: true, order_index: 4 },
  { id: 'forest', name_ar: 'غابات', is_active: true, order_index: 5 },
  { id: 'sunset', name_ar: 'غروب', is_active: true, order_index: 6 },
  { id: 'flowers', name_ar: 'زهور', is_active: true, order_index: 7 },
];

const PEXELS_API_KEY = import.meta.env?.VITE_PEXELS_API_KEY || '';

// ========================================
// المكون الرئيسي
// ========================================

const PhotoBackgroundManager: React.FC = () => {
  const [photos, setPhotos] = useState<PhotoBackground[]>([]);
  const [categories, setCategories] = useState<CategoryConfig[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('sky');

  // Pexels search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PexelsSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Category management
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryId, setNewCategoryId] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');

  // ============ التحميل ============
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load photos
      const photosQuery = query(collection(db, 'photoBackgrounds'), orderBy('order_index'));
      const photosSnap = await getDocs(photosQuery);
      const loadedPhotos: PhotoBackground[] = photosSnap.docs.map(d => ({
        id: d.id,
        ...d.data(),
      })) as PhotoBackground[];
      setPhotos(loadedPhotos);

      // Load category config
      const catSnap = await getDocs(collection(db, 'photoBackgroundCategories'));
      if (!catSnap.empty) {
        const loadedCats: CategoryConfig[] = catSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as CategoryConfig))
          .sort((a, b) => a.order_index - b.order_index);
        setCategories(loadedCats);
      } else {
        // Initialize default categories in Firestore
        for (const cat of DEFAULT_CATEGORIES) {
          await setDoc(doc(db, 'photoBackgroundCategories', cat.id), cat);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============ بحث Pexels ============
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    if (!PEXELS_API_KEY) {
      alert('مفتاح Pexels API غير موجود. أضف VITE_PEXELS_API_KEY في ملف .env');
      return;
    }

    try {
      setSearching(true);
      const params = new URLSearchParams({
        query: searchQuery,
        per_page: '30',
        orientation: 'portrait',
      });
      const res = await fetch(`https://api.pexels.com/v1/search?${params}`, {
        headers: { Authorization: PEXELS_API_KEY },
      });
      const data = await res.json();
      setSearchResults(data.photos || []);
    } catch (error) {
      console.error('Error searching Pexels:', error);
    } finally {
      setSearching(false);
    }
  };

  // ============ إضافة صورة من البحث ============
  const addPhotoFromSearch = async (pexelsPhoto: PexelsSearchResult) => {
    // Check if already added
    if (photos.some(p => p.pexels_id === pexelsPhoto.id)) {
      alert('هذه الصورة مضافة بالفعل');
      return;
    }

    const categoryPhotos = photos.filter(p => p.category === selectedCategory);
    const newPhoto: Omit<PhotoBackground, 'id'> = {
      pexels_id: pexelsPhoto.id,
      category: selectedCategory,
      thumbnail_url: pexelsPhoto.src.medium,
      full_url: pexelsPhoto.src.large,
      large2x_url: pexelsPhoto.src.large2x,
      photographer: pexelsPhoto.photographer,
      is_free: true,
      is_active: true,
      order_index: categoryPhotos.length,
      created_at: new Date().toISOString(),
    };

    try {
      const docRef = doc(collection(db, 'photoBackgrounds'));
      await setDoc(docRef, newPhoto);
      await loadData();
    } catch (error) {
      console.error('Error adding photo:', error);
    }
  };

  // ============ إضافة بالرابط مباشرة (Pexels ID) ============
  const [pexelsIdInput, setPexelsIdInput] = useState('');
  const [addingById, setAddingById] = useState(false);

  const addPhotoById = async () => {
    const id = parseInt(pexelsIdInput.trim());
    if (!id || isNaN(id)) return;
    if (!PEXELS_API_KEY) {
      alert('مفتاح Pexels API غير موجود');
      return;
    }

    try {
      setAddingById(true);
      const res = await fetch(`https://api.pexels.com/v1/photos/${id}`, {
        headers: { Authorization: PEXELS_API_KEY },
      });
      if (!res.ok) {
        alert('لم يتم العثور على الصورة. تأكد من الرقم');
        return;
      }
      const photo = await res.json();
      await addPhotoFromSearch(photo);
      setPexelsIdInput('');
    } catch (error) {
      console.error('Error adding by ID:', error);
      alert('حدث خطأ');
    } finally {
      setAddingById(false);
    }
  };

  // ============ حذف صورة ============
  const handleDelete = async (photoId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الصورة؟')) return;
    try {
      await deleteDoc(doc(db, 'photoBackgrounds', photoId));
      await loadData();
    } catch (error) {
      console.error('Error deleting photo:', error);
    }
  };

  // ============ تبديل مجاني/مدفوع ============
  const toggleFree = async (photo: PhotoBackground) => {
    try {
      await setDoc(doc(db, 'photoBackgrounds', photo.id), {
        ...photo,
        is_free: !photo.is_free,
      });
      await loadData();
    } catch (error) {
      console.error('Error toggling free:', error);
    }
  };

  // ============ تبديل التفعيل ============
  const toggleActive = async (photo: PhotoBackground) => {
    try {
      await setDoc(doc(db, 'photoBackgrounds', photo.id), {
        ...photo,
        is_active: !photo.is_active,
      });
      await loadData();
    } catch (error) {
      console.error('Error toggling active:', error);
    }
  };

  // ============ إعادة الترتيب ============
  const movePhoto = async (index: number, direction: 'up' | 'down') => {
    const catPhotos = filteredPhotos;
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= catPhotos.length) return;

    const updated = [...catPhotos];
    [updated[index], updated[swapIndex]] = [updated[swapIndex], updated[index]];

    try {
      for (let i = 0; i < updated.length; i++) {
        await setDoc(doc(db, 'photoBackgrounds', updated[i].id), {
          ...updated[i],
          order_index: i,
        });
      }
      await loadData();
    } catch (error) {
      console.error('Error reordering:', error);
    }
  };

  // ============ إدارة الأقسام ============
  const addCategory = async () => {
    if (!newCategoryId.trim() || !newCategoryName.trim()) return;
    const id = newCategoryId.trim().toLowerCase().replace(/\s+/g, '_');
    if (categories.some(c => c.id === id)) {
      alert('هذا القسم موجود بالفعل');
      return;
    }

    const newCat: CategoryConfig = {
      id,
      name_ar: newCategoryName.trim(),
      is_active: true,
      order_index: categories.length,
    };

    try {
      await setDoc(doc(db, 'photoBackgroundCategories', id), newCat);
      setNewCategoryId('');
      setNewCategoryName('');
      await loadData();
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  const toggleCategoryActive = async (cat: CategoryConfig) => {
    try {
      await setDoc(doc(db, 'photoBackgroundCategories', cat.id), {
        ...cat,
        is_active: !cat.is_active,
      });
      await loadData();
    } catch (error) {
      console.error('Error toggling category:', error);
    }
  };

  const deleteCategory = async (catId: string) => {
    const catPhotos = photos.filter(p => p.category === catId);
    if (catPhotos.length > 0) {
      if (!confirm(`هذا القسم يحتوي على ${catPhotos.length} صورة. هل تريد حذفه مع صوره؟`)) return;
      for (const p of catPhotos) {
        await deleteDoc(doc(db, 'photoBackgrounds', p.id));
      }
    }
    try {
      await deleteDoc(doc(db, 'photoBackgroundCategories', catId));
      if (selectedCategory === catId) {
        setSelectedCategory(categories.find(c => c.id !== catId)?.id || 'sky');
      }
      await loadData();
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  // ============ تعيين الكل مجاني/مدفوع ============
  const setAllInCategory = async (isFree: boolean) => {
    const catPhotos = filteredPhotos;
    try {
      setSaving(true);
      for (const p of catPhotos) {
        await setDoc(doc(db, 'photoBackgrounds', p.id), { ...p, is_free: isFree });
      }
      await loadData();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSaving(false);
    }
  };

  // ============ المتغيرات ============
  const filteredPhotos = photos
    .filter(p => p.category === selectedCategory)
    .sort((a, b) => a.order_index - b.order_index);

  const activeCategory = categories.find(c => c.id === selectedCategory);

  // ============ العرض ============
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
            <Image className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">إدارة خلفيات الصور</h1>
            <p className="text-sm text-slate-400">
              اختر صور من Pexels وحدد المجانية والمدفوعة لكل قسم
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCategoryManager(!showCategoryManager)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <FolderOpen className="w-4 h-4" />
            <span>إدارة الأقسام</span>
          </button>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة صور</span>
          </button>
        </div>
      </div>

      {/* Category Manager */}
      {showCategoryManager && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-emerald-500" />
            إدارة الأقسام
          </h3>

          <div className="space-y-2">
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center justify-between bg-slate-700/50 rounded-lg px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${cat.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <span className="text-white font-medium">{cat.name_ar}</span>
                  <span className="text-xs text-slate-400" dir="ltr">{cat.id}</span>
                  <span className="text-xs text-slate-500">
                    ({photos.filter(p => p.category === cat.id).length} صورة)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleCategoryActive(cat)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      cat.is_active ? 'text-emerald-400 hover:bg-emerald-900/30' : 'text-red-400 hover:bg-red-900/20'
                    }`}
                    aria-label={cat.is_active ? 'إخفاء القسم' : 'إظهار القسم'}
                    title={cat.is_active ? 'إخفاء' : 'إظهار'}
                  >
                    {cat.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => deleteCategory(cat.id)}
                    className="p-1.5 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                    aria-label="حذف القسم"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add new category */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-700">
            <input
              value={newCategoryId}
              onChange={e => setNewCategoryId(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm"
              placeholder="معرف القسم (مثال: stars)"
              aria-label="معرف القسم"
              dir="ltr"
            />
            <input
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm"
              placeholder="اسم القسم (مثال: نجوم)"
              aria-label="اسم القسم"
            />
            <button
              onClick={addCategory}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm transition-colors"
            >
              إضافة
            </button>
          </div>
        </div>
      )}

      {/* Pexels Search Panel */}
      {showSearch && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Search className="w-5 h-5 text-emerald-500" />
            بحث في Pexels
          </h3>

          {/* Search by query */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="w-full px-3 py-2.5 pr-10 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm"
                placeholder="ابحث عن صور (مثال: blue sky wallpaper)"
                aria-label="بحث عن صور"
                dir="ltr"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={searching}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
            >
              {searching ? 'جاري البحث...' : 'بحث'}
            </button>
          </div>

          {/* Add by Pexels ID */}
          <div className="flex items-center gap-2">
            <input
              value={pexelsIdInput}
              onChange={e => setPexelsIdInput(e.target.value)}
              className="flex-1 px-3 py-2.5 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm"
              placeholder="أو أدخل رقم الصورة من Pexels (مثال: 1234567)"
              aria-label="رقم الصورة من Pexels"
              dir="ltr"
            />
            <button
              onClick={addPhotoById}
              disabled={addingById || !pexelsIdInput.trim()}
              className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
            >
              {addingById ? 'جاري الإضافة...' : 'إضافة بالرقم'}
            </button>
          </div>

          {/* Adding to category indicator */}
          <p className="text-xs text-slate-400">
            سيتم إضافة الصور إلى قسم: <span className="text-emerald-400 font-medium">{activeCategory?.name_ar || selectedCategory}</span>
          </p>

          {/* Search results grid */}
          {searchResults.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[500px] overflow-y-auto p-1">
              {searchResults.map(photo => {
                const alreadyAdded = photos.some(p => p.pexels_id === photo.id);
                return (
                  <div
                    key={photo.id}
                    className={`relative group rounded-xl overflow-hidden cursor-pointer transition-all ${
                      alreadyAdded ? 'ring-2 ring-emerald-500 opacity-60' : 'hover:ring-2 hover:ring-emerald-400'
                    }`}
                    onClick={() => !alreadyAdded && addPhotoFromSearch(photo)}
                  >
                    <img
                      src={photo.src.medium}
                      alt={photo.alt}
                      className="w-full aspect-[3/4] object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      {alreadyAdded ? (
                        <span className="text-xs bg-emerald-500 text-white px-2 py-1 rounded-full">مضافة ✓</span>
                      ) : (
                        <Plus className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 p-2">
                      <p className="text-[10px] text-white/80 truncate" dir="ltr">{photo.photographer}</p>
                      <p className="text-[10px] text-white/60" dir="ltr">ID: {photo.id}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {categories.filter(c => c.is_active).map(cat => {
          const count = photos.filter(p => p.category === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {cat.name_ar}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                selectedCategory === cat.id ? 'bg-emerald-600' : 'bg-slate-700'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bulk actions */}
      {filteredPhotos.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-slate-400">
            {filteredPhotos.length} صورة في {activeCategory?.name_ar}
          </span>
          <span className="text-slate-600">|</span>
          <button
            onClick={() => setAllInCategory(true)}
            disabled={saving}
            className="text-xs px-3 py-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg transition-colors"
            aria-label="جعل الكل مجاني"
            title="جعل الكل مجاني"
          >
            <Unlock className="w-3 h-3 inline ml-1" />
            جعل الكل مجاني
          </button>
          <button
            onClick={() => setAllInCategory(false)}
            disabled={saving}
            className="text-xs px-3 py-1.5 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded-lg transition-colors"
            aria-label="جعل الكل مدفوع"
            title="جعل الكل مدفوع"
          >
            <Lock className="w-3 h-3 inline ml-1" />
            جعل الكل مدفوع
          </button>
          <button
            onClick={loadData}
            className="text-xs px-3 py-1.5 bg-slate-700 text-slate-300 hover:bg-slate-600 rounded-lg transition-colors"
            aria-label="تحديث"
            title="تحديث"
          >
            <RefreshCw className="w-3 h-3 inline ml-1" />
            تحديث
          </button>
        </div>
      )}

      {/* Photos Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {filteredPhotos.map((photo, index) => (
          <div
            key={photo.id}
            className={`relative group rounded-xl overflow-hidden border-2 transition-all ${
              photo.is_active
                ? photo.is_free
                  ? 'border-emerald-500/50'
                  : 'border-amber-500/50'
                : 'border-red-500/50 opacity-50'
            }`}
          >
            <img
              src={photo.thumbnail_url}
              alt=""
              className="w-full aspect-[3/4] object-cover"
              loading="lazy"
            />

            {/* Status badges */}
            <div className="absolute top-2 right-2 flex flex-col gap-1">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                photo.is_free
                  ? 'bg-emerald-500 text-white'
                  : 'bg-amber-500 text-white'
              }`}>
                {photo.is_free ? 'مجاني' : '👑 مدفوع'}
              </span>
              {!photo.is_active && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500 text-white">مخفي</span>
              )}
            </div>

            {/* Order */}
            <div className="absolute top-2 left-2">
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/60 text-white">
                #{index + 1}
              </span>
            </div>

            {/* Actions overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="flex flex-col gap-1.5">
                {/* Toggle free/paid */}
                <button
                  onClick={() => toggleFree(photo)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    photo.is_free
                      ? 'bg-amber-500 hover:bg-amber-600 text-white'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  }`}
                  aria-label={photo.is_free ? 'تحويل لمدفوع' : 'تحويل لمجاني'}
                  title={photo.is_free ? 'تحويل لمدفوع' : 'تحويل لمجاني'}
                >
                  {photo.is_free ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  {photo.is_free ? 'مدفوع' : 'مجاني'}
                </button>

                {/* Toggle active */}
                <button
                  onClick={() => toggleActive(photo)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-xs transition-colors"
                  aria-label={photo.is_active ? 'إخفاء الصورة' : 'إظهار الصورة'}
                  title={photo.is_active ? 'إخفاء' : 'إظهار'}
                >
                  {photo.is_active ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {photo.is_active ? 'إخفاء' : 'إظهار'}
                </button>

                {/* Move up/down */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => movePhoto(index, 'up')}
                    disabled={index === 0}
                    className="flex-1 p-1.5 bg-slate-600 hover:bg-slate-500 disabled:opacity-30 text-white rounded-lg transition-colors"
                    aria-label="تحريك لأعلى"
                    title="تحريك لأعلى"
                  >
                    <ArrowUp className="w-3 h-3 mx-auto" />
                  </button>
                  <button
                    onClick={() => movePhoto(index, 'down')}
                    disabled={index === filteredPhotos.length - 1}
                    className="flex-1 p-1.5 bg-slate-600 hover:bg-slate-500 disabled:opacity-30 text-white rounded-lg transition-colors"
                    aria-label="تحريك لأسفل"
                    title="تحريك لأسفل"
                  >
                    <ArrowDown className="w-3 h-3 mx-auto" />
                  </button>
                </div>

                {/* View on Pexels */}
                <a
                  href={`https://www.pexels.com/photo/${photo.pexels_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-xs transition-colors"
                  aria-label="عرض على Pexels"
                  title="عرض على Pexels"
                >
                  <ExternalLink className="w-3 h-3" />
                  Pexels
                </a>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(photo.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs transition-colors"
                  aria-label="حذف الصورة"
                  title="حذف الصورة"
                >
                  <Trash2 className="w-3 h-3" />
                  حذف
                </button>
              </div>
            </div>

            {/* Photographer */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 p-2">
              <p className="text-[10px] text-white/70 truncate" dir="ltr">📷 {photo.photographer}</p>
            </div>
          </div>
        ))}

        {filteredPhotos.length === 0 && (
          <div className="col-span-full text-center py-16 bg-slate-800 rounded-xl border border-dashed border-slate-600">
            <Image className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">لا توجد صور في هذا القسم</p>
            <p className="text-sm text-slate-500 mt-1">اضغط &quot;إضافة صور&quot; للبحث في Pexels</p>
          </div>
        )}
      </div>

      {/* Stats footer */}
      <div className="flex items-center justify-between bg-slate-800 rounded-xl border border-slate-700 px-5 py-4">
        <div className="flex items-center gap-6 text-sm">
          <span className="text-slate-400">
            الإجمالي: <span className="text-white font-medium">{photos.length}</span> صورة
          </span>
          <span className="text-slate-400">
            مجاني: <span className="text-emerald-400 font-medium">{photos.filter(p => p.is_free).length}</span>
          </span>
          <span className="text-slate-400">
            مدفوع: <span className="text-amber-400 font-medium">{photos.filter(p => !p.is_free).length}</span>
          </span>
          <span className="text-slate-400">
            مفعّل: <span className="text-white font-medium">{photos.filter(p => p.is_active).length}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default PhotoBackgroundManager;
