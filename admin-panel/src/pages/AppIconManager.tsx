// admin-panel/src/pages/AppIconManager.tsx
// إدارة أيقونات التطبيق — مواسم + 12 لغة + تنبيه

import React, { useState, useEffect, useMemo } from 'react';
import {
  Image as ImageIcon,
  Save,
  Bell,
  BellOff,
  Loader2,
  Info,
  CheckCircle,
  AlertCircle,
  Calendar,
  Languages,
  Sparkles,
} from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import defaultArIcon from '../../../assets/images/icons/icon.png';
import defaultEnIcon from '../../../assets/images/icons/icon_en.png';
import ramadanIcon from '../../../assets/images/icons/seasonal/ramadan.png';
import hajjIcon from '../../../assets/images/icons/seasonal/hajj.png';
import mawlidIcon from '../../../assets/images/icons/seasonal/mawlid.png';
import eidFitrIcon from '../../../assets/images/icons/seasonal/eid_fitr.png';
import eidAdhaIcon from '../../../assets/images/icons/seasonal/eid_adha.png';
import dhulHijjahIcon from '../../../assets/images/icons/seasonal/dhul_hijjah.png';

// ─── Types ───────────────────────────────────────────────

type IconMode = 'auto' | 'manual' | 'language_only';

type SeasonalIconKey =
  | 'default_ar'
  | 'default_en'
  | 'ramadan'
  | 'hajj'
  | 'mawlid'
  | 'eid_fitr'
  | 'eid_adha'
  | 'dhul_hijjah';

type SeasonName =
  | 'ramadan'
  | 'hajj'
  | 'mawlid'
  | 'eid_fitr'
  | 'eid_adha'
  | 'dhul_hijjah'
  | 'ashura'
  | 'muharram'
  | 'rajab'
  | 'shaban';

type LangCode = 'ar' | 'en' | 'fr' | 'de' | 'es' | 'tr' | 'ur' | 'id' | 'ms' | 'hi' | 'bn' | 'ru';

type LocalizedText = Partial<Record<LangCode, string>>;

interface AppIconsConfig {
  version: number;
  alertEnabled: boolean;
  // Legacy AR/EN fields for backward compat with the running app.
  alertTitle: string;
  alertMessage: string;
  alertTitleEn: string;
  alertMessageEn: string;
  // Multilingual maps (preferred).
  alertTitleI18n: LocalizedText;
  alertMessageI18n: LocalizedText;
  // Seasonal switching.
  mode: IconMode;
  manualIcon: SeasonalIconKey | null;
  seasonalMap: Partial<Record<SeasonName, SeasonalIconKey>>;
  enabledSeasons: SeasonName[];
  updatedAt: string;
}

// ─── Constants ───────────────────────────────────────────

const LANGUAGES: { code: LangCode; nameAr: string; nameEn: string; rtl: boolean }[] = [
  { code: 'ar', nameAr: 'العربية', nameEn: 'Arabic', rtl: true },
  { code: 'en', nameAr: 'الإنجليزية', nameEn: 'English', rtl: false },
  { code: 'fr', nameAr: 'الفرنسية', nameEn: 'French', rtl: false },
  { code: 'de', nameAr: 'الألمانية', nameEn: 'German', rtl: false },
  { code: 'es', nameAr: 'الإسبانية', nameEn: 'Spanish', rtl: false },
  { code: 'tr', nameAr: 'التركية', nameEn: 'Turkish', rtl: false },
  { code: 'ur', nameAr: 'الأردية', nameEn: 'Urdu', rtl: true },
  { code: 'id', nameAr: 'الإندونيسية', nameEn: 'Indonesian', rtl: false },
  { code: 'ms', nameAr: 'الماليزية', nameEn: 'Malay', rtl: false },
  { code: 'hi', nameAr: 'الهندية', nameEn: 'Hindi', rtl: false },
  { code: 'bn', nameAr: 'البنغالية', nameEn: 'Bengali', rtl: false },
  { code: 'ru', nameAr: 'الروسية', nameEn: 'Russian', rtl: false },
];

