// admin-panel/src/pages/Settings.tsx
// إعدادات التطبيق العامة - روح المسلم

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  RefreshCw,
  Globe,
  Smartphone,
  Shield,
  Bell,
  CreditCard,
  Palette,
  Database,
  Cloud,
  AlertTriangle,
  CheckCircle,
  Info,
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  Download,
  Upload,
  Lock,
  Unlock,
  Zap,
  Server,
  Key,
  Mail,
  MessageSquare,
} from 'lucide-react';

// ========================================
// الأنواع
// ========================================

interface AppSettings {
  // معلومات التطبيق
  appName: string;
  appVersion: string;
  bundleId: string;
  
  // الحالة
  maintenanceMode: boolean;
  maintenanceMessage: string;
  adsEnabled: boolean;
  adRemovalPrice: number;
  
  // التحديثات
  forceUpdate: boolean;
  minSupportedVersion: string;
  latestVersion: string;
  updateMessage: string;
  storeUrlIos: string;
  storeUrlAndroid: string;
  
  // اللغات
  defaultLanguage: string;
  supportedLanguages: string[];
  
  // أوقات الصلاة
  defaultCalculationMethod: string;
  defaultAsrMethod: string;
  
  // الإشعارات
  fcmServerKey: string;
  apnsKeyId: string;
  
  // التخزين
  cloudBackupEnabled: boolean;
  maxBackupSize: number;
  
  // الأمان
  rateLimitEnabled: boolean;
  maxRequestsPerMinute: number;
  
  // التحليلات
  analyticsEnabled: boolean;
  crashReportingEnabled: boolean;
  
  // التواصل والمشاركة
  contactInfo: {
    email: string;
    phone: string;
    website: string;
    facebook: string;
  };
  shareLinks: {
    playStore: string;
    appStore: string;
    shareMessage: string;
  };
}

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed?: string;
  isActive: boolean;
}

// ========================================
// البيانات الافتراضية
// ========================================

