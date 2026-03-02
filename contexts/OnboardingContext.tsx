// contexts/OnboardingContext.tsx
// سياق شاشات الترحيب والإعداد الأولي - روح المسلم

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

// ========================================
// الأنواع
// ========================================

export type OnboardingStep = 
  | 'welcome'
  | 'language'
  | 'location'
  | 'notifications'
  | 'complete';

interface UserPreferences {
  language: string;
  locationEnabled: boolean;
  notificationsEnabled: boolean;
  prayerNotifications: boolean;
  azkarNotifications: boolean;
  country?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  calculationMethod?: string;
}

interface OnboardingProgress {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  startedAt: string;
  completedAt?: string;
}

interface OnboardingContextType {
  // الحالة
  isLoading: boolean;
  isOnboardingComplete: boolean;
  currentStep: OnboardingStep;
  progress: OnboardingProgress;
  preferences: UserPreferences;
  
  // التنقل
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  goToStep: (step: OnboardingStep) => void;
  skipOnboarding: () => Promise<void>;
  
  // تحديث التفضيلات
  updatePreferences: (newPrefs: Partial<UserPreferences>) => void;
  
  // إكمال
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
  
  // حالة الخطوات
  isStepCompleted: (step: OnboardingStep) => boolean;
  getStepIndex: (step: OnboardingStep) => number;
  totalSteps: number;
}

// ========================================
// الثوابت
// ========================================

const STORAGE_KEYS = {
  ONBOARDING_COMPLETE: 'onboarding_complete',
  ONBOARDING_PROGRESS: 'onboarding_progress',
  USER_PREFERENCES: 'user_preferences',
};

const STEPS_ORDER: OnboardingStep[] = [
  'welcome',
  'language',
  'location',
  'notifications',
  'complete',
];

const DEFAULT_PREFERENCES: UserPreferences = {
  language: 'ar',
  locationEnabled: false,
  notificationsEnabled: true,
  prayerNotifications: true,
  azkarNotifications: true,
};

const DEFAULT_PROGRESS: OnboardingProgress = {
  currentStep: 'welcome',
  completedSteps: [],
  startedAt: new Date().toISOString(),
};

// ========================================
// السياق
// ========================================

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

// ========================================
// المزود
// ========================================

interface OnboardingProviderProps {
  children: ReactNode;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const router = useRouter();
  
