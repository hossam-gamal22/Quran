import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, AlertTriangle, Smartphone, ExternalLink, Mail, Bell } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { sendUpdatePushNotification } from '../services/pushNotifications';

// ========================================
// الواجهة — الحقول المستخدمة فعلاً من التطبيق
// ========================================

interface AppSettings {
  maintenanceMode: boolean;
  forceUpdate: boolean;
  minSupportedVersion: string;
  storeUrlIos: string;
  storeUrlAndroid: string;
  contactInfo: {
    email: string;
    website: string;
  };
  shareModal: {
    enabled: boolean;
    titleAr: string;
    descriptionAr: string;
    shareMessageAr: string;
    shareUrlFallback: string;
    shareUrlIos: string;
    shareUrlAndroid: string;
  };
}

const DEFAULT_SETTINGS: AppSettings = {
  maintenanceMode: false,
  forceUpdate: false,
  minSupportedVersion: '1.0.0',
  storeUrlIos: '',
  storeUrlAndroid: '',
  contactInfo: {
    email: 'hossamgamal290@gmail.com',
    website: 'https://roohmuslim.com',
  },
  shareModal: {
    enabled: true,
    titleAr: 'انشر الخير مع روح المسلم',
    descriptionAr: 'كل من شارك هذا التطبيق كان له مثل أجر من انتفع به — اجعله صدقة جارية تعود عليك وعلى من تحب',
    shareMessageAr: 'حمّل تطبيق روح المسلم — صلوات، أذكار، قرآن وأوقات الصلاة',
    shareUrlFallback: 'https://roohmuslim.app',
    shareUrlIos: '',
    shareUrlAndroid: '',
  },
};

