// Prayer Times Service
const _P = 'https://api.aladhan.com/v1';

export interface PrayerTimes {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Sunset: string;
  Maghrib: string;
  Isha: string;
  Imsak: string;
  Midnight: string;
  Firstthird: string;
  Lastthird: string;
}

export interface PrayerTimesData {
  timings: PrayerTimes;
  date: {
    readable: string;
    timestamp: string;
    gregorian: {
      date: string;
      format: string;
      day: string;
      weekday: { en: string };
      month: { number: number; en: string };
      year: string;
    };
    hijri: {
      date: string;
      format: string;
      day: string;
      weekday: { en: string; ar: string };
      month: { number: number; en: string; ar: string };
      year: string;
      holidays: string[];
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

export interface QiblaData {
  latitude: number;
  longitude: number;
  bearing: number;
}

// Calculation methods
export const CALCULATION_METHODS = [
  { id: 1, name: 'University of Islamic Sciences, Karachi' },
  { id: 2, name: 'Islamic Society of North America (ISNA)' },
  { id: 3, name: 'Muslim World League' },
  { id: 4, name: 'Umm Al-Qura University, Makkah' },
  { id: 5, name: 'Egyptian General Authority of Survey' },
  { id: 7, name: 'Institute of Geophysics, University of Tehran' },
  { id: 8, name: 'Gulf Region' },
  { id: 9, name: 'Kuwait' },
  { id: 10, name: 'Qatar' },
  { id: 11, name: 'Majlis Ugama Islam Singapura, Singapore' },
  { id: 12, name: 'Union Organization islamic de France' },
  { id: 13, name: 'Diyanet İşleri Başkanlığı, Turkey' },
  { id: 14, name: 'Spiritual Administration of Muslims of Russia' },
];

// Fetch prayer times by coordinates
export async function fetchPrayerTimesByCoords(
  latitude: number,
  longitude: number,
  method: number = 4,
  date?: string
): Promise<PrayerTimesData> {
  const dateStr = date || new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
  const response = await fetch(
    `${_P}/timings/${dateStr}?latitude=${latitude}&longitude=${longitude}&method=${method}`
  );
  const data = await response.json();
  if (data.code === 200) {
    return data.data;
  }
  throw new Error('Failed to fetch prayer times');
}

// Fetch prayer times by city
export async function fetchPrayerTimesByCity(
  city: string,
  country: string,
  method: number = 4
): Promise<PrayerTimesData> {
  const dateStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
  const response = await fetch(
    `${_P}/timingsByCity/${dateStr}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}`
  );
  const data = await response.json();
  if (data.code === 200) {
    return data.data;
  }
  throw new Error('Failed to fetch prayer times by city');
}

// Fetch Qibla direction
export async function fetchQiblaDirection(
  latitude: number,
  longitude: number
): Promise<QiblaData> {
  const response = await fetch(`${_P}/qibla/${latitude}/${longitude}`);
  const data = await response.json();
  if (data.code === 200) {
    return data.data;
  }
  throw new Error('Failed to fetch Qibla direction');
}

// Prayer names in Arabic
export const PRAYER_NAMES_AR: Record<string, string> = {
  Fajr: 'الفجر',
  Sunrise: 'الشروق',
  Dhuhr: 'الظهر',
  Asr: 'العصر',
  Maghrib: 'المغرب',
  Isha: 'العشاء',
};

// Get next prayer
export function getNextPrayer(timings: PrayerTimes): { name: string; time: string; arabicName: string } | null {
  const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;

  for (const prayer of prayers) {
    const timeStr = timings[prayer as keyof PrayerTimes];
    const [hours, minutes] = timeStr.split(':').map(Number);
    const prayerTimeInMinutes = hours * 60 + minutes;

    if (prayerTimeInMinutes > currentTimeInMinutes) {
      return {
        name: prayer,
        time: timeStr,
        arabicName: PRAYER_NAMES_AR[prayer] || prayer,
      };
    }
  }

  // If all prayers have passed, next is Fajr tomorrow
  return {
    name: 'Fajr',
    time: timings.Fajr,
    arabicName: 'الفجر',
  };
}

// Calculate time remaining until next prayer
export function getTimeUntilPrayer(prayerTime: string): string {
  const now = new Date();
  const [hours, minutes] = prayerTime.split(':').map(Number);
  const prayerDate = new Date();
  prayerDate.setHours(hours, minutes, 0, 0);

  if (prayerDate < now) {
    prayerDate.setDate(prayerDate.getDate() + 1);
  }

  const diffMs = prayerDate.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffHours > 0) {
    return `${diffHours}س ${diffMinutes}د`;
  }
  return `${diffMinutes} دقيقة`;
}
