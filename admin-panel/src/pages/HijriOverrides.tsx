// admin-panel/src/pages/HijriOverrides.tsx
// إدارة تعديلات التاريخ الهجري حسب الدولة

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, doc, setDoc, deleteDoc, Timestamp, onSnapshot } from 'firebase/firestore';
import { Plus, Trash2, Edit2, Check, X, Globe, Calendar, ExternalLink, Shield, ShieldCheck, Minus, Save, RefreshCw } from 'lucide-react';
import { sendHijriOverrideSyncNotification } from '../services/pushNotifications';

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

interface CurrentHijriDate {
  day: number;
  month: number;
  year: number;
  monthLength: 29 | 30;
  source: 'admin' | 'calculated';
  override?: HijriOverride;
}

interface CountryDraft {
  day: number;
  month: number;
  year: number;
  monthLength: 29 | 30;
  source: string;
  sourceUrl: string;
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
  { num: 12, ar: 'ذي الحجة', en: 'Dhul Hijjah' },
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
  { label: 'بداية رمضان', month: 9, eventDay: 1, desc: 'Ramadan starts' },
  { label: 'عيد الفطر', month: 10, eventDay: 1, desc: 'Eid Al-Fitr (Shawwal)' },
  { label: 'عيد الأضحى', month: 12, eventDay: 10, desc: 'Eid Al-Adha (Dhul Hijjah)' },
];

const DEFAULT_SOURCE = 'تعديل لوحة التحكم';
const MS_PER_DAY = 86400000;

const pad = (value: number) => String(value).padStart(2, '0');

