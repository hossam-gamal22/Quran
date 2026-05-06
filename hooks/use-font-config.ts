// hooks/use-font-config.ts
// B9: Reads admin-managed font settings (`appConfig/fontSettings`) with 24h cache.
// Returns the same DEFAULT_FONT_SETTINGS until the hydration promise resolves
// so first paint is never blocked by network.

import { useEffect, useState } from 'react';
import { fetchFontSettings, DEFAULT_FONT_SETTINGS, type AdminFontSettings } from '@/lib/admin-data-api';

let _cached: AdminFontSettings | null = null;
let _inflight: Promise<AdminFontSettings> | null = null;

export function getFontSettingsSync(): AdminFontSettings {
  return _cached || DEFAULT_FONT_SETTINGS;
}

/** Kicks off a single shared fetch; safe to call from multiple places. */
export async function hydrateFontSettings(): Promise<AdminFontSettings> {
  if (_cached) return _cached;
  if (_inflight) return _inflight;
  _inflight = fetchFontSettings()
    .then(s => {
      _cached = s;
      return s;
    })
    .catch(() => DEFAULT_FONT_SETTINGS)
    .finally(() => { _inflight = null; });
  return _inflight;
}

export function useFontConfig(): AdminFontSettings {
  const [settings, setSettings] = useState<AdminFontSettings>(_cached || DEFAULT_FONT_SETTINGS);

  useEffect(() => {
    let cancelled = false;
    hydrateFontSettings().then(s => {
      if (!cancelled) setSettings(s);
    });
    return () => { cancelled = true; };
  }, []);

  return settings;
}
