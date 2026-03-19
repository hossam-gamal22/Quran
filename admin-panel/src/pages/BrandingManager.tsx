// admin-panel/src/pages/BrandingManager.tsx
// إدارة هوية التطبيق — الاسم والشعار لكل لغة

import React, { useState, useEffect, useRef } from 'react';
import {
  Save,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Upload,
  X,
  ChevronDown,
  ChevronUp,
  Fingerprint,
  Type,
  Image,
  Globe,
} from 'lucide-react';
import { db, storage } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { convertToPng } from '../utils/imageUpload';
import TranslateButton from '../components/TranslateButton';

const LANGUAGES = [
  { code: 'ar', name: 'العربية', flag: '🇸🇦', rtl: true },
  { code: 'en', name: 'English', flag: '🇺🇸', rtl: false },
  { code: 'fr', name: 'Français', flag: '🇫🇷', rtl: false },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', rtl: false },
  { code: 'es', name: 'Español', flag: '🇪🇸', rtl: false },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷', rtl: false },
  { code: 'ur', name: 'اردو', flag: '🇵🇰', rtl: true },
  { code: 'id', name: 'Indonesia', flag: '🇮🇩', rtl: false },
  { code: 'ms', name: 'Melayu', flag: '🇲🇾', rtl: false },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳', rtl: false },
  { code: 'bn', name: 'বাংলা', flag: '🇧🇩', rtl: false },
  { code: 'ru', name: 'Русский', flag: '🇷🇺', rtl: false },
];

const PRIMARY_LANGS = LANGUAGES.filter(l => l.code === 'ar' || l.code === 'en');
const OTHER_LANGS = LANGUAGES.filter(l => l.code !== 'ar' && l.code !== 'en');

const FIRESTORE_DOC = 'config/branding';

interface BrandingData {
  appNames: Record<string, string>;
  taglines: Record<string, string>;
  logoAr: string;
  logoNonAr: string;
  iconAr: string;
  iconNonAr: string;
}

const DEFAULT_BRANDING: BrandingData = {
  appNames: {
    ar: 'رُوح المسلم',
    en: 'Rooh Al-Muslim',
    fr: 'Rooh Al-Muslim',
    de: 'Rooh Al-Muslim',
    es: 'Rooh Al-Muslim',
    tr: 'Rooh Al-Muslim',
    ur: 'روح المسلم',
    id: 'Rooh Al-Muslim',
    ms: 'Rooh Al-Muslim',
    hi: 'Rooh Al-Muslim',
    bn: 'Rooh Al-Muslim',
    ru: 'Rooh Al-Muslim',
  },
  taglines: {
    ar: 'تطبيق إسلامي شامل للقرآن والأذكار والصلاة',
    en: 'Comprehensive Islamic app for Quran, Adhkar & Prayer',
    fr: '',
    de: '',
    es: '',
    tr: '',
    ur: '',
    id: '',
    ms: '',
    hi: '',
    bn: '',
    ru: '',
  },
  logoAr: '',
  logoNonAr: '',
  iconAr: '',
  iconNonAr: '',
};

