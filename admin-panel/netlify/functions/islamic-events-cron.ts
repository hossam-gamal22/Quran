// admin-panel/netlify/functions/islamic-events-cron.ts
// Smart auto-notifier for Islamic events.
//
// Runs hourly. For each user whose local clock just hit the configured
// notifyTimeHour, and whose local "tomorrow" Hijri date matches an enabled
// event, sends a push with the per-event translated message.
//
// Anti-duplicate: writes one doc per (eventId, hijriYear, userId) to
// `eventNotificationLog`. A second invocation in the same Hijri year won't
// re-send.
//
// Triggers:
//   • Scheduled (every hour) — production path
//   • Manual GET with ?dryRun=1 — admin verification (no sends, no writes)
//   • Manual GET with ?force=eventId[&userId=xxx] — admin test send
//
// Uses a lightweight Firestore REST client (see _lib/firebase-admin.ts) so the
// Netlify function bundle stays small and free of native deps.

import type { Handler, HandlerEvent } from '@netlify/functions';
import { getDb, SERVER_TIMESTAMP } from './_lib/firebase-admin';
import {
  gregorianToHijri,
  hijriForDaysAheadWithOverride,
  nowInTimezone,
  type HijriDate,
  type HijriOverrideRecord,
} from './_lib/hijri';
import {
  buildGenericTranslations,
  DEFAULT_EVENT_MESSAGES,
  type EventTranslations,
  type SupportedLanguage,
} from './_lib/event-messages';
import { sendExpoBatched, isValidExpoToken, type ExpoPushMessage } from './_lib/expo-send';

export const config = {
  schedule: '@hourly',
};

interface EventDoc {
  id: string;
  hijriMonth: number;
  hijriDay: number;
  nameAr?: string;
  name?: string;
  autoNotify?: boolean;
  notifyDaysBefore?: number;
  notifyTimeHour?: number;
  translations?: EventTranslations;
  actionUrl?: string;
}

interface UserCandidate {
  userId: string;
  token: string;
  language: SupportedLanguage;
  timezone: string;
  country: string; // ISO country code derived for hijri override lookup
}

const TIMEZONE_COUNTRIES: Record<string, string> = {
  'Africa/Cairo': 'EG',
  'Asia/Riyadh': 'SA', 'Asia/Mecca': 'SA',
  'Asia/Dubai': 'AE',
  'Asia/Kuwait': 'KW', 'Asia/Qatar': 'QA', 'Asia/Bahrain': 'BH', 'Asia/Muscat': 'OM',
  'Asia/Baghdad': 'IQ', 'Asia/Amman': 'JO', 'Asia/Beirut': 'LB', 'Asia/Damascus': 'SY',
  'Asia/Gaza': 'PS', 'Asia/Hebron': 'PS', 'Asia/Aden': 'YE',
  'Africa/Tripoli': 'LY', 'Africa/Tunis': 'TN', 'Africa/Algiers': 'DZ',
  'Africa/Casablanca': 'MA', 'Africa/Khartoum': 'SD',
  'Europe/London': 'GB', 'Europe/Paris': 'FR', 'Europe/Berlin': 'DE',
  'Europe/Istanbul': 'TR',
  'America/New_York': 'US', 'America/Los_Angeles': 'US',
  'Asia/Kuala_Lumpur': 'MY', 'Asia/Jakarta': 'ID',
};

function resolveCountry(data: Record<string, any>): string {
  // Priority: GPS-verified prayer location → admin/device country → timezone fallback.
  const prayerCountry = String(data.prayerCountryCode || '').toUpperCase();
  if (prayerCountry) return prayerCountry;
  const storedCountry = String(data.country || '').toUpperCase();
  if (storedCountry) return storedCountry;
  const tz = typeof data.timezone === 'string' ? data.timezone : '';
  return TIMEZONE_COUNTRIES[tz] || '';
}

