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
import { db } from '@/lib/firebase-config';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { getAyahSoundUri } from '@/lib/notification-sound-cache';
import { handleNotificationNavigation } from '@/lib/notification-router';
import { handleDidYouPrayResponse } from '@/lib/did-you-pray-handler';
import { recordTelemetryEvent } from '@/lib/notification-telemetry';
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
    // Clean up any existing listeners before creating new ones
    notificationListener.current?.remove();
    responseListener.current?.remove();

    // Helper: safely play audio and clean up
    const playAndCleanup = async (uri: string, label: string) => {
      let soundObj: Audio.Sound | null = null;
      try {
        if (!uri) return;
        const { sound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true }
        );
        soundObj = sound;
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            sound.unloadAsync().catch(() => {});
          }
        });
      } catch (e) {
        console.warn(`Failed to play ${label} audio:`, e);
        // Clean up on error to prevent memory leak
        if (soundObj) {
          try { await soundObj.unloadAsync(); } catch {}
        }
      }
    };

    // Notification received while app is foregrounded
    notificationListener.current = addNotificationReceivedListener(
      async (notification) => {
        console.log('Notification received:', notification);
        const data = notification.request.content.data;
        const notifId = notification.request.identifier;
        // Phase 9: telemetry — record received event
        recordTelemetryEvent('received', notifId, {
          prayer: typeof data?.prayer === 'string' ? data.prayer : undefined,
        }).catch(() => {});
        // Play ayah audio when custom reminder with ayah content arrives in foreground
        if (data?.type === 'custom' && data?.contentType === 'ayah') {
          try {
            let audioUri = String(data.ayahAudioUrl || '');
            if (data.surah && data.ayah && data.reciter) {
              const cached = await getAyahSoundUri(
                Number(data.surah),
                Number(data.ayah),
                String(data.reciter)
              );
              audioUri = cached.uri;
              console.log(`📱 Playing ayah from ${cached.isLocal ? 'cache' : 'network'}: ${audioUri}`);
            }
            await playAndCleanup(audioUri, 'ayah notification');
          } catch (e) {
            console.warn('Failed to play ayah audio from notification:', e);
          }
        }
        // Play first ayah audio when Kahf Friday reminder arrives in foreground
        if (data?.type === 'kahf' && data?.ayahAudioUrl) {
          await playAndCleanup(String(data.ayahAudioUrl), 'Kahf ayah');
        }
      }
    );

    // User interacted with notification
    responseListener.current = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data;
      const notifId = response.notification.request.identifier;
      const actionId = response.actionIdentifier;

      // Phase 9: telemetry — سجّل opened أو action
      const isAction = actionId && actionId !== 'default' && actionId !== 'expo.modules.notifications.actions.DEFAULT';
      recordTelemetryEvent(isAction ? 'action' : 'opened', notifId, {
        action: isAction ? actionId : undefined,
        prayer: typeof data?.prayer === 'string' ? data.prayer : undefined,
      }).catch(() => {});

      // Phase 6: ينتظر النتيجة فعلياً قبل الـ navigation
      // قبل: كان يستدعي then() async ثم يكمل بـ navigation فوراً ⇒ race condition
      //      المستخدم يضغط "نعم صليت" → التطبيق يفتح صفحة الصلاة بالخطأ
      handleDidYouPrayResponse(response)
        .then((consumed) => {
          if (consumed) return; // الـ action تمّ معالجته — لا navigation

          // تتبّع فتح الإشعار في Firestore
          if (data?.notificationDocId) {
            updateDoc(doc(db, 'notifications', data.notificationDocId as string), {
              openedCount: increment(1),
            }).catch(() => {});
          }

          // Skip navigation لو ضغط زر action على did_you_pray (الـ default tap فقط يُفتح)
          if (data?.type === 'did_you_pray' && response.actionIdentifier !== 'default') {
            return;
          }

          const result = handleNotificationNavigation(data, router, notifId);

          // Play audio after navigation transition (e.g. Kahf ayah, custom ayah)
          if (result.audioUrl) {
            setTimeout(() => {
              playAndCleanup(result.audioUrl!, result.audioLabel || 'notification tap');
            }, 1500);
          }
        })
        .catch((e) => {
          console.warn('[notifications] response handler failed:', e);
        });
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
