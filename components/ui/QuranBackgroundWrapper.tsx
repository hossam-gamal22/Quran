// components/ui/QuranBackgroundWrapper.tsx
// غلاف خصص لصفحات القرآن — ألوان Skoon الصلبة أو صور خلفية

import React from 'react';
import { View, ViewProps } from 'react-native';
import { QURAN_THEMES, isThemeLight } from '@/constants/quran-themes';

// ========================================
// دوال ألوان الثيم (Skoon-style)
// ========================================

export const getQuranTextColor = (_bgKey: string, themeIndex = 0): string => {
  return QURAN_THEMES[themeIndex]?.primary ?? '#000000';
};

export const getQuranSecondaryColor = (themeIndex = 0): string => {
  return QURAN_THEMES[themeIndex]?.secondary ?? '#946735';
};

export const getQuranTranslationColor = (_bgKey: string, themeIndex = 0): string => {
  // الترجمة بلون أفتح قليلاً من الثانوي
  return QURAN_THEMES[themeIndex]?.secondary ?? '#404040';
};

export const getQuranBackgroundColor = (themeIndex = 0): string => {
  return QURAN_THEMES[themeIndex]?.background ?? '#FFF8F0';
};

export const getQuranHighlightColor = (themeIndex = 0): string => {
  return QURAN_THEMES[themeIndex]?.highlight ?? '#FFC936';
};

// ========================================
// واجهة الخصائص
// ========================================

interface QuranBackgroundWrapperProps extends ViewProps {
  backgroundKey?: string;
  themeIndex?: number;
  children: React.ReactNode;
}

// ========================================
// المكون — خلفية صلبة (Skoon-style)
// ========================================

export const QuranBackgroundWrapper: React.FC<QuranBackgroundWrapperProps> = ({
  themeIndex = 0,
  children,
  style,
  ...props
}) => {
  const bgColor = getQuranBackgroundColor(themeIndex);

  return (
    <View style={[{ backgroundColor: bgColor }, style]} {...props}>
      {children}
    </View>
  );
};

export default QuranBackgroundWrapper;
