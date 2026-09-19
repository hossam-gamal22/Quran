// admin-panel/src/pages/TasbihPresetsManager.tsx
// إدارة التسبيحات المسبقة

import React, { useState, useEffect } from 'react';
import { Plus, Save, Trash2, Edit2, X, Copy, Download, Wand2, RefreshCw, ArrowUp, ArrowDown } from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, onSnapshot, writeBatch } from 'firebase/firestore';
import { bumpContentVersion } from '../utils/content-version';
import { getDefaultTasbihPresets } from '../data/adhkar-defaults';
import { reconcileAdminTasbihPresets, type AdminTasbihPreset } from '../../../lib/tasbih-presets';

function isGeneratedPlaceholderTranslation(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase().replace(/[_-]/g, ' ');
  return /^(virtue|reference|benefit|title|subtitle|label|body)?[a-z]+(?:tasbih|azkar|dua|dhikr|daily|seasonal|prayer|quran|default)\s+default\s+\d+$/.test(normalized);
}

interface TasbihPreset {
  id: string;
  text: string;
  transliteration?: string;
  target: number;
  virtue?: string;
  reference?: string;
  source?: 'quran' | 'hadith_sahih' | 'hadith_hasan' | 'athar';
  grade?: string;
  order: number;
}

const EMPTY_PRESET: Omit<TasbihPreset, 'id'> = {
  text: '', transliteration: '', target: 33, virtue: '', reference: '', source: 'hadith_sahih', grade: '', order: 0,
};

const YUNUS_DUA_PRESET_ID = 'tasbih_default_6';
const YUNUS_DUA_TEXT = 'لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ';
const YUNUS_DUA_TRANSLITERATION = 'La ilaha illa anta subhanaka inni kuntu minaz-zalimin';
const YUNUS_DUA_VIRTUE = 'دعوة ذي النون عليه السلام؛ قال النبي ﷺ: «فإنه لم يدعُ بها رجل مسلم في شيء قط إلا استجاب الله له». ولم يثبت لها عدد مخصوص';
const YUNUS_DUA_REFERENCE = 'الأنبياء: 87، وسنن الترمذي 3505';
const DEPRECATED_SUBHAN_WABIHAMDIH_TEXT = 'سبحان الله وبحمده';

function sortPresets(items: TasbihPreset[]): TasbihPreset[] {
  return [...items].sort((a, b) => (a.order || 0) - (b.order || 0));
}

function normalizeTasbihPresetsForAdmin(items: TasbihPreset[]): TasbihPreset[] {
  // The local TasbihPreset keeps transliteration/source optional (the UI fills defaults),
  // while reconcileAdminTasbihPresets requires them — the runtime objects always satisfy it.
  return sortPresets(reconcileAdminTasbihPresets(items as AdminTasbihPreset[]));
}

function stripArabicTashkeel(text: string): string {
  return text.replace(/[\u064B-\u065F\u0670]/g, '');
}

function normalizeArabicText(text: string): string {
  return stripArabicTashkeel(text).replace(/\s+/g, ' ').trim();
}

function isDeprecatedSubhanWabihamdihPreset(preset: TasbihPreset): boolean {
  return preset.id === YUNUS_DUA_PRESET_ID
    || String((preset as unknown as Record<string, unknown>).id) === '6'
    || normalizeArabicText(preset.text) === DEPRECATED_SUBHAN_WABIHAMDIH_TEXT;
}

function normalizeDeprecatedTasbihPreset(preset: TasbihPreset): TasbihPreset {
  if (!isDeprecatedSubhanWabihamdihPreset(preset)) return preset;

  return {
    ...preset,
    text: YUNUS_DUA_TEXT,
    transliteration: YUNUS_DUA_TRANSLITERATION,
    target: 1,
    source: 'quran',
    virtue: YUNUS_DUA_VIRTUE,
    reference: YUNUS_DUA_REFERENCE,
    grade: '',
  };
}

