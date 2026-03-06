// ============================================
// API مواقيت الصلاة
// ============================================

const ALADHAN_API_BASE = 'https://api.aladhan.com/v1';

// ============================================
// الأنواع
// ============================================

export interface PrayerTimes {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  Imsak?: string;
  Midnight?: string;
}

export interface PrayerTimesResponse {
  timings: PrayerTimes;
  date: {
    readable: string;
    timestamp: string;
    gregorian: {
      date: string;
      day: string;
      weekday: { en: string };
      month: { number: number; en: string };
      year: string;
    };
    hijri: {
      date: string;
      day: string;
      weekday: { en: string; ar: string };
      month: { number: number; en: string; ar: string };
      year: string;
      designation: { abbreviated: string; expanded: string };
    };
  };
  meta: {
    latitude: number;
    longitude: number;
    timezone: string;
    method: {
      id: number;
      name: string;
    };
  };
}

export interface CalculationMethod {
  id: number;
  name: string;
  nameAr: string;
  params: {
    Fajr: number;
    Isha: number | string;
  };
}

export interface Location {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  timezone?: string;
}

// ============================================
// طرق الحساب
// ============================================

export const CALCULATION_METHODS: CalculationMethod[] = [
  { id: 0, name: 'Shia Ithna-Ansari', nameAr: 'شيعة إثنا عشرية', params: { Fajr: 16, Isha: 14 } },
  { id: 1, name: 'University of Islamic Sciences, Karachi', nameAr: 'جامعة العلوم الإسلامية - كراتشي', params: { Fajr: 18, Isha: 18 } },
  { id: 2, name: 'Islamic Society of North America', nameAr: 'الجمعية الإسلامية لأمريكا الشمالية', params: { Fajr: 15, Isha: 15 } },
  { id: 3, name: 'Muslim World League', nameAr: 'رابطة العالم الإسلامي', params: { Fajr: 18, Isha: 17 } },
  { id: 4, name: 'Umm Al-Qura University, Makkah', nameAr: 'جامعة أم القرى - مكة', params: { Fajr: 18.5, Isha: '90 min' } },
  { id: 5, name: 'Egyptian General Authority of Survey', nameAr: 'الهيئة المصرية العامة للمساحة', params: { Fajr: 19.5, Isha: 17.5 } },
  { id: 7, name: 'Institute of Geophysics, University of Tehran', nameAr: 'معهد الجيوفيزياء - طهران', params: { Fajr: 17.7, Isha: 14 } },
  { id: 8, name: 'Gulf Region', nameAr: 'منطقة الخليج', params: { Fajr: 19.5, Isha: '90 min' } },
  { id: 9, name: 'Kuwait', nameAr: 'الكويت', params: { Fajr: 18, Isha: 17.5 } },
  { id: 10, name: 'Qatar', nameAr: 'قطر', params: { Fajr: 18, Isha: '90 min' } },
  { id: 11, name: 'Majlis Ugama Islam Singapura', nameAr: 'سنغافورة', params: { Fajr: 20, Isha: 18 } },
  { id: 12, name: 'Union Organization Islamic de France', nameAr: 'الاتحاد الإسلامي الفرنسي', params: { Fajr: 12, Isha: 12 } },
  { id: 13, name: 'Diyanet İşleri Başkanlığı, Turkey', nameAr: 'رئاسة الشؤون الدينية التركية', params: { Fajr: 18, Isha: 17 } },
  { id: 14, name: 'Spiritual Administration of Muslims of Russia', nameAr: 'الإدارة الروحية لمسلمي روسيا', params: { Fajr: 16, Isha: 15 } },
];

// ============================================
// أسماء الصلوات
// ============================================

export const PRAYER_NAMES: { [key: string]: { ar: string; en: string } } = {
  Fajr: { ar: 'الفجر', en: 'Fajr' },
  Sunrise: { ar: 'الشروق', en: 'Sunrise' },
  Dhuhr: { ar: 'الظهر', en: 'Dhuhr' },
  Asr: { ar: 'العصر', en: 'Asr' },
  Maghrib: { ar: 'المغرب', en: 'Maghrib' },
  Isha: { ar: 'العشاء', en: 'Isha' },
  Imsak: { ar: 'الإمساك', en: 'Imsak' },
  Midnight: { ar: 'منتصف الليل', en: 'Midnight' },
};

// ============================================
// دوال API
// ============================================

export async function fetchPrayerTimesByCoords(
  latitude: number,
  longitude: number,
  method: number = 4,
  date?: Date
): Promise<PrayerTimesResponse> {
  try {
    const dateStr = date 
      ? `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`
      : undefined;
    
    let url = `${ALADHAN_API_BASE}/timings`;
    if (dateStr) {
      url += `/${dateStr}`;
    }
    url += `?latitude=${latitude}&longitude=${longitude}&method=${method}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.code === 200) {
      return data.data;
    }
    throw new Error('Failed to fetch prayer times');
  } catch (error) {
    console.error('Error fetching prayer times:', error);
    throw error;
  }
}

export async function fetchPrayerTimesByCity(
  city: string,
  country: string,
  method: number = 4,
  date?: Date
): Promise<PrayerTimesResponse> {
  try {
    const dateStr = date 
      ? `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`
      : undefined;
    
    let url = `${ALADHAN_API_BASE}/timingsByCity`;
    if (dateStr) {
      url += `/${dateStr}`;
    }
    url += `?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.code === 200) {
      return data.data;
    }
    throw new Error('Failed to fetch prayer times');
  } catch (error) {
    console.error('Error fetching prayer times:', error);
    throw error;
  }
}

