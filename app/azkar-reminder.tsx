// app/azkar-reminder.tsx
// شاشة إعداد تذكيرات الأذكار
// ================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';

import { Language, getAllCategories, getCategoryName, AzkarCategoryType } from '@/lib/azkar-api';

// ================================
// الأنواع
// ================================

interface ReminderSettings {
  enabled: boolean;
  categoryId: AzkarCategoryType;
  time: string; // HH:mm format
  days: number[]; // 0-6 (Sunday-Saturday)
  sound: boolean;
  vibration: boolean;
}

interface CategoryReminder {
  morning: ReminderSettings;
  evening: ReminderSettings;
  sleep: ReminderSettings;
  wakeup: ReminderSettings;
  after_prayer: ReminderSettings;
}

const DEFAULT_REMINDERS: CategoryReminder = {
  morning: {
    enabled: false,
    categoryId: 'morning',
    time: '06:00',
    days: [0, 1, 2, 3, 4, 5, 6],
    sound: true,
    vibration: true,
  },
  evening: {
    enabled: false,
    categoryId: 'evening',
    time: '17:00',
    days: [0, 1, 2, 3, 4, 5, 6],
    sound: true,
    vibration: true,
  },
  sleep: {
    enabled: false,
    categoryId: 'sleep',
    time: '22:00',
    days: [0, 1, 2, 3, 4, 5, 6],
    sound: true,
    vibration: true,
  },
  wakeup: {
    enabled: false,
    categoryId: 'wakeup',
    time: '05:30',
    days: [0, 1, 2, 3, 4, 5, 6],
    sound: true,
    vibration: true,
  },
  after_prayer: {
    enabled: false,
    categoryId: 'after_prayer',
    time: '12:30',
    days: [0, 1, 2, 3, 4, 5, 6],
    sound: true,
    vibration: true,
  },
};

const DAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const DAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const STORAGE_KEY = 'azkar_reminders';

// ================================
// المكون الرئيسي
// ================================