const toIsoDate = (date: Date) =>
  `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

const getTodayUtc = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
};

const getHijriMonthDays = (year: number, month: number): 29 | 30 => {
  if (month % 2 === 1) return 30;
  if (month !== 12) return 29;
  return ((11 * year + 14) % 30) < 11 ? 30 : 29;
};

const gregorianToHijri = (date: Date = new Date()) => {
  const g = date.getFullYear();
  const m = date.getMonth() + 1;
  const gd = date.getDate();
  const a = Math.floor((14 - m) / 12);
  const y = g + 4800 - a;
  const mo = m + 12 * a - 3;
  const julianDay =
    gd +
    Math.floor((153 * mo + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045;

  const l = julianDay - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) +
    Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  const l3 =
    l2 -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;

  let year = 30 * n + j - 30;
  let month = Math.floor((24 * (l3 - 1)) / 709);
  let day = l3 - Math.floor((709 * month) / 24);
  const maxDays = getHijriMonthDays(year, month);
  if (day > maxDays) {
    day -= maxDays;
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return { day, month, year, monthLength: getHijriMonthDays(year, month) };
};

const getAdjacentHijriMonthKeys = (year: number, month: number) => {
  const previous = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const current = { year, month };
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  return [previous, current, next];
};

const parseIsoDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
};

const deriveMonthStartFromToday = (todayHijriDay: number) => {
  const start = getTodayUtc();
  start.setUTCDate(start.getUTCDate() - (todayHijriDay - 1));
  return toIsoDate(start);
};

const deriveMonthStartFromEvent = (eventGregorianDate: string, eventHijriDay: number) => {
  const date = parseIsoDate(eventGregorianDate);
  if (!date) return '';
  date.setUTCDate(date.getUTCDate() - (eventHijriDay - 1));
  return toIsoDate(date);
};

const isTodayInsideOverride = (override: HijriOverride) => {
  const startDate = parseIsoDate(override.hijriStartGregorian);
  if (!startDate) return false;
  const diffDays = Math.floor((getTodayUtc().getTime() - startDate.getTime()) / MS_PER_DAY);
  return diffDays >= 0 && diffDays < override.monthLength;
};

const getOverrideHijriDay = (override: HijriOverride) => {
  const startDate = parseIsoDate(override.hijriStartGregorian);
  if (!startDate) return null;
  const diffDays = Math.floor((getTodayUtc().getTime() - startDate.getTime()) / MS_PER_DAY) + 1;
  if (diffDays < 1 || diffDays > override.monthLength) return null;
  return diffDays;
};

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
  const [savingCountry, setSavingCountry] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, CountryDraft>>({});

  const pushHijriSync = async (payload: {
    countryCode: string;
    countryName: string;
    hijriYear: number;
    hijriMonth: number;
    monthLength: 29 | 30;
    hijriStartGregorian: string;
    source: string;
    sourceUrl?: string;
    isVerified: boolean;
    deleted?: boolean;
  }) => {
    try {
      await sendHijriOverrideSyncNotification(payload);
    } catch (error) {
      console.warn('Hijri push sync failed:', error);
    }
  };

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
      // Kept for manual refresh paths; realtime data is wired in the effect below.
      setLoading(false);
    } catch (err) {
      console.error('Error fetching overrides:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'hijri_overrides'),
      snapshot => {
        const data: HijriOverride[] = [];
        snapshot.forEach(docSnap => {
          data.push({ id: docSnap.id, ...docSnap.data() } as HijriOverride);
        });
      data.sort((a, b) => {
        if (a.hijriYear !== b.hijriYear) return b.hijriYear - a.hijriYear;
        if (a.hijriMonth !== b.hijriMonth) return b.hijriMonth - a.hijriMonth;
        return a.countryCode.localeCompare(b.countryCode);
      });
      setOverrides(data);
        setLoading(false);
      },
      err => {
        console.error('Error subscribing to overrides:', err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

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
      await pushHijriSync({
        countryCode: form.countryCode,
        countryName: country?.en || form.countryCode,
        hijriYear: form.hijriYear,
        hijriMonth: form.hijriMonth,
        monthLength: form.monthLength,
        hijriStartGregorian: form.hijriStartGregorian,
        source: form.source,
        sourceUrl: form.sourceUrl || '',
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
      const existing = overrides.find(override => override.id === id);
      await deleteDoc(doc(db, 'hijri_overrides', id));
      if (existing) {
        await pushHijriSync({
          countryCode: existing.countryCode,
          countryName: existing.countryName,
          hijriYear: existing.hijriYear,
          hijriMonth: existing.hijriMonth,
          monthLength: existing.monthLength,
          hijriStartGregorian: existing.hijriStartGregorian,
          source: existing.source,
          sourceUrl: existing.sourceUrl || '',
          isVerified: existing.isVerified,
          deleted: true,
        });
      }
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

  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState({
    countryCode: 'SA',
    hijriYear: 1447,
    hijriMonth: 9,
    eventHijriDay: 1,
    eventGregorianDate: toIsoDate(getTodayUtc()),
    monthLength: 30 as 29 | 30,
    source: '',
    sourceUrl: '',
    isVerified: true,
    title: 'تاريخ المناسبة',
  });

  const openEventPreset = (preset: typeof PRESETS[0]) => {
    const inferredYear = approximateToday.year;
    setEventForm(prev => ({
      ...prev,
      hijriYear: inferredYear,
      hijriMonth: preset.month,
      eventHijriDay: preset.eventDay,
      eventGregorianDate: toIsoDate(getTodayUtc()),
      monthLength: getHijriMonthDays(inferredYear, preset.month),
      source: prev.source || DEFAULT_SOURCE,
      title: preset.label,
    }));
    setShowEventForm(true);
  };

  const approximateToday = useMemo(() => gregorianToHijri(new Date()), []);
  const activeMonthKeys = useMemo(
    () => getAdjacentHijriMonthKeys(approximateToday.year, approximateToday.month),
    [approximateToday.year, approximateToday.month]
  );

  const currentCountryRows = useMemo(() => {
    return COUNTRIES.map(country => {
      const activeOverride = overrides.find(override =>
        override.countryCode === country.code &&
        override.isVerified &&
        activeMonthKeys.some(key => key.year === override.hijriYear && key.month === override.hijriMonth) &&
        isTodayInsideOverride(override)
      );
      const overrideDay = activeOverride ? getOverrideHijriDay(activeOverride) : null;
      const current: CurrentHijriDate = activeOverride && overrideDay
        ? {
            day: overrideDay,
            month: activeOverride.hijriMonth,
            year: activeOverride.hijriYear,
            monthLength: activeOverride.monthLength,
            source: 'admin',
            override: activeOverride,
          }
        : {
            day: approximateToday.day,
            month: approximateToday.month,
            year: approximateToday.year,
            monthLength: approximateToday.monthLength,
            source: 'calculated',
          };

      return { country, current };
    });
  }, [activeMonthKeys, approximateToday, overrides]);

  const getDraftForCountry = (countryCode: string, current: CurrentHijriDate): CountryDraft =>
    drafts[countryCode] || {
      day: current.day,
      month: current.month,
      year: current.year,
      monthLength: current.monthLength,
      source: current.override?.source || DEFAULT_SOURCE,
      sourceUrl: current.override?.sourceUrl || '',
      isVerified: true,
    };

  const updateDraft = (countryCode: string, current: CurrentHijriDate, patch: Partial<CountryDraft>) => {
    setDrafts(prev => ({
      ...prev,
      [countryCode]: {
        ...getDraftForCountry(countryCode, current),
        ...patch,
      },
    }));
  };

  const saveCountryDate = async (
    countryCode: string,
    countryName: string,
    current: CurrentHijriDate,
    overrideDraft?: Partial<CountryDraft>,
  ) => {
    const draft = { ...getDraftForCountry(countryCode, current), ...overrideDraft };
    const safeDay = Math.max(1, Math.min(draft.monthLength, draft.day));
    const docId = `${countryCode}_${draft.year}_${draft.month}`;

    setSavingCountry(countryCode);
    try {
      await setDoc(doc(db, 'hijri_overrides', docId), {
        countryCode,
        countryName,
        hijriYear: draft.year,
        hijriMonth: draft.month,
        monthLength: draft.monthLength,
        hijriStartGregorian: deriveMonthStartFromToday(safeDay),
        source: draft.source || DEFAULT_SOURCE,
        sourceUrl: draft.sourceUrl || '',
        announcedAt: Timestamp.now(),
        updatedBy: 'admin',
        isVerified: draft.isVerified,
      });
      await pushHijriSync({
        countryCode,
        countryName,
        hijriYear: draft.year,
        hijriMonth: draft.month,
        monthLength: draft.monthLength,
        hijriStartGregorian: deriveMonthStartFromToday(safeDay),
        source: draft.source || DEFAULT_SOURCE,
        sourceUrl: draft.sourceUrl || '',
        isVerified: draft.isVerified,
      });
      setDrafts(prev => {
        const next = { ...prev };
        delete next[countryCode];
        return next;
      });
    } catch (err) {
      console.error('Error saving country date:', err);
    } finally {
      setSavingCountry(null);
    }
  };

  const quickAdjustCountry = async (
    countryCode: string,
    countryName: string,
    current: CurrentHijriDate,
    delta: number,
  ) => {
    const draft = getDraftForCountry(countryCode, current);
    const nextDay = Math.max(1, Math.min(draft.monthLength, draft.day + delta));
    await saveCountryDate(countryCode, countryName, current, { ...draft, day: nextDay });
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
      await pushHijriSync({
        countryCode: todayForm.countryCode,
        countryName: country?.en || todayForm.countryCode,
        hijriYear: todayForm.hijriYear,
        hijriMonth: todayForm.hijriMonth,
        monthLength: todayForm.monthLength,
        hijriStartGregorian,
        source: todayForm.source,
        sourceUrl: todayForm.sourceUrl || '',
        isVerified: todayForm.isVerified,
      });
      setShowTodayForm(false);
      await fetchOverrides();
    } catch (err) {
      console.error('Error saving today override:', err);
    }
    setSaving(false);
  };

  const handleSaveEvent = async () => {
    if (!eventForm.eventGregorianDate || !eventForm.source) return;
    const hijriStartGregorian = deriveMonthStartFromEvent(
      eventForm.eventGregorianDate,
      eventForm.eventHijriDay
    );
    if (!hijriStartGregorian) return;

    setSaving(true);
    try {
      const country = COUNTRIES.find(c => c.code === eventForm.countryCode);
      const docId = `${eventForm.countryCode}_${eventForm.hijriYear}_${eventForm.hijriMonth}`;
      await setDoc(doc(db, 'hijri_overrides', docId), {
        countryCode: eventForm.countryCode,
        countryName: country?.en || eventForm.countryCode,
        hijriYear: eventForm.hijriYear,
        hijriMonth: eventForm.hijriMonth,
        monthLength: eventForm.monthLength,
        hijriStartGregorian,
        source: eventForm.source,
        sourceUrl: eventForm.sourceUrl || '',
        announcedAt: Timestamp.now(),
        updatedBy: 'admin',
        isVerified: eventForm.isVerified,
      });
      await pushHijriSync({
        countryCode: eventForm.countryCode,
        countryName: country?.en || eventForm.countryCode,
        hijriYear: eventForm.hijriYear,
        hijriMonth: eventForm.hijriMonth,
        monthLength: eventForm.monthLength,
        hijriStartGregorian,
        source: eventForm.source,
        sourceUrl: eventForm.sourceUrl || '',
        isVerified: eventForm.isVerified,
      });
      setShowEventForm(false);
      await fetchOverrides();
    } catch (err) {
      console.error('Error saving event override:', err);
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

  const parseIsoDate = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(Date.UTC(year, month - 1, day));
  };

  const getCurrentHijriDay = (override: HijriOverride) => {
    const startDate = parseIsoDate(override.hijriStartGregorian);
    if (!startDate) return null;

    const today = getTodayUtc();
    const diffDays = Math.floor((today.getTime() - startDate.getTime()) / 86400000) + 1;
    if (diffDays >= 1 && diffDays <= override.monthLength) {
      return diffDays;
    }
    return null;
  };

  const getCurrentDayLabel = (override: HijriOverride) => {
    const startDate = parseIsoDate(override.hijriStartGregorian);
    if (!startDate) return 'غير صالح';

    const today = getTodayUtc();
    const endDate = new Date(startDate.getTime() + (override.monthLength - 1) * 86400000);
    const currentDay = getCurrentHijriDay(override);

    if (currentDay !== null) {
      return `${currentDay}`;
    }
    if (today < startDate) {
      return 'لم يبدأ';
    }
    if (today > endDate) {
      return 'انتهى';
    }
    return 'غير متوفر';
  };

  const eventMonthStartGregorian = deriveMonthStartFromEvent(
    eventForm.eventGregorianDate,
    eventForm.eventHijriDay
  );
  const selectedEventMonth = HIJRI_MONTHS[eventForm.hijriMonth - 1];

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
            onClick={() => openEventPreset(preset)}
            className="px-4 py-2 bg-admin-surface hover:bg-admin-surface-light text-slate-300 rounded-lg border border-admin-border transition-colors text-sm"
          >
            <Calendar className="w-4 h-4 inline ml-2" />
            {preset.label}
          </button>
        ))}
      </div>

      {/* Current country dates */}
      <div className="bg-admin-surface/50 rounded-2xl border border-admin-border/50 overflow-hidden" dir="rtl">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-admin-border/50">
          <div>
            <h2 className="text-lg font-bold text-white">تاريخ اليوم حسب الدولة</h2>
            <p className="text-sm text-slate-400 mt-1">
              عدّل اليوم الهجري لكل دولة. الحفظ يكتب مباشرة في Firestore ويصل لمستخدمي الدولة فوراً.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-300">
              {overrides.filter(override => override.isVerified && isTodayInsideOverride(override)).length} تعديل نشط
            </span>
            <button
              onClick={() => setDrafts({})}
              className="inline-flex items-center gap-2 px-3 py-2 bg-admin-surface-light hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              إعادة القيم
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-admin-surface text-slate-400 border-b border-admin-border">
                <th className="text-right px-4 py-3">الدولة</th>
                <th className="text-center px-4 py-3">المعروض حالياً</th>
                <th className="text-center px-4 py-3">اليوم</th>
                <th className="text-center px-4 py-3">الشهر</th>
                <th className="text-center px-4 py-3">السنة</th>
                <th className="text-center px-4 py-3">طول الشهر</th>
                <th className="text-right px-4 py-3">المصدر</th>
                <th className="text-center px-4 py-3">نشر فوري</th>
              </tr>
            </thead>
            <tbody>
              {currentCountryRows.map(({ country, current }) => {
                const draft = getDraftForCountry(country.code, current);
                const isDirty =
                  draft.day !== current.day ||
                  draft.month !== current.month ||
                  draft.year !== current.year ||
                  draft.monthLength !== current.monthLength ||
                  draft.source !== (current.override?.source || DEFAULT_SOURCE);

                return (
                  <tr key={country.code} className="border-b border-admin-border/50 hover:bg-admin-surface/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{country.name}</div>
                      <div className="text-xs text-slate-500" dir="ltr">{country.code} · {country.en}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="font-bold text-white">
                        {current.day} {HIJRI_MONTHS[current.month - 1]?.ar} {current.year} هـ
                      </div>
                      <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-xs ${
                        current.source === 'admin'
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-slate-700/70 text-slate-300'
                      }`}>
                        {current.source === 'admin' ? 'من الأدمن' : 'حساب تلقائي'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => quickAdjustCountry(country.code, country.en, current, -1)}
                          disabled={savingCountry === country.code || draft.day <= 1}
                          className="p-2 rounded-lg bg-admin-surface-light hover:bg-slate-600 disabled:opacity-40 text-slate-300 transition-colors"
                          title="إنقاص يوم ونشر فوراً"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={draft.monthLength}
                          value={draft.day}
                          onChange={e => updateDraft(country.code, current, { day: Math.max(1, Math.min(draft.monthLength, parseInt(e.target.value) || 1)) })}
                          className="w-16 bg-admin-surface-light text-white rounded-lg px-2 py-2 border border-admin-border text-center"
                          aria-label={`اليوم الهجري ${country.name}`}
                        />
                        <button
                          onClick={() => quickAdjustCountry(country.code, country.en, current, 1)}
                          disabled={savingCountry === country.code || draft.day >= draft.monthLength}
                          className="p-2 rounded-lg bg-admin-surface-light hover:bg-slate-600 disabled:opacity-40 text-slate-300 transition-colors"
                          title="زيادة يوم ونشر فوراً"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={draft.month}
                        onChange={e => {
                          const month = parseInt(e.target.value);
                          updateDraft(country.code, current, {
                            month,
                            monthLength: getHijriMonthDays(draft.year, month),
                          });
                        }}
                        className="bg-admin-surface-light text-white rounded-lg px-3 py-2 border border-admin-border"
                        aria-label={`الشهر الهجري ${country.name}`}
                      >
                        {HIJRI_MONTHS.map(month => (
                          <option key={month.num} value={month.num}>{month.ar}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={draft.year}
                        onChange={e => {
                          const year = parseInt(e.target.value) || approximateToday.year;
                          updateDraft(country.code, current, {
                            year,
                            monthLength: getHijriMonthDays(year, draft.month),
                          });
                        }}
                        className="w-24 bg-admin-surface-light text-white rounded-lg px-3 py-2 border border-admin-border text-center"
                        aria-label={`السنة الهجرية ${country.name}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        {[29, 30].map(length => (
                          <button
                            key={length}
                            onClick={() => updateDraft(country.code, current, { monthLength: length as 29 | 30, day: Math.min(draft.day, length) })}
                            className={`px-3 py-2 rounded-lg border text-xs transition-colors ${
                              draft.monthLength === length
                                ? 'bg-accent border-accent text-white'
                                : 'bg-admin-surface-light border-admin-border text-slate-300'
                            }`}
                          >
                            {length}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 min-w-56">
                      <input
                        type="text"
                        value={draft.source}
                        onChange={e => updateDraft(country.code, current, { source: e.target.value })}
                        className="w-full bg-admin-surface-light text-white rounded-lg px-3 py-2 border border-admin-border text-right"
                        placeholder={DEFAULT_SOURCE}
                        aria-label={`مصدر تعديل ${country.name}`}
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => saveCountryDate(country.code, country.en, current)}
                        disabled={savingCountry === country.code || !draft.source}
                        className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                          isDirty
                            ? 'bg-accent hover:bg-accent-dark text-white'
                            : 'bg-admin-surface-light hover:bg-slate-600 text-slate-300'
                        }`}
                      >
                        <Save className="w-4 h-4" />
                        {savingCountry === country.code ? 'نشر...' : 'نشر'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
                  <span className={`absolute left-0.5 top-0.5 inline-block h-4 w-4 rounded-full bg-white transition-transform ${todayForm.isVerified ? 'translate-x-5' : 'translate-x-0'}`} />
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

      {/* Event date modal for Ramadan/Eid shortcuts */}
      {showEventForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-admin-surface rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">نشر {eventForm.title}</h2>
              <button onClick={() => setShowEventForm(false)} className="text-slate-400 hover:text-white" aria-label="إغلاق">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              اختر يوم المناسبة فقط، وسيتم حساب باقي أيام الشهر تلقائياً من هذا اليوم.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">الدولة</label>
                <select
                  value={eventForm.countryCode}
                  onChange={e => setEventForm(prev => ({ ...prev, countryCode: e.target.value }))}
                  className="w-full bg-admin-surface-light text-white rounded-lg px-4 py-2 border border-admin-border"
                  aria-label="اختر الدولة"
                >
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.name} ({c.en})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">تاريخ {eventForm.title} (ميلادي)</label>
                <input
                  type="date"
                  value={eventForm.eventGregorianDate}
                  onChange={e => setEventForm(prev => ({ ...prev, eventGregorianDate: e.target.value }))}
                  className="w-full bg-admin-surface-light text-white rounded-lg px-4 py-2 border border-admin-border"
                  aria-label={`تاريخ ${eventForm.title}`}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">اليوم الهجري</label>
                  <input
                    type="number"
                    min={1}
                    max={eventForm.monthLength}
                    value={eventForm.eventHijriDay}
                    onChange={e => setEventForm(prev => ({ ...prev, eventHijriDay: Math.max(1, Math.min(prev.monthLength, parseInt(e.target.value) || 1)) }))}
                    className="w-full bg-admin-surface-light text-white rounded-lg px-4 py-2 border border-admin-border text-center"
                    aria-label="اليوم الهجري للمناسبة"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">الشهر</label>
                  <select
                    value={eventForm.hijriMonth}
                    onChange={e => {
                      const month = parseInt(e.target.value);
                      setEventForm(prev => ({
                        ...prev,
                        hijriMonth: month,
                        monthLength: getHijriMonthDays(prev.hijriYear, month),
                        eventHijriDay: Math.min(prev.eventHijriDay, getHijriMonthDays(prev.hijriYear, month)),
                      }));
                    }}
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
                    value={eventForm.hijriYear}
                    onChange={e => {
                      const year = parseInt(e.target.value) || approximateToday.year;
                      setEventForm(prev => ({
                        ...prev,
                        hijriYear: year,
                        monthLength: getHijriMonthDays(year, prev.hijriMonth),
                        eventHijriDay: Math.min(prev.eventHijriDay, getHijriMonthDays(year, prev.hijriMonth)),
                      }));
                    }}
                    className="w-full bg-admin-surface-light text-white rounded-lg px-4 py-2 border border-admin-border text-center"
                    aria-label="السنة الهجرية"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-admin-border bg-admin-surface-light/60 p-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-400">سيُحفظ داخلياً كبداية شهر {selectedEventMonth?.ar}</span>
                  <span className="font-semibold text-white" dir="ltr">{eventMonthStartGregorian || 'غير صالح'}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">نهاية الشهر</label>
                <div className="flex gap-2">
                  {[29, 30].map(len => (
                    <button
                      key={len}
                      onClick={() => setEventForm(prev => ({
                        ...prev,
                        monthLength: len as 29 | 30,
                        eventHijriDay: Math.min(prev.eventHijriDay, len),
                      }))}
                      className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                        eventForm.monthLength === len
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
                  value={eventForm.source}
                  onChange={e => setEventForm(prev => ({ ...prev, source: e.target.value }))}
                  placeholder="مثال: دار الإفتاء المصرية"
                  className="w-full bg-admin-surface-light text-white rounded-lg px-4 py-2 border border-admin-border"
                  aria-label="المصدر الرسمي"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">رابط المصدر (اختياري)</label>
                <input
                  type="url"
                  value={eventForm.sourceUrl}
                  onChange={e => setEventForm(prev => ({ ...prev, sourceUrl: e.target.value }))}
                  placeholder="https://..."
                  className="w-full bg-admin-surface-light text-white rounded-lg px-4 py-2 border border-admin-border"
                  aria-label="رابط المصدر"
                  dir="ltr"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-slate-300">موثق رسمياً</span>
                <button
                  onClick={() => setEventForm(prev => ({ ...prev, isVerified: !prev.isVerified }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    eventForm.isVerified ? 'bg-accent' : 'bg-admin-surface-light'
                  }`}
                  aria-label="حالة التوثيق"
                >
                  <span className={`absolute left-0.5 top-0.5 inline-block h-4 w-4 rounded-full bg-white transition-transform ${eventForm.isVerified ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                disabled={saving || !eventForm.eventGregorianDate || !eventForm.source || !eventMonthStartGregorian}
                onClick={handleSaveEvent}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-accent hover:bg-accent-dark disabled:opacity-50 text-white rounded-xl transition-colors"
              >
                <Check className="w-4 h-4" />
                {saving ? 'جاري الحفظ...' : 'نشر'}
              </button>
              <button
                onClick={() => setShowEventForm(false)}
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
                  className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors ${form.isVerified ? 'bg-accent' : 'bg-admin-surface-light'}`}
                  aria-label={form.isVerified ? 'موثق رسمياً' : 'غير موثق'}
                >
                  <div className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${form.isVerified ? 'translate-x-6' : 'translate-x-0'}`} />
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
                  <th className="text-center px-4 py-3">اليوم الحالي</th>
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
                    <td className="px-4 py-3 text-center text-white font-semibold">
                      {getCurrentHijriDay(ov) !== null ? (
                        <span className="inline-flex items-center justify-center px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs">
                          {getCurrentHijriDay(ov)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center px-2 py-1 rounded-lg bg-slate-700/70 text-slate-300 text-xs">
                          {getCurrentDayLabel(ov)}
                        </span>
                      )}
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
