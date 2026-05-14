import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';

// Expo Access Token for authenticated push API calls
const expoAccessToken = defineSecret('EXPO_ACCESS_TOKEN');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const logger = functions.logger;

/** Expo Push Message structure */
interface ExpoPushMessage {
  to: string;
  title?: string;
  body?: string;
  data?: Record<string, string>;
  sound?: string;
  badge?: number;
  ttl?: number;
  expiration?: number;
  priority?: 'default' | 'normal' | 'high';
  mutableContent?: boolean;
  categoryId?: string;
  channelId?: string;
}

/** Expo API Response */
interface ExpoTicket {
  id: string;
  status: 'ok' | 'error';
  message?: string;
  details?: {
    error?: string;
    errorCode?: string;
  };
}

interface ExpoResponse {
  data: ExpoTicket[];
}

interface AutoQaSource {
  title: string;
  url: string;
  snippet: string;
}

type SupportedLanguage = 'ar' | 'en' | 'fr' | 'de' | 'es' | 'tr' | 'ur' | 'id' | 'ms' | 'hi' | 'bn' | 'ru';

type NotificationTranslations = Partial<Record<SupportedLanguage, {
  title?: string;
  body?: string;
}>>;

interface AdminNotificationTargetUser {
  id: string;
  fcmToken: string;
  platform: string;
  language: string;
  country: string;
  countrySource: string;
  countryVerified: boolean;
  lastActive?: admin.firestore.Timestamp | null;
}

const EXPO_PUSH_APIS = [
  'https://api.expo.dev/v2/push/send',
  'https://exp.host/--/api/v2/push/send',
];

const EXPO_REQUEST_TIMEOUT_MS = 15000;
const AUTO_QA_DISCLAIMER =
  'تنبيه: هذه إجابة بحثية آلية مبنية على المصادر المتاحة، وقد لا تكون دقيقة بنسبة 100%. حاولنا بذل أقصى جهد لتقديم أقرب إفادة، ويُفضّل الرجوع لأهل العلم في المسائل الشخصية أو الحساسة.';
const DEFAULT_AUTO_QA_ALLOWED_SITES = [
  'islamweb.net',
  'islamqa.info',
  'binbaz.org.sa',
  'dorar.net',
  'azhar.eg',
  'dar-alifta.org',
];
const DEFAULT_GOOGLE_CSE_ID = 'c6f274d18190e48ae';
const ISLAMWEB_BASE = 'https://www.islamweb.net';
const ISLAMQA_BASE = 'https://islamqa.info';
const DORAR_BASE = 'https://dorar.net';
const ARABIC_SYNONYM_GROUPS = [
  ['صلاة', 'الصلاة', 'يصلي', 'اصلي', 'صلي', 'الصلوات'],
  ['وضوء', 'الوضوء', 'يتوضأ', 'اتوضا', 'انتقض', 'ينقض'],
  ['غسل', 'الغسل', 'اغتسال', 'جنابة', 'طهارة'],
  ['صيام', 'الصيام', 'صوم', 'الصوم', 'رمضان', 'افطار', 'إفطار', 'فطر'],
  ['زكاة', 'الزكاة', 'صدقة', 'الصدقة', 'مال', 'نصاب'],
  ['حج', 'الحج', 'عمرة', 'العمرة', 'احرام', 'إحرام', 'طواف', 'سعي'],
  ['طلاق', 'الطلاق', 'طلقت', 'يطلق', 'خلع', 'الخلع', 'فسخ'],
  ['زواج', 'الزواج', 'نكاح', 'النكاح', 'خطبة', 'الخطبة'],
  ['ميراث', 'الميراث', 'ورث', 'تركة', 'التركة', 'مواريث', 'الفرائض'],
  ['يمين', 'اليمين', 'حلف', 'حلفت', 'قسم', 'كفارة', 'الكفارة'],
  ['ربا', 'الربا', 'فوائد', 'الفوائد', 'قرض', 'القرض', 'دين', 'الدين'],
  ['بيع', 'البيع', 'شراء', 'الشراء', 'تجارة', 'التجارة', 'عقد', 'العقد'],
  ['دعاء', 'الدعاء', 'اذكار', 'أذكار', 'ذكر', 'الذكر'],
  ['حيض', 'الحيض', 'دورة', 'الدورة', 'نفاس', 'استحاضة'],
  ['لباس', 'اللباس', 'حجاب', 'الحجاب', 'زينة', 'تبرج'],
];

function sanitizeAllowedSite(value: string): string {
  const cleaned = String(value)
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/^\*\./, '')
    .replace(/\/.*$/, '')
    .replace(/\*+$/g, '')
    .toLowerCase();

  return cleaned.replace(/[^a-z0-9.-]/g, '');
}

function getQaConfigValue(key: string): string {
  const envKey = `QA_${key.toUpperCase()}`;
  const envValue = process.env[envKey];
  if (envValue) return envValue;

  try {
    return functions.config().qa?.[key] || '';
  } catch {
    return '';
  }
}

function getAllowedQaSites(configuredSites?: string[] | string): string[] {
  if (Array.isArray(configuredSites)) {
    const sites = configuredSites
      .map(sanitizeAllowedSite)
      .filter(Boolean);
    if (sites.length > 0) return sites;
  }

  if (typeof configuredSites === 'string' && configuredSites.trim()) {
    const sites = configuredSites
      .split(/[,\n،]+/)
      .map(sanitizeAllowedSite)
      .filter(Boolean);
    if (sites.length > 0) return sites;
  }

  const configured = getQaConfigValue('allowed_sites');
  if (!configured) return DEFAULT_AUTO_QA_ALLOWED_SITES;

  return configured
    .split(/[,\n،]+/)
    .map(sanitizeAllowedSite)
    .filter(Boolean);
}

function getQaDailyLimit(_configuredLimit?: unknown): number | null {
  return null;
}

function getUtcDayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

async function reserveAutoQaSearchQuota(dailyLimit: number | null): Promise<boolean> {
  if (!dailyLimit || dailyLimit <= 0) return true;

  const dayKey = getUtcDayKey();
  const ref = db.doc(`appUsage/qaAssistant_${dayKey}`);

  return db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const currentCount = Number(snap.data()?.count || 0);
    if (currentCount >= dailyLimit) return false;

    transaction.set(ref, {
      count: currentCount + 1,
      limit: dailyLimit,
      date: dayKey,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return true;
  });
}

function normalizeArabicText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function buildExpandedSearchQuery(question: string, allowedSites: string[]): string {
  const normalizedQuestion = normalizeArabicText(question);
  const expansions = ARABIC_SYNONYM_GROUPS
    .filter((group) => group.some((term) => normalizedQuestion.includes(normalizeArabicText(term))))
    .slice(0, 3)
    .map((group) => `(${group.slice(0, 6).join(' OR ')})`);

  const siteFilter = allowedSites.map((site) => `site:${site}`).join(' OR ');
  return [question, ...expansions, siteFilter].join(' ').slice(0, 1500);
}

function buildMeaningSearchQuery(question: string): string {
  const normalized = normalizeArabicText(question);
  const stopWords = new Set([
    'ما', 'ماذا', 'هو', 'هي', 'هل', 'عن', 'في', 'من', 'الي', 'الى', 'علي', 'على',
    'حكم', 'احكام', 'الفرق', 'بين', 'ماهو', 'ماهي', 'وش', 'ايه', 'كيف', 'هل يجوز',
  ]);
  const keywords = normalized
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 1 && !stopWords.has(word));

  const expansionTerms = ARABIC_SYNONYM_GROUPS
    .filter((group) => group.some((term) => normalized.includes(normalizeArabicText(term))))
    .flatMap((group) => group.slice(0, 4))
    .map(normalizeArabicText);

  return Array.from(new Set([...keywords, ...expansionTerms, 'فتوي', 'اسلام']))
    .join(' ')
    .slice(0, 400);
}

/**
 * Extract the meaningful content keywords from a question (strip stop words).
 * Used for relevance scoring between question and extracted/source content.
 */
function extractQuestionKeywords(question: string): string[] {
  const stopWords = new Set([
    'ما', 'ماذا', 'هو', 'هي', 'هل', 'عن', 'في', 'من', 'الي', 'الى', 'علي', 'على',
    'حكم', 'احكام', 'الفرق', 'بين', 'ماهو', 'ماهي', 'وش', 'ايه', 'كيف',
    'هل يجوز', 'يجوز', 'شرح', 'معنى', 'معني', 'اريد', 'أريد', 'سؤال', 'جواب',
    'اسلام', 'الاسلام', 'الدين', 'الشريعة', 'افيدوني', 'أفيدوني',
  ]);
  return normalizeArabicText(question)
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));
}

/**
 * Returns 0–1 fraction of question keywords found in text.
 * A score below 0.2 means the content is likely unrelated to the question.
 */
function scoreRelevance(question: string, text: string): number {
  const keywords = extractQuestionKeywords(question);
  if (keywords.length === 0) return 1;
  const normalizedText = normalizeArabicText(text);
  const hits = keywords.filter((kw) => normalizedText.includes(kw)).length;
  return hits / keywords.length;
}

function getAutoQaSiteFallbackLimit(): number {
  const configured = Number(getQaConfigValue('site_fallback_limit'));
  if (Number.isFinite(configured) && configured > 0) return Math.min(allowedInteger(configured), 8);
  return 6;
}

