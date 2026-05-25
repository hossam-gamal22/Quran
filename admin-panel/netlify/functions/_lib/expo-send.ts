// admin-panel/netlify/functions/_lib/expo-send.ts
// Lightweight Expo Push sender for server-side cron use. Uses EXPO_ACCESS_TOKEN.
// Returns per-message tickets so callers can mark uninstalled devices.

const EXPO_PUSH_API = 'https://api.expo.dev/v2/push/send';
const BATCH_SIZE = 100;

export interface ExpoPushMessage {
  to: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
  interruptionLevel?: 'active' | 'critical' | 'passive' | 'time-sensitive';
  ttl?: number;
  _contentAvailable?: boolean;
  _displayInForeground?: boolean;
}

export interface ExpoPushTicket {
  status?: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string; [key: string]: unknown };
}

export interface ExpoSendResult {
  sentCount: number;
  failedCount: number;
  tickets: ExpoPushTicket[];
  errors: string[];
}

export async function sendExpoBatched(messages: ExpoPushMessage[]): Promise<ExpoSendResult> {
  const expoToken = (process.env.EXPO_ACCESS_TOKEN || '').trim();
  if (!expoToken) {
    return {
      sentCount: 0,
      failedCount: messages.length,
      tickets: [],
      errors: ['EXPO_ACCESS_TOKEN not configured'],
    };
  }
  if (messages.length === 0) {
    return { sentCount: 0, failedCount: 0, tickets: [], errors: [] };
  }

  const allTickets: ExpoPushTicket[] = [];
  const errors: string[] = [];
  let sentCount = 0;
  let failedCount = 0;

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    try {
      const res = await fetch(EXPO_PUSH_API, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${expoToken}`,
        },
        body: JSON.stringify(batch),
      });

      if (!res.ok) {
        const text = await res.text();
        errors.push(`HTTP ${res.status}: ${text.slice(0, 200)}`);
        failedCount += batch.length;
        batch.forEach(() => allTickets.push({ status: 'error', message: `HTTP ${res.status}` }));
        continue;
      }

      const result = await res.json();
      const tickets: ExpoPushTicket[] = result.data ?? [];
      tickets.forEach((ticket, idx) => {
        allTickets.push(ticket);
        if (ticket.status === 'ok') {
          sentCount++;
        } else {
          failedCount++;
          errors.push(`Token ${i + idx}: ${ticket.message ?? ticket.details?.error ?? 'error'}`);
        }
      });
    } catch (e) {
      errors.push((e as Error).message);
      failedCount += batch.length;
      batch.forEach(() => allTickets.push({ status: 'error', message: (e as Error).message }));
    }

    if (i + BATCH_SIZE < messages.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return { sentCount, failedCount, tickets: allTickets, errors };
}

export function isValidExpoToken(token: unknown): token is string {
  return typeof token === 'string' && token.startsWith('ExponentPushToken[') && token.endsWith(']');
}
