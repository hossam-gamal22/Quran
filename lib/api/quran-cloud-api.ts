// lib/api/quran-cloud-api.ts
// Quran Cloud API للفيديوهات والبيانات

export interface QuranAyah {
  number: number;
  text: string;
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

// الحصول على آية اليوم
export async function getTodayAyah(): Promise<QuranAyah | null> {
  try {
    // حساب رقم عشوائي بين 1-6236 (إجمالي آيات القرآن)
    const randomAyah = Math.floor(Math.random() * 6236) + 1;
    
    const response = await fetch(
      `https://api.alquran.cloud/v1/ayah/${randomAyah}/ar.asad`
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
 * الحصول على آية عشوائية مع التلاوة الصوتية بصوت الشيخ مشاري راشد العفاسي
 */
export async function getTodayAyahWithAudio(): Promise<QuranAyahWithAudio | null> {
  try {
    const randomAyah = Math.floor(Math.random() * 6236) + 1;
    const response = await fetch(
      `https://api.alquran.cloud/v1/ayah/${randomAyah}/ar.alafasy`
    );
    if (!response.ok) throw new Error('Failed to fetch ayah');
    const data = await response.json();
    return data.data || null;
  } catch (error) {
    console.error('Error fetching ayah with audio:', error);
    return null;
  }
}