function allowedInteger(value: number): number {
  return Math.max(1, Math.floor(value));
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripHtml(value: string): string {
  return decodeHtmlEntities(value.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSearchResultUrl(rawUrl: string): string {
  const decoded = decodeHtmlEntities(rawUrl);
  if (decoded.startsWith('//')) return `https:${decoded}`;

  try {
    const url = new URL(decoded, 'https://duckduckgo.com');
    const duckDuckGoTarget = url.searchParams.get('uddg');
    if (duckDuckGoTarget) return decodeURIComponent(duckDuckGoTarget);
    return url.toString();
  } catch {
    return decoded;
  }
}

function isAllowedSourceUrl(urlValue: string, allowedSites: string[]): boolean {
  try {
    const hostname = new URL(urlValue).hostname.replace(/^www\./, '').toLowerCase();
    return allowedSites.some((site) => hostname === site || hostname.endsWith(`.${site}`));
  } catch {
    return allowedSites.some((site) => urlValue.includes(site));
  }
}

function getSourceHost(urlValue: string): string {
  try {
    return new URL(urlValue).hostname.replace(/^www\./, '');
  } catch {
    return urlValue;
  }
}

/** Clean raw extracted text: collapse whitespace, strip leading answer labels */
function cleanExtractedText(raw: string, maxLen = 900): string {
  return raw
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s:：—–-]*(الجواب|الإجابة|الرد|الفتوى)[\s:：—–-]*/u, '')
    .trim()
    .slice(0, maxLen)
    .trim();
}

/**
 * Returns true if the text looks like a navigation menu or catalog list
 * rather than an actual fatwa/answer (e.g. dorar.net encyclopedia category list).
 */
function looksLikeNavigation(text: string): boolean {
  // Repeated "موسوعة" pattern — encyclopedia catalog / sidebar nav
  const encyclopediaCount = (text.match(/موسوعة/g) || []).length;
  if (encyclopediaCount >= 3) return true;

  // Too many short tokens with no actual sentences — navigation list heuristic
  const words = text.trim().split(/\s+/);
  if (words.length < 6) return false; // too short to judge
  const avgWordLen = words.reduce((s, w) => s + w.length, 0) / words.length;
  // Real Arabic sentences have longer average word length; nav items are short titles
  if (avgWordLen < 3.5 && words.length > 8) return true;

  // Common navigation / footer phrases repeated multiple times
  const navPhrases = ['شارك معنا', 'قراءة في كتاب', 'نفائس الموسوعات', 'مقالات وبحوث', 'أحاديث منتشرة لا تصح'];
  const navHits = navPhrases.filter((p) => text.includes(p)).length;
  if (navHits >= 2) return true;

  return false;
}

/**
 * Fetch a specific fatwa/answer page and extract the main answer text.
 * Tries site-specific selectors first, then falls back to Arabic keyword search.
 */
async function extractFatwaContent(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; RoohAlMuslimBot/1.0)',
        'accept-language': 'ar,en;q=0.8',
        accept: 'text/html',
      },
    });
    if (!response.ok) return '';
    const html = await response.text();

    // ── Strategy 1: site-specific content divs ──────────────────────────────
    const hostname = (() => {
      try { return new URL(url).hostname.replace(/^www\./, ''); }
      catch { return ''; }
    })();

    const selectorPatterns: RegExp[] = [];

    if (hostname === 'islamweb.net') {
      selectorPatterns.push(
        /(?:class|id)="[^"]*(?:FatwaContent|fatwa-content|fatwa_content|fatwaContent)[^"]*"[^>]*>([\s\S]{80,5000}?)<\/div>/i,
        /(?:class|id)="[^"]*(?:art-content|article-content|main-content)[^"]*"[^>]*>([\s\S]{80,5000}?)<\/div>/i,
      );
    } else if (hostname === 'islamqa.info') {
      selectorPatterns.push(
        /(?:class|id)="[^"]*(?:answer-body|answer|block answer|entry-content)[^"]*"[^>]*>([\s\S]{80,5000}?)<\/div>/i,
      );
    } else if (hostname === 'binbaz.org.sa') {
      selectorPatterns.push(
        /(?:class|id)="[^"]*(?:fatwa-content|content-area|entry-content|the-content)[^"]*"[^>]*>([\s\S]{80,5000}?)<\/div>/i,
      );
    } else if (hostname === 'dorar.net') {
      selectorPatterns.push(
        /(?:class|id)="[^"]*(?:content|main-text|feqhia-content)[^"]*"[^>]*>([\s\S]{80,5000}?)<\/div>/i,
      );
    }

    // Generic fallback selectors
    selectorPatterns.push(
      /<article[^>]*>([\s\S]{80,5000}?)<\/article>/i,
      /(?:class|id)="[^"]*(?:content|main|post-content|page-content)[^"]*"[^>]*>([\s\S]{80,5000}?)<\/(?:div|section|main)>/i,
    );

    for (const rx of selectorPatterns) {
      const m = html.match(rx);
      if (m) {
        const text = cleanExtractedText(stripHtml(m[1]));
        if (text.length >= 80 && !looksLikeNavigation(text)) return text;
      }
    }

    // ── Strategy 2: keyword-based — find "الجواب" / "الإجابة" in raw HTML ──
    const markers = ['الجواب', 'الإجابة', 'الفتوى', 'الرد'];
    let bestIdx = -1;
    for (const marker of markers) {
      const idx = html.indexOf(marker);
      if (idx > 0 && (bestIdx === -1 || idx < bestIdx)) bestIdx = idx;
    }

    if (bestIdx > 0) {
      // Skip the tag that contains the keyword itself (it might be a heading)
      const window = html.slice(bestIdx, bestIdx + 6000);
      const text = cleanExtractedText(stripHtml(window));
      if (text.length >= 80 && !looksLikeNavigation(text)) return text;
    }

    // ── Strategy 3: harvest RTL paragraphs ───────────────────────────────────
    const paras: string[] = [];
    const paraRx = /<p[^>]*(?:dir="rtl"|lang="ar")[^>]*>([\s\S]{30,800}?)<\/p>/gi;
    let m2: RegExpExecArray | null;
    while ((m2 = paraRx.exec(html)) && paras.length < 5) {
      const t = stripHtml(m2[1]).trim();
      if (t.length > 30 && !looksLikeNavigation(t) && !/جميع الحقوق|©|cookie|copyright/i.test(t)) {
        paras.push(t);
      }
    }
    if (paras.length > 0) {
      const joined = cleanExtractedText(paras.join('\n'), 900);
      if (!looksLikeNavigation(joined)) return joined;
    }

    return '';
  } catch {
    return '';
  } finally {
    clearTimeout(timer);
  }
}

function buildAutoQaAnswer(question: string, sources: AutoQaSource[], extractedContent?: string): string {
  // Priority 1: actual content fetched from a fatwa page
  if (extractedContent && extractedContent.length >= 80) {
    return `${extractedContent}\n\n${AUTO_QA_DISCLAIMER}`;
  }

  // Priority 2: compile meaningful snippets from the sources themselves
  // Only use snippets that are relevant to the question (contain at least 1 keyword)
  const GENERIC_SNIPPET_RX = /اضغط هنا|للاطلاع على|نتائج البحث في/;
  const meaningfulSources = sources.filter(
    (s) =>
      s.snippet &&
      s.snippet.length > 40 &&
      !GENERIC_SNIPPET_RX.test(s.snippet) &&
      scoreRelevance(question, s.snippet) > 0
  );
  if (meaningfulSources.length > 0) {
    const compiled = meaningfulSources
      .slice(0, 3)
      .map((s) => s.snippet)
      .join('\n\n');
    return `${compiled}\n\n${AUTO_QA_DISCLAIMER}`;
  }

  // Priority 3: generic fallback (no content, no relevant snippets)
  return `وجدت لك أقرب مصادر مرتبطة بسؤالك مع الروابط أدناه.\n\n${AUTO_QA_DISCLAIMER}`;
}

