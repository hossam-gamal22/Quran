// admin-panel/src/pages/FeatureGating.tsx
// صفحة إدارة بوابة الميزات — تحديد أي ميزة للبريميوم فقط

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Shield, Save, Loader2, ToggleLeft, ToggleRight } from 'lucide-react';

interface FeatureGateEntry {
  premiumOnly: boolean;
  label: string;
  description: string;
}

type PremiumFeatureKey =
  | 'ad_removal'
  | 'exclusive_themes'
  | 'sound_downloads'
  | 'cloud_backup'
  | 'advanced_stats'
  | 'custom_backgrounds';

type FeatureGatingConfig = Record<PremiumFeatureKey, FeatureGateEntry>;

const DEFAULT_CONFIG: FeatureGatingConfig = {
  ad_removal: {
    premiumOnly: true,
    label: 'إزالة الإعلانات',
    description: 'إزالة جميع الإعلانات من التطبيق',
  },
  exclusive_themes: {
    premiumOnly: true,
    label: 'ثيمات حصرية',
    description: 'ثيمات قراءة حصرية للمشتركين',
  },
  sound_downloads: {
    premiumOnly: true,
    label: 'تحميل الأصوات',
    description: 'تحميل الأصوات والتلاوات',
  },
  cloud_backup: {
    premiumOnly: true,
    label: 'نسخ احتياطي سحابي',
    description: 'نسخ احتياطي واسترجاع من السحابة',
  },
  advanced_stats: {
    premiumOnly: true,
    label: 'إحصائيات متقدمة',
    description: 'إحصائيات تفصيلية للعبادات',
  },
  custom_backgrounds: {
    premiumOnly: true,
    label: 'خلفيات مخصصة',
    description: 'رفع واستخدام خلفيات مخصصة',
  },
};

const FEATURE_KEYS: PremiumFeatureKey[] = [
  'ad_removal',
  'exclusive_themes',
  'sound_downloads',
  'cloud_backup',
  'advanced_stats',
  'custom_backgrounds',
];

export default function FeatureGating() {
  const [config, setConfig] = useState<FeatureGatingConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const snap = await getDoc(doc(db, 'config', 'feature-gating'));
      if (snap.exists()) {
        setConfig({ ...DEFAULT_CONFIG, ...snap.data() } as FeatureGatingConfig);
      }
    } catch (err) {
      console.error('Error loading feature gating config:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFeature = (key: PremiumFeatureKey) => {
    setConfig(prev => ({
      ...prev,
      [key]: { ...prev[key], premiumOnly: !prev[key].premiumOnly },
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'config', 'feature-gating'), config);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Error saving feature gating config:', err);
    } finally {
      setSaving(false);
    }
  };

  const premiumCount = FEATURE_KEYS.filter(k => config[k].premiumOnly).length;
  const freeCount = FEATURE_KEYS.length - premiumCount;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-100 rounded-xl">
            <Shield className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">بوابة الميزات</h1>
            <p className="text-sm text-slate-500">تحديد أي ميزة متاحة للجميع وأي ميزة للمشتركين فقط</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'جاري الحفظ...' : saved ? 'تم الحفظ ✓' : 'حفظ'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
          <div className="text-2xl font-bold text-amber-700">{premiumCount}</div>
          <div className="text-sm text-amber-600">ميزة للبريميوم فقط</div>
        </div>
        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
          <div className="text-2xl font-bold text-emerald-700">{freeCount}</div>
          <div className="text-sm text-emerald-600">ميزة متاحة للجميع</div>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="space-y-3">
        {FEATURE_KEYS.map(key => {
          const feature = config[key];
          return (
            <div
              key={key}
              className={`p-4 rounded-xl border-2 transition-all ${
                feature.premiumOnly
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-white border-emerald-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-800">{feature.label}</h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        feature.premiumOnly
                          ? 'bg-amber-200 text-amber-800'
                          : 'bg-emerald-200 text-emerald-800'
                      }`}
                    >
                      {feature.premiumOnly ? '🔒 بريميوم' : '🆓 مجاني'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{feature.description}</p>
                </div>
                <button
                  onClick={() => toggleFeature(key)}
                  className="transition-colors"
                  aria-label={feature.premiumOnly ? 'اجعلها مجانية' : 'اجعلها بريميوم'}
                  title={feature.premiumOnly ? 'اجعلها مجانية' : 'اجعلها بريميوم'}
                >
                  {feature.premiumOnly ? (
                    <ToggleRight className="w-10 h-10 text-amber-500" />
                  ) : (
                    <ToggleLeft className="w-10 h-10 text-emerald-500" />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