export default function AzkarReminderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // الحالة
  const [reminders, setReminders] = useState<CategoryReminder>(DEFAULT_REMINDERS);
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState<Language>('ar');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<keyof CategoryReminder | null>(null);
  const [hasPermission, setHasPermission] = useState(false);

  // ================================
  // تحميل البيانات
  // ================================

  const loadData = useCallback(async () => {
    try {
      const [storedDarkMode, storedLanguage, storedReminders] = await Promise.all([
        AsyncStorage.getItem('darkMode'),
        AsyncStorage.getItem('app_language'),
        AsyncStorage.getItem(STORAGE_KEY),
      ]);

      if (storedDarkMode !== null) setDarkMode(JSON.parse(storedDarkMode));
      if (storedLanguage) setLanguage(storedLanguage as Language);
      if (storedReminders) setReminders(JSON.parse(storedReminders));

      // التحقق من صلاحيات الإشعارات
      const { status } = await Notifications.getPermissionsAsync();
      setHasPermission(status === 'granted');
    } catch (error) {
      console.error('Error loading reminder settings:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ================================
  // طلب صلاحيات الإشعارات
  // ================================

  const requestPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    setHasPermission(status === 'granted');
    
    if (status !== 'granted') {
      Alert.alert(
        language === 'ar' ? 'تنبيه' : 'Alert',
        language === 'ar' 
          ? 'يرجى تفعيل الإشعارات من الإعدادات لتلقي التذكيرات'
          : 'Please enable notifications in settings to receive reminders',
      );
    }
  };

  // ================================
  // حفظ الإعدادات
  // ================================

  const saveReminders = async (newReminders: CategoryReminder) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newReminders));
      setReminders(newReminders);
      
      // إعادة جدولة الإشعارات
      await scheduleNotifications(newReminders);
    } catch (error) {
      console.error('Error saving reminders:', error);
    }
  };

  // ================================
  // جدولة الإشعارات
  // ================================

  const scheduleNotifications = async (settings: CategoryReminder) => {
    // إلغاء جميع الإشعارات المجدولة
    await Notifications.cancelAllScheduledNotificationsAsync();

    const categories = getAllCategories();

    for (const [key, reminder] of Object.entries(settings)) {
      if (!reminder.enabled) continue;

      const category = categories.find(c => c.id === reminder.categoryId);
      if (!category) continue;

      const [hours, minutes] = reminder.time.split(':').map(Number);
      const categoryName = getCategoryName(category, language);

      for (const day of reminder.days) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: language === 'ar' ? '⏰ حان وقت الأذكار' : '⏰ Time for Adhkar',
            body: categoryName,
            sound: reminder.sound,
            data: { categoryId: reminder.categoryId },
          },
          trigger: {
            weekday: day + 1, // 1-7 in expo
            hour: hours,
            minute: minutes,
            repeats: true,
          },
        });
      }
    }
  };

  // ================================
  // تبديل التفعيل
  // ================================

  const toggleReminder = async (categoryKey: keyof CategoryReminder) => {
    if (!hasPermission) {
      await requestPermissions();
      return;
    }

    const newReminders = {
      ...reminders,
      [categoryKey]: {
        ...reminders[categoryKey],
        enabled: !reminders[categoryKey].enabled,
      },
    };
    
    await saveReminders(newReminders);
  };

  // ================================
  // تغيير الوقت
  // ================================

  const handleTimeChange = async (event: any, selectedDate?: Date) => {
    setShowTimePicker(false);
    
    if (selectedDate && selectedCategory) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      const time = `${hours}:${minutes}`;

      const newReminders = {
        ...reminders,
        [selectedCategory]: {
          ...reminders[selectedCategory],
          time,
        },
      };
      
      await saveReminders(newReminders);
    }
  };

  // ================================
  // تبديل اليوم
  // ================================

  const toggleDay = async (categoryKey: keyof CategoryReminder, day: number) => {
    const currentDays = reminders[categoryKey].days;
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day].sort();

    const newReminders = {
      ...reminders,
      [categoryKey]: {
        ...reminders[categoryKey],
        days: newDays,
      },
    };
    
    await saveReminders(newReminders);
  };

  // ================================
  // رندر كارت التذكير
  // ================================

  const renderReminderCard = (
    categoryKey: keyof CategoryReminder,
    icon: string,
    color: string
  ) => {
    const reminder = reminders[categoryKey];
    const categories = getAllCategories();
    const category = categories.find(c => c.id === categoryKey);
    const categoryName = category ? getCategoryName(category, language) : categoryKey;
    const days = language === 'ar' ? DAYS_AR : DAYS_EN;

    return (
      <View
        style={[
          styles.reminderCard,
          { backgroundColor: darkMode ? '#1F2937' : '#FFFFFF' },
        ]}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
            <Ionicons name={icon as any} size={24} color={color} />
          </View>
          
          <View style={styles.cardTitleContainer}>
            <Text style={[styles.cardTitle, { color: darkMode ? '#F9FAFB' : '#1F2937' }]}>
              {categoryName}
            </Text>
            <Text style={[styles.cardTime, { color: color }]}>
              {reminder.time}
            </Text>
          </View>

          <Switch
            value={reminder.enabled}
            onValueChange={() => toggleReminder(categoryKey)}
            trackColor={{ false: '#D1D5DB', true: color + '80' }}
            thumbColor={reminder.enabled ? color : '#F3F4F6'}
          />
        </View>

        {/* التفاصيل - تظهر فقط عند التفعيل */}
        {reminder.enabled && (
          <View style={styles.cardDetails}>
            {/* تغيير الوقت */}
            <TouchableOpacity
              style={[styles.timeButton, { borderColor: darkMode ? '#374151' : '#E5E7EB' }]}
              onPress={() => {
                setSelectedCategory(categoryKey);
                setShowTimePicker(true);
              }}
            >
              <Ionicons name="time-outline" size={20} color={color} />
              <Text style={[styles.timeButtonText, { color: darkMode ? '#F9FAFB' : '#1F2937' }]}>
                {language === 'ar' ? 'تغيير الوقت' : 'Change Time'}
              </Text>
            </TouchableOpacity>

            {/* أيام الأسبوع */}
            <Text style={[styles.daysLabel, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>
              {language === 'ar' ? 'أيام التذكير:' : 'Reminder Days:'}
            </Text>
            <View style={styles.daysContainer}>
              {days.map((day, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayButton,
                    reminder.days.includes(index) && { backgroundColor: color },
                    !reminder.days.includes(index) && { 
                      backgroundColor: darkMode ? '#374151' : '#F3F4F6' 
                    },
                  ]}
                  onPress={() => toggleDay(categoryKey, index)}
                >
                  <Text
                    style={[
                      styles.dayButtonText,
                      { color: reminder.days.includes(index) ? '#FFFFFF' : (darkMode ? '#9CA3AF' : '#6B7280') },
                    ]}
                  >
                    {day.substring(0, 2)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  // ================================
  // الرندر الرئيسي
  // ================================

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={[styles.container, { backgroundColor: darkMode ? '#111827' : '#F3F4F6' }]}>
        {/* Header */}
        <LinearGradient
          colors={['#10B981', '#059669']}
          style={[styles.header, { paddingTop: insets.top }]}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            
            <Text style={styles.headerTitle}>
              {language === 'ar' ? 'تذكيرات الأذكار' : 'Adhkar Reminders'}
            </Text>
            
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>

        {/* تحذير عدم وجود صلاحيات */}
        {!hasPermission && (
          <TouchableOpacity
            style={styles.permissionBanner}
            onPress={requestPermissions}
          >
            <Ionicons name="notifications-off" size={24} color="#F59E0B" />
            <Text style={styles.permissionText}>
              {language === 'ar' 
                ? 'اضغط هنا لتفعيل الإشعارات'
                : 'Tap here to enable notifications'}
            </Text>
          </TouchableOpacity>
        )}

        {/* المحتوى */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* وصف */}
          <Text style={[styles.description, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>
            {language === 'ar'
              ? 'فعّل التذكيرات لتلقي إشعار في الأوقات المحددة'
              : 'Enable reminders to receive notifications at set times'}
          </Text>

          {/* كروت التذكيرات */}
          {renderReminderCard('morning', 'sunny', '#F59E0B')}
          {renderReminderCard('evening', 'moon', '#8B5CF6')}
          {renderReminderCard('sleep', 'bed-outline', '#3B82F6')}
          {renderReminderCard('wakeup', 'sunny-outline', '#10B981')}
          {renderReminderCard('after_prayer', 'hand-left', '#EC4899')}

          {/* مساحة سفلية */}
          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Time Picker */}
        {showTimePicker && (
          <DateTimePicker
            value={(() => {
              if (selectedCategory) {
                const [hours, minutes] = reminders[selectedCategory].time.split(':').map(Number);
                const date = new Date();
                date.setHours(hours, minutes, 0, 0);
                return date;
              }
              return new Date();
            })()}
            mode="time"
            is24Hour={true}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleTimeChange}
          />
        )}
      </View>
    </>
  );
}

// ================================
// الأنماط
// ================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    gap: 8,
  },
  permissionText: {
    color: '#92400E',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  reminderCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardTime: {
    fontSize: 14,
    fontWeight: '500',
  },
  cardDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginBottom: 16,
  },
  timeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  daysLabel: {
    fontSize: 13,
    marginBottom: 8,
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
