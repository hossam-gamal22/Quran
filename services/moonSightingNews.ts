// services/moonSightingNews.ts
// Layer 3 — Google News RSS fallback for moon sighting announcements
// Activated only on days 28-30 of a Hijri month

export interface MoonSightingResult {
  monthLength: 29 | 30;
  source: string;
  url?: string;
}

// ============================================
// Country-specific search queries
// ============================================

const NEWS_QUERIES: Record<string, string[]> = {
  EG: [
    'رؤية هلال مصر',
    'إعلان دار الإفتاء المصرية هلال',
    'موعد عيد الفطر مصر',
  ],
  AE: [
    'رؤية هلال الإمارات',
    'إعلان المجلس الإسلامي الإمارات',
    'موعد عيد الفطر الإمارات',
  ],
  SA: [
    'رؤية هلال المملكة',
    'المحكمة العليا رؤية الهلال',
    'Saudi moon sighting announcement',
  ],
  MA: [
    'رؤية هلال المغرب',
    'وزارة الأوقاف المغربية هلال',
  ],
  PK: [
    'Pakistan moon sighting Ruet-e-Hilal',
    'Pakistan Eid announcement',
  ],
  ID: [
    'Indonesia sidang isbat hilal',
    'Indonesia moon sighting',
  ],
  MY: [
    'cerapan anak bulan Malaysia',
    'Malaysia moon sighting official',
  ],
  TR: [
    'Diyanet hilal ilanı',
    'Turkey moon sighting',
  ],
  JO: [
    'رؤية هلال الأردن',
    'دائرة الإفتاء الأردنية هلال',
  ],
  IQ: [
    'رؤية هلال العراق',
    'المرجعية الدينية هلال العراق',
  ],
  DZ: [
    'رؤية هلال الجزائر',
    'وزارة الشؤون الدينية الجزائر هلال',
  ],
  TN: [
    'رؤية هلال تونس',
    'مفتي تونس هلال',
  ],
  BD: [
    'Bangladesh moon sighting',
    'বাংলাদেশ চাঁদ দেখা',
  ],
  IN: [
    'India moon sighting',
    'Shahi Imam moon sighting India',
  ],
  DEFAULT: [
    'moon sighting Ramadan official',
    'Eid al-Fitr announcement official',
  ],
};

// Keywords that indicate month = 29 days (Eid tomorrow / moon sighted)
const EID_29_KEYWORDS = [
  'غداً عيد', 'عيد غداً', 'ثبت الهلال',
  'رؤية الهلال', 'eid tomorrow', 'moon sighted',
  'crescent sighted', 'hilal confirmed',
  '29 يوم', 'شهر 29', 'تعذرت رؤية',
  'hilal terlihat', 'sidang isbat positif',
];

// Keywords that indicate month = 30 days (moon not sighted)
const COMPLETE_30_KEYWORDS = [
  'لم يُر الهلال', 'إكمال العدة', '30 يوم',
  'moon not sighted', 'hilal not visible',
  'complete 30 days', 'شهر 30', 'تعذر رؤية الهلال',
  'tidak terlihat', 'istikmal',
];

// ============================================
// Simple RSS XML parser
// ============================================

interface RSSItem {
  title: string;
  link: string;
  pubDate: string;
}

function parseRSSItems(xml: string): RSSItem[] {
  const items: RSSItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const title = extractTag(itemXml, 'title');
    const link = extractTag(itemXml, 'link');
    const pubDate = extractTag(itemXml, 'pubDate');
    if (title) {
      items.push({ title, link: link || '', pubDate: pubDate || '' });
    }
  }

  return items;
}

function extractTag(xml: string, tag: string): string | null {
  // Handle CDATA sections
  const cdataRegex = new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`);
  const cdataMatch = cdataRegex.exec(xml);
  if (cdataMatch) return cdataMatch[1].trim();

  const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`);
  const match = regex.exec(xml);
  return match ? match[1].trim() : null;
}

// ============================================
// Main fetch function
// ============================================

export async function fetchMoonSightingNews(
  countryCode: string,
  hijriMonth: number,
  hijriDay: number,
): Promise<MoonSightingResult | null> {
  // Only activate near month transitions
  if (hijriDay < 28) return null;

  const queries = NEWS_QUERIES[countryCode] ?? NEWS_QUERIES.DEFAULT;

  for (const query of queries) {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ar&gl=AE&ceid=AE:ar`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const res = await fetch(rssUrl, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const text = await res.text();

      const items = parseRSSItems(text);

      // Filter to items published in last 48 hours
      const now = Date.now();
      const recent = items.filter(item => {
        if (!item.pubDate) return false;
        try {
          const age = now - new Date(item.pubDate).getTime();
          return age < 48 * 60 * 60 * 1000;
        } catch {
          return false;
        }
      });

      for (const item of recent) {
        const titleLower = item.title.toLowerCase();

        if (EID_29_KEYWORDS.some(k => titleLower.includes(k.toLowerCase()))) {
          return { monthLength: 29, source: item.title, url: item.link };
        }
        if (COMPLETE_30_KEYWORDS.some(k => titleLower.includes(k.toLowerCase()))) {
          return { monthLength: 30, source: item.title, url: item.link };
        }
      }
    } catch {
      clearTimeout(timeout);
      continue;
    }
  }

  return null;
}