interface RunStats {
  hourUtc: string;
  eventsConsidered: number;
  candidateUsers: number;
  matchedUsers: number;
  skippedAlreadySent: number;
  sentCount: number;
  failedCount: number;
  perEvent: Record<string, { sent: number; failed: number; skipped: number }>;
  errors: string[];
}

interface NotificationHistoryContext {
  eventCount: number;
  translations: EventTranslations;
  perLanguage: Record<string, number>;
}

const SUPPORTED_LANGS = new Set<SupportedLanguage>([
  'ar', 'en', 'fr', 'de', 'es', 'tr', 'ur', 'id', 'ms', 'hi', 'bn', 'ru',
]);

const DEFAULT_NOTIFY_HOUR = 19;
const DEFAULT_DAYS_BEFORE = 1;
const STORE_SOURCES = new Set(['play_store', 'app_store']);

function pickTranslation(
  translations: EventTranslations,
  lang: SupportedLanguage,
): { title: string; body: string } {
  if (translations[lang]?.title && translations[lang]?.body) {
    return translations[lang]!;
  }
  if (translations.ar?.title && translations.ar?.body) return translations.ar;
  if (translations.en?.title && translations.en?.body) return translations.en;
  for (const code of Object.keys(translations) as SupportedLanguage[]) {
    const t = translations[code];
    if (t?.title && t?.body) return t;
  }
  return { title: 'روح المسلم', body: '' };
}

function resolveTranslations(event: EventDoc): EventTranslations {
  if (event.translations && Object.keys(event.translations).length > 0) {
    return event.translations;
  }
  const known = DEFAULT_EVENT_MESSAGES[event.id];
  if (known) return known.translations;
  return buildGenericTranslations(event.nameAr || '', event.name || '');
}

function resolveActionUrl(event: EventDoc): string {
  if (event.actionUrl) return event.actionUrl;
  const known = DEFAULT_EVENT_MESSAGES[event.id];
  return known?.actionUrl || '/hijri';
}

function eventMatchesHijri(event: EventDoc, hijri: HijriDate): boolean {
  return event.hijriMonth === hijri.month && event.hijriDay === hijri.day;
}

function normalizeLanguage(raw: unknown): SupportedLanguage {
  const lang = (typeof raw === 'string' ? raw.toLowerCase() : 'ar').split('-')[0] as SupportedLanguage;
  return SUPPORTED_LANGS.has(lang) ? lang : 'ar';
}

async function fetchAutoNotifyEvents(): Promise<EventDoc[]> {
  const db = getDb();
  const docs = await db.listCollection('islamicEvents');
  const events: EventDoc[] = [];
  for (const doc of docs) {
    const data = doc.data;
    if (data.autoNotify !== true) continue;
    if (typeof data.hijriMonth !== 'number' || typeof data.hijriDay !== 'number') continue;
    events.push({
      id: doc.id,
      hijriMonth: data.hijriMonth,
      hijriDay: data.hijriDay,
      nameAr: data.nameAr,
      name: data.name,
      autoNotify: true,
      notifyDaysBefore: typeof data.notifyDaysBefore === 'number' ? data.notifyDaysBefore : DEFAULT_DAYS_BEFORE,
      notifyTimeHour: typeof data.notifyTimeHour === 'number' ? data.notifyTimeHour : DEFAULT_NOTIFY_HOUR,
      translations: data.translations,
      actionUrl: data.actionUrl,
    });
  }
  return events;
}

async function fetchCandidateUsers(): Promise<UserCandidate[]> {
  const db = getDb();
  const docs = await db.listCollection('users');
  const seen = new Map<string, UserCandidate>();
  for (const doc of docs) {
    const data = doc.data;
    if (data.placeholder) continue;
    if (!STORE_SOURCES.has(data.installSource)) continue;
    if (data.appStatus === 'uninstalled' || data.pushTokenInvalid === true) continue;
    if (!isValidExpoToken(data.fcmToken)) continue;
    if (typeof data.timezone !== 'string' || !data.timezone) continue;
    seen.set(data.fcmToken, {
      userId: doc.id,
      token: data.fcmToken,
      language: normalizeLanguage(data.language),
      timezone: data.timezone,
      country: resolveCountry(data),
    });
  }
  return Array.from(seen.values());
}

