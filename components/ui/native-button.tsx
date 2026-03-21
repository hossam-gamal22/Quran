// components/ui/native-button.tsx
// نظام الأزرار الأصلية (Native) التي تطابق تماماً شكل النظام
// Native Button System - Matches iOS/Android System Buttons Exactly

import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
  Pressable,
  Platform,
} from 'react-native';
import { fontSemiBold } from '@/lib/fonts';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { Spacing } from '@/constants/theme';

// ========================================
// Native Button Props
// ========================================

interface NativeButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  label?: string;
  icon?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  isDarkMode?: boolean;
  haptic?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  customColor?: string; // لون مخصص للزر
  variant?: 'default' | 'filled'; // تخطيط الزر
}

// ========================================
// System Colors - Match iOS/Android exactly
// ========================================

const SYSTEM_COLORS = {
  // Light Mode
  light: {
    // Primary/Default Button
    primary: '#fff',
    primaryBorder: 'rgba(0, 0, 0, 0.15)',
    primaryText: '#0A0A0B',
    
    // Secondary Button (Filled variant)
    secondary: 'rgba(0, 0, 0, 0.05)',
    secondaryText: '#000',
    
    // Tinted Button (System Color)
    tinted: '#007AFF', // iOS System Blue
    tintedText: '#fff',
    
    // Background
    background: '#F5F5F7',
    surfaceBackground: '#fff',
    
    // Text
    label: '#000',
    secondaryLabel: '#666',
    tertiaryLabel: '#999',
  },
  
  // Dark Mode
  dark: {
    // Primary/Default Button
    primary: '#1C1C1E',
    primaryBorder: 'rgba(255, 255, 255, 0.2)',
    primaryText: '#fff',
    
    // Secondary Button (Filled variant)
    secondary: 'rgba(255, 255, 255, 0.1)',
    secondaryText: '#fff',
    
    // Tinted Button (System Color)
    tinted: '#0A84FF', // iOS System Blue (Dark)
    tintedText: '#fff',
    
    // Background
    background: '#000000',
    surfaceBackground: '#1C1C1E',
    
    // Text
    label: '#fff',
    secondaryLabel: '#999',
    tertiaryLabel: '#666',
  },
};

// ========================================
// Native Button - System Default Style
// ========================================