const SUPPORTED_LANGUAGES = [
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ur', name: 'اردو', flag: '🇵🇰' },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'bn', name: 'বাংলা', flag: '🇧🇩' },
  { code: 'ms', name: 'Melayu', flag: '🇲🇾' },
  { code: 'fa', name: 'فارسی', flag: '🇮🇷' },
  { code: 'ps', name: 'پښتو', flag: '🇦🇫' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
];

const CALCULATION_METHODS = [
  { value: 'MWL', label: 'رابطة العالم الإسلامي' },
  { value: 'ISNA', label: 'الجمعية الإسلامية لأمريكا الشمالية' },
  { value: 'Egypt', label: 'الهيئة المصرية العامة للمساحة' },
  { value: 'Makkah', label: 'أم القرى' },
  { value: 'Karachi', label: 'جامعة العلوم الإسلامية، كراتشي' },
  { value: 'Tehran', label: 'معهد الجيوفيزياء، طهران' },
  { value: 'Jafari', label: 'المذهب الجعفري' },
];

const DEFAULT_SETTINGS: AppSettings = {
  appName: 'روح المسلم',
  appVersion: '1.0.0',
  bundleId: 'com.roohmuslim.app',
  maintenanceMode: false,
  maintenanceMessage: 'التطبيق تحت الصيانة، سنعود قريباً إن شاء الله',
  adsEnabled: true,
  adRemovalPrice: 4.99,
  forceUpdate: false,
  minSupportedVersion: '1.0.0',
  latestVersion: '1.0.0',
  updateMessage: 'يتوفر تحديث جديد، يرجى التحديث للحصول على أفضل تجربة',
  storeUrlIos: 'https://apps.apple.com/app/rooh-muslim/id123456789',
  storeUrlAndroid: 'https://play.google.com/store/apps/details?id=com.roohmuslim.app',
  defaultLanguage: 'ar',
  supportedLanguages: ['ar', 'en', 'ur', 'id', 'tr', 'fr'],
  defaultCalculationMethod: 'MWL',
  defaultAsrMethod: 'Standard',
  fcmServerKey: '',
  apnsKeyId: '',
  cloudBackupEnabled: true,
  maxBackupSize: 50,
  rateLimitEnabled: true,
  maxRequestsPerMinute: 60,
  analyticsEnabled: true,
  crashReportingEnabled: true,
  contactInfo: {
    email: 'hossamgamal290@gmail.com',
    phone: '+966 50 000 0000',
    website: 'https://roohmuslim.com',
    facebook: 'https://www.facebook.com/HossamGamal59/',
  },
  shareLinks: {
    playStore: 'https://play.google.com/store/apps/details?id=com.roohmuslim.app',
    appStore: 'https://apps.apple.com/app/rooh-muslim/id123456789',
    shareMessage: 'تحميل تطبيق روح المسلم - تطبيقك الإسلامي الشامل',
  },
};

// ========================================
// المكون الرئيسي
// ========================================

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [activeTab, setActiveTab] = useState<'general' | 'updates' | 'notifications' | 'security' | 'contact' | 'api'>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showFcmKey, setShowFcmKey] = useState(false);

  // تحميل الإعدادات
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    // TODO: API call
    await new Promise(resolve => setTimeout(resolve, 500));
    setSettings(DEFAULT_SETTINGS);
    setApiKeys([
      {
        id: '1',
        name: 'Production API Key',
        key: 'rk_live_xxxxxxxxxxxxxxxxxxxxx',
        createdAt: '2026-01-01T00:00:00Z',
        lastUsed: '2026-03-02T22:00:00Z',
        isActive: true,
      },
      {
        id: '2',
        name: 'Development API Key',
        key: 'rk_test_xxxxxxxxxxxxxxxxxxxxx',
        createdAt: '2026-01-15T00:00:00Z',
        lastUsed: '2026-03-01T10:00:00Z',
        isActive: true,
      },
    ]);
  };

  // حفظ الإعدادات
  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSaving(false);
    setHasChanges(false);
    // TODO: API call
  };

  // تحديث إعداد
  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  // تفعيل/تعطيل لغة
  const toggleLanguage = (code: string) => {
    const current = settings.supportedLanguages;
    if (current.includes(code)) {
      if (code === settings.defaultLanguage) return; // لا يمكن إزالة اللغة الافتراضية
      updateSetting('supportedLanguages', current.filter(c => c !== code));
    } else {
      updateSetting('supportedLanguages', [...current, code]);
    }
  };

  // نسخ مفتاح API
  const copyApiKey = (key: string) => {
    navigator.clipboard.writeText(key);
    // TODO: إظهار رسالة نجاح
  };

  // إنشاء مفتاح API جديد
  const createApiKey = () => {
    const newKey: ApiKey = {
      id: `key_${Date.now()}`,
      name: 'New API Key',
      key: `rk_${Math.random().toString(36).substring(2, 15)}_${Math.random().toString(36).substring(2, 15)}`,
      createdAt: new Date().toISOString(),
      isActive: true,
    };
    setApiKeys(prev => [...prev, newKey]);
  };

  // حذف مفتاح API
  const deleteApiKey = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المفتاح؟')) {
      setApiKeys(prev => prev.filter(k => k.id !== id));
    }
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">إعدادات التطبيق</h1>
          <p className="text-gray-400 mt-1">تكوين وإدارة إعدادات التطبيق</p>
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

      {/* التبويبات */}
      <div className="flex gap-2 mb-6 border-b border-gray-700 pb-4 overflow-x-auto">
        {[
          { id: 'general', label: 'عام', icon: Settings },
          { id: 'updates', label: 'التحديثات', icon: Smartphone },
          { id: 'notifications', label: 'الإشعارات', icon: Bell },
          { id: 'contact', label: 'التواصل والمشاركة', icon: MessageSquare },
          { id: 'security', label: 'الأمان', icon: Shield },
          { id: 'api', label: 'API Keys', icon: Key },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <tab.icon size={18} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* المحتوى */}
      <div className="space-y-6">
        {/* تاب عام */}
        {activeTab === 'general' && (
          <>
            {/* معلومات التطبيق */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Info size={20} className="text-blue-500" />
                معلومات التطبيق
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">اسم التطبيق</label>
                  <input
                    type="text"
                    value={settings.appName}
                    onChange={e => updateSetting('appName', e.target.value)}
                    className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">الإصدار الحالي</label>
                  <input
                    type="text"
                    value={settings.appVersion}
                    onChange={e => updateSetting('appVersion', e.target.value)}
                    className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Bundle ID</label>
                  <input
                    type="text"
                    value={settings.bundleId}
                    onChange={e => updateSetting('bundleId', e.target.value)}
                    className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            {/* وضع الصيانة */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <AlertTriangle size={20} className="text-yellow-500" />
                  وضع الصيانة
                </h2>
                <button
                  onClick={() => updateSetting('maintenanceMode', !settings.maintenanceMode)}
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
                <div>
                  <label className="block text-sm text-gray-400 mb-2">رسالة الصيانة</label>
                  <textarea
                    value={settings.maintenanceMessage}
                    onChange={e => updateSetting('maintenanceMessage', e.target.value)}
                    rows={2}
                    className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none resize-none"
                  />
                </div>
              )}
            </div>

            {/* الإعلانات */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <CreditCard size={20} className="text-green-500" />
                  الإعلانات وإزالتها
                </h2>
                <button
                  onClick={() => updateSetting('adsEnabled', !settings.adsEnabled)}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    settings.adsEnabled ? 'bg-green-500' : 'bg-gray-600'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${
                      settings.adsEnabled ? 'right-1' : 'left-1'
                    }`}
                  />
                </button>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">سعر إزالة الإعلانات ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={settings.adRemovalPrice}
                  onChange={e => updateSetting('adRemovalPrice', parseFloat(e.target.value) || 0)}
                  className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                  dir="ltr"
                />
              </div>
            </div>

            {/* اللغات */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Globe size={20} className="text-blue-500" />
                اللغات المدعومة
              </h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">اللغة الافتراضية</label>
                  <select
                    value={settings.defaultLanguage}
                    onChange={e => updateSetting('defaultLanguage', e.target.value)}
                    className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                  >
                    {SUPPORTED_LANGUAGES.filter(l => settings.supportedLanguages.includes(l.code)).map(lang => (
                      <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {SUPPORTED_LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => toggleLanguage(lang.code)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                      settings.supportedLanguages.includes(lang.code)
                        ? 'bg-green-500/20 border-green-500 text-green-500'
                        : 'bg-gray-700 border-gray-600 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                    {lang.code === settings.defaultLanguage && (
                      <span className="text-xs bg-green-500 text-white px-1 rounded">افتراضي</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* أوقات الصلاة */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Zap size={20} className="text-yellow-500" />
                إعدادات أوقات الصلاة
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">طريقة الحساب الافتراضية</label>
                  <select
                    value={settings.defaultCalculationMethod}
                    onChange={e => updateSetting('defaultCalculationMethod', e.target.value)}
                    className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                  >
                    {CALCULATION_METHODS.map(method => (
                      <option key={method.value} value={method.value}>{method.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">طريقة حساب العصر</label>
                  <select
                    value={settings.defaultAsrMethod}
                    onChange={e => updateSetting('defaultAsrMethod', e.target.value)}
                    className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                  >
                    <option value="Standard">القياسي (الشافعي، المالكي، الحنبلي)</option>
                    <option value="Hanafi">الحنفي</option>
                  </select>
                </div>
              </div>
            </div>
          </>
        )}

        {/* تاب التحديثات */}
        {activeTab === 'updates' && (
          <>
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Smartphone size={20} className="text-blue-500" />
                  إجبار التحديث
                </h2>
                <button
                  onClick={() => updateSetting('forceUpdate', !settings.forceUpdate)}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">أقل إصدار مدعوم</label>
                  <input
                    type="text"
                    value={settings.minSupportedVersion}
                    onChange={e => updateSetting('minSupportedVersion', e.target.value)}
                    className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                    dir="ltr"
                    placeholder="1.0.0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">آخر إصدار</label>
                  <input
                    type="text"
                    value={settings.latestVersion}
                    onChange={e => updateSetting('latestVersion', e.target.value)}
                    className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                    dir="ltr"
                    placeholder="1.0.0"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm text-gray-400 mb-2">رسالة التحديث</label>
                <textarea
                  value={settings.updateMessage}
                  onChange={e => updateSetting('updateMessage', e.target.value)}
                  rows={2}
                  className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none resize-none"
                />
              </div>
            </div>

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
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* تاب الإشعارات */}
        {activeTab === 'notifications' && (
          <>
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Bell size={20} className="text-yellow-500" />
                إعدادات Firebase Cloud Messaging
              </h2>
              <div>
                <label className="block text-sm text-gray-400 mb-2">FCM Server Key</label>
                <div className="relative">
                  <input
                    type={showFcmKey ? 'text' : 'password'}
                    value={settings.fcmServerKey}
                    onChange={e => updateSetting('fcmServerKey', e.target.value)}
                    className="w-full bg-gray-700 rounded-lg px-4 py-3 pl-12 focus:ring-2 focus:ring-green-500 outline-none"
                    dir="ltr"
                    placeholder="AAAA..."
                  />
                  <button
                    onClick={() => setShowFcmKey(!showFcmKey)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showFcmKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Smartphone size={20} className="text-blue-500" />
                إعدادات Apple Push Notifications
              </h2>
              <div>
                <label className="block text-sm text-gray-400 mb-2">APNS Key ID</label>
                <input
                  type="text"
                  value={settings.apnsKeyId}
                  onChange={e => updateSetting('apnsKeyId', e.target.value)}
                  className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                  dir="ltr"
                />
              </div>
            </div>
          </>
        )}

        {/* تاب التواصل والمشاركة */}
        {activeTab === 'contact' && (
          <>
            {/* بيانات التواصل */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Mail size={20} className="text-blue-500" />
                بيانات التواصل
              </h2>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={settings.contactInfo.email}
                    onChange={e => updateSetting('contactInfo', { ...settings.contactInfo, email: e.target.value })}
                    className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                    dir="ltr"
                    placeholder="example@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">رقم الهاتف</label>
                  <input
                    type="tel"
                    value={settings.contactInfo.phone}
                    onChange={e => updateSetting('contactInfo', { ...settings.contactInfo, phone: e.target.value })}
                    className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                    dir="ltr"
                    placeholder="+966 50 000 0000"
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
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Facebook</label>
                  <input
                    type="url"
                    value={settings.contactInfo.facebook}
                    onChange={e => updateSetting('contactInfo', { ...settings.contactInfo, facebook: e.target.value })}
                    className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                    dir="ltr"
                    placeholder="https://www.facebook.com/username"
                  />
                </div>

            {/* روابط التحميل والمشاركة */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Globe size={20} className="text-green-500" />
                روابط التحميل والمشاركة
              </h2>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">رابط Google Play</label>
                  <input
                    type="url"
                    value={settings.shareLinks.playStore}
                    onChange={e => updateSetting('shareLinks', { ...settings.shareLinks, playStore: e.target.value })}
                    className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                    dir="ltr"
                    placeholder="https://play.google.com/store/apps/details?id=..."
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">رابط App Store</label>
                  <input
                    type="url"
                    value={settings.shareLinks.appStore}
                    onChange={e => updateSetting('shareLinks', { ...settings.shareLinks, appStore: e.target.value })}
                    className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                    dir="ltr"
                    placeholder="https://apps.apple.com/app/..."
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">رسالة المشاركة</label>
                  <textarea
                    value={settings.shareLinks.shareMessage}
                    onChange={e => updateSetting('shareLinks', { ...settings.shareLinks, shareMessage: e.target.value })}
                    rows={2}
                    className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none resize-none"
                    placeholder="تحميل تطبيقنا..."
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* تاب الأمان */}
        {activeTab === 'security' && (
          <>
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Shield size={20} className="text-red-500" />
                  تحديد معدل الطلبات (Rate Limiting)
                </h2>
                <button
                  onClick={() => updateSetting('rateLimitEnabled', !settings.rateLimitEnabled)}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    settings.rateLimitEnabled ? 'bg-green-500' : 'bg-gray-600'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${
                      settings.rateLimitEnabled ? 'right-1' : 'left-1'
                    }`}
                  />
                </button>
              </div>
              {settings.rateLimitEnabled && (
                <div>
                  <label className="block text-sm text-gray-400 mb-2">الحد الأقصى للطلبات في الدقيقة</label>
                  <input
                    type="number"
                    min="1"
                    value={settings.maxRequestsPerMinute}
                    onChange={e => updateSetting('maxRequestsPerMinute', parseInt(e.target.value) || 60)}
                    className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
              )}
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Database size={20} className="text-blue-500" />
                النسخ الاحتياطي
              </h2>
              <div className="flex items-center justify-between mb-4">
                <span>تفعيل النسخ الاحتياطي السحابي</span>
                <button
                  onClick={() => updateSetting('cloudBackupEnabled', !settings.cloudBackupEnabled)}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    settings.cloudBackupEnabled ? 'bg-green-500' : 'bg-gray-600'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${
                      settings.cloudBackupEnabled ? 'right-1' : 'left-1'
                    }`}
                  />
                </button>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">الحد الأقصى لحجم النسخة (MB)</label>
                <input
                  type="number"
                  min="1"
                  value={settings.maxBackupSize}
                  onChange={e => updateSetting('maxBackupSize', parseInt(e.target.value) || 50)}
                  className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Server size={20} className="text-purple-500" />
                التحليلات والتقارير
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>تفعيل التحليلات</span>
                  <button
                    onClick={() => updateSetting('analyticsEnabled', !settings.analyticsEnabled)}
                    className={`relative w-14 h-7 rounded-full transition-colors ${
                      settings.analyticsEnabled ? 'bg-green-500' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${
                        settings.analyticsEnabled ? 'right-1' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span>تفعيل تقارير الأعطال</span>
                  <button
                    onClick={() => updateSetting('crashReportingEnabled', !settings.crashReportingEnabled)}
                    className={`relative w-14 h-7 rounded-full transition-colors ${
                      settings.crashReportingEnabled ? 'bg-green-500' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${
                        settings.crashReportingEnabled ? 'right-1' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* تاب API Keys */}
        {activeTab === 'api' && (
          <>
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Key size={20} className="text-yellow-500" />
                  مفاتيح API
                </h2>
                <button
                  onClick={createApiKey}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors"
                >
                  <Key size={16} />
                  <span>إنشاء مفتاح جديد</span>
                </button>
              </div>
              
              <div className="space-y-3">
                {apiKeys.map(key => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg"
                  >
                    <div>
                      <h3 className="font-bold">{key.name}</h3>
                      <p className="text-gray-400 text-sm font-mono">{key.key.slice(0, 20)}...</p>
                      <p className="text-gray-500 text-xs mt-1">
                        آخر استخدام: {key.lastUsed ? new Date(key.lastUsed).toLocaleDateString('ar-EG') : 'لم يُستخدم'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyApiKey(key.key)}
                        className="p-2 hover:bg-gray-600 rounded transition-colors text-gray-400 hover:text-white"
                        title="نسخ"
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        onClick={() => deleteApiKey(key.id)}
                        className="p-2 hover:bg-gray-600 rounded transition-colors text-gray-400 hover:text-red-500"
                        title="حذف"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
