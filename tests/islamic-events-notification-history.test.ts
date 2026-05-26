import { describe, expect, it } from 'vitest';

import { buildIslamicEventNotificationHistoryDoc } from '../admin-panel/netlify/functions/islamic-events-cron';

describe('islamic event notification history', () => {
  it('creates a notifications history document for the admin panel', () => {
    const doc = buildIslamicEventNotificationHistoryDoc(
      {
        hourUtc: '2026-05-26T15:00:00.000Z',
        eventsConsidered: 13,
        candidateUsers: 2,
        matchedUsers: 2,
        skippedAlreadySent: 0,
        sentCount: 2,
        failedCount: 0,
        perEvent: { event_eid_adha: { sent: 2, failed: 0, skipped: 0 } },
        errors: [],
      },
      {
        eventCount: 1,
        translations: {
          ar: { title: 'غداً عيد الأضحى المبارك 🐑', body: 'غداً عيد الأضحى.' },
          en: { title: 'Tomorrow: Eid al-Adha 🐑', body: 'Tomorrow is Eid al-Adha.' },
        },
        perLanguage: { ar: 1, en: 1 },
      },
    );

    expect(doc.type).toBe('islamic_event');
    expect(doc.status).toBe('sent');
    expect(doc.sentCount).toBe(2);
    expect(doc.failedCount).toBe(0);
    expect(doc.deliveredCount).toBe(2);
    expect(doc.perLanguage).toEqual({ ar: 1, en: 1 });
    expect(doc.translations.ar?.title).toContain('عيد الأضحى');
  });
});
