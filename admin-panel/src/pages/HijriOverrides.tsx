// admin-panel/src/pages/HijriOverrides.tsx
// إدارة تعديلات التاريخ الهجري حسب الدولة

import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { Plus, Trash2, Edit2, Check, X, Globe, Calendar, ExternalLink, Shield, ShieldCheck } from 'lucide-react';

// ============================================
// Types
// ============================================

interface HijriOverride {
  id: string;
  countryCode: string;
  countryName: string;
  hijriYear: number;
  hijriMonth: number;
  monthLength: 29 | 30;
  hijriStartGregorian: string;
  source: string;
  sourceUrl?: string;
  announcedAt?: Timestamp;
  updatedBy?: string;
  isVerified: boolean;
}

// ============================================
// Constants
// ============================================

const HIJRI_MONTHS = [
  { num: 1, ar: 'محرم', en: 'Muharram' },
  { num: 2, ar: 'صفر', en: 'Safar' },
  { num: 3, ar: 'ربيع الأول', en: 'Rabi al-Awwal' },
  { num: 4, ar: 'ربيع الثاني', en: 'Rabi al-Thani' },
  { num: 5, ar: 'جمادى الأولى', en: 'Jumada al-Ula' },
  { num: 6, ar: 'جمادى الآخرة', en: 'Jumada al-Thani' },
  { num: 7, ar: 'رجب', en: 'Rajab' },
  { num: 8, ar: 'شعبان', en: 'Shaban' },
  { num: 9, ar: 'رمضان', en: 'Ramadan' },
  { num: 10, ar: 'شوال', en: 'Shawwal' },
  { num: 11, ar: 'ذو القعدة', en: 'Dhul Qadah' },
  { num: 12, ar: 'ذو الحجة', en: 'Dhul Hijjah' },
];

const COUNTRIES = [
  { code: 'SA', name: 'السعودية', en: 'Saudi Arabia' },
  { code: 'AE', name: 'الإمارات', en: 'UAE' },
  { code: 'EG', name: 'مصر', en: 'Egypt' },
  { code: 'KW', name: 'الكويت', en: 'Kuwait' },
  { code: 'QA', name: 'قطر', en: 'Qatar' },
  { code: 'BH', name: 'البحرين', en: 'Bahrain' },
  { code: 'OM', name: 'عمان', en: 'Oman' },
  { code: 'JO', name: 'الأردن', en: 'Jordan' },
  { code: 'PS', name: 'فلسطين', en: 'Palestine' },
  { code: 'SY', name: 'سوريا', en: 'Syria' },
  { code: 'IQ', name: 'العراق', en: 'Iraq' },
  { code: 'LB', name: 'لبنان', en: 'Lebanon' },
  { code: 'LY', name: 'ليبيا', en: 'Libya' },
  { code: 'MA', name: 'المغرب', en: 'Morocco' },
  { code: 'DZ', name: 'الجزائر', en: 'Algeria' },
  { code: 'TN', name: 'تونس', en: 'Tunisia' },
  { code: 'PK', name: 'باكستان', en: 'Pakistan' },
  { code: 'IN', name: 'الهند', en: 'India' },
  { code: 'BD', name: 'بنغلاديش', en: 'Bangladesh' },
  { code: 'ID', name: 'إندونيسيا', en: 'Indonesia' },
  { code: 'MY', name: 'ماليزيا', en: 'Malaysia' },
  { code: 'SG', name: 'سنغافورة', en: 'Singapore' },
  { code: 'TR', name: 'تركيا', en: 'Turkey' },
  { code: 'NG', name: 'نيجيريا', en: 'Nigeria' },
  { code: 'SN', name: 'السنغال', en: 'Senegal' },
  { code: 'GH', name: 'غانا', en: 'Ghana' },
  { code: 'US', name: 'أمريكا', en: 'USA' },
  { code: 'GB', name: 'بريطانيا', en: 'UK' },
  { code: 'FR', name: 'فرنسا', en: 'France' },
  { code: 'CA', name: 'كندا', en: 'Canada' },
  { code: 'AU', name: 'أستراليا', en: 'Australia' },
  { code: 'DE', name: 'ألمانيا', en: 'Germany' },
  { code: 'ES', name: 'إسبانيا', en: 'Spain' },
];

