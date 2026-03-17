// hooks/use-feature-enabled.ts
// Convenience hook to check if a feature is enabled via remote config
import { useAppConfig } from '@/lib/app-config-context';

type FeatureKey = 'quran' | 'azkar' | 'prayer' | 'qibla' | 'tasbih' | 'names' | 'ruqyah' | 'hijri';

export function useFeatureEnabled(feature: FeatureKey): boolean {
  const { config } = useAppConfig();
  return config.features?.[feature] !== false; // default to enabled
}

export function useFeatures(): Record<FeatureKey, boolean> {
  const { config } = useAppConfig();
  const f = config.features ?? {};
  return {
    quran: f.quran !== false,
    azkar: f.azkar !== false,
    prayer: f.prayer !== false,
    qibla: f.qibla !== false,
    tasbih: f.tasbih !== false,
    names: f.names !== false,
    ruqyah: f.ruqyah !== false,
    hijri: f.hijri !== false,
  };
}