export default function BrandingManager() {
  const [data, setData] = useState<BrandingData>(DEFAULT_BRANDING);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showOtherNames, setShowOtherNames] = useState(false);
  const [showOtherTaglines, setShowOtherTaglines] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const logoArRef = useRef<HTMLInputElement>(null);
  const logoNonArRef = useRef<HTMLInputElement>(null);
  const iconArRef = useRef<HTMLInputElement>(null);
  const iconNonArRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const snap = await getDoc(doc(db, FIRESTORE_DOC));
      if (snap.exists()) {
        setData({ ...DEFAULT_BRANDING, ...snap.data() as BrandingData });
      }
    } catch (err) {
      console.error('Error loading branding:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      await setDoc(doc(db, FIRESTORE_DOC), data);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error('Error saving branding:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (file: File, field: keyof BrandingData) => {
    if (!file) return;
    setUploadingField(field);
    try {
      const pngBlob = await convertToPng(file);
      const timestamp = Date.now();
      const isSvg = file.type === 'image/svg+xml';
      const ext = isSvg ? 'svg' : 'png';
      const storageRef = ref(storage, `branding/${field}/${timestamp}.${ext}`);
      await uploadBytes(storageRef, pngBlob, { contentType: isSvg ? 'image/svg+xml' : 'image/png' });
      const url = await getDownloadURL(storageRef);
      setData(prev => ({ ...prev, [field]: url }));
    } catch (err) {
      console.error('Error uploading image:', err);
    } finally {
      setUploadingField(null);
    }
  };

  const updateName = (lang: string, value: string) => {
    setData(prev => ({ ...prev, appNames: { ...prev.appNames, [lang]: value } }));
  };

  const updateTagline = (lang: string, value: string) => {
    setData(prev => ({ ...prev, taglines: { ...prev.taglines, [lang]: value } }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  const ImageUploadField = ({ label, flag, field, fieldRef }: {
    label: string;
    flag: string;
    field: keyof BrandingData;
    fieldRef: React.RefObject<HTMLInputElement | null>;
  }) => {
    const url = data[field] as string;
    const isUploading = uploadingField === field;
    return (
      <div className="bg-slate-700/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">{flag}</span>
          <label className="text-sm text-slate-300 font-medium">{label}</label>
        </div>
        <div className="flex items-center gap-3">
          {url ? (
            <div className="relative group">
              <img src={url} alt={label} className="w-20 h-20 rounded-xl object-contain border border-slate-600 bg-slate-800 p-1" />
              <button
                onClick={() => setData(prev => ({ ...prev, [field]: '' }))}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                title="إزالة"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ) : (
            <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-600 flex items-center justify-center text-slate-500">
              <Image className="w-8 h-8" />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer transition-all ${
              isUploading ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500'
            }`}>
              <Upload className="w-4 h-4" />
              <span className="text-sm">{isUploading ? 'جاري الرفع...' : 'رفع صورة'}</span>
              <input
                ref={fieldRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file, field);
                  e.target.value = '';
                }}
              />
            </label>
            <input
              type="text"
              value={url}
              onChange={e => setData(prev => ({ ...prev, [field]: e.target.value }))}
              className="bg-slate-800 text-white rounded-lg px-3 py-2 border border-slate-600 text-xs font-mono w-64"
              placeholder="أو ألصق رابط مباشر"
              dir="ltr"
              aria-label={`رابط ${label}`}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
            <Fingerprint className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">هوية التطبيق</h1>
            <p className="text-slate-400 text-sm">الاسم والشعار والأيقونة لكل لغة</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
            saveStatus === 'success'
              ? 'bg-green-500 text-white'
              : saveStatus === 'error'
              ? 'bg-red-500 text-white'
              : 'bg-emerald-500 hover:bg-emerald-600 text-white'
          } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isSaving ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : saveStatus === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : saveStatus === 'error' ? (
            <AlertTriangle className="w-5 h-5" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {isSaving ? 'جاري الحفظ...' : saveStatus === 'success' ? 'تم الحفظ!' : saveStatus === 'error' ? 'خطأ!' : 'حفظ التغييرات'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* الإعدادات */}
        <div className="lg:col-span-2 space-y-6">

          {/* اسم التطبيق */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <Type className="w-5 h-5 text-emerald-400" />
              <h3 className="text-white font-semibold">اسم التطبيق لكل لغة</h3>
            </div>
            <p className="text-slate-500 text-xs mb-4">يظهر في الهيدر، المشاركة، البراندنج، و"حول التطبيق"</p>
            <p className="text-emerald-600 text-xs mb-4 flex items-center gap-1">💡 الإنجليزية هي اللغة الاحتياطية — إذا ترك حقل فارغ، سيظهر المحتوى الإنجليزي بدلاً منه</p>

            <div className="space-y-3">
              {PRIMARY_LANGS.map(lang => (
                <div key={lang.code}>
                  <label className="flex items-center gap-2 text-sm text-slate-400 mb-1">
                    <span>{lang.flag}</span> {lang.name}
                  </label>
                  <input
                    type="text"
                    value={data.appNames[lang.code] || ''}
                    onChange={e => updateName(lang.code, e.target.value)}
                    className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-emerald-500 focus:outline-none transition-colors"
                    placeholder={lang.code === 'ar' ? 'اسم التطبيق بالعربية' : 'App name in English'}
                    dir={lang.rtl ? 'rtl' : 'ltr'}
                    aria-label={`اسم التطبيق - ${lang.name}`}
                  />
                </div>
              ))}

              <TranslateButton
                sourceText={data.appNames['ar'] || data.appNames['en'] || ''}
                sourceLang={data.appNames['ar'] ? 'ar' : 'en'}
                contentType="ui"
                onTranslated={(translations) => setData(prev => ({ ...prev, appNames: { ...prev.appNames, ...translations } }))}
                label="🌍 ترجمة الاسم لكل اللغات"
              />

              <button
                onClick={() => setShowOtherNames(!showOtherNames)}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300 transition-colors mt-2"
              >
                {showOtherNames ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {showOtherNames ? 'إخفاء' : 'إظهار'} باقي اللغات ({OTHER_LANGS.length})
              </button>

              {showOtherNames && OTHER_LANGS.map(lang => (
                <div key={lang.code}>
                  <label className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                    <span>{lang.flag}</span> {lang.name}
                  </label>
                  <input
                    type="text"
                    value={data.appNames[lang.code] || ''}
                    onChange={e => updateName(lang.code, e.target.value)}
                    className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-emerald-500 focus:outline-none transition-colors text-sm"
                    placeholder={data.appNames['en'] ? `← ${data.appNames['en']} (احتياطي)` : `اسم التطبيق بـ${lang.name}`}
                    dir={lang.rtl ? 'rtl' : 'ltr'}
                    aria-label={`اسم التطبيق - ${lang.name}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* الشعار (الأوصاف) */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-5 h-5 text-emerald-400" />
              <h3 className="text-white font-semibold">وصف التطبيق (Tagline)</h3>
            </div>
            <p className="text-slate-500 text-xs mb-4">يظهر في شاشة "حول التطبيق" ومتجر التطبيقات</p>
            <p className="text-emerald-600 text-xs mb-4 flex items-center gap-1">💡 الإنجليزية هي اللغة الاحتياطية — إذا ترك حقل فارغ، سيظهر المحتوى الإنجليزي بدلاً منه</p>

            <div className="space-y-3">
              {PRIMARY_LANGS.map(lang => (
                <div key={lang.code}>
                  <label className="flex items-center gap-2 text-sm text-slate-400 mb-1">
                    <span>{lang.flag}</span> {lang.name}
                  </label>
                  <input
                    type="text"
                    value={data.taglines[lang.code] || ''}
                    onChange={e => updateTagline(lang.code, e.target.value)}
                    className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-emerald-500 focus:outline-none transition-colors"
                    placeholder={lang.code === 'ar' ? 'وصف التطبيق بالعربية' : 'App tagline in English'}
                    dir={lang.rtl ? 'rtl' : 'ltr'}
                    aria-label={`وصف التطبيق - ${lang.name}`}
                  />
                </div>
              ))}

              <button
                onClick={() => setShowOtherTaglines(!showOtherTaglines)}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300 transition-colors mt-2"
              >
                {showOtherTaglines ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {showOtherTaglines ? 'إخفاء' : 'إظهار'} باقي اللغات ({OTHER_LANGS.length})
              </button>

              <TranslateButton
                sourceText={data.taglines['ar'] || data.taglines['en'] || ''}
                sourceLang={data.taglines['ar'] ? 'ar' : 'en'}
                contentType="ui"
                onTranslated={(translations) => setData(prev => ({ ...prev, taglines: { ...prev.taglines, ...translations } }))}
                label="🌍 ترجمة الوصف لكل اللغات"
              />

              {showOtherTaglines && OTHER_LANGS.map(lang => (
                <div key={lang.code}>
                  <label className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                    <span>{lang.flag}</span> {lang.name}
                  </label>
                  <input
                    type="text"
                    value={data.taglines[lang.code] || ''}
                    onChange={e => updateTagline(lang.code, e.target.value)}
                    className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:border-emerald-500 focus:outline-none transition-colors text-sm"
                    placeholder={data.taglines['en'] ? `← ${data.taglines['en']} (احتياطي)` : `وصف بـ${lang.name}`}
                    dir={lang.rtl ? 'rtl' : 'ltr'}
                    aria-label={`وصف التطبيق - ${lang.name}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* الشعار (اللوجو) */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <Image className="w-5 h-5 text-emerald-400" />
              <h3 className="text-white font-semibold">شعار التطبيق (Logo)</h3>
            </div>
            <p className="text-slate-500 text-xs mb-4">الشعار الكامل الذي يظهر في البراندنج والمشاركة وتصدير الصور</p>

            <div className="space-y-4">
              <ImageUploadField label="شعار عربي" flag="🇸🇦" field="logoAr" fieldRef={logoArRef} />
              <ImageUploadField label="شعار إنجليزي / غير عربي" flag="🌐" field="logoNonAr" fieldRef={logoNonArRef} />
            </div>
          </div>

          {/* الأيقونة */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <Fingerprint className="w-5 h-5 text-emerald-400" />
              <h3 className="text-white font-semibold">أيقونة التطبيق (App Icon)</h3>
            </div>
            <p className="text-slate-500 text-xs mb-4">الأيقونة المربعة التي تظهر في الهيدر وداخل التطبيق (يفضل 512×512)</p>

            <div className="space-y-4">
              <ImageUploadField label="أيقونة عربية" flag="🇸🇦" field="iconAr" fieldRef={iconArRef} />
              <ImageUploadField label="أيقونة إنجليزية / غير عربية" flag="🌐" field="iconNonAr" fieldRef={iconNonArRef} />
            </div>
          </div>
        </div>

        {/* المعاينة */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            <h3 className="text-white font-semibold">معاينة</h3>

            {/* Arabic Preview */}
            <div className="bg-slate-950 rounded-2xl p-5">
              <p className="text-xs text-slate-500 mb-3 text-center">🇸🇦 عربي</p>
              <div className="flex items-center gap-3 justify-center mb-3">
                {data.iconAr ? (
                  <img src={data.iconAr} alt="icon" className="w-14 h-14 rounded-xl object-contain" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-emerald-600/30 flex items-center justify-center text-2xl">🕌</div>
                )}
                <div className="text-right">
                  <p className="text-white font-bold text-lg">{data.appNames.ar || 'رُوح المسلم'}</p>
                  <p className="text-slate-400 text-xs">{data.taglines.ar || 'وصف التطبيق'}</p>
                </div>
              </div>
              {data.logoAr && (
                <div className="mt-3 border-t border-slate-800 pt-3 flex justify-center">
                  <img src={data.logoAr} alt="logo ar" className="h-12 object-contain" />
                </div>
              )}
            </div>

            {/* English Preview */}
            <div className="bg-gray-100 rounded-2xl p-5">
              <p className="text-xs text-gray-500 mb-3 text-center">🌐 English</p>
              <div className="flex items-center gap-3 justify-center mb-3" dir="ltr">
                {data.iconNonAr ? (
                  <img src={data.iconNonAr} alt="icon" className="w-14 h-14 rounded-xl object-contain" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-emerald-600/30 flex items-center justify-center text-2xl">🕌</div>
                )}
                <div className="text-left">
                  <p className="text-gray-800 font-bold text-lg">{data.appNames.en || 'Rooh Al-Muslim'}</p>
                  <p className="text-gray-500 text-xs">{data.taglines.en || 'App tagline'}</p>
                </div>
              </div>
              {data.logoNonAr && (
                <div className="mt-3 border-t border-gray-200 pt-3 flex justify-center">
                  <img src={data.logoNonAr} alt="logo en" className="h-12 object-contain" />
                </div>
              )}
            </div>

            {/* Share Preview */}
            <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
              <h4 className="text-sm font-semibold text-emerald-400 mb-2">معاينة نص المشاركة</h4>
              <div className="bg-slate-700 rounded-lg p-3 text-sm text-slate-300 font-mono whitespace-pre-line" dir="rtl">
                {`📱 تطبيق ${data.appNames.ar || 'رُوح المسلم'}`}
              </div>
              <div className="bg-slate-700 rounded-lg p-3 text-sm text-slate-300 font-mono whitespace-pre-line mt-2" dir="ltr">
                {`📱 App ${data.appNames.en || 'Rooh Al-Muslim'}`}
              </div>
            </div>

            {/* Info */}
            <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
              <h4 className="text-sm font-semibold text-emerald-400 mb-2">ملاحظات</h4>
              <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                <li>الاسم يظهر داخل التطبيق: الهيدر، المشاركة، حول التطبيق</li>
                <li>الشعار يظهر في تصدير الصور والبراندنج</li>
                <li>الأيقونة تظهر في الهيدر وشاشة البداية</li>
                <li>اسم التطبيق على الهاتف (Launcher) يعتمد على البناء الأصلي</li>
                <li>إذا لم تُرفع صورة، يُستخدم الشعار الافتراضي المدمج</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
