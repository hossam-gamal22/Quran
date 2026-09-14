import React, { useState } from 'react';
import { LayoutAnimation, Platform, StyleSheet, Text, TouchableOpacity, UIManager, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { fontMedium, fontSemiBold } from '@/lib/fonts';
import { useColors } from '@/hooks/use-colors';
import { useIsRTL } from '@/hooks/use-is-rtl';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface DropdownOption<T extends string | number> {
  value: T;
  label: string;
  icon?: IconName;
}

interface DropdownProps<T extends string | number> {
  label: string;
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  /**
   * If provided, a play button appears next to each option. Tapping it calls
   * onPreview(value) so the parent can play the corresponding sound. Returns a
   * cleanup function that stops playback (called when the user picks an option
   * or closes the dropdown).
   */
  onPreview?: (value: T) => Promise<(() => void) | void> | (() => void) | void;
}

export function Dropdown<T extends string | number>({
  label,
  value,
  options,
  onChange,
  onPreview,
}: DropdownProps<T>) {
  const colors = useColors();
  const isRTL = useIsRTL();
  const [open, setOpen] = useState(false);
  const [previewing, setPreviewing] = useState<T | null>(null);
  const previewStopRef = React.useRef<(() => void) | null>(null);
  const isDarkMode = (colors as any).isDarkMode as boolean;

  const current = options.find((o) => o.value === value);

  const stopPreview = React.useCallback(() => {
    if (previewStopRef.current) {
      previewStopRef.current();
      previewStopRef.current = null;
    }
    setPreviewing(null);
  }, []);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => {
      if (o) stopPreview();
      return !o;
    });
    Haptics.selectionAsync().catch(() => {});
  };

  const onPick = (v: T) => {
    Haptics.selectionAsync().catch(() => {});
    stopPreview();
    onChange(v);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(false);
  };

  const onPreviewTap = async (v: T) => {
    if (!onPreview) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (previewing === v) {
      stopPreview();
      return;
    }
    stopPreview();
    setPreviewing(v);
    try {
      const stopper = await Promise.resolve(onPreview(v));
      if (typeof stopper === 'function') {
        previewStopRef.current = stopper;
      }
    } catch {
      setPreviewing(null);
    }
  };

  // Stop any preview when the component unmounts
  React.useEffect(() => () => stopPreview(), [stopPreview]);

  const panelBg = isDarkMode ? 'rgba(20,24,32,0.9)' : 'rgba(245,245,247,0.95)';
  const dividerColor = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  return (
    <View>
      <TouchableOpacity
        onPress={toggle}
        activeOpacity={0.7}
        style={[styles.trigger, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
      >
        <Text
          style={[
            styles.label,
            { color: colors.glassText, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
        <View style={[styles.valueWrap, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text
            style={[
              styles.valueText,
              { color: colors.primary, textAlign: isRTL ? 'right' : 'left' },
            ]}
            numberOfLines={1}
          >
            {current?.label ?? ''}
          </Text>
          <MaterialCommunityIcons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.glassTextLight}
          />
        </View>
      </TouchableOpacity>

      {open && (
        <View style={[styles.panel, { backgroundColor: panelBg }]}>
          {options.map((opt, idx) => {
            const isActive = opt.value === value;
            const isPreviewingThis = previewing === opt.value;
            return (
              <View
                key={String(opt.value)}
                style={[
                  styles.option,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  idx !== options.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: dividerColor },
                ]}
              >
                {opt.icon && (
                  <MaterialCommunityIcons
                    name={opt.icon}
                    size={18}
                    color={isActive ? colors.primary : colors.glassTextLight}
                  />
                )}
                <TouchableOpacity
                  onPress={() => onPick(opt.value)}
                  activeOpacity={0.7}
                  style={{ flex: 1 }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      {
                        color: isActive ? colors.primary : colors.glassText,
                        fontFamily: isActive ? fontSemiBold() : fontMedium(),
                        textAlign: isRTL ? 'right' : 'left',
                        writingDirection: isRTL ? 'rtl' : 'ltr',
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
                {isActive && (
                  <MaterialCommunityIcons name="check" size={18} color={colors.primary} />
                )}
                {onPreview && (
                  <TouchableOpacity
                    onPress={() => onPreviewTap(opt.value)}
                    activeOpacity={0.7}
                    style={[
                      styles.playBtn,
                      { backgroundColor: isPreviewingThis ? colors.primary : 'rgba(127,127,127,0.18)' },
                    ]}
                    accessibilityLabel="Preview sound"
                  >
                    <MaterialCommunityIcons
                      name={isPreviewingThis ? 'stop' : 'play'}
                      size={14}
                      color={isPreviewingThis ? '#FFFFFF' : colors.text}
                    />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontFamily: fontSemiBold(),
    includeFontPadding: false,
    flexShrink: 0,
  },
  // valueWrap fills the remaining horizontal space. The value text inside has
  // flex:1 so it takes all space minus the chevron — required on Android,
  // otherwise the text gets sized to 0 and disappears.
  valueWrap: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  valueText: {
    flex: 1,
    fontSize: 14,
    fontFamily: fontSemiBold(),
    includeFontPadding: false,
  },

  panel: {
    marginTop: 6,
    marginBottom: 4,
    borderRadius: 14,
    overflow: 'hidden',
  },
  option: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  optionText: { fontSize: 14 },
  playBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
