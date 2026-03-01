// admin-panel/src/pages/Settings.tsx
import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface AppSettings {
  name: string;
  nameEn: string;
  version: string;
  description: string;
  primaryColor: string;
  maintenanceMode: boolean;
  forceUpdate: boolean;
  minVersion: string;
  contact: {
    email: string;
    website: string;
  };
  downloadLinks: {
    android: string;
    ios: string;
  };
  features: {
    quran: boolean;
    azkar: boolean;
    prayer: boolean;
    qibla: boolean;
    tasbih: boolean;
    names: boolean;
    ruqyah: boolean;
    hijri: boolean;
  };
  updatedAt: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  name: 'رُوح المسلم',
  nameEn: 'Rooh Al-Muslim',
  version: '1.0.0',
  description: 'تطبيق إسلامي شامل للقرآن والأذكار والصلاة',
  primaryColor: '#1B4332',
  maintenanceMode: false,
  forceUpdate: false,
  minVersion: '1.0.0',
  contact: {
    email: 'hossamgamal290@gmail.com',
    website: '',
  },
  downloadLinks: {
    android: '',
    ios: '',
  },
  features: {
    quran: true,
    azkar: true,
    prayer: true,
    qibla: true,
    tasbih: true,
    names: true,
    ruqyah: true,
    hijri: true,
  },
  updatedAt: new Date().toISOString(),
};

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // تحميل الإعدادات من Firebase
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const docRef = doc(db, 'config', 'app-settings');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setSettings({ ...DEFAULT_SETTINGS, ...docSnap.data() } as AppSettings);
      } else {
        // إنشاء الإعدادات الافتراضية إذا لم تكن موجودة
        await setDoc(docRef, DEFAULT_SETTINGS);
        setSettings(DEFAULT_SETTINGS);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      setMessage('❌ خطأ في تحميل الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  // حفظ الإعدادات في Firebase
  const handleSave = async () => {
    try {
      setSaving(true);
      const docRef = doc(db, 'config', 'app-settings');
      const updatedSettings = {
        ...settings,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(docRef, updatedSettings);
      setSettings(updatedSettings);
      setMessage('✅ تم حفظ الإعدادات بنجاح!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('❌ خطأ في حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري تحميل الإعدادات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-emerald-950 text-white min-h-screen fixed right-0">
          <div className="p-6 border-b border-emerald-800">
            <h1 className="text-xl font-bold">🕌 رُوح المسلم</h1>
            <p className="text-emerald-300 text-sm mt-1">لوحة التحكم</p>
          </div>
          <nav className="p-4">
            <ul className="space-y-2">
              <li><a href="/" className="block px-4 py-3 hover:bg-emerald-800 rounded-lg">📊 لوحة التحكم</a></li>
              <li><a href="/settings" className="block px-4 py-3 bg-emerald-700 rounded-lg">⚙️ إعدادات التطبيق</a></li>
              <li><a href="/users" className="block px-4 py-3 hover:bg-emerald-800 rounded-lg">👥 المستخدمين</a></li>
              <li><a href="/ads" className="block px-4 py-3 hover:bg-emerald-800 rounded-lg">📢 الإعلانات</a></li>
              <li><a href="/subscriptions" className="block px-4 py-3 hover:bg-emerald-800 rounded-lg">💳 الاشتراكات</a></li>
              <li><a href="/content" className="block px-4 py-3 hover:bg-emerald-800 rounded-lg">📝 المحتوى</a></li>
              <li><a href="/notifications" className="block px-4 py-3 hover:bg-emerald-800 rounded-lg">🔔 الإشعارات</a></li>
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 mr-64 p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">⚙️ إعدادات التطبيق</h1>
            {message && (
              <div className={`px-4 py-2 rounded-lg ${message.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {message}
              </div>
            )}
          </div>

          {/* معلومات التطبيق الأساسية */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">📱 معلومات التطبيق</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">اسم التطبيق (عربي)</label>
                <input
                  type="text"
                  value={settings.name}
                  onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  dir="rtl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">اسم التطبيق (إنجليزي)</label>
                <input
                  type="text"
                  value={settings.nameEn}
                  onChange={(e) => setSettings({ ...settings, nameEn: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">رقم الإصدار</label>
                <input
                  type="text"
                  value={settings.version}
                  onChange={(e) => setSettings({ ...settings, version: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">اللون الرئيسي</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={settings.primaryColor}
                    onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                    className="w-16 h-12 rounded cursor-pointer border-0"
                  />
                  <input
                    type="text"
                    value={settings.primaryColor}
                    onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">وصف التطبيق</label>
                <textarea
                  value={settings.description}
                  onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  rows={3}
                  dir="rtl"
                />
              </div>
            </div>
          </div>

          {/* روابط التحميل */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">🔗 روابط التحميل</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">رابط Google Play</label>
                <input
                  type="url"
                  value={settings.downloadLinks.android}
                  onChange={(e) => setSettings({
                    ...settings,
                    downloadLinks: { ...settings.downloadLinks, android: e.target.value }
                  })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="https://play.google.com/store/apps/..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">رابط App Store</label>
                <input
                  type="url"
                  value={settings.downloadLinks.ios}
                  onChange={(e) => setSettings({
                    ...settings,
                    downloadLinks: { ...settings.downloadLinks, ios: e.target.value }
                  })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="https://apps.apple.com/app/..."
                />
              </div>
            </div>
          </div>

          {/* التحكم في التطبيق */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">🎛️ التحكم في التطبيق</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-800">🔧 وضع الصيانة</h3>
                  <p className="text-sm text-gray-500">إيقاف التطبيق مؤقتاً للصيانة</p>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    settings.maintenanceMode
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {settings.maintenanceMode ? 'مفعّل' : 'معطّل'}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-800">📲 إجبار التحديث</h3>
                  <p className="text-sm text-gray-500">إجبار المستخدمين على تحديث التطبيق</p>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, forceUpdate: !settings.forceUpdate })}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    settings.forceUpdate
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {settings.forceUpdate ? 'مفعّل' : 'معطّل'}
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الحد الأدنى للإصدار المطلوب</label>
                <input
                  type="text"
                  value={settings.minVersion}
                  onChange={(e) => setSettings({ ...settings, minVersion: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="1.0.0"
                />
              </div>
            </div>
          </div>

          {/* الميزات */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">✨ تفعيل/تعطيل الميزات</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(settings.features).map(([key, value]) => {
                const featureNames: Record<string, string> = {
                  quran: '📖 القرآن',
                  azkar: '📿 الأذكار',
                  prayer: '🕌 الصلاة',
                  qibla: '🧭 القبلة',
                  tasbih: '📿 التسبيح',
                  names: '✨ أسماء الله',
                  ruqyah: '🛡️ الرقية',
                  hijri: '📅 التقويم',
                };
                return (
                  <button
                    key={key}
                    onClick={() => setSettings({
                      ...settings,
                      features: { ...settings.features, [key]: !value }
                    })}
                    className={`p-4 rounded-lg text-center transition-colors ${
                      value
                        ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-500'
                        : 'bg-gray-100 text-gray-500 border-2 border-gray-200'
                    }`}
                  >
                    <div className="text-2xl mb-1">{featureNames[key]?.split(' ')[0]}</div>
                    <div className="text-sm font-medium">{featureNames[key]?.split(' ')[1]}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* معلومات التواصل */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">📧 معلومات التواصل</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={settings.contact.email}
                  onChange={(e) => setSettings({
                    ...settings,
                    contact: { ...settings.contact, email: e.target.value }
                  })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الموقع الإلكتروني</label>
                <input
                  type="url"
                  value={settings.contact.website}
                  onChange={(e) => setSettings({
                    ...settings,
                    contact: { ...settings.contact, website: e.target.value }
                  })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          {/* زر الحفظ */}
          <button
            onClick={handleSave}
            disabled={saving}
            className={`w-full py-4 rounded-xl font-medium text-lg transition-colors ${
              saving
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                جاري الحفظ...
              </span>
            ) : (
              '💾 حفظ الإعدادات'
            )}
          </button>

          {/* معلومات آخر تحديث */}
          <p className="text-center text-gray-500 text-sm mt-4">
            آخر تحديث: {new Date(settings.updatedAt).toLocaleString('ar-EG')}
          </p>
        </main>
      </div>
    </div>
  );
}
