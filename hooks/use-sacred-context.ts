// hooks/use-sacred-context.ts
// Hook to automatically enter/exit a sacred ad-blocking context when a screen is focused

import { useEffect } from 'react';
import {
  enterSacredContext,
  exitSacredContext,
  type SacredContext,
} from '@/lib/smart-ad-manager';

/**
 * Blocks all ads while this component is mounted.
 * Use in screens where ads would be disrespectful or disruptive:
 * - Quran reading
 * - Tasbih counting
 * - Azkar reading
 * - Dua pages
 * - Prayer times (active prayer window)
 */
export function useSacredContext(context: SacredContext): void {
  useEffect(() => {
    enterSacredContext(context);
    return () => exitSacredContext(context);
  }, [context]);
}
