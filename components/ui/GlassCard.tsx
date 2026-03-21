// components/ui/GlassCard.tsx
// Apple iOS Glass Morphism Card System
// Inspired by iOS Control Center, Widgets, and Dynamic Island

import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, Platform, TouchableOpacity, Text, Switch, LayoutChangeEvent, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BorderRadius, Shadows, Spacing } from '@/constants/theme';
import { useSettings } from '@/contexts/SettingsContext';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming, interpolateColor, type SharedValue } from 'react-native-reanimated';

import { useIsRTL } from '@/hooks/use-is-rtl';
import { fontBold, fontMedium, fontRegular, fontSemiBold } from '@/lib/fonts';
const PRESS_SPRING = { damping: 18, stiffness: 240, mass: 0.7 };

// ========================================
// Glass Card - Apple iOS style container
// ========================================

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  borderRadius?: number;
  noBorder?: boolean;
  noShadow?: boolean;
}

export function GlassCard({
  children,
  style,
  intensity = 60,
  borderRadius = BorderRadius.xl,
  noBorder = false,
  noShadow = false,
}: GlassCardProps) {
  const { isDarkMode } = useSettings();
  const isRTL = useIsRTL();

  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: isDarkMode
              ? 'rgba(30, 30, 32, 0.8)'
              : 'rgba(255, 255, 255, 0.78)',
            borderRadius,
            borderWidth: noBorder ? 0 : 0.5,
            borderColor: isDarkMode
              ? 'rgba(255,255,255,0.12)'
              : 'rgba(0,0,0,0.06)',
            // @ts-ignore — web-only CSS props
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
          } as any,
          !noShadow && (isDarkMode ? styles.shadowDark : styles.shadowLight),
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { borderRadius, overflow: 'hidden' },
        !noShadow && (isDarkMode ? styles.shadowDark : styles.shadowLight),
        style,
      ]}
    >
      <BlurView
        intensity={intensity}
        tint={(isDarkMode ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight') as any}
        style={[StyleSheet.absoluteFill, { borderRadius }]}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isDarkMode
              ? 'rgba(30, 30, 32, 0.55)'
              : 'rgba(255, 255, 255, 0.4)',
            borderRadius,
            borderWidth: noBorder ? 0 : 0.5,
            borderColor: isDarkMode
              ? 'rgba(255,255,255,0.12)'
              : 'rgba(0,0,0,0.06)',
          },
        ]}
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

// ========================================
// Glass Button - Apple iOS style pressable
// ========================================

interface GlassButtonProps {
  label: string;
  icon?: string;
  onPress?: () => void;
  variant?: 'default' | 'primary' | 'destructive';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
}

export function GlassButton({
  label,
  icon,
  onPress,
  variant = 'default',
  size = 'medium',
  disabled = false,
  style,
  fullWidth = false,
}: GlassButtonProps) {
  const { isDarkMode } = useSettings();
  const isRTL = useIsRTL();
  const pressScale = useSharedValue(1);

  const sizeMap = {
    small: { paddingV: 8, paddingH: 14, fontSize: 14, iconSize: 18 },
    medium: { paddingV: 12, paddingH: 20, fontSize: 16, iconSize: 20 },
    large: { paddingV: 16, paddingH: 24, fontSize: 18, iconSize: 24 },
  };
  const s = sizeMap[size];

  const variantColors = {
    default: {
      bg: isDarkMode ? 'rgba(120, 120, 128, 0.24)' : 'rgba(120, 120, 128, 0.12)',
      text: isDarkMode ? '#fff' : '#000',
    },
    primary: {
      bg: isDarkMode ? 'rgba(6, 79, 47, 0.85)' : '#22C55E',
      text: '#fff',
    },
    destructive: {
      bg: isDarkMode ? 'rgba(255, 59, 48, 0.24)' : 'rgba(255, 59, 48, 0.12)',
      text: '#FF3B30',
    },
  };
  const v = variantColors[variant];

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const handlePressIn = () => {
    pressScale.value = withTiming(0.965, {
      duration: 110,
      easing: Easing.out(Easing.quad),
    });
  };

  const handlePressOut = () => {
    pressScale.value = withSpring(1, PRESS_SPRING);
  };

  return (
    <Animated.View style={pressStyle}>
      <TouchableOpacity
        activeOpacity={1}
        disabled={disabled}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress?.();
        }}
        style={[
          {
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: Spacing.sm,
            backgroundColor: v.bg,
            paddingVertical: s.paddingV,
            paddingHorizontal: s.paddingH,
            borderRadius: size === 'large' ? 16 : size === 'medium' ? 12 : 10,
            opacity: disabled ? 0.4 : 1,
            minHeight: 44,
          },
          fullWidth && { width: '100%' as any },
          style,
        ]}
      >
        {icon && (
          <MaterialCommunityIcons
            name={icon as any}
            size={s.iconSize}
            color={v.text}
          />
        )}
        <Text
          style={{
            fontSize: s.fontSize,
            fontFamily: fontSemiBold(),
            color: v.text,
            textAlign: 'center',
          }}
        >
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ========================================
// Glass Toggle - Apple iOS style switch
// ========================================

