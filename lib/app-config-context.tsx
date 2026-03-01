// lib/app-config-context.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getAppConfig, RemoteAppConfig } from './app-config-api';
import { APP_CONFIG } from '../constants/app';

interface AppConfigContextType {
  config: typeof APP_CONFIG;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const AppConfigContext = createContext<AppConfigContextType | undefined>(undefined);

export const AppConfigProvider = ({ children }: { children: ReactNode }) => {
  const [config, setConfig] = useState(APP_CONFIG);
  const [isLoading, setIsLoading] = useState(true);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const remoteConfig = await getAppConfig();
      setConfig({
        ...APP_CONFIG,
        ...remoteConfig,
      });
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
