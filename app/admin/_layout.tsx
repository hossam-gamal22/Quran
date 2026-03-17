// app/admin/_layout.tsx
import { Stack } from 'expo-router';
import { Colors } from '../../constants/theme';
import { t } from '@/lib/i18n';

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
          title: t('admin.dashboard'),
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: t('admin.appSettings'),
        }}
      />
      <Stack.Screen
        name="ads"
        options={{
          title: t('admin.adsTitle'),
        }}
      />
      <Stack.Screen
        name="pricing"
        options={{
          title: t('admin.pricingTitle'),
        }}
      />
      <Stack.Screen
        name="content"
        options={{
          title: t('admin.contentTitle'),
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          title: t('admin.notificationsTitle'),
        }}
      />
      <Stack.Screen
        name="reciters"
        options={{
          title: t('admin.recitersTitle'),
        }}
      />
      <Stack.Screen
        name="subscribers"
        options={{
          title: t('admin.subscribersTitle'),
        }}
      />
      <Stack.Screen
        name="widgets"
        options={{
          title: t('admin.widgetEngine'),
        }}
      />
      <Stack.Screen
        name="events"
        options={{
          title: 'المناسبات الإسلامية',
        }}
      />
      <Stack.Screen
        name="daily-content"
        options={{
          title: 'المحتوى اليومي',
        }}
      />
      <Stack.Screen
        name="users"
        options={{
          title: 'إدارة المستخدمين',
        }}
      />
      <Stack.Screen
        name="settings-override"
        options={{
          title: 'تجاوز الإعدادات',
        }}
      />
      <Stack.Screen
        name="app-sections"
        options={{
          title: 'أقسام التطبيق',
        }}
      />
    </Stack>
  );
}