const ICONS: { key: SeasonalIconKey; nameAr: string; nameEn: string; color: string; image: string }[] = [
  { key: 'default_ar', nameAr: 'الافتراضية (عربي)', nameEn: 'Default (AR)', color: '#0d8e62', image: defaultArIcon },
  { key: 'default_en', nameAr: 'الافتراضية (إنجليزي)', nameEn: 'Default (EN)', color: '#0d8e62', image: defaultEnIcon },
  { key: 'ramadan', nameAr: 'رمضان', nameEn: 'Ramadan', color: '#0f987f', image: ramadanIcon },
  { key: 'hajj', nameAr: 'الحج', nameEn: 'Hajj', color: '#8B4513', image: hajjIcon },
  { key: 'mawlid', nameAr: 'المولد النبوي', nameEn: 'Mawlid', color: '#2E8B57', image: mawlidIcon },
  { key: 'eid_fitr', nameAr: 'عيد الفطر', nameEn: 'Eid Fitr', color: '#FFD700', image: eidFitrIcon },
  { key: 'eid_adha', nameAr: 'عيد الأضحى', nameEn: 'Eid Adha', color: '#CD853F', image: eidAdhaIcon },
  { key: 'dhul_hijjah', nameAr: 'العشر من ذي الحجة', nameEn: 'Dhul Hijjah', color: '#DAA520', image: dhulHijjahIcon },
];

const SEASONS: { key: SeasonName; nameAr: string; nameEn: string }[] = [
  { key: 'ramadan', nameAr: 'رمضان', nameEn: 'Ramadan' },
  { key: 'hajj', nameAr: 'موسم الحج', nameEn: 'Hajj season' },
  { key: 'mawlid', nameAr: 'المولد النبوي', nameEn: 'Mawlid' },
  { key: 'eid_fitr', nameAr: 'عيد الفطر', nameEn: 'Eid Fitr' },
  { key: 'eid_adha', nameAr: 'عيد الأضحى', nameEn: 'Eid Adha' },
  { key: 'dhul_hijjah', nameAr: 'العشر الأوائل من ذي الحجة', nameEn: 'Dhul Hijjah' },
  { key: 'ashura', nameAr: 'عاشوراء', nameEn: 'Ashura' },
  { key: 'muharram', nameAr: 'محرم', nameEn: 'Muharram' },
  { key: 'rajab', nameAr: 'رجب', nameEn: 'Rajab' },
  { key: 'shaban', nameAr: 'شعبان', nameEn: 'Shaban' },
];

const DEFAULT_SEASONAL_MAP: Record<SeasonName, SeasonalIconKey> = {
  ramadan: 'ramadan',
  hajj: 'hajj',
  mawlid: 'mawlid',
  eid_fitr: 'eid_fitr',
  eid_adha: 'eid_adha',
  dhul_hijjah: 'dhul_hijjah',
  ashura: 'default_ar',
  muharram: 'default_ar',
  rajab: 'default_ar',
  shaban: 'default_ar',
};

const DEFAULT_CONFIG: AppIconsConfig = {
  version: 0,
  alertEnabled: true,
  alertTitle: 'تم تحديث أيقونة التطبيق',
  alertMessage: 'تم تحديث أيقونة التطبيق بنجاح! استمتع بالتصميم الجديد',
  alertTitleEn: 'App Icon Updated',
  alertMessageEn: 'The app icon has been updated! Enjoy the new design',
  alertTitleI18n: {
    ar: 'تم تحديث أيقونة التطبيق',
    en: 'App Icon Updated',
  },
  alertMessageI18n: {
    ar: 'تم تحديث أيقونة التطبيق بنجاح! استمتع بالتصميم الجديد',
    en: 'The app icon has been updated! Enjoy the new design',
  },
  mode: 'auto',
  manualIcon: null,
  seasonalMap: { ...DEFAULT_SEASONAL_MAP },
  enabledSeasons: ['ramadan', 'hajj', 'mawlid', 'eid_fitr', 'eid_adha', 'dhul_hijjah'],
  updatedAt: '',
};

const FIRESTORE_DOC = 'appConfig/appIcons';

// ─── Component ───────────────────────────────────────────