async function fetchHijriOverrides(): Promise<HijriOverrideRecord[]> {
  const db = getDb();
  const docs = await db.listCollection('hijriOverrides');
  const overrides: HijriOverrideRecord[] = [];
  for (const doc of docs) {
    const d = doc.data;
    if (d.deleted === true) continue;
    if (typeof d.countryCode !== 'string') continue;
    if (typeof d.hijriYear !== 'number' || typeof d.hijriMonth !== 'number') continue;
    if (typeof d.hijriStartGregorian !== 'string') continue;
    overrides.push({
      countryCode: d.countryCode,
      hijriYear: d.hijriYear,
      hijriMonth: d.hijriMonth,
      monthLength: d.monthLength === 30 ? 30 : 29,
      hijriStartGregorian: d.hijriStartGregorian,
    });
  }
  return overrides;
}

interface PlannedSend {
  event: EventDoc;
  user: UserCandidate;
  hijriYear: number;
}

function planSends(
  events: EventDoc[],
  users: UserCandidate[],
  utcNow: Date,
  overrides: HijriOverrideRecord[],
): PlannedSend[] {
  const planned: PlannedSend[] = [];
  for (const user of users) {
    const local = nowInTimezone(utcNow, user.timezone);
    if (!local) continue;
    for (const event of events) {
      const targetHour = event.notifyTimeHour ?? DEFAULT_NOTIFY_HOUR;
      if (local.hour !== targetHour) continue;

      const daysBefore = event.notifyDaysBefore ?? DEFAULT_DAYS_BEFORE;
      const targetHijri = hijriForDaysAheadWithOverride(
        local.gregorianMidnightUTC,
        daysBefore,
        user.country,
        overrides,
      );
      if (!eventMatchesHijri(event, targetHijri)) continue;

      planned.push({ event, user, hijriYear: targetHijri.year });
    }
  }
  return planned;
}

async function filterAlreadySent(planned: PlannedSend[]): Promise<{
  toSend: PlannedSend[];
  skipped: number;
}> {
  if (planned.length === 0) return { toSend: [], skipped: 0 };
  const db = getDb();
  const docIds = planned.map((p) => `${p.event.id}_${p.hijriYear}_${p.user.userId}`);
  const docs = await db.batchGetDocs('eventNotificationLog', docIds);
  const toSend: PlannedSend[] = [];
  let skipped = 0;
  docs.forEach((doc, idx) => {
    if (doc.exists) skipped++;
    else toSend.push(planned[idx]);
  });
  return { toSend, skipped };
}

function buildMessage(p: PlannedSend): ExpoPushMessage {
  const translations = resolveTranslations(p.event);
  const translation = pickTranslation(translations, p.user.language);
  const actionUrl = resolveActionUrl(p.event);
  return {
    to: p.user.token,
    title: translation.title,
    body: translation.body,
    sound: 'default',
    priority: 'high',
    channelId: 'general',
    interruptionLevel: 'time-sensitive',
    ttl: 86400,
    _displayInForeground: true,
    data: {
      type: 'islamic_event',
      eventId: p.event.id,
      hijriYear: p.hijriYear,
      actionType: 'screen',
      actionUrl,
      language: p.user.language,
    },
  };
}

async function logSends(sends: PlannedSend[], successFlags: boolean[]): Promise<void> {
  const db = getDb();
  const writes = sends
    .map((p, idx) => ({ p, success: successFlags[idx] }))
    .filter(({ success }) => success)
    .map(({ p }) => ({
      collectionPath: 'eventNotificationLog',
      docId: `${p.event.id}_${p.hijriYear}_${p.user.userId}`,
      data: {
        eventId: p.event.id,
        hijriYear: p.hijriYear,
        userId: p.user.userId,
        language: p.user.language,
        timezone: p.user.timezone,
        sentAt: SERVER_TIMESTAMP,
      },
    }));
  if (writes.length === 0) return;
  await db.batchWrite(writes);
}

