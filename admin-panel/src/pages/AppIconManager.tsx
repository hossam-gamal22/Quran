// admin-panel/src/pages/AppIconManager.tsx
// إدارة أيقونات التطبيق — رفع أيقونات عربية وإنجليزية مع نظام تنبيه المستخدمين

import React, { useState, useEffect } from 'react';
import {
  Image,
  Save,
  Bell,
  BellOff,
  Loader2,
  Info,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// ─── Types ───────────────────────────────────────────────

interface AppIconsConfig {
  version: number;
  alertEnabled: boolean;
  alertTitle: string;
  alertMessage: string;
  alertTitleEn: string;
  alertMessageEn: string;
  updatedAt: string;
}

// ─── Defaults ────────────────────────────────────────────

const DEFAULT_CONFIG: AppIconsConfig = {
  version: 0,
  alertEnabled: true,
  alertTitle: 'تم تحديث أيقونة التطبيق',
  alertMessage: 'تم تحديث أيقونة التطبيق بنجاح! استمتع بالتصميم الجديد',
  alertTitleEn: 'App Icon Updated',
  alertMessageEn: 'The app icon has been updated! Enjoy the new design',
  updatedAt: '',
};

const FIRESTORE_DOC = 'appConfig/appIcons';

// ─── Component ───────────────────────────────────────────

export default function AppIconManager() {
  const [config, setConfig] = useState<AppIconsConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ─── Load config ─────────────────────────────────────

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const snap = await getDoc(doc(db, FIRESTORE_DOC));
      if (snap.exists()) {
        setConfig({ ...DEFAULT_CONFIG, ...snap.data() } as AppIconsConfig);
      }
    } catch (err) {
      console.error('Error loading app icons config:', err);
    } finally {
      setLoading(false);
    }
  };

  // ─── File handlers ───────────────────────────────────

  // ─── Save ────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);

    try {
      const updatedConfig = {
        ...config,
        version: (config.version || 0) + 1,
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, FIRESTORE_DOC), updatedConfig);
      setConfig(updatedConfig);

      setSaveMessage({ type: 'success', text: 'تم الحفظ بنجاح' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error('Error saving app icons config:', err);
      setSaveMessage({ type: 'error', text: `حدث خطأ: ${(err as Error).message}` });
    } finally {
      setSaving(false);
    }
  };

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
    <div className="max-w-4xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-accent/20 rounded-xl">
            <Image className="w-6 h-6 text-accent-light" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">إدارة أيقونات التطبيق</h1>
            <p className="text-sm text-admin-muted mt-0.5">رفع وإدارة أيقونات التطبيق للغات المختلفة</p>
          </div>
        </div>
        <span className="bg-accent/20 text-accent-light px-3 py-1 rounded-full text-sm">
          الإصدار: {config.version}
        </span>
      </div>

      {/* Info box */}
      <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-300 leading-relaxed">
          الأيقونات المرفوعة هي صور مرجعية. عند الحفظ سيتم زيادة رقم الإصدار وإرسال تنبيه للمستخدمين إذا كان التنبيه مفعلاً
        </p>
      </div>

      {/* Alert configuration */}
      <div className="bg-admin-surface rounded-2xl p-6 border border-admin-border space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {config.alertEnabled ? (
              <Bell className="w-5 h-5 text-accent-light" />
            ) : (
              <BellOff className="w-5 h-5 text-admin-muted" />
            )}
            <h2 className="text-lg font-bold text-white">تفعيل التنبيه</h2>
          </div>
          <button
            type="button"
            onClick={() => setConfig(prev => ({ ...prev, alertEnabled: !prev.alertEnabled }))}
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
            {/* Arabic alert */}
            <div>
              <label className="text-sm font-medium text-admin-muted block mb-1.5">
                عنوان التنبيه (عربي)
              </label>
              <input
                type="text"
                value={config.alertTitle}
                onChange={(e) => setConfig(prev => ({ ...prev, alertTitle: e.target.value }))}
                dir="rtl"
                className="bg-admin-bg border border-admin-border rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none w-full"
                placeholder="عنوان التنبيه بالعربية"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-admin-muted block mb-1.5">
                نص التنبيه (عربي)
              </label>
              <textarea
                value={config.alertMessage}
                onChange={(e) => setConfig(prev => ({ ...prev, alertMessage: e.target.value }))}
                dir="rtl"
                rows={2}
                className="bg-admin-bg border border-admin-border rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none w-full resize-none"
                placeholder="نص التنبيه بالعربية"
              />
            </div>

            {/* English alert */}
            <div>
              <label className="text-sm font-medium text-admin-muted block mb-1.5">
                Alert Title (English)
              </label>
              <input
                type="text"
                value={config.alertTitleEn}
                onChange={(e) => setConfig(prev => ({ ...prev, alertTitleEn: e.target.value }))}
                dir="ltr"
                className="bg-admin-bg border border-admin-border rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none w-full"
                placeholder="Alert title in English"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-admin-muted block mb-1.5">
                Alert Message (English)
              </label>
              <textarea
                value={config.alertMessageEn}
                onChange={(e) => setConfig(prev => ({ ...prev, alertMessageEn: e.target.value }))}
                dir="ltr"
                rows={2}
                className="bg-admin-bg border border-admin-border rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none w-full resize-none"
                placeholder="Alert message in English"
              />
            </div>
          </div>
        )}
      </div>

      {/* Save button + status */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-accent hover:bg-accent/80 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
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
