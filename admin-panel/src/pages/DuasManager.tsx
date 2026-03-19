// admin-panel/src/pages/DuasManager.tsx
// إدارة الأدعية المختارة — لوحة التحكم

import React, { useState, useEffect, useRef } from 'react';
import {
  collection, getDocs, addDoc, deleteDoc, doc, updateDoc, 
  query, orderBy, writeBatch
} from 'firebase/firestore';
import { db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import AutoTranslateField from '../components/AutoTranslateField';
import TranslateButton from '../components/TranslateButton';

interface SelectedDua {
  id: string;
  arabic: string;
  translations: Record<string, string>;
  reference: string;
  benefit: Record<string, string>;
  source: string;
  enabled: boolean;
  order: number;
  audio?: string;
}

const LANGUAGES = ['ar', 'en', 'fr', 'de', 'es', 'tr', 'ur', 'id', 'ms', 'hi', 'bn', 'ru'];

export default function DuasManager() {
  const [duas, setDuas] = useState<SelectedDua[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDua, setEditingDua] = useState<SelectedDua | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [formArabic, setFormArabic] = useState('');
  const [formReference, setFormReference] = useState('');
  const [formSource, setFormSource] = useState('');
  const [formTranslations, setFormTranslations] = useState<Record<string, string>>({});
  const [formBenefit, setFormBenefit] = useState<Record<string, string>>({});
  const [formEnabled, setFormEnabled] = useState(true);
  const [formAudio, setFormAudio] = useState('');
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const audioFileRef = useRef<HTMLInputElement>(null);

  const loadDuas = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'selectedDuas'), orderBy('order', 'asc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SelectedDua));
      setDuas(data);
    } catch (error) {
      console.error('Error loading duas:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadDuas();
  }, []);

  const resetForm = () => {
    setFormArabic('');
    setFormReference('');
    setFormSource('');
    setFormTranslations({});
    setFormBenefit({});
    setFormEnabled(true);
    setFormAudio('');
    setEditingDua(null);
  };

  const handleEdit = (dua: SelectedDua) => {
    setEditingDua(dua);
    setFormArabic(dua.arabic);
    setFormReference(dua.reference);
    setFormSource(dua.source);
    setFormTranslations(dua.translations || {});
    setFormBenefit(dua.benefit || {});
    setFormEnabled(dua.enabled);
    setFormAudio(dua.audio || '');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formArabic.trim()) return;

    const duaData = {
      arabic: formArabic.trim(),
      reference: formReference.trim(),
      source: formSource.trim(),
      translations: formTranslations,
      benefit: formBenefit,
      enabled: formEnabled,
      order: editingDua ? editingDua.order : duas.length,
      ...(formAudio ? { audio: formAudio } : {}),
    };

    try {
      if (editingDua) {
        await updateDoc(doc(db, 'selectedDuas', editingDua.id), duaData);
      } else {
        await addDoc(collection(db, 'selectedDuas'), duaData);
      }
      resetForm();
      setShowForm(false);
      await loadDuas();
    } catch (error) {
      console.error('Error saving dua:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل تريد حذف هذا الدعاء؟')) return;
    try {
      await deleteDoc(doc(db, 'selectedDuas', id));
      await loadDuas();
    } catch (error) {
      console.error('Error deleting dua:', error);
    }
  };

  const handleToggleEnabled = async (dua: SelectedDua) => {
    try {
      await updateDoc(doc(db, 'selectedDuas', dua.id), { enabled: !dua.enabled });
      await loadDuas();
    } catch (error) {
      console.error('Error toggling dua:', error);
    }
  };

  const handleExportJSON = () => {
    const data = JSON.stringify(duas, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'selected-duas.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const imported: Omit<SelectedDua, 'id'>[] = JSON.parse(text);
      if (!Array.isArray(imported)) return;

      const batch = writeBatch(db);
      imported.forEach((dua, index) => {
        const ref = doc(collection(db, 'selectedDuas'));
        batch.set(ref, { ...dua, order: duas.length + index, enabled: true });
      });
      await batch.commit();
      await loadDuas();
    } catch (error) {
      console.error('Error importing duas:', error);
    }
  };

  const filteredDuas = duas.filter(d =>
    d.arabic.includes(searchQuery) || d.reference.includes(searchQuery)
  );

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) { alert('حجم الملف أكبر من 15 MB'); return; }
    if (!file.type.startsWith('audio/')) { alert('يجب اختيار ملف صوتي'); return; }

    setUploadingAudio(true);
    try {
      const fileName = `dua_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const storageRef = ref(storage, `duas-audio/${fileName}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setFormAudio(url);
    } catch (err) {
      alert(`خطأ في رفع الصوت: ${(err as Error).message}`);
    }
    setUploadingAudio(false);
    if (e.target) e.target.value = '';
  };

  const handleRemoveAudio = async () => {
    if (formAudio?.includes('firebasestorage')) {
      try { await deleteObject(ref(storage, formAudio)); } catch { /* ignore */ }
    }
    setFormAudio('');
  };

  return (
    <div className="p-6 max-w-6xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">إدارة الأدعية المختارة</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {duas.length} دعاء • {duas.filter(d => d.enabled).length} مفعّل
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            + إضافة دعاء
          </button>
          <button
            onClick={handleExportJSON}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            تصدير JSON
          </button>
          <label className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors cursor-pointer">
            استيراد JSON
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="بحث في الأدعية..."
          aria-label="بحث في الأدعية"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          dir="rtl"
        />
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-6 border dark:border-gray-700 shadow-sm">
          <h2 className="text-lg font-bold mb-4 dark:text-white">
            {editingDua ? 'تعديل الدعاء' : 'إضافة دعاء جديد'}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">النص العربي</label>
              <textarea
                value={formArabic}
                onChange={e => setFormArabic(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg h-24 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                dir="rtl"
                placeholder="أدخل نص الدعاء بالعربية"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">المرجع</label>
                <input
                  type="text"
                  value={formReference}
                  onChange={e => setFormReference(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  dir="rtl"
                  placeholder="المرجع"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">المصدر</label>
                <input
                  type="text"
                  value={formSource}
                  onChange={e => setFormSource(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  dir="rtl"
                  placeholder="المصدر"
                />
              </div>
            </div>

            {/* Translations */}
            <div>
              <label className="block text-sm font-medium mb-2 dark:text-gray-300">الترجمات</label>

              {/* Auto-translate */}
              <AutoTranslateField
                label="ترجمة تلقائية"
                fieldName="translations"
                contentType="adhkar"
                arabicText={formArabic}
                initialValues={formTranslations}
                onSave={(translations) => setFormTranslations(prev => ({ ...prev, ...translations }))}
              />

              <div className="mt-2">
                <TranslateButton
                  sourceText={formArabic}
                  sourceLang="ar"
                  contentType="adhkar"
                  compact
                  label="🌍 ترجمة سريعة لكل اللغات"
                  onTranslated={(translations) => setFormTranslations(prev => ({ ...prev, ...translations }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4">
                {LANGUAGES.filter(l => l !== 'ar').map(lang => (
                  <div key={lang} className="flex items-center gap-2">
                    <span className="text-xs font-mono w-6 text-gray-500">{lang}</span>
                    <input
                      type="text"
                      value={formTranslations[lang] || ''}
                      onChange={e => setFormTranslations(prev => ({ ...prev, [lang]: e.target.value }))}
                      className="flex-1 px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      aria-label={`ترجمة ${lang}`}
                      placeholder={`ترجمة ${lang}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Audio */}
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">الصوت</label>
              {formAudio ? (
                <div className="flex items-center gap-2">
                  <audio controls src={formAudio} className="h-8 flex-1" />
                  <button onClick={handleRemoveAudio} className="text-red-500 text-sm hover:text-red-400">إزالة</button>
                </div>
              ) : (
                <button
                  onClick={() => audioFileRef.current?.click()}
                  disabled={uploadingAudio}
                  className="px-3 py-1.5 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 hover:border-emerald-500 disabled:opacity-50"
                >
                  {uploadingAudio ? 'جاري الرفع...' : '🔊 رفع ملف صوتي'}
                </button>
              )}
              <input ref={audioFileRef} type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" title="اختيار ملف صوتي" />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formEnabled}
                onChange={e => setFormEnabled(e.target.checked)}
                className="rounded"
                aria-label="تفعيل/تعطيل"
                title="تفعيل/تعطيل"
              />
              <label className="text-sm dark:text-gray-300">مفعّل</label>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowForm(false); resetForm(); }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                إلغاء
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                {editingDua ? 'تحديث' : 'إضافة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duas List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto" />
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDuas.map((dua, index) => (
            <div
              key={dua.id}
              className={`bg-white dark:bg-gray-800 rounded-xl p-4 border dark:border-gray-700 shadow-sm transition-all ${
                !dua.enabled ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xs bg-gray-100 dark:bg-gray-700 rounded-full w-7 h-7 flex items-center justify-center text-gray-500 font-mono shrink-0">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-lg leading-loose text-gray-900 dark:text-white font-arabic mb-2" dir="rtl">
                    {dua.arabic}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    {dua.reference && <span>📖 {dua.reference}</span>}
                    {dua.source && <span>• {dua.source}</span>}
                    {dua.audio && <span>🔊 صوت</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleToggleEnabled(dua)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      dua.enabled
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-gray-100 text-gray-400 dark:bg-gray-700'
                    }`}
                    aria-label={dua.enabled ? 'تعطيل' : 'تفعيل'}
                    title={dua.enabled ? 'تعطيل' : 'تفعيل'}
                  >
                    {dua.enabled ? '✅' : '⏸️'}
                  </button>
                  <button
                    onClick={() => handleEdit(dua)}
                    className="p-1.5 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-200"
                    aria-label="تعديل"
                    title="تعديل"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleEdit({ ...dua, id: '', arabic: dua.arabic + ' (نسخة)', order: duas.length })}
                    className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-200"
                    aria-label="تكرار"
                    title="تكرار"
                  >
                    📋
                  </button>
                  <button
                    onClick={() => handleDelete(dua.id)}
                    className="p-1.5 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200"
                    aria-label="حذف"
                    title="حذف"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredDuas.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">🤲</p>
              <p>لا توجد أدعية {searchQuery ? 'مطابقة للبحث' : 'بعد'}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
