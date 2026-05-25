import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '@/config/firebase';
import { collection, addDoc, doc, onSnapshot } from 'firebase/firestore';
import { Platform } from 'react-native';

const RATE_LIMIT_KEY = '@qa_last_question_time';
const FCM_TOKEN_CACHE_KEY = '@rooh_fcm_token';
const RATE_LIMIT_MS = 0;

async function readCachedFcmToken(): Promise<string> {
  try {
    const token = await AsyncStorage.getItem(FCM_TOKEN_CACHE_KEY);
    return token && token.startsWith('ExponentPushToken') ? token : '';
  } catch {
    return '';
  }
}

export interface QuestionSubmission {
  userName?: string;
  userEmail?: string;
  question: string;
  userId?: string;
  language: string;
  registeredName?: string;
  requestMode?: 'assistant' | 'manual';
  notifyByEmail?: boolean;
  updateRateLimit?: boolean;
}

export interface AutoAnswerSource {
  title: string;
  url: string;
  snippet?: string;
}

export interface AutoAnswerResult {
  answer: string;
  disclaimer?: string;
  sources: AutoAnswerSource[];
  status: 'answered' | 'no_results' | 'failed' | 'unconfigured' | 'disabled' | 'daily_limit';
  isAdminCorrected?: boolean;
  correctedAt?: string;
}

export async function checkRateLimit(): Promise<boolean> {
  if (RATE_LIMIT_MS <= 0) return true;

  try {
    const last = await AsyncStorage.getItem(RATE_LIMIT_KEY);
    if (last) {
      const diff = Date.now() - Number(last);
      if (diff < RATE_LIMIT_MS) return false;
    }
    return true;
  } catch {
    return true;
  }
}

export async function submitQuestion(data: QuestionSubmission): Promise<string> {
  const fcmToken = await readCachedFcmToken();

  // Save to Firestore (primary)
  const docRef = await addDoc(collection(db, 'userQuestions'), {
    userName: data.userName || '',
    userEmail: data.userEmail || '',
    question: data.question,
    status: 'pending',
    createdAt: new Date().toISOString(),
    userId: data.userId || null,
    registeredName: data.registeredName || '',
    platform: Platform.OS,
    language: data.language,
    requestMode: data.requestMode || 'manual',
    fcmToken: fcmToken || null,
  });

  // Save rate limit timestamp only when a cooldown is configured.
  if (RATE_LIMIT_MS > 0 && data.updateRateLimit !== false) {
    await AsyncStorage.setItem(RATE_LIMIT_KEY, String(Date.now()));
  }

  // Send email via EmailJS (best-effort, non-blocking)
  try {
    const serviceId = process.env.EXPO_PUBLIC_EMAILJS_SERVICE_ID;
    const templateId = process.env.EXPO_PUBLIC_EMAILJS_TEMPLATE_ID;
    const publicKey = process.env.EXPO_PUBLIC_EMAILJS_PUBLIC_KEY;

    if (data.notifyByEmail !== false && serviceId && templateId && publicKey) {
      console.log('[Email] Sending notification email...');
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: serviceId,
          template_id: templateId,
          user_id: publicKey,
          template_params: {
            from_name: data.userName || 'مستخدم روح المسلم',
            question: data.question,
            user_email: data.userEmail || 'لم يُذكر',
          },
        }),
      });
      const responseText = await response.text();
      console.log('[Email] Response:', response.status, responseText);
    } else {
      console.warn('[Email] Keys missing:', { serviceId: !!serviceId, templateId: !!templateId, publicKey: !!publicKey });
    }
  } catch (e) {
    console.warn('[Email] Send failed (non-critical):', e);
  }

  return docRef.id;
}

export function waitForAutoAnswer(
  questionId: string,
  timeoutMs = 15000
): Promise<AutoAnswerResult | null> {
  return new Promise((resolve) => {
    let settled = false;
    let unsubscribe: (() => void) | undefined;

    const finish = (result: AutoAnswerResult | null) => {
      if (settled) return;
      settled = true;
      if (unsubscribe) unsubscribe();
      clearTimeout(timer);
      resolve(result);
    };

    const timer = setTimeout(() => finish(null), timeoutMs);

    unsubscribe = onSnapshot(
      doc(db, 'userQuestions', questionId),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as any;
        const status = data.autoAnswerStatus;
        if (!status || status === 'searching') return;

        if (status === 'answered' || status === 'no_results' || status === 'daily_limit') {
          finish({
            answer: String(data.autoAnswer || ''),
            disclaimer: data.autoAnswerDisclaimer ? String(data.autoAnswerDisclaimer) : undefined,
            sources: Array.isArray(data.autoAnswerSources) ? data.autoAnswerSources : [],
            status,
            isAdminCorrected: data.adminCorrection === true,
            correctedAt: data.adminCorrectedAt || data.adminAnsweredAt,
          });
          return;
        }

        if (status === 'failed' || status === 'unconfigured' || status === 'disabled') {
          finish({
            answer: '',
            sources: [],
            status,
          });
        }
      },
      () => finish(null)
    );
  });
}

export function subscribeToQuestionAnswer(
  questionId: string,
  onChange: (answer: AutoAnswerResult) => void,
  onError?: (error: unknown) => void
): () => void {
  return onSnapshot(
    doc(db, 'userQuestions', questionId),
    (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as any;
      const status = data.autoAnswerStatus;
      if (status !== 'answered' || !data.autoAnswer) return;

      onChange({
        answer: String(data.autoAnswer || ''),
        disclaimer: data.autoAnswerDisclaimer ? String(data.autoAnswerDisclaimer) : undefined,
        sources: Array.isArray(data.autoAnswerSources) ? data.autoAnswerSources : [],
        status: 'answered',
        isAdminCorrected: data.adminCorrection === true,
        correctedAt: data.adminCorrectedAt || data.adminAnsweredAt,
      });
    },
    (error) => {
      if (onError) onError(error);
    }
  );
}
