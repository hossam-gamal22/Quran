// admin-panel/src/services/pushNotifications.ts
// خدمة إرسال الإشعارات عبر Expo Push API
// آخر تحديث: 2026-03-03

import { db } from '../firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  Timestamp,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';

// ==================== الأنواع ====================

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
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
  targetAudience: 'all' | 'ios' | 'android' | 'active' | 'inactive' | 'custom';
  targetLanguages?: string[];
  targetCountries?: string[];
  actionType?: 'none' | 'screen' | 'url';
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
  id: string;
  fcmToken: string;
  platform: string;
  language: string;
  country: string;
  lastActive: Timestamp | null;
}

interface BatchResult {
  successCount: number;
  failureCount: number;
  errors: string[];
}

interface UserStats {
  total: number;
  withTokens: number;
  ios: number;
  android: number;
  active: number;
}

// ==================== الثوابت ====================

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100;

// ==================== دوال مساعدة ====================

/**
 * جلب توكنات المستخدمين من Firebase
 */
const fetchUserTokens = async (
  targetAudience: string,
  targetLanguages?: string[],
  targetCountries?: string[]
): Promise<UserToken[]> => {
  try {
    const usersRef = collection(db, 'users');
    let usersQuery = query(usersRef);
    
    // تصفية حسب المنصة
    if (targetAudience === 'ios') {
      usersQuery = query(usersRef, where('platform', '==', 'ios'));
    } else if (targetAudience === 'android') {
      usersQuery = query(usersRef, where('platform', '==', 'android'));
    }
    
    const snapshot = await getDocs(usersQuery);
    let users: UserToken[] = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      // تجاهل المستخدمين بدون توكن
      if (data.fcmToken && data.fcmToken.startsWith('ExponentPushToken')) {
        users.push({
          id: doc.id,
          fcmToken: data.fcmToken,
          platform: data.platform || 'unknown',
          language: data.language || 'ar',
          country: data.country || 'SA',
          lastActive: data.lastActive,
        });
      }
    });
    
    // تصفية المستخدمين النشطين/غير النشطين
    if (targetAudience === 'active') {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      users = users.filter(u => {
        if (!u.lastActive) return false;
        const lastActive = u.lastActive.toDate();
        return lastActive > weekAgo;
      });
    } else if (targetAudience === 'inactive') {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      users = users.filter(u => {
        if (!u.lastActive) return true;
        const lastActive = u.lastActive.toDate();
        return lastActive <= weekAgo;
      });
    }
    
    // تصفية حسب اللغة
    if (targetLanguages && targetLanguages.length > 0) {
      users = users.filter(u => targetLanguages.includes(u.language));
    }
    
    // تصفية حسب البلد
    if (targetCountries && targetCountries.length > 0) {
      users = users.filter(u => targetCountries.includes(u.country));
    }
    
    return users;
  } catch (error) {
    console.error('Error fetching user tokens:', error);
    return [];
  }
};

/**
 * إرسال دفعة من الإشعارات
 */
const sendBatch = async (messages: ExpoPushMessage[]): Promise<BatchResult> => {
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];
    
    if (result.data) {
      result.data.forEach((item: any, index: number) => {
        if (item.status === 'ok') {
          successCount++;
        } else {
          failureCount++;
          errors.push(`Token ${index}: ${item.message || 'Unknown error'}`);
        }
      });
    }
    
    return { successCount, failureCount, errors };
  } catch (error) {
    console.error('Batch send error:', error);
    return {
      successCount: 0,
      failureCount: messages.length,
      errors: [(error as Error).message],
    };
  }
};

// ==================== الدوال الرئيسية ====================

/**
 * إرسال إشعار push لجميع المستخدمين المستهدفين
 */
export const sendPushNotification = async (
  payload: PushNotificationPayload
): Promise<SendResult> => {
  const errors: string[] = [];
  let sentCount = 0;
  let failedCount = 0;
  
  try {
    // 1. جلب توكنات المستخدمين
    const users = await fetchUserTokens(
      payload.targetAudience,
      payload.targetLanguages,
      payload.targetCountries
    );
    
    if (users.length === 0) {
      return {
        success: false,
        sentCount: 0,
        failedCount: 0,
        errors: ['لا يوجد مستخدمين مطابقين للمعايير المحددة'],
      };
    }
    
    console.log(`📤 Sending to ${users.length} users...`);
    
    // 2. بناء الرسائل
    const messages: ExpoPushMessage[] = users.map(user => ({
      to: user.fcmToken,
      title: user.language === 'ar' ? payload.titleAr : (payload.titleEn || payload.titleAr),
      body: user.language === 'ar' ? payload.bodyAr : (payload.bodyEn || payload.bodyAr),
      sound: 'default',
      priority: 'high',
      data: {
        actionType: payload.actionType,
        actionUrl: payload.actionUrl,
        imageUrl: payload.imageUrl,
      },
    }));
    
    // 3. إرسال على دفعات
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      const result = await sendBatch(batch);
      
      sentCount += result.successCount;
      failedCount += result.failureCount;
      errors.push(...result.errors);
      
      // تأخير بين الدفعات
      if (i + BATCH_SIZE < messages.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // 4. تسجيل الإشعار في Firebase
    await addDoc(collection(db, 'notifications'), {
      ...payload,
      status: 'sent',
      sentCount,
      failedCount,
      deliveredCount: sentCount, // تقدير مبدئي
      openedCount: 0,
      clickedCount: 0,
      sentAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
    
    console.log(`✅ Sent: ${sentCount}, Failed: ${failedCount}`);
    
    return {
      success: sentCount > 0,
      sentCount,
      failedCount,
      errors: errors.slice(0, 10), // أول 10 أخطاء فقط
    };
  } catch (error) {
    console.error('Send notification error:', error);
    return {
      success: false,
      sentCount,
      failedCount,
      errors: [(error as Error).message],
    };
  }
};

/**
 * إرسال إشعار اختباري
 */
export const sendTestNotification = async (token: string): Promise<boolean> => {
  try {
    const response = await fetch(EXPO_PUSH_API, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{
        to: token,
        title: 'إشعار اختباري 🔔',
        body: 'هذا إشعار تجريبي من لوحة التحكم',
        sound: 'default',
      }]),
    });
    
    return response.ok;
  } catch (error) {
    console.error('Test notification error:', error);
    return false;
  }
};

/**
 * التحقق من صلاحية التوكن
 */
export const isValidExpoToken = (token: string): boolean => {
  return token.startsWith('ExponentPushToken[') && token.endsWith(']');
};

/**
 * الحصول على إحصائيات المستخدمين
 */
export const getUserStats = async (): Promise<UserStats> => {
  try {
    const users = await fetchUserTokens('all');
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    return {
      total: users.length,
      withTokens: users.filter(u => u.fcmToken).length,
      ios: users.filter(u => u.platform === 'ios').length,
      android: users.filter(u => u.platform === 'android').length,
      active: users.filter(u => {
        if (!u.lastActive) return false;
        return u.lastActive.toDate() > weekAgo;
      }).length,
    };
  } catch (error) {
    return { total: 0, withTokens: 0, ios: 0, android: 0, active: 0 };
  }
};
