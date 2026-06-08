"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.processEngagementTriggers = exports.runEngagementNotifications = exports.cleanupFcmPrayerDedupe = exports.sendPrayerPushFallback = exports.processScheduledAdminNotifications = exports.validateAdminSession = exports.verifyAdminPassword = exports.cleanupActivityDaily = exports.cacheLeaderboardSnapshot = exports.selectMonthlyWinners = exports.guardMonthlyEngagementRegression = exports.answerUserQuestionAutomatically = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const scheduler_1 = require("firebase-functions/v2/scheduler");
const params_1 = require("firebase-functions/params");
const crypto = __importStar(require("crypto"));
const engagement_guard_1 = require("./engagement-guard");
// Expo Access Token for authenticated push API calls
const expoAccessToken = (0, params_1.defineSecret)('EXPO_ACCESS_TOKEN');
// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
const logger = functions.logger;
const TIMEZONE_COUNTRIES = {
    'Africa/Cairo': 'EG',
    'Asia/Riyadh': 'SA',
    'Asia/Dubai': 'AE',
    'Asia/Kuwait': 'KW',
    'Asia/Qatar': 'QA',
    'Asia/Bahrain': 'BH',
    'Asia/Muscat': 'OM',
    'Asia/Baghdad': 'IQ',
    'Asia/Amman': 'JO',
    'Asia/Gaza': 'PS',
    'Asia/Hebron': 'PS',
    'Asia/Beirut': 'LB',
    'Asia/Damascus': 'SY',
    'Asia/Aden': 'YE',
    'Africa/Tripoli': 'LY',
    'Africa/Tunis': 'TN',
    'Africa/Algiers': 'DZ',
    'Africa/Casablanca': 'MA',
    'Africa/Khartoum': 'SD',
    'Europe/London': 'GB',
    'America/New_York': 'US',
    'America/Los_Angeles': 'US',
    'Europe/Paris': 'FR',
    'Europe/Berlin': 'DE',
    'Europe/Istanbul': 'TR',
};
function getTimezoneCountryCode(timezone) {
    return typeof timezone === 'string' ? TIMEZONE_COUNTRIES[timezone] || '' : '';
}
function hasPrayerLocation(data, prayerLocation) {
    return typeof data.locationLatitude === 'number' ||
        typeof data.locationLongitude === 'number' ||
        typeof prayerLocation?.latitude === 'number' ||
        typeof prayerLocation?.longitude === 'number';
}
function resolveCountryForTargeting(data, prayerLocation) {
    const storedCountry = String(data.country || '').toUpperCase();
    const timezoneCountry = getTimezoneCountryCode(data.timezone).toUpperCase();
    const countrySource = String(data.countrySource || 'device_locale');
    const locationAvailable = hasPrayerLocation(data, prayerLocation);
    const prayerCountry = String(data.prayerCountryCode || '').toUpperCase();
    // Prayer-GPS is the single source of truth once the user has confirmed
    // their location from the prayer screen. Admin edits never override this
    // for targeting purposes.
    if (prayerCountry) {
        return { country: prayerCountry, countrySource: 'gps', countryVerified: true };
    }
    if (locationAvailable && countrySource === 'gps' && storedCountry) {
        return { country: storedCountry, countrySource: 'gps', countryVerified: true };
    }
    const oldGpsTimezoneConflict = Boolean(timezoneCountry &&
        storedCountry &&
        timezoneCountry !== storedCountry &&
        countrySource === 'gps' &&
        !locationAvailable);
    return {
        country: oldGpsTimezoneConflict ? timezoneCountry : (storedCountry || timezoneCountry || 'SA'),
        countrySource,
        countryVerified: countrySource === 'admin' || locationAvailable || oldGpsTimezoneConflict,
    };
}
async function fetchPrayerLocationsByUserId() {
    const locations = new Map();
    try {
        const snap = await db.collection('userPrayerSettings').get();
        snap.forEach((docSnap) => {
            const data = docSnap.data();
            const latitude = typeof data.latitude === 'number' ? data.latitude : undefined;
            const longitude = typeof data.longitude === 'number' ? data.longitude : undefined;
            if (latitude === undefined && longitude === undefined)
                return;
            locations.set(docSnap.id, {
                latitude,
                longitude,
                city: typeof data.city === 'string' ? data.city : undefined,
                updatedAt: data.updatedAt,
            });
        });
    }
    catch (error) {
        logger.warn('[scheduled-admin-push] could not load prayer locations:', error);
    }
    return locations;
}
const EXPO_PUSH_APIS = [
    'https://api.expo.dev/v2/push/send',
    'https://exp.host/--/api/v2/push/send',
];
const EXPO_REQUEST_TIMEOUT_MS = 15000;
const AUTO_QA_DISCLAIMER = 'تنبيه: هذه إجابة بحثية آلية مبنية على المصادر المتاحة، وقد لا تكون دقيقة بنسبة 100%. حاولنا بذل أقصى جهد لتقديم أقرب إفادة، ويُفضّل الرجوع لأهل العلم في المسائل الشخصية أو الحساسة.';
const AUTO_QA_DISCLAIMER_EN = 'Note: This is an automated research answer based on the available sources, and it may not be 100% accurate. We did our best to provide the closest useful answer. Please consult qualified scholars for personal or sensitive matters.';
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
function sanitizeAllowedSite(value) {
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
function getQaConfigValue(key) {
    const envKey = `QA_${key.toUpperCase()}`;
    const envValue = process.env[envKey];
    if (envValue)
        return envValue;
    try {
        return functions.config().qa?.[key] || '';
    }
    catch {
        return '';
    }
}
function getAllowedQaSites(configuredSites) {
    if (Array.isArray(configuredSites)) {
        const sites = configuredSites
            .map(sanitizeAllowedSite)
            .filter(Boolean);
        if (sites.length > 0)
            return sites;
    }
    if (typeof configuredSites === 'string' && configuredSites.trim()) {
        const sites = configuredSites
            .split(/[,\n،]+/)
            .map(sanitizeAllowedSite)
            .filter(Boolean);
        if (sites.length > 0)
            return sites;
    }
    const configured = getQaConfigValue('allowed_sites');
    if (!configured)
        return DEFAULT_AUTO_QA_ALLOWED_SITES;
    return configured
        .split(/[,\n،]+/)
        .map(sanitizeAllowedSite)
        .filter(Boolean);
}
function getQaDailyLimit(_configuredLimit) {
    return null;
}
function getUtcDayKey() {
    return new Date().toISOString().slice(0, 10);
}
async function reserveAutoQaSearchQuota(dailyLimit) {
    if (!dailyLimit || dailyLimit <= 0)
        return true;
    const dayKey = getUtcDayKey();
    const ref = db.doc(`appUsage/qaAssistant_${dayKey}`);
    return db.runTransaction(async (transaction) => {
        const snap = await transaction.get(ref);
        const currentCount = Number(snap.data()?.count || 0);
        if (currentCount >= dailyLimit)
            return false;
        transaction.set(ref, {
            count: currentCount + 1,
            limit: dailyLimit,
            date: dayKey,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        return true;
    });
}
/**
 * Strip common Islamic greetings + closings from the question text before
 * running language detection / search-query construction.  Islamic greetings
 * in Latin script (assalamualaikum...) bias content-language detection toward
 * "ar" and pad the search query with non-keyword tokens that hurt recall.
 *
 * Conservative: only removes well-known multi-word greeting phrases at the
 * start/end of the question.  The remaining text is what the user actually
 * asked about.
 */
function stripIslamicGreetings(question) {
    let q = ` ${question} `;
    const patterns = [
        // Arabic greetings + their closings (Arabic letters don't trigger \b, so
        // we anchor against spaces / punctuation instead)
        /(^|[\s.,;:!?])السلام\s*عليكم(\s*ورحمة\s*الله(\s*وبركاته)?)?/gi,
        /(^|[\s.,;:!?])و?عليكم\s*السلام(\s*ورحمة\s*الله(\s*وبركاته)?)?/gi,
        /(^|[\s.,;:!?])بارك\s*الله\s*فيكم/gi,
        /(^|[\s.,;:!?])جزاكم?\s*الله\s*خيرا/gi,
        // Transliterated Islamic greetings (covers the Qurbani example)
        /\bas+ala?mu?\s*['`-]?\s*ala[iy]kum(\s*wa?\s*ra[hH]ma?t?[uo]l?lahi?)?(\s*wa?\s*barakatu?h?u?)?\b/gi,
        /\bwa?\s*['`-]?\s*ala[iy]kum\s*as+ala?m(\s*wa?\s*ra[hH]ma?t?[uo]l?lahi?)?(\s*wa?\s*barakatu?h?u?)?\b/gi,
        /\bsala?m\s*['`-]?\s*ala[iy]kum\b/gi,
        /\bbara?ka\s*allahu?\s*fi?kum\b/gi,
        /\bjaza?ka\s*allahu?\s*[kK]ha[iy]ran\b/gi,
        // Common filler phrases (tolerates short connector words / typos
        // between "question" and "regarding|about|on")
        /\bmy\s+question(\s+\S{1,4}){0,2}\s+(regarding|about|on)\b/gi,
        /\bI\s+have\s+a\s+question(\s+\S{1,4}){0,2}\s+(regarding|about|on)\b/gi,
        /\bI\s+(want|wanted|would\s+like)\s+to\s+(ask|know)\b/gi,
        /\bplease\s+(tell|let)\s+me\b/gi,
    ];
    for (const re of patterns) {
        q = q.replace(re, ' ');
    }
    return q.replace(/\s+/g, ' ').trim();
}
/**
 * Decide the language to use for the answer body / sources / disclaimer.
 * Falls back to the app-provided language when the content signal is weak.
 *
 * The original language field on the user-question doc represents the app's
 * UI language at submit time.  Users frequently type in a different language
 * from their UI (e.g. Arabic-UI app, English question text), so we override
 * here when the content language is clearly different.
 */
function detectQuestionLanguage(question, providedLanguage) {
    const cleaned = stripIslamicGreetings(question);
    const arabicChars = (cleaned.match(/[؀-ۿ]/g) || []).length;
    const latinChars = (cleaned.match(/[A-Za-z]/g) || []).length;
    const totalSignal = arabicChars + latinChars;
    // Not enough signal — trust the app-provided language
    if (totalSignal < 6)
        return providedLanguage || 'ar';
    const arabicShare = arabicChars / totalSignal;
    // ≥ 60 % Arabic letters → respond in Arabic
    if (arabicShare >= 0.6)
        return 'ar';
    // ≥ 70 % Latin letters → respond in the app language if it is a Latin-script
    // language; otherwise default to English so the user still understands.
    if (arabicShare <= 0.3) {
        const provided = (providedLanguage || '').toLowerCase();
        const latinLanguages = new Set(['en', 'fr', 'de', 'es', 'tr', 'id', 'ms', 'ru']);
        if (latinLanguages.has(provided))
            return provided;
        // Urdu / Hindi / Bengali are non-Latin scripts; if the typed text is Latin
        // we cannot safely answer in their native script, so fall back to English.
        return 'en';
    }
    // Mixed text — trust the app-provided language but bias toward Arabic when
    // unspecified, since the bundled fatwa corpus is Arabic-first.
    return providedLanguage || 'ar';
}
// Load the bundled seed glossary once.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const SEED_GLOSSARY = require('./qa-glossary.json');
function escapeRegex(input) {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function compileGlossaryEntries(entries) {
    const compiled = [];
    for (const entry of entries) {
        if (!entry?.ar)
            continue;
        const variants = new Set();
        const langs = ['en', 'fr', 'de', 'es', 'tr', 'ur', 'id', 'ms', 'hi', 'bn', 'ru'];
        for (const lang of langs) {
            const list = entry[lang];
            if (Array.isArray(list)) {
                for (const v of list) {
                    const trimmed = (v || '').trim();
                    if (trimmed.length >= 2)
                        variants.add(trimmed);
                }
            }
        }
        if (variants.size === 0)
            continue;
        // Longer variants first so multi-word terms match before sub-strings
        const sorted = Array.from(variants).sort((a, b) => b.length - a.length);
        const pattern = sorted.map(escapeRegex).join('|');
        try {
            // Unicode-aware boundaries: not preceded/followed by another letter or
            // number from any script.  Works for Latin, Arabic, Urdu, Hindi, Bengali, …
            compiled.push({
                re: new RegExp(`(?<![\\p{L}\\p{N}])(?:${pattern})(?![\\p{L}\\p{N}])`, 'giu'),
                ar: entry.ar,
            });
        }
        catch (err) {
            logger.warn('[glossary] failed to compile entry', { ar: entry.ar, err: String(err).slice(0, 80) });
        }
    }
    return compiled;
}
const COMPILED_SEED_GLOSSARY = compileGlossaryEntries(SEED_GLOSSARY.entries || []);
// Cache of compiled glossary entries from the admin-curated Firestore
// collection.  Refreshed every 5 minutes per function instance to keep
// the hot path warm without re-reading on every request.
let _adminGlossaryCache = [];
let _adminGlossaryFetchedAt = 0;
const ADMIN_GLOSSARY_TTL_MS = 5 * 60 * 1000;
async function getAdminGlossary() {
    const now = Date.now();
    if (now - _adminGlossaryFetchedAt < ADMIN_GLOSSARY_TTL_MS)
        return _adminGlossaryCache;
    try {
        const snap = await db.collection('qaGlossary').get();
        const entries = snap.docs.map((d) => d.data());
        _adminGlossaryCache = compileGlossaryEntries(entries);
        _adminGlossaryFetchedAt = now;
        logger.info('[glossary] admin entries loaded', { count: entries.length });
    }
    catch (err) {
        // If the collection doesn't exist yet, treat as empty
        logger.info('[glossary] admin collection unavailable, using seed only', {
            err: String(err).slice(0, 80),
        });
        _adminGlossaryCache = [];
        _adminGlossaryFetchedAt = now;
    }
    return _adminGlossaryCache;
}
async function applyIslamicTransliterations(text) {
    let out = text;
    for (const { re, ar } of COMPILED_SEED_GLOSSARY) {
        out = out.replace(re, ar);
    }
    const adminEntries = await getAdminGlossary();
    for (const { re, ar } of adminEntries) {
        out = out.replace(re, ar);
    }
    return out;
}
/**
 * Translate text from a non-Arabic source language to Arabic.  Tries
 * MyMemory first (best quality on Islamic terminology with hints), falls
 * back to LibreTranslate when MyMemory fails or rate-limits.  Chunks long
 * input to stay under each provider's per-request limit.
 *
 * Returns the original text if every provider fails or echoes input.
 */
async function translateToArabic(text, sourceLang) {
    const src = (sourceLang || 'en').toLowerCase();
    if (!text.trim() || src === 'ar')
        return text;
    const chunks = chunkForTranslation(text, 450);
    const translated = await Promise.all(chunks.map(async (chunk) => {
        const myMemory = await translateOneViaMyMemory(chunk, src, 'ar');
        if (myMemory && hasArabicText(myMemory) && myMemory !== chunk)
            return myMemory;
        const libre = await translateOneViaLibre(chunk, src, 'ar');
        if (libre && hasArabicText(libre) && libre !== chunk)
            return libre;
        return chunk;
    }));
    return translated.join(' ').replace(/\s+/g, ' ').trim();
}
function chunkForTranslation(text, maxLen) {
    const parts = text.split(/(?<=[.!?؟])\s+|\n+/).map((p) => p.trim()).filter(Boolean);
    const chunks = [];
    let buffer = '';
    for (const part of parts) {
        if ((buffer + ' ' + part).length > maxLen) {
            if (buffer)
                chunks.push(buffer);
            buffer = part;
        }
        else {
            buffer = buffer ? `${buffer} ${part}` : part;
        }
    }
    if (buffer)
        chunks.push(buffer);
    return chunks.length ? chunks.slice(0, 6) : [text.slice(0, maxLen)];
}
/**
 * Translation memoization layer.  Every successful provider result is
 * persisted in Firestore (`qaTranslationCache/{hash}`) and re-served on
 * future requests, so we never pay the same translation twice — saving
 * latency and free-tier quota on MyMemory / LibreTranslate.
 *
 * Two tiers:
 *   • In-memory LRU (per function instance) — sub-ms hits, capped at 500 entries
 *   • Firestore (`qaTranslationCache` collection) — durable, shared across instances
 *
 * On a hit, `hits` increments and `lastUsedAt` updates so the admin can
 * later inspect the most-used translations and curate them.
 */
const _memoryCache = new Map();
const MEMORY_CACHE_LIMIT = 500;
function cacheKey(text, from, to) {
    return crypto.createHash('sha1').update(`${from}|${to}|${text}`).digest('hex');
}
function lruGet(key) {
    if (!_memoryCache.has(key))
        return undefined;
    const v = _memoryCache.get(key);
    // Bump to most-recently-used by re-inserting
    _memoryCache.delete(key);
    _memoryCache.set(key, v);
    return v;
}
function lruSet(key, value) {
    if (_memoryCache.has(key))
        _memoryCache.delete(key);
    _memoryCache.set(key, value);
    if (_memoryCache.size > MEMORY_CACHE_LIMIT) {
        const oldest = _memoryCache.keys().next().value;
        if (oldest)
            _memoryCache.delete(oldest);
    }
}
async function readTranslationCache(text, from, to) {
    const key = cacheKey(text, from, to);
    const mem = lruGet(key);
    if (mem)
        return mem;
    try {
        const snap = await db.collection('qaTranslationCache').doc(key).get();
        if (!snap.exists)
            return null;
        const data = snap.data();
        const translation = data?.translation;
        if (translation) {
            lruSet(key, translation);
            // Fire-and-forget hit counter; never block translation on it
            snap.ref.update({
                hits: admin.firestore.FieldValue.increment(1),
                lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
            }).catch(() => undefined);
            return translation;
        }
        return null;
    }
    catch {
        return null;
    }
}
async function writeTranslationCache(text, from, to, translation, provider) {
    const key = cacheKey(text, from, to);
    lruSet(key, translation);
    try {
        await db.collection('qaTranslationCache').doc(key).set({
            sourceText: text.slice(0, 1000),
            sourceLang: from,
            targetLang: to,
            translation,
            provider,
            hits: 1,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    catch {
        // Cache writes are best-effort
    }
}
async function translateOneViaMyMemory(text, from, to) {
    const cached = await readTranslationCache(text, from, to);
    if (cached)
        return cached;
    try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        if (!res.ok)
            return '';
        const data = await res.json();
        const out = data?.responseData?.translatedText?.trim() || '';
        if (!out || out === text)
            return '';
        if (data.responseStatus === 429)
            return '';
        if (out.includes('%') && /%[0-9A-F]{2}/.test(out))
            return '';
        await writeTranslationCache(text, from, to, out, 'mymemory');
        return out;
    }
    catch {
        return '';
    }
}
async function translateOneViaLibre(text, from, to) {
    // MyMemory failed before this is called, so do NOT re-check cache here.
    const instances = [
        'https://libretranslate.com',
        'https://translate.argosopentech.com',
        'https://libretranslate.de',
    ];
    for (const instance of instances) {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 8000);
            const res = await fetch(`${instance}/translate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ q: text, source: from, target: to, format: 'text' }),
                signal: controller.signal,
            });
            clearTimeout(timer);
            if (!res.ok)
                continue;
            const data = await res.json();
            const out = data?.translatedText?.trim();
            if (out && out !== text) {
                await writeTranslationCache(text, from, to, out, `libre:${instance}`);
                return out;
            }
        }
        catch {
            continue;
        }
    }
    return '';
}
/**
 * Build an Arabic search query from a non-Arabic question:
 *   1. Apply Islamic transliteration hints (Qurbani → الأضحية).
 *   2. Translate the remainder via MyMemory / LibreTranslate.
 * Falls back to the hinted text if translation fails, since even partial
 * Arabic terms are better than English keywords on Arabic-only sites.
 */
async function buildArabicSearchQuery(cleanedQuestion, language) {
    if (isArabicLanguage(language))
        return cleanedQuestion;
    const hinted = await applyIslamicTransliterations(cleanedQuestion);
    // If transliteration alone already produced mostly Arabic text, use it.
    const arabicShare = (hinted.match(/[؀-ۿ]/g) || []).length /
        Math.max((hinted.match(/[؀-ۿA-Za-z]/g) || []).length, 1);
    if (arabicShare >= 0.6)
        return hinted;
    const translated = await translateToArabic(hinted, language);
    if (translated && hasArabicText(translated))
        return translated;
    return hinted;
}
function normalizeArabicText(value) {
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
function buildExpandedSearchQuery(question, allowedSites) {
    const normalizedQuestion = normalizeArabicText(question);
    const expansions = ARABIC_SYNONYM_GROUPS
        .filter((group) => group.some((term) => normalizedQuestion.includes(normalizeArabicText(term))))
        .slice(0, 3)
        .map((group) => `(${group.slice(0, 6).join(' OR ')})`);
    const siteFilter = allowedSites.map((site) => `site:${site}`).join(' OR ');
    return [question, ...expansions, siteFilter].join(' ').slice(0, 1500);
}
function buildMeaningSearchQuery(question) {
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
function extractQuestionKeywords(question) {
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
function scoreRelevance(question, text) {
    const keywords = extractQuestionKeywords(question);
    if (keywords.length === 0)
        return 1;
    const normalizedText = normalizeArabicText(text);
    const hits = keywords.filter((kw) => normalizedText.includes(kw)).length;
    return hits / keywords.length;
}
function getAutoQaSiteFallbackLimit() {
    const configured = Number(getQaConfigValue('site_fallback_limit'));
    if (Number.isFinite(configured) && configured > 0)
        return Math.min(allowedInteger(configured), 8);
    return 6;
}
function allowedInteger(value) {
    return Math.max(1, Math.floor(value));
}
function decodeHtmlEntities(value) {
    return value
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}
function stripHtml(value) {
    return decodeHtmlEntities(value.replace(/<[^>]*>/g, ' '))
        .replace(/\s+/g, ' ')
        .trim();
}
function normalizeSearchResultUrl(rawUrl) {
    const decoded = decodeHtmlEntities(rawUrl);
    if (decoded.startsWith('//'))
        return `https:${decoded}`;
    try {
        const url = new URL(decoded, 'https://duckduckgo.com');
        const duckDuckGoTarget = url.searchParams.get('uddg');
        if (duckDuckGoTarget)
            return decodeURIComponent(duckDuckGoTarget);
        return url.toString();
    }
    catch {
        return decoded;
    }
}
function isAllowedSourceUrl(urlValue, allowedSites) {
    try {
        const hostname = new URL(urlValue).hostname.replace(/^www\./, '').toLowerCase();
        return allowedSites.some((site) => hostname === site || hostname.endsWith(`.${site}`));
    }
    catch {
        return allowedSites.some((site) => urlValue.includes(site));
    }
}
function getSourceHost(urlValue) {
    try {
        return new URL(urlValue).hostname.replace(/^www\./, '');
    }
    catch {
        return urlValue;
    }
}
/** Clean raw extracted text: collapse whitespace, strip leading answer labels */
function cleanExtractedText(raw, maxLen = 900) {
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
function looksLikeNavigation(text) {
    // Repeated "موسوعة" pattern — encyclopedia catalog / sidebar nav
    const encyclopediaCount = (text.match(/موسوعة/g) || []).length;
    if (encyclopediaCount >= 3)
        return true;
    // Too many short tokens with no actual sentences — navigation list heuristic
    const words = text.trim().split(/\s+/);
    if (words.length < 6)
        return false; // too short to judge
    const avgWordLen = words.reduce((s, w) => s + w.length, 0) / words.length;
    // Real Arabic sentences have longer average word length; nav items are short titles
    if (avgWordLen < 3.5 && words.length > 8)
        return true;
    // Common navigation / footer phrases repeated multiple times
    const navPhrases = ['شارك معنا', 'قراءة في كتاب', 'نفائس الموسوعات', 'مقالات وبحوث', 'أحاديث منتشرة لا تصح'];
    const navHits = navPhrases.filter((p) => text.includes(p)).length;
    if (navHits >= 2)
        return true;
    return false;
}
/**
 * Fetch a specific fatwa/answer page and extract the main answer text.
 * Tries site-specific selectors first, then falls back to Arabic keyword search.
 */
async function extractFatwaContent(url) {
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
        if (!response.ok)
            return '';
        const html = await response.text();
        // ── Strategy 1: site-specific content divs ──────────────────────────────
        const hostname = (() => {
            try {
                return new URL(url).hostname.replace(/^www\./, '');
            }
            catch {
                return '';
            }
        })();
        const selectorPatterns = [];
        if (hostname === 'islamweb.net') {
            selectorPatterns.push(/(?:class|id)="[^"]*(?:FatwaContent|fatwa-content|fatwa_content|fatwaContent)[^"]*"[^>]*>([\s\S]{80,5000}?)<\/div>/i, /(?:class|id)="[^"]*(?:art-content|article-content|main-content)[^"]*"[^>]*>([\s\S]{80,5000}?)<\/div>/i);
        }
        else if (hostname === 'islamqa.info') {
            selectorPatterns.push(/(?:class|id)="[^"]*(?:answer-body|answer|block answer|entry-content)[^"]*"[^>]*>([\s\S]{80,5000}?)<\/div>/i);
        }
        else if (hostname === 'binbaz.org.sa') {
            selectorPatterns.push(/(?:class|id)="[^"]*(?:fatwa-content|content-area|entry-content|the-content)[^"]*"[^>]*>([\s\S]{80,5000}?)<\/div>/i);
        }
        else if (hostname === 'dorar.net') {
            selectorPatterns.push(/(?:class|id)="[^"]*(?:content|main-text|feqhia-content)[^"]*"[^>]*>([\s\S]{80,5000}?)<\/div>/i);
        }
        // Generic fallback selectors
        selectorPatterns.push(/<article[^>]*>([\s\S]{80,5000}?)<\/article>/i, /(?:class|id)="[^"]*(?:content|main|post-content|page-content)[^"]*"[^>]*>([\s\S]{80,5000}?)<\/(?:div|section|main)>/i);
        for (const rx of selectorPatterns) {
            const m = html.match(rx);
            if (m) {
                const text = cleanExtractedText(stripHtml(m[1]));
                if (text.length >= 80 && !looksLikeNavigation(text))
                    return text;
            }
        }
        // ── Strategy 2: keyword-based — find "الجواب" / "الإجابة" in raw HTML ──
        const markers = ['الجواب', 'الإجابة', 'الفتوى', 'الرد'];
        let bestIdx = -1;
        for (const marker of markers) {
            const idx = html.indexOf(marker);
            if (idx > 0 && (bestIdx === -1 || idx < bestIdx))
                bestIdx = idx;
        }
        if (bestIdx > 0) {
            // Skip the tag that contains the keyword itself (it might be a heading)
            const window = html.slice(bestIdx, bestIdx + 6000);
            const text = cleanExtractedText(stripHtml(window));
            if (text.length >= 80 && !looksLikeNavigation(text))
                return text;
        }
        // ── Strategy 3: harvest RTL paragraphs ───────────────────────────────────
        const paras = [];
        const paraRx = /<p[^>]*(?:dir="rtl"|lang="ar")[^>]*>([\s\S]{30,800}?)<\/p>/gi;
        let m2;
        while ((m2 = paraRx.exec(html)) && paras.length < 5) {
            const t = stripHtml(m2[1]).trim();
            if (t.length > 30 && !looksLikeNavigation(t) && !/جميع الحقوق|©|cookie|copyright/i.test(t)) {
                paras.push(t);
            }
        }
        if (paras.length > 0) {
            const joined = cleanExtractedText(paras.join('\n'), 900);
            if (!looksLikeNavigation(joined))
                return joined;
        }
        return '';
    }
    catch {
        return '';
    }
    finally {
        clearTimeout(timer);
    }
}
function isArabicLanguage(language) {
    return !language || language === 'ar';
}
function getAutoQaDisclaimer(language) {
    return isArabicLanguage(language) ? AUTO_QA_DISCLAIMER : AUTO_QA_DISCLAIMER_EN;
}
function hasArabicText(text) {
    return /[\u0600-\u06FF]/.test(text || '');
}
/**
 * Translate Arabic text to the user's language using the free MyMemory
 * endpoint.  Best-effort: returns the original text on failure or empty result.
 * MyMemory accepts up to ~500 chars per request, so callers should chunk.
 */
async function translateViaMyMemory(text, targetLang) {
    if (!text.trim() || isArabicLanguage(targetLang))
        return text;
    try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ar|${targetLang}`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        if (!res.ok)
            return text;
        const data = await res.json();
        const translated = data?.responseData?.translatedText;
        if (!translated || translated.trim().length === 0)
            return text;
        if (data.responseStatus === 429)
            return text;
        if (translated.includes('%') && /%[0-9A-F]{2}/.test(translated))
            return text;
        return translated.trim();
    }
    catch {
        return text;
    }
}
/**
 * Translate a longer Arabic block in paragraph-sized chunks so each call
 * stays under MyMemory's per-request limit, then re-join.  Capped at ~1.8K
 * chars (4 chunks) to keep cloud-function latency reasonable.
 */
async function translateArabicContent(text, targetLang) {
    if (isArabicLanguage(targetLang) || !text.trim())
        return text;
    const paragraphs = text.split(/\n+/).map((p) => p.trim()).filter(Boolean);
    const chunks = [];
    let buffer = '';
    for (const para of paragraphs) {
        if ((buffer + ' ' + para).length > 450) {
            if (buffer)
                chunks.push(buffer);
            buffer = para;
        }
        else {
            buffer = buffer ? `${buffer}\n${para}` : para;
        }
    }
    if (buffer)
        chunks.push(buffer);
    const capped = chunks.slice(0, 4);
    const translated = await Promise.all(capped.map((c) => translateViaMyMemory(c, targetLang)));
    return translated.join('\n\n');
}
async function buildAutoQaAnswer(question, sources, extractedContent, language = 'ar') {
    const disclaimer = getAutoQaDisclaimer(language);
    // Priority 1: actual content fetched from a fatwa page.  For non-Arabic
    // users, translate the Arabic fatwa to their language so the answer
    // matches the language they asked in.
    if (extractedContent && extractedContent.length >= 80) {
        if (isArabicLanguage(language)) {
            return `${extractedContent}\n\n${disclaimer}`;
        }
        const translated = await translateArabicContent(extractedContent.slice(0, 1800), language);
        if (translated && translated !== extractedContent) {
            return `${translated}\n\n${disclaimer}`;
        }
    }
    // Priority 2: compile meaningful snippets from the sources themselves
    const GENERIC_SNIPPET_RX = /اضغط هنا|للاطلاع على|نتائج البحث في/;
    const meaningfulSources = sources.filter((s) => s.snippet &&
        s.snippet.length > 40 &&
        !GENERIC_SNIPPET_RX.test(s.snippet) &&
        scoreRelevance(question, s.snippet) > 0);
    if (meaningfulSources.length > 0) {
        const compiled = meaningfulSources
            .slice(0, 3)
            .map((s) => s.snippet)
            .join('\n\n');
        if (isArabicLanguage(language) || !hasArabicText(compiled)) {
            return `${compiled}\n\n${disclaimer}`;
        }
        const translated = await translateArabicContent(compiled, language);
        if (translated && translated !== compiled) {
            return `${translated}\n\n${disclaimer}`;
        }
    }
    // Priority 3: generic fallback (no content, no relevant snippets)
    if (!isArabicLanguage(language)) {
        return `I found the closest sources related to your question in the links below.\n\n${disclaimer}`;
    }
    return `وجدت لك أقرب مصادر مرتبطة بسؤالك مع الروابط أدناه.\n\n${disclaimer}`;
}
function getCuratedFallbackSources(question) {
    const normalized = normalizeArabicText(question);
    const has = (terms) => terms.some((t) => normalized.includes(normalizeArabicText(t)));
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
function dedupeSources(sources, allowedSites, limit = 5) {
    const seen = new Set();
    const unique = [];
    for (const source of sources) {
        if (!source.title || !source.url)
            continue;
        if (!isAllowedSourceUrl(source.url, allowedSites))
            continue;
        let key = source.url;
        try {
            const url = new URL(source.url);
            url.hash = '';
            key = `${url.hostname.replace(/^www\./, '')}${url.pathname.replace(/\/$/, '')}`;
        }
        catch {
            key = source.url;
        }
        if (seen.has(key))
            continue;
        seen.add(key);
        unique.push(source);
        if (unique.length >= limit)
            break;
    }
    return unique;
}
async function requestGoogleAutoQaSources(apiKey, searchEngineId, query, allowedSites, siteSearch, num = 5) {
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
    const data = await response.json();
    return (data.items || [])
        .map((item) => ({
        title: String(item.title || '').trim(),
        url: String(item.link || '').trim(),
        snippet: String(item.snippet || '').trim(),
    }))
        .filter((item) => item.title && item.url && isAllowedSourceUrl(item.url, allowedSites))
        .slice(0, 5);
}
async function searchGoogleAutoQaSources(question, allowedSites) {
    const apiKey = getQaConfigValue('google_api_key');
    const searchEngineId = getQaConfigValue('google_cse_id') || DEFAULT_GOOGLE_CSE_ID;
    if (!apiKey) {
        throw new Error('AUTO_QA_SEARCH_NOT_CONFIGURED');
    }
    const collected = [];
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
            if (unique.length >= 3)
                return unique;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger.warn('[auto-qa] google query failed:', message.slice(0, 240));
            throw error;
        }
    }
    const siteFallbackLimit = getAutoQaSiteFallbackLimit();
    for (const site of allowedSites.slice(0, siteFallbackLimit)) {
        try {
            const sources = await requestGoogleAutoQaSources(apiKey, searchEngineId, meaningQuery || question, allowedSites, site, 2);
            collected.push(...sources);
            const unique = dedupeSources(collected, allowedSites);
            logger.info('[auto-qa] google site fallback completed', { site, count: unique.length });
            if (unique.length >= 5)
                return unique;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger.warn('[auto-qa] google site fallback failed:', { site, error: message.slice(0, 180) });
        }
    }
    return dedupeSources(collected, allowedSites);
}
async function fetchSearchHtml(url) {
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
function parseSearchHtmlResults(html, allowedSites) {
    const results = [];
    const resultRegex = /<a[^>]+href=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/g;
    let match;
    while ((match = resultRegex.exec(html)) && results.length < 5) {
        const urlValue = normalizeSearchResultUrl(match[2]);
        const title = stripHtml(match[3]);
        if (!title || !urlValue.startsWith('http'))
            continue;
        if (title.length < 6)
            continue;
        if (!isAllowedSourceUrl(urlValue, allowedSites))
            continue;
        if (results.some((result) => result.url === urlValue))
            continue;
        results.push({ title, url: urlValue, snippet: '' });
    }
    return results;
}
async function fetchSourceSnippet(urlValue) {
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
        if (!response.ok)
            return '';
        const html = await response.text();
        const metaMatch = html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
            html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["'](?:description|og:description)["'][^>]*>/i);
        const paragraphMatch = html.match(/<p[^>]*>([\s\S]{80,700}?)<\/p>/i);
        const snippet = stripHtml(metaMatch?.[1] || paragraphMatch?.[1] || '');
        return snippet.length > 260 ? `${snippet.slice(0, 257).trim()}...` : snippet;
    }
    catch {
        return '';
    }
    finally {
        clearTimeout(timeout);
    }
}
async function enrichSources(sources) {
    const enriched = await Promise.all(sources.slice(0, 5).map(async (source) => {
        const snippet = source.snippet || await fetchSourceSnippet(source.url);
        return {
            ...source,
            snippet: snippet || `مصدر من ${getSourceHost(source.url)} مرتبط بالسؤال.`,
        };
    }));
    return enriched;
}
async function searchDuckDuckGoAutoQaSources(question, allowedSites) {
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
    const collected = [];
    for (const query of queries) {
        for (const endpoint of endpoints) {
            try {
                const url = new URL(endpoint);
                url.searchParams.set('q', query);
                const html = await fetchSearchHtml(url);
                const sources = parseSearchHtmlResults(html, allowedSites);
                collected.push(...sources);
                const unique = dedupeSources(collected, allowedSites);
                if (unique.length >= 3)
                    return enrichSources(unique);
            }
            catch (error) {
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
function extractLinksFromHtml(html, pathPattern, base) {
    const found = [];
    const seen = new Set();
    let m;
    while ((m = pathPattern.exec(html)) && found.length < 8) {
        const rawPath = m[1];
        const fullUrl = rawPath.startsWith('http') ? rawPath : `${base}${rawPath}`;
        const clean = fullUrl.split('?')[0].split('#')[0];
        if (seen.has(clean))
            continue;
        seen.add(clean);
        // 600 chars of HTML context around the link for title/snippet extraction
        const pos = m.index;
        const ctx = html.slice(Math.max(0, pos - 250), Math.min(html.length, pos + 600));
        found.push({ url: clean, context: ctx });
    }
    return found;
}
/** Pull the best title string from a chunk of HTML context */
function extractTitleFromContext(ctx) {
    const matchers = [
        /<h[2-4][^>]*>([\s\S]{6,240}?)<\/h[2-4]>/i,
        /class="[^"]*(?:title|heading)[^"]*"[^>]*>([\s\S]{6,240}?)<\//i,
        />([^<]{10,200})<\/a>/,
    ];
    for (const rx of matchers) {
        const m = ctx.match(rx);
        if (m) {
            const t = stripHtml(m[1]).trim();
            if (t.length >= 8)
                return t;
        }
    }
    return '';
}
/** Scrape islamweb.net search directly */
async function searchIslamwebDirect(question) {
    const queries = Array.from(new Set([question, buildMeaningSearchQuery(question)].filter(Boolean))).slice(0, 2);
    const results = [];
    for (const query of queries) {
        try {
            const url = new URL(`${ISLAMWEB_BASE}/ar/fatwa/search/`);
            url.searchParams.set('q', query);
            const html = await fetchSearchHtml(url);
            // Fatwa and article links: /ar/fatwa/NNNNN/... or /ar/article/NNNNN/...
            const pathRx = /href="(\/ar\/(?:fatwa|article)\/\d+[^"?#]*)"/g;
            const links = extractLinksFromHtml(html, pathRx, ISLAMWEB_BASE);
            for (const { url: fullUrl, context } of links) {
                if (results.some((r) => r.url === fullUrl))
                    continue;
                const title = extractTitleFromContext(context);
                if (!title)
                    continue;
                // Skip navigation/sidebar links whose context has no question keywords
                if (scoreRelevance(question, stripHtml(context)) === 0)
                    continue;
                const snippetM = context.match(/<p[^>]*>([\s\S]{20,400}?)<\/p>/i);
                const snippet = snippetM ? stripHtml(snippetM[1]).slice(0, 260).trim() : '';
                results.push({ title, url: fullUrl, snippet });
                if (results.length >= 5)
                    break;
            }
        }
        catch (err) {
            logger.warn('[auto-qa] islamweb direct failed:', err instanceof Error ? err.message.slice(0, 120) : String(err));
        }
        if (results.length >= 3)
            break;
    }
    return results.length > 0 ? enrichSources(results.slice(0, 5)) : [];
}
/** Scrape islamqa.info search directly */
async function searchIslamqaDirect(question) {
    const queries = Array.from(new Set([question, buildMeaningSearchQuery(question)].filter(Boolean))).slice(0, 2);
    const results = [];
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
                if (results.some((r) => r.url === fullUrl))
                    continue;
                const title = extractTitleFromContext(context);
                if (!title)
                    continue;
                // Skip navigation/sidebar links whose context has no question keywords
                if (scoreRelevance(question, stripHtml(context)) === 0)
                    continue;
                results.push({ title, url: fullUrl, snippet: '' });
                if (results.length >= 4)
                    break;
            }
        }
        catch (err) {
            logger.warn('[auto-qa] islamqa direct failed:', err instanceof Error ? err.message.slice(0, 120) : String(err));
        }
        if (results.length >= 2)
            break;
    }
    return results.length > 0 ? enrichSources(results.slice(0, 4)) : [];
}
/** Scrape dorar.net fiqh search directly */
async function searchDorarDirect(question) {
    const queries = Array.from(new Set([question, buildMeaningSearchQuery(question)].filter(Boolean))).slice(0, 2);
    const results = [];
    for (const query of queries) {
        try {
            const url = new URL(`${DORAR_BASE}/feqhia`);
            url.searchParams.set('q', query);
            const html = await fetchSearchHtml(url);
            // dorar.net fiqh links: /feqhia/NNNNN
            const pathRx = /href="(\/feqhia\/\d+[^"?#]*)"/g;
            const links = extractLinksFromHtml(html, pathRx, DORAR_BASE);
            for (const { url: fullUrl, context } of links) {
                if (results.some((r) => r.url === fullUrl))
                    continue;
                const title = extractTitleFromContext(context);
                if (!title)
                    continue;
                // Skip sidebar/navigation links whose surrounding context shares no keywords with the question
                if (scoreRelevance(question, stripHtml(context)) === 0)
                    continue;
                results.push({ title, url: fullUrl, snippet: '' });
                if (results.length >= 4)
                    break;
            }
        }
        catch (err) {
            logger.warn('[auto-qa] dorar direct failed:', err instanceof Error ? err.message.slice(0, 120) : String(err));
        }
        if (results.length >= 2)
            break;
    }
    return results.length > 0 ? enrichSources(results.slice(0, 3)) : [];
}
/**
 * Last-resort fallback: always returns 3 clickable search-page links so the
 * function never saves status=no_results.  The user can tap any link and browse
 * the site's own search results for their question.
 */
function buildGenericSearchLinks(question, language = 'ar') {
    const shortQ = question.slice(0, 60);
    // Route through a site-scoped Google search instead of each site's own search
    // page. The sites' internal search endpoints are unreliable (islamweb/dorar block
    // datacenter IPs and change paths), but a Google `site:` query always lands the
    // user on real, current results that open fine on their device.
    const siteSearch = (site) => `https://www.google.com/search?q=${encodeURIComponent(`site:${site} ${question}`)}`;
    if (!isArabicLanguage(language)) {
        return [
            {
                title: `Islamweb results: ${shortQ}`,
                url: siteSearch('islamweb.net'),
                snippet: 'Open results from the Islamweb fatwa database related to your question.',
            },
            {
                title: `Islam Q&A results: ${shortQ}`,
                url: siteSearch('islamqa.info'),
                snippet: 'Open results from Islam Question & Answer related to your question.',
            },
            {
                title: `Dorar results: ${shortQ}`,
                url: siteSearch('dorar.net'),
                snippet: 'Open results from the Dorar jurisprudence encyclopedia related to your question.',
            },
        ];
    }
    return [
        {
            title: `نتائج البحث في إسلام ويب: ${shortQ}`,
            url: siteSearch('islamweb.net'),
            snippet: 'اضغط هنا لعرض الفتاوى المتعلقة بسؤالك من موقع إسلام ويب.',
        },
        {
            title: `نتائج البحث في إسلام سؤال وجواب: ${shortQ}`,
            url: siteSearch('islamqa.info'),
            snippet: 'اضغط هنا لعرض الفتاوى المتعلقة بسؤالك من موقع إسلام سؤال وجواب.',
        },
        {
            title: `نتائج البحث في الدرر السنية: ${shortQ}`,
            url: siteSearch('dorar.net'),
            snippet: 'اضغط هنا لعرض المسائل الفقهية المتعلقة بسؤالك في الموسوعة الفقهية.',
        },
    ];
}
function localizeAutoQaSources(sources, question, language = 'ar') {
    if (isArabicLanguage(language))
        return sources;
    const shortQ = question.slice(0, 60);
    return sources.map((source, index) => {
        const host = getSourceHost(source.url);
        return {
            ...source,
            title: hasArabicText(source.title)
                ? `${index + 1}. Source from ${host}: ${shortQ}`
                : source.title,
            snippet: hasArabicText(source.snippet)
                ? `Open this source on ${host} to review material related to your question.`
                : source.snippet,
        };
    });
}
async function searchAutoQaSources(question, configuredSites) {
    const allowedSites = getAllowedQaSites(configuredSites);
    // ── Step 1: direct scraping of the three main Islamic sites (no API key) ──
    const directCollected = [];
    try {
        const [islamwebR, islamqaR, dorarR] = await Promise.allSettled([
            searchIslamwebDirect(question),
            searchIslamqaDirect(question),
            searchDorarDirect(question),
        ]);
        for (const r of [islamwebR, islamqaR, dorarR]) {
            if (r.status === 'fulfilled')
                directCollected.push(...r.value);
        }
    }
    catch (err) {
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
            if (combined.length > 0)
                return combined;
        }
        catch (err) {
            logger.warn('[auto-qa] ddg failed:', err instanceof Error ? err.message.slice(0, 180) : String(err));
        }
    }
    else {
        try {
            const googleSources = await searchGoogleAutoQaSources(question, allowedSites);
            if (googleSources.length > 0) {
                return dedupeSources([...directCollected, ...googleSources], allowedSites, 5);
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger.warn('[auto-qa] google search failed, trying ddg:', message.slice(0, 240));
        }
        try {
            const ddgSources = await searchDuckDuckGoAutoQaSources(question, allowedSites);
            const combined = dedupeSources([...directCollected, ...ddgSources], allowedSites, 5);
            if (combined.length > 0)
                return combined;
        }
        catch (err) {
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
exports.answerUserQuestionAutomatically = functions.firestore
    .document('userQuestions/{questionId}')
    .onCreate(async (snap) => {
    const data = snap.data() || {};
    const question = String(data.question || '').trim();
    const submittedLanguage = String(data.language || 'ar');
    if (!question)
        return;
    if (data.requestMode !== 'assistant')
        return;
    // Detect the actual content language of the question (the user may type in
    // English even when the app UI is Arabic).  Strip Islamic greetings first
    // so they do not bias detection toward Arabic.
    const cleanedQuestion = stripIslamicGreetings(question) || question;
    const language = detectQuestionLanguage(question, submittedLanguage);
    await snap.ref.update({
        autoAnswerStatus: 'searching',
        autoAnswerDisclaimer: getAutoQaDisclaimer(language),
        autoAnswerLanguage: language,
        autoAnswerStartedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Translate non-Arabic questions into Arabic before searching the
    // Arabic-only fatwa sites; we keep `cleanedQuestion` for display and
    // use `searchQuery` for IslamWeb / IslamQA / Dorar lookups + scoring.
    const searchQuery = await buildArabicSearchQuery(cleanedQuestion, language);
    logger.info('[auto-qa] language resolved', {
        submitted: submittedLanguage,
        detected: language,
        cleanedPreview: cleanedQuestion.slice(0, 80),
        searchQueryPreview: searchQuery.slice(0, 80),
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
                autoAnswer: isArabicLanguage(language)
                    ? 'نأسف، تم الوصول للحد الرسمي للأسئلة اليوم. يمكنك إرسال سؤالك لنا وسنراجعه ونرد عليك بمصادر موثوقة خلال 48 ساعة إن شاء الله.'
                    : 'Sorry, the official question limit for today has been reached. You can send us your question and we will review it with trusted sources within 48 hours, inshaAllah.',
                autoAnswerSources: [],
                autoAnswerCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            return;
        }
        const sources = await searchAutoQaSources(searchQuery, assistantConfig.allowedSites);
        if (sources.length === 0) {
            await snap.ref.update({
                autoAnswerStatus: 'no_results',
                autoAnswer: isArabicLanguage(language)
                    ? 'لم نعثر على مصادر كافية للإجابة على هذا السؤال الآن. تم حفظ سؤالك، ويمكنك المحاولة بصياغة أوضح أو الرجوع لأهل العلم.'
                    : 'We could not find enough reliable sources to answer this question right now. Your question has been saved; you can try a clearer wording or consult qualified scholars.',
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
            return (!u.includes('/search') &&
                !u.includes('?q=') &&
                (u.includes('/fatwa/') ||
                    u.includes('/answers/') ||
                    u.includes('/feqhia/') ||
                    u.includes('/fatwas/')));
        });
        if (specificPage) {
            try {
                extractedContent = await extractFatwaContent(specificPage.url);
                const relevance = scoreRelevance(searchQuery, extractedContent);
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
            }
            catch (err) {
                logger.warn('[auto-qa] content extraction failed:', err instanceof Error ? err.message.slice(0, 120) : String(err));
            }
        }
        // Filter sources to only keep those relevant to the question.  Snippets
        // come back in Arabic, so we score them against the Arabic search query.
        const relevantSources = sources.filter((s) => {
            const titleScore = scoreRelevance(searchQuery, s.title || '');
            const snippetScore = scoreRelevance(searchQuery, s.snippet || '');
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
            : (extractedContent ? sources : buildGenericSearchLinks(searchQuery, language));
        const localizedFinalSources = localizeAutoQaSources(finalSources, cleanedQuestion, language);
        const finalAnswer = await buildAutoQaAnswer(searchQuery, localizedFinalSources, extractedContent, language);
        await snap.ref.update({
            status: 'answered',
            autoAnswerStatus: 'answered',
            autoAnswer: finalAnswer,
            autoAnswerSources: localizedFinalSources,
            autoAnswerDisclaimer: getAutoQaDisclaimer(language),
            autoAnswerLanguage: language,
            autoAnswerCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    catch (error) {
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
 * Protect monthly leaderboard scores from old app versions that recalculate
 * from empty local storage after reinstall and overwrite the cloud score.
 *
 * NOTE for any future bulk/offline engagement repair: ALWAYS write totals under
 * the correct `monthlyEngagement.month` key and populate
 * `engagementHistory`/`lastFinalizedMonth` for past months. Writing a previous
 * month's totals into the *current* `monthlyEngagement` (as the
 * `activity_logs_2026_05_bulk` repair did) makes prior activity surface as
 * current-month leaderboard points, and this guard then freezes the bad value.
 * To deliberately correct a same-month score, set a fresh
 * `engagementCorrection.correctedAt` in the same write (see below).
 */
exports.guardMonthlyEngagementRegression = functions.firestore
    .document('users/{userId}')
    .onUpdate(async (change, context) => {
    const before = change.before.data() || {};
    const after = change.after.data() || {};
    const beforeEngagement = before.monthlyEngagement || {};
    const beforeMonth = String(beforeEngagement.month || '');
    const beforeScore = Number(beforeEngagement.score) || 0;
    const afterScore = Number((after.monthlyEngagement || {}).score) || 0;
    // `shouldRevertRegression` encapsulates the full decision (same-month,
    // positive→lower, and the `engagementCorrection.correctedAt` escape hatch
    // that lets a deliberate admin/script correction through). The escape hatch
    // is self-limiting: only the single write advancing the marker is exempt.
    if (!(0, engagement_guard_1.shouldRevertRegression)(before, after)) {
        if (beforeMonth &&
            beforeScore > 0 &&
            afterScore < beforeScore &&
            (0, engagement_guard_1.isIntentionalCorrection)(before, after)) {
            logger.info('[honor-board] allowed intentional score correction', {
                userId: context.params.userId,
                month: beforeMonth,
                from: beforeScore,
                to: afterScore,
            });
        }
        return;
    }
    logger.warn('[honor-board] prevented monthly score regression', {
        userId: context.params.userId,
        month: beforeMonth,
        from: beforeScore,
        to: afterScore,
        displayName: String(after.displayName || before.displayName || '').trim(),
    });
    await change.after.ref.update({
        monthlyEngagement: beforeEngagement,
        monthlyEngagementGuard: {
            restoredAt: admin.firestore.FieldValue.serverTimestamp(),
            restoredFromScore: afterScore,
            restoredToScore: beforeScore,
            month: beforeMonth,
            reason: 'prevent_score_regression',
        },
    });
});
/**
 * Scheduled Cloud Function: runs at 12:00 on the 1st of every month.
 * Selects top winners from the previous month's leaderboard,
 * grants them admin premium, and sends push notifications.
 *
 * Winners must surface on day 1 (not after a multi-day grace period).
 * The dual-query union below (monthlyEngagement.month OR
 * lastFinalizedMonth.month) is what makes early selection safe: an
 * active user who already opened the app in the new month is still
 * found via their denormalised lastFinalizedMonth snapshot, so we are
 * not relying on every client having synced before midnight.
 */
exports.selectMonthlyWinners = (0, scheduler_1.onSchedule)({ schedule: '0 12 1 * *', timeZone: 'Africa/Cairo', secrets: ['EXPO_ACCESS_TOKEN'] }, async () => {
    try {
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
        const candidateLimit = Math.max(winnersCount * 5, 20);
        // Query users in two ways and union the results.
        // 1) Users whose monthlyEngagement still points at the previous
        //    month — they haven't synced under the new month yet.
        // 2) Users who already rolled over into the new month but kept a
        //    denormalised snapshot of their final previous-month score in
        //    lastFinalizedMonth. With the 48h+ grace period most active
        //    users fall in this bucket.
        const [activeSnapshot, finalizedSnapshot] = await Promise.all([
            db.collection('users')
                .where('monthlyEngagement.month', '==', monthKey)
                .orderBy('monthlyEngagement.score', 'desc')
                .limit(candidateLimit)
                .get(),
            db.collection('users')
                .where('lastFinalizedMonth.month', '==', monthKey)
                .orderBy('lastFinalizedMonth.score', 'desc')
                .limit(candidateLimit)
                .get(),
        ]);
        const candidatesById = new Map();
        const consider = (userId, data, score, displayName) => {
            if (!displayName || score <= 0)
                return;
            if (data.hiddenFromLeaderboard || data.placeholder)
                return;
            const existing = candidatesById.get(userId);
            if (!existing || score > existing.score) {
                candidatesById.set(userId, { userId, displayName, score, data });
            }
        };
        activeSnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const engagement = data.monthlyEngagement;
            const displayName = String(data.displayName || '').trim();
            consider(docSnap.id, data, Number(engagement?.score) || 0, displayName);
        });
        finalizedSnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const finalized = data.lastFinalizedMonth;
            const displayName = String(finalized?.displayName || data.displayName || '').trim();
            consider(docSnap.id, data, Number(finalized?.score) || 0, displayName);
        });
        const sortedCandidates = Array.from(candidatesById.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, candidateLimit);
        const winners = [];
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + rewardDurationDays);
        for (const candidate of sortedCandidates) {
            if (winners.length >= winnersCount)
                break;
            winners.push({
                userId: candidate.userId,
                displayName: candidate.displayName,
                score: candidate.score,
                rewardedAt: new Date().toISOString(),
                notified: false,
                premiumExpiresAt: expiresAt.toISOString(),
            });
        }
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
        const pushMessages = [];
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
                        interruptionLevel: 'time-sensitive',
                    });
                    winner.notified = true;
                }
            }
            catch (err) {
                logger.warn(`Could not get push token for winner ${winner.userId}:`, err);
            }
        }
        if (pushMessages.length > 0) {
            try {
                const winnerToken = expoAccessToken.value();
                const winnerHeaders = {
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
                }
                else {
                    logger.warn('Winner notification push failed:', await response.text());
                }
            }
            catch (pushErr) {
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
    }
    catch (error) {
        logger.error('❌ selectMonthlyWinners failed:', error);
    }
});
/**
 * Scheduled Cloud Function: builds a single cached snapshot of the
 * current month's top leaderboard entries and writes it to
 * `cache/leaderboard-current`.
 *
 * Why this exists: without a cache, every client that opens the
 * honor-board screen executes a 50-doc Firestore query. At 100K DAU
 * that is millions of reads per day. With this cache the client
 * fetches a single document (1 read) and the server amortises the
 * leaderboard query across all viewers.
 *
 * Runs every 15 minutes — a small staleness tradeoff for a ~95% read
 * cost reduction. Display staleness does not affect winner selection,
 * which reads user docs directly in selectMonthlyWinners.
 */
exports.cacheLeaderboardSnapshot = (0, scheduler_1.onSchedule)({ schedule: 'every 15 minutes', timeZone: 'Asia/Riyadh' }, async () => {
    try {
        const configSnap = await db.doc('config/rewards-settings').get();
        const config = configSnap.data() || {};
        if (config.enabled === false)
            return;
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-v2`;
        const snapshot = await db.collection('users')
            .where('monthlyEngagement.month', '==', currentMonth)
            .orderBy('monthlyEngagement.score', 'desc')
            .limit(50)
            .get();
        const entries = [];
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const engagement = data.monthlyEngagement;
            const displayName = String(data.displayName || '').trim();
            if (engagement?.score > 0 &&
                displayName &&
                !data.hiddenFromLeaderboard &&
                !data.placeholder) {
                entries.push({
                    userId: docSnap.id,
                    displayName,
                    score: Number(engagement.score) || 0,
                });
            }
        });
        // Count all users with a positive score this month. This lets the
        // client decide whether a user below the cached top 50 should pay
        // for a `count()` aggregation query (only when there is anyone
        // beneath the cache to count against). Costs 1 read per schedule
        // tick (every 15 min) — amortised across all viewers.
        const totalCountSnap = await db.collection('users')
            .where('monthlyEngagement.month', '==', currentMonth)
            .where('monthlyEngagement.score', '>', 0)
            .count()
            .get();
        const totalEligibleCount = totalCountSnap.data().count;
        const lowestCachedScore = entries.length > 0
            ? entries[entries.length - 1].score
            : null;
        await db.doc('cache/leaderboard-current').set({
            month: currentMonth,
            entries,
            // `lowestCachedScore` is the score of the last user in the cached
            // top 50; users with a strictly lower score are guaranteed not to
            // be in the cache and need a `count()` query for an exact rank.
            // `totalEligibleCount` upper-bounds any rank we report.
            lowestCachedScore,
            totalEligibleCount,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    catch (error) {
        logger.error('❌ cacheLeaderboardSnapshot failed:', error);
    }
});
/**
 * Scheduled Cloud Function: delete `activityDaily` documents older than
 * the retention window (default 180 days). The admin Analytics page only
 * queries the last 7/30/365 days, so anything older costs storage with
 * no business value. Runs once a day at 02:00 Riyadh time during a low-
 * traffic window.
 */
exports.cleanupActivityDaily = (0, scheduler_1.onSchedule)({ schedule: '0 2 * * *', timeZone: 'Asia/Riyadh' }, async () => {
    const RETENTION_DAYS = 180;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
    const cutoffTs = admin.firestore.Timestamp.fromDate(cutoff);
    try {
        let totalDeleted = 0;
        // Process in batches of 400 (Firestore batch limit is 500; leaving
        // headroom). Loop until no docs older than the cutoff remain.
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const snap = await db.collection('activityDaily')
                .where('timestamp', '<', cutoffTs)
                .limit(400)
                .get();
            if (snap.empty)
                break;
            const batch = db.batch();
            snap.forEach((d) => batch.delete(d.ref));
            await batch.commit();
            totalDeleted += snap.size;
            if (snap.size < 400)
                break;
        }
        if (totalDeleted > 0) {
            logger.info(`🧹 cleanupActivityDaily deleted ${totalDeleted} docs older than ${RETENTION_DAYS} days`);
        }
    }
    catch (error) {
        logger.error('❌ cleanupActivityDaily failed:', error);
    }
});
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
exports.verifyAdminPassword = functions.https.onCall(async (data) => {
    try {
        const submittedHash = (data?.passwordHash || '').trim().toLowerCase();
        if (!submittedHash || submittedHash.length !== 64) {
            throw new functions.https.HttpsError('invalid-argument', 'A valid SHA-256 password hash is required.');
        }
        const snap = await db.doc('appConfig/adminAuth').get();
        if (!snap.exists) {
            throw new functions.https.HttpsError('failed-precondition', 'Admin authentication is not configured.');
        }
        const stored = snap.data();
        const storedHash = (stored?.passwordHash || '').trim().toLowerCase();
        if (!storedHash) {
            throw new functions.https.HttpsError('failed-precondition', 'Admin password hash is missing.');
        }
        // Constant-time comparison to mitigate timing attacks
        if (storedHash.length !== submittedHash.length) {
            throw new functions.https.HttpsError('permission-denied', 'Incorrect password.');
        }
        let mismatch = 0;
        for (let i = 0; i < storedHash.length; i++) {
            mismatch |= storedHash.charCodeAt(i) ^ submittedHash.charCodeAt(i);
        }
        if (mismatch !== 0) {
            throw new functions.https.HttpsError('permission-denied', 'Incorrect password.');
        }
        // Generate fresh session token (rotated on every login)
        const sessionToken = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
        await db.doc('appConfig/adminAuth').set({
            sessionToken,
            sessionIssuedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        return { sessionToken };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
        logger.error('verifyAdminPassword error:', error);
        throw new functions.https.HttpsError('internal', 'Authentication failed.');
    }
});
/**
 * Cloud Function: Validate an existing admin session token.
 * Called by admin panel on page load to confirm the cached token is still valid.
 *
 * Input:  { sessionToken: string }
 * Output: { valid: boolean }
 */
exports.validateAdminSession = functions.https.onCall(async (data) => {
    try {
        const submitted = (data?.sessionToken || '').trim();
        if (!submitted)
            return { valid: false };
        const snap = await db.doc('appConfig/adminAuth').get();
        if (!snap.exists)
            return { valid: false };
        const stored = snap.data()?.sessionToken || '';
        if (!stored || stored.length !== submitted.length)
            return { valid: false };
        // Constant-time compare
        let mismatch = 0;
        for (let i = 0; i < stored.length; i++) {
            mismatch |= stored.charCodeAt(i) ^ submitted.charCodeAt(i);
        }
        return { valid: mismatch === 0 };
    }
    catch (error) {
        logger.error('validateAdminSession error:', error);
        return { valid: false };
    }
});
// ==================== Phase 2: FCM Prayer Push Fallback ====================
/**
 * Helper: send batch of Expo push messages with retry across mirror endpoints.
 */
async function sendExpoBatch(messages, token) {
    if (messages.length === 0)
        return 0;
    const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    };
    if (token)
        headers['Authorization'] = `Bearer ${token}`;
    for (const endpoint of EXPO_PUSH_APIS) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), EXPO_REQUEST_TIMEOUT_MS);
            const res = await fetch(endpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify(messages),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!res.ok)
                continue;
            const json = (await res.json());
            const okCount = json.data.filter((t) => t.status === 'ok').length;
            return okCount;
        }
        catch (e) {
            logger.warn(`[fcm-prayer] endpoint ${endpoint} failed:`, e);
        }
    }
    return 0;
}
function getAdminNotificationTranslation(translations, userLanguage) {
    const lang = userLanguage;
    const exact = translations?.[lang];
    if (exact?.title && exact?.body)
        return { title: exact.title, body: exact.body };
    const ar = translations?.ar;
    if (ar?.title && ar?.body)
        return { title: ar.title, body: ar.body };
    const en = translations?.en;
    if (en?.title && en?.body)
        return { title: en.title, body: en.body };
    for (const value of Object.values(translations || {})) {
        if (value?.title && value?.body)
            return { title: value.title, body: value.body };
    }
    return { title: 'روح المسلم', body: '' };
}
async function fetchAdminNotificationTargets(notification) {
    const targetAudience = String(notification.targetAudience || 'all');
    const targetLanguages = Array.isArray(notification.targetLanguages)
        ? notification.targetLanguages.map(String)
        : [];
    const targetCountries = Array.isArray(notification.targetCountries)
        ? notification.targetCountries.map((c) => String(c).toUpperCase())
        : [];
    const targetUserId = String(notification.targetUserId || '').trim();
    if (targetAudience === 'single_user' && targetUserId) {
        const snap = await db.doc(`users/${targetUserId}`).get();
        if (!snap.exists)
            return [];
        const data = snap.data() || {};
        const fcmToken = String(data.fcmToken || '');
        if (!fcmToken.startsWith('ExponentPushToken'))
            return [];
        const prayerSnap = await db.doc(`userPrayerSettings/${targetUserId}`).get().catch(() => null);
        const countryInfo = resolveCountryForTargeting(data, prayerSnap?.exists ? prayerSnap.data() : undefined);
        return [{
                id: snap.id,
                fcmToken,
                platform: String(data.platform || 'unknown'),
                language: String(data.language || 'ar'),
                country: countryInfo.country,
                countrySource: countryInfo.countrySource,
                countryVerified: countryInfo.countryVerified,
                lastActive: data.lastActive || null,
            }];
    }
    if (targetAudience === 'single_user') {
        return [];
    }
    let usersQuery = db.collection('users');
    if (targetAudience === 'ios' || targetAudience === 'android') {
        usersQuery = usersQuery.where('platform', '==', targetAudience);
    }
    const [snap, prayerLocationsByUserId] = await Promise.all([
        usersQuery.get(),
        fetchPrayerLocationsByUserId(),
    ]);
    const storeSources = new Set(['play_store', 'app_store']);
    const weekAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const tokenMap = new Map();
    snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.placeholder)
            return;
        if (!storeSources.has(String(data.installSource || '')))
            return;
        const fcmToken = String(data.fcmToken || '');
        if (!fcmToken.startsWith('ExponentPushToken'))
            return;
        const language = String(data.language || 'ar');
        const countryInfo = resolveCountryForTargeting(data, prayerLocationsByUserId.get(docSnap.id));
        const country = countryInfo.country;
        const countrySource = countryInfo.countrySource;
        const countryVerified = countryInfo.countryVerified;
        const lastActive = data.lastActive;
        const lastActiveMs = typeof lastActive?.toDate === 'function'
            ? lastActive.toDate().getTime()
            : 0;
        if (targetAudience === 'active' && (!lastActiveMs || lastActiveMs <= weekAgoMs))
            return;
        if (targetAudience === 'inactive' && lastActiveMs && lastActiveMs > weekAgoMs)
            return;
        if (targetLanguages.length > 0 && !targetLanguages.includes(language))
            return;
        if (targetCountries.length > 0 &&
            (!targetCountries.includes(country) || !countryVerified))
            return;
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
exports.processScheduledAdminNotifications = (0, scheduler_1.onSchedule)({ schedule: '*/1 * * * *', timeZone: 'UTC', secrets: ['EXPO_ACCESS_TOKEN'], memory: '512MiB' }, async () => {
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
            if (!notification.scheduledAt)
                continue;
            const scheduledAt = new Date(String(notification.scheduledAt));
            if (Number.isNaN(scheduledAt.getTime()) || scheduledAt > now)
                continue;
            const lockUntil = notification.processingUntil?.toDate?.();
            if (lockUntil && lockUntil > now)
                continue;
            const ref = docSnap.ref;
            const locked = await db.runTransaction(async (tx) => {
                const fresh = await tx.get(ref);
                const data = fresh.data();
                if (!fresh.exists || data?.status !== 'scheduled')
                    return false;
                const freshScheduledAt = new Date(String(data.scheduledAt || ''));
                if (Number.isNaN(freshScheduledAt.getTime()) || freshScheduledAt > new Date())
                    return false;
                const freshLockUntil = data.processingUntil?.toDate?.();
                if (freshLockUntil && freshLockUntil > new Date())
                    return false;
                tx.update(ref, {
                    status: 'sending',
                    processingAt: admin.firestore.FieldValue.serverTimestamp(),
                    processingUntil: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000)),
                });
                return true;
            });
            if (!locked)
                continue;
            try {
                const targets = await fetchAdminNotificationTargets(notification);
                const perLanguage = {};
                const messages = targets.map((user) => {
                    const text = getAdminNotificationTranslation(notification.translations || {}, user.language);
                    perLanguage[user.language] = (perLanguage[user.language] || 0) + 1;
                    return {
                        to: user.fcmToken,
                        title: text.title,
                        body: text.body,
                        sound: 'default',
                        priority: 'high',
                        channelId: 'general',
                        interruptionLevel: 'time-sensitive',
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
            }
            catch (sendError) {
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
    }
    catch (error) {
        logger.error('[scheduled-admin-push] processor failed:', error);
    }
});
/**
 * Map app calculation method ID to adhan lib CalculationParameters.
 */
function buildAdhanParams(methodId, asrSchool, adjustments) {
    // Lazy require so cold starts don't load adhan unless this function runs
    const adhan = require('adhan');
    let params;
    switch (methodId) {
        case 1:
            params = adhan.CalculationMethod.Karachi();
            break;
        case 2:
            params = adhan.CalculationMethod.NorthAmerica();
            break;
        case 3:
            params = adhan.CalculationMethod.MuslimWorldLeague();
            break;
        case 4:
            params = adhan.CalculationMethod.UmmAlQura();
            break;
        case 5:
            params = adhan.CalculationMethod.Egyptian();
            break;
        case 8:
            params = adhan.CalculationMethod.Dubai();
            break;
        case 9:
            params = adhan.CalculationMethod.Kuwait();
            break;
        case 10:
            params = adhan.CalculationMethod.Qatar();
            break;
        case 11:
            params = adhan.CalculationMethod.Singapore();
            break;
        case 13:
            params = adhan.CalculationMethod.Turkey();
            break;
        default: params = adhan.CalculationMethod.MuslimWorldLeague();
    }
    params.madhab = asrSchool === 1 ? adhan.Madhab.Hanafi : adhan.Madhab.Shafi;
    // Apply per-prayer minute offsets the user configured in-app so server-side
    // computed times match the client's. Without this the FCM fallback would
    // fire at the unadjusted adhan time and feel "wrong" to anyone using
    // manual adjustments.
    if (adjustments) {
        params.adjustments = {
            fajr: Number(adjustments.fajr ?? 0),
            sunrise: Number(adjustments.sunrise ?? 0),
            dhuhr: Number(adjustments.dhuhr ?? 0),
            asr: Number(adjustments.asr ?? 0),
            maghrib: Number(adjustments.maghrib ?? 0),
            isha: Number(adjustments.isha ?? 0),
        };
    }
    return params;
}
const PRAYER_NAMES_AR = {
    fajr: 'الفجر',
    dhuhr: 'الظهر',
    asr: 'العصر',
    maghrib: 'المغرب',
    isha: 'العشاء',
};
// Bodies matching constants/translations.ts notifications.*Body (Arabic)
const PRAYER_BODIES_AR = {
    fajr: 'حي على الصلاة.. الفجر مطلع السكينة.',
    dhuhr: 'حان وقت صلاة الظهر.. جدد طاقتك بالوقوف بين يدي الله.',
    asr: 'حان وقت صلاة العصر.. حافظ عليها لتنال عظيم الأجر.',
    maghrib: 'حان وقت صلاة المغرب.. بارك الله في يومك.',
    isha: 'حان وقت صلاة العشاء.. اختم يومك بصلاة تريح قلبك.',
    jumuah: 'حان وقت صلاة الجمعة.. أكثِر من الصلاة على النبي ﷺ.',
};
// Titles exactly matching constants/translations.ts notifications.*NotifTitle (Arabic)
// so FCM and local notifications are visually identical to the user.
const PRAYER_TITLES_AR = {
    fajr: 'الفجر.. نورٌ في قلبك 🌙',
    dhuhr: 'الظهر.. استراحة المؤمن ☀️',
    asr: 'العصر.. الصلاة الوسطى 🌤️',
    maghrib: 'المغرب.. ختام النهار الطاهر 🌇',
    isha: 'العشاء.. سكنٌ وطمأنينة ✨',
    // Friday Dhuhr
    jumuah: 'الجمعة.. خير يوم طلعت عليه الشمس 🕌',
};
const FCM_FALLBACK_SCHEMA_VERSION = 2;
const FCM_FALLBACK_QUERY_LIMIT = 1000;
const FCM_FALLBACK_MAX_MINUTES_BEFORE = 5;
const FCM_FALLBACK_LATE_GRACE_MS = 2 * 60 * 1000;
const FCM_REFRESH_REMINDER_REPEAT_MS = 24 * 60 * 60 * 1000;
const FCM_REFRESH_REMINDER_LEAD_MS = 12 * 60 * 60 * 1000;
const SERVER_FALLBACK_PRAYER_KEYS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const SERVER_ADHAN_SOUND_FILES = {
    abdulbasit: 'abdulbasit.mp3',
    ajman: 'ajman.mp3',
    alaqsa: 'alaqsa.mp3',
    ali_mulla: 'ali_mulla.mp3',
    dosari: 'dosari.mp3',
    egypt: 'egypt.mp3',
    haramain: 'haramain.mp3',
    madinah: 'madinah.mp3',
    makkah: 'makkah.mp3',
    mansoor_zahrani: 'mansoor_zahrani.mp3',
    mishary: 'mishary.mp3',
    naqshbandi: 'naqshbandi.mp3',
    sharif: 'sharif.mp3',
    silent: 'silent.mp3',
    sudais: 'sudais.mp3',
};
function getPrayerFallbackRefreshText(language) {
    if (language === 'en') {
        return {
            title: 'Refresh adhan alerts',
            body: 'Open Rooh Al-Muslim once to keep adhan alerts exact. Otherwise, fallback alerts may arrive a few minutes early or late.',
        };
    }
    return {
        title: 'تحديث تنبيهات الأذان',
        body: 'افتح روح المسلم مرة واحدة للحفاظ على إشعارات الأذان في وقتها الدقيق. إن لم تفتح التطبيق، سنرسل تنبيهًا احتياطيًا قريبًا من الأذان وقد يتقدم أو يتأخر بضع دقائق.',
    };
}
function normalizeServerAdhanSound(soundKey) {
    const key = String(soundKey || 'makkah').replace(/\.mp3$/, '');
    return SERVER_ADHAN_SOUND_FILES[key] ? key : 'makkah';
}
function buildPrayerFallbackPushAudio(settings) {
    const adhanSoundEnabled = settings.adhanSound !== false;
    const soundType = normalizeServerAdhanSound(settings.adhanSoundType);
    const fullAdhanVoice = normalizeServerAdhanSound(settings.fullAdhanSoundType || soundType);
    const useFullAdhan = settings.useFullAdhan === true;
    if (!adhanSoundEnabled || soundType === 'silent') {
        return {
            channelId: 'silent',
            sound: undefined,
            soundType: 'silent',
            fullAdhanVoice,
            useFullAdhan,
        };
    }
    return {
        channelId: `adhan_${soundType}`,
        sound: SERVER_ADHAN_SOUND_FILES[soundType],
        soundType,
        fullAdhanVoice,
        useFullAdhan,
    };
}
function firestoreDate(value) {
    if (!value)
        return null;
    if (value instanceof Date)
        return value;
    if (typeof value === 'object' && value !== null && 'toDate' in value && typeof value.toDate === 'function') {
        return value.toDate();
    }
    if (typeof value === 'string') {
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
}
function computeNextServerPrayer(settings, from) {
    if (typeof settings.latitude !== 'number' || typeof settings.longitude !== 'number')
        return null;
    const adhan = require('adhan');
    const coords = new adhan.Coordinates(settings.latitude, settings.longitude);
    const params = buildAdhanParams(Number(settings.calculationMethod || 4), Number(settings.asrJuristic || 0), settings.adjustments);
    const today = new adhan.PrayerTimes(coords, from, params);
    const tomorrow = new adhan.PrayerTimes(coords, new Date(from.getTime() + 24 * 60 * 60 * 1000), params);
    const candidates = [
        ...SERVER_FALLBACK_PRAYER_KEYS.map((key) => ({ key, at: today[key] })),
        ...SERVER_FALLBACK_PRAYER_KEYS.map((key) => ({ key, at: tomorrow[key] })),
    ].filter((p) => p.at instanceof Date && p.at > from);
    candidates.sort((a, b) => a.at.getTime() - b.at.getTime());
    return candidates[0] ?? null;
}
function nextFallbackPatch(settings, from) {
    const next = computeNextServerPrayer(settings, from);
    return {
        fallbackSchemaVersion: FCM_FALLBACK_SCHEMA_VERSION,
        fallbackUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...(next
            ? { nextPrayerAt: next.at, nextPrayerKey: next.key }
            : { fallbackEnabled: false }),
    };
}
async function migrateLegacyFallbackDocs(now, updates) {
    const snap = await db.collection('userPrayerSettings')
        .where('fallbackSchemaVersion', '==', null)
        .limit(FCM_FALLBACK_QUERY_LIMIT)
        .get();
    let migrated = 0;
    for (const docSnap of snap.docs) {
        const s = docSnap.data();
        if (s.disabled)
            continue;
        const localActiveAt = firestoreDate(s.localNotificationsActiveAt) || firestoreDate(s.updatedAt) || now;
        const localScheduleDays = s.platform === 'android' ? 7 : 3;
        const localScheduleExpiresAt = new Date(localActiveAt.getTime() + localScheduleDays * 24 * 60 * 60 * 1000);
        const refreshReminderAt = new Date(Math.max(now.getTime() + 60 * 60 * 1000, localScheduleExpiresAt.getTime() - FCM_REFRESH_REMINDER_LEAD_MS));
        const fallbackActive = localScheduleExpiresAt <= now;
        const next = computeNextServerPrayer(s, now);
        updates.push(docSnap.ref.set({
            localScheduleDays,
            localScheduleExpiresAt,
            refreshReminderAt,
            fallbackEnabled: fallbackActive && Boolean(next),
            fallbackSchemaVersion: FCM_FALLBACK_SCHEMA_VERSION,
            fallbackUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            ...(next && { nextPrayerAt: next.at, nextPrayerKey: next.key }),
        }, { merge: true }));
        migrated++;
    }
    return migrated;
}
async function queueRefreshReminderMessages(now, messages, updates) {
    const snap = await db.collection('userPrayerSettings')
        .where('fallbackEnabled', '==', false)
        .where('refreshReminderAt', '<=', now)
        .orderBy('refreshReminderAt', 'asc')
        .limit(FCM_FALLBACK_QUERY_LIMIT)
        .get();
    let queued = 0;
    const nextReminderAt = new Date(now.getTime() + FCM_REFRESH_REMINDER_REPEAT_MS);
    for (const docSnap of snap.docs) {
        const uid = docSnap.id;
        const s = docSnap.data();
        if (s.disabled)
            continue;
        const localExpiresAt = firestoreDate(s.localScheduleExpiresAt);
        if (localExpiresAt && localExpiresAt <= now)
            continue;
        let userData;
        try {
            const userDoc = await db.doc(`users/${uid}`).get();
            userData = userDoc.data();
        }
        catch {
            continue;
        }
        const fcmToken = userData?.fcmToken;
        const notifEnabled = userData?.notificationsEnabled !== false;
        updates.push(docSnap.ref.set({
            refreshReminderAt: nextReminderAt,
            fallbackUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true }));
        if (!notifEnabled || !fcmToken || !String(fcmToken).startsWith('ExponentPushToken'))
            continue;
        const text = getPrayerFallbackRefreshText(String(userData?.language || s.language || 'ar'));
        messages.push({
            to: fcmToken,
            title: text.title,
            body: text.body,
            sound: 'default',
            priority: 'high',
            channelId: 'general',
            interruptionLevel: 'time-sensitive',
            data: {
                type: 'prayer_refresh_reminder',
                source: 'fcm',
                actionType: 'screen',
                actionUrl: '/(tabs)/prayer',
            },
        });
        queued++;
    }
    return queued;
}
async function activateExpiredFallbackUsers(now, updates) {
    const snap = await db.collection('userPrayerSettings')
        .where('fallbackEnabled', '==', false)
        .where('localScheduleExpiresAt', '<=', now)
        .orderBy('localScheduleExpiresAt', 'asc')
        .limit(FCM_FALLBACK_QUERY_LIMIT)
        .get();
    let activated = 0;
    for (const docSnap of snap.docs) {
        const s = docSnap.data();
        if (s.disabled)
            continue;
        const next = computeNextServerPrayer(s, now);
        updates.push(docSnap.ref.set({
            fallbackEnabled: Boolean(next),
            fallbackSchemaVersion: FCM_FALLBACK_SCHEMA_VERSION,
            fallbackUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            ...(next && { nextPrayerAt: next.at, nextPrayerKey: next.key }),
        }, { merge: true }));
        if (next)
            activated++;
    }
    return activated;
}
async function queueDuePrayerFallbackMessages(now, messages, updates) {
    const upper = new Date(now.getTime() + FCM_FALLBACK_MAX_MINUTES_BEFORE * 60 * 1000);
    const staleBefore = new Date(now.getTime() - FCM_FALLBACK_LATE_GRACE_MS);
    const snap = await db.collection('userPrayerSettings')
        .where('fallbackEnabled', '==', true)
        .where('nextPrayerAt', '<=', upper)
        .orderBy('nextPrayerAt', 'asc')
        .limit(FCM_FALLBACK_QUERY_LIMIT)
        .get();
    let queued = 0;
    for (const docSnap of snap.docs) {
        const uid = docSnap.id;
        const s = docSnap.data();
        if (s.disabled)
            continue;
        const localExpiresAt = firestoreDate(s.localScheduleExpiresAt);
        if (localExpiresAt && localExpiresAt > now) {
            updates.push(docSnap.ref.set({
                fallbackEnabled: false,
                fallbackUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true }));
            continue;
        }
        const nextPrayerAt = firestoreDate(s.nextPrayerAt);
        const nextPrayerKey = String(s.nextPrayerKey || '');
        if (!nextPrayerAt || !SERVER_FALLBACK_PRAYER_KEYS.includes(nextPrayerKey)) {
            updates.push(docSnap.ref.set(nextFallbackPatch(s, now), { merge: true }));
            continue;
        }
        if (nextPrayerAt < staleBefore) {
            updates.push(docSnap.ref.set(nextFallbackPatch(s, now), { merge: true }));
            continue;
        }
        let fcmToken;
        let language = String(s.language || 'ar');
        let userData;
        try {
            const userDoc = await db.doc(`users/${uid}`).get();
            userData = userDoc.data();
            fcmToken = userData?.fcmToken;
            language = String(userData?.language || language);
            const notifEnabled = userData?.notificationsEnabled !== false;
            if (!notifEnabled)
                continue;
        }
        catch {
            continue;
        }
        if (!fcmToken || !fcmToken.startsWith('ExponentPushToken'))
            continue;
        // ── Dedupe vs. local notifications ─────────────────────────────────────
        // If the user opened the app within the local schedule window, their
        // on-device notifications for this prayer are still armed. Skip the FCM
        // push to prevent duplicates. `users.lastActive` is updated on every app
        // foreground independently of syncPrayerDataToFirestore, so it remains
        // accurate even if a sync write failed or was throttled.
        const lastActive = firestoreDate(userData?.lastActive);
        if (lastActive) {
            const platform = String(s.platform || '');
            const scheduleDays = Number(s.localScheduleDays) || (platform === 'android' ? 7 : 3);
            const localWindowMs = (scheduleDays + 1) * 24 * 60 * 60 * 1000; // +1 day safety
            if (now.getTime() - lastActive.getTime() < localWindowMs) {
                updates.push(docSnap.ref.set({
                    fallbackEnabled: false,
                    localScheduleExpiresAt: new Date(lastActive.getTime() + scheduleDays * 24 * 60 * 60 * 1000),
                    fallbackUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true }));
                continue;
            }
        }
        const dedupeId = `${uid}_${nextPrayerKey}_${nextPrayerAt.toISOString().slice(0, 13)}`;
        const dedupeRef = db.doc(`fcmPrayerSent/${dedupeId}`);
        const dedupeSnap = await dedupeRef.get();
        const followingPatch = nextFallbackPatch(s, new Date(nextPrayerAt.getTime() + 60 * 1000));
        updates.push(docSnap.ref.set(followingPatch, { merge: true }));
        if (dedupeSnap.exists)
            continue;
        const nameAr = PRAYER_NAMES_AR[nextPrayerKey] ?? nextPrayerKey;
        const isFriday = nextPrayerAt.getDay() === 5;
        const effectiveKey = (nextPrayerKey === 'dhuhr' && isFriday) ? 'jumuah' : nextPrayerKey;
        const titleAr = `🕌 ${PRAYER_TITLES_AR[effectiveKey] ?? nameAr}`;
        const bodyAr = PRAYER_BODIES_AR[effectiveKey] ?? `حان وقت صلاة ${nameAr}`;
        const audio = buildPrayerFallbackPushAudio(s);
        messages.push({
            to: fcmToken,
            title: titleAr,
            body: bodyAr,
            ...(audio.sound && { sound: audio.sound }),
            priority: 'high',
            channelId: audio.channelId,
            interruptionLevel: 'time-sensitive',
            data: {
                type: audio.useFullAdhan ? 'full_adhan' : 'prayer_fallback',
                prayer: nextPrayerKey,
                voice: audio.fullAdhanVoice,
                soundType: audio.soundType,
                regularSoundType: audio.soundType,
                fullAdhanSoundType: audio.fullAdhanVoice,
                fallback: '1',
                language,
                source: 'fcm',
            },
        });
        updates.push(dedupeRef.set({
            uid,
            prayer: nextPrayerKey,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            expireAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        }));
        queued++;
    }
    return queued;
}
/**
 * Scheduled Cloud Function: runs every 5 minutes.
 * Uses indexed queue fields instead of scanning every user:
 *   - refreshReminderAt asks users to open the app before local adhan expires
 *   - localScheduleExpiresAt activates fallback only after local schedule ends
 *   - nextPrayerAt finds users whose next fallback adhan is due soon
 *
 * هذا "حزام أمان" — الجدولة المحلية لا تزال الأساسية، لكن لو فشلت
 * (force-stop, OEM kill, exact alarm denied) المستخدم يستلم push من السيرفر.
 */
exports.sendPrayerPushFallback = (0, scheduler_1.onSchedule)({ schedule: '*/5 * * * *', timeZone: 'UTC', secrets: ['EXPO_ACCESS_TOKEN'], memory: '512MiB' }, async () => {
    const startedAt = Date.now();
    try {
        const token = expoAccessToken.value();
        const now = new Date();
        const messages = [];
        const updates = [];
        const migrated = await migrateLegacyFallbackDocs(now, updates);
        const refreshQueued = await queueRefreshReminderMessages(now, messages, updates);
        const activated = await activateExpiredFallbackUsers(now, updates);
        await Promise.allSettled(updates.splice(0));
        const prayerQueued = await queueDuePrayerFallbackMessages(now, messages, updates);
        // أرسل في batches من 100
        let sent = 0;
        for (let i = 0; i < messages.length; i += 100) {
            sent += await sendExpoBatch(messages.slice(i, i + 100), token);
        }
        await Promise.allSettled(updates);
        logger.info(`[fcm-prayer] migrated=${migrated} refresh=${refreshQueued} activated=${activated} prayer=${prayerQueued}; ` +
            `sent ${sent}/${messages.length} in ${Date.now() - startedAt}ms`);
    }
    catch (e) {
        logger.error('[fcm-prayer] failed:', e);
    }
});
/**
 * Cleanup function: حذف dedupe records الأقدم من 24 ساعة.
 * يشتغل يومياً عشان firestore ما يمتلئ.
 */
exports.cleanupFcmPrayerDedupe = (0, scheduler_1.onSchedule)({ schedule: '0 3 * * *', timeZone: 'UTC' }, async () => {
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
    }
    catch (e) {
        logger.error('[fcm-prayer-cleanup] failed:', e);
    }
});
const ENGAGEMENT_TYPES = ['inactivity', 'nameAndOpenPrompt', 'namePrompt'];
const ENGAGEMENT_RECIPIENT_PREVIEW_LIMIT = 100;
function tsToMillis(value) {
    if (!value)
        return 0;
    if (typeof value?.toMillis === 'function') {
        try {
            return value.toMillis();
        }
        catch {
            return 0;
        }
    }
    if (typeof value?.seconds === 'number') {
        return value.seconds * 1000;
    }
    if (value instanceof Date)
        return value.getTime();
    return 0;
}
function userMatchesEngagementType(type, cfg, data) {
    const now = Date.now();
    const thresholdMs = Math.max(0, cfg.triggerDays) * 24 * 60 * 60 * 1000;
    const lastActiveMs = tsToMillis(data.lastActive);
    const createdAtMs = tsToMillis(data.createdAt) || tsToMillis(data.registrationDate);
    const displayName = String(data.displayName || data.name || '').trim();
    const hasName = displayName.length > 0;
    if (type === 'inactivity') {
        // المستخدم نشط قبل، ومرّت triggerDays بدون نشاط جديد
        if (!lastActiveMs)
            return false;
        return now - lastActiveMs >= thresholdMs;
    }
    if (type === 'nameAndOpenPrompt') {
        // مر triggerDays من التنزيل، لا اسم، ولم يفتح التطبيق إطلاقاً
        if (!createdAtMs)
            return false;
        if (hasName)
            return false;
        if (lastActiveMs && lastActiveMs > createdAtMs + 5 * 60 * 1000)
            return false;
        return now - createdAtMs >= thresholdMs;
    }
    if (type === 'namePrompt') {
        // فاتح التطبيق على الأقل مرة، لكن بدون اسم
        if (hasName)
            return false;
        if (!lastActiveMs)
            return false;
        if (thresholdMs > 0 && now - lastActiveMs < thresholdMs)
            return false;
        return true;
    }
    return false;
}
function shouldSendEngagementAgain(cfg, data, type) {
    const sent = (data.engagementPushSent || {});
    const last = sent[type];
    const lastSentMs = tsToMillis(last?.lastSentAt);
    if (!lastSentMs)
        return true;
    // 0 means "send only once"
    if (!cfg.repeatDays || cfg.repeatDays <= 0)
        return false;
    return Date.now() - lastSentMs >= cfg.repeatDays * 24 * 60 * 60 * 1000;
}
function pickEngagementTranslation(translations, language) {
    // Normalize empty/invalid language to 'ar' so orphan/legacy docs without a
    // proper language never silently fall through to English when Arabic exists.
    const normalized = String(language || '').trim().toLowerCase();
    const lang = (normalized || 'ar');
    const exact = translations?.[lang];
    if (exact?.title && exact?.body)
        return { title: exact.title, body: exact.body };
    const ar = translations?.ar;
    if (ar?.title && ar?.body)
        return { title: ar.title, body: ar.body };
    const en = translations?.en;
    if (en?.title && en?.body)
        return { title: en.title, body: en.body };
    for (const value of Object.values(translations || {})) {
        if (value?.title && value?.body)
            return { title: value.title, body: value.body };
    }
    return { title: 'روح المسلم', body: '' };
}
async function loadEngagementConfig() {
    try {
        const snap = await db.doc('appConfig/engagementNotifications').get();
        if (!snap.exists)
            return null;
        return snap.data();
    }
    catch (error) {
        logger.error('[engagement] failed to load config:', error);
        return null;
    }
}
/**
 * Multiple user docs can share one Expo push token (orphan/duplicate records
 * minted when device-ID persistence was broken). Without collapsing them, each
 * doc produces a separate push → the device gets N identical notifications, and
 * stale orphan docs (with device-locale language) leak the wrong language.
 *
 * Pick one winner per token, mirroring pickBestRecord in the admin
 * device-dedup util: a real displayName wins, then activity recency. The winner
 * is the actively-used doc, which carries the user's chosen language.
 */
function pickBestEngagementCandidate(group) {
    if (group.length === 1)
        return group[0];
    const score = (c) => {
        let value = 0;
        if (c.displayName && c.displayName !== '-')
            value += 1000000000000;
        value += c.lastActiveMs || c.createdAtMs;
        return value;
    };
    return [...group].sort((a, b) => score(b) - score(a))[0];
}
async function processEngagementType(type, cfg, expoToken) {
    if (!cfg.enabled)
        return { matched: 0, sent: 0, failed: 0, skipped: 0 };
    const usersSnap = await db.collection('users').get();
    const storeSources = new Set(['play_store', 'app_store']);
    const candidatesByToken = new Map();
    let matched = 0;
    let skipped = 0;
    usersSnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.placeholder)
            return;
        if (!storeSources.has(String(data.installSource || '')))
            return;
        const fcmToken = String(data.fcmToken || '');
        if (!fcmToken.startsWith('ExponentPushToken'))
            return;
        if (data.appStatus === 'uninstalled' || data.pushTokenInvalid === true)
            return;
        if (!userMatchesEngagementType(type, cfg, data))
            return;
        matched++;
        if (!shouldSendEngagementAgain(cfg, data, type)) {
            skipped++;
            return;
        }
        const group = candidatesByToken.get(fcmToken);
        const candidate = {
            id: docSnap.id,
            fcmToken,
            language: String(data.language || 'ar'),
            displayName: String(data.displayName || data.name || '').trim(),
            platform: String(data.platform || data.devicePlatform || ''),
            lastActiveMs: tsToMillis(data.lastActive),
            createdAtMs: tsToMillis(data.createdAt) || tsToMillis(data.registrationDate),
        };
        if (group)
            group.push(candidate);
        else
            candidatesByToken.set(fcmToken, [candidate]);
    });
    // Collapse duplicate docs sharing one push token into a single message.
    const messages = [];
    // For each message, the full set of doc IDs in that token group, so we gate
    // every duplicate (not just the winner) against future sweeps.
    const groupIdsByIndex = [];
    const recipientPreview = [];
    const perLanguage = {};
    for (const group of candidatesByToken.values()) {
        const winner = pickBestEngagementCandidate(group);
        const language = winner.language;
        const text = pickEngagementTranslation(cfg.translations || {}, language);
        if (!text.title || !text.body)
            continue;
        perLanguage[language] = (perLanguage[language] || 0) + 1;
        groupIdsByIndex.push(group.map((c) => c.id));
        if (recipientPreview.length < ENGAGEMENT_RECIPIENT_PREVIEW_LIMIT) {
            recipientPreview.push({
                userId: winner.id,
                displayName: winner.displayName,
                language,
                platform: winner.platform,
                lastActiveMs: winner.lastActiveMs,
            });
        }
        messages.push({
            to: winner.fcmToken,
            title: text.title,
            body: text.body,
            sound: 'default',
            priority: 'high',
            channelId: 'general',
            interruptionLevel: 'time-sensitive',
            ttl: 86400,
            data: {
                actionType: 'screen',
                actionUrl: String(cfg.actionUrl || '/'),
                type: `engagement_${type}`,
                language,
            },
        });
    }
    if (messages.length === 0) {
        return { matched, sent: 0, failed: 0, skipped };
    }
    const historyRef = await db.collection('notifications').add({
        type: `engagement_${type}`,
        targetAudience: 'engagement',
        actionType: 'screen',
        actionUrl: cfg.actionUrl || '/',
        translations: cfg.translations,
        status: 'sending',
        sentCount: 0,
        failedCount: 0,
        deliveredCount: 0,
        openedCount: 0,
        clickedCount: 0,
        perLanguage,
        matchedCount: matched,
        skippedCount: skipped,
        recipientCount: groupIdsByIndex.length,
        recipientPreview,
        recipientPreviewLimit: ENGAGEMENT_RECIPIENT_PREVIEW_LIMIT,
        triggerDays: cfg.triggerDays,
        repeatDays: cfg.repeatDays,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    messages.forEach((message) => {
        message.data = {
            ...(message.data || {}),
            notificationDocId: historyRef.id,
        };
    });
    let sent = 0;
    let failed = 0;
    try {
        for (let i = 0; i < messages.length; i += 100) {
            const batchMessages = messages.slice(i, i + 100);
            const batchGroupIds = groupIdsByIndex.slice(i, i + 100);
            const okCount = await sendExpoBatch(batchMessages, expoToken);
            sent += okCount;
            failed += batchMessages.length - okCount;
            // Mark ALL docs in each token group as recently sent (not just the
            // winner), so duplicate orphan docs sharing this token aren't reconsidered
            // next sweep. Expo doesn't return per-token success in our wrapper; the
            // conservative approach is to mark all and let repeatDays gate the next
            // attempt. Chunk well under Firestore's 500-op batch limit since each
            // group can contain several duplicate docs.
            const now = admin.firestore.FieldValue.serverTimestamp();
            const allUids = batchGroupIds.flat();
            for (let j = 0; j < allUids.length; j += 400) {
                const writeBatch = db.batch();
                for (const uid of allUids.slice(j, j + 400)) {
                    writeBatch.set(db.doc(`users/${uid}`), {
                        engagementPushSent: {
                            [type]: {
                                lastSentAt: now,
                                count: admin.firestore.FieldValue.increment(1),
                            },
                        },
                    }, { merge: true });
                }
                try {
                    await writeBatch.commit();
                }
                catch (e) {
                    logger.warn('[engagement] tracking write failed:', e);
                }
            }
        }
        await historyRef.update({
            status: sent > 0 ? 'sent' : 'failed',
            sentCount: sent,
            failedCount: failed,
            deliveredCount: sent,
            perLanguage,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            error: sent > 0 ? admin.firestore.FieldValue.delete() : 'Expo send failed for all engagement recipients',
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await historyRef.update({
            status: 'failed',
            sentCount: sent,
            failedCount: failed || messages.length,
            deliveredCount: sent,
            failedAt: admin.firestore.FieldValue.serverTimestamp(),
            error: message.slice(0, 1000),
        }).catch((updateError) => logger.warn('[engagement] failed to update history after send error:', updateError));
        throw error;
    }
    return { matched, sent, failed, skipped };
}
async function runEngagementSweep(restrictType) {
    const cfgDoc = await loadEngagementConfig();
    if (!cfgDoc) {
        logger.info('[engagement] no config doc — skipping sweep');
        return;
    }
    const token = expoAccessToken.value();
    const types = restrictType ? [restrictType] : ENGAGEMENT_TYPES;
    for (const type of types) {
        const cfg = cfgDoc[type];
        if (!cfg)
            continue;
        try {
            const result = await processEngagementType(type, cfg, token);
            logger.info(`[engagement] ${type} → matched ${result.matched}, sent ${result.sent}, failed ${result.failed}, skipped ${result.skipped}`);
        }
        catch (error) {
            logger.error(`[engagement] ${type} failed:`, error);
        }
    }
}
/**
 * Daily sweep at 09:00 UTC (12:00 Cairo / 12:00 Riyadh in winter).
 * Runs all three engagement types based on their admin-configured rules.
 */
exports.runEngagementNotifications = (0, scheduler_1.onSchedule)({ schedule: '0 9 * * *', timeZone: 'UTC', secrets: ['EXPO_ACCESS_TOKEN'], memory: '512MiB' }, async () => {
    await runEngagementSweep();
});
/**
 * Manual trigger consumer: when the admin presses "تشغيل فوري الآن" in the
 * engagement page, a doc is written to engagementNotificationTriggers/{id}.
 * This processor runs every minute, processes pending triggers, and updates
 * their status. The per-user repeat gate still applies, so it can't be used
 * to spam users.
 */
exports.processEngagementTriggers = (0, scheduler_1.onSchedule)({ schedule: '*/1 * * * *', timeZone: 'UTC', secrets: ['EXPO_ACCESS_TOKEN'], memory: '512MiB' }, async () => {
    try {
        const snap = await db
            .collection('engagementNotificationTriggers')
            .where('status', '==', 'pending')
            .limit(10)
            .get();
        if (snap.empty)
            return;
        const cfgDoc = await loadEngagementConfig();
        if (!cfgDoc) {
            for (const docSnap of snap.docs) {
                await docSnap.ref.update({
                    status: 'failed',
                    error: 'engagement config missing',
                    processedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
            return;
        }
        const token = expoAccessToken.value();
        for (const docSnap of snap.docs) {
            const data = docSnap.data();
            const type = String(data.type || '');
            if (!ENGAGEMENT_TYPES.includes(type)) {
                await docSnap.ref.update({
                    status: 'failed',
                    error: `unknown type ${type}`,
                    processedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                continue;
            }
            const cfg = cfgDoc[type];
            if (!cfg) {
                await docSnap.ref.update({
                    status: 'failed',
                    error: `no config for ${type}`,
                    processedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                continue;
            }
            try {
                await docSnap.ref.update({ status: 'processing', processedAt: admin.firestore.FieldValue.serverTimestamp() });
                const result = await processEngagementType(type, cfg, token);
                await docSnap.ref.update({
                    status: 'done',
                    result,
                    completedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                logger.info(`[engagement-trigger] ${type} done → ${JSON.stringify(result)}`);
            }
            catch (error) {
                await docSnap.ref.update({
                    status: 'failed',
                    error: error instanceof Error ? error.message : String(error),
                    completedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
        }
    }
    catch (error) {
        logger.error('[engagement-trigger] processor failed:', error);
    }
});