export async function fetchMonthlyPrayerTimes(
  latitude: number,
  longitude: number,
  month: number,
  year: number,
  method: number = 4
): Promise<PrayerTimesResponse[]> {
  try {
    const url = `${ALADHAN_API_BASE}/calendar/${year}/${month}?latitude=${latitude}&longitude=${longitude}&method=${method}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.code === 200) {
      return data.data;
    }
    throw new Error('Failed to fetch monthly prayer times');
  } catch (error) {
    console.error('Error fetching monthly prayer times:', error);
    throw error;
  }
}

export async function fetchHijriDate(date?: Date): Promise<{
  hijri: PrayerTimesResponse['date']['hijri'];
  gregorian: PrayerTimesResponse['date']['gregorian'];
}> {
  const targetDate = date || new Date();
  
  // Try the Aladhan API first with timeout
  try {
    const dateStr = `${targetDate.getDate()}-${targetDate.getMonth() + 1}-${targetDate.getFullYear()}`;
    const url = `${ALADHAN_API_BASE}/gpiToH/${dateStr}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();

    if (data.code === 200) {
      return data.data;
    }
    throw new Error('Invalid response code from API');
  } catch (apiError) {
    console.warn('Aladhan API failed, falling back to local conversion:', apiError);
    
    // Fallback to local calculation using gregorianToHijri
    try {
      const { gregorianToHijri, HIJRI_MONTHS_AR, HIJRI_MONTHS_EN, WEEKDAYS_AR, WEEKDAYS_EN } = await import('./hijri-date');
      
      const hijri = gregorianToHijri(targetDate);
      const weekdayIndex = targetDate.getDay();
      
      return {
        hijri: {
          date: `${hijri.day} ${HIJRI_MONTHS_AR[hijri.month - 1]} ${hijri.year}`,
          day: String(hijri.day),
          weekday: { en: WEEKDAYS_EN[weekdayIndex], ar: WEEKDAYS_AR[weekdayIndex] },
          month: { 
            number: hijri.month, 
            en: HIJRI_MONTHS_EN[hijri.month - 1], 
            ar: HIJRI_MONTHS_AR[hijri.month - 1] 
          },
          year: String(hijri.year),
          designation: { abbreviated: 'AH', expanded: 'بعد الهجرة' },
        },
        gregorian: {
          date: targetDate.toLocaleDateString('en-GB'),
          day: String(targetDate.getDate()),
          weekday: { en: WEEKDAYS_EN[weekdayIndex] },
          month: { number: targetDate.getMonth() + 1, en: String(targetDate.getMonth() + 1) },
          year: String(targetDate.getFullYear()),
        },
      };
    } catch (fallbackError) {
      console.error('Fallback conversion also failed:', fallbackError);
      throw new Error('Failed to fetch/calculate hijri date');
    }
  }
}

// ============================================
// مساعدات
// ============================================

export function formatTime(time: string, format: '12h' | '24h' = '12h'): string {
  if (!time) return '';
  
  const [hours, minutes] = time.split(':').map(Number);
  
  if (format === '24h') {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
  
  const period = hours >= 12 ? 'م' : 'ص';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
}

export function getNextPrayer(prayerTimes: PrayerTimes): {
  name: string;
  time: string;
  remaining: string;
} | null {
  const now = new Date();
  const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
  
  for (const prayer of prayers) {
    const [hours, minutes] = prayerTimes[prayer].split(':').map(Number);
    const prayerTime = new Date(now);
    prayerTime.setHours(hours, minutes, 0, 0);
    
    if (prayerTime > now) {
      const diff = prayerTime.getTime() - now.getTime();
      const hoursRemaining = Math.floor(diff / (1000 * 60 * 60));
      const minutesRemaining = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      return {
        name: prayer,
        time: prayerTimes[prayer],
        remaining: hoursRemaining > 0 
          ? `${hoursRemaining} ساعة و ${minutesRemaining} دقيقة`
          : `${minutesRemaining} دقيقة`,
      };
    }
  }
  
  // إذا مرت كل الصلوات، الصلاة التالية هي الفجر
  return {
    name: 'Fajr',
    time: prayerTimes.Fajr,
    remaining: 'غداً',
  };
}

export function getPrayerIcon(prayerName: string): string {
  const icons: { [key: string]: string } = {
    Fajr: 'partly-sunny-outline',
    Sunrise: 'sunny-outline',
    Dhuhr: 'sunny',
    Asr: 'sunny-outline',
    Maghrib: 'cloudy-night-outline',
    Isha: 'moon-outline',
  };
  return icons[prayerName] || 'time-outline';
}

export function getPrayerColor(prayerName: string): string {
  const colors: { [key: string]: string } = {
    Fajr: '#6366F1',
    Sunrise: '#F59E0B',
    Dhuhr: '#EAB308',
    Asr: '#F97316',
    Maghrib: '#EC4899',
    Isha: '#8B5CF6',
  };
  return colors[prayerName] || '#059669';
}
