import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '@/config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Platform } from 'react-native';

const RATE_LIMIT_KEY = '@qa_last_question_time';
const RATE_LIMIT_MS = 5 * 60 * 1000; // 5 minutes

export interface QuestionSubmission {
  userName?: string;
  userEmail?: string;
  question: string;
  userId?: string;
  language: string;
  registeredName?: string;
}

export async function checkRateLimit(): Promise<boolean> {
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

export async function submitQuestion(data: QuestionSubmission): Promise<void> {
  // Save to Firestore (primary)
  await addDoc(collection(db, 'userQuestions'), {
    userName: data.userName || '',
    userEmail: data.userEmail || '',
    question: data.question,
    status: 'pending',
    createdAt: new Date().toISOString(),
    userId: data.userId || null,
    registeredName: data.registeredName || '',
    platform: Platform.OS,
    language: data.language,
  });

  // Save rate limit timestamp
  await AsyncStorage.setItem(RATE_LIMIT_KEY, String(Date.now()));

  // Send email via EmailJS (best-effort, non-blocking)
  try {
    const serviceId = process.env.EXPO_PUBLIC_EMAILJS_SERVICE_ID;
    const templateId = process.env.EXPO_PUBLIC_EMAILJS_TEMPLATE_ID;
    const publicKey = process.env.EXPO_PUBLIC_EMAILJS_PUBLIC_KEY;

    if (serviceId && templateId && publicKey) {
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
}
