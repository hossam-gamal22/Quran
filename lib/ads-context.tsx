// lib/ads-context.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { fetchAdsConfig, AdsConfig, AdScreenKey, AdSlot, isBannerEnabledForScreen, getAdUnitId, getSlotAdUnitId, getSlotType, getSlotsForScreen } from './ads-config';
import { getSubscriptionState } from './subscription-manager';

interface AdsContextType {
  config: AdsConfig | null;
  isLoading: boolean;
  isBannerVisible: (screen: AdScreenKey) => boolean;
  getBannerAdUnitId: () => string;
  getInterstitialAdUnitId: () => string;
  getAppOpenAdUnitId: () => string;
  canShowInterstitial: () => boolean;
  onPageView: () => void;
  recordInterstitialShown: () => void;
  refresh: () => Promise<void>;
  isPremiumUser: boolean;
  // Slot-based API
  getSlotUnitId: (slotKey: string) => string;
  isSlotEnabled: (slotKey: string) => boolean;
  getSlotAdType: (slotKey: string) => 'banner' | 'interstitial' | null;
  // Screen-based dynamic slots
  getScreenSlots: (screen: string, position?: 'top' | 'bottom') => { key: string; slot: AdSlot }[];
}

const AdsContext = createContext<AdsContextType | undefined>(undefined);

export const AdsProvider = ({ children }: { children: ReactNode }) => {
  const [config, setConfig] = useState<AdsConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [pageViews, setPageViews] = useState(0);
  const [sessionAdsShown, setSessionAdsShown] = useState(0);
  const [lastAdTime, setLastAdTime] = useState<number>(Date.now());
  const [appStartTime] = useState<number>(Date.now());

  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const [adsConfig, subState] = await Promise.all([
        fetchAdsConfig(),
        getSubscriptionState(),
      ]);
      setConfig(adsConfig);
      setIsPremiumUser(subState.isPremium);
    } catch (error) {
      console.error('Error loading ads config:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const onPageView = useCallback(() => {
    setPageViews(prev => prev + 1);
  }, []);

  const recordInterstitialShown = useCallback(() => {
    setSessionAdsShown(prev => prev + 1);
    setLastAdTime(Date.now());
  }, []);

  const isBannerVisible = useCallback((screen: AdScreenKey): boolean => {
    if (isPremiumUser) return false;
    if (!config) return false;
    return isBannerEnabledForScreen(config, screen);
  }, [config, isPremiumUser]);

  const getBannerAdUnitId = useCallback((): string => {
    return getAdUnitId('BANNER', config);
  }, [config]);

  const getInterstitialAdUnitId = useCallback((): string => {
    return getAdUnitId('INTERSTITIAL', config);
  }, [config]);

  const getAppOpenAdUnitId = useCallback((): string => {
    return getAdUnitId('APP_OPEN', config);
  }, [config]);

  const canShowInterstitial = useCallback((): boolean => {
    if (isPremiumUser) return false;
    if (!config || !config.enabled) return false;

    if (config.delayFirstAd) {
      const secondsSinceStart = (Date.now() - appStartTime) / 1000;
      if (secondsSinceStart < config.firstAdDelay) {
        return false;
      }
    }

    switch (config.interstitialMode) {
      case 'pages':
        return pageViews > 0 && pageViews % config.interstitialFrequency === 0;
      case 'time': {
        const minutesSinceLastAd = (Date.now() - lastAdTime) / 60000;
        return minutesSinceLastAd >= config.interstitialTimeInterval;
      }
      case 'session':
        return sessionAdsShown < config.interstitialSessionLimit;
      default:
        return false;
    }
  }, [config, isPremiumUser, pageViews, lastAdTime, sessionAdsShown, appStartTime]);

  // Slot-based API
  const getSlotUnitId = useCallback((slotKey: string): string => {
    if (isPremiumUser) return '';
    return getSlotAdUnitId(config, slotKey);
  }, [config, isPremiumUser]);

  const isSlotEnabled = useCallback((slotKey: string): boolean => {
    if (isPremiumUser) return false;
    if (!config?.enabled) return false;
    const slot = config.adSlots?.[slotKey];
    return !!slot?.enabled;
  }, [config, isPremiumUser]);

  const getSlotAdType = useCallback((slotKey: string): 'banner' | 'interstitial' | null => {
    return getSlotType(config, slotKey);
  }, [config]);

  const getScreenSlots = useCallback((screen: string, position?: 'top' | 'bottom') => {
    if (isPremiumUser) return [];
    return getSlotsForScreen(config, screen, position);
  }, [config, isPremiumUser]);

  return (
    <AdsContext.Provider value={{
      config,
      isLoading,
      isBannerVisible,
      getBannerAdUnitId,
      getInterstitialAdUnitId,
      getAppOpenAdUnitId,
      canShowInterstitial,
      onPageView,
      recordInterstitialShown,
      refresh: loadConfig,
      isPremiumUser,
      getSlotUnitId,
      isSlotEnabled,
      getSlotAdType,
      getScreenSlots,
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