interface GlassToggleProps {
  enabled: boolean;
  onToggle: (value: boolean) => void;
  label?: string;
  icon?: string;
  iconColor?: string;
  subtitle?: string;
  disabled?: boolean;
}

export function GlassToggle({
  enabled,
  onToggle,
  label,
  icon,
  iconColor = '#22C55E',
  subtitle,
  disabled = false,
}: GlassToggleProps) {
  const { isDarkMode } = useSettings();
  const isRTL = useIsRTL();

  const toggleContent = (
    <View style={[styles.toggleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }, { padding: 14, position: 'relative', zIndex: 1 }]}>
      {icon && (
        <View style={styles.toggleIcon}>
          <MaterialCommunityIcons name={icon as any} size={20} color={iconColor} />
        </View>
      )}
      <View style={styles.toggleContent}>
        {label && (
          <Text
            style={[
              styles.toggleLabel,
              { color: isDarkMode ? '#fff' : '#000', textAlign: isRTL ? 'right' : 'left' },
            ]}
          >
            {label}
          </Text>
        )}
        {subtitle && (
          <Text
            style={[
              styles.toggleSubtitle,
              { color: isDarkMode ? '#A8A8AD' : '#6c6c70', textAlign: isRTL ? 'right' : 'left' },
            ]}
          >
            {subtitle}
          </Text>
        )}
      </View>
      <Switch
        value={enabled}
        onValueChange={(val) => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onToggle(val);
        }}
        disabled={disabled}
        trackColor={{
          false: isDarkMode ? '#39393D' : '#E9E9EB',
          true: '#22C55E',
        }}
        thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
        ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
      />
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <View
        style={[{
          borderRadius: 14,
          overflow: 'hidden',
          marginBottom: 8,
          backgroundColor: isDarkMode
            ? 'rgba(30, 30, 32, 0.55)'
            : 'rgba(255, 255, 255, 0.4)',
          borderWidth: 0.5,
          borderColor: isDarkMode
            ? 'rgba(255,255,255,0.12)'
            : 'rgba(0,0,0,0.06)',
          // @ts-ignore — web-only CSS props
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        } as any]}
      >
        {toggleContent}
      </View>
    );
  }

  return (
    <View style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 8 }}>
      <BlurView
        intensity={30}
        tint={(isDarkMode ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight') as any}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isDarkMode
              ? 'rgba(30, 30, 32, 0.45)'
              : 'rgba(255, 255, 255, 0.35)',
            borderWidth: 0.5,
            borderColor: isDarkMode
              ? 'rgba(255,255,255,0.1)'
              : 'rgba(0,0,0,0.05)',
            borderRadius: 14,
          },
        ]}
      />
      {toggleContent}
    </View>
  );
}

// ========================================
// Glass List Item - Apple Settings style row
// ========================================

interface GlassListItemProps {
  icon?: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  value?: string;
  showArrow?: boolean;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}

