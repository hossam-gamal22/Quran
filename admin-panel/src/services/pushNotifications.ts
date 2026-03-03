// admin-panel/src/services/pushNotifications.ts
// خدمة إرسال الإشعارات عبر Expo Push API
// آخر تحديث: 2026-03-04

import { db } from '../firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where,
  Timestamp 
} from 'firebase/firestore';

// ========================================
// الأنواع
// ========================================

interface ExpoPushMessage {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
  ttl?: number;
}

interface PushNotificationPayload {
  titleAr: string;
  titleEn?: string;
  bodyAr: string;
  bodyEn?: string;
  targetAudience: 'all' | 'ios' | 'android' | 'active' | 'inactive';
  targetLanguages?: string[];
  targetCountries?: string[];
  actionUrl?: string;
  imageUrl?: string;
}

interface SendResult {
  success: boolean;
  sentCount: number;
  failedCount: number;
  errors: string[];
}

interface UserToken {
  token: string;
  language: string;
}

interface BatchResult {
  success: number;
  failed: number;
  errors: string[];
}

interface UserStats {
  total: number;
  withToken: number;
  ios: number;
  android: number;
  active: number;
}

// ========================================
// الثوابت
// ========================================

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100;

// ========================================
// الدوال المساعدة
// ========================================

/**
 * جلب توكنات المستخدمين من Firebase
 */
async function fetchUserTokens(
  targetAudience: string,
  targetLanguages?: string[],
  targetCountries?: string[]
): Promise<UserToken[]> {
  const tokens: UserToken[] = [];
  
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      
      // تجاهل المستخدمين بدون توكن
      if (!data.fcmToken || data.fcmToken === '' || data.placeholder) {
        return;
      }
      
      // تصفية حسب الـ audience
      if (targetAudience === 'ios' && data.platform !== 'ios') return;
      if (targetAudience === 'android' && data.platform !== 'android') return;
      
      // تصفية حسب النشاط
      if (targetAudience === 'active' || targetAudience === 'inactive') {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        let lastActive: Date;
        
        if (data.lastActive instanceof Timestamp) {
          lastActive = data.lastActive.toDate();
        } else if (data.lastActive) {
          lastActive = new Date(data.lastActive);
        } else {
          return;
        }
        
        if (targetAudience === 'active' && lastActive < weekAgo) return;
        if (targetAudience === 'inactive' && lastActive >= weekAgo) return;
      }
      
      // تصفية حسب اللغة
      if (targetLanguages && targetLanguages.length > 0) {
        if (!targetLanguages.includes(data.language)) return;
      }
      
      // تصفية حسب البلد
      if (targetCountries && targetCountries.length > 0) {
        if (!targetCountries.includes(data.country)) return;
      }
      
      tokens.push({
        token: data.fcmToken,
        language: data.language || 'ar',
      });
    });
    
    console.log(`📱 Found ${tokens.length} user tokens for target: ${targetAudience}`);
    return tokens;
    
  } catch (error) {
    console.error('❌ Error fetching user tokens:', error);
    return [];
  }
}

/**
 * إرسال دفعة من الإشعارات عبر Expo API
 */
async function sendBatch(messages: ExpoPushMessage[]): Promise<BatchResult> {
  const result: BatchResult = { success: 0, failed: 0, errors: [] };
  
  if (messages.length === 0) {
    return result;
  }
  
  try {
    const response = await fetch(EXPO_PUSH_API, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      result.errors.push(`HTTP ${response.status}: ${errorText}`);
      result.failed = messages.length;
      return result;
    }
    
    const responseData = await response.json();
    
    if (responseData.data && Array.isArray(responseData.data)) {
      responseData.data.forEach((ticket: { status: string; message?: string }) => {
        if (ticket.status === 'ok') {
          result.success++;
        } else {
          result.failed++;
          if (ticket.message) {
            result.errors.push(ticket.message);
          }
        }
      });
    }
    
    return result;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(errorMessage);
    result.failed = messages.length;
    return result;
  }
}

// ========================================
// الدوال الرئيسية
// ========================================

/**
 * إرسال إشعار للمستخدمين
 */
export async function sendPushNotification(payload: PushNotificationPayload): Promise<SendResult> {
  const result: SendResult = {
    success: false,
    sentCount: 0,
    failedCount: 0,
    errors: [],
  };
  
  try {
    console.log('🚀 Starting push notification send...');
    
    // 1. جلب توكنات المستخدمين
    const userTokens = await fetchUserTokens(
      payload.targetAudience,
      payload.targetLanguages,
      payload.targetCountries
    );
    
    if (userTokens.length === 0) {
      result.errors.push('لم يتم العثور على مستخدمين مطابقين');
      return result;
    }
    
    // 2. إنشاء الرسائل
    const messages: ExpoPushMessage[] = userTokens.map(({ token, language }) => {
      const isArabic = language === 'ar' || !payload.titleEn;
      const title = isArabic ? payload.titleAr : (payload.titleEn || payload.titleAr);
      const body = isArabic ? payload.bodyAr : (payload.bodyEn || payload.bodyAr);
      
      return {
        to: token,
        title,
        body,
        sound: 'default',
        priority: 'high',
        channelId: 'default',
        data: {
          actionUrl: payload.actionUrl,
          imageUrl: payload.imageUrl,
        },
      };
    });
    
    // 3. إرسال على دفعات
    const batches: ExpoPushMessage[][] = [];
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      batches.push(messages.slice(i, i + BATCH_SIZE));
    }
    
    // 4. إرسال كل دفعة
    for (let i = 0; i < batches.length; i++) {
      const batchResult = await sendBatch(batches[i]);
      result.sentCount += batchResult.success;
      result.failedCount += batchResult.failed;
      result.errors.push(...batchResult.errors);
      
      // تأخير بين الدفعات
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    result.success = result.sentCount > 0;
    return result;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(errorMessage);
    return result;
  }
}

/**
 * إرسال إشعار اختباري
 */
export async function sendTestNotification(token: string): Promise<boolean> {
  const message: ExpoPushMessage = {
    to: token,
    title: 'إشعار اختباري 🔔',
    body: 'هذا إشعار اختباري من لوحة تحكم روح المسلم',
    sound: 'default',
    priority: 'high',
  };
  
  const result = await sendBatch([message]);
  return result.success > 0;
}

/**
 * التحقق من صلاحية التوكن
 */
export function isValidExpoToken(token: string): boolean {
  return token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[');
}

/**
 * إحصائيات المستخدمين
 */
export async function getUserStats(): Promise<UserStats> {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    const users = snapshot.docs
      .map(doc => doc.data())
      .filter(u => !u.placeholder);
    
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    return {
      total: users.length,
      withToken: users.filter(u => u.fcmToken && u.fcmToken !== '').length,
      ios: users.filter(u => u.platform === 'ios').length,
      android: users.filter(u => u.platform === 'android').length,
      active: users.filter(u => {
        if (!u.lastActive) return false;
        let lastActive: Date;
        if (u.lastActive instanceof Timestamp) {
          lastActive = u.lastActive.toDate();
        } else {
          lastActive = new Date(u.lastActive);
        }
        return lastActive > weekAgo;
      }).length,
    };
  } catch (error) {
    console.error('❌ Error getting user stats:', error);
    return { total: 0, withToken: 0, ios: 0, android: 0, active: 0 };
  }
}
