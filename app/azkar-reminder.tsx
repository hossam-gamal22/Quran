// app/azkar-reminder.tsx
// تم دمج تذكيرات الأذكار في صفحة الإشعارات الموحدة
// هذه الصفحة تعيد التوجيه إلى صفحة الإشعارات
// ================================

import { useEffect } from 'react';
import { useRouter, Stack } from 'expo-router';

export default function AzkarReminderScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/settings/notifications');
  }, []);

  return <Stack.Screen options={{ headerShown: false }} />;
}
