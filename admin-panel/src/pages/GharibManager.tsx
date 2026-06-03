// admin-panel/src/pages/GharibManager.tsx
// إدارة «غريب القرآن» — CRUD لمجموعة gharibWords في Firestore.
// التطبيق يدمج هذه الكلمات تلقائيًا مع القائمة المبنيّة (105 كلمة) دون بناء جديد.

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, getFirestore, serverTimestamp } from 'firebase/firestore';
import { Pencil, Trash2, Plus, Power, Search, Download } from 'lucide-react';

interface GharibItem {
  id: string;
  word: string;
  meaning: string;
  surah: number;
  ayah: number;
  surahName: string;
  enabled: boolean;
}

// وثيقة واحدة تحوي كل الكلمات → كل سحبة من التطبيق = قراءة واحدة فقط (تكلفة ≈ صفر)
const DOC_COLLECTION = 'appConfig';
const DOC_ID = 'gharibQuran';

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function GharibManager() {
  const [items, setItems] = useState<GharibItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<GharibItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form state
  const [formWord, setFormWord] = useState('');
  const [formMeaning, setFormMeaning] = useState('');
  const [formSurah, setFormSurah] = useState('');
  const [formAyah, setFormAyah] = useState('');
  const [formSurahName, setFormSurahName] = useState('');
  const [formEnabled, setFormEnabled] = useState(true);

  const db = getFirestore();

  const loadItems = async () => {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, DOC_COLLECTION, DOC_ID));
      const raw = (snap.exists() ? (snap.data() as { words?: unknown }).words : []) || [];
      const arr = Array.isArray(raw) ? (raw as Partial<GharibItem>[]) : [];
      setItems(
        arr.map((w) => ({
          id: w.id || genId(),
          word: String(w.word ?? ''),
          meaning: String(w.meaning ?? ''),
          surah: Number(w.surah) || 0,
          ayah: Number(w.ayah) || 0,
          surahName: String(w.surahName ?? ''),
          enabled: w.enabled !== false,
        }))
      );
    } catch (err) {
      console.error('Failed to load gharib words:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  // كتابة المصفوفة كاملةً في الوثيقة الواحدة (= عملية كتابة واحدة)
  const persist = async (words: GharibItem[]) => {
    await setDoc(
      doc(db, DOC_COLLECTION, DOC_ID),
      { words, updatedAt: serverTimestamp() },
      { merge: true }
    );
    setItems(words);
  };

  const resetForm = () => {
    setFormWord('');
    setFormMeaning('');
    setFormSurah('');
    setFormAyah('');
    setFormSurahName('');
    setFormEnabled(true);
    setEditingItem(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    const surahNum = parseInt(formSurah, 10);
    const ayahNum = parseInt(formAyah, 10);
    if (!formWord.trim() || !formMeaning.trim()) {
      alert('الكلمة والمعنى مطلوبان');
      return;
    }
    if (!surahNum || surahNum < 1 || surahNum > 114) {
      alert('رقم السورة يجب أن يكون بين 1 و 114');
      return;
    }
    if (!ayahNum || ayahNum < 1) {
      alert('رقم الآية غير صحيح');
      return;
    }

    const data: GharibItem = {
      id: editingItem ? editingItem.id : genId(),
      word: formWord.trim(),
      meaning: formMeaning.trim(),
      surah: surahNum,
      ayah: ayahNum,
      surahName: formSurahName.trim(),
      enabled: formEnabled,
    };

    try {
      const next = editingItem
        ? items.map((i) => (i.id === editingItem.id ? data : i))
        : [data, ...items];
      await persist(next);
      resetForm();
    } catch (err) {
      console.error('Save failed:', err);
      const msg = `فشل الحفظ: ${(err as Error).message}`;
      setErrorMsg(msg);
      alert(msg);
    }
  };

  const handleEdit = (item: GharibItem) => {
    setFormWord(item.word);
    setFormMeaning(item.meaning);
    setFormSurah(String(item.surah ?? ''));
    setFormAyah(String(item.ayah ?? ''));
    setFormSurahName(item.surahName || '');
    setFormEnabled(item.enabled);
    setEditingItem(item);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من الحذف؟')) return;
    try {
      await persist(items.filter((i) => i.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
      alert(`فشل الحذف: ${(err as Error).message}`);
    }
  };

  const handleToggle = async (item: GharibItem) => {
    try {
      await persist(items.map((i) => (i.id === item.id ? { ...i, enabled: !i.enabled } : i)));
    } catch (err) {
      console.error('Toggle failed:', err);
      alert(`فشل التبديل: ${(err as Error).message}`);
    }
  };

  // استيراد دفعة من JSON: [{ word, meaning, surah, ayah, surahName }]
  const handleImportJson = async () => {
    const raw = prompt(
      'ألصق مصفوفة JSON بالشكل:\n[{"word":"...","meaning":"...","surah":18,"ayah":9,"surahName":"الكهف"}]'
    );
    if (!raw) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      alert('JSON غير صالح');
      return;
    }
    if (!Array.isArray(parsed)) {
      alert('يجب أن يكون المحتوى مصفوفة');
      return;
    }
    try {
      const added: GharibItem[] = [];
      for (const it of parsed as Record<string, unknown>[]) {
        const surah = Number(it.surah);
        const ayah = Number(it.ayah);
        if (!it.word || !it.meaning || !surah || !ayah) continue;
        added.push({
          id: genId(),
          word: String(it.word).trim(),
          meaning: String(it.meaning).trim(),
          surah,
          ayah,
          surahName: String(it.surahName ?? '').trim(),
          enabled: true,
        });
      }
      await persist([...added, ...items]); // كتابة واحدة لكل الدفعة
      alert(`✅ تم استيراد ${added.length} كلمة`);
    } catch (err) {
      alert(`❌ فشل الاستيراد: ${(err as Error).message}`);
    }
  };

  const handleExportJson = () => {
    const data = items.map(({ word, meaning, surah, ayah, surahName }) => ({
      word,
      meaning,
      surah,
      ayah,
      surahName,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gharib-words.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = items.filter(
    (i) =>
      i.word.includes(searchQuery) ||
      i.meaning.includes(searchQuery) ||
      (i.surahName && i.surahName.includes(searchQuery))
  );

  return (
    <div className="max-w-4xl mx-auto" dir="rtl">
      {errorMsg && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-600/50 rounded-xl flex items-center justify-between">
          <button onClick={() => setErrorMsg('')} className="text-red-400 hover:text-red-300 text-sm">✕</button>
          <p className="text-red-300 text-sm">{errorMsg}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">غريب القرآن</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            كلمات تُضاف لقاموس «غريب القرآن» في التطبيق فورًا — تُدمج مع القائمة المبنيّة دون بناء جديد
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="flex items-center gap-2 bg-accent-dark hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl transition-colors"
            onClick={() => { resetForm(); setShowForm(true); }}
          >
            <Plus className="w-4 h-4" />
            إضافة كلمة
          </button>
          <button
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl transition-colors"
            onClick={handleImportJson}
          >
            <Download className="w-4 h-4" />
            استيراد JSON
          </button>
          {items.length > 0 && (
            <button
              className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2.5 rounded-xl transition-colors"
              onClick={handleExportJson}
            >
              تصدير JSON
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="بحث في الكلمات..."
          aria-label="بحث في الكلمات"
          className="w-full pr-10 pl-4 py-2.5 bg-white dark:bg-admin-surface border border-gray-200 dark:border-admin-border rounded-xl text-right text-gray-900 dark:text-white placeholder-gray-400"
        />
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white dark:bg-admin-surface rounded-2xl p-6 mb-6 border border-gray-200 dark:border-admin-border shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {editingItem ? 'تعديل الكلمة' : 'إضافة كلمة جديدة'}
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الكلمة *</label>
              <input
                type="text"
                value={formWord}
                onChange={(e) => setFormWord(e.target.value)}
                className="w-full p-3 bg-gray-50 dark:bg-admin-bg border border-gray-200 dark:border-admin-border rounded-xl text-right text-gray-900 dark:text-white text-2xl"
                placeholder="مثال: غِسْلِينٍ"
                dir="rtl"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المعنى *</label>
              <textarea
                value={formMeaning}
                onChange={(e) => setFormMeaning(e.target.value)}
                rows={2}
                className="w-full p-3 bg-gray-50 dark:bg-admin-bg border border-gray-200 dark:border-admin-border rounded-xl text-right text-gray-900 dark:text-white resize-none"
                placeholder="المعنى المختصر..."
                dir="rtl"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">رقم السورة *</label>
                <input
                  type="number"
                  min={1}
                  max={114}
                  value={formSurah}
                  onChange={(e) => setFormSurah(e.target.value)}
                  className="w-full p-3 bg-gray-50 dark:bg-admin-bg border border-gray-200 dark:border-admin-border rounded-xl text-right text-gray-900 dark:text-white"
                  placeholder="1-114"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">رقم الآية *</label>
                <input
                  type="number"
                  min={1}
                  value={formAyah}
                  onChange={(e) => setFormAyah(e.target.value)}
                  className="w-full p-3 bg-gray-50 dark:bg-admin-bg border border-gray-200 dark:border-admin-border rounded-xl text-right text-gray-900 dark:text-white"
                  placeholder="رقم الآية"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم السورة</label>
                <input
                  type="text"
                  value={formSurahName}
                  onChange={(e) => setFormSurahName(e.target.value)}
                  className="w-full p-3 bg-gray-50 dark:bg-admin-bg border border-gray-200 dark:border-admin-border rounded-xl text-right text-gray-900 dark:text-white"
                  placeholder="مثال: الكهف"
                  dir="rtl"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">مفعّل</label>
              <input
                type="checkbox"
                checked={formEnabled}
                onChange={(e) => setFormEnabled(e.target.checked)}
                className="w-5 h-5 rounded accent-emerald-600"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSave}
                className="bg-accent-dark hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl transition-colors"
              >
                {editingItem ? 'حفظ التعديلات' : 'إضافة'}
              </button>
              <button
                onClick={resetForm}
                className="bg-gray-200 dark:bg-admin-bg text-gray-700 dark:text-gray-300 px-5 py-2.5 rounded-xl transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-10">جاري التحميل...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-10">
          لا توجد كلمات مضافة بعد. (القائمة المبنيّة في التطبيق تعمل تلقائيًا)
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`bg-white dark:bg-admin-surface rounded-2xl p-4 border border-gray-200 dark:border-admin-border shadow-sm ${
                item.enabled ? '' : 'opacity-50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 text-right">
                  <div className="flex items-center gap-2 justify-end flex-wrap">
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-lg">
                      {item.surahName} {item.ayah}
                    </span>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{item.word}</h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mt-2">{item.meaning}</p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button onClick={() => handleToggle(item)} title="تفعيل/تعطيل" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-admin-bg text-gray-500">
                    <Power className={`w-4 h-4 ${item.enabled ? 'text-emerald-500' : 'text-gray-400'}`} />
                  </button>
                  <button onClick={() => handleEdit(item)} title="تعديل" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-admin-bg text-blue-500">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(item.id)} title="حذف" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-admin-bg text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
