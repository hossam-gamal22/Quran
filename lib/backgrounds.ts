// lib/backgrounds.ts
// سجل الخلفيات المركزي — روح المسلم

import { AppBackgroundKey } from '@/contexts/SettingsContext';

export interface AppBackground {
  id: AppBackgroundKey;
  source: any;
  name_ar: string;
  name_en: string;
  textColor: 'white' | 'black';
  dominantColor: string; // hex color for auto-contrast detection
}

export const APP_BACKGROUNDS: AppBackground[] = [
  { id: 'background1', source: require('@/assets/images/backgrounds/background1.png'), name_ar: 'أزرق داكن', name_en: 'Dark Blue', textColor: 'white', dominantColor: '#1a2744' },
  { id: 'background2', source: require('@/assets/images/backgrounds/background2.png'), name_ar: 'أخضر', name_en: 'Green', textColor: 'white', dominantColor: '#1a4d2e' },
  { id: 'background3', source: require('@/assets/images/backgrounds/background3.png'), name_ar: 'بنفسجي', name_en: 'Purple', textColor: 'white', dominantColor: '#2d1b4e' },
  { id: 'background4', source: require('@/assets/images/backgrounds/background4.png'), name_ar: 'ذهبي', name_en: 'Gold', textColor: 'white', dominantColor: '#4a3520' },
  { id: 'background5', source: require('@/assets/images/backgrounds/background5.png'), name_ar: 'فيروزي', name_en: 'Teal', textColor: 'white', dominantColor: '#0d3d38' },
  { id: 'background6', source: require('@/assets/images/backgrounds/background6.png'), name_ar: 'وردي', name_en: 'Pink', textColor: 'white', dominantColor: '#4a1a2e' },
  { id: 'background7', source: require('@/assets/images/backgrounds/background7.png'), name_ar: 'رمادي', name_en: 'Gray', textColor: 'white', dominantColor: '#2a2a2a' },
];

export const DEFAULT_BACKGROUND_OPACITY = 1;

export const BACKGROUND_SOURCE_MAP: Record<string, any> = {
  background1: require('@/assets/images/backgrounds/background1.png'),
  background2: require('@/assets/images/backgrounds/background2.png'),
  background3: require('@/assets/images/backgrounds/background3.png'),
  background4: require('@/assets/images/backgrounds/background4.png'),
  background5: require('@/assets/images/backgrounds/background5.png'),
  background6: require('@/assets/images/backgrounds/background6.png'),
  background7: require('@/assets/images/backgrounds/background7.png'),
};
