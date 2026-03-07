// components/ui/BackgroundWrapper.tsx
// غلاف لتطبيق صور الخلفية على الشاشات

import React from 'react';
import { View, ImageBackground, ViewProps, ImageSourcePropType } from 'react-native';
import { AppBackgroundKey } from '@/contexts/SettingsContext';

// ========================================
// خريطة صور الخلفية
// ========================================

const BACKGROUND_IMAGES: Record<Exclude<AppBackgroundKey, 'dynamic'>, any> = {
  none: null,
  background1: require('@/assets/images/background1.png'),
  background2: require('@/assets/images/background2.png'),
  background3: require('@/assets/images/background3.png'),
  background4: require('@/assets/images/background4.png'),
  background5: require('@/assets/images/background5.png'),
  background6: require('@/assets/images/background6.png'),
  background7: require('@/assets/images/background7.png'),
};

// ========================================
// واجهة الخصائص
// ========================================

interface BackgroundWrapperProps extends ViewProps {
  backgroundKey?: AppBackgroundKey;
  backgroundUrl?: string; // For dynamic/remote backgrounds
  children: React.ReactNode;
}

// ========================================
// المكون
// ========================================

const BackgroundWrapper: React.FC<BackgroundWrapperProps> = ({
  backgroundKey = 'none',
  backgroundUrl,
  children,
  style,
  ...props
}) => {
  // Determine background source
  let backgroundSource: ImageSourcePropType | null = null;

  if (backgroundKey === 'dynamic' && backgroundUrl) {
    // Dynamic/remote background URL
    backgroundSource = { uri: backgroundUrl };
  } else if (backgroundKey && backgroundKey !== 'none' && backgroundKey !== 'dynamic') {
    // Local static background
    backgroundSource = BACKGROUND_IMAGES[backgroundKey];
  }

  // إذا لا توجد خلفية، أرجع View عادي
  if (!backgroundSource) {
    return (
      <View style={style} {...props}>
        {children}
      </View>
    );
  }

  // إذا توجد خلفية، استخدم ImageBackground
  return (
    <ImageBackground
      source={backgroundSource}
      style={style}
      imageStyle={{ resizeMode: 'cover' }}
      {...props}
    >
      {children}
    </ImageBackground>
  );
};

export default BackgroundWrapper;
