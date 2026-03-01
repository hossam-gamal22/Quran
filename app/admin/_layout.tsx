// app/admin/_layout.tsx
import { Stack } from 'expo-router';
import { Colors } from '../../constants/theme';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.primaryDark,
        },
        headerTintColor: Colors.textLight,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'لوحة التحكم',
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: 'إعدادات التطبيق',
        }}
      />
      <Stack.Screen
        name="ads"
        options={{
          title: 'إعدادات الإعلانات',
        }}
      />
      <Stack.Screen
        name="pricing"
        options={{
          title: 'أسعار الاشتراكات',
        }}
      />
      <Stack.Screen
        name="content"
        options={{
          title: 'المحتوى',
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          title: 'الإشعارات',
        }}
      />
      <Stack.Screen
        name="reciters"
        options={{
          title: 'القراء',
        }}
      />
      <Stack.Screen
        name="subscribers"
        options={{
          title: 'المشتركين',
        }}
      />
    </Stack>
  );
}