const PRESETS = [
  { label: 'بداية رمضان', month: 9, desc: 'Ramadan starts' },
  { label: 'عيد الفطر', month: 10, desc: 'Eid Al-Fitr (Shawwal)' },
  { label: 'عيد الأضحى', month: 12, desc: 'Eid Al-Adha (Dhul Hijjah)' },
];

// ============================================
// Component
// ============================================

const HijriOverrides: React.FC = () => {
  const [overrides, setOverrides] = useState<HijriOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    countryCode: 'SA',
    hijriYear: 1447,
    hijriMonth: 9,
    monthLength: 29 as 29 | 30,
    hijriStartGregorian: '',
    source: '',
    sourceUrl: '',
    isVerified: true,
  });

  // ============================================
  // Fetch overrides
  // ============================================

  const fetchOverrides = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'hijri_overrides'));
      const data: HijriOverride[] = [];
      snapshot.forEach(docSnap => {
        data.push({ id: docSnap.id, ...docSnap.data() } as HijriOverride);
      });
      // Sort by year desc, then month desc, then country
      data.sort((a, b) => {
        if (a.hijriYear !== b.hijriYear) return b.hijriYear - a.hijriYear;
        if (a.hijriMonth !== b.hijriMonth) return b.hijriMonth - a.hijriMonth;
        return a.countryCode.localeCompare(b.countryCode);
      });
      setOverrides(data);
    } catch (err) {
      console.error('Error fetching overrides:', err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchOverrides(); }, []);

  // ============================================
  // Save override
  // ============================================

  const handleSave = async () => {
    if (!form.hijriStartGregorian || !form.source) return;
    setSaving(true);
    try {
      const country = COUNTRIES.find(c => c.code === form.countryCode);
      const docId = `${form.countryCode}_${form.hijriYear}_${form.hijriMonth}`;
      await setDoc(doc(db, 'hijri_overrides', docId), {
        countryCode: form.countryCode,
        countryName: country?.en || form.countryCode,
        hijriYear: form.hijriYear,
        hijriMonth: form.hijriMonth,
        monthLength: form.monthLength,
        hijriStartGregorian: form.hijriStartGregorian,
        source: form.source,
        sourceUrl: form.sourceUrl || '',
        announcedAt: Timestamp.now(),
        updatedBy: 'admin',
        isVerified: form.isVerified,
      });
      setShowForm(false);
      setEditingId(null);
      resetForm();
      await fetchOverrides();
    } catch (err) {
      console.error('Error saving override:', err);
    }
    setSaving(false);
  };

  // ============================================
  // Delete override
  // ============================================

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'hijri_overrides', id));
      setDeleteConfirmId(null);
      await fetchOverrides();
    } catch (err) {
      console.error('Error deleting override:', err);
    }
  };

  // ============================================
  // Edit override
  // ============================================

  const handleEdit = (override: HijriOverride) => {
    setForm({
      countryCode: override.countryCode,
      hijriYear: override.hijriYear,
      hijriMonth: override.hijriMonth,
      monthLength: override.monthLength,
      hijriStartGregorian: override.hijriStartGregorian,
      source: override.source,
      sourceUrl: override.sourceUrl || '',
      isVerified: override.isVerified,
    });
    setEditingId(override.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setForm({
      countryCode: 'SA',
      hijriYear: 1447,
      hijriMonth: 9,
      monthLength: 29,
      hijriStartGregorian: '',
      source: '',
      sourceUrl: '',
      isVerified: true,
    });
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setForm(prev => ({ ...prev, hijriMonth: preset.month }));
  };

  // ============================================
  // "Set today's Hijri date" quick-override
  // ============================================
  //
  // The standard form asks the admin for the *Gregorian start date* of a
  // Hijri month. That's the canonical anchor the app uses to compute any
  // day within the month — but it's awkward when the admin just wants to
  // say "in country X, TODAY is Hijri day Y". This modal takes that
  // direct input and reverse-derives the month-start Gregorian date so
  // the same `hijri_overrides` Firestore schema works unchanged.
  //   anchor = today − (todaysHijriDay − 1) days
  // The app + widget then add days to that anchor to compute any other
  // date in the same Hijri month.
  const [showTodayForm, setShowTodayForm] = useState(false);
  const [todayForm, setTodayForm] = useState({
    countryCode: 'SA',
    todaysHijriDay: 1,
    hijriMonth: 9,
    hijriYear: 1447,
    monthLength: 30 as 29 | 30,
    source: '',
    sourceUrl: '',
    isVerified: true,
  });

  const handleSaveToday = async () => {
    if (!todayForm.source) return;
    setSaving(true);
    try {
      // Compute the implied month-start Gregorian date.
      const now = new Date();
      const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
      todayUTC.setUTCDate(todayUTC.getUTCDate() - (todayForm.todaysHijriDay - 1));
      const yyyy = todayUTC.getUTCFullYear();
      const mm = String(todayUTC.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(todayUTC.getUTCDate()).padStart(2, '0');
      const hijriStartGregorian = `${yyyy}-${mm}-${dd}`;

      const country = COUNTRIES.find(c => c.code === todayForm.countryCode);
      const docId = `${todayForm.countryCode}_${todayForm.hijriYear}_${todayForm.hijriMonth}`;
      await setDoc(doc(db, 'hijri_overrides', docId), {
        countryCode: todayForm.countryCode,
        countryName: country?.en || todayForm.countryCode,
        hijriYear: todayForm.hijriYear,
        hijriMonth: todayForm.hijriMonth,
        monthLength: todayForm.monthLength,
        hijriStartGregorian,
        source: todayForm.source,
        sourceUrl: todayForm.sourceUrl || '',
        announcedAt: Timestamp.now(),
        updatedBy: 'admin',
        isVerified: todayForm.isVerified,
      });
      setShowTodayForm(false);
      await fetchOverrides();
    } catch (err) {
      console.error('Error saving today override:', err);
    }
    setSaving(false);
  };

  const getMonthName = (num: number) => {
    const m = HIJRI_MONTHS.find(h => h.num === num);
    return m ? `${m.ar} (${m.en})` : String(num);
  };

  const getCountryName = (code: string) => {
    const c = COUNTRIES.find(co => co.code === code);
    return c ? c.name : code;
  };

  // ============================================
  // Render
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Globe className="w-7 h-7 text-accent-light" />
            تعديلات التاريخ الهجري
          </h1>
          <p className="text-slate-400 mt-1">إدارة رؤية الهلال وتعديلات التواريخ حسب الدولة</p>
        </div>
        <button
          onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          إضافة تعديل
        </button>
      </div>

      {/* Preset buttons + "set today" quick action */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setShowTodayForm(true)}
          className="px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-lg transition-colors text-sm font-medium"
        >
          <Calendar className="w-4 h-4 inline ml-2" />
          تعديل تاريخ اليوم
        </button>
        {PRESETS.map(preset => (
          <button
            key={preset.month}
            onClick={() => {
              applyPreset(preset);
              setEditingId(null);
              setShowForm(true);
            }}
            className="px-4 py-2 bg-admin-surface hover:bg-admin-surface-light text-slate-300 rounded-lg border border-admin-border transition-colors text-sm"
          >
            <Calendar className="w-4 h-4 inline ml-2" />
            {preset.label}
          </button>
        ))}
      </div>

      {/* Quick "today's Hijri date" modal */}
      {showTodayForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-admin-surface rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">تعديل تاريخ اليوم الهجري</h2>
              <button onClick={() => setShowTodayForm(false)} className="text-slate-400 hover:text-white" aria-label="إغلاق">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              اختر الدولة وتاريخ اليوم الهجري كما تريد أن يظهر للمستخدمين. النظام
              سيحسب بداية الشهر الميلادية تلقائياً ويوزّعها على باقي أيام الشهر.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">الدولة</label>
                <select
                  value={todayForm.countryCode}
                  onChange={e => setTodayForm(prev => ({ ...prev, countryCode: e.target.value }))}
                  className="w-full bg-admin-surface-light text-white rounded-lg px-4 py-2 border border-admin-border"
                  aria-label="اختر الدولة"
                >
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.name} ({c.en})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">اليوم</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={todayForm.todaysHijriDay}
                    onChange={e => setTodayForm(prev => ({ ...prev, todaysHijriDay: Math.max(1, Math.min(30, parseInt(e.target.value) || 1)) }))}
                    className="w-full bg-admin-surface-light text-white rounded-lg px-4 py-2 border border-admin-border"
                    aria-label="اليوم الهجري"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">الشهر</label>
                  <select
                    value={todayForm.hijriMonth}
                    onChange={e => setTodayForm(prev => ({ ...prev, hijriMonth: parseInt(e.target.value) }))}
                    className="w-full bg-admin-surface-light text-white rounded-lg px-4 py-2 border border-admin-border"
                    aria-label="الشهر الهجري"
                  >
                    {HIJRI_MONTHS.map(m => (
                      <option key={m.num} value={m.num}>{m.ar}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">السنة</label>
                  <input
                    type="number"
                    value={todayForm.hijriYear}
                    onChange={e => setTodayForm(prev => ({ ...prev, hijriYear: parseInt(e.target.value) || 1447 }))}
                    className="w-full bg-admin-surface-light text-white rounded-lg px-4 py-2 border border-admin-border"
                    aria-label="السنة الهجرية"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">طول الشهر</label>
                <div className="flex gap-2">
                  {[29, 30].map(len => (
                    <button
                      key={len}
                      onClick={() => setTodayForm(prev => ({ ...prev, monthLength: len as 29 | 30 }))}
                      className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                        todayForm.monthLength === len
                          ? 'bg-accent text-white border-accent'
                          : 'bg-admin-surface-light text-slate-300 border-admin-border'
                      }`}
                    >
                      {len} يوم
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">المصدر الرسمي</label>
                <input
                  type="text"
                  value={todayForm.source}
                  onChange={e => setTodayForm(prev => ({ ...prev, source: e.target.value }))}
                  placeholder="مثال: المجلس الأعلى للقضاء"
                  className="w-full bg-admin-surface-light text-white rounded-lg px-4 py-2 border border-admin-border"
                  aria-label="المصدر الرسمي"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">رابط المصدر (اختياري)</label>
                <input
                  type="url"
                  value={todayForm.sourceUrl}
                  onChange={e => setTodayForm(prev => ({ ...prev, sourceUrl: e.target.value }))}
                  placeholder="https://..."
                  className="w-full bg-admin-surface-light text-white rounded-lg px-4 py-2 border border-admin-border"
                  aria-label="رابط المصدر"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-slate-300">موثق رسمياً</span>
                <button
                  onClick={() => setTodayForm(prev => ({ ...prev, isVerified: !prev.isVerified }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    todayForm.isVerified ? 'bg-accent' : 'bg-admin-surface-light'
                  }`}
                  aria-label="حالة التوثيق"
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${todayForm.isVerified ? 'translate-x-1' : 'translate-x-6'}`} />
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                disabled={saving || !todayForm.source}
                onClick={handleSaveToday}
                className="flex-1 px-4 py-2 bg-accent hover:bg-accent-dark disabled:opacity-50 text-white rounded-xl transition-colors"
              >
                {saving ? 'جاري الحفظ...' : 'نشر'}
              </button>
              <button
                onClick={() => setShowTodayForm(false)}
                className="px-4 py-2 bg-admin-surface-light hover:bg-slate-600 text-slate-300 rounded-xl transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-admin-surface rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {editingId ? 'تعديل' : 'إضافة تعديل جديد'}
              </h2>
              <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-slate-400 hover:text-white" aria-label="إغلاق">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Country */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">الدولة</label>
                <select
                  value={form.countryCode}
                  onChange={e => setForm(prev => ({ ...prev, countryCode: e.target.value }))}
                  className="w-full bg-admin-surface-light text-white rounded-lg px-4 py-2 border border-admin-border"
                  aria-label="اختر الدولة"
                >
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.name} ({c.en})</option>
                  ))}
                </select>
              </div>

              {/* Hijri Year */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">السنة الهجرية</label>
                <input
                  type="number"
                  value={form.hijriYear}
                  onChange={e => setForm(prev => ({ ...prev, hijriYear: parseInt(e.target.value) || 1447 }))}
                  className="w-full bg-admin-surface-light text-white rounded-lg px-4 py-2 border border-admin-border"
                  aria-label="السنة الهجرية"
                />
              </div>

              {/* Hijri Month */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">الشهر الهجري</label>
                <select
                  value={form.hijriMonth}
                  onChange={e => setForm(prev => ({ ...prev, hijriMonth: parseInt(e.target.value) }))}
                  className="w-full bg-admin-surface-light text-white rounded-lg px-4 py-2 border border-admin-border"
                  aria-label="الشهر الهجري"
                >
                  {HIJRI_MONTHS.map(m => (
                    <option key={m.num} value={m.num}>{m.ar} ({m.en})</option>
                  ))}
                </select>
              </div>

              {/* Month Length */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">عدد أيام الشهر</label>
                <div className="flex gap-3">
                  {[29, 30].map(len => (
                    <button
                      key={len}
                      onClick={() => setForm(prev => ({ ...prev, monthLength: len as 29 | 30 }))}
                      className={`flex-1 py-2 rounded-lg border transition-colors ${
                        form.monthLength === len
                          ? 'bg-accent border-accent text-white'
                          : 'bg-admin-surface-light border-admin-border text-slate-300 hover:border-accent'
                      }`}
                    >
                      {len} يوم
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Date (Gregorian) */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">بداية الشهر (ميلادي)</label>
                <input
                  type="date"
                  value={form.hijriStartGregorian}
                  onChange={e => setForm(prev => ({ ...prev, hijriStartGregorian: e.target.value }))}
                  className="w-full bg-admin-surface-light text-white rounded-lg px-4 py-2 border border-admin-border"
                  aria-label="تاريخ البداية"
                />
              </div>

              {/* Source */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">المصدر الرسمي</label>
                <input
                  type="text"
                  value={form.source}
                  onChange={e => setForm(prev => ({ ...prev, source: e.target.value }))}
                  placeholder="مثال: دار الإفتاء المصرية"
                  className="w-full bg-admin-surface-light text-white rounded-lg px-4 py-2 border border-admin-border"
                />
              </div>

              {/* Source URL */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">رابط المصدر (اختياري)</label>
                <input
                  type="url"
                  value={form.sourceUrl}
                  onChange={e => setForm(prev => ({ ...prev, sourceUrl: e.target.value }))}
                  placeholder="https://..."
                  className="w-full bg-admin-surface-light text-white rounded-lg px-4 py-2 border border-admin-border"
                  dir="ltr"
                />
              </div>

              {/* Verified Toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, isVerified: !prev.isVerified }))}
                  className={`w-12 h-6 rounded-full transition-colors ${form.isVerified ? 'bg-accent' : 'bg-admin-surface-light'}`}
                  aria-label={form.isVerified ? 'موثق رسمياً' : 'غير موثق'}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${form.isVerified ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-sm text-slate-300">
                  {form.isVerified ? 'موثق رسمياً' : 'غير موثق'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSave}
                disabled={saving || !form.hijriStartGregorian || !form.source}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-accent hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
              >
                <Check className="w-4 h-4" />
                {saving ? 'جاري الحفظ...' : editingId ? 'تحديث' : 'نشر'}
              </button>
              <button
                onClick={() => { setShowForm(false); setEditingId(null); }}
                className="px-4 py-2 bg-admin-surface-light hover:bg-slate-600 text-slate-300 rounded-xl transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overrides Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">جاري التحميل...</div>
      ) : overrides.length === 0 ? (
        <div className="text-center py-12">
          <Globe className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg">لا توجد تعديلات حالياً</p>
          <p className="text-slate-500 text-sm mt-1">أضف تعديلاً لرؤية الهلال حسب الدولة</p>
        </div>
      ) : (
        <div className="bg-admin-surface/50 rounded-2xl border border-admin-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" dir="rtl">
              <thead>
                <tr className="bg-admin-surface text-slate-400 border-b border-admin-border">
                  <th className="text-right px-4 py-3">الدولة</th>
                  <th className="text-right px-4 py-3">الشهر</th>
                  <th className="text-right px-4 py-3">السنة</th>
                  <th className="text-center px-4 py-3">الأيام</th>
                  <th className="text-right px-4 py-3">البداية</th>
                  <th className="text-right px-4 py-3">المصدر</th>
                  <th className="text-center px-4 py-3">الحالة</th>
                  <th className="text-center px-4 py-3">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {overrides.map(ov => (
                  <tr key={ov.id} className="border-b border-admin-border/50 hover:bg-admin-surface/30 transition-colors">
                    <td className="px-4 py-3 text-white font-medium">
                      {getCountryName(ov.countryCode)}
                      <span className="text-xs text-slate-500 mr-1">({ov.countryCode})</span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{getMonthName(ov.hijriMonth)}</td>
                    <td className="px-4 py-3 text-slate-300">{ov.hijriYear} هـ</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                        ov.monthLength === 29 ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {ov.monthLength} يوم
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300" dir="ltr">{ov.hijriStartGregorian}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-300 text-xs">{ov.source}</span>
                        {ov.sourceUrl && (
                          <a href={ov.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-accent-light hover:text-emerald-300" aria-label="رابط المصدر">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {ov.isVerified ? (
                        <ShieldCheck className="w-5 h-5 text-accent-light mx-auto" />
                      ) : (
                        <Shield className="w-5 h-5 text-slate-500 mx-auto" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(ov)}
                          className="p-1.5 hover:bg-admin-surface-light rounded-lg text-slate-400 hover:text-white transition-colors"
                          title="تعديل"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {deleteConfirmId === ov.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleDelete(ov.id)} className="px-2 py-1 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700 transition-colors">تأكيد</button>
                            <button onClick={() => setDeleteConfirmId(null)} className="px-2 py-1 bg-admin-surface-light text-slate-300 rounded-lg text-xs hover:bg-slate-600 transition-colors">إلغاء</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(ov.id)}
                            className="p-1.5 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info card */}
      <div className="bg-admin-surface/50 rounded-2xl border border-admin-border/50 p-6" dir="rtl">
        <h3 className="text-lg font-bold text-white mb-3">كيف يعمل النظام</h3>
        <div className="space-y-3 text-sm text-slate-400">
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 bg-accent/20 text-accent-light rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">1</span>
            <p><strong className="text-slate-300">تعديل المشرف (الأولوية القصوى):</strong> التعديلات المضافة هنا تُطبق فوراً على جميع المستخدمين في الدولة المحددة.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">2</span>
            <p><strong className="text-slate-300">واجهة AlAdhan:</strong> إذا لم يوجد تعديل، يُستخدم API خارجي مع تعديل حسب الدولة.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">3</span>
            <p><strong className="text-slate-300">أخبار Google:</strong> في أيام 28-30 من الشهر، يُبحث في الأخبار عن إعلانات رؤية الهلال.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 bg-admin-muted/20 text-slate-400 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">4</span>
            <p><strong className="text-slate-300">الحساب الفلكي:</strong> الملاذ الأخير — حساب تقديري قد يختلف عن الإعلان الرسمي.</p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
          <p className="text-amber-400 text-sm">
            <strong>تنبيه:</strong> يُنصح بإضافة تعديلات للدول التالية خلال رمضان والأعياد:
            السعودية، الإمارات، مصر، باكستان، إندونيسيا، المغرب، تركيا
          </p>
        </div>
      </div>
    </div>
  );
};

export default HijriOverrides;
