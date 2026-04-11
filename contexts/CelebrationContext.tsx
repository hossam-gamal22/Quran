// contexts/CelebrationContext.tsx
// نظام الاحتفالات — عرض أنيميشن Lottie عند إنجازات المستخدم

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CelebrationModal } from '@/components/ui/CelebrationModal';
import { showInterstitial } from '@/components/ads/InterstitialAdManager';

export type CelebrationType = 'adhkar_complete' | 'rank_up' | 'monthly_winner' | 'quran_pages' | 'khatma_wird';

export interface CelebrationData {
  type: CelebrationType;
  title: string;
  subtitle?: string;
  onDismiss?: () => void;
}

interface CelebrationContextValue {
  showCelebration: (data: CelebrationData) => void;
  dismissCelebration: () => void;
}

const CelebrationContext = createContext<CelebrationContextValue>({
  showCelebration: () => {},
  dismissCelebration: () => {},
});

export const useCelebration = () => useContext(CelebrationContext);

export function CelebrationProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [data, setData] = useState<CelebrationData | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDismissRef = useRef<(() => void) | undefined>(undefined);

  const dismissCelebration = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisible(false);
    // Show ad then call onDismiss after modal fade-out
    const cb = onDismissRef.current;
    onDismissRef.current = undefined;
    setTimeout(async () => {
      try { await showInterstitial(); } catch {}
      if (cb) cb();
    }, 300);
  }, []);

  const showCelebration = useCallback((celebrationData: CelebrationData) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    onDismissRef.current = celebrationData.onDismiss;
    setData(celebrationData);
    setVisible(true);

    // Auto-dismiss after 5 seconds
    timerRef.current = setTimeout(() => {
      setVisible(false);
      const cb = onDismissRef.current;
      onDismissRef.current = undefined;
      setTimeout(async () => {
        try { await showInterstitial(); } catch {}
        if (cb) cb();
      }, 300);
    }, 5000);
  }, []);

  return (
    <CelebrationContext.Provider value={{ showCelebration, dismissCelebration }}>
      {children}
      <CelebrationModal
        visible={visible}
        type={data?.type || 'adhkar_complete'}
        title={data?.title || ''}
        subtitle={data?.subtitle}
        onDismiss={dismissCelebration}
      />
    </CelebrationContext.Provider>
  );
}
