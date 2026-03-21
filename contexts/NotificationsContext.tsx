// contexts/NotificationsContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import {
  registerDeviceForPushNotifications,
  getNotificationSettings,
  saveNotificationSettings,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  schedulePrayerNotification,
  scheduleAzkarReminder,
  cancelAllNotifications,
  getScheduledNotifications,
  clearBadge,
  NotificationSettings,
} from '@/lib/push-notifications';
import { getAyahSoundUri } from '@/lib/notification-sound-cache';
import { useRouter } from 'expo-router';

// ==================== Types ====================

interface NotificationsContextType {
  // State
  isEnabled: boolean;
  settings: NotificationSettings;
  fcmToken: string | null;
  isLoading: boolean;
  error: string | null;
  scheduledCount: number;
  
  // Actions
  enableNotifications: () => Promise<boolean>;
  disableNotifications: () => Promise<void>;
  updateSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
  refreshToken: () => Promise<void>;
  
  // Prayer Notifications
  schedulePrayerReminders: (prayers: Array<{
    name: string;
    time: Date;
    minutesBefore?: number;
  }>) => Promise<void>;
  
  // Azkar Notifications
  scheduleAzkarReminders: (reminders: Array<{
    type: 'morning' | 'evening' | 'sleep';
    time: Date;
  }>) => Promise<void>;
  
  // Clear
  clearAllScheduled: () => Promise<void>;
}

// ==================== Context ====================

const NotificationsContext = createContext<NotificationsContextType | undefined>(
  undefined
);

// ==================== Provider ====================

interface NotificationsProviderProps {
  children: ReactNode;
}

