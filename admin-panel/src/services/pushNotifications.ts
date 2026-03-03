// admin-panel/src/services/pushNotifications.ts
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushMessage {
  to: string[];
  title: string;
  body: string;
  data?: Record<string, any>;
}

export const sendPushNotification = async (message: PushMessage): Promise<void> => {
  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
  
  if (!response.ok) {
    throw new Error('Failed to send push notification');
  }
};

// إرسال لجميع المستخدمين
export const sendToAllUsers = async (title: string, body: string): Promise<void> => {
  // 1. جلب كل FCM tokens من Firestore
  const tokensSnapshot = await getDocs(collection(db, 'users'));
  const tokens = tokensSnapshot.docs
    .map(doc => doc.data().fcmToken)
    .filter(token => token);
  
  // 2. إرسال الإشعار
  await sendPushNotification({
    to: tokens,
    title,
    body,
  });
};
