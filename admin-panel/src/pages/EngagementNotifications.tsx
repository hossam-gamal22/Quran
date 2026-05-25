// admin-panel/src/pages/EngagementNotifications.tsx
// إعدادات الإشعارات التحفيزية التلقائية - روح المسلم
//
// Schema (Firestore: appConfig/engagementNotifications):
//   {
//     inactivity: {
//       enabled: boolean,
//       triggerDays: number,        // أيام عدم النشاط قبل أول إشعار
//       repeatDays: number,         // 0 = مرة واحدة فقط، >0 = إعادة الإرسال كل N يوم
//       actionUrl: string,
//       translations: { [lang]: { title, body } }
//     },
//     nameAndOpenPrompt: { triggerDaysSinceInstall, ... },
//     namePrompt: { triggerDaysSinceInstall, ... }
//   }
//
// أنواع الإشعارات الثلاثة:
//   1. inactivity        - مرت N يوم بدون فتح التطبيق
//   2. nameAndOpenPrompt - مرت N يوم من التنزيل بدون اسم وبدون فتح
//   3. namePrompt        - فاتح التطبيق لكن بدون اسم

import { useState, useEffect, useMemo } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as firestoreLimit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Bell, Save, Send, ChevronDown, RefreshCw, History, Users } from 'lucide-react';
import { SUPPORTED_LANGUAGES, type SupportedLanguage, type NotificationTranslations } from '../services/pushNotifications';
import { ROUTE_PICKER_OPTIONS } from '../constants/app-routes';

type EngagementType = 'inactivity' | 'nameAndOpenPrompt' | 'namePrompt';

interface EngagementConfig {
  enabled: boolean;
  triggerDays: number;
  repeatDays: number;
  actionUrl: string;
  translations: NotificationTranslations;
}

type EngagementConfigDoc = Record<EngagementType, EngagementConfig>;
type EngagementConfigStoredDoc = Partial<EngagementConfigDoc> & { updatedAt?: unknown };
type EngagementRecipientPreview = {
  userId: string;
  displayName?: string;
  language?: string;
  platform?: string;
  lastActiveMs?: number;
};
type EngagementHistoryItem = {
  id: string;
  type: `engagement_${EngagementType}`;
  sentAt?: Timestamp | string;
  createdAt?: Timestamp | string;
  sentCount?: number;
  failedCount?: number;
  matchedCount?: number;
  skippedCount?: number;
  recipientCount?: number;
  recipientPreview?: EngagementRecipientPreview[];
  recipientPreviewLimit?: number;
};

const TYPE_META: Record<EngagementType, { title: string; description: string; defaultActionUrl: string; defaultTriggerDays: number }> = {
  inactivity: {
    title: 'تذكير بفتح التطبيق (غير النشطين)',
    description: 'يُرسل لأي مستخدم لم يفتح التطبيق لمدة N يوم — رسالة تحفيزية لإكمال العبادات.',
    defaultActionUrl: '/',
    defaultTriggerDays: 7,
  },
  nameAndOpenPrompt: {
    title: 'مستخدم نزّل التطبيق ولم يفتحه أو يكتب اسمه',
    description: 'يُرسل لأي حساب تم تسجيله من المتجر لكن لم يفتح التطبيق ولم يكتب اسماً — يحفّزه على الاسم والفتح.',
    defaultActionUrl: '/onboarding/welcome',
    defaultTriggerDays: 14,
  },
  namePrompt: {
    title: 'مستخدم نشط بدون اسم',
    description: 'يُرسل لأي مستخدم يفتح التطبيق لكنه لم يكتب اسماً بعد — تذكير لطيف.',
    defaultActionUrl: '/settings/display',
    defaultTriggerDays: 0,
  },
};

