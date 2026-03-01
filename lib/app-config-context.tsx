// lib/app-config-context.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getAppConfig, RemoteAppConfig } from './app-config-api';

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
};

const AppConfigContext = createContext<AppConfigContextType | undefined>(undefined);

export const AppConfigProvider = ({ children }: { children: ReactNode }) => {
  const [config, setConfig] = useState<RemoteAppConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);

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
    loadConfig();
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