// ========================================
// المكون الرئيسي
// ========================================

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [sendingUpdate, setSendingUpdate] = useState(false);
  const [updateSendResult, setUpdateSendResult] = useState<{ success: boolean; count: number } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const snap = await getDoc(doc(db, 'config', 'app-settings'));
      if (snap.exists()) {
        const data = snap.data();
        setSettings(prev => ({
          maintenanceMode: data.maintenanceMode ?? prev.maintenanceMode,
          forceUpdate: data.forceUpdate ?? prev.forceUpdate,
          minSupportedVersion: data.minSupportedVersion ?? prev.minSupportedVersion,
          storeUrlIos: data.storeUrlIos ?? prev.storeUrlIos,
          storeUrlAndroid: data.storeUrlAndroid ?? prev.storeUrlAndroid,
          contactInfo: {
            email: data.contactInfo?.email ?? data.contact?.email ?? prev.contactInfo.email,
            website: data.contactInfo?.website ?? data.contact?.website ?? prev.contactInfo.website,
          },
          shareModal: {
            enabled: data.shareModal?.enabled ?? prev.shareModal.enabled,
            titleAr: data.shareModal?.titleAr ?? prev.shareModal.titleAr,
            descriptionAr: data.shareModal?.descriptionAr ?? prev.shareModal.descriptionAr,
            shareMessageAr: data.shareModal?.shareMessageAr ?? prev.shareModal.shareMessageAr,
            shareUrlFallback: data.shareModal?.shareUrlFallback ?? prev.shareModal.shareUrlFallback,
            shareUrlIos: data.shareModal?.shareUrlIos ?? prev.shareModal.shareUrlIos,
            shareUrlAndroid: data.shareModal?.shareUrlAndroid ?? prev.shareModal.shareUrlAndroid,
          },
        }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'config', 'app-settings'), {
        maintenanceMode: settings.maintenanceMode,
        forceUpdate: settings.forceUpdate,
        minSupportedVersion: settings.minSupportedVersion,
        storeUrlIos: settings.storeUrlIos,
        storeUrlAndroid: settings.storeUrlAndroid,
        contact: {
          email: settings.contactInfo.email,
          website: settings.contactInfo.website,
        },
        shareModal: {
          enabled: settings.shareModal.enabled,
          titleAr: settings.shareModal.titleAr,
          descriptionAr: settings.shareModal.descriptionAr,
          shareMessageAr: settings.shareModal.shareMessageAr,
          shareUrlFallback: settings.shareModal.shareUrlFallback,
          shareUrlIos: settings.shareModal.shareUrlIos,
          shareUrlAndroid: settings.shareModal.shareUrlAndroid,
        },
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
    setIsSaving(false);
  };

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">إعدادات التطبيق</h1>
          <p className="text-gray-400 mt-1">إعدادات التحكم الأساسية</p>
        </div>
        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-colors ${
            hasChanges
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-gray-700 cursor-not-allowed'
          }`}
        >
          {isSaving ? (
            <>
              <RefreshCw size={18} className="animate-spin" />
              <span>جاري الحفظ...</span>
            </>
          ) : (
            <>
              <Save size={18} />
              <span>حفظ التغييرات</span>
            </>
          )}
        </button>
      </div>

      <div className="space-y-6 max-w-3xl">
        {/* وضع الصيانة */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <AlertTriangle size={20} className="text-yellow-500" />
              وضع الصيانة
            </h2>
            <button
              onClick={() => updateSetting('maintenanceMode', !settings.maintenanceMode)}
              title="تفعيل/تعطيل وضع الصيانة"
              aria-label="تفعيل/تعطيل وضع الصيانة"
              className={`relative w-14 h-7 rounded-full transition-colors ${
                settings.maintenanceMode ? 'bg-yellow-500' : 'bg-gray-600'
              }`}
            >
              <div
                className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${
                  settings.maintenanceMode ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>
          {settings.maintenanceMode && (
            <p className="text-yellow-400/80 text-sm mt-3">
              التطبيق سيعرض شاشة صيانة لجميع المستخدمين
            </p>
          )}
        </div>

        {/* إجبار التحديث */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Smartphone size={20} className="text-blue-500" />
              إجبار التحديث
            </h2>
            <button
              onClick={() => updateSetting('forceUpdate', !settings.forceUpdate)}
              title="تفعيل/تعطيل إجبار التحديث"
              aria-label="تفعيل/تعطيل إجبار التحديث"
              className={`relative w-14 h-7 rounded-full transition-colors ${
                settings.forceUpdate ? 'bg-red-500' : 'bg-gray-600'
              }`}
            >
              <div
                className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${
                  settings.forceUpdate ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">أقل إصدار مدعوم</label>
            <input
              type="text"
              value={settings.minSupportedVersion}
              onChange={e => updateSetting('minSupportedVersion', e.target.value)}
              className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
              dir="ltr"
              placeholder="1.0.0"
              aria-label="أقل إصدار مدعوم"
            />
          </div>
        </div>

        {/* روابط المتاجر */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <ExternalLink size={20} className="text-green-500" />
            روابط المتاجر
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">رابط App Store (iOS)</label>
              <input
                type="url"
                value={settings.storeUrlIos}
                onChange={e => updateSetting('storeUrlIos', e.target.value)}
                className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                dir="ltr"
                placeholder="https://apps.apple.com/..."
                aria-label="رابط App Store"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">رابط Google Play (Android)</label>
              <input
                type="url"
                value={settings.storeUrlAndroid}
                onChange={e => updateSetting('storeUrlAndroid', e.target.value)}
                className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                dir="ltr"
                placeholder="https://play.google.com/store/apps/..."
                aria-label="رابط Google Play"
              />
            </div>
          </div>

          {/* Send Update Push Notification */}
          <div className="mt-5 pt-4 border-t border-gray-700">
            <div className="flex items-center gap-3">
              <button
                onClick={async () => {
                  if (!settings.storeUrlIos && !settings.storeUrlAndroid) {
                    alert('يرجى إضافة رابط المتجر (App Store أو Google Play) أولاً');
                    return;
                  }
                  if (!confirm('إرسال إشعار تحديث لجميع المستخدمين؟')) return;
                  setSendingUpdate(true);
                  setUpdateSendResult(null);
                  try {
                    const result = await sendUpdatePushNotification(
                      settings.storeUrlIos,
                      settings.storeUrlAndroid,
                    );
                    setUpdateSendResult({ success: result.success, count: result.sentCount });
                  } catch {
                    setUpdateSendResult({ success: false, count: 0 });
                  } finally {
                    setSendingUpdate(false);
                  }
                }}
                disabled={sendingUpdate}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
              >
                <Bell size={16} />
                {sendingUpdate ? 'جاري الإرسال...' : 'إرسال إشعار التحديث'}
              </button>
              {updateSendResult && (
                <span className={`text-sm ${updateSendResult.success ? 'text-green-400' : 'text-red-400'}`}>
                  {updateSendResult.success
                    ? `تم الإرسال بنجاح (${updateSendResult.count} مستخدم)`
                    : 'فشل الإرسال'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* بيانات التواصل */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Mail size={20} className="text-blue-500" />
            بيانات التواصل
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">البريد الإلكتروني</label>
              <input
                type="email"
                value={settings.contactInfo.email}
                onChange={e => updateSetting('contactInfo', { ...settings.contactInfo, email: e.target.value })}
                className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                dir="ltr"
                placeholder="example@email.com"
                aria-label="البريد الإلكتروني"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">الموقع الإلكتروني</label>
              <input
                type="url"
                value={settings.contactInfo.website}
                onChange={e => updateSetting('contactInfo', { ...settings.contactInfo, website: e.target.value })}
                className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                dir="ltr"
                placeholder="https://example.com"
                aria-label="الموقع الإلكتروني"
              />
            </div>
          </div>
        </div>

        {/* إعدادات مودال مشاركة التطبيق */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <ExternalLink size={20} className="text-green-500" />
              مودال مشاركة التطبيق
            </h2>
            <button
              onClick={() => updateSetting('shareModal', { ...settings.shareModal, enabled: !settings.shareModal.enabled })}
              title="تفعيل/تعطيل مودال المشاركة"
              aria-label="تفعيل/تعطيل مودال المشاركة"
              className={`relative w-14 h-7 rounded-full transition-colors ${
                settings.shareModal.enabled ? 'bg-green-500' : 'bg-gray-600'
              }`}
            >
              <div
                className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${
                  settings.shareModal.enabled ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">عنوان المودال</label>
              <input
                type="text"
                value={settings.shareModal.titleAr}
                onChange={e => updateSetting('shareModal', { ...settings.shareModal, titleAr: e.target.value })}
                className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                dir="rtl"
                placeholder="انشر الخير مع روح المسلم"
                aria-label="عنوان المودال"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">نص الوصف</label>
              <textarea
                value={settings.shareModal.descriptionAr}
                onChange={e => updateSetting('shareModal', { ...settings.shareModal, descriptionAr: e.target.value })}
                className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none resize-none"
                dir="rtl"
                rows={3}
                placeholder="كل من شارك هذا التطبيق..."
                aria-label="نص الوصف"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">رسالة المشاركة</label>
              <textarea
                value={settings.shareModal.shareMessageAr}
                onChange={e => updateSetting('shareModal', { ...settings.shareModal, shareMessageAr: e.target.value })}
                className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none resize-none"
                dir="rtl"
                rows={2}
                placeholder="حمّل تطبيق روح المسلم — صلوات، أذكار، قرآن وأوقات الصلاة"
                aria-label="رسالة المشاركة"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">رابط احتياطي (قبل نشر التطبيق على App Store)</label>
              <input
                type="url"
                value={settings.shareModal.shareUrlFallback}
                onChange={e => updateSetting('shareModal', { ...settings.shareModal, shareUrlFallback: e.target.value })}
                className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                dir="ltr"
                placeholder="https://roohmuslim.app"
                aria-label="رابط احتياطي"
              />
              <p className="text-gray-500 text-xs mt-1">يُستخدم هذا الرابط لما يكون رابط App Store وGoogle Play فاضيين</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">رابط App Store (iOS)</label>
              <input
                type="url"
                value={settings.shareModal.shareUrlIos}
                onChange={e => updateSetting('shareModal', { ...settings.shareModal, shareUrlIos: e.target.value })}
                className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                dir="ltr"
                placeholder="https://apps.apple.com/app/..."
                aria-label="رابط App Store"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">رابط Google Play (Android)</label>
              <input
                type="url"
                value={settings.shareModal.shareUrlAndroid}
                onChange={e => updateSetting('shareModal', { ...settings.shareModal, shareUrlAndroid: e.target.value })}
                className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                dir="ltr"
                placeholder="https://play.google.com/store/apps/details?id=..."
                aria-label="رابط Google Play"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
