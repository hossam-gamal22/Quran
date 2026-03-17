// admin-panel/src/pages/DailyDhikrManager.tsx
// إدارة الأذكار اليومية — CRUD for dailyDhikr Firestore collection

import React, { useState, useEffect } from 'react';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  query,
  getFirestore,
  serverTimestamp,
} from 'firebase/firestore';
import { Pencil, Trash2, Plus, Power, Search } from 'lucide-react';
import AutoTranslateField from '../components/AutoTranslateField';

interface DailyDhikrItem {
  id: string;
  arabic: string;
  reference: string;
  benefit: string;
  enabled: boolean;
  translations?: Record<string, string>;
  createdAt?: unknown;
}

const COLLECTION = 'dailyDhikr';

export default function DailyDhikrManager() {
  const [items, setItems] = useState<DailyDhikrItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<DailyDhikrItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [formArabic, setFormArabic] = useState('');
  const [formReference, setFormReference] = useState('');
  const [formBenefit, setFormBenefit] = useState('');
  const [formEnabled, setFormEnabled] = useState(true);
  const [formTranslations, setFormTranslations] = useState<Record<string, string>>({});

  const db = getFirestore();

  const loadItems = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setItems(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<DailyDhikrItem, 'id'>),
        }))
      );
    } catch (err) {
      console.error('Failed to load daily dhikr:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        setItems(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<DailyDhikrItem, 'id'>),
          }))
        );
      } catch (err) {
        console.error('Failed to load daily dhikr:', err);
      }
      setLoading(false);
    };
    init();
  }, [db]);

  const resetForm = () => {
    setFormArabic('');
    setFormReference('');
    setFormBenefit('');
    setFormEnabled(true);
    setFormTranslations({});
    setEditingItem(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!formArabic.trim() || !formReference.trim()) return;

    const data = {
      arabic: formArabic.trim(),
      reference: formReference.trim(),
      benefit: formBenefit.trim(),
      enabled: formEnabled,
      translations: formTranslations,
    };

    try {
      if (editingItem) {
        await updateDoc(doc(db, COLLECTION, editingItem.id), data);
      } else {
        await addDoc(collection(db, COLLECTION), {
          ...data,
          createdAt: serverTimestamp(),
        });
      }
      resetForm();
      loadItems();
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  const handleEdit = (item: DailyDhikrItem) => {
    setFormArabic(item.arabic);
    setFormReference(item.reference);
    setFormBenefit(item.benefit || '');
    setFormEnabled(item.enabled);
    setFormTranslations(item.translations || {});
    setEditingItem(item);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من الحذف؟')) return;
    try {
      await deleteDoc(doc(db, COLLECTION, id));
      loadItems();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleToggle = async (item: DailyDhikrItem) => {
    try {
      await updateDoc(doc(db, COLLECTION, item.id), { enabled: !item.enabled });
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, enabled: !i.enabled } : i))
      );
    } catch (err) {
      console.error('Toggle failed:', err);
    }
  };

  const filtered = items.filter(
    (i) =>
      i.arabic.includes(searchQuery) ||
      i.reference.includes(searchQuery) ||
      (i.benefit && i.benefit.includes(searchQuery))
  );

  return (
    <div className="max-w-4xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            الأذكار اليومية
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            إدارة الأذكار التي تظهر في صفحة "أذكار يومية" — تُدمج مع الأذكار المحلية
          </p>
        </div>
        <button
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl transition-colors"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          <Plus className="w-4 h-4" />
          إضافة ذكر
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="بحث في الأذكار..."
          aria-label="بحث في الأذكار"
          className="w-full pr-10 pl-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-right text-gray-900 dark:text-white placeholder-gray-400"
        />
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 mb-6 border border-gray-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {editingItem ? 'تعديل الذكر' : 'إضافة ذكر جديد'}
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                النص العربي *
              </label>
              <textarea
                value={formArabic}
                onChange={(e) => setFormArabic(e.target.value)}
                rows={3}
                className="w-full p-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl text-right text-gray-900 dark:text-white resize-none"
                placeholder="أدخل نص الذكر..."
                dir="rtl"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                المرجع *
              </label>
              <input
                type="text"
                value={formReference}
                onChange={(e) => setFormReference(e.target.value)}
                className="w-full p-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl text-right text-gray-900 dark:text-white"
                placeholder="مثال: البخاري ومسلم"
                dir="rtl"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                الفضل / الفائدة
              </label>
              <textarea
                value={formBenefit}
                onChange={(e) => setFormBenefit(e.target.value)}
                rows={2}
                className="w-full p-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl text-right text-gray-900 dark:text-white resize-none"
                placeholder="فضل هذا الذكر..."
                dir="rtl"
              />
            </div>

            {/* Auto-translate */}
            <AutoTranslateField
              label="ترجمة تلقائية"
              fieldName="translations"
              contentType="adhkar"
              arabicText={formArabic}
              initialValues={formTranslations}
              onSave={(translations) => setFormTranslations(prev => ({ ...prev, ...translations }))}
            />

            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                مفعّل
              </label>
              <input
                type="checkbox"
                checked={formEnabled}
                onChange={(e) => setFormEnabled(e.target.checked)}
                className="w-5 h-5 rounded accent-emerald-600"
                aria-label="مفعّل"
                title="مفعّل"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSave}
              disabled={!formArabic.trim() || !formReference.trim()}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-xl font-medium transition-colors"
            >
              {editingItem ? 'حفظ التعديلات' : 'إضافة'}
            </button>
            <button
              onClick={resetForm}
              className="px-6 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📿</p>
          <p className="text-gray-500 dark:text-gray-400">
            {searchQuery ? 'لا توجد نتائج' : 'لم تتم إضافة أذكار بعد'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700 transition-opacity ${
                !item.enabled ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleToggle(item)}
                    className={`p-2 rounded-lg transition-colors ${
                      item.enabled
                        ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                        : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                    }`}
                    aria-label={item.enabled ? 'تعطيل' : 'تفعيل'}
                    title={item.enabled ? 'تعطيل' : 'تفعيل'}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    aria-label="تعديل"
                    title="تعديل"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    aria-label="حذف"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 text-right">
                  <p className="text-gray-900 dark:text-white leading-relaxed mb-2">
                    {item.arabic}
                  </p>
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">
                    📖 {item.reference}
                  </p>
                  {item.benefit && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      ✨ {item.benefit}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Count */}
      {!loading && (
        <p className="text-center text-sm text-gray-400 mt-4">
          {items.length} ذكر ({items.filter((i) => i.enabled).length} مفعّل)
        </p>
      )}
    </div>
  );
}