const DEFAULT_TRANSLATIONS: Record<EngagementType, NotificationTranslations> = {
  inactivity: {
    ar: { title: 'افتقدناك في روح المسلم 🌿', body: 'مرّت أيام بدون ذكر.. اِفتح التطبيق وأكمل وردك اليومي.' },
    en: { title: 'We miss you 🌿', body: "It's been a while — open Rooh Al-Muslim and keep your daily worship going." },
    fr: { title: 'Vous nous manquez 🌿', body: 'Cela fait un moment — ouvrez l\'application et reprenez vos adhkar.' },
    de: { title: 'Wir vermissen dich 🌿', body: 'Es ist eine Weile her — öffne die App und setze deine Adhkar fort.' },
    es: { title: 'Te extrañamos 🌿', body: 'Ha pasado un tiempo — abre la aplicación y continúa con tus adhkar.' },
    tr: { title: 'Seni özledik 🌿', body: 'Bir süre oldu — uygulamayı aç ve ezkârına devam et.' },
    ur: { title: 'ہم آپ کو یاد کرتے ہیں 🌿', body: 'کچھ وقت گزر گیا — ایپ کھولیں اور اپنا روزانہ کا ذکر جاری رکھیں۔' },
    id: { title: 'Kami merindukan Anda 🌿', body: 'Sudah lama — buka aplikasi dan lanjutkan dzikir harian Anda.' },
    ms: { title: 'Kami merindui anda 🌿', body: 'Sudah lama — buka aplikasi dan teruskan zikir harian anda.' },
    hi: { title: 'हम आपको याद कर रहे हैं 🌿', body: 'काफी समय हो गया — ऐप खोलें और अपना दैनिक अज़कार जारी रखें।' },
    bn: { title: 'আপনাকে মিস করছি 🌿', body: 'অনেক দিন হয়ে গেছে — অ্যাপ খুলুন এবং আপনার দৈনিক যিকির চালিয়ে যান।' },
    ru: { title: 'Мы скучаем по вам 🌿', body: 'Прошло время — откройте приложение и продолжайте ежедневные азкары.' },
  },
  nameAndOpenPrompt: {
    ar: { title: 'مرحباً بك في روح المسلم ✨', body: 'لم تفتح التطبيق بعد.. ابدأ بكتابة اسمك وافتح بابك للعبادات.' },
    en: { title: 'Welcome to Rooh Al-Muslim ✨', body: "You haven't opened the app yet — add your name and start your journey." },
    fr: { title: 'Bienvenue à Rooh Al-Muslim ✨', body: "Vous n'avez pas encore ouvert l'application — ajoutez votre nom et commencez." },
    de: { title: 'Willkommen bei Rooh Al-Muslim ✨', body: 'Du hast die App noch nicht geöffnet — füge deinen Namen hinzu und beginne deine Reise.' },
    es: { title: 'Bienvenido a Rooh Al-Muslim ✨', body: 'Aún no has abierto la aplicación — añade tu nombre y comienza.' },
    tr: { title: 'Rooh Al-Muslim\'a hoş geldin ✨', body: 'Uygulamayı henüz açmadın — adını ekle ve yolculuğa başla.' },
    ur: { title: 'روح المسلم میں خوش آمدید ✨', body: 'آپ نے ابھی تک ایپ نہیں کھولی — اپنا نام درج کریں اور سفر شروع کریں۔' },
    id: { title: 'Selamat datang di Rooh Al-Muslim ✨', body: 'Anda belum membuka aplikasi — tambahkan nama Anda dan mulai perjalanan.' },
    ms: { title: 'Selamat datang ke Rooh Al-Muslim ✨', body: 'Anda belum membuka aplikasi — tambah nama anda dan mulakan perjalanan.' },
    hi: { title: 'रूह अल-मुस्लिम में आपका स्वागत है ✨', body: 'आपने अभी तक ऐप नहीं खोला है — अपना नाम जोड़ें और शुरू करें।' },
    bn: { title: 'রূহ আল-মুসলিমে স্বাগতম ✨', body: 'আপনি এখনও অ্যাপ খুলেননি — আপনার নাম যোগ করুন এবং শুরু করুন।' },
    ru: { title: 'Добро пожаловать в Rooh Al-Muslim ✨', body: 'Вы еще не открывали приложение — добавьте свое имя и начните путь.' },
  },
  namePrompt: {
    ar: { title: 'اكتب اسمك واظهر في لوحة الشرف 🌟', body: 'أضف اسمك من الإعدادات لتظهر في لوحة الشرف وتنافس على المراكز الأولى بنقاطك الشهرية.' },
    en: { title: 'Add your name to join the Honor Board 🌟', body: 'Add your name in Settings so you can appear on the Honor Board and compete for the top monthly ranks.' },
    fr: { title: 'Ajoutez votre nom au tableau d’honneur 🌟', body: 'Ajoutez votre nom dans les paramètres pour apparaître au tableau d’honneur et viser les premières places du mois.' },
    de: { title: 'Trage deinen Namen für die Ehrentafel ein 🌟', body: 'Füge deinen Namen in den Einstellungen hinzu, damit du auf der Ehrentafel erscheinst und um die Monatsränge mitmachst.' },
    es: { title: 'Añade tu nombre al tablero de honor 🌟', body: 'Añade tu nombre en ajustes para aparecer en el tablero de honor y competir por los primeros puestos del mes.' },
    tr: { title: 'Şeref tablosunda görünmek için adını ekle 🌟', body: 'Aylık sıralamada yer almak ve zirveye yarışmak için ayarlardan adını ekle.' },
    ur: { title: 'اعزازی فہرست میں آنے کے لیے اپنا نام لکھیں 🌟', body: 'ترتیبات سے اپنا نام شامل کریں تاکہ آپ اعزازی فہرست میں نظر آئیں اور ماہانہ درجہ بندی میں مقابلہ کریں۔' },
    id: { title: 'Tambahkan nama untuk tampil di Papan Kehormatan 🌟', body: 'Tambahkan nama Anda di pengaturan agar muncul di Papan Kehormatan dan bersaing di peringkat bulanan.' },
    ms: { title: 'Tambah nama untuk muncul di Papan Kehormatan 🌟', body: 'Tambah nama anda dalam tetapan supaya anda muncul di Papan Kehormatan dan bersaing dalam ranking bulanan.' },
    hi: { title: 'सम्मान बोर्ड में दिखने के लिए नाम जोड़ें 🌟', body: 'सेटिंग्स में अपना नाम जोड़ें ताकि आप सम्मान बोर्ड पर दिखें और मासिक रैंकिंग में मुकाबला कर सकें।' },
    bn: { title: 'সম্মান বোর্ডে দেখাতে আপনার নাম যোগ করুন 🌟', body: 'সেটিংস থেকে আপনার নাম যোগ করুন, তাহলে আপনি সম্মান বোর্ডে দেখা যাবেন এবং মাসিক র‍্যাঙ্কে প্রতিযোগিতা করতে পারবেন।' },
    ru: { title: 'Добавьте имя для Доски почета 🌟', body: 'Добавьте имя в настройках, чтобы появиться на Доске почета и участвовать в ежемесячном рейтинге.' },
  },
};

