import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppSettings, getSettings, saveSettings } from './storage';

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  isLoaded: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'auto',
  fontSize: 24,
  translationEdition: 'en.sahih',
  reciter: 'ar.alafasy',
  showTranslation: true,
  calculationMethod: 4,
  language: 'ar',
  showAyahNumbers: true,
  continuousPlay: false,
};

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_SETTINGS,
  updateSettings: async () => {},
  isLoaded: false,
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    getSettings().then(s => {
      setSettings(s);
      setIsLoaded(true);
    });
  }, []);

  const updateSettings = async (updates: Partial<AppSettings>) => {
    const updated = { ...settings, ...updates };
    setSettings(updated);
    await saveSettings(updates);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isLoaded }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
