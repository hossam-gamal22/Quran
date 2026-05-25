// admin-panel/src/pages/IslamicEventsManager.tsx
// إدارة المناسبات الإسلامية + نظام الإشعارات التلقائية الذكي.
//
// كل مناسبة عليها زر "إشعار تلقائي". لما يكون مفعل:
//   • الفنكشن المجدول (islamic-events-cron) بيشتغل كل ساعة على نتلفاي
//   • بيشوف الناس اللي عندهم بكرة = تاريخ المناسبة بالهجري (في وقتهم المحلي)
//   • بيبعت لكل واحد لما الساعة عندة == notifyTimeHour (افتراضي 7 مساءً)
//   • منع التكرار: لو الإشعار اتبعت قبل كده للسنة الهجرية دي → بيتسكيب
//
// الترجمات الافتراضية موجودة في الفنكشن نفسه (event-messages.ts). الادمن يقدر
// يكتب ترجمة مخصصة في أي لغة وهي اللي تستخدم بدل الافتراضية.

import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Save, Trash2, Edit2, X, Calendar, Copy, Bell, BellOff, Send, ChevronDown, History,
} from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy, limit as fsLimit } from 'firebase/firestore';
import { SUPPORTED_LANGUAGES, type SupportedLanguage, type NotificationTranslations } from '../services/pushNotifications';

interface IslamicEvent {
  id: string;
  name: string;
  nameAr: string;
  hijriMonth: number;
  hijriDay: number;
  description: string;
  descriptionAr: string;
  // Auto-notify fields (Phase 2):
  autoNotify?: boolean;
  notifyDaysBefore?: number;     // default 1 ("tomorrow is X")
  notifyTimeHour?: number;       // 0-23, in user's local time (default 19 = 7 PM)
  translations?: NotificationTranslations;
  actionUrl?: string;            // default '/hijri'
}

interface RunHistoryItem {
  id: string;
  hourUtc?: string;
  sentCount?: number;
  failedCount?: number;
  matchedUsers?: number;
  skippedAlreadySent?: number;
  mode?: 'scheduled' | 'manual';
  perEvent?: Record<string, { sent: number; failed: number; skipped: number }>;
}

const HIJRI_MONTHS = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى', 'جمادى الآخرة',
  'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذي الحجة',
];

const ROUTE_OPTIONS = [
  { value: '/hijri', label: 'التقويم الهجري' },
  { value: '/seasonal/ramadan', label: 'صفحة رمضان' },
  { value: '/hajj-umrah', label: 'الحج والعمرة' },
  { value: '/seerah', label: 'السيرة النبوية' },
  { value: '/daily-dua', label: 'دعاء اليوم' },
  { value: '/daily-ayah', label: 'آية اليوم' },
  { value: '/', label: 'الرئيسية' },
];

const EMPTY_EVENT: Omit<IslamicEvent, 'id'> = {
  name: '', nameAr: '', hijriMonth: 1, hijriDay: 1, description: '', descriptionAr: '',
  autoNotify: false, notifyDaysBefore: 1, notifyTimeHour: 19,
  translations: {}, actionUrl: '/hijri',
};