function getCuratedFallbackSources(question: string): AutoQaSource[] {
  const normalized = normalizeArabicText(question);
  const has = (terms: string[]) => terms.some((t) => normalized.includes(normalizeArabicText(t)));

  // Ramadan / Iftar
  if (has(['رمضان']) && has(['افطار', 'افطر', 'الفطر', 'فطر'])) {
    return [
      {
        title: 'حكم من أفطر متعمدًا في رمضان - موقع الشيخ ابن باز',
        url: 'https://binbaz.org.sa/fatwas/13590/%D8%AD%D9%83%D9%85-%D9%85%D9%86-%D8%A7%D9%81%D8%B7%D8%B1-%D9%85%D8%AA%D8%B9%D9%85%D8%AF%D8%A7-%D9%81%D9%8A-%D8%B1%D9%85%D8%B6%D8%A7%D9%86',
        snippet: 'يجب عليه القضاء، وعليه التوبة إلى الله عن تفريطه وإفطاره، وما روي أن من أفطر يوما من رمضان بغير عذر لم يقض عنه صيام الدهر حديث ضعيف لا يصح.',
      },
      {
        title: 'حكم من أفطر يوما عمدا في رمضان - إسلام ويب',
        url: 'https://www.islamweb.net/ar/fatwa/138899/%D8%AD%D9%83%D9%85-%D9%85%D9%86-%D8%A3%D9%81%D8%B7%D8%B1-%D9%8A%D9%88%D9%85%D8%A7-%D8%B9%D9%85%D8%AF%D8%A7-%D9%81%D9%8A-%D8%B1%D9%85%D8%B6%D8%A7%D9%86',
        snippet: 'الفطر في رمضان عمدا من كبائر الذنوب، وعلى من وقع في ذلك التوبة والندم والعزم على عدم الإفطار بغير عذر شرعي، مع قضاء ذلك اليوم.',
      },
      {
        title: 'حكم من أفطر في رمضان متعمدا من غير عذر - موقع الشيخ ابن باز',
        url: 'https://binbaz.org.sa/fatwas/11493/%D8%AD%D9%83%D9%85-%D9%85%D9%86-%D8%A7%D9%81%D8%B7%D8%B1-%D9%81%D9%8A-%D8%B1%D9%85%D8%B6%D8%A7%D9%86-%D9%85%D8%AA%D8%B9%D9%85%D8%AF%D8%A7-%D9%85%D9%86-%D8%BA%D9%8A%D8%B1-%D8%B9%D8%B0%D8%B1',
        snippet: 'إذا كان الإفطار بغير جماع فعليه التوبة والقضاء، أما إن كان بجماع فعليه الكفارة مع قضاء اليوم والتوبة.',
      },
      {
        title: 'الإفطار في نهار رمضان بغير عذر - الدرر السنية',
        url: 'https://dorar.net/feqhia/2813',
        snippet: 'مصدر فقهي يجمع الكلام حول الإفطار في نهار رمضان بغير عذر، وما يتعلق بحكمه وآثاره.',
      },
    ];
  }

  // التوكل والتواكل
  if (has(['توكل', 'تواكل', 'توكلت', 'يتوكل'])) {
    return [
      {
        title: 'الفرق بين التوكل والتواكل - إسلام ويب',
        url: 'https://www.islamweb.net/ar/fatwa/search/?q=%D8%A7%D9%84%D9%81%D8%B1%D9%82+%D8%A8%D9%8A%D9%86+%D8%A7%D9%84%D8%AA%D9%88%D9%83%D9%84+%D9%88%D8%A7%D9%84%D8%AA%D9%88%D8%A7%D9%83%D9%84',
        snippet: 'التوكل هو الاعتماد على الله مع الأخذ بالأسباب الشرعية، والتواكل هو ترك الأسباب والاعتماد على الغير أو الكسل بحجة التوكل، وهو مذموم شرعاً.',
      },
      {
        title: 'حكم التواكل وتركه الأسباب - إسلام Q&A',
        url: 'https://islamqa.info/ar/search?q=%D8%A7%D9%84%D8%AA%D9%88%D9%83%D9%84+%D9%88%D8%A7%D9%84%D8%AA%D9%88%D8%A7%D9%83%D9%84',
        snippet: 'التوكل الحقيقي هو صرف القلب إلى الله واليقين بكفايته، مع الأخذ بالأسباب التي أمر الله بها.',
      },
      {
        title: 'معنى التوكل على الله - الدرر السنية',
        url: 'https://dorar.net/feqhia?q=%D8%A7%D9%84%D8%AA%D9%88%D9%83%D9%84+%D8%B9%D9%84%D9%89+%D8%A7%D9%84%D9%84%D9%87',
        snippet: 'التوكل مقام شريف وركيزة من ركائز الإيمان، وهو غير التواكل الذي هو ترك العمل والأخذ بالأسباب.',
      },
    ];
  }

  // الصلاة / الوضوء
  if (has(['صلاة', 'صلي', 'يصلي', 'الصلاة', 'صلاتي', 'اصلي'])) {
    return [
      {
        title: 'مسائل وأحكام الصلاة - إسلام ويب',
        url: 'https://www.islamweb.net/ar/fatwa/search/?q=%D8%A7%D8%AD%D9%83%D8%A7%D9%85+%D8%A7%D9%84%D8%B5%D9%84%D8%A7%D8%A9',
        snippet: 'الصلاة عماد الدين وركن من أركان الإسلام، وفيها مسائل كثيرة في الشروط والأركان والواجبات والسنن.',
      },
      {
        title: 'أحكام الصلاة - إسلام Q&A',
        url: 'https://islamqa.info/ar/search?q=%D8%A3%D8%AD%D9%83%D8%A7%D9%85+%D8%A7%D9%84%D8%B5%D9%84%D8%A7%D8%A9',
        snippet: 'تجد هنا إجابات على مسائل الصلاة الشائعة من شروط وواجبات وما يبطل الصلاة.',
      },
    ];
  }

  // الوضوء / الطهارة
  if (has(['وضوء', 'يتوضا', 'اتوضا', 'طهارة', 'غسل', 'جنابة', 'نجاسة'])) {
    return [
      {
        title: 'أحكام الوضوء والطهارة - إسلام ويب',
        url: 'https://www.islamweb.net/ar/fatwa/search/?q=%D8%A3%D8%AD%D9%83%D8%A7%D9%85+%D8%A7%D9%84%D9%88%D8%B6%D9%88%D8%A1',
        snippet: 'الوضوء شرط من شروط صحة الصلاة، وله نواقض معلومة وفروض وسنن.',
      },
      {
        title: 'الطهارة وأحكامها - الدرر السنية',
        url: 'https://dorar.net/feqhia?q=%D8%A3%D8%AD%D9%83%D8%A7%D9%85+%D8%A7%D9%84%D8%B7%D9%87%D8%A7%D8%B1%D8%A9',
        snippet: 'الطهارة شرط لصحة الصلاة وغيرها من العبادات، وأنواعها الوضوء والغسل والتيمم.',
      },
    ];
  }

  // الزكاة / الصدقة
  if (has(['زكاة', 'الزكاة', 'نصاب', 'صدقة', 'الصدقة'])) {
    return [
      {
        title: 'أحكام الزكاة ومسائلها - إسلام ويب',
        url: 'https://www.islamweb.net/ar/fatwa/search/?q=%D8%A3%D8%AD%D9%83%D8%A7%D9%85+%D8%A7%D9%84%D8%B2%D9%83%D8%A7%D8%A9',
        snippet: 'الزكاة ركن من أركان الإسلام، ولها شروط وأنصبة محددة تجب عند استيفائها.',
      },
      {
        title: 'مسائل الزكاة - إسلام Q&A',
        url: 'https://islamqa.info/ar/search?q=%D9%85%D8%B3%D8%A7%D8%A6%D9%84+%D8%A7%D9%84%D8%B2%D9%83%D8%A7%D8%A9',
        snippet: 'تجد هنا إجابات على أسئلة الزكاة: نصاب الذهب والفضة والنقود والتجارة وزكاة الفطر.',
      },
    ];
  }

  // الحلال والحرام / المعاملات
  if (has(['حلال', 'حرام', 'يجوز', 'لا يجوز', 'مباح', 'محرم', 'حكم'])) {
    return [
      {
        title: 'الحلال والحرام في الشريعة الإسلامية - إسلام ويب',
        url: 'https://www.islamweb.net/ar/fatwa/search/?q=%D8%A7%D9%84%D8%AD%D9%84%D8%A7%D9%84+%D9%88%D8%A7%D9%84%D8%AD%D8%B1%D8%A7%D9%85',
        snippet: 'الشريعة الإسلامية بيّنت الحلال والحرام في كل جوانب الحياة من الأكل والشرب والمعاملات.',
      },
      {
        title: 'فتاوى في الحلال والحرام - إسلام Q&A',
        url: 'https://islamqa.info/ar/search?q=%D8%AD%D9%83%D9%85+%D8%A7%D9%84%D8%AD%D9%84%D8%A7%D9%84+%D9%88%D8%A7%D9%84%D8%AD%D8%B1%D8%A7%D9%85',
        snippet: 'تجد هنا إجابات الشيخ ابن عثيمين وابن باز والشيخ الفوزان في مسائل الحلال والحرام.',
      },
    ];
  }

  // الزواج والطلاق
  if (has(['زواج', 'نكاح', 'خطبة', 'طلاق', 'خلع', 'مهر', 'ولي'])) {
    return [
      {
        title: 'أحكام الزواج والطلاق - إسلام ويب',
        url: 'https://www.islamweb.net/ar/fatwa/search/?q=%D8%A3%D8%AD%D9%83%D8%A7%D9%85+%D8%A7%D9%84%D8%B2%D9%88%D8%A7%D8%AC',
        snippet: 'للزواج والطلاق أحكام شرعية مفصّلة تتعلق بالشروط والأركان وحقوق الزوجين.',
      },
      {
        title: 'فتاوى النكاح والطلاق - إسلام Q&A',
        url: 'https://islamqa.info/ar/search?q=%D8%A3%D8%AD%D9%83%D8%A7%D9%85+%D8%A7%D9%84%D9%86%D9%83%D8%A7%D8%D8%AD',
        snippet: 'إجابات مفصّلة على مسائل عقد الزواج والطلاق والخلع والعدة.',
      },
    ];
  }

  // الربا والمعاملات المالية
  if (has(['ربا', 'فوائد', 'قرض', 'بنك', 'تامين', 'معاملة', 'بيع', 'شراء'])) {
    return [
      {
        title: 'أحكام الربا والمعاملات المالية - إسلام ويب',
        url: 'https://www.islamweb.net/ar/fatwa/search/?q=%D8%A3%D8%AD%D9%83%D8%A7%D9%85+%D8%A7%D9%84%D8%B1%D8%A8%D8%A7',
        snippet: 'الربا محرّم في الشريعة الإسلامية وله أنواع وصور كثيرة تشمل المعاملات البنكية والقروض.',
      },
      {
        title: 'فتاوى المعاملات المالية - إسلام Q&A',
        url: 'https://islamqa.info/ar/search?q=%D8%A7%D9%84%D9%85%D8%B9%D8%A7%D9%85%D9%84%D8%A7%D8%AA+%D8%A7%D9%84%D9%85%D8%A7%D9%84%D9%8A%D8%A9',
        snippet: 'تجد هنا إجابات على مسائل البيع والشراء والربا والتأمين والاستثمار.',
      },
    ];
  }

  // الحج والعمرة
  if (has(['حج', 'عمرة', 'احرام', 'إحرام', 'طواف', 'مكة', 'منى', 'عرفة'])) {
    return [
      {
        title: 'أحكام الحج والعمرة - إسلام ويب',
        url: 'https://www.islamweb.net/ar/fatwa/search/?q=%D8%A3%D8%AD%D9%83%D8%A7%D9%85+%D8%A7%D9%84%D8%AD%D8%AC+%D9%88%D8%A7%D9%84%D8%B9%D9%85%D8%B1%D8%A9',
        snippet: 'الحج فريضة على كل مسلم مستطيع مرة في العمر، والعمرة سنة مؤكدة لها شعائر محددة.',
      },
      {
        title: 'فتاوى الحج والعمرة - إسلام Q&A',
        url: 'https://islamqa.info/ar/search?q=%D8%A3%D8%AD%D9%83%D8%A7%D9%85+%D8%A7%D9%84%D8%AD%D8%AC',
        snippet: 'إجابات شاملة على مسائل الإحرام والطواف والسعي والوقوف بعرفة ورمي الجمرات.',
      },
    ];
  }

  // الدعاء والأذكار
  if (has(['دعاء', 'اذكار', 'ذكر', 'تسبيح', 'استغفار'])) {
    return [
      {
        title: 'أحكام الدعاء والذكر - إسلام ويب',
        url: 'https://www.islamweb.net/ar/fatwa/search/?q=%D8%A3%D8%AD%D9%83%D8%A7%D9%85+%D8%A7%D9%84%D8%AF%D8%B9%D8%A7%D8%A1',
        snippet: 'الدعاء عبادة عظيمة وله آداب وأوقات استجابة معلومة في السنة النبوية.',
      },
      {
        title: 'الأذكار وفضلها - الدرر السنية',
        url: 'https://dorar.net/feqhia?q=%D8%A3%D9%81%D8%B6%D9%84+%D8%A7%D9%84%D8%A7%D8%B0%D9%83%D8%A7%D8%B1',
        snippet: 'الأذكار الواردة في القرآن والسنة وفضائلها وأوقاتها.',
      },
    ];
  }

  return [];
}