export const NotificationsProvider: React.FC<NotificationsProviderProps> = ({
  children,
}) => {
  const router = useRouter();
  const [isEnabled, setIsEnabled] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    prayerReminders: true,
    azkarReminders: true,
    dailyAyah: true,
    seasonalContent: true,
    generalUpdates: true,
  });
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scheduledCount, setScheduledCount] = useState(0);
  
  const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined);

  // Initialize
  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true);
        
        // Load settings
        const savedSettings = await getNotificationSettings();
        setSettings(savedSettings);
        setIsEnabled(savedSettings.enabled);
        
        // Get scheduled count
        const scheduled = await getScheduledNotifications();
        setScheduledCount(scheduled.length);
        
        // Clear badge on app open
        await clearBadge();
        
      } catch (err) {
        console.error('Error initializing notifications:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  // Setup listeners
  useEffect(() => {
    // Notification received while app is foregrounded
    notificationListener.current = addNotificationReceivedListener(
      async (notification) => {
        console.log('Notification received:', notification);
        const data = notification.request.content.data;
        // Play ayah audio when custom reminder with ayah content arrives in foreground
        if (data?.type === 'custom' && data?.contentType === 'ayah') {
          try {
            // Try to use cached sound first, fallback to URL
            let audioUri = String(data.ayahAudioUrl || '');
            
            // If we have surah/ayah/reciter info, try to get cached version
            if (data.surah && data.ayah && data.reciter) {
              const cached = await getAyahSoundUri(
                Number(data.surah),
                Number(data.ayah),
                String(data.reciter)
              );
              audioUri = cached.uri;
              console.log(`📱 Playing ayah from ${cached.isLocal ? 'cache' : 'network'}: ${audioUri}`);
            }
            
            if (!audioUri) return;
            
            const { sound } = await Audio.Sound.createAsync(
              { uri: audioUri },
              { shouldPlay: true }
            );
            sound.setOnPlaybackStatusUpdate((status) => {
              if (status.isLoaded && status.didJustFinish) {
                sound.unloadAsync();
              }
            });
          } catch (e) {
            console.warn('Failed to play ayah audio from notification:', e);
          }
        }
        // Play first ayah audio when Kahf Friday reminder arrives in foreground
        if (data?.type === 'kahf' && data?.ayahAudioUrl) {
          try {
            const { sound } = await Audio.Sound.createAsync(
              { uri: String(data.ayahAudioUrl) },
              { shouldPlay: true }
            );
            sound.setOnPlaybackStatusUpdate((status) => {
              if (status.isLoaded && status.didJustFinish) {
                sound.unloadAsync();
              }
            });
          } catch (e) {
            console.warn('Failed to play Kahf ayah audio from notification:', e);
          }
        }
      }
    );

    // User interacted with notification
    responseListener.current = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data;
      
      // Handle deep-link URL from admin notifications
      if (data?.actionUrl && typeof data.actionUrl === 'string') {
        const url = data.actionUrl;
        // Only navigate to internal routes (starts with /)
        if (url.startsWith('/')) {
          router.push(url as any);
          return;
        }
      }

      // Handle navigation based on notification type
      if (data?.type === 'prayer') {
        router.push('/(tabs)/prayer');
      } else if (data?.type === 'azkar') {
        router.push(`/azkar/${data.category}`);
      } else if (data?.type === 'quran') {
        router.push('/(tabs)/quran');
      } else if (data?.type === 'seasonal') {
        router.push('/seasonal');
      } else if (data?.type === 'custom') {
        // Navigate to ayah if custom reminder has surah/ayah data
        if (data?.contentType === 'ayah' && data?.surah && data?.ayah) {
          router.push(`/surah/${data.surah}?ayah=${data.ayah}` as any);
          // Play ayah audio after navigation
          if (data?.ayahAudioUrl) {
            setTimeout(async () => {
              try {
                const { sound } = await Audio.Sound.createAsync(
                  { uri: String(data.ayahAudioUrl) },
                  { shouldPlay: true }
                );
                sound.setOnPlaybackStatusUpdate((status) => {
                  if (status.isLoaded && status.didJustFinish) {
                    sound.unloadAsync();
                  }
                });
              } catch (e) {
                console.warn('Failed to play ayah audio:', e);
              }
            }, 1500);
          }
        } else if (data?.contentType === 'surah' && data?.surah) {
          router.push(`/surah/${data.surah}` as any);
        }
      } else if (data?.type === 'kahf') {
        // Open Surah Al-Kahf in Mushaf reader
        router.push('/surah/18' as any);
        // Play first ayah audio after navigation
        if (data?.ayahAudioUrl) {
          setTimeout(async () => {
            try {
              const { sound } = await Audio.Sound.createAsync(
                { uri: String(data.ayahAudioUrl) },
                { shouldPlay: true }
              );
              sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                  sound.unloadAsync();
                }
              });
            } catch (e) {
              console.warn('Failed to play Kahf ayah audio:', e);
            }
          }, 1500);
        }
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [router]);

  // Enable notifications
  const enableNotifications = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await registerDeviceForPushNotifications();
      
      if (result.success) {
        setIsEnabled(true);
        setFcmToken(result.token || null);
        
        const newSettings = { ...settings, enabled: true };
        setSettings(newSettings);
        await saveNotificationSettings(newSettings);
        
        return true;
      } else {
        setError(result.error || 'Failed to enable notifications');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [settings]);

  // Disable notifications
  const disableNotifications = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      await cancelAllNotifications();
      
      const newSettings = { ...settings, enabled: false };
      setSettings(newSettings);
      await saveNotificationSettings(newSettings);
      
      setIsEnabled(false);
      setScheduledCount(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [settings]);

  // Update settings
  const updateSettings = useCallback(
    async (newSettings: Partial<NotificationSettings>): Promise<void> => {
      try {
        const updated = { ...settings, ...newSettings };
        setSettings(updated);
        await saveNotificationSettings(updated);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    },
    [settings]
  );

  // Refresh token
  const refreshToken = useCallback(async (): Promise<void> => {
    try {
      const result = await registerDeviceForPushNotifications();
      if (result.success && result.token) {
        setFcmToken(result.token);
      }
    } catch (err) {
      console.error('Error refreshing token:', err);
    }
  }, []);

  // Schedule prayer reminders
  const schedulePrayerReminders = useCallback(
    async (
      prayers: Array<{ name: string; time: Date; minutesBefore?: number }>
    ): Promise<void> => {
      if (!settings.prayerReminders) return;
      
      try {
        for (const prayer of prayers) {
          await schedulePrayerNotification(
            prayer.name,
            prayer.time,
            prayer.minutesBefore || 0
          );
        }
        
        const scheduled = await getScheduledNotifications();
        setScheduledCount(scheduled.length);
      } catch (err) {
        console.error('Error scheduling prayer reminders:', err);
      }
    },
    [settings.prayerReminders]
  );

  // Schedule azkar reminders
  const scheduleAzkarReminders = useCallback(
    async (
      reminders: Array<{ type: 'morning' | 'evening' | 'sleep'; time: Date }>
    ): Promise<void> => {
      if (!settings.azkarReminders) return;
      
      try {
        for (const reminder of reminders) {
          await scheduleAzkarReminder(reminder.type, reminder.time);
        }
        
        const scheduled = await getScheduledNotifications();
        setScheduledCount(scheduled.length);
      } catch (err) {
        console.error('Error scheduling azkar reminders:', err);
      }
    },
    [settings.azkarReminders]
  );

  // Clear all scheduled
  const clearAllScheduled = useCallback(async (): Promise<void> => {
    try {
      await cancelAllNotifications();
      setScheduledCount(0);
    } catch (err) {
      console.error('Error clearing notifications:', err);
    }
  }, []);

  const value: NotificationsContextType = {
    isEnabled,
    settings,
    fcmToken,
    isLoading,
    error,
    scheduledCount,
    enableNotifications,
    disableNotifications,
    updateSettings,
    refreshToken,
    schedulePrayerReminders,
    scheduleAzkarReminders,
    clearAllScheduled,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};

// ==================== Hook ====================

export const useNotifications = (): NotificationsContextType => {
  const context = useContext(NotificationsContext);
  
  if (context === undefined) {
    throw new Error(
      'useNotifications must be used within a NotificationsProvider'
    );
  }
  
  return context;
};

export default NotificationsContext;
