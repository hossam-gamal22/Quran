// lib/theme-colors.ts
// نظام الألوان الديناميكي حسب القسم/الموسم

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  gradient: [string, string];
  text: string;
  textSecondary: string;
  background: string;
  backgroundAlt: string;
}

// ألوان حسب قسم الأذكار
export const AZKAR_COLORS: Record<string, ThemeColors> = {
  morning: {
    primary: '#f5a623',
    secondary: '#ffc966',
    accent: '#ff9800',
    gradient: ['#f5a623', '#ff9800'] as [string, string],
    text: '#333',
    textSecondary: '#666',
    background: '#fff8e1',
    backgroundAlt: '#ffe082',
  },
  evening: {
    primary: '#5d4e8c',
    secondary: '#7e57c2',
    accent: '#9575cd',
    gradient: ['#5d4e8c', '#7e57c2'] as [string, string],
    text: '#fff',
    textSecondary: '#e0e0e0',
    background: '#f3e5f5',
    backgroundAlt: '#e1bee7',
  },
  sleep: {
    primary: '#3a7ca5',
    secondary: '#4fc3f7',
    accent: '#01579b',
    gradient: ['#3a7ca5', '#01579b'] as [string, string],
    text: '#fff',
    textSecondary: '#e0f2f1',
    background: '#e0f2f1',
    backgroundAlt: '#b3e5fc',
  },
  wake: {
    primary: '#c17f59',
    secondary: '#d7985c',
    accent: '#a1662f',
    gradient: ['#c17f59', '#a1662f'] as [string, string],
    text: '#fff',
    textSecondary: '#f5deb3',
    background: '#ffe8d6',
    backgroundAlt: '#ffd7b5',
  },
  prayer: {
    primary: '#22C55E',
    secondary: '#4ADE80',
    accent: '#16A34A',
    gradient: ['#22C55E', '#16A34A'] as [string, string],
    text: '#fff',
    textSecondary: '#c8e6c9',
    background: '#e8f5e9',
    backgroundAlt: '#c8e6c9',
  },
  misc: {
    primary: '#e91e63',
    secondary: '#f06292',
    accent: '#c2185b',
    gradient: ['#e91e63', '#c2185b'] as [string, string],
    text: '#fff',
    textSecondary: '#f8bbd0',
    background: '#fce4ec',
    backgroundAlt: '#f8bbd0',
  },
  default: {
    primary: '#22C55E',
    secondary: '#4ADE80',
    accent: '#16A34A',
    gradient: ['#22C55E', '#16A34A'] as [string, string],
    text: '#fff',
    textSecondary: '#c8e6c9',
    background: '#e8f5e9',
    backgroundAlt: '#c8e6c9',
  },
};

// ألوان حسب المواسم الإسلامية
export const SEASONAL_COLORS: Record<string, ThemeColors> = {
  ramadan: {
    primary: '#2ecc71',
    secondary: '#27ae60',
    accent: '#16a085',
    gradient: ['#2ecc71', '#16a085'] as [string, string],
    text: '#fff',
    textSecondary: '#d5f4e6',
    background: '#d5f4e6',
    backgroundAlt: '#a9dfbf',
  },
  hajj: {
    primary: '#9b59b6',
    secondary: '#8e44ad',
    accent: '#6c3483',
    gradient: ['#9b59b6', '#6c3483'] as [string, string],
    text: '#fff',
    textSecondary: '#d7bde2',
    background: '#ebdef0',
    backgroundAlt: '#d7bde2',
  },
  ashura: {
    primary: '#e74c3c',
    secondary: '#c0392b',
    accent: '#a93226',
    gradient: ['#e74c3c', '#a93226'] as [string, string],
    text: '#fff',
    textSecondary: '#f5b7b1',
    background: '#fadbd8',
    backgroundAlt: '#f5b7b1',
  },
  mawlid: {
    primary: '#3498db',
    secondary: '#2980b9',
    accent: '#1f618d',
    gradient: ['#3498db', '#1f618d'] as [string, string],
    text: '#fff',
    textSecondary: '#aed6f1',
    background: '#d6eaf8',
    backgroundAlt: '#aed6f1',
  },
};

// الحصول على الألوان حسب القسم
export function getAzkarColors(category?: string): ThemeColors {
  return AZKAR_COLORS[category as keyof typeof AZKAR_COLORS] || AZKAR_COLORS.default;
}

// الحصول على الألوان حسب الموسم
export function getSeasonalColors(season?: string): ThemeColors {
  return SEASONAL_COLORS[season as keyof typeof SEASONAL_COLORS] || AZKAR_COLORS.default;
}

// الحصول على لون حسب معرّف
export function getColorByCategory(categoryId: string): ThemeColors {
  const [category, season] = categoryId.split('/');
  
  if (SEASONAL_COLORS[season]) {
    return getSeasonalColors(season);
  }
  
  return getAzkarColors(category);
}