function dedupeSources(sources: AutoQaSource[], allowedSites: string[], limit = 5): AutoQaSource[] {
  const seen = new Set<string>();
  const unique: AutoQaSource[] = [];

  for (const source of sources) {
    if (!source.title || !source.url) continue;
    if (!isAllowedSourceUrl(source.url, allowedSites)) continue;

    let key = source.url;
    try {
      const url = new URL(source.url);
      url.hash = '';
      key = `${url.hostname.replace(/^www\./, '')}${url.pathname.replace(/\/$/, '')}`;
    } catch {
      key = source.url;
    }

    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(source);
    if (unique.length >= limit) break;
  }

  return unique;
}

async function requestGoogleAutoQaSources(
  apiKey: string,
  searchEngineId: string,
  query: string,
  allowedSites: string[],
  siteSearch?: string,
  num = 5,
): Promise<AutoQaSource[]> {
  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('cx', searchEngineId);
  url.searchParams.set('q', query);
  url.searchParams.set('num', String(Math.min(Math.max(num, 1), 10)));
  url.searchParams.set('lr', 'lang_ar');
  url.searchParams.set('safe', 'active');
  if (siteSearch) {
    url.searchParams.set('siteSearch', siteSearch);
    url.searchParams.set('siteSearchFilter', 'i');
  }

  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`AUTO_QA_SEARCH_FAILED_${response.status}: ${body.slice(0, 300)}`);
  }

  const data = await response.json() as {
    items?: Array<{ title?: string; link?: string; snippet?: string }>;
  };

  return (data.items || [])
    .map((item) => ({
      title: String(item.title || '').trim(),
      url: String(item.link || '').trim(),
      snippet: String(item.snippet || '').trim(),
    }))
    .filter((item) => item.title && item.url && isAllowedSourceUrl(item.url, allowedSites))
    .slice(0, 5);
}

async function searchGoogleAutoQaSources(question: string, allowedSites: string[]): Promise<AutoQaSource[]> {
  const apiKey = getQaConfigValue('google_api_key');
  const searchEngineId = getQaConfigValue('google_cse_id') || DEFAULT_GOOGLE_CSE_ID;

  if (!apiKey) {
    throw new Error('AUTO_QA_SEARCH_NOT_CONFIGURED');
  }

  const collected: AutoQaSource[] = [];
  const meaningQuery = buildMeaningSearchQuery(question);
  const broadQueries = Array.from(new Set([
    question,
    meaningQuery,
    `${question} فتوى`,
  ].map((query) => query.trim()).filter(Boolean)));

  for (const query of broadQueries) {
    try {
      const sources = await requestGoogleAutoQaSources(apiKey, searchEngineId, query, allowedSites);
      collected.push(...sources);
      const unique = dedupeSources(collected, allowedSites);
      logger.info('[auto-qa] google query completed', { queryType: query === question ? 'question' : 'expanded', count: unique.length });
      if (unique.length >= 3) return unique;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn('[auto-qa] google query failed:', message.slice(0, 240));
      throw error;
    }
  }

  const siteFallbackLimit = getAutoQaSiteFallbackLimit();
  for (const site of allowedSites.slice(0, siteFallbackLimit)) {
    try {
      const sources = await requestGoogleAutoQaSources(
        apiKey,
        searchEngineId,
        meaningQuery || question,
        allowedSites,
        site,
        2,
      );
      collected.push(...sources);
      const unique = dedupeSources(collected, allowedSites);
      logger.info('[auto-qa] google site fallback completed', { site, count: unique.length });
      if (unique.length >= 5) return unique;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn('[auto-qa] google site fallback failed:', { site, error: message.slice(0, 180) });
    }
  }

  return dedupeSources(collected, allowedSites);
}

async function fetchSearchHtml(url: URL): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; RoohAlMuslimBot/1.0; +https://rooh-almuslim.web.app)',
      'accept-language': 'ar,en;q=0.8',
    },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`AUTO_QA_DDG_SEARCH_FAILED_${response.status}: ${body.slice(0, 300)}`);
  }

  return response.text();
}

function parseSearchHtmlResults(html: string, allowedSites: string[]): AutoQaSource[] {
  const results: AutoQaSource[] = [];
  const resultRegex = /<a[^>]+href=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/g;
  let match: RegExpExecArray | null;

  while ((match = resultRegex.exec(html)) && results.length < 5) {
    const urlValue = normalizeSearchResultUrl(match[2]);
    const title = stripHtml(match[3]);

    if (!title || !urlValue.startsWith('http')) continue;
    if (title.length < 6) continue;
    if (!isAllowedSourceUrl(urlValue, allowedSites)) continue;
    if (results.some((result) => result.url === urlValue)) continue;

    results.push({ title, url: urlValue, snippet: '' });
  }

  return results;
}

async function fetchSourceSnippet(urlValue: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch(urlValue, {
      signal: controller.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; RoohAlMuslimBot/1.0; +https://rooh-almuslim.web.app)',
        'accept-language': 'ar,en;q=0.8',
      },
    });
    if (!response.ok) return '';

    const html = await response.text();
    const metaMatch =
      html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["'](?:description|og:description)["'][^>]*>/i);
    const paragraphMatch = html.match(/<p[^>]*>([\s\S]{80,700}?)<\/p>/i);
    const snippet = stripHtml(metaMatch?.[1] || paragraphMatch?.[1] || '');

    return snippet.length > 260 ? `${snippet.slice(0, 257).trim()}...` : snippet;
  } catch {
    return '';
  } finally {
    clearTimeout(timeout);
  }
}

async function enrichSources(sources: AutoQaSource[]): Promise<AutoQaSource[]> {
  const enriched = await Promise.all(
    sources.slice(0, 5).map(async (source) => {
      const snippet = source.snippet || await fetchSourceSnippet(source.url);
      return {
        ...source,
        snippet: snippet || `مصدر من ${getSourceHost(source.url)} مرتبط بالسؤال.`,
      };
    })
  );

  return enriched;
}

async function searchDuckDuckGoAutoQaSources(question: string, allowedSites: string[]): Promise<AutoQaSource[]> {
  const meaningQuery = buildMeaningSearchQuery(question);
  const siteFilter = allowedSites.map((site) => `site:${site}`).join(' OR ');
  const queries = Array.from(new Set([
    buildExpandedSearchQuery(question, allowedSites),
    [question, siteFilter].join(' '),
    [meaningQuery, siteFilter].join(' '),
    ...allowedSites.slice(0, getAutoQaSiteFallbackLimit()).map((site) => `${meaningQuery || question} site:${site}`),
  ].map((query) => query.trim()).filter(Boolean)));
  const endpoints = [
    'https://html.duckduckgo.com/html/',
    'https://lite.duckduckgo.com/lite/',
  ];
  const collected: AutoQaSource[] = [];

  for (const query of queries) {
    for (const endpoint of endpoints) {
      try {
        const url = new URL(endpoint);
        url.searchParams.set('q', query);
        const html = await fetchSearchHtml(url);
        const sources = parseSearchHtmlResults(html, allowedSites);
        collected.push(...sources);
        const unique = dedupeSources(collected, allowedSites);
        if (unique.length >= 3) return enrichSources(unique);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn('[auto-qa] fallback endpoint failed:', message.slice(0, 180));
      }
    }
  }

  return enrichSources(dedupeSources(collected, allowedSites));
}

// ────────────────────────────────────────────────────────────────────────────
// Direct site scrapers — no API key needed, run in parallel
// ────────────────────────────────────────────────────────────────────────────

/** Extract all links matching a pattern from HTML and return title + URL pairs */
function extractLinksFromHtml(
  html: string,
  pathPattern: RegExp,
  base: string,
): Array<{ url: string; context: string }> {
  const found: Array<{ url: string; context: string }> = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;

  while ((m = pathPattern.exec(html)) && found.length < 8) {
    const rawPath = m[1];
    const fullUrl = rawPath.startsWith('http') ? rawPath : `${base}${rawPath}`;
    const clean = fullUrl.split('?')[0].split('#')[0];
    if (seen.has(clean)) continue;
    seen.add(clean);
    // 600 chars of HTML context around the link for title/snippet extraction
    const pos = m.index;
    const ctx = html.slice(Math.max(0, pos - 250), Math.min(html.length, pos + 600));
    found.push({ url: clean, context: ctx });
  }

  return found;
}

/** Pull the best title string from a chunk of HTML context */
function extractTitleFromContext(ctx: string): string {
  const matchers = [
    /<h[2-4][^>]*>([\s\S]{6,240}?)<\/h[2-4]>/i,
    /class="[^"]*(?:title|heading)[^"]*"[^>]*>([\s\S]{6,240}?)<\//i,
    />([^<]{10,200})<\/a>/,
  ];
  for (const rx of matchers) {
    const m = ctx.match(rx);
    if (m) {
      const t = stripHtml(m[1]).trim();
      if (t.length >= 8) return t;
    }
  }
  return '';
}

