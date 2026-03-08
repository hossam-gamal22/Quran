// lib/app-config-context.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { getAppConfig, subscribeToAppConfig, RemoteAppConfig } from './app-config-api';

interface AppConfigContextType {
  config: RemoteAppConfig;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const DEFAULT_CONFIG: RemoteAppConfig = {
  name: 'رُوح المسلم',
  nameEn: 'Rooh Al-Muslim',
  description: 'تطبيق إسلامي شامل للقرآن والأذكار والصلاة',
  version: '1.0.0',
  primaryColor: '#1B4332',
  maintenanceMode: false,
  forceUpdate: false,
  minVersion: '1.0.0',
  contact: { email: 'hossamgamal290@gmail.com', website: '' },
  downloadLinks: { android: '', ios: '' },
  features: {
    quran: true, azkar: true, prayer: true, qibla: true,
    tasbih: true, names: true, ruqyah: true, hijri: true,
  },
  uiCustomization: {
    tabBarItems: [
      { key: 'settings', labelAr: 'الإعدادات', labelEn: 'Settings', icon: { mode: 'sf', name: 'gearshape', selectedName: 'gearshape.fill' } },
      { key: 'prayer', labelAr: 'الصلاة', labelEn: 'Prayer', icon: { mode: 'sf', name: 'building.columns', selectedName: 'building.columns.fill' } },
      { key: 'tasbih', labelAr: 'تسبيح', labelEn: 'Tasbih', icon: { mode: 'sf', name: 'hand.raised', selectedName: 'hand.raised.fill' } },
      { key: 'quran', labelAr: 'القرآن', labelEn: 'Quran', icon: { mode: 'sf', name: 'book', selectedName: 'book.fill' } },
      { key: 'index', labelAr: 'الرئيسية', labelEn: 'Home', icon: { mode: 'sf', name: 'house', selectedName: 'house.fill' } },
    ],
    quranSegments: [
      { key: 'surahs', labelAr: 'السور', labelEn: 'Surahs', icon: { mode: 'material', name: 'book-open-variant' } },
      { key: 'juz', labelAr: 'الأجزاء', labelEn: 'Juz', icon: { mode: 'material', name: 'bookshelf' } },
      { key: 'listen', labelAr: 'استماع', labelEn: 'Listen', icon: { mode: 'material', name: 'headphones' } },
    ],
    prayerTopSegments: [
      { key: 'prayer', labelAr: 'الصلاة', labelEn: 'Prayer', icon: { mode: 'material', name: 'clock-time-four-outline' } },
      { key: 'qibla', labelAr: 'القبلة', labelEn: 'Qibla', icon: { mode: 'material', name: 'compass' } },
    ],
    // Removed default prayer view segments (list / clock) — configurable remotely
    prayerViewSegments: [],
    tabBarLayout: {
      labelFontSize: 12,
      titleVerticalOffset: 4,
      selectedBgOpacity: 0.16,
    },
  },
};

const AppConfigContext = createContext<AppConfigContextType | undefined>(undefined);

export const AppConfigProvider = ({ children }: { children: ReactNode }) => {
  const [config, setConfig] = useState<RemoteAppConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const remoteConfig = await getAppConfig();
      setConfig(remoteConfig);
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Load initial config
    loadConfig();
    
    // Subscribe to real-time updates
    unsubscribeRef.current = subscribeToAppConfig(
      (updatedConfig) => {
        setConfig(updatedConfig);
        setIsLoading(false);
      },
      (error) => {
        console.error('Real-time config subscription error:', error);
      }
    );
    
    // Cleanup subscription on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  return (
    <AppConfigContext.Provider value={{ config, isLoading, refresh: loadConfig }}>
      {children}
    </AppConfigContext.Provider>
  );
};

export const useAppConfig = () => {
  const context = useContext(AppConfigContext);
  if (!context) {
    throw new Error('useAppConfig must be used within AppConfigProvider');
  }
  return context;
};
