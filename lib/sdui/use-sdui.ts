// lib/sdui/use-sdui.ts
// SDUI React Hook — خطاف SDUI

import { useState, useEffect, useCallback, useRef } from 'react';
import type { SDUIScreenConfig, SDUISection } from './types';
import {
  fetchSDUIScreenConfig,
  subscribeToSDUIScreen,
  fetchAllSDUIConfigs,
  subscribeToAllSDUIScreens,
} from '../app-config-api';

// ═══════════════════════════════════════════════════════════════════════════
// Single Screen Hook
// ═══════════════════════════════════════════════════════════════════════════

export interface UseSDUIScreenResult {
  /** Screen configuration */
  config: SDUIScreenConfig | null;
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: Error | null;
  /** Manually refresh the config */
  refresh: () => Promise<void>;
  /** Whether the config exists in Firebase */
  exists: boolean;
}

/**
 * Hook to fetch and subscribe to SDUI configuration for a single screen.
 * 
 * @param screenId - The screen identifier (e.g., 'home', 'azkar')
 * @param options - Hook options
 * @returns UseSDUIScreenResult
 * 
 * @example
 * ```tsx
 * const { config, loading, error } = useSDUIScreen('home');
 * 
 * if (loading) return <LoadingSpinner />;
 * if (!config) return <DefaultHomeScreen />;
 * 
 * return <DynamicScreen config={config} />;
 * ```
 */
export function useSDUIScreen(
  screenId: string,
  options: {
    /** Enable real-time updates */
    realtime?: boolean;
    /** Skip initial fetch */
    skip?: boolean;
  } = {}
): UseSDUIScreenResult {
  const { realtime = true, skip = false } = options;
  
  const [config, setConfig] = useState<SDUIScreenConfig | null>(null);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState<Error | null>(null);
  
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Initial fetch
  const fetchConfig = useCallback(async () => {
    if (skip) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchSDUIScreenConfig(screenId);
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch SDUI config'));
    } finally {
      setLoading(false);
    }
  }, [screenId, skip]);

  // Manual refresh
  const refresh = useCallback(async () => {
    await fetchConfig();
  }, [fetchConfig]);

  // Initial fetch
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Real-time subscription
  useEffect(() => {
    if (!realtime || skip) return;

    unsubscribeRef.current = subscribeToSDUIScreen(
      screenId,
      (newConfig) => {
        setConfig(newConfig);
        setError(null);
      },
      (err) => {
        setError(err);
      }
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [screenId, realtime, skip]);

  return {
    config,
    loading,
    error,
    refresh,
    exists: config !== null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// All Screens Hook
// ═══════════════════════════════════════════════════════════════════════════

export interface UseAllSDUIScreensResult {
  /** All screen configurations */
  configs: Record<string, SDUIScreenConfig>;
  /** Get config for a specific screen */
  getScreenConfig: (screenId: string) => SDUIScreenConfig | undefined;
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: Error | null;
  /** Manually refresh all configs */
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch and subscribe to all SDUI screen configurations.
 * 
 * @param options - Hook options
 * @returns UseAllSDUIScreensResult
 */
export function useAllSDUIScreens(
  options: {
    /** Enable real-time updates */
    realtime?: boolean;
    /** Skip initial fetch */
    skip?: boolean;
  } = {}
): UseAllSDUIScreensResult {
  const { realtime = true, skip = false } = options;
  
  const [configs, setConfigs] = useState<Record<string, SDUIScreenConfig>>({});
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState<Error | null>(null);
  
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Initial fetch
  const fetchConfigs = useCallback(async () => {
    if (skip) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchAllSDUIConfigs();
      setConfigs(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch all SDUI configs'));
    } finally {
      setLoading(false);
    }
  }, [skip]);

  // Manual refresh
  const refresh = useCallback(async () => {
    await fetchConfigs();
  }, [fetchConfigs]);

  // Get config for a specific screen
  const getScreenConfig = useCallback(
    (screenId: string) => configs[screenId],
    [configs]
  );

  // Initial fetch
  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  // Real-time subscription
  useEffect(() => {
    if (!realtime || skip) return;

    unsubscribeRef.current = subscribeToAllSDUIScreens(
      (newConfigs) => {
        setConfigs(newConfigs);
        setError(null);
      },
      (err) => {
        setError(err);
      }
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [realtime, skip]);

  return {
    configs,
    getScreenConfig,
    loading,
    error,
    refresh,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Section-Level Helpers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get a specific section from a screen config.
 */
export function getSection<T extends SDUISection>(
  config: SDUIScreenConfig | null,
  sectionId: string
): T | undefined {
  if (!config?.sections) return undefined;
  return config.sections.find(s => s.id === sectionId) as T | undefined;
}

/**
 * Get sections by type from a screen config.
 */
export function getSectionsByType<T extends SDUISection>(
  config: SDUIScreenConfig | null,
  type: T['type']
): T[] {
  if (!config?.sections) return [];
  return config.sections.filter(s => s.type === type) as T[];
}

/**
 * Check if a section is enabled.
 */
export function isSectionEnabled(
  config: SDUIScreenConfig | null,
  sectionId: string
): boolean {
  const section = getSection(config, sectionId);
  return section?.enabled ?? false;
}

export default useSDUIScreen;
