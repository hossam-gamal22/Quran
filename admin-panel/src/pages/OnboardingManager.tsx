import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  Smartphone, Save, Plus, Trash2, GripVertical,
  ChevronUp, ChevronDown, RefreshCw,
} from 'lucide-react';
import { Styled } from '../components/Styled';

interface OnboardingFeature {
  icon: string;
  label: string;
  color: string;
}

interface OnboardingConfig {
  appName: string;
  tagline: string;
  description: string;
  features: OnboardingFeature[];
  screens: string[];
  updatedAt: string;
}

const DEFAULT_CONFIG: OnboardingConfig = {
  appName: 'روح المسلم',
  tagline: 'رفيقك في رحلة الإيمان',
  description: 'تطبيق شامل للأذكار والقرآن الكريم وأوقات الصلاة',
  features: [
    { icon: 'book-open-variant', label: 'القرآن الكريم', color: '#3a7ca5' },
    { icon: 'hands-pray', label: 'الأذكار والأدعية', color: '#2f7659' },
    { icon: 'mosque', label: 'أوقات الصلاة', color: '#c17f59' },
    { icon: 'compass', label: 'اتجاه القبلة', color: '#5d4e8c' },
  ],
  screens: ['welcome', 'language', 'location', 'notifications', 'complete'],
  updatedAt: '',
};

const ICON_OPTIONS = [
  'book-open-variant', 'hands-pray', 'mosque', 'compass',
  'star', 'heart', 'bell', 'counter', 'calendar',
  'account-group', 'shield-check', 'volume-high',
  'weather-night', 'map-marker', 'translate',
  'cellphone', 'cloud-download', 'chart-bar',
];