/** Scrape islamweb.net search directly */
async function searchIslamwebDirect(question: string): Promise<AutoQaSource[]> {
  const queries = Array.from(
    new Set([question, buildMeaningSearchQuery(question)].filter(Boolean))
  ).slice(0, 2);

  const results: AutoQaSource[] = [];

  for (const query of queries) {
    try {
      const url = new URL(`${ISLAMWEB_BASE}/ar/fatwa/search/`);
      url.searchParams.set('q', query);
      const html = await fetchSearchHtml(url);

      // Fatwa and article links: /ar/fatwa/NNNNN/... or /ar/article/NNNNN/...
      const pathRx = /href="(\/ar\/(?:fatwa|article)\/\d+[^"?#]*)"/g;
      const links = extractLinksFromHtml(html, pathRx, ISLAMWEB_BASE);

      for (const { url: fullUrl, context } of links) {
        if (results.some((r) => r.url === fullUrl)) continue;
        const title = extractTitleFromContext(context);
        if (!title) continue;
        // Skip navigation/sidebar links whose context has no question keywords
        if (scoreRelevance(question, stripHtml(context)) === 0) continue;

        const snippetM = context.match(/<p[^>]*>([\s\S]{20,400}?)<\/p>/i);
        const snippet = snippetM ? stripHtml(snippetM[1]).slice(0, 260).trim() : '';
        results.push({ title, url: fullUrl, snippet });
        if (results.length >= 5) break;
      }
    } catch (err) {
      logger.warn(
        '[auto-qa] islamweb direct failed:',
        err instanceof Error ? err.message.slice(0, 120) : String(err)
      );
    }

    if (results.length >= 3) break;
  }

  return results.length > 0 ? enrichSources(results.slice(0, 5)) : [];
}

/** Scrape islamqa.info search directly */
async function searchIslamqaDirect(question: string): Promise<AutoQaSource[]> {
  const queries = Array.from(
    new Set([question, buildMeaningSearchQuery(question)].filter(Boolean))
  ).slice(0, 2);

  const results: AutoQaSource[] = [];

  for (const query of queries) {
    try {
      const url = new URL(`${ISLAMQA_BASE}/ar/search`);
      url.searchParams.set('q', query);
      const html = await fetchSearchHtml(url);

      // islamqa.info answer links: /ar/answers/NNNNN/...
      const pathRx = /href="((?:https?:\/\/islamqa\.info)?\/ar\/answers\/\d+[^"?#]*)"/g;
      const links = extractLinksFromHtml(html, pathRx, ISLAMQA_BASE);

      for (const { url: rawUrl, context } of links) {
        const fullUrl = rawUrl.startsWith('http') ? rawUrl : `${ISLAMQA_BASE}${rawUrl}`;
        if (results.some((r) => r.url === fullUrl)) continue;
        const title = extractTitleFromContext(context);
        if (!title) continue;
        // Skip navigation/sidebar links whose context has no question keywords
        if (scoreRelevance(question, stripHtml(context)) === 0) continue;
        results.push({ title, url: fullUrl, snippet: '' });
        if (results.length >= 4) break;
      }
    } catch (err) {
      logger.warn(
        '[auto-qa] islamqa direct failed:',
        err instanceof Error ? err.message.slice(0, 120) : String(err)
      );
    }

    if (results.length >= 2) break;
  }

  return results.length > 0 ? enrichSources(results.slice(0, 4)) : [];
}

/** Scrape dorar.net fiqh search directly */
async function searchDorarDirect(question: string): Promise<AutoQaSource[]> {
  const queries = Array.from(
    new Set([question, buildMeaningSearchQuery(question)].filter(Boolean))
  ).slice(0, 2);

  const results: AutoQaSource[] = [];

  for (const query of queries) {
    try {
      const url = new URL(`${DORAR_BASE}/feqhia`);
      url.searchParams.set('q', query);
      const html = await fetchSearchHtml(url);

      // dorar.net fiqh links: /feqhia/NNNNN
      const pathRx = /href="(\/feqhia\/\d+[^"?#]*)"/g;
      const links = extractLinksFromHtml(html, pathRx, DORAR_BASE);

      for (const { url: fullUrl, context } of links) {
        if (results.some((r) => r.url === fullUrl)) continue;
        const title = extractTitleFromContext(context);
        if (!title) continue;
        // Skip sidebar/navigation links whose surrounding context shares no keywords with the question
        if (scoreRelevance(question, stripHtml(context)) === 0) continue;
        results.push({ title, url: fullUrl, snippet: '' });
        if (results.length >= 4) break;
      }
    } catch (err) {
      logger.warn(
        '[auto-qa] dorar direct failed:',
        err instanceof Error ? err.message.slice(0, 120) : String(err)
      );
    }

    if (results.length >= 2) break;
  }

  return results.length > 0 ? enrichSources(results.slice(0, 3)) : [];
}

/**
 * Last-resort fallback: always returns 3 clickable search-page links so the
 * function never saves status=no_results.  The user can tap any link and browse
 * the site's own search results for their question.
 */
function buildGenericSearchLinks(question: string): AutoQaSource[] {
  const encoded = encodeURIComponent(question);
  const shortQ = question.slice(0, 60);
  return [
    {
      title: `نتائج البحث في إسلام ويب: ${shortQ}`,
      url: `${ISLAMWEB_BASE}/ar/fatwa/search/?q=${encoded}`,
      snippet: 'اضغط هنا للاطلاع على الفتاوى المتعلقة بسؤالك مباشرةً في قاعدة بيانات إسلام ويب.',
    },
    {
      title: `نتائج البحث في إسلام Q&A: ${shortQ}`,
      url: `${ISLAMQA_BASE}/ar/search?q=${encoded}`,
      snippet: 'اضغط هنا للاطلاع على فتاوى مجانبة لسؤالك في موقع إسلام سؤال وجواب.',
    },
    {
      title: `نتائج البحث في الدرر السنية: ${shortQ}`,
      url: `${DORAR_BASE}/feqhia?q=${encoded}`,
      snippet: 'اضغط هنا للاطلاع على المسائل الفقهية المتعلقة بسؤالك في الموسوعة الفقهية.',
    },
  ];
}