export const NativeButton: React.FC<NativeButtonProps> = ({
  label,
  icon,
  style,
  textStyle,
  isDarkMode = false,
  haptic = true,
  onPress,
  disabled = false,
  customColor,
  variant = 'default',
  children,
  ...props
}) => {
  const colors = isDarkMode ? SYSTEM_COLORS.dark : SYSTEM_COLORS.light;
  const isRTL = useIsRTL();
  
  // إذا كان هناك لون مخصص، استخدمه
  const backgroundColor = customColor || colors.primary;
  const isColoredButton = !!customColor;
  const textColor = isColoredButton ? '#fff' : colors.primaryText;

  const handlePress = () => {
    if (disabled) return;
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.();
  };

  const buttonStyle = variant === 'filled' && customColor
    ? [
        styles.buttonFilled,
        {
          backgroundColor: customColor,
          opacity: disabled ? 0.6 : 1,
        },
        style,
      ]
    : [
        styles.buttonBase,
        {
          backgroundColor: isColoredButton ? customColor : colors.primary,
          borderColor: isColoredButton ? customColor : colors.primaryBorder,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ];

  return (
    <TouchableOpacity
      {...props}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.65}
      style={[buttonStyle, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
    >
      {icon && (
        <MaterialCommunityIcons
          name={icon as any}
          size={20}
          color={textColor}
        />
      )}
      {label && (
        <Text
          style={[
            styles.text,
            {
              color: textColor,
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
};

// ========================================
// Native Tinted Button - System Color
// ========================================

export const NativeTintedButton: React.FC<NativeButtonProps> = ({
  label,
  icon,
  style,
  textStyle,
  isDarkMode = false,
  haptic = true,
  onPress,
  disabled = false,
  children,
  ...props
}) => {
  const colors = isDarkMode ? SYSTEM_COLORS.dark : SYSTEM_COLORS.light;
  const isRTL = useIsRTL();

  const handlePress = () => {
    if (disabled) return;
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.();
  };

  return (
    <TouchableOpacity
      {...props}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[
        styles.buttonBase,
        {
          backgroundColor: colors.tinted,
          opacity: disabled ? 0.5 : 1,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
        style,
      ]}
    >
      {icon && (
        <MaterialCommunityIcons
          name={icon as any}
          size={18}
          color={colors.tintedText}
        />
      )}
      {label && (
        <Text
          style={[
            styles.text,
            {
              color: colors.tintedText,
              fontWeight: '600',
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
};

// ========================================
// Native Filled Button - Subtle Background
// ========================================

export const NativeFilledButton: React.FC<NativeButtonProps> = ({
  label,
  icon,
  style,
  textStyle,
  isDarkMode = false,
  haptic = true,
  onPress,
  disabled = false,
  children,
  ...props
}) => {
  const colors = isDarkMode ? SYSTEM_COLORS.dark : SYSTEM_COLORS.light;
  const isRTL = useIsRTL();

  const handlePress = () => {
    if (disabled) return;
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.();
  };

  return (
    <TouchableOpacity
      {...props}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.6}
      style={[
        styles.buttonBase,
        {
          backgroundColor: colors.secondary,
          opacity: disabled ? 0.5 : 1,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
        style,
      ]}
    >
      {icon && (
        <MaterialCommunityIcons
          name={icon as any}
          size={18}
          color={colors.secondaryText}
        />
      )}
      {label && (
        <Text
          style={[
            styles.text,
            {
              color: colors.secondaryText,
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
};

// ========================================
// Native Text Button - Minimal Style
// ========================================

export const NativeTextButton: React.FC<NativeButtonProps> = ({
  label,
  icon,
  style,
  textStyle,
  isDarkMode = false,
  haptic = true,
  onPress,
  disabled = false,
  children,
  ...props
}) => {
  const colors = isDarkMode ? SYSTEM_COLORS.dark : SYSTEM_COLORS.light;
  const isRTL = useIsRTL();

  const handlePress = () => {
    if (disabled) return;
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.();
  };

  return (
    <TouchableOpacity
      {...props}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[
        styles.textButtonBase,
        style,
        {
          opacity: disabled ? 0.5 : 1,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
      ]}
    >
      {icon && (
        <MaterialCommunityIcons
          name={icon as any}
          size={18}
          color={colors.tinted}
        />
      )}
      {label && (
        <Text
          style={[
            styles.textButtonText,
            {
              color: colors.tinted,
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
};

// ========================================
// Native Toggle Switch
// ========================================

interface NativeToggleSwitchProps {
  enabled: boolean;
  onToggle: (value: boolean) => void;
  isDarkMode?: boolean;
  disabled?: boolean;
}

export const NativeToggleSwitch: React.FC<NativeToggleSwitchProps> = ({
  enabled,
  onToggle,
  isDarkMode = false,
  disabled = false,
}) => {
  const colors = isDarkMode ? SYSTEM_COLORS.dark : SYSTEM_COLORS.light;

  const handlePress = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle(!enabled);
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={[
        styles.toggleBase,
        {
          backgroundColor: enabled
            ? 'rgba(6,79,47,0.55)'
            : (isDarkMode ? 'rgba(255,255,255,0.25)' : 'rgba(120,120,128,0.18)'),
          borderWidth: 1,
          borderColor: enabled
            ? 'rgba(6,79,47,0.5)'
            : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(120,120,128,0.15)'),
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.toggleThumb,
          {
            backgroundColor: enabled
              ? '#fff'
              : (isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.9)'),
            transform: [{ translateX: enabled ? 22 : 2 }],
          },
        ]}
      />
    </Pressable>
  );
};

// ========================================
// Styles
// ========================================

const styles = StyleSheet.create({
  buttonBase: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44, // iOS recommended minimum touch target
    borderRadius: 8,
    borderWidth: 1,
  },
  buttonFilled: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  text: {
    fontSize: 16,
    fontFamily: fontSemiBold(),
    fontWeight: '500',
  },
  iconWithLabel: {
    // margin handled inline for RTL
  },
  textButtonBase: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  textButtonText: {
    fontSize: 16,
    fontFamily: fontSemiBold(),
    fontWeight: '600',
  },
  toggleBase: {
    width: 51,
    height: 31,
    borderRadius: 15.5,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleThumb: {
    width: 27,
    height: 27,
    borderRadius: 13.5,
  },
});

export default NativeButton;