function OnboardingManager() {
  const [config, setConfig] = useState<OnboardingConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const snap = await getDoc(doc(db, 'appConfig', 'onboarding'));
        if (snap.exists()) {
          setConfig({ ...DEFAULT_CONFIG, ...snap.data() } as OnboardingConfig);
        }
      } catch (err) {
        console.error('Failed to load onboarding config:', err);
      }
      setIsLoading(false);
    };
    init();
  }, []);

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      const updated = { ...config, updatedAt: new Date().toISOString() };
      await setDoc(doc(db, 'appConfig', 'onboarding'), updated);
      setConfig(updated);
      alert('تم الحفظ بنجاح');
    } catch (err) {
      console.error('Failed to save:', err);
      alert('فشل الحفظ');
    }
    setIsSaving(false);
  };

  const addFeature = () => {
    setConfig({
      ...config,
      features: [...config.features, { icon: 'star', label: '', color: '#22C55E' }],
    });
  };

  const removeFeature = (idx: number) => {
    setConfig({
      ...config,
      features: config.features.filter((_, i) => i !== idx),
    });
  };

  const updateFeature = (idx: number, field: keyof OnboardingFeature, value: string) => {
    const features = [...config.features];
    features[idx] = { ...features[idx], [field]: value };
    setConfig({ ...config, features });
  };

  const moveFeature = (idx: number, direction: 'up' | 'down') => {
    const features = [...config.features];
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= features.length) return;
    [features[idx], features[newIdx]] = [features[newIdx], features[idx]];
    setConfig({ ...config, features });
  };

  const resetToDefault = () => {
    if (!confirm('إعادة تعيين للإعدادات الافتراضية؟')) return;
    setConfig(DEFAULT_CONFIG);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Smartphone className="w-6 h-6 text-emerald-400" />
          <h1 className="text-2xl font-bold text-white">مدير شاشات التأهيل</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={resetToDefault} className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600">
            <RefreshCw className="w-4 h-4" /> إعادة تعيين
          </button>
          <button onClick={saveConfig} disabled={isSaving} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50">
            <Save className="w-4 h-4" /> {isSaving ? 'جاري...' : 'حفظ'}
          </button>
        </div>
      </div>

      {/* App Info */}
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 space-y-4">
        <h2 className="text-white font-semibold text-lg">معلومات التطبيق</h2>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="text-slate-400 text-sm block mb-1">اسم التطبيق</label>
            <input className="w-full bg-slate-900 text-white rounded-lg px-4 py-2 border border-slate-700" value={config.appName} onChange={e => setConfig({ ...config, appName: e.target.value })} dir="rtl" title="اسم التطبيق" placeholder="اسم التطبيق" aria-label="اسم التطبيق" />
          </div>
          <div>
            <label className="text-slate-400 text-sm block mb-1">الشعار (Tagline)</label>
            <input className="w-full bg-slate-900 text-white rounded-lg px-4 py-2 border border-slate-700" value={config.tagline} onChange={e => setConfig({ ...config, tagline: e.target.value })} dir="rtl" title="الشعار" placeholder="الشعار" aria-label="الشعار" />
          </div>
          <div>
            <label className="text-slate-400 text-sm block mb-1">الوصف</label>
            <textarea className="w-full bg-slate-900 text-white rounded-lg px-4 py-2 border border-slate-700" rows={2} title="وصف التطبيق" value={config.description} onChange={e => setConfig({ ...config, description: e.target.value })} dir="rtl" aria-label="وصف التطبيق" placeholder="وصف التطبيق" />
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold text-lg">المميزات ({config.features.length})</h2>
          <button onClick={addFeature} className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 text-sm">
            <Plus className="w-3.5 h-3.5" /> إضافة ميزة
          </button>
        </div>

        <div className="space-y-3">
          {config.features.map((feature, idx) => (
            <div key={idx} className="bg-slate-900/50 rounded-xl border border-slate-700 p-4">
              <div className="flex items-center gap-3">
                <GripVertical className="w-4 h-4 text-slate-600" />
                <Styled className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg" css={{ backgroundColor: feature.color }}>
                  ✦
                </Styled>
                <div className="flex-1 grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-slate-500 text-xs block mb-1">الأيقونة</label>
                    <select className="w-full bg-slate-800 text-white rounded-lg px-2 py-1.5 border border-slate-700 text-sm" title="الأيقونة" aria-label="الأيقونة" value={feature.icon} onChange={e => updateFeature(idx, 'icon', e.target.value)}>
                      {ICON_OPTIONS.map(icon => (
                        <option key={icon} value={icon}>{icon}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-500 text-xs block mb-1">النص</label>
                    <input className="w-full bg-slate-800 text-white rounded-lg px-2 py-1.5 border border-slate-700 text-sm" value={feature.label} onChange={e => updateFeature(idx, 'label', e.target.value)} dir="rtl" title="نص الميزة" placeholder="نص الميزة" aria-label="نص الميزة" />
                  </div>
                  <div>
                    <label className="text-slate-500 text-xs block mb-1">اللون</label>
                    <div className="flex items-center gap-2">
                      <input type="color" className="w-8 h-8 rounded cursor-pointer border-0" title="اختيار اللون" aria-label="اختيار اللون" value={feature.color} onChange={e => updateFeature(idx, 'color', e.target.value)} />
                      <input className="flex-1 bg-slate-800 text-white rounded-lg px-2 py-1.5 border border-slate-700 text-sm font-mono" value={feature.color} onChange={e => updateFeature(idx, 'color', e.target.value)} dir="ltr" title="كود اللون" placeholder="#000000" aria-label="كود اللون" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => moveFeature(idx, 'up')} disabled={idx === 0} className="p-1 text-slate-400 hover:text-white disabled:opacity-30" title="لأعلى" aria-label="تحريك لأعلى"><ChevronUp className="w-4 h-4" /></button>
                  <button onClick={() => moveFeature(idx, 'down')} disabled={idx === config.features.length - 1} className="p-1 text-slate-400 hover:text-white disabled:opacity-30" title="لأسفل" aria-label="تحريك لأسفل"><ChevronDown className="w-4 h-4" /></button>
                  <button onClick={() => removeFeature(idx)} className="p-1 text-red-400 hover:text-red-300" title="حذف" aria-label="حذف الميزة"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Screens Order */}
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 space-y-4">
        <h2 className="text-white font-semibold text-lg">ترتيب الشاشات</h2>
        <div className="space-y-2">
          {config.screens.map((screen, idx) => (
            <div key={screen} className="flex items-center gap-3 bg-slate-900/50 rounded-lg px-4 py-2.5 border border-slate-700">
              <GripVertical className="w-4 h-4 text-slate-600" />
              <span className="text-emerald-400 font-mono text-sm w-6">{idx + 1}</span>
              <span className="text-white flex-1">{screen}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => { const s = [...config.screens]; if (idx > 0) { [s[idx], s[idx - 1]] = [s[idx - 1], s[idx]]; setConfig({ ...config, screens: s }); } }} disabled={idx === 0} className="p-1 text-slate-400 hover:text-white disabled:opacity-30" title="لأعلى" aria-label="تحريك الشاشة لأعلى"><ChevronUp className="w-4 h-4" /></button>
                <button onClick={() => { const s = [...config.screens]; if (idx < s.length - 1) { [s[idx], s[idx + 1]] = [s[idx + 1], s[idx]]; setConfig({ ...config, screens: s }); } }} disabled={idx === config.screens.length - 1} className="p-1 text-slate-400 hover:text-white disabled:opacity-30" title="لأسفل" aria-label="تحريك الشاشة لأسفل"><ChevronDown className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
        <h2 className="text-white font-semibold text-lg mb-4">معاينة شاشة الترحيب</h2>
        <div className="max-w-sm mx-auto bg-gradient-to-b from-slate-900 to-slate-800 rounded-3xl p-8 border border-slate-600 text-center space-y-6">
          <div className="text-4xl">☪</div>
          <div>
            <h3 className="text-2xl font-bold text-white">{config.appName}</h3>
            <p className="text-emerald-400 mt-1">{config.tagline}</p>
            <p className="text-slate-400 text-sm mt-2">{config.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {config.features.map((f, i) => (
              <Styled key={i} className="rounded-xl p-3 text-white text-sm font-medium" css={{ backgroundColor: f.color + '33', borderColor: f.color, borderWidth: 1 }}>
                {f.label}
              </Styled>
            ))}
          </div>
          <div className="pt-2">
            <div className="bg-emerald-600 text-white rounded-xl py-3 font-semibold">هيا نبدأ ✨</div>
          </div>
        </div>
      </div>

      {config.updatedAt && (
        <p className="text-slate-500 text-xs text-center">
          آخر تحديث: {new Date(config.updatedAt).toLocaleString('ar-EG')}
        </p>
      )}
    </div>
  );
}

export default OnboardingManager;
