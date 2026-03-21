// components/ui/ios-button.tsx
// نظام الأزرار الموحد بنمط iOS مع تأثير الزجاج
// Unified iOS Button System with Glass Effect

import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { fontMedium } from '@/lib/fonts';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsRTL } from '@/hooks/use-is-rtl';
// ========================================
// أنماط وأنواع الأزرار
// ========================================

type ButtonSize = 'small' | 'medium' | 'large';
type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'glass';
type ButtonColor = 'green' | 'red' | 'blue' | 'gray' | 'custom';

interface IOSButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  label?: string;
  icon?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
  color?: ButtonColor;
  customColor?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  isDarkMode?: boolean;
  haptic?: boolean;
  showGlass?: boolean;
  glassIntensity?: number;
  onPress?: () => void;
}

interface IOSToggleProps extends Omit<TouchableOpacityProps, 'style'> {
  enabled: boolean;
  onToggle: (value: boolean) => void;
  icon?: { on: string; off: string };
  accentColor?: string;
  isDarkMode?: boolean;
  size?: 'small' | 'medium' | 'large';
}

// ========================================
// الثوابت والألوان
// ========================================

const COLOR_MAP = {
  green: '#22C55E',
  greenLight: '#4ade80',
  red: '#ef4444',
  blue: '#3b82f6',
  gray: '#999',
  grayLight: '#ccc',
  white: '#fff',
  textDark: '#333',
  textLight: '#fff',
};

const SIZE_MAP = {
  small: { width: 40, height: 40, borderRadius: 10, fontSize: 12 },
  medium: { width: 50, height: 50, borderRadius: 12, fontSize: 14 },
  large: { width: 60, height: 60, borderRadius: 15, fontSize: 16 },
};

const TOGGLE_SIZE_MAP = {
  small: { width: 44, height: 24, thumb: 20, margin: 2 },
  medium: { width: 48, height: 28, thumb: 24, margin: 2 },
  large: { width: 54, height: 32, thumb: 28, margin: 3 },
};

// ========================================
// iOS Standard Button
// ========================================

export const IOSButton: React.FC<IOSButtonProps> = ({
  label,
  icon,
  size = 'medium',
  variant = 'primary',
  color = 'green',
  customColor,
  style,
  textStyle,
  isDarkMode = false,
  haptic = true,
  showGlass = true,
  glassIntensity = 60,
  onPress,
  children,
  ...props
}) => {
  const sizeConfig = SIZE_MAP[size];
  const accentColor = customColor || getColorValue(color);
  const isRTL = useIsRTL();

  const handlePress = () => {
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.();
  };

  const getBackgroundColor = () => {
    switch (variant) {
      case 'primary':
        return accentColor;
      case 'secondary':
        return isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
      case 'tertiary':
        return `${accentColor}20`;
      case 'glass':
        return 'transparent';
      default:
        return accentColor;
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'primary':
      case 'glass':
        return COLOR_MAP.textLight;
      case 'secondary':
        return isDarkMode ? COLOR_MAP.textLight : COLOR_MAP.textDark;
      case 'tertiary':
        return accentColor;
      default:
        return COLOR_MAP.textLight;
    }
  };

  const buttonContent = (
    <TouchableOpacity
      {...props}
      onPress={handlePress}
      activeOpacity={0.7}
      style={[
        styles.buttonBase,
        {
          width: sizeConfig.width,
          height: sizeConfig.height,
          borderRadius: sizeConfig.borderRadius,
          backgroundColor: getBackgroundColor(),
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
        style,
      ]}
    >
      {icon && (
        <MaterialCommunityIcons
          name={icon as any}
          size={sizeConfig.fontSize + 6}
          color={getTextColor()}
        />
      )}
      {label && (
        <Text
          style={[
            styles.buttonText,
            {
              fontSize: sizeConfig.fontSize,
              color: getTextColor(),
            },
            textStyle,
          ]}
        >
          {label}
        </Text>
      )}
      {children}
    </TouchableOpacity>
  );

  if (variant === 'glass' && showGlass) {
    return (
      <BlurView intensity={glassIntensity} style={[styles.glassContainer, style]}>
        {buttonContent}
      </BlurView>
    );
  }

  return buttonContent;
};

// ========================================
// iOS Toggle Switch
// ========================================

export const IOSToggle: React.FC<IOSToggleProps> = ({
  enabled,
  onToggle,
  icon = { on: 'toggle-switch', off: 'toggle-switch-off' },
  accentColor = COLOR_MAP.green,
  isDarkMode = false,
  size = 'medium',
}) => {
  const toggleConfig = TOGGLE_SIZE_MAP[size];

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle(!enabled);
  };

  return (
    <BlurView intensity={60} style={[
      styles.toggleGlassContainer,
      {
        width: toggleConfig.width,
        height: toggleConfig.height,
        borderRadius: toggleConfig.width / 2,
      },
    ]}>
      <TouchableOpacity
        onPress={handlePress}
        style={[
          styles.toggleButton,
          {
            width: toggleConfig.width,
            height: toggleConfig.height,
            borderRadius: toggleConfig.width / 2,
            backgroundColor: enabled ? accentColor : '#ccc',
          },
        ]}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.toggleThumb,
            {
              width: toggleConfig.thumb,
              height: toggleConfig.thumb,
              borderRadius: toggleConfig.thumb / 2,
              marginLeft: enabled ? toggleConfig.width - toggleConfig.thumb - toggleConfig.margin : toggleConfig.margin,
            },
          ]}
        >
          <MaterialCommunityIcons
            name={enabled ? 'bell-ring' : 'bell-off'}
            size={toggleConfig.thumb - 6}
            color="#fff"
          />
        </View>
      </TouchableOpacity>
    </BlurView>
  );
};

// ========================================
// Glass Button Container
// ========================================

export const GlassButton: React.FC<{
  children: React.ReactNode;
  onPress?: () => void;
  intensity?: number;
  style?: ViewStyle;
  isDarkMode?: boolean;
}> = ({ children, onPress, intensity = 60, style, isDarkMode }) => {
  return (
    <BlurView intensity={intensity} style={[styles.glassContainer, style]}>
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress?.();
        }}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    </BlurView>
  );
};

// ========================================
// Helper Functions
// ========================================

function getColorValue(color: ButtonColor): string {
  const colorMap: Record<ButtonColor, string> = {
    green: COLOR_MAP.green,
    red: COLOR_MAP.red,
    blue: COLOR_MAP.blue,
    gray: COLOR_MAP.gray,
    custom: COLOR_MAP.green,
  };
  return colorMap[color];
}

export const IOSButtonColors = {
  getPrimary: (isDarkMode: boolean) => ({ bg: COLOR_MAP.green, text: '#fff' }),
  getSecondary: (isDarkMode: boolean) => ({
    bg: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    text: isDarkMode ? '#fff' : '#333',
  }),
  getTertiary: (accentColor: string) => ({ bg: `${accentColor}20`, text: accentColor }),
  getGlass: () => ({ bg: 'transparent', text: '#fff' }),
};

// ========================================
// Styles
// ========================================

const styles = StyleSheet.create({
  buttonBase: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  buttonText: {
    fontFamily: fontMedium(),
    fontWeight: '600',
  },
  glassContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  toggleGlassContainer: {
    overflow: 'hidden',
  },
  toggleButton: {
    justifyContent: 'flex-start',
    paddingHorizontal: 2,
  },
  toggleThumb: {
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default IOSButton;