// Default 13 Islamic events — IDs match server-side DEFAULT_EVENT_MESSAGES so
// the cron can pre-fill translations when autoNotify is on but admin hasn't
// authored a custom message.
const DEFAULT_ISLAMIC_EVENTS: IslamicEvent[] = [
  { id: 'event_new_year', name: 'Islamic New Year', nameAr: 'رأس السنة الهجرية', hijriMonth: 1, hijriDay: 1, description: 'First day of the Islamic calendar year', descriptionAr: 'بداية العام الهجري الجديد', autoNotify: true, notifyDaysBefore: 1, notifyTimeHour: 19, actionUrl: '/hijri' },
  { id: 'event_ashura', name: 'Day of Ashura', nameAr: 'يوم عاشوراء', hijriMonth: 1, hijriDay: 10, description: 'A significant day in Islamic history. Recommended to fast.', descriptionAr: 'يوم من أهم الأيام في التاريخ الإسلامي. يستحب صيامه', autoNotify: true, notifyDaysBefore: 1, notifyTimeHour: 19, actionUrl: '/hijri' },
  { id: 'event_mawlid', name: 'Mawlid al-Nabi', nameAr: 'المولد النبوي الشريف', hijriMonth: 3, hijriDay: 12, description: 'Birth of Prophet Muhammad ﷺ', descriptionAr: 'ذكرى مولد النبي ﷺ', autoNotify: true, notifyDaysBefore: 1, notifyTimeHour: 19, actionUrl: '/seerah' },
  { id: 'event_isra_miraj', name: 'Isra and Miraj', nameAr: 'الإسراء والمعراج', hijriMonth: 7, hijriDay: 27, description: 'The night journey of the Prophet ﷺ', descriptionAr: 'ذكرى رحلة الإسراء والمعراج', autoNotify: true, notifyDaysBefore: 1, notifyTimeHour: 19, actionUrl: '/seerah' },
  { id: 'event_shaban_15', name: 'Half of Shaban', nameAr: 'ليلة النصف من شعبان', hijriMonth: 8, hijriDay: 15, description: 'A blessed night with spiritual significance', descriptionAr: 'ليلة مباركة ذات أهمية روحية خاصة', autoNotify: true, notifyDaysBefore: 1, notifyTimeHour: 19, actionUrl: '/daily-dua' },
  { id: 'event_ramadan', name: 'First Day of Ramadan', nameAr: 'أول رمضان', hijriMonth: 9, hijriDay: 1, description: 'Beginning of the holy month of fasting', descriptionAr: 'بداية شهر رمضان المبارك', autoNotify: true, notifyDaysBefore: 1, notifyTimeHour: 19, actionUrl: '/seasonal/ramadan' },
  { id: 'event_badr', name: 'Battle of Badr', nameAr: 'غزوة بدر', hijriMonth: 9, hijriDay: 17, description: 'The first major victory in Islam', descriptionAr: 'أول انتصار عظيم في الإسلام', autoNotify: true, notifyDaysBefore: 1, notifyTimeHour: 19, actionUrl: '/seerah' },
  { id: 'event_last_ten', name: 'Last Ten Nights', nameAr: 'العشر الأواخر', hijriMonth: 9, hijriDay: 21, description: 'The blessed last ten nights of Ramadan', descriptionAr: 'العشر الأواخر المباركة من رمضان', autoNotify: true, notifyDaysBefore: 1, notifyTimeHour: 19, actionUrl: '/seasonal/ramadan' },
  { id: 'event_eid_fitr', name: 'Eid al-Fitr', nameAr: 'عيد الفطر المبارك', hijriMonth: 10, hijriDay: 1, description: 'Festival of Breaking the Fast', descriptionAr: 'عيد الفطر', autoNotify: true, notifyDaysBefore: 1, notifyTimeHour: 19, actionUrl: '/seasonal/ramadan' },
  { id: 'event_tarwiyah', name: 'Day of Tarwiyah', nameAr: 'يوم التروية', hijriMonth: 12, hijriDay: 8, description: 'Beginning of Hajj season', descriptionAr: 'بداية مناسك الحج', autoNotify: true, notifyDaysBefore: 1, notifyTimeHour: 19, actionUrl: '/hajj-umrah' },
  { id: 'event_arafah', name: 'Day of Arafah', nameAr: 'يوم عرفة', hijriMonth: 12, hijriDay: 9, description: 'The greatest day of Hajj', descriptionAr: 'أعظم أيام الحج', autoNotify: true, notifyDaysBefore: 1, notifyTimeHour: 19, actionUrl: '/daily-dua' },
  { id: 'event_eid_adha', name: 'Eid al-Adha', nameAr: 'عيد الأضحى المبارك', hijriMonth: 12, hijriDay: 10, description: 'Festival of Sacrifice', descriptionAr: 'عيد الأضحى', autoNotify: true, notifyDaysBefore: 1, notifyTimeHour: 19, actionUrl: '/hajj-umrah' },
  { id: 'event_tashreeq', name: 'Days of Tashreeq', nameAr: 'أيام التشريق', hijriMonth: 12, hijriDay: 11, description: 'The three days following Eid al-Adha', descriptionAr: 'الأيام الثلاثة بعد عيد الأضحى', autoNotify: true, notifyDaysBefore: 1, notifyTimeHour: 19, actionUrl: '/hijri' },
];

// ─── Helpers ───────────────────────────────────────────────────────────