export function GlassListItem({
  icon,
  iconColor = '#22C55E',
  title,
  subtitle,
  value,
  showArrow = true,
  onPress,
  rightElement,
}: GlassListItemProps) {
  const { isDarkMode } = useSettings();
  const isRTL = useIsRTL();
  const pressScale = useSharedValue(1);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const itemContent = (
    <Animated.View style={pressStyle}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={() => {
          if (!onPress) return;
          pressScale.value = withTiming(0.985, { duration: 100, easing: Easing.out(Easing.quad) });
        }}
        onPressOut={() => {
          pressScale.value = withSpring(1, PRESS_SPRING);
        }}
        onPress={() => {
          if (onPress) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPress();
          }
        }}
        disabled={!onPress}
        style={[styles.listItem, { flexDirection: isRTL ? 'row-reverse' : 'row', position: 'relative', zIndex: 1 }]}
      >
        {icon && (
          <View style={styles.listItemIcon}> 
            <MaterialCommunityIcons name={icon as any} size={20} color={iconColor} />
          </View>
        )}
        <View style={styles.listItemContent}>
          <Text style={[styles.listItemTitle, { color: isDarkMode ? '#fff' : '#000', textAlign: isRTL ? 'right' : 'left' }]}> 
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.listItemSubtitle, { color: isDarkMode ? '#A8A8AD' : '#6c6c70', textAlign: isRTL ? 'right' : 'left' }]}> 
              {subtitle}
            </Text>
          )}
        </View>
        {value && (
          <Text style={[styles.listItemValue, { color: isDarkMode ? '#A8A8AD' : '#A8A8AD' }]}> 
            {value}
          </Text>
        )}
        {rightElement}
        {showArrow && onPress && (
          <MaterialCommunityIcons
            name={isRTL ? 'chevron-left' : 'chevron-right'}
            size={22}
            color={isDarkMode ? '#48484a' : '#c7c7cc'}
          />
        )}
      </TouchableOpacity>
    </Animated.View>
  );

  if (Platform.OS === 'web') {
    return (
      <View
        style={[{
          borderRadius: 14,
          overflow: 'hidden',
          marginBottom: 4,
          backgroundColor: isDarkMode
            ? 'rgba(30, 30, 32, 0.55)'
            : 'rgba(255, 255, 255, 0.4)',
          borderWidth: 0.5,
          borderColor: isDarkMode
            ? 'rgba(255,255,255,0.12)'
            : 'rgba(0,0,0,0.06)',
          // @ts-ignore — web-only CSS props
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        } as any]}
      >
        {itemContent}
      </View>
    );
  }

  return (
    <View style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 4 }}>
      <BlurView
        intensity={30}
        tint={(isDarkMode ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight') as any}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isDarkMode
              ? 'rgba(30, 30, 32, 0.45)'
              : 'rgba(255, 255, 255, 0.35)',
            borderWidth: 0.5,
            borderColor: isDarkMode
              ? 'rgba(255,255,255,0.1)'
              : 'rgba(0,0,0,0.05)',
            borderRadius: 14,
          },
        ]}
      />
      {itemContent}
    </View>
  );
}

// ========================================
// Glass Section - Apple Settings style group
// ========================================

interface GlassSectionProps {
  title?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function GlassSection({ title, children, style }: GlassSectionProps) {
  const { isDarkMode } = useSettings();
  const isRTL = useIsRTL();

  return (
    <View style={[styles.section, style]}>
      {title && (
        <Text style={[styles.sectionTitle, { color: isDarkMode ? '#A8A8AD' : '#6c6c70', textAlign: isRTL ? 'right' : 'left' }]}>
          {title}
        </Text>
      )}
      <View
        style={[
          styles.sectionContent,
          {
            borderColor: isDarkMode
              ? 'rgba(255,255,255,0.1)'
              : 'rgba(0,0,0,0.06)',
          },
        ]}
      >
        {Platform.OS !== 'web' ? (
          <BlurView
            intensity={40}
            tint={isDarkMode ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: isDarkMode
                ? 'rgba(30, 30, 32, 0.55)'
                : 'rgba(255, 255, 255, 0.4)',
              borderRadius: 16,
            },
          ]}
        />
        <View style={{ position: 'relative', zIndex: 1 }}>
          {children}
        </View>
      </View>
    </View>
  );
}

// ========================================
// Glass Segmented Control - Apple iOS style
// ========================================

interface GlassSegmentProps {
  segments: { key: string; label: string; icon?: string }[];
  selected: string;
  onSelect: (key: string) => void;
}

const AnimatedSegmentText = Animated.createAnimatedComponent(Text);

// Individual segment with animated color crossfade
const SegmentItem: React.FC<{
  seg: { key: string; label: string; icon?: string };
  activeProgress: SharedValue<number>;
  isDarkMode: boolean;
  onPress: () => void;
  onLayoutCb: (x: number, width: number) => void;
}> = React.memo(({ seg, activeProgress, isDarkMode, onPress, onLayoutCb }) => {  const isRTL = useIsRTL();  const activeColor = isDarkMode ? '#fff' : '#000';
  const inactiveColor = isDarkMode ? '#A8A8AD' : '#6c6c70';

  const animatedLabelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(activeProgress.value, [0, 1], [inactiveColor, activeColor]),
    fontFamily: activeProgress.value > 0.5 ? fontBold() : fontMedium(),
  }));

  // Bridge icon color to JS for MaterialCommunityIcons
  const [iconColor, setIconColor] = React.useState(inactiveColor);
  if (seg.icon) {
    React.useEffect(() => {
      // Initial sync
      setIconColor(activeProgress.value > 0.5 ? activeColor : inactiveColor);
    }, [isDarkMode]);
  }

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={() => Haptics.selectionAsync()}
      onPress={onPress}
      onLayout={(e) => {
        const { x, width } = e.nativeEvent.layout;
        onLayoutCb(x, width);
      }}
      style={[styles.segment, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
    >
      {seg.icon && (
        <View style={styles.segmentIconWrap}>
          <SegmentIcon
            icon={seg.icon}
            activeProgress={activeProgress}
            activeColor={activeColor}
            inactiveColor={inactiveColor}
          />
        </View>
      )}
      <AnimatedSegmentText style={[styles.segmentLabel, animatedLabelStyle]}>
        {seg.label}
      </AnimatedSegmentText>
    </TouchableOpacity>
  );
});

