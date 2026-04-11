// admin-panel/src/pages/IslamicEventsManager.tsx
// إدارة المناسبات الإسلامية

import React, { useState, useEffect } from 'react';
import { Plus, Save, Trash2, Edit2, X, Calendar, Copy } from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';

interface IslamicEvent {
  id: string;
  name: string;
  nameAr: string;
  hijriMonth: number;
  hijriDay: number;
  description: string;
  descriptionAr: string;
}

const HIJRI_MONTHS = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى', 'جمادى الآخرة',
  'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة',
];

const EMPTY_EVENT: Omit<IslamicEvent, 'id'> = {
  name: '', nameAr: '', hijriMonth: 1, hijriDay: 1, description: '', descriptionAr: '',
};

const IslamicEventsManager: React.FC = () => {
  const [events, setEvents] = useState<IslamicEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState<IslamicEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const loadEvents = async () => {
    setIsLoading(true);
    try {
      const snap = await getDocs(collection(db, 'islamicEvents'));
      const items = snap.docs.map(d => ({ ...d.data(), id: d.id } as IslamicEvent));
      items.sort((a, b) => a.hijriMonth - b.hijriMonth || a.hijriDay - b.hijriDay);
      setEvents(items);
    } catch { /* empty */ }
    setIsLoading(false);
  };

  useEffect(() => { loadEvents(); }, []);

  const handleSave = async (event: IslamicEvent) => {
    try {
      const id = event.id || `event_${Date.now()}`;
      await setDoc(doc(db, 'islamicEvents', id), { ...event, id });
      setSaveMsg('✅ تم الحفظ');
      setIsModalOpen(false);
      setEditingEvent(null);
      loadEvents();
    } catch (e) {
      setSaveMsg(`❌ ${(e as Error).message}`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'islamicEvents', id));
      setDeleteConfirmId(null);
      loadEvents();
    } catch { /* empty */ }
  };

  const openEdit = (event?: IslamicEvent) => {
    setEditingEvent(event || { ...EMPTY_EVENT, id: `event_${Date.now()}` } as IslamicEvent);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">المناسبات الإسلامية</h1>
          <p className="text-slate-400 mt-1">إدارة التقويم الهجري والمناسبات</p>
        </div>
        <button onClick={() => openEdit()} className="flex items-center gap-2 px-4 py-2 bg-accent-dark text-white rounded-xl hover:bg-emerald-700 transition-colors">
          <Plus size={18} /> إضافة مناسبة
        </button>
      </div>
      {saveMsg && <p className={`text-sm ${saveMsg.startsWith('✅') ? 'text-accent-light' : 'text-red-400'}`}>{saveMsg}</p>}

      {isLoading ? (
        <div className="text-center text-slate-400 py-12">جاري التحميل...</div>
      ) : events.length === 0 ? (
        <div className="text-center text-slate-400 py-12">
          <Calendar size={48} className="mx-auto mb-4 opacity-50" />
          <p>لا توجد مناسبات مخصصة — التطبيق يستخدم 11 مناسبة مدمجة</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map(ev => {
            return (
              <div key={ev.id} className="bg-admin-surface/50 rounded-xl p-4 border border-admin-border/50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-white font-bold" dir="rtl">{ev.nameAr}</h3>
                    <p className="text-slate-400 text-sm">{ev.name}</p>
                    <div className="flex gap-3 mt-2 text-xs">
                      <span className="text-accent-light">{ev.hijriDay} {HIJRI_MONTHS[ev.hijriMonth - 1]}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(ev)} className="p-2 hover:bg-admin-surface-light rounded-lg text-slate-400 hover:text-white transition-colors" aria-label="تعديل" title="تعديل"><Edit2 size={14} /></button>
                    <button onClick={() => openEdit({ ...ev, id: `event_${Date.now()}`, nameAr: ev.nameAr + ' (نسخة)' })} className="p-2 hover:bg-emerald-900/40 rounded-lg text-accent-light transition-colors" aria-label="تكرار" title="تكرار"><Copy size={14} /></button>
                    {deleteConfirmId === ev.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDelete(ev.id)} className="px-2 py-1 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700 transition-colors">تأكيد الحذف</button>
                        <button onClick={() => setDeleteConfirmId(null)} className="px-2 py-1 bg-admin-surface-light text-slate-300 rounded-lg text-xs hover:bg-slate-600 transition-colors">إلغاء</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirmId(ev.id)} className="p-2 hover:bg-red-900/50 rounded-lg text-red-400 transition-colors" aria-label="حذف" title="حذف"><Trash2 size={14} /></button>
                    )}
                  </div>
                </div>
                {ev.descriptionAr && <p className="text-slate-400 text-sm mt-2" dir="rtl">{ev.descriptionAr}</p>}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && editingEvent && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-admin-bg rounded-2xl border border-admin-border w-full max-w-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-bold text-lg">
                {editingEvent.id.startsWith('event_') ? 'إضافة مناسبة' : 'تعديل'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white" aria-label="إغلاق" title="إغلاق"><X size={20} /></button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 text-sm block mb-1">الاسم بالعربية *</label>
                  <input className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" dir="rtl" value={editingEvent.nameAr} onChange={e => setEditingEvent({ ...editingEvent, nameAr: e.target.value })} placeholder="عيد الفطر" aria-label="الاسم بالعربية" />
                </div>
                <div>
                  <label className="text-slate-300 text-sm block mb-1">الاسم بالإنجليزية</label>
                  <input className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" value={editingEvent.name} onChange={e => setEditingEvent({ ...editingEvent, name: e.target.value })} placeholder="Eid al-Fitr" aria-label="الاسم بالإنجليزية" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 text-sm block mb-1">الشهر الهجري</label>
                  <select className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" aria-label="الشهر الهجري" title="الشهر الهجري" value={editingEvent.hijriMonth} onChange={e => setEditingEvent({ ...editingEvent, hijriMonth: Number(e.target.value) })}>
                    {HIJRI_MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 text-sm block mb-1">اليوم الهجري</label>
                  <input type="number" min={1} max={30} className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" placeholder="اليوم" value={editingEvent.hijriDay} onChange={e => setEditingEvent({ ...editingEvent, hijriDay: Number(e.target.value) })} aria-label="اليوم الهجري" />
                </div>
              </div>
              <div>
                <label className="text-slate-300 text-sm block mb-1">الوصف بالعربية</label>
                <textarea className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" rows={2} dir="rtl" value={editingEvent.descriptionAr} onChange={e => setEditingEvent({ ...editingEvent, descriptionAr: e.target.value })} placeholder="وصف المناسبة" aria-label="الوصف بالعربية" />
              </div>
              <div>
                <label className="text-slate-300 text-sm block mb-1">الوصف بالإنجليزية</label>
                <textarea className="w-full bg-admin-surface text-white rounded-lg px-4 py-2 border border-admin-border" rows={2} value={editingEvent.description} onChange={e => setEditingEvent({ ...editingEvent, description: e.target.value })} placeholder="Event description" aria-label="الوصف بالإنجليزية" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => handleSave(editingEvent)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-dark text-white rounded-xl hover:bg-emerald-700 transition-colors">
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

export default IslamicEventsManager;
