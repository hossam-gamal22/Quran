// admin-panel/src/pages/TasbihPresetsManager.tsx
// إدارة التسبيحات المسبقة

import React, { useState, useEffect } from 'react';
import { Plus, Save, Trash2, Edit2, X, GripVertical, Copy } from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';

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
    try {
      const id = preset.id || `tasbih_${Date.now()}`;
      await setDoc(doc(db, 'tasbihPresets', id), { ...preset, id });
      setSaveMsg('✅ تم الحفظ');
      setIsModalOpen(false);
      setEditingPreset(null);
      loadPresets();
    } catch (e) {
      setSaveMsg(`❌ ${(e as Error).message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل تريد حذف هذا التسبيح؟')) return;
    try {
      await deleteDoc(doc(db, 'tasbihPresets', id));
      loadPresets();
    } catch { /* empty */ }
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
        <button onClick={() => openEdit()} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700">
          <Plus size={18} /> إضافة تسبيح
        </button>
      </div>
      {saveMsg && <p className={`text-sm ${saveMsg.startsWith('✅') ? 'text-emerald-400' : 'text-red-400'}`}>{saveMsg}</p>}

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
            <div key={p.id} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 flex items-center gap-4">
              <GripVertical size={18} className="text-slate-500" />
              <div className="flex-1">
                <p className="text-white font-bold text-lg" dir="rtl">{p.text}</p>
                {p.transliteration && <p className="text-slate-400 text-sm">{p.transliteration}</p>}
                <div className="flex gap-4 mt-1 text-slate-500 text-xs">
                  <span>الهدف: {p.target}</span>
                  {p.reference && <span>{p.reference}</span>}
                </div>
              </div>
              <button onClick={() => openEdit(p)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400" title="تعديل" aria-label="تعديل"><Edit2 size={16} /></button>
              <button onClick={() => openEdit({ ...p, id: `tasbih_${Date.now()}`, text: p.text + ' (نسخة)', order: presets.length })} className="p-2 hover:bg-emerald-700/30 rounded-lg text-emerald-400" title="تكرار" aria-label="تكرار"><Copy size={16} /></button>
              <button onClick={() => handleDelete(p.id)} className="p-2 hover:bg-red-900/50 rounded-lg text-red-400" title="حذف" aria-label="حذف"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && editingPreset && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-bold text-lg">{editingPreset.id.startsWith('tasbih_') ? 'إضافة تسبيح' : 'تعديل'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white" title="إغلاق" aria-label="إغلاق"><X size={20} /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-slate-300 text-sm block mb-1">النص العربي *</label>
                <input className="w-full bg-slate-800 text-white rounded-lg px-4 py-2 border border-slate-700" dir="rtl" value={editingPreset.text} onChange={e => setEditingPreset({ ...editingPreset, text: e.target.value })} placeholder="سُبْحَانَ اللهِ" aria-label="النص العربي" />
              </div>
              <div>
                <label className="text-slate-300 text-sm block mb-1">النطق</label>
                <input className="w-full bg-slate-800 text-white rounded-lg px-4 py-2 border border-slate-700" value={editingPreset.transliteration || ''} onChange={e => setEditingPreset({ ...editingPreset, transliteration: e.target.value })} placeholder="SubhanAllah" aria-label="النطق" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 text-sm block mb-1">العدد المستهدف</label>
                  <input type="number" min={1} className="w-full bg-slate-800 text-white rounded-lg px-4 py-2 border border-slate-700" value={editingPreset.target} onChange={e => setEditingPreset({ ...editingPreset, target: Number(e.target.value) })} aria-label="العدد المستهدف" />
                </div>
                <div>
                  <label className="text-slate-300 text-sm block mb-1">المصدر</label>
                  <select className="w-full bg-slate-800 text-white rounded-lg px-4 py-2 border border-slate-700" value={editingPreset.source || 'hadith_sahih'} onChange={e => setEditingPreset({ ...editingPreset, source: e.target.value as TasbihPreset['source'] })} aria-label="المصدر">
                    <option value="quran">قرآن</option>
                    <option value="hadith_sahih">حديث صحيح</option>
                    <option value="hadith_hasan">حديث حسن</option>
                    <option value="athar">أثر</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-slate-300 text-sm block mb-1">الفضل</label>
                <textarea className="w-full bg-slate-800 text-white rounded-lg px-4 py-2 border border-slate-700" rows={2} dir="rtl" value={editingPreset.virtue || ''} onChange={e => setEditingPreset({ ...editingPreset, virtue: e.target.value })} placeholder="فضل الذكر" aria-label="الفضل" />
              </div>
              <div>
                <label className="text-slate-300 text-sm block mb-1">المرجع</label>
                <input className="w-full bg-slate-800 text-white rounded-lg px-4 py-2 border border-slate-700" dir="rtl" value={editingPreset.reference || ''} onChange={e => setEditingPreset({ ...editingPreset, reference: e.target.value })} placeholder="صحيح مسلم" aria-label="المرجع" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => handleSave(editingPreset)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700">
                <Save size={16} /> حفظ
              </button>
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TasbihPresetsManager;
