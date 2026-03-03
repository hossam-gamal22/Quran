// contexts/RemoteConfigContext.tsx
import React, { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  useCallback,
  ReactNode 
} from 'react';
import { 
  initRemoteConfig, 
  getAllConfig, 
  checkAppVersion,
  checkMaintenanceMode,
  AppConfig,
  DEFAULT_CONFIG 
} from '@/lib/remote-config';
import Constants from 'expo-constants';

// ==================== Types ====================

interface RemoteConfigState {
  config: AppConfig;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  lastFetched: Date | null;
}

interface RemoteConfigContextType extends RemoteConfigState {
  refreshConfig: () => Promise<void>;
  getConfig: <K extends keyof AppConfig>(key: K) => AppConfig[K];
  checkForUpdate: () => { needsUpdate: boolean; forceUpdate: boolean; message?: string };
  checkMaintenance: () => { isInMaintenance: boolean; message: string };
}

// ==================== Context ====================

const RemoteConfigContext = createContext<RemoteConfigContextType | undefined>(undefined);

// ==================== Provider ====================

interface RemoteConfigProviderProps {
  children: ReactNode;
}

export const RemoteConfigProvider: React.FC<RemoteConfigProviderProps> = ({ children }) => {
  const [state, setState] = useState<RemoteConfigState>({
    config: DEFAULT_CONFIG,
    isLoading: true,
    isInitialized: false,
    error: null,
    lastFetched: null,
  });

  // Initialize Remote Config
  const initConfig = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      await initRemoteConfig();
      const config = getAllConfig();
      
      setState({
        config,
        isLoading: false,
        isInitialized: true,
        error: null,
        lastFetched: new Date(),
      });
    } catch (error) {
      console.error('RemoteConfigContext: Error initializing', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        isInitialized: true,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, []);

  // Refresh Config
  const refreshConfig = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      await initRemoteConfig();
      const config = getAllConfig();
      
      setState(prev => ({
        ...prev,
        config,
        isLoading: false,
        lastFetched: new Date(),
        error: null,
      }));
    } catch (error) {
      console.error('RemoteConfigContext: Error refreshing', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, []);

  // Get specific config value
  const getConfig = useCallback(<K extends keyof AppConfig>(key: K): AppConfig[K] => {
    return state.config[key];
  }, [state.config]);

  // Check for app update
  const checkForUpdate = useCallback(() => {
    const currentVersion = Constants.expoConfig?.version || '1.0.0';
    return checkAppVersion(currentVersion);
  }, []);

  // Check maintenance mode
  const checkMaintenance = useCallback(() => {
    return checkMaintenanceMode();
  }, []);

  // Initialize on mount
  useEffect(() => {
    initConfig();
  }, [initConfig]);

  const value: RemoteConfigContextType = {
    ...state,
    refreshConfig,
    getConfig,
    checkForUpdate,
    checkMaintenance,
  };

  return (
    <RemoteConfigContext.Provider value={value}>
      {children}
    </RemoteConfigContext.Provider>
  );
};

// ==================== Hook ====================

export const useRemoteConfig = (): RemoteConfigContextType => {
  const context = useContext(RemoteConfigContext);
  
  if (context === undefined) {
    throw new Error('useRemoteConfig must be used within a RemoteConfigProvider');
  }
  
  return context;
};

// ==================== Utility Hooks ====================

export const useFeatureFlag = (feature: keyof Pick<
  AppConfig, 
  'ads_enabled' | 'premium_enabled' | 'notifications_enabled' | 'daily_ayah_enabled' | 'seasonal_content_enabled'
>): boolean => {
  const { config } = useRemoteConfig();
  return config[feature];
};

export const useAppConfig = <K extends keyof AppConfig>(key: K): AppConfig[K] => {
  const { config } = useRemoteConfig();
  return config[key];
};

export default RemoteConfigContext;