async function writeRunHistory(stats: RunStats, mode: 'scheduled' | 'manual'): Promise<void> {
  try {
    const db = getDb();
    await db.createDoc('eventNotificationRuns', {
      ...stats,
      mode,
      createdAt: SERVER_TIMESTAMP,
    });
  } catch (e) {
    console.warn('Could not write run history:', (e as Error).message);
  }
}

function buildGenericHistoryTranslations(eventCount: number): EventTranslations {
  const arTitle = eventCount > 1 ? 'إشعارات المناسبات الإسلامية' : 'إشعار مناسبة إسلامية';
  const enTitle = eventCount > 1 ? 'Islamic Event Notifications' : 'Islamic Event Notification';
  return {
    ar: {
      title: arTitle,
      body: 'تم إرسال إشعار تلقائي من نظام المناسبات الإسلامية حسب توقيت المستخدمين المحلي.',
    },
    en: {
      title: enTitle,
      body: 'An automatic Islamic event reminder was sent based on users local time.',
    },
  };
}

export function buildIslamicEventNotificationHistoryDoc(
  stats: RunStats,
  context: NotificationHistoryContext,
): Record<string, any> {
  const status = stats.sentCount > 0 ? 'sent' : 'failed';
  const translations = context.eventCount === 1 && Object.keys(context.translations || {}).length > 0
    ? context.translations
    : buildGenericHistoryTranslations(context.eventCount);

  return {
    type: 'islamic_event',
    status,
    targetAudience: 'all',
    translations,
    sentCount: stats.sentCount,
    failedCount: stats.failedCount,
    deliveredCount: stats.sentCount,
    openedCount: 0,
    clickedCount: 0,
    perLanguage: context.perLanguage,
    eventCount: context.eventCount,
    matchedUsers: stats.matchedUsers,
    skippedAlreadySent: stats.skippedAlreadySent,
    perEvent: stats.perEvent,
    source: 'islamic-events-cron',
    scheduledRunAt: stats.hourUtc,
    ...(stats.errors.length > 0 ? { error: stats.errors[0] } : {}),
  };
}

async function writeNotificationHistory(
  stats: RunStats,
  sends: PlannedSend[],
): Promise<void> {
  try {
    const db = getDb();
    const eventIds = new Set(sends.map((s) => s.event.id));
    const perLanguage: Record<string, number> = {};
    sends.forEach((send) => {
      perLanguage[send.user.language] = (perLanguage[send.user.language] || 0) + 1;
    });

    const firstEvent = sends[0]?.event;
    const doc = buildIslamicEventNotificationHistoryDoc(stats, {
      eventCount: eventIds.size,
      translations: firstEvent ? resolveTranslations(firstEvent) : {},
      perLanguage,
    });

    await db.createDoc('notifications', {
      ...doc,
      createdAt: SERVER_TIMESTAMP,
      sentAt: SERVER_TIMESTAMP,
    });
  } catch (e) {
    console.warn('Could not write notification history:', (e as Error).message);
  }
}

function jsonResponse(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body, null, 2),
  };
}

