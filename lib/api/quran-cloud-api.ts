// lib/api/quran-cloud-api.ts
// Quran Cloud API للفيديوهات والبيانات

export interface QuranAyah {
  number: number;
  text: string;
  numberInSurah?: number;
  surah: {
    number: number;
    name: string;
    englishName: string;
  };
  translation?: string;
}

export interface QuranAyahWithAudio extends QuranAyah {
  audio: string;
  audioSecondary?: string[];
}

export interface Reciter {
  identifier: string;
  name: string;
  englishName: string;
}

/**
 * حساب رقم آية يومي ثابت بناءً على يوم السنة
 */
function getDailyAyahNumber(): number {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return (dayOfYear % 6236) + 1;
}

// الحصول على آية اليوم
export async function getTodayAyah(): Promise<QuranAyah | null> {
  try {
    const ayahNumber = getDailyAyahNumber();
    
    const response = await fetch(
      `https://api.alquran.cloud/v1/ayah/${ayahNumber}/quran-uthmani`
    );
    
    if (!response.ok) throw new Error('Failed to fetch ayah');
    
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error fetching today ayah:', error);
    return null;
  }
}

// الحصول على قائمة المقرئين
export async function getReciters(): Promise<Reciter[]> {
  try {
    const response = await fetch('https://api.alquran.cloud/v1/reciters');
    
    if (!response.ok) throw new Error('Failed to fetch reciters');
    
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error fetching reciters:', error);
    return [];
  }
}

// الحصول على تسجيل الآية من مقرئ معين
export async function getAyahAudio(
  ayahNumber: number,
  reciterId: number = 4 // الشيخ سعد الغامدي
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.alquran.cloud/v1/ayah/${ayahNumber}/ar.muyassar/editions/${reciterId}`
    );
    
    if (!response.ok) throw new Error('Failed to fetch audio');
    
    const data = await response.json();
    return data.data?.audioUrl || null;
  } catch (error) {
    console.error('Error fetching audio:', error);
    return null;
  }
}

/**
 * الحصول على آية اليوم مع التلاوة الصوتية بصوت الشيخ مشاري راشد العفاسي
 * تعتمد على يوم السنة للحصول على نفس الآية طوال اليوم
 */
export async function getTodayAyahWithAudio(): Promise<QuranAyahWithAudio | null> {
  try {
    const ayahNumber = getDailyAyahNumber();
    const response = await fetch(
      `https://api.alquran.cloud/v1/ayah/${ayahNumber}/ar.alafasy`
    );
    if (!response.ok) throw new Error('Failed to fetch ayah');
    const data = await response.json();
    return data.data || null;
  } catch (error) {
    console.error('Error fetching ayah with audio:', error);
    return null;
  }
}