async function searchAutoQaSources(question: string, configuredSites?: string[] | string): Promise<AutoQaSource[]> {
  const allowedSites = getAllowedQaSites(configuredSites);

  // ── Step 1: direct scraping of the three main Islamic sites (no API key) ──
  const directCollected: AutoQaSource[] = [];
  try {
    const [islamwebR, islamqaR, dorarR] = await Promise.allSettled([
      searchIslamwebDirect(question),
      searchIslamqaDirect(question),
      searchDorarDirect(question),
    ]);
    for (const r of [islamwebR, islamqaR, dorarR]) {
      if (r.status === 'fulfilled') directCollected.push(...r.value);
    }
  } catch (err) {
    logger.warn('[auto-qa] direct scrape error:', err instanceof Error ? err.message.slice(0, 180) : String(err));
  }

  const directUnique = dedupeSources(directCollected, allowedSites, 5);
  if (directUnique.length >= 2) {
    logger.info('[auto-qa] direct site search succeeded', { count: directUnique.length });
    return directUnique;
  }

  // ── Step 2: DuckDuckGo / Google CSE ──────────────────────────────────────
  const provider = getQaConfigValue('search_provider').toLowerCase();

  if (provider !== 'google') {
    try {
      const ddgSources = await searchDuckDuckGoAutoQaSources(question, allowedSites);
      logger.info('[auto-qa] ddg search completed', { count: ddgSources.length });
      const combined = dedupeSources([...directCollected, ...ddgSources], allowedSites, 5);
      if (combined.length > 0) return combined;
    } catch (err) {
      logger.warn('[auto-qa] ddg failed:', err instanceof Error ? err.message.slice(0, 180) : String(err));
    }
  } else {
    try {
      const googleSources = await searchGoogleAutoQaSources(question, allowedSites);
      if (googleSources.length > 0) {
        return dedupeSources([...directCollected, ...googleSources], allowedSites, 5);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn('[auto-qa] google search failed, trying ddg:', message.slice(0, 240));
    }

    try {
      const ddgSources = await searchDuckDuckGoAutoQaSources(question, allowedSites);
      const combined = dedupeSources([...directCollected, ...ddgSources], allowedSites, 5);
      if (combined.length > 0) return combined;
    } catch (err) {
      logger.warn('[auto-qa] ddg fallback failed:', err instanceof Error ? err.message.slice(0, 180) : String(err));
    }
  }

  // ── Step 3: Curated topic fallbacks (static, topic-matched) ──────────────
  const curatedSources = getCuratedFallbackSources(question);
  const curatedCombined = dedupeSources([...directCollected, ...curatedSources], allowedSites, 5);
  if (curatedCombined.length > 0) {
    logger.info('[auto-qa] curated fallback used', { count: curatedCombined.length });
    return curatedCombined;
  }

  // ── Step 4: Guaranteed fallback — search-page links (always non-empty) ───
  logger.info('[auto-qa] using generic search-page links as guaranteed fallback');
  return buildGenericSearchLinks(question);
}

export const answerUserQuestionAutomatically = functions.firestore
  .document('userQuestions/{questionId}')
  .onCreate(async (snap) => {
    const data = snap.data() || {};
    const question = String(data.question || '').trim();
    if (!question) return;
    if (data.requestMode !== 'assistant') return;

    await snap.ref.update({
      autoAnswerStatus: 'searching',
      autoAnswerDisclaimer: AUTO_QA_DISCLAIMER,
      autoAnswerStartedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    try {
      const configSnap = await db.doc('appConfig/qaAssistant').get();
      const assistantConfig = configSnap.data() || {};
      if (assistantConfig.enabled === false) {
        await snap.ref.update({
          autoAnswerStatus: 'disabled',
          autoAnswerCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return;
      }

      const dailyLimit = getQaDailyLimit(assistantConfig.dailyLimit);
      const hasQuota = await reserveAutoQaSearchQuota(dailyLimit);
      if (!hasQuota) {
        await snap.ref.update({
          autoAnswerStatus: 'daily_limit',
          autoAnswer:
            'نأسف، تم الوصول للحد الرسمي للأسئلة اليوم. يمكنك إرسال سؤالك لنا وسنراجعه ونرد عليك بمصادر موثوقة خلال 48 ساعة إن شاء الله.',
          autoAnswerSources: [],
          autoAnswerCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return;
      }

      const sources = await searchAutoQaSources(question, assistantConfig.allowedSites);
      if (sources.length === 0) {
        await snap.ref.update({
          autoAnswerStatus: 'no_results',
          autoAnswer:
            'لم نعثر على مصادر كافية للإجابة على هذا السؤال الآن. تم حفظ سؤالك، ويمكنك المحاولة بصياغة أوضح أو الرجوع لأهل العلم.',
          autoAnswerSources: [],
          autoAnswerCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return;
      }

      // Try to extract the actual fatwa answer text from the best specific page.
      // We skip search-results pages (URL contains "search" or "q=").
      let extractedContent = '';
      const specificPage = sources.find((s) => {
        const u = s.url.toLowerCase();
        return (
          !u.includes('/search') &&
          !u.includes('?q=') &&
          (
            u.includes('/fatwa/') ||
            u.includes('/answers/') ||
            u.includes('/feqhia/') ||
            u.includes('/fatwas/')
          )
        );
      });

      if (specificPage) {
        try {
          extractedContent = await extractFatwaContent(specificPage.url);
          const relevance = scoreRelevance(question, extractedContent);
          logger.info('[auto-qa] content extracted', {
            url: specificPage.url,
            length: extractedContent.length,
            relevance,
          });
          // Discard content that doesn't match the question keywords at all
          if (relevance < 0.2) {
            logger.warn('[auto-qa] extracted content irrelevant, discarding', { url: specificPage.url, relevance });
            extractedContent = '';
          }
        } catch (err) {
          logger.warn(
            '[auto-qa] content extraction failed:',
            err instanceof Error ? err.message.slice(0, 120) : String(err)
          );
        }
      }

      // Filter sources to only keep those relevant to the question
      const relevantSources = sources.filter((s) => {
        const titleScore = scoreRelevance(question, s.title || '');
        const snippetScore = scoreRelevance(question, s.snippet || '');
        const best = Math.max(titleScore, snippetScore);
        if (best < 0.15) {
          logger.warn('[auto-qa] source filtered as irrelevant', { title: s.title, score: best });
          return false;
        }
        return true;
      });
      // When all sources are irrelevant AND we have no extracted content,
      // use generic search-page links so we never show wrong content to the user.
      const finalSources = relevantSources.length > 0
        ? relevantSources
        : (extractedContent ? sources : buildGenericSearchLinks(question));

      await snap.ref.update({
        status: 'answered',
        autoAnswerStatus: 'answered',
        autoAnswer: buildAutoQaAnswer(question, finalSources, extractedContent),
        autoAnswerSources: finalSources,
        autoAnswerDisclaimer: AUTO_QA_DISCLAIMER,
        autoAnswerCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn('[auto-qa] failed:', message);
      await snap.ref.update({
        autoAnswerStatus: message.includes('AUTO_QA_SEARCH_NOT_CONFIGURED') ? 'unconfigured' : 'failed',
        autoAnswerError: message.slice(0, 500),
        autoAnswerCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });

/**
 * ⚠️ Deprecated and removed in Phase A2 (Security hardening).
 *
 * Push notifications are sent via the Netlify proxy `expo-push.ts`, which is
 * authenticated using an admin session token (HMAC-signed by `verify-admin`).
 *
 * The previous `sendPushNotifications` callable function only checked
 * `context.auth != null`, which was insufficient because:
 *   • Any anonymously-signed Firebase user could invoke it
 *   • The admin panel does NOT use Firebase Auth (it uses Netlify password +
 *     localStorage session token), so the function was unreachable from admin
 *     anyway and existed only as an attack surface.
 *
 * The previous `pushNotificationsTestEndpoint` HTTP endpoint had
 * `Access-Control-Allow-Origin: *` and NO authentication — anyone with the
 * URL could send arbitrary push notifications to any token.
 *
 * Both are removed. If a server-side push path is needed in the future, it
 * MUST verify a custom admin claim (`request.auth.token.admin === true`).
 */

// ==================== Monthly Honor Board Winner Selection ====================

/**
 * Scheduled Cloud Function: runs at 00:05 on the 1st of every month.
 * Selects top winners from the previous month's leaderboard,
 * grants them admin premium, and sends push notifications.
 */
export const selectMonthlyWinners = onSchedule(
  { schedule: '5 0 1 * *', timeZone: 'Asia/Riyadh', secrets: ['EXPO_ACCESS_TOKEN'] },
  async () => {
    try {
      // Calculate previous month key (YYYY-MM-v2 format)
      const now = new Date();
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const monthKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-v2`;

      logger.info(`🏆 Selecting winners for month: ${monthKey}`);

      // Fetch rewards config
      const configSnap = await db.doc('config/rewards-settings').get();
      const config = configSnap.data() || {};
      if (config.enabled === false) {
        logger.info('Rewards system is disabled, skipping winner selection');
        return;
      }

      // Check if already processed
      if (config.currentMonth === monthKey || config.processedMonth === monthKey) {
        logger.info(`Winners already selected for ${monthKey}, skipping`);
        return;
      }

      const winnersCount = config.winnersCount || 3;
      const rewardDurationDays = config.rewardDurationDays || 30;

      // Query top users for previous month
      const snapshot = await db.collection('users')
        .where('monthlyEngagement.month', '==', monthKey)
        .orderBy('monthlyEngagement.score', 'desc')
        .limit(Math.max(winnersCount * 5, 20))
        .get();

      const winners: Array<{ userId: string; displayName: string; score: number; rewardedAt: string; notified: boolean; premiumExpiresAt: string }> = [];
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + rewardDurationDays);

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const engagement = data.monthlyEngagement;
        const displayName = String(data.displayName || '').trim();
        if (
          winners.length < winnersCount &&
          engagement &&
          engagement.score > 0 &&
          displayName &&
          !data.hiddenFromLeaderboard &&
          !data.placeholder
        ) {
          winners.push({
            userId: docSnap.id,
            displayName,
            score: engagement.score,
            rewardedAt: new Date().toISOString(),
            notified: false,
            premiumExpiresAt: expiresAt.toISOString(),
          });
        }
      });

      if (winners.length === 0) {
        logger.info(`No eligible winners found for ${monthKey}`);
        await db.doc('config/rewards-settings').set({
          currentMonth: monthKey,
          processedMonth: monthKey,
          lastProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        return;
      }

      // Grant premium to each winner
      const batch = db.batch();
      for (const winner of winners) {
        const userRef = db.doc(`users/${winner.userId}`);
        batch.update(userRef, {
          adminPremium: {
            granted: true,
            grantedBy: 'auto_reward_system',
            grantedAt: new Date().toISOString(),
            plan: 'monthly',
            expiresAt: expiresAt.toISOString(),
            reason: `فائز في مسابقة الشهر ${monthKey}`,
          },
        });
      }
      await batch.commit();

      // Send push notifications to winners
      const pushMessages: ExpoPushMessage[] = [];
      for (const winner of winners) {
        try {
          const userSnap = await db.doc(`users/${winner.userId}`).get();
          const fcmToken = userSnap.data()?.fcmToken;
          if (fcmToken && fcmToken.startsWith('ExponentPushToken')) {
            pushMessages.push({
              to: fcmToken,
              title: '🏆 مبروك! أنت في لوحة الشرف',
              body: 'حصلت على اشتراك مجاني هذا الشهر مكافأة لك',
              data: {
                type: 'honor_board_winner',
                actionType: 'screen',
                actionUrl: '/honor-board',
              },
              sound: 'default',
              priority: 'high',
              channelId: 'general',
            });
            winner.notified = true;
          }
        } catch (err) {
          logger.warn(`Could not get push token for winner ${winner.userId}:`, err);
        }
      }

      if (pushMessages.length > 0) {
        try {
          const winnerToken = expoAccessToken.value();
          const winnerHeaders: Record<string, string> = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          };
          if (winnerToken) {
            winnerHeaders['Authorization'] = `Bearer ${winnerToken}`;
          }
          const response = await fetch(EXPO_PUSH_APIS[0], {
            method: 'POST',
            headers: winnerHeaders,
            body: JSON.stringify(pushMessages),
          });
          if (response.ok) {
            logger.info(`Sent winner notifications to ${pushMessages.length} users`);
          } else {
            logger.warn('Winner notification push failed:', await response.text());
          }
        } catch (pushErr) {
          logger.warn('Winner notification push error:', pushErr);
        }
      }

      // Update rewards config after notification attempts so `notified` is persisted.
      const historyEntry = {
        month: monthKey,
        winners,
        selectedAt: new Date().toISOString(),
        selectedBy: 'auto',
      };

      const existingHistory = config.history || [];
      await db.doc('config/rewards-settings').set({
        currentMonth: monthKey,
        currentWinners: winners,
        history: [historyEntry, ...existingHistory.slice(0, 11)],
        processedMonth: monthKey,
        lastProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      logger.info(`🏆 Selected ${winners.length} winners for ${monthKey}`);
    } catch (error) {
      logger.error('❌ selectMonthlyWinners failed:', error);
    }
  }
);

// ==================== Admin Authentication ====================

/**
 * Cloud Function: Verify admin password securely on the server.
 * The password hash is stored in `appConfig/adminAuth` which is now
 * read-restricted by Firestore rules — only this function (running with
 * Admin SDK privileges) can read it.
 *
 * Returns a session token on success. The token is also stored in Firestore
 * so admin panel can verify it on subsequent loads.
 *
 * Input:  { passwordHash: string }  (SHA-256 hex hash, computed in browser)
 * Output: { sessionToken: string } on success
 *         throws 'permission-denied' on wrong password
 *         throws 'failed-precondition' if no admin password is configured
 */
export const verifyAdminPassword = functions.https.onCall(
  async (data: { passwordHash?: string }) => {
    try {
      const submittedHash = (data?.passwordHash || '').trim().toLowerCase();
      if (!submittedHash || submittedHash.length !== 64) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'A valid SHA-256 password hash is required.'
        );
      }

      const snap = await db.doc('appConfig/adminAuth').get();
      if (!snap.exists) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Admin authentication is not configured.'
        );
      }

      const stored = snap.data() as { passwordHash?: string } | undefined;
      const storedHash = (stored?.passwordHash || '').trim().toLowerCase();
      if (!storedHash) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Admin password hash is missing.'
        );
      }

      // Constant-time comparison to mitigate timing attacks
      if (storedHash.length !== submittedHash.length) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'Incorrect password.'
        );
      }
      let mismatch = 0;
      for (let i = 0; i < storedHash.length; i++) {
        mismatch |= storedHash.charCodeAt(i) ^ submittedHash.charCodeAt(i);
      }
      if (mismatch !== 0) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'Incorrect password.'
        );
      }

      // Generate fresh session token (rotated on every login)
      const sessionToken = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
      await db.doc('appConfig/adminAuth').set(
        {
          sessionToken,
          sessionIssuedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return { sessionToken };
    } catch (error) {
      if (error instanceof functions.https.HttpsError) throw error;
      logger.error('verifyAdminPassword error:', error);
      throw new functions.https.HttpsError('internal', 'Authentication failed.');
    }
  }
);

/**
 * Cloud Function: Validate an existing admin session token.
 * Called by admin panel on page load to confirm the cached token is still valid.
 *
 * Input:  { sessionToken: string }
 * Output: { valid: boolean }
 */
export const validateAdminSession = functions.https.onCall(
  async (data: { sessionToken?: string }) => {
    try {
      const submitted = (data?.sessionToken || '').trim();
      if (!submitted) return { valid: false };

      const snap = await db.doc('appConfig/adminAuth').get();
      if (!snap.exists) return { valid: false };

      const stored = (snap.data() as { sessionToken?: string } | undefined)?.sessionToken || '';
      if (!stored || stored.length !== submitted.length) return { valid: false };

      // Constant-time compare
      let mismatch = 0;
      for (let i = 0; i < stored.length; i++) {
        mismatch |= stored.charCodeAt(i) ^ submitted.charCodeAt(i);
      }
      return { valid: mismatch === 0 };
    } catch (error) {
      logger.error('validateAdminSession error:', error);
      return { valid: false };
    }
  }
);

// ==================== Phase 2: FCM Prayer Push Fallback ====================

/**
 * Helper: send batch of Expo push messages with retry across mirror endpoints.
 */
async function sendExpoBatch(messages: ExpoPushMessage[], token: string): Promise<number> {
  if (messages.length === 0) return 0;
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  for (const endpoint of EXPO_PUSH_APIS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), EXPO_REQUEST_TIMEOUT_MS);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(messages),
        signal: controller.signal as any,
      });
      clearTimeout(timeoutId);
      if (!res.ok) continue;
      const json = (await res.json()) as ExpoResponse;
      const okCount = json.data.filter((t) => t.status === 'ok').length;
      return okCount;
    } catch (e) {
      logger.warn(`[fcm-prayer] endpoint ${endpoint} failed:`, e);
    }
  }
  return 0;
}

function getAdminNotificationTranslation(
  translations: NotificationTranslations,
  userLanguage: string,
): { title: string; body: string } {
  const lang = userLanguage as SupportedLanguage;
  const exact = translations?.[lang];
  if (exact?.title && exact?.body) return { title: exact.title, body: exact.body };
  const ar = translations?.ar;
  if (ar?.title && ar?.body) return { title: ar.title, body: ar.body };
  const en = translations?.en;
  if (en?.title && en?.body) return { title: en.title, body: en.body };

  for (const value of Object.values(translations || {})) {
    if (value?.title && value?.body) return { title: value.title, body: value.body };
  }

  return { title: 'روح المسلم', body: '' };
}

async function fetchAdminNotificationTargets(
  notification: admin.firestore.DocumentData,
): Promise<AdminNotificationTargetUser[]> {
  const targetAudience = String(notification.targetAudience || 'all');
  const targetLanguages = Array.isArray(notification.targetLanguages)
    ? notification.targetLanguages.map(String)
    : [];
  const targetCountries = Array.isArray(notification.targetCountries)
    ? notification.targetCountries.map((c: unknown) => String(c).toUpperCase())
    : [];
  const targetUserId = String(notification.targetUserId || '').trim();

  if (targetAudience === 'single_user' && targetUserId) {
    const snap = await db.doc(`users/${targetUserId}`).get();
    if (!snap.exists) return [];
    const data = snap.data() || {};
    const fcmToken = String(data.fcmToken || '');
    if (!fcmToken.startsWith('ExponentPushToken')) return [];
    return [{
      id: snap.id,
      fcmToken,
      platform: String(data.platform || 'unknown'),
      language: String(data.language || 'ar'),
      country: String(data.country || 'SA').toUpperCase(),
      countrySource: String(data.countrySource || 'device_locale'),
      countryVerified: data.countrySource === 'admin' || (data.countrySource === 'gps' && Boolean(data.locationUpdatedAt || data.locationLatitude)),
      lastActive: data.lastActive || null,
    }];
  }

  let usersQuery: FirebaseFirestore.Query = db.collection('users');
  if (targetAudience === 'ios' || targetAudience === 'android') {
    usersQuery = usersQuery.where('platform', '==', targetAudience);
  }

  const snap = await usersQuery.get();
  const storeSources = new Set(['play_store', 'app_store']);
  const weekAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const tokenMap = new Map<string, AdminNotificationTargetUser>();

  snap.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.placeholder) return;
    if (!storeSources.has(String(data.installSource || ''))) return;

    const fcmToken = String(data.fcmToken || '');
    if (!fcmToken.startsWith('ExponentPushToken')) return;

    const language = String(data.language || 'ar');
    const country = String(data.country || 'SA').toUpperCase();
    const countrySource = String(data.countrySource || 'device_locale');
    const countryVerified = countrySource === 'admin' || (countrySource === 'gps' && Boolean(data.locationUpdatedAt || data.locationLatitude));
    const lastActive = data.lastActive as admin.firestore.Timestamp | undefined;
    const lastActiveMs = typeof lastActive?.toDate === 'function'
      ? lastActive.toDate().getTime()
      : 0;

    if (targetAudience === 'active' && (!lastActiveMs || lastActiveMs <= weekAgoMs)) return;
    if (targetAudience === 'inactive' && lastActiveMs && lastActiveMs > weekAgoMs) return;
    if (targetLanguages.length > 0 && !targetLanguages.includes(language)) return;
    if (
      targetCountries.length > 0 &&
      (!targetCountries.includes(country) || !countryVerified)
    ) return;

    tokenMap.set(fcmToken, {
      id: docSnap.id,
      fcmToken,
      platform: String(data.platform || 'unknown'),
      language,
      country,
      countrySource,
      countryVerified,
      lastActive: lastActive || null,
    });
  });

  return Array.from(tokenMap.values());
}

/**
 * Scheduled Cloud Function: server-side processor for admin scheduled pushes.
 *
 * The admin panel only creates `notifications/{id}` with `status=scheduled`.
 * This function wakes up independently from the browser and sends due pushes.
 */
export const processScheduledAdminNotifications = onSchedule(
  { schedule: '*/1 * * * *', timeZone: 'UTC', secrets: ['EXPO_ACCESS_TOKEN'], memory: '512MiB' },
  async () => {
    const now = new Date();
    const token = expoAccessToken.value();

    try {
      const snap = await db
        .collection('notifications')
        .where('status', '==', 'scheduled')
        .limit(50)
        .get();

      let processed = 0;

      for (const docSnap of snap.docs) {
        const notification = docSnap.data();
        if (!notification.scheduledAt) continue;

        const scheduledAt = new Date(String(notification.scheduledAt));
        if (Number.isNaN(scheduledAt.getTime()) || scheduledAt > now) continue;

        const lockUntil = notification.processingUntil?.toDate?.() as Date | undefined;
        if (lockUntil && lockUntil > now) continue;

        const ref = docSnap.ref;
        const locked = await db.runTransaction(async (tx) => {
          const fresh = await tx.get(ref);
          const data = fresh.data();
          if (!fresh.exists || data?.status !== 'scheduled') return false;

          const freshScheduledAt = new Date(String(data.scheduledAt || ''));
          if (Number.isNaN(freshScheduledAt.getTime()) || freshScheduledAt > new Date()) return false;

          const freshLockUntil = data.processingUntil?.toDate?.() as Date | undefined;
          if (freshLockUntil && freshLockUntil > new Date()) return false;

          tx.update(ref, {
            status: 'sending',
            processingAt: admin.firestore.FieldValue.serverTimestamp(),
            processingUntil: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000)),
          });
          return true;
        });

        if (!locked) continue;

        try {
          const targets = await fetchAdminNotificationTargets(notification);
          const perLanguage: Record<string, number> = {};
          const messages: ExpoPushMessage[] = targets.map((user) => {
            const text = getAdminNotificationTranslation(notification.translations || {}, user.language);
            perLanguage[user.language] = (perLanguage[user.language] || 0) + 1;
            return {
              to: user.fcmToken,
              title: text.title,
              body: text.body,
              sound: 'default',
              priority: 'high',
              channelId: 'general',
              ttl: 86400,
              data: {
                actionType: String(notification.actionType || ''),
                actionUrl: String(notification.actionUrl || ''),
                imageUrl: String(notification.imageUrl || ''),
                language: user.language,
                type: String(notification.actionType || 'admin'),
                notificationDocId: docSnap.id,
              },
            };
          });

          let sentCount = 0;
          for (let i = 0; i < messages.length; i += 100) {
            sentCount += await sendExpoBatch(messages.slice(i, i + 100), token);
          }

          const failedCount = Math.max(0, messages.length - sentCount);
          await ref.update({
            status: sentCount > 0 ? 'sent' : 'failed',
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            sentCount,
            failedCount,
            deliveredCount: sentCount,
            perLanguage,
            processedBy: 'processScheduledAdminNotifications',
            processingUntil: admin.firestore.FieldValue.delete(),
            error: sentCount > 0 ? admin.firestore.FieldValue.delete() : 'No matching users or Expo send failed',
          });

          processed++;
          logger.info(`[scheduled-admin-push] ${docSnap.id}: sent ${sentCount}/${messages.length}`);
        } catch (sendError) {
          const message = sendError instanceof Error ? sendError.message : String(sendError);
          logger.error(`[scheduled-admin-push] ${docSnap.id} failed:`, message);
          await ref.update({
            status: 'failed',
            failedAt: admin.firestore.FieldValue.serverTimestamp(),
            error: message.slice(0, 1000),
            processingUntil: admin.firestore.FieldValue.delete(),
          });
        }
      }

      if (processed > 0) {
        logger.info(`[scheduled-admin-push] processed ${processed} due notifications`);
      }
    } catch (error) {
      logger.error('[scheduled-admin-push] processor failed:', error);
    }
  },
);

/**
 * Map app calculation method ID to adhan lib CalculationParameters.
 */
function buildAdhanParams(methodId: number, asrSchool: number) {
  // Lazy require so cold starts don't load adhan unless this function runs
  const adhan = require('adhan');
  let params;
  switch (methodId) {
    case 1: params = adhan.CalculationMethod.Karachi(); break;
    case 2: params = adhan.CalculationMethod.NorthAmerica(); break;
    case 3: params = adhan.CalculationMethod.MuslimWorldLeague(); break;
    case 4: params = adhan.CalculationMethod.UmmAlQura(); break;
    case 5: params = adhan.CalculationMethod.Egyptian(); break;
    case 8: params = adhan.CalculationMethod.Dubai(); break;
    case 9: params = adhan.CalculationMethod.Kuwait(); break;
    case 10: params = adhan.CalculationMethod.Qatar(); break;
    case 11: params = adhan.CalculationMethod.Singapore(); break;
    case 13: params = adhan.CalculationMethod.Turkey(); break;
    default: params = adhan.CalculationMethod.MuslimWorldLeague();
  }
  params.madhab = asrSchool === 1 ? adhan.Madhab.Hanafi : adhan.Madhab.Shafi;
  return params;
}

const PRAYER_NAMES_AR: Record<string, string> = {
  fajr: 'الفجر',
  dhuhr: 'الظهر',
  asr: 'العصر',
  maghrib: 'المغرب',
  isha: 'العشاء',
};

// Bodies matching constants/translations.ts notifications.*Body (Arabic)
const PRAYER_BODIES_AR: Record<string, string> = {
  fajr:    'حي على الصلاة.. الفجر مطلع السكينة.',
  dhuhr:   'حان وقت صلاة الظهر.. جدد طاقتك بالوقوف بين يدي الله.',
  asr:     'حان وقت صلاة العصر.. حافظ عليها لتنال عظيم الأجر.',
  maghrib: 'حان وقت صلاة المغرب.. بارك الله في يومك.',
  isha:    'حان وقت صلاة العشاء.. اختم يومك بصلاة تريح قلبك.',
  jumuah:  'حان وقت صلاة الجمعة.. أكثِر من الصلاة على النبي ﷺ.',
};

// Titles exactly matching constants/translations.ts notifications.*NotifTitle (Arabic)
// so FCM and local notifications are visually identical to the user.
const PRAYER_TITLES_AR: Record<string, string> = {
  fajr:    'الفجر.. نورٌ في قلبك 🌙',
  dhuhr:   'الظهر.. استراحة المؤمن ☀️',
  asr:     'العصر.. الصلاة الوسطى 🌤️',
  maghrib: 'المغرب.. ختام النهار الطاهر 🌇',
  isha:    'العشاء.. سكنٌ وطمأنينة ✨',
  // Friday Dhuhr
  jumuah:  'الجمعة.. خير يوم طلعت عليه الشمس 🕌',
};

/**
 * Scheduled Cloud Function: runs every 15 minutes.
 * For every user with fcmToken + prayerLocation in Firestore:
 *   - compute next prayer using adhan lib
 *   - if prayer falls within next 15 minutes, send Expo push
 *   - mark sent so we don't duplicate within 30 min
 *
 * هذا "حزام أمان" — الجدولة المحلية لا تزال الأساسية، لكن لو فشلت
 * (force-stop, OEM kill, exact alarm denied) المستخدم يستلم push من السيرفر.
 */
export const sendPrayerPushFallback = onSchedule(
  { schedule: '*/15 * * * *', timeZone: 'UTC', secrets: ['EXPO_ACCESS_TOKEN'], memory: '512MiB' },
  async () => {
    const startedAt = Date.now();
    try {
      const token = expoAccessToken.value();
      const settingsSnap = await db.collection('userPrayerSettings').get();
      logger.info(`[fcm-prayer] فحص ${settingsSnap.size} مستخدم`);

      const adhan = require('adhan');
      const now = new Date();
      const messages: ExpoPushMessage[] = [];
      const updates: Promise<unknown>[] = [];

      for (const docSnap of settingsSnap.docs) {
        const uid = docSnap.id;
        const s = docSnap.data();
        if (s.disabled) continue;
        if (typeof s.latitude !== 'number' || typeof s.longitude !== 'number') continue;

        // اقرأ FCM token من users/{uid}
        let fcmToken: string | undefined;
        try {
          const userDoc = await db.doc(`users/${uid}`).get();
          fcmToken = userDoc.data()?.fcmToken;
          // احترم تعطيل الإشعارات من المستخدم
          const notifEnabled = userDoc.data()?.notificationsEnabled !== false;
          if (!notifEnabled) continue;
        } catch { continue; }
        if (!fcmToken || !fcmToken.startsWith('ExponentPushToken')) continue;

        try {
          const coords = new adhan.Coordinates(s.latitude, s.longitude);
          const params = buildAdhanParams(s.calculationMethod || 4, s.asrJuristic || 0);
          const todayPrayers = new adhan.PrayerTimes(coords, now, params);
          const tomorrowPrayers = new adhan.PrayerTimes(
            coords,
            new Date(now.getTime() + 24 * 60 * 60 * 1000),
            params,
          );
          const next = todayPrayers.nextPrayer();
          const nextTime: Date = next === adhan.Prayer.None
            ? tomorrowPrayers.fajr
            : todayPrayers.timeForPrayer(next);
          if (!nextTime) continue;

          const minutesUntil = (nextTime.getTime() - now.getTime()) / 60000;
          // Send 5-15 minutes before prayer time so FCM delivery delay (≤10 min)
          // keeps the notification arriving around prayer time, not after it.
          // Sending at minutesUntil=0 caused 18+ minute post-prayer delivery.
          if (minutesUntil < 5 || minutesUntil > 15) continue;

          // De-duplication: تجاهل لو أرسلنا نفس الصلاة لنفس المستخدم خلال 30 دقيقة
          const prayerKey = String(next).toLowerCase();
          const dedupeId = `${uid}_${prayerKey}_${nextTime.toISOString().slice(0, 13)}`;
          const dedupeRef = db.doc(`fcmPrayerSent/${dedupeId}`);
          const dedupeSnap = await dedupeRef.get();
          if (dedupeSnap.exists) continue;

          const nameAr = PRAYER_NAMES_AR[prayerKey] ?? prayerKey;
          // Friday Dhuhr → Jumuah
          const isFriday = now.getDay() === 5;
          const effectiveKey = (prayerKey === 'dhuhr' && isFriday) ? 'jumuah' : prayerKey;
          // Title: 🕌 + full prayer title exactly matching app's getPrayerNotifTitle()
          const titleAr = `🕌 ${PRAYER_TITLES_AR[effectiveKey] ?? nameAr}`;
          const bodyAr = PRAYER_BODIES_AR[effectiveKey] ?? `حان وقت صلاة ${nameAr}`;
          messages.push({
            to: fcmToken,
            title: titleAr,
            body: bodyAr,
            sound: 'default',
            priority: 'high',
            data: {
              type: 'prayer_fallback',
              prayer: prayerKey,
              source: 'fcm',
            },
          });

          updates.push(
            dedupeRef.set({
              uid,
              prayer: prayerKey,
              sentAt: admin.firestore.FieldValue.serverTimestamp(),
              expireAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
            }),
          );
        } catch (e) {
          logger.warn(`[fcm-prayer] فشل حساب ${uid}:`, e);
        }
      }

      // أرسل في batches من 100
      let sent = 0;
      for (let i = 0; i < messages.length; i += 100) {
        sent += await sendExpoBatch(messages.slice(i, i + 100), token);
      }
      await Promise.allSettled(updates);

      logger.info(`[fcm-prayer] أُرسل ${sent}/${messages.length} push في ${Date.now() - startedAt}ms`);
    } catch (e) {
      logger.error('[fcm-prayer] failed:', e);
    }
  },
);

/**
 * Cleanup function: حذف dedupe records الأقدم من 24 ساعة.
 * يشتغل يومياً عشان firestore ما يمتلئ.
 */
export const cleanupFcmPrayerDedupe = onSchedule(
  { schedule: '0 3 * * *', timeZone: 'UTC' },
  async () => {
    try {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const snap = await db
        .collection('fcmPrayerSent')
        .where('expireAt', '<', cutoff)
        .limit(500)
        .get();
      const batch = db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      logger.info(`[fcm-prayer-cleanup] حذف ${snap.size} سجل`);
    } catch (e) {
      logger.error('[fcm-prayer-cleanup] failed:', e);
    }
  },
);
