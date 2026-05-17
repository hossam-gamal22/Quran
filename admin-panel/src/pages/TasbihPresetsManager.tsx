// admin-panel/src/pages/TasbihPresetsManager.tsx
// إدارة التسبيحات المسبقة

import React, { useState, useEffect } from 'react';
import { Plus, Save, Trash2, Edit2, X, Copy, Download, Wand2, RefreshCw } from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { getDefaultTasbihPresets } from '../data/adhkar-defaults';

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
      const items = snap.docs.map(d => ({ ...d.data(), id: d.id } as TasbihPreset));
      items.sort((a, b) => (a.order || 0) - (b.order || 0));
      setPresets(items);
    } catch { /* empty */ }
    setIsLoading(false);
  };

  useEffect(() => { loadPresets(); }, []);

  const handleSave = async (preset: TasbihPreset) => {
    if (isGeneratedPlaceholderTranslation(preset.virtue) || isGeneratedPlaceholderTranslation(preset.reference)) {
      alert('قيمة "الفضل" أو "المرجع" placeholder تلقائي وليست ترجمة حقيقية. راجع النص قبل الحفظ.');
      return;
    }
    try {
      const id = preset.id || `tasbih_${Date.now()}`;
      await setDoc(doc(db, 'tasbihPresets', id), serializePresetForFirestore(preset, id));
      setSaveMsg('✅ تم الحفظ');
      setIsModalOpen(false);
      setEditingPreset(null);
      loadPresets();
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
      await loadPresets();
      setSaveMsg(`✅ تم إصلاح ${fixed} تسبيح`);
    } catch (e) {
      const msg = `❌ فشل التنظيف: ${(e as Error).message}`;
      setSaveMsg(msg);
      alert(msg);
    } finally {
      setCleaningCorrupted(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل تريد حذف هذا التسبيح؟')) return;
    try {
      await deleteDoc(doc(db, 'tasbihPresets', id));
      loadPresets();
    } catch (e) {
      alert(`فشل الحذف: ${(e as Error).message}`);
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
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors"
          onClick={async () => {
            const msg = presets.length === 0
              ? 'هل تريد استيراد التسبيحات الافتراضية من التطبيق (15 تسبيح)؟'
              : `يوجد ${presets.length} تسبيح بالفعل. هل تريد إضافة الافتراضي أيضاً؟`;
            if (!confirm(msg)) return;
            try {
              const defaults = getDefaultTasbihPresets();
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
          {presets.map(p => (
            <div key={p.id} className="bg-admin-surface/50 rounded-xl p-4 border border-admin-border/50 flex items-center gap-4">
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