const buildDefaultConfig = (): EngagementConfigDoc => ({
  inactivity: {
    enabled: true,
    triggerDays: TYPE_META.inactivity.defaultTriggerDays,
    repeatDays: 7,
    actionUrl: TYPE_META.inactivity.defaultActionUrl,
    translations: DEFAULT_TRANSLATIONS.inactivity,
  },
  nameAndOpenPrompt: {
    enabled: true,
    triggerDays: TYPE_META.nameAndOpenPrompt.defaultTriggerDays,
    repeatDays: 14,
    actionUrl: TYPE_META.nameAndOpenPrompt.defaultActionUrl,
    translations: DEFAULT_TRANSLATIONS.nameAndOpenPrompt,
  },
  namePrompt: {
    enabled: true,
    triggerDays: TYPE_META.namePrompt.defaultTriggerDays,
    repeatDays: 7,
    actionUrl: TYPE_META.namePrompt.defaultActionUrl,
    translations: DEFAULT_TRANSLATIONS.namePrompt,
  },
});

const CONFIG_PATH = ['appConfig', 'engagementNotifications'] as const;

function toSavedDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate();
  }
  return null;
}

function formatDateTime(value: unknown): string {
  const date = toSavedDate(value);
  return date ? date.toLocaleString('ar-EG') : 'غير معروف';
}