// Bridge animated icon color to MaterialCommunityIcons
const SegmentIcon: React.FC<{
  icon: string;
  activeProgress: SharedValue<number>;
  activeColor: string;
  inactiveColor: string;
}> = React.memo(({ icon, activeProgress, activeColor, inactiveColor }) => {
  if (icon.startsWith('img:')) {
    const uri = icon.slice(4).trim();
    if (!uri) return null;
    return <Image source={{ uri }} style={styles.segmentImageIcon} resizeMode="contain" />;
  }

  const isIonicon = icon.startsWith('ion:');
  const iconName = (isIonicon ? icon.slice(4) : icon).trim();

  const [color, setColor] = React.useState(inactiveColor);

  React.useEffect(() => {
    // Re-derive on theme change
    setColor(activeProgress.value > 0.5 ? activeColor : inactiveColor);
  }, [activeColor, inactiveColor]);

  // Listen to animated value changes
  useAnimatedStyle(() => {
    const c = interpolateColor(activeProgress.value, [0, 1], [inactiveColor, activeColor]);
    // @ts-ignore - runOnJS workaround for bridging worklet to JS
    if (typeof _WORKLET !== 'undefined') {
      // We're on the UI thread, need to use a different approach
    }
    return {};
  });

  // Simple approach: use derived value with polling
  const derivedColor = React.useRef(inactiveColor);
  React.useEffect(() => {
    const interval = setInterval(() => {
      const newColor = activeProgress.value > 0.5 ? activeColor : inactiveColor;
      if (newColor !== derivedColor.current) {
        derivedColor.current = newColor;
        setColor(newColor);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [activeProgress, activeColor, inactiveColor]);

  return (
    isIonicon ? (
      <Ionicons name={iconName as any} size={16} color={color} />
    ) : (
      <MaterialCommunityIcons name={iconName as any} size={16} color={color} />
    )
  );
});

export function GlassSegmentedControl({ segments, selected, onSelect }: GlassSegmentProps) {
  const { isDarkMode } = useSettings();

  const indicatorX = useSharedValue(0);
  const indicatorW = useSharedValue(0);
  const [layoutsReady, setLayoutsReady] = React.useState(false);
  const segmentLayouts = React.useRef<{ x: number; width: number }[]>([]);
  const measuredCount = React.useRef(0);

  // Create shared values for each segment's active progress
  // Support up to 6 segments
  const p0 = useSharedValue(0);
  const p1 = useSharedValue(0);
  const p2 = useSharedValue(0);
  const p3 = useSharedValue(0);
  const p4 = useSharedValue(0);
  const p5 = useSharedValue(0);
  const progressRefs = React.useMemo(() => [p0, p1, p2, p3, p4, p5], []);

  const handleSegmentLayout = React.useCallback(
    (index: number, x: number, width: number) => {
      segmentLayouts.current[index] = { x, width };
      measuredCount.current++;
      if (measuredCount.current >= segments.length && !layoutsReady) {
        setLayoutsReady(true);
      }
    },
    [segments.length, layoutsReady]
  );

  // Animate indicator + crossfade on selection change
  React.useEffect(() => {
    const selectedIndex = segments.findIndex((seg) => seg.key === selected);
    if (selectedIndex < 0 || !layoutsReady) return;

    const layout = segmentLayouts.current[selectedIndex];
    if (!layout) return;

    indicatorX.value = withSpring(layout.x, { damping: 15, stiffness: 120, mass: 0.8 });
    indicatorW.value = withSpring(layout.width, { damping: 15, stiffness: 120, mass: 0.8 });

    // Crossfade segment colors
    for (let i = 0; i < segments.length; i++) {
      progressRefs[i].value = withTiming(i === selectedIndex ? 1 : 0, { duration: 200 });
    }
  }, [indicatorX, indicatorW, segments, selected, layoutsReady, progressRefs]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorW.value,
  }));

  return (
    <View
      style={[
        styles.segmentContainer,
        {
          backgroundColor: isDarkMode
            ? 'rgba(120, 120, 128, 0.2)'
            : 'rgba(120, 120, 128, 0.1)',
        },
      ]}
    >
      {layoutsReady && (
        <Animated.View
          pointerEvents="none"
          style={[styles.segmentIndicator, indicatorStyle]}
        >
          <View style={styles.segmentPillOuter}>
            {Platform.OS !== 'web' ? (
              <BlurView
                intensity={Platform.OS === 'ios' ? 40 : 25}
                tint="light"
                style={styles.segmentPillBlur}
              >
                <View
                  style={[
                    styles.segmentPillInner,
                    {
                      backgroundColor: isDarkMode
                        ? 'rgba(255,255,255,0.12)'
                        : 'rgba(255,255,255,0.85)',
                    },
                  ]}
                />
              </BlurView>
            ) : (
              <View
                style={[
                  styles.segmentPillInner,
                  {
                    flex: 1,
                    backgroundColor: isDarkMode
                      ? 'rgba(255,255,255,0.15)'
                      : '#fff',
                  },
                ]}
              />
            )}
          </View>
        </Animated.View>
      )}
      {segments.map((seg, index) => (
        <SegmentItem
          key={seg.key}
          seg={seg}
          activeProgress={progressRefs[index]}
          isDarkMode={isDarkMode}
          onPress={() => onSelect(seg.key)}
          onLayoutCb={(x, width) => handleSegmentLayout(index, x, width)}
        />
      ))}
    </View>
  );
}

// ========================================
// الأنماط
// ========================================

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
  content: { position: 'relative', zIndex: 1 },
  
  shadowLight: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  shadowDark: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  toggleIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleContent: { flex: 1 },
  toggleLabel: {
    fontSize: 16,
    fontFamily: fontSemiBold(),
  },
  toggleSubtitle: {
    fontSize: 12,
    fontFamily: fontRegular(),
    marginTop: 2,
  },

  // List Item
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    minHeight: 52,
    gap: Spacing.md,
  },
  listItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItemContent: { flex: 1 },
  listItemTitle: {
    fontSize: 16,
    fontFamily: fontSemiBold(),
  },
  listItemSubtitle: {
    fontSize: 12,
    fontFamily: fontRegular(),
    marginTop: 2,
  },
  listItemValue: {
    fontSize: 15,
    fontFamily: fontRegular(),
  },

  // Section
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 13,
    fontFamily: fontBold(),
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionContent: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 0.5,
    gap: 1,
  },

  // Segmented Control
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    position: 'relative',
  },
  segmentIndicator: {
    position: 'absolute',
    left: 0,
    top: 3,
    bottom: 3,
    paddingHorizontal: 2,
  },
  segmentPillOuter: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  segmentPillBlur: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  segmentPillInner: {
    flex: 1,
    borderRadius: 8,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: Spacing.sm,
    zIndex: 2,
  },
  segmentIconWrap: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentImageIcon: {
    width: 16,
    height: 16,
  },
  segmentLabel: {
    fontSize: 14,
  },
});

export default GlassCard;