function getMobilePresetId(docId: string, order = 0): number {
  const trailingNumber = docId.match(/(\d+)$/)?.[1];
  if (trailingNumber) {
    const parsed = Number(trailingNumber);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return Math.max(1, order + 1);
}

function serializePresetForFirestore(preset: TasbihPreset, docId: string) {
  return {
    ...preset,
    id: getMobilePresetId(docId, preset.order || 0),
  };
}

const TasbihPresetsManager: React.FC = () => {
  const [presets, setPresets] = useState<TasbihPreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPreset, setEditingPreset] = useState<TasbihPreset | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const loadPresets = async () => {
    setIsLoading(true);
    try {
      const snap = await getDocs(collection(db, 'tasbihPresets'));
      const items = snap.docs.map(d => normalizeDeprecatedTasbihPreset({ ...d.data(), id: d.id } as TasbihPreset));
      setPresets(normalizeTasbihPresetsForAdmin(items));
    } catch { /* empty */ }
    setIsLoading(false);
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'tasbihPresets'),
      (snap) => {
        const items = snap.docs.map(d => normalizeDeprecatedTasbihPreset({ ...d.data(), id: d.id } as TasbihPreset));
        setPresets(normalizeTasbihPresetsForAdmin(items));
        setIsLoading(false);
      },
      () => {
        setIsLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const handleSave = async (preset: TasbihPreset) => {
    const normalizedPreset = normalizeDeprecatedTasbihPreset(preset);
    if (isGeneratedPlaceholderTranslation(normalizedPreset.virtue) || isGeneratedPlaceholderTranslation(normalizedPreset.reference)) {
      alert('قيمة "الفضل" أو "المرجع" placeholder تلقائي وليست ترجمة حقيقية. راجع النص قبل الحفظ.');
      return;
    }
    try {
      const id = normalizedPreset.id || `tasbih_${Date.now()}`;
      const nextOrder = Math.max(0, Math.min(presets.length, Number.isFinite(normalizedPreset.order) ? normalizedPreset.order : presets.length));
      const nextPresets = presets.filter(p => p.id !== id);
      nextPresets.splice(nextOrder, 0, { ...normalizedPreset, id, order: nextOrder });
      await persistPresetOrder(nextPresets);
      setSaveMsg('✅ تم الحفظ');
      setIsModalOpen(false);
      setEditingPreset(null);
    } catch (e) {
      const msg = `❌ فشل الحفظ: ${(e as Error).message}`;
      setSaveMsg(msg);
      alert(msg);
    }
  };

  const corruptedCount = presets.reduce((sum, p) => (
    sum + (isGeneratedPlaceholderTranslation(p.virtue) ? 1 : 0) + (isGeneratedPlaceholderTranslation(p.reference) ? 1 : 0)
  ), 0);

  const [cleaningCorrupted, setCleaningCorrupted] = useState(false);
  const [syncingYunusDua, setSyncingYunusDua] = useState(false);

  const handleCleanCorrupted = async () => {
    if (cleaningCorrupted) return;
    if (corruptedCount === 0) {
      alert('لا توجد قيم placeholder فاسدة ✅');
      return;
    }
    const confirmed = window.confirm(
      `يوجد ${corruptedCount} قيمة placeholder فاسدة في الحقول virtue/reference.\n` +
      `سيتم استبدالها بالنصوص الافتراضية الصحيحة من قاعدة البيانات المدمجة.\n\n` +
      `هل تريد المتابعة؟`,
    );
    if (!confirmed) return;
    setCleaningCorrupted(true);
    try {
      const defaults = getDefaultTasbihPresets();
      const defaultsById = new Map(defaults.map(d => [String(d.id), d]));
      let fixed = 0;
      for (const p of presets) {
        const badVirtue = isGeneratedPlaceholderTranslation(p.virtue);
        const badReference = isGeneratedPlaceholderTranslation(p.reference);
        if (!badVirtue && !badReference) continue;
        const defaultMatch = defaultsById.get(String(p.id));
        const next: TasbihPreset = {
          ...p,
          virtue: badVirtue ? (defaultMatch?.virtue || '') : p.virtue,
          reference: badReference ? (defaultMatch?.reference || '') : p.reference,
        };
        await setDoc(doc(db, 'tasbihPresets', p.id), serializePresetForFirestore(next, p.id));
        fixed += 1;
      }
      setSaveMsg(`✅ تم إصلاح ${fixed} تسبيح`);
    } catch (e) {
      const msg = `❌ فشل التنظيف: ${(e as Error).message}`;
      setSaveMsg(msg);
      alert(msg);
    } finally {
      setCleaningCorrupted(false);
    }
  };

  const handleSyncYunusDuaPreset = async () => {
    if (syncingYunusDua) return;
    setSyncingYunusDua(true);
    try {
      const defaultPreset = getDefaultTasbihPresets().find(p => p.id === YUNUS_DUA_PRESET_ID);
      if (!defaultPreset) throw new Error('Default Yunus dua preset not found');

      const candidates = presets.filter(isDeprecatedSubhanWabihamdihPreset);
      const docsToUpdate = candidates.length > 0 ? candidates : [{ ...(defaultPreset as TasbihPreset), id: YUNUS_DUA_PRESET_ID }];

      for (const preset of docsToUpdate) {
        const normalized = normalizeDeprecatedTasbihPreset({
          ...(defaultPreset as TasbihPreset),
          ...preset,
          id: preset.id || YUNUS_DUA_PRESET_ID,
          order: Number.isFinite(preset.order) ? preset.order : defaultPreset.order,
        });
        await setDoc(doc(db, 'tasbihPresets', normalized.id), serializePresetForFirestore(normalized, normalized.id));
      }

      await loadPresets();
      setSaveMsg(`✅ تم تحديث دعاء ذي النون في الأدمن (${docsToUpdate.length})`);
    } catch (e) {
      const msg = `❌ فشل تحديث دعاء ذي النون: ${(e as Error).message}`;
      setSaveMsg(msg);
      alert(msg);
    } finally {
      setSyncingYunusDua(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل تريد حذف هذا التسبيح؟')) return;
    try {
      await deleteDoc(doc(db, 'tasbihPresets', id));
      await bumpContentVersion('tasbihPresets');
    } catch (e) {
      alert(`فشل الحذف: ${(e as Error).message}`);
    }
  };

  const persistPresetOrder = async (nextPresets: TasbihPreset[]) => {
    const ordered = nextPresets.map((preset, index) => ({ ...preset, order: index }));
    setPresets(ordered);

    const batch = writeBatch(db);
    ordered.forEach((preset) => {
      batch.set(doc(db, 'tasbihPresets', preset.id), serializePresetForFirestore(preset, preset.id));
    });
    await batch.commit();
    await bumpContentVersion('tasbihPresets');
    setSaveMsg('✅ تم تحديث الترتيب');
  };

  const movePreset = async (id: string, direction: -1 | 1) => {
    const currentIndex = presets.findIndex(p => p.id === id);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= presets.length) return;

    const nextPresets = [...presets];
    const [moved] = nextPresets.splice(currentIndex, 1);
    nextPresets.splice(targetIndex, 0, moved);

    try {
      await persistPresetOrder(nextPresets);
    } catch (e) {
      alert(`فشل تحديث الترتيب: ${(e as Error).message}`);
      loadPresets();
    }
  };

  const handleOrderSave = async (preset: TasbihPreset, rawOrder: number) => {
    const nextOrder = Math.max(0, Math.min(presets.length - 1, Number.isFinite(rawOrder) ? rawOrder : 0));
    const others = presets.filter(p => p.id !== preset.id);
    const nextPresets = [...others];
    nextPresets.splice(nextOrder, 0, { ...preset, order: nextOrder });

    try {
      await persistPresetOrder(nextPresets);
    } catch (e) {
      alert(`فشل تحديث الترتيب: ${(e as Error).message}`);
      loadPresets();
    }
  };

  const openEdit = (preset?: TasbihPreset) => {
    setEditingPreset(preset || { ...EMPTY_PRESET, id: `tasbih_${Date.now()}`, order: presets.length } as TasbihPreset);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">إدارة التسبيحات</h1>
          <p className="text-slate-400 mt-1">إضافة وتعديل التسبيحات المسبقة</p>
        </div>
        <button onClick={() => openEdit()} className="flex items-center gap-2 px-4 py-2 bg-accent-dark text-white rounded-xl hover:bg-emerald-700 transition-colors">
          <Plus size={18} /> إضافة تسبيح
        </button>
        {corruptedCount > 0 && (
          <button
            onClick={handleCleanCorrupted}
            disabled={cleaningCorrupted}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors disabled:opacity-50"
            title={`يوجد ${corruptedCount} قيمة placeholder فاسدة`}
          >
            {cleaningCorrupted ? <RefreshCw size={18} className="animate-spin" /> : <Wand2 size={18} />}
            تنظيف {corruptedCount} قيمة فاسدة
          </button>
        )}
        <button
          onClick={handleSyncYunusDuaPreset}
          disabled={syncingYunusDua}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white rounded-xl hover:bg-emerald-800 transition-colors disabled:opacity-50"
        >
          {syncingYunusDua ? <RefreshCw size={18} className="animate-spin" /> : <Wand2 size={18} />}
          تحديث دعاء ذي النون
        </button>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors"
          onClick={async () => {
            const defaults = getDefaultTasbihPresets();
            const msg = presets.length === 0
              ? `هل تريد استيراد التسبيحات الافتراضية من التطبيق (${defaults.length} تسبيح)؟`
              : `يوجد ${presets.length} تسبيح بالفعل. هل تريد إضافة الافتراضي أيضاً؟`;
            if (!confirm(msg)) return;
            try {
              for (const p of defaults) {
                await setDoc(doc(db, 'tasbihPresets', p.id), serializePresetForFirestore(p as TasbihPreset, p.id));
              }
              await loadPresets();
              setSaveMsg(`✅ تم استيراد ${defaults.length} تسبيح`);
            } catch (e) {
              alert(`❌ فشل الاستيراد: ${(e as Error).message}`);
            }
          }}
        >
          <Download size={18} /> استيراد الافتراضي
        </button>
        <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors cursor-pointer">
          📥 استيراد JSON
          <input
            type="file"
            accept=".json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const text = await file.text();
                const items: TasbihPreset[] = JSON.parse(text);
                if (!Array.isArray(items)) throw new Error('JSON must be an array');
                for (const p of items) {
                  const id = p.id || `tasbih_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
                  await setDoc(doc(db, 'tasbihPresets', id), serializePresetForFirestore(p, id));
                }
                await loadPresets();
                setSaveMsg(`✅ تم استيراد ${items.length} عنصر`);
              } catch (err) {
                alert(`❌ فشل الاستيراد: ${(err as Error).message}`);
              } finally {
                if (e.target) e.target.value = '';
              }
            }}
          />
        </label>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-xl hover:bg-slate-700 transition-colors"
          onClick={() => {
            const data = JSON.stringify(presets, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'tasbih-presets.json';
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          📤 تصدير JSON
        </button>
      </div>
      {saveMsg && <p className={`text-sm ${saveMsg.startsWith('✅') ? 'text-accent-light' : 'text-red-400'}`}>{saveMsg}</p>}

      {isLoading ? (
        <div className="text-center text-slate-400 py-12">جاري التحميل...</div>
      ) : presets.length === 0 ? (
        <div className="text-center text-slate-400 py-12">
          <p>لا توجد تسبيحات مخصصة بعد</p>
          <p className="text-sm mt-1">التطبيق يستخدم التسبيحات المسبقة المدمجة</p>
        </div>
      ) : (
        <div className="space-y-3">
          {presets.map((p, index) => (
            <div key={p.id} className="bg-admin-surface/50 rounded-xl p-4 border border-admin-border/50 flex items-center gap-4">
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={() => movePreset(p.id, -1)}
                  disabled={index === 0}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-admin-surface-light hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                  title="رفع للأعلى"
                  aria-label="رفع للأعلى"
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  onClick={() => movePreset(p.id, 1)}
                  disabled={index === presets.length - 1}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-admin-surface-light hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                  title="تنزيل للأسفل"
                  aria-label="تنزيل للأسفل"
                >
                  <ArrowDown size={16} />
                </button>
              </div>
              <div className="w-14 shrink-0 text-center">
                <input
                  key={`${p.id}-${p.order ?? index}`}
                  type="number"
                  min={1}
                  max={presets.length}
                  defaultValue={(p.order ?? index) + 1}
                  onBlur={e => handleOrderSave(p, Number(e.target.value) - 1)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    }
                  }}
                  className="w-full bg-admin-surface text-center text-white rounded-lg px-2 py-1.5 border border-admin-border"
                  title="الترتيب"
                  aria-label="الترتيب"
                />
                <span className="text-[11px] text-slate-500">المركز</span>
              </div>
              <div className="flex-1">
                <p className="text-white font-bold text-lg" dir="rtl">{p.text}</p>
                {p.transliteration && <p className="text-slate-400 text-sm">{p.transliteration}</p>}
                <div className="flex gap-4 mt-1 text-slate-500 text-xs">
                  <span>الهدف: {p.target}</span>
                  {p.reference && <span>{p.reference}</span>}
                </div>
              </div>
              <button onClick={() => openEdit(p)} className="p-2 hover:bg-admin-surface-light rounded-lg text-slate-400" title="تعديل" aria-label="تعديل"><Edit2 size={16} /></button>
              <button onClick={() => openEdit({ ...p, id: `tasbih_${Date.now()}`, text: p.text + ' (نسخة)', order: presets.length })} className="p-2 hover:bg-accent-dark/30 rounded-lg text-accent-light" title="تكرار" aria-label="تكرار"><Copy size={16} /></button>
              <button onClick={() => handleDelete(p.id)} className="p-2 hover:bg-red-900/50 rounded-lg text-red-400" title="حذف" aria-label="حذف"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && editingPreset && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-admin-bg rounded-2xl border border-admin-border w-full max-w-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-bold text-lg">{editingPreset.id.startsWith('tasbih_') ? 'إضافة تسبيح' : 'تعديل'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white" title="إغلاق" aria-label="إغلاق"><X size={20} /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-slate-300 text-sm block mb-1">النص العربي *</label>
                <input className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" dir="rtl" value={editingPreset.text} onChange={e => setEditingPreset({ ...editingPreset, text: e.target.value })} placeholder="سُبْحَانَ اللهِ" aria-label="النص العربي" />
              </div>
              <div>
                <label className="text-slate-300 text-sm block mb-1">النطق</label>
                <input className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" value={editingPreset.transliteration || ''} onChange={e => setEditingPreset({ ...editingPreset, transliteration: e.target.value })} placeholder="SubhanAllah" aria-label="النطق" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 text-sm block mb-1">العدد المستهدف</label>
                  <input type="number" min={1} className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" value={editingPreset.target} onChange={e => setEditingPreset({ ...editingPreset, target: Number(e.target.value) })} aria-label="العدد المستهدف" />
                </div>
                <div>
                  <label className="text-slate-300 text-sm block mb-1">الترتيب</label>
                  <input type="number" min={1} className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" value={(editingPreset.order ?? 0) + 1} onChange={e => setEditingPreset({ ...editingPreset, order: Math.max(0, Number(e.target.value) - 1) })} aria-label="الترتيب" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 text-sm block mb-1">المصدر</label>
                  <select className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" value={editingPreset.source || 'hadith_sahih'} onChange={e => setEditingPreset({ ...editingPreset, source: e.target.value as TasbihPreset['source'] })} aria-label="المصدر">
                    <option value="quran">قرآن</option>
                    <option value="hadith_sahih">حديث صحيح</option>
                    <option value="hadith_hasan">حديث حسن</option>
                    <option value="athar">أثر</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-slate-300 text-sm block mb-1">الفضل</label>
                <textarea className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" rows={2} dir="rtl" value={editingPreset.virtue || ''} onChange={e => setEditingPreset({ ...editingPreset, virtue: e.target.value })} placeholder="فضل الذكر" aria-label="الفضل" />
              </div>
              <div>
                <label className="text-slate-300 text-sm block mb-1">المرجع</label>
                <input className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" dir="rtl" value={editingPreset.reference || ''} onChange={e => setEditingPreset({ ...editingPreset, reference: e.target.value })} placeholder="صحيح مسلم" aria-label="المرجع" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => handleSave(editingPreset)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-dark text-white rounded-xl hover:bg-emerald-700 transition-colors">
                <Save size={16} /> حفظ
              </button>
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 bg-admin-surface-light text-slate-300 rounded-xl hover:bg-slate-600 transition-colors">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TasbihPresetsManager;
