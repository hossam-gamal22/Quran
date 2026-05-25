// admin-panel/src/pages/FeatureGating.tsx
// صفحة إدارة بوابة الميزات — تحديد أي ميزة للبريميوم فقط

import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Shield, Save, Loader2, ToggleLeft, ToggleRight, Wifi, AlertCircle } from 'lucide-react';

interface FeatureGateEntry {
  premiumOnly: boolean;
}

type PremiumFeatureKey =
  | 'ad_removal'
  | 'exclusive_themes'
  | 'sound_downloads'
  | 'cloud_backup'
  | 'advanced_stats'
  | 'custom_backgrounds'
  | 'multiple_khatma'
  | 'premium_widgets'
  | 'widget_themes';

type FeatureGatingConfig = Record<PremiumFeatureKey, FeatureGateEntry>;

const DEFAULT_CONFIG: FeatureGatingConfig = {
  ad_removal: {
    premiumOnly: true,
  },
  exclusive_themes: {
    premiumOnly: true,
  },
  sound_downloads: {
    premiumOnly: true,
  },
  cloud_backup: {
    premiumOnly: true,
  },
  advanced_stats: {
    premiumOnly: true,
  },
  custom_backgrounds: {
    premiumOnly: true,
  },
  multiple_khatma: {
    premiumOnly: true,
  },
  premium_widgets: {
    premiumOnly: true,
  },
  widget_themes: {
    premiumOnly: true,
  },
};

const FEATURE_KEYS: PremiumFeatureKey[] = [
  'ad_removal',
  'exclusive_themes',
  'sound_downloads',
  'cloud_backup',
  'advanced_stats',
  'custom_backgrounds',
  'multiple_khatma',
  'premium_widgets',
  'widget_themes',
];

const FEATURE_LABELS: Record<PremiumFeatureKey, string> = {
  ad_removal: 'إزالة الإعلانات',
  exclusive_themes: 'ثيمات حصرية',
  sound_downloads: 'تحميل الأصوات',
  cloud_backup: 'نسخ احتياطي سحابي',
  advanced_stats: 'إحصائيات متقدمة',
  custom_backgrounds: 'خلفيات مخصصة',
  multiple_khatma: 'ختمات متعددة متزامنة',
  premium_widgets: 'جميع الودجات',
  widget_themes: 'ثيمات الودجات',
};

export default function FeatureGating() {
  const [config, setConfig] = useState<FeatureGatingConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'config', 'feature-gating'),
      (snap) => {
        if (snap.exists()) {
          setConfig({ ...DEFAULT_CONFIG, ...snap.data() } as FeatureGatingConfig);
        } else {
          setConfig(DEFAULT_CONFIG);
        }
        setLiveError(null);
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to feature gating config:', err);
        setLiveError('تعذر الاتصال اللحظي ببيانات بوابة المميزات');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

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
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
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
            <h1 className="text-2xl font-bold text-white">بوابة الميزات</h1>
            <p className="text-sm text-slate-400">تحديد أي ميزة متاحة للجميع وأي ميزة للمشتركين فقط</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-accent-dark text-white rounded-xl hover:bg-accent-dark disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'جاري الحفظ...' : saved ? 'تم الحفظ ✓' : 'حفظ'}
        </button>
      </div>

      <div
        className={`flex items-start gap-3 rounded-xl border p-4 mb-6 ${
          liveError
            ? 'bg-red-500/10 border-red-500/30 text-red-300'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
        }`}
      >
        {liveError ? <AlertCircle className="w-5 h-5 mt-0.5" /> : <Wifi className="w-5 h-5 mt-0.5" />}
        <div>
          <div className="font-semibold text-sm">
            {liveError ? liveError : 'متصل لحظياً بالتطبيق'}
          </div>
          <div className="text-xs opacity-80 mt-1">
            بعد الحفظ، التطبيق يقرأ نفس الوثيقة من Firestore وتُحدّث الأقفال للمستخدمين المفتوح عندهم التطبيق فوراً، وتُحفظ ككاش للمرة التالية.
          </div>
        </div>
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
                    <h3 className="font-bold text-slate-800">{FEATURE_LABELS[key]}</h3>
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
                    <ToggleLeft className="w-10 h-10 text-accent" />
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
