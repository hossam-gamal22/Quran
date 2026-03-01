// lib/ads-context.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Platform } from 'react-native';
import { fetchAdsConfig, AdsConfig } from './ads-config';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AdsContextType {
  config: AdsConfig | null;
  isLoading: boolean;
  showBanner: boolean;
  canShowInterstitial: () => boolean;
  onPageView: () => void;
  recordInterstitialShown: () => void;
  refresh: () => Promise<void>;
}

const AdsContext = createContext<AdsContextType | undefined>(undefined);

export const AdsProvider = ({ children }: { children: ReactNode }) => {
  const [config, setConfig] = useState<AdsConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageViews, setPageViews] = useState(0);
  const [sessionAdsShown, setSessionAdsShown] = useState(0);
  const [lastAdTime, setLastAdTime] = useState<number>(Date.now());
  const [appStartTime] = useState<number>(Date.now());

  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const adsConfig = await fetchAdsConfig();
      setConfig(adsConfig);
    } catch (error) {
      console.error('Error loading ads config:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // تسجيل مشاهدة صفحة
  const onPageView = useCallback(() => {
    setPageViews(prev => prev + 1);
  }, []);

  // تسجيل عرض إعلان
  const recordInterstitialShown = useCallback(() => {
    setSessionAdsShown(prev => prev + 1);
    setLastAdTime(Date.now());
  }, []);

  // التحقق من إمكانية عرض إعلان
  const canShowInterstitial = useCallback((): boolean => {
    if (!config || !config.enabled) return false;
    
    // التحقق من تأخير أول إعلان
    if (config.delayFirstAd) {
      const secondsSinceStart = (Date.now() - appStartTime) / 1000;
      if (secondsSinceStart < config.firstAdDelay) {
        return false;
      }
    }

    // حسب نوع التكرار
    switch (config.interstitialMode) {
      case 'pages':
        return pageViews > 0 && pageViews % config.interstitialFrequency === 0;
      
      case 'time':
        const minutesSinceLastAd = (Date.now() - lastAdTime) / 60000;
        return minutesSinceLastAd >= config.interstitialTimeInterval;
      
      case 'session':
        return sessionAdsShown < config.interstitialSessionLimit;
      
      default:
        return false;
    }
  }, [config, pageViews, lastAdTime, sessionAdsShown, appStartTime]);

  // هل نعرض البانر
  const showBanner = config?.enabled ?? false;

  return (
    <AdsContext.Provider value={{
      config,
      isLoading,
      showBanner,
      canShowInterstitial,
      onPageView,
      recordInterstitialShown,
      refresh: loadConfig,
    }}>
      {children}
    </AdsContext.Provider>
  );
};

export const useAds = () => {
  const context = useContext(AdsContext);
  if (!context) {
    throw new Error('useAds must be used within AdsProvider');
  }
  return context;
};