  // الحالة
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [progress, setProgress] = useState<OnboardingProgress>(DEFAULT_PROGRESS);
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);

  // ========================================
  // تحميل البيانات
  // ========================================

  useEffect(() => {
    loadOnboardingState();
  }, []);

  const loadOnboardingState = async () => {
    try {
      setIsLoading(true);

      // التحقق من اكتمال الـ Onboarding
      const completeFlag = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
      if (completeFlag === 'true') {
        setIsOnboardingComplete(true);
        setIsLoading(false);
        return;
      }

      // تحميل التقدم المحفوظ
      const savedProgress = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_PROGRESS);
      if (savedProgress) {
        setProgress(JSON.parse(savedProgress));
      }

      // تحميل التفضيلات المحفوظة
      const savedPrefs = await AsyncStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
      if (savedPrefs) {
        setPreferences({ ...DEFAULT_PREFERENCES, ...JSON.parse(savedPrefs) });
      }
    } catch (error) {
      console.error('Error loading onboarding state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ========================================
  // حفظ البيانات
  // ========================================

  const saveProgress = async (newProgress: OnboardingProgress) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_PROGRESS, JSON.stringify(newProgress));
    } catch (error) {
      console.error('Error saving onboarding progress:', error);
    }
  };

  const savePreferences = async (newPrefs: UserPreferences) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(newPrefs));
    } catch (error) {
      console.error('Error saving user preferences:', error);
    }
  };

  // ========================================
  // التنقل بين الخطوات
  // ========================================

  const goToNextStep = useCallback(() => {
    const currentIndex = STEPS_ORDER.indexOf(progress.currentStep);
    if (currentIndex < STEPS_ORDER.length - 1) {
      const nextStep = STEPS_ORDER[currentIndex + 1];
      const newProgress: OnboardingProgress = {
        ...progress,
        currentStep: nextStep,
        completedSteps: [...new Set([...progress.completedSteps, progress.currentStep])],
      };
      setProgress(newProgress);
      saveProgress(newProgress);
      
      // التنقل للشاشة التالية
      router.push(`/onboarding/${nextStep}`);
    }
  }, [progress, router]);

  const goToPreviousStep = useCallback(() => {
    const currentIndex = STEPS_ORDER.indexOf(progress.currentStep);
    if (currentIndex > 0) {
      const prevStep = STEPS_ORDER[currentIndex - 1];
      const newProgress: OnboardingProgress = {
        ...progress,
        currentStep: prevStep,
      };
      setProgress(newProgress);
      saveProgress(newProgress);
      
      router.push(`/onboarding/${prevStep}`);
    }
  }, [progress, router]);

  const goToStep = useCallback((step: OnboardingStep) => {
    const newProgress: OnboardingProgress = {
      ...progress,
      currentStep: step,
    };
    setProgress(newProgress);
    saveProgress(newProgress);
    
    router.push(`/onboarding/${step}`);
  }, [progress, router]);

  // ========================================
  // تحديث التفضيلات
  // ========================================

  const updatePreferences = useCallback((newPrefs: Partial<UserPreferences>) => {
    const updated = { ...preferences, ...newPrefs };
    setPreferences(updated);
    savePreferences(updated);
  }, [preferences]);

  // ========================================
  // إكمال الـ Onboarding
  // ========================================

  const completeOnboarding = useCallback(async () => {
    try {
      // حفظ حالة الاكتمال
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');
      
      // تحديث التقدم
      const finalProgress: OnboardingProgress = {
        ...progress,
        currentStep: 'complete',
        completedSteps: STEPS_ORDER,
        completedAt: new Date().toISOString(),
      };
      await saveProgress(finalProgress);
      
      // حفظ التفضيلات النهائية
      await savePreferences(preferences);
      
      setIsOnboardingComplete(true);
      
      // التوجيه للصفحة الرئيسية
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  }, [progress, preferences, router]);

  const skipOnboarding = useCallback(async () => {
    try {
      // حفظ التفضيلات الافتراضية
      await savePreferences(DEFAULT_PREFERENCES);
      
      // حفظ حالة الاكتمال
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');
      
      setIsOnboardingComplete(true);
      
      // التوجيه للصفحة الرئيسية
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error skipping onboarding:', error);
    }
  }, [router]);

  const resetOnboarding = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ONBOARDING_COMPLETE,
        STORAGE_KEYS.ONBOARDING_PROGRESS,
        STORAGE_KEYS.USER_PREFERENCES,
      ]);
      
      setIsOnboardingComplete(false);
      setProgress(DEFAULT_PROGRESS);
      setPreferences(DEFAULT_PREFERENCES);
      
      router.replace('/onboarding/welcome');
    } catch (error) {
      console.error('Error resetting onboarding:', error);
    }
  }, [router]);

  // ========================================
  // دوال مساعدة
  // ========================================

  const isStepCompleted = useCallback((step: OnboardingStep): boolean => {
    return progress.completedSteps.includes(step);
  }, [progress.completedSteps]);

  const getStepIndex = useCallback((step: OnboardingStep): number => {
    return STEPS_ORDER.indexOf(step);
  }, []);

  // ========================================
  // القيمة
  // ========================================

  const value: OnboardingContextType = {
    isLoading,
    isOnboardingComplete,
    currentStep: progress.currentStep,
    progress,
    preferences,
    goToNextStep,
    goToPreviousStep,
    goToStep,
    skipOnboarding,
    updatePreferences,
    completeOnboarding,
    resetOnboarding,
    isStepCompleted,
    getStepIndex,
    totalSteps: STEPS_ORDER.length,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

// ========================================
// الـ Hooks
// ========================================

export const useOnboarding = (): OnboardingContextType => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

export const useOnboardingNavigation = () => {
  const { goToNextStep, goToPreviousStep, goToStep, skipOnboarding } = useOnboarding();
  return { goToNextStep, goToPreviousStep, goToStep, skipOnboarding };
};

export const useOnboardingPreferences = () => {
  const { preferences, updatePreferences } = useOnboarding();
  return { preferences, updatePreferences };
};

export const useOnboardingProgress = () => {
  const { progress, currentStep, isStepCompleted, getStepIndex, totalSteps } = useOnboarding();
  return { progress, currentStep, isStepCompleted, getStepIndex, totalSteps };
};

export default OnboardingContext;