function isEngagementHistoryType(value: unknown): value is `engagement_${EngagementType}` {
  return value === 'engagement_inactivity' || value === 'engagement_nameAndOpenPrompt' || value === 'engagement_namePrompt';
}

function historyTypeToEngagementType(type: `engagement_${EngagementType}`): EngagementType {
  return type.replace('engagement_', '') as EngagementType;
}

function formatRecipient(recipient: EngagementRecipientPreview): string {
  const name = (recipient.displayName || '').trim();
  const label = name || `مستخدم ${recipient.userId.slice(0, 6)}`;
  const meta = [recipient.platform, recipient.language].filter(Boolean).join(' / ');
  return meta ? `${label} (${meta})` : label;
}

function mergeConfigWithDefaults(data: EngagementConfigStoredDoc): EngagementConfigDoc {
  const defaults = buildDefaultConfig();
  return {
    inactivity: {
      ...defaults.inactivity,
      ...(data.inactivity || {}),
      translations: { ...defaults.inactivity.translations, ...(data.inactivity?.translations || {}) },
    },
    nameAndOpenPrompt: {
      ...defaults.nameAndOpenPrompt,
      ...(data.nameAndOpenPrompt || {}),
      translations: { ...defaults.nameAndOpenPrompt.translations, ...(data.nameAndOpenPrompt?.translations || {}) },
    },
    namePrompt: {
      ...defaults.namePrompt,
      ...(data.namePrompt || {}),
      translations: { ...defaults.namePrompt.translations, ...(data.namePrompt?.translations || {}) },
    },
  };
}