const handler: Handler = async (event: HandlerEvent) => {
  const utcNow = new Date();
  const stats: RunStats = {
    hourUtc: utcNow.toISOString(),
    eventsConsidered: 0,
    candidateUsers: 0,
    matchedUsers: 0,
    skippedAlreadySent: 0,
    sentCount: 0,
    failedCount: 0,
    perEvent: {},
    errors: [],
  };

  const params = (event.queryStringParameters || {}) as Record<string, string>;
  const dryRun = params.dryRun === '1' || params.dryRun === 'true';
  const forceEventId = params.force || '';
  const forceUserId = params.userId || '';

  try {
    const events = await fetchAutoNotifyEvents();
    stats.eventsConsidered = events.length;

    if (events.length === 0 && !forceEventId) {
      await writeRunHistory(stats, dryRun ? 'manual' : 'scheduled');
      return jsonResponse(200, { ok: true, message: 'No auto-notify events configured', stats });
    }

    const [users, overrides] = await Promise.all([
      fetchCandidateUsers(),
      fetchHijriOverrides(),
    ]);
    stats.candidateUsers = users.length;

    let planned: PlannedSend[];
    if (forceEventId) {
      let targetEvent = events.find((e) => e.id === forceEventId);
      if (!targetEvent) {
        const snap = await getDb().getDoc('islamicEvents', forceEventId);
        if (!snap.exists) {
          return jsonResponse(404, { ok: false, error: `event ${forceEventId} not found` });
        }
        const d = snap.data;
        if (typeof d.hijriMonth !== 'number' || typeof d.hijriDay !== 'number') {
          return jsonResponse(400, { ok: false, error: 'event has no hijriMonth/hijriDay' });
        }
        targetEvent = {
          id: snap.id,
          hijriMonth: d.hijriMonth,
          hijriDay: d.hijriDay,
          nameAr: d.nameAr,
          name: d.name,
          translations: d.translations,
          actionUrl: d.actionUrl,
          notifyTimeHour: d.notifyTimeHour,
          notifyDaysBefore: d.notifyDaysBefore,
        };
      }
      const todayHijri = gregorianToHijri(utcNow);
      planned = users
        .filter((u) => !forceUserId || u.userId === forceUserId)
        .map((u) => ({ event: targetEvent!, user: u, hijriYear: todayHijri.year }));
    } else {
      planned = planSends(events, users, utcNow, overrides);
    }

    stats.matchedUsers = planned.length;
    for (const p of planned) {
      stats.perEvent[p.event.id] = stats.perEvent[p.event.id] || { sent: 0, failed: 0, skipped: 0 };
    }

    let toSend = planned;
    if (!dryRun && !forceEventId) {
      const filtered = await filterAlreadySent(planned);
      toSend = filtered.toSend;
      stats.skippedAlreadySent = filtered.skipped;
    }

    if (dryRun) {
      return jsonResponse(200, {
        ok: true,
        dryRun: true,
        planned: toSend.map((p) => ({
          eventId: p.event.id,
          userId: p.user.userId,
          language: p.user.language,
          timezone: p.user.timezone,
          hijriYear: p.hijriYear,
        })),
        stats,
      });
    }

    if (toSend.length === 0) {
      await writeRunHistory(stats, forceEventId ? 'manual' : 'scheduled');
      return jsonResponse(200, { ok: true, message: 'Nothing to send this hour', stats });
    }

    const messages = toSend.map(buildMessage);
    const result = await sendExpoBatched(messages);
    stats.sentCount = result.sentCount;
    stats.failedCount = result.failedCount;
    stats.errors = result.errors.slice(0, 20);

    result.tickets.forEach((ticket, idx) => {
      const p = toSend[idx];
      if (!p) return;
      const bucket = stats.perEvent[p.event.id];
      if (!bucket) return;
      if (ticket.status === 'ok') bucket.sent++;
      else bucket.failed++;
    });

    const successFlags = result.tickets.map((t) => t.status === 'ok');
    await logSends(toSend, successFlags);

    await writeNotificationHistory(stats, toSend);
    await writeRunHistory(stats, forceEventId ? 'manual' : 'scheduled');
    return jsonResponse(200, { ok: true, stats });
  } catch (err) {
    const message = (err as Error).message || 'unknown error';
    stats.errors.push(message);
    await writeRunHistory(stats, dryRun || forceEventId ? 'manual' : 'scheduled');
    return jsonResponse(500, { ok: false, error: message, stats });
  }
};

export { handler };