const CRON_PATH = '/.netlify/functions/islamic-events-cron';
const ADMIN_SESSION_KEY = 'rooh_admin_session';

async function callCron(params: Record<string, string>): Promise<{ ok: boolean; data?: any; error?: string }> {
  const search = new URLSearchParams(params).toString();
  const token = (typeof localStorage !== 'undefined' ? localStorage.getItem(ADMIN_SESSION_KEY) : null) || '';
  try {
    const res = await fetch(`${CRON_PATH}${search ? `?${search}` : ''}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data?.error || `HTTP ${res.status}` };
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ─── Component ─────────────────────────────────────────────────────────

const IslamicEventsManager: React.FC = () => {
  const [events, setEvents] = useState<IslamicEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState<IslamicEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [history, setHistory] = useState<RunHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [activeLang, setActiveLang] = useState<SupportedLanguage>('ar');
  const [expandedLangs, setExpandedLangs] = useState<Set<string>>(new Set(['ar']));

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

  const loadHistory = async () => {
    try {
      const q = query(collection(db, 'eventNotificationRuns'), orderBy('hourUtc', 'desc'), fsLimit(20));
      const snap = await getDocs(q);
      setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() } as RunHistoryItem)));
    } catch { /* empty */ }
  };

  useEffect(() => { loadEvents(); }, []);
  useEffect(() => { if (showHistory) loadHistory(); }, [showHistory]);

  const handleSave = async (event: IslamicEvent) => {
    try {
      const id = event.id || `event_${Date.now()}`;
      // Strip empty translation entries so Firestore stays clean
      const cleanedTranslations: NotificationTranslations = {};
      if (event.translations) {
        for (const [lang, val] of Object.entries(event.translations) as [SupportedLanguage, { title?: string; body?: string }][]) {
          if (val?.title?.trim() || val?.body?.trim()) {
            cleanedTranslations[lang] = { title: val.title?.trim() || '', body: val.body?.trim() || '' };
          }
        }
      }
      await setDoc(doc(db, 'islamicEvents', id), {
        ...event,
        id,
        translations: cleanedTranslations,
        autoNotify: Boolean(event.autoNotify),
        notifyDaysBefore: typeof event.notifyDaysBefore === 'number' ? event.notifyDaysBefore : 1,
        notifyTimeHour: typeof event.notifyTimeHour === 'number' ? event.notifyTimeHour : 19,
        actionUrl: event.actionUrl || '/hijri',
      });
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

  const handleToggleAuto = async (event: IslamicEvent) => {
    try {
      await setDoc(doc(db, 'islamicEvents', event.id), { ...event, autoNotify: !event.autoNotify }, { merge: true });
      setSaveMsg(event.autoNotify ? '⏸️ تم إيقاف الإشعار التلقائي' : '🔔 تم تفعيل الإشعار التلقائي');
      loadEvents();
    } catch (e) {
      setSaveMsg(`❌ ${(e as Error).message}`);
    }
  };

  const handleTestSend = async (event: IslamicEvent) => {
    if (!confirm(`إرسال إشعار تجريبي لكل المستخدمين النشطين الآن لمناسبة "${event.nameAr}"؟\n\n⚠️ هذا يتجاوز شرط التوقيت والتاريخ.`)) return;
    setTestingId(event.id);
    try {
      const result = await callCron({ force: event.id });
      if (result.ok) {
        const sent = result.data?.stats?.sentCount ?? 0;
        const failed = result.data?.stats?.failedCount ?? 0;
        setSaveMsg(`✅ تم الإرسال — وصل: ${sent}, فشل: ${failed}`);
      } else {
        setSaveMsg(`❌ ${result.error}`);
      }
    } finally {
      setTestingId(null);
    }
  };

  const handleDryRun = async () => {
    setSaveMsg('⏳ جارٍ فحص من سيستقبل الإشعار الآن...');
    const result = await callCron({ dryRun: '1' });
    if (result.ok) {
      const planned = result.data?.planned?.length ?? 0;
      setSaveMsg(`🔍 الفحص اكتمل — ${planned} مستخدم مستهدف في الساعة الحالية`);
    } else {
      setSaveMsg(`❌ ${result.error}`);
    }
  };

  const openEdit = (event?: IslamicEvent) => {
    const base = event ? { ...event } : { ...EMPTY_EVENT, id: `event_${Date.now()}` } as IslamicEvent;
    if (!base.translations) base.translations = {};
    if (typeof base.notifyDaysBefore !== 'number') base.notifyDaysBefore = 1;
    if (typeof base.notifyTimeHour !== 'number') base.notifyTimeHour = 19;
    if (!base.actionUrl) base.actionUrl = '/hijri';
    setEditingEvent(base);
    setActiveLang('ar');
    setExpandedLangs(new Set(['ar']));
    setIsModalOpen(true);
  };

  const updateTranslation = (lang: SupportedLanguage, field: 'title' | 'body', value: string) => {
    if (!editingEvent) return;
    const trans = { ...(editingEvent.translations || {}) } as NotificationTranslations;
    const existing = trans[lang] || { title: '', body: '' };
    trans[lang] = { ...existing, [field]: value };
    setEditingEvent({ ...editingEvent, translations: trans });
  };

  const autoEnabledCount = useMemo(() => events.filter(e => e.autoNotify).length, [events]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">المناسبات الإسلامية</h1>
          <p className="text-slate-400 mt-1">إدارة التقويم الهجري + نظام الإشعارات التلقائية</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => openEdit()} className="flex items-center gap-2 px-4 py-2 bg-accent-dark text-white rounded-xl hover:bg-emerald-700 transition-colors">
            <Plus size={18} /> إضافة مناسبة
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors"
            onClick={async () => {
              const msg = events.length === 0
                ? `هل تريد استيراد ${DEFAULT_ISLAMIC_EVENTS.length} مناسبة افتراضية مع تفعيل الإشعار التلقائي؟`
                : `يوجد ${events.length} مناسبة بالفعل. سيتم تخطي المكرر. متابعة؟`;
              if (!confirm(msg)) return;
              try {
                const existingIds = new Set(events.map(e => e.id));
                let added = 0;
                for (const ev of DEFAULT_ISLAMIC_EVENTS) {
                  if (existingIds.has(ev.id)) continue;
                  await setDoc(doc(db, 'islamicEvents', ev.id), ev);
                  added++;
                }
                await loadEvents();
                setSaveMsg(`✅ تم استيراد ${added} مناسبة جديدة`);
              } catch (e) {
                alert(`❌ ${(e as Error).message}`);
              }
            }}
          >
            📥 استيراد الافتراضي
          </button>
          <button
            onClick={handleDryRun}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-colors"
            title="فحص بدون إرسال — يعرض من سيستلم الإشعار الساعة دي"
          >
            🔍 فحص (Dry-run)
          </button>
          <button
            onClick={() => setShowHistory(s => !s)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-colors"
          >
            <History size={16} /> سجل التشغيل
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-xl p-4 text-slate-200 text-sm leading-7" dir="rtl">
        <div className="flex items-start gap-3">
          <Bell className="w-5 h-5 text-accent-light flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-accent-light mb-1">نظام الإشعارات الذكي يعمل تلقائياً</p>
            <p>
              المناسبات اللي عليها <strong>إشعار تلقائي مفعّل</strong> (حالياً <strong>{autoEnabledCount}</strong> مناسبة) هتبعت إشعار للمستخدم
              <strong> قبل المناسبة بيوم</strong> في تمام الـ <strong>7:00 مساءً</strong> بتوقيته المحلي (افتراضي).
              السيستم بيمنع تكرار الإشعار في نفس السنة الهجرية تلقائياً، ويستخدم الترجمة المناسبة لكل لغة من ١٢ لغة.
              لو سيبت الترجمة فاضية، هتُستخدم الرسالة الافتراضية الجاهزة.
            </p>
          </div>
        </div>
      </div>

      {saveMsg && <p className={`text-sm ${saveMsg.startsWith('✅') || saveMsg.startsWith('🔔') || saveMsg.startsWith('🔍') ? 'text-accent-light' : 'text-red-400'}`}>{saveMsg}</p>}

      {/* History panel */}
      {showHistory && (
        <div className="bg-admin-surface/50 rounded-xl p-4 border border-admin-border/50">
          <h3 className="text-white font-bold mb-3 flex items-center gap-2"><History size={16} /> آخر ٢٠ تشغيل</h3>
          {history.length === 0 ? (
            <p className="text-slate-400 text-sm">لا توجد سجلات بعد. الفنكشن بيشتغل كل ساعة تلقائياً.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {history.map(run => (
                <div key={run.id} className="bg-admin-bg/60 rounded-lg p-3 text-sm">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>{run.hourUtc ? new Date(run.hourUtc).toLocaleString('ar') : '—'}</span>
                    <span className={`px-2 py-0.5 rounded ${run.mode === 'manual' ? 'bg-amber-900/40 text-amber-300' : 'bg-slate-700 text-slate-300'}`}>
                      {run.mode === 'manual' ? 'يدوي' : 'تلقائي'}
                    </span>
                  </div>
                  <div className="text-slate-200">
                    وصل: <span className="text-accent-light font-bold">{run.sentCount ?? 0}</span> ·
                    فشل: <span className="text-red-400">{run.failedCount ?? 0}</span> ·
                    مرشحين: <span className="text-slate-400">{run.matchedUsers ?? 0}</span> ·
                    متخطي (مكرر): <span className="text-slate-400">{run.skippedAlreadySent ?? 0}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="text-center text-slate-400 py-12">جاري التحميل...</div>
      ) : events.length === 0 ? (
        <div className="text-center text-slate-400 py-12">
          <Calendar size={48} className="mx-auto mb-4 opacity-50" />
          <p>لا توجد مناسبات — اضغط "استيراد الافتراضي" لإضافة ١٣ مناسبة مع إشعارات تلقائية جاهزة.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map(ev => {
            const autoOn = Boolean(ev.autoNotify);
            const notifyHour = typeof ev.notifyTimeHour === 'number' ? ev.notifyTimeHour : 19;
            return (
              <div key={ev.id} className={`rounded-xl p-4 border transition-colors ${autoOn ? 'bg-emerald-950/30 border-emerald-700/50' : 'bg-admin-surface/50 border-admin-border/50'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold" dir="rtl">{ev.nameAr}</h3>
                    <p className="text-slate-400 text-sm truncate">{ev.name}</p>
                    <div className="flex gap-3 mt-2 text-xs flex-wrap">
                      <span className="text-accent-light">{ev.hijriDay} {HIJRI_MONTHS[ev.hijriMonth - 1]}</span>
                      {autoOn && (
                        <span className="text-slate-300 flex items-center gap-1">
                          <Bell size={11} /> تنبيه قبلها بـ{ev.notifyDaysBefore ?? 1} يوم — الساعة {notifyHour}:00 محلياً
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleToggleAuto(ev)}
                      className={`p-2 rounded-lg transition-colors ${autoOn ? 'bg-emerald-700 hover:bg-emerald-800 text-white' : 'hover:bg-admin-surface-light text-slate-400'}`}
                      title={autoOn ? 'إيقاف الإشعار التلقائي' : 'تفعيل الإشعار التلقائي'}
                      aria-label="toggle-auto-notify"
                    >
                      {autoOn ? <Bell size={14} /> : <BellOff size={14} />}
                    </button>
                    <button
                      onClick={() => handleTestSend(ev)}
                      disabled={testingId === ev.id}
                      className="p-2 hover:bg-amber-900/40 rounded-lg text-amber-400 transition-colors disabled:opacity-50"
                      title="اختبار الإرسال الآن"
                      aria-label="test-send"
                    >
                      <Send size={14} />
                    </button>
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
          <div className="bg-admin-bg rounded-2xl border border-admin-border w-full max-w-2xl p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-bold text-lg">
                {editingEvent.id.startsWith('event_') && !DEFAULT_ISLAMIC_EVENTS.some(e => e.id === editingEvent.id) ? 'إضافة مناسبة' : 'تعديل مناسبة'}
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

              {/* ─── Auto-notify section ─── */}
              <div className="bg-admin-surface/60 rounded-xl p-4 space-y-3 border border-admin-border">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editingEvent.autoNotify)}
                    onChange={e => setEditingEvent({ ...editingEvent, autoNotify: e.target.checked })}
                    className="w-4 h-4 accent-emerald-600"
                  />
                  <span className="text-white font-bold flex items-center gap-2">
                    <Bell size={16} className="text-accent-light" />
                    تفعيل الإشعار التلقائي لهذه المناسبة
                  </span>
                </label>

                {editingEvent.autoNotify && (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-slate-300 text-xs block mb-1">قبل المناسبة بـ</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number" min={0} max={7}
                            value={editingEvent.notifyDaysBefore ?? 1}
                            onChange={e => setEditingEvent({ ...editingEvent, notifyDaysBefore: Math.max(0, Math.min(7, Number(e.target.value) || 0)) })}
                            className="w-full bg-admin-surface text-white rounded-lg px-3 py-2 border border-admin-border text-sm"
                            aria-label="أيام قبل المناسبة"
                          />
                          <span className="text-slate-400 text-xs whitespace-nowrap">يوم</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-slate-300 text-xs block mb-1">الوقت (محلي للمستخدم)</label>
                        <select
                          value={editingEvent.notifyTimeHour ?? 19}
                          onChange={e => setEditingEvent({ ...editingEvent, notifyTimeHour: Number(e.target.value) })}
                          className="w-full bg-admin-surface text-white rounded-lg px-3 py-2 border border-admin-border text-sm"
                          aria-label="ساعة الإرسال"
                        >
                          {Array.from({ length: 24 }, (_, i) => (
                            <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-slate-300 text-xs block mb-1">الفتح عند الضغط</label>
                        <select
                          value={editingEvent.actionUrl || '/hijri'}
                          onChange={e => setEditingEvent({ ...editingEvent, actionUrl: e.target.value })}
                          className="w-full bg-admin-surface text-white rounded-lg px-3 py-2 border border-admin-border text-sm"
                          aria-label="رابط الإجراء"
                        >
                          {ROUTE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="bg-amber-950/30 border border-amber-800/50 rounded-lg p-3 text-xs text-amber-200 leading-6" dir="rtl">
                      💡 لو سيبت الترجمة فاضية، السيستم هيستخدم الرسالة الافتراضية المكتوبة بصيغة دعوية جميلة لكل مناسبة معروفة. تقدر تكتب رسالتك المخصصة هنا لتغيير الافتراضي.
                    </div>

                    {/* Translation language tabs */}
                    <div className="space-y-2">
                      {SUPPORTED_LANGUAGES.map(lang => {
                        const isOpen = expandedLangs.has(lang.code);
                        const trans = editingEvent.translations?.[lang.code] || { title: '', body: '' };
                        const hasContent = Boolean(trans.title?.trim() || trans.body?.trim());
                        return (
                          <div key={lang.code} className={`border rounded-lg overflow-hidden ${hasContent ? 'border-emerald-700/50' : 'border-admin-border'}`}>
                            <button
                              type="button"
                              onClick={() => {
                                const next = new Set(expandedLangs);
                                if (next.has(lang.code)) next.delete(lang.code);
                                else next.add(lang.code);
                                setExpandedLangs(next);
                                setActiveLang(lang.code);
                              }}
                              className="w-full px-3 py-2 flex items-center justify-between bg-admin-surface-light hover:bg-admin-surface-light/70 text-right transition-colors"
                              aria-expanded={isOpen}
                            >
                              <span className="text-sm text-slate-200">
                                {lang.flag} {lang.name} {hasContent && <span className="text-accent-light text-xs">●</span>}
                              </span>
                              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isOpen && (
                              <div className="p-3 space-y-2 bg-admin-surface">
                                <input
                                  type="text"
                                  value={trans.title || ''}
                                  onChange={e => updateTranslation(lang.code, 'title', e.target.value)}
                                  placeholder="العنوان (اتركه فارغ لاستخدام الافتراضي)"
                                  dir={lang.rtl ? 'rtl' : 'ltr'}
                                  className="w-full px-3 py-2 bg-admin-surface-light border border-admin-border rounded-lg text-white text-sm"
                                />
                                <textarea
                                  value={trans.body || ''}
                                  onChange={e => updateTranslation(lang.code, 'body', e.target.value)}
                                  placeholder="نص الإشعار (اتركه فارغ لاستخدام الافتراضي)"
                                  dir={lang.rtl ? 'rtl' : 'ltr'}
                                  rows={3}
                                  className="w-full px-3 py-2 bg-admin-surface-light border border-admin-border rounded-lg text-white text-sm resize-none"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
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
