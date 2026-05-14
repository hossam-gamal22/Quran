import React from 'react';
import { Image, Text, type ImageStyle, type StyleProp, type TextStyle } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { safeIcon } from '@/lib/safe-icon';

const EMOJI_ICON_REGEX = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

const ICON_ALIASES: Record<string, string> = {
  'hands-pray': '🤲',
  'salawat-symbol': 'text:ﷺ',
};

export function resolveAppIconName(name?: string | null): string {
  const trimmed = name?.trim();
  if (!trimmed) return '';
  return ICON_ALIASES[trimmed] || trimmed;
}

export function isEmojiIcon(name?: string | null): boolean {
  const resolved = resolveAppIconName(name);
  return !!resolved && EMOJI_ICON_REGEX.test(resolved);
}

interface AppIconProps {
  name?: string | null;
  size?: number;
  color?: string;
  fallback?: string;
  style?: StyleProp<TextStyle>;
  imageStyle?: StyleProp<ImageStyle>;
}

export function AppIcon({
  name,
  size = 24,
  color = '#000',
  fallback = 'help-circle-outline',
  style,
  imageStyle,
}: AppIconProps) {
  const resolvedName = resolveAppIconName(name) || fallback;

  if (resolvedName.startsWith('img:')) {
    const uri = resolvedName.slice(4).trim();
    if (!uri) return null;
    return (
      <Image
        source={{ uri }}
        style={[{ width: size, height: size }, imageStyle]}
        resizeMode="contain"
      />
    );
  }

  if (resolvedName.startsWith('text:')) {
    const txt = resolvedName.slice(5);
    return (
      <Text
        allowFontScaling={false}
        numberOfLines={1}
        style={[
          {
            color,
            fontSize: size * 0.8,
            lineHeight: Math.ceil(size * 1.15),
            textAlign: 'center',
            includeFontPadding: false,
            fontWeight: '600',
          },
          style,
        ]}
      >
        {txt}
      </Text>
    );
  }

  if (isEmojiIcon(resolvedName)) {
    return (
      <Text
        allowFontScaling={false}
        numberOfLines={1}
        style={[
          {
            color,
            fontSize: size,
            lineHeight: Math.ceil(size * 1.15),
            textAlign: 'center',
            includeFontPadding: false,
          },
          style,
        ]}
      >
        {resolvedName}
      </Text>
    );
  }

  if (resolvedName.startsWith('ion:')) {
    return <Ionicons name={resolvedName.slice(4).trim() as any} size={size} color={color} />;
  }

  if (resolvedName.startsWith('mci:')) {
    return <MaterialCommunityIcons name={safeIcon(resolvedName.slice(4).trim(), fallback) as any} size={size} color={color} />;
  }

  return <MaterialCommunityIcons name={safeIcon(resolvedName, fallback) as any} size={size} color={color} />;
}

export default AppIcon;
