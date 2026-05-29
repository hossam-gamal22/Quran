// contexts/ThemeConfigContext.tsx
// سياق ألوان الثيم من الأدمن — يقرأ من Firestore ويوفر overrides للألوان

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { shouldRefetchContent, markContentFetched } from '@/lib/content-manifest';

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

interface SeasonalThemeConfig {
  id: string;
  name?: string;
  nameAr?: string;
  season?: string;
  startDate: string;
  endDate: string;
  colors?: Partial<ThemeColors>;
  isActive?: boolean;
}

interface ThemeConfigData {
  light?: ThemeColors;
  dark?: ThemeColors;
  seasonalThemes?: SeasonalThemeConfig[];
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

    // Manifest-gated one-shot read — skips Firestore entirely when the admin
    // hasn't bumped 'themeConfig' since the last fetch (24h safety TTL).
    let cancelled = false;
    (async () => {
      try {
        if (!(await shouldRefetchContent('themeConfig'))) return;
        const snap = await getDoc(doc(db, 'appConfig', 'themeConfig'));
        await markContentFetched('themeConfig');
        if (cancelled || !snap.exists()) return;
        const data = snap.data() as ThemeConfigData;
        setThemeConfig(data);
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data)).catch(() => {});
      } catch {
        // Firestore error — keep showing cached data
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return (
    <ThemeConfigContext.Provider value={{ themeConfig, isLoaded }}>
      {children}
    </ThemeConfigContext.Provider>
  );
};