export default function EngagementNotificationsPage() {
  const [config, setConfig] = useState<EngagementConfigDoc>(buildDefaultConfig());
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [expandedType, setExpandedType] = useState<EngagementType | null>('inactivity');
  const [expandedLangs, setExpandedLangs] = useState<Set<string>>(new Set(['ar', 'en']));
  const [triggeringType, setTriggeringType] = useState<EngagementType | null>(null);
  const [triggerResult, setTriggerResult] = useState<string | null>(null);
  const [history, setHistory] = useState<EngagementHistoryItem[]>([]);

  useEffect(() => {
    void loadConfig({ blocking: true });
  }, []);

  const loadConfig = async ({ blocking = false }: { blocking?: boolean } = {}) => {
    if (blocking) setInitialLoading(true);
    else setRefreshing(true);
    try {
      const [snap, historySnap] = await Promise.all([
        getDoc(doc(db, CONFIG_PATH[0], CONFIG_PATH[1])),
        getDocs(query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), firestoreLimit(100))),
      ]);
      if (snap.exists()) {
        const data = snap.data() as EngagementConfigStoredDoc;
        setConfig(mergeConfigWithDefaults(data));
        setSavedAt(toSavedDate(data.updatedAt));
      }
      setHistory(historySnap.docs
        .map(historyDoc => ({ id: historyDoc.id, ...historyDoc.data() } as Partial<EngagementHistoryItem> & { id: string }))
        .filter((item): item is EngagementHistoryItem => isEngagementHistoryType(item.type))
        .slice(0, 12));
    } catch (error) {
      console.error('Failed to load engagement config:', error);
    } finally {
      if (blocking) setInitialLoading(false);
      else setRefreshing(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, CONFIG_PATH[0], CONFIG_PATH[1]), {
        ...config,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setSavedAt(new Date());
    } catch (error) {
      console.error('Failed to save engagement config:', error);
      alert('فشل الحفظ. راجع الـ console.');
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerNow = async (type: EngagementType) => {
    setTriggeringType(type);
    setTriggerResult(null);
    try {
      // Write a trigger doc — the scheduled Cloud Function picks it up on next
      // tick and processes the matching audience immediately.
      await setDoc(doc(db, 'engagementNotificationTriggers', `${type}_${Date.now()}`), {
        type,
        requestedAt: serverTimestamp(),
        status: 'pending',
      });
      setTriggerResult(`تم وضع طلب الإرسال (${TYPE_META[type].title}) في قائمة المعالجة — السيرفر سيرسل خلال دقيقة.`);
    } catch (error) {
      console.error('Trigger failed:', error);
      setTriggerResult('تعذّر طلب الإرسال. راجع الـ console.');
    } finally {
      setTriggeringType(null);
    }
  };

  const updateType = (type: EngagementType, patch: Partial<EngagementConfig>) => {
    setConfig(prev => ({ ...prev, [type]: { ...prev[type], ...patch } }));
  };

  const applyHonorBoardNamePromptCopy = () => {
    updateType('namePrompt', { translations: { ...DEFAULT_TRANSLATIONS.namePrompt } });
    setExpandedType('namePrompt');
    setExpandedLangs(new Set(SUPPORTED_LANGUAGES.map(lang => lang.code)));
    setTriggerResult('تم تطبيق النص التشجيعي للوحة الشرف على كل اللغات. اضغط حفظ الإعدادات لتثبيته.');
  };

  const updateTranslation = (type: EngagementType, lang: SupportedLanguage, field: 'title' | 'body', value: string) => {
    setConfig(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        translations: {
          ...prev[type].translations,
          [lang]: {
            title: prev[type].translations[lang]?.title || '',
            body: prev[type].translations[lang]?.body || '',
            [field]: value,
          },
        },
      },
    }));
  };

  const toggleLang = (lang: string) => {
    setExpandedLangs(prev => {
      const next = new Set(prev);
      if (next.has(lang)) next.delete(lang); else next.add(lang);
      return next;
    });
  };

  const orderedTypes = useMemo<EngagementType[]>(() => ['inactivity', 'nameAndOpenPrompt', 'namePrompt'], []);

  if (initialLoading) {
    return (
      <div className="min-h-[420px] rounded-xl border border-admin-border bg-admin-surface/40 p-6 animate-panel-enter">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/15 shimmer-surface" />
          <div className="space-y-2">
            <div className="h-5 w-56 max-w-[65vw] rounded bg-slate-700 shimmer-surface" />
            <div className="h-3 w-80 max-w-[75vw] rounded bg-slate-800 shimmer-surface" />
          </div>
        </div>
        <div className="mt-8 space-y-4">
          {[0, 1, 2].map(item => (
            <div key={item} className="rounded-xl border border-admin-border bg-admin-surface p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-3">
                  <div className="h-4 w-64 max-w-[55vw] rounded bg-slate-700 shimmer-surface" />
                  <div className="h-3 w-96 max-w-[70vw] rounded bg-slate-800 shimmer-surface" />
                </div>
                <div className="h-8 w-8 rounded-lg bg-slate-800 shimmer-surface" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-page-enter">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Bell className="w-7 h-7 text-accent" />
          <div>
            <h1 className="text-2xl font-bold text-white">الإشعارات التحفيزية التلقائية</h1>
            <p className="text-sm text-slate-400">
              تتشغل بواسطة Cloud Function يومياً وتستهدف المستخدمين تلقائياً حسب شروط النشاط/الاسم.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => loadConfig()}
            disabled={refreshing}
            className="px-4 py-2 border border-admin-border rounded-lg text-slate-300 hover:bg-admin-surface-light disabled:opacity-60 flex items-center gap-2 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'جارٍ التحديث...' : 'إعادة التحميل'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-accent-dark text-white rounded-lg hover:bg-accent disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            <Save className="w-4 h-4" /> {saving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}
          </button>
        </div>
      </div>

      {savedAt && (
        <p className="text-xs text-slate-500 animate-fade-in">آخر تحديث: {savedAt.toLocaleString('ar-EG')}</p>
      )}
      {triggerResult && (
        <div className="bg-admin-surface border border-admin-border rounded-lg p-3 text-sm text-slate-300 animate-toast-in">{triggerResult}</div>
      )}

      <section className="bg-admin-surface border border-admin-border rounded-xl p-5 animate-panel-enter">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-accent-light" />
            <div>
              <h2 className="text-lg font-bold text-white">سجل إرسال الإشعارات التحفيزية</h2>
              <p className="text-xs text-slate-400">يعرض آخر مرات الإرسال، العدد، والمستلمين المسجلين مع الإرسالات الجديدة.</p>
            </div>
          </div>
          <span className="text-xs text-slate-500">{history.length} عملية</span>
        </div>

        {history.length === 0 ? (
          <div className="rounded-lg border border-dashed border-admin-border p-4 text-sm text-slate-400">
            لا توجد إرسالات تحفيزية مسجلة بعد.
          </div>
        ) : (
          <div className="space-y-3">
            {history.map(item => {
              const engagementType = historyTypeToEngagementType(item.type);
              const recipients = item.recipientPreview || [];
              const recipientCount = item.recipientCount ?? item.sentCount ?? 0;
              const hiddenRecipients = Math.max(0, recipientCount - recipients.length);
              return (
                <div key={item.id} className="rounded-lg border border-admin-border bg-admin-bg/45 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-white">{TYPE_META[engagementType].title}</span>
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">
                          أُرسل: {item.sentCount ?? 0}
                        </span>
                        {(item.failedCount ?? 0) > 0 && (
                          <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs text-red-300">
                            فشل: {item.failedCount}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        تاريخ الإرسال: {formatDateTime(item.sentAt || item.createdAt)}
                      </p>
                    </div>
                    <div className="text-xs text-slate-400">
                      مطابق للشروط: {item.matchedCount ?? '-'} · تم تخطيه بسبب التكرار: {item.skippedCount ?? 0}
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg bg-admin-surface/70 p-3">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-300">
                      <Users className="h-4 w-4 text-accent-light" />
                      المستلمون ({recipientCount})
                    </div>
                    {recipients.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {recipients.slice(0, 24).map(recipient => (
                          <span key={recipient.userId} className="rounded-full bg-admin-surface-light px-2.5 py-1 text-xs text-slate-200">
                            {formatRecipient(recipient)}
                          </span>
                        ))}
                        {hiddenRecipients > 0 && (
                          <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs text-accent-light">
                            و {hiddenRecipients} آخرين
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">
                        هذه العملية قديمة أو لم تُسجل أسماء المستلمين وقتها. الإرسالات القادمة ستعرض أسماء/معرّفات المستلمين هنا.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="space-y-4">
        {orderedTypes.map(type => {
          const meta = TYPE_META[type];
          const cfg = config[type];
          const isExpanded = expandedType === type;
          return (
            <div key={type} className="bg-admin-surface border border-admin-border rounded-xl overflow-hidden animate-panel-enter">
              <button
                onClick={() => setExpandedType(isExpanded ? null : type)}
                className="w-full p-5 flex items-center justify-between text-right hover:bg-admin-surface-light/40 transition-colors"
                aria-expanded={isExpanded}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-white">{meta.title}</h2>
                    <span className={`text-xs px-2 py-1 rounded-full ${cfg.enabled ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/15 text-slate-400'}`}>
                      {cfg.enabled ? 'مفعّل' : 'موقوف'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mt-1">{meta.description}</p>
                </div>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
              </button>

              <div className={`collapsible-grid ${isExpanded ? 'collapsible-grid-open' : ''}`}>
                <div className="min-h-0 overflow-hidden">
                  <div className={`p-5 border-t border-admin-border space-y-5 transition-all duration-300 ${isExpanded ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'}`}>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <label className="flex items-center gap-3 bg-admin-surface-light rounded-lg p-3 cursor-pointer transition-colors hover:bg-admin-surface-light/80">
                      <input
                        type="checkbox"
                        checked={cfg.enabled}
                        onChange={e => updateType(type, { enabled: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className="text-slate-200 text-sm">مفعّل</span>
                    </label>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        {type === 'inactivity' ? 'يُرسل بعد كم يوم بدون نشاط؟' : type === 'namePrompt' ? 'فترة الانتظار بعد الفتح (يوم)' : 'بعد كم يوم من التنزيل؟'}
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={cfg.triggerDays}
                        onChange={e => updateType(type, { triggerDays: Math.max(0, Number(e.target.value) || 0) })}
                        className="w-full px-3 py-2 bg-admin-surface-light border border-admin-border rounded-lg text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1">إعادة الإرسال كل (يوم) — 0 = مرة واحدة</label>
                      <input
                        type="number"
                        min={0}
                        value={cfg.repeatDays}
                        onChange={e => updateType(type, { repeatDays: Math.max(0, Number(e.target.value) || 0) })}
                        className="w-full px-3 py-2 bg-admin-surface-light border border-admin-border rounded-lg text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1">صفحة الإجراء (deep link)</label>
                      <select
                        value={cfg.actionUrl}
                        onChange={e => updateType(type, { actionUrl: e.target.value })}
                        className="w-full px-3 py-2 bg-admin-surface-light border border-admin-border rounded-lg text-white"
                      >
                        {ROUTE_PICKER_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-slate-200">نصوص الإشعار (12 لغة)</h3>
                      <div className="flex flex-wrap items-center gap-2">
                        {type === 'namePrompt' && (
                          <button
                            onClick={applyHonorBoardNamePromptCopy}
                            className="px-4 py-2 bg-amber-500/15 text-amber-200 border border-amber-500/25 rounded-lg hover:bg-amber-500/25 flex items-center gap-2 text-sm transition-colors"
                          >
                            تطبيق نص لوحة الشرف
                          </button>
                        )}
                        <button
                          onClick={() => handleTriggerNow(type)}
                          disabled={triggeringType === type}
                          className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-dark disabled:opacity-50 flex items-center gap-2 text-sm transition-colors"
                        >
                          <Send className="w-4 h-4" /> {triggeringType === type ? 'جارٍ الإرسال...' : 'تشغيل فوري الآن'}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {SUPPORTED_LANGUAGES.map(lang => {
                        const isOpen = expandedLangs.has(lang.code);
                        const trans = cfg.translations[lang.code] || { title: '', body: '' };
                        return (
                          <div key={lang.code} className="border border-admin-border rounded-lg overflow-hidden transition-colors hover:border-admin-border/80">
                            <button
                              onClick={() => toggleLang(lang.code)}
                              className="w-full px-3 py-2 flex items-center justify-between bg-admin-surface-light hover:bg-admin-surface-light/70 text-right transition-colors"
                              aria-expanded={isOpen}
                            >
                              <span className="text-sm text-slate-200">{lang.flag} {lang.name}</span>
                              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                            </button>
                            <div className={`collapsible-grid ${isOpen ? 'collapsible-grid-open' : ''}`}>
                              <div className="min-h-0 overflow-hidden">
                              <div className={`p-3 space-y-2 bg-admin-surface transition-all duration-300 ${isOpen ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'}`}>
                                <input
                                  type="text"
                                  value={trans.title}
                                  onChange={e => updateTranslation(type, lang.code, 'title', e.target.value)}
                                  placeholder="العنوان"
                                  dir={lang.rtl ? 'rtl' : 'ltr'}
                                  className="w-full px-3 py-2 bg-admin-surface-light border border-admin-border rounded-lg text-white text-sm"
                                />
                                <textarea
                                  value={trans.body}
                                  onChange={e => updateTranslation(type, lang.code, 'body', e.target.value)}
                                  placeholder="نص الإشعار"
                                  dir={lang.rtl ? 'rtl' : 'ltr'}
                                  rows={2}
                                  className="w-full px-3 py-2 bg-admin-surface-light border border-admin-border rounded-lg text-white text-sm resize-none"
                                />
                              </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
