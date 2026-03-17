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
  type: 'holiday' | 'fasting' | 'special' | 'observance';
  importance: 'major' | 'minor';
}

const HIJRI_MONTHS = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى', 'جمادى الآخرة',
  'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة',
];

const EVENT_TYPES = [
  { value: 'holiday', label: 'عيد', color: 'emerald' },
  { value: 'fasting', label: 'صيام', color: 'amber' },
  { value: 'special', label: 'مناسبة خاصة', color: 'purple' },
  { value: 'observance', label: 'مناسبة عامة', color: 'blue' },
];

const EMPTY_EVENT: Omit<IslamicEvent, 'id'> = {
  name: '', nameAr: '', hijriMonth: 1, hijriDay: 1, description: '', descriptionAr: '', type: 'observance', importance: 'minor',
};

const IslamicEventsManager: React.FC = () => {
  const [events, setEvents] = useState<IslamicEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState<IslamicEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

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
    if (!confirm('هل تريد حذف هذه المناسبة؟')) return;
    try {
      await deleteDoc(doc(db, 'islamicEvents', id));
      loadEvents();
    } catch { /* empty */ }
  };

  const openEdit = (event?: IslamicEvent) => {
    setEditingEvent(event || { ...EMPTY_EVENT, id: `event_${Date.now()}` } as IslamicEvent);
    setIsModalOpen(true);
  };

  const typeInfo = (type: string) => EVENT_TYPES.find(t => t.value === type);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">المناسبات الإسلامية</h1>
          <p className="text-slate-400 mt-1">إدارة التقويم الهجري والمناسبات</p>
        </div>
        <button onClick={() => openEdit()} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700">
          <Plus size={18} /> إضافة مناسبة
        </button>
      </div>
      {saveMsg && <p className={`text-sm ${saveMsg.startsWith('✅') ? 'text-emerald-400' : 'text-red-400'}`}>{saveMsg}</p>}

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
            const ti = typeInfo(ev.type);
            return (
              <div key={ev.id} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-white font-bold" dir="rtl">{ev.nameAr}</h3>
                    <p className="text-slate-400 text-sm">{ev.name}</p>
                    <div className="flex gap-3 mt-2 text-xs">
                      <span className="text-emerald-400">{ev.hijriDay} {HIJRI_MONTHS[ev.hijriMonth - 1]}</span>
                      <span className={`px-2 py-0.5 rounded-full bg-${ti?.color || 'slate'}-900/50 text-${ti?.color || 'slate'}-400`}>
                        {ti?.label}
                      </span>
                      <span className={ev.importance === 'major' ? 'text-amber-400' : 'text-slate-500'}>
                        {ev.importance === 'major' ? 'رئيسية' : 'ثانوية'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(ev)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400" aria-label="تعديل" title="تعديل"><Edit2 size={14} /></button>
                    <button onClick={() => openEdit({ ...ev, id: `event_${Date.now()}`, nameAr: ev.nameAr + ' (نسخة)' })} className="p-2 hover:bg-emerald-700/30 rounded-lg text-emerald-400" aria-label="تكرار" title="تكرار"><Copy size={14} /></button>
                    <button onClick={() => handleDelete(ev.id)} className="p-2 hover:bg-red-900/50 rounded-lg text-red-400" aria-label="حذف" title="حذف"><Trash2 size={14} /></button>
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
          <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
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
                  <input className="w-full bg-slate-800 text-white rounded-lg px-4 py-2 border border-slate-700" dir="rtl" value={editingEvent.nameAr} onChange={e => setEditingEvent({ ...editingEvent, nameAr: e.target.value })} placeholder="عيد الفطر" aria-label="الاسم بالعربية" />
                </div>
                <div>
                  <label className="text-slate-300 text-sm block mb-1">الاسم بالإنجليزية</label>
                  <input className="w-full bg-slate-800 text-white rounded-lg px-4 py-2 border border-slate-700" value={editingEvent.name} onChange={e => setEditingEvent({ ...editingEvent, name: e.target.value })} placeholder="Eid al-Fitr" aria-label="الاسم بالإنجليزية" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 text-sm block mb-1">الشهر الهجري</label>
                  <select className="w-full bg-slate-800 text-white rounded-lg px-4 py-2 border border-slate-700" aria-label="الشهر الهجري" title="الشهر الهجري" value={editingEvent.hijriMonth} onChange={e => setEditingEvent({ ...editingEvent, hijriMonth: Number(e.target.value) })}>
                    {HIJRI_MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 text-sm block mb-1">اليوم الهجري</label>
                  <input type="number" min={1} max={30} className="w-full bg-slate-800 text-white rounded-lg px-4 py-2 border border-slate-700" placeholder="اليوم" value={editingEvent.hijriDay} onChange={e => setEditingEvent({ ...editingEvent, hijriDay: Number(e.target.value) })} aria-label="اليوم الهجري" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 text-sm block mb-1">النوع</label>
                  <select className="w-full bg-slate-800 text-white rounded-lg px-4 py-2 border border-slate-700" aria-label="النوع" title="النوع" value={editingEvent.type} onChange={e => setEditingEvent({ ...editingEvent, type: e.target.value as IslamicEvent['type'] })}>
                    {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 text-sm block mb-1">الأهمية</label>
                  <select className="w-full bg-slate-800 text-white rounded-lg px-4 py-2 border border-slate-700" aria-label="الأهمية" title="الأهمية" value={editingEvent.importance} onChange={e => setEditingEvent({ ...editingEvent, importance: e.target.value as IslamicEvent['importance'] })}>
                    <option value="major">رئيسية</option>
                    <option value="minor">ثانوية</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-slate-300 text-sm block mb-1">الوصف بالعربية</label>
                <textarea className="w-full bg-slate-800 text-white rounded-lg px-4 py-2 border border-slate-700" rows={2} dir="rtl" value={editingEvent.descriptionAr} onChange={e => setEditingEvent({ ...editingEvent, descriptionAr: e.target.value })} placeholder="وصف المناسبة" aria-label="الوصف بالعربية" />
              </div>
              <div>
                <label className="text-slate-300 text-sm block mb-1">الوصف بالإنجليزية</label>
                <textarea className="w-full bg-slate-800 text-white rounded-lg px-4 py-2 border border-slate-700" rows={2} value={editingEvent.description} onChange={e => setEditingEvent({ ...editingEvent, description: e.target.value })} placeholder="Event description" aria-label="الوصف بالإنجليزية" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => handleSave(editingEvent)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700">
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

export default IslamicEventsManager;
