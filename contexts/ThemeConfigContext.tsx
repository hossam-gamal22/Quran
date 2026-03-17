// contexts/ThemeConfigContext.tsx
// سياق ألوان الثيم من الأدمن — يقرأ من Firestore ويوفر overrides للألوان

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';

const CACHE_KEY = '@theme_config';

interface ThemeColors {
  primary?: string;
  primaryLight?: string;
  primaryDark?: string;
  secondary?: string;
  background?: string;
  surface?: string;
  text?: string;
  textLight?: string;
  border?: string;
  glass?: string;
  accent?: string;
  success?: string;
  error?: string;
  warning?: string;
  gold?: string;
  card?: string;
  tabBarActive?: string;
  tabBarInactive?: string;
  tabBarBackground?: string;
}

interface ThemeConfigData {
  light?: ThemeColors;
  dark?: ThemeColors;
  updatedAt?: string;
  version?: number;
}

interface ThemeConfigContextType {
  themeConfig: ThemeConfigData | null;
  isLoaded: boolean;
}

const ThemeConfigContext = createContext<ThemeConfigContextType>({
  themeConfig: null,
  isLoaded: false,
});

export const useThemeConfig = () => useContext(ThemeConfigContext);

export const ThemeConfigProvider = ({ children }: { children: ReactNode }) => {
  const [themeConfig, setThemeConfig] = useState<ThemeConfigData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load cached first
    AsyncStorage.getItem(CACHE_KEY).then(cached => {
      if (cached) {
        try {
          setThemeConfig(JSON.parse(cached));
        } catch {}
      }
      setIsLoaded(true);
    }).catch(() => setIsLoaded(true));

    // Subscribe to Firestore for live updates
    const unsubscribe = onSnapshot(
      doc(db, 'appConfig', 'themeConfig'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as ThemeConfigData;
          setThemeConfig(data);
          AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data)).catch(() => {});
        }
      },
      () => {
        // Firestore error — use cached data
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <ThemeConfigContext.Provider value={{ themeConfig, isLoaded }}>
      {children}
    </ThemeConfigContext.Provider>
  );
};
