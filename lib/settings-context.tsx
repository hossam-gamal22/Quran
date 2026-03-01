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
    let mounted = true;
    
    async function loadSettings() {
      try {
        const timeoutPromise = new Promise<AppSettings>(resolve => 
          setTimeout(() => resolve(DEFAULT_SETTINGS), 3000)
        );
        const settingsPromise = getSettings();
        
        const s = await Promise.race([settingsPromise, timeoutPromise]);
        
        if (mounted) {
          setSettings(s);
        }
      } catch (e) {
        if (mounted) {
          setSettings(DEFAULT_SETTINGS);
        }
      } finally {
        if (mounted) {
          setIsLoaded(true);
        }
      }
    }
    
    loadSettings();
    
    return () => { mounted = false; };
  }, []);

  const updateSettings = async (updates: Partial<AppSettings>) => {
    const updated = { ...settings, ...updates };
    setSettings(updated);
    try {
      await saveSettings(updates);
    } catch (e) {
      // Ignore save errors
    }
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
//change