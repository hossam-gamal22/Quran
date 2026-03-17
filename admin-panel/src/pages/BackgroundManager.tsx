// admin-panel/src/pages/BackgroundManager.tsx
// إدارة خلفيات التطبيق — روح المسلم

import React, { useState, useEffect } from 'react';
import { Styled } from '../components/Styled';
import {
  Image,
  Plus,
  Trash2,
  Edit2,
  Save,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Sliders,
  Sun,
  Moon,
} from 'lucide-react';
import { db, storage } from '../firebase';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';

// ========================================
// الأنواع
// ========================================

interface BackgroundItem {
  id: string;
  filename: string;
  name_ar: string;
  name_en: string;
  thumbnailUrl: string;
  fullUrl: string;
  order_index: number;
  is_active: boolean;
  is_default: boolean;
  is_premium: boolean;
  textColor: 'white' | 'black';
  created_at: string;
  updated_at: string;
}

interface BackgroundSettings {
  default_background_id: string | null;
}

// ========================================
// المكون الرئيسي
// ========================================

const BackgroundManager: React.FC = () => {
  const [backgrounds, setBackgrounds] = useState<BackgroundItem[]>([]);
  const [bgSettings, setBgSettings] = useState<BackgroundSettings>({
    default_background_id: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name_ar: '', name_en: '' });
  const [uploading, setUploading] = useState(false);

  // ============ التحميل ============
  useEffect(() => {
    loadBackgrounds();
  }, []);

  const loadBackgrounds = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'backgrounds'), orderBy('order_index'));
      const snapshot = await getDocs(q);
      const items: BackgroundItem[] = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
      })) as BackgroundItem[];
      setBackgrounds(items);

      // Load settings
      const settingsSnap = await getDocs(collection(db, 'appConfig'));
      settingsSnap.docs.forEach(d => {
        if (d.id === 'backgroundSettings') {
          setBgSettings(d.data() as BackgroundSettings);
        }
      });
    } catch (error) {
      console.error('Error loading backgrounds:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============ رفع خلفية جديدة ============
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const timestamp = Date.now();
      const filename = `background_${timestamp}.${file.name.split('.').pop()}`;

      const storageRef = ref(storage, `backgrounds/${filename}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);

      const newBg: Omit<BackgroundItem, 'id'> = {
        filename,
        name_ar: 'خلفية جديدة',
        name_en: 'New Background',
        thumbnailUrl: downloadUrl,
        fullUrl: downloadUrl,
        order_index: backgrounds.length,
        is_active: true,
        is_default: false,
        is_premium: false,
        textColor: 'white',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const docRef = doc(collection(db, 'backgrounds'));
      await setDoc(docRef, newBg);
      await loadBackgrounds();
    } catch (error) {
      console.error('Error uploading background:', error);
    } finally {
      setUploading(false);
    }
  };

  // ============ حذف خلفية ============
  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الخلفية؟')) return;
    try {
      await deleteDoc(doc(db, 'backgrounds', id));
      await loadBackgrounds();
    } catch (error) {
      console.error('Error deleting background:', error);
    }
  };

  // ============ تعديل الأسماء ============
  const startEdit = (bg: BackgroundItem) => {
    setEditingId(bg.id);
    setEditForm({ name_ar: bg.name_ar, name_en: bg.name_en });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const existing = backgrounds.find(b => b.id === editingId);
    if (!existing) return;
    try {
      await setDoc(doc(db, 'backgrounds', editingId), {
        ...existing,
        name_ar: editForm.name_ar,
        name_en: editForm.name_en,
        updated_at: new Date().toISOString(),
      });
      setEditingId(null);
      await loadBackgrounds();
    } catch (error) {
      console.error('Error saving edit:', error);
    }
  };

  // ============ تبديل التفعيل ============
  const toggleActive = async (bg: BackgroundItem) => {
    try {
      await setDoc(doc(db, 'backgrounds', bg.id), {
        ...bg,
        is_active: !bg.is_active,
        updated_at: new Date().toISOString(),
      });
      await loadBackgrounds();
    } catch (error) {
      console.error('Error toggling:', error);
    }
  };

  // ============ تبديل لون النص ============
  const toggleTextColor = async (bg: BackgroundItem) => {
    const newColor = bg.textColor === 'white' ? 'black' : 'white';
    try {
      await setDoc(doc(db, 'backgrounds', bg.id), {
        ...bg,
        textColor: newColor,
        updated_at: new Date().toISOString(),
      });
      await loadBackgrounds();
    } catch (error) {
      console.error('Error toggling text color:', error);
    }
  };

  // ============ إعادة الترتيب ============
  const moveItem = async (index: number, direction: 'up' | 'down') => {
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= backgrounds.length) return;

    const updated = [...backgrounds];
    [updated[index], updated[swapIndex]] = [updated[swapIndex], updated[index]];

    try {
      for (let i = 0; i < updated.length; i++) {
        await setDoc(doc(db, 'backgrounds', updated[i].id), {
          ...updated[i],
          order_index: i,
          updated_at: new Date().toISOString(),
        });
      }
      await loadBackgrounds();
    } catch (error) {
      console.error('Error reordering:', error);
    }
  };

  // ============ حفظ الإعدادات العامة ============
  const saveSettings = async () => {
    try {
      setSaving(true);
      await setDoc(doc(db, 'appConfig', 'backgroundSettings'), bgSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
            <Image className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              إدارة خلفيات التطبيق
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              إضافة وتعديل وترتيب خلفيات التطبيق
            </p>
          </div>
        </div>
        <label className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg cursor-pointer transition-colors">
          <Plus className="w-5 h-5" />
          <span>إضافة خلفية</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
        </label>
      </div>

      {uploading && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
          <span className="text-blue-700 dark:text-blue-300">جاري رفع الخلفية...</span>
        </div>
      )}

      {/* Backgrounds list */}
      <div className="space-y-3">
        {backgrounds.map((bg, index) => (
          <div
            key={bg.id}
            className={`bg-white dark:bg-gray-800 rounded-xl border ${
              bg.is_active ? 'border-gray-200 dark:border-gray-700' : 'border-red-200 dark:border-red-800 opacity-60'
            } p-4 flex items-center gap-4`}
          >
            {/* Thumbnail */}
            <div className="relative">
              <img
                src={bg.thumbnailUrl}
                alt={bg.name_ar}
                className="w-20 h-28 object-cover rounded-lg"
              />
              <div className="absolute inset-0 flex items-center justify-center rounded-lg">
                <Styled as="span" className={`text-xs font-bold ${bg.textColor === 'white' ? 'text-white' : 'text-black'}`}
                  css={{ textShadow: bg.textColor === 'white' ? '0 1px 3px rgba(0,0,0,0.5)' : '0 1px 3px rgba(255,255,255,0.5)' }}
                >
                  نص تجريبي
                </Styled>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 space-y-1">
              {editingId === bg.id ? (
                <div className="space-y-2">
                  <input
                    value={editForm.name_ar}
                    onChange={e => setEditForm(f => ({ ...f, name_ar: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    placeholder="الاسم (عربي)"
                    aria-label="الاسم بالعربي"
                  />
                  <input
                    value={editForm.name_en}
                    onChange={e => setEditForm(f => ({ ...f, name_en: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    placeholder="Name (English)"
                    dir="ltr"
                    aria-label="Name in English"
                  />
                  <div className="flex gap-2">
                    <button onClick={saveEdit} className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600">
                      حفظ
                    </button>
                    <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm">
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Image className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">{bg.filename}</span>
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-white">{bg.name_ar}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400" dir="ltr">{bg.name_en}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>الترتيب: {bg.order_index + 1}</span>
                    {bg.is_default && (
                      <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full">
                        افتراضي
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">لون النص:</span>
                    <button
                      onClick={() => toggleTextColor(bg)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
                        bg.textColor === 'white'
                          ? 'bg-gray-800 text-white'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-200'
                      }`}
                      title={bg.textColor === 'white' ? 'نص أبيض' : 'نص أسود'}
                      aria-label={bg.textColor === 'white' ? 'تبديل إلى نص أسود' : 'تبديل إلى نص أبيض'}
                    >
                      {bg.textColor === 'white' ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
                      <span>{bg.textColor === 'white' ? 'أبيض' : 'أسود'}</span>
                    </button>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">بريميوم:</span>
                    <button
                      onClick={async () => {
                        try {
                          await setDoc(doc(db, 'backgrounds', bg.id), {
                            ...bg,
                            is_premium: !bg.is_premium,
                            updated_at: new Date().toISOString(),
                          });
                          await loadBackgrounds();
                        } catch (error) {
                          console.error('Error toggling premium:', error);
                        }
                      }}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
                        bg.is_premium
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                      }`}
                      title={bg.is_premium ? 'مدفوعة' : 'مجانية'}
                    >
                      <span>{bg.is_premium ? '👑 مدفوعة' : 'مجانية'}</span>
                    </button>
                  </div>
                  </div>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-1">
              <button
                onClick={() => toggleActive(bg)}
                className={`p-2 rounded-lg transition-colors ${
                  bg.is_active
                    ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                    : 'text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                }`}
                title={bg.is_active ? 'تعطيل' : 'تفعيل'}
                aria-label={bg.is_active ? 'تعطيل الخلفية' : 'تفعيل الخلفية'}
              >
                {bg.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button
                onClick={() => startEdit(bg)}
                className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                title="تعديل"
                aria-label="تعديل الأسماء"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => moveItem(index, 'up')}
                disabled={index === 0}
                className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-30"
                title="تحريك لأعلى"
                aria-label="تحريك لأعلى"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => moveItem(index, 'down')}
                disabled={index === backgrounds.length - 1}
                className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-30"
                title="تحريك لأسفل"
                aria-label="تحريك لأسفل"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(bg.id)}
                className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                title="حذف الخلفية"
                aria-label="حذف الخلفية"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {backgrounds.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
            <Image className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">لا توجد خلفيات بعد</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">اضغط &quot;إضافة خلفية&quot; لبدء الرفع</p>
          </div>
        )}
      </div>

      {/* Global settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
        <div className="flex items-center gap-2 mb-2">
          <Sliders className="w-5 h-5 text-emerald-500" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">إعدادات عامة</h2>
        </div>

        {/* Default background */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            الخلفية الافتراضية
          </label>
          <select
            value={bgSettings.default_background_id || ''}
            onChange={e => setBgSettings(s => ({ ...s, default_background_id: e.target.value || null }))}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            title="الخلفية الافتراضية"
            aria-label="الخلفية الافتراضية"
          >
            <option value="">بدون خلفية</option>
            {backgrounds.filter(b => b.is_active).map(bg => (
              <option key={bg.id} value={bg.id}>{bg.name_ar}</option>
            ))}
          </select>
        </div>

        {/* Save */}
        <button
          onClick={saveSettings}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg transition-colors"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}</span>
        </button>
      </div>
    </div>
  );
};

export default BackgroundManager;