export default function AppIconManager() {
  const [config, setConfig] = useState<AppIconsConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeLang, setActiveLang] = useState<LangCode>('ar');

  // ─── Load ────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, FIRESTORE_DOC));
        if (snap.exists()) {
          const data = snap.data() as Partial<AppIconsConfig>;
          setConfig({
            ...DEFAULT_CONFIG,
            ...data,
            seasonalMap: { ...DEFAULT_SEASONAL_MAP, ...(data.seasonalMap ?? {}) },
            alertTitleI18n: { ...DEFAULT_CONFIG.alertTitleI18n, ...(data.alertTitleI18n ?? {}) },
            alertMessageI18n: { ...DEFAULT_CONFIG.alertMessageI18n, ...(data.alertMessageI18n ?? {}) },
          });
        }
      } catch (err) {
        console.error('Error loading app icons config:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ─── Save ────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const updated: AppIconsConfig = {
        ...config,
        // keep legacy fields in sync with the i18n maps so older app versions still work
        alertTitle: config.alertTitleI18n.ar || config.alertTitle,
        alertMessage: config.alertMessageI18n.ar || config.alertMessage,
        alertTitleEn: config.alertTitleI18n.en || config.alertTitleEn,
        alertMessageEn: config.alertMessageI18n.en || config.alertMessageEn,
        version: (config.version || 0) + 1,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, FIRESTORE_DOC), updated);
      setConfig(updated);
      setSaveMessage({ type: 'success', text: 'تم الحفظ بنجاح' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error('Error saving app icons config:', err);
      setSaveMessage({ type: 'error', text: `حدث خطأ: ${(err as Error).message}` });
    } finally {
      setSaving(false);
    }
  };

  // ─── Helpers ─────────────────────────────────────────

  const iconByKey = useMemo(() => {
    const m: Record<string, (typeof ICONS)[number]> = {};
    for (const i of ICONS) m[i.key] = i;
    return m;
  }, []);

  const previewIcon: SeasonalIconKey =
    config.mode === 'manual' && config.manualIcon
      ? config.manualIcon
      : config.mode === 'language_only'
      ? 'default_ar'
      : 'default_ar';

  // ─── Loading state ───────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-accent/20 rounded-xl">
            <ImageIcon className="w-6 h-6 text-accent-light" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">إدارة أيقونات التطبيق</h1>
            <p className="text-sm text-admin-muted mt-0.5">
              تبديل أيقونة التطبيق حسب الموسم تلقائياً أو يدوياً — بدون تحديث المتجر
            </p>
          </div>
        </div>
        <span className="bg-accent/20 text-accent-light px-3 py-1 rounded-full text-sm">
          الإصدار: {config.version}
        </span>
      </div>

      {/* Info box */}
      <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-300 leading-relaxed space-y-1">
          <p>
            الأيقونات الموسمية مُجمَّعة مسبقاً داخل التطبيق. عند الحفظ يتم زيادة رقم الإصدار
            ويُعرض تنبيه للمستخدمين عند فتح التطبيق إذا كان التنبيه مفعلاً.
          </p>
          <p className="text-xs opacity-80">
            ⚠️ إضافة أيقونة جديدة كلياً يتطلب رفع نسخة جديدة على المتجر. هنا تتحكم فقط في التبديل
            بين الأيقونات الموجودة بالفعل.
          </p>
        </div>
      </div>

      {/* Mode selector */}
      <div className="bg-admin-surface rounded-2xl p-6 border border-admin-border space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent-light" />
          <h2 className="text-lg font-bold text-white">وضع التشغيل</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(
            [
              { value: 'auto', titleAr: 'تلقائي حسب الموسم', descAr: 'تتبدل الأيقونة تلقائياً عند بداية كل موسم' },
              { value: 'manual', titleAr: 'يدوي', descAr: 'اختر الأيقونة بنفسك' },
              { value: 'language_only', titleAr: 'حسب اللغة فقط', descAr: 'بدون أيقونات موسمية' },
            ] as { value: IconMode; titleAr: string; descAr: string }[]
          ).map((opt) => {
            const active = config.mode === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setConfig((p) => ({ ...p, mode: opt.value }))}
                className={`text-right p-4 rounded-xl border transition-all ${
                  active
                    ? 'border-accent bg-accent/10'
                    : 'border-admin-border bg-admin-bg hover:border-admin-muted'
                }`}
              >
                <div className={`font-semibold mb-1 ${active ? 'text-accent-light' : 'text-white'}`}>
                  {opt.titleAr}
                </div>
                <div className="text-xs text-admin-muted">{opt.descAr}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Manual mode: icon picker */}
      {config.mode === 'manual' && (
        <div className="bg-admin-surface rounded-2xl p-6 border border-admin-border space-y-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-accent-light" />
            <h2 className="text-lg font-bold text-white">اختر أيقونة</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {ICONS.map((ic) => {
              const active = config.manualIcon === ic.key;
              return (
                <button
                  key={ic.key}
                  type="button"
                  onClick={() => setConfig((p) => ({ ...p, manualIcon: ic.key }))}
                  className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${
                    active
                      ? 'border-accent bg-accent/10 ring-2 ring-accent/30'
                      : 'border-admin-border bg-admin-bg hover:border-admin-muted'
                  }`}
                >
                  <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg bg-admin-surface-light">
                    <img
                      src={ic.image}
                      alt={ic.nameAr}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className={`text-sm font-medium text-center ${active ? 'text-accent-light' : 'text-white'}`}>
                    {ic.nameAr}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Auto mode: seasonal map */}
      {config.mode === 'auto' && (
        <div className="bg-admin-surface rounded-2xl p-6 border border-admin-border space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-accent-light" />
            <h2 className="text-lg font-bold text-white">ربط المواسم بالأيقونات</h2>
          </div>

          <div className="space-y-2">
            {SEASONS.map((s) => {
              const enabled = config.enabledSeasons.includes(s.key);
              const mapped = config.seasonalMap[s.key] ?? DEFAULT_SEASONAL_MAP[s.key];
              return (
                <div
                  key={s.key}
                  className="flex items-center gap-3 p-3 bg-admin-bg rounded-xl border border-admin-border"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setConfig((p) => ({
                        ...p,
                        enabledSeasons: enabled
                          ? p.enabledSeasons.filter((x) => x !== s.key)
                          : [...p.enabledSeasons, s.key],
                      }));
                    }}
                    title={enabled ? 'تعطيل هذا الموسم' : 'تفعيل هذا الموسم'}
                    aria-label={enabled ? 'تعطيل هذا الموسم' : 'تفعيل هذا الموسم'}
                    className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
                      enabled ? 'bg-accent' : 'bg-admin-surface-light'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${
                        enabled ? 'right-0.5' : 'left-0.5'
                      }`}
                    />
                  </button>

                  <div className="flex-1 text-white text-sm font-medium">{s.nameAr}</div>

                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-admin-surface-light border border-admin-border flex-shrink-0">
                    {iconByKey[mapped]?.image && (
                      <img
                        src={iconByKey[mapped].image}
                        alt={iconByKey[mapped].nameAr}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                  </div>

                  <select
                    value={mapped}
                    onChange={(e) =>
                      setConfig((p) => ({
                        ...p,
                        seasonalMap: { ...p.seasonalMap, [s.key]: e.target.value as SeasonalIconKey },
                      }))
                    }
                    disabled={!enabled}
                    aria-label={`أيقونة موسم ${s.nameAr}`}
                    className="bg-admin-surface border border-admin-border rounded-lg px-3 py-2 text-white text-sm disabled:opacity-50"
                  >
                    {ICONS.map((ic) => (
                      <option key={ic.key} value={ic.key}>
                        {ic.nameAr}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Alert configuration */}
      <div className="bg-admin-surface rounded-2xl p-6 border border-admin-border space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {config.alertEnabled ? (
              <Bell className="w-5 h-5 text-accent-light" />
            ) : (
              <BellOff className="w-5 h-5 text-admin-muted" />
            )}
            <h2 className="text-lg font-bold text-white">تفعيل التنبيه عند تغيير الأيقونة</h2>
          </div>
          <button
            type="button"
            onClick={() => setConfig((p) => ({ ...p, alertEnabled: !p.alertEnabled }))}
            title={config.alertEnabled ? 'تعطيل التنبيه' : 'تفعيل التنبيه'}
            aria-label={config.alertEnabled ? 'تعطيل التنبيه' : 'تفعيل التنبيه'}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              config.alertEnabled ? 'bg-accent' : 'bg-admin-surface-light'
            }`}
          >
            <div
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                config.alertEnabled ? 'right-1' : 'left-1'
              }`}
            />
          </button>
        </div>

        {config.alertEnabled && (
          <div className="space-y-4 pt-2">
            {/* Language tabs */}
            <div className="flex items-center gap-2 mb-2">
              <Languages className="w-4 h-4 text-admin-muted" />
              <span className="text-xs text-admin-muted">حرّر النص لكل لغة:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((l) => {
                const active = activeLang === l.code;
                const filled = !!(config.alertTitleI18n[l.code] && config.alertMessageI18n[l.code]);
                return (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setActiveLang(l.code)}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                      active
                        ? 'bg-accent text-white'
                        : filled
                        ? 'bg-accent/15 text-accent-light hover:bg-accent/25'
                        : 'bg-admin-bg text-admin-muted hover:text-white'
                    }`}
                  >
                    {l.nameAr} {filled && !active ? '✓' : ''}
                  </button>
                );
              })}
            </div>

            {/* Active language inputs */}
            {(() => {
              const lang = LANGUAGES.find((x) => x.code === activeLang)!;
              const titleVal = config.alertTitleI18n[lang.code] ?? '';
              const msgVal = config.alertMessageI18n[lang.code] ?? '';
              const dir = lang.rtl ? 'rtl' : 'ltr';
              return (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-admin-muted block mb-1.5">
                      عنوان التنبيه ({lang.nameAr})
                    </label>
                    <input
                      type="text"
                      value={titleVal}
                      onChange={(e) =>
                        setConfig((p) => ({
                          ...p,
                          alertTitleI18n: { ...p.alertTitleI18n, [lang.code]: e.target.value },
                        }))
                      }
                      dir={dir}
                      className="bg-admin-bg border border-admin-border rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none w-full"
                      placeholder={`Title in ${lang.nameEn}`}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-admin-muted block mb-1.5">
                      نص التنبيه ({lang.nameAr})
                    </label>
                    <textarea
                      value={msgVal}
                      onChange={(e) =>
                        setConfig((p) => ({
                          ...p,
                          alertMessageI18n: { ...p.alertMessageI18n, [lang.code]: e.target.value },
                        }))
                      }
                      dir={dir}
                      rows={2}
                      className="bg-admin-bg border border-admin-border rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none w-full resize-none"
                      placeholder={`Message in ${lang.nameEn}`}
                    />
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="bg-admin-surface rounded-2xl p-6 border border-admin-border">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-medium text-admin-muted mb-1">معاينة الأيقونة الحالية</h3>
            <div className="text-white font-semibold">
              {iconByKey[previewIcon]?.nameAr ?? 'الافتراضية'}
            </div>
            <div className="text-xs text-admin-muted mt-1">
              {config.mode === 'auto' && 'سيتم اختيار الأيقونة تلقائياً عند بداية كل موسم'}
              {config.mode === 'manual' && 'الأيقونة الحالية ثابتة (وضع يدوي)'}
              {config.mode === 'language_only' && 'يتم التبديل بين العربي والإنجليزي حسب لغة المستخدم'}
            </div>
          </div>
          <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-xl flex-shrink-0 bg-admin-surface-light border border-admin-border">
            {iconByKey[previewIcon]?.image && (
              <img
                src={iconByKey[previewIcon].image}
                alt={iconByKey[previewIcon].nameAr}
                className="w-full h-full object-cover"
              />
            )}
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-accent hover:bg-accent/80 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'جاري الحفظ...' : 'حفظ'}
        </button>

        {saveMessage && (
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm ${
              saveMessage.type === 'success'
                ? 'bg-accent/20 text-accent-light'
                : 'bg-red-500/20 text-red-400'
            }`}
          >
            {saveMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            {saveMessage.text}
          </div>
        )}
      </div>
    </div>
  );
}
