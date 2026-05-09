// components/memorization/StatsTimeline.tsx
// عرض الإحصائيات على شكل تايملاين عمودي بنقاط متصلة بخط.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { useIsRTL } from '@/hooks/use-is-rtl';

export interface StatsTimelineItem {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
}

interface StatsTimelineProps {
  items: StatsTimelineItem[];
}

const DOT_SIZE = 36;
const LINE_WIDTH = 2;

export const StatsTimeline: React.FC<StatsTimelineProps> = ({ items }) => {
  const colors = useColors();
  const isRTL = useIsRTL();

  const dotColor = colors.primary;
  const lineColor = colors.isDark
    ? 'rgba(255,255,255,0.14)'
    : 'rgba(0,0,0,0.10)';

  return (
    <View style={styles.container}>
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <View
            key={`${item.label}-${idx}`}
            style={[
              styles.row,
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            {/* عمود التايملاين (نقطة + خط) */}
            <View style={styles.timelineCol}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: dotColor,
                    width: DOT_SIZE,
                    height: DOT_SIZE,
                    borderRadius: DOT_SIZE / 2,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={item.icon}
                  size={18}
                  color="#fff"
                />
              </View>
              {!isLast && (
                <View
                  style={[
                    styles.line,
                    { backgroundColor: lineColor, width: LINE_WIDTH },
                  ]}
                />
              )}
            </View>

            {/* المحتوى */}
            <View
              style={[
                styles.content,
                {
                  alignItems: isRTL ? 'flex-end' : 'flex-start',
                  paddingBottom: isLast ? 0 : 18,
                },
              ]}
            >
              <Text
                style={[
                  styles.value,
                  {
                    color: colors.text,
                    textAlign: isRTL ? 'right' : 'left',
                    writingDirection: isRTL ? 'rtl' : 'ltr',
                  },
                ]}
              >
                {item.value}
              </Text>
              <Text
                style={[
                  styles.label,
                  {
                    color: colors.textLight,
                    textAlign: isRTL ? 'right' : 'left',
                    writingDirection: isRTL ? 'rtl' : 'ltr',
                  },
                ]}
              >
                {item.label}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  row: {
    alignItems: 'stretch',
    gap: 12,
  },
  timelineCol: {
    width: DOT_SIZE,
    alignItems: 'center',
  },
  dot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    flex: 1,
    marginVertical: 2,
    borderRadius: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  value: {
    fontFamily: 'Cairo-Bold',
    fontSize: 18,
  },
  label: {
    fontFamily: 'Cairo-Regular',
    fontSize: 12,
    marginTop: 2,
  },
});

export default StatsTimeline;
